import { type JSX, useState } from 'react'
import { useT } from '../i18n'

type Outcome = 'idle' | 'copied' | 'manual'

/** Shares a page of the app: the phone's share sheet, else the clipboard, else the link itself. */
export function ShareButton(props: {
  /** The page's address after "#", "#" included. */
  readonly address: string
  readonly title: string
}): JSX.Element {
  const { address, title } = props
  const t = useT()
  const [outcome, setOutcome] = useState<Outcome>('idle')
  const link = `${window.location.origin}${window.location.pathname}${address}`

  const share = async (): Promise<void> => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: link })
        return
      } catch (error) {
        // The player closed the sheet: nothing to do. Other refusals fall through to the clipboard.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(link)
      setOutcome('copied')
    } catch {
      setOutcome('manual') // no clipboard outside HTTPS, or the browser refused
    }
  }

  return (
    <div className="share">
      <button type="button" className="secondary" onClick={() => void share()}>
        {t('Share link')}
      </button>
      {outcome === 'copied' ? <output>{t('Link copied.')}</output> : null}
      {outcome === 'manual' ? (
        <label>
          {t('Link')}
          <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
        </label>
      ) : null}
    </div>
  )
}
