const E = require('../engine.js');
function bot(S, seat, rnd, priv) {
  const k = S.waiting[seat];
  const pickSome = list => list.filter(() => rnd() < 0.4);
  switch (S.phase) {
    case 'pick': return { k, loc: rnd() < 0.5 ? 'city' : 'country' };
    case 'morning': return { k };
    case 'invest': return { k, tables: Math.floor(rnd() * 3), choice: rnd() < .5 ? (rnd() < .5 ? 'accept' : 'hold') : 'decline', loan: rnd() < 0.1 };
    case 'market': {
      // Random items; sometimes both bots claim the same one (the engine must sort it out)
      const buys = [];
      for (let i = 0; i < E.CFG.market.stock; i++) if (rnd() < 0.35) buys.push(i);
      return { k, buys };
    }
    case 'commit': {
      const sh = S.shops[seat], c = { self: pickSome(sh.self), rival: pickSome(sh.rival) }, salt = String(rnd());
      priv[seat] = { ...c, salt };
      return { k, h: E.adHash(c, salt), nSelf: c.self.length, nRival: c.rival.length };
    }
    case 'reveal': return { k, ...(rnd() < 0.03 ? { ...priv[seat], self: ['flyer'] } : priv[seat]) };
    case 'service': {
      // Play the service like the page does: close each shortage after a few random actions
      const ops = []; let closed = 0;
      for (let guard = 0; guard < 50; guard++) {
        const v = E.serviceRun(S, seat, ops, closed);
        if (!v.pending) break;
        if (v.pending.kind === 'food') { ops.push({ a: 'food', give: rnd() < 0.5 }); continue; }
        if (v.pending.can >= v.pending.need || v.pending.tries >= v.pending.maxOps || rnd() < 0.3) { closed++; continue; }
        ops.push({ ep: v.pending.ep, a: rnd() < 0.5 ? 'rush' : 'borrow' });
      }
      return { k, ops };
    }
    case 'voucher': return { k, n: Math.floor(rnd() * 3) };
    case 'report': return { k };
  }
}
let mul = 7, wins = { p1: 0, p2: 0, draw: 0 }, reasons = {}, stats = { turned: 0, served: 0, days: 0, robbed: 0 };
const rnd = () => { mul = (mul * 16807) % 2147483647; return mul / 2147483647; };
for (let g = 0; g < 2000; g++) {
  const seed = 'seed' + g, logs = { p1: [], p2: [] }, priv = {};
  let S, steps = 0;
  while (true) {
    S = E.simulate(seed, logs);
    if (S.phase === 'over') break;
    let acted = false;
    for (const s of ['p1', 'p2']) if (S.waiting[s]) {
      const a = bot(S, s, rnd, priv); logs[s].push(a); acted = true;
      if (rnd() < 0.05) logs[s].push({ ...a }); // duplicate submission occasionally
      break; // act one at a time to mimic async
    }
    if (!acted) { console.log('STUCK', seed, S.phase, S.waiting, S.submitted); process.exit(1); }
    if (++steps > 2000) { console.log('LOOP', seed); process.exit(1); }
  }
  wins[S.result.winner]++; reasons[S.result.reason] = (reasons[S.result.reason] || 0) + 1;
  for (const s of ['p1', 'p2']) {
    const p = S.players[s];
    if (p.stars < 1 || p.stars > 5) { console.log('stars', p); process.exit(1); }
    if (p.tables < 0 || p.pending < 0) { console.log('negative', p); process.exit(1); }
    for (const h of p.history) { stats.turned += h.turned; stats.served += h.served; stats.days++; }
    for (const h of p.history) for (const l of h.ledger) if (l.label === 'Robbed overnight') stats.robbed++;
  }
  if (g === 3) console.log(JSON.stringify(S.result), S.players.p1.history.map(h => [h.round, h.demand, h.cap, h.served, h.turned, h.cash, h.stars]));
}
console.log(wins, reasons, { avgServed: (stats.served / stats.days).toFixed(2), avgTurned: (stats.turned / stats.days).toFixed(2), robberies: stats.robbed });
// Market conflicts: two players claiming the same item must never both get it
{
  const logs = { p1: [], p2: [] };
  for (const s of ['p1', 'p2']) logs[s].push({ k: '0:pick', loc: 'country' }, { k: '1:invest', tables: 0 }, { k: '1:market', buys: [0, 1, 2] });
  const S = E.simulate('conflict', logs), b = S.market.bought;
  if (b.p1.items.length !== 3 || b.p2.items.length !== 0) { console.log('market conflict wrong', b); process.exit(1); }
  console.log('market conflict OK');
}
// Determinism and money checks: the same logs must always give the same result, and cash has at most 2 decimals.
{
  const logs = { p1: [], p2: [] }, priv = {}; let S;
  mul = 99;
  while (true) { S = E.simulate('det', logs); if (S.phase === 'over') break;
    for (const s of ['p1', 'p2']) if (S.waiting[s]) { logs[s].push(bot(S, s, rnd, priv)); break; } }
  const again = E.simulate('det', JSON.parse(JSON.stringify(logs)));
  if (JSON.stringify(again.result) !== JSON.stringify(S.result)) { console.log('NOT DETERMINISTIC'); process.exit(1); }
  for (const s of ['p1', 'p2']) for (const h of S.players[s].history) if (Math.abs(Math.round(h.cash * 100) - h.cash * 100) > 1e-6) { console.log('cash decimals', h.cash); process.exit(1); }
  console.log('determinism + cash OK', JSON.stringify(S.result.score.p1));
}
// Shady deal taken twice: the second deal must keep the original start day, so the inspector still checks
// on the day of the second deal (before the fix, taking it again skipped that day's inspection).
{
  const plain = (S, s) => {
    const k = S.waiting[s];
    switch (S.phase) {
      case 'pick': return { k, loc: 'country' };
      case 'invest': return { k, tables: 0, choice: S.events[s].type === 'shady' ? 'accept' : 'decline' };
      case 'market': return { k, buys: s === 'p1' ? [0, 2, 4] : [1, 3, 5] };
      case 'commit': return { k, h: E.adHash({ self: [], rival: [] }, 'x'), nSelf: 0, nRival: 0 };
      case 'reveal': return { k, self: [], rival: [], salt: 'x' };
      case 'service': return { k, ops: [] };
      case 'voucher': return { k, n: 0 };
      default: return { k };
    }
  };
  let tested = 0;
  for (let i = 0; i < 400 && tested < 20; i++) {
    const seed = 'shady' + i, deck = E.simulate(seed, { p1: [], p2: [] }).decks.p1.slice(0, E.CFG.rounds);
    const days = deck.map((t, d) => (t === 'shady' ? d + 1 : 0)).filter(Boolean);
    if (days.length < 2) continue;
    const [first, second] = days;
    const logs = { p1: [], p2: [] }; let S;
    for (let g = 0; g < 400; g++) {
      S = E.simulate(seed, logs);
      if (S.phase === 'over' || (S.phase === 'service' && S.round === second)) break;
      const s = S.waiting.p1 ? 'p1' : S.waiting.p2 ? 'p2' : null; if (!s) break;
      logs[s].push(plain(S, s));
    }
    if (S.phase !== 'service' || S.round !== second) continue;                   // went broke first
    const caught = S.players.p1.history.some(h => h.ledger.some(l => l.label === 'Inspector fine'));
    if (caught) continue;                                                         // caught before the second offer: a fresh start is correct
    const p = S.players.p1;
    if (p.shadyFrom !== first) { console.log('shady: start day moved', { seed, first, second, shadyFrom: p.shadyFrom }); process.exit(1); }
    if (!S.script.p1.inspection) { console.log('shady: no inspection on the day of the second deal', { seed, first, second }); process.exit(1); }
    if (!p.ledger.some(l => l.label === 'Shady deal' && l.amt === E.CFG.shady.cash)) { console.log('shady: second deal not paid', { seed }); process.exit(1); }
    tested++;
  }
  if (!tested) { console.log('shady: found no game with two shady deals to test'); process.exit(1); }
  console.log(`shady deal taken twice OK (${tested} games)`);
}
