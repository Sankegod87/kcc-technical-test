// Training sign-off requests: crew say "I finished this module, please check me off", admins approve or decline.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ST={pending:['Waiting','#E0A526'],approved:['Checked off','#2DD4A0'],declined:['Not yet','#FF8A80']};
  const list=()=>db.signoffRequests=db.signoffRequests||[];
  const me=()=>getCurTech&&getCurTech();
  const admins=()=>(db.technicians||[]).filter(t=>t.email&&(t.userRole==='master'||t.userRole==='admin'));
  async function mail(t,subject,o){ try{ await emailjs.send(EJSID,EJTPL,kccNoticeParams(t,subject,o)); }catch(e){ console.warn('Sign-off mail failed',e); } }
  const fd=ts=>new Date(ts).toLocaleDateString('en-CA',{month:'short',day:'numeric'});
  function close(){ const o=document.getElementById('so-modal'); if(o) o.remove(); }
  function shell(inner){
    let o=document.getElementById('so-modal');
    if(!o){ o=document.createElement('div'); o.id='so-modal'; o.className='mover'; o.style.display='flex'; o.onclick=e=>{ if(e.target===o) close(); }; document.body.appendChild(o); }
    o.innerHTML='<div class="modal" style="max-width:640px;max-height:92vh;overflow-y:auto">'+inner+'</div>';
  }
  function paint(){
    const t=me(), adm=isAdmin(); const all=list();
    const mine=t?all.filter(r=>r.techId===t.id):[];
    const waiting=all.filter(r=>r.status==='pending');
    const done=(t&&t.completedModules)||[];
    const pendingMods=mine.filter(r=>r.status==='pending').map(r=>r.modId);
    const avail=(db.trainingModules||[]).filter(m=>!done.includes(m.id)&&!pendingMods.includes(m.id));
    const form=t?('<div class="panel mb14"><div class="ph"><span class="pt">Ask to be checked off</span></div><div class="pb">'+
      (avail.length?'<div class="fg"><label>Which module did you finish?</label><select id="so-mod">'+avail.map(m=>'<option value="'+E(m.id)+'">'+E(m.title)+'</option>').join('')+'</select></div>'+
        '<div class="fg"><label>Anything to add? (optional)</label><textarea id="so-note" rows="2" maxlength="300" placeholder="e.g. Practiced with Alex on Sunday"></textarea></div><button class="btn ba" onclick="soSubmit()">Send request</button>'
        :'<div class="dim">Nothing to request. Every module is either done or already waiting for an admin.</div>')+'</div></div>'):'';
    const rows=(arr,showWho)=>arr.map(r=>{ const s=ST[r.status]||ST.pending; const m=(db.trainingModules||[]).find(x=>x.id===r.modId); const gated=m&&((m.quiz&&m.quiz.qs&&m.quiz.qs.length)||(m.practical&&m.practical.items&&m.practical.items.length));
      return '<div style="padding:10px 0;border-top:1px solid var(--border,#2a2a2a)"><div class="row jbet" style="gap:8px;flex-wrap:wrap"><div style="min-width:0"><b>'+E(r.modTitle)+'</b>'+(showWho?' <span class="dim">· '+E(r.techName)+'</span>':'')+
        '<div class="dim" style="font-size:12px">'+fd(r.createdAt)+(r.note?' · '+E(r.note):'')+(gated&&showWho?' · has a quiz or practical':'')+(r.decisionNote?' · '+E(r.decisionNote):'')+'</div></div>'+
        '<div class="row gap6" style="flex-wrap:wrap;justify-content:flex-end"><span class="badge" style="background:'+s[1]+'33;color:'+s[1]+'">'+s[0]+'</span>'+
        (adm&&r.status==='pending'?'<button class="btn ba bsm" onclick="soAct(\''+E(r.id)+'\',\'approved\')">Check off</button><button class="btn bgh bsm" onclick="soAct(\''+E(r.id)+'\',\'declined\')">Not yet</button>':'')+
        ((adm||(t&&r.techId===t.id&&r.status==='pending'))?'<button class="btn bgh bsm" onclick="soDel(\''+E(r.id)+'\')">🗑</button>':'')+'</div></div></div>'; }).join('');
    shell('<div class="mh"><span class="mt">✅ Training sign-offs</span><button class="xb" onclick="soClose()">✕</button></div><div class="mb">'+form+
      (adm?'<div class="panel mb14"><div class="ph"><span class="pt">Waiting for you'+(waiting.length?' ('+waiting.length+')':'')+'</span></div><div class="pb">'+(waiting.length?rows(waiting,true):'<div class="dim">No requests waiting.</div>')+'</div></div>':'')+
      (mine.length?'<div class="panel"><div class="ph"><span class="pt">My requests</span></div><div class="pb">'+rows(mine,false)+'</div></div>':'')+'</div>');
  }
  window.soClose=close; window.soOpen=function(){ if(!me()){ toast('Sign in first','error'); return; } paint(); };
  window.soSubmit=function(){
    const t=me(); if(!t) return; const id=document.getElementById('so-mod')&&document.getElementById('so-mod').value; const m=(db.trainingModules||[]).find(x=>x.id===id); if(!m) return;
    if(list().some(r=>r.techId===t.id&&r.modId===id&&r.status==='pending')){ toast('Already waiting for an admin','info'); return; }
    const r={id:'so_'+Date.now(),modId:m.id,modTitle:String(m.title||'').slice(0,120),techId:t.id,techName:t.name,note:(document.getElementById('so-note').value||'').trim().slice(0,300),status:'pending',createdAt:Date.now()};
    list().unshift(r); save(); paint(); window.renderSignoffBar&&window.renderSignoffBar(); toast('Request sent','success');
    admins().forEach(a=>{ if(a.id!==t.id) mail(a,'✅ Training sign-off: '+r.modTitle,{tone:'blue',badge:'Training sign-off',headline:t.name+' says they finished '+r.modTitle,rows:[['Module',r.modTitle],['Note',r.note||'-']],body:'Open KCC Technical, then Training Hub, to check them off.'}); });
  };
  window.soAct=async function(id,status){
    if(!isAdmin()) return; const r=list().find(x=>x.id===id); if(!r) return;
    if(me()&&r.techId===me().id){ toast('Ask a different admin to check you off','error'); return; }
    const t=(db.technicians||[]).find(x=>x.id===r.techId); if(!t){ toast('That person is no longer on the crew','error'); return; }
    let note='';
    if(status==='declined'){ note=(prompt('What should they do first? (optional)')||'').trim().slice(0,200); }
    if(status==='approved'&&!(t.completedModules||[]).includes(r.modId)){
      const res=await techPatch(t.id,{completedModules:(t.completedModules||[]).concat([r.modId])}); if(!res) return;
    }
    r.status=status; r.decisionNote=note; r.decidedBy=(me()||{}).name||''; r.decidedAt=Date.now(); save(); paint(); window.renderSignoffBar&&window.renderSignoffBar(); if(typeof renderTraining==='function') renderTraining();
    if(t.email) mail(t,'✅ Your training sign-off: '+ST[status][0],{tone:status==='approved'?'green':'red',badge:'Training sign-off',headline:status==='approved'?r.modTitle+' is checked off':r.modTitle+' is not checked off yet',rows:[['Module',r.modTitle]].concat(note?[['Note',note]]:[]),body:''});
  };
  window.soDel=function(id){ const r=list().find(x=>x.id===id); if(!r) return; const t=me(); if(!isAdmin()&&!(t&&t.id===r.techId&&r.status==='pending')) return; if(!confirm('Remove this request?')) return; db.signoffRequests=list().filter(x=>x.id!==id); save(); paint(); window.renderSignoffBar&&window.renderSignoffBar(); };
  window.renderSignoffBar=function(){
    const el=document.getElementById('so-bar'); if(!el) return; const adm=isAdmin(); const n=list().filter(r=>r.status==='pending').length;
    el.innerHTML='<button class="btn ba bsm" onclick="soOpen()">✅ Request sign-off</button>'+(adm?'<button class="btn bgh bsm" onclick="soOpen()">Sign-off requests'+(n?' ('+n+' waiting)':'')+'</button>':'');
  };
  window.addEventListener('DOMContentLoaded',()=>{
    const _go=go; go=function(p){ const r=_go.apply(this,arguments); if(p==='training') window.renderSignoffBar(); return r; };
  });
})();
