// ===== Line drawings (SVG strings) for the page. Display only: no game rules in here. =====
const ART = (() => {
  const svg = (body, size, cls, label, vb = '0 0 48 48') => `<svg class="ic ${cls || ''}" width="${size}" height="${size}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${body}</svg>`;
  const f = v => `style="fill:var(${v})"`;
  const bolt = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M8 0L0 11h6l-4 9 10-13H6l4-7z" style="fill:var(--exp);stroke:var(--exp)" stroke-width="1.2"/>`;
  const P = {
    // goods
    exp: `<rect x="15" y="12" width="28" height="26" rx="3" ${f('--exp-soft')}/>${bolt(23, 15)}<path d="M3 18h7M1 25h9M4 32h6" style="stroke:var(--exp)"/>`,
    reg: `<path d="M7 17l17-8 17 8v17l-17 8-17-8z" ${f('--reg-soft')}/><path d="M7 17l17 8 17-8M24 25v17"/><path d="M15.5 13l17 8v6" style="stroke:var(--reg)"/>`,
    sun: `<circle cx="24" cy="24" r="8" ${f('--sun')}/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M10.5 37.5l3.5-3.5M34 14l3.5-3.5"/>`,
    moon: `<path d="M30 7a17 17 0 1 0 11 27A14 14 0 0 1 30 7z" ${f('--moon-soft')}/>`,
    clock: `<circle cx="24" cy="26" r="16"/><path d="M24 17v9l6 4M19 5h10"/>`,
    coin: `<circle cx="24" cy="24" r="17" ${f('--sun-soft')}/><path d="M29 17.5c-1-1.5-3-2.5-5-2.5-3 0-5 1.7-5 4s2 3.3 5 4 5 1.8 5 4.3-2.3 4-5 4c-2.3 0-4.3-1-5.3-2.6M24 11v4M24 33v4"/>`,
    cart: `<path d="M4 8h6l5 22h22l4-15H12"/><circle cx="18" cy="38" r="3"/><circle cx="34" cy="38" r="3"/>`,
    person: `<circle cx="24" cy="9" r="5"/><path d="M24 14v16M24 30l-7 13M24 30l7 13M14 21h20"/>`,
    seated: `<circle cx="20" cy="8" r="5"/><path d="M20 13v13h10l2 14M20 20h10"/><path d="M6 30h36M10 30l-2 12M38 30l2 12" style="stroke:var(--wood)"/>`,
    away: `<circle cx="24" cy="9" r="5"/><path d="M24 14v16M24 30l-7 13M24 30l7 13M14 21h20" style="stroke:var(--bad)"/><path d="M33 6l9 9M42 6l-9 9" style="stroke:var(--bad)"/>`,
    table: `<rect x="5" y="16" width="38" height="5" rx="2" ${f('--wood-soft')}/><path d="M10 21l-2 17M38 21l2 17"/>`,
    food: `<path d="M6 24h36a18 15 0 0 1-36 0z" ${f('--food-soft')}/><path d="M16 42h16M18 8c-2 3 2 5 0 8M24 6c-2 3 2 5 0 8M30 8c-2 3 2 5 0 8"/>`,
    star: `<path d="M24 5l5.6 12 13 1.4-9.7 8.8 2.8 12.8L24 33.5 12.3 40l2.8-12.8-9.7-8.8 13-1.4z" ${f('--sun')}/>`,
    check: `<path d="M10 25l9 9 19-20"/>`,
    x: `<path d="M12 12l24 24M36 12L12 36"/>`,
    rush: `<path d="M3 26h28a14 11 0 0 1-28 0z" ${f('--food-soft')}/><path d="M10 44h14"/>${bolt(32, 5, 1.1)}`,
    borrow: `<rect x="3" y="24" width="28" height="5" rx="2" ${f('--wood-soft')}/><path d="M7 29l-2 14M27 29l2 14M30 11h14M38 5l6 6-6 6"/>`,
    letgo: `<path d="M8 43V6h20v37M4 43h28"/><circle cx="23" cy="25" r="1" fill="currentColor"/><path d="M34 24h11M40 18l6 6-6 6"/>`,
    rent: `<path d="M6 22L24 7l18 15M10 19v23h28V19M20 42V30h8v12"/>`,
    give: `<path d="M6 24h36a18 15 0 0 1-36 0z" ${f('--food-soft')}/><path d="M24 4l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" ${f('--sun')}/>`,
    no: `<circle cx="24" cy="24" r="17"/><path d="M12 12l24 24"/>`,
    // ad cards
    delivery: `<circle cx="12" cy="36" r="5"/><circle cx="37" cy="36" r="5"/><path d="M17 36h12l3-13h7M32 23l-3-8h-5M20 36l2-9h9"/><rect x="3" y="17" width="14" height="11" rx="2" ${f('--exp-soft')}/>`,
    lunch: `<rect x="6" y="16" width="36" height="24" rx="3" ${f('--reg-soft')}/><path d="M18 16v-5h12v5M6 26h36M24 24v5"/>`,
    subway: `<rect x="11" y="5" width="26" height="32" rx="6" ${f('--sunk')}/><path d="M11 21h26M17 29h.1M31 29h.1M16 37l-4 7M32 37l4 7"/>`,
    stall: `<path d="M5 18l5-10h28l5 10z" ${f('--exp-soft')}/><path d="M5 18c0 4 6.5 4 6.5 0 0 4 6.5 4 6.5 0 0 4 6.5 4 6.5 0 0 4 6.5 4 6.5 0 0 4 6.5 4 6.5 0 0 4 6.5 4 6.5 0M9 23v19M39 23v19M9 33h30"/>`,
    bus: `<rect x="4" y="9" width="40" height="26" rx="4" ${f('--sun-soft')}/><path d="M4 22h40M14 9v13M24 9v13M34 9v13"/><circle cx="13" cy="37" r="4"/><circle cx="35" cy="37" r="4"/>`,
    wom: `<path d="M5 8h23v15H14l-6 5v-5H5z" ${f('--p1-soft')}/><path d="M22 27v6h11l6 5v-5h5V19h-10"/>`,
    flyer: `<path d="M12 5h18l7 7v31H12z" ${f('--paper')}/><path d="M30 5v7h7M17 20h14M17 27h14M17 34h9"/>`,
    blogger: `<rect x="5" y="14" width="38" height="26" rx="4" ${f('--sunk')}/><circle cx="24" cy="27" r="7"/><path d="M17 14l3-6h8l3 6M36 20h.1"/>`,
    coupon: `<path d="M5 14h38v7a3 3 0 0 0 0 6v7H5v-7a3 3 0 0 0 0-6z" ${f('--sun-soft')}/><path d="M18 30l12-12M18.5 19h.1M29.5 29h.1"/>`,
    fake: `<path d="M5 16c6-4 13-4 19 0 6-4 13-4 19 0 0 10-6 16-11 16-4 0-6-4-8-4s-4 4-8 4c-5 0-11-6-11-16z" ${f('--sunk')}/><circle cx="15" cy="21" r="3"/><circle cx="33" cy="21" r="3"/>`,
    review: `<path d="M8 6h30v26H22l-9 8v-8H8z" ${f('--bad-soft')}/><path d="M17 15l12 10M29 15L17 25" style="stroke:var(--bad)"/>`,
    poach: `<path d="M10 8v16a14 14 0 0 0 28 0V8h-8v16a6 6 0 0 1-12 0V8z" ${f('--sunk')}/><path d="M10 14h8M30 14h8" style="stroke:var(--bad)"/>`,
    swamp: `<circle cx="12" cy="18" r="5"/><circle cx="24" cy="13" r="5"/><circle cx="36" cy="18" r="5"/><path d="M4 42c0-8 4-15 8-15s8 7 8 15M16 42c0-10 4-18 8-18s8 8 8 18M28 42c0-8 4-15 8-15s8 7 8 15"/>`,
    fakebook: `<rect x="7" y="9" width="34" height="18" rx="2" ${f('--sun-soft')}/><path d="M13 27l-4 15M35 27l4 15M14 18h20"/>`,
    corner: `<rect x="9" y="22" width="30" height="21" rx="3" ${f('--sunk')}/><path d="M15 22v-6a9 9 0 0 1 18 0v6M24 30v6"/>`,
    // events
    rain: `<path d="M13 30a9 9 0 0 1 2-18 12 12 0 0 1 22 4 7 7 0 0 1-1 14z" ${f('--sunk')}/><path d="M16 35l-2 7M24 35l-2 7M32 35l-2 7" style="stroke:var(--moon)"/>`,
    protest: `<rect x="8" y="5" width="32" height="20" rx="2" ${f('--sun-soft')}/><path d="M24 25v18M14 12h20M14 18h12"/>`,
    fight: `<path d="M24 4l4 10 10-6-3 11 11 3-10 5 6 10-11-2-1 11-6-9-7 8-1-11-11 1 7-8-9-7 11-2-3-11 10 6z" ${f('--bad-soft')}/>`,
    ring: `<circle cx="24" cy="31" r="12"/><path d="M18 17l6-11 6 11z" ${f('--moon-soft')}/>`,
    basket: `<path d="M6 22h36l-4 20H10z" ${f('--reg-soft')}/><path d="M14 22c0-8 4-14 10-14s10 6 10 14M12 30h24M14 36h20"/><circle cx="18" cy="18" r="3" style="fill:var(--good)"/><circle cx="29" cy="17" r="3" style="fill:var(--bad)"/>`,
    thief: `<path d="M17 12l-4-6h22l-4 6"/><path d="M17 12c-8 6-11 14-10 22 1 6 6 8 17 8s16-2 17-8c1-8-2-16-10-22z" ${f('--sunk')}/><path d="M27 22c-1-1-2-1.5-3-1.5-2 0-3 1-3 2.5s1 2 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5c-1.3 0-2.5-.6-3.2-1.6M24 18v2M24 31v2"/>`,
    inspector: `<circle cx="20" cy="20" r="12" ${f('--sunk')}/><path d="M29 29l13 13"/>`,
    calendar: `<rect x="6" y="9" width="36" height="32" rx="3" ${f('--paper')}/><path d="M6 18h36M15 5v8M33 5v8M15 27h5M28 27h5M15 34h5"/>`,
    shady: `<path d="M6 20h36l-4-12H10z" ${f('--sunk')}/><path d="M4 20h40M14 30a5 5 0 1 0 0 .1M34 30a5 5 0 1 0 0 .1M19 30h10"/>`,
    card: `<rect x="10" y="4" width="28" height="40" rx="4" ${f('--sunk')}/><path d="M17 13l14 22M31 13L17 35"/>`
  };
  const icon = (name, size = 32, cls = '', label = '') => svg(P[name] || P.card, size, cls, label);

  // Shop pictures for the location pick
  const place = loc => loc === 'city'
    ? svg(`<path d="M4 86h152" /><rect x="12" y="34" width="28" height="52" ${f('--sunk')}/><rect x="46" y="14" width="34" height="72" ${f('--p2-soft')}/><rect x="86" y="42" width="24" height="44" ${f('--sunk')}/><rect x="116" y="24" width="32" height="62" ${f('--p1-soft')}/>
        <path d="M18 44h6M28 44h6M18 56h6M28 56h6M18 68h6M28 68h6M53 24h7M66 24h7M53 38h7M66 38h7M53 52h7M66 52h7M53 66h7M66 66h7M92 52h4M100 52h4M92 64h4M100 64h4M123 34h7M136 34h7M123 48h7M136 48h7M123 62h7M136 62h7"/>`, 120, 'place', 'City skyline', '0 0 160 90')
    : svg(`<path d="M4 86h152M4 70c30-14 60-14 90-2s45 8 62-2" /><circle cx="132" cy="18" r="9" ${f('--sun')}/><path d="M34 86V50l22-18 22 18v36z" ${f('--bad-soft')}/><path d="M34 50h44M48 86V66h16v20M48 66l16 20M64 66L48 86"/>
        <path d="M108 86V60" style="stroke:var(--wood)"/><circle cx="108" cy="50" r="13" ${f('--p1-soft')}/>`, 120, 'place', 'Countryside barn', '0 0 160 90');

  // A stick figure standing at (x, y) = feet position; scale s
  const man = (x, y, s, cls, style = '') => `<g class="man ${cls}" transform="translate(${x} ${y}) scale(${s})" ${style}><circle cx="0" cy="-38" r="6"/><path d="M0-32v16M0-16l-7 16M0-16l7 16M-9-26h18"/></g>`;
  // A guest sitting behind a table: (x, y) = table top centre
  const sitter = (x, y, cls, style = '') => `<g class="man ${cls}" transform="translate(${x} ${y})" ${style}><circle cx="0" cy="-27" r="6"/><path d="M0-21v18M-10-13l10 4 10-4"/></g>`;
  const tableAt = (x, y, kind) => {
    if (kind === 'broken') return `<g class="tbl broken" transform="translate(${x} ${y})"><path d="M-22 8l16-6M2 2l18 7M-16 7l-3 15M14 8l4 14"/></g>`;
    return `<g class="tbl ${kind}" transform="translate(${x} ${y})"><rect x="-20" y="0" width="40" height="6" rx="2"/><path d="M-15 6l-2 17M15 6l2 17"/>${kind === 'blocked' ? '<rect class="sign" x="-12" y="-24" width="24" height="15" rx="2"/><path class="sign" d="M-7-19h14M-7-14h9"/>' : ''}</g>`;
  };
  const bowl = (x, y) => `<g class="bowl" transform="translate(${x} ${y})"><path d="M-9 0h18a9 7 0 0 1-18 0z"/></g>`;

  // The shop during service.
  // st = { tables, blocked, borrowed, lost, seated, newSeat, food, away, newAway, queue, deliv, event, loc }
  function store(st) {
    const W = 640, G = 272, door = { x: 122, y: G };
    const out = [];
    // street + building
    out.push(`<path class="ground" d="M0 ${G}h${W}"/>`);
    out.push(`<rect class="wall" x="120" y="58" width="506" height="${G - 58}"/>`);
    let aw = 'M120 58'; for (let x = 120; x < 626; x += 23) aw += 'a11.5 11.5 0 0 0 23 0';
    out.push(`<rect class="awning" x="120" y="40" width="506" height="18"/><path class="awning" d="${aw}z"/>`);
    for (let x = 143; x < 626; x += 46) out.push(`<rect class="awning-stripe" x="${x}" y="40" width="23" height="18"/>`);
    out.push(`<rect class="door" x="116" y="178" width="8" height="${G - 178}"/>`);
    // counter + food shelves on the right
    out.push(`<path class="counter" d="M520 178h100v${G - 178}M520 178v${G - 178}M524 104h92M524 140h92"/>`);
    const food = Math.min(st.food, 18);
    for (let i = 0; i < food; i++) { const row = Math.floor(i / 6), col = i % 6; out.push(bowl(533 + col * 15, [100, 136, 174][row] - 1)); }
    if (st.food > 18) out.push(`<text class="more" x="570" y="196" text-anchor="middle">+${st.food - 18}</text>`);
    if (st.food === 0) out.push(`<text class="empty" x="570" y="130" text-anchor="middle">no food</text>`);
    // tables
    const kinds = [];
    for (let i = 0; i < st.tables; i++) kinds.push(i >= st.tables - st.borrowed ? 'borrowed' : 'ok');
    for (let i = 0; i < st.blocked; i++) kinds.push('blocked');
    for (let i = 0; i < st.lost; i++) kinds.push('broken');
    const n = Math.max(1, kinds.length), cols = Math.min(6, Math.max(3, Math.ceil(n / 3))), rows = Math.ceil(n / cols);
    const cw = 360 / cols, ch = Math.min(70, 190 / rows), y0 = G - 26 - (rows - 1) * ch;
    const spots = kinds.map((k, i) => ({ k, x: 150 + cw / 2 + (i % cols) * cw, y: y0 + Math.floor(i / cols) * ch }));
    let seatIdx = 0;
    spots.forEach(sp => {
      if (sp.k === 'ok' || sp.k === 'borrowed') {
        if (seatIdx < st.seated) {
          const fresh = seatIdx >= st.newSeat;
          out.push(sitter(sp.x, sp.y, fresh ? 'walkin' : '', fresh ? `style="--fx:${door.x - sp.x}px;--fy:${door.y - sp.y}px;animation-delay:${(seatIdx - st.newSeat) * 0.08}s"` : ''));
        }
        seatIdx++;
      }
      out.push(tableAt(sp.x, sp.y, sp.k));
    });
    // guests who left: outside on the street, red
    const away = Math.min(st.away, 15);
    for (let i = 0; i < away; i++) {
      const x = 96 - (i % 5) * 19, y = G - Math.floor(i / 5) * 34 - 2, fresh = i >= st.newAway;
      out.push(man(x, y, 0.62, 'gone' + (fresh ? ' walkout' : ''), fresh ? `style="--fx:${door.x - x}px;--fy:${door.y - y}px"` : ''));
    }
    // a waiting group at the door
    for (let i = 0; i < Math.min(st.queue, 10); i++) out.push(man(108 - (i % 5) * 15, G - Math.floor(i / 5) * 8, 0.7, 'queue'));
    // deliveries
    if (st.deliv) out.push(`<g transform="translate(14 64) scale(.8)">${P.delivery}</g><text class="more" x="64" y="94">×${st.deliv}</text>`);
    // the day's event
    if (st.event === 'give') out.push(man(62, G, 0.9, 'asker') + `<g transform="translate(70 196) scale(.7)">${P.food}</g>`);
    const E = { rain: [8, 4], protest: [20, 150], fight: [300, 70], ring: [330, 66], basket: [462, 200], calendar: [470, 64], inspector: [470, 64] }[st.event];
    if (E) out.push(`<g class="ev ${st.event}" transform="translate(${E[0]} ${E[1]}) scale(${st.event === 'rain' ? 2 : 1.3})">${P[st.event]}</g>`);
    return `<svg class="scene" viewBox="0 0 ${W} 290" role="img" aria-label="Your restaurant: ${st.seated} seated, ${st.away} turned away, ${st.food} food left">${out.join('')}</svg>`;
  }

  return { icon, place, store };
})();
