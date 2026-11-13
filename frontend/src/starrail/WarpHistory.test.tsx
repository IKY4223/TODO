import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { WarpHistory } from './WarpHistory'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

const warp = (id: string, gacha_type: string, rank_type: string, name = `Item ${id}`) => ({
  gacha_id: '1',
  gacha_type,
  item_id: '1001',
  time: '2025-01-01 12:00:00',
  name,
  item_type: 'Character',
  rank_type,
  id,
})

const file = (accounts: Record<string, unknown[]>, name = 'warps.json'): File =>
  new File(
    [
      JSON.stringify({
        info: { export_timestamp: 1, export_app: 'x', export_app_version: '1', version: 'v4.0' },
        hkrpg: Object.entries(accounts).map(([uid, list]) => ({ uid, timezone: 8, list })),
      }),
    ],
    name,
    { type: 'application/json' },
  )

const choose = (chosen: File): void => {
  fireEvent.change(screen.getByLabelText('Or from a UIGF or SRGF file'), {
    target: { files: [chosen] },
  })
}

test('a chosen file shows each banner pity and is kept on the device', async () => {
  render(<WarpHistory />)
  choose(file({ '700000001': [warp('1', '11', '3'), warp('2', '11', '5', 'Acheron')] }))
  expect(await screen.findByText('2 new warps imported.')).toBeDefined()
  expect(screen.getByRole('heading', { name: 'Character Event Warp' })).toBeDefined()
  expect(screen.getByText('Acheron')).toBeDefined()
  expect(screen.getByText('0 warps since the last 5★')).toBeDefined()
  cleanup()
  render(<WarpHistory />)
  expect(screen.getByText('UID 700000001')).toBeDefined()
  choose(file({ '700000001': [warp('2', '11', '5')] }))
  expect(await screen.findByText('No new warps.')).toBeDefined()
})

test('a wrong or oversized file is refused with the reason', async () => {
  render(<WarpHistory />)
  choose(new File(['nope'], 'x.json'))
  expect((await screen.findByRole('alert')).textContent).toBe(
    'This file is not a UIGF or SRGF file.',
  )
  const huge = new File(['{}'], 'big.json')
  Object.defineProperty(huge, 'size', { value: 30_000_000 })
  choose(huge)
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toBe(
      'This file is too large to be a warp history.',
    ),
  )
})

test('with several accounts one is picked, and the history can be deleted', async () => {
  render(<WarpHistory />)
  choose(file({ '700000001': [warp('1', '1', '4')], '700000002': [warp('2', '12', '5')] }))
  const account = await screen.findByLabelText('Account')
  fireEvent.change(account, { target: { value: '700000002' } })
  expect(screen.getByRole('heading', { name: 'Light Cone Event Warp' })).toBeDefined()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Delete saved history' }))
  expect(screen.queryByLabelText('Account')).toBeNull()
})

test('a file the phone cannot read, or a delete the browser refuses, says so', async () => {
  render(<WarpHistory />)
  const unreadable = new File(['{}'], 'gone.json')
  Object.defineProperty(unreadable, 'text', {
    value: async () => Promise.reject(new Error('gone')),
  })
  choose(unreadable)
  expect((await screen.findByRole('alert')).textContent).toBe('This file could not be read.')
  choose(file({ '700000001': [warp('1', '1', '4')] }))
  await screen.findByText('1 new warps imported.')
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Delete saved history' }))
  expect(
    await screen.findByText(
      'This browser kept its saved data: the history may come back on reload.',
    ),
  ).toBeDefined()
})

test('imports warps with the link from the error page, and says how to get it', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true }) // the import pauses between banners
  const pull = {
    id: '1',
    banner: '11',
    time: '2025-01-01 12:00:00',
    name: 'Acheron',
    kind: 'Character',
    rank: 5,
  }
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { banner } = JSON.parse(String(init?.body)) as { banner: string }
    expect(url).toBe('/api/wishes/warps')
    return Response.json(
      banner === '11'
        ? { uid: '700000001', timezone: 1, pulls: [pull] }
        : { uid: null, timezone: null, pulls: [] },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<WarpHistory />)
  expect(screen.getByText('Where to get the history')).toBeDefined()
  expect(screen.queryAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    'https://hsr.hoyoverse.com/en-us/company/privacy',
  ]) // no link sends players to another tracker
  expect(screen.getByText('Ask HoYoverse for your data')).toBeDefined()
  fireEvent.change(screen.getByLabelText('The link'), {
    target: { value: 'The webpage at https://example.org/?authkey=x#/log could not be loaded' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Import history' }))
  // A file merged meanwhile would be lost when the import saves its own copy of the store.
  expect(screen.getByLabelText('Or from a UIGF or SRGF file')).toHaveProperty('disabled', true)
  await vi.runAllTimersAsync()
  expect(await screen.findByText('1 new warps imported.')).toBeDefined()
  expect(screen.getByRole('heading', { name: 'Character Event Warp' })).toBeDefined()
  expect(screen.getByLabelText('The link')).toHaveProperty('value', '')
  expect(fetchMock.mock.calls).toHaveLength(6) // one page of each warp banner
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
