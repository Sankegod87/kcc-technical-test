// ══════════════════════════════════════════════════
// SCHEDULE
// ══════════════════════════════════════════════════
let _schedSelectedKey = null;

function canEditSchedule(){
  const t = getCurTech();
  return t && t.canSchedule === true;
}

function getSundaysOfYear(year){
  const sundays = [];
  const d = new Date(year, 0, 1);
  // Find first Sunday
  d.setDate(d.getDate() + (7 - d.getDay()) % 7);
  while(d.getFullYear() === year){
    sundays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

function schedKey(date){
  // YYYY-MM-DD key using LOCAL date to avoid UTC timezone shift
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+d;
}

let _schedServiceTab = 'service';
let _schedViewMode = 'calendar';
let _schedCalDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function schedSetServiceTab(tab, btn){
  _schedServiceTab = tab;
  document.querySelectorAll('#sched-service-tabs .tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderSchedule();
}

function schedSetViewMode(mode, btn){
  _schedViewMode = mode;
  document.querySelectorAll('#sched-view-toggle .tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderSchedule();
}

function schedCalShift(dir){
  _schedCalDate = new Date(_schedCalDate.getFullYear(), _schedCalDate.getMonth()+dir, 1);
  renderSchedule();
}

function schedCalToday(){
  const n = new Date();
  _schedCalDate = new Date(n.getFullYear(), n.getMonth(), 1);
  renderSchedule();
}

function renderSchedQuickStats(){
  const el = document.getElementById('sched-quickstats');
  if(!el) return;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = getSundaysOfYear(now.getFullYear()).concat(getSundaysOfYear(now.getFullYear()+1))
    .filter(d=>d>=todayStart).slice(0,4);
  const nextKey = upcoming.length ? schedKey(upcoming[0]) : null;
  const nextEntry = nextKey ? db.schedules[nextKey] : null;
  const nextCount = nextEntry ? (nextEntry.crew||[]).length : 0;
  const unscheduled = upcoming.filter(d=>{
    const e = db.schedules[schedKey(d)];
    return !e || !(e.crew && e.crew.length);
  }).length;
  const pendingSwaps = (db.swapRequests||[]).filter(s=>s.status==='pending').length;
  const upcomingRehearsals = (db.rehearsals||[]).filter(r=>r.date>=now.getTime()).length;
  const upcomingEvents = (db.specialEvents||[]).filter(r=>r.date>=now.getTime()-86400000).length;

  el.innerHTML =
    '<div class="sc '+(nextCount?'cg':'cr')+'"><div class="sc-label">This Sunday</div><div class="sc-val">'+nextCount+'</div></div>'+
    '<div class="sc '+(unscheduled?'cr':'cg')+'"><div class="sc-label">Unscheduled (4wk)</div><div class="sc-val">'+unscheduled+'</div></div>'+
    '<div class="sc '+(pendingSwaps?'ca':'cg')+'"><div class="sc-label">Pending Swaps</div><div class="sc-val">'+pendingSwaps+'</div></div>'+
    '<div class="sc cp"><div class="sc-label">Upcoming Rehearsals</div><div class="sc-val">'+upcomingRehearsals+'</div></div>'+
    '<div class="sc ca"><div class="sc-label">Special Events</div><div class="sc-val">'+upcomingEvents+'</div></div>';
}

function renderSchedule(){
  renderSchedQuickStats();
  const yearSel = document.getElementById('schedYear');
  const now = new Date();
  const curYear = now.getFullYear();

  if(!yearSel.options.length){
    [curYear, curYear+1].forEach(y=>{
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      if(y === curYear) opt.selected = true;
      yearSel.appendChild(opt);
    });
  }

  const year = parseInt(yearSel.value) || curYear;
  const canEdit = canEditSchedule();
  document.getElementById('schedNoPerms').style.display = canEdit ? 'none' : '';
  const grid = document.getElementById('schedGrid');

  // Toggle nav visibility based on tab/view
  const viewToggleWrap = document.getElementById('sched-view-toggle-wrap');
  const calNav = document.getElementById('schedCalNav');
  if(_schedServiceTab === 'rehearsals'){
    if(viewToggleWrap) viewToggleWrap.style.display = 'none';
    if(calNav) calNav.style.display = 'none';
  } else {
    if(viewToggleWrap) viewToggleWrap.style.display = '';
    yearSel.style.display = _schedViewMode==='list' ? '' : 'none';
    if(calNav) calNav.style.display = _schedViewMode==='calendar' ? '' : 'none';
  }

  // ── Rehearsals tab ──────────────────────────────────────
  if(_schedServiceTab === 'rehearsals'){
    const rehearsals = (db.rehearsals||[]).sort((a,b)=>a.date-b.date);
    if(!rehearsals.length){
      grid.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:36px;margin-bottom:10px">🎸</div><div class="dim">No rehearsals scheduled yet</div>'+
        (canEdit?'<br><button class="btn ba bsm" style="margin-top:12px" onclick="openAddRehearsalModal()">+ Add Rehearsal</button>':'')+'</div>';
      return;
    }
    grid.innerHTML = rehearsals.map(r=>{
      const isPast = r.date < Date.now();
      const crew = (r.crew||[]).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean);
      return`<div style="background:${isPast?'var(--s1)':'var(--s2)'};border:1px solid var(--border2);border-radius:8px;padding:14px;margin-bottom:10px;display:flex;align-items:flex-start;gap:14px">
        <div style="font-size:28px;flex-shrink:0">🎸</div>
        <div style="flex:1;min-width:0">
          <div class="fw7" style="font-size:15px;margin-bottom:4px">${esc(r.title||'Rehearsal')}</div>
          <div class="dim" style="font-size:12px;font-family:var(--mono)">${fmtDate(r.date)}${r.time?' · '+r.time:''} · ${esc(r.location||'Location TBD')}</div>
          ${r.notes?`<div style="font-size:12px;color:var(--dim2);margin-top:4px;font-style:italic">${esc(r.notes)}</div>`:''}
          ${r.rundown?`<div style="margin-top:8px;padding:8px 10px;background:#E1F5EE;border-radius:6px;font-size:12px;color:#085041">📋 ${r.rundown.length>120?r.rundown.slice(0,120)+'…':r.rundown}</div>`:''}
          ${crew.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${crew.map(t=>`<div style="display:flex;align-items:center;gap:5px;background:var(--s1);border:1px solid var(--border);border-radius:20px;padding:3px 8px;font-size:12px"><span>${esc(t.avatar||'👤')}</span><span>${esc(t.name.split(' ')[0])}</span></div>`).join('')}</div>`:'<div class="dim" style="font-size:12px;margin-top:6px">No crew assigned</div>'}
        </div>
        ${canEdit?`<div class="row gap6"><button class="btn ba bsm" onclick="openEditRehearsalModal('${esc(r.id)}')">✏️ Edit</button><button class="btn br bsm" onclick="deleteRehearsal('${esc(r.id)}')">🗑</button></div>`:''}
      </div>`;
    }).join('');
    applyPermissions();
    return;
  }

  // ── Single Sunday service ────────────────────────────────
  if(_schedViewMode === 'calendar'){
    renderScheduleCalendarGrid();
    return;
  }

  const serviceSlot = 'service';
  const sundays = getSundaysOfYear(year);
  const filtered = year === curYear
    ? sundays.filter(s => s >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))
    : sundays;

  // Merge special events into the services list
  const _weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
  (db.specialEvents||[]).forEach(e=>{
    const ed = new Date(e.date);
    if(ed.getFullYear() !== year) return;
    if(year === curYear && e.date < _weekAgo) return;
    ed._ev = e; filtered.push(ed);
  });
  filtered.sort((a,b)=>a-b);
  if(!filtered.length){ grid.innerHTML='<p class="dim">No services to show.</p>'; return; }

  // Group by month
  const byMonth = {};
  filtered.forEach(s=>{
    const mo = s.toLocaleString('en',{month:'long',year:'numeric'});
    if(!byMonth[mo]) byMonth[mo]=[];
    byMonth[mo].push(s);
  });

  grid.innerHTML = Object.entries(byMonth).map(([month, dates])=>`
    <div style="margin-bottom:20px">
      <div style="font-family:var(--head);font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--amber);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">${month}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
        ${dates.map(d=>{
          if(d._ev){
            const e = d._ev;
            const crew = (e.crew||[]).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean);
            const evPast = e.date < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            return `<div style="background:${evPast?'var(--s1)':'var(--aglow)'};border:1px solid rgba(15,110,86,.35);border-left:3px solid var(--amber);border-radius:8px;padding:14px;${evPast?'opacity:.6;':''}${canEdit?'cursor:pointer':''}" ${canEdit?`onclick="openAddSpecialEventModal('${esc(e.id)}')"`:''}>
              <div class="row jbet mb8">
                <div>
                  <div style="font-weight:900;font-size:15px">${d.toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'})}</div>
                  <span style="font-size:10px;color:var(--amber);font-family:var(--mono);letter-spacing:1px">⭐ SPECIAL EVENT${e.type?' · '+e.type.toUpperCase():''}</span>
                </div>
                ${crew.length?`<span class="badge bok">${crew.length} crew</span>`:'<span class="badge blow">Unscheduled</span>'}
              </div>
              <div class="fw7" style="font-size:14px;margin-bottom:2px">${esc(e.title||'Special Event')}</div>
              <div class="dim" style="font-size:11px;font-family:var(--mono);margin-bottom:6px">${[e.time?(e.time+(e.endTime?' – '+e.endTime:'')):'',e.location].filter(Boolean).join(' · ')||'Time / location TBD'}</div>
              ${crew.length?`<div style="display:flex;flex-wrap:wrap;gap:6px">${crew.map(t=>`<div style="display:flex;align-items:center;gap:5px;background:var(--s1);border:1px solid var(--border);border-radius:20px;padding:3px 8px;font-size:12px"><span>${esc(t.avatar||'👤')}</span><span>${esc(t.name.split(' ')[0])}</span>${e.roles&&e.roles[t.id]?`<span style="color:var(--dim2);font-size:10px;font-family:var(--mono)">· ${esc(e.roles[t.id])}</span>`:''}</div>`).join('')}</div>`:''}
              ${e.notes?`<div style="font-size:11px;color:var(--dim2);font-family:var(--mono);margin-top:6px;font-style:italic">${esc(e.notes)}</div>`:''}
              ${e.rundown?`<div style="font-size:11px;color:#534AB7;font-family:var(--mono);margin-top:4px;padding:4px 8px;background:#F0EEFF;border-radius:4px">📝 ${e.rundown.length>80?e.rundown.slice(0,80)+'…':e.rundown}</div>`:''}
            </div>`;
          }
          const key = schedKey(d);
          const entry = db.schedules[key] || null;
          const isToday = schedKey(d) === schedKey(now);
          const isPast = d < now;
          const assignedTechs = entry ? (entry.crew||[]).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean) : [];
          const availCount = (db.technicians||[]).filter(t=>{
            const av=availStatus(t.id,schedKey(d));
            return av==='yes';
          }).length;
          const unavailCount = (db.technicians||[]).filter(t=>{
            const av=availStatus(t.id,schedKey(d));
            return av==='no';
          }).length;
          // Swap requests for this date+service
          const swapCount = (db.swapRequests||[]).filter(s=>s.dateKey===schedKey(d)&&s.serviceSlot===serviceSlot&&s.status==='pending').length;
          return `<div style="background:${isToday?'var(--aglow)':isPast?'var(--s1)':'var(--s2)'};border:1px solid ${isToday?'rgba(240,165,0,.4)':isPast?'var(--border)':'var(--border2)'};border-radius:8px;padding:14px;transition:border-color .18s;${!isPast&&canEdit?'cursor:pointer':''}"
            ${canEdit&&!isPast?`onclick="openScheduleEdit('${key}',this)"`:''}
          >
            <div class="row jbet mb8">
              <div>
                <div style="font-weight:900;font-size:15px">${d.toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'})}</div>
                ${isToday?'<span style="font-size:10px;color:var(--amber);font-family:var(--mono);letter-spacing:1px">THIS SUNDAY</span>':''}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                ${entry&&assignedTechs.length?`<span class="badge bok">${assignedTechs.length} crew</span>`:(isPast?'<span class="badge" style="background:var(--s3);color:var(--dim);border:1px solid var(--border)">Past</span>':'<span class="badge blow">Unscheduled</span>')}
                ${swapCount?`<span class="badge" style="background:#fff3cd;color:#854F0B;font-size:9px">↔️ ${swapCount} swap${swapCount>1?'s':''}</span>`:''}
              </div>
            </div>
            ${assignedTechs.length
              ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${entry&&(entry.notes||entry.briefing)?'8px':'0'}">
                  ${assignedTechs.map(t=>`
                    <div style="display:flex;align-items:center;gap:5px;background:var(--s1);border:1px solid var(--border);border-radius:20px;padding:3px 8px;font-size:12px">
                      <span>${esc(t.avatar||'👤')}</span>
                      <span>${esc(t.name.split(' ')[0])}</span>
                      ${entry&&entry.roles&&entry.roles[t.id]?`<span style="color:var(--dim2);font-size:10px;font-family:var(--mono)">· ${esc(entry.roles[t.id])}</span>`:''}
                    </div>`).join('')}
                </div>`
              : (!isPast&&canEdit?`<div class="dim" style="font-size:12px">Tap to assign crew</div>`:`<div class="dim" style="font-size:12px">No crew assigned</div>`)
            }
            ${entry&&entry.notes?`<div style="font-size:11px;color:var(--dim2);font-family:var(--mono);margin-top:4px;font-style:italic">${esc(entry.notes)}</div>`:''}
            ${entry&&entry.briefing?`<div style="font-size:11px;color:#0F6E56;font-family:var(--mono);margin-top:4px;padding:4px 8px;background:#E1F5EE;border-radius:4px">📋 ${entry.briefing.length>80?entry.briefing.slice(0,80)+'…':entry.briefing}</div>`:''}
            ${entry&&entry.rundown?`<div style="font-size:11px;color:#534AB7;font-family:var(--mono);margin-top:4px;padding:4px 8px;background:#F0EEFF;border-radius:4px">📝 ${entry.rundown.length>80?entry.rundown.slice(0,80)+'…':entry.rundown}</div>`:''}
            ${!isPast?`<div style="display:flex;gap:10px;margin-top:8px;font-size:10px;font-family:var(--mono);color:var(--dim2)">
              <span style="color:#0F6E56">✓ ${availCount} avail</span>
              <span style="color:var(--red)">✗ ${unavailCount} unavail</span>
            </div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>`
  ).join('');
}

function renderScheduleCalendarGrid(){
  const grid = document.getElementById('schedGrid');
  const now = new Date();
  const todayKey = schedKey(now);
  const calYear = _schedCalDate.getFullYear();
  const calMonth = _schedCalDate.getMonth();
  const monthLabel = document.getElementById('schedCalMonthLabel');
  if(monthLabel) monthLabel.textContent = _schedCalDate.toLocaleDateString('en-CA',{month:'long',year:'numeric'});

  const canEdit = canEditSchedule();
  const first = new Date(calYear, calMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const totalCells = Math.ceil((startOffset+daysInMonth)/7)*7;

  const rehByKey = {};
  (db.rehearsals||[]).forEach(r=>{
    const k = schedKey(new Date(r.date));
    (rehByKey[k]=rehByKey[k]||[]).push(r);
  });

  const evByKey = {};
  (db.specialEvents||[]).forEach(r=>{
    const k = schedKey(new Date(r.date));
    (evByKey[k]=evByKey[k]||[]).push(r);
  });

  const dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px">'
    + dowLabels.map(d=>'<div style="text-align:center;font-size:9px;font-family:var(--mono);color:var(--dim);letter-spacing:1px;padding-bottom:2px">'+d+'</div>').join('')
    + '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';

  for(let i=0;i<totalCells;i++){
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum>=1 && dayNum<=daysInMonth;
    if(!inMonth){
      html += '<div style="min-height:88px;border-radius:8px;background:var(--s1);opacity:.3"></div>';
      continue;
    }
    const d = new Date(calYear, calMonth, dayNum);
    const key = schedKey(d);
    const isSun = d.getDay()===0;
    const isToday = key===todayKey;
    const isPast = d < new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const reh = rehByKey[key]||[];
    const evs = evByKey[key]||[];

    if(isSun){
      const entry = db.schedules[key]||null;
      const assignedTechs = entry ? (entry.crew||[]).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean) : [];
      const swapCount = (db.swapRequests||[]).filter(s=>s.dateKey===key&&s.status==='pending').length;
      const clickable = canEdit && !isPast;
      html += '<div '+(clickable?'onclick="openScheduleEdit(\''+key+'\',this)"':'')+' style="min-height:88px;border-radius:8px;padding:7px;background:'+(isToday?'var(--aglow)':isPast?'var(--s1)':'var(--s2)')+';border:1px solid '+(isToday?'rgba(240,165,0,.5)':'var(--border2)')+';'+(clickable?'cursor:pointer':'')+';display:flex;flex-direction:column;gap:3px">'
        + '<div class="row jbet">'
        + '<span style="font-weight:900;font-size:12px">'+dayNum+'</span>'
        + (assignedTechs.length ? '<span class="badge bok" style="font-size:8px;padding:2px 6px">'+assignedTechs.length+' crew</span>' : (isPast ? '' : '<span class="badge" style="font-size:8px;padding:2px 6px;background:#FDEAEA;color:#A32D2D;border:1px solid #F3B9B9">open</span>'))
        + '</div>'
        + (assignedTechs.length
            ? '<div style="display:flex;flex-wrap:wrap;gap:2px">'+assignedTechs.slice(0,5).map(t=>'<span title="'+esc(t.name)+'" style="font-size:13px">'+esc(t.avatar||'👤')+'</span>').join('')+(assignedTechs.length>5?'<span style="font-size:9px;color:var(--dim)">+'+(assignedTechs.length-5)+'</span>':'')+'</div>'
            : (isPast ? '' : '<div class="dim" style="font-size:9px">Tap to assign</div>'))
        + (swapCount ? '<span style="font-size:8px;color:#854F0B">↔️ '+swapCount+' swap'+(swapCount>1?'s':'')+'</span>' : '')
        + (reh.length ? '<span style="font-size:8px;color:var(--purple)">🎸 '+reh.length+'</span>' : '')
        + evs.slice(0,2).map(e=>'<span onclick="event.stopPropagation();'+(canEdit?'openAddSpecialEventModal(\''+esc(e.id)+'\')':'')+'" style="font-size:9px;background:var(--aglow);color:var(--amber);border-radius:4px;padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" title="'+esc(e.title||'Event')+'">⭐ '+esc(e.title||'Event')+'</span>').join('')
        + '</div>';
    } else {
      const singleReh = reh.length===1 ? reh[0] : null;
      const clickable = canEdit && singleReh && !evs.length;
      html += '<div '+(clickable?'onclick="openEditRehearsalModal(\''+esc(singleReh.id)+'\')"':'')+' style="min-height:88px;border-radius:8px;padding:7px;background:var(--s1);border:1px solid var(--border);opacity:'+(isPast?'.55':'1')+';'+(clickable?'cursor:pointer':'')+';display:flex;flex-direction:column;gap:3px">'
        + '<span style="font-size:11px;color:var(--dim2)">'+dayNum+'</span>'
        + (reh.length ? '<div style="display:flex;flex-direction:column;gap:2px">'+reh.slice(0,2).map(r=>'<span style="font-size:9px;background:var(--pglow);color:var(--purple);border-radius:4px;padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(r.title||'Rehearsal')+'">🎸 '+esc(r.title||'Rehearsal')+'</span>').join('')+(reh.length>2?'<span style="font-size:8px;color:var(--dim)">+'+(reh.length-2)+' more</span>':'')+'</div>' : '')
        + evs.slice(0,2).map(e=>'<span onclick="event.stopPropagation();'+(canEdit?'openAddSpecialEventModal(\''+esc(e.id)+'\')':'')+'" style="font-size:9px;background:var(--aglow);color:var(--amber);border-radius:4px;padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" title="'+esc(e.title||'Event')+'">⭐ '+esc(e.title||'Event')+'</span>').join('')
        + '</div>';
    }
  }
  html += '</div>';
  grid.innerHTML = html;
}

let _schedEditKey = null;

function openScheduleEdit(key, el){
  if(!canEditSchedule()){ toast('You need scheduler permission to edit the schedule','error'); return; }
  _schedEditKey = key;
  const date = new Date(key+'T12:00:00');
  document.getElementById('schedModalTitle').textContent = '📅 ' + date.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.getElementById('schedModalDate').textContent = date.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  const entry = db.schedules[key] || {crew:[],roles:{},notes:'',briefing:''};
  db.schedules[key] = entry;
  document.getElementById('schedNotes').value = entry.notes||'';
  document.getElementById('schedBriefing').value = entry.briefing||'';
  document.getElementById('schedRundown').value = entry.rundown||'';
  document.getElementById('schedLooks').value = entry.looks||'';
  document.getElementById('schedCams').value = entry.cams||'';
  document.getElementById('schedPatch').value = entry.patch||'';
  // Populate templates dropdown
  const tplSel = document.getElementById('schedTemplateSelect');
  if(tplSel){
    const tpls = db.settings.scheduleTemplates||[];
    tplSel.innerHTML = '<option value="">— Load a template —</option>' + tpls.map((t,i)=>`<option value="${i}">${esc(t.name)}</option>`).join('');
  }

  renderSchedStationAssignments();
  openM('editSchedule');
}

// Station-first crew assignment: pick who fills each station (Camera, Streaming,
// Presentation/ProPresenter, Sound/Audio, Lighting, ...) instead of scanning every crew member.
function renderSchedStationAssignments(){
  const entry = db.schedules[_schedEditKey] || {crew:[],roles:{}};
  const assignedIds = entry.crew || [];
  const roles = entry.roles || {};
  const stations = getScheduleRoles();
  const chip = (t) => `<div style="display:flex;align-items:center;gap:5px;background:var(--s1);border:1px solid var(--border2);border-radius:20px;padding:3px 6px 3px 8px;font-size:12px">
      <span>${esc(t.avatar||'👤')}</span><span>${esc(t.name.split(' ')[0])}</span>
      <button type="button" onclick="schedRemoveAssignment('${esc(t.id)}')" style="background:none;border:none;cursor:pointer;color:var(--dim2);font-size:13px;padding:0 2px;line-height:1" title="Remove">✕</button>
    </div>`;

  const unavailN = db.technicians.filter(t=>!assignedIds.includes(t.id)&&isTechActive(t)&&availStatus(t.id,_schedEditKey)==='no').length;
  let html = `<label style="display:flex;gap:8px;align-items:center;font-size:12px;margin-bottom:10px;text-transform:none;letter-spacing:0"><input type="checkbox" ${window._schedShowUnavail?'checked':''} onchange="window._schedShowUnavail=this.checked;renderSchedStationAssignments()" style="width:18px;height:18px"> Show unavailable crew${unavailN?' ('+unavailN+' hidden)':''}</label>` + stations.map(st=>{
    const members = assignedIds.filter(id => roles[id] === st.name).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean);
    const allOpts = db.technicians.filter(t=>!assignedIds.includes(t.id) && isTechActive(t));
    const rank = {yes:0,unknown:1,no:2};
    const options = allOpts
      .filter(t=>window._schedShowUnavail || availStatus(t.id,_schedEditKey)!=='no')
      .sort((a,b)=>rank[availStatus(a.id,_schedEditKey)]-rank[availStatus(b.id,_schedEditKey)]);
    const hiddenN = allOpts.length-allOpts.filter(t=>availStatus(t.id,_schedEditKey)!=='no').length;
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px">
      <div class="row gap8 mb6"><span style="font-size:16px">${st.icon}</span><span class="fw7" style="font-size:12px;letter-spacing:.5px;text-transform:uppercase">${esc(st.name)}</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;${members.length?'margin-bottom:8px':''}">${members.map(chip).join('')}</div>
      ${options.length
        ? `<select onchange="schedAssignToStation(this,'${st.name.replace(/'/g,"\\'")}')" style="font-size:11px;padding:5px 8px;width:100%">
            <option value="">+ Add to ${esc(st.name)}…</option>
            ${options.map(t=>{
              const avail = availStatus(t.id,_schedEditKey);
              const why = availBlackoutWhy(t.id,_schedEditKey);
              return `<option value="${esc(t.id)}">${esc(t.avatar||'👤')} ${esc(t.name)}${avail==='yes'?' — ✅ available':avail==='no'?' — ❌ unavailable'+(why?' ('+why+')':''):' — ❓ no response'}</option>`;
            }).join('')}
          </select>`
        : `<div class="dim" style="font-size:11px">${hiddenN?'Everyone left is unavailable':'All crew already assigned'}</div>`}
    </div>`;
  }).join('');

  // Anything assigned with a role that no longer matches a current station (legacy data)
  const knownNames = stations.map(s=>s.name);
  const otherTechs = assignedIds.filter(id => !knownNames.includes(roles[id])).map(id=>db.technicians.find(t=>t.id===id)).filter(Boolean);
  if(otherTechs.length){
    html += `<div style="background:var(--s2);border:1px dashed var(--border2);border-radius:8px;padding:10px 12px;margin-bottom:8px">
      <div class="fw7" style="font-size:12px;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;color:var(--dim2)">Other / Unassigned Station</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${otherTechs.map(chip).join('')}</div>
    </div>`;
  }

  document.getElementById('schedCrewGrid').innerHTML = html;
}

function schedAssignToStation(selectEl, stationName){
  const techId = selectEl.value;
  if(!techId) return;
  const entry = db.schedules[_schedEditKey] || {crew:[],roles:{}};
  if(!entry.crew) entry.crew = [];
  if(!entry.roles) entry.roles = {};
  if(!entry.crew.includes(techId)) entry.crew.push(techId);
  entry.roles[techId] = stationName;
  db.schedules[_schedEditKey] = entry;
  renderSchedStationAssignments();
}

function schedRemoveAssignment(techId){
  const entry = db.schedules[_schedEditKey] || {crew:[],roles:{}};
  const idx = (entry.crew||[]).indexOf(techId);
  if(idx>-1) entry.crew.splice(idx,1);
  if(entry.roles) delete entry.roles[techId];
  db.schedules[_schedEditKey] = entry;
  renderSchedStationAssignments();
}

function saveScheduleEntry(){
  if(!canEditSchedule()){ toast('No permission','error'); return; }
  const entry = db.schedules[_schedEditKey] || {crew:[],roles:{}};
  entry.notes = document.getElementById('schedNotes').value.trim();
  entry.briefing = document.getElementById('schedBriefing').value.trim();
  entry.rundown = document.getElementById('schedRundown').value.trim();
  entry.looks = document.getElementById('schedLooks').value.trim();
  entry.cams = document.getElementById('schedCams').value.trim();
  entry.patch = document.getElementById('schedPatch').value.trim();
  db.schedules[_schedEditKey] = entry;
  logAudit('Schedule Saved', 'Key: '+_schedEditKey);
  save();
  closeM('editSchedule');
  renderSchedule();
  toast('Schedule saved','success');

  // Emails auto-send every Thursday — no manual send needed
}
