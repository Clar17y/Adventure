export interface ShareCombatLogEntry {
  round: number;
  actor: 'player' | 'mob';
  roll?: number;
  damage?: number;
  evaded?: boolean;
  playerHpAfter?: number;
  mobHpAfter?: number;
}

export interface ShareCombatRewards {
  xp: number;
  skillXp?: {
    skillType: string;
    xpAfterEfficiency: number;
  } | null;
  secondarySkillXp?: {
    defence?: { events: number; xpGained: number };
    evasion?: { events: number; xpGained: number };
  };
  loot: Array<{ itemTemplateId: string; quantity: number; itemName?: string | null }>;
}

export interface CombatShareInput {
  outcome: string;
  log: ShareCombatLogEntry[];
  rewards: ShareCombatRewards;
  playerMaxHp?: number;
  mobMaxHp?: number;
  mobName?: string;
  zoneName?: string;
  createdAt?: string;
}

function hpWithMax(current: number | undefined, max: number | undefined): string {
  if (current === undefined) return '-';
  if (max === undefined) return `${current}`;
  return `${current}/${max}`;
}

export function resolvePlayerMaxHp(log: ShareCombatLogEntry[], explicit?: number): number | undefined {
  if (typeof explicit === 'number' && explicit > 0) return explicit;
  const values = log.map((entry) => entry.playerHpAfter).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

export function resolveMobMaxHp(log: ShareCombatLogEntry[], explicit?: number): number | undefined {
  if (typeof explicit === 'number' && explicit > 0) return explicit;
  const values = log.map((entry) => entry.mobHpAfter).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

export function formatCombatShareText(input: CombatShareInput): string {
  const playerMaxHp = resolvePlayerMaxHp(input.log, input.playerMaxHp);
  const mobMaxHp = resolveMobMaxHp(input.log, input.mobMaxHp);

  const lines: string[] = [];
  lines.push('Adventure Combat Log');
  lines.push(`Outcome: ${input.outcome}`);
  if (input.mobName) lines.push(`Mob: ${input.mobName}`);
  if (input.zoneName) lines.push(`Zone: ${input.zoneName}`);
  if (input.createdAt) lines.push(`Time: ${input.createdAt}`);
  lines.push('');
  lines.push('Rounds');

  for (const entry of input.log) {
    const actor = entry.actor === 'player' ? 'You' : 'Mob';
    const dmg = entry.damage !== undefined ? ` ${entry.damage} dmg` : '';
    const status = entry.evaded ? ' Dodged' : (entry.roll !== undefined && entry.damage === undefined ? ' Miss' : '');
    lines.push(
      `R${entry.round} ${actor}${dmg}${status} | You ${hpWithMax(entry.playerHpAfter, playerMaxHp)} | Mob ${hpWithMax(entry.mobHpAfter, mobMaxHp)}`
    );
  }

  lines.push('');
  lines.push('Rewards');
  lines.push(`XP: ${input.rewards.xp}`);

  if (input.rewards.skillXp) {
    lines.push(`${input.rewards.skillXp.skillType}: +${input.rewards.skillXp.xpAfterEfficiency} XP`);
  }

  const defenceXp = input.rewards.secondarySkillXp?.defence;
  const evasionXp = input.rewards.secondarySkillXp?.evasion;
  if (defenceXp && defenceXp.xpGained > 0) {
    lines.push(`Defence: +${defenceXp.xpGained} XP (${defenceXp.events} hits taken)`);
  }
  if (evasionXp && evasionXp.xpGained > 0) {
    lines.push(`Evasion: +${evasionXp.xpGained} XP (${evasionXp.events} dodges)`);
  }

  if (input.rewards.loot.length > 0) {
    lines.push('Loot:');
    for (const drop of input.rewards.loot) {
      const name = drop.itemName?.trim() || drop.itemTemplateId;
      lines.push(`- ${name}${drop.quantity > 1 ? ` x${drop.quantity}` : ''}`);
    }
  }

  return lines.join('\n');
}
