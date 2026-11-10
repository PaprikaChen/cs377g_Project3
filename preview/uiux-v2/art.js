// ===== Drawings (SVG strings) for the page. Display only: no game rules in here. =====
const ART = (() => {
  // ---------- small stroke icons (24×24, use currentColor) ----------
  const I = {
    check: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/>',
    box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    table: '<path d="M3 9h18M6 9l-1 10M18 9l1 10M8 13h8"/>',
    cart: '<path d="M3 5h3l3 11h10l2-8H7"/><circle cx="10" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
    card: '<rect x="4" y="3" width="11" height="16" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V8"/>',
    person: '<circle cx="12" cy="7" r="3"/><path d="M6 20a6 5 0 0 1 12 0"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    warn: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    ff: '<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" fill="currentColor" stroke="none"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
  };
  const icon = (name, size = 18, cls = '') =>
    `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;
  // A filled star for ratings
  const star = (on, size = 18) => `<svg class="ic star ${on ? 'on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>`;
  const stars = (n, size = 18) => `<span class="stars" role="img" aria-label="${n} of 5 stars">${[1, 2, 3, 4, 5].map(i => star(i <= n, size)).join('')}</span>`;
  // A plate of food (used in the kitchen and in keys)
  const plate = (size = 20) => `<svg class="ic plate" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" class="rim"/><circle cx="12" cy="12" r="5" class="dish"/></svg>`;

  // ---------- floor plan pieces (local coordinates; the table top is centred on 0,0) ----------
  const guest = '<path class="guest" d="M-14 39a14 11 0 0 1 28 0z"/><circle class="guest" cx="0" cy="21" r="7"/>';
  const chair = '<rect class="chair" x="-12" y="18" width="24" height="14" rx="7"/>';
  const dish = '<circle class="rim" cx="0" cy="-10" r="10"/><circle class="dish" cx="0" cy="-10" r="5"/>';
  const label = (t, cls = '') => `<rect class="tag-bg" x="-27" y="-19" width="54" height="18" rx="4"/><text class="tag ${cls}" x="0" y="-6">${t}</text>`;
  function tile(k, x, y, s) {
    const g = (cls, body) => `<g class="tbl ${cls}" transform="translate(${x} ${y}) scale(${s})"><rect class="top" x="-30" y="-32" width="60" height="44" rx="10"/>${body}</g>`;
    switch (k) {
      case 'seat': return g('seat', dish + guest);
      case 'free': return g('free', chair);
      case 'new': return g('new', chair + '<rect class="new-bg" x="-19" y="-52" width="38" height="18" rx="9"/><text class="new-t" x="0" y="-39">NEW</text>');
      case 'reserved': return g('blocked', label('reserved'));
      case 'fake': return g('fake', label('fake', 'm'));
      case 'broken': return g('blocked', label('broken'));
      case 'bseat': return g('borrowed', dish + guest);
      case 'bfree': return g('borrowed', chair);
      case 'arriving': return g('arriving', '<circle class="spin" cx="0" cy="-10" r="12"/>');
      case 'more': return `<g transform="translate(${x} ${y}) scale(${s})"><rect class="more" x="-30" y="-32" width="60" height="44" rx="10"/><text class="more-t" x="0" y="-4">${''}</text></g>`;
    }
    return '';
  }
  const person = (x, y, cls) => `<g class="${cls}" transform="translate(${x} ${y})"><circle cx="0" cy="0" r="6"/><path d="M-10 18a10 8 0 0 1 20 0z"/></g>`;
  const chip = (x, y, t) => `<g transform="translate(${x} ${y})"><rect class="chip-bg" x="-20" y="-11" width="40" height="22" rx="11"/><text class="chip-t" x="0" y="4">${t}</text></g>`;

  // The restaurant seen from above.
  // o = { own: [kind…] (max 14), borrowed: [kind…], food, incoming, deliv, queue, away, asker, kitchenNote, roomLabel }
  function floor(o) {
    const W = 880, out = [];
    const borrowed = o.borrowed || [];
    const patioRows = borrowed.length ? (borrowed.length > 8 ? 2 : 1) : 0;
    const H = patioRows ? 336 + (patioRows === 2 ? 176 : 106) + 8 : 330;
    out.push('<defs><pattern id="rr-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--line2)"/><rect width="3" height="8" style="fill:var(--line)"/></pattern>' +
      '<pattern id="rr-hatch-m" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--rival-soft)"/><rect width="3" height="8" style="fill:var(--rival-line)"/></pattern></defs>');
    out.push(`<rect class="street" x="0" y="0" width="${W}" height="${H}"/>`);
    // dining room + kitchen
    out.push('<rect class="room" x="104" y="10" width="770" height="312" rx="6"/>');
    out.push('<path class="wall" d="M104 120V16a6 6 0 0 1 6-6h758a6 6 0 0 1 6 6v300a6 6 0 0 1-6 6H110a6 6 0 0 1-6-6V210"/>');
    out.push(`<text class="zone" x="116" y="30">${o.roomLabel || 'DINING ROOM'}</text>`);
    out.push('<path class="split" d="M690 10v312"/>');
    const cx = [162, 277, 392, 507, 622], cy = [66, 170, 274];
    (o.own || []).slice(0, 15).forEach((k, i) => out.push(tile(k, cx[i % 5], cy[Math.floor(i / 5)], 0.85)));
    if (o.roomNote) out.push(`<text class="note" x="392" y="${(o.own || []).length > 10 ? 300 : (o.own || []).length > 5 ? 280 : 176}">${o.roomNote}</text>`);
    // kitchen: one plate per food
    const food = Math.max(0, o.food || 0), cap = 40, shown = Math.min(food, food > cap ? cap - 1 : cap);
    out.push(`<text class="zone mid ${food ? '' : 'bad'}" x="782" y="30">${food ? `KITCHEN · ${food} FOOD` : 'KITCHEN · NO FOOD'}</text>`);
    for (let i = 0; i < shown; i++) {
      const x = 722 + (i % 5) * 30, y = 58 + Math.floor(i / 5) * 30;
      out.push(`<g transform="translate(${x} ${y})"><circle class="rim" r="11"/><circle class="dish" r="5.5"/></g>`);
    }
    if (food > cap) out.push(chip(842, 58 + 7 * 30, `+${food - shown}`));
    let ky = 58 + Math.ceil(Math.max(shown, 1) / 5) * 30 + 6;
    if (o.incoming) {
      const i = shown, x = 722 + (i % 5) * 30, y = 58 + Math.floor(i / 5) * 30;
      out.push(`<g transform="translate(${x} ${y})"><circle class="incoming" r="11"/></g>`);
      ky = Math.max(ky, y + 30);
    }
    if (o.kitchenNote) o.kitchenNote.forEach((t, j) => out.push(`<text class="note sm" x="782" y="${ky + 14 + j * 16}">${t}</text>`));
    if (o.deliv) out.push(`<g transform="translate(782 288)"><rect class="chip-bg soft" x="-70" y="-18" width="140" height="36" rx="10"/><text class="chip-t ink" x="0" y="5">${o.deliv} delivery sent</text></g>`);
    // patio for borrowed tables
    if (patioRows) {
      out.push(`<rect class="patio" x="104" y="336" width="770" height="${patioRows === 2 ? 176 : 106}" rx="6"/>`);
      const n = borrowed.length, show = n > 16 ? 15 : n;
      out.push(`<text class="zone" x="116" y="356">PATIO · ${n} BORROWED FROM NEXT DOOR · TONIGHT ONLY</text>`);
      for (let i = 0; i < show; i++) out.push(tile(borrowed[i], 152 + (i % 8) * 96, 398 + Math.floor(i / 8) * 74, 0.75));
      if (n > 16) out.push(`<g transform="translate(${152 + 7 * 96} ${398 + 74})"><rect class="more" x="-23" y="-24" width="46" height="34" rx="8"/><text class="more-t" x="0" y="-2">+${n - 15}</text></g>`);
    }
    // outside: someone asking for food, the waiting group, guests who left
    let y = 64;
    if (o.asker) {
      out.push(person(51, 70, 'waiting'));
      out.push('<g transform="translate(51 40)"><rect class="bubble" x="-18" y="-13" width="36" height="24" rx="12"/><circle class="dish" cx="0" cy="-1" r="5"/></g>');
      y = 112;
    }
    const q = o.queue || 0, qShow = q > 8 ? 7 : q;
    for (let i = 0; i < qShow; i++) out.push(person(i % 2 ? 68 : 34, y + 58 + Math.floor(i / 2) * 30, 'waiting'));
    if (q > 8) out.push(chip(68, y + 58 + 3 * 30 + 6, `+${q - 7}`));
    if (q) out.push(`<text class="out-t" x="51" y="${y + 58 + Math.ceil(Math.min(q, 8) / 2) * 30 + 6}">${q} waiting</text>`);
    const a = o.away || 0, aShow = a > 6 ? 5 : a, ay = Math.max(250, y + 58 + Math.ceil(Math.min(q, 8) / 2) * 30 + 34);
    for (let i = 0; i < aShow; i++) out.push(`<g class="left" transform="translate(${i % 2 ? 68 : 34} ${ay + Math.floor(i / 2) * 30})"><circle r="6"/><path d="M-10 18a10 8 0 0 1 20 0z"/></g>`);
    if (a > 6) out.push(chip(68, ay + 2 * 30 + 6, `+${a - 5}`));
    if (a) out.push(`<text class="out-t bad" x="51" y="${ay + Math.ceil(Math.min(a, 6) / 2) * 30 + 6}">${a} left</text>`);
    return `<svg class="floor" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || 'Your restaurant'}">${out.join('')}</svg>`;
  }

  // The Spoon Fight logo (L4 round badge). Each copy needs its own ids, so pass a short unique id.
  function badge(id = 'b') {
    return `<svg class="badge" viewBox="110 20 420 340" role="img" aria-label="Spoon Fight"><defs><clipPath id="bc-${id}"><circle cx="320" cy="190" r="150"/></clipPath>
      <path id="ba-${id}" d="M196,190 A124,124 0 0 1 444,190"/><g id="bs-${id}"><rect x="-7" y="-28" width="14" height="110" rx="7" fill="currentColor" stroke="#0B0B0D" stroke-width="5"/><ellipse cx="0" cy="-54" rx="24" ry="32" fill="currentColor" stroke="#0B0B0D" stroke-width="5"/></g></defs>
      <circle cx="320" cy="190" r="164" fill="#FFD21F" stroke="#7A1A0E" stroke-width="5"/>
      <g clip-path="url(#bc-${id})"><rect x="160" y="30" width="160" height="320" fill="#1B2347"/><rect x="320" y="30" width="160" height="320" fill="#3A1527"/></g>
      <circle cx="320" cy="190" r="150" fill="none" stroke="#0B0B0D" stroke-width="4"/>
      <text font-family="Luckiest Guy, sans-serif" font-size="22" letter-spacing="5" fill="#FFD21F"><textPath href="#ba-${id}" startOffset="50%" text-anchor="middle">★ THE GOLDEN SPOON ★</textPath></text>
      <use href="#bs-${id}" transform="translate(320 200) rotate(-32)" style="color:#6B8AFF"/><use href="#bs-${id}" transform="translate(320 200) rotate(32)" style="color:#F0569A"/>
      <path d="M120,258 L520,258 L500,288 L520,318 L120,318 L140,288 Z" fill="#E8392B" stroke="#8A1610" stroke-width="5" stroke-linejoin="round"/>
      <text x="320" y="308" text-anchor="middle" font-family="Luckiest Guy, sans-serif" font-size="50" fill="#FFFFFF" stroke="#8A1610" stroke-width="6" paint-order="stroke">SPOON FIGHT</text></svg>`;
  }

  return { icon, star, stars, plate, floor, badge };
})();
