# HoYo Toolkit

Build optimizer and wish tracker for HoYoverse games (Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero).

> Fan project. Not affiliated with or endorsed by HoYoverse.

## Features

The app opens on Honkai: Star Rail; Genshin Impact is one tap away.

- **Star Rail builds** — enter a UID and see every character in the player's showcase: level,
  eidolon, element, path, skill levels, light cone and relics, under the player's profile card.
  Each substat shows how many times it rolled.
- **Star Rail character pages** — each character's skills, described with the numbers of the
  level the player has, the trace tree with what is unlocked, the materials still needed to max
  skills and traces, and eidolons. Texts come from
  [StarRailRes](https://github.com/Mar-7th/StarRailRes).
- **Star Rail final stats and team speed** — each character's stats as the game's character
  screen adds them up, with switches for the effects that need a condition: relic sets whose
  bonus depends on SPD switch on by themselves. The Speed tool lays out the turn order of a team
  of four through Memory of Chaos cycles 0 to 2, with speed buffs, action advance, Ultimates on a
  chosen beat and summons taking their own turns, from a table of popular supports, light cones
  and sets with the numbers from the game's texts. Summons come when the game brings them in
  and leave when their actions run out (Netherwing, Fuyuan), Lightning-Lord speeds up with its
  hits, and Firefly's Complete Combustion ends on its countdown's turn. Sets that raise all
  allies' stats (Fleet of the Ageless, Broken Keel) count on the wearer by its own stats and on
  the others by a switch. Effects take the character's own skill levels and Eidolons; Jingliu's
  Syzygy brings Spectral Transmigration, Pearl's advance counts the team's Elation characters,
  and an enemy with the SPD you type in takes turns, slowed and delayed by Welt, Boothill and
  Dan Heng. Robin's Concerto holds her turns until its countdown acts, and Garmentmaker
  speeds up with each attack. A buff gained again refreshes unless the game lets it stack.
  Aglaea's Supreme Stance gives her SPD per Garmentmaker stack until its SPD 100 countdown sends
  Garmentmaker away; Robin • Summeretto's Vibes bring Fever, with the Summer Songbirds and a
  countdown taking turns while she waits. Extra turns come at once: Pearl's with four Elation
  characters, Firefly's Eidolon 2. Castorice's Eidolon 2 advances her twice per Netherwing, and
  Hanya's Eidolons 1 and 4 count. Welt's and Jingliu's later skill kits are told apart from the
  first ones by the showcase's traces, and each debuff says its base chance to land, with a box
  for whether it did.
- **Star Rail relic advisor** — describe a 4★ or 5★ relic and pick the substats you want: the app
  gives the exact chance that its remaining upgrades land on them, that a stat reaches a goal
  (SPD 10, say), and that the relic ends up better than the one a character wears. Relics in
  Builds get a score from the substats you mark as wanted. The upgrade rules are community
  estimates; a simulation in the tests checks the exact math.
- **Start page** — what the toolkit does: the hero with the product's own interface on the first
  screen, the tools of each game close below it, and a UID field that opens the player's builds.
- **Layout** — laid out for a computer first, to fill its screen: the menu beside the page, a
  tool's fields side by side across the page so a form is seen whole without scrolling, its
  results across the width below, cards side by side, and the Speed tool's turn order beside the
  team. On a phone, a top bar, a menu and the current game's tools in a tab bar at the foot of
  the screen; still usable 360px wide with 44px touch targets. Plain colours, by the owner's
  choice: a neutral grey ground, near-white text and a blue accent in Geist, or a light grey
  ground with white cards as the light theme.
- **Icons** — the tools carry the game's own signs: Honkai: Star Rail's phone menu icons and its
  speed stat icon, painted in the text colour, and the Stellar Jade as the site's icon (see
  Credits).
- **Light and dark themes** — the app follows the device's setting until the player taps the
  theme button in the top bar, which switches to the other theme; a long press, a right click or
  the keyboard's menu key goes back to the device's. The pick is kept on the device.
- **Share a Star Rail build** — every showcase and character page has its own address
  (`#starrail/builds/UID` and `#starrail/builds/UID/CHARACTER`), and a Share link button hands
  it to the phone's share sheet or copies it. Whoever opens the link sees the same page, loaded
  fresh from Enka.Network. The UID stays after "#", so the browser never sends it to the server
  as part of the page address.
- **Languages** — English and Russian, with numbers in each language's format. Star Rail
  numbers are cut off the way the game prints them, not rounded.
- **Genshin builds** — enter a UID and see every character in the player's showcase: final
  stats, talents, weapon and artifacts. Data comes from [Enka.Network](https://enka.network).
  A player's builds can be shared as a link, as in Star Rail.
- **Damage calculator** — for any imported character: enter a talent multiplier, pick the
  scaling stat, damage bonus, reaction and enemy, and get average, crit and non-crit damage.
  Multipliers are typed in by hand; shred, flat additions and transformative reactions are not
  modelled.
- **Wish history** — import the whole wish history straight from a phone: on Android, copy the
  text of the error page the game's history shows offline and paste it in. Shows every banner's
  pity and each 5★ with the pulls it took. The steps for Android and iPhone are paimon.moe's
  own (see Credits), and both histories quote what HoYoverse's privacy policy says about asking for a copy
  of one's data. A UIGF file (v4, or the older v2 and v3) another tracker exported can be read
  instead, on the device. Pulls are saved only on the device; the link, which
  opens the history to anyone for about a day, is used for the import and never kept. Global
  servers only.
- **History link on a PC** — both histories show this site's own PowerShell script in full, with
  a button that copies it: pasted into PowerShell, it reads the game's log and web cache and
  prints the history link. It sends nothing over the network and writes no file itself; CI runs it
  against a made-up game on Windows, in Windows PowerShell 5.1 and PowerShell 7. Global servers
  only.
- **Save the history to a file** — both histories save to a UIGF v4 file that this site reads
  back, so clearing the browser's data loses nothing. A Star Rail file keeps the server's time
  offset and the item and pool ids HoYoverse sends. Genshin's history sends no item ids, and
  warps saved before this version kept none, so those are written empty: trackers that look
  items up by id may refuse them.
- **Luck in the history** — each banner shows the pulls a 5★ took on average and the most pulls
  in a row without one. The history reaches back about a year, so the first 5★ counts only
  the pulls since then.
- **Star Rail warp history** — import it with a warp history link, or choose a UIGF (v4) or SRGF
  file another warp tracker exported, read on the device and never sent anywhere. No trustworthy
  source gives a way to get the link on a phone. Shows each banner's pity and 5★ warps. Global
  servers only.
- **Wish forecast** — chance to pull a featured 5★ character with the pulls you have, and how
  many pulls 50%, 90%, 99% and 100% take. Exact math, not a simulation. Capturing Radiance is
  not modelled, so real odds are slightly better.
- **Warp forecast** — the same exact odds for Star Rail's character and light cone event warps.
- **Telegram bot** — a Star Rail showcase and warp odds in Telegram; see below to run it.

Character, weapon, light cone, artifact and relic images are loaded from Enka.Network.

Planned, in order:

1. Star Rail effects: Ultimates timed by energy instead of a fixed beat. This needs each skill's
   energy gain, which neither StarRailRes nor Enka.Network's store gives: it waits for a source.
   Left out of the effects built so far, each with a `shortcut:` comment in
   `frontend/src/starrail/effects.ts`, as each depends on the battle or waits its turn:
   - debuffs weighed by Effect Hit Rate against the enemy's Effect RES (the base chance is shown
     and the player ticks whether it landed);
   - Welt's Weightless delay per hit taken; the later Jingliu's Syzygy from allies losing HP; the
     later Firefly's countdown delay per Weakness Break;
   - Robin • Summeretto's Vibes from the Special Guest, her Technique and Eidolon 2's first gain,
     Eidolon 4's Songbirds SPD, her Ultimate during Fever (and Eidolon 6's two stored), and the
     50% advance when Fever ends (she acts at once then anyway);
   - Aglaea's Eidolon 4 stack from her own attacks; Pearl's Eidolon 2 advance for the other
     Elation characters; Hanya's Eidolon 1 taken as once each of her turns; Castorice's Ardent
     Will spent on Netherwing's first two turns.
2. Telegram: a host to run the bot on, then a Telegram Mini App that opens the site inside
   Telegram (it needs the site hosted over HTTPS), and the bot's replies linking to the shared
   page of each character once the site has an address.
3. Genshin: talent multipliers from game data and a best-artifact search.
   Luck statistics, the rest: the share of 50/50s won on character banners, for both games. It
   needs to know which 5★ characters are standard, which neither game data source here gives:
   it waits for a source (an open tracker's data file, read and credited).
4. Zenless Zone Zero: undecided.

Found by the site review of November 2026 and left for later, small:

- The start page's sample of the Speed tool keeps English names and a decimal point in Russian.
- "3 action(s)" and "2 stack(s)" in the Speed tool's effect texts want proper plurals.

Reference implementations to check game mechanics against (read, never copied):
[StarRailRes](https://github.com/Mar-7th/StarRailRes) for game data and texts, and the open source
[Fribbels HSR Optimizer](https://github.com/fribbels/hsr-optimizer) for how conditional effects and
speed are modelled. Check each project's licence before reusing anything from it.

Before any public launch, the checklist in `CLAUDE.md` comes first.

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

The `Game data` workflow runs the sync every day (and on demand from the Actions tab). When the
sources changed, it runs every check and opens a `Game data update` pull request, which says
whether the checks passed: merge a green one; a red one means the data format changed and the
code needs a fix first. A new character's effects on the turn order still need adding to
`frontend/src/starrail/effects.ts` by hand; until then the Speed tool says none are known, and a
test fails if the tables name an id the data no longer has.

## Telegram bot

`backend/app/telegram/` answers in Telegram by long polling, so it needs no public address: send
it a Star Rail UID for the showcase's characters, `/warp PULLS [PITY] [g]` for the odds of the
featured 5★ character, `/lang ru` or `/lang en` for the language. It uses the same code and the
same cache of Enka.Network answers as the site, and limits each chat to 10 messages a minute.

Create a bot with [@BotFather](https://t.me/BotFather), then run it where it can stay on:

```sh
export TELEGRAM_BOT_TOKEN=...   # the token is a secret: never commit it or paste it in a chat
cd backend && uv run python -m app.telegram
# or from the Docker image, passing the variable through from the environment
docker run -e TELEGRAM_BOT_TOKEN hoyo-toolkit python -m app.telegram
```

It logs neither messages nor chat ids, and its errors never carry the token. Failures are
explained in the chat's language.

Set `TELEGRAM_STATE_FILE` to a file the bot may write, and it keeps its place in the message
stream and the languages chats chose with `/lang` across restarts; without it, a restart answers
the last batch of messages again and forgets those choices. The file holds the ids of the chats
that used `/lang`, and nothing else about anyone. In Docker, keep it on a volume:

```sh
docker run -e TELEGRAM_BOT_TOKEN -e TELEGRAM_STATE_FILE=/data/bot.json -v hoyo-bot:/data \
  hoyo-toolkit python -m app.telegram
```

## Checks

```sh
./check.sh
```

Runs everything CI runs:

- backend: ruff, mypy in strict mode, pytest with a coverage floor
- frontend: type generation, oxlint with accessibility rules, Vitest with a coverage floor,
  a production build
- the built app in a real browser (Playwright): every tool end to end at phone size and at
  360px wide, touch target sizes, and an automated accessibility scan. The browser renders with
  DejaVu Sans on every machine (`frontend/e2e/fonts.conf`), a wide font, so text that fits in
  the tests fits on phones

CI also checks every dependency against the known vulnerability databases (`pip-audit`,
`npm audit`) and runs GitHub's CodeQL code scanning on every push and weekly.

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

The image listens on the port in `PORT` (8000 without it), as hosts such as SnapDeploy expect.

## A private test deploy

Until the launch checklist in `CLAUDE.md` is done, the site is for its owner only. Every page
tells search engines not to list it, and setting `SITE_PASSWORD` on the host makes every page
ask for that password (any user name); only `/api/health` stays open for the host's checks.

On [SnapDeploy](https://snapdeploy.dev), from its phone app or the site: Deploy from GitHub,
pick this repository and `main`, and it builds the `Dockerfile` as it is. Add the environment
variable `SITE_PASSWORD` with a password of your own before the first deploy. The free tier
sleeps after 15 idle minutes and wakes in about a minute on the next visit.

The Telegram bot does not run there: a sleeping container cannot poll, and SnapDeploy's
acceptable use policy names Telegram bot frameworks among what it refuses. It needs another host.

## Licence

MIT: see `LICENSE`. Game data, names and images belong to HoYoverse and are not under this
licence: that includes the game's icons in `frontend/public/icons` and
`frontend/public/favicon.png`. HoYoverse has given no permission for them; they are used the
way fan tools commonly use game art, and come out if HoYoverse asks.

## Credits

The tool icons and the site's icon are the game's: the phone menu signs, the speed stat icon and
the Stellar Jade of Honkai: Star Rail, taken from
[StarRailRes](https://github.com/Mar-7th/StarRailRes) (`icon/sign`, `icon/property`,
`icon/item/900001.png`). Genshin's tools carry Genshin Impact's Paimon menu icons (Character,
Wish, Adventurer Handbook), from the files the
[Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Paimon_Menu) on Fandom keeps,
turned into white marks. All of them belong to HoYoverse.

The Genshin wish history steps for Android and iPhone are paimon.moe's, word for word in English
and Russian: [paimon-moe](https://github.com/MadeBaruna/paimon-moe), MIT licence, copyright (c)
2021 Made Baruna. The site itself links no other tracker, so players stay on it.

History files follow the [UIGF standard](https://uigf.org/en/standards/uigf.html) (v4.2, and the
older UIGF v3 and SRGF v1 for reading). The server offsets a Genshin export writes by the UID's
first digit are those of [genshin-wish-export](https://github.com/biuuu/genshin-wish-export)
(`src/main/UIGFJson.js`); a Star Rail export takes the offset HoYoverse's warp history sends, as
[star-rail-warp-export](https://github.com/biuuu/star-rail-warp-export) does. Both are MIT
licensed; nothing was copied from them.

The PC scripts (`frontend/src/wishes/link-scripts`) look for the link where those two exporters
do (`src/main/getData.js`): the game's own folder from its log in `AppData\LocalLow`, then the
newest `webCaches\…\Cache\Cache_Data\data_2` under it. Their first step, opening the history in
the game, is quoted from each exporter's `docs/README_EN.md`.
