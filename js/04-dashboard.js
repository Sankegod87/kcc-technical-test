// ── Navigation ──
function go(page){
  // Always enforce auth — if no one is logged in, show login screen
  if(!_techId){
    showLoginScreen();
    return;
  }
  stopCamera();stopGsScanner&&stopGsScanner();
  if(page!=='sunday'&&window._sdTimer){clearInterval(window._sdTimer);window._sdTimer=null;}
  closeMoreNav&&closeMoreNav();
  ['dashboard','sunday','fixtures','inventory','history','scan','crew','settings','schedule','checklist','nfc','checkout','maintenance','requests','announcements','training','profiles','feedbackadmin','auditlog'].forEach(p=>{
    const el=document.getElementById('pg-'+p);if(el)el.style.display=p===page?'':'none';
    document.getElementById('nav-'+p)?.classList.toggle('active',p===page);
  });
  _curPage=page;
  ({dashboard:renderDash,sunday:renderSunday,fixtures:renderFix,inventory:renderInv,history:renderHist,crew:renderCrew,settings:renderSettings,schedule:()=>{renderSchedule();renderSwapRequests();},checklist:renderChecklist,nfc:renderNFC,checkout:renderCheckout,maintenance:renderMaintenance,requests:renderRequests,announcements:renderAnnouncements,training:renderTraining,profiles:renderProfiles,feedbackadmin:renderFeedbackAdmin,auditlog:renderAuditLog})[page]?.();
  applyPermissions();
  if(page==='scan'){const w=document.getElementById('noTechWarn');if(w)w.style.display=getCurTech()?'none':'';}
  ['dashboard','sunday','schedule','requests'].forEach(p=>{const b=document.getElementById('bnn-'+p);if(b)b.className='bnn'+(p===page?' active':'');});
  const bnnMore=document.getElementById('bnn-more');if(bnnMore)bnnMore.className='bnn'+(['history','crew','settings','scan','checklist','nfc','checkout','maintenance','requests','announcements','training','profiles'].includes(page)?' active':'');
  const navMore=document.getElementById('nav-more');if(navMore)navMore.className='nb'+(['inventory','history','nfc','settings','scan'].includes(page)?' active':'');
}
// Feedback is switched off for now. Set this to true to open it up again (everything else is already built).
window.KCC_FEEDBACK_LIVE=false;
function feedbackNav(){
  if(!window.KCC_FEEDBACK_LIVE){ toast('🚧 Feedback is under construction — coming soon!','info'); return; }
  if(isAdmin()) go('feedbackadmin'); else document.getElementById('m-feedback').style.display='flex';
}
function refreshPage(){
  // Only refresh if someone is logged in — never accidentally expose the app shell
  if(_techId) go(_curPage);
}
function toggleMoreNav(){
  const drop=document.getElementById('moreNavDrop');
  if(drop) drop.style.display=drop.style.display==='none'?'':'none';
}
function closeMoreNav(){
  const drop=document.getElementById('moreNavDrop');
  if(drop) drop.style.display='none';
}
// Close dropdown when clicking outside
document.addEventListener('click',e=>{
  const wrap=document.getElementById('moreNavWrap');
  if(wrap&&!wrap.contains(e.target)) closeMoreNav();
});
function showMobileMenu(){
  document.getElementById('mobileMoreMenu').style.display='';
  document.getElementById('mobileMoreOverlay').style.display='';
}
function hideMobileMenu(){
  document.getElementById('mobileMoreMenu').style.display='none';
  document.getElementById('mobileMoreOverlay').style.display='none';
}

// ── Dashboard ──
function renderDash(){
  const actOuts=db.outages.filter(o=>!o.resolved);
  const lows=db.inventory.filter(i=>i.inStock<=i.threshold);
  const total=db.inventory.reduce((s,i)=>s+i.inStock,0);
  const maintDue=getMaintDue();
  const okFix=db.fixtures.filter(f=>f.status==='ok').length;
  const pendingSwaps=(db.swapRequests||[]).filter(s=>s.status==='pending').length;
  const openIncidents=(db.incidentReports||[]).filter(r=>!r.resolved).length;
  const unreadFeedback=(db.feedbackItems||[]).filter(f=>!f.read).length;
  try{_updateFeedbackBadge();}catch(e){}
  const totalVolHours=(db.technicians||[]).reduce((s,t)=>s+(t.volunteerHours||0),0);

  document.getElementById('statsRow').innerHTML=`
    <div class="sc ${actOuts.length?'cr':'cg'}"><div class="sc-label">Active Outages</div><div class="sc-val">${actOuts.length}</div></div>
    <div class="sc ca"><div class="sc-label">Fixtures</div><div class="sc-val">${db.fixtures.length}</div></div>
    <div class="sc ${lows.length?'cr':'cg'}"><div class="sc-label">Low Stock</div><div class="sc-val">${lows.length}</div></div>
    <div class="sc cb"><div class="sc-label">Crew</div><div class="sc-val">${db.technicians.length}</div></div>
    <div class="sc" style="border-color:rgba(168,85,247,.3)"><div class="sc-label">Vol. Hours</div><div class="sc-val" style="color:#a855f7">${totalVolHours}</div></div>
    <div class="sc ${openIncidents?'cr':'cg'}"><div class="sc-label">Open Incidents</div><div class="sc-val">${openIncidents}</div></div>`;

  // ── Admin alerts panel ───────────────────────────────────
  const alertsEl = document.getElementById('dash-admin-alerts');
  if(alertsEl && isAdmin()){
    const alerts = [];
    if(pendingSwaps) alerts.push(`<div class="row gap8" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>↔️</span><span style="flex:1;font-size:13px">${pendingSwaps} pending shift swap${pendingSwaps>1?'s':''}</span><button class="btn bg bsm" onclick="go('schedule')">View</button></div>`);
    if(openIncidents) alerts.push(`<div class="row gap8" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>⚠️</span><span style="flex:1;font-size:13px">${openIncidents} unresolved incident${openIncidents>1?'s':''}</span><button class="btn bg bsm" onclick="go('checkout')">View</button></div>`);
    if(unreadFeedback) alerts.push(`<div class="row gap8" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>💬</span><span style="flex:1;font-size:13px">${unreadFeedback} unread feedback submission${unreadFeedback>1?'s':''}</span><button class="btn bg bsm" onclick="go('feedbackadmin')">View</button></div>`);
    const lowStockGear=(db.gearItems||[]).filter(g=>g.lowStockAt&&g.qty<=g.lowStockAt);
    if(lowStockGear.length) alerts.push(`<div class="row gap8" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>📦</span><span style="flex:1;font-size:13px">${lowStockGear.length} gear item${lowStockGear.length>1?'s':''} low on stock</span><button class="btn bg bsm" onclick="go('checkout')">View</button></div>`);
    const bulbsEndOfLife=db.bulbRegistry.filter(b=>b.status==='installed'&&['due-soon','overdue'].includes(bulbLifeStatus(b).status));
    if(bulbsEndOfLife.length) alerts.push(`<div class="row gap8" style="padding:8px 0;border-bottom:1px solid var(--border)"><span>💡</span><span style="flex:1;font-size:13px">${bulbsEndOfLife.length} bulb${bulbsEndOfLife.length>1?'s':''} approaching end of life</span><button class="btn bg bsm" onclick="go('inventory');invTab('registry')">View</button></div>`);
    alertsEl.innerHTML = alerts.length
      ? alerts.join('')
      : '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;color:var(--green)"><span>✅</span><span style="font-size:13px">All clear — no pending actions</span></div>';
  }

  // ── Checklist snapshot ───────────────────────────────────
  const clSnap=document.getElementById('checklistSnap');
  if(clSnap){
    const stations=typeof getScheduleRoles==='function'?getScheduleRoles():[];
    const state=db.checklistState||{};
    const fixDone=db.fixtures.filter(f=>state['fix_'+f.id]==='ok').length;
    const fixTotal=db.fixtures.length;
    const stationRows=stations.map(r=>{
      const tasks=(typeof getChecklistTasks==='function'?getChecklistTasks():{})[r.name]||[];
      const done=tasks.filter((_,i)=>state['task_'+r.name+'_'+i]).length;
      const total=tasks.length;
      if(!total) return '';
      const pct=Math.round(done/total*100);
      return`<div class="row jbet" style="padding:7px 0;border-bottom:1px solid var(--border)">
        <div class="row gap8"><span>${r.icon}</span><span style="font-size:13px">${esc(r.name)}</span></div>
        <div class="row gap8">
          <div style="width:80px;background:var(--border);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;background:${pct===100?'var(--green)':'var(--amber)'};width:${pct}%"></div></div>
          <span class="dim" style="font-size:11px;min-width:32px;text-align:right">${done}/${total}</span>
        </div>
      </div>`;
    }).filter(Boolean).join('');
    clSnap.innerHTML=`
      <div class="row jbet" style="padding:7px 0;border-bottom:1px solid var(--border)">
        <div class="row gap8"><span>💡</span><span style="font-size:13px">Fixtures</span></div>
        <div class="row gap8">
          <div style="width:80px;background:var(--border);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;background:${fixDone===fixTotal&&fixTotal>0?'var(--green)':'var(--amber)'};width:${fixTotal?Math.round(fixDone/fixTotal*100):0}%"></div></div>
          <span class="dim" style="font-size:11px;min-width:32px;text-align:right">${fixDone}/${fixTotal}</span>
        </div>
      </div>
      ${stationRows||'<div class="dim" style="padding:6px 0;font-size:12px">No station tasks set up yet</div>'}`;
  }

  document.getElementById('maintDue') && (document.getElementById('maintDue').innerHTML=!maintDue.length
    ?'<p class="cg" style="font-family:var(--mono);font-size:12px">✅ No maintenance due</p>'
    :maintDue.slice(0,5).map(f=>`<div class="row jbet" style="padding:9px 0;border-bottom:1px solid var(--border)">
        <div><div class="fw7" style="font-size:14px">${esc(f.name)}</div><div class="dim">${esc(f.id)} · due ${esc(f.dueStr)}</div></div>
        <span class="maint-badge">DUE</span>
      </div>`).join(''));
  const recent=[...db.outages].sort((a,b)=>b.timestamp-a.timestamp).slice(0,6);
  const dashReqEl = document.getElementById('dash-requests');
  if(dashReqEl){
    const openReqs=(db.techRequests||[]).filter(r=>r.status==='open'||r.status==='progress');
    dashReqEl.innerHTML = !openReqs.length
      ? '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;color:var(--green)"><span style="font-size:20px">✅</span><span>No open requests</span></div>'
      : openReqs.slice(0,4).map(r=>{
          const by=(db.technicians||[]).find(x=>x.id===r.requestedBy);
          const priColor = r.priority==='urgent'?'var(--red)':r.priority==='low'?'var(--dim2)':'var(--blue)';
          return `<div class="row jbet" style="padding:9px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div class="fw7" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.title)}</div>
              <div class="dim">${esc(r.category)}${by?' · '+by.name:''}</div>
            </div>
            <span style="font-size:10px;font-family:var(--mono);color:${priColor};flex-shrink:0;margin-left:8px">${r.priority.toUpperCase()}</span>
          </div>`;
        }).join('') + (openReqs.length>4?`<div class="dim" style="padding:8px 0;font-size:12px">+${openReqs.length-4} more</div>`:'');
  }
  document.getElementById('recentAct') && (document.getElementById('recentAct').innerHTML=!recent.length
    ?'<p class="dim">No activity yet.</p>'
    :recent.map(o=>`<div class="row gap10" style="padding:9px 0;border-bottom:1px solid rgba(31,45,66,.6)">
        <span style="font-size:17px">${o.resolved?'✅':'🔴'}</span>
        <div><div style="font-size:13px">${o.resolved?'<span class="cg">Resolved</span>':'<span class="cr">Outage</span>'}: <strong>${esc(o.fixtureName)}</strong></div>
        <div class="dim">${fmtD(o.timestamp)} · ${esc(o.reportedBy)}</div></div>
      </div>`).join(''));
  try{renderCtrlHero();}catch(e){console.warn('ctrlHero',e);}
  try{sdApplyPending();sdAutoSend();}catch(e){console.warn('callsheet',e);}
  try{renderAlertCtl();alAutoSend();}catch(e){console.warn('alerts',e);}
}


// ── Control Room hero ──
function renderCtrlHero(){
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el=document.getElementById('ctrlHero'); if(!el) return;
  const state=db.checklistState||{};
  const roles=typeof getScheduleRoles==='function'?getScheduleRoles():[];
  const tasksBy=typeof getChecklistTasks==='function'?getChecklistTasks():{};
  const sunEntry=db.schedules[schedKey(sdNextSunday())]||{crew:[],roles:{}};
  let done=0,total=0;
  const fixDone=db.fixtures.filter(f=>state['fix_'+f.id]==='ok').length;
  done+=fixDone; total+=db.fixtures.length;
  const cards=roles.map(r=>{
    const t=tasksBy[r.name]||[]; if(!t.length) return '';
    const d=t.filter((_,i)=>state['task_'+r.name+'_'+i]).length;
    done+=d; total+=t.length;
    const pct=Math.round(d/t.length*100), c=pct===100?'#2DD4A0':'#F0B24A';
    const names=(sunEntry.crew||[]).filter(id=>sunEntry.roles&&sunEntry.roles[id]===r.name).map(id=>((db.technicians.find(x=>x.id===id)||{}).name||'').split(' ')[0]).filter(Boolean);
    const who=names.length?`<div class="who">${esc(names.join(', '))}</div>`:`<div class="who none">Nobody scheduled</div>`;
    return `<div class="ch-st"><div class="k">${esc(r.name)}</div>${who}<div class="n">${d}/${t.length}</div><div class="p" style="color:${c}">${pct===100?'Ready':'In progress'}</div><div class="ch-bar"><i style="width:${pct}%;background:${c}"></i></div></div>`;
  }).filter(Boolean).join('');
  const pct=total?Math.round(done/total*100):0;
  const out=db.outages.filter(o=>!o.resolved).length;
  const maint=getMaintDue().length;
  const ok=Math.max(0,db.fixtures.length-out);
  const circ=276.5, dash=Math.round(circ*pct/100);
  const rdy=sdReadyInfo();
  const d=new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
  el.innerHTML=`
    <div class="ch-top">
      <div><div class="ch-eyebrow">${esc(d)}</div><div class="ch-title">Control Room</div></div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="sd-pill" onclick="go('sunday')" style="cursor:pointer;border:0;min-height:36px;padding:0 14px;${rdy.all?'background:#2DD4A0;color:#06231B;font-weight:700':''}">${rdy.all?'All stations ready':rdy.done.length+' of '+rdy.need.length+' stations ready'}</button>
        <button class="btn ba" onclick="go('fixtures')">Report outage</button>
      </div>
    </div>
    <div class="ch-row">
      <div class="ch-stations">
        <div class="ch-h">Stations <span>${roles.length} roles</span></div>
        <div class="ch-grid">${cards||'<div class="dim" style="font-size:12px">No station tasks set up yet</div>'}</div>
      </div>
      <div class="ch-ready">
        <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="Readiness ${pct} percent"><circle cx="52" cy="52" r="44" fill="none" stroke="#1C2724" stroke-width="10"/><circle cx="52" cy="52" r="44" fill="none" stroke="#2DD4A0" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 52 52)"/><text x="52" y="60" text-anchor="middle" font-size="26" font-weight="700" fill="#E8F0EC" font-family="Barlow Condensed,sans-serif">${pct}%</text></svg>
        <div style="flex:1"><div class="ch-h" style="margin-bottom:8px">Rig ready</div>
          <div class="ch-rig"><div><b style="color:#2DD4A0">${ok}</b><span>OK</span></div><div><b style="color:${out?'#FF6B5E':'#8FA39B'}">${out}</b><span>Out</span></div><div><b style="color:${maint?'#F0B24A':'#8FA39B'}">${maint}</b><span>Maint</span></div></div>
        </div>
      </div>
    </div>
    ${ytCardHtml()}`;
  ytStart();
}


// ══ Service Day mode ══
window._sdStation=null;
function sdNextSunday(){
  const now=new Date(), d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  // today still counts as service day until 2pm
  const add=(7-d.getDay())%7;
  if(add===0&&now.getHours()>=14) d.setDate(d.getDate()+7); else d.setDate(d.getDate()+add);
  return d;
}
function sdTimes(sun){
  const set=db.settings||{};
  const [ch,cm]=String(set.callTime||'09:00').split(':').map(Number);
  const [sh,sm]=String(set.serviceTime||'10:30').split(':').map(Number);
  const call=new Date(sun); call.setHours(ch||0,cm||0,0,0);
  const svc=new Date(sun); svc.setHours(sh||0,sm||0,0,0);
  return {call,svc};
}
function sdFmtDiff(ms){
  const neg=ms<0; ms=Math.abs(ms);
  const d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4);
  return (d?d+'d ':'')+(d||h?h+'h ':'')+m+'m';
}
function sdTick(){
  const el=document.getElementById('sdCountdown'); if(!el){return;}
  const sun=sdNextSunday(), {call,svc}=sdTimes(sun), now=Date.now();
  let label,val;
  if(now<call.getTime()){label='Call time in';val=sdFmtDiff(call-now);}
  else if(now<svc.getTime()){label='Service starts in';val=sdFmtDiff(svc-now);}
  else {label='Service started';val=sdFmtDiff(now-svc)+' ago';}
  el.querySelector('.k').textContent=label; el.querySelector('.t').textContent=val;
}
function sdCheck(key,checked){
  if(!db.checklistState) db.checklistState={};
  if(checked) db.checklistState[key]='ok'; else delete db.checklistState[key];
  save(); renderSunday();
}
function sdPickStation(name){ window._sdStation=name; renderSunday(); }
function sdSetCallTime(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const v=prompt('Call time (24h, e.g. 09:00)',(db.settings.callTime||'09:00'));
  if(v&&/^\d{1,2}:\d{2}$/.test(v.trim())){db.settings.callTime=v.trim();save();renderSunday();}
}
function sdReportOutage(){
  const sel=document.getElementById('sdOutFix'); if(!sel||!sel.value){toast('Pick a fixture first','error');return;}
  openOutModal(sel.value);
}

// ══ Call sheets (email) ══
window._sdPending=(function(){
  try{
    const q=new URLSearchParams(location.search);
    const act=q.get('confirm')?'confirm':q.get('swap')?'swap':null;
    if(!act) return null;
    const o={act:act,key:q.get(act),tech:q.get('tech'),sig:q.get('sig')};
    history.replaceState(null,'',location.pathname+location.hash);
    return o;
  }catch(e){return null;}
})();
async function sdApplyPending(){
  const pnd=window._sdPending; if(!pnd||!_techId) return;
  window._sdPending=null;
  if(pnd.act==='confirm'){
    await sdConfirmKey(pnd.key);
    setTimeout(()=>go('sunday'),300);
  } else if(pnd.act==='swap'){
    toast('Open the service and request a swap','info');
    setTimeout(()=>go('schedule'),300);
  }
}
// Confirming is done by the server (crew cannot edit the schedule document themselves).
async function sdConfirmKey(key){
  if(window._syncMode!=='firebase'||!window._kccConfirm){ toast('Confirming needs the internet connection','error'); return false; }
  try{
    await window._kccConfirm(key);
    await refreshKey('schedules');
    toast('Thanks, you are confirmed. See you Sunday','success');
    return true;
  }catch(e){ toast(srvErr(e),'error'); return false; }
}
async function sdConfirmMe(){
  const me=getCurTech(); if(!me) return;
  const key=schedKey(sdNextSunday()); if(!db.schedules[key]) return;
  if(await sdConfirmKey(key)) renderSunday();
}
function sdBuildCallSheet(key,t,sun,sig){
  const e=db.schedules[key]||{}; const role=e.roles&&e.roles[t.id];
  const {call,svc}=sdTimes(sun);
  const fmtT=d=>d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  const tasks=(role&&getChecklistTasks()[role])||[];
  const run=(e.rundown||'').split(/\n|·/).map(x=>x.trim()).filter(Boolean);
  const base=location.origin==='null'||location.protocol==='file:'?location.href.split(/[?#]/)[0]:location.origin+location.pathname;
  const link=k=>base+'?'+k+'='+encodeURIComponent(key)+'&tech='+encodeURIComponent(t.id)+(k==='confirm'&&sig?'&sig='+encodeURIComponent(sig):'');
  const crew=(e.crew||[]).map(id=>{const x=db.technicians.find(y=>y.id===id);return x?x.name+(e.roles&&e.roles[id]?' ('+e.roles[id]+')':''):'';}).filter(Boolean);
  return ['Hi '+t.name+',','',
    'You are scheduled for '+sun.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})+'.',
    'Station: '+(role||'Not assigned yet'),
    'Call time: '+fmtT(call)+'   Service: '+fmtT(svc),'',
    tasks.length?'Your checklist:\n'+tasks.map(x=>'- '+x).join('\n')+'\n':'',
    run.length?'Run of show:\n'+run.map((x,i)=>(i+1)+'. '+x).join('\n')+'\n':'',
    e.briefing?'Briefing: '+e.briefing+'\n':'',
    crew.length?'Team: '+crew.join(', ')+'\n':'',
    'Confirm you are coming'+(sig?' (one tap, no sign-in)':'')+': '+link('confirm'),
    'Need a swap: '+link('swap'),'','KCC Technical'].filter(x=>x!==null).join('\n');
}
async function sendCallSheets(force,onlyUnconfirmed){
  if(!isAdmin()){toast('Admin permission required','error');return 0;}
  const sun=sdNextSunday(), key=schedKey(sun), e=db.schedules[key];
  if(!e||!(e.crew||[]).length){toast('Nobody is scheduled for '+key,'error');return 0;}
  e.callSheetSent=e.callSheetSent||{};
  let sent=0,skipped=0,missing=0;
  // The server signs each person's confirm link so one tap works without signing in.
  let sigs={}; try{ if(window._kccLinks) sigs=(await window._kccLinks(key,e.crew)).sigs||{}; }catch(err){ console.warn('could not sign links',err); }
  const dateStr=sun.toLocaleDateString(undefined,{month:'long',day:'numeric'});
  const wx=await KCC_EMAIL.weatherFor(key);
  for(const id of e.crew){
    const t=db.technicians.find(x=>x.id===id); if(!t) continue;
    if(!t.email){missing++;continue;}
    if(onlyUnconfirmed&&e.confirmed&&e.confirmed[id]){skipped++;continue;}
    if(e.callSheetSent[id]&&!force){skipped++;continue;}
    try{
      await emailjs.send(EJSID,EJTPL,kccEmailParams(t,'Call sheet: '+dateStr,KCC_EMAIL.schedule(Object.assign(kccEmailCtx(key,t,sun,sigs[id],'callsheet'),{weather:wx,intro:'Here is your call sheet for '+sun.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+'.'})),{fixture_name:'Call sheet for '+dateStr,fixture_id:key,bulb_type:dateStr}));
      e.callSheetSent[id]=Date.now(); sent++;
    }catch(err){console.warn('call sheet failed',t.name,err);}
  }
  if(sent) save();
  toast(sent+' sent'+(skipped?', '+skipped+(onlyUnconfirmed?' already confirmed or skipped':' already sent'):'')+(missing?', '+missing+' without email':''),sent?'success':'info');
  if(_curPage==='sunday') renderSunday();
  return sent;
}
function sdAutoSend(){
  // Automatic call sheets are sent by the server (autoCallSheets function), never by whoever opens the app,
  // so opening the app cannot send them a second time. Admins can still press "Send call sheets" by hand.
  return;
  if(window._sdAutoDone||!_techId||!isAdmin()||!db.settings||!db.settings.autoCallSheets) return;
  const sun=sdNextSunday(), {call}=sdTimes(sun), now=Date.now();
  if(now<call.getTime()-48*36e5||now>sun.getTime()+864e5) return;
  const e=db.schedules[schedKey(sun)]; if(!e||!(e.crew||[]).length) return;
  window._sdAutoDone=true; sendCallSheets(false);
}
function sdToggleAuto(on){ db.settings.autoCallSheets=!!on; save(); toast(on?'Call sheets will send automatically 48 hours before call time (sent by the server, even when nobody has the app open)':'Auto-send is off','info'); }

// ══ Post-service notes ══
window._psn={mood:'',wrong:'',fix:'',fixIds:[],makeReq:false,photo:''};
function psnServiceDate(){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d; }
function psnSet(k,v){ window._psn[k]=v; }
function psnMood(v){ window._psn.mood=v; renderSunday(); }
function psnAddFix(id){ if(id&&!window._psn.fixIds.includes(id)){window._psn.fixIds.push(id);renderSunday();} }
function psnRemoveFix(id){ window._psn.fixIds=window._psn.fixIds.filter(x=>x!==id); renderSunday(); }
function psnPhoto(){
  _compressImageToDataURL('psnPhotoInput',700,0.5,function(d){ window._psn.photo=d||''; renderSunday(); });
}
function psnHtml(esc){
  const n=window._psn, moods=[['smooth','Smooth'],['minor','Minor issues'],['rough','Rough']];
  const fx=db.fixtures.filter(f=>!n.fixIds.includes(f.id));
  const sunday=psnServiceDate();
  const notes=(db.serviceNotes||[]).slice(0,5);
  const label={smooth:'Smooth',minor:'Minor issues',rough:'Rough'};
  return `<div class="sd-card" id="psnCard">
    <h3>After service notes <span class="sd-pill">${esc(sunday.toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</span></h3>
    <div class="psn-f">
      <div class="psn-moods" role="group" aria-label="How did it go">${moods.map(m=>`<button type="button" class="psn-mood ${n.mood===m[0]?'on':''}" onclick="psnMood('${esc(m[0])}')">${esc(m[1])}</button>`).join('')}</div>
      <label>What went wrong</label>
      <textarea oninput="psnSet('wrong',this.value)" placeholder="Anything that broke, lagged or surprised you" style="min-height:64px;width:100%">${esc(n.wrong)}</textarea>
      <label>What to fix</label>
      <textarea oninput="psnSet('fix',this.value)" placeholder="What should be done before next Sunday" style="min-height:64px;width:100%">${esc(n.fix)}</textarea>
      <label>Related fixtures</label>
      <div>${n.fixIds.map(id=>{const f=db.fixtures.find(x=>x.id===id);return `<span class="psn-chip">${esc(f?f.name:id)}<button type="button" onclick="psnRemoveFix('${esc(id)}')" aria-label="Remove" style="background:none;border:0;color:var(--dim);cursor:pointer;font-size:14px">✕</button></span>`;}).join('')}</div>
      <select onchange="psnAddFix(this.value);this.value=''" style="width:100%"><option value="">Add a fixture…</option>${fx.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')}</select>
      <label>Photo (optional)</label>
      <input id="psnPhotoInput" type="file" accept="image/*" capture="environment" onchange="psnPhoto()">
      ${n.photo?`<img src="${esc(safeImg(n.photo))}" alt="Attached photo" style="max-width:100%;max-height:140px;border-radius:8px;margin-top:8px">`:''}
      <label style="display:flex;gap:10px;align-items:center;text-transform:none;letter-spacing:0;font-size:14px;margin-top:14px"><input type="checkbox" ${n.makeReq?'checked':''} onchange="psnSet('makeReq',this.checked)" style="width:20px;height:20px"> Also create a tech request from "What to fix"</label>
      <button class="btn ba" style="margin-top:14px;min-height:48px;width:100%;justify-content:center" onclick="psnSave()">Save notes</button>
    </div>
    ${notes.length?`<div style="margin-top:18px"><div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2);margin-bottom:4px">Recent notes</div>${notes.map(x=>`<div class="psn-note">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${esc(new Date(x.date).toLocaleDateString(undefined,{month:'short',day:'numeric'}))} · ${esc(x.by||'')}</b><span class="sd-pill">${esc(label[x.mood]||'No rating')}</span></div>
      ${x.wrong?`<div><span class="dim">Went wrong:</span> ${esc(x.wrong)}</div>`:''}
      ${x.fix?`<div><span class="dim">To fix:</span> ${esc(x.fix)}</div>`:''}
      ${(x.fixtureIds||[]).length?`<div class="dim" style="font-size:12px;margin-top:4px">Fixtures: ${x.fixtureIds.map(id=>esc((db.fixtures.find(f=>f.id===id)||{name:id}).name)).join(', ')}</div>`:''}
      ${x.photo?`<img src="${esc(safeImg(x.photo))}" alt="Attached photo" onclick="viewPhotoLightbox(this.src)" style="max-width:100%;max-height:120px;border-radius:8px;margin-top:6px;cursor:pointer">`:''}
      ${x.requestId?'<div class="dim" style="font-size:12px;margin-top:4px">Tech request created</div>':''}
      ${isAdmin()?`<button class="btn bgh bsm" style="margin-top:6px" onclick="psnDelete('${esc(x.id)}')">Delete</button>`:''}
    </div>`).join('')}</div>`:''}
  </div>`;
}
function psnSave(){
  const n=window._psn, me=getCurTech();
  if(!me){toast('Select a technician first','error');return;}
  if(!n.mood&&!n.wrong.trim()&&!n.fix.trim()){toast('Add a rating or a note first','error');return;}
  const date=psnServiceDate();
  const note={id:'psn_'+Date.now(),date:date.getTime(),dateKey:schedKey(date),by:me.name,byId:me.id,mood:n.mood,wrong:n.wrong.trim(),fix:n.fix.trim(),fixtureIds:n.fixIds.slice(),photo:n.photo||null,requestId:null,createdAt:Date.now()};
  if(n.makeReq&&n.fix.trim()){
    const req={id:'req_'+Date.now(),title:n.fix.trim().slice(0,80),category:'Other',priority:n.mood==='rough'?'urgent':'normal',neededBy:null,requestedBy:me.id,details:'From post-service notes ('+date.toLocaleDateString()+')\n\n'+n.fix.trim()+(n.wrong.trim()?'\n\nWhat went wrong: '+n.wrong.trim():''),status:'open',assignedTo:'',adminNotes:'',createdAt:Date.now()};
    if(!db.techRequests) db.techRequests=[];
    db.techRequests.unshift(req); note.requestId=req.id;
    try{_updateReqBadge();}catch(e){}
  }
  if(!db.serviceNotes) db.serviceNotes=[];
  db.serviceNotes.unshift(note);
  window._psn={mood:'',wrong:'',fix:'',fixIds:[],makeReq:false,photo:''};
  save(); toast('Notes saved','success'); renderSunday();
}
function psnDelete(id){
  if(!isAdmin()||!confirm('Delete this note?')) return;
  db.serviceNotes=(db.serviceNotes||[]).filter(x=>x.id!==id); save(); renderSunday();
}

// ══ YouTube stream tile ══
window._yt={state:'idle',title:'',viewers:null,when:null,err:'',ts:0};
window._ytEdit=false;
function ytCfg(){ const st=db.settings||{}; return {ch:(st.ytChannelId||'').trim()}; }
// The YouTube key lives on the server only. The server asks YouTube and sends back just the stream status.
async function ytPoll(force){
  if(!force&&Date.now()-window._yt.ts<45000) return;
  window._yt.ts=Date.now();
  if(window._syncMode!=='firebase'||!window._kccYtLive||!(window._authUid&&window._authUid())){ window._yt={state:'unset',ts:Date.now()}; ytPaint(); return; }
  try{
    if(isAdmin()&&window._ytKeySet===undefined){ try{ window._ytKeySet=!!(await window._kccHasSecret('ytKey')).set; }catch(e){ window._ytKeySet=false; } }
    const v=await window._kccYtLive(!!force);
    window._yt=Object.assign({},v,{ts:Date.now()});
  }catch(e){ window._yt={state:'error',err:srvErr(e),ts:Date.now()}; }
  ytPaint();
}
function ytBodyHtml(){
  const y=window._yt, c=ytCfg(), esc=v=>String(v==null?'':v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const admin=isAdmin();
  const setup=`<div class="yt-form">
      <div class="fg"><label for="yt-ch">Channel ID</label><input id="yt-ch" value="${esc(c.ch)}" placeholder="UC…"></div>
      <div class="fg"><label for="yt-key">API key</label><input id="yt-key" type="password" value="" placeholder="${window._ytKeySet?'Saved — type a new key to replace it':'YouTube Data API key'}" autocomplete="off"></div>
      <button class="btn ba" onclick="ytSaveCfg()">Save</button>
    </div>
    <div class="dim" style="font-size:12px;margin-top:8px">Use a key limited to the YouTube Data API. The key is kept on the server and is never sent to anyone's device.</div>`;
  if(window._ytEdit&&admin) return setup;
  if(y.state==='unset') return admin?`<div class="dim" style="font-size:13px">Add your channel ID and API key to see live status.</div>${setup}`:'<div class="dim" style="font-size:13px">Stream status is not set up yet.</div>';
  const link=c.ch?`<a href="https://www.youtube.com/channel/${esc(c.ch)}/live" target="_blank" rel="noopener" class="btn bgh bsm">Open stream</a>`:'';
  if(y.state==='live') return `<div class="yt-grid"><div><div class="yt-big"><span class="yt-dot live"></span>Live</div><div class="dim" style="font-size:13px;margin-top:4px">${esc(y.title)}</div></div><div style="text-align:right"><div class="yt-big">${y.viewers!=null?y.viewers:'—'}</div><div class="dim" style="font-size:12px">watching now</div></div></div><div style="margin-top:10px">${link}</div>`;
  if(y.state==='sched') return `<div class="yt-grid"><div><div class="yt-big"><span class="yt-dot sched"></span>Scheduled</div><div class="dim" style="font-size:13px;margin-top:4px">${esc(y.title)}</div></div><div style="text-align:right"><div class="yt-big" style="font-size:24px">${esc(new Date(y.when).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}))}</div><div class="dim" style="font-size:12px">starts</div></div></div><div style="margin-top:10px">${link}</div>`;
  if(y.state==='error') return `<div style="color:var(--red);font-size:13px"><span class="yt-dot"></span>Could not reach YouTube: ${esc(y.err)}</div>${admin?'<div style="margin-top:8px"><button class="btn bgh bsm" onclick="ytToggleEdit()">Check settings</button></div>':''}`;
  if(y.state==='offline') return `<div class="yt-grid"><div class="yt-big"><span class="yt-dot"></span>Offline</div>${link}</div>`;
  return '<div class="dim" style="font-size:13px">Checking YouTube…</div>';
}
function ytCardHtml(){
  return `<div class="sd-card yt-card" style="margin-top:18px"><h3>Stream status ${isAdmin()?'<button class="btn bgh bsm" onclick="ytToggleEdit()">Settings</button>':''}</h3><div class="yt-body">${ytBodyHtml()}</div></div>`;
}
function ytPaint(){ document.querySelectorAll('.yt-body').forEach(el=>{ el.innerHTML=ytBodyHtml(); }); }
function ytToggleEdit(){ window._ytEdit=!window._ytEdit; ytPaint(); }
async function ytSaveCfg(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const ch=(document.getElementById('yt-ch').value||'').trim(), key=(document.getElementById('yt-key').value||'').trim();
  if(!/^UC[\w-]{22}$/.test(ch)){toast('Channel ID should start with UC and be 24 characters','error');return;}
  if(!key&&!window._ytKeySet){toast('Enter the API key','error');return;}
  try{
    if(key){ await window._kccSetSecret('ytKey',key); window._ytKeySet=true; }
  }catch(e){ toast(srvErr(e),'error'); return; }
  db.settings.ytChannelId=ch; save();
  window._ytEdit=false; window._yt.ts=0; ytPoll(true); toast('Saved. Checking YouTube…','success');
}
function ytStart(){
  ytPaint();
  ytPoll(false);
  if(window._ytTimer) return;
  window._ytTimer=setInterval(()=>{
    if(document.hidden||!['dashboard','sunday'].includes(_curPage)) return;
    ytPoll(false);
  },60000);
}

// ══ Service readiness gate ══
// Stations that must sign off: those with someone scheduled this Sunday, or all stations if nobody is scheduled yet.
function sdReadyInfo(){
  const sun=sdNextSunday(), key=schedKey(sun), entry=db.schedules[key]||{crew:[],roles:{}};
  const roles=getScheduleRoles();
  const staffed=roles.filter(r=>(entry.crew||[]).some(id=>entry.roles&&entry.roles[id]===r.name));
  const need=staffed.length?staffed:roles;
  const ready=entry.ready||{};
  const done=need.filter(r=>ready[r.name]);
  return {key,entry,need,ready,done,all:need.length>0&&done.length===need.length};
}
function sdMarkReady(station){
  const me=getCurTech(); if(!me){toast('Select a technician first','error');return;}
  const {key,entry,ready}=sdReadyInfo();
  if(!(isAdmin()||(entry.roles&&entry.roles[me.id]===station))){toast('Only '+station+' crew or an admin can sign this off','error');return;}
  const tasks=getChecklistTasks()[station]||[], st=db.checklistState||{};
  const d=tasks.filter((_,i)=>st['task_'+station+'_'+i]).length;
  if(tasks.length&&d<tasks.length&&!confirm(station+' checklist is '+d+'/'+tasks.length+'. Mark ready anyway?')) return;
  if(!db.schedules[key]) db.schedules[key]={crew:[],roles:{}};
  const e=db.schedules[key]; e.ready=e.ready||{};
  e.ready[station]={byId:me.id,by:me.name,ts:Date.now()};
  save();
  const info=sdReadyInfo();
  toast(info.all?'All stations ready':station+' is ready','success');
  renderSunday();
}
function sdUnready(station){
  const me=getCurTech(); const {key,entry}=sdReadyInfo();
  const r=entry.ready&&entry.ready[station]; if(!r) return;
  if(!(isAdmin()||(me&&r.byId===me.id))){toast('Only the person who signed off, or an admin, can undo this','error');return;}
  delete db.schedules[key].ready[station]; save(); renderSunday();
}
function sdReadyCard(esc){
  const me=getCurTech(), {entry,need,ready,done,all}=sdReadyInfo();
  const fmtT=ts=>new Date(ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  const tasksBy=getChecklistTasks(), st=db.checklistState||{};
  return `<div class="sd-card" style="${all?'border-color:#2DD4A0':''}">
    <h3>Ready for service <span class="sd-pill" style="${all?'background:#2DD4A0;color:#06231B':''}">${all?'All stations ready':done.length+' of '+need.length+' ready'}</span></h3>
    ${need.length?need.map(r=>{
      const tasks=tasksBy[r.name]||[], d=tasks.filter((_,i)=>st['task_'+r.name+'_'+i]).length;
      const rd=ready[r.name];
      const mine=me&&(isAdmin()||(entry.roles&&entry.roles[me.id]===r.name));
      const who=(entry.crew||[]).filter(id=>entry.roles&&entry.roles[id]===r.name).map(id=>(db.technicians.find(t=>t.id===id)||{}).name).filter(Boolean).join(', ');
      return `<div class="sd-row" style="flex-wrap:wrap">
        <span style="flex:1;min-width:140px"><b>${esc(r.name)}</b><span class="dim" style="display:block;font-size:12px">${who?esc(who)+' · ':''}Checklist ${d}/${tasks.length}</span></span>
        ${rd?`<span class="sd-pill" style="color:#2DD4A0">Ready · ${esc(rd.by)} · ${esc(fmtT(rd.ts))}</span>${mine?`<button class="btn bgh bsm" onclick="sdUnready('${esc(r.name).replace(/'/g,"\\'")}')">Undo</button>`:''}`
            :`<span class="sd-pill">Not ready</span>${mine?`<button class="btn ba bsm" onclick="sdMarkReady('${esc(r.name).replace(/'/g,"\\'")}')">Mark ready</button>`:''}`}
      </div>`;}).join(''):'<div class="dim" style="font-size:13px">No stations set up yet.</div>'}
  </div>`;
}
function renderSunday(){
  const root=document.getElementById('sundayRoot'); if(!root) return;
  sdApplyPending(); sdAutoSend();
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const me=getCurTech();
  const sun=sdNextSunday(), key=schedKey(sun), entry=db.schedules[key]||{crew:[],roles:{}};
  const {call,svc}=sdTimes(sun);
  const roles=getScheduleRoles(), tasksBy=getChecklistTasks(), state=db.checklistState||{};
  const myRole=me&&entry.roles?entry.roles[me.id]:null;
  const station=window._sdStation||myRole||(roles[0]&&roles[0].name)||'';
  const tasks=tasksBy[station]||[];
  const doneN=tasks.filter((_,i)=>state['task_'+station+'_'+i]).length;
  const dateStr=sun.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const fmtT=d=>d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});

  // run of show: split on newlines or "·"
  const run=(entry.rundown||'').split(/\n|·/).map(x=>x.trim()).filter(Boolean);
  const crew=(entry.crew||[]).map(id=>{
    const t=db.technicians.find(x=>x.id===id); if(!t) return '';
    const r=entry.roles&&entry.roles[id];
    return `<div class="sd-row"><span style="font-size:20px">${esc(t.avatar||'👤')}</span><span style="flex:1;font-weight:600">${esc(t.name)}</span><span class="sd-pill">${esc(r||'Unassigned')}</span>${entry.confirmed&&entry.confirmed[id]?'<span class="sd-pill" style="color:#2DD4A0">Confirmed</span>':''}</div>`;
  }).join('');
  const outs=db.outages.filter(o=>!o.resolved);
  const fixOpts=db.fixtures.filter(f=>f.status!=='out').map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');

  root.innerHTML=`
    <div class="sd-top">
      <div><div class="ch-eyebrow" style="font-family:var(--mono);font-size:12px;letter-spacing:2px;color:var(--dim);text-transform:uppercase">${esc(dateStr)}</div>
      <div class="ch-title" style="font-family:var(--head);font-size:44px;font-weight:700;letter-spacing:-1px;line-height:1.05;margin-top:4px">Service Day</div></div>
      <div class="sd-pill">${(entry.crew||[]).length?(myRole?'You: '+esc(myRole):(me&&entry.crew.includes(me.id)?'You are scheduled':'You are not scheduled')):'No crew scheduled yet'}</div>
    </div>

    <div class="sd-count" id="sdCountdown">
      <div><div class="k"></div><div class="t"></div></div>
      <div class="m">Call ${fmtT(call)} · Service ${fmtT(svc)} ${isAdmin()?'<button class="btn bgh bsm" style="margin-left:8px" onclick="sdSetCallTime()">Edit</button>':''}</div>
    </div>

    ${sdReadyCard(esc)}
    ${ytCardHtml()}
    ${me&&(entry.crew||[]).includes(me.id)?`<div class="sd-card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div><b>${entry.confirmed&&entry.confirmed[me.id]?'You are confirmed for this Sunday':'Can you make this Sunday?'}</b></div>
      <div style="display:flex;gap:8px">${entry.confirmed&&entry.confirmed[me.id]?'':'<button class="btn ba" onclick="sdConfirmMe()">Confirm</button>'}<button class="btn bgh" onclick="go(\'schedule\')">Request swap</button></div>
    </div>`:''}
    ${isAdmin()?`<div class="sd-card">
      <h3>Call sheets <span class="sd-pill">${Object.keys(entry.callSheetSent||{}).length}/${(entry.crew||[]).length} sent · ${Object.keys(entry.confirmed||{}).length} confirmed</span></h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="btn ba" onclick="sendCallSheets(false)">Email call sheets now</button>
        <button class="btn bgh" onclick="if(confirm('Resend to everyone, including people already emailed?'))sendCallSheets(true)">Resend to all</button>
        ${(()=>{const w=(entry.crew||[]).filter(id=>!(entry.confirmed&&entry.confirmed[id]));return w.length?`<button class="btn bgh" onclick="sendCallSheets(true,true)">Remind ${w.length} unconfirmed</button>`:'';})()}
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;text-transform:none;letter-spacing:0"><input type="checkbox" ${db.settings.autoCallSheets?'checked':''} onchange="sdToggleAuto(this.checked)" style="width:20px;height:20px"> Auto-send 48 hours before call time</label>
      </div>
      ${(()=>{const w=(entry.crew||[]).filter(id=>!(entry.confirmed&&entry.confirmed[id])).map(id=>{const x=db.technicians.find(y=>y.id===id);return x?esc(x.name.split(' ')[0]):'';}).filter(Boolean);return w.length?`<div class="dim" style="font-size:13px;margin-top:10px">Waiting on: ${w.join(', ')}</div>`:((entry.crew||[]).length?'<div class="dim" style="font-size:13px;margin-top:10px">Everyone has confirmed.</div>':'');})()}
      <div class="dim" style="font-size:12px;margin-top:10px">Auto-send runs when an admin opens the app inside that window. People with no email on their profile are skipped.</div>
    </div>`:''}
    <div class="sd-card">
      <h3>Something broke?</h3>
      <div class="sd-out">
        <select id="sdOutFix"><option value="">Choose a fixture…</option>${fixOpts}</select>
        <button class="sd-btn-red" onclick="sdReportOutage()">Report outage</button>
      </div>
      ${outs.length?`<div style="margin-top:12px;font-size:13px;color:var(--red)">${outs.length} fixture${outs.length>1?'s':''} currently out: ${outs.slice(0,3).map(o=>esc(o.fixtureName)).join(', ')}${outs.length>3?'…':''}</div>`:'<div class="dim" style="margin-top:10px;font-size:12px">Nothing is out right now.</div>'}
    </div>

    <div class="sd-grid">
      <div>
        <div class="sd-card">
          <h3>${esc(station||'Station')} checklist <span><span class="sd-pill">${doneN}/${tasks.length}</span> <button class="btn bgh bsm" onclick="go('checklist')">Full checklist</button></span></h3>
          ${roles.length>1?`<select onchange="sdPickStation(this.value)" style="margin-bottom:10px;width:100%">${roles.map(r=>`<option value="${esc(r.name)}" ${r.name===station?'selected':''}>${esc(r.icon||'')} ${esc(r.name)}${r.name===myRole?' (you)':''}</option>`).join('')}</select>`:''}
          ${tasks.length?tasks.map((t,i)=>{const k='task_'+station+'_'+i,on=!!state[k];return `<label class="sd-row ${on?'done':''}"><input type="checkbox" ${on?'checked':''} onchange="sdCheck('${esc(k).replace(/'/g,"\\'")}',this.checked)"><span>${esc(typeof t==='string'?t:(t.text||t.name||t.label||''))}</span></label>`;}).join(''):'<div class="dim" style="font-size:13px">No tasks set up for this station.</div>'}
        </div>
      </div>
      <div>
        <div class="sd-card">
          <h3>Run of show <button class="btn bgh bsm" onclick="go('schedule')">Edit</button></h3>
          ${run.length?run.map((r,i)=>`<div class="sd-row"><span class="sd-pill">${i+1}</span><span>${esc(r)}</span></div>`).join(''):'<div class="dim" style="font-size:13px">No rundown yet. Add one in Schedule.</div>'}
          ${entry.briefing?`<div style="margin-top:12px;padding:12px;background:var(--s2);border-radius:10px;font-size:13px;line-height:1.5">${esc(entry.briefing)}</div>`:''}
        </div>
        ${(entry.looks||entry.cams||entry.patch)?`<div class="sd-card">
          <h3>Production notes</h3>
          ${entry.looks?`<div style="margin-bottom:12px"><div class="dim" style="font-size:12px;margin-bottom:4px">Lighting looks</div><div style="font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(entry.looks)}</div></div>`:''}
          ${entry.cams?`<div style="margin-bottom:12px"><div class="dim" style="font-size:12px;margin-bottom:4px">Camera positions</div><div style="font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(entry.cams)}</div></div>`:''}
          ${entry.patch?`<div><div class="dim" style="font-size:12px;margin-bottom:4px">Patch / audio</div><div style="font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(entry.patch)}</div></div>`:''}
        </div>`:''}
        ${canEditSchedule()?`<div class="sd-card"><h3>Show templates</h3><div class="dim" style="font-size:13px;margin-bottom:10px">Save this Sunday's rundown, looks, camera positions and patch to reuse for Easter, Youth night and so on.</div><button class="btn ba" onclick="tplSave('${key}',false)">Save this Sunday as template</button></div>`:''}
        <div class="sd-card">
          <h3>Crew</h3>
          ${crew||'<div class="dim" style="font-size:13px">Nobody scheduled yet.</div>'}
        </div>
      </div>
    </div>
    ${psnHtml(esc)}`;
  ytStart();
  sdTick();
  if(window._sdTimer) clearInterval(window._sdTimer);
  window._sdTimer=setInterval(sdTick,30000);
}


// ══ Automatic alert digest (email) ══
function alCollect(){
  const out=[], now=Date.now();
  (db.inventory||[]).filter(i=>i.inStock<=i.threshold).forEach(i=>out.push({key:'inv:'+i.bulbType,cat:'Low bulb stock',text:i.bulbType+': '+esc(i.inStock)+' left (alert at '+esc(i.threshold)+')'}));
  (db.gearItems||[]).filter(g=>g.lowStockAt&&g.qty<=g.lowStockAt).forEach(g=>out.push({key:'gear-low:'+g.id,cat:'Low gear stock',text:g.name+': '+esc(g.qty)+' left (alert at '+esc(g.lowStockAt)+')'}));
  (db.bulbRegistry||[]).filter(b=>b.status==='installed').forEach(b=>{
    const st=bulbLifeStatus(b); if(st.status==='due-soon'||st.status==='overdue')
      out.push({key:'bulb:'+b.bulbId+':'+st.status,cat:'Bulbs near end of life',text:b.bulbId+' ('+b.bulbType+(b.installedIn?' in '+b.installedIn:'')+'): '+st.label});
  });
  getMaintDue().forEach(f=>out.push({key:'maint:'+f.id,cat:'Fixture maintenance due',text:f.name+' ('+f.id+'): '+f.dueStr}));
  (db.gearItems||[]).forEach(g=>{
    if(!g.serviceInterval||!g.lastServiceDate) return;
    const due=g.lastServiceDate+g.serviceInterval*864e5;
    if(due<now+7*864e5) out.push({key:'svc:'+g.id,cat:'Gear service due',text:g.name+': '+(due<now?'overdue since ':'due ')+fmtDate(due)});
  });
  (db.checkouts||[]).filter(isOverdue).forEach(co=>{
    const g=(db.gearItems||[]).find(x=>x.id===co.gearId), t=(db.technicians||[]).find(x=>x.id===co.personId);
    out.push({key:'co:'+co.id,cat:'Overdue gear',text:(g?g.name:'Item')+' with '+(t?t.name:'unknown')+', due '+fmtDate(co.dueDate)});
  });
  (db.outages||[]).filter(o=>!o.resolved&&now-o.timestamp>2*864e5).forEach(o=>out.push({key:'out:'+o.id,cat:'Outages open over 2 days',text:o.fixtureName+' since '+fmtDate(o.timestamp)}));
  return out;
}
function alFresh(items,force){
  const days=(db.settings&&db.settings.alertRepeatDays)||7, sent=(db.settings&&db.settings.alertSent)||{};
  return force?items:items.filter(i=>!sent[i.key]||Date.now()-sent[i.key]>days*864e5);
}
async function sendAlertDigest(force){
  if(!isAdmin()){toast('Admin permission required','error');return 0;}
  const items=alFresh(alCollect(),force);
  if(!items.length){toast('Nothing new to alert about','info');if(_curPage==='dashboard')renderAlertCtl();return 0;}
  const admins=(db.technicians||[]).filter(t=>t.email&&t.email.includes('@')&&(t.userRole==='admin'||t.userRole==='master'));
  if(!admins.length){toast('No admin has an email address set','error');return 0;}
  const groups={}; items.forEach(i=>(groups[i.cat]=groups[i.cat]||[]).push(i.text));
  const body=Object.keys(groups).map(c=>c+' ('+groups[c].length+')\n'+groups[c].map(x=>'- '+x).join('\n')).join('\n\n');
  let ok=0;
  for(const a of admins){
    try{
      await emailjs.send(EJSID,EJTPL,kccEmailParams(a,'KCC Technical: '+items.length+' item'+(items.length>1?'s':'')+' need attention',KCC_EMAIL.digest({name:a.name,groups:Object.keys(groups).map(c=>({cat:c,items:groups[c]})),appUrl:kccAppUrl()}),{fixture_name:'Alert digest',fixture_id:'DIGEST',bulb_type:items.length+' items',reported_by:'KCC Technical System'}));
      ok++;
    }catch(e){console.warn('digest failed',a.name,e);}
  }
  if(ok){
    db.settings.alertSent=db.settings.alertSent||{};
    items.forEach(i=>db.settings.alertSent[i.key]=Date.now());
    db.settings.alertLastRun=Date.now();
    save();
  }
  toast(ok?'Alert digest sent to '+ok+' admin'+(ok>1?'s':''):'Digest failed to send',ok?'success':'error');
  if(_curPage==='dashboard') renderAlertCtl();
  return ok;
}
function alAutoSend(){
  if(window._alAutoDone||!_techId||!isAdmin()||!db.settings||!db.settings.autoAlerts) return;
  window._alAutoDone=true;
  if(Date.now()-(db.settings.alertLastRun||0)<20*36e5) return;
  sendAlertDigest(false);
}
function alSet(k,v){ db.settings[k]=v; save(); renderAlertCtl(); }
function renderAlertCtl(){
  const el=document.getElementById('alertCtl'); if(!el||!isAdmin()) return;
  const all=alCollect(), fresh=alFresh(all,false);
  const last=db.settings.alertLastRun;
  el.innerHTML=`<div class="ph row jbet"><span class="pt">Automatic alerts</span><span class="dim" style="font-size:12px">${all.length} need attention · ${fresh.length} not yet emailed</span></div>
    <div class="pb" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="btn ba" onclick="sendAlertDigest(false)" ${fresh.length?'':'disabled'}>Email digest now</button>
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;text-transform:none;letter-spacing:0"><input type="checkbox" ${db.settings.autoAlerts?'checked':''} onchange="alSet('autoAlerts',this.checked)" style="width:20px;height:20px"> Send automatically once a day</label>
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;text-transform:none;letter-spacing:0">Remind again after
          <select onchange="alSet('alertRepeatDays',parseInt(this.value))" style="width:auto">${[3,7,14].map(d=>`<option value="${d}" ${(db.settings.alertRepeatDays||7)===d?'selected':''}>${d} days</option>`).join('')}</select></label>
      </div>
      <div class="dim" style="font-size:12px">Covers low bulb and gear stock, bulbs near end of life, fixture and gear maintenance, overdue gear, and outages open over 2 days. One email per admin lists everything new. ${last?'Last sent '+ago(last)+'.':'Nothing sent yet.'} Automatic sending runs when an admin opens the app.</div>
    </div>`;
}
