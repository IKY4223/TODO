import type { JSX } from 'react'
import { useT } from '../i18n'

const POLICY = 'https://hsr.hoyoverse.com/en-us/company/privacy'

/** What HoYoverse's privacy policy says about asking for a copy of one's data, and no more. */
export function DataRequest(): JSX.Element {
  const t = useT()
  return (
    <details>
      <summary>{t('Ask HoYoverse for your data')}</summary>
      <p>
        {t(
          "HoYoverse's privacy policy says you may have the right to ask for a copy of the personal data it holds, by a verifiable request to its Data Protection Office at privacy@hoyoverse.com. It does not say whether the history of pulls is part of that data.",
        )}
      </p>
      <p className="hint">
        {t('Source:')} <a href={POLICY}>{t('HoYoverse privacy policy')}</a>
      </p>
    </details>
  )
}
