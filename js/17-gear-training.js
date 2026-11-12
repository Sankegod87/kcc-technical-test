// ══════════════════════════════════════════════════════════
// STAGE 3 — Asset Checkout & Maintenance Log
// ══════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────
const CAT_ICONS = {Camera:'📷',Lens:'🔭',Audio:'🎚️',Lighting:'💡',Cable:'🔌',Accessory:'🎛️',Computer:'💻',Power:'🔋',Other:'📦'};
function gearIcon(item){ return CAT_ICONS[item.category]||'📦'; }
function fmtDate(ts){ if(!ts)return'—'; const d=new Date(ts); return d.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}); }
function fmtDateShort(ts){ if(!ts)return'—'; const d=new Date(ts); return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'}); }
function daysUntil(ts){ return Math.round((ts - Date.now())/(1000*60*60*24)); }
function daysSince(ts){ return Math.round((Date.now()-ts)/(1000*60*60*24)); }
function maintStatus(item){
  const logs = (db.maintLogs||[]).filter(l=>l.gearId===item.id).sort((a,b)=>b.date-a.date);
  const last = logs[0];
  const interval = item.serviceInterval||90;
  if(!last) return {status:'unknown',label:'Never serviced',color:'#888780'};
  const age = daysSince(last.date);
  if(age > interval) return {status:'overdue',label:'Overdue by '+(age-interval)+' days',color:'#E24B4A'};
  if(age > interval*0.8) return {status:'due-soon',label:'Due in '+(interval-age)+' days',color:'#BA7517'};
  return {status:'ok',label:'Serviced '+age+' days ago',color:'#639922'};
}
function activeCheckout(gearId){
  const active=(db.checkouts||[]).filter(c=>c.gearId===gearId&&!c.returnedAt);
  if(active.length<=1) return active[0]||null;
  // Duplicate active checkouts detected — keep the newest, auto-close the rest silently
  active.sort((a,b)=>b.checkedOutAt-a.checkedOutAt);
  const [keep,...dupes]=active;
  dupes.forEach(c=>{c.returnedAt=Date.now();c.returnCondition='unknown';c.returnNotes='[auto-closed: duplicate checkout record]';});
  save();
  return keep;
}
function isOverdue(co){ return co.dueDate && !co.returnedAt && Date.now() > co.dueDate; }
window._coTab = 'active';
window._maintTab = 'due';

// ── Populate selects ──────────────────────────────────────
function _populateGearSelect(selId, onlyAvailable){
  const sel = document.getElementById(selId); if(!sel)return;
  const items = (db.gearItems||[]).filter(g=> onlyAvailable ? !activeCheckout(g.id) : true);
  sel.innerHTML = '<option value="">— Select item —</option>' +
    items.map(g=>`<option value="${esc(g.id)}">${gearIcon(g)} ${esc(g.name)}${g.assetId?' ('+esc(g.assetId)+')':''}</option>`).join('');
}
function _populatePersonSelect(selId){
  const sel = document.getElementById(selId); if(!sel)return;
  sel.innerHTML = '<option value="">— Select crew member —</option>' +
    (db.technicians||[]).map(t=>`<option value="${esc(t.id)}">${esc(t.avatar||'👤')} ${esc(t.name)}${t.dept?' · '+t.dept:''}</option>`).join('');
}

// ── GEAR LIBRARY ─────────────────────────────────────────
function saveGearItem(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const name=(document.getElementById('gi-name').value||'').trim();
  if(!name){toast('Item name required','error');return;}
  const item={
    id:'gear_'+Date.now(),
    name,
    assetId:(document.getElementById('gi-id').value||'').trim(),
    dept:document.getElementById('gi-dept').value||'',
    category:document.getElementById('gi-cat').value||'Other',
    notes:(document.getElementById('gi-notes').value||'').trim(),
    serviceInterval:parseInt(document.getElementById('gi-interval').value)||90,
    lastServiceDate:document.getElementById('gi-lastservice').value?new Date(document.getElementById('gi-lastservice').value+'T12:00:00').getTime():null,
    qty:parseInt(document.getElementById('gi-qty').value)||1,
    lowStockAt:parseInt(document.getElementById('gi-lowstock').value)||0,
    expectedLifeHours:parseInt(document.getElementById('gi-lifehours').value)||0,
    hoursUsed:parseFloat(document.getElementById('gi-hoursused').value)||0,
    vendorId:document.getElementById('gi-vendor').value||'',
    addedAt:Date.now()
  };
  if(!db.gearItems)db.gearItems=[];
  db.gearItems.push(item);
  save();closeM('addGearItem');renderCheckout();
  ['gi-name','gi-id','gi-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('gi-interval').value='90';
  document.getElementById('gi-lastservice').value='';
  toast(name+' added to gear library','success');
}
function openEditGearItem(id){
  const g=(db.gearItems||[]).find(x=>x.id===id);if(!g)return;
  document.getElementById('egi-id').value=g.id;
  document.getElementById('egi-name').value=g.name;
  document.getElementById('egi-assetid').value=g.assetId||'';
  document.getElementById('egi-dept').value=g.dept||'';
  document.getElementById('egi-cat').value=g.category||'Other';
  document.getElementById('egi-notes').value=g.notes||'';
  document.getElementById('egi-interval').value=g.serviceInterval||90;
  document.getElementById('egi-lastservice').value=g.lastServiceDate?new Date(g.lastServiceDate).toISOString().slice(0,10):'';
  document.getElementById('egi-qty').value=g.qty||1;
  document.getElementById('egi-lowstock').value=g.lowStockAt||0;
  document.getElementById('egi-lifehours').value=g.expectedLifeHours||0;
  document.getElementById('egi-hoursused').value=g.hoursUsed||0;
  _populateVendorSelect('egi-vendor',g.vendorId||'');
  openM('editGearItem');
}
function saveGearItemEdit(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const id=document.getElementById('egi-id').value;
  const g=(db.gearItems||[]).find(x=>x.id===id);if(!g)return;
  g.name=(document.getElementById('egi-name').value||'').trim()||g.name;
  g.assetId=(document.getElementById('egi-assetid').value||'').trim();
  g.dept=document.getElementById('egi-dept').value||'';
  g.category=document.getElementById('egi-cat').value||'Other';
  g.notes=(document.getElementById('egi-notes').value||'').trim();
  g.serviceInterval=parseInt(document.getElementById('egi-interval').value)||90;
  g.lastServiceDate=document.getElementById('egi-lastservice').value?new Date(document.getElementById('egi-lastservice').value+'T12:00:00').getTime():null;
  g.qty=parseInt(document.getElementById('egi-qty').value)||g.qty||1;
  g.lowStockAt=parseInt(document.getElementById('egi-lowstock').value)||0;
  g.expectedLifeHours=parseInt(document.getElementById('egi-lifehours').value)||0;
  g.hoursUsed=parseFloat(document.getElementById('egi-hoursused').value)||g.hoursUsed||0;
  g.vendorId=document.getElementById('egi-vendor').value||'';
  save();closeM('editGearItem');renderCheckout();renderMaintenance();
  toast('Gear item updated','success');
}
function deleteGearItem(id){
  if(!isAdmin())return;
  const g=(db.gearItems||[]).find(x=>x.id===id);if(!g)return;
  if(!confirm('Delete '+g.name+'? This will also remove its checkout and maintenance history.'))return;
  db.gearItems=(db.gearItems||[]).filter(x=>x.id!==id);
  db.checkouts=(db.checkouts||[]).filter(x=>x.gearId!==id);
  db.maintLogs=(db.maintLogs||[]).filter(x=>x.gearId!==id);
  save();closeM('editGearItem');renderCheckout();renderMaintenance();
  toast(g.name+' deleted','info');
}

// ── CHECKOUT ─────────────────────────────────────────────
function openM_checkoutGear(){
  _populateGearSelect('co-item',true);
  _populatePersonSelect('co-person');
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+7);
  document.getElementById('co-due').value=tomorrow.toISOString().slice(0,10);
  openM('checkoutGear');
}
function doCheckout(){
  const gearId=document.getElementById('co-item').value;
  const personId=document.getElementById('co-person').value;
  if(!gearId){toast('Select a gear item','error');return;}
  if(!personId){toast('Select a crew member','error');return;}
  if(activeCheckout(gearId)){toast('This item is already checked out','error');return;}
  const dueVal=document.getElementById('co-due').value;
  const co={
    id:'co_'+Date.now(),
    gearId,
    personId,
    checkedOutAt:Date.now(),
    dueDate:dueVal?new Date(dueVal+'T23:59:00').getTime():null,
    purpose:(document.getElementById('co-purpose').value||'').trim(),
    notes:(document.getElementById('co-notes').value||'').trim(),
    returnedAt:null,
    returnCondition:null,
    returnNotes:null
  };
  if(!db.checkouts)db.checkouts=[];
  db.checkouts.unshift(co);
  save();closeM('checkoutGear');renderCheckout();
  const g=(db.gearItems||[]).find(x=>x.id===gearId);
  const p=(db.technicians||[]).find(x=>x.id===personId);
  toast((g?g.name:'Item')+' checked out to '+(p?p.name:'crew'),'success');
  ['co-purpose','co-notes'].forEach(id=>document.getElementById(id).value='');
}
function openReturnModal(coId){
  const co=(db.checkouts||[]).find(x=>x.id===coId);if(!co)return;
  const g=(db.gearItems||[]).find(x=>x.id===co.gearId);
  const p=(db.technicians||[]).find(x=>x.id===co.personId);
  document.getElementById('rg-coId').value=coId;
  document.getElementById('rg-summary').innerHTML=
    '<div style="font-weight:700;margin-bottom:4px">'+(g?gearIcon(g)+' '+g.name:'Item')+'</div>'+
    '<div class="dim">Checked out by <strong>'+esc(p?p.name:'—')+'</strong> on '+fmtDate(co.checkedOutAt)+'</div>'+
    (co.dueDate?'<div class="dim">Due back: '+fmtDate(co.dueDate)+(isOverdue(co)?'&nbsp;<span class="co-badge-over">OVERDUE</span>':'')+'</div>':'');
  document.getElementById('rg-notes').value='';
  document.getElementById('rg-condition').value='Good';
  openM('returnGear');
}
function doReturn(){
  const coId=document.getElementById('rg-coId').value;
  const co=(db.checkouts||[]).find(x=>x.id===coId);if(!co)return;
  co.returnedAt=Date.now();
  co.returnCondition=document.getElementById('rg-condition').value;
  co.returnNotes=(document.getElementById('rg-notes').value||'').trim();
  save();closeM('returnGear');renderCheckout();
  const g=(db.gearItems||[]).find(x=>x.id===co.gearId);
  toast((g?g.name:'Item')+' returned','success');
}
function coSetTab(tab, btn){
  window._coTab=tab;
  document.querySelectorAll('#co-tabs .tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderCheckout();
}

// ── RENDER CHECKOUT ───────────────────────────────────────
function renderCheckout(){
  if(!db.gearItems)db.gearItems=[];
  if(!db.checkouts)db.checkouts=[];
  // Stats
  const checkedOut=(db.checkouts||[]).filter(c=>!c.returnedAt).length;
  const overdue=(db.checkouts||[]).filter(c=>isOverdue(c)).length;
  const totalGear=(db.gearItems||[]).length;
  const available=totalGear-checkedOut;
  document.getElementById('co-stats').innerHTML=
    '<div class="sc ca"><div class="sc-label">Total Gear</div><div class="sc-val">'+totalGear+'</div></div>'+
    '<div class="sc cb"><div class="sc-label">Available</div><div class="sc-val">'+available+'</div></div>'+
    '<div class="sc '+(checkedOut?'cp':'cg')+'"><div class="sc-label">Checked Out</div><div class="sc-val">'+checkedOut+'</div></div>'+
    '<div class="sc '+(overdue?'cr':'cg')+'"><div class="sc-label">Overdue</div><div class="sc-val">'+overdue+'</div></div>';

  const tab=window._coTab||'active';
  const listEl=document.getElementById('co-list');

  if(tab==='gear'){
    // Gear library view
    if(!db.gearItems.length){listEl.innerHTML='<p class="dim" style="padding:16px">No gear items yet. Add your first item with the button above.</p>';return;}
    listEl.innerHTML=db.gearItems.map(g=>{
      const co=activeCheckout(g.id);
      const p=co?(db.technicians||[]).find(x=>x.id===co.personId):null;
      const ms=maintStatus(g);
      const dept=g.dept?deptBadge(g.dept):'';
      return'<div class="co-card">'+
        '<div class="co-icon">'+gearIcon(g)+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div class="row gap6 mb8"><div class="fw7 gd-link" onclick="openGearDetail(\''+esc(g.id||'')+'\')" style="font-size:14px">'+esc(g.name)+'</div>'+dept+(g.assetId?'<span class="badge blow" style="font-size:9px">'+esc(g.assetId)+'</span>':'')+
            (g.qty>1?'<span class="badge" style="background:var(--bglow);color:var(--blue);font-size:9px">QTY: '+esc(g.qty)+'</span>':'')+
            (g.damaged?'<span class="badge" style="background:#fef2f2;color:var(--red);font-size:9px">⚠️ DAMAGED</span>':'')+
            (g.lowStockAt&&g.qty<=g.lowStockAt?'<span class="badge" style="background:#fff3cd;color:#854F0B;font-size:9px">📦 LOW STOCK</span>':'')+
          '</div>'+
          '<div class="dim">'+esc(g.category)+(g.notes?' · '+esc(g.notes):'')+'</div>'+
          // Lifespan bar
          (g.expectedLifeHours?
            (()=>{const pct=Math.min(100,Math.round((g.hoursUsed||0)/g.expectedLifeHours*100));const barColor=pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)';
            return'<div style="margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:10px;font-family:var(--mono);color:var(--dim2);margin-bottom:3px"><span>Lifespan</span><span>'+(g.hoursUsed||0)+'h / '+esc(g.expectedLifeHours)+'h ('+pct+'%)</span></div>'+
              '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+barColor+';border-radius:2px;transition:width .3s"></div></div></div>';})()
          :'')+
          '<div style="margin-top:6px;display:flex;align-items:center;gap:8px">'+
            '<span class="gear-status-dot" style="background:'+ms.color+'"></span>'+
            '<span style="font-size:11px;font-family:var(--mono);color:'+ms.color+'">'+esc(ms.label)+'</span>'+
          '</div>'+
          (co?'<div style="margin-top:4px;font-size:11px;font-family:var(--mono);color:var(--dim2)">With: '+esc(p?p.name:'unknown')+(co.dueDate?' · due '+fmtDateShort(co.dueDate):'')+'</div>':'')+
        '</div>'+
        '<div class="row gap6">'+
          (co?`<button class="btn bb bsm" onclick="openReturnModal('${co.id}')">↩ Return</button>`:`<button class="btn bg bsm" onclick="(()=>{_populateGearSelect('co-item',true);document.getElementById('co-item').value='${g.id}';_populatePersonSelect('co-person');const t=new Date();t.setDate(t.getDate()+7);document.getElementById('co-due').value=t.toISOString().slice(0,10);openM('checkoutGear')})()">📤 Out</button>`)+
          `<button class="btn br bsm" onclick="openIncidentReport('${esc(g.id)}')" title="Report damage/incident">⚠️</button>`+
          `<button class="btn bg bsm" onclick="openLogGearHours('${esc(g.id)}')" title="Log usage hours">⏱</button>`+
          `<button class="btn bgh bsm" data-perm="admin" onclick="openEditGearItem('${esc(g.id)}')">✏️</button>`+
        '</div>'+
      '</div>';
    }).join('');
    return;
  }

  if(tab==='active'){
    const active=(db.checkouts||[]).filter(c=>!c.returnedAt);
    if(!active.length){listEl.innerHTML='<p class="dim" style="padding:16px">Nothing currently checked out.</p>';return;}
    listEl.innerHTML=active.map(co=>{
      const g=(db.gearItems||[]).find(x=>x.id===co.gearId)||{name:'Unknown item',category:'Other'};
      const p=(db.technicians||[]).find(x=>x.id===co.personId)||{name:'Unknown'};
      const over=isOverdue(co);
      const badge=over?'<span class="co-badge-over">OVERDUE</span>':'<span class="co-badge-out">OUT</span>';
      const daysOver = over ? Math.round((Date.now()-co.dueDate)/(1000*60*60*24)) : 0;
      return'<div class="co-card" style="'+(over?'border-left:3px solid var(--red);':'')+'">' +
        '<div class="co-icon">'+gearIcon(g)+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div class="row gap6 mb8"><div class="fw7 gd-link" onclick="openGearDetail(\''+esc(g.id||'')+'\')" style="font-size:14px">'+esc(g.name)+'</div>'+badge+
            (over?`<span style="font-size:10px;font-family:var(--mono);color:var(--red)">${daysOver}d overdue</span>`:'')+
          '</div>'+
          '<div class="dim">With: <strong>'+esc(p.name)+'</strong>'+(p.dept?' · '+p.dept:'')+'</div>'+
          '<div class="dim">Out since: '+fmtDate(co.checkedOutAt)+(co.dueDate?' · Due: '+fmtDate(co.dueDate):'')+'</div>'+
          (co.purpose?'<div class="dim">Purpose: '+esc(co.purpose)+'</div>':'')+
        '</div>'+
        '<div class="row gap6">'+
          `<button class="btn bb bsm" onclick="openReturnModal('${esc(co.id)}')">↩ Return</button>`+
          `<button class="btn br bsm" onclick="openIncidentReport('${esc(g.id)}')" title="Report damage">⚠️</button>`+
          (over&&p.email?`<button class="btn bsm" style="background:#fef2f2;border:1px solid var(--red);color:var(--red)" onclick="sendOverdueAlert('${esc(co.id)}')">📧 Remind</button>`:'')+
        '</div>'+
      '</div>';
    }).join('');
    return;
  }

  if(tab==='returned'){
    const returned=(db.checkouts||[]).filter(c=>c.returnedAt).sort((a,b)=>b.returnedAt-a.returnedAt);
    if(!returned.length){listEl.innerHTML='<p class="dim" style="padding:16px">No return history yet.</p>';return;}
    listEl.innerHTML=returned.map(co=>{
      const g=(db.gearItems||[]).find(x=>x.id===co.gearId)||{name:'Unknown item',category:'Other'};
      const p=(db.technicians||[]).find(x=>x.id===co.personId)||{name:'Unknown'};
      const condColor=co.returnCondition==='Damaged'?'var(--red)':co.returnCondition==='Needs service'?'var(--amber)':'var(--green)';
      return'<div class="co-card">'+
        '<div class="co-icon">'+gearIcon(g)+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div class="row gap6 mb8"><div class="fw7 gd-link" onclick="openGearDetail(\''+esc(g.id||'')+'\')" style="font-size:14px">'+esc(g.name)+'</div><span class="co-badge-in">RETURNED</span></div>'+
          '<div class="dim">Borrowed by <strong>'+esc(p.name)+'</strong> · Returned '+fmtDate(co.returnedAt)+'</div>'+
          (co.returnCondition?'<div style="font-size:11px;font-family:var(--mono);color:'+condColor+';margin-top:3px">Condition: '+esc(co.returnCondition)+'</div>':'')+
          (co.returnNotes?'<div class="dim" style="margin-top:2px">'+esc(co.returnNotes)+'</div>':'')+
        '</div>'+
      '</div>';
    }).join('');
  }
  if(tab==='incidents'){
    const reports=[...(db.incidentReports||[])].sort((a,b)=>b.reportedAt-a.reportedAt);
    if(!reports.length){
      listEl.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">✅</div><div class="dim">No incidents reported — great!</div></div>';
    } else {
      const SEV_COLOR={Minor:'var(--amber)',Major:'#E07417',Critical:'var(--red)'};
      listEl.innerHTML=reports.map(r=>{
        const g=(db.gearItems||[]).find(x=>x.id===r.gearId)||{name:r.gearName||'Unknown'};
        return'<div class="co-card" style="border-left:3px solid '+(SEV_COLOR[r.severity]||'var(--amber)')+'">'+
          '<div class="co-icon">⚠️</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div class="row gap6 mb4"><div class="fw7" style="font-size:14px">'+gearIcon(g)+' '+esc(g.name)+'</div>'+
              '<span style="font-size:10px;font-family:var(--mono);font-weight:700;color:'+(SEV_COLOR[r.severity]||'var(--amber)')+'">'+r.severity.toUpperCase()+'</span>'+
              (r.resolved?'<span style="font-size:10px;font-family:var(--mono);color:var(--green)">✓ RESOLVED</span>':'')+
            '</div>'+
            '<div style="font-size:13px;color:var(--text);margin-bottom:4px">'+esc(r.description)+'</div>'+
            '<div class="dim" style="font-size:11px;font-family:var(--mono)">Reported by '+esc(r.reportedBy)+' · '+fmtDate(r.date)+'</div>'+
          '</div>'+
          (!r.resolved?`<button class="btn bg bsm" data-perm="admin" onclick="resolveIncident('${esc(r.id)}')">✓ Resolve</button>`:'')+
        '</div>';
      }).join('');
    }
  }
  applyPermissions();
}

function resolveIncident(id){
  const r=(db.incidentReports||[]).find(x=>x.id===id);if(!r)return;
  r.resolved=true;r.resolvedAt=Date.now();r.resolvedBy=getCurTech()?.name||'Admin';
  const g=(db.gearItems||[]).find(x=>x.id===r.gearId);
  if(g){
    const stillDamaged=(db.incidentReports||[]).some(x=>x.gearId===r.gearId&&!x.resolved&&(x.severity==='Critical'||x.severity==='Major'));
    if(!stillDamaged) g.damaged=false;
  }
  save();renderCheckout();toast('Incident marked as resolved','success');
}
async function sendOverdueAlert(coId){
  const co=(db.checkouts||[]).find(x=>x.id===coId);if(!co)return;
  const g=(db.gearItems||[]).find(x=>x.id===co.gearId)||{name:'Gear item'};
  const p=(db.technicians||[]).find(x=>x.id===co.personId);
  if(!p||!p.email){toast('No email for this crew member','error');return;}
  const daysOver=Math.round((Date.now()-co.dueDate)/(1000*60*60*24));
  try{
    await emailjs.send(EJSID,EJTPL,kccNoticeParams(p,'⚠️ Overdue gear: '+g.name,{tone:'red',badge:'Overdue',headline:'"'+g.name+'" was due back '+daysOver+' day'+(daysOver!==1?'s':'')+' ago',rows:[['Checked out',fmtDate(co.checkedOutAt)],['Due',fmtDate(co.dueDate)]],body:'Please return it as soon as possible.'},{fixture_name:'⚠️ Overdue: '+g.name,fixture_id:g.assetId||co.gearId}));
    toast('📧 Overdue reminder sent to '+p.name,'success');
  }catch(e){toast('Email failed: '+e.text,'error');}
}

// ── DAMAGE / INCIDENT REPORT ──────────────────────────────
function openIncidentReport(gearId){
  const g=(db.gearItems||[]).find(x=>x.id===gearId);if(!g)return;
  document.getElementById('ir-gearId').value=gearId;
  document.getElementById('ir-gearName').textContent=gearIcon(g)+' '+g.name;
  document.getElementById('ir-description').value='';
  document.getElementById('ir-severity').value='Minor';
  document.getElementById('ir-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('m-incidentReport').style.display='flex';
}
async function saveIncidentReport(){
  const gearId=document.getElementById('ir-gearId').value;
  const description=(document.getElementById('ir-description').value||'').trim();
  if(!description){toast('Describe the incident','error');return;}
  const g=(db.gearItems||[]).find(x=>x.id===gearId)||{name:'Unknown item'};
  const tech=getCurTech();
  const severity=document.getElementById('ir-severity').value;
  const dateVal=document.getElementById('ir-date').value;
  const report={
    id:'ir_'+Date.now(),
    gearId,
    gearName:g.name,
    description,
    severity,
    date:dateVal?new Date(dateVal+'T12:00:00').getTime():Date.now(),
    reportedBy:tech?tech.name:'Unknown',
    reportedAt:Date.now(),
    resolved:false
  };
  if(!db.incidentReports)db.incidentReports=[];
  db.incidentReports.unshift(report);
  // Flag gear item as damaged
  if(severity==='Critical'||severity==='Major') g.damaged=true;
  save();
  document.getElementById('m-incidentReport').style.display='none';
  toast('⚠️ Incident reported for '+g.name,'success');
  // Email admins
  const admins=(db.technicians||[]).filter(t=>t.email&&(t.userRole==='master'||t.userRole==='admin'));
  for(const admin of admins){
    try{
      await emailjs.send(EJSID,EJTPL,kccNoticeParams(admin,'⚠️ Damage report: '+g.name,{tone:'red',badge:'Damage report \u00B7 '+severity,headline:g.name+(g.assetId?' ('+g.assetId+')':'')+' was reported damaged',rows:[['Severity',severity],['Reported by',tech?tech.name:'Unknown'],['Date',fmtDate(report.date)]],body:description},{fixture_name:'⚠️ '+severity+': '+g.name,fixture_id:g.assetId||gearId}));
    }catch(e){console.warn('Incident email failed',e);}
  }
  if(admins.length) toast('📧 Admins notified','info');
}

// ── LOW STOCK CHECK ────────────────────────────────────────
async function checkLowStockAlerts(){
  const items=(db.gearItems||[]).filter(g=>g.lowStockAt&&g.qty<=g.lowStockAt);
  if(!items.length)return;
  const admins=(db.technicians||[]).filter(t=>t.email&&(t.userRole==='master'||t.userRole==='admin'));
  for(const admin of admins){
    for(const g of items){
      try{
        await emailjs.send(EJSID,EJTPL,kccNoticeParams(admin,'📦 Low stock: '+g.name,{tone:'amber',badge:'Low stock',headline:g.name+' is running low',rows:[['Current quantity',g.qty],['Alert threshold',g.lowStockAt]],body:'Please restock soon.'},{fixture_name:'📦 Low Stock: '+g.name,fixture_id:g.assetId||g.id}));
      }catch(e){console.warn('Low stock email failed',e);}
    }
  }
}

// ── LOG GEAR HOURS ─────────────────────────────────────────
function openLogGearHours(gearId){
  const g=(db.gearItems||[]).find(x=>x.id===gearId);if(!g)return;
  document.getElementById('gh-gearId').value=gearId;
  document.getElementById('gh-gearName').textContent=gearIcon(g)+' '+g.name;
  document.getElementById('gh-hours').value='';
  document.getElementById('m-logGearHours').style.display='flex';
}
function saveGearHours(){
  const gearId=document.getElementById('gh-gearId').value;
  const g=(db.gearItems||[]).find(x=>x.id===gearId);if(!g)return;
  const hrs=parseFloat(document.getElementById('gh-hours').value);
  if(!hrs||hrs<=0){toast('Enter valid hours','error');return;}
  g.hoursUsed=(g.hoursUsed||0)+hrs;
  save();
  document.getElementById('m-logGearHours').style.display='none';
  renderCheckout();
  // Check if nearing end of life
  if(g.expectedLifeHours){
    const pct=(g.hoursUsed/g.expectedLifeHours)*100;
    if(pct>=90) toast('⚠️ '+g.name+' is at '+Math.round(pct)+'% of expected lifespan!','error');
    else if(pct>=70) toast('⚠️ '+g.name+' is at '+Math.round(pct)+'% of lifespan','info');
    else toast('+'+hrs+'h logged for '+g.name,'success');
  } else {
    toast('+'+hrs+'h logged for '+g.name,'success');
  }
}

// ── MAINTENANCE ───────────────────────────────────────────
function openM_addMaintEntry(){
  _populateGearSelect('me-item',false);
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('me-date').value=today;
  document.getElementById('me-by').value='';
  document.getElementById('me-notes').value='';
  document.getElementById('me-cost').value='';
  document.getElementById('me-nextdue').value='';
  const _mpi=document.getElementById('mePhotoInput');if(_mpi)_mpi.value='';
  const _mpp=document.getElementById('mePhotoPreview');if(_mpp){_mpp.innerHTML='';_mpp.dataset.photo='';}
  openM('addMaintEntry');
}
function saveMaintEntry(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const gearId=document.getElementById('me-item').value;
  const dateVal=document.getElementById('me-date').value;
  if(!gearId){toast('Select a gear item','error');return;}
  if(!dateVal){toast('Service date required','error');return;}
  const _mePhoto=(document.getElementById('mePhotoPreview')||{}).dataset?.photo||'';
  const entry={
    id:'ml_'+Date.now(),
    gearId,
    date:new Date(dateVal+'T12:00:00').getTime(),
    by:(document.getElementById('me-by').value||'').trim(),
    type:document.getElementById('me-type').value||'Routine check',
    notes:(document.getElementById('me-notes').value||'').trim(),
    cost:parseFloat(document.getElementById('me-cost').value)||0,
    nextDue:document.getElementById('me-nextdue').value?new Date(document.getElementById('me-nextdue').value+'T12:00:00').getTime():null,
    photo:_mePhoto||null
  };
  if(!db.maintLogs)db.maintLogs=[];
  db.maintLogs.unshift(entry);
  // Update lastServiceDate on gear item
  const g=(db.gearItems||[]).find(x=>x.id===gearId);
  if(g) g.lastServiceDate=entry.date;
  save();closeM('addMaintEntry');renderMaintenance();
  const gi=(db.gearItems||[]).find(x=>x.id===gearId);
  toast('Service logged for '+(gi?gi.name:'item'),'success');
}
function maintSetTab(tab,btn){
  window._maintTab=tab;
  document.querySelectorAll('#pg-maintenance .tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderMaintenance();
  applyPermissions();
}
// ── RENDER MAINTENANCE ────────────────────────────────────
function renderMaintenance(){
  if(!db.gearItems)db.gearItems=[];
  if(!db.maintLogs)db.maintLogs=[];
  const overdue=(db.gearItems||[]).filter(g=>maintStatus(g).status==='overdue').length;
  const dueSoon=(db.gearItems||[]).filter(g=>maintStatus(g).status==='due-soon').length;
  const ok=(db.gearItems||[]).filter(g=>maintStatus(g).status==='ok').length;
  const never=(db.gearItems||[]).filter(g=>maintStatus(g).status==='unknown').length;
  document.getElementById('maint-stats').innerHTML=
    '<div class="sc cr"><div class="sc-label">Overdue</div><div class="sc-val">'+overdue+'</div></div>'+
    '<div class="sc cp"><div class="sc-label">Due Soon</div><div class="sc-val">'+dueSoon+'</div></div>'+
    '<div class="sc cg"><div class="sc-label">OK</div><div class="sc-val">'+ok+'</div></div>'+
    '<div class="sc cb"><div class="sc-label">Never Serviced</div><div class="sc-val">'+never+'</div></div>';

  const tab=window._maintTab||'due';
  const listEl=document.getElementById('maint-list');

  if(tab==='log'){
    const logs=[...(db.maintLogs||[])].sort((a,b)=>b.date-a.date);
    if(!logs.length){listEl.innerHTML='<p class="dim" style="padding:16px">No service history yet.</p>';return;}
    listEl.innerHTML='<div class="panel"><div class="pb" style="padding:0">'+
      logs.map(entry=>{
        const g=(db.gearItems||[]).find(x=>x.id===entry.gearId)||{name:'Unknown item',category:'Other'};
        return'<div class="maint-log-entry" style="padding:12px 16px">'+
          '<div class="row jbet mb8">'+
            '<div class="row gap8"><span style="font-size:18px">'+gearIcon(g)+'</span><div><div class="fw7 gd-link" onclick="openGearDetail(\''+esc(g.id||'')+'\')">'+esc(g.name)+'</div><div class="dim">'+esc(entry.type)+'</div></div></div>'+
            '<div style="text-align:right"><div style="font-size:12px;font-family:var(--mono)">'+fmtDate(entry.date)+'</div>'+(entry.cost?'<div style="font-size:11px;font-family:var(--mono);color:var(--amber)">$'+entry.cost.toFixed(2)+'</div>':'')+'</div>'+
          '</div>'+
          (entry.by?'<div class="dim">By: '+esc(entry.by)+'</div>':'')+
          (entry.notes?'<div class="dim" style="margin-top:2px">'+esc(entry.notes)+'</div>':'')+
          (entry.photo?'<img src="'+esc(safeImg(entry.photo))+'" onclick="viewPhotoLightbox(this.src)" style="width:48px;height:48px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border);margin-top:6px">':'')+
          (entry.nextDue?'<div style="font-size:11px;font-family:var(--mono);color:var(--blue);margin-top:4px">Next due: '+fmtDate(entry.nextDue)+'</div>':'')+
        '</div>';
      }).join('')+
    '</div></div>';
    return;
  }

  // Due/Overdue or All gear
  let items=[...(db.gearItems||[])];
  if(tab==='due') items=items.filter(g=>['overdue','due-soon','unknown'].includes(maintStatus(g).status));
  items.sort((a,b)=>{
    const order={overdue:0,'due-soon':1,unknown:2,ok:3};
    return (order[maintStatus(a).status]||3)-(order[maintStatus(b).status]||3);
  });
  if(!items.length){
    listEl.innerHTML='<p class="dim" style="padding:16px">'+(tab==='due'?'Nothing overdue or due soon — all gear is up to date! ✅':'No gear items yet.')+'</p>';
    return;
  }
  listEl.innerHTML=items.map(g=>{
    const ms=maintStatus(g);
    const logs=(db.maintLogs||[]).filter(l=>l.gearId===g.id).sort((a,b)=>b.date-a.date);
    const lastLog=logs[0];
    const co=activeCheckout(g.id);
    const p=co?(db.technicians||[]).find(x=>x.id===co.personId):null;
    return'<div class="maint-card '+esc(ms.status)+'">'+
      '<div class="row jbet mb8">'+
        '<div class="row gap8">'+
          '<span style="font-size:22px">'+gearIcon(g)+'</span>'+
          '<div>'+
            '<div class="row gap6"><div class="fw7 gd-link" onclick="openGearDetail(\''+esc(g.id||'')+'\')" style="font-size:14px">'+esc(g.name)+'</div>'+(g.dept?deptBadge(g.dept):'')+(g.assetId?'<span class="badge blow" style="font-size:9px">'+esc(g.assetId)+'</span>':'')+'</div>'+
            '<div style="font-size:12px;font-family:var(--mono);color:'+ms.color+';margin-top:2px">'+esc(ms.label)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="row gap6">'+
          `<button class="btn ba bsm" onclick="(()=>{_populateGearSelect('me-item',false);document.getElementById('me-item').value='${g.id}';document.getElementById('me-date').value=new Date().toISOString().slice(0,10);openM('addMaintEntry')})()">+ Log</button>`+
          `<button class="btn bgh bsm" data-perm="admin" onclick="openEditGearItem('${esc(g.id)}')">✏️</button>`+
        '</div>'+
      '</div>'+
      '<div class="dim">Last service: '+(lastLog?fmtDate(lastLog.date)+' · '+lastLog.type:'Never')+'</div>'+
      (g.vendorId?(()=>{const v=getVendors().find(x=>x.id===g.vendorId);return v?'<div class="dim" style="margin-top:2px">🚚 Order from: <strong>'+esc(v.name)+'</strong>'+(v.phone?' · '+v.phone:'')+'</div>':'';})():'')+
      (co?'<div class="dim" style="margin-top:2px">Currently with: '+esc(p?p.name:'unknown')+'</div>':'')+
      (logs.length>1?'<div style="margin-top:8px;font-size:11px;font-family:var(--mono);color:var(--dim2)">'+logs.length+' service records</div>':'')+
    '</div>';
  }).join('');
  applyPermissions();
}

// ── Wire openM for checkout/maint to pre-populate selects ─
const _origOpenM = window.openM || function(){};
window.openM = function(id){
  if(id==='checkoutGear') openM_checkoutGear();
  else if(id==='addMaintEntry') openM_addMaintEntry();
  else if(id==='addFixture'){_populateVendorSelect('fvendor','');_origOpenM(id);}
  else if(id==='addGearItem'){_populateVendorSelect('gi-vendor','');_origOpenM(id);}
  else _origOpenM(id);
};


// ══════════════════════════════════════════════════════════
// STAGE 4 — Tech Requests, Announcements, Dept Sign-Off
// ══════════════════════════════════════════════════════════

const REQ_PRIORITY_COLORS = {urgent:'#E24B4A',normal:'#185FA5',low:'#888780'};
const REQ_STATUS_LABELS = {open:'Open',progress:'In Progress',done:'Completed',cancelled:'Cancelled'};
window._reqTab = 'open';

// ── TECH REQUESTS ─────────────────────────────────────────
// ── External Tech-Support Intake (no login) ──
let _erMediaList=[];
function showExternalRequestScreen(){
  const ls=document.getElementById('loginScreen');if(ls)ls.style.display='none';
  const hs=document.getElementById('homeScreen');if(hs)hs.style.display='none';
  const er=document.getElementById('extRequestScreen');if(er)er.style.display='block';
}
function _erRenderMediaPreview(){
  const p=document.getElementById('er-media-preview');if(!p)return;
  p.innerHTML=_erMediaList.map((src,i)=>'<div class="er-media-thumb"><img src="'+esc(safeImg(src))+'"><button type="button" class="rm" onclick="_erMediaRemove('+i+')">✕</button></div>').join('');
}
function _erMediaAdd(fileList){
  const files=Array.from(fileList||[]).slice(0,6-_erMediaList.length);
  files.forEach(file=>{
    const reader=new FileReader();
    reader.onload=function(e){
      const img=new Image();
      img.onload=function(){
        let w=img.width,h=img.height;const maxDim=900;
        if(w>h&&w>maxDim){h=Math.round(h*(maxDim/w));w=maxDim;}
        else if(h>maxDim){w=Math.round(w*(maxDim/h));h=maxDim;}
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        _erMediaList.push(canvas.toDataURL('image/jpeg',0.6));
        _erRenderMediaPreview();
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('er-media-input').value='';
}
function _erMediaDrop(e){
  e.preventDefault();
  e.currentTarget.style.borderColor='var(--border2)';
  if(e.dataTransfer&&e.dataTransfer.files)_erMediaAdd(e.dataTransfer.files);
}
function _erMediaRemove(i){_erMediaList.splice(i,1);_erRenderMediaPreview();}
function resetExternalRequestForm(){
  ['er-name','er-dept','er-contact','er-eventdate','er-details'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.querySelectorAll('#er-cat-group input[type=checkbox]').forEach(cb=>cb.checked=false);
  _erMediaList=[];_erRenderMediaPreview();
  document.getElementById('extReq-status').textContent='';
  document.getElementById('extReq-form').style.display='';
  document.getElementById('extReq-success').style.display='none';
}
async function submitExternalRequest(){
  const name=(document.getElementById('er-name').value||'').trim();
  const dept=(document.getElementById('er-dept').value||'').trim();
  const details=(document.getElementById('er-details').value||'').trim();
  const contact=(document.getElementById('er-contact').value||'').trim();
  const cats=Array.from(document.querySelectorAll('#er-cat-group input[type=checkbox]:checked')).map(cb=>cb.value);
  const statusEl=document.getElementById('extReq-status');
  const fail=m=>{statusEl.textContent=m;statusEl.style.color='var(--red)';};
  if(!name||!dept){fail('Name and ministry/department are required.');return;}
  if(!details){fail('Please describe what you need.');return;}
  if(name.length>80||dept.length>80||details.length>2000||contact.length>120){fail('One of the answers is too long. Please shorten it.');return;}
  if(!window._kccSubmitRequest){fail('Cannot reach the server. Please try again in a moment.');return;}
  // The server checks length, images and rate limits again; this device only blocks quick repeats.
  try{ const last=+localStorage.getItem('kcc_ext_last')||0; if(Date.now()-last<60000){fail('Please wait a minute before sending another request.');return;} }catch(e){}
  const dateVal=document.getElementById('er-eventdate').value;
  statusEl.textContent='Submitting…';statusEl.style.color='';
  try{
    await window._kccSubmitRequest({name,dept,contact,details,cats,
      neededBy:dateVal?new Date(dateVal+'T12:00:00').getTime():null,
      photos:_erMediaList.slice(0,3).filter(safeImg)});
    try{localStorage.setItem('kcc_ext_last',String(Date.now()));}catch(e){}
    document.getElementById('extReq-form').style.display='none';
    document.getElementById('extReq-success').style.display='block';
  }catch(e){ fail(srvErr(e)); }
}
function copyExternalRequestLink(){
  const url=location.origin+location.pathname+'#request';
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast('Link copied!','success')).catch(()=>prompt('Copy this link:',url));
  } else prompt('Copy this link:',url);
}
function saveRequest(){
  const title=(document.getElementById('rq-title').value||'').trim();
  if(!title){toast('Title required','error');return;}
  const req={
    id:'req_'+Date.now(),
    title,
    category:document.getElementById('rq-cat').value||'Other',
    priority:document.getElementById('rq-priority').value||'normal',
    neededBy:document.getElementById('rq-needed').value?new Date(document.getElementById('rq-needed').value+'T12:00:00').getTime():null,
    requestedBy:document.getElementById('rq-by').value||'',
    details:(document.getElementById('rq-details').value||'').trim(),
    status:'open',
    assignedTo:'',
    adminNotes:'',
    createdAt:Date.now()
  };
  if(!db.techRequests)db.techRequests=[];
  db.techRequests.unshift(req);
  save();closeM('addRequest');renderRequests();_updateReqBadge();
  ['rq-title','rq-details','rq-needed'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rq-priority').value='normal';
  toast('Request submitted!','success');
}
function openEditRequest(id){
  const r=(db.techRequests||[]).find(x=>x.id===id);if(!r)return;
  const by=(db.technicians||[]).find(x=>x.id===r.requestedBy);
  const requesterLine=r.source==='external'?('🌐 '+r.requesterName+(r.requesterDept?' — '+r.requesterDept:'')+(r.requesterContact?' · '+r.requesterContact:'')):(by?by.name:'Unknown');
  document.getElementById('er-id').value=r.id;
  document.getElementById('er-summary').innerHTML=
    '<div class="fw7 mb8">'+esc(r.title)+'</div>'+
    '<div class="dim">'+esc(r.category)+' · '+requesterLine+'</div>'+
    (r.details?'<div class="dim" style="margin-top:4px">'+esc(r.details)+'</div>':'')+
    (r.photos&&r.photos.length?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+r.photos.map(p=>'<img src="'+esc(safeImg(p))+'" onclick="viewPhotoLightbox(this.src)" style="width:56px;height:56px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border)">').join('')+'</div>':'');
  document.getElementById('er-status').value=r.status||'open';
  document.getElementById('er-notes').value=r.adminNotes||'';
  _populatePersonSelect('er-assigned');
  document.getElementById('er-assigned').value=r.assignedTo||'';
  if(!isAdmin()){toast('Admin required to manage requests','error');return;}
  openM('editRequest');
}
function saveRequestEdit(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const id=document.getElementById('er-id').value;
  const r=(db.techRequests||[]).find(x=>x.id===id);if(!r)return;
  r.status=document.getElementById('er-status').value;
  r.assignedTo=document.getElementById('er-assigned').value;
  r.adminNotes=(document.getElementById('er-notes').value||'').trim();
  r.updatedAt=Date.now();
  save();closeM('editRequest');renderRequests();_updateReqBadge();
  toast('Request updated','success');
}
function deleteRequest(id){
  if(!isAdmin())return;
  if(!confirm('Delete this request?'))return;
  db.techRequests=(db.techRequests||[]).filter(x=>x.id!==id);
  save();closeM('editRequest');renderRequests();_updateReqBadge();
  toast('Request deleted','info');
}
function reqSetTab(tab,btn){
  window._reqTab=tab;
  document.querySelectorAll('#req-tabs .tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderRequests();
}
function _updateReqBadge(){
  const open=(db.techRequests||[]).filter(r=>r.status==='open'||r.status==='progress').length;
  const badge=document.getElementById('req-badge');
  if(badge){badge.style.display=open?'':'none';badge.textContent=open;}
  applyPermissions();
}function renderRequests(){
  if(!db.techRequests)db.techRequests=[];
  _updateReqBadge();
  // Stats
  const open=(db.techRequests||[]).filter(r=>r.status==='open').length;
  const progress=(db.techRequests||[]).filter(r=>r.status==='progress').length;
  const done=(db.techRequests||[]).filter(r=>r.status==='done').length;
  const urgent=(db.techRequests||[]).filter(r=>r.priority==='urgent'&&r.status!=='done'&&r.status!=='cancelled').length;
  document.getElementById('req-stats').innerHTML=
    '<div class="sc cb"><div class="sc-label">Open</div><div class="sc-val">'+open+'</div></div>'+
    '<div class="sc cp"><div class="sc-label">In Progress</div><div class="sc-val">'+progress+'</div></div>'+
    '<div class="sc cg"><div class="sc-label">Completed</div><div class="sc-val">'+done+'</div></div>'+
    '<div class="sc '+(urgent?'cr':'ca')+'"><div class="sc-label">Urgent</div><div class="sc-val">'+urgent+'</div></div>';

  const tab=window._reqTab||'open';
  let items=[...(db.techRequests||[])];
  if(tab!=='all') items=items.filter(r=>r.status===tab||(tab==='open'&&r.status==='open'));
  items.sort((a,b)=>{
    const p={urgent:0,normal:1,low:2};
    return (p[a.priority]||1)-(p[b.priority]||1)||(b.createdAt-a.createdAt);
  });

  const listEl=document.getElementById('req-list');
  if(!items.length){listEl.innerHTML='<p class="dim" style="padding:16px">No requests in this category.</p>';return;}
  listEl.innerHTML=items.map(r=>{
    const by=(db.technicians||[]).find(x=>x.id===r.requestedBy);
    const requesterLabel=r.source==='external'?('🌐 '+r.requesterName+(r.requesterDept?' ('+esc(r.requesterDept)+')':'')):(by?by.name:'');
    const assigned=(db.technicians||[]).find(x=>x.id===r.assignedTo);
    const statusBadge={open:'<span class="req-badge-open">Open</span>',progress:'<span class="req-badge-progress">In Progress</span>',done:'<span class="req-badge-done">Done</span>',cancelled:'<span class="badge" style="background:var(--s3);color:var(--dim2)">Cancelled</span>'}[r.status]||'';
    const priColor=REQ_PRIORITY_COLORS[r.priority]||'#888';
    return'<div class="req-card '+esc(r.priority)+'">'+
      '<div class="row jbet mb8">'+
        '<div class="row gap6 fw7" style="font-size:14px;flex:1;min-width:0">'+
          (r.priority==='urgent'?'<span style="color:#E24B4A;font-size:11px;font-family:var(--mono);font-weight:700">URGENT</span> ':'')
          +esc(r.title)+
        '</div>'+
        statusBadge+
      '</div>'+
      '<div class="dim">'+esc(r.category)+(requesterLabel?' · '+esc(requesterLabel):'')+(r.neededBy?' · Needed by '+fmtDate(r.neededBy):'')+'</div>'+
      (r.requesterContact?'<div class="dim" style="font-size:11px">Contact: '+esc(r.requesterContact)+'</div>':'')+
      (r.details?'<div style="font-size:12px;color:var(--dim2);margin-top:4px;font-family:var(--mono)">'+esc(r.details)+'</div>':'')+
      (r.photos&&r.photos.length?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+r.photos.map(p=>'<img src="'+esc(safeImg(p))+'" onclick="viewPhotoLightbox(this.src)" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border)">').join('')+'</div>':'')+
      (assigned?'<div class="dim" style="margin-top:4px">Assigned: <strong>'+esc(assigned.name)+'</strong></div>':'')+
      (r.adminNotes?'<div class="dim" style="margin-top:4px;font-style:italic">Note: '+esc(r.adminNotes)+'</div>':'')+
      '<div style="margin-top:10px">'+
        `<button class="btn bgh bsm" onclick="openEditRequest('${esc(r.id)}')">${isAdmin()?'✏️ Manage':'View'}</button>`+
      '</div>'+
    '</div>';
  }).join('');
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────
function saveAnnouncement(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const title=(document.getElementById('an-title').value||'').trim();
  const body=(document.getElementById('an-body').value||'').trim();
  if(!title||!body){toast('Title and message required','error');return;}
  const tech=getCurTech();
  const ann={
    id:'ann_'+Date.now(),
    title,body,
    dept:document.getElementById('an-dept').value||'',
    pinned:document.getElementById('an-pin').checked,
    author:tech?tech.name:'Admin',
    createdAt:Date.now()
  };
  if(!db.announcements)db.announcements=[];
  db.announcements.unshift(ann);
  logAudit('Announcement Posted', ann.title);
  save();closeM('addAnnouncement');renderAnnouncements();
  ['an-title','an-body'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('an-dept').value='';
  document.getElementById('an-pin').checked=false;
  toast('Announcement posted!','success');
  // Email blast if opted in
  if(document.getElementById('an-email')?.checked){
    sendAnnouncementEmails(ann);
  }
  document.getElementById('an-email').checked=false;
}
function deleteAnnouncement(id){
  if(!isAdmin())return;
  if(!confirm('Delete this announcement?'))return;
  db.announcements=(db.announcements||[]).filter(x=>x.id!==id);
  save();renderAnnouncements();toast('Deleted','info');
}
function annReact(annId, emoji){
  const tech = getCurTech();
  if(!tech){toast('Log in to react','info');return;}
  const ann = (db.announcements||[]).find(a=>a.id===annId);
  if(!ann) return;
  if(!ann.reactions) ann.reactions = {};
  if(!ann.reactions[emoji]) ann.reactions[emoji] = [];
  const idx = ann.reactions[emoji].indexOf(tech.id);
  if(idx === -1) ann.reactions[emoji].push(tech.id);
  else ann.reactions[emoji].splice(idx, 1);
  save(); renderAnnouncements();
}

// ── Announcement Email Blast ──────────────────────────────
async function sendAnnouncementEmails(ann){
  const crew = (db.technicians||[]).filter(t=>t.email&&t.email.includes('@'));
  if(!crew.length){toast('No crew emails on file','info');return;}
  const deptLabel = ann.dept ? ann.dept+' dept only' : 'All departments';
  const targets = ann.dept ? crew.filter(t=>t.dept===ann.dept||!t.dept) : crew;
  let sent=0, skipped=0;
  for(const t of targets){
    try{
      await emailjs.send(EJSID, EJTPL, {
        to_email: t.email,
        to_name: t.name,
        subject: '📢 KCC Technical: '+ann.title,
        message: ann.body+'\n\n— '+ann.author+'\n'+deptLabel,
        fixture_id: '',
        fixture_name: '📢 '+ann.title,
        bulb_type: deptLabel,
        reported_by: ann.author
      });
      sent++;
    } catch(e){
      console.warn('Ann email fail for '+t.name, e);
      skipped++;
    }
  }
  if(sent>0) toast('📧 Announcement emailed to '+sent+' crew member'+(sent>1?'s':''),'success');
  if(skipped>0) toast(skipped+' email(s) failed to send','error');
}

// ── Feedback ──────────────────────────────────────────────
function submitFeedback(){
  const msg=(document.getElementById('fb-message').value||'').trim();
  if(!msg){toast('Please write your feedback first','error');return;}
  const anon=document.getElementById('fb-anon').value==='yes';
  const tech=getCurTech();
  if(!db.feedbackItems)db.feedbackItems=[];
  db.feedbackItems.unshift({
    id:'fb_'+Date.now(),
    category:document.getElementById('fb-category').value,
    message:msg,
    author:anon?'Anonymous':(tech?tech.name:'Unknown'),
    createdAt:Date.now(),
    read:false
  });
  save();
  document.getElementById('m-feedback').style.display='none';
  document.getElementById('fb-message').value='';
  // Update badge
  _updateFeedbackBadge();
  toast('✅ Feedback submitted — thanks!','success');
}

function renderFeedbackAdmin(){
  if(!isAdmin()){
    document.getElementById('feedback-list').innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">🔒</div><div class="dim">Admin access only</div></div>';
    return;
  }
  if(!db.feedbackItems)db.feedbackItems=[];
  const listEl=document.getElementById('feedback-list');if(!listEl)return;
  // Mark all as read
  db.feedbackItems.forEach(f=>{if(!f.read){f.read=true;}});
  save();_updateFeedbackBadge();
  if(!db.feedbackItems.length){
    listEl.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">💬</div><div class="dim">No feedback yet</div></div>';
    return;
  }
  const CAT_COLORS={General:'var(--blue)',Equipment:'var(--amber)',Scheduling:'#534AB7',Training:'#3B6D11',Communication:'var(--blue)',Other:'var(--dim2)'};
  listEl.innerHTML=[...db.feedbackItems].sort((a,b)=>b.createdAt-a.createdAt).map(f=>`
    <div class="panel mb14">
      <div class="ph row jbet">
        <div class="row gap8">
          <span style="font-size:12px;font-family:var(--mono);font-weight:700;color:${CAT_COLORS[f.category]||'var(--dim2)'}">${esc(f.category)}</span>
        </div>
        <div class="row gap8">
          <span class="dim" style="font-size:11px;font-family:var(--mono)">${fmtDate(f.createdAt)}</span>
          <button onclick="deleteFeedback('${esc(f.id)}')" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px" title="Delete">✕</button>
        </div>
      </div>
      <div class="pb">
        <div style="font-size:14px;line-height:1.6;color:var(--text);margin-bottom:8px">${f.message}</div>
        <div class="dim" style="font-size:12px;font-family:var(--mono)">From: ${esc(f.author)}</div>
      </div>
    </div>`).join('');
}

function deleteFeedback(id){
  db.feedbackItems=(db.feedbackItems||[]).filter(f=>f.id!==id);
  save();renderFeedbackAdmin();toast('Deleted','info');
}

function clearFeedback(){
  if(!isAdmin())return;
  if(!confirm('Delete all feedback?'))return;
  db.feedbackItems=[];
  save();renderFeedbackAdmin();toast('Feedback cleared','info');
}

function _updateFeedbackBadge(){
  const badge=document.getElementById('feedback-badge');if(!badge)return;
  const unread=(db.feedbackItems||[]).filter(f=>!f.read).length;
  badge.style.display=unread?'':'none';
  badge.textContent=unread;
}
function renderAnnouncements(){
  if(!db.announcements)db.announcements=[];
  const listEl=document.getElementById('ann-list');if(!listEl)return;
  const sorted=[...(db.announcements||[])].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.createdAt-a.createdAt));
  if(!sorted.length){listEl.innerHTML=`<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">📢</div><div class="dim">No announcements yet</div>${isAdmin()?`<button class="btn ba bsm" style="margin-top:12px" onclick="openM('addAnnouncement')">+ Post First Announcement</button>`:''}</div>`;return;}
  const REACT_EMOJIS = ['👍','❤️','🙏','🔥','✅'];
  const curTech = getCurTech();
  listEl.innerHTML=sorted.map(a=>{
    const deptB=a.dept?deptBadge(a.dept):'<span class="badge blow">All depts</span>';
    const reactions = a.reactions || {};
    const reactHTML = REACT_EMOJIS.map(emoji => {
      const who = reactions[emoji] || [];
      const iMine = curTech && who.includes(curTech.id);
      return `<button onclick="annReact('${esc(a.id)}','${emoji}')" style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;border:1px solid ${iMine?'var(--amber)':'var(--border)'};background:${iMine?'var(--aglow)':'transparent'};cursor:pointer;font-size:12px;font-family:var(--mono);color:${iMine?'var(--amber)':'var(--dim2)'};transition:all .15s">${emoji}${who.length?' '+who.length:''}</button>`;
    }).join('');
    return'<div class="ann-card'+(a.pinned?' pinned':'')+'">'+
      '<div class="row jbet mb8">'+
        '<div class="row gap6">'+
          (a.pinned?'<span style="font-size:12px;font-family:var(--mono);color:#0F6E56;font-weight:700">📌 PINNED</span>':'')+
          '<div class="fw7" style="font-size:15px">'+esc(a.title)+'</div>'+
        '</div>'+
        deptB+
      '</div>'+
      '<div style="font-size:14px;line-height:1.6;color:var(--text);margin-bottom:10px">'+esc(a.body)+'</div>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+reactHTML+'</div>'+
      '<div class="dim">'+esc(a.author)+' · '+fmtDate(a.createdAt)+
        (isAdmin()?`&nbsp;<button onclick="deleteAnnouncement('${esc(a.id)}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:11px;font-family:var(--mono)">delete</button>`:'')+
      '</div>'+
    '</div>';
  }).join('');
}

// ── DEPT SIGN-OFF ─────────────────────────────────────────
const SIGNOFF_DEPTS = ['Lighting','Audio','Cameras','IT'];
function _signoffKey(){ return 'signoff_'+new Date().toISOString().slice(0,10); }
function renderSignoffs(){
  const listEl=document.getElementById('cl-signoff-list');if(!listEl)return;
  const key=_signoffKey();
  if(!db.signoffs)db.signoffs={};
  const record=db.signoffs[key]||{};
  const tech=getCurTech();
  listEl.innerHTML=SIGNOFF_DEPTS.map(dept=>{
    const s=record[dept];
    const signed=s&&s.name;
    const chip=signed
      ?('<span class="signoff-chip signed">✓ '+esc(s.name)+'</span>')
      :'<span class="signoff-chip pending">Pending</span>';
    const canSign=tech&&(tech.dept===dept||isAdmin());
    return'<div class="signoff-row">'+
      '<div class="row gap8">'+deptBadge(dept)+'</div>'+
      '<div class="row gap8">'+chip+
        (canSign&&!signed?`<button class="btn ba bsm" onclick="deptSignOff('${dept}')" style="padding:4px 10px">Sign Off</button>`:'')
      +'</div>'+
    '</div>';
  }).join('');
}
function deptSignOff(dept){
  const tech=getCurTech();
  if(!tech){toast('Log in first','error');return;}
  if(tech.dept!==dept&&!isAdmin()){toast('You are not in the '+dept+' department','error');return;}
  const key=_signoffKey();
  if(!db.signoffs)db.signoffs={};
  if(!db.signoffs[key])db.signoffs[key]={};
  db.signoffs[key][dept]={name:tech.name,time:new Date().toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'}),ts:Date.now()};
  save();renderSignoffs();
  toast(dept+' signed off by '+tech.name,'success');
}
function resetSignoffs(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const key=_signoffKey();
  if(!db.signoffs)db.signoffs={};
  db.signoffs[key]={};
  save();renderSignoffs();
  toast('Sign-offs reset','info');
}

// ── Wire openM for request "by" person select ─────────────
const _s4OrigOpenM = window.openM || function(){};
window.openM = function(id){
  if(id==='addRequest'){
    _populatePersonSelect('rq-by');
    const tech=getCurTech();
    if(tech) setTimeout(()=>{document.getElementById('rq-by').value=tech.id;},50);
    _s4OrigOpenM(id);
  } else {
    _s4OrigOpenM(id);
  }
};

// ── Patch renderChecklist to also render sign-offs ────────
const _s4OrigRenderChecklist = typeof renderChecklist!=='undefined'?renderChecklist:null;
window._s4_renderChecklist_patched = false;
document.addEventListener('DOMContentLoaded',function(){
  if(!window._s4_renderChecklist_patched){
    const orig=window.renderChecklist;
    window.renderChecklist=function(){
      if(orig)orig();
      renderSignoffs();
    };
    window._s4_renderChecklist_patched=true;
  }
});

// ── Update badge on load ──────────────────────────────────
document.addEventListener('DOMContentLoaded',function(){
  setTimeout(_updateReqBadge,1200);
});


// ══════════════════════════════════════════════════════════
// STAGE 5 — Training Hub, Crew Profiles, Leaderboard
// ══════════════════════════════════════════════════════════

const LEVEL_COLORS = {Beginner:'#0F6E56',Intermediate:'#185FA5',Advanced:'#534AB7'};
const LEVEL_BG = {Beginner:'#E1F5EE',Intermediate:'#E6F1FB',Advanced:'#EEEDFE'};
window._trainingDeptFilter = 'all';
window._profilesDeptFilter = 'all';
window._openProfileId = null;

// ── TRAINING HUB ──────────────────────────────────────────
function saveTrainingModule(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const title=(document.getElementById('tm-title').value||'').trim();
  if(!title){toast('Title required','error');return;}
  const mod={
    id:'tm_'+Date.now(),
    title,
    dept:document.getElementById('tm-dept').value||'',
    desc:(document.getElementById('tm-desc').value||'').trim(),
    url:(document.getElementById('tm-url').value||'').trim(),
    level:document.getElementById('tm-level').value||'Beginner',
    duration:(document.getElementById('tm-duration').value||'').trim(),
    required:document.getElementById('tm-required').checked,
    createdAt:Date.now()
  };
  if(!db.trainingModules)db.trainingModules=[];
  db.trainingModules.unshift(mod);
  save();closeM('addTrainingModule');renderTraining();
  ['tm-title','tm-desc','tm-url','tm-duration'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('tm-required').checked=false;
  toast(title+' added to training hub','success');
}
function deleteTrainingModule(id){
  if(!isAdmin())return;
  db.trainingModules=(db.trainingModules||[]).filter(x=>x.id!==id);
  save();renderTraining();toast('Module removed','info');
}
function toggleTmBody(id){
  const el=document.getElementById('tmb-'+id);
  if(el)el.classList.toggle('open');
}
async function markModuleComplete(techId,modId){
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  const cur=(t.completedModules||[]).slice();
  const done=cur.includes(modId);
  const next=done?cur.filter(x=>x!==modId):cur.concat([modId]);
  const r=await techPatch(techId,{completedModules:next}); if(!r) return;
  renderTraining();
  toast(done?'Unmarked':'Marked complete','success');
}
function renderTraining(){
  if(!db.trainingModules)db.trainingModules=[];
  const tech=getCurTech();

  // Dept filter
  const filterWrap=document.getElementById('training-dept-filter');
  if(filterWrap&&!filterWrap.hasChildNodes()){
    filterWrap.innerHTML=deptFilterRow('training',(dept)=>{window._trainingDeptFilter=dept;renderTraining();});
  }
  const dept=window._trainingDeptFilter||'all';
  let mods=[...db.trainingModules];
  if(dept!=='all') mods=mods.filter(m=>!m.dept||m.dept===dept);

  // Sort: required first, then by dept, then date
  mods.sort((a,b)=>(b.required?1:0)-(a.required?1:0)||(a.dept||'').localeCompare(b.dept||'')||(b.createdAt-a.createdAt));

  const listEl=document.getElementById('training-list');
  if(!listEl)return;
  if(!mods.length){
    listEl.innerHTML=`<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">📚</div><div class="dim">No training modules yet</div>${isAdmin()?`<button class="btn ba bsm" style="margin-top:12px" onclick="openM('addTrainingModule')">+ Add First Module</button>`:''}</div>`;
    return;
  }
  listEl.innerHTML=mods.map(m=>{
    const completed=tech&&tech.completedModules&&tech.completedModules.includes(m.id);
    const levelBg=LEVEL_BG[m.level]||'#E1F5EE';
    const levelColor=LEVEL_COLORS[m.level]||'#0F6E56';
    const deptB=m.dept?deptBadge(m.dept):'';
    const requiredB=m.required?'<span style="background:#FCEBEB;color:#791F1F;border:1px solid #F7C1C1;border-radius:20px;padding:2px 8px;font-size:9px;font-family:var(--mono);font-weight:600">REQUIRED</span>':'';
    const completedB=completed?'<span style="background:#EAF3DE;color:#27500A;border:1px solid #C0DD97;border-radius:20px;padding:2px 8px;font-size:9px;font-family:var(--mono);font-weight:600">✓ DONE</span>':'';
    return'<div class="training-module'+(completed?' completed':'')+'">'+
      `<div class="tm-header" onclick="toggleTmBody('${esc(m.id)}')">` +
        '<div style="flex:1;min-width:0">'+
          '<div class="row gap6 mb8">'+
            '<div class="fw7" style="font-size:14px">'+esc(m.title)+'</div>'+
            requiredB+completedB+
          '</div>'+
          '<div class="row gap6">'+
            deptB+
            '<span style="background:'+levelBg+';color:'+levelColor+';border-radius:20px;padding:2px 8px;font-size:9px;font-family:var(--mono);font-weight:600">'+esc(m.level)+'</span>'+
            (m.duration?'<span class="dim" style="font-size:11px">⏱ '+esc(m.duration)+'</span>':'')+
          '</div>'+
        '</div>'+
        '<span style="font-size:18px;margin-left:8px;transition:transform .2s">›</span>'+
      '</div>'+
      '<div class="tm-body" id="tmb-'+esc(m.id)+'">'+
        (m.desc?'<div style="font-size:13px;color:var(--text);margin-bottom:10px;line-height:1.6">'+esc(m.desc)+'</div>':'')+
        (m.url?'<div class="tm-resource"><span style="font-size:18px">🔗</span><a href="'+esc(safeUrl(m.url))+'" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-size:13px;font-family:var(--mono)">Open resource →</a></div>':'')+
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">'+
          (tech?`<button class="btn ${completed?'bg':'ba'} bsm" onclick="markModuleComplete('${esc(tech.id)}','${esc(m.id)}')">${completed?'↺ Mark incomplete':'✓ Mark complete'}</button>`:'')+
          (isAdmin()?`<button class="btn br bsm" onclick="deleteTrainingModule('${esc(m.id)}')">Delete</button>`:'')+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

// ── CREW PROFILES ─────────────────────────────────────────
async function saveCert(){
  const techId=document.getElementById('cert-techId').value;
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  const name=(document.getElementById('cert-name').value||'').trim();
  if(!name){toast('Certification name required','error');return;}
  const certs=(t.certs||[]).concat([{
    id:'cert_'+Date.now(),
    name,
    issuer:(document.getElementById('cert-issuer').value||'').trim(),
    date:document.getElementById('cert-date').value||'',
    expiry:document.getElementById('cert-expiry').value||'',
    notes:(document.getElementById('cert-notes').value||'').trim()
  }]);
  const r=await techPatch(techId,{certs}); if(!r) return;
  closeM('addCert');openProfile(techId);
  toast('Certification added','success');
}
async function removeCert(techId,certId){
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  const r=await techPatch(techId,{certs:(t.certs||[]).filter(c=>c.id!==certId)}); if(!r) return;
  openProfile(techId);
}
function openProfile(techId){
  window._openProfileId=techId;
  renderProfiles();
  const detail=document.getElementById('profile-detail');
  if(detail)detail.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderProfiles(){
  if(!db.technicians)return;

  // Dept filter
  const filterWrap=document.getElementById('profiles-dept-filter');
  if(filterWrap&&!filterWrap.hasChildNodes()){
    filterWrap.innerHTML=deptFilterRow('profiles',(dept)=>{window._profilesDeptFilter=dept;renderProfiles();});
  }
  const dept=window._profilesDeptFilter||'all';
  const filtered=dept==='all'?db.technicians:db.technicians.filter(t=>t.dept===dept);

  // Grid of profile cards
  const grid=document.getElementById('profiles-grid');
  if(grid){
    grid.innerHTML=filtered.map(t=>{
      const completedCount=(t.completedModules||[]).length;
      const totalMods=(db.trainingModules||[]).length;
      const isActive=window._openProfileId===t.id;
      return`<div class="profile-card ${isActive?'selected':''}" onclick="openProfile('${esc(t.id)}')" style="cursor:pointer;${isActive?'border:2px solid #0F6E56;':''}">` +
        '<div class="profile-header">'+
          '<div class="profile-avatar" style="background:'+(_deptAvatarColor(t.dept))+';color:white">'+
            (t.avatar||t.name[0]||'👤')+
          '</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div class="fw7" style="font-size:15px;margin-bottom:4px">'+esc(t.name)+'</div>'+
            '<div class="dim">'+esc(t.role||'Technician')+'</div>'+
            '<div style="margin-top:6px">'+deptBadge(t.dept)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="profile-body">'+
          '<div style="display:flex;justify-content:center;margin-bottom:10px;text-align:center">'+
            '<div><div style="font-size:20px;font-weight:700;color:#534AB7">'+completedCount+(totalMods?'/'+totalMods:'')+'</div><div style="font-size:10px;font-family:var(--mono);color:var(--dim2)">MODULES</div></div>'+
          '</div>'+
          (t.training&&t.training.length?'<div style="display:flex;flex-wrap:wrap;gap:4px">'+t.training.map(s=>'<span class="skill-tag">'+s+'</span>').join('')+'</div>':'')+
          ((t.certs||[]).length?'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">'+t.certs.map(c=>'<span class="cert-tag">🏅 '+esc(c.name)+'</span>').join('')+'</div>':'')+
          `<button class="btn bb bsm" style="margin-top:10px;width:100%;justify-content:center" onclick="event.stopPropagation();openProfile('${esc(t.id)}')">View full profile →</button>`+
        '</div>'+
      '</div>';
    }).join('');
  }

  // Detailed profile panel
  const detail=document.getElementById('profile-detail');
  if(!detail)return;
  if(!window._openProfileId){detail.style.display='none';return;}
  const t=db.technicians.find(x=>x.id===window._openProfileId);
  if(!t){detail.style.display='none';return;}
  detail.style.display='';

  const completedMods=(t.completedModules||[]);
  const totalMods=(db.trainingModules||[]).length;
  const gearOuts=(db.checkouts||[]).filter(c=>c.personId===t.id);
  const maintDone=(db.maintLogs||[]).filter(l=>l.by===t.name).length;
  const volHours = t.volunteerHours||0;

  // Default onboarding steps
  const ONBOARD_STEPS = [
    {id:'intro',label:'Intro meeting with team lead'},
    {id:'app',label:'Logged into KCC Technical app'},
    {id:'shadow',label:'Shadowed a full service'},
    {id:'station',label:'Operated own station'},
    {id:'checklist',label:'Completed pre-show checklist solo'},
    {id:'training',label:'Completed at least 1 training module'},
  ];
  const onb = t.onboarding||{};
  const onbDone = ONBOARD_STEPS.filter(s=>onb[s.id]).length;
  const onbPct = Math.round(onbDone/ONBOARD_STEPS.length*100);

  detail.innerHTML='<div class="panel">'+
    '<div class="ph row jbet">'+
      '<div class="row gap12">'+
        '<div class="profile-avatar" style="background:'+_deptAvatarColor(t.dept)+';color:white;width:48px;height:48px;font-size:22px">'+( t.avatar||t.name[0])+'</div>'+
        '<div><div class="fw7" style="font-size:16px">'+esc(t.name)+'</div><div class="dim">'+esc(t.role||'Technician')+'</div><div style="margin-top:4px">'+deptBadge(t.dept)+'</div></div>'+
      '</div>'+
      '<div class="row gap6">'+
        `<button class="btn bg bsm" onclick="openLogHoursModal('${esc(t.id)}')">⏱ Log Hours</button>`+
        `<button class="btn bb bsm" data-perm="admin" onclick="openPerfNoteModal('${esc(t.id)}')">📝 Add Note</button>`+
        `<button class="btn ba bsm" onclick="document.getElementById('cert-techId').value='${t.id}';['cert-name','cert-issuer','cert-date','cert-expiry','cert-notes'].forEach(id=>document.getElementById(id).value='');openM('addCert')">+ Cert</button>`+
        `<button class="btn bgh bsm" data-perm="admin" onclick="editTech('${esc(t.id)}')">✏️ Edit</button>`+
        '<button class="btn bgh bsm" onclick="window._openProfileId=null;renderProfiles()">✕</button>'+
      '</div>'+
    '</div>'+
    '<div class="pb">'+

      // Stats row — now 5 stats including volunteer hours
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">'+
        '<div style="background:var(--s2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#534AB7">'+completedMods.length+(totalMods?'/'+totalMods:'')+'</div><div style="font-size:10px;font-family:var(--mono);color:var(--dim2)">MODULES</div></div>'+
        '<div style="background:var(--s2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#854F0B">'+gearOuts.length+'</div><div style="font-size:10px;font-family:var(--mono);color:var(--dim2)">GEAR OUTS</div></div>'+
        '<div style="background:var(--s2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:#0F6E56">'+volHours+'</div><div style="font-size:10px;font-family:var(--mono);color:var(--dim2)">VOL. HRS</div></div>'+
      '</div>'+

      // Contact info
      ((t.email||t.phone||t.emergency)?
        '<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px;display:flex;flex-direction:column;gap:6px">'+
          '<div style="font-size:10px;font-family:var(--mono);color:var(--dim2);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Contact</div>'+
          (t.email?'<div style="font-size:13px;display:flex;align-items:center;gap:8px"><span>📧</span><a href="mailto:'+esc(safeUrl('mailto:'+t.email).slice(7))+'" style="color:var(--blue);font-family:var(--mono);font-size:12px">'+t.email+'</a></div>':'')+
          (t.phone?'<div style="font-size:13px;display:flex;align-items:center;gap:8px"><span>📱</span><span style="font-family:var(--mono);font-size:12px">'+esc(t.phone)+'</span></div>':'')+
          (t.emergency?'<div style="font-size:13px;display:flex;align-items:center;gap:8px"><span>🆘</span><span style="font-family:var(--mono);font-size:12px;color:var(--amber)">'+esc(t.emergency)+'</span></div>':'')+
          (t.joinedAt?'<div style="font-size:11px;color:var(--dim2);font-family:var(--mono);margin-top:2px">Joined: '+new Date(t.joinedAt).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})+'</div>':'')+
        '</div>':'')+

      // Onboarding checklist
      '<div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2);margin-bottom:8px">Onboarding <span style="font-weight:400;text-transform:none;letter-spacing:0;font-family:var(--mono);font-size:10px;color:'+( onbPct===100?'var(--green)':'var(--amber)')+'">'+onbPct+'% complete</span></div>'+
      '<div style="height:4px;background:var(--border);border-radius:2px;margin-bottom:10px;overflow:hidden"><div style="height:100%;width:'+onbPct+'%;background:'+( onbPct===100?'var(--green)':'var(--amber)')+';border-radius:2px;transition:width .4s"></div></div>'+
      '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:14px">'+
        ONBOARD_STEPS.map(step=>{
          const done=!!onb[step.id];
          return'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:6px">'+
            `<button onclick="toggleOnboarding('${esc(t.id)}','${esc(step.id)}')" style="width:20px;height:20px;border-radius:50%;border:2px solid ${done?'#0F6E56':'var(--border2)'};background:${done?'#0F6E56':'transparent'};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;flex-shrink:0;cursor:pointer">${done?'✓':''}</button>`+
            '<div style="flex:1;font-size:13px;'+(done?'text-decoration:line-through;color:var(--dim2)':'')+'">'+esc(step.label)+'</div>'+
          '</div>';
        }).join('')+
      '</div>'+

      // Volunteer hours log
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
        '<div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2)">Volunteer Hours</div>'+
        `<button class="btn bg bsm" onclick="openLogHoursModal('${esc(t.id)}')">+ Log Hours</button>`+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--s2);border-radius:8px;margin-bottom:14px">'+
        '<div style="font-size:36px;font-weight:900;color:#0F6E56;font-family:var(--head)">'+volHours+'</div>'+
        '<div><div style="font-size:13px;font-weight:700">Hours volunteered</div>'+
          '<div class="dim" style="font-size:12px">'+(t.hoursLog&&t.hoursLog.length?'Last logged: '+new Date(t.hoursLog[t.hoursLog.length-1].date).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}):'No hours logged yet')+'</div>'+
        '</div>'+
      '</div>'+
      (t.hoursLog&&t.hoursLog.length?
        '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px;max-height:160px;overflow-y:auto">'+
          [...t.hoursLog].reverse().map(h=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--s2);border-radius:6px;font-size:12px">'+
            '<div><span style="font-weight:700;color:#0F6E56">+'+esc(h.hours)+'h</span>'+(h.note?' <span class="dim">'+esc(h.note)+'</span>':'')+'</div>'+
            '<div class="dim" style="font-family:var(--mono);font-size:10px">'+new Date(h.date).toLocaleDateString('en-CA',{month:'short',day:'numeric'})+'</div></div>'
          ).join('')+
        '</div>':'<div class="dim" style="margin-bottom:14px">No hours logged yet</div>')+

      // Performance notes (admin only)
      (isAdmin()?
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
          '<div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2)">Performance Notes</div>'+
          `<button class="btn bb bsm" onclick="openPerfNoteModal('${esc(t.id)}')">+ Add Note</button>`+
        '</div>'+
        ((t.perfNotes&&t.perfNotes.length)?
          '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">'+
            t.perfNotes.map(n=>{
              const colors={positive:'#0F6E56',constructive:'#854F0B',neutral:'#185FA5'};
              const bgs={positive:'#E1F5EE',constructive:'#fff3cd',neutral:'var(--bglow)'};
              return'<div style="padding:10px 12px;background:'+esc(bgs[n.type])+';border-radius:8px;border-left:3px solid '+(colors[n.type]||'var(--dim2)')+'">'+
                '<div style="font-size:13px;color:var(--text);line-height:1.5;margin-bottom:4px">'+esc(n.text)+'</div>'+
                '<div style="display:flex;align-items:center;justify-content:space-between">'+
                  '<div class="dim" style="font-size:11px;font-family:var(--mono)">'+esc(n.by)+' · '+fmtDate(n.at)+'</div>'+
                  `<button onclick="deletePerfNote('${esc(t.id)}','${esc(n.id)}')" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:12px">✕</button>`+
                '</div>'+
              '</div>';
            }).join('')+
          '</div>' :
          `<div class="dim" style="margin-bottom:14px;font-size:12px">No notes yet — <button onclick="openPerfNoteModal('${esc(t.id)}')" style="background:none;border:none;color:var(--blue);cursor:pointer;font-family:var(--mono);font-size:11px">add one</button></div>`
        ):'') +

      // Skills
      '<div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2);margin-bottom:8px">Skills</div>'+
      ((t.training&&t.training.length)?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">'+t.training.map(s=>'<span class="skill-tag">'+s+'</span>').join('')+'</div>':'<div class="dim" style="margin-bottom:14px">No skills tagged yet</div>')+

      // Certs
      '<div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2);margin-bottom:8px">Certifications</div>'+
      ((t.certs&&t.certs.length)?
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">'+
          t.certs.map(c=>
            '<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px">'+
              '<span style="font-size:20px">🏅</span>'+
              '<div style="flex:1"><div class="fw7" style="font-size:13px">'+esc(c.name)+'</div>'+
                (c.issuer?'<div class="dim">'+esc(c.issuer)+'</div>':'')+
                (c.date?'<div class="dim">Earned: '+c.date+(c.expiry?' · Expires: '+c.expiry:'')+'</div>':'')+
              '</div>'+
              `<button onclick="removeCert('${esc(t.id)}','${esc(c.id)}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px" title="Remove">✕</button>`+
            '</div>'
          ).join('')+
        '</div>':
        `<div class="dim" style="margin-bottom:14px">No certifications yet — <button onclick="document.getElementById('cert-techId').value='${t.id}';openM('addCert')" style="background:none;border:none;color:var(--blue);cursor:pointer;font-family:var(--mono);font-size:11px">add one</button></div>`)+''

      // Training progress
      '<div class="fw7" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--dim2);margin-bottom:8px">Training progress</div>'+
      (totalMods?
        '<div style="display:flex;flex-direction:column;gap:6px">'+
          (db.trainingModules||[]).map(m=>{
            const done=completedMods.includes(m.id);
            return'<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:6px">'+
              '<div style="width:18px;height:18px;border-radius:50%;border:2px solid '+(done?'#0F6E56':'var(--border2)')+';background:'+(done?'#0F6E56':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:11px;color:white;flex-shrink:0">'+(done?'✓':'')+'</div>'+
              '<div style="flex:1;font-size:13px;'+(done?'text-decoration:line-through;color:var(--dim2)':'')+'">'+esc(m.title)+'</div>'+
              (m.dept?deptBadge(m.dept):'')+
            '</div>';
          }).join('')+
        '</div>':
        '<div class="dim">No training modules added yet</div>')+

    '</div>'+
  '</div>';
  applyPermissions();
}async function toggleOnboarding(techId, stepId){
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  const onb=Object.assign({},t.onboarding||{}); onb[stepId]=!onb[stepId];
  const r=await techPatch(techId,{onboarding:onb}); if(!r) return;
  openProfile(techId);
}

function openLogHoursModal(techId){
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  document.getElementById('lh-techId').value=techId;
  document.getElementById('lh-techName').textContent=t.name;
  document.getElementById('lh-hours').value='';
  document.getElementById('lh-note').value='';
  document.getElementById('lh-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('m-logHours').style.display='flex';
}

async function saveLogHours(){
  const techId=document.getElementById('lh-techId').value;
  const t=db.technicians.find(x=>x.id===techId);if(!t)return;
  const hrs=parseFloat(document.getElementById('lh-hours').value);
  if(!hrs||hrs<=0){toast('Enter valid hours','error');return;}
  const note=(document.getElementById('lh-note').value||'').trim();
  const dateVal=document.getElementById('lh-date').value;
  const date=dateVal?new Date(dateVal+'T12:00:00').getTime():Date.now();
  const hoursLog=(t.hoursLog||[]).concat([{hours:hrs,note,date,loggedBy:getCurTech()?.name||'Admin',loggedAt:Date.now()}]);
  const r=await techPatch(techId,{hoursLog,volunteerHours:(t.volunteerHours||0)+hrs}); if(!r) return;
  document.getElementById('m-logHours').style.display='none';
  openProfile(techId);
  toast('+'+hrs+'h logged for '+t.name,'success');
}

function _deptAvatarColor(dept){
  return {Lighting:'#0F6E56',Audio:'#185FA5',Cameras:'#854F0B',IT:'#5F5E5A'}[dept]||'#888780';
}



// ── Dark mode ──────────────────────────────
// ── First-run bootstrap ───────────────────────────────────
function openFirstRunSetup(){
  ['fr-name','fr-email','fr-role','fr-pw','fr-pw2'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const av=document.getElementById('fr-avatar');if(av)av.value='👑';
  openM('firstRun');
}
async function saveFirstRun(){
  const name=(document.getElementById('fr-name').value||'').trim();
  const pw=document.getElementById('fr-pw').value;
  const pw2=document.getElementById('fr-pw2').value;
  if(!name){toast('Name required','error');return;}
  if(!pw){toast('Password required','error');return;}
  if(pw.length<8){toast('Password must be at least 8 characters','error');return;}
  if(pw!==pw2){toast('Passwords do not match','error');return;}
  if(!window._kccBootstrap){toast('This needs the cloud connection','error');return;}
  let r;
  try{
    r=await window._kccBootstrap({name,password:pw,
      role:(document.getElementById('fr-role').value||'Technical Director').trim(),
      avatar:(document.getElementById('fr-avatar').value||'👑').trim(),
      email:(document.getElementById('fr-email').value||'').trim()});
  }catch(e){ toast(srvErr(e),'error'); return; }
  closeM('firstRun');
  lsLogin(r.id);
  toast('Welcome '+name+'! You are now the Master Admin.','success');
}


// ── ITEM DETAIL: checkout + maintenance + history for one piece of gear ──
const gdEsc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openGearDetail(id){
  const g=(db.gearItems||[]).find(x=>x.id===id); if(!g) return;
  window._gdId=id; renderGearDetail(); openM('gearDetail');
}
function renderGearDetail(){
  const g=(db.gearItems||[]).find(x=>x.id===window._gdId); if(!g){closeM('gearDetail');return;}
  const co=activeCheckout(g.id), ms=maintStatus(g);
  const who=co?(db.technicians||[]).find(x=>x.id===co.personId):null;
  const logs=(db.maintLogs||[]).filter(l=>l.gearId===g.id).map(l=>({t:l.date,k:'service',l}));
  const outs=(db.checkouts||[]).filter(c=>c.gearId===g.id).map(c=>({t:c.checkedOutAt,k:'out',c}));
  const hist=logs.concat(outs).sort((a,b)=>b.t-a.t).slice(0,30);
  const row=h=>{
    if(h.k==='service') return '<div class="gd-row"><span class="gd-d">'+fmtDateShort(h.t)+'</span><span><b>Service</b> · '+gdEsc(h.l.type||'Check')+(h.l.by?' · '+gdEsc(h.l.by):'')+(h.l.notes?'<br><span class="dim">'+gdEsc(h.l.notes)+'</span>':'')+'</span></div>';
    const p=(db.technicians||[]).find(x=>x.id===h.c.personId);
    return '<div class="gd-row"><span class="gd-d">'+fmtDateShort(h.t)+'</span><span><b>'+(h.c.returnedAt?'Out and returned':'Checked out')+'</b> · '+gdEsc(p?p.name:'—')+(h.c.returnedAt?' · back '+fmtDateShort(h.c.returnedAt)+(h.c.returnCondition?' ('+gdEsc(h.c.returnCondition)+')':''):'')+(h.c.purpose?'<br><span class="dim">'+gdEsc(h.c.purpose)+'</span>':'')+'</span></div>';
  };
  document.getElementById('gd-title').innerHTML=gdEsc(g.name)+(g.assetId?' <span class="badge blow" style="font-size:10px">'+gdEsc(g.assetId)+'</span>':'');
  document.getElementById('gd-body').innerHTML=
    '<div class="gd-sec"><div class="gd-k">Checkout</div>'+
      (co?'<div><b>'+(isOverdue(co)?'Overdue — ':'Out — ')+'</b>with '+gdEsc(who?who.name:'unknown')+(co.dueDate?', due '+fmtDate(co.dueDate):'')+'</div>':'<div>Available</div>')+
    '</div>'+
    '<div class="gd-sec"><div class="gd-k">Maintenance</div><div style="color:'+ms.color+';font-weight:600">'+esc(ms.label)+'</div>'+
      '<div class="dim">Every '+(g.serviceInterval||90)+' days'+(g.hoursUsed?' · '+esc(g.hoursUsed)+'h used'+(g.expectedLifeHours?' of '+esc(g.expectedLifeHours)+'h':''):'')+'</div></div>'+
    '<div class="gd-acts">'+
      (co?`<button class="btn bb" onclick="closeM('gearDetail');openReturnModal('${esc(co.id)}')">Return</button>`
         :`<button class="btn bg" onclick="gdCheckout()">Check out</button>`)+
      `<button class="btn bgh" data-perm="admin" onclick="gdLogService()">Log service</button>`+
      `<button class="btn bgh" onclick="closeM('gearDetail');openLogGearHours('${esc(g.id)}')">Log hours</button>`+
      `<button class="btn br" onclick="closeM('gearDetail');openIncidentReport('${esc(g.id)}')">Report problem</button>`+
    '</div>'+
    '<div class="gd-k" style="margin-top:14px">History</div>'+
    (hist.length?hist.map(row).join(''):'<p class="dim">Nothing logged yet.</p>');
  if(typeof applyPermissions==='function') applyPermissions();
}
function gdCheckout(){
  const id=window._gdId; closeM('gearDetail');
  _populateGearSelect('co-item',true); document.getElementById('co-item').value=id;
  _populatePersonSelect('co-person');
  const t=new Date();t.setDate(t.getDate()+7);document.getElementById('co-due').value=t.toISOString().slice(0,10);
  openM('checkoutGear');
}
function gdLogService(){
  const id=window._gdId; closeM('gearDetail'); openM_addMaintEntry(); document.getElementById('me-item').value=id;
}
