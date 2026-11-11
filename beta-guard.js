// Beta guard. Only active when firebase-config.js sets KCC_REQUIRE_BETA (the side-by-side beta site).
// Anyone who did not unlock the beta from the old app's "Beta" link is sent back to the old app.
(function(){
  if(!window.KCC_REQUIRE_BETA) return;
  var ok=false; try{ ok=localStorage.getItem('kcc_beta')==='1'; }catch(e){}
  if(!ok){ location.replace('../'); return; }
  window.kccLeaveBeta=function(){ try{localStorage.removeItem('kcc_beta');}catch(e){} location.replace('../'); };
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.createElement('button'); b.textContent='β Leave beta'; b.onclick=window.kccLeaveBeta;
    b.style.cssText='position:fixed;left:8px;bottom:8px;z-index:9000;font:11px sans-serif;padding:4px 8px;border-radius:12px;border:1px solid #888;background:rgba(0,0,0,.55);color:#ddd;opacity:.7;cursor:pointer';
    document.body.appendChild(b);
  });
})();
