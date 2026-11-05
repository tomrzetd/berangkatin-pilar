/* PILAR · Lingkaran Ajaib — matematika murni (bisa diuji: node apps/lingkaran-ajaib/test-fourier.js)
   - Bentuk dasar sebagai lintasan tertutup (titik kompleks x+iy)
   - Pencuplikan ulang berdasarkan panjang busur (agar lingkaran berputar dengan laju rata)
   - DFT → daftar lingkaran {f: frekuensi, r: jari-jari, p: fase} diurutkan dari yang terbesar
   - Rekonstruksi dengan K lingkaran + skor kemiripan */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LingkaranMath = f(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TAU = Math.PI * 2;
  const SHAPES = {
    lingkaran: {name: 'Lingkaran', icon: '⭕', gen(n) { return Array.from({length: n}, (_, i) => { const t = i / n * TAU; return [Math.cos(t), Math.sin(t)]; }); }},
    hati: {name: 'Hati', icon: '❤️', gen(n) {
      return Array.from({length: n}, (_, i) => { const t = i / n * TAU, s = Math.sin(t);
        return [16 * s * s * s / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.1]; });
    }},
    bintang: {name: 'Bintang', icon: '⭐', gen(n) {
      const v = Array.from({length: 10}, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1; return [r * Math.cos(a), r * Math.sin(a)]; });
      return resample(v, n);
    }},
    persegi: {name: 'Persegi', icon: '🟦', gen(n) { return resample([[1, 1], [-1, 1], [-1, -1], [1, -1]].map(p => [p[0] * .8, p[1] * .8]), n); }},
    ikan: {name: 'Ikan', icon: '🐟', gen(n) {
      const v = [];
      for (let i = 0; i <= 24; i++) { const a = (150 - i * 12.5) * Math.PI / 180; v.push([0.2 + 0.75 * Math.cos(a), 0.48 * Math.sin(a)]); }
      v.push([-1, -0.5], [-0.82, 0], [-1, 0.5]);
      return resample(v, n);
    }}
  };
  /* Lintasan poligon (ditutup otomatis) → n titik berjarak busur sama */
  function resample(pts, n) {
    const P = pts.slice(); if (P.length < 2) return P;
    const first = P[0], last = P[P.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 1e-9) P.push(first);
    const seg = []; let L = 0;
    for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); L += d; }
    if (!L) return Array.from({length: n}, () => first.slice());
    const out = []; let j = 0, acc = 0;
    for (let k = 0; k < n; k++) {
      const target = k / n * L;
      while (j < seg.length - 1 && acc + seg[j] < target) { acc += seg[j]; j++; }
      const u = seg[j] ? (target - acc) / seg[j] : 0;
      out.push([P[j][0] + (P[j + 1][0] - P[j][0]) * u, P[j][1] + (P[j + 1][1] - P[j][1]) * u]);
    }
    return out;
  }
  /* Normalisasi: pusat ke 0, ukuran maks 1 */
  function normalize(pts) {
    let mx = 0, my = 0; pts.forEach(p => { mx += p[0]; my += p[1]; }); mx /= pts.length; my /= pts.length;
    let s = 0; pts.forEach(p => { s = Math.max(s, Math.abs(p[0] - mx), Math.abs(p[1] - my)); });
    s = s || 1; return pts.map(p => [(p[0] - mx) / s, (p[1] - my) / s]);
  }
  /* DFT: X_k = (1/N) Σ x_n e^{-i 2π k n / N}, frekuensi k dipetakan ke -N/2..N/2 */
  function dft(pts) {
    const N = pts.length, out = [];
    for (let k = 0; k < N; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) { const a = TAU * k * n / N, c = Math.cos(a), s = Math.sin(a); re += pts[n][0] * c + pts[n][1] * s; im += -pts[n][0] * s + pts[n][1] * c; }
      re /= N; im /= N;
      const f = k <= N / 2 ? k : k - N;
      out.push({f, r: Math.hypot(re, im), p: Math.atan2(im, re), re, im});
    }
    return out.sort((a, b) => b.r - a.r);
  }
  /* Posisi ujung rantai lingkaran pada waktu t (0..1) memakai K lingkaran terbesar */
  function at(coefs, K, t) {
    let x = 0, y = 0;
    for (let i = 0; i < K && i < coefs.length; i++) { const c = coefs[i], a = TAU * c.f * t + c.p; x += c.r * Math.cos(a); y += c.r * Math.sin(a); }
    return [x, y];
  }
  function reconstruct(coefs, K, n) { return Array.from({length: n}, (_, i) => at(coefs, K, i / n)); }
  /* Kemiripan 0..1: rata-rata jarak titik pasangan dibanding ukuran bentuk (±1) */
  function similarity(orig, coefs, K) {
    const n = orig.length, rec = reconstruct(coefs, K, n); let d = 0;
    for (let i = 0; i < n; i++) d += Math.hypot(orig[i][0] - rec[i][0], orig[i][1] - rec[i][1]);
    return Math.max(0, 1 - (d / n) / 0.15);
  }
  /* Nilai eksak sudut istimewa */
  const EXACT = {0: ['0', '1'], 30: ['½', '√3/2'], 45: ['√2/2', '√2/2'], 60: ['√3/2', '½'], 90: ['1', '0']};
  function exact(deg) {
    deg = ((Math.round(deg) % 360) + 360) % 360;
    const ref = deg <= 90 ? deg : deg <= 180 ? 180 - deg : deg <= 270 ? deg - 180 : 360 - deg;
    const e = EXACT[ref]; if (!e) return null;
    const ss = deg > 180 ? -1 : 1, cs = deg > 90 && deg < 270 ? -1 : 1;
    const sg = (v, s) => v === '0' ? '0' : (s < 0 ? '−' : '') + v;
    return {sin: sg(e[0], ss), cos: sg(e[1], cs)};
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function radLabel(deg) {
    deg = ((Math.round(deg) % 360) + 360) % 360; if (!deg) return '0';
    const g = gcd(deg, 180), n = deg / g, d = 180 / g;
    return (n === 1 ? '' : n) + 'π' + (d === 1 ? '' : '/' + d);
  }
  return {TAU, SHAPES, resample, normalize, dft, at, reconstruct, similarity, exact, radLabel, gcd};
});
