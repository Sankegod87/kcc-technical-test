// ══════════════════════════════════════════════════
// CUSTOMIZABLE PRE-SHOW CHECKLIST
// ══════════════════════════════════════════════════
const DEFAULT_CHECKLIST_TASKS={
  'Camera Station':['Check camera is powered on','Verify video feed is clear','Check white balance','Confirm recording is not active','Test pan/tilt movement'],
  'Streaming Station':['Check internet connection','Verify stream key is correct','Test audio levels','Confirm backup stream ready','Check encoder settings'],
  'Presentation Station':['Load presentation file','Test slide advance','Check display output','Confirm clicker is working','Test video playback'],
  'Lighting Station':['Power on lighting board','Run fixture test','Check DMX connections','Confirm colour gels in place','Test moving heads'],
  'Sound Mixing':['Check all channel levels','Test microphones','Confirm monitor mix','Check main output level','Test hearing loop if applicable']
};
function getChecklistTasks(){
  return db.settings.checklistTasks||DEFAULT_CHECKLIST_TASKS;
}
let _curChecklistStation=null;

function renderChecklist(){
  const stationListEl=document.getElementById('clStationList');
  if(!stationListEl)return;

  const stations=typeof getScheduleRoles==='function'?getScheduleRoles().map(r=>({name:r.name,icon:r.icon})):[];
  const allStations=[{name:'Fixtures',icon:'💡'},...stations];
  const state=db.checklistState||{};

  // Build station list
  stationListEl.innerHTML=allStations.map(s=>{
    let done=0,total=0;
    if(s.name==='Fixtures'){
      total=db.fixtures.length;
      done=db.fixtures.filter(f=>state['fix_'+f.id]&&state['fix_'+f.id]!=='pending').length;
    } else {
      const tasks=(typeof getChecklistTasks==='function'?getChecklistTasks():{})[s.name]||[];
      total=tasks.length;
      done=tasks.filter((_,i)=>state['task_'+s.name+'_'+i]).length;
    }
    const allDone=total>0&&done===total;
    const isActive=_curChecklistStation===s.name;
    return`<div onclick="switchChecklistTab('${s.name.replace(/'/g,"\'")}')" style="
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;
      background:${isActive?'var(--aglow)':'transparent'};
      border:1px solid ${isActive?'rgba(240,165,0,.3)':'transparent'};
      transition:all .18s;
    " onmouseover="if('${esc(s.name)}'!==_curChecklistStation)this.style.background='var(--s2)'"
       onmouseout="if('${esc(s.name)}'!==_curChecklistStation)this.style.background='transparent'">
      <div class="row gap8">
        <span style="font-size:18px">${s.icon}</span>
        <span style="font-size:13px;font-weight:${isActive?'700':'400'};color:${isActive?'var(--amber)':'var(--text)'}">${esc(s.name)}</span>
      </div>
      <span style="font-family:var(--mono);font-size:10px;background:${allDone?'var(--green)':total>0?'var(--s3)':'transparent'};color:${allDone?'#000':'var(--dim2)'};padding:2px 7px;border-radius:20px">${total>0?done+'/'+total:''}</span>
    </div>`;
  }).join('');

  // Render active station panel
  const panel=document.getElementById('clMainPanel');
  if(!panel)return;
  if(!_curChecklistStation){
    panel.innerHTML='<div class="panel"><div class="pb" style="text-align:center;padding:40px;color:var(--dim2)"><div style="font-size:36px;margin-bottom:10px">👈</div><div>Select a station to start</div></div></div>';
    return;
  }

  const isAdmin_=typeof isAdmin==='function'&&isAdmin();

  if(_curChecklistStation==='Fixtures'){
    // ── FIXTURES ──
    const total=db.fixtures.length;
    const done=db.fixtures.filter(f=>state['fix_'+f.id]&&state['fix_'+f.id]!=='pending').length;
    const issues=db.fixtures.filter(f=>state['fix_'+f.id]==='issue').length;
    const pct=total>0?Math.round(done/total*100):0;
    panel.innerHTML=`<div class="panel">
      <div class="ph row jbet">
        <span class="pt">💡 Fixtures</span>
        <span class="dim" style="font-size:12px">${done}/${total} checked</span>
      </div>
      <div class="pb">
        <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;margin-bottom:16px">
          <div style="height:100%;background:${issues?'var(--red)':pct===100?'var(--green)':'var(--amber)'};width:${pct}%;transition:width .3s"></div>
        </div>
        ${!total?'<p class="dim">No fixtures added yet.</p>':
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${db.fixtures.map(f=>{
              const s=state['fix_'+f.id]||'pending';
              const bg={pending:'var(--s2)',ok:'var(--gglow)',issue:'var(--rglow)'}[s];
              const bd={pending:'var(--border)',ok:'rgba(40,201,122,.4)',issue:'rgba(224,60,60,.5)'}[s];
              const icon={pending:'⬜',ok:'✅',issue:'🔴'}[s];
              return`<div style="background:${bg};border:1px solid ${bd};border-radius:10px;padding:14px;transition:all .2s">
                <div class="row jbet mb10">
                  <div>
                    <div class="fw7" style="font-size:14px">${esc(f.name)}</div>
                    <div class="dim">${esc(f.id)}${f.location?' · '+f.location:''} · ${esc(f.bulbType)}</div>
                  </div>
                  <span style="font-size:26px">${icon}</span>
                </div>
                <div class="row gap6">
                  <button class="btn bg bsm" style="flex:1;justify-content:center" onclick="clCheckItem('fix_${esc(f.id)}','ok')">✅ OK</button>
                  <button class="btn br bsm" style="flex:1;justify-content:center" onclick="clCheckItem('fix_${esc(f.id)}','issue')">🔴 Issue</button>
                  ${s!=='pending'?`<button class="btn bgh bsm" onclick="clCheckItem('fix_${esc(f.id)}','pending')">↺</button>`:''}
                </div>
              </div>`;
            }).join('')}
          </div>`}
        ${pct===100&&total>0?`<div style="text-align:center;margin-top:16px;padding:14px;background:var(--gglow);border:1px solid rgba(40,201,122,.3);border-radius:10px"><div style="font-size:24px">🎉</div><div class="fw7 cg">All fixtures checked!</div></div>`:''}
      </div>
    </div>`;
  } else {
    // ── STATION TASKS ──
    const stationIcon=(typeof getScheduleRoles==='function'?getScheduleRoles():DEFAULT_ROLES).find(r=>r.name===_curChecklistStation)?.icon||'📋';
    const tasks=(typeof getChecklistTasks==='function'?getChecklistTasks():{})[_curChecklistStation]||[];
    const total=tasks.length;
    const done=tasks.filter((_,i)=>state['task_'+_curChecklistStation+'_'+i]).length;
    const pct=total>0?Math.round(done/total*100):0;

    panel.innerHTML=`<div class="panel">
      <div class="ph row jbet">
        <span class="pt">${stationIcon} ${_curChecklistStation}</span>
        <div class="row gap8">
          ${isAdmin_?`<button class="btn bgh bsm" onclick="openChecklistEditorFor('${_curChecklistStation.replace(/'/g,"\'")}')">✏️ Edit Tasks</button>`:''}
          ${total>0?`<span class="dim" style="font-size:12px">${done}/${total} done</span>`:''}
        </div>
      </div>
      <div class="pb">
        ${total>0?`<div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden;margin-bottom:16px">
          <div style="height:100%;background:${pct===100?'var(--green)':'var(--amber)'};width:${pct}%;transition:width .3s"></div>
        </div>`:''}
        ${!total
          ? `<div style="text-align:center;padding:30px">
              <div style="font-size:36px;margin-bottom:10px">📋</div>
              <div class="dim mb12">No tasks for ${_curChecklistStation} yet</div>
              ${isAdmin_?`<button class="btn ba bsm" onclick="openChecklistEditorFor('${_curChecklistStation.replace(/'/g,"\'")}')">+ Add Tasks</button>`:'<div class="dim">Ask an admin to add tasks</div>'}
            </div>`
          : `<div style="display:flex;flex-direction:column;gap:8px">
              ${tasks.map((task,i)=>{
                const key='task_'+_curChecklistStation+'_'+i;
                const isDone=!!state[key];
                return`<div style="display:flex;align-items:center;gap:12px;padding:14px;background:${isDone?'var(--gglow)':'var(--s2)'};border:1px solid ${isDone?'rgba(40,201,122,.3)':'var(--border)'};border-radius:10px;cursor:pointer;transition:all .2s" onclick="clCheckItem('${key}',${!isDone})">
                  <div style="width:26px;height:26px;border-radius:50%;border:2px solid ${isDone?'var(--green)':'var(--border2)'};background:${isDone?'var(--green)':'transparent'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:all .2s">${isDone?'✓':''}</div>
                  <div style="flex:1;font-size:14px;font-weight:600;${isDone?'text-decoration:line-through;color:var(--dim2)':''}">${task}</div>
                  ${isAdmin_?`<button class="btn bgh bsm" onclick="event.stopPropagation();removeChecklistTaskDirect('${_curChecklistStation.replace(/'/g,"\'")}',${i})" style="color:var(--red);opacity:.6">✕</button>`:''}
                </div>`;
              }).join('')}
            </div>
            ${isAdmin_?`<div class="row gap8" style="margin-top:12px">
              <input id="clQuickTask_${_curChecklistStation.replace(/\s/g,'_')}" placeholder="Add a task..." style="flex:1" onkeydown="if(event.key==='Enter')addTaskQuick('${_curChecklistStation.replace(/'/g,"\'")}')">
              <button class="btn ba bsm" onclick="addTaskQuick('${_curChecklistStation.replace(/'/g,"\'")}')">+ Add</button>
            </div>`:''}
            ${pct===100?`<div style="text-align:center;margin-top:12px;padding:14px;background:var(--gglow);border:1px solid rgba(40,201,122,.3);border-radius:10px"><div style="font-size:24px">🎉</div><div class="fw7 cg">All tasks complete!</div></div>`:''}
          `}
      </div>
    </div>`;
  }
}

function switchChecklistTab(station){
  _curChecklistStation=station;
  renderChecklist();
}

function openChecklistEditorFor(station){
  _curChecklistStation=station;
  const sel=document.getElementById('clStationSel');
  if(sel){
    const roles=typeof getScheduleRoles==='function'?getScheduleRoles().map(r=>r.name):[];
    sel.innerHTML=roles.map(r=>`<option value="${r}" ${r===station?'selected':''}>${r}</option>`).join('');
    renderChecklistEditor();
  }
  openM('editChecklist');
}

function addTaskQuick(station){
  if(!isAdmin()){toast('Admin only','error');return;}
  const inputId='clQuickTask_'+station.replace(/\s/g,'_');
  const input=document.getElementById(inputId);
  if(!input||!input.value.trim())return;
  if(!db.settings.checklistTasks) db.settings.checklistTasks={};
  if(!db.settings.checklistTasks[station]) db.settings.checklistTasks[station]=[];
  db.settings.checklistTasks[station].push(input.value.trim());
  input.value='';
  save();renderChecklist();
}

function removeChecklistTaskDirect(station,idx){
  if(!isAdmin()){toast('Admin only','error');return;}
  if(!db.settings.checklistTasks) db.settings.checklistTasks={};
  if(!db.settings.checklistTasks[station]){
    // Copy from defaults
    const def=(typeof DEFAULT_CHECKLIST_TASKS!=='undefined'?DEFAULT_CHECKLIST_TASKS:{});
    db.settings.checklistTasks[station]=[...(def[station]||[])];
  }
  db.settings.checklistTasks[station].splice(idx,1);
  save();renderChecklist();toast('Task removed','info');
}


function clCheckItem(key, value){
  if(!db.checklistState) db.checklistState={};
  if(value===false||value==='pending') delete db.checklistState[key];
  else db.checklistState[key]=value;
  save();renderChecklist();
  if(value==='issue'&&key.startsWith('fix_')){
    const fid=key.replace('fix_','');
    const f=db.fixtures.find(x=>x.id===fid);
    if(f&&f.status!=='out') if(confirm('Report outage for '+f.name+'?')) openOutModal(fid);
  }
}

function resetChecklist(){
  if(!confirm('Reset all checklist items?'))return;
  db.checklistState={};
  save();renderChecklist();
}

// Checklist editor
function openChecklistEditor(){
  const sel=document.getElementById('clStationSel');
  if(sel){
    const roles=getScheduleRoles().map(r=>r.name);
    sel.innerHTML=roles.map(r=>`<option value="${r}">${r}</option>`).join('');
    renderChecklistEditor();
  }
  openM('editChecklist');
}
function renderChecklistEditor(){
  const station=document.getElementById('clStationSel')?.value;if(!station)return;
  const tasks=getChecklistTasks()[station]||[];
  const el=document.getElementById('clTaskList');if(!el)return;
  el.innerHTML=!tasks.length?'<p class="dim">No tasks yet — add one below.</p>':tasks.map((t,i)=>`
    <div class="row jbet" style="padding:8px 10px;background:var(--s2);border-radius:6px">
      <span style="font-size:13px">${t}</span>
      <button class="btn bgh bsm" onclick="removeChecklistTask(${i})" style="color:var(--red)">✕</button>
    </div>`).join('');
}
function addChecklistTask(){
  if(!isAdmin()){toast('Admin only','error');return;}
  const station=document.getElementById('clStationSel')?.value;if(!station)return;
  const task=document.getElementById('clNewTask').value.trim();if(!task)return;
  if(!db.settings.checklistTasks) db.settings.checklistTasks={...DEFAULT_CHECKLIST_TASKS};
  if(!db.settings.checklistTasks[station]) db.settings.checklistTasks[station]=[];
  db.settings.checklistTasks[station].push(task);
  document.getElementById('clNewTask').value='';
  save();renderChecklistEditor();
}
function removeChecklistTask(idx){
  if(!isAdmin()){toast('Admin only','error');return;}
  const station=document.getElementById('clStationSel')?.value;if(!station)return;
  if(!db.settings.checklistTasks) db.settings.checklistTasks={...DEFAULT_CHECKLIST_TASKS};
  db.settings.checklistTasks[station].splice(idx,1);
  save();renderChecklistEditor();
}

// ══════════════════════════════════════════════════
// NFC
// ══════════════════════════════════════════════════
function renderNFC(){
  // Fixture list for Option 1 (URL tags)
  const list=document.getElementById('nfcFixtureList');
  const sel=document.getElementById('nfcFixtureSel');
  if(list){
    list.innerHTML=!db.fixtures.length?'<p class="dim">No fixtures added yet.</p>':db.fixtures.map(f=>{
      const url=`https://sankegod87.github.io/stage-light/?scan=${esc(f.id)}`;
      return`<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div class="fw7">${esc(f.name)} <span class="mono" style="color:var(--dim2);font-size:11px">(${esc(f.id)})</span></div>
          <div class="dim" style="font-size:11px;margin-top:2px;word-break:break-all">${url}</div>
        </div>
        <div class="row gap6">
          <button class="btn bb bsm" onclick="copyNFCUrl('${url}')">📋 Copy URL</button>
          <button class="btn bgh bsm" onclick="showNFCQR('${esc(f.id)}','${esc(f.name)}','${url}')">🔲 QR</button>
        </div>
      </div>`;
    }).join('');
  }
  if(sel){
    sel.innerHTML='<option value="">— Select fixture —</option>'+db.fixtures.map(f=>`<option value="${esc(f.id)}">${esc(f.name)} (${esc(f.id)})</option>`).join('');
  }
  // Check Web NFC support
  const statusEl=document.getElementById('webNFCStatus');
  if(statusEl){
    if('NDEFReader' in window){
      statusEl.innerHTML='<span class="badge bok">✅ Web NFC supported on this device</span>';
    } else {
      statusEl.innerHTML='<span class="badge bout">❌ Web NFC not supported — requires Android + Chrome</span>';
    }
  }
}

function copyNFCUrl(url){
  navigator.clipboard.writeText(url).then(()=>toast('URL copied! Paste into your NFC tag writer app','success')).catch(()=>{
    prompt('Copy this URL:',url);
  });
}

function showNFCQR(id,name,url){
  const pa=document.getElementById('printArea');
  pa.innerHTML=`<div style="font-family:monospace;padding:20px;background:#fff;display:inline-block">
    <h3 style="color:#000;margin-bottom:10px">${esc(name)} (${esc(id)})</h3>
    <div id="nfcqr"></div>
    <div style="font-size:10px;color:#555;margin-top:8px;max-width:180px;word-break:break-all">${url}</div>
  </div>`;
  try{new QRCode(document.getElementById('nfcqr'),{text:url,width:180,height:180,colorDark:'#000',colorLight:'#fff'});}catch(e){}
  setTimeout(()=>window.print(),500);
}

function testWebNFC(){
  if(!('NDEFReader' in window)){toast('Web NFC not supported on this device — use Android Chrome','error');return;}
  toast('Web NFC is supported on this device! ✅','success');
}

async function writeNFCTag(){
  if(!('NDEFReader' in window)){toast('Web NFC requires Android Chrome','error');return;}
  const fid=document.getElementById('nfcFixtureSel').value;
  if(!fid){toast('Select a fixture first','error');return;}
  const f=db.fixtures.find(x=>x.id===fid);if(!f)return;
  const url=`https://sankegod87.github.io/stage-light/?scan=${fid}`;
  try{
    const ndef=new NDEFReader();
    await ndef.write({records:[{recordType:'url',data:url}]});
    toast('✅ NFC tag written for '+f.name+' — tap it on your phone to test!','success');
  }catch(e){
    toast('NFC write failed: '+e.message,'error');
  }
}

async function readNFCTag(){
  if(!('NDEFReader' in window)){toast('Web NFC requires Android Chrome','error');return;}
  const resultEl=document.getElementById('nfcResult');
  toast('Hold your phone near an NFC tag...','info');
  try{
    const ndef=new NDEFReader();
    await ndef.scan();
    ndef.addEventListener('reading',({message})=>{
      for(const record of message.records){
        if(record.recordType==='url'){
          const url=new TextDecoder().decode(record.data);
          const match=url.match(/[?&]scan=([^&]+)/);
          if(match){
            const code=match[1].toUpperCase();
            const f=db.fixtures.find(x=>x.id===code);
            resultEl.style.display='';
            resultEl.innerHTML=`<div class="cg fw7">✅ Tag read successfully!</div><div class="dim mt4">Fixture: ${esc(f?f.name:code)}</div><div class="dim">URL: ${url}</div>`;
            toast('Tag read: '+(f?f.name:code),'success');
          }
        }
      }
    });
  }catch(e){
    toast('NFC read failed: '+e.message,'error');
  }
}

// Handle ?scan= URL parameter on app load (Option 1 NFC tap)
function handleURLScan(){
  const params=new URLSearchParams(window.location.search);
  const code=params.get('scan');
  if(code){
    setTimeout(()=>{
      const upper=code.toUpperCase();
      if(openScanSheet(upper)) return;
      const f=db.fixtures.find(x=>x.id===upper);
      if(f){
        toast('📡 NFC tap detected: '+f.name,'info');
        if(f.status==='out') openRepModal(f.id);
        else openOutModal(f.id);
      } else {
        toast('📡 NFC tap: Unknown fixture "'+upper+'"','error');
      }
    },1500); // wait for Firebase data to load
  }
}
