# Spoon Fight · UI/UX v2 changes (agreed)

All agreed changes from the mockup canvas, in one place. The canvas keeps every option we looked at; this file lists only the ones we picked.
Mockup canvas (private, ask its owner for access): https://claude.ai/artifact/RopkjpDY17pLFErNpP6wY8

Principles used throughout (from our research on similar games):

| # | Principle |
|---|---|
| P1 | One job per screen |
| P2 | Fixed zones: the same info always sits in the same place |
| P3 | Unlock gradually: don't show everything on day 1 |
| P4 | Teach by doing: let players make a mistake and see it |
| P5 | Preview the outcome before the player commits |
| P6 | Show the cause at the moment it happens, then a ledger |
| P7 | Make scarcity visible |

## 1 · Name, story and look

| What | Before | After |
|---|---|---|
| Game name | Restaurant Rivals | **Spoon Fight** |
| The old restaurant | The Copper Pot | **The Two Spoons** |
| The competition | Golden Ladle | **The Golden Spoon** |
| Logo | logo.jpg | **L4 round badge**: "★ THE GOLDEN SPOON ★" ring around "SPOON FIGHT" |
| Key art | two human chefs | **v5**: cat chef in blue (you) vs dog chef in pink (rival), red-and-white scalloped awning on top. No race or gender cues |
| Story intro | 4 lines over the key art | 5 short story cards (below) |

Story cards (one line each, "Skip story" on every card):
1. You two were the best team at the Two Spoons.
2. One bad review. Each blamed the other. It closed.
3. You went separate ways. Years passed. Not one word.
4. Then the Golden Spoon named its prize: the Two Spoons.
5. You made the final. So did they. → Pick your restaurant

Start screen copy: "The Golden Spoon final · 5 days · $100" / "You used to cook together. Now only one of you gets the Two Spoons back." The rival is called "your old partner" in the lobby and invite screens.

## 2 · Top bar (every game screen)

- The five steps are **one progress bar** (P1 option), not separate pills, so they don't look like clickable tabs.
- Left: badge logo. Middle: "Day 2 of 5", the bar with tick labels Build · Market · Ads · Service · Recap. Right: your cash, the rival's cash and what they're doing, and "?" for How to play.
- **Day 1 shows 4 steps** (no Market).
- Cash and stars live here on every screen, so they never move around (P2).

## 3 · Day 1 (game logic change)

- **Day 1 has no Market.** The Golden Spoon gives each restaurant **12 free plates** for the first night.
- Why: the point is that most players will have food left over and see it thrown away at closing, so they learn to buy carefully from day 2 (P4).
- A **gift screen** appears right after picking a location: "A gift from the Golden Spoon! 12 free plates of food for your first night. From tomorrow, the food is on you: you and your rival race for it at the Market."
- Day 1 order: Pick → Gift → Build → Ads → Service → Recap.

## 4 · Build

- **Morning event card** comes first, as its own screen, only on days with a secret offer (shady deal or booking). It shows this morning's rent and break-in, and each choice states its outcome ("If they come: +$30 / If not: 2 tables sit empty all night").
- Build then has one job: **tap a + spot on the floor plan** to add a table ($6). Tables can only be added, never removed (tap a new one again to undo it before you confirm).
- **Tonight's forecast**: guests expected vs seats, with a plain verdict ("About right", "Too few tables: guests leave and you can lose a star", "Too many: if over half sit empty at closing, you can lose a star too").
- **Your $ for today** ledger: cash now − new tables, then what the money is still needed for:
  - Day 1: "Left for Ads (next step)". Hint: tomorrow you'll also need money for food.
  - Day 2+: "Food at the Market (next) ~$X–Y" and "Ads after that: the rest".
- Day 1 shows the 12 free plates and "Leftovers go bad at closing. From tomorrow you buy food at the Market."

## 5 · Market

**Not changed in this round.** It needs a bigger rework, to be decided by the team. Open issues we noted:
- No feeling of competing for the same thing (two identical item types).
- Express vs Regular risk is hidden (could reuse the SURE / GAMBLE tags from Ads).
- Plate target should be min(seats, guests) and mention ads come later; no "money left for ads" line.
- Cooldown, stock counts and the rival's buys aren't visible enough; nothing references yesterday's waste.

## 6 · Ads

- Cards use **style S1, solid color**: blue = for your restaurant, pink = against your rival.
- Each card: name + price on top, a big **emoji art** placeholder, a **big effect line** (+2 👤, −2 👤, +6 👤…), one short line, and a **keyword tag** at the bottom.
- Keyword tags (explained in a legend):
  - ✓ SURE: always happens.
  - 🎲 GAMBLE xx%: might do nothing at all.
  - ? IF THEY'RE FULL / ? IF THEY RUSH FOOD: only works if something else is true. The tag says the condition.
  - ∞ LASTING: keeps working on later days.
  - 🃏 BLUFF: does nothing, just makes them worry.
- COUNTRY / CITY badge on location-only cards.
- Shop rules unchanged (1 location card + 2 general for you, 3 against your rival, new hand every day).
- Right side: "Tonight, if you play these": guests → with cards, seats, plates, and which one runs out.
- Placed cards show as **card backs** (the badge). The rival only sees the backs.
- At the start of Service the cards **flip one at a time** with a result stamp ("+2 ARRIVED", "🎲 THEY CAME! +4", "OUCH −2") and a running total.

## 7 · Service

- Title line teaches the rule: "Every guest needs 1 table + 1 plate. Each meal pays $8."
- **Live star check** panel on the right: 0 left unhappy +1 ★ · 1–3 −1 ★ · 4 or more −2 ★, with an arrow on the current tier, plus the empty-tables rule.
- **+$8 pops** when a guest pays; counters for tonight's earnings, seated and left unhappy.
- Guests brought by an ad wear its **badge** (F = Flyers); a "Cards tonight" list says what each card did.
- **Shortage**: need bubbles over the waiting guests show what each is missing (🍽 plate / 🪑 table). Each choice states its result ("Rush 1 plate $9: +1 guest eats (+$8)", "Let them go $0: 3 leave unhappy → star check drops to −1 ★"). "Why this happened" explains the cause.
- **Someone asks for food** (villager in the countryside, homeless man in the city): both choices show the odds ("Give 1 plate · 🎲 20% word of your kindness: +1 ★" / "Say no · 🎲 50% word gets out: −1 ★"). Same rule as before.
- **Closing**: leftovers go into a bin. Day 1: "6 of your 12 free plates went to waste. Food doesn't keep overnight. Tomorrow you pay for every plate, so buy only what you'll serve." Also shows the empty-tables check.
- **Sorry vouchers** stay, as a **pop-up after service, before the recap**: one face per unhappy guest, tap to send a $3 voucher (😞 → 😊), a row showing the star result for 0…n vouchers, and "Send 1 more and you keep your star. In the score, a star is worth $10."

## 8 · Recap

Not changed in this round (a proposal exists on the canvas, row 8, not yet discussed).

## Numbers

No rule numbers changed, except the day 1 change above (no Market, 12 free plates). Everything else (rent, prices, odds, star rules, voucher $3) is the team's existing `CFG`.
