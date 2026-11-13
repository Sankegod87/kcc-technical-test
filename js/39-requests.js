// Tech requests inbox: filters + search, due dates, urgent first, one-tap approve / decline / done,
// add to the schedule, and an email to the requester when the status changes.
(function(){
  const ST={open:['New','#E0A526'],approved:['Approved','#2DD4A0'],progress:['In progress','#5B9DF5'],done:['Done','#8FA39B'],declined:['Declined','#E5484D'],cancelled:['Declined','#E5484D']};
  const ACTIVE=['open','approved','progress'];
  const FILTERS=[['active','Active'],['venue','Venue bookings'],['open','New'],['approved','Approved'],['progress','In progress'],['done','Done'],['declined','Declined'],['all','All']];
  const t12=v=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(v||''); if(!m) return v||''; let h=+m[1]; const ap=h>=12?'PM':'AM'; h=h%12||12; return h+':'+m[2]+' '+ap; };
  const inFilter=(r,f)=>f==='all'||(f==='venue'?r.requesterType==='venue':false)||(f==='active'?ACTIVE.includes(r.status):f==='declined'?(r.status==='declined'||r.status==='cancelled'):r.status===f);
  const days=r=>r.neededBy?Math.round((r.neededBy-Date.now())/864e5):null;
  function dueBadge(r){
    const d=days(r); if(d===null) return '';
    const live=ACTIVE.includes(r.status);
    const txt=d<0?'Overdue by '+(-d)+' day'+(d===-1?'':'s'):d===0?'Today':d===1?'Tomorrow':d<=14?'In '+d+' days':fmtDate(r.neededBy);
    const col=!live?'#8FA39B':d<=3?'#E5484D':d<=7?'#E0A526':'#8FA39B';
    return '<span class="rq-pill" style="color:'+col+';border-color:'+col+'55">📅 '+esc(txt)+'</span>';
  }
  function rqCard(r){
    const st=ST[r.status]||ST.open, assigned=(db.technicians||[]).find(x=>x.id===r.assignedTo), by=(db.technicians||[]).find(x=>x.id===r.requestedBy);
    const who=r.source==='external'?esc(r.requesterName||'')+(r.requesterDept?' · '+esc(r.requesterDept):''):esc(by?by.name:'');
    const links=[r.requesterEmail?'<a href="mailto:'+esc(r.requesterEmail)+'">'+esc(r.requesterEmail)+'</a>':'',r.requesterContact?(/^[\d\s+().-]{7,}$/.test(r.requesterContact)?'<a href="tel:'+esc(r.requesterContact.replace(/[^\d+]/g,''))+'">'+esc(r.requesterContact)+'</a>':esc(r.requesterContact)):''].filter(Boolean).join(' · ');
    const when=[r.eventType,r.neededBy?fmtDate(r.neededBy):'',(r.startTime?t12(r.startTime):'')+(r.endTime?' – '+t12(r.endTime):''),r.location,r.attendance?r.attendance+' people':'',r.bookingRef?'Ref: '+r.bookingRef:''].filter(x=>x&&String(x).trim()).map(esc).join(' · ');
    const needs=(r.category||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>'<span class="rq-chip">'+esc(x)+'</span>').join('');
    const admin=isAdmin(), q=esc(r.id);
    const B=(act,label,cls)=>'<button class="btn '+(cls||'bgh')+' bsm" onclick="reqAct(\''+q+'\',\''+act+'\')">'+label+'</button>';
    let btns='';
    if(admin){
      if(r.status==='open') btns+=B('approve','✅ Approve','ba')+B('decline','⛔ Decline');
      if(r.status==='approved') btns+=(r.neededBy&&!r.eventId?'<button class="btn ba bsm" onclick="reqToSchedule(\''+q+'\')">📅 Add to schedule</button>':'')+B('start','▶ Start')+B('done','✔ Done');
      if(r.status==='progress') btns+=B('done','✔ Mark done','ba');
      if(r.status==='done'||r.status==='declined'||r.status==='cancelled') btns+=B('reopen','↩ Reopen');
      if(r.requesterEmail) btns+='<a class="btn bgh bsm" href="mailto:'+esc(r.requesterEmail)+'?subject='+encodeURIComponent('Re: your tech request'+(r.ref?' ('+r.ref+')':''))+'">✉ Reply</a>';
    }
    if(r.agreement) btns+='<button class="btn bgh bsm" onclick="reqAgreement(\''+q+'\')">📄 Agreement</button>';
    btns+='<button class="btn bgh bsm" onclick="openEditRequest(\''+q+'\')">'+(admin?'✏️ Manage':'View')+'</button>';
    return '<div class="rq-card'+(r.priority==='urgent'&&ACTIVE.includes(r.status)?' rq-urgent':'')+'">'+
      '<div class="rq-top"><div class="rq-title">'+esc(r.title)+'</div><div class="rq-pills">'+
        (r.priority==='urgent'&&ACTIVE.includes(r.status)?'<span class="rq-pill" style="color:#E5484D;border-color:#E5484D55">URGENT</span>':'')+dueBadge(r)+
        (r.requesterType==='venue'?'<span class="rq-pill" style="color:#A9CCFF;border-color:#5B9DF555">🔑 Venue booking</span>':'')+
        (r.agreement?'<span class="rq-pill" style="color:#2DD4A0;border-color:#2DD4A055">✍ Signed</span>':(r.requesterType==='venue'?'<span class="rq-pill" style="color:#E0A526;border-color:#E0A52655">No agreement</span>':''))+
        '<span class="rq-pill" style="color:'+st[1]+';border-color:'+st[1]+'55;background:'+st[1]+'18">'+st[0]+'</span></div></div>'+
      (who||links?'<div class="rq-sub">'+who+(who&&links?' · ':'')+links+'</div>':'')+
      (when?'<div class="rq-sub">'+when+'</div>':'')+
      (needs?'<div class="rq-chips">'+needs+'</div>':'')+
      (r.details?'<div class="rq-details">'+esc(r.details)+'</div>':'')+
      (r.photos&&r.photos.length?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+r.photos.map(p=>'<img src="'+esc(safeImg(p))+'" onclick="viewPhotoLightbox(this.src)" style="width:48px;height:48px;object-fit:cover;border-radius:8px;cursor:pointer">').join('')+'</div>':'')+
      (assigned?'<div class="rq-sub">Assigned: <b>'+esc(assigned.name)+'</b></div>':'')+
      (r.adminNotes?'<div class="rq-sub" style="font-style:italic">Note: '+esc(r.adminNotes)+'</div>':'')+
      (r.eventId?'<div class="rq-sub">📅 On the schedule</div>':'')+
      '<div class="rq-btns">'+btns+'</div></div>';
  }
  function kccRenderRequests(){
    if(!db.techRequests) db.techRequests=[];
    _updateReqBadge();
    const all=db.techRequests, f=window._reqFilter||'active', qy=(window._reqQuery||'').toLowerCase().trim();
    const n=s=>all.filter(r=>r.status===s).length;
    const urgent=all.filter(r=>r.priority==='urgent'&&ACTIVE.includes(r.status)).length, soon=all.filter(r=>ACTIVE.includes(r.status)&&days(r)!==null&&days(r)<=7).length;
    document.getElementById('req-stats').innerHTML=
      '<div class="sc cb"><div class="sc-label">New</div><div class="sc-val">'+n('open')+'</div></div>'+
      '<div class="sc cg"><div class="sc-label">Approved</div><div class="sc-val">'+n('approved')+'</div></div>'+
      '<div class="sc cp"><div class="sc-label">In progress</div><div class="sc-val">'+n('progress')+'</div></div>'+
      '<div class="sc '+(urgent||soon?'cr':'ca')+'"><div class="sc-label">Due within a week</div><div class="sc-val">'+soon+'</div></div>';
    const fb=document.getElementById('req-filters');
    if(fb) fb.innerHTML=FILTERS.map(x=>{ const c=all.filter(r=>inFilter(r,x[0])).length; return '<button class="rq-filter'+(f===x[0]?' on':'')+'" onclick="reqFilter(\''+x[0]+'\')">'+x[1]+' <span>'+c+'</span></button>'; }).join('');
    let items=all.filter(r=>inFilter(r,f));
    if(qy) items=items.filter(r=>[r.title,r.details,r.requesterName,r.requesterDept,r.requesterEmail,r.requesterContact,r.category,r.location,r.eventType,r.ref].join(' ').toLowerCase().includes(qy));
    items.sort((a,b)=>{ const ua=a.priority==='urgent'?0:1, ub=b.priority==='urgent'?0:1; if(ua!==ub) return ua-ub; const da=a.neededBy||9e15, db_=b.neededBy||9e15; if(da!==db_) return da-db_; return (b.createdAt||0)-(a.createdAt||0); });
    const el=document.getElementById('req-list');
    el.innerHTML=items.length?items.map(rqCard).join(''):'<p class="dim" style="padding:16px">'+(qy?'No requests match your search.':'No requests here.')+'</p>';
  }
  window.reqFilter=function(f){ window._reqFilter=f; kccRenderRequests(); };
  window.reqSearch=function(v){ window._reqQuery=v||''; kccRenderRequests(); };
  async function mailRequester(r,st,note){
    if(!r.requesterEmail||typeof emailjs==='undefined') return;
    try{
      await emailjs.send(EJSID,EJTPL,{to_email:r.requesterEmail,to_name:r.requesterName||'',subject:KCC_EMAIL.requestSubject('status',r,st),message:'',html:KCC_EMAIL.requestStatus({name:r.requesterName||'',req:r,status:st,note}),fixture_name:'Tech request',fixture_id:r.id,bulb_type:r.category||'',reported_by:'KCC Technical'});
      toast('Emailed '+(r.requesterName||'the requester'),'success');
    }catch(e){ console.warn('request email failed',e); toast('Could not email the requester','error'); }
  }
  function mark(r,st,note){
    r.status=st; r.updatedAt=Date.now(); r.history=r.history||[];
    const me=getCurTech&&getCurTech(); r.history.push({t:Date.now(),what:st,by:me?me.name:'',note:note||''});
    try{ logAudit('Request '+st, r.title); }catch(e){}
  }
  window.reqAct=async function(id,act){
    if(!isAdmin()){ toast('Admin required','error'); return; }
    const r=(db.techRequests||[]).find(x=>x.id===id); if(!r) return;
    const st={approve:'approved',decline:'declined',start:'progress',done:'done',reopen:'open'}[act]; if(!st) return;
    let note='';
    if(act==='decline'){ const n=prompt('Reason for declining (the requester sees this, optional):',''); if(n===null) return; note=n.trim(); }
    mark(r,st,note); save(); kccRenderRequests(); _updateReqBadge();
    if(['approved','declined','done'].includes(st)) await mailRequester(r,st,note);
  };
  window.reqToSchedule=async function(id){
    if(!isAdmin()){ toast('Admin required','error'); return; }
    const r=(db.techRequests||[]).find(x=>x.id===id); if(!r||!r.neededBy){ toast('This request has no date','error'); return; }
    const ev={id:'se_'+Date.now(),title:(r.requesterDept||'Request')+(r.eventType?' — '+r.eventType:''),type:'',date:r.neededBy,time:t12(r.startTime),endTime:t12(r.endTime),location:r.location||'',notes:(r.details||'').slice(0,400)+(r.requesterName?'\nRequested by '+r.requesterName+(r.requesterContact?' · '+r.requesterContact:''):''),rundown:'',crew:[],roles:{},createdAt:Date.now()};
    (db.specialEvents=db.specialEvents||[]).push(ev); r.eventId=ev.id;
    mark(r,'progress','Added to the schedule'); save(); kccRenderRequests(); _updateReqBadge();
    toast('Added to the schedule. Assign crew in Schedule → special events.','success');
    await mailRequester(r,'progress','');
  };

  window.reqAgreement=function(id){ const r=(db.techRequests||[]).find(x=>x.id===id); if(r) kccAgreementOverlay(r); };
  window.addEventListener('DOMContentLoaded',()=>{
    renderRequests=kccRenderRequests;
    _updateReqBadge=function(){
      const open=(db.techRequests||[]).filter(r=>ACTIVE.includes(r.status)).length;
      const badge=document.getElementById('req-badge'); if(badge){ badge.style.display=open?'':'none'; badge.textContent=open; }
      applyPermissions();
    };
  });
})();
