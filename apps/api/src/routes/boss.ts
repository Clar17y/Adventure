import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@adventure/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  getActiveBossEncounters,
  getBossEncounterStatus,
  signUpForBossRound,
  checkAndResolveDueBossRounds,
} from '../services/bossEncounterService';
import { getHpState } from '../services/hpService';
import { getIo } from '../socket';

export const bossRouter = Router();

bossRouter.use(authenticate);

/**
 * GET /api/v1/boss/active
 * List active boss encounters.
 */
bossRouter.get('/active', async (_req, res, next) => {
  try {
    await checkAndResolveDueBossRounds(getIo());
    const encounters = await getActiveBossEncounters();

    // Enrich with mob template names and zone info
    const enriched = await Promise.all(
      encounters.map(async (enc) => {
        const [mob, event] = await Promise.all([
          prisma.mobTemplate.findUnique({
            where: { id: enc.mobTemplateId },
            select: { name: true, level: true },
          }),
          prisma.worldEvent.findUnique({
            where: { id: enc.eventId },
            select: { zoneId: true, title: true, zone: { select: { name: true } } },
          }),
        ]);
        return {
          ...enc,
          mobName: mob?.name ?? 'Unknown',
          mobLevel: mob?.level ?? 1,
          zoneId: event?.zoneId ?? '',
          zoneName: event?.zone?.name ?? 'Unknown',
          eventTitle: event?.title ?? '',
        };
      }),
    );

    res.json({ encounters: enriched });
  } catch (err) {
    next(err);
  }
});

const encounterIdSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/v1/boss/:id
 * Encounter detail + participants.
 */
bossRouter.get('/:id', async (req, res, next) => {
  try {
    await checkAndResolveDueBossRounds(getIo());
    const { id } = encounterIdSchema.parse(req.params);
    const data = await getBossEncounterStatus(id);
    if (!data) {
      throw new AppError(404, 'Boss encounter not found', 'NOT_FOUND');
    }

    const mob = await prisma.mobTemplate.findUnique({
      where: { id: data.encounter.mobTemplateId },
      select: { name: true, level: true },
    });

    // Compute raid pool from next-round signups
    const nextRound = data.encounter.roundNumber + 1;
    const currentSignups = data.participants.filter((p) => p.roundNumber === nextRound);
    let raidPoolMax = 0;
    for (const p of currentSignups) {
      const hp = await getHpState(p.playerId);
      raidPoolMax += hp.maxHp;
    }

    res.json({
      encounter: {
        ...data.encounter,
        mobName: mob?.name ?? 'Unknown',
        mobLevel: mob?.level ?? 1,
        raidPoolHp: raidPoolMax,
        raidPoolMax,
      },
      participants: data.participants,
    });
  } catch (err) {
    next(err);
  }
});

const signupSchema = z.object({
  role: z.enum(['attacker', 'healer']),
  turnsCommitted: z.number().int().min(50).max(5000),
});

/**
 * POST /api/v1/boss/:id/signup
 * Sign up for the next boss round.
 */
bossRouter.post('/:id/signup', async (req, res, next) => {
  try {
    await checkAndResolveDueBossRounds(getIo());
    const playerId = req.player!.playerId;
    const { id } = encounterIdSchema.parse(req.params);
    const body = signupSchema.parse(req.body);

    // Fetch encounter to get eventId for zone check
    const encounter = await prisma.bossEncounter.findUnique({
      where: { id },
      select: { eventId: true },
    });
    if (!encounter) {
      throw new AppError(404, 'Boss encounter not found', 'NOT_FOUND');
    }

    // Check player is in the boss zone
    const event = await prisma.worldEvent.findUnique({
      where: { id: encounter.eventId },
      select: { zoneId: true },
    });
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { currentZoneId: true },
    });
    if (!event?.zoneId || player?.currentZoneId !== event.zoneId) {
      throw new AppError(400, 'You must be in the boss zone to sign up', 'WRONG_ZONE');
    }

    const hpState = await getHpState(playerId);
    if (hpState.isRecovering) {
      throw new AppError(400, 'Cannot join boss while recovering', 'IS_RECOVERING');
    }

    const participant = await signUpForBossRound(
      id,
      playerId,
      body.role,
      body.turnsCommitted,
      hpState.maxHp,
    );

    res.json({ participant });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Already signed up')) {
      return next(new AppError(409, err.message, 'ALREADY_SIGNED_UP'));
    }
    if (err instanceof Error && err.message.includes('not found')) {
      return next(new AppError(404, err.message, 'NOT_FOUND'));
    }
    if (err instanceof Error && err.message.includes('already over')) {
      return next(new AppError(410, err.message, 'ENCOUNTER_OVER'));
    }
    next(err);
  }
});

const roundParamsSchema = z.object({
  id: z.string().uuid(),
  num: z.coerce.number().int().min(1),
});

/**
 * GET /api/v1/boss/:id/round/:num
 * Round results for a specific round.
 */
bossRouter.get('/:id/round/:num', async (req, res, next) => {
  try {
    const { id, num } = roundParamsSchema.parse(req.params);

    const participants = await prisma.bossParticipant.findMany({
      where: { encounterId: id, roundNumber: num },
      orderBy: { totalDamage: 'desc' },
    });

    if (participants.length === 0) {
      throw new AppError(404, 'Round not found', 'NOT_FOUND');
    }

    res.json({
      round: num,
      participants: participants.map((p) => ({
        playerId: p.playerId,
        role: p.role,
        turnsCommitted: p.turnsCommitted,
        totalDamage: p.totalDamage,
        totalHealing: p.totalHealing,
        currentHp: p.currentHp,
        status: p.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});
