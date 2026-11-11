// Copies the web app (one folder up) into ./www so Capacitor can bundle it. Skips tests, tools, git and this folder.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..'), dst = path.join(__dirname, 'www');
const skip = new Set(['.git', 'node_modules', 'android-wrapper', 'tests', 'tools', 'functions', 'docs']);
const keepRoot = f => !/\.(md|zip|bat|command|rules)$/i.test(f) && !/^(firebase\.json|firestore\.indexes\.json|package(-lock)?\.json|index\.js|kcc-auth(-core)?\.js)$/.test(f);
fs.rmSync(dst, { recursive: true, force: true });
(function copy(a, b, root) {
  fs.mkdirSync(b, { recursive: true });
  for (const f of fs.readdirSync(a)) {
    if (root && (skip.has(f) || !keepRoot(f))) continue;
    const p = path.join(a, f), q = path.join(b, f);
    fs.statSync(p).isDirectory() ? copy(p, q, false) : fs.copyFileSync(p, q);
  }
})(src, dst, true);
console.log('www ready:', fs.readdirSync(dst).length, 'items');
