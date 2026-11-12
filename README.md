# PILAR — Hub Pembelajaran Interaktif

**PILAR** adalah kumpulan aplikasi pembelajaran berbasis web untuk simulasi, permainan edukatif, eksperimen, Vision AI, dan interaksi di kelas. Hub ini dirancang untuk dibuka melalui browser pada komputer, HP, atau *Interactive Flat Panel* (IFP); fitur dan kenyamanannya bergantung pada perangkat serta browser yang digunakan.

> **Untuk guru dan siswa:** pilih aplikasi dari halaman Hub, ikuti petunjuk pada aplikasinya, dan izinkan kamera/mikrofon hanya jika aktivitas memang memerlukannya.

## Mulai menggunakan

- **Online:** buka situs PILAR melalui alamat GitHub Pages yang dikonfigurasi untuk repository ini.
- **Di komputer (server lokal):** dari folder repository jalankan:

  ```bash
  python -m http.server 8000
  ```

  Lalu buka `http://localhost:8000` di browser komputer tersebut. Jika ingin mengakses server dari HP/IFP melalui jaringan lokal, perhatikan alamat host dan batas izin browser; kamera/mikrofon umumnya memerlukan HTTPS atau `localhost` sebagai *secure context*.
- **Aplikasi terpasang:** lihat panduan [Windows, Linux, Android, dan IFP](native/README.md).

PILAR Hub adalah **launcher**: aplikasi berjalan pada folder masing-masing di `apps/<slug>/`. Service worker menyimpan *shell* utama; ketersediaan aplikasi saat offline bergantung pada aset yang sudah tersimpan atau bundel native yang digunakan. Jangan mengasumsikan semua fitur browser selalu tersedia tanpa internet.

## Katalog aplikasi

Sumber daftar resmi adalah [`apps/registry.js`](apps/registry.js). Pada pemeriksaan dokumentasi ini terdapat **17 entri**:

| Aplikasi | Lokasi |
|---|---|
| Gaya Lorentz | [`apps/lorentz-lab/`](apps/lorentz-lab/) |
| Microscope Lab | [`apps/microscope/`](apps/microscope/) |
| Rubik Orbit | [`apps/rubik-orbit/`](apps/rubik-orbit/) |
| MBG Delivery Duel | [`apps/mbg-duel/`](apps/mbg-duel/) |
| SoundScope Lab | [`apps/soundscope/`](apps/soundscope/) |
| Lab Misteri Pak Taro | [`apps/pak-taro/`](apps/pak-taro/) |
| Air Writing Lab | [`apps/air-writing/`](apps/air-writing/) |
| PuzzleSnap | [`apps/puzzlesnap/`](apps/puzzlesnap/) |
| Lab Maya Tekanan | [`apps/pressure/`](apps/pressure/) |
| Frost Breakout | [`apps/frost-breakout/`](apps/frost-breakout/) |
| BioWeb · Ciremai | [`apps/bioweb/`](apps/bioweb/) |
| Bola Sang Pemburu · Duel | [`apps/hunter-ball/`](apps/hunter-ball/) |
| Frost Snake · Duel Numerasi | [`apps/frost-snake/`](apps/frost-snake/) |
| Lab Baterai · Petualangan Volta | [`apps/baterai-lab/`](apps/baterai-lab/) |
| Papan Rangkai · Logika & Wiring | [`apps/rangkai-lab/`](apps/rangkai-lab/) |
| Jejak Kata · Peta Makna | [`apps/jejak-kata/`](apps/jejak-kata/) |
| Lingkaran Ajaib · Gelombang & Gambar | [`apps/lingkaran-ajaib/`](apps/lingkaran-ajaib/) |

Contoh pembelajaran: **Lab Maya Tekanan** memuat simulasi tekanan padat, cair, Pascal, dan Bernoulli; **Papan Rangkai** mendukung gerbang logika, netlist, dan praktik wiring. Detail teknis tetap berada di folder aplikasinya.

## Penggunaan di IFP dan HP

- Gunakan orientasi dan ukuran tombol yang sesuai perangkat; mode layar penuh hanya berfungsi jika browser/perangkat mengizinkan.
- Aktivitas multi-sentuh membutuhkan dukungan layar, browser, dan aplikasi terkait.
- Fitur kamera, mikrofon, atau perangkat USB meminta izin pengguna dan tidak selalu didukung sama di semua browser.
- Untuk praktikum, lakukan kalibrasi alat ukur jika konfigurasi kamera atau magnifikasi berubah.

## PILAR Pulse (opsional)

**Pulse** adalah kanal dukungan pengguna–pengembang. Pengguna baru perlu mengaktifkannya secara sadar sebelum sesi anonim dan telemetri Pulse dimulai. Saat aktif, fitur ini memproses ID anonim, aplikasi aktif, kategori perangkat/browser, kemampuan perangkat, aktivitas dasar, dan pesan yang sengaja dikirim. Menonaktifkan Pulse menghentikan pengiriman data baru, tetapi tidak otomatis menghapus data yang sudah tersimpan. Pembersihan data otomatis memerlukan konfigurasi server yang sesuai.

### Konfigurasi Pulse untuk pengembang

Panduan :

1. Siapkan proyek Supabase, lalu tinjau dan jalankan [`pulse/schema.sql`](pulse/schema.sql) pada SQL Editor sesuai kondisi database.
2. Tinjau migrasi yang diperlukan, khususnya [`pulse/migrations/003_hardening.sql`](pulse/migrations/003_hardening.sql). **Jangan menjalankan ulang migrasi produksi tanpa memeriksa status penerapannya.**
3. Aktifkan **Anonymous Sign-Ins** untuk pengunjung dan **Email Auth** untuk akun pengembang.
4. Atur **Site URL** dan **Redirect URLs** sesuai alamat deploy PILAR, termasuk rute `/developer/`.
5. Isi [`pulse/config.js`](pulse/config.js) hanya dengan URL Supabase, *publishable key*, dan konfigurasi yang aman dipublikasikan.
6. Jika migrasi hardening digunakan, daftarkan UUID admin di `pilar_admins` melalui jalur administrasi database yang aman, kemudian masuk melalui halaman [`developer/`](developer/).

**Jangan** menaruh `service_role`, password, private key, token rahasia, maupun kredensial Wi-Fi produksi di berkas publik. Dokumen ini menjelaskan konfigurasi kode, **bukan** verifikasi keadaan Supabase yang sedang berjalan.

## Mengembangkan dan menguji

1. Buat aplikasi di `apps/<slug>/` (bisa merujuk pola `apps/_starter/` jika masih tersedia).
2. Tambahkan entri ke [`apps/registry.js`](apps/registry.js) dan sediakan navigasi kembali ke Hub.
3. Pastikan kontrol sentuh, aksesibilitas dasar, dan izin perangkat sesuai kebutuhan pembelajaran.
4. Sebelum mengajukan perubahan, jalankan:

   ```bash
   node developer/verify-hub.js .
   node developer/patch-v2-tests/test_pressure.js .
   node developer/patch-v2-tests/test_lorentz.js .
   ```

   Pengujian tambahan untuk fisika, audio, dan aplikasi lain tersedia pada workflow [PM v2 verification](.github/workflows/pm-v2-verify.yml). Pemeriksaan otomatis tidak menggantikan uji manual pada IFP/HP.

## Dokumentasi lanjutan

- [Microscope Lab](apps/microscope/README.md)
- [SoundScope — Acoustic Analysis](apps/soundscope/ACOUSTIC-ANALYSIS.md)
- [SoundScope — FSK & Hamming](apps/soundscope/FSK-HAMMING.md)
- [Panduan aplikasi native](native/README.md)

## Kreator

`by : rizalabdurrahman05@guru.smp.belajar.id`
