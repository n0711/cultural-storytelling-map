const CACHE='narrify-public-v1';
const PUBLIC_FILES=['/offline.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/favicon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('narrify-public-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Never intercept identity, billing, submissions or story API responses.
 if(url.pathname.startsWith('/api/')||['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(url.pathname))return;
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/app')){
  // Personalized online pages are network-only; failures use public static text.
  event.respondWith(fetch(request).catch(()=>caches.match('/offline.html').then(response=>response||new Response('Offline. Reconnect to open Narrify.',{status:503}))));return;
 }
 if(PUBLIC_FILES.includes(url.pathname))event.respondWith(caches.match(request).then(response=>response||fetch(request)));
});
