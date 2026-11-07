# Restaurant Rivals · online prototype v1

A two-player restaurant game you play on two devices in the browser. Game data lives in Firebase (Firestore + anonymous sign-in), so players don't need an account: open the page, type a room code, play.

Live site: https://paprikachen.github.io/cs377g_Project3/

## Files

| File | What it does |
| --- | --- |
| `index.html` | Entry page |
| `style.css` | Styles |
| `engine.js` | Game rules and numbers (edit the values in `CFG`) |
| `app.js` | Screens, online sync, local test mode |
| `firebase-config.js` | Our Firebase web config |
| `firestore.rules` | Database security rules; paste into the Firebase console to publish |
| `tests/` | Automated tests |

## 1. Firebase setup (already done for this project)

Only needed if you make a new Firebase project.

1. Open the [Firebase console](https://console.firebase.google.com), sign in, and click **Add project**. Google Analytics is optional. The free Spark plan is enough.
2. **Turn on anonymous sign-in**: Build → Authentication → Get started → Sign-in method → enable **Anonymous**.
3. **Create the database**: Build → Firestore Database → Create database. Pick a nearby region and **production mode**.
4. **Publish the rules**: in Firestore's **Rules** tab, replace everything with the contents of `firestore.rules`, then click **Publish**.
5. **Get the web config**: gear icon → Project settings → Your apps → `</>` (Web). Skip Hosting. Copy the `firebaseConfig` values into `firebase-config.js`.
6. **Authorize the site**: Authentication → Settings → Authorized domains → add `paprikachen.github.io`.

## 2. Run it locally

The page uses ES modules, so double-clicking `index.html` won't work. Start a local server:

```
cd path/to/this/folder
python3 -m http.server 8000
```

Then open `http://localhost:8000`. `localhost` is authorized in Firebase by default.

To test online play by yourself: one browser can only be one player (the anonymous identity is saved per browser). Use a second device, a private window, or a different browser for player 2.

## 3. Publishing

Pushing to `main` updates GitHub Pages in about a minute. GitHub caches pages for a few minutes; if you still see the old version, hard-refresh (`Ctrl/Cmd + Shift + R`) or add `?v=2` to the URL.

## 4. How to play

1. Player 1 enters a name, clicks **Create room**, and sends the link and the 4-letter room code to player 2.
2. Player 2 opens the page, enters a name and the room code.
3. Each day: Event → Build → Market (take turns buying food) → Ads (face-down real or bluff cards, at your shop or your rival's) → Prep (pop-up tables and rush food before the flip) → Service (cards flip, customers arrive one by one) → Recap. Score after day 5.
4. After a refresh or a dropped connection, click **Back to [room]** to continue.

**Local test** needs no Firebase: one person plays both shops on one screen. Good for tuning numbers.

## Tuning the numbers

All rule values are in `CFG` at the top of `engine.js`:

- `loc.country` / `loc.city`: opening cost, rent, starting tables, income per table `price`, free food
- `ad`: real card price `real`, bluff price `blank`, customers each real card brings `customers`, cards allowed per shop `maxPerShop`
- `respond`: prices and daily limits for pop-up tables and rush food
- `rep`: extra customers from high stars and their arrival chance, and the chance of losing regulars at low stars
- `market`: daily stock of 24 and the three price tiers
- `voucher`: comp voucher price
- `loan.enabled`: loans are off (`false`); set to `true` to bring them back
- `starValue`: how much each star is worth in the final score

Save and refresh. **Both players must run the same version of the rules.** Changing numbers mid-game makes the two sides compute different results, so change them between games.

## Fairness

- When cards are placed, the rival sees only how many there are plus a checksum. The real/bluff split is revealed at the flip and checked against the checksum, so it can't be changed afterward.
- Each player can only edit their own action log; `firestore.rules` enforces this.
- This is a class prototype: a technical player could work out dice rolls early with browser dev tools. Not a concern for playtesting.

## Free quota

The Spark plan allows 50,000 reads and 20,000 writes a day. One game uses a few hundred, which is plenty for class playtests.
