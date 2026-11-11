// ════════════════════════════════════════════════
// ── FIXTURE MAP ENGINE ──────────────────────────
// ════════════════════════════════════════════════
(function(){
  // ── State ──
  let _pan={x:40,y:40},_scale=1,_dragging=null,_dragType=null,_dragStart=null,_draggingZone=null,_zoneDragMoved=false;
  const SVG_NS='http://www.w3.org/2000/svg';
  let _mapInited=false;

  // ── Colour helper ──
  function fixColor(f){
    const maintDueIds=new Set(getMaintDue().map(x=>x.id));
    if(f.status==='out') return '#A32D2D';
    if(maintDueIds.has(f.id)) return '#BA7517';
    return '#3B6D11';
  }

  // ── SVG helpers ──
  function svgEl(tag,attrs,parent){
    const el=document.createElementNS(SVG_NS,tag);
    Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,v));
    if(parent)parent.appendChild(el);
    return el;
  }

  // ── Transform layer to pan/zoom ──
  function applyTransform(){
    const layers=['map-grid-layer','map-zones-layer','map-fixtures-layer'];
    layers.forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.setAttribute('transform',`translate(${esc(_pan.x)},${esc(_pan.y)}) scale(${_scale})`);
    });
    // Also reposition the grid pattern for infinite feel
    const pat=document.getElementById('map-grid');
    if(pat){pat.setAttribute('x',_pan.x%40);pat.setAttribute('y',_pan.y%40);}
  }

  // ── Render all zones ──
  function renderZones(){
    const layer=document.getElementById('map-zones-layer');if(!layer)return;
    layer.innerHTML='';
    const zones=db.settings?.mapZones||[];
    zones.forEach((z,zi)=>{
      const g=svgEl('g',{},layer);
      const col=z.color||'#0F6E56';
      const rx=z.x!=null?z.x:20, ry=z.y!=null?z.y:20;
      svgEl('rect',{x:rx,y:ry,width:z.w||200,height:z.h||150,rx:8,fill:col+'14',stroke:col+'55','stroke-width':1.5,'stroke-dasharray':'6,3'},g);
      svgEl('text',{x:rx+10,y:ry+18,'font-size':11,'font-family':'IBM Plex Mono, monospace','font-weight':600,fill:col+'cc','letter-spacing':'1'},g).textContent=z.name.toUpperCase();
      if(isAdmin()){
        // Drag handle corner
        const dh=svgEl('rect',{x:rx,y:ry,width:z.w||200,height:z.h||150,rx:8,fill:'transparent',cursor:'move'},g);
        dh.addEventListener('mousedown',e=>{if(e.button!==0)return;e.stopPropagation();_zoneDragMoved=false;_draggingZone={zi,ox:e.clientX,oy:e.clientY,zx:z.x!=null?z.x:20,zy:z.y!=null?z.y:20};});
        // Resize handle
        const rh=svgEl('rect',{x:rx+(z.w||200)-10,y:ry+(z.h||150)-10,width:10,height:10,fill:col,rx:2,cursor:'se-resize'},g);
        rh.addEventListener('mousedown',e=>{if(e.button!==0)return;e.stopPropagation();_draggingZone={zi,ox:e.clientX,oy:e.clientY,resize:true,zw:z.w||200,zh:z.h||150};});
        // Delete btn
        const delG=svgEl('g',{cursor:'pointer'},g);
        svgEl('circle',{cx:rx+(z.w||200)-4,cy:ry+4,r:7,fill:'#A32D2D'},delG);
        svgEl('text',{x:rx+(z.w||200)-4,y:ry+4+4,'font-size':9,'text-anchor':'middle',fill:'#fff','font-weight':700},delG).textContent='✕';
        delG.addEventListener('click',e=>{e.stopPropagation();if(_zoneDragMoved)return;removeMapZone(zi);});
      }
    });
  }

  // ── Render all fixtures on map ──
  function renderFixtureNodes(){
    const layer=document.getElementById('map-fixtures-layer');if(!layer)return;
    layer.innerHTML='';
    const admin=isAdmin();
    db.fixtures.forEach(f=>{
      if(f.mapX==null||f.mapY==null)return;
      const col=fixColor(f);
      const g=svgEl('g',{transform:`translate(${esc(f.mapX)},${esc(f.mapY)})`,cursor:admin?'grab':'pointer','data-id':f.id},layer);
      // Glow ring for OUT fixtures
      if(f.status==='out') svgEl('circle',{cx:0,cy:0,r:16,fill:col+'22',stroke:col+'55','stroke-width':1},g);
      // Main dot
      svgEl('circle',{cx:0,cy:0,r:11,fill:col,stroke:'#fff','stroke-width':2},g);
      // Icon
      const icons={wash:'⬤',spot:'★',par:'◆',fresnel:'◉',led:'✦',follow:'◎',other:'●'};
      const ic=svgEl('text',{x:0,y:4,'text-anchor':'middle','font-size':9,fill:'#fff','font-weight':700,'pointer-events':'none'},g);
      ic.textContent=f.id.slice(0,3);
      // Label below
      const lb=svgEl('text',{x:0,y:26,'text-anchor':'middle','font-size':9,'font-family':'IBM Plex Mono, monospace',fill:'#374151','font-weight':600},g);
      lb.textContent=f.name.length>12?f.name.slice(0,11)+'…':f.name;
      // Click → view fixture
      g.addEventListener('click',e=>{if(_dragging)return;e.stopPropagation();viewFixture(f.id);});
      // Drag to reposition (admin only)
      if(admin){
        g.addEventListener('mousedown',e=>{
          if(e.button!==0)return;
          e.stopPropagation();
          _dragging=f.id;_dragType='fixture';
          _dragStart={mx:e.clientX,my:e.clientY,fx:f.mapX,fy:f.mapY};
          g.setAttribute('cursor','grabbing');
        });
        // Touch support
        g.addEventListener('touchstart',e=>{
          e.preventDefault();e.stopPropagation();
          const t=e.touches[0];
          _dragging=f.id;_dragType='fixture';
          _dragStart={mx:t.clientX,my:t.clientY,fx:f.mapX,fy:f.mapY};
        },{passive:false});
      }
    });
  }

  // ── Unplaced tray ──
  function renderUnplaced(){
    const unplaced=db.fixtures.filter(f=>f.mapX==null||f.mapY==null);
    const btn=document.getElementById('map-unplaced-btn');
    if(btn){
      if(unplaced.length){btn.style.display='';btn.textContent='📌 '+unplaced.length+' Unplaced';}
      else btn.style.display='none';
    }
    const list=document.getElementById('unplaced-fixtures-list');
    const count=document.getElementById('unplaced-count');
    if(list)list.innerHTML=unplaced.map(f=>`
      <div draggable="true" data-fid="${esc(f.id)}"
        ondragstart="mapTrayDragStart(event,'${esc(f.id)}')"
        style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;background:${fixColor(f)}18;border:1px solid ${fixColor(f)}44;font-family:var(--mono);font-size:10px;font-weight:600;color:${fixColor(f)};cursor:grab;white-space:nowrap">
        <span style="width:8px;height:8px;border-radius:50%;background:${fixColor(f)};display:inline-block"></span>${esc(f.id)} ${f.name.length>10?f.name.slice(0,9)+'…':f.name}
      </div>`).join('');
    if(count)count.textContent=unplaced.length+' fixtures not yet placed';
  }

  // ── Full map render ──
  window.renderFixMap=function(){
    const wrap=document.getElementById('map-canvas-wrap');if(!wrap)return;
    if(!_mapInited){
      _mapInited=true;
      initMapInteraction();
    }
    applyTransform();
    renderZones();
    renderFixtureNodes();
    renderUnplaced();
    applyPermissions();
  };

  // ── Drag tray fixture onto map ──
  window.mapTrayDragStart=function(e,fid){e.dataTransfer.setData('text/plain',fid);};
  window._mapDragOver=function(e){e.preventDefault();};
  window._mapDrop=function(e){
    e.preventDefault();
    const fid=e.dataTransfer.getData('text/plain');
    const f=db.fixtures.find(x=>x.id===fid);if(!f)return;
    const wrap=document.getElementById('map-canvas-wrap');
    const rect=wrap.getBoundingClientRect();
    const mx=(e.clientX-rect.left-_pan.x)/_scale;
    const my=(e.clientY-rect.top-_pan.y)/_scale;
    f.mapX=Math.round(mx);f.mapY=Math.round(my);
    save();renderFixMap();
    const tray=document.getElementById('map-unplaced-tray');
    if(tray&&db.fixtures.filter(x=>x.mapX==null).length===0)tray.style.display='none';
  };

  // ── Canvas pan + fixture drag interactions ──
  function initMapInteraction(){
    const wrap=document.getElementById('map-canvas-wrap');if(!wrap)return;
    let _panning=false,_panStart=null;

    wrap.addEventListener('dragover',window._mapDragOver);
    wrap.addEventListener('drop',window._mapDrop);

    wrap.addEventListener('mousedown',e=>{
      if(_dragging||_draggingZone)return;
      _panning=true;_panStart={mx:e.clientX,my:e.clientY,px:_pan.x,py:_pan.y};
      wrap.style.cursor='grabbing';
    });
    window.addEventListener('mousemove',e=>{
      if(_dragging&&_dragStart){
        const f=db.fixtures.find(x=>x.id===_dragging);if(!f)return;
        f.mapX=Math.round(_dragStart.fx+(e.clientX-_dragStart.mx)/_scale);
        f.mapY=Math.round(_dragStart.fy+(e.clientY-_dragStart.my)/_scale);
        renderFixtureNodes();renderUnplaced();
        return;
      }
      if(_draggingZone){
        const z=(db.settings?.mapZones||[])[_draggingZone.zi];if(!z)return;
        if(_draggingZone.resize){
          z.w=Math.max(60,Math.round(_draggingZone.zw+(e.clientX-_draggingZone.ox)/_scale));
          z.h=Math.max(40,Math.round(_draggingZone.zh+(e.clientY-_draggingZone.oy)/_scale));
        } else {
          z.x=Math.round(_draggingZone.zx+(e.clientX-_draggingZone.ox)/_scale);
          z.y=Math.round(_draggingZone.zy+(e.clientY-_draggingZone.oy)/_scale);
        }
        _zoneDragMoved=true;
        renderZones();return;
      }
      if(!_panning||!_panStart)return;
      _pan.x=_panStart.px+(e.clientX-_panStart.mx);
      _pan.y=_panStart.py+(e.clientY-_panStart.my);
      applyTransform();
    });
    window.addEventListener('mouseup',e=>{
      if(_dragging){save();_dragging=null;_dragStart=null;renderFixtureNodes();renderUnplaced();}
      if(_draggingZone){save();_draggingZone=null;renderZones();setTimeout(()=>{_zoneDragMoved=false;},100);}
      if(_panning){_panning=false;wrap.style.cursor='grab';}
    });
    // Touch pan
    let _touchPan=null;
    wrap.addEventListener('touchstart',e=>{if(e.touches.length===1&&!_dragging){_touchPan={mx:e.touches[0].clientX,my:e.touches[0].clientY,px:_pan.x,py:_pan.y};}},{passive:true});
    wrap.addEventListener('touchmove',e=>{
      if(_dragging&&_dragStart&&e.touches.length===1){
        const t=e.touches[0];
        const f=db.fixtures.find(x=>x.id===_dragging);if(!f)return;
        f.mapX=Math.round(_dragStart.fx+(t.clientX-_dragStart.mx)/_scale);
        f.mapY=Math.round(_dragStart.fy+(t.clientY-_dragStart.my)/_scale);
        renderFixtureNodes();return;
      }
      if(_touchPan&&e.touches.length===1){
        e.preventDefault();
        _pan.x=_touchPan.px+(e.touches[0].clientX-_touchPan.mx);
        _pan.y=_touchPan.py+(e.touches[0].clientY-_touchPan.my);
        applyTransform();
      }
    },{passive:false});
    wrap.addEventListener('touchend',e=>{if(_dragging){save();_dragging=null;_dragStart=null;renderFixtureNodes();}if(_touchPan)_touchPan=null;});
    // Scroll to zoom
    wrap.addEventListener('wheel',e=>{
      e.preventDefault();
      const rect=wrap.getBoundingClientRect();
      const mx=e.clientX-rect.left,my=e.clientY-rect.top;
      const factor=e.deltaY<0?1.1:0.9;
      _pan.x=mx+(_pan.x-mx)*factor;
      _pan.y=my+(_pan.y-my)*factor;
      _scale=Math.min(3,Math.max(0.3,_scale*factor));
      applyTransform();
    },{passive:false});
  }

  // ── Zoom buttons ──
  window.mapZoom=function(factor){
    const wrap=document.getElementById('map-canvas-wrap');if(!wrap)return;
    const cx=wrap.offsetWidth/2,cy=wrap.offsetHeight/2;
    _pan.x=cx+(_pan.x-cx)*factor;
    _pan.y=cy+(_pan.y-cy)*factor;
    _scale=Math.min(3,Math.max(0.3,_scale*factor));
    applyTransform();
  };
  window.mapResetView=function(){
    // Fit all placed fixtures into view
    const placed=db.fixtures.filter(f=>f.mapX!=null&&f.mapY!=null);
    const zones=db.settings?.mapZones||[];
    const wrap=document.getElementById('map-canvas-wrap');if(!wrap)return;
    const W=wrap.offsetWidth,H=wrap.offsetHeight;
    if(!placed.length&&!zones.length){_pan={x:W/2,y:H/2};_scale=1;applyTransform();return;}
    const pts=[...placed.map(f=>({x:f.mapX,y:f.mapY})),...zones.map(z=>({x:(z.x||0)+(z.w||200)/2,y:(z.y||0)+(z.h||150)/2}))];
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
    const minX=Math.min(...xs)-60,maxX=Math.max(...xs)+60;
    const minY=Math.min(...ys)-60,maxY=Math.max(...ys)+60;
    const s=Math.min(3,Math.max(0.2,Math.min((W-40)/(maxX-minX||1),(H-40)/(maxY-minY||1))));
    _scale=s;
    _pan={x:(W-(maxX+minX)*s)/2,y:(H-(maxY+minY)*s)/2};
    applyTransform();
  };

  // ── Unplaced tray toggle ──
  window.toggleUnplacedPanel=function(){
    const tray=document.getElementById('map-unplaced-tray');
    if(tray)tray.style.display=tray.style.display==='none'?'':'none';
  };

  // ── Zone editor ──
  window.openMapZoneEditor=function(){
    renderZoneList();
    document.getElementById('m-mapZones').style.display='flex';
  };
  function renderZoneList(){
    const el=document.getElementById('zone-list');if(!el)return;
    const zones=db.settings?.mapZones||[];
    if(!zones.length){el.innerHTML='<p class="dim">No zones yet. Add one below.</p>';return;}
    el.innerHTML=zones.map((z,i)=>`
      <div class="row jbet" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="row gap8">
          <div style="width:14px;height:14px;border-radius:3px;background:${esc(z.color||'#0F6E56')};flex-shrink:0;margin-top:2px"></div>
          <div><div class="fw7" style="font-size:13px">${esc(z.name)}</div><div class="dim">${z.w||200}×${z.h||150}px</div></div>
        </div>
        <button class="btn br bsm" onclick="removeMapZone(${i})">✕</button>
      </div>`).join('');
  }
  window.addMapZone=function(){
    const name=(document.getElementById('zone-name').value||'').trim();
    if(!name){toast('Zone name required','error');return;}
    if(!db.settings)db.settings={};
    if(!db.settings.mapZones)db.settings.mapZones=[];
    const zones=db.settings.mapZones;
    // Auto-stack new zones to the right
    const offsetX=zones.length?zones.reduce((m,z)=>Math.max(m,(z.x||0)+(z.w||200)+20),20):20;
    zones.push({
      name,
      color:document.getElementById('zone-color').value||'#0F6E56',
      x:offsetX,y:20,
      w:parseInt(document.getElementById('zone-w').value)||200,
      h:parseInt(document.getElementById('zone-h').value)||150
    });
    document.getElementById('zone-name').value='';
    save();renderZoneList();renderZones();toast('Zone added','success');
  };
  window.removeMapZone=function(i){
    if(!db.settings?.mapZones)return;
    db.settings.mapZones.splice(i,1);
    save();renderZoneList();renderZones();
  };
})();
// ════════════════════════════════════════════════

// ── BOOT ──
lload();
initTheme();
applyTheme();
applyCustomisation();
loadTech();
handleURLScan();
applyPermissions();
// Always show login on boot — session is resumed in _onRemoteData once Firebase loads
// (db.technicians is empty at this point — Firebase hasn't synced yet)
buildLsGrid();
showLoginScreen();

// Show "Add to Home Screen" tip once on mobile
if(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)){
  const shown=localStorage.getItem('slt_a2hs');
  if(!shown){
    localStorage.setItem('slt_a2hs','1');
    setTimeout(()=>{
      const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
      toast(isIOS?'📱 Tip: tap Share → Add to Home Screen for the best experience':'📱 Tip: tap ⋮ → Add to Home Screen for the best experience','info');
    },2000);
  }
}
