import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import { useAddress } from './address'
import { Landing } from './Landing'
import { ToolIcon, type ToolIconName } from './ui/ToolIcon'
import { ErrorBoundary } from './ErrorBoundary'
import { languageLabel, languages, type Message, setLanguage, useLanguage, useT } from './i18n'
import { CharacterShowcase } from './showcase/CharacterShowcase'
import { RelicAdvisor } from './starrail/RelicAdvisor'
import { SpeedPlanner } from './starrail/SpeedPlanner'
import { WarpHistory } from './starrail/WarpHistory'
import { StarRailShowcase } from './starrail/StarRailShowcase'
import { type Theme, useTheme } from './theme'
import { WishForecast } from './wishes/WishForecast'
import { WishHistory } from './wishes/WishHistory'

interface ToolEntry {
  readonly label: Message
  readonly icon: ToolIconName
  readonly element: ReactNode
}

interface GameEntry {
  readonly label: string
  /** The first tool is where the game opens. */
  readonly tools: Readonly<Record<string, ToolEntry>>
}

// Each tool lives at its own #game/tool address, so the back button and bookmarks work.
// Star Rail comes first: it is where new work goes (see CLAUDE.md).
const GAMES = {
  starrail: {
    label: 'Star Rail',
    tools: {
      builds: { label: 'Builds', icon: 'builds', element: <StarRailShowcase /> },
      relics: { label: 'Relics', icon: 'relics', element: <RelicAdvisor /> },
      warps: { label: 'Warps', icon: 'warps', element: <WishForecast game="starrail" /> },
      history: { label: 'History', icon: 'history', element: <WarpHistory /> },
      speed: { label: 'Speed', icon: 'speed', element: <SpeedPlanner /> },
    },
  },
  genshin: {
    label: 'Genshin',
    tools: {
      builds: { label: 'Builds', icon: 'builds', element: <CharacterShowcase /> },
      wishes: { label: 'Wishes', icon: 'warps', element: <WishForecast game="genshin" /> },
      history: { label: 'History', icon: 'history', element: <WishHistory /> },
    },
  },
} as const satisfies Record<string, GameEntry>
type Game = keyof typeof GAMES

const DEFAULT_GAME: Game = 'starrail'
const SEPARATOR = '/'

const isGame = (value: string): value is Game => Object.hasOwn(GAMES, value)
const games = Object.keys(GAMES).filter(isGame)
const toolsOf = (game: Game): string[] => Object.keys(GAMES[game].tools)
const toolEntry = (game: Game, tool: string): ToolEntry | undefined =>
  (GAMES[game].tools as Readonly<Record<string, ToolEntry>>)[tool] // widened only to look up by name

/** The game and tool an address names, or the nearest place that exists. */
function locate(address: string): { readonly game: Game; readonly tool: string } {
  const [game = '', tool = ''] = address.split(SEPARATOR)
  const shownGame = isGame(game) ? game : DEFAULT_GAME
  const [firstTool = ''] = toolsOf(shownGame)
  return { game: shownGame, tool: Object.hasOwn(GAMES[shownGame].tools, tool) ? tool : firstTool }
}

const href = (game: Game, tool: string): string => `#${game}${SEPARATOR}${tool}`
const HOME = 'home'

// A press this long on the theme button goes back to the device's theme.
const HOLD_MS = 500
const THEME_MODES = {
  system: 'as on the device',
  dark: 'dark',
  light: 'light',
} as const satisfies Record<Theme, Message>
const THEME_ICONS = { system: 'auto', dark: 'moon', light: 'sun' } as const

const MENU = 'menu'
const CLOSE_KEY = 'Escape'
// From this width the menu stays open beside the page and the tabs go.
const WIDE = '(min-width: 64rem)'

const wideQuery = (): MediaQueryList | undefined =>
  typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : undefined

function useWide(): boolean {
  const [wide, setWide] = useState(() => wideQuery()?.matches ?? false)
  useEffect(() => {
    const query = wideQuery()
    if (!query) return undefined
    const update = (): void => setWide(query.matches)
    query.addEventListener('change', update)
    return (): void => query.removeEventListener('change', update)
  }, [])
  return wide
}

function App(): JSX.Element {
  const address = useAddress()
  const here = locate(address)
  // The start page is the bare address, or #home; every tool keeps its own #game/tool address.
  const home = address === '' || address === HOME
  const t = useT()
  const language = useLanguage()
  const [open, setOpen] = useState(false)
  const wide = useWide()
  const [shownTheme, theme, setTheme] = useTheme()
  const hold = useRef<number | undefined>(undefined)
  const held = useRef(false)
  // A long press goes back to the device's theme; the click that ends it then does nothing.
  const press = (): void => {
    held.current = false
    hold.current = window.setTimeout(() => {
      held.current = true
      setTheme('system')
    }, HOLD_MS)
  }
  const release = (): void => window.clearTimeout(hold.current)

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY) setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return (): void => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  const menu = [
    <nav key="home" aria-label={t('Home')}>
      <a href={`#${HOME}`} aria-current={home ? 'page' : undefined} onClick={() => setOpen(false)}>
        <ToolIcon name="home" />
        <span>{t('Home')}</span>
      </a>
    </nav>,
    ...games.map((game) => (
      <nav key={game} aria-label={GAMES[game].label}>
        <h2>{GAMES[game].label}</h2>
        {toolsOf(game).map((tool) => (
          <a
            key={tool}
            href={href(game, tool)}
            aria-current={!home && game === here.game && tool === here.tool ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <ToolIcon name={toolEntry(game, tool)?.icon ?? 'builds'} />
            <span>{t(toolEntry(game, tool)?.label ?? 'Tools')}</span>
          </a>
        ))}
      </nav>
    )),
  ]

  return (
    <>
      <header className="bar">
        {wide ? null : (
          <button
            type="button"
            className="icon"
            aria-label={t('Menu')}
            aria-expanded={open}
            aria-controls={MENU}
            onClick={() => setOpen(!open)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        {/* The site's mark is the game's Stellar Jade (StarRailRes, icon/item/900001). */}
        <img className="logo" src="/icons/logo.png" width="32" height="32" alt="" />
        <a className="brand" href={`#${HOME}`}>
          <h1>HoYo Toolkit</h1>
          <span data-testid="game">{home ? t('Home') : GAMES[here.game].label}</span>
        </a>
        {/* A tap: the other theme. A long press or a right click: the device's theme again. */}
        <button
          type="button"
          className="icon"
          aria-label={t('Theme: {mode}', { mode: t(THEME_MODES[theme]) })}
          title={t('Tap for the other theme; hold or right-click for the one on the device')}
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          // A right click, the keyboard's menu key or Shift+F10 do what a long press does.
          onContextMenu={(event) => {
            event.preventDefault()
            setTheme('system')
          }}
          onClick={() => {
            if (held.current) held.current = false
            else setTheme(shownTheme === 'light' ? 'dark' : 'light')
          }}
        >
          <ToolIcon name={THEME_ICONS[theme]} />
        </button>
        <select
          aria-label={t('Language')}
          value={language}
          onChange={(event) => {
            const choice = languages.find((known) => known === event.target.value)
            if (choice) setLanguage(choice)
          }}
        >
          {languages.map((choice) => (
            <option key={choice} value={choice}>
              {languageLabel(choice)}
            </option>
          ))}
        </select>
      </header>
      {wide ? (
        <aside className="sidebar" aria-label={t('Menu')}>
          {menu}
        </aside>
      ) : open ? (
        <>
          <div id={MENU} className="drawer">
            {menu}
          </div>
          <button
            type="button"
            className="backdrop"
            aria-label={t('Close menu')}
            onClick={() => setOpen(false)}
          />
        </>
      ) : null}
      <main>
        {wide || home ? null : (
          <nav className="tabs" aria-label={t('Tools')}>
            {toolsOf(here.game).map((tool) => (
              <a
                key={tool}
                href={href(here.game, tool)}
                aria-current={tool === here.tool ? 'page' : undefined}
              >
                <ToolIcon name={toolEntry(here.game, tool)?.icon ?? 'builds'} />
                <span>{t(toolEntry(here.game, tool)?.label ?? 'Tools')}</span>
              </a>
            ))}
          </nav>
        )}
        {games.flatMap((game) =>
          toolsOf(game).map((tool) => (
            // Hidden, not unmounted: a loaded showcase or forecast survives switching tools.
            <div key={href(game, tool)} hidden={home || game !== here.game || tool !== here.tool}>
              <ErrorBoundary>{toolEntry(game, tool)?.element}</ErrorBoundary>
            </div>
          )),
        )}
        <div hidden={!home}>
          <Landing />
        </div>
        <footer>{t('Fan project. Not affiliated with HoYoverse.')}</footer>
      </main>
    </>
  )
}

export default App
