// Settings page: grouped tabs + search. Panels keep their own content and permissions; this only shows/hides them.
(function(){
  const GROUPS=[
    {id:'general',label:'General',   words:['branding','accent','dashboard widgets']},
    {id:'conn',   label:'Connections',words:['connections']},
    {id:'crew',   label:'Crew & access',words:['schedule roles','training options','admin pin','claim master','role management','account','launch email']},
    {id:'gear',   label:'Gear & stock',words:['gear categories','departments','vendors','maintenance defaults']},
    {id:'alerts', label:'Alerts',    words:['push notifications','overdue reminders']},
    {id:'data',   label:'Backup',    words:['backup']},
  ];
  const KEY='kcc_settings_tab'; let tab='general', q='', built=false;
  const gOf=t=>{t=t.toLowerCase();const g=GROUPS.find(g=>g.words.some(w=>t.includes(w)));return g?g.id:'general';};
  function panels(){ return [...document.querySelectorAll('#pg-settings .grid2 > .panel')]; }
  function visibleByRole(p){ return p.style.display!=='none'; }
  function apply(){
    const ps=panels(), counts={};
    ps.forEach(p=>{ p._g=p._g||gOf((p.querySelector('.pt')||{}).textContent||''); if(visibleByRole(p)) counts[p._g]=(counts[p._g]||0)+1; });
    // an unavailable tab (crew can't see admin panels) is hidden; fall back to the first that has something
    const avail=GROUPS.filter(g=>counts[g.id]);
    if(!avail.some(g=>g.id===tab)&&avail.length) tab=avail[0].id;
    const nq=q.trim().toLowerCase();
    let shown=0;
    ps.forEach(p=>{
      const hit=nq?(p.textContent||'').toLowerCase().includes(nq):p._g===tab;
      p.classList.toggle('st-hide',!hit); if(hit&&visibleByRole(p)) shown++;
    });
    const bar=document.getElementById('st-tabs'); if(!bar) return;
    bar.innerHTML=avail.map(g=>`<button class="st-tab${!nq&&g.id===tab?' on':''}" onclick="stTab('${g.id}')">${g.label}</button>`).join('');
    const none=document.getElementById('st-none'); if(none) none.style.display=shown?'none':'';
  }
  window.stTab=function(id){ tab=id; q=''; const s=document.getElementById('st-search'); if(s) s.value=''; try{localStorage.setItem(KEY,id);}catch(e){} apply(); };
  window.stSearch=function(v){ q=v||''; apply(); };
  function build(){
    const pg=document.getElementById('pg-settings'), grid=pg&&pg.querySelector('.grid2'); if(!grid||built) return; built=true;
    try{ tab=localStorage.getItem(KEY)||'general'; }catch(e){}
    const st=document.createElement('style');
    st.textContent='.st-hide{display:none!important}.st-nav{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}#st-tabs{display:flex;gap:6px;flex-wrap:wrap;flex:1}.st-tab{background:var(--s2,transparent);border:1px solid var(--border);color:var(--dim2,var(--text));padding:8px 14px;border-radius:8px;font:600 12px var(--head);letter-spacing:.04em;cursor:pointer}.st-tab.on{background:var(--amber,var(--accent));color:#06231B;border-color:transparent}#st-search{width:200px;max-width:100%}';
    document.head.appendChild(st);
    const nav=document.createElement('div'); nav.className='st-nav';
    nav.innerHTML='<div id="st-tabs"></div><input id="st-search" type="search" placeholder="Search settings…" oninput="stSearch(this.value)">';
    grid.parentNode.insertBefore(nav,grid);
    const none=document.createElement('p'); none.id='st-none'; none.className='dim'; none.style.display='none'; none.textContent='No settings match that search.';
    grid.parentNode.insertBefore(none,grid.nextSibling);
  }
  const _rs=renderSettings;
  renderSettings=function(){ build(); const r=_rs.apply(this,arguments); apply(); return r; };
})();
