#!/usr/bin/env node
// Builds ONE self-contained HTML file of the whole app plus a pretend cloud, so it opens by double-click (no Node, no server).
//   npm i --no-save esbuild @noble/hashes buffer   (in the repo root), then:  node tools/single-html/build.js [out.html]
const fs = require('fs'), path = require('path'), esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..', '..'), out = process.argv[2] || path.join(ROOT, 'kcc-technical-demo.html');
const { FAKE } = require('../../tests/fake-modules.js');
const r = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), b64 = f => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const be = esbuild.buildSync({ entryPoints: [path.join(__dirname, 'backend-entry.js')], bundle: true, write: false, format: 'iife', platform: 'browser', minify: true,
  alias: { crypto: path.join(__dirname, 'crypto-shim.js') }, external: ['firebase-admin', 'fs'], loader: { '.json': 'json' }, define: { global: 'window', 'process.env.NODE_ENV': '"production"' },
  inject: [path.join(__dirname, 'buffer-inject.js')], nodePaths: [path.join(ROOT, 'node_modules')].concat((process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean)) }).outputFiles[0].text;
let h = r('index.html');
h = h.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/, '');
h = h.replace(/<link rel="manifest"[^>]*>\n?/, '');
const data = s => 'data:text/javascript;base64,' + Buffer.from(s).toString('base64');
const map = { 'firebase-app': FAKE.app, 'firebase-auth': FAKE.auth, 'firebase-functions': FAKE.functions, 'firebase-firestore': FAKE.firestore }, imports = {};
h = h.replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/(firebase-(?:app|auth|functions|firestore))\.js/g, (m, n) => (imports[m] = data(map[n]), m));
const mdir = path.join(ROOT, 'manuals'), man = {};
if (fs.existsSync(mdir)) fs.readdirSync(mdir).filter(f => /\.pdf$/i.test(f)).forEach(f => { man['manuals/' + f] = fs.readFileSync(path.join(mdir, f)).toString('base64'); });
const manJs = 'window.__MANUALS=' + JSON.stringify(man) + ';document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest(\'a[href^="manuals/"]\');if(!a)return;var b=window.__MANUALS[a.getAttribute("href")];if(!b)return;e.preventDefault();var bin=atob(b),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);window.open(URL.createObjectURL(new Blob([u],{type:"application/pdf"})),"_blank");},true);';
h = h.replace('<head>', '<head>\n<script type="importmap">' + JSON.stringify({ imports }) + '</script>\n<script>' + manJs + '</script>\n<script>' + safe(be) + '</script>');
h = h.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, f) => '<style>' + r(f).replace(/<\/style/gi, '<\\/style') + '</style>');
h = h.replace(/<script src="((?:js|)[^"]*\.js)"><\/script>/g, (m, f) => fs.existsSync(path.join(ROOT, f)) ? '<script>' + safe(r(f)) + '</script>' : m);
h = h.replace(/(src|href)="((?:icon-\d+\.png)|icon\.svg)"/g, (m, a, f) => a + '="data:' + (f.endsWith('svg') ? 'image/svg+xml' : 'image/png') + ';base64,' + b64(f) + '"');
fs.writeFileSync(out, h); console.log('wrote', out, (h.length / 1e6).toFixed(1) + ' MB');
