import { type JSX, type SubmitEvent, useState } from 'react'
import { type Forecast, type ForecastQuery, fetchForecast } from './forecast'

type ForecastState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'failed'; readonly message: string }
  | { readonly status: 'ready'; readonly forecast: Forecast }

// The API enforces the same limits (backend/app/wishes/api.py); these only guide the input.
const MAX_PITY = 89
const MAX_PULLS = 2000
const MAX_COPIES = 7

const CERTAIN = 1
// An uncertain chance must never read as 100%.
const HIGHEST_UNCERTAIN = 0.999

const TARGETS = Array.from({ length: MAX_COPIES }, (_, constellation) => ({
  copies: constellation + 1,
  label: `C${constellation}`,
}))

const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

const formatChance = (chance: number): string =>
  percent.format(chance < CERTAIN ? Math.min(chance, HIGHEST_UNCERTAIN) : chance)

function readQuery(form: HTMLFormElement): ForecastQuery {
  const data = new FormData(form)
  return {
    pity: Number(data.get('pity')),
    guaranteed: data.has('guaranteed'),
    copies: Number(data.get('copies')),
    pulls: Number(data.get('pulls')),
  }
}

function ForecastResult({ forecast }: { readonly forecast: Forecast }): JSX.Element {
  const rows = [...forecast.milestones, { chance: CERTAIN, pulls: forecast.guaranteed_at }]
  return (
    <>
      <p className="chance">
        <strong>{formatChance(forecast.probability)}</strong>
        <span>chance to reach your target</span>
      </p>
      <table>
        <caption>Pulls needed</caption>
        <thead>
          <tr>
            <th scope="col">Chance</th>
            <th scope="col">Pulls</th>
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

export function WishForecast(): JSX.Element {
  const [state, setState] = useState<ForecastState>({ status: 'idle' })

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const query = readQuery(event.currentTarget)
    setState({ status: 'loading' })
    try {
      setState({ status: 'ready', forecast: await fetchForecast(query) })
    } catch (error) {
      setState({ status: 'failed', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <section aria-labelledby="forecast-title">
      <h2 id="forecast-title">Wish forecast</h2>
      <p className="hint">Genshin Impact · limited character banner</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Pulls since last 5★
          <input
            name="pity"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_PITY}
            defaultValue={0}
            required
          />
        </label>
        <label className="check">
          <input name="guaranteed" type="checkbox" />
          Next 5★ is guaranteed
        </label>
        <label>
          Pulls available
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
          Target
          <select name="copies">
            {TARGETS.map(({ copies, label }) => (
              <option key={copies} value={copies}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={state.status === 'loading'}>
          Calculate
        </button>
      </form>
      {'message' in state && <p role="alert">Could not calculate: {state.message}</p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">Calculating…</p>}
        {'forecast' in state && <ForecastResult forecast={state.forecast} />}
      </div>
    </section>
  )
}
