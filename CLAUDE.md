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
- The owner prefers quality to saving limits: use subagents where they help (an independent
  review of a diff, wide searches, reading large sources) and do the rest in this session.
- When the owner is wrong about a fact, a tool or a plan, say so plainly, with the reason, before
  doing the work.
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
- Enka.Network: its API rules (github.com/EnkaNetwork/API-docs, api.md) were read in November
  2026: a custom User-Agent (done: `hoyo-toolkit`; add the site's address once it has one), cache
  each UID until its `ttl` (done), no UID enumeration or mass queries (none), handle 400, 404, 424,
  429, 500 and 503 (done). They state no credit, commercial-use or image terms; the Star Rail
  endpoint is not documented there. Read them again before launch.
- Security: install the `usestrix/strix` plugin and run it against the deployed site, along with
  the `claude-security` scan of the code. Fix what they find before launch.
- Telegram: the bot's token is a secret (environment variable, never in the repository or logs);
  the privacy policy covers the Telegram user ids and messages the bot receives, how long they
  are kept, and that UIDs sent to the bot reach Enka.Network. With `TELEGRAM_STATE_FILE` set, the
  bot keeps on disk the ids of chats that chose a language with `/lang`, until they are deleted.
- Shared links: a link to a build carries the player's UID; whoever has it sees that showcase.
  Say so in the privacy policy (a UID is public in the game, but the link tells who shared it).
- Operations: HTTPS only, `FORWARDED_ALLOW_IPS` set to the proxy, rate limits and cache moved out
  of process if there is more than one worker, a contact address for abuse reports.

## Owner checks still open

Remind the owner of these until they confirm them.

- None open. Confirmed so far: Secret scanning and Push protection are on; Star Rail final stats
  match the game once numbers are cut off the way the game prints them (1160.63 DEF reads 1160).

## Working notes

For a session picking the work up again.

- State: PRs #1 to #10 are merged. PR #11 (stage 11, from a scheduled session) and PR #12
  (stage 12, built on #11 merged with main) are open; merging #12 merges #11 too.
- Next: a host for the bot and the site, then the Mini App (README plan, item 2); or what is left
  of the effects table (item 1). The owner merges the workflow's `Game data update` pull requests.
- The owner writes in Russian and reads replies on a phone. Keep the UI English and Russian.
- GitHub tools: pass owner `iky4223` and repo `todo---hoyo-toolkit` (the old name `todo` is
  refused since November 2026). Repository settings cannot be changed
  from a session: ask the owner.
- Preview: build the frontend, then in `backend/` run
  `STATIC_DIR=../frontend/dist uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`. Screenshots
  use Playwright with `/opt/pw-browsers/chromium`; route `https://enka.network/ui/**` through
  curl, since the browser cannot reach that host directly. The owner's UID is 719781196.
- Game data and texts: Enka.Network's store (`EnkaNetwork/API-docs`) and StarRailRes
  (`Mar-7th/StarRailRes`, `index_new/<language>/*.json`). Read numbers from there, never memory.
- The effect table is `frontend/src/starrail/effects.ts`; the turn order simulator is
  `frontend/src/starrail/turns.ts`; final stats are `backend/app/starrail/stats.py`. Star Rail
  numbers are cut off, not rounded, as the game prints them.
- Skills: `ui-ux-pro-max` is installed. `design-taste-frontend` (Leonxlnx/taste-skill) was installed
  only in a past container; reinstall it from its repository if a design task needs it. Its rule
  against violet conflicts with the current palette: ask the owner before following it. The
  owner asked for headroom and get-shit-done; neither was installed (headroom proxies model
  traffic, which a cloud session cannot route; get-shit-done is archived and moved to
  `open-gsd/gsd-core`, and adds hooks and a workflow of its own).
- Netlify was connected to the repository by the owner and is being removed; it cannot run the
  backend. No free host is settled yet.
