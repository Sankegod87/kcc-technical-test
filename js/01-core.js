// Only let known-safe things into src/href: real image data, http(s) links, mailto/tel.
function safeImg(u){u=String(u==null?'':u);return /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/.test(u)||/^https:\/\/[^\s"'<>]+$/.test(u)?u:'';}
function safeUrl(u){u=String(u==null?'':u).trim();return /^(https?:\/\/|mailto:|tel:)[^\s"'<>]*$/i.test(u)?u:'';}
// HTML-escape any text that came from a person before it is put into markup.
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const LS_KEY   = 'slt_db_v6';
const TECH_KEY = 'slt_tech_id';
const PIN_KEY  = 'slt_pin';
const EJSID      = 'service_pjzebxk';
const EJTPL      = 'template_ebt36uu';  // Alerts (low stock + outage)
const EJTPL_SCHED = 'template_ondy8ll'; // Schedule notifications

let db = { fixtures:[], outages:[], inventory:[], orders:[], usageLog:[], technicians:[], settings:{} };
let _techId=null, _selTech={}, _curFix=null, _curPage='dashboard';
let _camScanner=null, _camRunning=false;
let _pinCallback=null, _pinEntry='';

// ── Storage ──
function lsave(){try{localStorage.setItem(LS_KEY,JSON.stringify(db));}catch(e){}}
function lload(){
  try{const s=localStorage.getItem(LS_KEY);if(s){const p=JSON.parse(s);db=Object.assign({fixtures:[],outages:[],inventory:[],orders:[],usageLog:[],technicians:[],settings:{},usedBulbs:[],bulbRegistry:[],schedules:{},availability:{},checklistState:{},shows:[]},p);if(!db.settings)db.settings={};if(!db.usedBulbs)db.usedBulbs=[];if(!db.bulbRegistry)db.bulbRegistry=[];if(!db.schedules)db.schedules={};if(!db.availability)db.availability={};if(!db.checklistState)db.checklistState={};if(!db.shows)db.shows=[];if(!db.gearItems)db.gearItems=[];if(!db.checkouts)db.checkouts=[];if(!db.maintLogs)db.maintLogs=[];if(!db.techRequests)db.techRequests=[];if(!db.announcements)db.announcements=[];if(!db.signoffs)db.signoffs={};if(!db.trainingModules)db.trainingModules=[];if(!db.feedbackItems)db.feedbackItems=[];if(!db.incidentReports)db.incidentReports=[];if(!db.rehearsals)db.rehearsals=[];if(!db.swapRequests)db.swapRequests=[];if(!db.auditLog)db.auditLog=[];if(!db.vendors)db.vendors=[];if(!db.specialEvents)db.specialEvents=[];if(!db.serviceNotes)db.serviceNotes=[];}}catch(e){}
}
window._onRemoteData=function(r){
  // Unsent edits on this device? Merge them with the cloud copy instead of losing them.
  let _merged=false;
  if(typeof syncIsDirty==='function'&&syncIsDirty()){ try{ r=syncMergeRemote(r); _merged=true; }catch(e){ console.warn('merge failed',e); } }
  else if(typeof syncSetBase==='function'){ syncSetBase(r); }
  // Only overwrite technicians if Firebase has data; never wipe with empty (protects login)
  if(r.technicians && r.technicians.length > 0) db.technicians=r.technicians;
  db.fixtures=r.fixtures||[];db.outages=r.outages||[];
  db.inventory=r.inventory||[];db.orders=r.orders||[];db.usageLog=r.usageLog||[];
  db.settings=r.settings||{};db.usedBulbs=r.usedBulbs||[];db.bulbRegistry=r.bulbRegistry||[];db.schedules=r.schedules||{};db.availability=r.availability||{};db.checklistState=r.checklistState||{};db.shows=r.shows||[];
  // Stage 3-5 collections — restore from Firebase if present, else keep existing or default
  db.gearItems=r.gearItems||db.gearItems||[];
  db.checkouts=r.checkouts||db.checkouts||[];
  // Deduplicate: for each gear item, keep only the newest active checkout
  (function dedupeCheckouts(){
    const seen={};
    db.checkouts.forEach(c=>{
      if(c.returnedAt) return;
      if(!seen[c.gearId]||c.checkedOutAt>seen[c.gearId].checkedOutAt){
        if(seen[c.gearId]){seen[c.gearId].returnedAt=Date.now();seen[c.gearId].returnNotes='[auto-closed: duplicate checkout record]';}
        seen[c.gearId]=c;
      } else {
        c.returnedAt=Date.now();c.returnNotes='[auto-closed: duplicate checkout record]';
      }
    });
  })();
  db.maintLogs=r.maintLogs||db.maintLogs||[];
  db.techRequests=r.techRequests||db.techRequests||[];
  db.announcements=r.announcements||db.announcements||[];
  db.signoffs=r.signoffs||db.signoffs||{};
  db.trainingModules=r.trainingModules||db.trainingModules||[];
  db.feedbackItems=r.feedbackItems||db.feedbackItems||[];
  db.incidentReports=r.incidentReports||db.incidentReports||[];
  db.rehearsals=r.rehearsals||db.rehearsals||[];
  db.specialEvents=r.specialEvents||db.specialEvents||[];
  db.swapRequests=r.swapRequests||db.swapRequests||[];
  db.auditLog=r.auditLog||db.auditLog||[];
  db.vendors=r.vendors||db.vendors||[];
  db.serviceNotes=r.serviceNotes||db.serviceNotes||[];
  // Schedule templates
  if(r.settings&&r.settings.scheduleTemplates) db.settings.scheduleTemplates=r.settings.scheduleTemplates;
  lsave();
  if(_merged) setTimeout(()=>save(),0); // push the merged result so everyone converges
  applyCustomisation();
  // Try to resume a saved session now that Firebase has loaded real crew data
  const loginVisible = document.getElementById('loginScreen')?.style.display === 'flex';
  const onExternalRequest = location.hash==='#request'||location.hash==='#external-request';
  if(!_techId && !onExternalRequest){
    // Check if there's a saved session we can now validate against real crew data
    const savedId = (window._authUid&&window._authUid())||null; // the server says who is signed in
    const savedTech = savedId ? db.technicians.find(t=>t.id===savedId) : null;
    if(savedTech && isTechActive(savedTech)){
      // Valid session found — auto log in, skip login screen
      _techId = savedId;
      updTechUI();
      applyPermissions();
      const ls=document.getElementById('loginScreen');
      const hs=document.getElementById('homeScreen');
      if(ls) ls.style.display='none';
      if(hs) hs.style.display='none';
      go(homePage());
      checkScheduleEmails();
      return;
    }
    if(savedTech && !isTechActive(savedTech)){
      try{localStorage.removeItem(TECH_KEY);}catch(e){}
    }
    // No valid session — rebuild grid with fresh crew and stay on login
    if(loginVisible) buildLsGrid();
    else { buildLsGrid(); showLoginScreen(); }
    return;
  }
  // Someone is already logged in — verify they still exist and are active
  const curTechRec = db.technicians.find(t=>t.id===_techId);
  const stillExists = !!curTechRec && isTechActive(curTechRec);
  if(!stillExists){
    _techId=null;
    try{localStorage.removeItem(TECH_KEY);}catch(e){}
    buildLsGrid();showLoginScreen();return;
  }
  updTechUI();applyPermissions();
  if(loginVisible){
    // Signed in on the server but this device had no saved crew list yet: now that it has arrived, leave the sign-in screen.
    if(window._authUid&&window._authUid()===_techId&&typeof resumeSession==='function'){ resumeSession(_techId); checkScheduleEmails(); }
    else buildLsGrid();
  }
  else { refreshPage();checkScheduleEmails(); }
};
async function save(){
  lsave();
  if(window._syncMode==='firebase'&&!(window._authUid&&window._authUid())){ return; } // not signed in: nothing can be sent
  if(window._syncMode==='firebase'){
    syncMarkDirty(true);
    if(navigator.onLine===false){setSyncState('error','Offline — saved on this device');return;}
    setSyncState('syncing','Saving…');
    const ok=await window._saveToFirebase(db);
    if(ok){syncMarkDirty(false);syncSetBase(db);setSyncState('ok','Saved ✓');updSyncTime();
      const dn=window._lastDenied||[]; if(dn.length){ toast("You don't have permission to change: "+dn.join(', ')+'. That part was not saved.','error'); }}
    else{setSyncState('error','Save failed — will retry');toast('Cloud save failed — kept on this device','error');}
  }
}
