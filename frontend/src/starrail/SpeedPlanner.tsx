import type { JSX } from 'react'
import { numberFormat, useT } from '../i18n'
import { Icon } from '../ui/Icon'
import { actionsBy, nextBreakpoint } from './speed'
import { useShowcase } from './store'

const CYCLES = [0, 1, 2]
const ICON_SIZE = 40
const speed = numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 })
const TENTHS = 10
// Rounded up: 133.3 SPD would fall short of a 133.34 breakpoint.
const roundUp = (value: number): number => Math.ceil(value * TENTHS) / TENTHS

/** Turn counts in Memory of Chaos cycles for every character of the loaded showcase. */
export function SpeedPlanner(): JSX.Element {
  const t = useT()
  const showcase = useShowcase()
  const team = (showcase?.characters ?? [])
    .map((character) => ({
      character,
      spd: character.stats.find(({ key }) => key === 'spd')?.value,
    }))
    .filter((entry): entry is typeof entry & { spd: number } => entry.spd !== undefined)
    .toSorted((first, second) => second.spd - first.spd) // the fastest acts first

  return (
    <section aria-labelledby="speed-title">
      <h2 id="speed-title">{t('Team speed')}</h2>
      <p className="hint">
        {t(
          'Honkai: Star Rail · turns in Memory of Chaos: the first cycle lasts 150 action value, each later one 100.',
        )}
      </p>
      {team.length ? (
        <ul className="cards">
          {team.map(({ character, spd }) => (
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
                <dl>
                  {CYCLES.map((cycle) => (
                    <div key={cycle}>
                      <dt>{t('Turns by cycle {cycle}', { cycle })}</dt>
                      <dd>{actionsBy(spd, cycle)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="hint">
                  {t('One more turn in cycle 0 at {speed} SPD (+{missing})', {
                    speed: speed.format(roundUp(nextBreakpoint(spd, 0))),
                    missing: speed.format(roundUp(nextBreakpoint(spd, 0) - spd)),
                  })}
                </p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">{t('Load your characters in Builds to see their turns.')}</p>
      )}
    </section>
  )
}
