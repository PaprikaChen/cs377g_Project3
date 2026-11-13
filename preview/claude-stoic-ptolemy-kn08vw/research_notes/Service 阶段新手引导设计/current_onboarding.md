# How Spoon Fight currently teaches first-time players (branch `origin/uiux-v2`, commit 23b35fd)

Scope: codebase study. Every "source" below is a file on `origin/uiux-v2` read with `git show origin/uiux-v2:<path>`; line refs are `app.js:N` / `engine.js:N` on that commit. Screenshots referenced are in the scratchpad `uishots/` folder (made by `tests/screens.py`). New design = `research_notes/Service 阶段新手引导设计/v3-country.png`, `v3-city.png`, `v3-rush.png`.

Important context: CLAUDE.md describes `RULES` / `rulesHTML()` / `hint()` / `mathHint()` / "How this step works" accordions. **These exist only on `main` (main app.js:439–495) and were removed on `uiux-v2`.** On `uiux-v2` a grep finds no `RULES`, `rulesHTML`, `hint(` or `mathHint`. Their teaching job moved into per-screen copy (titles, forecast boxes, verdict lines, star-check panel). The report writer should not propose hooking into `rulesHTML()` on this branch.

## Q1. What onboarding exists today

### Takeaway
Onboarding on `uiux-v2` has no tutorial and no "first time" state. It has a 5-card story (skippable, shown again every game), a "How to play" drawer behind "?", one-time explainer screens built into the flow (Day-1 gift screen, Market briefing, card-flip screen), and constant teaching copy on each screen (title rule line, forecast/verdict boxes, star-check panel, "Why this happened"). Practice mode is a hot-seat version of the full game, not a guided tutorial.

### Cited Findings
**Story intro**
- `INTRO` is 5 one-line story cards (team → bad review → apart → Golden Spoon prize → "You made the final. So did they.") — [app.js:454–460](origin/uiux-v2:app.js#L454)
- Rendered by `pickHTML()` while `app.intro < INTRO.length`. It has a "Skip story" link (`data-act="introskip"`), page dots and Next. The last card's button says "Pick your restaurant →" — [app.js:689–694](origin/uiux-v2:app.js#L689)
- Handlers: `intro` → `app.intro++`, `introskip` → `app.intro = INTRO.length` — [app.js:1401, 1411](origin/uiux-v2:app.js#L1401)
- `app.intro` lives only in memory and `resetLive()` sets it back to 0 when a game is entered, so the story replays at the start of every game. Nothing remembers it in localStorage — [app.js:18, 178](origin/uiux-v2:app.js#L178)
- The story teaches only the premise (rivalry), no mechanics (screenshot 03-intro).

**Persistent device storage**
- `lsGet/lsSet` use the prefix `rr:` and are wrapped in try/catch — [app.js:6–7](origin/uiux-v2:app.js#L6)
- The only keys used are `nick` (app.js:17, 142), `lastCode` (115, 184), `theme` (502, 1400) and `ad:<code>:<round>:<seat>` (229–244). **There is no "seen tutorial" / "first game" / "tips shown" flag anywhere** — [app.js grep](origin/uiux-v2:app.js)

**"How to play" drawer ("?" button)**
- `renderBar()` adds a "?" button (on the lobby it reads "How to play") with `data-act="howto"` — [app.js:526](origin/uiux-v2:app.js#L526)
- `howto` opens the drawer with the section matching the current phase already expanded (`pick`, or `day` for invest/market/commit/service/voucher/report) — [app.js:1412–1416](origin/uiux-v2:app.js#L1412)
- `howtoHTML()` content: "The short version" (3 points: 5 days, most money + stars wins; every guest needs a table + a plate, extra food is wasted; your rival can play tricks), ending "That's enough to start. The game explains each step as you go." Accordions follow: Picking your restaurant, A day step by step, Stars, Surprises, Playing with a friend — [app.js:582–624](origin/uiux-v2:app.js#L582)
- Its Service text describes the OLD model: "Guests arrive in groups. If you run out of tables or food, you get a few seconds to rush in food ($7–10) or borrow a table from next door…", plus keys R / B / Esc — [app.js:605, 619](origin/uiux-v2:app.js#L605)
- Some wording is stale: it says "Practice alone on one screen" and "Back to your game", but the lobby buttons read "Practice alone" / "New here? Practice alone first" and "Rejoin the game" — [app.js:618 vs 556, 563, 553](origin/uiux-v2:app.js#L618)

**Lobby nudge and Practice mode**
- A first-time lobby shows "New here? Practice alone first" (`data-act="local"`) — [app.js:563](origin/uiux-v2:app.js#L563)
- `startLocal()` starts a full two-seat game on one screen with a random seed — [app.js:207–212](origin/uiux-v2:app.js#L207)
- In practice: a "Playing as Player N · switch players with the buttons at the top. Look away when it's not your turn." strip ([app.js:665–666](origin/uiux-v2:app.js#L665)); a "Pass the screen" cover for private phases `['pick','invest','commit']` (`coverHTML`, [app.js:656–659, 273](origin/uiux-v2:app.js#L656)); and an automatic switch to the other seat when the current one is done (`refresh()`, [app.js:265–268](origin/uiux-v2:app.js#L265))
- `controlled()` returns both seats in local mode, so `serviceTick()` advances both players' services at once — [app.js:32, 401](origin/uiux-v2:app.js#L32)
- Practice runs the same rules, events and timers as online. It is not a scripted tutorial.

**One-time explainer screens inside the flow**
- Day-1 gift screen `giftHTML()`: "A gift from the Golden Spoon! 12 free plates… From tomorrow, the food is on you: you and [rival] race for it at the Market." Gated by the form flag `f.gift` (a per-step form, not persistent) — [app.js:738–744, 782, 1426](origin/uiux-v2:app.js#L738)
- Morning offer card `offerHTML()` (shady deal / booking) states each choice's outcome, tagged "🔒 Only you can see this" — [app.js:745–769](origin/uiux-v2:app.js#L745)
- Market briefing `marketBriefHTML()`: 3 numbered rules, Express/Regular cards, a "Tonight" plan line and a Start! button that both players must press. It appears **every** market day, not only the first — [app.js:836–863, 865–866](origin/uiux-v2:app.js#L836)
- The card flip at the start of Service (`serviceHTML`, `!sv.started` branch): cards flip on their own about every 1.7 s, each with a stamp and a one-line result, then "Tonight so far: 7 + 1 − 2 = 6 guests" and "You can serve N of them right now: T tables and P plates", then **"Open the doors →"** (`data-act="play"`) — [app.js:1138–1162, 1448](origin/uiux-v2:app.js#L1138)

**Per-screen teaching copy that replaced RULES/hint**
- Build: forecast box with a verdict (too few / lots of seats / about right). On Day 1 only, an extra line: "Too few tables: guests leave… Too many: if over half sit empty…" plus a strip: "12 free plates tonight. Leftovers go bad at closing." — [app.js:794–819](origin/uiux-v2:app.js#L794)
- Ads: a "Tonight, if you play these" bar chart (guests / seats / plates) and a verdict — [app.js:969–1004](origin/uiux-v2:app.js#L969)
- Service running: title rule "Every guest needs **1 table + 1 plate**. Each meal pays $X." ([app.js:1122](origin/uiux-v2:app.js#L1122)), banner "All good so far. Nothing to do until something runs out." and Fast-forward ([app.js:1213–1222](origin/uiux-v2:app.js#L1213)), plus a "Next in line" legend line (`legend2`, [app.js:1219](origin/uiux-v2:app.js#L1219))
- `starCheck()` is always on the right during service: 0 unhappy +1★ / 1–3 −1★ / 4+ −2★, with an arrow on the current tier and the empty-tables rule — [app.js:1083–1089](origin/uiux-v2:app.js#L1083)
- Shortage screen: need bubbles, every option shows its price and result, "Let them go" shows the star drop, plus a "Why this happened" box — [app.js:1176–1203](origin/uiux-v2:app.js#L1176)
- Food request: both options show their odds — [app.js:1163–1174](origin/uiux-v2:app.js#L1163)
- Closing: a waste callout. Day 1 has special copy: "N of your 12 free plates went to waste. Food doesn't keep overnight. Tomorrow you pay for every plate…" — [app.js:1205–1211](origin/uiux-v2:app.js#L1205)
- Recap `tipFor()`: one cause-and-advice tip per day — [app.js:1258–1270](origin/uiux-v2:app.js#L1258)
- Design principles the team agreed (P1 one job per screen, P3 unlock gradually, P4 teach by doing, P5 preview outcome, P6 show cause then ledger) — [docs/uiux-v2-changes.md:7–15](origin/uiux-v2:docs/uiux-v2-changes.md)

### Inferences
- The house style is "explain at the moment of use, in the screen's own copy", with interstitials (gift, market briefing, card flip) as the only "stop and read" moments. A Service onboarding that fits would be another interstitial and/or contextual callouts, not a separate tutorial mode.
- With no "first time" flag, "first service" can only be detected as `S.round === 1` (per game) or with a new `lsSet('seen:svc')` key (per device). The `lsGet/lsSet` wrapper already handles private windows.
- `marketBriefHTML` is the closest precedent: a numbered-rules screen plus a ready button, shown before a real-time phase.

### Gaps
- No playtest evidence in the repo on whether players read the howto drawer or skip the story. (Playtest 1 notes are a private artifact link in CLAUDE.md and weren't read.)

## Q2. How Day 1 differs, and where a first-service tutorial could hook in

### Takeaway
Day 1 removes only the Market (12 free plates instead). Morning secret offers, ad cards, service events (60%), shortages and vouchers are all active on Day 1. The natural hook points are the card-flip / "Open the doors" interstitial (`!sv.started`), the `svcState()` local state, and the `serviceTick()` pacing loop. All three are page-only.

### Cited Findings
- `CFG.freeFood: 12` — [engine.js:12](origin/uiux-v2:engine.js#L12)
- `startRound()`: Day 1 adds the free food. `S.phase = round > 1 ? 'morning' : 'invest'`, so Day 1 has no morning step. The event is still drawn from the deck: `S.events[s] = {type: decks[s][round-1]}`, and the deck is 3 shady + 3 noshow + 4 quiet, shuffled — [engine.js:135, 155, 159, 162](origin/uiux-v2:engine.js#L155)
- After invest on Day 1, `apply()` goes straight to `commit` (no market) — [engine.js:434](origin/uiux-v2:engine.js#L434)
- On the page, `stepsFor()` drops Market from the progress bar on Day 1 (4 steps) — [app.js:449–450](origin/uiux-v2:app.js#L449)
- Day-1 page differences: gift screen; the Build CTA reads "Done · choose your ads →" and its money box says "Left for Ads"; the Build wait box says "Ads come next."; the top bar hides the logo on the gift screen; Day-1 closing waste copy — [app.js:509, 782, 791, 808, 818, 1206–1207](origin/uiux-v2:app.js#L782)
- `buildHTML` still shows the morning offer on Day 1 when the drawn event isn't quiet (`needChoice`) — [app.js:780–783](origin/uiux-v2:app.js#L780)
- `prepService()` has no round check: `if (r() < C.eventChance)` (0.6) picks food/fight/propose/weather-or-protest on any day, Day 1 included — [engine.js:182–193, 46–48](origin/uiux-v2:engine.js#L182)
- The earlier pacing report already lists "remove events on Day 1" as a team decision (b-class rule change in `prepService()`), with an alternative of page-only Day-1 hints (a-class) — [reports/Service 阶段节奏与信息设计.md:91, 104](reports/Service%20阶段节奏与信息设计.md)
- Hook points:
  - `svcState(s)` creates local per-day state `{started, idx, closed, ops, busy, waitAt, last, fast, msg, flip}`, keyed by code:seed:round:seat — [app.js:394–398](origin/uiux-v2:app.js#L394)
  - The `!sv.started` branch (card flips, then "Open the doors →" sets `sv.started = true`) — [app.js:1138–1162, 1448](origin/uiux-v2:app.js#L1138)
  - `serviceTick()` returns early while `!sv.started`. It moves one script step every 750 ms (120 ms on fast-forward), starts a `waitAt` patience clock on a shortage, and calls `closeShort` on timeout — [app.js:399–422](origin/uiux-v2:app.js#L399)
  - `liveSig()` includes `sv.started, idx, closed, ops.length, busy, msg, fast`. A tutorial step would need to be added to it, or the screen won't re-render — [app.js:290–294](origin/uiux-v2:app.js#L290)
  - `tick()` runs every 200 ms during service (`setTicker`) — [app.js:276–289](origin/uiux-v2:app.js#L276)
- Screens 13-service-ready / 13a-cards-flip show the flip interstitial. 13b shows "Doors open!", where the only call to action is Fast-forward.

### Inferences
- Pausing for a coach mark is safe and already has a pattern: while `!sv.started` nothing advances. A new flag (e.g. `sv.tut`) checked at the top of `serviceTick()` could freeze `idx`/`waitAt` the same way. The one caveat: `waitAt` is a wall-clock timestamp, so a pause in mid-shortage must shift `waitAt` (and `busy.until`), or the guests will "time out" during the pause.
- Day 1 already has the slowest start (no Market, free food), so the first service is predictably Day 1. But a Day-1 tutorial must cope with a random event (60%), possibly a booking, and rival trick cards, unless the team chooses to switch events off on Day 1 (a rule change; the team's call).
- The flip screen already teaches "how many guests vs tables/plates". It is the natural place for a "meet your restaurant" overlay before "Open the doors".

### Gaps
- The new service (staff, chef walking, rush minigame) is **not implemented** on uiux-v2, so no code hooks exist yet for it. `CFG.loc` still has `tables: 6` (Countryside) / `4` (City) at engine.js:7–8, not the decided fixed 20/16. Hook points above are for the current service; the new one will presumably keep `svcState`/`serviceTick`/the `!sv.started` interstitial pattern, but that isn't confirmed.

## Q3. Two-player constraints and deterministic replay

### Takeaway
Each player plays their service alone on their own device, at their own pace, with no shared clock. Only `{k, ops}` reaches the log at "Close for the day". Anything about timing, pausing, speed, coach marks or practice inside the service page is local and can't break replay, as long as the tutorial never adds, removes or alters entries in `ops` beyond the player's real choices. The cost of a slow tutorial is that the rival waits on "Closed for the night".

### Cited Findings
- `expected()` asks both seats for `${r}:service` at once. The phase only advances when both have logged — [engine.js:380–395](origin/uiux-v2:engine.js#L380)
- The page logs `act(s, {k, ops: svcState(s).ops})` on `svcdone`. Nothing else from service is written — [app.js:1450, 215–224](origin/uiux-v2:app.js#L1450)
- `serviceRun(S, s, ops, closed)`: with `closed = Infinity` (engine replay) the result depends only on `ops` and the seeded script. Timeouts and "Let them go" only change the local `sv.closed` — [engine.js:251–254, 279](origin/uiux-v2:engine.js#L251); `closeShort` [app.js:423](origin/uiux-v2:app.js#L423)
- `ops` are capped per episode at `maxOps = floor(patience/opTime)` = 4, and prices/borrow refusals come from `opPrice()`/`borrowOk()`, seeded per episode and try. A tutorial "free practice rush" pushed into `ops` would change money and the result — [engine.js:261, 272–277](origin/uiux-v2:engine.js#L261)
- The `prepService` script is rolled before anyone acts, so both browsers see the same script — [engine.js:180–181](origin/uiux-v2:engine.js#L180)
- A player who finishes first sees "Closed for the night · Your doors are closed." with the closed floor, a wait box ("The recap opens when they finish serving."), their star check and Cards tonight — [app.js:1131–1136](origin/uiux-v2:app.js#L1131). The rival's header status reads "still serving" / "closed for the day" (`themStatus`, [app.js:627–631](origin/uiux-v2:app.js#L627))
- During service the top bar shows your live cash, but the rival's cash only as of the end of their last day (`rivalCash`), so live service moves aren't leaked — [app.js:488–498](origin/uiux-v2:app.js#L488)
- The earlier pacing report reached the same conclusion: pause, slow-mo and long timers are a-class (no replay impact). The one coupling is that the page reads `CFG.service.patience/opTime` for its timers, and `maxOps` is derived from them. A UI timer change must therefore use its own display constants, not CFG — [reports/Service 阶段节奏与信息设计.md:77–87](reports/Service%20阶段节奏与信息设计.md)
- CLAUDE.md #1 and #10: the engine must not use time or `Math.random`, and both players must run the same engine.js — [CLAUDE.md](CLAUDE.md)

### Inferences
- A per-player tutorial is safe if it lives in page state (`svcState`, `app.*`, localStorage) and gates *when* the player can act, not *what* gets logged. Examples: coach marks, freezing the step clock, a sandbox practice of the rush minigame run on a throwaway local state.
- The new design brings in real-time chef movement and a rush minigame whose outcome (success/fail, steps) would have to become ops. If the minigame result feeds the engine, a "practice" minigame must not be logged. If the rush minigame can fail, its result must be recorded as an op field (e.g. `{ep, a:'rush', ok}`) or derived deterministically. That's a design decision outside onboarding, but the tutorial design depends on it.
- Asymmetry risk: if only first-timers get a long tutorial, an experienced rival waits longer on "Closed for the night". Options include a skippable tutorial, a time cap, or showing the waiting player what the rival is doing ("still serving · learning the ropes" would reveal tutorial use; may be fine).
- Practice mode runs both services at once (`controlled()` = both seats) on one screen. A blocking tutorial overlay in practice would show for whichever seat is viewed, while the other seat's clock keeps running unless the pause covers all controlled seats.
- A "first time" flag stored per device (localStorage) is the right scope online. In practice mode, two people may share one device, so a device flag would skip the tutorial for the second person.

### Gaps
- It isn't known whether the new design keeps a fixed per-episode patience or a real-time patience per guest. "Guests who wait too long leave unhappy" in the brief suggests per-guest timers. How those map to `ops` is not specified anywhere I found.

## Q4. New-service elements with no equivalent today (never taught)

### Takeaway
Almost everything spatial or action-based in v3 is new: the staff/no-staff table split, the player's chef avatar and its walking, leading guests from the door, the rush timing minigame at the station (and rush pausing while away), the courier needing a hand-carried plate, per-guest patience rings at the door, and coloured ad guests with a 5 s card popup. Only "table + plate per guest", rush food, delivery orders, ad-card guests and the star rule have conceptual ancestors, and even those are taught today as menu choices, not as actions.

### Cited Findings
**What v3 shows** (mockups, viewed):
- Top HUD: coin cash, stars, a day timer bar with a "BUS" marker on it, "DAY 2" (v3-country.png, v3-city.png)
- Countryside: 10 two-seat tables, 4 covered by bunny staff (green rug), 6 marked "no staff". City: 8 tables, 3 staffed (v3-country/city.png)
- Chef avatar with a "YOU" tag on a red carpet aisle, with a dashed path back to the door. Cat in blue (P1) / dog in pink (P2) (v3-country/city.png)
- Door queue on the street: guests with circular patience rings, one highlighted with a coloured ring; grey regulars vs blue/pink ad guests; a "…" walking-in group (v3-country/city.png)
- Kitchen: "6 plates ready" shelf, a stove, a cutting board tagged "RUSH", a dashed "your station (rush paused)" marker. "DELIVERY PICKUP" with a courier, a patience ring and a plate bubble (v3-country/city.png)
- Bottom-left popup: "Flyers · brought 2 guests" / "Office lunch deal · brought 3 guests" with a progress bar (v3-country/city.png)
- Rush panel: "RUSH 1 PLATE · step 2 of 3", a sliding marker over a bar with 3 green zones (one ticked), "Click the board in the green" (v3-rush.png)

**Today's equivalents** (what exists, and how it's taught):
- Tables: one homogeneous floor; Countryside 6 / City 4 tables to start, buy more in Build at $6. No staff concept — [engine.js:7–8](origin/uiux-v2:engine.js#L7); [app.js:770–819](origin/uiux-v2:app.js#L770)
- Seating is automatic: `serviceRun` seats `min(group, free tables, plates)` instantly. The player never moves guests — [engine.js:263, 283–287](origin/uiux-v2:engine.js#L263)
- Rush food: a button on the shortage card ("Rush 1 plate $X"), 2 s busy bar, keyboard R. No minigame and no location — [app.js:1187–1201, 432, 1465](origin/uiux-v2:app.js#L1187)
- Borrow a table: a button (B). **Not in the v3 brief**; with fixed tables it seems to go away (not confirmed) — [app.js:1190](origin/uiux-v2:app.js#L1190)
- Delivery: the `delivery` ad card (City only) adds `noTable` orders that use a plate, no table, and are auto-served. Taught only by the card text "They need food, but no table." — [engine.js:25, 229](origin/uiux-v2:engine.js#L25); [app.js:1106](origin/uiux-v2:app.js#L1106)
- Patience: one shared 8 s ring on the shortage decision card (`ring(sv.waitAt…)`), not per guest — [app.js:1196–1197](origin/uiux-v2:app.js#L1196); [engine.js:46](origin/uiux-v2:engine.js#L46)
- Ad guests: letter badges (`BADGE`, e.g. F = Flyers) on guests at the door, plus a "brought by …" legend line and a "Cards tonight" list. The rival's swamp guests are tagged "!" in the rival colour — [app.js:1008–1009, 1035, 1219, 1125–1130](origin/uiux-v2:app.js#L1008)
- Bottom legend: `legend2` line during service, and the old `keyHTML()` key (guest eating / free table / borrowed / 1 food). The brief says the bottom legend is removed in v3 — [app.js:1219, 648–653](origin/uiux-v2:app.js#L648)
- Bus: the `bus` ad card (50%, 6 guests); its result appears at the card flip ("🎲 THE BUS CAME! +6"). No timeline marker — [engine.js:29](origin/uiux-v2:engine.js#L29); [app.js:1100](origin/uiux-v2:app.js#L1100)
- The player colours exist (blue = you, pink = rival) on ad cards and in the header, but the chef avatars appear only in key art and the howto image, never in play (screenshot 02-how-to-play; [docs/uiux-v2-changes.md](origin/uiux-v2:docs/uiux-v2-changes.md) §1)

**Never taught anywhere today** (no code, copy or screen):
1. Staff (bunnies) and the fact that each covers 2 tables and auto-seats and serves
2. "no staff" tables need the chef: walk to the door, pick one guest, lead them, then serve them
3. Controlling and moving your chef; the "YOU" marker; which colour/animal is you
4. The rush minigame: go to the station, click when the marker is in the green, several steps
5. "Rush paused" while the chef is away from the station
6. The courier: the chef must carry a plate to Delivery Pickup
7. Per-guest patience rings and guests leaving from the queue in real time (today: one decision card)
8. The 5 s ad popup and coloured ad guests (today: letter badges + list)
9. The day timer bar with event markers (BUS) (today: no service clock; steps every 750 ms)
10. Fixed tables per location (20/16) replacing table-buying in Build. This also changes what Build teaches. The team's rule; not implemented yet.

### Inferences
- The old service was a "watch, then decide when something runs out" screen ("Nothing to do until something runs out"). The new one asks for continuous movement and juggling. So onboarding has to teach **verbs** (walk, lead, serve, rush, carry), not just rules. Today's onboarding pattern (copy + interstitial) has only ever taught rules and consequences.
- Elements 1–3 are needed from the first second of the first service. Elements 4–6 only come up when plates run short or a delivery exists, so they suit "teach at first occurrence" callouts (fitting P3/P4 and the existing "Each one is explained when it happens" promise in howto, app.js:615).
- The Day-1 free 12 plates mean a first-day rush may never trigger. If the rush minigame should be taught on Day 1, it needs either a sandbox practice before opening or a just-in-time callout on the first day it's needed.
- The howto drawer's Service text (app.js:605, 619 keys R/B/Esc) and `starCheck`/shortage copy will all be stale under the new design and need rewriting alongside any onboarding.

### Gaps
- No spec in the repo for how the chef is controlled (click destination? click the guest/table?), how many minigame steps, the green-zone width, or how staff coverage is chosen. The v3 mockups show "step 2 of 3", but the rules weren't found in code or docs. The team needs to supply these numbers; per CLAUDE.md, AI shouldn't invent them.
- Whether ad popups and coloured guests also appear for the rival's tricks on you (e.g. swamp) isn't shown in the mockups.
