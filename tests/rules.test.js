// Tests the real Firestore rules in the Firebase emulator. Run it on your own computer (the emulator needs Java and a download):
//   npm i -D firebase-tools @firebase/rules-unit-testing
//   npx firebase emulators:exec --only firestore "node tests/rules.test.js"
const fs = require('fs'), path = require('path'), assert = require('assert');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const S = require('../kcc-schema.js');

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'kcc-rules-test', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  const as = (r, cs) => env.authenticatedContext('u_' + r, { r, cs: !!cs }).firestore();
  const anon = env.unauthenticatedContext().firestore();
  const doc = (db, p) => db.doc(p);
  const val = { p: '[]', n: 'n1', t: new Date() };
  let n = 0; const ok = m => console.log('  ok', ++n, m);

  await env.withSecurityRulesDisabled(async ctx => { const d = ctx.firestore(); for (const k of S.ALL) await d.doc('data/' + k).set({ p: '[]', n: 's', t: new Date() }); await d.doc('pub/roster').set({ v: '[]' }); await d.doc('acct/x').set({ hash: 'h' }); await d.doc('private/secrets').set({ ytKey: 'k' }); });

  await assertSucceeds(doc(anon, 'pub/roster').get()); ok('anyone can read the roster');
  await assertFails(doc(anon, 'pub/roster').set({ v: 'x' })); ok('nobody can write the roster from a browser');
  for (const k of S.ALL) await assertFails(doc(anon, 'data/' + k).get()); ok('signed-out visitors cannot read any app data');
  for (const k of S.ALL) { await assertSucceeds(doc(as('user'), 'data/' + k).get()); } ok('signed-in crew can read every data document');
  for (const p of ['acct/x', 'private/secrets', 'rl/all']) for (const r of ['user', 'admin', 'master']) { await assertFails(doc(as(r), p).get()); await assertFails(doc(as(r), p).set({ a: 1 })); } ok('hashes, secrets and rate limits are unreadable and unwritable for everyone, masters included');
  await assertFails(doc(env.authenticatedContext('x', { r: 'bogus' }).firestore(), 'data/fixtures').get()); await assertFails(doc(env.authenticatedContext('x').firestore(), 'data/fixtures').get()); ok('a token without a valid role gets nothing');
  for (const k of S.TIERS.open) { await assertSucceeds(doc(as('user'), 'data/' + k).set(val)); await assertFails(doc(anon, 'data/' + k).set(val)); } ok('open data: crew can write, visitors cannot');
  await assertFails(doc(as('user', false), 'data/schedules').set(val)); await assertSucceeds(doc(as('user', true), 'data/schedules').set(val)); await assertSucceeds(doc(as('admin'), 'data/schedules').set(val)); ok('schedules: only admins or people with the can-schedule switch');
  for (const k of S.TIERS.admin) { await assertFails(doc(as('user', true), 'data/' + k).set(val)); await assertSucceeds(doc(as('admin'), 'data/' + k).set(val)); await assertSucceeds(doc(as('master'), 'data/' + k).set(val)); } ok('admin data: admins and master only');
  for (const r of ['user', 'admin', 'master']) await assertFails(doc(as(r), 'data/technicians').set(val)); ok('the crew list (roles) cannot be written from any browser');
  await assertFails(doc(as('admin'), 'data/fixtures').set({ p: '[]', n: 'n', t: new Date(), extra: 1 })); await assertFails(doc(as('admin'), 'data/fixtures').set({ p: 5, n: 'n', t: new Date() })); await assertFails(doc(as('admin'), 'data/fixtures').set({ p: 'x'.repeat(900001), n: 'n', t: new Date() })); ok('document shape and size limits');
  await assertFails(doc(as('admin'), 'data/fixtures').delete()); ok('documents cannot be deleted');
  await assertFails(doc(as('admin'), 'data/unknownkey').set(val)); await assertFails(doc(as('admin'), 'other/doc').set({ a: 1 })); ok('anything not listed is denied');
  console.log('\nRULES: ALL ' + n + ' CHECKS PASSED'); await env.cleanup();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
