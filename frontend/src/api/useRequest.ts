import { useRef, useState } from 'react'

export type RequestState<TData> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'ready'; readonly data: TData }

type Run<TData> = (request: () => Promise<TData>) => Promise<void>

/** Tracks one request at a time: its progress, its data or the reason it failed. A request
 * asked for again before the last one answered replaces it: the older answer is dropped. */
export function useRequest<TData>(): readonly [RequestState<TData>, Run<TData>] {
  const [state, setState] = useState<RequestState<TData>>({ status: 'idle' })
  const latest = useRef(0)

  const run: Run<TData> = async (request) => {
    latest.current += 1
    const asked = latest.current
    const settle = (next: RequestState<TData>): void => {
      if (asked === latest.current) setState(next)
    }
    setState({ status: 'loading' })
    try {
      settle({ status: 'ready', data: await request() })
    } catch (error) {
      settle({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return [state, run]
}
