import { useState } from 'react'

export type RequestState<TData> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'ready'; readonly data: TData }

type Run<TData> = (request: () => Promise<TData>) => Promise<void>

/** Tracks one request at a time: its progress, its data or the reason it failed. */
export function useRequest<TData>(): readonly [RequestState<TData>, Run<TData>] {
  const [state, setState] = useState<RequestState<TData>>({ status: 'idle' })

  const run: Run<TData> = async (request) => {
    setState({ status: 'loading' })
    try {
      setState({ status: 'ready', data: await request() })
    } catch (error) {
      setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return [state, run]
}
