// Handheld / keyboard-wedge scanner support on the Scan page. A scanner that "types" the code and presses Enter
// (USB, Bluetooth or a PC/phone cradle) just works: every scan is looked up on its own, the scan box stays ready,
// and the last scans are listed underneath. Typing a code by hand and pressing Enter does the same.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window._scanLog=window._scanLog||[];
  let ctx=null;
  function beep(ok){
    try{ ctx=ctx||new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(), g=ctx.createGain();
      o.frequency.value=ok?1200:300; g.gain.value=.08; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+(ok?.08:.25)); }catch(e){}
  }
  function kind(code){
    if(typeof ssFind==='function'){ const h=ssFind(code); if(h) return h.type==='fixture'?'Fixture '+h.obj.name:'Gear '+(h.obj.name||h.obj.id); }
    const b=(db.bulbRegistry||[]).find(x=>x.bulbId===code); if(b) return 'Bulb '+b.bulbType;
    return '';
  }
  function paintLog(){
    const el=document.getElementById('scan-recent'); if(!el) return;
    el.innerHTML=window._scanLog.length?'<div class="dim" style="font-size:12px;margin:10px 0 4px">Recent scans</div>'+window._scanLog.slice(0,8).map(s=>
      '<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="font-family:var(--mono)">'+E(s.code)+'</span><span style="color:'+(s.what?'var(--green)':'var(--red)')+'">'+E(s.what||'Not found')+'</span></div>').join(''):'';
  }
  window.scanSubmitTyped=function(){
    const inp=document.getElementById('manualId'); if(!inp) return;
    const code=(inp.value||'').trim().toUpperCase().replace(/[\r\n\t]/g,''); if(!code) return;
    const what=kind(code);
    window._scanLog.unshift({code,what,t:Date.now()}); window._scanLog=window._scanLog.slice(0,30);
    beep(!!what); paintLog();
    handleScannedCode(code);
  };
  function focusBox(){ const i=document.getElementById('manualId'); if(i&&typeof _curPage!=='undefined'&&_curPage==='scan'){ try{ i.focus(); i.select(); }catch(e){} } }
  window.addEventListener('DOMContentLoaded',()=>{
    const inp=document.getElementById('manualId');
    if(inp){
      inp.setAttribute('inputmode','text'); inp.setAttribute('enterkeyhint','go');
      inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); scanSubmitTyped(); } });
      if(!document.getElementById('scan-recent')){ const d=document.createElement('div'); d.id='scan-recent'; inp.parentNode.parentNode.insertBefore(d,inp.parentNode.nextSibling); }
      const lab=inp.parentNode.querySelector('label'); if(lab) lab.textContent='Scan or type a code, then press Enter';
    }
    // A scanner types while nothing is focused: send those keystrokes to the scan box.
    document.addEventListener('keydown',e=>{
      if(typeof _curPage==='undefined'||_curPage!=='scan') return;
      const a=document.activeElement, tag=a&&a.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.ctrlKey||e.metaKey||e.altKey) return;
      const box=document.getElementById('manualId'); if(!box) return;
      if(e.key.length===1){ box.focus(); box.value+=e.key.toUpperCase(); e.preventDefault(); }
      else if(e.key==='Enter'&&box.value){ e.preventDefault(); scanSubmitTyped(); }
    });
    const _go=go; go=function(p){ const r=_go.apply(this,arguments); if(p==='scan'){ setTimeout(focusBox,120); paintLog(); } return r; };
    const _close=closeScanSheet; closeScanSheet=function(){ const r=_close.apply(this,arguments); setTimeout(focusBox,150); return r; };
  });
})();
