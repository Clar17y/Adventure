import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import {
  COMBAT_SKILLS,
  CRAFTING_CONSTANTS,
  CRAFTING_SKILLS,
  GATHERING_SKILLS,
  type CraftingMaterial,
  type ItemStats,
  type ItemType,
  type SkillType,
} from '@adventure/shared';
import { calculateCraftingCrit } from '@adventure/game-engine';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getEquipmentStats } from '../services/equipmentService';
import { spendPlayerTurns } from '../services/turnBankService';
import { consumeItemsByTemplate, getTotalQuantityByTemplate } from '../services/inventoryService';
import { grantSkillXp } from '../services/xpService';
import { getHpState } from '../services/hpService';

export const craftingRouter = Router();

craftingRouter.use(authenticate);

function isSkillType(value: string): value is SkillType {
  return (
    COMBAT_SKILLS.includes(value as SkillType) ||
    GATHERING_SKILLS.includes(value as SkillType) ||
    CRAFTING_SKILLS.includes(value as SkillType)
  );
}

function isItemType(value: string): value is ItemType {
  return value === 'weapon' || value === 'armor' || value === 'resource' || value === 'consumable';
}

async function getSkillLevel(playerId: string, skillType: SkillType): Promise<number> {
  const skill = await prisma.playerSkill.findUnique({
    where: { playerId_skillType: { playerId, skillType } },
    select: { level: true },
  });

  return skill?.level ?? 1;
}

function parseMaterials(value: unknown): CraftingMaterial[] {
  const materialSchema = z.object({
    templateId: z.string().uuid(),
    quantity: z.number().int().positive(),
  });

  const arraySchema = z.array(materialSchema);
  return arraySchema.parse(value);
}

/**
 * GET /api/v1/crafting/recipes
 * List recipes available to the player (based on skill level).
 */
craftingRouter.get('/recipes', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    const skills = await prisma.playerSkill.findMany({
      where: { playerId },
      select: { skillType: true, level: true },
    });

    const skillLevels = new Map<string, number>(skills.map((s: typeof skills[number]) => [s.skillType, s.level]));

    const recipes = await prisma.craftingRecipe.findMany({
      include: { resultTemplate: true },
      orderBy: [{ requiredLevel: 'asc' }],
    });

    const visible = recipes
      .filter((r: typeof recipes[number]) => (skillLevels.get(r.skillType) ?? 1) >= r.requiredLevel)
      .map((r: typeof recipes[number]) => ({
        id: r.id,
        skillType: r.skillType,
        requiredLevel: r.requiredLevel,
        resultTemplate: r.resultTemplate,
        turnCost: r.turnCost,
        materials: parseMaterials(r.materials),
        materialTemplates: [] as Array<{ id: string; name: string; itemType: string; stackable: boolean }>,
        xpReward: r.xpReward,
      }));

    // Attach material template metadata for UI convenience
    const allMaterialIds = new Set<string>();
    for (const r of visible) {
      for (const m of r.materials) allMaterialIds.add(m.templateId);
    }

    const templates = await prisma.itemTemplate.findMany({
      where: { id: { in: Array.from(allMaterialIds) } },
      select: { id: true, name: true, itemType: true, stackable: true },
    });
    const byId = new Map(templates.map((t: typeof templates[number]) => [t.id, t]));

    for (const r of visible) {
      r.materialTemplates = r.materials
        .map((m: CraftingMaterial) => byId.get(m.templateId))
        .filter(Boolean) as Array<{ id: string; name: string; itemType: string; stackable: boolean }>;
    }

    res.json({ recipes: visible });
  } catch (err) {
    next(err);
  }
});

const craftSchema = z.object({
  recipeId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

/**
 * POST /api/v1/crafting/craft
 * Validate materials, spend turns, craft item, and grant XP.
 */
craftingRouter.post('/craft', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = craftSchema.parse(req.body);

    // Check if player is recovering
    const hpState = await getHpState(playerId);
    if (hpState.isRecovering) {
      throw new AppError(400, 'Cannot craft while recovering', 'IS_RECOVERING');
    }

    const recipe = await prisma.craftingRecipe.findUnique({
      where: { id: body.recipeId },
      include: { resultTemplate: true },
    });
    if (!recipe) {
      throw new AppError(404, 'Recipe not found', 'NOT_FOUND');
    }

    if (!isSkillType(recipe.skillType)) {
      throw new AppError(400, 'Recipe has invalid skillType', 'INVALID_RECIPE');
    }

    const skillLevel = await getSkillLevel(playerId, recipe.skillType);
    if (skillLevel < recipe.requiredLevel) {
      throw new AppError(400, 'Insufficient crafting level', 'INSUFFICIENT_LEVEL');
    }

    const quantity = body.quantity;
    const materials = parseMaterials(recipe.materials);

    // Validate inventory has all materials
    for (const mat of materials) {
      const needed = mat.quantity * quantity;
      const available = await getTotalQuantityByTemplate(playerId, mat.templateId);
      if (available < needed) {
        throw new AppError(400, 'Insufficient materials', 'INSUFFICIENT_ITEMS');
      }
    }

    const totalTurnCost = recipe.turnCost * quantity;
    const turnSpend = await spendPlayerTurns(playerId, totalTurnCost);

    // Consume materials
    for (const mat of materials) {
      await consumeItemsByTemplate(playerId, mat.templateId, mat.quantity * quantity);
    }

    // Create result items (stack where possible)
    const craftedItemIds: string[] = [];
    const craftedItemDetails: Array<{
      id: string;
      isCrit: boolean;
      bonusStat?: string;
      bonusValue?: number;
    }> = [];
    const needsDurability = recipe.resultTemplate.itemType === 'weapon' || recipe.resultTemplate.itemType === 'armor';
    const levelBuckets = Math.floor((skillLevel - recipe.requiredLevel) / 10);
    const durabilityBonusPct = levelBuckets * CRAFTING_CONSTANTS.DURABILITY_BONUS_PER_10_LEVELS;
    const baseMax = recipe.resultTemplate.maxDurability;
    const craftedMax = needsDurability ? Math.floor(baseMax * (1 + durabilityBonusPct / 100)) : null;

    if (recipe.resultTemplate.stackable) {
      const existing = await prisma.item.findFirst({
        where: { ownerId: playerId, templateId: recipe.resultTemplateId },
        select: { id: true, quantity: true },
      });

      if (existing) {
        const updated = await prisma.item.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
          select: { id: true },
        });
        craftedItemIds.push(updated.id);
      } else {
        const created = await prisma.item.create({
          data: {
            ownerId: playerId,
            templateId: recipe.resultTemplateId,
            quantity,
            maxDurability: craftedMax,
            currentDurability: craftedMax,
          },
          select: { id: true },
        });
        craftedItemIds.push(created.id);
      }
    } else {
      const itemType: ItemType = isItemType(recipe.resultTemplate.itemType)
        ? recipe.resultTemplate.itemType
        : 'resource';
      const equipStats = await getEquipmentStats(playerId);
      const templateBaseStats = recipe.resultTemplate.baseStats as ItemStats | null | undefined;

      for (let i = 0; i < quantity; i++) {
        const critResult = calculateCraftingCrit({
          skillLevel,
          requiredLevel: recipe.requiredLevel,
          luckStat: equipStats.luck,
          itemType,
          baseStats: templateBaseStats,
        });
        const bonusStats = critResult.isCrit && critResult.bonusStat && typeof critResult.bonusValue === 'number'
          ? ({ [critResult.bonusStat]: critResult.bonusValue } as Prisma.InputJsonObject)
          : undefined;

        const created = await prisma.item.create({
          data: {
            ownerId: playerId,
            templateId: recipe.resultTemplateId,
            quantity: 1,
            maxDurability: craftedMax,
            currentDurability: craftedMax,
            bonusStats,
          },
          select: { id: true },
        });
        craftedItemIds.push(created.id);
        craftedItemDetails.push(
          critResult.isCrit && critResult.bonusStat && typeof critResult.bonusValue === 'number'
            ? {
                id: created.id,
                isCrit: true,
                bonusStat: critResult.bonusStat,
                bonusValue: critResult.bonusValue,
              }
            : { id: created.id, isCrit: false }
        );
      }
    }

    const xpGrant = await grantSkillXp(playerId, recipe.skillType, recipe.xpReward * quantity);

    const log = await prisma.activityLog.create({
      data: {
        playerId,
        activityType: 'crafting',
        turnsSpent: totalTurnCost,
        result: {
          recipeId: recipe.id,
          skillType: recipe.skillType,
          requiredLevel: recipe.requiredLevel,
          quantity,
          turnCost: recipe.turnCost,
          materials,
          resultTemplateId: recipe.resultTemplateId,
          craftedItemIds,
          craftedItemDetails,
          durability: needsDurability
            ? { baseMax, durabilityBonusPct, craftedMax }
            : null,
          xp: {
            skillType: xpGrant.skillType,
            ...xpGrant.xpResult,
            newTotalXp: xpGrant.newTotalXp,
            newDailyXpGained: xpGrant.newDailyXpGained,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({
      logId: log.id,
      turns: turnSpend,
      crafted: {
        recipeId: recipe.id,
        resultTemplateId: recipe.resultTemplateId,
        quantity,
        craftedItemIds,
      },
      craftedItemDetails,
      xp: {
        skillType: xpGrant.skillType,
        ...xpGrant.xpResult,
        newTotalXp: xpGrant.newTotalXp,
        newDailyXpGained: xpGrant.newDailyXpGained,
      },
    });
  } catch (err) {
    next(err);
  }
});
