const CACHE='pilar-hub-v061-soundscope451-adaptive'
const ASSETS=["./","index.html","css/app.css","app.js","apps/registry.js","apps/microscope/index.html","apps/microscope/firmware/ESP32_Microscope_Controller.ino","apps/rubik-orbit/index.html","apps/mbg-duel/index.html","apps/soundscope/index.html","apps/soundscope/morse-link.css","apps/soundscope/morse-link.js","apps/soundscope/fsk-core.js","apps/soundscope/acoustic-core.js","apps/soundscope/acoustic-dsp-worker.js","apps/soundscope/acoustic-engine.js","apps/soundscope/acoustic-capture-worklet.js","apps/soundscope/acoustic-physics.js","apps/soundscope/acoustic-physics.css","apps/pak-taro/index.html","apps/air-writing/index.html","apps/puzzlesnap/index.html","apps/lorentz-lab/index.html","pulse/config.js","core/pulse.js","core/ownership.js","core/state.js","core/intent.js","core/evidence-engine.js","core/mission-engine.js","core/scoring.js","labs/lorentz/physics.js","labs/lorentz/missions.js","labs/lorentz/engineering.js","input/pointer.js","render/three-engine.js","manifest.webmanifest"];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});
