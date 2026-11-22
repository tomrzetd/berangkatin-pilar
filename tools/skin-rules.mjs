// Aturan skin terang per aplikasi. exclude = regex selektor yang TIDAK diubah (panggung: kanvas/3D/kamera/papan game).
// extra = CSS tambahan untuk kedua skin; kalem/pink = khusus satu skin. "@@" diganti prefiks html[data-skin][data-app].
export const RULES = {
  'atlas-bumi': {
    exclude: ['^\\.lbl', '^#globe', '^#labels', '^\\.load', '^\\.err', '^\\.readout', '^\\.tip'],
    // bola dunia tetap di angkasa gelap; bilah atas jadi pita terang yang rapi
    extra: `@@ #globe{background:#030812}
@@ .top{background:var(--sk-top);box-shadow:0 1px 0 var(--sk-line)}
@@ .clock,@@ .brand b{color:var(--sk-ink)}`,
    kalem: `@@{--sk-top:rgba(244,247,253,.94);--sk-line:#dfe7f4;--sk-ink:#101b39}`,
    pink: `@@{--sk-top:rgba(255,246,250,.94);--sk-line:#f6d6e6;--sk-ink:#3a1430}`,
  },
  // warna aksen kartu datang dari style inline --c → campur dengan tinta agar terbaca di latar terang
  'pressure': { exclude: [], extra: `@@ .pick-card em{color:color-mix(in srgb,var(--c) 55%,#101b39)}` },
  // grafik osiloskop/spektrum digambar dengan warna terang di kanvas transparan → layar instrumen tetap gelap
  'soundscope': { exclude: [], extra: `@@ canvas{background:#0a1524;border-radius:10px}
@@ .cv .cap{background:rgba(255,255,255,.94);color:#101b39}` },
  'bioweb': { exclude: [] },
  'rubik-orbit': { exclude: [] },
  'puzzlesnap': { exclude: [] },
  'lorentz-lab': { exclude: [] },
  // jejak cahaya neon = identitas Air Writing → kanvas tulis tetap gelap, bingkai di sekitarnya terang
  'air-writing': { exclude: ['^\\.stage', '^#display', '^#face'], extra: `@@ .stage-shell{background:#07101b}` },
  'frost-snake': { exclude: [] },
  'hunter-ball': { exclude: [] },
  'mbg-duel': { exclude: [] },
};
