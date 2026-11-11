// ══════════════════════════════════════════════════════════
// PHASE 5 — Reporting, Audit Log, Performance Notes
// ══════════════════════════════════════════════════════════

// ── AUDIT LOG ─────────────────────────────────────────────
function logAudit(action, detail=''){
  if(!db.auditLog) db.auditLog=[];
  const tech=getCurTech();
  db.auditLog.unshift({
    id:'al_'+Date.now(),
    action, detail,
    by: tech?tech.name:'System',
    byId: tech?tech.id:'',
    at: Date.now()
  });
  // Keep last 200 entries
  if(db.auditLog.length>200) db.auditLog=db.auditLog.slice(0,200);
}

function renderAuditLog(){
  const el=document.getElementById('audit-list');if(!el)return;
  if(!isAdmin()){el.innerHTML='<div class="dim" style="padding:12px">Admin access only</div>';return;}
  if(!db.auditLog||!db.auditLog.length){
    el.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">📋</div><div class="dim">No audit events yet</div></div>';
    return;
  }
  const ACTION_ICONS={
    'Crew Added':'👤','Crew Removed':'🗑️','Crew Edited':'✏️',
    'Schedule Saved':'📅','Swap Approved':'↔️','Swap Denied':'↔️',
    'Incident Reported':'⚠️','Incident Resolved':'✅',
    'Announcement Posted':'📢','Feedback Cleared':'🗑️',
    'Gear Added':'📦','Gear Returned':'↩️','Gear Checked Out':'📤',
    'Hours Logged':'⏱️','Admin Login':'🔑','Report Exported':'📄',
  };
  el.innerHTML=db.auditLog.slice(0,100).map(e=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:16px;flex-shrink:0;margin-top:1px">${ACTION_ICONS[e.action]||'🔷'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700">${esc(e.action)}</div>
        ${e.detail?`<div class="dim" style="font-size:12px">${esc(e.detail)}</div>`:''}
        <div class="dim" style="font-size:11px;font-family:var(--mono)">${esc(e.by)} · ${fmtDate(e.at)}</div>
      </div>
    </div>`).join('');
}

// ── EXPORT REPORT ─────────────────────────────────────────
function exportReport(){
  logAudit('Report Exported','Full system report (CSV)');
  save();
  const lines=[];
  const sep=',';
  const q=v=>`"${String(v||'').replace(/"/g,'""')}"`;

  lines.push('KCC TECHNICAL — FULL REPORT');
  lines.push('Generated: '+new Date().toLocaleString('en-CA'));
  lines.push('');

  // Crew summary
  lines.push('== CREW SUMMARY ==');
  lines.push(['Name','Role','Dept','Email','Phone','Vol Hours','Onboarding %','Joined'].map(q).join(sep));
  (db.technicians||[]).forEach(t=>{
    const ONBOARD_STEPS=['intro','app','shadow','station','checklist','training'];
    const onb=t.onboarding||{};
    const pct=Math.round(ONBOARD_STEPS.filter(s=>onb[s]).length/ONBOARD_STEPS.length*100);
    lines.push([t.name,t.role||'',t.dept||'',t.email||'',t.phone||'',t.volunteerHours||0,pct+'%',t.joinedAt?new Date(t.joinedAt).toLocaleDateString('en-CA'):''].map(q).join(sep));
  });
  lines.push('');

  // Incidents
  lines.push('== INCIDENTS ==');
  lines.push(['Gear','Severity','Description','Reported By','Date','Resolved'].map(q).join(sep));
  (db.incidentReports||[]).forEach(r=>{
    lines.push([r.gearName||'',r.severity,r.description,r.reportedBy,new Date(r.date).toLocaleDateString('en-CA'),r.resolved?'Yes':'No'].map(q).join(sep));
  });
  lines.push('');

  // Gear inventory
  lines.push('== GEAR INVENTORY ==');
  lines.push(['Name','Category','Asset ID','Qty','Low Stock At','Hours Used','Expected Life Hrs','Damaged'].map(q).join(sep));
  (db.gearItems||[]).forEach(g=>{
    lines.push([g.name,g.category||'',g.assetId||'',g.qty||1,g.lowStockAt||0,g.hoursUsed||0,g.expectedLifeHours||0,g.damaged?'Yes':'No'].map(q).join(sep));
  });
  lines.push('');

  // Volunteer hours log
  lines.push('== VOLUNTEER HOURS LOG ==');
  lines.push(['Crew Member','Hours','Description','Date','Logged By'].map(q).join(sep));
  (db.technicians||[]).forEach(t=>{
    (t.hoursLog||[]).forEach(h=>{
      lines.push([t.name,h.hours,h.note||'',new Date(h.date).toLocaleDateString('en-CA'),h.loggedBy||''].map(q).join(sep));
    });
  });

  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='kcc-report-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('📄 Report exported!','success');
}

// ── PERFORMANCE NOTES ──────────────────────────────────────
function openPerfNoteModal(techId){
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  document.getElementById('pn-techId').value=techId;
  document.getElementById('pn-techName').textContent=t.name;
  document.getElementById('pn-text').value='';
  document.getElementById('pn-type').value='positive';
  document.getElementById('m-perfNote').style.display='flex';
}
function savePerfNote(){
  if(!isAdmin()){toast('Admin only','error');return;}
  const techId=document.getElementById('pn-techId').value;
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  const text=(document.getElementById('pn-text').value||'').trim();
  if(!text){toast('Enter a note','error');return;}
  const type=document.getElementById('pn-type').value;
  if(!t.perfNotes)t.perfNotes=[];
  const note={id:'pn_'+Date.now(),text,type,by:getCurTech()?.name||'Admin',at:Date.now()};
  t.perfNotes.unshift(note);
  logAudit('Performance Note','Note for '+t.name+': '+text.slice(0,50));
  save();
  document.getElementById('m-perfNote').style.display='none';
  openProfile(techId);
  toast('Note saved for '+t.name,'success');
}
function deletePerfNote(techId, noteId){
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  t.perfNotes=(t.perfNotes||[]).filter(n=>n.id!==noteId);
  save();openProfile(techId);toast('Note deleted','info');
}

// ══════════════════════════════════════════════════════════
// PHASE 4 — Rehearsals & Shift Swaps
// ══════════════════════════════════════════════════════════

// ── REHEARSALS ────────────────────────────────────────────
function openAddRehearsalModal(id){
  const r = id ? (db.rehearsals||[]).find(x=>x.id===id) : null;
  document.getElementById('rh-id').value = r ? r.id : '';
  document.getElementById('rh-title').value = r ? r.title||'' : '';
  document.getElementById('rh-date').value = r && r.date ? new Date(r.date).toISOString().slice(0,10) : '';
  document.getElementById('rh-time').value = r ? r.time||'' : '';
  document.getElementById('rh-location').value = r ? r.location||'' : '';
  document.getElementById('rh-notes').value = r ? r.notes||'' : '';
  document.getElementById('rh-rundown').value = r ? r.rundown||'' : '';
  const crewWrap = document.getElementById('rh-crew');
  const assigned = r ? (r.crew||[]) : [];
  crewWrap.innerHTML = (db.technicians||[]).filter(t=>isTechActive(t)||assigned.includes(t.id)).map(t=>`
    <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--s2);border-radius:6px;cursor:pointer;font-size:13px">
      <input type="checkbox" value="${esc(t.id)}" ${assigned.includes(t.id)?'checked':''} style="accent-color:#0F6E56">
      <span>${esc(t.avatar||'👤')} ${esc(t.name)}${!isTechActive(t)?' 🚫':''}</span>
      ${t.dept?deptBadge(t.dept):''}
    </label>`).join('');
  document.getElementById('rh-modal-title').textContent = r ? '✏️ Edit Rehearsal' : '🎸 Add Rehearsal';
  document.getElementById('m-addRehearsal').style.display='flex';
}
function openEditRehearsalModal(id){ openAddRehearsalModal(id); }
function saveRehearsal(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const title = (document.getElementById('rh-title').value||'').trim();
  const dateVal = document.getElementById('rh-date').value;
  if(!title){toast('Title required','error');return;}
  if(!dateVal){toast('Date required','error');return;}
  const crew = [...document.querySelectorAll('#rh-crew input[type=checkbox]:checked')].map(c=>c.value);
  const id = document.getElementById('rh-id').value;
  const entry = {
    id: id || 'rh_'+Date.now(),
    title,date:new Date(dateVal+'T12:00:00').getTime(),
    time:document.getElementById('rh-time').value.trim(),
    location:document.getElementById('rh-location').value.trim(),
    notes:document.getElementById('rh-notes').value.trim(),
    rundown:document.getElementById('rh-rundown').value.trim(),
    crew,createdAt:Date.now()
  };
  if(!db.rehearsals)db.rehearsals=[];
  if(id){ const idx=db.rehearsals.findIndex(x=>x.id===id); if(idx>-1)db.rehearsals[idx]=entry; else db.rehearsals.push(entry); }
  else db.rehearsals.push(entry);
  save();document.getElementById('m-addRehearsal').style.display='none';renderSchedule();
  toast((id?'Rehearsal updated':'Rehearsal added'),'success');
}
// ── SPECIAL EVENTS ────────────────────────────────────────
function openAddSpecialEventModal(id){
  if(!isAdmin()){toast('Admin required','error');return;}
  const r = id ? (db.specialEvents||[]).find(x=>x.id===id) : null;
  document.getElementById('se-id').value = r ? r.id : '';
  document.getElementById('se-title').value = r ? r.title||'' : '';
  document.getElementById('se-type').value = r ? r.type||'' : '';
  document.getElementById('se-date').value = r && r.date ? schedKey(new Date(r.date)) : '';
  document.getElementById('se-time').value = r ? r.time||'' : '';
  document.getElementById('se-endtime').value = r ? r.endTime||'' : '';
  document.getElementById('se-location').value = r ? r.location||'' : '';
  document.getElementById('se-notes').value = r ? r.notes||'' : '';
  document.getElementById('se-rundown').value = r ? r.rundown||'' : '';
  const assigned = r ? (r.crew||[]) : [];
  const roles = r ? (r.roles||{}) : {};
  const stations = getScheduleRoles();
  document.getElementById('se-crew').innerHTML = (db.technicians||[]).filter(t=>isTechActive(t)||assigned.includes(t.id)).map(t=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--s2);border-radius:6px;font-size:13px">
      <label style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;text-transform:none;letter-spacing:0;font-family:var(--head);font-size:13px;color:var(--text)">
        <input type="checkbox" value="${esc(t.id)}" ${assigned.includes(t.id)?'checked':''} style="accent-color:#0F6E56;width:auto">
        <span>${esc(t.avatar||'👤')} ${esc(t.name)}</span>
      </label>
      <select data-role-for="${esc(t.id)}" style="width:auto;max-width:150px;font-size:11px;padding:4px 6px">
        <option value="">Role…</option>
        ${stations.map(st=>`<option value="${esc(st.name)}" ${roles[t.id]===st.name?'selected':''}>${st.icon} ${esc(st.name)}</option>`).join('')}
      </select>
    </div>`).join('');
  document.getElementById('se-modal-title').textContent = r ? '✏️ Edit Special Event' : '⭐ Add Special Event';
  document.getElementById('se-delete-btn').style.display = r ? '' : 'none';
  document.getElementById('m-addSpecialEvent').style.display='flex';
}
function saveSpecialEvent(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const title=(document.getElementById('se-title').value||'').trim();
  const dateVal=document.getElementById('se-date').value;
  if(!title){toast('Title required','error');return;}
  if(!dateVal){toast('Date required','error');return;}
  const crew=[...document.querySelectorAll('#se-crew input[type=checkbox]:checked')].map(c=>c.value);
  const roles={};
  crew.forEach(cid=>{const sel=document.querySelector('#se-crew select[data-role-for="'+cid+'"]');if(sel&&sel.value)roles[cid]=sel.value;});
  const id=document.getElementById('se-id').value;
  const entry={
    id:id||'se_'+Date.now(),
    title,type:document.getElementById('se-type').value,
    date:new Date(dateVal+'T12:00:00').getTime(),
    time:document.getElementById('se-time').value.trim(),
    endTime:document.getElementById('se-endtime').value.trim(),
    location:document.getElementById('se-location').value.trim(),
    notes:document.getElementById('se-notes').value.trim(),
    rundown:document.getElementById('se-rundown').value.trim(),
    crew,roles,createdAt:Date.now()
  };
  if(!db.specialEvents)db.specialEvents=[];
  const idx=id?db.specialEvents.findIndex(x=>x.id===id):-1;
  if(idx>-1)db.specialEvents[idx]=entry;else db.specialEvents.push(entry);
  logAudit('Special Event Saved',title);
  save();document.getElementById('m-addSpecialEvent').style.display='none';renderSchedule();
  toast(id?'Event updated':'Event added','success');
}
function deleteSpecialEvent(id){
  if(!isAdmin())return;if(!confirm('Delete this special event?'))return;
  db.specialEvents=(db.specialEvents||[]).filter(x=>x.id!==id);
  save();document.getElementById('m-addSpecialEvent').style.display='none';renderSchedule();toast('Event deleted','info');
}

function deleteRehearsal(id){
  if(!isAdmin())return;if(!confirm('Delete this rehearsal?'))return;
  db.rehearsals=(db.rehearsals||[]).filter(x=>x.id!==id);
  save();renderSchedule();toast('Rehearsal deleted','info');
}

// ── SHIFT SWAP REQUESTS ───────────────────────────────────
function openSwapRequestModal(schedKey){
  const curTech=getCurTech();
  if(!curTech){toast('Log in to request a swap','info');return;}
  const parts=(schedKey||'').split('_');
  const dateKey=parts[0]||schedKey||'';
  const serviceSlot='service';
  const entry=db.schedules[schedKey]||{crew:[]};
  const onSched=(entry.crew||[]).filter(id=>id!==curTech.id).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean);
  document.getElementById('sw-schedKey').value=schedKey;
  document.getElementById('sw-dateKey').value=dateKey;
  document.getElementById('sw-serviceSlot').value=serviceSlot;
  document.getElementById('sw-requester').textContent=curTech.name;
  document.getElementById('sw-date').textContent=dateKey?new Date(dateKey+'T12:00:00').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'';
  document.getElementById('sw-service').textContent='Sunday Service';
  const targetSel=document.getElementById('sw-target');
  const opts = onSched.length ? onSched : (db.technicians||[]).filter(t=>t.id!==curTech.id);
  targetSel.innerHTML=opts.map(t=>`<option value="${esc(t.id)}">${esc(t.avatar||'👤')} ${esc(t.name)}</option>`).join('');
  document.getElementById('sw-reason').value='';
  document.getElementById('m-swapRequest').style.display='flex';
}
function submitSwapRequest(){
  const curTech=getCurTech();if(!curTech)return;
  const schedKey=document.getElementById('sw-schedKey').value;
  const dateKey=document.getElementById('sw-dateKey').value;
  const serviceSlot=document.getElementById('sw-serviceSlot').value;
  const targetId=document.getElementById('sw-target').value;
  const reason=(document.getElementById('sw-reason').value||'').trim();
  if(!targetId){toast('Select a crew member','error');return;}
  const target=db.technicians.find(t=>t.id===targetId);
  if(!db.swapRequests)db.swapRequests=[];
  const swap={id:'sw_'+Date.now(),schedKey,dateKey,serviceSlot,requesterId:curTech.id,requesterName:curTech.name,targetId,targetName:target?target.name:'Unknown',reason,status:'pending',createdAt:Date.now()};
  db.swapRequests.unshift(swap);
  save();document.getElementById('m-swapRequest').style.display='none';
  renderSchedule();toast('↔️ Swap request sent to '+(target?target.name:'crew member'),'success');
  _notifySwapAdmins(swap);
}
async function _notifySwapAdmins(swap){
  const admins=(db.technicians||[]).filter(t=>t.email&&(t.userRole==='master'||t.userRole==='admin'));
  const dateStr=new Date(swap.dateKey+'T12:00:00').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'});
  for(const admin of admins){
    try{await emailjs.send(EJSID,EJTPL,{to_email:admin.email,to_name:admin.name,subject:'↔️ Shift swap: '+swap.requesterName,message:`Shift Swap Request\n\nFrom: ${swap.requesterName}\nWith: ${swap.targetName}\nDate: ${dateStr} (${swap.serviceSlot==='9am'?'9:00 AM':'11:00 AM'})\nReason: ${swap.reason||'No reason given'}\n\nApprove or deny in the app.\n\n— KCC Technical`,fixture_name:'↔️ '+swap.requesterName+' ↔ '+swap.targetName,fixture_id:swap.schedKey,bulb_type:dateStr,reported_by:swap.requesterName});}
    catch(e){console.warn('Swap notify failed',e);}
  }
}
function renderSwapRequests(){
  const el=document.getElementById('swap-list');if(!el)return;
  const swaps=(db.swapRequests||[]).filter(s=>s.status==='pending').sort((a,b)=>b.createdAt-a.createdAt);
  if(!swaps.length){el.innerHTML='<div class="dim" style="padding:12px 0">No pending swap requests</div>';return;}
  el.innerHTML=swaps.map(s=>`
    <div style="background:var(--s2);border:1px solid var(--border2);border-radius:8px;padding:12px;margin-bottom:8px">
      <div class="row jbet mb6"><div class="fw7" style="font-size:13px">${esc(s.requesterName)} ↔️ ${esc(s.targetName)}</div><span style="font-size:10px;font-family:var(--mono);color:var(--amber)">PENDING</span></div>
      <div class="dim" style="font-size:12px">${s.dateKey?new Date(s.dateKey+'T12:00:00').toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'}):''} · Sunday Service</div>
      ${s.reason?`<div class="dim" style="font-size:12px;margin-top:4px">Reason: ${esc(s.reason)}</div>`:''}
      <div class="row gap6" style="margin-top:10px">
        <button class="btn ba bsm" onclick="resolveSwap('${esc(s.id)}','approved')">✓ Approve</button>
        <button class="btn br bsm" onclick="resolveSwap('${esc(s.id)}','denied')">✗ Deny</button>
      </div>
    </div>`).join('');
}
function resolveSwap(id,status){
  if(!isAdmin()){toast('Admin required','error');return;}
  const s=(db.swapRequests||[]).find(x=>x.id===id);if(!s)return;
  s.status=status;s.resolvedAt=Date.now();s.resolvedBy=getCurTech()?.name||'Admin';
  logAudit(status==='approved'?'Swap Approved':'Swap Denied', s.requesterName+' ↔ '+s.targetName);
  if(status==='approved'){
    const entry=db.schedules[s.schedKey];
    if(entry&&entry.crew){
      const riIdx=entry.crew.indexOf(s.requesterId);
      const taIdx=entry.crew.indexOf(s.targetId);
      if(riIdx>-1)entry.crew[riIdx]=s.targetId;
      if(taIdx>-1)entry.crew[taIdx]=s.requesterId;
    }
    toast('Swap approved — schedule updated!','success');
  } else { toast('Swap denied','info'); }
  save();renderSwapRequests();renderSchedule();
}

function tplRefreshSelect(){
  const tplSel=document.getElementById('schedTemplateSelect');
  if(tplSel){
    const tpls=db.settings.scheduleTemplates||[];
    tplSel.innerHTML='<option value="">— Load a template —</option>'+tpls.map((t,i)=>`<option value="${i}">${String(t.name).replace(/[<>&]/g,'')}</option>`).join('');
  }
}
// Snapshot a Sunday (from the open editor if it is that day, else from saved data) as a reusable show template
function tplSave(key,fromEditor){
  if(!canEditSchedule()){toast('No permission','error');return;}
  const name = prompt('Template name (e.g. "Normal Sunday", "Easter", "Youth night"):','');
  if(!name||!name.trim()) return;
  const entry = db.schedules[key]||{crew:[],roles:{},notes:'',briefing:''};
  const g=id=>fromEditor&&document.getElementById(id)?document.getElementById(id).value.trim():null;
  if(!db.settings.scheduleTemplates) db.settings.scheduleTemplates=[];
  db.settings.scheduleTemplates.push({
    name:name.trim(),
    crew:[...(entry.crew||[])],
    roles:{...(entry.roles||{})},
    notes:g('schedNotes')??entry.notes??'',
    briefing:g('schedBriefing')??entry.briefing??'',
    rundown:g('schedRundown')??entry.rundown??'',
    looks:g('schedLooks')??entry.looks??'',
    cams:g('schedCams')??entry.cams??'',
    patch:g('schedPatch')??entry.patch??'',
    savedAt:Date.now()
  });
  save(); tplRefreshSelect();
  toast('Template "'+name.trim()+'" saved','success');
}
function saveScheduleTemplate(){ tplSave(_schedEditKey,true); }
function deleteScheduleTemplate(){
  const sel=document.getElementById('schedTemplateSelect');
  if(!sel||sel.value===''){toast('Select a template first','info');return;}
  const tpls=db.settings.scheduleTemplates||[], t=tpls[parseInt(sel.value)];
  if(!t||!confirm('Delete template "'+t.name+'"?')) return;
  tpls.splice(parseInt(sel.value),1); save(); tplRefreshSelect(); toast('Template deleted','info');
}
function loadScheduleTemplate(){
  const sel=document.getElementById('schedTemplateSelect');
  if(!sel||sel.value===''){toast('Select a template first','info');return;}
  const tpls=db.settings.scheduleTemplates||[];
  const tpl=tpls[parseInt(sel.value)];
  if(!tpl){toast('Template not found','error');return;}
  const entry=db.schedules[_schedEditKey]||{crew:[],roles:{},notes:'',briefing:''};
  // Crew is optional: an Easter template often wants different people
  if((tpl.crew||[]).length && confirm('Also load the crew and station assignments from "'+tpl.name+'"?\nOK = yes, Cancel = keep the current crew.')){
    entry.crew=(tpl.crew||[]).filter(id=>db.technicians.find(t=>t.id===id));
    entry.roles={...(tpl.roles||{})};
    Object.keys(entry.roles).forEach(id=>{if(!entry.crew.includes(id))delete entry.roles[id];});
  }
  ['notes','briefing','rundown','looks','cams','patch'].forEach(k=>{ if(tpl[k]) entry[k]=tpl[k]; });
  db.schedules[_schedEditKey]=entry;
  openScheduleEdit(_schedEditKey,null);
  toast('Template "'+tpl.name+'" loaded','success');
}

async function sendScheduleEmails(dateKey, entry){
  // Format the date nicely
  const date = new Date(dateKey+'T12:00:00');
  const dateStr = date.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const savedBy = getCurTech()?.name || 'Scheduler';
  let sent = 0, skipped = 0;

  for(const techId of (entry.crew||[])){
    const t = db.technicians.find(x=>x.id===techId);
    if(!t) continue;
    if(!t.email || !t.email.includes('@')){ skipped++; continue; }

    const roleForDay = entry.roles?.[techId] || t.role || 'Crew';
    const allCrew = (entry.crew||[])
      .map(id=>db.technicians.find(x=>x.id===id))
      .filter(Boolean)
      .map(x=>x.name)
      .join(', ');

    try{
      await emailjs.send(EJSID, EJTPL_SCHED, {
        to_email:     t.email,
        to_name:      t.name,
        date:         dateStr,
        role:         roleForDay,
        crew:         allCrew,
        notes:        entry.notes ? 'Notes: ' + entry.notes : '',
        scheduled_by: savedBy
      });
      sent++;
    } catch(e){
      console.warn('Schedule email failed for '+t.name, e);
    }
  }

  if(sent > 0)   toast('📧 Schedule emails sent to '+sent+' crew member'+(sent>1?'s':''),'success');
  if(skipped > 0) toast(skipped+' crew member'+(skipped>1?'s have':' has')+' no email address set','info');
}
