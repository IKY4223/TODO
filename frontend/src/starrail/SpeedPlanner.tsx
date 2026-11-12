import { type JSX, useState } from 'react'
import { numberFormat, useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { SUMMONS, TURN_EFFECTS, baseOf, statOf, valueFor } from './effects'
import { sourceName, turnEffectText } from './effectText'
import { nextBreakpoint } from './speed'
import type { StarRailCharacter } from './starrail'
import { useShowcase } from './store'
import { simulate, type Unit, type UnitEffect } from './turns'

const TEAM_SIZE = 4
// The end of Memory of Chaos cycles 0, 1 and 2, in action value.
const CYCLE_ENDS = [150, 250, 350]
const LAST = CYCLE_ENDS.at(-1) ?? 0
const ULTIMATE_CHOICES = [0, 1, 2, 3, 4]
const DEFAULT_ULTIMATE_EVERY = 3
const ICON_SIZE = 40
const SUMMON = ':summon'
const TENTHS = 10
const speed = numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 })
// Rounded up: 133.3 SPD would fall short of a 133.34 breakpoint.
const roundUp = (value: number): number => Math.ceil(value * TENTHS) / TENTHS

interface Settings {
  readonly ultimateEvery: number
  readonly chosen: number | undefined
  readonly off: ReadonlySet<string> // effects the player switched off
  readonly on: ReadonlySet<string> // effects the player switched on
}

const effectsOf = (
  character: StarRailCharacter,
): { effect: (typeof TURN_EFFECTS)[number]; value: number }[] =>
  TURN_EFFECTS.flatMap((effect) => {
    const value = valueFor(effect.source, effect.values, character)
    return value === undefined ? [] : [{ effect, value }]
  })

const toUnit = ({ effect, value }: ReturnType<typeof effectsOf>[number]): UnitEffect => ({
  kind: effect.kind,
  trigger: effect.trigger,
  target: effect.target,
  turns: effect.turns,
  withSummons: effect.withSummons,
  value,
})

const isOn = (settings: Settings, id: string, off = false): boolean =>
  off ? settings.on.has(id) : !settings.off.has(id)

function unitsOf(team: readonly StarRailCharacter[], settings: (id: number) => Settings): Unit[] {
  return team.flatMap((character) => {
    const own = settings(character.id)
    const spd = statOf(character, 'spd')
    const active = effectsOf(character).filter(
      ({ effect }) => isOn(own, effect.id, effect.off) && spd >= (effect.minSpd ?? 0),
    )
    const unit: Unit = {
      key: String(character.id),
      spd,
      baseSpd: baseOf(character, 'spd'),
      ultimateEvery: own.ultimateEvery,
      chosen: own.chosen === undefined ? undefined : String(own.chosen),
      effects: active.filter(({ effect }) => effect.trigger !== 'summon').map(toUnit),
    }
    const summons = SUMMONS.filter(({ owner }) => owner === character.id).map((summon): Unit => {
      const summonSpd = summon.ofOwner ? summon.spd * spd : summon.spd
      return {
        key: unit.key + SUMMON,
        spd: summonSpd,
        baseSpd: summonSpd,
        owner: unit.key,
        ultimateEvery: 0,
        effects: active.filter(({ effect }) => effect.trigger === 'summon').map(toUnit),
      }
    })
    return [unit, ...summons]
  })
}

/** The turn order of a team from the loaded showcase, with speed buffs, action advance and summons. */
export function SpeedPlanner(): JSX.Element {
  const t = useT()
  const showcase = useShowcase()
  const characters = (showcase?.characters ?? []).filter((character) => character.stats.length)
  const [picked, setPicked] = useState<number[]>()
  const [changes, setChanges] = useState<Readonly<Record<number, Settings>>>({})
  const teamIds = picked ?? characters.slice(0, TEAM_SIZE).map(({ id }) => id)
  const team = characters.filter(({ id }) => teamIds.includes(id))

  const settingsOf = (id: number): Settings =>
    changes[id] ?? {
      ultimateEvery: DEFAULT_ULTIMATE_EVERY,
      chosen: team.find((other) => other.id !== id)?.id,
      off: new Set(),
      on: new Set(),
    }
  const change = (id: number, update: Partial<Settings>): void => {
    setChanges({ ...changes, [id]: { ...settingsOf(id), ...update } })
  }
  const toggle = (id: number, effect: string, off = false): void => {
    const own = settingsOf(id)
    const flip = (set: ReadonlySet<string>): Set<string> =>
      set.has(effect)
        ? new Set([...set].filter((item) => item !== effect))
        : new Set([...set, effect])
    change(id, off ? { on: flip(own.on) } : { off: flip(own.off) })
  }

  const actions = simulate(unitsOf(team, settingsOf), LAST)
  const nameOf = (key: string): string => {
    const character = team.find(({ id }) => String(id) === key.replace(SUMMON, ''))
    if (!character) return key
    if (!key.endsWith(SUMMON)) return character.name
    const kind = SUMMONS.find(({ owner }) => owner === character.id)?.kind
    return kind === 'memosprite'
      ? t('Memosprite of {name}', { name: character.name })
      : t('Summon of {name}', { name: character.name })
  }

  return (
    <section aria-labelledby="speed-title">
      <h2 id="speed-title">{t('Team speed')}</h2>
      <p className="hint">
        {t(
          'Honkai: Star Rail · turns in Memory of Chaos: the first cycle lasts 150 action value, each later one 100.',
        )}
      </p>
      {characters.length ? (
        <>
          {characters.length > TEAM_SIZE ? (
            <fieldset>
              <legend>{t('Team')}</legend>
              {characters.map(({ id, name }) => (
                <label key={id} className="check">
                  <input
                    type="checkbox"
                    checked={teamIds.includes(id)}
                    disabled={!teamIds.includes(id) && teamIds.length >= TEAM_SIZE}
                    onChange={() =>
                      setPicked(
                        teamIds.includes(id)
                          ? teamIds.filter((other) => other !== id)
                          : [...teamIds, id],
                      )
                    }
                  />
                  {name}
                </label>
              ))}
            </fieldset>
          ) : null}
          <p className="hint">
            {t(
              'Effect values: skills at level 10, light cones at their superimposition. Skills are taken as used every turn.',
            )}
          </p>
          <ul className="cards">
            {team.map((character) => {
              const own = settingsOf(character.id)
              const known = effectsOf(character)
              const spd = statOf(character, 'spd')
              const key = String(character.id)
              return (
                <li key={character.id}>
                  <article className="card" data-element={character.element}>
                    <header className="item">
                      <Icon src={character.icon} size={ICON_SIZE} />
                      <div>
                        <h3>{character.name}</h3>
                        <span className="hint">
                          {t('SPD')} {speed.format(spd)}
                        </span>
                      </div>
                    </header>
                    <dl className="stats">
                      {CYCLE_ENDS.map((end, cycle) => (
                        <div key={end}>
                          <dt>{t('Turns by cycle {cycle}', { cycle })}</dt>
                          <dd>
                            {actions.filter(({ unit, time }) => unit === key && time <= end).length}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="hint">
                      {t('Without effects: one more turn in cycle 0 at {speed} SPD (+{missing})', {
                        speed: speed.format(roundUp(nextBreakpoint(spd, 0))),
                        missing: speed.format(roundUp(nextBreakpoint(spd, 0) - spd)),
                      })}
                    </p>
                    <label>
                      {t('Ultimate every N turns')}
                      <select
                        value={own.ultimateEvery}
                        onChange={(event) =>
                          change(character.id, { ultimateEvery: Number(event.target.value) })
                        }
                      >
                        {ULTIMATE_CHOICES.map((turns) => (
                          <option key={turns} value={turns}>
                            {turns ? turns : t('Never')}
                          </option>
                        ))}
                      </select>
                    </label>
                    {known.some(({ effect }) => effect.target === 'chosen') ? (
                      <label>
                        {t('Chosen ally')}
                        <select
                          value={own.chosen ?? ''}
                          onChange={(event) =>
                            change(character.id, { chosen: Number(event.target.value) })
                          }
                        >
                          {team
                            .filter(({ id }) => id !== character.id)
                            .map(({ id, name }) => (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : null}
                    {known.length ? (
                      <fieldset className="effects">
                        <legend>{t('Effects in battle')}</legend>
                        {known.map(({ effect, value }) => (
                          <label key={effect.id} className="check">
                            <input
                              type="checkbox"
                              checked={
                                isOn(own, effect.id, effect.off) && spd >= (effect.minSpd ?? 0)
                              }
                              disabled={spd < (effect.minSpd ?? 0)}
                              onChange={() => toggle(character.id, effect.id, effect.off)}
                            />
                            <span>
                              <strong>{sourceName(effect.source, character)}</strong>
                              <br />
                              {turnEffectText(effect, value, t)}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                  </article>
                </li>
              )
            })}
          </ul>
          <h3>{t('Turn order')}</h3>
          <ol className="timeline">
            {actions.map(({ time, unit, ultimate }, index) => {
              const cycle = CYCLE_ENDS.findIndex((end) => time <= end)
              const starts =
                index === 0 ||
                cycle !== CYCLE_ENDS.findIndex((end) => (actions[index - 1]?.time ?? 0) <= end)
              return (
                <li key={`${unit}@${time}`} className={starts ? 'cycle-start' : undefined}>
                  {starts ? <strong>{t('Cycle {cycle}', { cycle })}</strong> : null}
                  <span>
                    {speed.format(time)} · {nameOf(unit)}
                    {ultimate ? ` · ${t('Ultimate')}` : ''}
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <p className="hint">{t('Load your characters in Builds to see their turns.')}</p>
      )}
    </section>
  )
}
