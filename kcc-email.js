// Builds the HTML body of the app's emails (dark "Control Room" look, matching the app).
// Shared by the browser (js/*.js) and the server (index.js). Plain data in, HTML string out.
// The EmailJS template (tools/email-templates/general.html) supplies the header, footer and
// the {{{html}}} slot; sections with no data are simply left out.
(function (root) {
  'use strict';
  var C = { bg: '#111816', tile: '#16201C', line: '#1C2724', text: '#E8F0EC', dim: '#8FA39B', acc: '#2DD4A0',
            accBg: '#0F2A22', accLine: '#1F6B52', warn: '#E0A526', warnBg: '#241D0C', warnLine: '#4A3B14', warnText: '#F2D58A' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function url(u) { u = String(u || ''); return /^https?:\/\//i.test(u) ? esc(u) : ''; }
  var FONT = "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  function label(t) { return '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + C.dim + ';font-weight:700;margin-bottom:8px;' + FONT + '">' + esc(t) + '</div>'; }
  function block(inner, top) { return '<div style="margin-top:' + (top == null ? 18 : top) + 'px;' + FONT + '">' + inner + '</div>'; }
  function button(href, text, primary) {
    var h = url(href); if (!h) return '';
    var st = primary ? 'background:' + C.acc + ';color:#0A0E0D;border:1px solid ' + C.acc + ';' : 'background:transparent;color:' + C.acc + ';border:1px solid ' + C.accLine + ';';
    return '<a href="' + h + '" style="display:inline-block;' + st + 'text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:12px;margin:0 8px 10px 0;' + FONT + '">' + esc(text) + '</a>';
  }
  function chip(t) { return '<span style="display:inline-block;background:' + C.accBg + ';color:' + C.acc + ';border:1px solid ' + C.accLine + ';border-radius:20px;padding:3px 12px;font-size:14px;font-weight:600;margin:0 6px 6px 0;">' + esc(t) + '</span>'; }
  function tile(lbl, val, w) {
    return '<td width="' + w + '" valign="top" style="background:' + C.tile + ';border:1px solid ' + C.line + ';border-radius:14px;padding:14px 18px;"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + C.dim + ';font-weight:700;">' + esc(lbl) + '</div><div style="font-size:22px;color:' + C.text + ';font-weight:800;margin-top:4px;">' + esc(val) + '</div></td>';
  }
  function list(items, numbered, dot) {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + items.map(function (x, i) {
      return '<tr><td width="30" valign="top" style="padding:5px 0;color:' + C.acc + ';font-weight:800;font-size:15px;">' + (numbered ? (i + 1) + '.' : dot ? '&bull;' : '&#10003;') + '</td><td style="padding:5px 0;color:' + C.text + ';font-size:15px;line-height:1.45;">' + esc(x) + '</td></tr>';
    }).join('') + '</table>';
  }

  // o: { name, dateStr, role, callTime, svcTime, countdown, team:[{name,role}], run:[], tasks:[], briefing, notes,
  //      rehearsal:{title,when,where,notes}, gear:[{name,due}], stream, contact:{name,phone,email},
  //      confirmUrl, swapUrl, appUrl, intro, pending:[module titles], kind:'callsheet'|'schedule' }
  function schedule(o) {
    o = o || {}; var h = '';
    h += block('<div style="font-size:17px;color:' + C.text + ';">Hi ' + esc(o.name) + ',</div><div style="font-size:15px;color:' + C.dim + ';margin-top:6px;line-height:1.5;">' +
      esc(o.intro || ('You are scheduled for ' + (o.dateStr || 'this Sunday') + '.')) + (o.countdown ? ' <b style="color:' + C.acc + ';">' + esc(o.countdown) + '</b>' : '') + '</div>', 0);
    h += block('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.accBg + ';border:1px solid ' + C.accLine + ';border-radius:14px;"><tr><td style="padding:16px 20px;"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + C.acc + ';font-weight:700;">Your station</div><div style="font-size:24px;color:' + C.text + ';font-weight:800;margin-top:4px;">' + esc(o.role || 'Not assigned yet') + '</div></td></tr></table>', 16);
    if (o.callTime || o.svcTime) h += block('<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' + tile('Call time', o.callTime || '', '49%') + '<td width="2%">&nbsp;</td>' + tile('Service', o.svcTime || '', '49%') + '</tr></table>', 12);
    if (o.confirmUrl || o.swapUrl) h += block(button(o.confirmUrl, 'I’m coming ✓', true) + button(o.swapUrl, 'Need a swap', false), 18);
    if (o.briefing) h += block('<div style="background:' + C.warnBg + ';border:1px solid ' + C.warnLine + ';border-left:4px solid ' + C.warn + ';border-radius:10px;padding:12px 16px;"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + C.warn + ';font-weight:700;">Briefing</div><div style="font-size:15px;color:' + C.warnText + ';margin-top:4px;line-height:1.5;white-space:pre-line;">' + esc(o.briefing) + '</div></div>');
    if (o.notes) h += block('<div style="background:' + C.warnBg + ';border:1px solid ' + C.warnLine + ';border-left:4px solid ' + C.warn + ';border-radius:10px;padding:12px 16px;"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + C.warn + ';font-weight:700;">Notes</div><div style="font-size:15px;color:' + C.warnText + ';margin-top:4px;line-height:1.5;white-space:pre-line;">' + esc(o.notes) + '</div></div>');
    if (o.run && o.run.length) h += block(label('Run of show') + list(o.run, true));
    if (o.tasks && o.tasks.length) h += block(label('Your checklist — ' + (o.role || '')) + list(o.tasks, false));
    if (o.team && o.team.length) h += block(label('The team') + o.team.map(function (t) { return chip(t.name + (t.role ? ' · ' + t.role : '')); }).join(''));
    if (o.weather) h += block(label('Sunday forecast \u00B7 Airdrie') + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:' + C.tile + ';border:1px solid ' + C.line + ';border-radius:14px;padding:14px 18px;"><div style="font-size:20px;color:' + C.text + ';font-weight:800;">' + o.weather.icon + ' ' + esc(o.weather.summary) + '</div><div style="font-size:14px;color:' + C.dim + ';margin-top:6px;">High ' + esc(o.weather.high) + '\u00B0C &middot; Low ' + esc(o.weather.low) + '\u00B0C' + (o.weather.pop != null ? ' &middot; ' + esc(o.weather.pop) + '% precipitation' : '') + (o.weather.wind != null ? ' &middot; wind ' + esc(o.weather.wind) + ' km/h' : '') + '</div>' + (o.weather.tip ? '<div style="font-size:14px;color:' + C.warnText + ';margin-top:10px;background:' + C.warnBg + ';border:1px solid ' + C.warnLine + ';border-radius:10px;padding:8px 12px;">' + esc(o.weather.tip) + '</div>' : '') + '</td></tr></table>');
    (o.events || []).forEach(function (ev) { h += block(label('Special event') + '<div style="font-size:15px;color:' + C.text + ';line-height:1.5;"><b>' + esc(ev.title) + '</b><br>' + esc([ev.when, ev.where].filter(Boolean).join(' \u00B7 ')) + (ev.notes ? '<br><span style="color:' + C.dim + ';">' + esc(ev.notes) + '</span>' : '') + '</div>'); });
    if (o.rehearsal) h += block(label('Rehearsal') + '<div style="font-size:15px;color:' + C.text + ';line-height:1.5;"><b>' + esc(o.rehearsal.title) + '</b><br>' + esc([o.rehearsal.when, o.rehearsal.where].filter(Boolean).join(' · ')) + (o.rehearsal.notes ? '<br><span style="color:' + C.dim + ';">' + esc(o.rehearsal.notes) + '</span>' : '') + '</div>');
    if (o.gear && o.gear.length) h += block(label('Gear you have checked out') + list(o.gear.map(function (g) { return g.name + (g.due ? ' — due ' + g.due : ''); }), false));
    if ((o.pending && o.pending.length) || (o.stationTraining && o.stationTraining.length)) h += block('<div style="background:' + C.tile + ';border:1px solid ' + C.line + ';border-radius:12px;padding:12px 16px;font-size:14px;color:' + C.text + ';line-height:1.6;">' +
      (o.pending && o.pending.length ? '<b style="color:' + C.acc + ';">You still need to finish:</b> ' + o.pending.map(esc).join(', ') + '<br>' : '') +
      (o.stationTraining && o.stationTraining.length ? '<b style="color:' + C.acc + ';">Training for ' + esc(o.role || 'your station') + ':</b> ' + o.stationTraining.map(esc).join(', ') : '') + '</div>');
    if (o.stream) h += block(label('Livestream') + '<a href="' + url(o.stream) + '" style="color:' + C.acc + ';font-size:15px;">' + esc(o.stream) + '</a>');
    var foot = button(o.appUrl, 'Open KCC Technical', !(o.confirmUrl || o.swapUrl));
    if (foot) h += block(foot, 20);
    if (o.contact && (o.contact.name || o.contact.phone || o.contact.email)) h += block('<div style="font-size:13px;color:' + C.dim + ';line-height:1.6;border-top:1px solid ' + C.line + ';padding-top:14px;">Questions or can’t make it? Contact ' + esc(o.contact.name || 'the team') + (o.contact.phone ? ' · <a href="tel:' + esc(String(o.contact.phone).replace(/[^\d+]/g, '')) + '" style="color:' + C.acc + ';text-decoration:none;">' + esc(o.contact.phone) + '</a>' : '') + (o.contact.email ? ' · <a href="mailto:' + esc(o.contact.email) + '" style="color:' + C.acc + ';text-decoration:none;">' + esc(o.contact.email) + '</a>' : '') + '</div>', 8);
    return h;
  }

  var TONES = {
    red:   { bar: '#E5484D', bg: '#2A1214', line: '#5C2227', text: '#FF9AA0' },
    amber: { bar: C.warn, bg: C.warnBg, line: C.warnLine, text: C.warnText },
    green: { bar: C.acc, bg: C.accBg, line: C.accLine, text: C.acc },
    blue:  { bar: '#5B9DF5', bg: '#0F1B2D', line: '#24456F', text: '#A9CCFF' }
  };
  // o: { name, groups:[{cat, items:[]}], appUrl }
  function digest(o) {
    o = o || {}; var h = block('<div style="font-size:17px;color:' + C.text + ';">Hi ' + esc(o.name) + ',</div><div style="font-size:15px;color:' + C.dim + ';margin-top:6px;">Here is what needs attention:</div>', 0);
    (o.groups || []).forEach(function (g) {
      var T = /overdue|outage|out\b|damage/i.test(g.cat) ? TONES.red : /low|stock|bulb|maint/i.test(g.cat) ? TONES.amber : TONES.blue;
      h += block('<div style="background:' + T.bg + ';border:1px solid ' + T.line + ';border-left:6px solid ' + T.bar + ';border-radius:12px;padding:12px 16px;"><div style="font-size:13px;font-weight:800;color:' + T.text + ';">' + esc(g.cat) + ' <span style="color:' + C.dim + ';font-weight:600;">(' + g.items.length + ')</span></div>' + list(g.items, false, true) + '</div>', 12);
    });
    var b = button(o.appUrl, 'Open KCC Technical', true); if (b) h += block(b, 20);
    return h;
  }

  // One alert: a coloured banner with a headline, key/value rows and an optional note.
  // o: { name, tone:'red'|'amber'|'green'|'blue', badge, headline, rows:[[label,value]], body, appUrl }
  function notice(o) {
    o = o || {}; var T = TONES[o.tone] || TONES.amber;
    var h = block('<div style="font-size:17px;color:' + C.text + ';">Hi ' + esc(o.name) + ',</div>', 0);
    h += block('<div style="background:' + T.bg + ';border:1px solid ' + T.line + ';border-left:6px solid ' + T.bar + ';border-radius:14px;padding:16px 20px;">' +
      (o.badge ? '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + T.text + ';font-weight:800;">' + esc(o.badge) + '</div>' : '') +
      '<div style="font-size:21px;color:' + C.text + ';font-weight:800;margin-top:4px;line-height:1.3;">' + esc(o.headline) + '</div></div>', 12);
    if (o.rows && o.rows.length) h += block('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C.tile + ';border:1px solid ' + C.line + ';border-radius:14px;">' + o.rows.map(function (r, i) {
      return '<tr><td style="padding:10px 18px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:' + C.dim + ';font-weight:700;' + (i ? 'border-top:1px solid ' + C.line + ';' : '') + '" width="38%" valign="top">' + esc(r[0]) + '</td><td style="padding:10px 18px;font-size:15px;color:' + C.text + ';font-weight:600;' + (i ? 'border-top:1px solid ' + C.line + ';' : '') + '">' + esc(r[1]) + '</td></tr>';
    }).join('') + '</table>');
    if (o.body) h += block('<div style="font-size:15px;color:' + C.text + ';line-height:1.6;white-space:pre-line;">' + esc(o.body) + '</div>');
    var b = button(o.appUrl, 'Open KCC Technical', true); if (b) h += block(b, 18);
    return h;
  }

  // Sunday forecast for Airdrie, Alberta from Open-Meteo (free, no key). Returns null if it cannot be fetched.
  var WMO = [[[0], '\u2600\uFE0F', 'Clear'], [[1, 2], '\u26C5', 'Partly cloudy'], [[3], '\u2601\uFE0F', 'Cloudy'], [[45, 48], '\uD83C\uDF2B\uFE0F', 'Fog'],
    [[51, 53, 55, 56, 57], '\uD83C\uDF26\uFE0F', 'Drizzle'], [[61, 63, 65, 66, 67, 80, 81, 82], '\uD83C\uDF27\uFE0F', 'Rain'], [[71, 73, 75, 77, 85, 86], '\u2744\uFE0F', 'Snow'], [[95, 96, 99], '\u26C8\uFE0F', 'Thunderstorms']];
  function weatherFor(dateKey, fetchFn) {
    var f = fetchFn || (typeof fetch === 'function' ? fetch : null); if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return Promise.resolve(null);
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=51.2917&longitude=-114.0144&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,wind_speed_10m_max&timezone=America%2FEdmonton&forecast_days=16';
    var timer = new Promise(function (res) { setTimeout(function () { res(null); }, 5000); });
    var get = Promise.resolve().then(function () { return f(u); }).then(function (r) { return r && r.ok ? r.json() : null; }).then(function (j) {
      var d = j && j.daily; if (!d || !d.time) return null; var i = d.time.indexOf(dateKey); if (i < 0) return null;
      var code = d.weather_code[i], hit = null; WMO.forEach(function (w) { if (w[0].indexOf(code) >= 0) hit = w; });
      var hi = Math.round(d.temperature_2m_max[i]), lo = Math.round(d.temperature_2m_min[i]), pop = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
          snow = d.snowfall_sum ? d.snowfall_sum[i] : 0, wind = d.wind_speed_10m_max ? Math.round(d.wind_speed_10m_max[i]) : null, tips = [];
      if (lo <= -20) tips.push('Bitterly cold: dress warm and allow extra time to get here.');
      if ((snow || 0) >= 2 || (hit && hit[2] === 'Snow')) tips.push('Snow expected: allow extra travel time.');
      else if (pop != null && pop >= 60 && hit && hit[2] === 'Rain') tips.push('Rain likely: bring a jacket.');
      if (wind != null && wind >= 50) tips.push('Windy: drive carefully.');
      if (isNaN(hi) || isNaN(lo)) return null;
      return { icon: hit ? hit[1] : '', summary: hit ? hit[2] : 'Forecast', high: hi, low: lo, pop: pop, wind: wind, tip: tips.join(' ') };
    }).catch(function () { return null; });
    return Promise.race([get, timer]);
  }


  // ── Tech requests (the public form + the admin inbox) ──
  function fmtDay(ms) { try { return new Date(ms).toLocaleDateString('en-US', { timeZone: 'America/Edmonton', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } }
  function reqRows(r, withRef) {
    var rows = [];
    if (withRef && r.ref) rows.push(['Reference', r.ref]);
    if (r.requesterType === 'venue') rows.push(['Booking type', 'Venue booking']);
    rows.push([r.requesterType === 'venue' ? 'Group' : 'Ministry', r.requesterDept || '']);
    if (r.requesterName) rows.push(['Requested by', r.requesterName]);
    if (r.agreement) rows.push(['Agreement', 'Signed by ' + r.agreement.signerName + (r.agreement.method === 'drawn' ? ' (hand-drawn signature)' : ' (typed name)') + ' \u00B7 v' + r.agreement.version]);
    var ct = [r.requesterEmail, r.requesterContact].filter(Boolean).join(' · '); if (ct) rows.push(['Contact', ct]);
    if (r.eventType) rows.push(['Event type', r.eventType]);
    if (r.neededBy) rows.push(['Date', fmtDay(r.neededBy)]);
    var t12 = function (v) { var m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); if (!m) return v || ''; var h = +m[1]; return (h % 12 || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM'); };
    var tm = t12(r.startTime) + (r.endTime ? ' – ' + t12(r.endTime) : ''); if (tm.trim()) rows.push(['Time', tm.trim()]);
    if (r.location) rows.push([r.requesterType === 'venue' ? 'Venue' : 'Where', r.location]);
    if (r.attendance) rows.push(['Expected attendance', String(r.attendance)]);
    if (r.bookingRef) rows.push(['Booking reference', r.bookingRef]);
    if (r.category) rows.push(['Needs', r.category]);
    return rows.filter(function (x) { return x[1]; });
  }
  function requestSubject(kind, r, status) {
    if (kind === 'admin') return (r.priority === 'urgent' ? 'URGENT tech request: ' : r.requesterType === 'venue' ? 'New venue tech request: ' : 'New tech request: ') + (r.requesterDept || '');
    if (kind === 'requester') return 'We received your tech request';
    return 'Your tech request was ' + ({ approved: 'approved', declined: 'declined', done: 'completed', progress: 'scheduled' }[status] || 'updated');
  }
  function requestNew(o) {
    var r = o.req, urgent = r.priority === 'urgent';
    return notice({ name: o.name, tone: urgent ? 'red' : 'amber', badge: urgent ? 'Urgent tech request' : r.requesterType === 'venue' ? 'Venue booking \u00B7 tech request' : 'New tech request', headline: (r.requesterDept || (r.requesterType === 'venue' ? 'A group' : 'A ministry')) + ' needs tech support',
      rows: reqRows(r, true), body: (r.details || '').slice(0, 800), appUrl: o.appUrl });
  }

  // The full signed agreement, for the copy emailed to the person who signed it.
  function agreementCopy(r) {
    var A = root.KCC_AGREEMENT || (typeof require === 'function' ? require('./kcc-agreement.js') : null), g = r && r.agreement; if (!A || !g) return '';
    var when = ''; try { when = new Date(g.signedAt).toLocaleString('en-CA', { timeZone: 'America/Edmonton', dateStyle: 'full', timeStyle: 'short' }); } catch (e) {}
    var sig = g.method === 'drawn' ? '<span style="color:#10231B;font-size:15px;">(hand-drawn signature on file)</span>' : '<span style="font-family:\'Snell Roundhand\',\'Segoe Script\',\'Brush Script MT\',cursive;font-size:30px;color:#10231B;">' + esc(g.signerName) + '</span>';
    return block('<div style="border-top:1px solid ' + C.line + ';padding-top:18px;"><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + C.acc + ';font-weight:700;margin-bottom:8px;">Your signed agreement</div>' +
      '<div style="background:#ffffff;border-radius:12px;padding:14px 18px;margin-bottom:12px;">' + sig + '<div style="font-size:12px;color:#4A5B54;margin-top:6px;">Signed electronically by ' + esc(g.signerName) + '<br>' + esc(when) + '<br>Version ' + esc(g.version) + '</div></div>' +
      '<div style="font-size:15px;color:' + C.text + ';font-weight:800;">' + esc(A.TITLE) + '</div>' +
      '<div style="font-size:13px;color:' + C.dim + ';line-height:1.6;margin-top:6px;">' + esc(A.INTRO) + '</div>' +
      A.CLAUSES.map(function (c, i) { return '<div style="font-size:13px;color:' + C.acc + ';font-weight:700;margin-top:12px;">' + (i + 1) + '. ' + esc(c[0]) + '</div><div style="font-size:13px;color:' + C.dim + ';line-height:1.6;">' + esc(c[1]) + '</div>'; }).join('') + '</div>', 20);
  }
  function requestReceipt(o) {
    var r = o.req;
    return notice({ name: o.name, tone: 'green', badge: 'Request received', headline: 'We got your request', rows: reqRows(r, true),
      body: 'The tech team will review it and get back to you. Keep this email for your reference.' + (r.agreement ? ' Your signed agreement is below.' : '') }) + agreementCopy(r);
  }
  function requestStatus(o) {
    var r = o.req, st = o.status, T = { approved: ['green', 'Approved', 'Your request has been approved.'], declined: ['red', 'Declined', 'We are not able to help with this request.'], done: ['green', 'Completed', 'This request is complete.'], progress: ['blue', 'Scheduled', 'Your request is on the schedule.'] }[st] || ['blue', 'Update', 'There is an update on your request.'];
    return notice({ name: o.name, tone: T[0], badge: T[1], headline: T[2], rows: reqRows(r, true), body: o.note || '', appUrl: '' });
  }

  var api = { requestNew: requestNew, requestReceipt: requestReceipt, requestStatus: requestStatus, requestSubject: requestSubject, schedule: schedule, digest: digest, notice: notice, weatherFor: weatherFor, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KCC_EMAIL = api;
})(typeof window !== 'undefined' ? window : this);
