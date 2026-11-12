// Edit call time AND service time together (both were fixed or a text prompt before).
// These are the usual times for every Sunday; the automatic call-sheet emails use the same two settings.
(function(){
  window.sdSetCallTime=function(){
    if(!isAdmin()){toast('Admin permission required','error');return;}
    if(document.getElementById('st-ov')) return;
    const s=db.settings||{}, pad=v=>String(v).replace(/^(\d):/,'0$1:');
    const o=document.createElement('div'); o.id='st-ov';
    o.style.cssText='position:fixed;inset:0;z-index:9400;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    o.innerHTML=`<div style="background:var(--s1,#141a22);border:1px solid var(--border);border-radius:12px;padding:18px;width:100%;max-width:340px">
      <div style="font-weight:800;margin-bottom:4px">Service times</div>
      <div class="dim" style="font-size:12px;margin-bottom:12px">Used for every Sunday, the countdown and the call-sheet emails.</div>
      <div class="fg"><label>Call time (crew arrive)</label><input type="time" id="st-call" value="${pad(s.callTime||'09:00')}"></div>
      <div class="fg"><label>Service time (starts)</label><input type="time" id="st-svc" value="${pad(s.serviceTime||'10:30')}"></div>
      <div class="row gap8" style="margin-top:12px;justify-content:flex-end"><button class="btn bgh" onclick="document.getElementById('st-ov').remove()">Cancel</button><button class="btn ba" onclick="sdSaveTimes()">Save</button></div></div>`;
    document.body.appendChild(o);
  };
  window.sdSaveTimes=function(){
    const c=document.getElementById('st-call').value, v=document.getElementById('st-svc').value;
    if(!c||!v){toast('Pick both times','error');return;}
    if(c>v){toast('Call time must be before the service starts','error');return;}
    db.settings.callTime=c; db.settings.serviceTime=v; save();
    document.getElementById('st-ov').remove(); try{renderSunday();}catch(e){} try{renderDashboard();}catch(e){}
    toast('Times saved','success');
  };
})();
