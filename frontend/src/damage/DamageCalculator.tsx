import type { JSX, SubmitEvent } from 'react'
import { isKeyOf } from '../api/http'
import { useRequest } from '../api/useRequest'
import { type Character, formatStat } from '../showcase/showcase'
import { type Damage, type DamageRequest, fetchDamage } from './damage'

// `satisfies` makes a choice added to the API a compile error here.
const SCALINGS = {
  atk: 'ATK',
  hp: 'HP',
  def: 'DEF',
  elemental_mastery: 'Elemental Mastery',
} as const satisfies Record<DamageRequest['scaling'], string>

const REACTIONS = {
  none: 'None',
  weak: 'Vaporize / Melt ×1.5',
  strong: 'Vaporize / Melt ×2',
} as const satisfies Record<DamageRequest['reaction'], string>

const BONUSES = {
  physical_dmg: true,
  pyro_dmg: true,
  hydro_dmg: true,
  electro_dmg: true,
  cryo_dmg: true,
  anemo_dmg: true,
  geo_dmg: true,
  dendro_dmg: true,
} as const satisfies Record<NonNullable<DamageRequest['bonus']>, true>

const RESULTS = [
  { label: 'Average', key: 'average' },
  { label: 'Crit', key: 'crit' },
  { label: 'Non-crit', key: 'non_crit' },
] as const satisfies readonly { label: string; key: keyof Damage }[]

// The API enforces the same limits (backend/app/damage/api.py); these only guide the input.
const MAX_MULTIPLIER_PERCENT = 10_000
const MAX_ENEMY_LEVEL = 200
const MIN_RESISTANCE_PERCENT = -100
const MAX_RESISTANCE_PERCENT = 1000

const DEFAULT_MULTIPLIER_PERCENT = 100
const DEFAULT_ENEMY_LEVEL = 90
const DEFAULT_RESISTANCE_PERCENT = 10
const PERCENT = 100
const NO_BONUS = ''

const whole = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })

/** The key a <select> holds, or an error if the page was tampered into an impossible choice. */
function choice<TTable extends object>(table: TTable, value: unknown): keyof TTable {
  if (!isKeyOf(table, value)) throw new Error(`Unexpected choice: ${String(value)}`)
  return value
}

function readRequest(data: FormData, character: Character): DamageRequest {
  const bonus = data.get('bonus')
  return {
    level: character.level,
    stats: character.stats,
    scaling: choice(SCALINGS, data.get('scaling')),
    multiplier: Number(data.get('multiplier')) / PERCENT,
    bonus: bonus === NO_BONUS ? null : choice(BONUSES, bonus),
    reaction: choice(REACTIONS, data.get('reaction')),
    enemy_level: Number(data.get('enemy_level')),
    enemy_resistance: Number(data.get('enemy_resistance')) / PERCENT,
  }
}

export function DamageCalculator({ character }: { readonly character: Character }): JSX.Element {
  const [state, run] = useRequest<Damage>()
  const bonuses = character.stats.filter((stat) => isKeyOf(BONUSES, stat.key))

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void run(async () => fetchDamage(readRequest(data, character)))
  }

  return (
    <details>
      <summary>Damage</summary>
      <form onSubmit={submit}>
        <label>
          Talent multiplier, %
          <input
            name="multiplier"
            type="number"
            inputMode="decimal"
            min={0.1}
            max={MAX_MULTIPLIER_PERCENT}
            step="any"
            defaultValue={DEFAULT_MULTIPLIER_PERCENT}
            required
          />
        </label>
        <label>
          Scales with
          <select name="scaling">
            {Object.entries(SCALINGS).map(([scaling, label]) => (
              <option key={scaling} value={scaling}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Damage bonus
          <select name="bonus" defaultValue={bonuses[0]?.key ?? NO_BONUS}>
            <option value={NO_BONUS}>None</option>
            {bonuses.map((stat) => (
              <option key={stat.key} value={stat.key}>
                {formatStat(stat)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reaction
          <select name="reaction">
            {Object.entries(REACTIONS).map(([reaction, label]) => (
              <option key={reaction} value={reaction}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Enemy level
          <input
            name="enemy_level"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_ENEMY_LEVEL}
            defaultValue={DEFAULT_ENEMY_LEVEL}
            required
          />
        </label>
        <label>
          Enemy resistance, %
          <input
            name="enemy_resistance"
            type="number"
            inputMode="decimal"
            min={MIN_RESISTANCE_PERCENT}
            max={MAX_RESISTANCE_PERCENT}
            step="any"
            defaultValue={DEFAULT_RESISTANCE_PERCENT}
            required
          />
        </label>
        <button type="submit" disabled={state.status === 'loading'}>
          Calculate damage
        </button>
      </form>
      {'message' in state && <p role="alert">{state.message}</p>}
      <div aria-live="polite">
        {'data' in state && (
          <dl>
            {RESULTS.map(({ label, key }) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{whole.format(state.data[key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </details>
  )
}
