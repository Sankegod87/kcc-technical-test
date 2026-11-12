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
  // Master admin only: download a full copy of the app's data as a file (a backup, and the input for the migration test).
  window.kccBackupDownload=function(){
    try{
      var src=(typeof db!=='undefined'?db:null); if(!src||!Array.isArray(src.technicians)||!src.technicians.length){ alert('Backup stopped: the app data is not loaded yet. Wait for it to finish loading, then try again.'); return; }
      var data=JSON.stringify(src), d=new Date().toISOString().slice(0,10);
      var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
      a.download='kcc-backup-'+d+'.json'; document.body.appendChild(a); a.click(); a.remove();
      if(typeof toast==='function') toast('Backup downloaded. It contains password hashes: keep the file private.','success');
    }catch(e){ alert('Backup failed: '+e.message); }
  };
  function addBackup(){
    var b=document.createElement('button'); b.id='kcc-backup-btn'; b.textContent='💾 Backup';
    b.style.cssText='position:fixed;right:34px;bottom:4px;z-index:2147483000;font:11px sans-serif;color:#9aa;background:none;border:1px solid #556;border-radius:10px;padding:3px 8px;opacity:.6;cursor:pointer;display:none';
    b.onclick=window.kccBackupDownload; document.body.appendChild(b);
    setInterval(function(){ var ok=false; try{ ok=(typeof isMaster==='function'&&isMaster()); }catch(e){} b.style.display=ok?'':'none'; },1500);
  }
  if(document.body){ add(); addBackup(); } else document.addEventListener('DOMContentLoaded',function(){ add(); addBackup(); });
})();
