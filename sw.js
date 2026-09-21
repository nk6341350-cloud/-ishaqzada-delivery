const STATIC_CACHE='ifc-static-v19';
const PHOTO_CACHE='ifc-photos-v1';
const STATIC_FILES=['./','./index.html','./styles.css?v=19','./app.js?v=19','./manifest.webmanifest','./logo.jpeg','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(STATIC_FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ifc-static-')&&key!==STATIC_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(url.hostname.endsWith('.supabase.co')&&url.pathname.includes('/storage/v1/object/')){
    event.respondWith(caches.open(PHOTO_CACHE).then(async cache=>{
      const cached=await cache.match(request);
      if(cached)return cached;
      const response=await fetch(request);
      if(response.ok||response.type==='opaque'){
        await cache.put(request,response.clone());
        const keys=await cache.keys();
        if(keys.length>100)await Promise.all(keys.slice(0,keys.length-100).map(key=>cache.delete(key)));
      }
      return response;
    }));
    return;
  }

  if(url.origin===self.location.origin){
    if(request.mode==='navigate'){
      event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(STATIC_CACHE).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html')));
      return;
    }
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(STATIC_CACHE).then(cache=>cache.put(request,response.clone()));return response})));
  }
});
