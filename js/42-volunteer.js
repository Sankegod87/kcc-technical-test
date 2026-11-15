// Volunteer sign-up. The public form (#volunteer link) sends to the server, which keeps sign-ups in a private store;
// admins review them from the Crew page and can turn one into a crew account.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.showVolunteerScreen=function(){
    ['loginScreen','homeScreen','extRequestScreen'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
    const v=document.getElementById('volScreen'); if(v) v.style.display='block';
  };
  window.submitVolunteer=async function(){
    const g=id=>document.getElementById(id), st=g('vol-status'), fail=m=>{ st.textContent=m; st.style.color='#FF8A80'; };
    const name=g('vol-name').value.trim(), email=g('vol-email').value.trim();
    if(name.length<2){ fail('Please tell us your name.'); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ fail('Please give an email address we can reach you on.'); return; }
    if(g('vol-phone').value.replace(/\D/g,'').length<7){ fail('Please give a phone number we can reach you on.'); return; }
    if(!window._kccApplySend){ fail('Cannot reach the server. Please try again in a moment.'); return; }
    g('vol-send').disabled=true; st.textContent='Sending…'; st.style.color='';
    try{
      const res=await window._kccApplySend({name,email,phone:g('vol-phone').value.trim(),
        stations:Array.from(document.querySelectorAll('#vol-stations input:checked')).map(i=>i.value),
        experience:g('vol-exp').value.trim(),availability:g('vol-avail').value.trim(),why:g('vol-why').value.trim()});
      const out=(res&&res.data)||res||{};
      g('vol-form').style.display='none'; g('vol-success').style.display=''; g('vol-ref').textContent=out.ref?'Reference '+out.ref:'';
      st.textContent='';
    }catch(e){ fail((e&&e.message)||'Could not send. Please try again.'); g('vol-send').disabled=false; }
  };

  // ── admin side ──
  let items=[];
  const ST={new:['New','#E0A526'],contacted:['Contacted','#5B9DF5'],converted:['Joined','#2DD4A0'],declined:['Declined','#888']};
  async function load(){ const r=await window._kccApplyList(); items=r.items||[]; return r; }
  window.volCopyLink=function(){
    const url=location.origin+location.pathname+'#volunteer';
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(()=>toast('Link copied!','success')).catch(()=>prompt('Copy this link:',url)); else prompt('Copy this link:',url);
  };
  window.volClose=function(){ const o=document.getElementById('vol-adm'); if(o) o.remove(); };
  function paintAdmin(){
    let o=document.getElementById('vol-adm');
    if(!o){ o=document.createElement('div'); o.id='vol-adm'; o.className='mover'; o.style.display='flex'; o.onclick=e=>{ if(e.target===o) volClose(); }; document.body.appendChild(o); }
    o.innerHTML='<div class="modal" style="max-width:720px"><div class="mh"><span class="mt">Volunteer sign-ups</span><button class="xb" onclick="volClose()">✕</button></div><div class="mb">'+
      '<div class="row gap8 mb12"><button class="btn bgh bsm" onclick="volCopyLink()">🔗 Copy sign-up link</button></div>'+
      (items.length?items.map(i=>{ const st=ST[i.status]||ST.new;
        return '<div class="panel mb14"><div class="ph row jbet"><div><b>'+E(i.name)+'</b> <span class="dim" style="font-size:11px">'+E(i.ref)+' · '+new Date(i.createdAt).toLocaleDateString('en-CA',{month:'short',day:'numeric'})+'</span></div>'+
        '<span class="badge" style="background:'+st[1]+'33;color:'+st[1]+'">'+st[0]+'</span></div><div class="pb" style="font-size:13px;line-height:1.6">'+
        '<div><a href="mailto:'+E(i.email)+'">'+E(i.email)+'</a>'+(i.phone?' · '+E(i.phone):'')+'</div>'+
        (i.stations&&i.stations.length?'<div><span class="dim">Interested in:</span> '+E(i.stations.join(', '))+'</div>':'')+
        (i.availability?'<div><span class="dim">Free:</span> '+E(i.availability)+'</div>':'')+
        (i.experience?'<div><span class="dim">Experience:</span> '+E(i.experience)+'</div>':'')+
        (i.why?'<div><span class="dim">Why:</span> '+E(i.why)+'</div>':'')+
        '<div class="row gap6" style="margin-top:8px;flex-wrap:wrap">'+
          '<button class="btn ba bsm" onclick="volConvert(\''+E(i.id)+'\')">➕ Add to crew</button>'+
          (i.status==='new'?'<button class="btn bgh bsm" onclick="volSet(\''+E(i.id)+'\',\'contacted\')">Mark contacted</button>':'')+
          (i.status!=='declined'?'<button class="btn bgh bsm" onclick="volSet(\''+E(i.id)+'\',\'declined\')">Decline</button>':'<button class="btn bgh bsm" onclick="volSet(\''+E(i.id)+'\',\'new\')">Reopen</button>')+
          '<button class="btn bgh bsm" onclick="volDel(\''+E(i.id)+'\')">🗑 Delete</button></div></div></div>';
      }).join(''):'<div class="dim" style="text-align:center;padding:30px">No sign-ups yet. Share the sign-up link to get some.</div>')+'</div></div>';
  }
  window.volOpen=async function(){
    if(!isAdmin()) return;
    try{ await load(); paintAdmin(); }catch(e){ toast((e&&e.message)||'Could not load sign-ups','error'); }
  };
  window.volSet=async function(id,status){ try{ await window._kccApplyAct({op:'status',id,status}); await load(); paintAdmin(); badge(); }catch(e){ toast((e&&e.message)||'Failed','error'); } };
  window.volDel=async function(id){ if(!confirm('Delete this sign-up?')) return; try{ await window._kccApplyAct({op:'delete',id}); await load(); paintAdmin(); badge(); }catch(e){ toast((e&&e.message)||'Failed','error'); } };
  window.volConvert=async function(id){
    const i=items.find(x=>x.id===id); if(!i) return;
    volClose(); openM('addTech');
    const set=(k,v)=>{ const el=document.getElementById(k); if(el) el.value=v; };
    set('tn',i.name); set('tem',i.email); set('tphone',i.phone||''); set('tnotes',[i.stations&&i.stations.length?'Interested in: '+i.stations.join(', '):'',i.availability?'Free: '+i.availability:'',i.experience?'Experience: '+i.experience:''].filter(Boolean).join('\n'));
    try{ await window._kccApplyAct({op:'status',id,status:'converted'}); badge(); }catch(e){}
    toast('Set a starting password, then tap Add to Crew','info');
  };
  function badge(){
    const b=document.getElementById('vol-btn'); if(!b||!isAdmin()||!window._kccApplyList) return;
    window._kccApplyList().then(r=>{ b.textContent='🙋 Volunteer sign-ups'+(r.open?' ('+r.open+' new)':''); }).catch(()=>{});
  }
  window.addEventListener('DOMContentLoaded',()=>{
    const _rc=renderCrew;
    renderCrew=function(){
      const r=_rc.apply(this,arguments);
      try{
        const bar=document.querySelector('#pg-crew > .row');
        if(bar&&isAdmin()&&!document.getElementById('vol-btn')){
          const b=document.createElement('button'); b.id='vol-btn'; b.className='btn bgh'; b.style.marginRight='8px'; b.textContent='🙋 Volunteer sign-ups'; b.onclick=volOpen;
          const add=bar.querySelector('button.ba'); const wrap=document.createElement('div'); wrap.className='row gap8';
          bar.insertBefore(wrap,add); wrap.appendChild(b); wrap.appendChild(add);
        }
        badge();
      }catch(e){}
      return r;
    };
  });
})();
