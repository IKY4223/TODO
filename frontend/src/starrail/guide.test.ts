import { expect, test } from 'vitest'
import { describe } from './guide'

test('puts the level\'s numbers into a description', () => {
  const text = 'Deals #1[i]% of ATK plus #2[i], for #3[f1]% and #4[f2] turns.'
  expect(describe(text, [0.45, 200, 0.125, 2.5])).toBe(
    'Deals 45% of ATK plus 200, for 12.5% and 2.5 turns.',
  )
})

test('a number the data lacks reads as unknown, not as zero', () => {
  expect(describe('Up to #5[i]% and #6[i].', [0.25])).toBe('Up to ?% and ?.')
})
