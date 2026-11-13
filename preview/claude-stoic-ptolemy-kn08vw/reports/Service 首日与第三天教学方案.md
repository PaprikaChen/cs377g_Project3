# 第一天教动作，第三天教因果

**结论先行：** 这是一份待团队批准的教学方案，基于 `prototypes/service-feel/index.html` 和它现在的数值。**第 1 天**只教三个动作：领一位兔子接不了的客人、给他上菜、缺盘时 rush 一盘。前面加一段不计时的“认识你的店”，用聚光加一句话代替现在的说明段落。仿真显示，rush 时刻会自然出现：8 个盘子对 14 位客人，Countryside 中位约 71 s、City 约 78 s 盘子用光，60 次运行全部如此。但“只有厨师能领的客人”这一刻来得晚、早晚不定（约 25–75 s），而且不一定痛：Countryside 不操作时，门口离开的客人是 0。所以第 1 天要么接受自然时机，要么由团队批准一份脚本化的到客时间表，下文列成选项。**第 3 天**要教的是“我之前的决定 → 现在的客人”。Ads 阶段没有计时，用一张“今日新内容”公告加两次点名：买的卡什么时候生效、对手能对你放卡。营业中用三个桥接信号把因果连起来：彩色广告客人加淡出弹窗、BUS 标记加首辆大巴、City 的第一个外卖员。最后在收工小结里补一行归因，这是原型现在缺的。最大的冲突在 Countryside 第 3 天：大巴 72 s 到，盘子约 69 s 用光，两个压力峰叠在一起。要不要错开、要不要在首辆大巴时暂停，是团队的决定。英文提示都在 8 个词以内。所有时长都是【占位】，要靠 playtest 定。

> **怎么读这份方案。** `HTML:N` 指 [prototypes/service-feel/index.html](../prototypes/service-feel/index.html) 第 N 行。“仿真”指对原型做的无头运行：每种组合 30 个种子，默认数值，加一个“谨慎的简单 bot”，数据和方法见 [prototype_hooks.md](../research_notes/Service%20首日与第三天教学方案/prototype_hooks.md)。时间写作“最小 / 中位 / 最大”，单位是开门后的游戏秒数。标注约定：**【来源】** 是代码、仿真或外部资料里的事实；**【推断】** 是本方案的推理；**【占位】** 是需要试玩确定的时长或文案；**【选项】** 会改动规则、数值或到客时间表，按团队 AI 政策只列选项，由团队拍板。外部研究和同类游戏的资料，**大多只读到了搜索结果摘要**，原文没有打开（ludo.guide、papersplease.fandom.com、uxdesign.cc、escholarship.org 等无法抓取），下文标“（摘要）”的，写进团队文档前应先核对。仿真里的 bot 不是人，人的点击速度和 rush 失误次数都没有测过。

## 原型的自然节奏只送来一半的教学时刻

**【来源】第 1 天的自然顺序。** 开门后大约 20 s 店里是空的：第一位客人到门口的中位是 24.4 s（Countryside）和 23.0 s（City），最早 10 s，最晚 35 s。第一位客人 100% 被兔子接走，因为兔子立即反应，而厨师站在灶台。门口第一次出现兔子接不了的客人，Countryside 中位 49 s（30 次里 29 次出现），City 中位 47 s。门口积压 3 人以上，大约在 60 s。盘子用光，Countryside 64–78 s（中位 71 s），City 69–90 s（中位 78 s），两地都是 30/30。第一个不满离开的客人在 98 s 左右，都是坐着等盘子的人。不操作时，结果固定是 served 8 / unhappy 6：Countryside 门口离开 0 人，City 平均 0.57 人。简单 bot 做到 served 约 14、unhappy 不到 1。厨师完整领一次座大约要 11 s：点击后约 6 s 走到门口，再约 5 s 带客人入座。（仿真，[prototype_hooks.md §2](../research_notes/Service%20首日与第三天教学方案/prototype_hooks.md)）

**【推断】这对教学意味着什么。** rush 的教学时刻是自然出现的，而且痛点真实：不 rush，6 个人一定不满离开。领座的教学时刻却是**可选的**：在 Countryside，兔子最后能把所有人都领进来，玩家完全不去门口也只损失盘子那一块。这正好和上一份引导报告的担心相反。上一份报告担心的是“第 1 天 12 份免费餐盘导致 rush 不触发”，那是 live engine 的 `CFG.freeFood: 12`；原型里是 8 盘对 14 人，rush 一定会触发。另外两点不变：原型里**没有选桌这一步**，厨师自动挑第一张空的 no-staff 桌（HTML:331），所以旧方案里的 “Pick a table.” 要删掉；原型里也**没有 rush paused**，离开灶台会直接取消 rush（HTML:321）。

**【来源】第 3 天的自然顺序。** Countryside：Flyers 弹窗 36.0 s，广告客人约 39.7 s 到门口，大巴 72.0 s（6 人约 3 s 内下完），盘子中位 68.8 s 用光。City：外卖员 #1 带 “Delivery app spotlight” 弹窗，26.4 s 出现，27.3 s 开始在取餐口等。这时第一位走进来的客人中位 25.4 s 才到，所以大约一半的局里，**外卖员是当天第一件事**。Office lunch deal 弹窗 38.4 s，粉色客人约 42 s 到门口。外卖员 #2 在 74.4 s 出现，没有弹窗，这时盘子已经快用光（中位 76.9 s）。不操作时，外卖员 #1 在 62.2 s 不满离开，30/30。弹窗寿命 5 s，最后 1.5 s 淡出，没有进度条（HTML:312–314、548–554），广告客人在弹窗还可见时就到了门口。（仿真同上）

**【推断】** 第 3 天的问题不是“缺时刻”，而是“时刻挤在一起”。City 的外卖员和第一位客人几乎同时到。Countryside 的大巴正好撞上盘子用光。外部资料一致建议：新东西一次一个，先在不惩罚的环境里单独出现，再和旧机制组合 ([Wayline](https://www.wayline.io/blog/teaching-mechanics-game-design-card-analogy); [GameDev Academy](https://gamedevacademy.org/game-tutorials-guide/))（摘要）。PvZ 大约每几关才加一样新东西，新僵尸一次只来一种 ([uxdesign.cc](https://uxdesign.cc/lessons-in-onboarding-from-plants-vs-zombies-d936d58c10c); [PvZ wiki](https://plantsvszombies.wiki.gg/wiki/Newspaper_Zombie_(PvZ)))（摘要）。团队已经决定广告和事件都在第 3 天开始，本方案照此设计，同时把“错开”列为一个选项。

## 第 1 天：开门前点名，开门后只为三个动作冻结

设计原则沿用上一份引导报告：只为**全新的交互**冻结，并且由玩家**完成动作**来解冻，不是读完点 OK；规则和信息只给一行不打断的提示。Papers, Please 要等玩家叫第一位入境者才开始计时 ([ludo.guide](https://www.ludo.guide/guide/papers-please/daily-bulletin))（摘要）。George Fan 主张教程“not feel like a tutorial”，屏幕上的字要少 ([Game Developer](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan))（摘要）。在 45,000 多名玩家的实验里，教程只在复杂的游戏里有显著作用 ([Andersen et al. CHI 2012](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/))。

**【来源】冻结在原型里的实现方式。** 所有计时器都只在 `update(dt)` 里走，而 `update` 只在 `frame()` 里、`S.open && !S.ended && speed > 0` 时运行（HTML:605–607）。所以冻结只需要在 HTML:607 加一个 `tutFreeze` 门。`render()` 照常每帧绘制（HTML:608），聚光可以画出来。点击处理只检查 `S.open && !S.ended`（HTML:628），冻结时的点击照样会进入队列。所以“冻结直到玩家做 X”应当在 `enqueue`（HTML:317）里解冻，不能等动作完成，因为厨师在冻结时不能走。rush 的滑块时钟 `S.mTime` 只在 `update` 里前进（HTML:574），冻结时**练不了 rush**。

下表的时间是仿真的自然中位数（Countryside / City），实际触发都用条件判断，不按秒数。

| 拍 | 触发（自然时间） | 玩家看到什么 | 英文一句【占位】 | 玩家必须做 | 冻结？ | 怎么结束 | 原型挂点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 认识你的店 | 点 “Open the doors” 之前 | 场景压暗，依次聚光 4 处：YOU 厨师 → 绿地毯上的兔子 → “no staff” 桌 → “8 plates ready” 和灶台。Day 1 不提外卖口 | “This is you, the chef.” → “Bunnies seat and serve their rug.” → “No staff? Those tables are yours.” → “Plates come from here.” | 每处点一下继续，或点 Skip | 时钟还没开始 | 第 4 处点完后出现 “Open the doors” | `showStart()` HTML:614–619，在 `S.open = true`（HTML:618）之前。聚光目标：YOU HTML:512，地毯 HTML:223，no staff HTML:225，盘子标签 HTML:472，灶台 HTML:240–242 |
| 1 安静开场 | 开门后 0 → 约 24 s 没有客人（最长约 34 s） | 空店 | 无，或一行 “Guests are on the way.” | 无 | 否 | 第一位客人到门口 | `update()` HTML:573；第一次 `kind:'g'` 派发 HTML:577。见下文【选项】S2 |
| 2 看兔子干活 | 第一位客人到门口并被兔子接走（约 24–25 s，100% 是兔子） | 地毯上方闪一下 | “Bunnies handle their own tables.” | 只看 | 否 | 2–3 s 后自动消失【占位】 | `arrive→queue` HTML:446；兔子认领 HTML:419 |
| 3 你的客人 | **新检测**：门口有未被认领的客人，且没有空的兔子桌（约 49 / 47 s，范围 25–75 s） | 聚光这位客人和他的耐心环 | “Bunnies are full. Click this guest.” | 点这位客人 | **是** | 在 `enqueue` 收到 `seat` 时解冻。厨师走过去时正常计时，客人被认领后门口耐心不再走（HTML:447），不会因此流失 | 新检测写在 `update()` 里（`tables` HTML:229）；解冻 HTML:317；自动选桌 HTML:331；`seat()` HTML:397 |
| 3b 上菜 | 该客人坐下，盘子气泡出现（点击后约 11 s） | 聚光盘子气泡 | “Click their plate to serve.” | 点盘子气泡 | **是**（短） | `enqueue` 收到 `serve` 时解冻 | 气泡 HTML:492–495；点击 HTML:639 → `serve` HTML:334–337 |
| 4 第一份收入 | 第一位客人吃完（约 53 s） | 已有的 “+$” 飘字 | 不加提示 | 无 | 否 | — | HTML:455 |
| 5 没盘子了 | **新检测**：`S.plates === 0`，且有坐着等的客人（约 73 / 81 s） | 聚光灶台和 “0 plates” 标签，等菜客人的耐心环闪一下 | “Out of plates! Click the stove.” | 点灶台 | **是** | `enqueue` 收到 `rush` 时解冻。厨师走向灶台时正常计时 | 新检测写在 `update()` 里；兔子静默放弃在 HTML:416/432；厨师 toast 在 HTML:361 |
| 5b 做一盘 | rush 面板第一次打开 | 面板自带说明 “Click the stove (or Space) in the green”，**不再另加一行** | — | 在绿区点一次。失误本来就免费、可无限重试（HTML:391） | 否（滑块需要时间走） | 第一次 `rushTry` 成功（HTML:387–390），出现 “+1 plate −$8” | `chefUpdate` HTML:370–372；`newRush` HTML:375。首次是否放慢滑块属于【选项】 |
| 5c 兔子也等盘子 | 第一次 rush 成功后，如果有兔子桌的客人在等 | 兔子头上闪一下 | “Bunnies serve again once plates return.” | 无 | 否 | 自动消失 | 需要先修好“兔子静默停工”（见问题清单）|
| 6 rush 被取消 | 玩家第一次在 rush 中点了别的东西 | 灶台上短暂显示标签 | “Rush cancelled. Click the stove again.” | 无 | 否 | 自动消失 | `enqueue` HTML:321（会取消 rush）；替换掉永远不会显示的 HTML:539–540 |
| 7 第一次不满离开 | `leave(g, true)` 第一次触发（约 98 s；City 有时更早，发生在门口） | 离开者的 X 脸，计数跳一下 | “Waited too long. They left unhappy.” | 无 | 否 | 自动消失 | HTML:403–406 |
| 8 打烊 | t ≥ 120 s | 门口挂牌 | “Doors closed. Finish the guests inside.” | 无 | 否 | 自动消失 | HTML:588–591。仿真显示打烊后坐着的客人仍会不满离开 |
| 9 夜间小结 | 最后一位客人离开 | 现有小结卡 | 第 1 天加一行 “You rushed N plates.”【占位】 | 无 | — | 现有按钮 | `showEnd()` HTML:620–624 |

**【推断】为什么只冻结 3、3b、5 三拍。** 这三拍是全新的**动词**，其余都是规则或信息。第 2 拍看兔子接走第一位客人，是“看自动”。第 3 拍要在兔子满了以后才触发，这正好把“为什么要我去”演出来，比开门前讲一遍有力。如果冻结时点了 Skip，就不记为已学会，下次遇到时给一行轻量提示。

**【推断】碰撞规则。** 第 3 拍的自然窗口最晚到 75 s，和第 5 拍（64–90 s）会重叠。规则是：同一时刻只允许一个冻结拍。如果第 3 拍还没教、盘子先用光，优先教第 5 拍，因为 rush 的后果更痛。第 3 拍推迟到下一次门口积压，或者推到第 2 天。这条规则只是页面逻辑，不改游戏规则。

**【选项】要不要给第 1 天一份脚本化的到客时间表。** 原型的到客时间用的是没有种子的 `Math.random`（HTML:278），每次 Restart 都不一样。下面这些都会改动规则或数值，由团队决定：

| 选项 | 做法 | 好处 | 代价 |
| --- | --- | --- | --- |
| S1 不改时间表 | 拍 3 和拍 5 按自然条件触发，加上上面的碰撞规则 | 不碰规则；教的是“真实的”第一天 | 拍 3 出现在 25–75 s 之间，很不稳定；Countryside 有 1/30 的局一直没出现；领座的后果（门口流失）在 Countryside 几乎为 0，玩家学到的可能是“门口不用管” |
| S2 缩短安静开场 | 第 1 天第一位客人固定在约 5–8 s 到【占位】 | 去掉约 20 s 的空等 | 改到客分布；拍 0 刚讲完就开始忙 |
| S3 在约 30 s 安排一小群客人【占位】 | 例如 3–4 人同时到，把兔子桌占满，拍 3 稳定落在约 30–35 s | 拍 3 和拍 5 之间留出约 35 s 的空档，“为什么要我去”很清楚 | 改到客时间表；第 1 天会比之后的日子更“设计感” |
| S4 第一位客人直接走到 no-staff 区 | 兔子“先不接”第一位客人 | 拍 3 提前到约 24 s，最早可教 | 改兔子行为；和拍 2“看兔子干活”冲突，两拍顺序要对调 |
| S5 只用于教程的固定种子 | 第 1 天到客由固定种子生成，保持现有公式 | 每个新手的第一天一样，便于 playtest 比较；公式不变 | 仍然是对时间表的改动（固定种子），需要团队同意；正式游戏本来就用 `rand(seed, tag)`，到时要对上 |

【推断】如果只能选一个，S3 加 S5 最能让三个冻结拍彼此分开。S1 成本最低，适合先试玩一次，看看问题是不是真的出现。是否放慢第一次的 rush 滑块（`mSpeed` 只用页面常量），同样是【选项】：Rhythm Heaven、Cooking Mama 都允许先练（见上一份引导报告），但原型的失误本来就免费，可能不需要。

## 第 3 天：Ads 阶段先说“什么时候生效”，营业中用颜色和标记把账对上

第 3 天的难点不在操作，在**归因**。卡在 Ads 阶段买、背面朝上放下，效果要等营业中途才出现。实验研究发现，动作和结果之间的延迟从 0 增加到 4 s，人的因果判断就系统性下降 ([core.ac.uk 综述](https://core.ac.uk/download/29817058.pdf))（摘要）。但如果人们**预期**会有延迟，延迟就不再有害 ([Buehner & May](https://api.philpapers.org/rec/BUETDC))（摘要）。中间有一个提示信号，也会改变延迟的影响 ([Alcalá et al. 2022](https://repository.derby.ac.uk/download/928f0e0191707a5859503d8a33c09d18a732d1a204f8a595146ffe68e58deffb/1028279/2022-Alcala%2C%20Kirkden%2C%20Bray%2C%20Prados%20%26%20Urcelay_PBR.pdf))（摘要）。啤酒游戏里，被试会忽略“已经下单、还没生效”的动作 ([Sterman 1989](https://dspace.mit.edu/bitstream/handle/1721.1/2184/SWP-1933-18213539.pdf?sequence=1))。【推断】所以方案在三个地方用同一个颜色和卡名，把因果连起来：买卡时、营业中的弹窗和客人、收工小结。

关于对手卡的公平感，摘要来源一致认为两点最重要：受害方事先能合理预料，事后能看出是谁做的 ([Star Wars: Unlimited](https://starwarsunlimited.com/articles/behind-unlimited-a-theory-on-agency); [Berlin Game Design](https://berlingamedesign.blogspot.com/2012/03/take-that-and-ill-take-this.html))（摘要）。正式游戏已经公开了对手放了几张卡（`nRival`，CLAUDE.md 架构第 4 条），这本身就是“事先能预料”的信号，只是还没被教出来。

**注意：原型里没有 Ads 阶段。** 下面 A 段的挂点指正式游戏 `app.js` 的 `commit` 阶段（买卡、放卡），行号要等实现时再定。原型 HTML 只覆盖营业部分。

### A. Ads 阶段（营业前，无计时）

| 拍 | 触发 | 玩家看到什么 | 英文一句【占位】 | 玩家必须做 | 冻结？ | 怎么结束 | 挂点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A0 今日公告 | 第 3 天进入 Ads 阶段，第一次 | 一张卡片，新内容带 “NEW” 标签，不超过 3 行。做法参考 Papers, Please 的每日公告 ([ludo.guide](https://www.ludo.guide/guide/papers-please/daily-bulletin))（摘要） | “NEW: ad cards and events.” / “Ads bring guests during today's service.” / “Your rival can play cards on you.” | 点 Got it 或 Skip | 本阶段本来就不计时 | 点击 | 正式游戏 `commit` 阶段入口；`shopFor()` |
| A1 一张卡 | 商店第一次出现 | 聚光一张卡：卡面用你的颜色，图标和营业中的弹窗一致 | “Flyers: +2 guests, mid-service.” | 无 | — | 点别处 | 卡面渲染；图标 `ART.icon()` |
| A2 背面朝上 | 第一次放下一张卡 | 卡翻成背面，对手那边的计数加 1 | “Face down. Rival sees only how many.” | 放 1 张，或 Skip | — | 放下后自动消失 | `nSelf` / `adHash()` |
| A3 对手的卡 | 对手放卡后（`nRival > 0`），第一次 | 对手区域显示 “2 cards” | “Rival placed 2. Some may hit you.” | 无 | — | 自动 | `nRival` |
| A4 今天的事件 | Ads 阶段结束、进入营业前 | 开门卡点名事件，指向时间轴 | Countryside：“A tour bus is coming. Watch the BUS mark.” City：“Couriers will come. Watch the pickup.” | 无 | — | 进入开门卡 | 原型 `showStart()` HTML:615 已有对应文字 |

【选项】PvZ 第一次进商店只能买一样东西 ([Filament Games](https://filamentgames.com/blog/10-tips-designing-game-tutorial))（摘要）。第 3 天要不要限制只能放 1 张卡，是规则决定。不限制也可以：A2 只在第一张卡上触发。

### B. 第 3 天营业（Countryside：Flyers ×2 + 大巴 ×6）

| 拍 | 触发（自然时间） | 玩家看到什么 | 英文一句【占位】 | 玩家必须做 | 冻结？ | 怎么结束 | 原型挂点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B0 开门前 | 开门卡 | 聚光时钟轨道上的 BUS 标记 | “BUS = 6 guests at once.” | 点继续 | 未开始 | 点 Open the doors | `showStart()` HTML:614–619；标记 HTML:291–293 |
| B1 广告到了 | Flyers 弹窗 36.0 s；蓝色客人约 39.7 s 到门口 | 照常显示弹窗（无进度条、淡出）。只在第一次给弹窗加一行，并给彩色客人描边、闪两下 | “Blue guests came from your Flyers.” | 无 | **否**（团队决定） | 弹窗 5 s 后淡出 | `popup` HTML:312；派发 HTML:578；颜色 HTML:485；绘制 HTML:548–554 |
| B2 大巴预告 | 72 s 之前若干秒【占位】 | BUS 标记跳动，门口亮起 | “Bus soon! Free a table?” | 无 | 否（见【选项】） | 大巴到 | 派发 HTML:579；`S.bus` HTML:582–587 |
| B3 大巴到 | 72.0 s，约 3 s 内下来 6 位灰色客人 | 聚光门口约 1 s | “6 guests at once!” | 无 | 否（见【选项】） | 自动 | 绘制 HTML:556–559 |
| B4 小结 | 收工 | 小结卡加归因行 | “Flyers → +2 guests” / “Tour bus → 6 guests” | 无 | — | — | `showEnd()` HTML:620–624（现在没有归因行）|

### C. 第 3 天营业（City：外卖员 + Office lunch deal ×3）

| 拍 | 触发（自然时间） | 玩家看到什么 | 英文一句【占位】 | 玩家必须做 | 冻结？ | 怎么结束 | 原型挂点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C0 开门前 | 开门卡 | 聚光 DELIVERY PICKUP | “Couriers wait here for a plate.” | 点继续 | 未开始 | Open the doors | HTML:243；`showStart()` HTML:614–619 |
| C1 第一个外卖员 | 26.4 s 出现，27.3 s 开始等（约一半的局早于第一位客人） | 弹窗 “Delivery app spotlight · sends delivery orders”，同时聚光外卖员和他的耐心环 | “Courier waiting. Click to carry a plate.” | 点外卖员 | **是**（短）。理由：这是全新的交互，不教的话 30/30 会在 62 s 流失 | `enqueue` 收到 `deliver` 时解冻 | `spawnCourier` HTML:306–311；`in→wait` HTML:462；送达 HTML:340–343 |
| C2 广告到了 | 弹窗 38.4 s；粉色客人约 42 s 到门口 | 同 B1 | “Pink guests came from your lunch deal.” | 无 | 否 | 淡出 | 同 B1 |
| C3 第二个外卖员 | 74.4 s，没有弹窗，此时盘子快用光 | 已学过，不加提示；如果没盘子，复用第 1 天第 5 拍的轻量版 | （可选）“No plates. Rush one for the courier.” | 无 | 否 | — | HTML:284–286、361 |
| C4 小结 | 收工 | 归因行 | “Lunch deal → +3 guests” / “Couriers: 1 of 2 served” | 无 | — | — | `showEnd()` |

**【推断】C1 的冻结和弹窗同时出现。** 弹窗不冻结，所以冻结期间弹窗会停在完全不透明的阶段，冻结解除后再淡出。这刚好让弹窗和外卖员能被一起读到，不需要改弹窗本身。

**【选项】第 3 天的几个规则或时间表问题。**

| 问题 | 选项 | 取舍 |
| --- | --- | --- |
| 大巴 72 s 撞上盘子用光（约 69 s） | (a) 不改，当作 Mario 1-1 式的“组合考试” ([Game Developer: Organic Tutorials](https://gamedeveloper.com/design/examining-organic-tutorials))（摘要）；(b) 第一次大巴挪到盘子还够的时候，例如 0.45·dl【占位】；(c) 首辆大巴到达时冻结约 1–2 s【占位】 | (a) 不碰规则，但仿真里 bot 在 Countryside 第 3 天平均仍有 9.4 人不满，新手会把损失归到大巴身上；(b) 教学最干净，但改了事件时间；(c) 让玩家看清，但大巴不是新动作，冻结和“只为动作冻结”的原则不一致 |
| 广告和事件同一天开始 | (a) 保持（团队现有决定）；(b) 第 3 天只开广告，第 4 天开事件 | (a) 每位玩家第 3 天要学一种卡、一种事件，外加 Ads 阶段；(b) 符合“一次一样”的同类做法，但推迟了竞争层，也要改 Day 4 |
| Countryside 永远见不到外卖员 | (a) 接受，每个地点只教自己的元素；(b) 让 Countryside 之后某天出现外卖员 | (a) 如果正式游戏里 Countryside 可以买外卖卡，第一次遇到时要用 C1 的教法；(b) 改事件分布 |
| 外卖员 #1 早于第一位客人 | (a) 不改；(b) 把 City 的外卖员挪到第一批客人之后【占位】 | (a) 外卖员成了当天第一件事，倒也是“单独出现”；(b) 让第一批走进来的客人先建立节奏 |

## 回访玩家：三级渐隐，只按设备记录

【推断】每个拍对应一个标记，存在 `localStorage`，沿用正式游戏的 `rr:` 前缀和带 try/catch 的 `lsGet/lsSet`，例如 `rr:seen:svc:chefSeat`、`…:serve`、`…:rush`、`…:rushCancel`、`…:courier`、`…:adGuest`、`…:bus`、`…:ads:bulletin`、`…:ads:rival`。取值三级：0 表示完整教学（冻结或聚光加一句话）；1 表示下一次只给一行、不冻结；2 表示静默。冻结拍只在玩家**真的完成动作**后才从 0 升到 1。点了 Skip 保持 0，但下一次降成不冻结的提示，避免反复打断。这样做是为了避开 expertise reversal：帮新手的支持，会妨碍熟手（见上一份引导报告）。另外四条规则：第一，开门前的拍 0、A0 提供 “Skip all tips”，一次把所有标记设为 2；第二，How to play 抽屉里提供 “Replay tips”，清空标记；第三，同屏 Practice 按座位记录（`seen:p1:…`），否则第二个人会被当成已经学过；第四，所有冻结拍合计设一个上限，例如整个第一天 60 s【占位】，超过后都转为不冻结的提示，限制新手让对手等待的时间。存储被禁用时教程会重新出现，这是安全的方向。这些都不进 `ops`，也不碰 Firestore。

第 3 天的 A0 公告属于“每次有新内容才出现”。以后有新卡、新事件，也用同一个 “NEW” 标签机制，旧内容不再出现在公告里。

## 原型里先要修的 5 个问题

| # | 问题 | 位置 | 建议修法 |
| --- | --- | --- | --- |
| 1 | 帮助文字说 rush 会“pauses”，实际是取消 | 文字在 HTML:89；取消逻辑在 HTML:321 | 改成 “clicking something else cancels the rush; click the stove again”，或者干脆随第 3 条一起删除 |
| 2 | “rush paused N/M” 标签永远不会显示：一个绿区时，`step` 从 0 直接到完成 | HTML:539–540，对照 HTML:376、387–389 | 换成拍 6 的 “Rush cancelled” 短标签（在 HTML:321 设一个标志），或者删掉 |
| 3 | 常驻帮助段落和开门卡文字，实际上就是一张图例，和“不放图例”的决定冲突 | HTML:89；HTML:617 | 拍 0、B0、C0 做好之后删掉 HTML:89，开门卡只保留地点、天数和一句当天预告 |
| 4 | 盘子用光时兔子静默停工，唯一的信号是耐心环变小 | HTML:416、432 | 兔子头上画一个空盘气泡或 “!”，配合拍 5 和 5c。这只是显示，不改兔子规则 |
| 5 | Countryside 在第 1 天和第 3 天都见不到外卖员 | 时间表 HTML:279–286 | 这是设计问题，见上面的选项表。如果接受，外卖员的教学就要准备在“第一次出现”时触发，不要绑定在第 3 天 |

顺带发现、但不在必修清单里的问题。小结卡没有任何归因行（HTML:620–624），第 3 天的因果链在这里断了。打烊后坐着的客人仍会不满离开，但没有任何提示（仿真：Countryside 第 3 天 seed 3，打烊时 9 人不满，到 136.8 s 变成 14 人）。到客时间用没有种子的 `Math.random`（HTML:278、301、377），playtest 之间没法比较。广告颜色跟着**地点**走（HTML:137：Countryside 蓝、City 粉），而正式游戏可能按座位（P1 蓝、P2 粉）。

## 先在原型里做什么，好让团队能试玩教程

1. **冻结门和聚光层。** 在 HTML:607 加 `tutFreeze`；在 `render()` 里画压暗、镂空聚光和一行文字；在 `enqueue`（HTML:317）里加“动作已入队”回调，用来解冻。
2. **两个新检测。** “门口有未认领客人且没有空兔子桌”和“盘子为 0 且有客人在等”，每帧在 `update()` 里轮询，同一时刻最多触发一个冻结拍。
3. **拍表数据化。** 把上面三张表写成一个数组 `{id, trigger(), target, line, freeze, done()}`，加上 `localStorage` 三级标记，以及 URL 参数 `?tips=reset` / `?tips=off`，方便反复测。
4. **到客时间表开关。** 在 Tuning 抽屉里加 “Day 1 schedule: natural / scripted”（S1 对 S3+S5）和一个种子输入框，团队可以直接 A/B，不用改代码。
5. **第 3 天的桥接信号。** 广告客人首次描边，弹窗加一行；BUS 标记跳动和到达前预告；首个外卖员聚光；小结卡加归因行。
6. **修复问题 1–4**，然后删掉 HTML:89 的帮助段落，看玩家没有它能不能玩下去。
7. **试玩记录。** 每个拍在 console 打印“出现 / 完成”的时间戳，以及 rush 的失误次数。重点看三件事：拍 3 从冻结到点击用了几秒；第一次 rush 失误几次；第 3 天小结时，玩家能不能说出 “蓝色客人是我的 Flyers 带来的”。
8. **Ads 阶段的纸面或静态 mock。** 原型里没有这个阶段，先用一张静态 HTML 卡片测 A0–A3 的文案。

## Conclusion

这次梳理改变了一个判断：原型的数值让 **rush 成了第 1 天天然的高潮，门口反而成了可有可无的地方**。所以教学设计真正的杠杆，不在多写几句提示，而在第 1 天的到客时间表要不要为教学服务。这是一个规则决定，应当由团队在第一次试玩后、看到拍 3 实际出现的时间再拍板。第 3 天则提醒我们，教“因果”和教“动作”是两种不同的工作。动作靠冻结加亲手做，因果靠同一个颜色、同一个卡名在三个地方出现。最后那一行小结，成本最低，回报却可能最高。

**待团队决定：**

1. 第 1 天的到客时间表：S1 自然时机、S2 缩短开场、S3 约 30 s 一小群、S4 第一位客人直接走到 no-staff 区、S5 教程固定种子，选哪一个或哪几个组合。
2. 第一次 rush 的滑块要不要放慢（只用页面常量），还是维持现状，靠“失误免费”。
3. Countryside 第 3 天大巴撞上盘子用光：不改、挪时间，还是首辆大巴短暂冻结。
4. 广告和事件是否维持同在第 3 天开始，还是错开到第 3 天和第 4 天。
5. 第 3 天是否限制只能放 1 张广告卡。
6. Countryside 何时、是否遇到外卖员；City 的第一个外卖员要不要挪到第一批客人之后。
7. 广告客人的颜色按地点还是按座位（P1 蓝 / P2 粉）；对手的卡生效时，用对手颜色弹窗并单列一行归因。
8. 冻结拍的总时长上限，以及等待方看到的中性文案。
9. 本文所有【占位】时长和英文提示文案的首轮试玩值。
10. 删除 HTML:89 帮助段落和开门卡说明，是否要等教程做好、试玩确认之后。
