import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { useRequest } from './useRequest'

test('only the request asked for last decides what is shown', async () => {
  const { result } = renderHook(() => useRequest<string>())
  const finishers: ((value: string) => void)[] = []
  const first = new Promise<string>((resolve) => finishers.push(resolve))
  let running: Promise<void> = Promise.resolve()
  act(() => {
    running = result.current[1](async () => first)
  })
  await act(async () => result.current[1](async () => 'second'))
  await act(async () => {
    for (const finish of finishers) finish('first')
    await running
  })
  expect(result.current[0]).toEqual({ status: 'ready', data: 'second' })
})
