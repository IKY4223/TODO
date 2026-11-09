#!/usr/bin/env sh
# Every check CI runs. Push only when this exits 0.
set -eu
cd "$(dirname "$0")"

(
  cd backend
  uv run ruff check .
  uv run ruff format --check .
  uv run mypy
  uv run pytest -q
)
(
  cd frontend
  npm run gen:api
  npm run lint
  npm test
  npm run build
)
echo "All checks passed."
