# PILAR™ Microscope Lab v0.6 — Audit & Patch Notes

## Fokus audit
Source awal IFP Microscope Pro dipertahankan sebagai basis fitur kamera, filter, overlay, penggaris, kalibrasi, capture, dan galeri. Patch v0.6 berfokus pada ketahanan IFP/MPI, validitas pengukuran, penyimpanan bukti, dan konsistensi dengan PILAR Hub.

## Perbaikan inti

1. **IFP / multitouch input**
   - Sistem penggaris awal hanya memakai `mousedown/mousemove/mouseup`.
   - Diubah ke Pointer Events (`pointerdown/pointermove/pointerup/pointercancel`) + pointer capture dan `touch-action:none` pada layer ukur.

2. **Bug Zoom + / Zoom −**
   - Tombol memanggil `adjustZoom()` tetapi method tersebut tidak tersedia pada source awal.
   - Method ditambahkan dan disinkronkan dengan slider, overlay, serta status fase PILAR.

3. **Kalibrasi lebih valid**
   - Pengukuran awal memakai panjang pixel layar. Nilai ini berubah ketika viewport/zoom berubah.
   - v0.6 memetakan koordinat overlay ke **source pixel kamera**, sehingga zoom digital dan resize tidak mengubah skala sumber.
   - Kalibrasi dibuat **session-specific**. Pengguna diminta kalibrasi ulang setelah mengganti kamera, objektif, atau perbesaran optik.

4. **Freeze frame untuk kelas**
   - Tombol `FREEZE/LANJUT` ditambahkan agar siswa dapat membekukan frame sebelum kalibrasi/pengukuran.

5. **Kamera lebih robust**
   - Pemeriksaan secure context/HTTPS.
   - Error permission lebih informatif.
   - `devicechange` dipantau untuk kamera USB yang dipasang/dilepas.
   - Metadata resolusi/FPS ditampilkan saat stream aktif.
   - Permission kamera tetap berbasis aksi pengguna (`START`).

6. **Galeri bukti**
   - Penyimpanan base64 di `localStorage` diganti dengan **IndexedDB Blob** untuk mengurangi risiko quota cepat habis pada gambar resolusi tinggi.
   - Ada best-effort migration dari galeri legacy localStorage.
   - Batas galeri 30 capture agar storage tetap terkendali.

7. **Evidence capture**
   - Capture dapat menyertakan overlay yang aktif: grid, crosshair, ruler, dan scale bar terkalibrasi.
   - Burn-in `PILAR™ Microscope Lab`, timestamp, zoom, dan `PILAR Creator ID`.

8. **Framework PILAR**
   - Alur: **LIHAT → FOKUS → UKUR → BUKTIKAN → DOKUMENTASIKAN**.
   - Tombol kembali ke `PILAR Hub`.
   - Creator ID terlihat di header/footer.

## Rubik Orbit v3
Core solver, sinkronisasi kubus/orbit, Vision AI, scan kamera, dan efek visual tidak dirombak. Integrasi hanya menambahkan:
- prefix PILAR™ dan versi v3,
- tombol kembali ke PILAR Hub,
- Creator ID di header,
- penamaan watermark internal sebagai PILAR Creator ID.

## Pemeriksaan build
- JavaScript PILAR Hub: syntax check lulus.
- JavaScript Microscope: syntax check lulus.
- JavaScript Rubik: syntax check lulus.
- Service Worker: syntax check lulus.
- Semua literal `getElementById()` Microscope memiliki target DOM.
- Tidak ada ID DOM duplikat pada Hub, Microscope, atau Rubik.
- Semua link/file lokal yang direferensikan tersedia dalam bundle.
