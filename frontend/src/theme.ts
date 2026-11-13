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

/** Shows a theme: index.css keys its colours off `data-theme` on the root element. */
export function applyTheme(theme: Theme): void {
  const light = theme === 'light' || (theme === 'system' && (deviceQuery()?.matches ?? false))
  const root = document.documentElement
  root.dataset.theme = light ? 'light' : 'dark'
  // The phone's own bar above the page takes the page's background.
  const background = getComputedStyle(root).getPropertyValue('--color-background').trim()
  if (background)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
}

/** The player's theme, shown, saved and kept in step with the device while it is "system". */
export function useTheme(): readonly [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState(loadTheme)
  useEffect(() => {
    applyTheme(theme)
    const query = deviceQuery()
    if (theme !== 'system' || !query) return undefined
    const follow = (): void => applyTheme('system')
    query.addEventListener('change', follow)
    return (): void => query.removeEventListener('change', follow)
  }, [theme])
  const choose = (next: Theme): void => {
    saveTheme(next)
    setTheme(next)
  }
  return [theme, choose]
}
