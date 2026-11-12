import { useSyncExternalStore } from 'react'
import { isArrayOf, isKeyOf, isRecord } from '../api/http'
import { RELIC_SUBSTATS } from '../api/limits'
import type { Relic, StarRailShowcase } from './starrail'

export type SubstatKey = (typeof RELIC_SUBSTATS)[number]

const STORAGE_KEY = 'starrail.wanted.v1'
const WANTED_BY_DEFAULT: readonly SubstatKey[] = ['spd', 'crit_rate', 'crit_dmg']

const isSubstatKey = (value: unknown): value is SubstatKey =>
  RELIC_SUBSTATS.some((key) => key === value)

function readSaved(storage?: Storage): Record<string, unknown> {
  try {
    // Reached inside the `try`: where site data is blocked, reading window.localStorage throws.
    const store = storage ?? window.localStorage
    const saved: unknown = JSON.parse(store.getItem(STORAGE_KEY) ?? 'null')
    return isRecord(saved) ? saved : {}
  } catch {
    // Private browsing, blocked site data or a corrupted entry: start from the defaults.
    return {}
  }
}

/** The substats the player wants on a character, as saved on this device. */
export function loadWanted(characterId: number, storage?: Storage): readonly SubstatKey[] {
  const saved = readSaved(storage)
  const wanted = isKeyOf(saved, String(characterId)) ? saved[String(characterId)] : undefined
  return isArrayOf(wanted, isSubstatKey) ? wanted : WANTED_BY_DEFAULT
}

/** Storage can refuse; the choice then lasts until the page closes. */
export function saveWanted(
  characterId: number,
  wanted: readonly SubstatKey[],
  storage?: Storage,
): void {
  try {
    const store = storage ?? window.localStorage
    store.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(storage), [characterId]: wanted }))
  } catch {
    // Nothing to do: the caller keeps the choice in memory.
  }
}

/** A relic's worth in highest single rolls, counting only the wanted substats. */
export const relicScore = (relic: Relic, wanted: readonly string[]): number =>
  relic.subs.filter((sub) => wanted.includes(sub.key)).reduce((total, sub) => total + sub.score, 0)

// The showcase last loaded, shared so the relic advisor can compare with equipped relics.
let showcase: StarRailShowcase | undefined
const listeners = new Set<() => void>()

export function publishShowcase(loaded: StarRailShowcase): void {
  showcase = loaded
  for (const notify of listeners) notify()
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  return (): void => {
    listeners.delete(notify)
  }
}

export const useShowcase = (): StarRailShowcase | undefined =>
  useSyncExternalStore(subscribe, () => showcase)
