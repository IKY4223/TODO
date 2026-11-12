import { ApiError, isArrayOf, isNumber, isRecord, isString, postJson } from '../api/http'
import { HISTORY_PAGE_SIZE } from '../api/limits'
import type { components } from '../api/schema'
import type { Message } from '../i18n'

type Schemas = components['schemas']
export type Pull = Schemas['Pull']
type Page = Schemas['Page']
type Banner = Schemas['HistoryRequest']['banner']

/** Every account imported on this device; `current` is the one shown. */
export interface SavedHistory {
  readonly current: string | null
  /** Each account's pulls, oldest first. */
  readonly accounts: Readonly<Record<string, readonly Pull[]>>
}

export interface FiveStar {
  readonly id: string
  readonly name: string
  /** The pulls it took, counted from the 5★ before it. */
  readonly pity: number
  readonly time: string
}

export interface BannerSummary {
  readonly banner: Banner
  readonly label: Message
  readonly total: number
  /** Pulls since the last 5★. */
  readonly pity5: number
  /** Pulls since the last 4★ or 5★: either one meets the every-ten-pulls guarantee. */
  readonly pity4: number
  /** Newest first. */
  readonly fiveStars: readonly FiveStar[]
}

interface ImportResult {
  readonly history: SavedHistory
  readonly added: number
  /** The link's account, unknown when it has no pulls at all. */
  readonly uid: string | null
}

interface ImportOptions {
  /** Called after each page with the banner's name and the pulls read from it so far. */
  readonly onProgress?: (banner: Message, pulls: number) => void
  /** Pauses between requests; replaceable so tests need not wait. */
  readonly wait?: (ms: number) => Promise<void>
}

// `satisfies` makes a banner the API adds a compile error here.
const BANNERS = {
  '301': 'Character Event',
  '302': 'Weapon Event',
  '500': 'Chronicled Wish',
  '200': 'Standard',
  '100': "Beginners' Wish",
} as const satisfies Record<Banner, string>

// Pulls on the second character banner (400) arrive with it and share its pity.
const SAME_POOL: Readonly<Record<string, Banner>> = { '400': '301' }

const HISTORY_URL = '/api/wishes/history'
const STORAGE_KEY = 'hoyo-toolkit:wish-history'
const STORAGE_VERSION = 1
const FIRST_PAGE = '0'
const FIVE_STAR = 5
const FOUR_STAR = 4
// HoYoverse refuses clients that ask too fast; paimon.moe waits two seconds between banners.
const PAGE_DELAY_MS = 500
const BANNER_DELAY_MS = 2000
const MAX_RETRIES = 5
const DEFAULT_RETRY_AFTER_SECONDS = 3
const SECOND_MS = 1000
const TOO_MANY_REQUESTS = 429

export const EMPTY_HISTORY: SavedHistory = { current: null, accounts: {} }

// Import and display order. Spelled out: object keys that look like integers iterate in
// numeric order, whatever order they were written in.
const banners: readonly Banner[] = ['301', '302', '500', '200', '100']

const pause = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const isPull = (value: unknown): value is Pull =>
  isRecord(value) &&
  isString(value.id) &&
  isString(value.banner) &&
  isString(value.time) &&
  isString(value.name) &&
  isString(value.kind) &&
  isNumber(value.rank)

const isPage = (value: unknown): value is Page =>
  isRecord(value) &&
  (value.uid === null || isString(value.uid)) &&
  isArrayOf(value.pulls, isPull)

const byId = (a: Pull, b: Pull): number => {
  const [x, y] = [BigInt(a.id), BigInt(b.id)]
  return x < y ? -1 : Number(x > y)
}

async function fetchPage(link: string, banner: Banner, endId: string): Promise<Page> {
  return postJson(HISTORY_URL, { link, banner, end_id: endId }, isPage)
}

/** One page, waiting and asking again while the server says it is being asked too fast. */
async function fetchPatiently(
  request: () => Promise<Page>,
  wait: (ms: number) => Promise<void>,
  retriesLeft = MAX_RETRIES,
): Promise<Page> {
  try {
    return await request()
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== TOO_MANY_REQUESTS || !retriesLeft) {
      throw error
    }
    await wait((error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS) * SECOND_MS)
    return fetchPatiently(request, wait, retriesLeft - 1)
  }
}

interface BannerResult {
  readonly uid: string | null
  readonly pulls: readonly Pull[]
}

/**
 * Reads one banner newest first, page by page, until the history ends or reaches a pull
 * this device already has.
 */
async function readBanner(
  link: string,
  banner: Banner,
  known: ReadonlySet<string>,
  { onProgress, wait = pause }: ImportOptions,
  endId = FIRST_PAGE,
  sofar: BannerResult = { uid: null, pulls: [] },
): Promise<BannerResult> {
  const page = await fetchPatiently(async () => fetchPage(link, banner, endId), wait)
  const firstKnown = page.pulls.findIndex((pull) => known.has(pull.id))
  const fresh = firstKnown === -1 ? page.pulls : page.pulls.slice(0, firstKnown)
  const result = { uid: sofar.uid ?? page.uid, pulls: [...sofar.pulls, ...fresh] }
  onProgress?.(BANNERS[banner], result.pulls.length)
  const last = page.pulls.at(-1)
  if (firstKnown !== -1 || page.pulls.length < HISTORY_PAGE_SIZE || !last) return result
  await wait(PAGE_DELAY_MS)
  return readBanner(link, banner, known, { onProgress, wait }, last.id, result)
}

/** Reads every banner the link's account has pulled on and adds the new pulls to `saved`. */
export async function importHistory(
  link: string,
  saved: SavedHistory,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const known = new Set(Object.values(saved.accounts).flatMap((pulls) => pulls.map((pull) => pull.id)))
  const wait = options.wait ?? pause

  const readFrom = async (index: number, sofar: BannerResult): Promise<BannerResult> => {
    const banner = banners[index]
    if (!banner) return sofar
    if (index) await wait(BANNER_DELAY_MS)
    const read = await readBanner(link, banner, known, { ...options, wait })
    return readFrom(index + 1, { uid: sofar.uid ?? read.uid, pulls: [...sofar.pulls, ...read.pulls] })
  }

  const { uid, pulls } = await readFrom(0, { uid: null, pulls: [] })
  if (!uid) return { history: saved, added: 0, uid }
  const merged = [...(saved.accounts[uid] ?? []), ...pulls].toSorted(byId)
  const history = { current: uid, accounts: { ...saved.accounts, [uid]: merged } }
  return { history, added: pulls.length, uid }
}

function summarizeBanner(banner: Banner, pulls: readonly Pull[]): BannerSummary {
  const fives = pulls.flatMap((pull, index) => (pull.rank === FIVE_STAR ? [index] : []))
  const lastFour = pulls.findLastIndex((pull) => pull.rank >= FOUR_STAR)
  return {
    banner,
    label: BANNERS[banner],
    total: pulls.length,
    pity5: pulls.length - 1 - (fives.at(-1) ?? -1),
    pity4: pulls.length - 1 - lastFour,
    fiveStars: fives
      .map((index, n) => {
        const { id, name, time } = pulls[index] as Pull // `index` comes from `pulls` itself
        return { id, name, time, pity: index - (fives[n - 1] ?? -1) }
      })
      .toReversed(),
  }
}

/** Per banner with any pulls: its pity counters and its 5★ pulls. `pulls` oldest first. */
export function summarize(pulls: readonly Pull[]): BannerSummary[] {
  const pool = (pull: Pull): string => SAME_POOL[pull.banner] ?? pull.banner
  return banners
    .map((banner) => summarizeBanner(banner, pulls.filter((pull) => pool(pull) === banner)))
    .filter((summary) => summary.total)
}

const isSavedHistory = (value: unknown): value is SavedHistory & { readonly version: number } =>
  isRecord(value) &&
  value.version === STORAGE_VERSION &&
  (value.current === null || isString(value.current)) &&
  isRecord(value.accounts) &&
  Object.values(value.accounts).every((pulls) => isArrayOf(pulls, isPull))

/** The history saved on this device. Storage can be off or corrupted: then it is empty. */
export function loadHistory(storage: Storage = window.localStorage): SavedHistory {
  try {
    const saved: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    return isSavedHistory(saved) ? { current: saved.current, accounts: saved.accounts } : EMPTY_HISTORY
  } catch {
    // Private browsing, blocked site data or a corrupted entry: start from nothing.
    return EMPTY_HISTORY
  }
}

/** False when the browser refuses to keep it: the history then lasts until the page closes. */
export function saveHistory(history: SavedHistory, storage: Storage = window.localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...history }))
    return true
  } catch {
    return false
  }
}
