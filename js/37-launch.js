// Launch tools: (1) a mandatory "Welcome to the new KCC Technical" lesson that locks the rest of the app until each
// person passes its quiz, and (2) a Launch email card (Settings) that emails everyone with the new address, the guide and,
// where needed, their temporary password. Nothing happens until an admin turns it on.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const WELCOME={id:'st_welcome',title:'Welcome to the new KCC Technical',dept:'',level:'Beginner',duration:'10 min',required:true,mandatory:true,
    desc:'Read the switching guide (and the Crew Guide if you want more detail), then pass the short quiz. Until you pass it, the rest of the app stays locked.',
    links:[{label:'Switching guide (PDF)',url:'manuals/switching-guide.pdf'},{label:'Crew Guide (PDF)',url:'manuals/crew-guide.pdf'}],
    quiz:{pass:80,qs:[
      {q:'You use your own password from the old app. What do you do on the new one?',opts:['Ask for a new account','Sign in with the same password','Wait for an email with a code','Create a new password first'],a:1},
      {q:'You never had a password before the switch. How do you get in?',opts:['Use the temporary password from the email, then change it','Leave the password box empty','Use your phone number','Ask a friend to sign in for you'],a:0},
      {q:'Where do you change your password?',opts:['Settings → My account → Change my password','Schedule','Scan','Training → Practical'],a:0},
      {q:'What is the first thing to do on the sign-in screen?',opts:['Type the address again','Tap your name in the grid','Tap Sign Out','Report an outage'],a:1},
      {q:'You type the wrong password five times in a row. What happens?',opts:['The account is deleted','The account locks for a minute, then longer if it keeps happening','Nothing','An admin is texted'],a:1},
      {q:'What are the usual call time and service time?',opts:['Call 8:00, service 9:00','Call 9:00, service 10:30','Call 10:30, service 12:00','They are always different'],a:1},
      {q:'Who can be rostered on the Sound station?',opts:['Anyone','Only people who are approved for Sound','Only admins','Nobody'],a:1},
      {q:'Your connection drops while you work. What should you do?',opts:['Stop and wait','Keep working: changes are saved on the device and sent when you reconnect','Sign out and back in','Restart the phone'],a:1},
      {q:'What do you do if you are stuck?',opts:['Ask an admin; they can reset your password or help in person','Share your password with a friend','Ignore the lock','Delete the app'],a:0}]}};
  const me=()=>getCurTech();
  const pending=()=>{ const t=me(); if(!t) return []; return (db.trainingModules||[]).filter(m=>m.mandatory&&!(t.completedModules||[]).includes(m.id)); };
  const gateOn=()=>!!(db.settings&&db.settings.mandatoryOn);
  const skipped=()=>{ try{return sessionStorage.getItem('kcc_gate_skip')==='1';}catch(e){return false;} };

  // ── the lock ──
  const _go=go;
  go=function(page){
    if(gateOn()&&_techId&&page!=='training'&&!skipped()&&pending().length){
      _go('training'); try{ toast('Finish the welcome lesson first to open the rest of the app','info'); }catch(e){}
      paintBanner(); return;
    }
    const r=_go.apply(this,arguments); if(page==='training') paintBanner(); return r;
  };
  window.klSkip=function(){ if(typeof isMaster==='function'&&isMaster()){ try{sessionStorage.setItem('kcc_gate_skip','1');}catch(e){} const b=document.getElementById('kl-banner'); if(b) b.remove(); toast('Lock skipped for this session','info'); } };
  function paintBanner(){
    const pg=document.getElementById('pg-training'); if(!pg) return; let b=document.getElementById('kl-banner');
    const p=gateOn()&&!skipped()?pending():[]; if(!p.length){ if(b) b.remove(); return; }
    if(!b){ b=document.createElement('div'); b.id='kl-banner'; b.style.cssText='background:rgba(251,191,36,.14);border:1px solid #FBBF24;border-radius:10px;padding:12px 14px;margin-bottom:14px'; pg.insertBefore(b,pg.firstChild); }
    b.innerHTML=`<div style="font-weight:800;margin-bottom:4px">🔒 Finish this to open the rest of the app</div>
      <div class="dim" style="font-size:12px;margin-bottom:8px">Everyone completes the welcome lesson once. It takes about ten minutes.</div>
      ${p.map(m=>`<div class="row gap8" style="margin:4px 0;flex-wrap:wrap"><b style="flex:1;min-width:180px">${E(m.title)}</b>${(m.links||[]).map(l=>`<a class="btn bgh bsm" href="${E(l.url)}" target="_blank" rel="noopener">📖 ${E(l.label)}</a>`).join('')}${m.quiz?`<button class="btn ba bsm" onclick="tqStart('${E(m.id)}')">Take the quiz</button>`:''}</div>`).join('')}
      ${typeof isMaster==='function'&&isMaster()?'<div style="margin-top:8px"><button class="btn bgh bsm" onclick="klSkip()">Master admin: skip the lock for this session</button></div>':''}`;
  }
  window.addEventListener('DOMContentLoaded',()=>{ const _rt=renderTraining; renderTraining=function(){ const r=_rt.apply(this,arguments); try{paintBanner();}catch(e){} return r; }; });

  // ── admin: switch it on/off ──
  window.klEnable=function(){
    if(!isAdmin()){ toast('Admin required','error'); return; }
    if(!confirm('Make the welcome lesson mandatory?\n\nEveryone, including admins, will see only Training until they pass its quiz. Do this on launch day, together with the launch email.')) return;
    if(!db.trainingModules) db.trainingModules=[];
    const ex=db.trainingModules.find(m=>m.id===WELCOME.id);
    if(ex){ ex.mandatory=true; } else db.trainingModules.unshift(Object.assign(JSON.parse(JSON.stringify(WELCOME)),{createdAt:Date.now()}));
    db.settings.mandatoryOn=true; save(); try{renderTraining();}catch(e){} paintCard(); toast('The welcome lesson is now mandatory','success');
  };
  window.klDisable=function(){ if(!isAdmin()) return; if(!confirm('Unlock the app for everyone?')) return; db.settings.mandatoryOn=false; save(); try{renderTraining();}catch(e){} paintCard(); toast('Lock turned off','success'); };

  // ── launch email ──
  const DEFAULT_SUBJECT='KCC Technical is moving: please read';
  const DEFAULT_BODY=`Hi {name},

KCC Technical is moving to a new version. Your name, schedule and gear list come with you.

New address: {address}

{password_block}The first time you sign in you will see a short welcome lesson (about ten minutes). Please finish it: the rest of the app opens once you pass the quiz.

Short guide: {guide}

If you have any questions, email or text Isaac: 587-664-3421 or ayodejiiojo@gmail.com

Thanks,
The Video team`;
  const addr=()=>{ const el=document.getElementById('kl-addr'); const v=el&&el.value.trim(); return (v||location.href.split('#')[0].split('?')[0].replace(/index\.html$/,'')); };
  function parsePw(text){ const m={}; String(text||'').split(/\r?\n/).forEach(l=>{ const x=/^\s*(.+?)\s*(?:\(([^)]*)\))?\s*:\s*(\S+)\s*$/.exec(l); if(x) m[x[1].toLowerCase()]=x[3]; }); return m; }
  function build(t,pwMap){
    const a=addr().replace(/\/?$/,'/'); const pw=pwMap[(t.name||'').toLowerCase()];
    const block=pw?`Your temporary password: ${pw}\nUse it once, then change it under Settings → My account → Change my password.\n\n`:'You can sign in with the same password you used before.\n\n';
    const body=(document.getElementById('kl-body').value||DEFAULT_BODY).replace(/\{name\}/g,(t.name||'').split(' ')[0]).replace(/\{address\}/g,a).replace(/\{guide\}/g,a+'manuals/switching-guide.pdf').replace(/\{password_block\}/g,block);
    return {subject:document.getElementById('kl-subj').value||DEFAULT_SUBJECT,message:body,pw:!!pw};
  }
  const people=()=>(db.technicians||[]).filter(t=>isTechActive(t));
  window.klPreview=function(){
    const p=people().find(t=>t.email)||people()[0]; if(!p){ toast('No crew yet','error'); return; }
    const pm=parsePw(document.getElementById('kl-pw').value), e=build(p,pm);
    document.getElementById('kl-prev').innerHTML=`<div class="dim" style="font-size:11px;margin-bottom:4px">Preview for ${E(p.name)}${p.email?'':' (no email on file)'}</div><div style="background:var(--s2);border-radius:8px;padding:10px;white-space:pre-wrap;font-size:12px"><b>${E(e.subject)}</b>\n\n${E(e.message)}</div>`;
  };
  window.klSend=async function(){
    if(!isAdmin()){ toast('Admin required','error'); return; }
    const all=document.getElementById('kl-again').checked, sent=db.settings.launchSent||{}, pm=parsePw(document.getElementById('kl-pw').value);
    const list=people().filter(t=>t.email&&(all||!sent[t.id])), noMail=people().filter(t=>!t.email);
    if(!list.length){ toast('Nobody left to email'+(noMail.length?' ('+noMail.length+' have no email address)':''),'info'); return; }
    if(!confirm('Send the launch email to '+list.length+' '+(list.length===1?'person':'people')+'?'+(Object.keys(pm).length?'\n\nTemporary passwords will be included for '+list.filter(t=>pm[(t.name||'').toLowerCase()]).length+' of them.':''))) return;
    const res=document.getElementById('kl-res'); let ok=0; const fail=[];
    db.settings.launchSent=Object.assign({},sent);
    for(let i=0;i<list.length;i++){
      const t=list[i], e=build(t,pm); res.textContent='Sending '+(i+1)+' of '+list.length+'…';
      try{ await emailjs.send(EJSID,EJTPL,{to_email:t.email,to_name:t.name,subject:e.subject,message:e.message}); db.settings.launchSent[t.id]=Date.now(); ok++; }
      catch(err){ fail.push(t.name); }
      await new Promise(r=>setTimeout(r,400));
    }
    document.getElementById('kl-pw').value=''; // temporary passwords are never stored
    save(); paintCard(); const r2=document.getElementById('kl-res');
    if(r2) r2.innerHTML=`<span style="color:#2DD4A0">✓ Sent ${ok}</span>${fail.length?` · <span style="color:var(--red)">✕ failed: ${E(fail.join(', '))}</span>`:''}`;
    toast('Sent '+ok+(fail.length?', '+fail.length+' failed':''),fail.length?'error':'success');
  };
  function cardHtml(){
    const ppl=people(), sent=db.settings.launchSent||{}, withMail=ppl.filter(t=>t.email), noMail=ppl.filter(t=>!t.email), done=ppl.filter(t=>sent[t.id]);
    const on=gateOn(), wm=(db.trainingModules||[]).find(m=>m.mandatory), finished=wm?ppl.filter(t=>(t.completedModules||[]).includes(wm.id)).length:0;
    return `<div class="ph"><span class="pt">📣 Launch email &amp; welcome lesson</span></div><div class="pb">
      <p class="dim mb12">For launch day. Email everyone the new address and guide, then lock the app until each person passes the welcome quiz.</p>
      <div style="font-size:12px;margin-bottom:10px"><b>${withMail.length}</b> of ${ppl.length} people have an email address${noMail.length?` · <span style="color:var(--red)">no email: ${E(noMail.map(t=>t.name).join(', '))}</span>`:''} · <b>${done.length}</b> already sent</div>
      <div class="fg" style="margin-bottom:10px"><label for="kl-addr">New app address</label><input id="kl-addr" value="${E(location.href.split('#')[0].split('?')[0].replace(/index\.html$/,''))}"></div>
      <div class="fg" style="margin-bottom:10px"><label for="kl-subj">Subject</label><input id="kl-subj" value="${E(DEFAULT_SUBJECT)}"></div>
      <div class="fg" style="margin-bottom:10px"><label for="kl-body">Message <span class="dim">(use {name} {address} {guide} {password_block})</span></label><textarea id="kl-body" style="min-height:190px;font-size:12px">${E(DEFAULT_BODY)}</textarea></div>
      <div class="fg" style="margin-bottom:10px"><label for="kl-pw">Temporary passwords <span class="dim">(paste the migration list; one per line like “Name (role): password”)</span></label><textarea id="kl-pw" style="min-height:70px;font-size:12px" placeholder="Sam Okafor (user): k3j9x2mq4pA1" autocomplete="off"></textarea><div class="dim" style="font-size:11px;margin-top:3px">Passwords are only used to fill the emails. They are not saved.</div></div>
      <div class="row gap8" style="flex-wrap:wrap;margin-bottom:8px"><button class="btn bgh" onclick="klPreview()">👁 Preview</button><button class="btn ba" onclick="klSend()">✉️ Send to everyone</button><label style="display:flex;gap:6px;align-items:center;font-size:12px;text-transform:none;letter-spacing:0"><input type="checkbox" id="kl-again"> include people already sent</label></div>
      <div id="kl-res" style="font-size:12px;margin-bottom:6px"></div><div id="kl-prev" style="margin-bottom:14px"></div>
      <div style="border-top:1px solid var(--border);padding-top:12px"><div style="font-weight:700;margin-bottom:4px">🔒 Mandatory welcome lesson: ${on?'<span style="color:#2DD4A0">ON</span>':'<span class="dim">off</span>'}</div>
        <div class="dim" style="font-size:12px;margin-bottom:8px">${on?`${finished} of ${ppl.length} people have finished it. Everyone else sees only Training.`:'Adds the module and locks every page except Training until each person passes its quiz.'}</div>
        ${on?'<button class="btn bgh" onclick="klDisable()">Turn the lock off</button>':'<button class="btn ba" onclick="klEnable()">Make the welcome lesson mandatory</button>'}</div></div>`;
  }
  function paintCard(){ const c=document.getElementById('kl-panel'); if(!c) return; const keep={a:'kl-addr',s:'kl-subj',b:'kl-body',p:'kl-pw'}, vals={}; Object.keys(keep).forEach(k=>{const el=document.getElementById(keep[k]); if(el) vals[k]=el.value;}); c.innerHTML=cardHtml(); Object.keys(keep).forEach(k=>{const el=document.getElementById(keep[k]); if(el&&vals[k]!=null&&(k==='p'||vals[k]!==el.defaultValue)) el.value=vals[k];}); }
  const _rs=renderSettings;
  renderSettings=function(){
    const grid=document.querySelector('#pg-settings .grid2');
    if(grid&&!document.getElementById('kl-panel')){ const p=document.createElement('div'); p.className='panel'; p.id='kl-panel'; p.setAttribute('data-perm','admin'); p.style.display=isAdmin()?'':'none'; p.innerHTML=cardHtml(); grid.appendChild(p); }
    return _rs.apply(this,arguments);
  };
})();
