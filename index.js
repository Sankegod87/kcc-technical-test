const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Server-side sign-in, account management, request form and YouTube proxy.
const kcc = require("./kcc-auth.js");
Object.keys(kcc).filter((k) => k[0] !== "_").forEach((k) => (exports[k] = kcc[k]));
const SCHEMA = require("./kcc-schema.js");

// ─────────────────────────────────────────────────────────────────────────────
// Server-side call sheets (so they go out even when no admin has the app open).
// NOT DEPLOYED. Before deploying:
//   1. In EmailJS: Account > Security > turn on "Allow EmailJS API for non-browser applications".
//   2. Set env/secrets: EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, APP_URL (the site address, optional).
//   3. Turn OFF "auto-send call sheets" inside the app so the browser and the server don't both send.
// It honours the same "autoCallSheets" setting, sends 48h before call time, and records what it sent in
// its own document (private/server-sent) so it never overwrites the app's data.
// ─────────────────────────────────────────────────────────────────────────────
const TZ = "America/Edmonton";
const EJ_SERVICE = "service_pjzebxk";
const EJ_TEMPLATE = "template_ebt36uu";

function tzParts(ms) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" });
  const o = {}; f.formatToParts(new Date(ms)).forEach((p) => (o[p.type] = p.value));
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday) };
}
// Epoch ms for a wall-clock time in Edmonton.
function tzEpoch(y, m, d, h, min) {
  let guess = Date.UTC(y, m - 1, d, h, min);
  for (let i = 0; i < 2; i++) {
    const p = tzParts(guess);
    guess -= Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Date.UTC(y, m - 1, d, h, min);
  }
  return guess;
}
const pad2 = (n) => String(n).padStart(2, "0");

exports.autoCallSheets = functions.pubsub.schedule("every 60 minutes").timeZone(TZ).onRun(async () => {
  const readKey = async (key, dflt) => {
    const s = await admin.firestore().doc("data/" + key).get();
    if (!s.exists) return dflt;
    try { return JSON.parse(s.data().p); } catch (e) { return dflt; }
  };
  const settings = await readKey("settings", {});
  if (!settings.autoCallSheets) return null;
  const appData = { settings, schedules: await readKey("schedules", {}), technicians: await readKey("technicians", []) };

  // Next service Sunday (today counts until 2pm), in Edmonton time.
  const now = Date.now(), p = tzParts(now);
  let add = (7 - p.wd) % 7;
  if (add === 0 && p.h >= 14) add = 7;
  const sunUtc = new Date(Date.UTC(p.y, p.m - 1, p.d + add));
  const sy = sunUtc.getUTCFullYear(), sm = sunUtc.getUTCMonth() + 1, sd = sunUtc.getUTCDate();
  const key = `${sy}-${pad2(sm)}-${pad2(sd)}`;
  const [ch, cm] = String(settings.callTime || "09:00").split(":").map(Number);
  const [vh, vm] = String(settings.serviceTime || "10:30").split(":").map(Number);
  const callAt = tzEpoch(sy, sm, sd, ch || 0, cm || 0);
  if (now < callAt - 48 * 36e5 || now > callAt + 15 * 36e5) return null;

  const entry = (appData.schedules || {})[key];
  if (!entry || !(entry.crew || []).length) return null;

  const sentRef = admin.firestore().doc("private/server-sent");
  const sent = ((await sentRef.get()).data() || {});
  const fmtT = (h, m) => new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
  const dateStr = new Date(Date.UTC(sy, sm - 1, sd)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
  const team = entry.crew.map((id) => { const t = (appData.technicians || []).find((x) => x.id === id); return t ? t.name + (entry.roles && entry.roles[id] ? ` (${entry.roles[id]})` : "") : ""; }).filter(Boolean);
  const run = (entry.rundown || "").split(/\n|·/).map((x) => x.trim()).filter(Boolean);
  const rehearsals = await readKey("rehearsals", []), checkouts = await readKey("checkouts", []), gearItems = await readKey("gearItems", []), modules = await readKey("trainingModules", []), specialEvents = await readKey("specialEvents", []);
  const weather = await require("./kcc-email.js").weatherFor(key);
  let count = 0;

  for (const id of entry.crew) {
    const t = (appData.technicians || []).find((x) => x.id === id);
    const mark = `${key}_${id}`;
    if (!t || !t.email || sent[mark] || (entry.callSheetSent && entry.callSheetSent[id])) continue;
    const role = entry.roles && entry.roles[id];
    const base = process.env.APP_URL || "";
    const sig = base ? await kcc._core.linkSig(key, id) : "";
    const q = (k, extra) => base + "?" + k + "=" + encodeURIComponent(key) + "&tech=" + encodeURIComponent(id) + (extra || "");
    const rh = rehearsals.filter((r) => r.date >= now - 864e5 && r.date <= sunUtc.getTime() + 864e5 && (!(r.crew || []).length || r.crew.includes(id))).sort((x, y) => x.date - y.date)[0];
    const dcount = Math.round((callAt - now) / 864e5);
    const html = require("./kcc-email.js").schedule({
      name: t.name, dateStr, role: role || "", callTime: fmtT(ch || 0, cm || 0), svcTime: fmtT(vh || 0, vm || 0),
      intro: "Here is your call sheet for " + dateStr + ".",
      countdown: dcount > 1 ? "Call time is in " + dcount + " days." : dcount === 1 ? "Call time is tomorrow." : dcount === 0 ? "Call time is today." : "",
      team: entry.crew.map((cid) => { const x = (appData.technicians || []).find((y) => y.id === cid); return x ? { name: x.name, role: (entry.roles && entry.roles[cid]) || "" } : null; }).filter(Boolean),
      run, tasks: (role && settings.checklistTasks && settings.checklistTasks[role]) || [], briefing: entry.briefing || "",
      rehearsal: rh ? { title: rh.title, when: new Date(rh.date).toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }) + (rh.time ? " at " + rh.time : ""), where: rh.location, notes: rh.notes } : null,
      gear: checkouts.filter((c) => c.personId === id && !c.returnedAt).map((c) => { const g = gearItems.find((x) => x.id === c.gearId); return { name: g ? g.name : "Gear item", due: c.dueDate ? new Date(c.dueDate).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" }) : "" }; }),
      pending: modules.filter((m) => m.mandatory && !(t.completedModules || []).includes(m.id)).map((m) => m.title),
      weather,
      events: specialEvents.filter((r) => r.date >= now - 864e5 && r.date <= sunUtc.getTime() + 864e5 && (!(r.crew || []).length || r.crew.includes(id))).sort((x, y) => x.date - y.date).map((r) => ({ title: r.title, when: new Date(r.date).toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }) + (r.time ? " at " + r.time : ""), where: r.location, notes: r.notes })),
      stationTraining: role ? modules.filter((m) => !m.mandatory && (m.stations || []).includes(role) && !(t.completedModules || []).includes(m.id)).map((m) => m.title) : [],
      stream: settings.ytChannelId ? "https://www.youtube.com/channel/" + settings.ytChannelId + "/live" : "",
      contact: Object.assign({ name: "Isaac", phone: "587-664-3421", email: "ayodejiiojo@gmail.com" }, settings.emailContact || {}),
      confirmUrl: base ? q("confirm", sig ? "&sig=" + encodeURIComponent(sig) : "") : "", swapUrl: base ? q("swap") : "", appUrl: base,
    });
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: EJ_SERVICE, template_id: EJ_TEMPLATE, user_id: process.env.EMAILJS_PUBLIC_KEY, accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: { to_email: t.email, to_name: t.name, subject: "Call sheet: " + dateStr, message: "", html, fixture_name: "Call sheet for " + dateStr, fixture_id: key, bulb_type: dateStr, reported_by: "KCC Technical" } }),
      });
      if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`);
      sent[mark] = Date.now(); count++;
    } catch (err) { console.error(`Call sheet failed for ${t.name}:`, err.message); }
  }
  if (count) await sentRef.set(sent, { merge: true });
  console.log(`Call sheets sent: ${count} for ${key}`);
  return null;
});
