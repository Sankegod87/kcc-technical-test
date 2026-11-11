const assert = require('assert');
const { plan } = require('../tools/migrate.js');
const { pwMatches } = require('../kcc-auth-core.js');
const S = require('../kcc-schema.js');
const old = { technicians: [
  { id: 'm', name: 'Maya', userRole: 'master', passwordHash: 's2:abc', canSchedule: true },
  { id: 'u', name: 'Uma', userRole: 'weird', passwordHash: 'x1' },
  { id: 'n', name: 'Noah', userRole: 'user' } ],
  settings: { ytKey: 'SECRET', ytChannelId: 'UCx', alertSent: { a: 1 }, orgName: 'KCC', widgetPrefs: { w: 1 } },
  fixtures: [{ id: 'F1' }], schedules: { '2027-01-03': { crew: ['m'] } }, mystery: 5 };
const r = plan(old, { rand: () => 'abcd1234', stamp: 'T' });
const all = JSON.stringify(r.docs['data/technicians']) + JSON.stringify(r.docs['pub/roster']) + JSON.stringify(r.docs['data/settings']) + JSON.stringify(r.docs['data/settingsRt']);
assert.ok(!all.includes('passwordHash') && !all.includes('s2:abc') && !all.includes('SECRET'), 'no hashes or secrets in shared docs');
assert.strictEqual(r.docs['acct/m'].hash, 's2:abc'); assert.strictEqual(r.docs['acct/u'].hash, 'x1'); ok = 1;
assert.deepStrictEqual(r.docs['private/secrets'], { ytKey: 'SECRET' });
assert.deepStrictEqual(JSON.parse(r.docs['data/settings'].p), { ytChannelId: 'UCx', orgName: 'KCC' });
assert.deepStrictEqual(JSON.parse(r.docs['data/settingsRt'].p), { alertSent: { a: 1 }, widgetPrefs: { w: 1 } });
assert.strictEqual(JSON.parse(r.docs['data/technicians'].p).find(t => t.id === 'u').userRole, 'user', 'unknown role becomes user');
assert.strictEqual(r.temp.length, 1); assert.strictEqual(r.temp[0].name, 'Noah'); assert.ok(pwMatches(r.temp[0].password, r.docs['acct/n'].hash), 'temp password works');
assert.ok(S.ALL.every(k => r.docs['data/' + k]), 'every key gets a document');
assert.ok(r.notes.some(n => n.includes('mystery')));
assert.deepStrictEqual(JSON.parse(r.docs['data/fixtures'].p), [{ id: 'F1' }]);
assert.ok(JSON.parse(r.docs['pub/roster'].v).every(x => x.pw), 'everyone can sign in after migration');
assert.ok(plan({ technicians: [] }).notes.some(n => n.includes('master')), 'warns when there is no master');
console.log('migration: all checks passed');
