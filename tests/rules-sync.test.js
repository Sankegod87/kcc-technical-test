// The rules file is generated from kcc-schema.js. Fails if someone edits one without the other.
const fs = require('fs'), path = require('path'), cp = require('child_process'), assert = require('assert');
const file = path.join(__dirname, '..', 'firestore.rules');
const before = fs.readFileSync(file, 'utf8');
cp.execFileSync('node', [path.join(__dirname, '..', 'tools', 'gen-rules.js')]);
assert.strictEqual(fs.readFileSync(file, 'utf8'), before, 'firestore.rules is out of date: run node tools/gen-rules.js');
const S = require('../kcc-schema.js');
// the browser copy of the layout is the same file, so it cannot drift; check it loads there too
const vm = require('vm'); const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'kcc-schema.js'), 'utf8'), ctx);
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.window.KCC_SCHEMA.TIERS)), S.TIERS);
// every key the app keeps is placed in exactly one tier
const seen = {}; S.ALL.forEach(k => { assert.ok(!seen[k], k + ' is in two tiers'); seen[k] = 1; });
const appKeys = ['fixtures','outages','inventory','orders','usageLog','technicians','settings','usedBulbs','bulbRegistry','schedules','availability','checklistState','shows','gearItems','checkouts','maintLogs','techRequests','announcements','signoffs','trainingModules','feedbackItems','incidentReports','rehearsals','swapRequests','auditLog','vendors','specialEvents','serviceNotes'];
appKeys.forEach(k => assert.ok(S.APP_KEYS.includes(k), 'app key missing from the layout: ' + k));
assert.strictEqual(S.APP_KEYS.length, appKeys.length);
console.log('rules and layout are in sync');
