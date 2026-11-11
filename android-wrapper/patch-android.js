// Run after `cap add android`. Allows plain-http calls on the LAN, camera for scanning, and keeps the screen on.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'android', 'app', 'src', 'main');
const mf = path.join(root, 'AndroidManifest.xml');
let x = fs.readFileSync(mf, 'utf8');
if (!x.includes('usesCleartextTraffic')) x = x.replace('<application', '<application\n        android:usesCleartextTraffic="true"');
for (const p of ['CAMERA', 'WAKE_LOCK', 'ACCESS_NETWORK_STATE'])
  if (!x.includes('android.permission.' + p)) x = x.replace('</manifest>', '    <uses-permission android:name="android.permission.' + p + '" />\n</manifest>');
if (!x.includes('android.hardware.camera')) x = x.replace('</manifest>', '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
fs.writeFileSync(mf, x);
const jdir = path.join(root, 'java', 'org', 'kcc', 'technical'), ma = path.join(jdir, 'MainActivity.java');
if (fs.existsSync(ma)) {
  let j = fs.readFileSync(ma, 'utf8');
  if (!j.includes('FLAG_KEEP_SCREEN_ON')) {
    j = j.replace(/public class MainActivity extends BridgeActivity \{\s*\}/, `public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}`);
    fs.writeFileSync(ma, j);
  }
}
console.log('android project patched');
