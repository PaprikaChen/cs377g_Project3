# Introducing new mechanics partway through play (for a "Day 3" tutorial: ad cards + events)

Source note: most findings below come from search-result excerpts, not full page reads. Full fetches failed because these hosts are not reachable from this session: notes.hamatti.org, uxdesign.cc, pausebutton.substack.com, gbgames.com, papersplease.fandom.com, escholarship.org. gamedeveloper.com was not tried. Claims marked **(excerpt)** were seen only in a search snippet and have lower confidence. I found no primary developer sources on the exact intro UI of Overcooked, Two Point Hospital, Balatro, Slay the Spire, Stardew Valley, Cook Serve Delicious or Frostpunk; these are listed under Gaps rather than described from memory.

## Q1. How do comparable games present a new mechanic on the day it unlocks?

### Takeaway
The pattern that recurs, with the best support from Papers, Please, PvZ, PlateUp and Hearthstone, is this: **announce one new thing at the start of the day/level, before any time pressure; mark what is new; let the player try it right away in a low-stakes context; keep the reference available later (rulebook, almanac or tooltip).** New things are spread out over time, roughly one per level or day, not stacked together.

### Cited Findings
- **Papers, Please:** a Daily Bulletin is shown at the start of each in-game day, and "new rules or changes to existing ones are often highlighted" **(excerpt; community guide)**. See [ludo.guide – Daily Bulletin](https://www.ludo.guide/guide/papers-please/daily-bulletin).
- **Papers, Please:** the rulebook is "updated with all the relevant new directives". On day 3, for example, entry for non-citizens becomes regulated and "a new chapter detailing document features has been added to your rulebook" **(excerpt)**. See [Papers Please Wiki – Rulebook](https://papersplease.fandom.com/wiki/Rulebook) and [Official Bulletin](https://papersplease.fandom.com/wiki/Official_Bulletin).
- **Papers, Please:** the day's clock does not start until the player calls in the first entrant, so the new rules can be read with no time pressure **(excerpt)**. See [ludo.guide](https://www.ludo.guide/guide/papers-please/daily-bulletin).
- **Papers, Please:** in a Japanese interview, Lucas Pope says the stress of a new rule arriving each day was deliberate, and he notes this goes against the usual practice of giving players time to practise before a new challenge **(excerpt, machine-summarised translation)**. See [Denfami interview](https://news.denfaminicogamer.jp/interview/240424b/2).
- **PvZ (George Fan, GDC 2012, "How I Got My Mom to Play Through Plants vs. Zombies"):** the talk gives 10 tutorial tips, including "blend the tutorial into the game" and "We strive to make it not feel like a tutorial at all" **(excerpt)**. See [Game Developer – 10 tutorial tips](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan) and [GDC Vault](https://gdcvault.com/play/1015541/contactUs).
- **PvZ:** "at the end of nearly every level, the player collects a new type of plant to use in subsequent levels". New things arrive "roughly every 5 levels and even then with limited features", for example only one shop purchase on the first visit **(excerpt; secondary analyses)**. See [uxdesign.cc – Lessons in onboarding from PvZ](https://uxdesign.cc/lessons-in-onboarding-from-plants-vs-zombies-d936d58c10c) and [Filament Games – 10 tips](https://filamentgames.com/blog/10-tips-designing-game-tutorial).
- **PvZ:** each character is drawn to show its function **(excerpt)**. Source: same GDC summaries as above.
- **PvZ:** new zombies are staged one at a time. For example, the Newspaper Zombie is "the first new zombie encountered in the Night stage" **(excerpt)**. See [PvZ wiki – Newspaper Zombie](https://plantsvszombies.wiki.gg/wiki/Newspaper_Zombie_(PvZ)).
- **PlateUp:** the first card is chosen at the start of Day 4, then every third day. Players pick between a Customer card (changes customer behaviour, e.g. "Morning Rush" concentrates arrivals at the start of the day) and a Food card **(excerpt; fan wiki)**. See [PlateUp wiki – Cards](https://wiki.plateupgame.com/Cards) and [Daily Operations](https://wiki.plateupgame.com/gameplay/DailyOperations).
- **Hearthstone:** keywords are bolded terms, and "mousing over a minion card with a keyword ability will generate a text display describing the ability". Blizzard says keywords "make learning cards easier, add flavor, condense card text". See [Hearthstone wiki – Keywords](https://hearthstone.wiki.gg/wiki/Keywords) and [Blizzard 26.0 patch notes](https://hearthstone.blizzard.com/en-gb/news/23921493/260-patch-notesv3finalfinal2pr_editfinal).
- **Two Point Hospital:** the first level, Hogsport, is the tutorial. Features unlock gradually (a training room after the first couple of levels), and the advisor points out things you can still act on, such as upgradeable machines **(excerpt; tips articles)**. See [GodisaGeek tips](https://godisageek.com/2020/02/two-point-hospital-8-tips-to-get-you-started/) and [Twinfinite tips](https://twinfinite.net/guides/two-point-hospital-tips-tricks-beginners/).
- **General principle ("isolation"):** introduce the new element in a controlled environment that doesn't punish immediate failure, and give a heads-up before it appears. The suggested steps are introduce safely, then reinforce the new mechanic together with an existing one **(excerpt)**. See [Wayline – Teaching mechanics](https://www.wayline.io/blog/teaching-mechanics-game-design-card-analogy) and [GameDev Academy – Intuitive tutorials](https://gamedevacademy.org/game-tutorials-guide/).

### Inferences
- For Day 3 in our game, a Papers, Please-style "Day 3 bulletin" is a good fit. Show it at the start of the Ads phase, mark the new items with a "NEW" tag, and have no timer running. Then reuse the same marker (the "NEW" tag or card art) the first time each thing appears during service, as PvZ does with a new zombie and Hearthstone does with its keyword tooltip.
- Two new systems (ads and events) arrive on the same day. Every source above spaces new things out. Possible ways to soften this:
  - Present them in two separate beats: ads at purchase time, events at service start or on first sight on the timeline.
  - Raise the stacking as a design concern for the team to decide. Per the team's AI policy, I am not proposing a change to the schedule.
- The PvZ idea of limiting choices on a first visit (e.g. only one shop purchase) maps onto "the first ad purchase is guided". Whether to restrict the number of cards on Day 3 is a design/rules decision for the team.

### Gaps
- No primary sources were found on the exact intro screens in Overcooked (per-level intro cards), Stardew Valley, Cook Serve Delicious, Balatro or Slay the Spire. Their existence and look are not confirmed here.
- The PvZ almanac "new plant/zombie" popup behaviour could not be confirmed from sources.

## Q2. Linking a decision made earlier (buying a face-down ad card) to its visible consequence later

### Takeaway
Learning research is clear that **the longer the gap between action and outcome, the harder people find it to see the causal link**. The gap is less harmful when people expect a delay or when a signal bridges it. People in delayed-feedback systems (the Beer Game) systematically ignore actions "in the pipeline". So the design should **bridge the gap with a consistent marker shown at decision time, at payoff time and in the recap**, and tell the player in advance *when* to expect the effect.

### Cited Findings
- **Delay weakens causal learning:** Shanks & Dickinson found that raising the action–outcome delay from 0 to 4 s caused a "systematic decline in both causal judgments and performance". Shanks, Pearson & Dickinson report that people fail to tell causal from non-causal actions once the delay exceeds about 2 s **(excerpt; review papers)**. See [core.ac.uk review PDF](https://core.ac.uk/download/29817058.pdf) and [Springer PDF](https://link.springer.com/content/pdf/10.3758/BF03197139.pdf).
- **Expectation offsets delay:** Buehner & May showed that delays "were no longer detrimental" when participants *expected* a delayed relation. Immediate pairings were still rated as highly causal regardless of expectation **(excerpt)**. See [PhilPapers record](https://api.philpapers.org/rec/BUETDC) and [escholarship PDF](https://escholarship.org/content/qt48j4h72c/qt48j4h72c.pdf?t=op2keo).
- **Intervening signals:** Alcalá et al. (2022) found that how temporal contiguity between action and outcome affects learning "depended on whether an intervening signal was present" **(excerpt)**. See [Derby repository PDF](https://repository.derby.ac.uk/download/928f0e0191707a5859503d8a33c09d18a732d1a204f8a595146ffe68e58deffb/1028279/2022-Alcala%2C%20Kirkden%2C%20Bray%2C%20Prados%20%26%20Urcelay_PBR.pdf).
- **Beer Game misattribution:** in Sterman (1989), subjects "fail to account for control actions which have been initiated but not yet had their effect" and are insensitive to feedback from their own decisions. This is a Management Science paper. See [MIT DSpace working paper](https://dspace.mit.edu/bitstream/handle/1721.1/2184/SWP-1933-18213539.pdf?sequence=1).
- **Framing helps:** Schaffernicht argues that this misperception may depend on how the feedback and delay structure is framed, and proposes making that structure "more easy to grasp" **(excerpt)**. See [System Dynamics proceedings abstract](https://proceedings.systemdynamics.org/2006/proceed/abstracts/226.htm).
- **Visual feedback as core:** one Balatro design analysis argues that "visual feedback design is not decoration but the core of the product" **(excerpt; secondary)**. See [Blake Crosley – Balatro design guide (KO)](https://blakecrosley.com/ko/guides/design/balatro).

### Inferences
- The team's colour coding (ad guests shown in the player's blue or pink, normal guests in taupe) and the ~5 s popup naming the card ("Flyers · brought 2 guests") act as the "intervening signal" that bridges the delay. To work as a bridge, the same colour and the same card art/icon should appear in three places:
  1. On the card at purchase.
  2. On the guest and in the popup during service.
  3. On a recap line at day end (e.g. "Flyers → +2 guests").
- At purchase, state *when* the effect will land (e.g. "Takes effect during today's service"). This sets the expectation Buehner & May found removes most of the delay penalty. It is UI wording only; the rules don't change.
- A ~5 s popup that fades is easy to miss while the player is busy cooking rush food. The research suggests the end-of-day recap is the reliable second channel for attribution. The Beer Game result predicts that players without a recap will credit or blame the wrong thing (e.g. blame their own seating speed for a "Bad review" drop).
- A low-cost bridge for the first ad guest: on Day 3, briefly mark the first coloured guest with a pulse or arrow back to the popup.

### Gaps
- I found no study measuring attribution popups or recap screens in commercial games specifically. The evidence is lab causal-learning work plus systems-dynamics work, applied to games by inference.

## Q3. Telegraphing scheduled events (tour bus on the timeline, city couriers)

### Takeaway
Games that are praised for fair surprises **show the threat before it lands**: Into the Breach shows all enemy intent, and Frostpunk announces the storm in advance and counts down to it. A fixed, visible marker on a timeline, followed by a short warning shortly before arrival, is the standard approach. Showing the event itself the first time it happens (bus drives up, 6 guests step off) completes the lesson.

### Cited Findings
- **Into the Breach:** reviews describe a core principle that "enemy intentions are visible", and say its display of all enemy intent influenced how developers think about turn-based tactics. Telegraphing Vek movement also "helped hasten the pace" **(excerpt)**. See [Kotaku review](https://kotaku.com/into-the-breach-the-kotaku-review-1823365331), [Game Developer – Road to the IGF](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-) and [sleepingbagworm analysis](https://sleepingbagworm.blogspot.com/2024/01/what-can-we-learn-from-into-breach.html).
- **Frostpunk:** the first game is described as "effectively a countdown to the Great Storm". Players learn of the coming storm and must save resources for it **(excerpt)**. See [Epic Games Store interview](https://store.epicgames.com/news/how-the-everlasting-winter-became-your-fiercest-enemy-in-frostpunk), [Inven Global – IGC 2018 talk](https://www.invenglobal.com/articles/6528/igc-2018-empathize-with-numbers-the-process-of-frostpunk-scenario-writing) and [Prima – survive the storm](https://primagames.com/tips/frostpunk-how-survive-storm).
- **Counterpoint:** one critic argues that fixed-day scripted storms make Frostpunk feel scripted **(excerpt)**. See [Game Wisdom](https://game-wisdom.com/?p=23589).
- **General telegraph guidance:** articles on telegraphing enemy attacks treat the warning beat as part of making a hit feel fair **(titles/excerpts only)**. See [Game Developer – Enemy attacks and telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing) and [bugnet – How to design enemy attack telegraphs](https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs).
- **PlateUp:** "Morning Rush" concentrates arrivals at the start of the day. This is an example of a card whose effect is a predictable arrival pattern rather than a random spike **(excerpt)**. See [PlateUp wiki – Cards](https://wiki.plateupgame.com/Cards).

### Inferences
- Tour bus: the timeline marker is the telegraph. On first occurrence, add:
  - a short "Bus arriving" warning a few seconds before it lands;
  - a camera/attention cue on the bus;
  - a one-line explanation of the timeline icon the first time it appears ("🚌 = 6 guests at once").
- City couriers: these are a recurring interaction, not a one-off spike, so they fit the PvZ "new zombie, first appearance" model better. Highlight the first courier waiting at the pickup window and show one line ("Courier waiting — carry a plate here"). After that, rely on the visual.
- The warning lead time is a tuning number the team should set and playtest; I am not proposing a value.

### Gaps
- I found no 11 bit studios primary source explaining how the storm warning UI was designed.

## Q4. Making rival/opponent interference feel fair

### Takeaway
Interference feels fair when the victim **could reasonably have seen it coming** and **can see afterwards what the rival did**. Mechanics that lock a player out, or that target the weakest player, are disliked. Our face-down cards are hidden by design. That makes the reveal and attribution moment (popup during service plus recap) the main fairness tool, along with telling players up front that rivals can play cards on them.

### Cited Findings
- A Star Wars: Unlimited design piece frames fairness of opponent disruption as whether the opponent "could reasonably have anticipated it" **(excerpt)**. See [Behind Unlimited – A theory on agency](https://starwarsunlimited.com/articles/behind-unlimited-a-theory-on-agency).
- "Take that" is defined as competitive moves that "directly attack an opponent's progress toward victory" without eliminating them. One designer prefers versions aimed at a specific opponent and part of their strategy ("You take that, and I'll take this"). He avoids mechanics that encourage targeting the weakest player **(excerpt)**. See [Berlin Game Design blog](https://berlingamedesign.blogspot.com/2012/03/take-that-and-ill-take-this.html).
- Lock-out style effects frustrate the blocked player even when they work as designed. "Lose a turn" effects are "generally frowned upon now" **(excerpt)**. See [Game Developer – fears, stuns and armor lock](https://www.gamedeveloper.com/design/an-issue-of-feelings-and-not-mechanical-balance-fears-stuns-and-armor-lock) and [Game Developer – team mechanics without frustration](https://www.gamedeveloper.com/design/designing-multiplayer-team-based-mechanics-without-adding-frustration).
- Designers must separate productive challenge from frustration caused by poor design **(excerpt)**. See [Pulsipher Game Design](https://pulsiphergamedesign.blogspot.com/2013/01/much-of-game-design-is-managing-and.html).

### Inferences
- In the Day 3 Ads intro, say explicitly that rivals can buy cards that affect *you*. Mention a "Swamp them" or "Bad review" example, and say how many cards the rival placed. The public `nRival` count already exists in the engine (architecture note 4), and it serves as a fairness telegraph.
- When a rival card fires, show the popup in the **rival's colour** with the card name, and give it its own recap line ("Rival's Bad review: −N guests"). Otherwise players will put the loss down to their own play (see the Beer Game finding in Q2).
- "Bad review removes guests" is close to a "take that" loss with no counterplay. If playtests show frustration, that is a design question to raise with the team, not something to change in code.

### Gaps
- I found no studies specific to hidden-then-revealed opponent cards in real-time games.

## Q5. Length, word count, and whether to pause

### Takeaway
Evidence favours **just-in-time, in-context, short** teaching over front-loaded text. In a 45k-player study, tutorials helped only in complex games. A mid-game intro should be one or two short beats per new thing, shown when the player first needs it. Pausing, or "the clock hasn't started yet", is used when there's something to read (Papers, Please). During real-time play, a non-blocking popup is the norm.

### Cited Findings
- Andersen et al., CHI 2012, studied over 45,000 players. Tutorials raised play time by up to 29% in the most complex game but "did not significantly improve engagement" in the two simpler games. The paper compares up-front, out-of-context presentation with presentation just before the player needs the information. See [GRAIL project page](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/) and [paper PDF](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf).
- In VR, context-sensitive tutorials produced higher positive emotion and motivation than non-contextual ones, with similar performance **(excerpt)**. See [Utrecht research portal](https://research-portal.uu.nl/en/publications/the-effects-of-context-sensitive-tutorials-in-virtual-reality-gam/).
- Caveat: context-sensitive help can annoy players. Microsoft's Office Assistant is the usual example **(excerpt)**. See [Game Developer – different types of tutorials](https://gamedeveloper.com/design/different-types-of-tutorials).
- Papers, Please lets players read the new rules with the clock stopped until they call the first entrant **(excerpt)**. See [ludo.guide](https://www.ludo.guide/guide/papers-please/daily-bulletin).
- PvZ's aim is that teaching "not feel like a tutorial at all" **(excerpt)**. See [Game Developer – George Fan tips](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan).

### Inferences
- **Ads phase (not real-time):** there's no timer, so a short blocking intro is fine. It could be a single card-style panel with three lines: what ads do, that cards are face-down, and that the rival can target you. Keep it skippable. This matches the project's "one-line hint" convention (architecture note 8) plus a one-time intro.
- **Service (real-time):** don't pause for the ad popup. The team's ~5 s fade is the right shape. For the *first* tour bus and *first* courier, a brief soft pause or slow-down is defensible, but it is a design choice. The game is two-player and synchronised, though each side runs its own service timer locally (note 5), so a per-player pause is technically possible. Whether it affects fairness is a question for the team.
- Rough word budget, inferred from the "one-line hint" convention and the sources rather than taken from a specific study: one line per in-service callout, and three to four short lines for the pre-service intro.

### Gaps
- I found no source giving a specific word count or seconds-of-reading target for mid-game intros. Any number would be a guess, so none is given.
