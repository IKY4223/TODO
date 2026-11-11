import type { JSX, SubmitEvent } from 'react'
import { UID_PATTERN } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { Icon } from '../ui/Icon'
import {
  ELEMENTS,
  fetchStarRailShowcase,
  formatStat,
  formatValue,
  PATHS,
  type Relic,
  SKILLS,
  SLOTS,
  type StarRailCharacter,
  type StarRailShowcase as Showcase,
  STATS,
} from './starrail'

const CHARACTER_ICON_SIZE = 56
const ITEM_ICON_SIZE = 40

const count = new Intl.NumberFormat('en')

function RelicItem({ relic }: { readonly relic: Relic }): JSX.Element {
  return (
    <li className="item">
      <Icon src={relic.icon} size={ITEM_ICON_SIZE} />
      <div>
        <span>
          {SLOTS[relic.slot]} · {relic.set_name} +{relic.level}
        </span>
        <strong>{formatStat(relic.main)}</strong>
        <ul className="substats" aria-label={`${SLOTS[relic.slot]} substats`}>
          {relic.subs.map((sub) => (
            <li key={sub.key}>
              <span>{STATS[sub.key].label}</span> <span>{formatValue(sub)}</span>{' '}
              <span>×{sub.rolls}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

function CharacterCard({ character }: { readonly character: StarRailCharacter }): JSX.Element {
  const { element, path, light_cone: cone, relics } = character
  const summary = [
    `Lv. ${character.level}`,
    `E${character.eidolon}`,
    ...(element ? [ELEMENTS[element]] : []),
    ...(path ? [PATHS[path]] : []),
  ]
  return (
    <article className="card" data-element={element}>
      <header className="item">
        <Icon src={character.icon} size={CHARACTER_ICON_SIZE} />
        <div>
          <h3>{character.name}</h3>
          <span className="hint">{summary.join(' · ')}</span>
        </div>
      </header>
      {character.skills.length ? (
        <dl>
          {character.skills.map(({ kind, level, bonus }) => (
            <div key={kind}>
              <dt>{SKILLS[kind]}</dt>
              <dd>
                {level}
                {bonus ? <span className="hint"> (+{bonus})</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {cone ? (
        <p className="item">
          <Icon src={cone.icon} size={ITEM_ICON_SIZE} />
          <span>
            {cone.name} · Lv. {cone.level} · S{cone.superimposition}
          </span>
        </p>
      ) : null}
      <details>
        <summary>Relics ({relics.length})</summary>
        <p className="hint">×N: how many times the substat rolled, the first roll included.</p>
        <ul>
          {relics.map((relic) => (
            <RelicItem key={relic.slot} relic={relic} />
          ))}
        </ul>
      </details>
    </article>
  )
}

function Profile({ showcase }: { readonly showcase: Showcase }): JSX.Element {
  const { record } = showcase
  return (
    <article className="card">
      <header className="item">
        <Icon src={showcase.avatar} size={CHARACTER_ICON_SIZE} />
        <div>
          <h3>{showcase.nickname}</h3>
          <span className="hint">
            Trailblaze Lv. {showcase.trailblaze_level} · Equilibrium {showcase.equilibrium_level}
          </span>
        </div>
      </header>
      {showcase.signature ? <p className="signature">{showcase.signature}</p> : null}
      {record ? (
        <dl>
          {(
            [
              ['Achievements', record.achievements],
              ['Characters', record.characters],
              ['Light Cones', record.light_cones],
              ['Relics', record.relics],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{count.format(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}

function ShowcaseResult({ showcase }: { readonly showcase: Showcase }): JSX.Element {
  return (
    <>
      <Profile showcase={showcase} />
      {showcase.characters.length ? (
        <>
          <p className="hint">(+N): skill levels that eidolons add.</p>
          <ul className="cards">
            {showcase.characters.map((character) => (
              <li key={character.id}>
                <CharacterCard character={character} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="hint">
          No characters to show. In the game, open your profile, add characters to the Character
          Showcase and let other players see their details.
        </p>
      )}
    </>
  )
}

export function StarRailShowcase(): JSX.Element {
  const [state, run] = useRequest<Showcase>()

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const uid = String(new FormData(event.currentTarget).get('uid'))
    void run(async () => fetchStarRailShowcase(uid))
  }

  return (
    <section aria-labelledby="starrail-showcase-title">
      <h2 id="starrail-showcase-title">Character builds</h2>
      <p className="hint">Honkai: Star Rail · characters from your profile&apos;s showcase</p>
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
