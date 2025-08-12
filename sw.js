const CACHE = 'shubago-pharma-v1';
const ASSETS = ['.','index.html','styles.css','app.js','manifest.json'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(clients.claim()); });
self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{ caches.open(CACHE).then(c=>{ try{ c.put(e.request, res.clone()); }catch(e){} }); return res; } ) ).catch(()=> caches.match('index.html'))); });
