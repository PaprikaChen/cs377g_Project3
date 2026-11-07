// ===== Page: lobby, online sync through Firebase (Firestore + anonymous sign-in), local test mode =====
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => { const v = Math.abs(n), t = Number.isInteger(v) ? String(v) : v.toFixed(2); return (n < 0 ? '−$' : '$') + t; };
const ex = n => String(Math.round(n * 10) / 10); // expected head count, one decimal
const pct = x => Math.round(x * 100) + '%';
const lsGet = k => { try { return localStorage.getItem('rr:' + k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem('rr:' + k, v); } catch (e) {} };
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = (n = 4) => { const a = new Uint32Array(n); crypto.getRandomValues(a); return [...a].map(x => CODE_CHARS[x % CODE_CHARS.length]).join(''); };
const randHex = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

const app = {
  mode: null, fb: null, uid: null, dbReady: false, dbMsg: 'Connecting…',
  code: null, seed: null, seats: {}, logs: { p1: [], p2: [] }, me: null, view: 'p1',
  nick: (lsGet('nick') || '').slice(0, 12), S: null, form: {}, priv: {}, revealing: {}, unsub: [], chain: Promise.resolve(),
  err: '', busy: false, loadNote: '', played: {}, playing: null, playTimer: null
};

window.__rr = app; // debugging: type __rr.S in the browser console to see the game state

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 3500);
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
      await app.fb.set(`games/${code}`, { seed: genCode(8) + Date.now(), host: app.uid, created: Date.now(), v: 1 });
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
  if (!priv) { priv = { ...NO_CARDS, salt: '' }; toast("Couldn't find your cards, so they all count as bluffs this round."); }
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
const PHASES = [['event', 'Event'], ['invest', 'Build'], ['market', 'Market'], ['commit', 'Ads'], ['respond', 'Prep'], ['voucher', 'Service'], ['report', 'Recap']];
const phaseIdx = p => ({ event: 0, invest: 1, market: 2, commit: 3, respond: 4, reveal: 5, voucher: 5, report: 6 })[p] ?? -1;

function render() {
  if (app.mode === 'local') document.body.dataset.view = app.view; else delete document.body.dataset.view;
  renderBar();
  const root = $('#app');
  if (!app.mode) { root.innerHTML = lobbyHTML(); return; }
  if (!app.S) { root.innerHTML = `<section class="ticket"><p class="wait"><span class="pulse"></span>Loading game…</p>${app.loadNote ? `<p class="err">${esc(app.loadNote)}</p>` : ''}<div class="row"><button class="btn ghost" data-act="leave">Back to lobby</button></div></section>`; return; }
  root.innerHTML = gameHTML();
}

function renderBar() {
  const S = app.S, st = $('#steps'), rm = $('#room');
  if (!S || S.phase === 'pick' || S.phase === 'over') st.innerHTML = '';
  else {
    const i = phaseIdx(S.phase);
    st.innerHTML = `<li class="on" style="background:transparent;color:var(--ink);border-color:transparent;font-weight:600">Day ${S.round}/${CFG.rounds}</li>` +
      PHASES.map(([, n], j) => `<li class="${j === i ? 'on' : j < i ? 'done' : ''}">${n}</li>`).join('');
  }
  if (app.mode === 'online') rm.innerHTML = `<span class="chip">Room <b>${esc(app.code)}</b></span><button class="btn ghost" data-act="copy" style="min-height:32px;padding:4px 10px">Copy code</button><span class="chip">${seatTag(app.me)}</span><button class="btn ghost" data-act="leave" style="min-height:32px;padding:4px 10px">Leave</button>`;
  else if (app.mode === 'local') rm.innerHTML = `<span class="chip">Local test</span>${['p1', 'p2'].map(s => `<button class="btn ${app.view === s ? '' : 'ghost'}" data-act="view" data-seat="${s}" style="min-height:32px;padding:4px 10px">As ${seatTag(s)}${app.S && app.S.waiting[s] ? ' •' : ''}</button>`).join('')}<button class="btn ghost" data-act="leave" style="min-height:32px;padding:4px 10px">Quit</button>`;
  else rm.innerHTML = '';
}

function lobbyHTML() {
  const last = lsGet('lastCode');
  return `<div class="stack">
  <section class="hero">
    <h1>Two restaurants. Five days. One winner.</h1>
    <p class="muted">Run a restaurant, fight over ingredients, and bluff with ads. Swamp your rival with more customers than they can seat. Most cash plus stars after day 5 wins.</p>
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

// Cards in front of `shop`, as `viewerSeat` sees them: your own cards show real/blank, the opponent's stay face down.
function frontHTML(shop, viewerSeat) {
  const S = app.S, cm = S.commits; if (!cm || !cm.p1) return '';
  const own = shop, rival = shop === 'p1' ? 'p2' : 'p1', out = [];
  const add = (placer, n, real, blank) => {
    const mine = app.mode === 'local' ? placer === viewerSeat : placer === app.me;
    const known = mine ? myCards(placer) : null;
    for (let i = 0; i < n; i++) {
      const isReal = known ? i < real : null;
      out.push(`<span class="card" data-from="${placer}" title="from ${esc(nameOf(placer))}">${isReal === null ? '?' : isReal ? 'AD' : '—'}</span>`);
    }
  };
  const kOwn = myCards(own) || NO_CARDS, kRival = myCards(rival) || NO_CARDS;
  add(own, cm[own].nSelf, kOwn.selfReal, kOwn.selfBlank);
  add(rival, cm[rival].nRival, kRival.rivalReal, kRival.rivalBlank);
  return `<span class="cards">${out.join('') || '<span class="muted">none</span>'}</span>`;
}

function restHTML(s) {
  const S = app.S, p = S.players[s], L = p.loc && CFG.loc[p.loc], own = s === viewer();
  const c = publicCapacity(s), E = expectedDemand(p);
  const live = ['event', 'invest', 'market', 'commit', 'respond', 'reveal'].includes(S.phase);
  const lim = k => (c[k] === c.cap && E.total > c.cap ? 'limit' : '');
  const flags = [];
  if (p.loan) flags.push(`<span class="flag">Loan (repay $${CFG.loan.repay})</span>`);
  if (own && p.shadyFrom !== null) flags.push('<span class="flag bad">Took the shady deal</span>');
  if (own && p.held) flags.push(`<span class="flag">${p.held} tables held for a booking</span>`);
  return `<article class="rest" data-seat="${s}">
    <div class="rest-head"><h2>${L ? `${L.name} <span class="muted mono" style="font-size:.85rem">${L.tag}</span>` : 'No shop yet'}</h2><span class="who">${app.mode === 'local' ? seatTag(s) : `${esc(nameOf(s))} · ${seatTag(s)}`}</span></div>
    <div class="stats">
      <div class="stat"><span class="label">Cash</span><b>${['voucher', 'report'].includes(S.phase) && S.service && !watched() ? '<span class="muted" style="font-size:.85rem">open…</span>' : usd(p.cash)}</b></div>
      <div class="stat"><span class="label">Stars</span>${starsHTML(p.stars)}</div>
      <div class="stat"><span class="label">Income per table</span><b>${L ? '$' + L.price : '—'}</b></div>
    </div>
    ${L && live ? `<div class="capline">
      <div class="res ${lim('tables')}"><span class="label">Tables</span><b>${c.tables}</b>${p.tempTables ? `<span class="muted">${p.tempTables} pop-up</span>` : ''}${own && p.held ? `<span class="muted">+${p.held} held</span>` : ''}</div>
      <div class="res ${lim('ingr')}"><span class="label">Food</span><b>${c.ingr}</b></div>
    </div>
    <div class="forecast"><span>~<b class="mono">${ex(E.total)}</b> expected</span><span>seats <b class="mono">${c.cap}</b></span></div>` : ''}
    ${L && !live ? `<div class="forecast"><span>Tables <b class="mono">${p.tables}</b></span></div>` : ''}
    ${['respond', 'reveal'].includes(S.phase) ? `<div class="forecast"><span>Cards out front</span>${frontHTML(s, viewer())}</div>` : ''}
    ${flags.length ? `<div class="flags">${flags.join('')}</div>` : ''}
  </article>`;
}

function waitHTML(s, text) {
  const S = app.S, o = s === 'p1' ? 'p2' : 'p1';
  if (S.submitted[s]) return `<p class="wait"><span class="pulse"></span>Done. Waiting on ${esc(nameOf(o))}…</p>`;
  return `<p class="wait"><span class="pulse"></span>${text || `Waiting on ${esc(nameOf(o))}…`}</p>`;
}

function stepper(field, val, min, max, label) {
  return `<div class="step" role="group" aria-label="${esc(label)}"><button type="button" data-act="inc" data-f="${field}" data-d="-1" ${val <= min ? 'disabled' : ''} aria-label="less">−</button><output>${val}</output><button type="button" data-act="inc" data-f="${field}" data-d="1" ${val >= max ? 'disabled' : ''} aria-label="more">+</button></div>`;
}

// Events are private: only the player they happen to ever sees them (or their choice).
function eventHTML() {
  const S = app.S, e = S.event;
  if (!e || !e.seat || e.seat !== viewer()) return '';
  const secret = '<span class="muted">Only you can see this.</span>';
  if (e.type === 'shady') return `<div class="event"><span class="label">Today · just you</span><b>A shady offer</b>
    <span>Take $${CFG.shady.cash} now. Every day after, there's a 1 in 6 chance an inspector catches you: −$${CFG.shady.fine} and −1 star.</span>
    ${e.choice ? `<span class="muted">You <b>${e.choice === 'accept' ? 'took it' : 'passed'}</b>.</span>` : secret}</div>`;
  return `<div class="event"><span class="label">Today · just you</span><b>Someone booked ${CFG.noshow.tables} tables</b>
    <span>Hold them: they sit empty unless the party shows (50%), then you get $${CFG.noshow.pay}. Release them: use the tables, but if the party shows (50%) you lose a star.</span>
    ${e.choice ? `<span class="muted">You <b>${e.choice === 'hold' ? 'held them' : 'released them'}</b>.</span>` : secret}</div>`;
}
// One-line hint shown under a decision.
const hint = t => `<p class="hint"><span class="label">Hint</span>${t}</p>`;
// What the viewer may know about a shop's seats: a rival's held tables stay hidden.
function publicCapacity(s) {
  const p = app.S.players[s];
  return capacityOf(s === viewer() ? p : { ...p, held: 0 });
}
const PRIVATE_LINES = ['Shady deal', 'Reservation paid', 'Inspector fine'];
const PRIVATE_WHY = ['reservation had no seat −1', 'inspector −1'];

function actionHTML() {
  const S = app.S, s = viewer(), k = S.waiting[s], p = S.players[s], o = s === 'p1' ? 'p2' : 'p1';
  const head = (t, sub) => `<div class="ticket-head"><h2>${t}</h2><span class="label">${sub || ''}</span></div>`;
  switch (S.phase) {
    case 'pick': {
      if (!k) return head('Pick a shop') + waitHTML(s);
      const card = loc => { const L = CFG.loc[loc]; return `<button class="pick" data-act="pick" data-loc="${loc}">
        <span class="row" style="justify-content:space-between"><b style="font-size:1.1rem">${L.name}</b><span class="mono muted">${L.tag}</span></span>
        <dl><dt>Opening cost</dt><dd>$${L.open}</dd><dt>Rent / day</dt><dd>$${L.rent}</dd><dt>Tables</dt><dd>${L.tables}</dd>
        <dt>Income per table</dt><dd>$${L.price}</dd><dt>Free food / day</dt><dd>${L.free}</dd></dl></button>`; };
      return head('Pick a shop', `${seatTag(s)} · $${CFG.startCash} to start`) +
        `<p class="muted">Both get ${CFG.baseDemand} regulars a day and start at 3 stars. Your rival won't see your pick until you both choose.</p><div class="picks">${card('country')}${card('city')}</div>`;
    }
    case 'event': {
      const e = S.event;
      if (!k) return head('Get ready') + waitHTML(s);
      const btns = e.type === 'shady'
        ? `<button class="btn" data-act="event" data-c="accept">Take it (+$${CFG.shady.cash})</button><button class="btn ghost" data-act="event" data-c="decline">Pass</button>`
        : `<button class="btn" data-act="event" data-c="hold">Hold the tables</button><button class="btn ghost" data-act="event" data-c="release">Release them</button>`;
      return head('Today', 'your call') + eventHTML() + `<div class="row">${btns}</div>`;
    }
    case 'invest': {
      if (!k) return head('Build') + waitHTML(s);
      const f = F({ tables: 0, loan: false });
      const cashAfterLoan = p.cash + (f.loan && !p.loan ? CFG.loan.amount : 0);
      const maxT = Math.min(CFG.maxTables - p.tables, Math.floor(Math.max(0, cashAfterLoan) / CFG.tableCost));
      if (f.tables > maxT) f.tables = maxT;
      const cost = f.tables * CFG.tableCost;
      return head('Build', 'both at once') + `<div class="form">
        <div class="field"><div class="txt"><b>Add tables</b><small>$${CFG.tableCost} each, yours for good. You have ${p.tables}.</small></div>${stepper('tables', f.tables, 0, maxT, 'Add tables')}</div>
        ${p.loan || !CFG.loan.enabled ? '' : `<label class="field toggle" for="loan-in"><div class="txt"><b>Take a loan</b><small>$${CFG.loan.amount} now, repay $${CFG.loan.repay} at the end. Once per game.</small></div><input type="checkbox" id="loan-in" data-act="loan" ${f.loan ? 'checked' : ''}></label>`}
        <div class="total"><span>Cost</span><span>${usd(-cost)} · left ${usd(cashAfterLoan - cost)}</span></div>
        ${hint(`~${ex(expectedDemand(p).total)} customers expected before ads.`)}
        <div class="row"><button class="btn" data-act="invest">Done</button></div></div>`;
    }
    case 'market': {
      const m = S.market, left = CFG.market.stock - m.sold;
      const cells = Array.from({ length: CFG.market.stock }, (_, i) => {
        const own = m.cells[i], price = CFG.market.tiers.find(([u]) => i < u)[1];
        return `<div class="cell ${own || ''} ${!own && i === m.sold ? 'next' : ''}">$${price}</div>`;
      }).join('');
      const board = `<div class="board" aria-label="${left} left in the market">${cells}</div>
        <div class="legend"><span><i class="dot" style="background:var(--p1)"></i>${esc(nameOf('p1'))}: ${m.buys.p1}</span><span><i class="dot" style="background:var(--p2)"></i>${esc(nameOf('p2'))}: ${m.buys.p2}</span><span>${left} left</span></div>`;
      const info = hint(`~${ex(expectedDemand(p).total)} expected before ads, ${Math.max(0, p.tables - p.held)} tables. Leftovers spoil.`);
      if (!k) return head('Market', m.passed[s] ? "you're done" : 'take turns') + board + info + waitHTML(s, m.passed[s] ? `${esc(nameOf(o))} is still shopping…` : `${esc(nameOf(o))}'s turn…`);
      const btn = n => { const ok = n <= left && priceOf(m.sold, n) <= p.cash; return `<button class="btn" data-act="buy" data-n="${n}" ${ok ? '' : 'disabled'}>Buy ${n} · $${n <= left ? priceOf(m.sold, n) : '—'}</button>`; };
      return head('Market', 'your turn') + board + info + `<div class="row">${btn(1)}${btn(2)}${btn(3)}<button class="btn ghost" data-act="buy" data-n="0">I'm done</button></div><p class="muted" style="font-size:.85rem">Once you're done, you're out for today.</p>`;
    }
    case 'commit': {
      if (!k) return head('Ads', 'face down') + waitHTML(s);
      const f = F({ sr: 0, sb: 0, rr: 0, rb: 0 }), A = CFG.ad, m = A.maxPerShop;
      const c = { selfReal: f.sr, selfBlank: f.sb, rivalReal: f.rr, rivalBlank: f.rb }, cost = adCost(c), left = Math.max(0, p.cash - cost);
      const row = (field, val, label, price, others) => `<div class="field"><div class="txt"><b>${label}</b><small>$${price} each</small></div>${stepper(field, val, 0, Math.min(m - others, val + Math.floor(left / price)), label)}</div>`;
      return head('Ads', 'face down') + `<div class="form">
        <p class="muted">Cards go face down. Your rival only sees how many. A real ad brings ${A.customers} customers; a bluff brings nobody. You pay when they flip. Up to ${m} per shop.</p>
        <h3>Your shop</h3>
        ${row('sr', f.sr, 'Real ad', A.real, f.sb)}${row('sb', f.sb, 'Bluff', A.blank, f.sr)}
        <h3>${poss(o)} shop</h3>
        ${row('rr', f.rr, 'Real ad', A.real, f.rb)}${row('rb', f.rb, 'Bluff', A.blank, f.rr)}
        <div class="total"><span>Paid at the flip</span><span>${usd(-cost)} · left ${usd(p.cash - cost)}</span></div>
        ${hint(`You ~${ex(expectedDemand(p, f.sr).total)} / ${capacityOf(p).cap} seats · ${esc(nameOf(o))} ~${ex(expectedDemand(S.players[o], f.rr).total)} / ${publicCapacity(o).cap} seats`)}
        <div class="row"><button class="btn" data-act="commit">Place cards</button></div></div>`;
    }
    case 'respond': {
      const cmt = S.commits, known = myCards(s) || NO_CARDS;
      const board = `<div class="fronts">
        <div><span class="label">${poss(s)} shop</span>${frontHTML(s, s)}</div>
        <div><span class="label">${poss(o)} shop</span>${frontHTML(o, s)}</div></div>`;
      if (!k) return head('Prep', 'before the flip') + board + waitHTML(s);
      const f = F({ tt: 0, rush: 0 }), R = CFG.respond;
      const reserve = adCost(known), cost = f.tt * R.tempTable + f.rush * R.rushIngr, left = Math.max(0, p.cash - reserve - cost);
      const unknown = cmt[o].nRival;
      return head('Prep', 'before the flip') + board + `<div class="form">
        <p><b>${esc(nameOf(o))} put ${unknown} card${unknown === 1 ? '' : 's'} at ${app.mode === 'local' ? `${esc(nameOf(s))}'s` : 'your'} door.</b></p>
        <div class="field"><div class="txt"><b>Pop-up tables</b><small>$${R.tempTable} each, today only</small></div>${stepper('tt', f.tt, 0, Math.min(R.tempTableMax, f.tt + Math.floor(left / R.tempTable)), 'Pop-up tables')}</div>
        <div class="field"><div class="txt"><b>Rush food</b><small>$${R.rushIngr} each, pricier than market, still spoils</small></div>${stepper('rush', f.rush, 0, Math.min(R.rushIngrMax, f.rush + Math.floor(left / R.rushIngr)), 'Rush food')}</div>
        <div class="total"><span>Cost</span><span>${usd(-cost)}</span></div>
        ${hint(`All real = +${unknown * CFG.ad.customers} customers. You'll seat ${Math.min(capacityOf(p).tables + f.tt, p.ingr + f.rush)}.`)}
        ${reserve ? `<p class="muted" style="font-size:.85rem">${usd(reserve)} set aside for your ad cards.</p>` : ''}
        <div class="row"><button class="btn" data-act="respond">${cost ? 'Done' : 'Skip'}</button></div></div>`;
    }
    case 'reveal': return head('Flip', '') + waitHTML(s, 'Flipping cards…');
    case 'voucher': {
      if (!watched()) return openingHTML();
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
      if (!watched()) return openingHTML();
      const last = S.round >= CFG.rounds;
      const btn = k ? `<button class="btn" data-act="next">${last ? 'See results' : `Start day ${S.round + 1}`}</button>` : waitHTML(s, `${esc(nameOf(o))} is reading the bill…`);
      return head(`Day ${S.round} recap`, '') + billsHTML() + `<div class="row">${btn}</div>`;
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
  const o = s === 'p1' ? 'p2' : 'p1', dice = (roll, need, verb) => `<span class="muted mono">rolled ${roll} (≤${need} ${verb})</span>`;
  const li = (txt, res, cls = '') => `<li class="${cls}"><span>${txt}</span><span>${res}</span></li>`;
  switch (st.k) {
    case 'base': return li('Regulars walk in', `<b class="pos">+${st.n}</b>`);
    case 'rep': return li(`Word of mouth ${dice(st.roll, st.need, 'comes')}`, st.ok ? '<b class="pos">+1</b>' : '<span class="muted">no-show</span>');
    case 'lose': return li(`A regular, unsure ${dice(st.roll, st.need, 'leaves')}`, st.ok ? '<b class="neg">−1</b>' : '<span class="muted">stays</span>');
    case 'total': return li(`<b>${st.demand} customers today</b>`, '', 'em');
    case 'noshow': return li(`The booking <span class="muted mono">rolled ${st.roll} (4–6 shows)</span>`, st.arrive ? `<b>${st.choice === 'hold' ? 'showed, paid' : 'showed, no seat'}</b>` : '<span class="muted">no-show</span>');
    case 'seat': return li(`<b>Seated ${st.served}</b> <span class="muted">(room for ${st.cap})</span>`, '', 'em');
    case 'turned': return li(`<b class="neg">Turned away ${st.n}</b>`, '', 'em bad');
    case 'card': return li(`Card ${st.n}/${st.of} <span class="muted">(from ${(st.from === 'self' ? s : o) === app.me && app.mode !== 'local' ? 'you' : esc(nameOf(st.from === 'self' ? s : o))})</span>`, st.real ? `<b class="pos">Real ad +${st.brings}</b>` : '<span class="muted">Bluff</span>', st.real ? '' : 'blank');
    case 'sum': return li(`<b>Sales ${usd(st.meals)}</b>`, '', 'em');
  }
  return '';
}
function feedHTML(s, n) {
  const v = app.S.service[s], shown = v.steps.slice(0, n).filter(st => s === viewer() || st.k !== 'noshow');
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
    <div class="rest-head"><h2>${esc(nameOf(s))}</h2><span class="muted mono" style="font-size:.8rem">${CFG.loc[app.S.players[s].loc].name} · seats ${v.cap}</span></div>
    <div class="big"><div><span class="label">Came</span><b>${came}</b></div><div><span class="label">Seated</span><b>${seated}</b></div><div class="${turned ? 'bad' : ''}"><span class="label">Away</span><b>${turned}</b></div></div>
    <ul class="lines feed">${shown.map(st => stepLine(s, st)).reverse().join('') || '<li class="muted"><span>Opening up…</span><span></span></li>'}</ul>
  </article>`;
}
function openingHTML() {
  const S = app.S, P = app.playing && app.playing.key === playKey() ? app.playing : null;
  const head = `<div class="ticket-head"><h2>Day ${S.round} · Service</h2><span class="label">${P ? (P.idx >= stepsLen() ? 'closed' : 'open') : 'ready'}</span></div>`;
  if (!P) return head + `<p class="muted">Flip the cards and watch who walks in.</p>
    <div class="row"><button class="btn" data-act="play">Open the doors</button><button class="btn ghost" data-act="skip">Skip to the bill</button></div>`;
  const order = app.mode === 'online' ? [app.me, app.me === 'p1' ? 'p2' : 'p1'] : ['p1', 'p2'];
  const done = P.idx >= stepsLen();
  return head + `<div class="bills">${order.map(s => feedHTML(s, P.idx)).join('')}</div>
    <div class="row">${done ? '<button class="btn" data-act="skip">See the bill</button>' : '<button class="btn ghost" data-act="skip">Skip</button>'}</div>`;
}

function billsHTML() {
  const S = app.S; if (!S.service) return '';
  const order = app.mode === 'online' ? [app.me, app.me === 'p1' ? 'p2' : 'p1'] : ['p1', 'p2'];
  return `<div class="bills">${order.map(s => billHTML(s)).join('')}</div>`;
}
function billHTML(s) {
  const S = app.S, v = S.service[s], p = S.players[s], o = s === 'p1' ? 'p2' : 'p1', own = s === viewer();
  const limName = { tables: 'tables', ingr: 'food' };
  const label = x => (!own && PRIVATE_LINES.includes(x.label) ? 'Other' : x.label);
  const why = (v.why || []).map(w => (!own && PRIVATE_WHY.includes(w) ? 'other −1' : w));
  const lines = p.ledger.map(x => `<li><span>${esc(label(x))}</span><span class="${x.amt > 0 ? 'pos' : x.amt < 0 ? 'neg' : 'muted'}">${x.amt === null ? '' : (x.amt > 0 ? '+' : '') + usd(x.amt)}</span></li>`).join('');
  const rep = v.starsAfter !== undefined
    ? `<div class="eq"><span class="k">Stars</span><span>${v.starsBefore} → ${v.starsAfter} · ${esc(why.join(', '))}</span></div>`
    : `<div class="eq"><span class="k">Stars</span><span>updated at recap</span></div>`;
  const extra = [];
  if (own && v.noshow) extra.push(`Booking rolled ${v.noshow.roll}: ${v.noshow.arrive ? 'showed' : 'no-show'}`);
  if (own && v.inspection) extra.push(`Inspector rolled ${v.inspection.roll}: ${v.inspection.caught ? 'caught!' : 'safe'}`);
  if (S.reveals[s] && S.reveals[s].ok === false) extra.push("Card check failed, so this player's cards count as bluffs");
  return `<article class="bill" data-seat="${s}">
    <div class="rest-head"><h2>${esc(nameOf(s))}</h2><span class="muted mono" style="font-size:.8rem">${CFG.loc[p.loc].name}</span></div>
    <div class="big"><div><span class="label">Came</span><b>${v.demand}</b></div><div><span class="label">Seated</span><b>${v.served}</b></div><div class="${v.turned ? 'bad' : ''}"><span class="label">Away</span><b>${v.turned}</b></div></div>
    <div class="eq"><span class="k">Customers</span><span>${v.base} regulars${v.repGain ? ` + ${v.repGain} word of mouth` : ''}${v.repLoss ? ` − ${v.repLoss} lost` : ''} + ${v.adSelfIn} own ads + ${v.adRivalIn} from ${esc(nameOf(o))} = ${v.demand}</span>
      <span class="muted">Cards: ${esc(nameOf(s))} ${v.cards.mine.real} real / ${v.cards.mine.blank} bluff, ${esc(nameOf(o))} ${v.cards.theirs.real} real / ${v.cards.theirs.blank} bluff</span></div>
    <div class="eq"><span class="k">Seats</span><span>${v.tables} tables, ${v.ingr} food → ${v.cap}</span>
      ${v.limits.length ? `<span class="neg">Short on ${v.limits.map(x => limName[x]).join(' and ')}</span>` : v.cap > v.demand ? `<span class="muted">${v.cap - v.demand} seats empty</span>` : ''}</div>
    ${rep}
    ${extra.length ? `<div class="eq">${extra.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
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
      <span>1. How many customers a day did you need to break even?</span>
      <span>2. Which day were you short on tables or food? What would you change?</span>
      <span>3. How much did turning people away cost you?</span>
      <span>4. Did you take the shady deal? Would you again?</span></div>
    <div class="row"><button class="btn" data-act="leave">Back to lobby</button></div>`;
}

function historyHTML() {
  const S = app.S, rows = [];
  for (let r = 1; r <= CFG.rounds; r++) for (const s of ['p1', 'p2']) {
    const h = S.players[s].history.find(x => x.round === r); if (!h) continue;
    rows.push(`<tr><td>Day ${r} · ${esc(nameOf(s))}</td><td>${h.demand}</td><td>${h.cap}</td><td>${h.served}</td><td class="${h.turned ? 'neg' : ''}">${h.turned}</td><td>${h.spoiled}</td><td class="pos">+${usd(h.income)}</td><td class="neg">${usd(h.spend)}</td><td>${usd(h.cash)}</td><td>${h.stars}</td></tr>`);
  }
  if (!rows.length) return '';
  return `<section class="ticket"><div class="ticket-head"><h2>Daily log</h2><span class="label">end of each day</span></div>
    <div class="tablewrap"><table><thead><tr><th>Day</th><th>Came</th><th>Seats</th><th>Seated</th><th>Away</th><th>Spoiled</th><th>In</th><th>Out</th><th>Cash</th><th>Stars</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></section>`;
}

function gameHTML() {
  const S = app.S;
  const order = app.mode === 'online' ? [app.me, app.me === 'p1' ? 'p2' : 'p1'] : ['p1', 'p2'];
  const waitingOther = app.mode === 'online' && S.phase === 'pick' && !(app.seats.p2 && app.seats.p2.uid);
  const showEvent = S.event && S.event.seat === viewer() && ['invest', 'market', 'commit', 'respond', 'reveal'].includes(S.phase);
  return `<div class="grid">
    <div class="stack">
      ${waitingOther ? `<div class="callout warn"><b>Waiting for a rival</b><span>Send them the code <b class="mono">${esc(app.code)}</b>.</span></div>` : ''}
      ${app.mode === 'local' ? `<div class="viewbar" data-seat="${app.view}">Playing as ${seatTag(app.view)} · switches automatically, look away when it's not your turn</div>` : ''}
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
      const done = () => toast(`Copied ${app.code}`);
      try { navigator.clipboard.writeText(app.code).then(done, () => toast(`Room code: ${app.code}`)); } catch (err) { toast(`Room code: ${app.code}`); }
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
    case 'respond': { const f = F({}); return act(s, { k, tempTables: f.tt || 0, rush: f.rush || 0 }); }
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
