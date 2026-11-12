// Runs the server's autoCallSheets with a fake Firestore and a fake EmailJS, and checks the email it builds.
const Module = require('module'), assert = require('assert'), path = require('path');
const store = {
  'data/settings': { p: JSON.stringify({ autoCallSheets: true, callTime: '09:00', serviceTime: '10:30', ytChannelId: 'UCabc', checklistTasks: { 'Camera Station': ['Charge batteries'] } }) },
  'data/schedules': { p: JSON.stringify({ '2026-11-15': { crew: ['t1', 't2'], roles: { t1: 'Camera Station', t2: 'Sound Mixing' }, rundown: 'Crew call · Sound check', briefing: 'Two extra mics.' } }) },
  'data/technicians': { p: JSON.stringify([{ id: 't1', name: 'Sam <b>', email: 'sam@example.org' }, { id: 't2', name: 'Jo', email: 'jo@example.org' }]) },
  'data/checkouts': { p: JSON.stringify([{ id: 'c1', gearId: 'g1', personId: 't1', dueDate: Date.UTC(2026, 10, 16), returnedAt: null }]) },
  'data/gearItems': { p: JSON.stringify([{ id: 'g1', name: 'Wireless Mic 1' }]) },
  'data/trainingModules': { p: JSON.stringify([{ id: 'm1', title: 'Welcome', mandatory: true }, { id: 'm2', title: 'Framing basics', stations: ['Camera Station'] }]) },
  'data/specialEvents': { p: JSON.stringify([{ id: 'e1', title: 'Christmas concert', date: Date.UTC(2026, 10, 15, 3), time: '7 PM', location: 'Sanctuary' }]) },
  'private/secrets': { linkKey: 'x'.repeat(64) },
};
const docRef = (p) => ({ get: async () => ({ exists: p in store, data: () => store[p] }), set: async (v, o) => { store[p] = Object.assign(store[p] || {}, v); } });
const chain = { schedule() { return chain; }, timeZone() { return chain; }, onRun(f) { return f; }, onCall(f) { return f; }, onRequest(f) { return f; } };
const fakeFn = { pubsub: chain, https: { onCall: (f) => f, onRequest: (f) => f, HttpsError: class extends Error {} }, runWith() { return fakeFn; }, region() { return fakeFn; }, config: () => ({}) };
const fakeAdmin = { initializeApp() {}, firestore: Object.assign(() => ({ runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, v, o) => r.set(v, o), update: (r, v) => r.set(v, { merge: true }) }), doc: docRef, collection: () => ({ doc: docRef, get: async () => ({ docs: [] }) }) }), { FieldValue: { serverTimestamp: () => 0 } }), auth: () => ({}) };
const load = Module._load;
Module._load = function (req, ...a) { if (req === 'firebase-functions' || req.startsWith('firebase-functions/')) return fakeFn; if (req === 'firebase-admin' || req.startsWith('firebase-admin/')) return fakeAdmin; if (req === 'twilio') return () => ({}); return load.call(this, req, ...a); };
process.env.EMAILJS_PUBLIC_KEY = 'pub'; process.env.EMAILJS_PRIVATE_KEY = 'priv'; process.env.APP_URL = 'https://app.example/';
const realNow = Date.now; Date.now = () => Date.UTC(2026, 10, 13, 17, 0);
const sent = []; global.fetch = async (u, o) => { if (String(u).includes('open-meteo')) return { ok: true, json: async () => ({ daily: { time: ['2026-11-15'], weather_code: [73], temperature_2m_max: [-8.2], temperature_2m_min: [-22.4], precipitation_probability_max: [70], snowfall_sum: [3.5], wind_speed_10m_max: [31] } }) }; sent.push(JSON.parse(o.body)); return { ok: true, text: async () => '' }; };
const idx = require(path.join(__dirname, '..', 'index.js'));
(async () => {
  await idx.autoCallSheets();
  Date.now = realNow;
  assert.strictEqual(sent.length, 2, 'one email per crew member');
  const a = sent.find((s) => s.template_params.to_email === 'sam@example.org').template_params;
  assert.strictEqual(a.message, ''); assert.ok(a.subject.startsWith('Call sheet:'));
  for (const need of ['Camera Station', 'I&#8217;m coming'.replace('&#8217;', '’'), 'Need a swap', 'Crew call', 'Charge batteries', 'Two extra mics', 'Wireless Mic 1', 'Welcome', 'youtube.com/channel/UCabc', '9:00 AM', '10:30 AM', 'Sam &lt;b&gt;', 'The team', 'Sunday forecast', 'Snow', 'allow extra travel time', 'Christmas concert', 'Framing basics', 'You still need to finish', 'confirm=2026-11-15', '&amp;sig='])
    assert.ok(a.html.includes(need), 'html is missing: ' + need);
  assert.ok(!a.html.includes('<b>,'), 'names are escaped');
  console.log('server call sheet: all checks passed');
})().catch((e) => { Date.now = realNow; console.error('FAIL', e.message); process.exit(1); });
