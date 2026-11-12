import { expect, test } from 'vitest'
import { simulate, type Unit, type UnitEffect } from './turns'

const unit = (key: string, spd: number, extra: Partial<Unit> = {}): Unit => ({
  key,
  spd,
  baseSpd: spd,
  ultimateEvery: 0,
  effects: [],
  ...extra,
})

const order = (units: Unit[], until = 350): string[] =>
  simulate(units, until).map(
    ({ time, unit: key, ultimate }) => `${Math.round(time * 10) / 10} ${key}${ultimate ? '!' : ''}`,
  )

const effect = (fields: Partial<UnitEffect> & Pick<UnitEffect, 'kind' | 'value'>): UnitEffect => ({
  trigger: 'turn',
  target: 'self',
  ...fields,
})

test('without effects a unit acts every 10 000 / SPD', () => {
  expect(order([unit('a', 100), unit('b', 160)], 200)).toEqual([
    '62.5 b',
    '100 a',
    '125 b',
    '187.5 b',
    '200 a',
  ])
})

test('an advance of 100% makes the chosen ally act at once', () => {
  const bronya = unit('bronya', 100, {
    chosen: 'dps',
    effects: [effect({ kind: 'advance', value: 1, target: 'chosen' })],
  })
  expect(order([bronya, unit('dps', 100)], 200)).toEqual([
    '100 bronya',
    '100 dps',
    '200 bronya',
    '200 dps',
  ])
})

test('a SPD % buff is a share of the base SPD, not of the final one', () => {
  const ruanMei = unit('ruan-mei', 50, {
    effects: [effect({ kind: 'spd_percent', value: 0.25, trigger: 'always', target: 'teammates' })],
  })
  // 80 final SPD on a base of 80: +25% of 80 makes 100, one turn by 100 action value.
  const [first] = simulate([ruanMei, unit('dps', 80)], 150)
  expect(first).toEqual({ time: 100, unit: 'dps', ultimate: false })
})

test('a timed buff wears off after its turns', () => {
  const asta = unit('asta', 100, {
    ultimateEvery: 1,
    effects: [effect({ kind: 'spd', value: 100, trigger: 'ultimate', target: 'self', turns: 1 })],
  })
  // SPD 200 for one turn after the Ultimate at 100, then 100 again: 100, 150, 250.
  expect(order([asta], 260)).toEqual(['100 asta!', '150 asta!', '200 asta!', '250 asta!'])
})

test('the Ultimate comes after every Nth turn and fires its effects', () => {
  const robin = unit('robin', 100, {
    ultimateEvery: 2,
    effects: [effect({ kind: 'advance', value: 1, trigger: 'ultimate', target: 'teammates' })],
  })
  expect(order([robin, unit('dps', 50)], 250)).toEqual(['100 robin', '200 robin!', '200 dps'])
})

test("a summon acts on its own and its owner's effects can reach it", () => {
  const sunday = unit('sunday', 100, {
    chosen: 'owner',
    effects: [effect({ kind: 'advance', value: 1, target: 'chosen', withSummons: true })],
  })
  const owner = unit('owner', 50)
  const pet = unit('pet', 50, { owner: 'owner' })
  expect(order([sunday, owner, pet], 150)).toEqual(['100 sunday', '100 owner', '100 pet'])
})

test('an empty team takes no turns', () => {
  expect(simulate([], 350)).toEqual([])
})
