# PILAR Pulse — Setup

1. Jalankan `pulse/schema.sql` di Supabase SQL Editor.
2. Aktifkan Anonymous Sign-Ins.
3. Aktifkan Email Auth untuk akun developer.
4. Atur Site URL ke GitHub Pages PILAR dan Redirect URL ke `/developer/`.
5. Isi `pulse/config.js` hanya dengan Supabase URL, publishable key, dan konfigurasi publik.
6. Buka `/developer/` untuk login developer.

Pengguna baru tidak mengirim data Pulse sampai memilih **Aktifkan Pulse**.

Jangan pernah menaruh `service_role`, password database, private key, atau token rahasia di file client.
