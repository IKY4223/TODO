import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const heading = (name: string): HTMLElement | null => screen.queryByRole('heading', { name })

test('opens on character builds', () => {
  render(<App />)
  expect(heading('Character builds')).not.toBeNull()
  expect(heading('Wish forecast')).toBeNull()
  expect(screen.getByRole('link', { name: 'Builds' }).getAttribute('aria-current')).toBe('page')
})

test('switches tool when the address changes', async () => {
  render(<App />)
  window.location.hash = '#wishes'
  expect(await screen.findByRole('heading', { name: 'Wish forecast' })).toBeDefined()
  expect(heading('Character builds')).toBeNull()
  expect(screen.getByRole('link', { name: 'Wishes' }).getAttribute('aria-current')).toBe('page')
})

test('falls back to builds for an unknown address', () => {
  window.location.hash = '#toString'
  render(<App />)
  expect(heading('Character builds')).not.toBeNull()
})
