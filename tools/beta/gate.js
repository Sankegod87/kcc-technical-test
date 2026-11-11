// Goes into the OLD app's page. Shows a small "Beta" link; the right password unlocks the new version on this device only.
// The password hash below is filled in by build-site.js.
(function(){
  var HASH='__HASH__', FLAG='kcc_beta';
  function go(){ location.href='v2/'; }
  try{ if(localStorage.getItem(FLAG)==='1'){ go(); return; } }catch(e){}
  async function sha(t){ var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0');}).join(''); }
  function add(){
    var a=document.createElement('a'); a.href='#'; a.textContent='β'; a.title='Beta access';
    a.style.cssText='position:fixed;right:6px;bottom:4px;z-index:2147483000;font:11px sans-serif;color:#888;opacity:.35;text-decoration:none;padding:6px';
    a.onclick=async function(e){ e.preventDefault(); var p=prompt('Beta password'); if(!p) return;
      if(!(window.crypto&&crypto.subtle)){ alert('Beta needs a secure (https) page'); return; }
      if(await sha(p)===HASH){ try{localStorage.setItem(FLAG,'1');}catch(x){} go(); } else alert('Wrong password'); };
    document.body.appendChild(a);
  }
  if(document.body) add(); else document.addEventListener('DOMContentLoaded',add);
})();
