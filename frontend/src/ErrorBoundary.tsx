import { Component, type JSX, type ReactNode } from 'react'
import { useT } from './i18n'

interface Props {
  readonly children: ReactNode
}

interface State {
  readonly failed: boolean
}

// A function component, because a class cannot read the language with a hook.
function Crash(): JSX.Element {
  const t = useT()
  return (
    <div role="alert">
      <p>{t('Something went wrong here.')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('Reload')}
      </button>
    </div>
  )
}

/** Keeps a crash inside one part of the page instead of blanking all of it. */
// A class because React offers error boundaries only as class components.
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return <Crash />
  }
}
