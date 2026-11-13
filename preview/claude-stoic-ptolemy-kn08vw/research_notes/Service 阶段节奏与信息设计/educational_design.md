# Educational / serious-game design principles for a real-time Service phase (Restaurant Rivals, ages 13+)

Scope note: research done with web search snippets plus some failed fetches (shura.shu.ac.uk, eprints.whiterose.ac.uk and filamentgames.com were blocked by this session's network). Where a claim rests on a search-result summary rather than the full paper, that is noted. No claims below are invented. Anything without a source is in "Inferences" or "Gaps".

## 1. Decisions over dexterity: time pressure, extraneous load, twitch mechanics, and when minigames help (intrinsic integration)

### Takeaway
The evidence favours putting the learning content (rush vs borrow vs let go, and their costs) into the core mechanic itself and keeping time pressure low while players are still learning. A tapping minigame tests motor speed, not the business decision, so it is extrinsic to the learning goal. Seductive-detail and dynamic-decision-making research suggests it would add extraneous load and could hurt transfer, especially if it runs on a clock the player can't pause.

### Cited Findings
- **Intrinsic integration (Habgood & Ainsworth 2011, *Journal of the Learning Sciences* 20(2):169–206).** In Zombie Division, a maths game for 7–11-year-olds, the learning content was built into the core combat mechanic, while the extrinsic variant used quiz breaks. Children learned more from the intrinsic version under fixed time (Study 1, n=58) and spent about 7 times longer playing it when they could choose freely (Study 2, n=16). — [Habgood & Ainsworth 2011 record](https://shura.shu.ac.uk/3556); [Nottingham repository](https://nottingham-repository.worktribe.com/output/23577510/motivating-children-to-learn-effectively-exploring-the-value-of-intrinsic-integration-in-educational-games)
- Habgood's thesis frames intrinsic integration as: (1) deliver the learning material through the parts of the game players enjoy most, and (2) embody it in the game's core mechanics and flow. — [Habgood 2007 thesis PDF](https://eprints.nottingham.ac.uk/10385/1/Habgood_2007_Final.pdf); summarised in the search result for the [Outnumb3r3d follow-up](https://arxiv.org/abs/1103.1791) (search snippet only)
- **Mechanism challenged and refined.** Cutting & Iacovides (2022, pre-registered) argue the original paper did not show that motivation caused the learning gain. Their results point to an attentional mechanism: with intrinsic integration, players attend only to the features the game task needs and ignore task-irrelevant information. — [Cutting & Iacovides 2022 PDF](https://eprints.whiterose.ac.uk/189921/1/LearningByDoingCuttingAndIacovides090822.pdf) (read via search snippet; the full text could not be fetched)
- **Seductive details.** A meta-analysis summarised on Wikipedia reports that seductive details (interesting but irrelevant additions) hinder learning under most conditions, mainly by raising extraneous cognitive load. The effect is larger when learners can't control the pace and when the details are frequent or in the same format as the core content. — [Seductive details (Wikipedia, with meta-analysis citations)](https://en.wikipedia.org/wiki/Seductive_details)
- A study with 240 middle-school students found that seductive details hurt both recall and problem-solving transfer when learning net games in PE. — [Research Quarterly for Exercise and Sport 2006](https://informahealthcare.com/doi/abs/10.1080/02701367.2006.10599384)
- **Counterpoint.** An eye-tracking study found that game elements capture attention and may raise extraneous load, but they tended to boost motivation rather than lower performance (the emotional-design view). — [Springer, Instructional Science 2023](https://link.springer.com/content/pdf/10.1007/s11251-023-09632-w.pdf) (search snippet)
- **Time pressure in dynamic decision-making (Gonzalez, CMU DDM Lab).** People who trained a triage-like resource-allocation task at a slow pace later performed more accurately at transfer, and even under high time pressure, than people who trained only under high time pressure. — [Gonzalez & Brunstein 2009](https://www.cmu.edu/dietrich/sds/ddmlab/papers/GonzalezBrunstein2009.pdf)
- Gonzalez 2005 (*Human Factors*) found detrimental effects of high task workload. Low workload during training helped people adapt to high workload later. — [Gonzalez 2005 PDF](https://www.cmu.edu/dietrich/sds/ddmlab/papers/GonzalezHumanFactorsMarch2005.pdf)
- Workload and time pressure are listed among the conditions under which people struggle to learn dynamic tasks. — [Gonzalez 2012/2017 review PDF](https://www.cmu.edu/dietrich/sds/ddmlab/papers/Gonzalez2012.pdf) (search snippet)
- A Taiwanese experiment with 5th graders (10 s per spelling turn) found time pressure significantly changed time per word, words attempted and accuracy ratio, and changed perceived ease of use and value, but not game anxiety. Only the abstract was available. — [Research in Educational Testing, 2020](https://doi.org/10.6137%2fRECT.202012_(124).0004)
- Sevcenko et al. (2021) used time-pressure-based in-game metrics as a proxy for cognitive load (time-based resource-sharing model). Time pressure consumes working memory that would otherwise go to processing. — [Frontiers in Psychology 2021](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.572437/full)
- **Instructional support meta-analysis** (Wouters & van Oostendorp 2013, *Computers & Education* 60(1), k=107). Support improved learning (d=.34), and more so when it helped learners select relevant information (d=.46). — [dblp record](https://dblp.uni-trier.de/rec/journals/ce/WoutersO13.html); [Bohrium summary](https://www.bohrium.com/paper-details/a-meta-analytic-review-of-the-role-of-instructional-support-in-game-based-learning/813283383005151233-9279)
- **Practitioner guidance.** A Filament Games designer advises starting turn-based and adding real-time elements only with "really, really good reasons", noting that turn-based games build in purposeful moments of reflection. — [Filament Games blog](https://www.filamentgames.com/blog/real-time-vs-turn-based-mechanics-learning-games) (search snippet; the page itself was blocked)

### Inferences
- The learning objective in Service is the trade-off: rush costs money, borrowing costs money and may be refused, letting guests go hurts stars. The intrinsically integrated version makes that choice the mechanic. A tap-fast minigame for rush food adds a motor-skill variable unrelated to the decision. Per Cutting & Iacovides, it also pulls attention to a task-irrelevant feature (finger speed). It is also unfair across devices (touch vs mouse) and abilities.
- If the team still wants a tactile beat, a low-risk compromise is a short confirm gesture that doesn't change the outcome (pure feel). Another option is to tie any skill element to the business variable itself, e.g. choosing how many portions to rush, with price visible, rather than how fast you tap. This is a design suggestion for the team to decide on, not a researched mechanic.
- Gonzalez's slow-training result supports making early days slow, or pausing on shortages. Real time pressure, if wanted at all, belongs in later days once the decision is familiar.
- Seductive-detail effects grow when learners can't control the pace. That argues for pausing (or heavily slowing) the patience bar while a shortage choice is open.

### Gaps
- No study found that tests a dexterity minigame inside a business or management simulation against a pure-decision version.
- No full-text access to Cutting & Iacovides 2022 or the Wouters moderators for feedback/reflection specifically.

## 2. Making cause and effect visible: feedback timing, debriefing/recap, "why" explanations, and how business sims show consequences

### Takeaway
Debriefing and reflection are where most game learning is consolidated, and delays between action and consequence are the classic reason sim players misread systems (Beer Game). Service should show each consequence right next to its cause as it happens (immediate, local feedback). An end-of-day recap should then name the causal chain (delayed, reflective feedback, which supports transfer). Commercial business sims (Capsim, Lemonade Stand) use the same two-tier pattern of live feedback plus a per-round report.

### Cited Findings
- **Debriefing.** Garris et al. (2002) argued debriefing is essential to link the game experience to learning, and that weak or missing debriefing explains poor sim outcomes. Crookall (2010, *Simulation & Gaming*) calls debriefing vital for learning. — [Crookall 2010 editorial (RePEc)](https://econpapers.repec.org/RePEc:sae:simgam:v:41:y:2010:i:6:p:898-920); [Koreascience paper citing Garris](https://koreascience.kr/article/JAKO202413043267753.pdf)
- Crookall & Promduangsri argue that meaningful learning from a game is accomplished in the debriefing, and that the debriefing should be participant-centred. — [EGU2018 abstract](https://meetingorganizer.copernicus.org/EGU2018/EGU2018-4991.pdf?pdf)
- Schwägele et al. (2021, TU Delft) found most debriefing approaches focus only on post-action reflection, and propose an "impulse-debriefing spiral" with short reflection prompts during play. — [TU Delft repository](https://repository.tudelft.nl/record/uuid:dea6c3be-7d3a-4557-a93a-e4c169e986a1)
- A 2024 paper notes a lack of empirical research on how effective debriefing is in business simulation games. — [Journal of Educational Technology Systems 2024](https://https-sage-cnpereading-com-443.webvpn1.xju.edu.cn/doi/10.1177/00472395241250004) (search snippet)
- **Misperception of feedback (Sterman 1989, MIT Beer Game).** Players failed to grasp feedback loops and time delays and attributed the swings to outside events, even though their own orders generated them. Delays (deliveries arriving at the old rate for weeks) are the core difficulty. — [Sterman, MIT working paper](https://dspace.mit.edu/bitstream/handle/1721.1/2184/SWP-1933-18213539.pdf?sequence=1); [MIT Beer Game page](https://web.mit.edu/jsterman/www/SDG/beergame.html)
- Repeated practice does improve Beer Game performance, but it often takes considerable experience to learn to plan ahead. — [Fu & Gonzalez, CogSci 2006](https://www.cmu.edu/dietrich/sds/ddmlab/papers/FuandGonzalezCogSci2006.pdf); [Martin, Gonzalez & Lebiere 2004](https://www.cmu.edu/dietrich/sds/ddmlab/papers/MartinGonzalezLebiere2004.pdf)
- Schaffernicht (2006) modified the Beer Game to make its delay structure more salient, suggesting misperception depends on how the system is framed and shown. — [Albany archive](https://archives.albany.edu/concern/daos/zk51w1349)
- **Feedback timing (Shute 2008, "Focus on Formative Feedback", *RER* 78(1)), as summarised by secondary sources.** Immediate feedback is recommended for complex or new tasks and early learning and helps retention. Delayed feedback helps transfer. The overall evidence on timing is mixed. — [eLearning Industry summary](https://elearningindustry.com/providing-feedback-dos-donts); [ASCD summary](https://ascd.org/el/articles/research-says-good-feedback-is-targeted-specific-timely); [U Twente paper on feedback timing](https://ris.utwente.nl/ws/files/6806219/effects.pdf) (Shute's original was not read directly)
- **Kiili's experiential gaming model.** A validation study lists clear goals, unambiguous feedback, a sense of control and challenge matched to skill as flow antecedents for educational games. — [Kiili 2006, Human Technology](https://jyx.jyu.fi/bitstream/123456789/20195/1/HT_2006_v02_n02_p_187-201.pdf)
- **Capsim (vendor description).** After each round, an automated debrief report covers each company's performance. The newer AI debrief explains "what happened, why", the standout and struggling teams, and "three things each team should fix next". Instructor debriefs cover cause and effect, links to concepts, and guidance for the next round. — [Capsim features](https://www.capsim.com/business-simulations/features); [Capsim masterclass: how to debrief](https://www.capsim.com/masterclass/how-to-debrief-like-an-expert?hsLang=en)
- Capsim's professor guide suggests leaving students time between rounds to digest results before deciding. — [Capsim professor guide 6](https://ww3.capsim.com/guides/professor/professor-guide/6-timeframesabf8.cfm)
- **Lemonade Stand.** The weather forecast is the visible demand driver for inventory decisions, customer faces give live feedback on the recipe, and an end-of-day report shows sales, profit and customer feedback. — [EconKY classroom PDF](https://win.net/~econky/simulations/Lemonade%20Stand.pdf); [Math-spark description](https://math-spark.pages.dev/games/lemonade-stand) (low-authority page; the design description is consistent across sources)

### Inferences
- In Restaurant Rivals the delays are short but real: ad cards flip into guests, and stars carry over to the next day. The recap should explicitly link earlier decisions to later outcomes ("3 guests left because food ran out at 7:40 → star −0.5"). Otherwise players will blame randomness, as Beer Game players blamed external events.
- Show each consequence at the moment and place it happens: money changes float next to the rush button, an unhappy face leaves through the door. Then repeat it in the day report, grouped by cause. This matches the immediate-plus-delayed pattern and the existing `stepLine()` / `PRIVATE_WHY` approach.
- A one-line in-play "impulse" prompt (per Schwägele) fits the project's existing one-line `hint()` convention.
- A counterfactual line in the recap ("If you had rushed 2 food: +$X, no star loss") would make the trade-off concrete. This is an inference from the debriefing literature, not a tested feature.

### Gaps
- I couldn't access primary sources on Hot Shot Business, Virtonomics, Cesim, Harvard sims or Startup Company feedback design. Only Capsim (vendor) and Lemonade Stand (secondary) are covered.
- Shute 2008 was not read directly; the timing guidance is from secondary summaries.

## 3. Pacing for teens: attention, flow, stress vs engagement, scaffolding across days

### Takeaway
Flow research (Csikszentmihalyi via Kiili) and Gee's "regime of competence" both call for challenge that rises with skill. Combined with Gonzalez's slow-first training result and Mayer's segmenting principle, this supports learner-paced, segmented service on early days, with mechanics added one at a time on later days.

### Cited Findings
- Kiili's experiential gaming model ties flow to challenge balanced against skill, clear goals and unambiguous feedback, and stresses designing and balancing challenges to produce an optimal learning experience. — [Kiili 2006](https://jyx.jyu.fi/bitstream/123456789/20195/1/HT_2006_v02_n02_p_187-201.pdf); [DOAJ record](https://doaj.org/article/4e2840363a294dcd974a334074ad82b9)
- Gee's learning principles include well-ordered problems (early ones lead to later, harder ones), risk-taking with low cost of failure, and keeping players within but at the edge of their "regime of competence". — [Gee, "Good Video Games and Good Learning" PDF](https://ocw.metu.edu.tr/file.php/85/ceit706/week7/PaulGee.pdf); [BrainPOP summary](https://educators.brainpop.com/?p=40509)
- **Mayer's segmenting principle.** People learn more deeply from learner-paced segments than from a continuous presentation. Mayer & Chandler (2001) used a 140-second tutorial with Continue buttons. The handbook reports 10/10 supporting tests with a median d≈0.79, though attribution is unclear from the snippet. — [Cambridge Handbook chapter](https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pretraining-and-modality-principles/4110A2275F6DCD02DAB1F8B37BA7E5CE); [OSU summary](https://u.osu.edu/multimedialearning/multimedia-learning-principles/6-the-segmenting-principle)
- Pre-training (learning the components before the full system) is in the same chapter as segmenting. — [Cambridge Handbook chapter](https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pretraining-and-modality-principles/4110A2275F6DCD02DAB1F8B37BA7E5CE)
- Evidence on learner control of pacing is mixed beyond segmenting (Aly, Elen & Willems 2005; Dalton 1990), and individual differences such as working memory matter. — [Segmentation & WMC paper (Scribd)](https://es.scribd.com/document/278291313/WMC-segmentation)
- Slow-paced training transfers better to high-pressure conditions than training under pressure. — [Gonzalez & Brunstein 2009](https://www.cmu.edu/dietrich/sds/ddmlab/papers/GonzalezBrunstein2009.pdf)
- Stiller & Schworm (small n=39): cognitive load in a game rose for about 15 minutes and then levelled off, and a hypertext group learned more than the game group. The authors call the results limited. — [eLearning Inside summary](https://news.elearninginside.com/game-based-learning-cognitive-load/)
- A Game Developer analysis notes new players can be overwhelmed by real-time pressure, and turn-based play lets players set their own learning curve. — [Game Developer: Turn-based vs real-time](https://www.gamedeveloper.com/game-platforms/analysis-turn-based-versus-real-time)

### Inferences
- Suggested scaffold for the team to evaluate: Day 1 has service with one shortage type, slow or paused at each choice, plus the recap. Day 2 adds borrow-a-table with refusal. Day 3+ adds events. Later days could tighten patience timers once choices are familiar.
- A target of 1–2 minutes of service is compatible with segmenting if each shortage is its own "segment" (pause → choose → watch the result).
- Stress: no teen-specific study on time-pressure stress in learning sims was found. The Taiwanese study (children) found no effect on anxiety, which is weak evidence either way.

### Gaps
- No reliable source found for teen-specific attention spans in games (popular "8-second attention" claims are not credible and were excluded).
- Primary Csikszentmihalyi texts weren't fetched; flow is cited through Kiili.

## 4. Two-player sync: one player finishes earlier; spectating the rival

### Takeaway
I found almost no research on idle time in two-player serious games. The design literature only flags concurrency as a multiplayer challenge. Recommendations here are inference.

### Cited Findings
- Multiplayer serious game design has to balance single-player, multiplayer and serious-game concepts at once, and concurrency is a named challenge, but the source offers no specific idle-time solutions. — [TU Darmstadt WGGS12](https://www.kom.tu-darmstadt.de/papers/WGGS12-1.pdf) (search snippet)
- In an asynchronous multiplayer peer-quiz game, students "powergamed" the rules to maximise points, a reminder that competitive framing shifts players toward optimising the score metric. — [IJSG article](https://journal.seriousgamessociety.org/index.php/IJSG/article/download/554/474) (search snippet)
- Capsim and similar round-based sims reveal an industry-wide comparison after each round ("Latest Round Results"), which is a form of seeing the rival's outcome after decisions are locked. — [Capsim professor guide 3](https://ww3.capsim.com/guides/professor/professor-guide/3-instructor-environment034f.cfm)

### Inferences
- The player who finishes first could get a reflective task rather than dead time: read their own recap first, which is already the `report` phase. Alternatively, run both services from a common clock so they end together. In the replay architecture, each player's service is local, so either option is feasible.
- Showing a delayed, read-only summary of the rival's day (guests served, stars) after both close mirrors the Capsim round-results pattern and supports social comparison without letting players copy choices mid-service. Showing it live would leak private choices (events are private per CLAUDE.md).

### Gaps
- No empirical study found on spectating or waiting in two-player educational sims.

## 5. Pause-and-decide vs real-time in simulation-based learning

### Takeaway
No controlled study directly comparing pausable and real-time versions of the same learning sim was found. The closest evidence (Gonzalez's slow vs fast training, Mayer's learner-paced segmenting, seductive details being worse without pace control) all points the same way: give the learner control of pace at decision points.

### Cited Findings
- Slow-paced training beat high-pressure training on transfer, including under time pressure. — [Gonzalez & Brunstein 2009](https://www.cmu.edu/dietrich/sds/ddmlab/papers/GonzalezBrunstein2009.pdf)
- Learner-paced segments beat continuous presentation. — [OSU segmenting summary](https://u.osu.edu/multimedialearning/multimedia-learning-principles/6-the-segmenting-principle)
- Seductive-detail harm is larger without learner pace control. — [Seductive details (Wikipedia)](https://en.wikipedia.org/wiki/Seductive_details)
- A Waterloo thesis compared real-time and turn-based sessions with 36 participants, looking at pace and perceived competence. Its findings were not visible in the snippet. — [UWSpace](https://uwspace.uwaterloo.ca/handle/10012/10347)
- Designer opinion: turn-based rewards analysis and preparation, real-time rewards pattern recognition and execution. — [Game Developer](https://www.gamedeveloper.com/game-platforms/analysis-turn-based-versus-real-time)

### Inferences
- A hybrid "real-time with pause on decision" (the open-shortage `pending` state already in `serviceRun()`) gets the liveliness of watching guests arrive while keeping decisions reflective. Whether patience bars keep draining during a pending choice is the key tuning knob. The evidence above favours freezing them, or at least slowing them a lot, on early days.

### Gaps
- No direct experimental comparison of pausable and real-time versions of a management sim was found; the Waterloo thesis results were not accessible.
