import { cleanup, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Broken(): JSX.Element {
  throw new Error('render failed')
}

test('a crash in one tool is contained and explained', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // React reports the caught error
  render(
    <>
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
      <p>the rest of the page</p>
    </>,
  )
  expect(screen.getByRole('alert').textContent).toContain('Something went wrong')
  expect(screen.getByRole('button', { name: 'Reload' })).toBeDefined()
  expect(screen.getByText('the rest of the page')).toBeDefined()
})

test('healthy content is shown as is', () => {
  render(
    <ErrorBoundary>
      <p>fine</p>
    </ErrorBoundary>,
  )
  expect(screen.getByText('fine')).toBeDefined()
  expect(screen.queryByRole('alert')).toBeNull()
})
