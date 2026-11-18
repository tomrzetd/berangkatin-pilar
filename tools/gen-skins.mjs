// PILAR · generator skin terang untuk aplikasi (Kalem & Pink)
// Membaca CSS asli tiap aplikasi lewat CSSOM (Chromium/Playwright), lalu menulis css/skin/<slug>.css
// yang hanya aktif bila html[data-skin="kalem"|"pink"][data-app="<slug>"]. Skin Gelap = CSS asli, tak tersentuh.
// Pakai:  python3 -m http.server 8791 &   lalu   node tools/gen-skins.mjs [slug ...]
// Aturan per aplikasi (selektor panggung yang dikecualikan + CSS tambahan) ada di tools/skin-rules.mjs.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';
import { RULES } from './skin-rules.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASE = process.env.PILAR_BASE || 'http://localhost:8791';
const want = process.argv.slice(2);
const slugs = want.length ? want : Object.keys(RULES);

// ---------- dijalankan di halaman ----------
function extract(exclude) {
  const exRe = exclude.map(s => new RegExp(s));
  const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color',
    'border-left-color', 'outline-color', 'box-shadow', 'text-shadow', 'fill', 'stroke', 'accent-color', 'caret-color', 'color-scheme', 'text-decoration-color', '-webkit-text-fill-color'];
  const SHORT = ['background', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-color', 'outline'];
  const out = [];
  const splitSel = s => { const r = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { r.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) r.push(cur.trim()); return r; };
  function rule(r, media) {
    if (r.type === 4 || r.type === 12) { const m = (r.type === 4 ? '@media ' + r.conditionText : '@supports ' + r.conditionText); for (const c of r.cssRules) rule(c, media.concat(m)); return; }
    if (r.type !== 1) return;
    const sels = splitSel(r.selectorText).filter(s => !exRe.some(x => x.test(s)));
    if (!sels.length) return;
    const decl = [];
    const st = r.style;
    for (let i = 0; i < st.length; i++) {
      const p = st[i];
      if (p.startsWith('--')) decl.push([p, st.getPropertyValue(p).trim(), st.getPropertyPriority(p)]);
    }
    for (const p of PROPS) { const v = st.getPropertyValue(p); if (v) decl.push([p, v, st.getPropertyPriority(p)]); }
    for (const p of SHORT) {
      const v = st.getPropertyValue(p);
      // shorthand ber-var(): longhand kosong (pending-substitution) → simpan shorthand utuh
      if (v && /var\(/.test(v)) {
        const lh = p === 'background' ? 'background-color' : p === 'outline' ? 'outline-color' : p === 'border-color' || p === 'border' ? 'border-top-color' : p + '-color';
        if (!st.getPropertyValue(lh)) decl.push([p, v, st.getPropertyPriority(p)]);
      }
    }
    // lapisan peredup layar penuh (scrim/tirai modal) → tetap gelap transparan, bukan jadi panel putih
    const full = /^(fixed|absolute)$/.test(st.position) && ['top', 'right', 'bottom', 'left'].every(k => st.getPropertyValue(k) === '0px');
    const SR = /shade|scrim|backdrop|veil|dimmer/i;
    if (!decl.length) return;
    // nama jelas (shade/backdrop…) → selalu peredup; sekadar layar penuh → peredup hanya bila warnanya tembus pandang
    const a = sels.filter(x => SR.test(x)), b = sels.filter(x => !SR.test(x));
    const bf = b.filter(x => full && !x.includes('::')), bn = b.filter(x => !(full && !x.includes('::')));
    if (bn.length) out.push({ sels: bn, media, decl, scrim: '' });
    if (bf.length) out.push({ sels: bf, media, decl, scrim: 'full' });
    if (a.length) out.push({ sels: a, media, decl, scrim: 'name' });
  }
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch (_) { continue; }
    if (sh.href && (!sh.href.startsWith(location.origin) || sh.href.includes('/css/skin/'))) continue;
    for (const r of rs) rule(r, []);
  }
  return out;
}

// ---------- warna ----------
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function parse(c) {
  if (NAMED[c]) return NAMED[c].slice();
  if (c[0] === '#') {
    let h = c.slice(1); if (h.length <= 4) h = [...h].map(x => x + x).join('');
    const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); n.push(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1); return n;
  }
  const m = c.match(/[\d.]+%?/g).map(x => x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x));
  return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
}
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function fromHsl(h, s, l) {
  const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
const lum = rgb => { const c = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
// gelapkan (turunkan L) sampai luminans relatif ≤ Ymax → kontras terjamin di atas putih
function darkenTo(h, s, l, Ymax) { let rgb = fromHsl(h, s, l); while (lum(rgb) > Ymax && l > .05) { l -= .01; rgb = fromHsl(h, s, l); } return rgb; }
const fmt = ([r, g, b], a) => a >= .995 ? '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('') : `rgba(${r},${g},${b},${+a.toFixed(3)})`;

const SKIN = {
  kalem: { hue: 218 / 360, ink: [16, 27, 57], shadow: [36, 77, 139], keepHue: s => s > .35 },
  pink: { hue: 334 / 360, ink: [58, 20, 48], shadow: [190, 60, 120], keepHue: (s, h) => s > .45 && !(h > .5 && h < .72) },
};
// peran: bg | fg | line | shadow | tshadow | accent
function mapColor(c, role, sk) {
  const K = SKIN[sk]; const [r, g, b, a] = parse(c); let [h, s, l] = toHsl([r, g, b]);
  const neutralHue = K.keepHue(s, h) ? h : K.hue;
  if (role === 'shadow') {
    if (l < .35) return fmt(K.shadow, Math.min(a, .1));
    return fmt([r, g, b], a * .55);
  }
  if (role === 'tshadow') { if (l < .35) return 'transparent'; return fmt([r, g, b], a * .35); }
  if (role === 'scrim' || role === 'scrim?') {
    if (l < .3 && (role === 'scrim' || a < .9)) return fmt(K.ink, Math.min(.5, a * .65));
    role = 'bg';
  }
  if (role === 'bg') {
    if (l > .85) return a < .35 ? fmt(K.ink, a * 1.1) : c;            // putih transparan (hover) → tinta tipis
    if (l >= .4) return c;                                               // isian aksen tetap
    if (a < .55 && s < .25) return fmt(K.ink, Math.min(.07, a * .3));   // lapisan hitam tipis → sumur tipis
    const nl = .985 - l * .2, ns = Math.min(s, .5) * (K.keepHue(s, h) ? .9 : .7);
    return fmt(fromHsl(neutralHue, Math.max(ns, sk === 'pink' ? .55 : .35), nl), a < .55 ? a : 1);
  }
  if (role === 'line') {
    if (l > .85) return fmt(K.ink, Math.min(.22, a * 1.6));
    if (l < .45) return fmt(fromHsl(neutralHue, sk === 'pink' ? .6 : .45, .89 - l * .1), Math.max(a, .85));
    return fmt(fromHsl(h, s, Math.min(l, .55)), a);
  }
  if (role === 'fg') {
    if (l > .72 && s < .5 || l > .85) { const m = (1 - l); return fmt(K.ink.map(x => Math.round(x + m * 260)), a); }
    if (l > .4 && s > .3) return fmt(darkenTo(h, s, l, .13), a);
    if (l > .5) return fmt(fromHsl(neutralHue, .2, .4), a);
    return c;
  }
  // accent (variabel tanpa petunjuk nama)
  if (l < .3) return mapColor(c, 'bg', sk);
  if (l > .85 && s < .5) return mapColor(c, 'fg', sk);
  if (l > .4 && s > .25) return fmt(darkenTo(h, s, l, .2), a);
  return c;
}
function roleOf(prop, val) {
  if (prop === 'color' || prop === 'fill' || prop === 'caret-color' || prop === 'text-decoration-color' || prop === '-webkit-text-fill-color') return 'fg';
  if (prop === 'stroke') return 'fg';
  if (prop.startsWith('background')) return 'bg';
  if (prop.includes('border') || prop.startsWith('outline')) return 'line';
  if (prop === 'box-shadow') return 'shadow';
  if (prop === 'text-shadow') return 'tshadow';
  if (prop === 'accent-color') return 'accent';
  if (prop.startsWith('--')) {
    const n = prop.toLowerCase();
    if (/(text|ink|tx|fg|muted|^--mu$|^--mut$|dim|^--ink)/.test(n)) return 'fg';
    if (/(line|edge|ln$|border|stroke)/.test(n)) return 'line';
    if (/(shadow)/.test(n)) return 'shadow';
    if (/(bg|panel|pan$|pn$|glass|card|paper|surface|well|deep)/.test(n)) return 'bg';
    return 'accent';
  }
  return 'accent';
}
function mapValue(prop, val, sk, scrim) {
  if (prop === 'color-scheme') return 'light';
  let role = roleOf(prop, val);
  if (scrim && role === 'bg') role = scrim === 'name' ? 'scrim' : 'scrim?';
  return val.replace(COLOR_RE, c => { try { return mapColor(c, role, sk); } catch (_) { return c; } });
}
function prefixSel(sel, P) {
  if (sel.startsWith(':root')) return P + sel.slice(5);
  const m = sel.match(/^html(?![\w-])/);
  if (m) return P + sel.slice(4);
  if (/^body(?![\w-])/.test(sel)) return P + ' ' + sel;
  return P + ' ' + sel;
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const slug of slugs) {
  const R = RULES[slug]; if (!R) { console.log('lewati (tak ada aturan):', slug); continue; }
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('pilar_skin', 'gelap'); } catch (_) {} });
  await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/apps/${slug}/`, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  const rules = await pg.evaluate(extract, R.exclude || []);
  await ctx.close();
  let css = `/* DIBUAT OTOMATIS oleh tools/gen-skins.mjs — jangan sunting manual; ubah tools/skin-rules.mjs lalu jalankan ulang.\n   Skin terang PILAR untuk apps/${slug}. Hanya aktif saat skin Hub = Kalem/Pink. */\n`;
  for (const sk of ['kalem', 'pink']) {
    const P = `html[data-skin="${sk}"][data-app="${slug}"]`;
    css += `\n/* ===== ${sk} ===== */\n${P}{color-scheme:light}\n`;
    for (const { sels, media, decl, scrim } of rules) {
      const body = decl.map(([p, v, imp]) => `${p}:${mapValue(p, v, sk, scrim)}${imp ? '!important' : ''}`).join(';');
      let block = sels.map(s => prefixSel(s, P)).join(',') + '{' + body + '}';
      for (const m of [...media].reverse()) block = `${m}{${block}}`;
      css += block + '\n';
    }
    if (R.extra) css += R.extra.replaceAll('@@', P) + '\n';
    if (R[sk]) css += R[sk].replaceAll('@@', P) + '\n';
  }
  fs.mkdirSync(path.join(ROOT, 'css/skin'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'css/skin', slug + '.css'), css);
  console.log(slug, rules.length, 'aturan →', (css.length / 1024).toFixed(1) + ' KB');
}
await browser.close();
