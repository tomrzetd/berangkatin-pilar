/* na Daluang · UI (Rakit · Gurat · Ngaran · Maca) */
(function () {
  'use strict';
  const A = window.DALUANG_AKSARA, $ = id => document.getElementById(id), D = A.DOTTED;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const track = (n, d) => { try { window.PILAR_PULSE?.track?.(n, d || {}); } catch (_) {} };
  try { window.PILAR_PULSE?.setApp?.('daluang'); } catch (_) {}
  const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); };
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('daluang_' + k)) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem('daluang_' + k, JSON.stringify(v)); } catch (_) {} } };

  // ---------- kosakata (Sunda → Indonesia) ----------
  const WORDS = [
    ['cai', 'air'], ['seuneu', 'api'], ['angin', 'angin'], ['taneuh', 'tanah'], ['langit', 'langit'], ['bulan', 'bulan'], ['béntang', 'bintang'],
    ['panonpoé', 'matahari'], ['gunung', 'gunung'], ['leuweung', 'hutan'], ['sawah', 'sawah'], ['walungan', 'sungai'], ['imah', 'rumah'],
    ['sakola', 'sekolah'], ['buku', 'buku'], ['hayam', 'ayam'], ['lauk', 'ikan'], ['munding', 'kerbau'], ['kembang', 'bunga'], ['tangkal', 'pohon'],
    ['beureum', 'merah'], ['héjo', 'hijau'], ['bodas', 'putih'], ['hideung', 'hitam'], ['koneng', 'kuning'], ['indung', 'ibu'], ['bapa', 'ayah'],
    ['guru', 'guru'], ['babaturan', 'teman'], ['dahar', 'makan'], ['nginum', 'minum'], ['maca', 'membaca'], ['nulis', 'menulis'], ['ulin', 'bermain'],
    ['prabu', 'raja'], ['sunda', 'Sunda'], ['daluang', 'kertas kulit kayu'], ['ngaran', 'nama'], ['aksara', 'huruf'],
  ];
  const CHAL = ['cai', 'buku', 'imah', 'hayam', 'gunung', 'sakola', 'kembang', 'beureum', 'prabu', 'sunda', 'daluang', 'ngaran'];
  const meaning = w => (WORDS.find(x => x[0] === w) || [])[1] || '';

  // ---------- tab ----------
  const panes = ['rakit', 'gurat', 'ngaran', 'maca'];
  function showTab(id) {
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
    panes.forEach(p => $('p-' + p).classList.toggle('hidden', p !== id));
    store.set('tab', id); track('daluang_tab', { tab: id });
    if (id === 'gurat') requestAnimationFrame(G.resize);
    if (id === 'ngaran') N.render();
  }
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  // ================= 01 RAKIT =================
  const sel = { base: 'ka', swara: null, vokal: null, medial: null, final: null };
  const RKG = { vokal: 'Ganti vokal', pamaeh: 'Matikan vokal', medial: 'Sisipan (tengah)', final: 'Bunyi akhir' };
  function buildPalettes() {
    $('palNg').innerHTML = A.NGALAGENA.map(n => `<button class="key${n.pokok ? '' : ' serapan'}" data-base="${n.latin}" type="button"><span class="aks">${n.ch}</span><small>${n.latin}</small></button>`).join('');
    $('palSw').innerHTML = A.SWARA.map(s => `<button class="key" data-swara="${s.latin}" type="button"><span class="aks">${s.ch}</span><small>${s.latin}</small></button>`).join('');
    const groups = { vokal: [], pamaeh: [], medial: [], final: [] };
    A.RARANGKEN.forEach(r => groups[r.grup].push(r));
    $('palRk').innerHTML = Object.entries(groups).map(([g, list]) => `<div class="rk-group"><b>${RKG[g]}</b>${list.map(r =>
      `<button class="rk" data-rk="${r.id}" type="button"><span class="aks">${D}${r.ch}</span><span><b>${r.id}</b><small>${r.fungsi}</small><span class="pos">letak: ${r.pos}</span></span></button>`).join('')}</div>`).join('');
  }
  function slotOf(id) { return A.R[id]?.grup === 'vokal' || id === 'pamaéh' ? 'vokal' : A.R[id]?.grup; }
  function apply(id) {
    const r = A.R[id]; if (!r) return;
    if (sel.swara && (r.grup === 'vokal' || r.grup === 'medial' || r.grup === 'pamaeh')) {
      return explain(`<span class="warn">Aksara swara sudah berupa vokal.</span> Rarangkén ${r.id} hanya bisa dipasang pada aksara ngalagena. Yang bisa ditempel ke aksara swara adalah bunyi akhir: panyecek, panglayar, atau pangwisad.`);
    }
    const key = r.grup === 'final' ? 'final' : r.grup === 'medial' ? 'medial' : 'vokal';
    sel[key] = sel[key] === id ? null : id;           // ketuk lagi = lepas
    if (key === 'vokal' && sel.vokal === 'pamaéh') sel.final = null;
    if (key === 'final' && sel.vokal === 'pamaéh') sel.vokal = null;
    render(true, id);
  }
  function explain(html) { $('explain').innerHTML = html; }
  let lastUnit = null;
  function render(pop, changed) {
    const u = A.compose(sel); lastUnit = u;
    const g = $('glyph'); g.textContent = u.ch; if (pop) { g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
    $('reading').textContent = u.latin || '—';
    document.querySelectorAll('[data-base]').forEach(b => b.classList.toggle('on', b.dataset.base === sel.base && !sel.swara));
    document.querySelectorAll('[data-swara]').forEach(b => b.classList.toggle('on', b.dataset.swara === sel.swara));
    document.querySelectorAll('[data-rk]').forEach(b => {
      const id = b.dataset.rk, r = A.R[id]; b.classList.toggle('on', sel.vokal === id || sel.medial === id || sel.final === id);
      b.classList.toggle('off', !!sel.swara && r.grup !== 'final');
    });
    $('formula').innerHTML = u.parts.map((p, i) => `${i ? '<span class="op">+</span>' : ''}<span class="pc"><span class="aks">${p.k === 'base' || p.k === 'swara' ? p.ch : D + p.ch}</span><small>${esc(p.name)}</small></span>`).join('') +
      `<span class="op">=</span><span class="pc"><span class="aks">${u.ch}</span><small>${esc(u.latin)}</small></span>`;
    // penjelasan langkah demi langkah
    const lines = [];
    if (sel.swara) lines.push(`<b class="aks" style="font-size:1.5em">${u.parts[0].ch}</b> adalah <b>aksara swara</b>, vokal <b>${sel.swara}</b> yang berdiri sendiri. Dipakai di awal kata atau setelah vokal lain, misalnya <i>c<b>a</b>-<b>i</b></i>.`);
    else {
      const n = A.NGALAGENA.find(x => x.latin === sel.base);
      lines.push(`<b class="aks" style="font-size:1.5em">${n.ch}</b> = <b>${n.latin}</b>. Aksara ngalagena selalu membawa vokal <b>a</b>.`);
      if (sel.medial) { const r = A.R[sel.medial]; lines.push(`+ <b>${r.id}</b> (di ${r.pos}) menyisipkan <b>${r.m}</b> → ${n.cons}${r.m}a.`); }
      if (sel.vokal === 'pamaéh') lines.push(`+ <b>pamaéh</b> (di kanan) <b>mematikan vokal</b> → tinggal bunyi <b>${n.cons}</b>. Dipakai untuk konsonan di akhir suku kata, misalnya <span class="aks" style="font-size:1.4em">ᮞᮥᮔ᮪ᮓ</span> <i>su-n-da</i>.`);
      else if (sel.vokal) { const r = A.R[sel.vokal]; lines.push(`+ <b>${r.id}</b> (di ${r.pos}) mengganti vokal <b>a → ${r.v}</b>.`); }
    }
    if (sel.final) { const r = A.R[sel.final]; lines.push(`+ <b>${r.id}</b> (di ${r.pos}) menambah bunyi akhir <b>-${r.f}</b>. Tidak perlu menulis huruf ${r.f} + pamaéh.`); }
    lines.push(`<span class="hand">dibaca: ${esc(u.latin)}</span>`);
    explain(lines.join('<br>'));
    // sorot letak
    document.querySelectorAll('.slot').forEach(s => s.classList.toggle('hint', !!changed && A.R[changed]?.pos === s.dataset.pos));
    $('addUnit').classList.toggle('hidden', !T.word);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-base],[data-swara]'); if (!b || !$('p-rakit').contains(b)) return;
    if (b.dataset.base) { sel.base = b.dataset.base; sel.swara = null; }
    else { sel.swara = b.dataset.swara; sel.vokal = null; sel.medial = null; }
    render(true);
  });
  $('resetMarks').onclick = () => { sel.vokal = sel.medial = sel.final = null; render(true); };

  // seret rarangkén → lembar (ketuk juga bisa)
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.rk'); if (!b) return;
    if (e.pointerType === 'mouse') e.preventDefault();   // jangan memulai seleksi teks saat menyeret
    drag = { id: b.dataset.rk, x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false, el: b };
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
  });
  document.addEventListener('mousedown', e => { if (e.target.closest('.rk')) e.preventDefault(); });   // cegah seleksi teks saat menyeret dengan mouse
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) {
      drag.moved = true; const g = document.createElement('div'); g.className = 'dragGhost aks'; g.textContent = D + A.R[drag.id].ch; document.body.appendChild(g); drag.g = g;
      document.querySelectorAll('.slot').forEach(s => s.classList.toggle('hint', s.dataset.pos === A.R[drag.id].pos));
    }
    if (drag.g) { drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px'; $('stage').classList.toggle('drop', overStage(e)); }
  });
  const overStage = e => { const r = $('sheet').getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; };
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag; drag = null; $('stage').classList.remove('drop'); try { getSelection().removeAllRanges(); } catch (_) {}
    if (d.g) { d.g.remove(); if (e.type === 'pointerup' && overStage(e)) apply(d.id); else render(false); }
    else if (e.type === 'pointerup') apply(d.id);
  }
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

  // ---------- tantangan rakit kecap ----------
  const T = { word: null, units: [], built: [], idx: store.get('chalIdx', 0), done: store.get('chalDone', []) };
  function newChallenge(step) {
    if (step) T.idx = (T.idx + 1) % CHAL.length; store.set('chalIdx', T.idx);
    T.word = CHAL[T.idx]; T.units = A.units(T.word); T.built = [];
    $('tWord').innerHTML = `${esc(T.word)}<small>${esc(meaning(T.word))} · ${T.units.length} gugus aksara</small>`;
    $('tMsg').innerHTML = `Rakit gugus ke-1 (<b>${esc(T.units[0].latin)}</b>), lalu tekan <b>➕ Tambahkeun</b>.`;
    drawSlots(); render(false);
  }
  function drawSlots() {
    $('tSlots').innerHTML = T.units.map((u, i) => i < T.built.length ? `<div class="us done"><span class="aks">${u.ch}</span><small>${esc(u.latin)}</small></div>`
      : `<div class="us${i === T.built.length ? ' next' : ''}"><small>${esc(u.latin)}</small></div>`).join('');
    $('tProg').textContent = `${T.done.length}/${CHAL.length} kecap`;
  }
  function diffHint(got, want) {
    const s = []; if ((got.base || got.swara) !== (want.base || want.swara)) s.push(want.swara ? `pakai aksara swara <b>${want.swara}</b>` : `aksara dasarnya <b>${want.base}a</b>`);
    if ((got.medial || '') !== (want.medial || '')) s.push(want.medial ? `ada sisipan <b>-${want.medial}-</b>` : 'tanpa sisipan');
    const gv = got.pamaeh ? 'pamaéh' : got.vokal || 'a', wv = want.pamaeh ? 'pamaéh' : want.vokal || 'a';
    if (gv !== wv) s.push(want.pamaeh ? 'vokalnya dimatikan dengan <b>pamaéh</b>' : `vokalnya <b>${wv}</b>`);
    if ((got.final || '') !== (want.final || '')) s.push(want.final ? `bunyi akhir <b>-${want.final}</b>` : 'tanpa bunyi akhir');
    return s.join(', ');
  }
  $('addUnit').onclick = () => {
    if (!T.word || !lastUnit) return; const want = T.units[T.built.length];
    if (lastUnit.ch === want.ch) {
      T.built.push(lastUnit); drawSlots();
      if (T.built.length === T.units.length) {
        if (!T.done.includes(T.word)) { T.done.push(T.word); store.set('chalDone', T.done); }
        $('tMsg').innerHTML = `<span class="stamp">Hadé pisan!</span> <span class="aks" style="font-size:1.8rem">${A.toAksara(T.word)}</span> = <b>${esc(T.word)}</b> (${esc(meaning(T.word))}).`;
        drawSlots(); track('daluang_rakit', { w: T.word }); toast('🎉 Kecap “' + T.word + '” réngsé!');
        setTimeout(() => newChallenge(true), 2600);
      } else $('tMsg').innerHTML = `✔ Betul! Sekarang gugus ke-${T.built.length + 1}: <b>${esc(T.units[T.built.length].latin)}</b>.`;
      sel.vokal = sel.medial = sel.final = null; render(false);
    } else $('tMsg').innerHTML = `<span class="warn" style="color:var(--k-red);font-weight:700">Belum pas.</span> Gugus <b>${esc(want.latin)}</b>: ${diffHint(lastUnit, want)}. Kamu merakit <b>${esc(lastUnit.latin)}</b>.`;
  };
  $('tUndo').onclick = () => { T.built.pop(); drawSlots(); };
  $('tSkip').onclick = () => newChallenge(true);

  // ================= 02 GURAT =================
  const G = (() => {
    const cv = $('gCanvas'), ctx = cv.getContext('2d');
    const items = [...A.NGALAGENA.filter(n => n.pokok).map(n => ({ ch: n.ch, latin: n.latin, kind: 'NGALAGENA' })),
      ...A.SWARA.map(s => ({ ch: s.ch, latin: s.latin, kind: 'AKSARA SWARA' })),
      ...['ki', 'ku', 'ké', 'ko', 'ke', 'keu', 'kang', 'kar', 'kah', 'kra'].map(l => ({ ch: A.toAksara(l), latin: l, kind: 'NGALAGENA + RARANGKÉN' })),
      ...['k'].map(() => ({ ch: A.toAksara('ka').replace(/$/, '᮪'), latin: 'k (pamaéh)', kind: 'NGALAGENA + PAMAÉH' }))];
    let cur = store.get('gIdx', 0), strokes = [], active = new Map(), guide = true, W = 0, dpr = 1, best = store.get('gBest', {});
    function chips() {
      $('gChips').innerHTML = items.map((it, i) => `<button class="key${i === cur ? ' on' : ''}${best[it.latin] ? ' got' : ''}" data-g="${i}" type="button"><span class="aks">${it.ch}</span><small>${esc(it.latin)}</small></button>`).join('');
    }
    $('gChips').onclick = e => { const b = e.target.closest('[data-g]'); if (b) pick(+b.dataset.g); };
    function pick(i) { cur = (i + items.length) % items.length; store.set('gIdx', cur); strokes = []; active.clear(); chips(); $('gName').textContent = items[cur].latin; $('gKind').textContent = items[cur].kind; $('gStars').textContent = ''; $('gScore').textContent = best[items[cur].latin] ? 'Terbaik: ' + best[items[cur].latin] + '%' : 'Belum dinilai'; draw(); }
    function resize() { const r = cv.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2, devicePixelRatio || 1); W = r.width; cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); draw(); }
    function glyphFont(c, size) { c.font = `500 ${size}px "Noto Sans Sundanese"`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; }
    // letakkan glyph di tengah berdasarkan kotak tinta sebenarnya
    function place(c, ch, S) {
      let size = S * .62; glyphFont(c, size); let m = c.measureText(ch);
      const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const k = Math.min(S * .72 / Math.max(w, 1), S * .72 / Math.max(h, 1)); size *= k; glyphFont(c, size); m = c.measureText(ch);
      const x = S / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, y = S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      return { x, y, size };
    }
    function lineW() { return Math.max(10, W * .045); }
    function draw() {
      if (!W) return; const S = W; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
      // garis bantu
      ctx.strokeStyle = '#8a7a5533'; ctx.lineWidth = 1; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke(); ctx.setLineDash([]);
      if (guide) { const p = place(ctx, items[cur].ch, S); ctx.fillStyle = '#5a4a2a2a'; ctx.fillText(items[cur].ch, p.x, p.y); }
      ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#1f2a1f'; ctx.lineWidth = lineW();
      for (const s of [...strokes, ...active.values()]) { ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (s.length === 1) ctx.lineTo(s[0][0] + .1, s[0][1]); ctx.stroke(); }
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} active.set(e.pointerId, [pt(e)]); draw(); });
    cv.addEventListener('pointermove', e => { const s = active.get(e.pointerId); if (!s) return; for (const c of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) s.push(pt(c)); if (!G.raf) G.raf = requestAnimationFrame(() => { G.raf = 0; draw(); }); });
    const up = e => { const s = active.get(e.pointerId); if (!s) return; active.delete(e.pointerId); strokes.push(s); draw(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    // penilaian: cakupan bentuk × kerapian (mask resolusi rendah, murah di IFP)
    function check() {
      const all = [...strokes, ...active.values()]; if (!all.length) return toast('Gurat dulu aksaranya ✍️');
      const N = 160, sc = N / W, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c.getContext('2d'); };
      const g = mk(), tol = mk(), st = mk(), stw = mk();
      const p = place(g, items[cur].ch, N); g.fillStyle = '#000'; g.fillText(items[cur].ch, p.x, p.y);
      glyphFont(tol, p.size); tol.fillStyle = tol.strokeStyle = '#000'; tol.lineJoin = 'round'; tol.lineWidth = lineW() * sc * 1.6; tol.fillText(items[cur].ch, p.x, p.y); tol.strokeText(items[cur].ch, p.x, p.y);
      const pen = (c, w) => { c.lineCap = c.lineJoin = 'round'; c.strokeStyle = '#000'; c.lineWidth = w; for (const s of all) { c.beginPath(); s.forEach(([x, y], i) => i ? c.lineTo(x * sc, y * sc) : c.moveTo(x * sc, y * sc)); if (s.length === 1) c.lineTo(s[0][0] * sc + .1, s[0][1] * sc); c.stroke(); } };
      pen(st, lineW() * sc); pen(stw, lineW() * sc * 1.9);
      const a = (c) => c.getImageData(0, 0, N, N).data; const GA = a(g), TA = a(tol), SA = a(st), WA = a(stw);
      let gN = 0, gHit = 0, sN = 0, sIn = 0;
      for (let i = 3; i < GA.length; i += 4) { if (GA[i] > 100) { gN++; if (WA[i] > 60) gHit++; } if (SA[i] > 100) { sN++; if (TA[i] > 60) sIn++; } }
      const cover = gN ? gHit / gN : 0, prec = sN ? sIn / sN : 0, f = cover + prec ? 2 * cover * prec / (cover + prec) : 0, pct = Math.round(f * 100);
      const stars = pct >= 78 ? 3 : pct >= 62 ? 2 : pct >= 45 ? 1 : 0;
      $('gStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      $('gScore').textContent = `Nilai ${pct}% · tertutup ${Math.round(cover * 100)}% · rapi ${Math.round(prec * 100)}%`;
      $('gMsg').innerHTML = stars === 3 ? `<span class="hand">Hadé pisan!</span> Bentuk <b>${esc(items[cur].latin)}</b> sudah jelas terbaca.`
        : cover < prec ? `Masih ada bagian bentuk yang belum tergurat (<b>${Math.round(cover * 100)}%</b> tertutup). Lengkapi lengkungan dan tandanya.`
          : `Goresan banyak keluar dari bentuk (<b>${Math.round(prec * 100)}%</b> rapi). Pelan-pelan, ikuti bayangannya.`;
      if (pct > (best[items[cur].latin] || 0)) { best[items[cur].latin] = pct; store.set('gBest', best); chips(); }
      track('daluang_gurat', { a: items[cur].latin, pct });
    }
    $('gClear').onclick = () => { strokes = []; active.clear(); $('gStars').textContent = ''; draw(); };
    $('gGuide').onclick = e => { guide = !guide; e.currentTarget.setAttribute('aria-pressed', guide); draw(); };
    $('gCheck').onclick = check; $('gNext').onclick = () => pick(cur + 1);
    addEventListener('resize', () => { if (!$('p-gurat').classList.contains('hidden')) resize(); });
    chips(); pick(cur);
    return { resize, raf: 0 };
  })();

  // ================= 03 NGARAN =================
  const N = (() => {
    const inp = $('nIn'); inp.value = store.get('nama', inp.value);
    function render() {
      const toks = A.tokens(inp.value); store.set('nama', inp.value);
      $('nAks').textContent = toks.map(t => t.ch).join('') || '—'; $('nLat').textContent = inp.value.trim();
      $('nBd').innerHTML = toks.map(t => t.type === 'word' ? t.units.map(u => `<button class="u" type="button" title="${esc(u.parts.map(p => p.name).join(' + '))}"><span class="aks">${u.ch}</span><b>${esc(u.latin)}</b><small>${esc(u.parts.map(p => p.name.replace('ngalagena ', '').replace('aksara swara ', 'swara ')).join(' + '))}</small></button>`).join('')
        : t.type === 'num' ? `<span class="u"><span class="aks">${t.ch}</span><b>${t.latin}</b><small>angka diapit | |</small></span>` : '<span class="sp"></span>').join('');
    }
    inp.addEventListener('input', render);
    document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { inp.value = b.dataset.ex; render(); });
    $('nBd').onclick = e => {
      const b = e.target.closest('.u'); if (!b || !b.querySelector('b')) return; const w = A.units(b.querySelector('b').textContent)[0]; if (!w || w.raw != null) return;
      $('nMsg').innerHTML = `<b class="aks" style="font-size:1.6rem">${w.ch}</b> = ${w.parts.map(p => `<b>${esc(p.name)}</b>`).join(' + ')} → dibaca <span class="hand">${esc(w.latin)}</span>`;
    };
    $('nCopy').onclick = async () => { try { await navigator.clipboard.writeText($('nAks').textContent); toast('📋 Aksara disalin'); } catch (_) { toast('Tidak bisa menyalin di perangkat ini'); } };
    $('nPng').onclick = async () => {
      const txt = $('nAks').textContent, lat = inp.value.trim(); if (!lat) return toast('Tulis ngaran dulu');
      try { await Promise.all([document.fonts.load('500 80px "Noto Sans Sundanese"', txt), document.fonts.load('800 40px Fraunces'), document.fonts.load('italic 500 30px Fraunces'), document.fonts.load('500 14px "Plex Mono"')]); } catch (_) {}
      const Wd = 1200, Ht = 675, c = document.createElement('canvas'); c.width = Wd; c.height = Ht; const x = c.getContext('2d');
      x.fillStyle = '#f2ecdf'; x.fillRect(0, 0, Wd, Ht);
      // lembar daluang
      const g = x.createRadialGradient(420, 200, 50, 600, 340, 760); g.addColorStop(0, '#f6ecd3'); g.addColorStop(.6, '#eedfbd'); g.addColorStop(1, '#e2cc9f');
      x.fillStyle = '#22372b14'; x.fillRect(66, 70, Wd - 120, Ht - 128); x.fillStyle = g; x.fillRect(56, 58, Wd - 120, Ht - 128);
      for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(90,70,40,${Math.random() * .06})`; x.fillRect(56 + Math.random() * (Wd - 120), 58 + Math.random() * (Ht - 128), Math.random() * 28 + 2, 1); }
      x.fillStyle = 'rgba(214,190,140,.7)'; x.save(); x.translate(Wd / 2, 58); x.rotate(-.04); x.fillRect(-80, -16, 160, 32); x.restore();
      x.fillStyle = '#5a6a5e'; x.font = '500 16px "Plex Mono", monospace'; x.textAlign = 'left'; x.fillText('NGARAN ABDI · AKSARA SUNDA', 96, 116);
      x.textAlign = 'center'; x.fillStyle = '#2a2a1c'; let fs = 170; x.font = `500 ${fs}px "Noto Sans Sundanese"`;
      while (x.measureText(txt).width > Wd - 220 && fs > 50) { fs -= 6; x.font = `500 ${fs}px "Noto Sans Sundanese"`; }
      x.fillText(txt, Wd / 2, 330 + fs * .22);
      x.fillStyle = '#6b5a38'; x.font = 'italic 500 46px Fraunces, Georgia, serif'; x.fillText(lat, Wd / 2, 455);
      x.textAlign = 'left'; x.fillStyle = '#4f7048'; x.font = 'italic 500 26px Fraunces, Georgia, serif'; x.fillText('na', 96, 560);
      x.fillStyle = '#22372b'; x.font = '800 38px Fraunces, Georgia, serif'; x.fillText('Daluang', 130, 560);
      x.fillStyle = '#5a6a5e'; x.font = 'italic 500 20px Fraunces, Georgia, serif'; x.fillText('Ngaguratkeun gagasan, ngahirupkeun aksara.', 96, 590);
      x.textAlign = 'right'; x.font = '500 14px "Plex Mono", monospace'; x.fillText('PILAR · by : rizalabdurrahman05@guru.smp.belajar.id', Wd - 96, 590);
      const a = document.createElement('a'); a.download = 'ngaran-aksara-sunda-' + (lat.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'daluang') + '.png'; a.href = c.toDataURL('image/png'); a.click();
      track('daluang_kartu'); toast('🖼️ Kartu ngaran disimpan');
    };
    return { render };
  })();

  // ================= 04 MACA =================
  const Q = { n: 0, ok: 0, cur: null, pool: [], best: store.get('qBest', 0), total: 10 };
  function qStart() { Q.n = 0; Q.ok = 0; Q.pool = WORDS.slice().sort(() => Math.random() - .5).slice(0, Q.total); qNext(); }
  function qNext() {
    if (Q.n >= Q.total) {
      if (Q.ok > Q.best) { Q.best = Q.ok; store.set('qBest', Q.best); }
      $('qWord').innerHTML = '<span style="font:800 2.4rem var(--k-serif)">Réngsé!</span>'; $('qMean').textContent = `Benar ${Q.ok} dari ${Q.total}.`;
      $('qOpts').innerHTML = ''; $('qBd').classList.add('hidden'); $('qNext').classList.add('hidden'); qStamp(); track('daluang_maca', { ok: Q.ok }); return;
    }
    const [w, m] = Q.cur = Q.pool[Q.n];
    const others = WORDS.filter(x => x[0] !== w).sort((a, b) => Math.abs(a[0].length - w.length) - Math.abs(b[0].length - w.length) + (Math.random() - .5) * 3).slice(0, 3).map(x => x[0]);
    const opts = [w, ...others].sort(() => Math.random() - .5);
    $('qNo').textContent = `SOAL ${Q.n + 1} / ${Q.total}`; $('qWord').textContent = A.toAksara(w); $('qMean').textContent = ''; $('qBd').classList.add('hidden'); $('qNext').classList.add('hidden');
    $('qOpts').innerHTML = opts.map(o => `<button class="k-btn" data-o="${esc(o)}" type="button">${esc(o)}</button>`).join(''); qStamp();
  }
  function qStamp() { $('qScore').textContent = `${Q.ok} / ${Q.n}`; $('qBest').textContent = Q.best ? `Rekor: ${Q.best} / ${Q.total}` : ''; }
  $('qOpts').onclick = e => {
    const b = e.target.closest('[data-o]'); if (!b || $('qOpts').dataset.lock === '1') return;
    const [w, m] = Q.cur, right = b.dataset.o === w; $('qOpts').dataset.lock = '1';
    $('qOpts').querySelectorAll('[data-o]').forEach(x => { if (x.dataset.o === w) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
    if (right) Q.ok++; Q.n++; qStamp();
    $('qMean').innerHTML = (right ? '✔ Leres! ' : '✘ Lepat. ') + `<b>${esc(w)}</b> = ${esc(m)}`;
    $('qBd').innerHTML = A.units(w).map(u => `<span class="u"><span class="aks">${u.ch}</span><b>${esc(u.latin)}</b><small>${esc(u.parts.map(p => p.name.replace('ngalagena ', '').replace('aksara swara ', 'swara ')).join(' + '))}</small></span>`).join('');
    $('qBd').classList.remove('hidden'); $('qNext').classList.remove('hidden');
  };
  $('qNext').onclick = () => { $('qOpts').dataset.lock = '0'; qNext(); };
  $('qRestart').onclick = () => { $('qOpts').dataset.lock = '0'; qStart(); };

  // ---------- ngeunaan ----------
  $('aboutBtn').onclick = () => $('about').hidden = false;
  $('about').onclick = e => { if (e.target === $('about') || e.target.closest('[data-close]')) $('about').hidden = true; };
  addEventListener('keydown', e => { if (e.key === 'Escape') $('about').hidden = true; });

  // ---------- mulai ----------
  buildPalettes(); newChallenge(false); render(false); qStart();
  showTab(store.get('tab', 'rakit'));
  document.fonts?.ready?.then(() => { G.resize(); });
  window.PILAR_DALUANG = { A, sel, apply, render, T, G, N, Q, showTab };
})();
