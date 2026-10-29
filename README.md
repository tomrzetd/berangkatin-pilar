# PILAR

PILAR adalah hub pembelajaran interaktif berbasis web untuk simulasi, game, eksperimen, Vision AI, dan perangkat kelas.

## Hub
Root repository adalah **launcher murni**. Sejak v0.8.0, runtime Lorentz lama tidak lagi dimuat di halaman depan; setiap aplikasi berjalan mandiri dari `apps/<slug>/`.

Aset awal Hub dibuat kecil untuk mempercepat startup. Service worker hanya melakukan precache pada shell inti, sedangkan aset aplikasi disimpan ke runtime cache setelah aplikasi pertama kali dipakai.

## Aplikasi
Daftar aktif bersumber dari `apps/registry.js`.

- Gaya Lorentz
- Microscope Lab
- Rubik Orbit
- MBG Delivery Duel
- SoundScope Lab
- Lab Misteri Pak Taro
- Air Writing Lab
- PuzzleSnap
- Lab Maya Tekanan
- Frost Breakout
- BioWeb · Ciremai
- Bola Sang Pemburu · Duel
- Frost Snake · Duel Numerasi
- Lab Baterai · Petualangan Volta

## Menjalankan
PILAR dapat dijalankan dari GitHub Pages atau server lokal:

```bash
python -m http.server 8000
```

Fitur kamera/Vision memerlukan HTTPS atau localhost dan hanya diminta setelah aksi pengguna.

## Verifikasi
Pemeriksaan struktur Hub dapat dijalankan tanpa dependency tambahan:

```bash
node developer/verify-hub.js .
```

Validator memeriksa antara lain:
- target URL semua entri registry;
- aset shell service worker;
- referensi aset root;
- duplicate HTML ID;
- sintaks `app.js`;
- manifest;
- tidak adanya runtime Lorentz lama di root Hub.

Workflow GitHub Actions juga menjalankan pengujian fisika, DSP, dan smoke test yang sudah tersedia.

## PILAR Pulse
Pulse adalah kanal dukungan anonim antara pengguna dan developer. Pengguna baru harus mengaktifkan Pulse terlebih dahulu. Data yang dikirim dibatasi pada ID anonim, app aktif, kategori perangkat/browser, kemampuan grafis, status koneksi, event PILAR dasar, dan chat yang sengaja dikirim.

## Menambah app
1. Duplikasi dan sesuaikan `apps/_starter/` atau buat `apps/<slug>/index.html`.
2. Tambahkan entri di `apps/registry.js`.
3. Sediakan navigasi kembali ke PILAR Hub.
4. Minta izin kamera/mikrofon hanya ketika benar-benar diperlukan.
5. Jalankan `node developer/verify-hub.js .` sebelum commit.

## Creator
`by : rizalabdurrahman05@guru.smp.belajar.id`

## Lab Maya Tekanan
`apps/pressure/` berisi empat simulasi 3D (Three.js r128) yang mengikuti alur PILAR: Lihat → Tebak → Coba → AHA → Buktikan → Rekayasa.

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
