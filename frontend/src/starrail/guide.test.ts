import { expect, test } from 'vitest'
import { describe, remainingCosts, type Trace } from './guide'

test('puts the level\'s numbers into a description', () => {
  const text = 'Deals #1[i]% of ATK plus #2[i], for #3[f1]% and #4[f2] turns.'
  expect(describe(text, [0.45, 200, 0.125, 2.5])).toBe(
    'Deals 45% of ATK plus 200, for 12.5% and 2.5 turns.',
  )
})

test('a number the data lacks reads as unknown, not as zero', () => {
  expect(describe('Up to #5[i]% and #6[i].', [0.25])).toBe('Up to ?% and ?.')
})

const trace = (id: number, costs: Trace['costs']): Trace => ({
  id,
  name: '',
  skill: costs.length > 1,
  description: '',
  params: [],
  costs,
})

test('adds up what the levels still to take cost', () => {
  const traces = [
    trace(1, [{}, { '2': 100, a: 1 }, { '2': 200, a: 2 }]), // a skill at level 2 of 3
    trace(2, [{ '2': 50, b: 1 }]), // an ability not unlocked
    trace(3, [{ '2': 999 }]), // an ability already unlocked
  ]
  const points = [
    { id: 1, level: 2 },
    { id: 3, level: 1 },
  ]
  expect([...remainingCosts(traces, points)]).toEqual([
    ['2', 250],
    ['a', 2],
    ['b', 1],
  ])
})
