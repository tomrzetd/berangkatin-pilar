/* PILAR · Papan Rangkai — inti (tanpa DOM, bisa diuji di Node).
   - LIB      : definisi komponen (ukuran grid, pin, sifat daya, logika)
   - netlist  : kabel + pin yang bertumpuk di titik grid yang sama + bus internal (breadboard, saklar)
   - simulate : logika digital 0/1 dengan Z (mengambang) dan X (adu/konflik), resistor = sambungan lemah
   - erc      : pemeriksaan aturan listrik (korsleting, tegangan berlebih, pin daya belum tersambung)
   - truthTable : tabel kebenaran otomatis dari saklar (masukan) dan lampu (keluaran)
   Satuan koordinat = 1 grid = 0,1 inci (2,54 mm), jarak kaki standar. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RangkaiCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ------------------------------------------------------------------ pembantu pin
  // t: in | out | io | pwr (masukan daya) | gnd | src (sumber) | pas (pasif)
  const pin = (n, x, y, t = 'pas', o = {}) => Object.assign({ n, x, y, t }, o);

  const gate2 = (fn) => (c) => {
    const a = c.in('A'), b = c.in('B');
    c.out('Y', (a === 'X' || b === 'X') ? 'X' : fn(a ? 1 : 0, b ? 1 : 0));
  };
  const GATE_FN = {
    AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b),
    XOR: (a, b) => a ^ b, XNOR: (a, b) => 1 - (a ^ b),
  };

  // IC seri 74HC (DIP-14). Pin 1..7 baris bawah kiri→kanan, 14..8 baris atas kiri→kanan, takik di kiri.
  function dip14(names) {
    const pins = [];
    for (let i = 1; i <= 14; i++) {
      const x = i <= 7 ? i - 1 : 14 - i, y = i <= 7 ? 3 : 0;
      const nm = names[i - 1];
      const t = nm === 'VCC' ? 'pwr' : nm === 'GND' ? 'gnd' : /Y$/.test(nm) ? 'out' : 'in';
      pins.push(pin(String(i), x, y, t, { label: nm }));
    }
    return pins;
  }
  const QUAD = ['1A', '1B', '1Y', '2A', '2B', '2Y', 'GND', '3Y', '3A', '3B', '4Y', '4A', '4B', 'VCC'];
  const NOR02 = ['1Y', '1A', '1B', '2Y', '2A', '2B', 'GND', '3A', '3B', '3Y', '4A', '4B', '4Y', 'VCC'];
  const HEX04 = ['1A', '1Y', '2A', '2Y', '3A', '3Y', 'GND', '4Y', '4A', '5Y', '5A', '6Y', '6A', 'VCC'];
  function icSim(names, kind) {
    const byLabel = {}; names.forEach((n, i) => { byLabel[n] = String(i + 1); });
    return (c) => {
      const powered = c.in(byLabel.VCC) === 1 && c.in(byLabel.GND) === 0;
      const units = kind === 'NOT' ? 6 : 4;
      for (let u = 1; u <= units; u++) {
        const y = byLabel[u + 'Y'];
        if (!powered) { c.out(y, null); continue; }
        if (kind === 'NOT') { const a = c.in(byLabel[u + 'A']); c.out(y, a === 'X' ? 'X' : (a ? 0 : 1)); }
        else {
          const a = c.in(byLabel[u + 'A']), b = c.in(byLabel[u + 'B']);
          c.out(y, (a === 'X' || b === 'X') ? 'X' : GATE_FN[kind](a ? 1 : 0, b ? 1 : 0));
        }
      }
      c.flag(powered ? null : 'IC belum mendapat daya: hubungkan pin 14 (VCC) ke + dan pin 7 (GND) ke −');
    };
  }

  // breadboard: rel atas (+, −), baris a–e, parit 3 grid, baris f–j, rel bawah (+, −)
  function breadboard(cols) {
    const pins = [], bus = [];
    const rows = { tp: 0, tn: 1, a: 3, b: 4, c: 5, d: 6, e: 7, f: 10, g: 11, h: 12, i: 13, j: 14, bp: 16, bn: 17 };
    for (const [r, y] of Object.entries(rows)) for (let c = 1; c <= cols; c++) pins.push(pin(r + c, c, y, 'bus'));
    for (const r of ['tp', 'tn', 'bp', 'bn']) bus.push(Array.from({ length: cols }, (_, i) => r + (i + 1)));
    for (let c = 1; c <= cols; c++) { bus.push(['a', 'b', 'c', 'd', 'e'].map(r => r + c)); bus.push(['f', 'g', 'h', 'i', 'j'].map(r => r + c)); }
    return { pins, bus: () => bus, w: cols + 1, h: 17, layer: -1, rows, cols };
  }

  const LIB = {
    // ---------------- sumber & masukan
    VCC: { name: 'VCC +5V', cat: 'Logika', w: 2, h: 2, pins: [pin('out', 1, 2, 'src', { src: 5 })], ref: 'VCC' },
    GND: { name: 'Ground', cat: 'Logika', w: 2, h: 2, pins: [pin('out', 1, 0, 'gnd', { src: 0 })], ref: 'GND' },
    SWITCH: { name: 'Saklar (masukan)', cat: 'Logika', w: 3, h: 2, pins: [pin('out', 3, 1, 'out')], ref: 'SW', input: true,
      props: { on: 0 }, sim: (c) => c.out('out', c.props.on ? 1 : 0) },
    BUTTON: { name: 'Tombol tekan', cat: 'Logika', w: 3, h: 2, pins: [pin('out', 3, 1, 'out')], ref: 'BTN', input: true,
      props: { on: 0 }, sim: (c) => c.out('out', c.props.on ? 1 : 0) },
    // ---------------- keluaran
    PROBE: { name: 'Lampu logika', cat: 'Logika', w: 2, h: 2, pins: [pin('in', 0, 1, 'in')], ref: 'L', output: true,
      read: (c) => c.in('in') },
    LED: { name: 'LED + kaki', cat: 'Logika', w: 2, h: 3, pins: [pin('A', 0, 3, 'pas', { label: 'anoda +' }), pin('K', 1, 3, 'pas', { label: 'katoda −' })],
      ref: 'D', output: true, props: { color: 'red' }, read: (c) => (c.in('A') === 1 && c.in('K') === 0) ? 1 : 0 },
    BIN4: { name: 'Tampilan biner 4-bit', cat: 'Logika', w: 5, h: 4,
      pins: [pin('b3', 1, 4, 'in', { label: '8' }), pin('b2', 2, 4, 'in', { label: '4' }), pin('b1', 3, 4, 'in', { label: '2' }), pin('b0', 4, 4, 'in', { label: '1' })],
      ref: 'BIN', output: true, read: (c) => ['b3', 'b2', 'b1', 'b0'].reduce((v, p) => v * 2 + (c.in(p) === 1 ? 1 : 0), 0) },
    // ---------------- gerbang (simbol)
    NOT: { name: 'Gerbang NOT', cat: 'Gerbang', w: 4, h: 2, pins: [pin('A', 0, 1, 'in'), pin('Y', 4, 1, 'out')], ref: 'G',
      sim: (c) => { const a = c.in('A'); c.out('Y', a === 'X' ? 'X' : (a ? 0 : 1)); } },
  };
  for (const k of ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'])
    LIB[k] = { name: 'Gerbang ' + k, cat: 'Gerbang', w: 4, h: 4, pins: [pin('A', 0, 1, 'in'), pin('B', 0, 3, 'in'), pin('Y', 4, 2, 'out')], ref: 'G', sim: gate2(GATE_FN[k]) };

  // ---------------- IC 74HC
  const ICS = { '74HC00': ['NAND', QUAD, '4× NAND'], '74HC02': ['NOR', NOR02, '4× NOR'], '74HC04': ['NOT', HEX04, '6× NOT'],
                '74HC08': ['AND', QUAD, '4× AND'], '74HC32': ['OR', QUAD, '4× OR'], '74HC86': ['XOR', QUAD, '4× XOR'] };
  for (const [k, [kind, names, desc]] of Object.entries(ICS))
    LIB[k] = { name: 'IC ' + k + ' (' + desc + ')', cat: 'IC 74HC', w: 6, h: 3, pins: dip14(names), ref: 'U', ic: kind, sim: icSim(names, kind), desc };

  // ---------------- pasif
  LIB.RES = { name: 'Resistor', cat: 'Pasif', w: 4, h: 0, pins: [pin('1', 0, 0), pin('2', 4, 0)], ref: 'R', props: { value: '10k' }, resistor: true };
  LIB.CAP = { name: 'Kapasitor 100 nF', cat: 'Pasif', w: 2, h: 0, pins: [pin('1', 0, 0), pin('2', 2, 0)], ref: 'C', props: { value: '100n' } };
  LIB.ELCO = { name: 'Elco 220 µF', cat: 'Pasif', w: 1, h: 2, pins: [pin('+', 0, 2), pin('-', 1, 2)], ref: 'C', props: { value: '220µ' } };
  LIB.SLIDE = { name: 'Saklar geser SPDT', cat: 'Pasif', w: 2, h: 1, pins: [pin('A', 0, 1), pin('COM', 1, 1), pin('B', 2, 1)], ref: 'S',
    props: { on: 1 }, bus: (p) => [p.on ? ['COM', 'B'] : ['COM', 'A']], toggle: true };

  // ---------------- breadboard
  LIB.BB17 = Object.assign({ name: 'Breadboard mini (17 kolom)', cat: 'Breadboard', ref: 'BB' }, breadboard(17));
  LIB.BB30 = Object.assign({ name: 'Breadboard setengah (30 kolom)', cat: 'Breadboard', ref: 'BB' }, breadboard(30));

  // ---------------- board Sebatang-Kara (urutan pin sesuai modul asli)
  const io33 = { max: 3.6 };
  LIB.ESP32S3 = { name: 'ESP32-S3 Super Mini', cat: 'Board Sebatang-Kara', w: 6, h: 8, ref: 'U', board: true,
    pins: [
      pin('TX', 0, 0, 'io', io33), pin('RX', 0, 1, 'io', io33), pin('GPIO1', 0, 2, 'io', io33), pin('GPIO2', 0, 3, 'io', io33),
      pin('GPIO3', 0, 4, 'io', io33), pin('GPIO4', 0, 5, 'io', io33), pin('GPIO5', 0, 6, 'io', io33), pin('GPIO6', 0, 7, 'io', io33), pin('GPIO7', 0, 8, 'io', io33),
      pin('5V', 6, 0, 'pwr', { vmin: 4.5, vmax: 5.5, label: '5V (masukan)' }), pin('GND', 6, 1, 'gnd', { src: 0 }), pin('3V3', 6, 2, 'src', { src: 3.3 }),
      pin('GPIO13', 6, 3, 'io', io33), pin('GPIO12', 6, 4, 'io', io33), pin('GPIO11', 6, 5, 'io', io33), pin('GPIO10', 6, 6, 'io', io33),
      pin('GPIO9', 6, 7, 'io', io33), pin('GPIO8', 6, 8, 'io', io33)] };
  LIB.GY87 = { name: 'GY-87 (MPU6050)', cat: 'Board Sebatang-Kara', w: 7, h: 6, ref: 'IMU', board: true,
    pins: [pin('DRDY', 0, 0, 'io', io33), pin('INTA', 1, 0, 'io', io33), pin('FSYNC', 2, 0, 'io', io33), pin('SDA', 3, 0, 'io', io33),
           pin('SCL', 4, 0, 'io', io33), pin('GND', 5, 0, 'gnd', { src: 0 }), pin('3.3V', 6, 0, 'src', { src: 3.3, weak: true, label: '3.3V (keluaran LDO)' }),
           pin('VCC_IN', 7, 0, 'pwr', { vmin: 3.0, vmax: 5.5 })] };
  LIB.DRV8833 = { name: 'DRV8833 (sisi label)', cat: 'Board Sebatang-Kara', w: 6, h: 5, ref: 'DRV', board: true, props: { j1: 0 },
    pins: [pin('IN4', 0, 0, 'in'), pin('IN3', 0, 1, 'in'), pin('GND', 0, 2, 'gnd', { src: 0 }), pin('VCC', 0, 3, 'pwr', { vmin: 2.7, vmax: 10.8, label: 'VCC (daya motor)' }),
           pin('IN2', 0, 4, 'in'), pin('IN1', 0, 5, 'in'),
           pin('EEP', 6, 0, 'in', { label: 'EEP (nSLEEP)' }), pin('OUT1', 6, 1, 'pas'), pin('OUT2', 6, 2, 'pas'), pin('OUT3', 6, 3, 'pas'), pin('OUT4', 6, 4, 'pas'),
           pin('ULT', 6, 5, 'pas', { pullupTo: 'VCC', label: 'ULT (nFAULT, pull-up ke VCC)' })] };
  LIB.CHARGER = { name: 'Charger + boost 5V', cat: 'Board Sebatang-Kara', w: 8, h: 10, ref: 'PWR', board: true,
    pins: [pin('5V-', 8, 2, 'gnd', { src: 0, label: '5V −' }), pin('5V+', 8, 4, 'src', { src: 5, label: '5V + (keluaran boost)' }),
           pin('K', 8, 8, 'pas', { label: 'K (tombol)' }), pin('B-', 2, 10, 'gnd', { src: 0, label: 'B− baterai' }), pin('B+', 5, 10, 'pwr', { vmin: 3.0, vmax: 4.3, label: 'B+ baterai' })],
    bus: () => [['5V-', 'B-']] };   // GND keluaran dan GND baterai satu jalur di dalam modul
  LIB.LIPO = { name: 'LiPo 1S 3.7 V', cat: 'Board Sebatang-Kara', w: 14, h: 6, ref: 'BAT', board: true,
    pins: [pin('+', 0, 2, 'src', { src: 4.2, label: '+ (merah)' }), pin('-', 0, 4, 'gnd', { src: 0, label: '− (hitam)' })] };
  LIB.MOTOR = { name: 'Motor coreless 8520', cat: 'Board Sebatang-Kara', w: 12, h: 6, ref: 'M', board: true,
    pins: [pin('A', 12, 2, 'pas', { label: 'kabel putih' }), pin('B', 12, 4, 'pas', { label: 'kabel hitam' })] };

  for (const [k, d] of Object.entries(LIB)) { d.type = k; d.pinMap = {}; d.pins.forEach(p => { d.pinMap[p.n] = p; }); }

  // ------------------------------------------------------------------ geometri
  function center(d) { return [Math.round(d.w / 2), Math.round(d.h / 2)]; }
  function rotPt(x, y, rot) {
    switch (((rot % 360) + 360) % 360) { case 90: return [-y, x]; case 180: return [-x, -y]; case 270: return [y, -x]; default: return [x, y]; }
  }
  function pinWorld(part, p) {
    const d = LIB[part.type], [cx, cy] = center(d);
    const [rx, ry] = rotPt(p.x - cx, p.y - cy, part.rot || 0);
    return [part.x + cx + rx, part.y + cy + ry];
  }
  function bbox(part) {
    const d = LIB[part.type], [cx, cy] = center(d), pts = [[0, 0], [d.w, 0], [0, d.h], [d.w, d.h]].map(([x, y]) => {
      const [rx, ry] = rotPt(x - cx, y - cy, part.rot || 0); return [part.x + cx + rx, part.y + cy + ry];
    });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }
  const key = (x, y) => x + ',' + y;

  // ------------------------------------------------------------------ netlist
  function netlist(circ) {
    const parent = new Map();
    const find = (k) => { let r = k; while (parent.get(r) !== r) r = parent.get(r); let c = k; while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; } return r; };
    const add = (k) => { if (!parent.has(k)) parent.set(k, k); return k; };
    const union = (a, b) => { const ra = find(add(a)), rb = find(add(b)); if (ra !== rb) parent.set(ra, rb); };
    const pinKey = new Map();            // "partId:pin" -> grid key
    for (const part of circ.parts) {
      const d = LIB[part.type]; if (!d) continue;
      for (const p of d.pins) { const [x, y] = pinWorld(part, p); const k = key(x, y); add(k); pinKey.set(part.id + ':' + p.n, k); }
      const groups = d.bus ? d.bus(Object.assign({}, d.props, part.props)) : [];
      for (const g of groups) for (let i = 1; i < g.length; i++) union(pinKey.get(part.id + ':' + g[0]), pinKey.get(part.id + ':' + g[i]));
    }
    for (const w of circ.wires) union(key(w.a[0], w.a[1]), key(w.b[0], w.b[1]));
    // kelompokkan
    const nets = new Map();
    for (const part of circ.parts) {
      const d = LIB[part.type]; if (!d) continue;
      for (const p of d.pins) {
        const r = find(pinKey.get(part.id + ':' + p.n));
        if (!nets.has(r)) nets.set(r, { id: r, pins: [], wires: 0 });
        nets.get(r).pins.push({ part: part.id, pin: p.n, def: p, type: part.type });
      }
    }
    for (const w of circ.wires) { const r = find(key(w.a[0], w.a[1])); if (!nets.has(r)) nets.set(r, { id: r, pins: [], wires: 0 }); nets.get(r).wires++; }
    const netOf = (partId, pinName) => find(pinKey.get(partId + ':' + pinName));
    const netAt = (x, y) => parent.has(key(x, y)) ? find(key(x, y)) : null;
    // beri nama net yang mudah dibaca
    let n = 1;
    const partById = new Map(circ.parts.map(p => [p.id, p]));
    for (const net of nets.values()) {
      const real = net.pins.filter(p => LIB[p.type].cat !== 'Breadboard');
      net.real = real;
      const g = real.find(p => p.def.t === 'gnd'), s = real.find(p => p.def.t === 'src');
      if (g) net.name = 'GND';
      else if (s) net.name = LIB[s.type].type === 'VCC' ? '+5V' : (s.def.label || s.pin).split(' ')[0] === '+' ? 'VBAT' : (s.pin === '5V+' ? '+5V' : s.pin === '3V3' || s.pin === '3.3V' ? '+3V3' : s.pin);
      else if (real.length) net.name = 'N' + (n++);
      else net.name = '';
      net.label = net.name;
      // nama net dengan label komponen (SW A, L X)
      const named = real.find(p => partById.get(p.part) && partById.get(p.part).label && (LIB[p.type].input || LIB[p.type].output));
      if (!g && !s && named) net.label = net.name + ' · ' + partById.get(named.part).label;
    }
    return { nets, netOf, netAt, pinKey, find };
  }

  // ------------------------------------------------------------------ simulasi logika
  // nilai net: 1, 0, null (Z, mengambang), 'X' (konflik)
  const lvl = (v) => (v >= 2 ? 1 : 0);
  function simulate(circ, nl) {
    nl = nl || netlist(circ);
    const val = new Map(), weakSet = new Set();
    const flags = new Map();
    let stable = false, iter = 0;
    const drivenPins = [];
    for (; iter < 80 && !stable; iter++) {
      const drv = new Map();   // net -> {one, zero}
      const drive = (net, v) => { if (v === null || v === undefined) return; const o = drv.get(net) || { one: 0, zero: 0, x: 0 }; if (v === 'X') o.x++; else if (v) o.one++; else o.zero++; drv.set(net, o); };
      for (const part of circ.parts) {
        const d = LIB[part.type];
        for (const p of d.pins) if (p.src !== undefined && !p.weak) drive(nl.netOf(part.id, p.n), lvl(p.src));
        if (d.sim) {
          const props = Object.assign({}, d.props, part.props);
          d.sim({ props, in: (pn) => { const v = val.get(nl.netOf(part.id, pn)); return v === undefined ? null : v; },
                  out: (pn, v) => drive(nl.netOf(part.id, pn), v), flag: (m) => { if (m) flags.set(part.id, m); else flags.delete(part.id); } });
        }
      }
      const next = new Map(); weakSet.clear();
      for (const [net, o] of drv) next.set(net, o.x || (o.one && o.zero) ? 'X' : o.one ? 1 : 0);
      // sumber lemah (LDO 3.3V GY-87): hanya jika net belum digerakkan
      for (const part of circ.parts) for (const p of LIB[part.type].pins) if (p.weak) { const n = nl.netOf(part.id, p.n); if (!next.has(n)) { next.set(n, lvl(p.src)); weakSet.add(n); } }
      // resistor: menarik net yang mengambang (pull-up / pull-down / seri ke LED)
      for (let k = 0; k < 8; k++) {
        let ch = false;
        for (const part of circ.parts) {
          if (!LIB[part.type].resistor) continue;
          const a = nl.netOf(part.id, '1'), b = nl.netOf(part.id, '2');
          const va = next.get(a), vb = next.get(b);
          if (va !== undefined && va !== 'X' && vb === undefined) { next.set(b, va); weakSet.add(b); ch = true; }
          else if (vb !== undefined && vb !== 'X' && va === undefined) { next.set(a, vb); weakSet.add(a); ch = true; }
        }
        if (!ch) break;
      }
      stable = next.size === val.size && [...next].every(([k, v]) => val.get(k) === v);
      val.clear(); for (const [k, v] of next) val.set(k, v);
    }
    const get = (partId, pn) => { const v = val.get(nl.netOf(partId, pn)); return v === undefined ? null : v; };
    const outputs = {};
    for (const part of circ.parts) {
      const d = LIB[part.type];
      if (d.read) outputs[part.id] = d.read({ in: (pn) => get(part.id, pn), props: Object.assign({}, d.props, part.props) });
    }
    return { val, get, outputs, stable, iter, flags, weak: weakSet, nl };
  }

  // ------------------------------------------------------------------ ERC
  function erc(circ, nl, sim) {
    nl = nl || netlist(circ); sim = sim || simulate(circ, nl);
    const out = [];   // {level:'error'|'warn'|'info', msg, parts:[], net}
    const P = new Map(circ.parts.map(p => [p.id, p]));
    const nm = (r) => { const part = P.get(r.part); return (part.ref || part.id) + '.' + (LIB[r.type].pinMap[r.pin].label || r.pin); };
    for (const net of nl.nets.values()) {
      const real = net.real || [];
      const srcs = real.filter(r => r.def.src !== undefined);
      const volts = [...new Set(srcs.filter(r => !r.def.weak).map(r => r.def.src))];
      if (volts.length > 1) {
        const hasGnd = volts.includes(0);
        out.push({ level: 'error', net: net.id, parts: srcs.map(r => r.part),
          msg: (hasGnd ? 'KORSLETING: sumber tegangan tersambung langsung ke GND · ' : 'Dua sumber tegangan beradu · ') + srcs.map(nm).join(' ↔ ') });
      }
      const vmax = Math.max(-1, ...srcs.map(r => r.def.src));
      const strong = srcs.filter(r => !r.def.weak);
      for (const r of srcs.filter(q => q.def.weak)) if (strong.some(q => q.def.src !== r.def.src))
        out.push({ level: 'error', net: net.id, parts: [r.part], msg: `${nm(r)} adalah keluaran regulator: jangan disambung ke ${strong.map(nm).join(', ')}` });
      const ios = real.filter(r => r.def.t === 'io');
      if (ios.length && strong.length && strong.every(q => q.def.src === 0))
        for (const r of ios) out.push({ level: 'warn', net: net.id, parts: [r.part], msg: `${nm(r)} tersambung langsung ke GND (${strong.map(nm).join(', ')}). Pin bergeser?` });
      const pwrs = real.filter(r => r.def.t === 'pwr');
      if (ios.length && pwrs.length && !strong.length)
        out.push({ level: 'warn', net: net.id, parts: pwrs.map(r => r.part), msg: `${pwrs.map(nm).join(', ')} disambung ke ${ios.map(nm).join(', ')}: pin daya bukan untuk sinyal` });
      for (const r of real) {
        if (r.def.max !== undefined && vmax > r.def.max)
          out.push({ level: 'error', net: net.id, parts: [r.part], msg: `${nm(r)} maksimal ${r.def.max} V, tapi tersambung ke sumber ${vmax} V` });
        if (r.def.t === 'pwr') {
          if (vmax < 0) out.push({ level: 'warn', net: net.id, parts: [r.part], msg: `${nm(r)} belum mendapat daya` });
          else if (vmax === 0) out.push({ level: 'error', net: net.id, parts: [r.part], msg: `${nm(r)} tersambung ke GND (terbalik?)` });
          else if (r.def.vmax !== undefined && vmax > r.def.vmax) out.push({ level: 'error', net: net.id, parts: [r.part], msg: `${nm(r)} maksimal ${r.def.vmax} V, diberi ${vmax} V` });
          else if (r.def.vmin !== undefined && vmax < r.def.vmin) out.push({ level: 'warn', net: net.id, parts: [r.part], msg: `${nm(r)} butuh ≥ ${r.def.vmin} V, hanya ${vmax} V` });
        }
        if (r.def.t === 'gnd' && real.length > 1 && vmax > 0 && !volts.includes(0)) { /* sudah dilaporkan sebagai korsleting */ }
        if (r.def.pullupTo) {
          const io = real.find(o => o.def.max !== undefined);
          if (io) out.push({ level: 'error', net: net.id, parts: [r.part, io.part], msg: `${nm(r)} ditarik ke tegangan baterai: jangan sambungkan ke ${nm(io)}` });
        }
      }
      // keluaran beradu
      const outs = real.filter(r => r.def.t === 'out');
      if (sim.val.get(net.id) === 'X' && volts.length < 2) out.push({ level: 'error', net: net.id, parts: outs.map(r => r.part), msg: 'Konflik logika: net digerakkan 1 dan 0 sekaligus · ' + real.map(nm).join(', ') });
      // masukan gerbang mengambang
      const ins = real.filter(r => r.def.t === 'in' && !LIB[r.type].ic && (LIB[r.type].sim || LIB[r.type].read));
      if (ins.length && (sim.val.get(net.id) === undefined)) {
        for (const r of ins) out.push({ level: 'warn', net: net.id, parts: [r.part], msg: `${nm(r)} mengambang (belum tersambung ke sinyal)` });
      }
    }
    for (const [id, m] of sim.flags) out.push({ level: 'warn', parts: [id], msg: (P.get(id).ref || id) + ': ' + m });
    // aturan khusus modul
    for (const part of circ.parts) {
      const d = LIB[part.type];
      if (d.ic) {   // hanya gerbang IC yang keluarannya dipakai yang diperiksa masukannya
        const lab = {}; d.pins.forEach(p => { lab[p.label] = p.n; });
        for (let u = 1; u <= (d.ic === 'NOT' ? 6 : 4); u++) {
          const yNet = nl.nets.get(nl.netOf(part.id, lab[u + 'Y']));
          if (!yNet || (yNet.real || []).length < 2) continue;
          for (const ip of (d.ic === 'NOT' ? ['A'] : ['A', 'B'])) {
            const pn = lab[u + ip], n = nl.netOf(part.id, pn);
            if (sim.val.get(n) === undefined) out.push({ level: 'warn', net: n, parts: [part.id], msg: `${part.ref}: pin ${pn} (${u}${ip}) mengambang, padahal keluaran ${u}Y dipakai` });
          }
        }
      }
      if (part.type === 'DRV8833') {
        const j1 = (part.props && part.props.j1) ? 1 : 0;
        const eep = nl.nets.get(nl.netOf(part.id, 'EEP'));
        const eepUsed = eep && (eep.real || []).some(r => r.part !== part.id && r.def.t !== 'pas');
        if (!j1 && !eepUsed) out.push({ level: 'warn', parts: [part.id], msg: `${part.ref}: J1 terbuka dan EEP tidak tersambung → driver tidur, motor tidak akan berputar` });
        if (j1 && eep && (eep.real || []).some(r => r.def.max !== undefined)) out.push({ level: 'error', parts: [part.id], msg: `${part.ref}: J1 dijembatani (EEP = VCC) tapi EEP juga ke GPIO → tegangan beradu` });
      }
    }
    if (!sim.stable) out.push({ level: 'warn', parts: [], msg: 'Rangkaian berosilasi (keluaran berubah terus), mis. NOT yang keluarannya kembali ke masukannya sendiri' });
    // hapus duplikat
    const seen = new Set();
    return out.filter(e => { const k = e.level + e.msg; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  // ------------------------------------------------------------------ tabel kebenaran
  function ioLists(circ) {
    const byLabel = (a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id), 'id', { numeric: true });
    return {
      inputs: circ.parts.filter(p => LIB[p.type].input).sort(byLabel),
      outputs: circ.parts.filter(p => LIB[p.type].output).sort(byLabel),
    };
  }
  function truthTable(circ, maxInputs = 6) {
    const { inputs, outputs } = ioLists(circ);
    if (!inputs.length || !outputs.length) return { inputs, outputs, rows: [], error: 'Butuh minimal satu saklar (masukan) dan satu lampu (keluaran).' };
    if (inputs.length > maxInputs) return { inputs, outputs, rows: [], error: `Maksimal ${maxInputs} masukan.` };
    const saved = inputs.map(p => (p.props && p.props.on) || 0);
    const nl = netlist(circ), rows = [];
    for (let m = 0; m < (1 << inputs.length); m++) {
      inputs.forEach((p, i) => { p.props = Object.assign({}, p.props, { on: (m >> (inputs.length - 1 - i)) & 1 }); });
      const s = simulate(circ, nl);
      rows.push({ in: inputs.map(p => p.props.on), out: outputs.map(p => s.outputs[p.id]) });
    }
    inputs.forEach((p, i) => { p.props.on = saved[i]; });
    return { inputs, outputs, rows };
  }

  // ------------------------------------------------------------------ teks netlist
  function netlistText(circ, nl) {
    nl = nl || netlist(circ);
    const P = new Map(circ.parts.map(p => [p.id, p]));
    const lines = ['# Netlist PILAR Papan Rangkai', '# komponen:'];
    for (const p of circ.parts) if (LIB[p.type].cat !== 'Breadboard') lines.push(`#   ${p.ref || p.id}  ${LIB[p.type].name}${p.label ? '  [' + p.label + ']' : ''}`);
    const nets = [...nl.nets.values()].filter(n => (n.real || []).length > 1).sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true }));
    for (const n of nets) lines.push(`${n.name.padEnd(6)} : ` + n.real.map(r => `${P.get(r.part).ref || r.part}.${r.pin}`).join('  '));
    return lines.join('\n');
  }

  // ------------------------------------------------------------------ penomoran referensi
  function nextRef(circ, type) {
    const pre = LIB[type].ref || 'X';
    if (pre === 'VCC' || pre === 'GND') return pre;
    let n = 1; const used = new Set(circ.parts.map(p => p.ref));
    while (used.has(pre + n)) n++;
    return pre + n;
  }
  function nextLabel(circ, type) {
    const d = LIB[type];
    const used = new Set(circ.parts.map(p => p.label));
    const seq = d.input ? 'ABCDEFGH' : d.output ? 'XYZQPSTUVW' : '';
    for (const ch of seq) if (!used.has(ch)) return ch;
    return '';
  }

  return { LIB, pinWorld, bbox, center, rotPt, netlist, simulate, erc, truthTable, ioLists, netlistText, nextRef, nextLabel, key };
});
