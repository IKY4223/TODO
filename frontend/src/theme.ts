import { useEffect, useState } from 'react'

export const THEMES = ['system', 'dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

const STORAGE_KEY = 'theme'
const LIGHT = '(prefers-color-scheme: light)'

const isTheme = (value: unknown): value is Theme => THEMES.some((theme) => theme === value)

/** The saved choice; the device decides until the player picks one. */
// The storage is reached inside each `try`: where site data is blocked, even reading
// window.localStorage throws.
export function loadTheme(storage?: Storage): Theme {
  try {
    const store = storage ?? window.localStorage
    const saved = store.getItem(STORAGE_KEY)
    return isTheme(saved) ? saved : 'system'
  } catch {
    return 'system' // storage is off
  }
}

export function saveTheme(theme: Theme, storage?: Storage): void {
  try {
    const store = storage ?? window.localStorage
    store.setItem(STORAGE_KEY, theme)
  } catch {
    // The choice then lasts until the page closes.
  }
}

const deviceQuery = (): MediaQueryList | undefined =>
  typeof window.matchMedia === 'function' ? window.matchMedia(LIGHT) : undefined

/** The theme on screen: the device's while the player has not picked one. */
export const shownTheme = (theme: Theme): 'dark' | 'light' =>
  theme === 'light' || (theme === 'system' && (deviceQuery()?.matches ?? false)) ? 'light' : 'dark'

/** Shows a theme: index.css keys its colours off `data-theme` on the root element. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.dataset.theme = shownTheme(theme)
  // The phone's own bar above the page takes the page's background.
  const background = getComputedStyle(root).getPropertyValue('--color-background').trim()
  if (background)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
}

/** The theme on screen and a way to pick one: shown, saved and kept in step with the device
 * while the player has not picked one. */
export function useTheme(): readonly ['dark' | 'light', Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState(loadTheme)
  // The device's own theme, kept in state so a change on the device redraws the page's controls.
  const [deviceLight, setDeviceLight] = useState(() => deviceQuery()?.matches ?? false)
  useEffect(() => {
    applyTheme(theme)
    const query = deviceQuery()
    if (theme !== 'system' || !query) return undefined
    const follow = (): void => {
      applyTheme('system')
      setDeviceLight(query.matches)
    }
    query.addEventListener('change', follow)
    return (): void => query.removeEventListener('change', follow)
  }, [theme])
  const choose = (next: Theme): void => {
    saveTheme(next)
    setTheme(next)
  }
  const shown = theme === 'system' ? (deviceLight ? 'light' : 'dark') : theme
  return [shown, theme, choose]
}
