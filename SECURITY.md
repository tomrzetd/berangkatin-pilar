# Keamanan dan Privasi PILAR

Pemeriksaan terakhir: November 2026.

## Prinsip dasar

Repo ini publik, jadi semua kode yang dibuka browser bisa dibaca siapa saja. Karena itu:

- Tidak boleh ada kunci rahasia di repo: `service_role` Supabase, sandi basis data, token pribadi, sandi WiFi sungguhan, atau kunci tanda tangan rilis Android.
- `SUPABASE_PUBLISHABLE_KEY` di `pulse/config.js` memang kunci publik. Yang menjaga data adalah aturan akses (Row Level Security) di basis data, bukan tampilan.
- Kunci rilis Android disimpan sebagai *secret* di GitHub Actions. Berkas `native/android/pilar-debug.keystore` hanya kunci debug dan bukan rahasia.

## Data apa yang dikumpulkan

PILAR tidak meminta nama, email, kelas, atau nilai siswa. Kemajuan belajar disimpan di perangkat masing-masing (localStorage).

Kamera dan mikrofon hanya dipakai di aplikasi yang memerlukannya, setelah pengguna mengizinkan. Gambar dan suara diolah langsung di perangkat dan tidak dikirim ke server.

**PILAR Pulse** mati sampai pengguna sendiri menekan *Aktifkan Pulse*. Kalau dinyalakan, yang dikirim hanya:

- ID anonim per browser;
- aplikasi yang sedang dibuka dan kapan terakhir aktif;
- kategori perangkat (jenis browser, ukuran layar yang dibulatkan, ada layar sentuh atau tidak, dukungan WebGL);
- kejadian sederhana seperti "bab selesai";
- pesan yang sengaja ditulis di Chat dengan Developer.

Pulse tidak mengirim lokasi, alamat MAC, sidik jari perangkat, rekaman kamera, atau rekaman mikrofon. Migrasi 003 menyediakan pembersih yang menghapus catatan kejadian setelah 90 hari dan chat setelah 180 hari. Agar berjalan setiap hari, aktifkan `pg_cron` di Supabase seperti dijelaskan di berkas migrasi itu. Chat juga bisa dihapus sendiri lewat tombol *Clear Chat*.

## Perlindungan yang sudah dipasang

- **Admin Pulse** ditentukan dari ID akun yang didaftarkan manual di tabel `pilar_admins`, bukan dari alamat email di token login. Akun anonim tidak pernah bisa menjadi admin. Aturan ini ada di `pulse/schema.sql` dan `pulse/migrations/003_hardening.sql`.
- **Batas ukuran dan laju** untuk semua tulisan dari browser ke basis data, supaya tidak bisa dibanjiri.
- **Pesan chat** ditampilkan sebagai teks biasa, tidak sebagai HTML.
- **Service worker** hanya menyimpan respons yang berhasil, dan halaman `/developer/` tidak pernah disimpan.
- **Aplikasi Electron** memakai `contextIsolation`, `sandbox`, tanpa `nodeIntegration`. Tautan luar dibuka di browser biasa, dan izin perangkat (kamera, mikrofon, serial, bluetooth) hanya diberikan kepada halaman PILAR sendiri.
- **GitHub Actions** hanya punya izin tulis di langkah yang menerbitkan unduhan.
- **Firmware Microscope** membuat sandi WiFi acak untuk tiap alat. Sandinya tampil di Serial Monitor saat alat menyala. Sebelumnya semua alat memakai sandi yang sama.

## Hal yang disengaja dan perlu diketahui

- APK Android mengizinkan alamat `http://` biasa. Ini diperlukan supaya Microscope Lab bisa membuka siaran kamera ESP32 di jaringan lokal (misalnya `http://192.168.4.2:81/stream`). Konsekuensinya, alamat seperti itu tidak terenkripsi. Pakailah hanya di jaringan sekolah sendiri.
- Beberapa aplikasi di versi web memuat pustaka dari CDN (jsDelivr) dengan versi yang dikunci. Versi Windows, Linux, dan Android membawa salinannya sendiri.
- Login anonim Supabase bisa menjadi sasaran spam bila PILAR sangat ramai. Bila itu terjadi, aktifkan CAPTCHA atau batas laju di pengaturan Supabase.

## Melaporkan celah

Kalau menemukan celah keamanan, kabari pembuat lewat GitHub Issue tanpa menyertakan sandi, token, atau data pribadi, atau lewat Chat dengan Developer di Hub. Ceritakan langkah untuk memunculkannya. Terima kasih sudah membantu menjaga PILAR tetap aman untuk siswa.
