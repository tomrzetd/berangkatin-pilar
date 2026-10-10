/* PILAR service worker v0.7
   - HTML: network-first (konten selalu terbaru saat online), fallback cache saat offline.
   - Aset statis & library CDN yang DIPIN versinya: stale-while-revalidate (cepat + offline).
   - Hanya respons sukses (200, basic/cors) yang disimpan → cache tidak bisa "diracuni" oleh 404/500/opaque.
   - Library CDN tanpa versi pasti TIDAK disimpan. */
const CACHE='pilar-hub-v070';
const ASSETS=["./", "index.html", "css/app.css", "app.js", "apps/registry.js", "apps/microscope/index.html", "apps/rubik-orbit/index.html", "apps/mbg-duel/index.html", "apps/soundscope/index.html", "apps/soundscope/morse-link.css", "apps/soundscope/morse-link.js", "apps/soundscope/fsk-core.js", "apps/soundscope/acoustic-core.js", "apps/soundscope/acoustic-dsp-worker.js", "apps/soundscope/acoustic-engine.js", "apps/soundscope/acoustic-capture-worklet.js", "apps/soundscope/acoustic-physics.js", "apps/soundscope/acoustic-physics.css", "apps/pak-taro/index.html", "apps/air-writing/index.html", "apps/puzzlesnap/index.html", "apps/lorentz-lab/index.html", "apps/pressure/index.html", "apps/pressure/pressure.css", "apps/pressure/stage.js", "apps/pressure/lab-solid.js", "apps/pressure/lab-fluid.js", "apps/pressure/lab-pascal.js", "apps/pressure/lab-drone.js", "apps/pressure/app.js", "apps/bioweb/index.html", "apps/bioweb/bioweb.css", "apps/bioweb/ecosystem.js", "apps/bioweb/app.js", "labs/pressure/physics.js", "pulse/config.js", "core/pulse.js", "core/ownership.js", "core/state.js", "core/intent.js", "core/evidence-engine.js", "core/mission-engine.js", "core/scoring.js", "labs/lorentz/physics.js", "labs/lorentz/missions.js", "labs/lorentz/engineering.js", "input/pointer.js", "render/three-engine.js", "manifest.webmanifest", "core/device-profile.js", "core/fit-stage.js", "css/pilar-fit.css", "vendor/three/r128/three.min.js", "apps/pak-taro/sandbox.html"];
const CDN_ALLOW=[
  /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@0\.10\.14\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow(-models)?\/[a-z-]+@\d+\.\d+\.\d+\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/cubejs@1\.3\.2\//,
  /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/(hand|face)_landmarker\/.+\/float16\/1\//
];
const okToStore=r=>r&&r.ok&&(r.type==='basic'||r.type==='cors');
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(ASSETS.map(a=>c.add(a)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pilar-hub-')&&k!==CACHE).map(k=>caches.delete(k))))])));
async function networkFirst(req){
  const c=await caches.open(CACHE);
  try{const r=await fetch(req);if(okToStore(r))c.put(req,r.clone());return r}
  catch(_){return (await c.match(req,{ignoreSearch:true}))||(await c.match('./'))||Response.error()}
}
async function staleWhileRevalidate(req){
  const c=await caches.open(CACHE),hit=await c.match(req);
  const net=fetch(req).then(r=>{if(okToStore(r))c.put(req,r.clone());return r}).catch(()=>hit);
  return hit||net;
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin===location.origin){
    if(u.pathname.includes('/developer/'))return;            // konsol developer: jangan pernah di-cache
    const isPage=req.mode==='navigate'||req.destination==='document';
    e.respondWith(isPage?networkFirst(req):staleWhileRevalidate(req));return;
  }
  if(CDN_ALLOW.some(rx=>rx.test(req.url)))e.respondWith(staleWhileRevalidate(req));
});
