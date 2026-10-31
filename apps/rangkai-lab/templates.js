/* PILAR · Papan Rangkai — contoh rangkaian & tantangan logika */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.RangkaiTemplates = factory(root.RangkaiCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  function B() {
    const c = { parts: [], wires: [] }; let uid = 0;
    const api = {
      c,
      add(type, x, y, props = {}, rot = 0, label) {
        const p = { id: 'p' + (++uid), type, x, y, rot, props: Object.assign({}, props), ref: C.nextRef(c, type) };
        p.label = label !== undefined ? label : C.nextLabel(c, type);
        c.parts.push(p); return p;
      },
      // tempatkan komponen sehingga pin tertentu jatuh di titik (gx, gy)
      at(type, pinName, gx, gy, props, rot = 0, label) {
        const p = api.add(type, 0, 0, props, rot, label);
        const [px, py] = C.pinWorld(p, C.LIB[type].pinMap[pinName]);
        p.x = gx - px; p.y = gy - py; return p;
      },
      pin(p, n) { return C.pinWorld(p, C.LIB[p.type].pinMap[n]); },
      lab(p, l) { return C.LIB[p.type].pins.find(q => q.label === l).n; },
      w(a, b, color, via) {
        const A = Array.isArray(a) ? a : api.pin(a[0], a[1]);
        c.wires.push({ id: 'w' + (++uid), a: A, b: Array.isArray(b) ? b : b, color: color || null, via: via || null });
      },
      wp(p1, n1, p2, n2, color, via) { c.wires.push({ id: 'w' + (++uid), a: api.pin(p1, n1), b: api.pin(p2, n2), color: color || null, via: via || null }); },
    };
    return api;
  }

  const BUILD = {
    'and-dasar'(b) {
      const A = b.add('SWITCH', 2, 2), Bb = b.add('SWITCH', 2, 8), G = b.add('AND', 10, 3), L = b.add('PROBE', 20, 4);
      b.wp(A, 'out', G, 'A', '#2e9d4f'); b.wp(Bb, 'out', G, 'B', '#1e63d6'); b.wp(G, 'Y', L, 'in', '#e8792b');
    },
    'nand-not'(b) {
      const A = b.add('SWITCH', 2, 4), G = b.add('NAND', 10, 3), L = b.add('PROBE', 20, 4);
      b.wp(A, 'out', G, 'A', '#2e9d4f'); b.wp(G, 'A', G, 'B', '#2e9d4f'); b.wp(G, 'Y', L, 'in', '#e8792b');
    },
    'or-nand'(b) {
      const A = b.add('SWITCH', 2, 2), Bb = b.add('SWITCH', 2, 10), N1 = b.add('NAND', 9, 1), N2 = b.add('NAND', 9, 9), N3 = b.add('NAND', 17, 5), L = b.add('PROBE', 26, 6);
      b.wp(A, 'out', N1, 'A', '#2e9d4f'); b.wp(N1, 'A', N1, 'B', '#2e9d4f'); b.wp(Bb, 'out', N2, 'A', '#1e63d6'); b.wp(N2, 'A', N2, 'B', '#1e63d6');
      b.wp(N1, 'Y', N3, 'A', '#7b3fc4'); b.wp(N2, 'Y', N3, 'B', '#7b3fc4'); b.wp(N3, 'Y', L, 'in', '#e8792b');
    },
    'half-adder'(b) {
      const A = b.add('SWITCH', 2, 3), Bb = b.add('SWITCH', 2, 11), X = b.add('XOR', 12, 2), N = b.add('AND', 12, 10);
      const S = b.add('PROBE', 22, 3, {}, 0, 'S'), Cc = b.add('PROBE', 22, 11, {}, 0, 'C');
      const D = b.add('BIN4', 28, 4, {}, 0, 'J');
      b.wp(A, 'out', X, 'A', '#2e9d4f'); b.wp(Bb, 'out', X, 'B', '#1e63d6'); b.wp(A, 'out', N, 'A', '#2e9d4f'); b.wp(Bb, 'out', N, 'B', '#1e63d6');
      b.wp(X, 'Y', S, 'in', '#e8792b'); b.wp(N, 'Y', Cc, 'in', '#d9445f');
      b.wp(S, 'in', D, 'b0', '#e8792b'); b.wp(Cc, 'in', D, 'b1', '#d9445f');
      const G = b.add('GND', 33, 11); b.wp(G, 'out', D, 'b3', '#262626'); b.wp(G, 'out', D, 'b2', '#262626');
    },
    'ic-breadboard'(b) {
      const bb = b.add('BB30', 2, 2);                      // lubang: kolom c → x=2+c, baris: tp 2, tn 3, a 5.. e 9, f 12.. j 16, bp 18, bn 19
      const hole = (r, col) => { const y = { tp: 0, tn: 1, a: 3, b: 4, c: 5, d: 6, e: 7, f: 10, g: 11, h: 12, i: 13, j: 14, bp: 16, bn: 17 }[r]; return [2 + col, 2 + y]; };
      const U = b.at('74HC08', '14', ...hole('e', 10));    // IC mengangkangi parit: pin 14..8 di baris e, pin 1..7 di baris f
      const V = b.at('VCC', 'out', 0, -1), G = b.at('GND', 'out', 0, 7);
      b.w(b.pin(V, 'out'), hole('tp', 1), '#d32f2f'); b.w(b.pin(G, 'out'), hole('tn', 1), '#262626');
      b.w(hole('tn', 30), hole('bn', 30), '#262626'); b.w(hole('tp', 29), hole('bp', 29), '#d32f2f');
      b.w(hole('tp', 10), hole('a', 10), '#d32f2f');       // VCC pin 14
      b.w(hole('j', 16), hole('bn', 16), '#262626');       // GND pin 7
      const A = b.at('SWITCH', 'out', 8, 24), Bb = b.at('SWITCH', 'out', 8, 28);
      b.w(b.pin(A, 'out'), hole('j', 10), '#2e9d4f'); b.w(b.pin(Bb, 'out'), hole('j', 11), '#1e63d6');   // 1A, 1B
      b.at('RES', '2', ...hole('i', 12), { value: '330' }); // 1Y → resistor → LED
      b.at('LED', 'A', ...hole('f', 8), { color: 'red' }, 0, 'X');
      b.w(hole('j', 9), hole('bn', 9), '#262626');         // katoda LED ke GND
      return { U };
    },
    'sebatang-kara'(b) {
      const esp = b.add('ESP32S3', 30, 4), imu = b.add('GY87', 46, 2), drv = b.add('DRV8833', 14, 10, { j1: 0 });
      const chg = b.add('CHARGER', 2, 24), bat = b.add('LIPO', 4, 40), mot = b.add('MOTOR', 0, 0), sw = b.add('SLIDE', 24, 44, { on: 1 });
      const r1 = b.add('RES', 34, 24, { value: '100k' }), r2 = b.add('RES', 34, 30, { value: '100k' }), r3 = b.add('RES', 24, 30, { value: '10k' });
      const cf = b.add('CAP', 41, 30, { value: '100n' }), el = b.add('ELCO', 24, 36, { value: '220µ' });
      b.wp(esp, '3V3', imu, 'VCC_IN', '#c2185b'); b.wp(esp, 'GND', imu, 'GND', '#262626');
      b.wp(esp, 'GPIO9', imu, 'SCL', '#e8b900'); b.wp(esp, 'GPIO8', imu, 'SDA', '#1e63d6');
      b.wp(esp, 'GPIO5', drv, 'IN1', '#2e9d4f'); b.wp(esp, 'GPIO6', drv, 'IN2', '#7b3fc4'); b.wp(esp, 'GPIO7', drv, 'EEP', '#7f8f99');
      b.wp(drv, 'EEP', r3, '1', '#7f8f99'); b.wp(r3, '2', drv, 'GND', '#262626');
      b.wp(drv, 'OUT1', mot, 'A', '#d9d9d4'); b.wp(drv, 'OUT2', mot, 'B', '#262626');
      b.wp(bat, '+', sw, 'COM', '#d32f2f'); b.wp(sw, 'B', drv, 'VCC', '#d32f2f'); b.wp(sw, 'B', chg, 'B+', '#d32f2f');
      b.wp(bat, '-', chg, 'B-', '#262626'); b.wp(chg, 'B-', drv, 'GND', '#262626');
      b.wp(chg, '5V+', esp, '5V', '#f57c00'); b.wp(chg, '5V-', esp, 'GND', '#262626');
      b.wp(sw, 'B', r1, '1', '#d32f2f'); b.wp(r1, '2', r2, '1', '#8d5524'); b.wp(r2, '1', esp, 'GPIO1', '#8d5524'); b.wp(r2, '2', drv, 'GND', '#262626');
      b.wp(cf, '1', r2, '1', '#8d5524'); b.wp(cf, '2', r2, '2', '#262626');
      b.wp(el, '+', drv, 'VCC', '#d32f2f'); b.wp(el, '-', drv, 'GND', '#262626');
    },
    'salah-wiring'(b) {   // gambar "uji pertama" yang pinnya bergeser satu lubang
      const esp = b.add('ESP32S3', 30, 4), imu = b.add('GY87', 46, 2), drv = b.add('DRV8833', 14, 10, { j1: 0 }), bat = b.add('LIPO', 4, 30), mot = b.add('MOTOR', 0, 0);
      b.wp(esp, '3V3', imu, 'VCC_IN', '#c2185b'); b.wp(esp, 'GND', imu, '3.3V', '#262626'); b.wp(esp, 'GPIO9', imu, 'GND', '#e8b900'); b.wp(esp, 'GPIO8', imu, 'SCL', '#1e63d6');
      b.wp(esp, 'GPIO5', drv, 'IN2', '#2e9d4f'); b.wp(esp, 'GPIO6', drv, 'VCC', '#7b3fc4');
      b.wp(bat, '+', drv, 'GND', '#d32f2f'); b.wp(bat, '-', drv, 'IN3', '#262626'); b.wp(esp, 'GND', drv, 'IN3', '#262626');
      b.wp(drv, 'EEP', mot, 'A', '#d9d9d4'); b.wp(drv, 'OUT1', mot, 'B', '#262626');
    },
  };

  const EXAMPLES = [
    { id: 'and-dasar', title: 'Gerbang AND', desc: 'Dua saklar → AND → lampu. Lampu menyala hanya jika A dan B bernilai 1.', expect: [[0], [0], [0], [1]] },
    { id: 'nand-not', title: 'NAND jadi NOT', desc: 'Kedua masukan NAND digabung: keluaran selalu kebalikan masukan.', expect: [[1], [0]] },
    { id: 'or-nand', title: 'OR dari 3 NAND', desc: 'NAND disebut gerbang universal: semua gerbang bisa dibuat darinya.', expect: [[0], [1], [1], [1]] },
    { id: 'half-adder', title: 'Penjumlah biner (half adder)', desc: 'XOR = hasil (S), AND = simpanan (C). 1 + 1 = 10 dalam biner = 2.', expect: [[0, 0, 0], [0, 1, 1], [0, 1, 1], [1, 2, 0]] },
    { id: 'ic-breadboard', title: 'IC 74HC08 di breadboard', desc: 'IC asli butuh daya: pin 14 ke +, pin 7 ke −. Lampu LED lewat resistor 330 Ω.', expect: [[0], [0], [0], [1]] },
    { id: 'sebatang-kara', title: 'Sebatang-Kara (S3 + GY-87)', desc: 'Wiring robot: ESP32-S3, GY-87, DRV8833, charger, LiPo, motor. Klik “Periksa”.' },
    { id: 'salah-wiring', title: 'Cari kesalahan wiring!', desc: 'Pin DRV8833 dan GY-87 bergeser satu lubang. Klik “Periksa” untuk menemukan bahayanya.', expectErrors: 2 },
  ];
  // urutan keluaran mengikuti label: half adder → C, J (tampilan), S

  const CHALLENGES = [
    { id: 'not-nand', title: 'Buat NOT hanya dari NAND', inputs: ['A'], outputs: ['X'], target: [[1], [0]], only: ['NAND', '74HC00'], solution: 'nand-not',
      hint: 'Sambungkan kedua masukan NAND menjadi satu.' },
    { id: 'or-nand', title: 'Buat OR hanya dari NAND', inputs: ['A', 'B'], outputs: ['X'], target: [[0], [1], [1], [1]], only: ['NAND', '74HC00'], solution: 'or-nand',
      hint: 'Balik dulu A dan B dengan NAND-sebagai-NOT, lalu masukkan ke NAND ketiga.' },
    { id: 'xor', title: 'Buat XOR tanpa gerbang XOR', inputs: ['A', 'B'], outputs: ['X'], target: [[0], [1], [1], [0]], ban: ['XOR', 'XNOR', '74HC86'],
      hint: 'XOR = (A OR B) AND NOT(A AND B).' },
    { id: 'kunci', title: 'Kunci rahasia 1-0-1', inputs: ['A', 'B', 'C'], outputs: ['X'], target: [[0], [0], [0], [0], [0], [1], [0], [0]],
      hint: 'Lampu menyala hanya untuk A=1, B=0, C=1. Butuh NOT untuk B.' },
    { id: 'mayoritas', title: 'Suara mayoritas', inputs: ['A', 'B', 'C'], outputs: ['X'], target: [[0], [0], [0], [1], [0], [1], [1], [1]],
      hint: 'Menyala jika minimal dua saklar bernilai 1: (A·B) + (A·C) + (B·C).' },
    { id: 'half', title: 'Penjumlah 1 bit', inputs: ['A', 'B'], outputs: ['C', 'S'], target: [[0, 0], [0, 1], [0, 1], [1, 0]],
      hint: 'Beri label lampu “S” (hasil) dan “C” (simpanan).' },
  ];

  function build(id) { const b = B(); BUILD[id](b); return b.c; }

  function check(ch, circ) {
    const { inputs, outputs } = C.ioLists(circ);
    const msgs = [];
    if (inputs.length !== ch.inputs.length) msgs.push(`Butuh tepat ${ch.inputs.length} saklar (${ch.inputs.join(', ')}), sekarang ${inputs.length}.`);
    const outs = outputs.filter(p => p.type !== 'BIN4');
    if (outs.length !== ch.outputs.length) msgs.push(`Butuh tepat ${ch.outputs.length} lampu (${ch.outputs.join(', ')}), sekarang ${outs.length}.`);
    const types = new Set(circ.parts.map(p => p.type));
    const gateTypes = [...types].filter(t => ['Gerbang', 'IC 74HC'].includes(C.LIB[t].cat));
    if (ch.only) { const bad = gateTypes.filter(t => !ch.only.includes(t)); if (bad.length) msgs.push('Hanya boleh memakai ' + ch.only.join(' / ') + ' (ada ' + bad.join(', ') + ').'); }
    if (ch.ban) { const bad = gateTypes.filter(t => ch.ban.includes(t)); if (bad.length) msgs.push('Tidak boleh memakai ' + bad.join(', ') + '.'); }
    if (msgs.length) return { pass: false, msgs };
    const circ2 = { parts: circ.parts.filter(p => p.type !== 'BIN4'), wires: circ.wires };
    const tt = C.truthTable(circ2);
    const got = tt.rows.map(r => r.out.map(v => (v === 1 ? 1 : 0)));
    const wrong = [];
    got.forEach((row, i) => { if (JSON.stringify(row) !== JSON.stringify(ch.target[i])) wrong.push(i); });
    return { pass: !wrong.length, rows: tt.rows, wrong, msgs: wrong.length ? [`${wrong.length} dari ${got.length} baris tabel kebenaran belum sesuai.`] : ['Semua baris sesuai. Mantap!'] };
  }

  return { EXAMPLES, CHALLENGES, build, check, B };
});
