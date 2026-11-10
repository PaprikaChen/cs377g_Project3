# Spoon Fight (was Restaurant Rivals) · notes for Claude

Project context for Claude (in chat or in Claude Code). Read all of it before making changes.

## What this is

A two-player web game that teaches restaurant management to players aged 13+. It's a team project for a game design class, currently a first prototype. The goal is fast iteration and playtesting.

- Live site: https://paprikachen.github.io/cs377g_Project3/ (GitHub Pages)
- Backend: Firebase anonymous sign-in + Firestore; no server of our own
- Team AI policy: **game design content (rules, numbers, the ideas behind the copy) is the team's own original work; AI is used for code and cross-checking.** When changing rules or numbers, implement what the team asks for; don't invent new mechanics or numbers. If a design looks problematic, say so with reasons and let the team decide.
- On-screen text and project files are in English.

## Files

| File | Contents |
| --- | --- |
| `engine.js` | All game rules. `CFG` holds every number; `simulate(seed, logs)` replays both players' action logs into the game state |
| `app.js` | Rendering, Firebase sync, local test mode (ES module) |
| `art.js` | SVG drawings, display only: `ART.icon(name)` small icons, `ART.stars(n)`, `ART.plate()`, and `ART.floor(o)`, the top-down floor plan (dining room up to 14 tables, kitchen with one plate per food, patio for borrowed tables, the queue and unhappy guests outside) used by Build and Service |
| `style.css` | Styles (UI v3, "minimal premium"); colors are `:root` tokens with light and dark themes. You = cobalt `--you`, rival = magenta `--rival`, main buttons use the logo red (`.cta`), celebration numbers use the gold logo lettering (`.gold`) |
| `assets/` | `key-art.jpg` (landing + final results), `logo.jpg` (header), `countryside.jpg` / `city.jpg` (pick screen) |
| `docs/mockups/` | The earlier agreed design for every screen (PNG) |
| `docs/uiux-v2-changes.md` | The UI/UX v2 changes (agreed on the mockup canvas): what each screen does now and why. Match this when changing the UI |
| `index.html` | Entry; loads `firebase-config.js` → `engine.js` → `app.js` |
| `firebase-config.js` | Firebase web config (public values, safe to commit) |
| `firestore.rules` | Security rules. **After changing them, a person must paste them into the Firebase console and publish** |
| `tests/` | Tests, see below |

## Architecture (understand before editing)

1. **Deterministic replay**: game state is never stored in the database. Each player only appends actions to their own seat doc `games/{code}/seats/{p1|p2}` (the `log` array). Both browsers rebuild the same state with `simulate(seed, {p1: log, p2: log})`. So **`engine.js` must never use `Math.random()` or the current time**; use `rand(seed, tag)` / `d6(seed, tag)` for randomness.
2. **Action keys `k`**: every action carries a key like `"3:market"` (day 3, market phase). Daily phase order (v2): `morning` (day 2+) → `invest` (tables + that player's own event choice) → `market` → `commit` (buy/place ad cards) → `reveal` (automatic) → `service` → `voucher` → `report`. `expected(S)` decides who we're waiting on and for which key; actions with the wrong key are dropped, so double clicks don't apply twice. A new phase needs changes in `expected()`, `apply()` and `gameHTML()` in `app.js`.
3. **Live market (the one real-time exception)**: who got which item is settled live in `games/{code}/market/d{day}` (`owner` map + `start` time); each click is an `fb.tx()` transaction, so the first click wins. Before the clock runs, each player sees a briefing (`marketBriefHTML()`) and presses Start: the start time is set in the market doc once both are ready (`ready` map), 3 seconds ahead for a countdown, or 30 seconds after the first player pressed Start (`marketForceStart()`). Cooldowns and the 60s timer run on each device. When a player finishes, their action is `{k, buys:[item indexes]}`, and `apply('market')` replays it (if both logs ever claim one item, P1 keeps it). Item types come from `marketItems(seed, day)`, and Regular today/tomorrow from `regTomorrow()`, so both sides agree without storing them.
4. **Face-down ad cards**: the daily shop is `shopFor()` (seeded, per player). At placement only the counts (`nSelf` / `nRival`) and `adHash({self, rival}, salt)` are public; the card ids are kept on the device and in `users/{uid}/ads/...`. `apply('reveal')` checks the checksum; on failure the cards do nothing and cost nothing. Cards are paid at the flip.
5. **Interactive service**: `prepService()` rolls everything random for the day into `S.script[seat]` (card outcomes, the day's event, booking/inspector rolls). `serviceRun(S, seat, ops, closed)` is shared by engine and page: it plays the script with the player's choices `ops` (`{ep, a:'rush'|'borrow'}` per shortage episode, `{a:'food', give}`) and, when `closed` is finite, stops at the first open shortage / unanswered choice and returns it as `pending`. The page (`serviceTick()`, `svcAction()`) runs the patience ring and delivery bars in real time and logs `{k, ops}` when the player closes for the day; `finishService()` replays it. Prices and borrow refusals come from `opPrice()` / `borrowOk()` (seeded per episode and try). A new random element needs a field in the script plus its text in `logLine()` (and `adResult()` for a card).
6. **Rendering while live**: during market and service the page ticks every 200ms but only re-renders when `liveSig()` changes; bars and rings (`data-t0/t1`, plus `data-ring` for rings) and countdowns (`data-count`) are moved in place by `updateBars()`. Don't re-render on every tick: replacing buttons under the pointer drops clicks.
7. **Private information**: each player's morning event (shady deal, booking) and its outcome are shown only to them; see the offer cards in `buildHTML()`, `PRIVATE_LINES` and `PRIVATE_WHY` in `app.js`.
8. **Text and rules**: on-screen text is plain language for a 13-year-old: say what happened to the player and why, effect first, no engine jargon; odds only where the player decides (Ads). Every button on screen must work: unavailable actions are explained in text, not shown as disabled buttons. Rules live in the How to play drawer (`howtoHTML()` in `app.js`), built from `CFG` numbers. Card faces shown to players come from `adFace()` (emoji art, big effect, short line, keyword tag), and results from `adResult()` / `trickResult()` / `flipStamp()`; they and are a plain-language rewrite of `CFG.ads` text: the team owns that wording.
9. **Placeholder numbers**: values marked TBD in `CFG` comments (ad cards, service prices and chances, event numbers) are placeholders until the team settles them.
10. **Same version on both sides**: both players must run the same `engine.js`, or they'll compute different results. Changing rules or numbers recomputes games in progress under the new rules. Remind the team to change versions between games and have both players refresh.
11. **Morning step**: the engine still has a separate `morning` phase; the page acknowledges it automatically in `refresh()`. Inside `invest` the page shows up to three screens, tracked in the form state (`f.gift`, `f.offer`): the day 1 gift (`giftHTML()`), the secret offer card on event days (`offerHTML()`), then the tables (`buildHTML()`).
13. **Day 1**: there is no Market. `CFG.freeFood` plates are put in the kitchen in `startRound()`, and `apply('invest')` goes straight to `commit` on day 1. The top bar shows 4 steps that day (`stepsFor()`).
14. **Build, Ads and Service screens** follow the v2 mockups: `shell()` puts the main card left and the side column right with the button at the bottom. The restaurant picture is `ART.room()` (door queue | tables | kitchen), used by `floorBuild()` and `svcFloor()`. Before the doors open the ad cards flip by themselves one at a time (`sv.flip`, a timer in `serviceHTML()`), then "Open the doors". Vouchers are their own page after service (`voucherHTML()`).
12. **One-screen practice**: before steps with secrets (`PRIVATE_PHASES`: pick, invest, commit) a cover screen (`coverHTML()`) asks the other player to look away.
15. **Start screens**: `lobbyHTML()` shows the invite page when the URL has `?room=CODE` (`app.invite`, set in `boot()`), the "still going" card when this device has an unfinished game (`app.resume`, from `loadResume()`), otherwise the first-visit page. Online, until seat p2 is taken, the game shows the waiting room (`roomHTML()`, `inRoom()`) instead of the story. Story pictures are `ART.story(i, rivalName)`; pick needs a tap to select (`picksel`, `f.loc`) and then the Open button.

## Firestore data

```
games/{code}                 { seed, host, created, v }                           created by the host, never changed
games/{code}/seats/p1|p2     { uid, name, log: [actions...] }                     only the seated player can update
games/{code}/market/d{n}     { owner: {itemIndex: 'p1'|'p2'}, start }             live market for day n; claimed by transaction
users/{uid}/ads/{code}-r{n}  { self: [cardIds], rival: [cardIds], salt }          only that player can read/write
```

If you change paths or fields, update `firestore.rules` too and tell the team to republish the rules in the console.

## Tests (run after every change)

```
node tests/engine.test.js        # simulates 2000 random games; checks nothing gets stuck, stars stay 1–5, replays are deterministic
```

UI and online flow (needs Python playwright and Chromium):

```
python3 -m http.server 8765 &     # from the repo root
python3 tests/online.test.py http://localhost:8765/index.html
```

Market start (both players press Start → same start time; only one presses → opens after 30s). Takes about 45 seconds:

```
python3 tests/market-start.test.py http://localhost:8765/index.html
```

Screenshots of every screen in light and dark theme, in about 15 seconds (builds each game state straight from the engine instead of playing in real time):

```
python3 tests/screens.py http://localhost:8765/index.html out-folder
```

`online.test.py` uses `tests/fake-backend.js` in place of Firebase and plays a full game as two players on two pages, checking both sides get the same result, card reveals pass the checksum, and there are no page errors. The `window.__RR_FAKE_FB` check in `app.js` is for this test; don't remove it.

## Publishing

Push to `main`; GitHub Pages updates in about a minute. Other branches deploy to `/preview/<branch>/` on the same site (see `.github/workflows/pages.yml`); the Pages source is the `gh-pages` branch, which only the workflow writes to. **Whenever `style.css`, `engine.js`, `art.js`, `app.js` or `firebase-config.js` changes, bump the `?v=...` after those files in `index.html`** (e.g. to the current short commit hash), or browsers may keep cached old files. Write short commit messages in English describing what changed.

## Related docs

- v1 prototype proposal (source of the rules and numbers): https://claude.ai/artifact/XXaDQPnC3Tgbi1U9Z1FE2t (visible only to people it's shared with)
- Playtest 1 notes: https://claude.ai/artifact/Ke61jjQgiuCPV23Q89BpHN
- Setup and deployment: `README.md`
