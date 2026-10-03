# PILAR Pulse v0.1 — setup

1. Supabase > SQL Editor > New query.
2. Paste seluruh isi `pulse/schema.sql`, lalu Run.
3. Supabase > Authentication > Providers: aktifkan Anonymous Sign-Ins.
4. Pastikan Email provider aktif untuk login developer via magic link/OTP.
5. Supabase > Authentication > URL Configuration:
   - Site URL: `https://tomrzetd.github.io/berangkatin-pilar/`
   - Redirect URL: `https://tomrzetd.github.io/berangkatin-pilar/developer/`
6. Buka PILAR. Pulse akan membuat identitas anonim per browser melalui Supabase Auth.
7. Dashboard developer: `/developer/` dan login dengan:
   `rizalabdurrahman05@guru.smp.belajar.id`

Data yang dikirim: ID anonim, current app, browser family/major version, platform, device class, viewport, touch count, WebGL/WebGPU, last seen, event app dasar, dan chat yang sengaja dikirim user.

Tidak dikirim: precise location, canvas/font fingerprint, MAC address, kamera/mikrofon, atau isi aktivitas lain di luar event PILAR yang eksplisit.
