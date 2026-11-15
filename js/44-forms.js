// Forms page: every form in one place, with the buttons to open it or copy its public link.
(function(){
  const base=()=>location.origin+location.pathname;
  const FORMS=[
    {icon:'🛠️',t:'Tech support request',d:'For ministries, groups and renters who need AV help.',pub:'#request',admin:false},
    {icon:'🙋',t:'Volunteer sign-up',d:'For people who want to join the tech team. Sign-ups come to the Crew page.',pub:'#volunteer',admin:false,review:'volReview'},
    {icon:'🛒',t:'Purchase request',d:'Ask for a cable, bulb, battery or anything else we need to buy. Admins approve it.',go:'purchase'},
    {icon:'📅',t:'Time off / away dates',d:'Mark the dates you are away so you are not scheduled.',go:'timeoff'},
    {icon:'↔️',t:'Shift swap',d:'Ask another crew member to take your shift. Open a service on the Schedule page and tap Request Swap.',go:'swap'},
    {icon:'⚠️',t:'Damage / incident report',d:'Report broken or damaged gear. Open the item on the Asset Checkout page and tap the warning button.',go:'incident'},
    {icon:'💬',t:'Anonymous feedback',d:'Share a thought without your name on it.',go:'feedback'}
  ];
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.formsCopy=function(hash){
    const url=base()+hash;
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(()=>toast('Link copied!','success')).catch(()=>prompt('Copy this link:',url)); else prompt('Copy this link:',url);
  };
  window.formsOpenPublic=function(hash){ window.open(base()+hash,'_blank','noopener'); };
  window.formsGo=function(k){
    if(k==='purchase'){ go('inventory'); setTimeout(()=>{ const f=document.getElementById('pr-form'); if(f&&f.style.display==='none') prToggleForm(); const p=document.getElementById('pr-panel'); if(p) p.scrollIntoView({behavior:'smooth',block:'start'}); },150); }
    else if(k==='timeoff'){ go('crew'); setTimeout(()=>{ const p=document.getElementById('availPanel'); if(p) p.scrollIntoView({behavior:'smooth',block:'start'}); },200); }
    else if(k==='swap') go('schedule');
    else if(k==='incident') go('checkout');
    else if(k==='feedback'){ if(typeof feedbackNav==='function') feedbackNav(); }
    else if(k==='volReview'){ go('crew'); setTimeout(()=>{ if(typeof volOpen==='function') volOpen(); },250); }
  };
  window.renderForms=function(){
    const el=document.getElementById('pg-forms'); if(!el) return; const adm=isAdmin();
    el.innerHTML='<div class="row jbet mb16"><div><h2 class="fw9 tu ls2" style="font-size:14px">Forms</h2><div class="dim" style="margin-top:3px">Every form in one place. Links marked Public can be shared with people outside the team.</div></div></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">'+FORMS.map(f=>{
        const btns=f.pub
          ?'<button class="btn ba bsm" onclick="formsOpenPublic(\''+f.pub+'\')">Open form</button><button class="btn bgh bsm" data-perm="admin" onclick="formsCopy(\''+f.pub+'\')">🔗 Copy link</button>'+(adm&&f.review?'<button class="btn bgh bsm" onclick="formsGo(\''+f.review+'\')">View sign-ups</button>':'')
          :'<button class="btn ba bsm" onclick="formsGo(\''+f.go+'\')">Open</button>';
        return '<div class="panel"><div class="pb"><div style="font-size:26px">'+f.icon+'</div><div class="fw7" style="margin:6px 0 2px">'+E(f.t)+(f.pub?' <span class="badge" style="background:#5B9DF533;color:#5B9DF5;font-size:10px">Public</span>':'')+'</div>'+
          '<div class="dim" style="font-size:12px;line-height:1.5;min-height:54px">'+E(f.d)+'</div><div class="row gap6" style="margin-top:10px;flex-wrap:wrap">'+btns+'</div></div></div>';
      }).join('')+'</div>';
  };
  window.addEventListener('DOMContentLoaded',()=>{
    const _go=go; go=function(p){ const r=_go.apply(this,arguments); if(p==='forms') window.renderForms(); return r; };
  });
})();
