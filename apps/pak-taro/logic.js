/* Lab Misteri Pak Taro · logika "Pupuk Ajaib"
   Sumber: Buku Informatika Kelas VIII (Kemendikbudristek), aktivitas BK-K8-03-U "Pupuk Ajaib".
   Enam gelas A–F: lima pupuk berkhasiat berbeda + satu air biasa. Pak Taro mencampur tiga gelas
   per percobaan lalu mengamati perubahan bunga. Konsep: himpunan (irisan, komplemen), pengenalan
   pola, abstraksi, dekomposisi, algoritma — dan kode biner tiap gelas. UMD: window.TARO / require. */
(function (root, f) { const T = f(); if (typeof module === 'object' && module.exports) module.exports = T; else root.TARO = T; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const GLASSES = ['A', 'B', 'C', 'D', 'E', 'F'];
  const EFFECTS = [
    { id: 'double', icon: '🌸', name: 'Kelopak berlapis', short: 'berlapis' },
    { id: 'leaf', icon: '🌿', name: 'Tumbuh daun', short: 'daun' },
    { id: 'wavy', icon: '〰️', name: 'Tangkai bergelombang', short: 'gelombang' },
    { id: 'white', icon: '🤍', name: 'Kelopak jadi putih', short: 'putih' },
    { id: 'black', icon: '⚫', name: 'Tengah jadi hitam', short: 'hitam' },
  ];
  const WATER = 'water';
  // susunan buku: A–C–… sehingga hasil percobaan sesuai pembahasan (P1: 3 perubahan, P2: 2, P3: 2, air = D)
  const BOOK = { map: { A: 'double', B: 'leaf', C: 'white', D: WATER, E: 'black', F: 'wavy' }, experiments: [['A', 'B', 'C'], ['A', 'D', 'E'], ['C', 'D', 'F']] };

  const effectsOf = (mix, map) => [...new Set(mix.map(g => map[g]).filter(e => e && e !== WATER))];
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const inter = (a, b) => a.filter(x => b.includes(x));
  const minus = (a, b) => a.filter(x => !b.includes(x));

  /* kode biner gelas: bit ke-i = 1 bila gelas ikut di percobaan ke-i */
  const code = (g, exps) => exps.map(m => (m.includes(g) ? '1' : '0')).join('');
  const codes = exps => Object.fromEntries(GLASSES.map(g => [g, code(g, exps)]));

  /* semua susunan (6! = 720) yang cocok dengan hasil pengamatan */
  function* perms(arr) { if (arr.length <= 1) { yield arr.slice(); return; } for (let i = 0; i < arr.length; i++) { const rest = arr.slice(0, i).concat(arr.slice(i + 1)); for (const p of perms(rest)) yield [arr[i], ...p]; } }
  function consistent(exps, results) {
    const out = [], items = [...EFFECTS.map(e => e.id), WATER];
    for (const p of perms(items)) { const map = Object.fromEntries(GLASSES.map((g, i) => [g, p[i]])); if (exps.every((m, k) => sameSet(effectsOf(m, map), results[k]))) out.push(map); }
    return out;
  }
  /* apa yang PASTI diketahui dari percobaan: gelas air (bila tunggal) & khasiat tiap gelas yang tunggal */
  function deduce(exps, results) {
    const maps = consistent(exps, results), known = {};
    for (const g of GLASSES) { const vals = new Set(maps.map(m => m[g])); if (vals.size === 1) known[g] = [...vals][0]; }
    const waterSet = new Set(maps.map(m => GLASSES.find(g => m[g] === WATER)));
    return { maps: maps.length, known, water: waterSet.size === 1 ? [...waterSet][0] : null, waterCandidates: [...waterSet] };
  }
  /* jalan penalaran buku (irisan & komplemen) — dipakai untuk menuntun langkah */
  function bookSteps() {
    const [p1, p2, p3] = BOOK.experiments.map(m => effectsOf(m, BOOK.map));
    return [
      { glass: 'A', from: ['P1', 'P2'], rule: 'irisan', answer: inter(p1, p2) },
      { glass: 'C', from: ['P1', 'P3'], rule: 'irisan', answer: inter(p1, p3) },
      { glass: 'D', from: ['P2', 'P3'], rule: 'irisan', answer: inter(p2, p3) }, // kosong → air
      { glass: 'B', from: ['P1'], rule: 'sisa', answer: minus(p1, [BOOK.map.A, BOOK.map.C]) },
      { glass: 'E', from: ['P2'], rule: 'sisa', answer: minus(p2, [BOOK.map.A]) },
      { glass: 'F', from: ['P3'], rule: 'sisa', answer: minus(p3, [BOOK.map.C]) },
    ];
  }
  function randomMap(rnd = Math.random) {
    const items = [...EFFECTS.map(e => e.id), WATER];
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return Object.fromEntries(GLASSES.map((g, i) => [g, items[i]]));
  }
  return { GLASSES, EFFECTS, WATER, BOOK, effectsOf, sameSet, inter, minus, code, codes, consistent, deduce, bookSteps, randomMap };
});
