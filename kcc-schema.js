// Shared data layout. Used by the Cloud Functions (Node) and the browser (loaded with a <script> tag).
// Each top-level key of the app's data object lives in its own Firestore document: data/<key>.
//   open   - any signed-in crew member can read and write
//   sched  - read: anyone signed in; write: admins, or crew with the "can schedule" switch
//   admin  - read: anyone signed in; write: admins only
//   server - read: anyone signed in; write: Cloud Functions only (accounts and roles)
// Settings are split three ways: secrets (server only), runtime flags (open) and everything else (admin).
(function (root) {
  var TIERS = {
    open: ['fixtures', 'outages', 'inventory', 'orders', 'usageLog', 'usedBulbs', 'bulbRegistry', 'availability',
      'checklistState', 'shows', 'gearItems', 'checkouts', 'maintLogs', 'signoffs', 'feedbackItems',
      'incidentReports', 'swapRequests', 'auditLog', 'serviceNotes', 'techRequests', 'annState', 'settingsRt'],
    sched: ['schedules'],
    admin: ['announcements', 'trainingModules', 'rehearsals', 'vendors', 'specialEvents', 'settings'],
    server: ['technicians']
  };
  // Settings values that any device may update (reminder bookkeeping, personal widget layout).
  var RT_SETTINGS = ['alertSent', 'alertLastRun', 'widgetPrefs'];
  // Settings values that never go to the browser; only Cloud Functions read them.
  var SECRET_SETTINGS = ['ytKey'];

  var ALL = [].concat(TIERS.open, TIERS.sched, TIERS.admin, TIERS.server);
  // Keys that exist in the app's data object (settingsRt is a storage-only split of settings).
  var APP_KEYS = ALL.filter(function (k) { return k !== 'settingsRt'; });

  function tierOf(key) {
    for (var t in TIERS) if (TIERS[t].indexOf(key) >= 0) return t;
    return null;
  }
  // Can a person with this role write to this document?  r: 'user' | 'admin' | 'master', cs: can-schedule switch
  function canWrite(key, r, cs) {
    var t = tierOf(key), admin = r === 'admin' || r === 'master', any = admin || r === 'user';
    if (t === 'open') return any;
    if (t === 'sched') return admin || (any && !!cs);
    if (t === 'admin') return admin;
    return false;
  }
  // Split the app's settings object into the three stored parts.
  function splitSettings(s) {
    s = s || {};
    var pub = {}, rt = {}, secret = {};
    Object.keys(s).forEach(function (k) {
      if (SECRET_SETTINGS.indexOf(k) >= 0) secret[k] = s[k];
      else if (RT_SETTINGS.indexOf(k) >= 0) rt[k] = s[k];
      else pub[k] = s[k];
    });
    return { settings: pub, settingsRt: rt, secret: secret };
  }
  function joinSettings(pub, rt) {
    var o = {}, k;
    for (k in (pub || {})) o[k] = pub[k];
    for (k in (rt || {})) o[k] = rt[k];
    return o;
  }

  var api = { TIERS: TIERS, RT_SETTINGS: RT_SETTINGS, SECRET_SETTINGS: SECRET_SETTINGS, ALL: ALL, APP_KEYS: APP_KEYS,
    tierOf: tierOf, canWrite: canWrite, splitSettings: splitSettings, joinSettings: joinSettings };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KCC_SCHEMA = api;
})(typeof window !== 'undefined' ? window : this);
