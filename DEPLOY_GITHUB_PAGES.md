# Deploy PILAR Lorentz v0.5.4 ke GitHub Pages

1. Backup branch/repo yang sekarang live.
2. Salin seluruh isi bundle v0.5.4 ke root repo `berangkatin-pilar` dan izinkan file lama ditimpa.
3. Pastikan file baru `core/ownership.js` ikut ter-upload.
4. Commit dan push ke branch yang dipakai GitHub Pages.
5. Setelah deploy selesai, buka halaman lalu lakukan **hard refresh** satu kali (`Ctrl+Shift+R`). Service worker v0.5.4 memakai cache baru `pilar-lorentz-v054` dan akan menghapus cache PILAR lama saat aktivasi.

## Smoke test setelah deploy
- Stage 3D muncul dan status berubah menjadi `3D siap`.
- Pada posisi diam, kawat berada **di celah N–S** dan tidak masuk ke badan magnet.
- Tali menggantung di luar kedalaman badan magnet.
- Pilih `Render: Realistis`: shadow dan bump tetap aktif tanpa penurunan FPS yang mengganggu.
- Nyalakan sakelar lalu `Lihat arus I`: partikel/chevron mengikuti loop rangkaian.
- `⏪ Ulang arus` hanya mengulang playback arus; physics dan Evidence Ledger tidak reset.
- `Balik baterai`: arah arus dan F berbalik sesudah polaritas aktual berubah.
- Watermark runtime muncul halus di kiri bawah stage dan fingerprint kecil tertanam pada aset baterai/scene metadata.

## Catatan
Three.js r128 masih dimuat dari CDN, jadi load pertama memerlukan internet. Sesudah core v0.5.4 stabil, vendor Three.js lokal bisa menjadi pekerjaan optimasi/offline berikutnya.
