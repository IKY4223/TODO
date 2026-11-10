import { Component, type ReactNode } from 'react'

interface Props {
  readonly children: ReactNode
}

interface State {
  readonly failed: boolean
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
    return (
      <div role="alert">
        <p>Something went wrong here.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
