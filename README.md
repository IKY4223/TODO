# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games (Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero).

> Fan project. Not affiliated with or endorsed by HoYoverse.

## Features

- **Character builds** — enter a UID and see every character in the player's showcase: final
  stats, talents, weapon and artifacts. Data comes from [Enka.Network](https://enka.network).
- **Wish forecast** — chance to pull a featured 5★ character with the pulls you have, and how
  many pulls 50%, 90%, 99% and 100% take. Exact math, not a simulation. Capturing Radiance is
  not modelled, so real odds are slightly better.

Both cover Genshin Impact for now.

Planned: damage calculation and a best-artifact search on top of the imported builds, wish
history import with luck statistics, then Honkai: Star Rail and Zenless Zone Zero.

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

After changing an API route or model, `./check.sh` (or `npm run gen:api` in `frontend/`)
regenerates the frontend types. CI fails if the committed types do not match the backend.

## Game data

`backend/app/showcase/gamedata.json` maps the ids Enka.Network returns to names. Rebuild it after
each game version:

```sh
cd backend
uv run python scripts/sync_gamedata.py
```

A character released since the last rebuild still shows up, as "Unknown character".

## Checks

```sh
./check.sh
```

Runs everything CI runs: ruff, mypy and pytest for the backend; type generation, oxlint, Vitest
and a production build for the frontend.

## Request limits

Each client gets 10 showcase requests and 60 forecast requests a minute; past that the API answers
429 with a `Retry-After` header. Clients are told apart by address, so behind a reverse proxy set
`FORWARDED_ALLOW_IPS` to the proxy's address, or every visitor will share one allowance.

## Docker

One image serves both the API and the built frontend on http://localhost:8000:

```sh
docker compose up --build
```
