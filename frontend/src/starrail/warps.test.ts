import { expect, test } from 'vitest'
import { HistoryFileError, mergeFile, parseHistoryFile } from '../wishes/uigf'
import { STAR_RAIL_FILE, summarizeWarps } from './warps'

const parseWarpFile = (text: string) => parseHistoryFile(text, STAR_RAIL_FILE).accounts

const item = (id: string, gacha_type: string, rank_type: string, name = `Item ${id}`) => ({
  gacha_id: '1',
  gacha_type,
  item_id: '1001',
  count: '1',
  time: '2025-01-01 12:00:00',
  name,
  item_type: 'Character',
  rank_type,
  id,
})

const uigf = (list: unknown[], uid: unknown = '700000001') =>
  JSON.stringify({
    info: { export_timestamp: 1, export_app: 'x', export_app_version: '1', version: 'v4.0' },
    hkrpg: [{ uid, timezone: 8, lang: 'en-us', list }],
  })

test('reads Star Rail warps from a UIGF v4 file, oldest first', () => {
  const accounts = parseWarpFile(uigf([item('2', '11', '5'), item('1', '11', '3')]))
  expect(Object.keys(accounts)).toEqual(['700000001'])
  expect(
    accounts['700000001']?.map(({ id, banner, rank, kind }) => [id, banner, rank, kind]),
  ).toEqual([
    ['1', '11', 3, 'Character'],
    ['2', '11', 5, 'Character'],
  ])
})

test('reads the older SRGF format and a numeric UID', () => {
  const srgf = JSON.stringify({
    info: { srgf_version: 'v1.0', uid: '700000002', lang: 'en-us', region_time_zone: 8 },
    list: [item('5', '1', '4')],
  })
  expect(parseWarpFile(srgf)['700000002']).toHaveLength(1)
  expect(Object.keys(parseWarpFile(uigf([item('1', '1', '4')], 700000003)))).toEqual(['700000003'])
})

function reason(text: string): string {
  try {
    parseWarpFile(text)
  } catch (error) {
    if (error instanceof HistoryFileError) return error.message
    throw error
  }
  return 'accepted'
}

test('refuses what is not a Star Rail warp history, saying why', () => {
  expect(reason('not json')).toBe('This file is not a UIGF or SRGF file.')
  expect(reason(JSON.stringify({ info: {}, hk4e: [] }))).toBe('This file holds no Star Rail warps.')
  expect(reason(uigf([]))).toBe('This file holds no Star Rail warps.')
  const unranked: Record<string, string> = item('1', '11', '5')
  delete unranked.rank_type
  expect(reason(uigf([unranked]))).toBe(
    'This file does not say the star rank of each warp: export it again with every field.',
  )
  expect(reason(uigf([item('x1', '11', '5')]))).toBe('This file is not a UIGF or SRGF file.')
  expect(reason(uigf([item('1', '99', '5')]))).toBe('This file is not a UIGF or SRGF file.')
})

test('merging keeps each warp once', () => {
  const first = parseHistoryFile(uigf([item('1', '11', '3'), item('2', '11', '5')]), STAR_RAIL_FILE)
  const again = parseHistoryFile(uigf([item('2', '11', '5'), item('3', '11', '4')]), STAR_RAIL_FILE)
  const { history, added } = mergeFile({ current: null, accounts: {} }, first)
  const second = mergeFile(history, again)
  expect(added).toBe(2)
  expect(second.added).toBe(1)
  expect(second.history.current).toBe('700000001')
  expect(second.history.accounts['700000001']?.map(({ id }) => id)).toEqual(['1', '2', '3'])
})

test('each warp banner keeps its own pity, character events first', () => {
  const accounts = parseWarpFile(
    uigf([
      item('1', '1', '3'),
      item('2', '11', '3'),
      item('3', '11', '5', 'Acheron'),
      item('4', '11', '4'),
      item('5', '12', '3'),
    ]),
  )
  const summary = summarizeWarps(accounts['700000001'] ?? [])
  expect(summary.map(({ label, total, pity5, pity4 }) => [label, total, pity5, pity4])).toEqual([
    ['Character Event Warp', 3, 1, 0],
    ['Light Cone Event Warp', 1, 1, 1],
    ['Regular Warp', 1, 1, 1],
  ])
  expect(summary[0]?.fiveStars).toEqual([
    { id: '3', name: 'Acheron', pity: 2, time: '2025-01-01 12:00:00' },
  ])
})

test('a warp the file lists twice counts once', () => {
  const twice = parseWarpFile(
    uigf([item('1', '11', '5'), item('1', '11', '5'), item('2', '11', '3')]),
  )
  expect(twice['700000001']?.map(({ id }) => id)).toEqual(['1', '2'])
})

test('a banner type is only one of the warp banners, not any key an object has', () => {
  expect(reason(uigf([item('1', 'toString', '5')]))).toBe('This file is not a UIGF or SRGF file.')
})
