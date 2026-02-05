export interface MobTemplate {
  id: string;
  name: string;
  zoneId: string;
  hp: number;
  attack: number;
  defence: number;
  evasion: number;
  damageMin: number;
  damageMax: number;
  xpReward: number;
  encounterWeight: number;
  spellPattern: SpellAction[];
}

export interface SpellAction {
  round: number;
  action: string;
  damage?: number;
  effect?: string;
}

export interface CombatState {
  playerHp: number;
  playerMaxHp: number;
  mobHp: number;
  mobMaxHp: number;
  round: number;
  log: CombatLogEntry[];
  outcome: CombatOutcome | null;
}

export interface CombatLogEntry {
  round: number;
  actor: 'player' | 'mob';
  action: CombatAction;
  roll?: number;
  damage?: number;
  blocked?: number;
  evaded?: boolean;
  message: string;
}

export type CombatAction = 'attack' | 'spell' | 'defend' | 'flee';

export type CombatOutcome = 'victory' | 'defeat' | 'fled';

export interface CombatResult {
  outcome: CombatOutcome;
  log: CombatLogEntry[];
  xpGained: number;
  loot: LootDrop[];
  durabilityLost: DurabilityLoss[];
  turnsSpent: number;
  playerHpRemaining: number;
}

export interface LootDrop {
  itemTemplateId: string;
  quantity: number;
}

export interface DurabilityLoss {
  itemId: string;
  amount: number;
}

export interface CombatantStats {
  hp: number;
  maxHp: number;
  attack: number;
  defence: number;
  evasion: number;
  damageMin: number;
  damageMax: number;
  speed: number;
}
