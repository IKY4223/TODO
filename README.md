# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games (Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero).

> Fan project. Not affiliated with or endorsed by HoYoverse.

## Features

- **Wish forecast** — chance to pull a featured 5★ character with the pulls you have, and how
  many pulls 50%, 90%, 99% and 100% take. Exact math, not a simulation. Genshin Impact limited
  character banner for now. Capturing Radiance is not modelled, so real odds are slightly better.

Planned: wish history import, a build optimizer (import by UID, damage calculation, best artifact
search), Honkai: Star Rail and Zenless Zone Zero banners.

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

## Checks

```sh
./check.sh
```

Runs everything CI runs: ruff, mypy and pytest for the backend; type generation, oxlint, Vitest
and a production build for the frontend.

## Docker

One image serves both the API and the built frontend on http://localhost:8000:

```sh
docker compose up --build
```
