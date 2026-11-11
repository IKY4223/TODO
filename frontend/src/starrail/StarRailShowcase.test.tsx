import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { StarRailShowcase as Showcase } from './starrail'
import { StarRailShowcase } from './StarRailShowcase'

const ICONS = 'https://enka.network/ui/hsr/SpriteOutput/'

const SHOWCASE: Showcase = {
  uid: '700000001',
  nickname: 'Trailblazer',
  trailblaze_level: 70,
  characters: [
    {
      id: 1409,
      name: 'Hyacine',
      element: 'wind',
      path: 'remembrance',
      rarity: 5,
      level: 80,
      eidolon: 0,
      light_cone: {
        name: "The Story's Next Page",
        rarity: 4,
        level: 70,
        superimposition: 1,
        icon: `${ICONS}LightConeMaxFigures/21054.png`,
      },
      relics: [
        {
          slot: 'head',
          set_name: 'Warrior Goddess of Sun and Thunder',
          rarity: 5,
          level: 15,
          main: { key: 'hp', value: 705.6 },
          subs: [
            { key: 'atk', value: 40.220669, rolls: 2 },
            { key: 'spd', value: 12.1, rolls: 5 },
            { key: 'effect_hit_rate', value: 0.03456, rolls: 1 },
            { key: 'break_effect', value: 0.05832, rolls: 1 },
          ],
          icon: `${ICONS}ItemIcon/RelicIcons/IconRelic_125_1.png`,
        },
      ],
      icon: `${ICONS}AvatarRoundIcon/Avatar/1409.png`,
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
  render(<StarRailShowcase />)
  fireEvent.change(screen.getByLabelText('UID'), { target: { value: '700000001' } })
  fireEvent.click(screen.getByRole('button', { name: 'Load characters' }))
  return fetchMock
}

test('asks the API for the entered UID', async () => {
  const fetchMock = load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/starrail/showcase/700000001'])
})

test('shows who the showcase belongs to', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Trailblazer · Trailblaze Level 70')).toBeDefined()
})

test('shows level, eidolon, element and path', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Lv. 80 · E0 · Wind · Remembrance')).toBeDefined()
})

test('shows the light cone', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText("The Story's Next Page · Lv. 70 · S1")).toBeDefined()
})

test('shows each relic with its stats and the rolls each substat took', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Head · Warrior Goddess of Sun and Thunder +15')).toBeDefined()
  expect(screen.getByText('HP 706')).toBeDefined()
  expect(screen.getByText('ATK 40 ×2 · SPD 12.1 ×5 · Effect Hit Rate 3.5% ×1 · Break Effect 5.8% ×1')).toBeDefined()
})

test('shows the character, light cone and relic icons', async () => {
  load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  const sources = [...document.querySelectorAll('img')].map((image) => image.getAttribute('src'))
  expect(sources).toEqual([
    `${ICONS}AvatarRoundIcon/Avatar/1409.png`,
    `${ICONS}LightConeMaxFigures/21054.png`,
    `${ICONS}ItemIcon/RelicIcons/IconRelic_125_1.png`,
  ])
})

test('lists a character this app has no data for yet', async () => {
  const newcomer = {
    ...SHOWCASE.characters[0],
    name: 'Unknown character',
    element: null,
    path: null,
    rarity: null,
    light_cone: null,
    icon: null,
  }
  load(async () => Response.json({ ...SHOWCASE, characters: [newcomer] }))
  expect(await screen.findByText('Lv. 80 · E0')).toBeDefined()
  expect(screen.queryByText(/· S\d/)).toBeNull()
})

test('explains how to fill an empty showcase', async () => {
  load(async () => Response.json({ ...SHOWCASE, characters: [] }))
  expect(await screen.findByText(/Character Showcase/)).toBeDefined()
})

test.each([
  { name: 'API refusal', respond: async () => Response.json({ detail: 'Player not found. Check the UID.' }, { status: 404 }) },
  { name: 'unexpected body', respond: async () => Response.json({ characters: 'many' }) },
  {
    name: 'unknown stat',
    respond: async () =>
      Response.json({
        ...SHOWCASE,
        characters: [{ ...SHOWCASE.characters[0], relics: [{ ...SHOWCASE.characters[0].relics[0], main: { key: 'luck', value: 1 } }] }],
      }),
  },
])('$name shows an error and allows a retry', async ({ respond }) => {
  load(respond)
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.getByRole('button', { name: 'Load characters' })).toHaveProperty('disabled', false)
})
