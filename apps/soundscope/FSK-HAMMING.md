# SoundScope v4.2.0 — skema BFSK + Hamming (di samping OOK Morse)

Di panel **Morse Acoustic Link** ada pemilih skema: **〰️ OOK · Morse** (lama, tidak berubah) dan **🎼 BFSK · Hamming** (baru).

## Berkas
| Berkas | Isi |
|---|---|
| `fsk-core.js` | DSP + pengkodean murni (tanpa DOM): CRC-8, Hamming(7,4), frame, interleaving, `Receiver` streaming |
| `morse-link.js` | UI: pemilih skema, TX (OscillatorNode), RX (AudioWorklet → `Receiver`), visual FSK |
| `test/fsk-core.test.js` | Uji kanal simulasi (derau, babble, gema, fading, ppm, interferer, alarm palsu). `--quick` untuk versi cepat |
| `test/ui-smoke.test.js` | Uji asap UI dengan DOM/WebAudio palsu (TX→audio→RX penuh) |

Jalankan: `node apps/soundscope/test/fsk-core.test.js --quick` dan `node apps/soundscope/test/ui-smoke.test.js`.

## Format paket
`[preamble 1010… ×8][sync 16 bit][header: panjang][data: karakter + CRC-8]`, 1 simbol = 30/40/60 ms, bit 0 = f0, bit 1 = f1.
Sync word sekaligus menandai mode koreksi (CRC saja / Hamming / Hamming+interleaving), jadi penerima mengenali mode otomatis.
Yang harus sama di TX dan RX hanya **kanal nada** (A 800/1200, B 1500/1900, C 2200/2600, D 2900/3300 Hz) dan **laju simbol**.
Empat kanal tidak berimpit, sehingga empat kelompok dapat bekerja bersamaan (FDMA).

## Alur pembelajaran yang disarankan
1. **Uji nada** (TX) + RX: dua meter NADA 0 / NADA 1 bergantian naik → modulasi frekuensi.
2. Kirim pesan dengan *Koreksi error = Tanpa koreksi*; lihat preamble, sync, CRC pada rel bit.
3. *Simulasi gangguan = 3 bit rusak acak*: mode CRC saja **menolak** paket; Hamming **memperbaikinya**.
4. *Simulasi gangguan = Burst 6 bit*: Hamming biasa gagal, **Hamming + interleaving** berhasil (burst tersebar ke banyak kode).
5. Bandingkan durasi kirim dengan OOK: koreksi error membayar dengan waktu (trade-off).

## Batas yang perlu diketahui
- Maks. 32 karakter ASCII per paket. Tidak ada kirim-ulang otomatis (CRC gagal → paket ditolak; kirim ulang manual).
- Nada pengganggu persis di f0/f1 tetap mengganggu; pilih kanal lain.
- Mulai RX sebelum TX agar penerima sempat mengukur derau latar.
- Receiver memakai AudioWorklet (butuh HTTPS, sama seperti mikrofon); ada cadangan ScriptProcessor.

