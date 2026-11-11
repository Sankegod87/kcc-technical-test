// Offline-safe sync. The whole app lives in one Firestore document, so two people (or one person
// offline) editing at once would normally overwrite each other. Instead we keep the last copy that
// matched the cloud (the "base") and, when the cloud copy arrives while this device has unsent
// edits, three-way merge: base vs this device vs cloud.
//  - changed on one side only  -> take that change
//  - list items are matched by id, so adds/edits/deletes on different items all survive
//  - same field edited on both sides -> this device wins
const SYNC_BASE_KEY='slt_sync_base', SYNC_DIRTY_KEY='slt_sync_dirty';
const _jeq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const _isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const _hasIds=a=>a.length>0&&a.every(x=>_isObj(x)&&x.id!==undefined);

function syncMarkDirty(v){try{v?localStorage.setItem(SYNC_DIRTY_KEY,'1'):localStorage.removeItem(SYNC_DIRTY_KEY);}catch(e){}}
function syncIsDirty(){try{return localStorage.getItem(SYNC_DIRTY_KEY)==='1';}catch(e){return false;}}
function syncSetBase(obj){try{localStorage.setItem(SYNC_BASE_KEY,JSON.stringify(obj));}catch(e){try{localStorage.removeItem(SYNC_BASE_KEY);}catch(_){}}}
function syncGetBase(){try{const s=localStorage.getItem(SYNC_BASE_KEY);return s?JSON.parse(s):null;}catch(e){return null;}}

function mergeVal(b,l,r){
  if(_jeq(l,r)) return l;
  if(_jeq(l,b)) return r;      // only the cloud changed
  if(_jeq(r,b)) return l;      // only this device changed
  if(Array.isArray(l)&&Array.isArray(r)){
    const ba=Array.isArray(b)?b:[];
    if(_hasIds(l.concat(r))){
      const idx=a=>{const m=new Map();a.forEach(x=>m.set(String(x.id),x));return m;};
      const B=idx(ba),L=idx(l),R=idx(r),out=[],seen=new Set();
      // keep the cloud's order, then append items only this device has
      [...r,...l].forEach(x=>{
        const id=String(x.id); if(seen.has(id))return; seen.add(id);
        const bi=B.get(id),li=L.get(id),ri=R.get(id);
        if(li&&ri){out.push(mergeVal(bi,li,ri));}
        else if(li){ if(!bi||!_jeq(li,bi)) out.push(li); }      // added here, or edited here after the cloud deleted it
        else if(ri){ if(!bi||!_jeq(ri,bi)) out.push(ri); }      // added in cloud, or edited there after we deleted it
      });
      return out;
    }
    // lists without ids (logs, plain values): union, minus anything either side removed
    const bs=new Set(ba.map(x=>JSON.stringify(x))),ls=new Set(l.map(x=>JSON.stringify(x))),rs=new Set(r.map(x=>JSON.stringify(x)));
    const out=[],seen=new Set();
    [...r,...l].forEach(x=>{const k=JSON.stringify(x);if(seen.has(k))return;seen.add(k);
      if(ls.has(k)&&rs.has(k))out.push(x);
      else if(!bs.has(k))out.push(x);});
    return out;
  }
  if(_isObj(l)&&_isObj(r)){
    const bo=_isObj(b)?b:{},out={};
    new Set([...Object.keys(r),...Object.keys(l)]).forEach(k=>{
      const inL=k in l,inR=k in r;
      if(inL&&inR) out[k]=mergeVal(bo[k],l[k],r[k]);
      else if(inL){ if(!(k in bo)||!_jeq(l[k],bo[k])) out[k]=l[k]; }
      else { if(!(k in bo)||!_jeq(r[k],bo[k])) out[k]=r[k]; }
    });
    return out;
  }
  return l;
}
// Merge the incoming cloud copy with this device's unsent edits.
function syncMergeRemote(remote){
  const base=syncGetBase()||{};
  return mergeVal(base,JSON.parse(JSON.stringify(db)),remote);
}
window.syncMergeRemote=syncMergeRemote;window.mergeVal=mergeVal;

// Connection state
function syncOnlineUI(){
  if(!window._syncMode||window._syncMode!=='firebase') return;
  if(!navigator.onLine){ if(typeof setSyncState==='function') setSyncState('error','Offline — edits are kept on this device'); }
}
async function syncReconnect(){
  if(!navigator.onLine||window._syncMode!=='firebase') return;
  if(!syncIsDirty()){ if(typeof setSyncState==='function') setSyncState('ok','Back online'); return; }
  setSyncState('syncing','Back online — merging your edits…');
  try{
    const remote=window._fetchRemote?await window._fetchRemote():null;
    if(remote){ window._onRemoteData(remote); }   // merges and saves
    else await save();
  }catch(e){ setSyncState('error','Sync failed — will retry'); }
}
window.addEventListener('offline',syncOnlineUI);
window.addEventListener('online',syncReconnect);
setInterval(()=>{ if(navigator.onLine&&syncIsDirty()&&window._syncMode==='firebase') syncReconnect(); },60000);
