# PILAR · Patch audit Oktober 2026

Patch ini menindaklanjuti audit menyeluruh (keamanan, IFP/MPI, fisika, 3D). Semua tes lama tetap lulus.

## Cara menerapkan
```bash
git apply pilar-audit-2026-10.patch   # dari root repo
node labs/pressure/test/fps-independence.test.js
```
Lalu di Supabase SQL Editor jalankan `pulse/migrations/003_hardening.sql`
dan **daftarkan UUID akun developer** ke `pilar_admins` (contoh perintah ada di file).

## Isi patch
| Area | File | Perubahan |
|---|---|---|
| Keamanan DB | `pulse/migrations/003_hardening.sql` | admin via allowlist UUID (bukan klaim email), batas ukuran kolom, rate-limit event/chat, public_id tak bisa dipalsukan, retensi 90 hari |
| Sandbox kode siswa | `apps/pak-taro/index.html` | Worker kini di dalam iframe `sandbox` (origin `null`): tak bisa menyentuh Cache Storage, localStorage, sesi Supabase |
| Service worker | `service-worker.js` | HTML network-first, aset stale-while-revalidate, hanya simpan respons 200, CDN berversi saja, `/developer/` tak di-cache |
| Supply chain | `vendor/three/r128/three.min.js`, `core/pulse.js`, `developer/dashboard.js` | Three.js r128 di-vendor (offline & tanpa CDN), supabase-js dipin `2.45.4` |
| Hub | `index.html` | hapus teks `\n` yang tampil di layar; Three.js tidak lagi dimuat di Hub (shell Lorentz lama tak terpakai) |
| Fisika | `labs/pressure/physics.js`, `labs/lorentz/physics.js`, `apps/lorentz-lab/index.html` | sub-langkah tetap (1/240 s drone, 1/480 s Lorentz) → hasil identik di 15–60 fps; GGL balik (Lenz) + hambatan udara di Lorentz |
| Loop | `apps/pressure/app.js`, `apps/lorentz-lab/index.html` | batas dt 0,1 s (tidak slow-motion saat fps turun) + resolusi dinamis |
| Render | `apps/pressure/stage.js`, `core/device-profile.js` | profil perangkat (IFP Mali/laptop/HP), anggaran piksel ±1080p di IFP, PCF biasa di Mali, IBL prosedural (logam tak lagi hitam), resolusi dinamis 0,6–1×, tolak telapak tangan, pan 2 jari |
| Tata letak | `core/fit-stage.js`, `css/pilar-fit.css`, `apps/pressure/pressure.css` | kanvas logis 1280×640 diskalakan: tata letak identik IFP/laptop/HP, teks 1,5× lebih besar di IFP, layar "putar HP" di portrait |
| CI | `.github/workflows/pm-v2-verify.yml`, `labs/pressure/test/fps-independence.test.js` | semua tes fisika & DSP ikut dijalankan |

Fit-stage & device-profile baru dipasang di **Lab Maya Tekanan** sebagai percontohan; pasang dua baris `<script>` + satu `<link>` yang sama di app lain.
