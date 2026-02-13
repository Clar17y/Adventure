import { prisma } from '@adventure/database';
import type {
  ActiveZoneModifiers,
  WorldEventData,
  WorldEventEffectType,
  WorldEventStatus,
  WorldEventType,
} from '@adventure/shared';

function toWorldEventData(row: {
  id: string;
  type: string;
  zoneId: string;
  title: string;
  description: string;
  effectType: string;
  effectValue: number;
  targetMobId: string | null;
  targetFamily: string | null;
  targetResource: string | null;
  startedAt: Date;
  expiresAt: Date | null;
  status: string;
  createdBy: string;
}): WorldEventData {
  return {
    id: row.id,
    type: row.type as WorldEventType,
    zoneId: row.zoneId,
    title: row.title,
    description: row.description,
    effectType: row.effectType as WorldEventEffectType,
    effectValue: row.effectValue,
    targetMobId: row.targetMobId,
    targetFamily: row.targetFamily,
    targetResource: row.targetResource,
    startedAt: row.startedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    status: row.status as WorldEventStatus,
    createdBy: row.createdBy as 'system' | 'player_discovery',
  };
}

export async function getActiveEventsForZone(zoneId: string): Promise<WorldEventData[]> {
  const rows = await prisma.worldEvent.findMany({
    where: { zoneId, status: 'active' },
    orderBy: { startedAt: 'desc' },
  });
  return rows.map(toWorldEventData);
}

export async function getActiveZoneModifiers(zoneId: string): Promise<ActiveZoneModifiers> {
  const events = await getActiveEventsForZone(zoneId);
  const mods: ActiveZoneModifiers = {
    mobDamageMultiplier: 1,
    mobHpMultiplier: 1,
    mobSpawnRateMultiplier: 1,
    resourceDropRateMultiplier: 1,
    resourceYieldMultiplier: 1,
  };

  for (const event of events) {
    switch (event.effectType) {
      case 'damage_up': mods.mobDamageMultiplier *= (1 + event.effectValue); break;
      case 'damage_down': mods.mobDamageMultiplier *= Math.max(0.1, 1 - event.effectValue); break;
      case 'hp_up': mods.mobHpMultiplier *= (1 + event.effectValue); break;
      case 'hp_down': mods.mobHpMultiplier *= Math.max(0.1, 1 - event.effectValue); break;
      case 'spawn_rate_up': mods.mobSpawnRateMultiplier *= (1 + event.effectValue); break;
      case 'spawn_rate_down': mods.mobSpawnRateMultiplier *= Math.max(0.1, 1 - event.effectValue); break;
      case 'drop_rate_up': mods.resourceDropRateMultiplier *= (1 + event.effectValue); break;
      case 'yield_up': mods.resourceYieldMultiplier *= (1 + event.effectValue); break;
    }
  }

  return mods;
}

export async function getAllActiveEvents(): Promise<WorldEventData[]> {
  const rows = await prisma.worldEvent.findMany({
    where: { status: 'active' },
    orderBy: { startedAt: 'desc' },
  });
  return rows.map(toWorldEventData);
}

export async function spawnWorldEvent(params: {
  type: WorldEventType;
  zoneId: string;
  title: string;
  description: string;
  effectType: WorldEventEffectType;
  effectValue: number;
  targetMobId?: string;
  targetFamily?: string;
  targetResource?: string;
  durationHours: number;
  createdBy?: 'system' | 'player_discovery';
}): Promise<WorldEventData | null> {
  // Check slot limit: 1 active event per type per zone
  const existing = await prisma.worldEvent.findFirst({
    where: {
      zoneId: params.zoneId,
      type: params.type,
      status: 'active',
    },
  });
  if (existing) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.durationHours * 60 * 60 * 1000);

  const row = await prisma.worldEvent.create({
    data: {
      type: params.type,
      zoneId: params.zoneId,
      title: params.title,
      description: params.description,
      effectType: params.effectType,
      effectValue: params.effectValue,
      targetMobId: params.targetMobId ?? null,
      targetFamily: params.targetFamily ?? null,
      targetResource: params.targetResource ?? null,
      expiresAt,
      status: 'active',
      createdBy: params.createdBy ?? 'system',
    },
  });

  return toWorldEventData(row);
}

export async function expireStaleEvents(): Promise<WorldEventData[]> {
  const now = new Date();
  const stale = await prisma.worldEvent.findMany({
    where: {
      status: 'active',
      expiresAt: { lte: now },
    },
  });

  if (stale.length === 0) return [];

  await prisma.worldEvent.updateMany({
    where: {
      id: { in: stale.map((e) => e.id) },
      status: 'active',
    },
    data: { status: 'expired' },
  });

  return stale.map(toWorldEventData);
}

export async function getEventById(id: string): Promise<WorldEventData | null> {
  const row = await prisma.worldEvent.findUnique({ where: { id } });
  return row ? toWorldEventData(row) : null;
}
