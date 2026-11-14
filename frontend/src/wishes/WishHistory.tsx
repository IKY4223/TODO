import { type ChangeEvent, type JSX, type SubmitEvent, useState } from 'react'
import { MAX_LINK_LENGTH } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { type Message, numberFormat, useLocalized, useT } from '../i18n'
import { DataRequest } from './DataRequest'
import { ExportButton } from './HistoryFiles'
import { PcScript } from './PcScript'
import { readHistoryFile } from './uigf'
import {
  type BannerSummary,
  EMPTY_HISTORY,
  GENSHIN_FILE,
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
const average = numberFormat({ maximumFractionDigits: 1 })

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
      <p className="hint">
        {summary.averagePity === null
          ? t(
              warps
                ? 'At most {longest} warps in a row without a 5★'
                : 'At most {longest} pulls in a row without a 5★',
              { longest: summary.longestDry },
            )
          : t(
              warps
                ? '{average} warps per 5★ on average · at most {longest} in a row without one'
                : '{average} pulls per 5★ on average · at most {longest} in a row without one',
              { average: average.format(summary.averagePity), longest: summary.longestDry },
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

// Word for word the steps paimon.moe gives (github.com/MadeBaruna/paimon-moe, MIT licence,
// copyright (c) 2021 Made Baruna), in its own English and Russian. Credited in the README, not
// linked: the owner keeps players on this site.
const ANDROID: readonly Message[] = [
  'Open Wish (in the game)',
  'Press History',
  'Wait for it to load',
  'Turn off your Wi-Fi and data connection',
  'Press refresh on top right corner',
  'The page should display an error and show you some text with a black font',
  "Hold the text and press select all, then copy that text (don't copy only some portion of the text)",
  'Turn on your Wi-Fi or data connection',
  'Paste the text to the textbox below',
]
const IPHONE: readonly Message[] = [
  'Open Paimon menu',
  'Press Feedback',
  'Wait for it to load and a feedback page should open',
  'Press In-game issue',
  'Press Co-Op Mode',
  'There is a link on the bottom of the reply; press that',
  'A browser should open up. Copy the link and paste it below',
]

function Steps({ steps }: { readonly steps: readonly Message[] }): JSX.Element {
  const t = useT()
  return (
    <ol>
      {steps.map((step) => (
        <li key={step}>{t(step)}</li>
      ))}
    </ol>
  )
}

function Instructions({ open }: { readonly open: boolean }): JSX.Element {
  const t = useT()
  return (
    <>
      <details open={open}>
        <summary>{t('On Android')}</summary>
        <Steps steps={ANDROID} />
      </details>
      <details>
        <summary>{t('On iPhone')}</summary>
        <Steps steps={IPHONE} />
      </details>
      <PcScript game="genshin" />
      <DataRequest game="genshin" />
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

  const keep = (history: typeof saved): boolean => {
    setSaved(history)
    return saveHistory(history)
  }

  // A file goes through the same request as a link, so it is not merged into an older copy of
  // the history while a link import runs.
  const read = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // the same file chosen again is read again
    if (!file) return
    void run(async () => {
      const { history, added } = await readHistoryFile(file, saved, GENSHIN_FILE, t)
      const kept = keep(history)
      const summary = added
        ? t('{count} new pulls imported.', { count: added })
        : t('No new pulls.')
      return summary + (kept ? '' : t(NOT_SAVED))
    })
  }

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
      setLink('') // the link is a key to the account's history: drop it once it has served
      const kept = keep(result.history)
      const summary = result.added
        ? t('{count} new pulls imported.', { count: result.added })
        : t('No new pulls.')
      return summary + (kept ? '' : t(NOT_SAVED))
    })
  }

  const forget = (): void => {
    if (!window.confirm(t(DELETE_QUESTION))) return
    keep(EMPTY_HISTORY)
  }

  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title">{t('Wish history')}</h2>
      <p className="hint">{t('Genshin Impact · global servers · saved only on this device')}</p>
      <div className="workspace">
        <div className="controls">
          <div className="instructions">
            <Instructions open={!pulls.length} />
          </div>
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
          <label>
            {t('Or from a UIGF file')}
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
              <ExportButton saved={saved} format={GENSHIN_FILE} game="genshin" />
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
