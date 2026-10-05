# Security & Privacy

Audit ringkas: 5 Oktober 2026.

## Model keamanan
- Repository ini publik. Anggap seluruh kode client dapat dibaca siapa saja.
- Supabase dilindungi Row Level Security (RLS).
- `SUPABASE_PUBLISHABLE_KEY` adalah kunci client publik, bukan secret.
- Jangan pernah menyimpan `service_role`, password database/Postgres, OAuth client secret, private key, token pribadi, atau kredensial Wi-Fi produksi di repository.
- Login developer harus tetap dilindungi Supabase Authentication; pemeriksaan akses utama ada di RLS, bukan UI.

## Privasi PILAR Pulse
Pulse bersifat opt-in untuk pengguna baru. Sebelum diaktifkan, Pulse tidak membuat sesi anonim atau mengirim telemetry.

Saat aktif, Pulse menyimpan data minimum yang diperlukan untuk dukungan:
- ID anonim;
- app aktif dan waktu terakhir aktif;
- kategori perangkat, browser, platform, dan ukuran layar dalam bucket;
- dukungan WebGL/WebGPU dan ada/tidaknya touch;
- event PILAR dasar;
- chat yang sengaja dikirim pengguna.

Pulse tidak mengirim lokasi presisi, MAC address, canvas/font fingerprint, rekaman kamera, rekaman mikrofon, atau frame Vision AI.

Menonaktifkan Pulse menghentikan pengiriman baru tetapi tidak otomatis menghapus data historis di Supabase. Chat dapat dihapus dari UI; retention otomatis untuk telemetry belum diterapkan.

## Temuan audit yang masih perlu diperhatikan
- Beberapa library/model dimuat dari CDN. Versi yang sudah dipin lebih aman; dependency dinamis sebaiknya dipin atau di-vendor bila PILAR dipakai untuk deployment sensitif.
- Anonymous Auth dapat menjadi target spam. Aktifkan proteksi/rate limit Supabase jika trafik publik meningkat.
- `apps/pak-taro/` menjalankan kode latihan siswa di Web Worker dengan batas waktu. Ini terisolasi dari DOM, tetapi tetap fitur eksekusi kode dan perlu diperlakukan sebagai sandbox edukasi, bukan boundary keamanan tingkat tinggi.
- Firmware microscope memiliki password AP contoh. Ganti sebelum penggunaan di lingkungan publik.

## Pelaporan
Jika menemukan celah, jangan unggah password/token pada GitHub Issue. Laporkan tanpa menyertakan kredensial rahasia.
