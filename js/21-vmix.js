// vMix status tile. Reads vMix's built-in web API (http://<pc>:8088/api) from the browser, so it only
// works on a device that can reach the vMix PC (usually the church network). Shown under Stream status.
window._vm={state:'unset'}; window._vmEdit=false;
const _vmEsc=v=>String(v==null?'':v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function vmHost(){ return ((db.settings||{}).vmixHost||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,''); }
async function vmPoll(){
  const h=vmHost(); if(!h){ window._vm={state:'unset'}; vmPaint(); return; }
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),3000);
  try{
    const res=await fetch('http://'+h+'/api',{signal:ctl.signal}); clearTimeout(to);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const x=new DOMParser().parseFromString(await res.text(),'text/xml');
    const q=t=>{const n=x.querySelector(t);return n?n.textContent.trim():'';};
    const inputs={}; x.querySelectorAll('inputs > input').forEach(i=>{inputs[i.getAttribute('number')]=i.getAttribute('title')||i.textContent.trim();});
    window._vm={state:'ok',ver:q('version'),streaming:q('streaming')==='True',recording:q('recording')==='True',
      live:inputs[q('active')]||('Input '+q('active')),next:inputs[q('preview')]||('Input '+q('preview')),ts:Date.now()};
  }catch(e){
    clearTimeout(to);
    window._vm={state:'error',err:e.name==='AbortError'?'no answer':e.message};
  }
  vmPaint();
}
function vmBodyHtml(){
  const v=window._vm, admin=isAdmin();
  const setup=`<div class="yt-setup"><label>vMix address (PC name or IP and port)</label><input id="vm-host" value="${_vmEsc(vmHost())}" placeholder="192.168.1.50:8088"><button class="btn ba" onclick="vmSaveCfg()">Save</button><div class="dim" style="margin-top:6px;font-size:12px">In vMix: Settings → Web Controller → enable. Works on the church network; a page loaded over https can't reach it from elsewhere.</div></div>`;
  if(window._vmEdit&&admin) return setup;
  if(v.state==='unset') return admin?`<div class="dim">Not set up. <button class="btn bgh bsm" onclick="vmToggleEdit()">Set up</button></div>`:'<div class="dim">Not set up.</div>';
  if(v.state==='error') return `<div style="color:var(--red);font-size:13px">Can't reach vMix (${_vmEsc(v.err)}). Check you're on the church network and the Web Controller is on.${admin?' <button class="btn bgh bsm" onclick="vmToggleEdit()">Settings</button>':''}</div>`;
  const pill=(on,t,c)=>`<span class="badge" style="background:${on?c:'var(--s3)'};color:${on?'#06231B':'var(--dim2)'};font-weight:700">${t}${on?'':' off'}</span>`;
  return `<div style="display:flex;gap:8px;margin-bottom:10px">${pill(v.streaming,'STREAMING','#2DD4A0')}${pill(v.recording,'RECORDING','#FF8A80')}</div>
    <div style="font-size:13px"><b>Live:</b> ${_vmEsc(v.live)}</div><div class="dim" style="font-size:12px">Next: ${_vmEsc(v.next)} · vMix ${_vmEsc(v.ver)}</div>`;
}
function vmCardHtml(){ return `<div class="sd-card vm-card" style="margin-top:18px"><h3>vMix ${isAdmin()?'<button class="btn bgh bsm" onclick="vmToggleEdit()">Settings</button>':''}</h3><div class="vm-body">${vmBodyHtml()}</div></div>`; }
function vmPaint(){ document.querySelectorAll('.vm-body').forEach(el=>{ el.innerHTML=vmBodyHtml(); }); }
function vmToggleEdit(){ window._vmEdit=!window._vmEdit; vmPaint(); }
function vmSaveCfg(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const h=(document.getElementById('vm-host').value||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
  if(h&&!/^[\w.-]+(:\d{2,5})?$/.test(h)){toast('Use a name or IP, for example 192.168.1.50:8088','error');return;}
  db.settings.vmixHost=h&&!/:/.test(h)?h+':8088':h; save(); window._vmEdit=false; vmPoll(); toast(h?'Saved. Checking vMix…':'vMix removed','success');
}
// Show the tile wherever the Stream status tile shows, and poll every 5s while it's visible.
const _ytCardBase=ytCardHtml;
ytCardHtml=function(){ return _ytCardBase()+vmCardHtml(); };
const _ytStartBase=ytStart;
ytStart=function(){ _ytStartBase(); vmPaint(); vmPoll(); if(window._vmTimer) return;
  window._vmTimer=setInterval(()=>{ if(document.hidden||!['dashboard','sunday'].includes(_curPage)||!vmHost()) return; vmPoll(); },5000); };
