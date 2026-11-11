// ── Maintenance ──
function getMaintDue(){
  const interval=(db.settings.maintInterval||90)*86400000;
  const now=Date.now();
  return db.fixtures.filter(f=>{
    const lastMaint=f.lastMaint||f.addedAt||0;
    const due=lastMaint+interval;
    return due<=now;
  }).map(f=>{
    const interval2=(db.settings.maintInterval||90)*86400000;
    const due=(f.lastMaint||f.addedAt||0)+interval2;
    return{...f,dueStr:due<now?'overdue':ago(due)};
  });
}

// ── Fixtures ──
window._fixTab='list';
function setFixTab(tab, btn){
  window._fixTab=tab;
  document.querySelectorAll('#fixtab-list,#fixtab-map').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.getElementById('fix-list-view').style.display=tab==='list'?'':'none';
  document.getElementById('fix-map-view').style.display=tab==='map'?'':'none';
  if(tab==='list')renderFix();
  if(tab==='map')renderFixMap();
}

function renderFix(){
  const filter=document.getElementById('fixFilter')?.value||'all';
  const maintDueIds=new Set(getMaintDue().map(f=>f.id));
  let fixtures=[...db.fixtures];
  if(filter==='out') fixtures=fixtures.filter(f=>f.status==='out');
  if(filter==='ok')  fixtures=fixtures.filter(f=>f.status==='ok');
  if(filter==='maint') fixtures=fixtures.filter(f=>maintDueIds.has(f.id));
  const lastOut={};
  [...db.outages].sort((a,b)=>b.timestamp-a.timestamp).forEach(o=>{if(!lastOut[o.fixtureId])lastOut[o.fixtureId]=o.timestamp;});

  // Stat strip
  const total=db.fixtures.length;
  const out=db.fixtures.filter(f=>f.status==='out').length;
  const maint=getMaintDue().length;
  const strip=document.getElementById('fix-stats-strip');
  if(strip) strip.innerHTML=`
    <div class="sc ca"><div class="sc-label">Total Fixtures</div><div class="sc-val">${total}</div></div>
    <div class="sc ${out?'cr':'cg'}"><div class="sc-label">Currently Out</div><div class="sc-val">${out}</div></div>
    <div class="sc cg"><div class="sc-label">Operational</div><div class="sc-val">${total-out}</div></div>
    <div class="sc cp"><div class="sc-label">Maint Due</div><div class="sc-val">${maint}</div></div>`;

  // Card grid
  const grid=document.getElementById('fixtCards');
  if(!grid) return;
  if(!fixtures.length){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:var(--dim2)"><div style="font-size:40px;margin-bottom:12px">💡</div><div style="font-family:var(--head);font-size:14px;font-weight:700">No fixtures yet</div><div class="dim" style="margin-top:6px">Click "+ Add Fixture" to get started</div></div>';
    return;
  }
  grid.innerHTML=fixtures.map(f=>{
    const isOut=f.status==='out';
    const isMaint=maintDueIds.has(f.id);
    const outageCount=db.outages.filter(o=>o.fixtureId===f.id).length;
    const reg=db.bulbRegistry.find(b=>b.installedIn===f.id&&b.status==='installed');
    const bulbLabel=reg?`<span class="mono" style="color:var(--amber);font-size:11px;font-weight:700">${esc(reg.bulbId)}</span><span class="dim" style="margin-left:6px">since ${ago(reg.installedAt)}</span>`
      :'<span class="dim">No bulb scanned</span>';
    const cardClass='fix-card'+(isOut?' status-out':' status-ok')+(isMaint?' status-maint':'');
    const catColors={wash:'#0F6E56',spot:'#534AB7',par:'#854F0B',fresnel:'#185FA5',led:'#3B6D11',follow:'#A32D2D',other:'#888'};
    const catColor=catColors[f.category||'other']||'#888';
    return`<div class="${cardClass}">
      <div class="fix-card-head">
        <div style="flex:1;min-width:0">
          <div class="fix-card-id">${esc(f.id)}</div>
          <div class="fix-card-name">${esc(f.name||'—')}</div>
          <div class="fix-card-loc">📍 ${esc(f.location||'No location')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
          ${isOut
            ?'<span class="badge bout"><span class="bd pulse"></span>OUT</span>'
            :'<span class="badge bok"><span class="bd"></span>OK</span>'}
          ${isMaint?'<span class="maint-badge">MAINT</span>':''}
          <span class="badge" style="background:${catColor}18;color:${catColor};border-color:${catColor}44">${esc(f.category||'other')}</span>
        </div>
      </div>
      <div class="fix-card-body">
        <div class="fix-card-row">
          <span class="fix-card-label">Bulb Type</span>
          <span class="fix-card-val">${esc(f.bulbType||'—')}</span>
        </div>
        <div class="fix-card-row">
          <span class="fix-card-label">Current Bulb</span>
          <span>${bulbLabel}</span>
        </div>
        <div class="fix-card-row">
          <span class="fix-card-label">Last Outage</span>
          <span class="fix-card-val">${lastOut[f.id]?ago(lastOut[f.id]):'Never'}</span>
        </div>
        <div class="fix-card-row">
          <span class="fix-card-label">Total Outages</span>
          <span class="fix-card-val" style="color:${outageCount>3?'var(--red)':outageCount>0?'var(--amber)':'var(--green)'}">${outageCount}</span>
        </div>
        <div class="fix-card-row">
          <span class="fix-card-label">Last Maint</span>
          <span class="fix-card-val" style="color:${f.lastMaint?'var(--green)':'var(--red)'}">${f.lastMaint?ago(f.lastMaint):'Never'}</span>
        </div>
      </div>
      <div class="fix-card-foot">
        <button class="btn br bsm" onclick="openOutModal('${esc(f.id)}')">🔴 Out</button>
        ${isOut?`<button class="btn bg bsm" onclick="openRepModal('${esc(f.id)}')">✅ Fix</button>`:''}
        <button class="btn bgh bsm" onclick="viewFixture('${esc(f.id)}')">👁 View</button>
        <button class="btn bgh bsm" data-perm="admin" onclick="editFixture('${esc(f.id)}')">✏️</button>
        <button class="btn bgh bsm" onclick="markMaintDone('${esc(f.id)}')">🔧</button>
        <button class="btn bgh bsm" data-perm="master" onclick="requirePin(()=>deleteFixture('${esc(f.id)}'))">🗑️</button>
      </div>
    </div>`;
  }).join('');
  applyPermissions();
}
function viewFixture(id){
  const f=db.fixtures.find(x=>x.id===id);if(!f)return;
  const outs=[...db.outages].filter(o=>o.fixtureId===id).sort((a,b)=>b.timestamp-a.timestamp);
  const avgDown=outs.filter(o=>o.resolved).reduce((s,o,_,a)=>s+(o.resolvedAt-o.timestamp)/a.length,0);
  document.getElementById('vfTitle').textContent='💡 '+esc(f.name)+' ('+esc(f.id)+')';
  document.getElementById('vfBody').innerHTML=`
    <div class="grid2 mb14">
      <div><div class="dim mb8">LOCATION</div><div class="fw7">${esc(f.location||'—')}</div></div>
      <div><div class="dim mb8">BULB TYPE REQUIRED</div><div class="fw7">${esc(f.bulbType)}</div></div>
      <div><div class="dim mb8">CATEGORY</div><span class="badge bblue">${esc(f.category||'other')}</span></div>
      <div><div class="dim mb8">STATUS</div>${f.status==='ok'?'<span class="badge bok"><span class="bd"></span>OK</span>':'<span class="badge bout"><span class="bd pulse"></span>OUT</span>'}</div>
      <div><div class="dim mb8">TOTAL OUTAGES</div><div class="fw7" style="font-size:24px;color:var(--red)">${outs.length}</div></div>
      <div><div class="dim mb8">AVG DOWNTIME</div><div class="fw7">${avgDown?fmtDur(avgDown):'—'}</div></div>
      <div><div class="dim mb8">FIXTURE AGE</div><div class="fw7">${f.addedAt?Math.floor((Date.now()-f.addedAt)/86400000)+' days':'—'}</div></div>
      <div><div class="dim mb8">LAST MAINTENANCE</div><div class="fw7" style="color:${f.lastMaint?'var(--green)':'var(--red)'}">${f.lastMaint?ago(f.lastMaint):'Never'}</div></div>
    </div>
    ${(()=>{
      const reg=db.bulbRegistry.find(b=>b.installedIn===id&&b.status==='installed');
      if(!reg)return'<div style="background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:14px"><div class="dim" style="letter-spacing:1px;margin-bottom:6px">CURRENT BULB</div><div class="dim">No bulb scan on record — install a bulb and scan it to track it here.</div></div>';
      const installs=reg.history.filter(h=>h.event==='installed').length;
      const typeMatch=reg.bulbType.toUpperCase()===f.bulbType.toUpperCase();
      const bg=typeMatch?'var(--gglow)':'var(--aglow)';
      const bdr=typeMatch?'rgba(40,201,122,.3)':'rgba(240,165,0,.3)';
      const typeTag=typeMatch?'<span style="color:var(--green);font-size:11px">✓</span>':'<span style="color:var(--amber);font-size:11px">⚠️ mismatch</span>';
      return '<div style="background:'+bg+';border:1px solid '+bdr+';border-radius:6px;padding:12px;margin-bottom:14px">'
        +'<div class="dim" style="letter-spacing:1px;margin-bottom:8px">CURRENT BULB INSTALLED</div>'
        +'<div class="row gap8" style="flex-wrap:wrap">'
        +'<div><div class="dim" style="font-size:9px;margin-bottom:2px">BULB ID</div><div class="mono fw7" style="color:var(--amber)">'+esc(reg.bulbId)+'</div></div>'
        +'<div><div class="dim" style="font-size:9px;margin-bottom:2px">TYPE</div><div class="fw7">'+esc(reg.bulbType)+' '+typeTag+'</div></div>'
        +'<div><div class="dim" style="font-size:9px;margin-bottom:2px">INSTALLED</div><div class="fw7">'+ago(reg.installedAt)+'</div></div>'
        +'<div><div class="dim" style="font-size:9px;margin-bottom:2px">BY</div><div class="fw7">'+esc(reg.installedBy||'—')+'</div></div>'
        +'<div><div class="dim" style="font-size:9px;margin-bottom:2px">TIMES INSTALLED</div><div class="fw7">'+installs+'</div></div>'
        +'</div></div>';
    })()}
    ${f.notes?`<div class="note-box mb14">📝 ${esc(f.notes)}</div>`:''}
    ${(()=>{
      if(!f.vendorId)return'';
      const v=getVendors().find(x=>x.id===f.vendorId);
      if(!v)return'';
      return '<div style="background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:14px">'
        +'<div class="dim" style="letter-spacing:1px;margin-bottom:6px">🚚 ORDER REPLACEMENT FROM</div>'
        +'<div class="fw7">'+esc(v.name)+'</div>'
        +'<div class="dim" style="font-size:12px;margin-top:2px">'+[v.contact,v.phone,v.email].filter(Boolean).join(' · ')+'</div>'
        +'</div>';
    })()}
    <div class="ph" style="border-radius:6px 6px 0 0;margin-bottom:0"><span class="pt">Outage History</span></div>
    <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;overflow:hidden">
      <table class="tbl">
        <thead><tr><th>Date</th><th>Reported By</th><th>Notes</th><th>Photo</th><th>Status</th><th>Down Time</th></tr></thead>
        <tbody>${!outs.length?'<tr><td colspan="6" style="text-align:center;color:var(--dim);padding:20px">No outages</td></tr>':outs.map(o=>`<tr>
          <td class="dim mono" style="font-size:10px">${fmtD(o.timestamp)}</td>
          <td>${esc(o.reportedBy)}</td><td class="dim">${esc(o.notes||'—')}</td>
          <td>${o.photo?`<img src="${esc(safeImg(o.photo))}" onclick="viewPhotoLightbox(this.src)" style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border)">`:'—'}</td>
          <td>${o.resolved?'<span class="badge bok">Resolved</span>':'<span class="badge bout">Pending</span>'}</td>
          <td class="dim">${o.resolved?fmtDur(o.resolvedAt-o.timestamp):'<span class="cr">Ongoing</span>'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <!-- Maintenance Log -->
    <div class="ph" style="border-radius:6px 6px 0 0;margin-bottom:0;margin-top:14px"><span class="pt">🔧 Maintenance Log</span></div>
    <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;overflow:hidden;margin-bottom:14px">
      <table class="tbl">
        <thead><tr><th>Date</th><th>By</th><th>Notes</th></tr></thead>
        <tbody>${!(f.maintLog&&f.maintLog.length)?'<tr><td colspan="3" style="text-align:center;color:var(--dim);padding:16px">No maintenance logged yet</td></tr>':[...f.maintLog].reverse().map(m=>`<tr>
          <td class="dim mono" style="font-size:10px">${fmtD(m.date)}</td>
          <td>${esc(m.tech||'—')}</td>
          <td class="dim">${esc(m.notes||'—')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="mf" style="border:none;padding:14px 0 0 0">
      <button class="btn br" onclick="closeM('viewFixture');openOutModal('${esc(f.id)}')">🔴 Report Outage</button>
      ${f.status==='out'?`<button class="btn bg" onclick="closeM('viewFixture');openRepModal('${esc(f.id)}')">✅ Mark Replaced</button>`:''}
      <button class="btn ba" onclick="closeM('viewFixture');editFixture('${esc(f.id)}')">✏️ Edit Fixture</button>
      <button class="btn bgh" onclick="markMaintDone('${esc(f.id)}');closeM('viewFixture')">🔧 Mark Maintained</button>
    </div>`;
  openM('viewFixture');
}
function markMaintDone(id){
  const f=db.fixtures.find(x=>x.id===id);if(!f)return;
  const t=getCurTech();
  const notes=prompt('Maintenance notes (optional):','')||'';
  f.lastMaint=Date.now();
  if(!f.maintLog) f.maintLog=[];
  f.maintLog.push({
    date:Date.now(),
    tech:t?t.name:'Unknown',
    techId:t?t.id:null,
    notes
  });
  save();renderFix();
  if(_curPage==='fixtures') renderFix();
  toast('✅ Maintenance logged for '+f.id,'success');
}
function deleteFixture(id){
  if(!isMaster()){toast('Master admin only','error');return;}
  const f=db.fixtures.find(x=>x.id===id);if(!f)return;
  if(!confirm('Delete fixture "'+f.name+'"?\n\nThis also removes its outage history.'))return;
  db.fixtures=db.fixtures.filter(x=>x.id!==id);
  db.outages=db.outages.filter(o=>o.fixtureId!==id);
  save();renderFix();toast('Fixture '+id+' deleted','info');
}
