import { afterEach, expect, test, vi } from 'vitest'
import { getJson, isRecord, postJson } from './http'

afterEach(() => vi.unstubAllGlobals())

const failing = (error: unknown): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async (): Promise<Response> => {
    throw error
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

test.each([
  {
    name: 'a request that takes too long',
    error: new DOMException('signal timed out', 'TimeoutError'),
    message: 'The server took too long to answer. Try again.',
  },
  {
    name: 'no connection',
    error: new TypeError('Failed to fetch'),
    message: 'Could not reach the server. Check your connection.',
  },
])('$name is explained in plain words', async ({ error, message }) => {
  failing(error)
  await expect(getJson('/api/health', isRecord)).rejects.toThrow(message)
  await expect(postJson('/api/damage', {}, isRecord)).rejects.toThrow(message)
})

test('every request carries a time limit', async () => {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({}))
  vi.stubGlobal('fetch', fetchMock)
  await getJson('/api/health', isRecord)
  await postJson('/api/damage', {}, isRecord)
  const signals = fetchMock.mock.calls.map(([, init]) => init?.signal)
  expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(true)
})
