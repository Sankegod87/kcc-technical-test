// ── Inventory ──
function renderInv(){
  const totalBulbs=db.inventory.reduce((s,i)=>s+i.inStock,0);
  const lowCount=db.inventory.filter(i=>i.inStock<=i.threshold).length;
  const totalTypes=db.inventory.length;
  const totalUsed=db.inventory.reduce((s,i)=>s+(i.totalUsed||0),0);

  // Stat strip
  const strip=document.getElementById('inv-stats-strip');
  if(strip) strip.innerHTML=`
    <div class="sc ca"><div class="sc-label">Bulb Types</div><div class="sc-val">${totalTypes}</div></div>
    <div class="sc cb"><div class="sc-label">Total In Stock</div><div class="sc-val">${totalBulbs}</div></div>
    <div class="sc ${lowCount?'cr':'cg'}"><div class="sc-label">Low Stock</div><div class="sc-val">${lowCount}</div></div>
    <div class="sc cp"><div class="sc-label">Total Used</div><div class="sc-val">${totalUsed}</div></div>`;

  // Stock cards
  const stockCards=document.getElementById('stockCards');
  if(stockCards){
    if(!db.inventory.length){
      stockCards.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:var(--dim2)"><div style="font-size:40px;margin-bottom:12px">\u{1F4E6}</div><div style="font-family:var(--head);font-size:14px;font-weight:700">No inventory yet</div><div class="dim" style="margin-top:6px">Receive a batch to get started</div></div>';
    } else {
      stockCards.innerHTML=db.inventory.map(i=>{
        const low=i.inStock<=i.threshold;
        const uses=db.usageLog.filter(u=>u.bulbType===i.bulbType);
        const avgLife=uses.length>=2?'~'+Math.round(uses.reduce((s,u,_,a)=>s+1/a.length,0)*30)+'d':'\u2014';
        const pct=i.threshold>0?Math.min(100,Math.round((i.inStock/Math.max(i.threshold*2,i.inStock))*100)):50;
        const barColor=low?'#A32D2D':pct>60?'#3B6D11':'#BA7517';
        const safeType=i.bulbType.replace(/'/g,"\\'");
        return`<div class="stock-card ${low?'low':'ok'}">
          <div class="stock-card-head">
            <div class="stock-card-type">${esc(i.bulbType)}</div>
            <div>${low
              ?'<span class="badge blow"><span class="bd pulse"></span>LOW</span>'
              :'<span class="badge bok"><span class="bd"></span>OK</span>'}</div>
          </div>
          <div class="stock-card-body">
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px">
              <span style="font-size:38px;font-weight:900;font-family:var(--head);color:${low?'var(--red)':'var(--green)'};line-height:1">${esc(i.inStock)}</span>
              <span class="dim">in stock</span>
              <span class="dim" style="margin-left:auto">min: ${esc(i.threshold)}</span>
            </div>
            <div class="stock-bar-wrap">
              <div class="stock-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px">
              <div style="text-align:center;background:var(--s2);border-radius:6px;padding:6px 4px">
                <div class="dim" style="font-size:8px;letter-spacing:1px;margin-bottom:2px">RECEIVED</div>
                <div style="font-family:var(--mono);font-size:13px;font-weight:700">${i.totalReceived||0}</div>
              </div>
              <div style="text-align:center;background:var(--s2);border-radius:6px;padding:6px 4px">
                <div class="dim" style="font-size:8px;letter-spacing:1px;margin-bottom:2px">USED</div>
                <div style="font-family:var(--mono);font-size:13px;font-weight:700">${i.totalUsed||0}</div>
              </div>
              <div style="text-align:center;background:var(--s2);border-radius:6px;padding:6px 4px">
                <div class="dim" style="font-size:8px;letter-spacing:1px;margin-bottom:2px">AVG LIFE</div>
                <div style="font-family:var(--mono);font-size:13px;font-weight:700">${avgLife}</div>
              </div>
            </div>
          </div>
          <div class="stock-card-foot">
            <button class="btn bgh bsm" data-perm="admin" onclick="openEditInv('${safeType}')">\u270F\uFE0F Edit</button>
            <button class="btn bgh bsm" data-perm="master" onclick="requirePin(()=>deleteInvRow('${safeType}'))">\uD83D\uDDD1\uFE0F</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Orders table
  document.getElementById('ordersTbl').innerHTML=!db.orders.length
    ?'<tr><td colspan="6" style="text-align:center;color:var(--dim);padding:28px">No orders yet</td></tr>'
    :[...db.orders].sort((a,b)=>b.date-a.date).map(o=>`<tr>
        <td class="dim">${fmtD(o.date)}</td><td>${esc(o.bulbType)}</td><td><strong>${esc(o.qty)}</strong></td>
        <td>${esc(o.supplier||'\u2014')}</td><td>${esc(o.tech||'\u2014')}</td><td class="dim">${esc(o.notes||'\u2014')}</td>
      </tr>`).join('');

  // Usage table
  document.getElementById('usageTbl').innerHTML=!db.usageLog.length
    ?'<tr><td colspan="5" style="text-align:center;color:var(--dim);padding:28px">No usage logged yet</td></tr>'
    :[...db.usageLog].sort((a,b)=>b.date-a.date).map(u=>{
      const condIcon=u.bulbCondition==='blown'?'\uD83D\uDC80 Blown':'\u2705 New';
      const mismatchTag=u.mismatch?'<span style="color:var(--amber);font-size:10px;display:block">\u26A0\uFE0F type mismatch</span>':'';
      const condCol=u.bulbCondition==='blown'?'var(--red)':'var(--green)';
      return`<tr>
        <td class="dim">${fmtD(u.date)}</td><td>${esc(u.bulbType)}</td><td><strong>${esc(u.qty)}</strong></td>
        <td class="mono">${esc(u.fixture)}</td><td>${esc(u.tech||'\u2014')}</td>
        <td class="mono" style="font-size:11px">${esc(u.bulbId||'\u2014')}</td>
        <td style="color:${condCol};font-size:12px;font-weight:600">${u.bulbCondition?condIcon:'\u2014'}${mismatchTag}</td>
      </tr>`;}).join('');
  applyPermissions();
}
// ── Used Bulbs ──
let _aubCamScanner=null,_aubCamRunning=false;
function toggleAubCamera(){_aubCamRunning?stopAubCamera():startAubCamera();}
function startAubCamera(){
  const wrap=document.getElementById('aub-scanner-wrap');wrap.style.display='';
  _aubCamScanner=new Html5Qrcode('aub-qr-reader');_aubCamRunning=true;
  _aubCamScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:220,height:220}},
    code=>{stopAubCamera();document.getElementById('aub-id').value=code.toUpperCase();},()=>{}
  ).catch(err=>{toast('Camera error: '+err,'error');stopAubCamera();});
}
function stopAubCamera(){
  if(_aubCamScanner&&_aubCamRunning){_aubCamScanner.stop().catch(()=>{});_aubCamRunning=false;_aubCamScanner=null;}
  const wrap=document.getElementById('aub-scanner-wrap');if(wrap){wrap.style.display='none';const el=document.getElementById('aub-qr-reader');if(el)el.innerHTML='';}
}
function openAddUsedBulbModal(){
  // Populate datalists
  const typeList=document.getElementById('aub-type-list');
  const fixList=document.getElementById('aub-fix-list');
  if(typeList) typeList.innerHTML=db.inventory.map(i=>`<option value="${esc(i.bulbType)}">`).join('');
  if(fixList)  fixList.innerHTML=db.fixtures.map(f=>`<option value="${esc(f.id)}">`).join('');
  openM('addUsedBulb');
}
function addUsedBulb(){
  const bulbId=document.getElementById('aub-id').value.trim().toUpperCase();
  const bulbType=document.getElementById('aub-type').value.trim();
  const fixture=document.getElementById('aub-fixture').value.trim().toUpperCase();
  const cond=document.getElementById('aub-cond').value;
  const notes=document.getElementById('aub-notes').value.trim();
  if(!bulbType){toast('Bulb type required','error');return;}
  const fix=db.fixtures.find(f=>f.id===fixture);
  db.usedBulbs.push({
    id:'UB-'+Date.now(),bulbId,bulbType,pulledFrom:fixture,
    fixtureName:fix?fix.name:'',datePulled:Date.now(),
    condition:cond,status:'available',notes,autoLogged:false
  });
  save();closeM('addUsedBulb');renderInv();
  ['aub-id','aub-type','aub-fixture','aub-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  toast('Used bulb added to list','success');
}
function renderUsedBulbs(){
  const tbody=document.getElementById('usedBulbsTbl');if(!tbody)return;
  const list=[...db.usedBulbs].sort((a,b)=>b.datePulled-a.datePulled);
  if(!list.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--dim);padding:28px">No used bulbs logged yet</td></tr>';return;}
  const condLabel={new:'✅ New',blown:'💀 Blown'};
  const statusColor={available:'var(--amber)',reinstalled:'var(--blue)',disposed:'var(--dim)'};
  tbody.innerHTML=list.map(b=>`<tr>
    <td class="mono" style="font-size:11px">${esc(b.bulbId||'<span class="dim">unlabelled</span>')}</td>
    <td>${esc(b.bulbType)}</td>
    <td class="dim">${b.fixtureName?b.fixtureName+' ('+esc(b.pulledFrom)+')':b.pulledFrom||'—'}</td>
    <td class="dim">${b.datePulled?fmtD(b.datePulled):'—'}</td>
    <td>${condLabel[b.condition]||b.condition}</td>
    <td><span style="font-weight:700;color:${statusColor[b.status]||'var(--text)'}">${b.status==='available'?'♻️ Available':b.status==='reinstalled'?'🔄 Reinstalled':'🗑️ Disposed'}</span>
      ${b.reinstalledIn?`<div class="dim" style="font-size:10px">→ ${esc(b.reinstalledIn)} by ${esc(b.reinstalledBy||'?')}</div>`:''}
    </td>
    <td class="dim" style="font-size:11px;max-width:150px">${esc(b.notes||'—')}</td>
    <td><div class="row gap6">
      ${b.status==='available'?`<button class="btn bgh bsm" onclick="setUsedBulbStatus('${esc(b.id)}','disposed')">🗑️</button>`:''}
      <button class="btn bgh bsm" onclick="editUsedBulbCond('${esc(b.id)}')">✏️</button>
    </div></td>
  </tr>`).join('');
}
function setUsedBulbStatus(id,status){
  const b=db.usedBulbs.find(x=>x.id===id);if(!b)return;
  b.status=status;save();renderUsedBulbs();toast('Bulb marked as '+status,'info');
}
function editUsedBulbCond(id){
  const b=db.usedBulbs.find(x=>x.id===id);if(!b)return;
  const opts=['new','blown'];
  const cur=opts.indexOf(b.condition);
  const nxt=opts[(cur+1)%opts.length];
  b.condition=nxt;
  // If marking as blown, also flag in registry so future scans hard-block
  if(nxt==='blown'&&b.bulbId){
    const reg=db.bulbRegistry.find(r=>r.bulbId===b.bulbId);
    if(reg){
      reg.status='disposed';
      reg.history.push({event:'marked_blown',fixture:b.pulledFrom||'',tech:'manual',timestamp:Date.now()});
    }
  }
  save();renderUsedBulbs();renderBulbRegistry&&renderBulbRegistry();
  toast('Condition updated to: '+nxt+(nxt==='blown'?' — permanently blocked in registry':''),'info');
}

function openEditInv(bulbType){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const i=db.inventory.find(x=>x.bulbType===bulbType);
  if(!i)return;
  document.getElementById('ei-type').value=i.bulbType;
  document.getElementById('ei-stock').value=i.inStock;
  document.getElementById('ei-threshold').value=i.threshold;
  document.getElementById('ei-received').value=i.totalReceived;
  document.getElementById('ei-used').value=i.totalUsed;
  document.getElementById('ei-lifehours').value=i.expectedLifeHours||'';
  openM('editInv');
}
function saveInvEdit(){
  if(!isAdmin()){toast('Admin permission required','error');return;}
  const bulbType=document.getElementById('ei-type').value;
  const i=db.inventory.find(x=>x.bulbType===bulbType);
  if(!i)return;
  const newStock=parseInt(document.getElementById('ei-stock').value);
  const newThreshold=parseInt(document.getElementById('ei-threshold').value);
  const newReceived=parseInt(document.getElementById('ei-received').value);
  const newUsed=parseInt(document.getElementById('ei-used').value);
  const newLifeHours=parseInt(document.getElementById('ei-lifehours').value)||0;
  if(isNaN(newStock)||isNaN(newThreshold)){toast('Stock and threshold are required','error');return;}
  i.inStock=newStock;
  i.threshold=newThreshold;
  if(!isNaN(newReceived)) i.totalReceived=newReceived;
  if(!isNaN(newUsed)) i.totalUsed=newUsed;
  i.expectedLifeHours=newLifeHours;
  save();closeM('editInv');renderInv();
  toast(bulbType+' updated','success');
}
function deleteInvRow(t){
  if(!confirm('Remove "'+t+'" from inventory?'))return;
  db.inventory=db.inventory.filter(i=>i.bulbType!==t);
  db.orders=db.orders.filter(o=>o.bulbType!==t);
  save();renderInv();toast(t+' removed','info');
}
function clearAllInventory(){
  if(!isMaster()){toast('Master admin only','error');return;}
  if(!confirm('Clear ALL inventory, orders and usage history?'))return;
  db.inventory=[];db.orders=[];db.usageLog=[];save();renderInv();toast('Inventory cleared','info');
}
