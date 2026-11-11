// Booth bridge tile: X32 status and MyDMX scene buttons, via the small program in tools/booth-bridge running on the booth PC.
window._br={state:'unset'}; window._brEdit=false;
function brHost(){ return ((db.settings||{}).bridgeHost||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,''); }
function brHeaders(){ const t=((db.settings||{}).bridgeToken||'').trim(); return t?{'X-Booth-Token':t}:{}; }
async function brPoll(){
  const h=brHost(); if(!h){ window._br={state:'unset'}; brPaint(); return; }
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),3000);
  try{
    const r=await fetch('http://'+h+'/status',{signal:ctl.signal,headers:brHeaders()}); clearTimeout(to);
    if(r.status===401) throw new Error('wrong token');
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json(); window._br=Object.assign({state:'ok',ts:Date.now()},j);
  }catch(e){ clearTimeout(to); window._br={state:'error',err:e.name==='AbortError'?'no answer':e.message}; }
  brPaint();
}
function brCanFire(){ const me=getCurTech(); return isAdmin()||!!(me&&/light/i.test(me.dept||'')); }
async function brScene(i,name){
  const h=brHost(); if(!h) return;
  try{
    const r=await fetch('http://'+h+'/dmx/scene',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},brHeaders()),body:JSON.stringify({i:i})});
    const j=await r.json(); if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
    toast('Lights: '+name,'success');
  }catch(e){ toast("Couldn't change the lights: "+e.message,'error'); }
}
function brBodyHtml(){
  const v=window._br, admin=isAdmin(), E=_ppEsc;
  const setup=`<div class="yt-setup"><label>Booth bridge address (booth PC IP and port)</label><input id="br-host" value="${E(brHost())}" placeholder="192.168.1.80:8099"><label style="margin-top:8px">Token (optional, must match the bridge)</label><input id="br-token" type="password" value="" placeholder="${(db.settings||{}).bridgeToken?'Saved — type a new one to replace it':'leave blank if none'}" autocomplete="off"><button class="btn ba" style="margin-top:8px" onclick="brSaveCfg()">Save</button><div class="dim" style="margin-top:6px;font-size:12px">Run the booth bridge on the booth PC (see tools/booth-bridge). Works on the church network.</div></div>`;
  if(window._brEdit&&admin) return setup;
  if(v.state==='unset') return admin?`<div class="dim">Not set up. <button class="btn bgh bsm" onclick="brToggleEdit()">Set up</button></div>`:'<div class="dim">Not set up.</div>';
  if(v.state==='error') return `<div style="color:var(--red);font-size:13px">Can't reach the booth bridge (${E(v.err)}). Is it running on the booth PC?${admin?' <button class="btn bgh bsm" onclick="brToggleEdit()">Settings</button>':''}</div>`;
  const x=v.x32||{}, pill=(on,t,c)=>`<span class="badge" style="background:${on?c:'var(--s3)'};color:${on?'#06231B':'var(--dim2)'};font-weight:700">${t}</span>`;
  const mutedCh=(x.channels||[]).filter(c=>c.muted);
  const x32=!x.configured?'<div class="dim" style="font-size:12px">X32 not set on the bridge.</div>'
    :`<div style="display:flex;gap:8px;margin-bottom:8px">${pill(x.ok,x.ok?'X32 ONLINE':'X32 OFFLINE','#2DD4A0')}${x.ok?pill(x.mainMuted===false,x.mainMuted?'MAIN MUTED':'MAIN ON',x.mainMuted?'#FF8A80':'#2DD4A0'):''}</div>
       ${x.ok?`<div class="dim" style="font-size:12px">Muted channels: ${mutedCh.length?mutedCh.map(c=>E(c.name||('Ch '+c.n))).join(', '):'none'}</div>`:''}`;
  const sc=(v.dmx&&v.dmx.scenes||[]), canFire=brCanFire();
  const dmx=sc.length?`<div style="margin-top:10px"><div class="dim" style="font-size:12px;margin-bottom:6px">Lights${v.dmx.midi?'':' (MIDI not set up on the bridge)'}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${sc.map(s=>`<button class="btn bgh bsm" ${canFire&&v.dmx.midi?'':'disabled'} onclick="brScene(${s.i},'${E(s.name).replace(/'/g,"\\'")}')">${E(s.name)}</button>`).join('')}</div>${canFire?'':'<div class="dim" style="font-size:11px;margin-top:4px">Lighting crew and admins can change scenes.</div>'}</div>`:'';
  return x32+dmx;
}
function brCardHtml(){ return `<div class="sd-card br-card" style="margin-top:18px"><h3>Booth ${isAdmin()?'<button class="btn bgh bsm" onclick="brToggleEdit()">Settings</button>':''}</h3><div class="br-body">${brBodyHtml()}</div></div>`; }
function brPaint(){ document.querySelectorAll('.br-body').forEach(el=>{ el.innerHTML=brBodyHtml(); }); try{glPaint();}catch(e){} }
function brToggleEdit(){ window._brEdit=!window._brEdit; brPaint(); }
function brSaveCfg(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const h=(document.getElementById('br-host').value||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
  if(h&&!/^[\w.-]+:\d{2,5}$/.test(h)){toast('Use the booth PC IP and port, for example 192.168.1.80:8099','error');return;}
  const tk=(document.getElementById('br-token').value||'').trim();
  db.settings.bridgeHost=h; if(tk) db.settings.bridgeToken=tk; save(); window._brEdit=false; brPoll(); toast(h?'Saved. Checking the bridge…':'Booth bridge removed','success');
}
const _ppCardBase=ppCardHtml;
ppCardHtml=function(){ return _ppCardBase()+brCardHtml(); };
const _ppStartBase=ytStart;
ytStart=function(){ _ppStartBase(); brPaint(); brPoll(); if(window._brTimer) return;
  window._brTimer=setInterval(()=>{ if(document.hidden||!['dashboard','sunday'].includes(_curPage)||!brHost()) return; brPoll(); },3000); };
