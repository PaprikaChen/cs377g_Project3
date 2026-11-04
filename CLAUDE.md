# 餐厅经营对战 · 给 Claude 的项目说明

这个文件是给 Claude（聊天里的 Claude 或 Claude Code）看的项目上下文。每次开始修改前先读完它。

## 项目是什么

一款教 13 岁以上玩家餐厅经营的双人对战网页游戏，是一门游戏设计课的小组项目，现在处于第一版原型阶段，目标是快速迭代、拿去试玩。

- 线上地址：GitHub Pages（仓库 Settings → Pages 里能看到）
- 后端：Firebase 匿名登录 + Firestore，没有自己的服务器
- 小组的 AI 使用规定：**游戏设计内容（规则、数值、文案的创意）由小组原创；AI 用于写代码和交叉检查。** 所以改规则或数值时，按小组给的要求实现；不要主动发明新机制或新数值。如果觉得某个设计有问题，指出来并给理由，由小组决定。

## 文件

| 文件 | 内容 |
| --- | --- |
| `engine.js` | 全部游戏规则。`CFG` 是所有数值；`simulate(seed, logs)` 把双方行动记录重放成游戏状态 |
| `app.js` | 界面渲染、Firebase 同步、本机测试模式（ES 模块） |
| `style.css` | 样式，颜色都用 `:root` 里的变量，同时支持浅色和深色 |
| `index.html` | 入口，按顺序加载 `firebase-config.js` → `engine.js` → `app.js` |
| `firebase-config.js` | Firebase 网页配置（公开值，可以提交） |
| `firestore.rules` | 数据库安全规则，**改了以后要由人手动粘贴到 Firebase 控制台发布** |
| `tests/` | 测试，见下文 |

## 架构要点（改代码前必须理解）

1. **确定性重放**：游戏状态从不直接存进数据库。每位玩家只往自己的座位文档 `games/{code}/seats/{p1|p2}` 追加行动（`log` 数组）。两边浏览器都用 `simulate(seed, {p1: log, p2: log})` 从头算出同一个状态。所以 `engine.js` 里**不能用 `Math.random()` 或当前时间**，随机数一律用 `rand(seed, tag)` / `d6(seed, tag)`。
2. **行动键 `k`**：每个行动带一个键，比如 `"3:market:5"`（第 3 天、市场阶段、第 5 步）。每天的阶段顺序：事件 `event` → 投资 `invest` → 市场 `market` → 放牌 `commit` → 应对 `respond` → 翻牌 `reveal`（自动）→ 补偿券 `voucher` → 复盘 `report`。`expected(S)` 决定当前等谁、等哪个键；键不匹配的行动会被丢弃，这样重复点击不会生效两次。新增阶段时要同时改 `expected()`、`apply()` 和 `app.js` 里的 `actionHTML()`。
3. **背面朝上的广告牌**：放牌时公开的只有每家店门口的张数（`nSelf` / `nRival`）和校验码 `adHash({selfReal, selfBlank, rivalReal, rivalBlank}, salt)`；真假组合存在本机和 `users/{uid}/ads/...`（只有本人可读）。双方应对完后各自自动翻牌，`apply('reveal')` 核对校验码和张数，对不上就把这位玩家的牌全按空牌算。牌钱在翻牌时才扣，所以应对阶段界面要先为自己的牌预留这笔钱。
4. **营业过程逐步揭晓**：`runService()` 把每一次随机（翻牌、声誉客人、预订）按顺序记进 `S.service[座位].steps`。界面的 `openingHTML()` / `tick()` 只是把这些步骤一条条播出来，不参与计算；看没看过动画只记在本机（`played:` 开头的 localStorage），不同步给对手。新增随机项时，记得同时加一种 step 和 `stepLine()` 里对应的文字。
5. **占位数值**：`CFG` 里注释标“待定”的数字（真牌和空牌的价格、每家店门口最多几张、声誉客人的到店概率、紧急补货的价格）是占位值，等小组定稿后替换。
6. **版本一致**：两位玩家必须运行同一版 `engine.js`，否则算出的结果不同。改了规则或数值后，进行中的旧对局会按新规则重算。提醒小组：改版放在两局之间，并让双方刷新页面。

## Firestore 数据结构

```
games/{code}                 { seed, host, created, v }      房主创建，之后不可改
games/{code}/seats/p1|p2     { uid, name, log: [行动...] }   只有座位本人能更新
users/{uid}/ads/{code}-r{n}  { selfReal, selfBlank, rivalReal, rivalBlank, salt }  只有本人可读写
```

改了路径或字段，就要同步修改 `firestore.rules`，并告诉小组需要去控制台重新发布规则。

## 测试（每次修改后都要跑）

```
node tests/engine.test.js        # 随机模拟 2000 局，检查不会卡住、星级在 1–5 之间
```

界面和联机流程（需要 Python 的 playwright 和 Chromium）：

```
python3 -m http.server 8765 &     # 在仓库根目录
python3 tests/online.test.py http://localhost:8765/index.html
```

`online.test.py` 用 `tests/fake-backend.js` 冒充 Firebase，在两个页面里各扮演一位玩家打完一整局，检查两边结果一致、广告揭晓校验通过、没有页面报错。`app.js` 里检测 `window.__RR_FAKE_FB` 的那段是给这个测试用的，不要删。

## 发布

推送到 `main` 分支，GitHub Pages 会在约 1 分钟内自动更新。提交信息用中文简短说明改了什么，方便小组看懂。

## 相关文档

- 第一版原型提案（规则和数值的来源）：https://claude.ai/artifact/XXaDQPnC3Tgbi1U9Z1FE2t （仅对分享过的人可见）
- 设置和部署步骤：`README.md`
