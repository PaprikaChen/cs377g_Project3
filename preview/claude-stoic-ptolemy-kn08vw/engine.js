// ===== Rules engine (v2): replays both players' action logs into the game state =====
// ⚠ Numbers marked TBD are placeholders until the team settles them.
const CFG = {
  rounds: 5, startCash: 100, startStars: 3,
  // price = income per table served (fixed, tips included)
  loc: {
    country: { name: 'Countryside', tag: '$$', open: 20, rent: 5, tables: 6, price: 8 },
    city:    { name: 'City', tag: '$$$', open: 35, rent: 12, tables: 4, price: 12 }
  },
  baseDemand: 6, tableCost: 6, maxTables: 14,
  // Stars: each star above 3 adds perStar maybe-customers (each comes with `chance`);
  //        each star below 3 puts perStar regulars at risk (each stays away with `loseChance`)
  rep: { perStar: 2, chance: 0.5, loseChance: 0.5 },
  // Live online market: all items on screen at once, both players click at the same time.
  //   Express arrives today; Regular arrives today or tomorrow (revealed when its cooldown bar ends).
  //   cd = cooldown in seconds after buying one; time = total seconds; jitter = ± how far the express/regular split drifts from half
  market: { stock: 15, time: 60, jitter: 2,
    exp: { price: 6, cd: 3 }, reg: { price: 3, cd: 5, tomorrow: 0.5 } },
  // Ad shop (all TBD): each day you see 1 location card + 2 general cards for your shop, and 3 random cards for your rival's shop.
  // Every card can be bought once. All cards go face down; the other player only sees how many.
  shop: { loc: 1, general: 2, rival: 3 },
  ads: {
    delivery: { side: 'self', loc: 'city', name: 'Delivery app spotlight', price: 6, n: 2, desc: '+2 delivery orders: they use food but no table' },
    lunch:    { side: 'self', loc: 'city', name: 'Office lunch deal', price: 4, n: 3, off: 4, desc: '3 guests for sure, each pays $4 less' },
    subway:   { side: 'self', loc: 'city', name: 'Subway poster', price: 10, n: 4, low: 2, lowChance: 0.3, desc: '+4 guests (30% chance it gets lost in the crowd: only 2)' },
    stall:    { side: 'self', loc: 'country', name: "Farmers' market stall", price: 5, n: 1, food: 1, desc: '+1 guest and 1 free food' },
    bus:      { side: 'self', loc: 'country', name: 'Tour bus stop', price: 8, n: 6, chance: 0.5, desc: '50%: a bus of 6 guests. Otherwise nobody' },
    wom:      { side: 'self', loc: 'country', name: 'Village word of mouth', price: 5, n: 1, desc: '+1 guest today and +1 every day after' },
    flyer:    { side: 'self', name: 'Flyers', price: 6, n: 2, desc: '+2 guests' },
    blogger:  { side: 'self', name: 'Food blogger visit', price: 9, n: 4, chance: 0.5, star: 0.3, desc: '50%: +4 guests. Turn nobody away that day: 30% chance of +1 star' },
    coupon:   { side: 'self', name: 'Opening coupon', price: 3, n: 3, off: 3, desc: '+3 guests, each pays $3 less' },
    fake:     { side: 'rival', name: 'False advertisement', price: 3, desc: 'Does nothing. Makes them over-prepare' },
    review:   { side: 'rival', name: 'Bad review', price: 6, n: 2, desc: 'They get 2 fewer guests' },
    poach:    { side: 'rival', name: 'Poach a guest', price: 7, n: 1, desc: '1 of their guests comes to you instead' },
    swamp:    { side: 'rival', name: 'Swamp them', price: 6, n: 3, desc: '+3 guests for them. Can they seat them all?' },
    fakebook: { side: 'rival', name: 'Fake booking', price: 5, tables: 2, desc: '2 of their tables sit reserved for nobody today' },
    corner:   { side: 'rival', name: 'Corner the rush supplier', price: 5, extra: 3, desc: 'Their rush food costs $3 more each today' }
  },
  // Service (all TBD). A shortage pops up only when tables or food run out. One action at a time.
  //   patience: seconds the waiting group stays; opTime: seconds per rush food / table borrow
  //   rush, borrow: price range [min, max]; borrowNo: chance the neighbour says no (no charge, still takes time)
  //   villager: chance villagers bring food when food runs short (countryside only)
  //   eventChance: chance of one event per day; food: give → foodGood chance +1 star, refuse → foodBad chance −1 star
  service: { patience: 8, opTime: 2, rush: [7, 10], borrow: [5, 8], borrowNo: 0.3,
    villager: 0.15, villagerGive: 2, eventChance: 0.6, foodGood: 0.2, foodBad: 0.5,
    propose: 0.5, tip: 20, fightTables: 2, fightFood: 2, fewer: 3 },
  // More than `share` of your tables empty at closing: `chance` of −1 star
  emptyTables: { share: 0.5, chance: 0.5 },
  // Between two days: `chance` a thief takes half your cash, at most `cap`
  robbery: { chance: 0.05, cap: 30 },
  voucher: 3,
  // Loans (off for now): set enabled to true to bring back the Build-phase loan and the automatic loan when rent can't be paid
  loan: { enabled: false, amount: 30, repay: 40 },
  starValue: 10, shady: { cash: 15, fine: 20 }, noshow: { pay: 30, tables: 2 }
};
const round2 = x => Math.round(x * 100) / 100;
const SEATS = ['p1', 'p2'];
const other = s => (s === 'p1' ? 'p2' : 'p1');

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function rand(seed, tag) {
  let a = cyrb53(seed + '|' + tag) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const d6 = (seed, tag) => 1 + Math.floor(rand(seed, tag)() * 6);
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const intIn = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
const between = (r, [lo, hi]) => lo + Math.floor(r * (hi - lo + 1));

// Hidden card placement: only the count per shop is public; which cards they are is locked with a checksum
const adHash = (c, salt) => String(cyrb53(`${c.self.join(',')}|${c.rival.join(',')}|${salt}`));
const adCost = c => [...c.self, ...c.rival].reduce((a, id) => a + CFG.ads[id].price, 0);

// ---------- market helpers (the page uses these too) ----------
function marketItems(seed, r) {
  const M = CFG.market, R = rand(seed, `mk${r}`);
  const nExp = r >= CFG.rounds ? M.stock : intIn(Math.round(M.stock / 2 + (R() * 2 - 1) * M.jitter), 0, M.stock);
  return shuffle([...Array(nExp).fill('exp'), ...Array(M.stock - nExp).fill('reg')], R);
}
const regTomorrow = (seed, r, i) => rand(seed, `reg${r}:${i}`)() < CFG.market.reg.tomorrow;

// ---------- service prices (the page shows them before you click) ----------
function opPrice(S, s, ep, i, a) {
  const C = CFG.service, R = rand(S.seed, `${a}${S.round}${s}:${ep}:${i}`);
  if (a === 'rush') return between(R(), C.rush) + (S.script[s].cornered ? CFG.ads.corner.extra : 0);
  return between(R(), C.borrow);
}
const borrowOk = (S, s, ep, i) => rand(S.seed, `bok${S.round}${s}:${ep}:${i}`)() >= CFG.service.borrowNo;

function newPlayer() {
  return { loc: null, cash: CFG.startCash, stars: CFG.startStars, tables: 0, ingr: 0, pending: 0, wom: 0,
    loan: false, shadyFrom: null, bankrupt: false, held: 0, ledger: [], history: [] };
}
function money(p, label, amt) { p.cash = round2(p.cash + amt); p.ledger.push({ label, amt: round2(amt) }); }
function note(p, label) { p.ledger.push({ label, amt: null }); }

// Expected customers before the doors open, for hints. selfCards = your own ad cards (known).
function expectedDemand(p, selfCards = []) {
  const d = p.stars - CFG.startStars, per = CFG.rep.perStar;
  const rep = d > 0 ? d * per * CFG.rep.chance : -(-d) * per * CFG.rep.loseChance;
  let ads = 0, adMin = 0, adMax = 0;
  for (const id of selfCards) {
    const A = CFG.ads[id];
    if (id === 'subway') { ads += A.n - (A.n - A.low) * A.lowChance; adMin += A.low; adMax += A.n; }
    else if (A.chance) { ads += A.n * A.chance; adMax += A.n; }
    else { ads += A.n; adMin += A.n; adMax += A.n; }
  }
  const base = CFG.baseDemand + p.wom;
  return { base, rep, ads, total: base + rep + ads,
    min: base - (d < 0 ? -d * per : 0) + adMin, max: base + (d > 0 ? d * per : 0) + adMax };
}
function capacityOf(p) {
  const t = Math.max(0, p.tables - p.held), i = p.ingr;
  return { tables: t, ingr: i, cap: Math.min(t, i) };
}

function init(seed) {
  const decks = {};
  for (const s of SEATS) decks[s] = shuffle([...Array(3).fill('shady'), ...Array(3).fill('noshow'), ...Array(4).fill('quiet')], rand(seed, 'deck' + s));
  return { seed, round: 0, phase: 'pick', decks, players: { p1: newPlayer(), p2: newPlayer() },
    events: {}, morning: {}, market: null, shops: {}, commits: {}, reveals: {}, script: {}, service: null, got: {}, result: null };
}

function startRound(S) {
  S.round++;
  for (const s of SEATS) {
    const p = S.players[s], L = CFG.loc[p.loc], m = { robbed: 0, arrived: p.pending };
    p.ledger = []; p.held = 0;
    if (S.round > 1) {
      const R = rand(S.seed, `rob${S.round}${s}`);
      if (R() < CFG.robbery.chance && p.cash > 0) {
        m.robbed = Math.min(CFG.robbery.cap, round2(p.cash / 2));
        money(p, 'Robbed overnight', -m.robbed);
      }
    }
    money(p, 'Rent', -L.rent);
    p.ingr = p.pending; p.pending = 0;
    if (m.arrived) note(p, `Regular delivery arrived ×${m.arrived}`);
    if (p.cash < 0 && CFG.loan.enabled && !p.loan) { p.loan = true; money(p, 'Forced loan', CFG.loan.amount); }
    if (p.cash < 0) p.bankrupt = true;
    S.morning[s] = m;
    S.events[s] = { type: S.decks[s][S.round - 1], choice: null };
  }
  if (S.players.p1.bankrupt || S.players.p2.bankrupt) return finish(S, 'bankrupt');
  S.phase = S.round > 1 ? 'morning' : 'invest';
}

function startMarket(S) {
  S.market = { items: marketItems(S.seed, S.round), owner: {}, bought: {} };
  S.phase = 'market';
}

function shopFor(S, s) {
  const p = S.players[s], R = rand(S.seed, `shop${S.round}${s}`), ids = Object.keys(CFG.ads), A = CFG.ads;
  const pick = (list, n) => shuffle(list.slice(), R).slice(0, n);
  return {
    self: [...pick(ids.filter(i => A[i].side === 'self' && A[i].loc === p.loc), CFG.shop.loc),
           ...pick(ids.filter(i => A[i].side === 'self' && !A[i].loc), CFG.shop.general)],
    rival: pick(ids.filter(i => A[i].side === 'rival'), CFG.shop.rival)
  };
}

// ---------- service ----------
// Everything random about today's service is rolled here, before anyone acts, so both browsers see the same script.
function prepService(S, s) {
  const p = S.players[s], o = other(s), L = CFG.loc[p.loc], C = CFG.service, A = CFG.ads;
  const r = rand(S.seed, `svc${S.round}${s}`), d100 = () => 1 + Math.floor(r() * 100);
  const info = [], mine = S.reveals[s].self, theirs = S.reveals[o].rival;
  const sc = { info, arrivals: [], mid: null, fewer: 0, fakeHeld: 0, cornered: false, stallFood: 0,
    blogger: false, rolls: { food: r(), blogger: r(), empty: r(), propose: r() } };
  // The one event of the day (or none)
  let ev = null;
  if (r() < C.eventChance) {
    const pool = ['food', 'fight', 'propose', p.loc === 'city' ? 'protest' : 'weather'];
    ev = pool[Math.floor(r() * pool.length)];
  }
  sc.event = ev;
  // Booking from the morning event
  const e = S.events[s];
  if (e && e.type === 'noshow') {
    const roll = d6(S.seed, `noshow${S.round}${s}`), arrive = roll >= 4;
    sc.noshow = { roll, arrive, choice: e.choice };
    info.push({ k: 'noshow', ...sc.noshow });
  }
  if (p.shadyFrom !== null && S.round > p.shadyFrom) {
    const roll = d6(S.seed, `shady${s}${S.round}`);
    sc.inspection = { roll, caught: roll === 1 };
    info.push({ k: 'inspect', ...sc.inspection });
  }
  if (ev === 'weather' || ev === 'protest') { sc.fewer = C.fewer; info.push({ k: 'event', ev, n: C.fewer }); }
  // Word of mouth from stars
  const diff = p.stars - CFG.startStars;
  let repGain = 0, repLoss = 0;
  if (diff > 0) for (let i = 0; i < diff * CFG.rep.perStar; i++) {
    const roll = d100(), need = Math.round(CFG.rep.chance * 100), ok = roll <= need;
    if (ok) repGain++; info.push({ k: 'rep', roll, need, ok });
  }
  if (diff < 0) for (let i = 0; i < -diff * CFG.rep.perStar; i++) {
    const roll = d100(), need = Math.round(CFG.rep.loseChance * 100), ok = roll <= need;
    if (ok) repLoss++; info.push({ k: 'lose', roll, need, ok });
  }
  // Flip every card in front of this shop, in a shuffled order
  const cards = shuffle([...mine.map(id => ({ id, from: 'self' })), ...theirs.map(id => ({ id, from: 'rival' }))], r);
  let minus = 0;
  const groups = [];
  for (const c of cards) {
    const a = A[c.id], f = { k: 'card', id: c.id, from: c.from, n: 0 };
    switch (c.id) {
      case 'flyer': case 'wom': case 'swamp': f.n = a.n; groups.push({ n: a.n, price: L.price, src: c.id }); break;
      case 'coupon': case 'lunch': f.n = a.n; groups.push({ n: a.n, price: L.price - a.off, src: c.id }); break;
      case 'delivery': f.n = a.n; groups.push({ n: a.n, price: L.price, src: c.id, noTable: true }); break;
      case 'subway': f.n = r() < a.lowChance ? a.low : a.n; groups.push({ n: f.n, price: L.price, src: c.id }); break;
      case 'bus': f.n = r() < a.chance ? a.n : 0; if (f.n) groups.push({ n: f.n, price: L.price, src: c.id }); break;
      case 'blogger': f.n = r() < a.chance ? a.n : 0; sc.blogger = f.n > 0; if (f.n) groups.push({ n: f.n, price: L.price, src: c.id }); break;
      case 'stall': f.n = a.n; f.food = a.food; sc.stallFood += a.food; groups.push({ n: a.n, price: L.price, src: c.id }); break;
      case 'review': f.n = -a.n; minus += a.n; break;
      case 'poach': f.n = -a.n; minus += a.n; break;
      case 'fakebook': f.tables = a.tables; sc.fakeHeld += a.tables; break;
      case 'corner': f.extra = a.extra; sc.cornered = true; break;
    }
    info.push(f);
  }
  if (S.reveals[s].rival.includes('poach')) { info.push({ k: 'poached', n: A.poach.n }); groups.push({ n: A.poach.n, price: L.price, src: 'poached' }); }
  const base = Math.max(0, CFG.baseDemand + repGain - repLoss - sc.fewer - minus);
  sc.arrivals = [{ n: base, price: L.price, src: 'regulars' }];
  if (p.wom) sc.arrivals.push({ n: p.wom, price: L.price, src: 'wom-old' });
  sc.arrivals.push(...groups);
  sc.repGain = repGain; sc.repLoss = repLoss; sc.base = base;
  // Mid-service events happen after the regulars are seated
  if (ev === 'food' || ev === 'fight' || ev === 'propose') sc.mid = ev;
  return sc;
}

// Runs the service with the player's choices. `ops` = [{ep, a:'rush'|'borrow'} | {a:'food', give}].
// `closed` = how many shortage episodes are finished; at the first open one (or an unanswered food event) it stops and
// returns `pending`, so the page can show the live situation. The engine calls it with closed = Infinity.
function serviceRun(S, s, ops = [], closed = Infinity) {
  const p = S.players[s], sc = S.script[s], C = CFG.service;
  const st = { cash: p.cash, tables: Math.max(0, p.tables - p.held - sc.fakeHeld), ingr: p.ingr + sc.stallFood, usedT: 0,
    served: 0, turned: 0, sales: 0, rush: { n: 0, cost: 0 }, borrow: { n: 0, cost: 0, no: 0 }, villagers: 0,
    lostTables: 0, food: null, fight: false, tip: 0, out: [], pending: null, demand: 0, deliv: 0 };
  // Every step carries a snapshot of the shop so the page can draw it (display only)
  const push = o => st.out.push({ ...o, snap: { tables: st.tables, usedT: st.usedT, ingr: st.ingr, served: st.served, turned: st.turned, deliv: st.deliv } });
  const maxOps = Math.floor(C.patience / C.opTime);
  let ep = -1;
  const can = g => Math.max(0, Math.min(st.ingr, g.noTable ? Infinity : st.tables - st.usedT));
  const arrive = g => {
    st.demand += g.n;
    if (g.n > 0 && can(g) < g.n) {
      ep++;
      const out = { k: 'short', ep, need: g.n, n: 0 };
      if (p.loc === 'country' && st.ingr < g.n && rand(S.seed, `vil${S.round}${s}:${ep}`)() < C.villager) {
        st.ingr += C.villagerGive; st.villagers += C.villagerGive; out.villagers = C.villagerGive;
      }
      const mine = ops.filter(o => o.ep === ep && (o.a === 'rush' || o.a === 'borrow')).slice(0, maxOps);
      mine.forEach((o, i) => {
        const price = opPrice(S, s, ep, i, o.a);
        if (o.a === 'rush') { if (st.cash < price) return; st.cash -= price; st.ingr++; st.rush.n++; st.rush.cost += price; out.n++; }
        else if (!borrowOk(S, s, ep, i)) st.borrow.no++;
        else { if (st.cash < price) return; st.cash -= price; st.tables++; st.borrow.n++; st.borrow.cost += price; out.n++; }
      });
      if (ep >= closed) { st.pending = { kind: 'short', ep, group: g, need: g.n, can: can(g), tries: mine.length, maxOps,
        shortOn: st.ingr < g.n ? (g.noTable || st.tables - st.usedT >= g.n ? ['ingr'] : ['ingr', 'tables']) : ['tables'], villagers: out.villagers || 0 }; return false; }
      push(out);
    }
    const seated = Math.min(g.n, can(g));
    st.ingr -= seated; if (!g.noTable) st.usedT += seated; else st.deliv += seated;
    st.served += seated; st.sales += seated * g.price; st.turned += g.n - seated;
    push({ k: 'arrive', src: g.src, n: g.n, seated, away: g.n - seated, noTable: !!g.noTable });
    return true;
  };
  for (const f of sc.info) push(f);
  if (!arrive(sc.arrivals[0])) return st;
  if (sc.mid === 'food') {
    const op = ops.find(o => o.a === 'food');
    if (!op && closed !== Infinity) { st.pending = { kind: 'food' }; return st; }
    const give = !!(op && op.give) && st.ingr >= 1;
    if (give) st.ingr--;
    st.food = give ? 'give' : 'refuse';
    push({ k: 'food', give });
  } else if (sc.mid === 'fight') {
    const lost = Math.min(C.fightTables, p.tables);
    st.tables = Math.max(0, st.tables - lost); st.lostTables = lost; st.ingr = Math.max(0, st.ingr - C.fightFood); st.fight = true;
    push({ k: 'fight', tables: lost, food: C.fightFood });
  } else if (sc.mid === 'propose') {
    const ok = sc.rolls.propose < C.propose;
    if (ok) { st.tip = C.tip; st.sales += C.tip; }
    push({ k: 'propose', ok, tip: C.tip });
  }
  for (const g of sc.arrivals.slice(1)) if (!arrive(g)) return st;
  if (sc.noshow && sc.noshow.arrive && sc.noshow.choice === 'hold') push({ k: 'booking', pay: CFG.noshow.pay });
  st.empty = Math.max(0, st.tables - st.usedT);
  push({ k: 'close', served: st.served, turned: st.turned, empty: st.empty, tables: st.tables });
  return st;
}

function finishService(S, s, ops) {
  const p = S.players[s], sc = S.script[s], L = CFG.loc[p.loc];
  const v = serviceRun(S, s, Array.isArray(ops) ? ops.slice(0, 200) : []);
  if (v.rush.n) money(p, `Rush food ×${v.rush.n}`, -v.rush.cost);
  if (v.borrow.n) money(p, `Borrowed tables ×${v.borrow.n}`, -v.borrow.cost);
  if (v.villagers) note(p, `Villagers brought food ×${v.villagers}`);
  if (v.served) money(p, `Sales (${v.served} guests)`, v.sales - v.tip);
  if (v.tip) money(p, 'Proposal tip', v.tip);
  if (sc.noshow && sc.noshow.arrive && sc.noshow.choice === 'hold') money(p, 'Reservation paid', CFG.noshow.pay);
  if (sc.inspection && sc.inspection.caught) { money(p, 'Inspector fine', -CFG.shady.fine); }
  if (v.lostTables) { p.tables -= v.lostTables; note(p, `Fight broke ${v.lostTables} tables`); }
  if (S.reveals[s].self.includes('wom')) p.wom += CFG.ads.wom.n;
  p.ingr = v.ingr;
  return { ...v, base: sc.base, repGain: sc.repGain, repLoss: sc.repLoss, noshow: sc.noshow || null, inspection: sc.inspection || null,
    event: sc.event, vouchers: 0, ops: (ops || []).length };
}

function review(S) {
  const ES = CFG.emptyTables, C = CFG.service;
  for (const s of SEATS) {
    const p = S.players[s], v = S.service[s], sc = S.script[s];
    const unv = v.turned - v.vouchers;
    let delta = v.turned === 0 ? 1 : unv === 0 ? 0 : unv <= 3 ? -1 : -2;
    const why = [];
    if (v.turned === 0) why.push('served everyone +1');
    else if (unv > 0) why.push(`turned away ${unv} ${unv <= 3 ? '−1' : '−2'}`);
    if (v.noshow && v.noshow.choice === 'release' && v.noshow.arrive) { delta -= 1; why.push('reservation had no seat −1'); }
    if (v.inspection && v.inspection.caught) { delta -= 1; why.push('inspector −1'); p.shadyFrom = null; }
    if (v.food === 'give' && sc.rolls.food < C.foodGood) { delta += 1; why.push('kindness paid off +1'); }
    if (v.food === 'refuse' && sc.rolls.food < C.foodBad) { delta -= 1; why.push('word got out you said no −1'); }
    if (sc.blogger && v.turned === 0 && sc.rolls.blogger < CFG.ads.blogger.star) { delta += 1; why.push('blogger loved it +1'); }
    v.emptyHit = v.tables > 0 && v.empty > v.tables * ES.share && sc.rolls.empty < ES.chance;
    if (v.emptyHit) { delta -= 1; why.push(`${v.empty} empty tables −1`); }
    delta = Math.max(-2, Math.min(2, delta));
    const before = p.stars;
    p.stars = Math.max(1, Math.min(5, p.stars + delta));
    const spoiled = Math.max(0, p.ingr);
    if (spoiled) note(p, `${spoiled} food spoiled`);
    p.ingr = 0;
    v.starsBefore = before; v.starsAfter = p.stars; v.why = why; v.spoiled = spoiled;
    const income = round2(p.ledger.filter(x => x.amt > 0).reduce((a, x) => a + x.amt, 0));
    const spend = round2(p.ledger.filter(x => x.amt < 0).reduce((a, x) => a + x.amt, 0));
    p.history.push({ round: S.round, demand: v.demand, cap: v.served + v.empty, served: v.served, turned: v.turned,
      spoiled, income, spend, cash: p.cash, stars: p.stars, ledger: p.ledger.slice() });
  }
  S.phase = 'report';
}

function finish(S, reason) {
  const score = {};
  for (const s of SEATS) {
    const p = S.players[s];
    score[s] = { cash: p.cash, stars: p.stars, starPts: p.stars * CFG.starValue,
      loan: p.loan ? -CFG.loan.repay : 0, total: round2(p.cash + p.stars * CFG.starValue - (p.loan ? CFG.loan.repay : 0)) };
  }
  let winner;
  if (reason === 'bankrupt') {
    const b1 = S.players.p1.bankrupt, b2 = S.players.p2.bankrupt;
    winner = b1 && b2 ? (score.p1.total === score.p2.total ? 'draw' : score.p1.total > score.p2.total ? 'p1' : 'p2') : b1 ? 'p2' : 'p1';
  } else if (score.p1.total !== score.p2.total) winner = score.p1.total > score.p2.total ? 'p1' : 'p2';
  else if (S.players.p1.stars !== S.players.p2.stars) winner = S.players.p1.stars > S.players.p2.stars ? 'p1' : 'p2';
  else winner = 'draw';
  S.result = { reason, score, winner };
  S.phase = 'over';
}

function expected(S) {
  const r = S.round, need = { p1: null, p2: null };
  switch (S.phase) {
    case 'pick': need.p1 = need.p2 = '0:pick'; break;
    case 'morning': need.p1 = need.p2 = `${r}:morning`; break;
    case 'invest': need.p1 = need.p2 = `${r}:invest`; break;
    case 'market': need.p1 = need.p2 = `${r}:market`; break;
    case 'commit': need.p1 = need.p2 = `${r}:commit`; break;
    case 'reveal': need.p1 = need.p2 = `${r}:reveal`; break;
    case 'service': need.p1 = need.p2 = `${r}:service`; break;
    case 'voucher':
      for (const s of SEATS) if (S.service[s].turned > 0 && S.players[s].cash >= CFG.voucher) need[s] = `${r}:voucher`;
      break;
    case 'report': need.p1 = need.p2 = `${r}:next`; break;
  }
  return need;
}

function validCards(list, allowed) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const id of list) { if (!allowed.includes(id) || out.includes(id)) return null; out.push(id); }
  return out;
}

function apply(S, got) {
  const r = S.round;
  switch (S.phase) {
    case 'pick': {
      for (const s of SEATS) {
        const p = S.players[s], loc = got[s].loc === 'city' ? 'city' : 'country', L = CFG.loc[loc];
        p.loc = loc; p.tables = L.tables; p.cash -= L.open;
        p.history = [];
      }
      startRound(S); break;
    }
    case 'morning': S.phase = 'invest'; break;
    case 'invest': {
      for (const s of SEATS) {
        const p = S.players[s], a = got[s], e = S.events[s];
        if (e.type === 'shady') {
          e.choice = a.choice === 'accept' ? 'accept' : 'decline';
          if (e.choice === 'accept') { money(p, 'Shady deal', CFG.shady.cash); p.shadyFrom = r; }
        } else if (e.type === 'noshow') {
          e.choice = a.choice === 'hold' ? 'hold' : 'release';
          if (e.choice === 'hold') p.held = CFG.noshow.tables;
        }
        if (a.loan && CFG.loan.enabled && !p.loan) { p.loan = true; money(p, 'Loan', CFG.loan.amount); }
        const room = CFG.maxTables - p.tables;
        const t = Math.min(intIn(a.tables, 0, room), Math.floor(Math.max(0, p.cash) / CFG.tableCost));
        if (t) { money(p, `New tables ×${t}`, -t * CFG.tableCost); p.tables += t; }
      }
      startMarket(S); break;
    }
    case 'market': {
      // Who got which item was settled live (first click wins). If both logs somehow claim one item, P1 keeps it.
      const m = S.market, M = CFG.market;
      for (const s of SEATS) {
        const p = S.players[s], b = { exp: 0, today: 0, tomorrow: 0, spent: 0, items: [] };
        for (const raw of Array.isArray(got[s].buys) ? got[s].buys : []) {
          const i = intIn(raw, -1, M.stock - 1);
          if (i < 0 || m.owner[i]) continue;
          const type = m.items[i], price = M[type].price;
          if (p.cash < price) continue;
          m.owner[i] = s; p.cash = round2(p.cash - price); b.spent += price; b.items.push(i);
          if (type === 'exp') { b.exp++; p.ingr++; }
          else if (r < CFG.rounds && regTomorrow(S.seed, r, i)) { b.tomorrow++; p.pending++; }
          else { b.today++; p.ingr++; }
        }
        if (b.exp) p.ledger.push({ label: `Express food ×${b.exp}`, amt: -b.exp * M.exp.price });
        if (b.today + b.tomorrow) p.ledger.push({ label: `Regular food ×${b.today + b.tomorrow}${b.tomorrow ? ` (${b.tomorrow} tomorrow)` : ''}`, amt: -(b.today + b.tomorrow) * M.reg.price });
        m.bought[s] = b;
      }
      for (const s of SEATS) S.shops[s] = shopFor(S, s);
      S.phase = 'commit'; break;
    }
    case 'commit': {
      S.commits = {}; S.reveals = {};
      for (const s of SEATS) {
        const a = got[s], sh = S.shops[s];
        S.commits[s] = { h: String(a.h), nSelf: intIn(a.nSelf, 0, sh.self.length), nRival: intIn(a.nRival, 0, sh.rival.length) };
      }
      S.phase = 'reveal'; break;
    }
    case 'reveal': {
      for (const s of SEATS) {
        const p = S.players[s], a = got[s], cm = S.commits[s], sh = S.shops[s];
        let c = { self: validCards(a.self, sh.self), rival: validCards(a.rival, sh.rival) };
        let ok = !!(c.self && c.rival) && adHash(c, a.salt) === cm.h && c.self.length === cm.nSelf && c.rival.length === cm.nRival;
        // A failed check makes every card do nothing (and cost nothing)
        if (!ok) c = { self: [], rival: [] };
        while (adCost(c) > Math.max(0, p.cash)) (c.rival.length ? c.rival : c.self).pop();
        const cost = adCost(c);
        if (cost) money(p, `Ad cards ×${c.self.length + c.rival.length}`, -cost);
        S.reveals[s] = { ...c, ok };
      }
      for (const s of SEATS) S.script[s] = prepService(S, s);
      S.service = null;
      S.phase = 'service'; break;
    }
    case 'service': {
      S.service = {};
      for (const s of SEATS) S.service[s] = finishService(S, s, got[s].ops);
      const needV = SEATS.some(s => S.service[s].turned > 0 && S.players[s].cash >= CFG.voucher);
      if (needV) S.phase = 'voucher'; else review(S);
      break;
    }
    case 'voucher': {
      for (const s of SEATS) {
        if (!got[s]) continue;
        const p = S.players[s], v = S.service[s];
        const n = Math.min(intIn(got[s].n, 0, v.turned), Math.floor(p.cash / CFG.voucher));
        if (n) { money(p, `Comp vouchers ×${n}`, -n * CFG.voucher); v.vouchers = n; }
      }
      review(S); break;
    }
    case 'report': {
      if (r >= CFG.rounds) finish(S, 'done'); else startRound(S);
      break;
    }
  }
}

function simulate(seed, logs) {
  const S = init(seed), ptr = { p1: 0, p2: 0 };
  const take = (seat, key) => {
    const L = logs[seat] || [];
    while (ptr[seat] < L.length) { const a = L[ptr[seat]++]; if (a && a.k === key) return a; }
    return null;
  };
  for (let guard = 0; guard < 500 && S.phase !== 'over'; guard++) {
    const need = expected(S);
    for (const s of SEATS) if (need[s] && !S.got[s]) { const a = take(s, need[s]); if (a) S.got[s] = a; }
    if (SEATS.every(s => !need[s] || S.got[s])) { const g = S.got; S.got = {}; apply(S, g); continue; }
    break;
  }
  const need = expected(S);
  S.waiting = { p1: need.p1 && !S.got.p1 ? need.p1 : null, p2: need.p2 && !S.got.p2 ? need.p2 : null };
  S.submitted = { p1: !!(need.p1 && S.got.p1), p2: !!(need.p2 && S.got.p2) };
  return S;
}

if (typeof module !== 'undefined') module.exports = { CFG, simulate, adHash, adCost, capacityOf, expectedDemand, expected,
  marketItems, regTomorrow, serviceRun, opPrice, borrowOk };
