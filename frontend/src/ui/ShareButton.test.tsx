import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ShareButton } from './ShareButton'

const LINK = `${window.location.origin}${window.location.pathname}#starrail/builds/700000001/1409`

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const share = (): void => {
  render(<ShareButton address="#starrail/builds/700000001/1409" title="Hyacine" />)
  fireEvent.click(screen.getByRole('button', { name: 'Share link' }))
}

test('hands the link to the phone’s share sheet where there is one', async () => {
  const sheet = vi.fn(async () => undefined)
  vi.stubGlobal('navigator', { share: sheet })
  share()
  await vi.waitFor(() => expect(sheet).toHaveBeenCalledWith({ title: 'Hyacine', url: LINK }))
  expect(screen.queryByRole('status')).toBeNull()
})

test('copies the link where there is no share sheet', async () => {
  const writeText = vi.fn(async () => undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  share()
  expect((await screen.findByRole('status')).textContent).toBe('Link copied.')
  expect(writeText).toHaveBeenCalledWith(LINK)
})

test('shows the link to copy by hand when the browser allows neither', async () => {
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
  })
  share()
  expect(((await screen.findByLabelText('Link')) as HTMLInputElement).value).toBe(LINK)
})

test('a share the player cancels changes nothing', async () => {
  const sheet = vi.fn(async () => Promise.reject(new DOMException('Cancelled', 'AbortError')))
  const writeText = vi.fn(async () => undefined)
  vi.stubGlobal('navigator', { share: sheet, clipboard: { writeText } })
  share()
  await vi.waitFor(() => expect(sheet).toHaveBeenCalled())
  expect(writeText).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('Link')).toBeNull()
})
