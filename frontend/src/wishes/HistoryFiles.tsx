import type { JSX } from 'react'
import { useT } from '../i18n'
import type { SavedHistory } from './history'
import { type HistoryFileFormat, toUigf } from './uigf'

// The link to a file stays valid a while after the click: some phones read it only then.
const KEEP_LINK_MS = 60_000
const DATE_LENGTH = 10 // "2026-11-13" out of an ISO time

/** Saves every account of the game on this device to a UIGF v4 file. */
export function ExportButton(props: {
  readonly saved: SavedHistory
  readonly format: HistoryFileFormat
  /** Names the file: hoyo-toolkit-<game>-<date>.json. */
  readonly game: 'genshin' | 'starrail'
}): JSX.Element {
  const { saved, format, game } = props
  const t = useT()
  const save = (): void => {
    const now = new Date()
    const text = JSON.stringify(toUigf(saved, format, now))
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `hoyo-toolkit-${game}-${now.toISOString().slice(0, DATE_LENGTH)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), KEEP_LINK_MS)
  }
  return (
    <div>
      <button type="button" onClick={save}>
        {t('Save to a file')}
      </button>
      <p className="hint">
        {t(
          'A UIGF file, which this page and other trackers read. Keep it: clearing the browser’s data deletes the history saved here.',
        )}
      </p>
    </div>
  )
}
