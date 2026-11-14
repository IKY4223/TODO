import { type JSX, type SubmitEvent, useState } from 'react'
import { UID_PATTERN } from './api/limits'
import { type Message, useT } from './i18n'
import { useShowcase } from './starrail/store'
import { loadWarps, summarizeWarps } from './starrail/warps'
import { Icon } from './ui/Icon'
import { ToolIcon, type ToolIconName } from './ui/ToolIcon'
import { type BannerSummary, loadHistory, type SavedHistory, summarize } from './wishes/history'

// The start page is the player's own desk, not an advertisement: the profile loaded in this
// visit, the pity each saved history stands at, and the way into every tool.

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
    icon: 'gi-builds',
    name: 'Builds',
    does: 'Final stats, talents, weapon and artifacts from the showcase.',
  },
  {
    href: '#genshin/wishes',
    icon: 'gi-wishes',
    name: 'Wishes',
    does: 'The exact odds of a featured 5★ with the wishes you have.',
  },
  {
    href: '#genshin/history',
    icon: 'gi-history',
    name: 'History',
    does: 'The whole wish history, imported straight from a phone.',
  },
]

const ICON_SIZE = 40

// The API's own UID pattern, 9 or 10 digits: accepts "719781196", rejects "71978" and "abc123456".
// https://regex101.com/?flavor=javascript&regex=%5E%5Cd%7B9%2C10%7D%24&testString=719781196
const UID = new RegExp(UID_PATTERN)

const pullsOf = (saved: SavedHistory): SavedHistory['accounts'][string] =>
  saved.current ? (saved.accounts[saved.current] ?? []) : []

function ToolCards({ tools }: { readonly tools: readonly Tool[] }): JSX.Element {
  const t = useT()
  return (
    <ul className="home-tools">
      {tools.map((tool) => (
        <li key={tool.href}>
          <a href={tool.href} className="home-tool">
            <ToolIcon name={tool.icon} />
            <strong>{t(tool.name)}</strong>
            <span>{t(tool.does)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Where each banner of a saved history stands, or the way to import one. */
function Pity(props: {
  readonly title: Message
  readonly href: string
  readonly banners: readonly BannerSummary[]
}): JSX.Element {
  const { title, href, banners } = props
  const t = useT()
  return (
    <article className="card">
      <h4>
        <a href={href}>{t(title)}</a>
      </h4>
      {banners.length ? (
        <>
          <p className="hint">{t('Pulls since last 5★')}</p>
          <dl className="stats">
            {banners.map((banner) => (
              <div key={banner.banner}>
                <dt>{t(banner.label)}</dt>
                <dd>{banner.pity5}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="hint">{t('No history saved on this device yet.')}</p>
      )}
    </article>
  )
}

/** The start page: the player's profile and saved histories at a glance, and every tool. */
export function Home(): JSX.Element {
  const t = useT()
  const showcase = useShowcase()
  const [uid, setUid] = useState('')
  // Read when the page opens: App mounts it afresh on every visit, after any import.
  const [warps] = useState(() => summarizeWarps(pullsOf(loadWarps())))
  const [wishes] = useState(() => summarize(pullsOf(loadHistory())))

  const start = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (UID.test(uid)) window.location.hash = `#starrail/builds/${uid}`
  }

  return (
    <section className="home" aria-labelledby="home-title">
      <h2 id="home-title">{t('Home')}</h2>
      <p className="hint">{t('Pulls are saved only in this browser, never on a server.')}</p>
      <form onSubmit={start}>
        <label>
          UID
          <input
            name="home-uid"
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
      <div className="home-games">
        <section aria-labelledby="home-starrail">
          <h3 id="home-starrail">Honkai: Star Rail</h3>
          {showcase ? (
            <article className="card">
              <h4>
                <a href={`#starrail/builds/${showcase.uid}`}>{showcase.nickname}</a>
              </h4>
              <p className="hint">UID {showcase.uid}</p>
              <ul className="home-team">
                {showcase.characters.map((character) => (
                  <li key={character.id}>
                    <Icon src={character.icon} size={ICON_SIZE} />
                    {character.name}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
          <Pity title="Warp history" href="#starrail/history" banners={warps} />
          <ToolCards tools={STAR_RAIL} />
        </section>
        <section aria-labelledby="home-genshin">
          <h3 id="home-genshin">Genshin Impact</h3>
          <Pity title="Wish history" href="#genshin/history" banners={wishes} />
          <ToolCards tools={GENSHIN} />
        </section>
      </div>
    </section>
  )
}
