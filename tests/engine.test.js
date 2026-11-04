const E = require('../engine.js');
function bot(S, seat, rnd, priv) {
  const k = S.waiting[seat], p = S.players[seat], r = S.round;
  switch (S.phase) {
    case 'pick': return { k, loc: rnd() < 0.5 ? 'city' : 'country' };
    case 'event': return { k, choice: S.event.type === 'shady' ? (rnd() < .5 ? 'accept' : 'decline') : (rnd() < .5 ? 'hold' : 'release') };
    case 'invest': return { k, tables: Math.floor(rnd() * 3), loan: rnd() < 0.1 };
    case 'market': return { k, n: rnd() < 0.2 ? 0 : 1 + Math.floor(rnd() * 3) };
    case 'commit': {
      const c = { selfReal: Math.floor(rnd() * 2), selfBlank: Math.floor(rnd() * 2), rivalReal: Math.floor(rnd() * 3), rivalBlank: Math.floor(rnd() * 2) };
      const salt = String(rnd());
      priv[seat] = { ...c, salt };
      return { k, h: E.adHash(c, salt), nSelf: c.selfReal + c.selfBlank, nRival: c.rivalReal + c.rivalBlank };
    }
    case 'respond': return { k, rush: Math.floor(rnd() * 3) };
    case 'reveal': return { k, ...(rnd() < 0.03 ? { ...priv[seat], selfReal: 3 } : priv[seat]) };
    case 'voucher': return { k, n: Math.floor(rnd() * 3) };
    case 'report': return { k };
  }
}
let mul = 7, phases = {}, wins = { p1: 0, p2: 0, draw: 0 }, reasons = {};
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
      // duplicate submission occasionally
      if (rnd() < 0.05) logs[s].push({ ...a });
      break; // act one at a time to mimic async
    }
    if (!acted) { console.log('STUCK', seed, S.phase, S.waiting, S.submitted); process.exit(1); }
    if (++steps > 2000) { console.log('LOOP', seed); process.exit(1); }
  }
  wins[S.result.winner]++; reasons[S.result.reason] = (reasons[S.result.reason] || 0) + 1;
  for (const s of ['p1','p2']) { const p = S.players[s]; if (p.stars < 1 || p.stars > 5) { console.log('stars', p); process.exit(1); } }
  if (g === 3) console.log(JSON.stringify(S.result), S.players.p1.history.map(h => [h.round, h.demand, h.cap, h.served, h.turned, h.cash, h.stars]));
}
console.log(wins, reasons);
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
