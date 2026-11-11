// ── History ──
function renderHist(){
  const sorted=[...db.outages].sort((a,b)=>b.timestamp-a.timestamp);
  document.getElementById('histTbl').innerHTML=!sorted.length
    ?'<tr><td colspan="7" style="text-align:center;color:var(--dim);padding:28px">No outages yet</td></tr>'
    :sorted.map(o=>`<tr>
        <td class="dim mono" style="font-size:10px">${fmtD(o.timestamp)}</td>
        <td><div class="fw7">${esc(o.fixtureName)}</div><div class="dim mono">${esc(o.fixtureId)}</div></td>
        <td class="dim">${esc(o.bulbType)}</td><td>${esc(o.reportedBy||'—')}</td><td>${esc(o.resolvedBy||'—')}</td>
        <td>${o.resolved?'<span class="badge bok">✅ Resolved</span>':'<span class="badge bout">Pending</span>'}</td>
        <td class="dim">${o.resolved?fmtDur(o.resolvedAt-o.timestamp):'<span class="cr">Ongoing</span>'}</td>
      </tr>`).join('');
}

// ── Crew ──
function renderCrew(){
  renderAvailability();
  // Always reset dept filter to 'all' when navigating directly to crew page
  if(typeof window._crewDeptFilter === 'undefined') window._crewDeptFilter = 'all';
  // Dept filter UI — always rebuild so active state stays in sync
  const filterWrap=document.getElementById('crew-dept-filter-wrap');
  if(filterWrap){
    filterWrap.innerHTML=deptFilterRow('crew',(dept)=>{window._crewDeptFilter=dept;renderCrew();});
  }
  const filtered=window._crewDeptFilter==='all'?db.technicians:db.technicians.filter(t=>t.dept===window._crewDeptFilter);
  document.getElementById('crewCards').innerHTML=!filtered.length
    ?'<p class="dim">No technicians yet.</p>'
    :filtered.map(t=>{const inactive=!isTechActive(t);return`<div class="tcard" style="${inactive?'opacity:.6':''}">
        <div class="row gap12" style="align-items:flex-start;flex:1">
          <div style="font-size:28px;flex-shrink:0">${esc(t.avatar||'👤')}</div>
          <div style="flex:1;min-width:0">
            <div class="row gap6 mb8"><div class="fw7" style="font-size:14px">${esc(t.name)}</div>${deptBadge(t.dept)}${inactive?'<span class="badge" style="background:#F1EFE8;color:#6b7280;border:1px solid #D3D1C7">🚫 Inactive</span>':''}</div>
            <div class="dim">${esc(t.role||'Technician')}</div>
            ${t.notes?`<div class="dim" style="font-size:11px;font-style:italic;margin-top:2px">📝 ${esc(t.notes)}</div>`:''}
            ${t.training&&t.training.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${t.training.map(tr=>`<span style="background:var(--bglow);color:var(--blue);border:1px solid rgba(61,155,233,.3);border-radius:20px;padding:2px 8px;font-size:10px;font-family:var(--mono)">${tr}</span>`).join('')}</div>`:''}
            <div class="dim" style="color:${t.email?'var(--blue)':'var(--red)'}">${esc(t.email||'No email set')}</div>
            ${t.phone?`<div class="dim">📱 ${esc(t.phone)}</div>`:''}
            ${t.emergency?`<div class="dim" style="color:var(--amber)">🆘 ${esc(t.emergency)}</div>`:''}
            <div class="dim" style="color:${t.pwSet?'var(--green)':'var(--red)'}">${t.pwSet?'🔒 Password set':'⚠️ No password — they cannot sign in yet'}</div>
            <div class="dim" style="color:${t.userRole==='master'?'var(--amber)':t.userRole==='admin'?'var(--blue)':'var(--dim2)'}">
              ${t.userRole==='master'?'👑 Master Admin':t.userRole==='admin'?'🔑 User Admin':'👤 Regular User'}
            </div>
            ${t.canSchedule?'<div class="dim" style="color:var(--amber)">📅 Can edit schedule</div>':''}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap" id="avail-${esc(t.id)}"></div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:10px;margin-top:auto">
          <button class="btn bb bsm" onclick="go('profiles');setTimeout(()=>openProfile('${esc(t.id)}'),80)">👤 Profile</button>
          <button class="btn bgh bsm" data-perm="admin" onclick="editTech('${esc(t.id)}')">✏️</button>
          <button class="btn bgh bsm" data-perm="admin" onclick="adminResetPassword('${esc(t.id)}')" title="Admin: reset password">🔑</button>
          <button class="btn bgh bsm" data-perm="admin" onclick="resendWelcomeEmail('${esc(t.id)}')" title="Resend welcome email">📧</button>
          <button class="btn ${inactive?'ba':'bgh'} bsm" data-perm="admin" onclick="toggleTechActive('${esc(t.id)}')" title="${inactive?'Reactivate — allow login & scheduling':'Deactivate — block login & scheduling'}">${inactive?'✅ Reactivate':'🚫 Deactivate'}</button>
          <button class="btn bgh bsm" data-perm="admin" onclick="requirePin(()=>removeTech('${esc(t.id)}'))">✕</button>
        </div>
      </div>`;}).join('');
  document.getElementById('crewStats').innerHTML=!db.technicians.length?''
    :db.technicians.map(t=>{
        const rep=db.outages.filter(o=>o.techId===t.id).length;
        const rpl=db.usageLog.filter(u=>u.techId===t.id).length;
        const resolved=db.outages.filter(o=>o.resolvedTechId===t.id&&o.resolved);
        const avgResp=resolved.length?fmtDur(resolved.reduce((s,o)=>s+(o.resolvedAt-o.timestamp),0)/resolved.length):'—';
        const times=[...db.outages.filter(o=>o.techId===t.id).map(o=>o.timestamp),...db.usageLog.filter(u=>u.techId===t.id).map(u=>u.date)].sort((a,b)=>b-a);
        return`<tr>
          <td><div class="row gap8"><span style="font-size:20px">${esc(t.avatar||'👤')}</span><div><div class="fw7">${esc(t.name)}</div><div class="dim">${esc(t.role||'')}</div></div></div></td>
          <td>${rep}</td><td>${rpl}</td><td class="dim">${avgResp}</td><td class="dim">${times.length?ago(times[0]):'Never'}</td>
        </tr>`;
      }).join('');
  // Re-apply permissions so dynamically rendered data-perm buttons are shown/hidden
  applyPermissions();
}
