// ===== Rules engine: replays both players' action logs into the game state =====
const CFG = {
  rounds: 5, startCash: 100, wage: 4, startStaff: 2, startStars: 3,
  // price = 每桌收入（餐费含小费，固定）
  // ⚠ 标“待定”的数字是占位值，等小组定稿
  loc: {
    country: { name: '乡村店', tag: '$$', open: 20, rent: 5, tables: 6, price: 8, free: 2 },
    city:    { name: '城市店', tag: '$$$', open: 35, rent: 12, tables: 4, price: 12, free: 0 }
  },
  baseDemand: 6, perStaff: 3, tableCost: 6, maxTables: 14, maxStaff: 6,
  // 广告牌（价格待定）：每天可以买任意张，背面朝上放在自己或对手店前
  //   real  真广告牌的价格，翻开后带来 customers 位潜在客人，每人按 chance 概率到店
  //   blank 空牌的价格，翻开后什么也没有，只用来虚张声势
  //   maxPerShop 每天往一家店前最多放几张
  ad: { real: 6, blank: 2, customers: 2, chance: 0.6, maxPerShop: 4 },
  // 声誉（概率待定）：每高于 3 星一颗，多 perStar 位潜在客人，每人按 chance 到店；
  //                   每低于 3 星一颗，有 perStar 位基础客人各按 loseChance 的概率不来
  rep: { perStar: 2, chance: 0.5, loseChance: 0.5 },
  // 翻牌前的临时扩容（价格待定，只在当天有效）
  //   tempStaff 临时帮工，每人能多服务 perStaff 位客人；rushIngr 紧急补货，每份食材的价格
  respond: { tempStaff: 6, tempStaffMax: 3, rushIngr: 3, rushIngrMax: 8 },
  market: { stock: 24, tiers: [[8, 1], [16, 2], [24, 3]], maxPerTurn: 3 },
  voucher: 3, loan: { amount: 30, repay: 40 },
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
// 广告牌的暗中提交：只公开每家店前的张数，真假组合用校验码锁住
const adHash = (c, salt) => String(cyrb53(`${c.selfReal}|${c.selfBlank}|${c.rivalReal}|${c.rivalBlank}|${salt}`));
const adCost = c => (c.selfReal + c.rivalReal) * CFG.ad.real + (c.selfBlank + c.rivalBlank) * CFG.ad.blank;

function priceOf(sold, n) {
  let cost = 0;
  for (let i = 0; i < n; i++) {
    const idx = sold + i;
    cost += CFG.market.tiers.find(([upTo]) => idx < upTo)[1];
  }
  return cost;
}
function maxAffordable(sold, cash, cap) {
  let n = 0;
  while (n < cap && sold + n < CFG.market.stock && priceOf(sold, n + 1) <= cash) n++;
  return n;
}
const intIn = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));

function newPlayer() {
  return { loc: null, cash: CFG.startCash, stars: CFG.startStars, tables: 0, staff: CFG.startStaff,
    ingr: 0, temp: 0, loan: false, shadyFrom: null, bankrupt: false, held: 0, ledger: [], history: [] };
}
function money(p, label, amt) { p.cash = round2(p.cash + amt); p.ledger.push({ label, amt: round2(amt) }); }
function note(p, label) { p.ledger.push({ label, amt: null }); }

// Expected customers before the doors open (the page shows this as a forecast; the real number is rolled at service).
// realCards = 确定是真的广告牌；unknownCards = 不知真假的牌（最多都是真的）
function expectedDemand(p, realCards = 0, unknownCards = 0) {
  const d = p.stars - CFG.startStars, per = CFG.rep.perStar;
  const rep = d > 0 ? d * per * CFG.rep.chance : -(-d) * per * CFG.rep.loseChance;
  const ads = realCards * CFG.ad.customers * CFG.ad.chance;
  return { base: CFG.baseDemand, rep, ads, total: CFG.baseDemand + rep + ads,
    min: CFG.baseDemand - (d < 0 ? -d * per : 0),
    max: CFG.baseDemand + (d > 0 ? d * per : 0) + (realCards + unknownCards) * CFG.ad.customers };
}
function capacityOf(p) {
  const t = Math.max(0, p.tables - p.held), s = (p.staff + p.temp) * CFG.perStaff, i = p.ingr;
  return { tables: t, staff: s, ingr: i, cap: Math.min(t, s, i) };
}

function init(seed) {
  const r = rand(seed, 'deck');
  const deck = [...Array(3).fill('shady'), ...Array(3).fill('noshow'), ...Array(4).fill('quiet')];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return { seed, round: 0, phase: 'pick', deck, players: { p1: newPlayer(), p2: newPlayer() },
    event: null, market: null, commits: {}, reveals: {}, service: null, got: {}, result: null, feed: [] };
}

function richer(S, tag) {
  const a = S.players.p1.cash, b = S.players.p2.cash;
  if (a !== b) return a > b ? 'p1' : 'p2';
  return rand(S.seed, tag)() < 0.5 ? 'p1' : 'p2';
}

function startRound(S) {
  S.round++;
  for (const s of SEATS) {
    const p = S.players[s], L = CFG.loc[p.loc];
    p.ledger = []; p.held = 0; p.temp = 0;
    money(p, '房租', -L.rent);
    money(p, `工资（${p.staff} 名员工）`, -p.staff * CFG.wage);
    p.ingr = L.free;
    if (L.free) note(p, `本地农场免费食材 ${L.free} 份`);
    if (p.cash < 0 && !p.loan) { p.loan = true; money(p, '付不起开支，被迫贷款', CFG.loan.amount); }
    if (p.cash < 0) p.bankrupt = true;
  }
  if (S.players.p1.bankrupt || S.players.p2.bankrupt) return finish(S, 'bankrupt');
  const type = S.deck[S.round - 1];
  if (type === 'shady') S.event = { type, seat: other(richer(S, `ev${S.round}`)), choice: null };
  else if (type === 'noshow') S.event = { type, seat: richer(S, `ev${S.round}`), choice: null };
  else S.event = { type, seat: null, choice: null };
  S.phase = S.event.seat ? 'event' : 'invest';
}

function startMarket(S) {
  const a = S.players.p1.cash, b = S.players.p2.cash;
  const first = a !== b ? (a < b ? 'p1' : 'p2') : (rand(S.seed, `mk${S.round}`)() < 0.5 ? 'p1' : 'p2');
  S.market = { sold: 0, turn: first, passed: { p1: false, p2: false }, step: 0, first, buys: { p1: 0, p2: 0 }, spent: { p1: 0, p2: 0 }, cells: [] };
  S.phase = 'market';
}

// Opening the doors: every random roll is recorded in `steps`, in the order the page plays them back.
function runService(S) {
  S.service = {};
  for (const s of SEATS) {
    const p = S.players[s], o = other(s), L = CFG.loc[p.loc];
    const r = rand(S.seed, `svc${S.round}${s}`), d100 = () => 1 + Math.floor(r() * 100);
    const steps = [], mine = S.reveals[s].self, theirs = S.reveals[o].rival;
    const adsSelf = mine.real, adsRival = theirs.real;
    const base = CFG.baseDemand, diff = p.stars - CFG.startStars;
    steps.push({ k: 'base', n: base });
    let repGain = 0, repLoss = 0;
    if (diff > 0) for (let i = 0; i < diff * CFG.rep.perStar; i++) {
      const roll = d100(), need = Math.round(CFG.rep.chance * 100), ok = roll <= need;
      if (ok) repGain++; steps.push({ k: 'rep', roll, need, ok });
    }
    if (diff < 0) for (let i = 0; i < -diff * CFG.rep.perStar; i++) {
      const roll = d100(), need = Math.round(CFG.rep.loseChance * 100), ok = roll <= need;
      if (ok) repLoss++; steps.push({ k: 'lose', roll, need, ok });
    }
    // Flip every card in front of this shop in a shuffled order; each real card then rolls for its customers.
    const cards = [];
    for (const [from, c] of [['self', mine], ['rival', theirs]]) {
      for (let i = 0; i < c.real; i++) cards.push({ from, real: true });
      for (let i = 0; i < c.blank; i++) cards.push({ from, real: false });
    }
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    let adSelfIn = 0, adRivalIn = 0;
    cards.forEach((card, idx) => {
      steps.push({ k: 'card', from: card.from, real: card.real, n: idx + 1, of: cards.length });
      if (!card.real) return;
      for (let i = 0; i < CFG.ad.customers; i++) {
        const roll = d100(), need = Math.round(CFG.ad.chance * 100), ok = roll <= need;
        if (ok) { if (card.from === 'self') adSelfIn++; else adRivalIn++; }
        steps.push({ k: 'ad', from: card.from, roll, need, ok });
      }
    });
    const demand = Math.max(0, base + repGain - repLoss + adSelfIn + adRivalIn);
    steps.push({ k: 'total', demand });
    let noshow = null;
    if (S.event && S.event.type === 'noshow' && S.event.seat === s) {
      const roll = d6(S.seed, `noshow${S.round}`), arrive = roll >= 4;
      noshow = { roll, arrive, choice: S.event.choice };
      steps.push({ k: 'noshow', ...noshow });
      if (S.event.choice === 'hold' && arrive) money(p, '预订客人到场付款', CFG.noshow.pay);
    }
    const c = capacityOf(p);
    const served = Math.min(demand, c.cap), turned = demand - served;
    const limits = demand > c.cap ? ['tables', 'staff', 'ingr'].filter(k => c[k] === c.cap) : [];
    steps.push({ k: 'seat', served, cap: c.cap, limits });
    if (turned) steps.push({ k: 'turned', n: turned });
    const meals = served * L.price;
    if (served) money(p, `营业收入（${served} 桌 × $${L.price}）`, meals);
    steps.push({ k: 'sum', meals });
    S.service[s] = { base, repGain, repLoss, adsSelf, adsRival, adSelfIn, adRivalIn, demand, ...c, served, turned,
      limits, noshow, vouchers: 0, meals, cards: { mine, theirs }, temp: p.temp, steps };
  }
  const needV = SEATS.some(s => S.service[s].turned > 0 && S.players[s].cash >= CFG.voucher);
  if (needV) S.phase = 'voucher'; else review(S);
}

function review(S) {
  for (const s of SEATS) {
    const p = S.players[s], v = S.service[s];
    const unv = v.turned - v.vouchers;
    let delta = v.turned === 0 ? 1 : unv === 0 ? 0 : unv <= 3 ? -1 : -2;
    const why = [];
    if (v.turned === 0) why.push('接待了所有客人 +1');
    else if (unv > 0) why.push(`拒绝了 ${unv} 位客人 ${unv <= 3 ? -1 : -2}`);
    if (v.noshow && v.noshow.choice === 'release' && v.noshow.arrive) { delta -= 1; why.push('预订客人到场却没座位 −1'); }
    let inspection = null;
    if (p.shadyFrom !== null && S.round > p.shadyFrom) {
      const roll = d6(S.seed, `shady${s}${S.round}`);
      inspection = { roll, caught: roll === 1 };
      if (roll === 1) { money(p, '检查员上门罚款', -CFG.shady.fine); delta -= 1; why.push('检查员上门 −1'); p.shadyFrom = null; }
    }
    delta = Math.max(-2, delta);
    const before = p.stars;
    p.stars = Math.max(1, Math.min(5, p.stars + delta));
    const spoiled = Math.max(0, p.ingr - v.served);
    if (spoiled) note(p, `${spoiled} 份食材过期`);
    p.ingr = 0;
    v.starsBefore = before; v.starsAfter = p.stars; v.why = why; v.spoiled = spoiled; v.inspection = inspection;
    const income = round2(p.ledger.filter(x => x.amt > 0).reduce((a, x) => a + x.amt, 0));
    const spend = round2(p.ledger.filter(x => x.amt < 0).reduce((a, x) => a + x.amt, 0));
    p.history.push({ round: S.round, demand: v.demand, cap: v.cap, served: v.served, turned: v.turned,
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
    case 'event': need[S.event.seat] = `${r}:event`; break;
    case 'invest': need.p1 = need.p2 = `${r}:invest`; break;
    case 'market': need[S.market.turn] = `${r}:market:${S.market.step}`; break;
    case 'commit': need.p1 = need.p2 = `${r}:commit`; break;
    case 'respond': need.p1 = need.p2 = `${r}:respond`; break;
    case 'reveal': need.p1 = need.p2 = `${r}:reveal`; break;
    case 'voucher':
      for (const s of SEATS) if (S.service[s].turned > 0 && S.players[s].cash >= CFG.voucher) need[s] = `${r}:voucher`;
      break;
    case 'report': need.p1 = need.p2 = `${r}:next`; break;
  }
  return need;
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
    case 'event': {
      const s = S.event.seat, p = S.players[s], a = got[s];
      if (S.event.type === 'shady') {
        S.event.choice = a.choice === 'accept' ? 'accept' : 'decline';
        if (S.event.choice === 'accept') { money(p, '可疑客户的交易', CFG.shady.cash); p.shadyFrom = r; }
      } else {
        S.event.choice = a.choice === 'hold' ? 'hold' : 'release';
        if (S.event.choice === 'hold') p.held = CFG.noshow.tables;
      }
      S.phase = 'invest'; break;
    }
    case 'invest': {
      for (const s of SEATS) {
        const p = S.players[s], a = got[s];
        if (a.loan && !p.loan) { p.loan = true; money(p, '贷款', CFG.loan.amount); }
        const room = CFG.maxTables - p.tables;
        const t = Math.min(intIn(a.tables, 0, room), Math.floor(Math.max(0, p.cash) / CFG.tableCost));
        if (t) { money(p, `新增 ${t} 张桌子`, -t * CFG.tableCost); p.tables += t; }
        const hire = intIn(a.hire, 0, CFG.maxStaff), fire = intIn(a.fire, 0, CFG.maxStaff);
        const ns = Math.max(1, Math.min(CFG.maxStaff, p.staff + hire - fire));
        if (ns > p.staff) note(p, `雇用 ${ns - p.staff} 名员工（下回合起付工资）`);
        if (ns < p.staff) note(p, `解雇 ${p.staff - ns} 名员工`);
        p.staff = ns;
      }
      startMarket(S); break;
    }
    case 'market': {
      const m = S.market, s = m.turn, p = S.players[s];
      const n = Math.min(intIn(got[s].n, 0, CFG.market.maxPerTurn), maxAffordable(m.sold, p.cash, CFG.market.maxPerTurn));
      if (n === 0) m.passed[s] = true;
      else {
        const cost = priceOf(m.sold, n);
        m.sold += n; p.ingr += n; p.cash -= cost; m.buys[s] += n; m.spent[s] += cost;
        for (let i = 0; i < n; i++) m.cells.push(s);
      }
      if (m.sold >= CFG.market.stock) m.passed.p1 = m.passed.p2 = true;
      m.step++;
      const o = other(s);
      if (m.passed.p1 && m.passed.p2) {
        for (const q of SEATS) if (m.buys[q]) S.players[q].ledger.push({ label: `买入食材 ${m.buys[q]} 份`, amt: -m.spent[q] });
        S.phase = 'commit';
      } else m.turn = !m.passed[o] ? o : s;
      break;
    }
    case 'commit': {
      S.commits = {}; S.reveals = {};
      for (const s of SEATS) {
        const a = got[s], m = CFG.ad.maxPerShop;
        S.commits[s] = { h: String(a.h), nSelf: intIn(a.nSelf, 0, m), nRival: intIn(a.nRival, 0, m) };
      }
      S.phase = 'respond'; break;
    }
    case 'respond': {
      const R = CFG.respond;
      for (const s of SEATS) {
        const p = S.players[s], a = got[s];
        const staff = Math.min(intIn(a.temp, 0, R.tempStaffMax), Math.floor(Math.max(0, p.cash) / R.tempStaff));
        if (staff) { money(p, `临时帮工 ${staff} 人`, -staff * R.tempStaff); p.temp = staff; }
        const rush = Math.min(intIn(a.rush, 0, R.rushIngrMax), Math.floor(Math.max(0, p.cash) / R.rushIngr));
        if (rush) { money(p, `紧急补货 ${rush} 份`, -rush * R.rushIngr); p.ingr += rush; }
      }
      S.phase = 'reveal'; break;
    }
    case 'reveal': {
      for (const s of SEATS) {
        const p = S.players[s], a = got[s], cm = S.commits[s], m = CFG.ad.maxPerShop;
        const c = { selfReal: intIn(a.selfReal, 0, m), selfBlank: intIn(a.selfBlank, 0, m),
          rivalReal: intIn(a.rivalReal, 0, m), rivalBlank: intIn(a.rivalBlank, 0, m) };
        let ok = adHash(c, a.salt) === cm.h && c.selfReal + c.selfBlank === cm.nSelf && c.rivalReal + c.rivalBlank === cm.nRival;
        // A failed check turns every card into a blank (the counts everyone saw stay the same).
        if (!ok) { c.selfReal = 0; c.selfBlank = cm.nSelf; c.rivalReal = 0; c.rivalBlank = cm.nRival; }
        const cost = adCost(c);
        if (cost) money(p, `广告牌（真 ${c.selfReal + c.rivalReal} 张，空 ${c.selfBlank + c.rivalBlank} 张）`, -cost);
        S.reveals[s] = { self: { real: c.selfReal, blank: c.selfBlank }, rival: { real: c.rivalReal, blank: c.rivalBlank }, ok };
      }
      runService(S); break;
    }
    case 'voucher': {
      for (const s of SEATS) {
        if (!got[s]) continue;
        const p = S.players[s], v = S.service[s];
        const n = Math.min(intIn(got[s].n, 0, v.turned), Math.floor(p.cash / CFG.voucher));
        if (n) { money(p, `补偿券 ${n} 张`, -n * CFG.voucher); v.vouchers = n; }
      }
      review(S); break;
    }
    case 'report': {
      if (S.round >= CFG.rounds) finish(S, 'done'); else startRound(S);
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

if (typeof module !== 'undefined') module.exports = { CFG, simulate, adHash, adCost, priceOf, maxAffordable, capacityOf, expectedDemand, expected };
