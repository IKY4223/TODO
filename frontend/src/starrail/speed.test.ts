import { expect, test } from 'vitest'
import { actionsBy, nextBreakpoint } from './speed'

test('counts the turns taken by the end of each cycle', () => {
  // 134 SPD is the well-known breakpoint for two turns in the first cycle.
  expect(actionsBy(133.3, 0)).toBe(1)
  expect(actionsBy(134, 0)).toBe(2)
  expect([0, 1, 2].map((cycle) => actionsBy(160, cycle))).toEqual([2, 4, 5])
})

test('an exact breakpoint counts, despite float noise', () => {
  expect(actionsBy(nextBreakpoint(120, 0), 0)).toBe(2)
})

test('gives the SPD for one more turn', () => {
  expect(nextBreakpoint(120, 0)).toBeCloseTo(133.33, 2)
  expect(nextBreakpoint(160, 1)).toBeCloseTo(200, 6)
})
