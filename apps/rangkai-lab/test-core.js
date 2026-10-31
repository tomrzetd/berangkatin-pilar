// Uji inti Papan Rangkai:  node apps/rangkai-lab/test-core.js
'use strict';
const C = require('./core.js');
const T = require('./templates.js');
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('  GAGAL:', m); } };
const mk = () => ({ parts: [], wires: [] });
let uid = 0;
const add = (c, type, x, y, props = {}, rot = 0) => { const p = { id: 'p' + (++uid), type, x, y, rot, props, ref: C.nextRef(c, type), label: C.nextLabel(c, type) }; c.parts.push(p); return p; };
const pw = (p, n) => C.pinWorld(p, C.LIB[p.type].pinMap[n]);
const wire = (c, p1, n1, p2, n2) => c.wires.push({ id: 'w' + (++uid), a: pw(p1, n1), b: pw(p2, n2) });

console.log('== gerbang simbol: tabel kebenaran');
for (const [g, exp] of Object.entries({ AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], NAND: [1, 1, 1, 0], NOR: [1, 0, 0, 0], XOR: [0, 1, 1, 0], XNOR: [1, 0, 0, 1] })) {
  const c = mk(); const a = add(c, 'SWITCH', 0, 0), b = add(c, 'SWITCH', 0, 4), G = add(c, g, 6, 0), L = add(c, 'PROBE', 14, 1);
  wire(c, a, 'out', G, 'A'); wire(c, b, 'out', G, 'B'); wire(c, G, 'Y', L, 'in');
  const tt = C.truthTable(c);
  ok(JSON.stringify(tt.rows.map(r => r.out[0])) === JSON.stringify(exp), g + ' ' + JSON.stringify(tt.rows.map(r => r.out[0])));
}
console.log('== NOT dari NAND (masukan digabung)');
{ const c = mk(); const a = add(c, 'SWITCH', 0, 0), G = add(c, 'NAND', 6, 0), L = add(c, 'PROBE', 14, 1);
  wire(c, a, 'out', G, 'A'); wire(c, G, 'A', G, 'B'); wire(c, G, 'Y', L, 'in');
  ok(JSON.stringify(C.truthTable(c).rows.map(r => r.out[0])) === '[1,0]', 'NAND→NOT'); }
console.log('== IC 74HC08 tanpa daya vs dengan daya');
{ const c = mk(); const a = add(c, 'SWITCH', 0, 0, { on: 1 }), b = add(c, 'SWITCH', 0, 4, { on: 1 }), U = add(c, '74HC08', 10, 10), L = add(c, 'PROBE', 20, 0);
  const lab = (l) => C.LIB['74HC08'].pins.find(p => p.label === l).n;
  wire(c, a, 'out', U, lab('1A')); wire(c, b, 'out', U, lab('1B')); wire(c, U, lab('1Y'), L, 'in');
  let s = C.simulate(c); ok(s.outputs[L.id] === null, 'IC tanpa daya → keluaran mengambang');
  ok(C.erc(c).some(e => /belum mendapat daya/.test(e.msg)), 'ERC: IC tanpa daya');
  const V = add(c, 'VCC', 30, 0), G = add(c, 'GND', 30, 20);
  wire(c, V, 'out', U, lab('VCC')); wire(c, G, 'out', U, lab('GND'));
  s = C.simulate(c); ok(s.outputs[L.id] === 1, 'IC dengan daya: 1 AND 1 = 1'); }
console.log('== breadboard: pin yang ditancap otomatis tersambung lewat bus');
{ const c = mk(); const bb = add(c, 'BB17', 0, 0); const r1 = add(c, 'RES', 3, 4); const r2 = add(c, 'RES', 7, 6);
  // r1 kaki 2 di kolom 7 baris b, r2 kaki 1 di kolom 7 baris d → satu kolom → satu net
  const nl = C.netlist(c); ok(nl.netOf(r1.id, '2') === nl.netOf(r2.id, '1'), 'kolom breadboard menyatukan net');
  ok(nl.netOf(r1.id, '1') !== nl.netOf(r2.id, '2'), 'kolom berbeda terpisah');
  const r3 = add(c, 'RES', 7, 11); const nl2 = C.netlist(c); ok(nl2.netOf(r3.id, '1') !== nl2.netOf(r1.id, '2'), 'parit memisahkan a–e dan f–j'); }
console.log('== korsleting & tegangan berlebih');
{ const c = mk(); const bat = add(c, 'LIPO', 0, 0), drv = add(c, 'DRV8833', 30, 0);
  wire(c, bat, '+', drv, 'GND'); wire(c, bat, '-', drv, 'IN3');      // kesalahan "bergeser satu pin"
  const e = C.erc(c); ok(e.some(x => x.level === 'error' && /KORSLETING|GND \(terbalik/.test(x.msg)), 'baterai+ ke GND driver terdeteksi');
  const c2 = mk(); const esp = add(c2, 'ESP32S3', 0, 0), b2 = add(c2, 'LIPO', 20, 0); wire(c2, b2, '+', esp, 'GPIO5');
  ok(C.erc(c2).some(x => /maksimal 3.6 V/.test(x.msg)), 'VBAT ke GPIO terdeteksi'); }
console.log('== osilasi: NOT dengan umpan balik');
{ const c = mk(); const g = add(c, 'NOT', 0, 0); wire(c, g, 'Y', g, 'A'); const s = C.simulate(c); ok(!s.stable, 'osilasi terdeteksi'); }
console.log('== konflik dua keluaran');
{ const c = mk(); const a = add(c, 'SWITCH', 0, 0, { on: 1 }), b = add(c, 'SWITCH', 0, 4, { on: 0 }), L = add(c, 'PROBE', 10, 0);
  wire(c, a, 'out', L, 'in'); wire(c, b, 'out', L, 'in'); ok(C.erc(c).some(e => /Konflik/.test(e.msg)), 'konflik'); }
console.log('== LED + resistor seri dari keluaran gerbang');
{ const c = mk(); const a = add(c, 'SWITCH', 0, 0, { on: 1 }), R = add(c, 'RES', 6, 1), D = add(c, 'LED', 12, 0), G = add(c, 'GND', 20, 6);
  wire(c, a, 'out', R, '1'); wire(c, R, '2', D, 'A'); wire(c, D, 'K', G, 'out');
  ok(C.simulate(c).outputs[D.id] === 1, 'LED menyala'); a.props.on = 0; ok(C.simulate(c).outputs[D.id] === 0, 'LED padam'); }
console.log('== tampilan biner');
{ const c = mk(); const B = add(c, 'BIN4', 10, 0), V = add(c, 'VCC', 0, 0), G = add(c, 'GND', 0, 10);
  wire(c, V, 'out', B, 'b2'); wire(c, V, 'out', B, 'b0'); wire(c, G, 'out', B, 'b3'); wire(c, G, 'out', B, 'b1');
  ok(C.simulate(c).outputs[B.id] === 5, '0101 = 5'); }
console.log('== contoh & tantangan bawaan');
for (const ex of T.EXAMPLES) {
  const c = T.build(ex.id); const e = C.erc(c);
  const errs = e.filter(x => x.level === 'error');
  if (ex.expectErrors) ok(errs.length >= ex.expectErrors, ex.id + ' harus punya ≥' + ex.expectErrors + ' error, dapat ' + errs.length);
  else ok(errs.length === 0, ex.id + ': ' + errs.map(x => x.msg).join(' | '));
  if (ex.expect) { const tt = C.truthTable(c); ok(JSON.stringify(tt.rows.map(r => r.out)) === JSON.stringify(ex.expect), ex.id + ' tabel ' + JSON.stringify(tt.rows.map(r => r.out))); }
}
for (const ch of T.CHALLENGES) ok(ch.target.length === (1 << ch.inputs.length), 'tantangan ' + ch.id + ' lengkap');
// tantangan yang punya solusi contoh harus lulus
for (const ch of T.CHALLENGES.filter(c => c.solution)) { const c = T.build(ch.solution); ok(T.check(ch, c).pass, 'solusi ' + ch.id); }
console.log(`\n${n} pemeriksaan, ${fail} gagal`);
process.exit(fail ? 1 : 0);
