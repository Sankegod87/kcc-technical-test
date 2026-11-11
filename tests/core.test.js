const assert = require('assert');
const crypto = require('crypto');
const { makeFake } = require('./fakefs.js');
const { makeCore, scryptHash, legacyHash } = require('../kcc-auth-core.js');

let T = 1700000000000;
const f = makeFake();
const core = makeCore({ fs: f.fs, auth: f.auth, now: () => T, stamp: () => 'ts' });
const ctx = (uid, r, cs) => ({ auth: { uid, token: { r, cs: !!cs } } });
const rejects = async (p, code) => { try { await p; } catch (e) { assert.strictEqual(e.code, code, 'expected ' + code + ' got ' + e.code + ' ' + e.message); return e; } assert.fail('should have failed with ' + code); };
let n = 0; const ok = name => console.log('  ok', ++n, name);

(async () => {
  // seed: master with an s2: hash, admin with the old plain hash, a user with scrypt, one with no password
  const s2 = pw => 's2:' + crypto.createHash('sha256').update('kcc-technical|2027|' + pw, 'utf8').digest('hex');
  const techs = [
    { id: 'm', name: 'Maya', userRole: 'master', canSchedule: true, pwSet: true },
    { id: 'a', name: 'Alex', userRole: 'admin', pwSet: true },
    { id: 'u', name: 'Uma', userRole: 'user', pwSet: true },
    { id: 'n', name: 'Noah', userRole: 'user' },
    { id: 'x', name: 'Off', userRole: 'user', active: false, pwSet: true }
  ];
  f.store.set('data/technicians', { p: JSON.stringify(techs), n: 'seed', t: 'ts' });
  f.store.set('acct/m', { hash: s2('Master-pass-1') });
  f.store.set('acct/a', { hash: legacyHash('alexpw') });
  f.store.set('acct/u', { hash: scryptHash('uma-secret-9') });
  f.store.set('acct/x', { hash: s2('whatever1') });

  // ── legacy hash port matches the browser's functions
  assert.strictEqual(legacyHash('abc'), (() => { let h = 0; for (const c of 'abc') { h = ((h << 5) - h) + c.charCodeAt(0); h |= 0; } return h.toString(36); })());
  ok('legacy hash port');

  // ── sign in
  let r = await core.login({ techId: 'm', password: 'Master-pass-1' });
  assert.deepStrictEqual([r.role, r.token], ['master', 'tok_m']); assert.deepStrictEqual(f.tokens.pop().claims, { r: 'master', cs: true });
  assert.ok(f.store.get('acct/m').hash.startsWith('scrypt$'), 's2 upgraded to scrypt');
  r = await core.login({ techId: 'm', password: 'Master-pass-1' }); assert.strictEqual(r.role, 'master'); ok('master login; s2 hash upgraded to scrypt and still works');
  r = await core.login({ techId: 'a', password: 'alexpw' }); assert.strictEqual(r.role, 'admin');
  assert.ok(f.store.get('acct/a').hash.startsWith('scrypt$')); ok('legacy-hash admin login + upgrade');
  r = await core.login({ techId: 'u', password: 'uma-secret-9' }); assert.deepStrictEqual(f.tokens.pop().claims, { r: 'user', cs: false }); ok('user claims: user, cannot schedule');
  await rejects(core.login({ techId: 'n', password: 'x' }), 'permission-denied'); ok('account with no password cannot sign in');
  await rejects(core.login({ techId: 'x', password: 'whatever1' }), 'permission-denied'); ok('inactive account cannot sign in');
  await rejects(core.login({ techId: 'nobody', password: 'x' }), 'permission-denied'); ok('unknown name gives the same error');
  await rejects(core.login({ techId: 'u' }), 'invalid-argument'); ok('missing password rejected');

  // ── lockout with backoff, persisted on the server
  for (let i = 0; i < 4; i++) { const e = await rejects(core.login({ techId: 'u', password: 'bad' }), 'permission-denied'); assert.strictEqual(e.details.left, 4 - i); }
  const e5 = await rejects(core.login({ techId: 'u', password: 'bad' }), 'permission-denied'); assert.strictEqual(e5.details.left, 0);
  let lock = await rejects(core.login({ techId: 'u', password: 'uma-secret-9' }), 'resource-exhausted'); assert.strictEqual(lock.details.retryAfter, 60);
  ok('5 wrong tries lock the account for 60s, even the right password is refused');
  T += 61000; r = await core.login({ techId: 'u', password: 'uma-secret-9' }); assert.strictEqual(r.role, 'user'); ok('lock expires, sign-in works, counters reset');
  for (let i = 0; i < 5; i++) await rejects(core.login({ techId: 'u', password: 'bad' }), 'permission-denied');
  for (let i = 0; i < 5; i++) await core.login({ techId: 'u', password: 'bad' }).catch(() => {});
  T += 61000; for (let i = 0; i < 5; i++) await rejects(core.login({ techId: 'u', password: 'bad' }), 'permission-denied');
  lock = await rejects(core.login({ techId: 'u', password: 'uma-secret-9' }), 'resource-exhausted'); assert.strictEqual(lock.details.retryAfter, 120); ok('repeat lockouts double (60s, 120s...)');
  T += 3600000;

  // ── crew management permissions
  await rejects(core.techOp({ op: 'add', fields: { name: 'Z' }, password: 'abcdefgh' }, ctx('u', 'user')), 'permission-denied'); ok('user cannot add crew');
  await rejects(core.techOp({ op: 'add', fields: { name: 'Z' }, password: 'abcdefgh' }, {}), 'unauthenticated'); ok('signed-out cannot add crew');
  r = await core.techOp({ op: 'add', fields: { name: 'Zed', role: 'Camera', userRole: 'user', canSchedule: true }, password: 'zedzedzed' }, ctx('a', 'admin'));
  const zid = r.id; let list = JSON.parse(f.store.get('data/technicians').p);
  assert.ok(list.find(t => t.id === zid && t.pwSet && t.canSchedule)); assert.ok(f.store.get('acct/' + zid).hash.startsWith('scrypt$'));
  assert.ok(!JSON.stringify(f.store.get('data/technicians')).includes('scrypt'), 'no hashes in the shared crew document');
  assert.ok(JSON.parse(f.store.get('pub/roster').v).find(x => x.id === zid && x.pw)); ok('admin adds crew; hash stored privately; roster updated');
  await rejects(core.techOp({ op: 'add', fields: { name: 'Boss', userRole: 'master' }, password: 'abcdefgh' }, ctx('m', 'master')), 'permission-denied'); ok('nobody can create a second master by adding');
  await rejects(core.techOp({ op: 'add', fields: { name: 'Q' }, password: 'short' }, ctx('a', 'admin')), 'invalid-argument'); ok('short password refused');
  await rejects(core.techOp({ op: 'add', fields: { name: 'Q', evil: 1 }, password: 'abcdefgh' }, ctx('a', 'admin')), 'permission-denied'); ok('unknown profile fields refused');
  await rejects(core.techOp({ op: 'edit', id: 'm', fields: { name: 'Hacked' } }, ctx('a', 'admin')), 'permission-denied'); ok('admin cannot edit the master');
  await rejects(core.techOp({ op: 'setPassword', id: 'm', password: 'newpassword' }, ctx('a', 'admin')), 'permission-denied'); ok('admin cannot reset the master password');
  await rejects(core.techOp({ op: 'remove', id: 'm' }, ctx('a', 'admin')), 'permission-denied'); ok('admin cannot remove the master');
  await rejects(core.techOp({ op: 'remove', id: 'm' }, ctx('m', 'master')), 'permission-denied'); ok('master cannot be removed until transferred');
  await rejects(core.techOp({ op: 'edit', id: 'u', fields: { userRole: 'master' } }, ctx('a', 'admin')), 'permission-denied'); ok('cannot promote anyone to master through edit');
  await rejects(core.techOp({ op: 'patch', id: 'u', fields: { userRole: 'admin' } }, ctx('a', 'admin')), 'permission-denied'); ok('patch cannot change roles');
  await rejects(core.techOp({ op: 'patch', id: 'u', fields: { userRole: 'admin' } }, ctx('u', 'user')), 'permission-denied'); ok('user cannot make themselves admin');
  await rejects(core.techOp({ op: 'patch', id: 'a', fields: { phone: '1' } }, ctx('u', 'user')), 'permission-denied'); ok('user cannot edit someone else');
  await core.techOp({ op: 'patch', fields: { completedModules: ['m1'], phone: '403' } }, ctx('u', 'user'));
  list = JSON.parse(f.store.get('data/technicians').p); assert.deepStrictEqual(list.find(t => t.id === 'u').completedModules, ['m1']); ok('user updates own training progress and phone');
  await rejects(core.techOp({ op: 'patch', fields: { certs: [] } }, ctx('u', 'user')), 'permission-denied'); ok('user cannot award themselves certificates');
  await core.techOp({ op: 'patch', fields: { quizPassed: ['m1'] } }, ctx('u', 'user')); ok('user records a passed quiz on themselves');
  await rejects(core.techOp({ op: 'patch', fields: { practicals: { m1: [{ passed: true }] } } }, ctx('u', 'user')), 'permission-denied'); ok('user cannot sign off their own practical');
  await rejects(core.techOp({ op: 'patch', fields: { practicals: { m1: [{ passed: true }] } } }, ctx('a', 'admin')), 'permission-denied'); ok('admin cannot sign off their own practical');
  await rejects(core.noteAdd({ id: 'u', text: 'hi' }, ctx('u', 'user')), 'permission-denied'); ok('crew cannot add private notes');
  await rejects(core.notesGet({ id: 'u' }, ctx('u', 'user')), 'permission-denied'); ok('crew cannot read private notes');
  const nn = await core.noteAdd({ id: 'u', text: 'Great job on camera 2', type: 'positive' }, ctx('a', 'admin'));
  assert.strictEqual((await core.notesGet({ id: 'u' }, ctx('a', 'admin'))).notes[0].text, 'Great job on camera 2'); ok('admin adds and reads a private note');
  assert.ok(!JSON.stringify(f.store.get('data/technicians')).includes('Great job')); ok('private notes are not in the shared crew list');
  await rejects(core.noteAdd({ id: 'nobody', text: 'x' }, ctx('a', 'admin')), 'not-found'); ok('note needs a real person');
  await core.noteDel({ id: 'u', noteId: nn.note.id }, ctx('a', 'admin'));
  assert.strictEqual((await core.notesGet({ id: 'u' }, ctx('a', 'admin'))).notes.length, 0); ok('admin deletes a note');
  await core.techOp({ op: 'patch', id: 'u', fields: { practicals: { m1: [{ passed: true, by: 'A' }] }, completedModules: ['m1'] } }, ctx('a', 'admin'));
  list = JSON.parse(f.store.get('data/technicians').p); assert.strictEqual(list.find(t => t.id === 'u').practicals.m1[0].passed, true); ok('admin records a practical on someone else');
  f.revoked.length = 0;
  await core.techOp({ op: 'edit', id: 'u', fields: { userRole: 'admin' } }, ctx('a', 'admin')); assert.ok(f.revoked.includes('u')); ok('role change signs that person out of old sessions');
  await core.techOp({ op: 'edit', id: 'u', fields: { userRole: 'user' } }, ctx('m', 'master'));
  await core.techOp({ op: 'setActive', id: 'u', active: false }, ctx('a', 'admin')); await rejects(core.login({ techId: 'u', password: 'uma-secret-9' }), 'permission-denied');
  await core.techOp({ op: 'setActive', id: 'u', active: true }, ctx('a', 'admin')); ok('deactivate blocks sign-in; reactivate restores');
  f.revoked.length = 0;
  await core.techOp({ op: 'setPassword', id: 'u', password: 'brand-new-pw' }, ctx('a', 'admin')); assert.ok(f.revoked.includes('u'));
  r = await core.login({ techId: 'u', password: 'brand-new-pw' }); assert.strictEqual(r.role, 'user'); ok('admin resets a user password; old sessions revoked');
  await rejects(core.techOp({ op: 'setPassword', password: 'another-pw-1', current: 'wrong' }, ctx('u', 'user')), 'permission-denied'); ok('changing own password needs the current one');
  await core.techOp({ op: 'setPassword', password: 'another-pw-1', current: 'brand-new-pw' }, ctx('u', 'user'));
  await core.login({ techId: 'u', password: 'another-pw-1' }); ok('own password change works');
  await core.techOp({ op: 'setPassword', id: 'n', password: 'noah-gets-one' }, ctx('a', 'admin')); await core.login({ techId: 'n', password: 'noah-gets-one' });
  assert.ok(JSON.parse(f.store.get('pub/roster').v).find(x => x.id === 'n').pw); ok('admin sets a first password for a no-password account');
  await core.techOp({ op: 'remove', id: zid }, ctx('a', 'admin')); assert.ok(!f.store.has('acct/' + zid) && !JSON.parse(f.store.get('pub/roster').v).find(x => x.id === zid)); ok('remove deletes account and roster entry');
  await rejects(core.techOp({ op: 'makeMaster', id: 'a' }, ctx('a', 'admin')), 'permission-denied'); ok('only master can transfer master');
  await core.techOp({ op: 'makeMaster', id: 'a' }, ctx('m', 'master')); list = JSON.parse(f.store.get('data/technicians').p);
  assert.strictEqual(list.find(t => t.id === 'a').userRole, 'master'); assert.strictEqual(list.find(t => t.id === 'm').userRole, 'admin'); ok('master transfer swaps roles');
  assert.strictEqual(list.filter(t => t.userRole === 'master').length, 1);
  assert.ok(!JSON.parse(f.store.get('pub/roster').v).some(x => 'userRole' in x || 'email' in x || 'phone' in x), 'roster has no roles or contact details'); ok('public roster exposes only id, name, avatar, dept');

  // ── claim master / bootstrap
  await rejects(core.techOp({ op: 'claimMaster' }, ctx('m', 'admin')), 'failed-precondition'); ok('cannot claim master while one exists');
  let sv = JSON.parse(f.store.get('data/technicians').p); sv.find(x => x.userRole === 'master').userRole = 'admin'; f.store.set('data/technicians', { p: JSON.stringify(sv) });
  await rejects(core.techOp({ op: 'claimMaster' }, ctx('u', 'user')), 'permission-denied');
  await core.techOp({ op: 'claimMaster' }, ctx('m', 'admin')); assert.strictEqual(JSON.parse(f.store.get('data/technicians').p).find(x => x.id === 'm').userRole, 'master'); ok('admin can claim master only when none exists');
  await rejects(core.bootstrap({ name: 'Late', password: 'abcdefgh' }), 'failed-precondition'); ok('bootstrap closed once crew exists');
  const f2 = makeFake(); const c2 = makeCore({ fs: f2.fs, auth: f2.auth, now: () => T, stamp: () => 'ts' });
  r = await c2.bootstrap({ name: 'First', password: 'abcdefgh', email: 'a@b.c' }); assert.strictEqual(r.role, 'master');
  assert.strictEqual(JSON.parse(f2.store.get('data/technicians').p)[0].userRole, 'master'); assert.ok(!JSON.stringify(f2.store.get('data/technicians')).includes('scrypt')); ok('bootstrap creates the first master and signs them in');

  // ── secrets + YouTube proxy
  await rejects(core.setSecret({ name: 'ytKey', value: 'K' }, ctx('u', 'user')), 'permission-denied');
  await core.setSecret({ name: 'ytKey', value: 'SECRETKEY' }, ctx('m', 'admin'));
  await rejects(core.setSecret({ name: 'adminPin', value: 'K' }, ctx('m', 'admin')), 'invalid-argument');
  f.store.set('data/settings', { p: JSON.stringify({ ytChannelId: 'UC' + 'a'.repeat(22) }) });
  const calls = []; const core2 = makeCore({ fs: f.fs, auth: f.auth, now: () => T, stamp: () => 'ts', fetchFn: async u => { calls.push(u); return { json: async () => (u.includes('playlistItems') ? { items: [{ contentDetails: { videoId: 'v1' } }] } : { items: [{ id: 'v1', snippet: { title: 'Sunday' }, liveStreamingDetails: { actualStartTime: 'x', concurrentViewers: '42' } }] }) }; } });
  r = await core2.ytLive({}, ctx('u', 'user')); assert.deepStrictEqual([r.state, r.viewers, r.title], ['live', 42, 'Sunday']); assert.ok(!JSON.stringify(r).includes('SECRETKEY')); assert.ok(calls.every(u => u.includes('SECRETKEY')));
  r = await core2.ytLive({}, ctx('u', 'user')); assert.strictEqual(calls.length, 2, 'cached for 45s'); await rejects(core2.ytLive({}, {}), 'unauthenticated'); ok('YouTube status via server; key never returned; cached; sign-in required');

  // ── public request form
  const sub = (o, ip) => core.submitExternalRequest(Object.assign({ name: 'Pat', dept: 'Kids', details: 'Need a mic', cats: ['Audio'] }, o), {}, ip || '1.1.1.1');
  await sub({}); let reqs = JSON.parse(f.store.get('data/techRequests').p); assert.strictEqual(reqs[0].requesterName, 'Pat'); assert.strictEqual(reqs[0].source, 'external'); ok('public request is stored');
  await rejects(sub({ name: '' }), 'invalid-argument'); await rejects(sub({ details: 'x'.repeat(2001) }), 'invalid-argument'); ok('required fields and length caps');
  reqs = JSON.parse(f.store.get('data/techRequests').p); await sub({ photos: ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'data:text/html;base64,AAAA'] }, '1.1.1.1');
  reqs = JSON.parse(f.store.get('data/techRequests').p); assert.deepStrictEqual(reqs[0].photos, ['data:image/png;base64,AAAA']); ok('only real images kept');
  await sub({}, '1.1.1.1'); await rejects(sub({}, '1.1.1.1'), 'resource-exhausted'); ok('4th request from one address in 10 min refused');
  await sub({}, '2.2.2.2'); T += 601000; await sub({}, '1.1.1.1'); ok('other addresses unaffected; limit resets after 10 min');
  f.store.set('rl/all', { start: T, n: 60 }); await rejects(sub({}, '9.9.9.9'), 'resource-exhausted'); f.store.delete('rl/all'); ok('global hourly cap');
  const big = Array.from({ length: 150 }, (_, i) => ({ id: 'q' + i, source: 'external', status: 'open' })); f.store.set('data/techRequests', { p: JSON.stringify(big), n: 'x', t: 'ts' });
  await rejects(sub({}, '3.3.3.3'), 'resource-exhausted'); ok('open-request cap of 150');
  // ── schedule confirmations
  const day = new Date(T + 3 * 86400000), dk = day.toISOString().slice(0, 10);
  const techsNow = JSON.parse(f.store.get('data/technicians').p);
  f.store.set('data/schedules', { p: JSON.stringify({ [dk]: { crew: ['m', 'a', 'n'], roles: {} }, '2001-01-07': { crew: ['m'] } }), n: 's', t: 'ts' });
  f.store.set('private/secrets', { ytKey: 'KEEP-ME' });
  r = await core.confirmSelf({ key: dk }, ctx('a', 'admin')); assert.ok(r.ok);
  let sc = JSON.parse(f.store.get('data/schedules').p); assert.ok(sc[dk].confirmed.a); assert.ok(!sc[dk].confirmed.m); ok('signed-in person confirms themselves');
  await rejects(core.confirmSelf({ key: dk }, ctx('u', 'user')), 'permission-denied'); ok('cannot confirm for a service you are not rostered on');
  await rejects(core.confirmSelf({ key: dk }, {}), 'unauthenticated'); ok('confirming needs sign-in (or a signed link)');
  await rejects(core.confirmSelf({ key: '2001-01-07' }, ctx('m', 'master')), 'failed-precondition'); ok('past services cannot be confirmed');
  await rejects(core.confirmSelf({ key: '2030-13-99x' }, ctx('m', 'master')), 'invalid-argument'); await rejects(core.confirmSelf({ key: '2031-01-07' }, ctx('m', 'master')), 'not-found'); ok('bad or unknown dates refused');
  const sig = await core.linkSig(dk, 'm'); assert.match(sig, /^[0-9a-f]{32}$/); assert.strictEqual(sig, await core.linkSig(dk, 'm')); assert.notStrictEqual(sig, await core.linkSig(dk, 'a'));
  assert.strictEqual(f.store.get('private/secrets').ytKey, 'KEEP-ME', 'creating the link key must not erase other secrets'); assert.ok(f.store.get('private/secrets').linkKey); ok('link signatures are stable per person and date; the YouTube key survives');
  r = await core.confirmLink({ key: dk, tech: 'm', sig }); assert.ok(r.ok && r.name); sc = JSON.parse(f.store.get('data/schedules').p); assert.ok(sc[dk].confirmed.m); ok('one-tap link confirms without signing in');
  await rejects(core.confirmLink({ key: dk, tech: 'n', sig }), 'permission-denied'); await rejects(core.confirmLink({ key: dk, tech: 'm', sig: 'f'.repeat(32) }), 'permission-denied'); await rejects(core.confirmLink({ key: dk, tech: 'm' }), 'permission-denied'); ok('a link cannot be reused for another person or forged');
  const sigU = await core.linkSig(dk, 'u'); await rejects(core.confirmLink({ key: dk, tech: 'u', sig: sigU }), 'permission-denied'); ok('a valid signature still needs the person to be on the roster');
  const lk2 = makeCore({ fs: f.fs, auth: f.auth, now: () => T, stamp: () => 'ts' }); assert.strictEqual(await lk2.linkSig(dk, 'm'), sig); ok('another server instance produces the same signatures');
  await rejects(core.makeLinks({ key: dk, techIds: ['m'] }, ctx('u', 'user')), 'permission-denied'); const ml = await core.makeLinks({ key: dk, techIds: ['m', 'a'] }, ctx('a', 'admin')); assert.strictEqual(ml.sigs.m, sig); ok('only admins can mint links');

  console.log('\nALL ' + n + ' CHECKS PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
