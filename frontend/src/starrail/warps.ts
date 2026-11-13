// Star Rail's warp banners, read with the link or from a file (see ../wishes/uigf.ts).
import type { Message } from '../i18n'
import {
  type BannerSummary,
  type HistorySource,
  type Pull,
  type SavedHistory,
  loadSaved,
  saveSaved,
  summarizeBanners,
} from '../wishes/history'
import type { HistoryFileFormat } from '../wishes/uigf'

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
const STORAGE_KEY = 'hoyo-toolkit:warp-history'

/** Star Rail's section of a UIGF v4 file, or a whole SRGF v1 file. */
export const STAR_RAIL_FILE: HistoryFileFormat = {
  section: 'hkrpg',
  legacyVersion: 'srgf_version',
  banners: WARP_BANNERS,
  samePool: {},
  notAFile: 'This file is not a UIGF or SRGF file.',
  noPulls: 'This file holds no Star Rail warps.',
  noRanks: 'This file does not say the star rank of each warp: export it again with every field.',
  tooLarge: 'This file is too large to be a warp history.',
}

/** Star Rail's warp history, read with the link its history page opens. */
export const WARPS: HistorySource<WarpBanner> = {
  url: '/api/wishes/warps',
  banners: ORDER,
  labels: WARP_BANNERS,
}

/** Per warp banner with any warps: its pity counters and 5★ warps. */
export const summarizeWarps = (pulls: readonly Pull[]): BannerSummary[] =>
  summarizeBanners(pulls, ORDER, WARP_BANNERS)

export const loadWarps = (storage?: Storage): SavedHistory => loadSaved(STORAGE_KEY, storage)
export const saveWarps = (history: SavedHistory, storage?: Storage): boolean =>
  saveSaved(STORAGE_KEY, history, storage)
