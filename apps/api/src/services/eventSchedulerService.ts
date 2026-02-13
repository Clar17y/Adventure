import type { Server as SocketServer } from 'socket.io';
import { prisma } from '@adventure/database';
import {
  WORLD_EVENT_CONSTANTS,
  WORLD_EVENT_TEMPLATES,
  type WorldEventTemplate,
  type WorldEventType,
} from '@adventure/shared';
import { expireStaleEvents, spawnWorldEvent } from './worldEventService';
import { emitSystemMessage } from './systemMessageService';

// Track last scheduler run to avoid running too frequently
let lastRunAt = 0;
const MIN_INTERVAL_MS = 60_000; // at most once per minute

function pickWeightedTemplate(templates: WorldEventTemplate[]): WorldEventTemplate | null {
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const t of templates) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return templates[templates.length - 1] ?? null;
}

function getDurationForType(type: WorldEventType): number {
  if (type === 'resource') return WORLD_EVENT_CONSTANTS.RESOURCE_EVENT_DURATION_HOURS;
  return WORLD_EVENT_CONSTANTS.MOB_EVENT_DURATION_HOURS;
}

export async function checkAndSpawnEvents(io: SocketServer | null): Promise<void> {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) return;
  lastRunAt = now;

  // Expire stale events and notify
  const expired = await expireStaleEvents();
  for (const event of expired) {
    await emitSystemMessage(io, 'zone', event.zoneId, `Event ended: ${event.title}`);
  }

  // Get wild zones that could host events
  const wildZones = await prisma.zone.findMany({
    where: { zoneType: 'wild' },
    select: { id: true, name: true },
  });
  if (wildZones.length === 0) return;

  // Check which types have empty slots (globally, to limit total events)
  const activeEventCounts = await prisma.worldEvent.groupBy({
    by: ['type'],
    where: { status: 'active' },
    _count: { _all: true },
  });
  const countByType = new Map(activeEventCounts.map((r) => [r.type, r._count._all]));

  // Try to spawn one event per type that has empty slots
  for (const type of ['resource', 'mob'] as WorldEventType[]) {
    const currentCount = countByType.get(type) ?? 0;
    // Cap at roughly 1 event per 3 wild zones
    const maxForType = Math.max(1, Math.floor(wildZones.length / 3));
    if (currentCount >= maxForType) continue;

    // Pick a zone without an active event of this type
    const zonesWithEvent: Array<{ zoneId: string }> = await prisma.worldEvent.findMany({
      where: { type, status: 'active' },
      select: { zoneId: true },
    });
    const occupiedZoneIds = new Set(zonesWithEvent.map((e) => e.zoneId));
    const candidates = wildZones.filter((z) => !occupiedZoneIds.has(z.id));
    if (candidates.length === 0) continue;

    const zone = candidates[Math.floor(Math.random() * candidates.length)]!;

    // Pick a template for this type
    const templates = WORLD_EVENT_TEMPLATES.filter((t) => t.type === type);
    const template = pickWeightedTemplate(templates);
    if (!template) continue;

    const event = await spawnWorldEvent({
      type,
      zoneId: zone.id,
      title: template.title,
      description: template.description,
      effectType: template.effectType,
      effectValue: template.effectValue,
      durationHours: getDurationForType(type),
    });

    if (event) {
      await emitSystemMessage(
        io,
        'zone',
        zone.id,
        `New event in ${zone.name}: ${event.title} — ${event.description}`,
      );
    }
  }
}
