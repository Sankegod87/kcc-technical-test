// ── Modals ──
function openM(id){
  const _mEl=document.getElementById('m-'+id);if(!_mEl){console.warn('openM: no modal for',id);return;}_mEl.style.display='flex';
  if(id==='whoAmI'){document.getElementById('whoStep1').style.display='';document.getElementById('whoStep2').style.display='none';_whoSelectedId=null;buildWhoGrid();}
  if(id==='reportOutage')buildTechGrid('outTechG','outage');
  if(id==='markReplaced')buildTechGrid('repTechG','replace');
  if(id==='receiveBulbs')buildTechGrid('recvTechG','recv');
  if(id==='addTech')renderTrainingGrids();
  if(id==='editTech')renderTrainingGrids();
  if(id==='editChecklist'){const sel=document.getElementById('clStationSel');if(sel){const roles=getScheduleRoles().map(r=>r.name);sel.innerHTML=roles.map(r=>`<option value="${r}">${r}</option>`).join('');renderChecklistEditor();}}
}
function closeM(id){const _cmEl=document.getElementById('m-'+id);if(_cmEl)_cmEl.style.display='none';if(id==='markReplaced')stopRepCamera&&stopRepCamera();}
function mOut(e,id){if(e.target===document.getElementById('m-'+id))closeM(id);}
function closeAllM(){['whoAmI','addTech','editTech','addFixture','editFixture','viewFixture','reportOutage','markReplaced','receiveBulbs','changeMyPw','globalScan','addUsedBulb','editSchedule','editInv','addShow','editChecklist','addGearItem','editGearItem','checkoutGear','returnGear','addMaintEntry','addRequest','editRequest','addAnnouncement','addTrainingModule','addCert','vendorForm'].forEach(id=>{const el=document.getElementById('m-'+id);if(el)el.style.display='none';});}
function buildWhoGrid(){
  const el=document.getElementById('whoGrid');
  if(!db.technicians.length){el.innerHTML='<p class="dim">No technicians yet.</p>';return;}
  const activeTechs=db.technicians.filter(isTechActive);
  if(!activeTechs.length){el.innerHTML='<p class="dim">No active technicians.</p>';return;}
  el.innerHTML=activeTechs.map(t=>`<div class="tpb ${t.id===_techId?'sel':''}" onclick="whoSelectTech('${esc(t.id)}')"><div class="tav">${esc(t.avatar||'👤')}</div><div>${esc(t.name.split(' ')[0])}</div></div>`).join('');
}
let _whoSelectedId=null;
function whoSelectTech(id){
  const t=(typeof _rosterList==='function'&&_rosterList()||[]).find(x=>x.id===id);if(!t)return;
  if(t.active===false){ toast('This account is inactive','error'); return; }
  if(!t.pw){ toast('No password set yet — ask an admin to set one','info'); return; }
  _whoSelectedId=id;
  document.getElementById('whoStep1').style.display='none';
  document.getElementById('whoStep2').style.display='';
  document.getElementById('whoLoginAv').textContent=t.avatar||'👤';
  document.getElementById('whoLoginName').textContent=t.name;
  document.getElementById('whoLoginRole').textContent=t.dept||'Crew';
  document.getElementById('whoPassword').value='';
  document.getElementById('whoLoginErr').style.display='none';
  setTimeout(()=>document.getElementById('whoPassword').focus(),100);
}
function whoBack(){
  document.getElementById('whoStep1').style.display='';
  document.getElementById('whoStep2').style.display='none';
  _whoSelectedId=null;
}
// Switching person = a fresh sign-in on the server, then a clean page load so nothing from the last person is left over.
async function submitLogin(){
  const id=_whoSelectedId;if(!id)return;
  const pw=document.getElementById('whoPassword').value;
  const err=document.getElementById('whoLoginErr');
  try{
    await window._kccLogin(id,pw);
    try{localStorage.setItem(TECH_KEY,id);}catch(e){}
    location.reload();
  }catch(e){
    const c=String((e&&e.code)||'').replace('functions/','');
    err.textContent=c==='permission-denied'?'❌ Incorrect password':'❌ '+srvErr(e);
    err.style.display='';
    document.getElementById('whoPassword').value='';
    document.getElementById('whoPassword').focus();
  }
}
function whoForgot(){
  closeM('whoAmI');
  toast('Ask the admin to reset your password on the Crew page','info');
}

// Salted SHA-256, used for the device PIN (kept on this device only). Account passwords are checked on the server.
const _PW_PEPPER='kcc-technical|2027|';
function _sha256(s){
  const K=[];let p=2;while(K.length<64){let ok=1;for(let d=2;d*d<=p;d++)if(p%d==0){ok=0;break;}if(ok)K.push((Math.pow(p,1/3)%1)*4294967296|0);p++;}
  let H=[],q=2;while(H.length<8){let ok=1;for(let d=2;d*d<=q;d++)if(q%d==0){ok=0;break;}if(ok)H.push((Math.pow(q,.5)%1)*4294967296|0);q++;}
  const b=unescape(encodeURIComponent(s)),l=b.length,w=new Array((((l+8)>>6)+1)*16).fill(0);
  for(let i=0;i<l;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);
  w[l>>2]|=0x80<<(24-(l%4)*8);w[(((l+8)>>6)<<4)+15]=l*8;
  const r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let o=0;o<w.length;o+=16){const m=w.slice(o,o+16),a=H.slice();
    for(let i=0;i<64;i++){if(i>=16){const s0=r(m[i-15],7)^r(m[i-15],18)^(m[i-15]>>>3),s1=r(m[i-2],17)^r(m[i-2],19)^(m[i-2]>>>10);m[i]=(m[i-16]+s0+m[i-7]+s1)|0;}
      const S1=r(a[4],6)^r(a[4],11)^r(a[4],25),ch=(a[4]&a[5])^(~a[4]&a[6]),t1=(a[7]+S1+ch+K[i]+m[i])|0,
      S0=r(a[0],2)^r(a[0],13)^r(a[0],22),mj=(a[0]&a[1])^(a[0]&a[2])^(a[1]&a[2]),t2=(S0+mj)|0;
      a[7]=a[6];a[6]=a[5];a[5]=a[4];a[4]=(a[3]+t1)|0;a[3]=a[2];a[2]=a[1];a[1]=a[0];a[0]=(t1+t2)|0;}
    for(let i=0;i<8;i++)H[i]=(H[i]+a[i])|0;}
  return H.map(x=>('00000000'+(x>>>0).toString(16)).slice(-8)).join('');
}
function _legacyHash(str){let h=0;for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;}return h.toString(36);}
function simpleHash(str){ return 's2:'+_sha256(_PW_PEPPER+str); }

// ── Stage 2: Department helpers ──
const DEPT_COLORS = {
  Lighting:{color:'#0F6E56',bg:'#E1F5EE',border:'#9FE1CB'},
  Audio:   {color:'#185FA5',bg:'#E6F1FB',border:'#B5D4F4'},
  Cameras: {color:'#854F0B',bg:'#FAEEDA',border:'#FAC775'},
  IT:      {color:'#5F5E5A',bg:'#F1EFE8',border:'#D3D1C7'},
};
const DEPT_ICONS = {Lighting:'💡',Audio:'🎚️',Cameras:'📷',IT:'💻'};
function deptBadge(dept){
  if(!dept)return'';
  const d=DEPT_COLORS[dept]||{color:'#888',bg:'#f0f0f0',border:'#ccc'};
  return`<span class="dept-badge" style="color:${d.color};background:${esc(d.bg)};border-color:${esc(d.border)}">${DEPT_ICONS[dept]||''} ${dept}</span>`;
}
function deptFilterRow(containerId, onFilter){
  const depts=['all','Lighting','Audio','Cameras','IT'];
  return`<div class="dept-filter-row" id="deptFilter-${containerId}">
    ${depts.map(d=>`<button class="dept-filter-btn ${d==='all'?'active':''}" data-dept="${d}" onclick="setDeptFilter('${containerId}','${d}',this,${onFilter})">${d==='all'?'All depts':(DEPT_ICONS[d]||'')+' '+d}</button>`).join('')}
  </div>`;
}
function setDeptFilter(containerId, dept, btn, cb){
  document.querySelectorAll(`#deptFilter-${containerId} .dept-filter-btn`).forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(typeof cb==='function') cb(dept);
}
window._crewDeptFilter='all';
window._schedDeptFilter='all';

async function addTech(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const name=document.getElementById('tn').value.trim();
  const role=document.getElementById('tr').value.trim();
  const av=document.getElementById('ta').value.trim()||'👤';
  const email=document.getElementById('tem').value.trim();
  const pw=document.getElementById('tpw').value;
  const pw2=document.getElementById('tpw2').value;
  if(!name){toast('Name required','error');return;}
  if(!pw){toast('Password is required','error');return;}
  if(pw.length<8){toast('Password must be at least 8 characters','error');return;}
  if(pw!==pw2){toast('Passwords do not match','error');return;}
  const fields={name,role,dept:document.getElementById('tdept').value||'',avatar:av,email,phone:document.getElementById('tphone').value.trim(),emergency:document.getElementById('temergency').value.trim(),canSchedule:document.getElementById('tcanschedule').checked,userRole:document.getElementById('tuserrole').value,notes:document.getElementById('tnotes').value.trim(),training:getSelectedTraining('t')};
  const r=await techCall({op:'add',fields,password:pw});
  if(!r) return;
  const newTech=db.technicians.find(x=>x.id===r.id)||Object.assign({id:r.id},fields);
  logAudit('Crew Added', newTech.name+' ('+(newTech.role||'')+')');
  save();closeM('addTech');renderCrew();
  ['tn','tr','ta','tem','tphone','temergency','tpw','tpw2'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('tcanschedule').checked=false;
  document.getElementById('tuserrole').value='user';
  document.getElementById('tdept').value='';
  document.getElementById('tnotes').value='';
  toast(name+' added to crew','success');
  sendWelcomeEmail(newTech, pw);
}
function editTech(id){
  const t=db.technicians.find(x=>x.id===id);if(!t)return;
  document.getElementById('etech-id').value=t.id;
  document.getElementById('etn').value=t.name;
  document.getElementById('etr').value=t.role||'';
  document.getElementById('eta').value=t.avatar||'👤';
  document.getElementById('etem').value=t.email||'';
  document.getElementById('etphone').value=t.phone||'';
  document.getElementById('etemergency').value=t.emergency||'';
  document.getElementById('etcanschedule').checked=t.canSchedule||false;
  document.getElementById('etuserrole').value=t.userRole||'user';
  document.getElementById('etnotes').value=t.notes||'';
  document.getElementById('etdept').value=t.dept||'';
  openM('editTech');
}
async function saveTechEdit(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const id=document.getElementById('etech-id').value;
  const t=db.technicians.find(x=>x.id===id);if(!t)return;
  if(!canManageTech(t)){toast('Only the master admin can edit the master admin','error');return;}
  const newPw=document.getElementById('etpw').value;
  const newPw2=document.getElementById('etpw2').value;
  if(newPw){
    if(newPw.length<8){toast('Password must be at least 8 characters','error');return;}
    if(newPw!==newPw2){toast('Passwords do not match','error');return;}
  }
  const fields={
    name:document.getElementById('etn').value.trim()||t.name,
    role:document.getElementById('etr').value.trim(),
    avatar:document.getElementById('eta').value.trim()||'👤',
    email:document.getElementById('etem').value.trim(),
    phone:document.getElementById('etphone').value.trim(),
    emergency:document.getElementById('etemergency').value.trim(),
    canSchedule:document.getElementById('etcanschedule').checked,
    notes:document.getElementById('etnotes').value.trim(),
    dept:document.getElementById('etdept').value||'',
    training:getSelectedTraining('et')
  };
  if(t.userRole!=='master') fields.userRole=document.getElementById('etuserrole').value;
  const payload={op:'edit',id,fields}; if(newPw) payload.password=newPw;
  const r=await techCall(payload); if(!r) return;
  ['etpw','etpw2'].forEach(i=>document.getElementById(i).value='');
  if(newPw) toast('Password updated for '+fields.name,'success');
  closeM('editTech');renderCrew();updTechUI();applyPermissions();toast('Technician updated','success');
}
async function changeMyPassword(){
  const t=getCurTech();if(!t){toast('Not logged in','error');return;}
  const cur=document.getElementById('cmpCur').value;
  const nw=document.getElementById('cmpNew').value;
  const nw2=document.getElementById('cmpNew2').value;
  const errEl=document.getElementById('cmpErr');
  errEl.style.display='none';
  const bad=m=>{errEl.textContent='❌ '+m;errEl.style.display='';};
  if(!nw){bad('New password cannot be empty');return;}
  if(nw.length<8){bad('New password must be at least 8 characters');return;}
  if(nw!==nw2){bad('Passwords do not match');return;}
  if(!needCloud()) return;
  try{ await window._kccTechOp({op:'setPassword',current:cur,password:nw}); }
  catch(e){ bad(srvErr(e)); return; }
  closeM('changeMyPw');
  ['cmpCur','cmpNew','cmpNew2'].forEach(id=>document.getElementById(id).value='');
  toast('Password updated successfully!','success');
}

// Only the master admin can reset, edit, deactivate or remove the master admin's account.
function canManageTech(t){ return !!t && (isMaster() || t.userRole!=='master'); }
function adminResetPassword(id){
  const t=db.technicians.find(x=>x.id===id);if(!t)return;
  if(!canManageTech(t)){toast('Only the master admin can do that','error');return;}
  requirePin(async()=>{
    const newPw=prompt('Set new password for '+t.name+' (at least 8 characters):');
    if(!newPw){toast('Cancelled','info');return;}
    if(newPw.length<8){toast('Password must be at least 8 characters','error');return;}
    const confirm=prompt('Confirm new password:');
    if(newPw!==confirm){toast('Passwords do not match','error');return;}
    const r=await techCall({op:'setPassword',id,password:newPw});
    if(r){renderCrew();toast('Password reset for '+t.name+'. They will need to sign in again.','success');}
  });
}
async function removeTech(id){
  if(!canManageTech(db.technicians.find(x=>x.id===id))){toast('Only the master admin can do that','error');return;}
  if(!confirm('Remove this technician?'))return;
  const r=await techCall({op:'remove',id}); if(!r) return;
  if(_techId===id){ lsLogout(); return; }
  renderCrew();
}
function editFixture(id){
  const f=db.fixtures.find(x=>x.id===id);if(!f)return;
  document.getElementById('efix-id').value=f.id;
  document.getElementById('efid').value=f.id;
  document.getElementById('efna').value=f.name||'';
  document.getElementById('eflo').value=f.location||'';
  document.getElementById('efbu').value=f.bulbType||'';
  document.getElementById('efcat').value=f.category||'other';
  document.getElementById('efmaint').value=f.maintInterval||'';
  document.getElementById('efnotes').value=f.notes||'';
  _populateVendorSelect('efvendor',f.vendorId||'');
  openM('editFixture');
}
function saveFixtureEdit(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const id=document.getElementById('efix-id').value;
  const f=db.fixtures.find(x=>x.id===id);if(!f)return;
  f.name=document.getElementById('efna').value.trim()||f.name;
  f.location=document.getElementById('eflo').value.trim();
  f.bulbType=document.getElementById('efbu').value.trim()||f.bulbType;
  f.category=document.getElementById('efcat').value;
  f.maintInterval=parseInt(document.getElementById('efmaint').value)||null;
  f.notes=document.getElementById('efnotes').value.trim();
  f.vendorId=document.getElementById('efvendor').value||'';
  save();closeM('editFixture');renderFix();toast('Fixture '+f.id+' updated','success');
}

function addFixture(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const id=document.getElementById('fid').value.trim().toUpperCase();
  const nam=document.getElementById('fna').value.trim();
  const loc=document.getElementById('flo').value.trim();
  const bul=document.getElementById('fbu').value.trim();
  const cat=document.getElementById('fcat').value;
  const maint=parseInt(document.getElementById('fmaint').value)||null;
  const notes=document.getElementById('fnotes').value.trim();
  const vendorId=document.getElementById('fvendor').value||'';
  if(!id||!bul){toast('Fixture ID and Bulb Type required','error');return;}
  if(db.fixtures.find(f=>f.id===id)){toast('Fixture ID already exists','error');return;}
  db.fixtures.push({id,name:nam||id,location:loc,bulbType:bul,category:cat,maintInterval:maint,notes,vendorId,status:'ok',outageCount:0,addedAt:Date.now()});
  save();closeM('addFixture');renderFix();toast('Fixture '+id+' added','success');
}
function openOutModal(fid){
  const f=db.fixtures.find(x=>x.id===fid);if(!f)return;
  _curFix=fid;_selTech['outage']=_techId||null;
  document.getElementById('outTitle').textContent='🔴 Report Outage — '+f.id;
  document.getElementById('outInfo').innerHTML=`<div class="fw7" style="font-size:14px;margin-bottom:3px">${esc(f.name)}</div><div class="dim">${esc(f.location)} · ${esc(f.bulbType)}</div>`;
  document.getElementById('onotes').value='';
  const _opi=document.getElementById('outPhotoInput');if(_opi)_opi.value='';
  const _opp=document.getElementById('outPhotoPreview');if(_opp){_opp.innerHTML='';_opp.dataset.photo='';}
  openM('reportOutage');
}
function openRepModal(fid){
  const f=db.fixtures.find(x=>x.id===fid);if(!f)return;
  _curFix=fid;_selTech['replace']=_techId||null;
  document.getElementById('repInfo').innerHTML=`
    <div class="fw7" style="font-size:14px;margin-bottom:3px">${esc(f.name)}</div>
    <div class="dim">${esc(f.location)}</div>
    <div style="margin-top:6px;font-family:var(--mono);font-size:11px">
      Required bulb: <strong style="color:var(--amber)">${esc(f.bulbType)}</strong>
      ${(()=>{const inv=db.inventory.find(i=>i.bulbType===f.bulbType);return inv?`<span style="margin-left:10px;color:${inv.inStock>0?'var(--green)':'var(--red)'}">${esc(inv.inStock)} in stock</span>`:'<span style="color:var(--red);margin-left:10px">Not in inventory</span>';})()}
    </div>`;
  document.getElementById('rnotes').value='';
  document.getElementById('rbulbid').value='';
  document.getElementById('rbulbcond').value='new';
  document.getElementById('repMatchBanner').style.display='none';
  stopRepCamera();
  openM('markReplaced');
}
function closeRepModal(){
  stopRepCamera();
  closeM('markReplaced');
}
// ── Photo attachment helper (resize+compress client-side to keep Firestore doc small) ──
function _compressImageToDataURL(fileInputId,maxDim,quality,cb){
  const inp=document.getElementById(fileInputId);
  const file=inp&&inp.files&&inp.files[0];
  if(!file){cb(null);return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const img=new Image();
    img.onload=function(){
      let w=img.width,h=img.height;
      if(w>h&&w>maxDim){h=Math.round(h*(maxDim/w));w=maxDim;}
      else if(h>maxDim){w=Math.round(w*(maxDim/h));h=maxDim;}
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      cb(canvas.toDataURL('image/jpeg',quality||0.6));
    };
    img.onerror=function(){cb(null);};
    img.src=e.target.result;
  };
  reader.onerror=function(){cb(null);};
  reader.readAsDataURL(file);
}
function _photoPreview(fileInputId,previewId,maxDim,quality){
  _compressImageToDataURL(fileInputId,maxDim||900,quality||0.6,function(dataUrl){
    const p=document.getElementById(previewId);
    if(!p)return;
    if(dataUrl){p.innerHTML='<img src="'+esc(safeImg(dataUrl))+'" style="max-width:100%;max-height:160px;border-radius:6px;border:1px solid var(--border)">';p.dataset.photo=dataUrl;}
    else{p.innerHTML='';p.dataset.photo='';}
  });
}
function viewPhotoLightbox(src){
  src=safeImg(src); if(!src)return;
  const w=window.open('','_blank');
  if(w){w.document.write('<title>Photo</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="'+esc(src)+'" style="max-width:100%;max-height:100vh"></body>');}
}
function submitOutage(){
  const f=db.fixtures.find(x=>x.id===_curFix);if(!f)return;
  const t=getTech('outage');if(!t){toast('Select a technician first','error');return;}
  const _outPhoto=(document.getElementById('outPhotoPreview')||{}).dataset?.photo||'';
  db.outages.push({id:'OUT-'+Date.now(),fixtureId:f.id,fixtureName:f.name,bulbType:f.bulbType,reportedBy:t.name,techId:t.id,notes:document.getElementById('onotes').value.trim(),timestamp:Date.now(),resolved:false,photo:_outPhoto||null});
  f.status='out';f.outageCount=(f.outageCount||0)+1;
  f.currentBulbId=null;f.currentBulbType=null;
  // Send outage alert email + push notification
  sendOutageAlerts(f.name,f.id,f.bulbType,t.name);
  sendNotif('🔴 Fixture Out: '+f.name,'Reported by '+t.name+' — '+f.id);
  // Handle bulb status based on technician's manual selection
  const bulbStatus=document.getElementById('oBulbStatus')?.value||'unknown';
  const installedReg=db.bulbRegistry.find(b=>b.installedIn===f.id&&b.status==='installed');

  if(bulbStatus==='blown'){
    // Mark registry as blown/disposed
    if(installedReg){
      installedReg.history.push({event:'blown',fixture:f.id,fixtureName:f.name,tech:t.name,timestamp:Date.now()});
      installedReg.status='disposed';
      installedReg.installedIn=null;
    }
    db.usedBulbs.push({id:'UB-'+Date.now(),bulbId:installedReg?installedReg.bulbId:'',bulbType:f.bulbType,pulledFrom:f.id,fixtureName:f.name,datePulled:Date.now(),condition:'blown',status:'disposed',notes:'Confirmed blown — reported by '+t.name,autoLogged:true});
  } else if(bulbStatus==='pulled_good'){
    // Mark as pulled — available for reuse
    if(installedReg){
      installedReg.history.push({event:'pulled',fixture:f.id,fixtureName:f.name,tech:t.name,timestamp:Date.now()});
      installedReg.status='pulled';
      installedReg.installedIn=null;
    }
    db.usedBulbs.push({id:'UB-'+Date.now(),bulbId:installedReg?installedReg.bulbId:'',bulbType:f.bulbType,pulledFrom:f.id,fixtureName:f.name,datePulled:Date.now(),condition:'new',status:'available',notes:'Pulled — condition good — reported by '+t.name,autoLogged:true});
  } else if(bulbStatus==='still_in'){
    // Bulb still in fixture — don't mark registry, just note it
    if(installedReg){
      installedReg.history.push({event:'fault_reported',fixture:f.id,fixtureName:f.name,tech:t.name,timestamp:Date.now()});
    }
    db.usedBulbs.push({id:'UB-'+Date.now(),bulbId:installedReg?installedReg.bulbId:'',bulbType:f.bulbType,pulledFrom:f.id,fixtureName:f.name,datePulled:Date.now(),condition:'new',status:'available',notes:'Still in fixture — check needed — reported by '+t.name,autoLogged:true});
  } else {
    // Unknown — log but don't change registry
    db.usedBulbs.push({id:'UB-'+Date.now(),bulbId:'',bulbType:f.bulbType,pulledFrom:f.id,fixtureName:f.name,datePulled:Date.now(),condition:'new',status:'available',notes:'Bulb status unknown — reported by '+t.name,autoLogged:true});
  }
  save();closeM('reportOutage');toast('Outage reported for '+f.id,'error');refreshPage();
}
// ── In-modal replacement camera ──
let _repCamScanner=null, _repCamRunning=false;

function toggleRepCamera(){
  _repCamRunning?stopRepCamera():startRepCamera();
}
function startRepCamera(){
  const wrap=document.getElementById('repScannerWrap');
  const btn=document.getElementById('repCamBtn');
  wrap.style.display='';
  btn.textContent='⏹ Stop';
  _repCamScanner=new Html5Qrcode('rep-qr-reader');
  _repCamRunning=true;
  _repCamScanner.start(
    {facingMode:'environment'},
    {fps:10,qrbox:{width:220,height:220}},
    code=>{
      stopRepCamera();
      document.getElementById('rbulbid').value=code.toUpperCase();
      onBulbIdInput(code.toUpperCase());
    },
    ()=>{}
  ).catch(err=>{toast('Camera error: '+err,'error');stopRepCamera();});
}
function stopRepCamera(){
  if(_repCamScanner&&_repCamRunning){
    _repCamScanner.stop().catch(()=>{});
    _repCamRunning=false;_repCamScanner=null;
  }
  const wrap=document.getElementById('repScannerWrap');
  if(wrap){wrap.style.display='none';const el=document.getElementById('rep-qr-reader');if(el)el.innerHTML='';}
  const btn=document.getElementById('repCamBtn');
  if(btn)btn.textContent='📷 Scan';
}

// Called whenever bulb ID field changes (scan or manual)
function onBulbIdInput(code){
  const banner=document.getElementById('repMatchBanner');
  if(!code){banner.style.display='none';return;}
  const f=db.fixtures.find(x=>x.id===_curFix);
  if(!f)return;

  // ── STEP 0: Check bulb registry — is this label known? Is it already installed? ──
  const reg=db.bulbRegistry.find(b=>b.bulbId===code);
  if(reg){
    if(reg.status==='installed'){
      // BLOCK — this exact bulb is currently installed in another fixture
      const installedFix=db.fixtures.find(x=>x.id===reg.installedIn);
      const fixName=installedFix?installedFix.name:reg.installedIn;
      banner.style.display='';
      banner.style.background='var(--rglow)';
      banner.style.border='1px solid rgba(224,60,60,.5)';
      banner.innerHTML=`
        <div style="color:var(--red);font-size:15px;font-weight:900">🚫 HARD BLOCK — Bulb Currently In Use!</div>
        <div style="margin-top:8px;background:rgba(224,60,60,.1);border-radius:6px;padding:10px">
          <div style="font-family:var(--mono);font-size:11px;color:var(--text)">Bulb <strong>${code}</strong> is currently installed in:</div>
          <div style="font-size:16px;font-weight:700;color:var(--red);margin-top:4px">${fixName} (${esc(reg.installedIn)})</div>
          <div class="dim" style="margin-top:2px">Installed ${reg.installedAt?ago(reg.installedAt):'unknown'} by ${esc(reg.installedBy||'unknown')}</div>
        </div>
        <div style="font-size:12px;color:var(--red);margin-top:10px;font-weight:700">❌ This bulb is in use. Scan a different bulb.</div>
        <button class="btn bgh bsm" style="margin-top:8px" onclick="document.getElementById('rbulbid').value='';onBulbIdInput('')">✕ Scan Different Bulb</button>`;
      document.getElementById('rbulbcond').value='new';
      document.getElementById('rdeduct').checked=false;
      return;
    }
    if(reg.status==='disposed'){
      banner.style.display='';
      banner.style.background='var(--rglow)';
      banner.style.border='1px solid rgba(224,60,60,.4)';
      banner.innerHTML=`<div style="color:var(--red);font-size:15px;font-weight:900">🚫 HARD BLOCK — Bulb Disposed</div>
        <div style="margin-top:8px;background:rgba(224,60,60,.1);border-radius:6px;padding:10px">
          <div class="dim">Bulb <strong>${code}</strong> (${esc(reg.bulbType)}) has been disposed of.</div>
        </div>
        <div style="font-size:12px;color:var(--red);margin-top:10px;font-weight:700">❌ This bulb cannot be used. Scan a different bulb.</div>`;
      document.getElementById('rbulbcond').value='blown';
      document.getElementById('rdeduct').checked=false;
      return;
    }
    // Bulb is in_stock or pulled — check type match then fall through
    if(reg.status==='in_stock'||reg.status==='pulled'){
      const typeMatch=reg.bulbType.toUpperCase()===f.bulbType.toUpperCase();
      const inv=db.inventory.find(i=>i.bulbType===reg.bulbType);
      if(typeMatch){
        banner.style.display='';
        banner.style.background='var(--gglow)';
        banner.style.border='1px solid rgba(40,201,122,.3)';
        banner.innerHTML=`<div style="color:var(--green);font-weight:700">✅ Registered Bulb — Correct Type</div>
          <div class="dim" style="margin-top:4px">ID: <strong>${code}</strong> · Type: ${esc(reg.bulbType)}${reg.status==='pulled'?' · Previously pulled':''}
          ${inv?' · '+esc(inv.inStock)+' of this type in stock':''}</div>
          <div class="dim">Created ${ago(reg.createdAt)} · ${reg.history.length} prior installation${reg.history.length!==1?'s':''}</div>`;
        document.getElementById('rbulbcond').value=reg.status==='pulled'?'reused':'new';
        document.getElementById('rdeduct').checked=true;
        return;
      } else {
        banner.style.display='';
        banner.style.background='var(--aglow)';
        banner.style.border='1px solid rgba(240,165,0,.3)';
        banner.innerHTML=`<div style="color:var(--amber);font-weight:700">⚠️ Registered Bulb — Type Mismatch</div>
          <div class="dim" style="margin-top:4px">Scanned: <strong>${esc(reg.bulbType)}</strong> · Fixture needs: <strong>${esc(f.bulbType)}</strong></div>
          <div style="font-size:11px;color:var(--amber);margin-top:4px">Mismatch will be logged. You can still proceed.</div>`;
        document.getElementById('rbulbcond').value='new';
        return;
      }
    }
  }

  // ── STEP 1: Check used bulbs list ──
  const usedMatch=db.usedBulbs.find(b=>b.bulbId&&b.bulbId.toUpperCase()===code&&b.status==='available');
  if(usedMatch){
    const typeMatch=usedMatch.bulbType.toUpperCase()===f.bulbType.toUpperCase();
    const condLabel={new:'✅ New',blown:'💀 Blown'}[usedMatch.condition]||usedMatch.condition;
    const timePulled=usedMatch.datePulled?ago(usedMatch.datePulled):'unknown date';
    let bg,border,html;
    if(usedMatch.condition==='blown'){
      // Block — blown bulb
      bg='var(--rglow)';border='rgba(224,60,60,.4)';
      html=`<div style="color:var(--red);font-size:15px;font-weight:900">🚫 HARD BLOCK — This Bulb is Blown!</div>
            <div style="margin-top:8px;background:rgba(224,60,60,.1);border-radius:6px;padding:10px">
              <div class="dim">Bulb ID: <strong>${esc(usedMatch.bulbId)}</strong> · Type: ${esc(usedMatch.bulbType)}</div>
              <div class="dim">Pulled from: ${usedMatch.fixtureName||usedMatch.pulledFrom} · ${timePulled}</div>
            </div>
            <div style="font-size:12px;color:var(--red);margin-top:10px;font-weight:700">❌ This bulb cannot be used. Scan a different bulb.</div>`;
      document.getElementById('rbulbcond').value='blown';
      document.getElementById('rdeduct').checked=false;
    } else if(!typeMatch){
      // Used bulb found but wrong type — warn and block, allow override
      bg='var(--aglow)';border='rgba(240,165,0,.4)';
      html=`<div style="color:var(--amber);font-size:14px;font-weight:700">⚠️ Used Bulb — Type Mismatch!</div>
            <div class="dim" style="margin-top:4px">Scanned: <strong>${esc(usedMatch.bulbType)}</strong> · Fixture needs: <strong>${esc(f.bulbType)}</strong></div>
            <div class="dim">Condition: ${condLabel} · Pulled ${timePulled} from ${usedMatch.fixtureName||usedMatch.pulledFrom}</div>
            <div style="font-size:11px;color:var(--amber);margin-top:6px">Wrong bulb type — mismatch will be logged.</div>
            <button class="btn ba bsm" style="margin-top:8px" onclick="forceUsedBulb('${esc(usedMatch.id)}')">Proceed Anyway</button>`;
      document.getElementById('rbulbcond').value='new';
    } else {
      // Used bulb, correct type — warn but allow
      bg='var(--aglow)';border='rgba(240,165,0,.3)';
      html=`<div style="color:var(--amber);font-size:14px;font-weight:700">♻️ Previously Used Bulb</div>
            <div class="dim" style="margin-top:4px">Type: <strong>${esc(usedMatch.bulbType)}</strong> ✓ matches fixture</div>
            <div class="dim">Condition: ${condLabel} · Pulled ${timePulled} from ${usedMatch.fixtureName||usedMatch.pulledFrom}</div>
            <div style="font-size:11px;color:var(--amber);margin-top:4px">${esc(usedMatch.notes||'')}</div>
            <div style="margin-top:8px;display:flex;gap:8px">
              <button class="btn bg bsm" onclick="forceUsedBulb('${esc(usedMatch.id)}')">✅ Use This Bulb</button>
              <button class="btn bgh bsm" onclick="document.getElementById('rbulbid').value='';onBulbIdInput('')">✕ Cancel</button>
            </div>`;
      document.getElementById('rbulbcond').value='new';
      document.getElementById('rdeduct').checked=false; // don't deduct from stock — it's already used
    }
    banner.style.display='';banner.style.background=bg;banner.style.border='1px solid '+border;banner.innerHTML=html;
    return;
  }

  // ── STEP 2: Not on used list — check new stock inventory ──
  const inv=db.inventory.find(i=>i.bulbType.toUpperCase()===code)||null;
  const fixtureType=f.bulbType.toUpperCase();
  const isMatch=inv&&inv.bulbType.toUpperCase()===fixtureType;
  const inStock=inv?inv.inStock:null;
  let html='',bg='',border='';

  if(!inv){
    bg='var(--bglow)';border='rgba(61,155,233,.3)';
    html=`<div style="color:var(--blue)">📦 Bulb scanned: <strong>${code}</strong></div>
          <div class="dim" style="margin-top:4px">Not on used list or inventory — logged as new bulb from stock</div>`;
    document.getElementById('rbulbcond').value='new';
  } else if(isMatch){
    bg='var(--gglow)';border='rgba(40,201,122,.3)';
    html=`<div style="color:var(--green)">✅ New stock — correct type: <strong>${esc(inv.bulbType)}</strong></div>
          <div class="dim" style="margin-top:4px">${inStock} in stock · Will deduct 1 on confirm</div>`;
    document.getElementById('rbulbcond').value='new';
    document.getElementById('rdeduct').checked=true;
  } else {
    bg='var(--aglow)';border='rgba(240,165,0,.3)';
    html=`<div style="color:var(--amber)">⚠️ Type mismatch — new stock</div>
          <div class="dim" style="margin-top:4px">Scanned: <strong>${esc(inv.bulbType)}</strong> · Fixture needs: <strong>${esc(f.bulbType)}</strong></div>
          <div style="font-size:11px;color:var(--amber);margin-top:4px">Logged as mismatch — you can still proceed</div>`;
    document.getElementById('rbulbcond').value='new';
  }
  banner.style.display='';banner.style.background=bg;banner.style.border='1px solid '+border;banner.innerHTML=html;
}

// Called when technician overrides a used bulb warning
let _forcedUsedBulbId=null;

function onConditionChange(val){
  if(val==='blown'){
    const banner=document.getElementById('repMatchBanner');
    banner.style.display='';
    banner.style.background='var(--rglow)';
    banner.style.border='1px solid rgba(224,60,60,.5)';
    banner.innerHTML=`<div style="color:var(--red);font-size:15px;font-weight:900">🚫 HARD BLOCK — Blown Selected</div>
      <div style="font-size:12px;color:var(--red);margin-top:8px">You cannot confirm a replacement with a blown bulb. Change to ✅ New or scan a different bulb.</div>`;
  } else {
    const code=document.getElementById('rbulbid').value.trim().toUpperCase();
    if(code) onBulbIdInput(code);
    else document.getElementById('repMatchBanner').style.display='none';
  }
}

// forceRegistryOverride removed — installed and blown bulbs are hard locked
function forceUsedBulb(usedBulbId){
  _forcedUsedBulbId=usedBulbId;
  const ub=db.usedBulbs.find(b=>b.id===usedBulbId);
  if(!ub)return;
  const banner=document.getElementById('repMatchBanner');
  banner.style.background='var(--gglow)';
  banner.style.border='1px solid rgba(40,201,122,.3)';
  banner.innerHTML=`<div style="color:var(--green)">✅ Used bulb accepted</div>
    <div class="dim" style="margin-top:4px">ID: ${esc(ub.bulbId||'unlabelled')} · Type: ${esc(ub.bulbType)} · Will be marked as reinstalled</div>`;
  document.getElementById('rbulbcond').value='new';
  document.getElementById('rdeduct').checked=false;
}

function submitReplaced(){
  const f=db.fixtures.find(x=>x.id===_curFix);if(!f)return;
  const t=getTech('replace');if(!t){toast('Select a technician first','error');return;}
  // Hard block if blown condition selected
  const condCheck=document.getElementById('rbulbcond').value;
  if(condCheck==='blown'){
    const banner=document.getElementById('repMatchBanner');
    banner.style.display='';
    banner.style.background='var(--rglow)';
    banner.style.border='1px solid rgba(224,60,60,.5)';
    banner.innerHTML=`<div style="color:var(--red);font-size:15px;font-weight:900">🚫 HARD BLOCK — Blown Bulb Selected!</div>
      <div style="margin-top:8px;background:rgba(224,60,60,.1);border-radius:6px;padding:10px">
        <div class="dim">You have selected <strong>💀 Blown</strong> as the bulb condition.</div>
        <div class="dim" style="margin-top:4px">A blown bulb cannot be installed. Change the condition to ✅ New or scan a different bulb.</div>
      </div>
      <div style="font-size:12px;color:var(--red);margin-top:10px;font-weight:700">❌ Cannot confirm — please use a working bulb.</div>`;
    toast('🚫 Cannot install a blown bulb!','error');
    return;
  }
  const out=[...db.outages].filter(o=>o.fixtureId===f.id&&!o.resolved).sort((a,b)=>b.timestamp-a.timestamp)[0];
  if(out){out.resolved=true;out.resolvedAt=Date.now();out.resolvedBy=t.name;out.resolvedTechId=t.id;}
  f.status='ok';
  const deduct=document.getElementById('rdeduct').checked;
  const inv=db.inventory.find(i=>i.bulbType===f.bulbType);
  const bulbId=document.getElementById('rbulbid').value.trim();
  const bulbCond=document.getElementById('rbulbcond').value;

  // Mark used bulb as reinstalled if one was forced/selected
  if(_forcedUsedBulbId){
    const ub=db.usedBulbs.find(b=>b.id===_forcedUsedBulbId);
    if(ub){ub.status='reinstalled';ub.reinstalledIn=f.id;ub.reinstalledAt=Date.now();ub.reinstalledBy=t.name;}
    _forcedUsedBulbId=null;
  }

  // Update bulb registry — mark bulb as installed in this fixture
  const scannedBulbId=document.getElementById('rbulbid').value.trim().toUpperCase();
  if(scannedBulbId){
    let reg=db.bulbRegistry.find(b=>b.bulbId===scannedBulbId);
    if(!reg){
      // Auto-register if not already (e.g. old label pre-registry)
      reg={bulbId:scannedBulbId,bulbType:f.bulbType,status:'in_stock',createdAt:Date.now(),installedIn:null,installedAt:null,installedBy:null,history:[]};
      db.bulbRegistry.push(reg);
    }
    // Update registry to installed
    reg.history.push({event:'installed',fixture:f.id,fixtureName:f.name,tech:t.name,timestamp:Date.now()});
    reg.status='installed';
    reg.installedIn=f.id;
    reg.installedAt=Date.now();
    reg.installedBy=t.name;
    // Store on fixture for quick lookup
    f.currentBulbId=scannedBulbId;
    f.currentBulbType=reg.bulbType;
    f.currentBulbInstalledAt=Date.now();
  }

  if(deduct){
    if(inv&&inv.inStock>0){inv.inStock--;inv.totalUsed++;}
    const scannedInv=bulbId?db.inventory.find(i=>i.bulbType.toUpperCase()===bulbId):null;
    const mismatch=scannedInv&&scannedInv.bulbType.toUpperCase()!==f.bulbType.toUpperCase();
    db.usageLog.push({date:Date.now(),bulbType:f.bulbType,qty:1,fixture:f.id,tech:t.name,techId:t.id,bulbId,bulbCondition:bulbCond,mismatch:mismatch||false,scannedBulbType:scannedInv?scannedInv.bulbType:null});
    if(bulbCond==='blown'){
      // Permanently mark this bulb as blown in the registry
      if(scannedBulbId){
        const blownReg=db.bulbRegistry.find(b=>b.bulbId===scannedBulbId);
        if(blownReg){
          blownReg.status='disposed';
          blownReg.history.push({event:'marked_blown',fixture:f.id,tech:t.name,timestamp:Date.now()});
        }
      }
      toast('💀 Blown bulb permanently flagged in registry','error');
    }
    // no reused condition any more
    if(mismatch) toast('⚠️ Mismatch logged: '+scannedInv.bulbType+' used in '+f.bulbType+' fixture','info');
    if(inv&&inv.inStock<=inv.threshold){
      sendLowStockAlerts(f.bulbType,inv.inStock,inv.threshold,t.name);
      sendNotif('📦 Low Stock: '+f.bulbType,inv.inStock+' remaining (threshold: '+inv.threshold+')');
    }
  }
  save();closeM('markReplaced');toast('Fixture '+f.id+(deduct?' replaced — 1 bulb deducted':' marked resolved — no bulb deducted'),'success');refreshPage();
}
function receiveBulbs(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const type=document.getElementById('btype').value.trim();
  const qty=parseInt(document.getElementById('bqty').value)||0;
  const sup=document.getElementById('bsup').value.trim();
  const thr=parseInt(document.getElementById('bthr').value)||3;
  const nts=document.getElementById('bnotes').value.trim();
  if(!type||qty<1){toast('Bulb type and quantity required','error');return;}
  const t=getTech('recv');
  let inv=db.inventory.find(i=>i.bulbType===type);
  if(inv){inv.inStock+=qty;inv.totalReceived+=qty;inv.threshold=thr;}
  else db.inventory.push({bulbType:type,inStock:qty,threshold:thr,totalReceived:qty,totalUsed:0});
  db.orders.push({date:Date.now(),bulbType:type,qty,supplier:sup,notes:nts,tech:t?t.name:'Unknown'});
  save();closeM('receiveBulbs');renderInv();toast(qty+' × '+type+' added to inventory','success');
}

// ── Email alerts ──
async function sendLowStockAlerts(bulbType,stock,threshold,techName){
  // Only notify admins and master admin — they're the ones who can reorder
  const recipients=db.technicians.filter(t=>t.email&&t.email.includes('@')&&(t.userRole==='admin'||t.userRole==='master'));
  if(!recipients.length)return;
  const time=new Date().toLocaleString('en-CA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  for(const rec of recipients){
    try{
      await emailjs.send(EJSID,EJTPL,kccNoticeParams(rec,'⚠️ Low Stock Alert — '+bulbType,{tone:'amber',badge:'Low stock',headline:'Bulb type '+bulbType+' is running low',rows:[['Current stock',stock+' remaining'],['Threshold',threshold],['Logged by',techName],['Time',time]],body:'It may need reordering.'}));
    }catch(e){console.warn('Email failed',e);}
  }
  toast('📧 Low stock alert sent to '+recipients.length+' crew member'+(recipients.length>1?'s':''),'info');
}
async function sendOutageAlerts(fixtureName,fixtureId,bulbType,techName){
  // Only notify admins and master admin
  const recipients=db.technicians.filter(t=>t.email&&t.email.includes('@')&&(t.userRole==='admin'||t.userRole==='master'));
  if(!recipients.length)return;
  const time=new Date().toLocaleString('en-CA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  for(const rec of recipients){
    try{
      await emailjs.send(EJSID,EJTPL,kccNoticeParams(rec,'🔴 Fixture Out — '+fixtureName+' ('+fixtureId+')',{tone:'red',badge:'Fixture out',headline:fixtureName+' has been reported out',rows:[['Fixture',fixtureName+' ('+fixtureId+')'],['Bulb type',bulbType],['Reported by',techName],['Time',time]],body:'It needs attention.'}));
    }catch(e){console.warn('Email failed',e);}
  }
  toast('📧 Outage alert sent to '+recipients.length+' crew member'+(recipients.length>1?'s':''),'info');
}



function manualSendScheduleEmail(){
  if(!isAdmin()){ toast('Admin permission required','error'); return; }
  // Find the upcoming Sunday using local date
  const now = new Date();
  const daysUntilSun = (7 - now.getDay()) % 7 || 7;
  const sun = new Date(now); sun.setDate(now.getDate() + daysUntilSun);
  const key = schedKey(sun);
  const entry = db.schedules[key];
  const dateStr = sun.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  if(!entry || !entry.crew || !entry.crew.length){
    toast('No crew scheduled for '+dateStr,'error');
    return;
  }
  if(!confirm('Send schedule emails to '+entry.crew.length+' crew member'+(entry.crew.length>1?'s':'')+' for '+dateStr+'?')) return;
  sendScheduleEmails(key, entry);
}

function checkScheduleEmails(){
  // Thursday auto-send of the schedule for the upcoming Sunday.
  // Only a signed-in admin or master can trigger it, and it is recorded in the shared settings,
  // so it goes out once per Sunday no matter how many devices or people open the app.
  const today=new Date();
  if(today.getDay()!==4) return; // not Thursday
  if(typeof _techId==='undefined'||!_techId||!isAdmin()||!db.settings) return;

  // Find the upcoming Sunday (3 days away)
  const sunday=new Date(today);
  sunday.setDate(sunday.getDate()+3);
  const key=schedKey(sunday);
  if(db.settings.schedEmailSent===key) return; // already sent for this Sunday
  const entry=db.schedules[key];

  if(!entry||!entry.crew||!entry.crew.length){
    console.log('No schedule set for upcoming Sunday '+key+' — skipping auto-email');
    return;
  }

  db.settings.schedEmailSent=key; save(); // mark first, so a second open cannot send it again

  // Send emails to assigned crew
  setTimeout(()=>{
    sendScheduleEmails(key, entry);
    toast('📧 Thursday auto-send: schedule emails sent for '+sunday.toLocaleDateString('en-CA',{month:'short',day:'numeric'}),'info');
  }, 2000);
}

// ── Export CSV ──
function exportCSV(type='history'){
  let csv='',filename='';
  if(type==='history'){
    csv='Date,Fixture,Fixture ID,Bulb Type,Reported By,Resolved By,Status,Down Time (min)\n';
    csv+=db.outages.sort((a,b)=>b.timestamp-a.timestamp).map(o=>[fmtD(o.timestamp),o.fixtureName,o.fixtureId,o.bulbType,o.reportedBy||'',o.resolvedBy||'',o.resolved?'Resolved':'Pending',o.resolved?Math.round((o.resolvedAt-o.timestamp)/60000):''].join(',')).join('\n');
    filename='outage-history.csv';
  } else if(type==='inventory'){
    csv='Bulb Type,In Stock,Threshold,Total Received,Total Used\n';
    csv+=db.inventory.map(i=>[i.bulbType,i.inStock,i.threshold,i.totalReceived,i.totalUsed].join(',')).join('\n');
    filename='inventory.csv';
  }
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
  toast('CSV exported','success');
}
