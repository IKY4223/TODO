import { type JSX, type ReactNode, useEffect, useState } from 'react'
import { useAddress } from './address'
import { ErrorBoundary } from './ErrorBoundary'
import { languageLabel, languages, type Message, setLanguage, useLanguage, useT } from './i18n'
import { CharacterShowcase } from './showcase/CharacterShowcase'
import { RelicAdvisor } from './starrail/RelicAdvisor'
import { SpeedPlanner } from './starrail/SpeedPlanner'
import { StarRailShowcase } from './starrail/StarRailShowcase'
import { WishForecast } from './wishes/WishForecast'
import { WishHistory } from './wishes/WishHistory'

interface ToolEntry {
  readonly label: Message
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
      builds: { label: 'Builds', element: <StarRailShowcase /> },
      relics: { label: 'Relics', element: <RelicAdvisor /> },
      warps: { label: 'Warps', element: <WishForecast game="starrail" /> },
      speed: { label: 'Speed', element: <SpeedPlanner /> },
    },
  },
  genshin: {
    label: 'Genshin',
    tools: {
      builds: { label: 'Builds', element: <CharacterShowcase /> },
      wishes: { label: 'Wishes', element: <WishForecast game="genshin" /> },
      history: { label: 'History', element: <WishHistory /> },
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

const MENU = 'menu'
const CLOSE_KEY = 'Escape'

function App(): JSX.Element {
  const here = locate(useAddress())
  const t = useT()
  const language = useLanguage()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY) setOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return (): void => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <>
      <header className="bar">
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
        <div className="brand">
          <h1>HoYo Toolkit</h1>
          <span data-testid="game">{GAMES[here.game].label}</span>
        </div>
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
      {open ? (
        <>
          <div id={MENU} className="drawer">
            {games.map((game) => (
              <nav key={game} aria-label={GAMES[game].label}>
                <h2>{GAMES[game].label}</h2>
                {toolsOf(game).map((tool) => (
                  <a
                    key={tool}
                    href={href(game, tool)}
                    aria-current={game === here.game && tool === here.tool ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {t(toolEntry(game, tool)?.label ?? 'Tools')}
                  </a>
                ))}
              </nav>
            ))}
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
        <nav className="tabs" aria-label={t('Tools')}>
          {toolsOf(here.game).map((tool) => (
            <a
              key={tool}
              href={href(here.game, tool)}
              aria-current={tool === here.tool ? 'page' : undefined}
            >
              {t(toolEntry(here.game, tool)?.label ?? 'Tools')}
            </a>
          ))}
        </nav>
        {games.flatMap((game) =>
          toolsOf(game).map((tool) => (
            // Hidden, not unmounted: a loaded showcase or forecast survives switching tools.
            <div key={href(game, tool)} hidden={game !== here.game || tool !== here.tool}>
              <ErrorBoundary>{toolEntry(game, tool)?.element}</ErrorBoundary>
            </div>
          )),
        )}
        <footer>{t('Fan project. Not affiliated with HoYoverse.')}</footer>
      </main>
    </>
  )
}

export default App
