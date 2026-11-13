// Announcements v2: priority levels, expiry, "seen by" tracking with reminders, styled emails.
// Reads/writes go to db.announcements (admin only) and db.annState (open to all crew: seen + reactions),
// so ordinary crew can mark things read without admin rights.
(function(){
  const PRI={normal:{label:'',tone:'blue',icon:'📢',color:'#5B9DF5'},important:{label:'IMPORTANT',tone:'amber',icon:'❗',color:'#F0B24A'},urgent:{label:'URGENT',tone:'red',icon:'🚨',color:'#E5484D'}};
  const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pri=a=>PRI[a.priority]?a.priority:'normal';
  const expired=a=>!!a.expires&&a.expires<Date.now();
  const state=id=>{ if(!db.annState||Array.isArray(db.annState))db.annState={}; return db.annState[id]||(db.annState[id]={seen:{},react:{}}); };
  // People an announcement is meant for: active crew, in the department if one was chosen.
  const targets=a=>(db.technicians||[]).filter(t=>t.active!==false&&(!a.dept||t.dept===a.dept||!t.dept));
  const visible=a=>isAdmin()||!expired(a);
  window.kccAnnTargets=targets;

  const saveAnnouncement_=function(){
    if(!isAdmin()){toast('Admin required','error');return;}
    const g=id=>document.getElementById(id);
    const title=(g('an-title').value||'').trim(), body=(g('an-body').value||'').trim();
    if(!title||!body){toast('Title and message required','error');return;}
    const expV=g('an-exp').value, expires=expV?new Date(expV+'T23:59:59').getTime():null;
    if(expires&&expires<Date.now()){toast('The hide date is in the past','error');return;}
    const tech=getCurTech();
    const ann={id:'ann_'+Date.now(),title,body,dept:g('an-dept').value||'',priority:g('an-pri').value||'normal',expires,pinned:g('an-pin').checked||g('an-pri').value==='urgent',author:tech?tech.name:'Admin',createdAt:Date.now()};
    if(!db.announcements)db.announcements=[];
    db.announcements.unshift(ann);
    if(tech) state(ann.id).seen[tech.id]=Date.now();
    logAudit('Announcement Posted',ann.title);
    const mail=g('an-email').checked;
    save();closeM('addAnnouncement');renderAnnouncements();
    ['an-title','an-body','an-exp'].forEach(id=>g(id).value='');
    g('an-dept').value='';g('an-pri').value='normal';g('an-pin').checked=false;g('an-email').checked=false;
    toast('Announcement posted!','success');
    if(mail) sendAnnouncementEmails(ann);
  };

  // Styled email via the shared template. onlyIds limits it to certain people (reminders).
  const sendAnnouncementEmails_=async function(ann,onlyIds){
    let crew=targets(ann).filter(t=>t.email&&t.email.includes('@'));
    if(onlyIds) crew=crew.filter(t=>onlyIds.includes(t.id));
    if(!crew.length){toast('No crew emails on file','info');return;}
    const p=PRI[pri(ann)];
    const prefix=(onlyIds?'Reminder: ':'')+(pri(ann)==='urgent'?'🚨 URGENT: ':pri(ann)==='important'?'❗ ':'📢 ');
    const rows=[['Posted by',ann.author],['For',ann.dept?ann.dept+' department':'All departments']];
    if(ann.expires) rows.push(['Valid until',new Date(ann.expires).toLocaleDateString('en-CA',{month:'long',day:'numeric'})]);
    let sent=0,failed=0;
    for(const t of crew){
      try{ await emailjs.send(EJSID,EJTPL,kccNoticeParams(t,prefix+'KCC Technical: '+ann.title,{tone:p.tone,badge:(onlyIds?'Reminder · ':'')+(p.label||'Announcement'),headline:ann.title,body:ann.body,rows})); sent++; }
      catch(e){ console.warn('Announcement email failed for '+t.name,e); failed++; }
    }
    if(sent) toast('📧 '+(onlyIds?'Reminder':'Announcement')+' emailed to '+sent+' crew member'+(sent>1?'s':''),'success');
    if(failed) toast(failed+' email(s) failed to send','error');
  };

  window.annRemind=function(id){
    if(!isAdmin())return;
    const a=(db.announcements||[]).find(x=>x.id===id); if(!a)return;
    const seen=state(id).seen, unread=targets(a).filter(t=>!seen[t.id]&&t.email);
    if(!unread.length){toast('Everyone with an email has seen it','info');return;}
    if(!confirm('Email a reminder to '+unread.length+' crew member'+(unread.length>1?'s':'')+' who have not seen this yet?'))return;
    sendAnnouncementEmails(a,unread.map(t=>t.id));
  };
  window.annEditExpiry=function(id){
    if(!isAdmin())return;
    const a=(db.announcements||[]).find(x=>x.id===id); if(!a)return;
    const v=prompt('Hide this announcement after (YYYY-MM-DD). Leave empty to never hide it:',a.expires?new Date(a.expires).toISOString().slice(0,10):'');
    if(v===null)return;
    if(!v.trim()) a.expires=null;
    else if(/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) a.expires=new Date(v.trim()+'T23:59:59').getTime();
    else {toast('Use the format YYYY-MM-DD','error');return;}
    save();renderAnnouncements();
  };
  const annReact_=function(annId,emoji){
    const tech=getCurTech(); if(!tech){toast('Log in to react','info');return;}
    const r=state(annId).react; if(!r[emoji])r[emoji]=[];
    const i=r[emoji].indexOf(tech.id); if(i<0)r[emoji].push(tech.id); else r[emoji].splice(i,1);
    save();renderAnnouncements();
  };
  window.annToggleSeen=function(id){ const el=document.getElementById('ann-seen-'+id); if(el) el.style.display=el.style.display==='none'?'':'none'; };

  // Record that the signed-in person has looked at what is visible to them (saved once, not on every render).
  function markSeen(list){
    const tech=getCurTech(); if(!tech)return;
    let changed=false;
    list.forEach(a=>{ if(expired(a))return; const s=state(a.id); if(!s.seen[tech.id]){ s.seen[tech.id]=Date.now(); changed=true; } });
    if(changed) setTimeout(()=>{ try{save();}catch(e){} },0);
  }

  const renderAnnouncements_=function(){
    if(!db.announcements)db.announcements=[];
    const listEl=document.getElementById('ann-list'); if(!listEl)return;
    const rank={urgent:2,important:1,normal:0};
    const items=db.announcements.filter(visible).sort((a,b)=>(expired(a)-expired(b))||((b.pinned?1:0)-(a.pinned?1:0))||(rank[pri(b)]-rank[pri(a)])||(b.createdAt-a.createdAt));
    if(!items.length){listEl.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">📢</div><div class="dim">No announcements right now</div>'+(isAdmin()?'<button class="btn ba bsm" style="margin-top:12px" onclick="openM(\'addAnnouncement\')">+ Post the first one</button>':'')+'</div>';return;}
    const cur=getCurTech(), EMO=['👍','❤️','🙏','🔥','✅'];
    listEl.innerHTML=items.map(a=>{
      const p=PRI[pri(a)], s=state(a.id), exp=expired(a);
      const deptB=a.dept?deptBadge(a.dept):'<span class="badge blow">All depts</span>';
      const legacy=a.reactions||{};
      const react=EMO.map(e=>{
        const who=Array.from(new Set([].concat(legacy[e]||[],s.react[e]||[])));
        const mine=cur&&who.includes(cur.id);
        return '<button onclick="annReact(\''+E(a.id)+'\',\''+e+'\')" style="display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;border:1px solid '+(mine?'var(--amber)':'var(--border)')+';background:'+(mine?'var(--aglow)':'transparent')+';cursor:pointer;font-size:13px">'+e+(who.length?'<span style="font-size:11px;font-family:var(--mono)">'+who.length+'</span>':'')+'</button>';
      }).join('');
      let seenHtml='';
      if(isAdmin()){
        const T=targets(a), seenN=T.filter(t=>s.seen[t.id]).length, un=T.filter(t=>!s.seen[t.id]);
        seenHtml='<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;font-family:var(--mono)">'+
          '<button onclick="annToggleSeen(\''+E(a.id)+'\')" style="background:none;border:none;cursor:pointer;color:'+(un.length?'var(--amber)':'#2DD4A0')+';font-family:var(--mono);font-size:12px;padding:0">👁 Seen by '+seenN+'/'+T.length+(un.length?' — '+un.length+' not yet':' ✓')+'</button>'+
          (un.length?' <button class="btn bgh bsm" style="margin-left:8px" onclick="annRemind(\''+E(a.id)+'\')">Remind unread</button>':'')+
          '<div id="ann-seen-'+E(a.id)+'" style="display:none;margin-top:6px;line-height:1.7">'+
            (T.filter(t=>s.seen[t.id]).map(t=>'<span style="color:#2DD4A0">✓ '+E(t.name)+'</span>').concat(un.map(t=>'<span style="color:var(--dim,#888)">○ '+E(t.name)+'</span>')).join(' &nbsp; '))+
          '</div></div>';
      }
      return '<div class="ann-card'+(a.pinned?' pinned':'')+'" style="'+(pri(a)!=='normal'?'border-left:4px solid '+p.color+';':'')+(exp?'opacity:.55;':'')+'">'+
        '<div class="row jbet mb8"><div class="row gap6" style="flex-wrap:wrap">'+
          (pri(a)!=='normal'?'<span style="font-size:11px;font-family:var(--mono);font-weight:800;letter-spacing:1px;color:#fff;background:'+p.color+';padding:2px 8px;border-radius:10px">'+p.icon+' '+p.label+'</span>':'')+
          (a.pinned?'<span style="font-size:12px;font-family:var(--mono);color:#0F6E56;font-weight:700">📌 PINNED</span>':'')+
          (exp?'<span style="font-size:11px;font-family:var(--mono);color:var(--dim,#888)">EXPIRED · only admins see this</span>':'')+
          '<div class="fw7" style="font-size:15px">'+E(a.title)+'</div></div>'+deptB+'</div>'+
        '<div style="font-size:14px;line-height:1.6;color:var(--text);margin-bottom:10px;white-space:pre-line">'+E(a.body)+'</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+react+'</div>'+
        '<div class="dim">'+E(a.author)+' · '+fmtDate(a.createdAt)+(a.expires&&!exp?' · hides '+fmtDate(a.expires):'')+
          (isAdmin()?' &nbsp;<button onclick="annEditExpiry(\''+E(a.id)+'\')" style="background:none;border:none;color:var(--amber);cursor:pointer;font-size:11px;font-family:var(--mono)">hide date</button> <button onclick="deleteAnnouncement(\''+E(a.id)+'\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:11px;font-family:var(--mono)">delete</button>':'')+
        '</div>'+seenHtml+'</div>';
    }).join('');
    markSeen(items);
  };

  // Red strip at the top of the dashboard for urgent announcements this person has not opened yet.
  function banner(){
    const dash=document.getElementById('pg-dashboard'); if(!dash)return;
    let el=document.getElementById('ann-urgent'); 
    if(!el){ el=document.createElement('div'); el.id='ann-urgent'; dash.insertBefore(el,dash.firstChild); }
    const cur=getCurTech();
    const list=(db.announcements||[]).filter(a=>pri(a)==='urgent'&&!expired(a)&&cur&&!state(a.id).seen[cur.id]);
    el.innerHTML=list.map(a=>'<div onclick="go(\'announcements\')" style="cursor:pointer;margin-bottom:10px;padding:12px 16px;border-radius:10px;background:#2A1214;border:1px solid #5C2227;border-left:5px solid #E5484D;color:#FF9AA0"><b style="letter-spacing:1px;font-size:11px">🚨 URGENT</b><div style="font-size:15px;font-weight:700;color:#fff;margin-top:2px">'+E(a.title)+'</div><div style="font-size:12px;margin-top:2px">Tap to read</div></div>').join('');
  }
  window.addEventListener('DOMContentLoaded',()=>{
    saveAnnouncement=saveAnnouncement_; sendAnnouncementEmails=sendAnnouncementEmails_; annReact=annReact_; renderAnnouncements=renderAnnouncements_;
    const old=renderDash;
    renderDash=function(){ old.apply(this,arguments); try{banner();}catch(e){console.error('ann banner',e);} };
  });
})();
