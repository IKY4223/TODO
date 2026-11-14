import type { JSX } from 'react'

// Drawn for this app on a 24px grid after the games' own motifs, not taken from them: stroke
// only, so they take the text colour.
const PATHS = {
  // The arc of the logo: the start page.
  home:
    'M4.5 16a7.5 7.5 0 0 1 15 0M13.6 16a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z',
  // A character's card: builds and showcases.
  builds:
    'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7.5 18.5a4.5 4.5 0 0 1 9 0',
  // A Planar Ornament sphere with its orbit: relics.
  relics:
    'M17.5 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM2.6 15.4A10 3.4 -20 0 1 21.4 8.6A10 3.4 -20 0 1 2.6 15.4Z',
  // A pass with a star: warps and wishes.
  warps:
    'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6ZM12 8.2c.45 2 1.8 3.35 3.8 3.8-2 .45-3.35 1.8-3.8 3.8-.45-2-1.8-3.35-3.8-3.8 2-.45 3.35-1.8 3.8-3.8Z',
  // A page of records: history.
  history:
    'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM9 8h6M9 12h6M9 16h3.5',
  // The action order, read top down: speed.
  speed:
    'M4 5.5h9M4 12h6M4 18.5h3.5M17.5 4v16M14.5 17l3 3 3-3',
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

export type ToolIconName = keyof typeof PATHS

/** A tool's icon, beside its name: decorative, hidden from screen readers. */
export function ToolIcon({ name }: { readonly name: ToolIconName }): JSX.Element {
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
