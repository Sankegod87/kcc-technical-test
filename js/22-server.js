// ══════════════════════════════════════════════════
// SERVER-SIDE SIGN-IN GLUE
// Sign-in, crew accounts, the YouTube key and the public request form all go through Cloud Functions.
// Browsers never see password hashes. See kcc-auth-core.js.
// ══════════════════════════════════════════════════
window._localDb=function(){return db;};

// Turn a Cloud Function error into a short message people can act on.
function srvErr(e){
  const c=String((e&&e.code)||'').replace('functions/','');
  if(c==='resource-exhausted'&&e.details&&e.details.retryAfter) return 'Too many tries — wait '+e.details.retryAfter+'s';
  if(!navigator.onLine||c==='unavailable'||c==='deadline-exceeded') return 'No connection — this needs the internet';
  if(c==='internal') return 'Server error — please try again';
  return (e&&e.message&&!/^(internal|unknown)$/i.test(e.message))?e.message:'Something went wrong';
}
function needCloud(){ if(window._syncMode!=='firebase'||!window._kccTechOp){toast('This needs the cloud connection','error');return false;} return true; }

// Run a crew/account action on the server, then pull the fresh crew list so the screen updates at once.
async function techCall(payload){
  if(!needCloud()) return null;
  try{ const r=await window._kccTechOp(payload); await refreshTechs(); return r||{ok:true}; }
  catch(e){ toast(srvErr(e),'error'); return null; }
}
async function refreshTechs(){
  try{
    const list=await window._fetchKey('technicians');
    if(list){ db.technicians=list; lsave(); try{ const b=syncGetBase(); if(b){b.technicians=list;syncSetBase(b);} }catch(e){} }
  }catch(e){}
}
// Pull one document fresh after a server action so the screen shows it at once.
async function refreshKey(k){
  try{
    const v=await window._fetchKey(k);
    if(v!==null&&v!==undefined){ db[k]=v; lsave(); try{ const b=syncGetBase(); if(b){b[k]=JSON.parse(JSON.stringify(v));syncSetBase(b);} }catch(e){} }
  }catch(e){}
}
// Small edits to one person's profile (training progress, certificates, own phone number...).
function techPatch(id,fields){ return techCall({op:'patch',id,fields}); }

// The signed-in person is whoever the server token says. Keep the app in step with it.
window.addEventListener('authChanged',function(){
  const uid=window._authUid&&window._authUid();
  if(uid){
    if(_techId!==uid){ _techId=uid; try{localStorage.setItem(TECH_KEY,uid);}catch(e){} }
    if(db.technicians.some(t=>t.id===uid)&&document.getElementById('loginScreen')?.style.display==='flex'&&typeof resumeSession==='function') resumeSession(uid);
  } else if(_techId){
    _techId=null; try{localStorage.removeItem(TECH_KEY);}catch(e){}
    updTechUI(); applyPermissions(); showLoginScreen();
  }
});
window.addEventListener('rosterChanged',function(){ if(typeof buildLsGrid==='function') buildLsGrid(); });
// A message to show after a forced sign-out reloads the page.
try{ const m=sessionStorage.getItem('kcc_msg'); if(m){ sessionStorage.removeItem('kcc_msg'); setTimeout(()=>toast(m,'info'),1200); } }catch(e){}

// The public request form needs no sign-in, so show it as soon as the page is ready (nothing else will trigger it).
function _showExtIfRequested(){ if((location.hash==='#request'||location.hash==='#external-request')&&typeof showExternalRequestScreen==='function') showExternalRequestScreen(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_showExtIfRequested); else _showExtIfRequested();
window.addEventListener('hashchange',_showExtIfRequested);

// One-tap confirm link from a call-sheet email: ?confirm=DATE&tech=ID&sig=SIGNATURE. No sign-in needed.
function _kccConfirmPage(icon,title,text){
  let o=document.getElementById('confirmOverlay');
  if(!o){ o=document.createElement('div'); o.id='confirmOverlay'; o.style.cssText='position:fixed;inset:0;z-index:3000;background:var(--bg,#0d1117);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center'; document.body.appendChild(o); }
  o.innerHTML='<div style="max-width:380px"><div style="font-size:56px;margin-bottom:12px">'+icon+'</div><h2 style="margin:0 0 8px">'+esc(title)+'</h2><p class="dim" style="margin:0 0 20px">'+esc(text)+'</p><button class="btn ba" onclick="document.getElementById(\'confirmOverlay\').remove()">Open KCC Technical</button></div>';
}
async function kccPublicConfirm(p){
  _kccConfirmPage('⏳','Confirming…','One moment.');
  for(let i=0;i<80&&!(window._syncMode==='firebase'&&window._kccConfirmLink);i++) await new Promise(r=>setTimeout(r,100));
  if(!window._kccConfirmLink){ _kccConfirmPage('⚠️','Could not reach the server','Check your connection and open the link again.'); return; }
  try{
    const r=await window._kccConfirmLink({key:p.key,tech:p.tech,sig:p.sig});
    _kccConfirmPage('✅',"You're confirmed"+(r&&r.name?', '+r.name:''),'See you Sunday. You can close this page.');
  }catch(e){ _kccConfirmPage('⚠️','Could not confirm',srvErr(e)); }
}
function _kccCheckConfirmLink(){
  const p=window._sdPending;
  if(p&&p.act==='confirm'&&p.sig&&p.tech){ window._sdPending=null; kccPublicConfirm(p); }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_kccCheckConfirmLink); else _kccCheckConfirmLink();
