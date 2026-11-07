// ===== Page: lobby, online sync through Firebase (Firestore + anonymous sign-in), local test mode =====
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => { const v = Math.abs(n), t = Number.isInteger(v) ? String(v) : v.toFixed(2); return (n < 0 ? '−$' : '$') + t; };
const ex = n => String(Math.round(n * 10) / 10); // expected head count, one decimal
const lsGet = k => { try { return localStorage.getItem('rr:' + k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem('rr:' + k, v); } catch (e) {} };
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = (n = 4) => { const a = new Uint32Array(n); crypto.getRandomValues(a); return [...a].map(x => CODE_CHARS[x % CODE_CHARS.length]).join(''); };
const randHex = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const other = s => (s === 'p1' ? 'p2' : 'p1');

const app = {
  mode: null, fb: null, uid: null, dbReady: false, dbMsg: 'Connecting…',
  code: null, seed: null, seats: {}, logs: { p1: [], p2: [] }, me: null, view: 'p1',
  nick: (lsGet('nick') || '').slice(0, 12), S: null, form: {}, priv: {}, revealing: {}, unsub: [], chain: Promise.resolve(),
  err: '', busy: false, loadNote: '', intro: 0,
  mkt: null, mktUnsub: null, cool: {}, claiming: {}, svc: {}, ticker: null
};

window.__rr = app; // debugging: type __rr.S in the browser console to see the game state

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 3000);
}

// ---------- seats & names ----------
const controlled = () => (app.mode === 'local' ? ['p1', 'p2'] : [app.me]);
const viewer = () => (app.mode === 'local' ? app.view : app.me);
function nameOf(s) {
  if (app.mode === 'local') return s === 'p1' ? 'Player 1' : 'Player 2';
  if (s === app.me) return 'You';
  return (app.seats[s] && app.seats[s].name) || 'Rival';
}
function seatTag(s) { return s === 'p1' ? 'P1' : 'P2'; }
// "Your" for yourself online, otherwise "Name's"
const poss = s => (app.mode !== 'local' && s === app.me ? 'Your' : `${esc(nameOf(s))}'s`);

// ---------- Firebase backend ----------
// fb wraps the few Firestore calls the game needs, so the rest of the page never touches the SDK directly.
(async () => {
  // Test hook: automated tests can inject a fake backend; absent in normal use
  if (typeof window.__RR_FAKE_FB === 'function') {
    app.fb = window.__RR_FAKE_FB(); app.uid = app.fb.uid; app.dbReady = true; app.dbMsg = ''; return render();
  }
  const cfg = window.FIREBASE_CONFIG || {};
  if (!cfg.apiKey || !cfg.projectId) {
    app.dbMsg = 'Online play is off: firebase-config.js is empty. Try Local test for now.';
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
      }),
      // Read-modify-write in one transaction: fn(data) returns the new doc, or null to leave it alone (it may throw).
      tx: (p, fn) => F.runTransaction(db, async tx => {
        const s = await tx.get(ref(p));
        const next = fn(s.exists() ? s.data() : null);
        if (next) tx.set(ref(p), next);
        return next;
      })
    };
    app.dbReady = true; app.dbMsg = '';
  } catch (e) {
    const c = e && e.code || '';
    app.dbMsg = c === 'auth/operation-not-allowed' ? 'Online play is off: turn on Anonymous sign-in in Firebase.'
      : c === 'auth/unauthorized-domain' ? "This site isn't on Firebase's authorized domains yet. Add it under Authentication settings."
      : "Can't reach the server. Check your connection and refresh, or try Local test.";
  }
  render();
})();

function writeErr(e) {
  const c = e && e.code || '';
  if (c === 'seat-taken') return 'That room is full.';
  if (c === 'permission-denied') return 'The server said no. Check that the Firestore rules are published.';
  if (c === 'resource-exhausted') return "We're out of free Firebase quota for today. Try tomorrow.";
  return 'Connection hiccup. Try again in a bit.';
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
      await app.fb.set(`games/${code}`, { seed: genCode(8) + Date.now(), host: app.uid, created: Date.now(), v: 2 });
      await app.fb.set(`games/${code}/seats/p1`, { uid: app.uid, name: app.nick, log: [] });
      app.busy = false; return enter(code, 'p1');
    }
    app.err = "Couldn't make a room. Try again.";
  } catch (e) { app.err = writeErr(e); }
  app.busy = false; render();
}
async function joinGame(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) { app.err = 'Room codes are 4 letters or numbers.'; return render(); }
  if (!app.dbReady || app.busy) return;
  saveNick(); app.busy = true; app.err = ''; render();
  try {
    const g = await app.fb.get(`games/${code}`);
    if (!g.exists) { app.err = `No room called ${code}.`; app.busy = false; return render(); }
    const [a, b] = await Promise.all(['p1', 'p2'].map(s => app.fb.get(`games/${code}/seats/${s}`)));
    if (a.exists && a.data.uid === app.uid) { app.busy = false; return enter(code, 'p1'); }
    if (b.exists && b.data.uid === app.uid) { app.busy = false; return enter(code, 'p2'); }
    await app.fb.claim(`games/${code}/seats/p2`, { uid: app.uid, name: app.nick, log: [] });
    app.busy = false; enter(code, 'p2');
  } catch (e) { app.err = writeErr(e); app.busy = false; render(); }
}
function resetLive() {
  if (app.mktUnsub) { try { app.mktUnsub(); } catch (e) {} }
  Object.assign(app, { mkt: null, mktUnsub: null, cool: {}, claiming: {}, svc: {}, intro: 0 });
}
function enter(code, seat) {
  leave(true);
  Object.assign(app, { mode: 'online', code, me: seat, view: seat, seed: null, seats: {}, logs: { p1: [], p2: [] },
    S: null, form: {}, revealing: {}, err: '', loadNote: '' });
  lsSet('lastCode', code);
  const timer = setTimeout(() => { if (!app.seed) { app.loadNote = "Can't reach the game yet. Still trying…"; render(); } }, 10000);
  app.unsub.push(app.fb.watchDoc(`games/${code}`, snap => {
    if (snap.exists) { app.seed = snap.data.seed; clearTimeout(timer); app.loadNote = ''; refresh(); }
    else if (!snap.fromCache) { clearTimeout(timer); app.loadNote = 'This game is gone.'; render(); }
  }, () => { clearTimeout(timer); app.loadNote = 'Lost the connection. Refresh the page.'; render(); }));
  app.unsub.push(app.fb.watchCol(`games/${code}/seats`, docs => {
    for (const d of docs) {
      if (d.id !== 'p1' && d.id !== 'p2') continue;
      const remote = Array.isArray(d.data.log) ? d.data.log : [];
      app.seats[d.id] = { uid: d.data.uid, name: String(d.data.name || '').slice(0, 12) };
      if (d.id === app.me && app.logs[d.id].length > remote.length) continue;
      app.logs[d.id] = remote;
    }
    refresh();
  }, () => { app.loadNote = 'Lost the connection. Refresh the page.'; render(); }));
  render();
}
function leave(silent) {
  app.unsub.forEach(u => { try { u(); } catch (e) {} }); app.unsub = [];
  resetLive();
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
// Which ad cards you bought stays on your own device (and in your private Firebase folder) until both players have placed theirs.
const privKey = (s, r) => `${app.code}:${r}:${s}`;
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
  act(s, { k, h: adHash(c, priv.salt), nSelf: c.self.length, nRival: c.rival.length });
}
async function doReveal(s, k, r) {
  let priv = app.priv[privKey(s, r)];
  if (!priv && app.mode === 'online') {
    try { priv = JSON.parse(lsGet('ad:' + privKey(s, r)) || 'null'); } catch (e) {}
    if (!priv) { try { const d = await app.fb.get(`users/${app.uid}/ads/${app.code}-r${r}`); if (d.exists) priv = d.data; } catch (e) {} }
  }
  if (!priv) { priv = { self: [], rival: [], salt: '' }; toast("Couldn't find your cards, so they do nothing this round."); }
  act(s, { k, self: priv.self || [], rival: priv.rival || [], salt: priv.salt });
}

function refresh() {
  if (!app.seed) return render();
  app.S = simulate(app.seed, app.logs);
  const S = app.S;
  if (S.phase === 'reveal') for (const s of controlled()) {
    const k = S.waiting[s];
    if (k && !app.revealing[s + k]) { app.revealing[s + k] = true; doReveal(s, k, S.round); }
  }
  if (S.phase === 'market') ensureMarket();
  if (app.mode === 'local' && !S.waiting[app.view]) {
    const o = other(app.view);
    if (S.waiting[o] && S.phase !== 'reveal') app.view = o;
  }
  setTicker();
  render();
}

// ---------- live clock: market and service run in real time ----------
function setTicker() {
  const live = app.S && (app.S.phase === 'market' || app.S.phase === 'service');
  if (live && !app.ticker) app.ticker = setInterval(tick, 200);
  if (!live && app.ticker) { clearInterval(app.ticker); app.ticker = null; }
}
// Re-render only when something visible changes (so buttons stay put and clicks never get lost); otherwise just move the bars.
function tick() {
  const S = app.S; if (!S) return;
  if (S.phase === 'market') marketTick();
  if (S.phase === 'service') serviceTick();
  if (!app.S || (app.S.phase !== 'market' && app.S.phase !== 'service')) return;
  const sig = liveSig();
  if (sig !== app.sig) render(); else updateBars();
}
function liveSig() {
  const S = app.S, now = Date.now();
  if (S.phase === 'market') return JSON.stringify([app.mkt && app.mkt.owner, app.mkt && !!app.mkt.start, controlled().map(s => [!!(app.cool[s] && now < app.cool[s].until), !!app.claiming[s]]), mktTimeLeft() > 0, S.waiting, S.submitted, app.view]);
  return JSON.stringify([controlled().map(s => { const v = app.svc[s]; return v ? [v.started, v.idx, v.closed, v.ops.length, !!v.busy, v.msg, v.fast] : 0; }), S.waiting, S.submitted, app.view]);
}
// Time-driven bars: data-t0 / data-t1 are timestamps; drain bars empty out instead of filling up.
function updateBars() {
  const now = Date.now();
  document.querySelectorAll('[data-t0]').forEach(el => {
    let f = Math.max(0, Math.min(1, (now - +el.dataset.t0) / (+el.dataset.t1 - +el.dataset.t0)));
    if (el.dataset.drain) { f = 1 - f; el.classList.toggle('hot', f < 0.35); }
    if (el.firstElementChild) el.firstElementChild.style.width = f * 100 + '%';
  });
  document.querySelectorAll('[data-count]').forEach(el => { el.textContent = Math.max(0, Math.ceil((+el.dataset.count - now) / 1000)) + 's'; });
}
const tbar = (t0, t1, drain) => `<span class="pbar" data-t0="${t0}" data-t1="${t1}" ${drain ? 'data-drain="1"' : ''}><i></i></span>`;

// ---------- market: first click wins ----------
const mktPath = () => `games/${app.code}/market/d${app.S.round}`;
function ensureMarket() {
  const key = `${app.code}:${app.seed}:${app.S.round}`;
  if (app.mkt && app.mkt.key === key) return;
  if (app.mktUnsub) { try { app.mktUnsub(); } catch (e) {} app.mktUnsub = null; }
  app.mkt = { key, owner: {}, start: null };
  app.cool = {}; app.claiming = {};
  if (app.mode === 'local') { app.mkt.start = Date.now(); return; }
  app.mktUnsub = app.fb.watchDoc(mktPath(), snap => {
    if (!app.mkt || app.mkt.key !== key) return;
    const d = snap.data || {};
    app.mkt.owner = { ...(d.owner || {}), ...app.mkt.mine };
    if (d.start) app.mkt.start = d.start;
    render();
  });
  app.mkt.mine = {};
  app.fb.tx(mktPath(), d => (d && d.start ? null : { owner: (d && d.owner) || {}, start: Date.now() }))
    .then(d => { if (d && d.start && !app.mkt.start) app.mkt.start = d.start; })
    .catch(e => toast(writeErr(e)));
}
const mktTimeLeft = () => (app.mkt && app.mkt.start ? CFG.market.time * 1000 - (Date.now() - app.mkt.start) : CFG.market.time * 1000);
const ownedBy = s => Object.keys(app.mkt ? app.mkt.owner : {}).filter(i => app.mkt.owner[i] === s).map(Number).sort((a, b) => a - b);
function mktCashLeft(s) {
  const S = app.S, items = S.market.items;
  return S.players[s].cash - ownedBy(s).reduce((a, i) => a + CFG.market[items[i]].price, 0);
}
async function claimItem(s, i) {
  const S = app.S, M = CFG.market, type = S.market.items[i], k = S.waiting[s];
  if (!k || app.claiming[s]) return;
  const c = app.cool[s];
  if (c && Date.now() < c.until) return toast('Wait for the delivery bar to finish first.');
  if (app.mkt.owner[i]) return toast(app.mkt.owner[i] === s ? 'You already have that one.' : 'Your rival got that one.');
  if (mktTimeLeft() <= 0) return;
  if (mktCashLeft(s) < M[type].price) return toast("Not enough cash for this one.");
  app.claiming[s] = true;
  try {
    if (app.mode === 'online') {
      await app.fb.tx(mktPath(), d => {
        d = d || { owner: {}, start: Date.now() };
        if (d.owner[i]) throw { code: 'taken' };
        return { ...d, owner: { ...d.owner, [i]: s } };
      });
      app.mkt.mine[i] = s;
    }
    app.mkt.owner[i] = s;
    app.cool[s] = { i, type, start: Date.now(), until: Date.now() + M[type].cd * 1000 };
  } catch (e) {
    toast(e && e.code === 'taken' ? 'Too slow! Your rival got that one.' : writeErr(e));
  }
  app.claiming[s] = false;
  render();
}
function finishMarket(s) {
  const k = app.S.waiting[s];
  if (!k || app.claiming[s]) return;
  act(s, { k, buys: ownedBy(s) });
}
function marketTick() {
  const S = app.S, free = S.market.items.some((_, i) => !app.mkt.owner[i]);
  for (const s of controlled()) if (S.waiting[s] && !app.claiming[s] && (mktTimeLeft() <= 0 || !free)) finishMarket(s);
}

// ---------- service: play the day back, pausing for shortages and choices ----------
function svcState(s) {
  const key = `${app.code}:${app.seed}:${app.S.round}:${s}`;
  if (!app.svc[s] || app.svc[s].key !== key) app.svc[s] = { key, started: false, idx: 0, closed: 0, ops: [], busy: null, waitAt: null, last: 0, fast: false, msg: '' };
  return app.svc[s];
}
function serviceTick() {
  const S = app.S, C = CFG.service, now = Date.now();
  for (const s of controlled()) {
    if (!S.waiting[s]) continue;
    const sv = svcState(s); if (!sv.started) continue;
    let v = serviceRun(S, s, sv.ops, sv.closed);
    if (sv.idx < v.out.length) {
      if (now - sv.last >= (sv.fast ? 120 : 750)) { sv.idx++; sv.last = now; }
      continue;
    }
    const P = v.pending;
    if (!P || P.kind !== 'short') continue;
    if (!sv.waitAt) sv.waitAt = now;
    if (sv.busy && now >= sv.busy.until) {
      const b = sv.busy; sv.busy = null;
      sv.ops.push({ ep: P.ep, a: b.a });
      sv.msg = b.a === 'borrow' && !borrowOk(S, s, P.ep, P.tries) ? 'The neighbour said no.' : b.a === 'borrow' ? 'Got a table!' : 'Food delivered!';
      v = serviceRun(S, s, sv.ops, sv.closed);
    }
    const Q = v.pending;
    const timeUp = now - sv.waitAt >= C.patience * 1000;
    if (!Q || Q.kind !== 'short' || Q.can >= Q.need || timeUp || (Q.tries >= Q.maxOps && !sv.busy)) closeShort(sv, timeUp ? 'They got tired of waiting.' : '');
  }
}
function closeShort(sv, msg) { sv.closed++; sv.waitAt = null; sv.busy = null; sv.msg = msg || ''; }
function svcAction(s, a) {
  const S = app.S, sv = svcState(s), v = serviceRun(S, s, sv.ops, sv.closed), P = v.pending;
  if (!P) return;
  if (P.kind === 'food') { sv.ops.push({ a: 'food', give: a === 'give' }); sv.last = Date.now(); return render(); }
  if (a === 'letgo') { closeShort(sv, ''); return render(); }
  if (sv.busy || P.tries >= P.maxOps) return;
  const price = opPrice(S, s, P.ep, P.tries, a);
  if (v.cash < price) return toast('Not enough cash.');
  sv.msg = ''; sv.busy = { a, start: Date.now(), until: Date.now() + CFG.service.opTime * 1000 };
  render();
}

// ---------- form state ----------
function F(defaults) {
  const s = viewer(), k = app.S.waiting[s] || 'none', key = s + '|' + k;
  if (!app.form[key]) app.form[key] = { ...defaults };
  return app.form[key];
}

// ---------- rendering ----------
const PHASES = [['invest', 'Build'], ['market', 'Market'], ['commit', 'Ads'], ['service', 'Service'], ['report', 'Recap']];
const phaseIdx = p => ({ morning: -1, invest: 0, market: 1, commit: 2, reveal: 3, service: 3, voucher: 3, report: 4 })[p] ?? -1;

function render() {
  if (app.mode === 'local') document.body.dataset.view = app.view; else delete document.body.dataset.view;
  renderBar();
  const root = $('#app');
  if (!app.mode) { root.innerHTML = lobbyHTML(); return; }
  if (!app.S) { root.innerHTML = `<section class="ticket"><p class="wait"><span class="pulse"></span>Loading game…</p>${app.loadNote ? `<p class="err">${esc(app.loadNote)}</p>` : ''}<div class="row"><button class="btn ghost" data-act="leave">Back to lobby</button></div></section>`; return; }
  const feed = root.querySelector('.feed'), scroll = feed ? feed.scrollTop : 0;
  root.innerHTML = gameHTML();
  const f2 = root.querySelector('.feed'); if (f2) f2.scrollTop = scroll;
  app.sig = app.S && (app.S.phase === 'market' || app.S.phase === 'service') ? liveSig() : '';
  updateBars();
}

function renderBar() {
  const S = app.S, st = $('#steps'), rm = $('#room');
  if (!S || S.phase === 'pick' || S.phase === 'over') st.innerHTML = '';
  else {
    const i = phaseIdx(S.phase);
    st.innerHTML = `<li class="day">Day ${S.round}/${CFG.rounds}</li>` +
      PHASES.map(([, n], j) => `<li class="${j === i ? 'on' : j < i ? 'done' : ''}">${n}</li>`).join('<li class="sep" aria-hidden="true"></li>');
  }
  if (app.mode === 'online') rm.innerHTML = `<span class="chip">Room <b>${esc(app.code)}</b></span><button class="btn ghost sm" data-act="copy">Copy code</button><span class="chip">${seatTag(app.me)}</span><button class="btn ghost sm" data-act="leave">Leave</button>`;
  else if (app.mode === 'local') rm.innerHTML = `<span class="chip">Local test</span>${['p1', 'p2'].map(s => `<button class="btn sm ${app.view === s ? '' : 'ghost'}" data-act="view" data-seat="${s}">As ${seatTag(s)}${app.S && app.S.waiting[s] ? ' •' : ''}</button>`).join('')}<button class="btn ghost sm" data-act="leave">Quit</button>`;
  else rm.innerHTML = '';
}

function lobbyHTML() {
  const last = lsGet('lastCode');
  return `<div class="stack">
  <section class="hero">
    <h1>Two restaurants. Five days. One winner.</h1>
    <p class="muted">Open a restaurant with $100, grab ingredients before your rival does, and use ads to pull guests in, or to trip your rival up. Most cash plus stars after day 5 wins.</p>
  </section>
  ${app.dbMsg ? `<div class="callout warn"><span>${esc(app.dbMsg)}</span></div>` : ''}
  <div class="field" style="max-width:520px"><div class="txt"><b>Your name</b><small>Your rival sees this</small></div>
    <input type="text" id="nick-in" class="nick" maxlength="12" autocomplete="nickname" placeholder="e.g. Sam" value="${esc(app.nick)}"></div>
  ${app.err ? `<div class="callout bad"><span>${esc(app.err)}</span></div>` : ''}
  <div class="lobby">
    <section class="ticket">
      <div class="ticket-head"><h2>New game</h2><span class="label">P1</span></div>
      <p class="muted">Get a room code and send it to your rival.</p>
      <div class="row"><button class="btn" data-act="create" ${app.dbReady && !app.busy ? '' : 'disabled'}>Create room</button>
      ${last && app.dbReady ? `<button class="btn ghost" data-act="rejoin" data-code="${esc(last)}">Back to ${esc(last)}</button>` : ''}</div>
    </section>
    <section class="ticket">
      <div class="ticket-head"><h2>Join game</h2><span class="label">P2</span></div>
      <p class="muted">Enter the code your rival sent you.</p>
      <form class="row" data-form="join">
        <input type="text" id="code-in" aria-label="Room code" maxlength="4" autocomplete="off" placeholder="ABCD" ${app.dbReady ? '' : 'disabled'}>
        <button class="btn" type="submit" ${app.dbReady && !app.busy ? '' : 'disabled'}>Join</button></form>
    </section>
    <section class="ticket">
      <div class="ticket-head"><h2>Local test</h2><span class="label">one screen</span></div>
      <p class="muted">Play both sides on one screen to try the rules. No internet, no secrets, nothing saved.</p>
      <div class="row"><button class="btn ghost" data-act="local">Start</button></div>
    </section>
  </div>
  <div class="callout"><b>Inviting a rival</b><span>Send them this link and your room code. No sign-up needed. One browser = one player, so test online with a second device or a private window.</span></div>
</div>`;
}

function starsHTML(n) { return `<span class="stars" aria-label="${n} stars">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`; }
const bar = (frac, cls = '') => `<span class="pbar ${cls}"><i style="width:${Math.max(0, Math.min(1, frac)) * 100}%"></i></span>`;

// ---------- rules: each step only shows its own ----------
const RULES = {
  invest: () => [`Tables cost $${CFG.tableCost} each and are yours for good.`, 'You can seat as many guests as your tables or your food allows, whichever is lower.',
    `More than half your tables empty at closing: ${Math.round(CFG.emptyTables.chance * 100)}% chance of −1 star.`],
  market: () => [`${CFG.market.stock} items, both players click at the same time. First click wins.`,
    `Express $${CFG.market.exp.price}: arrives today. ${CFG.market.exp.cd}s delivery bar.`,
    `Regular $${CFG.market.reg.price}: 50% today, 50% tomorrow (you find out when its ${CFG.market.reg.cd}s bar ends).`,
    "While a delivery bar runs you can't grab anything else.", `${CFG.market.time} seconds in total. Leftover food spoils at night.`],
  commit: () => ['Each card can be bought once. All cards go face down: the other player only sees how many.',
    'Your shop: cards that bring guests. Your rival\'s shop: tricks, or a false advertisement that does nothing.', 'You pay when the cards flip.'],
  service: () => ['Guests arrive in groups. If you run out of tables or food, they wait a little.',
    `While they wait: rush food ($${CFG.service.rush[0]}–${CFG.service.rush[1]}) or borrow a table from next door ($${CFG.service.borrow[0]}–${CFG.service.borrow[1]}, they may say no). One at a time.`,
    'Turn people away and you lose stars (1–3 people −1, 4+ −2). Serve everyone: +1 star.'],
  report: () => [`Score = cash + $${CFG.starValue} per star. Can't pay rent? You're out.`, `${CFG.baseDemand} regulars come every day. Each star above 3 brings 2 maybe-guests; below 3 you may lose some.`]
};
function rulesHTML(phase) {
  const R = RULES[phase === 'voucher' ? 'service' : phase]; if (!R) return '';
  return `<details class="rules"><summary>How this step works</summary><ul>${R().map(x => `<li>${x}</li>`).join('')}</ul></details>`;
}

function restHTML(s) {
  const S = app.S, p = S.players[s], L = p.loc && CFG.loc[p.loc], own = s === viewer();
  const flags = [];
  if (p.loan) flags.push(`<span class="flag">Loan (repay $${CFG.loan.repay})</span>`);
  if (own && p.shadyFrom !== null) flags.push('<span class="flag bad">Took the shady deal</span>');
  if (own && p.held) flags.push(`<span class="flag">${p.held} tables held for a booking</span>`);
  if (p.wom) flags.push(`<span class="flag">Word of mouth +${p.wom}/day</span>`);
  const hideCash = S.phase === 'service' && !S.submitted[s] && S.waiting[s] && s !== viewer();
  return `<article class="rest" data-seat="${s}">
    <div class="rest-head"><h2>${L ? `${L.name} <span class="muted mono" style="font-size:.85rem">${L.tag}</span>` : 'No shop yet'}</h2><span class="who">${app.mode === 'local' ? seatTag(s) : `${esc(nameOf(s))} · ${seatTag(s)}`}</span></div>
    <div class="stats">
      <div class="stat"><span class="label">Cash</span><b>${hideCash ? '<span class="muted" style="font-size:.85rem">open…</span>' : usd(p.cash)}</b></div>
      <div class="stat"><span class="label">Stars</span>${starsHTML(p.stars)}</div>
      <div class="stat"><span class="label">Per table</span><b>${L ? '$' + L.price : '—'}</b></div>
    </div>
    ${L ? `<div class="capline">
      <div class="res inl" title="Tables">${ART.icon('table', 30)}<b>${p.tables}</b>${own && p.held ? `<span class="muted">${p.held} held</span>` : ''}</div>
      <div class="res inl" title="Food">${ART.icon('food', 30)}<b>${p.ingr}</b>${p.pending ? `<span class="muted inl">+${p.pending}${ART.icon('moon', 14)}</span>` : ''}</div>
    </div>` : ''}
    ${flags.length ? `<div class="flags">${flags.join('')}</div>` : ''}
  </article>`;
}

function waitHTML(s, text) {
  const S = app.S, o = other(s);
  if (S.submitted[s]) return `<p class="wait"><span class="pulse"></span>Done. Waiting on ${esc(nameOf(o))}…</p>`;
  return `<p class="wait"><span class="pulse"></span>${text || `Waiting on ${esc(nameOf(o))}…`}</p>`;
}

function stepper(field, val, min, max, label) {
  return `<div class="step" role="group" aria-label="${esc(label)}"><button type="button" data-act="inc" data-f="${field}" data-d="-1" ${val <= min ? 'disabled' : ''} aria-label="less">−</button><output>${val}</output><button type="button" data-act="inc" data-f="${field}" data-d="1" ${val >= max ? 'disabled' : ''} aria-label="more">+</button></div>`;
}
// One-line hint shown under a decision.
const hint = t => `<p class="hint"><span class="label">Hint</span>${t}</p>`;
// "Expect 6–10 guests · you can seat min(tables 7, food 5) = 5"
function mathHint(p, selfCards, extraFood = 0) {
  const E = expectedDemand(p, selfCards), t = Math.max(0, p.tables - p.held), f = p.ingr + extraFood;
  return hint(`<span class="inl">${ART.icon('person', 18)}<b>${E.min === E.max ? E.min : `${Math.max(0, E.min)}–${E.max}`}</b>${E.min === E.max ? '' : ` <span class="muted">(~${ex(E.total)})</span>`}</span> · <span class="inl">seat min(${ART.icon('table', 18)}${t}, ${ART.icon('food', 18)}${f}) = <b>${Math.min(t, f)}</b></span>`);
}
const PRIVATE_LINES = ['Shady deal', 'Reservation paid', 'Inspector fine'];
const PRIVATE_WHY = ['reservation had no seat −1', 'inspector −1'];

const INTRO = [
  ['💵', 'You have $100.'], ['🍳', "It's your dream to open a restaurant!"],
  ['📅', 'You have 5 days to survive, against a rival opening across town.'], ['🤔', 'Every day: build, shop, advertise, open the doors. Make your choices.']
];

function eventChoiceHTML(s, f) {
  const e = app.S.events[s];
  if (!e || e.type === 'quiet') return '';
  const opt = (v, t) => `<button type="button" class="btn ${f.choice === v ? '' : 'ghost'}" data-act="choose" data-c="${v}">${t}</button>`;
  if (e.type === 'shady') return `<div class="event"><span class="label">Today · just you</span><b>A shady offer</b>
    <span>Take $${CFG.shady.cash} now. Every day after, there's a 1 in 6 chance an inspector catches you during service: −$${CFG.shady.fine} and −1 star.</span>
    <div class="row">${opt('accept', `Take it (+$${CFG.shady.cash})`)}${opt('decline', 'Pass')}</div></div>`;
  return `<div class="event"><span class="label">Today · just you</span><b>Someone booked ${CFG.noshow.tables} tables</b>
    <span>Hold them: they sit empty unless the party shows (50%), then you get $${CFG.noshow.pay}. Release them: use the tables, but if the party shows (50%) you lose a star. You'll find out during service.</span>
    <div class="row">${opt('hold', 'Hold the tables')}${opt('release', 'Release them')}</div></div>`;
}

function marketHTML(s) {
  const S = app.S, M = CFG.market, items = S.market.items, mk = app.mkt || { owner: {} }, o = other(s), now = Date.now();
  const left = mktTimeLeft(), cash = mktCashLeft(s), c = app.cool[s], cooling = c && now < c.until;
  const mine = ownedBy(s), theirs = ownedBy(o), done = !S.waiting[s], p = S.players[s];
  // Regular food shows sun (today) or moon (tomorrow) only once its delivery bar has finished
  const settled = i => !(c && c.i === i && cooling);
  const tomorrow = i => items[i] === 'reg' && S.round < CFG.rounds && regTomorrow(app.seed, S.round, i);
  const slot = (type, i) => {
    const own = mk.owner[i], T = M[type];
    let state = '', extra = '';
    if (own === s) { state = 'mine'; extra = settled(i) ? ART.icon(tomorrow(i) ? 'moon' : 'sun', 24, 'badge', tomorrow(i) ? 'arrives tomorrow' : 'arrives today') : tbar(c.start, c.until); }
    else if (own) state = 'taken';
    else if (done || left <= 0) state = 'off';
    else if (cash < T.price) state = 'poor';
    else if (cooling) state = 'wait';
    const label = `${type === 'exp' ? 'Express' : 'Regular'} food, $${T.price}${own ? (own === s ? ', yours' : ', taken') : ''}`;
    return `<button class="slot ${type} ${state}" data-act="grab" data-i="${i}" data-who="${own || ''}" ${own || done ? 'disabled' : ''} aria-label="${label}" title="${label}">${ART.icon(type, 58)}${state === 'taken' ? '' : `<span class="tag">$${T.price}</span>`}${extra}</button>`;
  };
  const planks = [];
  for (let r = 0; r < items.length; r += 5) planks.push(`<div class="plank">${items.slice(r, r + 5).map((t, j) => slot(t, r + j)).join('')}</div>`);
  const lastNote = S.round === CFG.rounds - 1 ? `<div class="callout warn"><span>${ART.icon('moon', 18)} Tomorrow is the last day: only ${ART.icon('exp', 22)} Express will be sold.</span></div>` : '';
  const t0 = mk.start || now, t1 = t0 + M.time * 1000;
  const today = p.ingr + mine.filter(i => settled(i) && !tomorrow(i)).length, later = mine.filter(i => settled(i) && tomorrow(i)).length;
  return `<div class="hud">
      <span class="h time" title="Time left">${ART.icon('clock', 26)}${tbar(t0, t1, true)}<span data-count="${t1}">${Math.max(0, Math.ceil(left / 1000))}s</span></span>
      <span class="h" title="Cash left">${ART.icon('coin', 26)}${usd(cash)}</span>
      <span class="h" title="Food for today">${ART.icon('food', 26)}${ART.icon('sun', 18)}${today}</span>
      ${later ? `<span class="h" title="Food arriving tomorrow">${ART.icon('moon', 20)}${later}</span>` : ''}
      <span class="h rival" title="${esc(nameOf(o))} bought">${ART.icon('cart', 24)}${esc(nameOf(o))} ${theirs.length}</span></div>
    <div class="legend2"><span>${ART.icon('exp', 30)} = ${ART.icon('sun', 18)} today</span><span>${ART.icon('reg', 30)} = ${ART.icon('sun', 18)} or ${ART.icon('moon', 16)} 50/50</span></div>
    ${lastNote}<div class="shelf">${planks.join('')}</div>
    ${hint(`${ART.icon('table', 18)} ${Math.max(0, p.tables - p.held)} tables · ~${ex(expectedDemand(p).total)} guests before ads`)}
    ${done ? waitHTML(s, `${esc(nameOf(o))} is still shopping…`) : `<div class="row"><button class="btn ghost" data-act="mkdone">${ART.icon('check', 20)} Done shopping</button>${S.submitted[o] ? `<span class="muted">${esc(nameOf(o))} is done. The rest is yours until time runs out.</span>` : ''}</div>`}`;
}

// Each card's effect as a tiny picture formula (the full sentence is in the tooltip)
function adFx(id) {
  const A = CFG.ads[id], g = n => `${n > 0 ? '+' : '−'}${Math.abs(n)}${ART.icon('person', 18)}`, t = ART.icon('table', 18), pct = x => `${Math.round(x * 100)}%`;
  switch (id) {
    case 'delivery': return `${g(A.n)} ${ART.icon('delivery', 18)} no ${t}`;
    case 'lunch': case 'coupon': return `${g(A.n)} · −$${A.off} each`;
    case 'subway': return `${g(A.n)} <span class="muted">(${pct(A.lowChance)}: ${g(A.low)})</span>`;
    case 'stall': return `${g(A.n)} +${A.food}${ART.icon('food', 18)}`;
    case 'bus': return `${pct(A.chance)}: ${g(A.n)}`;
    case 'wom': return `${g(A.n)} every day`;
    case 'blogger': return `${pct(A.chance)}: ${g(A.n)} · ${ART.icon('star', 16)}?`;
    case 'fake': return '<span class="muted">does nothing</span>';
    case 'review': return `them ${g(-A.n)}`;
    case 'poach': return `them ${g(-A.n)} → you ${g(A.n)}`;
    case 'swamp': return `them ${g(A.n)}`;
    case 'fakebook': return `them −${A.tables}${t} today`;
    case 'corner': return `them ${ART.icon('rush', 18)} +$${A.extra}`;
    default: return g(A.n || 0);
  }
}
function adCardHTML(id, on, afford, side) {
  const A = CFG.ads[id];
  return `<button class="ad ${on ? 'on' : ''} ${side}" data-act="ad" data-id="${id}" ${!on && !afford ? 'disabled' : ''} aria-pressed="${on}" title="${esc(A.desc)}">${ART.icon(id, 42)}
    <span class="row" style="justify-content:space-between"><b>${esc(A.name)}</b><span class="mono">$${A.price}</span></span>
    <span class="fx inl">${adFx(id)}</span><span class="tick">${on ? '✓ Bought' : 'Buy'}</span></button>`;
}

function stepLine(s, st) {
  const A = CFG.ads, li = (txt, res = '', cls = '') => `<li class="${cls}"><span>${txt}</span><span>${res}</span></li>`;
  const src = { regulars: 'Regulars', 'wom-old': 'Word of mouth regulars', poached: 'A guest you poached', flyer: 'Flyers', wom: 'Word of mouth', swamp: 'A crowd sent by your rival',
    coupon: 'Coupon guests', lunch: 'Office lunch group', delivery: 'Delivery orders', subway: 'Subway poster', bus: 'The tour bus', blogger: 'The food blogger crowd', stall: 'Market stall guests' };
  switch (st.k) {
    case 'rep': return li(`Word of mouth <span class="muted mono">rolled ${st.roll} (≤${st.need} comes)</span>`, st.ok ? '<b class="pos">+1</b>' : '<span class="muted">no-show</span>');
    case 'lose': return li(`A regular, unsure <span class="muted mono">rolled ${st.roll} (≤${st.need} leaves)</span>`, st.ok ? '<b class="neg">−1</b>' : '<span class="muted">stays</span>');
    case 'noshow': return li(`The booking <span class="muted mono">rolled ${st.roll} (4–6 shows)</span>`, st.arrive ? `<b>${st.choice === 'hold' ? 'they came' : 'they came, no seat!'}</b>` : '<span class="muted">no-show</span>');
    case 'inspect': return li(`Health inspector <span class="muted mono">rolled ${st.roll} (1 = caught)</span>`, st.caught ? `<b class="neg">caught! −$${CFG.shady.fine}</b>` : '<span class="muted">safe</span>', st.caught ? 'bad' : '');
    case 'event': return li(st.ev === 'weather' ? '🌧 A storm flooded the road' : '📢 A protest is blocking the street', `<b class="neg">−${st.n} guests</b>`, 'em');
    case 'card': {
      const from = st.from === 'self' ? 'your card' : `from ${esc(nameOf(other(s)))}`;
      const eff = st.n > 0 ? `<b class="pos">+${st.n} coming</b>` : st.n < 0 ? `<b class="neg">${st.n} guests</b>` : st.tables ? `<b class="neg">${st.tables} tables blocked</b>` : st.extra ? `<b class="neg">rush food +$${st.extra}</b>` : st.id === 'fake' ? '<span class="muted">nothing</span>' : '<span class="muted">no luck</span>';
      return li(`🂠 ${esc(A[st.id].name)} <span class="muted">(${from})</span>${st.food ? ` <span class="pos">+${st.food} food</span>` : ''}`, eff, st.id === 'fake' ? 'blank' : '');
    }
    case 'poached': return li('Your poach card worked', `<b class="pos">+${st.n} coming</b>`);
    case 'short': return li(`⏳ Short! ${st.villagers ? `<span class="pos">Villagers brought ${st.villagers} food.</span> ` : ''}${st.n ? `You got ${st.n} more in time.` : ''}`, '', 'em');
    case 'arrive': return li(`<b>${esc(src[st.src] || st.src)}</b>: ${st.n}`, `${st.seated ? `<b class="pos">seated ${st.seated}</b>` : ''}${st.away ? ` <b class="neg">away ${st.away}</b>` : ''}`, st.away ? 'em bad' : 'em');
    case 'food': return li(`${app.S.players[s].loc === 'city' ? 'A homeless man' : 'A villager'} asked for free food`, st.give ? '<b>you gave 1</b>' : '<span class="muted">you said no</span>');
    case 'fight': return li('💥 A fight broke out!', `<b class="neg">−${st.tables} tables for good, −${st.food} food</b>`, 'em bad');
    case 'propose': return li('💍 Someone proposed at a table', st.ok ? `<b class="pos">She said yes! +$${st.tip} tip</b>` : '<span class="muted">…awkward</span>', 'em');
    case 'booking': return li('The booked party paid', `<b class="pos">+$${st.pay}</b>`);
    case 'close': return li(`<b>Closing time</b>: seated ${st.served}, away ${st.turned}`, st.empty ? `<span class="muted">${st.empty} empty tables</span>` : '', 'em');
  }
  return '';
}

function serviceHTML(s) {
  const S = app.S, C = CFG.service, sv = svcState(s), o = other(s), p = S.players[s];
  const head = (t, sub) => `<div class="ticket-head"><h2>${t}</h2><span class="label">${sub || ''}</span></div>`;
  if (!S.waiting[s]) {
    const v = serviceRun(S, s, (S.got[s] && S.got[s].ops) || sv.ops);
    return head(`Day ${S.round} · Service`, 'closed') + sceneHTML(s, v, v.out, null) +
      `<div class="hud"><span class="h" title="Seated">${ART.icon('seated', 26)}${v.served}</span><span class="h ${v.turned ? 'neg' : ''}" title="Turned away">${ART.icon('away', 26)}${v.turned}</span></div>` +
      waitHTML(s, `${esc(nameOf(o))} is still serving…`);
  }
  if (!sv.started) {
    const v0 = serviceRun(S, s, [], 0);
    return head(`Day ${S.round} · Service`, 'ready') + sceneHTML(s, v0, [], null) + mathHint(p, (myCards(s) || {}).self || []) + rulesHTML('service') +
      `<div class="row"><button class="btn icbtn" data-act="play">${ART.icon('letgo', 26)} Open the doors</button></div>`;
  }
  const v = serviceRun(S, s, sv.ops, sv.closed), shown = v.out.slice(0, sv.idx), P = sv.idx >= v.out.length ? v.pending : null, now = Date.now();
  let came = 0, seated = 0, away = 0;
  for (const st of shown) if (st.k === 'arrive') { came += st.n; seated += st.seated; away += st.away; }
  let panel = '';
  if (P && P.kind === 'food') {
    panel = `<div class="popup"><b class="inl">${ART.icon('person', 28)}${ART.icon('food', 28)}? ${p.loc === 'city' ? 'A homeless man' : 'A villager'} asks for free food.</b>
      <div class="row"><button class="btn icbtn" data-act="svc" data-a="give" ${v.ingr < 1 ? 'disabled' : ''}>${ART.icon('give', 28)} Give 1</button><button class="btn ghost icbtn" data-act="svc" data-a="refuse">${ART.icon('no', 26)} No</button></div></div>`;
  } else if (P && P.kind === 'short') {
    if (!sv.waitAt) sv.waitAt = now;
    const b = sv.busy, pr = a => opPrice(S, s, P.ep, P.tries, a);
    const busyBar = b ? `<div class="busy inl">${ART.icon(b.a, 26)}${tbar(b.start, b.until)}</div>` : '';
    panel = `<div class="popup hot">
      <div class="who">${ART.icon('person', 22).repeat(Math.min(P.need, 10))}<b class="mono">&nbsp;${P.need} waiting · room for ${P.can}</b>
        ${P.shortOn.map(x => `<span class="inl neg">&nbsp;${ART.icon(x === 'ingr' ? 'food' : 'table', 22)}✕</span>`).join('')}</div>
      <div class="inl">${ART.icon('clock', 22)}${tbar(sv.waitAt, sv.waitAt + C.patience * 1000, true)}</div>${busyBar}
      ${sv.msg ? `<span class="muted">${esc(sv.msg)}</span>` : ''}
      <div class="row"><button class="btn icbtn" data-act="svc" data-a="rush" title="Rush 1 food" ${b || v.cash < pr('rush') ? 'disabled' : ''}>${ART.icon('rush', 30)} $${pr('rush')}</button>
      <button class="btn icbtn" data-act="svc" data-a="borrow" title="Borrow a table from next door (they may say no)" ${b || v.cash < pr('borrow') ? 'disabled' : ''}>${ART.icon('borrow', 30)} $${pr('borrow')}</button>
      <button class="btn ghost icbtn" data-act="svc" data-a="letgo" title="Let them go">${ART.icon('letgo', 28)}</button>
      <span class="h inl mono">${ART.icon('coin', 22)}${usd(v.cash)}</span></div></div>`;
  }
  const finished = sv.idx >= v.out.length && !v.pending;
  return head(`Day ${S.round} · Service`, finished ? 'closed' : 'open') + cardRowHTML(s, shown) + sceneHTML(s, v, shown, P) + bannerHTML(s, shown) + panel +
    `<div class="hud"><span class="h" title="Came">${ART.icon('person', 24)}${came}</span><span class="h" title="Seated">${ART.icon('seated', 26)}${seated}</span>
      <span class="h ${away ? 'neg' : ''}" title="Turned away">${ART.icon('away', 26)}${away}</span><span class="h" title="Cash">${ART.icon('coin', 24)}${usd(v.cash)}</span></div>
    <div class="row">${finished ? `<button class="btn icbtn" data-act="svcdone">${ART.icon('check', 22)} Close for the day</button>` : `<button class="btn ghost" data-act="fast">${sv.fast ? 'Normal speed' : 'Faster ▸▸'}</button>`}</div>
    <details class="log"><summary>Play-by-play</summary><ul class="lines feed">${shown.map(st => stepLine(s, st)).reverse().join('') || '<li class="muted"><span>Opening up…</span><span></span></li>'}</ul></details>`;
}

// The shop drawing for the current moment of the service playback
function sceneHTML(s, v, shown, P) {
  const S = app.S, p = S.players[s], sc = S.script[s];
  const last = shown[shown.length - 1], prev = shown[shown.length - 2];
  const first = v.out[0] ? v.out[0].snap : v;
  const cur = P ? v : last ? last.snap : first;
  const before = !P && last && last.k === 'arrive' ? (prev ? prev.snap : { usedT: 0, turned: 0 }) : cur;
  let ev = null;
  const wx = shown.find(x => x.k === 'event'); if (wx) ev = wx.ev === 'weather' ? 'rain' : 'protest';
  for (const x of shown.slice(-2)) {
    if (x.k === 'fight') ev = 'fight'; if (x.k === 'propose' && x.ok) ev = 'ring'; if (x.k === 'short' && x.villagers) ev = 'basket';
    if (x.k === 'booking') ev = 'calendar'; if (x.k === 'inspect') ev = 'inspector';
  }
  if (P && P.kind === 'short' && P.villagers) ev = 'basket';
  if (P && P.kind === 'food') ev = 'give';
  const fight = shown.find(x => x.k === 'fight');
  return ART.store({ tables: cur.tables, blocked: p.held + sc.fakeHeld, borrowed: Math.min(v.borrow.n, cur.tables), lost: fight ? fight.tables : 0,
    seated: cur.usedT, newSeat: before.usedT, food: cur.ingr, away: cur.turned, newAway: before.turned,
    queue: P && P.kind === 'short' ? P.need : 0, deliv: cur.deliv || 0, event: ev, loc: p.loc });
}
// Flipped ad cards as little picture chips
function cardRowHTML(s, shown) {
  const lastK = shown.length ? shown[shown.length - 1] : null;
  const chips = shown.filter(x => x.k === 'card' || x.k === 'poached').map(x => {
    if (x === lastK) return chip(x).replace('class="chipcard"', 'class="chipcard new"');
    return chip(x);
  });
  return `<div class="cardrow" aria-label="Cards flipped">${chips.join('')}</div>`;
  function chip(x) {
    if (x.k === 'poached') return `<span class="chipcard" data-from="${s}" title="Your poach card worked">${ART.icon('poach', 24)}<span class="pos">+${x.n}</span></span>`;
    const from = x.from === 'self' ? s : other(s), A = CFG.ads[x.id];
    const eff = x.n > 0 ? `<span class="pos">+${x.n}</span>` : x.n < 0 ? `<span class="neg">${x.n}</span>` : x.tables ? `<span class="neg">−${x.tables}${ART.icon('table', 16)}</span>` : x.extra ? `<span class="neg">+$${x.extra}${ART.icon('rush', 16)}</span>` : '<span class="zero">0</span>';
    return `<span class="chipcard" data-from="${from}" title="${esc(A.name)} (from ${esc(nameOf(from))}): ${esc(A.desc)}">${ART.icon(x.id, 24)}${eff}${x.food ? `<span class="pos">+${x.food}${ART.icon('food', 16)}</span>` : ''}</span>`;
  }
}
// One short line for the latest thing that happened
function bannerHTML(s, shown) {
  const p = app.S.players[s];
  for (let i = shown.length - 1; i >= Math.max(0, shown.length - 2); i--) {
    const x = shown[i], b = (icon, text, cls = '') => `<div class="banner ${cls}">${ART.icon(icon, 30)}<span>${text}</span></div>`;
    switch (x.k) {
      case 'event': return b(x.ev === 'weather' ? 'rain' : 'protest', `${x.ev === 'weather' ? 'Storm flooded the road' : 'Protest blocks the street'}: −${x.n} guests`, 'bad');
      case 'fight': return b('fight', `Fight! −${x.tables} tables for good, −${x.food} food`, 'bad');
      case 'propose': return b('ring', x.ok ? `A proposal: yes! +$${x.tip} tip` : 'A proposal… she said no', x.ok ? 'good' : '');
      case 'food': return b(x.give ? 'give' : 'no', x.give ? 'You shared some food' : 'You said no', '');
      case 'short': if (x.villagers) return b('basket', `Villagers brought ${x.villagers} food!`, 'good'); break;
      case 'inspect': return b('inspector', x.caught ? `Inspector caught you: −$${CFG.shady.fine}` : 'Inspector came by: all clear', x.caught ? 'bad' : '');
      case 'noshow': return b('calendar', x.arrive ? (x.choice === 'hold' ? 'The booked party is coming' : 'The booked party came: no seats!') : 'The booking was a no-show', x.arrive && x.choice !== 'hold' ? 'bad' : '');
      case 'booking': return b('calendar', `The booked party paid +$${x.pay}`, 'good');
    }
  }
  return '';
}

function actionHTML() {
  const S = app.S, s = viewer(), k = S.waiting[s], p = S.players[s], o = other(s);
  const head = (t, sub) => `<div class="ticket-head"><h2>${t}</h2><span class="label">${sub || ''}</span></div>`;
  switch (S.phase) {
    case 'pick': {
      if (app.intro < INTRO.length) {
        const [icon, line] = INTRO[app.intro];
        return `<div class="intro"><span class="big-icon" aria-hidden="true">${icon}</span><p>${line}</p>
          <div class="dots">${INTRO.map((_, i) => `<i class="${i === app.intro ? 'on' : ''}"></i>`).join('')}</div>
          <div class="row"><button class="btn" data-act="intro">${app.intro === INTRO.length - 1 ? "Let's go" : 'Next'}</button><button class="btn ghost" data-act="introskip">Skip</button></div></div>`;
      }
      if (!k) return head('Pick a shop') + waitHTML(s);
      const card = loc => { const L = CFG.loc[loc], other = CFG.loc[loc === 'city' ? 'country' : 'city'];
        const pros = [], cons = [];
        (L.open < other.open ? pros : cons).push(`Opening cost $${L.open}`);
        (L.rent < other.rent ? pros : cons).push(`Rent $${L.rent} / day`);
        (L.tables > other.tables ? pros : cons).push(`${L.tables} tables to start`);
        (L.price > other.price ? pros : cons).push(`$${L.price} per table served`);
        return `<button class="pick" data-act="pick" data-loc="${loc}">${ART.place(loc)}
        <span class="row" style="justify-content:space-between"><b style="font-size:1.1rem">${L.name}</b><span class="mono muted">${L.tag}</span></span>
        <span class="label pos">Pros</span><ul class="pc">${pros.map(x => `<li class="pos">+ ${x}</li>`).join('')}</ul>
        <span class="label neg">Cons</span><ul class="pc">${cons.map(x => `<li class="neg">− ${x}</li>`).join('')}</ul></button>`; };
      return head('Pick a shop', `${seatTag(s)} · $${CFG.startCash} to start`) +
        `<p class="muted">Both get ${CFG.baseDemand} regulars a day and start at 3 stars. Your rival won't see your pick until you both choose.</p><div class="picks">${card('country')}${card('city')}</div>`;
    }
    case 'morning': {
      const m = S.morning[s] || {};
      const card = (icon, text, amt, cls) => `<div class="banner ${cls}">${ART.icon(icon, 40)}<span style="flex:1">${text}</span><b class="mono">${amt}</b></div>`;
      const lines = [];
      if (m.robbed) lines.push(card('thief', `A thief broke in overnight and took half your cash (max $${CFG.robbery.cap}).`, `−${usd(m.robbed)}`, 'bad'));
      if (m.arrived) lines.push(card('reg', `${ART.icon('food', 22)}×${m.arrived} delivered this morning!`, `+${m.arrived}`, 'good'));
      lines.push(card('rent', 'Rent', `−$${CFG.loc[p.loc].rent}`, ''));
      const warn = S.round === CFG.rounds - 1 ? `<div class="callout warn"><b>Heads up</b><span>Tomorrow (day ${CFG.rounds}) is the last day: the market only sells ${ART.icon('exp', 22)} Express. ${ART.icon('reg', 22)} Regular bought today may arrive ${ART.icon('moon', 16)} tomorrow.</span></div>` : '';
      return head(`Good morning · Day ${S.round}`, '') + `<div class="stack">${lines.join('')}</div>${warn}` +
        (k ? `<div class="row"><button class="btn" data-act="next">Start the day</button></div>` : waitHTML(s));
    }
    case 'invest': {
      if (!k) return head('Build') + waitHTML(s);
      const f = F({ tables: 0, loan: false, choice: null }), e = S.events[s], needChoice = e && e.type !== 'quiet';
      const cashAfterLoan = p.cash + (f.loan && !p.loan ? CFG.loan.amount : 0) + (f.choice === 'accept' ? CFG.shady.cash : 0);
      const maxT = Math.min(CFG.maxTables - p.tables, Math.floor(Math.max(0, cashAfterLoan) / CFG.tableCost));
      if (f.tables > maxT) f.tables = maxT;
      const cost = f.tables * CFG.tableCost;
      const tmp = { ...p, held: f.choice === 'hold' ? CFG.noshow.tables : 0, tables: p.tables + f.tables };
      return head('Build', 'both at once') + rulesHTML('invest') + eventChoiceHTML(s, f) + `<div class="form">
        <div class="field"><div class="txt"><b>Add tables</b><small>$${CFG.tableCost} each, yours for good. You have ${p.tables}.</small></div>${stepper('tables', f.tables, 0, maxT, 'Add tables')}</div>
        ${p.loan || !CFG.loan.enabled ? '' : `<label class="field toggle" for="loan-in"><div class="txt"><b>Take a loan</b><small>$${CFG.loan.amount} now, repay $${CFG.loan.repay} at the end. Once per game.</small></div><input type="checkbox" id="loan-in" data-act="loan" ${f.loan ? 'checked' : ''}></label>`}
        <div class="total"><span>Cost</span><span>${usd(-cost)} · left ${usd(cashAfterLoan - cost)}</span></div>
        ${hint(`~${ex(expectedDemand(tmp).total)} guests expected before ads · ${Math.max(0, tmp.tables - tmp.held)} tables. Too many empty tables can cost a star.`)}
        <div class="row"><button class="btn" data-act="invest" ${needChoice && !f.choice ? 'disabled' : ''}>Done</button>${needChoice && !f.choice ? '<span class="muted">Answer the offer above first.</span>' : ''}</div></div>`;
    }
    case 'market': return head('Market', 'grab what you can') + rulesHTML('market') + marketHTML(s);
    case 'commit': {
      if (!k) return head('Ads', 'face down') + waitHTML(s);
      const f = F({ sel: [] }), sh = S.shops[s], cost = f.sel.reduce((a, id) => a + CFG.ads[id].price, 0), left = p.cash - cost;
      const card = (id, side) => adCardHTML(id, f.sel.includes(id), CFG.ads[id].price <= left, side);
      return head('Ads', 'face down') + rulesHTML('commit') + `<div class="form">
        <h3>For ${poss(s)} shop</h3><div class="ads">${sh.self.map(id => card(id, 'self')).join('')}</div>
        <h3>For ${poss(o)} shop</h3><div class="ads">${sh.rival.map(id => card(id, 'rival')).join('')}</div>
        <div class="total"><span>Paid at the flip</span><span>${usd(-cost)} · left ${usd(left)}</span></div>
        ${mathHint(p, f.sel.filter(id => CFG.ads[id].side === 'self'))}
        <div class="row"><button class="btn" data-act="commit">${f.sel.length ? `Place ${f.sel.length} card${f.sel.length === 1 ? '' : 's'}` : 'No ads today'}</button></div></div>`;
    }
    case 'reveal': return head('Flip', '') + waitHTML(s, 'Flipping cards…');
    case 'service': return serviceHTML(s);
    case 'voucher': {
      const v = S.service[s];
      let body;
      if (!k) body = v.turned > 0 && !S.submitted[s] && p.cash < CFG.voucher ? `<p class="muted">You turned away ${v.turned}, but can't afford vouchers.</p>` + waitHTML(s) : waitHTML(s);
      else {
        const f = F({ n: 0 }), max = Math.min(v.turned, Math.floor(p.cash / CFG.voucher));
        body = `<div class="form"><div class="field"><div class="txt"><b>Comp vouchers</b><small>You turned away ${v.turned}. $${CFG.voucher} each keeps one from hurting your stars.</small></div>${stepper('n', f.n, 0, max, 'Vouchers')}</div>
          ${hint(`${v.turned - f.n} unhappy → ${v.turned - f.n === 0 ? 'no star loss' : v.turned - f.n <= 3 ? '−1 star' : '−2 stars'}`)}
          <div class="row"><button class="btn" data-act="voucher">Done (${usd(-f.n * CFG.voucher)})</button></div></div>`;
      }
      return head('Service', 'vouchers') + body + billsHTML();
    }
    case 'report': {
      const last = S.round >= CFG.rounds;
      const btn = k ? `<button class="btn" data-act="next">${last ? 'See results' : `End day ${S.round}`}</button>` : waitHTML(s, `${esc(nameOf(o))} is reading the bill…`);
      return head(`Day ${S.round} recap`, '') + rulesHTML('report') + billsHTML() + `<div class="row">${btn}</div>`;
    }
    case 'over': return overHTML();
  }
  return '';
}

function billsHTML() {
  const S = app.S; if (!S.service) return '';
  const order = app.mode === 'online' ? [app.me, other(app.me)] : ['p1', 'p2'];
  return `<div class="bills">${order.map(s => billHTML(s)).join('')}</div>`;
}
function billHTML(s) {
  const S = app.S, v = S.service[s], p = S.players[s], own = s === viewer(), rv = S.reveals[s];
  const label = x => (!own && PRIVATE_LINES.includes(x.label) ? 'Other' : x.label);
  const why = (v.why || []).map(w => (!own && PRIVATE_WHY.includes(w) ? 'other −1' : w));
  const lines = p.ledger.map(x => `<li><span>${esc(label(x))}</span><span class="${x.amt > 0 ? 'pos' : x.amt < 0 ? 'neg' : 'muted'}">${x.amt === null ? '' : (x.amt > 0 ? '+' : '') + usd(x.amt)}</span></li>`).join('');
  const rep = v.starsAfter !== undefined
    ? `<div class="eq"><span class="k">Stars</span><span>${v.starsBefore} → ${v.starsAfter}${why.length ? ' · ' + esc(why.join(', ')) : ''}</span></div>`
    : `<div class="eq"><span class="k">Stars</span><span>updated at recap</span></div>`;
  const cards = rv ? [...rv.self, ...rv.rival].map(id => CFG.ads[id].name) : [];
  return `<article class="bill" data-seat="${s}">
    <div class="rest-head"><h2>${esc(nameOf(s))}</h2><span class="muted mono" style="font-size:.8rem">${CFG.loc[p.loc].name}</span></div>
    <div class="big"><div><span class="label">Came</span><b>${v.demand}</b></div><div><span class="label">Seated</span><b>${v.served}</b></div><div class="${v.turned ? 'bad' : ''}"><span class="label">Away</span><b>${v.turned}</b></div></div>
    <div class="eq"><span class="k">Cards bought</span><span>${cards.length ? esc(cards.join(', ')) : 'none'}${rv && rv.ok === false ? ' (card check failed: they did nothing)' : ''}</span></div>
    <div class="eq"><span class="k">Tables</span><span>${v.tables} at closing, ${v.empty} empty${v.borrow.n ? ` (${v.borrow.n} borrowed)` : ''}</span></div>
    ${rep}
    <ul class="lines">${lines}<li><b>Cash now</b><b class="mono">${usd(p.cash)}</b></li></ul>
  </article>`;
}

function overHTML() {
  const S = app.S, R = S.result, sc = R.score;
  const title = R.winner === 'draw' ? "It's a tie" : app.mode === 'online' && R.winner === app.me ? 'You win!' : `${esc(nameOf(R.winner))} wins`;
  const card = s => `<article class="bill" data-seat="${s}"><div class="rest-head"><h2>${esc(nameOf(s))}</h2>${R.winner === s ? '<span class="who" style="background:var(--p1-soft)">winner</span>' : ''}</div>
    <div class="score mono">${usd(sc[s].total)}</div>
    <ul class="lines"><li><span>Cash</span><span>${usd(sc[s].cash)}</span></li><li><span>${sc[s].stars} stars × $${CFG.starValue}</span><span>+$${sc[s].starPts}</span></li>${sc[s].loan ? `<li><span>Loan repaid</span><span class="neg">${usd(sc[s].loan)}</span></li>` : ''}</ul></article>`;
  return `<div class="ticket-head"><h2>${title}</h2><span class="label">${R.reason === 'bankrupt' ? 'someone went broke' : 'after 5 days'}</span></div>
    <div class="bills">${card('p1')}${card('p2')}</div>
    <div class="callout"><b>Talk it over (5 min)</b>
      <span>1. How many guests a day did you need to break even?</span>
      <span>2. Which day were you short on tables or food? What would you change?</span>
      <span>3. Which ad was worth its price? Which trick hurt you most?</span>
      <span>4. Did you take the shady deal? Would you again?</span></div>
    <div class="row"><button class="btn" data-act="leave">Back to lobby</button></div>`;
}

function historyHTML() {
  const S = app.S, rows = [];
  for (let r = 1; r <= CFG.rounds; r++) for (const s of ['p1', 'p2']) {
    const h = S.players[s].history.find(x => x.round === r); if (!h) continue;
    rows.push(`<tr><td>Day ${r} · ${esc(nameOf(s))}</td><td>${h.demand}</td><td>${h.served}</td><td class="${h.turned ? 'neg' : ''}">${h.turned}</td><td>${h.spoiled}</td><td class="pos">+${usd(h.income)}</td><td class="neg">${usd(h.spend)}</td><td>${usd(h.cash)}</td><td>${h.stars}</td></tr>`);
  }
  if (!rows.length) return '';
  return `<section class="ticket"><div class="ticket-head"><h2>Daily log</h2><span class="label">end of each day</span></div>
    <div class="tablewrap"><table><thead><tr><th>Day</th><th>Came</th><th>Seated</th><th>Away</th><th>Spoiled</th><th>In</th><th>Out</th><th>Cash</th><th>Stars</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></section>`;
}

function gameHTML() {
  const S = app.S;
  const order = app.mode === 'online' ? [app.me, other(app.me)] : ['p1', 'p2'];
  const waitingOther = app.mode === 'online' && S.phase === 'pick' && !(app.seats.p2 && app.seats.p2.uid);
  return `<div class="grid">
    <div class="stack">
      ${waitingOther ? `<div class="callout warn"><b>Waiting for a rival</b><span>Send them the code <b class="mono">${esc(app.code)}</b>.</span></div>` : ''}
      ${app.mode === 'local' ? `<div class="viewbar" data-seat="${app.view}">Playing as ${seatTag(app.view)} · switch with the buttons at the top, look away when it's not your turn</div>` : ''}
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
    case 'intro': app.intro++; return render();
    case 'introskip': app.intro = INTRO.length; return render();
    case 'copy': {
      const done = () => toast(`Copied ${app.code}`);
      try { navigator.clipboard.writeText(app.code).then(done, () => toast(`Room code: ${app.code}`)); } catch (err) { toast(`Room code: ${app.code}`); }
      return;
    }
    case 'inc': { const f = F({}); f[b.dataset.f] = (f[b.dataset.f] || 0) + Number(b.dataset.d); return render(); }
    case 'choose': { const f = F({}); f.choice = b.dataset.c; return render(); }
    case 'ad': {
      const f = F({ sel: [] }), id = b.dataset.id;
      f.sel = f.sel.includes(id) ? f.sel.filter(x => x !== id) : [...f.sel, id];
      return render();
    }
    case 'fast': { const sv = svcState(s); sv.fast = !sv.fast; return render(); }
  }
  if (!k) return;
  switch (a) {
    case 'pick': return act(s, { k, loc: b.dataset.loc });
    case 'invest': { const f = F({}); return act(s, { k, tables: f.tables || 0, choice: f.choice || null, loan: !!f.loan }); }
    case 'grab': return claimItem(s, Number(b.dataset.i));
    case 'mkdone': return finishMarket(s);
    case 'commit': {
      const f = F({ sel: [] }), A = CFG.ads;
      return commitCards(s, k, { self: f.sel.filter(id => A[id].side === 'self'), rival: f.sel.filter(id => A[id].side === 'rival') });
    }
    case 'play': { const sv = svcState(s); sv.started = true; sv.last = 0; return render(); }
    case 'svc': return svcAction(s, b.dataset.a);
    case 'svcdone': return act(s, { k, ops: svcState(s).ops });
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
