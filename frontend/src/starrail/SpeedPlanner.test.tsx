import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { StarRailCharacter } from './starrail'
import { SpeedPlanner } from './SpeedPlanner'
import { publishShowcase } from './store'

afterEach(cleanup)

const character = (
  id: number,
  name: string,
  spd: number,
  extra: Partial<StarRailCharacter> = {},
): StarRailCharacter => ({
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
  bases: [{ key: 'spd', value: spd }],
  skills: [],
  points: [],
  icon: null,
  ...extra,
})

function show(characters: StarRailCharacter[]): void {
  publishShowcase({
    uid: '700000001',
    nickname: 'Trailblazer',
    signature: '',
    avatar: null,
    trailblaze_level: 70,
    equilibrium_level: 6,
    record: null,
    characters,
  })
  render(<SpeedPlanner />)
}

const timeline = (): string[] =>
  [...document.querySelectorAll('.timeline li')].map((item) => item.textContent ?? '')

test('asks for a showcase first', () => {
  show([])
  expect(screen.getByText(/Load your characters in Builds/)).toBeDefined()
})

test('lays out the turn order by cycle with turn counts and the next breakpoint', () => {
  show([character(1, 'Slow', 120), character(2, 'Fast', 160)])
  expect(timeline().slice(0, 4)).toEqual([
    'Cycle 062.5 · Fast',
    '83.3 · Slow',
    '125.0 · Fast',
    'Cycle 1166.7 · Slow',
  ])
  const fast = screen.getAllByRole('article')[1]
  expect([...(fast?.querySelectorAll('dl div') ?? [])].map((row) => row.textContent)).toEqual([
    'Turns by cycle 02',
    'Turns by cycle 14',
    'Turns by cycle 25',
  ])
  expect(
    screen.getByText('Without effects: one more turn in cycle 0 at 133.4 SPD (+13.4)'),
  ).toBeDefined()
})

test('a known support speeds up the chosen ally, and the effect can be switched off', () => {
  // Bronya advances the chosen ally by 100% every turn.
  show([character(1101, 'Bronya', 100), character(2, 'DPS', 90)])
  expect(timeline().slice(0, 2)).toEqual(['Cycle 0100.0 · Bronya', '100.0 · DPS'])
  expect(screen.getByLabelText('Chosen ally')).toHaveProperty('value', '2')
  const skill = screen.getByText(/Every turn · Chosen ally: action advance \+100%/)
  fireEvent.click(skill)
  expect(timeline()[1]).toBe('111.1 · DPS')
})

test('the Ultimate comes on the chosen beat', () => {
  show([character(1, 'Solo', 100)])
  fireEvent.change(screen.getByLabelText('Ultimate every N turns'), { target: { value: '1' } })
  expect(timeline()[0]).toBe('Cycle 0100.0 · Solo · Ultimate')
})

test('memosprites and summons take their own turns', () => {
  show([character(1402, 'Aglaea', 200)])
  // Garmentmaker runs at 35% of Aglaea's SPD: 70, a turn at 142.9.
  expect(timeline()).toContain('142.9 · Memosprite of Aglaea')
})

test('a team has at most four members', () => {
  show([1, 2, 3, 4, 5].map((id) => character(id, `C${id}`, 100)))
  const fifth = screen.getByLabelText('C5')
  expect(fifth).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByLabelText('C1'))
  expect(screen.getByLabelText('C5')).toHaveProperty('disabled', false)
})

test("an effect counted from the source's SPD, and one that waits to be switched on", () => {
  // Hanya gives 20% of her own SPD on Ultimate; Sushang's talent needs a broken enemy.
  show([character(1215, 'Hanya', 150), character(1206, 'Sushang', 100)])
  expect(screen.getByText('On Ultimate · Chosen ally: SPD +30 · lasts 2 turn(s)')).toBeDefined()
  const talent = screen.getByLabelText(/Always · Self: SPD \+20%/)
  expect(talent).toHaveProperty('checked', false)
  fireEvent.click(talent)
  // 120 SPD from the first moment: the first turn comes at 83.3 instead of 100.
  expect(timeline()).toContain('83.3 · Sushang')
})

test("Firefly's Complete Combustion ends on its countdown's turn", () => {
  show([character(1310, 'Firefly', 100)])
  fireEvent.change(screen.getByLabelText('Ultimate every N turns'), { target: { value: '1' } })
  // Skill advance 25% at 100, then the Ultimate: advance 100%, SPD 160, countdown at SPD 70.
  expect(timeline().slice(0, 5)).toEqual([
    'Cycle 0100.0 · Firefly · Ultimate',
    '100.0 · Firefly',
    'Cycle 1162.5 · Firefly',
    '225.0 · Firefly',
    '242.9 · Countdown of Firefly',
  ])
})

test('an enemy with the SPD typed in takes turns, and Welt slows it', () => {
  show([character(1004, 'Welt', 100)])
  expect(timeline().join()).not.toContain('Enemy')
  fireEvent.change(screen.getByLabelText('Enemy SPD'), { target: { value: '100' } })
  // Welt acts first on the tie and slows the enemy by 10%: its next turn comes at 90 SPD.
  const enemy = timeline().filter((line) => line.includes('Enemy'))
  expect(enemy.slice(0, 2)).toEqual(['100.0 · Enemy', '211.1 · Enemy'])
})

test("Jingliu's Spectral Transmigration advances her action at two Syzygy", () => {
  show([character(1212, 'Jingliu', 100)])
  fireEvent.change(screen.getByLabelText('Ultimate every N turns'), { target: { value: '0' } })
  expect(timeline().slice(0, 4)).toEqual([
    'Cycle 0100.0 · Jingliu',
    'Cycle 1200.0 · Jingliu',
    '200.0 · Jingliu',
    'Cycle 2300.0 · Jingliu',
  ])
})

test('a character without known effects says so instead of staying silent', () => {
  show([character(1, 'Newcomer', 100)])
  expect(
    screen.getByText('No effects on the turn order are known for this character yet.'),
  ).toBeDefined()
})

test("Robin's Concerto holds her turns until its countdown acts", () => {
  show([character(1309, 'Robin', 100), character(2, 'DPS', 100)])
  fireEvent.change(screen.getAllByLabelText('Ultimate every N turns')[0] as HTMLElement, {
    target: { value: '1' },
  })
  const robin = timeline().filter((line) => line.includes('Robin'))
  // The Ultimate at 100 starts Concerto; the SPD 90 countdown acts at 211.1, and she with it.
  expect(robin.slice(0, 3)).toEqual([
    'Cycle 0100.0 · Robin · Ultimate',
    '211.1 · Countdown of Robin',
    '211.1 · Robin · Ultimate',
  ])
})
