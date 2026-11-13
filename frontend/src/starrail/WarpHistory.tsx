import { type ChangeEvent, type JSX, useState } from 'react'
import { type Message, useT } from '../i18n'
import { BannerCard, NOT_SAVED } from '../wishes/WishHistory'
import { EMPTY_HISTORY } from '../wishes/history'
import {
  MAX_FILE_BYTES,
  WarpFileError,
  loadWarps,
  mergeWarps,
  parseWarpFile,
  saveWarps,
  summarizeWarps,
} from './warps'

const TOO_LARGE: Message = 'This file is too large to be a warp history.'

/** Star Rail warp history, imported from a UIGF or SRGF file another app exported. */
export function WarpHistory(): JSX.Element {
  const t = useT()
  const [saved, setSaved] = useState(loadWarps)
  const [outcome, setOutcome] = useState('')
  const [problem, setProblem] = useState<Message>()
  const pulls = saved.current ? (saved.accounts[saved.current] ?? []) : []
  const accounts = Object.keys(saved.accounts)

  const keep = (history: typeof saved): boolean => {
    setSaved(history)
    return saveWarps(history)
  }

  const read = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // the same file chosen again is read again
    if (!file) return
    setOutcome('')
    setProblem(undefined)
    if (file.size > MAX_FILE_BYTES) {
      setProblem(TOO_LARGE)
      return
    }
    try {
      const { history, added } = mergeWarps(saved, parseWarpFile(await file.text()))
      const kept = keep(history)
      const summary = added
        ? t('{count} new warps imported.', { count: added })
        : t('No new warps.')
      setOutcome(summary + (kept ? '' : t(NOT_SAVED)))
    } catch (error) {
      if (!(error instanceof WarpFileError)) throw error
      setProblem(error.reason)
    }
  }

  const forget = (): void => {
    if (!window.confirm(t('Delete the saved warp history from this device?'))) return
    keep(EMPTY_HISTORY)
    setOutcome('')
  }

  return (
    <section aria-labelledby="warp-history-title">
      <h2 id="warp-history-title">{t('Warp history')}</h2>
      <p className="hint">
        {t('Honkai: Star Rail · from a UIGF or SRGF file · saved only on this device')}
      </p>
      <details open={!pulls.length}>
        <summary>{t('Where to get the file')}</summary>
        <p>
          {t(
            'Apps that track warps can export your history as a UIGF (v4) or SRGF file. Choose that file here: it is read on this device and never sent anywhere.',
          )}
        </p>
      </details>
      <label>
        {t('UIGF or SRGF file')}
        <input type="file" accept=".json,application/json" onChange={(event) => void read(event)} />
      </label>
      {problem ? <p role="alert">{t(problem)}</p> : null}
      <output>{outcome}</output>
      {saved.current && pulls.length ? (
        <>
          {accounts.length > 1 ? (
            <label>
              {t('Account')}
              <select
                value={saved.current}
                onChange={(event) => keep({ ...saved, current: event.target.value })}
              >
                {accounts.map((uid) => (
                  <option key={uid} value={uid}>
                    {uid}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>UID {saved.current}</p>
          )}
          <ul className="cards">
            {summarizeWarps(pulls).map((summary) => (
              <li key={summary.banner}>
                <BannerCard summary={summary} warps />
              </li>
            ))}
          </ul>
          <button type="button" className="secondary" onClick={forget}>
            {t('Delete saved history')}
          </button>
        </>
      ) : null}
    </section>
  )
}
