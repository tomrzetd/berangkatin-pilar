# PILAR Lorentz v0.5.5 — Universal Boot + Realistic Laboratory Rig

PILAR memakai alur **Lihat → Tebak → Coba → AHA → Buktikan → Rekayasa**. Seri ini berfokus pada eksplorasi gaya Lorentz tingkat SMP dan jembatannya menuju rekayasa aktuator.


## Perubahan v0.5.5
- **PILAR Universal Boot Shell**: intro/loader baru untuk keluarga simulasi, game, dan tools dengan capability probe, progress subsistem, serta jalur **Masuk Cepat** dan **Vision AI**.
- **Vision AI benar-benar opsional**: `input/vision-adapter.js` tidak lagi dimuat dari HTML maupun precache PWA. Adapter baru diambil secara dinamis setelah pengguna memilih Vision AI.
- **Rig Lorentz realistis**: statif baja, clamp, eyelet, kawat aktif tembaga, tali penggantung non-konduktif, terminal, knife switch, holder baterai, magnet U/C dengan yoke melengkung, pedestal, dan material procedural.
- **Jalur listrik terpisah dari tali**: kabel fleksibel merah/hitam mengikuti jalur konduktif tersendiri; visualisasi arus tidak pernah menggunakan tali penggantung.
- **Cable management**: kabel supply dirutekan di sisi luar magnet dan sepanjang meja memakai clip sehingga tidak tertimpa/menembus magnet, statif, atau komponen lain.
- Cache PWA dinaikkan ke `pilar-lorentz-v055`.

## Perubahan v0.5.4
- **Rig fix**: geometri magnet dan batas mekanik ayunan diselaraskan agar kawat aktif bergerak di **celah magnet**, bukan menembus badan kutub.
- Physics 1-DOF membatasi ayunan maksimum sekitar **50°** sesuai clearance rig visual.
- **Material procedural PBR ringan** untuk meja/kayu, statif logam, magnet bercat dan tergores, kawat tembaga, tali serat, kabel karet, holder plastik, dan baterai 18650 bekas/reclaimed.
- **Realtime lighting + soft shadow** dengan tiga preset kualitas: Hemat, Standar, Realistis.
- Baterai 18650 memiliki sleeve procedural dengan goresan/aus dan fingerprint build kecil.
- Tali dan kabel kini berupa mesh 3D dengan material, bump, lighting, dan shadow, bukan sekadar garis datar.
- Animasi arus tetap memiliki kontrol kecepatan + rewind tanpa mereset physics/evidence.
- **Ownership mark 3 lapis**: watermark visual runtime, fingerprint build, dan signature di metadata scene. Alamat pemilik tidak ditulis sebagai string utuh di HTML.
- Cache PWA dinaikkan ke `pilar-lorentz-v052` agar GitHub Pages tidak terus menyajikan build lama.

## Penting tentang ownership mark
Obfuscation di aplikasi client-side **bukan proteksi kriptografis**. Pengguna teknis tetap dapat menganalisis JavaScript. Tujuannya adalah attribution + fingerprinting yang tidak tampil sebagai string email polos di HTML, bukan DRM.

## Menjalankan
GitHub Pages: unggah seluruh isi folder ini ke root repository/branch Pages.

Tes lokal:
```bash
python -m http.server 8000
```
lalu buka `http://localhost:8000`.

## Struktur
- `core/ownership.js` — signature/fingerprint runtime.
- `render/three-engine.js` — WebGL, material, lighting, shadow, kabel/tali 3D.
- `labs/lorentz/physics.js` — authoritative physics state.
- `input/vision-adapter.js` — hook Intent untuk Vision ML tahap berikutnya.


Tambahan v0.5.3: magnet kini berbentuk U/horseshoe yang lebih masuk akal secara visual bagi siswa, dengan yoke penghubung yang menyatukan kutub N dan S. Label owner di pelat meja disembunyikan agar workbench lebih bersih; ownership tetap tertanam di metadata scene, watermark runtime, dan sleeve baterai.


Tambahan v0.5.4: aliran arus divisualkan hanya pada bagian konduktif (terminal holder, sakelar, kabel, kawat aktif, dan bagian dalam baterai). Arus tidak lagi melintasi tali penyangga atau melayang di udara. Magnet U mendapat pedestal dan alas yang menyentuh meja sehingga tidak tampak melayang; yoke penghubung kutub juga diperhalus agar bentuknya lebih masuk akal.


## PILAR Hub / menambah aplikasi
- Root `index.html` menjadi pintu masuk/Hub sekaligus host Gaya Lorentz.
- Daftar aplikasi berada di `apps/registry.js`.
- Aplikasi baru disimpan pada `apps/<slug>/index.html`.
- Tombol `←` pada header Gaya Lorentz membuka kembali PILAR Hub tanpa reload WebGL.
- Setiap aplikasi baru sebaiknya memiliki tombol kembali ke `../../index.html` dan Creator ID yang sama.
- Petunjuk cepat tersedia di `apps/_starter/README.md`.

### Creator ID
Attribution publik: `by : rizalabdurrahman05@guru.smp.belajar.id`. Ini adalah watermark/Creator ID PILAR, bukan klaim penggunaan Google SynthID.
