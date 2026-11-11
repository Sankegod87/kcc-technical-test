// Dry-run the migration on a JSON copy of the old data (no Firebase needed):  node tests/migrate-file.js old.json
const fs = require('fs'), assert = require('assert');
const { plan } = require('../tools/migrate.js'); const S = require('../kcc-schema.js'); const { pwMatches } = require('../kcc-auth-core.js');
const old = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const r = plan(old);
console.log('documents:', Object.keys(r.docs).length, '  notes:', r.notes.length ? r.notes.join(' | ') : 'none', '  temp passwords:', r.temp.length);
const rows = S.ALL.map(k => [k, r.docs['data/' + k].p.length]).sort((a, b) => b[1] - a[1]);
console.log('largest documents (limit 900,000):'); rows.slice(0, 5).forEach(([k, n]) => console.log('  ' + k.padEnd(16) + String(n).padStart(8) + '  ' + (n / 9000).toFixed(1) + '%'));
// round trip: put the pieces back together and compare with the original (minus hashes and the key)
const back = {}; S.APP_KEYS.forEach(k => { if (k !== 'settings') back[k] = JSON.parse(r.docs['data/' + k].p); });
back.settings = S.joinSettings(JSON.parse(r.docs['data/settings'].p), JSON.parse(r.docs['data/settingsRt'].p));
const norm = o => JSON.stringify(o, Object.keys(o).sort());
S.APP_KEYS.forEach(k => { if (k === 'technicians' || k === 'settings') return; if (old[k] !== undefined) assert.deepStrictEqual(back[k], old[k], k + ' changed in migration'); });
const os = Object.assign({}, old.settings); delete os.ytKey; assert.deepStrictEqual(back.settings, os, 'settings changed');
old.technicians.forEach((t, i) => { const m = back.technicians[i]; const o = Object.assign({}, t); delete o.passwordHash; Object.keys(o).forEach(f => { if (f === 'userRole') return; assert.deepStrictEqual(m[f], o[f], t.name + '.' + f); }); assert.strictEqual(m.passwordHash, undefined); assert.ok(m.pwSet); });
old.technicians.forEach(t => { if (t.passwordHash) assert.strictEqual(r.docs['acct/' + t.id].hash, t.passwordHash); });
assert.strictEqual(JSON.stringify(r.docs['private/secrets']), JSON.stringify({ ytKey: old.settings.ytKey }));
console.log('round trip OK: every collection and every person field survives; hashes moved to private accounts; key moved to private secrets');
