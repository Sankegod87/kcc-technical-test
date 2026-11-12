// KCC Technical service worker.
// Bump CACHE_VERSION on every deploy so every device drops old files.
const CACHE_VERSION = '2027-01-v29';
const SHELL_CACHE = 'kcc-shell-' + CACHE_VERSION;
const LIB_CACHE = 'kcc-libs-v1'; // third-party scripts and fonts, kept between deploys

const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/00-offline-sync.js',
  'js/01-core.js',
  'js/02-login.js',
  'js/03-permissions.js',
  'js/04-dashboard.js',
  'js/05-fixtures.js',
  'js/06-inventory.js',
  'js/07-crew.js',
  'js/08-settings.js',
  'js/09-shared-ui.js',
  'js/10-scan-import.js',
  'js/11-schedule.js',
  'js/12-admin-ops.js',
  'js/13-changelog.js',
  'js/14-checklist-nfc.js',
  'js/15-availability-email.js',
  'js/16-fixture-map.js',
  'js/17-gear-training.js',
  'js/18-sidebar.js',
  'js/19-pwa.js',
  'js/20-icons.js',
  'js/21-vmix.js',
  'js/22-server.js',
  'js/23-propresenter.js',
  'js/24-settings-nav.js',
  'js/25-golive.js',
  'js/26-connections.js',
  'js/27-qr-gear.js',
  'js/28-bridge.js',
  'js/29-summary.js',
  'js/30-training-plus.js',
  'js/31-starter-training.js',
  'js/32-training-record.js',
  'js/33-station-manuals.js',
  'js/34-restricted-stations.js',
  'js/35-practical-sheet.js',
  'js/36-service-times.js',
  'js/37-launch.js',
  'beta-guard.js',
  'kcc-schema.js',
  'js/vendor/emailjs-browser-4.4.1.min.js',
  'js/vendor/html5-qrcode-2.3.8.min.js',
  'js/vendor/qrcodejs-1.0.0.min.js',
  'js/vendor/xlsx-0.18.5.full.min.js',
  'icon-192.png',
  'icon-512.png'
];

// Hosts whose files are safe to keep for offline use. Firestore and YouTube API calls are never cached.
const LIB_HOSTS = [
  'www.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      // One missing file must not block the whole install.
      Promise.all(SHELL.map(path => cache.add(path).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== SHELL_CACHE && k !== LIB_CACHE)
        .map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Our own files: network first so a deploy shows up immediately; cache when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then(hit =>
            hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)
          )
        )
    );
    return;
  }

  // Libraries and fonts: cached copy first, refreshed in the background.
  if (LIB_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(LIB_CACHE).then(cache =>
        cache.match(req).then(hit => {
          const fresh = fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || fresh;
        })
      )
    );
  }
  // Everything else (Firestore, YouTube, EmailJS) goes straight to the network.
});
