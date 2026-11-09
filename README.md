# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games (Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero).

> Fan project. Not affiliated with or endorsed by HoYoverse.

This is the project skeleton: a FastAPI backend, a React + TypeScript frontend, one Docker image
and CI. The two features come next:

- **Build optimizer** — import characters by UID, compute damage, search for the best artifact set.
- **Wish tracker** — pity and 50/50 tracking, Monte Carlo forecast for upcoming banners.

## Stack

- `backend/` — Python, FastAPI, pytest, ruff, managed with [uv](https://docs.astral.sh/uv/)
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

After changing an API route or model, regenerate the frontend types:

```sh
cd frontend
npm run gen:api
```

CI fails if the committed types do not match the backend.

## Checks

```sh
cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest
cd frontend && npm run lint && npm test && npm run build
```

## Docker

One image serves both the API and the built frontend on http://localhost:8000:

```sh
docker compose up --build
```
