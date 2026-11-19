/* Jalan Cahaya · UI: kanvas, sentuhan, panel cerita satu layar, navigasi bab */
(function () {
  'use strict';
  const O = window.OPTIKA, SC = window.JC_SCENES, V = O.V, $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage'), panel = $('panel');
  const LITE = document.documentElement.dataset.fx === 'lite';
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('jc_' + k)) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem('jc_' + k, JSON.stringify(v)); } catch (_) {} } };
  const track = (n, d) => { try { window.PILAR_PULSE?.track?.(n, d || {}); } catch (_) {} };
  try { window.PILAR_PULSE?.setApp?.('jalan-cahaya'); } catch (_) {}
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const DARK = () => document.documentElement.dataset.skin === 'gelap';

  let cur = 0, S = null, R = null, W = 0, H = 0, dpr = 1, view = { s: 1, ox: 0, oy: 0 }, sel = null, raf = 0, dirty = true;
  const states = {}, done = new Set(store.get('done', []));
  const api = { retrace, render: () => { dirty = true; loop(); }, toast, ui: () => buildPanel(), get S() { return S; }, get R() { return R; }, O };

  // ---------- ukuran ----------
  function resize() {
    const r = stage.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(LITE ? 1.25 : 2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); fitView(); sizeAux(); dirty = true; loop(); fitPanel();
  }
  function fitView() {
    const v = S?.view || { x0: -500, y0: -300, x1: 500, y1: 300 }, pad = 14;
    // area aman: sisihkan ruang HUD atas & aux kanan bila ada
    const top = 44, right = (SC[cur].aux && !$('aux').hidden) ? $('aux').offsetWidth + 18 : 0;
    const aw = W - pad * 2 - right * (S?.view?.auxSide ? 1 : 0), ah = H - pad * 2 - top;
    const s = Math.min(aw / (v.x1 - v.x0), ah / (v.y1 - v.y0));
    view = { s, ox: pad + (aw - (v.x1 - v.x0) * s) / 2 - v.x0 * s, oy: pad + top + (ah - (v.y1 - v.y0) * s) / 2 - v.y0 * s };
  }
  const w2s = p => ({ x: p.x * view.s + view.ox, y: p.y * view.s + view.oy });
  const s2w = p => ({ x: (p.x - view.ox) / view.s, y: (p.y - view.oy) / view.s });
  const px = n => n / view.s;

  // ---------- jejak ----------
  function retrace() {
    if (!S) return; if (SC[cur].shop) { checkMissions(); hud(); return; }
    const vk = JSON.stringify(S.view); if (vk !== S._vk) { S._vk = vk; fitView(); }
    S.medium = S.medium || 1; R = O.trace({ elements: S.el, medium: S.medium }, { fresnel: S.fresnel !== false });
    SC[cur].after?.(S, R, api); checkMissions(); hud(); dirty = true; loop();
  }
  function checkMissions() {
    const sc = SC[cur], M = sc.missions || []; let adv = false;
    while (S.mi < M.length && M[S.mi].check(S, R)) { S.mi++; adv = true; }
    if (adv) { toast(S.mi >= M.length ? '🎉 Semua misi bab ini beres!' : '✅ Misi beres! Lanjut misi berikutnya'); track('jc_misi', { bab: sc.id, mi: S.mi }); }
    if (S.mi >= M.length && M.length && !done.has(sc.id)) { done.add(sc.id); store.set('done', [...done]); dotsUI(); }
    missionUI();
  }
  function missionUI() {
    const sc = SC[cur], M = sc.missions || [], box = $('pMission');
    if (!M.length) { box.hidden = true; return; } box.hidden = false;
    const fin = S.mi >= M.length; box.classList.toggle('done', fin);
    $('mStep').textContent = fin ? '✓ beres' : `${S.mi + 1} / ${M.length}`;
    $('mText').innerHTML = fin ? (sc.finale || 'Semua misi beres. Tekan <b>Lanjut →</b> untuk bab berikutnya.') : M[S.mi].t;
    $('mState').innerHTML = fin ? '' : (M[S.mi].state?.(S, R) || '');
  }
  function hud() { const h = SC[cur].hud?.(S, R) || []; $('hud').innerHTML = h.map(x => `<span class="chip${x.ok ? ' ok' : ''}">${x.t ?? x}</span>`).join(''); }

  // ---------- gambar ----------
  function loop() { if (raf) return; raf = requestAnimationFrame(frame); }
  let lastT = 0;
  function frame(t) {
    raf = 0; const dt = Math.min(.05, (t - (lastT || t)) / 1000); lastT = t;
    const sc = SC[cur];
    if (sc.tick && S) { if (sc.tick(S, dt, api)) dirty = true; }
    if (dirty) { dirty = false; draw(); }
    if (sc.aux && S && !$('aux').hidden) sc.aux.draw(auxCtx, auxW, auxH, S, R, api, dt);
    if ((sc.tick && S?.anim) || (sc.aux?.anim && S)) loop();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (SC[cur].shop) return;
    // bangku + grid 5 cm
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.ox, dpr * view.oy);
    const v = s2w({ x: 0, y: 0 }), v2 = s2w({ x: W, y: H }), step = S.view.grid || 50;
    ctx.strokeStyle = css('--grid') || '#0001'; ctx.lineWidth = px(1); ctx.beginPath();
    for (let x = Math.floor(v.x / step) * step; x < v2.x; x += step) { ctx.moveTo(x, v.y); ctx.lineTo(x, v2.y); }
    for (let y = Math.floor(v.y / step) * step; y < v2.y; y += step) { ctx.moveTo(v.x, y); ctx.lineTo(v2.x, y); }
    ctx.stroke();
    if (S.view.axis) { ctx.setLineDash([px(8), px(6)]); ctx.strokeStyle = DARK() ? '#ffffff30' : '#13203a30'; ctx.beginPath(); ctx.moveTo(v.x, 0); ctx.lineTo(v2.x, 0); ctx.stroke(); ctx.setLineDash([]); }
    SC[cur].under?.(ctx, S, R, api);
    for (const el of S.el) if (!el.hidden && !['laser', 'lampu'].includes(el.type)) drawEl(el);
    if (R) drawRays(R.segs);
    for (const el of S.el) if (!el.hidden && ['laser', 'lampu'].includes(el.type)) drawEl(el);
    SC[cur].over?.(ctx, S, R, api);
    if (sel && !sel.hidden && (sel.drag || sel.rot || sel.orbit)) drawSel(sel);
  }
  function drawRays(segs) {
    const dark = DARK();
    ctx.save(); ctx.lineCap = 'round';
    if (dark) ctx.globalCompositeOperation = 'lighter';
    for (const pass of LITE ? [1] : [0, 1]) for (const s of segs) {
      const I = Math.max(.06, Math.min(1, s.I));
      ctx.strokeStyle = s.col; ctx.globalAlpha = pass ? (dark ? .95 : .9) * I : (dark ? .22 : .16) * I;
      ctx.lineWidth = px(pass ? 2.2 : 9); ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); ctx.stroke();
    }
    ctx.restore();
  }
  function glassPath(el) {
    const p = new Path2D();
    const poly = pts => { pts.forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath(); };
    const loc = q => O.toWorld(el, q), N = 28;
    if (el.type === 'cembung') { const R = el.R, d = R - el.t / 2, Hh = el.H, pts = [];
      for (let i = 0; i <= N; i++) { const y = -Hh + 2 * Hh * i / N; pts.push(loc({ x: d - Math.sqrt(R * R - y * y), y })); }
      for (let i = N; i >= 0; i--) { const y = -Hh + 2 * Hh * i / N; pts.push(loc({ x: -d + Math.sqrt(R * R - y * y), y })); } poly(pts); }
    else if (el.type === 'cekung') { const R = el.R, d = R + el.t / 2, Hh = el.H, pts = [];
      for (let i = 0; i <= N; i++) { const y = -Hh + 2 * Hh * i / N; pts.push(loc({ x: -d + Math.sqrt(R * R - y * y), y })); }
      for (let i = N; i >= 0; i--) { const y = -Hh + 2 * Hh * i / N; pts.push(loc({ x: d - Math.sqrt(R * R - y * y), y })); } poly(pts); }
    else if (el.type === 'setengah') { const pts = []; for (let i = 0; i <= 40; i++) { const t = Math.PI / 2 + Math.PI * i / 40; pts.push(loc({ x: Math.cos(t) * el.R, y: Math.sin(t) * el.R })); } poly(pts); }
    else if (el.pts) poly(el.pts);
    return p;
  }
  function drawEl(el) {
    const dark = DARK(), ink = css('--ink');
    ctx.save(); ctx.lineJoin = 'round';
    switch (el.type) {
      case 'cembung': case 'cekung': case 'prisma': case 'prismaSiku': case 'balok': case 'setengah': {
        const p = glassPath(el), tint = el.n === 'berlian' ? '#c7f2ff55' : el.n === 'air' ? '#7cc4ff40' : css('--glass');
        ctx.fillStyle = tint; ctx.fill(p); ctx.strokeStyle = css('--glassLine'); ctx.lineWidth = px(1.6); ctx.stroke(p);
        ctx.strokeStyle = dark ? '#ffffff22' : '#ffffffaa'; ctx.lineWidth = px(4); ctx.globalAlpha = .6; ctx.save(); ctx.clip(p); ctx.stroke(p); ctx.restore(); break;
      }
      case 'serat': {
        for (const L of el.layers) {
          ctx.fillStyle = L.tag === 'clad' ? (dark ? '#ffd27a1f' : '#f5c16c33') : (dark ? '#7cc7ff2a' : '#9fd0ec55');
          ctx.strokeStyle = L.tag === 'clad' ? (dark ? '#ffd27a66' : '#c9923a88') : css('--glassLine'); ctx.lineWidth = px(1.3);
          const w = L.tag === 'clad' ? el.w / 2 + el.clad : el.w / 2;
          for (const pc of el.pieces) { const p = new Path2D();
            if (pc.t === 'lurus') { const n = V.rot({ x: 0, y: w }, pc.a), A = V.add(pc.p, n), B = V.add(pc.q, n), C = V.sub(pc.q, n), D = V.sub(pc.p, n); p.moveTo(A.x, A.y); p.lineTo(B.x, B.y); p.lineTo(C.x, C.y); p.lineTo(D.x, D.y); p.closePath(); }
            else { const off = pc.dir > 0 ? -Math.PI / 2 : Math.PI / 2, a0 = pc.a0 + off, a1 = pc.a1 + off, ccw = pc.a1 < pc.a0;
              p.arc(pc.c.x, pc.c.y, pc.R + w, a0, a1, ccw); p.arc(pc.c.x, pc.c.y, pc.R - w, a1, a0, !ccw); p.closePath(); }
            ctx.fill(p); ctx.stroke(p); }
        } break;
      }
      case 'cermin': case 'cerminCekung': case 'cerminCembung': {
        ctx.translate(el.x, el.y); ctx.rotate(el.a || 0); const H2 = el.L / 2, p = new Path2D(), back = new Path2D();
        if (el.type === 'cermin') { p.moveTo(0, -H2); p.lineTo(0, H2); back.moveTo(px(5), -H2); back.lineTo(px(5), H2); }
        else { const R = el.R, sgn = el.type === 'cerminCekung' ? -1 : 1, b = Math.asin(Math.min(1, H2 / R));
          if (sgn < 0) { p.arc(-R, 0, R, -b, b); back.arc(-R, 0, R + px(5), -b, b); } else { p.arc(R, 0, R, Math.PI - b, Math.PI + b); back.arc(R, 0, R + px(5), Math.PI - b, Math.PI + b); } }
        ctx.strokeStyle = dark ? '#5b6577' : '#aab3bf'; ctx.lineWidth = px(8); ctx.stroke(back);
        ctx.strokeStyle = dark ? '#e6edf7' : '#6f7c8c'; ctx.lineWidth = px(3.2); ctx.stroke(p); break;
      }
      case 'tipis': {
        ctx.translate(el.x, el.y); ctx.rotate(el.a || 0); const h = el.L / 2, a = px(9), pos = el.f > 0;
        ctx.strokeStyle = el.col || css('--acc'); ctx.lineWidth = px(3); ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, h);
        if (pos) { ctx.moveTo(-a, -h + a); ctx.lineTo(0, -h); ctx.lineTo(a, -h + a); ctx.moveTo(-a, h - a); ctx.lineTo(0, h); ctx.lineTo(a, h - a); }
        else { ctx.moveTo(-a, -h - a); ctx.lineTo(0, -h); ctx.lineTo(a, -h - a); ctx.moveTo(-a, h + a); ctx.lineTo(0, h); ctx.lineTo(a, h + a); }
        ctx.stroke(); ctx.fillStyle = css('--glass'); ctx.beginPath(); ctx.ellipse(0, 0, px(7), h, 0, 0, Math.PI * 2); ctx.fill(); break;
      }
      case 'bukaan': { ctx.translate(el.x, el.y); ctx.rotate(el.a || 0); ctx.fillStyle = dark ? '#334155' : '#3b4556'; const g = el.D / 2, L = el.L / 2, w = px(6);
        ctx.fillRect(-w / 2, g, w, L - g); ctx.fillRect(-w / 2, -L, w, L - g); break; }
      case 'layar': case 'target': case 'sensor': case 'penerima': {
        ctx.translate(el.x, el.y); ctx.rotate(el.a || 0); const h = el.L / 2, w = px(el.type === 'layar' ? 7 : 9);
        ctx.fillStyle = el.type === 'sensor' ? '#1f6f4a' : el.type === 'penerima' ? '#334155' : el.type === 'target' ? '#b91c1c' : (dark ? '#cbd5e1' : '#334155');
        ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, 2 * h, px(3)); ctx.fill();
        if (el.type === 'target') { ctx.strokeStyle = '#fff'; ctx.lineWidth = px(2); for (const r of [.75, .45]) { ctx.beginPath(); ctx.moveTo(-w / 2, -h * r); ctx.lineTo(-w / 2, h * r); ctx.stroke(); } }
        if (el.glow) { ctx.globalAlpha = Math.min(1, el.glow); ctx.fillStyle = '#ffdd55'; ctx.beginPath(); ctx.arc(-w, 0, px(14), 0, Math.PI * 2); ctx.fill(); }
        break; }
      case 'laser': {
        ctx.translate(el.x, el.y); ctx.rotate(el.a || 0); const w = el.w || 40, hh = Math.max(px(22), ((el.rays || 1) - 1) * (el.gap || 12) / 2 + px(16));
        if (w < 2) { ctx.fillStyle = '#e5383b'; ctx.beginPath(); ctx.arc(0, 0, px(6), 0, Math.PI * 2); ctx.fill(); break; }
        ctx.fillStyle = dark ? '#cfd6e0' : '#d5dae2'; ctx.strokeStyle = dark ? '#0b1322' : '#8a94a3'; ctx.lineWidth = px(1.5);
        ctx.beginPath(); ctx.roundRect(-w / 2, -hh, w, hh * 2, px(5)); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2b3340'; ctx.font = `800 ${px(9)}px ${css('--sans') || 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.rotate(Math.PI / 2); ctx.fillText(el.putih ? 'CAHAYA PUTIH' : 'LASER RAY BOX', 0, 0); ctx.restore();
        ctx.fillStyle = el.putih ? '#fff' : '#ff3b3b'; for (let i = 0; i < (el.rays || 1); i++) { const y = (i - ((el.rays || 1) - 1) / 2) * (el.gap || 12); ctx.beginPath(); ctx.arc(w / 2, y, px(3.2), 0, Math.PI * 2); ctx.fill(); }
        break; }
      case 'lampu': { ctx.fillStyle = el.col || '#ffcc33'; ctx.beginPath(); ctx.arc(el.x, el.y, px(5), 0, Math.PI * 2); ctx.fill(); break; }
    }
    ctx.restore();
    if (el.label) label(el);
  }
  function label(el) {
    const p = w2s(el.labelAt ? el.labelAt(el) : { x: el.x, y: el.y + (el.labelDy ?? ((el.H || el.L / 2 || el.R || el.s / 2 || 40) + 22)) });
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const fz = Math.round(Math.max(12, Math.min(24, H / 40))); ctx.font = `700 ${fz}px ${css('--sans')}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const t = typeof el.label === 'function' ? el.label(el) : el.label, w = ctx.measureText(t).width + 14;
    ctx.fillStyle = DARK() ? '#0b1322cc' : '#ffffffd9'; ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - fz * .7, w, fz * 1.4, fz * .7); ctx.fill();
    ctx.fillStyle = css('--ink2'); ctx.fillText(t, p.x, p.y); ctx.restore();
  }
  function handlePos(el) { const r = (el.handleR || 60); const a = (el.a || 0) - Math.PI / 2; return { x: el.x + Math.cos(a) * r, y: el.y + Math.sin(a) * r }; }
  function drawSel(el) {
    ctx.save(); ctx.strokeStyle = css('--acc'); ctx.lineWidth = px(1.5); ctx.setLineDash([px(5), px(5)]);
    ctx.beginPath(); ctx.arc(el.x, el.y, el.handleR || 60, 0, Math.PI * 2); ctx.globalAlpha = .55; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (el.rot) { const h = handlePos(el); ctx.fillStyle = css('--acc'); ctx.beginPath(); ctx.arc(h.x, h.y, px(11), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${px(13)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⟳', h.x, h.y + px(1)); }
    ctx.restore();
  }

  // ---------- sentuhan: seret, putar (gagang / dua jari / roda mouse) ----------
  const ptrs = new Map();
  function hitEl(w) {
    const tol = px(26);
    for (let i = S.el.length - 1; i >= 0; i--) {
      const el = S.el[i]; if (el.hidden || !(el.drag || el.rot || el.orbit)) continue;
      if (el.rot && sel === el && Math.hypot(w.x - handlePos(el).x, w.y - handlePos(el).y) < px(26)) return { el, mode: 'rot' };
      const q = O.toLocal(el, w); let hit = false;
      if (el._g?.contains) hit = el._g.contains(w);
      if (!hit && ['laser'].includes(el.type)) { const hh = Math.max(px(22), ((el.rays || 1) - 1) * (el.gap || 12) / 2 + px(16)); hit = Math.abs(q.x) < (el.w || 40) / 2 + tol * .5 && Math.abs(q.y) < hh + tol * .3; }
      if (!hit && ['layar', 'target', 'sensor', 'cermin', 'cerminCekung', 'cerminCembung', 'tipis', 'penerima'].includes(el.type)) hit = Math.abs(q.x) < tol + (el.type.startsWith('cermin') && el.R ? Math.abs(q.y * q.y / (2 * el.R)) : 0) && Math.abs(q.y) < el.L / 2 + tol * .5;
      if (!hit && Math.hypot(q.x, q.y) < (el.grab || 0)) hit = true;
      if (hit) return { el, mode: 'move' };
    }
    return null;
  }
  cv.addEventListener('pointerdown', e => {
    if (!S || SC[cur].shop) return; const w = s2w(pt(e)); const h = hitEl(w);
    if (!h) { if (sel) { sel = null; tools(); dirty = true; loop(); } return; }
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const same = [...ptrs.values()].find(p => p.el === h.el);
    ptrs.set(e.pointerId, { el: h.el, mode: h.mode, last: w, a0: h.el.a || 0, ang0: Math.atan2(w.y - h.el.y, w.x - h.el.x) });
    if (same && h.el.rot) { same.mode = 'pinch'; ptrs.get(e.pointerId).mode = 'pinch'; }
    if (sel !== h.el) { sel = h.el; tools(); } dirty = true; loop();
  });
  cv.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) { if (e.pointerType === 'mouse' && S && !SC[cur].shop) cv.style.cursor = hitEl(s2w(pt(e))) ? 'grab' : 'default'; return; }
    const w = s2w(pt(e)), el = p.el;
    if (p.mode === 'rot') { el.a = snap(Math.atan2(w.y - el.y, w.x - el.x) + Math.PI / 2, el); }
    else if (p.mode === 'pinch') { const two = [...ptrs.entries()].filter(([, q]) => q.el === el); if (two.length === 2) { const [a, b] = two.map(([id, q]) => id === e.pointerId ? w : q.last); const ang = Math.atan2(b.y - a.y, b.x - a.x); if (p.pang == null) p.pang = ang - (el.a || 0); el.a = snap(ang - p.pang, el); } }
    else if (el.orbit) { const o = el.orbit, ang = clampAng(Math.atan2(w.y - o.cy, w.x - o.cx), o); o.set ? o.set(S, ang) : null; }
    else if (el.drag) {
      const d = V.sub(w, p.last); let nx = el.x + (el.drag === 'y' ? 0 : d.x), ny = el.y + (el.drag === 'x' ? 0 : d.y);
      const b = el.bounds || S.view; nx = Math.max(b.x0, Math.min(b.x1, nx)); ny = Math.max(b.y0, Math.min(b.y1, ny)); el.x = nx; el.y = ny;
    }
    p.last = w; SC[cur].moved?.(S, el, api); retrace(); tools();
  });
  const up = e => { const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); for (const q of ptrs.values()) { if (q.el === p.el) { q.mode = q.el.rot ? 'move' : q.mode; q.pang = null; } } SC[cur].released?.(S, p.el, api); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { if (!sel || !sel.rot) return; e.preventDefault(); sel.a = snap((sel.a || 0) + Math.sign(e.deltaY) * 2 * Math.PI / 180, sel); retrace(); tools(); }, { passive: false });
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function snap(a, el) { if (el.rotMin != null) a = Math.max(el.rotMin, Math.min(el.rotMax, a)); return a; }
  function clampAng(a, o) { return Math.max(o.min, Math.min(o.max, a)); }
  function tools() {
    const t = $('tools'); if (!sel || !sel.rot) { t.innerHTML = ''; return; }
    const deg = Math.round(((sel.a || 0) * 180 / Math.PI) * 10) / 10;
    t.innerHTML = `<button class="btn sm" data-r="-5">⟲ 5°</button><button class="btn sm" data-r="-1">⟲ 1°</button><span class="lbl">${esc(sel.name || 'benda')} · ${deg.toFixed(1)}°</span><button class="btn sm" data-r="1">1° ⟳</button><button class="btn sm" data-r="5">5° ⟳</button>`;
  }
  $('tools').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b || !sel) return; sel.a = snap((sel.a || 0) + (+b.dataset.r) * Math.PI / 180, sel); retrace(); tools(); });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- aux (layar HP / okuler) ----------
  const auxCv = $('auxCv'), auxCtx = auxCv.getContext('2d'); let auxW = 0, auxH = 0;
  function sizeAux() {
    const a = SC[cur].aux, box = $('aux'); if (!a) { box.hidden = true; $('hud').style.maxWidth = ''; return; } box.hidden = false;
    const portrait = innerWidth < 900 && innerHeight > innerWidth;
    const w = Math.round(Math.min(W * (portrait ? .44 : a.w || .3), (H - 24) * (a.ratio || 1.33) * (portrait ? .62 : .78)));
    box.style.width = w + 'px'; box.style.height = Math.round(w / (a.ratio || 1.33)) + 'px';
    const r = box.getBoundingClientRect(); auxW = r.width; auxH = r.height; $('hud').style.maxWidth = `calc(100% - ${Math.round(auxW) + 34}px)`; const k = Math.min(2, devicePixelRatio || 1);
    auxCv.width = Math.round(auxW * k); auxCv.height = Math.round(auxH * k); auxCtx.setTransform(k, 0, 0, k, 0, 0);
  }

  // ---------- panel ----------
  function ctlHTML(c, i) {
    if (c.type === 'range') return `<div class="ctl"><label for="c${i}">${c.label}</label><input id="c${i}" data-i="${i}" type="range" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${c.get(S)}"><output id="o${i}">${c.fmt ? c.fmt(c.get(S), S) : c.get(S)}</output></div>`;
    if (c.type === 'seg') return `<div class="ctl"><label>${c.label}</label><div class="seg" style="grid-column:2/4">${c.opts.map(([v, t]) => `<button type="button" data-i="${i}" data-v="${v}" class="${String(c.get(S)) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    if (c.type === 'btns') return `<div class="row">${c.btns.map((b, j) => `<button type="button" class="btn ${b.cls || ''}" data-i="${i}" data-b="${j}">${b.label}</button>`).join('')}</div>`;
    if (c.type === 'html') return `<div class="${c.cls || ''}" data-h="${i}">${c.html(S)}</div>`;
    return '';
  }
  function buildPanel() {
    const sc = SC[cur];
    $('pKick').textContent = `Bab ${cur + 1} / ${SC.length} · ${sc.kick}`; $('pTitle').innerHTML = sc.title; $('pStory').innerHTML = sc.story;
    $('pCtrls').innerHTML = (sc.controls || []).map(ctlHTML).join('');
    $('fText').innerHTML = sc.fact.t; $('fSrc').textContent = sc.fact.src || '';
    $('pFact').open = !(innerWidth < 900 && innerHeight > innerWidth);   // HP tegak: kisah nyata dilipat (ketuk untuk buka) agar muat
    $('hint').textContent = sc.hint || ''; $('hint').hidden = !sc.hint;
    $('next').textContent = cur === SC.length - 1 ? 'Selesai ✓' : 'Lanjut →'; $('prev').disabled = cur === 0;
    missionUI(); fitPanel();
  }
  function refreshCtl() { (SC[cur].controls || []).forEach((c, i) => { if (c.type === 'range') { const el = $('c' + i); if (el && document.activeElement !== el) el.value = c.get(S); const o = $('o' + i); if (o) o.textContent = c.fmt ? c.fmt(c.get(S), S) : c.get(S); } if (c.type === 'html') { const h = panel.querySelector(`[data-h="${i}"]`); if (h && c.live) h.innerHTML = c.html(S); } if (c.type === 'seg') panel.querySelectorAll(`.seg [data-i="${i}"]`).forEach(b => b.classList.toggle('on', String(c.get(S)) === b.dataset.v)); }); }
  api.refreshCtl = refreshCtl;
  panel.addEventListener('input', e => { const i = e.target.dataset.i; if (i == null) return; const c = SC[cur].controls[i]; if (c.type !== 'range') return; c.set(S, +e.target.value, api); refreshCtl(); retrace(); tools(); });
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b || b.tagName === 'INPUT') return; const c = SC[cur].controls[b.dataset.i];
    if (c.type === 'seg') { const v = c.opts.find(o => String(o[0]) === b.dataset.v)[0]; c.set(S, v, api); refreshCtl(); retrace(); }
    if (c.type === 'btns') { c.btns[b.dataset.b].on(S, api); refreshCtl(); retrace(); }
  });
  function fitPanel() {
    // tulisan sebesar mungkin yang masih muat satu layar: mulai besar, kecilkan sampai pas (tanpa scroll)
    const fits = () => panel.scrollHeight <= panel.clientHeight + 1;
    let fs = 1.45; panel.style.setProperty('--fs', fs);
    while (!fits() && fs > .68) { fs -= .03; panel.style.setProperty('--fs', fs.toFixed(2)); }
    const shop = $('shop'); if (shop.classList.contains('on') && !(innerWidth < 900 && innerHeight > innerWidth)) {
      const ok = () => [...shop.children].every(c => c.scrollHeight <= c.clientHeight + 1);
      let f = 1.6; shop.style.setProperty('--sfs', f); while (!ok() && f > .6) { f -= .04; shop.style.setProperty('--sfs', f.toFixed(2)); } }
  }
  api.fitPanel = fitPanel;

  // ---------- bab ----------
  function dotsUI() {
    $('dots').innerHTML = SC.map((s, i) => `<button class="dot${i === cur ? ' cur' : ''}${done.has(s.id) ? ' done' : ''}" data-go="${i}" type="button" title="${esc(s.short)}"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="ic">${s.icon}</span><span class="t">${esc(s.short)}</span></button>`).join('');
  }
  $('dots').onclick = e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); };
  $('prev').onclick = () => go(cur - 1); $('next').onclick = () => cur < SC.length - 1 ? go(cur + 1) : toast('🎓 Kamu sudah menempuh seluruh Jalan Cahaya!');
  function go(i) {
    if (i < 0 || i >= SC.length) return; SC[cur]?.leave?.(S, api); cur = i; store.set('cur', i); sel = null; ptrs.clear();
    const sc = SC[i]; S = states[sc.id] || (states[sc.id] = Object.assign({ mi: 0 }, sc.init(api)));
    $('shop').classList.toggle('on', !!sc.shop); cv.style.display = sc.shop ? 'none' : 'block';
    if (sc.shop) sc.shop(S, api, $('shop')); else $('shop').innerHTML = '';
    dotsUI(); sizeAux(); buildPanel(); resize(); retrace(); tools(); track('jc_bab', { bab: sc.id });
  }
  let th = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(th); th = setTimeout(() => el.classList.remove('on'), 2300); }
  $('fsBtn').onclick = () => { const d = document; if (!d.fullscreenElement) d.documentElement.requestFullscreen?.().catch(() => {}); else d.exitFullscreen?.(); };
  addEventListener('resize', () => { clearTimeout(resize.h); resize.h = setTimeout(resize, 80); });
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); });
  // tema berubah (skin) → gambar ulang
  new MutationObserver(() => { dirty = true; loop(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  window.PILAR_JC = { go, api, get S() { return S; }, get R() { return R; }, get cur() { return cur; }, states };
  document.fonts?.ready?.then(() => { fitPanel(); dirty = true; loop(); });
  go(Math.min(SC.length - 1, store.get('cur', 0)));
})();
