window.__RR_FAKE_FB = () => {
  const L = new Set(), key = p => 'fs:' + p, read = p => { const v = localStorage.getItem(key(p)); return v ? JSON.parse(v) : null; };
  const fire = () => L.forEach(f => f());
  addEventListener('storage', e => { if (e.key && e.key.startsWith('fs:')) fire(); });
  const fb = {
    uid: window.__RR_UID,
    async get(p) { const d = read(p); return { exists: !!d, data: d }; },
    async set(p, d) { await new Promise(r => setTimeout(r, 20)); localStorage.setItem(key(p), JSON.stringify(d)); fire(); },
    watchDoc(p, next) { const f = () => { const d = read(p); next({ exists: !!d, data: d, fromCache: false }); }; L.add(f); setTimeout(f, 0); return () => L.delete(f); },
    watchCol(p, next) { const f = () => { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(key(p) + '/') && !k.slice(key(p).length + 1).includes('/')) out.push({ id: k.slice(key(p).length + 1), data: JSON.parse(localStorage.getItem(k)) }); } next(out); }; L.add(f); setTimeout(f, 0); return () => L.delete(f); },
    async claim(p, d) { const c = read(p); if (c && c.uid && c.uid !== d.uid) throw { code: 'seat-taken' }; await fb.set(p, d); }
  };
  return fb;
};
