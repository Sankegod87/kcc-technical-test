// ══════════════════════════════════════════════════
// PERMISSION SYSTEM
// 👑 master  — full access, only 1
// 🔑 admin   — manage crew/fixtures/inventory/schedule
// 👤 user    — report outages, replacements, receive bulbs
// ══════════════════════════════════════════════════
function curRole(){
  const t=getCurTech();
  if(!t) return 'user';
  return t.userRole||'user';
}
function isMaster(){ return curRole()==='master'; }
// Admins land on the Control Room; everyone else lands on Service Day.
function homePage(){
  const c=window._authClaims&&window._authClaims().r;
  if(!getCurTech()&&c) return c==='user'?'sunday':'dashboard'; // crew data not here yet: trust the sign-in token
  return isAdmin()?'dashboard':'sunday';
}
function isAdmin(){  return curRole()==='admin' || isMaster(); }
function isUser(){   return true; } // everyone can do basic actions

// Show/hide elements based on role
function applyPermissions(){
  const master = isMaster();
  const admin  = isAdmin();
  // Master-only buttons
  document.querySelectorAll('[data-perm="master"]').forEach(el=>{
    el.style.display = master ? '' : 'none';
  });
  // Admin+ buttons
  document.querySelectorAll('[data-perm="admin"]').forEach(el=>{
    el.style.display = admin ? '' : 'none';
  });
}

// Admin sessions end after 45 minutes with no activity, so a phone or laptop left open does not stay in admin mode.
(function(){
  const LIMIT=45*60000; let last=Date.now();
  ['pointerdown','keydown','touchstart','scroll'].forEach(ev=>addEventListener(ev,()=>{last=Date.now();},{passive:true}));
  setInterval(()=>{
    try{
      if(!_techId||!isAdmin()) return;
      if(Date.now()-last>LIMIT){ last=Date.now(); if(typeof lsLogout==='function'){ lsLogout('Signed out after 45 minutes of no activity'); } }
    }catch(e){}
  },30000);
})();
