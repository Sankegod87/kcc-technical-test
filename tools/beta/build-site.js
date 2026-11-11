// Builds the side-by-side site:  old app at the root + the new version in /v2/ behind the beta password.
//   node tools/beta/build-site.js --old <folder with the OLD app> --config <firebase-config.js> --password <beta password> [--out site]
// Nothing is uploaded; it only writes the output folder.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const a=process.argv.slice(2), arg=n=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:null;};
const ROOT=path.join(__dirname,'..','..'), old=arg('old'), cfg=arg('config'), pw=arg('password'), out=path.resolve(arg('out')||'site');
if(!old||!cfg||!pw){console.error('Need --old <dir> --config <firebase-config.js> --password <text>');process.exit(1);}
const cfgText=fs.readFileSync(cfg,'utf8');
if(/PASTE/.test(cfgText)||!/KCC_FIREBASE_CONFIG/.test(cfgText)){console.error('The config file still has PASTE placeholders or no KCC_FIREBASE_CONFIG.');process.exit(1);}
if(/light-tracker-d708f/.test(cfgText)){console.error('That config is the LIVE project. The beta must use a separate test project.');process.exit(1);}
if(!/KCC_REQUIRE_BETA\s*=\s*true/.test(cfgText)){console.error('Config must set window.KCC_REQUIRE_BETA = true');process.exit(1);}
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(old,out,{recursive:true,filter:s=>!/[\\/](\.git|node_modules)([\\/]|$)/.test(s)});
const SKIP=new Set(['.git','node_modules','tests','tools','android-wrapper','index.js','kcc-auth.js','kcc-auth-core.js','package.json','package-lock.json','firestore.rules','firebase-config.example.js','firebase-config.beta.js']);
fs.cpSync(ROOT,path.join(out,'v2'),{recursive:true,filter:s=>{const r=path.relative(ROOT,s);return !SKIP.has(r.split(path.sep)[0])&&!/\.(md|command|bat)$/i.test(r);}});
fs.writeFileSync(path.join(out,'v2','firebase-config.js'),cfgText);
const hash=crypto.createHash('sha256').update(pw).digest('hex');
const gate=fs.readFileSync(path.join(__dirname,'gate.js'),'utf8').replace('__HASH__',hash);
fs.writeFileSync(path.join(out,'beta-gate.js'),gate);
const ip=path.join(out,'index.html'); let h=fs.readFileSync(ip,'utf8');
if(!h.includes('beta-gate.js')){ const i=h.lastIndexOf('</body>'); h=i>=0?h.slice(0,i)+'<script src="beta-gate.js"></script>\n'+h.slice(i):h+'\n<script src="beta-gate.js"></script>'; }
fs.writeFileSync(ip,h);
console.log('Built',out,'\n  old app at /   new version at /v2/   (nothing uploaded)');
