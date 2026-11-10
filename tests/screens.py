"""Fast screenshots of every screen, in light and dark theme.

Instead of playing a game in real time, this builds each game state straight from the engine
(the game is deterministic: the same seed and actions always give the same state), drops it into
the page in practice mode and takes a picture. Nothing is sent to Firebase.

Usage (from the repo root):
  python3 -m http.server 8765 &
  python3 tests/screens.py http://localhost:8765/index.html out-folder
"""
import asyncio, sys, os
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/index.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'screens'

# Runs inside the page. Uses only the engine's public functions and window.__rr (the page state).
HELPERS = r"""
window.__shot = (() => {
  const salt = 'shot';
  // A simple, deterministic player. `opt` steers it towards the situation we want to show.
  function bot(S, s, priv, opt) {
    const k = S.waiting[s], p = S.players[s];
    switch (S.phase) {
      case 'pick': return { k, loc: (opt.loc && opt.loc[s]) || (s === 'p1' ? 'country' : 'city') };
      case 'morning': return { k };
      case 'invest': return { k, tables: opt.tables != null ? opt.tables : 1, choice: opt.choice || 'decline' };
      case 'market': {
        const want = opt.food != null ? opt.food : 4, buys = [];
        S.market.items.forEach((t, i) => { if (buys.length < want && (i % 2 === (s === 'p1' ? 0 : 1))) buys.push(i); });
        return { k, buys };
      }
      case 'commit': {
        const sh = S.shops[s], c = { self: opt.noAds ? [] : sh.self.slice(0, 1), rival: opt.noAds ? [] : sh.rival.slice(0, 1) };
        priv[s] = { ...c, salt }; return { k, h: adHash(c, salt), nSelf: c.self.length, nRival: c.rival.length };
      }
      case 'reveal': return { k, ...priv[s] };
      case 'service': {
        const ops = []; let closed = 0;
        for (let g = 0; g < 60; g++) {
          const v = serviceRun(S, s, ops, closed); if (!v.pending) break;
          if (v.pending.kind === 'food') { ops.push({ a: 'food', give: true }); continue; }
          if (opt.rush && v.pending.tries < 1) { ops.push({ ep: v.pending.ep, a: 'rush' }); continue; }
          closed++;
        }
        return { k, ops };
      }
      case 'voucher': return { k, n: 0 };
      case 'report': return { k };
    }
  }
  // Play until the target phase/round starts (before anyone acts in it)
  function playTo(seed, phase, round, opt = {}) {
    const logs = { p1: [], p2: [] }, priv = {};
    let S;
    for (let g = 0; g < 600; g++) {
      S = simulate(seed, logs);
      if ((S.phase === phase && (round == null || S.round === round)) || S.phase === 'over') break;
      const s = S.waiting.p1 ? 'p1' : S.waiting.p2 ? 'p2' : null; if (!s) break;
      logs[s].push(bot(S, s, priv, opt));
    }
    return { seed, logs, priv, S };
  }
  // Find a seed whose game reaches a state where test(S) is true
  function find(phase, round, test, opt = {}) {
    for (let i = 0; i < 400; i++) { const g = playTo('shot' + i, phase, round, opt); if (g.S.phase === phase && test(g.S)) return g; }
    return null;
  }
  // Load a game into the page, as one-screen practice, and redraw
  function load(g, view = 'p1', extra = {}) {
    const a = window.__rr, S = simulate(g.seed, g.logs);
    Object.assign(a, { mode: 'local', code: 'shot', me: null, seed: g.seed, logs: g.logs, S, view, intro: 99, cover: null, howto: null,
      form: {}, priv: {}, svc: {}, cool: {}, claiming: {}, mkt: null });
    for (const s of ['p1', 'p2']) if (g.priv[s]) a.priv[`shot:${S.round}:${s}`] = g.priv[s];
    if (extra.form) a.form[`${view}|${S.waiting[view]}`] = extra.form;
    if (extra.market) {
      const now = Date.now(), items = S.market.items;
      a.mkt = { key: `shot:${g.seed}:${S.round}`, owner: extra.market.owner, start: extra.market.elapsed == null ? null : now - extra.market.elapsed * 1000, ready: extra.market.ready || {}, mine: {} };
      if (extra.market.cooling != null) { const i = extra.market.cooling; a.cool[view] = { i, type: items[i], start: now - 1000, until: now + CFG.market[items[i]].cd * 1000 - 1000 }; }
    }
    if (extra.svc) a.svc[view] = { key: `shot:${g.seed}:${S.round}:${view}`, started: true, ops: [], busy: null, waitAt: Date.now() - 3000, last: Date.now(), fast: false, msg: '', ...extra.svc };
    if (extra.cover) a.cover = view;
    if (extra.intro != null) a.intro = extra.intro;
    poke();
    return S;
  }
  function home(extra = {}) { Object.assign(window.__rr, { mode: null, S: null, seed: null, howto: null, invite: null, resume: null, showJoin: false, err: '' }, extra); poke(); }
  // The page only redraws from its own click handler, so click a harmless hidden button
  function poke() { const b = document.createElement('button'); b.dataset.act = 'howto-close'; b.style.display = 'none'; document.body.appendChild(b); b.click(); b.remove(); }
  return { playTo, find, load, home, poke };
})();
"""

# Each screen: (file name, javascript that sets it up). The javascript runs with window.__shot available.
SCREENS = [
  ('01-landing', "__shot.home()"),
  ('01b-returning', "__shot.home({ resume: { code: 'ZXUA', day: 3, started: true, rival: 'Alex', gap: 12 } })"),
  ('01c-invite', "__shot.home({ invite: { code: 'ZXUA', name: 'Alex' } })"),
  ('02b-waiting-room', "{ __shot.load(__shot.playTo('shot0', 'pick')); Object.assign(__rr, { mode: 'online', me: 'p1', view: 'p1', code: 'ZXUA', seats: { p1: { uid: 'u1', name: 'Sam' } } }); __shot.poke() }"),
  ('02-how-to-play', "__shot.home(); document.querySelector('[data-act=howto]').click(); document.querySelector('[data-act=howto-sec][data-sec=day]').click()"),
  ('03-intro', "__shot.load(__shot.playTo('shot0', 'pick'), 'p1', { intro: 0 })"),
  ('03b-intro-final', "__shot.load(__shot.playTo('shot0', 'pick'), 'p1', { intro: 4 })"),
  ('04-pick', "__shot.load(__shot.playTo('shot0', 'pick'))"),
  ('04b-pick-selected', "{ const g = __shot.playTo('shot0', 'pick'); __shot.load(g, 'p1', { form: { loc: 'country' } }) }"),
  ('05-practice-cover', "__shot.load(__shot.playTo('shot0', 'invest', 1), 'p2', { cover: true })"),
  ('05b-gift-day1', "__shot.load(__shot.playTo('shot0', 'invest', 1), 'p1', { form: { tables: 0, choice: null } })"),
  ('06-build-day1', "__shot.load(__shot.playTo('shot0', 'invest', 1), 'p1', { form: { tables: 2, choice: null, gift: true, offer: true } })"),
  ('07a-morning-booking', "{ const g = __shot.find('invest', 2, S => S.events.p1.type === 'noshow'); __shot.load(g, 'p1', { form: { tables: 0, choice: 'hold' } }) }"),
  ('07-build-booking', "{ const g = __shot.find('invest', 2, S => S.events.p1.type === 'noshow'); __shot.load(g, 'p1', { form: { tables: 1, choice: 'hold', offer: true } }) }"),
  ('08-morning-shady-unanswered', "{ const g = __shot.find('invest', 2, S => S.events.p1.type === 'shady'); __shot.load(g, 'p1', { form: { tables: 0, choice: null } }) }"),
  ('09-build-robbed', "{ const g = __shot.find('invest', null, S => S.round > 1 && S.morning.p1 && S.morning.p1.robbed > 0 && S.events.p1.type === 'quiet'); if (g) __shot.load(g, 'p1', { form: { tables: 0, choice: null } }) }"),
  ('10a-market-briefing', "{ const g = __shot.playTo('shot0', 'market', 2); __shot.load(g, 'p1', { market: { owner: {}, elapsed: null } }) }"),
  ('10b-market-waiting-rival', "{ const g = __shot.playTo('shot0', 'market', 2); __shot.load(g, 'p1', { market: { owner: {}, elapsed: null, ready: { p1: Date.now() - 8000 } } }) }"),
  ('10-market', "{ const g = __shot.playTo('shot0', 'market', 2); __shot.load(g, 'p1', { market: { owner: { 0: 'p1', 1: 'p2', 2: 'p2', 4: 'p1', 5: 'p2' }, elapsed: 24, cooling: 4 } }) }"),
  ('11-market-last-day', "{ const g = __shot.find('market', 5, S => true, { loc: { p1: 'country', p2: 'country' }, rush: true }); __shot.load(g, 'p1', { market: { owner: { 0: 'p2' }, elapsed: 5 } }) }"),
  ('12-ads', "{ const g = __shot.playTo('shot0', 'commit', 2); const sh = g.S.shops.p1; __shot.load(g, 'p1', { form: { sel: [sh.self[0], sh.rival[0]] } }) }"),
  ('13a-cards-flip', "{ const g = __shot.playTo('shot0', 'service', 2); __shot.load(g, 'p1', { svc: { started: false, idx: 0, closed: 0, flip: 1 } }) }"),
  ('13-service-ready', "{ const g = __shot.playTo('shot0', 'service', 2); __shot.load(g, 'p1', { svc: { started: false, idx: 0, closed: 0, flip: 99 } }) }"),
  ('13b-service-running', "{ const g = __shot.playTo('shot0', 'service', 2); __shot.load(g, 'p1', { svc: { idx: 2, closed: 0, flip: 99 } }) }"),
  ('14-service-shortage', "{ const g = __shot.find('service', 2, S => { const v = serviceRun(S, 'p1', [], 0); return v.pending && v.pending.kind === 'short'; }, { tables: 0, food: 2, loc: { p1: 'city', p2: 'city' } }); const v = serviceRun(g.S, 'p1', [], 0); __shot.load(g, 'p1', { svc: { idx: v.out.length, closed: 0 } }) }"),
  ('15-service-food-request', "{ const g = __shot.find('service', null, S => { for (let c = 0; c < 8; c++) { const v = serviceRun(S, 'p1', [], c); if (v.pending && v.pending.kind === 'food') return true; if (!v.pending) return false; } return false; }); let c = 0, v; for (; c < 8; c++) { v = serviceRun(g.S, 'p1', [], c); if (v.pending && v.pending.kind === 'food') break; } __shot.load(g, 'p1', { svc: { idx: v.out.length, closed: c } }) }"),
  ('16a-closing-day1-waste', "{ const g = __shot.playTo('shot0', 'service', 1, { noAds: true }); const v = serviceRun(g.S, 'p1', []); __shot.load(g, 'p1', { svc: { idx: v.out.length, closed: 99 } }) }"),
  ('16-service-closing', "{ const g = __shot.playTo('shot0', 'service', 3, { rush: true }); const v = serviceRun(g.S, 'p1', []); __shot.load(g, 'p1', { svc: { idx: v.out.length, closed: 99 } }) }"),
  ('17-vouchers', "{ const g = __shot.find('voucher', null, S => !!S.waiting.p1); __shot.load(g, 'p1', { form: { n: 1 } }) }"),
  ('17b-vouchers-three', "{ const g = __shot.find('voucher', null, S => !!S.waiting.p1 && S.service.p1.turned >= 3); if (g) __shot.load(g, 'p1', { form: { n: 2 } }) }"),
  ('18-recap', "__shot.load(__shot.playTo('shot0', 'report', 3, { rush: true }))"),
  ('19-final', "__shot.load(__shot.find('over', null, S => S.result.reason === 'done', { loc: { p1: 'country', p2: 'country' }, rush: true }))"),
  ('20-final-closed', "{ const g = __shot.find('over', null, S => S.result.reason === 'bankrupt', { tables: 3, food: 6 }); if (g) __shot.load(g, 'p1') }"),
]

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs = []
        for theme in ['light', 'dark']:
            pg = await b.new_page(viewport={'width': 1440, 'height': 900})
            pg.on('pageerror', lambda e, t=theme: errs.append(f'{t}: {e}'))
            await pg.add_init_script(f"localStorage.setItem('rr:theme', '{theme}')")
            await pg.goto(URL); await pg.wait_for_function('window.__rr && document.querySelector("#bar .tools")')
            await pg.evaluate(HELPERS); await pg.wait_for_timeout(400)  # fonts
            for name, js in SCREENS:
                try:
                    await pg.evaluate(js); await pg.wait_for_timeout(450 if 'how-to' in name else 120)  # let the drawer finish sliding in
                    await pg.screenshot(path=f'{OUT}/{name}-{theme}.png', full_page=True)
                except Exception as e:
                    errs.append(f'{theme} {name}: {e}')
            await pg.close()
        await b.close()
    print(f'{len(SCREENS) * 2} screenshots in {OUT}/')
    print('errors:', errs or 'none')

asyncio.run(main())
