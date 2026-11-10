import { type JSX, useSyncExternalStore } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { CharacterShowcase } from './showcase/CharacterShowcase'
import { WishForecast } from './wishes/WishForecast'

// Each tool lives at its own #address, so the browser's back button and bookmarks work.
const TOOLS = {
  builds: { label: 'Builds', element: <CharacterShowcase /> },
  wishes: { label: 'Wishes', element: <WishForecast /> },
} as const
type Tool = keyof typeof TOOLS

const DEFAULT_TOOL: Tool = 'builds'
const HASH_CHANGE = 'hashchange'

const isTool = (value: string): value is Tool => Object.hasOwn(TOOLS, value)
const tools = Object.keys(TOOLS).filter(isTool)

function subscribeToAddress(notify: () => void): () => void {
  window.addEventListener(HASH_CHANGE, notify)
  return (): void => window.removeEventListener(HASH_CHANGE, notify)
}

const readAddress = (): string => window.location.hash.slice(1)

function App(): JSX.Element {
  const address = useSyncExternalStore(subscribeToAddress, readAddress)
  const current = isTool(address) ? address : DEFAULT_TOOL

  return (
    <main>
      <h1>HoYo Toolkit</h1>
      <nav aria-label="Tools">
        {tools.map((tool) => (
          <a key={tool} href={`#${tool}`} aria-current={tool === current ? 'page' : undefined}>
            {TOOLS[tool].label}
          </a>
        ))}
      </nav>
      {tools.map((tool) => (
        // Hidden, not unmounted: a loaded showcase or forecast survives switching tools.
        <div key={tool} hidden={tool !== current}>
          <ErrorBoundary>{TOOLS[tool].element}</ErrorBoundary>
        </div>
      ))}
      <footer>Fan project. Not affiliated with HoYoverse.</footer>
    </main>
  )
}

export default App
