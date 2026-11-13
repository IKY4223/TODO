import { afterEach, expect, test, vi } from 'vitest'
import { applyTheme, loadTheme, saveTheme } from './theme'

const prefers = (light: boolean): ((query: string) => MediaQueryList) =>
  vi.fn(
    (query: string) =>
      ({
        matches: light && query === '(prefers-color-scheme: light)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  )

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

test('follows the device until the player picks a theme, and remembers the pick', () => {
  expect(loadTheme()).toBe('system')
  saveTheme('light')
  expect(loadTheme()).toBe('light')
  localStorage.setItem('theme', 'sepia') // a value this app never wrote
  expect(loadTheme()).toBe('system')
})

test('a storage that refuses leaves the device’s theme', () => {
  const refusing = {
    getItem: () => {
      throw new Error('denied')
    },
    setItem: () => {
      throw new Error('denied')
    },
  } as unknown as Storage
  expect(loadTheme(refusing)).toBe('system')
  expect(() => saveTheme('dark', refusing)).not.toThrow()
})

test.each([
  { choice: 'system', light: true, shown: 'light' },
  { choice: 'system', light: false, shown: 'dark' },
  { choice: 'dark', light: true, shown: 'dark' },
  { choice: 'light', light: false, shown: 'light' },
] as const)('$choice on a $light-light device shows $shown', ({ choice, light, shown }) => {
  vi.stubGlobal('matchMedia', prefers(light))
  applyTheme(choice)
  expect(document.documentElement.dataset.theme).toBe(shown)
})
