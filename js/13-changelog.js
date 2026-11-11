// ══════════════════════════════════════════════════
// CHANGELOG / WHAT'S NEW
// ══════════════════════════════════════════════════
const CHANGELOG = [
  {
    version: 'v3.3 — Special Events',
    date: 'Nov 2026',
    items: [
      '⭐ Special Events — add one-off events (holiday services, conferences, weddings, etc.) with date, time, location, notes, rundown, and crew + station assignments; they show alongside Sunday services in the Services list and on the calendar',
      '📅 "Sunday Schedule" is now "Services"',
    ]
  },
  {
    version: 'v3.2 — Photos, External Requests, Vendors & Bulb Forecasting',
    date: 'Aug 2026',
    items: [
      '📷 Photo Attachments — attach a photo when reporting an outage or logging gear maintenance, viewable in the outage history and service log',
      '🌐 External Tech Request Form — a no-login public form (share the link from the Tech Requests page) so other ministries can request AV/lighting/camera help directly into your queue, with multi-select categories and drag-and-drop photo/media attachments',
      '🚚 Vendors & Parts Suppliers — track where to order bulbs, cables, and gear from in Settings, then link a vendor to any fixture or gear item to see who to call for a replacement',
      '💡 Bulb Life Forecasting — set an expected life (hours) per bulb type in Inventory, log hours on installed bulbs from the Bulb Registry, and get a dashboard alert when bulbs are approaching end of life',
    ]
  },
  {
    version: 'v3.1 — Attendance Removed',
    date: 'Aug 2026',
    items: [
      '🗑️ Attendance & Self Check-In Removed — the session attendance tracker and crew QR self check-in page have been fully removed, including their nav links and dashboard widgets',
      '🏆 Leaderboard Simplified — now ranks crew by overall activity (gear checkouts + tech requests) only, since attendance streaks/sessions are no longer tracked',
      '👤 Crew Profiles Simplified — streak and session stat tiles removed from profile cards; module completion count remains',
    ]
  },
  {
    version: 'v3.0 — Bulb Tracking Fix',
    date: 'Aug 2026',
    items: [
      '🏷️ Bulb Labels Print as Unassigned — printing a sticker sheet no longer instantly counts those bulbs as "in stock"; they only count once the physical sticker is actually scanned in',
      '📥 Bulb Scan IN Fixed — scanning a bulb sticker (from the Scan page or the floating 📷 button) now actually adds it to stock; previously it just opened the manual batch-entry form and ignored the scanned code',
      '🔄 Recalc from Registry — new button on the Inventory page recalculates each bulb type\'s stock count from what\'s actually been scanned in, to fix any drift from before this update',
      '🗑️ Delete Bulb Registry Entry — each row in the Bulb Registry now has a delete button (admin) to remove a mistaken or duplicate label',
      '🏷️ "Printed — Not Scanned In" Status — Bulb Registry shows labels that have been printed but not yet stuck on a bulb and scanned',
    ]
  },
  {
    version: 'v2.9 — Phase 5 Update',
    date: 'Apr 2026',
    items: [
      '📊 Enhanced Dashboard — attendance trend chart, top crew by hours, admin alerts panel, open incidents & swap counts',
      '📄 Export Report — one-click CSV export covering crew, attendance, incidents, gear inventory, and volunteer hours',
      '📋 Audit Log — admin-only page logging every key action (crew added, schedule saved, swap resolved, etc.)',
      '📝 Performance Notes — admins can add private positive/constructive/neutral notes to any crew member\'s profile',
      '🔔 Admin Alerts Panel — dashboard shows pending swaps, open incidents, unread feedback, and low stock all in one place',
    ]
  },
  {
    version: 'v2.8 — Phase 4 Update',
    date: 'Apr 2026',
    items: [
      '📅 Single-Service Scheduling — Sunday schedule with Rehearsals as a separate tab',
      '🎸 Rehearsal Scheduling — add rehearsals with date, time, location, crew, and rundown/setlist',
      '📝 Order of Service / Rundown — attach a service rundown or setlist to any Sunday schedule',
      '↔️ Shift Swap Requests — crew can request swaps, admins get emailed and approve/deny in-app',
      '✓✗ Availability Indicators — available/unavailable crew counts shown on each schedule card',
    ]
  },
  {
    version: 'v2.7 — Phase 3 Update',
    date: 'Apr 2026',
    items: [
      '⚠️ Damage / Incident Reports — any crew member can flag gear as damaged, admins get emailed automatically',
      '⏱ Fixture & Gear Lifespan Tracker — log usage hours, see a lifespan bar on each gear card',
      '📦 Quantity & Low Stock Tracking — set quantity and low stock thresholds per gear item with alerts',
      '🎛️ Cables & Accessories Categories — new Accessory and Power Battery gear categories added',
      '📧 Overdue Checkout Reminders — email reminder button on overdue gear with days overdue shown',
      '📋 Incidents Tab — dedicated tab on checkout page showing all damage reports with resolve button',
    ]
  },
  {
    version: 'v2.6 — Phase 2 Update',
    date: 'Apr 2026',
    items: [
      '👤 Crew Profiles — phone number, emergency contact, and join date now tracked per crew member',
      '✅ Onboarding Checklist — 6-step onboarding tracker per new crew member on their profile',
      '⏱ Volunteer Hours — log and track hours served per crew member with full history',
      '💬 Feedback Form — crew can submit anonymous or named feedback; admins have a dedicated inbox',
      '📧 Announcement Emails — option to email all crew when posting an announcement',
    ]
  },
  {
    version: 'v2.5 — Phase 1 Update',
    date: 'Apr 2026',
    items: [
      '📋 Pre-show Briefing Notes — attach crew briefings to each Sunday schedule, visible on the schedule card',
      '📅 Schedule Templates — save and re-load crew templates (e.g. "Normal Sunday", "Big Production")',
      '🕐 What\'s New — this changelog! See what\'s been added to the app',
      '📢 Announcements — now supports emoji reactions (👍 ❤️ 🙏 🔥 ✅)',
    ]
  },
  {
    version: 'v2.4 — Attendance & Check-in',
    date: 'Mar 2026',
    items: [
      '✅ QR self check-in for crew members',
      '📊 Attendance tracking with session history',
      '🔒 Admin-gated attendance view',
      '🏆 Leaderboard with attendance streaks',
    ]
  },
  {
    version: 'v2.3 — Crew Profiles & Training',
    date: 'Feb 2026',
    items: [
      '👤 Crew profiles with certs and skills',
      '📚 Training Hub with modules and completion tracking',
      '🏅 Certification badges per crew member',
    ]
  },
  {
    version: 'v2.2 — Gear & Operations',
    date: 'Jan 2026',
    items: [
      '📦 Asset checkout tracking',
      '🔧 Maintenance log for all gear',
      '📝 Tech requests system',
      '📢 Team announcements feed',
    ]
  },
  {
    version: 'v2.1 — Role-Based Access',
    date: 'Dec 2025',
    items: [
      '👑 Master Admin / User Admin / Regular User roles',
      '🔑 Password-protected login per crew member',
      '🛡️ Permission-gated features',
    ]
  },
  {
    version: 'v2.0 — KCC Technical Rebrand',
    date: 'Nov 2025',
    items: [
      '🎨 Full rebrand from Stage Light Tracker to KCC Technical',
      '🌙 Dark mode support',
      '📱 PWA — install on iPhone and Android',
    ]
  },
];

const CHANGELOG_SEEN_KEY = 'kcc_changelog_seen_v33';

function openChangelog(){
  const listEl = document.getElementById('changelog-list');
  if(listEl){
    listEl.innerHTML = CHANGELOG.map((entry, i) => `
      <div style="padding:16px 20px;${i < CHANGELOG.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-family:var(--head);font-weight:700;font-size:14px;color:var(--text)">${esc(entry.version)}</div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--dim2)">${esc(entry.date)}</div>
        </div>
        <ul style="margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px">
          ${entry.items.map(item => `<li style="font-size:13px;color:var(--text);line-height:1.5;display:flex;gap:8px;align-items:flex-start"><span style="flex-shrink:0;margin-top:1px">${item.slice(0,2)}</span><span>${item.slice(2)}</span></li>`).join('')}
        </ul>
      </div>`
    ).join('');
  }
  // Mark as seen
  try { localStorage.setItem(CHANGELOG_SEEN_KEY, CHANGELOG[0].version); } catch(e){}
  const badge = document.getElementById('changelog-badge');
  if(badge) badge.style.display = 'none';
  document.getElementById('m-changelog').style.display = 'flex';
}

function checkChangelogBadge(){
  try {
    const seen = localStorage.getItem(CHANGELOG_SEEN_KEY);
    const badge = document.getElementById('changelog-badge');
    if(badge && seen !== CHANGELOG[0].version) badge.style.display = '';
  } catch(e){}
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkChangelogBadge, 1000);
  setTimeout(_updateFeedbackBadge, 1200);
});
const DEFAULT_ROLES=[
  {name:'Camera Station',icon:'📷'},
  {name:'Streaming Station',icon:'🖥️'},
  {name:'Presentation Station',icon:'📊'},
  {name:'Lighting Station',icon:'💡'},
  {name:'Sound Mixing',icon:'🎚️',restricted:true,allowed:[]},
  {name:'Standby',icon:'⏳'}
];
function getScheduleRoles(){
  return db.settings.scheduleRoles||DEFAULT_ROLES;
}
function renderRolesList(){
  const el=document.getElementById('rolesListEl');if(!el)return;
  const roles=getScheduleRoles();
  el.innerHTML=!roles.length?'<p class="dim">No roles yet.</p>':roles.map((r,i)=>`
    <div class="row jbet" style="padding:8px 10px;background:var(--s2);border-radius:6px;margin-bottom:6px">
      <div class="row gap8"><span style="font-size:18px">${r.icon}</span><span class="fw7">${esc(r.name)}</span></div>
      <button class="btn bgh bsm" onclick="removeScheduleRole(${i})" style="color:var(--red)">✕</button>
    </div>`).join('');
}
function addScheduleRole(){
  if(!isAdmin()){toast('Admin only','error');return;}
  const name=document.getElementById('newRoleName').value.trim();
  const icon=document.getElementById('newRoleIcon').value.trim()||'⭐';
  if(!name){toast('Enter a role name','error');return;}
  if(!db.settings.scheduleRoles) db.settings.scheduleRoles=[...DEFAULT_ROLES];
  db.settings.scheduleRoles.push({name,icon});
  document.getElementById('newRoleName').value='';
  document.getElementById('newRoleIcon').value='';
  save();renderRolesList();toast(name+' added','success');
}
function removeScheduleRole(idx){
  if(!isAdmin()){toast('Admin only','error');return;}
  if(!confirm('Remove this role?'))return;
  if(!db.settings.scheduleRoles) db.settings.scheduleRoles=[...DEFAULT_ROLES];
  db.settings.scheduleRoles.splice(idx,1);
  save();renderRolesList();
}

// ══════════════════════════════════════════════════
// CUSTOMIZABLE TRAINING OPTIONS
// ══════════════════════════════════════════════════
const DEFAULT_TRAINING=['Camera Station','Streaming Station','Presentation Station','Lighting Station','Sound Mixing','General Tech'];
function getTrainingOptions(){
  return db.settings.trainingOptions||DEFAULT_TRAINING;
}
function renderTrainingOptions(){
  const el=document.getElementById('trainingOptsEl');if(!el)return;
  const opts=getTrainingOptions();
  el.innerHTML=!opts.length?'<p class="dim">No options yet.</p>':opts.map((o,i)=>`
    <div class="row jbet" style="padding:7px 10px;background:var(--s2);border-radius:6px;margin-bottom:5px">
      <span>${o}</span>
      <button class="btn bgh bsm" onclick="removeTrainingOption(${i})" style="color:var(--red)">✕</button>
    </div>`).join('');
}
function addTrainingOption(){
  if(!isAdmin()){toast('Admin only','error');return;}
  const val=document.getElementById('newTrainingOpt').value.trim();
  if(!val){toast('Enter option name','error');return;}
  if(!db.settings.trainingOptions) db.settings.trainingOptions=[...DEFAULT_TRAINING];
  db.settings.trainingOptions.push(val);
  document.getElementById('newTrainingOpt').value='';
  save();renderTrainingOptions();renderTrainingGrids();
}
function removeTrainingOption(idx){
  if(!isAdmin()){toast('Admin only','error');return;}
  if(!confirm('Remove this option?'))return;
  if(!db.settings.trainingOptions) db.settings.trainingOptions=[...DEFAULT_TRAINING];
  db.settings.trainingOptions.splice(idx,1);
  save();renderTrainingOptions();
}
function renderTrainingGrids(){
  // Build training tag grids in add/edit tech modals
  ['t','et'].forEach(prefix=>{
    const el=document.getElementById(prefix+'trainingGrid');if(!el)return;
    const opts=getTrainingOptions();
    const curTech=prefix==='et'?db.technicians.find(x=>x.id===document.getElementById('etech-id')?.value):null;
    const selected=curTech?curTech.training||[]:[];
    el.innerHTML=opts.map(o=>{
      const on=selected.includes(o);
      return`<div onclick="toggleTrainingTag(this,'${prefix}','${o.replace(/'/g,"\'")}')" style="cursor:pointer;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid ${on?'var(--amber)':'var(--border2)'};background:${on?'var(--aglow)':'transparent'};color:${on?'var(--amber)':'var(--dim2)'};transition:all .18s">${o}</div>`;
    }).join('');
  });
}
function toggleTrainingTag(el,prefix,option){
  const on=el.style.borderColor.includes('amber')||el.style.background.includes('aglow');
  el.style.border=on?'1px solid var(--border2)':'1px solid var(--amber)';
  el.style.background=on?'transparent':'var(--aglow)';
  el.style.color=on?'var(--dim2)':'var(--amber)';
}
function getSelectedTraining(prefix){
  const el=document.getElementById(prefix+'trainingGrid');if(!el)return[];
  return [...el.children].filter(c=>c.style.background.includes('aglow')).map(c=>c.textContent);
}
