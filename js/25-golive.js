// Go-live check: one card that rolls up everything that must be true before the stream starts.
// Reads state the other tiles already poll (vMix, ProPresenter, YouTube, booth bridge) plus crew, stations and outages.
function glChecks(){
  const esc=_ppEsc, out=[];
  const {entry,need,done}=sdReadyInfo();
  const crew=(entry.crew||[]), conf=entry.confirmed||{};
  const c=crew.filter(id=>conf[id]).length;
  out.push(!crew.length?{k:'Crew',s:'bad',t:'Nobody scheduled'}
    :c===crew.length?{k:'Crew',s:'ok',t:'All '+crew.length+' confirmed'}
    :{k:'Crew',s:'warn',t:c+' of '+crew.length+' confirmed'});
  out.push(need.length&&done.length===need.length?{k:'Stations',s:'ok',t:'All '+need.length+' signed off'}
    :{k:'Stations',s:need.length?'warn':'skip',t:need.length?done.length+' of '+need.length+' signed off':'None set up'});
  const open=(db.outages||[]).filter(o=>!o.resolved).length;
  out.push(open?{k:'Fixtures',s:'warn',t:open+' open outage'+(open>1?'s':'')}:{k:'Fixtures',s:'ok',t:'No open outages'});
  const od=(db.checkouts||[]).filter(x=>!x.returnedAt&&x.dueDate&&x.dueDate<Date.now()).length;
  if(od) out.push({k:'Gear',s:'warn',t:od+' item'+(od>1?'s':'')+' overdue'});
  const y=window._yt||{};
  if(y.state==='unset'||y.state===undefined) out.push({k:'YouTube',s:'skip',t:'Not set up'});
  else out.push(y.state==='live'?{k:'YouTube',s:'ok',t:'Live now'}:y.state==='sched'?{k:'YouTube',s:'ok',t:'Stream scheduled'}
    :y.state==='error'?{k:'YouTube',s:'bad',t:'Cannot reach YouTube'}:{k:'YouTube',s:'bad',t:'No stream scheduled'});
  const v=window._vm||{state:'unset'};
  out.push(v.state==='unset'?{k:'vMix',s:'skip',t:'Not set up'}:v.state==='error'?{k:'vMix',s:'bad',t:"Can't reach vMix"}
    :{k:'vMix',s:'ok',t:v.streaming?'Streaming':'Connected, not streaming yet'});
  const p=window._pp||{state:'unset'};
  out.push(p.state==='unset'?{k:'ProPresenter',s:'skip',t:'Not set up'}:p.state==='error'?{k:'ProPresenter',s:'bad',t:"Can't reach ProPresenter"}
    :p.pres?{k:'ProPresenter',s:'ok',t:p.pres}:{k:'ProPresenter',s:'warn',t:'Connected, no presentation open'});
  const b=window._br||{state:'unset'};
  if(b.state!=='unset'){
    out.push(b.state==='error'?{k:'Booth bridge',s:'bad',t:"Can't reach the bridge"}
      :b.x32&&b.x32.ok?{k:'X32',s:b.x32.mainMuted?'warn':'ok',t:b.x32.mainMuted?'Main LR is muted':'Connected, main LR on'}:{k:'X32',s:'bad',t:'X32 not answering'});
  }
  return out;
}
function glCardHtml(){
  const cs=glChecks(), live=cs.filter(c=>c.s!=='skip');
  const bad=live.filter(c=>c.s==='bad').length, warn=live.filter(c=>c.s==='warn').length;
  const verdict=bad?{t:bad+' blocking',c:'#FF8A80',bg:''}:warn?{t:warn+' to check',c:'#FBBF24',bg:''}:{t:'Good to go',c:'#06231B',bg:'#2DD4A0'};
  const col={ok:'#2DD4A0',warn:'#FBBF24',bad:'#FF8A80',skip:'var(--dim2)'}, ic={ok:'●',warn:'▲',bad:'✕',skip:'–'};
  return `<div class="sd-card gl-card" style="${!bad&&!warn?'border-color:#2DD4A0':''}"><h3>Go-live check <span class="sd-pill" style="color:${verdict.c};${verdict.bg?'background:'+verdict.bg:''}">${verdict.t}</span></h3>
    ${cs.map(c=>`<div class="sd-row" style="${c.s==='skip'?'opacity:.55':''}"><span style="color:${col[c.s]};width:18px;text-align:center">${ic[c.s]}</span><span style="flex:1;font-weight:600">${_ppEsc(c.k)}</span><span class="dim" style="font-size:13px">${_ppEsc(c.t)}</span></div>`).join('')}</div>`;
}
function glPaint(){ document.querySelectorAll('.gl-card').forEach(el=>{ el.outerHTML=glCardHtml(); }); }
const _glReady=sdReadyCard;
sdReadyCard=function(esc){ return glCardHtml()+_glReady(esc); };
['vmPaint','ppPaint','ytPaint'].forEach(n=>{ const f=window[n]; if(typeof f==='function') window[n]=function(){ const r=f.apply(this,arguments); try{glPaint();}catch(e){} return r; }; });
