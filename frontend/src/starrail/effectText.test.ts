import { expect, test } from 'vitest'
import { translate } from '../i18n'
import { STAT_EFFECTS, TURN_EFFECTS } from './effects'
import { sourceName, statEffectText, turnEffectText } from './effectText'
import type { StarRailCharacter } from './starrail'

const t: Parameters<typeof statEffectText>[2] = (message, values) =>
  translate('en', message, values)

const CHARACTER: StarRailCharacter = {
  id: 1101,
  name: 'Bronya',
  element: null,
  path: null,
  rarity: 5,
  level: 80,
  eidolon: 0,
  light_cone: {
    id: 21045,
    name: 'After the Charmony Fall',
    rarity: 4,
    level: 80,
    superimposition: 5,
    icon: null,
  },
  relics: [
    {
      slot: 'sphere',
      set_id: 320,
      set_name: 'Giant Tree of Rapt Brooding',
      rarity: 5,
      level: 15,
      main: { key: 'hp_percent', value: 0.4 },
      subs: [],
      icon: null,
    },
  ],
  stats: [],
  bases: [],
  skills: [],
  points: [],
  icon: null,
}

const stat = (id: string): (typeof STAT_EFFECTS)[number] => {
  const found = STAT_EFFECTS.find((effect) => effect.id === id)
  if (!found) throw new Error(id)
  return found
}

const turn = (id: string): (typeof TURN_EFFECTS)[number] => {
  const found = TURN_EFFECTS.find((effect) => effect.id === id)
  if (!found) throw new Error(id)
  return found
}

test('names the source as the player knows it', () => {
  expect(sourceName({ set: 320, pieces: 2 }, CHARACTER, t)).toBe('Giant Tree of Rapt Brooding (2)')
  expect(sourceName({ cone: 21045 }, CHARACTER, t)).toBe('After the Charmony Fall')
  expect(sourceName({ character: 1101 }, CHARACTER, t)).toBe('Bronya')
  expect(sourceName({ set: 302, pieces: 2, teammate: true }, CHARACTER, t)).toBe(
    'Fleet of the Ageless on a teammate',
  )
})

test('describes stat effects with their tiers or the superimposition value', () => {
  expect(statEffectText(stat('giant-tree'), CHARACTER, t)).toBe(
    'Outgoing Healing +12% / +20% · at SPD 135 / 180',
  )
  expect(statEffectText(stat('poet'), CHARACTER, t)).toBe(
    'CRIT Rate +20% / +32% · below SPD 110 / 95',
  )
  expect(statEffectText(stat('charmony-fall'), CHARACTER, t)).toBe('SPD +16%')
  expect(statEffectText(stat('keel'), CHARACTER, t)).toBe('CRIT DMG +10% · at Effect RES 30%')
  expect(statEffectText(stat('warrior-goddess'), CHARACTER, t)).toBe('SPD +6%, CRIT DMG +15%')
})

test('describes turn effects', () => {
  expect(turnEffectText(turn('bronya-skill'), 1, t)).toBe(
    'Every turn · Chosen ally: action advance +100%',
  )
  expect(turnEffectText(turn('asta-ultimate'), 50, t)).toBe(
    'On Ultimate · All allies: SPD +50 · lasts 2 turn(s)',
  )
  expect(turnEffectText(turn('vonwacq'), 0.4, t)).toBe(
    'At battle start · Self: action advance +40% · SPD at least 120',
  )
  expect(turnEffectText(turn('mem-skill-8'), 1, t)).toBe(
    "On the memosprite's turn · Chosen ally: action advance +100%",
  )
  expect(turnEffectText(turn('lingsha-skill-summon'), 3, t)).toBe(
    'Every turn · Own summon: comes in with 3 action(s)',
  )
  expect(turnEffectText(turn('firefly-spd'), 60, t)).toBe(
    'On Ultimate · Self: SPD +60 · until its countdown acts',
  )
  expect(turnEffectText(turn('firefly-skill'), 0.25, t)).toBe(
    'Every turn · Self: action advance +25% · outside its state',
  )
})
