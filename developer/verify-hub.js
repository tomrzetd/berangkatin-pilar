/* PILAR Hub structural verification.
   Zero dependencies: intended for GitHub Actions and local Node 20+. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(process.argv[2] || '.');
const errors = [];
const notes = [];

function read(rel){
  const p = path.join(root, rel);
  if(!fs.existsSync(p)){
    errors.push('Missing file: ' + rel);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function localPath(baseFile, ref){
  const clean = String(ref || '').split('#')[0].split('?')[0];
  if(!clean || /^(?:https?:|data:|blob:|javascript:|mailto:|tel:|#)/i.test(clean)) return null;
  if(clean.startsWith('/')) return null;
  const baseDir = path.posix.dirname(baseFile);
  let resolved = path.posix.normalize(path.posix.join(baseDir, clean));
  if(resolved.endsWith('/')) resolved += 'index.html';
  return resolved.replace(/^\.\//, '');
}

const index = read('index.html');
const appJs = read('app.js');
const registryJs = read('apps/registry.js');
const sw = read('service-worker.js');
const manifestText = read('manifest.webmanifest');

if(index){
  const ids = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  const seen = new Set();
  const dupes = [...new Set(ids.filter(id => seen.has(id) || !seen.add(id)))];
  if(dupes.length) errors.push('Duplicate HTML ids: ' + dupes.join(', '));

  if(/id=["']appShell["']/.test(index)) errors.push('Legacy #appShell still exists in root index.html');
  if(/labs\/lorentz|render\/three-engine|core\/state\.js|core\/intent\.js|core\/evidence-engine\.js/.test(index)){
    errors.push('Legacy Lorentz runtime scripts are still loaded by root index.html');
  }

  const refs = [...index.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(m => m[1]);
  for(const ref of refs){
    const rel = localPath('index.html', ref);
    if(rel && !exists(rel) && !exists(path.posix.join(rel, 'index.html'))){
      errors.push('Broken root asset reference: ' + ref + ' -> ' + rel);
    }
  }
}

try{ new vm.Script(appJs, {filename:'app.js'}); }
catch(e){ errors.push('app.js syntax error: ' + e.message); }

let registry = [];
try{
  const sandbox = {window:{}};
  vm.runInNewContext(registryJs, sandbox, {filename:'apps/registry.js'});
  registry = sandbox.window.PILAR_APP_REGISTRY;
  if(!Array.isArray(registry)) throw new Error('PILAR_APP_REGISTRY is not an array');
}catch(e){ errors.push('registry parse error: ' + e.message); }

if(Array.isArray(registry)){
  const ids = new Set();
  for(const item of registry){
    if(!item || !item.id || !item.title || !item.url) {
      errors.push('Registry item missing id/title/url: ' + JSON.stringify(item));
      continue;
    }
    if(ids.has(item.id)) errors.push('Duplicate registry id: ' + item.id);
    ids.add(item.id);
    const rel = String(item.url).replace(/^\.\//, '').replace(/\/$/, '/index.html');
    if(!exists(rel)) errors.push('Registry target missing for ' + item.id + ': ' + rel);
  }
  notes.push('Registry apps: ' + registry.length);
}

let shellAssets = [];
try{
  const m = sw.match(/const SHELL_ASSETS\s*=\s*(\[[\s\S]*?\]);/);
  if(!m) throw new Error('SHELL_ASSETS not found');
  shellAssets = vm.runInNewContext(m[1]);
  if(!Array.isArray(shellAssets)) throw new Error('SHELL_ASSETS is not an array');
}catch(e){ errors.push('service-worker shell parse error: ' + e.message); }

for(const asset of shellAssets){
  if(asset === './') continue;
  const rel = String(asset).replace(/^\.\//, '').replace(/\/$/, '/index.html');
  if(!exists(rel)) errors.push('Service worker shell asset missing: ' + rel);
}
if(sw.includes('apps/pak-taro/sandbox.html')) errors.push('Stale Pak Taro sandbox.html remains in service worker');
notes.push('Shell precache assets: ' + shellAssets.length);

try{
  const manifest = JSON.parse(manifestText);
  for(const key of ['name','short_name','start_url','display','background_color','theme_color']){
    if(!manifest[key]) errors.push('Manifest missing field: ' + key);
  }
}catch(e){ errors.push('manifest.webmanifest JSON error: ' + e.message); }

if(!index.includes('PILAR Hub v0.8.0')) errors.push('Root title/version is not PILAR Hub v0.8.0');
if(!index.includes('Launcher · v0.8.0')) errors.push('Launcher visible version is not v0.8.0');
if(!index.includes('Runtime v0.8.0')) errors.push('Runtime visible version is not v0.8.0');
if(!manifestText.includes('PILAR Hub v0.8.0')) errors.push('Manifest version/name is not v0.8.0');

for(const note of notes) console.log('✓ ' + note);
if(errors.length){
  console.error('\nPILAR Hub verification failed:');
  for(const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('✓ PILAR Hub structure verified');
