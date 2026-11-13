import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const shown = (): HTMLElement => screen.getByRole('region')
const game = (): string | null | undefined =>
  within(screen.getByRole('banner')).getByTestId('game').textContent
const currentIn = (navigation: string): string | null | undefined =>
  within(screen.getByRole('navigation', { name: navigation }))
    .getAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'page')?.textContent
const openMenu = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
}

test('opens on Star Rail builds', () => {
  render(<App />)
  expect(game()).toBe('Star Rail')
  expect(currentIn('Tools')).toBe('Builds')
  expect(within(shown()).getByText(/Honkai: Star Rail/)).toBeDefined()
})

test.each([
  { address: '#genshin/builds', name: 'Genshin', tool: 'Builds', heading: 'Character builds' },
  { address: '#genshin/wishes', name: 'Genshin', tool: 'Wishes', heading: 'Wish forecast' },
  { address: '#genshin/history', name: 'Genshin', tool: 'History', heading: 'Wish history' },
  { address: '#starrail/builds', name: 'Star Rail', tool: 'Builds', heading: 'Character builds' },
  { address: '#starrail/relics', name: 'Star Rail', tool: 'Relics', heading: 'Relic advisor' },
])('$address shows $name $tool', async ({ address, name, tool, heading }) => {
  render(<App />)
  window.location.hash = address
  expect(await screen.findByRole('heading', { name: heading })).toBeDefined()
  expect(game()).toBe(name)
  expect(currentIn('Tools')).toBe(tool)
})

const tools = (): (string | null)[] =>
  within(screen.getByRole('navigation', { name: 'Tools' }))
    .getAllByRole('link')
    .map((link) => link.textContent)

test('each game lists only its own tools', async () => {
  render(<App />)
  expect(tools()).toEqual(['Builds', 'Relics', 'Warps', 'History', 'Speed'])
  window.location.hash = '#genshin/builds'
  await screen.findByRole('link', { name: 'Wishes' })
  expect(tools()).toEqual(['Builds', 'Wishes', 'History'])
})

test('the menu lists every tool of every game and marks where you are', () => {
  render(<App />)
  const button = screen.getByRole('button', { name: 'Menu' })
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('navigation', { name: 'Genshin' })).toBeNull()
  openMenu()
  expect(button.getAttribute('aria-expanded')).toBe('true')
  const genshin = within(screen.getByRole('navigation', { name: 'Genshin' }))
  expect(genshin.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    '#genshin/builds',
    '#genshin/wishes',
    '#genshin/history',
  ])
  expect(currentIn('Star Rail')).toBe('Builds')
  expect(currentIn('Genshin')).toBeUndefined()
})

const closed = (): boolean => screen.queryByRole('navigation', { name: 'Genshin' }) === null

test('the menu closes after a choice, on Escape and on a tap outside', () => {
  render(<App />)
  openMenu()
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Genshin' })).getByText('Wishes'))
  expect(closed()).toBe(true)
  openMenu()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(closed()).toBe(true)
  openMenu()
  fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
  expect(closed()).toBe(true)
})

test.each(['#toString', '#genshin/toString', '#starrail/wishes', '#genshin'])(
  'an unknown address %s falls back to a tool that exists',
  (address) => {
    window.location.hash = address
    render(<App />)
    expect(currentIn('Tools')).toBe('Builds')
  },
)

test('switches to Russian and remembers it', () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ru' } })
  expect(screen.getByRole('button', { name: 'Меню' })).toBeDefined()
  expect(screen.getByRole('link', { name: 'Реликвии' })).toBeDefined()
  expect(within(shown()).getByRole('heading', { name: 'Билды персонажей' })).toBeDefined()
  expect(document.documentElement.lang).toBe('ru')
  expect(localStorage.getItem('language')).toBe('ru')
  fireEvent.change(screen.getByLabelText('Язык'), { target: { value: 'en' } })
  expect(screen.getByRole('button', { name: 'Menu' })).toBeDefined()
})

test('on a wide screen the menu stays open beside the page in place of the tabs', () => {
  const listeners = new Set<() => void>()
  const query = {
    matches: true,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }
  window.matchMedia = (() => query) as unknown as typeof window.matchMedia
  try {
    const { unmount } = render(<App />)
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Tools' })).toBeNull()
    const sidebar = screen.getByRole('complementary', { name: 'Menu' })
    expect(within(sidebar).getByRole('navigation', { name: 'Genshin' })).toBeDefined()
    query.matches = false
    for (const listener of listeners) act(listener)
    expect(screen.getByRole('button', { name: 'Menu' })).toBeDefined()
    unmount()
    expect(listeners.size).toBe(0)
  } finally {
    Reflect.deleteProperty(window, 'matchMedia')
  }
})

test('the menu switches between a dark and a light theme and remembers it', () => {
  render(<App />)
  openMenu()
  const theme = screen.getByLabelText('Theme')
  expect((theme as HTMLSelectElement).value).toBe('system')
  expect(document.documentElement.dataset.theme).toBe('dark') // jsdom prefers no light theme
  fireEvent.change(theme, { target: { value: 'light' } })
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ru' } })
  const options = within(screen.getByLabelText('Тема')).getAllByRole('option')
  expect(options.map((option) => option.textContent)).toEqual([
    'Как на устройстве',
    'Тёмная',
    'Светлая',
  ])
  fireEvent.change(screen.getByLabelText('Язык'), { target: { value: 'en' } })
  localStorage.removeItem('theme')
})
