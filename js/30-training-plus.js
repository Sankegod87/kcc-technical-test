// Training modules, extended: manual links, linked gear, a short quiz, and a practical "driving test" that a trainer scores.
// Module fields:  links:[{label,url}]  gearIds:[id]  quiz:{pass,qs:[{q,opts,a}]}  practical:{pass,items:[{text,critical}]}
// Person fields (kept by the server): quizPassed:[modId]  practicals:{modId:[{ts,by,byId,res:[1|0],pct,passed,notes}]}  completedModules:[modId]
// A module is complete when its quiz (if any) is passed AND its practical (if any) is passed by a trainer.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // links may be https addresses or a PDF shipped with the app in manuals/
  const lk=u=>{ u=String(u||'').trim(); return /^manuals\/[\w.-]+\.pdf$/i.test(u)?u:safeUrl(u); };
  const mod=id=>(db.trainingModules||[]).find(m=>m.id===id);
  const hasQuiz=m=>!!(m&&m.quiz&&m.quiz.qs&&m.quiz.qs.length);
  const hasPrac=m=>!!(m&&m.practical&&m.practical.items&&m.practical.items.length);
  const fd=ts=>new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  const overlay=(id,inner)=>{ closeOv(id); const o=document.createElement('div'); o.id=id; o.className='mover'; o.style.cssText='display:flex;z-index:9100'; o.innerHTML='<div class="modal" style="max-width:600px;width:100%">'+inner+'</div>'; document.body.appendChild(o); return o; };
  const closeOv=id=>{ const o=document.getElementById(id); if(o) o.remove(); };
  window.closeOv_tq=closeOv;
  function st(m,t){
    const qp=!!t&&(t.quizPassed||[]).includes(m.id), att=(t&&t.practicals&&t.practicals[m.id])||[], pp=att.some(a=>a.passed), complete=!!t&&(t.completedModules||[]).includes(m.id);
    return {qp,pp,att,complete,quizOk:!hasQuiz(m)||qp,pracOk:!hasPrac(m)||pp};
  }

  // ── what people see inside a module ──
  function extras(m,me){
    const s=st(m,me);
    const links=(m.links||[]).filter(l=>lk(l.url)).map(l=>`<div class="tm-resource"><span style="font-size:18px">📘</span><a href="${E(lk(l.url))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-size:13px">${E(l.label||'Manual')} →</a></div>`).join('');
    const gear=(m.gearIds||[]).map(id=>(db.gearItems||[]).find(g=>g.id===id)).filter(Boolean);
    const gearHtml=gear.length?`<div class="dim" style="font-size:12px;margin:8px 0 4px">Covers this gear:</div><div style="display:flex;gap:6px;flex-wrap:wrap">${gear.map(g=>`<span class="badge blow">${E(g.name)}</span>`).join('')}</div>`:'';
    let q='';
    if(hasQuiz(m)) q=`<div style="margin-top:12px"><b style="font-size:13px">1. Quiz</b> ${s.qp?'<span style="color:#2DD4A0">✓ passed</span>':''}<div style="margin-top:6px"><button class="btn ${s.qp?'bgh':'ba'} bsm" onclick="tqStart('${E(m.id)}')">📝 ${s.qp?'Retake':'Take'} the quiz (${m.quiz.qs.length} questions, pass ${m.quiz.pass||80}%)</button></div></div>`;
    let p='';
    if(hasPrac(m)){
      const last=s.att[0], pass=m.practical.pass||80;
      const status=s.pp?`<span style="color:#2DD4A0">✓ signed off ${E(fd(s.att.find(a=>a.passed).ts))} by ${E(s.att.find(a=>a.passed).by)}</span>`
        :last?`<span style="color:#FBBF24">Needs work (${E(fd(last.ts))}, ${E(last.by)}, ${last.pct}%)</span>${last.notes?'<div class="dim" style="font-size:12px;margin-top:2px">“'+E(last.notes)+'”</div>':''}`:'<span class="dim">Not assessed yet</span>';
      p=`<div style="margin-top:12px"><b style="font-size:13px">${hasQuiz(m)?'2. ':''}Practical (a trainer watches you do it)</b> ${status}
        <ul style="margin:6px 0 0 18px;padding:0;font-size:13px">${m.practical.items.map(i=>`<li>${E(i.text)}${i.critical?' <span style="color:#FF8A80;font-size:11px">must pass</span>':''}</li>`).join('')}</ul>
        <div class="dim" style="font-size:11px;margin-top:4px">Pass mark ${pass}% and every “must pass” item.</div>
        ${isAdmin()?`<div style="margin-top:6px"><button class="btn ba bsm" onclick="tqEval('${E(m.id)}')">🧑‍🏫 Evaluate someone</button></div>`:''}${isAdmin()?results(m):''}</div>`;
    }
    return links+gearHtml+q+p;
  }
  function results(m){
    const rows=(db.technicians||[]).filter(t=>isTechActive(t)&&(t.practicals||{})[m.id]).map(t=>{ const a=t.practicals[m.id][0]; return `<div class="dim" style="font-size:12px">${E(t.name)}: ${a.passed?'<span style="color:#2DD4A0">passed</span>':'<span style="color:#FBBF24">needs work</span>'} ${a.pct}% · ${E(fd(a.ts))} · ${E(a.by)}</div>`; }).join('');
    return rows?`<div style="margin-top:6px">${rows}</div>`:'';
  }
  function decorate(){
    const me=getCurTech();
    (db.trainingModules||[]).forEach(m=>{
      const body=document.getElementById('tmb-'+m.id); if(!body||body.dataset.tq) return; body.dataset.tq='1';
      const acts=body.querySelector('div[style*="margin-top:10px"][style*="display:flex"]');
      const wrap=document.createElement('div'); wrap.innerHTML=extras(m,me);
      if(acts) body.insertBefore(wrap,acts); else body.appendChild(wrap);
      const hd=body.parentNode.querySelector('.tm-header .row.gap6.mb8');
      if(hd){ if(hasQuiz(m)) hd.insertAdjacentHTML('beforeend','<span style="background:#E6F1FB;color:#0C447C;border-radius:20px;padding:2px 8px;font-size:9px;font-family:var(--mono);font-weight:600">QUIZ</span>');
        if(hasPrac(m)) hd.insertAdjacentHTML('beforeend','<span style="background:#FAEEDA;color:#7A4A06;border-radius:20px;padding:2px 8px;font-size:9px;font-family:var(--mono);font-weight:600">PRACTICAL</span>'); }
      if((hasQuiz(m)||hasPrac(m))&&!isAdmin()&&acts){ const b=acts.querySelector('button[onclick^="markModuleComplete"]'); if(b&&!(me&&(me.completedModules||[]).includes(m.id))){ b.remove(); acts.insertAdjacentHTML('afterbegin','<span class="dim" style="font-size:12px;align-self:center">Completes when '+(hasQuiz(m)&&hasPrac(m)?'you pass the quiz and a trainer signs off the practical.':hasQuiz(m)?'you pass the quiz.':'a trainer signs off the practical.')+'</span>'); } }
      if(isAdmin()&&acts) acts.insertAdjacentHTML('afterbegin',`<button class="btn bgh bsm" onclick="tqEdit('${E(m.id)}')">✎ Edit module</button>`);
    });
  }
  function wrapAll(){
    const _rt=renderTraining; renderTraining=function(){ const r=_rt.apply(this,arguments); try{decorate();}catch(e){console.warn(e);} return r; };
    const _rg=renderGearDetail; renderGearDetail=function(){
      const r=_rg.apply(this,arguments);
      try{
        const g=(db.gearItems||[]).find(x=>x.id===window._gdId), body=document.getElementById('gd-body'); if(!g||!body) return r;
        const ms=(db.trainingModules||[]).filter(m=>(m.gearIds||[]).includes(g.id)); if(!ms.length) return r;
        const me=getCurTech();
        const html='<div class="gd-sec"><div class="gd-k">Manuals &amp; training</div>'+ms.map(m=>{
          const links=[].concat(m.url?[{label:'Resource',url:m.url}]:[],m.links||[]).filter(l=>lk(l.url));
          return `<div style="margin:6px 0"><b>${E(m.title)}</b> ${me&&(me.completedModules||[]).includes(m.id)?'<span style="color:#2DD4A0">✓ done</span>':''}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:2px">${links.map(l=>`<a href="${E(lk(l.url))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-size:13px">${E(l.label||'Open')} →</a>`).join('')}<a href="#" onclick="closeM('gearDetail');go('training');return false" style="font-size:13px">Open in Training${hasQuiz(m)?' (quiz)':''}${hasPrac(m)?' (practical)':''} →</a></div></div>`;}).join('')+'</div>';
        const acts=body.querySelector('.gd-acts'); if(acts) acts.insertAdjacentHTML('beforebegin',html); else body.insertAdjacentHTML('beforeend',html);
      }catch(e){console.warn(e);}
      return r;
    };
  }
  // js/17 loads after this file, so wrap once every script is in
  window.addEventListener('DOMContentLoaded',wrapAll);

  // ── practical evaluation ──
  let EV=null;
  window.tqEval=function(id){
    if(!isAdmin()) return; const m=mod(id), me=getCurTech(); if(!hasPrac(m)) return;
    const people=(db.technicians||[]).filter(t=>isTechActive(t)&&(!me||t.id!==me.id));
    EV={id,res:m.practical.items.map(()=>null)};
    overlay('tq-ev',`<div class="mh"><span class="mt">Evaluate · ${E(m.title)}</span><button class="xb" onclick="closeOv_tq('tq-ev')">✕</button></div><div class="mb" style="max-height:72vh;overflow:auto">
      <div class="fg"><label>Who are you evaluating?</label><select id="ev-who"><option value="">— choose —</option>${people.map(t=>`<option value="${E(t.id)}">${E(t.name)}</option>`).join('')}</select></div>
      ${m.practical.items.map((it,i)=>`<div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><div style="flex:1;font-size:14px">${E(it.text)}${it.critical?' <span style="color:#FF8A80;font-size:11px">must pass</span>':''}</div>
        <button class="btn bgh bsm ev-b" data-i="${i}" data-v="1" onclick="tqMark(${i},1)">✓ Pass</button><button class="btn bgh bsm ev-b" data-i="${i}" data-v="0" onclick="tqMark(${i},0)">✕ Not yet</button></div>`).join('')}
      <div class="fg" style="margin-top:10px"><label>Notes for them (optional — they can see this)</label><textarea id="ev-notes" maxlength="300" style="min-height:50px"></textarea></div>
      <div id="ev-sum" style="font-size:14px;margin-top:6px"></div></div>
      <div class="mf"><button class="btn bgh" onclick="closeOv_tq('tq-ev')">Cancel</button><button class="btn ba" onclick="tqEvalSave()">Save result</button></div>`);
    evSum();
  };
  function evCalc(m){
    const items=m.practical.items, marked=EV.res.filter(x=>x!==null).length, ok=EV.res.filter(x=>x===1).length, pct=Math.round(ok/items.length*100);
    const critFail=items.some((it,i)=>it.critical&&EV.res[i]===0), pass=m.practical.pass||80;
    return {marked,pct,critFail,passed:marked===items.length&&!critFail&&pct>=pass,all:marked===items.length,pass};
  }
  function evSum(){
    const m=mod(EV.id), c=evCalc(m), el=document.getElementById('ev-sum'); if(!el) return;
    el.innerHTML=!c.all?`<span class="dim">${c.marked} of ${m.practical.items.length} marked</span>`:c.passed?`<span style="color:#2DD4A0">Result: PASS (${c.pct}%)</span>`:`<span style="color:#FBBF24">Result: needs more practice (${c.pct}%${c.critFail?', a “must pass” item was not met':''})</span>`;
    document.querySelectorAll('#tq-ev .ev-b').forEach(b=>{ const on=EV.res[+b.dataset.i]===+b.dataset.v; b.style.background=on?(b.dataset.v==='1'?'rgba(45,212,160,.25)':'rgba(255,138,128,.25)'):''; b.style.borderColor=on?(b.dataset.v==='1'?'#2DD4A0':'#FF8A80'):''; });
  }
  window.tqMark=function(i,v){ EV.res[i]=v; evSum(); };
  window.tqEvalSave=async function(){
    if(!isAdmin()) return; const m=mod(EV.id), me=getCurTech(), tid=document.getElementById('ev-who').value, t=(db.technicians||[]).find(x=>x.id===tid);
    if(!t){ toast('Choose who you are evaluating','error'); return; }
    if(me&&t.id===me.id){ toast('You cannot evaluate yourself','error'); return; }
    const c=evCalc(m); if(!c.all){ toast('Mark every item first','error'); return; }
    const rec={ts:Date.now(),by:me?me.name:'Admin',byId:me?me.id:'',res:EV.res.slice(),pct:c.pct,passed:c.passed,notes:(document.getElementById('ev-notes').value||'').trim().slice(0,300)};
    const practicals=JSON.parse(JSON.stringify(t.practicals||{})); practicals[m.id]=[rec].concat(practicals[m.id]||[]).slice(0,5);
    const fields={practicals}; const s=st(m,t);
    if(c.passed&&s.quizOk&&!s.complete) fields.completedModules=(t.completedModules||[]).concat([m.id]);
    const r=await techPatch(t.id,fields); if(!r) return;
    closeOv('tq-ev'); renderTraining();
    toast(c.passed?(t.name+' passed'+(hasQuiz(m)&&!s.quizOk?' (quiz still to do)':'')):t.name+': needs more practice','success');
  };

  // ── editor (details, links, gear, practical, quiz) ──
  let ED=null;
  const field=(id,label,val,ph)=>`<div class="fg"><label for="${id}">${label}</label><input id="${id}" value="${E(val)}" placeholder="${E(ph||'')}"></div>`;
  window.tqEdit=function(id){
    if(!isAdmin()) return; const m=mod(id); if(!m) return;
    ED={id,qs:JSON.parse(JSON.stringify((m.quiz&&m.quiz.qs)||[])),items:JSON.parse(JSON.stringify((m.practical&&m.practical.items)||[]))};
    const links=(m.links||[]).map(l=>(l.label?l.label+' | ':'')+l.url).join('\n');
    const gear=(db.gearItems||[]).map(g=>`<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin:3px 0;text-transform:none;letter-spacing:0"><input type="checkbox" class="tq-g" value="${E(g.id)}" ${(m.gearIds||[]).includes(g.id)?'checked':''} style="width:auto"> ${E(g.name)}</label>`).join('')||'<div class="dim">No gear items yet.</div>';
    const H=t=>`<div style="font-weight:700;margin:16px 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim2)">${t}</div>`;
    overlay('tq-ed',`<div class="mh"><span class="mt">Edit module</span><button class="xb" onclick="closeOv_tq('tq-ed')">✕</button></div><div class="mb" style="max-height:72vh;overflow:auto">
      ${field('tq-title','Title',m.title)}
      <div class="fg"><label for="tq-desc">Description</label><textarea id="tq-desc" style="min-height:50px">${E(m.desc||'')}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="fg"><label>Department</label><select id="tq-dept"><option value="">All</option>${['Lighting','Audio','Cameras','IT'].map(d=>`<option ${m.dept===d?'selected':''}>${d}</option>`).join('')}</select></div>
        <div class="fg"><label>Level</label><select id="tq-level">${['Beginner','Intermediate','Advanced'].map(d=>`<option ${m.level===d?'selected':''}>${d}</option>`).join('')}</select></div>${field('tq-dur','Duration',m.duration||'','20 min')}</div>
      <label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:13px"><input type="checkbox" id="tq-req" ${m.required?'checked':''} style="width:auto"> Required for new crew</label>
      ${H('Manuals')}
      ${field('tq-url','Main link (optional)',m.url||'','https://…')}
      <div class="fg"><label>More manual links (one per line: <i>Label | https://…</i>)</label><textarea id="tq-links" style="min-height:70px" placeholder="X32 manual | https://drive.google.com/…">${E(links)}</textarea></div>
      <div class="fg"><label>Stations this is the manual for (shows on that station\'s Service Day card)</label><div style="display:flex;gap:12px;flex-wrap:wrap">${getScheduleRoles().map(r=>`<label style="display:flex;gap:6px;align-items:center;font-size:13px;text-transform:none;letter-spacing:0"><input type="checkbox" class="tq-s" value="${E(r.name)}" ${(m.stations||[]).includes(r.name)?'checked':''} style="width:auto"> ${E(r.name)}</label>`).join('')}</div></div>
      <div class="fg"><label>Gear this module covers</label><div style="max-height:110px;overflow:auto;border:1px solid var(--border);border-radius:6px;padding:6px 10px">${gear}</div></div>
      ${H('Practical (driving test)')}<div class="dim" style="font-size:12px;margin-bottom:8px">Skills a trainer watches and ticks off. Mark the ones that automatically fail the test if missed as “must pass”.</div>
      <div id="tq-items"></div><button class="btn bgh bsm" onclick="tqAddItem()">+ Add skill</button>
      <div class="fg" style="margin-top:8px"><label>Practical pass mark (%)</label><input id="tq-ppass" type="number" min="50" max="100" value="${(m.practical&&m.practical.pass)||80}" style="width:100px"></div>
      ${H('Quiz')}<div class="fg"><label>Quiz pass mark (%)</label><input id="tq-pass" type="number" min="50" max="100" value="${(m.quiz&&m.quiz.pass)||80}" style="width:100px"></div>
      <div id="tq-qs"></div><button class="btn bgh bsm" onclick="tqAddQ()">+ Add question</button></div>
      <div class="mf"><button class="btn br" style="margin-right:auto" onclick="tqDelMod()">Delete module</button><button class="btn bgh" onclick="closeOv_tq('tq-ed')">Cancel</button><button class="btn ba" onclick="tqSave()">Save</button></div>`);
    paintItems(); paintQs();
  };
  function readQs(){ ED.qs=[...document.querySelectorAll('#tq-qs .tq-q')].map(el=>({q:el.querySelector('.tq-text').value.trim(),opts:[...el.querySelectorAll('.tq-opt')].map(i=>i.value.trim()),a:+((el.querySelector('input[type=radio]:checked')||{}).value||0)})); }
  function readItems(){ ED.items=[...document.querySelectorAll('#tq-items .tp-row')].map(el=>({text:el.querySelector('.tp-text').value.trim(),critical:el.querySelector('.tp-crit').checked})); }
  function paintItems(){
    const box=document.getElementById('tq-items'); if(!box) return;
    box.innerHTML=ED.items.map((it,i)=>`<div class="tp-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><input class="tp-text" value="${E(it.text)}" placeholder="Skill ${i+1}, e.g. Reports an outage with a photo" style="flex:1"><label style="display:flex;gap:4px;align-items:center;font-size:12px;text-transform:none;letter-spacing:0;white-space:nowrap"><input type="checkbox" class="tp-crit" ${it.critical?'checked':''} style="width:auto"> must pass</label><button class="btn br bsm" onclick="tqDelItem(${i})">✕</button></div>`).join('')||'<div class="dim" style="margin-bottom:8px">No practical yet.</div>';
  }
  window.tqAddItem=function(){ readItems(); if(ED.items.length>=15){ toast('15 skills is the limit','error'); return; } ED.items.push({text:'',critical:false}); paintItems(); };
  window.tqDelItem=function(i){ readItems(); ED.items.splice(i,1); paintItems(); };
  function paintQs(){
    const box=document.getElementById('tq-qs'); if(!box) return;
    box.innerHTML=ED.qs.map((q,i)=>{ const opts=(q.opts||[]).concat(['','','','']).slice(0,4);
      return `<div class="tq-q" style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:10px"><div style="display:flex;gap:6px"><input class="tq-text" placeholder="Question ${i+1}" value="${E(q.q)}" style="flex:1"><button class="btn br bsm" onclick="tqDelQ(${i})">✕</button></div>
        ${opts.map((o,j)=>`<div style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="radio" name="tqa${i}" value="${j}" ${(q.a||0)===j?'checked':''} title="Correct answer" style="width:auto"><input class="tq-opt" placeholder="Answer ${String.fromCharCode(65+j)}${j<2?'':' (optional)'}" value="${E(o)}" style="flex:1"></div>`).join('')}
        <div class="dim" style="font-size:11px;margin-top:4px">Tick the circle next to the correct answer.</div></div>`; }).join('')||'<div class="dim" style="margin-bottom:8px">No quiz yet.</div>';
  }
  window.tqAddQ=function(){ readQs(); if(ED.qs.length>=10){ toast('10 questions is the limit','error'); return; } ED.qs.push({q:'',opts:['','','',''],a:0}); paintQs(); };
  window.tqDelQ=function(i){ readQs(); ED.qs.splice(i,1); paintQs(); };
  window.tqDelMod=function(){ const m=mod(ED.id); if(!m||!confirm('Delete "'+m.title+'" for everyone? People\'s completion records stay on their profiles.')) return; closeOv('tq-ed'); deleteTrainingModule(m.id); };
  window.tqSave=function(){
    if(!isAdmin()) return; readQs(); readItems(); const m=mod(ED.id); if(!m) return;
    const title=document.getElementById('tq-title').value.trim(); if(!title){ toast('Title required','error'); return; }
    const links=[], bad=[];
    document.getElementById('tq-links').value.split('\n').map(s=>s.trim()).filter(Boolean).forEach(line=>{
      const p=line.split('|'), url=(p.length>1?p.slice(1).join('|'):p[0]).trim(), label=p.length>1?p[0].trim():'';
      if(lk(url)&&(/^https?:\/\//i.test(url)||/^manuals\//i.test(url))) links.push({label:label.slice(0,60),url}); else bad.push(line);
    });
    if(bad.length){ toast('Link not recognised: '+bad[0].slice(0,50)+' (must start with https://)','error'); return; }
    const main=document.getElementById('tq-url').value.trim(); if(main&&!(lk(main)&&(/^https?:\/\//i.test(main)||/^manuals\//i.test(main)))){ toast('Main link must start with https://','error'); return; }
    const items=ED.items.filter(i=>i.text);
    const qs=[]; for(let i=0;i<ED.qs.length;i++){
      const q=ED.qs[i]; if(!q.q&&!q.opts.some(Boolean)) continue;
      const keep=[],map={}; q.opts.forEach((o,j)=>{ if(o){ map[j]=keep.length; keep.push(o); } });
      if(!q.q||keep.length<2||map[q.a]===undefined){ toast('Question '+(i+1)+' needs text, at least two answers and a correct answer','error'); return; }
      qs.push({q:q.q,opts:keep,a:map[q.a]});
    }
    const clamp=v=>Math.max(50,Math.min(100,parseInt(v)||80));
    m.title=title; m.desc=document.getElementById('tq-desc').value.trim(); m.dept=document.getElementById('tq-dept').value; m.level=document.getElementById('tq-level').value;
    m.duration=document.getElementById('tq-dur').value.trim(); m.required=document.getElementById('tq-req').checked; m.url=main;
    m.links=links; m.stations=[...document.querySelectorAll('.tq-s:checked')].map(c=>c.value); m.gearIds=[...document.querySelectorAll('.tq-g:checked')].map(c=>c.value);
    if(qs.length) m.quiz={pass:clamp(document.getElementById('tq-pass').value),qs}; else delete m.quiz;
    if(items.length) m.practical={pass:clamp(document.getElementById('tq-ppass').value),items}; else delete m.practical;
    save(); closeOv('tq-ed'); renderTraining(); toast('Saved','success');
  };

  // ── quiz runner ──
  let Q=null;
  window.tqStart=function(id){ const m=mod(id); if(!hasQuiz(m)) return; Q={id,i:0,right:0,answered:false,order:m.quiz.qs.map((_,i)=>i).sort(()=>Math.random()-.5)}; paintQ(); };
  function paintQ(){
    const m=mod(Q.id), n=m.quiz.qs.length;
    if(Q.i>=n) return finish(m);
    const q=m.quiz.qs[Q.order[Q.i]];
    overlay('tq-run',`<div class="mh"><span class="mt">${E(m.title)} · ${Q.i+1} of ${n}</span><button class="xb" onclick="closeOv_tq('tq-run')">✕</button></div><div class="mb">
      <div style="font-size:16px;font-weight:600;margin-bottom:12px">${E(q.q)}</div>
      ${q.opts.map((o,j)=>`<button class="btn bgh tq-o" data-j="${j}" style="display:block;width:100%;text-align:left;margin-bottom:8px;white-space:normal" onclick="tqAnswer(${j})">${E(o)}</button>`).join('')}
      <div id="tq-fb" style="min-height:22px;font-size:13px"></div></div><div class="mf"><span class="dim" style="flex:1;font-size:12px">Score so far: ${Q.right}</span><button class="btn ba" id="tq-next" style="display:none" onclick="tqNext()">${Q.i+1>=n?'See result':'Next'}</button></div>`);
  }
  window.tqAnswer=function(j){
    if(Q.answered) return; Q.answered=true; const m=mod(Q.id), q=m.quiz.qs[Q.order[Q.i]], ok=j===q.a; if(ok) Q.right++;
    document.querySelectorAll('.tq-o').forEach(b=>{ const k=+b.dataset.j; b.disabled=true; if(k===q.a){ b.style.borderColor='#2DD4A0'; b.style.background='rgba(45,212,160,.15)'; } else if(k===j){ b.style.borderColor='#FF8A80'; b.style.background='rgba(255,138,128,.15)'; } });
    document.getElementById('tq-fb').innerHTML=ok?'<span style="color:#2DD4A0">Correct ✓</span>':'<span style="color:#FF8A80">Not quite. Correct answer: '+E(q.opts[q.a])+'</span>';
    document.getElementById('tq-next').style.display='';
  };
  window.tqNext=function(){ Q.i++; Q.answered=false; paintQ(); };
  async function finish(m){
    const n=m.quiz.qs.length, pct=Math.round(Q.right/n*100), pass=m.quiz.pass||80, ok=pct>=pass, me=getCurTech(), s=st(m,me);
    const needsPrac=hasPrac(m)&&!s.pp;
    overlay('tq-run',`<div class="mh"><span class="mt">${E(m.title)} · Result</span><button class="xb" onclick="closeOv_tq('tq-run')">✕</button></div><div class="mb" style="text-align:center;padding:24px">
      <div style="font-size:44px;font-weight:700;color:${ok?'#2DD4A0':'#FF8A80'}">${pct}%</div><div style="margin:6px 0 12px">${Q.right} of ${n} correct · pass mark ${pass}%</div>
      <div style="font-size:15px">${ok?(needsPrac?'Quiz passed. Next: ask a trainer to run your practical.':'Passed. This module is marked complete.'):'Not passed this time. Have another look at the manual and try again.'}</div></div>
      <div class="mf">${ok?'':`<button class="btn ba" onclick="tqStart('${E(m.id)}')">Try again</button>`}<button class="btn bgh" onclick="closeOv_tq('tq-run')">Close</button></div>`);
    if(ok&&me&&!s.qp){
      const fields={quizPassed:(me.quizPassed||[]).concat([m.id])}; if(!needsPrac&&!s.complete) fields.completedModules=(me.completedModules||[]).concat([m.id]);
      await techPatch(me.id,fields); renderTraining();
    } else if(ok&&me&&!needsPrac&&!s.complete){ await techPatch(me.id,{completedModules:(me.completedModules||[]).concat([m.id])}); renderTraining(); }
  }
})();
