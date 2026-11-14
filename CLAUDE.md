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
- The owner gives the wide screen of a computer priority now (November 2026): lay pages out for
  it first, with room for more per page. It must still work at 360px wide with 16px inputs and
  44px touch targets.
- The site links no other tracker or similar service (paimon.moe, stardb.gg and the like), so
  players stay on it: credit sources in the README and in code comments instead.
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

- Licence: MIT, chosen by the owner (`LICENSE`). Still to do: list the licences of dependencies.
- Disclaimer: "Fan project, not affiliated with HoYoverse" stays visible. Read HoYoverse's current
  fan content policy; no ads, payments or donations until it is confirmed allowed. Game images
  come from Enka.Network and belong to HoYoverse. The tool icons and the site's icon are game
  art kept in the repository (`frontend/public/icons`), used without HoYoverse's
  permission, as fan tools commonly do: decide before launch whether to keep them, and take them
  out if HoYoverse asks.
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

- State: PRs #1 to #17 are merged. `HANDOFF.md` holds the owner's task list and the plan of
  stages 17 to 22; `README.md` and this file win where they differ.
- PR #19 is merged: the owner's November 2026 choices. Tool icons are the games' own menu signs
  (`frontend/public/icons`, painted through a CSS mask): Star Rail's from StarRailRes, Genshin's
  from the Genshin Impact Wiki on Fandom (`gi-*.png`). The site's mark and browser icon are a
  four-pointed star drawn for it (the owner did not like the Stellar Jade there). The
  palette is plain grey and blue. The wide-screen layout fills the screen (fields across the
  page, results below).
- Stage 18 is merged: the theme switch in the top bar, and the
  effects table's rest (Aglaea's Supreme Stance, Robin • Summeretto's Fever, extra turns, later
  kits of Welt and Jingliu by trace ids, base chances). Left: Ultimates by energy (needs a source).
  The owner took the Telegram bot's host and Mini App out of the plan (November 2026); the bot's
  code stays. Next, by HANDOFF.md: stage 20, Genshin (README plan item 2).
- The start page is the player's desk (`frontend/src/Home.tsx`), not a landing page, by the
  owner's choice: the profile loaded in this visit, each saved history's pity, the tools.
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
- Skills: `ui-ux-pro-max` is installed. The owner removed the taste skill
  (`design-taste-frontend`) in November 2026 and replaced its palette with plain grey and blue:
  do not bring the skill or its colours back. The
  owner asked for headroom and get-shit-done; neither was installed (headroom proxies model
  traffic, which a cloud session cannot route; get-shit-done is archived and moved to
  `open-gsd/gsd-core`, and adds hooks and a workflow of its own).
- Hosting: the owner tests the site on SnapDeploy (Docker from GitHub, free tier sleeps when
  idle), behind `SITE_PASSWORD`. Its acceptable use policy refuses Telegram bot frameworks, so the
  bot needs another host. The owner gave an email for the privacy policy's contact: use it only
  in that page, when it is written, and remind them it will be public there.
