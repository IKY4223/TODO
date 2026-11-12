import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RelicAdvisor } from './RelicAdvisor'
import type { Relic } from './starrail'
import { publishShowcase } from './store'

const FORECAST = {
  upgrades: 2,
  chances: [0.25, 0.5, 0.25],
  expected: 1,
  score: null,
  beats: null,
  reaches: null,
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const choose = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function calculate(respond: () => Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(respond)
  vi.stubGlobal('fetch', fetchMock)
  render(<RelicAdvisor />)
  choose('Main stat', 'hp')
  choose('Level', '9')
  choose('Substat 1', 'atk')
  choose('Substat 2', 'def')
  choose('Substat 3', 'spd')
  choose('Substat 4', 'crit_rate')
  fireEvent.click(screen.getByLabelText('CRIT DMG')) // on by default: switch it off
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  return fetchMock
}

test('sends the relic and the wanted substats', async () => {
  const fetchMock = calculate(async () => Response.json(FORECAST))
  await screen.findByText('2 upgrades left')
  const [[url, init]] = fetchMock.mock.calls as [[string, RequestInit]]
  expect(url).toBe('/api/starrail/relics/forecast')
  expect(JSON.parse(String(init.body))).toEqual({
    rarity: 5,
    main: 'hp',
    level: 9,
    subs: [
      { key: 'atk', value: null },
      { key: 'def', value: null },
      { key: 'spd', value: null },
      { key: 'crit_rate', value: null },
    ],
    wanted: ['spd', 'crit_rate'],
    beat: null,
    goal: null,
  })
})

test('shows the chance of at least each number of wanted upgrades', async () => {
  calculate(async () => Response.json(FORECAST))
  await screen.findByText('2 upgrades left')
  const rows = screen.getAllByRole('row').map((row) => row.textContent)
  expect(rows).toEqual(['Wanted upgradesChance', 'At least 175%', 'At least 225%'])
  expect(screen.getByText('1 on average go to the substats you want')).toBeDefined()
})

test('a relic with three substats leaves the fourth out', async () => {
  const fetchMock = vi.fn(async () => Response.json(FORECAST))
  vi.stubGlobal('fetch', fetchMock)
  render(<RelicAdvisor />)
  choose('Main stat', 'hp')
  choose('Substat 1', 'atk')
  choose('Substat 2', 'def')
  choose('Substat 3', 'spd')
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  await screen.findByText('2 upgrades left')
  const [[, init]] = fetchMock.mock.calls as unknown as [[string, RequestInit]]
  expect(JSON.parse(String(init.body))).toMatchObject({
    level: 0,
    subs: [{ key: 'atk' }, { key: 'def' }, { key: 'spd' }],
  })
})

test('sends values, a goal and the score of the equipped relic to beat', async () => {
  const relic: Relic = {
    slot: 'head',
    set_id: 125,
    set_name: 'Set',
    rarity: 5,
    level: 15,
    main: { key: 'hp', value: 705.6 },
    subs: [
      { key: 'spd', value: 5.2, rolls: 2, score: 2 },
      { key: 'atk', value: 19, rolls: 1, score: 0.9 },
    ],
    icon: null,
  }
  publishShowcase({
    uid: '700000001',
    nickname: 'Trailblazer',
    signature: '',
    avatar: null,
    trailblaze_level: 70,
    equilibrium_level: 6,
    record: null,
    characters: [
      {
        id: 1409,
        name: 'Hyacine',
        element: 'wind',
        path: 'remembrance',
        rarity: 5,
        level: 80,
        eidolon: 0,
        light_cone: null,
        relics: [relic],
        stats: [],
        bases: [],
        skills: [],
        points: [],
        icon: null,
      },
    ],
  })
  const fetchMock = vi.fn(async () =>
    Response.json({ ...FORECAST, score: 1.5, beats: 0.4321, reaches: 0.125 }),
  )
  vi.stubGlobal('fetch', fetchMock)
  render(<RelicAdvisor />)
  choose('Main stat', 'hp')
  choose('Substat 1', 'atk')
  choose('Substat 2', 'def')
  choose('Substat 3', 'spd')
  choose('Value 3', '2.6')
  choose('Goal stat', 'spd')
  choose('Goal value', '10')
  choose('Compare with', 'Hyacine · Head')
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  await screen.findByText('2 upgrades left')
  const [[, init]] = fetchMock.mock.calls as unknown as [[string, RequestInit]]
  expect(JSON.parse(String(init.body))).toMatchObject({
    subs: [
      { key: 'atk', value: null },
      { key: 'def', value: null },
      { key: 'spd', value: 2.6 },
    ],
    beat: 2, // only SPD is wanted on the equipped relic, not ATK
    goal: { key: 'spd', value: 10 },
  })
  const answers = [...document.querySelectorAll('.answers div')].map((row) => row.textContent)
  expect(answers).toEqual([
    'Score now1.5',
    'Chance to beat the equipped relic43.2%',
    'Chance to reach SPD 1012.5%',
  ])
})

test('a 4★ relic may have two substats', async () => {
  const fetchMock = vi.fn(async () => Response.json(FORECAST))
  vi.stubGlobal('fetch', fetchMock)
  render(<RelicAdvisor />)
  choose('Rarity', '4')
  choose('Main stat', 'hp')
  choose('Substat 1', 'atk')
  choose('Substat 2', 'spd')
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  await screen.findByText('2 upgrades left')
  const [[, init]] = fetchMock.mock.calls as unknown as [[string, RequestInit]]
  expect(JSON.parse(String(init.body))).toMatchObject({
    rarity: 4,
    subs: [{ key: 'atk' }, { key: 'spd' }],
  })
})

test('asks for a wanted substat before calling the API', async () => {
  const fetchMock = calculate(async () => Response.json(FORECAST))
  await screen.findByText('2 upgrades left')
  fireEvent.click(screen.getByLabelText('SPD'))
  fireEvent.click(screen.getByLabelText('CRIT Rate'))
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(/at least one substat/)
  expect(fetchMock.mock.calls).toHaveLength(1)
})

test.each([
  {
    name: 'API refusal',
    respond: async () =>
      Response.json({ detail: 'A relic cannot have the same substat twice.' }, { status: 422 }),
  },
  { name: 'unexpected body', respond: async () => Response.json({ chances: 'good' }) },
])('$name shows an error and allows a retry', async ({ respond }) => {
  calculate(respond)
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Calculate' })).toHaveProperty('disabled', false)
})
