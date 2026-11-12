import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const current = (navigation: string): string | null | undefined =>
  within(screen.getByRole('navigation', { name: navigation }))
    .getAllByRole('link')
    .find((link) => link.getAttribute('aria-current') === 'page')?.textContent

const shown = (): HTMLElement => screen.getByRole('region')

test('opens on Star Rail builds', () => {
  render(<App />)
  expect(current('Games')).toBe('Star Rail')
  expect(current('Tools')).toBe('Builds')
  expect(within(shown()).getByText(/Honkai: Star Rail/)).toBeDefined()
})

test.each([
  { address: '#genshin/builds', game: 'Genshin', tool: 'Builds', heading: 'Character builds' },
  { address: '#genshin/wishes', game: 'Genshin', tool: 'Wishes', heading: 'Wish forecast' },
  { address: '#genshin/history', game: 'Genshin', tool: 'History', heading: 'Wish history' },
  { address: '#starrail/builds', game: 'Star Rail', tool: 'Builds', heading: 'Character builds' },
  { address: '#starrail/relics', game: 'Star Rail', tool: 'Relics', heading: 'Relic advisor' },
])('$address shows $game $tool', async ({ address, game, tool, heading }) => {
  render(<App />)
  window.location.hash = address
  expect(await screen.findByRole('heading', { name: heading })).toBeDefined()
  expect(current('Games')).toBe(game)
  expect(current('Tools')).toBe(tool)
})

const tools = (): (string | null)[] =>
  within(screen.getByRole('navigation', { name: 'Tools' }))
    .getAllByRole('link')
    .map((link) => link.textContent)

test('each game lists only its own tools', async () => {
  render(<App />)
  expect(tools()).toEqual(['Builds', 'Relics', 'Warps', 'Speed'])
  window.location.hash = '#genshin/builds'
  await screen.findByRole('link', { name: 'Wishes' })
  expect(tools()).toEqual(['Builds', 'Wishes', 'History'])
})

test('a game link opens that game on its first tool', () => {
  render(<App />)
  const genshin = within(screen.getByRole('navigation', { name: 'Games' })).getByRole('link', { name: 'Genshin' })
  expect(genshin.getAttribute('href')).toBe('#genshin/builds')
})

test.each(['#toString', '#genshin/toString', '#starrail/history', '#genshin'])(
  'an unknown address %s falls back to a tool that exists',
  (address) => {
    window.location.hash = address
    render(<App />)
    expect(current('Tools')).toBe('Builds')
  },
)

test('switches to Russian and remembers it', () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ru' } })
  expect(screen.getByRole('navigation', { name: 'Игры' })).toBeDefined()
  expect(screen.getByRole('link', { name: 'Реликвии' })).toBeDefined()
  expect(within(shown()).getByRole('heading', { name: 'Билды персонажей' })).toBeDefined()
  expect(document.documentElement.lang).toBe('ru')
  expect(localStorage.getItem('language')).toBe('ru')
  fireEvent.change(screen.getByLabelText('Язык'), { target: { value: 'en' } })
  expect(screen.getByRole('navigation', { name: 'Games' })).toBeDefined()
})
