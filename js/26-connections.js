// Settings → Connections: set up and test vMix, ProPresenter, the booth bridge and YouTube in one place.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>(v||'').trim().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
  const rows=[
    {id:'vm',label:'vMix',ph:'192.168.1.50:8088',hint:'vMix: Settings → Web Controller'},
    {id:'pp',label:'ProPresenter',ph:'192.168.1.60:1025',hint:'ProPresenter: Settings → Network → Enable Network'},
    {id:'br',label:'Booth bridge (X32 + lights)',ph:'192.168.1.80:8099',hint:'Run tools/booth-bridge on the booth PC'},
  ];
  function html(){
    return `<div class="ph"><span class="pt">🔌 Connections</span></div><div class="pb">
      <p class="dim mb12">Where the app finds your gear. These only work on the church network. Use Test before saving.</p>
      ${rows.map(r=>`<div class="fg" style="margin-bottom:12px"><label for="cn-${r.id}">${r.label}</label>
        <div style="display:flex;gap:6px"><input id="cn-${r.id}" placeholder="${r.ph}" style="flex:1"><button class="btn bgh bsm" onclick="cnTest('${r.id}')">Test</button></div>
        <div class="dim" style="font-size:11px;margin-top:3px">${r.hint}</div><div id="cn-${r.id}-res" style="font-size:12px;margin-top:3px"></div></div>`).join('')}
      <div class="fg" style="margin-bottom:12px"><label for="cn-brtoken">Booth bridge token (optional)</label><input id="cn-brtoken" type="password" autocomplete="off" placeholder="leave blank to keep the current one"></div>
      <div class="fg" style="margin-bottom:12px"><label for="cn-ytch">YouTube channel ID</label><div style="display:flex;gap:6px"><input id="cn-ytch" placeholder="UC…" style="flex:1"><button class="btn bgh bsm" onclick="cnTest('yt')">Test</button></div>
        <label for="cn-ytkey" style="margin-top:8px">YouTube API key</label><input id="cn-ytkey" type="password" autocomplete="off" placeholder="">
        <div class="dim" style="font-size:11px;margin-top:3px">The key is stored on the server and never sent to devices. Test saves it first.</div><div id="cn-yt-res" style="font-size:12px;margin-top:3px"></div></div>
      <button class="btn ba" onclick="cnSave()">Save connections</button></div>`;
  }
  const say=(id,ok,t)=>{ const el=document.getElementById('cn-'+id+'-res'); if(el){ el.style.color=ok?'#2DD4A0':'var(--red)'; el.textContent=(ok?'✓ ':'✕ ')+t; } };
  const hostOf=id=>{ const h=clean(document.getElementById('cn-'+id).value); return h; };
  async function tryFetch(url,opt){ const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),3500); try{ return await fetch(url,Object.assign({signal:ctl.signal},opt||{})); } finally{ clearTimeout(to); } }
  window.cnTest=async function(id){
    if(id==='yt'){
      const ch=(document.getElementById('cn-ytch').value||'').trim(), key=(document.getElementById('cn-ytkey').value||'').trim();
      if(!/^UC[\w-]{22}$/.test(ch)){ say('yt',false,'Channel ID looks wrong (starts with UC, 24 characters)'); return; }
      try{
        if(key){ await window._kccSetSecret('ytKey',key); window._ytKeySet=true; document.getElementById('cn-ytkey').value=''; }
        db.settings.ytChannelId=ch; await save(); window._yt.ts=0; await ytPoll(true);
        const y=window._yt; say('yt',y.state!=='error'&&y.state!=='unset',y.state==='live'?'Live now':y.state==='sched'?'Stream scheduled':y.state==='offline'?'Connected, no stream right now':(y.err||'Not set up'));
      }catch(e){ say('yt',false,srvErr?srvErr(e):e.message); }
      return;
    }
    const h=hostOf(id); if(!h){ say(id,false,'Enter an address first'); return; }
    if(!/^[\w.-]+:\d{2,5}$/.test(h)){ say(id,false,'Use name or IP and port, like 192.168.1.50:8088'); return; }
    say(id,true,'Checking…');
    try{
      if(id==='vm'){ const r=await tryFetch('http://'+h+'/api'); if(!r.ok) throw new Error('HTTP '+r.status); const m=/<version>([^<]*)/.exec(await r.text()); say(id,true,'Connected'+(m?' · vMix '+m[1]:'')); }
      else if(id==='pp'){ const r=await tryFetch('http://'+h+'/v1/version'); if(!r.ok) throw new Error('HTTP '+r.status); const j=await r.json(); say(id,true,'Connected · '+(j.name||'ProPresenter')+' '+(j.host_description||'')); }
      else { const t=(document.getElementById('cn-brtoken').value||'').trim()||((db.settings||{}).bridgeToken||''); const r=await tryFetch('http://'+h+'/status',{headers:t?{'X-Booth-Token':t}:{}}); if(r.status===401) throw new Error('wrong token'); if(!r.ok) throw new Error('HTTP '+r.status); const j=await r.json(); say(id,true,'Connected · X32 '+(j.x32.configured?(j.x32.ok?'online':'offline'):'not set')+' · '+(j.dmx.scenes.length)+' scene(s)'); }
    }catch(e){ say(id,false,(e.name==='AbortError'?'No answer':e.message==='Failed to fetch'?'Could not connect (wrong address, or the app is on https and the device blocks it)':e.message)); }
  };
  window.cnSave=function(){
    if(!isAdmin()){ toast('Admin permission required','error'); return; }
    const o={}, bad=[];
    rows.forEach(r=>{ const h=hostOf(r.id); if(h&&!/^[\w.-]+:\d{2,5}$/.test(h)) bad.push(r.label); o[r.id]=h; });
    if(bad.length){ toast('Check the address for: '+bad.join(', ')+' (needs IP and port)','error'); return; }
    const s=db.settings; s.vmixHost=o.vm; s.proPresenterHost=o.pp; s.bridgeHost=o.br;
    const tk=(document.getElementById('cn-brtoken').value||'').trim(); if(tk) s.bridgeToken=tk;
    const ch=(document.getElementById('cn-ytch').value||'').trim(); if(ch&&!/^UC[\w-]{22}$/.test(ch)){ toast('YouTube channel ID looks wrong','error'); return; }
    s.ytChannelId=ch;
    save(); try{vmPoll();ppPoll();brPoll();}catch(e){} toast('Connections saved','success');
  };
  function fill(){
    const s=db.settings||{}, set=(id,v)=>{ const el=document.getElementById(id); if(el&&document.activeElement!==el) el.value=v||''; };
    set('cn-vm',s.vmixHost); set('cn-pp',s.proPresenterHost); set('cn-br',s.bridgeHost); set('cn-ytch',s.ytChannelId);
    const k=document.getElementById('cn-ytkey'); if(k) k.placeholder=window._ytKeySet?'Saved — type a new key to replace it':'YouTube Data API key';
    const t=document.getElementById('cn-brtoken'); if(t&&(s.bridgeToken)) t.placeholder='Saved — type a new one to replace it';
  }
  const _rs=renderSettings;
  renderSettings=function(){
    const grid=document.querySelector('#pg-settings .grid2');
    if(grid&&!document.getElementById('cn-panel')){ const p=document.createElement('div'); p.className='panel'; p.id='cn-panel'; p.setAttribute('data-perm','admin'); p.style.display=isAdmin()?'':'none'; p.innerHTML=html(); grid.insertBefore(p,grid.firstChild); }
    const r=_rs.apply(this,arguments); fill(); return r;
  };
})();
