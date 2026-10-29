/* PILAR service worker v0.8.0
   Strategy:
   - Small Hub shell precache for fast startup/offline launcher.
   - App files are cached only after first use (runtime cache).
   - HTML stays network-first so deployments are seen quickly when online.
   - Pinned external libraries/models may use stale-while-revalidate.
*/
const VERSION='081';
const CACHE_PREFIX='pilar-hub-';
const SHELL_CACHE=CACHE_PREFIX+'shell-v'+VERSION;
const RUNTIME_CACHE=CACHE_PREFIX+'runtime-v'+VERSION;

const SHELL_ASSETS=[
  './',
  'index.html',
  'css/hub.css',
  'css/pilar-perf.css',
  'app.js',
  'apps/registry.js',
  'core/device-profile.js',
  'pulse/config.js',
  'core/pulse.js',
  'manifest.webmanifest'
];

const CDN_ALLOW=[
  /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@0\.10\.14\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tensorflow(-models)?\/[a-z-]+@\d+\.\d+\.\d+\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/cubejs@1\.3\.2\//,
  /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/(hand|face)_landmarker\/.+\/float16\/1\//
];

const okToStore=r=>r&&r.ok&&(r.type==='basic'||r.type==='cors');
const shellPaths=new Set(SHELL_ASSETS.filter(x=>x!=='./').map(x=>x.replace(/^\.\//,'')));

function relativePath(url){
  const scope=new URL(self.registration.scope);
  const u=new URL(url);
  if(u.origin!==scope.origin)return '';
  const base=scope.pathname.endsWith('/')?scope.pathname:scope.pathname+'/';
  return u.pathname.startsWith(base)?u.pathname.slice(base.length):'';
}

async function putSafe(cacheName,req,res){
  if(!okToStore(res))return;
  const c=await caches.open(cacheName);
  await c.put(req,res.clone());
}

async function networkFirst(req){
  const rel=relativePath(req.url);
  const target=shellPaths.has(rel)||rel===''?SHELL_CACHE:RUNTIME_CACHE;
  try{
    const r=await fetch(req);
    await putSafe(target,req,r);
    return r;
  }catch(_){
    const runtime=await caches.open(RUNTIME_CACHE);
    const shell=await caches.open(SHELL_CACHE);
    return (await runtime.match(req,{ignoreSearch:true}))
      ||(await shell.match(req,{ignoreSearch:true}))
      ||(await shell.match('./'))
      ||Response.error();
  }
}

async function staleWhileRevalidate(req,cacheName){
  const c=await caches.open(cacheName);
  const hit=await c.match(req);
  const net=fetch(req)
    .then(async r=>{
      if(okToStore(r))await c.put(req,r.clone());
      return r;
    })
    .catch(()=>hit);
  return hit||net;
}

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c=>c.addAll(SHELL_ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(
      keys
        .filter(k=>k.startsWith(CACHE_PREFIX)&&k!==SHELL_CACHE&&k!==RUNTIME_CACHE)
        .map(k=>caches.delete(k))
    ))
  ]));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;

  const u=new URL(req.url);

  if(u.origin===location.origin){
    if(u.pathname.includes('/developer/'))return;

    const isPage=req.mode==='navigate'||req.destination==='document';
    if(isPage){
      e.respondWith(networkFirst(req));
      return;
    }

    const rel=relativePath(req.url);
    const cacheName=shellPaths.has(rel)?SHELL_CACHE:RUNTIME_CACHE;
    e.respondWith(staleWhileRevalidate(req,cacheName));
    return;
  }

  if(CDN_ALLOW.some(rx=>rx.test(req.url))){
    e.respondWith(staleWhileRevalidate(req,RUNTIME_CACHE));
  }
});
