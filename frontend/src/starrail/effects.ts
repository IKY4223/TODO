// The conditional effects this app knows, with their numbers copied from the game's own texts
// (StarRailRes dump): skills at level 10, light cones per superimposition. Values are fractions:
// 0.12 is 12%. Only popular supports, light cones and sets are listed (the owner's choice of a
// short table first); anything else is left to the player to switch off or add by hand.
// shortcut: no table entry means no effect; extend the table when a character needs one.
import type { Relic, StarRailCharacter } from './starrail'

type SkillKind = StarRailCharacter['skills'][number]['kind']

export type Source =
  // teammate: the set is worn by someone else on the team and raises all allies' stats.
  | { readonly set: number; readonly pieces: 2 | 4; readonly teammate?: boolean }
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
  /** One value; one per superimposition for a light cone; or one per tier. */
  readonly values: readonly number[]
  /** Holds by itself at these tiers of SPD (or `tierStat`), the highest met winning. Without
   * tiers: a switch. */
  readonly atLeast?: readonly number[]
  readonly below?: readonly number[]
  readonly tierStat?: 'effect_res'
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
    bonuses: [{ stat: 'atk_percent', values: [0.12], atLeast: [120] }],
  },
  {
    id: 'talia',
    source: { set: 307, pieces: 2 },
    bonuses: [{ stat: 'break_effect', values: [0.2], atLeast: [145] }],
  },
  {
    id: 'giant-tree',
    source: { set: 320, pieces: 2 },
    bonuses: [{ stat: 'outgoing_healing', values: [0.12, 0.2], atLeast: [135, 180] }],
  },
  {
    id: 'poet',
    source: { set: 124, pieces: 4 },
    bonuses: [{ stat: 'crit_rate', values: [0.2, 0.32], below: [110, 95] }],
  },
  {
    id: 'diviner',
    source: { set: 130, pieces: 4 },
    bonuses: [{ stat: 'crit_rate', values: [0.1, 0.18], atLeast: [120, 160] }],
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
  // Sets that raise all allies' stats: on the wearer by its own stats, on the others by a switch,
  // since the wearer's SPD or Effect RES is not on their screen.
  {
    id: 'fleet',
    source: { set: 302, pieces: 2 },
    bonuses: [{ stat: 'atk_percent', values: [0.08], atLeast: [120] }],
  },
  {
    id: 'keel',
    source: { set: 310, pieces: 2 },
    bonuses: [{ stat: 'crit_dmg', values: [0.1], atLeast: [0.3], tierStat: 'effect_res' }],
  },
  {
    id: 'fleet-team',
    source: { set: 302, pieces: 2, teammate: true },
    bonuses: [{ stat: 'atk_percent', values: [0.08] }],
  },
  {
    id: 'keel-team',
    source: { set: 310, pieces: 2, teammate: true },
    bonuses: [{ stat: 'crit_dmg', values: [0.1] }],
  },
]

export type Trigger = 'start' | 'turn' | 'ultimate' | 'always' | 'summon' | 'state'
// summons: the source's own
export type Target = 'self' | 'allies' | 'teammates' | 'chosen' | 'summons' | 'enemies'

/** What an effect does to the turn order. */
export interface TurnEffect {
  readonly id: string
  readonly source: Source
  // summon: brings the source's summons in with `values` actions, or adds them if already there.
  // delay: pushes the target's action back. slow: SPD minus this share of its base. stack: adds
  // stacks such as Syzygy.
  readonly kind: 'advance' | 'spd_percent' | 'spd' | 'summon' | 'delay' | 'slow' | 'stack'
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
  readonly once?: boolean // happens on the first trigger only
  readonly stacks?: number // a buff gained again adds up to this many; without it, it refreshes
  readonly byLevel?: SkillKind // `values` are one per level of this skill, from level 1
  readonly eidolon?: number // works from this Eidolon on
  readonly beforeEidolon?: number // works below this Eidolon only: a higher one changes it
  readonly byElation?: boolean // `values` are one per Elation character on the team, from 1
  // Which of the character's skill kits it belongs to, when a later one changed it.
  readonly kit?: 'first' | 'later'
  // A debuff's base chance to land: one, or one per level of the `byLevel` skill. The player
  // ticks whether it landed.
  readonly chance?: readonly number[]
}

// Welt's Skill: its base chance to Slow, by Skill level.
const WELT_SKILL_CHANCE = [
  0.65, 0.66, 0.67, 0.68, 0.69, 0.7, 0.7125, 0.725, 0.7375, 0.75, 0.76, 0.77, 0.78, 0.79, 0.8,
]

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
    values: [
      0.08, 0.082, 0.084, 0.086, 0.088, 0.09, 0.0925, 0.095, 0.0975, 0.1, 0.102, 0.104, 0.106,
      0.108, 0.11,
    ],
    trigger: 'always',
    target: 'teammates',
    byLevel: 'talent',
  },
  {
    id: 'asta-ultimate',
    source: { character: 1009 },
    kind: 'spd',
    values: [36, 37.4, 38.8, 40.2, 41.6, 43, 44.75, 46.5, 48.25, 50, 51.4, 52.8, 54.2, 55.6, 57],
    trigger: 'ultimate',
    target: 'allies',
    turns: 2,
    byLevel: 'ultimate',
  },
  {
    id: 'march-shifu',
    source: { character: 1224 },
    kind: 'spd_percent',
    values: [
      0.06, 0.064, 0.068, 0.072, 0.076, 0.08, 0.085, 0.09, 0.095, 0.1, 0.104, 0.108, 0.112, 0.116,
      0.12,
    ],
    trigger: 'always',
    target: 'chosen',
    byLevel: 'skill',
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
    values: [30, 33, 36, 39, 42, 45, 48.75, 52.5, 56.25, 60, 63, 66, 69, 72, 75],
    trigger: 'ultimate',
    target: 'self',
    untilSummonLeaves: true, // Complete Combustion ends on the countdown's turn
    byLevel: 'ultimate',
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
    stacks: 7, // Hits Per Action add up, from 3 to at most 10
  },
  {
    id: 'jing-yuan-ultimate',
    source: { character: 1204 },
    kind: 'spd',
    values: [30],
    trigger: 'ultimate',
    target: 'summons',
    turns: 1,
    stacks: 7, // Hits Per Action add up, from 3 to at most 10
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
    beforeEidolon: 2,
  },
  {
    id: 'seele-skill-e2',
    source: { character: 1102 },
    kind: 'spd_percent',
    values: [0.25],
    trigger: 'turn',
    target: 'self',
    turns: 2,
    stacks: 2,
    eidolon: 2,
  },
  {
    id: 'bronya-e2',
    source: { character: 1101 },
    kind: 'spd_percent',
    values: [0.3],
    trigger: 'turn',
    target: 'chosen',
    turns: 2, // "after taking action, for 1 turn": the advanced turn, then the one after it
    eidolon: 2,
  },
  {
    id: 'march-e1',
    source: { character: 1224 },
    kind: 'spd_percent',
    values: [0.1],
    trigger: 'always',
    target: 'self',
    eidolon: 1,
  },
  {
    id: 'hanya-e2',
    source: { character: 1215 },
    kind: 'spd_percent',
    values: [0.2],
    trigger: 'turn',
    target: 'self',
    turns: 1,
    eidolon: 2,
  },
  {
    id: 'fugue-e2',
    source: { character: 1225 },
    kind: 'advance',
    values: [0.24],
    trigger: 'ultimate',
    target: 'allies',
    eidolon: 2,
  },
  // Mydei enters Vendetta when his Charge reaches 100 from HP lost: when depends on the battle,
  // so the player says whether it comes after his first turn.
  {
    id: 'mydei-vendetta',
    source: { character: 1404 },
    kind: 'advance',
    values: [1],
    trigger: 'turn',
    target: 'self',
    once: true,
    off: true,
  },
  {
    id: 'mydei-e6',
    source: { character: 1404 },
    kind: 'advance',
    values: [1],
    trigger: 'start',
    target: 'self',
    eidolon: 6,
  },
  {
    id: 'jingliu-talent',
    source: { character: 1212 },
    kind: 'advance',
    values: [1],
    trigger: 'state',
    target: 'self',
  },
  {
    id: 'jingliu-technique',
    source: { character: 1212 },
    kind: 'stack',
    values: [1],
    trigger: 'start',
    target: 'self',
    off: true,
  },
  // shortcut: with 4 or more Elation characters the target also gains an extra turn; not modelled.
  {
    id: 'pearl-ultimate',
    source: { character: 1503 },
    kind: 'advance',
    values: [0.1, 0.15, 0.3],
    trigger: 'ultimate',
    target: 'chosen',
    byElation: true,
  },
  // On enemies. A debuff with a base chance has its box ticked as landed; the player unticks it.
  {
    id: 'welt-skill',
    source: { character: 1004 },
    kind: 'slow',
    values: [0.1],
    trigger: 'turn',
    target: 'enemies',
    turns: 2,
    byLevel: 'skill',
    chance: WELT_SKILL_CHANCE,
    beforeEidolon: 4,
  },
  {
    id: 'welt-skill-e4',
    source: { character: 1004 },
    kind: 'slow',
    values: [0.1],
    trigger: 'turn',
    target: 'enemies',
    turns: 2,
    byLevel: 'skill',
    chance: WELT_SKILL_CHANCE.map((chance) => chance + 0.35),
    eidolon: 4,
  },
  {
    id: 'welt-ultimate',
    source: { character: 1004 },
    kind: 'delay',
    values: [
      0.32, 0.328, 0.336, 0.344, 0.352, 0.36, 0.37, 0.38, 0.39, 0.4, 0.408, 0.416, 0.424, 0.432,
      0.44,
    ],
    trigger: 'ultimate',
    target: 'enemies',
    byLevel: 'ultimate',
    chance: [1],
    kit: 'first',
  },
  // The later kit delays less on the Ultimate and adds "Weightless".
  // shortcut: Weightless also delays a target 4% each time it is attacked, up to 8 times a turn;
  // how often depends on the team's hits, so it is left out.
  {
    id: 'welt-ultimate-later',
    source: { character: 1004 },
    kind: 'delay',
    values: [
      0.06, 0.066, 0.072, 0.078, 0.084, 0.09, 0.0975, 0.105, 0.1125, 0.12, 0.126, 0.132, 0.138,
      0.144, 0.15,
    ],
    trigger: 'ultimate',
    target: 'enemies',
    byLevel: 'ultimate',
    chance: [1],
    kit: 'later',
  },
  {
    id: 'welt-ultimate-slow',
    source: { character: 1004 },
    kind: 'slow',
    values: [0.1],
    trigger: 'ultimate',
    target: 'enemies',
    turns: 1,
    chance: [1],
  },
  {
    id: 'welt-weightless',
    source: { character: 1004 },
    kind: 'slow',
    values: [0.05],
    trigger: 'ultimate',
    target: 'enemies',
    turns: 2,
    kit: 'later',
  },
  {
    id: 'welt-technique',
    source: { character: 1004 },
    kind: 'delay',
    values: [0.2],
    trigger: 'start',
    target: 'enemies',
    chance: [1],
    off: true,
  },
  {
    id: 'boothill-ultimate',
    source: { character: 1315 },
    kind: 'delay',
    values: [
      0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.3625, 0.375, 0.3875, 0.4, 0.41, 0.42, 0.43, 0.44, 0.45,
    ],
    trigger: 'ultimate',
    target: 'enemies',
    byLevel: 'ultimate',
  },
  // Dan Heng's Slow needs a CRIT hit from the Skill.
  {
    id: 'dan-heng-skill',
    source: { character: 1002 },
    kind: 'slow',
    values: [0.12],
    trigger: 'turn',
    target: 'enemies',
    turns: 2,
    chance: [1],
    off: true,
    beforeEidolon: 6,
  },
  {
    id: 'dan-heng-skill-e6',
    source: { character: 1002 },
    kind: 'slow',
    values: [0.2],
    trigger: 'turn',
    target: 'enemies',
    turns: 2,
    chance: [1],
    off: true,
    eidolon: 6,
  },
  {
    id: 'mem-technique-7',
    source: { character: 8007 },
    kind: 'delay',
    values: [0.5],
    trigger: 'start',
    target: 'enemies',
    off: true,
  },
  {
    id: 'mem-technique-8',
    source: { character: 8008 },
    kind: 'delay',
    values: [0.5],
    trigger: 'start',
    target: 'enemies',
    off: true,
  },
  // Robin's Concerto: the Ultimate brings a countdown (SPD 90) that holds her turns until it acts.
  {
    id: 'robin-concerto',
    source: { character: 1309 },
    kind: 'summon',
    values: [1],
    trigger: 'ultimate',
    target: 'summons',
  },
  {
    id: 'robin-e2',
    source: { character: 1309 },
    kind: 'spd_percent',
    values: [0.16],
    trigger: 'ultimate',
    target: 'allies',
    untilSummonLeaves: true, // while Concerto lasts
    eidolon: 2,
  },
  // Garmentmaker gains SPD each time it attacks a target with Seam Stitch, here every turn.
  // shortcut: Aglaea's own SPD from these stacks in Supreme Stance, and Garmentmaker leaving on
  // its countdown, are not modelled.
  {
    id: 'garmentmaker-talent',
    source: { character: 1402 },
    kind: 'spd',
    values: [44, 46.2, 48.4, 50.6, 52.8, 55, 57.2, 59.4, 61.6, 63.8],
    trigger: 'summon',
    target: 'self',
    stacks: 6,
    byLevel: 'memosprite_talent',
    beforeEidolon: 4,
  },
  {
    id: 'garmentmaker-talent-e4',
    source: { character: 1402 },
    kind: 'spd',
    values: [44, 46.2, 48.4, 50.6, 52.8, 55, 57.2, 59.4, 61.6, 63.8],
    trigger: 'summon',
    target: 'self',
    stacks: 7,
    byLevel: 'memosprite_talent',
    eidolon: 4,
  },
  {
    id: 'sushang-e6',
    source: { character: 1206 },
    kind: 'spd_percent',
    values: [
      0.15, 0.155, 0.16, 0.165, 0.17, 0.175, 0.1812, 0.1875, 0.1938, 0.2, 0.205, 0.21, 0.215, 0.22,
      0.225,
    ],
    trigger: 'start',
    target: 'self',
    turns: 2,
    byLevel: 'talent',
    eidolon: 6,
  },
  {
    id: 'hanya-ultimate',
    source: { character: 1215 },
    kind: 'spd',
    values: [
      0.15, 0.155, 0.16, 0.165, 0.17, 0.175, 0.1812, 0.1875, 0.1938, 0.2, 0.205, 0.21, 0.215, 0.22,
      0.225,
    ],
    trigger: 'ultimate',
    target: 'chosen',
    turns: 2,
    ofSourceSpd: true,
    byLevel: 'ultimate',
  },
  {
    id: 'sushang-talent',
    source: { character: 1206 },
    kind: 'spd_percent',
    values: [
      0.15, 0.155, 0.16, 0.165, 0.17, 0.175, 0.1812, 0.1875, 0.1938, 0.2, 0.205, 0.21, 0.215, 0.22,
      0.225,
    ],
    trigger: 'always',
    target: 'self',
    off: true,
    byLevel: 'talent',
  },
  {
    id: 'aventurine-waveflair-ultimate',
    source: { character: 1513 },
    kind: 'spd_percent',
    values: [
      0.12, 0.138, 0.156, 0.174, 0.192, 0.21, 0.2325, 0.255, 0.2775, 0.3, 0.318, 0.336, 0.354,
      0.372, 0.39,
    ],
    trigger: 'ultimate',
    target: 'self',
    turns: 4,
    byLevel: 'ultimate',
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

/** Jingliu's Syzygy: Spectral Transmigration at 2 stacks; Eidolon 6 adds one on entering. */
export const SYZYGY = { character: 1212, enter: 2, bonusFrom: 6 } as const

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
  readonly pausesOwner?: boolean // the owner takes no turn while it is here, and acts once it goes
}

// shortcut: summons keep the SPD and action count the game gives them, past the effects in
// TURN_EFFECTS; Netherwing leaving early when its HP runs out is not modelled.
export const SUMMONS: readonly Summon[] = [
  { owner: 1112, kind: 'summon', spd: 80 }, // Numby
  { owner: 1204, kind: 'summon', spd: 60, maxSpd: 130 }, // Lightning-Lord, up to 10 hits
  { owner: 1222, kind: 'summon', spd: 90, later: true, maxActions: 5 }, // Fuyuan
  { owner: 1310, kind: 'countdown', spd: 70, later: true, blocksUltimate: true }, // Combustion
  { owner: 1309, kind: 'countdown', spd: 90, later: true, pausesOwner: true }, // Concerto
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
  // A teammate's set counts only for those without their own: the same effect does not stack.
  const worn = pieces(character.relics, source.set) >= source.pieces
  return worn === !source.teammate ? values[0] : undefined
}

const ASSUMED_LEVEL = 10 // when the showcase lacks the skill's level
// The game data lists a later kit's traces under the first kit's ids with a leading 1: 1004101
// becomes 11004101. A showcase with such a trace has the later kit.
const LATER_KIT_TRACE = 10_000_000

const kitOf = (character: StarRailCharacter): 'first' | 'later' =>
  character.points.some(({ id }) => id >= LATER_KIT_TRACE) ? 'later' : 'first'

const levelOf = (character: StarRailCharacter, kind: SkillKind): number =>
  character.skills.find((skill) => skill.kind === kind)?.level ?? ASSUMED_LEVEL

const byCount = (values: readonly number[], count: number): number | undefined =>
  values[Math.min(count, values.length) - 1]

/** A debuff's base chance to land for this character, or undefined when it has none. */
export function chanceOf(effect: TurnEffect, character: StarRailCharacter): number | undefined {
  if (!effect.chance) return undefined
  return effect.byLevel && effect.chance.length > 1
    ? byCount(effect.chance, levelOf(character, effect.byLevel))
    : effect.chance[0]
}

/** The value a turn effect has for this character in this team, or undefined when it does not apply. */
export function turnValue(
  effect: TurnEffect,
  character: StarRailCharacter,
  team: readonly StarRailCharacter[],
): number | undefined {
  const value = valueFor(effect.source, effect.values, character)
  const { eidolon } = character
  if (value === undefined) return undefined
  if (eidolon < (effect.eidolon ?? 0) || eidolon >= (effect.beforeEidolon ?? Infinity))
    return undefined
  if (effect.kit && effect.kit !== kitOf(character)) return undefined
  if (effect.byLevel && effect.values.length > 1)
    return byCount(effect.values, levelOf(character, effect.byLevel))
  if (effect.byElation)
    return byCount(effect.values, team.filter(({ path }) => path === 'elation').length)
  return value
}

/** The Syzygy Jingliu gains on entering Spectral Transmigration: one in the later kit, one at E6.
 * shortcut: the later kit's Syzygy from allies taking damage or losing HP 20 times is left out;
 * how soon it comes depends on the battle. */
export const syzygyBonus = (character: StarRailCharacter): number =>
  Number(kitOf(character) === 'later') + Number(character.eidolon >= SYZYGY.bonusFrom)

export const statOf = (character: StarRailCharacter, key: string): number =>
  character.stats.find((stat) => stat.key === key)?.value ?? 0

export const baseOf = (character: StarRailCharacter, key: string): number =>
  character.bases.find((stat) => stat.key === key)?.value ?? 0

/** The bonus a tiered effect gives at this SPD (or `tierStat`), or undefined when no tier is met. */
export function tierValue(bonus: StatBonus, stat: number): number | undefined {
  const tiers = bonus.atLeast ?? bonus.below
  if (!tiers) return undefined
  const met = tiers.map((tier) => (bonus.atLeast ? stat >= tier : stat < tier))
  const highest = met.lastIndexOf(true)
  return highest === -1 ? undefined : bonus.values[highest]
}

/** The bonus a tiered effect gives this character, or undefined when no tier is met. */
export const tierFor = (bonus: StatBonus, character: StarRailCharacter): number | undefined =>
  tierValue(bonus, statOf(character, bonus.tierStat ?? 'spd'))

/** The stat effects this character's light cone and sets can trigger. */
export const statEffectsOf = (character: StarRailCharacter): StatEffect[] =>
  STAT_EFFECTS.filter((effect) => valueFor(effect.source, [1], character) !== undefined)

/** Final stats with the chosen effects added; a % of HP, ATK, DEF or SPD is a share of the base. */
export function withEffects(
  character: StarRailCharacter,
  chosen: readonly StatEffect[],
): StarRailCharacter['stats'] {
  const extra = new Map<string, number>()
  for (const effect of chosen) {
    for (const bonus of effect.bonuses) {
      const value =
        bonus.atLeast || bonus.below
          ? tierFor(bonus, character)
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
