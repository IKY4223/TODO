import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { Character } from '../showcase/showcase'
import { DamageCalculator } from './DamageCalculator'

const AMBER: Character = {
  id: 10000021,
  name: 'Amber',
  element: 'pyro',
  level: 90,
  constellation: 6,
  talents: [10, 13, 13],
  stats: [
    { key: 'atk', value: 2000 },
    { key: 'crit_rate', value: 0.5 },
    { key: 'crit_dmg', value: 1 },
    { key: 'pyro_dmg', value: 0.466 },
    { key: 'physical_dmg', value: 0.25 },
  ],
  weapon: { name: 'Skyward Harp', rarity: 5, level: 90, refinement: 2, icon: null },
  artifacts: [],
  icon: null,
}
const DAMAGE = { non_crit: 9000.4, crit: 18000.8, average: 13500.6 }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function open(character: Character, respond: () => Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(respond)
  vi.stubGlobal('fetch', fetchMock)
  render(<DamageCalculator character={character} />)
  return fetchMock
}

const change = (label: string, value: string): boolean =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const calculate = (): boolean =>
  fireEvent.click(screen.getByRole('button', { name: 'Calculate damage' }))

const value = (label: string): string | null | undefined =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent

/** The JSON body of the only request made. */
function sentBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  expect(fetchMock).toHaveBeenCalledOnce()
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/damage')
  expect(init.method).toBe('POST')
  return JSON.parse(init.body)
}

test('sends the character and the hit, with percents as fractions', async () => {
  const fetchMock = open(AMBER, async () => Response.json(DAMAGE))
  change('Talent multiplier, %', '392')
  change('Scales with', 'atk')
  change('Reaction', 'strong')
  change('Enemy level', '100')
  change('Enemy resistance, %', '10')
  calculate()
  await screen.findByText('13,501')
  expect(sentBody(fetchMock)).toEqual({
    level: 90,
    stats: AMBER.stats,
    scaling: 'atk',
    multiplier: 3.92,
    bonus: 'pyro_dmg',
    reaction: 'strong',
    enemy_level: 100,
    enemy_resistance: 0.1,
  })
})

test('shows average, crit and non-crit damage', async () => {
  open(AMBER, async () => Response.json(DAMAGE))
  calculate()
  await screen.findByText('13,501')
  expect([value('Average'), value('Crit'), value('Non-crit')]).toEqual(['13,501', '18,001', '9,000'])
})

test('offers the bonuses the character has, the first one chosen', () => {
  open(AMBER, async () => Response.json(DAMAGE))
  const options = [...screen.getByLabelText<HTMLSelectElement>('Damage bonus').options]
  expect(options.map((option) => option.textContent)).toEqual([
    'None',
    'Pyro DMG 46.6%',
    'Physical DMG 25%',
  ])
  expect(screen.getByLabelText<HTMLSelectElement>('Damage bonus').value).toBe('pyro_dmg')
})

test('sends no bonus when none is chosen', async () => {
  const fetchMock = open(AMBER, async () => Response.json(DAMAGE))
  change('Damage bonus', '')
  calculate()
  await screen.findByText('13,501')
  expect(sentBody(fetchMock)).toMatchObject({ bonus: null })
})

test('a character without bonuses starts with none', () => {
  const plain = { ...AMBER, stats: [{ key: 'atk', value: 2000 } as const] }
  open(plain, async () => Response.json(DAMAGE))
  expect(screen.getByLabelText<HTMLSelectElement>('Damage bonus').value).toBe('')
})

test.each([
  { name: 'refused request', respond: async () => Response.json({ detail: 'Too many requests.' }, { status: 429 }) },
  { name: 'unexpected body', respond: async () => Response.json({ average: 'a lot' }) },
])('$name shows an error and allows a retry', async ({ respond }) => {
  open(AMBER, respond)
  calculate()
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Calculate damage' })).toHaveProperty('disabled', false)
})
