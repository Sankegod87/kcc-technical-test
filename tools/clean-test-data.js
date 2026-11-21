// Removes the test entries made while the app was being tried out. Only these exact items are touched. Used by `node tools/migrate.js --clean`.
const GEAR = ['gear_1776916150286'];                         // "twes"
const REQUESTS = ['req_1787364936531', 'req_1786296695054', 'req_1776916104814']; // "rr", "kk", "nnnn"
const ANNOUNCEMENTS = ['ann_1777343817704', 'ann_1777326808294']; // "ww", "Hello"
const REHEARSALS = ['rh_1789318661779'];                     // "test"
const EVENTS = ['se_1793551594315'];                         // "test"
const TEMPLATES = ['test'];                                  // schedule template named "test"
function clean(d) {
  const removed = {};
  const drop = (key, ids, field) => { if (!Array.isArray(d[key])) return; const n = d[key].length; d[key] = d[key].filter(x => ids.indexOf(x[field || 'id']) < 0); if (n !== d[key].length) removed[key] = n - d[key].length; };
  drop('gearItems', GEAR); drop('techRequests', REQUESTS); drop('announcements', ANNOUNCEMENTS); drop('rehearsals', REHEARSALS); drop('specialEvents', EVENTS);
  if (d.settings && Array.isArray(d.settings.scheduleTemplates)) { const n = d.settings.scheduleTemplates.length; d.settings.scheduleTemplates = d.settings.scheduleTemplates.filter(t => TEMPLATES.indexOf(t.name) < 0); if (n !== d.settings.scheduleTemplates.length) removed.scheduleTemplates = n - d.settings.scheduleTemplates.length; }
  // test items from trying the new version: site walks and sign-off requests from people who are not on the crew list
  const crew = (d.technicians || []).map(t => t.id);
  if (Array.isArray(d.siteWalks) && d.siteWalks.length) { removed.siteWalks = d.siteWalks.length; d.siteWalks = []; }
  if (Array.isArray(d.signoffRequests)) { const n = d.signoffRequests.length; d.signoffRequests = d.signoffRequests.filter(r => crew.indexOf(r.techId) >= 0); if (n !== d.signoffRequests.length) removed.signoffRequests = n - d.signoffRequests.length; }
  // audit lines about the removed test events
  if (Array.isArray(d.auditLog)) { const n = d.auditLog.length; d.auditLog = d.auditLog.filter(a => !(a.action === 'Special Event Saved' && a.detail === 'test')); if (n !== d.auditLog.length) removed.auditLog = n - d.auditLog.length; }
  return removed;
}
module.exports = { clean };
