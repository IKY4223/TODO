import { type JSX, type SubmitEvent, useEffect, useRef, useState } from 'react'
import { linked, useAddress } from '../address'
import { RELIC_SUBSTATS, UID_PATTERN } from '../api/limits'
import { useRequest } from '../api/useRequest'
import { useLanguage, useLocalized, useT, numberFormat } from '../i18n'
import { Icon } from '../ui/Icon'
import { ShareButton } from '../ui/ShareButton'
import { CharacterPage } from './CharacterPage'
import { type StatEffect, statEffectsOf, tierFor, withEffects } from './effects'
import { sourceName, statEffectText } from './effectText'
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
  statName,
  STATS,
} from './starrail'
import { loadWanted, publishShowcase, relicScore, saveWanted, type SubstatKey } from './store'

// A player's showcase lives at #starrail/builds/700000001 and a character's own page one step
// below it, #starrail/builds/700000001/1409, so either can be shared as a link.
const LIST = '#starrail/builds'
const listOf = (uid: string): string => `${LIST}/${uid}`

const CHARACTER_ICON_SIZE = 56
const ITEM_ICON_SIZE = 40

const count = numberFormat()
const score = numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 })

function RelicItem(props: {
  readonly relic: Relic
  readonly wanted: readonly SubstatKey[]
}): JSX.Element {
  const { relic, wanted } = props
  const t = useT()
  const localized = useLocalized()
  const isWanted = (key: string): boolean => wanted.some((stat) => stat === key)
  return (
    <li className="item">
      <Icon src={relic.icon} size={ITEM_ICON_SIZE} />
      <div>
        <span>
          {t(SLOTS[relic.slot])} · {localized(relic.set_name)} +{relic.level}
        </span>
        <strong>{formatStat(relic.main, t)}</strong>
        <span className="hint">
          {t('Score {score}', { score: score.format(relicScore(relic, wanted)) })}
        </span>
        <ul className="substats" aria-label={t('{slot} substats', { slot: t(SLOTS[relic.slot]) })}>
          {relic.subs.map((sub) => (
            <li key={sub.key} className={isWanted(sub.key) ? 'wanted' : undefined}>
              <span>{t(STATS[sub.key].label)}</span> <span>{formatValue(sub)}</span>{' '}
              <span>×{sub.rolls}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

function CharacterCard(props: {
  readonly character: StarRailCharacter
  readonly uid: string
}): JSX.Element {
  const { character, uid } = props
  const { element, path, light_cone: cone, relics } = character
  const t = useT()
  const localized = useLocalized()
  const [wanted, setWanted] = useState(() => loadWanted(character.id))
  const effects = statEffectsOf(character)
  // Effects that depend on SPD start on when the SPD meets them; the rest wait for the player.
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        effects
          .filter(({ bonuses }) => bonuses.some((bonus) => tierFor(bonus, character) !== undefined))
          .map(({ id }) => id),
      ),
  )
  const flip = (effect: StatEffect): void => {
    const next = new Set(enabled)
    if (!next.delete(effect.id)) next.add(effect.id)
    setEnabled(next)
  }
  const stats = withEffects(
    character,
    effects.filter(({ id }) => enabled.has(id)),
  )
  const total = relics.reduce((sum, relic) => sum + relicScore(relic, wanted), 0)

  const toggle = (key: SubstatKey): void => {
    const next = wanted.includes(key) ? wanted.filter((stat) => stat !== key) : [...wanted, key]
    setWanted(next)
    saveWanted(character.id, next)
  }
  const summary = [
    t('Lv. {level}', { level: character.level }),
    `E${character.eidolon}`,
    ...(element ? [t(ELEMENTS[element])] : []),
    ...(path ? [t(PATHS[path])] : []),
  ]
  return (
    <article className="card" data-element={element}>
      <header className="item">
        <Icon src={character.icon} size={CHARACTER_ICON_SIZE} />
        <div>
          <h3>{localized(character.name)}</h3>
          <span className="hint">{summary.join(' · ')}</span>
        </div>
      </header>
      {character.stats.length ? (
        <dl className="stats">
          {stats.map((stat) => (
            <div key={stat.key}>
              <dt>{t(STATS[stat.key].label)}</dt>
              <dd>{formatValue(stat)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {character.stats.length && effects.length ? (
        <fieldset className="effects">
          <legend>{t('Effects in battle')}</legend>
          <p className="hint">
            {t(
              'Stats with the effects switched on. Effects that depend on SPD switch on by themselves.',
            )}
          </p>
          {effects.map((effect) => (
            <label key={effect.id} className="check">
              <input
                type="checkbox"
                checked={enabled.has(effect.id)}
                onChange={() => flip(effect)}
              />
              <span>
                <strong>{sourceName(effect.source, character, t)}</strong>
                <br />
                {statEffectText(effect, character, t)}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {character.skills.length ? (
        <dl>
          {character.skills.map(({ kind, level, bonus }) => (
            <div key={kind}>
              <dt>{t(SKILLS[kind])}</dt>
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
            {localized(cone.name)} · {t('Lv. {level}', { level: cone.level })} · S
            {cone.superimposition}
          </span>
        </p>
      ) : null}
      <a className="more" href={`${listOf(uid)}/${character.id}`}>
        {t('Skills and eidolons')}
      </a>
      <details>
        <summary>
          {t('Relics ({count}) · score {score}', {
            count: relics.length,
            score: score.format(total),
          })}
        </summary>
        <p className="hint">
          {t(
            '×N: how many times the substat rolled, the first roll included. Score: the wanted substats in perfect rolls, so 2.0 is worth two highest rolls.',
          )}
        </p>
        <fieldset>
          <legend>{t('Substats that matter')}</legend>
          {RELIC_SUBSTATS.map((key) => (
            <label key={key} className="check">
              <input type="checkbox" checked={wanted.includes(key)} onChange={() => toggle(key)} />
              {statName(key, t)}
            </label>
          ))}
        </fieldset>
        <ul>
          {relics.map((relic) => (
            <RelicItem key={relic.slot} relic={relic} wanted={wanted} />
          ))}
        </ul>
      </details>
    </article>
  )
}

function Profile({ showcase }: { readonly showcase: Showcase }): JSX.Element {
  const { record } = showcase
  const t = useT()
  return (
    <article className="card">
      <header className="item">
        <Icon src={showcase.avatar} size={CHARACTER_ICON_SIZE} />
        <div>
          <h3>{showcase.nickname}</h3>
          <span className="hint">
            {t('Trailblaze Lv. {level} · Equilibrium {equilibrium}', {
              level: showcase.trailblaze_level,
              equilibrium: showcase.equilibrium_level,
            })}
          </span>
        </div>
      </header>
      {showcase.signature ? <p className="signature">{showcase.signature}</p> : null}
      <ShareButton address={listOf(showcase.uid)} title={showcase.nickname} />
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
              <dt>{t(label)}</dt>
              <dd>{count.format(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}

function ShowcaseResult({ showcase }: { readonly showcase: Showcase }): JSX.Element {
  const t = useT()
  const { uid, character: chosen } = linked(useAddress(), LIST)
  const selected =
    uid === showcase.uid ? showcase.characters.find(({ id }) => String(id) === chosen) : undefined
  if (selected) return <CharacterPage character={selected} back={listOf(showcase.uid)} />
  return (
    <>
      <Profile showcase={showcase} />
      {showcase.characters.length ? (
        <>
          <p className="hint">{t('(+N): skill levels that eidolons add.')}</p>
          <ul className="cards">
            {showcase.characters.map((character) => (
              <li key={character.id}>
                <CharacterCard character={character} uid={showcase.uid} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="hint">
          {t(
            'No characters to show. In the game, open your profile, add characters to the Character Showcase and let other players see their details.',
          )}
        </p>
      )}
    </>
  )
}

export function StarRailShowcase(): JSX.Element {
  const [state, run] = useRequest<Showcase>()
  const t = useT()
  const localized = useLocalized()
  const language = useLanguage()
  const target = linked(useAddress(), LIST).uid
  const [uid, setUid] = useState(target ?? '')
  const asked = useRef<string | undefined>(undefined) // the UID last asked for

  const load = (wanted: string): void => {
    asked.current = wanted
    setUid(wanted)
    void run(async () => {
      const showcase = await fetchStarRailShowcase(wanted, language)
      publishShowcase(showcase)
      return showcase
    })
  }

  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    // On a page whose address names a player, the address follows to the new one and the
    // effect below loads them, so the address never names someone not on screen.
    if (target && target !== uid) window.location.hash = listOf(uid)
    else load(uid)
  }

  // A shared link, or the back button, names a player: load them unless they are already here.
  useEffect(() => {
    if (target && target !== asked.current) load(target)
    // Only a new address asks; `load` is a new function on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // Game names come in one language: a loaded showcase is asked for again in the new one.
  // The server answers from its cache, without another request to Enka.
  const loaded = 'data' in state ? state.data.uid : undefined
  useEffect(() => {
    if (loaded) load(loaded)
    // Only a language change asks again; `load` is a new function on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  return (
    <section aria-labelledby="starrail-showcase-title">
      <h2 id="starrail-showcase-title">{t('Character builds')}</h2>
      <p className="hint">{t("Honkai: Star Rail · characters from your profile's showcase")}</p>
      <form onSubmit={submit}>
        <label>
          UID
          <input
            name="uid"
            value={uid}
            onChange={(event) => setUid(event.target.value)}
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
