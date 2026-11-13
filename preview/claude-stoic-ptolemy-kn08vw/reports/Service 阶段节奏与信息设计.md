# 把 Service 从“刷日志”改成“看店”

**结论先行：** Service 现在的问题不在总时长，而在节拍太密、信息太多。页面每 750 ms 播一个 script step，一次缺货决策屏上大约有 45–55 条信息，还配一个 8 s 倒计时。参考游戏的一天并不短：PlateUp 第一天的营业条是 100 s ([PlateUp wiki](https://wiki.plateupgame.com/gameplay/DailyOperations))，Overcooked 一关通常 4 分钟 ([TrueAchievements](https://www.trueachievements.com/game/Overcooked/walkthrough/3))。它们只是把少量客人分散在这段时间里。所以把一天拉到 1–2 分钟以上，关键是改节拍：用“预告 → 到达 → 先坐满 → 暂停提问 → 结果 → 回落”这样的分段节拍，代替固定的 750 ms 步进；状态尽量画在场景里（门外排队、桌子、厨房出餐口），侧栏和数字推迟到收工和 report 再看。好消息是 `serviceRun()` 的结果只取决于日志里的 `ops`，时间、暂停、速度、动画都不进日志（`app.js:1450`、`engine.js:316`）。因此上面这些改动几乎都只动页面，不影响 deterministic replay，可以直接做、直接 playtest。真正要团队拍板的规则问题只有几项，最突出的是：`maxOps = floor(patience/opTime) = 4`，而巡游大巴一来就是 6 人，玩家怎么操作都救不全一整车；另外，页面计时器目前直接读 `CFG.service`，改页面时长会顺带改规则。教育研究也支持在决策点暂停或大幅放慢：慢节奏训练比高压训练迁移得更好 ([Gonzalez & Brunstein 2009](https://www.cmu.edu/dietrich/sds/ddmlab/papers/GonzalezBrunstein2009.pdf))，让学习者自己控制分段的节奏也学得更深 ([OSU 摘要](https://u.osu.edu/multimedialearning/multimedia-learning-principles/6-the-segmenting-principle))。

> 可信度说明：这次调研时 PlateUp wiki、nngroup.com、gameaccessibilityguidelines.com、gamedeveloper.com、filamentgames.com、shura.shu.ac.uk、eprints.whiterose.ac.uk 等多个站点无法直接抓取，相关结论只读到了搜索结果摘要。下文凡是标“（摘要）”的，都应先核对原文再写进团队文档。所有时长分两类：**【有出处】**是参考游戏或研究里的原始数字；**【推断】**是本报告为我们游戏推算的起始占位值，必须靠 playtest 调。按团队 AI 政策，规则和数值的改动只列成选项，由团队决定。

## 750 ms 一步、8 s 一问：节拍比参考游戏密一个数量级

当前代码（`origin/uiux-v2` @ 23b35fd）里，`prepService()`（`engine.js:182-249`）在开门前就把当天所有随机结果掷完，写进 `S.script[seat]`。`serviceRun()`（`engine.js:254-312`）则是一个纯函数：先播完全部 `info`（卡牌结果、口碑掷骰、事件、预约、检查），再按顺序处理三类客人：regulars 一整组，然后是 mid 事件，最后按洗牌顺序处理每张卡带来的一组客人。只要一组人坐不下，就开一个 shortage episode。引擎里没有“秒”的概念，patience 和 opTime 只通过 `maxOps = floor(8/2) = 4`（`engine.js:261`）影响规则。

所有节奏都是页面造出来的。`serviceTick()`（`app.js:399-422`）每 750 ms 推进一步（Fast-forward 时是 120 ms），遇到 pending 就停下来，跑一个 `CFG.service.patience` 秒（8 s）的耐心环；每次 Rush/Borrow 占用 `opTime`（2 s）的 busy。随后发生四件事：

1. **开场是空白。** 所有 `info` step 都排在客人到达之前，而 `logLine()` 对 `card`/`rep` 返回 null（`app.js:1066-1081`）。假设有 3 张卡、2 次口碑掷骰，开场约 3.75 s 里横幅一直显示默认文字，没有客人移动。
2. **大巴几乎没有预警。** 进入营业后，大巴只是队列里的一组。它出现在门口、“Next in line” 提示亮着的时间只有一步，也就是 750 ms（快进时 120 ms），然后直接触发 8 s 决策（`app.js:1211-1220`）。
3. **每推进一步都整页重建。** `liveSig()` 包含 `idx`，所以每推进一步都会触发一次 `innerHTML` 重建（`app.js:293`）。CSS transition 因此没法在两步之间运行，场景里几乎没有动作。
4. **opTime 进度条可能看不见。** `.prog` 的样式只写在 `.decide .prog` 下（`style.css:405`），而决策卡用的 class 是 `decide2`。这一点尚未截图验证。

参考游戏的节拍要稀疏得多。PlateUp 把当天预计的组数放在开店前的准备阶段展示，额外客流写成 “+x”；rush 卡会提前在时间条上标图标 ([PlateUp wiki: Rush Hour](https://wiki.plateupgame.com/Events/RushHour2023))（摘要）。Papers Please 的时钟要等玩家叫第一个入境者才开始走 ([ludo.guide](https://www.ludo.guide/guide/papers-please/citations))。Overcooked 有些关卡在第一单完成后才开始计时 ([TrueAchievements](https://www.trueachievements.com/game/Overcooked/walkthrough/8))。三者的共同点：**开局给一段不计时的阅读窗口，高峰提前预告**。我们现有的 “Open the doors →” 按钮（`app.js:1139-1159`）已经起到 Papers Please 式开门仪式的作用；缺的是开门之后的节拍设计。

【推断】一个可调的起点：画面上每 3–6 s 出现一次值得注意的变化，同一时刻只进行一个事件节拍。按一天有 regulars 加 3–4 组卡牌客人、外加一个 mid 事件来算，约 5–6 个节拍，每个 12–18 s，合计 75–110 s；再加上暂停决策的时间，自然落在 1.5–2+ 分钟。这条推算建立在 PlateUp 100 s 一天、客人分散到达的模式上，但没有任何来源给出“日内到客曲线”，曲线的形状要靠试玩来定。

## 状态画进场景，屏幕上只留 4 件要盯的事

成年人在不能复述的条件下，工作记忆大约是 3–5 个 chunk ([Cowan 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2864034))。Mayer 的 coherence 原则说，去掉无关材料学得更好，并报告效应量 0.86 ([Mayer 2020 PDF](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf))（数值来自摘要）。signaling 原则说，要用提示把注意力引到关键内容上。对照之下，当前缺货屏（截图 14，`app.js:1176-1200`、`app.js:505-530`）分成约 9 个区域：顶栏约 15 项、三个 chips、floor SVG、决策卡、三个按钮（每个按钮有价格、一句后果和快捷键提示）、Star check 面板约 8 项、Why this happened。同一时刻，星级后果在三个地方各说一遍，钱出现在四个地方，旁边还有一个 8 s 的环在倒数。

UI 分类学上，状态信息可以做成 diegetic 或 spatial，也就是画在游戏世界里，读起来不费力；精确的数值则留在 HUD ([Fagerholt & Lorentzon 2009](https://publications.lib.chalmers.se/records/fulltext/111921.pdf))。一项 FPS 实验发现，HUD 显示精确数值的效果更好 ([Peacocke et al. 2018](https://www.yorku.ca/mack/ec2018.html))。Diner Dash 把耐心画成每位客人头上的爱心 ([Wikipedia](https://en.wikipedia.org/wiki/Diner_Dash))。Two Point Hospital 把不紧急的消息排成一排小图标，玩家想看时再点，不弹窗打断 ([Magic Game World](https://www.magicgameworld.com/two-point-hospital-ui-and-reading-your-menus/))。【推断】Service 中玩家需要主动盯的东西只保留四样：门外的队、空桌、出餐口的盘子、钱/星的变化。其余的要么做成可以瞥一眼的环境信息，要么推迟到后面再看。

下表是逐项建议。除特别注明外，全部是**页面层改动（a 类），不影响 replay**。

| 现有元素（位置） | 建议 | 理由 |
| --- | --- | --- |
| 顶栏约 15 项（`app.js:491` 等） | 营业中收起成：天数、现金、星级、对手状态的小点 | 减少常驻信息 |
| chips：`+$X tonight` / `Seated` / `Left unhappy`（`app.js:1117-1123`） | 前两个改成场景里的小费罐或柜台硬币堆，“永久性”反馈；`Left unhappy` 改成门边一个带哭脸图标的计数 | 第三个数字直接决定星级，保留，但画进场景 |
| “Cards tonight” 侧栏（`app.js:1124-1131`） | 换成场景上方的营业进度条，把大巴等到店事件按位置画成图标（PlateUp 式） | 预告高峰，取代文字列表 |
| Star check 侧栏（`app.js:1083-1089`） | 营业中隐藏；决策卡上只保留一行 “−1★ if they leave”；完整三档表放到收工屏和 report | 同一后果目前说了三遍 |
| “Why this happened” 侧栏（`app.js:1190-1199`） | 移进决策卡的第二层（点 “why?” 展开），并在 report 里按原因归组复述 | progressive disclosure |
| 448 px 侧栏的双栏布局（`app.js:719`） | 营业中场景占满宽度，侧栏折叠 | 场景本身就是信息 |
| 横幅 🛎️ `logLine()` | 改成一行事件条；`logLine()` 返回 null 的 step 不占播放时间 | 去掉开场空白 |
| “Next in line: N guests…” 文字和 T 徽章（`app.js:1211-1220`） | 改为门外画出真实排队的人，大巴用车的 sprite | 位置本身就是状态 |
| 副标题规则 “Every guest needs 1 table + 1 plate” | 只在第 1 天或首次出现时显示 | 用 pre-training 代替常驻说明 |
| 缺货气泡只画 🍽（盘子优先，`app.js:1025-1028`） | 既缺盘子又缺桌子的客人两个都画 | 截图 14 里盘子为 0 时仍提供 Borrow，容易误导 |
| Rush 按钮上的利润算式 | 按钮只留图标和一个价格数字；算式放进 “why?” 和 report | 每个选项只给一个数字 |
| opTime 进度条（`.prog` 只匹配 `.decide`） | 给 `.decide2 .prog` 补样式 | 疑似 bug |
| Fast-forward 按钮 | 保留，改名为“跳到下一件事”，只在空闲段可用 | 压缩空闲时间 |

还有一处页面改动会改变玩家能做的事，需要团队点头：盘子为 0、借桌子已经救不了人时，要不要把 Borrow 置灰？引擎本身仍允许这个操作，所以不影响 replay。不过“明知没用还去借”也可能正是团队想让玩家犯一次的错。

决策卡本身也要减字。按儿童字幕 17 cps 的上限 ([字幕速度指南](https://subtitle-toolset.pages.dev/guides/subtitle-reading-speed/))（来源权威性低，另一张表写的是 13 cps）推算【推断】，一张卡读完大约需要“字符数 ÷ 15 + 1 s”。现在卡片加三个按钮的文字远超 8 s 能读完的量。建议卡上只放一句话（≤60–80 字符），按钮做成 icon 加一个价格；后果在玩家选完之后，作为结果节拍演出来。

## 大巴事件按“预告—下车—先坐满—再提问”拆成六拍

教育文献对 Service 的方向很明确：学习内容是“Rush 花钱 / Borrow 花钱还可能被拒 / 放人走掉星”这组权衡，它应该就是核心机制本身。这就是 intrinsic integration。在 Zombie Division 里，把数学融进核心玩法的版本学得更好，自由选择时玩家玩它的时间也长了约 7 倍 ([Habgood & Ainsworth 2011](https://nottingham-repository.worktribe.com/output/23577510/motivating-children-to-learn-effectively-exploring-the-value-of-intrinsic-integration-in-educational-games))。后续研究认为，起作用的机制是注意力只放在任务需要的特征上 ([Cutting & Iacovides 2022](https://eprints.whiterose.ac.uk/189921/1/LearningByDoingCuttingAndIacovides090822.pdf))（摘要）。因此不建议加“快速点击出餐”这类手速小游戏。另外，学习者无法控制节奏时，seductive detail（有趣但无关的细节）的危害更大 ([Seductive details](https://en.wikipedia.org/wiki/Seductive_details))。

游戏手感方面，Pichlmair & Johansen 把 game feel 分成 physicality、amplification、support 三个维度 ([arXiv 2011.09201](https://arxiv.org/abs/2011.09201))。telegraphing 的两个要点是清晰和提前量 ([Game Developer](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing))；“玩家看不出自己为什么失败，就学不到东西” ([Game Developer](https://gamedeveloper.com/blogs/designing-for-difficulty-readability-in-arpgs))。Two Point 的急救地图用“正常 → 橙 → 红”标出时限，失败画成幽灵，成功画星 ([Two Point wiki](https://two-point-hospital.fandom.com/wiki/Speedy_Recovery_DLC))。Papers Please 在一天结束时逐条列账 ([ludo.guide](https://www.ludo.guide/guide/papers-please/citations))。另有一条反面提醒：juice 加过头会损害清晰度 ([Game Developer](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-))，所以普通客人入座只给轻量反馈，大巴、检查员这类稀有事件再给强反馈。

基于以上，下面是大巴事件的建议节拍。所有时长都是【推断】的起始占位值；UI 动效的量级参考 Material 进入 225 ms、退出 195 ms、标准 300 ms ([Material UI 源码](https://app.unpkg.com/@material-ui/core@4.12.4/files/es/styles/transitions.js))【有出处】，以及大幅界面变化用 200–300 ms ([NN/g](https://nngroup.com/articles/animation-duration))【有出处·摘要】。

| 拍 | 画面 | 时长（占位） | 实现要点（a 类） |
| --- | --- | --- | --- |
| 0 预告 | 开门时进度条上已经有大巴图标；flip 屏照旧盖 “THE BUS CAME! +6” 章 | 全程可见 | 页面从 `v.out` 往后找 `src:'bus'` 的 `arrive` step，script 早已确定，不需要新的随机数 |
| 1 临近 | 街边出现车影，门上冒 “!”，配一声短提示音 | 到达前 3–5 s | 调度器按 step 序号提前触发 |
| 2 下车 | 大巴滑入（ease-out，带一点回弹），6 人逐个下车走向门口 | 滑入 300–500 ms，每人间隔 80–120 ms，走到门口约 0.5–0.8 s | 用挂载时播放的 keyframes；`.floor .paypop` 有先例 |
| 3 先坐满 | 有空桌和盘子的人先入座，剩下的人在门口排队，头上画缺什么 | 1–2 s | 引擎最终坐下 `min(n, can)` 人，ops 只会增加 `can`，所以先演出 `can` 人入座和 replay 结果一致 |
| 4 提问 | 定格 100–150 ms，场景压暗 40–60%，聚光到排队的人和空的出餐口，弹出决策卡 | 见下文“时间压力”的选项 | 就是现有的 `pending:{kind:'short'}` |
| 5 结果 | 客人坐下或垂头离开；+$ 从出餐口飘到 HUD，计数跳一下 | 0.5–0.8 s，飘钱 400–600 ms | 正负号加箭头，不只靠红绿区分 ([XAG 103](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/103)) |
| 6 回落 | 场景恢复，只有环境动效（厨房冒热气、路人经过） | ≥1–3 s 内不开始下一拍 | 保证节拍不重叠 |
| 复盘 | report 里一行：“Tour bus: 6 arrived · 4 seated · 2 left · +$X” | 不限时 | 沿用 `stepLine()` / `PRIVATE_WHY` 的思路 |

同一模板也适用于 regulars（拆成逐个走进来的小队）、mid 事件，以及私有事件（检查员、预约客人）。私有事件建议给检查员一个独特的 sprite，玩家一眼认出来，不用读日志。注意：私有信息只在本机显示，现在就是这样。

技术上要调整的地方：

- **固定间隔换成按 step 计时。** 把固定的 750 ms 换成一个 `stepDur(step)` 表。`card`、`rep` 这类 info step 已经在 flip 屏演过一遍，营业中时长设为 0 或合并成一拍；`arrive` 的时长按人数算。
- **场景层原地更新。** 不要每一步都整页重建。可以学 `updateBars()`，用 data 属性移动元素；`liveSig()` 只管控制区。这也符合 CLAUDE.md §6 的要求：不要替换指针下面的按钮。
- **尊重 `prefers-reduced-motion`。**

## 时间压力是选项，不影响 replay，但目前和规则耦在一起

研究的总体方向偏向在决策时停表。时间压力平均会降低个人决策质量 ([PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5913387/table/Tab2))。有一项综述发现，压力被感知为刺激时决策质量更好，被感知为烦人时没有这种效果 ([Kuutila et al.](https://arxiv.org/pdf/1901.05771))。慢速训练迁移得更好 ([Gonzalez & Brunstein 2009](https://www.cmu.edu/dietrich/sds/ddmlab/papers/GonzalezBrunstein2009.pdf))。也有反对意见：Siege Survival 的开发者认为自由暂停会抽掉张力 ([Steam](https://steamcommunity.com/app/1167140/discussions/0/3109142236153649698/))。Frostpunk 遇到事件会自动暂停，但同时把玩家选好的速度重置回默认，玩家对重置有抱怨 ([Steam](https://steamcommunity.com/app/323190/discussions/0/1696045708643572493/))（玩家自述）。另外，我没有找到任何餐厅游戏在营业中途弹窗暂停的先例。所以“暂停提问”是我们为教学目标做的偏离，不是类型惯例。

replay 层面的事实很清楚：页面只记录 `{k, ops}`。超时、Let go、速度、暂停都只改变本地的 `sv.closed`。用 `closed = Infinity` replay 时，一个 episode 的结果只取决于日志里记下的 ops（`app.js:423`、`engine.js:316`）。所以下面三种做法都是 a 类：

1. **硬暂停**：决策卡打开时，时钟和耐心环冻结。
2. **慢放**：决策卡打开时整体降到约 0.25×【推断】。
3. **长计时**：保留倒计时，但放宽到 15–20 s【推断，无出处】，并明确写出默认结果“不选则离开”。

两名玩家的营业是各自在本机跑的，一方暂停不会卡住另一方，代价只是对手在 “Closed for the night” 页多等一会儿。还有一个反直觉的事实值得团队知道：在规则层面，“拖延”本来就没有代价。耐心环在 replay 里唯一的作用，是超时后替玩家点了 Let go。

**耦合点在这里：** 页面的耐心时长和 busy 时长直接读 `CFG.service.patience` / `opTime`（`app.js:419`、`app.js:432`、`app.js:1197`）。而 `maxOps` 是由这两个值相除得出的（`engine.js:261`）。想把页面倒计时从 8 s 改成 15 s，如果直接改 CFG，每个 episode 的尝试上限就从 4 变成 7。这是规则改动，会重算进行中的对局。建议做法：页面新增自己的显示常量，例如 `SVC_UI.decideMs` 和 `busyMs`（a 类）；如果团队想让“尝试次数”成为一个明确的数值，就把 `maxOps` 拆成独立的 CFG 项（b 类，值由团队定）。

**b 类：会改规则或数值，需要团队决定。** 以下只列选项和取舍，不给推荐值。

| 问题 | 现状 | 选项与取舍 |
| --- | --- | --- |
| 大巴 6 人对 4 次尝试 | 一整组算一个 episode，最多补 4 份或 4 桌（`engine.js:261-277`）。乡村店 6 桌，regulars 约 6 人，所以大巴到达时几乎必然缺货，且救不全 | 保持现状（“大团救不全”本身就是教学点）；单独放宽 maxOps；把大团拆成多个 episode。后两种都会重算对局 |
| 大巴在队列中的位置 | 按卡牌洗牌顺序，排在 mid 事件之后（`engine.js:242-245`、`306`） | 固定时段（比如作为当天的高峰）更容易做预告和波形，但这会改变 arrival 规则 |
| 按天逐步加入机制（scaffolding） | 从第 1 天起事件概率就是 60% | 第 1 天不出事件、之后逐天加入，符合 Gee 的“well-ordered problems” ([Gee PDF](https://ocw.metu.edu.tr/file.php/85/ceit706/week7/PaulGee.pdf))，但要改 `prepService()`。也可以只在页面上把第 1 天的提示加强（a 类） |
| 排队等后续空桌 | 引擎没有时间和排队概念，一组坐不下就当场结算 | Diner Dash 把排队当作玩家可以管理的缓冲 ([casualgameguides](https://casualgameguides.com/walkthroughs/diner-dash-flo-on-the-go))（攻略站，可信度低）。在我们这里实现等于新机制，只列出供参考，不建议 AI 自行设计 |

## Conclusion

这次调研最重要的认识是：**“节奏”和“规则”在我们的架构里本来就是分开的**，只有 `CFG.service` 被页面借来当计时器这一处把两者连在了一起。把这一处拆开以后，团队可以随意试暂停还是不暂停、一天 90 s 还是 150 s、大巴提前几秒预告，完全不用担心两边结果不一致；每次 playtest 只需要提醒双方刷新页面即可。真正需要讨论的规则问题很少，而且都是教学取舍：“一车 6 人救不全”是要保留的教训还是要修的挫败？第 1 天要不要就有事件？

第二个启示是，信息减负的主要手段不是删字，而是**换个地方、换个时间**展示：状态画进场景，后果在选择之后演出来，原因链留到 report 里复述（Beer Game 的玩家会把自己造成的波动归咎于外部原因，[Sterman 1989](https://dspace.mit.edu/bitstream/handle/1721.1/2184/SWP-1933-18213539.pdf?sequence=1)）。

待团队决定的事项：(1) 决策时硬暂停、慢放，还是延长倒计时，以及后期天数是否收紧；(2) `maxOps` 是否独立成 CFG 项，大巴能否救全；(3) 大巴/高峰是否固定时段；(4) 第 1 天是否去掉事件；(5) 盘子为 0 时 Borrow 是否置灰；(6) 等待对手时显示什么（自己的当日小结，还是对手只读的结果摘要，后者须避开私有事件）；(7) 本文所有【推断】时长的首轮试玩值。
