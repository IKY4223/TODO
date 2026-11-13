// History files other apps read and write: UIGF v4 holds Genshin (`hk4e`) and Star Rail (`hkrpg`)
// accounts side by side; before it, UIGF v2–v3 held one Genshin account and SRGF v1 one Star Rail
// account. Specs: https://uigf.org/en/standards/uigf.html (v4.2, read November 2026),
// .../uigf-legacy-v3.0.html and .../srgf.html. Files are read and written in the browser and
// never sent anywhere.
import { isArrayOf, isKeyOf, isRecord, isString } from '../api/http'
import type { Message, Translate } from '../i18n'
import type { Pull, SavedHistory } from './history'

/** What tells one game's file apart, and the reasons to show when one cannot be read. */
export interface HistoryFileFormat {
  /** The game's section in a UIGF v4 file. */
  readonly section: 'hk4e' | 'hkrpg'
  /** The `info` key that names the game's older one-account format. */
  readonly legacyVersion: 'uigf_version' | 'srgf_version'
  /** The game's banner types, as keys. */
  readonly banners: Readonly<Record<string, unknown>>
  /** Banner types that share another's pity: UIGF files them under it as `uigf_gacha_type`. */
  readonly samePool: Readonly<Record<string, string>>
  readonly notAFile: Message
  readonly noPulls: Message
  readonly noRanks: Message
  readonly tooLarge: Message
}

export const MAX_FILE_BYTES = 20_000_000 // years of pulls are a few MB

const UNREADABLE: Message = 'This file could not be read.'

/** A file the app cannot read, with the reason to show. */
export class HistoryFileError extends Error {
  readonly reason: Message

  constructor(reason: Message) {
    super(reason)
    this.reason = reason
  }
}

export interface HistoryFile {
  /** Each account's pulls, oldest first. */
  readonly accounts: Readonly<Record<string, readonly Pull[]>>
  /** Each account's server offset from UTC in hours, where the file gives it. */
  readonly timezones: Readonly<Record<string, number>>
}

const RANKS = new Set(['3', '4', '5'])
// A record or account id, digits only, as UIGF allows: accepts "1700000000000000025", rejects
// "x1" and "" (and 20 digits, past what UIGF allows).
// https://regex101.com/?flavor=javascript&regex=%5E%5Cd%7B1%2C19%7D%24&testString=1700000000000000025
const ID = /^\d{1,19}$/

const isUid = (value: unknown): value is string | number =>
  (isString(value) && ID.test(value)) || (Number.isSafeInteger(value) && Number(value) > 0)

const byId = (a: Pull, b: Pull): number => {
  const [x, y] = [BigInt(a.id), BigInt(b.id)]
  return x < y ? -1 : Number(x > y)
}

function toPull(item: unknown, format: HistoryFileFormat): Pull {
  if (
    !isRecord(item) ||
    !isString(item.id) ||
    !ID.test(item.id) ||
    !isKeyOf(format.banners, item.gacha_type) ||
    !isString(item.time) ||
    !isString(item.item_id)
  ) {
    throw new HistoryFileError(format.notAFile)
  }
  if (!isString(item.rank_type) || !RANKS.has(item.rank_type)) {
    throw new HistoryFileError(format.noRanks)
  }
  return {
    id: item.id,
    banner: item.gacha_type,
    time: item.time,
    name: isString(item.name) ? item.name : item.item_id,
    kind: isString(item.item_type) ? item.item_type : '',
    rank: Number(item.rank_type),
    item_id: item.item_id,
    ...(isString(item.gacha_id) ? { gacha_id: item.gacha_id } : {}),
  }
}

/** One game's accounts in the file. Throws a HistoryFileError saying what is wrong. */
export function parseHistoryFile(text: string, format: HistoryFileFormat): HistoryFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new HistoryFileError(format.notAFile)
  }
  if (!isRecord(data) || !isRecord(data.info)) throw new HistoryFileError(format.notAFile)
  const section = data[format.section]
  const { info } = data
  const accounts = Array.isArray(section)
    ? section
    : isString(info[format.legacyVersion])
      ? [{ uid: info.uid, timezone: info.region_time_zone, list: data.list }]
      : []
  const read: Record<string, Pull[]> = {}
  const timezones: Record<string, number> = {}
  for (const account of accounts) {
    if (!isRecord(account) || !isUid(account.uid) || !isArrayOf(account.list, isRecord)) {
      throw new HistoryFileError(format.notAFile)
    }
    const uid = String(account.uid)
    if (Number.isInteger(account.timezone)) timezones[uid] = Number(account.timezone)
    // A pull listed twice, or an account listed twice, counts each pull once.
    const unique = new Map(
      [...(read[uid] ?? []), ...account.list.map((item) => toPull(item, format))].map((pull) => [
        pull.id,
        pull,
      ]),
    )
    read[uid] = [...unique.values()].toSorted(byId)
  }
  if (!Object.values(read).some((pulls) => pulls.length)) {
    throw new HistoryFileError(format.noPulls)
  }
  return { accounts: read, timezones }
}

/** The saved history with the file's pulls added once each; the account with most new shown. */
export function mergeFile(
  saved: SavedHistory,
  file: HistoryFile,
): { readonly history: SavedHistory; readonly added: number } {
  const merged = { ...saved.accounts }
  let added = 0
  let current = saved.current
  let most = 0
  for (const [uid, pulls] of Object.entries(file.accounts)) {
    const known = new Set((merged[uid] ?? []).map(({ id }) => id))
    const fresh = pulls.filter(({ id }) => !known.has(id))
    merged[uid] = [...(merged[uid] ?? []), ...fresh].toSorted(byId)
    added += fresh.length
    if (fresh.length > most || current === null) [most, current] = [fresh.length, uid]
  }
  const timezones = { ...saved.timezones, ...file.timezones }
  return { history: { current, accounts: merged, timezones }, added }
}

/** The saved history with a chosen file's pulls added. Throws an Error with the reason to show. */
export async function readHistoryFile(
  file: File,
  saved: SavedHistory,
  format: HistoryFileFormat,
  t: Translate,
): Promise<{ readonly history: SavedHistory; readonly added: number }> {
  if (file.size > MAX_FILE_BYTES) throw new Error(t(format.tooLarge))
  try {
    return mergeFile(saved, parseHistoryFile(await file.text(), format))
  } catch (error) {
    // A file the phone took back, or one this version cannot sort: say so, not nothing.
    throw new Error(t(error instanceof HistoryFileError ? error.reason : UNREADABLE), {
      cause: error,
    })
  }
}

// The offsets biuuu/genshin-wish-export (src/main/UIGFJson.js) gives Genshin's servers by the
// UID's first digit: 6 America at UTC−5, 7 Europe at UTC+1, every other server UTC+8.
// shortcut: Star Rail's history says its server's offset and an import keeps it; a Star Rail
// account imported before that, or from a file without one, falls back on Genshin's rule.
const OFFSETS: Readonly<Record<string, number>> = { '6': -5, '7': 1 }
const ASIA_OFFSET = 8
const UID_TAIL = 8 // a UID is its server's one or two digits, then eight more

/** The UTC offset of the server a UID plays on, in hours. */
export const serverOffset = (uid: string): number => OFFSETS[uid.slice(0, -UID_TAIL)] ?? ASIA_OFFSET

export const EXPORT_APP = 'HoYo Toolkit'
// Raised when what an export writes changes.
const EXPORT_APP_VERSION = '1.0'
const UIGF_VERSION = 'v4.2'
const SECOND_MS = 1000

interface UigfAccount {
  readonly uid: string
  readonly timezone: number
  readonly list: readonly Record<string, string>[]
}

export interface Uigf {
  readonly info: Readonly<Record<string, string | number>>
  readonly hk4e?: readonly UigfAccount[]
  readonly hkrpg?: readonly UigfAccount[]
}

// shortcut: Genshin's history sends no item ids, so its pulls are written with an empty one;
// apps that look items up by id instead of name may need to fill them in.
function toItem(pull: Pull, format: HistoryFileFormat): Record<string, string> {
  const common = {
    gacha_type: pull.banner,
    item_id: pull.item_id ?? '',
    count: '1',
    time: pull.time,
    name: pull.name,
    item_type: pull.kind,
    rank_type: String(pull.rank),
    id: pull.id,
  }
  return format.section === 'hk4e'
    ? {
        uigf_gacha_type: format.samePool[pull.banner] ?? pull.banner,
        ...common,
      }
    : { gacha_id: pull.gacha_id ?? '', ...common }
}

/** Every saved account of one game as a UIGF v4 file. */
export function toUigf(saved: SavedHistory, format: HistoryFileFormat, now: Date): Uigf {
  return {
    info: {
      export_timestamp: Math.floor(now.getTime() / SECOND_MS),
      export_app: EXPORT_APP,
      export_app_version: EXPORT_APP_VERSION,
      version: UIGF_VERSION,
    },
    [format.section]: Object.entries(saved.accounts).map(([uid, pulls]) => ({
      uid,
      timezone: saved.timezones?.[uid] ?? serverOffset(uid),
      list: pulls.map((pull) => toItem(pull, format)),
    })),
  }
}
