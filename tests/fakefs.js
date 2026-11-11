// Tiny in-memory stand-in for Firestore + Admin Auth, enforcing "all reads before writes" like the real thing.
function makeFake() {
  const store = new Map(), revoked = [], tokens = [];
  const snap = p => ({ exists: store.has(p), data: () => (store.has(p) ? JSON.parse(JSON.stringify(store.get(p))) : undefined) });
  const fs = {
    doc: p => ({ path: p, get: async () => snap(p), set: async (v, o) => { store.set(p, o && o.merge ? Object.assign({}, store.get(p) || {}, v) : JSON.parse(JSON.stringify(v))); }, delete: async () => { store.delete(p); } }),
    async runTransaction(fn) {
      const staged = new Map(); let wrote = false;
      const tx = {
        get: async d => { if (wrote) throw new Error('Firestore transactions require all reads to be executed before all writes'); return snap(d.path); },
        set: (d, v, o) => { wrote = true; const base = o && o.merge ? Object.assign({}, (staged.get(d.path) || {}).v || store.get(d.path) || {}) : {}; staged.set(d.path, { v: Object.assign(base, JSON.parse(JSON.stringify(v))) }); },
        delete: d => { wrote = true; staged.set(d.path, { del: true }); }
      };
      const r = await fn(tx);
      staged.forEach((x, p) => { if (x.del) store.delete(p); else store.set(p, x.v); });
      return r;
    }
  };
  const auth = { createCustomToken: async (uid, claims) => { tokens.push({ uid, claims }); return 'tok_' + uid; }, revokeRefreshTokens: async uid => { revoked.push(uid); } };
  return { fs, auth, store, revoked, tokens };
}
module.exports = { makeFake };
