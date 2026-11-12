// The conditional effects this app knows, with their numbers copied from the game's own texts
// (StarRailRes dump): skills at level 10, light cones per superimposition. Values are fractions:
// 0.12 is 12%. Only popular supports, light cones and sets are listed (the owner's choice of a
// short table first); anything else is left to the player to switch off or add by hand.
// shortcut: no table entry means no effect; extend the table when a character needs one.
import type { Relic, StarRailCharacter } from './starrail'

export type Source =
  | { readonly set: number; readonly pieces: 2 | 4 }
  | { readonly cone: number }
  | { readonly character: number }

export type BonusStat =
  | 'atk_percent'
  | 'spd_percent'
  | 'crit_rate'
  | 'crit_dmg'
  | 'break_effect'
  | 'outgoing_healing'

/** A panel stat raised while the effect holds. */
export interface StatBonus {
  readonly stat: BonusStat
  /** One value; one per superimposition for a light cone; or one per SPD tier. */
  readonly values: readonly number[]
  /** Holds by itself at these SPD tiers, the highest one met winning. Without tiers: a switch. */
  readonly spdAtLeast?: readonly number[]
  readonly spdBelow?: readonly number[]
}

export interface StatEffect {
  readonly id: string
  readonly source: Source
  readonly bonuses: readonly StatBonus[]
}

export const STAT_EFFECTS: readonly StatEffect[] = [
  {
    id: 'space-sealing',
    source: { set: 301, pieces: 2 },
    bonuses: [{ stat: 'atk_percent', values: [0.12], spdAtLeast: [120] }],
  },
  {
    id: 'talia',
    source: { set: 307, pieces: 2 },
    bonuses: [{ stat: 'break_effect', values: [0.2], spdAtLeast: [145] }],
  },
  {
    id: 'giant-tree',
    source: { set: 320, pieces: 2 },
    bonuses: [{ stat: 'outgoing_healing', values: [0.12, 0.2], spdAtLeast: [135, 180] }],
  },
  {
    id: 'poet',
    source: { set: 124, pieces: 4 },
    bonuses: [{ stat: 'crit_rate', values: [0.2, 0.32], spdBelow: [110, 95] }],
  },
  {
    id: 'diviner',
    source: { set: 130, pieces: 4 },
    bonuses: [{ stat: 'crit_rate', values: [0.1, 0.18], spdAtLeast: [120, 160] }],
  },
  {
    id: 'messenger',
    source: { set: 114, pieces: 4 },
    bonuses: [{ stat: 'spd_percent', values: [0.12] }],
  },
  {
    id: 'warrior-goddess',
    source: { set: 125, pieces: 4 },
    bonuses: [
      { stat: 'spd_percent', values: [0.06] },
      { stat: 'crit_dmg', values: [0.15] },
    ],
  },
  {
    id: 'triumphant-song',
    source: { set: 123, pieces: 4 },
    bonuses: [
      { stat: 'spd_percent', values: [0.06] },
      { stat: 'crit_dmg', values: [0.3] },
    ],
  },
  {
    id: 'amphoreus',
    source: { set: 323, pieces: 2 },
    bonuses: [{ stat: 'spd_percent', values: [0.08] }],
  },
  {
    id: 'charmony-fall',
    source: { cone: 21045 },
    bonuses: [{ stat: 'spd_percent', values: [0.08, 0.1, 0.12, 0.14, 0.16] }],
  },
  {
    id: 'shadowed-by-night',
    source: { cone: 21047 },
    bonuses: [{ stat: 'spd_percent', values: [0.08, 0.09, 0.1, 0.11, 0.12] }],
  },
  {
    id: 'river-flows',
    source: { cone: 21024 },
    bonuses: [{ stat: 'spd_percent', values: [0.08, 0.09, 0.1, 0.11, 0.12] }],
  },
]

export type Trigger = 'start' | 'turn' | 'ultimate' | 'always' | 'summon'
export type Target = 'self' | 'allies' | 'teammates' | 'chosen' | 'summons' // summons: the source's own

/** What an effect does to the turn order. */
export interface TurnEffect {
  readonly id: string
  readonly source: Source
  // summon: brings the source's summons in with `values` actions, or adds them if already there.
  readonly kind: 'advance' | 'spd_percent' | 'spd' | 'summon'
  readonly values: readonly number[] // one, or one per superimposition for a light cone
  readonly trigger: Trigger
  readonly target: Target
  readonly turns?: number // a buff lasts this many of the target's turns; without it, for good
  readonly minSpd?: number // works only when the source's SPD reaches this
  readonly withSummons?: boolean // the target's summons too
  readonly off?: boolean // starts switched off: how the character is played decides it
  readonly ofSourceSpd?: boolean // the value is a share of the source's own SPD
  readonly untilSummonLeaves?: boolean // the buff ends when the source's summon leaves
  readonly withoutSummon?: boolean // works only while the source's summon is away
}

// "Every turn" assumes the Skill is used every turn, "On Ultimate" the Ultimate every few turns.
export const TURN_EFFECTS: readonly TurnEffect[] = [
  {
    id: 'bronya-skill',
    source: { character: 1101 },
    kind: 'advance',
    values: [1],
    trigger: 'turn',
    target: 'chosen',
  },
  {
    id: 'bronya-talent',
    source: { character: 1101 },
    kind: 'advance',
    values: [0.3],
    trigger: 'turn',
    target: 'self',
    off: true,
  },
  {
    id: 'sunday-skill',
    source: { character: 1313 },
    kind: 'advance',
    values: [1],
    trigger: 'turn',
    target: 'chosen',
    withSummons: true,
  },
  {
    id: 'sparkle-skill',
    source: { character: 1306 },
    kind: 'advance',
    values: [0.5],
    trigger: 'turn',
    target: 'chosen',
  },
  {
    id: 'robin-ultimate',
    source: { character: 1309 },
    kind: 'advance',
    values: [1],
    trigger: 'ultimate',
    target: 'teammates',
  },
  {
    id: 'robin-summeretto-ultimate',
    source: { character: 1512 },
    kind: 'advance',
    values: [1],
    trigger: 'ultimate',
    target: 'chosen',
  },
  {
    id: 'ruan-mei-talent',
    source: { character: 1303 },
    kind: 'spd_percent',
    values: [0.1],
    trigger: 'always',
    target: 'teammates',
  },
  {
    id: 'asta-ultimate',
    source: { character: 1009 },
    kind: 'spd',
    values: [50],
    trigger: 'ultimate',
    target: 'allies',
    turns: 2,
  },
  {
    id: 'march-shifu',
    source: { character: 1224 },
    kind: 'spd_percent',
    values: [0.12],
    trigger: 'always',
    target: 'chosen',
  },
  {
    id: 'jade-skill',
    source: { character: 1314 },
    kind: 'spd',
    values: [30],
    trigger: 'turn',
    target: 'chosen',
    turns: 3,
  },
  {
    id: 'firefly-skill',
    source: { character: 1310 },
    kind: 'advance',
    values: [0.25],
    trigger: 'turn',
    target: 'self',
    withoutSummon: true, // the Enhanced Skill of Complete Combustion has no advance
  },
  {
    id: 'firefly-advance',
    source: { character: 1310 },
    kind: 'advance',
    values: [1],
    trigger: 'ultimate',
    target: 'self',
  },
  {
    id: 'firefly-spd',
    source: { character: 1310 },
    kind: 'spd',
    values: [60],
    trigger: 'ultimate',
    target: 'self',
    untilSummonLeaves: true, // Complete Combustion ends on the countdown's turn
  },
  {
    id: 'firefly-countdown',
    source: { character: 1310 },
    kind: 'summon',
    values: [1],
    trigger: 'ultimate',
    target: 'summons',
  },
  // Lightning-Lord: each Hit Per Action adds SPD 10 for its next turn.
  {
    id: 'jing-yuan-skill',
    source: { character: 1204 },
    kind: 'spd',
    values: [20],
    trigger: 'turn',
    target: 'summons',
    turns: 1,
  },
  {
    id: 'jing-yuan-ultimate',
    source: { character: 1204 },
    kind: 'spd',
    values: [30],
    trigger: 'ultimate',
    target: 'summons',
    turns: 1,
  },
  {
    id: 'jing-yuan-technique',
    source: { character: 1204 },
    kind: 'spd',
    values: [30],
    trigger: 'start',
    target: 'summons',
    turns: 1,
    off: true,
  },
  {
    id: 'lingsha-skill-summon',
    source: { character: 1222 },
    kind: 'summon',
    values: [3],
    trigger: 'turn',
    target: 'summons',
  },
  {
    id: 'lingsha-skill',
    source: { character: 1222 },
    kind: 'advance',
    values: [0.2],
    trigger: 'turn',
    target: 'summons',
  },
  {
    id: 'lingsha-ultimate',
    source: { character: 1222 },
    kind: 'advance',
    values: [1],
    trigger: 'ultimate',
    target: 'summons',
  },
  {
    id: 'lingsha-technique',
    source: { character: 1222 },
    kind: 'summon',
    values: [3],
    trigger: 'start',
    target: 'summons',
    off: true,
  },
  {
    id: 'castorice-ultimate',
    source: { character: 1407 },
    kind: 'summon',
    values: [3],
    trigger: 'ultimate',
    target: 'summons',
  },
  {
    id: 'castorice-technique',
    source: { character: 1407 },
    kind: 'summon',
    values: [3],
    trigger: 'start',
    target: 'summons',
    off: true,
  },
  {
    id: 'seele-skill',
    source: { character: 1102 },
    kind: 'spd_percent',
    values: [0.25],
    trigger: 'turn',
    target: 'self',
    turns: 2,
  },
  {
    id: 'hanya-ultimate',
    source: { character: 1215 },
    kind: 'spd',
    values: [0.2],
    trigger: 'ultimate',
    target: 'chosen',
    turns: 2,
    ofSourceSpd: true,
  },
  {
    id: 'sushang-talent',
    source: { character: 1206 },
    kind: 'spd_percent',
    values: [0.2],
    trigger: 'always',
    target: 'self',
    off: true,
  },
  {
    id: 'aventurine-waveflair-ultimate',
    source: { character: 1513 },
    kind: 'spd_percent',
    values: [0.3],
    trigger: 'ultimate',
    target: 'self',
    turns: 4,
  },
  {
    id: 'aglaea-ultimate',
    source: { character: 1402 },
    kind: 'advance',
    values: [1],
    trigger: 'ultimate',
    target: 'self',
  },
  {
    id: 'fugue-technique',
    source: { character: 1225 },
    kind: 'advance',
    values: [0.4],
    trigger: 'start',
    target: 'self',
    off: true,
  },
  {
    id: 'robin-summeretto-technique',
    source: { character: 1512 },
    kind: 'advance',
    values: [0.2],
    trigger: 'start',
    target: 'self',
    off: true,
  },
  {
    id: 'multiplication',
    source: { cone: 20015 },
    kind: 'advance',
    values: [0.12, 0.14, 0.16, 0.18, 0.2],
    trigger: 'turn',
    target: 'self',
    off: true,
  },
  {
    id: 'mem-skill-7',
    source: { character: 8007 },
    kind: 'advance',
    values: [1],
    trigger: 'summon',
    target: 'chosen',
  },
  {
    id: 'mem-skill-8',
    source: { character: 8008 },
    kind: 'advance',
    values: [1],
    trigger: 'summon',
    target: 'chosen',
  },
  {
    id: 'messenger',
    source: { set: 114, pieces: 4 },
    kind: 'spd_percent',
    values: [0.12],
    trigger: 'ultimate',
    target: 'allies',
    turns: 1,
  },
  {
    id: 'eagle',
    source: { set: 110, pieces: 4 },
    kind: 'advance',
    values: [0.25],
    trigger: 'ultimate',
    target: 'self',
  },
  {
    id: 'vonwacq',
    source: { set: 308, pieces: 2 },
    kind: 'advance',
    values: [0.4],
    trigger: 'start',
    target: 'self',
    minSpd: 120,
  },
  {
    id: 'amphoreus',
    source: { set: 323, pieces: 2 },
    kind: 'spd_percent',
    values: [0.08],
    trigger: 'always',
    target: 'allies',
  },
  {
    id: 'warrior-goddess',
    source: { set: 125, pieces: 4 },
    kind: 'spd_percent',
    values: [0.06],
    trigger: 'always',
    target: 'self',
  },
  {
    id: 'triumphant-song',
    source: { set: 123, pieces: 4 },
    kind: 'spd_percent',
    values: [0.06],
    trigger: 'always',
    target: 'self',
  },
  {
    id: 'dance-dance-dance',
    source: { cone: 21018 },
    kind: 'advance',
    values: [0.16, 0.18, 0.2, 0.22, 0.24],
    trigger: 'ultimate',
    target: 'allies',
  },
  {
    id: 'mediation',
    source: { cone: 20019 },
    kind: 'spd',
    values: [12, 14, 16, 18, 20],
    trigger: 'start',
    target: 'allies',
    turns: 1,
  },
  {
    id: 'rise-and-sing',
    source: { cone: 23063 },
    kind: 'advance',
    values: [0.3, 0.325, 0.35, 0.375, 0.4],
    trigger: 'start',
    target: 'self',
  },
  {
    id: 'charmony-fall',
    source: { cone: 21045 },
    kind: 'spd_percent',
    values: [0.08, 0.1, 0.12, 0.14, 0.16],
    trigger: 'ultimate',
    target: 'self',
    turns: 2,
  },
  {
    id: 'shadowed-by-night',
    source: { cone: 21047 },
    kind: 'spd_percent',
    values: [0.08, 0.09, 0.1, 0.11, 0.12],
    trigger: 'start',
    target: 'self',
    turns: 2,
  },
  {
    id: 'river-flows',
    source: { cone: 21024 },
    kind: 'spd_percent',
    values: [0.08, 0.09, 0.1, 0.11, 0.12],
    trigger: 'always',
    target: 'self',
  },
]

/** A summon, memosprite or countdown that takes its own turns. */
export interface Summon {
  readonly owner: number
  readonly kind: 'memosprite' | 'summon' | 'countdown'
  readonly spd: number
  readonly ofOwner?: boolean // `spd` is a share of the owner's SPD
  readonly later?: boolean // away until an effect brings it in
  readonly arrival?: number // the action advance it gets each time it is brought in
  readonly maxActions?: number
  readonly maxSpd?: number
  readonly blocksUltimate?: boolean // the owner cannot use the Ultimate while it is here
}

// shortcut: summons keep the SPD and action count the game gives them, past the effects in
// TURN_EFFECTS; Netherwing leaving early when its HP runs out is not modelled.
export const SUMMONS: readonly Summon[] = [
  { owner: 1112, kind: 'summon', spd: 80 }, // Numby
  { owner: 1204, kind: 'summon', spd: 60, maxSpd: 130 }, // Lightning-Lord, up to 10 hits
  { owner: 1222, kind: 'summon', spd: 90, later: true, maxActions: 5 }, // Fuyuan
  { owner: 1310, kind: 'countdown', spd: 70, later: true, blocksUltimate: true }, // Combustion
  { owner: 1414, kind: 'summon', spd: 165 }, // Souldragon
  // Netherwing: Newbud, which fills Castorice's Ultimate, does not grow while it is here.
  { owner: 1407, kind: 'memosprite', spd: 165, later: true, arrival: 1, blocksUltimate: true },
  { owner: 1413, kind: 'memosprite', spd: 160 }, // Evey
  { owner: 1402, kind: 'memosprite', spd: 0.35, ofOwner: true }, // Garmentmaker
  { owner: 8007, kind: 'memosprite', spd: 130 }, // Mem
  { owner: 8008, kind: 'memosprite', spd: 130 }, // Mem
]

const pieces = (relics: readonly Relic[], set: number): number =>
  relics.filter(({ set_id }) => set_id === set).length

/** The value an effect has for this character, or undefined when the character lacks its source. */
export function valueFor(
  source: Source,
  values: readonly number[],
  character: StarRailCharacter,
): number | undefined {
  if ('character' in source) return source.character === character.id ? values[0] : undefined
  if ('cone' in source) {
    const cone = character.light_cone
    return cone?.id === source.cone
      ? values[Math.min(cone.superimposition, values.length) - 1]
      : undefined
  }
  return pieces(character.relics, source.set) >= source.pieces ? values[0] : undefined
}

export const statOf = (character: StarRailCharacter, key: string): number =>
  character.stats.find((stat) => stat.key === key)?.value ?? 0

export const baseOf = (character: StarRailCharacter, key: string): number =>
  character.bases.find((stat) => stat.key === key)?.value ?? 0

/** The bonus a tiered effect gives at this SPD, or undefined when no tier is met. */
export function tierValue(bonus: StatBonus, spd: number): number | undefined {
  const tiers = bonus.spdAtLeast ?? bonus.spdBelow
  if (!tiers) return undefined
  const met = tiers.map((tier) => (bonus.spdAtLeast ? spd >= tier : spd < tier))
  const highest = met.lastIndexOf(true)
  return highest === -1 ? undefined : bonus.values[highest]
}

/** The stat effects this character's light cone and sets can trigger. */
export const statEffectsOf = (character: StarRailCharacter): StatEffect[] =>
  STAT_EFFECTS.filter((effect) => valueFor(effect.source, [1], character) !== undefined)

/** Final stats with the chosen effects added; a % of HP, ATK, DEF or SPD is a share of the base. */
export function withEffects(
  character: StarRailCharacter,
  chosen: readonly StatEffect[],
): StarRailCharacter['stats'] {
  const spd = statOf(character, 'spd')
  const extra = new Map<string, number>()
  for (const effect of chosen) {
    for (const bonus of effect.bonuses) {
      const value =
        bonus.spdAtLeast || bonus.spdBelow
          ? tierValue(bonus, spd)
          : valueFor(effect.source, bonus.values, character)
      if (value === undefined) continue
      const [key, gain] =
        bonus.stat === 'atk_percent'
          ? ['atk', value * baseOf(character, 'atk')]
          : bonus.stat === 'spd_percent'
            ? ['spd', value * baseOf(character, 'spd')]
            : [bonus.stat, value]
      extra.set(key, (extra.get(key) ?? 0) + gain)
    }
  }
  return character.stats.map((stat) => ({
    ...stat,
    value: stat.value + (extra.get(stat.key) ?? 0),
  }))
}
