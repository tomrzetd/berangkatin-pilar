#!/usr/bin/env node
/* PILAR native · siapkan bundel web untuk Electron (x86) & Android (Capacitor).
   node native/build-web.mjs [folder-keluaran] [--no-mirror]
   1. Salin situs (tanpa .git, native, dokumen) ke folder keluaran.
   2. Unduh pustaka CDN & model AI ke _cdn/<host>/… → aplikasi jalan OFFLINE di IFP/laptop.
   3. Tulis ulang URL CDN di sumber menjadi /_cdn/…, sisipkan shim native di setiap HTML,
      dan ubah tautan folder ("apps/x/") menjadi "apps/x/index.html" (WebView Android
      tidak otomatis membuka index.html di dalam folder).
   Butuh Node 20+ (fetch bawaan). Supabase (Pulse) sengaja tetap online. */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(ROOT, 'native', 'www'));
const MIRROR = !process.argv.includes('--no-mirror');
const SKIP = new Set(['.git', '.github', 'native', 'node_modules', '.gitignore', 'README.md', 'SECURITY.md']);
const SKIP_RE = [/^PATCH-NOTES/i, /\.md$/i, /^developer\/patch-v2-tests/];
const HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'storage.googleapis.com'];
const KEEP_ONLINE = [/cdn\.jsdelivr\.net\/npm\/@supabase\//];   // butuh internet apa pun yang terjadi
const MP_VERSIONS = ['0.10.14'];   // aplikasi mencoba beberapa versi; cukup satu yang dibundel (hemat ±40 MB)
const MP_FILES = ['+esm', 'vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm', 'wasm/vision_wasm_nosimd_internal.js', 'wasm/vision_wasm_nosimd_internal.wasm'];
const TEXT = /\.(html?|js|mjs|css|json|webmanifest|svg|txt)$/i;

const log = (...a) => console.log('[build-web]', ...a);
async function walk(dir, rel = '') {
  const out = [];
  for (const e of await fs.readdir(dir, {withFileTypes: true})) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (!rel && SKIP.has(e.name)) continue;
    if (SKIP_RE.some(x => x.test(r))) continue;
    if (e.isDirectory()) out.push(...await walk(path.join(dir, e.name), r));
    else out.push(r);
  }
  return out;
}
/* URL CDN → path lokal. "+esm" dan ".mjs" diberi akhiran .js agar MIME-nya benar
   (server lokal Capacitor memilih MIME dari ekstensi, file tanpa titik dianggap rute SPA). */
function localPath(u) {
  const url = new URL(u);
  let p = url.pathname;
  if (p.endsWith('/+esm')) p += '.js';
  p = p.replace(/\.mjs$/, '.js');
  if (p.endsWith('/')) p += 'index';
  return '_cdn/' + url.host + decodeURIComponent(p);
}
function rewriteSource(txt, file) {
  for (const h of HOSTS) {
    const re = new RegExp('https://' + h.replace(/\./g, '\\.') + '/', 'g');
    txt = txt.replace(re, (m, off) => KEEP_ONLINE.some(k => k.test(txt.slice(off, off + 120))) ? m : '/_cdn/' + h + '/');
  }
  // akhiran khusus untuk file yang di-mirror
  txt = txt.replace(/(\/_cdn\/[^'"`\s)]*?)\/\+esm(?=['"`])/g, '$1/+esm.js');
  txt = txt.replace(/vision_bundle\.mjs/g, 'vision_bundle.js');
  if (/\.html?$/i.test(file)) {
    // shim native dimuat paling awal
    if (!txt.includes('/_native/shim.js')) txt = txt.replace(/<head([^>]*)>/i, '<head$1>\n<script src="/_native/shim.js"></script>');
    txt = txt.replace(/href="((?:\.\.\/)+|\.\/)"/g, 'href="$1index.html"');
  }
  txt = txt.replace(/(location\.href\s*=\s*)(['"])((?:\.\.\/)+|\.\/)\2/g, '$1$2$3index.html$2');
  if (file === 'apps/registry.js') txt = txt.replace(/url:'([^']+?)\/'/g, "url:'$1/index.html'");
  return txt;
}
async function download(u, dest) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, {redirect: 'follow'});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      await fs.mkdir(path.dirname(dest), {recursive: true});
      await fs.writeFile(dest, buf);
      return buf;
    } catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 800 * (i + 1))); }
  }
}

const t0 = Date.now();
await fs.rm(OUT, {recursive: true, force: true});
const files = await walk(ROOT);
const found = new Set();
for (const f of files) {
  const src = path.join(ROOT, f), dst = path.join(OUT, f);
  await fs.mkdir(path.dirname(dst), {recursive: true});
  if (!TEXT.test(f)) { await fs.copyFile(src, dst); continue; }
  const txt = await fs.readFile(src, 'utf8');
  for (const m of txt.matchAll(/https:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|storage\.googleapis\.com)\/[^'"`\s)]+/g)) {
    if (!m[0].includes('${') && !KEEP_ONLINE.some(k => k.test(m[0]))) found.add(m[0].replace(/[),;]+$/, ''));
  }
  await fs.writeFile(dst, rewriteSource(txt, f));
}
// ikon tab/aplikasi (WebView meminta /favicon.ico)
await fs.copyFile(path.join(ROOT, 'native', 'icons', 'icon.ico'), path.join(OUT, 'favicon.ico')).catch(() => {});
// shim native
await fs.mkdir(path.join(OUT, '_native'), {recursive: true});
await fs.copyFile(path.join(ROOT, 'native', 'shim.js'), path.join(OUT, '_native', 'shim.js'));

/* ---------- mirror CDN ---------- */
const report = {ok: [], failed: [], bytes: 0};
if (MIRROR) {
  const queue = new Set(found);
  for (const v of MP_VERSIONS) for (const f of MP_FILES) queue.add(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${v}/${f}`);
  // folder dasar tanpa nama berkas (mis. ".../tasks-vision@0.10.14/" atau ".../wasm") bukan file
  for (const u of [...queue]) if (/\/$|\/wasm$|\/mediapipe-models$|@$/.test(u)) queue.delete(u);
  const done = new Set();
  const list = [...queue];
  while (list.length) {
    const u = list.shift();
    if (done.has(u)) continue; done.add(u);
    const dest = path.join(OUT, localPath(u));
    try {
      const buf = await download(u, dest);
      report.ok.push(u); report.bytes += buf.length;
      if (/\.css$/.test(u)) {           // font/ikon yang dirujuk CSS (Font Awesome)
        for (const m of buf.toString('utf8').matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
          if (/^(data:|https?:|#)/.test(m[2])) continue;
          list.push(new URL(m[2].split(/[?#]/)[0], u).href);
        }
      }
      if (/\/\+esm$/.test(u)) {         // modul ESM jsDelivr bisa mengimpor "/npm/…/+esm" lain
        let js = buf.toString('utf8'), changed = false;
        js = js.replace(/(["'])\/npm\/([^"']+)\1/g, (m, q, p) => {
          const dep = 'https://cdn.jsdelivr.net/npm/' + p; list.push(dep); changed = true;
          return q + '/' + localPath(dep) + q;
        });
        if (changed) await fs.writeFile(dest, js);
      }
    } catch (e) { report.failed.push(u + ' — ' + e.message); }
  }
  log(`mirror: ${report.ok.length} berkas, ${(report.bytes / 1048576).toFixed(1)} MB; gagal ${report.failed.length}`);
  report.failed.forEach(x => log('  gagal:', x));
}
await fs.writeFile(path.join(OUT, '_native', 'build.json'), JSON.stringify({builtAt: new Date().toISOString(), mirror: MIRROR, ...report}, null, 1));
log(`selesai: ${files.length} berkas → ${path.relative(ROOT, OUT) || OUT} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
// Gagal keras bila pustaka inti tidak ter-mirror (agar build tidak diam-diam butuh internet)
const must = ['three@0.128.0/build/three.min.js', 'tasks-vision@0.10.14/+esm', 'tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm', 'hand_landmarker.task'];
if (MIRROR) for (const m of must) if (!report.ok.some(u => u.includes(m))) { console.error('[build-web] WAJIB tapi gagal di-mirror:', m); process.exit(1); }
