import { type JSX, type SubmitEvent, useState } from 'react'
import { ApiError, isKeyOf } from '../api/http'
import { MAX_RELIC_LEVEL, RELIC_SUBSTATS, RELIC_UPGRADE_EVERY } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { useLocalized, useT } from '../i18n'
import { fetchRelicForecast, type RelicForecast, type RelicQuery } from './relics'
import { type Relic, SLOTS, statName, STATS } from './starrail'
import { relicScore, useShowcase } from './store'

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
const score = new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const NO_CHOICE = ''
const MAX_STAT_VALUE = 10_000

const statKeys = Object.keys(STATS).filter((key) => isKeyOf(STATS, key))

/** An empty number field is "not given", not zero. */
const numberOrNull = (text: FormDataEntryValue | null): number | null =>
  text === null || text === NO_CHOICE ? null : Number(text)

function readQuery(form: HTMLFormElement, beat: number | null): RelicQuery {
  const data = new FormData(form)
  const stats = (name: string): StatKey[] =>
    data.getAll(name).filter((value) => isKeyOf(STATS, value))
  const values = data.getAll('value')
  const [goalKey] = stats('goal')
  const goalValue = numberOrNull(data.get('goalValue'))
  return {
    main: stats('main')[0] ?? 'hp',
    level: Number(data.get('level')),
    // Every slot posts a stat and a value, chosen or not: pair them before dropping the empty.
    subs: data.getAll('sub').flatMap((key, slot) =>
      isKeyOf(STATS, key) ? [{ key, value: numberOrNull(values[slot] ?? null) }] : [],
    ),
    wanted: stats('wanted'),
    beat,
    goal: goalKey && goalValue !== null ? { key: goalKey, value: goalValue } : null,
  }
}

interface Rival {
  /** Who wears the relic to beat, for the result line. */
  readonly label: string
  readonly relic: Relic
}

function ForecastResult(props: {
  readonly forecast: RelicForecast
  readonly goal: string | undefined
}): JSX.Element {
  const { forecast, goal } = props
  const t = useT()
  const { upgrades, chances } = forecast
  // chances[n] is "exactly n"; the player asks "at least n".
  const atLeast = chances.map((_, hits) =>
    chances.slice(hits).reduce((sum, chance) => sum + chance, 0),
  )
  return (
    <>
      <p className="chance">
        <strong>
          {upgrades === 1 ? t('1 upgrade left') : t('{count} upgrades left', { count: upgrades })}
        </strong>
        <span>
          {t('{average} on average go to the substats you want', {
            average: average.format(forecast.expected),
          })}
        </span>
      </p>
      <dl className="answers">
        {forecast.score === null ? null : (
          <div>
            <dt>{t('Score now')}</dt>
            <dd>{score.format(forecast.score)}</dd>
          </div>
        )}
        {forecast.beats === null ? null : (
          <div>
            <dt>{t('Chance to beat the equipped relic')}</dt>
            <dd>{percent.format(forecast.beats)}</dd>
          </div>
        )}
        {forecast.reaches === null ? null : (
          <div>
            <dt>{t('Chance to reach {goal}', { goal: goal ?? '' })}</dt>
            <dd>{percent.format(forecast.reaches)}</dd>
          </div>
        )}
      </dl>
      {upgrades ? (
        <table>
          <thead>
            <tr>
              <th scope="col">{t('Wanted upgrades')}</th>
              <th scope="col">{t('Chance')}</th>
            </tr>
          </thead>
          <tbody>
            {atLeast.slice(1).map((chance, index) => (
              // eslint-disable-next-line react/no-array-index-key -- rows are the counts 1..n
              <tr key={index}>
                <td>{t('At least {count}', { count: index + 1 })}</td>
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
  const [goal, setGoal] = useState<string>()
  const t = useT()
  const localized = useLocalized()
  const showcase = useShowcase()
  const rivals: Rival[] = (showcase?.characters ?? []).flatMap((character) =>
    character.relics.map((relic) => ({ label: `${character.name} · ${t(SLOTS[relic.slot])}`, relic })),
  )

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const wanted = data.getAll('wanted').map(String)
    const rival = rivals.find(({ label }) => label === data.get('rival'))
    const query = readQuery(event.currentTarget, rival ? relicScore(rival.relic, wanted) : null)
    setGoal(query.goal ? `${statName(query.goal.key, t)} ${query.goal.value}` : undefined)
    void run(async () => {
      if (!query.wanted.length && !query.goal) {
        throw new ApiError('Pick at least one substat you want, or set a goal.')
      }
      return fetchRelicForecast(query)
    })
  }

  return (
    <section aria-labelledby="relic-advisor-title">
      <h2 id="relic-advisor-title">{t('Relic advisor')}</h2>
      <p className="hint">
        {t('Honkai: Star Rail · is a 5★ relic worth leveling? Exact chances, not a simulation.')}
      </p>
      <form onSubmit={submit}>
        <label>
          {t('Main stat')}
          <select name="main" required defaultValue={NO_CHOICE}>
            <option value={NO_CHOICE} disabled>
              {t('Choose')}
            </option>
            {statKeys.map((key) => (
              <option key={key} value={key}>
                {statName(key, t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Level')}
          <select name="level">
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                +{level}
              </option>
            ))}
          </select>
        </label>
        {SUBSTAT_SLOTS.map((slot) => (
          <div key={slot} className="pair">
            <label>
              {t('Substat {slot}', { slot })}
              <select name="sub" required={slot !== OPTIONAL_SLOT} defaultValue={NO_CHOICE}>
                <option value={NO_CHOICE} disabled={slot !== OPTIONAL_SLOT}>
                  {slot === OPTIONAL_SLOT ? t('None (3 substats)') : t('Choose')}
                </option>
                {RELIC_SUBSTATS.map((key) => (
                  <option key={key} value={key}>
                    {statName(key, t)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('Value {slot}', { slot })}
              <input name="value" type="number" inputMode="decimal" min={0} max={MAX_STAT_VALUE} step="any" />
            </label>
          </div>
        ))}
        <p className="hint">
          {t(
            'Values as the game shows them: 5.8 for 5.8%. They are only needed to compare relics or to set a goal. The game rounds values down, so the answer is slightly cautious.',
          )}
        </p>
        <fieldset>
          <legend>{t('Substats you want')}</legend>
          {RELIC_SUBSTATS.map((key) => (
            <label key={key} className="check">
              <input
                name="wanted"
                type="checkbox"
                value={key}
                defaultChecked={WANTED_BY_DEFAULT.has(key)}
              />
              {statName(key, t)}
            </label>
          ))}
        </fieldset>
        <div className="pair">
          <label>
            {t('Goal stat')}
            <select name="goal" defaultValue={NO_CHOICE}>
              <option value={NO_CHOICE}>{t('No goal')}</option>
              {RELIC_SUBSTATS.map((key) => (
                <option key={key} value={key}>
                  {statName(key, t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Goal value')}
            <input name="goalValue" type="number" inputMode="decimal" min={0} max={MAX_STAT_VALUE} step="any" />
          </label>
        </div>
        {rivals.length ? (
          <label>
            {t('Compare with')}
            <select name="rival" defaultValue={NO_CHOICE}>
              <option value={NO_CHOICE}>{t('Nothing')}</option>
              {rivals.map(({ label }) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="hint">
            {t('Load your characters in Builds to compare with a relic they wear.')}
          </p>
        )}
        <button type="submit" disabled={state.status === 'loading'}>
          {t('Calculate')}
        </button>
      </form>
      {'message' in state && <p role="alert">{localized(state.message)}</p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">{t('Calculating…')}</p>}
        {'data' in state && <ForecastResult forecast={state.data} goal={goal} />}
      </div>
    </section>
  )
}
