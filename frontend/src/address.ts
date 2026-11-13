import { useSyncExternalStore } from 'react'
import { UID_PATTERN } from './api/limits'

const HASH_CHANGE = 'hashchange'

function subscribe(notify: () => void): () => void {
  window.addEventListener(HASH_CHANGE, notify)
  return (): void => window.removeEventListener(HASH_CHANGE, notify)
}

/** The part of the URL after "#", kept current: the app's pages live there. */
export const useAddress = (): string =>
  useSyncExternalStore(subscribe, () => window.location.hash.slice(1))

const UID = new RegExp(UID_PATTERN)

/**
 * The player and character an address (the part after "#") names, if it is a page below `list`:
 * with `list` "#starrail/builds", "starrail/builds/700000001/1409" names both.
 */
export function linked(
  address: string,
  list: string,
): { readonly uid?: string; readonly character?: string } {
  const [game, tool, uid = '', character] = address.split('/')
  return `#${game}/${tool}` === list && UID.test(uid) ? { uid, character } : {}
}
