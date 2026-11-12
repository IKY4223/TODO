import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { setLanguage } from '../i18n'
import { CharacterShowcase } from './CharacterShowcase'
import type { Showcase } from './showcase'

const ICONS = 'https://enka.network/ui/'

const SHOWCASE: Showcase = {
  uid: '618285856',
  nickname: 'Lumine',
  adventure_rank: 57,
  characters: [
    {
      id: 10000021,
      name: 'Amber',
      element: 'pyro',
      level: 90,
      constellation: 6,
      talents: [10, 13, 13],
      stats: [
        { key: 'hp', value: 14241.1758 },
        { key: 'crit_rate', value: 0.5194 },
        { key: 'physical_dmg', value: 1.083 },
      ],
      weapon: {
        name: 'Skyward Harp',
        rarity: 5,
        level: 90,
        refinement: 2,
        icon: `${ICONS}UI_EquipIcon_Bow_Dvalin.png`,
      },
      artifacts: [
        {
          slot: 'flower',
          set_name: 'Bloodstained Chivalry',
          rarity: 5,
          level: 20,
          main: { key: 'hp', value: 4780 },
          subs: [
            { key: 'def', value: 37 },
            { key: 'atk_percent', value: 0.111 },
            { key: 'crit_dmg', value: 0.187 },
            { key: 'elemental_mastery', value: 19 },
          ],
          icon: `${ICONS}UI_RelicIcon_15008_4.png`,
        },
      ],
      icon: `${ICONS}UI_AvatarIcon_Ambor.png`,
    },
  ],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function load(respond: () => Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(respond)
  vi.stubGlobal('fetch', fetchMock)
  render(<CharacterShowcase />)
  fireEvent.change(screen.getByLabelText('UID'), { target: { value: '618285856' } })
  fireEvent.click(screen.getByRole('button', { name: 'Load characters' }))
  return fetchMock
}

const rows = (list: string): (string | null)[] =>
  within(screen.getByRole('list', { name: list }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

const statValue = (label: string): string | null | undefined =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent

test('asks the API for the entered UID', async () => {
  const fetchMock = load(async () => Response.json(SHOWCASE))
  await screen.findByText('Amber')
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/showcase/618285856'])
})

test('shows who the showcase belongs to', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Lumine · AR 57')).toBeDefined()
})

test('shows level, constellation, element and talents', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Lv. 90 · C6 · Pyro')).toBeDefined()
  expect(screen.getByText('Talents 10 / 13 / 13')).toBeDefined()
})

test.each([
  { label: 'HP', value: '14,241' },
  { label: 'CRIT Rate', value: '51.9%' },
  { label: 'Physical DMG', value: '108.3%' },
])('formats $label as $value', async ({ label, value }) => {
  load(async () => Response.json(SHOWCASE))
  await screen.findByText('Amber')
  expect(statValue(label)).toBe(value)
})

test('shows the weapon and each artifact with its stats', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Skyward Harp · Lv. 90 · R2')).toBeDefined()
  expect(screen.getByText('Flower · Bloodstained Chivalry +20')).toBeDefined()
  expect(screen.getByText('HP 4,780')).toBeDefined()
  expect(rows('Flower substats')).toEqual(['DEF 37', 'ATK 11.1%', 'CRIT DMG 18.7%', 'EM 19'])
})

const iconSources = (): (string | null)[] =>
  [...document.querySelectorAll('img')].map((image) => image.getAttribute('src'))

test('shows the character, weapon and artifact icons', async () => {
  load(async () => Response.json(SHOWCASE))
  await screen.findByText('Amber')
  expect(iconSources()).toEqual([
    `${ICONS}UI_AvatarIcon_Ambor.png`,
    `${ICONS}UI_EquipIcon_Bow_Dvalin.png`,
    `${ICONS}UI_RelicIcon_15008_4.png`,
  ])
})

test('leaves out an icon the API does not have', async () => {
  const amber = SHOWCASE.characters[0]
  const bare = { ...amber, icon: null, weapon: { ...amber.weapon, icon: null }, artifacts: [] }
  load(async () => Response.json({ ...SHOWCASE, characters: [bare] }))
  await screen.findByText('Amber')
  expect(iconSources()).toEqual([])
})

test('lists a character whose element and talents are unknown', async () => {
  const newcomer = { ...SHOWCASE.characters[0], name: 'Unknown character', element: null, talents: [] }
  load(async () => Response.json({ ...SHOWCASE, characters: [newcomer] }))
  expect(await screen.findByText('Lv. 90 · C6')).toBeDefined()
  expect(screen.queryByText(/^Talents/)).toBeNull()
})

test('explains how to fill an empty showcase', async () => {
  load(async () => Response.json({ ...SHOWCASE, characters: [] }))
  expect(await screen.findByText(/Show Character Details/)).toBeDefined()
})

test('shows the reason the API gives for a failure', async () => {
  const detail = 'Player not found. Check the UID.'
  load(async () => Response.json({ detail }, { status: 404 }))
  expect((await screen.findByRole('alert')).textContent).toBe(detail)
})

test.each([
  { name: 'error without a reason', respond: async () => new Response(null, { status: 502 }) },
  { name: 'unexpected body', respond: async () => Response.json({ characters: 'many' }) },
  {
    name: 'unknown stat',
    respond: async () =>
      Response.json({
        ...SHOWCASE,
        characters: [{ ...SHOWCASE.characters[0], stats: [{ key: 'luck', value: 1 }] }],
      }),
  },
])('$name shows an error and allows a retry', async ({ respond }) => {
  load(respond)
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Load characters' })).toHaveProperty('disabled', false)
})

test('shows the showcase in Russian', async () => {
  setLanguage('ru')
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(SHOWCASE)))
  render(<CharacterShowcase />)
  fireEvent.change(screen.getByLabelText('UID'), { target: { value: '618285856' } })
  fireEvent.click(screen.getByRole('button', { name: 'Загрузить персонажей' }))
  expect(await screen.findByText('Lumine · Ранг приключений 57')).toBeDefined()
  expect(screen.getByText('Ур. 90 · C6 · Пиро')).toBeDefined()
  expect(screen.getByText('Таланты 10 / 13 / 13')).toBeDefined()
  setLanguage('en')
})
