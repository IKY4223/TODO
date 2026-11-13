import { type JSX, type SubmitEvent, useState } from 'react'
import { MAX_LINK_LENGTH } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { useLocalized, useT } from '../i18n'
import {
  type BannerSummary,
  EMPTY_HISTORY,
  importHistory,
  loadHistory,
  saveHistory,
  summarize,
  WISHES,
} from './history'

const LINK_ROWS = 4
const DELETE_QUESTION =
  'Delete the saved wish history from this device? Pulls older than a year cannot be imported again.'
export const NOT_SAVED =
  ' This browser does not keep site data, so the history lasts until this page closes.'

export function BannerCard(props: {
  readonly summary: BannerSummary
  /** Star Rail's pulls are warps, and Russian names them apart from Genshin's wishes. */
  readonly warps?: boolean
}): JSX.Element {
  const { summary, warps = false } = props
  const t = useT()
  return (
    <article className="card">
      <h3>{t(summary.label)}</h3>
      <p>
        <strong>
          {t(warps ? '{count} warps since the last 5★' : '{count} pulls since the last 5★', {
            count: summary.pity5,
          })}
        </strong>
      </p>
      <p className="hint">
        {t(
          warps
            ? '{total} warps in total · {count} since the last 4★'
            : '{total} pulls in total · {count} since the last 4★',
          { total: summary.total, count: summary.pity4 },
        )}
      </p>
      {summary.fiveStars.length ? (
        <table>
          <caption>{t('5★ pulls, newest first')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('Name')}</th>
              <th scope="col">{t('Pity')}</th>
            </tr>
          </thead>
          <tbody>
            {summary.fiveStars.map((five) => (
              <tr key={five.id}>
                <td>{five.name}</td>
                <td>{five.pity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </article>
  )
}

function Instructions({ open }: { readonly open: boolean }): JSX.Element {
  const t = useT()
  return (
    <>
      <details open={open}>
        <summary>{t('How to get the link on Android')}</summary>
        <ol>
          <li>{t('In the game, open Wish and tap History. Wait for it to load.')}</li>
          <li>{t('Turn off Wi-Fi and mobile data.')}</li>
          <li>{t('Tap refresh at the top right. An error page appears.')}</li>
          <li>{t('Press and hold its text, tap Select all, then Copy.')}</li>
          <li>{t('Turn the connection back on and paste the text below.')}</li>
        </ol>
      </details>
      <details>
        <summary>{t('On iPhone')}</summary>
        <p>
          {t(
            'The game gives iPhones no simple way to copy the link. Apps that record your traffic can capture it, but they need a certificate that lets them read everything your phone sends. Install one only from an app you trust, and remove it afterwards.',
          )}
        </p>
      </details>
    </>
  )
}

export function WishHistory(): JSX.Element {
  const [saved, setSaved] = useState(loadHistory)
  const [link, setLink] = useState('')
  const [progress, setProgress] = useState('')
  const [state, run] = useRequest<string>()
  const t = useT()
  const localized = useLocalized()
  const pulls = saved.current ? (saved.accounts[saved.current] ?? []) : []
  const outcome = 'data' in state ? state.data : ''

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void run(async () => {
      const result = await importHistory(
        link,
        saved,
        {
          onProgress: (banner, count) =>
            setProgress(t('{banner}: {count} pulls read', { banner: t(banner), count })),
        },
        WISHES,
      )
      if (!result.uid) return t('No pulls found for this link.')
      setSaved(result.history)
      setLink('') // the link is a key to the account's history: drop it once it has served
      const kept = saveHistory(result.history)
      const summary = result.added
        ? t('{count} new pulls imported.', { count: result.added })
        : t('No new pulls.')
      return summary + (kept ? '' : t(NOT_SAVED))
    })
  }

  const forget = (): void => {
    if (!window.confirm(t(DELETE_QUESTION))) return
    setSaved(EMPTY_HISTORY)
    saveHistory(EMPTY_HISTORY)
  }

  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title">{t('Wish history')}</h2>
      <p className="hint">{t('Genshin Impact · global servers · saved only on this device')}</p>
      <Instructions open={!pulls.length} />
      <form onSubmit={submit}>
        <label>
          {t('Text from the error page')}
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
            'The link lets anyone read your wish history for about a day. This app uses it for the import and never keeps it.',
          )}
        </p>
        <button type="submit" disabled={state.status === 'loading'}>
          {t('Import history')}
        </button>
      </form>
      {'message' in state && <p role="alert">{localized(state.message)}</p>}
      <output>{state.status === 'loading' ? progress : outcome}</output>
      {saved.current && pulls.length ? (
        <>
          <p>UID {saved.current}</p>
          <ul className="cards">
            {summarize(pulls).map((summary) => (
              <li key={summary.banner}>
                <BannerCard summary={summary} />
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
