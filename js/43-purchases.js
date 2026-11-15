// Purchase requests: any crew member can ask for something to be bought; admins approve, decline or mark it ordered.
(function(){
  const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ST={pending:['Waiting','#E0A526'],approved:['Approved','#2DD4A0'],ordered:['Ordered','#5B9DF5'],declined:['Declined','#888']};
  const money=n=>n?('$'+Number(n).toFixed(2)):'';
  const admins=()=>(db.technicians||[]).filter(t=>t.email&&(t.userRole==='master'||t.userRole==='admin'));
  async function mail(t,subject,o){ try{ await emailjs.send(EJSID,EJTPL,kccNoticeParams(t,subject,o)); }catch(e){ console.warn('Purchase mail failed',e); } }

  window.prSubmit=function(){
    const me=getCurTech&&getCurTech(); if(!me){ toast('Sign in first','error'); return; }
    const g=id=>document.getElementById(id);
    const item=g('pr-item').value.trim(); if(item.length<2){ toast('What do we need?','error'); return; }
    const qty=Math.max(1,Math.min(999,parseInt(g('pr-qty').value,10)||1));
    const price=Math.max(0,Math.min(100000,parseFloat(g('pr-price').value)||0));
    const r={id:'pr_'+Date.now(),item:item.slice(0,120),qty,price,reason:g('pr-reason').value.trim().slice(0,500),link:g('pr-link').value.trim().slice(0,300),
      urgent:g('pr-urgent').checked,requesterId:me.id,requesterName:me.name,status:'pending',createdAt:Date.now()};
    db.purchaseRequests=db.purchaseRequests||[]; db.purchaseRequests.unshift(r);
    save(); window.renderPurchases(); toast('Request sent','success');
    admins().forEach(a=>mail(a,'🛒 Purchase request: '+r.item,{tone:'blue',badge:'Purchase request',headline:me.name+' would like to buy '+r.item,
      rows:[['Item',r.item],['Quantity',String(r.qty)],['Estimated price',money(r.price)||'Not given'],['Why',r.reason||'-'],['Priority',r.urgent?'Needed soon':'Normal']],body:'Open KCC Technical, then Inventory, to approve or decline.'}));
  };
  window.prAct=function(id,status){
    if(!isAdmin()) return; const r=(db.purchaseRequests||[]).find(x=>x.id===id); if(!r) return;
    r.status=status; r.decidedBy=(getCurTech()||{}).name||''; r.decidedAt=Date.now();
    save(); window.renderPurchases();
    const t=(db.technicians||[]).find(x=>x.id===r.requesterId);
    if(t&&t.email&&status!=='pending') mail(t,'🛒 Your purchase request: '+ST[status][0],{tone:status==='declined'?'red':'green',badge:'Purchase request',headline:r.item+' was '+ST[status][0].toLowerCase(),rows:[['Item',r.item],['Quantity',String(r.qty)]],body:''});
  };
  window.prDelete=function(id){
    const r=(db.purchaseRequests||[]).find(x=>x.id===id); if(!r) return;
    const me=getCurTech&&getCurTech(); if(!isAdmin()&&!(me&&me.id===r.requesterId&&r.status==='pending')) return;
    if(!confirm('Remove this request?')) return;
    db.purchaseRequests=db.purchaseRequests.filter(x=>x.id!==id); save(); window.renderPurchases();
  };
  window.prToggleForm=function(){ const f=document.getElementById('pr-form'); if(f) f.style.display=f.style.display==='none'?'':'none'; };
  window.renderPurchases=function(){
    const el=document.getElementById('pr-panel'); if(!el) return;
    const list=db.purchaseRequests||[]; const adm=isAdmin(); const me=getCurTech&&getCurTech();
    const open=list.filter(r=>r.status==='pending').length;
    const keepForm=document.getElementById('pr-form')&&document.getElementById('pr-form').style.display!=='none';
    el.innerHTML='<div class="panel mb16"><div class="ph row jbet"><span>🛒 Purchase requests'+(open?' <span class="badge" style="background:#E0A52633;color:#E0A526">'+open+' waiting</span>':'')+'</span><button class="btn ba bsm" onclick="prToggleForm()">+ Request something</button></div>'+
      '<div class="pb"><div id="pr-form" style="display:'+(keepForm?'':'none')+';margin-bottom:12px"><div class="fg2">'+
      '<div class="fg"><label>What do we need? *</label><input id="pr-item" maxlength="120" placeholder="e.g. 4 x XLR cables, 10 ft"></div>'+
      '<div class="fg"><label>How many</label><input id="pr-qty" type="number" min="1" value="1"></div>'+
      '<div class="fg"><label>Estimated price each ($)</label><input id="pr-price" type="number" min="0" step="0.01"></div>'+
      '<div class="fg"><label>Link (optional)</label><input id="pr-link" maxlength="300" placeholder="https://"></div></div>'+
      '<div class="fg"><label>Why do we need it?</label><textarea id="pr-reason" rows="2" maxlength="500"></textarea></div>'+
      '<label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="pr-urgent"> Needed soon</label>'+
      '<button class="btn ba" onclick="prSubmit()">Send request</button></div>'+
      (list.length?list.slice(0,30).map(r=>{ const st=ST[r.status]||ST.pending; const mine=me&&me.id===r.requesterId;
        return '<div class="row jbet" style="padding:9px 0;border-top:1px solid var(--border,#2a2a2a);gap:10px;align-items:flex-start"><div style="min-width:0"><div><b>'+E(r.item)+'</b> × '+E(r.qty)+(r.price?' <span class="dim">('+money(r.price)+' each)</span>':'')+(r.urgent?' <span style="color:#FF8A80;font-size:11px">NEEDED SOON</span>':'')+'</div>'+
          '<div class="dim" style="font-size:12px">'+E(r.requesterName)+' · '+new Date(r.createdAt).toLocaleDateString('en-CA',{month:'short',day:'numeric'})+(r.reason?' · '+E(r.reason):'')+'</div>'+
          (r.link&&/^https?:\/\//i.test(r.link)?'<div style="font-size:12px"><a href="'+E(r.link)+'" target="_blank" rel="noopener">Link</a></div>':'')+'</div>'+
          '<div class="row gap6" style="flex-wrap:wrap;justify-content:flex-end"><span class="badge" style="background:'+st[1]+'33;color:'+st[1]+'">'+st[0]+'</span>'+
          (adm?(r.status==='pending'?'<button class="btn ba bsm" onclick="prAct(\''+E(r.id)+'\',\'approved\')">Approve</button><button class="btn bgh bsm" onclick="prAct(\''+E(r.id)+'\',\'declined\')">Decline</button>':r.status==='approved'?'<button class="btn bgh bsm" onclick="prAct(\''+E(r.id)+'\',\'ordered\')">Mark ordered</button>':''):'')+
          ((adm||(mine&&r.status==='pending'))?'<button class="btn bgh bsm" onclick="prDelete(\''+E(r.id)+'\')">🗑</button>':'')+'</div></div>'; }).join('')
        :'<div class="dim" style="text-align:center;padding:14px">Nothing requested. Need a cable, bulb or battery? Tap Request something.</div>')+'</div></div>';
  };
  window.addEventListener('DOMContentLoaded',()=>{
    const _go=go; go=function(p){ const r=_go.apply(this,arguments); if(p==='inventory') window.renderPurchases(); return r; };
  });
})();
