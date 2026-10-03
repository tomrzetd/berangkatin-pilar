# PILAR App Shelf

Setiap app memiliki folder sendiri di `apps/<app-id>/`. Untuk menambahkan app:
1. Buat `apps/<app-id>/index.html`.
2. Tambahkan entri `status:'ready'` di `apps/registry.js`.
3. Di header app sediakan link `../../` untuk kembali ke PILAR Hub.
4. Tampilkan PILAR Creator ID pada bagian atas app.
5. Untuk app kamera/Vision AI, minta permission hanya setelah aksi eksplisit pengguna.

App aktif saat ini: `microscope` dan `rubik-orbit`.
