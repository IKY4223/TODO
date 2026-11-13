import { type JSX, type SubmitEvent, useState } from 'react'
import { UID_PATTERN } from './api/limits'
import { type Message, numberFormat, useT } from './i18n'
import { ToolIcon, type ToolIconName } from './ui/ToolIcon'

// The start page, built to the taste skill's plan for a software product: the hero alone on the
// first screen with the product's own UI, then one section a screen, and a close that starts the
// main action. No photographs: the games' art belongs to HoYoverse, and the skill leads a
// software page with its own interface.

interface Tool {
  readonly href: string
  readonly icon: ToolIconName
  readonly name: Message
  readonly does: Message
}

const STAR_RAIL: readonly Tool[] = [
  {
    href: '#starrail/builds',
    icon: 'builds',
    name: 'Builds',
    does: 'Every showcased character: final stats, relics, light cone and skill levels.',
  },
  {
    href: '#starrail/relics',
    icon: 'relics',
    name: 'Relics',
    does: "The exact chance a relic's upgrades land on the substats you want.",
  },
  {
    href: '#starrail/warps',
    icon: 'warps',
    name: 'Warps',
    does: 'The exact odds of a featured 5★ with the warps you have.',
  },
  {
    href: '#starrail/history',
    icon: 'history',
    name: 'History',
    does: "Each banner's pity and 5★ warps, from a link or a UIGF file.",
  },
  {
    href: '#starrail/speed',
    icon: 'speed',
    name: 'Speed',
    does: 'The turn order of a team of four through Memory of Chaos cycles.',
  },
]

const GENSHIN: readonly Tool[] = [
  {
    href: '#genshin/builds',
    icon: 'builds',
    name: 'Builds',
    does: 'Final stats, talents, weapon and artifacts from the showcase.',
  },
  {
    href: '#genshin/wishes',
    icon: 'warps',
    name: 'Wishes',
    does: 'The exact odds of a featured 5★ with the wishes you have.',
  },
  {
    href: '#genshin/history',
    icon: 'history',
    name: 'History',
    does: 'The whole wish history, imported straight from a phone.',
  },
]

const PROMISES: readonly Message[] = [
  'A history link is used once for the import and never kept.',
  'Pulls are saved only in this browser, never on a server.',
  'No account and no cookies: a UID is all it asks for.',
]

// The Warps tool's own answer for a featured 5★ within 80 warps, from no pity and no guarantee;
// backend/tests/test_wishes_engine.py fails if the engine's answer moves away from it.
const FEATURED_WITHIN_80 = 0.51
const percent = numberFormat({ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })

// A still frame of the Speed tool, drawn from its own markup: the turn order the hero shows.
const TURNS = [
  { time: '50.3', who: 'Hyacine' },
  { time: '61.4', who: 'Cyrene' },
  { time: '68.4', who: 'Fu Xuan' },
  { time: '91.9', who: 'Castorice' },
] as const

function ToolCards({ tools }: { readonly tools: readonly Tool[] }): JSX.Element {
  const t = useT()
  return (
    <ul className="landing-tools">
      {tools.map((tool) => (
        <li key={tool.href}>
          <a href={tool.href} className="landing-tool">
            <ToolIcon name={tool.icon} />
            <strong>{t(tool.name)}</strong>
            <span>{t(tool.does)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

// The API's own UID pattern, 9 or 10 digits: accepts "719781196", rejects "71978" and "abc123456".
// https://regex101.com/?flavor=javascript&regex=%5E%5Cd%7B9%2C10%7D%24&testString=719781196
const UID = new RegExp(UID_PATTERN)

/** The start page: what the toolkit does, and a way into it with a UID. */
export function Landing(): JSX.Element {
  const t = useT()
  const [uid, setUid] = useState('')

  const start = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (UID.test(uid)) window.location.hash = `#starrail/builds/${uid}`
  }

  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="landing-title" data-enter>
        <div>
          <p className="landing-eyebrow">{t('Honkai: Star Rail · Genshin Impact')}</p>
          <h2 id="landing-title">{t('Build, speed and warp tools for Star Rail and Genshin')}</h2>
          <p className="landing-lede">
            {t(
              "Enter a UID and see every showcased character's final stats, relics and turn order. Warp odds are exact math, not a simulation.",
            )}
          </p>
          <div className="landing-actions">
            <a className="landing-button" href="#starrail/builds">
              {t('Open your builds')}
            </a>
            <a className="landing-button secondary" href="#starrail/speed">
              {t('Plan team speed')}
            </a>
          </div>
        </div>
        <figure className="app-frame" aria-label={t('The Speed tool')}>
          <div className="app-frame-bar">
            <ToolIcon name="speed" />
            <span>{t('Team speed')}</span>
          </div>
          <ol className="timeline">
            <li className="cycle-start">
              <strong>{t('Cycle {cycle}', { cycle: 0 })}</strong>
            </li>
            {TURNS.map(({ time, who }) => (
              <li key={time}>
                <span>
                  {time} · {who}
                </span>
              </li>
            ))}
          </ol>
          <p className="chance">
            <strong>{percent.format(FEATURED_WITHIN_80)}</strong>
            <span className="hint">{t('chance of a featured 5★ within 80 warps')}</span>
          </p>
        </figure>
      </section>

      <section className="landing-section" aria-labelledby="landing-starrail">
        <h2 id="landing-starrail">{t('Five tools for Honkai: Star Rail')}</h2>
        <ToolCards tools={STAR_RAIL} />
      </section>

      <section className="landing-section" aria-labelledby="landing-genshin">
        <h2 id="landing-genshin">{t('Three for Genshin Impact')}</h2>
        <ToolCards tools={GENSHIN} />
      </section>

      <section className="landing-section" aria-labelledby="landing-data">
        <h2 id="landing-data">{t('Your history stays on your device')}</h2>
        <ul className="landing-promises">
          {PROMISES.map((promise) => (
            <li key={promise}>{t(promise)}</li>
          ))}
        </ul>
      </section>

      <section className="landing-section landing-close" aria-labelledby="landing-start">
        <h2 id="landing-start">{t('Start with your UID')}</h2>
        <form onSubmit={start}>
          <label>
            UID
            <input
              name="landing-uid"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              inputMode="numeric"
              pattern={UID_PATTERN}
              title={t('9 or 10 digits')}
              autoComplete="off"
              required
            />
          </label>
          <button type="submit">{t('Load characters')}</button>
        </form>
      </section>
    </div>
  )
}
