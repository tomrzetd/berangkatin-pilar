/* Jalan Cahaya · 10 bab: cerita fakta → simulasi → misi → bengkel rekayasa
   Satuan dunia: 10 satuan = 1 cm (kecuali bab Kamera & Teropong yang punya skala sendiri). */
(function () {
  'use strict';
  const O = window.OPTIKA, D = Math.PI / 180, V = O.V;
  const cm = u => (u / 10).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const fx = (v, d = 1) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d });
  const elById = (S, id) => S.el.find(e => e.id === id);
  // berkas terakhir (setelah benda terakhir) tiap sinar sumber utama: segmen dengan b sangat jauh
  const tails = R => R ? R.segs.filter(s => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) > 5e4 && s.I > .3) : [];
  const ang = s => Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
  const spreadAt = (ts, x) => { const ys = ts.map(s => { const d = V.norm(V.sub(s.b, s.a)); return s.a.y + (x - s.a.x) / d.x * d.y; }); return Math.max(...ys) - Math.min(...ys); };
  const hitsOn = (R, el) => (R && R.hits.get(el)) || [];
  const LASER = (o) => Object.assign({ id: 'box', type: 'laser', name: 'kotak laser', w: 52, rays: 5, gap: 14, drag: 'xy', rot: true, handleR: 70 }, o);

  const SCENES = [];

  // ================= 1 · MEJA LASER (seperti video) =================
  SCENES.push({
    id: 'meja', icon: '🔦', short: 'Meja Laser', kick: 'Pembuka',
    title: 'Cahaya itu <i>lurus</i>… sampai bertemu kaca',
    story: 'Satu kotak laser dan empat keping kaca, persis seperti di video. Di udara cahaya melaju <b>lurus</b>. Begitu menembus kaca ia <b>melambat lalu berbelok</b>, dan di cermin ia <b>memantul</b>. Seret kotak laser ke tiap benda.',
    fact: { t: 'Di udara cahaya melaju ±300.000 km per detik. Di dalam kaca ia melambat menjadi ±200.000 km/detik. Perlambatan inilah yang membuatnya berbelok saat masuk kaca dengan miring: <b>pembiasan</b>. Indeks bias kaca n ≈ 300.000 ÷ 200.000 = 1,5.', src: 'Hukum Snell · Willebrord Snellius, 1621' },
    hint: 'Seret kotak laser · putar lewat gagang ⟳ / dua jari',
    init: () => ({ seen: [], view: { x0: -430, y0: -330, x1: 560, y1: 330 },
      el: [LASER({ x: -330, y: -215, rays: 5, gap: 13, bounds: { x0: -420, y0: -320, x1: -150, y1: 320 } }),
        { id: 'c1', type: 'cembung', name: 'lensa cembung', x: -40, y: -215, R: 150, t: 46, n: 'kaca', label: 'lensa cembung', labelDy: -100 },
        { id: 'c2', type: 'cekung', name: 'lensa cekung', x: -40, y: -70, R: 110, t: 12, H: 50, n: 'kaca', label: 'lensa cekung', labelDy: -70 },
        { id: 'p', type: 'prisma', name: 'prisma', x: -40, y: 85, a: Math.PI, s: 120, n: 'kaca', label: 'prisma', labelDy: -82 },
        { id: 'm', type: 'cerminCekung', name: 'cermin lengkung', x: 20, y: 240, R: 300, L: 120, label: 'cermin lengkung', labelDy: 80 }] }),
    after: (S, R) => { for (const el of R.touched) if (el.id && el.id !== 'box' && !S.seen.includes(el.id)) S.seen.push(el.id); },
    missions: [{ t: 'Tembakkan laser ke <b>keempat</b> benda: lensa cembung, lensa cekung, prisma, cermin lengkung.', check: S => S.seen.length >= 4, state: S => `Sudah disinari: ${S.seen.length}/4 · ${S.seen.map(i => ({ c1: 'cembung', c2: 'cekung', p: 'prisma', m: 'cermin' }[i])).join(', ') || '—'}` }],
    controls: [
      { type: 'range', label: 'Jumlah berkas', min: 1, max: 7, get: S => S.el[0].rays, set: (S, v) => S.el[0].rays = v },
      { type: 'seg', label: 'Cahaya', opts: [['merah', '🔴 Laser'], ['putih', '⚪ Putih']], get: S => S.el[0].putih ? 'putih' : 'merah', set: (S, v) => S.el[0].putih = v === 'putih' },
    ],
    hud: (S, R) => [`benda tersinari <b>${S.seen.length}/4</b>`, 'n kaca ≈ <b>1,5</b>'],
  });

  // ================= 2 · LENSA CEMBUNG =================
  const convexH = 150, tOf = R => 2 * (R - Math.sqrt(R * R - convexH * convexH));
  function bestFocus(S, R) { // berkas yang baru keluar dari permukaan belakang lensa (layar boleh menghalangi)
    const L = S.el[1], ts = R.segs.filter(s => s.I > .3 && s.a.x > L.x && s.a.x < L.x + L.t / 2 + 2 && s.b.x > s.a.x + 1); if (ts.length < 2) return null; let best = { x: 0, w: 1e9 };
    for (let x = S.el[1].x + 20; x < 560; x += 2) { const w = spreadAt(ts, x); if (w < best.w) best = { x, w }; } return best; }
  SCENES.push({
    id: 'cembung', icon: '🔍', short: 'Lensa Cembung', kick: 'Pengumpul cahaya',
    title: 'Lensa cembung <i>mengumpulkan</i> cahaya',
    story: 'Lensa cembung tebal di tengah dan tipis di tepi. Setiap berkas dibelokkan ke arah sumbu, lalu semuanya <b>bertemu di satu titik: fokus</b>. Geser layar sampai titik cahayanya paling kecil, lalu ukur jarak fokusnya.',
    fact: { t: '<b>Ibnu al-Haitsam</b> (±965–1040) dalam <i>Kitab al-Manazir</i> membuktikan lewat percobaan bahwa kita melihat karena cahaya <b>masuk</b> ke mata, bukan mata yang memancarkan sinar. Ia juga meneliti pembiasan pada bola kaca. Itulah cikal bakal lensa, kacamata, dan kamera.', src: 'Kitab al-Manazir (Buku Optika), ±1011–1021 M' },
    hint: 'Seret layar hitam ke kiri–kanan',
    init: () => ({ view: { x0: -430, y0: -250, x1: 570, y1: 250, axis: true },
      el: [LASER({ x: -360, y: 0, rays: 7, gap: 20, drag: 'y', rot: false, bounds: { x0: -400, y0: -60, x1: -300, y1: 60 } }),
        { id: 'L', type: 'cembung', name: 'lensa', x: -110, y: 0, R: 260, t: tOf(260), n: 'kaca', label: 'lensa cembung', labelDy: -175 },
        { id: 'scr', type: 'layar', name: 'layar', x: 330, y: 0, L: 240, drag: 'x', bounds: { x0: -40, y0: 0, x1: 540, y1: 0 }, label: 'layar', labelDy: 140 }] }),
    after: (S, R) => { S.best = bestFocus(S, R); const h = hitsOn(R, S.el[2]).filter(h => h.I > .3).map(h => h.p.y); S.spot = h.length > 1 ? Math.max(...h) - Math.min(...h) : null; },
    missions: [
      { t: 'Geser <b>layar</b> ke titik fokus: titik cahaya sekecil mungkin.', check: S => S.best && S.spot != null && Math.abs(S.el[2].x - S.best.x) < 14, state: S => S.spot == null ? 'Layar belum terkena cahaya.' : `Lebar titik cahaya di layar: ${fx(S.spot)} mm` },
      { t: 'Rekayasa lensa kuat: buat <b>jarak fokus di bawah 15 cm</b>. Lengkungkan lensa atau ganti bahan.', check: S => S.best && S.best.x - S.el[1].x < 150, state: S => S.best ? `Fokus sekarang ±${cm(S.best.x - S.el[1].x)} cm dari pusat lensa` : '' },
    ],
    controls: [
      { type: 'range', label: 'Kelengkungan', min: 160, max: 520, step: 4, get: S => 680 - S.el[1].R, set: (S, v) => { const L = S.el[1]; L.R = 680 - v; L.t = tOf(L.R); }, fmt: (v, S) => `R ${cm(S.el[1].R)} cm` },
      { type: 'seg', label: 'Bahan', opts: [['akrilik', 'Akrilik'], ['kaca', 'Kaca'], ['berlian', 'Berlian']], get: S => S.el[1].n, set: (S, v) => S.el[1].n = v },
    ],
    hud: (S, R) => { const n = O.nOf(S.el[1], O.LASER_WL); return [`n = <b>${fx(n, 3)}</b>`, S.best ? `fokus ±<b>${cm(S.best.x - S.el[1].x)} cm</b>` : 'fokus: —', S.spot != null ? `titik <b>${fx(S.spot)} mm</b>` : 'layar gelap', { t: Math.abs(S.el[2].x - (S.best?.x ?? 1e9)) < 14 ? '✔ tepat di fokus' : 'geser layar…', ok: Math.abs(S.el[2].x - (S.best?.x ?? 1e9)) < 14 }]; },
    over: (ctx, S) => { if (!S.best || S.mi < 1) return; ctx.save(); ctx.fillStyle = '#e5383b'; ctx.beginPath(); ctx.arc(S.best.x, 0, 6, 0, 7); ctx.fill(); ctx.restore(); },
  });

  // ================= 3 · LENSA CEKUNG + PELEBAR BERKAS =================
  SCENES.push({
    id: 'cekung', icon: '↔️', short: 'Lensa Cekung', kick: 'Penyebar & pelebar berkas',
    title: 'Lensa cekung <i>menyebarkan</i> cahaya',
    story: 'Lensa cekung tipis di tengah. Berkas justru <b>menyebar</b>, seolah keluar dari satu titik di belakang lensa: <b>fokus maya</b>. Pasangkan dengan lensa cembung supaya berkas jadi <b>lebar dan sejajar lagi</b>. Itulah pelebar berkas laser.',
    fact: { t: '<b>Kacamata minus</b> memakai lensa cekung. Pada mata miopi, bayangan jatuh di depan retina, dan lensa cekung menggesernya mundur tepat ke retina. Pasangan cekung + cembung juga dipakai sebagai pelebar berkas laser di pabrik, dan menjadi susunan <b>teleskop Galileo</b> (1609).', src: 'Optika geometri · lensa negatif (f < 0)' },
    hint: 'Seret lensa cembung ke kiri–kanan',
    init: () => ({ ghost: true, view: { x0: -430, y0: -240, x1: 570, y1: 240, axis: true },
      el: [LASER({ x: -370, y: 0, rays: 5, gap: 12, drag: false, rot: false }),
        { id: 'neg', type: 'cekung', name: 'lensa cekung', x: -230, y: 0, R: 120, t: 10, H: 80, n: 'kaca', label: 'cekung (f ≈ −12 cm)', labelDy: -110 },
        { id: 'pos', type: 'cembung', name: 'lensa cembung', x: 220, y: 0, R: 420, t: 2 * (420 - Math.sqrt(420 * 420 - 190 * 190)), n: 'kaca', drag: 'x', bounds: { x0: -150, y0: 0, x1: 480, y1: 0 }, label: 'cembung (f ≈ +40 cm)', labelDy: -215 }] }),
    after: (S, R) => { const ts = tails(R).filter(s => s.a.x > S.el[2].x - 40); S.tail = ts; S.out = ts.length >= 3 ? (Math.max(...ts.map(ang)) - Math.min(...ts.map(ang))) / D : null; S.wide = ts.length >= 3 ? spreadAt(ts, 560) : 0; },
    missions: [{ t: 'Geser lensa cembung sampai berkas keluar <b>sejajar</b> lagi (sebaran sudut < 1°), dan lebih lebar dari berkas awal.', check: S => S.out != null && S.out < 1 && S.wide > 2 * 48, state: S => S.out == null ? 'Berkas belum melewati lensa cembung.' : `Sebaran sudut keluaran: ${fx(S.out)}° · lebar berkas ${cm(S.wide)} cm (awal 4,8 cm)` }],
    controls: [{ type: 'seg', label: 'Garis bantu', opts: [[1, 'Tampil'], [0, 'Sembunyi']], get: S => S.ghost ? 1 : 0, set: (S, v) => S.ghost = !!v }],
    hud: S => [S.out != null ? `sebaran keluar <b>${fx(S.out)}°</b>` : 'sebaran: —', `jarak lensa <b>${cm(S.el[2].x - S.el[1].x)} cm</b>`, { t: S.out != null && S.out < 1 ? '✔ sejajar!' : 'belum sejajar', ok: S.out != null && S.out < 1 }],
    under: (ctx, S, R) => { if (!S.ghost || !R) return; // perpanjang mundur berkas setelah lensa cekung → fokus maya
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#e5383b88'; ctx.lineWidth = 1.4;
      for (const s of R.segs) if (s.I > .3 && Math.abs(s.a.x - (S.el[1].x + 10)) < 14 && s.b.x > s.a.x + 20) { const d = V.norm(V.sub(s.b, s.a)); const k = (S.el[1].x - 160 - s.a.x) / d.x; ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.a.x + d.x * k, s.a.y + d.y * k); ctx.stroke(); }
      ctx.restore(); },
  });

  // ================= 4 · PRISMA & PELANGI =================
  SCENES.push({
    id: 'prisma', icon: '🌈', short: 'Prisma', kick: 'Membelokkan & mengurai cahaya',
    title: 'Prisma <i>membelokkan</i> dan mengurai cahaya',
    story: 'Cahaya dibelokkan <b>dua kali</b>: saat masuk dan saat keluar prisma, selalu ke arah alasnya. Putar prisma supaya laser mengenai sasaran merah. Lalu nyalakan <b>cahaya putih</b>: warna ungu terbelok paling kuat dan merah paling lemah, sehingga muncul pelangi.',
    fact: { t: '<b>Isaac Newton</b> (1666) menggelapkan kamarnya dan melewatkan sinar matahari melalui prisma. Ia membuktikan cahaya putih adalah <b>campuran semua warna</b>, dan prisma kedua bisa menyatukannya lagi. Pelangi terjadi karena jutaan tetes air hujan bekerja seperti prisma kecil.', src: 'Newton, Opticks (1704)' },
    hint: 'Putar prisma lewat gagang ⟳, dua jari, atau tombol',
    init: () => ({ view: { x0: -430, y0: -200, x1: 520, y1: 330 },
      el: [LASER({ x: -360, y: 40, rays: 1, w: 46, drag: false, rot: false }),
        { id: 'pr', type: 'prisma', name: 'prisma', x: -80, y: 40, a: Math.PI + 35 * D, s: 170, n: 'flint', rot: true, handleR: 125, label: 'prisma kaca flint', labelDy: -120 },
        { id: 'tg', type: 'target', name: 'sasaran', x: 150, y: 285, a: 48.5 * D, L: 70, label: '🎯 sasaran', labelDy: 46 },
        { id: 'scr', type: 'layar', name: 'layar', x: 440, y: 230, a: 35 * D, L: 230, hidden: true }] }),
    missions: [
      { t: 'Putar prisma sampai laser mengenai <b>🎯 sasaran</b> merah.', check: (S, R) => hitsOn(R, S.el[2]).some(h => h.I > .3), state: S => `sudut prisma ${fx((S.el[1].a - Math.PI) / D)}°` },
      { t: 'Nyalakan <b>⚪ cahaya putih</b> dan amati warna mana yang paling dibelokkan.', check: S => S.el[0].putih, state: () => 'Tekan tombol ⚪ Putih.' },
    ],
    finale: 'Ungu (gelombang terpendek) paling kuat dibelokkan: indeks bias kaca bergantung warna. Itulah <b>dispersi</b>.',
    controls: [
      { type: 'range', label: 'Putar prisma', min: -40, max: 60, step: .5, get: S => +((S.el[1].a - Math.PI) / D).toFixed(1), set: (S, v) => S.el[1].a = Math.PI + v * D, fmt: v => fx(v) + '°' },
      { type: 'seg', label: 'Cahaya', opts: [['merah', '🔴 Laser'], ['putih', '⚪ Putih']], get: S => S.el[0].putih ? 'putih' : 'merah', set: (S, v) => { S.el[0].putih = v === 'putih'; } },
    ],
    hud: (S, R) => { const t = tails(R)[0]; const dev = t ? ang(t) / D : null; return [`n merah <b>${fx(O.nOf({ n: 'flint' }, .66), 3)}</b> · ungu <b>${fx(O.nOf({ n: 'flint' }, .41), 3)}</b>`, dev != null ? `deviasi <b>${fx(dev)}°</b>` : '', { t: hitsOn(R, S.el[2]).length ? '✔ kena sasaran' : 'belum kena', ok: !!hitsOn(R, S.el[2]).length }]; },
  });

  // ================= 5 · PANTULAN TOTAL =================
  const BLK = { x: 70, y: 40, R: 190 };
  function placeTIR(S) { const a = S.th * D, L = S.el[1], r = 360; L.x = BLK.x - Math.cos(a) * r; L.y = BLK.y - Math.sin(a) * r; L.a = a; }
  SCENES.push({
    id: 'tir', icon: '💎', short: 'Pantulan Total', kick: 'Cahaya terperangkap',
    title: 'Pantulan <i>total</i>: cahaya tak bisa keluar',
    story: 'Laser selalu mengarah ke pusat balok setengah lingkaran, jadi ia hanya berbelok di sisi datar. Perbesar <b>sudut datang</b>: berkas yang keluar makin rebah. Lewat dari <b>sudut kritis</b>, cahaya tidak bisa keluar dan <b>dipantulkan seluruhnya</b>, seperti tikungan prisma di video.',
    fact: { t: 'Sudut kritis kaca ±41,8°, air ±48,6°, dan berlian hanya ±24,4°. Karena sudutnya kecil, cahaya terperangkap memantul-mantul di dalam berlian sehingga tampak berkilau. Teropong binokular memakai prisma (Porro) yang memantulkan total tanpa cermin, dan serat optik bekerja dengan prinsip yang sama.', src: 'sin θc = n₂ / n₁' },
    hint: 'Seret laser memutari balok atau pakai penggeser',
    init: () => { const S = { th: 25, view: { x0: -340, y0: -330, x1: 470, y1: 300 },
      el: [{ id: 'blk', type: 'setengah', name: 'balok setengah lingkaran', x: BLK.x, y: BLK.y, a: 0, R: BLK.R, n: 'kaca', label: 'balok kaca', labelAt: () => ({ x: BLK.x - 95, y: BLK.y + 220 }) },
        LASER({ x: 0, y: 0, rays: 1, w: 44, drag: false, rot: false, orbit: { cx: BLK.x, cy: BLK.y, min: Math.PI + 1 * D, max: Math.PI + 85 * D, set: (S, a) => { S.th = Math.round((a - Math.PI) / D * 2) / 2; placeTIR(S); } } })] };
      S.el[1].orbit.min = -Math.PI + .01; S.el[1].orbit.max = -Math.PI / 2 + .02; // kuadran kiri-atas
      S.el[1].orbit.set = (S, a) => { S.th = Math.max(0, Math.min(85, Math.round((-(a + Math.PI)) / D * -2) / 2)); placeTIR(S); };
      placeTIR(S); return S; },
    moved: () => {},
    after: (S, R) => { const n1 = O.nOf(S.el[0], O.LASER_WL); S.crit = Math.asin(1 / n1) / D; S.tir = R.events.some(e => e.type === 'tir'); const e = R.events.find(e => e.type === 'bias' && e.n1 > 1.01); S.out = e ? e.r / D : null; },
    missions: [
      { t: 'Perbesar sudut datang sampai cahaya <b>tidak bisa keluar</b> dari sisi datar.', check: S => S.tir, state: S => `sudut datang ${fx(S.th)}° · sudut kritis ${fx(S.crit)}°` },
      { t: 'Cari <b>sudut kritis</b>: buat pantulan total pada sudut datang paling kecil (selisih ≤ 1,5° dari sudut kritis).', check: S => S.tir && S.th - S.crit <= 1.5, state: S => S.tir ? `pantul total di ${fx(S.th)}° (kritis ${fx(S.crit)}°)` : 'Belum pantul total.' },
      { t: 'Ganti ke <b>💎 berlian</b> dan buat pantulan total lagi. Berapa sudut kritisnya?', check: S => S.el[0].n === 'berlian' && S.tir, state: S => `bahan: ${O.GLASS[S.el[0].n].nama} · kritis ${fx(S.crit)}°` },
    ],
    controls: [
      { type: 'range', label: 'Sudut datang', min: 0, max: 85, step: .5, get: S => S.th, set: (S, v) => { S.th = v; placeTIR(S); }, fmt: v => fx(v) + '°' },
      { type: 'seg', label: 'Bahan', opts: [['air', '💧 Air'], ['kaca', 'Kaca'], ['berlian', '💎 Berlian']], get: S => S.el[0].n, set: (S, v) => S.el[0].n = v },
    ],
    hud: S => [`θ datang <b>${fx(S.th)}°</b>`, S.out != null && !S.tir ? `θ bias <b>${fx(S.out)}°</b>` : 'θ bias: —', `θ kritis <b>${fx(S.crit)}°</b>`, { t: S.tir ? '✔ PANTULAN TOTAL' : 'tembus keluar', ok: S.tir }],
    over: (ctx, S) => { ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#086cf099'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(BLK.x - 260, BLK.y); ctx.lineTo(BLK.x + 300, BLK.y); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = '#086cf0'; ctx.beginPath(); ctx.arc(BLK.x, BLK.y, 70, Math.PI, Math.PI + S.th * D); ctx.stroke();
      ctx.fillStyle = '#086cf0'; ctx.font = '700 22px sans-serif'; ctx.fillText(fx(S.th, 0) + '°', BLK.x - 130, BLK.y - 22); ctx.restore(); },
  });

  // ================= 6 · SERAT OPTIK =================
  const toBits = s => [...s].flatMap(ch => { const c = Math.min(255, ch.charCodeAt(0)); return c.toString(2).padStart(8, '0').split('').map(Number); });
  function fiberEl(S) { return { id: 'fb', type: 'serat', name: 'serat optik', x: -400, y: 150, a: 0, w: 34, clad: 8, nCore: 1.5, nClad: S.nClad, path: [{ t: 'lurus', len: 200 }, { t: 'busur', R: S.Rb, ang: -Math.PI / 2 }, { t: 'lurus', len: 40 }, { t: 'busur', R: S.Rb, ang: Math.PI / 2 }, { t: 'lurus', len: 230 }] }; }
  function rebuildFiber(S) {
    const f = fiberEl(S); S.el[1] = f; O.fiberPieces(f);
    const rc = S.el[2], e = f.end, a = f.endA; rc.x = e.x + Math.cos(a) * 6; rc.y = e.y + Math.sin(a) * 6; rc.a = a;
    const L = S.el[0], a0 = S.launch * D; L.a = a0; L.x = -400 - Math.cos(a0) * 36; L.y = 150 - Math.sin(a0) * 36;
  }
  SCENES.push({
    id: 'serat', icon: '📡', short: 'Serat Optik', kick: 'Internet dari cahaya',
    title: 'Serat optik: <i>internet</i> dari cahaya',
    story: 'Di dalam serat kaca, cahaya terus <b>memantul total</b> di dinding, terperangkap dan ikut berbelok mengikuti kabel. Kedipan cahaya berarti <b>1</b>, gelap berarti <b>0</b>. Begitulah pesan WhatsApp-mu menyeberangi lautan. Tapi awas: tikungan yang terlalu tajam membuat cahaya <b>bocor</b>.',
    fact: { t: '<b>Daniel Colladon</b> (1842) memperlihatkan cahaya ikut melengkung di dalam pancuran air. <b>Charles K. Kao</b> meraih Nobel Fisika 2009 karena membuktikan kaca super-murni bisa membawa cahaya puluhan km. Indonesia punya <b>Palapa Ring</b>, tulang punggung serat optik lebih dari 12.000 km di darat dan dasar laut.', src: 'Nobel Fisika 2009 · Kominfo (Palapa Ring, 2019)' },
    hint: 'Atur tikungan & sudut laser, lalu kirim pesan',
    init: () => { const S = { Rb: 90, launch: 12, nClad: 1.40, msg: 'HALO PILAR', tx: null, rx: '', view: { x0: -450, y0: -300, x1: 520, y1: 260 },
      el: [LASER({ x: -440, y: 150, rays: 3, gap: 8, w: 40, drag: false, rot: false }), null,
        { id: 'rc', type: 'penerima', name: 'penerima', L: 60, label: '📥 penerima', labelDy: 52 }] };
      rebuildFiber(S); return S; },
    after: (S, R) => { const src = S.el[0].rays; const got = hitsOn(R, S.el[2]).reduce((a, h) => a + h.I, 0); S.power = Math.min(1, got / src); S.bounces = R.events.filter(e => e.type === 'tir').length; },
    tick: (S, dt, api) => { if (!S.tx) return false; const T = S.tx; T.t += dt; const per = .07, n = Math.floor(T.t / per);
      while (T.i < Math.min(n, T.bits.length)) { const b = T.bits[T.i]; // bit 1 sampai bila daya cukup; daya lemah → bit hilang acak
        const ok = b === 0 || (S.power > .55 ? true : Math.random() < S.power * .9); T.recv.push(ok ? b : 0); T.i++; }
      if (T.i >= T.bits.length) { const s = []; for (let k = 0; k < T.recv.length; k += 8) s.push(String.fromCharCode(parseInt(T.recv.slice(k, k + 8).join(''), 2))); S.rx = s.join(''); S.tx = null; S.anim = false; S.sent = S.msg.toUpperCase(); api.retrace(); api.refreshCtl(); }
      return true; },
    missions: [
      { t: 'Kirim pesan <b>HALO PILAR</b> sampai diterima <b>utuh</b>.', check: S => S.rx && S.rx === S.sent && S.sent.length > 0, state: S => `daya sampai ${Math.round(S.power * 100)}%` + (S.rx ? ` · diterima: “${S.rx}”` : '') },
      { t: 'Rekayasa kabel: pesan tetap utuh walau tikungan <b>jari-jari ≤ 4 cm</b>. Atur sudut tembak & selubung.', check: S => S.rx === S.sent && S.lastRb <= 40, state: S => `jari-jari tikungan ${cm(S.Rb)} cm` },
    ],
    controls: [
      { type: 'range', label: 'Jari-jari tikungan', min: 20, max: 160, step: 2, get: S => S.Rb, set: (S, v) => { S.Rb = v; rebuildFiber(S); }, fmt: v => cm(v) + ' cm' },
      { type: 'range', label: 'Sudut tembak', min: 0, max: 35, step: 1, get: S => S.launch, set: (S, v) => { S.launch = v; rebuildFiber(S); }, fmt: v => v + '°' },
      { type: 'range', label: 'Selubung n', min: 100, max: 146, step: 1, get: S => Math.round(S.nClad * 100), set: (S, v) => { S.nClad = v / 100; rebuildFiber(S); }, fmt: v => fx(v / 100, 2) },
      { type: 'html', cls: 'msgbox', live: true, html: S => `<div class="row" style="flex-wrap:nowrap"><input id="jcMsg" maxlength="16" value="${String(S.msg).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}" aria-label="Pesan"><button class="btn pri" id="jcSend" type="button">📡 Kirim</button></div><div class="rx">${S.tx ? '⏳ mengirim ' + S.tx.i + '/' + S.tx.bits.length + ' bit…' : S.rx ? '📥 ' + [...S.rx].map((c, i) => c === (S.sent || '')[i] ? c.replace(/[<&]/g, '') : `<span class="bad">${c.replace(/[<&]/g, '') || '?'}</span>`).join('') : '📥 (belum ada pesan)'}</div>` },
    ],
    hud: S => [`daya sampai <b>${Math.round(S.power * 100)}%</b>`, `pantulan total <b>${S.bounces}×</b>`, `kritis inti/selubung <b>${fx(Math.asin(S.nClad / 1.5) / D)}°</b>`, 'Jakarta→Jayapura ±3.700 km ≈ <b>18,5 ms</b>'],
    over: (ctx, S) => { if (!S.tx) return; const f = S.el[1]; const pts = []; for (const pc of f.pieces) { const n = 24; for (let i = 0; i <= n; i++) { const t = i / n; if (pc.t === 'lurus') pts.push(V.add(pc.p, V.mul(V.sub(pc.q, pc.p), t))); else { const off = pc.dir > 0 ? -Math.PI / 2 : Math.PI / 2, a = pc.a0 + (pc.a1 - pc.a0) * t + off; pts.push({ x: pc.c.x + Math.cos(a) * pc.R, y: pc.c.y + Math.sin(a) * pc.R }); } } }
      const T = S.tx, per = .07, len = pts.length - 1; ctx.save();
      for (let k = Math.max(0, T.i - 12); k < Math.min(T.bits.length, T.i + 14); k++) { if (!T.bits[k]) continue; const pos = (T.t / per - k) / 14; if (pos < 0 || pos > 1) continue; const q = pts[Math.round(pos * len)]; ctx.fillStyle = '#ffe14d'; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, 7); ctx.fill(); }
      ctx.restore(); },
  });
  // tombol kirim (delegasi)
  document.addEventListener('click', e => { if (e.target.id !== 'jcSend') return; const J = window.PILAR_JC, S = J.S; S.msg = (document.getElementById('jcMsg').value || 'HALO').toUpperCase().slice(0, 16); S.lastRb = S.Rb;
    S.tx = { bits: toBits(S.msg), i: 0, t: 0, recv: [] }; S.rx = ''; S.anim = true; J.api.refreshCtl(); J.api.render(); });
  document.addEventListener('input', e => { if (e.target.id === 'jcMsg') window.PILAR_JC.S.msg = e.target.value; });

  // ================= 7 · CERMIN LENGKUNG =================
  SCENES.push({
    id: 'cermin', icon: '🪞', short: 'Cermin Lengkung', kick: 'Pengumpul panas & cahaya',
    title: 'Cermin cekung <i>memusatkan</i> cahaya',
    story: 'Cermin cekung memantulkan semua berkas ke <b>satu titik api</b>, separuh jari-jari kelengkungannya. Panci kecil di titik api akan panas, seperti kompor tenaga surya. Ganti ke cermin cembung: berkas justru menyebar, cocok untuk <b>spion</b> dan cermin tikungan jalan.',
    fact: { t: '<b>Newton</b> (1668) membuat teleskop pertama yang memakai cermin cekung, bukan lensa, sehingga bebas pelangi warna di tepi bayangan. Teleskop raksasa modern seperti James Webb memakai cermin cekung, begitu juga antena parabola dan pembangkit listrik tenaga surya terkonsentrasi.', src: 'f = R / 2' },
    hint: 'Seret panci ke titik api',
    init: () => ({ view: { x0: -430, y0: -250, x1: 480, y1: 250, axis: true },
      el: [LASER({ x: -380, y: 0, rays: 7, gap: 26, drag: 'y', rot: false, bounds: { x0: -400, y0: -60, x1: -300, y1: 60 } }),
        { id: 'mir', type: 'cerminCekung', name: 'cermin', x: 380, y: 0, R: 640, L: 300, label: 'cermin cekung', labelDy: -175 },
        { id: 'pot', type: 'target', name: 'panci', x: -120, y: -150, L: 36, drag: 'xy', bounds: { x0: -300, y0: -220, x1: 340, y1: 220 }, label: '🍳 panci', labelDy: 40 }] }),
    after: (S, R) => { const h = hitsOn(R, S.el[2]).filter(h => h.d.x < 0 && h.I > .2); S.heat = Math.min(1, h.length / S.el[0].rays); S.el[2].glow = S.heat; },
    missions: [
      { t: 'Seret 🍳 panci ke <b>titik api</b> sampai panas ≥ 85%.', check: S => S.heat >= .85 && S.el[1].type === 'cerminCekung', state: S => `panas ${Math.round(S.heat * 100)}%` },
      { t: 'Ganti ke <b>cermin cembung</b>. Bisakah panci dipanaskan?', check: S => S.el[1].type === 'cerminCembung', state: () => '' },
    ],
    finale: 'Cermin cembung tidak punya titik api nyata: sinar menyebar, tetapi pandangan jadi luas. Itu sebabnya dipakai sebagai spion.',
    controls: [{ type: 'seg', label: 'Cermin', opts: [['cerminCekung', 'Cekung'], ['cerminCembung', 'Cembung']], get: S => S.el[1].type, set: (S, v) => { S.el[1].type = v; S.el[1].label = v === 'cerminCekung' ? 'cermin cekung' : 'cermin cembung'; } },
      { type: 'range', label: 'Kelengkungan', min: 400, max: 1000, step: 10, get: S => S.el[1].R, set: (S, v) => S.el[1].R = v, fmt: v => 'f ' + cm(v / 2) + ' cm' }],
    hud: S => [`titik api ${S.el[1].type === 'cerminCekung' ? '±' + cm(S.el[1].R / 2) + ' cm di depan cermin' : 'maya (di belakang cermin)'}`, `🔥 panas <b>${Math.round(S.heat * 100)}%</b>`],
    under: (ctx, S) => { if (S.el[1].type !== 'cerminCekung') return; const fX = S.el[1].x - S.el[1].R / 2; ctx.save(); ctx.fillStyle = '#e5383b22'; ctx.beginPath(); ctx.arc(fX, 0, 20, 0, 7); ctx.fill(); ctx.restore(); },
  });

  // ================= 8 · KAMERA HP =================
  const CAM = { f: 5.6, k: 160 / 5.6, sensorH: 4.5, bg: 15000, lensX: 0 };
  function camSetup(S) {
    const k = CAM.k, f = CAM.f, s = S.s * 1000, h = 90; // bunga 9 cm
    const v = S.v, lensX = 170 - v * k; // sensor tetap di x=170, lensa yang digeser (seperti AF di HP)
    const L = elById(S, 'lens'), A = elById(S, 'ap'); L.x = lensX; A.x = lensX - 3; A.D = (f / S.N) * k; L.f = f * k;
    const sm = s * k, tip = elById(S, 'tip'), base = elById(S, 'base'), Dm = A.D;
    tip.x = lensX - sm; tip.y = -h * k; base.x = lensX - sm; base.y = 0;
    for (const p of [tip, base]) { const toC = Math.atan2(-p.y, lensX - p.x); p.a = toC; p.spread = Math.atan(Dm / 2 / Math.hypot(lensX - p.x, p.y)) * .98; p.rays = 7; }
  }
  const sImg = s => CAM.f * s / (s - CAM.f); // mm
  const coc = (S, smm) => (CAM.f / S.N) * Math.abs(S.v - sImg(smm)) / sImg(smm); // mm
  SCENES.push({
    id: 'kamera', icon: '📱', short: 'Kamera HP', kick: 'Lensa di sakumu',
    title: 'Kamera HP: lensa <i>sekecil biji jagung</i>',
    story: 'Lensa kamera HP memusatkan cahaya dari bunga menjadi <b>bayangan terbalik</b> di sensor. Benda dekat butuh lensa sedikit lebih jauh dari sensor, sehingga <b>autofokus</b> menggeser lensa beberapa mikrometer. <b>Bukaan</b> lebar (f/1,8) membuat latar buram: efek potret.',
    fact: { t: 'Kamera HP punya ±5–8 keping lensa plastik dengan jarak fokus hanya beberapa milimeter. Autofokus digerakkan <b>motor kumparan (VCM)</b> yang menggeser lensa dalam orde mikrometer. Lensa tele "periskop" memakai <b>prisma</b> untuk membelokkan cahaya 90° agar lensa panjang muat di badan HP yang tipis.', src: 'Model lensa tipis: 1/f = 1/s + 1/s′' },
    hint: 'Diagram diperbesar ±29× · layar HP di kanan atas',
    aux: { w: .34, ratio: 4 / 3, draw: (c, W, H, S) => camPreview(c, W, H, S) },
    init: () => { const S = { s: .3, v: 5.66, N: 2.8, flip: false, view: { x0: -420, y0: -190, x1: 230, y1: 190, axis: true, auxSide: true },
      el: [{ id: 'tip', type: 'lampu', x: 0, y: 0, col: '#ff9f1c' }, { id: 'base', type: 'lampu', x: 0, y: 0, col: '#ffd166' },
        { id: 'lens', type: 'tipis', name: 'lensa', x: 0, y: 0, L: 250, f: 160, label: 'lensa (geser AF)', labelDy: -150 },
        { id: 'ap', type: 'bukaan', x: 0, y: 0, D: 80, L: 270 },
        { id: 'sen', type: 'sensor', name: 'sensor', x: 170, y: 0, L: CAM.sensorH * CAM.k, label: 'sensor', labelDy: 90 }] };
      camSetup(S); return S; },
    after: S => { S.cs = coc(S, S.s * 1000); S.cb = coc(S, CAM.bg); },
    tick: (S, dt, api) => { if (S.af == null) return false; const tgt = sImg(S.s * 1000), d = tgt - S.v; if (Math.abs(d) < .0004) { S.v = tgt; S.af = null; S.anim = false; } else S.v += d * Math.min(1, dt * 9); camSetup(S); api.retrace(); api.refreshCtl(); return true; },
    missions: [
      { t: 'Putar <b>fokus</b> (atau tekan 🎯 AF) sampai bunga <b>tajam</b> di layar HP.', check: S => S.cs < .004, state: S => `buram bunga ${fx(S.cs * 1000)} µm (tajam < 4 µm)` },
      { t: 'Buat <b>foto potret</b>: bunga tajam, latar gunung <b>sangat buram</b> (> 100 µm). Dekatkan bunga & lebarkan bukaan.', check: S => S.cs < .004 && S.cb > .1, state: S => `bunga ${fx(S.cs * 1000)} µm · latar ${fx(S.cb * 1000)} µm` },
    ],
    controls: [
      { type: 'range', label: 'Jarak bunga', min: 0, max: 100, step: 1, get: S => Math.round(Math.log(S.s / .08) / Math.log(3 / .08) * 100), set: (S, v) => { S.s = .08 * Math.pow(3 / .08, v / 100); camSetup(S); }, fmt: (v, S) => S.s < 1 ? Math.round(S.s * 100) + ' cm' : fx(S.s, 2) + ' m' },
      { type: 'range', label: 'Putar fokus', min: 5600, max: 6060, step: 1, get: S => Math.round(S.v * 1000), set: (S, v) => { S.v = v / 1000; S.af = null; camSetup(S); }, fmt: (v, S) => '+' + Math.round((S.v - CAM.f) * 1000) + ' µm' },
      { type: 'seg', label: 'Bukaan', opts: [[1.8, 'f/1,8'], [2.8, 'f/2,8'], [4, 'f/4'], [8, 'f/8']], get: S => S.N, set: (S, v) => { S.N = +v; camSetup(S); } },
      { type: 'btns', btns: [{ label: '🎯 AF', cls: 'acc', on: (S, api) => { S.af = 1; S.anim = true; api.render(); } }, { label: '🔄 Lihat sensor', on: S => S.flip = !S.flip }] },
    ],
    hud: S => [`bunga <b>${S.s < 1 ? Math.round(S.s * 100) + ' cm' : fx(S.s, 2) + ' m'}</b>`, `butuh s′ <b>${fx(sImg(S.s * 1000), 3)} mm</b>`, `lensa–sensor <b>${fx(S.v, 3)} mm</b>`, { t: S.cs < .004 ? '✔ tajam' : `buram ${fx(S.cs * 1000)} µm`, ok: S.cs < .004 }],
    under: (ctx, S) => { // ikon bunga di tepi kiri (benda sebenarnya jauh di luar layar)
      ctx.save(); ctx.fillStyle = '#ff9f1c'; ctx.font = '700 22px sans-serif'; ctx.fillText(`🌼 ← bunga ${S.s < 1 ? Math.round(S.s * 100) + ' cm' : fx(S.s, 1) + ' m'} di kiri (di luar gambar)`, -410, 172); ctx.restore(); },
  });
  function camPreview(c, W, H, S) {
    const pxPerMm = H / CAM.sensorH, bl = mm => Math.min(40, mm * pxPerMm * .55);
    c.save(); c.clearRect(0, 0, W, H); if (S.flip) { c.translate(W, H); c.rotate(Math.PI); }
    // latar: langit + gunung + pepohonan (15 m)
    c.filter = `blur(${bl(S.cb).toFixed(2)}px)`;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7cc4ff'); g.addColorStop(.62, '#cfeaff'); g.addColorStop(.63, '#79b86b'); g.addColorStop(1, '#3f7f3a'); c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
    c.fillStyle = '#5b7fa6'; c.beginPath(); c.moveTo(-20, H * .64); c.lineTo(W * .25, H * .3); c.lineTo(W * .45, H * .5); c.lineTo(W * .7, H * .22); c.lineTo(W + 20, H * .6); c.lineTo(W + 20, H * .66); c.lineTo(-20, H * .66); c.fill();
    c.fillStyle = '#eef6ff'; c.beginPath(); c.moveTo(W * .66, H * .27); c.lineTo(W * .7, H * .22); c.lineTo(W * .745, H * .28); c.fill();
    for (let i = 0; i < 9; i++) { const x = (i + .5) * W / 9, h = H * (.12 + .05 * ((i * 7) % 3)); c.fillStyle = '#2f6b33'; c.beginPath(); c.moveTo(x, H * .64 - h); c.lineTo(x - h * .35, H * .66); c.lineTo(x + h * .35, H * .66); c.fill(); }
    // bunga (besar bayangan ∝ f/s)
    const img = CAM.f * 90 / (S.s * 1000) / CAM.sensorH, hh = Math.min(1.6, img) * H, cx = W * .5, base = H * .97;
    c.filter = `blur(${bl(S.cs).toFixed(2)}px)`;
    c.strokeStyle = '#2e7d32'; c.lineWidth = Math.max(2, hh * .05); c.beginPath(); c.moveTo(cx, base); c.quadraticCurveTo(cx - hh * .1, base - hh * .5, cx, base - hh * .78); c.stroke();
    const r = hh * .2, fy = base - hh * .8; c.fillStyle = '#ffd23f'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.ellipse(cx + Math.cos(a) * r * .95, fy + Math.sin(a) * r * .95, r * .62, r * .32, a, 0, 7); c.fill(); }
    c.fillStyle = '#8d5524'; c.beginPath(); c.arc(cx, fy, r * .5, 0, 7); c.fill();
    c.restore(); c.filter = 'none';
    // HUD kamera
    c.fillStyle = '#0008'; c.fillRect(0, 0, W, 26); c.fillStyle = '#fff'; c.font = '600 13px sans-serif'; c.fillText(`📷 f/${String(S.N).replace('.', ',')} · ${S.cs < .004 ? 'TAJAM ✓' : 'buram'}`, 10, 18);
    if (S.flip) { c.fillStyle = '#ffd23f'; c.fillText('bayangan asli di sensor: TERBALIK', 10, H - 10); }
    c.strokeStyle = S.cs < .004 ? '#22c55e' : '#ffffffaa'; c.lineWidth = 2; const fw = W * .2; c.strokeRect(cx - fw / 2, H * .55 - fw / 2, fw, fw);
  }

  // ================= 9 · TEROPONG BINTANG =================
  const TEL = { x0: -560, D: 80, alpha: 0.2 * D }; // sudut bintang kecil agar sinar keluar (α·M) tetap < 60°
  function telSetup(S) {
    const ob = elById(S, 'ob'), ok = elById(S, 'ok'), las = elById(S, 'star');
    ob.x = TEL.x0; ob.f = S.fo; ok.x = TEL.x0 + S.d; ok.f = S.fe; ok.L = Math.max(40, S.fo * Math.tan(TEL.alpha) * 2 + 30);
    las.a = TEL.alpha; las.x = TEL.x0 - 160; las.y = -Math.tan(TEL.alpha) * 160; las.gap = TEL.D / 5; las.rays = 5;
    S.view.x1 = Math.max(260, TEL.x0 + S.d + S.fe * 2 + 120);
  }
  SCENES.push({
    id: 'teropong', icon: '🔭', short: 'Teropong Bintang', kick: 'Mendekatkan langit',
    title: 'Teropong: dua lensa <i>mendekatkan</i> bintang',
    story: 'Lensa <b>objektif</b> (jarak fokus panjang) membentuk bayangan Bulan. Lensa <b>okuler</b> (jarak fokus pendek) memperbesarnya untuk mata. Fokus tercapai saat jarak kedua lensa = f<sub>ob</sub> + f<sub>ok</sub>, dan sinar keluar sejajar. <b>Perbesaran = f<sub>ob</sub> ÷ f<sub>ok</sub></b>.',
    fact: { t: '<b>Galileo</b> (1609) membuat teropong ±20× dan pada Januari 1610 menemukan 4 bulan Jupiter. Di Lembang, Jawa Barat, <b>Observatorium Bosscha</b> memakai teleskop refraktor ganda Zeiss berlensa objektif 60 cm sejak 1928. ⚠️ Jangan pernah mengarahkan teropong ke Matahari: mata bisa buta seketika.', src: 'M = f_ob / f_ok · Bosscha (berdiri 1923)' },
    hint: 'Sudut bintang dibesarkan agar terlihat · pandangan okuler di kanan atas',
    aux: { w: .3, ratio: 1, draw: (c, W, H, S) => eyeView(c, W, H, S) },
    init: () => { const S = { fo: 700, fe: 25, d: 680, tgt: 'bulan', view: { x0: -760, y0: -150, x1: 400, y1: 150, axis: true, grid: 100, auxSide: true },
      el: [LASER({ id: 'star', x: 0, y: 0, rays: 5, w: 0.1, drag: false, rot: false, col: '#ffd23f' }),
        { id: 'ob', type: 'tipis', name: 'objektif', x: 0, y: 0, L: TEL.D + 10, f: 700, label: 'objektif', labelDy: -75 },
        { id: 'ok', type: 'tipis', name: 'okuler', x: 0, y: 0, L: 34, f: 25, col: '#e5383b', label: 'okuler', labelDy: -55 }] };
      S.el[0].col = '#f59e0b'; telSetup(S); return S; },
    after: (S, R) => { const ts = R.segs.filter(s => s.a.x > TEL.x0 + S.d - .01 && Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) > 5e4); S.M = S.fo / S.fe;
      if (ts.length >= 2) { const as = ts.map(ang); S.spread = (Math.max(...as) - Math.min(...as)) / D; S.beta = Math.abs(as.reduce((a, b) => a + b) / as.length) / D; } else { S.spread = 99; S.beta = 0; }
      S.focus = Math.abs(S.d - (S.fo + S.fe)) <= Math.max(1.5, S.fe * .06); },
    missions: [
      { t: 'Atur <b>jarak lensa</b> sampai sinar keluar <b>sejajar</b>: Bulan tampak tajam.', check: S => S.focus, state: S => `jarak ${S.d} mm · harusnya f_ob + f_ok = ${S.fo + S.fe} mm` },
      { t: 'Lihat <b>kawah Bulan</b> dengan perbesaran ≥ 25× dan tetap tajam.', check: S => S.tgt === 'bulan' && S.M >= 25 && S.focus, state: S => `perbesaran ${fx(S.M)}×` },
      { t: 'Arahkan ke <b>🪐 Saturnus</b>: lihat cincinnya pada 80×–160× (lebih dari 160× = perbesaran kosong, buram).', check: S => S.tgt === 'saturnus' && S.M >= 80 && S.M <= 160 && S.focus, state: S => `perbesaran ${fx(S.M)}× · fokus ${S.focus ? '✔' : '✘'}` },
    ],
    controls: [
      { type: 'range', label: 'f objektif', min: 300, max: 1200, step: 10, get: S => S.fo, set: (S, v) => { const keep = S.d - S.fo; S.fo = v; S.d = Math.round(v + keep); telSetup(S); }, fmt: v => v + ' mm' },
      { type: 'range', label: 'f okuler', min: 5, max: 40, step: 1, get: S => S.fe, set: (S, v) => { S.fe = v; telSetup(S); }, fmt: v => v + ' mm' },
      { type: 'range', label: 'Jarak lensa', min: 280, max: 1260, step: 1, get: S => S.d, set: (S, v) => { S.d = v; telSetup(S); }, fmt: v => v + ' mm' },
      { type: 'seg', label: 'Sasaran', opts: [['bulan', '🌕 Bulan'], ['jupiter', 'Jupiter'], ['saturnus', '🪐 Saturnus']], get: S => S.tgt, set: (S, v) => S.tgt = v },
    ],
    hud: S => [`perbesaran <b>${fx(S.M)}×</b>`, `tabung <b>${fx(S.d / 10)} cm</b>`, { t: S.focus ? '✔ fokus (sinar sejajar)' : `buram · sebaran ${fx(S.spread, 2)}°`, ok: S.focus }, S.M > 160 ? '⚠️ > 2×D: perbesaran kosong' : ''],
    over: (ctx, S) => { const ex = TEL.x0 + S.d + S.fe; ctx.save(); ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👁️', ex + 40, 0); ctx.restore(); },
  });
  function eyeView(c, W, H, S) {
    const R = Math.min(W, H) / 2 - 6, cx = W / 2, cy = H / 2, FOV = 20; // tampil 20° pusat pandangan
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip();
    c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { const x = (Math.sin(i * 91.7) * .5 + .5) * W, y = (Math.sin(i * 37.3 + 1) * .5 + .5) * H; c.fillStyle = '#ffffff' + (i % 3 ? '55' : 'aa'); c.fillRect(x, y, 1.4, 1.4); }
    const M = S.M, blur = Math.min(14, S.focus ? 0 : Math.abs(S.d - (S.fo + S.fe)) / S.fe * 3 + .8) + (M > 160 ? (M - 160) * .05 : 0);
    const sz = deg => deg * M / FOV * 2 * R; c.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    if (S.tgt === 'bulan') { const r = sz(.52) / 2; const g = c.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r); g.addColorStop(0, '#f2f0e8'); g.addColorStop(1, '#a9a598'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
      c.fillStyle = '#8a867b88'; for (const [x, y, s] of [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12], [.35, -.35, .1], [-.45, .25, .09], [.1, -.05, .07], [.0, -.5, .08]]) { c.beginPath(); c.arc(cx + x * r, cy + y * r, s * r, 0, 7); c.fill(); }
      c.fillStyle = '#6e6a6188'; c.beginPath(); c.ellipse(cx - .1 * r, cy - .05 * r, .32 * r, .22 * r, .4, 0, 7); c.fill(); }
    else if (S.tgt === 'jupiter') { const r = Math.max(1.5, sz(45 / 3600) / 2); c.fillStyle = '#e8c9a0'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.fillStyle = '#b07a4f'; c.fillRect(cx - r, cy - r * .25, 2 * r, r * .14); c.fillRect(cx - r, cy + r * .12, 2 * r, r * .12);
      for (const [am, s] of [[2.1, 1], [-3.3, 1], [5.6, -1], [-9.4, 1]]) { const x = cx + sz(am / 60); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, cy + s * .5, Math.max(1.2, r * .08), 0, 7); c.fill(); } }
    else { const r = Math.max(1.2, sz(18 / 3600) / 2), rr = sz(42 / 3600) / 2; c.strokeStyle = '#d9c38f'; c.lineWidth = Math.max(1, r * .28); c.beginPath(); c.ellipse(cx, cy, rr * .92, rr * .32, -.35, 0, 7); c.stroke();
      c.fillStyle = '#e6d3a3'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.strokeStyle = '#d9c38f'; c.beginPath(); c.ellipse(cx, cy, rr * .92, rr * .32, -.35, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
    c.restore(); c.filter = 'none';
    c.strokeStyle = '#334155'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
    c.fillStyle = '#fff'; c.font = '600 12px sans-serif'; c.textAlign = 'center'; c.fillText(`👁 okuler · ${fx(M)}× · pusat ${FOV}°`, cx, H - 12);
  }

  // ================= 10 · BENGKEL REKAYASA =================
  const PROJ = [
    { id: 'fiber', pic: '📡', t: 'Kirim Pesan Lewat Cahaya', why: 'Bangun "internet mini": huruf → kedipan LED → serat optik plastik → sensor → huruf lagi.',
      bahan: ['Kabel serat optik plastik Ø 1–2 mm (lampu hias/toko elektronik)', 'LED merah terang + resistor 220 Ω', 'Fototransistor/LDR + resistor 10 kΩ', 'Arduino Uno / ESP32 + kabel jumper', 'Selotip hitam (biar gelap)'],
      langkah: ['Program Arduino: ubah huruf jadi 8 bit, kedipkan LED (1 = nyala).', 'Tempel rapat ujung serat ke LED, ujung lain ke sensor. Bungkus selotip hitam.', 'Baca sensor → susun bit → tampilkan huruf di Serial Monitor.', 'Uji seperti Bab 6: tekuk serat makin tajam. Kapan pesan rusak? Catat!'],
      aman: 'Jangan menatap LED/laser terang langsung. Versi tanpa Arduino: <b>pancuran cahaya Colladon</b>, yaitu botol air berlubang + senter/laser.' },
    { id: 'makro', pic: '📱', t: 'Lensa Makro HP', why: 'Ubah kamera HP jadi mikroskop mini: lihat serat daun, sayap serangga, sampai titik RGB layar.',
      bahan: ['Lensa kecil: dari pointer laser mainan / pemutar DVD bekas', 'atau setetes air di plastik bening (lensa air)', 'Selotip / jepit baju', 'Penggaris & benda kecil untuk difoto'],
      langkah: ['Tempel lensa tepat di depan kamera utama HP.', 'Dekatkan objek 1–3 cm, geser sampai tajam (ingat Bab 8: jarak menentukan fokus).', 'Foto daun, kain, layar HP. Bandingkan tanpa lensa.', 'Ukur jarak tajam terdekat → perkirakan jarak fokus lensamu.'],
      aman: 'Pasang dan lepas dengan lembut, jangan dilem permanen. Bersihkan kamera dengan kain mikrofiber.' },
    { id: 'teropong', pic: '🔭', t: 'Teropong Bintang Pipa Paralon', why: 'Teropong Galileo/Kepler sungguhan dari bahan murah. Cukup untuk melihat kawah Bulan dan bulan Jupiter.',
      bahan: ['Lensa kacamata baca +1 dioptri (f = 100 cm) → objektif', 'Lup / kaca pembesar f ≈ 3–5 cm → okuler', '2 pipa paralon/karton yang bisa saling geser', 'Cat hitam doff (bagian dalam) + lem tembak'],
      langkah: ['Pasang objektif di ujung pipa besar, okuler di ujung pipa kecil.', 'Panjang total ≈ f_ob + f_ok (Bab 9!).', 'Geser pipa kecil untuk fokus. Uji ke menara jauh, lalu ke Bulan.', 'Hitung perbesaran: 100 cm ÷ 4 cm = 25×.'],
      aman: '⚠️ JANGAN PERNAH diarahkan ke Matahari, karena bisa membutakan seketika. Amati Bulan dan bintang saja.' },
  ];
  SCENES.push({
    id: 'bengkel', icon: '🛠️', short: 'Bengkel Rekayasa', kick: 'Giliran tanganmu',
    title: 'Bengkel <i>Rekayasa</i>: bangun yang nyata',
    story: 'Semua yang kamu coba tadi adalah dasar teknologi sungguhan: <b>kabel internet bawah laut, kamera HP, teleskop Bosscha</b>. Sekarang pilih satu proyek, rakit bersama timmu, ukur, lalu ceritakan hasilnya ke kelas.',
    fact: { t: 'Para penemu memulai dari alat sederhana. Colladon memakai pancuran air, Galileo menggosok lensanya sendiri, dan Kao menguji kaca di laboratorium kecil. Rekayasa yang berdampak dimulai dari <b>rasa penasaran + mencoba + mencatat</b>.', src: 'Teknik rekayasa: rancang → bangun → uji → perbaiki' },
    shop: (S, api, box) => {
      box.innerHTML = PROJ.map(p => `<article class="proj${S.pick === p.id ? ' pick' : ''}" data-p="${p.id}"><div class="pic">${p.pic}</div><h3>${p.t}</h3><p class="why">${p.why}</p><h4>Bahan</h4><ul>${p.bahan.map(b => `<li>${b}</li>`).join('')}</ul><h4>Langkah</h4><ol>${p.langkah.map(b => `<li>${b}</li>`).join('')}</ol><div class="safe">⚠️ ${p.aman}</div><button class="btn ${S.pick === p.id ? 'acc' : 'pri'}" data-pick="${p.id}" type="button">${S.pick === p.id ? '✔ Proyek timku' : '✋ Aku mau bangun ini'}</button></article>`).join('');
      box.onclick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; S.pick = b.dataset.pick; try { localStorage.setItem('jc_proyek', S.pick); } catch (_) {} SCENES[9].shop(S, api, box); api.retrace(); api.ui(); api.toast('🛠️ Proyek dipilih! Cetak lembarnya dan mulai merakit'); };
      requestAnimationFrame(() => api.fitPanel());
    },
    init: () => { let pick = null; try { pick = localStorage.getItem('jc_proyek'); } catch (_) {} return { pick, dio: 1, fe: 4, view: { x0: 0, y0: 0, x1: 1, y1: 1 }, el: [] }; },
    missions: [{ t: 'Pilih satu proyek untuk timmu, lalu cetak lembar proyeknya.', check: S => !!S.pick, state: S => S.pick ? 'Dipilih: ' + PROJ.find(p => p.id === S.pick).t : 'Belum memilih.' }],
    finale: 'Proyek terpilih. Rakit, ukur, foto hasilnya. Simulasi Jalan Cahaya bisa dipakai lagi untuk memeriksa hitunganmu.',
    controls: [
      { type: 'range', label: 'Lensa objektif', min: 25, max: 400, step: 25, get: S => Math.round(S.dio * 100), set: (S, v) => S.dio = v / 100, fmt: v => '+' + fx(v / 100, 2) + ' D' },
      { type: 'range', label: 'f okuler (lup)', min: 2, max: 8, step: .5, get: S => S.fe, set: (S, v) => S.fe = v, fmt: v => fx(v) + ' cm' },
      { type: 'html', live: true, html: S => { const fo = 100 / S.dio; return `<div class="rx">🔭 f_ob = 100 ÷ ${fx(S.dio, 2)} D = <b>${fx(fo)} cm</b> · perbesaran <b>${fx(fo / S.fe)}×</b> · panjang tabung ±<b>${fx(fo + S.fe)} cm</b></div>`; } },
      { type: 'btns', btns: [{ label: '🖨️ Cetak lembar proyek', cls: 'acc', on: () => window.print() }] },
    ],
  });

  window.JC_SCENES = SCENES;
})();
