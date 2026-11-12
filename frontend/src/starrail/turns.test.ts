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
  id: 'e',
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
  expect(first).toEqual({ time: 100, unit: 'dps', ultimate: false, turn: 1 })
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

test('a summon that comes later acts only once summoned, for its count of actions', () => {
  // Castorice: the Ultimate summons Netherwing for 3 turns and advances it by 100%.
  const castorice = unit('c', 100, {
    ultimateEvery: 1,
    effects: [effect({ kind: 'summon', value: 3, trigger: 'ultimate', target: 'summons' })],
  })
  const netherwing = unit('n', 165, { owner: 'c', later: true, arrival: 1, blocksUltimate: true })
  expect(order([castorice, netherwing], 200)).toEqual(['100 c!', '100 n', '160.6 n', '200 c'])
})

test('summoning again adds actions up to the cap', () => {
  // Lingsha: each Skill brings Fuyuan in with 3 actions, or adds 3, up to 5.
  const lingsha = unit('l', 200, {
    effects: [effect({ kind: 'summon', value: 3, target: 'summons' })],
  })
  const fuyuan = unit('f', 50, { owner: 'l', later: true, maxActions: 5 })
  const turns = order([lingsha, fuyuan], 1000).filter((line) => line.endsWith(' f'))
  expect(turns).toEqual(['250 f', '450 f', '650 f', '850 f'])
})

test("a summon's SPD gains stop at its cap and wear off after its turn", () => {
  const jingYuan = unit('j', 200, {
    effects: [effect({ kind: 'spd', value: 40, target: 'summons', turns: 1, stacks: 10 })],
  })
  const lord = unit('ll', 60, { owner: 'j', maxSpd: 130 })
  // 60 SPD to 50, 100 to 100, then 140 held to 130: 3 000 + 5 000 + 130 · 15.4 = 10 000.
  expect(order([jingYuan, lord], 160).filter((line) => line.endsWith('ll'))).toEqual(['115.4 ll'])
})

test('a buff tied to a summon ends when it leaves, and blocks the Ultimate meanwhile', () => {
  // Firefly: the Ultimate grants SPD +60 until the SPD 70 countdown takes its turn.
  const firefly = unit('ff', 100, {
    ultimateEvery: 1,
    effects: [
      effect({ kind: 'summon', value: 1, trigger: 'ultimate', target: 'summons' }),
      effect({ kind: 'spd', value: 60, trigger: 'ultimate', untilSummonLeaves: true }),
      effect({ kind: 'advance', value: 0.25, withoutSummon: true }),
    ],
  })
  const countdown = unit('cd', 70, { owner: 'ff', later: true, blocksUltimate: true, timer: true })
  expect(order([firefly, countdown], 320)).toEqual([
    '100 ff!',
    '146.9 ff',
    '209.4 ff',
    '242.9 cd',
    '289.3 ff!',
  ])
})

test('a buff gained again refreshes, unless it stacks', () => {
  const buff = effect({ kind: 'spd', value: 50, turns: 3 })
  expect(order([unit('a', 100, { effects: [buff] })], 240)).toEqual(['100 a', '166.7 a', '233.3 a'])
  const stacking = effect({ kind: 'spd', value: 50, turns: 3, stacks: 2 })
  expect(order([unit('a', 100, { effects: [stacking] })], 270)).toEqual([
    '100 a',
    '166.7 a',
    '216.7 a',
    '266.7 a',
  ])
})

test('enemies take turns, and only effects aimed at them reach them', () => {
  const welt = unit('w', 100, {
    effects: [effect({ kind: 'delay', value: 0.4, target: 'enemies' })],
  })
  expect(order([welt, unit('e', 100, { enemy: true })], 200)).toEqual(['100 w', '140 e', '200 w'])
  const slower = unit('w', 50, {
    effects: [
      effect({ kind: 'slow', value: 0.1, trigger: 'start', target: 'enemies', turns: 2 }),
      effect({ id: 'team', kind: 'spd', value: 50, trigger: 'always', target: 'allies' }),
    ],
  })
  expect(order([slower, unit('e', 100, { enemy: true })], 330)).toEqual([
    '100 w',
    '111.1 e',
    '200 w',
    '222.2 e',
    '300 w',
    '322.2 e',
  ])
})

test('an effect that happens once fires on the first trigger only', () => {
  const mydei = unit('m', 100, { effects: [effect({ kind: 'advance', value: 1, once: true })] })
  expect(order([mydei], 250)).toEqual(['100 m', '100 m', '200 m'])
})

test('Syzygy stacks bring Spectral Transmigration, which each turn in it spends', () => {
  const advance = effect({ kind: 'advance', value: 1, trigger: 'state' })
  const jingliu = (bonus: number): Unit =>
    unit('j', 100, { stacks: { enter: 2, bonus }, effects: [advance] })
  expect(order([jingliu(0)], 520)).toEqual([
    '100 j',
    '200 j',
    '200 j',
    '300 j',
    '400 j',
    '500 j',
    '500 j',
  ])
  // Eidolon 6: one more stack on entering, so one more turn in the state.
  expect(order([jingliu(1)], 620).slice(-3)).toEqual(['500 j', '600 j', '600 j'])
})
