import { expect, test } from 'vitest'
import { STAR_RAIL_FILE } from '../starrail/warps'
import { GENSHIN_FILE, type SavedHistory } from './history'
import { mergeFile, parseHistoryFile, serverOffset, toUigf } from './uigf'

const wish = (id: string, gacha_type: string, rank_type: string, name = `Item ${id}`) => ({
  uigf_gacha_type: gacha_type === '400' ? '301' : gacha_type,
  gacha_type,
  item_id: '',
  count: '1',
  time: '2025-01-01 12:00:00',
  name,
  item_type: 'Character',
  rank_type,
  id,
})

const INFO = {
  export_timestamp: 1,
  export_app: 'x',
  export_app_version: '1',
  version: 'v4.0',
}

test('reads Genshin wishes from a UIGF v4 file, with the time zone it gives', () => {
  const text = JSON.stringify({
    info: INFO,
    hk4e: [
      {
        uid: '700000001',
        timezone: 1,
        list: [wish('2', '400', '5', 'Furina'), wish('1', '301', '3')],
      },
    ],
  })
  const { accounts, timezones } = parseHistoryFile(text, GENSHIN_FILE)
  // The second character banner keeps its own type: the summary counts it with the first.
  expect(accounts['700000001']?.map(({ id, banner, rank }) => [id, banner, rank])).toEqual([
    ['1', '301', 3],
    ['2', '400', 5],
  ])
  expect(timezones).toEqual({ '700000001': 1 })
})

test('reads the older UIGF v3 format of Genshin, which names one account in `info`', () => {
  const text = JSON.stringify({
    info: { uid: '800000002', uigf_version: 'v3.0', region_time_zone: 8 },
    list: [wish('5', '200', '4')],
  })
  const { accounts, timezones } = parseHistoryFile(text, GENSHIN_FILE)
  expect(accounts['800000002']).toHaveLength(1)
  expect(timezones).toEqual({ '800000002': 8 })
})

test('a file of the other game is refused, saying which game it lacks', () => {
  const warps = JSON.stringify({
    info: INFO,
    hkrpg: [{ uid: '700000001', timezone: 8, list: [] }],
  })
  expect(() => parseHistoryFile(warps, GENSHIN_FILE)).toThrow('This file holds no Genshin wishes.')
  const wishes = JSON.stringify({
    info: INFO,
    hk4e: [{ uid: '700000001', list: [wish('1', '301', '5')] }],
  })
  expect(() => parseHistoryFile(wishes, STAR_RAIL_FILE)).toThrow(
    'This file holds no Star Rail warps.',
  )
})

test('a Genshin banner type is one of its own, not a Star Rail one', () => {
  const text = JSON.stringify({
    info: INFO,
    hk4e: [{ uid: '700000001', list: [wish('1', '11', '5')] }],
  })
  expect(() => parseHistoryFile(text, GENSHIN_FILE)).toThrow('This file is not a UIGF file.')
})

// UIDs and offsets as biuuu/genshin-wish-export (src/main/UIGFJson.js) writes them.
test.each([
  ['600000001', -5],
  ['700000001', 1],
  ['800000001', 8],
  ['900000001', 8],
  ['1800000001', 8],
])('a UID %s is on a server at UTC%+d', (uid, offset) => {
  expect(serverOffset(uid)).toBe(offset)
})

const NOW = new Date('2026-11-13T12:00:00Z')

test('an exported Genshin file follows UIGF v4 and reads back the same', () => {
  const saved: SavedHistory = {
    current: '700000001',
    accounts: {
      '700000001': [
        {
          id: '1',
          banner: '301',
          time: '2025-01-01 12:00:00',
          name: 'Xiangling',
          kind: 'Character',
          rank: 4,
        },
        {
          id: '2',
          banner: '400',
          time: '2025-01-01 12:00:01',
          name: 'Furina',
          kind: 'Character',
          rank: 5,
        },
      ],
    },
  }
  const file = toUigf(saved, GENSHIN_FILE, NOW)
  expect(file.info).toEqual({
    export_timestamp: 1_794_571_200,
    export_app: 'HoYo Toolkit',
    export_app_version: expect.any(String) as unknown,
    version: 'v4.2',
  })
  expect(file).not.toHaveProperty('hkrpg')
  const [account] = file.hk4e ?? []
  expect(account?.timezone).toBe(1) // no offset was saved: the UID's server gives it
  expect(account?.list[1]).toEqual({
    uigf_gacha_type: '301', // the second character banner shares the first one's pity
    gacha_type: '400',
    item_id: '',
    count: '1',
    time: '2025-01-01 12:00:01',
    name: 'Furina',
    item_type: 'Character',
    rank_type: '5',
    id: '2',
  })
  const back = parseHistoryFile(JSON.stringify(file), GENSHIN_FILE)
  // Genshin sends no item ids, so the file holds empty ones.
  expect(back.accounts['700000001']?.map(({ item_id }) => item_id)).toEqual(['', ''])
  expect(back.accounts['700000001']?.map(({ id, banner, name, rank }) => [id, banner, name, rank])).toEqual([
    ['1', '301', 'Xiangling', 4],
    ['2', '400', 'Furina', 5],
  ])
})

test('an exported Star Rail file keeps the ids and the time zone the import saved', () => {
  const saved: SavedHistory = {
    current: '600000003',
    timezones: { '600000003': -5 },
    accounts: {
      '600000003': [
        {
          id: '9',
          banner: '11',
          time: '2025-01-01 12:00:00',
          name: 'Acheron',
          kind: 'Character',
          rank: 5,
          item_id: '1308',
          gacha_id: '2001',
        },
      ],
    },
  }
  const file = toUigf(saved, STAR_RAIL_FILE, NOW)
  expect(file).not.toHaveProperty('hk4e')
  const [account] = file.hkrpg ?? []
  expect(account).toEqual({
    uid: '600000003',
    timezone: -5,
    list: [
      {
        gacha_id: '2001',
        gacha_type: '11',
        item_id: '1308',
        count: '1',
        time: '2025-01-01 12:00:00',
        name: 'Acheron',
        item_type: 'Character',
        rank_type: '5',
        id: '9',
      },
    ],
  })
  const back = parseHistoryFile(JSON.stringify(file), STAR_RAIL_FILE)
  expect(back).toEqual({
    accounts: saved.accounts,
    timezones: saved.timezones,
  })
})

const wishFile = (ids: string[]) =>
  JSON.stringify({
    info: INFO,
    hk4e: [{ uid: '700000001', timezone: 1, list: ids.map((id) => wish(id, '301', '3')) }],
  })

test('merging a file keeps each pull once and remembers the time zones it gives', () => {
  const first = mergeFile(
    { current: null, accounts: {} },
    parseHistoryFile(wishFile(['1', '2']), GENSHIN_FILE),
  )
  const second = mergeFile(first.history, parseHistoryFile(wishFile(['2', '3']), GENSHIN_FILE))
  expect([first.added, second.added]).toEqual([2, 1])
  expect(second.history.current).toBe('700000001')
  expect(second.history.timezones).toEqual({ '700000001': 1 })
  expect(second.history.accounts['700000001']?.map(({ id }) => id)).toEqual(['1', '2', '3'])
})
