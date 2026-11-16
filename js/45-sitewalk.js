// Pre-event site walk: an admin walks the room before a big event and records what is ready and what is not.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SECTIONS=[
    ['⚡ Power & cables',[['pw1','Enough power outlets for all the gear'],['pw2','Cable runs are taped or covered, nothing to trip on'],['pw3','Extension cords and power bars are rated and not overloaded']]],
    ['🎚️ Audio',[['au1','Mic count and types match the request'],['au2','Spare batteries for wireless mics'],['au3','Monitors or wedges placed and tested'],['au4','Playback source works (laptop, phone, CD)'],['au5','DI boxes ready for any instruments'],['au6','Sound check time agreed']]],
    ['📺 Video & slides',[['vd1','Projector and screens work, image is in focus'],['vd2','Slides or video file received and tested'],['vd3','Guest laptop adapter (HDMI) available'],['vd4','Camera positions are clear and not blocked']]],
    ['💡 Lighting',[['lt1','All lights respond, no burnt out lamps'],['lt2','Stage and house lighting looks set'],['lt3','Lighting plan agreed for the event']]],
    ['📡 Livestream',[['st1','Internet speed tested'],['st2','YouTube event created and scheduled'],['st3','Stream audio and video checked']]],
    ['🚪 People & safety',[['pp1','Load-in door and parking sorted'],['pp2','Contact person on the day confirmed'],['pp3','Crew assigned to each station'],['pp4','Run of show received'],['pp5','Exits are clear and signs visible']]]
  ];
  const ALL=[].concat.apply([],SECTIONS.map(s=>s[1]));
  const walks=()=>db.siteWalks=db.siteWalks||[];
  let cur=null;
  const counts=w=>{ let ok=0,issue=0,left=0; ALL.forEach(i=>{ const s=(w.items[i[0]]||{}).s; if(s==='ok'||s==='na') ok++; else if(s==='issue') issue++; else left++; }); return {ok,issue,left}; };
  function close(){ const o=document.getElementById('sw-modal'); if(o) o.remove(); }
  function shell(inner){
    let o=document.getElementById('sw-modal');
    if(!o){ o=document.createElement('div'); o.id='sw-modal'; o.className='mover'; o.style.display='flex'; o.onclick=e=>{ if(e.target===o) close(); }; document.body.appendChild(o); }
    o.innerHTML='<div class="modal" style="max-width:760px;max-height:92vh;overflow-y:auto">'+inner+'</div>';
  }
  function paintList(){
    const l=walks();
    shell('<div class="mh"><span class="mt">🧭 Pre-event site walks</span><button class="xb" onclick="swClose()">✕</button></div><div class="mb">'+
      '<button class="btn ba mb14" onclick="swNew()">+ Start a new site walk</button>'+
      (l.length?l.map(w=>{ const c=counts(w); return '<div class="panel mb14"><div class="pb row jbet" style="gap:10px;flex-wrap:wrap"><div><b>'+E(w.event||'Untitled event')+'</b> <span class="dim" style="font-size:12px">'+E(w.date||'')+(w.venue?' · '+E(w.venue):'')+'</span>'+
        '<div class="dim" style="font-size:12px">Walked by '+E(w.by||'-')+' · '+(w.status==='done'?'Complete':'In progress')+' · '+c.ok+' ready'+(c.issue?', <span style="color:#FF8A80">'+c.issue+' issue'+(c.issue>1?'s':'')+'</span>':'')+(c.left?', '+c.left+' not checked':'')+'</div></div>'+
        '<div class="row gap6"><button class="btn ba bsm" onclick="swOpen(\''+E(w.id)+'\')">Open</button><button class="btn bgh bsm" onclick="swDelete(\''+E(w.id)+'\')">🗑</button></div></div></div>'; }).join('')
        :'<div class="dim" style="text-align:center;padding:26px">No site walks yet. Start one before your next big event.</div>')+'</div>');
  }
  function paintWalk(){
    const w=cur; const c=counts(w);
    const btn=(k,v,label,col)=>{ const on=(w.items[k]||{}).s===v; return '<button type="button" onclick="swSet(\''+k+'\',\''+v+'\')" style="padding:5px 10px;border-radius:8px;border:1px solid '+(on?col:'var(--border,#333)')+';background:'+(on?col+'33':'transparent')+';color:'+(on?col:'inherit')+';font-size:12px;cursor:pointer">'+label+'</button>'; };
    shell('<div class="mh"><span class="mt">🧭 Site walk</span><button class="xb" onclick="swClose()">✕</button></div><div class="mb">'+
      '<div class="fg2"><div class="fg"><label>Event</label><input id="sw-event" value="'+E(w.event)+'" oninput="swField(\'event\',this.value)" maxlength="120" placeholder="e.g. Youth conference"></div>'+
      '<div class="fg"><label>Date</label><input id="sw-date" type="date" value="'+E(w.date)+'" onchange="swField(\'date\',this.value)"></div>'+
      '<div class="fg"><label>Room / venue</label><input id="sw-venue" value="'+E(w.venue)+'" oninput="swField(\'venue\',this.value)" maxlength="120" placeholder="Main sanctuary"></div></div>'+
      '<div style="position:sticky;top:0;background:var(--card,#111);padding:8px 0;z-index:2;font-size:13px"><b>'+c.ok+'</b> ready'+(c.issue?' · <b style="color:#FF8A80">'+c.issue+' issue'+(c.issue>1?'s':'')+'</b>':'')+' · '+c.left+' not checked yet</div>'+
      SECTIONS.map(s=>'<div class="panel mb14"><div class="ph"><span class="pt">'+s[0]+'</span></div><div class="pb">'+s[1].map(i=>{ const it=w.items[i[0]]||{}; return '<div style="padding:8px 0;border-top:1px solid var(--border,#2a2a2a)"><div class="row jbet" style="gap:8px;flex-wrap:wrap"><span style="font-size:13px;flex:1;min-width:200px">'+E(i[1])+'</span><span class="row gap6">'+btn(i[0],'ok','✓ Ready','#2DD4A0')+btn(i[0],'issue','⚠ Issue','#FF8A80')+btn(i[0],'na','N/A','#888')+'</span></div>'+
        (it.s==='issue'?'<input value="'+E(it.n||'')+'" oninput="swNote(\''+i[0]+'\',this.value)" maxlength="300" placeholder="What is the problem and who will fix it?" style="margin-top:6px;width:100%">':'')+'</div>'; }).join('')+'</div></div>').join('')+
      '<div class="fg"><label>Other notes</label><textarea id="sw-notes" rows="3" maxlength="1000" oninput="swField(\'notes\',this.value)">'+E(w.notes||'')+'</textarea></div>'+
      '<div class="row gap8" style="flex-wrap:wrap;margin-top:12px"><button class="btn ba" onclick="swDone()">'+(w.status==='done'?'Reopen':'Mark complete')+'</button><button class="btn bgh" onclick="swPrint()">🖨️ Print</button><button class="btn bgh" onclick="swList()">Back to list</button></div></div>');
  }
  window.swClose=close;
  window.swOpenList=function(){ if(!isAdmin()) return; paintList(); };
  window.swList=function(){ cur=null; paintList(); };
  window.swNew=function(){ const me=getCurTech&&getCurTech()||{}; cur={id:'sw_'+Date.now(),event:'',date:'',venue:'',by:me.name||'',byId:me.id||'',createdAt:Date.now(),items:{},notes:'',status:'draft'}; walks().unshift(cur); save(); paintWalk(); };
  window.swOpen=function(id){ const w=walks().find(x=>x.id===id); if(!w) return; cur=w; paintWalk(); };
  window.swDelete=function(id){ if(!confirm('Delete this site walk?')) return; db.siteWalks=walks().filter(x=>x.id!==id); save(); paintList(); };
  window.swField=function(k,v){ if(!cur) return; cur[k]=v; save(); };
  window.swNote=function(k,v){ if(!cur) return; (cur.items[k]=cur.items[k]||{}).n=v.slice(0,300); save(); };
  window.swSet=function(k,v){ if(!cur) return; const it=cur.items[k]=cur.items[k]||{}; it.s=it.s===v?'':v; save(); const y=document.querySelector('#sw-modal .modal').scrollTop; paintWalk(); document.querySelector('#sw-modal .modal').scrollTop=y; };
  window.swDone=function(){ if(!cur) return; cur.status=cur.status==='done'?'draft':'done'; save(); paintWalk(); if(cur.status==='done') toast('Site walk complete','success'); };
  window.swPrint=function(){
    const w=cur; if(!w) return; const w2=window.open('','_blank'); if(!w2) return;
    const lab={ok:'Ready',issue:'ISSUE',na:'N/A','':'Not checked',undefined:'Not checked'};
    w2.document.write('<!doctype html><title>Site walk</title><body style="font-family:Arial,sans-serif;max-width:760px;margin:24px auto;font-size:14px"><h2>Pre-event site walk</h2><p><b>'+E(w.event)+'</b><br>'+E(w.date)+(w.venue?' · '+E(w.venue):'')+'<br>Walked by '+E(w.by)+'</p>'+
      SECTIONS.map(s=>'<h3 style="margin:16px 0 4px">'+E(s[0])+'</h3><table style="width:100%;border-collapse:collapse">'+s[1].map(i=>{ const it=w.items[i[0]]||{}; return '<tr><td style="border-bottom:1px solid #ccc;padding:5px">'+E(i[1])+(it.n?'<br><i>'+E(it.n)+'</i>':'')+'</td><td style="border-bottom:1px solid #ccc;padding:5px;white-space:nowrap;'+(it.s==='issue'?'color:#c00;font-weight:bold':'')+'">'+lab[it.s||'']+'</td></tr>'; }).join('')+'</table>').join('')+
      (w.notes?'<h3>Notes</h3><p>'+E(w.notes)+'</p>':'')+'<script>setTimeout(function(){print()},300)<\/script></body>');
    w2.document.close();
  };
})();
