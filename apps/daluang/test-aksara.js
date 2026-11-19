// node apps/daluang/test-aksara.js — uji mesin aksara Sunda (Latin ⇄ aksara)
const A = require('./aksara.js');
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('GAGAL:', m); } };
const U = s => [...s].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ');
const CASES = { // kata → aksara yang diharapkan (Aksara Sunda Baku)
  sunda: 'ᮞᮥᮔ᮪ᮓ', aksara: 'ᮃᮊ᮪ᮞᮛ', gunung: 'ᮌᮥᮔᮥᮀ', bandung: 'ᮘᮔ᮪ᮓᮥᮀ', cai: 'ᮎᮄ', kembang: 'ᮊᮨᮙ᮪ᮘᮀ',
  beureum: 'ᮘᮩᮛᮩᮙ᮪', prabu: 'ᮕᮢᮘᮥ', sakola: 'ᮞᮊᮧᮜ', kuningan: 'ᮊᮥᮔᮤᮍᮔ᮪', ngaran: 'ᮍᮛᮔ᮪', ieu: 'ᮄᮉ',
  daun: 'ᮓᮅᮔ᮪', hayam: 'ᮠᮚᮙ᮪', imah: 'ᮄᮙᮂ', buku: 'ᮘᮥᮊᮥ', karna: 'ᮊᮁᮔ', tangan: 'ᮒᮍᮔ᮪', ciremai: 'ᮎᮤᮛᮨᮙᮄ',
  'sapédah': 'ᮞᮕᮦᮓᮂ', rizal: 'ᮛᮤᮐᮜ᮪', 'abdurrahman': 'ᮃᮘ᮪ᮓᮥᮁᮛᮂᮙᮔ᮪', panggung: 'ᮕᮀᮌᮥᮀ', nyai: 'ᮑᮄ', pakéan: 'ᮕᮊᮦᮃᮔ᮪',
  daluang: 'ᮓᮜᮥᮃᮀ', ngagurat: 'ᮍᮌᮥᮛᮒ᮪', kéju: 'ᮊᮦᮏᮥ', 'kopi': 'ᮊᮧᮕᮤ', khas: 'ᮮᮞ᮪', syarat: 'ᮯᮛᮒ᮪', klinik: 'ᮊᮣᮤᮔᮤᮊ᮪',
};
for (const [w, exp] of Object.entries(CASES)) {
  const got = A.toAksara(w); t(got === exp, `${w}: dapat ${got} (${U(got)}) harap ${exp} (${U(exp)})`);
  t(A.toLatin(got) === A.norm(w), `bolak-balik ${w} → ${A.toLatin(got)}`);
}
t(A.toAksara('Basa Sunda, 2026') === 'ᮘᮞ ᮞᮥᮔ᮪ᮓ, |᮲᮰᮲᮶|', 'kalimat + angka: ' + A.toAksara('Basa Sunda, 2026'));
t(A.toLatin('|᮲᮰᮲᮶|') === '2026', 'angka balik');
t(A.toAksara('Kéju') === A.toAksara('kèju'), 'è dianggap é');
// rakit
const c = A.compose({ base: 'ka', vokal: 'panghulu', final: 'panyecek' }); t(c.ch === 'ᮊᮤᮀ' && c.latin === 'king', 'rakit ka+panghulu+panyecek = king');
const c2 = A.compose({ base: 'ka', medial: 'panyakra', vokal: 'panyuku' }); t(c2.latin === 'kru', 'rakit kru');
const c3 = A.compose({ base: 'sa', vokal: 'pamaéh', final: 'panyecek' }); t(c3.latin === 's' && !c3.final, 'pamaéh menolak final');
const c4 = A.compose({ swara: 'a', final: 'panyecek' }); t(c4.latin === 'ang', 'swara + panyecek');
t(A.units('gunung').map(u => u.latin).join('-') === 'gu-nung', 'unit gu-nung');
t(A.NGALAGENA.filter(n => n.pokok).length === 18 && A.SWARA.length === 7 && A.RARANGKEN.length === 13, 'inventaris 18 · 7 · 13');
console.log(ok + ' lulus, ' + bad + ' gagal'); process.exit(bad ? 1 : 0);
