// ProPresenter status tile. Reads ProPresenter 7's network API (http://<pc>:<port>/v1/...) from the browser, so it only
// works on a device that can reach the ProPresenter PC (usually the church network). Read-only: it never changes slides.
// Shown under the vMix tile. In ProPresenter: Settings → Network → Enable Network, then note the port.
window._pp={state:'unset'}; window._ppEdit=false;
const _ppEsc=v=>String(v==null?'':v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function ppHost(){ return ((db.settings||{}).proPresenterHost||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,''); }
async function ppGet(h,p,ms){
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),ms||3000);
  try{ const r=await fetch('http://'+h+p,{signal:ctl.signal}); if(!r.ok) throw new Error('HTTP '+r.status); return r.status===204?null:await r.json(); }
  finally{ clearTimeout(to); }
}
async function ppPoll(){
  const h=ppHost(); if(!h){ window._pp={state:'unset'}; ppPaint(); return; }
  try{
    const ver=await ppGet(h,'/v1/version');
    // Each of these can be empty when nothing is on screen, so a failure there is not "can't reach".
    const soft=p=>ppGet(h,p).catch(()=>null);
    const [pres,idx,sl,tm]=await Promise.all([soft('/v1/presentation/active'),soft('/v1/presentation/slide_index'),soft('/v1/status/slide'),soft('/v1/timers/current')]);
    const nm=(pres&&pres.presentation&&pres.presentation.id&&pres.presentation.id.name)||(idx&&idx.presentation_index&&idx.presentation_index.presentation_id&&idx.presentation_index.presentation_id.name)||'';
    const cur=sl&&sl.current&&sl.current.text||'', nxt=sl&&sl.next&&sl.next.text||'';
    const i=idx&&idx.presentation_index?idx.presentation_index.index:null;
    const timers=Array.isArray(tm)?tm.filter(t=>t&&t.time&&t.time!=='--:--:--').map(t=>({name:t.id&&t.id.name||'Timer',time:t.time})).slice(0,3):[];
    window._pp={state:'ok',ver:(ver&&(ver.name?ver.name+' ':'')+(ver.host_description||ver.version||''))||'',pres:nm,idx:i,cur:cur,next:nxt,timers:timers,ts:Date.now()};
  }catch(e){ window._pp={state:'error',err:e.name==='AbortError'?'no answer':e.message}; }
  ppPaint();
}
function ppBodyHtml(){
  const v=window._pp, admin=isAdmin();
  const setup=`<div class="yt-setup"><label>ProPresenter address (PC name or IP and port)</label><input id="pp-host" value="${_ppEsc(ppHost())}" placeholder="192.168.1.60:1025"><button class="btn ba" onclick="ppSaveCfg()">Save</button><div class="dim" style="margin-top:6px;font-size:12px">In ProPresenter: Settings → Network → Enable Network, and use the port shown there. Works on the church network; a page loaded over https can't reach it from elsewhere. Read-only: this never changes your slides.</div></div>`;
  if(window._ppEdit&&admin) return setup;
  if(v.state==='unset') return admin?`<div class="dim">Not set up. <button class="btn bgh bsm" onclick="ppToggleEdit()">Set up</button></div>`:'<div class="dim">Not set up.</div>';
  if(v.state==='error') return `<div style="color:var(--red);font-size:13px">Can't reach ProPresenter (${_ppEsc(v.err)}). Check you're on the church network and Network is enabled.${admin?' <button class="btn bgh bsm" onclick="ppToggleEdit()">Settings</button>':''}</div>`;
  const t=s=>s?_ppEsc(String(s).replace(/\s+/g,' ').slice(0,120)):'<span class="dim">(blank)</span>';
  return `<div style="font-size:13px"><b>Presentation:</b> ${v.pres?_ppEsc(v.pres):'<span class="dim">none open</span>'}${v.idx!=null?' <span class="dim">· slide '+(v.idx+1)+'</span>':''}</div>
    <div style="font-size:13px;margin-top:6px"><b>On screen:</b> ${t(v.cur)}</div><div class="dim" style="font-size:12px">Next: ${t(v.next)}</div>
    ${v.timers.length?`<div class="dim" style="font-size:12px;margin-top:4px">${v.timers.map(x=>_ppEsc(x.name)+' '+_ppEsc(x.time)).join(' · ')}</div>`:''}
    <div class="dim" style="font-size:11px;margin-top:4px">${_ppEsc(v.ver)}</div>`;
}
function ppCardHtml(){ return `<div class="sd-card pp-card" style="margin-top:18px"><h3>ProPresenter ${isAdmin()?'<button class="btn bgh bsm" onclick="ppToggleEdit()">Settings</button>':''}</h3><div class="pp-body">${ppBodyHtml()}</div></div>`; }
function ppPaint(){ document.querySelectorAll('.pp-body').forEach(el=>{ el.innerHTML=ppBodyHtml(); }); }
function ppToggleEdit(){ window._ppEdit=!window._ppEdit; ppPaint(); }
function ppSaveCfg(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const h=(document.getElementById('pp-host').value||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
  if(h&&!/^[\w.-]+(:\d{2,5})?$/.test(h)){toast('Use a name or IP and port, for example 192.168.1.60:1025','error');return;}
  if(h&&!/:/.test(h)){toast('Add the port from ProPresenter’s Network settings, for example '+h+':1025','error');return;}
  db.settings.proPresenterHost=h; save(); window._ppEdit=false; ppPoll(); toast(h?'Saved. Checking ProPresenter…':'ProPresenter removed','success');
}
const _vmCardBase=vmCardHtml;
vmCardHtml=function(){ return _vmCardBase()+ppCardHtml(); };
const _vmStartBase=ytStart;
ytStart=function(){ _vmStartBase(); ppPaint(); ppPoll(); if(window._ppTimer) return;
  window._ppTimer=setInterval(()=>{ if(document.hidden||!['dashboard','sunday'].includes(_curPage)||!ppHost()) return; ppPoll(); },3000); };
