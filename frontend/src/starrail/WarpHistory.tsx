import { type ChangeEvent, type JSX, type SubmitEvent, useState } from 'react'
import { MAX_LINK_LENGTH } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { type Message, useLocalized, useT } from '../i18n'
import { DataRequest } from '../wishes/DataRequest'
import { BannerCard, NOT_SAVED } from '../wishes/WishHistory'
import { EMPTY_HISTORY, importHistory } from '../wishes/history'
import {
  MAX_FILE_BYTES,
  WarpFileError,
  WARPS,
  loadWarps,
  mergeWarps,
  parseWarpFile,
  saveWarps,
  summarizeWarps,
} from './warps'

const TOO_LARGE: Message = 'This file is too large to be a warp history.'
const UNREADABLE: Message = 'This file could not be read.'
const NOT_DELETED: Message =
  'This browser kept its saved data: the history may come back on reload.'
const LINK_ROWS = 4

// No trustworthy source gives a way to get this link on a phone. The one PC way a source gives
// runs another tracker's own script, which the owner does not send players to.
function Instructions({ open }: { readonly open: boolean }): JSX.Element {
  const t = useT()
  return (
    <>
      <details open={open}>
        <summary>{t('Where to get the history')}</summary>
        <p>
          {t(
            'No trustworthy source gives a way to get this link on Android or iPhone. A warp tracker on a PC can export the history to a UIGF or SRGF file, which this page reads below.',
          )}
        </p>
      </details>
      <DataRequest game="starrail" />
    </>
  )
}

/** Star Rail warp history: read with the link the game's history page opens, or from a file. */
export function WarpHistory(): JSX.Element {
  const t = useT()
  const localized = useLocalized()
  const [saved, setSaved] = useState(loadWarps)
  const [link, setLink] = useState('')
  const [progress, setProgress] = useState('')
  const [state, run] = useRequest<string>()
  const pulls = saved.current ? (saved.accounts[saved.current] ?? []) : []
  const accounts = Object.keys(saved.accounts)

  const keep = (history: typeof saved): boolean => {
    setSaved(history)
    return saveWarps(history)
  }

  // Every action reports through one request, so only the latest outcome is on screen, and a
  // file is not merged while a link import, holding an older copy of the store, is running.
  const read = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // the same file chosen again is read again
    if (!file) return
    void run(async () => {
      if (file.size > MAX_FILE_BYTES) throw new Error(t(TOO_LARGE))
      let fromFile
      try {
        fromFile = parseWarpFile(await file.text())
      } catch (error) {
        // A file the phone took back, or saved data this version cannot sort: say so, not nothing.
        throw new Error(t(error instanceof WarpFileError ? error.reason : UNREADABLE), {
          cause: error,
        })
      }
      const { history, added } = mergeWarps(saved, fromFile)
      const kept = keep(history)
      const summary = added
        ? t('{count} new warps imported.', { count: added })
        : t('No new warps.')
      return summary + (kept ? '' : t(NOT_SAVED))
    })
  }

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setProgress('')
    void run(async () => {
      const result = await importHistory(
        link,
        saved,
        {
          onProgress: (banner, count) =>
            setProgress(t('{banner}: {count} warps read', { banner: t(banner), count })),
        },
        WARPS,
      )
      if (!result.uid) return t('No warps found for this link.')
      setLink('') // the link is a key to the account's history: drop it once it has served
      const kept = keep(result.history)
      const summary = result.added
        ? t('{count} new warps imported.', { count: result.added })
        : t('No new warps.')
      return summary + (kept ? '' : t(NOT_SAVED))
    })
  }

  const forget = (): void => {
    if (!window.confirm(t('Delete the saved warp history from this device?'))) return
    void run(async () => {
      if (!keep(EMPTY_HISTORY)) throw new Error(t(NOT_DELETED))
      return ''
    })
  }

  return (
    <section aria-labelledby="warp-history-title">
      <h2 id="warp-history-title">{t('Warp history')}</h2>
      <p className="hint">{t('Honkai: Star Rail · global servers · saved only on this device')}</p>
      <div className="workspace">
        <div className="controls">
          <Instructions open={!pulls.length} />
          <form onSubmit={submit}>
            <label>
              {t('The link')}
              <textarea
                name="link"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                rows={LINK_ROWS}
                maxLength={MAX_LINK_LENGTH}
                autoComplete="off"
                spellCheck={false}
                required
              />
            </label>
            <p className="hint">
              {t(
                'The link lets anyone read your warp history for about a day. This app uses it for the import and never keeps it.',
              )}
            </p>
            <button type="submit" disabled={state.status === 'loading'}>
              {t('Import history')}
            </button>
          </form>
          <label>
            {t('Or from a UIGF or SRGF file')}
            <input
              type="file"
              accept=".json,application/json"
              disabled={state.status === 'loading'}
              onChange={read}
            />
          </label>
        </div>
        <div className="results">
          {'message' in state && <p role="alert">{localized(state.message)}</p>}
          <output>
            {state.status === 'loading' ? progress : 'data' in state ? state.data : ''}
          </output>
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
        </div>
      </div>
    </section>
  )
}
