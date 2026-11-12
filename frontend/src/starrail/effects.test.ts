import { expect, test } from 'vitest'
import {
  STAT_EFFECTS,
  TURN_EFFECTS,
  statEffectsOf,
  tierValue,
  turnValue,
  valueFor,
  withEffects,
} from './effects'
import type { StarRailCharacter } from './starrail'

const relic = (set_id: number): StarRailCharacter['relics'][number] => ({
  slot: 'head',
  set_id,
  set_name: `Set ${set_id}`,
  rarity: 5,
  level: 15,
  main: { key: 'hp', value: 705 },
  subs: [],
  icon: null,
})

const HYACINE: StarRailCharacter = {
  id: 1409,
  name: 'Hyacine',
  element: 'wind',
  path: 'remembrance',
  rarity: 5,
  level: 80,
  eidolon: 0,
  light_cone: {
    id: 21045,
    name: 'After the Charmony Fall',
    rarity: 4,
    level: 80,
    superimposition: 3,
    icon: null,
  },
  relics: [relic(125), relic(125), relic(125), relic(125), relic(320), relic(320)],
  stats: [
    { key: 'atk', value: 1000 },
    { key: 'spd', value: 183.5 },
    { key: 'outgoing_healing', value: 0.3456 },
    { key: 'crit_dmg', value: 0.5 },
  ],
  bases: [
    { key: 'atk', value: 500 },
    { key: 'spd', value: 110 },
  ],
  skills: [],
  points: [],
  icon: null,
}

test('a light cone effect takes the value of its superimposition', () => {
  expect(valueFor({ cone: 21045 }, [0.08, 0.1, 0.12, 0.14, 0.16], HYACINE)).toBe(0.12)
  expect(valueFor({ cone: 99999 }, [1], HYACINE)).toBeUndefined()
})

test('a set effect needs its pieces', () => {
  expect(valueFor({ set: 125, pieces: 4 }, [1], HYACINE)).toBe(1)
  expect(valueFor({ set: 320, pieces: 4 }, [1], HYACINE)).toBeUndefined()
})

test('the highest SPD tier met wins', () => {
  const tree = { stat: 'outgoing_healing', values: [0.12, 0.2], atLeast: [135, 180] } as const
  expect([100, 150, 183.5].map((spd) => tierValue(tree, spd))).toEqual([undefined, 0.12, 0.2])
  const poet = { stat: 'crit_rate', values: [0.2, 0.32], below: [110, 95] } as const
  expect([120, 100, 90].map((spd) => tierValue(poet, spd))).toEqual([undefined, 0.2, 0.32])
})

test('lists what the light cone and sets can trigger', () => {
  expect(statEffectsOf(HYACINE).map(({ id }) => id)).toEqual([
    'giant-tree',
    'warrior-goddess',
    'charmony-fall',
    'fleet-team',
    'keel-team',
  ])
})

test("a set that raises all allies' stats works on its wearer by itself, and on others by a switch", () => {
  const wearer: StarRailCharacter = {
    ...HYACINE,
    relics: [relic(302), relic(302), relic(310), relic(310)],
    stats: [...HYACINE.stats, { key: 'effect_res', value: 0.3 }],
  }
  const own = statEffectsOf(wearer)
  expect(own.map(({ id }) => id)).toEqual(['charmony-fall', 'fleet', 'keel'])
  const stats = withEffects(wearer, own)
  const value = (key: string): number | undefined => stats.find((stat) => stat.key === key)?.value
  expect(value('atk')).toBeCloseTo(1000 + 500 * 0.08) // SPD 183.5 meets 120
  expect(value('crit_dmg')).toBeCloseTo(0.6) // Effect RES 30% meets 30%
  const low = { ...wearer, stats: [...HYACINE.stats, { key: 'effect_res' as const, value: 0.29 }] }
  expect(withEffects(low, own).find((stat) => stat.key === 'crit_dmg')?.value).toBe(0.5)
  const teammate = withEffects(HYACINE, [byId('fleet-team')])
  expect(teammate.find((stat) => stat.key === 'atk')?.value).toBeCloseTo(1040)
})

const byId = (id: string): (typeof STAT_EFFECTS)[number] => {
  const found = STAT_EFFECTS.find((effect) => effect.id === id)
  if (!found) throw new Error(`no effect ${id}`)
  return found
}

test('adds the chosen effects to the final stats', () => {
  const stats = withEffects(HYACINE, [
    byId('giant-tree'),
    byId('warrior-goddess'),
    byId('charmony-fall'),
  ])
  const value = (key: string): number | undefined => stats.find((stat) => stat.key === key)?.value
  expect(value('outgoing_healing')).toBeCloseTo(0.5456) // +20% at 183.5 SPD
  expect(value('crit_dmg')).toBeCloseTo(0.65)
  // +6% and +12% of the 110 base SPD.
  expect(value('spd')).toBeCloseTo(183.5 + 110 * 0.18)
  expect(value('atk')).toBe(1000)
})

const turn = (id: string): (typeof TURN_EFFECTS)[number] => {
  const found = TURN_EFFECTS.find((effect) => effect.id === id)
  if (!found) throw new Error(`no effect ${id}`)
  return found
}

const as = (id: number, extra: Partial<StarRailCharacter> = {}): StarRailCharacter => ({
  ...HYACINE,
  id,
  ...extra,
})

test("a skill's effect takes the character's own level, level 10 when the showcase lacks it", () => {
  const talent = turn('ruan-mei-talent')
  const skills = [{ kind: 'talent', level: 12, bonus: 2 }] as const
  expect(turnValue(talent, as(1303, { skills: [...skills] }), [])).toBe(0.104)
  expect(turnValue(talent, as(1303), [])).toBe(0.1)
})

test('Eidolons switch effects on, or change them for another', () => {
  expect(turnValue(turn('march-e1'), as(1224), [])).toBeUndefined()
  expect(turnValue(turn('march-e1'), as(1224, { eidolon: 1 }), [])).toBe(0.1)
  expect(turnValue(turn('seele-skill'), as(1102, { eidolon: 2 }), [])).toBeUndefined()
  expect(turnValue(turn('seele-skill-e2'), as(1102, { eidolon: 2 }), [])).toBe(0.25)
})

test("Pearl's advance grows with the Elation characters on the team", () => {
  const pearl = as(1503, { path: 'elation' })
  const other = as(2, { path: 'elation' })
  expect(turnValue(turn('pearl-ultimate'), pearl, [pearl])).toBe(0.1)
  expect(turnValue(turn('pearl-ultimate'), pearl, [pearl, other, HYACINE])).toBe(0.15)
})
