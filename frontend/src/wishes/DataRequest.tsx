import type { JSX } from 'react'
import { useT } from '../i18n'

// The same HoYoverse policy, as each game's site publishes it.
const POLICIES = {
  genshin: 'https://genshin.hoyoverse.com/en/company/privacy',
  starrail: 'https://hsr.hoyoverse.com/en-us/company/privacy',
} as const

/** What HoYoverse's privacy policy says about asking for a copy of one's data, and no more. */
export function DataRequest({ game }: { readonly game: keyof typeof POLICIES }): JSX.Element {
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
        {t('Source:')} <a href={POLICIES[game]}>{t('HoYoverse privacy policy')}</a>
      </p>
    </details>
  )
}
