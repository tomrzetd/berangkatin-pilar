/* na Daluang · mesin Aksara Sunda (Unicode Sundanese U+1B80–1BBF)
   Mengikuti kaidah Aksara Sunda Baku: aksara ngalagena membawa vokal "a"; rarangkén mengubah/menambah bunyi.
   Latin → aksara (toAksara), aksara → Latin (toLatin), dan pemecah unit (units) untuk mode Rakit.
   Dapat dipakai di browser (window.DALUANG_AKSARA) maupun Node (test-aksara.js). */
(function (root, factory) {
  const A = factory();
  if (typeof module === 'object' && module.exports) module.exports = A; else root.DALUANG_AKSARA = A;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const C = s => String.fromCodePoint(s);
  // ---------- inventaris ----------
  const NGALAGENA = [ // [latin, kode, pokok?]
    ['ka', 0x1B8A, 1], ['ga', 0x1B8C, 1], ['nga', 0x1B8D, 1], ['ca', 0x1B8E, 1], ['ja', 0x1B8F, 1], ['nya', 0x1B91, 1],
    ['ta', 0x1B92, 1], ['da', 0x1B93, 1], ['na', 0x1B94, 1], ['pa', 0x1B95, 1], ['ba', 0x1B98, 1], ['ma', 0x1B99, 1],
    ['ya', 0x1B9A, 1], ['ra', 0x1B9B, 1], ['la', 0x1B9C, 1], ['wa', 0x1B9D, 1], ['sa', 0x1B9E, 1], ['ha', 0x1BA0, 1],
    ['fa', 0x1B96, 0], ['va', 0x1B97, 0], ['qa', 0x1B8B, 0], ['xa', 0x1B9F, 0], ['za', 0x1B90, 0], ['kha', 0x1BAE, 0], ['sya', 0x1BAF, 0],
  ].map(([l, c, p]) => ({ latin: l, cons: l.slice(0, -1), ch: C(c), pokok: !!p }));
  const SWARA = [['a', 0x1B83], ['é', 0x1B86], ['i', 0x1B84], ['o', 0x1B87], ['u', 0x1B85], ['e', 0x1B88], ['eu', 0x1B89]]
    .map(([l, c]) => ({ latin: l, ch: C(c) }));
  // rarangkén: grup = vokal | pamaeh | medial | final ; pos = letak tulisan
  const RARANGKEN = [
    { id: 'panghulu', ch: C(0x1BA4), grup: 'vokal', v: 'i', pos: 'atas', fungsi: 'a → i' },
    { id: 'panyuku', ch: C(0x1BA5), grup: 'vokal', v: 'u', pos: 'bawah', fungsi: 'a → u' },
    { id: 'panéléng', ch: C(0x1BA6), grup: 'vokal', v: 'é', pos: 'kiri', fungsi: 'a → é' },
    { id: 'panolong', ch: C(0x1BA7), grup: 'vokal', v: 'o', pos: 'kanan', fungsi: 'a → o' },
    { id: 'pamepet', ch: C(0x1BA8), grup: 'vokal', v: 'e', pos: 'atas', fungsi: 'a → e (pepet)' },
    { id: 'paneuleung', ch: C(0x1BA9), grup: 'vokal', v: 'eu', pos: 'atas', fungsi: 'a → eu' },
    { id: 'pamaéh', ch: C(0x1BAA), grup: 'pamaeh', v: '', pos: 'kanan', fungsi: 'mematikan vokal: ka → k' },
    { id: 'pamingkal', ch: C(0x1BA1), grup: 'medial', m: 'y', pos: 'bawah', fungsi: 'sisipan -y- : ka → kya' },
    { id: 'panyakra', ch: C(0x1BA2), grup: 'medial', m: 'r', pos: 'bawah', fungsi: 'sisipan -r- : ka → kra' },
    { id: 'panyiku', ch: C(0x1BA3), grup: 'medial', m: 'l', pos: 'bawah', fungsi: 'sisipan -l- : ka → kla' },
    { id: 'panyecek', ch: C(0x1B80), grup: 'final', f: 'ng', pos: 'atas', fungsi: 'tambah -ng : ka → kang' },
    { id: 'panglayar', ch: C(0x1B81), grup: 'final', f: 'r', pos: 'atas', fungsi: 'tambah -r : ka → kar' },
    { id: 'pangwisad', ch: C(0x1B82), grup: 'final', f: 'h', pos: 'kanan', fungsi: 'tambah -h : ka → kah' },
  ];
  const ANGKA = '0123456789'.split('').map((d, i) => ({ latin: d, ch: C(0x1BB0 + i) }));

  const byCons = {}; NGALAGENA.forEach(n => byCons[n.cons] = n);
  const bySwara = {}; SWARA.forEach(s => bySwara[s.latin] = s);
  const R = {}; RARANGKEN.forEach(r => R[r.id] = r);
  const VSIGN = { i: R['panghulu'], u: R['panyuku'], 'é': R['panéléng'], o: R['panolong'], e: R['pamepet'], eu: R['paneuleung'] };
  const MEDIAL = { y: R['pamingkal'], r: R['panyakra'], l: R['panyiku'] };
  const FINAL = { ng: R['panyecek'], r: R['panglayar'], h: R['pangwisad'] };
  const PAMAEH = R['pamaéh'].ch;

  // ---------- Latin → fonem ----------
  const VOWELS = ['eu', 'a', 'i', 'u', 'é', 'o', 'e'];
  const CONS = ['kh', 'sy', 'ng', 'ny', 'k', 'g', 'c', 'j', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'w', 's', 'h', 'f', 'v', 'q', 'x', 'z'];
  function norm(s) {
    return s.toLowerCase().normalize('NFC').replace(/[èêë]/g, 'é').replace(/[àáâä]/g, 'a').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[’'`]/g, '');
  }
  function phonemes(word) { // word: huruf latin saja
    const out = []; let i = 0;
    while (i < word.length) {
      let hit = null;
      for (const v of VOWELS) if (word.startsWith(v, i)) { hit = { t: 'V', s: v }; break; }
      if (!hit) for (const c of CONS) if (word.startsWith(c, i)) { hit = { t: 'C', s: c }; break; }
      if (!hit) { out.push({ t: '?', s: word[i] }); i++; continue; }
      out.push(hit); i += hit.s.length;
    }
    return out;
  }
  // konsonan yang boleh mendahului sisipan y/r/l (bukan nasal velar / final khas)
  const CAN_MEDIAL = c => !['ng', 'r', 'h', 'y', 'w', 'l', 'ny'].includes(c);

  /* Satu "unit" = satu gugus aksara: {base, medial, vokal, final, pamaeh, latin, ch, parts[]} */
  function syllabify(word) {
    const P = phonemes(word), U = []; let i = 0;
    const isV = k => P[k] && P[k].t === 'V', isC = k => P[k] && P[k].t === 'C';
    while (i < P.length) {
      const p = P[i];
      if (p.t === '?') { U.push({ raw: p.s, latin: p.s, ch: p.s, parts: [] }); i++; continue; }
      const u = { parts: [] };
      if (p.t === 'V') { u.swara = p.s; i++; }
      else {
        u.base = p.s; i++;
        if (isC(i) && ['y', 'r', 'l'].includes(P[i].s) && isV(i + 1) && CAN_MEDIAL(u.base)) { u.medial = P[i].s; i++; }
        if (isV(i)) { u.vokal = P[i].s; i++; } else { u.pamaeh = true; }
      }
      // konsonan penutup -ng / -r / -h jadi rarangkén bila tidak diikuti vokal (bukan awal suku berikutnya)
      if (!u.pamaeh && isC(i) && FINAL[P[i].s] && !isV(i + 1)) {
        // -r atau -h yang diikuti y/r/l+vokal tetap penutup; -ng sebelum vokal = awal suku berikutnya (sudah dicek)
        u.final = P[i].s; i++;
      }
      U.push(u);
    }
    return U.map(build);
  }
  function build(u) {
    if (u.raw != null) return u;
    let ch = '', latin = '', parts = [];
    if (u.swara != null) { const s = bySwara[u.swara]; ch = s.ch; latin = u.swara; parts.push({ k: 'swara', ch: s.ch, name: 'aksara swara ' + u.swara }); }
    else {
      const n = byCons[u.base]; ch = n.ch; latin = u.base; parts.push({ k: 'base', ch: n.ch, name: 'ngalagena ' + n.latin });
      if (u.medial) { const m = MEDIAL[u.medial]; ch += m.ch; latin += u.medial; parts.push({ k: 'medial', ch: m.ch, name: m.id }); }
      if (u.pamaeh) { ch += PAMAEH; parts.push({ k: 'pamaeh', ch: PAMAEH, name: 'pamaéh' }); }
      else if (u.vokal && u.vokal !== 'a') { const v = VSIGN[u.vokal]; ch += v.ch; latin += u.vokal; parts.push({ k: 'vokal', ch: v.ch, name: v.id }); }
      else latin += 'a';
    }
    if (u.final) { const f = FINAL[u.final]; ch += f.ch; latin += u.final; parts.push({ k: 'final', ch: f.ch, name: f.id }); }
    return Object.assign(u, { ch, latin, parts });
  }

  /* Latin → aksara. Angka ditulis di antara tanda | … | sesuai kebiasaan aksara Sunda. */
  function toAksara(text) { return tokens(text).map(t => t.ch).join(''); }
  function tokens(text) {
    const out = []; const s = norm(text);
    const re = /([a-zé]+)|(\d+)|([^a-zé\d]+)/g; let m;
    while ((m = re.exec(s))) {
      if (m[1]) out.push({ type: 'word', latin: m[1], units: syllabify(m[1]), get ch() { return this.units.map(u => u.ch).join(''); } });
      else if (m[2]) out.push({ type: 'num', latin: m[2], ch: '|' + [...m[2]].map(d => ANGKA[+d].ch).join('') + '|' });
      else out.push({ type: 'sep', latin: m[3], ch: m[3] });
    }
    return out;
  }
  function units(word) { return syllabify(norm(word).replace(/[^a-zé]/g, '')); }

  /* aksara → Latin */
  const REV = {};
  NGALAGENA.forEach(n => REV[n.ch] = { t: 'C', s: n.cons }); SWARA.forEach(s => REV[s.ch] = { t: 'V', s: s.latin });
  Object.entries(VSIGN).forEach(([v, r]) => REV[r.ch] = { t: 'VS', s: v });
  Object.entries(MEDIAL).forEach(([m, r]) => REV[r.ch] = { t: 'M', s: m });
  Object.entries(FINAL).forEach(([f, r]) => REV[r.ch] = { t: 'F', s: f });
  REV[PAMAEH] = { t: 'X' }; ANGKA.forEach(a => REV[a.ch] = { t: 'D', s: a.latin });
  function toLatin(text) {
    let out = '', pend = ''; // pend = konsonan menunggu vokal
    const flush = () => { if (pend) { out += pend + 'a'; pend = ''; } };
    for (const ch of text) {
      const r = REV[ch];
      if (!r) { flush(); if (ch !== '|') out += ch; continue; }
      if (r.t === 'C') { flush(); pend = r.s; }
      else if (r.t === 'M') { pend += r.s; }
      else if (r.t === 'VS') { out += pend + r.s; pend = ''; }
      else if (r.t === 'X') { out += pend; pend = ''; }
      else if (r.t === 'F') { flush(); out += r.s; }
      else if (r.t === 'V') { flush(); out += r.s; }
      else if (r.t === 'D') { flush(); out += r.s; }
    }
    flush(); return out;
  }

  /* rakit satu unit dari pilihan (mode Rakit Aksara) */
  function compose(sel) { // sel: {base:'ka'|null, swara:'a'|null, vokal:id|null, medial:id|null, final:id|null}
    const u = { parts: [] };
    if (sel.swara) u.swara = sel.swara;
    else if (sel.base) {
      u.base = NGALAGENA.find(n => n.latin === sel.base).cons;
      if (sel.medial) u.medial = R[sel.medial].m;
      if (sel.vokal === 'pamaéh') u.pamaeh = true; else if (sel.vokal) u.vokal = R[sel.vokal].v;
    } else return null;
    if (sel.final && !u.pamaeh) u.final = R[sel.final].f;
    return build(u);
  }

  return { NGALAGENA, SWARA, RARANGKEN, ANGKA, R, toAksara, toLatin, tokens, units, compose, norm, DOTTED: '◌' };
});
