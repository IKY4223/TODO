import { useSyncExternalStore } from 'react'

const HASH_CHANGE = 'hashchange'

function subscribe(notify: () => void): () => void {
  window.addEventListener(HASH_CHANGE, notify)
  return (): void => window.removeEventListener(HASH_CHANGE, notify)
}

/** The part of the URL after "#", kept current: the app's pages live there. */
export const useAddress = (): string =>
  useSyncExternalStore(subscribe, () => window.location.hash.slice(1))
