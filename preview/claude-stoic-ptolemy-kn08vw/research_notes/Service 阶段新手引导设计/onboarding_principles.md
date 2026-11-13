# Onboarding / tutorial design principles for a busy real-time Service screen

Source-access note: every WebFetch in this session failed with DNS blocks (grail.cs.washington.edu, nngroup.com, gamedeveloper.com, acagamic.com, create.roblox.com, reposit.haw-hamburg.de). All findings below come from **search-result excerpts**, not full pages. Treat specific numbers and wording as **medium confidence**, and check the primary PDF/video before quoting in a paper. Secondary blogs (wayline.io, bugnet.io, fan wikis) are low confidence and marked.

## 1. Tutorial design research and practitioner guidance (learn-by-doing, just-in-time, coach marks, staged introduction, safe practice, skipping, FTUE metrics)

### Takeaway
The consistent advice is: teach by having the player act on one new thing at a time, at the moment it first matters, with very little text. Introduce each mechanic first in a safe, uncluttered setting, then add pressure. Keep forced walkthroughs and coach-mark tours small. Measure where players drop off step by step.

### Cited Findings
- **Learn by doing.** Celia Hodent (*The Gamer's Brain*, former Epic/Fortnite UX lead) argues people learn best by doing, in a context that makes sense to them. She also calls usability "the glass ceiling" of the learning experience: onboarding cannot fix an unreadable UI. These are secondary summaries. — [Game Developer: Hodent GDC podcast](https://www.gamedeveloper.com/design/games-psychology-and-ux-with-celia-hodent---gdc-podcast-ep-8); [GDC Vault: "The Gamer's Brain, Part 2: UX of Onboarding and Player Engagement" (2016)](https://gdcvault.com/play/1022951/contactUs); [uxdesign.cc summary](https://uxdesign.cc/games-ux-building-the-right-onboarding-experience-a6e99cf4aaea)
- **George Fan (Plants vs. Zombies), GDC 2012, "How I Got My Mom to Play Through PvZ," 10 tutorial tips** (secondary coverage):
  - Blend the tutorial into the game so it doesn't feel like a tutorial.
  - Players learn best by doing; e.g. "click a seed packet."
  - Keep text short, roughly 8 words on screen at once ("eloquent caveman").
  - Don't teach everything at once; seeing an action's result often teaches it.
  - Prefer passive, non-pausing messages.
  - Make each character's look signal its function.
  — [Game Developer coverage](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan); [JikGuard mirror](https://www.jikguard.com/news/gdc-2012-10-tutorial-tips-from-plants-vs-zombies-creator-george-fan); [Filament Games (8-word cap)](https://filamentgames.com/blog/10-tips-designing-game-tutorial); [GDC Vault talk](https://gdcvault.com/play/1015541/contactUs)
- **PvZ content pacing.** Sources disagree. One says new plants arrive "generally one per level." Another summary of the talk says new content arrives roughly every 5 levels, and only one shop purchase is allowed on the first visit. — [walkthrough](https://mail.solitairelaboratory.com/solitairearcade/zombies/plantsvszombiesguide.html); contradicted by [talk notes](https://notes.hamatti.org/Sources/Talks/How-I-got-my-mom-to-play-through-Plants-vs.-Zombies)
- **"Organic tutorial" staging, using Mario 1-1 as the example.** A new mechanic is shown in three stages:
  1. On its own, in an open area with no enemies.
  2. Repeated with more demands.
  3. Tested where failure can hurt.

  — [Game Developer: Examining Organic Tutorials](https://gamedeveloper.com/design/examining-organic-tutorials)

  A similar "experiment first, then add risk" pattern appears in [Redbrick: rule introduction in Super Mario](https://www.redbrick.me/rule-introduction-in-super-mario/).
- **Mario 1-1 teaches with no text.** Nintendo introduced jumps, hazards and power-ups "without a single line of text." Per one secondary account, the first enemy was changed from a Koopa to the simpler Goomba because shell-kicking was too complex for a first encounter. — [DEV/IGN Miyamoto summary](https://dev.to/gg_news/ign-miyamoto-explains-how-mario-world-1-1-was-created-36bm); [TV Tropes: Instructive Level Design](https://tvtropes.org/pmwiki/pmwiki.php/Main/InstructiveLevelDesign)
- **Kishōtenketsu framing.** I found no source in these searches that links kishōtenketsu to Mario 1-1. See Gaps.
- **NN/g on tutorials and coach marks.** In a quantitative study (70 users, 4 mobile apps with deck-of-cards tutorials):
  - Users who read the tutorial were slightly *less* successful (91% vs 94%).
  - They rated tasks as harder (p = 0.047).
  - Completion times showed no difference.
  - NN/g reports the same effect with coach marks and instructional overlays.
  - NN/g says walkthroughs can help with a genuinely novel interaction paradigm, but are "dramatically overused" and frequently skipped.

  — [NN/g: Mobile tutorials](https://www.nngroup.com/articles/mobile-tutorials/); [NN/g: Onboarding tutorials examples](https://www.nngroup.com/articles/onboarding-tutorials/)
- **Practitioner coach-mark guidance** (non-NN/g, lower confidence):
  - Spotlight only genuinely non-obvious interaction points.
  - Don't show many small popups at once.
  - The mark must not cover the thing it points at.

  — [Livefront: Put me in coach (marks)](https://medium.com/livefront/put-me-in-coach-marks-8146c61ca875); [UI/UX Atlas](https://uiux-atlas.pages.dev/lessons/ui-patterns/onboarding-and-first-run-experiences)
- **Contextual tips.** Northgard uses contextual tips to give information at the specific moment it's needed, without blocking progress. A studio retrospective found contextual tooltips the least intrusive style it tried, and saw players "learning by doing." Roblox docs say contextual tutorials work because players retain knowledge better when they practise an action as they learn it. — [uxdesign.cc](https://uxdesign.cc/games-ux-building-the-right-onboarding-experience-a6e99cf4aaea); [Roblox: onboarding techniques](https://create.roblox.com/docs/production/game-design/onboarding-techniques)
- **Low-stakes practice space.** Recommended so failure carries little penalty. — [uxdesign.cc](https://uxdesign.cc/games-ux-building-the-right-onboarding-experience-a6e99cf4aaea)
- **Overcooked lowers difficulty for learners.** Assist Mode in *All You Can Eat* gives longer timers and slower order decay, the same game with a softened clock. — [SteelSeries guide](https://steelseries.com/de-lu/blog/overcooked-all-you-can-eat-tips)
- **Diner Dash (closest genre analogue).** It opens in a tutorial mode with "simpler-than-pie" instructions on how to meet, greet and serve a growing flow of diners. Spin-offs start with few seats and a handful of customers. — [Gamezebo review](https://www.gamezebo.com/reviews/diner-dash-review/); [Cheatcc review](https://www.cheatcc.com/?p=62189)
- **Diner Dash–likes and text-heavy help.** An itch.io player found a fan game's text tutorial overwhelming until after one round of play, when the help "clicked." This is anecdotal. — [itch.io post](https://itch.io/post/12257833)
- **FTUE metrics.**
  - Log start/complete events with timestamps for every tutorial step.
  - Count drop at step N as players who finished step N-1 but not step N.
  - Look at median time per step.
  - Per-step drop-off pinpoints the bottleneck in a way a single completion rate hides.
  - Rank fixes by absolute players lost, not by percentage.

  — [GameAnalytics funnels docs](https://docs.gameanalytics.com/products-and-features/analytics-iq/funnels); [Unity standard events: onboarding](https://blog.unity.com/technology/standard-events-explained-part-1-onboarding); [Playio](https://blog.playio.co/mobile-game-onboarding-retention); [Bugnet (lower confidence)](https://bugnet.io/blog/how-to-measure-and-reduce-tutorial-drop-off)

### Inferences
- **Order of introduction.** A Service screen with about 7 element types (queue and patience rings, auto-staff rugs, chef-handled tables, rush-food minigame, courier, ad-card guests, timeline events) breaks Fan's "don't teach everything at once" and the Mario staging rule if all appear on day 1. A cheap, staged order:
  1. Day 1: queue, staff tables and chef tables only.
  2. Rush food the first time a shortage happens.
  3. Courier, ad guests and events when they first occur.
- **Just-in-time first encounter.** The first time each element appears, pause the clock (or slow it, Overcooked-assist style). Spotlight that one element with a ≤8-word line and require the actual action (e.g. "Click a guest to seat them") before resuming. This combines Fan (do, short text) with NN/g (spotlight only non-obvious points). In this codebase, time is already driven by the page's 200 ms tick and `data-t0/t1` bars, so a pause means shifting t0/t1 by the paused duration.
- **Measure each step in playtests.** Log a timestamp per tutorial step (first seat, first rush food, first courier) locally or to the console during playtests, to get a drop-off and time-per-step picture without analytics infrastructure.

### Gaps
- Kishōtenketsu applied to level design (Koichi Hayashida's Mario 3D Land interviews) was not retrieved.
- Portal's teaching approach was only mentioned in passing in a low-quality blog.
- The "Tutorials are Hard" and "Teaching Without Telling" GDC talks were not found or retrieved.
- NN/g's dedicated coach-mark article (Harley, 2014) was referenced but its content was not retrieved.

## 2. Academic evidence (Andersen et al. 2012, cognitive load, pre-training, scaffolding and fading, Gee)

### Takeaway
Tutorials pay off mainly when a game is complex or differs from its genre's norms. Andersen et al. found up to +29% play time in the most complex game and no significant effect in simpler games. Restricting freedom to focus attention on the target concept helped. On-demand help was mixed, even negative in one game. Learning-science principles (pre-training, worked examples with fading, simplified "fish tanks," low-risk "sandboxes") support staged, simplified first encounters that fade as competence grows.

### Cited Findings
- **Andersen, O'Rourke, Liu, Snider, Lowdermilk, Truong, Cooper, Popović, "The Impact of Tutorials on Games of Varying Complexity," CHI 2012, pp. 59–68, DOI 10.1145/2207676.2207687.**
  - 8 tutorial designs, 3 games (Refraction, Hello Worlds, Foldit), more than 45,000 players.
  - Tutorials raised play time by up to 29% in the most complex game (Foldit).
  - Tutorials had no significant effect in the two simpler games.
  - Conclusion: tutorial investment may be hard to justify when mechanics can be discovered by experimenting.
  - On-demand help improved engagement in Foldit, had no effect in Hello Worlds, and had a negative effect in Refraction.
  - Restricting player freedom to focus attention on a target concept improved learnability.
  - The effect of context-sensitivity (just-in-time presentation) was described as unclear.

  — [Project page](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/); [PDF](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf); [dblp](https://dblp.uni-trier.de/rec/conf/chi/AndersenOLSLTCP12.html). (PDF not fetchable here; claims are from excerpts.)
- **Mayer's pre-training principle.** People learn better from a multimedia lesson when they already know the names and characteristics of the main concepts. Pre-training moves some essential processing into an episode before the main lesson. Evidence: better transfer when a lesson was preceded by training on the components' names and behaviour (Mayer, Mathias & Wetzell 2002, *J. Exp. Psych.: Applied*; braking-system example). The principle is part of the Cognitive Theory of Multimedia Learning (dual channel, limited capacity). — [Cambridge: Pretraining principle chapter](https://www.cambridge.org/core/books/abs/multimedia-learning/pretraining-principle/01791D57F5D4164251269E6DF56A8BF1); [Mayer 2020 principles summary (PDF)](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf)
- **Unverified claim to avoid.** A secondary page claimed pre-training "closed the achievement gap in primary school." I could not verify it and do not rely on it. — [Dartmouth KB](https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655)
- **Worked examples, fading and expertise reversal.**
  - Worked examples reduce working-memory load for novices and should be faded as knowledge grows.
  - Expertise reversal: the same support can hinder more expert learners.
  - Fading reportedly beat both fixed worked examples and fixed problem-solving (Kalyuga et al. 2003, via a secondary source).
  - Adaptive fading removes support in response to demonstrated understanding (Salden et al. 2010).

  — [Wikipedia: Worked-example effect](https://en.wikipedia.org/wiki/Worked-example_effect); [Wikipedia: Expertise reversal effect](https://en.wikipedia.org/wiki/Expertise_reversal_effect); [Kalyuga, ASU PDF](https://faculty.engineering.asu.edu/mre/wp-content/uploads/sites/31/2020/02/Exp_Rev_LI06.pdf)
- **Game-specific evidence is thin.**
  - A Michigan State dissertation found expertise-reversal effects for game scaffolds, and that skill-based scaffolding aids non-gamers' comprehension in digital game-based learning (DGBL).
  - A physics-games chapter reports difficulty integrating worked-example scaffolds into game mechanics.

  — [MSU dissertation](https://d.lib.msu.edu/etd/870/FULL_TEXT/view); [Frontiers in Education 2024](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1293516/pdf)
- **Gee's learning principles** (*What Video Games Have to Teach Us About Learning and Literacy*, 36 principles; shorter articles list 13–16):
  - **Fish tanks:** simplified systems that stress a few key variables and their interactions, so learners aren't overwhelmed by the full system.
  - **Sandboxes:** situations close to the real thing but with greatly reduced risk, so learners feel competent before they are and fear of failure drops.

  — [Wisc "Good Learning Principles": Principle 39 Fishtanks](https://wisc.pb.unizin.org/goodlearningprinciples/chapter/principle-39-fishtanks-dealing-with-complexity/); [Glasgow summary of Gee](https://www.psy.gla.ac.uk/~steve/best/gee.html)

### Inferences
- **Andersen applies to this screen.** Restaurant Rivals' Service screen is closer to Foldit's complexity than Refraction's: several concurrent systems, and an unusual delegation rule. So Andersen's result argues *for* investing in teaching here. The "restrict freedom" finding supports a fish-tank first day (fewer element types, maybe one chef table and one staff table).
- **Avoid a help button.** Andersen's mixed or negative result for on-demand help suggests that adding a "?" help button is not, by itself, a substitute for the removed legend.
- **Pre-training slot.** A ~20–30 second pre-Service "meet your crew" moment can name the 3–4 actors before the clock starts: animal staff and their rug, your chef, the kitchen, the courier. This is pre-training, not a legend, and costs one screen.
- **Fading.** Spotlight and pause on the first encounter. On the second encounter, show a passive one-line hint with no pause. After that, nothing. That is fading with an expertise-reversal guard.

### Gaps
- I did not obtain Andersen's exact per-condition numbers for context-sensitivity and freedom (PDF blocked).
- I found no study isolating the pause-on-first-encounter effect in real-time games.

## 3. Teaching delegation ("staff do it, you do it") and the chef as a single attention resource

### Takeaway
No direct research was found. The best-supported tools are visual signalling of function (Fan: each character's look shows its role), learning by observing results (Fan: seeing an action's outcome teaches it), and contrast staging (Mario: show it alone first, then combined).

### Cited Findings
- **Visual signalling and observed outcomes.** PvZ makes each character's appearance signal its function. Fan says players often learn an action by seeing its results rather than being told. — [Game Developer](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan); [JikGuard](https://www.jikguard.com/news/gdc-2012-10-tutorial-tips-from-plants-vs-zombies-creator-george-fan)
- **Overcooked keeps teaching load low.** Its designers kept controls deliberately simple because a co-op group may have "four people to teach at once." Its readable small task set (chop, boil, fry) makes it accessible. The single-chef attention bottleneck *is* the game. — [Co-Optimus interview with Phil Duncan](https://co-optimus.com/interview/1838/page/1/indie-ana-co-op-and-the-overcooked-interview.html); [MCV Develop post-mortem](https://mcvuk.com/the-develop-post-mortem-overcooked/)
- **Overcooked Assist Mode** lets solo players switch between two chefs, and gives longer timers. — [SteelSeries](https://steelseries.com/de-lu/blog/overcooked-all-you-can-eat-tips)
- **Mario-style staging.** Show a mechanic alone in a safe space before combining it with pressure. — [Game Developer: Organic tutorials](https://gamedeveloper.com/design/examining-organic-tutorials)

### Inferences
- **Show the contrast.** Open day 1 with one guest walking to a staff rug and being handled with zero input: a "watch" beat. Then hold the next guest at a chef-only table with a pulsing ring and the line "Your tables need you. Click the guest" (≤8 words). The player learns the rule by contrast rather than by a legend.
- **Make "one place at a time" visible, not explained.** When the chef leaves the kitchen, show a "paused" badge on the rush-food station. On the first occurrence, a one-line toast says "Chef left, cooking paused." The consequence teaches the constraint (Fan's "see the result").
- **Signal ownership visually.** Rug colour under staff tables versus a chef-hat icon on chef tables, so function is readable from the art (PvZ principle). Note the team removed the legend: this is in-world signalling, not a legend.

### Gaps
- No academic or practitioner source specifically on teaching automation versus manual control, or attention as a resource. The recommendations above are extrapolations.

## 4. Teaching a timing minigame the first time

### Takeaway
Rhythm-game practice is the standard model: a short, unscored practice run before the scored attempt, a demonstration of correct timing, and replayable practice. Combine it with a pause or slowed clock so the first attempt isn't under service pressure.

### Cited Findings
- **Practice before scoring.** Rhythm Heaven gives each minigame a practice segment before the scored game, repeatable until comfortable ("lengthy practice for each tune beforehand should you need it"). — [GamesRadar: Rhythm Heaven Fever review](https://www.gamesradar.com/au/rhythm-heaven-fever-review); [Wikipedia: Rhythm Tengoku](https://en.wikipedia.org/wiki/Rhythm_Tengoku)
- **Demonstrated timing.** In Rhythm Heaven Groove's tutorial, holding a button plays an example of the correct timing before the player tries. Low-confidence fan and guide sources. — [Rhythm Heaven Groove fan guide](https://rhythm-heaven-groove.pages.dev/how-it-works); [Nintendo tips page](https://play.nintendo.com/news-tips/tips-tricks/rhythm-heaven-groove-tips-and-tricks/)
- **Two-player variant.** In Fever's two-player games, tutorial videos replace practice sessions. — [Rhythm Heaven Wiki: Two-Player Menu](https://rhythmheaven.fandom.com/wiki/Two-Player_Menu)
- **Do, then show.** Fan: learn by doing, with short text; let the player perform the action rather than read about it. — [Game Developer](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan)
- **Softened clock.** Overcooked Assist gives slower timers while learning. — [SteelSeries](https://steelseries.com/de-lu/blog/overcooked-all-you-can-eat-tips)

### Inferences
- **First rush-food attempt.**
  - Freeze the service clock.
  - Show one ghost demo of the timing (a marker sweeping and a "now!" pulse).
  - Let the player try with a generous window, and allow a retry with no cost.
  - Then unfreeze. Fading: the second time, a normal window with a one-line hint; afterwards, nothing.
- **Hide the controls for systems not yet taught.** Because the rush-food appears only on a shortage, the first shortage on a player's first day is the natural just-in-time trigger. If a player never hits a shortage, they never need the minigame tutorial.

### Gaps
- No research found on the optimal number of demo or practice repetitions, or on timing-window leniency for novices.

## 5. Onboarding two new players at once in a competitive game

### Takeaway
Evidence is sparse. Practitioners recommend letting each player progress at their own pace without forced waiting, teaching core mechanics before competitive or social layers, and using AI or risk-free practice before PvP (Hearthstone, Clash Royale).

### Cited Findings
- **Practice against AI first.**
  - Hearthstone's tutorial missions against AI heroes must be completed (as of 2025, can be skipped) before other modes. The Apprentice Track follows.
  - Practice mode offers AI at two difficulties.
  - Guides still advise trying some casual PvP while learning, because humans play differently from AI.

  — [Hearthstone wiki: New player experience](https://hearthstone.wiki.gg/wiki/New_player_experience); [Blizzard forum, 2025](https://us.forums.blizzard.com/en/hearthstone/t/2025-the-new-player-experience-the-apprentice-track/142501); [Blizzard Watch](https://blizzardwatch.com/2021/04/19/get-started-hearthstone/)
- **Clash Royale Training Camp.** The player battles an AI trainer as the tutorial; later battles there are risk-free practice. Chinese fandom wiki; may be dated. — [Clash Royale wiki](https://clashroyale.fandom.com/zh/wiki/%E8%AE%AD%E7%BB%83%E8%90%A5)
- **Pacing and core mechanics first.** Players should learn core mechanics before multiplayer, rankings and rewards. Tutorials that feel like a "waiting room," or that gate the first action, cause quits. Players should proceed at their own pace. Low-confidence blogs. — [Wayline](https://www.wayline.io/blog/tutorials-onboarding-level-design); [Rowatcher](https://rowatcher.com/news/onboarding-without-tutorials-teaching-through-play-in-roblox)
- **Group teaching in Overcooked.** Duncan notes groups of new players "usually just want to start playing," which drove a minimal control scheme. — [Co-Optimus](https://co-optimus.com/interview/1838/page/1/indie-ana-co-op-and-the-overcooked-interview.html)
- **Master's thesis on onboarding in cooperative multiplayer games** (HAW Hamburg). Found but not retrievable. — [PDF](https://reposit.haw-hamburg.de/bitstream/20.500.12738/19699/3/MA_Onboarding_in_cooperative_multiplayer_games.pdf)

### Inferences
- **Per-player pauses.** Restaurant Rivals' architecture helps here. Service is per-seat (`serviceRun(S, seat, ops, closed)`) and the result is logged when each player closes, so a tutorial pause on one player's screen does not need to block the other. Only the shared live market is real-time-coupled. First-encounter pauses should therefore be **per-player local pauses** of that player's service clock. When one player finishes earlier, show a "rival is still serving" waiting state (already implied by `expected()`).
- **Keep the competitive layer out of first contact.** Ad-card guests in the rival's colour and the 5 s ad popup are competitive and social elements. Per "core first, competitive later," their first-encounter explanation can come after the player has handled basic seating.
- **Determinism.** Any pause must be presentation-only. It must not change `ops` or seeded outcomes, or the two players' replays would diverge. Pausing the real-time bars is presentation; the logged ops stay the same.
- **Optional solo practice.** A solo practice day against a scripted or empty rival, mirroring Hearthstone and Clash Royale, is buildable with the existing local test mode.

### Gaps
- No research found on simultaneous two-novice onboarding in head-to-head games: wait-time tolerance, or whether to synchronise tutorial steps across players.

## 6. Returning players (skip, "don't show again," once-per-mechanic tips)

### Takeaway
Use per-mechanic "seen" flags so each first-encounter tip fires once. Offer an obvious skip. Keep a re-openable reference for players who want it. Expertise reversal says that continuing to show support to competent players can actively hurt.

### Cited Findings
- **Fire hints once.** Fix hint spam by recording that a hint was shown and suppressing repeats, with a per-hint shown flag and a cap on total shows. Low-confidence blog. — [Bugnet: hint spam](https://bugnet.io/blog/how-to-fix-hint-spam-same-tip-repeating-every-few-seconds)
- **Contextual tutorials triggered by play.** For example, entering a new zone or picking up a new weapon. — [Roblox onboarding techniques](https://create.roblox.com/docs/production/game-design/onboarding-techniques)
- **Easy skip.** Checklist item: "Is the tutorial skippable? (Respect the player's time and agency.)" — [Wayline](https://www.wayline.io/blog/tutorial-trap-onboarding-players)
- **Point to a help section.** Some games simply point to a help section the first time a mechanic appears. — [UX Planet](https://uxplanet.org/what-gaming-has-taught-me-about-user-onboarding-42fdf7f55bc9)
- **Skippable tutorial matches.** Hearthstone (2025) lets new players play *or skip* the three tutorial practice matches. — [Blizzard forum](https://us.forums.blizzard.com/en/hearthstone/t/2025-the-new-player-experience-the-apprentice-track/142501)
- **Expertise reversal.** Support helpful to novices can impede more expert learners, so fade it. — [Wikipedia](https://en.wikipedia.org/wiki/Expertise_reversal_effect)
- **NN/g: users frequently skip walkthroughs.** — [NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)

### Inferences
- **Store "seen" flags in `localStorage`.** Keys such as `rr.seen.chefTable`, `rr.seen.rushFood`, `rr.seen.courier`, `rr.seen.adGuest`, `rr.seen.event.tourBus`, wrapped in try/catch so a blocked storage just means tips show again. This is a per-device convenience. It needs no Firestore change and fits the CLAUDE.md rule that the engine stays deterministic and these are display-only.
- **Two controls.** A "Skip tips" toggle on the lobby or first Service screen sets all flags. A "Replay tips" option clears them.
- **Re-openable reference.** Per-step `RULES` in `app.js` already serves this role. Reach it via a small "?" that reopens the last tip, rather than restoring the legend. Andersen's mixed results for on-demand help mean it should be supplementary, not the main teacher.

### Gaps
- No evidence on global versus per-tip "don't show again" for games.
- No data on how long after a break a returning player benefits from re-shown tips.
