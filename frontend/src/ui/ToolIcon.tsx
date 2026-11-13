import type { JSX } from 'react'

// Line icons drawn for this app on a 24px grid: stroke only, so they take the text colour.
const PATHS = {
  // A house: the start page.
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4Z',
  // A person: builds and showcases.
  builds: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  // A gem: relics.
  relics: 'M6 3h12l3 6-9 12L3 9l3-6Zm-3 6h18M9 3l3 18 3-18',
  // A four-pointed star: warps and wishes.
  warps:
    'M12 2c.9 5.1 4.9 9.1 10 10-5.1.9-9.1 4.9-10 10-.9-5.1-4.9-9.1-10-10 5.1-.9 9.1-4.9 10-10Z',
  // A clock turning back: history.
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5m4-2v5l3 2',
  // A gauge: speed.
  speed: 'M3.5 18a9 9 0 1 1 17 0M12 16l4.5-5.5M12 16h.01',
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
