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
const adb = (...a) => execFileSync('adb', a, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20});
const sleep = ms => new Promise(r => setTimeout(r, ms));
await fs.mkdir(outDir, {recursive: true});

adb('install', '-r', '-g', apk);
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
await fs.writeFile(path.join(outDir, label + '-hub-screen.png'), execFileSync('adb', ['exec-out', 'screencap', '-p'], {maxBuffer: 64 << 20}));

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
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({id: i, method, params})); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

const reg = await fs.readFile(path.join(www, 'apps/registry.js'), 'utf8');
const pages = [['hub', '/index.html'], ...[...reg.matchAll(/id:'([^']+)'[^}]*?url:'([^']+)'/g)].map(m => [m[1], '/' + m[2]])];
const results = [];
for (const [pid2, p] of pages) {
  cur = {id: pid2, url: p, errors: []};
  await send('Page.navigate', {url: 'https://localhost' + p});
  await sleep(8000);
  const ev = await send('Runtime.evaluate', {returnByValue: true, expression:
    `JSON.stringify({title:document.title,native:window.PILAR_NATIVE&&PILAR_NATIVE.platform,tier:window.PILAR&&PILAR.device&&PILAR.device.tier,
      text:(document.body&&document.body.innerText||'').length,w:innerWidth,h:innerHeight,dpr:devicePixelRatio,
      webgl:!!document.createElement('canvas').getContext('webgl'),href:location.pathname})`});
  try { Object.assign(cur, JSON.parse(ev.result.result.value)); } catch (_) { cur.errors.push('evaluate gagal'); }
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  if (shot.result?.data) await fs.writeFile(path.join(outDir, `${label}-${pid2}.png`), Buffer.from(shot.result.data, 'base64'));
  results.push(cur);
  console.log(`[android-smoke] ${cur.errors.length ? '✗' : '✓'} ${label}/${pid2} "${cur.title}" ${cur.w}x${cur.h}@${cur.dpr} tier=${cur.tier} native=${cur.native} teks=${cur.text}` +
    (cur.errors.length ? '\n   ' + cur.errors.slice(0, 8).join('\n   ') : ''));
}
cur = null; ws.close();
const crash = adb('logcat', '-d', '-b', 'crash');
await fs.writeFile(path.join(outDir, label + '-report.json'), JSON.stringify({info, results, crash}, null, 1));
console.log(`[android-smoke] ${label}: ${results.filter(r => !r.errors.length).length}/${results.length} halaman bersih; crash log ${crash.trim() ? 'ADA' : 'kosong'}`);
if (crash.includes(PKG)) { console.error(crash); process.exit(1); }
