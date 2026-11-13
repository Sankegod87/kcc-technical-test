// ── Settings ──
function renderSettings(){
  const s=db.settings||{};
  // Account
  const t=getCurTech();
  const signedInEl=document.getElementById('settingsSignedInAs');
  if(signedInEl) signedInEl.textContent=t?(t.avatar||'👤')+' '+t.name:'Not logged in';
  renderRolesList();
  renderTrainingOptions();
  // Claim master panel
  const claimPanel=document.getElementById('claimMasterPanel');
  if(claimPanel){const hasMaster=db.technicians.some(t=>t.userRole==='master');claimPanel.style.display=(!hasMaster&&getCurTech())?'':'none';}
  // Role management
  const roleList=document.getElementById('roleMgmtList');
  if(roleList&&isMaster()){
    roleList.innerHTML=db.technicians.filter(t=>t.userRole!=='master').map(t=>`
      <div class="row jbet" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="row gap8"><span style="font-size:20px">${esc(t.avatar||'👤')}</span><div><div class="fw7">${esc(t.name)}</div><div class="dim">${esc(t.role||'Technician')}</div></div></div>
        <select onchange="setUserRole('${esc(t.id)}',this.value)" style="width:auto;padding:5px 8px;font-size:11px">
          <option value="user" ${(t.userRole||'user')==='user'?'selected':''}>👤 Regular User</option>
          <option value="admin" ${t.userRole==='admin'?'selected':''}>🔑 User Admin</option>
        </select></div>`).join('')||'<p class="dim">No other crew members yet.</p>';
  }
  document.getElementById('maintInterval').value=s.maintInterval||90;
  // Notifications
  const np=document.getElementById('notifStatus');
  if(np){if(!('Notification' in window)){np.innerHTML='<p class="dim">Notifications not supported.</p>';}
  else if(Notification.permission==='granted'){np.innerHTML='<span class="badge bok">✅ Enabled</span>';}
  else if(Notification.permission==='denied'){np.innerHTML='<span class="badge bout">Blocked — enable in browser settings</span>';}
  else{np.innerHTML='<span class="badge blow">Not yet enabled</span>';}}
  // Accent colour swatches
  const swatchEl=document.getElementById('s-colourSwatches');
  if(swatchEl){
    const presets=['#0F6E56','#1a6fa8','#7c3aed','#c2410c','#0f766e','#b45309'];
    swatchEl.innerHTML=presets.map(c=>`<div onclick="document.getElementById('s-accentHex').value='${c}';previewAccent('${c}')" style="height:36px;border-radius:8px;background:${c};cursor:pointer;border:2px solid ${(s.accentColour||'#0F6E56')===c?'#fff':'transparent'};box-shadow:${(s.accentColour||'#0F6E56')===c?'0 0 0 2px '+c:'none'};transition:all .15s"></div>`).join('');
  }
  const hexEl=document.getElementById('s-accentHex');if(hexEl)hexEl.value=s.accentColour||'#0F6E56';
  const prevEl=document.getElementById('s-accentPreview');if(prevEl)prevEl.style.background=s.accentColour||'#0F6E56';
  // Widget toggles
  const wtEl=document.getElementById('s-widgetToggles');
  if(wtEl){
    const widgets=[
      {key:'w_alerts',label:'🚨 Alerts panel'},
      {key:'w_stats',label:'📊 Stats cards'},
      {key:'w_schedule',label:'📅 Upcoming schedule'},
      {key:'w_checkouts',label:'📤 Active checkouts'},
      {key:'w_maintenance',label:'🔧 Maintenance due'},
      {key:'w_announcements',label:'📢 Announcements'},
    ];
    const wp=s.widgetPrefs||{};
    wtEl.innerHTML=widgets.map(w=>`
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-family:var(--head);color:var(--text);letter-spacing:0;text-transform:none">
        <input type="checkbox" id="wt-${esc(w.key)}" ${wp[w.key]===false?'':'checked'} style="width:18px;height:18px;cursor:pointer;accent-color:var(--amber)">
        ${esc(w.label)}
      </label>`).join('');
  }
  // Gear categories
  renderGearCats();
  // Departments
  renderDeptsSettings();
  // Vendors
  renderVendors();
  // Overdue settings
  const og=document.getElementById('s-overdueGrace');const ra=document.getElementById('s-reminderAfter');const er=document.getElementById('s-emailReminders');
  if(og)og.value=s.overdueGrace??0;if(ra)ra.value=s.reminderAfter??3;if(er)er.checked=!!s.emailReminders;
}

// ── Accent colour ──
function previewAccent(hex){
  const prevEl=document.getElementById('s-accentPreview');
  if(prevEl)prevEl.style.background=hex||'#0F6E56';
}
function saveAccentColour(){
  const hex=(document.getElementById('s-accentHex').value||'').trim();
  if(!/^#[0-9a-fA-F]{6}$/.test(hex)){toast('Enter a valid hex colour e.g. #1a6fa8','error');return;}
  if(!db.settings)db.settings={};
  db.settings.accentColour=hex;
  applyAccentColour(hex);save();renderSettings();toast('Colour applied','success');
}
function applyAccentColour(hex){
  if(!hex)return;
  // Derive a darker shade (~80% brightness)
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const dark='rgb('+Math.round(r*.7)+','+Math.round(g*.7)+','+Math.round(b*.7)+')';
  const glow='rgba('+r+','+g+','+b+',.08)';
  // The dark theme sets these on <body>, which would hide anything set only on <html>, so set them on both.
  [document.documentElement,document.body].forEach(el=>{ if(!el)return;
    el.style.setProperty('--amber',hex);el.style.setProperty('--amber2',dark);el.style.setProperty('--aglow',glow);
    el.style.setProperty('--blue',hex);el.style.setProperty('--bglow',glow);
  });
}

// ── Widget prefs ──
function saveWidgetPrefs(){
  if(!db.settings)db.settings={};
  const keys=['w_alerts','w_stats','w_schedule','w_checkouts','w_maintenance','w_announcements'];
  const prefs={};
  keys.forEach(k=>{const el=document.getElementById('wt-'+k);if(el)prefs[k]=el.checked;});
  db.settings.widgetPrefs=prefs;save();toast('Dashboard widgets saved','success');
}

// ── Gear categories ──
const DEFAULT_GEAR_CATS=['Lighting','Audio','Video','Cables','Power','Backline','Rigging','Other'];
function getGearCats(){return db.settings?.gearCategories||DEFAULT_GEAR_CATS;}
function renderGearCats(){
  const el=document.getElementById('s-gearCatsEl');if(!el)return;
  const cats=getGearCats();
  el.innerHTML=cats.map((c,i)=>`<div class="row jbet" style="padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px;font-family:var(--head)">${c}</span><button class="btn br bsm" onclick="removeGearCat(${i})">✕</button></div>`).join('')||'<p class="dim">No categories.</p>';
}
function addGearCat(){
  const inp=document.getElementById('s-newGearCat');const v=(inp.value||'').trim();if(!v){toast('Enter a category name','error');return;}
  if(!db.settings)db.settings={};
  if(!db.settings.gearCategories)db.settings.gearCategories=[...DEFAULT_GEAR_CATS];
  if(db.settings.gearCategories.includes(v)){toast('Already exists','error');return;}
  db.settings.gearCategories.push(v);inp.value='';save();renderGearCats();toast('Category added','success');
}
function removeGearCat(i){
  if(!db.settings?.gearCategories)return;
  db.settings.gearCategories.splice(i,1);save();renderGearCats();
}

// ── Departments ──
const DEFAULT_DEPTS=[{name:'Lighting',color:'#0F6E56'},{name:'Audio',color:'#1a6fa8'},{name:'Video',color:'#7c3aed'}];
function getDepts(){return db.settings?.departments||DEFAULT_DEPTS;}
function renderDeptsSettings(){
  const el=document.getElementById('s-deptsEl');if(!el)return;
  const depts=getDepts();
  el.innerHTML=depts.map((d,i)=>`<div class="row jbet" style="padding:6px 0;border-bottom:1px solid var(--border)"><div class="row gap8"><div style="width:14px;height:14px;border-radius:3px;background:${esc(d.color||'#888')};flex-shrink:0"></div><span style="font-size:13px;font-family:var(--head)">${esc(d.name)}</span></div><button class="btn br bsm" onclick="removeDept(${i})">✕</button></div>`).join('')||'<p class="dim">No departments.</p>';
}
function addDept(){
  const ni=document.getElementById('s-newDept');const ci=document.getElementById('s-newDeptColor');
  const name=(ni.value||'').trim();if(!name){toast('Enter a department name','error');return;}
  if(!db.settings)db.settings={};
  if(!db.settings.departments)db.settings.departments=[...DEFAULT_DEPTS];
  db.settings.departments.push({name,color:ci.value||'#0F6E56'});
  ni.value='';save();renderDeptsSettings();toast('Department added','success');
}
function removeDept(i){
  if(!db.settings?.departments)return;
  db.settings.departments.splice(i,1);save();renderDeptsSettings();
}

// ── Vendors & Parts Suppliers ──
function getVendors(){return db.vendors||[];}
function renderVendors(){
  const el=document.getElementById('s-vendorsEl');if(!el)return;
  const vendors=getVendors();
  el.innerHTML=vendors.map(v=>`<div class="row jbet" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="min-width:0">
        <div class="fw7" style="font-size:13px">${esc(v.name)}</div>
        <div class="dim" style="font-size:11px">${[v.contact,v.phone,v.email].filter(Boolean).join(' · ')||'No contact info'}</div>
        ${v.parts?'<div class="dim" style="font-size:11px;margin-top:2px">Supplies: '+esc(v.parts)+'</div>':''}
      </div>
      <button class="btn bgh bsm" onclick="openEditVendor('${esc(v.id)}')">✏️</button>
    </div>`).join('')||'<p class="dim">No vendors added yet.</p>';
}
function _populateVendorSelect(selectId,currentVal){
  const sel=document.getElementById(selectId);if(!sel)return;
  const vendors=getVendors();
  sel.innerHTML='<option value="">— None —</option>'+vendors.map(v=>`<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
  sel.value=currentVal||'';
}
function openAddVendor(){
  document.getElementById('vf-modal-title').textContent='🚚 Add Vendor';
  document.getElementById('vf-id').value='';
  ['vf-name','vf-contact','vf-phone','vf-email','vf-parts','vf-lastorder','vf-notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('vf-delete-btn').style.display='none';
  openM('vendorForm');
}
function openEditVendor(id){
  const v=getVendors().find(x=>x.id===id);if(!v)return;
  document.getElementById('vf-modal-title').textContent='✏️ Edit Vendor';
  document.getElementById('vf-id').value=v.id;
  document.getElementById('vf-name').value=v.name||'';
  document.getElementById('vf-contact').value=v.contact||'';
  document.getElementById('vf-phone').value=v.phone||'';
  document.getElementById('vf-email').value=v.email||'';
  document.getElementById('vf-parts').value=v.parts||'';
  document.getElementById('vf-lastorder').value=v.lastOrder?new Date(v.lastOrder).toISOString().slice(0,10):'';
  document.getElementById('vf-notes').value=v.notes||'';
  document.getElementById('vf-delete-btn').style.display='';
  openM('vendorForm');
}
function saveVendor(){
  if(!isAdmin()){toast('Admin required','error');return;}
  const name=(document.getElementById('vf-name').value||'').trim();
  if(!name){toast('Vendor name required','error');return;}
  if(!db.vendors)db.vendors=[];
  const id=document.getElementById('vf-id').value;
  const lastOrderVal=document.getElementById('vf-lastorder').value;
  const data={
    name,
    contact:(document.getElementById('vf-contact').value||'').trim(),
    phone:(document.getElementById('vf-phone').value||'').trim(),
    email:(document.getElementById('vf-email').value||'').trim(),
    parts:(document.getElementById('vf-parts').value||'').trim(),
    lastOrder:lastOrderVal?new Date(lastOrderVal+'T12:00:00').getTime():null,
    notes:(document.getElementById('vf-notes').value||'').trim()
  };
  if(id){
    const v=db.vendors.find(x=>x.id===id);
    if(v)Object.assign(v,data);
  } else {
    db.vendors.push(Object.assign({id:'vnd_'+Date.now()},data));
  }
  save();closeM('vendorForm');renderVendors();toast('Vendor saved','success');
}
function deleteVendor(){
  if(!isAdmin())return;
  const id=document.getElementById('vf-id').value;if(!id)return;
  if(!confirm('Delete this vendor? Fixtures/gear linked to it will keep their link but show no vendor details.'))return;
  db.vendors=(db.vendors||[]).filter(x=>x.id!==id);
  save();closeM('vendorForm');renderVendors();toast('Vendor deleted','info');
}

// ── Overdue settings ──
function saveOverdueSettings(){
  if(!db.settings)db.settings={};
  db.settings.overdueGrace=parseInt(document.getElementById('s-overdueGrace').value)||0;
  db.settings.reminderAfter=parseInt(document.getElementById('s-reminderAfter').value)||3;
  db.settings.emailReminders=document.getElementById('s-emailReminders').checked;
  save();toast('Overdue settings saved','success');
}

// ── Apply saved customisation on boot ──
function applyCustomisation(){
  const s=db.settings||{};
  if(s.accentColour)applyAccentColour(s.accentColour);
}
async function claimMasterAdmin(){
  const t=getCurTech();
  if(!t){toast('Log in first','error');return;}
  const hasMaster=db.technicians.some(x=>x.userRole==='master'&&x.active!==false);
  if(hasMaster){toast('A master admin already exists','error');return;}
  if(!confirm('Make '+t.name+' the Master Admin?\n\nThis gives full system access including data reset and deletion.'))return;
  const r=await techCall({op:'claimMaster'}); if(!r) return;
  toast('👑 '+t.name+' is now Master Admin. Please sign in again.','success');
  setTimeout(()=>lsLogout(),1500);
}

async function setUserRole(techId, role){
  if(!isMaster()){toast('Master admin only','error');return;}
  const t=db.technicians.find(x=>x.id===techId);
  if(!t||t.userRole==='master')return;
  const r=await techCall({op:'edit',id:techId,fields:{userRole:role}}); if(!r){renderSettings();return;}
  renderSettings();
  toast(t.name+' is now '+role,'success');
}

// Device PIN is kept hashed; a plain 4-digit value from an older version still works.
function _pinMatch(p,stored){return stored&&(stored.indexOf('s2:')===0?simpleHash('pin'+p)===stored:p===stored);}
function savePin(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const cur=document.getElementById('currentPin').value;
  const nw=document.getElementById('newPin').value;
  const stored=localStorage.getItem(PIN_KEY)||'';
  if(stored&&!_pinMatch(cur,stored)){toast('Current PIN incorrect','error');return;}
  if(nw&&nw.length!==4){toast('PIN must be exactly 4 digits','error');return;}
  if(nw) localStorage.setItem(PIN_KEY,simpleHash('pin'+nw));
  else localStorage.removeItem(PIN_KEY);
  document.getElementById('currentPin').value='';document.getElementById('newPin').value='';
  toast(nw?'PIN saved':'PIN removed','success');
}
function saveMaintSettings(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const v=parseInt(document.getElementById('maintInterval').value)||90;
  db.settings.maintInterval=v;save();toast('Maintenance interval saved','success');
}


// ── PIN ──
function requirePin(cb){
  const stored=localStorage.getItem(PIN_KEY);
  if(!stored){cb();return;}
  _pinCallback=cb;_pinEntry='';updatePinDots();
  document.getElementById('pinOverlay').style.display='flex';
}
function pinKey(k){
  if(k==='C'){_pinEntry='';updatePinDots();return;}
  if(k==='ok'){checkPin();return;}
  if(_pinEntry.length<4){_pinEntry+=k;updatePinDots();}
  if(_pinEntry.length===4) setTimeout(checkPin,120);
}
function checkPin(){
  const stored=localStorage.getItem(PIN_KEY);
  if(_pinMatch(_pinEntry,stored)){
    document.getElementById('pinOverlay').style.display='none';
    if(_pinCallback){_pinCallback();_pinCallback=null;}
  } else {
    _pinEntry='';updatePinDots();
    document.getElementById('pinSub').textContent='Incorrect PIN — try again';
    setTimeout(()=>document.getElementById('pinSub').textContent='Enter 4-digit PIN',1000);
  }
}
function cancelPin(){document.getElementById('pinOverlay').style.display='none';_pinCallback=null;_pinEntry='';}
function updatePinDots(){for(let i=0;i<4;i++)document.getElementById('pd'+i).className='pin-dot'+(i<_pinEntry.length?' filled':'');}

// ── Push Notifications ──
function requestNotifPermission(){
  if(!('Notification' in window)){toast('Not supported in this browser','error');return;}
  Notification.requestPermission().then(p=>{renderSettings();if(p==='granted')toast('Notifications enabled!','success');});
}
function sendNotif(title,body){
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    try{new Notification(title,{body,icon:'icon-192.png'});}catch(e){}
  }
}

// ── Tech helpers ──
function getCurTech(){return _techId?db.technicians.find(t=>t.id===_techId)||null:null;}
function isTechActive(t){ return !!t && t.active !== false; }
async function toggleTechActive(id){
  if(!isAdmin()){ toast('Admin permission required','error'); return; }
  const t = db.technicians.find(x=>x.id===id); if(!t) return;
  if(t.userRole==='master' && isTechActive(t)){ toast("Can't deactivate the Master Admin","error"); return; }
  const goingInactive = isTechActive(t);
  if(goingInactive && !confirm('Mark '+t.name+' as inactive? They will be blocked from logging in and from being added to the schedule.')) return;
  const r=await techCall({op:'setActive',id,active:!goingInactive}); if(!r) return;
  logAudit(goingInactive?'Crew Deactivated':'Crew Reactivated', t.name);
  save(); renderCrew();
  toast(t.name+(goingInactive?' marked inactive':' reactivated'),'success');
}
function loadTech(){try{_techId=localStorage.getItem(TECH_KEY)||null;}catch(e){}updTechUI();}
function setTech(id){
  const t0=db.technicians.find(x=>x.id===id);
  if(t0 && !isTechActive(t0)){ toast('This account is inactive','error'); return; }
  if(window._syncMode==='firebase'&&window._authUid&&window._authUid()!==id){ toast('Sign out and sign in as that person first','error'); return; }
  _techId=id;try{localStorage.setItem(TECH_KEY,id);}catch(e){}
  updTechUI();closeM('whoAmI');applyPermissions();
  const t=db.technicians.find(x=>x.id===id);if(t)toast('Welcome, '+t.name+'! 👋','success');
  renderDash();
}
function updTechUI(){
  const t=getCurTech();
  const chip=document.getElementById('techChip');
  const logoutBtn=document.getElementById('logoutBtn');
  if(chip) chip.textContent=t?t.avatar+' '+t.name:'— Not logged in —';
  if(logoutBtn) logoutBtn.style.display=t?'':'none';
  const banner=document.getElementById('whoBanner');
  if(t){banner.style.display='';document.getElementById('bannerAv').textContent=t.avatar||'👤';document.getElementById('bannerName').textContent=t.name;const roleLabel=t.userRole==='master'?'👑 Master Admin':t.userRole==='admin'?'🔑 User Admin':'👤 '+t.role||'Technician';document.getElementById('bannerRole').textContent=roleLabel;}
  else banner.style.display='none';
  // Sidebar footer
  const sfAv=document.getElementById('sfAvatar');
  const sfNm=document.getElementById('sfName');
  const sfRl=document.getElementById('sfRole');
  if(sfAv) sfAv.textContent=t?(t.avatar||'👤'):'👤';
  if(sfNm) sfNm.textContent=t?t.name:'Not logged in';
  if(sfRl) sfRl.textContent=t?(t.userRole==='master'?'👑 Master Admin':t.userRole==='admin'?'🔑 Admin':(t.role||'Crew')):'';
}
function buildTechGrid(cid,key){
  const el=document.getElementById(cid);if(!el)return;
  if(!_selTech[key]&&_techId)_selTech[key]=_techId;
  const sel=_selTech[key];
  if(!db.technicians.length){el.innerHTML='<p class="dim">No technicians. <a href="#" class="ca" onclick="closeAllM();go(\'crew\')">Add crew →</a></p>';return;}
  el.innerHTML=db.technicians.map(t=>`<div class="tpb ${t.id===sel?'sel':''}" onclick="pickTech('${key}','${esc(t.id)}','${cid}')"><div class="tav">${esc(t.avatar||'👤')}</div><div>${esc(t.name.split(' ')[0])}</div></div>`).join('');
}
function pickTech(key,id,cid){_selTech[key]=id;buildTechGrid(cid,key);}
function getTech(key){const id=_selTech[key];return id?db.technicians.find(t=>t.id===id)||null:null;}


// ── Backup and restore (master admin) ──
function downloadBackup(){
  if(!isMaster()){toast('Master admin only','error');return;}
  const stamp=new Date().toISOString().slice(0,10);
  const blob=new Blob([JSON.stringify({kcc_backup:1,savedAt:Date.now(),data:db},null,1)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kcc-technical-backup-'+stamp+'.json';
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
  toast('Backup downloaded','success');
}
function restoreBackup(input){
  const f=input.files&&input.files[0]; input.value='';
  if(!f) return;
  if(!isMaster()){toast('Master admin only','error');return;}
  const r=new FileReader();
  r.onload=()=>{
    let b; try{ b=JSON.parse(r.result); }catch(e){ toast('That file is not a valid backup','error'); return; }
    // New backups are {kcc_backup:1,data:{...}}. The old app's Backup button saves the data object itself, so accept that too.
    const oldFmt=!!(b&&!b.kcc_backup&&Array.isArray(b.technicians));
    const d=b&&b.kcc_backup?b.data:(oldFmt?b:null);
    if(!d||!Array.isArray(d.technicians)||!d.technicians.some(t=>t.userRole==='master')){ toast('That file is not a KCC Technical backup','error'); return; }
    const when=oldFmt?'the old app (no date)':new Date(b.savedAt||0).toLocaleString();
    requirePin(()=>{
      if(!confirm('Replace ALL current data on every device with the backup from '+when+'?'+(oldFmt?'\n\nThis is a backup from the OLD app: gear, fixtures, schedules and settings are copied, but crew accounts are not (use the migration step for people and passwords).':'')+'\n\nThis cannot be undone. Download a backup of the current data first if unsure.')) return;
      // Crew accounts, roles and passwords live on the server and are not changed by a restore. Old backups may carry password hashes or the YouTube key: drop them.
      const keepCrew=db.technicians; delete d.technicians; if(d.settings) delete d.settings.ytKey;
      const keep={}; Object.keys(db).forEach(k=>{ if(!(k in d)) keep[k]=db[k]; }); // anything the backup does not have (e.g. newer features) stays as it is now
      db=Object.assign({fixtures:[],outages:[],inventory:[],orders:[],usageLog:[],technicians:keepCrew,settings:{}},keep,d);
      lsave(); try{ localStorage.removeItem(SYNC_BASE_KEY); }catch(e){}
      save(); toast('Backup restored','success'); refreshPage();
    });
  };
  r.readAsText(f);
}
