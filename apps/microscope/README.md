# PILAR Microscope Lab v0.7

Microscope Lab menggabungkan core pengukuran PILAR v0.6 dengan modul Vision/ML dan kontrol perangkat dari remix IFP Microscope AI.

## Arsitektur

- **Core PILAR**: camera selection, Pointer Events, FREEZE, digital zoom/filter, source-pixel calibration, ruler, capture burn-in, IndexedDB Blob gallery.
- **Vision Count (CV)**: grayscale -> Otsu threshold -> connected components. Eksperimental; bukan diagnosis dan bukan machine learning.
- **Focus Coach / Smart Autofocus**: variance of Laplacian pada ROI tengah. Autofocus ESP32 memakai coarse scan lalu fine scan.
- **Teachable Microscope (ML)**: TensorFlow.js + MobileNet feature embedding + KNN classifier, lazy-load saat user mengaktifkan fitur. WebGPU dipilih jika tersedia, lalu fallback WebGL/CPU.
- **PILAR Focus Controller**: USB Web Serial (utama), Web Bluetooth/BLE (wireless pada HTTPS), WebSocket legacy hanya untuk host lokal non-HTTPS.
- **PILAR Pulse**: event penggunaan ringan saja; image frame dan contoh KNN tidak dikirim oleh modul Vision/ML.

## Hardware default

Lihat `firmware/ESP32_Microscope_Controller.ino`.

- STEP 26
- DIR 27
- ENABLE 25 (active LOW)
- LED PWM 18 melalui MOSFET logic-level
- HOME limit 33 ke GND dengan INPUT_PULLUP
- A4988 / DRV8825
- Supply motor terpisah; ground bersama ESP32

Firmware v0.3 menambah BLE, emergency stop, homing timeout, command length guard, soft-limit setelah homing, posisi pada response, dan payload WebSocket yang length-safe.

## Browser

- GitHub Pages HTTPS: **USB Serial** dan **BLE** direkomendasikan.
- `ws://192.168.4.1:81` tidak dapat diandalkan dari halaman HTTPS karena mixed-content policy.
- IP/MJPEG HTTP camera juga dapat diblok oleh browser HTTPS dan/atau CORS.
- Web Serial/Web Bluetooth paling cocok pada Chrome/Edge yang mendukung API tersebut.

## Kalibrasi

Kalibrasi adalah `μm/source-pixel`, bukan pixel layar. Ulangi kalibrasi setelah perubahan objektif, optical zoom, camera sensor/capture mode, atau perubahan mekanik yang mengubah magnifikasi optik.
