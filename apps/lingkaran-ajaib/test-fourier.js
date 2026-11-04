// node apps/lingkaran-ajaib/test-fourier.js
const M = require('./fourier.js');
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('GAGAL:', m); } };
const N = 256;
for (const k of Object.keys(M.SHAPES)) {
  const pts = M.normalize(M.SHAPES[k].gen(N)), c = M.dft(pts);
  const sims = [1, 3, 5, 8, 12, 20, 40, 100].map(K => [K, +(M.similarity(pts, c, K) * 100).toFixed(1)]);
  const need = K => { for (let i = 1; i <= N; i++) if (M.similarity(pts, c, i) >= K) return i; return '-'; };
  console.log(k.padEnd(10), sims.map(s => s.join(':')).join('  '), '| ≥90%:', need(.9), '≥95%:', need(.95), '≥99%:', need(.99));
  t(M.similarity(pts, c, N) > 0.999, k + ' rekonstruksi penuh');
}
t(M.exact(30).sin === '½' && M.exact(150).cos === '−√3/2' && M.exact(225).sin === '−√2/2' && M.exact(270).sin === '−1', 'nilai eksak');
t(M.exact(37) === null, 'bukan sudut istimewa');
t(M.radLabel(30) === 'π/6' && M.radLabel(135) === '3π/4' && M.radLabel(180) === 'π' && M.radLabel(300) === '5π/3', 'label radian');
console.log(ok + ' lulus, ' + bad + ' gagal'); process.exit(bad ? 1 : 0);
