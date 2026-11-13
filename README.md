# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games (Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero).

> Fan project. Not affiliated with or endorsed by HoYoverse.

## Features

The app opens on Honkai: Star Rail; Genshin Impact is one tap away.

- **Star Rail builds** — enter a UID and see every character in the player's showcase: level,
  eidolon, element, path, skill levels, light cone and relics, under the player's profile card.
  Each substat shows how many times it rolled.
- **Star Rail character pages** — each character's skills, described with the numbers of the
  level the player has, the trace tree with what is unlocked, the materials still needed to max
  skills and traces, and eidolons. Texts come from
  [StarRailRes](https://github.com/Mar-7th/StarRailRes).
- **Star Rail final stats and team speed** — each character's stats as the game's character
  screen adds them up, with switches for the effects that need a condition: relic sets whose
  bonus depends on SPD switch on by themselves. The Speed tool lays out the turn order of a team
  of four through Memory of Chaos cycles 0 to 2, with speed buffs, action advance, Ultimates on a
  chosen beat and summons taking their own turns, from a table of popular supports, light cones
  and sets with the numbers from the game's texts. Summons come when the game brings them in
  and leave when their actions run out (Netherwing, Fuyuan), Lightning-Lord speeds up with its
  hits, and Firefly's Complete Combustion ends on its countdown's turn. Sets that raise all
  allies' stats (Fleet of the Ageless, Broken Keel) count on the wearer by its own stats and on
  the others by a switch. Effects take the character's own skill levels and Eidolons; Jingliu's
  Syzygy brings Spectral Transmigration, Pearl's advance counts the team's Elation characters,
  and an enemy with the SPD you type in takes turns, slowed and delayed by Welt, Boothill and
  Dan Heng. Robin's Concerto holds her turns until its countdown acts, and Garmentmaker
  speeds up with each attack. A buff gained again refreshes unless the game lets it stack.
- **Star Rail relic advisor** — describe a 4★ or 5★ relic and pick the substats you want: the app
  gives the exact chance that its remaining upgrades land on them, that a stat reaches a goal
  (SPD 10, say), and that the relic ends up better than the one a character wears. Relics in
  Builds get a score from the substats you mark as wanted. The upgrade rules are community
  estimates; a simulation in the tests checks the exact math.
- **Layout** — a top bar that stays in reach, a menu with every tool of every game, and the
  current game's tools as tabs. Built for a phone first: 360px wide, 44px touch targets. On a
  wide screen the menu stays open beside the page in place of the tabs.
- **Light and dark themes** — the app follows the device's setting until the player picks a
  theme under Settings in the menu; the pick is kept on the device.
- **Share a Star Rail build** — every showcase and character page has its own address
  (`#starrail/builds/UID` and `#starrail/builds/UID/CHARACTER`), and a Share link button hands
  it to the phone's share sheet or copies it. Whoever opens the link sees the same page, loaded
  fresh from Enka.Network. The UID stays after "#", so the browser never sends it to the server
  as part of the page address.
- **Languages** — English and Russian, with numbers in each language's format. Star Rail
  numbers are cut off the way the game prints them, not rounded.
- **Genshin builds** — enter a UID and see every character in the player's showcase: final
  stats, talents, weapon and artifacts. Data comes from [Enka.Network](https://enka.network).
  A player's builds can be shared as a link, as in Star Rail.
- **Damage calculator** — for any imported character: enter a talent multiplier, pick the
  scaling stat, damage bonus, reaction and enemy, and get average, crit and non-crit damage.
  Multipliers are typed in by hand; shred, flat additions and transformative reactions are not
  modelled.
- **Wish history** — import the whole wish history straight from a phone: on Android, copy the
  text of the error page the game's history shows offline and paste it in. Shows every banner's
  pity and each 5★ with the pulls it took. Pulls are saved only on the device; the link, which
  opens the history to anyone for about a day, is used for the import and never kept. Global
  servers only.
- **Star Rail warp history** — import it with the link the game's warp records open, as for
  Genshin (the Android steps are the Genshin ones, not yet confirmed on Star Rail), or choose a
  UIGF (v4) or SRGF file that another warp tracker exported, read on the device and never sent
  anywhere. Shows each banner's pity and 5★ warps. Global servers only.
  Collaboration warps count their pity apart from event warps until a source says they share it.
- **Wish forecast** — chance to pull a featured 5★ character with the pulls you have, and how
  many pulls 50%, 90%, 99% and 100% take. Exact math, not a simulation. Capturing Radiance is
  not modelled, so real odds are slightly better.
- **Warp forecast** — the same exact odds for Star Rail's character and light cone event warps.
- **Telegram bot** — a Star Rail showcase and warp odds in Telegram; see below to run it.

Character, weapon, light cone, artifact and relic images are loaded from Enka.Network.

Planned, in order:

1. Star Rail effects, the rest of the table:
   - Aglaea's own SPD from Garmentmaker's stacks and Garmentmaker leaving on its countdown,
     Robin • Summeretto's Summer Songbirds and Fever, Castorice's Ardent Will, Hanya's Eidolon 1,
     and the extra turns of Firefly's Eidolon 2 and Pearl's team of four;
   - the later skill kits of Jingliu and Welt, told apart from the first ones;
   - debuffs by their base chance instead of always landing;
   - Ultimates timed by energy instead of a fixed beat. This needs each skill's energy gain,
     which neither StarRailRes nor Enka.Network's store gives: it waits for a source.
2. Telegram: a host to run the bot on, then a Telegram Mini App that opens the site inside
   Telegram (it needs the site hosted over HTTPS), and the bot's replies linking to the shared
   page of each character once the site has an address.
3. Genshin: talent multipliers from game data, a best-artifact search and luck statistics from
   the imported history.
4. Zenless Zone Zero: undecided.

Reference implementations to check game mechanics against (read, never copied):
[StarRailRes](https://github.com/Mar-7th/StarRailRes) for game data and texts, and the open source
[Fribbels HSR Optimizer](https://github.com/fribbels/hsr-optimizer) for how conditional effects and
speed are modelled. Check each project's licence before reusing anything from it.

Before any public launch, the checklist in `CLAUDE.md` comes first.

## Stack

- `backend/` — Python, FastAPI, pytest, ruff, mypy, managed with [uv](https://docs.astral.sh/uv/)
- `frontend/` — React, TypeScript, Vite, Vitest, oxlint
- API types in `frontend/src/api/schema.d.ts` are generated from the backend's OpenAPI schema

## Development

Requires Python 3.12+, uv and Node 22.

```sh
# terminal 1: API on http://localhost:8000 (docs at /docs)
cd backend
uv run uvicorn app.main:app --reload

# terminal 2: UI on http://localhost:5173, proxies /api to the backend
cd frontend
npm install
npm run dev
```

After changing an API route, model or input limit, `./check.sh` (or `npm run gen:api` in
`frontend/`) regenerates the frontend's types and limits from the backend. CI fails if the
committed files do not match.

## Game data

`backend/app/showcase/gamedata.json` (Genshin) and `backend/app/starrail/gamedata.json` (Star Rail)
map the ids Enka.Network returns to names and stats. Rebuild them after each game version:

```sh
cd backend
uv run python scripts/sync_gamedata.py
uv run python scripts/sync_starrail_data.py
```

A character released since the last rebuild still shows up, as "Unknown character".

The `Game data` workflow runs the sync every day (and on demand from the Actions tab). When the
sources changed, it runs every check and opens a `Game data update` pull request, which says
whether the checks passed: merge a green one; a red one means the data format changed and the
code needs a fix first. A new character's effects on the turn order still need adding to
`frontend/src/starrail/effects.ts` by hand; until then the Speed tool says none are known, and a
test fails if the tables name an id the data no longer has.

## Telegram bot

`backend/app/telegram/` answers in Telegram by long polling, so it needs no public address: send
it a Star Rail UID for the showcase's characters, `/warp PULLS [PITY] [g]` for the odds of the
featured 5★ character, `/lang ru` or `/lang en` for the language. It uses the same code and the
same cache of Enka.Network answers as the site, and limits each chat to 10 messages a minute.

Create a bot with [@BotFather](https://t.me/BotFather), then run it where it can stay on:

```sh
export TELEGRAM_BOT_TOKEN=...   # the token is a secret: never commit it or paste it in a chat
cd backend && uv run python -m app.telegram
# or from the Docker image, passing the variable through from the environment
docker run -e TELEGRAM_BOT_TOKEN hoyo-toolkit python -m app.telegram
```

It logs neither messages nor chat ids, and its errors never carry the token. Failures are
explained in the chat's language.

Set `TELEGRAM_STATE_FILE` to a file the bot may write, and it keeps its place in the message
stream and the languages chats chose with `/lang` across restarts; without it, a restart answers
the last batch of messages again and forgets those choices. The file holds the ids of the chats
that used `/lang`, and nothing else about anyone. In Docker, keep it on a volume:

```sh
docker run -e TELEGRAM_BOT_TOKEN -e TELEGRAM_STATE_FILE=/data/bot.json -v hoyo-bot:/data \
  hoyo-toolkit python -m app.telegram
```

## Checks

```sh
./check.sh
```

Runs everything CI runs:

- backend: ruff, mypy in strict mode, pytest with a coverage floor
- frontend: type generation, oxlint with accessibility rules, Vitest with a coverage floor,
  a production build
- the built app in a real browser (Playwright): every tool end to end at phone size and at
  360px wide, touch target sizes, and an automated accessibility scan. The browser renders with
  DejaVu Sans on every machine (`frontend/e2e/fonts.conf`), a wide font, so text that fits in
  the tests fits on phones

CI also checks every dependency against the known vulnerability databases (`pip-audit`,
`npm audit`) and runs GitHub's CodeQL code scanning on every push and weekly.

The browser tests need Chromium once: `npx playwright install chromium` in `frontend/`. They run
against the real backend with Enka.Network replaced by a recorded response.

## Request limits

Each client gets 10 showcase requests, 150 wish history pages and 60 forecast or damage requests
a minute; past that the API answers
429 with a `Retry-After` header. Clients are told apart by address, so behind a reverse proxy set
`FORWARDED_ALLOW_IPS` to the proxy's address, or every visitor will share one allowance.

## Security

Every response carries a Content-Security-Policy that allows scripts, styles and requests only
from the app itself, and images also from Enka.Network. Enka's answers are size-limited and
validated before use; a request that fails upstream is logged.

## Docker

One image serves both the API and the built frontend on http://localhost:8000:

```sh
docker compose up --build
```

The image listens on the port in `PORT` (8000 without it), as hosts such as SnapDeploy expect.

## A private test deploy

Until the launch checklist in `CLAUDE.md` is done, the site is for its owner only. Every page
tells search engines not to list it, and setting `SITE_PASSWORD` on the host makes every page
ask for that password (any user name); only `/api/health` stays open for the host's checks.

On [SnapDeploy](https://snapdeploy.dev), from its phone app or the site: Deploy from GitHub,
pick this repository and `main`, and it builds the `Dockerfile` as it is. Add the environment
variable `SITE_PASSWORD` with a password of your own before the first deploy. The free tier
sleeps after 15 idle minutes and wakes in about a minute on the next visit.

The Telegram bot does not run there: a sleeping container cannot poll, and SnapDeploy's
acceptable use policy names Telegram bot frameworks among what it refuses. It needs another host.

## Licence

MIT: see `LICENSE`. Game data, names and images belong to HoYoverse.
