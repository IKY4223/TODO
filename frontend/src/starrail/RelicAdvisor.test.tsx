import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RelicAdvisor } from './RelicAdvisor'

const FORECAST = { upgrades: 2, chances: [0.25, 0.5, 0.25], expected: 1 }

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
    main: 'hp',
    level: 9,
    subs: ['atk', 'def', 'spd', 'crit_rate'],
    wanted: ['spd', 'crit_rate'],
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
  expect(JSON.parse(String(init.body))).toMatchObject({ level: 0, subs: ['atk', 'def', 'spd'] })
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
