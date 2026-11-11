// Station manuals: a module with stations:[...] shows as "the manual" on that station's checklist card on Service Day,
// with its links, your progress, and a button into Training.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lk=u=>{ u=String(u||'').trim(); return /^manuals\/[\w.-]+\.pdf$/i.test(u)?u:safeUrl(u); };
  function stationNow(){
    const me=getCurTech(), key=schedKey(sdNextSunday()), entry=(db.schedules||{})[key]||{}, roles=getScheduleRoles();
    const mine=me&&entry.roles?entry.roles[me.id]:null;
    return window._sdStation||mine||(roles[0]&&roles[0].name)||'';
  }
  window.smStationOpen=function(id){ go('training'); setTimeout(()=>{ try{ toggleTmBody(id); const b=document.getElementById('tmb-'+id); if(b&&!b.classList.contains('open')) toggleTmBody(id); b&&b.scrollIntoView({block:'center'}); }catch(e){} },150); };
  function paint(){
    const root=document.getElementById('sundayRoot'); if(!root) return;
    const st=stationNow(); if(!st) return;
    const mods=(db.trainingModules||[]).filter(m=>(m.stations||[]).includes(st)); if(!mods.length) return;
    const card=[...root.querySelectorAll('.sd-card')].find(c=>/checklist/i.test((c.querySelector('h3')||{}).textContent||'')); if(!card||card.querySelector('.sm-box')) return;
    const me=getCurTech(), done=(me&&me.completedModules)||[];
    const html='<div class="sm-box" style="margin:0 0 10px;padding:10px 12px;background:var(--s2);border-radius:10px;font-size:13px">'+mods.map(m=>{
      const links=[].concat(m.url?[{label:'Manual',url:m.url}]:[],m.links||[]).filter(l=>lk(l.url));
      const ok=done.includes(m.id);
      return `<div style="margin:2px 0"><b>📘 ${E(m.title)}</b> ${ok?'<span style="color:#2DD4A0">✓ trained</span>':'<span class="dim">not completed yet</span>'}<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:3px">${links.map(l=>`<a href="${E(lk(l.url))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">${E(l.label||'Open')} →</a>`).join('')}<a href="#" onclick="smStationOpen('${E(m.id)}');return false" style="color:var(--blue)">Quiz &amp; practical →</a></div></div>`;
    }).join('')+'</div>';
    const h3=card.querySelector('h3'); if(h3) h3.insertAdjacentHTML('afterend',html);
  }
  window.addEventListener('DOMContentLoaded',()=>{ const _rs=renderSunday; renderSunday=function(){ const r=_rs.apply(this,arguments); try{paint();}catch(e){console.warn(e);} return r; }; });
})();
