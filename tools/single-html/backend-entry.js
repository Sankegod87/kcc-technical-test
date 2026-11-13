// The whole pretend cloud, running inside the page: server logic + in-memory Firestore + sample crew.
import { makeFake } from '../../tests/fakefs.js';
import { makeCore } from '../../kcc-auth-core.js';
import { plan } from '../migrate.js';
import S from '../../kcc-schema.js';
import demo from '../demo-data.json';

const F = makeFake(), tokens = new Map(); let tn = 0;
const authAdmin = { createCustomToken: async (uid, claims) => { const t = 'demo_tok' + (++tn); tokens.set(t, { uid, claims }); return t; }, revokeRefreshTokens: async () => {} };
const core = makeCore({ fs: F.fs, auth: authAdmin, now: () => Date.now(), stamp: () => new Date().toISOString(),
  fetchFn: async u => ({ json: async () => (u.includes('playlistItems') ? { items: [{ contentDetails: { videoId: 'v1' } }] } : { items: [{ id: 'v1', snippet: { title: 'Sunday Service (demo)' }, liveStreamingDetails: { actualStartTime: 'x', concurrentViewers: '42' } }] }) }) });

const old = JSON.parse(JSON.stringify(demo));
const now = new Date(), d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const k = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
let add = (7 - d.getDay()) % 7; if (add === 0 && now.getHours() >= 14) add = 7; d.setDate(d.getDate() + add);
const key = k(d), first = Object.keys(old.schedules || {})[0]; if (first && first !== key) { old.schedules[key] = old.schedules[first]; delete old.schedules[first]; }
const pd = new Date(now.getFullYear(), now.getMonth(), now.getDate()); pd.setDate(pd.getDate() - ((pd.getDay() + 7) % 7 || 7));
old.schedules[k(pd)] = { crew: ['t1', 't2', 't3'], roles: { t1: 'Camera Station', t2: 'Streaming Station', t3: 'Camera Station' }, confirmed: {} };
old.settings = Object.assign({}, old.settings, { proPresenterHost: 'localhost:9080', bridgeHost: 'localhost:9081' });
const mig = plan(old); Object.keys(mig.docs).forEach(p => F.store.set(p, mig.docs[p]));

const signed = a => a && a.claims && ['user', 'admin', 'master'].includes(a.claims.r);
const canRead = (p, a) => p === 'pub/roster' || (/^data\/(\w+)$/.test(p) && S.ALL.includes(p.slice(5)) && signed(a));
function canWriteDoc(p, a, v) {
  const m = /^data\/(\w+)$/.exec(p); if (!m || !signed(a)) return false;
  if (!v || Object.keys(v).some(x => !['p', 'n', 't'].includes(x)) || typeof v.p !== 'string' || v.p.length >= 900000 || typeof v.n !== 'string') return false;
  return S.canWrite(m[1], a.claims.r, a.claims.cs);
}
window.__tokenInfo = async t => tokens.get(t) || null;
window.__fsGet = async (path, auth) => { const a = auth ? JSON.parse(auth) : null; if (!canRead(path, a)) return { error: 'permission-denied' }; const sn = await F.fs.doc(path).get(); return { exists: sn.exists, data: sn.data() }; };
window.__fsCommit = async (w, auth) => { const a = auth ? JSON.parse(auth) : null, ws = JSON.parse(w); for (const x of ws) if (!canWriteDoc(x.path, a, x.value)) return { error: 'permission-denied: ' + x.path }; for (const x of ws) await F.fs.doc(x.path).set(x.value); return {}; };
window.__call = async (name, data, auth) => {
  const a = auth ? JSON.parse(auth) : null, dd = JSON.parse(data || '{}'), c = a ? { auth: { uid: a.uid, token: a.claims } } : {};
  const map = { kccLogin: () => core.login(dd), kccBootstrap: () => core.bootstrap(dd), kccTechOp: () => core.techOp(dd, c), kccConfirm: () => core.confirmSelf(dd, c), kccConfirmLink: () => core.confirmLink(dd), kccLinks: () => core.makeLinks(dd, c), kccSetSecret: () => core.setSecret(dd, c), kccHasSecret: () => core.hasSecret(dd, c), kccNotesGet: () => core.notesGet(dd, c), kccNoteAdd: () => core.noteAdd(dd, c), kccNoteDel: () => core.noteDel(dd, c), kccFeedbackSend: () => core.feedbackSend(dd, c), kccFeedbackList: () => core.feedbackList(dd, c), kccFeedbackAct: () => core.feedbackAct(dd, c), kccYtLive: () => core.ytLive(dd, c), kccSubmitRequest: () => core.submitExternalRequest(dd, c, '127.0.0.1') };
  try { return { data: await map[name]() }; } catch (e) { return { error: { code: e.code || 'internal', message: e.message, details: e.details } }; }
};
window.__fsChanged = window.__fsChanged || (() => {});

// pretend ProPresenter and booth bridge: answer the page's fetch() calls to them
const realFetch = window.fetch.bind(window);
const slides = ['Good morning', 'Amazing grace how sweet the sound', 'My chains are gone']; let si = 0; setInterval(() => { si = (si + 1) % 3; }, 8000);
const J = o => Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } }));
window.fetch = (u, o) => {
  const s = String(u);
  if (s.startsWith('http://localhost:9080/')) {
    const p = s.slice(22);
    if (p === 'v1/version') return J({ name: 'ProPresenter (demo)', host_description: '7.16 demo' });
    if (p === 'v1/presentation/active') return J({ presentation: { id: { name: 'Sunday Worship (demo)' } } });
    if (p === 'v1/presentation/slide_index') return J({ presentation_index: { index: si, presentation_id: { name: 'Sunday Worship (demo)' } } });
    if (p === 'v1/status/slide') return J({ current: { text: slides[si] }, next: { text: slides[(si + 1) % 3] } });
    if (p === 'v1/timers/current') return J([{ id: { name: 'Countdown' }, time: '00:04:1' + si }]);
  }
  if (s.startsWith('http://localhost:9081/')) {
    if (s.endsWith('/status')) return J({ ok: true, x32: { configured: true, ok: true, name: 'DEMO-X32', model: 'X32', mainMuted: false, channels: [{ n: 1, name: 'Pastor', muted: false }, { n: 4, name: 'Piano', muted: true }] }, dmx: { midi: true, scenes: [{ i: 0, name: 'House up' }, { i: 1, name: 'Worship' }, { i: 2, name: 'Message' }, { i: 3, name: 'Blackout' }] } });
    if (s.endsWith('/dmx/scene')) return J({ ok: true });
  }
  if (/^http:\/\/(localhost|\d+\.\d+\.\d+\.\d+|[\w.-]+):\d+\//.test(s)) return Promise.reject(new TypeError('Failed to fetch'));
  return realFetch(u, o);
};
document.addEventListener('DOMContentLoaded', () => {
  if (window.emailjs) emailjs.send = async () => ({ status: 200, text: 'OK' });
  const bar = document.createElement('div'); bar.textContent = 'DEMO — everything runs inside this page. Nothing is saved or emailed. Everyone\'s password: demo';
  bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#b45309;color:#fff;font:600 11px/1 system-ui;padding:4px 8px;text-align:center;pointer-events:none'; document.body.appendChild(bar);
});
