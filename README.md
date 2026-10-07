# PILAR

PILAR adalah hub pembelajaran interaktif berbasis web untuk simulasi, game, eksperimen, Vision AI, dan perangkat kelas.

## Aplikasi
- Gaya Lorentz
- Microscope Lab
- Rubik Orbit
- MBG Delivery Duel
- SoundScope
- Lab Misteri Pak Taro
- Air Writing Lab
- Lab Maya Tekanan (zat padat · zat cair · Pascal · Bernoulli/drone, 3D)

Daftar aplikasi ada di `apps/registry.js`. Setiap app mandiri berada di `apps/<slug>/index.html`.

## Menjalankan
PILAR dapat dijalankan dari GitHub Pages atau server lokal:

```bash
python -m http.server 8000
```

Fitur kamera/Vision memerlukan HTTPS atau localhost dan hanya diminta setelah aksi pengguna.

## PILAR Pulse
Pulse adalah kanal dukungan anonim antara pengguna dan developer. Pengguna baru harus mengaktifkan Pulse terlebih dahulu. Data yang dikirim dibatasi pada ID anonim, app aktif, kategori perangkat/browser, kemampuan grafis, status koneksi, event PILAR dasar, dan chat yang sengaja dikirim.

## Menambah app
1. Buat `apps/<slug>/index.html`.
2. Tambahkan entri di `apps/registry.js`.
3. Sediakan navigasi kembali ke PILAR Hub.
4. Minta izin kamera/mikrofon hanya ketika benar-benar diperlukan.

## Creator ID
Creator : `by : rizalabdurrahman05@guru.smp.belajar.id`

## Lab Maya Tekanan
`apps/pressure/` berisi empat simulasi 3D (Three.js r128) yang masing-masing mengikuti alur PILAR: Lihat → Tebak → Coba → AHA → Buktikan → Rekayasa.

| Lab | Konsep | Rekayasa |
|---|---|---|
| Padat | P = F/A, amblas di salju/pasir/tanah | sepatu salju vs ujung penusuk |
| Cair | p = ρgh, menyelam di kolam, tekanan sama ke segala arah | zonasi kedalaman kolam |
| Pascal | F₁/A₁ = F₂/A₂, lift hidrolik cuci mobil | rancang lift (gaya, langkah, tekanan) |
| Bernoulli | gaya angkat bilah ∝ v², stall, hover | drone pengantar bantuan |

Fisika murni ada di `labs/pressure/physics.js` dan dapat diuji tanpa browser:

```bash
node labs/pressure/test/physics.test.js
```
Lab dapat dibuka langsung dengan `apps/pressure/?lab=padat|cair|pascal|bernoulli`.
