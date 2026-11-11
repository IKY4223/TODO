import type { JSX, SubmitEvent } from 'react'
import { ApiError, isKeyOf } from '../api/http'
import { MAX_RELIC_LEVEL, RELIC_SUBSTATS, RELIC_UPGRADE_EVERY } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { fetchRelicForecast, type RelicForecast, type RelicQuery } from './relics'
import { STATS } from './starrail'

type StatKey = keyof typeof STATS

const SUBSTAT_SLOTS = [1, 2, 3, 4] as const
// The last substat may be missing: a 5★ relic drops with three or four.
const OPTIONAL_SLOT = 4
const WANTED_BY_DEFAULT: ReadonlySet<StatKey> = new Set(['spd', 'crit_rate', 'crit_dmg'])
// A relic keeps the same upgrades left until it reaches the next multiple of three.
const LEVELS = Array.from(
  { length: MAX_RELIC_LEVEL / RELIC_UPGRADE_EVERY },
  (_, step) => step * RELIC_UPGRADE_EVERY,
)

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })
const average = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

/** "HP" names two stats; the percent one says so. */
const statName = (key: StatKey): string =>
  key.endsWith('_percent') ? `${STATS[key].label} %` : STATS[key].label

const statKeys = Object.keys(STATS).filter((key) => isKeyOf(STATS, key))

function readQuery(form: HTMLFormElement): RelicQuery {
  const data = new FormData(form)
  const stats = (name: string): StatKey[] =>
    data.getAll(name).filter((value) => isKeyOf(STATS, value))
  return {
    main: stats('main')[0] ?? 'hp',
    level: Number(data.get('level')),
    subs: stats('sub'),
    wanted: stats('wanted'),
  }
}

function ForecastResult({ forecast }: { readonly forecast: RelicForecast }): JSX.Element {
  const { upgrades, chances } = forecast
  // chances[n] is "exactly n"; the player asks "at least n".
  const atLeast = chances.map((_, hits) =>
    chances.slice(hits).reduce((sum, chance) => sum + chance, 0),
  )
  return (
    <>
      <p className="chance">
        <strong>
          {upgrades} {upgrades === 1 ? 'upgrade' : 'upgrades'} left
        </strong>
        <span>{average.format(forecast.expected)} on average go to the substats you want</span>
      </p>
      {upgrades ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Wanted upgrades</th>
              <th scope="col">Chance</th>
            </tr>
          </thead>
          <tbody>
            {atLeast.slice(1).map((chance, index) => (
              // eslint-disable-next-line react/no-array-index-key -- rows are the counts 1..n
              <tr key={index}>
                <td>At least {index + 1}</td>
                <td>{percent.format(chance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  )
}

export function RelicAdvisor(): JSX.Element {
  const [state, run] = useRequest<RelicForecast>()

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const query = readQuery(event.currentTarget)
    void run(async () => {
      if (!query.wanted.length) throw new ApiError('Pick at least one substat you want.')
      return fetchRelicForecast(query)
    })
  }

  return (
    <section aria-labelledby="relic-advisor-title">
      <h2 id="relic-advisor-title">Relic advisor</h2>
      <p className="hint">
        Honkai: Star Rail · is a 5★ relic worth leveling? Exact chances, not a simulation.
      </p>
      <form onSubmit={submit}>
        <label>
          Main stat
          <select name="main" required defaultValue="">
            <option value="" disabled>
              Choose
            </option>
            {statKeys.map((key) => (
              <option key={key} value={key}>
                {statName(key)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select name="level">
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                +{level}
              </option>
            ))}
          </select>
        </label>
        {SUBSTAT_SLOTS.map((slot) => (
          <label key={slot}>
            Substat {slot}
            <select name="sub" required={slot !== OPTIONAL_SLOT} defaultValue="">
              <option value="" disabled={slot !== OPTIONAL_SLOT}>
                {slot === OPTIONAL_SLOT ? 'None (3 substats)' : 'Choose'}
              </option>
              {RELIC_SUBSTATS.map((key) => (
                <option key={key} value={key}>
                  {statName(key)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <fieldset>
          <legend>Substats you want</legend>
          {RELIC_SUBSTATS.map((key) => (
            <label key={key} className="check">
              <input
                name="wanted"
                type="checkbox"
                value={key}
                defaultChecked={WANTED_BY_DEFAULT.has(key)}
              />
              {statName(key)}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={state.status === 'loading'}>
          Calculate
        </button>
      </form>
      {'message' in state && <p role="alert">{state.message}</p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">Calculating…</p>}
        {'data' in state && <ForecastResult forecast={state.data} />}
      </div>
    </section>
  )
}
