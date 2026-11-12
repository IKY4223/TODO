import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { StarRailCharacter } from './starrail'
import { SpeedPlanner } from './SpeedPlanner'
import { publishShowcase } from './store'

afterEach(cleanup)

const character = (id: number, name: string, spd: number): StarRailCharacter => ({
  id,
  name,
  element: null,
  path: null,
  rarity: 5,
  level: 80,
  eidolon: 0,
  light_cone: null,
  relics: [],
  stats: [{ key: 'spd', value: spd }],
  skills: [],
  points: [],
  icon: null,
})

test('asks for a showcase first', () => {
  render(<SpeedPlanner />)
  expect(screen.getByText(/Load your characters in Builds/)).toBeDefined()
})

test('lists characters fastest first with their turns and the next breakpoint', () => {
  publishShowcase({
    uid: '700000001',
    nickname: 'Trailblazer',
    signature: '',
    avatar: null,
    trailblaze_level: 70,
    equilibrium_level: 6,
    record: null,
    characters: [character(1, 'Slow', 120), character(2, 'Fast', 160)],
  })
  render(<SpeedPlanner />)
  expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
    'Fast',
    'Slow',
  ])
  const fast = screen.getAllByRole('article')[0]
  expect([...(fast?.querySelectorAll('dl div') ?? [])].map((row) => row.textContent)).toEqual([
    'Turns by cycle 02',
    'Turns by cycle 14',
    'Turns by cycle 25',
  ])
  expect(screen.getByText('One more turn in cycle 0 at 133.4 SPD (+13.4)')).toBeDefined()
})
