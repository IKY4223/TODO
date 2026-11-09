# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games. `backend/` is FastAPI managed with uv,
`frontend/` is React + TypeScript on Vite. One Docker image serves both.

## Rules

- Write the failing test first, then the code that makes it pass.
- Run `./check.sh` from the repo root before every push. Push only when it exits 0. Never push
  with a failing, skipped or disabled check.
- Review your own diff before every push: bugs, dead code, needless complexity. Fix what you find.
- `./check.sh` regenerates `frontend/src/api/schema.d.ts` from the backend. Commit the result;
  CI fails when it is stale.
- The owner works from a phone. Never leave a step that needs a computer, and after a UI change
  start the app and report its port so it can be previewed from the session.
- The UI is mobile-first: it must work at 360px wide with 16px inputs and 44px touch targets.
- `backend/app/showcase/gamedata.json` is generated: run `uv run python scripts/sync_gamedata.py`
  in `backend/` after each game version, never edit it by hand.
- Tests never call Enka.Network. They use `backend/tests/fixtures/enka_showcase.json`.
- Work on a branch and open a pull request into `main`; the owner merges it.
- Game rates the publisher does not document are community estimates. Say so in a comment, and
  mark every mechanic left out with a `shortcut:` comment.
