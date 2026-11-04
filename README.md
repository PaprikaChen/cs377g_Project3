# 餐厅经营对战 · 联机原型 v1

两位玩家在两台设备上对战的静态网页。对局数据存在 Firebase（Firestore 数据库 + 匿名登录），玩家不需要注册账号，打开网页、输入房间号就能玩。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `index.html` | 网页入口 |
| `style.css` | 样式 |
| `engine.js` | 游戏规则和数值（`CFG` 里的数字都可以直接改） |
| `app.js` | 界面、联机同步、本机测试模式 |
| `firebase-config.js` | 填你们自己的 Firebase 配置 |
| `firestore.rules` | 数据库安全规则，要粘贴到 Firebase 控制台 |

## 一、创建 Firebase 项目（约 15 分钟，只需做一次）

1. 打开 [Firebase 控制台](https://console.firebase.google.com)，用 Google 账号登录，点"添加项目"。Google Analytics 可以不开。免费的 Spark 方案就够用。
2. **开启匿名登录**：左侧"Build → Authentication"，点"Get started"，在"Sign-in method"里启用 **Anonymous**。
3. **创建数据库**：左侧"Build → Firestore Database"，点"Create database"，选离你们近的区域，模式选 **production mode**。
4. **发布安全规则**：在 Firestore 的"Rules"标签页，把 `firestore.rules` 的全部内容粘贴进去，点"Publish"。
5. **拿到网页配置**：点左上角齿轮"Project settings"，在"Your apps"里点 `</>` 图标添加一个 Web 应用（不用勾选 Hosting）。把它给出的 `firebaseConfig` 里的几个值，填进 `firebase-config.js` 对应的引号里。

## 二、本地试运行

网页用了 ES 模块，不能直接双击 `index.html` 打开，要用一个本地服务器：

```
cd 这个文件夹
python3 -m http.server 8000
```

然后在浏览器打开 `http://localhost:8000`。`localhost` 默认就在 Firebase 的授权域名里，不需要额外设置。

自己测试联机：同一个浏览器只能当一名玩家（匿名身份是按浏览器保存的）。第二位玩家请用另一台设备，或者同一台电脑上的无痕窗口 / 另一个浏览器。

## 三、发布到网上（任选一种）

**GitHub Pages（推荐）**
1. 新建一个 GitHub 仓库，把这个文件夹里的文件上传到仓库根目录。
2. 仓库"Settings → Pages"，Source 选"Deploy from a branch"，分支选 `main`、目录选 `/ (root)`，保存。几分钟后会得到 `https://你的用户名.github.io/仓库名/` 这样的地址。
3. **把域名加进 Firebase 授权列表**：Firebase 控制台"Authentication → Settings → Authorized domains"，添加 `你的用户名.github.io`。不加的话网页会提示"当前网址不在授权域名列表里"。

**Firebase Hosting**：如果组里有人装了 Node.js，也可以用 `firebase-tools` 部署，域名会自动授权。

## 四、怎么玩

1. 玩家 1 填昵称，点"新建房间"，把网页地址和 4 位房间号发给对手。
2. 玩家 2 打开网页，填昵称，输入房间号加入。
3. 每天依次进行：事件 → 投资 → 市场（轮流买食材）→ 放牌（真牌或空牌，背面朝上放在自己或对手店门口）→ 应对（翻牌前临时扩容）→ 营业（逐张翻牌、逐个揭晓客人）→ 复盘账单。5 天后计分。
4. 刷新页面或断网重连后，点"回到房间"就能继续。

"本机测试"模式不需要 Firebase，一个人在同一个页面操作两家餐厅，适合调数值。

## 调整数值

规则数字都在 `engine.js` 开头的 `CFG` 里，例如：

- `loc.country` / `loc.city`：开店费、房租、初始桌子、每桌收入 `price`、免费食材
- `ad`：真牌价格 `real`、空牌价格 `blank`、每张真牌一定带来的客人数 `customers`、每家店门口最多几张 `maxPerShop`
- `respond`：翻牌前紧急补货的价格与每天上限
- `rep`：声誉带来的潜在客人数和到店概率、低声誉时老客人流失的概率
- `market`：每天库存 24 份和三档价格
- `voucher`：补偿券价格
- `loan.enabled`：贷款开关，目前关闭（`false`）；改成 `true` 就恢复贷款
- `starValue`：每颗星在最终得分里值多少钱

改完保存、刷新网页即可。**注意：两位玩家必须使用同一版本的规则**，正在进行的对局里改数值会让双方算出不一样的结果，请在对局之间改。

## 关于公平性

- 放牌时，对手只能看到张数和一个校验码；翻牌时才揭晓真假，并用校验码核对，事后改不了。
- 每位玩家只能修改自己的行动记录，这由 `firestore.rules` 保证。
- 这是课程原型：懂技术的玩家理论上可以在浏览器开发者工具里提前算出骰子结果。对外试玩一般不需要担心。

## 免费额度

Spark 免费方案每天有 5 万次读取、2 万次写入。一局游戏大约几百次读写，课堂试玩完全够用。
