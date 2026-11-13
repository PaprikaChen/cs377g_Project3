# Current implementation of the Service phase (branch `origin/uiux-v2`, head 23b35fd)

All line numbers refer to `git show origin/uiux-v2:<file>` (engine.js 527 lines, app.js 1471 lines, art.js 216, style.css 774). "Source" links below are repo paths with line numbers; screenshots are in `/tmp/claude-0/-home-user-cs377g-Project3/801b68b0-79ba-551f-a641-74f2bccf4900/scratchpad/uishots/` (taken by `tests/screens.py` at 1440x900, Practice mode).

## Q1. Engine: what prepService() scripts, how serviceRun() produces steps and pending decisions, CFG.service values; rule vs page-only timing

### Takeaway
All randomness for a day's service is rolled up front in `prepService()` into `S.script[seat]`; `serviceRun()` is a pure, synchronous replay that walks a fixed queue of guest *groups* (regulars first, then a mid-service event, then every other group in shuffled card order) and opens a "shortage episode" whenever a whole group cannot be seated. The engine knows nothing about seconds: patience and opTime only enter the rules through `maxOps = floor(patience/opTime) = 4` tries per episode.

### Cited Findings
- `CFG.service = { patience: 8, opTime: 2, rush: [7, 10], borrow: [5, 8], borrowNo: 0.3, villager: 0.15, villagerGive: 2, eventChance: 0.6, foodGood: 0.2, foodBad: 0.5, propose: 0.5, tip: 20, fightTables: 2, fightFood: 2, fewer: 3 }`, all marked TBD; comment says "A shortage pops up only when tables or food run out. One action at a time." and "patience: seconds the waiting group stays; opTime: seconds per rush food / table borrow" — [engine.js:41-48](engine.js#L41)
- Related: `CFG.loc` country 6 tables / $8 per meal, city 4 tables / $12 — [engine.js:6-9](engine.js#L6); `baseDemand: 6` — [engine.js:10](engine.js#L10); `emptyTables {share 0.5, chance 0.5}` — [engine.js:50](engine.js#L50); `voucher: 3` — [engine.js:53](engine.js#L53).
- Tour bus card: `bus: { side:'self', loc:'country', price: 8, n: 6, chance: 0.5, desc: '50%: a bus of 6 guests. Otherwise nobody' }` — [engine.js:29](engine.js#L29). Other group-making cards: flyer +2, coupon +3 (−$3 each), blogger 50% +4, subway +4 (30% only 2), lunch +3, delivery +2 (no table), stall +1 guest +1 food, wom +1 (and +1 every later day), swamp +3 (rival-played) — [engine.js:24-40](engine.js#L24).
- Prices are seeded per episode and per try: `opPrice(S, s, ep, i, a)` uses `rand(seed, \`${a}${round}${s}:${ep}:${i}\`)`; rush = 7–10 (+3 if `cornered`), borrow = 5–8 — [engine.js:99-103](engine.js#L99). `borrowOk()` = seeded roll ≥ 0.3 — [engine.js:104](engine.js#L104).
- `prepService(S, s)` [engine.js:182-249](engine.js#L182) builds `sc = { info, arrivals, mid, fewer, fakeHeld, cornered, stallFood, blogger, rolls:{food, blogger, empty, propose}, event, noshow?, inspection?, repGain, repLoss, base }`:
  - Event: with 60% chance one of `['food','fight','propose', city ? 'protest' : 'weather']` — [engine.js:189-193](engine.js#L189). weather/protest → `fewer = 3` regulars and an `info` line — [engine.js:207](engine.js#L207). food/fight/propose become `sc.mid` (happen "after the regulars are seated") — [engine.js:246-247](engine.js#L246).
  - Morning booking (`noshow`, d6 ≥ 4 arrives) and shady-deal inspection (d6 == 1 caught) are rolled and pushed to `info` — [engine.js:196-206](engine.js#L196).
  - Reputation: each star above 3 gives 2 d100 rolls (50% +1 guest each); each star below 3 gives 2 rolls (50% −1 regular each); every roll becomes an `info` entry — [engine.js:209-218](engine.js#L209).
  - Cards (own + rival-played on you) are shuffled with the seeded RNG; each becomes an `info` entry `{k:'card', id, from, n}` and, if it brings guests, a group `{n, price, src, noTable?}`. Bus: `f.n = r() < 0.5 ? 6 : 0; if (f.n) groups.push({ n: 6, price: L.price, src: 'bus' })` — [engine.js:220-240](engine.js#L220). Poach adds a 1-guest group `src:'poached'` — [engine.js:241](engine.js#L241).
  - Arrival order: `arrivals = [regulars(base), wom-old (if any), ...groups in shuffled card order]`, with `base = max(0, 6 + repGain − repLoss − fewer − minus)` — [engine.js:242-245](engine.js#L242).
- `serviceRun(S, s, ops = [], closed = Infinity)` [engine.js:254-312](engine.js#L254):
  - Start state: `tables = p.tables − held − fakeHeld`, `ingr = p.ingr + stallFood` — [engine.js:256](engine.js#L256).
  - Every pushed step carries a `snap` `{tables, usedT, ingr, served, turned, deliv}` for drawing — [engine.js:260](engine.js#L260).
  - `maxOps = Math.floor(C.patience / C.opTime)` (= 4) — [engine.js:261](engine.js#L261).
  - `arrive(g)`: if `can(g) = min(ingr, free tables or ∞ for delivery) < g.n` it opens episode `ep++` — the *whole group* is one episode. Countryside only: if food is short, a seeded 15% roll gives +2 villager food — [engine.js:266-271](engine.js#L266). Then it applies this episode's ops (`.slice(0, maxOps)`): rush = pay, +1 food; borrow = seeded refusal (counted, no charge) or pay, +1 table; an op that can't be afforded is silently skipped — [engine.js:272-277](engine.js#L272).
  - If `ep >= closed` it returns early with `pending = {kind:'short', ep, group, need, can, tries, maxOps, shortOn:['ingr'|'tables'...], villagers}` — [engine.js:278-279](engine.js#L278). Otherwise it pushes `{k:'short', ep, need, n, villagers?}`, seats `min(g.n, can)`, adds `seated*price` to sales, the rest to `turned`, and pushes `{k:'arrive', src, n, seated, away, noTable}` — [engine.js:280-286](engine.js#L280).
  - Step order: all `sc.info` entries first (cards, rep rolls, events, booking, inspection) → `arrive(regulars)` → mid event (food asks `pending:{kind:'food'}` when unanswered and `closed` is finite; fight breaks 2 tables + 2 food; propose 50% +$20 tip) → each remaining group → booking payout → `close` step — [engine.js:289-311](engine.js#L289).
- `finishService()` replays with `closed = Infinity`, `ops.slice(0, 200)`, posts ledger lines (rush, borrow, sales, tip, reservation, inspector fine, fight), and returns `ops: ops.length` — [engine.js:314-329](engine.js#L314). Star review afterwards: 0 turned away → +1, 1–3 unvouchered → −1, 4+ → −2, plus food/blogger/inspector/empty-table modifiers, clamped ±2 — [engine.js:331-366](engine.js#L331).
- Phase plumbing: `apply('reveal')` calls `prepService` for both seats and sets phase `service` — [engine.js:480-482](engine.js#L480); `expected()` waits on `${r}:service` from both — [engine.js:389](engine.js#L389); `apply('service')` → `finishService`, then `voucher` phase if anyone turned guests away and has ≥ $3, else `review` — [engine.js:484-489](engine.js#L484), [engine.js:390-391](engine.js#L390).

### Inferences
- The engine's "service" is discrete and turn-based: there is no notion of time, queue position, or partial-group seating while waiting. The page invents all pacing.
- Because the regulars group is 6±rep (one block) and each card is one block, the first shortage almost always happens on a large group at once; a bus (6) is a single 6-person episode.
- `info` steps (rep rolls, card results, events) are part of `out`, so they consume playback time before the first guest arrives (see Q2).

### Gaps
- No engine test of maxOps/patience semantics was read (tests/engine.test.js not inspected on this branch).

## Q2. Page: serviceTick timing, svcState, svcAction, closeShort, patience/busy, svcFloor layout, decision card, side panels, chips, Fast-forward, render/liveSig/updateBars, voucher and closing screens

### Takeaway
The page plays `v.out` one step every 750 ms (120 ms on Fast-forward), pauses when it reaches a `pending`, then runs an 8 s patience ring during which each Rush/Borrow is a 2 s "busy" action; the episode closes on success, timeout, 4 tries, or "Let them go". Rendering is a full `innerHTML` rebuild only when `liveSig()` changes; otherwise only bars/rings/countdowns move.

### Cited Findings
- Ticker: `setInterval(tick, 200)` while phase is market or service — [app.js:276-280](app.js#L276). `tick()` calls `serviceTick()` then re-renders only if `liveSig() !== app.sig`, else `updateBars()` — [app.js:282-289](app.js#L282).
- `liveSig()` for service = `[started, idx, closed, ops.length, !!busy, msg, fast]` per controlled seat + `S.waiting`, `S.submitted`, `app.view` — [app.js:293](app.js#L293). So every 750 ms step advance causes a full re-render.
- `updateBars()` moves every `[data-t0][data-t1]` element (width for bars, `--p` for `data-ring`, `hot` class when a drain bar is < 35%) and rewrites `[data-count]` seconds text — [app.js:296-305](app.js#L296). `ring()` and `pbar()` helpers — [app.js:648-649](app.js#L648).
- `svcState(s)` per seat/day: `{ key, started:false, idx:0, closed:0, ops:[], busy:null, waitAt:null, last:0, fast:false, msg:'', flip:0 }` — [app.js:394-398](app.js#L394).
- `serviceTick()` [app.js:399-422](app.js#L399): recompute `v = serviceRun(S, s, sv.ops, sv.closed)`; if `idx < out.length`, advance `idx` when `now − last >= (fast ? 120 : 750)` — [app.js:405-408](app.js#L405). At a `short` pending: set `waitAt`; when `busy.until` passes, push `{ep, a}` to `sv.ops` and set msg "The neighbour said no." / "Got a table!" / "Food delivered!" — [app.js:411-417](app.js#L411); close the episode if resolved (`can >= need`), `timeUp` (8 000 ms since `waitAt`), or tries exhausted — [app.js:418-420](app.js#L418).
- `closeShort(sv, msg)` increments `closed`, clears `waitAt`/`busy` (an in-flight op is dropped, not charged) — [app.js:423](app.js#L423).
- `svcAction(s, a)`: food → push `{a:'food', give}`; `letgo` → `closeShort`; rush/borrow → refused if busy or tries used up, toast "Not enough cash." if unaffordable, else `busy = {a, start, until: now + 2000}` — [app.js:424-434](app.js#L424).
- Live cash in header during service = `serviceRun(...).cash` — [app.js:491](app.js#L491).
- Pre-service card flip: auto-advance one card every 1 700 ms (first 800 ms) via `setTimeout` — [app.js:1148](app.js#L1148); screen shows each card with a stamp (`flipStamp`, e.g. bus "🎲 THE BUS CAME! +6" / "🎲 NO BUS") — [app.js:1097-1113](app.js#L1097), a running equation "Tonight so far: 7 + 1 − 2 = 6 guests", "You can serve N of them right now: T tables and P plates." and an "Open the doors →" button (`data-act=play` sets `started`) — [app.js:1139-1159](app.js#L1139), [app.js:1448](app.js#L1448). Screenshot 13-service-ready, 13a-cards-flip.
- Layout: `shell(main, side, cta)` = two-column grid `minmax(0,1fr) 448px` (360px under 1100px; one column under 900px) — [app.js:719](app.js#L719), [style.css:655-657](style.css#L655). `fhead(h, sub, right)` puts the chips on the right of the title — [app.js:718](app.js#L718).
- Chips: `counters()` → `+$X tonight` (sum seated × group price), `Seated N`, `Left unhappy N` (red when > 0) — [app.js:1117-1123](app.js#L1117), [style.css:740-741](style.css#L740).
- `svcFloor()` [app.js:1011-1040](app.js#L1011) → `ART.room()` [art.js:154-210](art.js#L154): SVG 640×334 with DOOR column (96 px), table grid (4 or 5 columns; table kinds seat/free/booked/fake/broken/bseat/bfree), KITCHEN column (plates drawn as circles up to 16, "N plates left", red "0 plates" box, "+1 on its way" while rushing). During a shortage each waiting guest gets a crossed-out bubble 🍽 or 🪑; the plate check is done first, so a guest missing both shows only 🍽 — [app.js:1025-1028](app.js#L1025). Before a group arrives the door shows its people with letter badges (T = tour bus) — [app.js:1032](app.js#L1032), [app.js:1010](app.js#L1010). Door shows max 8 people (4 rows × 2) + "+N more" — [art.js:167-176](art.js#L167).
- Running screen ("Doors open!"): subtitle rule "Every guest needs 1 table + 1 plate. Each meal pays $X."; legend line "Next in line: N guests, room for T tables and P plates." (+ badge legend); banner 🛎️ with the last step's `logLine()` or "All good so far. Nothing to do until something runs out."; Fast-forward / Normal speed button; side = Star check ("right now") + "Cards tonight" — [app.js:1210-1221](app.js#L1210). `logLine()` returns null for `card`, `rep`, `lose`, `poached` steps, so the banner shows the default text during those — [app.js:1066-1081](app.js#L1066).
- Shortage screen [app.js:1176-1200](app.js#L1176): title "Out of plates!" / "Out of tables!" / "Out of plates and tables!"; subtitle "N guests at the door can't be served. The bubbles show what each one is missing."; `decide2` card (role=alertdialog, red border `hot` when ≤ 1 try left) with a 46 px drain ring + "Ns" countdown, "They'll wait a few more seconds. What do you do?", a status line ("Food on its way…"/"Asking next door…" + progress bar, or last msg), optional villager line, and up to three buttons: Rush 1 plate $p ("+1 guest eats (+$meal) · you make/lose $x, but one fewer unhappy"), Borrow a table $p ("Only helps the guest who needs a seat · neighbour may say no"), Let them go $0 ("N guests leave unhappy → star check drops to −1 ★"), with kbd hints R / B / Esc — keys bound at [app.js:1463-1465](app.js#L1463). While busy, Rush/Borrow buttons are removed (`acts = b ? '' : ...`) — [app.js:1186](app.js#L1186). Side: `starCheck(tierAfter, 'if you let them go: …')` + "Why this happened" ("You opened with X plates and Y tables. <cards> brought N extra guests.") — [app.js:1190-1199](app.js#L1190).
- Star check panel: header "STAR CHECK AT CLOSING" + note, three tiers (0 → +1★, 1–3 → −1★, 4+ → −2★) with the active one outlined, footnote on the empty-table 50% rule — [app.js:1083-1089](app.js#L1083).
- Food-request screen: "A villager is hungry" / "Someone is hungry"; "Give 1 plate" (🎲 20% +1★) vs "Say no" (🎲 50% −1★); side "Think about: N paying guests are still expected tonight and you have P plates." No timer — [app.js:1164-1174](app.js#L1164). Screenshot 15.
- Closing screen: "Closing time" with leftovers → bin graphic and callout (day 1: "X of your 12 free plates went to waste"), side Star check + "Empty tables check", CTA "Close for the day →" / "See how day N went →" (`svcdone` logs the action) — [app.js:1202-1209](app.js#L1202), [app.js:1450](app.js#L1450). After logging, a "Closed for the night" wait view shows until the rival finishes — [app.js:1133-1137](app.js#L1133).
- Voucher screen (separate phase): faces 😞/😊 per turned-away guest (max 12 shown), $3 each, live star-result table, "Don't send any" / "Send N vouchers" — [app.js:1226-1251](app.js#L1226).

### Inferences
- With 750 ms per step and all `info` entries (rep rolls, every card, events) played before the regulars arrive, a day with e.g. 3 cards and 2 rep rolls spends ~3.75 s on steps that mostly show the default banner text before any guest moves.
- The opTime progress bar may be invisible: `pbar()` emits `<span class="prog">`, but the only `.prog` style is scoped to `.decide .prog` [style.css:405](style.css#L405) while the card uses class `decide2`. Not verified visually (no screenshot of a busy state).
- In screenshot 14 (city, 2 plates, 4 tables, group of 5) all three bubbles show 🍽 and Borrow is still offered, although borrowing a table alone cannot seat anyone while plates are 0 — a clarity issue from the plate-first bubble rule.

### Gaps
- No screenshot of the busy (op in progress) state, the "neighbour said no" message, or a timeout message.

## Q3. What is logged; what pacing changes would or would not affect replay determinism

### Takeaway
The seat log gets exactly one service action `{k: "<day>:service", ops: [...]}` where `ops` is the list of `{ep, a:'rush'|'borrow'}` tries and `{a:'food', give}`. Nothing about time, `closed`, Let-go, timeouts or speed is logged; replay uses `closed = Infinity`.

### Cited Findings
- `case 'svcdone': return act(s, { k, ops: svcState(s).ops })` — [app.js:1450](app.js#L1450).
- `finishService` → `serviceRun(S, s, ops.slice(0, 200))` with default `closed = Infinity` — [engine.js:316](engine.js#L316); per-episode ops are capped at `maxOps` derived from `CFG.service.patience / opTime` — [engine.js:261](engine.js#L261), [engine.js:272](engine.js#L272).
- A "Let them go" or timeout only increments local `sv.closed`; the episode's outcome in replay is whatever its logged ops produce — [app.js:423](app.js#L423), [app.js:428](app.js#L428).

### Inferences
- Safe (page-only, no replay effect): step interval 750/120 ms, flip timings 1 700/800 ms, the patience countdown's on-screen length, the busy duration shown, adding animations, pre-warning UI, pausing, splitting a group visually, reordering what is displayed.
- Replay-affecting (engine): changing `CFG.service.patience` or `opTime` (changes `maxOps`), price/chance values, arrival order or group sizes in `prepService`, seating partial groups before the decision, or adding new random rolls — all recompute games in progress (CLAUDE.md §10).
- To change the real-time patience/opTime without touching rules, the page would need its own constants (it currently reads `CFG.service.patience`/`opTime` at [app.js:419](app.js#L419), [app.js:432](app.js#L432), [app.js:1197](app.js#L1197)), or `maxOps` would need to become its own CFG value.

### Gaps
- None for this question.

## Q4. Everything on screen at once during a shortage decision (info density)

### Takeaway
Counting from screenshot 14-service-shortage and the code, a shortage screen shows roughly 45–55 distinct pieces of information in about 9 regions, with only 3 actionable buttons.

### Cited Findings (screenshot 14-service-shortage-light.png + [app.js:1176-1200](app.js#L1176), [app.js:505-530](app.js#L505))
1. Header bar: logo; "DAY 2 OF 5"; phase name "Service"; 5-segment progress bar with labels Build/Market/Ads/Service/Recap; your name, live cash, 5-star row; rival name, rival cash (end of last day), rival stars, rival status "still serving"; mode/room tag; Player 1/Player 2 switch (Practice); theme; help "?"; Quit (≈ 15 items).
2. Practice banner "Playing as Player 1 · switch players…" (Practice mode only).
3. Title "Out of plates and tables!" + subtitle sentence.
4. Three chips: +$X tonight, Seated N, Left unhappy N.
5. Floor SVG: DOOR label + N waiting guests each with a need bubble; table grid with each table's state (free/seated/booked/fake/broken/borrowed); KITCHEN label, plate icons, "N plates left" / "0 plates", optional "+1 on its way".
6. Decision card: countdown ring + "Ns" number; question; status line + progress bar or last message; villager message (optional).
7. Up to three option buttons, each with label, price, one-line consequence, kbd hint (R/B/Esc) — about 12 text items; Rush text includes a profit calculation and optional "+$3, sabotaged".
8. Side panel "Star check at closing": header, conditional note "if you let them go: −1 ★", three tiers with values, empty-table footnote (≈ 8 items).
9. Side panel "Why this happened": opening plates/tables + which cards added how many guests.

### Inferences
- Three separate places express star consequences at the same moment (Let-go button text, Star check header note, highlighted tier), and money appears in four (header cash, +$ chip, button prices, Rush profit line). The decision has an 8 s clock.

### Gaps
- Mobile layout (< 900 px stacks the side panels below the floor) was not screenshotted, so whether the decision card and timer are above the fold on phones is unknown.

## Q5. Where the tour bus / big groups appear and how much warning the player gets

### Takeaway
The bus is known before doors open (flip stamp "THE BUS CAME! +6", guest equation), but in service it is just one group in a shuffled queue after the regulars; it shows at the door as 6 people with "T" badges and a "Next in line" line for exactly one step (750 ms, 120 ms on Fast-forward) before it arrives and, if short, triggers an 8 s decision.

### Cited Findings
- Bus is rolled in `prepService` and placed in `groups` in shuffled card order after `regulars` and `wom-old` — [engine.js:220-245](engine.js#L220); it is played after the mid event — [engine.js:306](engine.js#L306).
- Pre-service warning: flip stamp `🎲 THE BUS CAME! +6` / "Coin flip won. 6 more guests at your door." — [app.js:1100](app.js#L1100); "Tonight so far" equation and "You can serve N of them right now" — [app.js:1155-1158](app.js#L1155).
- In-service warning: `nextArr` = next `arrive` step after `idx`; door shows its people with badge letters and legend "T brought by tour bus guests", plus "Next in line: 6 guests, room for T tables and P plates." — [app.js:1211-1220](app.js#L1211). This shows while the steps in between (the group's own `short` step is only pushed after the episode closes) play at 750 ms each.
- The whole group of 6 is a single episode; with 4 tries max, a player can add at most 4 plates/tables, so a 6-bus with 2 free seats cannot be fully seated by actions — [engine.js:261-277](engine.js#L261).
- During service, the "Cards tonight" side panel lists "Tour bus stop: The bus came! 6 guests." only after its card step has played — [app.js:1124-1131](app.js#L1124), [app.js:1043](app.js#L1043).

### Inferences
- The countryside starts with 6 tables and regulars ≈ 6, so a bus arriving after the regulars will almost always cause a shortage episode; the effective in-service warning is under one second.

### Gaps
- No screenshot shows the bus at the door (screens use city or no-bus seeds).

## Q6. Existing animation on the service screens

### Takeaway
Service has almost no motion: everything is step-wise re-rendering; the only time-driven visuals are the patience ring/countdown and (intended) busy bar updated by `updateBars()`.

### Cited Findings
- Patience ring: conic-gradient `.ringp` driven by CSS var `--p` from `updateBars()` (no CSS transition; updates at 200 ms ticks); `.ringp.hot` red when < 35% left — [style.css:321-324](style.css#L321), [app.js:299-301](app.js#L299).
- `+$` over paid tables in the room SVG is static text `.room2 .pop` with no animation — [style.css:687](style.css#L687), [art.js:194](art.js#L194). The animated `pop` keyframes exist only for the older `.floor .paypop` — [style.css:442-444](style.css#L442).
- Other keyframes in the stylesheet (`pulse` for wait dots, `spin`, `fade`/`slide` for drawer, `shake`) are not used by the service screens — [style.css:131-133](style.css#L131), [style.css:170-171](style.css#L170), [style.css:229-232](style.css#L229), [style.css:349-350](style.css#L349). `.floor .tbl` opacity transition belongs to the old floor — [style.css:183](style.css#L183).
- Card flip screen uses a `setTimeout` reveal (1 700 ms) with stamps, not CSS animation — [app.js:1148](app.js#L1148).

### Inferences
- Because each step replaces the DOM via `innerHTML`, CSS transitions on the room SVG would not run between steps (new elements); entry animations (keyframes on mount) would work, as `.floor .paypop` already did.

### Gaps
- Did not verify reduced-motion handling beyond the existing `prefers-reduced-motion` guards for pulse, overlay and paypop.
