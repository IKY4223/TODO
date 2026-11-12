import { afterEach, beforeEach, expect, test } from 'vitest'
import { loadWanted, saveWanted } from './starrail/store'
import { loadTheme, saveTheme } from './theme'
import { EMPTY_HISTORY, loadHistory, saveHistory } from './wishes/history'

// Where site data is blocked, merely reading window.localStorage throws.
const real = Object.getOwnPropertyDescriptor(window, 'localStorage')

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => {
      throw new DOMException('Blocked', 'SecurityError')
    },
  })
})

afterEach(() => {
  if (real) Object.defineProperty(window, 'localStorage', real)
})

test('blocked site data leaves every saved choice at its default instead of breaking', () => {
  expect(loadTheme()).toBe('system')
  expect(() => saveTheme('light')).not.toThrow()
  expect(loadHistory()).toEqual(EMPTY_HISTORY)
  expect(saveHistory(EMPTY_HISTORY)).toBe(false)
  expect(loadWanted(1409)).toEqual(['spd', 'crit_rate', 'crit_dmg'])
  expect(() => saveWanted(1409, ['atk'])).not.toThrow()
})
