# PILAR Hub · aplikasi native

Semua aplikasi PILAR Hub dibungkus menjadi aplikasi yang bisa di-install dan berjalan **offline**:

| Platform | Berkas | Untuk |
|---|---|---|
| Windows x64 | `PILAR-Hub-…-x64-nsis.exe` (installer) · `PILAR-Hub-…-portable.exe` (tanpa install) | laptop sekolah / pemerintah, PC yang terhubung ke IFP |
| Linux x64 | `.AppImage` · `.deb` | laptop Linux |
| Android | `PILAR-Hub-…-debug.apk` (dan `.apk` rilis bila kunci rilis dipasang) | HP & IFP Hisense (Android 13), tablet |

Unduh dari halaman **Releases** → `native-latest` (otomatis diperbarui setiap ada perubahan di `main`),
atau buat tag `v0.9.0` untuk rilis bernomor.

## Cara kerja
1. `node native/build-web.mjs` menyalin situs ke `native/www`, mengunduh pustaka CDN & model AI
   (three.js, MediaPipe, TensorFlow.js, Font Awesome, cubejs) ke `_cdn/` lalu menulis ulang URL-nya,
   dan menyisipkan `/_native/shim.js` di setiap halaman.
2. **Electron** (`native/electron`) melayani `www/` lewat protokol aman `app://pilar/`
   (kamera, mikrofon, WebGL, Web Serial ESP32, Web Bluetooth, unduhan ke Documents/PILAR).
3. **Android** (`native/android`, Capacitor 7): satu APK untuk HP & IFP.
   IFP/tablet (≥ 600 dp) dikunci landscape, HP mengikuti sensor; layar penuh imersif, layar tidak mati,
   unduhan disimpan ke **Documents/PILAR**.
4. GitHub Actions (`.github/workflows/native.yml`) membangun semuanya, lalu menguji APK di emulator
   tablet & HP **tanpa internet** dan menguji Electron di Linux (tangkapan layar ada di artefak Actions).

## Memasang di IFP Hisense
1. Salin `.apk` ke flashdisk → colok ke IFP → buka dengan File Manager → **Install**
   (izinkan “Sumber tidak dikenal” bila diminta).
2. Pertama kali membuka lab berkamera/mikrofon, tekan **Izinkan**.
3. Bila tampil pesan “WebView sudah lama”, perbarui **Android System WebView** (Play Store atau APK resmi).

## Pintasan desktop
F11 layar penuh · Ctrl+R muat ulang · Ctrl +/−/0 zoom · Alt+← kembali · Alt+Home ke Hub · F12 DevTools

## Kunci rilis Android (opsional, disarankan untuk distribusi luas)
APK debug memakai kunci tetap `native/android/pilar-debug.keystore` (bukan rahasia) agar versi baru bisa
dipasang menimpa yang lama. Untuk APK rilis, tambahkan secret repo:
`ANDROID_KEYSTORE_B64` (keystore base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Batasan yang diketahui
- Android WebView tidak punya Web Serial/Web Bluetooth → kontrol ESP32 di Microscope Lab hanya di desktop
  (atau lewat WiFi). Fitur lain berjalan normal.
- Pulse (Supabase) dan Teachable Microscope (MobileNet) tetap butuh internet; selebihnya offline.
