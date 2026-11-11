// Post-service summary: who served, what happened that day, and one tap to log volunteer hours for the crew.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayOf=k=>{ const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(k); return m?new Date(+m[1],+m[2]-1,+m[3]):null; };
  const sameDay=(ts,d)=>{ const x=new Date(ts); return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()&&x.getDate()===d.getDate(); };
  function lastService(){
    const today=new Date(); today.setHours(0,0,0,0);
    const keys=Object.keys(db.schedules||{}).filter(k=>{ const d=dayOf(k); return d&&d<=today&&(db.schedules[k].crew||[]).length; }).sort();
    const key=keys[keys.length-1]; if(!key) return null;
    const d=dayOf(key); if((today-d)/864e5>14) return null;
    const e=db.schedules[key], ts=id=>db.technicians.find(t=>t.id===id);
    const crew=(e.crew||[]).map(id=>ts(id)).filter(Boolean).map(t=>({id:t.id,name:t.name,role:(e.roles||{})[t.id]||'',confirmed:!!(e.confirmed||{})[t.id]}));
    const outs=(db.outages||[]).filter(o=>sameDay(o.timestamp,d)), fixed=(db.outages||[]).filter(o=>o.resolvedAt&&sameDay(o.resolvedAt,d));
    const cos=(db.checkouts||[]).filter(c=>sameDay(c.checkedOutAt,d)), rets=(db.checkouts||[]).filter(c=>c.returnedAt&&sameDay(c.returnedAt,d));
    const notes=(db.serviceNotes||[]).filter(n=>n.dateKey===key);
    return {key,d,e,crew,outs,fixed,cos,rets,notes};
  }
  function hrs(){ const h=parseFloat((db.settings||{}).serviceHours); return h>0?h:3; }
  function text(s){
    const L=[]; L.push('Service summary — '+s.d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}));
    L.push('Crew: '+s.crew.map(c=>c.name+(c.role?' ('+c.role+')':'')).join(', '));
    L.push(s.outs.length?'Outages reported: '+s.outs.map(o=>o.fixtureName||o.fixtureId).join(', '):'No outages reported');
    if(s.fixed.length) L.push('Fixed: '+s.fixed.map(o=>o.fixtureName||o.fixtureId).join(', '));
    L.push('Gear: '+s.cos.length+' out, '+s.rets.length+' returned');
    s.notes.forEach(n=>L.push('Note ('+n.by+'): '+[n.wrong&&('Went wrong: '+n.wrong),n.fix&&('Fix: '+n.fix)].filter(Boolean).join(' · ')));
    return L.join('\n');
  }
  window.smCopy=function(){ const s=lastService(); if(!s) return; const t=text(s); (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Summary copied','success')).catch(()=>prompt('Copy this summary:',t)); };
  window.smLogHours=async function(){
    if(!isAdmin()){ toast('Admin permission required','error'); return; }
    const s=lastService(); if(!s||s.e.hoursLogged) return;
    const h=hrs();
    if(!confirm('Log '+h+' hours for '+s.crew.length+' crew who served on '+s.d.toLocaleDateString()+'?')) return;
    let n=0;
    for(const c of s.crew){
      const t=db.technicians.find(x=>x.id===c.id); if(!t) continue;
      const hoursLog=(t.hoursLog||[]).concat([{hours:h,note:'Sunday service'+(c.role?' — '+c.role:''),date:s.d.getTime()+12*36e5,loggedBy:(getCurTech()||{}).name||'Admin',loggedAt:Date.now(),serviceKey:s.key}]);
      const r=await techPatch(c.id,{hoursLog,volunteerHours:(t.volunteerHours||0)+h}); if(r) n++;
    }
    if(n){ db.schedules[s.key].hoursLogged={ts:Date.now(),hours:h,by:(getCurTech()||{}).name||''}; save(); toast('Logged '+h+'h for '+n+' crew','success'); renderSunday(); }
  };
  function card(){
    const s=lastService(); if(!s) return '';
    const done=s.e.hoursLogged, adm=isAdmin();
    const line=(k,v)=>`<div class="sd-row"><span style="flex:1;font-weight:600">${k}</span><span class="dim" style="font-size:13px;text-align:right">${v}</span></div>`;
    return `<div class="sd-card"><h3>Last service · ${E(s.d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))} <button class="btn bgh bsm" onclick="smCopy()">Copy</button></h3>
      ${line('Served',s.crew.length+' crew')}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px">${s.crew.map(c=>`<span class="sd-pill">${E(c.name)}${c.role?' · '+E(c.role):''}</span>`).join('')}</div>
      ${line('Outages',s.outs.length?E(s.outs.map(o=>o.fixtureName||o.fixtureId).join(', ')):'None reported')}
      ${s.fixed.length?line('Fixed',E(s.fixed.map(o=>o.fixtureName||o.fixtureId).join(', '))):''}
      ${line('Gear',s.cos.length+' out · '+s.rets.length+' returned')}
      ${s.notes.length?line('Notes',s.notes.length+' left'):''}
      ${adm?(done?`<div class="dim" style="font-size:12px;margin-top:8px">Hours logged (${done.hours}h each) by ${E(done.by)}</div>`
        :`<div style="margin-top:10px"><button class="btn ba bsm" onclick="smLogHours()">Log ${hrs()}h for everyone who served</button></div>`):''}</div>`;
  }
  const _prev=sdReadyCard; sdReadyCard=function(esc){ return _prev(esc)+card(); };
})();
