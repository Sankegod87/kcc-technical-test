// One icon set for the whole app. Emoji written in markup or templates are swapped for
// matching line icons at render time; anything not in the map is left alone.
(function(){
  const P=(d,extra)=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra||''} aria-hidden="true">${d}</svg>`;
  const I={
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    warn:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.5"/>',
    bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
    camera:'<rect x="2" y="7" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M8 7l1.5-3h5L16 7"/>',
    box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/>',
    crown:'<path d="M3 18l-1-11 6 5 4-8 4 8 6-5-1 11H3z"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    clip:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h6"/>',
    edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
    sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    wrench:'<path d="M14.7 6.3a4 4 0 005 5L21 15l-4 4-9.7-9.7A4 4 0 0113 4l-2.3 2.3"/>',
    laptop:'<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 20h20"/>',
    skull:'<path d="M12 3a8 8 0 00-5 14v3h10v-3a8 8 0 00-5-14z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
    ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    megaphone:'<path d="M3 10v4h4l8 5V5L7 10H3z"/><path d="M18 9a4 4 0 010 6"/>',
    file:'<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"/><path d="M14 3v6h6"/>',
    guitar:'<circle cx="9" cy="15" r="5"/><path d="M13 11l7-7M17 3l4 4"/>',
    recycle:'<path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
    tag:'<path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    star:'<path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9l3-7z"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
    upload:'<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
    download:'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
    chat:'<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z"/>',
    truck:'<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2.5M12 17v.5"/>',
    signal:'<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M4.9 4.9a10 10 0 000 14.2M19.1 4.9a10 10 0 010 14.2"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    book:'<path d="M4 4h7a3 3 0 013 3v14a2 2 0 00-2-2H4V4zM20 4h-7"/><path d="M20 4v15h-6"/>',
    party:'<path d="M3 21l5-14 9 9-14 5z"/><path d="M14 4v2M19 9h2M18 3l-1 2M21 14l-2-1"/>',
    bell:'<path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4"/>',
    refresh:'<path d="M21 12a9 9 0 01-15 6.7L3 16M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    plug:'<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0V8zM12 18v4"/>',
    battery:'<rect x="2" y="8" width="18" height="9" rx="2"/><path d="M22 11v3M6 11v3M10 11v3"/>',
    medal:'<circle cx="12" cy="15" r="5"/><path d="M8 3l4 7 4-7"/>',
    pin:'<path d="M12 22s7-6 7-12a7 7 0 00-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trophy:'<path d="M7 4h10v5a5 5 0 01-10 0V4zM7 6H3v2a4 4 0 004 4M17 6h4v2a4 4 0 01-4 4M12 14v4M8 21h8"/>',
    heart:'<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z"/>',
    flame:'<path d="M12 2s5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
    eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/>',
    map:'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15"/>',
    print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    cross:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    dot:'<circle cx="12" cy="12" r="6" fill="currentColor"/>',
    mixer:'<path d="M5 3v18M12 3v18M19 3v18"/><rect x="3" y="7" width="4" height="3" fill="currentColor"/><rect x="10" y="14" width="4" height="3" fill="currentColor"/><rect x="17" y="9" width="4" height="3" fill="currentColor"/>',
    scope:'<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>',
    palette:'<path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a4 4 0 004-4c0-5-4-10-9-10z"/>',
    hammer:'<path d="M14 4l6 6-3 3-6-6 3-3zM11 7L3 15l3 3 8-8"/>',
    wave:'<path d="M7 11V5a1.5 1.5 0 013 0v5M10 10V4a1.5 1.5 0 013 0v6M13 10V6a1.5 1.5 0 013 0v7a7 7 0 01-12 4l-2-4a1.5 1.5 0 012-1.5L7 13"/>',
    thumb:'<path d="M7 11v9H3v-9h4zM7 11l4-8a2 2 0 012 2v4h6a2 2 0 012 2l-2 7a2 2 0 01-2 1H7"/>',
    point:'<path d="M11 12H3M7 8l-4 4 4 4M11 8h6a4 4 0 014 4v0a4 4 0 01-4 4h-6"/>'
  };
  // emoji -> [icon, optional colour]
  const M={'👤':['user'],'⚠️':['warn','#F0B24A'],'⚠':['warn','#F0B24A'],'💡':['bulb'],'📷':['camera'],'📦':['box'],'📧':['mail'],'👑':['crown'],'🔑':['key'],'📅':['calendar'],'🗓':['calendar'],'📋':['clip'],'📝':['edit'],'✏️':['edit'],'🗑️':['trash'],'🎚️':['sliders'],'🔧':['wrench'],'💻':['laptop'],'💀':['skull'],'🚫':['ban','#FF6B5E'],'📢':['megaphone'],'📄':['file'],'🎸':['guitar'],'♻️':['recycle'],'🏷️':['tag'],'📊':['chart'],'📱':['phone'],'📲':['phone'],'⭐':['star','#F0B24A'],'🔒':['lock'],'⬆️':['up'],'📤':['upload'],'📥':['download'],'💬':['chat'],'🚚':['truck'],'❓':['help'],'📡':['signal'],'🎛️':['mixer'],'🌐':['globe'],'📚':['book'],'🎉':['party'],'🔔':['bell'],'🔄':['refresh'],'🔌':['plug'],'🔋':['battery'],'🏅':['medal'],'📌':['pin'],'🕐':['clock'],'🏆':['trophy'],'❤️':['heart','#FF6B5E'],'🔥':['flame','#F0B24A'],'👁️':['eye'],'🖨️':['print'],'🗺️':['map'],'☰':['menu'],'✅':['check','#2DD4A0'],'❌':['cross','#FF6B5E'],'🔴':['dot','#FF6B5E'],'🟡':['dot','#F0B24A'],'🔭':['scope'],'🎨':['palette'],'🏗️':['hammer'],'👋':['wave'],'👍':['thumb'],'👈':['point'],'📎':['clip']};
  const keys=Object.keys(M).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const RX=new RegExp(keys.join('|')+'|\\uFE0F','g');
  const SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1,SELECT:1,TITLE:1,SVG:1,CODE:1};
  function svg(k){const e=M[k];if(!e)return k;return P(I[e[0]],e[1]?` style="color:${e[1]}"`:'');}
  function swapText(n){
    const t=n.nodeValue; if(!t||!RX.test(t)){RX.lastIndex=0;return;} RX.lastIndex=0;
    const p=n.parentNode; if(!p||SKIP[p.nodeName.toUpperCase()]||p.closest&&p.closest('[data-keep-emoji]'))return;
    const frag=document.createDocumentFragment(); let last=0,m;
    while((m=RX.exec(t))){ if(m[0]==='️')continue; frag.appendChild(document.createTextNode(t.slice(last,m.index))); const w=document.createElement('span'); w.innerHTML=svg(m[0]); frag.appendChild(w.firstChild); last=m.index+m[0].length; }
    frag.appendChild(document.createTextNode(t.slice(last))); p.replaceChild(frag,n);
  }
  function walk(root){
    if(!root||root.nodeType===3){ if(root)swapText(root); return; }
    if(root.nodeType!==1||SKIP[root.nodeName.toUpperCase()])return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode;return p&&!SKIP[p.nodeName.toUpperCase()]?1:2;}});
    const list=[]; while(w.nextNode())list.push(w.currentNode); list.forEach(swapText);
  }
  let busy=false,q=new Set(),timer=null;
  function flush(){timer=null;busy=true;try{q.forEach(n=>{if(n.isConnected)walk(n);});}finally{q.clear();busy=false;}}
  function start(){
    walk(document.body);
    new MutationObserver(ms=>{ if(busy)return; ms.forEach(m=>{ if(m.type==='characterData')q.add(m.target); else m.addedNodes.forEach(n=>q.add(n)); }); if(!timer)timer=setTimeout(flush,30); }).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  window.kccIcons={walk,svg};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
