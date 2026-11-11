#!/usr/bin/env node
// Runs KCC Technical on your own computer against a PRETEND cloud (everything in memory, sample crew).
// Nothing connects to your real Firebase, EmailJS or YouTube. Emails are not sent. Stop it with Ctrl+C; restart to reset the data.
//   node tools/local-demo.js            then open http://localhost:8080
//   PORT=9000 node tools/local-demo.js
const http = require('http'), fs = require('fs'), path = require('path');
const { makeFake } = require('../tests/fakefs.js');
const { FAKE } = require('../tests/fake-modules.js');
const { makeCore } = require('../kcc-auth-core.js');
const { plan } = require('./migrate.js');
const S = require('../kcc-schema.js');
const ROOT = path.join(__dirname, '..'), PORT = +process.env.PORT || 8080;

// ── pretend cloud ──
const F = makeFake(); const tokens = new Map(); let tn = 0;
const authAdmin = { createCustomToken: async (uid, claims) => { const t = 'demo_tok' + (++tn); tokens.set(t, { uid, claims }); return t; }, revokeRefreshTokens: async () => {} };
const core = makeCore({ fs: F.fs, auth: authAdmin, now: () => Date.now(), stamp: () => new Date().toISOString(),
  fetchFn: async u => ({ json: async () => (u.includes('playlistItems') ? { items: [{ contentDetails: { videoId: 'v1' } }] } : { items: [{ id: 'v1', snippet: { title: 'Sunday Service (demo)' }, liveStreamingDetails: { actualStartTime: 'x', concurrentViewers: '42' } }] }) }) });

// sample data, with the schedule moved to the coming Sunday
const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'demo-data.json'), 'utf8'));
const now = new Date(), d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
let add = (7 - d.getDay()) % 7; if (add === 0 && now.getHours() >= 14) add = 7; d.setDate(d.getDate() + add);
const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const first = Object.keys(old.schedules || {})[0]; if (first && first !== key) { old.schedules[key] = old.schedules[first]; delete old.schedules[first]; }
old.settings = Object.assign({}, old.settings, { proPresenterHost: 'localhost:' + (PORT + 1000), bridgeHost: 'localhost:' + (PORT + 1001) });
// a past service so the Last service summary has something to show
{ const pd = new Date(); pd.setDate(pd.getDate() - ((pd.getDay() + 7) % 7 || 7)); const pk = pd.getFullYear() + '-' + String(pd.getMonth() + 1).padStart(2, '0') + '-' + String(pd.getDate()).padStart(2, '0'); old.schedules = old.schedules || {}; old.schedules[pk] = { crew: ['t1', 't2', 't3'], roles: { t1: 'Camera Station', t2: 'Streaming Station', t3: 'Camera Station' }, confirmed: {} }; }
const mig = plan(old); Object.keys(mig.docs).forEach(k => F.store.set(k, mig.docs[k]));

// ── rules, same as firestore.rules / the browser tests ──
const signed = a => a && a.claims && ['user', 'admin', 'master'].includes(a.claims.r);
const canRead = (p, a) => p === 'pub/roster' || (/^data\/(\w+)$/.test(p) && S.ALL.includes(p.slice(5)) && signed(a));
function canWriteDoc(p, a, v) {
  const m = /^data\/(\w+)$/.exec(p); if (!m || !signed(a)) return false;
  if (!v || Object.keys(v).some(k => !['p', 'n', 't'].includes(k)) || typeof v.p !== 'string' || v.p.length >= 900000 || typeof v.n !== 'string') return false;
  return S.canWrite(m[1], a.claims.r, a.claims.cs);
}
const sent = []; // call sheets etc. that would have been emailed

// ── what the browser gets ──
const BRIDGE = `<script>
(function(){
  const post=(u,b)=>fetch('/__api/'+u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());
  window.__tokenInfo=t=>post('token',{t});
  window.__call=(name,data,auth)=>post('call',{name,data,auth});
  window.__fsGet=(path,auth)=>post('get',{path,auth});
  window.__fsCommit=(w,auth)=>post('commit',{w,auth});
  setInterval(()=>{window.__fsChanged&&window.__fsChanged();},1500);      // pick up changes made in other tabs
  document.addEventListener('DOMContentLoaded',()=>{
    if(window.emailjs) emailjs.send=async(a,b,p)=>{console.log('[demo] email NOT sent to',p&&p.to_email,'-',p&&p.subject);fetch('/__api/mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:p&&p.to_email,subject:p&&p.subject,message:p&&p.message})});return {status:200,text:'OK'};};
    const bar=document.createElement('div');bar.textContent='LOCAL DEMO — pretend cloud, nothing is saved or emailed';bar.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#b45309;color:#fff;font:600 11px/1 system-ui;padding:4px 8px;text-align:center;pointer-events:none';document.body.appendChild(bar);
  });
})();
</script>`;

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const server = http.createServer((q, s) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  const json = (o, c) => { s.writeHead(c || 200, { 'Content-Type': 'application/json' }); s.end(JSON.stringify(o)); };
  if (q.method === 'POST' && url.startsWith('/__api/')) {
    let body = ''; q.on('data', c => body += c); q.on('end', async () => {
      try {
        const b = JSON.parse(body || '{}'), api = url.slice(7);
        if (api === 'token') return json(tokens.get(b.t) || null);
        if (api === 'mail') { sent.push(b); console.log('  (demo) email not sent to ' + b.to + ': ' + b.subject); return json({}); }
        const a = b.auth ? JSON.parse(b.auth) : null;
        if (api === 'get') { if (!canRead(b.path, a)) return json({ error: 'permission-denied' }); const sn = await F.fs.doc(b.path).get(); return json({ exists: sn.exists, data: sn.data() }); }
        if (api === 'commit') { const w = JSON.parse(b.w); for (const x of w) if (!canWriteDoc(x.path, a, x.value)) return json({ error: 'permission-denied: ' + x.path }); for (const x of w) await F.fs.doc(x.path).set(x.value); return json({}); }
        if (api === 'call') {
          const dd = JSON.parse(b.data || '{}'), c = a ? { auth: { uid: a.uid, token: a.claims } } : {};
          const map = { kccLogin: () => core.login(dd), kccBootstrap: () => core.bootstrap(dd), kccTechOp: () => core.techOp(dd, c), kccConfirm: () => core.confirmSelf(dd, c), kccConfirmLink: () => core.confirmLink(dd), kccLinks: () => core.makeLinks(dd, c), kccSetSecret: () => core.setSecret(dd, c), kccHasSecret: () => core.hasSecret(dd, c), kccNotesGet: () => core.notesGet(dd, c), kccNoteAdd: () => core.noteAdd(dd, c), kccNoteDel: () => core.noteDel(dd, c), kccYtLive: () => core.ytLive(dd, c), kccSubmitRequest: () => core.submitExternalRequest(dd, c, q.socket.remoteAddress) };
          try { return json({ data: await map[b.name]() }); } catch (e) { return json({ error: { code: e.code || 'internal', message: e.message, details: e.details } }); }
        }
        json({ error: 'unknown' }, 404);
      } catch (e) { json({ error: String(e.message) }, 500); }
    }); return;
  }
  const m = /^\/__fake\/(\w+)\.js$/.exec(url);
  if (m && FAKE[m[1]]) { s.writeHead(200, { 'Content-Type': 'text/javascript' }); s.end(FAKE[m[1]]); return; }
  if (url === '/service-worker.js') { s.writeHead(404); s.end(); return; } // no offline caching while testing
  const f = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!f.startsWith(ROOT)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, data) => {
    if (e) { s.writeHead(404); s.end('Not found'); return; }
    let out = data;
    if (f.endsWith('index.html')) {
      out = data.toString('utf8')
        .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.0\/firebase-(app|auth|functions|firestore)\.js/g, (x, n) => '/__fake/' + n + '.js')
        .replace('<script src="kcc-schema.js"></script>', BRIDGE + '\n<script src="kcc-schema.js"></script>');
    }
    s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(out);
  });
});
// pretend ProPresenter (same API shape as the real one) so the tile has something to show
const slides = [['Welcome', 'Good morning'], ['Song 1 - Verse 1', 'Amazing grace how sweet the sound'], ['Song 1 - Chorus', 'My chains are gone']];
let si = 0; setInterval(() => { si = (si + 1) % slides.length; }, 8000);
http.createServer((q, s) => {
  const j = o => { s.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); s.end(JSON.stringify(o)); };
  const u = q.url.split('?')[0];
  if (u === '/v1/version') return j({ name: 'ProPresenter (demo)', host_description: '7.16 demo', api_version: 'v1' });
  if (u === '/v1/presentation/active') return j({ presentation: { id: { uuid: 'p1', name: 'Sunday Worship (demo)' } } });
  if (u === '/v1/presentation/slide_index') return j({ presentation_index: { index: si, presentation_id: { uuid: 'p1', name: 'Sunday Worship (demo)' } } });
  if (u === '/v1/status/slide') return j({ current: { text: slides[si][1], uuid: 'a' }, next: { text: slides[(si + 1) % slides.length][1], uuid: 'b' } });
  if (u === '/v1/timers/current') return j([{ id: { name: 'Countdown' }, time: '00:04:' + String(10 + si).padStart(2, '0') }]);
  s.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); s.end();
}).listen(PORT + 1000, '127.0.0.1');
// pretend booth bridge (X32 + lights) with the same API as tools/booth-bridge
http.createServer((q, s) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Booth-Token', 'Content-Type': 'application/json' };
  if (q.method === 'OPTIONS') { s.writeHead(204, h); return s.end(); }
  if (q.url === '/status') { s.writeHead(200, h); return s.end(JSON.stringify({ ok: true, x32: { configured: true, ok: true, name: 'DEMO-X32', model: 'X32', mainMuted: false, channels: [{ n: 1, name: 'Pastor', muted: false }, { n: 4, name: 'Piano', muted: true }] }, dmx: { midi: true, scenes: [{ i: 0, name: 'House up' }, { i: 1, name: 'Worship' }, { i: 2, name: 'Message' }, { i: 3, name: 'Blackout' }] } })); }
  if (q.url === '/dmx/scene') { q.resume(); console.log('  (demo) light scene fired'); s.writeHead(200, h); return s.end('{"ok":true}'); }
  s.writeHead(404, h); s.end('{}');
}).listen(PORT + 1001, '127.0.0.1');
server.listen(PORT, '127.0.0.1', () => {
  console.log('\nKCC Technical: LOCAL DEMO is running (pretend cloud, nothing real is touched)\n');
  console.log('  Open:  http://localhost:' + PORT + '\n');
  console.log('  Everyone signs in with the password:  demo   (the Crew page has 8-character rules for NEW passwords)\n');
  old.technicians.forEach(t => console.log('   ' + t.name.padEnd(16) + ({ master: 'Master admin', admin: 'Admin', user: 'Crew' })[t.userRole]));
  console.log('\n  Public request form:  http://localhost:' + PORT + '/#request');
  console.log('  Emails are NOT sent. Stop with Ctrl+C. Restart to reset the data.\n');
});
