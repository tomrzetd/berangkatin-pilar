# PILAR Hub — aplikasi terpasang (native)

Folder `native/` berisi perangkat build untuk membungkus PILAR Hub sebagai aplikasi **Windows, Linux, dan Android**. Aplikasi dapat dipakai pada komputer, HP, dan IFP yang kompatibel. Tidak semua fitur dapat diasumsikan bekerja offline atau sama pada setiap platform.

## Pilihan platform

| Platform | Bentuk keluaran build | Penggunaan |
|---|---|---|
| Windows x64 | Installer NSIS `.exe` dan versi portable `.exe` | Laptop/PC kelas, termasuk PC yang terhubung ke IFP |
| Linux x64 | `.AppImage` dan `.deb` | Laptop/PC Linux |
| Android | APK debug; APK rilis jika kunci penandatanganan tersedia | HP, tablet, dan IFP Android yang kompatibel |

Lihat [GitHub Releases](https://github.com/tomrzetd/berangkatin-pilar/releases) untuk memeriksa **aset yang benar-benar tersedia**. Workflow [`native.yml`](../.github/workflows/native.yml) dikonfigurasi membuat rilis `native-latest` pada jalur `main` dan rilis bernomor pada tag `v*`, jika job berhasil. Keberadaan workflow **tidak menjamin** tiap build/rilis sudah sukses.

## Instalasi untuk pengguna

### IFP Hisense / Android

1. Unduh APK dari **Releases** dan pastikan sumbernya repository yang benar.
2. Pindahkan APK ke perangkat (contoh: flashdisk) dan buka melalui file manager.
3. Jika perangkat meminta izin memasang aplikasi dari sumber tersebut, pahami risikonya dan aktifkan hanya seperlunya sesuai kebijakan sekolah.
4. Buka PILAR. Saat memakai fitur kamera atau mikrofon, berikan izin jika memang dibutuhkan.
5. Bila fitur WebView gagal berjalan, periksa kompatibilitas serta versi **Android System WebView** melalui sumber resmi perangkat.

Orientasi IFP/tablet dan perilaku layar penuh diatur pada implementasi Android; tampilan nyata tetap bergantung pada firmware dan WebView perangkat.

### Windows dan Linux

- Windows: instal versi NSIS atau gunakan versi portable bila tersedia.
- Linux: gunakan `.AppImage` atau `.deb` yang sesuai arsitektur dan izin sistem.
- Shortcut desktop yang tersedia di aplikasi Electron mencakup `F11` (layar penuh), `Ctrl+R` (muat ulang), `Ctrl++/-/0` (zoom), dan `F12` (DevTools); dukungan dapat berbeda menurut platform/paket.

## Cara build (pengembang)

Build diatur oleh [`native/build-web.mjs`](build-web.mjs) dan GitHub Actions [`.github/workflows/native.yml`](../.github/workflows/native.yml):

1. Pada lingkungan Node.js 20+ dengan akses jaringan saat pengunduhan dependensi, siapkan aset web:

   ```bash
   node native/build-web.mjs native/www
   ```

2. Proses ini menyalin halaman, menyiapkan shim native, dan mencoba menyimpan dependensi/model eksternal yang didukung ke bundel lokal. Proses build dapat gagal jika aset wajib tidak berhasil diunduh.
3. Workflow melanjutkan paket Electron untuk Windows/Linux dan proyek Capacitor untuk Android. Workflow juga memiliki pengujian smoke Electron dan emulator Android, tetapi hasil eksekusi harus diperiksa pada halaman **Actions** untuk commit terkait.

## Batas offline dan akses perangkat

- Aset aplikasi yang **berhasil masuk bundel** dapat dipakai tanpa jaringan; perlu diuji per fitur pada perangkat target.
- **PILAR Pulse / Supabase** tetap memerlukan internet. Fitur yang mengambil data atau model dari layanan luar mungkin juga memerlukan koneksi.
- Android WebView tidak menyediakan dukungan Web Serial/Web Bluetooth yang setara dengan Electron desktop; kontrol ESP32 via USB Serial/Bluetooth tertentu perlu solusi/platform lain, sedangkan jalur Wi-Fi bergantung pada jaringan dan kebijakan keamanan.
- Kamera, mikrofon, WebGL, serta akses file berbeda menurut perangkat, izin, dan versi WebView.

## Menandatangani APK rilis

Workflow menggunakan APK debug untuk pengujian. Untuk rilis bertanda tangan, konfigurasi secret di GitHub Actions sesuai workflow:

- `ANDROID_KEYSTORE_B64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

**Jangan** menaruh file keystore privat atau nilainya dalam commit, README, maupun kode client. Keystore debug bawaan yang ditujukan untuk pengembangan **bukan** identitas rilis publik yang tepercaya.

## Pemeriksaan sebelum distribusi

- Verifikasi build pada GitHub Actions/Releases untuk commit atau tag yang akan dibagikan.
- Uji instalasi, navigasi Hub, izin kamera/mikrofon, mode offline, dan performa pada **perangkat nyata**, termasuk IFP.
- Tinjau izin perangkat, privasi PILAR Pulse, keamanan kredensial, dan kebutuhan internet sebelum distribusi ke sekolah.
