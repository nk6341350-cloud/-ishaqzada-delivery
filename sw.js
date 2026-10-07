const CACHE='ishaqzada-delivery-v14';
const FILES=['./','./index.html','./styles.css?v=9','./app.js?v=14','./config.js?v=9','./manifest.webmanifest','./logo.jpeg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ishaqzada-delivery-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin||!u.href.startsWith(self.registration.scope))return;if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>caches.match(new URL('./index.html',self.registration.scope).href)));else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});

