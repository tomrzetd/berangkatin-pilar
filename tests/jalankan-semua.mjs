// Jalankan SEMUA uji PILAR sekaligus:  node tests/jalankan-semua.mjs
// Tidak butuh npm install. Dipakai juga oleh GitHub Actions (.github/workflows/pm-v2-verify.yml).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const uji = [
  ['Struktur Hub & cache', 'tests/verify-hub.js', '.'],
  ['Alur Lab Tekanan', 'tests/test_pressure.js', '.'],
  ['Alur Gaya Lorentz', 'tests/test_lorentz.js', '.'],
  ['Fisika Lab Tekanan', 'labs/pressure/test/physics.test.js'],
  ['Fisika tak bergantung FPS', 'labs/pressure/test/fps-independence.test.js'],
  ['Adegan Lab Tekanan', 'labs/pressure/test/smoke-scenes.js'],
];
for (const d of readdirSync(path.join(ROOT, 'apps'))) {           // uji milik tiap aplikasi
  const dir = path.join(ROOT, 'apps', d); if (!existsSync(dir) || d.startsWith('_') || d.endsWith('.js')) continue;
  for (const f of readdirSync(dir)) if (/^test-.*\.js$/.test(f)) uji.push([`${d} · ${f}`, `apps/${d}/${f}`]);
  if (existsSync(path.join(dir, 'test'))) for (const f of readdirSync(path.join(dir, 'test'))) if (/\.test\.js$/.test(f)) uji.push([`${d} · ${f}`, `apps/${d}/test/${f}`]);
}
let gagal = 0;
for (const [nama, file, ...args] of uji) {
  const r = spawnSync(process.execPath, [file, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const ok = r.status === 0, ekor = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop();
  console.log(`${ok ? '✔' : '✘'} ${nama}${ekor ? '  —  ' + ekor.slice(0, 110) : ''}`);
  if (!ok) { gagal++; console.log((r.stdout || '') + (r.stderr || '')); }
}
console.log(`\n${uji.length - gagal}/${uji.length} kelompok uji lulus`); process.exit(gagal ? 1 : 0);
