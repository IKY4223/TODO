import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { SCRIPTS } from './link-scripts'
import { PcScript } from './PcScript'

// What a script may not do: reach the network, run other code, or change a file. Matched as
// words, case-insensitive, the way PowerShell reads command names.
const FORBIDDEN = [
  'Invoke-WebRequest',
  'Invoke-RestMethod',
  'iwr',
  'irm',
  'curl',
  'wget',
  'WebClient',
  'HttpClient',
  'Net.Sockets',
  'Start-BitsTransfer',
  'Invoke-Expression',
  'iex',
  'Start-Process',
  'Out-File',
  'Set-Content',
  'Add-Content',
  'New-Item',
  'Remove-Item',
  'Copy-Item',
  'Move-Item',
  'Rename-Item',
  'WriteAll',
  'Registry',
]

test.each(Object.entries(SCRIPTS))('the %s script only reads, and sends nothing', (_, script) => {
  // Each word whole, any case: "iex" matches "IEX (...)", not "index".
  // https://regex101.com/?flavor=javascript&regex=%5Cbiex%5Cb&flags=i&testString=IEX%20(x)%0Aindex
  const used = FORBIDDEN.filter((word) => new RegExp(String.raw`\b${word}\b`, 'i').test(script))
  expect(used).toEqual([])
  // A redirection into a file: matches "> out.txt" and ">$path", not "6>&1" or "->".
  // https://regex101.com/?flavor=javascript&regex=(%5E%7C%5B%5E-%5Cd%5D)%3E%5Cs*%5B%5Cw%24%22%27%5C%5C%5D&testString=%3E%20out.txt%0A%24a%3E%24path%0A6%3E%261%0A-%3E
  expect(script).not.toMatch(/(^|[^-\d])>\s*[\w$"'\\]/)
  expect(script).toContain("[IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')")
})

test('the Star Rail steps show the Star Rail script and copy it whole', async () => {
  const writeText = vi.fn(async () => {})
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<PcScript game="starrail" />)
  expect(screen.getByText('Open the warp details page of the game')).toBeTruthy()
  expect(screen.getByRole('code').textContent).toBe(SCRIPTS.starrail)
  fireEvent.click(screen.getByRole('button', { name: 'Copy the script' }))
  expect(writeText).toHaveBeenCalledWith(SCRIPTS.starrail)
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  vi.unstubAllGlobals()
})
