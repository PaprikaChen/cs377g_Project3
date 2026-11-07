# Restaurant Rivals · notes for Claude

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
| `style.css` | Styles; colors are `:root` tokens with light and dark themes |
| `index.html` | Entry; loads `firebase-config.js` → `engine.js` → `app.js` |
| `firebase-config.js` | Firebase web config (public values, safe to commit) |
| `firestore.rules` | Security rules. **After changing them, a person must paste them into the Firebase console and publish** |
| `tests/` | Tests, see below |

## Architecture (understand before editing)

1. **Deterministic replay**: game state is never stored in the database. Each player only appends actions to their own seat doc `games/{code}/seats/{p1|p2}` (the `log` array). Both browsers rebuild the same state with `simulate(seed, {p1: log, p2: log})`. So **`engine.js` must never use `Math.random()` or the current time**; use `rand(seed, tag)` / `d6(seed, tag)` for randomness.
2. **Action keys `k`**: every action carries a key like `"3:market:5"` (day 3, market phase, step 5). Daily phase order: `event` → `invest` → `market` → `commit` (place cards) → `respond` (prep) → `reveal` (automatic) → `voucher` → `report`. `expected(S)` decides who we're waiting on and for which key; actions with the wrong key are dropped, so double clicks don't apply twice. A new phase needs changes in `expected()`, `apply()` and `actionHTML()` in `app.js`.
3. **Face-down ad cards**: at placement, only the card count per shop (`nSelf` / `nRival`) and a checksum `adHash({selfReal, selfBlank, rivalReal, rivalBlank}, salt)` are public. The real/bluff split is kept on the device and in `users/{uid}/ads/...` (readable only by that player). After both players finish Prep, each side reveals automatically; `apply('reveal')` checks the checksum and counts, and if they don't match, all of that player's cards count as bluffs. Cards are paid for at the flip, so the Prep screen must set aside that money first.
4. **Step-by-step service**: `runService()` records every random event (card flips, star-driven customers, bookings) in order in `S.service[seat].steps`. `openingHTML()` / `tick()` in the page only play those steps back and do no math. Whether a player has watched the playback is stored only locally (localStorage keys starting with `played:`), not synced. A new random element needs a new step kind plus its text in `stepLine()`.
5. **Private information**: events (shady deal, booking) and their outcomes are shown only to the player they happen to; see `eventHTML()`, `publicCapacity()`, `PRIVATE_LINES` and `PRIVATE_WHY` in `app.js`.
6. **Hints**: each decision screen has one short line built with `hint()` in `app.js`. Keep hints to a single line.
7. **Placeholder numbers**: values marked TBD in `CFG` comments (card prices, cards per shop, star-customer chances, pop-up table and rush food prices) are placeholders until the team settles them.
8. **Same version on both sides**: both players must run the same `engine.js`, or they'll compute different results. Changing rules or numbers recomputes games in progress under the new rules. Remind the team to change versions between games and have both players refresh.

## Firestore data

```
games/{code}                 { seed, host, created, v }                           created by the host, never changed
games/{code}/seats/p1|p2     { uid, name, log: [actions...] }                     only the seated player can update
users/{uid}/ads/{code}-r{n}  { selfReal, selfBlank, rivalReal, rivalBlank, salt }  only that player can read/write
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

`online.test.py` uses `tests/fake-backend.js` in place of Firebase and plays a full game as two players on two pages, checking both sides get the same result, card reveals pass the checksum, and there are no page errors. The `window.__RR_FAKE_FB` check in `app.js` is for this test; don't remove it.

## Publishing

Push to `main`; GitHub Pages updates in about a minute. **Whenever `style.css`, `engine.js`, `app.js` or `firebase-config.js` changes, bump the `?v=...` after those files in `index.html`** (e.g. to the current short commit hash), or browsers may keep cached old files. Write short commit messages in English describing what changed.

## Related docs

- v1 prototype proposal (source of the rules and numbers): https://claude.ai/artifact/XXaDQPnC3Tgbi1U9Z1FE2t (visible only to people it's shared with)
- Playtest 1 notes: https://claude.ai/artifact/Ke61jjQgiuCPV23Q89BpHN
- Setup and deployment: `README.md`
