import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  EMPTY_HISTORY,
  importHistory,
  loadHistory,
  type Pull,
  type SavedHistory,
  saveHistory,
  summarize,
  WISHES,
} from './history'

const UID = '700000001'
const LINK = 'https://webstatic-sea.hoyoverse.com/index.html?authkey=a%2Bb#/log'
const PAGE_SIZE = 20

const id = (n: number): string => String(1_700_000_000_000_000_000n + BigInt(n))

function pull(n: number, rank: number, name = 'Xiangling', banner = '301'): Pull {
  return { id: id(n), banner, time: '2026-10-01 12:00:00', name, kind: 'Character', rank }
}

/** 25 character pulls, a 5★ on the 10th; three standard pulls; nothing else. Oldest first. */
const SERVER: Record<string, Pull[]> = {
  '301': Array.from({ length: 25 }, (_, i) =>
    pull(
      i + 1,
      i + 1 === 10 ? 5 : 3,
      i + 1 === 10 ? 'Furina' : 'Xiangling',
      i + 1 === 20 ? '400' : '301',
    ),
  ),
  '200': [pull(101, 4, 'Amber', '200'), pull(102, 3, 'Amber', '200'), pull(103, 3, 'Amber', '200')],
}

interface Sent {
  readonly link: string
  readonly banner: string
  readonly end_id: string
}

/** Answers like the backend: one page, newest first, older than end_id. */
function serve(
  server = SERVER,
  uid = UID,
  timezone: number | null = null,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const sent = JSON.parse(String(init?.body)) as Sent // the test sends this body itself
    const pulls = (server[sent.banner] ?? [])
      .toReversed()
      .filter((p) => sent.end_id === '0' || BigInt(p.id) < BigInt(sent.end_id))
      .slice(0, PAGE_SIZE)
    return Response.json({ uid: pulls.length ? uid : null, timezone, pulls })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const sentBodies = (fetchMock: ReturnType<typeof vi.fn>): Sent[] =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as Sent)

const noWait = async (): Promise<void> => {}

afterEach(() => vi.unstubAllGlobals())

describe('importHistory', () => {
  test('pages through every banner and keeps the pulls oldest first', async () => {
    const fetchMock = serve()
    const { history, added } = await importHistory(LINK, EMPTY_HISTORY, { wait: noWait }, WISHES)
    expect(added).toBe(28)
    expect(history.current).toBe(UID)
    const pulls = history.accounts[UID] ?? []
    expect(pulls.map((p) => p.id)).toEqual(
      [...SERVER['200'], ...SERVER['301']].map((p) => p.id).toSorted(),
    )
    // Two pages for the character banner, the second one after its 20th pull.
    expect(
      sentBodies(fetchMock)
        .filter((body) => body.banner === '301')
        .map((body) => body.end_id),
    ).toEqual(['0', id(6)])
    expect(sentBodies(fetchMock).every((body) => body.link === LINK)).toBe(true)
  })

  test("keeps the server's time zone where the game sends it, as Star Rail does", async () => {
    serve(SERVER, UID, 1)
    const { history } = await importHistory(LINK, EMPTY_HISTORY, { wait: noWait }, WISHES)
    expect(history.timezones).toEqual({ [UID]: 1 })
    serve()
    const again = await importHistory(LINK, history, { wait: noWait }, WISHES)
    expect(again.history.timezones).toEqual({ [UID]: 1 }) // a page without one keeps it
  })

  test('stops at the first pull it already has', async () => {
    const saved: SavedHistory = { current: UID, accounts: { [UID]: SERVER['301'].slice(0, 22) } }
    const fetchMock = serve()
    const { history, added } = await importHistory(LINK, saved, { wait: noWait }, WISHES)
    expect(added).toBe(3 + 3) // three newer character pulls, three standard ones
    expect(history.accounts[UID]).toHaveLength(28)
    expect(sentBodies(fetchMock).filter((body) => body.banner === '301')).toHaveLength(1)
  })

  test('keeps accounts apart', async () => {
    const other: SavedHistory = {
      current: '800000002',
      accounts: { '800000002': [pull(500, 5, 'Diluc', '200')] },
    }
    serve()
    const { history } = await importHistory(LINK, other, { wait: noWait }, WISHES)
    expect(history.accounts['800000002']).toHaveLength(1)
    expect(history.accounts[UID]).toHaveLength(28)
    expect(history.current).toBe(UID)
  })

  test('waits and tries again when asked to slow down', async () => {
    let refusals = 2
    const fetchMock = vi.fn(async () => {
      if (refusals) {
        refusals -= 1
        return Response.json(
          { detail: 'Too many requests.' },
          { status: 429, headers: { 'Retry-After': '7' } },
        )
      }
      return Response.json({ uid: null, timezone: null, pulls: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const waits: number[] = []
    await importHistory(LINK, EMPTY_HISTORY, { wait: async (ms) => void waits.push(ms) }, WISHES)
    expect(waits.filter((ms) => ms === 7000)).toHaveLength(2)
  })

  test('gives up when asked to slow down again and again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ detail: 'Too many requests.' }, { status: 429 })),
    )
    await expect(importHistory(LINK, EMPTY_HISTORY, { wait: noWait }, WISHES)).rejects.toThrow(
      'Too many requests.',
    )
  })

  test('passes any other refusal straight on', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ detail: 'This link has expired.' }, { status: 410 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(importHistory(LINK, EMPTY_HISTORY, { wait: noWait }, WISHES)).rejects.toThrow(
      'This link has expired.',
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  test('reports its progress', async () => {
    serve()
    const progress: string[] = []
    await importHistory(
      LINK,
      EMPTY_HISTORY,
      { wait: noWait, onProgress: (banner, pulls) => progress.push(`${banner}: ${pulls}`) },
      WISHES,
    )
    expect(progress).toContain('Character Event: 20')
    expect(progress.at(-1)).toBe("Beginners' Wish: 0")
  })
})

describe('summarize', () => {
  test('counts pity per banner, both character banners together', () => {
    const [character, standard] = summarize(SERVER['200'].concat(SERVER['301']))
    expect(character).toMatchObject({ label: 'Character Event', total: 25, pity5: 15, pity4: 15 })
    expect(character?.fiveStars).toEqual([
      { id: id(10), name: 'Furina', pity: 10, time: '2026-10-01 12:00:00' },
    ])
    // Nine pulls went by before Furina; fifteen have gone by since.
    expect(character).toMatchObject({ averagePity: 10, longestDry: 15 })
    expect(standard).toMatchObject({ averagePity: null, longestDry: 3 })
    expect(standard).toMatchObject({
      label: 'Standard',
      total: 3,
      pity5: 3,
      pity4: 2,
      fiveStars: [],
    })
  })

  test('lists 5★ pulls newest first with the pity each took', () => {
    const pulls = [pull(1, 3), pull(2, 5, 'Furina'), pull(3, 3), pull(4, 3), pull(5, 5, 'Nahida')]
    const [character] = summarize(pulls)
    expect(character?.fiveStars.map((five) => [five.name, five.pity])).toEqual([
      ['Nahida', 3],
      ['Furina', 2],
    ])
    expect(character?.pity5).toBe(0)
    expect(character).toMatchObject({ averagePity: 2.5, longestDry: 2 })
  })

  test('leaves out banners without pulls', () => {
    expect(summarize([])).toEqual([])
  })
})

/** A Storage that keeps its items in memory, like localStorage does in the page. */
const memory = (): Storage => {
  const items = new Map<string, string>()
  return {
    get length(): number {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
}

describe('storage', () => {
  test('a saved history loads back', () => {
    const storage = memory()
    const saved: SavedHistory = { current: UID, accounts: { [UID]: SERVER['200'] } }
    expect(saveHistory(saved, storage)).toBe(true)
    expect(loadHistory(storage)).toEqual(saved)
    const zoned: SavedHistory = { ...saved, timezones: { [UID]: 1 } }
    saveHistory(zoned, storage)
    expect(loadHistory(storage)).toEqual(zoned)
  })

  test.each([
    { name: 'nothing saved', raw: null },
    { name: 'not JSON', raw: '{broken' },
    { name: 'another shape', raw: '{"version": 1, "accounts": {"1": [{"id": 5}]}}' },
    { name: 'an older format', raw: '{"version": 0, "current": null, "accounts": {}}' },
  ])('$name loads as an empty history', ({ raw }) => {
    const storage = memory()
    if (raw !== null) storage.setItem('hoyo-toolkit:wish-history', raw)
    expect(loadHistory(storage)).toEqual(EMPTY_HISTORY)
  })

  test('a browser that refuses storage still works, unsaved', () => {
    const refusing = {
      ...memory(),
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    expect(loadHistory(refusing)).toEqual(EMPTY_HISTORY)
    expect(saveHistory(EMPTY_HISTORY, refusing)).toBe(false)
  })
})
