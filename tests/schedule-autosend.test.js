const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('js/09-shared-ui.js','utf8');
const fn=src.slice(src.indexOf('function checkScheduleEmails(){'),src.indexOf('// ── Export CSV ──'));
function run(role,thursday,db){
  let sent=0,saves=0;
  const RealDate=Date;
  const fake=thursday?new RealDate(2026,10,12,12,0):new RealDate(2026,10,13,12,0);
  class D extends RealDate{constructor(...a){ if(a.length) super(...a); else super(fake.getTime()); }}
  const ctx={Date:D,_techId:'t1',isAdmin:()=>role!=='user',db,save:()=>saves++,schedKey:d=>d.toISOString().slice(0,10),
    sendScheduleEmails:()=>{sent++;},toast(){},console,setTimeout:(f)=>f()};
  vm.createContext(ctx); vm.runInContext(fn+';checkScheduleEmails();',ctx);
  return {sent,saves};
}
const mk=()=>({settings:{},schedules:{'2026-11-15':{crew:['a','b']}}});
const assert=require('assert');
assert.deepStrictEqual(run('user',true,mk()),{sent:0,saves:0},'crew must not trigger');
assert.deepStrictEqual(run('admin',false,mk()),{sent:0,saves:0},'not Thursday');
const d=mk(); assert.strictEqual(run('admin',true,d).sent,1); assert.strictEqual(run('admin',true,d).sent,0,'second open must not resend'); assert.strictEqual(run('master',true,d).sent,0,'other admin must not resend');
console.log('schedule auto-send: all checks passed');
