# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games (Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero).

> Fan project. Not affiliated with or endorsed by HoYoverse.

## Features

The app opens on Honkai: Star Rail; Genshin Impact is one tap away.

- **Star Rail builds** — enter a UID and see every character in the player's showcase: level,
  eidolon, element, path, skill levels, light cone and relics, under the player's profile card.
  Each substat shows how many times it rolled.
- **Star Rail relic advisor** — describe a 5★ relic and pick the substats you want: the app
  gives the exact chance that its remaining upgrades land on them, that a stat reaches a goal
  (SPD 10, say), and that the relic ends up better than the one a character wears. Relics in
  Builds get a score from the substats you mark as wanted. The upgrade rules are community
  estimates; a simulation in the tests checks the exact math.
- **Genshin builds** — enter a UID and see every character in the player's showcase: final
  stats, talents, weapon and artifacts. Data comes from [Enka.Network](https://enka.network).
- **Damage calculator** — for any imported character: enter a talent multiplier, pick the
  scaling stat, damage bonus, reaction and enemy, and get average, crit and non-crit damage.
  Multipliers are typed in by hand; shred, flat additions and transformative reactions are not
  modelled.
- **Wish history** — import the whole wish history straight from a phone: on Android, copy the
  text of the error page the game's history shows offline and paste it in. Shows every banner's
  pity and each 5★ with the pulls it took. Pulls are saved only on the device; the link, which
  opens the history to anyone for about a day, is used for the import and never kept. Global
  servers only.
- **Wish forecast** — chance to pull a featured 5★ character with the pulls you have, and how
  many pulls 50%, 90%, 99% and 100% take. Exact math, not a simulation. Capturing Radiance is
  not modelled, so real odds are slightly better.

Character, weapon, light cone, artifact and relic images are loaded from Enka.Network.

Planned: Honkai: Star Rail first (builds, warp history, warp forecast), then for Genshin talent
multipliers from game data, a best-artifact search and luck statistics from the imported
history. Zenless Zone Zero is undecided.

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
A weekly workflow fails when the file is behind the game.

## Checks

```sh
./check.sh
```

Runs everything CI runs:

- backend: ruff, mypy in strict mode, pytest with a coverage floor
- frontend: type generation, oxlint with accessibility rules, Vitest with a coverage floor,
  a production build
- the built app in a real browser (Playwright): every tool end to end at phone size and at
  360px wide, touch target sizes, and an automated accessibility scan

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
