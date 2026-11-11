// ── Sync UI ──
function setSyncState(s,m){document.getElementById('sdot').className='sdot '+s;document.getElementById('stxt').textContent=m;}
window.setSyncState=setSyncState;
function updSyncTime(){document.getElementById('stime').textContent='Last sync: '+new Date().toLocaleTimeString();}
window.updSyncTime=updSyncTime;
window.addEventListener('syncStatus',e=>{const{state,msg}=e.detail;setSyncState(state,msg);if(state==='ok')updSyncTime();});

// ══════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════
let _lsSelectedId = null;

function showLoginScreen(){
  if(location.hash==='#request'||location.hash==='#external-request'){ if(typeof showExternalRequestScreen==='function') showExternalRequestScreen(); return; }
  const screen = document.getElementById('loginScreen');
  screen.style.display = 'flex';
  // Reset to step 1
  const rp=document.getElementById('ls-step2');if(rp)rp.style.display='none';
  const d1=document.getElementById('ls-dot-1'),d2=document.getElementById('ls-dot-2');
  if(d1)d1.className='ls-step-dot on';if(d2)d2.className='ls-step-dot off';
  const sl=document.getElementById('ls-step-label');if(sl)sl.textContent='Step 1 of 2 — Select your name';
  if(document.getElementById('ls-pw'))document.getElementById('ls-pw').value='';
  if(document.getElementById('ls-err'))document.getElementById('ls-err').style.display='none';
  _lsSelectedId=null;
  buildLsGrid();
}

function hideLoginScreen(){
  const screen = document.getElementById('loginScreen');
  screen.style.animation = 'none';
  screen.style.opacity = '0';
  screen.style.transition = 'opacity .25s';
  setTimeout(()=>{ screen.style.display='none'; screen.style.opacity=''; screen.style.transition=''; },250);
}

// Who can appear on the sign-in screen: the public roster from the server (names only), or the local list in offline/local mode.
function _rosterList(){
  if(window._syncMode==='firebase') return window._rosterReady?(window._roster||[]):null;
  return db.technicians.map(t=>({id:t.id,name:t.name,avatar:t.avatar,dept:t.dept,active:t.active!==false,pw:!!t.passwordHash}));
}
function buildLsGrid(){
  const grid = document.getElementById('ls-userGrid');
  const noUsers = document.getElementById('ls-noUsers');
  const firstRun = document.getElementById('ls-firstRun');
  if(!grid) return;
  const list=_rosterList();
  if(list===null){ // still connecting
    grid.innerHTML='<p class="dim" style="padding:20px 0;text-align:center">Connecting…</p>';
    if(noUsers) noUsers.style.display='none'; if(firstRun) firstRun.style.display='none';
    return;
  }
  if(!list.length){
    grid.innerHTML = '';
    if(noUsers) noUsers.style.display = 'none';
    if(firstRun) firstRun.style.display = '';
    return;
  }
  if(noUsers) noUsers.style.display = 'none';
  if(firstRun) firstRun.style.display = 'none';
  const activeTechs = list.filter(t=>t.active!==false);
  if(!activeTechs.length){
    grid.innerHTML = '<p class="dim" style="padding:20px 0;text-align:center">All crew accounts are inactive. Contact an admin.</p>';
    return;
  }
  grid.innerHTML = activeTechs.map(t=>{
    return `<div class="ls-user-btn" data-id="${esc(t.id)}" onclick="lsSelectUser('${esc(t.id)}')">
      <div class="ls-av">${esc(t.avatar||'👤')}</div>
      <div class="ls-uname">${esc((t.name||'').split(' ')[0])}</div>
      ${t.dept?`<div class="ls-dept-tag">${esc(t.dept)}</div>`:''}
    </div>`;
  }).join('');
}

function lsSelectUser(id){
  const t=(_rosterList()||[]).find(x=>x.id===id);if(!t)return;
  if(t.active===false){ toast('This account is inactive','error'); return; }
  if(!t.pw){ toast('No password has been set for this account yet — ask an admin to set one','info'); return; }
  _lsSelectedId=id;
  // Highlight selected tile
  document.querySelectorAll('.ls-user-btn').forEach(b=>b.classList.remove('selected'));
  const tile=document.querySelector('.ls-user-btn[data-id="'+id+'"]');
  if(tile) tile.classList.add('selected');
  // Show right panel
  const rp=document.getElementById('ls-step2');
  if(rp){rp.style.display='';rp.style.animation='lsSlideUp .3s ease-out';}
  // Update step dots on left
  const d1=document.getElementById('ls-dot-1'),d2=document.getElementById('ls-dot-2');
  const sl=document.getElementById('ls-step-label');
  if(d1){d1.className='ls-step-dot off';}if(d2){d2.className='ls-step-dot on';}
  if(sl) sl.textContent='Step 2 of 2 — Enter password';
  document.getElementById('ls-avatar').textContent = t.avatar||'👤';
  document.getElementById('ls-name').textContent = t.name;
  document.getElementById('ls-role').textContent = t.dept||'Crew';
  document.getElementById('ls-pw').value = '';
  document.getElementById('ls-err').style.display = 'none';
  // Focus only on non-touch devices — on iOS, programmatic focus in setTimeout is blocked
  if(!('ontouchstart' in window)){
    setTimeout(()=>document.getElementById('ls-pw').focus(), 100);
  }
}

function lsBack(){
  document.getElementById('ls-step2').style.display='none';
  document.getElementById('ls-pw').value='';
  document.getElementById('ls-err').style.display='none';
  _lsSelectedId=null;
  // Reset step dots
  const d1=document.getElementById('ls-dot-1'),d2=document.getElementById('ls-dot-2');
  const sl=document.getElementById('ls-step-label');
  if(d1){d1.className='ls-step-dot on';}if(d2){d2.className='ls-step-dot off';}
  if(sl) sl.textContent='Step 1 of 2 — Select your name';
  // Remove selected highlight from tiles
  document.querySelectorAll('.ls-user-btn').forEach(b=>b.classList.remove('selected'));
}

// The password is checked on the server. After five wrong tries the server locks that account (longer each time).
function lsShowError(e){
  const el=document.getElementById('ls-err'); if(!el) return;
  const c=String((e&&e.code)||'').replace('functions/','');
  let msg;
  if(c==='permission-denied'){ const left=e.details&&e.details.left; msg='Incorrect password — try again.'+((left!=null&&left<=2&&left>0)?' '+left+(left===1?' try':' tries')+' left.':''); }
  else msg=srvErr(e);
  el.textContent=msg; el.style.display='block';
}
let _lsBusy=false;
async function lsSubmit(){
  if(_lsBusy) return;
  const id=_lsSelectedId;
  if(!id){ lsBack(); toast('Please select your name again','info'); return; }
  const pw = document.getElementById('ls-pw').value;
  if(!pw) return;
  if(window._syncMode!=='firebase'||!window._kccLogin){ lsShowError({message:'Sign-in needs the internet connection'}); return; }
  _lsBusy=true;
  try{
    const r=await window._kccLogin(id,pw);
    document.getElementById('ls-pw').value='';
    lsLogin(id,r&&r.role);
  }catch(e){
    document.getElementById('ls-pw').value='';
    lsShowError(e);
    const card = document.getElementById('ls-step2');
    card.style.animation = 'none';
    card.style.transform = 'translateX(-8px)';
    setTimeout(()=>{ card.style.transition='transform .1s'; card.style.transform='translateX(8px)'; },80);
    setTimeout(()=>{ card.style.transform='translateX(-4px)'; },160);
    setTimeout(()=>{ card.style.transform='translateX(0)'; card.style.transition=''; },240);
    try{ document.getElementById('ls-pw').focus(); }catch(_){}
  }finally{ _lsBusy=false; }
}

function lsLogin(id){
  _techId = id;
  try{ localStorage.setItem(TECH_KEY, id); }catch(e){}
  updTechUI();
  applyPermissions();
  hideLoginScreen();
  go(homePage()); // role-based landing page; the role comes from the sign-in token until crew data arrives
}
// Pick up an existing signed-in session (page reloaded, app reopened).
function resumeSession(id){
  _techId=id; try{localStorage.setItem(TECH_KEY,id);}catch(e){}
  updTechUI(); applyPermissions();
  const ls=document.getElementById('loginScreen'), hs=document.getElementById('homeScreen');
  if(ls) ls.style.display='none'; if(hs) hs.style.display='none';
  go(homePage());
}

// ── Home Screen ──
// The old welcome screen is retired: after sign-in everyone goes straight to their role's landing page.
function showHomeScreen(){ const hs=document.getElementById('homeScreen'); if(hs) hs.style.display='none'; if(getCurTech()) go(homePage()); else showLoginScreen(); }

function hideHomeScreen(){
  const el = document.getElementById('homeScreen');
  el.style.opacity = '0';
  el.style.transition = 'opacity .2s';
  setTimeout(()=>{ el.style.display='none'; el.style.opacity=''; el.style.transition=''; },200);
}

function hsGo(page){
  hideHomeScreen();
  go(page);
}

function lsForgot(){
  alert('Ask your Master Admin or User Admin to reset your password on the Crew page.');
}

// Sign out for real: end the server session, wipe this device's copy of the data, and start the page fresh.
async function lsLogout(msg){
  try{ if(typeof syncIsDirty==='function'&&syncIsDirty()&&window._syncMode==='firebase'&&navigator.onLine) await save(); }catch(e){}
  if(typeof syncIsDirty==='function'&&syncIsDirty()&&!confirm('Some changes have not reached the cloud yet and will be lost if you sign out. Sign out anyway?')) return;
  if(window._kccSignOut) await window._kccSignOut();
  try{ [TECH_KEY,LS_KEY,'slt_sync_base','slt_sync_dirty'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  try{ if(typeof msg==='string'&&msg) sessionStorage.setItem('kcc_msg',msg); }catch(e){}
  location.reload();
}

// Update login screen sync status
window.addEventListener('syncStatus', e=>{
  const el = document.getElementById('ls-syncStatus');
  if(el) el.textContent = e.detail.msg;
  if(e.detail.state==='ok'){
    // Rebuild login grid in case technicians just arrived from Firebase
    buildLsGrid();
    // If a session is already active, refresh home screen Sunday preview with fresh data
    if(_techId && getCurTech()){
      const hs = document.getElementById('homeScreen');
      if(hs && hs.style.display !== 'none') showHomeScreen();
    }
  }
});
