// node apps/pak-taro/test-logic.js — uji logika "Pupuk Ajaib" (Buku Informatika VIII)
const T = require('./logic.js');
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('GAGAL:', m); } };
const R = T.BOOK.experiments.map(m => T.effectsOf(m, T.BOOK.map));
t(R[0].length === 3 && R[1].length === 2 && R[2].length === 2, 'jumlah perubahan 3 · 2 · 2 seperti di buku');
const d = T.deduce(T.BOOK.experiments, R);
t(d.water === 'D', 'kunci buku: gelas D berisi air');
t(d.maps === 1 && Object.keys(d.known).length === 6, 'tiga percobaan buku menentukan SEMUA gelas secara unik');
const c = T.codes(T.BOOK.experiments);
t(c.A === '110' && c.B === '100' && c.C === '101' && c.D === '011' && c.E === '010' && c.F === '001', 'kode biner gelas: ' + JSON.stringify(c));
t(new Set(Object.values(c)).size === 6, 'setiap gelas punya kode berbeda');
const st = T.bookSteps(); t(st[2].answer.length === 0, 'P2 ∩ P3 kosong → D air'); t(st.every(s => s.glass === 'D' ? true : s.answer.length === 1), 'tiap langkah menghasilkan tepat satu khasiat');
// percobaan buruk: dua gelas berkode sama → tak bisa dibedakan
const badExp = [['A', 'B'], ['C', 'D'], ['E', 'F']]; const dm = T.randomMap(() => .3);
const db = T.deduce(badExp, badExp.map(m => T.effectsOf(m, dm))); t(db.maps > 1, 'kode kembar → banyak kemungkinan (' + db.maps + ')');
// sembarang susunan acak + rancangan percobaan buku selalu terpecahkan
let all = true; for (let k = 0; k < 40; k++) { const m = T.randomMap(); const dd = T.deduce(T.BOOK.experiments, T.BOOK.experiments.map(e => T.effectsOf(e, m))); if (dd.maps !== 1) all = false; } t(all, 'rancangan kode unik memecahkan susunan acak mana pun');
console.log(ok + ' lulus, ' + bad + ' gagal'); process.exit(bad ? 1 : 0);
