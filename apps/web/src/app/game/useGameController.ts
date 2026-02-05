import { useCallback, useEffect, useRef, useState } from 'react';
import {
  abandonPendingEncounters,
  craft,
  destroyInventoryItem,
  equip,
  getBestiary,
  getCraftingRecipes,
  getEquipment,
  getGatheringNodes,
  getHpState,
  getInventory,
  getPendingEncounters,
  getSkills,
  getTurns,
  getZones,
  mine,
  repairItem,
  startCombatFromPendingEncounter,
  startExploration,
  unequip,
} from '@/lib/api';

export type Screen =
  | 'home'
  | 'explore'
  | 'inventory'
  | 'combat'
  | 'profile'
  | 'skills'
  | 'equipment'
  | 'zones'
  | 'bestiary'
  | 'crafting'
  | 'gathering'
  | 'rest';

export interface PendingEncounter {
  encounterId: string;
  zoneId: string;
  zoneName: string;
  mobTemplateId: string;
  mobName: string;
  turnOccurred: number;
  createdAt: string;
  expiresAt: string;
}

export interface LastCombatLogEntry {
  round: number;
  actor: 'player' | 'mob';
  action: string;
  message: string;
  roll?: number;
  damage?: number;
  evaded?: boolean;
  attackModifier?: number;
  targetDefence?: number;
  rawDamage?: number;
  armorReduction?: number;
  isCritical?: boolean;
  playerHpAfter?: number;
  mobHpAfter?: number;
}

export interface LastCombat {
  outcome: string;
  log: LastCombatLogEntry[];
  rewards: {
    xp: number;
    loot: Array<{ itemTemplateId: string; quantity: number }>;
    skillXp: {
      skillType: string;
      xpGained: number;
      xpAfterEfficiency: number;
      efficiency: number;
      leveledUp: boolean;
      newLevel: number;
    } | null;
    secondarySkillXp: {
      defence: { events: number; xpGained: number };
      evasion: { events: number; xpGained: number };
      grants: Array<{
        skillType: string;
        xpGained: number;
        xpAfterEfficiency: number;
        leveledUp: boolean;
        newLevel: number;
      }>;
    };
  };
}

export interface HpState {
  currentHp: number;
  maxHp: number;
  regenPerSecond: number;
  isRecovering: boolean;
  recoveryCost: number | null;
}

export function useGameController({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [turns, setTurns] = useState(0);
  const [zones, setZones] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    difficulty: number;
    travelCost: number;
    isStarter: boolean;
    discovered: boolean;
  }>>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [skills, setSkills] = useState<Array<{ skillType: string; level: number; xp: number; dailyXpGained: number }>>([]);
  const [inventory, setInventory] = useState<Array<{
    id: string;
    quantity: number;
    currentDurability: number | null;
    maxDurability: number | null;
    equippedSlot: string | null;
    template: {
      id: string;
      name: string;
      itemType: string;
      slot: string | null;
      tier: number;
      baseStats: Record<string, unknown>;
      requiredSkill?: string | null;
      requiredLevel?: number;
      maxDurability?: number;
      stackable?: boolean;
    };
  }>>([]);
  const [equipment, setEquipment] = useState<Array<{
    slot: string;
    itemId: string | null;
    item: null | {
      id: string;
      currentDurability: number | null;
      maxDurability: number | null;
      template: {
        id: string;
        name: string;
        itemType: string;
        slot: string | null;
        tier: number;
        baseStats: Record<string, unknown>;
        requiredSkill?: string | null;
        requiredLevel?: number;
        maxDurability?: number;
        stackable?: boolean;
      };
    };
  }>>([]);
  const [gatheringNodes, setGatheringNodes] = useState<Array<{
    id: string;
    templateId: string;
    zoneId: string;
    zoneName: string;
    resourceType: string;
    skillRequired: string;
    levelRequired: number;
    baseYield: number;
    remainingCapacity: number;
    maxCapacity: number;
    sizeName: string;
    discoveredAt: string;
  }>>([]);
  const [craftingRecipes, setCraftingRecipes] = useState<Array<{
    id: string;
    skillType: string;
    requiredLevel: number;
    resultTemplate: { id: string; name: string; itemType: string; slot: string | null; tier: number; baseStats: Record<string, unknown>; stackable: boolean; maxDurability: number; requiredSkill: string | null; requiredLevel: number };
    turnCost: number;
    materials: Array<{ templateId: string; quantity: number }>;
    materialTemplates: Array<{ id: string; name: string; itemType: string; stackable: boolean }>;
    xpReward: number;
  }>>([]);
  const [explorationLog, setExplorationLog] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'danger' }>>([]);
  const [gatheringLog, setGatheringLog] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' }>>([]);
  const [pendingEncounters, setPendingEncounters] = useState<PendingEncounter[]>([]);
  const [pendingClockMs, setPendingClockMs] = useState(() => Date.now());
  const pendingRefreshInFlightRef = useRef(false);
  const [lastCombat, setLastCombat] = useState<LastCombat | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bestiaryMobs, setBestiaryMobs] = useState<Array<{
    id: string;
    name: string;
    level: number;
    isDiscovered: boolean;
    killCount: number;
    stats: { hp: number; attack: number; defence: number };
    zones: string[];
    description: string;
    drops: Array<{
      item: { id: string; name: string; itemType: string; tier: number };
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      dropRate: number;
      minQuantity: number;
      maxQuantity: number;
    }>;
  }>>([]);
  const [bestiaryLoading, setBestiaryLoading] = useState(false);
  const [bestiaryError, setBestiaryError] = useState<string | null>(null);
  const [hpState, setHpState] = useState<HpState>({ currentHp: 100, maxHp: 100, regenPerSecond: 0.4, isRecovering: false, recoveryCost: null });

  const loadTurnsAndHp = useCallback(async () => {
    const [turnRes, hpRes] = await Promise.all([getTurns(), getHpState()]);
    if (turnRes.data) setTurns(turnRes.data.currentTurns);
    if (hpRes.data) setHpState(hpRes.data);
  }, []);

  const loadAll = useCallback(async () => {
    setActionError(null);

    const [turnRes, skillsRes, zonesRes, invRes, equipRes, recipesRes, pendingRes, nodesRes, hpRes] = await Promise.all([
      getTurns(),
      getSkills(),
      getZones(),
      getInventory(),
      getEquipment(),
      getCraftingRecipes(),
      getPendingEncounters(),
      getGatheringNodes(),
      getHpState(),
    ]);

    if (turnRes.data) setTurns(turnRes.data.currentTurns);
    if (skillsRes.data) setSkills(skillsRes.data.skills);
    if (hpRes.data) setHpState(hpRes.data);
    if (zonesRes.data) {
      setZones(zonesRes.data.zones);
      setActiveZoneId((prev) => {
        if (prev) return prev;
        const first = zonesRes.data!.zones.find((z) => z.discovered) ?? zonesRes.data!.zones.find((z) => z.isStarter) ?? zonesRes.data!.zones[0];
        return first?.id ?? prev;
      });
    }
    if (invRes.data) setInventory(invRes.data.items);
    if (equipRes.data) {
      setEquipment(
        equipRes.data.equipment.map((e) => ({
          slot: e.slot,
          itemId: e.itemId,
          item: e.item
            ? { id: e.item.id, currentDurability: e.item.currentDurability, maxDurability: e.item.maxDurability, template: e.item.template }
            : null,
        }))
      );
    }
    if (recipesRes.data) setCraftingRecipes(recipesRes.data.recipes);
    if (nodesRes.data) setGatheringNodes(nodesRes.data.nodes);
    if (pendingRes.data) setPendingEncounters(pendingRes.data.pendingEncounters);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadAll();
      const interval = setInterval(() => void loadTurnsAndHp(), 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadAll, loadTurnsAndHp]);

  const refreshPendingEncounters = useCallback(async () => {
    if (!isAuthenticated) return;
    if (pendingRefreshInFlightRef.current) return;
    pendingRefreshInFlightRef.current = true;
    try {
      const res = await getPendingEncounters();
      if (res.data) setPendingEncounters(res.data.pendingEncounters);
    } finally {
      pendingRefreshInFlightRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeScreen !== 'combat') return;
    void refreshPendingEncounters();
  }, [isAuthenticated, activeScreen, refreshPendingEncounters]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeScreen !== 'combat') return;
    if (pendingEncounters.length === 0) return;

    const tick = () => {
      const now = Date.now();
      setPendingClockMs(now);
      setPendingEncounters((prev) => {
        const next = prev.filter((e) => new Date(e.expiresAt).getTime() > now);
        return next.length === prev.length ? prev : next;
      });
    };

    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeScreen, pendingEncounters.length]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeScreen !== 'combat') return;
    if (pendingEncounters.length === 0) return;

    let nextExpiryMs = Number.POSITIVE_INFINITY;
    for (const e of pendingEncounters) {
      const ms = new Date(e.expiresAt).getTime();
      if (Number.isFinite(ms) && ms < nextExpiryMs) nextExpiryMs = ms;
    }
    if (!Number.isFinite(nextExpiryMs)) return;

    const delayMs = Math.max(0, nextExpiryMs - Date.now() + 250);
    const timeout = setTimeout(() => void refreshPendingEncounters(), delayMs);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, activeScreen, pendingEncounters, refreshPendingEncounters]);

  const loadBestiary = useCallback(async () => {
    setBestiaryError(null);
    setBestiaryLoading(true);
    try {
      const { data, error } = await getBestiary();
      if (data) setBestiaryMobs(data.mobs);
      else setBestiaryError(error?.message ?? 'Failed to load bestiary');
    } finally {
      setBestiaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeScreen === 'bestiary') {
      void loadBestiary();
    }
  }, [isAuthenticated, activeScreen, loadBestiary]);

  const loadGatheringNodes = useCallback(async () => {
    const { data } = await getGatheringNodes(); // Load all player's discovered nodes
    if (data) setGatheringNodes(data.nodes);
  }, []);

  const handleNavigate = useCallback((screen: string) => {
    setActiveScreen(screen as Screen);
  }, []);

  const getActiveTab = () => {
    if (['home', 'skills', 'zones', 'bestiary', 'rest'].includes(activeScreen)) return 'home';
    if (['explore', 'gathering', 'crafting'].includes(activeScreen)) return 'explore';
    if (['inventory', 'equipment'].includes(activeScreen)) return 'inventory';
    if (['combat'].includes(activeScreen)) return 'combat';
    return 'profile';
  };

  const nowStamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const currentZone =
    zones.find((z) => z.id === activeZoneId) ??
    zones.find((z) => z.discovered) ??
    zones.find((z) => z.isStarter) ??
    null;

  const ownedByTemplateId = (() => {
    const map = new Map<string, number>();
    for (const item of inventory) {
      map.set(item.template.id, (map.get(item.template.id) ?? 0) + item.quantity);
    }
    return map;
  })();

  const runAction = async (actionName: string, fn: () => Promise<void>) => {
    if (busyAction) return;
    setBusyAction(actionName);
    setActionError(null);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartExploration = async (turnSpend: number) => {
    if (!currentZone) return;

    await runAction('exploration', async () => {
      const res = await startExploration(currentZone.id, turnSpend);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Exploration failed');
        return;
      }

      setTurns(data.turns.currentTurns);
      setExplorationLog((prev) => [
        { timestamp: nowStamp(), type: 'info', message: `Explored ${turnSpend.toLocaleString()} turns in ${data.zone.name}.` },
        ...prev,
      ]);

      if (data.mobEncounters.length > 0) {
        setPendingEncounters((prev) => {
          const existing = new Set(prev.map((p) => p.encounterId));
          const fresh = data.mobEncounters
            .filter((m) => !existing.has(m.encounterId))
            .map((m) => ({
              encounterId: m.encounterId,
              zoneId: m.zoneId,
              zoneName: m.zoneName,
              mobTemplateId: m.mobTemplateId,
              mobName: m.mobName,
              turnOccurred: m.turnOccurred,
              createdAt: m.createdAt,
              expiresAt: m.expiresAt,
            }));
          return [...fresh, ...prev];
        });
        setExplorationLog((prev) => [
          { timestamp: nowStamp(), type: 'success', message: `Encountered ${data.mobEncounters.length} mob(s). Check Combat tab.` },
          ...prev,
        ]);
      }

      if (data.resourceDiscoveries.length > 0) {
        setExplorationLog((prev) => [
          { timestamp: nowStamp(), type: 'success', message: `Found ${data.resourceDiscoveries.length} resource node(s).` },
          ...prev,
        ]);
        await loadGatheringNodes();
      }
    });
  };

  const handleStartCombat = async (pendingEncounterId: string) => {
    await runAction('combat', async () => {
      const res = await startCombatFromPendingEncounter(pendingEncounterId, 'melee');
      const data = res.data;
      if (!data) {
        if (res.error?.code === 'ENCOUNTER_EXPIRED' || res.error?.code === 'NOT_FOUND') {
          setPendingEncounters((prev) => prev.filter((p) => p.encounterId !== pendingEncounterId));
        }
        setActionError(res.error?.message ?? 'Combat failed');
        return;
      }

      setTurns(data.turns.currentTurns);
      setLastCombat({
        outcome: data.combat.outcome,
        log: data.combat.log,
        rewards: {
          xp: data.rewards.xp,
          loot: data.rewards.loot,
          skillXp: data.rewards.skillXp
            ? {
                skillType: data.rewards.skillXp.skillType,
                xpGained: data.rewards.skillXp.xpGained,
                xpAfterEfficiency: data.rewards.skillXp.xpAfterEfficiency,
                efficiency: data.rewards.skillXp.efficiency,
                leveledUp: data.rewards.skillXp.leveledUp,
                newLevel: data.rewards.skillXp.newLevel,
              }
            : null,
          secondarySkillXp: data.rewards.secondarySkillXp,
        },
      });

      const skillXp = data.rewards?.skillXp;
      if (skillXp?.leveledUp) {
        const skillName = skillXp.skillType.charAt(0).toUpperCase() + skillXp.skillType.slice(1);
        setExplorationLog((prev) => [
          { timestamp: nowStamp(), type: 'success', message: `🎉 ${skillName} leveled up to ${skillXp.newLevel}!` },
          ...prev,
        ]);
      }

      await Promise.all([loadAll(), loadTurnsAndHp()]);
      setPendingEncounters((prev) => prev.filter((p) => p.encounterId !== pendingEncounterId));
    });
  };

  const handleMine = async (playerNodeId: string, turnSpend: number) => {
    if (!activeZoneId) return;

    await runAction('mining', async () => {
      const res = await mine(playerNodeId, turnSpend, activeZoneId);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Mining failed');
        return;
      }

      setTurns(data.turns.currentTurns);

      const newLogs: Array<{ timestamp: string; message: string; type: 'info' | 'success' }> = [];

      if (data.xp?.leveledUp) {
        newLogs.push({
          timestamp: nowStamp(),
          type: 'success',
          message: `🎉 Mining leveled up to ${data.xp.newLevel}!`,
        });
      }

      if (data.node.nodeDepleted) {
        newLogs.push({
          timestamp: nowStamp(),
          type: 'info',
          message: `Vein depleted! Mined ${data.results.totalYield} resource(s).`,
        });
      } else {
        newLogs.push({
          timestamp: nowStamp(),
          type: 'success',
          message: `Mined ${data.results.totalYield} resource(s). ${data.node.remainingCapacity} remaining.`,
        });
      }

      setGatheringLog((prev) => [...newLogs, ...prev]);
      await loadAll();
    });
  };

  const handleCraft = async (recipeId: string) => {
    await runAction('crafting', async () => {
      const res = await craft(recipeId, 1);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Crafting failed');
        return;
      }

      setTurns(data.turns.currentTurns);

      const newLogs: Array<{ timestamp: string; message: string; type: 'info' | 'success' }> = [];

      if (data.xp?.leveledUp) {
        newLogs.push({
          timestamp: nowStamp(),
          type: 'success',
          message: `🎉 ${data.xp.skillType.charAt(0).toUpperCase() + data.xp.skillType.slice(1)} leveled up to ${data.xp.newLevel}!`,
        });
      }

      newLogs.push({
        timestamp: nowStamp(),
        type: 'info',
        message: `Crafted x${data.crafted.quantity}.`,
      });

      setGatheringLog((prev) => [...newLogs, ...prev]);
      await loadAll();
    });
  };

  const handleDestroyItem = async (itemId: string) => {
    await runAction('destroy', async () => {
      const res = await destroyInventoryItem(itemId);
      if (!res.data) {
        setActionError(res.error?.message ?? 'Destroy failed');
        return;
      }
      await loadAll();
    });
  };

  const handleRepairItem = async (itemId: string) => {
    await runAction('repair', async () => {
      const res = await repairItem(itemId);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Repair failed');
        return;
      }
      if (data.turns) setTurns(data.turns.currentTurns);
      await loadAll();
    });
  };

  const handleEquipItem = async (itemId: string, slot: string) => {
    await runAction('equip', async () => {
      const res = await equip(itemId, slot);
      if (!res.data) {
        setActionError(res.error?.message ?? 'Equip failed');
        return;
      }
      await loadAll();
    });
  };

  const handleUnequipSlot = async (slot: string) => {
    await runAction('unequip', async () => {
      const res = await unequip(slot);
      if (!res.data) {
        setActionError(res.error?.message ?? 'Unequip failed');
        return;
      }
      await loadAll();
    });
  };

  const handleTravelToZone = async (id: string) => {
    const leavingZoneId = activeZoneId;
    const leavingCount = leavingZoneId ? pendingEncounters.filter((p) => p.zoneId === leavingZoneId).length : 0;

    if (leavingZoneId && leavingCount > 0) {
      const ok = window.confirm(
        `You have ${leavingCount} pending encounter(s) in this zone. Traveling will abandon them. Continue?`
      );
      if (!ok) return;

      await abandonPendingEncounters(leavingZoneId);
      setPendingEncounters((prev) => prev.filter((p) => p.zoneId !== leavingZoneId));
    }

    setActiveZoneId(id);
    setActiveScreen('explore');
  };

  return {
    // Navigation
    activeScreen,
    setActiveScreen,
    handleNavigate,
    getActiveTab,
    handleTravelToZone,

    // Core state
    turns,
    setTurns,
    zones,
    activeZoneId,
    setActiveZoneId,
    skills,
    inventory,
    equipment,
    gatheringNodes,
    craftingRecipes,
    explorationLog,
    gatheringLog,
    pendingEncounters,
    pendingClockMs,
    lastCombat,
    busyAction,
    actionError,
    bestiaryMobs,
    bestiaryLoading,
    bestiaryError,
    hpState,
    setHpState,

    // Derived
    currentZone,
    ownedByTemplateId,

    // Actions
    handleStartExploration,
    handleStartCombat,
    handleMine,
    handleCraft,
    handleDestroyItem,
    handleRepairItem,
    handleEquipItem,
    handleUnequipSlot,
  };
}
