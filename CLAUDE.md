# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games. `backend/` is FastAPI managed with uv,
`frontend/` is React + TypeScript on Vite. One Docker image serves both.

## Rules

- Write the failing test first, then the code that makes it pass.
- Run `./check.sh` from the repo root before every push. Push only when it exits 0. Never push
  with a failing, skipped or disabled check.
- Review your own diff before every push: bugs, dead code, needless complexity. Fix what you find.
- `./check.sh` regenerates `frontend/src/api/schema.d.ts` and `frontend/src/api/limits.ts` from
  the backend. Commit the result; CI fails when it is stale. Never restate an API limit in the
  frontend: import it from `limits.ts`.
- A user-facing feature is not done until `frontend/e2e/app.spec.ts` drives it in the browser.
  If Playwright's browser is missing, run with `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`.
- Never lower a coverage floor or switch off a lint rule to get a change through.
- The owner works from a phone and cannot open the preview. Never leave a step that needs a
  computer. After a UI change, start the app, report its port, and send phone-sized screenshots.
- The UI is mobile-first: it must work at 360px wide with 16px inputs and 44px touch targets.
- `backend/app/showcase/gamedata.json` and `backend/app/starrail/gamedata.json` are generated: run
  `scripts/sync_gamedata.py` and `scripts/sync_starrail_data.py` in `backend/` after each game
  version, never edit them by hand.
- Tests never call Enka.Network or HoYoverse. They use the fixtures in `backend/tests/fixtures/`
  and `backend/tests/gacha_fixture.py`. Fixtures from real accounts are anonymized.
- A wish history link is a secret: never log it, store it or put it in a URL the app requests.
- Work on a branch and open a pull request into `main`; the owner merges it.
- Game rates the publisher does not document are community estimates. Say so in a comment, and
  mark every mechanic left out with a `shortcut:` comment.

## Direction

paimon.moe already covers Genshin Impact well. Put new effort into Honkai: Star Rail first, then
finish Genshin, then think about Zenless Zone Zero. Do not copy what paimon.moe does; build what
it lacks, such as importing history from a phone.

## Before going public

The app is private until these are done. Do not deploy it publicly or share the link without them,
and remind the owner when a change moves toward a public launch. None of this is legal advice:
have a lawyer read the texts before launch.

- Licence: choose one for the code (the owner decides) and list the licences of dependencies.
- Disclaimer: "Fan project, not affiliated with HoYoverse" stays visible. Read HoYoverse's current
  fan content policy; no ads, payments or donations until it is confirmed allowed. Game images
  come from Enka.Network and belong to HoYoverse.
- Privacy policy, written for what the app really does: UIDs, IP addresses (rate limits and server
  logs), the pasted wish history link (used once, never kept), pulls kept in the browser's local
  storage, and the third parties involved (Enka.Network, HoYoverse, the host). Name who is
  responsible and how to reach them, how long logs are kept, and how a person deletes their data.
- Cookies and storage: the app sets no cookies today and its local storage only serves the feature
  the user asked for. Any analytics or ads need a consent banner first.
- Terms of use: no warranty, and a warning that the game's terms may not allow third-party history
  tools; the user accepts that risk.
- Enka.Network: read its current API rules (identification, caching, limits, credit) and follow them.
- Operations: HTTPS only, `FORWARDED_ALLOW_IPS` set to the proxy, rate limits and cache moved out
  of process if there is more than one worker, a contact address for abuse reports.
