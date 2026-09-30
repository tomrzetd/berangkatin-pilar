# PILAR Lorentz v0.5 — AHA Kernel

PILAR adalah kerangka lab maya yang mendorong alur **Lihat → Tebak → Coba → AHA → Buktikan → Rekayasa**. Seri ini berfokus pada gaya Lorentz tingkat SMP.

## Hal baru di v0.5
- Arsitektur dipisah menjadi `core`, `render`, `input`, dan `labs/lorentz`.
- Satu authoritative physics state: HUD, WebGL, evidence, dan challenge membaca state fisika yang sama.
- Model ayunan 1-DOF deterministik, bukan solver rigid-body generik.
- `F ideal = BIL` dibedakan dari `F efektif = F ideal × faktor medan`.
- `α` = sudut ayunan; `θ` = sudut antara I dan B. Pada rig ini θ = 90°.
- Evidence Ledger otomatis mencatat B, I, F ideal, F efektif, α, arah, dan alasan percobaan.
- AHA unlock setelah siswa membuktikan pembalikan arah gaya dan pengaruh B.
- Engineering Bridge mengubah konsep gaya Lorentz menjadi brief produk/aktuator.
- Adapter vision sudah disiapkan sebagai hook, tetapi ML kamera belum diaktifkan di v0.5.

## Menjalankan
### GitHub Pages
Upload seluruh isi folder ini ke repository dan aktifkan GitHub Pages pada branch/folder yang sesuai. `index.html` berada di root bundle.

### Tes lokal
Bisa dicoba dengan membuka `index.html` selama internet tersedia untuk memuat Three.js dari CDN. Untuk perilaku PWA/service worker, gunakan server lokal, misalnya:

```bash
python -m http.server 8000
```

lalu buka `http://localhost:8000`.

## Catatan arsitektur
`input/vision-adapter.js` sengaja hanya mengirim `Intent`. Saat MediaPipe/hand pose/face landmark ditambahkan nanti, physics engine tidak perlu diubah.
