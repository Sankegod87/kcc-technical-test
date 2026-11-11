// KCC Technical sidebar wiring
const _PAGE_TITLES = {
  dashboard:'Control Room',sunday:'Service Day',fixtures:'Fixtures',inventory:'Stock',history:'History',
  scan:'Scan',crew:'Crew',schedule:'Schedule',nfc:'NFC',
  checklist:'Checklist',settings:'Settings',
  checkout:'Asset Checkout',maintenance:'Maintenance Log',requests:'Tech Requests',announcements:'Announcements',training:'Training Hub',profiles:'Crew Profiles'
};
const _origGo = typeof go !== 'undefined' ? go : null;
window.go = function(page) {
  if (_origGo) _origGo(page);
  document.querySelectorAll('.snav-btn').forEach(b => {
    const rigPage=(page==='inventory'||page==='history')?'fixtures':page;
    b.classList.toggle('active', b.id === 'snav-' + rigPage);
  });
  rigTabs(page);
  const tt = document.getElementById('topbarTitle');
  if (tt) tt.textContent = _PAGE_TITLES[page] || page;
  _updateSidebarUser();
};
function _updateSidebarUser() {
  const t = window._currentTech;
  if (!t) return;
  const av = document.getElementById('sfAvatar');
  const nm = document.getElementById('sfName');
  const rl = document.getElementById('sfRole');
  if (av) av.textContent = t.avatar || (t.name||'?')[0];
  if (nm) nm.textContent = t.name || '—';
  if (rl) rl.textContent = t.role || '—';
}
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(_updateSidebarUser, 800);
  setInterval(_updateSidebarUser, 2000);
});

document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('#appSidebar .snav-btn').forEach(function(b){if(!b.title)b.title=b.textContent.trim();});});


// Rig area: Fixtures, Stock and History share one tab strip under a single sidebar entry.
function rigTabs(page){
  const tabs=[['fixtures','Fixtures'],['inventory','Stock'],['history','History']];
  tabs.forEach(([id])=>{
    const pg=document.getElementById('pg-'+id); if(!pg) return;
    let bar=pg.querySelector(':scope > .rig-tabs');
    if(!bar){
      bar=document.createElement('div'); bar.className='rig-tabs';
      bar.innerHTML=tabs.map(([k,l])=>`<button class="rig-tab" data-p="${k}" onclick="go('${k}')">${l}</button>`).join('');
      pg.insertBefore(bar,pg.firstChild);
    }
    bar.querySelectorAll('.rig-tab').forEach(b=>b.classList.toggle('active',b.dataset.p===page));
  });
}
