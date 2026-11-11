#!/usr/bin/env node
// KCC booth bridge. Runs on a PC in the booth. Gives the KCC Technical app two things a browser can't do on its own:
//   1. X32 status (OSC over UDP): connected, main LR muted, which channels are muted.
//   2. MyDMX 3.0 scene buttons: sends a MIDI note into MyDMX (map notes to scenes in MyDMX's MIDI settings).
// Run:  node bridge.js [config.json]      (see bridge.config.example.json)
const http = require('http'), dgram = require('dgram'), fs = require('fs'), path = require('path');
const { encode, decode } = require('./osc.js');
const cfgPath = process.argv[2] || path.join(__dirname, 'bridge.config.json');
const cfg = Object.assign({ port: 8099, x32ip: '', x32port: 10023, channels: 16, midiOut: '', midiChannel: 0, scenes: [], token: '' },
  fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {});

// ── X32 ──
const x32 = { ok: false, name: '', model: '', mainMuted: null, mutes: {}, names: {}, seen: 0 };
const sock = dgram.createSocket('udp4');
sock.on('message', m => {
  let r; try { r = decode(m); } catch (e) { return; }
  x32.seen = Date.now();
  if (r.addr === '/xinfo') { x32.name = r.args[1] || ''; x32.model = r.args[2] || ''; }
  else if (r.addr === '/main/st/mix/on') x32.mainMuted = r.args[0] === 0;
  else { let g;
    if ((g = /^\/ch\/(\d\d)\/mix\/on$/.exec(r.addr))) x32.mutes[+g[1]] = r.args[0] === 0;
    else if ((g = /^\/ch\/(\d\d)\/config\/name$/.exec(r.addr))) x32.names[+g[1]] = r.args[0] || '';
  }
});
sock.on('error', e => console.log('X32 socket error:', e.message));
const q = a => cfg.x32ip && sock.send(encode(a), cfg.x32port, cfg.x32ip);
let tick = 0;
function pollX32() {
  if (!cfg.x32ip) return;
  q('/xinfo'); q('/main/st/mix/on');
  for (let c = 1; c <= cfg.channels; c++) { const n = String(c).padStart(2, '0'); q('/ch/' + n + '/mix/on'); if (tick % 15 === 0) q('/ch/' + n + '/config/name'); }
  tick++; x32.ok = Date.now() - x32.seen < 6000;
}
setInterval(pollX32, 2000); pollX32();

// ── MyDMX via MIDI (needs: npm install easymidi, and a MIDI port MyDMX listens on, e.g. loopMIDI on Windows) ──
let midi = null, midiErr = '';
if (cfg.midiOut) { try { const em = require('easymidi'); midi = new em.Output(cfg.midiOut, process.platform === 'darwin'); } catch (e) { midiErr = e.message; console.log('MIDI not available:', e.message); } }
const sendNote = note => new Promise((ok, no) => {
  if (!midi) return no(new Error(midiErr || 'MIDI not set up on the bridge'));
  const o = { note: note, velocity: 127, channel: cfg.midiChannel };
  midi.send('noteon', o); setTimeout(() => { try { midi.send('noteoff', o); } catch (e) {} ok(); }, 120);
});
if (process.env.BRIDGE_TEST_MIDI) midi = { send: (t, o) => console.log('[test midi]', t, o.note) };

// ── HTTP ──
http.createServer((req, res) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Booth-Token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Private-Network': 'true', 'Content-Type': 'application/json' };
  const j = (c, o) => { res.writeHead(c, h); res.end(JSON.stringify(o)); };
  if (req.method === 'OPTIONS') return j(204, {});
  if (cfg.token && req.headers['x-booth-token'] !== cfg.token) return j(401, { error: 'bad token' });
  if (req.method === 'GET' && req.url === '/status') {
    return j(200, { ok: true, x32: { configured: !!cfg.x32ip, ok: x32.ok, name: x32.name, model: x32.model, mainMuted: x32.mainMuted,
      channels: Object.keys(x32.mutes).map(n => ({ n: +n, name: x32.names[n] || '', muted: !!x32.mutes[n] })) },
      dmx: { midi: !!midi, scenes: cfg.scenes.map((s, i) => ({ i, name: s.name })) } });
  }
  if (req.method === 'POST' && req.url === '/dmx/scene') {
    let b = ''; req.on('data', c => { b += c; if (b.length > 2000) req.destroy(); });
    req.on('end', async () => {
      try { const i = +JSON.parse(b || '{}').i, s = cfg.scenes[i]; if (!s) return j(400, { error: 'no such scene' });
        await sendNote(s.note); console.log(new Date().toLocaleTimeString(), 'scene:', s.name); j(200, { ok: true, scene: s.name });
      } catch (e) { j(500, { error: e.message }); }
    }); return;
  }
  j(404, { error: 'not found' });
}).listen(cfg.port, () => console.log('KCC booth bridge on port ' + cfg.port + (cfg.x32ip ? ', X32 ' + cfg.x32ip : ', no X32 set') + (midi ? ', MIDI ' + (cfg.midiOut || 'test') : ', no MIDI')));
