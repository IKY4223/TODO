// Star Rail warp history from a file another app exported: UIGF v4 (its `hkrpg` section) or the
// older SRGF v1. Specs: https://uigf.org/en/standards/uigf.html, .../srgf.html. The file is read in
// the browser and never sent anywhere.
import { isArrayOf, isRecord, isString } from '../api/http'
import type { Message } from '../i18n'
import {
  type BannerSummary,
  type Pull,
  type SavedHistory,
  loadSaved,
  saveSaved,
  summarizeBanners,
} from '../wishes/history'

// Names from the open source warp exporter biuuu/star-rail-warp-export (src/gachaType.json); the
// UIGF spec lists the values without names.
// shortcut: each banner keeps its own pity; whether collaboration warps (21, 22) share pity with
// the event warps (11, 12) is unconfirmed, so they are counted apart until a source says so.
const WARP_BANNERS = {
  '11': 'Character Event Warp',
  '12': 'Light Cone Event Warp',
  '21': 'Character Collaboration Warp',
  '22': 'Light Cone Collaboration Warp',
  '1': 'Regular Warp',
  '2': 'Starter Warp',
} as const satisfies Record<string, Message>
type WarpBanner = keyof typeof WARP_BANNERS
// Display order, spelled out: integer-like object keys iterate in numeric order.
const ORDER: readonly WarpBanner[] = ['11', '12', '21', '22', '1', '2']
const RANKS = new Set(['3', '4', '5'])
const ID = /^\d{1,19}$/
const STORAGE_KEY = 'hoyo-toolkit:warp-history'
export const MAX_FILE_BYTES = 20_000_000 // years of warps are a few MB

/** A file the app cannot read, with the reason to show. */
export class WarpFileError extends Error {
  readonly reason: Message

  constructor(reason: Message) {
    super(reason)
    this.reason = reason
  }
}

const NOT_A_FILE: Message = 'This file is not a UIGF or SRGF file.'
const NO_WARPS: Message = 'This file holds no Star Rail warps.'
const NO_RANKS: Message =
  'This file does not say the star rank of each warp: export it again with every field.'

const isBanner = (value: unknown): value is WarpBanner => isString(value) && value in WARP_BANNERS
const isUid = (value: unknown): value is string | number =>
  (isString(value) && ID.test(value)) || (Number.isSafeInteger(value) && Number(value) > 0)

function toPull(item: unknown): Pull {
  if (
    !isRecord(item) ||
    !isString(item.id) ||
    !ID.test(item.id) ||
    !isBanner(item.gacha_type) ||
    !isString(item.time) ||
    !isString(item.item_id)
  ) {
    throw new WarpFileError(NOT_A_FILE)
  }
  if (!isString(item.rank_type) || !RANKS.has(item.rank_type)) throw new WarpFileError(NO_RANKS)
  return {
    id: item.id,
    banner: item.gacha_type,
    time: item.time,
    name: isString(item.name) ? item.name : item.item_id,
    kind: isString(item.item_type) ? item.item_type : '',
    rank: Number(item.rank_type),
  }
}

const byId = (a: Pull, b: Pull): number => {
  const [x, y] = [BigInt(a.id), BigInt(b.id)]
  return x < y ? -1 : Number(x > y)
}

/** Each account's warps in the file, oldest first. Throws a WarpFileError saying what is wrong. */
export function parseWarpFile(text: string): Record<string, Pull[]> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new WarpFileError(NOT_A_FILE)
  }
  if (!isRecord(data) || !isRecord(data.info)) throw new WarpFileError(NOT_A_FILE)
  // UIGF v4: a list of accounts per game. SRGF: one account, named in `info`.
  const accounts = Array.isArray(data.hkrpg)
    ? data.hkrpg
    : isString(data.info.srgf_version)
      ? [{ uid: data.info.uid, list: data.list }]
      : []
  const read: Record<string, Pull[]> = {}
  for (const account of accounts) {
    if (!isRecord(account) || !isUid(account.uid) || !isArrayOf(account.list, isRecord)) {
      throw new WarpFileError(NOT_A_FILE)
    }
    const uid = String(account.uid)
    read[uid] = [...(read[uid] ?? []), ...account.list.map(toPull)].toSorted(byId)
  }
  if (!Object.values(read).some((pulls) => pulls.length)) throw new WarpFileError(NO_WARPS)
  return read
}

/** The saved history with the file's warps added once each; the account with most new ones shown. */
export function mergeWarps(
  saved: SavedHistory,
  accounts: Readonly<Record<string, readonly Pull[]>>,
): { readonly history: SavedHistory; readonly added: number } {
  const merged = { ...saved.accounts }
  let added = 0
  let current = saved.current
  let most = 0
  for (const [uid, pulls] of Object.entries(accounts)) {
    const known = new Set((merged[uid] ?? []).map(({ id }) => id))
    const fresh = pulls.filter(({ id }) => !known.has(id))
    merged[uid] = [...(merged[uid] ?? []), ...fresh].toSorted(byId)
    added += fresh.length
    if (fresh.length > most || current === null) [most, current] = [fresh.length, uid]
  }
  return { history: { current, accounts: merged }, added }
}

/** Per warp banner with any warps: its pity counters and 5★ warps. */
export const summarizeWarps = (pulls: readonly Pull[]): BannerSummary[] =>
  summarizeBanners(pulls, ORDER, WARP_BANNERS)

export const loadWarps = (storage?: Storage): SavedHistory => loadSaved(STORAGE_KEY, storage)
export const saveWarps = (history: SavedHistory, storage?: Storage): boolean =>
  saveSaved(STORAGE_KEY, history, storage)
