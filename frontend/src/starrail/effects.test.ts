import { expect, test } from 'vitest'
import { STAT_EFFECTS, statEffectsOf, tierValue, valueFor, withEffects } from './effects'
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
  const tree = { stat: 'outgoing_healing', values: [0.12, 0.2], spdAtLeast: [135, 180] } as const
  expect([100, 150, 183.5].map((spd) => tierValue(tree, spd))).toEqual([undefined, 0.12, 0.2])
  const poet = { stat: 'crit_rate', values: [0.2, 0.32], spdBelow: [110, 95] } as const
  expect([120, 100, 90].map((spd) => tierValue(poet, spd))).toEqual([undefined, 0.2, 0.32])
})

test('lists what the light cone and sets can trigger', () => {
  expect(statEffectsOf(HYACINE).map(({ id }) => id)).toEqual([
    'giant-tree',
    'warrior-goddess',
    'charmony-fall',
  ])
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
