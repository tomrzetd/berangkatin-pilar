const CACHE='pilar-hub-v055e';
const ASSETS=['./','index.html','css/app.css','app.js','apps/registry.js','apps/microscope/index.html','apps/rubik-orbit/index.html','core/ownership.js','core/state.js','core/intent.js','core/evidence-engine.js','core/mission-engine.js','core/scoring.js','labs/lorentz/physics.js','labs/lorentz/missions.js','labs/lorentz/engineering.js','input/pointer.js','render/three-engine.js','manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});
