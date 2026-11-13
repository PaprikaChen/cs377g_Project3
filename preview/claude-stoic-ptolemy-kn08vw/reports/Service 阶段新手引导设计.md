# 让第一次营业边做边学

**结论先行：** 新版 Service 不该靠一个总说明或图例来教，建议用三层引导。第一层是开门前约 20–30 s 的“认识你的店”：只点名 4 个角色，也就是兔子店员和地毯、你的厨师（YOU）、厨房灶台、外卖口，时钟这时还没开始走。第二层是“首次遇到即教”：每个新元素第一次出现时，本机时钟冻结，聚光这一个东西，配一句不超过 8 个词的英文提示，并要求玩家真的做一次这个动作，然后恢复。第三层是渐隐：第二次遇到只给一行不暂停的提示，第三次起什么都不给，用每台设备上的 `localStorage` 标记跳过已经学过的内容。这样做有依据。新版 Service 同时有排队耐心、自动店员、手动桌、走位、rush 小游戏、外卖、广告客人和时间轴事件，复杂度接近 Andersen 等人研究里“教程确实有用”的那一类游戏，而不是可以靠自己摸索学会的简单游戏 ([Andersen et al. CHI 2012](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/))。同时，NN/g 的数据显示，一次性的卡片式教程和 coach-mark 巡览并不能提高任务成功率 ([NN/g](https://www.nngroup.com/articles/mobile-tutorials/))。所以要教，但只在用到的那一刻教。架构上，这套引导全部可以只放在页面层：Service 是每个座位在本机各自跑的，只有收工时的 `{k, ops}` 写进日志，所以暂停、聚光和标记都不会破坏 deterministic replay。唯一的硬约束是引导不能往 `ops` 里写任何东西。真正需要团队拍板的规则问题有几个：第 1 天要不要关掉事件和广告；第 1 天有 12 份免费餐盘，rush 可能根本不触发，那 rush 怎么教；rush 小游戏的成败要不要进 `ops`；练习 rush 算不算钱。

> 可信度与范围说明：外部资料几乎全部来自**搜索结果摘要**。gamedeveloper.com、nngroup.com、grail.cs.washington.edu、amara.org 等站点在本次会话中无法直接抓取，很多游戏细节来自粉丝 wiki、攻略和评测，可信度中等或偏低，引用前应核对原文。代码行号都基于 `origin/uiux-v2` @ 23b35fd。**新版 Service（店员、厨师走位、rush 小游戏）还没有实现**，下面说的“挂点”指的是现有 Service 的对应位置，新版大概率会沿用 `svcState` / `serviceTick` / `!sv.started` 的结构，但这一点尚未确认。另外，**CLAUDE.md 第 8 条对 `RULES` / `hint()` / `mathHint()` 的描述对 uiux-v2 已经过时**：这些函数只存在于 `main`（app.js:439–495），在 uiux-v2 上已被删掉，教学职责分散到了各屏自己的文案里。本报告不建议挂到 `rulesHTML()` 上，建议团队顺手更新 CLAUDE.md。文中标【推断】的是本报告的推理，标【占位】的时长和数值必须靠 playtest 确定。按团队 AI 政策，凡是涉及规则或数值的改动，下面只列选项，由团队决定。

## 新版 Service 有 9 个从没教过的东西，旧引导只教过规则

现在 uiux-v2 上的引导没有教程，也没有任何“第一次”状态。它由四部分组成：每局都会重放的 5 张故事卡（`INTRO`，app.js:454–460；`resetLive()` 会把 `app.intro` 归零，app.js:178）；“?” 打开的 How to play 抽屉（`howtoHTML()`，app.js:582–624）；流程里插入的几张说明屏，包括第 1 天礼物屏（`giftHTML()`，app.js:738–744）、每个市场日都出现的市场简报（`marketBriefHTML()`，app.js:836–866），以及 Service 开头的翻卡屏和 “Open the doors →”（app.js:1138–1162、1448）；还有各屏常驻的教学文案。`localStorage` 里只存了 `nick`、`lastCode`、`theme` 和广告卡 id（app.js:6–7、17、115、229–244），**没有任何“看过教程”的标记**。Practice 是一整局完整的同屏 hot-seat 对局，并不是脚本教程（`startLocal()`，app.js:207–212）。

这套做法的风格是“用到时，用这一屏自己的文案解释”，教的始终是**规则和后果**，比如“每位客人需要 1 张桌 + 1 份餐”。新版 Service 要教的却是**动词**：走、领、上菜、做菜、端外卖。对照三张已批准的 mockup（v3-country / v3-city / v3-rush），下面这些在现有代码、文案和画面里都完全没有出现过：

| # | 新元素（mockup 里的样子） | 第一次需要它的时刻 |
| --- | --- | --- |
| 1 | 兔子店员站在绿色地毯上，每只管 2 张桌，自动领座、上菜 | 开门第一秒 |
| 2 | 标着 “no staff” 的桌：厨师要走到门口，一次领一位，再上菜 | 第一位没被店员接走的客人 |
| 3 | 你的厨师：猫（P1 蓝）或狗（P2 粉），头上有 “YOU” 标签，走固定速度，红地毯上有虚线路径 | 开门第一秒 |
| 4 | 灶台 rush 小游戏：“RUSH 1 PLATE · step 2 of 3”，滑块进绿区时点击 | 第一次缺餐 |
| 5 | 厨师离开时显示 “your station (rush paused)” | 第一次在做菜途中离开 |
| 6 | DELIVERY PICKUP 的外卖员：有耐心环，头上有盘子气泡，要厨师端过去 | 第一个外卖员出现 |
| 7 | 门外每位客人头上的耐心环，等太久会不开心地离开 | 开门第一秒，但第一次有人离开时才“痛” |
| 8 | 广告客人画成玩家颜色，左下角弹窗 “Flyers · brought 2 guests” 停留 5 s | 第一张广告卡生效 |
| 9 | 顶部时间轴上的事件标记（BUS） | 开门时就能看到；事件到达时 |

旧系统里只有“桌 + 餐”、rush 餐、外卖卡（`delivery`，engine.js:25、229）、广告客人（字母徽章 `BADGE`，app.js:1008–1009）和星级规则有概念上的前身，而且当时都是作为**菜单选项**来教的，不是作为动作。【推断】由此可以把元素分成两类。1、3、7 从第一秒就要用，必须在开门前或开门后立即处理。4、5、6、8、9 只有在缺餐、出现外卖或事件时才会遇到，正适合“首次遇到即教”。这也正好兑现了 How to play 抽屉里已有的承诺 “Each one is explained when it happens”（app.js:615）。

关于“没有图例”：团队删掉图例是对的，研究也不支持靠常驻说明来教（见下一节）。但 mockup 里已经有几处**画在场景里的标签**，即 “no staff”、“YOU”、“6 plates ready”、“your station (rush paused)”、“DELIVERY PICKUP”、“RUSH”。它们属于 diegetic signalling，不算图例，应当保留，这也正好是引导要指向的落点。PvZ 的 George Fan 主张让每个角色的外观本身说明它的功能 ([Game Developer 报道](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan))（摘要）。

## 研究和同类游戏都指向“少说、先做、只教眼前这一件”

**有出处的事实。** Fan 在 GDC 2012 的十条教程建议包括：把教程融进游戏，让玩家通过动手来学（“click a seed packet”），屏幕上同一时刻大约只放 8 个词，不要一次教完所有东西，让玩家从动作的结果里学，优先用不打断的提示 ([Game Developer](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan); [Filament Games](https://filamentgames.com/blog/10-tips-designing-game-tutorial))（摘要）。Mario 1-1 的“有机教程”分三步：新机制先在没有敌人的空地上单独出现，再加一点要求重复一次，最后放到会失败的地方考一次 ([Game Developer: Organic Tutorials](https://gamedeveloper.com/design/examining-organic-tutorials))（摘要）。NN/g 对 70 名用户的研究发现，看过教程的人任务成功率略低（91% 对 94%），还觉得任务更难；instructional overlay 和 coach mark 也有同样现象。只有面对真正新颖的交互方式时，walkthrough 才有帮助 ([NN/g](https://www.nngroup.com/articles/mobile-tutorials/))（摘要）。Andersen 等人在 3 款游戏、超过 45,000 名玩家上做了实验：教程只在最复杂的 Foldit 里显著提高了游玩时间，最多 +29%；“限制自由、把注意力集中到目标概念上”能提高可学性；按需帮助（on-demand help）的效果有好有坏，在 Refraction 里甚至是负面的 ([CHI 2012 项目页](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/))（摘要，PDF 未取得）。

学习科学提供了三块可以直接用的砖。第一，Mayer 的 pre-training 原则：学习者事先知道主要组件的名称和特性，学得更好 ([Cambridge](https://www.cambridge.org/core/books/abs/multimedia-learning/pretraining-principle/01791D57F5D4164251269E6DF56A8BF1))。第二，worked example 应随着能力增长逐步撤掉，否则会出现 expertise reversal，原本帮新手的支持反过来妨碍熟手 ([Wikipedia](https://en.wikipedia.org/wiki/Expertise_reversal_effect))。第三，Gee 的 fish tank（只突出少数变量的简化系统）和 sandbox（接近真实但风险大幅降低的情境）([Wisc](https://wisc.pb.unizin.org/goodlearningprinciples/chapter/principle-39-fishtanks-dealing-with-complexity/))。

同类游戏的做法同样一致：第一天或第一关只有一道菜、一条规则，之后大约每天或每关加一个机制，时间压力是“放软”而不是完全冻结。Papers, Please 第 1 天只有一条规则，之后几乎每天加新条件，每天前两次违规只警告、不扣钱 ([Mechanics of Magic](https://mechanicsofmagic.com/2021/06/05/design-details-in-papers-please/))（摘要）。Overcooked 1-1 只有洋葱汤一道菜，限时 2:30 ([Overcooked Wiki](https://overcooked.fandom.com/wiki/1-1_(Overcooked!)))。玩家反映，原版 Overcooked 2 的教程关要等第一单送出后才开始计时，All You Can Eat 版去掉了这个宽限，招来抱怨 ([Steam 讨论](https://steamcommunity.com/app/1243830/discussions/0/3768986805993213498))（社区说法，可信度低）。Two Point Hospital 第一关只要求建基本科室、雇人，培训到大约第 3 关才出现 ([SegmentNext](https://segmentnext.com/two-point-hospital-mitton))。教计时小游戏时，Rhythm Heaven 会先给一段不计分、可以反复练的练习 ([GamesRadar](https://www.gamesradar.com/au/rhythm-heaven-fever-review))，Cooking Mama 允许先单独练某一步 ([PocketGamer](https://www.pocketgamer.com/articles/002195/cooking-mama/))。PlateUp 的教程可以随时从 HQ 里的 “?” 牌子重玩 ([TouchTapPlay](https://www.touchtapplay.com/plateup-beginner-guide-tips-and-tricks/))（单一社区来源）。

【推断】放到我们的游戏里，有三点含义。第一，屏幕上的元素种类远超“第一天一件事”，所以引导的骨架应当是逐个首次遇到、逐个教，而不是开门前一次讲完。第二，Andersen 关于按需帮助的结果说明，单靠“?”帮助按钮补不了被删掉的图例的位置，它只能当补充。第三，“暂停提问”在同类游戏里并不常见，它们更常用“先不计时”“第一次犯错不罚”。所以首次暂停应当短，并且由玩家完成动作来解除，而不是读完文字点“OK”。

## 第一天的建议流程：开门前点名 4 个角色，开门后逐个首次即教

下面是给第一次营业的具体流程。时长都是【占位】，英文提示是建议文案，可以改。“冻结”指只冻结**本机**的时钟和耐心环（实现方式见下一节）。

| 拍 | 触发 | 画面与提示 | 玩家必须做 | 时钟 |
| --- | --- | --- | --- | --- |
| 0 认识你的店 | 翻卡屏结束后、“Open the doors” 之前 | 场景压暗，依次聚光 4 处，每处一句：“This is you.”（YOU 厨师，并说明你是蓝猫或粉狗）→ “Bunnies seat and serve their rug.” → “No staff? That's your job.” → “Plates come from here.”（餐盘架）。不提外卖、广告、事件 | 每处点一下继续，或点 “Skip” | 未开始【约 20–30 s】 |
| 1 看店员干活 | 开门后第一组客人 | 让第一位客人走进店员负责的地毯，兔子自动领座、上菜，客人头上冒一个“满意”小图标。不弹提示，最多在地毯上方闪一行 “Auto!” | 什么都不用做，只看 | 正常走 |
| 2 你的桌 | 第一位轮到 no-staff 桌、站在门口的客人 | 冻结；聚光这位客人和他的耐心环：“Your tables need you. Click a guest.” 厨师走到门口后，聚光一张空的 no-staff 桌：“Pick a table.” 坐下后：“Bring a plate.” | 亲手完成一次 走 → 领 → 选桌 → 上菜 | 冻结到客人点出来为止，之后恢复；走路过程正常计时 |
| 3 耐心与离开 | 第一位客人耐心环变红，或第一次有人离开 | 不冻结；门边计数跳一下，配一行：“Waited too long. −★ risk.” | 无 | 正常 |
| 4 rush | 第一次餐盘不够（见下文 Day 1 的问题） | 冻结；聚光灶台：“Out of plates? Cook one.” 厨师到灶台后，打开 rush 面板，先演示一遍（ghost 滑块扫过，在绿区闪 “now!”），再让玩家试 | 完成一步。首次失败可以免费重试（是否免费由团队决定） | 冻结到第一步成功，之后正常 |
| 5 rush 暂停 | 第一次在 rush 中途离开灶台 | 不冻结；灶台标签亮起 “rush paused”，配一行 “Away from stove = cooking paused.” | 无 | 正常 |
| 6 外卖员 | 第一个外卖员到达 | 冻结约 1–2 s 的定格【占位】，聚光：“Courier waits. Carry a plate here.” | 第一次亲手端一盘过去，完成后才把这个 tip 记为已学会 | 定格后正常（外卖员本来就比堂食客人更有耐心） |
| 7 广告客人 | 第一张广告卡带来客人 | 不冻结；5 s 弹窗照常出现，第一次额外在弹窗上加一行 “Blue guests = your ad.”（P2 显示 Pink），并把这些客人描边闪两下 | 无 | 正常 |
| 8 时间轴事件 | 开门时时间轴上已有标记；事件到达前约 3–5 s【占位】 | 开门时标记轻轻跳一下；到达前给一行 “Tour bus soon!”，车出现时短暂聚光门口 | 无 | 正常 |

这个顺序有三点理由。第一，“看自动 → 再做手动”的对比是 Fan 说的“看结果就学会”加上 Mario 的“先单独出现”【推断】；同类游戏也是先手动、后自动 ([PlateUp 自动化 wiki](https://wiki.plateupgame.com/Automation))，但我们的店员从第一秒就在场，所以改成“同屏对比”。第二，只有第 2、4、6 拍真正要求动作并冻结，因为它们是全新的**交互方式**，正是 NN/g 认为 walkthrough 值得用的那种情况；第 3、5、7、8 拍是规则或信息，用不打断的一行提示即可，符合 Fan 的“prefer passive messages”。第三，竞争层的元素（对手颜色、广告弹窗、事件）放在后面，先让玩家掌握核心的领座，这也符合“先核心、后竞争”的实践建议（[Wayline](https://www.wayline.io/blog/tutorials-onboarding-level-design)，低可信度博客）。

**渐隐规则【推断】。** 每个 tip 有三级：第一次是冻结加聚光加动作，第二次是一行不冻结的提示，之后静默。这是 fading 的最简实现，也防止 expertise reversal。第 2、4、6 拍只在玩家真的完成了动作后才记为已学会；如果玩家在冻结时点了 Skip，下一次遇到还会再给一次轻量提示。

**Day 1 的规则冲突，需要团队决定。** 有三处现有规则会打乱上面的流程。(a) 第 1 天有 12 份免费餐盘（`CFG.freeFood: 12`，engine.js:12），所以第 1 天可能根本不缺餐，rush 永远教不到。(b) 第 1 天的事件概率仍是 60%（`prepService()` 没有判断天数，engine.js:182–193），早晨的私人事件也照常抽（engine.js:159–162）。(c) 广告卡第 1 天就生效。下表只列选项：

| 问题 | 选项 A（不动规则，a 类） | 选项 B（改规则，b 类，会重算进行中的对局） | 取舍 |
| --- | --- | --- | --- |
| rush 在第 1 天可能不触发 | 在拍 0 加一段**练习 rush**：开门前在灶台练一次，不计时、不花钱、做出来的盘子**不算数**，结果不写进 `ops` | 第 1 天少给免费餐盘，或第 1 天必定出现一次缺餐 | A 不碰规则，但“练习做的盘子不能用”可能让人困惑；B 教学最自然，但改动了经济数值 |
| 也可以晚点教 rush | 只在**第一次真正缺餐**时教（可能是第 2 天），即首次即教 | — | 符合 just-in-time，但第 2 天节奏已经更快（有 Market） |
| 第 1 天的事件和广告 | 保留，但第 1 天的事件只给一行提示，不聚光 | 第 1 天关掉事件（改 `prepService()`），或关掉广告阶段 | B 是 Papers Please 式的逐日加机制，更干净，但第 1 天少了“对手搞事”的味道，也删掉了一部分竞争教学 |
| 练习 rush 算不算钱或盘子 | 不算（纯沙盒） | 算，用真实价格 | 算的话就必须写进 `ops`，否则两边 replay 会不一致 |

另外，第 1 天的早晨私人事件（预约客人、可疑交易）在新版 Service 里会怎么呈现，mockup 没有画出来，需要团队补充。

## 引导只能活在页面里：暂停、两台设备和同屏 Practice

**replay 的硬约束（有代码出处）。** `expected()` 同时向两个座位要 `${r}:service`，两边都提交日志后阶段才前进（engine.js:380–395）。页面只在 `svcdone` 时写入 `{k, ops}`（app.js:1450）。`serviceRun(S, s, ops, closed)` 在 `closed = Infinity` 时，结果只取决于 `ops` 和事先掷好的 script（engine.js:251–254、279）；超时和 Let go 只改变本地的 `sv.closed`（app.js:423）。所以只要引导**只控制“什么时候能操作”，不改变“记下了什么”**，就不会影响 replay。反过来，任何写进 `ops` 的“练习”都会改变钱和结果，比如往 `ops` 里推一次免费 rush（`maxOps` 和 `opPrice()` 都和 episode 绑在一起，engine.js:261、272–277）。【推断】新版 rush 小游戏如果可能失败，或需要多步，它的结果就要以 op 字段的形式记录（例如 `{ep, a:'rush', ok}`），或者由种子确定性地算出来。这是 Service 规则设计的问题，不是引导问题，但会决定“练习 rush”能不能做成纯沙盒。领座顺序、桌子选择、走位等新动作要如何映射成 `ops`，目前也没有任何规格。

**挂点（对应现有代码，新版需要确认沿用）。** 拍 0 挂在 `serviceHTML` 的 `!sv.started` 分支：翻卡结束后、“Open the doors →” 之前（app.js:1138–1162、1448）。这里本来就什么都不走动，因为 `serviceTick()` 在 `!sv.started` 时直接返回（app.js:399–422），所以是最安全的暂停位置。首次即教的冻结可以在 `svcState(s)`（app.js:394–398）里加一个 `tut` 字段（例如 `{id, since}`），在 `serviceTick()` 开头检查。还必须把 `tut` 加进 `liveSig()`（app.js:290–294），否则屏幕不会重绘；同时要遵守 CLAUDE.md §6：冻结和解冻都不能替换玩家指针下面的按钮。**要注意的坑：** 现在的耐心计时 `waitAt` 和 busy 都是 wall-clock 时间戳，`tbar()` 的 `data-t0/t1` 也是。冻结时如果不把它们整体往后挪“暂停了多久”，客人会在暂停期间“超时离开”。新版每位客人都有自己的耐心环，计时器会变多，所以【推断】建议从一开始就让所有 Service 计时读同一个“服务时钟”（墙钟减去累计暂停时长），而不是每个计时器各自去挪。上一份节奏报告还指出，页面计时器直接读 `CFG.service.patience/opTime`，而 `maxOps` 由这两个值相除得出（engine.js:261）。因此引导里任何“第一次放慢 rush 滑块”“首次加长耐心”的做法，都必须用页面自己的显示常量，不能改 CFG。

**两台设备在线对局。** 每个玩家的引导都只在自己的设备上运行，也只暂停自己的时钟。代价是：引导较多的新手会让对手在 “Closed for the night” 页多等一会儿（app.js:1131–1136；对手状态显示为 “still serving”，app.js:627–631）。两人都是新手时，两边大致一起学完，问题不大。新手对熟手时，【推断】有三个缓解办法：给所有冻结拍设一个总上限（例如整个第一天合计不超过 60 s【占位】，超过后自动转为不冻结的提示）；每个冻结拍都提供 Skip；等待方的提示文案保持中性，不要写 “learning the ropes”，以免泄露对方在走教程。私有信息的规则照旧：广告卡弹窗、私人事件只在本机显示。至于对手的广告客人是否也会在你的店里以对手颜色出现、要不要弹窗，mockup 没画，需要团队明确。

**同屏 Practice。** `controlled()` 在本地模式下返回两个座位（app.js:32），`serviceTick()` 会同时推进两家的营业（app.js:401）。所以在 Practice 里，冻结必须**同时冻结所有受控座位**，否则看着 A 的教程时，B 的客人还在流失。【推断】还有一个更根本的问题：Practice 的本意是两个人轮流用同一台设备，而新版 Service 是持续的实时操作，两家同时开店，一个人照看不过来。可选方案有三种：两家的营业依次进行，先 P1 后 P2，中间用现有的 “Pass the screen” 遮罩（`coverHTML`，app.js:656–659）；或者 Practice 只让一个座位由玩家操作，另一个座位自动或空跑，相当于 Hearthstone、Clash Royale 那种先对 AI 练习 ([Hearthstone wiki](https://hearthstone.wiki.gg/wiki/New_player_experience))；或者保持现状，接受同屏练习很混乱。这三种都会改变 Practice 的玩法，前两种不影响 replay（在本地模式下都是页面行为），但属于团队的设计选择。“已学会”标记在 Practice 里应当**按座位记录**（例如 `seen:p2:chefTable`），否则第二个人会被当成已经学过而跳过教程。

**回访玩家怎么跳过。** 复用现有的 `lsGet/lsSet`（前缀 `rr:`，自带 try/catch，app.js:6–7），每个元素一个标记，例如 `rr:seen:svc:intro`、`…:chefTable`、`…:rush`、`…:rushPaused`、`…:courier`、`…:adGuest`、`…:event`，取值是 0、1、2，对应渐隐的三级。存储被禁用时（无痕窗口）教程会再出现，这样是安全的。不需要改 Firestore，也不需要改 `firestore.rules`。入口有三个：拍 0 上的 “Skip intro” 和每个冻结拍上的 “Skip”；How to play 抽屉里加一个 “Replay service tips”，清空这些标记；故事卡也建议同样记一次已看，现在每局都会重放（app.js:178）。How to play 抽屉里的 Service 段落还在描述旧模型，包括 R/B/Esc 快捷键和 borrow（app.js:605、619），需要和引导一起重写。它的定位是可以重新打开的参考，不承担主要教学。

**怎么验证。** 【推断】playtest 时，每个 tip 在本地或 console 记录“出现”和“完成”的时间戳，就能看出每一步的流失和耗时，不需要接入分析服务。这是 GameAnalytics 等工具推荐的逐步漏斗做法 ([GameAnalytics](https://docs.gameanalytics.com/products-and-features/analytics-iq/funnels))。重点观察三件事：第 2 拍（第一次领座）用了多久；第 4 拍 rush 首次的失败次数；新手对熟手时，熟手等了多少秒。

## Conclusion

这次梳理最重要的认识是：新版 Service 把游戏从“看账、在缺货时做选择”变成了“管一个人的注意力”。厨师同一时刻只能在一个地方，这本身就是要教的核心，而它最好通过**后果**来教：灶台上亮起 “rush paused”，门口有客人在等。不需要另做说明。mockup 里已经有的场景标签，正是这种不靠图例的信号，引导只需要在第一次时把聚光打到它们身上。

第二个启示是，引导的成本主要不在写提示，而在**计时架构和规则边界**。把所有 Service 计时统一到一个可以暂停的服务时钟，把练习和真实操作在 `ops` 层面严格分开，引导就能随便迭代、随时 playtest。反过来，如果 rush 结果、领座顺序这些新动作没有先定义清楚怎么进 `ops`，“练习 rush”这类设计就落不了地。

**待团队决定：** (1) 第 1 天是否关掉事件和/或广告；(2) rush 在第 1 天怎么教：开门前做不算数的练习、首次缺餐时再教，还是第 1 天少给免费餐盘；(3) rush 小游戏成败与新动作（领座、选桌、端外卖）如何记进 `ops`，练习 rush 算不算钱和盘子；(4) 首次 rush 失败是否免费重试，首次滑块要不要放慢（只能用页面常量）；(5) 冻结拍的总时长上限，以及等待方看到的文案；(6) Practice 的营业是依次进行、一边自动，还是保持同时进行；(7) 对手的广告客人在你店里是否显示、是否弹窗；(8) 兔子的数量（mockup 里 Countryside 4 只、City 3 只只是示意，实际由 Build 阶段雇佣决定），以及首日教学是否需要至少 1 张 no-staff 桌；(9) 本文所有【占位】时长和英文提示文案的首轮试玩值；(10) 更新 CLAUDE.md 第 8 条，因为 `RULES`/`hint()` 在 uiux-v2 上已经不存在。
