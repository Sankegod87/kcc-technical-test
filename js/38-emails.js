// Collects the data for the styled emails (the HTML itself is built by kcc-email.js).
function kccAppUrl(){ return (location.protocol==='file:'||location.origin==='null') ? location.href.split(/[?#]/)[0] : location.origin+location.pathname; }
function kccEmailContact(){ const s=(db.settings&&db.settings.emailContact)||{}; return {name:s.name||'Isaac',phone:s.phone||'587-664-3421',email:s.email||'ayodejiiojo@gmail.com'}; }
// Everything one person's schedule / call-sheet email can show. sig = server-signed confirm signature (optional).
function kccEmailCtx(key,t,sun,sig,kind){
  const e=(db.schedules&&db.schedules[key])||{}, role=e.roles&&e.roles[t.id];
  let tm={call:null,svc:null}; try{ tm=sdTimes(sun); }catch(x){}
  const f12=d=>d?d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
  const base=kccAppUrl(), q=(k,extra)=>base+'?'+k+'='+encodeURIComponent(key)+'&tech='+encodeURIComponent(t.id)+(extra||'');
  let countdown=''; if(tm.call){ const d=Math.round((tm.call.getTime()-Date.now())/864e5); countdown=d>1?'Call time is in '+d+' days.':d===1?'Call time is tomorrow.':d===0?'Call time is today.':''; }
  const weekEnd=sun.getTime()+864e5, nowMs=Date.now();
  const rh=(db.rehearsals||[]).filter(r=>r.date>=nowMs-864e5&&r.date<=weekEnd&&(!(r.crew||[]).length||r.crew.includes(t.id))).sort((a,b)=>a.date-b.date)[0];
  const events=(db.specialEvents||[]).filter(r=>r.date>=nowMs-864e5&&r.date<=weekEnd&&(!(r.crew||[]).length||r.crew.includes(t.id))).sort((a,b)=>a.date-b.date).map(r=>({title:r.title,when:new Date(r.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+(r.time?' at '+r.time:''),where:r.location,notes:r.notes}));
  const stationTraining=role?(db.trainingModules||[]).filter(m=>!m.mandatory&&(m.stations||[]).includes(role)&&!(t.completedModules||[]).includes(m.id)).map(m=>m.title):[];
  const gear=(db.checkouts||[]).filter(c=>c.personId===t.id&&!c.returnedAt).map(c=>{ const g=(db.gearItems||[]).find(x=>x.id===c.gearId); return {name:g?g.name:'Gear item',due:c.dueDate?new Date(c.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}; });
  const pending=(db.trainingModules||[]).filter(m=>m.mandatory&&!(t.completedModules||[]).includes(m.id)).map(m=>m.title);
  const ch=db.settings&&db.settings.ytChannelId;
  return {
    name:t.name, dateStr:sun.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}), role:role||'', callTime:f12(tm.call), svcTime:f12(tm.svc), countdown,
    team:(e.crew||[]).map(id=>{const x=db.technicians.find(y=>y.id===id);return x?{name:x.name,role:(e.roles&&e.roles[id])||''}:null;}).filter(Boolean),
    run:(e.rundown||'').split(/\n|·/).map(x=>x.trim()).filter(Boolean),
    tasks:(role&&typeof getChecklistTasks==='function'&&getChecklistTasks()[role])||[],
    briefing:e.briefing||'', notes:kind==='schedule'?(e.notes||''):'',
    rehearsal:rh?{title:rh.title,when:new Date(rh.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+(rh.time?' at '+rh.time:''),where:rh.location,notes:rh.notes}:null,
    events, stationTraining, gear, pending, stream:ch?'https://www.youtube.com/channel/'+ch+'/live':'', contact:kccEmailContact(),
    confirmUrl:q('confirm',sig?'&sig='+encodeURIComponent(sig):''), swapUrl:q('swap'), appUrl:base
  };
}
// Parameters for emailjs.send with the one shared template (EJTPL): subject + styled html.
function kccEmailParams(t,subject,html,extra){ return Object.assign({to_email:t.email,to_name:t.name,subject:subject,message:'',html:html,reported_by:'KCC Technical'},extra||{}); }
// A coloured alert email (tone: red | amber | green | blue) to one person.
function kccNoticeParams(t,subject,o,extra){ o.name=t.name; o.appUrl=kccAppUrl(); return kccEmailParams(t,subject,KCC_EMAIL.notice(o),extra); }
