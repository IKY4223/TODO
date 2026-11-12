import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { WishForecast } from './WishForecast'

const FORECAST = {
  probability: 0.4321,
  guaranteed_at: 170,
  milestones: [
    { chance: 0.5, pulls: 70 },
    { chance: 0.9, pulls: 145 },
    { chance: 0.99, pulls: 151 },
  ],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function calculate(respond: () => Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(respond)
  vi.stubGlobal('fetch', fetchMock)
  render(<WishForecast game="genshin" />)
  fireEvent.change(screen.getByLabelText('Pulls since last 5★'), { target: { value: '10' } })
  fireEvent.click(screen.getByLabelText('Next 5★ is guaranteed'))
  fireEvent.change(screen.getByLabelText('Pulls available'), { target: { value: '80' } })
  fireEvent.change(screen.getByLabelText('Target'), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  return fetchMock
}

test('asks the API with the entered values', async () => {
  const fetchMock = calculate(async () => Response.json(FORECAST))
  await screen.findByText('43.2%')
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/wishes/forecast?banner=genshin_character&pity=10&guaranteed=true&copies=2&pulls=80',
  ])
})

const targets = (): string[] =>
  [...screen.getByLabelText<HTMLSelectElement>('Target').options].map((option) => option.text)

test('Star Rail offers both warps, with light cones counted from S1 and pity up to 79', async () => {
  const fetchMock = vi.fn(async () => Response.json(FORECAST))
  vi.stubGlobal('fetch', fetchMock)
  render(<WishForecast game="starrail" />)
  expect(targets()).toEqual(['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
  fireEvent.change(screen.getByLabelText('Banner'), { target: { value: 'starrail_light_cone' } })
  expect(targets()).toEqual(['S1', 'S2', 'S3', 'S4', 'S5'])
  expect(screen.getByLabelText('Pulls since last 5★').getAttribute('max')).toBe('79')
  fireEvent.change(screen.getByLabelText('Pulls available'), { target: { value: '80' } })
  fireEvent.click(screen.getByRole('button', { name: 'Calculate' }))
  await screen.findByText('43.2%')
  expect(screen.getByRole('heading', { name: 'Warp forecast' })).toBeDefined()
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/wishes/forecast?banner=starrail_light_cone&pity=0&guaranteed=false&copies=1&pulls=80',
    expect.anything(),
  )
})

test('shows the chance and the pulls needed for each milestone', async () => {
  calculate(async () => Response.json(FORECAST))
  expect(await screen.findByText('43.2%')).toBeDefined()
  const rows = ['50% 70', '90% 145', '99% 151', '100% 170']
  rows.forEach((name) => expect(screen.getByRole('row', { name })).toBeDefined())
})

test('never rounds an uncertain chance up to 100%', async () => {
  calculate(async () => Response.json({ ...FORECAST, probability: 0.99996 }))
  expect(await screen.findByText('99.9%')).toBeDefined()
})

test.each([
  { name: 'server error', respond: async () => new Response(null, { status: 500 }) },
  { name: 'unexpected body', respond: async () => Response.json({ probability: 'high' }) },
  {
    name: 'network failure',
    respond: async (): Promise<Response> => {
      throw new TypeError('Failed to fetch')
    },
  },
])('$name shows an error and allows a retry', async ({ respond }) => {
  calculate(respond)
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Calculate' })).toHaveProperty('disabled', false)
})

test('blocks a second request while one is running', () => {
  calculate(() => new Promise<Response>(() => {}))
  expect(screen.getByRole('button', { name: 'Calculate' })).toHaveProperty('disabled', true)
})
