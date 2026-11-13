# Genre References: How Restaurant, Management and Service Games Pace the Service Loop

Method note: the sources below come from web searches. Direct page fetches were blocked in this session (wiki.plateupgame.com, gamedeveloper.com, 80.lv and en.wikipedia.org did not resolve), so most findings rest on search-result excerpts of the cited pages, not full reads. Where the official PlateUp wiki was only seen through a search summary, it is still cited, because the numbers there are specific and consistent. Fan sites and walkthroughs are flagged as lower confidence. Anything marked "Inference" is my synthesis for our game. It is not a sourced claim.

Our current baseline for comparison: one script step every 0.75 s and an 8 s decision timer, with a dense screen.

## 1. Customer arrival, queueing, walking in, patience signalling and day length

### Takeaway
The genre has three "clock" models. (a) Fixed-length timed days: PlateUp's day bar starts at 100 s; Overcooked levels usually run 4 min. (b) Quota days that end after N customers or entrants: Cook Serve Delicious, Papers Please. (c) Untimed narrative visits, one customer at a time: Coffee Talk, Venba, mostly Good Pizza Great Pizza. Patience is almost always a visible, draining per-customer meter (Diner Dash hearts, PlateUp bars), and losing it costs reward rather than ending the game.

### Cited Findings
- **PlateUp day length:** the day timer starts at 100 seconds and grows by 25 seconds after every 3 completed days. A longer day spreads group arrivals out. — [PlateUp wiki: Daily Operations](https://wiki.plateupgame.com/gameplay/DailyOperations)
- **PlateUp queue patience:** groups waiting outside share one patience bar that drains at a steady rate, and each extra group in the queue makes it drain 10% faster. Patience caps at 100. — [PlateUp wiki: Customers](https://wiki.plateupgame.com/gameplay/Customers)
- PlateUp players report that queue-decay acceleration stops at about 17 groups. This is community testing, so confidence is low. — [r/PlateUp thread (mirror)](https://red.bismuth.it/r/PlateUp/comments/1ew6esk/is_there_a_maximum_rate_of_customers)
- **PlateUp group counts scale with player count:** a fan guide lists solo 0.8x, 2 players 1.0x, 3 players 1.25x and 4 players 1.5x, rising over the run. Treat these as possibly outdated. — [naguide](https://naguide.com/?p=47721)
- **PlateUp shows the expected number of groups during the prep phase,** before the day starts. Bonus groups from rush cards appear as "+x" after the number. — [PlateUp wiki: Rush Hour 2023 / Turbo](https://wiki.plateupgame.com/Events/RushHour2023)
- **Overcooked level length:** "you usually have four minutes to complete each level unless stated otherwise". Level 5-1 gets 5 minutes because it is complex. — [TrueAchievements Overcooked walkthrough](https://www.trueachievements.com/game/Overcooked/walkthrough/3)
- **Overcooked delayed clock:** on some stages "the timer for this stage starts only when you complete the first order," which gives players time to learn the kitchen. — [TrueAchievements Overcooked walkthrough](https://www.trueachievements.com/game/Overcooked/walkthrough/8)
- **Overcooked! All You Can Eat Assist Mode** can extend level timers, and a practice mode has no timer or score. — [Netflix Games help: Assist Mode](https://games-netflix.helpshift.com/hc/en/56-overcooked-all-you-can-eat/faq/1816-what-is-assist-mode)
- **Diner Dash patience:** customers show their mood as hearts above their heads. The longer they wait, the more hearts they lose. Each customer type has its own patience and tipping habits. A customer who runs out of hearts leaves, and the player loses points. — [Wikipedia: Diner Dash](https://en.wikipedia.org/wiki/Diner_Dash)
- **Diner Dash service stages:** wait in line → seat at a table (match the colour for a bonus) → menus down and hand raised to order → food → check. Hearts can be restored with coffee or a podium visit, and more hearts mean a bigger tip. In DD5, a customer who runs out before the check is collected leaves without paying. — [AOL/Joystiq DD5 guide](https://www.aol.com/2013/04/23/diner-dash-5-boom-walkthrough-cheats-tips-guide/); [AOL Hometown Hero guide](https://www.aol.com/2013/04/21/diner-dash-hometown-hero-walkthrough-cheats-tips-guide/)
- **Diner Dash 2 strategy tip:** seating a group you cannot serve is worse than leaving them in line, and you don't have to seat customers the moment they arrive. The queue is a buffer the player manages. This comes from a walkthrough. — [casualgameguides: Diner Dash](https://casualgameguides.com/walkthroughs/diner-dash-flo-on-the-go)
- **Cook Serve Delicious day end:** the day doesn't end on a timer. It ends after a set number of customers, shown in the top-left of the UI. This comes from a player comment, so confidence is moderate. — [itch.io post](https://itch.io/post/4387230)
- **Papers Please clock:** "The clock for the day doesn't start counting down until you call in the first entrant," so players can read new rules and arrange the desk with no time pressure. — [ludo.guide: Papers Please citations](https://www.ludo.guide/guide/papers-please/citations)
- **Papers Please pay:** the player is paid per entrant processed, plus bribes, minus citations. The first 2 citations each day are free, and later ones cost an increasing 5, 5, 10, 15, 20… credits. — [ludo.guide](https://www.ludo.guide/guide/papers-please/citations); [Wikipedia mirror](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Papers%2C_Please)
- **Papers Please opening ritual:** each day opens with a "coarse, clacking shutter," part of the game's tactile feel. — [Game Developer: Designing the bleak genius of Papers, Please](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-)
- **Good Pizza Great Pizza** does have a day countdown. Early days are hard because "the countdown timer moves quickly and the pizza oven is slow." Customers arrive one at a time with odd, character-driven orders. — [Nintendo Insider review](https://www.nintendo-insider.com/good-pizza-great-pizza-review/)
- GPGP is described as "charming rather than challenging," a "strictly one-person operation." — [Tech-Gaming review](https://www.tech-gaming.com/good-pizza-great-pizza/)
- **Coffee Talk:** "you can take as much time as you want when creating latte art… No rush!" This is likely the article's wording, not a developer quote. — [Game Developer: Making a cozy, therapeutic experience in Coffee Talk](https://gamedeveloper.com/design/deep-dive-making-a-cozy-therapeutic-experience-in-i-coffee-talk-i-)

### Inferences
- A 1–2 minute service day sits right in the genre's normal range: PlateUp starts at 100 s, and Overcooked levels run about 240 s. Our problem is not total length. It is that the *beats inside* the day are too dense. PlateUp spreads a modest number of groups over 100 s, while our 0.75 s step cadence makes a new event appear almost every second.
- Queue patience that drains faster as more guests wait (PlateUp's +10% per group) is a cheap, legible way to make shortages "felt" without a separate timer per guest. A single shared queue bar also suits an SVG scene: one bar above the door instead of many.
- Showing the expected guest count *before* service starts (PlateUp's prep-phase "Expected groups") matches our existing `mathHint()` line ("expect X guests · seat min(tables, food)"), which validates that design.
- Diner Dash shows the whole service as a short, visible state chain (queue → seat → order → eat → pay). In a 2D scene, each guest's position (outside, in the doorway, at a table, leaving) can *be* the status, so less text is needed.
- Papers Please's "the clock doesn't start until you call the first entrant" maps directly onto a "Open the doors" button at the start of our service. It gives a moment to read the day's script setup with no time pressure.

### Gaps
- Exact per-customer patience durations in seconds for Diner Dash, Cook Serve Delicious and PlateUp's seated/ordering/eating stages. The official PlateUp wiki pages could not be fetched in full.
- Exact number of customers per day in Cook Serve Delicious and Diner Dash levels.
- Whether Good Pizza Great Pizza has per-customer patience meters. I found no source.

## 2. Ramping intensity within a day (lulls, rushes, waves, telegraphing big groups)

### Takeaway
The clearest documented pattern is PlateUp's: rushes are *scheduled and shown on the time bar as icons* before they happen, and the extra volume is previewed numerically in the prep phase. Other games ramp more across days than within a day. Overcooked and Papers Please ease the start by delaying the clock. Cook Serve Delicious 2 added holding stations so players can prep before a rush.

### Cited Findings
- **PlateUp rush cards** (Morning, Lunch and Dinner Rush) each add +15% groups during that rush, with a minimum of +1 group. The cards "add an icon to the time bar when the rush is set to occur." — [PlateUp wiki: Rush Hour 2023](https://wiki.plateupgame.com/Events/RushHour2023); [PlateUp wiki: Turbo setting](https://wiki.plateupgame.com/gameplay/Restaurant/RestaurantSettings/Turbo)
- **PlateUp difficulty arrives through cards chosen between days.** The first card is chosen at the start of Day 4, then every third day. Customer cards, which change volume and behaviour, appear on the left, and food cards on the right. — [PlateUp wiki: Cards](https://wiki.plateupgame.com/Cards)
- **Overcooked eases the opening** by starting some timers only after the first order. — [TrueAchievements](https://www.trueachievements.com/game/Overcooked/walkthrough/8)
- **Cook Serve Delicious 2** "maintains the same nerve-wracking, frenetic pace of trying to cook through an entire shift". Holding stations were added so players can prep food ahead of the rush. — [Kotaku review](https://kotaku.com/1816210516)
- **Papers Please** changes rules day by day to raise pressure or steer the story. Ramp happens *between* days through new rules, not within a day. This is a secondhand quote of developer commentary. — [Game Informer: Papers, Please 10 years later](https://www.gameinformer.com/2024/01/02/papers-please-10-years-later)
- **Papers Please** also ends some days early with a scripted shock, a bombing that closes the border, and Pope deliberately kept it outside player expectations. — [Denfami Nico Gamer interview with Lucas Pope (Japanese)](https://news.denfaminicogamer.jp/interview/240424b/2); [Wikipedia mirror](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Papers%2C_Please)
- **Recipe for Disaster** produces emergent spikes when events collide, for example "a restaurant critic came in during rush hour while my entire staff was on the brink of quitting," or a fire breaking out as the inspector arrived, which earned a fine. — [Destructoid review](https://www.destructoid.com/reviews/review-recipe-for-disaster-pc-simulation-management/); [Game Informer review](https://gameinformer.com/review/recipe-for-disaster/an-appetizing-restaurant-management-sim)

### Inferences
- For our "tour bus parks outside, 6 guests walk in" event, the PlateUp pattern suggests (1) marking the bus's arrival time on the service progress bar as an icon from the start of service, (2) showing the bus pulling up a few seconds *before* the guests step off, and (3) then the queue swelling. This turns a surprise into anticipation, and the player has time to think about tables and food before it lands.
- A simple wave shape for a 90–120 s day: a gentle opening (a few walk-ins, so the player learns the screen), a single marked peak (lunch rush or bus), then a tail where the leftover queue clears. This shape is my synthesis from the PlateUp rush-icon model and Overcooked's delayed start. No source gives a canonical within-day curve.
- Our seeded `script` already decides everything up front, so it can expose the event's time-on-bar to the page for free. Telegraphing needs no new randomness.

### Gaps
- No source found with a published within-day arrival curve (customers per minute over the day) for any of these games.
- No developer statement found on how Diner Dash or Cook Serve Delicious schedule waves within a level.

## 3. Presenting special events (VIP, critics, big groups, inspections): before, during and after

### Takeaway
Documented patterns are: a notification or inbox item that announces the event with a deadline (Two Point Hospital incidents), colour-escalating markers as time runs out (Two Point's emergency dispatch map: normal → orange → red, then a ghost when it fails or a star when it succeeds), and a judge-type special customer whose visit is graded on quality and cleanliness (Recipe for Disaster critics and inspectors). The aftermath is usually a clear iconographic outcome or a score swing, and Papers Please's daily ledger is the model for an end-of-day breakdown.

### Cited Findings
- **Two Point Hospital incidents** arrive as an email with a blue light. They are major events (an accident, people running away) that test the hospital "within a set timeframe." — [yekbot Two Point guide](https://www.yekbot.com/two-point-hospital-illnesses-incidents-and-training/)
- **Two Point Hospital Speedy Recovery DLC emergency map:** patient markers change from normal to orange to red as the time limit runs down. A patient not reached in time is shown as a ghost, and a rescued one gets a star. — [Two Point Hospital Wiki: Speedy Recovery DLC](https://two-point-hospital.fandom.com/wiki/Speedy_Recovery_DLC)
- **Theme Hospital and Two Point's tone:** a sardonic announcer voices warnings, part of the series' identity. — [Fandom: How Two Point Studios made Two Point Hospital](https://www.fandom.com/articles/how-two-point-studios-made-two-point-hospital)
- **Recipe for Disaster special customers:** timed events in which special customers "judge you on your food quality and restaurant cleanliness". Critics and inspectors "can boost or tank your restaurant pretty quickly," but are "typically not difficult if you're running efficiently." — [Steam store page](https://store.steampowered.com/app/1492360/); [Destructoid review](https://www.destructoid.com/reviews/review-recipe-for-disaster-pc-simulation-management/)
- **PlateUp telegraphs scheduled rushes** as time-bar icons and previews extra volume ("+x") during prep. — [PlateUp wiki: Rush Hour 2023](https://wiki.plateupgame.com/Events/RushHour2023)
- **Papers Please aftermath:** the end-of-day screen itemises earnings per entrant processed, bribes and citation penalties. Citations are explained ("approve someone with invalid documents, deny someone with valid documents, fail to provide a Reason for Denial stamp"). — [ludo.guide](https://www.ludo.guide/guide/papers-please/citations)

### Inferences
- A three-beat event template that fits SVG/CSS:
  1. **Before:** an icon on the service progress bar, plus one line in the event strip ("Tour bus due around midday").
  2. **During:** the bus sprite pulls up, guests step off into the queue, and the queue bar turns orange, then red, Two Point style.
  3. **After:** a single outcome badge on the event (star or ghost, check or cross) and one itemised line in the end-of-day report, Papers Please style ("Tour bus: 6 arrived · 4 seated · 2 left · +$X").
- Our private events (inspector, booking) fit the "special customer" pattern. Give the inspector a distinct sprite so the player recognises them on arrival rather than reading a log line.
- Keep the during-phase text to one line. The colour change and sprites carry the urgency.

### Gaps
- No source found with developer reasoning on *how far ahead* to warn about events (seconds or minutes).
- Recipe for Disaster's in-game warning UI for critics and inspectors is not documented in the sources found.

## 4. Decision time: real-time pressure vs pause vs slow motion vs turn-based moments

### Takeaway
Most action titles (Overcooked, Diner Dash, Cook Serve Delicious, PlateUp's day phase) never stop the clock for decisions. Instead they move strategic choices *out* of the live phase: PlateUp has a separate untimed prep phase and chooses cards between days, and Papers Please doesn't start the clock until the player is ready. Accessibility modes (Overcooked Assist Mode) stretch timers instead of removing them. Calm games (Coffee Talk, Unpacking) drop the timer altogether. I found no source documenting a restaurant game that pauses mid-service for a modal question, so that would be our own choice, not a genre convention.

### Cited Findings
- **PlateUp splits each day** into a prep phase (no customers; layout and planning, where expected groups are shown) and the timed day phase. Strategic card choices happen at the start of a day, every third day from Day 4. — [PlateUp wiki: Daily Operations](https://wiki.plateupgame.com/gameplay/DailyOperations); [PlateUp wiki: Cards](https://wiki.plateupgame.com/Cards)
- **Papers Please's timer only starts when the first entrant is called,** which gives an untimed reading and setup window. — [ludo.guide](https://www.ludo.guide/guide/papers-please/citations)
- **Overcooked! All You Can Eat Assist Mode** lengthens level timers, and a separate practice mode has no timer or score. Its accessibility answer is "more time," not "pause." — [Netflix Games help](https://games-netflix.helpshift.com/hc/en/56-overcooked-all-you-can-eat/faq/1816-what-is-assist-mode)
- **Overcooked's makers treat the stress as deliberate.** Gavin Hood's position, as reported by Kotaku, is that laughter and tears come from the chaos. — [Kotaku](https://kotaku.com/i-cant-convince-my-friends-that-overcooked-2-is-fun-no-1837838614)
- **Overcooked's stress cuts both ways.** One reviewer calls it the game's main failing, and an analysis notes that stress can make some players, especially mismatched pairs, disengage. — [Kritiqal review](https://kritiqal.com/articles/overcooked-review); [Mechanics of Magic critical play](https://mechanicsofmagic.com/2025/04/18/critical-play-competitive-analysis-overcooked-sabotage-stew/)
- **In Diner Dash, the player decides *when* to seat.** Holding customers in line is valid strategy, and guides recommend batching three or four tables. Decision time comes from the queue buffer, not a pause. — [casualgameguides](https://casualgameguides.com/walkthroughs/diner-dash-flo-on-the-go)
- **An indie dev deliberately left out active pause** so their night-time phase would "feel intense and dynamic". Another dev considered a slow-down option for "gameplay diversity." These are itch.io developer comments on non-restaurant games. — [itch.io: Magistry comments](https://sashiyamo.itch.io/magistry/comments)
- **Cozy design framing:** cozy games are ones you can play "at your own pace, without timers and pressure" (developers interviewed by Epic). Project Horseshoe frames coziness as safety, the absence of risk. — [Epic Games Store: why cozy](https://store.epicgames.com/news/best-cozy-games-why-cozy-feature-interview); [80.lv: Using coziness in game design](https://80.lv/articles/using-coziness-in-game-design/?amp=1)

### Inferences
- For our shortage episodes (rush food, borrow a table, let them go), the genre suggests two options that fit a teaching game:
  - (a) **Soft pause:** when a shortage opens, the scene slows (CSS animation-play-state paused or slowed) and the guest's patience bar freezes or drains slowly while a choice card shows. This departs from genre convention and is justified by our learning goal.
  - (b) **Queue as buffer:** keep real time running, but make the decision window long, for example 15–20 s instead of 8 s, with the guests visibly waiting in the queue so the cost of delay is shown, not just told.
- Option (a) suits ages 13+ and a two-player online game where the players can't pause each other. Each device runs its own `serviceRun` with its own `ops`, so a local pause doesn't break sync. This should be checked against the code.
- Following PlateUp and Papers Please, the most "thinky" decisions belong outside the live clock: our morning, invest and commit phases already do this. Service choices should stay small and binary.
- An accessibility toggle for slower service speed (Overcooked Assist Mode) is cheap: scale the step interval and the decision timer by one factor.

### Gaps
- No source found confirming whether Two Point Hospital or Theme Hospital pause the game automatically when an incident or fax decision appears. Search results were unrelated.
- No published numbers for decision windows in time-management games. Our proposed 15–20 s is an inference, not a sourced figure.

## 5. What designers say about pacing and "cozy vs stressful"

### Takeaway
Developer statements cluster into two camps. The action camp (Overcooked, Cook Serve Delicious 2) treats stress as the point, but CSD's creator later acknowledged its cost: 16% of CSD2 refunds cited difficulty. The calm camp (Coffee Talk, Unpacking) designs for low frustration, player-set pace and many valid solutions. Papers Please's Lucas Pope found that a tactile, simple core action is fun on its own, and that pacing can make content feel uncomfortable on purpose.

### Cited Findings
- **David Galindo (Cook Serve Delicious creator)** wrote that CSD2 was deliberately built around a notoriously hard experience, and that Steam refund data showed 16% of people who refunded CSD2 did so because it was too difficult. That shaped difficulty and UI choices for Cook Serve Forever. — [Game Developer: Deep dive, Cook Serve Forever and difficulty levels](https://gamedeveloper.com/design/deep-dive-cook-serve-forever-and-difficulty-levels)
- **Overcooked's co-op focus:** the developers built the game because most games treated co-op as an afterthought. — [Game Developer: Road to the IGF, Overcooked](https://gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-)
- **Lucas Pope on Papers Please:** the prototype was just moving blank documents around a desk, and that was already fun. Characters were added because contradictions alone would make a spot-the-difference game. — [Denfami Nico Gamer interview (Japanese)](https://news.denfaminicogamer.jp/interview/240424b/2)
- **Papers Please pacing as a tool:** "the very tactile nature of the interface and the pacing made some scenarios surprisingly uncomfortable." — [mycours.es game design course page](https://mycours.es/gamedesign2016/2016/11/06/lucas-pope/)
- **Coffee Talk Episode 2's lead writer** describes the goal as "a cozy corner that offers you a brief respite every time you play." — [AppTrigger interview](https://apptrigger.com/2023/04/01/coffee-talk-2-pax-east-preview)
- **Coffee Talk Tokyo's team** describes balancing cozy pacing with more complex branching systems. — [80.lv: Coffee Talk Tokyo](https://80.lv/articles/how-coffee-talk-tokyo-expands-the-series-with-yokai-social-media-modern-tokyo)
- **Unpacking's designer** aimed to keep "player frustration to a minimum since we consider it a 'Zen' game. It's a puzzle, but it has many solutions." — [Epic Games Store: why cozy](https://store.epicgames.com/news/best-cozy-games-why-cozy-feature-interview)
- **Developers interviewed by Epic** named atmosphere, pacing and emotionality as common cozy factors. — [Epic Games Store: why cozy](https://store.epicgames.com/news/best-cozy-games-why-cozy-feature-interview)
- **Diner Dash 5 iteration:** the team cut a "Zoom" feature after testers disliked it, and feedback improved. A PlayFirst designer's account also describes resisting the urge to pile on new features in a sequel. — [Game Developer: Finding the game in a sequel to a sequel to a sequel](https://www.gamedeveloper.com/business/finding-the-game-in-a-sequel-to-a-sequel-to-a-sequel)
- **PlayFirst playtesting:** after a XEODesign study, PlayFirst reordered customer types so families appear from the start. Early-level customer mix was tuned through user testing. — [Isbister & Schaffer, Game Usability: PlayFirst interview chapter](https://www.taylorfrancis.com/chapters/mono/10.1201/b14580-16/interviews-user-testing-practices-playfirst%C2%AE-katherine-isbister-noah-schaffer)
- **Diner Dash's ancestry:** it was designed at Gamelab (Eric Zimmerman, Nick Fortugno, Peter Lee) and published by PlayFirst, and Fortugno is credited as lead designer. Fortugno notes that "casual" lumps together very hard, very short action games and involved but soothing strategy games. — [Wikipedia: Nick Fortugno](https://www.wikipedia.org/wiki/Nick_Fortugno); [Open Culture: Pretty Much Pop #46](https://www.openculture.com/2020/06/what-is-a-casual-game-pretty-much-pop-a-culture-podcast-46-talks-to-nick-fortugno-creator-of-diner-dash.html)

### Inferences
- Our game teaches management to 13+ players, and Playtest 1 reports that things move too fast. The CSD refund data supports leaning toward the calm camp during service: keep a little time pressure so choices have cost, but make the stress tunable and not the point.
- Pope's "moving papers is fun on its own" suggests the base visual (guests walking in and sitting down) should be satisfying to watch even with no events. That argues for slower, readable walk-in animations over log lines.
- PlayFirst's lesson (test the order in which customer types appear) argues for introducing service elements one at a time across days: day 1 has plain walk-ins only, then a shortage, then an event.

### Gaps
- No full-text access to GDC Vault talks specific to these titles. No dedicated GDC talk on Overcooked, Diner Dash or PlateUp pacing was found.
- No Venba developer statement on pacing was found.

## 6. Specific numbers available

### Takeaway
Hard numbers are sparse and mostly come from PlateUp's official wiki and Overcooked guides. Use them as reference points only, since our numbers are the team's to set.

### Cited Findings
- **PlateUp:** day bar 100 s at start, +25 s every 3 days. — [PlateUp wiki: Daily Operations](https://wiki.plateupgame.com/gameplay/DailyOperations)
- **PlateUp:** queue patience drains 10% faster per extra queued group, and patience caps at 100. — [PlateUp wiki: Customers](https://wiki.plateupgame.com/gameplay/Customers)
- **PlateUp:** each rush card adds +15% groups in that rush (minimum +1). — [PlateUp wiki: Rush Hour 2023](https://wiki.plateupgame.com/Events/RushHour2023)
- **PlateUp:** the first card is chosen on Day 4, then every 3 days. — [PlateUp wiki: Cards](https://wiki.plateupgame.com/Cards)
- **Overcooked:** levels usually run 4 min, and complex ones 5 min. — [TrueAchievements](https://www.trueachievements.com/game/Overcooked/walkthrough/3)
- **Papers Please:** 2 free citations per day, then escalating 5-credit steps. — [ludo.guide](https://www.ludo.guide/guide/papers-please/citations)
- **Cook Serve Delicious 2:** 16% of refunds cited difficulty. — [Game Developer deep dive](https://gamedeveloper.com/design/deep-dive-cook-serve-forever-and-difficulty-levels)

### Inferences
- Rough comparison: PlateUp's early days fit a handful of groups into 100 s. Our day at 0.75 s per step means a new line roughly every second, which is an order of magnitude denser in "beats" than the reference games. A target of one visible change every 3–6 seconds is an inference worth playtesting, not a sourced figure.

### Gaps
- Per-guest patience in seconds for any title.
- Simultaneous on-screen customer caps: no source found. Diner Dash levels visibly use a small number of tables, but I found no documented count.
- Pages that should be read directly if the network allows: the PlateUp wiki pages above, Galindo's Game Developer deep dive, and the Coffee Talk Game Developer deep dive.
