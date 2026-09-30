const CACHE='pilar-lorentz-v05';
const ASSETS=['./','index.html','css/app.css','app.js','core/state.js','core/intent.js','core/evidence-engine.js','core/mission-engine.js','core/scoring.js','labs/lorentz/physics.js','labs/lorentz/missions.js','labs/lorentz/engineering.js','input/pointer.js','input/vision-adapter.js','render/three-engine.js','manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
