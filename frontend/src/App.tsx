import { type JSX, useEffect, useState } from 'react'
import { fetchHealth } from './api/health'

type ApiState =
  | { readonly status: 'loading' }
  | { readonly status: 'online' }
  | { readonly status: 'offline'; readonly message: string }

const STATUS_TEXT = {
  loading: 'Checking API…',
  online: 'API online',
  offline: 'API offline',
} as const satisfies Record<ApiState['status'], string>

function App(): JSX.Element {
  const [api, setApi] = useState<ApiState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const check = async (): Promise<void> => {
      try {
        await fetchHealth(controller.signal)
        setApi({ status: 'online' })
      } catch (error) {
        // An aborted request belongs to an unmounted component: setting state would be stale.
        if (controller.signal.aborted) return
        setApi({ status: 'offline', message: error instanceof Error ? error.message : String(error) })
      }
    }
    void check()
    return (): void => controller.abort()
  }, [])

  return (
    <main>
      <h1>HoYo Toolkit</h1>
      <p role="status" data-status={api.status}>
        {STATUS_TEXT[api.status]}
      </p>
      {'message' in api && <p className="detail">{api.message}</p>}
      <footer>Fan project. Not affiliated with HoYoverse.</footer>
    </main>
  )
}

export default App
