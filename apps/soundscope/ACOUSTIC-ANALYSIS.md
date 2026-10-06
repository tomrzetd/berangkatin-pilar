# SoundScope Acoustic Physics v4.5.1 — catatan analisis & perubahan

## Temuan (v4.4.0) → perbaikan
| # | Temuan | Dampak fisika/perangkat | Perbaikan |
|---|---|---|---|
| 1 | Korelasi dinormalisasi energi lokal | Gema yang tumpang-tindih bunyi langsung (jarak dekat, chirp panjang) "hilang"; puncak noise tampak sama kuat dengan gema | Matched filter **linear I/Q** + ambang **CFAR** (median noise floor × 4,5) |
| 2 | Korelasi |nyata| berosilasi mengikuti carrier | Jitter ¼ siklus ≈ 2 cm; resolusi dibatasi sampel | Envelope kuadratur + **interpolasi parabola sub-sampel** |
| 3 | Chirp 6 ms, 2,5–6 kHz (TBW≈21) | Pemrosesan-gain ±13 dB; rapuh di kelas bising | Chirp 10 ms, 2,2–7 kHz (TBW≈48); **ping ×3 median** + ± sebaran |
| 4 | Worklet anchor menjadwalkan balasan dari saat *ambang terlewati* | Turnaround bergantung kerasnya poll → **walk error 39,6 cm** (volume 0,5→0,012) | **Onset backtracking** (50% plateau, interpolasi) + kompensasi tunda filter → sebaran **0,0 cm** |
| 5 | Onset poller: jendela 7 ms, hop 1 ms | Kuantisasi 1 ms = 17 cm | Jendela 6 ms, hop 0,5 ms, **interpolasi silang-ambang**, median 3 putaran |
| 6 | Jarum Doppler 270° vs busur 90° | Gauge menyesatkan | Nol di atas, busur = sapuan jarum, label ±3 m/s |
| 7 | Peta posisi hanya koordinat positif | Anchor negatif terpotong | Batas dinamis, grid meter, vektor anchor→target |

## Batas fisik yang perlu diajarkan
- λ = c/f: 4 kHz → 8,6 cm; resolusi jarak ≈ c/(2·B) ≈ 3,6 cm untuk B=4,8 kHz.
- Intensitas gema ∝ 1/r² (pergi-pulang) → gema jauh sangat lemah; sebab itu SNR/CFAR penting.
- Speaker laptop kecil: lemah <300 Hz, wajar 1–8 kHz. Hindari Bluetooth (latensi 100–250 ms, jitter).
- Latensi audio konstan dibatalkan oleh referensi bunyi langsung (sonar) dan bias kalibrasi (ranging); jitter tidak → median.
- c = 331 + 0,6·T: salah suhu 10 °C ≈ 1,7% ≈ 3,4 cm pada 2 m.

## Belum dikerjakan (kandidat v4.6)
Doppler pantulan 1 perangkat (demodulasi I/Q + spektrogram bertanda arah, faktor 2), pembatalan direct-path, FFT-correlation untuk jangkauan >8 m.

Uji: `node apps/soundscope/test/acoustic-core.test.js`, `acoustic-ui.test.js`, `ui-smoke.test.js`, `fsk-core.test.js --quick`.


## Optimisasi runtime v4.5.1
- FULL (default non-Android; baseline Core i5 Gen-12): Sonar DSP di Web Worker @48 kHz, visual hingga 60 fps, DPR maks 2.
- ECO (default Android/IFP A311D2): algoritma dan ping ×3 tetap sama, Worker @24 kHz setelah anti-alias 5-tap, visual 30 fps, DPR maks 1,25.
- Mode dapat dioverride dari panel Acoustic Physics. Multi-Anchor, Doppler, Position, CFAR dan median tidak dikurangi.
