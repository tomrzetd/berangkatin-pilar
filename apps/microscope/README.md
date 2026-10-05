# PILAR Microscope Lab

Microscope Lab memakai kamera browser untuk pengukuran, Vision/ML lokal, serta kontrol ESP32 melalui USB Serial, BLE, atau Wi-Fi legacy.

- Kamera diminta hanya setelah aksi pengguna.
- Frame Vision/ML diproses di perangkat dan tidak dikirim ke PILAR Pulse.
- Capture/gambar tersimpan lokal di IndexedDB browser.
- USB Serial atau BLE direkomendasikan pada GitHub Pages HTTPS.
- WebSocket `ws://` dan stream kamera `http://` bersifat legacy/local dan dapat diblokir oleh browser HTTPS.
- Firmware controller: `firmware/ESP32_Microscope_Controller.ino`.
- Ganti password AP contoh pada firmware sebelum penggunaan publik.

Kalibrasi pengukuran menggunakan `μm/source-pixel` dan perlu diulang jika magnifikasi optik berubah.
