import { type JSX, type SubmitEvent, useState } from 'react'
import { MAX_PULLS, WISH_BANNERS } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { type Message, useLocalized, useT } from '../i18n'
import { type Forecast, type ForecastQuery, fetchForecast } from './forecast'

const CERTAIN = 1
// An uncertain chance must never read as 100%.
const HIGHEST_UNCERTAIN = 0.999

type BannerKey = keyof typeof WISH_BANNERS

interface BannerChoice {
  readonly key: BannerKey
  readonly label: Message
  /** How the game names a count of copies: C0 for one Genshin character, S1 for one light cone. */
  readonly prefix: 'C' | 'E' | 'S'
  readonly firstCopy: 0 | 1
}

const GAMES = {
  genshin: {
    title: 'Wish forecast',
    hint: 'Genshin Impact · limited character banner',
    banners: [{ key: 'genshin_character', label: 'Character Event', prefix: 'C', firstCopy: 0 }],
  },
  starrail: {
    title: 'Warp forecast',
    hint: 'Honkai: Star Rail · limited warps',
    banners: [
      { key: 'starrail_character', label: 'Character Event Warp', prefix: 'E', firstCopy: 0 },
      { key: 'starrail_light_cone', label: 'Light Cone Event Warp', prefix: 'S', firstCopy: 1 },
    ],
  },
} as const satisfies Record<string, { title: Message; hint: Message; banners: readonly BannerChoice[] }>

const targets = ({ key, prefix, firstCopy }: BannerChoice): { copies: number; label: string }[] =>
  Array.from({ length: WISH_BANNERS[key].max_copies }, (_, index) => ({
    copies: index + 1,
    label: `${prefix}${index + firstCopy}`,
  }))

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

const formatChance = (chance: number): string =>
  percent.format(chance < CERTAIN ? Math.min(chance, HIGHEST_UNCERTAIN) : chance)

function readQuery(form: HTMLFormElement, banner: BannerKey): ForecastQuery {
  const data = new FormData(form)
  return {
    banner,
    pity: Number(data.get('pity')),
    guaranteed: data.has('guaranteed'),
    copies: Number(data.get('copies')),
    pulls: Number(data.get('pulls')),
  }
}

function ForecastResult({ forecast }: { readonly forecast: Forecast }): JSX.Element {
  const t = useT()
  const rows = [...forecast.milestones, { chance: CERTAIN, pulls: forecast.guaranteed_at }]
  return (
    <>
      <p className="chance">
        <strong>{formatChance(forecast.probability)}</strong>
        <span>{t('chance to reach your target')}</span>
      </p>
      <table>
        <caption>{t('Pulls needed')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('Chance')}</th>
            <th scope="col">{t('Pulls')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ chance, pulls }) => (
            <tr key={chance}>
              <td>{formatChance(chance)}</td>
              <td>{pulls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export function WishForecast({ game }: { readonly game: keyof typeof GAMES }): JSX.Element {
  const { title, hint, banners } = GAMES[game]
  const [chosen, setChosen] = useState<BannerKey>(banners[0].key)
  const banner: BannerChoice = banners.find(({ key }) => key === chosen) ?? banners[0]
  const [state, run] = useRequest<Forecast>()
  const t = useT()
  const localized = useLocalized()

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const query = readQuery(event.currentTarget, banner.key)
    void run(() => fetchForecast(query))
  }

  return (
    <section aria-labelledby={`${game}-forecast-title`}>
      <h2 id={`${game}-forecast-title`}>{t(title)}</h2>
      <p className="hint">{t(hint)}</p>
      <form onSubmit={submit}>
        {banners.length > 1 ? (
          <label>
            {t('Banner')}
            <select
              value={banner.key}
              onChange={(event) => {
                setChosen(banners.find(({ key }) => key === event.target.value)?.key ?? chosen)
              }}
            >
              {banners.map(({ key, label }) => (
                <option key={key} value={key}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          {t('Pulls since last 5★')}
          <input
            name="pity"
            type="number"
            inputMode="numeric"
            min={0}
            max={WISH_BANNERS[banner.key].max_pity}
            defaultValue={0}
            required
          />
        </label>
        <label className="check">
          <input name="guaranteed" type="checkbox" />
          {t('Next 5★ is guaranteed')}
        </label>
        <label>
          {t('Pulls available')}
          <input
            name="pulls"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_PULLS}
            required
          />
        </label>
        <label>
          {t('Target')}
          <select name="copies">
            {targets(banner).map(({ copies, label }) => (
              <option key={copies} value={copies}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={state.status === 'loading'}>
          {t('Calculate')}
        </button>
      </form>
      {'message' in state && <p role="alert">
          {t('Could not calculate: {reason}', { reason: localized(state.message) })}
        </p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">{t('Calculating…')}</p>}
        {'data' in state && <ForecastResult forecast={state.data} />}
      </div>
    </section>
  )
}
