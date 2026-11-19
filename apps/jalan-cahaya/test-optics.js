// node apps/jalan-cahaya/test-optics.js — uji fisika mesin optik
const O = require('./optics.js'), D = 180 / Math.PI;
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('GAGAL:', m); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
// 1. Snell: sinar 30° masuk balok kaca n=1,5 → sudut bias asin(sin30/1,5)=19,47°
{ const sc = { elements: [{ type: 'laser', x: -200, y: 0, a: 0, rays: 1, w: 10 }, { type: 'balok', x: 0, y: 0, a: 30 / D, w: 100, h: 400, n: 1.5 }] };
  const r = O.trace(sc, { fresnel: false }); const e = r.events.find(e => e.type === 'bias');
  t(near(e.i * D, 30, .01) && near(e.r * D, 19.471, .01), `Snell 30°→${(e.r * D).toFixed(3)}°`);
  const last = r.segs[r.segs.length - 1], dir = O.V.norm(O.V.sub(last.b, last.a)); t(near(dir.y, 0, 1e-6) && dir.x > 0, 'keluar balok sejajar arah semula'); }
// 2. sudut kritis kaca 41,8°: sinar dalam balok membentur dinding 45° → TIR, 40° → tembus
{ t(near(O.critical(1.5, 1) * D, 41.81, .01), 'sudut kritis 41,81°');
  const mk = ang => ({ elements: [{ type: 'laser', x: 0, y: 0, a: 0, rays: 1, w: 0 }, { type: 'balok', x: 100, y: 0, a: 0, w: 400, h: 400, n: 1.5 }] });
  // laser di dalam balok? taruh laser di dalam: titik awal di dalam balok (x=0 di tepi kiri -100) → mulai di x=50 dalam kaca menuju dinding miring
  const sc = { elements: [{ type: 'balok', x: 0, y: 0, a: 0, w: 400, h: 400, n: 1.5 }, { type: 'laser', x: 0, y: 0, a: 0, rays: 1, w: 0 }] };
  const rot = deg => { sc.elements[0].a = -deg / D; const r = O.trace(sc, { fresnel: false }); return r.events[0]; };
  t(rot(45).type === 'tir', 'sudut datang 45° → pantulan total'); t(rot(40).type === 'bias', 'sudut datang 40° → tembus'); }
// 3. lensa cembung: titik fokus sinar paraksial ≈ rumus pembuat lensa (lensa tebal)
{ const R = 300, tk = 40, n = O.nOf({ n: 'kaca' }, O.LASER_WL);
  const sc = { elements: [{ type: 'laser', x: -300, y: 0, a: 0, rays: 1, w: 0 }, { type: 'cembung', x: 0, y: 0, a: 0, R, t: tk, n: 'kaca' }] };
  const fx = []; for (const y of [4, 8]) { sc.elements[0].y = y; const r = O.trace(sc, { fresnel: false }); const s = r.segs[r.segs.length - 1], d = O.V.norm(O.V.sub(s.b, s.a)); fx.push(s.a.x + (-s.a.y / d.y) * d.x); }
  // jarak fokus belakang (BFL) dari permukaan belakang; f efektif dari bidang utama
  const f = O.lensmaker(n, R, tk), h = -f * (n - 1) * tk / (n * -R) ; // h' = −f(n−1)t/(n R1)
  const bfl = f - f * (n - 1) * tk / (n * R);  // BFL = f(1 − (n−1)t/(nR1))
  t(near(fx[0] - tk / 2, bfl, bfl * .01), `BFL tracer ${(fx[0] - tk / 2).toFixed(1)} vs rumus ${bfl.toFixed(1)}`);
  t(fx[1] < fx[0] + .5, 'aberasi sferis: sinar tepi fokus lebih dekat'); }
// 4. lensa cekung menyebarkan: sinar sejajar keluar menjauhi sumbu
{ const sc = { elements: [{ type: 'laser', x: -300, y: 20, a: 0, rays: 1, w: 0 }, { type: 'cekung', x: 0, y: 0, a: 0, R: 200, t: 12, H: 70, n: 'kaca' }] };
  const r = O.trace(sc, { fresnel: false }), s = r.segs[r.segs.length - 1]; t(s.b.y > s.a.y, 'cekung menyebarkan'); }
// 5. lensa tipis: bayangan s'=1/(1/f−1/s)
{ const f = 100, s = 300, sc = { elements: [{ type: 'lampu', x: -s, y: 30, a: 0, rays: 7, spread: .15 }, { type: 'tipis', x: 0, y: 0, a: 0, L: 400, f }, { type: 'layar', x: O.thinImage(f, s), y: 0, a: 0, L: 400 }] };
  const r = O.trace(sc, { fresnel: false }), hits = [...r.hits.values()][0]; const ys = hits.map(h => h.p.y);
  t(Math.max(...ys) - Math.min(...ys) < 1e-6, 'lensa tipis: semua sinar bertemu di satu titik'); t(near(ys[0], -30 * O.thinImage(f, s) / s, 1e-6), 'perbesaran −s\'/s (terbalik)'); }
// 6. dispersi prisma: ungu lebih dibelokkan dari merah
{ const sc = { elements: [{ type: 'laser', x: -360, y: 40, a: 0, rays: 1, w: 46, putih: true }, { type: 'prisma', x: -80, y: 40, a: Math.PI + 18 / D, s: 170, n: 'flint' }] };
  const r = O.trace(sc, { fresnel: false }); const end = c => { const s = r.segs.filter(s => s.col === c).pop(); return Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x); };
  t(end('#8b3dff') > end('#ff2222') && end('#ff2222') > 40 * Math.PI / 180, 'ungu terbias lebih kuat dari merah (deviasi minimum ±48°)'); }
// 7. cermin cekung: fokus di R/2
{ const R = 400, sc = { elements: [{ type: 'laser', x: -300, y: 6, a: 0, rays: 1, w: 0 }, { type: 'cerminCekung', x: 0, y: 0, a: 0, R, L: 200 }] };
  const r = O.trace(sc, { fresnel: false }), s = r.segs[r.segs.length - 1], d = O.V.norm(O.V.sub(s.b, s.a)); const fx = s.a.x + (-s.a.y / d.y) * d.x;
  t(near(fx, -R / 2, 1), `cermin cekung f=R/2: ${fx.toFixed(2)}`); }
// 8. serat optik: lurus → cahaya sampai; tikungan sangat tajam → bocor
{ const mk = Rb => ({ elements: [{ type: 'laser', x: -20, y: 0, a: .25, rays: 1, w: 0 }, { type: 'serat', x: 0, y: 0, a: 0, w: 20, clad: 0, nCore: 1.5, nClad: 1, path: [{ t: 'lurus', len: 200 }, { t: 'busur', R: Rb, ang: Math.PI / 2 }, { t: 'lurus', len: 200 }] }] });
  const out = Rb => { const sc = mk(Rb), r = O.trace(sc, { fresnel: false }); const s = r.segs[r.segs.length - 1]; const e = sc.elements[1].end; return { tir: r.events.filter(e => e.type === 'tir').length, endNear: Math.hypot(s.a.x - e.x, s.a.y - e.y) < 30 }; };
  const a = out(300), b = out(12); t(a.tir > 3 && a.endNear, 'tikungan landai: pantulan total berulang, cahaya sampai ujung'); t(!b.endNear, 'tikungan terlalu tajam: cahaya bocor'); }
// 9. balok setengah lingkaran: sinar menuju pusat tidak berbelok di sisi lengkung, TIR di sisi datar bila > sudut kritis
{ const at = deg => { const a = (180 - deg) / D, sc = { elements: [{ type: 'setengah', x: 0, y: 0, a: 0, R: 150, n: 1.5 }, { type: 'laser', x: Math.cos(a) * 260, y: -Math.sin(a) * 260, a: 0, rays: 1, w: 0 }] };
    sc.elements[1].a = Math.atan2(-sc.elements[1].y, -sc.elements[1].x); return O.trace(sc, { fresnel: false }); };
  const r1 = at(30), e1 = r1.events.filter(e => e.type === 'bias'); t(e1.length >= 1 && e1[0].i < 1e-3, 'masuk tegak lurus di sisi lengkung');
  t(at(50).events.some(e => e.type === 'tir'), '50° → pantulan total'); t(!at(35).events.some(e => e.type === 'tir'), '35° → tembus'); }
console.log(ok + ' lulus, ' + bad + ' gagal'); process.exit(bad ? 1 : 0);
