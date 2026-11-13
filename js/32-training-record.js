// 1) Performance notes: admin-only, kept on the server (not in the shared crew list).
// 2) Training record: a printable file per person with quiz passes, practical results, trainer notes, certificates, hours and (for admins) performance notes.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const D=ts=>ts?new Date(ts).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'';
  const PN={}; // private notes cache: techId -> [note]
  const hasQuiz=m=>!!(m&&m.quiz&&m.quiz.qs&&m.quiz.qs.length), hasPrac=m=>!!(m&&m.practical&&m.practical.items&&m.practical.items.length);

  // ── performance notes ──
  async function loadNotes(id,force){
    if(!isAdmin()) return [];
    if(!force&&PN[id]) return PN[id];
    try{ const r=await window._kccNotesGet(id); PN[id]=r.notes||[]; }catch(e){ PN[id]=[]; }
    return PN[id];
  }
  window.savePerfNote=async function(){
    if(!isAdmin()){ toast('Admin only','error'); return; }
    const id=document.getElementById('pn-techId').value, t=db.technicians.find(x=>x.id===id); if(!t) return;
    const text=(document.getElementById('pn-text').value||'').trim(); if(!text){ toast('Enter a note','error'); return; }
    if(!needCloud()) return;
    try{ const r=await window._kccNoteAdd({id,text,type:document.getElementById('pn-type').value}); (PN[id]=PN[id]||[]).unshift(r.note); }catch(e){ toast(srvErr(e),'error'); return; }
    try{ logAudit('Performance Note','Note added for '+t.name); }catch(e){}
    document.getElementById('m-perfNote').style.display='none'; openProfile(id); toast('Note saved for '+t.name,'success');
  };
  window.deletePerfNote=async function(techId,noteId){
    if(!isAdmin()) return; if(!needCloud()) return;
    try{ await window._kccNoteDel({id:techId,noteId}); PN[techId]=(PN[techId]||[]).filter(n=>n.id!==noteId); }catch(e){ toast(srvErr(e),'error'); return; }
    openProfile(techId); toast('Note deleted','info');
  };

  // ── the record ──
  function build(t,notes,forAdmin){
    const mods=db.trainingModules||[], done=t.completedModules||[], org='KCC Technical';
    const rows=mods.map(m=>{
      const att=((t.practicals||{})[m.id])||[], pass=att.find(a=>a.passed), last=att[0];
      const q=!hasQuiz(m)?'<span class="mu">n/a</span>':(t.quizPassed||[]).includes(m.id)?'<b class="ok">Passed</b>':'<span class="mu">Not yet</span>';
      const p=!hasPrac(m)?'<span class="mu">n/a</span>':pass?`<b class="ok">Signed off</b><br><small>${E(D(pass.ts))} · ${E(pass.by)} · ${pass.pct}%</small>`:last?`<b class="wn">Needs work</b><br><small>${E(D(last.ts))} · ${E(last.by)} · ${last.pct}%</small>`:'<span class="mu">Not yet</span>';
      const c=done.includes(m.id);
      return `<tr><td>${E(m.title)}${m.required?' <small class="rq">required</small>':''}</td><td>${q}</td><td>${p}</td><td>${c?'<b class="ok">✓ Complete</b>':'<span class="mu">In progress</span>'}</td></tr>`;
    }).join('');
    const detail=mods.filter(m=>hasPrac(m)&&((t.practicals||{})[m.id]||[]).length).map(m=>{
      const att=t.practicals[m.id];
      return `<h3>${E(m.title)} — practical attempts</h3>`+att.map(a=>{
        const items=m.practical.items, ok=a.res&&a.res.length===items.length;
        return `<div class="att"><div><b class="${a.passed?'ok':'wn'}">${a.passed?'Passed':'Needs work'}</b> · ${a.pct}% · ${E(D(a.ts))} · trainer ${E(a.by)}</div>`+
          (ok?'<ul>'+items.map((it,i)=>`<li class="${a.res[i]?'ok':'wn'}">${a.res[i]?'✓':'✕'} ${E(it.text)}${it.critical?' <small>(must pass)</small>':''}</li>`).join('')+'</ul>':'')+
          (a.notes?`<div class="note">Trainer's note: ${E(a.notes)}</div>`:'')+'</div>';
      }).join('');
    }).join('');
    const certs=(t.certs||[]).map(c=>`<li>${E(c.name)}${c.issuer?' — '+E(c.issuer):''}${c.date?' · earned '+E(c.date):''}${c.expiry?' · expires '+E(c.expiry):''}</li>`).join('');
    const hrs=[...(t.hoursLog||[])].reverse().slice(0,12).map(h=>`<li>+${E(h.hours)}h ${h.note?'· '+E(h.note):''} <small>${E(D(h.date))}</small></li>`).join('');
    const pn=forAdmin?`<h2>Performance notes <small class="rq">admin only</small></h2>`+((notes||[]).length?(notes.map(n=>`<div class="att"><div><b>${E(({positive:'Positive',constructive:'Constructive',neutral:'Note'})[n.type]||'Note')}</b> · ${E(D(n.at))} · ${E(n.by)}</div><div>${E(n.text)}</div></div>`).join('')):'<p class="mu">None.</p>'):'';
    const nDone=mods.filter(m=>done.includes(m.id)).length;
    const body=`<div class="rec"><div class="hd"><div class="org">${E(org)} · Training record</div><h1>${E(t.name)}</h1><div class="mu">${E([t.role,t.dept].filter(Boolean).join(' · '))} · generated ${E(D(Date.now()))}</div></div>
      <div class="sum"><b>${nDone} of ${mods.length}</b> modules complete · <b>${E(t.volunteerHours||0)}</b> volunteer hours${(t.training||[]).length?' · skills: '+E((t.training||[]).join(', ')):''}</div>
      <h2>Modules</h2><table><tr><th>Module</th><th>Quiz</th><th>Practical</th><th>Status</th></tr>${rows||'<tr><td colspan="4" class="mu">No modules yet.</td></tr>'}</table>
      ${detail?'<h2>Practical details</h2>'+detail:''}
      <h2>Certifications</h2>${certs?'<ul>'+certs+'</ul>':'<p class="mu">None.</p>'}
      <h2>Volunteer hours</h2>${hrs?'<ul>'+hrs+'</ul>':'<p class="mu">None logged.</p>'}${pn}</div>`;
    return body;
  }
  const CSS='.rec{font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#111;background:#fff;max-width:780px;margin:0 auto;padding:24px}.rec h1{margin:2px 0;font-size:26px}.rec h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #0F6E56;padding-bottom:3px;margin:22px 0 8px}.rec h3{font-size:14px;margin:14px 0 4px}.org{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#0F6E56;font-weight:700}.mu{color:#777}.ok{color:#0F6E56}.wn{color:#B45309}.rq{color:#999;font-weight:400}.sum{margin-top:8px;padding:8px 12px;background:#f1f6f4;border-radius:6px}.rec table{width:100%;border-collapse:collapse}.rec th,.rec td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}.rec th{font-size:12px;color:#555}.att{border-left:3px solid #ccc;padding:2px 10px;margin:8px 0}.att ul{margin:4px 0 4px 18px;padding:0}.note{font-style:italic;color:#444}.rec small{font-size:11px}@media print{.rec{padding:0}.pb{page-break-before:always}}';
  const doc=(inner,title)=>'<!doctype html><html><head><meta charset="utf-8"><title>'+E(title)+'</title><style>body{margin:0;background:#fff}'+CSS+'</style></head><body>'+inner+'</body></html>';
  const fname=(t)=>'training-record-'+String(t.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+new Date().toISOString().slice(0,10)+'.html';
  function save(name,html){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); }
  const canSee=id=>{ const me=getCurTech(); return isAdmin()||(me&&me.id===id); };

  window.trRecord=async function(id){
    const t=db.technicians.find(x=>x.id===id); if(!t||!canSee(id)) return;
    const adm=isAdmin(), notes=adm?await loadNotes(id,true):[];
    window._trCur={id,html:doc(build(t,notes,adm),t.name+' — training record')};
    const o=document.createElement('div'); o.id='tr-ov'; o.className='mover'; o.style.cssText='display:flex;z-index:9100';
    o.innerHTML=`<div class="modal" style="max-width:860px;width:100%"><div class="mh"><span class="mt">Training record · ${E(t.name)}</span><button class="xb" onclick="document.getElementById('tr-ov').remove()">✕</button></div>
      <div class="mb" style="max-height:70vh;overflow:auto;background:#fff;padding:0"><style>${CSS}</style>${build(t,notes,adm)}</div>
      <div class="mf"><button class="btn bgh" onclick="trPrint()">🖨 Print / PDF</button><button class="btn ba" onclick="trDownload()">⬇ Download file</button></div></div>`;
    document.body.appendChild(o);
  };
  window.trDownload=function(){ const c=window._trCur, t=db.technicians.find(x=>x.id===c.id); if(t) save(fname(t),c.html); };
  window.trPrint=function(){ const pa=document.getElementById('printArea'), c=window._trCur; const m=/<body>([\s\S]*)<\/body>/.exec(c.html); pa.innerHTML='<style>'+CSS+'</style>'+(m?m[1]:''); setTimeout(()=>window.print(),200); };
  window.trDownloadAll=async function(){
    if(!isAdmin()) return; let all={}; try{ all=(await window._kccNotesGet()).all||{}; }catch(e){ toast('Could not load notes: '+srvErr(e),'error'); return; }
    const people=(db.technicians||[]).filter(isTechActive);
    const inner=people.map((t,i)=>(i?'<div class="pb"></div>':'')+build(t,all[t.id]||[],true)).join('');
    save('training-records-all-'+new Date().toISOString().slice(0,10)+'.html',doc(inner,'All training records')); toast('Downloaded '+people.length+' records','success');
  };

  // buttons + notes cache hooks, once all scripts are loaded
  window.addEventListener('DOMContentLoaded',()=>{
    const _rp=renderProfiles;
    renderProfiles=function(){
      const id=window._openProfileId, t=id&&(db.technicians||[]).find(x=>x.id===id);
      if(t&&isAdmin()){ if(PN[id]) t.perfNotes=PN[id]; else loadNotes(id).then(()=>{ if(window._openProfileId===id&&_curPage==='profiles') renderProfiles(); }); }
      let r; try{ r=_rp.apply(this,arguments); } finally{ if(t) delete t.perfNotes; }
      try{ const d=document.getElementById('profile-detail'); if(d&&t&&canSee(id)&&!d.querySelector('#tr-bar')){ d.insertAdjacentHTML('afterbegin',`<div id="tr-bar" style="margin-bottom:12px"><button class="btn ba bsm" onclick="trRecord('${E(id)}')">📄 Training record</button></div>`); } }catch(e){}
      return r;
    };
    const _rt=renderTraining;
    renderTraining=function(){ const r=_rt.apply(this,arguments); try{ const bar=document.querySelector('#pg-training > .row'); if(bar&&isAdmin()&&!document.getElementById('tr-all')){ const b=document.createElement('button'); b.id='tr-all'; b.className='btn bgh'; b.textContent='⬇ All records'; b.onclick=trDownloadAll; (bar.querySelector('.row.gap8')||bar).insertBefore(b,(bar.querySelector('.row.gap8')||bar).firstChild); } }catch(e){} return r; };
  });
})();
