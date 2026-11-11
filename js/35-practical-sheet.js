// Practical evaluation as a full-screen score sheet: live pass/fail banner, per-item notes and timers,
// auto-saved draft, past attempts, and "retake only the failed items". Replaces the small pop-up from js/30.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mod=id=>(db.trainingModules||[]).find(m=>m.id===id);
  const hasQuiz=m=>!!(m&&m.quiz&&m.quiz.qs&&m.quiz.qs.length);
  const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  const dKey=id=>'kcc_pe_draft_'+id;
  let S=null, tick=null;
  const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
  const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
  const $=id=>document.getElementById(id);

  function calc(){
    const m=S.m, n=m.practical.items.length, marked=S.res.filter(x=>x!==null).length, ok=S.res.filter(x=>x===1).length;
    const critFail=m.practical.items.some((it,i)=>it.critical&&S.res[i]===0), pass=m.practical.pass||80, pct=Math.round(ok/n*100);
    return {n,marked,ok,pct,pass,critFail,all:marked===n,passed:marked===n&&!critFail&&pct>=pass};
  }
  function draft(){ S.dirty=true; lsSet(dKey(S.m.id),{who:$('pe-who').value,res:S.res,notes:S.notes,times:S.times,gen:$('pe-gen').value}); }

  window.tqEval=function(id){
    if(!isAdmin()) return; const m=mod(id); if(!m||!m.practical||!m.practical.items||!m.practical.items.length) return;
    const n=m.practical.items.length;
    S={m,res:m.practical.items.map(()=>null),notes:{},times:{},run:null,start:Date.now(),dirty:false};
    const d=lsGet(dKey(id));
    const o=document.createElement('div'); o.id='pe-screen';
    o.style.cssText='position:fixed;inset:0;z-index:9300;background:var(--bg,#0b0f14);color:var(--text,#e8eef5);display:flex;flex-direction:column';
    document.body.appendChild(o); document.body.style.overflow='hidden';
    render(o);
    if(d&&d.res&&d.res.length===n&&confirm('Continue your unsaved evaluation from earlier?')){
      S.res=d.res; S.notes=d.notes||{}; S.times=d.times||{}; $('pe-who').value=d.who||''; $('pe-gen').value=d.gen||''; S.dirty=true; paint(); loadPast();
    } else lsSet(dKey(id),null);
    tick=setInterval(clock,500);
  };
  function render(o){
    const m=S.m, me=getCurTech();
    const people=(db.technicians||[]).filter(t=>isTechActive(t)&&(!me||t.id!==me.id));
    o.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);flex-wrap:wrap">
      <button class="btn bgh" onclick="peClose()">✕ Close</button>
      <div style="flex:1;min-width:160px"><div style="font-weight:700;font-size:16px">${E(m.title)}</div><div class="dim" style="font-size:12px">Practical evaluation · pass mark ${m.practical.pass||80}%</div></div>
      <select id="pe-who" onchange="peWho()" style="min-width:180px"><option value="">Who are you evaluating?</option>${people.map(t=>`<option value="${E(t.id)}">${E(t.name)}</option>`).join('')}</select>
      <div id="pe-clock" style="font-family:var(--m,monospace);font-size:18px;min-width:56px;text-align:right">0:00</div>
    </div>
    <div id="pe-banner" style="padding:10px 16px;font-weight:700;font-size:15px"></div>
    <div style="flex:1;overflow:auto;padding:6px 14px 120px">
      <div id="pe-past"></div>
      ${m.practical.items.map((it,i)=>`<div class="pe-row" id="pe-r${i}" style="border-bottom:1px solid var(--border);padding:12px 0">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px;font-size:16px"><span class="dim">${i+1}.</span> ${E(it.text)}${it.critical?' <span style="color:#FF8A80;font-size:12px;font-weight:700">MUST PASS</span>':''}</div>
          <button class="btn bgh" id="pe-t${i}" onclick="peTimer(${i})" style="min-width:76px">⏱ <span>${S.times[i]?mmss(S.times[i]):'timer'}</span></button>
          <button class="btn bgh" onclick="peNote(${i})">📝</button>
          <button class="btn bgh pe-b" data-i="${i}" data-v="1" onclick="peMark(${i},1)" style="min-width:92px;padding:12px 14px;font-size:15px">✓ Pass</button>
          <button class="btn bgh pe-b" data-i="${i}" data-v="0" onclick="peMark(${i},0)" style="min-width:92px;padding:12px 14px;font-size:15px">✕ Not yet</button>
        </div>
        <textarea id="pe-n${i}" placeholder="Note for this item…" maxlength="200" oninput="peNoteIn(${i},this.value)" style="display:none;margin-top:8px;min-height:44px;width:100%"></textarea></div>`).join('')}
      <div class="fg" style="margin-top:14px"><label>Overall notes for them (they can see this)</label><textarea id="pe-gen" maxlength="300" oninput="peDraft()" style="min-height:60px"></textarea></div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;display:flex;gap:10px;align-items:center;padding:12px 14px;background:var(--s1,#141a22);border-top:1px solid var(--border)">
      <button class="btn bgh" id="pe-retake" onclick="peRetake()" style="display:none">↻ Retake failed items only</button>
      <div id="pe-sum" class="dim" style="flex:1;font-size:13px"></div>
      <button class="btn ba" id="pe-save" onclick="peSave()" style="padding:12px 26px;font-size:15px">💾 Save result</button>
    </div>`;
    paint();
  }
  function paint(){
    if(!S) return; const c=calc(), m=S.m;
    document.querySelectorAll('#pe-screen .pe-b').forEach(b=>{const on=S.res[+b.dataset.i]===+b.dataset.v,g=b.dataset.v==='1';b.style.background=on?(g?'rgba(45,212,160,.3)':'rgba(255,138,128,.3)'):'';b.style.borderColor=on?(g?'#2DD4A0':'#FF8A80'):'';});
    m.practical.items.forEach((it,i)=>{const r=$('pe-r'+i);if(r)r.style.background=S.res[i]===0?'rgba(255,138,128,.07)':'';const t=$('pe-n'+i);if(t&&S.notes[i]&&!t.value){t.value=S.notes[i];t.style.display='block';}});
    const b=$('pe-banner'); let txt,bg,col;
    if(c.critFail){txt='✕ AUTOMATIC FAIL — a “must pass” item was missed';bg='rgba(255,138,128,.18)';col='#FF8A80';}
    else if(!c.marked){txt='Mark each item Pass or Not yet';bg='transparent';col='var(--dim2,#9aa7b5)';}
    else if(c.all){ if(c.passed){txt='✓ PASS — '+c.pct+'%';bg='rgba(45,212,160,.18)';col='#2DD4A0';} else {txt='Needs more practice — '+c.pct+'% (need '+c.pass+'%)';bg='rgba(251,191,36,.15)';col='#FBBF24';} }
    else { const maxPct=Math.round((c.n-(c.marked-c.ok))/c.n*100); if(maxPct<c.pass){txt='Can no longer reach '+c.pass+'% — '+c.marked+' of '+c.n+' marked';bg='rgba(251,191,36,.15)';col='#FBBF24';} else {txt='On track — '+c.ok+' passed, '+c.marked+' of '+c.n+' marked';bg='rgba(45,212,160,.10)';col='#2DD4A0';} }
    b.textContent=txt; b.style.background=bg; b.style.color=col;
    $('pe-sum').textContent=c.marked+' of '+c.n+' marked';
    $('pe-save').disabled=!(c.all&&$('pe-who').value);
    $('pe-save').style.opacity=$('pe-save').disabled?.45:1;
  }
  function clock(){
    if(!S) return; const el=$('pe-clock'); if(el) el.textContent=mmss(Math.floor((Date.now()-S.start)/1000));
    if(S.run!=null){const t=$('pe-t'+S.run.i); if(t) t.querySelector('span').textContent=mmss((S.times[S.run.i]||0)+Math.floor((Date.now()-S.run.t0)/1000));}
  }
  function stopTimer(){ if(S.run){ S.times[S.run.i]=(S.times[S.run.i]||0)+Math.floor((Date.now()-S.run.t0)/1000); const t=$('pe-t'+S.run.i); if(t){t.querySelector('span').textContent=mmss(S.times[S.run.i]);t.style.background='';} S.run=null; } }
  window.peTimer=function(i){ const was=S.run&&S.run.i===i; stopTimer(); if(!was){S.run={i,t0:Date.now()};$('pe-t'+i).style.background='rgba(251,191,36,.25)';} draft(); };
  window.peNote=function(i){ const t=$('pe-n'+i); t.style.display=t.style.display==='none'?'block':'none'; if(t.style.display==='block') t.focus(); };
  window.peNoteIn=function(i,v){ S.notes[i]=v.slice(0,200); if(!v) delete S.notes[i]; draft(); };
  window.peMark=function(i,v){ S.res[i]=S.res[i]===v?null:v; if(S.run&&S.run.i===i) stopTimer(); paint(); draft(); };
  window.peDraft=function(){ draft(); };
  window.peWho=function(){ loadPast(); paint(); draft(); };
  function loadPast(){
    const t=(db.technicians||[]).find(x=>x.id===$('pe-who').value), el=$('pe-past'), rb=$('pe-retake'); if(!el) return;
    const att=(t&&t.practicals&&t.practicals[S.m.id])||[];
    S.last=att[0]&&att[0].res&&att[0].res.length===S.m.practical.items.length?att[0]:null;
    rb.style.display=S.last&&!S.last.passed?'':'none';
    el.innerHTML=att.length?`<div style="background:var(--s2);border-radius:8px;padding:8px 12px;margin:8px 0;font-size:13px"><b>Past attempts for ${E(t.name)}</b>${att.map(a=>`<div class="dim" style="margin-top:3px">${new Date(a.ts).toLocaleDateString()} · ${a.passed?'<span style="color:#2DD4A0">passed</span>':'not yet'} ${a.pct}% · by ${E(a.by||'')}${a.notes?' — “'+E(a.notes)+'”':''}</div>`).join('')}</div>`:'';
  }
  window.peRetake=function(){
    if(!S.last) return; if(S.res.some(x=>x!==null)&&!confirm('Replace what you have marked with their last attempt?')) return;
    S.res=S.last.res.map(x=>x?1:null); paint(); draft();
    const first=S.res.findIndex(x=>x===null); if(first>=0){const r=$('pe-r'+first); if(r) r.scrollIntoView({block:'center',behavior:'smooth'});}
    toast('Passed items carried over — mark the ones they retook','info');
  };
  function end(){ clearInterval(tick); tick=null; const o=$('pe-screen'); if(o) o.remove(); document.body.style.overflow=''; S=null; }
  window.peClose=function(){ if(S&&S.dirty&&!confirm('Close without saving? Your marks are kept as a draft on this device.')) return; end(); };
  window.peSave=async function(){
    if(!isAdmin()||!S) return; stopTimer(); const m=S.m, me=getCurTech(), t=(db.technicians||[]).find(x=>x.id===$('pe-who').value);
    if(!t){toast('Choose who you are evaluating','error');return;}
    if(me&&t.id===me.id){toast('You cannot evaluate yourself','error');return;}
    const c=calc(); if(!c.all){toast('Mark every item first','error');return;}
    const rec={ts:Date.now(),by:me?me.name:'Admin',byId:me?me.id:'',res:S.res.slice(),pct:c.pct,passed:c.passed,notes:($('pe-gen').value||'').trim().slice(0,300),secs:Math.floor((Date.now()-S.start)/1000)};
    if(Object.keys(S.notes).length) rec.inotes=Object.assign({},S.notes);
    if(Object.keys(S.times).length) rec.times=Object.assign({},S.times);
    const practicals=JSON.parse(JSON.stringify(t.practicals||{})); practicals[m.id]=[rec].concat(practicals[m.id]||[]).slice(0,5);
    const fields={practicals}; const quizOk=!hasQuiz(m)||(t.quizPassed||[]).includes(m.id), done=(t.completedModules||[]).includes(m.id);
    if(c.passed&&quizOk&&!done) fields.completedModules=(t.completedModules||[]).concat([m.id]);
    const btn=$('pe-save'); btn.disabled=true; btn.textContent='Saving…';
    const r=await techPatch(t.id,fields);
    if(!r){ if($('pe-save')){btn.disabled=false;btn.textContent='💾 Save result';} return; }
    lsSet(dKey(m.id),null); end(); renderTraining();
    toast(c.passed?(t.name+' passed'+(!quizOk?' (quiz still to do)':'')):t.name+': needs more practice','success');
  };
})();
