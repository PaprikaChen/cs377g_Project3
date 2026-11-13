# Service prototype: mechanics, observed Day 1 / Day 3 timelines, and tutorial hook points

Scope: code + simulation study of `prototypes/service-feel/index.html` (660 lines, read in full), compared against the earlier report `reports/Service 阶段新手引导设计.md` and its notes in `research_notes/Service 阶段新手引导设计/`. No web sources. Source links:
- `HTML:N` = [prototypes/service-feel/index.html](../../prototypes/service-feel/index.html), line N.
- `REPORT` = [reports/Service 阶段新手引导设计.md](../../reports/Service%20阶段新手引导设计.md).
- `SIM` = headless runs I made (Playwright + Chromium, file:// URL, prototype unmodified). Scripts: `/tmp/claude-0/-home-user-cs377g-Project3/801b68b0-79ba-551f-a641-74f2bccf4900/scratchpad/sim.py`, `batch.py`, `batch3.py`, `agg.py`; raw results `batch.json` (Day 1) and `batch3.json` (Day 3) in the same folder. The scratchpad may be cleared, so the numbers that matter are copied below.

SIM method: an init script replaced `Math.random` with a seeded PRNG (seeds 1–30), and replaced `requestAnimationFrame`/`performance.now` with a manual stepper. Each step is 50 ms, which equals the prototype's own per-frame dt cap (`HTML:606`), at speed 1×. All default tuning values were kept. For every combination of {Day 1, Day 3} × {Countryside, City} × {no input, simple bot}, I ran 30 seeds. That is 240 runs, with no page errors. The "simple bot" keeps at most 2 chef jobs in the queue. Its priority order is: rush when plates = 0 and someone is waiting; serve a no-staff-table guest; deliver to a waiting courier; seat a door guest who has waited more than 1.5 s unclaimed. It hits the rush green zone with a ±0.01 margin. It is a weak, cautious player, not an optimal one. Times below are seconds of game time from "Open the doors", given as min / median / max over the 30 seeds unless stated otherwise. One instrumentation note: ad guests are spawned via `setTimeout(...,0)` (`HTML:578`), so the Day 3 runs yield to the event loop after each step (otherwise ad guests never appear in a synchronous loop).

## 1. Mechanics, state machines and default numbers

### Takeaway
The prototype is a self-contained, dt-driven simulation. Every timer (clock, patience, eating, rush marker, popup, toast, bus) advances only inside `update(dt)`, and `update` only runs from `frame()` while `S.open && !S.ended && speed > 0`. That makes a tutorial "freeze" trivial: one gate in `frame()`. Guests flow arrive → queue → led → wait → eat → out. Bunnies auto-seat and auto-serve, but only on their own section's tables. The chef is a single agent with a job queue (1 current + up to 3 queued). Rush is one click in one green zone. Plates are the binding constraint: 8 plates against 14 walk-ins.

### Cited Findings
**Defaults (tuning drawer, `HTML:101–115`).** Defaults are dayLen 120 s; walk-in guests 14; staff "auto" (−1); plates at opening 8; chef speed 160 px/s; staff speed 130 px/s; door patience `qPat` 22 s; patience waiting for a plate `sPat` 25 s; courier patience `cPat` 35 s; eating 12 s; rush marker 0.7 sweeps/s; green zone 11 %; rush cost $8. Changes apply only on Restart (`HTML:94`).
- Auto staff is 4 bunnies in Countryside and 3 in City (`HTML:194`). Countryside has 5 columns × 2 rows = 10 sections and 20 tables. City has 4 × 2 = 8 sections and 16 tables (`HTML:193`). Each section has 2 tables (`HTML:227–230`). Sections with index < nStaff are staffed: the first sections of the top row (`HTML:218–220`). So Countryside has 8 staffed and 12 "no staff" tables, City has 6 staffed and 10 "no staff", and the whole bottom row is always no-staff.
- The guest price is $8 in Countryside and $12 in City (`HTML:394`). Rush costs $8 (`HTML:114`, applied at `HTML:388`). [Observation only, not a recommendation: in Countryside a rushed plate costs exactly what the guest pays.]

**Schedule (`newDay`, `HTML:270–297`).** Walk-ins are spawned at `t = dl·0.04 + dl·0.8·((rand+rand+2i/N)/4)` (`HTML:278`), using `Math.random`, so the timing differs on every Restart.
- Day 3 Countryside adds `ad` "Flyers" × 2 at 0.3·dl = 36 s and a `bus` with 6 guests at 0.6·dl = 72 s (`HTML:280–282`).
- Day 3 City adds `courier` "Delivery app spotlight" at 0.22·dl = 26.4 s, `ad` "Office lunch deal" × 3 at 0.32·dl = 38.4 s, and a second `courier` with no card at 0.62·dl = 74.4 s (`HTML:284–286`).
- Only the BUS gets a marker on the clock track (`HTML:291–293`). Ads and couriers have no timeline marker.

**Guest state machine (`guestUpdate`, `HTML:441–460`; `seat` `HTML:397–401`; `leave` `HTML:403–410`).**
- `arrive`: the guest walks at 90 px/s to a queue slot outside the door. Slots are 3 per row (`HTML:268`). On reaching the slot the guest becomes `queue` and patience is set to `qPat` (`HTML:442–446`).
- `queue`: patience only counts down while the guest is unclaimed (`!g.claimed`). At 0 the guest leaves angry (`HTML:447`). A patience ring is drawn only while queued and unclaimed (`HTML:491`).
- `led`: the guest follows the leader, either the chef or a bunny (`HTML:448–450`).
- `wait`: the guest is seated and patience is set to `sPat` (`HTML:398`). Patience counts down only while no server is assigned. At 0 the guest leaves angry (`HTML:452`). A clickable plate bubble with a colour ring is drawn (`HTML:492–495`).
- `eat`: lasts `eat` = 12 s. At the end the restaurant gets +$price, served++, a "+$" float, and the guest leaves happy (`HTML:453–455`).
- `out`: the guest walks away at 110 px/s and is removed (`HTML:456–458`). An angry exit increments `S.unhappy` and draws an X face (`HTML:406`, `HTML:156`).
- Ad guests are drawn in the player colour `MC()`; other guests are grey `#B8A99A` (`HTML:485`). In this prototype `MC()` depends on location (Countryside blue, City pink), not on seat (`HTML:137`). Bus guests are ordinary grey guests (`HTML:585`).

**Staff (bunny) logic (`staffUpdate`, `HTML:411–440`).** When idle, a bunny checks in this order:
1. Serve a waiting guest in its own section, but only `if S.plates > 0` (`HTML:415–416`).
2. Seat an unclaimed queue guest, but only into a free table in its own section (`HTML:417–419`).
3. Otherwise walk home to the rug (`HTML:420`).

Bunnies fetch plates at the pass, `PASS` (`HTML:133`, `HTML:433`). If plates hit 0, they silently drop the serve task (`HTML:432`). Bunnies never seat at no-staff tables and never serve couriers.

**Chef action queue (`enqueue` `HTML:317–325`, `startAction` `HTML:326–345`, `done` `HTML:346`, `chefUpdate` `HTML:347–374`).**
- Job types are `seat`, `serve`, `rush` and `deliver`. Duplicate jobs are ignored (`HTML:319–320`). There is 1 current job plus up to 3 queued, so 4 in total. A fifth gives the toast "You already have 3 jobs lined up" (`HTML:323–324`). Numbered badges in the player colour mark each job's target (`badgeFor`, `HTML:475–479`), and a badge also appears on the stove for a queued rush (`HTML:545–546`).
- `seat`: the chef walks to `DOOR_IN`, then leads the guest to the table's stand. The table is picked automatically, a free no-staff table first and otherwise any free table (`HTML:331`). The player never chooses a table. If no table is free, the toast reads "No free table right now" (`HTML:332`).
- `serve` / `deliver`: the chef walks to `PICK` at the kitchen counter and takes a plate. If there are none, the toast reads "No plates left. Click the stove to rush one." and the job is dropped (`HTML:361`). The chef then carries the plate to the table or to `DROP`. A courier pays price and counts as served (`HTML:367`).
- Clicking a target is rejected in some states: an `arrive` guest gives "Wait until they reach the door"; a guest a bunny has claimed gives "A bunny is already on it"; a guest a bunny is already serving gives "A bunny is already bringing a plate" (`HTML:638–639`).

**Rush (`newRush` `HTML:375–379`, `marker` `HTML:380`, `rushTry` `HTML:381–393`, panel `HTML:530–538`).**
- The zone count is `n = 1`, and the single zone of width 11 % is placed at random in about [0.04, 0.85] (`HTML:376–377`).
- The marker ping-pongs at 0.7 sweeps/s, so one pass takes about 1.43 s and a full cycle about 2.86 s. The marker clock `S.mTime` only advances while the chef is at the stove with the rush active (`HTML:574`).
- Clicking the stove or pressing Space (`HTML:631–633`, `HTML:644–646`) inside the zone gives +1 plate, −$8, and the float "+1 plate −$8"; the chef's next job then starts (`HTML:387–390`). A miss only flashes "Missed. Try again" for 0.35 s, with no cost and unlimited retries (`HTML:391`, `HTML:538`).
- The panel reads "RUSH 1 PLATE · $8", "one click" and "Click the stove (or Space) in the green" (`HTML:533`, `HTML:538`). A "RUSH" tag is drawn permanently on the stove (`HTML:242`).
- **Interrupt:** enqueuing any non-rush job while the current job is a rush sets `ch.cur = null`. The rush job is dropped, not paused or re-queued (`HTML:321`). `ch.rush` keeps its zone, so a later stove click reuses it.
- **The "rush paused N/M" label (`HTML:539–540`) can no longer appear.** It requires `r.step > 0`. With one zone, `step` goes from 0 straight to completion, at which point `ch.rush = null` (`HTML:387–389`).

**Courier (`spawnCourier` `HTML:306–311`, `courierUpdate` `HTML:461–465`).** The courier enters from the right edge (state `in`) to the delivery pickup, then waits with a 35 s ring and a clickable plate box (`HTML:520`). Only the chef can serve a courier. On timeout: unhappy+1 (`HTML:463`). A courier with a card name triggers popup(card, "sends delivery orders") (`HTML:310`).

**Ad popup (`popup` `HTML:312–314`, drawn at `HTML:548–554`, timer at `HTML:598`).** Each popup lives 5 s (`t: 5`). Opacity is `min(1, t/1.5, (5−t)/0.25)`: a 0.25 s fade-in, solid, then a 1.5 s fade-out. There is no progress bar. Only `S.popups[0]` is shown, so popups queue rather than stack. The ad event spawns n guests in the same tick and shows popup(card, "brought n guests") (`HTML:578`).

**Tour bus (`HTML:579`, `HTML:582–587`, drawn at `HTML:556–559`).** The bus drives in at 220 px/s from x = −200 to 14, which takes about 1 s. It drops one grey guest every 0.45 s until all 6 are out, waits 6 s, then drives away.

**Closing / summary (`HTML:588–591`, `HTML:601`, `showEnd` `HTML:620–624`).** At t ≥ dayLen the restaurant closes, the schedule is cleared, and unclaimed `arrive`/`queue` guests leave *not* angry. Seated guests keep waiting or eating, and can still leave angry after close. The day ends when no guest or courier remains. The summary card shows guests served, left unhappy, plates left over and cash, plus a "Play this day again" button.

**Loop and existing text.** `frame()` (`HTML:605–610`) runs `update(real)` once per speed unit (Pause = 0, 1×, 2×). `render()` runs every frame even when paused (`HTML:608`). The click handler only checks `S.open && !S.ended` (`HTML:628`), so clicks are accepted and enqueued while paused. The pre-open card `showStart` (`HTML:614–619`) already contains instructions: "Bunnies seat and serve… Tables with no staff are yours…". On Day 1 it adds "Day 1 has no ads and no events. Just you, the bunnies and the door." A permanent help paragraph sits under the stage (`HTML:89`). Its wording "clicking something new while cooking pauses the rush" no longer matches the cancel behaviour at `HTML:321`.

### Inferences
- Freezing for a tutorial needs no clock bookkeeping in the prototype, unlike the live app, where the earlier report warns about wall-clock `waitAt`/`tbar` timestamps (REPORT §"引导只能活在页面里"). A `tutFreeze` flag next to `speed > 0` at `HTML:607` stops everything while `render()` keeps drawing spotlights.
- Because clicks are accepted while frozen (`HTML:628`), a "freeze until the player does X" beat should release on *enqueue* (a hook in `enqueue`, `HTML:317`), not on completion. The chef cannot walk while frozen.
- The rush cannot be practised while frozen, because `S.mTime` advances only inside `update`. The rush beat therefore needs time to run, either normally or through a slowed `mSpeed`.

### Gaps
- The mapping from prototype actions to the real game's `ops` log (for deterministic replay) is not defined anywhere in the prototype. It is out of scope here, but it still blocks a production tutorial.

## 2. Observed timelines (SIM, 30 seeds each, default tuning)

### Takeaway
Day 1 has about 20 s of empty room at the start. The first guest reaches the door at a median of about 24 s, and a bunny seats that guest within about 1 s in **100 %** of runs. Bunnies alone absorb almost all door traffic. In Countryside, no guest ever left from the door queue without input. The real Day 1 pressure point is plates: the 8 plates run out at a median of about 71 s in every run, and from then on every remaining guest leaves unhappy from their seat. With no input, unhappy = 14 − 8 = **6 in every Day 1 run**. On Day 3, the ad popup (36 s Countryside / 38.4 s City) and the first courier (26.4 s, City) arrive in the quiet-to-busy transition. The Countryside bus at 72 s lands right on the plates-out / first-rush moment.

### Cited Findings
**Day 1 — no input** (SIM `batch.json`, keys `1-country-bot0`, `1-city-bot0`)

| Moment | Countryside (4 bunnies) | City (3 bunnies) |
|---|---|---|
| first walk-in spawns (schedule) | 6.6 / 20.6 / 30.0 | 7.2 / 19.4 / 31.1 |
| first guest reaches the door (`arrive→queue`) | 10.3 / 24.4 / 33.7 | 10.9 / 23.0 / 34.7 |
| first guest led away — always by a bunny | 11.4 / 25.5 / 34.8 (30/30 runs) | 12.2 / 24.3 / 36.0 (30/30) |
| first guest starts eating | 27.2 / 41.2 / 50.6 | 27.9 / 39.9 / 51.6 |
| first door guest left unclaimed > 1 s (all bunny tables busy; a "chef could help" moment) | 36.7 / 49.2 / 75.1 (29/30 runs) | 25.1 / 47.1 / 63.2 (30/30) |
| 3+ unclaimed guests at the door | 43.5 / 61.6 / 74.4 (20/30) | 39.4 / 58.6 / 74.5 (29/30) |
| plates hit 0 | 64.3 / 71.3 / 77.9 (30/30) | 68.8 / 78.0 / 89.7 (30/30) |
| first seated guest waiting with 0 plates (first moment a rush is needed) | 66.8 / 73.1 / 79.3 | 73.7 / 80.8 / 90.8 |
| first guest leaves unhappy | 91.7 / 97.9 / 104.3 | 67.5 / 103.3 / 110.2 |
| end: served / unhappy / cash | 8 / 6 / $64 in all 30 | 8 / 6 / $96 in all 30 |
| unhappy by source (mean) | door 0.00, seat 6.00 | door 0.57 (max 4), seat 5.43 |
| peak door queue length (median, max) | 4, 6 | 5.5, 8 |

- Sample Countryside seed 1: first spawn 19.9 s. Door 23.6 s, bunny leads 24.7 s, eating 40.5 s. Door backlog 49.1 s, plates 0 at 74.5 s, first unhappy 100.9 s, then +1 at 103.9, 105.8, 111.6, 111.9 and 117.6 s. Close at 120 s with 8 served and 6 unhappy (SIM `sim.py 1 country 0 1`).
- Bunny service is slow even though seating is fast. From door to eating takes about 16 s: lead, walk to the pass, walk back (median 24.4 → 41.2 s).

**Day 1 — simple bot** (`1-country-bot1`, `1-city-bot1`)

| Moment | Countryside | City |
|---|---|---|
| bot first clicks a door guest | 37.2 / 50.5 / 75.6 | 25.6 / 47.6 / 63.7 |
| chef leads first guest (walks there from the stove) | 43.2 / 56.6 / 81.7 | 31.7 / 53.7 / 69.8 |
| first guest seated at a no-staff table | 48.2 / 61.6 / 86.7 | 36.5 / 58.5 / 74.6 |
| bot first clicks the stove (rush) | 66.0 / 72.8 / 87.5 | 64.9 / 76.6 / 91.3 |
| first rush plate made | 69.4 / 79.9 / 94.7 | 74.1 / 87.5 / 97.2 |
| end: served (median) / unhappy (mean, max) / cash (median) | 14 / 0.3, 4 / $64 | 13.5 / 0.9, 4 / $118 |

- A full manual seat takes about 11 s: click → chef reaches the door ≈ 6 s → guest seated ≈ 5 s (medians above).
- The rush (click to plate) took a median of about 7 s for the bot (chef walk plus waiting for the marker). The bot is deliberately cautious, so a human may be faster.

**Day 3 — no input** (`batch3.json`, `3-country-bot0`, `3-city-bot0`)

| Moment | Countryside (Flyers ×2, bus ×6) | City (courier ×2, Office lunch ×3) |
|---|---|---|
| first guest reaches door | 10.9 / 23.0 / 34.7 | 9.9 / 25.4 / 37.2 |
| courier #1 + popup "Delivery app spotlight / sends delivery orders" | — | 26.4 (fixed); waiting at pickup 27.3 |
| ad popup | 36.0 "Flyers / brought 2 guests" | 38.4 "Office lunch deal / brought 3 guests" |
| first ad guest reaches the door | 39.4 / 39.7 / 39.8 | 41.5 / 42.0 / 42.2 |
| first ad guest seated (no input → by a bunny) | 42.2 / 45.0 / 55.5 | 46.0 / 53.6 / 62.5 |
| door backlog > 1 s | 35.0 / 42.3 / 53.6 | 34.4 / 43.0 / 51.0 |
| 3+ unclaimed at the door | 39.4 / 53.0 / 78.2 | 41.3 / 42.4 / 53.7 |
| courier #1 leaves unhappy (never served) | — | 62.2 (30/30) |
| plates hit 0 | 62.8 / 68.8 / 73.4 | 68.9 / 76.9 / 87.5 |
| first rush needed | 63.4 / 70.0 / 76.0 | 72.9 / 79.4 / 88.2 |
| tour bus on screen (BUS marker) | 72.0 (fixed) | — |
| courier #2 (no popup) | — | 74.4 spawn; leaves unhappy at about 110 |
| first guest leaves unhappy | 67.8 / 94.5 / 99.9 | 63.4 / 69.9 / 102.1 (often courier #1) |
| end: served / unhappy | 8 / 14 (all runs) | 8 / 11 (all runs) |
| unhappy by source (mean) | door 2.9, seat 11.1 | door 3.2, seat 5.8, courier 2.0 |
| peak door queue (median, max) | 8, 10 | 8, 10 |

- One ad guest left unhappy in 1/30 Countryside runs and 6/30 City runs.

**Day 3 — simple bot** (`3-country-bot1`, `3-city-bot1`): the bot delivered to courier #1 at 27.3 s (chef heading there), and it was served at 30.8 s. The bot's end results were: Countryside served 13, unhappy mean 9.4, cash $64 (median); City served 10.5, unhappy mean 8.2, cash $104 (median).

### Inferences
- On Day 1 the chef's door work is *optional* for throughput, because bunnies eventually seat everyone in Countryside. Plates are the only thing that hurts. A Day 1 player who ignores the door but rushes plates loses almost nothing.
- The Day 1 natural order is: about 20 s of nothing → watch bunnies (about 24 s) → optional door backlog (about 49 s) → plates out / rush (about 71–78 s) → losses visible (about 98 s). That fits a "watch auto → do manual → rush" teaching order. Without scripting, however, the manual-seat beat may come late or never be needed.
- On Day 3 City, the courier (26.4 s) can be the very first thing that happens, before the first walk-in in about half of the runs (median door 25.4 s).
- On Day 3 Countryside, the bus (72 s) collides with plates-out (median 68.8 s), so a 6-guest wave lands just as plates run out.

### Gaps
- The bot is not a human. Human click-to-seat and rush-success times, and the number of rush misses, are not measured.
- The schedule uses unseeded `Math.random` (`HTML:278`, `HTML:301`, `HTML:377`), so real playtests will vary from these seeds.

## 3. Natural first-encounter moments and where each would trigger in code

### Takeaway
Most beats have a clean single-line trigger in existing functions. The two that need new checks are "plates hit 0 while someone waits" and "bunny tables full, door guest unclaimed". Neither event exists as a function today; both can be detected in `update()`.

### Cited Findings / hook map

| First encounter | Natural time (SIM medians) | Where to hook |
|---|---|---|
| Pre-open "meet your crew" | before t = 0 | `showStart()` `HTML:614–619`, before `S.open = true` at `HTML:618`. Spotlight targets already drawn: YOU tag (`render` `HTML:512`), green staffed rugs (`HTML:223`), "no staff" labels (`HTML:225`), "N plates ready" label (`drawPlates` `HTML:472`), stove with RUSH tag (`HTML:240–242`), DELIVERY PICKUP (`HTML:243`) |
| Quiet opening (no guests yet) | 0 → about 24 s (min 10 s) | `update()` `HTML:573`; first `kind:'g'` dispatch at `HTML:577` |
| First guest at the door (patience ring appears) | about 24 s | `guestUpdate` `arrive→queue` `HTML:446` |
| Bunny seats a guest (watch automation) | about 25 s | `staffUpdate` seat claim `HTML:419` / `led` at `HTML:427` |
| First "+$" / guest finishes eating | about 53 s (41 + 12) | `guestUpdate` `HTML:455` |
| Door guest only the chef can seat (bunny tables full) | about 47–49 s (D1), 42–43 s (D3) | new check in `update()`: an unclaimed `queue` guest exists and no staffed table is free (`tables` `HTML:229`) |
| Player's first click / first job badge | player-driven | `enqueue` `HTML:317`; badges `badgeFor` `HTML:475` |
| First chef seat at a no-staff table | about 11 s after click | `startAction` `seat` `HTML:331`; `seat()` `HTML:397` |
| First plate-bubble serve by the player | after the seat | click handler `HTML:639` → `serve` `HTML:334–337` |
| Plates run out (bunnies stall silently) | about 71 s Countryside / 78 s City | new check in `update()`: `S.plates === 0` with a `wait` guest unserved; bunny stall at `HTML:416`/`432`; chef toast at `HTML:361` |
| First rush panel opens | when the chef reaches the stove | `chefUpdate` `HTML:370–372` (`newRush` `HTML:375`) |
| First rush hit / miss | player-driven | `rushTry` success `HTML:387–390`, miss `HTML:391` |
| Rush interrupted by another click | player-driven | `enqueue` `HTML:321` (cancels the rush job) |
| 4-job queue cap | player-driven | toast `HTML:324` |
| First guest leaves unhappy | about 98 s D1 (seat), earlier on D3 | `leave(g, true)` `HTML:403–406`; courier at `HTML:463` |
| First courier (City D3) | 26.4 s, waits from 27.3 s | `spawnCourier` `HTML:306`; `in→wait` `HTML:462`; deliver `HTML:340–343` |
| Ad popup + coloured guests | 36.0 s Countryside / 38.4 s City; guests at the door 3.4–3.7 s later | `popup` `HTML:312`; ad dispatch `HTML:578`; colour `HTML:485` |
| Tour bus (Countryside D3) | 72.0 s; 6 guests over about 3 s | dispatch `HTML:579`; arrival `HTML:584`; BUS marker `HTML:293` |
| Closing time | 120 s | `update` `HTML:588–591` |
| Night summary | after the last guest leaves | `showEnd` `HTML:620` |

- Global freeze point: `frame()` `HTML:607`. Scripted spawns (for example forcing the first guest): `newDay` schedule `HTML:277–289` or `spawnGuest` `HTML:300`. The existing debug handle is `window.__rr` `HTML:655`.

### Inferences
- The popup is still visible (5 s) when the ad guests reach the door 3.4–3.7 s later. That is a natural moment to link "your colour = your ad" without adding a progress bar.
- City courier #1 at 26.4 s arrives while plates are still plentiful, so it is a clean first encounter. Courier #2 at 74.4 s arrives after plates have run out, so serving it needs a rush first.

### Gaps
- No existing event or callback layer exists. Every trigger is either inline in the update functions or a polling check in `update()`.

## 4. Conflicts with the earlier report's plan (REPORT)

### Takeaway
The team's new decisions plus the prototype's numbers change several earlier assumptions. The rush now *does* happen naturally on Day 1. The "your table" beat is *not* forced naturally. The "rush paused" beat no longer exists. The courier never appears for Countryside on Day 1 or Day 3.

### Cited Findings
- **Earlier worry "Day 1 has 12 free plates, rush may never trigger"** (REPORT, Day 1 conflict table, based on `CFG.freeFood: 12` in the live engine). In the prototype, plates = 8 against 14 walk-ins (`HTML:103–105`). Plates ran out in 30/30 runs per location at about 71 s (Countryside) and 78 s (City) (SIM). The rush beat therefore occurs naturally, but in the busiest stretch: the 3+ door queue at about 60 s overlaps it.
- **Beat 1 "watch staff work"** happens naturally. A bunny took the first guest in 120/120 Day 1 runs (with or without the bot) (SIM). One reason is that bunnies react instantly while the chef starts at the stove.
- **Beat 2 "your table: click guest → pick a table → bring a plate"**:
  - (a) The prototype has **no table-choice step**: the chef auto-picks the first free no-staff table (`HTML:331`). "Pick a table." does not map to any interaction.
  - (b) It is **never forced on Day 1**. Without input, 0 guests left from the door queue in Countryside (30/30). City lost 0.57 per day on average. The "chef-only" backlog appears at about 49 s (Countryside, 29/30 runs; once never) and about 47 s (City).
  - Scripting options: trigger on the first backlog (variable, 25–75 s); force an early scripted guest/group while bunny tables are full; or temporarily reserve or skip bunny tables for the first guest.
  - (c) The first manual guest can wait up to 22 s at the door, and the chef needs about 6 s just to get there from the stove (SIM).
- **Beat 4 rush teaching ("demonstrate a ghost marker, then try; first fail free")**: in the prototype every miss is already free and unlimited (`HTML:391`). Only success costs $8. The prototype panel already has its own in-panel instruction line (`HTML:538`). The marker cannot be demonstrated while frozen (`HTML:574`).
- **Beat 5 "rush paused" no longer exists.** With one click and one zone, the "rush paused N/M" label is unreachable (`HTML:539–540` vs `HTML:376`, `HTML:387–389`). Clicking something else cancels the rush job (`HTML:321`). The help text at `HTML:89` still says "pauses". The teachable point is now "leaving the stove cancels the rush; click it again".
- **Beat 6 courier**: there are no couriers on Day 1 (team decision; `HTML:279`). On Day 3 they appear **only in City** (`HTML:284–286`). A Countryside player meets no courier on Day 1 or 3. City courier #1 at 26.4 s is often the first activity of the day, before or around the first walk-in (median 25.4 s).
- **Beat 7 ad guests ("add a line to the popup: Blue guests = your ad")**: the popup has no progress bar and fades out over its last 1.5 s (`HTML:551`). The earlier report's "5 s popup" still holds (`HTML:313`). The ad colour follows location in the prototype (blue Countryside, pink City; `HTML:137`), not seat P1/P2 as the report assumed. Ad guests are also seated by bunnies when there is room (first ad guest seated at about 45 s, without input).
- **Beat 8 timeline event**: only Countryside Day 3 has a timeline marker (BUS) (`HTML:293`). City Day 3 has no marked event. The courier is effectively City's "event", and it carries a popup instead of a marker. The bus at 72 s coincides with plates-out at about 69 s in Countryside (SIM), so two pressure spikes land together.
- **Beat 0 "meet your crew", 20–30 s before the doors open**: `showStart` already exists as a text card with instructions (`HTML:617`). Day 1 also has a natural empty stretch of about 10–34 s after opening (SIM), which could host part of the intro with the clock running.
- **"No on-screen legend" (team decision) vs the prototype**: the always-visible help paragraph (`HTML:89`) and the instruction text on the `showStart` card (`HTML:617`) are de facto legends. Diegetic labels ("no staff", "YOU", "N plates ready", "RUSH", "DELIVERY PICKUP") are drawn in-scene (`HTML:225`, `512`, `472`, `242`, `243`).
- **Not covered by the earlier report**:
  - the job queue (max 4, numbered badges, 3-job toast at `HTML:323–324`);
  - bunnies stalling silently when plates hit 0 (`HTML:416`, `432`), where the only cue is shrinking plate-bubble rings;
  - the rejection toasts at `HTML:638–639`;
  - guests still leaving angry *after* closing, from their seats (SIM: Day 3 Countryside unhappy continued rising after 120 s, for example seed 3 went from 9 at close to 14 by 136.8 s).
- **Freeze implementation**: the earlier report's wall-clock concerns apply to the live `app.js`. In the prototype, all timers are dt-based (`HTML:573–603`), so a freeze is a single gate at `HTML:607`.

### Inferences
- A Day 1 tutorial built on this prototype probably needs **one scripted beat**: force a chef-only door guest early (for example, a guest arriving while all bunny tables are artificially busy, or the first guest routed to the no-staff area). The rush beat can stay natural, triggered on "plates 0 + guest waiting" at about 71–78 s.
- The earlier "Pick a table" line should be dropped or replaced, for example with "Click their plate bubble", since table choice is automatic.
- Day 3 teaching differs by location: Countryside gets ad + bus, City gets courier + ad. Unless the team wants a cross-location Day 3, each player learns only their location's elements.

### Gaps
- It is unknown whether the production game keeps the prototype's location-based colours or the seat colour (P1 blue / P2 pink).
- It is unknown whether Day 2 (not prototyped) introduces anything, such as the market, that would change what Day 3 has to teach.
