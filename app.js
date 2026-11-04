// ===== Page: lobby, online sync through Firebase (Firestore + anonymous sign-in), local test mode =====
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => { const v = Math.abs(n), t = Number.isInteger(v) ? String(v) : v.toFixed(2); return (n < 0 ? '−$' : '$') + t; };
const ex = n => String(Math.round(n * 10) / 10); // 期望人数保留一位小数
const pct = x => Math.round(x * 100) + '%';
const lsGet = k => { try { return localStorage.getItem('rr:' + k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem('rr:' + k, v); } catch (e) {} };
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = (n = 4) => { const a = new Uint32Array(n); crypto.getRandomValues(a); return [...a].map(x => CODE_CHARS[x % CODE_CHARS.length]).join(''); };
const randHex = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

const app = {
  mode: null, fb: null, uid: null, dbReady: false, dbMsg: '正在连接服务器…',
  code: null, seed: null, seats: {}, logs: { p1: [], p2: [] }, me: null, view: 'p1',
  nick: (lsGet('nick') || '').slice(0, 12), S: null, form: {}, priv: {}, revealing: {}, unsub: [], chain: Promise.resolve(),
  err: '', busy: false, loadNote: '', played: {}, playing: null, playTimer: null
};

window.__rr = app; // 调试用：在浏览器控制台输入 __rr.S 查看当前对局状态

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 3500);
}

// ---------- seats & names ----------
const controlled = () => (app.mode === 'local' ? ['p1', 'p2'] : [app.me]);
const viewer = () => (app.mode === 'local' ? app.view : app.me);
function nameOf(s) {
  if (app.mode === 'local') return s === 'p1' ? '玩家 1' : '玩家 2';
  if (s === app.me) return '你';
  return (app.seats[s] && app.seats[s].name) || '对手';
}
function seatTag(s) { return s === 'p1' ? '玩家 1' : '玩家 2'; }

// ---------- Firebase backend ----------
// fb wraps the few Firestore calls the game needs, so the rest of the page never touches the SDK directly.
(async () => {
  // 测试钩子：自动化测试可以注入一个假的后端，正常使用时不存在
  if (typeof window.__RR_FAKE_FB === 'function') {
    app.fb = window.__RR_FAKE_FB(); app.uid = app.fb.uid; app.dbReady = true; app.dbMsg = ''; return render();
  }
  const cfg = window.FIREBASE_CONFIG || {};
  if (!cfg.apiKey || !cfg.projectId) {
    app.dbMsg = '还没有填写 Firebase 配置（firebase-config.js），联机对战暂时不可用。可以先用本机测试模式。';
    return render();
  }
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    const fbApp = initializeApp(cfg), auth = A.getAuth(fbApp), db = F.getFirestore(fbApp);
    const cred = auth.currentUser ? { user: auth.currentUser } : await A.signInAnonymously(auth);
    app.uid = cred.user.uid;
    const ref = p => F.doc(db, p);
    app.fb = {
      async get(p) { const s = await F.getDoc(ref(p)); return { exists: s.exists(), data: s.exists() ? s.data() : null }; },
      set: (p, d) => F.setDoc(ref(p), d),
      watchDoc: (p, next, err) => F.onSnapshot(ref(p), { includeMetadataChanges: false },
        s => next({ exists: s.exists(), data: s.exists() ? s.data() : null, fromCache: s.metadata.fromCache }), err),
      watchCol: (p, next, err) => F.onSnapshot(F.collection(db, p), s => next(s.docs.map(d => ({ id: d.id, data: d.data() }))), err),
      // Take seat p2 only if nobody else holds it; the transaction makes two joiners at once safe.
      claim: (p, data) => F.runTransaction(db, async tx => {
        const s = await tx.get(ref(p));
        if (s.exists() && s.data().uid && s.data().uid !== data.uid) throw { code: 'seat-taken' };
        tx.set(ref(p), data);
      })
    };
    app.dbReady = true; app.dbMsg = '';
  } catch (e) {
    const c = e && e.code || '';
    app.dbMsg = c === 'auth/operation-not-allowed' ? 'Firebase 里还没有开启“匿名登录”，联机对战暂时不可用。'
      : c === 'auth/unauthorized-domain' ? '当前网址不在 Firebase 的授权域名列表里，请在 Authentication 设置中添加。'
      : '连不上 Firebase 服务器，请检查网络后刷新页面。可以先用本机测试模式。';
  }
  render();
})();

function writeErr(e) {
  const c = e && e.code || '';
  if (c === 'seat-taken') return '这个房间已经有两名玩家了。';
  if (c === 'permission-denied') return '服务器拒绝了这次写入，请检查 Firestore 安全规则是否已按说明发布。';
  if (c === 'resource-exhausted') return 'Firebase 免费额度今天已用完，请明天再试。';
  return '连接出了问题，请稍后再试。';
}
function saveNick() {
  const el = $('#nick-in'); if (!el) return;
  app.nick = el.value.trim().slice(0, 12); lsSet('nick', app.nick);
}

// ---------- online: create / join / sync ----------
async function createGame() {
  if (!app.dbReady || app.busy) return;
  saveNick(); app.busy = true; app.err = ''; render();
  try {
    for (let i = 0; i < 6; i++) {
      const code = genCode();
      if ((await app.fb.get(`games/${code}`)).exists) continue;
      await app.fb.set(`games/${code}`, { seed: genCode(8) + Date.now(), host: app.uid, created: Date.now(), v: 1 });
      await app.fb.set(`games/${code}/seats/p1`, { uid: app.uid, name: app.nick, log: [] });
      app.busy = false; return enter(code, 'p1');
    }
    app.err = '没能生成房间号，请再试一次。';
  } catch (e) { app.err = writeErr(e); }
  app.busy = false; render();
}
async function joinGame(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) { app.err = '房间号是 4 位字母或数字。'; return render(); }
  if (!app.dbReady || app.busy) return;
  saveNick(); app.busy = true; app.err = ''; render();
  try {
    const g = await app.fb.get(`games/${code}`);
    if (!g.exists) { app.err = `没有找到房间 ${code}。`; app.busy = false; return render(); }
    const [a, b] = await Promise.all(['p1', 'p2'].map(s => app.fb.get(`games/${code}/seats/${s}`)));
    if (a.exists && a.data.uid === app.uid) { app.busy = false; return enter(code, 'p1'); }
    if (b.exists && b.data.uid === app.uid) { app.busy = false; return enter(code, 'p2'); }
    await app.fb.claim(`games/${code}/seats/p2`, { uid: app.uid, name: app.nick, log: [] });
    app.busy = false; enter(code, 'p2');
  } catch (e) { app.err = writeErr(e); app.busy = false; render(); }
}
function enter(code, seat) {
  leave(true);
  Object.assign(app, { mode: 'online', code, me: seat, view: seat, seed: null, seats: {}, logs: { p1: [], p2: [] },
    S: null, form: {}, revealing: {}, err: '', loadNote: '' });
  lsSet('lastCode', code);
  const timer = setTimeout(() => { if (!app.seed) { app.loadNote = '暂时连不上对局数据，可能是网络问题。页面会自动重试。'; render(); } }, 10000);
  app.unsub.push(app.fb.watchDoc(`games/${code}`, snap => {
    if (snap.exists) { app.seed = snap.data.seed; clearTimeout(timer); app.loadNote = ''; refresh(); }
    else if (!snap.fromCache) { clearTimeout(timer); app.loadNote = '这个对局已经不存在了。'; render(); }
  }, () => { clearTimeout(timer); app.loadNote = '对局数据连接中断，请刷新页面。'; render(); }));
  app.unsub.push(app.fb.watchCol(`games/${code}/seats`, docs => {
    for (const d of docs) {
      if (d.id !== 'p1' && d.id !== 'p2') continue;
      const remote = Array.isArray(d.data.log) ? d.data.log : [];
      app.seats[d.id] = { uid: d.data.uid, name: String(d.data.name || '').slice(0, 12) };
      if (d.id === app.me && app.logs[d.id].length > remote.length) continue;
      app.logs[d.id] = remote;
    }
    refresh();
  }, () => { app.loadNote = '对局数据连接中断，请刷新页面。'; render(); }));
  render();
}
function leave(silent) {
  app.unsub.forEach(u => { try { u(); } catch (e) {} }); app.unsub = [];
  if (!silent) { Object.assign(app, { mode: null, code: null, S: null, seed: null, err: '' }); render(); }
}
function startLocal() {
  leave(true);
  Object.assign(app, { mode: 'local', code: 'local', me: null, view: 'p1', seed: genCode(8) + Date.now(), seats: {},
    logs: { p1: [], p2: [] }, S: null, form: {}, revealing: {}, priv: {}, err: '' });
  refresh();
}

// ---------- actions ----------
function act(seat, a) {
  a.t = Date.now();
  app.logs[seat] = [...app.logs[seat], a];
  if (app.mode === 'online') {
    const path = `games/${app.code}/seats/${seat}`;
    app.chain = app.chain.then(() => app.fb.set(path, { uid: app.uid, name: app.nick, log: app.logs[seat] }))
      .catch(e => toast(writeErr(e)));
  }
  refresh();
}
// Which of your cards are real stays on your own device (and in your private Firebase folder) until both players have placed theirs.
const privKey = (s, r) => `${app.code}:${r}:${s}`;
const NO_CARDS = { selfReal: 0, selfBlank: 0, rivalReal: 0, rivalBlank: 0 };
function myCards(s) {
  const key = privKey(s, app.S.round);
  if (!app.priv[key] && app.mode === 'online') { try { const v = JSON.parse(lsGet('ad:' + key) || 'null'); if (v) app.priv[key] = v; } catch (e) {} }
  return app.priv[key] || null;
}
async function commitCards(s, k, c) {
  const r = app.S.round, priv = { ...c, salt: randHex() };
  app.priv[privKey(s, r)] = priv;
  if (app.mode === 'online') {
    lsSet('ad:' + privKey(s, r), JSON.stringify(priv));
    try { await app.fb.set(`users/${app.uid}/ads/${app.code}-r${r}`, priv); } catch (e) {}
  }
  act(s, { k, h: adHash(c, priv.salt), nSelf: c.selfReal + c.selfBlank, nRival: c.rivalReal + c.rivalBlank });
}
async function doReveal(s, k, r) {
  let priv = app.priv[privKey(s, r)];
  if (!priv && app.mode === 'online') {
    try { priv = JSON.parse(lsGet('ad:' + privKey(s, r)) || 'null'); } catch (e) {}
    if (!priv) { try { const d = await app.fb.get(`users/${app.uid}/ads/${app.code}-r${r}`); if (d.exists) priv = d.data; } catch (e) {} }
  }
  if (!priv) { priv = { ...NO_CARDS, salt: '' }; toast('找不到你放牌的记录，你的牌这回合都按空牌计算。'); }
  act(s, { k, selfReal: priv.selfReal, selfBlank: priv.selfBlank, rivalReal: priv.rivalReal, rivalBlank: priv.rivalBlank, salt: priv.salt });
}

function refresh() {
  if (!app.seed) return render();
  app.S = simulate(app.seed, app.logs);
  const S = app.S;
  if (S.phase === 'reveal') for (const s of controlled()) {
    const k = S.waiting[s];
    if (k && !app.revealing[s + k]) { app.revealing[s + k] = true; doReveal(s, k, S.round); }
  }
  if (app.mode === 'local' && !S.waiting[app.view]) {
    const o = app.view === 'p1' ? 'p2' : 'p1';
    if (S.waiting[o] && S.phase !== 'reveal') app.view = o;
  }
  render();
}

// ---------- form state ----------
function F(defaults) {
  const s = viewer(), k = app.S.waiting[s] || 'none', key = s + '|' + k;
  if (!app.form[key]) app.form[key] = { ...defaults };
  return app.form[key];
}

// ---------- rendering ----------
const PHASES = [['event', '事件'], ['invest', '投资'], ['market', '市场'], ['commit', '放牌'], ['respond', '应对'], ['voucher', '营业'], ['report', '复盘']];
const phaseIdx = p => ({ event: 0, invest: 1, market: 2, commit: 3, respond: 4, reveal: 5, voucher: 5, report: 6 })[p] ?? -1;

function render() {
  renderBar();
  const root = $('#app');
  if (!app.mode) { root.innerHTML = lobbyHTML(); return; }
  if (!app.S) { root.innerHTML = `<section class="ticket"><p class="wait"><span class="pulse"></span>正在载入对局…</p>${app.loadNote ? `<p class="err">${esc(app.loadNote)}</p>` : ''}<div class="row"><button class="btn ghost" data-act="leave">返回大厅</button></div></section>`; return; }
  root.innerHTML = gameHTML();
}

function renderBar() {
  const S = app.S, st = $('#steps'), rm = $('#room');
  if (!S || S.phase === 'pick' || S.phase === 'over') st.innerHTML = '';
  else {
    const i = phaseIdx(S.phase);
    st.innerHTML = `<li class="on" style="background:transparent;color:var(--ink);border-color:transparent;font-weight:600">第 ${S.round} / ${CFG.rounds} 天</li>` +
      PHASES.map(([, n], j) => `<li class="${j === i ? 'on' : j < i ? 'done' : ''}">${n}</li>`).join('');
  }
  if (app.mode === 'online') rm.innerHTML = `<span class="chip">房间 <b>${esc(app.code)}</b></span><button class="btn ghost" data-act="copy" style="min-height:32px;padding:4px 10px">复制房间号</button><span class="chip">${seatTag(app.me)}</span><button class="btn ghost" data-act="leave" style="min-height:32px;padding:4px 10px">离开</button>`;
  else if (app.mode === 'local') rm.innerHTML = `<span class="chip">本机测试</span>${['p1', 'p2'].map(s => `<button class="btn ${app.view === s ? '' : 'ghost'}" data-act="view" data-seat="${s}" style="min-height:32px;padding:4px 10px">${seatTag(s)}视角${app.S && app.S.waiting[s] ? ' •' : ''}</button>`).join('')}<button class="btn ghost" data-act="leave" style="min-height:32px;padding:4px 10px">退出</button>`;
  else rm.innerHTML = '';
}

function lobbyHTML() {
  const last = lsGet('lastCode');
  return `<div class="stack">
  <section class="hero">
    <h1>两家餐厅，五天，一个赢家</h1>
    <p class="muted">两位玩家各开一家餐厅，争抢同一批食材，用广告给自己拉客，或者给对手送去接不住的客人。五天后，现金加声誉最高的一方获胜。</p>
  </section>
  ${app.dbMsg ? `<div class="callout warn"><span>${esc(app.dbMsg)}</span></div>` : ''}
  <div class="field" style="max-width:520px"><div class="txt"><b>你的昵称</b><small>对手会看到这个名字，最多 12 个字</small></div>
    <input type="text" id="nick-in" class="nick" maxlength="12" autocomplete="nickname" placeholder="例如：小林" value="${esc(app.nick)}"></div>
  ${app.err ? `<div class="callout bad"><span>${esc(app.err)}</span></div>` : ''}
  <div class="lobby">
    <section class="ticket">
      <div class="ticket-head"><h2>新建对局</h2><span class="label">玩家 1</span></div>
      <p class="muted">生成一个 4 位房间号，发给对手。</p>
      <div class="row"><button class="btn" data-act="create" ${app.dbReady && !app.busy ? '' : 'disabled'}>新建房间</button>
      ${last && app.dbReady ? `<button class="btn ghost" data-act="rejoin" data-code="${esc(last)}">回到房间 ${esc(last)}</button>` : ''}</div>
    </section>
    <section class="ticket">
      <div class="ticket-head"><h2>加入对局</h2><span class="label">玩家 2</span></div>
      <p class="muted">输入对手给你的房间号。</p>
      <form class="row" data-form="join">
        <input type="text" id="code-in" aria-label="房间号" maxlength="4" autocomplete="off" placeholder="ABCD" ${app.dbReady ? '' : 'disabled'}>
        <button class="btn" type="submit" ${app.dbReady && !app.busy ? '' : 'disabled'}>加入</button></form>
    </section>
    <section class="ticket">
      <div class="ticket-head"><h2>本机测试</h2><span class="label">一台电脑</span></div>
      <p class="muted">一个人在同一台电脑上操作两家餐厅，用来检查规则和数值。不需要联网，广告不保密，对局不保存。</p>
      <div class="row"><button class="btn ghost" data-act="local">开始测试</button></div>
    </section>
  </div>
  <div class="callout"><b>怎么让对手加入</b><span>把这个网页的地址和房间号一起发给对手。对手不需要注册账号，打开网页、填好昵称、输入房间号就能加入。同一个浏览器只能当一名玩家，自己测试联机时请用另一台设备或浏览器的无痕窗口。</span></div>
</div>`;
}

function starsHTML(n) { return `<span class="stars" aria-label="${n} 星">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`; }

// Cards in front of `shop`, as `viewerSeat` sees them: your own cards show real/blank, the opponent's stay face down.
function frontHTML(shop, viewerSeat) {
  const S = app.S, cm = S.commits; if (!cm || !cm.p1) return '';
  const own = shop, rival = shop === 'p1' ? 'p2' : 'p1', out = [];
  const add = (placer, n, real, blank) => {
    const mine = app.mode === 'local' ? placer === viewerSeat : placer === app.me;
    const known = mine ? myCards(placer) : null;
    for (let i = 0; i < n; i++) {
      const isReal = known ? i < real : null;
      out.push(`<span class="card" data-from="${placer}" title="${esc(nameOf(placer))}放的">${isReal === null ? '?' : isReal ? '真' : '空'}</span>`);
    }
  };
  const kOwn = myCards(own) || NO_CARDS, kRival = myCards(rival) || NO_CARDS;
  add(own, cm[own].nSelf, kOwn.selfReal, kOwn.selfBlank);
  add(rival, cm[rival].nRival, kRival.rivalReal, kRival.rivalBlank);
  return `<span class="cards">${out.join('') || '<span class="muted">没有牌</span>'}</span>`;
}

function restHTML(s) {
  const S = app.S, p = S.players[s], L = p.loc && CFG.loc[p.loc];
  const c = capacityOf(p), E = expectedDemand(p), demand = E.total;
  const live = ['event', 'invest', 'market', 'commit', 'respond', 'reveal'].includes(S.phase);
  const lim = k => (L && live && c[k] === c.cap && demand > c.cap ? 'limit' : '');
  const flags = [];
  if (p.loan) flags.push(`<span class="flag">已贷款（结束时还 $${CFG.loan.repay}）</span>`);
  if (p.shadyFrom !== null) flags.push('<span class="flag bad">接受了可疑交易</span>');
  if (p.held) flags.push(`<span class="flag">保留了 ${p.held} 张预订桌子</span>`);
  return `<article class="rest" data-seat="${s}">
    <div class="rest-head"><h2>${L ? `${L.name} <span class="muted mono" style="font-size:.85rem">${L.tag}</span>` : '尚未开店'}</h2><span class="who">${app.mode === 'local' ? seatTag(s) : `${esc(nameOf(s))} · ${seatTag(s)}`}</span></div>
    <div class="stats">
      <div class="stat"><span class="label">现金</span><b>${['voucher', 'report'].includes(S.phase) && S.service && !watched() ? '<span class="muted" style="font-size:.85rem">营业中…</span>' : usd(p.cash)}</b></div>
      <div class="stat"><span class="label">声誉</span>${starsHTML(p.stars)}</div>
      <div class="stat"><span class="label">每桌收入</span><b>${L ? '$' + L.price : '—'}</b></div>
    </div>
    ${L && live ? `<div class="capline">
      <div class="res ${lim('tables')}"><span class="label">桌子</span><b>${c.tables}</b>${p.held ? `<span class="muted">另 ${p.held} 张保留</span>` : ''}</div>
      <div class="res ${lim('staff')}"><span class="label">员工 ×3</span><b>${c.staff}</b><span class="muted">${p.staff} 人${p.temp ? ` + 临时 ${p.temp}` : ''}</span></div>
      <div class="res ${lim('ingr')}"><span class="label">食材</span><b>${c.ingr}</b></div>
    </div>
    <div class="forecast"><span>广告前预计 约 <b class="mono">${ex(demand)}</b> 人 <span class="muted">（${E.min}–${E.max}）</span></span><span>今日产能 <b class="mono">${c.cap}</b> 人</span></div>` : ''}
    ${L && !live ? `<div class="forecast"><span>桌子 <b class="mono">${p.tables}</b> 张</span><span>员工 <b class="mono">${p.staff}</b> 人</span></div>` : ''}
    ${['respond', 'reveal'].includes(S.phase) ? `<div class="forecast"><span>店门口的背面牌</span>${frontHTML(s, viewer())}</div>` : ''}
    ${flags.length ? `<div class="flags">${flags.join('')}</div>` : ''}
  </article>`;
}

function waitHTML(s, text) {
  const S = app.S, o = s === 'p1' ? 'p2' : 'p1';
  if (S.submitted[s]) return `<p class="wait"><span class="pulse"></span>已提交，等待${esc(nameOf(o))}…</p>`;
  return `<p class="wait"><span class="pulse"></span>${text || `等待${esc(nameOf(o))}操作…`}</p>`;
}

function stepper(field, val, min, max, label) {
  return `<div class="step" role="group" aria-label="${esc(label)}"><button type="button" data-act="inc" data-f="${field}" data-d="-1" ${val <= min ? 'disabled' : ''} aria-label="减少">−</button><output>${val}</output><button type="button" data-act="inc" data-f="${field}" data-d="1" ${val >= max ? 'disabled' : ''} aria-label="增加">+</button></div>`;
}

function eventHTML() {
  const S = app.S, e = S.event; if (!e) return '';
  if (e.type === 'quiet') return `<div class="event"><span class="label">今日事件</span><b>平静的一天</b><span class="muted">没有特别事件。</span></div>`;
  const t = esc(nameOf(e.seat));
  if (e.type === 'shady') return `<div class="event"><span class="label">今日事件 · ${t}</span><b>可疑客户上门</b>
    <span>有人提出一笔不太干净的交易。接受：立即得到 $${CFG.shady.cash}。之后每天复盘时有 1/6 的概率被检查员发现，罚款 $${CFG.shady.fine} 并掉 1 星。</span>
    <span class="muted">这张事件发给现金较少的一方。${e.choice ? `选择：<b>${e.choice === 'accept' ? '接受了' : '拒绝了'}</b>` : ''}</span></div>`;
  return `<div class="event"><span class="label">今日事件 · ${t}</span><b>有客人预订了 ${CFG.noshow.tables} 张桌子</b>
    <span>保留：这 2 张桌子今天不接待其他客人；营业时掷骰，4–6（50%）客人到场并付 $${CFG.noshow.pay}，1–3 桌子空着。放弃：桌子照常使用，但如果客人到场（50%），会因为没有座位掉 1 星。</span>
    <span class="muted">这张事件发给现金较多的一方，对手在投广告前就能看到选择。${e.choice ? `选择：<b>${e.choice === 'hold' ? '保留桌子' : '放弃预订'}</b>` : ''}</span></div>`;
}

function actionHTML() {
  const S = app.S, s = viewer(), k = S.waiting[s], p = S.players[s], o = s === 'p1' ? 'p2' : 'p1';
  const head = (t, sub) => `<div class="ticket-head"><h2>${t}</h2><span class="label">${sub || ''}</span></div>`;
  switch (S.phase) {
    case 'pick': {
      if (!k) return head('选择餐厅') + waitHTML(s);
      const card = loc => { const L = CFG.loc[loc]; return `<button class="pick" data-act="pick" data-loc="${loc}">
        <span class="row" style="justify-content:space-between"><b style="font-size:1.1rem">${L.name}</b><span class="mono muted">${L.tag}</span></span>
        <dl><dt>开店费用</dt><dd>$${L.open}</dd><dt>每天房租</dt><dd>$${L.rent}</dd><dt>初始桌子</dt><dd>${L.tables} 张</dd>
        <dt>每桌收入</dt><dd>$${L.price}</dd><dt>每天免费食材</dt><dd>${L.free} 份</dd></dl></button>`; };
      return head('选择餐厅', `${seatTag(s)} · 起始资金 $${CFG.startCash}`) +
        `<p class="muted">两家店每天固定有 ${CFG.baseDemand} 位基础客人，声誉和广告牌带来的客人要看运气。每人开局有 ${CFG.startStaff} 名员工、3 星声誉。对手看不到你的选择，直到双方都选好。</p><div class="picks">${card('country')}${card('city')}</div>`;
    }
    case 'event': {
      const e = S.event;
      if (!k) return head('今日事件') + eventHTML() + waitHTML(s, `等待${esc(nameOf(e.seat))}做决定…`);
      const btns = e.type === 'shady'
        ? `<button class="btn" data-act="event" data-c="accept">接受交易（+$${CFG.shady.cash}）</button><button class="btn ghost" data-act="event" data-c="decline">拒绝</button>`
        : `<button class="btn" data-act="event" data-c="hold">保留 2 张桌子</button><button class="btn ghost" data-act="event" data-c="release">放弃预订</button>`;
      return head('今日事件', '轮到你决定') + eventHTML() + `<div class="row">${btns}</div>`;
    }
    case 'invest': {
      if (!k) return head('投资') + waitHTML(s);
      const f = F({ tables: 0, hire: 0, fire: 0, loan: false });
      const cashAfterLoan = p.cash + (f.loan && !p.loan ? CFG.loan.amount : 0);
      const maxT = Math.min(CFG.maxTables - p.tables, Math.floor(Math.max(0, cashAfterLoan) / CFG.tableCost));
      if (f.tables > maxT) f.tables = maxT;
      const staffAfter = Math.max(1, Math.min(CFG.maxStaff, p.staff + f.hire - f.fire));
      const cost = f.tables * CFG.tableCost;
      const capAfter = Math.min(p.tables - p.held + f.tables, staffAfter * CFG.perStaff);
      return head('投资', '双方同时进行，公开结果') + `<div class="form">
        <div class="field"><div class="txt"><b>新增桌子</b><small>每张 $${CFG.tableCost}，永久有效。现有 ${p.tables} 张</small></div>${stepper('tables', f.tables, 0, maxT, '新增桌子')}</div>
        <div class="field"><div class="txt"><b>雇用员工</b><small>今天就上岗，从明天起每天多付 $${CFG.wage} 工资。现有 ${p.staff} 人</small></div>${stepper('hire', f.hire, 0, CFG.maxStaff - p.staff + f.fire, '雇用员工')}</div>
        <div class="field"><div class="txt"><b>解雇员工</b><small>至少保留 1 人</small></div>${stepper('fire', f.fire, 0, p.staff - 1 + f.hire, '解雇员工')}</div>
        ${p.loan ? '' : `<label class="field toggle" for="loan-in"><div class="txt"><b>申请贷款</b><small>立即得到 $${CFG.loan.amount}，结束时还 $${CFG.loan.repay}。每局只能贷一次</small></div><input type="checkbox" id="loan-in" data-act="loan" ${f.loan ? 'checked' : ''}></label>`}
        <div class="total"><span>本次花费</span><span>${usd(-cost)} · 剩余 ${usd(cashAfterLoan - cost)}</span></div>
        <div class="callout">投资后，不算食材的产能上限：桌子 ${p.tables - p.held + f.tables} 张、员工可服务 ${staffAfter * CFG.perStaff} 人，取较小值 <b>${capAfter}</b> 人。明天工资 ${usd(-staffAfter * CFG.wage)}。</div>
        <div class="row"><button class="btn" data-act="invest">确认投资</button></div></div>`;
    }
    case 'market': {
      const m = S.market, left = CFG.market.stock - m.sold;
      const cells = Array.from({ length: CFG.market.stock }, (_, i) => {
        const own = m.cells[i], price = CFG.market.tiers.find(([u]) => i < u)[1];
        return `<div class="cell ${own || ''} ${!own && i === m.sold ? 'next' : ''}">$${price}</div>`;
      }).join('');
      const board = `<div class="board" aria-label="市场剩余 ${left} 份">${cells}</div>
        <div class="legend"><span><i class="dot" style="background:var(--p1)"></i>${esc(nameOf('p1'))} 买入 ${m.buys.p1} 份</span><span><i class="dot" style="background:var(--p2)"></i>${esc(nameOf('p2'))} 买入 ${m.buys.p2} 份</span><span>剩余 ${left} 份</span></div>`;
      const E = expectedDemand(p), capNoIngr = Math.min(p.tables - p.held, p.staff * CFG.perStaff);
      const info = `<div class="callout"><span>你现在有 <b>${p.ingr}</b> 份食材。广告前预计 约 ${ex(E.total)} 位客人（${E.min}–${E.max}），桌子和员工最多接待 ${capNoIngr} 人。今天用不完的食材会过期。</span></div>`;
      if (!k) return head('食材市场', m.passed[s] ? '你已停止购买' : '轮流购买') + board + info + waitHTML(s, m.passed[s] ? `等待${esc(nameOf(o))}买完…` : `轮到${esc(nameOf(o))}购买…`);
      const btn = n => { const ok = n <= left && priceOf(m.sold, n) <= p.cash; return `<button class="btn" data-act="buy" data-n="${n}" ${ok ? '' : 'disabled'}>买 ${n} 份 · $${n <= left ? priceOf(m.sold, n) : '—'}</button>`; };
      return head('食材市场', '轮到你') + board + info + `<div class="row">${btn(1)}${btn(2)}${btn(3)}<button class="btn ghost" data-act="buy" data-n="0">不再购买</button></div><p class="muted" style="font-size:.85rem">选择“不再购买”后，今天就不能再买了。</p>`;
    }
    case 'commit': {
      if (!k) return head('放广告牌', '背面朝上') + waitHTML(s);
      const f = F({ sr: 0, sb: 0, rr: 0, rb: 0 }), A = CFG.ad, m = A.maxPerShop;
      const c = { selfReal: f.sr, selfBlank: f.sb, rivalReal: f.rr, rivalBlank: f.rb }, cost = adCost(c), left = Math.max(0, p.cash - cost);
      const row = (field, val, label, price, others) => `<div class="field"><div class="txt"><b>${label}</b><small>每张 $${price}</small></div>${stepper(field, val, 0, Math.min(m - others, val + Math.floor(left / price)), label)}</div>`;
      const po = S.players[o], co = capacityOf(po), cm = capacityOf(p);
      const eO = expectedDemand(po, f.rr), eM = expectedDemand(p, f.sr);
      const desc = (e, cap) => { const room = cap - e.total; return room >= 0 ? `产能 ${cap}，平均还空 <b>${ex(room)}</b> 个位置` : `产能 ${cap}，平均会超出 <b>${ex(-room)}</b> 人`; };
      return head('放广告牌', '背面朝上，对手看不到真假') + `<div class="form">
        <p class="muted">牌会背面朝上放在店门口。对手只能看到每家店门口有几张牌，看不到真假，也看不到你花了多少钱（翻牌时才扣）。翻牌时，每张真牌一定带来 ${A.customers} 位客人；空牌什么也没有。每家店门口你最多放 ${m} 张。</p>
        <h3>你的店门口</h3>
        ${row('sr', f.sr, '真广告牌', A.real, f.sb)}${row('sb', f.sb, '空牌（虚张声势）', A.blank, f.sr)}
        <h3>${esc(nameOf(o))}的店门口</h3>
        ${row('rr', f.rr, '真广告牌', A.real, f.rb)}${row('rb', f.rb, '空牌（虚张声势）', A.blank, f.rr)}
        <div class="total"><span>翻牌时扣款</span><span>${usd(-cost)} · 剩余 ${usd(p.cash - cost)}</span></div>
        <div class="callout"><b>算一算（只算你放的真牌）</b>
          <span>${esc(nameOf(o))}：预计 约 ${ex(eO.total)} 人（${eO.min}–${eO.max}），${desc(eO, co.cap)}。</span>
          <span>你：预计 约 ${ex(eM.total)} 人（${eM.min}–${eM.max}），${desc(eM, cm.cap)}。</span>
          <span class="muted">放完牌后双方都有一次临时扩容的机会，对手会看到你在他店门口放了几张。</span></div>
        <div class="row"><button class="btn" data-act="commit">背面朝上放牌</button></div></div>`;
    }
    case 'respond': {
      const cmt = S.commits, known = myCards(s) || NO_CARDS;
      const board = `<div class="fronts">
        <div><span class="label">你的店门口</span>${frontHTML(s, s)}</div>
        <div><span class="label">${esc(nameOf(o))}的店门口</span>${frontHTML(o, s)}</div></div>`;
      if (!k) return head('应对', '翻牌前临时扩容') + board + waitHTML(s);
      const f = F({ temp: 0, rush: 0 }), R = CFG.respond;
      const reserve = adCost(known), cost = f.temp * R.tempStaff + f.rush * R.rushIngr, left = Math.max(0, p.cash - reserve - cost);
      const capNow = capacityOf(p);
      const capAfter = Math.min(capNow.tables, (p.staff + f.temp) * CFG.perStaff, p.ingr + f.rush);
      const unknown = cmt[o].nRival, eNone = expectedDemand(p, known.selfReal, 0), eAll = expectedDemand(p, known.selfReal + unknown, 0);
      return head('应对', '翻牌前临时扩容') + board + `<div class="form">
        <div class="callout"><b>${esc(nameOf(o))}在你店门口放了 ${unknown} 张牌</b>
          <span>如果全是空牌：平均来 约 ${ex(eNone.total)} 人。如果全是真牌：平均来 约 ${ex(eAll.total)} 人（多出 ${unknown * CFG.ad.customers} 人），最多 ${eAll.max} 人。</span>
          <span>你现在的产能是 <b>${capNow.cap}</b>（桌子 ${capNow.tables} · 员工 ${capNow.staff} · 食材 ${capNow.ingr}）。</span></div>
        <div class="field"><div class="txt"><b>临时帮工</b><small>每人 $${R.tempStaff}，只帮今天，多服务 ${CFG.perStaff} 位客人</small></div>${stepper('temp', f.temp, 0, Math.min(R.tempStaffMax, f.temp + Math.floor(left / R.tempStaff)), '临时帮工')}</div>
        <div class="field"><div class="txt"><b>紧急补货</b><small>每份 $${R.rushIngr}，比市场贵，用不完同样过期</small></div>${stepper('rush', f.rush, 0, Math.min(R.rushIngrMax, f.rush + Math.floor(left / R.rushIngr)), '紧急补货')}</div>
        <div class="total"><span>扩容花费</span><span>${usd(-cost)} · 扩容后产能 ${capAfter}</span></div>
        ${reserve ? `<p class="muted" style="font-size:.85rem">已为你的广告牌预留 ${usd(reserve)}，翻牌时扣。</p>` : ''}
        <div class="row"><button class="btn" data-act="respond">${cost ? '确认扩容' : '不扩容，直接翻牌'}</button></div></div>`;
    }
    case 'reveal': return head('翻牌', '揭晓中') + waitHTML(s, '双方都已确认，正在翻牌…');
    case 'voucher': {
      if (!watched()) return openingHTML();
      const v = S.service[s];
      let body;
      if (!k) body = v.turned > 0 && !S.submitted[s] && p.cash < CFG.voucher ? `<p class="muted">你拒绝了 ${v.turned} 位客人，但现金不够发补偿券。</p>` + waitHTML(s) : waitHTML(s);
      else {
        const f = F({ n: 0 }), max = Math.min(v.turned, Math.floor(p.cash / CFG.voucher));
        body = `<div class="form"><div class="field"><div class="txt"><b>发补偿券</b><small>你拒绝了 ${v.turned} 位客人。每张 $${CFG.voucher}，被补偿的客人不影响声誉</small></div>${stepper('n', f.n, 0, max, '补偿券')}</div>
          <div class="callout warn">不补偿的人数：${v.turned - f.n} 人 → ${v.turned - f.n === 0 ? '声誉不变' : v.turned - f.n <= 3 ? '掉 1 星' : '掉 2 星'}。声誉低于 3 星时，每低一颗，就有 ${CFG.rep.perStar} 位基础客人各有 ${pct(CFG.rep.loseChance)} 的概率不来。</div>
          <div class="row"><button class="btn" data-act="voucher">确认（${usd(-f.n * CFG.voucher)}）</button></div></div>`;
      }
      return head('营业结果', '补偿券') + body + billsHTML();
    }
    case 'report': {
      if (!watched()) return openingHTML();
      const last = S.round >= CFG.rounds;
      const btn = k ? `<button class="btn" data-act="next">${last ? '查看最终结果' : `开始第 ${S.round + 1} 天`}</button>` : waitHTML(s, `等待${esc(nameOf(o))}看完账单…`);
      return head(`第 ${S.round} 天账单`, '复盘') + billsHTML() + `<div class="row">${btn}</div>`;
    }
    case 'over': return overHTML();
  }
  return '';
}

// ---------- opening the doors: play back every roll, one step at a time ----------
const playKey = () => `${app.mode === 'local' ? app.seed : app.code}:${app.S.round}`;
function watched() { const k = playKey(); return !!(app.played[k] || (app.mode === 'online' && lsGet('played:' + k))); }
function markWatched() {
  const k = playKey(); app.played[k] = true; if (app.mode === 'online') lsSet('played:' + k, '1');
  clearTimeout(app.playTimer); app.playing = null; render();
}
const stepsLen = () => Math.max(...['p1', 'p2'].map(s => app.S.service[s].steps.length));
function startPlay() { clearTimeout(app.playTimer); app.playing = { key: playKey(), idx: 0 }; tick(); }
function tick() {
  const P = app.playing; if (!P || !app.S || !app.S.service || P.key !== playKey()) return;
  if (P.idx >= stepsLen()) return render();
  const kinds = ['p1', 'p2'].map(s => (app.S.service[s].steps[P.idx] || {}).k);
  P.idx++; render();
  const delay = kinds.some(k => k === 'card' || k === 'total' || k === 'seat' || k === 'turned') ? 900 : 520;
  app.playTimer = setTimeout(tick, delay);
}
function stepLine(s, st) {
  const o = s === 'p1' ? 'p2' : 'p1', dice = (roll, need, verb) => `<span class="muted mono">掷 ${roll}（≤${need} ${verb}）</span>`;
  const li = (txt, res, cls = '') => `<li class="${cls}"><span>${txt}</span><span>${res}</span></li>`;
  switch (st.k) {
    case 'base': return li('固定的基础客人到店', `<b class="pos">+${st.n}</b>`);
    case 'rep': return li(`声誉吸引来的客人 ${dice(st.roll, st.need, '到店')}`, st.ok ? '<b class="pos">来了 +1</b>' : '<span class="muted">没来</span>');
    case 'lose': return li(`声誉偏低，一位老客人 ${dice(st.roll, st.need, '流失')}`, st.ok ? '<b class="neg">没来 −1</b>' : '<span class="muted">照常来</span>');
    case 'total': return li(`<b>今天一共来了 ${st.demand} 位客人</b>`, '', 'em');
    case 'noshow': return li(`预订的客人 <span class="muted mono">掷骰 ${st.roll}（4–6 到场）</span>`, st.arrive ? `<b>${st.choice === 'hold' ? '到场付款' : '到场，但没留座位'}</b>` : '<span class="muted">没来</span>');
    case 'seat': return li(`<b>入座 ${st.served} 位</b> <span class="muted">（产能 ${st.cap}）</span>`, '', 'em');
    case 'turned': return li(`<b class="neg">${st.n} 位客人没有座位，被拒绝</b>`, '', 'em bad');
    case 'card': return li(`翻开第 ${st.n}/${st.of} 张牌 <span class="muted">（${st.from === 'self' ? `${esc(nameOf(s))}自己放的` : `${esc(nameOf(o))}放的`}）</span>`, st.real ? `<b class="pos">真广告 +${st.brings}</b>` : '<span class="muted">空牌</span>', st.real ? '' : 'blank');
    case 'sum': return li(`<b>营业收入 ${usd(st.meals)}</b>`, '', 'em');
  }
  return '';
}
function feedHTML(s, n) {
  const v = app.S.service[s], shown = v.steps.slice(0, n);
  let came = 0, seated = '—', turned = 0;
  for (const st of shown) {
    if (st.k === 'base') came += st.n;
    if (st.k === 'rep' && st.ok) came++;
    if (st.k === 'card') came += st.brings;
    if (st.k === 'lose' && st.ok) came--;
    if (st.k === 'seat') seated = st.served;
    if (st.k === 'turned') turned = st.n;
  }
  return `<article class="bill" data-seat="${s}">
    <div class="rest-head"><h2>${esc(nameOf(s))}</h2><span class="muted mono" style="font-size:.8rem">${CFG.loc[app.S.players[s].loc].name} · 产能 ${v.cap}</span></div>
    <div class="big"><div><span class="label">来客</span><b>${came}</b></div><div><span class="label">入座</span><b>${seated}</b></div><div class="${turned ? 'bad' : ''}"><span class="label">拒绝</span><b>${turned}</b></div></div>
    <ul class="lines feed">${shown.map(st => stepLine(s, st)).reverse().join('') || '<li class="muted"><span>正在开门…</span><span></span></li>'}</ul>
  </article>`;
}
function openingHTML() {
  const S = app.S, P = app.playing && app.playing.key === playKey() ? app.playing : null;
  const head = `<div class="ticket-head"><h2>第 ${S.round} 天 · 开始营业</h2><span class="label">${P ? (P.idx >= stepsLen() ? '营业结束' : '营业中') : '准备开门'}</span></div>`;
  if (!P) return head + `<p class="muted">双方店门口的牌都准备好了。点“开始营业”，一张张翻牌，再看客人来不来、坐不坐得下。</p>
    <div class="row"><button class="btn" data-act="play">开始营业</button><button class="btn ghost" data-act="skip">直接看账单</button></div>`;
  const order = app.mode === 'online' ? [app.me, app.me === 'p1' ? 'p2' : 'p1'] : ['p1', 'p2'];
  const done = P.idx >= stepsLen();
  return head + `<div class="bills">${order.map(s => feedHTML(s, P.idx)).join('')}</div>
    <div class="row">${done ? '<button class="btn" data-act="skip">查看今日账单</button>' : '<button class="btn ghost" data-act="skip">跳过</button>'}</div>`;
}

function billsHTML() {
  const S = app.S; if (!S.service) return '';
  const order = app.mode === 'online' ? [app.me, app.me === 'p1' ? 'p2' : 'p1'] : ['p1', 'p2'];
  return `<div class="bills">${order.map(s => billHTML(s)).join('')}</div>`;
}
function billHTML(s) {
  const S = app.S, v = S.service[s], p = S.players[s], o = s === 'p1' ? 'p2' : 'p1';
  const limName = { tables: '桌子', staff: '员工', ingr: '食材' };
  const lines = p.ledger.map(x => `<li><span>${esc(x.label)}</span><span class="${x.amt > 0 ? 'pos' : x.amt < 0 ? 'neg' : 'muted'}">${x.amt === null ? '' : (x.amt > 0 ? '+' : '') + usd(x.amt)}</span></li>`).join('');
  const rep = v.starsAfter !== undefined
    ? `<div class="eq"><span class="k">声誉</span><span>${v.starsBefore} → ${v.starsAfter} 星　${esc((v.why || []).join('；'))}</span></div>`
    : `<div class="eq"><span class="k">声誉</span><span>复盘时更新</span></div>`;
  const extra = [];
  if (v.noshow) extra.push(`预订掷骰 ${v.noshow.roll}：${v.noshow.arrive ? '客人到场' : '客人没来'}`);
  if (v.inspection) extra.push(`可疑交易检查掷骰 ${v.inspection.roll}：${v.inspection.caught ? '被检查员发现' : '平安无事'}`);
  if (S.reveals[s] && S.reveals[s].ok === false) extra.push('放牌记录校验失败，这家店的牌都按空牌计算');
  return `<article class="bill" data-seat="${s}">
    <div class="rest-head"><h2>${esc(nameOf(s))}</h2><span class="muted mono" style="font-size:.8rem">${CFG.loc[p.loc].name}</span></div>
    <div class="big"><div><span class="label">来客</span><b>${v.demand}</b></div><div><span class="label">接待</span><b>${v.served}</b></div><div class="${v.turned ? 'bad' : ''}"><span class="label">拒绝</span><b>${v.turned}</b></div></div>
    <div class="eq"><span class="k">来客</span><span>基础 ${v.base}${v.repGain ? ` + 声誉 ${v.repGain}` : ''}${v.repLoss ? ` − 声誉流失 ${v.repLoss}` : ''} + 自己广告 ${v.adSelfIn} + ${esc(nameOf(o))}送来 ${v.adRivalIn} = ${v.demand}</span>
      <span class="muted">店门口：${esc(nameOf(s))}放了真 ${v.cards.mine.real} 空 ${v.cards.mine.blank}，${esc(nameOf(o))}放了真 ${v.cards.theirs.real} 空 ${v.cards.theirs.blank}</span></div>
    <div class="eq"><span class="k">产能</span><span>桌子 ${v.tables} · 员工 ${v.staff} · 食材 ${v.ingr} → 取最小 ${v.cap}</span>
      ${v.limits.length ? `<span class="neg">卡在：${v.limits.map(x => limName[x]).join('、')}</span>` : v.cap > v.demand ? `<span class="muted">还空着 ${v.cap - v.demand} 个位置</span>` : ''}</div>
    ${rep}
    ${extra.length ? `<div class="eq">${extra.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
    <ul class="lines">${lines}<li><b>当前现金</b><b class="mono">${usd(p.cash)}</b></li></ul>
  </article>`;
}

function overHTML() {
  const S = app.S, R = S.result, sc = R.score;
  const title = R.winner === 'draw' ? '平局' : `${esc(nameOf(R.winner))}${app.mode === 'online' && R.winner === app.me ? '赢了' : ' 获胜'}`;
  const card = s => `<article class="bill" data-seat="${s}"><div class="rest-head"><h2>${esc(nameOf(s))}</h2>${R.winner === s ? '<span class="who" style="background:var(--p1-soft)">胜</span>' : ''}</div>
    <div class="score mono">${usd(sc[s].total)}</div>
    <ul class="lines"><li><span>现金</span><span>${usd(sc[s].cash)}</span></li><li><span>声誉 ${sc[s].stars} 星 × $${CFG.starValue}</span><span>+$${sc[s].starPts}</span></li>${sc[s].loan ? `<li><span>偿还贷款</span><span class="neg">${usd(sc[s].loan)}</span></li>` : ''}</ul></article>`;
  return `<div class="ticket-head"><h2>${title}</h2><span class="label">${R.reason === 'bankrupt' ? '有一方破产，游戏提前结束' : '五天营业结束'}</span></div>
    <div class="bills">${card('p1')}${card('p2')}</div>
    <div class="callout"><b>赛后复盘（约 5 分钟）</b>
      <span>1. 你的盈亏平衡点是每天多少位客人？</span>
      <span>2. 哪一天你卡在了哪项资源上？当时可以怎么调整？</span>
      <span>3. 拒绝客人在整局游戏里让你损失了多少？</span>
      <span>4. 你接受过可疑交易吗？还会再接受吗？</span></div>
    <div class="row"><button class="btn" data-act="leave">回到大厅</button></div>`;
}

function historyHTML() {
  const S = app.S, rows = [];
  for (let r = 1; r <= CFG.rounds; r++) for (const s of ['p1', 'p2']) {
    const h = S.players[s].history.find(x => x.round === r); if (!h) continue;
    rows.push(`<tr><td>第 ${r} 天 · ${esc(nameOf(s))}</td><td>${h.demand}</td><td>${h.cap}</td><td>${h.served}</td><td class="${h.turned ? 'neg' : ''}">${h.turned}</td><td>${h.spoiled}</td><td class="pos">+${usd(h.income)}</td><td class="neg">${usd(h.spend)}</td><td>${usd(h.cash)}</td><td>${h.stars}</td></tr>`);
  }
  if (!rows.length) return '';
  return `<section class="ticket"><div class="ticket-head"><h2>营业记录</h2><span class="label">每天结束时</span></div>
    <div class="tablewrap"><table><thead><tr><th>日期</th><th>需求</th><th>产能</th><th>接待</th><th>拒绝</th><th>过期食材</th><th>收入</th><th>支出</th><th>现金</th><th>星级</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></section>`;
}

function gameHTML() {
  const S = app.S;
  const order = app.mode === 'online' ? [app.me, app.me === 'p1' ? 'p2' : 'p1'] : ['p1', 'p2'];
  const waitingOther = app.mode === 'online' && S.phase === 'pick' && !(app.seats.p2 && app.seats.p2.uid);
  const showEvent = S.event && ['invest', 'market', 'commit', 'reveal'].includes(S.phase);
  return `<div class="grid">
    <div class="stack">
      ${waitingOther ? `<div class="callout warn"><b>等待对手加入</b><span>把房间号 <b class="mono">${esc(app.code)}</b> 发给对手，对手在大厅输入后就会出现在这里。</span></div>` : ''}
      ${app.mode === 'local' ? `<div class="callout"><span>现在是 <b>${seatTag(app.view)}</b> 的视角。轮到另一方时会自动切换。</span></div>` : ''}
      ${showEvent ? eventHTML() : ''}
      <section class="ticket" id="action">${actionHTML()}</section>
    </div>
    <div class="stack">${order.map(restHTML).join('')}</div>
  </div>${historyHTML()}`;
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, S = app.S, s = viewer(), k = S && S.waiting[s];
  switch (a) {
    case 'create': return createGame();
    case 'rejoin': return joinGame(b.dataset.code);
    case 'local': return startLocal();
    case 'leave': return leave(false);
    case 'view': app.view = b.dataset.seat; return render();
    case 'play': return startPlay();
    case 'skip': return markWatched();
    case 'copy': {
      const done = () => toast(`房间号 ${app.code} 已复制`);
      try { navigator.clipboard.writeText(app.code).then(done, () => toast(`房间号：${app.code}`)); } catch (err) { toast(`房间号：${app.code}`); }
      return;
    }
    case 'inc': { const f = F({}); f[b.dataset.f] = (f[b.dataset.f] || 0) + Number(b.dataset.d); return render(); }
  }
  if (!k) return;
  switch (a) {
    case 'pick': return act(s, { k, loc: b.dataset.loc });
    case 'event': return act(s, { k, choice: b.dataset.c });
    case 'invest': { const f = F({}); return act(s, { k, tables: f.tables || 0, hire: f.hire || 0, fire: f.fire || 0, loan: !!f.loan }); }
    case 'buy': return act(s, { k, n: Number(b.dataset.n) });
    case 'commit': { const f = F({}); return commitCards(s, k, { selfReal: f.sr || 0, selfBlank: f.sb || 0, rivalReal: f.rr || 0, rivalBlank: f.rb || 0 }); }
    case 'respond': { const f = F({}); return act(s, { k, temp: f.temp || 0, rush: f.rush || 0 }); }
    case 'voucher': { const f = F({}); return act(s, { k, n: f.n || 0 }); }
    case 'next': return act(s, { k });
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-act="loan"]')) { const f = F({}); f.loan = e.target.checked; render(); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.matches('[data-form="join"]')) joinGame($('#code-in').value);
});
render();
