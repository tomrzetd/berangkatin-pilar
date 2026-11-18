/* PILAR · Atlas Bumi — matematika bumi (bisa diuji: node apps/atlas-bumi/test-geo.js)
   jarak lingkaran besar (haversine), arah kompas, arah kiblat, format DMS (LU/LS/BT/BB),
   pengurai koordinat bebas, titik subsolar (matahari tepat di atas kepala), zona waktu,
   titik-dalam-poligon untuk menebak negara. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.AtlasGeo = f(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const R_EARTH = 6371, D = Math.PI / 180;
  const MECCA = [21.4225, 39.8262];

  function distance(a, b) { // km
    const dLat = (b[0] - a[0]) * D, dLon = (b[1] - a[1]) * D;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * D) * Math.cos(b[0] * D) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function bearing(a, b) { // derajat dari utara, searah jarum jam
    const y = Math.sin((b[1] - a[1]) * D) * Math.cos(b[0] * D);
    const x = Math.cos(a[0] * D) * Math.sin(b[0] * D) - Math.sin(a[0] * D) * Math.cos(b[0] * D) * Math.cos((b[1] - a[1]) * D);
    return (Math.atan2(y, x) / D + 360) % 360;
  }
  const COMPASS = ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'];
  const compass = deg => COMPASS[Math.round(deg / 45) % 8];
  function qibla(p) { return bearing(p, MECCA); }
  /* titik di antara a dan b pada lingkaran besar, f = 0..1 */
  function interpolate(a, b, f) {
    const p1 = [a[0] * D, a[1] * D], p2 = [b[0] * D, b[1] * D];
    const d = distance(a, b) / R_EARTH; if (d < 1e-9) return a.slice();
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1[0]) * Math.cos(p1[1]) + B * Math.cos(p2[0]) * Math.cos(p2[1]);
    const y = A * Math.cos(p1[0]) * Math.sin(p1[1]) + B * Math.cos(p2[0]) * Math.sin(p2[1]);
    const z = A * Math.sin(p1[0]) + B * Math.sin(p2[0]);
    return [Math.atan2(z, Math.hypot(x, y)) / D, Math.atan2(y, x) / D];
  }
  function dms(v, isLat) {
    const h = isLat ? (v >= 0 ? 'LU' : 'LS') : (v >= 0 ? 'BT' : 'BB');
    let a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60);
    if (s === 60) { s = 0; m++; } if (m === 60) { m = 0; d++; }
    if (Math.abs(v) < 1e-9) return '0°' + (isLat ? ' (khatulistiwa)' : ' (Greenwich)');
    return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″ ${h}`;
  }
  const dec = (v, n = 2) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(n).replace('.', ',');
  /* Pengurai bebas: "6.175", "-6,175", "6°10'30\" LS", "6 10 30 S", "106°49′ BT", "6.2 LS" */
  function parseCoord(str, isLat) {
    if (str == null) return null;
    let s = String(str).trim().toUpperCase().replace(/,/g, '.').replace(/[′’']/g, "'").replace(/[″”"]/g, '"');
    if (!s) return null;
    let sign = 1;
    if (/^[-−–]/.test(s)) { sign = -1; s = s.replace(/^[-−–]\s*/, ''); }
    const hm = s.match(/(LU|LS|BT|BB|N|S|E|W|U|T|B)\s*$/);
    if (hm) {
      const h = hm[1];
      if (isLat) { if (['LS', 'S'].includes(h)) sign = -1; else if (!['LU', 'N', 'U'].includes(h)) return null; }
      else { if (['BB', 'W', 'B'].includes(h)) sign = -1; else if (!['BT', 'E', 'T'].includes(h)) return null; }
      s = s.slice(0, hm.index).trim();
    }
    const nums = s.match(/\d+(?:\.\d+)?/g); if (!nums || nums.length > 3) return null;
    if (/[^\d.\s°'"]/.test(s)) return null;
    const [d, m = 0, sec = 0] = nums.map(Number);
    if (m >= 60 || sec >= 60) return null;
    const v = sign * (d + m / 60 + sec / 3600);
    if (isLat ? Math.abs(v) > 90 : Math.abs(v) > 180) return null;
    return v;
  }
  /* Titik subsolar (lintang = deklinasi matahari) untuk waktu UTC tertentu. Cukup teliti untuk peta (±0,5°). */
  function subsolar(date) {
    const t0 = Date.UTC(date.getUTCFullYear(), 0, 1), n = (date.getTime() - t0) / 864e5;   // hari ke- (pecahan)
    const g = 2 * Math.PI / 365.25 * (n - 1);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)); // menit
    const utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    let lon = -15 * (utcH - 12 + eot / 60); lon = ((lon + 540) % 360) - 180;
    return [decl / D, lon];
  }
  /* ketinggian matahari (derajat) di titik p */
  function sunElevation(p, date) {
    const s = subsolar(date);
    const c = Math.sin(p[0] * D) * Math.sin(s[0] * D) + Math.cos(p[0] * D) * Math.cos(s[0] * D) * Math.cos((p[1] - s[1]) * D);
    return Math.asin(Math.max(-1, Math.min(1, c))) / D;
  }
  /* Zona waktu: Indonesia memakai WIB/WITA/WIT (perkiraan dari bujur), selain itu perkiraan bujur ÷ 15 */
  function timeZone(p, country) {
    if (country === 'Indonesia') {
      if (p[1] < 114.4) return {name: 'WIB', off: 7};
      if (p[1] < 126) return {name: 'WITA', off: 8};
      return {name: 'WIT', off: 9};
    }
    const off = Math.round(p[1] / 15);
    return {name: 'UTC' + (off >= 0 ? '+' : '−') + Math.abs(off) + ' (perkiraan bujur ÷ 15)', off};
  }
  function solarTime(p, date) { // waktu matahari lokal (jam)
    const utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
    return ((utcH + p[1] / 15) % 24 + 24) % 24;
  }
  const hhmm = h => String(Math.floor(h)).padStart(2, '0') + '.' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
  function pip(lat, lon, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function prepCountries(list) {
    list.forEach(c => { c.bb = c.r.map(r => { let a = 1e9, b = -1e9, e = 1e9, f = -1e9; r.forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, x); e = Math.min(e, y); f = Math.max(f, y); }); return [a, b, e, f]; });
      let best = 0, bi = 0; c.bb.forEach((b, i) => { const ar = (b[1] - b[0]) * (b[3] - b[2]); if (ar > best) { best = ar; bi = i; } });
      const r = c.r[bi]; let sx = 0, sy = 0; r.forEach(([x, y]) => { sx += x; sy += y; }); c.center = [sy / r.length, sx / r.length]; });
    return list;
  }
  function countryAt(list, lat, lon) {
    for (const c of list) for (let i = 0; i < c.r.length; i++) { const b = c.bb[i]; if (lon < b[0] || lon > b[1] || lat < b[2] || lat > b[3]) continue; if (pip(lat, lon, c.r[i])) return c; }
    return null;
  }
  function ocean(lat, lon) {
    if (lat > 66) return 'Samudra Arktik';
    if (lat < -60) return 'Samudra Selatan';
    if (lon >= 20 && lon < 147 && lat < 25 && !(lon > 100 && lat > 0 && lon > 117)) return lon > 100 && lat > -11 && lat < 8 ? 'Laut Nusantara' : 'Samudra Hindia';
    if (lon >= -70 && lon < 20) return 'Samudra Atlantik';
    if (lon >= -100 && lon < -70 && lat > 8) return 'Samudra Atlantik';
    return 'Samudra Pasifik';
  }
  const NAME_ID = {
    'Indonesia': 'Indonesia', 'Malaysia': 'Malaysia', 'Singapore': 'Singapura', 'Philippines': 'Filipina', 'Thailand': 'Thailand', 'Vietnam': 'Vietnam', 'Laos': 'Laos', 'Cambodia': 'Kamboja',
    'Myanmar': 'Myanmar', 'Brunei': 'Brunei Darussalam', 'Timor-Leste': 'Timor Leste', 'Papua New Guinea': 'Papua Nugini', 'Australia': 'Australia', 'New Zealand': 'Selandia Baru',
    'Japan': 'Jepang', 'China': 'Tiongkok', 'Taiwan': 'Taiwan', 'South Korea': 'Korea Selatan', 'North Korea': 'Korea Utara', 'Mongolia': 'Mongolia', 'India': 'India', 'Pakistan': 'Pakistan',
    'Bangladesh': 'Bangladesh', 'Sri Lanka': 'Sri Lanka', 'Nepal': 'Nepal', 'Afghanistan': 'Afganistan', 'Iran': 'Iran', 'Iraq': 'Irak', 'Saudi Arabia': 'Arab Saudi', 'Yemen': 'Yaman',
    'Oman': 'Oman', 'United Arab Emirates': 'Uni Emirat Arab', 'Qatar': 'Qatar', 'Kuwait': 'Kuwait', 'Jordan': 'Yordania', 'Syria': 'Suriah', 'Turkey': 'Turki', 'Israel': 'Israel', 'Palestine': 'Palestina', 'Lebanon': 'Lebanon',
    'Egypt': 'Mesir', 'Libya': 'Libya', 'Algeria': 'Aljazair', 'Morocco': 'Maroko', 'Tunisia': 'Tunisia', 'Sudan': 'Sudan', 'Ethiopia': 'Etiopia', 'Kenya': 'Kenya', 'Tanzania': 'Tanzania',
    'Nigeria': 'Nigeria', 'South Africa': 'Afrika Selatan', 'Madagascar': 'Madagaskar', 'Dem. Rep. Congo': 'Republik Demokratik Kongo', 'Russia': 'Rusia', 'Kazakhstan': 'Kazakhstan',
    'United Kingdom': 'Britania Raya', 'France': 'Prancis', 'Germany': 'Jerman', 'Netherlands': 'Belanda', 'Belgium': 'Belgia', 'Spain': 'Spanyol', 'Portugal': 'Portugal', 'Italy': 'Italia',
    'Greece': 'Yunani', 'Poland': 'Polandia', 'Ukraine': 'Ukraina', 'Sweden': 'Swedia', 'Norway': 'Norwegia', 'Finland': 'Finlandia', 'Denmark': 'Denmark', 'Iceland': 'Islandia', 'Ireland': 'Irlandia',
    'Switzerland': 'Swiss', 'Austria': 'Austria', 'Greenland': 'Greenland', 'Canada': 'Kanada', 'United States of America': 'Amerika Serikat', 'Mexico': 'Meksiko', 'Cuba': 'Kuba',
    'Brazil': 'Brasil', 'Argentina': 'Argentina', 'Chile': 'Chili', 'Peru': 'Peru', 'Colombia': 'Kolombia', 'Venezuela': 'Venezuela', 'Ecuador': 'Ekuador', 'Bolivia': 'Bolivia', 'Antarctica': 'Antartika'
  };
  const CONT_ID = {'Asia': 'Asia', 'Africa': 'Afrika', 'Europe': 'Eropa', 'North America': 'Amerika Utara', 'South America': 'Amerika Selatan', 'Oceania': 'Oseania', 'Antarctica': 'Antartika', 'Seven seas (open ocean)': 'Samudra'};
  return {R_EARTH, MECCA, distance, bearing, compass, qibla, interpolate, dms, dec, parseCoord, subsolar, sunElevation, timeZone, solarTime, hhmm, pip, prepCountries, countryAt, ocean, NAME_ID, CONT_ID};
});
