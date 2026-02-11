function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return 'http://localhost:4000';
  }

  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(configured);
      const isConfiguredLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      const isRemoteClient = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isConfiguredLoopback && isRemoteClient) {
        const protocol = parsed.protocol || window.location.protocol;
        const port = parsed.port || '4000';
        return `${protocol}//${window.location.hostname}:${port}`;
      }
    } catch {
      // fall through to configured value
    }
  }

  return configured;
}

const API_URL = resolveApiUrl();

interface ApiResponse<T> {
  data?: T;
  error?: { message: string; code: string };
}

type RefreshOutcome =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; reason: 'missing' | 'invalid' | 'network' | 'bad_response' };

let refreshInFlight: Promise<RefreshOutcome> | null = null;

function clearStoredTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function getJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as { exp?: number };

    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

async function refreshTokens(): Promise<RefreshOutcome> {
  if (typeof window === 'undefined') return { ok: false, reason: 'missing' };

  const currentRefreshToken = localStorage.getItem('refreshToken');
  if (!currentRefreshToken) return { ok: false, reason: 'missing' };

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        const json = (await res.json().catch(() => null)) as
          | { accessToken?: string; refreshToken?: string; error?: { message: string; code: string } }
          | null;

        if (!res.ok) {
          const code = json?.error?.code;
          const isInvalid = code === 'INVALID_TOKEN' || code === 'MISSING_TOKEN';
          return { ok: false, reason: isInvalid ? 'invalid' : 'network' } as const;
        }
        if (!json?.accessToken || !json.refreshToken) return { ok: false, reason: 'bad_response' };

        localStorage.setItem('accessToken', json.accessToken);
        localStorage.setItem('refreshToken', json.refreshToken);
        return { ok: true, accessToken: json.accessToken, refreshToken: json.refreshToken } as const;
      } catch {
        return { ok: false, reason: 'network' } as const;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  attempt = 0
): Promise<ApiResponse<T>> {
  const isAuthEndpoint = endpoint.startsWith('/api/v1/auth/');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!isAuthEndpoint && token) {
      const expMs = getJwtExpMs(token);
      const shouldRefreshSoon = typeof expMs === 'number' && expMs - Date.now() < 60_000;
      if (shouldRefreshSoon) {
        await refreshTokens();
      }
    }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const latestToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : token;
  if (latestToken) {
    headers['Authorization'] = `Bearer ${latestToken}`;
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: options.credentials ?? 'include',
    });

    const json = (await res.json().catch(() => null)) as
      | (T & { error?: { message: string; code: string } })
      | { error?: { message: string; code: string } }
      | null;

    if (!res.ok) {
      if (!isAuthEndpoint && res.status === 401 && attempt === 0) {
        const refreshed = await refreshTokens();
        if (refreshed?.ok) {
          return fetchApi<T>(endpoint, options, attempt + 1);
        }
        if (refreshed?.reason === 'invalid') clearStoredTokens();
      }

      const error = (json && 'error' in json ? json.error : undefined) || {
        message: 'Unknown error',
        code: 'UNKNOWN',
      };
      return { error };
    }

    if (!json) return { error: { message: 'Invalid server response', code: 'INVALID_RESPONSE' } };
    return { data: json as T };
  } catch (err) {
    return { error: { message: 'Network error', code: 'NETWORK_ERROR' } };
  }
}

// Auth
export async function register(username: string, email: string, password: string) {
  return fetchApi<{
    player: { id: string; username: string; email: string };
    accessToken: string;
    refreshToken: string;
  }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(email: string, password: string) {
  return fetchApi<{
    player: { id: string; username: string; email: string };
    accessToken: string;
    refreshToken: string;
  }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshToken(token: string) {
  return fetchApi<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: token }),
  });
}

// Player
export async function getPlayer() {
  return fetchApi<{
    player: {
      id: string;
      username: string;
      email: string;
      createdAt: string;
      characterXp: number;
      characterLevel: number;
      attributePoints: number;
      attributes: {
        vitality: number;
        strength: number;
        dexterity: number;
        intelligence: number;
        luck: number;
        evasion: number;
      };
    };
  }>('/api/v1/player');
}

export async function getPlayerAttributes() {
  return fetchApi<{
    characterXp: number;
    characterLevel: number;
    attributePoints: number;
    attributes: {
      vitality: number;
      strength: number;
      dexterity: number;
      intelligence: number;
      luck: number;
      evasion: number;
    };
  }>('/api/v1/player/attributes');
}

export async function allocatePlayerAttribute(
  attribute: 'vitality' | 'strength' | 'dexterity' | 'intelligence' | 'luck' | 'evasion',
  points: number = 1
) {
  return fetchApi<{
    characterXp: number;
    characterLevel: number;
    attributePoints: number;
    attributes: {
      vitality: number;
      strength: number;
      dexterity: number;
      intelligence: number;
      luck: number;
      evasion: number;
    };
  }>('/api/v1/player/attributes', {
    method: 'POST',
    body: JSON.stringify({ attribute, points }),
  });
}

export async function getSkills() {
  return fetchApi<{
    skills: Array<{
      skillType: string;
      level: number;
      xp: number;
      dailyXpGained: number;
    }>;
  }>('/api/v1/player/skills');
}

export async function getEquipment() {
  return fetchApi<{
    equipment: Array<{
      playerId: string;
      slot: string;
      itemId: string | null;
      item: null | {
        id: string;
        templateId: string;
        ownerId: string;
        rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
        currentDurability: number | null;
        maxDurability: number | null;
        quantity: number;
        bonusStats: Record<string, number> | null;
        createdAt: string;
        template: {
          id: string;
          name: string;
          itemType: string;
          weightClass: 'heavy' | 'medium' | 'light' | null;
          slot: string | null;
          tier: number;
          baseStats: Record<string, unknown>;
          requiredSkill: string | null;
          requiredLevel: number;
          maxDurability: number;
          stackable: boolean;
        };
      };
    }>;
  }>('/api/v1/player/equipment');
}

export async function getBestiary() {
  return fetchApi<{
    mobs: Array<{
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
      prefixEncounters: Array<{
        prefix: string;
        displayName: string;
        kills: number;
      }>;
    }>;
  }>('/api/v1/bestiary');
}

// Turns
export async function getTurns() {
  return fetchApi<{
    currentTurns: number;
    timeToCapMs: number | null;
    lastRegenAt: string;
  }>('/api/v1/turns');
}

export async function spendTurns(amount: number, reason?: string) {
  return fetchApi<{
    previousTurns: number;
    spent: number;
    currentTurns: number;
  }>('/api/v1/turns/spend', {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}

// HP & Rest
export async function getHpState() {
  return fetchApi<{
    currentHp: number;
    maxHp: number;
    regenPerSecond: number;
    lastHpRegenAt: string;
    isRecovering: boolean;
    recoveryCost: number | null;
  }>('/api/v1/hp');
}

export async function restEstimate(turns: number) {
  return fetchApi<{
    isRecovering: boolean;
    recoveryCost?: number;
    recoveryExitHp?: number;
    currentHp?: number;
    maxHp?: number;
    healPerTurn?: number;
    turnsRequested?: number;
    turnsNeeded?: number;
    healAmount?: number;
    resultingHp?: number;
  }>(`/api/v1/hp/rest/estimate?turns=${turns}`);
}

export async function rest(turns: number) {
  return fetchApi<{
    previousHp: number;
    healedAmount: number;
    currentHp: number;
    maxHp: number;
    turnsSpent: number;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
  }>('/api/v1/hp/rest', {
    method: 'POST',
    body: JSON.stringify({ turns }),
  });
}

export async function recoverFromKnockout() {
  return fetchApi<{
    previousState: 'recovering';
    currentHp: number;
    maxHp: number;
    turnsSpent: number;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
  }>('/api/v1/hp/recover', {
    method: 'POST',
  });
}

// Zones
export async function getZones() {
  return fetchApi<{
    zones: Array<{
      id: string;
      name: string;
      description: string | null;
      difficulty: number;
      travelCost: number;
      isStarter: boolean;
      discovered: boolean;
    }>;
  }>('/api/v1/zones');
}

// Exploration
export async function estimateExploration(turns: number) {
  return fetchApi<{
    estimate: {
      turns: number;
      ambushChance: number;
      encounterSiteChance: number;
      resourceNodeChance: number;
      hiddenCacheChance: number;
      expectedAmbushes: number;
      expectedEncounterSites: number;
    };
  }>(`/api/v1/exploration/estimate?turns=${turns}`);
}

export async function startExploration(zoneId: string, turns: number) {
  return fetchApi<{
    logId: string;
    zone: { id: string; name: string; difficulty: number };
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    aborted: boolean;
    refundedTurns: number;
    events: Array<{
      turn: number;
      type: string;
      description: string;
      details?: Record<string, unknown>;
    }>;
    encounterSites: Array<{
      turnOccurred: number;
      encounterSiteId: string;
      mobFamilyId: string;
      siteName: string;
      size: 'small' | 'medium' | 'large';
      totalMobs: number;
      discoveredAt: string;
    }>;
    resourceDiscoveries: Array<{
      turnOccurred: number;
      playerNodeId: string;
      resourceNodeId: string;
      resourceType: string;
      capacity: number;
      sizeName: string;
    }>;
    hiddenCaches: Array<{ turnOccurred: number }>;
    zoneExitDiscovered: boolean;
  }>('/api/v1/exploration/start', {
    method: 'POST',
    body: JSON.stringify({ zoneId, turns }),
  });
}

// Combat

export interface CombatLogEntryResponse {
  round: number;
  actor: 'player' | 'mob';
  action: string;
  message: string;
  roll?: number;
  damage?: number;
  evaded?: boolean;
  attackModifier?: number;
  accuracyModifier?: number;
  targetDodge?: number;
  targetEvasion?: number;
  targetDefence?: number;
  targetMagicDefence?: number;
  rawDamage?: number;
  armorReduction?: number;
  magicDefenceReduction?: number;
  isCritical?: boolean;
  critMultiplier?: number;
  playerHpAfter?: number;
  mobHpAfter?: number;
}

export interface SkillXpGrantResponse {
  skillType: string;
  xpGained: number;
  xpAfterEfficiency: number;
  efficiency: number;
  leveledUp: boolean;
  newLevel: number;
  atDailyCap: boolean;
  newTotalXp: number;
  newDailyXpGained: number;
  characterXpGain: number;
  characterXpAfter: number;
  characterLevelBefore: number;
  characterLevelAfter: number;
  attributePointsAfter: number;
  characterLeveledUp: boolean;
}

export type CombatOutcomeResponse = 'victory' | 'defeat' | 'fled';

export interface CombatResultResponse {
  zoneId: string;
  zoneName: string;
  mobTemplateId: string;
  mobName: string;
  mobPrefix: string | null;
  mobDisplayName: string;
  encounterSiteId: string | null;
  encounterSiteCleared?: boolean;
  attackSkill: 'melee' | 'ranged' | 'magic';
  outcome: CombatOutcomeResponse;
  playerMaxHp: number;
  mobMaxHp: number;
  log: CombatLogEntryResponse[];
  rewards: {
    xp: number;
    loot: Array<{
      itemTemplateId: string;
      quantity: number;
      rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      itemName?: string | null;
    }>;
    siteCompletion?: {
      chestRarity: 'common' | 'uncommon' | 'rare';
      materialRolls: number;
      loot: Array<{
        itemTemplateId: string;
        quantity: number;
        rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
        itemName?: string | null;
      }>;
      recipeUnlocked: {
        recipeId: string;
        resultTemplateId: string;
        recipeName: string;
        soulbound: boolean;
      } | null;
    } | null;
    durabilityLost: Array<{ itemId: string; amount: number }>;
    skillXp: SkillXpGrantResponse | null;
  };
}

export interface CombatResponse {
  logId: string;
  turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
  combat: {
    zoneId: string;
    mobTemplateId: string;
    mobPrefix: string | null;
    mobDisplayName: string;
    encounterSiteId: string | null;
    encounterSiteCleared?: boolean;
    outcome: CombatOutcomeResponse;
    playerMaxHp: number;
    mobMaxHp: number;
    log: CombatLogEntryResponse[];
  };
  rewards: {
    xp: number;
    loot: Array<{
      itemTemplateId: string;
      quantity: number;
      rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      itemName?: string | null;
    }>;
    siteCompletion?: {
      chestRarity: 'common' | 'uncommon' | 'rare';
      materialRolls: number;
      loot: Array<{
        itemTemplateId: string;
        quantity: number;
        rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
        itemName?: string | null;
      }>;
      recipeUnlocked: {
        recipeId: string;
        resultTemplateId: string;
        recipeName: string;
        soulbound: boolean;
      } | null;
    } | null;
    durabilityLost: Array<{ itemId: string; amount: number }>;
    skillXp: SkillXpGrantResponse | null;
  };
}

export interface CombatHistoryListItemResponse {
  logId: string;
  createdAt: string;
  zoneId: string | null;
  zoneName: string | null;
  mobTemplateId: string | null;
  mobName: string | null;
  mobDisplayName: string | null;
  outcome: string | null;
  roundCount: number;
  xpGained: number;
}

export interface CombatHistoryResponse {
  logs: CombatHistoryListItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {
    zones: Array<{ id: string; name: string }>;
    mobs: Array<{ id: string; name: string }>;
  };
}

export interface CombatHistoryQuery {
  page?: number;
  pageSize?: number;
  outcome?: CombatOutcomeResponse;
  zoneId?: string;
  mobTemplateId?: string;
  sort?: 'recent' | 'xp';
  search?: string;
}

export async function startCombat(zoneId: string, attackSkill: 'melee' | 'ranged' | 'magic' = 'melee', mobTemplateId?: string) {
  return fetchApi<CombatResponse>('/api/v1/combat/start', {
    method: 'POST',
    body: JSON.stringify({ zoneId, attackSkill, ...(mobTemplateId ? { mobTemplateId } : {}) }),
  });
}

export async function startCombatFromEncounterSite(encounterSiteId: string, attackSkill: 'melee' | 'ranged' | 'magic' = 'melee') {
  return fetchApi<CombatResponse>('/api/v1/combat/start', {
    method: 'POST',
    body: JSON.stringify({ encounterSiteId, attackSkill }),
  });
}

export interface EncounterSitesQuery {
  page?: number;
  pageSize?: number;
  zoneId?: string;
  mobFamilyId?: string;
  sort?: 'recent' | 'danger';
}

export interface EncounterSitesResponse {
  encounterSites: Array<{
    encounterSiteId: string;
    zoneId: string;
    zoneName: string;
    mobFamilyId: string;
    mobFamilyName: string;
    siteName: string;
    size: string;
    totalMobs: number;
    aliveMobs: number;
    defeatedMobs: number;
    decayedMobs: number;
    nextMobTemplateId: string | null;
    nextMobName: string | null;
    nextMobPrefix: string | null;
    nextMobDisplayName: string | null;
    discoveredAt: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {
    zones: Array<{ id: string; name: string }>;
    mobFamilies: Array<{ id: string; name: string }>;
  };
}

export async function getEncounterSites(query: EncounterSitesQuery = {}) {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  if (query.zoneId) params.set('zoneId', query.zoneId);
  if (query.mobFamilyId) params.set('mobFamilyId', query.mobFamilyId);
  if (query.sort) params.set('sort', query.sort);

  const suffix = params.toString();
  return fetchApi<EncounterSitesResponse>(`/api/v1/combat/sites${suffix ? `?${suffix}` : ''}`);
}

export async function abandonEncounterSites(zoneId?: string) {
  return fetchApi<{ success: boolean; abandoned: number }>('/api/v1/combat/sites/abandon', {
    method: 'POST',
    body: JSON.stringify(zoneId ? { zoneId } : {}),
  });
}

export async function getCombatLog(id: string) {
  return fetchApi<{ logId: string; createdAt: string; combat: CombatResultResponse }>(`/api/v1/combat/logs/${id}`);
}

export async function getCombatLogs(query: CombatHistoryQuery = {}) {
  const params = new URLSearchParams();

  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  if (query.outcome) params.set('outcome', query.outcome);
  if (query.zoneId) params.set('zoneId', query.zoneId);
  if (query.mobTemplateId) params.set('mobTemplateId', query.mobTemplateId);
  if (query.sort) params.set('sort', query.sort);
  if (query.search) params.set('search', query.search);

  const suffix = params.toString();
  return fetchApi<CombatHistoryResponse>(`/api/v1/combat/logs${suffix ? `?${suffix}` : ''}`);
}

// Inventory & Equipment
export async function getInventory() {
  return fetchApi<{
    items: Array<{
      id: string;
      templateId: string;
      ownerId: string;
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      currentDurability: number | null;
      maxDurability: number | null;
      quantity: number;
      bonusStats: Record<string, number> | null;
      createdAt: string;
        template: {
          id: string;
          name: string;
          itemType: string;
          weightClass: 'heavy' | 'medium' | 'light' | null;
          slot: string | null;
          tier: number;
          baseStats: Record<string, unknown>;
        requiredSkill: string | null;
        requiredLevel: number;
        maxDurability: number;
        stackable: boolean;
      };
      equippedSlot: string | null;
    }>;
  }>('/api/v1/inventory');
}

export async function destroyInventoryItem(id: string, quantity?: number) {
  const q = quantity ? `?quantity=${quantity}` : '';
  return fetchApi<{ destroyed: boolean; itemId: string; remainingQuantity?: number }>(`/api/v1/inventory/${id}${q}`, {
    method: 'DELETE',
  });
}

export async function repairItem(itemId: string) {
  return fetchApi<{
    repaired: boolean;
    turns?: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    itemId: string;
    currentDurability: number | null;
    maxDurability: number | null;
    maxDurabilityDecay?: number;
  }>('/api/v1/inventory/repair', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export async function equip(itemId: string, slot: string) {
  return fetchApi<{ success: true }>('/api/v1/equipment/equip', {
    method: 'POST',
    body: JSON.stringify({ itemId, slot }),
  });
}

export async function unequip(slot: string) {
  return fetchApi<{ success: true }>('/api/v1/equipment/unequip', {
    method: 'POST',
    body: JSON.stringify({ slot }),
  });
}

// Gathering & Crafting
export async function mine(playerNodeId: string, turns: number, currentZoneId: string) {
  return fetchApi<{
    logId: string;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    node: {
      id: string;
      templateId: string;
      zoneId: string;
      zoneName: string;
      resourceType: string;
      levelRequired: number;
      remainingCapacity: number;
      nodeDepleted: boolean;
    };
    results: { actions: number; baseYield: number; yieldMultiplier: number; totalYield: number; itemTemplateId: string; itemId: string };
    xp: {
      skillType: string;
      xpAfterEfficiency: number;
      efficiency: number;
      leveledUp: boolean;
      newLevel: number;
      atDailyCap: boolean;
      newTotalXp: number;
      newDailyXpGained: number;
      characterXpGain: number;
      characterXpAfter: number;
      characterLevelBefore: number;
      characterLevelAfter: number;
      attributePointsAfter: number;
      characterLeveledUp: boolean;
    };
  }>('/api/v1/gathering/mine', {
    method: 'POST',
    body: JSON.stringify({ playerNodeId, turns, currentZoneId }),
  });
}

export async function getCraftingRecipes() {
  return fetchApi<{
    recipes: Array<{
      id: string;
      skillType: string;
      requiredLevel: number;
      isAdvanced: boolean;
      soulbound: boolean;
      mobFamilyId: string | null;
      resultTemplate: {
        id: string;
        name: string;
        itemType: string;
        weightClass: 'heavy' | 'medium' | 'light' | null;
        setId: string | null;
        slot: string | null;
        tier: number;
        baseStats: Record<string, unknown>;
        requiredSkill: string | null;
        requiredLevel: number;
        maxDurability: number;
        stackable: boolean;
      };
      turnCost: number;
      materials: Array<{ templateId: string; quantity: number }>;
      materialTemplates: Array<{ id: string; name: string; itemType: string; stackable: boolean }>;
      xpReward: number;
    }>;
  }>('/api/v1/crafting/recipes');
}

export async function craft(recipeId: string, quantity: number = 1) {
  return fetchApi<{
    logId: string;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    crafted: { recipeId: string; resultTemplateId: string; quantity: number; craftedItemIds: string[] };
    craftedItemDetails: Array<{
      id: string;
      isCrit: boolean;
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      bonusStat?: string;
      bonusValue?: number;
    }>;
    xp: {
      skillType: string;
      xpAfterEfficiency: number;
      efficiency: number;
      leveledUp: boolean;
      newLevel: number;
      atDailyCap: boolean;
      newTotalXp: number;
      newDailyXpGained: number;
      characterXpGain: number;
      characterXpAfter: number;
      characterLevelBefore: number;
      characterLevelAfter: number;
      attributePointsAfter: number;
      characterLeveledUp: boolean;
    };
  }>('/api/v1/crafting/craft', {
    method: 'POST',
    body: JSON.stringify({ recipeId, quantity }),
  });
}

export async function salvage(itemId: string) {
  return fetchApi<{
    logId: string;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    salvage: {
      salvagedItemId: string;
      salvagedTemplateId: string;
      returnedMaterials: Array<{ templateId: string; name: string; quantity: number }>;
    };
  }>('/api/v1/crafting/salvage', {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export async function forgeUpgrade(itemId: string, sacrificialItemId: string) {
  return fetchApi<{
    logId: string;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    forge: {
      action: 'upgrade';
      success: boolean;
      destroyed: boolean;
      itemId: string;
      fromRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      toRarity: 'uncommon' | 'rare' | 'epic' | 'legendary';
      successChance: number;
      roll: number;
      sacrificialItemId: string;
      bonusStats?: Record<string, number> | null;
    };
  }>('/api/v1/crafting/forge/upgrade', {
    method: 'POST',
    body: JSON.stringify({ itemId, sacrificialItemId }),
  });
}

export async function forgeReroll(itemId: string, sacrificialItemId: string) {
  return fetchApi<{
    logId: string;
    turns: { currentTurns: number; timeToCapMs: number | null; lastRegenAt: string };
    forge: {
      action: 'reroll';
      success: true;
      itemId: string;
      rarity: 'uncommon' | 'rare' | 'epic' | 'legendary';
      sacrificialItemId: string;
      bonusStats: Record<string, number> | null;
    };
  }>('/api/v1/crafting/forge/reroll', {
    method: 'POST',
    body: JSON.stringify({ itemId, sacrificialItemId }),
  });
}

export interface GatheringNodesQuery {
  page?: number;
  pageSize?: number;
  zoneId?: string;
  resourceType?: string;
  skillRequired?: 'mining' | 'foraging' | 'woodcutting';
}

export interface GatheringNodesResponse {
  nodes: Array<{
    id: string;
    templateId: string;
    zoneId: string;
    zoneName: string;
    resourceType: string;
    resourceTypeCategory: string;
    skillRequired: string;
    levelRequired: number;
    baseYield: number;
    remainingCapacity: number;
    maxCapacity: number;
    sizeName: string;
    discoveredAt: string;
    weathered: boolean;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {
    zones: Array<{ id: string; name: string }>;
    resourceTypes: string[];
  };
}

export async function getGatheringNodes(query: GatheringNodesQuery = {}) {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  if (query.zoneId) params.set('zoneId', query.zoneId);
  if (query.resourceType) params.set('resourceType', query.resourceType);
  if (query.skillRequired) params.set('skillRequired', query.skillRequired);

  const suffix = params.toString();
  return fetchApi<GatheringNodesResponse>(`/api/v1/gathering/nodes${suffix ? `?${suffix}` : ''}`);
}
