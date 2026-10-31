/* PILAR · Papan Rangkai — antarmuka editor */
(function () {
  'use strict';
  const C = window.RangkaiCore, A = window.RangkaiArt, T = window.RangkaiTemplates;
  const { LIB } = C, G = A.G;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const STORE = 'pilar.rangkai.v1';
  const WIRE_COLORS = ['#d32f2f', '#262626', '#f57c00', '#e8b900', '#2e9d4f', '#1e63d6', '#7b3fc4', '#7f8f99', '#8d5524', '#ecebe6'];
  const AUTO = ['#2e9d4f', '#1e63d6', '#7b3fc4', '#e8792b', '#00897b', '#c2185b', '#8d5524'];

  // ------------------------------------------------------------------ status
  let circ = { parts: [], wires: [] };
  let uid = 1;
  let tool = 'select', simOn = false, wireStyle = 'curve';
  let sel = null;                 // {kind:'part'|'wire', id}
  let placing = null;             // type
  let drag = null;                // aksi pointer berjalan
  let view = { x: 40, y: 40, z: 1 };
  let nl = null, sim = null, ercList = [];
  let challenge = null;
  const hist = [], redo = [];
  const svg = $('#cv'), world = $('#world');

  // ------------------------------------------------------------------ util
  const nid = (p) => p + (uid++);
  function refreshUid() { for (const o of [...circ.parts, ...circ.wires]) { const n = parseInt(String(o.id).replace(/\D/g, ''), 10); if (n >= uid) uid = n + 1; } }
  const snapshot = () => JSON.stringify(circ);
  function commit() { hist.push(snapshot()); if (hist.length > 100) hist.shift(); redo.length = 0; save(); }
  function undo() { if (!hist.length) return; redo.push(snapshot()); circ = JSON.parse(hist.pop()); sel = null; update(); save(); }
  function redoFn() { if (!redo.length) return; hist.push(snapshot()); circ = JSON.parse(redo.pop()); sel = null; update(); save(); }
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ circ, wireStyle })); } catch (e) { /* mode privat */ } }
  function load() { try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s && s.circ && Array.isArray(s.circ.parts)) { circ = sanitize(s.circ); wireStyle = s.wireStyle || 'curve'; return true; } } catch (e) { /* abaikan */ } return false; }
  function sanitize(c) {
    const parts = (c.parts || []).filter(p => p && LIB[p.type]).map(p => ({ id: String(p.id), type: p.type, x: +p.x | 0, y: +p.y | 0, rot: [0, 90, 180, 270].includes(+p.rot) ? +p.rot : 0,
      props: Object.assign({}, p.props), ref: String(p.ref || '').slice(0, 12), label: String(p.label || '').slice(0, 8) }));
    const pt = (a) => Array.isArray(a) && a.length === 2 && a.every(Number.isFinite) ? [Math.round(a[0]), Math.round(a[1])] : null;
    const wires = (c.wires || []).map(w => ({ id: String(w.id), a: pt(w.a), b: pt(w.b), color: /^#[0-9a-f]{6}$/i.test(w.color || '') ? w.color : null })).filter(w => w.a && w.b);
    return { parts, wires };
  }
  let toastT = 0;
  function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => { t.style.display = 'none'; }, ms); }
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // ------------------------------------------------------------------ koordinat
  function toWorld(ev) {
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = world.getScreenCTM(); const w = pt.matrixTransform(m.inverse());
    return { x: w.x / G, y: w.y / G };
  }
  function applyView() { world.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.z})`); $('#gridP').setAttribute('patternTransform', `translate(${view.x} ${view.y}) scale(${view.z})`); }
  function zoomAt(f, cx, cy) {
    const nz = Math.max(.25, Math.min(3.5, view.z * f)); f = nz / view.z;
    view.x = cx - (cx - view.x) * f; view.y = cy - (cy - view.y) * f; view.z = nz; applyView();
  }
  function fit() {
    const r = svg.getBoundingClientRect();
    if (!circ.parts.length && !circ.wires.length) { view = { x: r.width / 2 - 200, y: 80, z: 1 }; applyView(); return; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of circ.parts) { const e = A.extent(LIB[p.type]), b = C.bbox(p); x0 = Math.min(x0, b.x0 * G + Math.min(0, e[0])); y0 = Math.min(y0, b.y0 * G + Math.min(0, e[1])); x1 = Math.max(x1, b.x1 * G + 30); y1 = Math.max(y1, b.y1 * G + 30); }
    for (const w of circ.wires) for (const q of [w.a, w.b]) { x0 = Math.min(x0, q[0] * G); y0 = Math.min(y0, q[1] * G); x1 = Math.max(x1, q[0] * G); y1 = Math.max(y1, q[1] * G); }
    const pad = 50, z = Math.max(.25, Math.min(1.6, Math.min((r.width - pad * 2) / (x1 - x0), (r.height - pad * 2) / (y1 - y0))));
    view = { z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: (r.height - (y1 - y0) * z) / 2 - y0 * z }; applyView();
  }

  // ------------------------------------------------------------------ palet
  const CATS = ['Logika', 'Gerbang', 'IC 74HC', 'Pasif', 'Breadboard', 'Board Sebatang-Kara'];
  const ICON = { 'Logika': '💡', 'Gerbang': '⊃', 'IC 74HC': '▭', 'Pasif': '⏛', 'Breadboard': '▦', 'Board Sebatang-Kara': '🤖' };
  function thumb(type) {
    const d = LIB[type], e = A.extent(d), st = { props: Object.assign({}, d.props), label: '', value: d.output ? 1 : undefined };
    return `<svg viewBox="${e[0] - 4} ${e[1] - 4} ${e[2] + 8} ${e[3] + 8}" preserveAspectRatio="xMidYMid meet"><defs>${''}</defs>${A.draw(d, st)}</svg>`;
  }
  function buildPalette() {
    let h = '';
    for (const cat of CATS) {
      const types = Object.keys(LIB).filter(k => LIB[k].cat === cat);
      h += `<h3>${ICON[cat]} ${cat}</h3><div class="items">` + types.map(k => `<div class="item" data-type="${k}" title="${esc(LIB[k].name)}">${thumb(k)}<span>${esc(LIB[k].name.replace(/^Gerbang |^IC /, ''))}</span></div>`).join('') + '</div>';
    }
    h += `<p class="c-note" style="margin-top:.8rem">Ketuk komponen lalu ketuk papan, atau seret ke papan. Kaki komponen otomatis menempel ke grid 2,54 mm dan lubang breadboard.</p>`;
    $('#pal').innerHTML = h;
    $$('.item', $('#pal')).forEach(el => el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      startPlacing(el.dataset.type);
      drag = { kind: 'palette', type: el.dataset.type, pid: ev.pointerId };
      if (innerWidth <= 800) $('#pal').classList.remove('open');
    }));
  }
  function startPlacing(type) {
    placing = type; sel = null;
    $$('.item').forEach(i => i.classList.toggle('on', i.dataset.type === type));
    toast('Ketuk papan untuk menaruh ' + LIB[type].name + ' · Esc batal');
    update();
  }
  function stopPlacing() { placing = null; $$('.item').forEach(i => i.classList.remove('on')); $('#lOver').innerHTML = ''; }
  function placeAt(type, gx, gy) {
    const d = LIB[type];
    const p = { id: nid('p'), type, x: Math.round(gx - d.w / 2), y: Math.round(gy - d.h / 2), rot: 0, props: Object.assign({}, d.props), ref: C.nextRef(circ, type), label: C.nextLabel(circ, type) };
    commit(); circ.parts.push(p); sel = { kind: 'part', id: p.id }; stopPlacing(); update();
    reportSnap(p);
  }
  function reportSnap(p) {
    const n = C.netlist(circ); let k = 0;
    for (const pn of LIB[p.type].pins) { const net = n.nets.get(n.netOf(p.id, pn.n)); if (net && net.pins.some(q => q.part !== p.id)) k++; }
    if (k) toast(`${p.ref}: ${k} kaki langsung tersambung (menempel di pin/lubang yang sama)`);
  }

  // ------------------------------------------------------------------ render
  function partState(p) {
    const d = LIB[p.type], st = { props: Object.assign({}, d.props, p.props), label: p.label };
    if (sim && d.output) st.value = sim.outputs[p.id];
    if (sim && sim.flags.has(p.id)) st.flag = sim.flags.get(p.id);
    if (!sim && d.output) st.value = d.type === 'BIN4' ? 0 : undefined;
    return st;
  }
  function partSvg(p, ghost) {
    const d = LIB[p.type], [cx, cy] = C.center(d), e = A.extent(d);
    const isSel = sel && sel.kind === 'part' && sel.id === p.id;
    const bad = !ghost && ercList.some(m => m.level === 'error' && m.parts && m.parts.includes(p.id));
    let s = `<g data-part="${p.id}" transform="translate(${p.x * G} ${p.y * G}) rotate(${p.rot || 0} ${cx * G} ${cy * G})"${ghost ? ' opacity=".55" pointer-events="none"' : ''}>`;
    s += `<rect x="${e[0] - 4}" y="${e[1] - 4}" width="${e[2] + 8}" height="${e[3] + 8}" rx="8" fill="${isSel ? '#2b8fd622' : 'transparent'}" stroke="${isSel ? '#2b8fd6' : bad ? '#d9445f' : 'none'}" stroke-width="2.5" stroke-dasharray="${isSel ? '0' : '6 4'}"/>`;
    s += A.draw(d, partState(p));
    if (p.ref && d.cat !== 'Breadboard' && !d.input && !d.output && !['VCC', 'GND'].includes(p.type) && d.cat !== 'Gerbang')
      s += `<text x="${e[0]}" y="${e[1] - 8}" font-size="10" font-weight="800" fill="#4a5a70" font-family="Nunito,Arial">${esc(p.ref)}</text>`;
    return s + '</g>';
  }
  function wirePath(w) {
    const ax = w.a[0] * G, ay = w.a[1] * G, bx = w.b[0] * G, by = w.b[1] * G;
    if (wireStyle === 'ortho') {
      return Math.abs(bx - ax) >= Math.abs(by - ay) ? `M${ax},${ay} H${(ax + bx) / 2} V${by} H${bx}` : `M${ax},${ay} V${(ay + by) / 2} H${bx} V${by}`;
    }
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    const sag = Math.min(60, L * .18);               // kabel melengkung sedikit, seperti jumper sungguhan
    const nx = -dy / L, ny = dx / L, side = ny >= 0 ? 1 : -1;
    const c1x = ax + dx * .25 + nx * sag * side, c1y = ay + dy * .25 + ny * sag * side + sag * .35;
    const c2x = ax + dx * .75 + nx * sag * side, c2y = ay + dy * .75 + ny * sag * side + sag * .35;
    return `M${ax},${ay} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${bx},${by}`;
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  function wireSvg(w) {
    const d = wirePath(w), col = w.color || '#2e9d4f', isSel = sel && sel.kind === 'wire' && sel.id === w.id;
    const ortho = wireStyle === 'ortho', wd = ortho ? 3 : 5.5;
    let s = `<g data-wire="${w.id}">`;
    s += `<path d="${d}" fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round"/>`;
    if (!ortho) s += `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="${wd + 4}" stroke-linecap="round" transform="translate(1.5 3)"/>`;
    if (isSel) s += `<path d="${d}" fill="none" stroke="#2b8fd6" stroke-opacity=".45" stroke-width="${wd + 9}" stroke-linecap="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${shade(col, .55)}" stroke-width="${wd + 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (!ortho) s += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round" transform="translate(-.7 -1)"/>`;
    if (sim && nl) {
      const v = sim.val.get(nl.netAt(w.a[0], w.a[1]));
      if (v === 1) s += `<path d="${d}" fill="none" stroke="#fff36b" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="6 9" class="flow"/>`;
      else if (v === 'X') s += `<path d="${d}" fill="none" stroke="#ff2d2d" stroke-width="3" stroke-dasharray="3 4"/>`;
    }
    for (const q of [w.a, w.b]) s += `<circle cx="${q[0] * G}" cy="${q[1] * G}" r="${ortho ? 3.5 : 4.8}" fill="${shade(col, .5)}"/><circle cx="${q[0] * G}" cy="${q[1] * G}" r="${ortho ? 2 : 2.6}" fill="#d9dde0"/>`;
    if (isSel) for (const q of [w.a, w.b]) s += `<circle cx="${q[0] * G}" cy="${q[1] * G}" r="8" fill="none" stroke="#2b8fd6" stroke-width="2.5"/>`;
    return s + '</g>';
  }
  let pinCache = [];   // [{x,y,part,pin,def}]
  function pinsSvg() {
    pinCache = [];
    let s = '';
    const used = new Map();
    if (nl) for (const net of nl.nets.values()) used.set(net.id, (net.real || []).length + net.wires);
    for (const p of circ.parts) {
      const d = LIB[p.type];
      for (const pn of d.pins) {
        const [x, y] = C.pinWorld(p, pn);
        pinCache.push({ x, y, part: p.id, pin: pn.n, def: pn, bb: d.cat === 'Breadboard' });
        if (d.cat === 'Breadboard') {
          const n = nl && nl.netOf(p.id, pn.n), net = n && nl.nets.get(n);
          if (net && ((net.real || []).length || net.wires)) {
            const v = sim ? sim.val.get(n) : undefined;
            s += `<rect x="${x * G - 3.5}" y="${y * G - 3.5}" width="7" height="7" rx="1.4" fill="${v === 1 ? '#ffcf3f' : v === 0 ? '#4b7bd8' : '#2f9e57'}" opacity=".85" pointer-events="none"/>`;
          }
          continue;
        }
        const n = nl && nl.netOf(p.id, pn.n), cnt = n ? (used.get(n) || 0) : 0;
        const v = sim ? sim.val.get(n) : undefined;
        const fill = sim ? (v === 1 ? '#ffcf3f' : v === 0 ? '#4b7bd8' : v === 'X' ? '#ff2d2d' : '#ffffff') : cnt > 1 ? '#2f9e57' : '#ffffff';
        const show = tool === 'wire' || cnt > 1 || sim || (sel && sel.id === p.id);
        if (show) s += `<circle cx="${x * G}" cy="${y * G}" r="${cnt > 1 ? 3.6 : 3.2}" fill="${fill}" stroke="#17243a" stroke-width="1.3" pointer-events="none"/>`;
      }
    }
    return s;
  }
  function update() {
    nl = C.netlist(circ);
    sim = simOn ? C.simulate(circ, nl) : null;
    ercList = C.erc(circ, nl, sim || C.simulate(circ, nl));
    const bbs = circ.parts.filter(p => LIB[p.type].layer === -1), rest = circ.parts.filter(p => LIB[p.type].layer !== -1);
    $('#lBB').innerHTML = bbs.map(p => partSvg(p)).join('');
    $('#lParts').innerHTML = rest.map(p => partSvg(p)).join('');
    $('#lWires').innerHTML = circ.wires.map(wireSvg).join('');
    $('#lPins').innerHTML = pinsSvg();
    svg.className.baseVal = tool === 'wire' ? 'wire' : tool === 'delete' ? 'del' : '';
    renderSide(); renderHud();
  }

  // ------------------------------------------------------------------ panel kanan
  function renderSide() {
    const box = $('#insp');
    if (sel && sel.kind === 'part') {
      const p = circ.parts.find(q => q.id === sel.id); if (!p) { sel = null; return renderSide(); }
      const d = LIB[p.type];
      let h = `<h3>${esc(d.name)} <span class="c-tag">${esc(p.ref || '')}</span></h3>`;
      if (d.input || d.output) h += `<div class="row"><label>Label</label><input type="text" id="iLabel" maxlength="6" value="${esc(p.label || '')}" style="width:5.5rem"></div>`;
      if (p.type === 'RES') h += `<div class="row"><label>Nilai</label><select id="iVal">${['220', '330', '1k', '4.7k', '10k', '100k'].map(v => `<option${(p.props.value || '10k') === v ? ' selected' : ''}>${v}</option>`).join('')}</select> Ω</div>`;
      if (p.type === 'LED') h += `<div class="row"><label>Warna</label><select id="iCol">${['red', 'green', 'blue', 'yellow', 'white'].map(v => `<option value="${v}"${(p.props.color || 'red') === v ? ' selected' : ''}>${{ red: 'merah', green: 'hijau', blue: 'biru', yellow: 'kuning', white: 'putih' }[v]}</option>`).join('')}</select></div>`;
      if (p.type === 'DRV8833') h += `<div class="row"><label><input type="checkbox" id="iJ1"${p.props.j1 ? ' checked' : ''}> J1 dijembatani (EEP selalu aktif)</label></div>`;
      if (d.input || d.toggle) h += `<div class="row"><button class="c-btn sm ${p.props.on ? 'go' : ''}" id="iTog">${p.props.on ? 'ON · 1' : 'OFF · 0'}</button></div>`;
      if (d.ic) h += `<p class="c-note">Pin 14 = VCC (+), pin 7 = GND (−). Takik di kiri, pin 1 di kiri bawah. Taruh mengangkangi parit breadboard.</p>`;
      if (d.board) h += `<p class="c-note">Pin mengikuti modul asli. Arahkan kursor ke kaki untuk melihat nama pin dan net.</p>`;
      h += `<div class="row"><button class="c-btn sm" id="iRot">⟳ Putar (R)</button><button class="c-btn sm" id="iDup">⧉ Duplikat</button><button class="c-btn sm stop" id="iDel">🗑 Hapus</button></div>`;
      box.innerHTML = h;
      const lab = $('#iLabel'); if (lab) lab.addEventListener('change', () => { commit(); p.label = lab.value.trim().slice(0, 6); update(); });
      const val = $('#iVal'); if (val) val.addEventListener('change', () => { commit(); p.props.value = val.value; update(); });
      const col = $('#iCol'); if (col) col.addEventListener('change', () => { commit(); p.props.color = col.value; update(); });
      const j1 = $('#iJ1'); if (j1) j1.addEventListener('change', () => { commit(); p.props.j1 = j1.checked ? 1 : 0; update(); });
      const tog = $('#iTog'); if (tog) tog.addEventListener('click', () => { commit(); p.props.on = p.props.on ? 0 : 1; update(); });
      $('#iRot').addEventListener('click', () => rotateSel());
      $('#iDup').addEventListener('click', () => { commit(); const q = JSON.parse(JSON.stringify(p)); q.id = nid('p'); q.x += 2; q.y += 2; q.ref = C.nextRef(circ, q.type); q.label = C.nextLabel(circ, q.type); circ.parts.push(q); sel = { kind: 'part', id: q.id }; update(); });
      $('#iDel').addEventListener('click', delSel);
    } else if (sel && sel.kind === 'wire') {
      const w = circ.wires.find(q => q.id === sel.id); if (!w) { sel = null; return renderSide(); }
      const net = nl.nets.get(nl.netAt(w.a[0], w.a[1]));
      box.innerHTML = `<h3>Kabel <span class="c-tag">${esc(net ? net.label : '')}</span></h3><div class="row">` +
        WIRE_COLORS.map(c => `<button class="sw${w.color === c ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="warna ${c}"></button>`).join('') +
        `</div><div class="row"><button class="c-btn sm stop" id="iDel">🗑 Hapus kabel</button></div><p class="c-note">Seret lingkaran di ujung kabel untuk memindahkannya.</p>`;
      $$('.sw', box).forEach(b => b.addEventListener('click', () => { commit(); w.color = b.dataset.c; update(); }));
      $('#iDel').addEventListener('click', delSel);
    } else {
      const nets = [...nl.nets.values()].filter(n => (n.real || []).length > 1).length;
      box.innerHTML = `<h3>Papan</h3><div class="row"><span class="chip">🧩 ${circ.parts.length} komponen</span><span class="chip">〰 ${circ.wires.length} kabel</span><span class="chip">🔗 ${nets} net</span></div>
        <p class="c-note"><b>Kabel:</b> tarik dari kaki/lubang ke kaki lain (alat ✋ juga bisa bila mulai tepat di kaki). <b>Simulasi:</b> ketuk saklar untuk ganti 0/1. <b>Putar:</b> tombol R. Kaki yang bertumpuk di titik yang sama otomatis satu net.</p>`;
    }
    // pesan ERC
    const errs = ercList.filter(e => e.level === 'error'), warns = ercList.filter(e => e.level === 'warn');
    $('#msgs').innerHTML = (ercList.length ? ercList : [{ level: 'ok', msg: circ.parts.length ? 'Tidak ada masalah listrik yang terdeteksi.' : 'Papan masih kosong. Coba “📚 Contoh”.' }])
      .map((e, i) => `<li class="${e.level}" data-i="${i}">${e.level === 'error' ? '⛔' : e.level === 'warn' ? '⚠️' : '✅'} ${esc(e.msg)}</li>`).join('');
    $$('#msgs li').forEach(li => li.addEventListener('click', () => { const e = ercList[+li.dataset.i]; if (e && e.parts && e.parts[0]) { sel = { kind: 'part', id: e.parts[0] }; update(); } }));
    $('#netTxt').textContent = C.netlistText(circ, nl);
    void errs; void warns;
  }
  function renderHud() {
    const errs = ercList.filter(e => e.level === 'error').length, warns = ercList.filter(e => e.level === 'warn').length;
    let h = `<span class="chip ${errs ? 'err' : warns ? 'warn' : 'ok'}">${errs ? '⛔ ' + errs + ' bahaya' : warns ? '⚠️ ' + warns + ' peringatan' : '✅ aman'}</span>`;
    if (simOn) h += `<span class="chip ok">▶ simulasi ${sim && !sim.stable ? '· berosilasi' : ''}</span>`;
    if (placing) h += `<span class="chip warn">menaruh: ${esc(LIB[placing].name)}</span>`;
    $('#hud').innerHTML = h;
  }

  // ------------------------------------------------------------------ aksi
  function rotateSel() { if (!sel || sel.kind !== 'part') return; const p = circ.parts.find(q => q.id === sel.id); if (!p) return; commit(); p.rot = ((p.rot || 0) + 90) % 360; update(); }
  function delSel() {
    if (!sel) return; commit();
    if (sel.kind === 'part') circ.parts = circ.parts.filter(p => p.id !== sel.id); else circ.wires = circ.wires.filter(w => w.id !== sel.id);
    sel = null; update();
  }
  function setTool(t) { tool = t; $$('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); update(); }
  function setSim(on) {
    simOn = on; const b = $('#btnSim'); b.setAttribute('aria-pressed', on); b.textContent = on ? '⏸ Simulasi' : '▶ Simulasi'; b.classList.toggle('on', on);
    update(); if (on) toast('Simulasi aktif: ketuk saklar untuk mengganti 0/1. Kabel bernilai 1 berkedip kuning.');
  }

  // ------------------------------------------------------------------ hit test
  function nearestPin(g, maxD = .45, skipBB = false) {
    let best = null, bd = maxD;
    for (const c of pinCache) { if (skipBB && c.bb) continue; const d = Math.hypot(c.x - g.x, c.y - g.y); if (d < bd) { bd = d; best = c; } }
    for (const w of circ.wires) for (const q of [w.a, w.b]) { const d = Math.hypot(q[0] - g.x, q[1] - g.y); if (d < bd) { bd = d; best = { x: q[0], y: q[1], wire: w.id }; } }
    return best;
  }
  function snapPt(g, maxD = .6) { const p = nearestPin(g, maxD); return p ? [p.x, p.y] : [Math.round(g.x), Math.round(g.y)]; }
  function autoColor(pt) {
    const n = nl.netAt(pt[0], pt[1]), net = n && nl.nets.get(n);
    if (net && net.name === 'GND') return '#262626';
    if (net && /^\+|VBAT/.test(net.name)) return net.name === '+3V3' ? '#c2185b' : net.name === '+5V' ? '#f57c00' : '#d32f2f';
    return AUTO[circ.wires.length % AUTO.length];
  }

  // ------------------------------------------------------------------ pointer
  const pointers = new Map();
  let pinch = null;
  svg.addEventListener('pointerdown', (ev) => {
    svg.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2) {   // cubit = zoom + geser
      const [a, b] = [...pointers.values()]; drag = null; $('#lOver').innerHTML = '';
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; return;
    }
    const g = toWorld(ev);
    if (placing) { drag = { kind: 'place', pid: ev.pointerId }; return; }
    const partEl = ev.target.closest && ev.target.closest('[data-part]');
    const wireEl = ev.target.closest && ev.target.closest('[data-wire]');
    const part = partEl ? circ.parts.find(p => p.id === partEl.dataset.part) : null;
    const isBB = part && LIB[part.type].cat === 'Breadboard';
    // ujung kabel terpilih → pindahkan ujungnya
    if (sel && sel.kind === 'wire' && tool !== 'delete') {
      const w = circ.wires.find(q => q.id === sel.id);
      if (w) for (const end of ['a', 'b']) if (Math.hypot(w[end][0] - g.x, w[end][1] - g.y) < .5) { drag = { kind: 'wend', w, end, moved: false, snap: snapshot() }; return; }
    }
    if (tool === 'delete') {
      if (wireEl) { sel = { kind: 'wire', id: wireEl.dataset.wire }; delSel(); }
      else if (part) { sel = { kind: 'part', id: part.id }; delSel(); }
      return;
    }
    const pinHit = nearestPin(g, tool === 'wire' ? .55 : .32);
    // simulasi: ketuk saklar / tombol
    if (simOn && part && (LIB[part.type].input || LIB[part.type].toggle) && !(pinHit && pinHit.part === part.id)) {
      drag = { kind: 'toggle', part, x: ev.clientX, y: ev.clientY, g };
      if (part.type === 'BUTTON') { part.props.on = 1; update(); }
      return;
    }
    if (pinHit && (tool === 'wire' || !part || isBB || pinHit.part === part.id || pinHit.wire) && !(wireEl && tool === 'select' && !pinHit.part && !pinHit.wire)) {
      drag = { kind: 'wire', a: [pinHit.x, pinHit.y], b: [pinHit.x, pinHit.y] }; return;
    }
    if (tool === 'wire' && !part && !wireEl) { const a = [Math.round(g.x), Math.round(g.y)]; drag = { kind: 'wire', a, b: a.slice() }; return; }
    if (wireEl) { sel = { kind: 'wire', id: wireEl.dataset.wire }; update(); return; }
    if (part) {
      sel = { kind: 'part', id: part.id };
      // breadboard ikut membawa komponen yang menancap
      const riders = isBB ? ridersOf(part) : [];
      drag = { kind: 'move', part, ox: g.x - part.x, oy: g.y - part.y, x0: part.x, y0: part.y, moved: false, snap: snapshot(), riders, wiresOn: isBB ? wiresOn(part, riders) : wiresOfPart(part) };
      update(); return;
    }
    sel = null; update();
    drag = { kind: 'pan', x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y }; svg.classList.add('pan');
  });
  function ridersOf(bb) {
    const keys = new Set(LIB[bb.type].pins.map(pn => C.key(...C.pinWorld(bb, pn))));
    return circ.parts.filter(p => p !== bb && LIB[p.type].cat !== 'Breadboard' && LIB[p.type].pins.some(pn => keys.has(C.key(...C.pinWorld(p, pn)))));
  }
  function wiresOfPart(p) {
    const keys = new Set(LIB[p.type].pins.map(pn => C.key(...C.pinWorld(p, pn))));
    const out = [];
    for (const w of circ.wires) for (const end of ['a', 'b']) if (keys.has(C.key(w[end][0], w[end][1]))) out.push([w, end]);
    return out;
  }
  function wiresOn(bb, riders) { const out = wiresOfPart(bb); for (const r of riders) out.push(...wiresOfPart(r)); return out; }

  svg.addEventListener('pointermove', (ev) => {
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const r = svg.getBoundingClientRect();
      view.x += cx - pinch.cx; view.y += cy - pinch.cy; zoomAt(d / pinch.d, cx - r.left, cy - r.top);
      pinch = { d, cx, cy }; return;
    }
    const g = toWorld(ev);
    if (placing) { ghost(placing, g); }
    if (!drag) { hover(ev, g); return; }
    if (drag.kind === 'pan') { view.x = drag.vx + ev.clientX - drag.x; view.y = drag.vy + ev.clientY - drag.y; applyView(); return; }
    if (drag.kind === 'wire') { drag.b = snapPt(g); previewWire(drag.a, drag.b); return; }
    if (drag.kind === 'wend') { drag.w[drag.end] = snapPt(g); drag.moved = true; $('#lWires').innerHTML = circ.wires.map(wireSvg).join(''); return; }
    if (drag.kind === 'move') {
      const nx = Math.round(g.x - drag.ox), ny = Math.round(g.y - drag.oy);
      const dx = nx - drag.part.x, dy = ny - drag.part.y;
      if (!dx && !dy) return;
      drag.moved = true;
      drag.part.x = nx; drag.part.y = ny;
      for (const r of drag.riders) { r.x += dx; r.y += dy; }
      for (const [w, end] of drag.wiresOn) { w[end] = [w[end][0] + dx, w[end][1] + dy]; }
      const els = [drag.part, ...drag.riders];
      for (const p of els) { const el = svg.querySelector(`[data-part="${p.id}"]`); if (el) { const [cx, cy] = C.center(LIB[p.type]); el.setAttribute('transform', `translate(${p.x * G} ${p.y * G}) rotate(${p.rot || 0} ${cx * G} ${cy * G})`); } }
      $('#lWires').innerHTML = circ.wires.map(wireSvg).join(''); $('#lPins').innerHTML = '';
    }
  });
  function endPointer(ev) {
    pointers.delete(ev.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    svg.classList.remove('pan');
    const d = drag; drag = null;
    if (!d) return;
    const g = toWorld(ev);
    if (d.kind === 'place' || d.kind === 'palette') { if (placing) placeAt(placing, g.x, g.y); return; }
    if (d.kind === 'toggle') {
      if (d.part.type === 'BUTTON') { d.part.props.on = 0; update(); return; }
      if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 8) { d.part.props.on = d.part.props.on ? 0 : 1; save(); update(); }
      return;
    }
    if (d.kind === 'wire') {
      $('#lOver').innerHTML = '';
      if (d.a[0] === d.b[0] && d.a[1] === d.b[1]) return;
      if (circ.wires.some(w => (C.key(...w.a) === C.key(...d.a) && C.key(...w.b) === C.key(...d.b)) || (C.key(...w.a) === C.key(...d.b) && C.key(...w.b) === C.key(...d.a)))) return;
      commit(); const w = { id: nid('w'), a: d.a, b: d.b, color: autoColor(d.a) }; circ.wires.push(w); sel = { kind: 'wire', id: w.id }; update();
      const n = nl.nets.get(nl.netAt(d.a[0], d.a[1])); if (n && n.label) toast('Tersambung ke net ' + n.label, 1400);
      return;
    }
    if (d.kind === 'wend') { if (d.moved) { hist.push(d.snap); redo.length = 0; save(); } update(); return; }
    if (d.kind === 'move') {
      if (d.moved) { hist.push(d.snap); redo.length = 0; save(); update(); reportSnap(d.part); }
      else update();
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', (ev) => { pointers.delete(ev.pointerId); pinch = null; drag = null; $('#lOver').innerHTML = ''; update(); });
  svg.addEventListener('pointerleave', () => { $('#tip').style.display = 'none'; });
  svg.addEventListener('wheel', (ev) => { ev.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(ev.deltaY < 0 ? 1.12 : 1 / 1.12, ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
  // seret dari palet ke papan
  window.addEventListener('pointerup', (ev) => {
    if (drag && drag.kind === 'palette') {
      const r = svg.getBoundingClientRect();
      if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) { const g = toWorld(ev); placeAt(drag.type, g.x, g.y); }
      drag = null;
    }
  });
  window.addEventListener('pointermove', (ev) => { if (drag && drag.kind === 'palette') { const r = svg.getBoundingClientRect(); if (ev.clientX > r.left) ghost(drag.type, toWorld(ev)); } });

  function ghost(type, g) {
    const d = LIB[type];
    const p = { id: '_ghost', type, x: Math.round(g.x - d.w / 2), y: Math.round(g.y - d.h / 2), rot: 0, props: Object.assign({}, d.props), label: '' };
    $('#lOver').innerHTML = partSvg(p, true);
  }
  function previewWire(a, b) {
    const w = { id: '_prev', a, b, color: '#2b8fd6' };
    $('#lOver').innerHTML = wireSvg(w).replace('<g data-wire="_prev">', '<g opacity=".8" pointer-events="none">') +
      `<circle cx="${b[0] * G}" cy="${b[1] * G}" r="9" fill="none" stroke="#2b8fd6" stroke-width="2.5"/>`;
    const pinB = nearestPin({ x: b[0], y: b[1] }, .1);
    showTip(pinB ? pinLabel(pinB) : '', b);
  }
  function pinLabel(pc) {
    if (pc.wire) { const n = nl.nets.get(nl.netAt(pc.x, pc.y)); return 'ujung kabel' + (n && n.label ? ' · ' + n.label : ''); }
    const p = circ.parts.find(q => q.id === pc.part); if (!p) return '';
    const n = nl.nets.get(nl.netOf(p.id, pc.pin));
    const nm = LIB[p.type].cat === 'Breadboard' ? 'lubang ' + pc.pin.replace(/^tp/, '+atas ').replace(/^tn/, '−atas ').replace(/^bp/, '+bawah ').replace(/^bn/, '−bawah ') : (p.ref || '') + ' · ' + (pc.def.label || pc.pin);
    let v = ''; if (sim) { const x = sim.val.get(nl.netOf(p.id, pc.pin)); v = ' = ' + (x === undefined || x === null ? 'mengambang' : x); }
    return nm + (n && n.label ? '  →  ' + n.label : '') + v;
  }
  function showTip(text, gpt) {
    const tip = $('#tip'); if (!text) { tip.style.display = 'none'; return; }
    const r = svg.getBoundingClientRect(), sr = $('#stage').getBoundingClientRect();
    tip.textContent = text; tip.style.display = 'block';
    tip.style.left = (view.x + gpt[0] * G * view.z + r.left - sr.left + 14) + 'px'; tip.style.top = (view.y + gpt[1] * G * view.z + r.top - sr.top - 34) + 'px';
  }
  function hover(ev, g) { const pc = nearestPin(g, .4); showTip(pc ? pinLabel(pc) : '', pc ? [pc.x, pc.y] : null); }

  // ------------------------------------------------------------------ keyboard
  window.addEventListener('keydown', (ev) => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const k = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && k === 'z') { ev.preventDefault(); ev.shiftKey ? redoFn() : undo(); return; }
    if ((ev.ctrlKey || ev.metaKey) && k === 'y') { ev.preventDefault(); redoFn(); return; }
    if (k === 'escape') { stopPlacing(); drag = null; sel = null; $('#lOver').innerHTML = ''; closeModal(); update(); }
    else if (k === 'delete' || k === 'backspace') { ev.preventDefault(); delSel(); }
    else if (k === 'r') rotateSel();
    else if (k === 'w') setTool('wire');
    else if (k === 'v') setTool('select');
    else if (k === 'd') setTool('delete');
    else if (k === 's') setSim(!simOn);
    else if (k === 't') showTruth();
  });

  // ------------------------------------------------------------------ modal: tabel, contoh, tantangan
  function openModal(html) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('click', (ev) => { if (ev.target.id === 'modal' || ev.target.closest('[data-close]')) closeModal(); });

  function ttHtml(tt, target, wrong) {
    const cur = tt.inputs.map(p => (p.props && p.props.on) ? 1 : 0).join('');
    let h = '<table class="tt"><tr>' + tt.inputs.map(p => `<th>${esc(p.label || p.ref)}</th>`).join('') + tt.outputs.map(p => `<th class="o">${esc(p.label || p.ref)}</th>`).join('') + (target ? target.cols.map(c => `<th class="t">target ${esc(c)}</th>`).join('') : '') + '</tr>';
    tt.rows.forEach((r, i) => {
      h += `<tr class="${r.in.join('') === cur ? 'cur' : ''}">` + r.in.map(v => `<td class="${v ? 'one' : ''}">${v}</td>`).join('');
      h += r.out.map(v => `<td class="${v === 1 ? 'one' : ''}">${v === null || v === undefined ? '?' : v}</td>`).join('');
      if (target) h += target.rows[i].map(v => `<td class="${wrong && wrong.includes(i) ? 'bad' : 'good'}">${v}</td>`).join('');
      h += '</tr>';
    });
    return h + '</table>';
  }
  function showTruth() {
    const tt = C.truthTable(circ);
    let h = '<h2>🔢 Tabel kebenaran</h2>';
    if (tt.error) h += `<p class="c-info">${esc(tt.error)} Saklar = masukan, lampu logika / LED / tampilan biner = keluaran.</p>`;
    else {
      h += `<p class="c-note">Dihitung otomatis dengan mencoba semua ${tt.rows.length} kombinasi saklar. Baris bergaris biru = posisi saklar sekarang.</p>` + ttHtml(tt);
      const n = tt.inputs.length;
      const bin = n >= 2 && n <= 4 ? `<p class="c-callout">Urutan baris = bilangan biner ${tt.inputs.map(p => esc(p.label)).join('')} dari 0 sampai ${tt.rows.length - 1}. Nilai tiap posisi dari kanan: ${Array.from({ length: n }, (_, i) => 1 << (n - 1 - i)).join(', ')}. Contoh ${n === 2 ? '1 1 = 2 + 1 = 3' : n === 3 ? '1 0 1 = 4 + 0 + 1 = 5' : '1 0 1 0 = 8 + 0 + 2 + 0 = 10'}.</p>` : '';
      h += bin;
    }
    h += '<div class="row" style="justify-content:center"><button class="c-btn" data-close>Tutup</button></div>';
    openModal(h);
  }
  function confirmReplace() { return !circ.parts.length || confirm('Ganti isi papan sekarang? (bisa dibatalkan dengan ↶)'); }
  function loadCirc(c, msg) { commit(); circ = sanitize(c); refreshUid(); sel = null; stopPlacing(); update(); requestAnimationFrame(fit); if (msg) toast(msg, 3600); }
  function showExamples() {
    openModal('<h2>📚 Contoh rangkaian</h2><div class="list">' + T.EXAMPLES.map(e => `<button class="c-btn" data-ex="${e.id}"><span><b>${esc(e.title)}</b><small>${esc(e.desc)}</small></span></button>`).join('') + '</div><div class="row" style="justify-content:center;margin-top:.6rem"><button class="c-btn" data-close>Tutup</button></div>');
    $$('[data-ex]').forEach(b => b.addEventListener('click', () => {
      if (!confirmReplace()) return;
      const ex = T.EXAMPLES.find(e => e.id === b.dataset.ex); challenge = null; renderGoal();
      loadCirc(T.build(ex.id), ex.desc); closeModal();
      if (ex.id === 'salah-wiring') setTimeout(() => toast('Lihat panel Pesan: ⛔ = berbahaya. Ketuk pesan untuk menyorot komponen.', 4200), 600);
    }));
  }
  function showChallenges() {
    openModal('<h2>🏆 Tantangan logika</h2><p class="c-note">Papan disiapkan dengan saklar dan lampu yang dibutuhkan. Rangkai gerbangnya, lalu tekan “Cek”.</p><div class="list">' +
      T.CHALLENGES.map(c => `<button class="c-btn" data-ch="${c.id}"><span><b>${esc(c.title)}</b><small>Masukan ${c.inputs.join(', ')} → keluaran ${c.outputs.join(', ')}${c.only ? ' · hanya ' + c.only[0] : ''}${c.ban ? ' · tanpa XOR' : ''}</small></span></button>`).join('') +
      '</div><div class="row" style="justify-content:center;margin-top:.6rem"><button class="c-btn" data-close>Tutup</button></div>');
    $$('[data-ch]').forEach(b => b.addEventListener('click', () => {
      if (!confirmReplace()) return;
      challenge = T.CHALLENGES.find(c => c.id === b.dataset.ch);
      const bld = T.B();
      challenge.inputs.forEach((lab, i) => bld.add('SWITCH', 0, 2 + i * 6, {}, 0, lab));
      challenge.outputs.forEach((lab, i) => bld.add('PROBE', 30, 3 + i * 6, {}, 0, lab));
      loadCirc(bld.c, 'Tantangan dimulai: ' + challenge.title); closeModal(); setSim(true); renderGoal();
    }));
  }
  function renderGoal() {
    const g = $('#goal');
    if (!challenge) { g.hidden = true; return; }
    g.hidden = false;
    g.innerHTML = `<div class="t">🏆 ${esc(challenge.title)}</div><p class="c-note" style="margin:.3rem 0">${esc(challenge.hint)}</p>
      <div class="row"><button class="c-btn sm go" id="gCheck">✔ Cek</button><button class="c-btn sm" id="gTarget">🎯 Target</button><button class="c-btn sm" id="gQuit">Keluar</button></div>`;
    $('#gCheck').addEventListener('click', () => {
      const r = T.check(challenge, circ);
      let h = `<h2>${r.pass ? '🎉 Berhasil!' : '🔍 Belum tepat'}</h2>` + r.msgs.map(m => `<p class="${r.pass ? 'c-find' : 'c-info'}">${esc(m)}</p>`).join('');
      if (r.rows) { const tt = C.truthTable({ parts: circ.parts.filter(p => p.type !== 'BIN4'), wires: circ.wires }); h += ttHtml(tt, { cols: challenge.outputs, rows: challenge.target }, r.wrong); }
      openModal(h + '<div class="row" style="justify-content:center"><button class="c-btn" data-close>Tutup</button></div>');
    });
    $('#gTarget').addEventListener('click', () => {
      const n = challenge.inputs.length;
      let h = `<h2>🎯 Target: ${esc(challenge.title)}</h2><table class="tt"><tr>${challenge.inputs.map(i => `<th>${i}</th>`).join('')}${challenge.outputs.map(o => `<th class="o">${o}</th>`).join('')}</tr>`;
      challenge.target.forEach((row, m) => { h += '<tr>' + Array.from({ length: n }, (_, i) => (m >> (n - 1 - i)) & 1).map(v => `<td class="${v ? 'one' : ''}">${v}</td>`).join('') + row.map(v => `<td class="${v ? 'one' : ''}">${v}</td>`).join('') + '</tr>'; });
      openModal(h + '</table><div class="row" style="justify-content:center"><button class="c-btn" data-close>Tutup</button></div>');
    });
    $('#gQuit').addEventListener('click', () => { challenge = null; renderGoal(); });
  }

  // ------------------------------------------------------------------ ekspor / impor
  function download(name, data, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function exportPng() {
    const bb = world.getBBox(), pad = 30;
    const w = Math.ceil(bb.width + pad * 2), h = Math.ceil(bb.height + pad * 2);
    const clone = `<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="${bb.x - pad} ${bb.y - pad} ${w} ${h}"><defs>${$('#defs').innerHTML}</defs><rect x="${bb.x - pad}" y="${bb.y - pad}" width="${w}" height="${h}" fill="#eceee9"/>${$('#lBB').outerHTML}${$('#lParts').outerHTML}${$('#lWires').outerHTML}${$('#lPins').outerHTML}</svg>`;
    const img = new Image(), scale = 2;
    img.onload = () => { const cv = document.createElement('canvas'); cv.width = w * scale; cv.height = h * scale; const ctx = cv.getContext('2d'); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0); cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'papan-rangkai.png'; a.click(); }); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clone);
  }

  // ------------------------------------------------------------------ tombol
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('#btnSim').addEventListener('click', () => setSim(!simOn));
  $('#btnTT').addEventListener('click', showTruth);
  $('#btnCheck').addEventListener('click', () => {
    const errs = ercList.filter(e => e.level === 'error').length, warns = ercList.filter(e => e.level === 'warn').length;
    toast(errs ? `⛔ ${errs} kesalahan berbahaya, ⚠️ ${warns} peringatan · lihat panel Pesan` : warns ? `⚠️ ${warns} peringatan · lihat panel Pesan` : '✅ Tidak ada masalah listrik yang terdeteksi', 3600);
    $$('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === 'msg')); $('#tabMsg').hidden = false; $('#tabNet').hidden = true;
    if (innerWidth <= 800) $('#side').scrollIntoView({ behavior: 'smooth' });
  });
  $('#btnEx').addEventListener('click', showExamples);
  $('#btnCh').addEventListener('click', showChallenges);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redoFn);
  $('#btnStyle').addEventListener('click', () => { wireStyle = wireStyle === 'curve' ? 'ortho' : 'curve'; $('#btnStyle').textContent = wireStyle === 'curve' ? '〽 Breadboard' : '⌐ Skematik'; save(); update(); });
  $('#btnSave').addEventListener('click', () => download('papan-rangkai.json', JSON.stringify({ app: 'pilar-rangkai', v: 1, circ }, null, 1), 'application/json'));
  $('#btnOpen').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); loadCirc(j.circ || j, 'File dibuka: ' + f.name); } catch (e) { toast('File tidak bisa dibaca: ' + e.message); }
    ev.target.value = '';
  });
  $('#btnPng').addEventListener('click', exportPng);
  $('#btnClear').addEventListener('click', () => { if (!circ.parts.length && !circ.wires.length) return; if (!confirm('Kosongkan papan? (bisa dibatalkan dengan ↶)')) return; commit(); circ = { parts: [], wires: [] }; sel = null; challenge = null; renderGoal(); update(); });
  $('#btnPal').addEventListener('click', () => $('#pal').classList.toggle('open'));
  $('#zIn').addEventListener('click', () => { const r = svg.getBoundingClientRect(); zoomAt(1.2, r.width / 2, r.height / 2); });
  $('#zOut').addEventListener('click', () => { const r = svg.getBoundingClientRect(); zoomAt(1 / 1.2, r.width / 2, r.height / 2); });
  $('#zFit').addEventListener('click', fit);
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => { $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); $('#tabMsg').hidden = b.dataset.tab !== 'msg'; $('#tabNet').hidden = b.dataset.tab !== 'net'; }));
  $('#btnCopyNet').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#netTxt').textContent); toast('Netlist disalin'); } catch (e) { toast('Tidak bisa menyalin di browser ini'); } });
  $('#btnNetFile').addEventListener('click', () => download('papan-rangkai.net', $('#netTxt').textContent, 'text/plain'));
  window.addEventListener('resize', () => applyView());

  // ------------------------------------------------------------------ mulai
  $('#defs').innerHTML = A.DEFS + `<pattern id="gridP" width="${G}" height="${G}" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1.15" fill="#c3c9c1"/></pattern>` +
    `<style>.flow{animation:rkflow .6s linear infinite}@keyframes rkflow{to{stroke-dashoffset:-15}}@media(prefers-reduced-motion:reduce){.flow{animation:none}}</style>`;
  buildPalette();
  const qs = new URLSearchParams(location.search);
  if (qs.get('contoh') && T.EXAMPLES.some(e => e.id === qs.get('contoh'))) circ = sanitize(T.build(qs.get('contoh')));
  else if (!load()) circ = sanitize(T.build('and-dasar'));
  refreshUid();
  $('#btnStyle').textContent = wireStyle === 'curve' ? '〽 Breadboard' : '⌐ Skematik';
  update(); requestAnimationFrame(fit);
  window.PapanRangkai = { get circ() { return circ; }, update, setSim, load: (c) => loadCirc(c), C, T };
})();
