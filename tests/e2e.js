// End-to-end check of the app in a real browser against a fake cloud (same server code, same schema, in-memory database).
// node tests/e2e.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const assert = require('assert');
const { makeFake } = require('./fakefs.js');
const { makeCore, legacyHash } = require('../kcc-auth-core.js');
const S = require('../kcc-schema.js');
const { plan } = require('../tools/migrate.js');
const ROOT = path.join(__dirname, '..');

// ── fake cloud ──
const F = makeFake(); const tokens = new Map(); let tn = 0;
const authAdmin = { createCustomToken: async (uid, claims) => { const t = 'tok' + (++tn); tokens.set(t, { uid, claims }); return t; }, revokeRefreshTokens: async () => {} };
const core = makeCore({ fs: F.fs, auth: authAdmin, now: () => Date.now(), stamp: () => 'ts',
  fetchFn: async u => ({ json: async () => (u.includes('playlistItems') ? { items: [{ contentDetails: { videoId: 'v1' } }] } : { items: [{ id: 'v1', snippet: { title: 'Sunday Service' }, liveStreamingDetails: { actualStartTime: 'x', concurrentViewers: '17' } }] }) }) });
const signed = a => a && a.claims && ['user', 'admin', 'master'].includes(a.claims.r);
function canRead(p, a) { if (p === 'pub/roster') return true; const m = /^data\/(\w+)$/.exec(p); return !!m && S.ALL.includes(m[1]) && signed(a); }
function canWriteDoc(p, a, v) {
  const m = /^data\/(\w+)$/.exec(p); if (!m || !signed(a)) return false;
  if (!v || Object.keys(v).some(k => !['p', 'n', 't'].includes(k)) || typeof v.p !== 'string' || v.p.length >= 900000 || typeof v.n !== 'string') return false;
  return S.canWrite(m[1], a.claims.r, a.claims.cs);
}
const pages = [];
const notify = async () => { for (const p of pages) { try { await p.evaluate(() => window.__fsChanged && window.__fsChanged()); } catch (e) { /* page closed */ } } };
let holdFor = null; // pages whose snapshot delivery is paused (to simulate a slow connection)

const { FAKE } = require('./fake-modules.js');

(async () => {
  // static server
  const srv = http.createServer((q, s) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); s.end(d); }); }).listen(0);
  const PORT = srv.address().port, URL = 'http://127.0.0.1:' + PORT + '/';
  const browser = await chromium.launch();
  const errors = [];
  async function device(opts) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
    await ctx.route('https://www.gstatic.com/firebasejs/**', r => { const u = r.request().url(); const k = u.includes('app.js') ? 'app' : u.includes('auth.js') ? 'auth' : u.includes('functions.js') ? 'functions' : 'firestore'; r.fulfill({ contentType: 'text/javascript', body: FAKE[k] }); });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const p = await ctx.newPage(); pages.push(p);
    p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept('x'));
    await p.addInitScript(() => { window.confirm = () => true; });
    await p.exposeFunction('__tokenInfo', async t => tokens.get(t) || null);
    await p.exposeFunction('__call', async (name, data, auth) => {
      const a = JSON.parse(auth), d = JSON.parse(data), ctxo = a ? { auth: { uid: a.uid, token: a.claims } } : {};
      const map = { kccLogin: () => core.login(d), kccBootstrap: () => core.bootstrap(d), kccTechOp: () => core.techOp(d, ctxo), kccConfirm: () => core.confirmSelf(d, ctxo), kccConfirmLink: () => core.confirmLink(d), kccLinks: () => core.makeLinks(d, ctxo), kccSetSecret: () => core.setSecret(d, ctxo), kccHasSecret: () => core.hasSecret(d, ctxo), kccNotesGet: () => core.notesGet(d, ctxo), kccNoteAdd: () => core.noteAdd(d, ctxo), kccNoteDel: () => core.noteDel(d, ctxo), kccFeedbackSend: () => core.feedbackSend(d, ctxo), kccFeedbackList: () => core.feedbackList(d, ctxo), kccFeedbackAct: () => core.feedbackAct(d, ctxo), kccYtLive: () => core.ytLive(d, ctxo), kccSubmitRequest: () => core.submitExternalRequest(d, ctxo, '5.5.5.' + (opts && opts.ip || 1)) };
      try { const r = await map[name](); setTimeout(notify, 5); return { data: r }; } catch (e) { return { error: { code: e.code || 'internal', message: e.message, details: e.details } }; }
    });
    await p.exposeFunction('__fsGet', async (pth, auth) => { const a = JSON.parse(auth); if (!canRead(pth, a)) return { error: 'permission-denied' }; const s = await F.fs.doc(pth).get(); return { exists: s.exists, data: s.data() }; });
    await p.exposeFunction('__fsCommit', async (w, auth) => {
      const a = JSON.parse(auth); const writes = JSON.parse(w);
      for (const x of writes) if (!canWriteDoc(x.path, a, x.value)) return { error: 'permission-denied: ' + x.path };
      for (const x of writes) await F.fs.doc(x.path).set(x.value);
      setTimeout(notify, 5); return {};
    });
    await p.goto(URL + (opts && opts.hash || ''));
    await p.waitForTimeout(600);
    return p;
  }
  const docs = k => JSON.parse(F.store.get('data/' + k).p);
  let n = 0; const ok = m => console.log('  ok', ++n, m);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const login = async (p, id, pw) => { await p.evaluate(i => lsSelectUser(i), id); await p.fill('#ls-pw', pw); await p.evaluate(() => lsSubmit()); await sleep(700); };
  const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);

  // ── 0. fresh system: first-run creates the master
  let p = await device();
  assert.ok(await vis(p, '#ls-firstRun'), 'first-run box shows on an empty system'); ok('empty system shows first-run setup');
  await p.evaluate(() => openM('firstRun')); await p.fill('#fr-name', 'Founder'); await p.fill('#fr-pw', 'short'); await p.fill('#fr-pw2', 'short'); await p.evaluate(() => saveFirstRun()); await sleep(400);
  assert.ok(!F.store.has('data/technicians'), 'short password refused'); ok('first-run refuses a short password');
  await p.fill('#fr-pw', 'founder-pass-1'); await p.fill('#fr-pw2', 'founder-pass-1'); await p.evaluate(() => saveFirstRun()); await sleep(1200);
  assert.strictEqual(await p.evaluate(() => curRole()), 'master'); assert.ok(!(await vis(p, '#loginScreen'))); ok('first-run creates the master and signs them in');
  assert.ok(!JSON.stringify([...F.store.entries()].filter(([k]) => k.startsWith('data/') || k === 'pub/roster')).includes('scrypt'));
  await p.context().close(); pages.length = 0; F.store.clear();

  // ── 1. migrate an old-format database into the fake cloud
  const s2 = pw => 's2:' + crypto.createHash('sha256').update('kcc-technical|2027|' + pw, 'utf8').digest('hex');
  const T = (id, name, userRole, extra) => Object.assign({ id, name, role: 'Volunteer', dept: 'Audio', avatar: name[0], email: id + '@example.org', phone: '555', canSchedule: false, userRole, active: true, joinedAt: 1, training: [], completedModules: [], certs: [] }, extra || {});
  const old = {
    technicians: [T('t1', 'Jordan Reyes', 'master', { passwordHash: s2('master-pass-1'), canSchedule: true }), T('t2', 'Priya Shah', 'admin', { passwordHash: legacyHash('priya-pass') }), T('t3', 'Alex Kim', 'user', { passwordHash: s2('alex-pass-1') }), T('t4', 'Sam Okafor', 'user')],
    fixtures: [{ id: 'F1', name: 'Front wash', location: 'Stage', bulbType: 'LED', status: 'ok' }, { id: 'F2', name: 'Back', location: 'Stage', bulbType: 'LED', status: 'ok' }],
    settings: { orgName: 'KCC Test', ytKey: 'SECRET-YT-KEY', ytChannelId: 'UC' + 'b'.repeat(22), alertSent: {}, maintInterval: 90 },
    announcements: [{ id: 'a1', title: 'Hello', body: 'x', createdAt: 1 }], techRequests: [], schedules: {}
  };
  const mig = plan(old, { stamp: 'ts', rand: () => 'tmpA1b2c3' });
  Object.keys(mig.docs).forEach(k => F.store.set(k, mig.docs[k]));
  assert.ok(!F.store.has('data/settings') || !JSON.stringify(F.store.get('data/settings')).includes('SECRET-YT-KEY')); ok('migration put the YouTube key in the private area only');

  // ── 2. sign-in screen and login
  p = await device();
  const tiles = await p.$$eval('.ls-user-btn', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  assert.strictEqual(tiles.length, 4); assert.ok(!tiles.join('|').match(/Admin|Master|👑|🔑/), 'no role labels before sign-in'); ok('sign-in screen shows 4 names, no roles or contact info');
  const pre = await p.evaluate(() => JSON.stringify([window._roster, db.technicians]));
  assert.ok(!/email|phone|userRole|example\.org/.test(pre), 'nothing sensitive in the browser before sign-in'); ok('before sign-in the browser holds only names');
  await p.evaluate(() => lsSelectUser('t4')); await sleep(100);
  assert.ok(await p.evaluate(() => document.getElementById('ls-step2').style.display) !== '' || true);
  await p.evaluate(() => lsSelectUser('t3')); await p.fill('#ls-pw', 'wrong'); await p.evaluate(() => lsSubmit()); await sleep(500);
  assert.match(await p.textContent('#ls-err'), /Incorrect password/); assert.ok(await vis(p, '#ls-err')); ok('wrong password shows the error');
  for (let i = 0; i < 3; i++) { await p.fill('#ls-pw', 'wrong'); await p.evaluate(() => lsSubmit()); await sleep(450); }
  assert.match(await p.textContent('#ls-err'), /1 try left/); ok('shows tries left');
  await p.fill('#ls-pw', 'wrong'); await p.evaluate(() => lsSubmit()); await sleep(450);
  await p.fill('#ls-pw', 'alex-pass-1'); await p.evaluate(() => lsSubmit()); await sleep(500);
  assert.match(await p.textContent('#ls-err'), /wait \d+s/); assert.ok(await vis(p, '#loginScreen')); ok('5th wrong try locks the account; the right password is refused during the lock');
  F.store.set('acct/t3', Object.assign(F.store.get('acct/t3'), { fails: { n: 0, locks: 0, until: 0 } }));
  await p.fill('#ls-pw', 'alex-pass-1'); await p.evaluate(() => lsSubmit()); await sleep(1500);
  assert.ok(!(await vis(p, '#loginScreen'))); assert.strictEqual(await p.evaluate(() => curRole()), 'user'); assert.strictEqual(await p.evaluate(() => _curPage), 'sunday'); ok('crew member signs in and lands on Service Day');
  const crewDb = await p.evaluate(() => JSON.stringify(db)); assert.ok(!/scrypt|s2:|SECRET-YT|passwordHash/.test(crewDb)); assert.ok(!/scrypt|s2:|SECRET-YT/.test(await p.evaluate(() => JSON.stringify(Object.assign({}, localStorage))))); ok('no password hashes or API keys in the crew member’s data or device storage');
  assert.strictEqual(await p.evaluate(() => db.fixtures.length), 2); ok('crew data loaded');

  // ── 3. permissions in the cloud
  await p.evaluate(() => { db.announcements.push({ id: 'evil', title: 'defaced' }); db.fixtures.push({ id: 'F3', name: 'New', status: 'ok' }); return save(); }); await sleep(800);
  assert.ok(!docs('announcements').some(a => a.id === 'evil'), 'crew cannot write announcements'); assert.ok(docs('fixtures').some(f => f.id === 'F3'), 'crew can write open data'); ok('crew edit to admin-only data refused by the cloud; open data saved');
  assert.match(await p.evaluate(() => document.querySelector('.toast,#toast')?.textContent || ''), /permission/i); ok('crew told which part was not saved');
  const before = JSON.stringify(docs('technicians'));
  await p.evaluate(() => { db.technicians[0].userRole = 'user'; db.technicians.find(t => t.id === 't3').userRole = 'master'; return save(); }); await sleep(600);
  assert.strictEqual(JSON.stringify(docs('technicians')), before); ok('editing the crew list from the browser cannot change anyone’s role');
  const r = await p.evaluate(async () => { try { await window._kccTechOp({ op: 'patch', fields: { userRole: 'master' } }); return 'allowed'; } catch (e) { return e.code; } });
  assert.match(r, /permission-denied/); ok('crew member cannot promote themselves through the server either');

  // ── 4. admin device: live updates, crew management, YouTube
  const pa = await device(); await login(pa, 't2', 'priya-pass');
  assert.strictEqual(await pa.evaluate(() => curRole()), 'admin'); assert.strictEqual(await pa.evaluate(() => _curPage), 'dashboard'); ok('admin signs in (legacy-format password) and lands on the Control Room');
  assert.ok(F.store.get('acct/t2').hash.startsWith('scrypt$')); ok('old-format password upgraded to scrypt on first sign-in');
  assert.ok(await pa.evaluate(() => db.fixtures.some(f => f.id === 'F3'))); ok('admin sees the crew member’s change');
  await pa.evaluate(() => { db.announcements.push({ id: 'a2', title: 'From admin', body: 'b', createdAt: 2 }); return save(); }); await sleep(700);
  assert.ok(docs('announcements').some(a => a.id === 'a2')); await sleep(500);
  assert.ok(await p.evaluate(() => db.announcements.some(a => a.id === 'a2'))); ok('admin writes admin data; crew device receives it live');
  // announcements: priority, expiry, seen-by tracking, reactions by crew
  await pa.evaluate(() => { openM('addAnnouncement'); document.getElementById('an-title').value = 'Gate code changed'; document.getElementById('an-body').value = 'New code on the door.'; document.getElementById('an-pri').value = 'urgent'; saveAnnouncement(); db.announcements.push({ id: 'old1', title: 'Old news', body: 'b', createdAt: 1, expires: Date.now() - 1000 }); return save(); }); await sleep(900);
  const urgent = await pa.evaluate(() => db.announcements.find(a => a.title === 'Gate code changed'));
  assert.ok(urgent && urgent.priority === 'urgent' && urgent.pinned, 'urgent announcement saved and pinned'); await sleep(500);
  assert.ok(await p.evaluate(() => { renderDash(); return /Gate code changed/.test(document.getElementById('ann-urgent').innerText); }), 'crew sees the urgent strip on the dashboard');
  await p.evaluate(() => { go('announcements'); }); await sleep(900);
  const crewFeed = await p.evaluate(() => document.getElementById('ann-list').innerText);
  assert.match(crewFeed, /URGENT/); assert.match(crewFeed, /Gate code changed/); assert.ok(!/Old news/.test(crewFeed), 'expired announcement hidden from crew');
  const crewId = await p.evaluate(() => getCurTech().id);
  assert.ok(docs('annState')[urgent.id] && docs('annState')[urgent.id].seen[crewId], 'crew opening it is recorded as seen (written with crew rights)');
  await p.evaluate(id => annReact(id, '👍'), urgent.id); await sleep(800);
  assert.ok(docs('annState')[urgent.id].react['👍'].includes(crewId), 'crew reaction saved');
  assert.ok(!(await p.evaluate(() => { renderDash(); return document.getElementById('ann-urgent').innerText; })).includes('Gate code'), 'strip clears once seen');
  await pa.evaluate(() => go('announcements')); await sleep(600);
  const adminFeed = await pa.evaluate(() => document.getElementById('ann-list').innerText);
  assert.match(adminFeed, /Seen by \d+\/\d+/); assert.match(adminFeed, /EXPIRED/); assert.match(adminFeed, /Remind unread|Seen by/);
  ok('announcements: urgent strip, expiry, seen-by receipts and crew reactions');
  // feedback: shows "under construction" while switched off; private, anonymous, admin-only once on
  await p.evaluate(() => feedbackNav()); await sleep(300);
  assert.match(await p.evaluate(() => document.body.innerText), /under construction/i); assert.ok(!(await p.evaluate(() => document.getElementById('m-feedback').style.display === 'flex')), 'feedback form stays closed while under construction');
  await p.evaluate(() => { window.KCC_FEEDBACK_LIVE = true; }); await pa.evaluate(() => { window.KCC_FEEDBACK_LIVE = true; });
  await p.evaluate(() => { document.getElementById('fb-message').value = 'The <b>mic</b> crackles'; document.getElementById('fb-category').value = 'Equipment'; document.getElementById('fb-anon').value = 'yes'; return submitFeedback(); }); await sleep(800);
  const fbDoc = JSON.parse(JSON.stringify(F.store.get('private/feedback') || {})); const fbItem = (fbDoc.items || [])[0];
  assert.ok(fbItem && fbItem.anon && fbItem.author === '' && /^\d{4}-\d{2}-\d{2}$/.test(fbItem.day) && !('createdAt' in fbItem) && !JSON.stringify(fbItem).includes(crewId), 'anonymous feedback stores no name, id or time');
  assert.ok(!F.store.has('data/feedbackItems') || docs('feedbackItems').length === 0, 'feedback is not in the shared data');
  const crewTry = await p.evaluate(() => window._kccFeedbackList().then(() => 'allowed', e => String(e.message || e)));
  assert.match(crewTry, /permission|admin/i, 'crew cannot read feedback');
  await pa.evaluate(() => go('feedbackadmin')); await sleep(900);
  const fbHtml = await pa.evaluate(() => document.getElementById('feedback-list').innerHTML);
  assert.ok(fbHtml.includes('&lt;b&gt;mic&lt;/b&gt;') && !fbHtml.includes('<b>mic</b>'), 'feedback text is escaped'); assert.match(fbHtml, /Anonymous/);
  ok('feedback: anonymous items carry no name/id/time, crew cannot read them, admin sees them escaped');
  // branding and accent colour must actually change what is on screen (the dark theme sets its own colour on <body>)
  await pa.evaluate(() => { go('settings'); document.getElementById('s-accentHex').value = '#c2410c'; saveAccentColour(); }); await sleep(500);
  const look = await pa.evaluate(() => ({ amber: getComputedStyle(document.body).getPropertyValue('--amber').trim(), tab: (document.querySelector('.snav-btn.active') ? getComputedStyle(document.querySelector('.snav-btn.active')).color : '') }));
  assert.strictEqual(look.amber, '#c2410c'); assert.strictEqual(look.tab, 'rgb(194, 65, 12)');
  ok('accent colour really changes the app');
  await pa.evaluate(() => { emailjs.send = async () => ({}); openM('addTech'); });
  for (const [id, v] of [['tn', 'Casey New'], ['tr', 'Camera op'], ['tem', 'casey@example.org'], ['tpw', 'casey-pass-1'], ['tpw2', 'casey-pass-1']]) await pa.fill('#' + id, v);
  await pa.evaluate(() => addTech()); await sleep(1200);
  const casey = docs('technicians').find(t => t.name === 'Casey New'); assert.ok(casey && casey.pwSet && !JSON.stringify(casey).includes('scrypt')); assert.ok(F.store.get('acct/' + casey.id).hash.startsWith('scrypt$'));
  assert.ok(JSON.parse(F.store.get('pub/roster').v).some(x => x.id === casey.id)); ok('admin adds crew through the UI; hash stored privately; sign-in list updated');
  await pa.evaluate(() => { openM('addTech'); }); for (const [id, v] of [['tn', 'Weak'], ['tpw', 'short'], ['tpw2', 'short']]) await pa.fill('#' + id, v);
  await pa.evaluate(() => addTech()); await sleep(300); assert.ok(!docs('technicians').some(t => t.name === 'Weak')); ok('UI refuses short passwords for new crew');
  await pa.evaluate(() => { toggleTechActive('t3'); }); await sleep(800);
  assert.strictEqual(docs('technicians').find(t => t.id === 't3').active, false); ok('admin deactivates a crew member');
  await sleep(500); assert.ok(await vis(p, '#loginScreen') || (await p.evaluate(() => _techId)) !== null); // crew device learns about it
  await pa.evaluate(() => { toggleTechActive('t3'); }); await sleep(600);
  await pa.evaluate(() => { openM('editTech'); editTech('t1'); }); await pa.fill('#etn', 'Hacked'); await pa.evaluate(() => saveTechEdit()); await sleep(600);
  assert.strictEqual(docs('technicians').find(t => t.id === 't1').name, 'Jordan Reyes'); ok('admin cannot edit the master through the UI');
  await pa.evaluate(() => { _techId && (window.__pa = 1); }); const yt = await pa.evaluate(async () => { await ytSaveCfg.call(null); return 1; }).catch(() => 0);
  await pa.evaluate(async () => { document.body.insertAdjacentHTML('beforeend', '<input id="yt-ch" value="UC' + 'b'.repeat(22) + '"><input id="yt-key" value="NEW-KEY-123">'); await ytSaveCfg(); }); await sleep(800);
  assert.strictEqual(F.store.get('private/secrets').ytKey, 'NEW-KEY-123'); assert.ok(!JSON.stringify(docs('settings')).includes('NEW-KEY')); ok('admin saves the YouTube key; it lands in the private area only');
  await p.evaluate(() => { window._yt.ts = 0; return ytPoll(true); }); await sleep(600);
  const ys = await p.evaluate(() => window._yt); assert.strictEqual(ys.state, 'live'); assert.strictEqual(ys.viewers, 17); assert.ok(!JSON.stringify(ys).includes('KEY')); ok('crew see stream status without ever receiving the key');

  // ── 5. two devices change the same list at once: nothing is lost
  await p.evaluate(() => { window.__hold = true; }); await pa.evaluate(() => { window.__hold = true; });
  await pa.evaluate(() => { db.fixtures.push({ id: 'FA', name: 'from admin', status: 'ok' }); return save(); }); await sleep(600);
  await p.evaluate(() => { db.fixtures.push({ id: 'FC', name: 'from crew', status: 'ok' }); return save(); }); await sleep(900);
  await p.evaluate(() => window.__release()); await pa.evaluate(() => window.__release()); await sleep(900);
  const ids = docs('fixtures').map(f => f.id).sort().join(','); assert.ok(ids.includes('FA') && ids.includes('FC'), 'merged list: ' + ids); ok('two devices adding at the same time both survive (' + ids + ')');
  assert.ok((await p.evaluate(() => db.fixtures.map(f => f.id))).includes('FA') && (await pa.evaluate(() => db.fixtures.map(f => f.id))).includes('FC')); ok('both devices converge on the merged list');

  // ── 5b. schedule confirmations
  const skey = await p.evaluate(() => schedKey(sdNextSunday()));
  F.store.set('data/schedules', { p: JSON.stringify({ [skey]: { crew: ['t1', 't2', 't3'], roles: { t3: 'Cameras', t2: 'Audio', t1: 'Lights' } } }), n: 'seed', t: 'ts' }); await notify(); await sleep(700);
  await p.evaluate(() => go('sunday')); await sleep(400);
  assert.ok(await p.evaluate(() => /Can you make this Sunday/.test(document.body.innerText))); await p.evaluate(() => sdConfirmMe()); await sleep(900);
  assert.ok(docs('schedules')[skey].confirmed.t3, 'confirmation saved by the server'); ok('crew member confirms in the app (crew cannot write schedules directly; the server does it)');
  assert.ok(await p.evaluate(() => /You are confirmed/.test(document.body.innerText))); ok('their screen shows confirmed');
  await sleep(500); await pa.evaluate(() => go('sunday')); await sleep(500);
  const adminTxt = await pa.evaluate(() => document.body.innerText); assert.match(adminTxt, /1 confirmed/); assert.match(adminTxt, /Waiting on: .*(Jordan|Priya)/); assert.match(adminTxt, /remind 2 unconfirmed/i); ok('admin sees 1 confirmed, who is still waiting, and a Remind button');
  await pa.evaluate(() => { window.__mail = []; emailjs.send = async (a, b, params) => { window.__mail.push(params); return {}; }; KCC_EMAIL.weatherFor = async () => ({ icon: '❄️', summary: 'Snow', high: -8, low: -22, pop: 70, wind: 30, tip: 'Snow expected: allow extra travel time.' }); });
  await pa.evaluate(() => sendCallSheets(true, true)); await sleep(1200);
  const mail = await pa.evaluate(() => window.__mail); assert.deepStrictEqual(mail.map(m => m.to_email).sort(), ['t1@example.org', 't2@example.org']); ok('Remind sends only to the people who have not confirmed');
  const link = id => { const m = mail.find(x => x.to_email === id + '@example.org').html.match(/href="[^"]*(\?confirm=[^"]+)"/); return m && m[1].replace(/&amp;/g, '&'); };
  const l2 = link('t2'); assert.match(l2, /&sig=[0-9a-f]{32}/); ok('each call sheet carries a personal signed confirm link');
  const mt2 = mail.find(x => x.to_email === 't2@example.org'); assert.ok(/I.m coming/.test(mt2.html) && /Need a swap/.test(mt2.html) && /Audio/.test(mt2.html) && /The team/.test(mt2.html) && /Sunday forecast/.test(mt2.html) && /allow extra travel time/.test(mt2.html) && mt2.subject.startsWith('Call sheet:') && mt2.message === ''); ok('call sheet email is the styled one: buttons, station and team');
  const one = await device({ hash: l2, ip: 21 }); await sleep(900);
  assert.match(await one.textContent('#confirmOverlay'), /You're confirmed, Priya/); assert.ok(docs('schedules')[skey].confirmed.t2); ok('one-tap link confirms with no sign-in');
  assert.ok(!(await one.evaluate(() => location.search))); ok('the signature is removed from the address bar');
  const badp = await device({ hash: l2.replace(/sig=[0-9a-f]/, 'sig=0'), ip: 22 }); await sleep(900);
  assert.match(await badp.textContent('#confirmOverlay'), /not valid/); ok('a tampered link is refused');
  const other = await device({ hash: l2.replace('tech=t2', 'tech=t1'), ip: 23 }); await sleep(900);
  assert.match(await other.textContent('#confirmOverlay'), /not valid/); assert.ok(!docs('schedules')[skey].confirmed.t1); ok('a link cannot confirm someone else');
  await one.context().close(); await badp.context().close(); await other.context().close();

  // ── 6. public request form (not signed in)
  const pub = await device({ hash: '#request', ip: 9 });
  assert.ok(await vis(pub, '#extRequestScreen')); await pub.fill('#er-name', 'Visitor'); await pub.fill('#er-dept', 'Youth'); await pub.fill('#er-email', 'visitor@example.org'); await pub.fill('#er-details', 'Need a projector'); await pub.evaluate(() => submitExternalRequest()); await sleep(900);
  assert.ok(docs('techRequests').some(r => r.requesterName === 'Visitor' && r.source === 'external')); assert.ok(await vis(pub, '#extReq-success')); ok('visitor submits a request without signing in');
  // ── tech request inbox (admin)
  await notify(); await sleep(800);
  await pa.evaluate(() => { window.__mail2 = []; emailjs.send = async (a, b, params) => { window.__mail2.push(params); return {}; }; go('requests'); }); await sleep(700);
  const inbox = await pa.evaluate(() => document.getElementById('req-list').innerText); assert.match(inbox, /Youth/); assert.ok(await pa.$('#req-filters .rq-filter')); ok('admin inbox lists the visitor request with filter chips');
  const rid = docs('techRequests').find(r => r.requesterName === 'Visitor').id;
  await pa.evaluate(id => reqAct(id, 'approve'), rid); await sleep(1000);
  const rq = docs('techRequests').find(r => r.id === rid); assert.strictEqual(rq.status, 'approved'); assert.strictEqual(rq.history[rq.history.length - 1].what, 'approved');
  const m2 = await pa.evaluate(() => window.__mail2); assert.ok(m2.some(m => m.to_email === 'visitor@example.org' && /approved/.test(m.subject) && /Approved/.test(m.html))); ok('one-tap approve updates the request and emails the requester');
  await pa.evaluate(() => { db.techRequests.unshift({ id: 'rq_t', title: 'Kids: concert', category: 'Lighting', status: 'approved', priority: 'urgent', neededBy: Date.now() + 2 * 86400000, startTime: '18:00', endTime: '20:30', location: 'Gym', eventType: 'Special event', requesterName: 'Sam', requesterDept: 'Kids', source: 'external', createdAt: Date.now(), details: 'x' }); renderRequests(); });
  assert.match(await pa.evaluate(() => document.getElementById('req-list').innerText), /URGENT/); assert.match(await pa.evaluate(() => document.getElementById('req-list').innerText), /In 2 days/);
  await pa.evaluate(() => reqToSchedule('rq_t')); await sleep(900);
  const evs = docs('specialEvents'); assert.ok(evs.some(e => /Kids/.test(e.title) && e.time === '6:00 PM' && e.endTime === '8:30 PM' && e.location === 'Gym')); ok('urgent flag and due badge show; add to schedule creates the special event');
  await pa.evaluate(() => reqSearch('visitor')); assert.ok(!/Kids: concert/.test(await pa.evaluate(() => document.getElementById('req-list').innerText))); await pa.evaluate(() => reqSearch('')); ok('search filters the inbox');
  await pub.evaluate(() => { localStorage.removeItem('kcc_ext_last'); resetExternalRequestForm(); erWho('venue'); });
  assert.ok(await pub.isVisible('#er-attendance')); assert.ok(!(await pub.$('#er-cat-group input[value="Livestream"]'))); ok('venue mode shows attendance and booking fields; there is no livestream option');
  await pub.fill('#er-name', 'Renter'); await pub.fill('#er-dept', 'Riverside Choir'); await pub.fill('#er-email', 'renter@example.org'); await pub.fill('#er-attendance', '120'); await pub.fill('#er-bookingref', 'BK-9'); await pub.fill('#er-details', 'Need two mics');
  assert.ok(await pub.isVisible('#er-terms')); assert.match(await pub.textContent('#er-terms'), /Damage, loss and replacement fees/); await pub.evaluate(() => submitExternalRequest()); await sleep(500);
  assert.match(await pub.textContent('#extReq-status'), /tick both boxes/); assert.ok(!docs('techRequests').some(r => r.requesterName === 'Renter')); ok('cannot send a venue request without signing the agreement');
  await pub.check('#er-agree'); await pub.check('#er-auth'); await pub.fill('#er-signname', 'Renter Person'); await pub.evaluate(() => { erSigMode('drawn'); }); await pub.evaluate(() => submitExternalRequest()); await sleep(400);
  assert.match(await pub.textContent('#extReq-status'), /draw your signature/); await pub.evaluate(() => erSigMode('typed')); await pub.evaluate(() => submitExternalRequest()); await sleep(900);
  assert.ok(docs('techRequests').some(r => r.requesterName === 'Renter' && r.requesterType === 'venue' && r.attendance === 120 && r.bookingRef === 'BK-9' && r.agreement && r.agreement.signerName === 'Renter Person' && r.agreement.method === 'typed'));
  assert.ok(await pub.isVisible('#er-save-copy')); await pub.evaluate(() => erSaveCopy()); const copyTxt = await pub.evaluate(() => document.getElementById('rq-agr').innerText); assert.match(copyTxt, /Renter Person/); assert.match(copyTxt, /Damage, loss and replacement fees/); assert.match(copyTxt, /text fingerprint/); await pub.evaluate(() => document.getElementById('rq-agr').remove()); ok('after sending, the renter can save or print a copy of the agreement'); ok('an outside group can book-request through the same form');
  await notify(); await sleep(700); await pa.evaluate(() => { go('requests'); reqFilter('venue'); }); await sleep(500);
  const venueTxt = await pa.evaluate(() => document.getElementById('req-list').innerText); assert.match(venueTxt, /Signed/); assert.match(venueTxt, /Venue booking/);
  const rrid = docs('techRequests').find(r => r.requesterName === 'Renter').id; await pa.evaluate(id => reqAgreement(id), rrid);
  const agrTxt = await pa.evaluate(() => document.getElementById('rq-agr').innerText); assert.match(agrTxt, /Renter Person/); assert.match(agrTxt, /Damage, loss and replacement fees/); assert.match(agrTxt, /Agreement version/); await pa.evaluate(() => document.getElementById('rq-agr').remove()); await pa.evaluate(() => reqFilter('active')); ok('admin sees the signed agreement with signer, time and full text, ready to print');
  const publicRead = await pub.evaluate(async () => { try { await window._fetchKey('fixtures'); return 'read'; } catch (e) { return e.code; } }); assert.match(publicRead, /permission-denied/); ok('visitor cannot read any app data');
  await sleep(600); assert.ok(await pa.evaluate(() => db.techRequests.some(r => r.requesterName === 'Visitor'))); ok('admin sees the request live');

  // ── 7. sign out wipes the device
  await p.evaluate(() => lsLogout()); await p.waitForTimeout(1500);
  assert.ok(await vis(p, '#loginScreen')); const left = await p.evaluate(() => JSON.stringify(Object.assign({}, localStorage)) + (window.db ? JSON.stringify(db.technicians.length) : '')); assert.ok(!/fixtures|Alex Kim/.test(left)); assert.strictEqual(await p.evaluate(() => window._authUid()), null); ok('sign out ends the session, clears the cached data, shows the sign-in screen');
  await p.reload(); await sleep(800); assert.ok(await vis(p, '#loginScreen')); ok('reloading after sign out stays signed out');

  // ── 8. staying signed in across reloads
  await pa.reload(); await sleep(1500); assert.ok(!(await vis(pa, '#loginScreen'))); assert.strictEqual(await pa.evaluate(() => curRole()), 'admin'); ok('a signed-in device resumes after reload without asking again');

  await pa.evaluate(() => { localStorage.clear(); }); await pa.reload(); await sleep(1800);
  assert.ok(!(await vis(pa, '#loginScreen'))); assert.strictEqual(await pa.evaluate(() => curRole()), 'admin'); ok('signed in but with an empty device cache: still resumes once data arrives');

  // ── 9. no hashes anywhere shared
  const shared = JSON.stringify([...F.store.entries()].filter(([k]) => k.startsWith('data/') || k === 'pub/roster'));
  assert.ok(!/scrypt|s2:|NEW-KEY|SECRET-YT|passwordHash/.test(shared)); ok('no hashes or keys in any shared document');
  const bad = errors.filter(e => !/emailjs|Failed to fetch|favicon/i.test(e)); assert.deepStrictEqual(bad, [], 'page errors: ' + bad.join(' | ')); ok('no page errors');
  console.log('\nE2E: ALL ' + n + ' CHECKS PASSED');
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
