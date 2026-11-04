#!/usr/bin/env node
/* Uji asap APK di emulator Android (CI).
   node ci-smoke.mjs <apk> <www> <folder-keluaran> <label>
   Memasang APK, memberi izin kamera/mikrofon, membuka Hub lalu setiap aplikasi lewat
   Chrome DevTools Protocol (WebView debug), mencatat error JS & tangkapan layar. */
import {execFileSync} from 'node:child_process';
import {promises as fs} from 'node:fs';
import path from 'node:path';

const [apk, www, outDir = 'android-smoke', label = 'device'] = process.argv.slice(2);
const PKG = 'id.berangkatin.pilarhub';
const adb = (...a) => execFileSync('adb', a, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20, timeout: 180000});
console.log('[android-smoke] mulai', new Date().toISOString());
const sleep = ms => new Promise(r => setTimeout(r, ms));
await fs.mkdir(outDir, {recursive: true});

adb('wait-for-device'); console.log('[android-smoke] pasang APK…'); adb('install', '-r', '-g', apk); console.log('[android-smoke] APK terpasang');
for (const p of ['CAMERA', 'RECORD_AUDIO']) try { adb('shell', 'pm', 'grant', PKG, 'android.permission.' + p); } catch (_) {}
// Uji OFFLINE: matikan jaringan emulator — semua pustaka harus berasal dari APK
for (const c of [['svc', 'wifi', 'disable'], ['svc', 'data', 'disable']]) try { adb('shell', ...c); } catch (_) {}
adb('logcat', '-c');
adb('shell', 'am', 'start', '-W', '-n', PKG + '/.MainActivity');
await sleep(9000);
const info = {
  label,
  webview: adb('shell', 'dumpsys', 'package', 'com.google.android.webview').match(/versionName=(\S+)/)?.[1] || '?',
  size: adb('shell', 'wm', 'size').trim(), density: adb('shell', 'wm', 'density').trim(),
  orientation: (adb('shell', 'dumpsys', 'input').match(/SurfaceOrientation:\s*(\d)/) || [])[1]
};
console.log('[android-smoke]', JSON.stringify(info));
await fs.writeFile(path.join(outDir, label + '-hub-screen.png'), execFileSync('adb', ['exec-out', 'screencap', '-p'], {maxBuffer: 64 << 20, timeout: 60000}));

const pid = adb('shell', 'pidof', PKG).trim().split(/\s+/)[0];
adb('forward', 'tcp:9333', 'localabstract:webview_devtools_remote_' + pid);
let target;
for (let i = 0; i < 20 && !target; i++) {
  try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(t => t.type === 'page'); } catch (_) {}
  if (!target) await sleep(1000);
}
if (!target) { console.error('[android-smoke] WebView tidak bisa didebug'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map(); let cur = null;
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pend.has(msg.id)) { pend.get(msg.id)(msg); pend.delete(msg.id); return; }
  if (!cur) return;
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    cur.errors.push('EXC ' + (d.exception?.description || d.text || '').split('\n')[0].slice(0, 260) + ' @' + (d.url || '').replace('https://localhost', '') + ':' + d.lineNumber);
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    cur.errors.push('console.error ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 260));
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    cur.errors.push('log ' + msg.params.entry.text.slice(0, 200) + ' ' + (msg.params.entry.url || '').replace('https://localhost', ''));
  }
};
let wsClosed = false;
ws.onclose = () => { wsClosed = true; if (cur) console.log('[android-smoke] koneksi DevTools terputus (WebView/ aplikasi mungkin crash)'); pend.forEach(r => r({error: 'closed'})); pend.clear(); };
const send = (method, params = {}, ms = 45000) => new Promise(res => {
  if (wsClosed) return res({error: 'closed'});
  const i = ++id; const t = setTimeout(() => { pend.delete(i); res({error: 'timeout ' + method}); }, ms);
  pend.set(i, m => { clearTimeout(t); res(m); }); ws.send(JSON.stringify({id: i, method, params}));
});
function dumpLogs(tag) {
  try { console.log('--- logcat crash (' + tag + ') ---\n' + adb('logcat', '-d', '-b', 'crash').slice(-6000)); } catch (_) {}
  try { console.log('--- logcat chromium/ActivityManager ---\n' + adb('logcat', '-d', '-t', '400').split('\n').filter(l => /chromium|cr_|ActivityManager|lowmemorykiller|FATAL|AndroidRuntime|pilarhub/i.test(l)).slice(-80).join('\n')); } catch (e) { console.log('logcat gagal', e.message); }
}
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

const reg = await fs.readFile(path.join(www, 'apps/registry.js'), 'utf8');
const pages = [['hub', '/index.html'], ...[...reg.matchAll(/id:'([^']+)'[^}]*?url:'([^']+)'/g)].map(m => [m[1], '/' + m[2]])];
const results = [];
for (const [pid2, p] of pages) {
  cur = {id: pid2, url: p, errors: []};
  const nav = await send('Page.navigate', {url: 'https://localhost' + p});
  if (nav.error) { cur.errors.push('navigate: ' + nav.error); results.push(cur); dumpLogs(pid2); console.log(`[android-smoke] ✗ ${label}/${pid2} ${nav.error}`); break; }
  await sleep(8000);
  const ev = await send('Runtime.evaluate', {returnByValue: true, expression:
    `JSON.stringify({title:document.title,native:window.PILAR_NATIVE&&PILAR_NATIVE.platform,tier:window.PILAR&&PILAR.device&&PILAR.device.tier,
      text:(document.body&&document.body.innerText||'').length,w:innerWidth,h:innerHeight,dpr:devicePixelRatio,
      webgl:!!document.createElement('canvas').getContext('webgl'),href:location.pathname})`});
  try { Object.assign(cur, JSON.parse(ev.result.result.value)); } catch (_) { cur.errors.push('evaluate gagal ' + (ev.error || '')); if (ev.error) { results.push(cur); dumpLogs(pid2); break; } }
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  if (shot.result?.data) await fs.writeFile(path.join(outDir, `${label}-${pid2}.png`), Buffer.from(shot.result.data, 'base64'));
  results.push(cur);
  console.log(`[android-smoke] ${cur.errors.length ? '✗' : '✓'} ${label}/${pid2} "${cur.title}" ${cur.w}x${cur.h}@${cur.dpr} tier=${cur.tier} native=${cur.native} teks=${cur.text}` +
    (cur.errors.length ? '\n   ' + cur.errors.slice(0, 8).join('\n   ') : ''));
}

/* Uji mendalam OFFLINE: AI MediaPipe (model tangan dari APK), three.js, TF.js */
const DEEP = `(async()=>{const r={};const t0=performance.now();
 try{const v=await import('/_cdn/cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm.js');
  const fs=await v.FilesetResolver.forVisionTasks('/_cdn/cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  const h=await v.HandLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:'/_cdn/storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',numHands:1});
  const c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').fillRect(0,0,99,99);h.detect(c);r.mediapipe='ok '+Math.round(performance.now()-t0)+'ms';h.close()}catch(e){r.mediapipe='GAGAL '+e}
 try{await new Promise((ok,no)=>{const s=document.createElement('script');s.src='/_cdn/cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  const rd=new THREE.WebGLRenderer();rd.setSize(64,64);rd.render(new THREE.Scene(),new THREE.PerspectiveCamera());r.three='ok r'+THREE.REVISION+' '+rd.getContext().getParameter(rd.getContext().VERSION);rd.dispose()}catch(e){r.three='GAGAL '+e}
 try{await new Promise((ok,no)=>{const s=document.createElement('script');s.src='/_cdn/cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  await tf.ready();r.tfjs='ok '+tf.getBackend()+' '+tf.tensor([1,2,3]).sum().dataSync()[0]}catch(e){r.tfjs='GAGAL '+e}
 try{const fa=await fetch('/_cdn/cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2');r.fontawesome=fa.ok?'ok':'GAGAL '+fa.status}catch(e){r.fontawesome='GAGAL '+e}
 return JSON.stringify(r)})()`;
const deepCur = {id: 'deep', errors: []}; cur = deepCur;
if (!wsClosed) { await send('Page.navigate', {url: 'https://localhost/index.html'}); await sleep(5000); }
const deep = wsClosed ? {error: 'closed'} : await send('Runtime.evaluate', {expression: DEEP, awaitPromise: true, returnByValue: true, timeout: 120000}, 150000);
const deepRes = deep.result?.result?.value || ('GAGAL ' + JSON.stringify(deep.result?.exceptionDetails || deep).slice(0, 400));
console.log('[android-smoke] uji mendalam offline:', deepRes);
deepCur.deep = deepRes; if (/GAGAL/.test(deepRes)) deepCur.errors.push(deepRes);
if (deepCur.errors.length) console.log('[android-smoke] catatan konsol uji mendalam:\n   ' + deepCur.errors.slice(0, 6).join('\n   '));
// pesan konsol MediaPipe/TF saat uji mendalam bersifat info, bukan kegagalan halaman
deepCur.errors = deepCur.errors.filter(e => /GAGAL/.test(e));
results.push(deepCur);
cur = null; ws.close();
const crash = adb('logcat', '-d', '-b', 'crash');
await fs.writeFile(path.join(outDir, label + '-report.json'), JSON.stringify({info, results, crash}, null, 1));
console.log(`[android-smoke] ${label}: ${results.filter(r => !r.errors.length).length}/${results.length} halaman bersih; crash log ${crash.trim() ? 'ADA' : 'kosong'}`);
if (crash.includes(PKG)) { console.error(crash); process.exit(1); }
if (results.length < pages.length + 1 || results.some(r => r.errors.some(e => !/favicon/.test(e)))) { console.error('[android-smoke] ada halaman bermasalah'); process.exit(1); }
process.exit(0);
