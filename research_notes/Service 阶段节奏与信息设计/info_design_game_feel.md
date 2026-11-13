# Information Design and Game Feel for a Real-Time-ish Service Screen

Scope: principles and concrete techniques for the Restaurant Rivals Service phase (2D, SVG/CSS, browser, 2 players, ages 13+, 1–2+ min per day, shortage decision cards with an 8 s timer while the clock runs).

Method note: direct page fetches to nngroup.com and gameaccessibilityguidelines.com were blocked by this session's network policy (host not allowed). Claims attributed to those sites below come from search-result excerpts of their pages, not full-text reads; verify the exact wording before quoting it in team docs. Most game-design sources here are practitioner talks/blogs, not controlled research; this is marked where relevant.

## 1. Information design: progressive disclosure, diegetic UI, hierarchy, attention, cognitive load

### Takeaway
Working memory holds roughly 3–5 chunks, and learning research says to strip non-essential material, add cues that point at what matters, and let the learner control the pace in segments. For the Service screen this argues for: one "focus" item at a time, state shown in the scene (diegetic/spatial) wherever it is glanceable, and secondary detail (star-check panel, price breakdowns) hidden until asked for or until the day's summary.

### Cited Findings
- Cowan (2001) argues the real short-term memory capacity limit is about four chunks, and that Miller's "7" was "more as a rough estimate and rhetorical device than as a real capacity limit." — [Cowan 2001, Behavioral and Brain Sciences](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/magical-number-4-in-shortterm-memory-a-reconsideration-of-mental-storage-capacity/44023F1147D4A1D44BDC0AD226838496)
- Cowan's 2010 review: when rehearsal is prevented, the limit is about three to five chunks in adults. — [Cowan 2010, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2864034)
- The exact number is still debated (four vs seven) and depends on what is counted and task details. — [Morra et al. 2024, PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11259112/)
- Mayer's multimedia learning principles: Coherence ("people learn better when extraneous material is excluded rather than included"), Signaling ("when cues are added that highlight the organization of the essential material"), Segmenting ("when a multimedia lesson is presented in user-paced segments rather than as a continuous unit"). Coherence and signaling are classed as ways to reduce extraneous processing; segmenting as managing essential processing. — [Mayer, Applying the Science of Learning (Pressbooks chapter)](https://pressbooks.pub/learningenvironmentsdesign/chapter/mayer-applying-the-science-of-learning-evidence-based-principles-for-the-design-of-multimedia-instruction/); [Mayer 2020 Multimedia Principles PDF](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf)
- Mayer's 2021 summary table reports coherence with an effect size of 0.86, supported in 18 of 19 tests. — [Mayer 2020 Multimedia Principles PDF](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf) (figure reported via search excerpt)
- Game UX framing (Nacke): putting needed information in the interface reduces memory load (e.g., Zelda maps/notebooks), and players shouldn't be overwhelmed with too much information at once during early learning. — [Acagamic: Perception, Attention, Memory Game UX Framework](https://acagamic.com/newsletter/2023/07/10/the-perception-attention-memory-game-ux-framework)
- Academic work applying cognitive load theory to game tutorials (eye-tracking on Baba Is You, Terra Nil) frames working-memory load as a major factor in how learnable a game is. — [Univ. of Vaasa thesis](https://osuva.uwasa.fi/bitstreams/1f347985-9c82-444b-9d7f-12d66a10c719/download); a Lisbon dissertation estimating cognitive load in games with NASA-TLX notes the concepts are "highly undervalued, or even unknown, in the gaming industry." — [IST Lisbon dissertation](https://fenix.tecnico.ulisboa.pt/downloadFile/1689244997261701/94117-Alberto-Ramos_dissertacao.pdf)
- Diegetic UI taxonomy (Fagerholt & Lorentzon 2009, "Beyond the HUD"): elements are classified by whether they exist in the game's space and whether they are part of the fiction → diegetic (both), spatial (in world, not fiction, e.g. outline/marker), meta (fiction, not in world, e.g. blood on screen), non-diegetic (neither, classic HUD). — [Chalmers thesis PDF](https://publications.lib.chalmers.se/records/fulltext/111921.pdf); [Game Developer: UI design in video games](https://gamedeveloper.com/design/user-interface-design-in-video-games)
- Critique: the categories blur, and "meta" is hard to apply in games without a strong narrative. — [Game Developer](https://gamedeveloper.com/design/user-interface-design-in-video-games); [gazdalman synthesis](https://gazdalman.github.io/synthesis_product-project/4_Interface)
- Empirical test (Peacocke et al. 2018, FPS): diegetic/spatial displays did well for weapon/ammo info, but a conventional HUD worked better for health info. — [MacKenzie/York Univ. EC2018](https://www.yorku.ca/mack/ec2018.html)
- Two Point Hospital (a management-sim reference): compact main UI with key info at a glance and sub-menus for detail; incoming messages arrive as a row of icons above the money display, with a tray for past messages — i.e., notifications queued as icons, not interrupting pop-ups. — [Magic Game World guide](https://www.magicgameworld.com/two-point-hospital-ui-and-reading-your-menus/)
- Alert-fatigue research from clinical software (analogy, not games) recommends avoiding interruptive pop-ups for low-priority items and making priority tiers visually distinct. — [AMA: 5 keys to a better EHR alert](https://www.ama-assn.org/practice-management/digital/5-keys-creating-better-ehr-alert)
- Diner Dash shows customer patience diegetically-ish as a heart meter on each customer; hearts drain while waiting and the customer leaves when empty; customer types differ in patience. — [Wikipedia: Diner Dash](https://en.wikipedia.org/wiki/Diner_Dash); [Den of Geek review](https://www.denofgeek.com/games/cooking-dash-dinertown-studios-pc-review/)

### Inferences
- Budget: on the Service screen, aim for no more than ~4 things a player must actively track at once (e.g., queue, seats, food on shelf, money/star delta). Anything else is either ambient (glanceable, not required) or deferred.
- Map current elements to the taxonomy: queue length, seated guests, plates on a shelf, thought bubbles = diegetic/spatial (good: no lookup, no reading). Star-check side panel and stats chips = non-diegetic, high reading cost → candidates to collapse or move to the end-of-day report (Mayer coherence/segmenting).
- Peacocke et al. suggests keeping one or two precise values (money, maybe stars) as conventional HUD numbers while moving "status" information (who is waiting, what's short) into the scene.
- Progressive disclosure for the decision card: first layer = the problem in one line plus 2–3 icon buttons with a single cost number each; second layer (tap "why?" or hover) = consequence detail. Consequences can also be shown after the choice as part of the resolution beat rather than before.
- Signaling: dim/blur the rest of the scene (CSS `filter` / overlay at ~40–60% opacity) and spotlight the guest group causing the shortage when a decision appears; a single pulsing outline on the relevant shelf/table is cheaper than text.
- Queue notifications (Two Point style): non-urgent events (e.g., an ad card paid off) become small icons that pile up on a ticker and are read later, not cards.

### Gaps
- No peer-reviewed study found that sets a numeric limit on simultaneous HUD elements for teens specifically; the 3–5 chunk figure is general adult cognitive psychology.
- Could not read NN/g's progressive disclosure article in full (host blocked).

## 2. Pause mechanics and time pressure

### Takeaway
Management/strategy games converge on "real time, but the player can stop the clock," and several (Frostpunk) automatically pause on important events/screens. Research on time pressure is mixed: it tends to reduce individual decision quality, but perceived-as-stimulating pressure can help. For a teaching game where the decision content is the lesson, freezing (or heavily slowing) the clock during a decision is better supported than an 8 s timer running alongside the clock.

### Cited Findings
- RimWorld: time controls in the lower right with pause, normal, 3x and 5x; beginner guides advise "pause early and pause often"; mods exist to auto-pause on threats, showing players want control over auto-pause. — [PC Gamer RimWorld guide](https://pcgamer.com/rimworld-guide); [RimWorld wiki: Ticks](https://rimworldwiki.com/wiki/Ticks)
- Play-speed controls multiply the game-time rate, and heavy colonies may not reach the selected rate. — [RimWorld wiki: Ticks](https://rimworldwiki.com/wiki/Ticks)
- FTL is a real-time-with-pause game; using the pause to manage crew and weapon fire is described as essential to success. — [TV Tropes: Real-Time with Pause](https://tvtropes.org/pmwiki/pmwiki.php/Main/RealTimeWithPause)
- Frostpunk (player-reported): events pause the game and reset game speed to default; selecting a road/building and opening the research screen or Book of Laws pause the game. — [Steam discussion](https://steamcommunity.com/app/323190/discussions/0/1696045708643572493/); [Steam guide: Pause in Survivor Mode](https://steamcommunity.com/sharedfiles/filedetails/?id=1418367505)
- Players complain about the speed reset ("Please stop resetting my defined game speed"), i.e., auto-pause is welcome but forcibly resetting chosen speed annoys. — [Steam discussion](https://steamcommunity.com/app/323190/discussions/0/1696045708643572493/)
- Frostpunk's Survivor mode removes free pausing specifically to raise pressure and prevent micromanagement. — [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=1418367505)
- An essay reads Frostpunk's pausing law/decision screens as giving players time "to think about it in emotional, social and cultural loops." — [Gabriel Chauri: Frostpunk decisions](https://www.gabrielchauri.com/frostpunk-decisions/)
- Counter-view (developer of Siege Survival): free active pause would remove the tension that time management creates; a player-designer reported that after unpausing, play "started to feel boring" because micromanagement had all been done during the pause. — [Steam: Siege Survival active pause thread](https://steamcommunity.com/app/1167140/discussions/0/3109142236153649698/)
- Review evidence: "moderate evidence that, on average, decision quality and payoff performance for individual decision making is reduced under time pressure," not robust for strategic decisions. — [PMC table (review)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5913387/table/Tab2)
- Meta-analysis (Belli et al. 2024, J. Consumer Research; 213 effect sizes, 83 papers, 65,574 respondents): time pressure's effect on risk preference is inconsistent — 38.5% of effects show increased risk-seeking, 61.5% the opposite; the nature of the time constraint is a proposed moderator. — [EconPapers record](https://econpapers.repec.org/RePEc:oup:jconrs:v:50:y:2024:i:6:p:1172-1197.); [Consumer Researcher summary](https://consumerresearcher.com/how-does-time-pressure-influence-risk-preferences-answers-from-a-meta-analysis)
- Stress alone had little effect on decision quality until combined with time pressure (single study, Univ. of Melbourne). — [Pursuit, Univ. of Melbourne](https://pursuit.unimelb.edu.au/articles/stressed-and-rushed-your-decisions-might-suffer)
- Software-engineering systematic review: better decision quality when time pressure was perceived as stimulating/enjoyable; no effect when perceived as annoying. — [Kuutila et al., arXiv 1901.05771](https://arxiv.org/pdf/1901.05771)
- Accessibility guidance recommends an option to adjust game speed and a low-pressure mode where tasks aren't time-limited. — [Game Accessibility Guidelines (via search excerpt)](https://gameaccessibilityguidelines.com/?p=3102); [Unity accessibility basics](https://unity.com/blog/video-game-accessibility-basics)
- Mayer's segmenting principle (user-paced segments beat continuous presentation) also supports learner-controlled pauses. — [Mayer chapter](https://pressbooks.pub/learningenvironmentsdesign/chapter/mayer-applying-the-science-of-learning-evidence-based-principles-for-the-design-of-multimedia-instruction/)

### Inferences
- Options for the team to choose between (design decision is theirs):
  1. Hard pause on decision (Frostpunk-style): service clock and patience bars freeze while the card is open. Pros: removes the "rushed and odd" feel, matches the teaching goal. Cons: tension drops; two-player sync is unaffected because service is per-seat and replayed from `ops`.
  2. Slow-mo on decision: clock drops to e.g. 0.25x while the card is open (keeps a sense of life without punishing reading time).
  3. Keep the timer but make it generous and pause-able, with a default action shown explicitly ("if you don't choose: they leave").
- Preserve player-set speed after an auto-pause (avoid the Frostpunk complaint).
- If speed controls are added, 1x/2x (maybe 3x) with fast-forward only during idle stretches is the common pattern; a "skip to next event" button is a cheap alternative for idle periods.
- The Siege Survival observation suggests a pause should freeze only the decision, not allow free re-planning of everything; otherwise the post-pause stretch feels empty.
- Because the lesson is in the trade-off (rush cost vs borrowing vs losing guests), time pressure that is "annoying" rather than "stimulating" likely costs learning; pressure can return as an optional harder mode in later days.

### Gaps
- No official developer source (GDC talk/postmortem) found on Frostpunk's or FTL's pause design rationale; Frostpunk details are player-reported.
- No study found specifically on teens' decision quality under game time pressure.
- Football Manager and XCOM not researched in depth (tool-call budget).

## 3. Game feel / juice: anticipation, telegraphing, beats, feedback

### Takeaway
Juice = layered, cheap feedback (motion, particles, sound, small camera moves) that amplifies events; telegraphing = clear cues with enough lead time before something happens. For a management screen the relevant parts are amplification (feedback on money/stars/guests) and support/clarity, structured as an event beat: telegraph → reveal → (decision) → resolution → return to calm.

### Cited Findings
- Swink defines game feel as "real-time control of virtual objects in a simulated space, with interactions emphasised by polish." — [Wikipedia: Game feel](https://en.wikipedia.org/wiki/Game_feel)
- Scholars note this definition excludes games without real-time control in simulated physical space; Wilson distinguishes Swink's "Game Feel" from broader "game feel" (any feeling a game communicates). — [Pichlmair & Johansen, arXiv 2011.09201](https://arxiv.org/pdf/2011.09201)
- Pichlmair & Johansen (IEEE Trans. on Games 2022) surveyed 200+ sources and organize game feel into three experience domains — physicality, amplification, support — whose polish activities are tuning, juicing and streamlining respectively; juicing is tied to empowerment and clarity of feedback, tuning to cohesion and predictability. — [arXiv abstract](https://arxiv.org/abs/2011.09201); [ITU pure](https://pure.itu.dk/en/publications/designing-game-feel-a-survey/)
- "Juice It or Lose It" (Martin Jonasson & Petri Purho, GDC Europe 2012 Indie Summit) takes a plain block-breaker and adds layers one at a time (particles, screenshake, sound, tweening animations, ~20 tweaks), showing how each changes the feel. — [GDC Vault](https://gdcvault.com/play/1016487/Juice-It-or-Lose); [Game Developer](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- Counterpoint published at the time: indies should resist overdoing juice; too much polish can cost clarity/immersion. — [Game Developer: Indies, resist the urge](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)
- "The Art of Screenshake" (Jan Willem Nijman, Vlambeer): ~30 small tweaks to a dull shooter. A recreation lists: animation, faster time-to-kill, muzzle flash, impact effects, hit reaction, knockback, permanence (debris stays), camera lerp, screenshake, hit pause, recoil. — [Game Developer](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games); [DK Liao recreation breakdown](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects) (list not verified against the original slides)
- Disney principles applied to UI: IxDF maps squash & stretch, arcs, secondary action and exaggeration to interface motion (e.g., confetti burst on submit, arcs instead of straight paths). — [IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)
- Counter-view: Willenskomer argues Disney's principles solve a different problem (character animation) and UI motion should instead be about how interface objects behave over time. — [UX in Motion: Disney is Dead](https://medium.com/ux-in-motion/ui-animation-principles-disney-is-dead-8bf6c66207f9)
- Telegraphing: readability = telegraphing (what happens before) + expectations (what happens after); cues must be calibrated to the pace so there is time to react; clarity and lead time are the two key properties. — [Game Developer: readability in ARPGs](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs); [Game Developer: enemy attacks and telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- Forms of telegraph cues: large gestures, color coding, voice/sound cues; for patterns too complex to "chunk," add an explicit visual aid like a warning symbol. — [Game Developer: enemy attacks and telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- "If a player can't tell why they [failed], then they can't learn." — [Game Developer: readability in ARPGs](https://gamedeveloper.com/blogs/designing-for-difficulty-readability-in-arpgs)
- Tim Cain on telegraphing consequences at immediate, short-term and long-term scales to support agency. — [Tim Cain notes](https://turbo-wiki.pages.dev/tim-cain/temple-of-elemental-evil/telegraphing-consequences) (secondary wiki)
- Multimodal feedback (visual + audio + haptic) for the same event is recommended in game UX guidance. — [Acagamic framework](https://acagamic.com/newsletter/2023/07/10/the-perception-attention-memory-game-ux-framework)

### Inferences (concrete techniques for SVG/CSS)
- Event beat template (e.g., tour bus):
  1. Telegraph (1–3 s before): bus silhouette/horn icon at the street edge, small "!" over the door, a short sound.
  2. Reveal (~300–500 ms): bus slides in with ease-out, slight overshoot ("squash" on stop), guests pop out staggered 80–120 ms apart.
  3. Decision (if needed): clock freezes/slows, scene dims, spotlight on the 6 guests and the empty shelf/table; card with icons.
  4. Resolution (~500–800 ms): outcome animates in the scene (guests sit or walk away sad), money/star delta floats up from the source (+$ green rising text, -$ red falling) and "flies" to the HUD counter, counter ticks/bumps.
  5. Return to calm: brief hold (≈1 s) before the next event can start, so beats don't overlap.
- Space events so only one beat is active at a time; queue others (prepService already scripts the day, so the page can schedule beats with minimum gaps).
- Juice money/star changes with "permanence": a coin pile on the counter or a tip jar that fills, not only a number.
- Use juice sparingly on routine events (a guest sitting) and strongly on rare/important ones (inspector, bus); per the counterpoint, too much juice on everything reduces clarity.
- Screenshake/hit-pause are probably inappropriate except maybe tiny shakes for a big loss; a brief "freeze frame" (100–150 ms) on the moment a shortage is detected is a cheap way to mark it.
- Sound: one short distinct cue per category (arrival, problem, money in, money out); respect a mute toggle.

### Gaps
- No research found quantifying juice effects on learning in educational games.
- Could not verify Nijman's full list against the original video.

## 4. Timing guidelines: animation durations, reading time, idle pacing

### Takeaway
UI motion should mostly sit in the ~100–500 ms range (≈200–300 ms for big changes); 100 ms feels instant and ~1 s is the limit for keeping flow of thought. Text on screen needs time proportional to length: ~17 characters/second is the common subtitle limit for children's content. Idle stretches should be filled with low-salience ambient life and short-cycle micro-events rather than nothing, or compressed with fast-forward.

### Cited Findings
- NN/g: when an animation makes substantial screen changes (e.g., a modal sliding in), 200–300 ms can be appropriate. — [NN/g: Animation Duration](https://nngroup.com/articles/animation-duration) (search excerpt; full text not fetched)
- A 200–500 ms "optimal" range is attributed to NN/g by secondary sources; not confirmed in NN/g's own text. — [Dribbble: Duration of animation](https://dribbble.com/shots/4586994-Duration-of-animation)
- Response-time thresholds attributed to NN/g: ~100 ms perceived as instant; ~1 s upper limit for the user's flow of thought; show progress indication for actions over ~1 s. — [Val Head: How fast should UI animations be](https://valhead.com/?p=2978); [MIT Design for the Web lecture](https://designftw.mit.edu/lectures/animation/index.html) (secondary)
- Material Design (M2, via Material UI): standard 300 ms, complex 375 ms, entering screen 225 ms, leaving 195 ms (exits faster than entrances). — [Material UI transitions source](https://app.unpkg.com/@material-ui/core@4.12.4/files/es/styles/transitions.js)
- Material Components Android: short duration tokens 50/100/150 ms (short1–3). — [MDC Android Motion docs](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
- Material 3 tokens reportedly span 200 ms (short4) to 600 ms (long4), standard easing `cubic-bezier(0.2, 0, 0, 1)` — from a third-party summary, unverified against m3.material.io. — [Third-party M3 motion skill](https://www.skills.lc/shelbeely/Shelbeely-Agent-skills/shelbeely-shelbeely-agent-skills-skills-material-design-3-motion-skill-md)
- Material: short durations with standard easing feel direct/functional; long durations with emphasized easing feel stylized (e.g., 300 ms standard vs 650 ms emphasized). — [Material: motion customization](https://material.io/design/motion/customization.html)
- Legacy Material motion guidance on duration and easing. — [m1.material.io duration & easing](https://m1.material.io/motion/duration-easing.html)
- Subtitle reading speed: Netflix English guidelines allow up to 20 characters/second for adults and 17 cps for children's programmes (one table lists 13 cps for children — conflicting, unverified). — [Subtitle reading speed guide](https://subtitle-toolset.pages.dev/guides/subtitle-reading-speed/)
- Eye-tracking: comprehension fell as subtitle speed rose across 12, 20 and 28 cps (adult viewers). — [Cambridge: Why subtitle speed matters](https://cambridge.org/core/services/aop-cambridge-core/content/view/A7DB0CBF5910353143738CF9C1721317/S0142716421000503a.pdf/div-class-title-why-subtitle-speed-matters-evidence-from-word-skipping-and-rereading-div.pdf)
- Accessibility: let players progress through text at their own pace. — [Game Accessibility Guidelines (search excerpt)](https://gameaccessibilityguidelines.com/?p=3102)
- Survey of NN/g animation advice: timing is one of trigger, transformation, duration, easing; be mindful of accessibility and of annoying users. — [NN/g video: UX animations](https://nngroup.com/videos/ux-animations)

### Inferences
- Suggested starting values for the team to tune in playtests:
  - Button/hover feedback 100–150 ms; small element enters 200–250 ms (ease-out); exits ~150–200 ms (ease-in); decision card/scene dim 250–300 ms; money "fly to HUD" 400–600 ms; celebratory/stylized moments up to ~650 ms.
  - Reading time for any text that must be read: ≈ characters ÷ 15 s plus ~1 s orientation (a 60-char line ≈ 5 s). An 8 s timer for a card containing a problem description, three options with prices and consequences very likely exceeds this budget — the sum of the text is the real constraint.
  - Combine with segmenting: put only ~1 short sentence (≤ ~60–80 chars) on the decision card; icons/numbers on buttons.
- Idle pacing: ambient life with no decision content (steam from the kitchen, guests eating/chatting animations, people walking past outside, clock hands moving) keeps the scene alive without adding load; low-stakes micro-events (a guest leaves a tip, a review bubble) can fill gaps if spaced. A fast-forward button or "skip to next event" handles truly empty time. (Derived from the coherence principle: ambient motion should be low-contrast and slow so it doesn't compete for attention.)
- Respect `prefers-reduced-motion` in CSS to shorten/disable non-essential motion.

### Gaps
- Could not fetch NN/g's animation-duration article directly; exact NN/g numbers beyond 200–300 ms for large changes are secondhand.
- No source found giving a research-based "ambient life" density or micro-event frequency for idle periods; this is a design inference.
- No teen-specific reading-speed standard found; 17 cps is a children's TV benchmark, not research-derived.

## 5. Accessibility and readability for younger players

### Takeaway
Never rely on color alone (pair with icon/shape/label), keep text short and self-paced, prefer icons for recurring concepts, and offer speed/low-pressure options.

### Cited Findings
- "Avoid using color alone to convey information." — [Game Accessibility Guidelines (search excerpt)](https://gameaccessibilityguidelines.com/?p=21)
- Xbox Accessibility Guideline 103: no cue should depend on color alone; where unavoidable, let players pick colors. — [Xbox XAG 103](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/103)
- Pair color with a shape, icon, pattern or label; more time between actions "can make a big difference." — [Unity: accessibility basics](https://unity.com/blog/video-game-accessibility-basics)
- Option to adjust game speed; low-pressure mode where tasks aren't time-limited; let players progress through text at their own pace. — [Game Accessibility Guidelines (search excerpt)](https://gameaccessibilityguidelines.com/?p=3102); [IGDA GA-SIG Top Ten](https://igda-gasig.org/?p=42)
- Hidden UI barriers in learning games (from an educational game studio). — [Filament Games blog](https://www.filamentgames.com/blog/the-hidden-barriers-in-game-ui-and-how-to-spot-them)
- Telegraphs relying only on subtle animation are less accessible; explicit on-screen prompts improve accessibility. — [r/gamedesign discussion (community)](https://lr.in.psf.lt/r/gamedesign/comments/1fn63ts/question_from_a_layman/longnhs/?context=3)

### Inferences
- Shortage/decision states: use red + "!" icon + shape change (e.g., empty plate outline), not red alone; money up/down with +/− sign and arrow, not just green/red.
- Use a fixed icon vocabulary (art.js already has an icon set) for food, table, guest, money, star, time; reuse the same icon on the scene, the card button and the report so players learn it once.
- Numbers: show one number per option (the cost), not formulas; move "expect X guests · seat min(tables, food)" math to the pre-service/report screens.
- Provide a speed toggle or "relaxed" mode as a settings option; both players' results don't depend on wall-clock speed if the page only logs `ops`, so a per-device speed choice is plausibly compatible with deterministic replay (team should confirm against serviceRun's `closed` handling).

### Gaps
- gameaccessibilityguidelines.com full list could not be fetched; exact guideline tiers (basic/intermediate/advanced) not verified.
- No source found on recommended font sizes or sentence length for ages 13+ in games specifically.
