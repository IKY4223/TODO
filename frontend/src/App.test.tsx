import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test.each([
  { name: 'healthy API', response: () => Response.json({ status: 'ok' }), text: 'API online' },
  { name: 'failing API', response: () => new Response(null, { status: 500 }), text: 'API offline' },
  { name: 'unexpected body', response: () => Response.json({ status: 'down' }), text: 'API offline' },
])('$name shows "$text"', async ({ response, text }) => {
  vi.stubGlobal('fetch', vi.fn(async () => response()))
  render(<App />)
  expect(await screen.findByText(text)).toBeDefined()
})
