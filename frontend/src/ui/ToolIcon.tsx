import type { JSX } from 'react'
import { isKeyOf } from '../api/http'

// The tools' icons are the game's own: Honkai: Star Rail's phone menu signs and its speed stat
// icon, from Mar-7th/StarRailRes (icon/sign and icon/property), served from public/icons. They
// belong to HoYoverse, not to this project's licence. index.css paints each as a mask, so it
// takes the text colour in both themes.
const GLYPHS = ['home', 'builds', 'relics', 'warps', 'history', 'speed'] as const

// The theme button's icons are drawn for this app on a 24px grid: the game has none for it.
const PATHS = {
  // The light theme.
  sun:
    'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6',
  // The dark theme.
  moon:
    'M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6Z',
  // Half light, half dark: the theme on the device.
  auto:
    'M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0ZM12 3.5v17',
} as const

export type ToolIconName = (typeof GLYPHS)[number] | keyof typeof PATHS

/** A tool's icon, beside its name: decorative, hidden from screen readers. */
export function ToolIcon({ name }: { readonly name: ToolIconName }): JSX.Element {
  if (!isKeyOf(PATHS, name)) {
    return <span className="tool-icon" data-icon={name} aria-hidden="true" />
  }
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="tool-icon">
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
