// Server-side sign-in and account management for KCC Technical.
// Pure logic with the database and auth injected, so it can be tested without Firebase.
//   makeCore({ fs, auth, now, rand, fetchFn })  ->  { login, techOp, submitExternalRequest, ytLive, setSecret, ... }
//
// fs   : { doc(path) -> { get(), set(obj), delete() }, runTransaction(fn(tx)) }   (Firestore Admin API shape)
// auth : { createCustomToken(uid, claims), revokeRefreshTokens(uid) }             (Admin Auth shape)
//
// Where things live (none of the private ones are readable by any browser):
//   data/technicians   crew profiles + roles (crew can read; only this file writes)
//   pub/roster         names for the sign-in screen
//   acct/<techId>      { hash, fails:{n,locks,until} }          private
//   private/secrets    { ytKey }                                private
//   rl/<key>           rate-limit counters                       private
const crypto = require('crypto');
const SCHEMA = require('./kcc-schema.js');

class Fail extends Error { constructor(code, msg, details) { super(msg); this.code = code; this.details = details; } }

const PEPPER = 'kcc-technical|2027|';
const MIN_PW = 8;
const MAX_FAILS = 5;

// ── password hashing ──
function scryptHash(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('hex') + '$' + h.toString('hex');
}
function legacyHash(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; } return h.toString(36); }
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// Accepts the three formats that exist: scrypt (new), s2: salted SHA-256 (v13 app), plain short hash (original app).
function pwMatches(pw, stored) {
  if (!stored || typeof pw !== 'string') return false;
  if (stored.indexOf('scrypt$') === 0) {
    const [, salt, hex] = stored.split('$');
    const h = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 32, { N: 16384, r: 8, p: 1 });
    return safeEq(h.toString('hex'), hex);
  }
  if (stored.indexOf('s2:') === 0) return safeEq('s2:' + crypto.createHash('sha256').update(PEPPER + pw, 'utf8').digest('hex'), stored);
  return safeEq(legacyHash(pw), stored);
}

// ── small validators ──
const str = (v, max) => { if (v == null) return ''; if (typeof v !== 'string') throw new Fail('invalid-argument', 'Text expected'); if (v.length > max) throw new Fail('invalid-argument', 'Text too long'); return v.trim(); };
const isImg = u => typeof u === 'string' && (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u));

// Fields a person may set on a crew profile, with a size limit each.
const TECH_FIELDS = {
  name: v => str(v, 80), role: v => str(v, 80), dept: v => str(v, 40), avatar: v => str(v, 12),
  email: v => str(v, 120), phone: v => str(v, 40), emergency: v => str(v, 200), notes: v => str(v, 1000),
  canSchedule: v => !!v,
  training: v => jsonArr(v, 20000), completedModules: v => jsonArr(v, 20000), certs: v => jsonArr(v, 60000),
  hoursLog: v => jsonArr(v, 60000), volunteerHours: v => { v = Number(v); if (!isFinite(v) || v < 0 || v > 100000) throw new Fail('invalid-argument', 'Hours out of range'); return v; },
  quizPassed: v => jsonArr(v, 20000),
  practicals: v => { if (!v || typeof v !== 'object' || Array.isArray(v) || JSON.stringify(v).length > 60000) throw new Fail('invalid-argument', 'Invalid practical records'); return v; },
  onboarding: v => { if (!v || typeof v !== 'object' || Array.isArray(v) || JSON.stringify(v).length > 5000) throw new Fail('invalid-argument', 'Invalid onboarding data'); return v; }
};
function jsonArr(v, max) { if (!Array.isArray(v)) throw new Fail('invalid-argument', 'List expected'); if (JSON.stringify(v).length > max) throw new Fail('invalid-argument', 'List too long'); return v; }
const ADMIN_EXTRA = { userRole: v => str(v, 12), active: v => !!v };
const SELF_FIELDS = ['avatar', 'email', 'phone', 'emergency', 'completedModules', 'quizPassed'];
const ROLES = ['user', 'admin'];

function makeCore(deps) {
  const fs = deps.fs, auth = deps.auth;
  const now = deps.now || (() => Date.now());
  const rand = deps.rand || (() => crypto.randomBytes(6).toString('hex'));
  const fetchFn = deps.fetchFn || (typeof fetch !== 'undefined' ? fetch : null);
  const stamp = deps.stamp || (() => new Date().toISOString());

  const readData = async (tx, key, dflt) => {
    const s = await tx.get(fs.doc('data/' + key));
    if (!s.exists) return dflt;
    try { return JSON.parse(s.data().p); } catch (e) { return dflt; }
  };
  const writeData = (tx, key, value) => tx.set(fs.doc('data/' + key), { p: JSON.stringify(value), n: 's_' + rand(), t: stamp() });
  // The sign-in screen lists names only (no roles, no contact details). Rebuilt whenever accounts change.
  const rosterDoc = techs => ({ v: JSON.stringify(techs.map(t => ({ id: t.id, name: t.name, avatar: t.avatar || '', dept: t.dept || '', active: t.active !== false, pw: !!t.pwSet }))) });
  const writeRoster = (tx, techs) => tx.set(fs.doc('pub/roster'), rosterDoc(techs));

  const callerOf = ctx => {
    const a = ctx && ctx.auth;
    if (!a || !a.token || ['user', 'admin', 'master'].indexOf(a.token.r) < 0) throw new Fail('unauthenticated', 'Sign in first');
    return { id: a.uid, role: a.token.r };
  };
  const needAdmin = c => { if (c.role !== 'admin' && c.role !== 'master') throw new Fail('permission-denied', 'Admin permission required'); };
  const lockSecs = f => (f && f.until && now() < f.until) ? Math.ceil((f.until - now()) / 1000) : 0;

  // ── sign in ──
  async function login(data) {
    const id = str(data && data.techId, 60), pw = data && data.password;
    if (!id || typeof pw !== 'string' || !pw || pw.length > 200) throw new Fail('invalid-argument', 'Name and password required');
    return fs.runTransaction(async tx => {
      const techs = await readData(tx, 'technicians', []);
      const t = techs.find(x => x.id === id);
      const aref = fs.doc('acct/' + id), asnap = await tx.get(aref);
      const acct = asnap.exists ? asnap.data() : {};
      const wait = lockSecs(acct.fails);
      if (wait) throw new Fail('resource-exhausted', 'Too many tries', { retryAfter: wait });
      const ok = !!t && t.active !== false && pwMatches(pw, acct.hash);
      if (!ok) {
        // Same answer for "no such person", "inactive" and "wrong password" so the response reveals nothing.
        const f = Object.assign({ n: 0, locks: 0, until: 0 }, acct.fails);
        let left = null;
        if (t) {
          f.n++;
          left = Math.max(0, MAX_FAILS - f.n);
          if (f.n >= MAX_FAILS) { f.until = now() + 60000 * Math.min(30, Math.pow(2, f.locks)); f.locks++; f.n = 0; }
          tx.set(aref, Object.assign({}, acct, { fails: f }));
        }
        // A throw rolls the transaction back, so the counter is saved by a separate write that the caller awaits.
        const e = new Fail('permission-denied', 'Wrong name or password', { left });
        e.persist = t ? { ref: aref, value: Object.assign({}, acct, { fails: f }) } : null;
        throw e;
      }
      const upd = Object.assign({}, acct, { fails: { n: 0, locks: 0, until: 0 } });
      if (acct.hash.indexOf('scrypt$') !== 0) upd.hash = scryptHash(pw); // upgrade old formats
      tx.set(aref, upd);
      return { tech: t };
    }).then(async r => {
      const role = ['master', 'admin'].indexOf(r.tech.userRole) >= 0 ? r.tech.userRole : 'user';
      const token = await auth.createCustomToken(r.tech.id, { r: role, cs: !!r.tech.canSchedule || role !== 'user' });
      return { token, role, id: r.tech.id };
    }).catch(async e => {
      if (e && e.persist) { await e.persist.ref.set(e.persist.value); }
      throw e;
    });
  }

  // ── accounts ──
  const find = (techs, id) => { const t = techs.find(x => x.id === id); if (!t) throw new Fail('not-found', 'No such person'); return t; };
  const canManage = (c, t) => c.role === 'master' || t.userRole !== 'master';
  const checkPw = p => { if (typeof p !== 'string' || p.length < MIN_PW || p.length > 200) throw new Fail('invalid-argument', 'Password must be at least ' + MIN_PW + ' characters'); return p; };
  function cleanFields(f, allowed) {
    const o = {};
    Object.keys(f || {}).forEach(k => {
      if (allowed.indexOf(k) < 0) throw new Fail('permission-denied', 'You cannot change "' + k + '"');
      o[k] = (TECH_FIELDS[k] || ADMIN_EXTRA[k])(f[k]);
    });
    return o;
  }
  const PROFILE_FIELDS = Object.keys(TECH_FIELDS);
  const ADMIN_FIELDS = PROFILE_FIELDS.concat(['userRole', 'active']);

  async function techOp(data, ctx) {
    const c = callerOf(ctx), op = data && data.op;
    const out = await fs.runTransaction(async tx => {
      const techs = await readData(tx, 'technicians', []);
      const revoke = [], writes = [];
      let result = {};
      if (op === 'add') {
        needAdmin(c);
        const f = cleanFields(data.fields, ADMIN_FIELDS);
        if (!f.name) throw new Fail('invalid-argument', 'Name required');
        if (f.userRole && ROLES.indexOf(f.userRole) < 0) throw new Fail('permission-denied', 'Only a transfer can create a master admin');
        const id = 't' + now() + rand().slice(0, 4);
        const t = Object.assign({ id, role: '', dept: '', avatar: '👤', email: '', phone: '', emergency: '', notes: '', canSchedule: false, userRole: 'user', training: [], completedModules: [], certs: [], hoursLog: [], volunteerHours: 0, onboarding: {}, joinedAt: now() }, f);
        writes.push(() => tx.set(fs.doc('acct/' + id), { hash: scryptHash(checkPw(data.password)), fails: { n: 0, locks: 0, until: 0 } }));
        t.pwSet = true; techs.push(t); result = { id };
      } else if (op === 'edit' || op === 'setActive') {
        needAdmin(c);
        const t = find(techs, data.id);
        if (!canManage(c, t)) throw new Fail('permission-denied', 'Only the master admin can change the master admin');
        const f = op === 'setActive' ? { active: !!data.active } : cleanFields(data.fields, ADMIN_FIELDS);
        if ('userRole' in f) { if (t.userRole === 'master') delete f.userRole; else if (ROLES.indexOf(f.userRole) < 0) throw new Fail('permission-denied', 'Role not allowed'); }
        if (t.userRole === 'master') delete f.active;
        if (('userRole' in f && f.userRole !== t.userRole) || ('active' in f && f.active === false) || ('canSchedule' in f && f.canSchedule !== t.canSchedule)) revoke.push(t.id);
        Object.assign(t, f);
        if (data.password) { const h = scryptHash(checkPw(data.password)); writes.push(() => tx.set(fs.doc('acct/' + t.id), { hash: h, fails: { n: 0, locks: 0, until: 0 } })); t.pwSet = true; revoke.push(t.id); }
      } else if (op === 'patch') { // people updating their own profile bits; admins can patch anyone
        const t = find(techs, data.id || c.id);
        const self = t.id === c.id;
        if (self && data.fields && data.fields.practicals !== undefined) throw new Fail('permission-denied', 'Nobody can sign off their own practical');
        if (!self) { needAdmin(c); if (!canManage(c, t)) throw new Fail('permission-denied', 'Only the master admin can change the master admin'); }
        Object.assign(t, cleanFields(data.fields, self && c.role !== 'admin' && c.role !== 'master' ? SELF_FIELDS : PROFILE_FIELDS)); // admins can also log hours and certs on themselves
      } else if (op === 'setPassword') {
        const t = find(techs, data.id || c.id);
        const aref = fs.doc('acct/' + t.id), a = await tx.get(aref), acct = a.exists ? a.data() : {};
        if (t.id === c.id) { // own password: must know the current one (or have none yet)
          if (acct.hash) {
            const wait = lockSecs(acct.fails);
            if (wait) throw new Fail('resource-exhausted', 'Too many tries', { retryAfter: wait });
            if (!pwMatches(data.current, acct.hash)) throw new Fail('permission-denied', 'Current password is incorrect');
          }
        } else { needAdmin(c); if (!canManage(c, t)) throw new Fail('permission-denied', 'Only the master admin can do that'); revoke.push(t.id); }
        { const h = scryptHash(checkPw(data.password)); writes.push(() => tx.set(aref, { hash: h, fails: { n: 0, locks: 0, until: 0 } })); t.pwSet = true; }
      } else if (op === 'remove') {
        needAdmin(c);
        const t = find(techs, data.id);
        if (!canManage(c, t)) throw new Fail('permission-denied', 'Only the master admin can do that');
        if (t.userRole === 'master') throw new Fail('permission-denied', 'Make someone else the master admin first');
        techs.splice(techs.indexOf(t), 1);
        writes.push(() => tx.delete(fs.doc('acct/' + t.id))); revoke.push(t.id);
      } else if (op === 'claimMaster') { // only when the system has no active master (e.g. the master was deleted by hand)
        needAdmin(c);
        if (techs.some(x => x.userRole === 'master' && x.active !== false)) throw new Fail('failed-precondition', 'A master admin already exists');
        const me = find(techs, c.id); me.userRole = 'master'; revoke.push(me.id);
      } else if (op === 'makeMaster') {
        if (c.role !== 'master') throw new Fail('permission-denied', 'Master admin only');
        const t = find(techs, data.id);
        if (t.id === c.id) throw new Fail('invalid-argument', 'You are already the master admin');
        if (t.active === false) throw new Fail('invalid-argument', 'That account is inactive');
        const me = find(techs, c.id);
        me.userRole = 'admin'; t.userRole = 'master'; revoke.push(me.id, t.id);
      } else throw new Fail('invalid-argument', 'Unknown action');
      writes.forEach(w => w());
      writeData(tx, 'technicians', techs);
      writeRoster(tx, techs);
      return { result, revoke, techs };
    });
    for (const id of out.revoke) { try { await auth.revokeRefreshTokens(id); } catch (e) { /* account may not have signed in yet */ } }
    return Object.assign({ ok: true }, out.result);
  }

  // ── schedule confirmations ──
  // A person can confirm from the app (signed in) or from the link in their call-sheet email (no sign-in).
  // Email links carry a signature only the server can make, so a link cannot be forged or used for someone else.
  let lk = null;
  async function linkKey() {
    if (lk) return lk;
    lk = await fs.runTransaction(async tx => {
      const s = await tx.get(fs.doc('private/secrets'));
      const k = s.exists && s.data().linkKey;
      if (k) return k;
      const n = crypto.randomBytes(32).toString('hex');
      tx.set(fs.doc('private/secrets'), { linkKey: n }, { merge: true });
      return n;
    });
    return lk;
  }
  async function linkSig(key, techId) { return crypto.createHmac('sha256', await linkKey()).update('confirm|' + key + '|' + techId).digest('hex').slice(0, 32); }
  async function applyConfirm(key, techId) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Fail('invalid-argument', 'That link is not valid');
    const y = +key.slice(0, 4), m = +key.slice(5, 7), d = +key.slice(8, 10);
    if (now() > Date.UTC(y, m - 1, d) + 2 * 86400000) throw new Fail('failed-precondition', 'That service has already passed');
    return fs.runTransaction(async tx => {
      const sch = await readData(tx, 'schedules', {}), techs = await readData(tx, 'technicians', []);
      const e = sch && sch[key];
      if (!e) throw new Fail('not-found', 'That service was not found');
      if (!(e.crew || []).includes(techId)) throw new Fail('permission-denied', 'You are not on the roster for that service');
      const t = techs.find(x => x.id === techId);
      if (!t || t.active === false) throw new Fail('permission-denied', 'That account is not active');
      e.confirmed = Object.assign({}, e.confirmed, { [techId]: now() });
      writeData(tx, 'schedules', sch);
      return { ok: true, name: String(t.name || '').split(' ')[0] };
    });
  }
  const confirmSelf = async (data, ctx) => { const c = callerOf(ctx); return applyConfirm(data && data.key, c.id); };
  async function confirmLink(data) {
    const key = data && data.key, id = data && data.tech, sig = data && data.sig;
    if (typeof id !== 'string' || typeof sig !== 'string' || !safeEq(await linkSig(String(key), id), sig)) throw new Fail('permission-denied', 'That link is not valid');
    return applyConfirm(key, id);
  }
  async function makeLinks(data, ctx) {
    const c = callerOf(ctx); needAdmin(c);
    const ids = Array.isArray(data && data.techIds) ? data.techIds.slice(0, 200) : [];
    const sigs = {};
    for (const id of ids) if (typeof id === 'string') sigs[id] = await linkSig(String(data.key), id);
    return { sigs };
  }

  // ── very first account on a brand-new system ──
  async function bootstrap(data) {
    const name = str(data && data.name, 80);
    if (!name) throw new Fail('invalid-argument', 'Name required');
    const pw = checkPw(data.password);
    const f = cleanFields({ role: data.role || 'Technical Director', avatar: data.avatar || '👑', email: data.email || '' }, ['role', 'avatar', 'email']);
    const id = 't' + now() + rand().slice(0, 4);
    await fs.runTransaction(async tx => {
      const techs = await readData(tx, 'technicians', []);
      if (techs.length) throw new Fail('failed-precondition', 'This system already has crew. Ask the master admin to add you.');
      const t = Object.assign({ id, name, dept: '', notes: '', canSchedule: true, userRole: 'master', training: [], completedModules: [], certs: [], joinedAt: now(), pwSet: true }, f);
      tx.set(fs.doc('acct/' + id), { hash: scryptHash(pw), fails: { n: 0, locks: 0, until: 0 } });
      writeData(tx, 'technicians', [t]);
      writeRoster(tx, [t]);
    });
    return login({ techId: id, password: pw });
  }

  // ── private settings (YouTube key) ──
  async function setSecret(data, ctx) {
    const c = callerOf(ctx); needAdmin(c);
    if (SCHEMA.SECRET_SETTINGS.indexOf(data && data.name) < 0) throw new Fail('invalid-argument', 'Unknown setting');
    const v = str(data.value, 300);
    await fs.doc('private/secrets').set({ [data.name]: v }, { merge: true });
    return { ok: true };
  }
  async function hasSecret(data, ctx) {
    const c = callerOf(ctx); needAdmin(c);
    const s = await fs.doc('private/secrets').get();
    return { set: s.exists && !!s.data()[data && data.name] };
  }

  // ── Private admin notes about people (performance notes). Stored in private/notes, only admins can read or write them. ──
  const NOTE_TYPES = ['positive', 'constructive', 'neutral'];
  async function notesGet(data, ctx) {
    const c = callerOf(ctx); needAdmin(c);
    const s = await fs.doc('private/notes').get(), all = s.exists ? (s.data().n || {}) : {};
    if (data && data.id) return { notes: all[String(data.id)] || [] };
    return { all };
  }
  async function noteAdd(data, ctx) {
    const c = callerOf(ctx); needAdmin(c);
    const id = String(data && data.id || ''), text = str(data && data.text, 500).trim(), type = NOTE_TYPES.indexOf(data && data.type) >= 0 ? data.type : 'neutral';
    if (!text) throw new Fail('invalid-argument', 'Enter a note');
    return fs.runTransaction(async tx => {
      const techs = await readData(tx, 'technicians', []); find(techs, id);
      const ref = fs.doc('private/notes'), s = await tx.get(ref), all = s.exists ? (s.data().n || {}) : {};
      const me = techs.find(t => t.id === c.id), note = { id: 'pn_' + rand(), text, type, by: me ? me.name : 'Admin', byId: c.id, at: now() };
      all[id] = [note].concat(all[id] || []).slice(0, 100);
      tx.set(ref, { n: all }); return { note };
    });
  }
  async function noteDel(data, ctx) {
    const c = callerOf(ctx); needAdmin(c);
    const id = String(data && data.id || ''), nid = String(data && data.noteId || '');
    return fs.runTransaction(async tx => {
      const ref = fs.doc('private/notes'), s = await tx.get(ref), all = s.exists ? (s.data().n || {}) : {};
      all[id] = (all[id] || []).filter(n => n.id !== nid); tx.set(ref, { n: all }); return { ok: true };
    });
  }

  // ── YouTube status (key stays on the server) ──
  let ytCache = { at: 0, v: null };
  async function ytLive(data, ctx) {
    callerOf(ctx);
    if (ytCache.v && now() - ytCache.at < 45000 && !(data && data.force)) return ytCache.v;
    const sec = await fs.doc('private/secrets').get();
    const key = sec.exists ? (sec.data().ytKey || '') : '';
    const sset = await fs.doc('data/settings').get();
    let ch = ''; try { ch = JSON.parse(sset.data().p).ytChannelId || ''; } catch (e) { /* none */ }
    if (!key || !/^UC[\w-]{22}$/.test(ch)) return { state: 'unset' };
    const pl = 'UU' + ch.slice(2);
    const j1 = await (await fetchFn('https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=6&playlistId=' + encodeURIComponent(pl) + '&key=' + encodeURIComponent(key))).json();
    if (j1.error) return { state: 'error', err: 'YouTube said: ' + String(j1.error.message || 'error').slice(0, 120) };
    const ids = (j1.items || []).map(x => x.contentDetails.videoId).filter(Boolean);
    let v;
    if (!ids.length) v = { state: 'offline' };
    else {
      const j2 = await (await fetchFn('https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=' + ids.join(',') + '&key=' + encodeURIComponent(key))).json();
      if (j2.error) return { state: 'error', err: 'YouTube said: ' + String(j2.error.message || 'error').slice(0, 120) };
      const vids = (j2.items || []).filter(x => x.liveStreamingDetails);
      const live = vids.find(x => x.liveStreamingDetails.actualStartTime && !x.liveStreamingDetails.actualEndTime);
      const sched = vids.filter(x => !x.liveStreamingDetails.actualStartTime && x.liveStreamingDetails.scheduledStartTime).sort((a, b) => new Date(a.liveStreamingDetails.scheduledStartTime) - new Date(b.liveStreamingDetails.scheduledStartTime))[0];
      if (live) v = { state: 'live', title: live.snippet.title, viewers: live.liveStreamingDetails.concurrentViewers != null ? +live.liveStreamingDetails.concurrentViewers : null, videoId: live.id, since: live.liveStreamingDetails.actualStartTime };
      else if (sched) v = { state: 'sched', title: sched.snippet.title, when: sched.liveStreamingDetails.scheduledStartTime, videoId: sched.id };
      else v = { state: 'offline' };
    }
    ytCache = { at: now(), v };
    return v;
  }

  // ── public request form ──
  async function submitExternalRequest(data, ctx, ip) {
    const d = data || {};
    const name = str(d.name, 80), dept = str(d.dept, 80), details = str(d.details, 2000), contact = str(d.contact, 120);
    if (!name || !dept) throw new Fail('invalid-argument', 'Name and ministry/department are required.');
    if (!details) throw new Fail('invalid-argument', 'Please describe what you need.');
    const cats = (Array.isArray(d.cats) ? d.cats : []).slice(0, 12).map(x => str(x, 40)).filter(Boolean);
    const photos = (Array.isArray(d.photos) ? d.photos : []).slice(0, 3).filter(isImg);
    if (JSON.stringify(photos).length > 500000) throw new Fail('invalid-argument', 'Photos are too large.');
    let needBy = null;
    if (d.neededBy != null) { needBy = Number(d.neededBy); if (!isFinite(needBy) || needBy < 0 || needBy > 4102444800000) needBy = null; }
    // Rate limit: 3 per 10 minutes per address, 60 per hour for everyone.
    const ipKey = 'ip_' + crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 24);
    await fs.runTransaction(async tx => {
      const per = await tx.get(fs.doc('rl/' + ipKey)), all = await tx.get(fs.doc('rl/all'));
      const t = now();
      const a = per.exists ? per.data() : { start: t, n: 0 }, g = all.exists ? all.data() : { start: t, n: 0 };
      if (t - a.start > 600000) { a.start = t; a.n = 0; }
      if (t - g.start > 3600000) { g.start = t; g.n = 0; }
      if (a.n >= 3 || g.n >= 60) throw new Fail('resource-exhausted', 'Please wait a few minutes before sending another request.');
      a.n++; g.n++;
      tx.set(fs.doc('rl/' + ipKey), a); tx.set(fs.doc('rl/all'), g);
    });
    const t = now();
    const req = {
      id: 'req_' + t + rand().slice(0, 3), title: dept + ' — ' + (cats.length ? cats.join(', ') : 'Other'), category: cats.length ? cats.join(', ') : 'Other',
      priority: 'normal', neededBy: needBy, requestedBy: '', details, status: 'open', assignedTo: '', adminNotes: '', createdAt: t,
      source: 'external', requesterName: name, requesterDept: dept, requesterContact: contact, photos
    };
    await fs.runTransaction(async tx => {
      const list = await readData(tx, 'techRequests', []);
      if (list.filter(r => r.source === 'external' && r.status === 'open').length >= 150) throw new Fail('resource-exhausted', 'The request queue is full. Please contact the tech team directly.');
      list.unshift(req);
      if (JSON.stringify(list).length > 800000) throw new Fail('resource-exhausted', 'The request queue is full. Please contact the tech team directly.');
      writeData(tx, 'techRequests', list);
    });
    return { ok: true };
  }

  return { login, bootstrap, confirmSelf, confirmLink, makeLinks, linkSig, techOp, setSecret, hasSecret, notesGet, noteAdd, noteDel, ytLive, submitExternalRequest, Fail, scryptHash, pwMatches, writeRoster, readData, writeData };
}

module.exports = { makeCore, Fail, scryptHash, pwMatches, legacyHash, MIN_PW };
