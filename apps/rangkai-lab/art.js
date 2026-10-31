/* PILAR · Papan Rangkai — gambar komponen (SVG string, koordinat lokal px, 1 grid = G px).
   Board Sebatang-Kara digambar ulang meniru modul asli (ilustrasi vektor fotorealistis). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RangkaiArt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const G = 20;
  const MONO = "ui-monospace,'Roboto Mono',Consolas,monospace";
  const HEAD = "'Fredoka','Arial Rounded MT Bold',Arial,sans-serif";
  const SANS = "Arial,Helvetica,sans-serif";

  const DEFS = `
<linearGradient id="rk-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".4" stop-color="#e2b54c"/><stop offset=".75" stop-color="#b8862b"/><stop offset="1" stop-color="#f3d27a"/></linearGradient>
<linearGradient id="rk-tin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfd4d8"/><stop offset=".8" stop-color="#9aa1a6"/><stop offset="1" stop-color="#e6e9eb"/></linearGradient>
<linearGradient id="rk-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8c9398"/><stop offset=".25" stop-color="#eef0f2"/><stop offset=".55" stop-color="#b3b9bd"/><stop offset="1" stop-color="#7d858a"/></linearGradient>
<linearGradient id="rk-can" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6569"/><stop offset=".12" stop-color="#a7aeb2"/><stop offset=".3" stop-color="#f1f3f4"/><stop offset=".45" stop-color="#c2c8cc"/><stop offset=".75" stop-color="#868e93"/><stop offset=".92" stop-color="#a7aeb2"/><stop offset="1" stop-color="#50585c"/></linearGradient>
<linearGradient id="rk-epoxy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d4044"/><stop offset=".5" stop-color="#25282a"/><stop offset="1" stop-color="#141516"/></linearGradient>
<linearGradient id="rk-ceram" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d6ab"/><stop offset=".5" stop-color="#c9ad78"/><stop offset="1" stop-color="#a88c58"/></linearGradient>
<linearGradient id="rk-res" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e2b8"/><stop offset=".5" stop-color="#d9bf86"/><stop offset="1" stop-color="#b39860"/></linearGradient>
<linearGradient id="rk-tant" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd76a"/><stop offset=".55" stop-color="#f0b429"/><stop offset="1" stop-color="#c88a10"/></linearGradient>
<linearGradient id="rk-elco" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d2f6b"/><stop offset=".45" stop-color="#3a6fc4"/><stop offset="1" stop-color="#0b2759"/></linearGradient>
<linearGradient id="rk-pouch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfbfc"/><stop offset=".15" stop-color="#d7dbde"/><stop offset=".5" stop-color="#eef0f1"/><stop offset=".85" stop-color="#c3c8cc"/><stop offset="1" stop-color="#9fa6ab"/></linearGradient>
<linearGradient id="rk-kapton" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c64a"/><stop offset=".5" stop-color="#e2a520"/><stop offset="1" stop-color="#b9800c"/></linearGradient>
<linearGradient id="rk-endcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3e41"/><stop offset=".3" stop-color="#6a6e72"/><stop offset=".6" stop-color="#2a2c2e"/><stop offset="1" stop-color="#161718"/></linearGradient>
<linearGradient id="rk-prop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9dde0"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c0c5"/></linearGradient>
<linearGradient id="rk-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".4" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>
<linearGradient id="rk-bb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdfcf8"/><stop offset="1" stop-color="#ebe7dc"/></linearGradient>
<radialGradient id="rk-glow"><stop offset="0" stop-color="#fff6b0"/><stop offset=".45" stop-color="#ffd23f" stop-opacity=".8"/><stop offset="1" stop-color="#ffb800" stop-opacity="0"/></radialGradient>
<radialGradient id="rk-cap" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5c6064"/><stop offset="1" stop-color="#0c0d0e"/></radialGradient>
<filter id="rk-ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1.6" stdDeviation="1.2" flood-opacity=".35"/></filter>`;

  const r = (x, y, w, h, fill, rx = 0, stroke = 'none', sw = 1, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
  const c = (x, y, rad, fill, stroke = 'none', sw = 1, extra = '') => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
  const t = (x, y, s, size, fill = '#f4f4f0', anchor = 'middle', weight = 700, fam = SANS, rot) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="${fam}"${rot !== undefined ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`;
  const l = (x1, y1, x2, y2, stroke, sw = 1, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;
  const p = (d, fill = 'none', stroke = 'none', sw = 1, extra = '') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
  const INK = '#17243a';

  // ---------------- pembantu PCB
  const smdR = (x, y, code = '103', rot = 0, w = 12, h = 6) => `<g transform="translate(${x} ${y}) rotate(${rot})">${r(-w / 2, -h / 2, w, h, '#16181a', 1)}${r(-w / 2, -h / 2, w * .22, h, 'url(#rk-tin)', .5)}${r(w / 2 - w * .22, -h / 2, w * .22, h, 'url(#rk-tin)', .5)}${t(0, h * .3, code, h * .62, '#ddd', 'middle', 400, MONO)}</g>`;
  const smdC = (x, y, rot = 0, w = 10, h = 5) => `<g transform="translate(${x} ${y}) rotate(${rot})">${r(-w / 2, -h / 2, w, h, 'url(#rk-ceram)', 1)}${r(-w / 2, -h / 2, w * .25, h, 'url(#rk-tin)', .5)}${r(w / 2 - w * .25, -h / 2, w * .25, h, 'url(#rk-tin)', .5)}</g>`;
  function qfn(x, y, sz, rot, label, sub, pins = 8) {
    let s = `<g transform="translate(${x} ${y}) rotate(${rot})">`; const q = sz / (pins + 1);
    for (let i = 0; i < pins; i++) { const o = -sz / 2 + q * (i + 1);
      s += r(o - .7, -sz / 2 - 1.6, 1.4, 2.2, 'url(#rk-tin)') + r(o - .7, sz / 2 - .6, 1.4, 2.2, 'url(#rk-tin)') + r(-sz / 2 - 1.6, o - .7, 2.2, 1.4, 'url(#rk-tin)') + r(sz / 2 - .6, o - .7, 2.2, 1.4, 'url(#rk-tin)'); }
    s += r(-sz / 2, -sz / 2, sz, sz, 'url(#rk-epoxy)', 1.5) + r(-sz / 2, -sz / 2, sz, sz, 'url(#rk-gloss)', 1.5) + c(-sz / 2 + 3.5, -sz / 2 + 3.5, 1.2, '#55595d');
    if (label) s += t(0, 0, label, sz * .14, '#9aa0a4', 'middle', 700, MONO);
    if (sub) s += t(0, sz * .17, sub, sz * .11, '#7c8286', 'middle', 400, MONO);
    return s + '</g>';
  }
  const pcb = (x, y, w, h, col, rx = 4) => r(x, y, w, h, col, rx, '#00000055', 1, 'filter="url(#rk-ds)"') + r(x, y, w, h, 'url(#rk-gloss)', rx);
  const hole = (x, y, kind = 'gold', rad = 6) => c(x, y, rad, kind === 'gold' ? 'url(#rk-gold)' : 'url(#rk-tin)', '#00000040', .7) + c(x, y, rad * .45, '#121212');
  function usbc(x, y, w, h) {
    let s = r(x - 3, y + h - 12, 6, 10, 'url(#rk-tin)', 1) + r(x + w - 3, y + h - 12, 6, 10, 'url(#rk-tin)', 1);
    s += r(x, y, w, h, 'url(#rk-metal)', 6, '#6f777c', .8, 'filter="url(#rk-ds)"');
    s += l(x + 4, y + h * .3, x + w - 4, y + h * .3, '#fff', 1, 'opacity=".7"');
    for (const xx of [x + w * .2, x + w * .64]) s += r(xx, y + h * .6, w * .16, h * .18, '#7d858a', 1);
    return s;
  }

  // ---------------- komponen logika
  const GATE_PATH = {
    AND: 'M12,6 H40 A20,20 0 0,1 40,74 H12 Z',
    NAND: 'M12,6 H38 A20,20 0 0,1 38,74 H12 Z',
    OR: 'M8,6 Q30,6 50,20 Q62,30 68,40 Q62,50 50,60 Q30,74 8,74 Q22,40 8,6 Z',
    NOR: 'M8,6 Q28,6 46,20 Q56,30 62,40 Q56,50 46,60 Q28,74 8,74 Q22,40 8,6 Z',
    XOR: 'M14,6 Q36,6 54,20 Q64,30 70,40 Q64,50 54,60 Q36,74 14,74 Q28,40 14,6 Z',
    XNOR: 'M14,6 Q34,6 50,20 Q58,30 63,40 Q58,50 50,60 Q34,74 14,74 Q28,40 14,6 Z',
  };
  function gate(type, st) {
    const h = type === 'NOT' ? 2 * G : 4 * G;
    let s = '';
    const lead = (y, x2) => l(0, y, x2, y, INK, 3);
    if (type === 'NOT') {
      s += lead(G, 16) + l(64, G, 4 * G, G, INK, 3);
      s += p(`M16,${G - 16} L54,${G} L16,${G + 16} Z`, '#ffffff', INK, 3) + c(59, G, 5, '#fff', INK, 3);
    } else {
      const inX = type.includes('OR') ? (type.startsWith('X') ? 20 : 18) : 12;
      s += lead(G, inX) + lead(3 * G, inX);
      const bubble = type.startsWith('N') || type === 'XNOR';
      const tip = { AND: 60, NAND: 58, OR: 68, NOR: 62, XOR: 70, XNOR: 63 }[type];
      s += l(tip + (bubble ? 10 : 0), 2 * G, 4 * G, 2 * G, INK, 3);
      s += p(GATE_PATH[type], '#ffffff', INK, 3);
      if (type.startsWith('X')) s += p('M6,6 Q20,40 6,74', 'none', INK, 3);
      if (bubble) s += c(tip + 5, 2 * G, 5, '#fff', INK, 3);
    }
    const lab = type === 'NOT' ? 'NOT' : type;
    s += t(type === 'NOT' ? 30 : 36, (type === 'NOT' ? G : 2 * G) + 4, lab, type.length > 3 ? 10 : 11, INK, 'middle', 700, HEAD);
    void h; void st;
    return s;
  }

  function dip(def, st) {
    const W = 6 * G; let s = '';
    for (const pn of def.pins) {
      const x = pn.x * G, top = pn.y === 0;
      s += r(x - 3, top ? -3 : 3 * G - 9, 6, 12, 'url(#rk-tin)', 1, '#8a9196', .6);
    }
    s += r(-10, 8, W + 20, 3 * G - 16, 'url(#rk-epoxy)', 3, '#0a0a0a', 1, 'filter="url(#rk-ds)"') + r(-10, 8, W + 20, 3 * G - 16, 'url(#rk-gloss)', 3);
    s += p(`M-10,${1.5 * G - 7} a7,7 0 0,1 0,14`, '#0e0f10');
    s += c(-1, 3 * G - 15, 2.4, '#53575b');
    s += t(W / 2, 1.5 * G + 1, def.type, 13, '#d7dadc', 'middle', 700, MONO);
    s += t(W / 2, 1.5 * G + 12, def.desc, 8.5, '#9aa0a4', 'middle', 400, MONO);
    for (const pn of def.pins) {
      const x = pn.x * G, top = pn.y === 0;
      s += t(x, top ? 18 : 3 * G - 12, pn.label, 6.2, pn.label === 'VCC' ? '#ff9e9e' : pn.label === 'GND' ? '#9ec7ff' : '#c9cdd0', 'middle', 700, MONO);
    }
    if (st && st.flag) s += r(-10, 8, W + 20, 3 * G - 16, 'none', 3, '#f5a524', 2, 'stroke-dasharray="4 3"');
    return s;
  }

  // ---------------- pasif
  const BANDS = { '0': '#1b1b1b', '1': '#7a4a1e', '2': '#d32f2f', '3': '#f07b16', '4': '#f2c200', '5': '#2e9d4f', '6': '#1e63d6', '7': '#7b3fc4', '8': '#8a8a8a', '9': '#f4f4f4' };
  function bandsOf(v) {
    const m = String(v).trim().toLowerCase().replace('ω', '').match(/^([\d.]+)\s*([kmr]?)/);
    if (!m) return ['#7a4a1e', '#1b1b1b', '#f07b16'];
    let ohm = parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1);
    if (!(ohm >= 1)) ohm = 10;
    const e = Math.floor(Math.log10(ohm)) - 1; const sig = Math.round(ohm / Math.pow(10, e));
    const ds = String(Math.min(99, sig)).padStart(2, '0');
    return [BANDS[ds[0]], BANDS[ds[1]], BANDS[String(Math.max(0, Math.min(9, e)))]];
  }

  // ---------------- board Sebatang-Kara
  function esp32s3() {
    let s = pcb(-12, -30, 6 * G + 24, 8 * G + 42, '#15171a', 6);
    s += usbc(G * 3 - 26, -52, 52, 48);
    const L = ['TX', 'RX', '1', '2', '3', '4', '5', '6', '7'], R = ['5V', 'GND', '3V3', '13', '12', '11', '10', '9', '8'];
    for (let i = 0; i < 9; i++) {
      s += r(-12, i * G - 6, 9, 12, 'url(#rk-gold)', 2) + r(6 * G + 3, i * G - 6, 9, 12, 'url(#rk-gold)', 2);
      s += hole(0, i * G) + hole(6 * G, i * G);
      s += t(10, i * G + 3.5, L[i], 8, '#f2f2ee', 'start') + t(6 * G - 10, i * G + 3.5, R[i], 8, '#f2f2ee', 'end');
    }
    for (const [x, lab] of [[42, 'BOOT'], [78, 'RST']]) s += r(x - 9, 2, 18, 13, '#c9ced1', 2, '#7d858a', .6) + c(x, 8.5, 4, 'url(#rk-cap)') + t(x, 22, lab, 5.5, '#ddd');
    s += smdC(60, 30) + smdC(40, 36, 90) + smdR(82, 36, '510', 90);
    s += qfn(60, 86, 40, 45, 'ESP32-S3', 'FH4R2', 10);
    s += r(84, 108, 13, 13, '#f4f4f0', 1.5) + r(87.5, 111.5, 6, 6, '#d06090', 1, 'none', 1, 'opacity=".6"') + t(91, 132, '48', 7, '#f2f2ee');
    s += r(36, 146, 48, 14, '#f2f2ec', 2) + r(42, 147, 36, 12, '#d32525', 1.5) + t(60, 156.5, 'C3', 8.5, '#fff');
    return s;
  }
  function gy87() {
    let s = pcb(-14, -12, 7 * G + 28, 6 * G + 10, '#1d4fb8', 5);
    for (let i = 0; i < 8; i++) s += hole(i * G, 0);
    s += c(7 * G - 2, 6 * G - 22, 11, '#f2f3ee') + c(7 * G - 2, 6 * G - 22, 13, 'none', '#d4def4', 2);
    s += r(-4, 14, 30, 28, 'url(#rk-metal)', 3, '#6f777c', .8) + t(11, 25, '1244', 5, '#4d5459', 'middle', 700, MONO) + t(11, 32, 'U403', 5, '#4d5459', 'middle', 700, MONO) + c(20, 36, 1.8, '#3a3f43');
    s += t(26, 62, 'GY-87', 9, '#fff', 'middle', 700, SANS, -8);
    s += p('M62,70 v-16 M62,54 l-2.5,5 M62,54 l2.5,5 M62,70 h16 M78,70 l-5,-2.5 M78,70 l-5,2.5', 'none', '#fff', 1.2) + t(58, 53, 'Y', 6, '#fff') + t(83, 72, 'X', 6, '#fff');
    s += qfn(106, 86, 24, 0, 'MPU', '6050', 5) + qfn(20, 88, 16, 0, '5883', '', 4);
    s += r(112, 18, 14, 24, 'url(#rk-tant)', 2, '#a8740c', .6);
    s += smdR(52, 22, '222') + smdR(76, 22, '222') + smdR(96, 34, '103', 90) + smdC(76, 36) + smdC(52, 98) + smdC(70, 98) + smdR(132, 52, '472', 90);
    return s;
  }
  function drv8833(def, st) {
    const j1 = st && st.props && st.props.j1;
    let s = pcb(-14, -16, 6 * G + 28, 5 * G + 32, '#121314', 4);
    for (const d of ['M20,20 C40,20 44,10 56,10 H66', 'M20,60 C46,60 50,44 60,44', 'M100,20 C84,20 78,30 68,30', 'M100,80 C82,80 80,64 70,64', 'M56,10 V96', 'M66,10 V96'])
      s += p(d, 'none', 'rgba(255,255,255,.06)', 2.5);
    for (const pn of def.pins) s += hole(pn.x * G, pn.y * G, 'tin');
    for (const pn of def.pins) {
      if (pn.x === 0) s += t(11, pn.y * G + 3.5, pn.n, 9, '#f4f4f0', 'start');
      else s += t(6 * G - 11, pn.y * G + 3.5, pn.n, 9, '#f4f4f0', 'end');
    }
    s += r(50, -12, 26, 11, 'none', 2, '#f4f4f0', 1.2) + r(53, -10, 8.5, 7, 'url(#rk-tin)', 1) + r(64.5, -10, 8.5, 7, 'url(#rk-tin)', 1);
    if (j1) s += r(59, -9, 8, 5, '#c9ced1', 1, '#666', .5);
    s += t(46, -3.5, 'J1', 7, '#f4f4f0', 'end') + t(48, 9, 'on', 5.5, '#f4f4f0') + t(48, 16, 'sleep', 5.5, '#f4f4f0');
    s += t(60, 5 * G + 11, 'DRV8833', 9, '#f4f4f0');
    return s;
  }
  function charger() {
    let s = pcb(0, 0, 8 * G, 10 * G, '#111214', 4);
    s += usbc(4 * G - 28, -24, 56, 54);
    for (const [x, y] of [[38, 10], [38, 40], [122, 10], [122, 40]]) s += r(x - 4, y - 8, 8, 16, '#0a0a0b', 4, '#e3c060', 1.2);
    s += hole(8 * G, 2 * G, 'tin', 7) + hole(8 * G, 4 * G, 'tin', 7) + hole(8 * G, 8 * G, 'gold', 5) + hole(2 * G, 10 * G, 'tin', 7) + hole(5 * G, 10 * G, 'tin', 7);
    s += t(8 * G - 14, 2 * G + 4, '−', 12) + t(8 * G - 14, 4 * G + 4, '+', 12) + t(8 * G - 14, 3 * G + 4, '5V', 9, '#f4f4f0', 'middle', 700, SANS, -90) + t(8 * G - 12, 8 * G + 4, 'K', 9);
    s += t(2 * G - 14, 10 * G - 4, '−', 12) + t(5 * G + 14, 10 * G - 4, '+', 12) + t(2 * G, 10 * G - 12, 'B−', 7) + t(5 * G, 10 * G - 12, 'B+', 7);
    s += r(84, 104, 54, 54, '#4a4e52', 5, '#2d3033', 1) + r(88, 108, 46, 46, '#5a5f63', 4) + t(111, 136, '2R2', 10, '#b9bec2', 'middle', 700, MONO);
    s += r(40, 108, 24, 36, 'url(#rk-epoxy)', 2) + t(52, 126, 'IP5306', 5, '#8f9599', 'middle', 700, MONO, 90);
    for (let i = 0; i < 4; i++) s += r(12, 108 + i * 12, 10, 6, '#f4f2ea', 1) + r(14.5, 109.5 + i * 12, 5, 3, '#9fd4ff', .5);
    s += smdC(68, 76, 0, 22, 10) + smdC(104, 76, 0, 22, 10) + smdC(30, 92, 0, 18, 8) + smdC(80, 172, 0, 22, 10) + smdR(104, 94, '1R0') + smdR(126, 94, '5R1');
    return s;
  }
  function lipo() {
    let s = r(0.6 * G, 0, 13.4 * G, 6 * G, 'url(#rk-pouch)', 9, '#9aa0a5', 1, 'filter="url(#rk-ds)"');
    s += r(16, 4, 3.6 * G - 16, 6 * G - 8, '#e8e0cf', 4) + r(20, 26, 22, 12, '#1f2224', 1.5) + r(20, 82, 22, 12, '#1f2224', 1.5);
    s += r(0.6 * G, 0, 3 * G, 6 * G, 'url(#rk-kapton)', 6, 'none', 1, 'opacity=".92"');
    s += t(8.6 * G, 2.6 * G, '351639', 15, '#5b6267', 'middle', 400, MONO) + t(8.6 * G, 3.8 * G, '3.7V Li-Po 1S', 13, '#5b6267', 'middle', 400, MONO) + t(8.6 * G, 4.8 * G, 'tertulis 1500 mAh', 9, '#80878c', 'middle', 400, MONO);
    for (const [y, col] of [[2 * G, '#d32f2f'], [4 * G, '#262626']]) s += p(`M30,${y} C18,${y} 10,${y} 0,${y}`, 'none', col, 5, 'stroke-linecap="round"') + c(30, y, 4, 'url(#rk-tin)');
    return s;
  }
  function motor() {
    const cy = 3 * G, rad = 34; let s = '';
    s += p(`M44,${cy} C38,${cy - 34} 28,${cy - 64} 20,${cy - 70} C15,${cy - 74} 10,${cy - 70} 13,${cy - 62} C20,${cy - 44} 32,${cy - 20} 38,${cy - 4}Z`, 'url(#rk-prop)', '#b5bcc1', 1, 'filter="url(#rk-ds)"');
    s += r(72, cy - rad, 128, 2 * rad, 'url(#rk-can)', 0, 'none', 1, 'filter="url(#rk-ds)"') + p(`M72,${cy - rad} a7,${rad} 0 0,0 0,${2 * rad}`, 'url(#rk-can)', '#5d6569', .8);
    s += r(196, cy - rad, 18, 2 * rad, 'url(#rk-endcap)', 3);
    s += r(58, cy - 9, 16, 18, 'url(#rk-metal)', 2, '#7c8388', .8) + r(40, cy - 2.5, 20, 5, 'url(#rk-metal)', 1) + r(32, cy - 9, 15, 18, '#f2f3f4', 4, '#b5bcc1', 1);
    s += p(`M40,${cy} C46,${cy + 34} 58,${cy + 66} 66,${cy + 72} C71,${cy + 76} 76,${cy + 72} 73,${cy + 64} C66,${cy + 46} 54,${cy + 22} 46,${cy + 4}Z`, 'url(#rk-prop)', '#b5bcc1', 1, 'filter="url(#rk-ds)"');
    s += t(136, cy + 4, '8520', 10, '#5b6368', 'middle', 700, MONO);
    s += p(`M212,${cy - 12} C226,${cy - 12} 228,${2 * G} ${12 * G},${2 * G}`, 'none', '#ecebe6', 4.5, 'stroke-linecap="round"');
    s += p(`M212,${cy + 8} C226,${cy + 8} 228,${4 * G} ${12 * G},${4 * G}`, 'none', '#262626', 4.5, 'stroke-linecap="round"');
    return s;
  }

  function breadboard(def) {
    const W = (def.cols + 1) * G; let s = '';
    s += r(G * .3, -G * .9, W - G * .6, 18.8 * G, 'url(#rk-bb)', 10, '#d3cfc2', 1.2, 'filter="url(#rk-ds)"');
    s += r(G * .5, 8.15 * G, W - G, 1.7 * G, '#e2ded3', 4);
    const rails = [[0, '#d32f2f', -.55], [1, '#1565c0', .55], [16, '#d32f2f', -.55], [17, '#1565c0', .55]];
    for (const [y, col, off] of rails) s += l(G * .8, (y + off) * G, W - G * .8, (y + off) * G, col, 1.6);
    s += t(G * .55, 0.35 * G, '+', 11, '#d32f2f', 'middle', 900) + t(G * .55, 1.35 * G, '−', 12, '#1565c0', 'middle', 900);
    s += t(G * .55, 16.35 * G, '+', 11, '#d32f2f', 'middle', 900) + t(G * .55, 17.35 * G, '−', 12, '#1565c0', 'middle', 900);
    for (const pn of def.pins) s += r(pn.x * G - 3.5, pn.y * G - 3.5, 7, 7, '#36342e', 1.4);
    for (const [rw, y] of Object.entries(def.rows)) if (rw.length === 1) s += t(G * .55, y * G + 3, rw, 7, '#9b9688', 'middle', 700);
    for (let col = 1; col <= def.cols; col += (col === 1 ? 4 : 5)) s += t(col * G, 2.2 * G, String(col), 7, '#9b9688', 'middle', 700) + t(col * G, 15.2 * G, String(col), 7, '#9b9688', 'middle', 700);
    return s;
  }

  // ---------------- titik masuk
  function draw(def, st) {
    st = st || {}; const props = st.props || {};
    switch (def.type) {
      case 'VCC': return l(G, 2 * G, G, 14, '#d32f2f', 3) + p(`M${G - 10},14 L${G},2 L${G + 10},14 Z`, '#ffd4d4', '#d32f2f', 2.5) + t(G, -4, '+5V', 10, '#d32f2f', 'middle', 700, HEAD);
      case 'GND': return l(G, 0, G, 14, INK, 3) + l(G - 13, 14, G + 13, 14, INK, 3) + l(G - 8, 20, G + 8, 20, INK, 3) + l(G - 3, 26, G + 3, 26, INK, 3);
      case 'SWITCH': case 'BUTTON': {
        const on = props.on ? 1 : 0, lab = st.label || '';
        let s = r(2, 4, 3 * G - 8, 2 * G - 8, on ? '#c9f5c4' : '#ffffff', 8, INK, 3) + l(3 * G - 6, G, 3 * G, G, INK, 3);
        if (def.type === 'SWITCH') s += r(12, 12, 28, 16, '#e6edf5', 8, INK, 2) + c(on ? 32 : 20, 20, 7, on ? '#2f9e57' : '#7c8a9c', INK, 2);
        else s += c(26, 20, 10, on ? '#2f9e57' : '#d9445f', INK, 2.5) + c(26, 20, 5, '#ffffff55');
        s += t(48, 25, on ? '1' : '0', 14, INK, 'middle', 700, HEAD);
        if (lab) s += t(24, -6, lab, 15, INK, 'middle', 700, HEAD);
        return s;
      }
      case 'PROBE': {
        const v = st.value; const lit = v === 1;
        let s = l(0, G, 6, G, INK, 3);
        if (lit) s += c(G + 2, G, 24, 'url(#rk-glow)');
        s += c(G + 2, G, 14, lit ? '#ffd23f' : v === 'X' ? '#ff8a8a' : v === 0 ? '#c9d3df' : '#eef2f7', INK, 3, v === null || v === undefined ? 'stroke-dasharray="4 3"' : '');
        s += t(G + 2, G + 5, v === 'X' ? 'X' : v === null || v === undefined ? '?' : String(v), 13, INK, 'middle', 700, HEAD);
        if (st.label) s += t(G + 2, -4, st.label, 14, INK, 'middle', 700, HEAD);
        return s;
      }
      case 'LED': {
        const lit = st.value === 1, col = { red: '#ff3b3b', green: '#2fdc5a', blue: '#3b8cff', yellow: '#ffd23f', white: '#f2f6ff' }[props.color] || '#ff3b3b';
        let s = l(0, 3 * G, 0, 26, '#9aa1a6', 2.4) + l(G, 3 * G, G, 28, '#9aa1a6', 2.4) + p(`M${G},28 l-4,-4`, 'none', '#9aa1a6', 2.4);
        if (lit) s += c(G / 2, 12, 26, col, 'none', 1, 'opacity=".35"');
        s += p(`M-4,28 V12 A14,14 0 0,1 24,12 V28 Z`, col, '#00000055', 1.2, `opacity="${lit ? 1 : .55}"`) + r(-6, 26, 32, 4, col, 1.5, '#00000055', 1);
        s += p('M2,10 A8,8 0 0,1 10,2', 'none', '#ffffff', 2, 'opacity=".75"');
        if (st.label) s += t(G / 2, -10, st.label, 14, INK, 'middle', 700, HEAD);
        return s;
      }
      case 'BIN4': {
        const v = typeof st.value === 'number' ? st.value : 0;
        let s = r(4, 0, 5 * G - 4, 3 * G + 4, '#13202f', 8, INK, 3);
        s += t(5 * G / 2 + 12, 2 * G + 2, String(v), 30, '#7dffb0', 'middle', 700, MONO) + t(14, 2 * G + 2, '=', 16, '#7dffb0', 'start', 700, MONO);
        for (let i = 0; i < 4; i++) { const bit = (v >> (3 - i)) & 1; s += c((i + 1) * G, 12, 6, bit ? '#ffd23f' : '#33475e', '#0a1320', 1) + l((i + 1) * G, 3 * G + 4, (i + 1) * G, 4 * G, INK, 3); }
        s += t(5 * G - 10, 3 * G - 2, 'hex ' + v.toString(16).toUpperCase(), 7, '#8fb3d9', 'end', 700, MONO);
        if (st.label) s += t(-6, 14, st.label, 13, INK, 'end', 700, HEAD);
        return s;
      }
      case 'NOT': case 'AND': case 'OR': case 'NAND': case 'NOR': case 'XOR': case 'XNOR': return gate(def.type, st);
      case 'RES': {
        const b = bandsOf(props.value || '10k');
        let s = l(0, 0, 4 * G, 0, '#9aa1a6', 2.4);
        s += `<g filter="url(#rk-ds)">${p('M20,-8 q0,-3 5,-3 h30 q5,0 5,3 v16 q0,3 -5,3 h-30 q-5,0 -5,-3z', 'url(#rk-res)', '#9f8650', .7)}</g>`;
        b.forEach((col, i) => { s += r(27 + i * 7, -11, 4, 22, col); });
        s += r(52, -11, 3.5, 22, '#c9a645');
        return s + t(2 * G, -15, props.value || '10k', 8, INK, 'middle', 700, HEAD);
      }
      case 'CAP': return l(0, 0, 2 * G, 0, '#9aa1a6', 2.2) + `<ellipse cx="${G}" cy="-8" rx="11" ry="9" fill="#e59a33" stroke="#a96a12" stroke-width="1" filter="url(#rk-ds)"/>` + t(G, -5, '104', 6.5, '#5a3700', 'middle', 700, MONO);
      case 'ELCO': return l(0, 2 * G, 0, 26, '#9aa1a6', 2.2) + l(G, 2 * G, G, 26, '#9aa1a6', 2.2) + r(-6, -8, 32, 36, 'url(#rk-elco)', 6, 'none', 1, 'filter="url(#rk-ds)"') + r(17, -8, 6, 36, '#cfd8e6', 2) + t(8, 12, '220', 7, '#fff', 'middle', 700) + t(20, 6, '−', 8, '#17243a', 'middle', 900);
      case 'SLIDE': {
        const on = props.on ? 1 : 0;
        let s = ''; for (let i = 0; i < 3; i++) s += r(i * G - 2, 6, 4, G - 6, 'url(#rk-tin)', 1);
        s += r(-10, -10, 2 * G + 20, 18, '#2f3336', 4, 'none', 1, 'filter="url(#rk-ds)"') + r(-2, -6, 2 * G + 4, 10, '#1c1f21', 2) + r(on ? G + 2 : -2, -8, 16, 14, '#dfe3e5', 2);
        return s + t(G, -14, on ? 'ON' : 'OFF', 8, INK, 'middle', 700, HEAD);
      }
      case 'BB17': case 'BB30': return breadboard(def);
      case 'ESP32S3': return esp32s3();
      case 'GY87': return gy87();
      case 'DRV8833': return drv8833(def, st);
      case 'CHARGER': return charger();
      case 'LIPO': return lipo();
      case 'MOTOR': return motor();
      default: if (def.ic) return dip(def, st);
    }
    return r(0, 0, def.w * G, def.h * G, '#fff', 4, INK, 2);
  }

  // kotak pilih (lokal) mencakup gambar, termasuk bagian yang menjorok
  const EXTENT = { ESP32S3: [-14, -54, 6 * G + 28, 8 * G + 66], GY87: [-14, -12, 7 * G + 28, 6 * G + 10], DRV8833: [-14, -16, 6 * G + 28, 5 * G + 32],
    CHARGER: [0, -24, 8 * G + 8, 10 * G + 30], LIPO: [0, 0, 14 * G, 6 * G], MOTOR: [8, -10, 12 * G, 6 * G + 20], RES: [0, -16, 4 * G, 30], CAP: [0, -18, 2 * G, 22],
    ELCO: [-6, -10, 32, 2 * G + 10], SLIDE: [-10, -24, 2 * G + 20, 2 * G], LED: [-8, -22, 36, 3 * G + 22], VCC: [8, -16, 24, 2 * G + 16], GND: [6, 0, 28, 30] };
  function extent(def) {
    if (EXTENT[def.type]) return EXTENT[def.type];
    if (def.ic) return [-10, -4, 6 * G + 20, 3 * G + 8];
    if (def.cat === 'Breadboard') return [6, -18, (def.cols + 1) * G - 12, 18.8 * G];
    return [-4, -18, def.w * G + 8, Math.max(def.h, 1) * G + 22];
  }

  return { G, DEFS, draw, extent, bandsOf };
});
