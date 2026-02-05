'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  craft,
  getCraftingRecipes,
  getBestiary,
  getEquipment,
  getGatheringNodes,
  getInventory,
  getSkills,
  getPendingEncounters,
  getTurns,
  getZones,
  mine,
  repairItem,
  equip,
  unequip,
  abandonPendingEncounters,
  startCombatFromPendingEncounter,
  startExploration,
  destroyInventoryItem,
} from '@/lib/api';
import { itemImageSrc, monsterImageSrc, resourceImageSrc, skillIconSrc, zoneImageSrc } from '@/lib/assets';
import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { Dashboard } from '@/components/screens/Dashboard';
import { Exploration } from '@/components/screens/Exploration';
import { Inventory } from '@/components/screens/Inventory';
import { Equipment } from '@/components/screens/Equipment';
import { Skills } from '@/components/screens/Skills';
import { ZoneMap } from '@/components/screens/ZoneMap';
import { Bestiary } from '@/components/screens/Bestiary';
import { Crafting } from '@/components/screens/Crafting';
import { Gathering } from '@/components/screens/Gathering';
import { TURN_CONSTANTS, SKILL_CONSTANTS, COMBAT_SKILLS, GATHERING_SKILLS, CRAFTING_SKILLS } from '@adventure/shared';
import { Sword, Shield, Crosshair, Heart, Sparkles, Zap, Pickaxe, Hammer } from 'lucide-react';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

function rarityFromTier(tier: number): Rarity {
  if (tier >= 5) return 'legendary';
  if (tier === 4) return 'epic';
  if (tier === 3) return 'rare';
  if (tier === 2) return 'uncommon';
  return 'common';
}

function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(SKILL_CONSTANTS.XP_BASE * Math.pow(level, SKILL_CONSTANTS.XP_EXPONENT));
}

function calculateEfficiency(windowXpGained: number, skillType: string): number {
  const skill = skillType as any;
  const windowsPerDay = 24 / SKILL_CONSTANTS.XP_WINDOW_HOURS;

  if (COMBAT_SKILLS.includes(skill)) {
    const windowCap = Math.floor(SKILL_CONSTANTS.DAILY_CAP_COMBAT / windowsPerDay);
    return windowXpGained >= windowCap ? 0 : 1;
  }
  if (GATHERING_SKILLS.includes(skill)) {
    const windowCap = Math.floor(SKILL_CONSTANTS.DAILY_CAP_GATHERING / windowsPerDay);
    if (windowXpGained >= windowCap) return 0;
    const ratio = windowXpGained / windowCap;
    return Math.max(0, 1 - Math.pow(ratio, SKILL_CONSTANTS.EFFICIENCY_DECAY_POWER));
  }
  if (CRAFTING_SKILLS.includes(skill)) {
    const windowCap = Math.floor(SKILL_CONSTANTS.DAILY_CAP_CRAFTING / windowsPerDay);
    if (windowXpGained >= windowCap) return 0;
    const ratio = windowXpGained / windowCap;
    return Math.max(0, 1 - Math.pow(ratio, SKILL_CONSTANTS.EFFICIENCY_DECAY_POWER));
  }

  return 1;
}

const SKILL_META: Record<string, { name: string; icon: typeof Sword; color: string }> = {
  melee: { name: 'Melee', icon: Sword, color: 'var(--rpg-red)' },
  defence: { name: 'Defence', icon: Shield, color: 'var(--rpg-blue-light)' },
  ranged: { name: 'Ranged', icon: Crosshair, color: 'var(--rpg-green-light)' },
  vitality: { name: 'Vitality', icon: Heart, color: 'var(--rpg-green-light)' },
  magic: { name: 'Magic', icon: Sparkles, color: 'var(--rpg-purple)' },
  evasion: { name: 'Evasion', icon: Zap, color: 'var(--rpg-gold)' },
  mining: { name: 'Mining', icon: Pickaxe, color: 'var(--rpg-text-secondary)' },
  weaponsmithing: { name: 'Weaponsmithing', icon: Hammer, color: 'var(--rpg-gold)' },
};

/* Mock data for demo - will be replaced with API calls
const mockPlayerData = {
  turns: 45000,
  maxTurns: 64800,
  turnsRegenRate: 60,
  gold: 1250,
  currentXP: 15420,
  nextLevelXP: 20000,
  currentZone: 'Forest Edge',
};

const mockSkills = [
  { name: 'Melee', level: 15, icon: Sword },
  { name: 'Defence', level: 12, icon: Shield },
  { name: 'Ranged', level: 8, icon: Crosshair },
  { name: 'Vitality', level: 10, icon: Heart },
  { name: 'Magic', level: 5, icon: Sparkles },
  { name: 'Evasion', level: 7, icon: Zap },
  { name: 'Mining', level: 20, icon: Pickaxe },
  { name: 'Smithing', level: 14, icon: Hammer },
];

const mockDetailedSkills = [
  { id: '1', name: 'Melee', icon: Sword, level: 15, currentXP: 12500, nextLevelXP: 15000, efficiency: 85, color: 'var(--rpg-red)' },
  { id: '2', name: 'Defence', icon: Shield, level: 12, currentXP: 8200, nextLevelXP: 10000, efficiency: 78, color: 'var(--rpg-blue-light)' },
  { id: '3', name: 'Ranged', icon: Crosshair, level: 8, currentXP: 3500, nextLevelXP: 5000, efficiency: 72, color: 'var(--rpg-green-light)' },
  { id: '4', name: 'Vitality', icon: Heart, level: 10, currentXP: 5800, nextLevelXP: 7500, efficiency: 80, color: 'var(--rpg-green-light)' },
  { id: '5', name: 'Magic', icon: Sparkles, level: 5, currentXP: 1200, nextLevelXP: 2000, efficiency: 65, color: 'var(--rpg-purple)' },
  { id: '6', name: 'Evasion', icon: Zap, level: 7, currentXP: 2800, nextLevelXP: 4000, efficiency: 70, color: 'var(--rpg-gold)' },
  { id: '7', name: 'Mining', icon: Pickaxe, level: 20, currentXP: 18500, nextLevelXP: 22000, efficiency: 92, color: 'var(--rpg-text-secondary)' },
  { id: '8', name: 'Smithing', icon: Hammer, level: 14, currentXP: 11200, nextLevelXP: 14000, efficiency: 88, color: 'var(--rpg-gold)' },
];

const mockInventory = [
  { id: '1', name: 'Iron Sword', icon: '⚔️', quantity: 1, rarity: 'uncommon' as const, description: 'A sturdy iron sword.', type: 'weapon' },
  { id: '2', name: 'Health Potion', icon: '🧪', quantity: 5, rarity: 'common' as const, description: 'Restores 50 HP.', type: 'consumable' },
  { id: '3', name: 'Iron Ore', icon: '🪨', quantity: 24, rarity: 'common' as const, description: 'Raw iron ore for smelting.', type: 'material' },
  { id: '4', name: 'Dragon Scale', icon: '🐲', quantity: 2, rarity: 'epic' as const, description: 'A rare scale from a dragon.', type: 'material' },
  { id: '5', name: 'Leather Boots', icon: '👢', quantity: 1, rarity: 'common' as const, description: 'Basic leather boots.', type: 'armor' },
];

const mockEquipmentSlots = [
  { id: 'head', name: 'Head', item: { name: 'Iron Helmet', icon: '🪖', rarity: 'uncommon' as const, durability: 85, maxDurability: 100 } },
  { id: 'neck', name: 'Neck', item: null },
  { id: 'chest', name: 'Chest', item: { name: 'Leather Chest', icon: '🥋', rarity: 'common' as const, durability: 72, maxDurability: 100 } },
  { id: 'mainHand', name: 'Main Hand', item: { name: 'Iron Sword', icon: '⚔️', rarity: 'uncommon' as const, durability: 90, maxDurability: 100 } },
  { id: 'offHand', name: 'Off Hand', item: { name: 'Iron Shield', icon: '🛡️', rarity: 'uncommon' as const, durability: 65, maxDurability: 100 } },
  { id: 'gloves', name: 'Gloves', item: null },
  { id: 'belt', name: 'Belt', item: null },
  { id: 'ring', name: 'Ring', item: null },
  { id: 'legs', name: 'Legs', item: { name: 'Leather Legs', icon: '👖', rarity: 'common' as const, durability: 80, maxDurability: 100 } },
  { id: 'boots', name: 'Boots', item: { name: 'Leather Boots', icon: '👢', rarity: 'common' as const, durability: 95, maxDurability: 100 } },
  { id: 'charm', name: 'Charm', item: null },
];

const mockEquipmentStats = { attack: 45, defence: 32, hp: 120, evasion: 8 };

const mockZones = [
  { id: '1', name: 'Starter Village', icon: '🏘️', difficulty: 1, travelCost: 0, isLocked: false, isCurrent: false, description: 'A peaceful village for beginners.' },
  { id: '2', name: 'Forest Edge', icon: '🌲', difficulty: 2, travelCost: 10, isLocked: false, isCurrent: true, description: 'Light forest with weak creatures.' },
  { id: '3', name: 'Deep Forest', icon: '🌳', difficulty: 3, travelCost: 25, isLocked: false, isCurrent: false, description: 'Dense forest with stronger foes.' },
  { id: '4', name: 'Cave Entrance', icon: '🕳️', difficulty: 4, travelCost: 50, isLocked: false, isCurrent: false, description: 'Dark caves with valuable ores.' },
  { id: '5', name: 'Dragon\'s Lair', icon: '🐉', difficulty: 5, travelCost: 100, isLocked: true, isCurrent: false, description: 'Home of the fearsome dragon.' },
];

const mockMonsters = [
  { id: '1', name: 'Rat', icon: '🐀', level: 1, isDiscovered: true, killCount: 25, stats: { hp: 10, attack: 2, defence: 1 }, drops: [{ name: 'Rat Tail', icon: '🐀', dropRate: 50, rarity: 'common' as const }], zones: ['Starter Village'], description: 'A common pest.' },
  { id: '2', name: 'Wolf', icon: '🐺', level: 5, isDiscovered: true, killCount: 12, stats: { hp: 35, attack: 8, defence: 4 }, drops: [{ name: 'Wolf Pelt', icon: '🐺', dropRate: 30, rarity: 'uncommon' as const }], zones: ['Forest Edge', 'Deep Forest'], description: 'A fierce forest predator.' },
  { id: '3', name: 'Goblin', icon: '👺', level: 8, isDiscovered: true, killCount: 7, stats: { hp: 45, attack: 12, defence: 6 }, drops: [{ name: 'Goblin Dagger', icon: '🗡️', dropRate: 15, rarity: 'rare' as const }], zones: ['Deep Forest', 'Cave Entrance'], description: 'A cunning cave dweller.' },
  { id: '4', name: 'Skeleton', icon: '💀', level: 12, isDiscovered: true, killCount: 3, stats: { hp: 60, attack: 18, defence: 8 }, drops: [{ name: 'Bone Shard', icon: '🦴', dropRate: 40, rarity: 'common' as const }], zones: ['Cave Entrance'], description: 'An undead warrior.' },
  { id: '5', name: 'Dragon', icon: '🐲', level: 50, isDiscovered: false, killCount: 0, stats: { hp: 500, attack: 100, defence: 50 }, drops: [{ name: 'Dragon Scale', icon: '🐲', dropRate: 5, rarity: 'legendary' as const }], zones: ['Dragon\'s Lair'], description: '???' },
];

const mockCraftingRecipes = [
  { id: '1', name: 'Iron Sword', icon: '⚔️', resultQuantity: 1, requiredLevel: 10, turnCost: 50, xpReward: 150, materials: [{ name: 'Iron Ingot', icon: '🪙', required: 3, owned: 5 }, { name: 'Leather Strip', icon: '🎗️', required: 1, owned: 2 }], rarity: 'uncommon' as const },
  { id: '2', name: 'Iron Shield', icon: '🛡️', resultQuantity: 1, requiredLevel: 12, turnCost: 60, xpReward: 180, materials: [{ name: 'Iron Ingot', icon: '🪙', required: 4, owned: 5 }, { name: 'Wood Plank', icon: '🪵', required: 2, owned: 1 }], rarity: 'uncommon' as const },
  { id: '3', name: 'Health Potion', icon: '🧪', resultQuantity: 3, requiredLevel: 5, turnCost: 20, xpReward: 50, materials: [{ name: 'Herbs', icon: '🌿', required: 2, owned: 8 }, { name: 'Water Flask', icon: '💧', required: 1, owned: 3 }], rarity: 'common' as const },
];

const mockGatheringNodes = [
  { id: '1', name: 'Copper Vein', icon: '🟤', levelRequired: 1, baseYield: 5, description: 'Basic copper ore deposits.' },
  { id: '2', name: 'Iron Vein', icon: '⬛', levelRequired: 10, baseYield: 4, description: 'Rich iron ore deposits.' },
  { id: '3', name: 'Gold Vein', icon: '🟡', levelRequired: 25, baseYield: 2, description: 'Rare gold ore deposits.' },
];

*/

type Screen = 'home' | 'explore' | 'inventory' | 'combat' | 'profile' | 'skills' | 'equipment' | 'zones' | 'bestiary' | 'crafting' | 'gathering';

export default function GamePage() {
  const router = useRouter();
  const { player, isLoading, isAuthenticated, logout } = useAuth();
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
  const [pendingEncounters, setPendingEncounters] = useState<Array<{
    encounterId: string;
    zoneId: string;
    zoneName: string;
    mobTemplateId: string;
    mobName: string;
    turnOccurred: number;
    createdAt: string;
    expiresAt: string;
  }>>([]);
  const [lastCombat, setLastCombat] = useState<null | { outcome: string; log: Array<{ round: number; actor: string; message: string }>; rewards: { xp: number; loot: Array<{ itemTemplateId: string; quantity: number }> } }>(null);
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadAll();
      const interval = setInterval(() => void loadTurns(), 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadTurns = async () => {
    const { data } = await getTurns();
    if (data) {
      setTurns(data.currentTurns);
    }
  };

  const loadAll = async () => {
    setActionError(null);

    const [turnRes, skillsRes, zonesRes, invRes, equipRes, recipesRes, pendingRes, nodesRes] = await Promise.all([
      getTurns(),
      getSkills(),
      getZones(),
      getInventory(),
      getEquipment(),
      getCraftingRecipes(),
      getPendingEncounters(),
      getGatheringNodes(),
    ]);

    if (turnRes.data) setTurns(turnRes.data.currentTurns);
    if (skillsRes.data) setSkills(skillsRes.data.skills);
    if (zonesRes.data) {
      setZones(zonesRes.data.zones);
      if (!activeZoneId) {
        const first = zonesRes.data.zones.find(z => z.discovered) ?? zonesRes.data.zones.find(z => z.isStarter) ?? zonesRes.data.zones[0];
        if (first) setActiveZoneId(first.id);
      }
    }
    if (invRes.data) setInventory(invRes.data.items);
    if (equipRes.data) setEquipment(equipRes.data.equipment.map(e => ({ slot: e.slot, itemId: e.itemId, item: e.item ? { id: e.item.id, currentDurability: e.item.currentDurability, maxDurability: e.item.maxDurability, template: e.item.template } : null })));
    if (recipesRes.data) setCraftingRecipes(recipesRes.data.recipes);
    if (nodesRes.data) setGatheringNodes(nodesRes.data.nodes);
    if (pendingRes.data) setPendingEncounters(pendingRes.data.pendingEncounters);
  };

  const loadBestiary = async () => {
    setBestiaryError(null);
    setBestiaryLoading(true);
    try {
      const { data, error } = await getBestiary();
      if (data) setBestiaryMobs(data.mobs);
      else setBestiaryError(error?.message ?? 'Failed to load bestiary');
    } finally {
      setBestiaryLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeScreen === 'bestiary') {
      void loadBestiary();
    }
  }, [isAuthenticated, activeScreen]);

  const loadGatheringNodes = async () => {
    const { data } = await getGatheringNodes(); // Load all player's discovered nodes
    if (data) setGatheringNodes(data.nodes);
  };

  const handleNavigate = (screen: string) => {
    setActiveScreen(screen as Screen);
  };

  const getActiveTab = () => {
    if (['home', 'skills', 'zones', 'bestiary'].includes(activeScreen)) return 'home';
    if (['explore', 'gathering', 'crafting'].includes(activeScreen)) return 'explore';
    if (['inventory', 'equipment'].includes(activeScreen)) return 'inventory';
    if (['combat'].includes(activeScreen)) return 'combat';
    return 'profile';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--rpg-background)] flex items-center justify-center">
        <p className="text-[var(--rpg-text-secondary)]">Loading...</p>
      </div>
    );
  }

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

  const handleStartExploration = async (turnSpend: number) => {
    if (!currentZone) return;
    if (busyAction) return;

    setBusyAction('exploration');
    setActionError(null);
    try {
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
        // Refresh gathering nodes so new discoveries appear immediately
        await loadGatheringNodes();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartCombat = async (pendingEncounterId: string) => {
    if (busyAction) return;

    setBusyAction('combat');
    setActionError(null);
    try {
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
        log: data.combat.log.map((e) => ({ round: e.round, actor: e.actor, message: e.message })),
        rewards: { xp: data.rewards.xp, loot: data.rewards.loot },
      });

      // Level up notification in exploration log
      const skillXp = data.rewards?.skillXp;
      if (skillXp?.leveledUp) {
        const skillName = skillXp.skillType.charAt(0).toUpperCase() + skillXp.skillType.slice(1);
        setExplorationLog((prev) => [
          { timestamp: nowStamp(), type: 'success', message: `🎉 ${skillName} leveled up to ${skillXp.newLevel}!` },
          ...prev,
        ]);
      }

      // Refresh inventory/equipment/skills after loot/durability/XP changes
      await Promise.all([loadAll(), loadTurns()]);
      setPendingEncounters((prev) => prev.filter((p) => p.encounterId !== pendingEncounterId));
    } finally {
      setBusyAction(null);
    }
  };

  const handleMine = async (playerNodeId: string, turnSpend: number) => {
    if (busyAction) return;
    if (!activeZoneId) return;
    setBusyAction('mining');
    setActionError(null);
    try {
      const res = await mine(playerNodeId, turnSpend, activeZoneId);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Mining failed');
        return;
      }

      setTurns(data.turns.currentTurns);

      const newLogs: Array<{ timestamp: string; message: string; type: 'info' | 'success' }> = [];

      // Level up notification first (it's a big deal!)
      if (data.xp?.leveledUp) {
        newLogs.push({
          timestamp: nowStamp(),
          type: 'success',
          message: `🎉 Mining leveled up to ${data.xp.newLevel}!`,
        });
      }

      // Node depletion notification
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
    } finally {
      setBusyAction(null);
    }
  };

  const handleCraft = async (recipeId: string) => {
    if (busyAction) return;
    setBusyAction('crafting');
    setActionError(null);
    try {
      const res = await craft(recipeId, 1);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Crafting failed');
        return;
      }

      setTurns(data.turns.currentTurns);

      const newLogs: Array<{ timestamp: string; message: string; type: 'info' | 'success' }> = [];

      // Level up notification first
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
    } finally {
      setBusyAction(null);
    }
  };

  const handleDestroyItem = async (itemId: string) => {
    if (busyAction) return;
    setBusyAction('destroy');
    setActionError(null);
    try {
      const res = await destroyInventoryItem(itemId);
      if (!res.data) {
        setActionError(res.error?.message ?? 'Destroy failed');
        return;
      }
      await loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  const handleRepairItem = async (itemId: string) => {
    if (busyAction) return;
    setBusyAction('repair');
    setActionError(null);
    try {
      const res = await repairItem(itemId);
      const data = res.data;
      if (!data) {
        setActionError(res.error?.message ?? 'Repair failed');
        return;
      }
      if (data.turns) setTurns(data.turns.currentTurns);
      await loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  const handleEquipItem = async (itemId: string, slot: string) => {
    if (busyAction) return;
    setBusyAction('equip');
    setActionError(null);
    try {
      const res = await equip(itemId, slot);
      if (!res.data) {
        setActionError(res.error?.message ?? 'Equip failed');
        return;
      }
      await loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnequipSlot = async (slot: string) => {
    if (busyAction) return;
    setBusyAction('unequip');
    setActionError(null);
    try {
      const res = await unequip(slot);
      if (!res.data) {
        setActionError(res.error?.message ?? 'Unequip failed');
        return;
      }
      await loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return (
          <Dashboard
            playerData={{
              turns,
              maxTurns: TURN_CONSTANTS.BANK_CAP,
              turnsRegenRate: TURN_CONSTANTS.REGEN_RATE * 60,
              gold: 0,
              currentXP: skills.reduce((sum, s) => sum + (s.xp ?? 0), 0),
              nextLevelXP: 0,
              currentZone: currentZone?.name ?? 'Unknown',
            }}
            skills={skills
              .map((s) => {
                const meta = SKILL_META[s.skillType];
                if (!meta) return null;
                return { name: meta.name, level: s.level, icon: meta.icon, imageSrc: skillIconSrc(s.skillType) };
              })
              .filter(Boolean) as Array<{ name: string; level: number; icon: typeof Sword; imageSrc: string }>}
            onNavigate={handleNavigate}
          />
        );
      case 'explore':
        return (
          <Exploration
            currentZone={{
              name: currentZone?.name ?? 'Unknown',
              description: currentZone?.description ?? 'Select a zone from Map.',
              minLevel: Math.max(1, (currentZone?.difficulty ?? 1) * 5),
            }}
            availableTurns={turns}
            onStartExploration={handleStartExploration}
            activityLog={explorationLog}
          />
        );
      case 'inventory':
        return (
          <Inventory
            items={inventory.map((item) => ({
              id: item.id,
              name: item.template.name,
              imageSrc: itemImageSrc(item.template.name, item.template.itemType),
              quantity: item.quantity,
              rarity: rarityFromTier(item.template.tier),
              description: item.template.itemType,
              type: item.template.itemType,
              slot: item.template.slot,
              equippedSlot: item.equippedSlot,
              durability: (() => {
                const templateMax = item.template.maxDurability ?? 0;
                const max = item.maxDurability ?? templateMax;
                if (!['weapon', 'armor'].includes(item.template.itemType) || max <= 0) return null;
                const cur = item.currentDurability ?? max;
                return { current: cur, max };
              })(),
              baseStats: item.template.baseStats,
              requiredSkill: item.template.requiredSkill ?? null,
              requiredLevel: item.template.requiredLevel ?? 1,
            }))}
            onDrop={handleDestroyItem}
            onRepair={handleRepairItem}
            onEquip={handleEquipItem}
            onUnequip={handleUnequipSlot}
          />
        );
      case 'equipment':
        return (
          <Equipment
            slots={equipment.map((e) => {
              const label = e.slot.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
              const template = e.item?.template;
              const templateMax = template?.maxDurability ?? 0;
              const max = template ? (e.item?.maxDurability ?? templateMax) : 0;
              const cur = template ? (e.item?.currentDurability ?? max) : 0;
              return {
                id: e.slot,
                name: label,
                item: template
                  ? {
                      id: e.item!.id,
                      name: template.name,
                      imageSrc: itemImageSrc(template.name, template.itemType),
                      rarity: rarityFromTier(template.tier),
                      durability: cur,
                      maxDurability: max,
                      baseStats: template.baseStats,
                    }
                  : null,
              };
            })}
            inventoryItems={inventory
              .filter((item) => Boolean(item.template.slot) && ['weapon', 'armor'].includes(item.template.itemType) && item.quantity === 1)
              .map((item) => {
                const templateMax = item.template.maxDurability ?? 0;
                const max = item.maxDurability ?? templateMax;
                const durability =
                  max > 0 ? { current: item.currentDurability ?? max, max } : null;
                return {
                  id: item.id,
                  name: item.template.name,
                  imageSrc: itemImageSrc(item.template.name, item.template.itemType),
                  rarity: rarityFromTier(item.template.tier),
                  slot: item.template.slot as string,
                  equippedSlot: item.equippedSlot,
                  durability,
                  baseStats: item.template.baseStats,
                };
              })}
            onEquip={handleEquipItem}
            onUnequip={handleUnequipSlot}
            stats={(() => {
              let attack = 0;
              let defence = 0;
              let hp = 0;
              let evasion = 0;
              for (const e of equipment) {
                const base = e.item?.template?.baseStats as Record<string, unknown> | undefined;
                if (!base) continue;
                if (typeof base.attack === 'number') attack += base.attack;
                if (typeof base.armor === 'number') defence += base.armor;
                if (typeof base.health === 'number') hp += base.health;
                if (typeof base.evasion === 'number') evasion += base.evasion;
              }
              return { attack, defence, hp, evasion };
            })()}
          />
        );
      case 'skills':
        return (
          <Skills
            skills={skills
              .map((s) => {
                const meta = SKILL_META[s.skillType];
                if (!meta) return null;
                return {
                  id: s.skillType,
                  name: meta.name,
                  icon: meta.icon,
                  imageSrc: skillIconSrc(s.skillType),
                  level: s.level,
                  currentXP: s.xp,
                  nextLevelXP: xpForLevel(s.level + 1),
                  efficiency: Math.round(calculateEfficiency(s.dailyXpGained, s.skillType) * 100),
                  color: meta.color,
                };
              })
              .filter(Boolean) as any}
          />
        );
      case 'zones':
        return (
          <ZoneMap
            zones={zones.map((z) => ({
              id: z.id,
              name: z.name,
              description: z.description ?? '',
              difficulty: z.difficulty,
              travelCost: z.travelCost,
              isLocked: !z.discovered || z.name === '???',
              isCurrent: z.id === activeZoneId,
              imageSrc: z.discovered && z.name !== '???' ? zoneImageSrc(z.name) : undefined,
            }))}
            onTravel={async (id) => {
              const leavingZoneId = activeZoneId;
              const leavingCount = leavingZoneId
                ? pendingEncounters.filter((p) => p.zoneId === leavingZoneId).length
                : 0;

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
            }}
          />
        );
      case 'bestiary':
        if (bestiaryLoading) {
          return <div className="text-[var(--rpg-text-secondary)]">Loading bestiary...</div>;
        }
        if (bestiaryError) {
          return (
            <div className="p-3 rounded bg-[var(--rpg-background)] border border-[var(--rpg-red)] text-[var(--rpg-red)]">
              {bestiaryError}
            </div>
          );
        }
        return (
          <Bestiary
            monsters={bestiaryMobs.map((m) => ({
              id: m.id,
              name: m.name,
              imageSrc: m.isDiscovered ? monsterImageSrc(m.name) : undefined,
              level: m.level,
              isDiscovered: m.isDiscovered,
              killCount: m.killCount,
              stats: m.stats,
              zones: m.zones,
              description: m.description,
              drops: m.drops.map((d) => ({
                name: d.item.name,
                imageSrc: itemImageSrc(d.item.name, d.item.itemType),
                dropRate: d.dropRate,
                rarity: d.rarity,
              })),
            }))}
          />
        );
      case 'crafting':
        return (
          <Crafting
            skillName="Weaponsmithing"
            skillLevel={skills.find((s) => s.skillType === 'weaponsmithing')?.level ?? 1}
            recipes={craftingRecipes.map((r) => ({
              id: r.id,
              name: r.resultTemplate.name,
              imageSrc: itemImageSrc(r.resultTemplate.name, r.resultTemplate.itemType),
              resultQuantity: 1,
              requiredLevel: r.requiredLevel,
              turnCost: r.turnCost,
              xpReward: r.xpReward,
              materials: r.materials.map((m) => {
                const meta = r.materialTemplates.find((t) => t.id === m.templateId);
                const owned = ownedByTemplateId.get(m.templateId) ?? 0;
                return {
                  name: meta?.name ?? 'Unknown',
                  icon: '❓',
                  imageSrc: meta ? itemImageSrc(meta.name, meta.itemType) : undefined,
                  required: m.quantity,
                  owned,
                };
              }),
              rarity: rarityFromTier(r.resultTemplate.tier),
            }))}
            onCraft={handleCraft}
          />
        );
      case 'gathering':
        return (
          <Gathering
            skillName="Mining"
            skillLevel={skills.find((s) => s.skillType === 'mining')?.level ?? 1}
            efficiency={Math.round(calculateEfficiency(skills.find((s) => s.skillType === 'mining')?.dailyXpGained ?? 0, 'mining') * 100)}
            nodes={gatheringNodes.map((n) => ({
              id: n.id,
              name: n.resourceType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              imageSrc: resourceImageSrc(n.resourceType),
              levelRequired: n.levelRequired,
              baseYield: n.baseYield,
              zoneId: n.zoneId,
              zoneName: n.zoneName,
              remainingCapacity: n.remainingCapacity,
              maxCapacity: n.maxCapacity,
              sizeName: n.sizeName,
            }))}
            currentZoneId={activeZoneId}
            availableTurns={turns}
            gatheringLog={gatheringLog}
            onStartGathering={handleMine}
          />
        );
      case 'combat':
        return (
          <div className="space-y-4">
            {pendingEncounters.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Pending Encounters</h2>
                {pendingEncounters.map((e) => (
                  <div key={e.encounterId} className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[var(--rpg-text-primary)] font-semibold">{e.mobName}</div>
                      <div className="text-xs text-[var(--rpg-text-secondary)]">
                        Zone: {e.zoneName} • Found {Math.max(0, Math.ceil((Date.now() - new Date(e.createdAt).getTime()) / 60000))}m ago • Expires in {Math.max(0, Math.ceil((new Date(e.expiresAt).getTime() - Date.now()) / 60000))}m
                      </div>
                    </div>
                    <button
                      onClick={() => void handleStartCombat(e.encounterId)}
                      disabled={busyAction === 'combat'}
                      className="px-3 py-2 rounded bg-[var(--rpg-gold)] text-[var(--rpg-background)] font-semibold"
                    >
                      Fight
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--rpg-text-secondary)]">No pending encounters. Explore to find mobs.</p>
              </div>
            )}

            {lastCombat && (
              <div className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[var(--rpg-text-primary)] font-semibold">Last Combat</div>
                  <div className="text-xs text-[var(--rpg-text-secondary)]">{lastCombat.outcome}</div>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto text-sm">
                  {lastCombat.log.map((l, idx) => (
                    <div key={idx} className="text-[var(--rpg-text-secondary)]">
                      <span className="text-[var(--rpg-gold)] font-mono mr-2">R{l.round}</span>
                      {l.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Profile</h2>
            <p className="text-[var(--rpg-text-secondary)]">Username: {player?.username}</p>
            <button
              onClick={() => { logout(); router.push('/'); }}
              className="px-4 py-2 bg-[var(--rpg-red)] rounded text-white"
            >
              Logout
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <AppShell turns={turns} username={player?.username}>
        {/* Sub-navigation for screens */}
        {getActiveTab() === 'home' && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'home', label: 'Dashboard' },
              { id: 'skills', label: 'Skills' },
              { id: 'zones', label: 'Map' },
              { id: 'bestiary', label: 'Bestiary' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id as Screen)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeScreen === tab.id
                    ? 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
                    : 'bg-[var(--rpg-surface)] text-[var(--rpg-text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {getActiveTab() === 'explore' && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'explore', label: 'Explore' },
              { id: 'gathering', label: 'Gathering' },
              { id: 'crafting', label: 'Crafting' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id as Screen)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeScreen === tab.id
                    ? 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
                    : 'bg-[var(--rpg-surface)] text-[var(--rpg-text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {getActiveTab() === 'inventory' && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'inventory', label: 'Items' },
              { id: 'equipment', label: 'Equipment' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id as Screen)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeScreen === tab.id
                    ? 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
                    : 'bg-[var(--rpg-surface)] text-[var(--rpg-text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {actionError && (
          <div className="mb-4 p-3 rounded bg-[var(--rpg-background)] border border-[var(--rpg-red)] text-[var(--rpg-red)]">
            {actionError}
          </div>
        )}

        {renderScreen()}
      </AppShell>
      <BottomNav activeTab={getActiveTab()} onNavigate={handleNavigate} />
    </>
  );
}
