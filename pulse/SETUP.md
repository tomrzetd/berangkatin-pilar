# PILAR Pulse · cara memasang

Pulse adalah fitur opsional: hitungan pengunjung anonim dan "Chat dengan Developer". Semua aplikasi PILAR tetap jalan tanpa Pulse.

1. Buat proyek Supabase, lalu buka **SQL Editor**.
2. Jalankan berkas-berkas ini **berurutan**:
   1. `pulse/schema.sql`
   2. `pulse/migrations/002_clear_chat.sql`
   3. `pulse/migrations/003_hardening.sql`
3. Di **Authentication**, aktifkan *Anonymous Sign-Ins* dan *Email* (untuk akun developer). Biarkan *Confirm email* menyala.
4. Daftarkan akun developer sebagai admin. Contoh perintahnya ada di bagian atas `003_hardening.sql`. Admin ditentukan oleh ID akun yang kamu daftarkan, bukan oleh alamat email.
5. Atur *Site URL* ke alamat GitHub Pages PILAR dan *Redirect URL* ke `/developer/`.
6. Isi `pulse/config.js` hanya dengan URL proyek dan **publishable key**.
7. Buka `/developer/` untuk masuk ke dasbor.

Pengunjung baru tidak mengirim data apa pun sampai mereka sendiri menekan **Aktifkan Pulse**.

Jangan pernah menaruh `service_role` key, sandi database, atau token rahasia lain di berkas yang dibuka browser. Semua yang ada di repo ini bisa dibaca siapa saja.
