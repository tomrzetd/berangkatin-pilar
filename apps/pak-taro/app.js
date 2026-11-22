/* Lab Misteri Pak Taro · alur 5 langkah tanpa dropdown: cukup ketuk.
   1 Kisah (dekomposisi) → 2 Percobaan (abstraksi) → 3 Irisan (pola) → 4 Kode rahasia (algoritma & biner) → 5 Lab acak (rancang sendiri) */
(function () {
  'use strict';
  const T = window.TARO, $ = id => document.getElementById(id), stage = $('stage'), panel = $('panel');
  const E = Object.fromEntries(T.EFFECTS.map(e => [e.id, e]));
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('taro_' + k)) ?? d; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem('taro_' + k, JSON.stringify(v)); } catch (_) {} } };
  const track = (n, d) => { try { window.PILAR_PULSE?.track?.(n, d || {}); } catch (_) {} };
  try { window.PILAR_PULSE?.setApp?.('pak-taro'); } catch (_) {}
  const done = new Set(store.get('done', []));
  let cur = 0, S = {};

  // ---------- suara kecil ----------
  let ac = null; const tone = (f, d = .09, type = 'sine', g = .05) => { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.value = f; v.gain.value = g; o.connect(v); v.connect(ac.destination); o.start(); v.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d); o.stop(ac.currentTime + d); } catch (_) {} };
  const yay = () => { tone(523); setTimeout(() => tone(659), 90); setTimeout(() => tone(784, .14), 180); }, nope = () => tone(196, .14, 'triangle', .04);
  let th = 0; function toast(t, bad) { const el = $('toast'); el.textContent = t; el.classList.toggle('bad', !!bad); el.classList.add('on'); clearTimeout(th); th = setTimeout(() => el.classList.remove('on'), 2200); }

  // ---------- gambar ----------
  function flower(set = [], cls = '') {
    const petals = r => Array.from({ length: 8 }, (_, k) => `<ellipse class="petal" cx="0" cy="${-r}" rx="${r * .5}" ry="${r}" transform="rotate(${k * 45})"/>`).join('');
    return `<svg class="flower ${set.map(e => 'f-' + e).join(' ')} ${cls}" viewBox="0 0 120 200" aria-hidden="true">
      <ellipse class="wet" cx="60" cy="164" rx="34" ry="6"/>
      <path class="stem straight" d="M60 160 L60 70"/><path class="stem wavy" d="M60 160 C44 146 76 132 60 118 S44 90 60 70"/>
      <path class="leaf l" d="M58 124 C40 122 28 110 24 98 C38 98 52 106 58 124Z"/><path class="leaf r" d="M62 112 C80 110 92 98 96 86 C82 86 68 94 62 112Z"/>
      <g transform="translate(60 58)"><g>${petals(22)}</g><g class="l2" transform="rotate(22.5)">${petals(15)}</g><circle class="core" r="11"/><circle class="spark" r="40"/></g>
      <path class="pot" d="M34 166 H86 L80 198 H40Z"/><rect class="rim" x="30" y="158" width="60" height="10" rx="3"/><ellipse class="soil" cx="60" cy="160" rx="27" ry="3"/>
    </svg>`;
  }
  const setFlower = (el, set, anim) => { const svg = el.querySelector('svg.flower'); if (!svg) return; for (const e of T.EFFECTS) svg.classList.toggle('f-' + e.id, set.includes(e.id)); if (anim) { svg.classList.remove('watering', 'sparkle'); void svg.getBBox?.(); svg.classList.add('watering'); if (set.length) svg.classList.add('sparkle'); } };
  function glass(g, extra = '', sub = '') {
    return `<button class="glass ${extra}" data-g="${g}" type="button" aria-label="Gelas ${g}"><svg viewBox="0 0 40 56"><path class="gl" d="M6 4 H34 L31 50 Q30 54 26 54 H14 Q10 54 9 50Z"/><path class="lq" d="M8.2 22 H31.8 L30 49 Q29.6 51.5 26 51.5 H14 Q10.4 51.5 10 49Z"/><rect class="shine" x="11" y="8" width="3" height="38" rx="1.5"/></svg><span class="lbl">${g}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</button>`;
  }
  const effChip = (id, extra = '') => `<button class="chip ${extra}" data-e="${id}" type="button"><span class="i">${E[id].icon}</span>${E[id].name}</button>`;
  const iconsOf = set => set.length ? set.map(e => E[e].icon).join(' ') : '∅';

  // ================= langkah =================
  const STEPS = [];

  // ----- 1 · KISAH -----
  STEPS.push({
    id: 'kisah', icon: '👨‍🌾', short: 'Kisah Pak Taro', kick: 'Pahami masalahnya',
    title: 'Lima pupuk ajaib, <i>satu air biasa</i>',
    story: 'Pak Taro, petani bunga, menemukan <b>lima pupuk ajaib</b> dan menyimpannya di gelas A–F. Ia lupa mencatat isinya, padahal <b>satu gelas hanya berisi air</b>. Kenali dulu apa saja yang bisa dilakukan pupuk: ketuk kartu khasiat dan lihat bunganya berubah.',
    ct: { tags: ['Dekomposisi'], t: 'Masalah besar ("gelas mana berisi apa?") dipecah jadi bagian kecil: ada <b>5 khasiat</b> yang bisa diamati dan <b>1 gelas tanpa khasiat</b>. Mengenali bagian-bagian ini adalah langkah pertama memecahkan masalah.' },
    init: () => ({ seen: [], on: [] }),
    missions: [{ t: 'Ketuk <b>kelima</b> kartu khasiat untuk melihat perubahannya.', check: s => s.seen.length >= 5, state: s => `dicoba ${s.seen.length}/5` }],
    render(s) {
      stage.querySelector('.scene')?.remove();
      const sc = el(`<div class="scene s-kisah" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto">
        <div class="bubble" style="grid-column:1/3">👨‍🌾 <b>Pak Taro:</b> "Aduh, catatanku hilang! Enam gelas ini isinya pupuk, tapi <b>satu cuma air</b>. Bantu aku menemukannya tanpa mencicipi, ya!"</div>
        <div style="display:grid;grid-template-rows:minmax(0,1fr) auto;gap:6px;min-height:0"><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:clamp(4px,1cqw,14px);align-items:end;padding:0 4%">${T.GLASSES.map(g => glass(g)).join('')}</div><div class="shelf"></div></div>
        <div class="fl" id="demo" style="justify-self:center;grid-row:2/4;grid-column:2">${flower(s.on)}</div>
        <div class="chips" style="justify-content:flex-start">${T.EFFECTS.map(e => effChip(e.id, s.on.includes(e.id) ? 'on' : '')).join('')}</div>
      </div>`);
      stage.appendChild(sc);
      sc.onclick = ev => {
        const c = ev.target.closest('[data-e]'); if (c) { const id = c.dataset.e; s.on = s.on.includes(id) ? s.on.filter(x => x !== id) : [...s.on, id]; if (!s.seen.includes(id)) s.seen.push(id); c.classList.toggle('on'); setFlower($('demo'), s.on, true); tone(440 + s.on.length * 80); check(); }
        const g = ev.target.closest('[data-g]'); if (g) { g.querySelector('svg').parentElement.classList.remove('pour'); void g.offsetWidth; g.classList.add('pour'); toast(`Gelas ${g.dataset.g}: isinya masih rahasia 🤫`); }
      };
    },
  });

  // ----- 2 · PERCOBAAN -----
  STEPS.push({
    id: 'percobaan', icon: '💧', short: 'Tiga Percobaan', kick: 'Amati & catat',
    title: 'Siram, amati, <i>catat jadi simbol</i>',
    story: 'Pak Taro mencampur <b>tiga gelas</b> untuk setiap pot, sama seperti di buku: <b>A+B+C</b>, <b>A+D+E</b>, <b>C+D+F</b>. Siram tiap pot, bandingkan dengan bunga awal, lalu tandai perubahan yang kamu lihat.',
    ct: { tags: ['Abstraksi'], t: 'Gambar bunga diubah jadi <b>himpunan simbol</b>, misalnya {🌸 🌿 🤍}. Detail yang tidak penting (warna pot, posisi daun) diabaikan. Dengan simbol, masalah bisa dihitung, bukan sekadar ditebak.' },
    init: () => ({ watered: [false, false, false], mark: [[], [], []], ok: [false, false, false] }),
    missions: [{ t: 'Siram ketiga pot dan <b>tandai semua perubahan</b> dengan benar.', check: s => s.ok.every(Boolean), state: s => `tercatat ${s.ok.filter(Boolean).length}/3 percobaan` }],
    render(s) {
      stage.querySelector('.scene')?.remove();
      const truth = T.BOOK.experiments.map(m => T.effectsOf(m, T.BOOK.map));
      const sc = el(`<div class="scene s-percobaan" style="grid-template-columns:minmax(0,.55fr) repeat(3,minmax(0,1fr));grid-template-rows:minmax(0,1fr) auto">
        <div class="potcard base" style="opacity:.85"><span class="label">bunga awal</span><div class="fl">${flower([])}</div><span class="mix">tanpa pupuk</span><span></span></div>
        ${[0, 1, 2].map(k => `<div class="potcard${s.ok[k] ? ' ok' : ''}" data-k="${k}"><h3>Percobaan ${k + 1}</h3><div class="fl" id="pot${k}">${flower(s.watered[k] && s.fresh !== k ? truth[k] : [])}</div>
          <span class="mix">${T.BOOK.experiments[k].join(' + ')}</span>
          ${s.watered[k] ? `<div class="chips" data-k="${k}">${T.EFFECTS.map(e => `<button class="chip${s.mark[k].includes(e.id) ? (s.ok[k] ? ' ok' : ' on') : ''}" data-e="${e.id}" data-k="${k}" type="button" title="${e.name}" style="padding:0 .5em"><span class="i">${e.icon}</span></button>`).join('')}</div>` : `<button class="btn pri" data-water="${k}" type="button">💧 Siram</button>`}
        </div>`).join('')}
        <div class="chips" style="grid-column:1/5">${T.EFFECTS.map(e => `<span class="chip empty" style="cursor:default">${e.icon} ${e.short}</span>`).join('')}</div>
      </div>`);
      stage.appendChild(sc);
      sc.onclick = ev => {
        const w = ev.target.closest('[data-water]'); if (w) { const k = +w.dataset.water; s.watered[k] = true; s.fresh = k; render(); s.fresh = null; setTimeout(() => setFlower($('pot' + k), truth[k], true), 60); tone(330); return; }
        const c = ev.target.closest('[data-e][data-k]'); if (!c) return; const k = +c.dataset.k, id = c.dataset.e; if (s.ok[k]) return;
        if (!truth[k].includes(id)) { c.classList.add('no'); nope(); toast(`Bandingkan lagi dengan bunga awal: ${E[id].name.toLowerCase()} tidak terjadi`, true); setTimeout(() => c.classList.remove('no'), 450); return; }
        s.mark[k] = s.mark[k].includes(id) ? s.mark[k].filter(x => x !== id) : [...s.mark[k], id];
        if (T.sameSet(s.mark[k], truth[k])) { s.ok[k] = true; yay(); toast(`Percobaan ${k + 1}: ${truth[k].length} perubahan {${iconsOf(truth[k])}}`); }
        render(); check();
      };
    },
  });

  // ----- 3 · IRISAN -----
  const VC = { P1: { x: 330, y: 250, col: '#e8578b' }, P2: { x: 570, y: 250, col: '#2f8a4e' }, P3: { x: 450, y: 450, col: '#3b82f6' } };
  const SPOT = { A: [450, 175], B: [215, 210], C: [345, 420], D: [555, 420], E: [690, 210], F: [450, 585] };
  STEPS.push({
    id: 'irisan', icon: '🔍', short: 'Irisan Himpunan', kick: 'Cari pola',
    title: 'Yang sama di dua percobaan = <i>gelas yang sama</i>',
    story: 'Gelas A ikut di Percobaan 1 dan 2, jadi khasiat A pasti muncul <b>di keduanya</b>. Itulah <b>irisan</b> himpunan. Jawab pertanyaan detektif satu per satu dengan mengetuk simbol. Kalau irisannya kosong, artinya…?',
    ct: { tags: ['Pengenalan pola', 'Himpunan'], t: 'Pola: perubahan yang muncul di dua percobaan berasal dari gelas yang ada di keduanya (<b>irisan</b>). Irisan P2 ∩ P3 <b>kosong</b>, padahal D ada di keduanya, jadi D tidak berkhasiat: <b>air</b>. Sisa khasiat ditemukan dengan <b>pengurangan</b> (komplemen).' },
    init: () => ({ i: 0, solved: {} }),
    missions: [{ t: 'Ungkap isi <b>keenam gelas</b>.', check: s => Object.keys(s.solved).length === 6, state: s => `terungkap ${Object.keys(s.solved).length}/6` }],
    render(s) {
      stage.querySelector('.scene')?.remove();
      const R = T.BOOK.experiments.map(m => T.effectsOf(m, T.BOOK.map)), steps = T.bookSteps(), q = steps[s.i];
      const hi = q ? q.from : [];
      const circ = (k, i) => { const v = VC[k]; return `<circle class="c${hi.includes(k) ? ' hi' : ''}" cx="${v.x}" cy="${v.y}" r="190" fill="${v.col}" stroke="${v.col}"/>`; };
      const lab = (k, x, y, a) => `<text x="${x}" y="${y}" text-anchor="${a}" fill="${VC[k].col}" font-size="30">${k} {${iconsOf(R[+k[1] - 1])}}</text>`;
      const tok = g => { const [x, y] = SPOT[g], sv = s.solved[g]; return `<g><circle cx="${x}" cy="${y}" r="36" fill="var(--card)" stroke="${q && q.glass === g ? '#e0a526' : '#9fb7a6'}" stroke-width="${q && q.glass === g ? 6 : 2.5}"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-size="32" fill="currentColor">${g}</text>${sv ? `<text x="${x + 34}" y="${y - 22}" text-anchor="middle" font-size="30">${sv === 'water' ? '💧' : E[sv].icon}</text>` : ''}</g>`; };
      let question = '🎉 Semua gelas terungkap! D = 💧 air. Tekan <b>Lanjut</b>.';
      if (q) question = q.rule === 'irisan' ? `Gelas <b>${q.glass}</b> ada di <b>${q.from[0]}</b> dan <b>${q.from[1]}</b>. Perubahan apa yang ada di ${q.from[0]} <b>dan</b> ${q.from[1]}?`
        : `Di <b>${q.from[0]}</b>, khasiat gelas lain sudah diketahui. Perubahan mana yang <b>tersisa</b> untuk gelas <b>${q.glass}</b>?`;
      const sc = el(`<div class="scene" style="grid-template-rows:auto minmax(0,1fr) auto">
        <div class="bubble">🕵️ ${question}</div>
        <svg class="venn" viewBox="40 10 820 700" style="color:var(--ink)">${['P1', 'P2', 'P3'].map(circ).join('')}${lab('P1', 70, 70, 'start')}${lab('P2', 830, 70, 'end')}${lab('P3', 450, 655, 'middle')}${T.GLASSES.map(tok).join('')}</svg>
        <div class="chips">${q ? T.EFFECTS.map(e => effChip(e.id)).join('') + '<button class="chip empty" data-e="none" type="button"><span class="i">∅</span>Tidak ada (kosong)</button>' : ''}</div>
      </div>`);
      stage.appendChild(sc);
      sc.onclick = ev => {
        const c = ev.target.closest('[data-e]'); if (!c || !q) return; const id = c.dataset.e, ans = q.answer[0] || 'none';
        if (id !== ans) { c.classList.add('no'); nope(); toast(q.rule === 'irisan' ? `Cek lagi: simbol itu tidak ada di ${q.from.join(' dan ')}` : 'Coret dulu khasiat gelas yang sudah diketahui', true); setTimeout(() => c.classList.remove('no'), 450); return; }
        s.solved[q.glass] = ans === 'none' ? 'water' : ans; s.i++; yay();
        toast(ans === 'none' ? '💧 Irisan kosong → gelas D cuma AIR!' : `Gelas ${q.glass} = ${E[ans].icon} ${E[ans].name}`); render(); check();
      };
    },
  });

  // ----- 4 · KODE RAHASIA -----
  STEPS.push({
    id: 'kode', icon: '🔢', short: 'Kode Rahasia', kick: 'Algoritma & biner',
    title: 'Setiap gelas punya <i>kode biner</i>',
    story: 'Tulis <b>1</b> bila gelas ikut di percobaan dan <b>0</b> bila tidak. Hasilnya, tiap gelas punya kode 3 bit yang <b>berbeda-beda</b>. Itu sebabnya tiga percobaan sudah cukup! Buktikan: siram pot baru dengan <b>gelas D saja</b>.',
    ct: { tags: ['Algoritma', 'Bilangan biner'], t: '3 percobaan = 3 bit → ada 2³ = 8 kode (000–111). Enam gelas diberi kode unik, jadi setiap gelas "terbaca" dari pola perubahannya. Langkah di kanan adalah <b>algoritma</b>: urutan yang bisa dipakai untuk soal serupa mana pun.' },
    init: () => ({ proved: false, quiz: 0, q: ['101', '011'] }),
    missions: [
      { t: 'Buktikan dugaanmu: siram pot dengan <b>gelas D saja</b>.', check: s => s.proved, state: () => 'Tekan 💧 Siram D saja.' },
      { t: 'Baca kode: ketuk gelas yang kodenya <b class="code"></b>.', check: s => s.quiz >= 2, state: s => `kode ditebak ${s.quiz}/2` },
    ],
    render(s) {
      stage.querySelector('.scene')?.remove();
      const C = T.codes(T.BOOK.experiments), want = s.q[s.quiz];
      const sc = el(`<div class="scene s-kode" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto">
        <div style="display:grid;place-items:center;min-height:0"><table class="tbl"><tr><th></th><th>P1</th><th>P2</th><th>P3</th><th>kode</th><th>isi</th></tr>
          ${T.GLASSES.map(g => `<tr data-g="${g}" style="cursor:pointer"><td class="g">${g}</td>${C[g].split('').map(b => `<td class="${b === '1' ? 'one' : ''}">${b}</td>`).join('')}<td class="code">${C[g]}</td><td class="g">${T.BOOK.map[g] === 'water' ? '💧' : E[T.BOOK.map[g]].icon}</td></tr>`).join('')}</table></div>
        <div style="display:grid;grid-template-rows:auto minmax(0,1fr);gap:8px;min-height:0">
          <div class="algo"><div><span><b>Siram</b> tiap campuran, catat perubahan sebagai himpunan.</span></div><div><span>Cari <b>irisan</b> dua percobaan yang berbagi satu gelas.</span></div><div><span>Irisan <b>kosong</b> → gelas itu air.</span></div><div><span><b>Kurangi</b> khasiat yang sudah diketahui untuk gelas sisanya.</span></div></div>
          <div class="potcard${s.proved ? ' ok' : ''}" style="grid-template-rows:auto minmax(0,1fr) auto"><span class="label">pot bukti · gelas D saja</span><div class="fl" id="proofPot">${flower([])}</div>${s.proved ? '<b style="color:var(--pri)">Tidak berubah sama sekali → D = 💧 air ✓</b>' : '<button class="btn pri" data-proof type="button">💧 Siram D saja</button>'}</div>
        </div>
        <div class="bubble" style="grid-column:1/3">${s.proved && s.quiz < 2 ? `🔢 Ketuk baris gelas yang kodenya <b style="font-family:var(--mono);letter-spacing:.15em">${want}</b>` : s.quiz >= 2 ? '🎉 Kamu bisa membaca kode biner gelas! Lanjut ke Lab Acak.' : '🧪 Dugaan harus dibuktikan. Ilmuwan selalu menguji kesimpulannya.'}</div>
      </div>`);
      stage.appendChild(sc);
      sc.onclick = ev => {
        if (ev.target.closest('[data-proof]')) { s.proved = true; tone(330); render(); setTimeout(() => { setFlower($('proofPot'), [], true); yay(); toast('Bunga tetap sama → terbukti D berisi air'); }, 60); check(); return; }
        const r = ev.target.closest('tr[data-g]'); if (!r || !s.proved || s.quiz >= 2) return;
        if (C[r.dataset.g] === want) { s.quiz++; yay(); toast(`Benar! ${want} = gelas ${r.dataset.g}`); render(); check(); } else { nope(); toast(`Gelas ${r.dataset.g} kodenya ${C[r.dataset.g]}, bukan ${want}`, true); }
      };
    },
  });

  // ----- 5 · LAB ACAK -----
  function newLab(s) { s.map = T.randomMap(); s.pots = [[], [], []]; s.res = null; s.tgt = 0; s.won = false; s.guess = null; }
  STEPS.push({
    id: 'lab', icon: '🎲', short: 'Lab Acak', kick: 'Rancang sendiri',
    title: 'Giliranmu jadi <i>Pak Taro</i>',
    story: 'Isi gelas sekarang <b>diacak</b>. Rancang sendiri paling banyak <b>3 percobaan</b>: pilih pot, lalu ketuk gelas untuk dimasukkan. Perhatikan kode tiap gelas. Kalau ada dua gelas berkode sama, keduanya tidak bisa dibedakan! Siram, lalu ketuk gelas yang kamu yakini berisi air.',
    ct: { tags: ['Algoritma', 'Efisiensi'], t: 'Diskusikan dengan teman: <b>cara siapa paling hemat?</b> Bisakah air ditemukan dengan 2 percobaan saja? Dengan 2 bit hanya ada 4 kode (00, 01, 10, 11), padahal gelasnya 6. Ini latihan merancang algoritma yang efisien.' },
    init: () => { const s = {}; newLab(s); s.wins = 0; return s; },
    missions: [
      { t: 'Temukan gelas <b>air</b> dengan bukti yang cukup (≤ 3 percobaan).', check: s => s.won, state: s => s.res ? `kemungkinan susunan tersisa: ${s.res.d.maps}` : 'Rancang percobaan, lalu siram.' },
      { t: 'Rancang percobaan yang mengungkap <b>semua</b> gelas sekaligus (setiap gelas berkode beda).', check: s => s.res && s.res.d.maps === 1, state: s => s.res ? `gelas terungkap ${Object.keys(s.res.d.known).length}/6` : '' },
    ],
    controls: [{ label: '🎲 Susunan baru', on: s => { newLab(s); } }],
    render(s) {
      stage.querySelector('.scene')?.remove();
      const C = T.codes(s.pots), dup = {}; Object.values(C).forEach(c => dup[c] = (dup[c] || 0) + 1);
      const sc = el(`<div class="scene s-lab" style="grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,.9fr);grid-template-rows:auto minmax(0,1fr) auto">
        <div style="grid-column:1/4;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:4px"><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:clamp(4px,1cqw,14px);align-items:end;padding:0 6%">${T.GLASSES.map(g => glass(g, (s.pots[s.tgt].includes(g) ? 'sel ' : '') + (s.guess === g ? (s.map[g] === 'water' ? 'water' : '') : ''), C[g])).join('')}</div><div class="shelf"></div></div>
        <div class="codes" style="grid-row:1/4;grid-column:4;display:grid;place-items:center;min-height:0"><table class="tbl" style="font-size:clamp(12px,2.2cqh,22px)"><tr><th></th><th>P1</th><th>P2</th><th>P3</th><th>kode</th></tr>${T.GLASSES.map(g => `<tr class="${dup[C[g]] > 1 ? 'hl' : ''}"><td class="g">${g}</td>${C[g].split('').map(b => `<td class="${b === '1' ? 'one' : ''}">${b}</td>`).join('')}<td class="code">${C[g]}</td></tr>`).join('')}</table></div>
        ${[0, 1, 2].map(k => `<div class="potcard${s.tgt === k ? ' tgt' : ''}" data-pot="${k}"><h3>Pot ${k + 1}</h3><div class="fl" id="lp${k}">${flower(s.res && !s.fresh ? s.res.r[k] : [])}</div><span class="mix">${s.pots[k].join(' + ') || '— kosong —'}</span><span class="mix" style="font-size:1.1em">${s.res ? '{' + iconsOf(s.res.r[k]) + '}' : (s.tgt === k ? '👆 ketuk gelas' : 'ketuk untuk memilih')}</span></div>`).join('')}
        <div class="chips" style="grid-column:1/4">${s.res ? (s.won ? `<span class="chip ok">🎉 Air = gelas ${T.GLASSES.find(g => s.map[g] === 'water')}</span><button class="btn pri" data-new type="button">🎲 Main lagi</button>` : '<span class="chip empty">💧 Ketuk gelas yang kamu yakini berisi air</span><button class="btn sm" data-reset type="button">↺ Ubah percobaan</button>') : `<button class="btn pri" data-run type="button" ${s.pots.some(p => p.length) ? '' : 'disabled'}>💧 Siram semua pot</button>`}${!s.res && Object.values(dup).some(n => n > 1) ? '<span class="chip empty" style="border-color:var(--gold)">⚠️ ada gelas berkode kembar</span>' : ''}</div>
      </div>`);
      stage.appendChild(sc);
      sc.onclick = ev => {
        if (ev.target.closest('[data-new]')) { newLab(s); render(); return; }
        if (ev.target.closest('[data-reset]')) { s.res = null; s.guess = null; render(); return; }
        if (ev.target.closest('[data-run]')) { const r = s.pots.map(m => T.effectsOf(m, s.map)); s.res = { r, d: T.deduce(s.pots, r) }; tone(330); s.fresh = true; render(); s.fresh = false; setTimeout(() => s.res.r.forEach((x, k) => setFlower($('lp' + k), x, true)), 60); check(); return; }
        const p = ev.target.closest('[data-pot]'); if (p && !s.res) { s.tgt = +p.dataset.pot; render(); return; }
        const g = ev.target.closest('[data-g]'); if (!g) return; const G = g.dataset.g;
        if (!s.res) { const P = s.pots[s.tgt]; s.pots[s.tgt] = P.includes(G) ? P.filter(x => x !== G) : [...P, G].sort(); tone(500); render(); return; }
        if (s.won) return; s.guess = G;
        const d = s.res.d, isW = s.map[G] === 'water';
        if (isW && d.water === G) { s.won = true; s.wins++; yay(); toast(`Tepat dan terbukti! Gelas ${G} = 💧 air`); track('taro_lab', { exp: s.pots.filter(p => p.length).length, all: d.maps === 1 }); }
        else if (isW) { tone(380); toast(`Tebakanmu benar, tapi buktinya belum cukup: ${d.waterCandidates.join('/')} masih mungkin`, true); }
        else { nope(); toast(d.waterCandidates.includes(G) ? `Belum terbukti, dan ternyata ${G} bukan air` : `Bukan: percobaanmu sudah menunjukkan ${G} bukan air`, true); }
        render(); check();
      };
    },
  });

  // ================= mesin langkah =================
  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function render() { STEPS[cur].render(S[STEPS[cur].id]); }
  function check() {
    const st = STEPS[cur], s = S[st.id], M = st.missions; let adv = false;
    while (s.mi < M.length && M[s.mi].check(s)) { s.mi++; adv = true; }
    if (adv && s.mi >= M.length && !done.has(st.id)) { done.add(st.id); store.set('done', [...done]); dots(); toast('🎉 Langkah ini beres! Tekan Lanjut →'); track('taro_langkah', { id: st.id }); }
    missionUI(); fit();
  }
  function missionUI() {
    const st = STEPS[cur], s = S[st.id], M = st.missions, fin = s.mi >= M.length;
    $('pMission').classList.toggle('done', fin); $('mStep').textContent = fin ? '✓ beres' : `${s.mi + 1} / ${M.length}`;
    $('mText').innerHTML = fin ? 'Langkah ini beres. Tekan <b>Lanjut →</b>.' : M[s.mi].t.replace('<b class="code"></b>', `<b style="font-family:var(--mono)">${s.q ? s.q[s.quiz] || '' : ''}</b>`);
    $('mState').textContent = fin ? '' : (M[s.mi].state?.(s) || '');
  }
  function fit() {
    const ok = () => panel.scrollHeight <= panel.clientHeight + 1; let f = 1.45; panel.style.setProperty('--fs', f);
    while (!ok() && f > .68) { f -= .03; panel.style.setProperty('--fs', f.toFixed(2)); }
  }
  function dots() { $('dots').innerHTML = STEPS.map((st, i) => `<button class="dot${i === cur ? ' cur' : ''}${done.has(st.id) ? ' done' : ''}" data-go="${i}" type="button" title="${st.short}"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="ic">${st.icon}</span><span class="t">${st.short}</span></button>`).join(''); }
  function go(i) {
    if (i < 0 || i >= STEPS.length) return; cur = i; store.set('cur', i); const st = STEPS[i];
    S[st.id] ||= Object.assign({ mi: 0 }, st.init());
    $('pKick').textContent = `Langkah ${i + 1} / ${STEPS.length} · ${st.kick}`; $('pTitle').innerHTML = st.title; $('pStory').innerHTML = st.story;
    $('ctTags').innerHTML = ['Dekomposisi', 'Abstraksi', 'Pengenalan pola', 'Algoritma'].map(t => `<span class="tag${st.ct.tags.includes(t) ? ' on' : ''}">${t}</span>`).join('') + st.ct.tags.filter(t => !['Dekomposisi', 'Abstraksi', 'Pengenalan pola', 'Algoritma'].includes(t)).map(t => `<span class="tag on">${t}</span>`).join('');
    $('ctText').innerHTML = st.ct.t; $('pCt').open = !(innerWidth < 900 && innerHeight > innerWidth);
    $('pCtrls').innerHTML = (st.controls || []).map((c, k) => `<button class="btn" data-c="${k}" type="button">${c.label}</button>`).join('');
    $('next').textContent = i === STEPS.length - 1 ? 'Selesai ✓' : 'Lanjut →'; $('prev').disabled = i === 0;
    dots(); render(); check(); track('taro_buka', { id: st.id });
  }
  $('pCtrls').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; STEPS[cur].controls[b.dataset.c].on(S[STEPS[cur].id]); render(); check(); };
  $('dots').onclick = e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); };
  $('prev').onclick = () => go(cur - 1); $('next').onclick = () => cur < STEPS.length - 1 ? go(cur + 1) : toast('🌼 Terima kasih sudah membantu Pak Taro!');
  addEventListener('resize', () => { clearTimeout(fit.h); fit.h = setTimeout(fit, 80); });
  addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); });
  document.fonts?.ready?.then(fit);
  window.PILAR_TARO = { go, S, get cur() { return cur; }, STEPS };
  go(Math.min(STEPS.length - 1, store.get('cur', 0)));
})();
