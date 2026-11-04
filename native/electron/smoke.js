/* Uji asap (CI): buka Hub + setiap aplikasi TANPA internet, catat error konsol, simpan tangkapan layar.
   Jalankan: PILAR_SMOKE=1 PILAR_SMOKE_OUT=folder electron . */
'use strict';
const {app, session} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function smoke(createWindow, ORIGIN, WWW) {
  const out = path.resolve(process.env.PILAR_SMOKE_OUT || 'smoke-out');
  fs.mkdirSync(out, {recursive: true});
  const reg = fs.readFileSync(path.join(WWW, 'apps', 'registry.js'), 'utf8');
  const pages = [['hub', '/index.html'], ...[...reg.matchAll(/id:'([^']+)'[^}]*?url:'([^']+)'/g)].map(m => [m[1], '/' + m[2]])];
  const blocked = new Set();
  session.defaultSession.webRequest.onBeforeRequest({urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*']}, (d, cb) => {
    blocked.add(d.url.split('?')[0]); cb({cancel: true});
  });
  const win = createWindow();
  win.setSize(1366, 768);
  const wc = win.webContents;
  let cur = null;
  wc.on('console-message', (e, level, message, line, source) => {
    const lvl = e && e.level !== undefined ? e.level : level, msg = e && e.message !== undefined ? e.message : message;
    const src = e && e.sourceId !== undefined ? e.sourceId : source, ln = e && e.lineNumber !== undefined ? e.lineNumber : line;
    if (cur && (lvl === 3 || lvl === 'error')) cur.errors.push(String(msg).slice(0, 300) + ' @' + String(src || '').replace(ORIGIN, '') + ':' + ln);
  });
  wc.on('render-process-gone', (e, d) => { if (cur) cur.errors.push('RENDERER GONE: ' + d.reason); });
  wc.on('did-fail-load', (e, code, desc, url, main) => { if (cur && main) cur.errors.push('LOAD FAIL ' + code + ' ' + desc + ' ' + url); });
  const results = [];
  for (const [id, p] of pages) {
    cur = {id, url: p, errors: []};
    const t = Date.now();
    try { await wc.loadURL(ORIGIN + p); } catch (e) { cur.errors.push('loadURL: ' + e.message); }
    await new Promise(r => setTimeout(r, 6000));
    try {
      cur.title = await wc.executeJavaScript('document.title');
      cur.native = await wc.executeJavaScript('window.PILAR_NATIVE&&PILAR_NATIVE.platform');
      cur.bodyText = (await wc.executeJavaScript('(document.body&&document.body.innerText||"").length'));
      const img = await wc.capturePage();
      fs.writeFileSync(path.join(out, id + '.png'), img.toPNG());
    } catch (e) { cur.errors.push('inspect: ' + e.message); }
    cur.ms = Date.now() - t;
    results.push(cur);
    console.log(`[smoke] ${cur.errors.length ? '✗' : '✓'} ${id} (${cur.title || '-'}) native=${cur.native} teks=${cur.bodyText}${cur.errors.length ? '\n   ' + cur.errors.slice(0, 8).join('\n   ') : ''}`);
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
  cur = {id: 'deep', errors: []};
  await wc.loadURL(ORIGIN + '/index.html'); await new Promise(r => setTimeout(r, 4000));
  const deepRes = await wc.executeJavaScript(DEEP).catch(e => 'GAGAL ' + e.message);
  console.log('[smoke] uji mendalam offline:', deepRes);
  cur.deep = deepRes; if (/GAGAL/.test(deepRes)) cur.errors.push(deepRes);
  if (cur.errors.length) console.log('[smoke] catatan konsol uji mendalam:\n   ' + cur.errors.slice(0, 6).join('\n   '));
  results.push(cur); cur = null;
  const rep = {when: new Date().toISOString(), electron: process.versions.electron, chrome: process.versions.chrome, results, blockedNetwork: [...blocked]};
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(rep, null, 1));
  console.log('[smoke] jaringan yang diblokir (harus hanya layanan online seperti Supabase/model ML):\n   ' + [...blocked].join('\n   '));
  console.log(`[smoke] selesai: ${results.filter(r => !r.errors.length).length}/${results.length} halaman bersih`);
  app.exit(0);
};
