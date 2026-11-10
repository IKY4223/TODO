import { type JSX, type SubmitEvent, useState } from 'react'
import { MAX_LINK_LENGTH } from '../api/limits'
import { useRequest } from '../api/useRequest'
import {
  type BannerSummary,
  EMPTY_HISTORY,
  importHistory,
  loadHistory,
  saveHistory,
  summarize,
} from './history'

const LINK_ROWS = 4
const DELETE_QUESTION =
  'Delete the saved wish history from this device? Pulls older than a year cannot be imported again.'
const NOT_SAVED = ' This browser does not keep site data, so the history lasts until this page closes.'

function BannerCard({ summary }: { readonly summary: BannerSummary }): JSX.Element {
  return (
    <article className="card">
      <h3>{summary.label}</h3>
      <p>
        <strong>{summary.pity5} pulls since the last 5★</strong>
      </p>
      <p className="hint">
        {summary.total} pulls in total · {summary.pity4} since the last 4★
      </p>
      {summary.fiveStars.length ? (
        <table>
          <caption>5★ pulls, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Pity</th>
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
  return (
    <>
      <details open={open}>
        <summary>How to get the link on Android</summary>
        <ol>
          <li>In the game, open Wish and tap History. Wait for it to load.</li>
          <li>Turn off Wi-Fi and mobile data.</li>
          <li>Tap refresh at the top right. An error page appears.</li>
          <li>Press and hold its text, tap Select all, then Copy.</li>
          <li>Turn the connection back on and paste the text below.</li>
        </ol>
      </details>
      <details>
        <summary>On iPhone</summary>
        <p>
          The game gives iPhones no simple way to copy the link. Apps that record your traffic can
          capture it, but they need a certificate that lets them read everything your phone sends.
          Install one only from an app you trust, and remove it afterwards.
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
  const pulls = saved.current ? (saved.accounts[saved.current] ?? []) : []
  const outcome = 'data' in state ? state.data : ''

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void run(async () => {
      const result = await importHistory(link, saved, { onProgress: setProgress })
      if (!result.uid) return 'No pulls found for this link.'
      setSaved(result.history)
      setLink('') // the link is a key to the account's history: drop it once it has served
      const kept = saveHistory(result.history)
      return (result.added ? `${result.added} new pulls imported.` : 'No new pulls.') + (kept ? '' : NOT_SAVED)
    })
  }

  const forget = (): void => {
    if (!window.confirm(DELETE_QUESTION)) return
    setSaved(EMPTY_HISTORY)
    saveHistory(EMPTY_HISTORY)
  }

  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title">Wish history</h2>
      <p className="hint">Genshin Impact · global servers · saved only on this device</p>
      <Instructions open={!pulls.length} />
      <form onSubmit={submit}>
        <label>
          Text from the error page
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
          The link lets anyone read your wish history for about a day. This app uses it for the
          import and never keeps it.
        </p>
        <button type="submit" disabled={state.status === 'loading'}>
          Import history
        </button>
      </form>
      {'message' in state && <p role="alert">{state.message}</p>}
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
            Delete saved history
          </button>
        </>
      ) : null}
    </section>
  )
}
