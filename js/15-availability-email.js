// ══════════════════════════════════════════════════
// DARK MODE (only theme)
// ══════════════════════════════════════════════════
// Dark mode is the only theme. There is no light mode and no toggle.
function applyTheme(){ document.body.classList.add('dark-mode'); }
function initTheme(){ applyTheme(); }

// ══════════════════════════════════════════════════
// PRE-SHOW CHECKLIST
// ══════════════════════════════════════════════════
let _checklistActive=false;


// ══════════════════════════════════════════════════
// CREW AVAILABILITY
// ══════════════════════════════════════════════════
function availBlackouts(techId){
  const a=(db.availability&&db.availability[techId])||{};
  return Array.isArray(a.__blackouts)?a.__blackouts:[];
}
// 'yes' | 'no' | 'unknown'. A time-off range always wins; otherwise the per-Sunday answer.
function availStatus(techId,dateKey){
  if(availBlackouts(techId).some(r=>r.from<=dateKey&&dateKey<=r.to)) return 'no';
  const v=((db.availability&&db.availability[techId])||{})[dateKey];
  return v==='yes'||v==='no'?v:'unknown';
}
function availBlackoutWhy(techId,dateKey){
  const r=availBlackouts(techId).find(r=>r.from<=dateKey&&dateKey<=r.to);
  return r?(r.reason||'Time off'):'';
}
function addBlackout(){
  const me=getCurTech(); if(!me){toast('Select a technician first','error');return;}
  const from=document.getElementById('bo-from').value, to=document.getElementById('bo-to').value||from;
  const why=(document.getElementById('bo-why').value||'').trim();
  if(!from){toast('Pick a start date','error');return;}
  if(to<from){toast('End date is before the start date','error');return;}
  if(!db.availability) db.availability={};
  if(!db.availability[me.id]) db.availability[me.id]={};
  const list=availBlackouts(me.id).slice();
  list.push({from,to,reason:why});
  list.sort((x,y)=>x.from<y.from?-1:1);
  db.availability[me.id].__blackouts=list;
  save();renderAvailability();toast('Time off saved','success');
}
function removeBlackout(i){
  const me=getCurTech(); if(!me) return;
  const list=availBlackouts(me.id).slice(); list.splice(i,1);
  db.availability[me.id].__blackouts=list;
  save();renderAvailability();
}
function renderAvailability(){
  const panel=document.getElementById('availPanel');
  if(!panel)return;
  const now=new Date();
  const sundays=[];
  for(let i=1;i<=8;i++){
    const d=new Date(now);
    const daysUntil=(7-d.getDay())%7||7;
    d.setDate(d.getDate()+daysUntil+(i-1)*7);
    sundays.push(d);
  }
  const curTech=getCurTech();
  const today=schedKey(new Date());
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mine=curTech?availBlackouts(curTech.id).map((r,i)=>({r,i})).filter(x=>x.r.to>=today):[];
  const others=db.technicians.filter(t=>!curTech||t.id!==curTech.id).flatMap(t=>availBlackouts(t.id).filter(r=>r.to>=today).map(r=>({t,r})));
  const fmt=k=>new Date(k+'T12:00:00').toLocaleDateString('en-CA',{month:'short',day:'numeric'});
  panel.innerHTML=`
    <div style="overflow-x:auto">
      <table class="tbl" style="min-width:560px">
        <thead><tr>
          <th>Technician</th>
          ${sundays.map(s=>`<th style="text-align:center;white-space:nowrap">${s.toLocaleDateString('en-CA',{month:'short',day:'numeric'})}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${db.technicians.map(t=>`<tr>
            <td><div class="row gap8"><span style="font-size:18px">${esc(t.avatar||'👤')}</span><div><div class="fw7">${esc(t.name.split(' ')[0])}</div></div></div></td>
            ${sundays.map(s=>{
              const key=schedKey(s);
              const av=availStatus(t.id,key);
              const away=availBlackoutWhy(t.id,key);
              const isMe=curTech&&curTech.id===t.id;
              const icon=av==='yes'?'✅':av==='no'?'❌':'❓';
              const bg=av==='yes'?'var(--gglow)':av==='no'?'var(--rglow)':'transparent';
              return`<td style="text-align:center">
                ${isMe&&!away
                  ? `<button onclick="setAvailability('${esc(t.id)}','${key}')" style="background:${bg};border:1px solid var(--border);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:16px" title="Tap to toggle">${icon}</button>`
                  : `<span style="font-size:16px" title="${esc(away)}">${icon}</span>`
                }
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="dim" style="margin-top:10px;font-size:11px">✅ Available &nbsp; ❌ Unavailable &nbsp; ❓ Not responded &nbsp; — Tap your own row to toggle. Time off below marks you unavailable for every Sunday in the range.</div>
    ${curTech?`<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
      <div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2);margin-bottom:8px">My time off</div>
      ${mine.length?mine.map(x=>`<div class="row jbet" style="padding:6px 0;font-size:13px"><span>${fmt(x.r.from)}${x.r.to!==x.r.from?' to '+fmt(x.r.to):''}${x.r.reason?' · '+esc(x.r.reason):''}</span><button class="btn bgh bsm" onclick="removeBlackout(${esc(x.i)})">Remove</button></div>`).join(''):'<div class="dim" style="font-size:12px;margin-bottom:6px">No time off booked.</div>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:flex-end">
        <div class="fg" style="margin:0"><label>From</label><input type="date" id="bo-from"></div>
        <div class="fg" style="margin:0"><label>To</label><input type="date" id="bo-to"></div>
        <div class="fg" style="margin:0;flex:1;min-width:140px"><label>Reason (optional)</label><input id="bo-why" placeholder="e.g. Vacation"></div>
        <button class="btn ba" onclick="addBlackout()">Add time off</button>
      </div>
    </div>`:''}
    ${others.length?`<div class="dim" style="margin-top:14px;font-size:12px"><b>Crew time off:</b> ${others.slice(0,8).map(x=>esc(x.t.name.split(' ')[0])+' '+fmt(x.r.from)+(x.r.to!==x.r.from?' to '+fmt(x.r.to):'')).join(' · ')}</div>`:''}`;
}

function setAvailability(techId,dateKey){
  if(!getCurTech()||getCurTech().id!==techId){toast('You can only set your own availability','error');return;}
  if(!db.availability) db.availability={};
  if(!db.availability[techId]) db.availability[techId]={};
  const cur=db.availability[techId][dateKey]||'unknown';
  const next=cur==='yes'?'no':cur==='no'?'unknown':'yes';
  db.availability[techId][dateKey]=next;
  save();renderAvailability();
}

// ══════════════════════════════════════════════════
// BULB LIFESPAN TRACKING
// ══════════════════════════════════════════════════
function getBulbLifespanStats(){
  // Returns avg lifespan in days per bulb type based on registry history
  const stats={};
  db.bulbRegistry.forEach(b=>{
    const installs=b.history.filter(h=>h.event==='installed');
    const blown=b.history.find(h=>h.event==='blown');
    if(installs.length&&blown){
      const lastInstall=installs[installs.length-1];
      const days=Math.round((blown.timestamp-lastInstall.timestamp)/86400000);
      if(days>0){
        if(!stats[b.bulbType]) stats[b.bulbType]={total:0,count:0,min:days,max:days};
        stats[b.bulbType].total+=days;
        stats[b.bulbType].count++;
        if(days<stats[b.bulbType].min) stats[b.bulbType].min=days;
        if(days>stats[b.bulbType].max) stats[b.bulbType].max=days;
      }
    }
  });
  Object.keys(stats).forEach(k=>{
    stats[k].avg=Math.round(stats[k].total/stats[k].count);
  });
  return stats;
}

function checkPredictiveAlerts(){
  // Warn if a currently installed bulb is approaching average lifespan
  const stats=getBulbLifespanStats();
  const warnings=[];
  db.bulbRegistry.filter(b=>b.status==='installed').forEach(b=>{
    const s=stats[b.bulbType];
    if(!s||!b.installedAt) return;
    const daysIn=Math.round((Date.now()-b.installedAt)/86400000);
    const threshold=Math.round(s.avg*0.85); // warn at 85% of avg lifespan
    if(daysIn>=threshold){
      const f=db.fixtures.find(x=>x.id===b.installedIn);
      warnings.push({bulbId:b.bulbId,fixtureName:f?f.name:b.installedIn,daysIn,avg:s.avg,bulbType:b.bulbType});
    }
  });
  return warnings;
}

// ════════════════════════════════════════════════
// WELCOME EMAIL
// ════════════════════════════════════════════════
async function sendWelcomeEmail(tech, password) {
  if (!tech.email || !tech.email.includes('@')) {
    toast('⚠️ No email set for ' + tech.name + ' — welcome email skipped', 'info');
    return;
  }

  const appUrl = window.location.origin + window.location.pathname;

  const roleLabel = tech.userRole === 'master'
    ? '👑 Master Admin — full system access'
    : tech.userRole === 'admin'
    ? '🔑 User Admin — manage crew, fixtures, inventory & schedule'
    : '👤 Regular User — report outages & replacements';

  const pin = password ? password.slice(-4) : '????';

  const canScheduleNote = tech.canSchedule
    ? 'Scheduling:  ✅ You can edit the Sunday schedule\n'
    : '';

  const trainingNote = (tech.training && tech.training.length)
    ? 'Skills:      ' + tech.training.join(', ') + '\n'
    : '';

  const message =
    'Hi ' + tech.name.split(' ')[0] + ',\n\n' +
    'Welcome to the KCC Technical crew! Your account is ready to go.\n\n' +

    '════════════════════════════\n' +
    'YOUR LOGIN INFO\n' +
    '════════════════════════════\n' +
    'App Link:    ' + appUrl + '\n' +
    'Your Name:   ' + tech.name + '\n' +
    'PIN:         ' + pin + '  (last 4 digits of your phone number)\n\n' +

    '════════════════════════════\n' +
    'YOUR ROLE & ACCESS\n' +
    '════════════════════════════\n' +
    'Title:       ' + (tech.role || 'Technician') + '\n' +
    'Access:      ' + roleLabel + '\n' +
    canScheduleNote +
    trainingNote +
    '\n' +

    '════════════════════════════\n' +
    'HOW TO LOG IN\n' +
    '════════════════════════════\n' +
    '1. Open the app at the link above\n' +
    '2. Select your name from the crew list\n' +
    '3. Enter your password to log in\n' +
    '4. Check the Schedule tab for your upcoming shifts\n' +
    '5. Add the app to your home screen for quick access\n\n' +

    '════════════════════════════\n' +
    'YOUR SCHEDULE\n' +
    '════════════════════════════\n' +
    'Your shifts are listed under the Schedule tab.\n' +
    'Every Thursday you will receive an email with the upcoming Sunday roster.\n\n' +

    'If you have any trouble logging in, reach out to your crew lead.\n\n' +
    'Welcome aboard! 🎉\n' +
    '— KCC Technical';

  try {
    await emailjs.send(EJSID, EJTPL, {
      to_email: tech.email,
      to_name:  tech.name,
      subject:  '🎉 Welcome to KCC Technical — Your Account is Ready',
      message:  message
    });
    toast('📧 Welcome email sent to ' + tech.name, 'success');
  } catch(e) {
    console.warn('Welcome email failed:', e);
    toast('⚠️ Welcome email failed for ' + tech.name + ' — check EmailJS settings', 'info');
  }
}

// ════════════════════════════════════════════════
// RESEND WELCOME EMAIL (existing user)
// ════════════════════════════════════════════════
function resendWelcomeEmail(techId) {
  if (!isAdmin()) { toast('Admin permission required', 'error'); return; }
  const t = db.technicians.find(x => x.id === techId);
  if (!t) return;
  if (!t.email || !t.email.includes('@')) {
    toast('⚠️ ' + t.name + ' has no email address set — edit their profile first', 'error');
    return;
  }
  // Prompt admin for the user's current password so it can be included in the email
  const pw = prompt('Enter ' + t.name + '\'s current password to include in the welcome email.\n(Leave blank to omit password from email)');
  if (pw === null) return; // cancelled
  sendWelcomeEmail(t, pw || null);
}
