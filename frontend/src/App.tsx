import { type JSX, type ReactNode, useSyncExternalStore } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { CharacterShowcase } from './showcase/CharacterShowcase'
import { StarRailShowcase } from './starrail/StarRailShowcase'
import { WishForecast } from './wishes/WishForecast'
import { WishHistory } from './wishes/WishHistory'

interface ToolEntry {
  readonly label: string
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
    tools: { builds: { label: 'Builds', element: <StarRailShowcase /> } },
  },
  genshin: {
    label: 'Genshin',
    tools: {
      builds: { label: 'Builds', element: <CharacterShowcase /> },
      wishes: { label: 'Wishes', element: <WishForecast /> },
      history: { label: 'History', element: <WishHistory /> },
    },
  },
} as const satisfies Record<string, GameEntry>
type Game = keyof typeof GAMES

const DEFAULT_GAME: Game = 'starrail'
const HASH_CHANGE = 'hashchange'
const SEPARATOR = '/'

const isGame = (value: string): value is Game => Object.hasOwn(GAMES, value)
const games = Object.keys(GAMES).filter(isGame)
const toolsOf = (game: Game): string[] => Object.keys(GAMES[game].tools)
const toolEntry = (game: Game, tool: string): ToolEntry | undefined =>
  (GAMES[game].tools as Readonly<Record<string, ToolEntry>>)[tool] // widened only to look up by name

function subscribeToAddress(notify: () => void): () => void {
  window.addEventListener(HASH_CHANGE, notify)
  return (): void => window.removeEventListener(HASH_CHANGE, notify)
}

const readAddress = (): string => window.location.hash.slice(1)

/** The game and tool an address names, or the nearest place that exists. */
function locate(address: string): { readonly game: Game; readonly tool: string } {
  const [game = '', tool = ''] = address.split(SEPARATOR)
  const shownGame = isGame(game) ? game : DEFAULT_GAME
  const [firstTool = ''] = toolsOf(shownGame)
  return { game: shownGame, tool: Object.hasOwn(GAMES[shownGame].tools, tool) ? tool : firstTool }
}

const href = (game: Game, tool: string): string => `#${game}${SEPARATOR}${tool}`

function App(): JSX.Element {
  const here = locate(useSyncExternalStore(subscribeToAddress, readAddress))

  return (
    <main>
      <h1>HoYo Toolkit</h1>
      <nav aria-label="Games">
        {games.map((game) => (
          <a
            key={game}
            href={href(game, toolsOf(game)[0] ?? '')}
            aria-current={game === here.game ? 'page' : undefined}
          >
            {GAMES[game].label}
          </a>
        ))}
      </nav>
      <nav aria-label="Tools">
        {toolsOf(here.game).map((tool) => (
          <a
            key={tool}
            href={href(here.game, tool)}
            aria-current={tool === here.tool ? 'page' : undefined}
          >
            {toolEntry(here.game, tool)?.label}
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
      <footer>Fan project. Not affiliated with HoYoverse.</footer>
    </main>
  )
}

export default App
