/* Jalan Cahaya · mesin optik 2D (ray tracing fisika sungguhan)
   - Pembiasan: hukum Snell n1·sinθ1 = n2·sinθ2 di setiap permukaan
   - Pantulan total (TIR) bila sinθ2 > 1; pantulan sebagian (Fresnel) menghasilkan sinar pantul samar
   - Dispersi: indeks bias bergantung panjang gelombang (persamaan Cauchy n = A + B/λ²)
   - Lensa tipis ideal (untuk model kamera & teropong): tanθ' = tanθ − h/f
   Satuan dunia bebas (≈ mm). UMD: window.OPTIKA / require('./optics.js'). */
(function (root, f) { const O = f(); if (typeof module === 'object' && module.exports) module.exports = O; else root.OPTIKA = O; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const EPS = 1e-4, FAR = 1e5;
  const V = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }), sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
    dot: (a, b) => a.x * b.x + a.y * b.y, len: a => Math.hypot(a.x, a.y), norm: a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
    rot: (a, t) => ({ x: a.x * Math.cos(t) - a.y * Math.sin(t), y: a.x * Math.sin(t) + a.y * Math.cos(t) }), cross: (a, b) => a.x * b.y - a.y * b.x,
  };
  // ---------- bahan ----------
  const GLASS = { // Cauchy A, B (µm²)
    kaca: { A: 1.5046, B: 0.00420, nama: 'kaca (crown)' },
    flint: { A: 1.5950, B: 0.01050, nama: 'kaca flint' },
    air: { A: 1.3240, B: 0.00310, nama: 'air' },
    akrilik: { A: 1.4800, B: 0.00450, nama: 'akrilik' },
    berlian: { A: 2.3800, B: 0.01200, nama: 'berlian' },
  };
  const LASER_WL = 0.65;
  function nOf(el, wl) {
    if (typeof el.n === 'number') return el.n;
    const g = GLASS[el.n] || GLASS.kaca; return g.A + g.B / (wl * wl);
  }
  // ---------- transformasi ----------
  const toLocal = (el, p) => V.rot(V.sub(p, el), -(el.a || 0));
  const toWorld = (el, p) => V.add(V.rot(p, el.a || 0), el);
  const inDisk = (p, cx, cy, r) => (p.x - cx) ** 2 + (p.y - cy) ** 2 <= r * r * (1 + 1e-9) + 1e-6;
  function pointInPoly(p, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }

  /* Bangun geometri: setiap elemen → {surfaces, contains(pWorld)}
     surface: {k:'seg', a, b} | {k:'circ', c, r, valid(pWorld)}; plus flag: mirror | absorb | thin(f) */
  function geometry(el) {
    const S = [], seg = (a, b, o) => S.push(Object.assign({ k: 'seg', a: toWorld(el, a), b: toWorld(el, b), el }, o)),
      circ = (c, r, valid, o) => S.push(Object.assign({ k: 'circ', c: toWorld(el, c), r, valid: p => valid(toLocal(el, p)), el }, o));
    let contains = null;
    const polyLocal = pts => { pts.forEach((p, i) => seg(p, pts[(i + 1) % pts.length])); const W = pts.map(p => toWorld(el, p)); contains = p => pointInPoly(p, W); return W; };
    switch (el.type) {
      case 'cembung': { // lensa bikonveks = irisan dua cakram
        const R = el.R, t = el.t, d = R - t / 2;
        circ({ x: d, y: 0 }, R, q => inDisk(q, -d, 0, R) && q.x <= 0 + 1e-9);
        circ({ x: -d, y: 0 }, R, q => inDisk(q, d, 0, R) && q.x >= 0 - 1e-9);
        contains = p => { const q = toLocal(el, p); return inDisk(q, d, 0, R) && inDisk(q, -d, 0, R); };
        el.H = Math.sqrt(Math.max(0, R * R - d * d)); break;
      }
      case 'cekung': { // lensa bikonkaf = pita dikurangi dua cakram
        const R = el.R, t = el.t, H = el.H, d = R + t / 2, W = d - Math.sqrt(R * R - H * H);
        circ({ x: -d, y: 0 }, R, q => Math.abs(q.y) <= H + 1e-9 && q.x > -d);
        circ({ x: d, y: 0 }, R, q => Math.abs(q.y) <= H + 1e-9 && q.x < d);
        seg({ x: -W, y: H }, { x: W, y: H }); seg({ x: -W, y: -H }, { x: W, y: -H });
        contains = p => { const q = toLocal(el, p); if (Math.abs(q.y) > H) return false; const e = Math.sqrt(R * R - q.y * q.y); return q.x > -d + e && q.x < d - e; };
        el.W = W; break;
      }
      case 'prisma': { const s = el.s, h = s * Math.sqrt(3) / 2; el.pts = polyLocal([{ x: -s / 2, y: -h / 3 }, { x: s / 2, y: -h / 3 }, { x: 0, y: 2 * h / 3 }]); break; }
      case 'prismaSiku': { const s = el.s; el.pts = polyLocal([{ x: -s / 2, y: -s / 2 }, { x: s / 2, y: -s / 2 }, { x: -s / 2, y: s / 2 }]); break; }
      case 'balok': { const w = el.w / 2, h = el.h / 2; el.pts = polyLocal([{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }]); break; }
      case 'setengah': { // balok setengah lingkaran (sisi datar di x=0, lengkung ke −x)
        const R = el.R; circ({ x: 0, y: 0 }, R, q => q.x <= 1e-9); seg({ x: 0, y: -R }, { x: 0, y: R });
        contains = p => { const q = toLocal(el, p); return q.x <= 0 && q.x * q.x + q.y * q.y <= R * R; }; break;
      }
      case 'cermin': seg({ x: 0, y: -el.L / 2 }, { x: 0, y: el.L / 2 }, { mirror: true }); break;
      case 'cerminCekung': { const R = el.R, H = el.L / 2; circ({ x: -R, y: 0 }, R, q => Math.abs(q.y) <= H && q.x > -R, { mirror: true }); break; } // cekung menghadap −x lokal
      case 'cerminCembung': { const R = el.R, H = el.L / 2; circ({ x: R, y: 0 }, R, q => Math.abs(q.y) <= H && q.x < R, { mirror: true }); break; }
      case 'tipis': seg({ x: 0, y: -el.L / 2 }, { x: 0, y: el.L / 2 }, { thin: el.f }); break;
      case 'layar': case 'sensor': case 'target': case 'penerima': seg({ x: 0, y: -el.L / 2 }, { x: 0, y: el.L / 2 }, { absorb: true }); break;
      case 'bukaan': { // diafragma: dua bilah penyerap dengan lubang D
        const g = el.D / 2, L = el.L / 2; seg({ x: 0, y: g }, { x: 0, y: L }, { absorb: true, stop: true }); seg({ x: 0, y: -g }, { x: 0, y: -L }, { absorb: true, stop: true }); break;
      }
      case 'serat': { // lintasan: lurus / busur; inti (core) berlapis selubung (cladding)
        const pieces = fiberPieces(el); el.pieces = pieces; el.layers = [];
        const mk = (w, n, tag) => { const L = { n, tag, parts: [] }; for (const pc of pieces) addFiberPart(L, pc, w, S, el); el.layers.push(L); };
        if (el.clad > 0) mk(el.w / 2 + el.clad, el.nClad, 'clad');
        mk(el.w / 2, el.nCore, 'core');
        contains = null; break;
      }
      case 'laser': case 'lampu': case 'mata': break;
    }
    return { surfaces: S, contains };
  }
  // ---------- serat optik ----------
  function fiberPieces(el) { // lintasan di koordinat dunia
    let p = { x: el.x, y: el.y }, a = el.a || 0; const out = [];
    for (const s of el.path) {
      if (s.t === 'lurus') { const q = V.add(p, V.rot({ x: s.len, y: 0 }, a)); out.push({ t: 'lurus', p, q, a }); p = q; }
      else { const dir = Math.sign(s.ang) || 1, c = V.add(p, V.rot({ x: 0, y: dir * s.R }, a)), a1 = a + s.ang;
        const q = V.add(c, V.rot({ x: 0, y: -dir * s.R }, a1)); out.push({ t: 'busur', c, R: s.R, a0: a, a1, dir, p, q }); p = q; a = a1; }
    }
    el.end = p; el.endA = a; return out;
  }
  function addFiberPart(L, pc, w, S, el) {
    if (pc.t === 'lurus') {
      const n = V.rot({ x: 0, y: w }, pc.a), A = V.add(pc.p, n), B = V.add(pc.q, n), C = V.sub(pc.q, n), D = V.sub(pc.p, n);
      const pts = [A, B, C, D]; S.push({ k: 'seg', a: A, b: B, el }, { k: 'seg', a: D, b: C, el }, { k: 'seg', a: A, b: D, el, joint: true }, { k: 'seg', a: B, b: C, el, joint: true });
      L.parts.push(p => pointInPoly(p, pts));
    } else {
      const { c, R, a0, a1, dir } = pc, lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      // sudut posisi titik pada busur relatif pusat: φ = arah + (dir>0 ? -90° : +90°)
      const off = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const angOk = p => { let t = Math.atan2(p.y - c.y, p.x - c.x) - off; while (t < lo - Math.PI) t += 2 * Math.PI; while (t > lo + Math.PI) t -= 2 * Math.PI; return t >= lo - 1e-9 && t <= hi + 1e-9; };
      const r1 = R - w, r2 = R + w;
      S.push({ k: 'circ', c, r: r1, valid: angOk, el }, { k: 'circ', c, r: r2, valid: angOk, el });
      L.parts.push(p => { const r = Math.hypot(p.x - c.x, p.y - c.y); return r >= r1 && r <= r2 && angOk(p); });
    }
  }

  // ---------- adegan ----------
  function build(scene) {
    const surfaces = [], regions = [];
    for (const el of scene.elements) {
      if (el.hidden) continue;
      const g = geometry(el); el._g = g; surfaces.push(...g.surfaces);
      if (g.contains) regions.push({ el, test: g.contains, n: wl => nOf(el, wl) });
      if (el.type === 'serat') for (const L of el.layers) regions.push({ el, test: p => L.parts.some(f => f(p)), n: () => L.n });
    }
    scene._surf = surfaces; scene._reg = regions; return scene;
  }
  function indexAt(scene, p, wl) { let n = scene.medium || 1; for (const r of scene._reg) if (r.test(p)) n = r.n(wl); return n; }

  function intersect(o, d, s) {
    if (s.k === 'seg') {
      const e = V.sub(s.b, s.a), den = V.cross(d, e); if (Math.abs(den) < 1e-12) return null;
      const w = V.sub(s.a, o), t = V.cross(w, e) / den, u = V.cross(w, d) / den;
      if (t > EPS && u >= -1e-9 && u <= 1 + 1e-9) { const nrm = V.norm({ x: -e.y, y: e.x }); return { t, nrm, u }; } return null;
    }
    const oc = V.sub(o, s.c), b = V.dot(oc, d), c = V.dot(oc, oc) - s.r * s.r, disc = b * b - c; if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    for (const t of [-b - sq, -b + sq]) if (t > EPS) { const p = V.add(o, V.mul(d, t)); if (s.valid(p)) return { t, nrm: V.norm(V.sub(p, s.c)) }; }
    return null;
  }

  /* Telusuri semua sinar sumber. Hasil: {segs:[{a,b,I,wl,col}], hits:Map(el→[{p,I,wl,d}]), events:[]} */
  function trace(scene, opt = {}) {
    build(scene);
    const maxDepth = opt.maxDepth || 80, fresnel = opt.fresnel !== false, out = { segs: [], hits: new Map(), events: [], touched: new Set() };
    const queue = [];
    for (const el of scene.elements) if (!el.hidden && (el.type === 'laser' || el.type === 'lampu')) for (const r of sourceRays(el)) queue.push(r);
    let budget = opt.budget || 6000;
    while (queue.length && budget > 0) {
      let { p, d, I, wl, col, depth = 0, kids = 0 } = queue.shift();
      for (; depth < maxDepth && budget-- > 0; depth++) {
        let best = null;
        for (const s of scene._surf) { const h = intersect(p, d, s); if (h && (!best || h.t < best.t)) { best = h; best.s = s; } }
        if (!best) { out.segs.push({ a: p, b: V.add(p, V.mul(d, FAR)), I, wl, col }); break; }
        const hp = V.add(p, V.mul(d, best.t)), s = best.s; out.segs.push({ a: p, b: hp, I, wl, col }); out.touched.add(s.el);
        let nrm = best.nrm; if (V.dot(nrm, d) > 0) nrm = V.mul(nrm, -1);
        if (s.absorb) { if (!s.stop) { if (!out.hits.has(s.el)) out.hits.set(s.el, []); out.hits.get(s.el).push({ p: hp, I, wl, d, u: best.u }); } break; }
        if (s.mirror) { d = V.norm(V.sub(d, V.mul(nrm, 2 * V.dot(d, nrm)))); p = V.add(hp, V.mul(d, EPS * 5)); I *= .96; continue; }
        if (s.thin != null) { // lensa tipis ideal
          const el = s.el, dl = V.rot(d, -(el.a || 0)), h = toLocal(el, hp).y, sg = Math.sign(dl.x) || 1, m = dl.y / dl.x, m2 = m - sg * h / s.thin;
          d = V.norm(V.rot({ x: sg, y: sg * m2 }, el.a || 0)); p = V.add(hp, V.mul(d, EPS * 5)); continue;
        }
        const before = V.sub(hp, V.mul(d, EPS * 3)), after = V.add(hp, V.mul(d, EPS * 3));
        const n1 = indexAt(scene, before, wl), n2 = indexAt(scene, after, wl);
        if (Math.abs(n1 - n2) < 1e-9) { p = V.add(hp, V.mul(d, EPS * 5)); depth--; continue; }
        const cosi = -V.dot(nrm, d), eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
        const refl = V.norm(V.sub(d, V.mul(nrm, 2 * V.dot(d, nrm))));
        if (k < 0) { // pantulan total
          out.events.push({ type: 'tir', p: hp, el: s.el, angle: Math.acos(Math.min(1, cosi)), crit: Math.asin(Math.min(1, n2 / n1)) });
          d = refl; p = V.add(hp, V.mul(d, EPS * 5)); continue;
        }
        const t = V.norm(V.add(V.mul(d, eta), V.mul(nrm, eta * cosi - Math.sqrt(k))));
        const cost = Math.sqrt(k); // Fresnel (rata-rata polarisasi s & p)
        const rs = ((n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost)) ** 2, rp = ((n1 * cost - n2 * cosi) / (n1 * cost + n2 * cosi)) ** 2, R = (rs + rp) / 2;
        out.events.push({ type: 'bias', p: hp, el: s.el, n1, n2, i: Math.acos(Math.min(1, cosi)), r: Math.acos(Math.min(1, cost)) });
        if (fresnel && I * R > .035 && kids < 2) queue.push({ p: V.add(hp, V.mul(refl, EPS * 5)), d: refl, I: I * R, wl, col, depth: depth + 1, kids: kids + 1 });
        I *= (1 - R); d = t; p = V.add(hp, V.mul(d, EPS * 5));
      }
    }
    return out;
  }
  // ---------- sumber ----------
  const SPEKTRUM = [[0.41, '#8b3dff'], [0.45, '#3d5bff'], [0.49, '#00a8ff'], [0.53, '#22c55e'], [0.57, '#d4d400'], [0.60, '#ff9900'], [0.66, '#ff2222']];
  function sourceRays(el) {
    const rays = [], dir = V.rot({ x: 1, y: 0 }, el.a || 0);
    const wls = el.putih ? SPEKTRUM : [[LASER_WL, el.col || '#ff2a2a']];
    if (el.type === 'laser') {
      const n = el.rays || 5, gap = el.gap || 12;
      for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * gap, p = toWorld(el, { x: (el.w || 40) / 2, y: off });
        for (const [wl, col] of wls) rays.push({ p, d: dir, I: 1, wl, col }); }
    } else { // lampu titik: kipas sinar
      const n = el.rays || 9, sp = el.spread || .3;
      for (let i = 0; i < n; i++) { const t = (el.a || 0) + (n === 1 ? 0 : (i / (n - 1) - .5) * 2 * sp); for (const [wl, col] of wls) rays.push({ p: { x: el.x, y: el.y }, d: { x: Math.cos(t), y: Math.sin(t) }, I: 1, wl, col: el.col || col }); }
    }
    return rays;
  }
  // ---------- rumus pembanding ----------
  const lensmaker = (n, R, t) => { // bikonveks simetris tebal: 1/f = (n−1)[2/R − (n−1)t/(nR²)]
    return 1 / ((n - 1) * (2 / R - (n - 1) * t / (n * R * R)));
  };
  const critical = (n1, n2) => Math.asin(n2 / n1);
  const thinImage = (f, s) => 1 / (1 / f - 1 / s);
  return { V, GLASS, SPEKTRUM, LASER_WL, nOf, trace, build, indexAt, geometry, toLocal, toWorld, lensmaker, critical, thinImage, fiberPieces };
});
