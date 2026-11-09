import type { JSX, SubmitEvent } from 'react'
import { useRequest } from '../api/useRequest'
import {
  type Artifact,
  type Character,
  ELEMENTS,
  fetchShowcase,
  type Showcase,
  SLOTS,
  type Stat,
  STATS,
} from './showcase'

// The API accepts the same format (backend/app/showcase/api.py); this only guides the input.
const UID_PATTERN = '\\d{9,10}'

const whole = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

const formatValue = ({ key, value }: Stat): string =>
  (STATS[key].percent ? percent : whole).format(value)

const formatStat = (stat: Stat): string => `${STATS[stat.key].label} ${formatValue(stat)}`

function ArtifactItem({ artifact }: { readonly artifact: Artifact }): JSX.Element {
  return (
    <li>
      <span>
        {SLOTS[artifact.slot]} · {artifact.set_name} +{artifact.level}
      </span>
      <strong>{formatStat(artifact.main)}</strong>
      <span className="hint">{artifact.subs.map(formatStat).join(' · ')}</span>
    </li>
  )
}

function CharacterCard({ character }: { readonly character: Character }): JSX.Element {
  const { element, talents, weapon, artifacts } = character
  const summary = [
    `Lv. ${character.level}`,
    `C${character.constellation}`,
    ...(element ? [ELEMENTS[element]] : []),
  ]
  return (
    <article className="card" data-element={element}>
      <h3>{character.name}</h3>
      <p className="hint">{summary.join(' · ')}</p>
      {talents.length ? <p>Talents {talents.join(' / ')}</p> : null}
      <dl>
        {character.stats.map((stat) => (
          <div key={stat.key}>
            <dt>{STATS[stat.key].label}</dt>
            <dd>{formatValue(stat)}</dd>
          </div>
        ))}
      </dl>
      <p>
        {weapon.name} · Lv. {weapon.level} · R{weapon.refinement}
      </p>
      <details>
        <summary>Artifacts ({artifacts.length})</summary>
        <ul>
          {artifacts.map((artifact) => (
            <ArtifactItem key={artifact.slot} artifact={artifact} />
          ))}
        </ul>
      </details>
    </article>
  )
}

function ShowcaseResult({ showcase }: { readonly showcase: Showcase }): JSX.Element {
  return (
    <>
      <p>
        {showcase.nickname} · AR {showcase.adventure_rank}
      </p>
      {showcase.characters.length ? (
        <ul className="cards">
          {showcase.characters.map((character, position) => (
            // A showcase can hold two characters this app has no name for yet.
            <li key={`${position}-${character.name}`}>
              <CharacterCard character={character} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">
          No characters to show. In the game, open your profile, add characters to the showcase and
          turn on Show Character Details.
        </p>
      )}
    </>
  )
}

export function CharacterShowcase(): JSX.Element {
  const [state, run] = useRequest<Showcase>()

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const uid = String(new FormData(event.currentTarget).get('uid'))
    void run(() => fetchShowcase(uid))
  }

  return (
    <section aria-labelledby="showcase-title">
      <h2 id="showcase-title">Character builds</h2>
      <p className="hint">Genshin Impact · characters from your in-game showcase</p>
      <form onSubmit={submit}>
        <label>
          UID
          <input
            name="uid"
            inputMode="numeric"
            pattern={UID_PATTERN}
            title="9 or 10 digits"
            autoComplete="off"
            required
          />
        </label>
        <button type="submit" disabled={state.status === 'loading'}>
          Load characters
        </button>
      </form>
      {'message' in state && <p role="alert">{state.message}</p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">Loading…</p>}
        {'data' in state && <ShowcaseResult showcase={state.data} />}
      </div>
    </section>
  )
}
