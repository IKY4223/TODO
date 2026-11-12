import { type JSX, useEffect, useRef } from 'react'
import { useRequest } from '../api/useRequest'
import { useLanguage, useLocalized, useT } from '../i18n'
import { Icon } from '../ui/Icon'
import {
  type CharacterTexts,
  describe,
  fetchCharacterTexts,
  remainingCosts,
  type SkillText,
} from './guide'
import type { StarRailCharacter } from './starrail'

const ICON_SIZE = 56
const count = new Intl.NumberFormat('en')

function SkillItem(props: {
  readonly skill: SkillText
  readonly character: StarRailCharacter
}): JSX.Element {
  const { skill, character } = props
  const t = useT()
  // Skills of one kind, such as a basic attack and its enhanced form, share one level.
  const level = character.skills.find(({ kind }) => kind === skill.kind)?.level
  const numbers = skill.params[Math.min(level ?? 1, skill.params.length) - 1] ?? []
  return (
    <li>
      <h4>{skill.name}</h4>
      <span className="hint">
        {skill.label}
        {level === undefined ? null : ` · ${t('Lv. {level}', { level })}`}
      </span>
      <p>{describe(skill.description, numbers)}</p>
    </li>
  )
}

function Texts(props: {
  readonly texts: CharacterTexts
  readonly character: StarRailCharacter
}): JSX.Element {
  const { texts, character } = props
  const t = useT()
  const unlocked = new Set(character.points.map(({ id }) => id))
  const costs = [...remainingCosts(texts.traces, character.points)]
  return (
    <>
      <h3>{t('Skills')}</h3>
      <ul className="texts">
        {texts.skills.map((skill) => (
          <SkillItem key={skill.name} skill={skill} character={character} />
        ))}
      </ul>
      <h3>{t('Traces')}</h3>
      <ul className="texts">
        {texts.traces
          .filter((trace) => !trace.skill)
          .map((trace) => (
            <li key={trace.id}>
              <h4>{trace.name}</h4>
              <span className="hint">
                {unlocked.has(trace.id) ? t('Unlocked') : t('Not unlocked')}
              </span>
              <p>{describe(trace.description, trace.params)}</p>
            </li>
          ))}
      </ul>
      <h3>{t('Materials to max skills and traces')}</h3>
      {costs.length ? (
        <dl className="materials">
          {costs.map(([item, amount]) => (
            <div key={item}>
              <dt>{texts.items[item] ?? item}</dt>
              <dd>{count.format(amount)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="hint">{t('Everything is at its highest level.')}</p>
      )}
      <h3>{t('Eidolons')}</h3>
      <ul className="texts">
        {texts.eidolons.map((eidolon, index) => (
          <li key={eidolon.name}>
            <h4>
              E{index + 1} · {eidolon.name}
            </h4>
            <span className="hint">
              {index < character.eidolon ? t('Unlocked') : t('Not unlocked')}
            </span>
            <p>{eidolon.description}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

/** One character's skills and eidolons, described at the levels the player has. */
export function CharacterPage(props: {
  readonly character: StarRailCharacter
  /** Where the list of characters lives. */
  readonly back: string
}): JSX.Element {
  const { character, back } = props
  const [state, run] = useRequest<CharacterTexts>()
  const t = useT()
  const localized = useLocalized()
  const language = useLanguage()
  const top = useRef<HTMLElement>(null)

  // The page opens below the UID form: bring its start into view.
  useEffect(() => {
    top.current?.scrollIntoView?.()
  }, [])

  useEffect(() => {
    void run(async () => fetchCharacterTexts(character.id, language))
    // `run` is a new function on every render; the texts depend only on who and which language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, language])

  return (
    <article ref={top} className="card" data-element={character.element}>
      <a className="more" href={back}>
        {t('← All characters')}
      </a>
      <header className="item">
        <Icon src={character.icon} size={ICON_SIZE} />
        <div>
          <h2>{localized(character.name)}</h2>
          <span className="hint">
            {t('Lv. {level}', { level: character.level })} · E{character.eidolon}
          </span>
        </div>
      </header>
      {'message' in state && <p role="alert">{localized(state.message)}</p>}
      <div aria-live="polite">
        {state.status === 'loading' && <p className="hint">{t('Loading…')}</p>}
        {'data' in state && <Texts texts={state.data} character={character} />}
      </div>
    </article>
  )
}
