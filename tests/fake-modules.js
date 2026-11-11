// Stand-ins for the Firebase browser modules, used by the browser tests and the local demo.
// They talk to the page's window.__call / __fsGet / __fsCommit / __tokenInfo bridge.
const FAKE = {
  app: `export const initializeApp=()=>({});`,
  auth: `
let cur=null;try{cur=JSON.parse(sessionStorage.getItem('fake_auth')||'null');}catch(e){}
const ls=[];const user=()=>cur?{uid:cur.uid,getIdTokenResult:async()=>({claims:cur.claims})}:null;
window.__authNow=()=>cur;const notify=()=>ls.forEach(cb=>cb(user()));
export const getAuth=()=>({get currentUser(){return user();}});
export const signInWithCustomToken=async(a,t)=>{const r=await window.__tokenInfo(t);if(!r)throw Object.assign(new Error('bad token'),{code:'auth/invalid-custom-token'});cur={uid:r.uid,claims:r.claims};sessionStorage.setItem('fake_auth',JSON.stringify(cur));notify();};
export const signOut=async()=>{cur=null;sessionStorage.removeItem('fake_auth');notify();};
export const onIdTokenChanged=(a,cb)=>{ls.push(cb);setTimeout(()=>cb(user()),0);};`,
  functions: `
export const getFunctions=()=>({});
export const httpsCallable=(f,name)=>async(data)=>{const r=await window.__call(name,JSON.stringify(data||{}),JSON.stringify(window.__authNow&&window.__authNow()||null));
 if(r.error){const e=new Error(r.error.message);e.code='functions/'+r.error.code;e.details=r.error.details;throw e;}return{data:r.data};};`,
  firestore: `
export const getFirestore=()=>({});export const doc=(d,p)=>({path:p});export const serverTimestamp=()=>'ts';
const A=()=>JSON.stringify(window.__authNow&&window.__authNow()||null);
const mk=r=>({exists:()=>r.exists,data:()=>r.data});
const raw=async p=>{const r=await window.__fsGet(p,A());if(r.error){const e=new Error(r.error);e.code='permission-denied';throw e;}return r;};
const L=new Set();window.__hold=false;window.__fsChanged=()=>{if(!window.__hold)L.forEach(l=>l.check());};window.__release=()=>{window.__hold=false;window.__fsChanged();};
export const getDoc=async r=>mk(await raw(r.path));
export const onSnapshot=(r,cb,err)=>{const l={last:null,check:async()=>{try{const x=await raw(r.path);const k=JSON.stringify(x);if(k===l.last)return;l.last=k;cb(Object.assign(mk(x),{metadata:{hasPendingWrites:false}}));}catch(e){if(l.last!=='err'){l.last='err';err&&err(e);}}}};L.add(l);l.check();return()=>L.delete(l);};
export const runTransaction=async(d,fn)=>{const w=[];await fn({get:async r=>mk(await raw(r.path)),set:(r,v)=>w.push({path:r.path,value:v})});const x=await window.__fsCommit(JSON.stringify(w),A());if(x.error){const e=new Error(x.error);e.code='permission-denied';throw e;}};`
};
module.exports = { FAKE };
