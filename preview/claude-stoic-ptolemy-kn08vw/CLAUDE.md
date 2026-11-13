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
| `art.js` | Line-art SVG drawings, display only: `ART.icon(name)` icon set (goods, ad cards, events), `ART.place(loc)`, and `ART.store(state)`, the shop scene drawn during service from each step's `snap` |
| `style.css` | Styles; colors are `:root` tokens with light and dark themes |
| `index.html` | Entry; loads `firebase-config.js` → `engine.js` → `app.js` |
| `firebase-config.js` | Firebase web config (public values, safe to commit) |
| `firestore.rules` | Security rules. **After changing them, a person must paste them into the Firebase console and publish** |
| `tests/` | Tests, see below |

## Architecture (understand before editing)

1. **Deterministic replay**: game state is never stored in the database. Each player only appends actions to their own seat doc `games/{code}/seats/{p1|p2}` (the `log` array). Both browsers rebuild the same state with `simulate(seed, {p1: log, p2: log})`. So **`engine.js` must never use `Math.random()` or the current time**; use `rand(seed, tag)` / `d6(seed, tag)` for randomness.
2. **Action keys `k`**: every action carries a key like `"3:market"` (day 3, market phase). Daily phase order (v2): `morning` (day 2+) → `invest` (tables + that player's own event choice) → `market` → `commit` (buy/place ad cards) → `reveal` (automatic) → `service` → `voucher` → `report`. `expected(S)` decides who we're waiting on and for which key; actions with the wrong key are dropped, so double clicks don't apply twice. A new phase needs changes in `expected()`, `apply()` and `actionHTML()` in `app.js`.
3. **Live market (the one real-time exception)**: who got which item is settled live in `games/{code}/market/d{day}` (`owner` map + `start` time); each click is an `fb.tx()` transaction, so the first click wins. Cooldowns and the 60s timer run on each device. When a player finishes, their action is `{k, buys:[item indexes]}`, and `apply('market')` replays it (if both logs ever claim one item, P1 keeps it). Item types come from `marketItems(seed, day)`, and Regular today/tomorrow from `regTomorrow()`, so both sides agree without storing them.
4. **Face-down ad cards**: the daily shop is `shopFor()` (seeded, per player). At placement only the counts (`nSelf` / `nRival`) and `adHash({self, rival}, salt)` are public; the card ids are kept on the device and in `users/{uid}/ads/...`. `apply('reveal')` checks the checksum; on failure the cards do nothing and cost nothing. Cards are paid at the flip.
5. **Interactive service**: `prepService()` rolls everything random for the day into `S.script[seat]` (card outcomes, the day's event, booking/inspector rolls). `serviceRun(S, seat, ops, closed)` is shared by engine and page: it plays the script with the player's choices `ops` (`{ep, a:'rush'|'borrow'}` per shortage episode, `{a:'food', give}`) and, when `closed` is finite, stops at the first open shortage / unanswered choice and returns it as `pending`. The page (`serviceTick()`, `svcAction()`) runs the patience and delivery bars in real time and logs `{k, ops}` when the player closes for the day; `finishService()` replays it. Prices and borrow refusals come from `opPrice()` / `borrowOk()` (seeded per episode and try). A new random element needs a field in the script plus its text in `stepLine()`.
6. **Rendering while live**: during market and service the page ticks every 200ms but only re-renders when `liveSig()` changes; bars (`tbar()` with `data-t0/t1`) and countdowns are moved in place by `updateBars()`. Don't re-render on every tick: replacing buttons under the pointer drops clicks.
7. **Private information**: each player's morning event (shady deal, booking) and its outcome are shown only to them; see `eventChoiceHTML()`, `PRIVATE_LINES` and `PRIVATE_WHY` in `app.js`.
8. **Hints and rules**: each decision screen has one short line built with `hint()` (or `mathHint()` for the "expect X guests · seat min(tables, food)" line) in `app.js`. Keep hints to a single line. Rules are shown per step from `RULES` in `app.js`; there's no global rules box any more.
9. **Placeholder numbers**: values marked TBD in `CFG` comments (ad cards, service prices and chances, event numbers) are placeholders until the team settles them.
10. **Same version on both sides**: both players must run the same `engine.js`, or they'll compute different results. Changing rules or numbers recomputes games in progress under the new rules. Remind the team to change versions between games and have both players refresh.

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

`online.test.py` uses `tests/fake-backend.js` in place of Firebase and plays a full game as two players on two pages, checking both sides get the same result, card reveals pass the checksum, and there are no page errors. The `window.__RR_FAKE_FB` check in `app.js` is for this test; don't remove it.

## Publishing

Push to `main`; GitHub Pages updates in about a minute. Other branches deploy to `/preview/<branch>/` on the same site (see `.github/workflows/pages.yml`); the Pages source is the `gh-pages` branch, which only the workflow writes to. **Whenever `style.css`, `engine.js`, `art.js`, `app.js` or `firebase-config.js` changes, bump the `?v=...` after those files in `index.html`** (e.g. to the current short commit hash), or browsers may keep cached old files. Write short commit messages in English describing what changed.

## Related docs

- v1 prototype proposal (source of the rules and numbers): https://claude.ai/artifact/XXaDQPnC3Tgbi1U9Z1FE2t (visible only to people it's shared with)
- Playtest 1 notes: https://claude.ai/artifact/Ke61jjQgiuCPV23Q89BpHN
- Setup and deployment: `README.md`
