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
  The browser tests render with DejaVu Sans (`frontend/e2e/fonts.conf`), as CI does, so a layout
  passes or fails the same everywhere. Check Russian text too: it runs longer than English.
- Never lower a coverage floor or switch off a lint rule to get a change through.
- The owner works from a phone and cannot open the preview. Never leave a step that needs a
  computer. After a UI change, start the app, report its port, and send phone-sized screenshots.
- The UI is mobile-first: it must work at 360px wide with 16px inputs and 44px touch targets.
- `backend/app/showcase/gamedata.json`, `backend/app/starrail/gamedata.json` and
  `backend/app/starrail/texts.json` are generated: run `scripts/sync_gamedata.py` and
  `scripts/sync_starrail_data.py` in `backend/` after each game version, never edit them by hand.
- Tests never call Enka.Network or HoYoverse. They use the fixtures in `backend/tests/fixtures/`
  and `backend/tests/gacha_fixture.py`. Fixtures from real accounts are anonymized.
- A wish history link is a secret: never log it, store it or put it in a URL the app requests.
- Work on a branch and open a pull request into `main`; the owner merges it.
- Before starting a stage, write the plan for the owner: what will be built, in what order, and
  what is left out. Plan several features per stage, not one.
- Before planning a stage, check which installed skills and plugins, and which ones in the plugin
  catalog, would improve the result. Use the installed ones; name catalog ones worth adding.
- Leave nothing out quietly. Everything the owner asked for is either built or in the README plan
  with its place in the order; a mechanic left out of the code gets a `shortcut:` comment and a
  plan entry too. Before reporting a stage done, reread the owner's request and tick off each part.
- When you see something that would improve the site (a feature, a fix, a safer or clearer way),
  propose it to the owner with the reason. Do not build it unasked.
- Game mechanics come from game data and from the open implementations listed in the README, not
  from memory. No plugin covers them; say so rather than inventing a source.
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
- Security: install the `usestrix/strix` plugin and run it against the deployed site, along with
  the `claude-security` scan of the code. Fix what they find before launch.
- Telegram: the bot's token is a secret (environment variable, never in the repository or logs);
  the privacy policy covers the Telegram user ids and messages the bot receives, how long they
  are kept, and that UIDs sent to the bot reach Enka.Network.
- Operations: HTTPS only, `FORWARDED_ALLOW_IPS` set to the proxy, rate limits and cache moved out
  of process if there is more than one worker, a contact address for abuse reports.

## Owner checks still open

Remind the owner of these until they confirm them.

- None open. Confirmed so far: Secret scanning and Push protection are on; Star Rail final stats
  match the game once numbers are cut off the way the game prints them (1160.63 DEF reads 1160).
