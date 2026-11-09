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
  mkt: null, mktUnsub: null, cool: {}, claiming: {}, svc: {}, ticker: null,
  howto: null, cover: null, acked: {}
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
    app.fb = window.__RR_FAKE_FB(); app.uid = app.fb.uid; app.dbReady = true; app.dbMsg = ''; return setTimeout(render, 0); // after the whole module has loaded
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
  Object.assign(app, { mode: 'local', code: 'local' + Date.now(), me: null, view: 'p1', seed: genCode(8) + Date.now(), seats: {},
    logs: { p1: [], p2: [] }, S: null, form: {}, revealing: {}, priv: {}, err: '', cover: null });
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
  // The morning news is shown inside Build, so the morning step is acknowledged automatically
  if (S.phase === 'morning') for (const s of controlled()) {
    const k = S.waiting[s];
    if (k && !app.acked[app.code + s + k]) { app.acked[app.code + s + k] = true; return act(s, { k }); }
  }
  if (app.mode === 'local' && !S.waiting[app.view]) {
    const o = other(app.view);
    if (S.waiting[o] && S.phase !== 'reveal') { app.view = o; if (PRIVATE_PHASES.includes(S.phase)) app.cover = o; }
  }
  setTicker();
  render();
}
// Steps with secrets: in one-screen practice, a cover screen hides them while the screen is passed over
const PRIVATE_PHASES = ['pick', 'invest', 'commit'];

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
    if (el.dataset.ring) { el.style.setProperty('--p', f); return; }
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
  if (c && Date.now() < c.until) { const el = document.querySelector('.strip'); if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } return toast('Wait for your delivery to finish first.'); }
  if (app.mkt.owner[i]) return toast(app.mkt.owner[i] === s ? 'You already have that one.' : `Too slow! ${nameOf(app.mkt.owner[i])} got that one.`);
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
    toast(e && e.code === 'taken' ? `Too slow! ${nameOf(other(s))} got that one.` : writeErr(e));
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

// =====================================================================
// Rendering (UI v3). Every screen is built from plain words: what happened to you, and why.
// =====================================================================
const V = 'v3a';
const IMG = { logo: `assets/logo.jpg?v=${V}`, art: `assets/key-art.jpg?v=${V}`, country: `assets/countryside.jpg?v=${V}`, city: `assets/city.jpg?v=${V}` };
const STEPS = [['invest', 'Build'], ['market', 'Market'], ['commit', 'Ads'], ['service', 'Service'], ['report', 'Recap']];
const stepIdx = p => ({ morning: 0, invest: 0, market: 1, commit: 2, reveal: 3, service: 3, voucher: 3, report: 4 })[p] ?? -1;
const PRIVATE_LINES = ['Shady deal', 'Reservation paid', 'Inspector fine'];
const PRIVATE_WHY = ['reservation had no seat −1', 'inspector −1'];
const INTRO = ['You have $100.', "It's your dream to open a restaurant!", 'You have 5 days to survive, against a rival opening across town.',
  'Every day: build, shop, advertise, open the doors. Make your choices.'];
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
const gold = (t, cls = '') => `<span class="gold ${cls}" aria-hidden="true">${t}</span>`;
const score = s => { const p = app.S.players[s]; return round2(p.cash + p.stars * CFG.starValue); };
const restName = loc => (loc === 'city' ? 'City' : 'Countryside');

function render() {
  if (app.mode === 'local') document.body.dataset.view = app.view; else delete document.body.dataset.view;
  renderBar();
  const root = $('#app');
  if (!app.mode) root.innerHTML = lobbyHTML();
  else if (!app.S) root.innerHTML = `<section class="panel" style="max-width:520px;justify-self:center"><p class="wait"><span class="dot round rival"></span>Loading the game…</p>${app.loadNote ? `<p class="err">${esc(app.loadNote)}</p>` : ''}<div class="row"><button class="btn" data-act="leave">Back to the start</button></div></section>`;
  else root.innerHTML = gameHTML();
  $('#modal').innerHTML = app.howto ? howtoHTML() : '';
  app.sig = app.S && (app.S.phase === 'market' || app.S.phase === 'service') ? liveSig() : '';
  updateBars();
}

// ---------- header ----------
function progressHTML(phase) {
  const i = stepIdx(phase);
  return `<ol class="progress" aria-label="Step ${i + 1} of 5: ${STEPS[i] ? STEPS[i][1] : ''}">${STEPS.map(([, n], j) =>
    `${j ? '<li class="sep" aria-hidden="true"></li>' : ''}<li class="${j === i ? 'on' : j < i ? 'done' : ''}"><span class="pd"></span>${n}</li>`).join('')}</ol>`;
}
function renderBar() {
  const S = app.S, bar = $('#bar');
  let mid = '';
  if (S && app.mode) {
    if (S.phase === 'pick') mid = '<span class="day"><b>Before day 1</b> · pick your spot</span>';
    else if (S.phase === 'over') mid = `<span class="day"><b>Game over</b> · ${S.result.reason === 'bankrupt' ? 'a restaurant closed' : '5 days played'}</span>`;
    else mid = `<span class="day"><b>Day ${S.round} of ${CFG.rounds}</b>${S.round === CFG.rounds ? ' · last day' : ''}</span>${progressHTML(S.phase)}`;
  }
  let tools = '';
  if (app.mode === 'online') tools = `<span>Room <b style="color:var(--ink);letter-spacing:.06em">${esc(app.code)}</b></span><button class="btn" data-act="copy" aria-label="Copy room code">${ART.icon('copy', 14)}</button>`;
  if (app.mode === 'local') tools = `<span>Practice</span>${['p1', 'p2'].map(s => `<button class="btn" data-act="view" data-seat="${s}" aria-pressed="${app.view === s}" style="${app.view === s ? 'border-color:var(--ink)' : ''}">Player ${s === 'p1' ? 1 : 2}${S && S.waiting[s] ? ' •' : ''}</button>`).join('')}`;
  tools += '<button class="btn" data-act="howto">How to play</button>';
  if (app.mode) tools += `<button class="btn" data-act="leave">${app.mode === 'local' ? 'Quit' : 'Leave'}</button>`;
  bar.innerHTML = `<img class="logo" src="${IMG.logo}" alt="Restaurant Rivals" data-act="home"><div class="mid">${mid}</div><div class="tools">${tools}</div>`;
}

// ---------- landing ----------
function lobbyHTML() {
  const last = lsGet('lastCode'), ok = app.dbReady && !app.busy;
  const step = (n, name, icon, d) => `<li><span class="ib">${ART.icon(icon, 20)}</span><span><b>${gold(n, 'sm')}${name}</b><span class="d">${d}</span></span></li>`;
  return `<div class="landing">
    <figure class="keyart"><img src="${IMG.art}" alt="Restaurant Rivals: two chefs arm-wrestling across a kitchen counter">
      <span class="vs"><span class="dot round you"></span>You<span class="faint">vs</span><span class="dot round rival"></span>Your rival</span></figure>
    <section class="pitch">
      <div style="display:grid;gap:14px">
        <span class="eyebrow">A 2-player restaurant game · ages 13+</span>
        <h1 class="headline" aria-label="2 Restaurants. 2 Rivals. 5 Days."><span>${gold(2)}Restaurants.</span><span>${gold(2)}Rivals.</span><span>${gold(5)}Days.</span></h1>
        <p>Open a restaurant with $${CFG.startCash}, grab ingredients before your rival does, and use ads to pull guests in, or to trip your rival up. The restaurant with the most cash and best rating after ${CFG.rounds} days wins.</p>
      </div>
      ${app.dbMsg ? `<div class="callout bad">${ART.icon('warn', 20)}<span>${esc(app.dbMsg)}</span></div>` : ''}
      <div class="field"><label for="nick-in">Your name <span>· your rival sees this</span></label>
        <input type="text" id="nick-in" maxlength="12" autocomplete="nickname" placeholder="e.g. Sam" value="${esc(app.nick)}"></div>
      ${app.err ? `<div class="callout bad">${ART.icon('warn', 20)}<span>${esc(app.err)}</span></div>` : ''}
      <div class="choices">
        <div class="choice-card"><div><b>Start a new game</b><div class="sub">You get a 4-letter code to send to your rival.</div></div>
          <button class="cta" data-act="create" ${ok ? '' : 'disabled'}>${app.busy ? 'Making a room…' : 'Create a room'}</button></div>
        <form class="choice-card" data-form="join"><div><b>Join a game</b><label class="sub" for="code-in">Type the code your rival sent you.</label></div>
          <div class="join"><input type="text" id="code-in" maxlength="4" autocomplete="off" placeholder="ABCD" ${app.dbReady ? '' : 'disabled'}><button class="cta" type="submit" ${ok ? '' : 'disabled'}>Join</button></div></form>
      </div>
      <div class="row" style="gap:20px">
        ${last && app.dbReady ? `<button class="resume" data-act="rejoin" data-code="${esc(last)}">Back to your game ${esc(last)} ${ART.icon('arrow', 16)}</button>` : ''}
        <button class="linkish" data-act="local">Practice alone on one screen</button>
      </div>
    </section>
  </div>
  <section class="five" aria-label="How a day works">
    <div class="row" style="justify-content:space-between"><h2 style="font-size:18px">Every day, five steps</h2><span class="muted" style="font-size:13px">After day ${CFG.rounds}, your cash plus $${CFG.starValue} for every star is your score.</span></div>
    <ol>${step(1, 'Build', 'table', "Buy tables. Answer today's secret offer.")}${step(2, 'Market', 'cart', `${CFG.market.time} seconds. Grab food before your rival does.`)}
      ${step(3, 'Ads', 'card', 'Buy cards that bring guests, or sabotage your rival.')}${step(4, 'Service', 'person', 'Seat your guests. Each needs a table and a food.')}
      ${step(5, 'Recap', 'star', 'See what you earned and how your stars changed.')}</ol>
  </section>
  <p class="fine">No sign-up needed. Each browser counts as one player, so to try it alone use a second device or a private window.</p>`;
}

// ---------- how to play ----------
function howtoHTML() {
  const C = CFG, L = C.loc, A = C.ads, open = app.howto.open;
  const sec = (id, title, sub, body) => `<div class="acc ${open === id ? 'open' : ''}"><button class="acc-h" data-act="howto-sec" data-sec="${id}" aria-expanded="${open === id}"><span><b>${title}</b><span>${sub}</span></span>${ART.icon('chevron', 18)}</button>${open === id ? `<div class="acc-b">${body}</div>` : ''}</div>`;
  const n = i => gold(i, 'sm');
  return `<div class="overlay" data-act="howto-close"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="howto-title">
    <header><h1 id="howto-title">How to play</h1><button class="btn" data-act="howto-close" aria-label="Close">Esc ${ART.icon('x', 16)}</button></header>
    <div class="body">
      <section class="short" aria-label="The short version"><h2 style="font-size:13px;font-family:var(--body);color:var(--muted)">The short version</h2>
        <ol><li>${n(1)}<span>You and a friend each run a restaurant for <b>${C.rounds} days</b>. Whoever ends with the <b>most money and best star rating</b> wins.</span></li>
        <li>${n(2)}<span>Every guest needs <b>a table and a plate of food</b>. Run out of either, and guests leave unhappy. Buy more than you need, and the extra is wasted, because leftover food goes bad overnight.</span></li>
        <li>${n(3)}<span>Your rival is doing the same, and can <b>play tricks on you</b>. You can play tricks back.</span></li></ol>
        <span style="font-size:13px;color:var(--muted)">That's enough to start. The game explains each step as you go.</span></section>
      <div><h2 style="font-size:13px;font-family:var(--body);color:var(--muted);margin-bottom:6px">Want more detail?</h2>
      ${sec('pick', 'Picking your restaurant', 'Countryside or City, and paying rent', `<p>You both start with $${C.startCash} and ${C.startStars} stars, and ${C.baseDemand} regular guests come every day.</p>
        <table><thead><tr><th></th><th>Countryside</th><th>City</th></tr></thead><tbody>
        <tr><td>Costs to open</td><td>$${L.country.open}</td><td>$${L.city.open}</td></tr><tr><td>Rent every morning</td><td>$${L.country.rent}</td><td>$${L.city.rent}</td></tr>
        <tr><td>Tables to start</td><td>${L.country.tables}</td><td>${L.city.tables}</td></tr><tr><td>Each guest pays</td><td><b>$${L.country.price}</b></td><td><b>$${L.city.price}</b></td></tr></tbody></table>
        <p><b>Watch your rent.</b> It's paid every morning. If you can't pay it, you're out of the game.</p>`)}
      ${sec('day', 'A day, step by step', 'What you do in each of the 5 steps', `<ol class="steps">
        <li><b>Build</b><br>Buy tables for $${C.tableCost} each. They're yours for the rest of the game.</li>
        <li><b>Market</b><br>You both shop at once for ${C.market.time} seconds. Whoever clicks first gets the food. <b>Express</b> ($${C.market.exp.price}) arrives today. <b>Regular</b> ($${C.market.reg.price}) is cheaper, but might not arrive until tomorrow. On the last day there's only Express.</li>
        <li><b>Ads</b><br>Buy cards that bring you guests, or that cause trouble for your rival. Cards stay secret until service starts, and you only pay when they're revealed.</li>
        <li><b>Service</b><br>Guests arrive in groups. If you run out of tables or food, you get a few seconds to rush in food ($${C.service.rush[0]}–${C.service.rush[1]}) or borrow a table from next door ($${C.service.borrow[0]}–${C.service.borrow[1]}, they might say no). Otherwise they leave.</li>
        <li><b>Recap</b><br>See what you earned, what you spent and how your stars changed. Leftover food goes bad overnight.</li></ol>`)}
      ${sec('stars', 'Stars', 'How to earn them and how to lose them', `<p>You start with ${C.startStars} stars. They change at the end of each day.</p>
        <ul><li><b>You gain a star</b> when every guest who came got a table.</li><li><b>You lose stars</b> when you turn guests away: 1 star for 1 to 3 guests, 2 stars for 4 or more.</li>
        <li>More than half your tables empty at closing might cost you a star.</li></ul>
        <p><b>Saying sorry helps.</b> After service you can give each guest you turned away a $${C.voucher} voucher, so they don't count against you.</p>
        <p><b>Why stars matter.</b> More stars bring extra guests. Fewer stars mean some regulars stay home. At the end of the game, each star is worth $${C.starValue}.</p>`)}
      ${sec('surprises', 'Surprises', 'Secret offers, and things that happen during service', `<p><b>Secret offers.</b> Some mornings you get an offer only you can see:</p>
        <ul><li><b>A shady deal:</b> take $${C.shady.cash} now. But on every day after, there's a 1 in 6 chance an inspector catches you. If that happens you pay $${C.shady.fine} and lose a star.</li>
        <li><b>A booking for ${C.noshow.tables} tables:</b> keep them free and, if the party comes (50/50), they pay you $${C.noshow.pay}. Give the tables to other guests instead and, if the party comes, you lose a star.</li></ul>
        <p><b>During service.</b> A fight, a storm, a proposal, someone asking for free food. Each one is explained when it happens.</p>
        <p><b>Overnight.</b> There's a small chance of a break-in that takes some of your cash.</p>`)}
      ${sec('friend', 'Playing with a friend', 'Room codes, reconnecting and keyboard shortcuts', `<ul><li>One of you clicks <b>Create a room</b> and sends the 4-letter code. The other types it under <b>Join a game</b>.</li>
        <li>Each browser counts as one player. To try it alone, pick <b>Practice alone on one screen</b>.</li><li>Lost your connection? Open the page again and click <b>Back to your game</b>.</li></ul>
        <p><b>Keys during service:</b> <kbd>R</kbd> rush food · <kbd>B</kbd> borrow a table · <kbd>Esc</kbd> let them go</p>`)}
      </div>
    </div>
    <footer><button class="cta" data-act="howto-close">Got it</button></footer>
  </aside>`;
}

// ---------- shared pieces ----------
function themStatus(o) {
  const S = app.S, done = S.submitted[o] || (!S.waiting[o] && S.waiting[other(o)]);
  const t = { pick: ['choosing', 'has picked'], invest: ['still choosing', 'ready'], market: ['shopping', 'done shopping'], commit: ['choosing cards', 'cards placed'],
    reveal: ['', ''], service: ['still serving', 'closed for the day'], voucher: ['', 'ready'], report: ['reading their recap', 'ready'] }[S.phase] || ['', ''];
  return done ? t[1] : t[0];
}
function statusHTML(s, live = {}) {
  const S = app.S, p = S.players[s], o = other(s), q = S.players[o], L = CFG.loc[p.loc];
  const cashNow = live.cash ?? p.cash, foodNow = live.food ?? p.ingr;
  const foodLow = S.phase === 'service' ? false : p.ingr <= 1;
  return `<section class="status" aria-label="Both restaurants">
    <div class="me"><div><span class="dot you"></span><span class="who"><b>${esc(nameOf(s))}</b><span>${L.name} · $${L.price} a guest</span></span></div>
      <div><span class="k">Cash</span><span class="v">${usd(cashNow)}</span></div>
      <div><span class="k">Stars</span><span class="v">${p.stars} <small>of 5</small></span></div>
      <div><span class="k">Tables</span><span class="v">${p.tables}${p.held ? ` <small>${p.held} reserved</small>` : ''}</span></div>
      <div><span class="k ${foodLow && S.phase !== 'invest' ? 'bad' : ''}">Food</span><span class="v">${foodNow}</span></div></div>
    <div class="them"><span class="dot rival"></span><span class="who"><b>${esc(nameOf(o))}</b><span>${q.loc ? CFG.loc[q.loc].name + ' · ' : ''}${plural(q.stars, 'star')}</span></span><span class="st">${themStatus(o)}</span></div>
  </section>`;
}
const titleHTML = (h, sub, right = '') => `<div class="title"><div style="display:grid;gap:2px"><h1>${h}</h1>${sub ? `<span class="sub">${sub}</span>` : ''}</div>${right}</div>`;
const waitCard = (o, line = '', extra = '') => `<section class="panel"><span class="wait"><span class="dot round rival"></span><b>Waiting for ${esc(nameOf(o))}…</b></span>${line ? `<span style="font-size:13px;color:var(--ink2)">${line}</span>` : ''}${extra}</section>`;
const ring = (t0, t1, cls = '', drain = true) => `<span class="ringp ${cls}" data-t0="${t0}" data-t1="${t1}" data-ring="1" ${drain ? 'data-drain="1"' : ''}></span>`;
const pbar = (t0, t1) => `<span class="prog" data-t0="${t0}" data-t1="${t1}"><i></i></span>`;
const keyHTML = () => `<div class="key" aria-label="Key">
  <span><svg width="28" height="30" viewBox="-34 -36 68 78" class="floor" style="width:28px"><g class="tbl seat"><rect class="top" x="-30" y="-32" width="60" height="44" rx="10"/><circle class="rim" cx="0" cy="-10" r="10"/><circle class="dish" cx="0" cy="-10" r="5"/><path class="guest" d="M-14 39a14 11 0 0 1 28 0z"/><circle class="guest" cx="0" cy="21" r="7"/></g></svg>guest eating</span>
  <span><svg width="28" height="30" viewBox="-34 -36 68 78" class="floor" style="width:28px"><g class="tbl free"><rect class="top" x="-30" y="-32" width="60" height="44" rx="10"/><rect class="chair" x="-12" y="18" width="24" height="14" rx="7"/></g></svg>free table</span>
  <span><svg width="28" height="30" viewBox="-34 -36 68 78" class="floor" style="width:28px"><defs><pattern id="rr-hatch-k" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--line2)"/><rect width="3" height="8" style="fill:var(--line)"/></pattern></defs><rect x="-30" y="-32" width="60" height="44" rx="10" style="fill:url(#rr-hatch-k);stroke:var(--line);stroke-width:2"/></svg>can't be used tonight</span>
  <span><svg width="28" height="30" viewBox="-34 -36 68 78" class="floor" style="width:28px"><g class="tbl borrowed"><rect class="top" x="-30" y="-32" width="60" height="44" rx="10"/></g></svg>borrowed</span>
  <span>${ART.plate(18)}1 food</span></div>`;
function coverHTML(s) {
  return `<div class="cover" role="dialog" aria-label="Pass the screen"><span style="color:#A1A1AA;font-size:13px">${esc(nameOf(other(s)))} is done</span><b>Pass the screen to ${esc(nameOf(s))}</b>
    <span>${esc(nameOf(other(s)))}, look away. ${esc(nameOf(s))} has secret choices to make.</span><button class="cta" data-act="cover-ok">I'm ${esc(nameOf(s))}, show me</button></div>`;
}

function gameHTML() {
  const S = app.S, s = viewer(), o = other(s);
  if (app.mode === 'local' && app.cover === s && PRIVATE_PHASES.includes(S.phase)) return coverHTML(s);
  const noRival = app.mode === 'online' && S.phase === 'pick' && !(app.seats.p2 && app.seats.p2.uid);
  const waitRival = noRival ? `<div class="callout"><span class="dot round rival" style="margin-top:6px"></span><span><b>Waiting for your rival to join</b>Send them this page and the code <b style="display:inline;letter-spacing:.08em">${esc(app.code)}</b>.</span></div>` : '';
  switch (S.phase) {
    case 'pick': return waitRival + pickHTML(s);
    case 'morning': return `<section class="panel" style="justify-self:center"><p class="wait"><span class="dot round rival"></span>Opening up for the day…</p></section>`;
    case 'invest': return buildHTML(s);
    case 'market': return marketHTML(s);
    case 'commit': return adsHTML(s);
    case 'reveal': return `<section class="panel" style="justify-self:center"><p class="wait"><span class="dot round rival"></span>Turning over the ad cards…</p></section>`;
    case 'service': return serviceHTML(s);
    case 'voucher': return voucherHTML(s);
    case 'report': return recapHTML(s);
    case 'over': return finalHTML(s);
  }
  return '';
}

// ---------- intro + pick ----------
function pickHTML(s) {
  const S = app.S, k = S.waiting[s], o = other(s);
  if (app.intro < INTRO.length) {
    return `<section class="intro"><img src="${IMG.art}" alt=""><p>${INTRO[app.intro]}</p><div class="dots">${INTRO.map((_, i) => `<i class="${i === app.intro ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row"><button class="cta inline" data-act="intro">${app.intro === INTRO.length - 1 ? "Let's go" : 'Next'}</button><button class="btn" data-act="introskip">Skip</button></div></section>`;
  }
  if (!k) {
    const mine = S.got[s] && S.got[s].loc;
    return `<div class="pick-title"><h1>Good choice!</h1><p class="muted">You're opening in the ${mine === 'city' ? 'City' : 'Countryside'}.</p></div>${waitCard(o, `Once ${esc(nameOf(o))} picks, day 1 begins.`)}`;
  }
  const card = loc => {
    const L = CFG.loc[loc], O = CFG.loc[loc === 'city' ? 'country' : 'city'];
    const tag = (better, word) => (better ? ` <span class="better">${word}</span>` : '');
    const only = Object.values(CFG.ads).filter(a => a.loc === loc).map(a => a.name.toLowerCase());
    const lead = loc === 'city' ? 'Pricier to run, with fewer tables. Each guest pays more.' : 'Cheap to run, with room for more guests. Each guest pays less.';
    const extra = loc === 'country' ? ' Kind villagers sometimes bring food when you run short.' : '';
    return `<article class="pick"><div class="pic"><img src="${IMG[loc === 'city' ? 'city' : 'country']}" alt="${loc === 'city' ? 'A busy city restaurant with skyscrapers and a train behind it' : 'A cosy stone restaurant with a farm and cows behind it'}">${gold(L.name)}</div>
      <div class="in"><p class="lead">${lead}</p>
        <dl class="cmp"><dt>Costs to open</dt><dd>$${L.open}${tag(L.open < O.open, 'cheaper')}</dd><dt>Rent every morning</dt><dd>$${L.rent}${tag(L.rent < O.rent, 'cheaper')}</dd>
          <dt>Tables to start</dt><dd>${L.tables}${tag(L.tables > O.tables, 'more')}</dd><dt>Each guest pays</dt><dd>$${L.price}${tag(L.price > O.price, 'more')}</dd>
          <dt>Cash left after day 1's costs</dt><dd>$${CFG.startCash - L.open - L.rent}</dd></dl>
        <div class="only"><b>Only in the ${loc === 'city' ? 'city' : 'countryside'}</b><span>Ads like ${only.slice(0, -1).join(', ')} or ${only.slice(-1)}.${extra}</span></div>
        <button class="cta" data-act="pick" data-loc="${loc}">Open in the ${L.name}</button></div></article>`;
  };
  return `<div class="pick-title"><h1>Where will you open your restaurant?</h1><p class="muted">You have <b style="color:var(--ink)">$${CFG.startCash}</b>. You'll stay in the same spot for all ${CFG.rounds} days, so choose carefully.</p></div>
    <div class="picks">${card('country')}${card('city')}</div>
    <p class="fine">Either way you start with ${CFG.startStars} stars and ${CFG.baseDemand} regular guests a day. ${esc(nameOf(o))} won't see where you opened until you've both picked.</p>`;
}

// ---------- build ----------
function guestsText(E) {
  if (E.min === E.max) return { v: String(E.min), s: 'your regulars, plus anyone your ads bring' };
  return { v: `${Math.max(0, E.min)} to ${E.max}`, s: `usually about ${Math.round(E.total)}. Not every guest is certain.` };
}
function buildHTML(s) {
  const S = app.S, p = S.players[s], o = other(s), k = S.waiting[s], e = S.events[s], m = S.morning[s] || {}, L = CFG.loc[p.loc];
  const last = S.round === CFG.rounds;
  // morning news
  const prev = p.history[p.history.length - 1];
  const fight = prev && prev.ledger.find(x => /^Fight broke/.test(x.label));
  const chips = S.round === 1
    ? [`Opened your ${L.name} restaurant: $${L.open}`, `Paid rent: $${L.rent}`]
    : [`Paid rent: $${L.rent}`, ...(m.arrived ? [`${plural(m.arrived, 'food')} from yesterday's Regular order arrived`] : [])];
  if (S.round === CFG.rounds - 1) chips.push('Tomorrow the Market only sells Express food');
  const morning = `${m.robbed ? `<div class="callout bad">${ART.icon('warn', 22)}<span><b>A thief broke in last night and took ${usd(m.robbed)}</b>Thieves take half your cash, but never more than $${CFG.robbery.cap}. You now have ${usd(p.cash)}.</span></div>` : ''}
    <div class="chips"><span class="lbl">${S.round === 1 ? 'Today:' : 'This morning:'}</span>${fight ? `<span class="c bad">${fight.label.replace('Fight broke', '').trim()} broken in yesterday's fight</span>` : ''}${chips.map(c => `<span class="c">${c}</span>`).join('')}</div>`;

  if (!k) {
    const g = S.got[s] || {}, bits = [];
    if (e.type === 'shady' && g.choice) bits.push(g.choice === 'accept' ? 'take the shady deal' : 'say no to the shady deal');
    if (e.type === 'noshow' && g.choice) bits.push(g.choice === 'hold' ? `keep ${CFG.noshow.tables} tables for the booking` : 'use the booked tables for walk-ins');
    bits.push(g.tables ? `buy ${plural(g.tables, 'table')} ($${g.tables * CFG.tableCost})` : 'no new tables');
    return statusHTML(s) + `<div class="game"><section class="panel lift">${titleHTML('Build', 'Get your restaurant ready before the doors open.')}${morning}
      ${floorBuild(p, 0, p.held)}</section><aside class="stack">${waitCard(o, `You chose: ${bits.join(', ')}.`, `<span class="hint">The Market opens as soon as they're done. It lasts ${CFG.market.time} seconds, and the fastest clicks get the food.</span>`)}</aside></div>`;
  }
  const f = F({ tables: 0, choice: null }), needChoice = e && e.type !== 'quiet';
  const cash = p.cash + (f.choice === 'accept' ? CFG.shady.cash : 0);
  const room = CFG.maxTables - p.tables, afford = Math.floor(Math.max(0, cash) / CFG.tableCost), maxT = Math.max(0, Math.min(room, afford));
  if (f.tables > maxT) f.tables = maxT;
  const total = p.tables + f.tables, held = f.choice === 'hold' ? Math.min(CFG.noshow.tables, total) : 0;
  const E = expectedDemand({ ...p, held, tables: total });
  const gt = guestsText(E), walkins = total - held;

  // the secret offer
  const opt = (v, t, d) => `<button type="button" class="choice ${f.choice === v ? 'on' : ''}" role="radio" aria-checked="${f.choice === v}" data-act="choose" data-c="${v}"><span class="rd"></span><span><b>${t}</b><span class="d">${d}</span></span></button>`;
  let offer = '';
  if (e.type === 'shady') {
    const active = p.shadyFrom !== null;
    offer = `<section class="panel edge"><span class="offer-tag">${ART.icon('lock', 13)}Only you can see this</span>
      <div style="display:grid;gap:4px"><h2 style="font-family:var(--display);font-size:18px">${active ? `The stranger is back with another $${CFG.shady.cash}` : `A stranger offers you $${CFG.shady.cash} for a shady deal`}</h2>
      <span style="font-size:14px;color:var(--ink2);line-height:1.45">${active ? `You already took a deal on day ${p.shadyFrom}, so the inspector is already watching you (1 in 6 each day). Taking this one doesn't change that chance.`
        : `Easy money. But on every day after this, there's a 1 in 6 chance a health inspector catches you. If they do, you pay $${CFG.shady.fine} and lose a star.`}</span></div>
      <div role="radiogroup" style="display:grid;gap:8px">${opt('accept', `Take the $${CFG.shady.cash}`, 'and hope nobody finds out')}${opt('decline', 'Say no', 'nothing happens')}</div></section>`;
  } else if (e.type === 'noshow') {
    const t = p.tables, few = t < CFG.noshow.tables;
    offer = `<section class="panel edge"><span class="offer-tag">${ART.icon('lock', 13)}Only you can see this</span>
      <div style="display:grid;gap:4px"><h2 style="font-family:var(--display);font-size:18px">A party wants to book ${few ? 'tables' : `${CFG.noshow.tables} tables`} tonight</h2>
      <span style="font-size:14px;color:var(--ink2);line-height:1.45">${t === 0 ? "You have no tables yet, so keeping tables for them won't change anything unless you buy some. " : few ? 'You only have 1 table. Keeping it for them means no walk-in guest can sit there. ' : ''}They might not turn up. It's 50/50, and you'll only find out during service.</span></div>
      <div role="radiogroup" style="display:grid;gap:8px">${opt('hold', `Keep the ${few ? 'table' : `${CFG.noshow.tables} tables`} for them`, `If they come, they pay you $${CFG.noshow.pay}. If not, the ${few ? 'table sits' : 'tables sit'} empty all night.`)}
      ${opt('release', 'Say no and use the tables', 'Walk-in guests can sit there. But if the party turns up with nowhere to sit, you lose a star.')}</div></section>`;
  } else {
    offer = `<section class="panel"><b style="font-size:14px">No offers today</b><span class="sub">Just decide how many tables you want.</span></section>`;
    if (p.shadyFrom !== null) offer += `<section class="panel"><b style="font-size:14px">You took the shady deal on day ${p.shadyFrom}</b><span class="sub">An inspector might visit during service: a 1 in 6 chance each day. If they catch you, it's $${CFG.shady.fine} and a star.</span></section>`;
  }
  // tables
  let tables;
  if (room <= 0) tables = `<section class="panel"><h2 style="font-family:var(--display);font-size:18px">Your dining room is full</h2><span class="sub">${CFG.maxTables} tables is the most you can have. If you run out of seats tonight, you can still borrow tables from next door.</span></section>`;
  else if (afford <= 0) tables = `<section class="panel"><h2 style="font-family:var(--display);font-size:18px">No new tables today</h2><span class="sub">${cash <= 0 ? 'You have no cash left.' : `A table costs $${CFG.tableCost} and you have ${usd(cash)}. Keep it for food at the Market.`}</span></section>`;
  else tables = `<section class="panel"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div style="display:grid;gap:2px"><h2 style="font-family:var(--display);font-size:18px">Buy more tables?</h2><span class="sub">$${CFG.tableCost} each. You keep them for the rest of the game.</span></div>
      <div class="stepper" role="group" aria-label="New tables">${f.tables > 0 ? `<button type="button" data-act="inc" data-f="tables" data-d="-1" aria-label="One fewer table">−</button>` : '<span class="off" aria-hidden="true">−</span>'}<output>${f.tables}</output>${f.tables < maxT ? `<button type="button" data-act="inc" data-f="tables" data-d="1" aria-label="One more table">+</button>` : '<span class="off" aria-hidden="true">+</span>'}</div></div>
      ${f.tables >= maxT && maxT < room ? `<span class="hint">That's all your cash allows today: ${plural(maxT, 'table')} at $${CFG.tableCost} each.</span>` : ''}
      <div class="lines"><div><span class="muted">${plural(f.tables, 'new table')}</span><b>${usd(-f.tables * CFG.tableCost)}</b></div><div><span class="muted">Cash left for the market and ads</span><b>${usd(cash - f.tables * CFG.tableCost)}</b></div></div>
      <p class="hint">${last ? '<b style="color:var(--ink)">Last day.</b> Tables don\'t add to your final score. Only buy what you\'ll use tonight. ' : ''}Careful: if more than half your tables are empty at closing, you might lose a star. You can have up to ${CFG.maxTables} tables.</p></section>`;
  const done = needChoice && !f.choice
    ? `<div class="center-note">Answer the offer above to continue<span>It's a yes or no. Neither is wrong.</span></div>`
    : `<button class="cta" data-act="invest">Done, go to the Market →</button><span class="hint" style="text-align:center">The Market opens when you're both done. It lasts ${CFG.market.time} seconds, so be ready.</span>`;
  return statusHTML(s) + `<div class="game">
    <section class="panel lift">${titleHTML('Build', 'Get your restaurant ready before the doors open. This is how it will look tonight.')}${morning}
      ${floorBuild(p, f.tables, held)}
      <div class="tiles"><div class="tile"><span class="k">Guests expected tonight</span><span class="v">${gt.v}</span><span class="s">${gt.s}</span></div>
        <div class="tile"><span class="k">Tables for walk-in guests</span><span class="v">${walkins}</span><span class="s">${held ? `${total} tables, minus ${held} held for the booking` : 'all your tables'}</span></div>
        <div class="tile"><span class="k">Food so far</span><span class="v">${p.ingr}</span><span class="s">${p.ingr ? 'each guest needs 1, so you\'ll likely need more' : 'none yet: you\'ll buy it at the Market'}</span></div></div>
    </section>
    <aside class="stack">${offer}${tables}${done}</aside></div>`;
}
function floorBuild(p, add, held) {
  const own = [...Array(p.tables).fill('free'), ...Array(add).fill('new')];
  let h = held;
  for (let i = p.tables - 1; i >= 0 && h > 0; i--, h--) own[i] = 'reserved';
  for (let i = own.length - 1; i >= 0 && h > 0; i--) if (own[i] === 'new') { own[i] = 'reserved'; h--; }
  const total = own.length;
  return ART.floor({ own, food: p.ingr, roomLabel: `DINING ROOM · ${total} ${total === 1 ? 'TABLE' : 'TABLES'}`,
    roomNote: total === 0 ? 'Your dining room is empty. No guest can sit down tonight.' : total < CFG.maxTables ? `Room for ${CFG.maxTables - total} more tables` : '',
    kitchenNote: ["You'll buy more", 'at the Market next'], aria: `Your dining room tonight: ${total} tables, ${held} held for a booking, ${p.ingr} food in the kitchen` });
}

// ---------- market ----------
function marketHTML(s) {
  const S = app.S, M = CFG.market, items = S.market.items, mk = app.mkt || { owner: {} }, o = other(s), now = Date.now();
  const left = mktTimeLeft(), cash = mktCashLeft(s), c = app.cool[s], cooling = c && now < c.until;
  const mine = ownedBy(s), theirs = ownedBy(o), done = !S.waiting[s], p = S.players[s];
  const settled = i => !(c && c.i === i && cooling);
  const tomorrow = i => items[i] === 'reg' && S.round < CFG.rounds && regTomorrow(app.seed, S.round, i);
  const tbox = (type, cls = '') => `<span class="tbox sm ${type} ${cls}">${ART.icon(type === 'exp' ? 'bolt' : 'box', 16)}</span>`;
  const slot = (type, i) => {
    const own = mk.owner[i], T = M[type], nm = type === 'exp' ? 'Express' : 'Regular';
    if (own === s) {
      const body = settled(i) ? `<span class="s ${tomorrow(i) ? 'later' : ''}">Yours · ${tomorrow(i) ? 'tomorrow morning' : 'tonight'}</span>`
        : `<span style="display:grid;gap:4px;width:100%"><span class="s">Yours · on its way…</span><span class="bar" data-t0="${c.start}" data-t1="${c.until}"><i></i></span></span>`;
      return `<button class="item mine ${type}" data-act="grab" data-i="${i}" data-who="${s}" disabled aria-label="${nm}, yours">${tbox(type)}<b>${nm}</b>${body}</button>`;
    }
    if (own) return `<button class="item taken ${type}" data-act="grab" data-i="${i}" data-who="${own}" disabled aria-label="${nm}, taken">${tbox(type)}<b>${nm}</b><span class="s">${esc(nameOf(own))} got it</span></button>`;
    let st = '';
    if (done || left <= 0) st = 'off'; else if (cash < T.price) st = 'poor'; else if (cooling) st = 'wait';
    const sub = st === 'poor' ? `<span class="s">$${T.price} · you have ${usd(cash)}</span>` : `<span class="p">$${T.price}</span>`;
    return `<button class="item ${type} ${st}" data-act="grab" data-i="${i}" ${st ? 'disabled' : ''} aria-label="${nm} food, $${T.price}">${tbox(type)}<b>${nm}</b>${sub}</button>`;
  };
  const t0 = mk.start || now, t1 = t0 + M.time * 1000;
  let strip = '';
  if (done) strip = '';
  else if (cooling) strip = `<div class="strip" role="status">${ring(c.start, c.until, 'sm')}<span>Your ${c.type === 'exp' ? 'Express' : 'Regular'} is on its way. You can grab again in <span data-count="${c.until}">${Math.ceil((c.until - now) / 1000)}s</span>.</span></div>`;
  else if (cash < M.reg.price) strip = `<div class="strip soft"><span><b>You're out of cash for food.</b> The cheapest food is $${M.reg.price} and you have ${usd(cash)}. Click "I'm done shopping" to move on.</span></div>`;
  else if (!mine.length) strip = `<div class="strip soft"><span>Click any item to buy it. Be quick: ${esc(nameOf(o))} is shopping too.</span></div>`;
  else if (S.submitted[o]) strip = `<div class="strip soft"><span class="dot round rival"></span><span><b>${esc(nameOf(o))} is done.</b> Everything left on the shelf is yours until the timer ends.</span></div>`;
  const today = p.ingr + mine.filter(i => settled(i) && !tomorrow(i)).length, later = mine.filter(i => settled(i) && tomorrow(i)).length;
  const onway = mine.filter(i => !settled(i)).length, bought = mine.filter(i => !settled(i) || !tomorrow(i)).length;
  const E = expectedDemand(p), tables = Math.max(0, p.tables - p.held), guests = Math.round(E.total), need = Math.min(guests, tables);
  const plenty = today > Math.max(E.max, tables) + 2;
  const advice = plenty
    ? `<span style="font-size:13px;font-weight:600">That's plenty</span><span style="font-size:13px;color:var(--ink2);line-height:1.45">You have ${today} plates for about ${guests} guests. Unless your ads bring a crowd, the extra goes bad overnight.</span>`
    : `<span style="font-size:13px;font-weight:600">How much do you need?</span><span style="font-size:13px;color:var(--ink2);line-height:1.45">About ${guests} regulars are coming and you have ${plural(tables, 'table')} free. About ${need} plates covers them. Buy a few more if your ads will bring extra guests.</span><span class="hint">Food you don't use tonight goes bad overnight.</span>`;
  const legend = S.round >= CFG.rounds
    ? `<div class="legend" style="grid-template-columns:1fr"><div>${tbox('exp')}<span><b>Last day: only Express food · $${M.exp.price}</b><span>It all arrives in time for tonight.</span></span></div></div>`
    : `<div class="legend"><div><span class="tbox exp">${ART.icon('bolt', 18)}</span><span><b>Express · $${M.exp.price}</b><span>Always arrives in time for tonight</span></span></div>
        <div><span class="tbox reg">${ART.icon('box', 18)}</span><span><b>Regular · $${M.reg.price}</b><span>${S.round === CFG.rounds - 1 ? "Half the time it arrives tomorrow, the last day" : 'Half the time it arrives tomorrow morning instead'}</span></span></div></div>`;
  return `<div class="game">
    <section class="panel lift" aria-label="The market shelf">
      ${titleHTML('Market', `You and ${esc(nameOf(o))} shop at the same time. Whoever clicks an item first gets it.`,
        `<div class="timer" role="timer">${ring(t0, t1)}<span class="t"><b data-count="${t1}">${Math.max(0, Math.ceil(left / 1000))}s</b><span>until the market closes</span></span></div>`)}
      ${legend}${strip}
      <div class="shelf">${items.map((t, i) => slot(t, i)).join('')}</div>
      <p class="hint">After each buy you wait while it's delivered: ${M.exp.cd} seconds for Express, ${M.reg.cd} for Regular.${S.round < CFG.rounds ? ' You find out when a Regular will arrive once its delivery finishes.' : ''}</p>
    </section>
    <aside class="stack">
      <section class="panel"><div class="row" style="gap:8px"><span class="dot you"></span><h2>Your food for tonight</h2></div>
        <div class="row" style="gap:10px;align-items:baseline"><span class="big">${today}</span><span class="muted">${today === 1 ? 'plate' : 'plates'}</span></div>
        <div class="lines">${p.ingr ? `<div><span>Already in your kitchen</span><b>${p.ingr}</b></div>` : '<div><span class="muted">Your kitchen is empty. Everything you serve tonight comes from here.</span></div>'}
          ${bought ? `<div><span>Bought just now, arriving tonight</span><b>${today - p.ingr}</b></div>` : ''}${onway ? `<div class="muted"><span>Still on its way</span><b>${onway}</b></div>` : ''}${later ? `<div class="muted"><span>Arriving tomorrow morning</span><b>${later}</b></div>` : ''}</div>
        <div class="tile" style="gap:4px;padding:12px 14px">${advice}</div></section>
      <section class="panel" style="grid-template-columns:1fr auto;align-items:center"><span style="display:grid"><span class="hint">Cash left</span><span class="num" style="font-size:24px">${usd(cash)}</span></span>
        <span class="hint" style="text-align:right">Spent ${usd(p.cash - cash)} here.<br>Keep some for ads next.</span></section>
      <section class="panel" style="grid-template-columns:auto 1fr auto;align-items:center"><span class="dot rival"></span><span style="font-size:13px;color:var(--ink2)"><b style="color:var(--ink)">${esc(nameOf(o))}</b> has grabbed ${plural(theirs.length, 'item')}</span><span class="hint">${S.submitted[o] ? 'done' : 'still shopping'}</span></section>
      ${done ? waitCard(o, `They can keep shopping for <span data-count="${t1}">${Math.max(0, Math.ceil(left / 1000))}s</span> more. You bought ${plural(mine.length, 'food')} for ${usd(p.cash - cash)}.`)
        : `<button class="cta outline" data-act="mkdone">I'm done shopping<small>Whatever's left stays on the shelf for ${esc(nameOf(o))}</small></button>`}
    </aside></div>`;
}

// ---------- ads ----------
// Plain-language card text (same numbers as CFG.ads). Card wording is the team's: review it with them.
function adText(id) {
  const A = CFG.ads[id], pct = x => `${Math.round(x * 100)}%`;
  switch (id) {
    case 'delivery': return [`${A.n} delivery orders. They need food, but no table.`, 'Always works'];
    case 'lunch': return [`${A.n} guests for sure, but each pays $${A.off} less.`, 'Always works'];
    case 'subway': return [`${A.n} extra guests.`, `${pct(A.lowChance)} of the time it gets lost in the crowd and only ${A.low} come`];
    case 'stall': return [`${A.n} extra guest, plus a free plate of food.`, 'Always works'];
    case 'bus': return [`A tour bus might stop at your door with ${A.n} hungry guests.`, `${pct(A.chance)} chance · if no bus comes, you still pay`];
    case 'wom': return [S_last() ? `${A.n} extra guest tonight. It's the last day, so that's all.` : `${A.n} extra guest tonight, and ${A.n} more every day after.`, 'Always works'];
    case 'flyer': return [`${A.n} extra guests come tonight.`, 'Always works'];
    case 'blogger': return [`A food blogger might come with ${A.n} guests. If you then turn nobody away, you might get a star.`, `${pct(A.chance)} chance they come · ${pct(A.star)} chance of the star`];
    case 'coupon': return [`${A.n} extra guests come, but each one pays $${A.off} less.`, 'Always works'];
    case 'fake': return ['Does nothing. Your rival only sees that a card was played on them.', "It's a bluff"];
    case 'review': return [`Your rival gets ${A.n} fewer guests tonight.`, 'Always works'];
    case 'poach': return [`${A.n} of your rival's guests comes to you instead.`, 'Always works'];
    case 'swamp': return [`Send your rival ${A.n} extra guests. Anyone they can't seat leaves unhappy and costs them stars.`, `Risky: if they have room, you've given them ${A.n} customers`];
    case 'fakebook': return [`${A.tables} of your rival's tables are held tonight for a party that never comes.`, 'Always works'];
    case 'corner': return [`Your rival's emergency food costs $${A.extra} more tonight.`, 'Only hurts if they need to rush food'];
  }
  return [A.desc, ''];
}
const S_last = () => app.S && app.S.round >= CFG.rounds;
function adsHTML(s) {
  const S = app.S, p = S.players[s], o = other(s), k = S.waiting[s];
  if (!k) {
    const mine = myCards(s), n = mine ? mine.self.length + mine.rival.length : 0, tricks = mine && mine.rival.length;
    const g = S.got[o];
    return `<div class="game"><section class="panel lift">${titleHTML('Ads', 'Your cards stay secret until service starts.')}
      <div class="callout"><span><b>${n ? (tricks ? 'Your Tricks are hidden' : 'Your cards are placed') : 'No ads today'}</b>${n ? `${plural(n, 'card')} placed face down. You can't change them now.` : 'You chose not to buy any cards today.'}</span></div></section>
      <aside class="stack">${waitCard(o, 'Service starts as soon as they place theirs.')}${S.submitted[o] && g ? `<section class="panel">x</section>` : ''}</aside></div>`.replace('<section class="panel">x</section>', '');
  }
  const f = F({ sel: [] }), sh = S.shops[s], A = CFG.ads;
  const cost = f.sel.reduce((a, id) => a + A[id].price, 0), left = p.cash - cost;
  const card = (id, side) => {
    const on = f.sel.includes(id), a = A[id], [d, odds] = adText(id), afford = on || a.price <= left;
    const loc = a.loc ? `<span class="tg">${a.loc === 'city' ? 'City only' : 'Countryside only'}</span>` : '<span></span>';
    if (!afford) return `<div class="ad poor ${side}"><span class="top"><span></span><b>$${a.price}</b></span><span class="nm">${esc(a.name)}</span><span class="d">${d}</span><span class="odds">$${a.price} · you have ${usd(left)} left</span></div>`;
    return `<button type="button" class="ad ${side} ${on ? 'on' : ''}" data-act="ad" data-id="${id}" aria-pressed="${on}"><span class="top">${on ? `<span class="tg ch">${ART.icon('check', 11)} Chosen</span>` : loc}<b>$${a.price}</b></span>
      <span class="nm">${esc(a.name)}</span><span class="d">${d}</span><span class="odds">${odds}</span></button>`;
  };
  const self = f.sel.filter(id => A[id].side === 'self'), rival = f.sel.filter(id => A[id].side === 'rival');
  const E = expectedDemand(p, self), poach = rival.includes('poach') ? A.poach.n : 0;
  const gMin = Math.max(0, E.min) + poach, gMax = E.max + poach, tables = Math.max(0, p.tables - p.held), food = p.ingr, deliv = self.includes('delivery') ? A.delivery.n : 0;
  const seat = Math.min(tables + deliv, food), canAll = gMax <= seat;
  const short = food < Math.min(gMax, tables + deliv) ? 'food' : 'tables';
  const verdict = canAll ? `<b style="font-size:14px">You can serve every guest</b><span style="font-size:13px;color:var(--ink2);line-height:1.45">${seat > gMax + 2 ? `You'll have ${seat - gMax} seats and plates to spare. Spare food goes bad overnight.` : 'Your tables and food cover everyone.'}</span>`
    : `<b style="font-size:14px">You can serve ${seat} of ${gMin === gMax ? gMax : `up to ${gMax}`} guests</b><span style="font-size:13px;color:var(--ink2);line-height:1.45">${short === 'food'
      ? `You're short on food. During service you can rush in food for $${CFG.service.rush[0]}–${CFG.service.rush[1]}, or those guests leave unhappy.`
      : `You're short on tables. During service you can borrow some from next door for $${CFG.service.borrow[0]}–${CFG.service.borrow[1]}, or those guests leave unhappy and cost you stars.`}${gMax - seat >= 4 ? ' Fewer ads might earn you more.' : ''}</span>`;
  const g = S.submitted[o] && S.got[o];
  const label = f.sel.length ? (rival.length ? 'Hide my Tricks' : 'Hide my cards') : 'Skip ads today';
  return `<div class="game">
    <section class="panel lift" aria-label="Today's ad cards" style="gap:18px">
      ${titleHTML('Ads', `Buy cards that bring guests to you, or that make trouble for ${esc(nameOf(o))}. Your cards stay secret until service starts, and you only pay when they're revealed.`)}
      <div class="adrow"><div class="hd"><span class="dot you"></span><h2>For your restaurant</h2><span>bring more guests to you</span></div><div class="ads">${sh.self.map(id => card(id, 'self')).join('')}</div></div>
      <div class="adrow"><div class="hd"><span class="dot rival"></span><h2>Against ${esc(nameOf(o))}</h2><span>make their night harder</span></div><div class="ads">${sh.rival.map(id => card(id, 'rival')).join('')}</div></div>
      <p class="hint">Every card can be bought once. You get a new set of cards each day.</p>
    </section>
    <aside class="stack">
      <section class="panel"><h2>Tonight, with the cards you chose</h2>
        <div class="tiles"><div class="tile"><span class="k">Guests</span><span class="v">${gMin === gMax ? gMax : `${gMin}–${gMax}`}</span><span class="s">${CFG.baseDemand + p.wom} regulars${gMax - (CFG.baseDemand + p.wom) ? ` ${gMax > CFG.baseDemand + p.wom ? '+' : '−'} ${Math.abs(gMax - (CFG.baseDemand + p.wom))}` : ''}</span></div>
          <div class="tile ${!canAll && short === 'tables' ? 'bad' : ''}"><span class="k">Tables</span><span class="v">${tables}</span><span class="s">free tonight</span></div>
          <div class="tile ${!canAll && short === 'food' ? 'bad' : ''}"><span class="k">Food</span><span class="v">${food}</span><span class="s">plates</span></div></div>
        <div class="tile" style="gap:4px;padding:12px 14px">${verdict}</div>
        <span class="hint">Not counted: tricks ${esc(nameOf(o))} might play on you. You'll see those when service starts.</span></section>
      <section class="panel"><div class="lines"><div><span class="muted">${plural(f.sel.length, 'card')}</span><b>${usd(cost)}</b></div><div><span class="muted">Cash after they're revealed</span><b>${usd(left)}</b></div></div></section>
      <section class="panel" style="grid-template-columns:auto 1fr;align-items:center"><span class="dot rival"></span><span style="font-size:13px;color:var(--ink2)">${g ? `<b style="color:var(--ink)">${esc(nameOf(o))} placed ${plural(g.nSelf + g.nRival, 'card')}:</b> ${g.nSelf} on their restaurant, ${g.nRival} on yours. It might be a bluff.` : `<b style="color:var(--ink)">${esc(nameOf(o))}</b> is choosing cards`}</span></section>
      <button class="cta" data-act="commit">${label}<small>${esc(nameOf(o))} only sees how many, not which</small></button>
    </aside></div>`;
}

// ---------- service ----------
const SRC = { regulars: 'regulars', 'wom-old': 'word-of-mouth regulars', poached: 'guest you poached', flyer: 'Flyers guests', wom: 'word-of-mouth guests',
  swamp: `guests sent by your rival`, coupon: 'coupon guests', lunch: 'office lunch guests', delivery: 'delivery orders', subway: 'subway poster guests', bus: 'tour bus guests', blogger: "food blogger's guests", stall: 'market stall guests' };
const srcName = (src, s) => (src === 'swamp' ? `guests sent by ${nameOf(other(s))}` : SRC[src] || src);
function svcFloor(s, v, shown, P) {
  const S = app.S, p = S.players[s], sc = S.script[s];
  const last = shown[shown.length - 1], first = v.out[0] ? v.out[0].snap : v;
  const cur = P ? v : last ? last.snap : first;
  const fight = shown.find(x => x.k === 'fight');
  const held = Math.min(p.held, p.tables), fake = Math.min(sc.fakeHeld, p.tables - held), lost = fight ? Math.min(fight.tables, p.tables - held - fake) : 0;
  const ownUse = Math.max(0, p.tables - held - fake - lost), borrowedN = Math.max(0, cur.tables - ownUse);
  const seated = cur.usedT, ownSeat = Math.min(seated, ownUse), bSeat = Math.max(0, seated - ownSeat);
  const own = [...Array(ownSeat).fill('seat'), ...Array(ownUse - ownSeat).fill('free'), ...Array(held).fill('reserved'), ...Array(fake).fill('fake'), ...Array(lost).fill('broken')];
  const sv = svcState(s), busy = P && P.kind === 'short' && sv.busy;
  const borrowed = [...Array(bSeat).fill('bseat'), ...Array(Math.max(0, borrowedN - bSeat)).fill('bfree'), ...(busy && sv.busy.a === 'borrow' ? ['arriving'] : [])];
  return ART.floor({ own, borrowed, food: cur.ingr, incoming: busy && sv.busy.a === 'rush', deliv: cur.deliv || 0, queue: P && P.kind === 'short' ? P.need : 0,
    away: cur.turned, asker: P && P.kind === 'food', roomLabel: `DINING ROOM · YOUR ${p.tables} ${p.tables === 1 ? 'TABLE' : 'TABLES'}`,
    aria: `Your restaurant: ${seated} guests eating, ${cur.ingr} food left, ${cur.turned} left unhappy` });
}
// A card result in plain words (from the step the engine recorded)
function adResult(x) {
  const A = CFG.ads[x.id];
  switch (x.id) {
    case 'bus': return x.n ? `The bus came! ${x.n} guests.` : `No bus today, so that $${A.price} was wasted.`;
    case 'blogger': return x.n ? `The blogger came with ${x.n} guests. Turn nobody away for a chance at a star.` : 'The blogger didn\'t come.';
    case 'subway': return x.n < A.n ? `It got lost in the crowd: only ${x.n} guests came.` : `${x.n} guests came.`;
    case 'stall': return `${plural(x.n, 'guest')} came, plus ${plural(x.food, 'free plate')} of food.`;
    case 'wom': return `${plural(x.n, 'guest')} came, and ${A.n} more will come every day after.`;
    case 'delivery': return `${x.n} delivery orders. They need food, but no table.`;
    case 'coupon': case 'lunch': return `${x.n} guests came, each paying $${A.off} less.`;
    default: return `${plural(x.n, 'guest')} came.`;
  }
}
function trickResult(x, s) {
  const A = CFG.ads[x.id];
  switch (x.id) {
    case 'review': return [`Kept ${A.n} of your guests away with a bad review`, 'card: Bad review'];
    case 'poach': return [`Took ${plural(A.n, 'guest')} of yours`, 'card: Poach a guest'];
    case 'swamp': return [`Sent you ${A.n} extra guests to overload you`, 'card: Swamp them'];
    case 'fakebook': return [`Booked ${A.tables} of your tables for a party that won't come`, 'Those tables sit empty tonight · card: Fake booking'];
    case 'corner': return [`Made your emergency food cost $${A.extra} more`, 'Only matters if you rush food tonight · card: Corner the rush supplier'];
    case 'fake': return ['Played a card on you that did nothing', "It was a bluff · card: False advertisement"];
  }
  return [A.name, ''];
}
function logLine(st, s) {
  const o = nameOf(other(s));
  switch (st.k) {
    case 'arrive': return st.away ? `${st.n} ${srcName(st.src, s)} came. ${st.seated ? `${st.seated} got a table, ` : ''}${st.away} left unhappy.` : `${st.n} ${srcName(st.src, s)} came and got a table.`;
    case 'event': return st.ev === 'weather' ? `A storm flooded the road: ${st.n} fewer regulars tonight.` : `A protest is blocking the street: ${st.n} fewer regulars tonight.`;
    case 'short': return st.villagers ? `Villagers brought ${st.villagers} food for free.` : st.n ? `You got ${plural(st.n, 'extra table or food', 'extra tables or food')} in time.` : null;
    case 'food': return st.give ? 'You gave free food to someone in need.' : 'You said no to someone asking for food.';
    case 'fight': return `A fight broke out: ${plural(st.tables, 'table')} broken for good, ${st.food} food ruined.`;
    case 'propose': return st.ok ? `Someone proposed at a table. Yes! +$${st.tip} tip.` : 'Someone proposed at a table… awkward.';
    case 'booking': return `The booked party came and paid $${st.pay}.`;
    case 'noshow': return st.arrive ? (st.choice === 'hold' ? 'The booked party is on its way.' : 'The booked party came, but you had given their tables away.') : 'The booked party didn\'t show up.';
    case 'inspect': return st.caught ? `The health inspector caught your shady deal: −$${CFG.shady.fine}.` : 'A health inspector came by: all clear.';
    case 'close': return `Closing time: ${st.served} served, ${st.turned} left unhappy.`;
  }
  return null;
}
function serviceHTML(s) {
  const S = app.S, C = CFG.service, sv = svcState(s), o = other(s), p = S.players[s], now = Date.now();
  const right = (shown) => {
    const cards = shown.filter(x => x.k === 'card'), selfC = cards.filter(x => x.from === 'self'), rivC = cards.filter(x => x.from === 'rival');
    const poached = shown.find(x => x.k === 'poached'), rv = S.reveals[s];
    const paid = rv ? rv.self.reduce((a, id) => a + CFG.ads[id].price, 0) : 0, brought = selfC.reduce((a, x) => a + Math.max(0, x.n), 0) + (poached ? poached.n : 0);
    const ads = selfC.length || poached ? `<section class="panel"><div class="row" style="gap:8px"><span class="dot you"></span><h2>What your ads got you</h2></div><span class="sub" style="margin-top:-6px">The ads you bought this morning, and how many guests each one brought.</span>
      <div>${selfC.map(x => `<div class="cardline"><div class="r"><b>${esc(CFG.ads[x.id].name)}</b><span class="muted2">paid $${CFG.ads[x.id].price}</span></div><span class="d">${adResult(x)}</span></div>`).join('')}
      ${poached ? `<div class="cardline"><div class="r"><b>Poach a guest</b></div><span class="d">${plural(poached.n, 'guest')} from ${esc(nameOf(o))} came to you instead.</span></div>` : ''}</div>
      ${rv && rv.ok === false ? '<span class="hint">Your ad cards couldn\'t be found on this device, so they did nothing and cost nothing.</span>' : `<div class="lines"><div class="tot" style="font-size:13px"><span class="muted">Total so far</span><b>${usd(paid)} for ${plural(brought, 'guest')}</b></div></div>`}</section>` : '';
    const tricks = rivC.length ? `<section class="panel"><div class="row" style="gap:8px"><span class="dot rival"></span><h2>${esc(nameOf(o))}'s sabotage</h2></div><span class="sub" style="margin-top:-6px">Your rival paid for these cards to make your night harder.</span>
      <div>${rivC.map(x => { const [a, b] = trickResult(x, s); return `<div class="cardline"><span class="lead">${a}</span><span class="sm">${b}</span></div>`; }).join('')}</div></section>` : '';
    const lines = shown.map(x => logLine(x, s)).filter(Boolean).reverse();
    const log = `<section class="panel"><h2>Tonight so far</h2><ol class="log">${lines.length ? lines.slice(0, 6).map((t, i) => `<li class="${i === 0 ? 'now' : ''}"><span class="w">${i === 0 ? 'NOW' : i === lines.length - 1 ? 'START' : ''}</span>${esc(t)}</li>`).join('') : '<li><span class="w"></span>Opening up…</li>'}</ol></section>`;
    return ads + tricks + log;
  };
  const tally = (v, shown) => {
    let came = 0, seated = 0, away = 0;
    for (const st of shown) if (st.k === 'arrive') { came += st.n; seated += st.seated; away += st.away; }
    const risk = away === 0 ? '' : away <= 3 ? ' (−1 ★ so far)' : ' (−2 ★ so far)';
    return `<span>Came <b>${came}</b></span><span>Seated <b>${seated}</b></span><span class="${away ? 'bad' : ''}">Left unhappy <b>${away}</b>${risk}</span>`;
  };
  const head = (v, shown, extra = '') => titleHTML('Service', 'Guests arrive in groups. Each guest needs 1 table and 1 food.', `<div class="tally">${tally(v, shown)}${extra}</div>`);
  if (!S.waiting[s]) {
    const v = serviceRun(S, s, (S.got[s] && S.got[s].ops) || sv.ops);
    return statusHTML(s, { cash: v.cash, food: v.ingr }) + `<div class="game"><section class="panel lift">${head(v, v.out)}${svcFloor(s, v, v.out, null)}${keyHTML()}</section><aside class="stack">${waitCard(o, 'Your doors are closed for the night. The recap opens when they finish serving.')}${right(v.out)}</aside></div>`;
  }
  if (!sv.started) {
    const v0 = serviceRun(S, s, [], 0), E = expectedDemand(p, (myCards(s) || {}).self || []);
    const t = Math.max(0, p.tables - p.held), fd = p.ingr;
    return statusHTML(s, { food: v0.out[0] ? v0.out[0].snap.ingr : v0.ingr }) + `<div class="game"><section class="panel lift">${head(v0, [])}${svcFloor(s, v0, [], null)}${keyHTML()}
      <div class="decide"><div class="q"><span><b>Ready to open?</b><span>About ${E.min === E.max ? E.min : `${Math.max(0, E.min)} to ${E.max}`} guests are expected. You can seat ${Math.min(t, fd)}: ${plural(t, 'table')}, ${plural(fd, 'plate')} of food.</span></span></div>
      <button class="cta inline" data-act="play">Open the doors →</button></div></section><aside class="stack">${right([])}</aside></div>`;
  }
  const v = serviceRun(S, s, sv.ops, sv.closed), shown = v.out.slice(0, sv.idx), P = sv.idx >= v.out.length ? v.pending : null;
  let panel = '';
  if (P && P.kind === 'food') {
    const who = p.loc === 'city' ? 'A homeless man' : 'A villager';
    panel = `<div class="decide"><div class="q"><span><b>${who} asks for something to eat</b><span>Giving uses 1 food. Saying no might get around.</span></span></div>
      <div class="acts">${v.ingr >= 1 ? `<button class="ink-btn" data-act="svc" data-a="give"><span>Give 1 food</span></button>` : '<span class="hint">No food left to give.</span>'}<button class="line-btn" data-act="svc" data-a="refuse"><span>Say no</span></button></div></div>`;
  } else if (P && P.kind === 'short') {
    if (!sv.waitAt) sv.waitAt = now;
    const b = sv.busy, pr = a => opPrice(S, s, P.ep, P.tries, a), triesLeft = P.maxOps - P.tries;
    const food = P.shortOn.includes('ingr'), tabs = P.shortOn.includes('tables');
    const why = food && tabs ? "You're short on food and tables." : food ? "Every guest needs food, and you don't have enough." : 'Every table is taken, but you have enough food.';
    const room = P.can ? `Room for ${P.can}.` : 'Room for none.';
    const act = (a, label, sub, keyName) => {
      const price = pr(a);
      if (v.cash < price) return `<span class="hint">${label} costs $${price}. You have ${usd(v.cash)}.</span>`;
      return `<button class="ink-btn" data-act="svc" data-a="${a}"><span>${label}<small>${sub}</small></span><b>$${price}</b><kbd>${keyName}</kbd></button>`;
    };
    const acts = b ? '' : [food ? act('rush', 'Rush food', `+1 in ${C.opTime}s${S.script[s].cornered ? ` · +$${CFG.ads.corner.extra}, sabotaged` : ''}`, 'R') : '',
      tabs ? act('borrow', 'Borrow a table', `takes ${C.opTime}s · they may say no`, 'B') : ''].join('');
    panel = `<div class="decide ${triesLeft <= 1 ? 'hot' : ''}" role="alertdialog" aria-label="Guests waiting"><div class="q"><span class="ringw">${ring(sv.waitAt, sv.waitAt + C.patience * 1000, 'ink')}<b data-count="${sv.waitAt + C.patience * 1000}"></b></span>
        <span><b>${P.need} ${esc(srcName(P.group.src, s))} at the door</b><span>${room} ${why} ${b ? '' : `You can try ${plural(triesLeft, 'more time')}.`}</span>
        ${b ? `<span class="toastline">${b.a === 'rush' ? 'Food on its way…' : 'Asking next door…'}</span>${pbar(b.start, b.until)}` : sv.msg ? `<span class="toastline">${esc(sv.msg)}</span>` : ''}${P.villagers ? `<span class="toastline">Villagers brought ${P.villagers} food for free!</span>` : ''}</span></div>
      <div class="acts">${acts}<button class="line-btn" data-act="svc" data-a="letgo"><span>Let them go<small>they leave unhappy</small></span><kbd>Esc</kbd></button></div></div>`;
  }
  const finished = sv.idx >= v.out.length && !v.pending;
  if (finished) {
    panel = `<div class="decide"><div class="q"><span><b>Closing time</b><span>Seated ${v.served} · left unhappy ${v.turned} · empty tables ${v.empty || 0} · food left ${v.ingr}${v.ingr ? ' (leftovers go bad tonight)' : ''}${v.tables && v.empty > v.tables * CFG.emptyTables.share ? '. More than half your tables are empty, which might cost a star.' : ''}</span></span></div>
      <button class="cta inline" data-act="svcdone">Close for the day</button></div>`;
  } else if (!P) {
    const lastSt = shown[shown.length - 1], line = lastSt && logLine(lastSt, s);
    panel = `<div class="banner" role="status">${line ? esc(line) : 'Opening up…'}</div>`;
  }
  const ff = finished ? '' : `<button class="btn" data-act="fast">${ART.icon('ff', 12)} ${sv.fast ? 'Normal speed' : 'Fast-forward'}</button>`;
  const lastSnap = P ? v : (shown.length ? shown[shown.length - 1].snap : (v.out[0] ? v.out[0].snap : v));
  return statusHTML(s, { cash: v.cash, food: lastSnap.ingr }) + `<div class="game"><section class="panel lift">${head(v, shown, ff)}${svcFloor(s, v, shown, P)}${keyHTML()}${panel}</section><aside class="stack">${right(shown)}</aside></div>`;
}

// ---------- sorry vouchers ----------
function voucherHTML(s) {
  const S = app.S, v = S.service[s], p = S.players[s], k = S.waiting[s], o = other(s);
  if (!k) {
    const note = v.turned > 0 && !S.submitted[s] && p.cash < CFG.voucher ? `You turned away ${plural(v.turned, 'guest')}, but don't have $${CFG.voucher} for a voucher.` : '';
    return `<div class="game"><section class="panel lift">${titleHTML('Say sorry?', '')}<span class="sub">${note || 'Done. The recap is next.'}</span></section><aside class="stack">${waitCard(o)}</aside></div>`;
  }
  const f = F({ n: 0 }), max = Math.min(v.turned, Math.floor(p.cash / CFG.voucher));
  const res = n => { const u = v.turned - n; return u === 0 ? 'no star lost' : u <= 3 ? 'lose 1 ★' : 'lose 2 ★'; };
  const boxes = Array.from({ length: Math.min(v.turned, 8) + 1 }, (_, n) => n).filter(n => n <= max || n === 0);
  return `<div class="game" style="grid-template-columns:minmax(0,640px);justify-content:center"><section class="panel lift" style="gap:16px;padding:24px">
    <h1 style="font-size:22px">${plural(v.turned, 'guest')} left unhappy tonight</h1>
    <span style="font-size:14px;color:var(--ink2);line-height:1.5">You can send each one a $${CFG.voucher} voucher to say sorry. Guests who get one don't count against your stars.</span>
    <div class="tile" style="grid-template-columns:1fr auto;align-items:center;padding:14px 16px"><b>Vouchers to send</b>
      <div class="stepper" role="group" aria-label="Vouchers">${f.n > 0 ? `<button type="button" data-act="inc" data-f="n" data-d="-1" aria-label="One fewer">−</button>` : '<span class="off" aria-hidden="true">−</span>'}<output>${f.n}</output>${f.n < max ? `<button type="button" data-act="inc" data-f="n" data-d="1" aria-label="One more">+</button>` : '<span class="off" aria-hidden="true">+</span>'}</div></div>
    <div style="display:grid;grid-template-columns:repeat(${boxes.length},minmax(0,1fr));gap:6px;font-size:12px;text-align:center">${boxes.map(n => `<span style="padding:8px 4px;border-radius:10px;${n === f.n ? 'box-shadow:0 0 0 2px var(--ink);background:var(--surface)' : res(n) === 'no star lost' ? 'background:var(--sunk)' : 'background:var(--bad-soft);color:var(--bad-text)'}"><b style="display:block;font-size:14px">${n}</b>${res(n)}</span>`).join('')}</div>
    ${max < v.turned ? `<span class="hint">You can afford ${plural(max, 'voucher')}.</span>` : ''}
    <button class="cta" data-act="voucher">${f.n ? `Send ${plural(f.n, 'voucher')} (${usd(f.n * CFG.voucher)}) and see the recap` : 'No vouchers, see the recap'}</button></section></div>`;
}

// ---------- recap ----------
const WHY = { 'served everyone +1': 'Every guest who came got a table.', 'reservation had no seat −1': 'The booked party came, but you had given their tables away.',
  'inspector −1': 'The health inspector caught your shady deal.', 'kindness paid off +1': 'Word got out that you shared food with someone in need.',
  'word got out you said no −1': 'Word got out that you said no to someone in need.', 'blogger loved it +1': 'The food blogger loved it.' };
const whyText = w => WHY[w] || (/^turned away (\d+)/.test(w) ? `${w.match(/^turned away (\d+)/)[1]} guests left without a table.` : /empty tables/.test(w) ? 'More than half your tables were empty at closing.' : w);
function tipFor(s) {
  const S = app.S, v = S.service[s], h = S.players[s].history.slice(-1)[0], L = CFG.loc[S.players[s].loc];
  if (v.turned > 0 && v.empty > 0) return [`${plural(v.turned, 'guest')} left because you ran out of food.`, `A Regular at the Market is $${CFG.market.reg.price}. Buying ahead is cheaper than losing stars.`];
  if (v.turned > 0) return [`${plural(v.turned, 'guest')} had nowhere to sit.`, `Tables are $${CFG.tableCost} and you keep them for the rest of the game.`];
  if (v.rush.n) return [`You were ${plural(v.rush.n, 'plate')} short and had to rush ${v.rush.n === 1 ? 'it' : 'them'} for ${usd(v.rush.cost)}.`, `One more Regular at the Market costs $${CFG.market.reg.price}. Buying ahead is cheaper than rushing.`];
  if (h.spoiled > 1) return [`${plural(h.spoiled, 'plate')} went to waste.`, 'Buy a little less food tomorrow, or bring in more guests with an ad.'];
  if (v.tables && v.empty > v.tables * CFG.emptyTables.share) return [`${v.empty} of ${v.tables} tables sat empty.`, 'An ad could fill them, or buy fewer tables next time.'];
  const flop = (S.script[s].info || []).find(x => x.k === 'card' && x.from === 'self' && (x.id === 'bus' || x.id === 'blogger') && !x.n);
  if (flop) return [`The ${CFG.ads[flop.id].name.toLowerCase()} didn't pay off.`, 'Chance cards are a gamble. Sure things like Flyers are steadier.'];
  return ['A perfect night!', `Nothing wasted, nobody turned away. Every guest paid $${L.price}. Do it again!`];
}
const gstar = (cls) => `<svg class="gstar ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>`;
const confetti = '<svg class="confetti" viewBox="0 0 700 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="560" y="34" width="10" height="4" rx="2" fill="#FFD21F" transform="rotate(30 565 36)"/><rect x="610" y="80" width="12" height="4" rx="2" fill="#E8392B" transform="rotate(-20 616 82)"/><rect x="520" y="110" width="8" height="4" rx="2" fill="#fff" opacity=".6" transform="rotate(60 524 112)"/><circle cx="650" cy="44" r="3" fill="#FFD21F"/><circle cx="590" cy="150" r="2.5" fill="#E8392B"/><rect x="660" y="140" width="10" height="4" rx="2" fill="#FFD21F" transform="rotate(-50 665 142)"/><circle cx="480" cy="40" r="2" fill="#fff" opacity=".6"/><rect x="630" y="210" width="9" height="4" rx="2" fill="#fff" opacity=".5" transform="rotate(15 634 212)"/><circle cx="545" cy="230" r="3" fill="#FFD21F"/></svg>';
function recapHTML(s) {
  const S = app.S, p = S.players[s], o = other(s), q = S.players[o], v = S.service[s], rv = S.service[o], k = S.waiting[s];
  const h = p.history.slice(-1)[0], profit = round2(h.income + h.spend), last = S.round >= CFG.rounds;
  const best = p.history.length > 1 && p.history.every(x => round2(x.income + x.spend) <= profit);
  const d = v.starsAfter - v.starsBefore;
  const gs = [1, 2, 3, 4, 5].map(i => gstar(i <= v.starsAfter ? (d > 0 && i > v.starsBefore ? 'on new' : 'on') : d < 0 && i <= v.starsBefore ? 'lost' : '')).join('');
  const starHead = d > 0 ? `+${plural(d, 'star')}! You're at ${v.starsAfter} now` : d < 0 ? `−${plural(-d, 'star')}. You're at ${v.starsAfter} now` : `Still ${plural(v.starsAfter, 'star')}`;
  const whys = (v.why || []).map(whyText);
  const capped = (v.why || []).length > 1 && Math.abs(d) === 2 ? ' Stars can\'t change by more than 2 in one night.' : '';
  const me = score(s), them = score(o), max = Math.max(me, them, 1), gap = round2(Math.abs(me - them));
  const daysLeft = CFG.rounds - S.round;
  const prevGap = p.history.length > 1 ? (p.history[p.history.length - 2].cash + p.history[p.history.length - 2].stars * CFG.starValue) - (q.history[q.history.length - 2].cash + q.history[q.history.length - 2].stars * CFG.starValue) : null;
  let verdict;
  if (me === them) verdict = ['Dead even!', last ? 'Tied on score.' : 'Tomorrow could decide it.'];
  else if (me > them) verdict = [last ? `You finished ${usd(gap)} ahead` : `You're ${usd(gap)} ahead`, last ? 'See who won.' : `Keep it up for ${plural(daysLeft, 'more day')}.`];
  else verdict = [last ? `You finished ${usd(gap)} behind` : `${gap <= 15 ? 'Just ' : ''}${usd(gap)} behind, with ${plural(daysLeft, 'day')} to go`, gap < CFG.starValue ? 'One more star would put you ahead.' : 'A good night tomorrow can close it.'];
  if (prevGap !== null && !last) { const now = me - them, ch = round2(now - prevGap); if (ch > 0) verdict[1] = `You closed the gap by ${usd(ch)} tonight. ` + verdict[1]; }
  const lane = (who, n, cls, name, detail) => `<div class="lane"><div class="t"><span class="inl"><span class="dot ${cls}"></span><b>${name}</b></span><span><b class="n">${n}</b> <span class="hint">${detail}</span></span></div><span class="tr"><i style="width:${Math.max(4, n / max * 100)}%;background:var(--${cls})"></i></span></div>`;
  const ledger = p.ledger.filter(x => x.amt !== null && x.amt !== 0);
  const ins = ledger.filter(x => x.amt > 0).sort((a, b) => b.amt - a.amt), outs = ledger.filter(x => x.amt < 0).sort((a, b) => a.amt - b.amt);
  const [tipA, tipB] = tipFor(s);
  const tomorrowFood = p.pending ? `<span class="hint" style="padding-top:6px;border-top:1px solid var(--line2)">Arriving tomorrow morning: ${plural(p.pending, 'plate')} from today's Regular order${p.pending === 1 ? '' : 's'}.</span>` : '';
  const rd = rv.starsAfter - rv.starsBefore;
  const btn = k ? `<button class="cta" data-act="next">${last ? 'See who won →' : `Start day ${S.round + 1} →`}</button>` : waitCard(o, `Waiting for ${esc(nameOf(o))} to finish their recap…`);
  return `<div class="recap-top">
    <section class="hero">${profit > 0 ? confetti : ''}<span class="eyebrow">Day ${S.round} is done</span>
      <div class="money">${profit > 0 ? `<span>You made a profit of</span>${gold(`+$${profit}`)}<span>tonight.${best ? ' Your best day so far.' : ''}</span>`
        : profit === 0 ? `<span>You broke even</span><span class="loss">$0</span><span>tonight. See the tip below.</span>`
        : `<span>Tonight you lost</span><span class="loss">${usd(profit)}</span><span>A tough night. See the tip below.</span>`}</div>
      <div class="starbox"><span class="gstars" role="img" aria-label="Stars went from ${v.starsBefore} to ${v.starsAfter}">${gs}</span><span><b>${starHead}</b><span>${whys.length ? esc(whys.join(' ')) : 'Nothing changed your rating tonight.'}${capped}</span></span></div>
    </section>
    <section class="race"><div class="hd"><h2>The race</h2><span>score = cash + $${CFG.starValue} per star</span></div>
      ${[[o, them, 'rival', esc(nameOf(o)), `${usd(q.cash)} + ${q.stars} ★`], [s, me, 'you', app.mode === 'online' ? 'You' : esc(nameOf(s)), `${usd(p.cash)} + ${p.stars} ★`]].sort((a, b) => b[1] - a[1]).map(x => lane(...x)).join('')}
      <div class="verdict"><b>${verdict[0]}</b><span>${verdict[1]}</span></div></section>
  </div>
  <div class="recap-bot">
    <section class="panel"><h2>Where your money went</h2><div class="lines">
      ${ins.map(x => `<div><span>${esc(x.label)}</span><b class="pos">+${usd(x.amt)}</b></div>`).join('')}${outs.map(x => `<div><span class="muted">${esc(x.label)}</span><span>${usd(x.amt)}</span></div>`).join('')}
      <div class="tot"><span>${profit >= 0 ? 'Profit tonight' : 'Loss tonight'}</span><span>${profit >= 0 ? '+' : ''}${usd(profit)}</span></div><div><span class="muted">Cash now</span><span>${usd(p.cash)}</span></div></div></section>
    <section class="panel"><h2>Tonight in numbers</h2><div class="tiles two">
      <div class="tile"><span class="v">${v.served} of ${v.demand}</span><span class="s">guests seated</span></div><div class="tile ${v.turned ? 'bad' : ''}"><span class="v">${v.turned}</span><span class="s">left unhappy${v.vouchers ? ` (${v.vouchers} got a voucher)` : ''}</span></div>
      <div class="tile"><span class="v">${h.spoiled}</span><span class="s">plates thrown away</span></div><div class="tile"><span class="v">${v.empty || 0}</span><span class="s">empty tables</span></div></div></section>
    <div class="stack"><section class="panel edge"><span class="hint" style="font-weight:700;color:var(--muted)">For tomorrow</span><b style="font-size:15px;line-height:1.35">${tipA}</b><span style="font-size:13px;color:var(--ink2);line-height:1.45">${tipB}</span>${last ? '' : tomorrowFood}</section>
      <section class="panel" style="grid-template-columns:auto 1fr;align-items:center"><span class="dot round rival"></span><span style="font-size:13px;color:var(--ink2)"><b style="color:var(--ink)">${esc(nameOf(o))}</b> seated ${rv.served}, ${rv.turned} left unhappy${rd ? `, ${rd > 0 ? 'gained' : 'lost'} ${plural(Math.abs(rd), 'star')}` : ''}</span></section>
      ${btn}</div>
  </div>`;
}

// ---------- final results ----------
function finalHTML(s) {
  const S = app.S, R = S.result, sc = R.score, o = other(s), p = S.players[s], q = S.players[o];
  const meWon = R.winner === s, tie = R.winner === 'draw', gap = round2(Math.abs(sc[s].total - sc[o].total));
  const you = app.mode === 'online' ? 'You' : nameOf(s);
  let head, line;
  if (R.reason === 'bankrupt') {
    const meBroke = p.bankrupt, themBroke = q.bankrupt;
    if (meBroke && themBroke) { head = meWon ? 'You win!' : tie ? "It's a draw" : `${nameOf(o)} wins`; line = 'Both restaurants ran out of money for rent on the same morning, so the higher score wins.'; }
    else if (meBroke) { head = 'Your restaurant had to close'; line = `You couldn't pay this morning's rent, so the game ends, and ${nameOf(o)} wins.`; }
    else { head = 'You win!'; line = `${nameOf(o)}'s restaurant closed: they couldn't pay their rent this morning, so the game ends early.`; }
  } else if (tie) { head = "It's a draw"; line = 'Same score and same stars. A perfect match.'; }
  else if (sc[s].total === sc[o].total) { head = meWon ? 'You win!' : `${nameOf(o)} wins`; line = `Same score, so more stars wins: ${p.stars} ★ against ${q.stars} ★.`; }
  else if (meWon) { head = 'You win!'; line = `${app.mode === 'online' ? 'Your' : `${esc(nameOf(s))}'s`} ${restName(p.loc)} restaurant beat ${esc(nameOf(o))}'s by <b>${usd(gap)}</b>.`; }
  else { head = gap < CFG.starValue ? 'So close!' : `${esc(nameOf(o))} wins this one`; line = `${esc(nameOf(o))} won by ${usd(gap)}.${gap < CFG.starValue ? " That's less than one star." : ''}`; }
  const big = meWon ? gold(esc(head)) : `<span class="plain">${esc(head)}</span>`;
  const card = (w, place) => `<div class="score ${place === 1 ? 'win' : ''}"><span class="w"><span class="dot ${w === s ? 'you' : 'rival'}"></span>${w === s ? esc(you) : esc(nameOf(w))}${tie ? '' : ` · ${place === 1 ? '1st' : '2nd'}`}</span><span class="n">${sc[w].total}</span><span class="s">${usd(sc[w].cash)} cash + ${S.players[w].stars} ★ ($${sc[w].starPts})</span></div>`;
  const first = R.winner === o ? o : s;
  // the race chart
  const days = Math.max(p.history.length, q.history.length);
  const ser = w => S.players[w].history.map(h => h.cash + h.stars * CFG.starValue);
  const a = ser(s), b = ser(o), all = [...a, ...b, CFG.startCash + CFG.startStars * CFG.starValue];
  const stepV = Math.max(10, Math.ceil((Math.max(...all) - Math.min(...all)) / 3 / 10) * 10), lo = Math.floor(Math.min(...all) / stepV) * stepV, hi = lo + stepV * 3 >= Math.max(...all) ? lo + stepV * 3 : lo + stepV * 4;
  const X = i => (days <= 1 ? 340 : 60 + i * (540 / (days - 1))), Y = vv => 220 - (vv - lo) / (hi - lo || 1) * 180;
  const pts = arr => arr.map((vv, i) => `${X(i).toFixed(1)},${Y(vv).toFixed(1)}`).join(' ');
  const grid = Array.from({ length: Math.round((hi - lo) / stepV) + 1 }, (_, i) => i).map(i => { const val = lo + stepV * i; const y = Y(val); return `<path class="grid" d="M40 ${y}h580"/><text x="30" y="${y + 4}" text-anchor="end">${val}</text>`; }).join('');
  const labels = Array.from({ length: days }, (_, i) => `<text class="d" x="${X(i)}" y="244" text-anchor="middle">Day ${i + 1}</text>`).join('');
  let lead = '';
  const ledFor = a.filter((x, i) => b[i] > x).length;
  if (meWon && ledFor >= days - 1 && days > 1) lead = `${esc(nameOf(o))} led for ${plural(ledFor, 'day')}. You took the lead at the very end.`;
  else if (meWon) lead = 'You led for most of the game.';
  else lead = `${esc(nameOf(o))} was ahead for most of the game.`;
  const served = p.history.reduce((x, h) => x + h.served, 0), came = p.history.reduce((x, h) => x + h.demand, 0), spoiled = p.history.reduce((x, h) => x + h.spoiled, 0);
  const adsSpent = -p.history.reduce((x, h) => x + h.ledger.filter(l => /^Ad cards/.test(l.label)).reduce((y, l) => y + l.amt, 0), 0);
  const bestDay = p.history.reduce((bd, h) => (round2(h.income + h.spend) > round2(bd.income + bd.spend) ? h : bd), p.history[0] || { income: 0, spend: 0, round: 1 });
  return `<section class="final-hero" aria-label="Result"><img src="${IMG.art}" alt="">
    <div class="in"><div style="display:grid;gap:6px">${big}<p>${line}</p></div><div class="scores">${card(first, 1)}${card(other(first), 2)}</div></div></section>
  <div class="final-mid">
    <section class="panel" style="padding:22px 24px"><div class="row" style="justify-content:space-between"><h2 style="font-family:var(--display);font-size:20px">How the race went</h2>
      <span class="row" style="gap:14px;font-size:12px"><span class="inl"><span style="width:14px;height:3px;border-radius:2px;background:var(--you)"></span><b>${esc(you)} ${sc[s].total}</b></span><span class="inl"><span style="width:14px;height:3px;border-radius:2px;background:var(--rival)"></span><b>${esc(nameOf(o))} ${sc[o].total}</b></span></span></div>
      ${days ? `<svg class="chart" viewBox="0 0 640 250" role="img" aria-label="Score by day">${grid}${labels}
        <polyline points="${pts(b)}" fill="none" stroke="var(--rival)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts(a)}" fill="none" stroke="var(--you)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${a.length ? `<circle cx="${X(a.length - 1)}" cy="${Y(a[a.length - 1])}" r="6" fill="var(--you)"/>` : ''}${b.length ? `<circle cx="${X(b.length - 1)}" cy="${Y(b[b.length - 1])}" r="5" fill="var(--rival)"/>` : ''}</svg>` : ''}
      <span style="font-size:13px;color:var(--ink2)">${lead} Your best day was day ${bestDay.round} (${usd(round2(bestDay.income + bestDay.spend))}).</span></section>
    <section class="panel" style="padding:22px 24px"><h2 style="font-family:var(--display);font-size:20px">Your game in numbers</h2>
      <div class="tiles two"><div class="tile"><span class="v">${served} of ${came}</span><span class="s">guests got a table</span></div><div class="tile"><span class="v">${CFG.startStars} → ${p.stars} ★</span><span class="s">stars, start to finish</span></div>
        <div class="tile"><span class="v">${plural(spoiled, 'plate')}</span><span class="s">thrown away</span></div><div class="tile"><span class="v">${usd(adsSpent)}</span><span class="s">spent on ads and tricks</span></div></div></section>
  </div>
  <div class="final-mid">
    <section class="panel talk" style="padding:22px 24px"><div class="row" style="justify-content:space-between"><h2 style="font-family:var(--display);font-size:20px">Talk it over with ${esc(nameOf(o))}</h2><span class="hint">about 5 minutes</span></div>
      <ol><li>${gold(1, 'sm')}How many guests a day did you need to break even?</li><li>${gold(2, 'sm')}Which day were you short on tables or food? What would you change?</li>
        <li>${gold(3, 'sm')}Which ad was worth its price? Which trick hurt you most?</li><li>${gold(4, 'sm')}Did you take the shady deal? Would you again?</li></ol></section>
    <section class="again"><b>${meWon ? 'Think you can win by more?' : 'Want a rematch?'}</b><span>Each game deals different offers, cards and surprises. ${p.loc === 'city' ? 'Try the Countryside' : 'Try the City'} next time.</span>
      ${app.mode === 'local' ? '<button class="cta" data-act="local">Play again</button>' : `<button class="cta" data-act="create">Start a new game</button>`}<button class="ghost" data-act="leave">Back to the start</button></section>
  </div>`;
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, S = app.S, s = viewer(), k = S && S.waiting[s];
  switch (a) {
    case 'create': return createGame();
    case 'rejoin': return joinGame(b.dataset.code);
    case 'local': return startLocal();
    case 'leave': app.howto = null; return leave(false);
    case 'home': if (!app.mode) return; return;
    case 'view': app.view = b.dataset.seat; if (S && PRIVATE_PHASES.includes(S.phase)) app.cover = app.view; return render();
    case 'cover-ok': app.cover = null; return render();
    case 'intro': app.intro++; return render();
    case 'introskip': app.intro = INTRO.length; return render();
    case 'howto': {
      const ph = S && app.mode ? S.phase : null;
      app.howto = { open: ph === 'pick' ? 'pick' : ['invest', 'market', 'commit', 'service', 'voucher', 'report'].includes(ph) ? 'day' : null };
      return render();
    }
    case 'howto-close': app.howto = null; return render();
    case 'howto-sec': app.howto.open = app.howto.open === b.dataset.sec ? null : b.dataset.sec; return render();
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
    case 'invest': { const f = F({}); return act(s, { k, tables: f.tables || 0, choice: f.choice || null, loan: false }); }
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
// Keyboard: Esc closes How to play; during a shortage R = rush food, B = borrow a table, Esc = let them go
document.addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input,textarea')) return;
  if (app.howto && e.key === 'Escape') { app.howto = null; return render(); }
  const S = app.S; if (!S || S.phase !== 'service') return;
  const btn = sel => { const el = document.querySelector(sel); if (el) { e.preventDefault(); el.click(); } };
  const key = e.key.toLowerCase();
  if (key === 'r') btn('[data-act=svc][data-a=rush]');
  else if (key === 'b') btn('[data-act=svc][data-a=borrow]');
  else if (e.key === 'Escape') btn('[data-act=svc][data-a=letgo]');
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.matches('[data-form="join"]')) joinGame($('#code-in').value);
});
render();
