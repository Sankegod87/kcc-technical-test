#!/usr/bin/env node
// One-time move from the old single document (stage-light-tracker/main) to the split layout.
//   node tools/migrate.js            dry run: shows what would happen, writes nothing
//   node tools/migrate.js --go       does it
// Needs Google credentials with access to the project (run `gcloud auth application-default login`,
// or set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file), and GCLOUD_PROJECT=light-tracker-d708f.
// The old document is NOT deleted. Delete it yourself once you have checked the app works.
const crypto = require('crypto');
const S = require('../kcc-schema.js');
const { scryptHash } = require('../kcc-auth-core.js');

// Pure: turn the old data object into the list of documents to write.
function plan(old, opts) {
  opts = opts || {};
  const rand = opts.rand || (() => crypto.randomBytes(5).toString('hex'));
  const docs = {}, notes = [], temp = [], privNotes = {};
  const d = JSON.parse(JSON.stringify(old || {}));
  const techs = Array.isArray(d.technicians) ? d.technicians : [];
  // accounts: hashes leave the shared data
  techs.forEach(t => {
    if (t.passwordHash) { docs['acct/' + t.id] = { hash: t.passwordHash, fails: { n: 0, locks: 0, until: 0 } }; t.pwSet = true; }
    else if (opts.tempPasswords !== false) {
      const pw = rand() + 'A1'; docs['acct/' + t.id] = { hash: scryptHash(pw), fails: { n: 0, locks: 0, until: 0 } }; t.pwSet = true;
      temp.push({ name: t.name, role: t.userRole || 'user', password: pw });
    }
    delete t.passwordHash;
    if (Array.isArray(t.perfNotes) && t.perfNotes.length) { privNotes[t.id] = t.perfNotes.slice(0, 100); } delete t.perfNotes;
    if (['master', 'admin'].indexOf(t.userRole) < 0) t.userRole = 'user';
  });
  const masters = techs.filter(t => t.userRole === 'master' && t.active !== false);
  if (masters.length !== 1) notes.push('WARNING: expected exactly one active master admin, found ' + masters.length + '. Fix this before going live.');
  d.technicians = techs;
  // settings: secrets out, runtime flags split
  const sp = S.splitSettings(d.settings || {});
  d.settings = sp.settings; d.settingsRt = sp.settingsRt;
  if (Object.keys(sp.secret).length) docs['private/secrets'] = sp.secret;
  if (Object.keys(privNotes).length) docs['private/notes'] = { n: privNotes };
  // one document per key
  S.ALL.forEach(k => {
    const v = d[k];
    const dflt = (k === 'settings' || k === 'settingsRt' || k === 'schedules' || k === 'availability' || k === 'checklistState' || k === 'signoffs' || k === 'annState') ? {} : [];
    const val = v === undefined ? dflt : v;
    const p = JSON.stringify(val);
    if (p.length > 900000) notes.push('WARNING: ' + k + ' is ' + p.length + ' bytes, over the 900,000 limit.');
    docs['data/' + k] = { p, n: 'migrate', t: opts.stamp || new Date().toISOString() };
  });
  Object.keys(d).forEach(k => { if (S.ALL.indexOf(k) < 0) notes.push('Not migrated (unknown key): ' + k); });
  docs['pub/roster'] = { v: JSON.stringify(techs.map(t => ({ id: t.id, name: t.name, avatar: t.avatar || '', dept: t.dept || '', active: t.active !== false, pw: !!t.pwSet }))) };
  return { docs, notes, temp };
}

module.exports = { plan };

if (require.main === module) {
  (async () => {
    const go = process.argv.includes('--go');
    const admin = require('firebase-admin');
    admin.initializeApp();
    const db = admin.firestore();
    // --file kcc-backup-YYYY-MM-DD.json  reads the downloaded backup instead of the old Firestore document
    const fi = process.argv.indexOf('--file');
    let snap;
    if (fi > 0) { const txt = require('fs').readFileSync(process.argv[fi + 1], 'utf8'); snap = { exists: true, data: () => ({ payload: txt }) }; }
    else snap = await db.doc('stage-light-tracker/main').get();
    if (!snap.exists) { console.error('No old data document found at stage-light-tracker/main'); process.exit(1); }
    const existing = await db.doc('data/technicians').get();
    if (existing.exists && !process.argv.includes('--force')) { console.error('data/technicians already exists. Stop, or re-run with --force to overwrite.'); process.exit(1); }
    const r = plan(JSON.parse(snap.data().payload));
    console.log((go ? 'WRITING' : 'DRY RUN') + ': ' + Object.keys(r.docs).length + ' documents');
    Object.keys(r.docs).sort().forEach(p => console.log('  ' + p + (r.docs[p].p ? '  (' + r.docs[p].p.length + ' bytes)' : '')));
    r.notes.forEach(n => console.log(n));
    if (go) {
      const batch = db.batch();
      Object.keys(r.docs).forEach(p => batch.set(db.doc(p), r.docs[p]));
      await batch.commit();
      console.log('Done. The old document is still there: delete stage-light-tracker/main once you have checked the app works (it still holds the old password hashes).');
      if (r.temp.length) {
        console.log('\nThese people had NO password. Give each their temporary one and ask them to change it (Settings > Change my password). This list is shown once:');
        r.temp.forEach(t => console.log('  ' + t.name + ' (' + t.role + '): ' + t.password));
      }
    } else if (r.temp.length) console.log('\n' + r.temp.length + ' people have no password and would get a temporary one.');
  })().catch(e => { console.error(e); process.exit(1); });
}
