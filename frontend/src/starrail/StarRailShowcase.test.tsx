import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { StarRailShowcase as Showcase } from './starrail'
import { setLanguage } from '../i18n'
import { StarRailShowcase } from './StarRailShowcase'

const ICONS = 'https://enka.network/ui/hsr/SpriteOutput/'

const SHOWCASE: Showcase = {
  uid: '700000001',
  nickname: 'Trailblazer',
  signature: 'Looking for co-op',
  avatar: `${ICONS}AvatarRoundIcon/Avatar/8008.png`,
  trailblaze_level: 70,
  equilibrium_level: 6,
  record: { achievements: 500, characters: 40, light_cones: 70, relics: 2400 },
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
        icon: `${ICONS}ItemIcon/LightConeIcons/21054.png`,
      },
      relics: [
        {
          slot: 'head',
          set_name: 'Warrior Goddess of Sun and Thunder',
          rarity: 5,
          level: 15,
          main: { key: 'hp', value: 705.6 },
          subs: [
            { key: 'atk', value: 40.220669, rolls: 2, score: 2 },
            { key: 'spd', value: 12.1, rolls: 5, score: 4.6 },
            { key: 'effect_hit_rate', value: 0.03456, rolls: 1, score: 0.8 },
            { key: 'break_effect', value: 0.05832, rolls: 1, score: 0.9 },
          ],
          icon: `${ICONS}ItemIcon/RelicIcons/IconRelic_125_1.png`,
        },
      ],
      stats: [
        { key: 'hp', value: 4926.3 },
        { key: 'spd', value: 183.532 },
        { key: 'crit_rate', value: 0.1893 },
      ],
      skills: [
        { kind: 'basic', level: 5, bonus: 0 },
        { kind: 'skill', level: 12, bonus: 2 },
        { kind: 'ultimate', level: 10, bonus: 0 },
        { kind: 'talent', level: 9, bonus: 0 },
        { kind: 'memosprite_skill', level: 6, bonus: 0 },
        { kind: 'memosprite_talent', level: 7, bonus: 1 },
      ],
      points: [
        { id: 1409002, level: 10 },
        { id: 1409101, level: 1 },
      ],
      icon: `${ICONS}AvatarRoundIcon/Avatar/1409.png`,
    },
  ],
}

afterEach(() => {
  cleanup()
  setLanguage('en')
  localStorage.clear()
  window.location.hash = ''
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

// The term-value pairs of the <dl> that `term` belongs to.
const pairs = (term: string | RegExp): (string | null)[] => {
  const list = screen.getByText(term).closest('dl')
  return [...(list?.querySelectorAll('div') ?? [])].map((pair) => pair.textContent)
}

const rows = (list: string): (string | null)[] =>
  within(screen.getByRole('list', { name: list }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

test('asks the API for the entered UID', async () => {
  const fetchMock = load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/starrail/showcase/700000001?lang=en'])
})

test('shows who the showcase belongs to', async () => {
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByRole('heading', { name: 'Trailblazer' })).toBeDefined()
  expect(screen.getByText('Trailblaze Lv. 70 · Equilibrium 6')).toBeDefined()
  expect(screen.getByText('Looking for co-op')).toBeDefined()
  expect(pairs('Achievements')).toEqual([
    'Achievements500',
    'Characters40',
    'Light Cones70',
    'Relics2,400',
  ])
})

test('leaves out what the player keeps private', async () => {
  load(async () => Response.json({ ...SHOWCASE, signature: '', avatar: null, record: null }))
  await screen.findByRole('heading', { name: 'Trailblazer' })
  expect(screen.queryByText('Achievements')).toBeNull()
  expect(document.querySelector('.signature')).toBeNull()
})

test('shows final stats as the character screen does', async () => {
  load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  expect(pairs('4,926')).toEqual(['HP4,926', 'SPD183.5', 'CRIT Rate18.9%'])
})

test('shows skill levels with what eidolons add', async () => {
  load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  expect(pairs('Basic ATK')).toEqual([
    'Basic ATK5',
    'Skill12 (+2)',
    'Ultimate10',
    'Talent9',
    'Memosprite Skill6',
    'Memosprite Talent7 (+1)',
  ])
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
  // One substat per line, top to bottom, the way the game lists them.
  expect(rows('Head substats')).toEqual([
    'ATK 40 ×2',
    'SPD 12.1 ×5',
    'Effect Hit Rate 3.5% ×1',
    'Break Effect 5.8% ×1',
  ])
})

test('shows the showcase in Russian', async () => {
  setLanguage('ru')
  const fetchMock = vi.fn(async () => Response.json(SHOWCASE))
  vi.stubGlobal('fetch', fetchMock)
  render(<StarRailShowcase />)
  fireEvent.change(screen.getByLabelText('UID'), { target: { value: '700000001' } })
  fireEvent.click(screen.getByRole('button', { name: 'Загрузить персонажей' }))
  expect(await screen.findByText('Ур. 80 · E0 · Ветряной · Память')).toBeDefined()
  expect(fetchMock).toHaveBeenCalledWith('/api/starrail/showcase/700000001?lang=ru', expect.anything())
  // Numbers in the Russian format too: a decimal comma, a space between thousands.
  expect(rows('Голова: доп. статы')[1]).toBe('Скорость 12,1 ×5')
  expect(screen.getByText('Реликвии (1) · оценка 4,6')).toBeDefined()
  expect(pairs(/^4\s926$/)[0]).toMatch(/^HP4\s926$/)
})

test('opens a character page with skills at the player\'s levels and eidolons', async () => {
  const texts = {
    skills: [
      {
        kind: 'skill',
        label: 'Skill',
        name: 'Love Over the Rainbow',
        description: 'Restores HP equal to #1[i]% of Max HP plus #2[i].',
        params: Array.from({ length: 15 }, (_, level) => [0.01 * (level + 1), 10 * (level + 1)]),
      },
      { kind: null, label: 'Technique', name: 'Day So Right', description: 'Heals.', params: [] },
    ],
    traces: [
      { id: 1409002, name: 'Love Over the Rainbow', skill: true, description: '', params: [], costs: [{}, { '2': 100 }, { '2': 200 }] },
      { id: 1409101, name: 'Gloomy Grin', skill: false, description: 'CRIT Rate +#1[i]%.', params: [1], costs: [{ '2': 5000 }] },
      { id: 1409203, name: 'SPD Boost', skill: false, description: '+2', params: [], costs: [{ '2': 9000, '110252': 3 }] },
    ],
    items: { '2': 'Credit', '110252': 'Harmonic Tune' },
    eidolons: [
      { name: 'Cradle the Candle of Night', description: 'Max HP +50%.' },
      { name: 'Come Sit in My Courtyard', description: 'SPD +30%.' },
    ],
  }
  const fetchMock = load(async () => Response.json(SHOWCASE))
  const link = await screen.findByRole('link', { name: 'Skills and eidolons' })
  expect(link.getAttribute('href')).toBe('#starrail/builds/1409')
  fetchMock.mockImplementation(async () => Response.json(texts))
  window.location.hash = '#starrail/builds/1409'
  window.dispatchEvent(new HashChangeEvent('hashchange'))

  // The Skill is level 12 in the showcase: the twelfth set of numbers.
  expect(await screen.findByText('Restores HP equal to 12% of Max HP plus 120.')).toBeDefined()
  expect(fetchMock).toHaveBeenLastCalledWith('/api/starrail/characters/1409?lang=en', expect.anything())
  expect(screen.getByText('Skill · Lv. 12')).toBeDefined()
  expect(screen.getByText('Technique')).toBeDefined()
  expect(screen.getByRole('heading', { name: 'E1 · Cradle the Candle of Night' })).toBeDefined()
  // Gloomy Grin is unlocked in the showcase, SPD Boost is not; the Skill is at its top here.
  expect(screen.getByText('CRIT Rate +100%.')).toBeDefined()
  expect(pairs('Credit')).toEqual(['Credit9,000', 'Harmonic Tune3'])
  expect(screen.getAllByText('Not unlocked')).toHaveLength(3) // SPD Boost; Hyacine is E0
  expect(screen.queryByText('Trailblazer')).toBeNull()
  expect(screen.getByRole('link', { name: '← All characters' }).getAttribute('href')).toBe(
    '#starrail/builds',
  )
})

test('a character page says when its texts cannot be loaded', async () => {
  const fetchMock = load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  fetchMock.mockImplementation(async () =>
    Response.json({ detail: 'This app has no texts for this character yet.' }, { status: 404 }),
  )
  window.location.hash = '#starrail/builds/1409'
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  expect((await screen.findByRole('alert')).textContent).toBe(
    'This app has no texts for this character yet.',
  )
})

test('asks for the showcase again when the language changes', async () => {
  const fetchMock = load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  act(() => setLanguage('ru'))
  expect(await screen.findByText('Ур. 80 · E0 · Ветряной · Память')).toBeDefined()
  expect(fetchMock).toHaveBeenLastCalledWith('/api/starrail/showcase/700000001?lang=ru', expect.anything())
})

test('scores relics by the substats the player wants and remembers the choice', async () => {
  load(async () => Response.json(SHOWCASE))
  // SPD, CRIT Rate and CRIT DMG are wanted until the player says otherwise.
  expect(await screen.findByText('Relics (1) · score 4.6')).toBeDefined()
  expect(screen.getByText('Score 4.6')).toBeDefined()
  fireEvent.click(screen.getByLabelText('ATK'))
  expect(screen.getByText('Score 6.6')).toBeDefined()
  expect(JSON.parse(localStorage.getItem('starrail.wanted.v1') ?? '')).toEqual({
    1409: ['spd', 'crit_rate', 'crit_dmg', 'atk'],
  })
  cleanup()
  load(async () => Response.json(SHOWCASE))
  expect(await screen.findByText('Score 6.6')).toBeDefined()
})

test('shows the avatar and the character, light cone and relic icons', async () => {
  load(async () => Response.json(SHOWCASE))
  await screen.findByText('Hyacine')
  const sources = [...document.querySelectorAll('img')].map((image) => image.getAttribute('src'))
  expect(sources).toEqual([
    `${ICONS}AvatarRoundIcon/Avatar/8008.png`,
    `${ICONS}AvatarRoundIcon/Avatar/1409.png`,
    `${ICONS}ItemIcon/LightConeIcons/21054.png`,
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
    name: 'unknown skill',
    respond: async () =>
      Response.json({
        ...SHOWCASE,
        characters: [{ ...SHOWCASE.characters[0], skills: [{ kind: 'technique', level: 1, bonus: 0 }] }],
      }),
  },
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
