import type { JSX, SubmitEvent } from 'react'
import { UID_PATTERN } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { useLocalized, useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { DamageCalculator } from '../damage/DamageCalculator'
import {
  type Artifact,
  type Character,
  ELEMENTS,
  fetchShowcase,
  formatStat,
  formatValue,
  type Showcase,
  SLOTS,
  STATS,
} from './showcase'

const CHARACTER_ICON_SIZE = 56
const ITEM_ICON_SIZE = 40

function ArtifactItem({ artifact }: { readonly artifact: Artifact }): JSX.Element {
  const t = useT()
  return (
    <li className="item">
      <Icon src={artifact.icon} size={ITEM_ICON_SIZE} />
      <div>
        <span>
          {t(SLOTS[artifact.slot])} · {artifact.set_name} +{artifact.level}
        </span>
        <strong>{formatStat(artifact.main, t)}</strong>
        <ul className="substats" aria-label={t('{slot} substats', { slot: t(SLOTS[artifact.slot]) })}>
          {artifact.subs.map((sub) => (
            <li key={sub.key}>
              <span>{t(STATS[sub.key].label)}</span> <span>{formatValue(sub)}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

function CharacterCard({ character }: { readonly character: Character }): JSX.Element {
  const { element, talents, weapon, artifacts } = character
  const t = useT()
  const summary = [
    t('Lv. {level}', { level: character.level }),
    `C${character.constellation}`,
    ...(element ? [t(ELEMENTS[element])] : []),
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
      {talents.length ? <p>{t('Talents {levels}', { levels: talents.join(' / ') })}</p> : null}
      <dl>
        {character.stats.map((stat) => (
          <div key={stat.key}>
            <dt>{t(STATS[stat.key].label)}</dt>
            <dd>{formatValue(stat)}</dd>
          </div>
        ))}
      </dl>
      <p className="item">
        <Icon src={weapon.icon} size={ITEM_ICON_SIZE} />
        <span>
          {weapon.name} · {t('Lv. {level}', { level: weapon.level })} · R{weapon.refinement}
        </span>
      </p>
      <details>
        <summary>{t('Artifacts ({count})', { count: artifacts.length })}</summary>
        <ul>
          {artifacts.map((artifact) => (
            <ArtifactItem key={artifact.slot} artifact={artifact} />
          ))}
        </ul>
      </details>
      <DamageCalculator character={character} />
    </article>
  )
}

function ShowcaseResult({ showcase }: { readonly showcase: Showcase }): JSX.Element {
  const t = useT()
  return (
    <>
      <p>
        {showcase.nickname} · {t('AR {rank}', { rank: showcase.adventure_rank })}
      </p>
      {showcase.characters.length ? (
        <ul className="cards">
          {showcase.characters.map((character) => (
            <li key={character.id}>
              <CharacterCard character={character} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">
          {t(
            'No characters to show. In the game, open your profile, add characters to the showcase and turn on Show Character Details.',
          )}
        </p>
      )}
    </>
  )
}

export function CharacterShowcase(): JSX.Element {
  const [state, run] = useRequest<Showcase>()
  const t = useT()
  const localized = useLocalized()

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const uid = String(new FormData(event.currentTarget).get('uid'))
    void run(() => fetchShowcase(uid))
  }

  return (
    <section aria-labelledby="showcase-title">
      <h2 id="showcase-title">{t('Character builds')}</h2>
      <p className="hint">{t('Genshin Impact · characters from your in-game showcase')}</p>
      <form onSubmit={submit}>
        <label>
          UID
          <input
            name="uid"
            inputMode="numeric"
            pattern={UID_PATTERN}
            title={t('9 or 10 digits')}
            autoComplete="off"
            required
          />
        </label>
        <button type="submit" disabled={state.status === 'loading'}>
          {t('Load characters')}
        </button>
      </form>
      {'message' in state && <p role="alert">{localized(state.message)}</p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">{t('Loading…')}</p>}
        {'data' in state && <ShowcaseResult showcase={state.data} />}
      </div>
    </section>
  )
}
