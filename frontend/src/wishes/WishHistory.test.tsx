import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Pull } from './history'
import { WishHistory } from './WishHistory'

const UID = '700000001'
const ANDROID_TEXT =
  'Webpage not available The webpage at https://webstatic-sea.hoyoverse.com/index.html?authkey=a%2Bb#/log could not be loaded'

const pull = (n: number, rank: number, name: string): Pull => ({
  id: String(1_700_000_000_000_000_000n + BigInt(n)),
  banner: '301',
  time: '2026-10-01 12:00:00',
  name,
  kind: 'Character',
  rank,
})

// Newest first, as the API pages: a 5★ on the 2nd pull, 3 pulls since.
const PULLS = [
  pull(5, 3, 'Noelle'),
  pull(4, 4, 'Bennett'),
  pull(3, 3, 'Noelle'),
  pull(2, 5, 'Furina'),
  pull(1, 3, 'Noelle'),
]

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true }) // the import pauses between requests
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function serve(respond: (banner: string) => Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const { banner } = JSON.parse(String(init?.body)) as { banner: string } // the component sends it
    return respond(banner)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const characterOnly = (banner: string): Response =>
  Response.json(
    banner === '301'
      ? { uid: UID, timezone: null, pulls: PULLS }
      : { uid: null, timezone: null, pulls: [] },
  )

async function importFrom(text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('Text from the error page'), { target: { value: text } })
  const button = screen.getByRole('button', { name: 'Import history' })
  fireEvent.click(button)
  await vi.runAllTimersAsync()
  // Reading a response's body is no timer: under load it can still be running here, so wait
  // for the import to end, when its button is enabled again.
  await waitFor(() => expect(button).toHaveProperty('disabled', false))
}

test('explains how to get the link on a phone', () => {
  render(<WishHistory />)
  expect(screen.getByText('Turn off your Wi-Fi and data connection')).toBeDefined()
  expect(screen.getByText('Press Co-Op Mode')).toBeDefined()
  expect(screen.queryByRole('link', { name: 'paimon.moe' })).toBeNull() // players stay on this site
  expect(screen.getByText('On iPhone')).toBeDefined()
})

test('imports the history and shows pity per banner', async () => {
  serve(characterOnly)
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  expect(await screen.findByRole('heading', { name: 'Character Event' })).toBeDefined()
  expect(screen.getByText('3 pulls since the last 5★')).toBeDefined()
  expect(screen.getByText('5 pulls in total · 1 since the last 4★')).toBeDefined()
  expect(screen.getByRole('row', { name: 'Furina 2' })).toBeDefined()
  expect(screen.getByRole('status').textContent).toBe('5 new pulls imported.')
  expect(screen.getByText(`UID ${UID}`)).toBeDefined()
})

test('forgets the link once it is used', async () => {
  serve(characterOnly)
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  await screen.findByRole('heading', { name: 'Character Event' })
  expect(screen.getByLabelText<HTMLTextAreaElement>('Text from the error page').value).toBe('')
  expect(window.localStorage.getItem('hoyo-toolkit:wish-history')).not.toContain('authkey')
})

test('keeps the history on the device', async () => {
  serve(characterOnly)
  const { unmount } = render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  await screen.findByRole('heading', { name: 'Character Event' })
  unmount()
  render(<WishHistory />)
  expect(screen.getByRole('heading', { name: 'Character Event' })).toBeDefined()
})

test('a second import adds only the new pulls', async () => {
  serve(characterOnly)
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  await screen.findByRole('heading', { name: 'Character Event' })
  await importFrom(ANDROID_TEXT)
  expect(screen.getByRole('status').textContent).toBe('No new pulls.')
  expect(screen.getByText('5 pulls in total · 1 since the last 4★')).toBeDefined()
})

test.each([
  { answer: false, kept: true },
  { answer: true, kept: false },
])(
  'deleting asks first, since pulls older than a year cannot be imported again',
  async ({ answer, kept }) => {
    serve(characterOnly)
    vi.spyOn(window, 'confirm').mockReturnValue(answer)
    render(<WishHistory />)
    await importFrom(ANDROID_TEXT)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete saved history' }))
    expect(screen.queryByRole('heading', { name: 'Character Event' }) !== null).toBe(kept)
    expect(window.localStorage.getItem('hoyo-toolkit:wish-history')?.includes(UID)).toBe(kept)
  },
)

test('deletes the saved history on request', async () => {
  serve(characterOnly)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  fireEvent.click(await screen.findByRole('button', { name: 'Delete saved history' }))
  expect(screen.queryByRole('heading', { name: 'Character Event' })).toBeNull()
  expect(window.localStorage.getItem('hoyo-toolkit:wish-history')).not.toContain(UID)
})

test('shows the reason an import failed and allows a retry', async () => {
  const detail = 'This link has expired: they last about a day. Get a new one from the game.'
  serve(() => Response.json({ detail }, { status: 410 }))
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  expect((await screen.findByRole('alert')).textContent).toBe(detail)
  expect(screen.getByRole('button', { name: 'Import history' })).toHaveProperty('disabled', false)
})

test('says so when the browser will not keep the history', async () => {
  serve(characterOnly)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  expect((await screen.findByRole('status')).textContent).toContain('until this page closes')
})

test('says so when the account has no pulls', async () => {
  serve(() => Response.json({ uid: null, timezone: null, pulls: [] }))
  render(<WishHistory />)
  await importFrom(ANDROID_TEXT)
  expect((await screen.findByRole('status')).textContent).toBe('No pulls found for this link.')
})
