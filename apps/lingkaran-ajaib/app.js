/* PILAR · Lingkaran Ajaib v1.0 — 4 bab: Bayangan Titik · Mesin Gelombang · Tarian Lissajous · Menggambar dengan Lingkaran
   Canvas 2D (ringan untuk IFP Mali-G52), dua tema (gelap neon / ceria), misi + penemuan yang memandu konsep. */
(function () {
  'use strict';
  const M = window.LingkaranMath, TAU = M.TAU, PI = Math.PI;
  const $ = id => document.getElementById(id);
  const html = document.documentElement;
  const LITE = () => html.dataset.fx === 'lite';
  const cv = $('cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, C = {};
  const deg = r => r * 180 / PI, rad = d => d * PI / 180;
  const fmt = (v, n = 3) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(n).replace('.', ',').replace('-', '−');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- penyimpanan ---------- */
  const KEY = 'pilar_lingkaran_v1';
  let ST = {ch: 0, done: {}, cards: {}};
  try { Object.assign(ST, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (_) {} };

  /* ---------- tema ---------- */
  function readColors() {
    const cs = getComputedStyle(html);
    ['sin', 'cos', 'pt', 'trail', 'alt', 'accent', 'grid', 'axis', 'tick', 'text', 'muted', 'good', 'bad', 'line', 'stage', 'panel', 'ink'].forEach(k => C[k] = cs.getPropertyValue('--' + k).trim());
    C.dark = html.dataset.theme === 'gelap';
  }
  function setTheme(t) {
    html.dataset.theme = t; try { localStorage.setItem('pilar_lingkaran_theme', t); } catch (_) {}
    document.querySelectorAll('.themes button').forEach(b => b.classList.toggle('on', b.dataset.theme === t));
    document.querySelector('meta[name=theme-color]').content = t === 'gelap' ? '#0a1222' : '#f5f9ff';
    readColors(); CH().side && renderCardsIfAny();
  }
  document.querySelectorAll('.themes button').forEach(b => b.onclick = () => setTheme(b.dataset.theme));

  /* ---------- gambar ---------- */
  function glow(path, color, w) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ghost = ctx.globalAlpha < 1;
    if (ghost && !C.dark) { ctx.strokeStyle = color; ctx.lineWidth = w + 1; path(); ctx.stroke(); ctx.globalAlpha = 1; return; }
    const ga = ctx.globalAlpha;
    if (C.dark) {
      if (!LITE()) { ctx.globalAlpha = .13 * ga; ctx.strokeStyle = color; ctx.lineWidth = w * 5; path(); ctx.stroke(); }
      ctx.globalAlpha = .32 * ga; ctx.strokeStyle = color; ctx.lineWidth = w * 2.4; path(); ctx.stroke();
      ctx.globalAlpha = ga; ctx.lineWidth = w; path(); ctx.stroke();
    } else {
      ctx.globalAlpha = 1; ctx.strokeStyle = C.ink; ctx.lineWidth = w + 3; path(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = w; path(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function line(x1, y1, x2, y2, color, w = 1, dash) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = w;
    if (dash) ctx.setLineDash(dash); ctx.stroke(); if (dash) ctx.setLineDash([]);
  }
  function dot(x, y, r, color, ring) {
    if (C.dark && !LITE()) { ctx.fillStyle = color; ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill();
    if (!C.dark || ring) { ctx.lineWidth = C.dark ? 2 : 3; ctx.strokeStyle = C.dark ? '#ffffffaa' : C.ink; ctx.stroke(); }
  }
  function text(s, x, y, color, size = 13, align = 'center', weight = 800, font = 'var(--f-body)') {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px Nunito, system-ui, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
  }
  function grid(step) {
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }
  function resize() {
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, LITE() ? 1.5 : 2);
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CH().layout && CH().layout();
  }

  /* ---------- Rho si pemandu ---------- */
  function rho(m) {
    const eye = m === 'wow' ? '<circle cx="38" cy="46" r="7" fill="#17243a"/><circle cx="62" cy="46" r="7" fill="#17243a"/><ellipse cx="50" cy="66" rx="7" ry="6" fill="#17243a"/>'
      : m === 'think' ? '<path d="M31 47q7-6 14 0M55 47q7-6 14 0" stroke="#17243a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M42 66h16" stroke="#17243a" stroke-width="4" stroke-linecap="round"/>'
        : '<circle cx="38" cy="46" r="5.5" fill="#17243a"/><circle cx="62" cy="46" r="5.5" fill="#17243a"/><circle cx="40" cy="44" r="1.8" fill="#fff"/><circle cx="64" cy="44" r="1.8" fill="#fff"/><path d="M40 62q10 9 20 0" stroke="#17243a" stroke-width="4" fill="none" stroke-linecap="round"/>';
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="54" r="38" fill="#2ee6d6" stroke="#17243a" stroke-width="4"/><path d="M50 54 L82 34" stroke="#17243a" stroke-width="4" stroke-linecap="round"/><circle cx="82" cy="34" r="7" fill="#ff4f7b" stroke="#17243a" stroke-width="3"/><circle cx="50" cy="54" r="3" fill="#17243a"/>${eye}</svg>`;
  }
  function say(h, m) { const b = $('say'); if (b) { b.innerHTML = h; $('rho').innerHTML = rho(m || 'happy'); } }
  let toastT = 0;
  function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

  /* ---------- misi & penemuan ---------- */
  function mission(ch, id) {
    const k = ch.key + ':' + id; if (ST.done[k]) return false;
    ST.done[k] = 1; save(); const m = ch.missions.find(x => x[0] === id);
    toast('🏆 Misi selesai: ' + m[1]); renderMissions(); renderProgress();
    try { window.PILAR_PULSE?.track?.('lingkaran_mission', {id: k}); } catch (_) {}
    return true;
  }
  function renderMissions() {
    const ch = CH(), ul = $('mis'), fd = $('finds'); if (!ul) return;
    ul.innerHTML = ch.missions.map(m => `<li class="${ST.done[ch.key + ':' + m[0]] ? 'ok' : ''}">${m[1]}</li>`).join('');
    fd.innerHTML = ch.missions.map(m => ST.done[ch.key + ':' + m[0]] ? `<div class="find"><b>💡 ${m[2]}</b>${m[3]}</div>` : `<div class="find locked"><b>🔒 Penemuan</b>Selesaikan: ${m[1]}</div>`).join('');
  }
  function renderProgress() {
    const all = CHS.flatMap(c => c.missions.map(m => c.key + ':' + m[0])), n = all.filter(k => ST.done[k]).length;
    $('progTxt').textContent = n + '/' + all.length; $('progBar').style.width = (n / all.length * 100) + '%';
    document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('done', CHS[i].missions.every(m => ST.done[CHS[i].key + ':' + m[0]])));
  }
  let hudCache = '';
  function hud(h) { if (h !== hudCache) { hudCache = h; $('hud').innerHTML = h; } }
  function sideShell(intro, body) {
    return `<div class="card"><div class="guide"><div id="rho">${rho('happy')}</div><div class="bubble" id="say">${intro}</div></div></div>${body}
      <div class="card"><h3>🎯 Misi</h3><ul class="missions" id="mis"></ul></div><div class="card"><h3>💡 Penemuan</h3><div id="finds"></div></div>`;
  }

  /* =====================================================================
     BAB 1 · Bayangan Titik (lingkaran satuan → sin & cos)
     ===================================================================== */
  const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  const B1 = {
    key: 'b1', th: rad(30), play: true, snap: true, unit: 'deg', tri: true, drag: false, visited: new Set(), half: new Set(),
    missions: [
      ['putar', 'Seret titik keliling satu putaran penuh', 'Satu putaran = 360° = 2π', 'Bayangan samping yang naik-turun membentuk gelombang yang terus berulang setiap 360°. Itulah <b>gelombang sinus</b>!'],
      ['puncak', 'Temukan sudut saat bayangan samping paling tinggi', 'sin 90° = 1', 'Di 90° titik berada di puncak: bayangan samping = jari-jari = 1, sedangkan bayangan bawah = 0 (cos 90° = 0).'],
      ['setengah', 'Temukan DUA sudut dengan sin θ = ½', 'sin 30° = sin 150° = ½', 'Segitiga 30°-60°-90°: sisi di depan sudut 30° panjangnya setengah sisi miring. Di 150° bayangannya sama tinggi, hanya di kiri.'],
      ['sama', 'Temukan sudut saat sin θ = cos θ', 'sin 45° = cos 45° = √2/2', 'Di 45° segitiganya sama kaki. Dengan Pythagoras: s² + s² = 1 → s = √2/2 ≈ 0,707.'],
      ['negatif', 'Buat sin dan cos sama-sama negatif', 'Tanda tergantung kuadran', 'Di kuadran III (180°–270°) titik di kiri-bawah, jadi kedua bayangan negatif. Kuadran I: +,+ · II: cos − · IV: sin −.']
    ],
    layout() {
      this.portrait = W < 640 && H > W * 1.05;
      if (this.portrait) {   // HP tegak: lingkaran di atas, grafik di bawahnya
        this.R = Math.min(W * .3, H * .2); this.cx = W / 2; this.cy = 48 + this.R + 16;
        this.gx0 = 40; this.gx1 = W - 22; this.gw = this.gx1 - this.gx0;
        const room = H - (this.cy + this.R + 30) - 40; this.as = Math.max(22, Math.min(this.R * .6, room / 4.6));
        this.cyS = this.cy + this.R + 34 + this.as; this.ar = this.as; this.cy2 = this.cyS + this.as + 34 + this.ar;
      } else {
        this.R = Math.min(W * .2, (H - 92) / 3.3, H * .35);
        this.cx = 24 + this.R + 26; this.cy = 50 + this.R + 14;
        this.gx0 = this.cx + this.R + 46; this.gx1 = W - 26; this.gw = Math.max(60, this.gx1 - this.gx0);
        this.as = this.R; this.cyS = this.cy;
        this.ar = Math.max(24, Math.min(this.R * .55, (H - (this.cy + this.R) - 56) / 2));
        this.cy2 = this.cy + this.R + 34 + this.ar;
      }
    },
    side() {
      return sideShell(`Ini titik di lingkaran berjari-jari <b>1</b>. Senter dari samping membuat <b class="sin">bayangan merah</b> naik-turun, senter dari atas membuat <b class="cos">bayangan kuning</b> maju-mundur.<span class="q">👉 Seret titik putih pelan-pelan dan lihat gelombang di kanan!</span>`,
        `<div class="card"><h3>🎛️ Kendali</h3>
         <div class="row"><button class="btn sm" id="b1play" type="button">⏸ Jeda</button><button class="btn sm on" id="b1snap" type="button" aria-pressed="true">🧲 Sudut istimewa</button><button class="btn sm on" id="b1tri" type="button" aria-pressed="true">📐 Segitiga</button></div>
         <div class="row"><span class="note">Satuan sudut:</span><div class="seg"><button class="btn sm on" data-u="deg" type="button">Derajat °</button><button class="btn sm" data-u="rad" type="button">Radian π</button></div></div></div>
         <div class="card"><h3>📏 Hasil ukur</h3><div class="readout">
          <div><small>Sudut θ</small><b id="r1d">30°</b></div><div><small>Radian</small><b id="r1r">π/6</b></div>
          <div class="sin"><small>sin θ · bayangan samping</small><b id="r1s">0,500</b></div><div class="cos"><small>cos θ · bayangan bawah</small><b id="r1c">0,866</b></div></div>
          <p class="note" id="r1p" style="margin:.5rem 0 0">Pythagoras: cos² + sin² = 1</p></div>`);
    },
    bind() {
      $('b1play').onclick = () => { this.play = !this.play; this.syncBtns(); };
      $('b1snap').onclick = () => { this.snap = !this.snap; this.syncBtns(); };
      $('b1tri').onclick = () => { this.tri = !this.tri; this.syncBtns(); };
      document.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { this.unit = b.dataset.u; this.syncBtns(); });
      this.syncBtns(); this.readout();
    },
    syncBtns() {
      $('b1play').textContent = this.play ? '⏸ Jeda' : '▶ Putar';
      [['b1snap', this.snap], ['b1tri', this.tri]].forEach(([i, v]) => { $(i).classList.toggle('on', v); $(i).setAttribute('aria-pressed', v); });
      document.querySelectorAll('[data-u]').forEach(b => b.classList.toggle('on', b.dataset.u === this.unit));
    },
    setAngle(a, user) {
      a = ((a % TAU) + TAU) % TAU;
      if (this.snap) { const d = deg(a); for (const s of [...SPECIAL, 360]) if (Math.abs(d - s) < 3.2) { a = rad(s % 360); break; } }
      this.th = a;
      if (user) this.check();
      this.readout();
    },
    check() {
      const d = Math.round(deg(this.th)) % 360;
      const nb = Math.floor(deg(this.th) / 10) % 36;
      if (this.lastBin != null) { let dlt = ((nb - this.lastBin) % 36 + 36) % 36; if (dlt > 18) dlt -= 36; if (Math.abs(dlt) <= 6) for (let k = 1; k <= Math.abs(dlt); k++) this.visited.add(((this.lastBin + Math.sign(dlt) * k) % 36 + 36) % 36); }
      this.lastBin = nb; this.visited.add(nb);
      if (this.visited.size >= 36 && mission(this, 'putar')) say('🎉 Satu putaran penuh = <b>360°</b>. Lihat: gelombang merah kembali ke awal dan siap berulang. Itulah <b class="sin">gelombang sinus</b>!', 'wow');
      if (d === 90 && mission(this, 'puncak')) say('Puncak! Bayangan samping sepanjang jari-jari: <b class="sin">sin 90° = 1</b>. Bayangan bawah hilang: <b class="cos">cos 90° = 0</b>.', 'wow');
      if (d === 30 || d === 150) {
        if (!this.half.has(d)) { this.half.add(d); if (this.half.size === 1) say(`Tepat! <b class="sin">sin ${d}° = ½</b>. Tapi masih ada <b>satu sudut lagi</b> yang bayangannya sama tinggi…`, 'think'); }
        if (this.half.size === 2 && mission(this, 'setengah')) say('Dua jawaban: <b>30°</b> dan <b>150°</b>. Garis datar setinggi ½ memotong lingkaran di dua titik!', 'wow');
      }
      if ((d === 45 || d === 225) && mission(this, 'sama')) say('Di 45° dua bayangan sama panjang: <b>√2/2 ≈ 0,707</b>. Cek Pythagoras di panel: 0,5 + 0,5 = 1 ✅', 'wow');
      if (d > 180 && d < 270 && mission(this, 'negatif')) say('Kuadran III: titik di kiri-bawah, jadi <b class="sin">sin</b> dan <b class="cos">cos</b> sama-sama negatif.', 'happy');
    },
    readout() {
      if (!$('r1d')) return;
      const d = deg(this.th), s = Math.sin(this.th), c = Math.cos(this.th), ex = Math.abs(d - Math.round(d)) < 1e-6 ? M.exact(d) : null;
      $('r1d').textContent = fmt(d, Number.isInteger(Math.round(d * 1e6) / 1e6) ? 0 : 1) + '°';
      $('r1r').textContent = ex ? M.radLabel(d) : fmt(this.th, 2);
      $('r1s').textContent = fmt(s) + (ex ? ' = ' + ex.sin : ''); $('r1c').textContent = fmt(c) + (ex ? ' = ' + ex.cos : '');
      $('r1p').innerHTML = `Pythagoras: cos² + sin² = ${fmt(c * c)} + ${fmt(s * s)} = <b>${fmt(c * c + s * s)}</b>`;
      const lab = this.unit === 'deg' ? fmt(d, 0) + '°' : (ex ? M.radLabel(d) : fmt(this.th, 2) + ' rad');
      hud(`<span class="chip acc">θ = ${lab}</span><span class="chip sin">sin θ = ${fmt(s)}</span><span class="chip cos">cos θ = ${fmt(c)}</span>`);
    },
    draw(dt) {
      if (this.play && !this.drag) this.setAngle(this.th + dt * .45, false);
      const {R, cx, cy, gx0, gw, ar, cy2, as, cyS} = this, th = this.th, px = cx + R * Math.cos(th), py = cy - R * Math.sin(th);
      grid(Math.max(24, R / 2));
      // sumbu & kuadran
      line(cx - R - 18, cy, cx + R + 18, cy, C.axis, 1.5); line(cx, cy - R - 18, cx, cy + R + 18, C.axis, 1.5);
      ['I', 'II', 'III', 'IV'].forEach((q, i) => text(q, cx + (i === 0 || i === 3 ? 1 : -1) * R * .62, cy + (i < 2 ? -1 : 1) * R * .62, C.tick, Math.max(14, R * .16), 'center', 900));
      // sektor sudut
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, 0, -th, true); ctx.closePath(); ctx.fillStyle = C.accent; ctx.globalAlpha = C.dark ? .1 : .14; ctx.fill(); ctx.globalAlpha = 1;
      glow(() => { ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); }, C.dark ? '#c9d7f0' : '#ffffff', 2.4);
      // tanda sudut istimewa
      SPECIAL.forEach(s => {
        const a = rad(s), x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fillStyle = s % 90 ? C.alt : C.tick; ctx.fill();
        const lr = R + (R > 110 ? 20 : 15), lab = this.unit === 'deg' ? s + '°' : M.radLabel(s);
        if (R > 80 || s % 90 === 0) text(lab, cx + lr * Math.cos(a), cy - lr * Math.sin(a), C.tick, R > 110 ? 12 : 10, 'center', 800);
      });
      // busur θ kecil
      glow(() => { ctx.beginPath(); ctx.arc(cx, cy, Math.min(34, R * .24), 0, -th, true); }, C.accent, 2);
      if (this.tri) {
        glow(() => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); }, C.cos, 4);
        glow(() => { ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); }, C.sin, 4);
        text(fmt(Math.cos(th), 2), (cx + px) / 2, cy + (Math.sin(th) >= 0 ? 15 : -15), C.cos, 13);
        text(fmt(Math.sin(th), 2), px + (Math.cos(th) >= 0 ? 26 : -26), (cy + py) / 2, C.sin, 13);
        text('1', (cx + px) / 2 - 10 * Math.sin(th), (cy + py) / 2 - 10 * Math.cos(th), C.text, 15, 'center', 900);
      }
      glow(() => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); }, C.dark ? '#ffffff' : '#ffffff', 3);
      // grafik sin (skala sama → bayangan lurus mendatar)
      const gx = t => gx0 + t / TAU * gw;
      line(gx0, cyS, gx0 + gw, cyS, C.axis, 1.2); line(gx0, cyS - as, gx0, cyS + as, C.axis, 1);
      line(gx0, cy2, gx0 + gw, cy2, C.axis, 1.2); line(gx0, cy2 - ar, gx0, cy2 + ar, C.axis, 1);
      [1, 2, 3, 4].filter(k => gw > 300 || k % 2 === 0).forEach(k => { const x = gx(k * PI / 2), lab = this.unit === 'deg' ? k * 90 + '°' : ['π/2', 'π', '3π/2', '2π'][k - 1];
        line(x, cyS - 4, x, cyS + 4, C.tick, 1); text(lab, x, cyS + 14, C.tick, 11); line(x, cy2 - 4, x, cy2 + 4, C.tick, 1); text(lab, x, cy2 + 14, C.tick, 11); });
      text('1', gx0 - 10, cyS - as, C.tick, 11); text('−1', gx0 - 12, cyS + as, C.tick, 11);
      text('sin θ', gx0 + 8, cyS - as - 12, C.sin, 14, 'left', 900); text('cos θ', gx0 + 8, cy2 - ar - 12, C.cos, 14, 'left', 900);
      const wave = (fn, yc, amp, t1, w, col, alpha) => { ctx.globalAlpha = alpha; glow(() => { ctx.beginPath(); for (let i = 0; i <= 160; i++) { const t = t1 * i / 160; i ? ctx.lineTo(gx(t), yc - amp * fn(t)) : ctx.moveTo(gx(t), yc - amp * fn(t)); } }, col, w); ctx.globalAlpha = 1; };
      wave(Math.sin, cyS, as, TAU, 1.5, C.sin, .3); wave(Math.cos, cy2, ar, TAU, 1.5, C.cos, .3);
      if (th > 1e-3) { wave(Math.sin, cyS, as, th, 3.2, C.sin, 1); wave(Math.cos, cy2, ar, th, 3.2, C.cos, 1); }
      const sx = gx(th), sy = cyS - as * Math.sin(th), csy = cy2 - ar * Math.cos(th);
      if (!this.portrait) line(px, py, sx, sy, C.sin, 1.5, [6, 6]); line(sx, sy, sx, cyS, C.sin, 1, [3, 4]); line(sx, csy, sx, cy2, C.cos, 1, [3, 4]);
      dot(sx, sy, 6, C.sin); dot(sx, csy, 6, C.cos); dot(px, cy, 4.5, C.cos);
      dot(px, py, this.drag ? 11 : 9, C.pt, true);
    },
    down(p) {
      const {cx, cy, R} = this;
      if (Math.hypot(p.x - cx, p.y - cy) < R * 1.4) { this.drag = 'c'; this.play = false; this.syncBtns(); this.setAngle(Math.atan2(cy - p.y, p.x - cx), true); return true; }
      if (p.x > this.gx0 - 10 && p.x < this.gx0 + this.gw + 10 && p.y > (this.portrait ? this.cy + this.R + 10 : 0) && p.y < this.cy2 + this.ar + 20) { this.drag = 'g'; this.play = false; this.syncBtns(); this.move(p); return true; }
    },
    move(p) {
      if (this.drag === 'c') this.setAngle(Math.atan2(this.cy - p.y, p.x - this.cx), true);
      else if (this.drag === 'g') this.setAngle(clamp((p.x - this.gx0) / this.gw, 0, .9999) * TAU, true);
    },
    up() { this.drag = false; this.lastBin = null; }
  };

  /* =====================================================================
     BAB 2 · Mesin Gelombang  y = A·sin(Bx + C)
     ===================================================================== */
  const TARGETS = [
    {A: 2, B: 1, C: 0}, {A: 1, B: 2, C: 0}, {A: .5, B: 3, C: 0}, {A: 1, B: 1, C: 90, note: 'Wah, mirip gelombang cos!'}, {A: 1.5, B: 2, C: -45}, {A: 2, B: .5, C: 180}
  ];
  const B2 = {
    key: 'b2', A: 1, B: 1, Cd: 0, ti: 0, matched: false, pen: 0, sound: false, osc: null, gain: null, ac: null, soundB: new Set(), soundC: new Set(),
    missions: [
      ['t3', 'Tiru 3 gelombang target', 'A · B · C', '<b>A</b> = tinggi gelombang (amplitudo), <b>B</b> = berapa gelombang dalam satu putaran (frekuensi), <b>C</b> = geser kiri/kanan (fase).'],
      ['cos', 'Tiru target ke-4 dan kenali wajahnya', 'cos x = sin(x + 90°)', 'Gelombang <b>cos</b> hanyalah sinus yang digeser seperempat putaran (90°). Ingat Bab 1: bayangan kuning “start” dari 1!'],
      ['dengar', 'Nyalakan 🔊 lalu ubah B (rapat)', 'Rapat = nada tinggi', 'Makin besar B, gelombang makin rapat dan nadanya makin tinggi. Itulah <b>frekuensi</b> (Hz) pada suara.'],
      ['fase', 'Dengarkan: apakah C (geser) mengubah bunyi?', 'Fase tak terdengar', 'Menggeser gelombang sendirian tidak mengubah bunyi: telinga mendengar <b>rapat</b> (B) dan <b>keras</b> (A), bukan titik mulainya.'],
      ['semua', 'Tiru semua 6 target', 'Pembaca rumus', 'Kamu bisa membaca rumus <b>y = A·sin(Bx + C)</b> dari gambarnya, seperti ilmuwan sinyal!']
    ],
    layout() {
      this.U = Math.min((H - 90) / 4.6, W * .1); this.gR = this.U * 2.5;
      this.gcx = 24 + this.gR + 8; this.cy = H / 2 + 6; this.gx0 = this.gcx + this.gR + 34; this.gw = Math.max(80, W - 28 - this.gx0);
    },
    f(x, A = this.A, B = this.B, Cd = this.Cd) { return A * Math.sin(B * x + rad(Cd)); },
    sim() {
      const t = TARGETS[this.ti]; let s = 0; const n = 240;
      for (let i = 0; i < n; i++) { const x = i / n * TAU, d = this.f(x) - this.f(x, t.A, t.B, t.C); s += d * d; }
      return Math.max(0, 1 - Math.sqrt(s / n) / t.A);
    },
    side() {
      return sideShell(`Ini <b>mesin gelombang</b>. Lingkaran di kiri berputar seperti Bab 1, dan penanya menggambar gelombang ke kanan.<span class="q">🎯 Putar tiga kenop sampai gelombangmu menempel di garis putus-putus!</span>`,
        `<div class="card"><h3>🧮 Rumus gelombangmu</h3>
         <div class="formula" id="f2">y = <span class="a">1</span> · sin(<span class="b">1</span>x + <span class="c">0°</span>)</div>
         <label class="field"><span class="lbl">A · tinggi</span><input type="range" id="s2a" min="0.25" max="2.5" step="0.25" value="1"><output id="o2a">1</output></label>
         <label class="field"><span class="lbl">B · rapat</span><input type="range" id="s2b" min="0.5" max="4" step="0.5" value="1"><output id="o2b">1</output></label>
         <label class="field"><span class="lbl">C · geser</span><input type="range" id="s2c" min="-180" max="180" step="15" value="0"><output id="o2c">0°</output></label>
         <div class="row"><button class="btn sm" id="b2snd" type="button" aria-pressed="false">🔊 Dengarkan</button><span class="note">nada = 220 Hz × B</span></div></div>
         <div class="card"><h3>🎯 Target <span id="t2n">1/6</span></h3><div class="score" id="t2s">0%</div><div class="meter"><i id="t2m"></i></div>
          <div class="row" style="margin-top:.5rem"><button class="btn sm go" id="b2next" type="button" disabled>Target berikutnya ➜</button></div><p class="note" id="t2note"></p></div>`);
    },
    bind() {
      const upd = () => { this.A = +$('s2a').value; const nb = +$('s2b').value, nc = +$('s2c').value;
        if (this.sound && nb !== this.B) { this.soundB.add(nb); if (this.soundB.size >= 2) mission(this, 'dengar'); }
        if (this.sound && nc !== this.Cd) { this.soundC.add(nc); if (this.soundC.size >= 2) { if (mission(this, 'fase')) say('Dengar baik-baik… bunyinya <b>tidak berubah</b> waktu C digeser! Mata melihat geseran, telinga tidak.', 'think'); } }
        this.B = nb; this.Cd = nc; this.refresh(); };
      ['s2a', 's2b', 's2c'].forEach(i => $(i).oninput = upd);
      $('b2snd').onclick = () => this.toggleSound();
      $('b2next').onclick = () => { this.ti = (this.ti + 1) % TARGETS.length; this.matched = false; this.refresh(); say(`Target baru! Perhatikan <b>tingginya</b>, <b>berapa gelombang</b> dalam 2π, dan <b>titik mulainya</b>.`, 'think'); };
      this.refresh();
    },
    refresh() {
      if (!$('f2')) return;
      const cl = this.Cd ? (this.Cd > 0 ? '+ ' : '− ') + Math.abs(this.Cd) + '°' : '+ 0°';
      $('f2').innerHTML = `y = <span class="a">${String(this.A).replace('.', ',')}</span> · sin(<span class="b">${String(this.B).replace('.', ',')}</span>x <span class="c">${cl}</span>)`;
      $('o2a').textContent = String(this.A).replace('.', ','); $('o2b').textContent = String(this.B).replace('.', ','); $('o2c').textContent = this.Cd + '°';
      const s = this.sim(), t = TARGETS[this.ti];
      $('t2n').textContent = (this.ti + 1) + '/' + TARGETS.length; $('t2s').textContent = Math.round(s * 100) + '%'; $('t2m').style.width = (s * 100) + '%';
      const ok = s >= .97;
      $('b2next').disabled = !ok; $('t2note').textContent = ok ? '✅ Pas! ' + (t.note || 'Gelombangmu menempel sempurna.') : 'Tips: samakan tinggi dulu (A), lalu jumlah gelombang (B), terakhir geseran (C).';
      if (ok && !this.matched) {
        this.matched = true; ST.cards['g' + this.ti] = 1; save();
        const n = TARGETS.filter((_, i) => ST.cards['g' + i]).length;
        say(`✅ Menempel! ${t.note ? '<b>' + t.note + '</b> ' : ''}Sudah ${n} dari ${TARGETS.length} target.`, 'wow');
        if (n >= 3) mission(this, 't3'); if (this.ti === 3) mission(this, 'cos'); if (n >= TARGETS.length) mission(this, 'semua');
      }
      hud(`<span class="chip acc">kemiripan ${Math.round(s * 100)}%</span>`);
      if (this.osc) { const tnow = this.ac.currentTime; this.osc.frequency.setTargetAtTime(220 * this.B, tnow, .03); this.gain.gain.setTargetAtTime(.05 * this.A, tnow, .03); }
    },
    toggleSound() {
      this.sound = !this.sound; $('b2snd').setAttribute('aria-pressed', this.sound); $('b2snd').classList.toggle('on', this.sound);
      if (this.sound) {
        try {
          this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)(); this.ac.resume();
          this.osc = this.ac.createOscillator(); this.gain = this.ac.createGain(); this.gain.gain.value = 0; this.osc.type = 'sine';
          this.osc.connect(this.gain).connect(this.ac.destination); this.osc.start(); this.soundB = new Set([this.B]); this.soundC = new Set([this.Cd]); this.refresh();
          say('🔊 Dengar? Sekarang geser <b>B</b>, lalu coba geser <b>C</b>. Mana yang mengubah bunyi?', 'think');
        } catch (e) { toast('Audio tidak tersedia di perangkat ini'); this.sound = false; }
      } else this.stopSound();
    },
    stopSound() { try { if (this.osc) { this.gain.gain.setTargetAtTime(0, this.ac.currentTime, .03); const o = this.osc; setTimeout(() => o.stop(), 150); } } catch (_) {} this.osc = null; },
    leave() { if (this.sound) { this.sound = false; this.stopSound(); } },
    draw(dt) {
      const {U, gR, gcx, cy, gx0, gw} = this, t = TARGETS[this.ti];
      grid(U / 2);
      this.pen = (this.pen + dt / 4) % 1;
      const gx = x => gx0 + x / TAU * gw;
      // sumbu
      line(gx0, cy, gx0 + gw, cy, C.axis, 1.4); line(gx0, cy - 2.5 * U, gx0, cy + 2.5 * U, C.axis, 1.2);
      [-2, -1, 1, 2].forEach(k => { line(gx0, cy - k * U, gx0 + gw, cy - k * U, C.grid, 1); text(String(k).replace('-', '−'), gx0 - 12, cy - k * U, C.tick, 11); });
      [1, 2, 3, 4].forEach(k => { const x = gx(k * PI / 2); line(x, cy - 4, x, cy + 4, C.tick, 1); text(k * 90 + '°', x, cy + 2.5 * U + 12, C.tick, 11); });
      // target
      ctx.setLineDash([9, 8]); ctx.lineWidth = 3; ctx.strokeStyle = C.alt; ctx.globalAlpha = .85; ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const x = i / 240 * TAU, y = cy - U * this.f(x, t.A, t.B, t.C); i ? ctx.lineTo(gx(x), y) : ctx.moveTo(gx(x), y); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // gelombang pengguna: bayangan penuh + jejak yang sedang digambar
      const path = x1 => () => { ctx.beginPath(); for (let i = 0; i <= 240; i++) { const x = x1 * i / 240, y = cy - U * this.f(x); i ? ctx.lineTo(gx(x), y) : ctx.moveTo(gx(x), y); } };
      ctx.globalAlpha = .3; glow(path(TAU), C.trail, 1.6); ctx.globalAlpha = 1;
      const px = this.pen * TAU; glow(path(px), C.trail, 3.4);
      // generator (lingkaran berputar)
      const a = this.B * px + rad(this.Cd), r = this.A * U, gx2 = gcx + r * Math.cos(a), gy2 = cy - r * Math.sin(a);
      ctx.globalAlpha = .5; glow(() => { ctx.beginPath(); ctx.arc(gcx, cy, r, 0, TAU); }, C.dark ? '#c9d7f0' : '#ffffff', 2); ctx.globalAlpha = 1;
      line(gcx - gR, cy, gcx + gR, cy, C.axis, 1); line(gcx, cy - gR, gcx, cy + gR, C.axis, 1);
      glow(() => { ctx.beginPath(); ctx.moveTo(gcx, cy); ctx.lineTo(gx2, gy2); }, '#ffffff', 2.5);
      line(gx2, gy2, gx(px), cy - U * this.f(px), C.sin, 1.5, [5, 6]);
      dot(gx2, gy2, 7, C.sin); dot(gx(px), cy - U * this.f(px), 7, C.trail);
      text('lingkaran pemutar', gcx, cy + gR + 16, C.muted, 12);
    }
  };

  /* =====================================================================
     BAB 3 · Tarian Lissajous  x = sin(a·t + δ), y = sin(b·t)
     ===================================================================== */
  const RATIOS = ['1:1', '1:2', '2:1', '1:3', '3:1', '2:3', '3:2', '3:4', '4:3', '1:4', '3:5', '5:4'];
  const B3 = {
    key: 'b3', a: 1, b: 1, dd: 90, spin: false, t: 0, drawn: 0, quiz: null, qok: 0,
    missions: [
      ['lingkaran', 'Buat lingkaran sempurna', '1:1 + geser 90° = lingkaran', 'Dua putaran sama cepat yang bergeser 90°: x = cos, y = sin. Itu titik di Bab 1!'],
      ['garis', 'Buat garis lurus miring', 'δ = 0° → x selalu = y', 'Tanpa geseran, kiri-kanan dan atas-bawah selalu kompak → garis lurus y = x.'],
      ['delapan', 'Buat angka 8', '1:2 → angka 8', 'Naik-turun 2× setiap kali kiri-kanan 1×. Perbandingan kecepatan menentukan bentuk!'],
      ['koleksi', 'Kumpulkan 6 kartu pola', 'Rahasia membaca pola', 'Hitung berapa kali pola menyentuh <b>sisi kanan</b> (= a) dan <b>sisi atas</b> (= b). Itulah perbandingan a : b!'],
      ['tebak', 'Tebak 3 pola misteri dengan benar', 'Mata osiloskop', 'Kamu bisa membaca perbandingan dari bentuk. Teknisi memakai cara ini untuk membandingkan dua frekuensi di osiloskop.']
    ],
    layout() {
      const pad = 22, top = Math.min(80, H * .16), left = Math.min(80, W * .14);
      const bot = Math.min(70, H * .12);
      this.S = Math.max(120, Math.min(W - left - pad * 2, H - top - bot - pad * 2)); this.A = this.S / 2 * .9;
      this.mx = left + pad + (W - left - pad * 2) / 2; this.my = top + pad + (H - top - bot - pad * 2) / 2;
      this.top = top; this.left = left;
    },
    side() {
      return sideShell(`Satu titik digerakkan <b>dua putaran sekaligus</b>: putaran atas menggerakkan kiri-kanan, putaran kiri menggerakkan atas-bawah.<span class="q">🤔 Apa jadinya kalau yang satu 2× lebih cepat?</span>`,
        `<div class="card"><h3>⚙️ Kecepatan putaran</h3>
          <div class="row"><b style="min-width:6.5em">a (kiri-kanan)</b><button class="btn sm" data-st="a-" type="button">−</button><b class="formula" style="margin:0;padding:.15rem .8rem;font-size:1.2rem"><span class="b" id="v3a">1</span></b><button class="btn sm" data-st="a+" type="button">+</button></div>
          <div class="row"><b style="min-width:6.5em">b (atas-bawah)</b><button class="btn sm" data-st="b-" type="button">−</button><b class="formula" style="margin:0;padding:.15rem .8rem;font-size:1.2rem"><span class="a" id="v3b">1</span></b><button class="btn sm" data-st="b+" type="button">+</button></div>
          <label class="field"><span class="lbl">δ · geser</span><input type="range" id="s3d" min="0" max="180" step="15" value="90"><output id="o3d">90°</output></label>
          <div class="row"><button class="btn sm" id="b3spin" type="button" aria-pressed="false">🌀 Putar geseran</button><span class="note" id="r3">a : b = 1 : 1</span></div></div>
         <div class="card"><h3>🃏 Koleksi pola <span class="note" id="c3n"></span></h3><div class="cards" id="cards3"></div></div>
         <div class="card"><h3>❓ Tebak pola misteri</h3><canvas id="q3" width="200" height="200" style="width:9rem;height:9rem;display:block;margin:0 auto .5rem;border-radius:14px;border:var(--bw) solid var(--line)"></canvas>
          <div class="opts" id="q3o"></div><p class="note" id="q3n" style="text-align:center"></p></div>`);
    },
    bind() {
      document.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const k = b.dataset.st[0], d = b.dataset.st[1] === '+' ? 1 : -1; this[k] = clamp(this[k] + d, 1, 7); this.changed(); });
      $('s3d').oninput = () => { this.dd = +$('s3d').value; this.changed(); };
      $('b3spin').onclick = () => { this.spin = !this.spin; $('b3spin').classList.toggle('on', this.spin); $('b3spin').setAttribute('aria-pressed', this.spin); if (this.spin) say('Seperti benda 3D yang diputar, ya? Padahal hanya <b>geseran δ</b> yang berubah pelan-pelan.', 'wow'); };
      this.newQuiz(); this.changed();
    },
    ratio() { const g = M.gcd(this.a, this.b); return this.a / g + ':' + this.b / g; },
    changed() {
      if (!$('v3a')) return;
      $('v3a').textContent = this.a; $('v3b').textContent = this.b; $('o3d').textContent = Math.round(this.dd) + '°';
      if (!this.spin) $('s3d').value = this.dd;
      const r = this.ratio(); $('r3').textContent = `a : b = ${this.a} : ${this.b}` + (r !== this.a + ':' + this.b ? ` = ${r}` : '');
      this.drawn = 0; this.t = 0;
      if (RATIOS.includes(r) && !ST.cards['l' + r]) { ST.cards['l' + r] = 1; save(); toast('🃏 Kartu baru: ' + r.replace(':', ' : ')); }
      const n = RATIOS.filter(x => ST.cards['l' + x]).length; if (n >= 6) mission(this, 'koleksi');
      if (!this.spin) {
        if (r === '1:1' && this.dd === 90 && mission(this, 'lingkaran')) say('Lingkaran! <b>a = b</b> dan geser <b>90°</b>: x = cos t, y = sin t, persis titik di Bab 1.', 'wow');
        if (r === '1:1' && (this.dd === 0 || this.dd === 180) && mission(this, 'garis')) say('Garis lurus! Tanpa geseran, x dan y bergerak kompak.', 'wow');
      }
      if ((r === '1:2' || r === '2:1') && mission(this, 'delapan')) say('Angka 8! Satu arah bergerak <b>2× lebih cepat</b> dari arah lainnya.', 'wow');
      renderCardsIfAny();
    },
    pt(t, a = this.a, b = this.b, dd = this.dd) { return [Math.sin(a * t + rad(dd)), Math.sin(b * t)]; },
    renderCards() {
      const box = $('cards3'); if (!box) return;
      if (!box.children.length) box.innerHTML = RATIOS.map(r => `<button type="button" data-r="${r}"><canvas width="120" height="120"></canvas><span>${r.replace(':', ' : ')}</span></button>`).join('');
      box.querySelectorAll('button').forEach(b => {
        const r = b.dataset.r, on = !!ST.cards['l' + r], [a, bb] = r.split(':').map(Number);
        b.classList.toggle('lock', !on); b.onclick = () => { if (!on) { toast('🔒 Temukan dulu dengan mengatur a dan b'); return; } this.a = a; this.b = bb; this.changed(); };
        drawMini(b.querySelector('canvas'), on ? (t => this.pt(t, a, bb, 90)) : null, on ? C.trail : C.muted);
      });
      $('c3n').textContent = RATIOS.filter(x => ST.cards['l' + x]).length + '/' + RATIOS.length;
    },
    newQuiz() {
      const pool = RATIOS.filter(r => r !== '1:1'), ans = pool[Math.random() * pool.length | 0];
      const opts = [ans]; while (opts.length < 4) { const o = pool[Math.random() * pool.length | 0]; if (!opts.includes(o)) opts.push(o); }
      this.quiz = {ans, opts: opts.sort(() => Math.random() - .5)};
      const [a, b] = ans.split(':').map(Number);
      drawMini($('q3'), t => this.pt(t, a, b, 90), C.alt);
      $('q3o').innerHTML = this.quiz.opts.map(o => `<button class="btn sm" data-q="${o}" type="button">a : b = ${o.replace(':', ' : ')}</button>`).join('');
      $('q3n').textContent = `Benar: ${this.qok}/3 · Petunjuk: hitung sentuhan di sisi kanan & sisi atas`;
      $('q3o').querySelectorAll('[data-q]').forEach(btn => btn.onclick = () => {
        if (btn.dataset.q === this.quiz.ans) {
          this.qok++; toast('✅ Benar! ' + this.quiz.ans.replace(':', ' : '));
          if (this.qok >= 3 && mission(this, 'tebak')) say('Mata osiloskop! Kamu membaca perbandingan hanya dari bentuknya.', 'wow');
          const [qa, qb] = this.quiz.ans.split(':').map(Number); this.a = qa; this.b = qb; this.dd = 90; this.changed(); this.newQuiz();
        } else { btn.disabled = true; say('Belum tepat. Hitung berapa kali pola menyentuh <b>sisi kanan</b> kotak (= a) dan <b>sisi atas</b> (= b).', 'think'); }
      });
    },
    draw(dt) {
      const {mx, my, A, top, left} = this;
      grid(Math.max(28, A / 4));
      if (this.spin) { this.dd = (this.dd + dt * 25) % 360; $('o3d').textContent = Math.round(this.dd) + '°'; this.drawn = 1; }
      this.t += dt * TAU / 5; this.drawn = Math.min(1, this.drawn + dt / 5);
      // kotak & sumbu
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1.2; ctx.strokeRect(mx - A, my - A, A * 2, A * 2);
      line(mx - A, my, mx + A, my, C.grid, 1); line(mx, my - A, mx, my + A, C.grid, 1);
      const path = (frac) => () => { ctx.beginPath(); const n = 900, m = Math.max(2, Math.round(n * frac)); for (let i = 0; i <= m; i++) { const p = this.pt(i / n * TAU); i ? ctx.lineTo(mx + A * p[0], my - A * p[1]) : ctx.moveTo(mx + A * p[0], my - A * p[1]); } };
      ctx.globalAlpha = .22; glow(path(1), C.trail, 1.5); ctx.globalAlpha = 1;
      glow(path(this.drawn), C.trail, 3.2);
      // ekor cahaya titik
      const tt = this.t % TAU, tail = 26;
      for (let i = tail; i > 0; i--) { const p0 = this.pt(tt - (i + 1) * .02), p1 = this.pt(tt - i * .02); ctx.globalAlpha = (1 - i / tail) * .9; line(mx + A * p0[0], my - A * p0[1], mx + A * p1[0], my - A * p1[1], C.pt, 4); }
      ctx.globalAlpha = 1;
      const p = this.pt(tt), x = mx + A * p[0], y = my - A * p[1];
      // pemutar atas (a) & kiri (b)
      const rr = Math.min(26, top * .3, left * .3), ty = my - A - top * .45, tx = mx - A - rr - 14, lx = mx - A - left * .45, ly = my + A + rr + 14;
      line(mx - A, ty, mx + A, ty, C.axis, 1); line(lx, my - A, lx, my + A, C.axis, 1);
      const drv = (cx2, cy2, ang, col, lab) => { ctx.globalAlpha = .7; glow(() => { ctx.beginPath(); ctx.arc(cx2, cy2, rr, 0, TAU); }, col, 2); ctx.globalAlpha = 1; const ex = cx2 + rr * Math.cos(ang), ey = cy2 - rr * Math.sin(ang); line(cx2, cy2, ex, ey, col, 2.5); dot(ex, ey, 4, col); text(lab, cx2, cy2 + rr + 11, col, 11, 'center', 900); };
      drv(tx, ty, this.a * tt + rad(this.dd) - PI / 2, C.accent, '×' + this.a); drv(lx, ly, this.b * tt, C.sin, '×' + this.b);
      line(x, ty, x, y, C.accent, 1.3, [5, 6]); line(lx, y, x, y, C.sin, 1.3, [5, 6]);
      dot(x, ty, 6, C.accent); dot(lx, y, 6, C.sin); dot(x, y, 9, C.pt, true);
      hud(`<span class="chip acc">a : b = ${this.a} : ${this.b}</span><span class="chip">δ = ${Math.round(this.dd)}°</span>`);
    }
  };
  function drawMini(c, fn, color) {
    if (!c) return; const x = c.getContext('2d'), w = c.width, h = c.height; x.clearRect(0, 0, w, h);
    x.fillStyle = C.stage; x.fillRect(0, 0, w, h);
    if (!fn) { x.fillStyle = C.muted; x.font = `900 ${w * .35}px Nunito, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', w / 2, h / 2); return; }
    x.lineWidth = Math.max(2, w / 45); x.strokeStyle = color; x.lineJoin = 'round'; x.beginPath();
    for (let i = 0; i <= 500; i++) { const p = fn(i / 500 * TAU), px = w / 2 + p[0] * w * .4, py = h / 2 - p[1] * h * .4; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
  }
  function renderCardsIfAny() { if (CH() === B3) B3.renderCards(); }

  /* =====================================================================
     BAB 4 · Menggambar dengan Lingkaran (Fourier)
     ===================================================================== */
  const N4 = 256;
  const B4 = {
    key: 'b4', shape: 'hati', K: 12, t: 0, speed: 1, show: true, drawMode: false, rec: [], drawn: 0, pts: null, coefs: null, simv: 1, user: [],
    missions: [
      ['satu', 'Lihat hati dengan 1 lingkaran saja', '1 lingkaran = lingkaran', 'Satu lingkaran hanya bisa membuat lingkaran. Lekukan dan sudut butuh lingkaran tambahan yang <b>lebih kecil dan lebih cepat</b>.'],
      ['hati8', 'Buat hati 100% dengan lingkaran sesedikit mungkin', 'Hati = 8 lingkaran', 'Hati butuh tepat <b>8 lingkaran</b> untuk 100%! Rumus hati memang hanya berisi gelombang 1×, 2×, 3×, dan 4×.'],
      ['bintang', 'Bintang ≥ 95% dengan paling banyak 8 lingkaran', 'Sudut tajam = lingkaran cepat', 'Ujung runcing butuh lingkaran berfrekuensi tinggi. Makin tajam sudutnya, makin banyak lingkaran yang dibutuhkan.'],
      ['gambar', 'Gambar bentukmu sendiri, biarkan lingkaran menirunya', 'Transformasi Fourier', 'Gambar apa pun bisa dipecah menjadi lingkaran-lingkaran berputar. Ide ini dipakai di JPEG, MP3, dan sinyal HP!'],
      ['ikan', 'Ikan ≥ 95%: berapa lingkaran yang dibutuhkan?', 'Kompresi data', 'Bentuk rumit butuh lebih banyak lingkaran. Lingkaran yang sangat kecil bisa dibuang supaya data lebih hemat: itulah <b>kompresi</b>.']
    ],
    layout() { this.cx = W / 2; this.cy = H / 2 + 8; this.S = Math.min(W, H) * .37; },
    setShape(k, pts) {
      this.shape = k; this.pts = pts || M.normalize(M.SHAPES[k].gen(N4)); this.coefs = M.dft(this.pts); this.recompute();
      document.querySelectorAll('[data-sh]').forEach(b => b.classList.toggle('on', b.dataset.sh === k));
    },
    recompute() {
      this.rec = M.reconstruct(this.coefs, this.K, 400); this.simv = M.similarity(this.pts, this.coefs, this.K); this.drawn = 0; this.t = 0;
      if ($('o4k')) { $('o4k').textContent = this.K; $('s4k').value = this.K; $('m4').style.width = (this.simv * 100) + '%'; $('p4').textContent = Math.round(this.simv * 100) + '%'; }
      const s = this.simv, k = this.shape;
      if (k === 'hati' && this.K === 1 && mission(this, 'satu')) say('Dengan 1 lingkaran, hati jadi… <b>bulat</b> saja. Tambah lingkaran satu per satu dan lihat kapan bentuk hati muncul!', 'think');
      if (k === 'hati' && this.K <= 8 && s >= .995 && mission(this, 'hati8')) say('❤️ Hati sempurna hanya dengan <b>8 lingkaran</b>!', 'wow');
      if (k === 'bintang' && this.K <= 8 && s >= .95 && mission(this, 'bintang')) say('⭐ Bintang 95%! Ujung runcing dibuat oleh lingkaran kecil yang berputar cepat.', 'wow');
      if (k === 'ikan' && s >= .95 && mission(this, 'ikan')) say(`🐟 Ikan butuh <b>${this.K}</b> lingkaran untuk 95%. Bentuk rumit = lebih banyak lingkaran.`, 'wow');
      if (k === 'custom' && this.K >= 10 && s >= .85 && mission(this, 'gambar')) say('Lingkaran-lingkaran meniru gambarmu! Inilah <b>transformasi Fourier</b>.', 'wow');
    },
    side() {
      return sideShell(`Hati ini digambar oleh <b>lingkaran yang menempel di lingkaran</b>. Masing-masing berputar dengan kecepatan berbeda.<span class="q">👉 Geser “jumlah lingkaran” ke 1, lalu naikkan pelan-pelan!</span>`,
        `<div class="card"><h3>🎨 Bentuk</h3><div class="seg">${Object.keys(M.SHAPES).map(k => `<button class="btn sm" data-sh="${k}" type="button">${M.SHAPES[k].icon} ${M.SHAPES[k].name}</button>`).join('')}
          <button class="btn sm" id="b4draw" type="button" aria-pressed="false">✏️ Gambar sendiri</button></div></div>
         <div class="card"><h3>⭕ Jumlah lingkaran</h3>
          <label class="field"><span class="lbl">K</span><input type="range" id="s4k" min="1" max="100" step="1" value="12"><output id="o4k">12</output></label>
          <div class="row">${[1, 2, 3, 5, 8, 20, 50, 100].map(k => `<button class="btn sm" data-k="${k}" type="button">${k}</button>`).join('')}</div>
          <div class="row" style="justify-content:space-between"><b>Kemiripan</b><b id="p4" style="font:600 1.4rem var(--f-head)">100%</b></div><div class="meter"><i id="m4"></i></div>
          <label class="field"><span class="lbl">Kecepatan</span><input type="range" id="s4v" min="0.2" max="2" step="0.1" value="1"><output id="o4v">1×</output></label>
          <div class="row"><button class="btn sm on" id="b4show" type="button" aria-pressed="true">👁️ Tampilkan lingkaran</button></div></div>`);
    },
    bind() {
      document.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { this.drawMode = false; this.syncDraw(); this.setShape(b.dataset.sh); say(`${M.SHAPES[b.dataset.sh].icon} ${M.SHAPES[b.dataset.sh].name}! Berapa lingkaran yang dibutuhkan supaya mirip?`, 'think'); });
      $('s4k').oninput = () => { this.K = +$('s4k').value; this.recompute(); };
      document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { this.K = +b.dataset.k; this.recompute(); });
      $('s4v').oninput = () => { this.speed = +$('s4v').value; $('o4v').textContent = String(this.speed).replace('.', ',') + '×'; };
      $('b4show').onclick = () => { this.show = !this.show; $('b4show').classList.toggle('on', this.show); $('b4show').setAttribute('aria-pressed', this.show); };
      $('b4draw').onclick = () => { this.drawMode = !this.drawMode; this.syncDraw(); if (this.drawMode) say('✏️ Gambar satu garis tertutup di papan dengan jari atau mouse (misalnya inisial namamu atau bentuk daun). Lepas jari untuk mulai!', 'think'); };
      if (!this.coefs) this.setShape('hati'); else { this.setShape(this.shape, this.pts); }
    },
    syncDraw() { const b = $('b4draw'); if (b) { b.classList.toggle('on', this.drawMode); b.setAttribute('aria-pressed', this.drawMode); } },
    draw(dt) {
      const {cx, cy, S} = this;
      grid(Math.max(28, S / 4));
      const X = p => cx + p[0] * S, Y = p => cy - p[1] * S;
      if (this.drawMode) {
        text(this.user.length ? 'Lepas jari untuk mulai ✨' : '✏️ Gambar di sini', cx, 40, C.muted, 18, 'center', 900);
        if (this.user.length > 1) glow(() => { ctx.beginPath(); this.user.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }, C.alt, 3.5);
        hud('<span class="chip acc">mode menggambar</span>'); return;
      }
      // target asli
      ctx.setLineDash([6, 7]); ctx.strokeStyle = C.axis; ctx.lineWidth = 2; ctx.beginPath(); this.pts.forEach((p, i) => i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p))); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      const step = dt * this.speed / 7; this.drawn = Math.min(1, this.drawn + step); this.t = (this.t + step) % 1;
      // lintasan rekonstruksi: putaran pertama digambar mengikuti pena, sesudahnya utuh
      const n = this.rec.length, upto = this.drawn >= 1 ? n : Math.floor(this.t * n);
      if (upto > 1) glow(() => { ctx.beginPath(); for (let i = 0; i <= upto; i++) { const p = this.rec[i % n]; i ? ctx.lineTo(X(p), Y(p)) : ctx.moveTo(X(p), Y(p)); } }, C.sin, 3.2);
      // rantai lingkaran
      let x = 0, y = 0; const showN = Math.min(this.K, LITE() ? 40 : 80);
      for (let i = 0; i < this.K; i++) {
        const c = this.coefs[i], a = TAU * c.f * this.t + c.p, nx = x + c.r * Math.cos(a), ny = y + c.r * Math.sin(a);
        if (this.show && i < showN && c.r * S > .6) {
          ctx.globalAlpha = Math.max(.12, .55 - i * .012); ctx.strokeStyle = i ? C.accent : C.cos; ctx.lineWidth = i ? 1.2 : 1.8;
          ctx.beginPath(); ctx.arc(cx + x * S, cy - y * S, c.r * S, 0, TAU); ctx.stroke();
          ctx.globalAlpha = Math.max(.35, .95 - i * .015); line(cx + x * S, cy - y * S, cx + nx * S, cy - ny * S, C.text, i ? 1.3 : 2); ctx.globalAlpha = 1;
        }
        x = nx; y = ny;
      }
      // ekor bercahaya pena
      const tail = 40; for (let i = tail; i > 0; i--) { const p0 = M.at(this.coefs, this.K, this.t - (i + 1) * .0025), p1 = M.at(this.coefs, this.K, this.t - i * .0025); ctx.globalAlpha = (1 - i / tail); line(X(p0), Y(p0), X(p1), Y(p1), C.pt, 4.5); }
      ctx.globalAlpha = 1; dot(cx + x * S, cy - y * S, 7, C.pt, true);
      hud(`<span class="chip acc">${this.K} lingkaran</span><span class="chip sin">kemiripan ${Math.round(this.simv * 100)}%</span>`);
    },
    down(p) { if (!this.drawMode) return; this.user = [[p.x, p.y]]; this.drawing = true; return true; },
    move(p) { if (this.drawing) { const l = this.user[this.user.length - 1]; if (Math.hypot(p.x - l[0], p.y - l[1]) > 3) this.user.push([p.x, p.y]); } },
    up() {
      if (!this.drawing) return; this.drawing = false;
      if (this.user.length < 15) { toast('Gambarnya terlalu pendek, coba lagi ✏️'); this.user = []; return; }
      const pts = M.normalize(M.resample(this.user.map(p => [p[0], -p[1]]), N4).map(p => [p[0], p[1]]));
      this.user = []; this.drawMode = false; this.syncDraw(); this.K = 30; this.setShape('custom', pts);
      say('Lihat! Lingkaran-lingkaran sedang meniru gambarmu. Coba kurangi jumlah lingkaran: kapan gambarmu mulai “meleleh”?', 'wow');
    }
  };

  /* ---------- navigasi bab ---------- */
  const CHS = [B1, B2, B3, B4];
  const CH = () => CHS[ST.ch] || B1;
  function goCh(i) {
    CH().leave && CH().leave();
    ST.ch = i; save(); hudCache = '';
    document.querySelectorAll('.tab').forEach((t, k) => t.classList.toggle('on', k === i));
    $('side').innerHTML = CH().side(); $('side').scrollTop = 0; $('stagebar').innerHTML = '';
    resize(); CH().bind(); renderMissions(); renderProgress();
    try { window.PILAR_PULSE?.track?.('lingkaran_chapter', {ch: i + 1}); } catch (_) {}
  }
  document.querySelectorAll('.tab').forEach((t, i) => t.onclick = () => goCh(i));
  const pos = e => { const r = cv.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; };
  let active = null;
  cv.addEventListener('pointerdown', e => { if (active !== null) return; if (CH().down && CH().down(pos(e))) { active = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); } });
  cv.addEventListener('pointermove', e => { if (e.pointerId === active && CH().move) CH().move(pos(e)); });
  const end = e => { if (e.pointerId === active) { active = null; CH().up && CH().up(pos(e)); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  new ResizeObserver(() => resize()).observe($('stage'));

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    try { CH().draw(dt); } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }
  setTheme(html.dataset.theme === 'ceria' ? 'ceria' : 'gelap');
  goCh(clamp(ST.ch | 0, 0, 3));
  requestAnimationFrame(loop);
  window.PILAR_LINGKARAN = {state: ST, chapters: CHS, goCh, setTheme, math: M};
  try { window.PILAR_PULSE?.setApp?.('lingkaran-ajaib'); } catch (_) {}
})();
