// Restricted stations: a station (e.g. Sound) can be limited to an approved list of people.
// Admins pick the approved people in Settings -> Schedule roles. The schedule editors only
// offer approved people for that station. (Client-side rule: admins can change the list.)
(function(){
  function roleOf(name){return getScheduleRoles().find(r=>r.name===name);}
  function can(name,techId){const r=roleOf(name);return !r||!r.restricted||(r.allowed||[]).includes(techId);}
  window.stationAllows=can;
  function editable(){ // make sure the roles list lives in settings so it can be edited
    if(!db.settings.scheduleRoles) db.settings.scheduleRoles=JSON.parse(JSON.stringify(DEFAULT_ROLES));
    return db.settings.scheduleRoles;
  }
  window.rsToggle=function(i){
    if(!isAdmin()){toast('Admin only','error');return;}
    const r=editable()[i]; r.restricted=!r.restricted; if(!r.allowed)r.allowed=[];
    save();renderRolesList();
  };
  window.rsAllow=function(i,sel){
    if(!isAdmin()||!sel.value)return;
    const r=editable()[i]; r.allowed=r.allowed||[];
    if(!r.allowed.includes(sel.value))r.allowed.push(sel.value);
    save();renderRolesList();
  };
  window.rsRemove=function(i,id){
    if(!isAdmin())return;
    const r=editable()[i]; r.allowed=(r.allowed||[]).filter(x=>x!==id);
    save();renderRolesList();
  };
  window.renderRolesList=function(){
    const el=document.getElementById('rolesListEl');if(!el)return;
    const roles=getScheduleRoles();
    el.innerHTML=!roles.length?'<p class="dim">No roles yet.</p>':roles.map((r,i)=>{
      const ppl=(r.allowed||[]).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean);
      const opts=db.technicians.filter(t=>isTechActive(t)&&!(r.allowed||[]).includes(t.id));
      return `<div style="padding:8px 10px;background:var(--s2);border-radius:6px;margin-bottom:6px">
        <div class="row jbet"><div class="row gap8"><span style="font-size:18px">${r.icon}</span><span class="fw7">${esc(r.name)}</span>${r.restricted?'<span class="dim" style="font-size:11px">🔒 restricted</span>':''}</div>
        <div class="row gap8"><button class="btn bgh bsm" onclick="rsToggle(${i})">${r.restricted?'Unlock':'🔒 Restrict'}</button>
        <button class="btn bgh bsm" onclick="removeScheduleRole(${i})" style="color:var(--red)">✕</button></div></div>
        ${r.restricted?`<div style="margin-top:8px;font-size:12px"><div class="dim mb6">Approved people (only these can be put on ${esc(r.name)}):</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${ppl.length?ppl.map(t=>`<span style="background:var(--s1);border:1px solid var(--border2);border-radius:20px;padding:3px 6px 3px 8px">${esc(t.avatar||'👤')} ${esc(t.name)} <button type="button" onclick="rsRemove(${i},'${esc(t.id)}')" style="background:none;border:none;cursor:pointer;color:var(--dim2)">✕</button></span>`).join(''):'<span class="dim">Nobody approved yet</span>'}</div>
          <select onchange="rsAllow(${i},this)" style="font-size:11px;padding:5px 8px;width:100%"><option value="">+ Approve someone…</option>${opts.map(t=>`<option value="${esc(t.id)}">${esc(t.avatar||'👤')} ${esc(t.name)}</option>`).join('')}</select></div>`:''}
      </div>`;}).join('');
  };
  // Schedule editor: hide non-approved people from a restricted station's dropdown
  const origAssign=window.schedAssignToStation;
  window.schedAssignToStation=function(sel,st){
    if(sel.value&&!can(st,sel.value)){toast('Not approved for '+st,'error');sel.value='';return;}
    return origAssign.apply(this,arguments);
  };
  const origRender=window.renderSchedStationAssignments;
  window.renderSchedStationAssignments=function(){
    origRender.apply(this,arguments);
    document.querySelectorAll('#schedCrewGrid select[onchange^="schedAssignToStation"]').forEach(sel=>{
      const m=/schedAssignToStation\(this,'(.*)'\)/.exec(sel.getAttribute('onchange'));
      if(!m)return; const st=m[1].replace(/\\'/g,"'"); const r=roleOf(st);
      if(!r||!r.restricted)return;
      [...sel.options].forEach(o=>{if(o.value&&!can(st,o.value))o.remove();});
      sel.options[0].textContent='🔒 + Add approved person to '+st+'…';
      if(sel.options.length===1)sel.options[0].textContent='🔒 '+st+': nobody approved yet (Settings → Schedule roles)';
    });
  };
  // Special events
  const origSave=window.saveSpecialEvent;
  if(origSave) window.saveSpecialEvent=function(){
    const bad=[...document.querySelectorAll('#se-crew select[data-role-for]')].find(s=>{
      const id=s.getAttribute('data-role-for'),box=document.querySelector('#se-crew input[value="'+id+'"]');
      return s.value&&box&&box.checked&&!can(s.value,id);});
    if(bad){toast('That person is not approved for '+bad.value,'error');return;}
    return origSave.apply(this,arguments);
  };
})();
