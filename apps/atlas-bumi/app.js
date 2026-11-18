/* PILAR · Atlas Bumi 3D v1.0
   Bola dunia three.js (r128): siang–malam nyata dari posisi matahari, lampu kota, awan prosedural,
   atmosfer, bintang, garis lintang–bujur, batas negara, gunung api, terbang ke tempat/koordinat,
   info letak astronomis + zona waktu + arah kiblat, misi & tebak lokasi. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const G = window.AtlasGeo, PLACES = window.ATLAS_PLACES.map(p => ({n: p[0], lat: p[1], lon: p[2], k: p[3], f: p[4]}));
  const D2R = Math.PI / 180, html = document.documentElement;
  const LITE = html.dataset.fx === 'lite';
  let mapOn = false;   // true saat bola sedang dibuka menjadi peta
  const JKT = [-6.2, 106.82];
  if (!window.THREE || !window.WebGLRenderingContext) { $('err').style.display = 'grid'; $('load').classList.add('off'); return; }

  /* ---------- simpanan ---------- */
  const KEY = 'pilar_atlas_v1';
  const ST = Object.assign({done: {}, visited: {}, layers: {awan: true, lampu: true, grid: false, batas: true, api: false, tempat: true, siang: true}}, (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (_) {} };

  /* ---------- renderer ---------- */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias: !LITE, powerPreference: 'high-performance'}); }
  catch (e) { $('err').style.display = 'grid'; $('load').classList.add('off'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1 : 1.75));
  $('globe').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.005, 200);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {enablePan: false, enableDamping: true, dampingFactor: .08, minDistance: 1.08, maxDistance: 7, rotateSpeed: .55, zoomSpeed: .9, autoRotateSpeed: .35});

  const ll2v = (lat, lon, r = 1) => { const phi = (lon + 180) * D2R, th = lat * D2R; return new THREE.Vector3(-Math.cos(phi) * Math.cos(th) * r, Math.sin(th) * r, Math.sin(phi) * Math.cos(th) * r); };
  const v2ll = v => { const n = v.clone().normalize(); const lat = Math.asin(n.y) / D2R; let lon = Math.atan2(n.z, -n.x) / D2R - 180; if (lon < -180) lon += 360; return [lat, lon]; };

  /* ---------- tekstur ---------- */
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  let pending = 0;
  const tex = url => { pending++; return loader.load(url, t => { t.anisotropy = Math.min(8, maxAniso); if (--pending === 0) $('load').classList.add('off'); }, undefined, () => { if (--pending === 0) $('load').classList.add('off'); }); };
  const dayTex = tex('./tex/day.jpg'), nightTex = tex('./tex/night.jpg'), waterTex = tex('./tex/water.jpg'), topoTex = tex('./tex/topo.jpg');
  setTimeout(() => $('load').classList.add('off'), 9000);

  /* ---------- Bumi (shader siang–malam) ---------- */
  const U = {
    dayMap: {value: dayTex}, nightMap: {value: nightTex}, waterMap: {value: waterTex}, topoMap: {value: topoTex},
    sunDir: {value: new THREE.Vector3(1, 0, 0)}, realSun: {value: 1}, lights: {value: 1}
  };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, LITE ? 96 : 160, LITE ? 64 : 110), new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.); vP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D dayMap,nightMap,waterMap,topoMap; uniform vec3 sunDir; uniform float realSun,lights;
      varying vec2 vUv; varying vec3 vN; varying vec3 vP;
      void main(){
        vec3 n=normalize(vN); float d=dot(n,sunDir);
        float k = realSun>0.5 ? smoothstep(-0.10,0.16,d) : 1.0;
        vec3 day=texture2D(dayMap,vUv).rgb;
        float tp=texture2D(topoMap,vUv).r;
        day*= 0.92+0.16*tp;
        float lit = realSun>0.5 ? 0.16+0.98*clamp(d*1.15+0.12,0.0,1.0) : 1.0;
        vec3 col = day*lit;
        vec3 night=texture2D(nightMap,vUv).rgb; night=pow(night,vec3(1.35))*vec3(1.9,1.55,1.05)*lights;
        col = mix(night + day*0.05, col, k);
        float w=texture2D(waterMap,vUv).r; vec3 v=normalize(cameraPosition-vP); vec3 h=normalize(sunDir+v);
        col += vec3(0.85,0.92,1.0)*pow(max(dot(n,h),0.0),90.0)*w*0.38*k*realSun;
        float fr=pow(1.0-max(dot(n,v),0.0),2.6); col += vec3(0.25,0.55,1.0)*fr*0.55*(0.25+0.75*k);
        col += vec3(1.0,0.42,0.12)*0.22*max(0.0,1.0-abs(d)*6.0)*realSun;
        gl_FragColor=vec4(col,1.0);
      }`
  }));
  scene.add(earth);

  /* atmosfer */
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.075, 64, 48), new THREE.ShaderMaterial({
    uniforms: {sunDir: U.sunDir, realSun: U.realSun}, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(normalMatrix*normal); vW=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 sunDir; uniform float realSun; varying vec3 vN; varying vec3 vW;
      void main(){ float i=pow(clamp(0.72-dot(vN,vec3(0.,0.,1.)),0.,1.),3.2); float day= realSun>0.5 ? 0.25+0.75*smoothstep(-0.35,0.35,dot(-vW,sunDir)) : 1.0;
        gl_FragColor=vec4(vec3(0.32,0.62,1.0)*i*2.2*day,1.0); }`
  }));
  scene.add(atmo);

  /* awan prosedural (noise 3D, tanpa tekstur) */
  const cloudU = {sunDir: U.sunDir, realSun: U.realSun, time: {value: 0}};
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, LITE ? 72 : 128, LITE ? 48 : 90), new THREE.ShaderMaterial({
    uniforms: cloudU, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vO; varying vec3 vN; void main(){ vO=position; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 sunDir; uniform float realSun,time; varying vec3 vO; varying vec3 vN;
      float h(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float nz(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<${LITE ? 4 : 6};i++){ s+=a*nz(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 p=normalize(vO); float lat=abs(p.y);
        vec3 q=p*3.2+vec3(time*0.02,0.0,time*0.012);
        float n=fbm(q+fbm(q*1.7)*0.9);
        float band=0.62-0.08*smoothstep(0.0,0.35,lat)+0.07*smoothstep(0.35,0.75,lat);
        float c=smoothstep(band,band+0.2,n);
        float d=dot(normalize(vN),sunDir); float lit= realSun>0.5 ? clamp(d*1.4+0.25,0.06,1.0) : 1.0;
        gl_FragColor=vec4(vec3(lit),c*0.82);
      }`
  }));
  scene.add(clouds);

  /* bintang */
  {
    const n = LITE ? 1500 : 3500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 20, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
      const t = Math.random(), b = .45 + Math.random() * .55; col.set(t < .15 ? [b, b * .8, b * .6] : t < .3 ? [b * .75, b * .85, b] : [b, b, b], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .9})));
  }

  /* ---------- garis lintang–bujur ---------- */
  const grid = new THREE.Group(); scene.add(grid);
  {
    const seg = [], R = 1.003;
    for (let lat = -75; lat <= 75; lat += 15) { if (!lat) continue; for (let lon = -180; lon < 180; lon += 3) seg.push(ll2v(lat, lon, R), ll2v(lat, lon + 3, R)); }
    for (let lon = -180; lon < 180; lon += 15) { if (!lon) continue; for (let lat = -88; lat < 88; lat += 3) seg.push(ll2v(lat, lon, R), ll2v(lat + 3, lon, R)); }
    grid.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({color: 0x9fd8ff, transparent: true, opacity: .22, depthWrite: false})));
    const special = (pts, color, op = .95) => grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color, transparent: true, opacity: op})));
    const ring = lat => Array.from({length: 181}, (_, i) => ll2v(lat, -180 + i * 2, 1.004));
    special(ring(0), 0xffe27c); special(ring(23.44), 0xffa24c, .7); special(ring(-23.44), 0xffa24c, .7); special(ring(66.56), 0x9fe3ff, .55); special(ring(-66.56), 0x9fe3ff, .55);
    special(Array.from({length: 91}, (_, i) => ll2v(-90 + i * 2, 0, 1.004)), 0x5ee9ff); special(Array.from({length: 91}, (_, i) => ll2v(-90 + i * 2, 180, 1.004)), 0xa78bfa, .5);
    // kotak letak astronomis Indonesia (6° LU – 11° LS, 95° BT – 141° BT)
    const box = []; for (let lon = 95; lon <= 141; lon++) box.push(ll2v(6, lon, 1.005)); for (let lat = 6; lat >= -11; lat--) box.push(ll2v(lat, 141, 1.005));
    for (let lon = 141; lon >= 95; lon--) box.push(ll2v(-11, lon, 1.005)); for (let lat = -11; lat <= 6; lat++) box.push(ll2v(lat, 95, 1.005));
    special(box, 0xff5fa2, .9);
  }
  const GRID_LABELS = [[0, 60, 'Khatulistiwa 0°'], [23.44, 60, 'Garis Balik Utara 23½° LU'], [-23.44, 60, 'Garis Balik Selatan 23½° LS'], [66.56, 30, 'Lingkar Arktik'], [-66.56, 30, 'Lingkar Antartika'], [40, 0, 'Bujur 0° · Greenwich'], [8, 118, '🇮🇩 6° LU – 11° LS · 95° BT – 141° BT']];

  /* ---------- batas negara ---------- */
  let COUNTRIES = [];
  const borders = new THREE.Group(); scene.add(borders);
  const hiMat = new THREE.LineBasicMaterial({color: 0x5ee9ff, transparent: true, opacity: 1});
  let hiLine = null, hiName = null;
  fetch('./data/countries.json').then(r => r.json()).then(list => {
    COUNTRIES = G.prepCountries(list);
    const seg = [];
    COUNTRIES.forEach(c => c.r.forEach(r => { for (let i = 1; i < r.length; i++) seg.push(ll2v(r[i - 1][1], r[i - 1][0], 1.0016), ll2v(r[i][1], r[i][0], 1.0016)); }));
    borders.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: .32, depthWrite: false})));
    buildSearchIndex();
  }).catch(() => {});
  function highlight(c) {
    if ((c && c.n) === hiName) return; hiName = c ? c.n : null;
    if (hiLine) { scene.remove(hiLine); hiLine.geometry.dispose(); hiLine = null; }
    if (!c) return;
    const seg = []; c.r.forEach(r => { for (let i = 1; i < r.length; i++) seg.push(ll2v(r[i - 1][1], r[i - 1][0], 1.0022), ll2v(r[i][1], r[i][0], 1.0022)); });
    hiLine = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), hiMat); scene.add(hiLine);
  }

  /* ---------- titik: tempat & gunung api ---------- */
  function sprite(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); return t; }
  const dotTex = sprite(x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#5ee9ff'); g.addColorStop(1, '#5ee9ff00'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const volTex = sprite(x => { x.fillStyle = '#ff7a2a'; x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(32, 8); x.lineTo(58, 54); x.lineTo(6, 54); x.closePath(); x.fill(); x.stroke(); });
  const placePts = new THREE.Points(new THREE.BufferGeometry().setFromPoints(PLACES.map(p => ll2v(p.lat, p.lon, 1.004))), new THREE.PointsMaterial({map: dotTex, size: 14, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  scene.add(placePts);
  let VOLC = [], volPts = null;
  fetch('./data/volcanoes.json').then(r => r.json()).then(v => {
    VOLC = v.map(a => ({n: a[0], c: a[1], lat: a[2], lon: a[3], e: a[4]}));
    volPts = new THREE.Points(new THREE.BufferGeometry().setFromPoints(VOLC.map(p => ll2v(p.lat, p.lon, 1.005))), new THREE.PointsMaterial({map: volTex, size: 11, sizeAttenuation: false, transparent: true, depthWrite: false}));
    scene.add(volPts); applyLayers();
  }).catch(() => {});

  /* ---------- pin tujuan & jalur terbang ---------- */
  const pin = new THREE.Group(); scene.add(pin); pin.visible = false;
  const ringM = new THREE.Mesh(new THREE.RingGeometry(.012, .016, 48), new THREE.MeshBasicMaterial({color: 0x5ee9ff, transparent: true, side: THREE.DoubleSide, depthWrite: false}));
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .12, 8), new THREE.MeshBasicMaterial({color: 0x9ff3ff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false}));
  beam.position.y = .06; pin.add(ringM, beam);
  const ring2 = ringM.clone(); ring2.material = ringM.material.clone(); pin.add(ring2);
  function placePin(lat, lon) {
    pin.visible = true; pin.position.copy(ll2v(lat, lon, 1.003));
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pin.position.clone().normalize());
    ringM.rotation.x = ring2.rotation.x = -Math.PI / 2;
  }
  const guessPin = pin.clone(); guessPin.children.forEach(m => { m.material = m.material.clone(); m.material.color.set(0xffb347); }); scene.add(guessPin); guessPin.visible = false;
  let arc = null, arcT = 0, arcPts = [], plane = null;
  function drawArc(a, b, color = 0x5ee9ff) {
    if (arc) { scene.remove(arc); arc.geometry.dispose(); }
    const ang = G.distance(a, b) / G.R_EARTH, N = 96; arcPts = [];
    for (let i = 0; i <= N; i++) { const f = i / N, p = G.interpolate(a, b, f); arcPts.push(ll2v(p[0], p[1], 1.004 + Math.sin(Math.PI * f) * (0.04 + ang * .12))); }
    arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineBasicMaterial({color, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false}));
    arc.geometry.setDrawRange(0, 0); scene.add(arc); arcT = 0;
    if (!plane) { plane = new THREE.Sprite(new THREE.SpriteMaterial({map: dotTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false})); plane.scale.set(.05, .05, 1); scene.add(plane); }
    plane.visible = true;
  }

  /* ---------- label HTML ---------- */
  const LBL = [];
  function label(text, lat, lon, cls, r = 1.01) { const el = document.createElement('div'); el.className = 'lbl ' + (cls || ''); el.textContent = text; $('labels').appendChild(el); const o = {el, pos: ll2v(lat, lon, r), cls, lat, lon}; LBL.push(o); return o; }
  const placeLbls = PLACES.map(p => Object.assign(label(p.n, p.lat, p.lon, 'pl'), {p}));
  const gridLbls = GRID_LABELS.map(g => label(g[2], g[0], g[1], 'grat', 1.006));
  let selLbl = null, guessLbl = null;
  const tmp = new THREE.Vector3(), camN = new THREE.Vector3();
  function updateLabels() {
    if (mapOn) { for (const o of LBL) if (o.el.style.display !== 'none') o.el.style.display = 'none'; mapLabels(); return; }
    if (sizeLbl.style.display !== 'none') sizeLbl.style.display = 'none';
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight, dist = camera.position.length();
    camN.copy(camera.position).normalize();
    const horizon = 1 / dist + .03, showPlaces = ST.layers.tempat && dist < 2.6;
    let shown = 0;
    for (const o of LBL) {
      let vis = o.el === (selLbl && selLbl.el) || o.el === (guessLbl && guessLbl.el) || (o.cls === 'grat' && ST.layers.grid) ||
        (o.cls === 'pl' && showPlaces && (o.p.k !== 'kota' || dist < 1.75));
      if (vis) { tmp.copy(o.pos).normalize(); if (tmp.dot(camN) < horizon) vis = false; }
      if (vis && o.cls === 'pl' && ++shown > (dist < 1.5 ? 40 : 18)) vis = false;
      if (!vis) { if (o.el.style.display !== 'none') o.el.style.display = 'none'; continue; }
      tmp.copy(o.pos).project(camera);
      const x = (tmp.x * .5 + .5) * w, y = (-tmp.y * .5 + .5) * h;
      o.el.style.display = ''; o.el.style.transform = `translate(${x}px,${y}px) translate(-50%,${o.el.classList.contains('sel') ? '-175%' : '-140%'})`;
    }
  }

  /* ---------- matahari & waktu ---------- */
  let live = true, lapse = false, simTime = new Date();
  function setSun() {
    const s = G.subsolar(simTime); U.sunDir.value.copy(ll2v(s[0], s[1])).normalize();
    const wib = new Date(simTime.getTime() + 7 * 36e5);
    $('clk').textContent = [wib.getUTCHours(), wib.getUTCMinutes(), wib.getUTCSeconds()].map(v => String(v).padStart(2, '0')).join('.');
    $('clkSub').textContent = `WIB · ${wib.getUTCDate()} ${BLN[wib.getUTCMonth()]} ${wib.getUTCFullYear()} · ${live ? 'WAKTU NYATA' : 'SIMULASI'}`;
    $('tLbl').textContent = G.hhmm(wib.getUTCHours() + wib.getUTCMinutes() / 60) + ' WIB';
    $('dLbl').textContent = `${wib.getUTCDate()} ${BLN[wib.getUTCMonth()]} · ${seasonNote(wib.getUTCMonth(), wib.getUTCDate())}`;
    if (document.activeElement !== $('tHour')) $('tHour').value = wib.getUTCHours() + wib.getUTCMinutes() / 60;
    if (document.activeElement !== $('tDay')) $('tDay').value = Math.floor((wib - Date.UTC(wib.getUTCFullYear(), 0, 1)) / 864e5);
  }
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function seasonNote(m, d) {
    if ((m === 2 && d >= 18) || (m === 2 && d <= 23)) return 'ekuinoks: matahari di khatulistiwa';
    if (m === 5 && d >= 18) return 'matahari di 23½° LU';
    if (m === 11 && d >= 18) return 'matahari di 23½° LS';
    if ((m === 8 && d >= 20)) return 'ekuinoks September';
    return m >= 3 && m <= 7 ? 'matahari di belahan utara' : m >= 9 || m <= 1 ? 'matahari di belahan selatan' : 'menuju ekuinoks';
  }
  function setFromSliders() {
    live = false; $('live').classList.remove('on');
    const y = simTime.getUTCFullYear(), day = +$('tDay').value, h = +$('tHour').value;
    simTime = new Date(Date.UTC(y, 0, 1) + day * 864e5 + (h - 7) * 36e5);
    setSun(); checkNight();
  }
  $('tHour').oninput = setFromSliders; $('tDay').oninput = setFromSliders;
  $('live').onclick = () => { live = true; lapse = false; $('live').classList.add('on'); $('lapse').classList.remove('on'); simTime = new Date(); setSun(); };
  $('lapse').onclick = () => { lapse = !lapse; live = false; $('lapse').classList.toggle('on', lapse); $('live').classList.remove('on'); say(lapse ? '⏩ Waktu dipercepat: 1 detik = 1 jam. Lihat garis siang–malam bergerak dari <b>timur ke barat</b> karena Bumi berputar ke timur!' : 'Waktu berhenti dipercepat.'); };

  /* ---------- lapisan ---------- */
  const LAYERS = [['siang', '☀️ Siang–malam nyata'], ['awan', '☁️ Awan'], ['lampu', '🌃 Lampu kota (malam)'], ['batas', '🗺️ Batas negara'], ['grid', '🧭 Garis lintang & bujur'], ['tempat', '📍 Nama tempat'], ['api', '🌋 Gunung api (Cincin Api)']];
  $('layers').innerHTML = LAYERS.map(([k, t]) => `<div class="tog" data-l="${k}" role="switch" tabindex="0"><span>${t}</span><i></i></div>`).join('');
  document.querySelectorAll('.tog[data-l]').forEach(el => {
    const flip = () => { ST.layers[el.dataset.l] = !ST.layers[el.dataset.l]; save(); applyLayers(); onLayer(el.dataset.l); };
    el.onclick = flip; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  });
  function applyLayers() {
    const L = ST.layers;
    document.querySelectorAll('.tog[data-l]').forEach(el => { const on = !!L[el.dataset.l]; el.classList.toggle('on', on); el.setAttribute('aria-checked', on); });
    U.lights.value = L.lampu ? 1 : 0; U.realSun.value = L.siang ? 1 : 0;
    if (mapOn) return;
    clouds.visible = L.awan; U.lights.value = L.lampu ? 1 : 0; U.realSun.value = L.siang ? 1 : 0;
    grid.visible = L.grid; borders.visible = L.batas; placePts.visible = L.tempat; if (volPts) volPts.visible = L.api;
  }
  function onLayer(k) {
    if (k === 'api' && ST.layers.api) { say('🌋 Lihat deretan segitiga oranye mengelilingi Samudra Pasifik: itulah <b>Cincin Api</b>. Indonesia punya lebih dari 120 gunung api aktif karena berada di pertemuan lempeng tektonik.'); flyTo(-2, 118, {dist: 2.6, silent: true}); setTimeout(() => mission('api'), 2600); }
    if (k === 'grid' && ST.layers.grid) say('🧭 <b>Garis lintang</b> mendatar (mengukur utara–selatan, 0°–90°), <b>garis bujur</b> tegak (timur–barat, 0°–180°). Kotak merah muda = letak astronomis Indonesia.');
  }

  /* ---------- terbang ---------- */
  let flight = null;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function flyTo(lat, lon, opt = {}) {
    const target = ll2v(lat, lon).normalize(), start = camera.position.clone().normalize(), d0 = camera.position.length();
    const d1 = opt.dist || Math.min(d0, 1.9), ang = start.angleTo(target);
    flight = {q: new THREE.Quaternion().setFromUnitVectors(start, target), start, d0, d1, lift: Math.min(1.6, ang * .75), t: 0, dur: 1100 + 1500 * ang / Math.PI, done: opt.done};
    controls.enabled = false; controls.autoRotate = false; $('spin').classList.remove('on');
  }
  const qI = new THREE.Quaternion(), qT = new THREE.Quaternion();
  function stepFlight(dt) {
    if (!flight) return;
    flight.t = Math.min(1, flight.t + dt * 1000 / flight.dur); const e = ease(flight.t);
    qT.copy(qI).slerp(flight.q, e);
    const dist = flight.d0 + (flight.d1 - flight.d0) * e + flight.lift * Math.sin(Math.PI * e);
    camera.position.copy(flight.start).applyQuaternion(qT).multiplyScalar(dist); camera.lookAt(0, 0, 0);
    if (flight.t >= 1) { const cb = flight.done; flight = null; controls.enabled = true; controls.update(); cb && cb(); }
  }
  let current = null;
  function go(lat, lon, name, how) {
    if (mapOn || MP.m > 0) { openMap(0); setTimeout(() => go(lat, lon, name, how), 1800); return; }
    if (window.innerWidth < 900 && window.scrollY > 40) window.scrollTo({top: 0, behavior: 'smooth'});
    const from = current ? [current.lat, current.lon] : null;
    current = {lat, lon, name, how};
    if (from && G.distance(from, [lat, lon]) > 30) drawArc(from, [lat, lon]);
    flyTo(lat, lon, {dist: name ? 1.75 : Math.min(camera.position.length(), 2.2), done: () => { placePin(lat, lon); showPlace(lat, lon, name); checkVisit(lat, lon, how); }});
    try { window.PILAR_PULSE?.track?.('atlas_fly', {name: name || 'koordinat', how}); } catch (_) {}
  }

  /* ---------- info tempat ---------- */
  function showPlace(lat, lon, name) {
    const p = [lat, lon], c = COUNTRIES.length ? G.countryAt(COUNTRIES, lat, lon) : null;
    const cname = c ? (G.NAME_ID[c.n] || c.n) : null, where = cname || G.ocean(lat, lon);
    const tz = G.timeZone(p, c && c.n), now = simTime, local = new Date(now.getTime() + tz.off * 36e5);
    const el = G.sunElevation(p, now), dj = G.distance(JKT, p), bj = G.bearing(JKT, p), qb = G.qibla(p), dm = G.distance(p, G.MECCA);
    const info = PLACES.find(x => x.n === name);
    const sunTxt = el > 6 ? `☀️ Siang (matahari ${Math.round(el)}° di atas cakrawala)` : el > -6 ? '🌅 Senja / fajar' : `🌙 Malam (matahari ${Math.round(-el)}° di bawah cakrawala)`;
    const nearP = name ? null : PLACES.map(x => [x, G.distance(p, [x.lat, x.lon])]).sort((a, b) => a[1] - b[1])[0];
    const title = name || (cname ? 'Titik di ' + cname : 'Titik di ' + where);
    if (selLbl) { selLbl.el.remove(); LBL.splice(LBL.indexOf(selLbl), 1); }
    selLbl = label('📍 ' + (name || G.dec(lat, 2) + '°, ' + G.dec(lon, 2) + '°'), lat, lon, 'sel', 1.02);
    $('place').style.display = '';
    $('place').innerHTML = `<div class="h">Lokasi terpilih <b>${c ? (G.CONT_ID[c.c] || c.c) : 'perairan'}</b></div>
      <div class="info"><h2>${title}</h2><div class="sub">${cname && name ? cname + ' · ' : ''}${lat >= 0 ? 'belahan bumi utara' : 'belahan bumi selatan'} · ${lon >= 0 ? 'bujur timur' : 'bujur barat'}</div></div>
      <div class="grid2">
        <div class="cell w"><small>Letak astronomis</small><b>${G.dms(lat, true)} · ${G.dms(lon, false)}</b></div>
        <div class="cell"><small>Lintang (desimal)</small><b>${G.dec(lat, 4)}°</b></div><div class="cell"><small>Bujur (desimal)</small><b>${G.dec(lon, 4)}°</b></div>
        <div class="cell"><small>Zona waktu</small><b>${tz.name.split(' ')[0]}</b></div><div class="cell"><small>Jam di sana</small><b>${G.hhmm(local.getUTCHours() + local.getUTCMinutes() / 60)}</b></div>
        <div class="cell w"><small>Matahari sekarang</small><b>${sunTxt}</b></div>
        ${nearP && nearP[1] < 300 ? `<div class="cell w"><small>Tempat terdekat</small><b>📍 ${nearP[0].n} · ${nearP[1] < 1 ? '< 1' : Math.round(nearP[1]).toLocaleString('id-ID')} km</b></div>` : ''}
        <div class="cell w"><small>Dari Jakarta</small><b>${dj < 15 ? 'Ini Jakarta, titik acuan kita 📌' : `${Math.round(dj).toLocaleString('id-ID')} km ke arah ${G.compass(bj)} · ±${(dj / 850).toFixed(1).replace('.', ',')} jam terbang`}</b></div>
        <div class="cell w qibla"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="none" stroke="#5ee9ff55" stroke-width="2"/><text x="20" y="7.5" text-anchor="middle" font-size="6" fill="#8fa6c8" font-weight="900">U</text><g transform="rotate(${qb.toFixed(1)} 20 20)"><path d="M20 6 L24 22 L20 19 L16 22Z" fill="#5ef08f"/></g></svg>
          <div><small>Arah kiblat dari sini</small><b>${dm < 3 ? 'Kamu di Mekkah 🕋' : `${Math.round(qb)}° (${G.compass(qb)}) · ${Math.round(dm).toLocaleString('id-ID')} km`}</b></div></div>
      </div>${info ? `<p class="fact">💡 ${info.f}</p>` : ''}
      ${tz.name.includes('perkiraan') ? '<p class="sub" style="margin:.4rem 0 0;font-size:.74rem">Zona waktu resmi tiap negara bisa berbeda; di sini diperkirakan dari bujur ÷ 15° (1 jam setiap 15°).</p>' : ''}`;
  }

  /* ---------- pencarian & koordinat ---------- */
  let INDEX = [];
  function buildSearchIndex() {
    INDEX = PLACES.map(p => ({n: p.n, s: {kota: 'Kota · Indonesia', ikon: 'Ikon Indonesia', alam: 'Alam', dunia: 'Dunia'}[p.k], lat: p.lat, lon: p.lon}))
      .concat(COUNTRIES.map(c => ({n: G.NAME_ID[c.n] || c.n, s: 'Negara · ' + (G.CONT_ID[c.c] || c.c), lat: c.center[0], lon: c.center[1], country: true})));
  }
  buildSearchIndex();
  let sugSel = -1, sugList = [];
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  $('q').oninput = () => {
    const q = norm($('q').value.trim()); sugSel = -1;
    if (!q) { $('sug').classList.remove('on'); return; }
    sugList = INDEX.filter(x => norm(x.n).includes(q)).sort((a, b) => norm(a.n).indexOf(q) - norm(b.n).indexOf(q)).slice(0, 8);
    $('sug').innerHTML = sugList.length ? sugList.map((x, i) => `<button type="button" data-i="${i}"><span>${x.n}</span><small>${x.s}</small></button>`).join('') : '<button type="button" disabled>Tidak ditemukan — coba ketik koordinat di bawah</button>';
    $('sug').classList.add('on');
    $('sug').querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(sugList[+b.dataset.i]));
  };
  $('q').onkeydown = e => {
    const bs = [...$('sug').querySelectorAll('[data-i]')]; if (!bs.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugSel = (sugSel + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length; bs.forEach((b, i) => b.classList.toggle('hi', i === sugSel)); }
    if (e.key === 'Enter') { e.preventDefault(); pick(sugList[Math.max(0, sugSel)]); }
    if (e.key === 'Escape') $('sug').classList.remove('on');
  };
  document.addEventListener('click', e => { if (!e.target.closest('.search')) $('sug').classList.remove('on'); });
  function pick(x) { if (!x) return; $('q').value = x.n; $('sug').classList.remove('on'); $('q').blur(); go(x.lat, x.lon, x.n, 'cari'); }
  function previewCoord() {
    const la = G.parseCoord($('lat').value, true), lo = G.parseCoord($('lon').value, false);
    const f = (v, id, isLat, raw) => { const e = $(id); e.className = raw ? (v == null ? 'bad' : 'ok') : 'ok'; e.textContent = !raw ? '' : v == null ? (isLat ? '✗ contoh: 6°10′ LS atau −6,17' : '✗ contoh: 106°49′ BT atau 106,8') : '= ' + G.dec(v, 4) + '°'; };
    f(la, 'latOk', true, $('lat').value.trim()); f(lo, 'lonOk', false, $('lon').value.trim());
    return [la, lo];
  }
  $('lat').oninput = previewCoord; $('lon').oninput = previewCoord;
  const goCoord = () => { const [la, lo] = previewCoord(); if (la == null || lo == null) { toast('Periksa lagi penulisan lintang & bujur ✏️'); return; } go(la, lo, null, 'koordinat'); };
  $('go').onclick = goCoord; ['lat', 'lon'].forEach(i => $(i).onkeydown = e => { if (e.key === 'Enter') goCoord(); });
  const CHIPS = ['Monas', 'Tugu Khatulistiwa', 'Puncak Jaya', 'Sabang', 'Merauke', 'Greenwich', 'Mekkah', 'Gunung Everest', 'Kutub Utara', 'Kepulauan Galapagos'];
  $('chips').innerHTML = CHIPS.map(n => `<button class="chip" type="button" data-n="${n}">${n}</button>`).join('');
  $('chips').querySelectorAll('.chip').forEach(b => b.onclick = () => { const p = PLACES.find(x => x.n === b.dataset.n); go(p.lat, p.lon, p.n, 'chip'); });

  /* ---------- klik & hover di bola dunia ---------- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  function pickLL(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect(); mouse.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const o = ray.ray.origin, d = ray.ray.direction, b = o.dot(d), c = o.lengthSq() - 1, disc = b * b - c;
    if (disc < 0) return null; const t = -b - Math.sqrt(disc); if (t < 0) return null;
    return v2ll(o.clone().addScaledVector(d, t));
  }
  let downAt = null, idleT = 0;
  renderer.domElement.addEventListener('pointerdown', e => { if (mapOn) { idleT = 0; mapDown(e); return; } downAt = {x: e.clientX, y: e.clientY, t: performance.now()}; idleT = 0; if (controls.autoRotate) { controls.autoRotate = false; $('spin').classList.remove('on'); } });
  renderer.domElement.addEventListener('pointerup', e => {
    if (mapOn) { mapUp(); return; }
    if (!downAt || flight) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t; downAt = null;
    if (moved > 6 || dt > 600) return;
    const ll = pickLL(e.clientX, e.clientY); if (!ll) return;
    if (QZ.on) return quizGuess(ll);
    const near = PLACES.map(p => [p, G.distance(ll, [p.lat, p.lon])]).sort((a, b) => a[1] - b[1])[0];
    const nearKm = 40 * Math.max(1, camera.position.length() - 1) * 3;
    if (near && near[1] < nearKm) go(near[0].lat, near[0].lon, near[0].n, 'klik'); else go(ll[0], ll[1], null, 'klik');
  });
  let lastHover = 0;
  renderer.domElement.addEventListener('pointermove', e => {
    if (mapOn) { mapMove(e); return; }
    if (e.pointerType !== 'mouse' || performance.now() - lastHover < 50) return; lastHover = performance.now();
    const ll = pickLL(e.clientX, e.clientY), tip = $('tip');
    if (!ll) { $('readout').innerHTML = 'ARAHKAN KURSOR KE BUMI'; tip.style.display = 'none'; highlight(null); return; }
    const c = COUNTRIES.length ? G.countryAt(COUNTRIES, ll[0], ll[1]) : null;
    $('readout').innerHTML = `<b>${G.dms(ll[0], true)}</b> · <b>${G.dms(ll[1], false)}</b>`;
    let t = c ? (G.NAME_ID[c.n] || c.n) : G.ocean(ll[0], ll[1]);
    if (ST.layers.api && VOLC.length) { const v = VOLC.map(x => [x, G.distance(ll, [x.lat, x.lon])]).sort((a, b) => a[1] - b[1])[0]; if (v && v[1] < 120 * Math.max(.6, camera.position.length() - 1)) t = `🌋 ${v[0].n} · ${v[0].e.toLocaleString('id-ID')} m · ${G.NAME_ID[v[0].c] || v[0].c}`; }
    highlight(ST.layers.batas ? c : null);
    tip.textContent = t; tip.style.display = 'block'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  renderer.domElement.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; highlight(null); });

  /* ---------- tombol ---------- */
  const zoom = f => { if (mapOn) { if (MP.m === 1) { const t = controls.target, d = camera.position.clone().sub(t).multiplyScalar(f); if (d.length() > controls.minDistance && d.length() < controls.maxDistance) camera.position.copy(t).add(d); } return; } const d = clamp(camera.position.length() * f, controls.minDistance, controls.maxDistance); flyTo(...v2ll(camera.position), {dist: d}); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  $('zIn').onclick = () => zoom(.75); $('zOut').onclick = () => zoom(1.3);
  $('spin').onclick = () => { controls.autoRotate = !controls.autoRotate; $('spin').classList.toggle('on', controls.autoRotate); };
  $('home').onclick = () => mapOn ? openMap(0) : flyTo(-2.5, 118, {dist: fitDist(2.7)});

  /* ---------- pemandu, toast, misi ---------- */
  function say(h) { $('say').innerHTML = h; }
  let toastT = 0; function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); }
  const MIS = [
    ['koord', 'Terbang ke Monas memakai koordinat 6°10′ LS, 106°49′ BT'],
    ['khatul', 'Ketuk garis khatulistiwa di Kalimantan (nyalakan garis lintang)'],
    ['ujung', 'Kunjungi ujung barat (Sabang) dan ujung timur (Merauke) Indonesia'],
    ['waktu', 'Dari Jakarta terbang ke Greenwich (bujur 0°): berapa selisih jamnya?'],
    ['sb', 'Kunjungi tempat di belahan bumi selatan DAN bujur barat'],
    ['api', 'Nyalakan lapisan gunung api dan temukan Cincin Api'],
    ['malam', 'Atur jam sampai Indonesia malam dan lihat lampu kota'],
    ['tebak', 'Tebak Lokasi: 3 tebakan dengan selisih < 500 km'],
    ['peta', 'Buka kulit bola menjadi peta datar'],
    ['tissot', 'Nyalakan lingkaran Tissot di peta Mercator'],
    ['greenland', 'Ukuran Asli: seret Greenland ke khatulistiwa'],
    ['indo', 'Ukuran Asli: bawa Indonesia ke lintang Eropa (> 45° LU)'],
    ['equal', 'Coba peta Equal Earth yang menjaga luas']
  ];
  function renderMissions() {
    $('mis').innerHTML = MIS.map(([k, t]) => `<li class="${ST.done[k] ? 'ok' : ''}">${t}</li>`).join('');
    const n = MIS.filter(m => ST.done[m[0]]).length; $('misN').textContent = n + '/' + MIS.length; $('misBar').style.width = (n / MIS.length * 100) + '%';
  }
  function mission(k) { if (ST.done[k]) return false; ST.done[k] = 1; save(); renderMissions(); toast('🏆 Misi selesai: ' + MIS.find(m => m[0] === k)[1]); try { window.PILAR_PULSE?.track?.('atlas_mission', {k}); } catch (_) {} return true; }
  function checkVisit(lat, lon, how) {
    const p = [lat, lon], near = (q, km) => G.distance(p, q) < km;
    if (how === 'koordinat' && near([-6.1754, 106.8272], 30) && mission('koord')) say('🎯 Tepat di Monas! Lintang <b>6°10′ LS</b> artinya 6 derajat 10 menit di <b>selatan</b> khatulistiwa; bujur <b>106°49′ BT</b> artinya di <b>timur</b> Greenwich. 1° = 60 menit.');
    if (Math.abs(lat) < .35 && lon > 108.5 && lon < 118.5 && (ST.layers.grid || how !== 'cari')) { if (mission('khatul')) say('🟡 Garis khatulistiwa (0°) melewati Pontianak! Di sini siang dan malam hampir sama panjang sepanjang tahun, dan saat ekuinoks matahari tepat di atas kepala.'); }
    if (near([5.89, 95.32], 60)) ST.visited.sabang = 1; if (near([-8.49, 140.4], 120)) ST.visited.merauke = 1; save();
    if (ST.visited.sabang && ST.visited.merauke && mission('ujung')) say(`📏 Dari Sabang (±95° BT) sampai Merauke (±141° BT) = <b>46°</b> bujur ≈ <b>${Math.round(G.distance([5.89, 95.32], [-8.49, 140.4])).toLocaleString('id-ID')} km</b>. Karena 46° ÷ 15° ≈ 3, Indonesia punya <b>3 zona waktu</b>: WIB, WITA, WIT!`);
    if (near(JKT, 40)) ST.visited.jkt = 1;
    if (near([51.4779, 0], 60) && ST.visited.jkt && mission('waktu')) say('⏰ Jakarta di bujur ±106,8° BT. Bumi berputar 360° dalam 24 jam → <b>15° = 1 jam</b>. 106,8 ÷ 15 ≈ <b>7 jam</b>: itulah WIB = UTC+7. Saat Greenwich pukul 05.00, Jakarta sudah 12.00!');
    if (lat < 0 && lon < 0 && mission('sb')) say('🧭 Lintang negatif = <b>selatan</b> (LS), bujur negatif = <b>barat</b> (BB). Indonesia sebagian besar di LS dan BT.');
  }
  function checkNight() { if (ST.layers.lampu && G.sunElevation(JKT, simTime) < -8 && mission('malam')) say('🌃 Malam di Indonesia! Titik-titik cahaya itu lampu kota yang terekam satelit. Jawa paling terang karena paling padat penduduk.'); }

  /* ---------- Tebak Lokasi ---------- */
  const QZ = {on: false, round: 0, score: 0, good: 0, target: null, answered: false, pool: []};
  $('btnQuiz').onclick = () => QZ.on ? endQuiz() : (mapOn ? (openMap(0), setTimeout(startQuiz, 1800)) : startQuiz());
  $('qExit').onclick = endQuiz;
  $('qNext').onclick = nextQ;
  function startQuiz() {
    QZ.on = true; QZ.round = 0; QZ.score = 0; QZ.good = 0; QZ.pool = PLACES.filter(p => p.k !== 'kota' || Math.random() < .35).sort(() => Math.random() - .5).slice(0, 5);
    $('quiz').classList.add('on'); $('btnQuiz').classList.add('on'); ST.layers.tempat = false; applyLayers();
    say('🎯 Tebak Lokasi! Nama tempat disembunyikan. Putar bola dunia lalu <b>ketuk</b> tempat yang kamu kira. Makin dekat, makin besar skormu.');
    flyTo(10, 60, {dist: 3.2}); nextQ();
  }
  function nextQ() {
    if (QZ.round >= QZ.pool.length) { toast(`🏁 Selesai! Skor ${QZ.score} · ${QZ.good} tebakan < 500 km`); $('qTarget').textContent = `Skor akhir: ${QZ.score}`; $('qHint').textContent = 'Tekan ✖ Selesai atau 🎯 untuk main lagi.'; $('qNext').disabled = true; QZ.round = 99; return; }
    QZ.target = QZ.pool[QZ.round++]; QZ.answered = false;
    $('qRound').textContent = QZ.round + '/' + QZ.pool.length; $('qTarget').textContent = '📍 ' + QZ.target.n; $('qHint').textContent = 'Ketuk bola dunia di tempat yang kamu kira.';
    $('qNext').disabled = true; guessPin.visible = false; if (guessLbl) { guessLbl.el.remove(); LBL.splice(LBL.indexOf(guessLbl), 1); guessLbl = null; }
  }
  function quizGuess(ll) {
    if (QZ.answered || !QZ.target || QZ.round > QZ.pool.length) return; QZ.answered = true;
    const t = [QZ.target.lat, QZ.target.lon], d = G.distance(ll, t), pts = Math.max(0, Math.round(1000 - d / 5));
    QZ.score += pts; if (d < 500) QZ.good++;
    guessPin.visible = true; guessPin.position.copy(ll2v(ll[0], ll[1], 1.003)); guessPin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), guessPin.position.clone().normalize());
    guessLbl = label('Tebakanmu', ll[0], ll[1], 'guess', 1.02);
    drawArc(ll, t, 0xffb347); current = {lat: t[0], lon: t[1], name: QZ.target.n};
    flyTo(t[0], t[1], {dist: d > 3000 ? 2.8 : 2.1, done: () => { placePin(t[0], t[1]); showPlace(t[0], t[1], QZ.target.n); }});
    $('qScore').textContent = QZ.score; $('qNext').disabled = false;
    $('qHint').innerHTML = `${d < 100 ? '🎯 Luar biasa!' : d < 500 ? '👍 Dekat sekali!' : d < 2000 ? '🙂 Lumayan.' : '😅 Masih jauh.'} Selisih <b>${Math.round(d).toLocaleString('id-ID')} km</b> · +${pts} poin`;
    if (QZ.good >= 3) mission('tebak');
  }
  function endQuiz() { QZ.on = false; $('quiz').classList.remove('on'); $('btnQuiz').classList.remove('on'); guessPin.visible = false; if (guessLbl) { guessLbl.el.remove(); LBL.splice(LBL.indexOf(guessLbl), 1); guessLbl = null; } ST.layers.tempat = true; applyLayers(); }

  /* =====================================================================
     BOLA vs PETA — kulit bola dibuka menjadi peta datar (Mercator · Ekuirektangular · Equal Earth),
     lingkaran Tissot, dan "Ukuran Asli" (seret negara ke lintang lain).
     Bola melengkung → bola makin besar → bidang datar: radius kelengkungan 1/k, k = 1 − m.
     ===================================================================== */
  const PROJ = [['mer', 'Mercator'], ['eqr', 'Ekuirektangular'], ['ee', 'Equal Earth']];
  const MP = {m: 0, goal: 0, proj: 0, lon0: 0, tissot: false, sizeOn: false, size: null, drag: null, d0: new THREE.Vector3(1, 0, 0), sphereDist: 3.4, mapDist: 8, pinWas: false};
  const morphU = {m: {value: 0}, proj: {value: 0}};
  dayTex.wrapS = nightTex.wrapS = THREE.RepeatWrapping;
  const MORPH_GLSL = `uniform float m; uniform float proj; const float PI=3.141592653589793;
    vec2 projXY(float lam,float phi){
      if(proj<0.5){ float p=clamp(phi,-1.4835,1.4835); return vec2(lam,log(tan(PI*0.25+p*0.5))); }
      if(proj<1.5) return vec2(lam,phi);
      float th=asin(0.8660254*sin(phi)); float t2=th*th; float t6=t2*t2*t2;
      float x=3.4641016*lam*cos(th)/(3.0*(9.0*0.003796*t6*t2+7.0*0.000893*t6+3.0*(-0.081106)*t2+1.340264));
      float y=0.003796*t6*t2*th+0.000893*t6*th+(-0.081106)*t2*th+1.340264*th;
      return vec2(x,y); }
    vec3 morphPos(float lam,float phi){
      vec2 f=projXY(lam,phi); float k=max(1.0-m,0.0008);
      float L=mix(lam,f.x,m); float P=mix(phi,f.y,m);
      return vec3(cos(P*k)*sin(L*k)/k, sin(P*k)/k, cos(P*k)*cos(L*k)/k-1.0/k+1.0); }`;
  const EE = [1.340264, -0.081106, 0.000893, 0.003796], PHI_MAX = 85 * D2R;
  function projXY(lam, phi, proj = MP.proj) {
    if (proj === 0) { const p = clamp(phi, -PHI_MAX, PHI_MAX); return [lam, Math.log(Math.tan(Math.PI / 4 + p / 2))]; }
    if (proj === 1) return [lam, phi];
    const th = Math.asin(Math.sqrt(3) / 2 * Math.sin(phi)), t2 = th * th, t6 = t2 * t2 * t2;
    return [2 * Math.sqrt(3) * lam * Math.cos(th) / (3 * (9 * EE[3] * t6 * t2 + 7 * EE[2] * t6 + 3 * EE[1] * t2 + EE[0])), EE[3] * t6 * t2 * th + EE[2] * t6 * th + EE[1] * t2 * th + EE[0] * th];
  }
  function invXY(X, Y, proj = MP.proj) {
    let lam, phi;
    if (proj === 0) { phi = 2 * Math.atan(Math.exp(Y)) - Math.PI / 2; lam = X; if (Math.abs(phi) > PHI_MAX) return null; }
    else if (proj === 1) { phi = Y; lam = X; }
    else {
      let th = Y / EE[0];
      for (let i = 0; i < 8; i++) { const t2 = th * th, t6 = t2 * t2 * t2, f = EE[3] * t6 * t2 * th + EE[2] * t6 * th + EE[1] * t2 * th + EE[0] * th - Y, df = 9 * EE[3] * t6 * t2 + 7 * EE[2] * t6 + 3 * EE[1] * t2 + EE[0]; th -= f / df; }
      const s = Math.sin(th) / (Math.sqrt(3) / 2); if (Math.abs(s) > 1) return null; phi = Math.asin(s);
      const t2 = th * th, t6 = t2 * t2 * t2; lam = X * 3 * (9 * EE[3] * t6 * t2 + 7 * EE[2] * t6 + 3 * EE[1] * t2 + EE[0]) / (2 * Math.sqrt(3) * Math.cos(th));
    }
    if (Math.abs(lam) > Math.PI || Math.abs(phi) > Math.PI / 2) return null;
    return [phi / D2R, wrap180(lam / D2R + MP.lon0)];
  }
  function morphPosJS(lam, phi, m = MP.m) {
    const f = projXY(lam, phi), k = Math.max(1 - m, .0008), L = lam + (f[0] - lam) * m, P = phi + (f[1] - phi) * m;
    return new THREE.Vector3(Math.cos(P * k) * Math.sin(L * k) / k, Math.sin(P * k) / k, Math.cos(P * k) * Math.cos(L * k) / k - 1 / k + 1);
  }
  const wrap180 = d => ((d + 540) % 360) - 180;
  const relLam = lon => wrap180(lon - MP.lon0) * D2R;
  const mapGroup = new THREE.Group(); mapGroup.matrixAutoUpdate = false; mapGroup.visible = false; scene.add(mapGroup);

  /* peta berlapis tekstur yang sama dengan bola */
  const mapMesh = (() => {
    const NX = LITE ? 160 : 256, NY = LITE ? 80 : 128, n = (NX + 1) * (NY + 1);
    const ang = new Float32Array(n * 2), pos = new Float32Array(n * 3), idx = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const k = j * (NX + 1) + i; ang[k * 2] = -Math.PI + 2 * Math.PI * i / NX; ang[k * 2 + 1] = -Math.PI / 2 + Math.PI * j / NY; }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ang', new THREE.BufferAttribute(ang, 2)); g.setIndex(idx);
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: {m: morphU.m, proj: morphU.proj, lon0: {value: 0}, dayMap: U.dayMap, nightMap: U.nightMap, sunDir: U.sunDir, realSun: U.realSun, lights: U.lights}, side: THREE.DoubleSide,
      vertexShader: MORPH_GLSL + `attribute vec2 ang; uniform float lon0; varying vec2 vUv; varying vec3 vN;
        void main(){ float lam=ang.x, phi=ang.y; vUv=vec2((lam+lon0+PI)/(2.0*PI), phi/PI+0.5);
          vN=normalize(mat3(modelMatrix)*vec3(cos(phi)*sin(lam),sin(phi),cos(phi)*cos(lam)));
          gl_Position=projectionMatrix*modelViewMatrix*vec4(morphPos(lam,phi),1.0); }`,
      fragmentShader: `uniform sampler2D dayMap,nightMap; uniform vec3 sunDir; uniform float realSun,lights; varying vec2 vUv; varying vec3 vN;
        void main(){ vec3 day=texture2D(dayMap,vUv).rgb; float d=dot(normalize(vN),sunDir);
          float k= realSun>0.5 ? smoothstep(-0.1,0.16,d) : 1.0; float lit= realSun>0.5 ? 0.4+0.7*clamp(d*1.15+0.12,0.0,1.0) : 1.0;
          vec3 night=pow(texture2D(nightMap,vUv).rgb,vec3(1.35))*vec3(1.9,1.55,1.05)*lights;
          gl_FragColor=vec4(mix(night+day*0.16, day*lit, k),1.0); }`
    }));
    mesh.frustumCulled = false; return mesh;
  })();
  mapGroup.add(mapMesh);
  const lineVS = MORPH_GLSL + `attribute vec2 ang; void main(){ vec3 p=morphPos(ang.x,ang.y); p=p*(1.0+0.004*(1.0-m))+vec3(0.0,0.0,0.004*m); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
  const flatMat = (color, op) => new THREE.ShaderMaterial({uniforms: {m: morphU.m, proj: morphU.proj, color: {value: new THREE.Color(color)}, op: {value: op}}, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: lineVS, fragmentShader: 'uniform vec3 color; uniform float op; void main(){ gl_FragColor=vec4(color,op); }'});
  function segGeom(rings, closed) {
    const a = [];
    rings.forEach(r => { const L = r.length, n = closed ? L : L - 1;
      for (let i = 0; i < n; i++) { const p = r[i], q = r[(i + 1) % L], l1 = relLam(p[0]), l2 = relLam(q[0]); if (Math.abs(l1 - l2) > Math.PI) continue; a.push(l1, p[1] * D2R, l2, q[1] * D2R); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('ang', new THREE.BufferAttribute(new Float32Array(a), 2)); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(a.length / 2 * 3), 3)); return g;
  }
  function seg(rings, closed, mat) { const o = new THREE.LineSegments(segGeom(rings, closed), mat); o.frustumCulled = false; return o; }
  const MAPOBJ = {};
  const matGrid = flatMat(0x9fd8ff, .28), matEq = flatMat(0xffe27c, .95), matBorder = flatMat(0xffffff, .5), matTis = flatMat(0xff5fa2, .95), matTisF = flatMat(0xff5fa2, .25),
    matSize = flatMat(0xffb347, 1), matSizeF = flatMat(0xffb347, .42), matGhost = flatMat(0xffffff, .55);
  function tissotRings() {
    const out = [];
    for (const lat of [-60, -30, 0, 30, 60]) for (let lon = -165; lon < 180; lon += 30) out.push(geoCircle(lat, lon, 6));
    return out;
  }
  function geoCircle(lat, lon, rDeg) {
    const la = lat * D2R, lo = lon * D2R, r = rDeg * D2R, c = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)], e = [-Math.sin(lo), Math.cos(lo), 0];
    const n = [c[1] * e[2] - c[2] * e[1], c[2] * e[0] - c[0] * e[2], c[0] * e[1] - c[1] * e[0]], pts = [];
    for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2, p = [0, 1, 2].map(k => c[k] * Math.cos(r) + (e[k] * Math.cos(t) + n[k] * Math.sin(t)) * Math.sin(r)); pts.push([Math.atan2(p[1], p[0]) / D2R, Math.asin(p[2]) / D2R]); }
    return pts;
  }
  function fillGeom(rings) {
    const ang = [], idx = []; let base = 0;
    rings.forEach(r => {
      const pts = r.map(p => [relLam(p[0]), p[1] * D2R]); let bad = false;
      for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - pts[i - 1][0]) > Math.PI) { bad = true; break; }
      if (bad || pts.length < 3) return;
      const tri = THREE.ShapeUtils.triangulateShape(pts.map(p => new THREE.Vector2(p[0], p[1])), []);
      pts.forEach(p => ang.push(p[0], p[1])); tri.forEach(t => idx.push(t[0] + base, t[1] + base, t[2] + base)); base += pts.length;
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('ang', new THREE.BufferAttribute(new Float32Array(ang), 2)); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ang.length / 2 * 3), 3)); g.setIndex(idx); return g;
  }
  function replace(key, obj) { if (MAPOBJ[key]) { mapGroup.remove(MAPOBJ[key]); MAPOBJ[key].geometry.dispose(); } MAPOBJ[key] = obj; if (obj) { obj.frustumCulled = false; mapGroup.add(obj); } }
  function rebuildMap() {
    const gl = []; for (let lat = -75; lat <= 75; lat += 15) if (lat) gl.push(Array.from({length: 121}, (_, i) => [-180 + i * 3, lat]));
    for (let lon = -180; lon < 180; lon += 15) gl.push(Array.from({length: 61}, (_, i) => [lon, -90 + i * 3]));
    replace('grid', seg(gl, false, matGrid));
    replace('eq', seg([Array.from({length: 181}, (_, i) => [-180 + i * 2, 0]), Array.from({length: 91}, (_, i) => [0, -90 + i * 2])], false, matEq));
    if (COUNTRIES.length) replace('border', seg(COUNTRIES.flatMap(c => c.r), true, matBorder));
    rebuildTissot(); rebuildSize();
  }
  function rebuildTissot() {
    if (!MP.tissot) { replace('tis', null); replace('tisF', null); return; }
    const t = tissotRings(); replace('tis', seg(t, true, matTis)); replace('tisF', new THREE.Mesh(fillGeom(t), matTisF));
  }

  /* ---------- Ukuran Asli ---------- */
  const SIZE_C = [['Greenland', 2166086], ['Indonesia', 1904569], ['Russia', 17098242], ['Australia', 7692024], ['Brazil', 8515767], ['Canada', 9984670], ['India', 3287263], ['Dem. Rep. Congo', 2344858], ['United States of America', 9833520]];
  const std = (lat, lon) => new THREE.Vector3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R));
  const fromStd = v => [Math.asin(clamp(v.z, -1, 1)) / D2R, Math.atan2(v.y, v.x) / D2R];
  function pickSize(name) {
    const c = COUNTRIES.find(x => x.n === name); if (!c) return;
    const s = new THREE.Vector3(); let n = 0; c.r.forEach(r => r.forEach(p => { s.add(std(p[1], p[0])); n++; }));
    const c0 = fromStd(s.normalize()); MP.size = {c, name, area: SIZE_C.find(x => x[0] === name)[1], c0, c1: c0.slice()};
    document.querySelectorAll('[data-sz]').forEach(b => b.classList.toggle('on', b.dataset.sz === name));
    rebuildSize(); sizeInfo();
    say(`📐 <b>${G.NAME_ID[name] || name}</b> siap dipindah. <b>Seret</b> bentuk oranye ke lintang lain di peta. Di bola bentuknya tetap sama; di peta Mercator ukurannya berubah!`);
  }
  function movedRings() {
    const S = MP.size, q = new THREE.Quaternion().setFromUnitVectors(std(...S.c0), std(...S.c1));
    return S.c.r.map(r => r.map(p => { const ll = fromStd(std(p[1], p[0]).applyQuaternion(q)); return [ll[1], ll[0]]; }));
  }
  function rebuildSize() {
    if (!MP.sizeOn || !MP.size) { replace('size', null); replace('sizeF', null); replace('ghost', null); return; }
    const rings = movedRings();
    replace('ghost', seg(MP.size.c.r, true, matGhost)); replace('sizeF', new THREE.Mesh(fillGeom(rings), matSizeF)); replace('size', seg(rings, true, matSize));
  }
  function sizeInfo() {
    const S = MP.size; if (!S) return;
    const nm = G.NAME_ID[S.name] || S.name, f0 = 1 / Math.cos(S.c0[0] * D2R) ** 2, f1 = 1 / Math.cos(S.c1[0] * D2R) ** 2, mer = MP.proj === 0;
    $('mapInfo').innerHTML = `<div class="cell w"><small>Luas asli ${nm}</small><b>${(S.area / 1e6).toFixed(2).replace('.', ',')} juta km² · ${(30370000 / S.area).toFixed(1).replace('.', ',')}× lebih kecil dari Afrika</b></div>
      <div class="cell"><small>Lintang asal → kini</small><b>${Math.round(S.c0[0])}° → ${Math.round(S.c1[0])}°</b></div>
      <div class="cell"><small>${mer ? 'Mercator memperbesar' : 'Proyeksi ini'}</small><b>${mer ? '×' + f1.toFixed(1).replace('.', ',') + ' luas' : MP.proj === 2 ? 'luas tetap ✓' : 'melebar ke samping'}</b></div>
      ${mer ? `<p class="sub" style="grid-column:1/-1;margin:.2rem 0 0;font-size:.78rem">Di Mercator, luas tampak = luas asli × 1 ÷ cos²(lintang). Dipindah dari ${Math.round(S.c0[0])}° ke ${Math.round(S.c1[0])}°, ukurannya di peta berubah ×${(f1 / f0).toFixed(2).replace('.', ',')}.</p>` : ''}`;
  }

  /* ---------- transisi bola ↔ peta & kamera ---------- */
  function mapFit() {
    const hw = Math.abs(projXY(Math.PI, 0)[0]), hh = Math.abs(projXY(0, Math.PI / 2)[1]);
    const vf = camera.fov * D2R / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
    return Math.max(hw / Math.tan(hf), hh / Math.tan(vf)) * 1.08;
  }
  function setBasis() {
    const z = ll2v(0, MP.lon0).normalize(), y = new THREE.Vector3(0, 1, 0), x = new THREE.Vector3().crossVectors(y, z);
    mapGroup.matrix.makeBasis(x, y, z); mapGroup.matrixWorldNeedsUpdate = true; MP.d0.copy(z); mapMesh.material.uniforms.lon0.value = MP.lon0 * D2R;
  }
  /* Peta dunia dipusatkan di bujur 20° BT (seperti atlas umum): sambungan peta jatuh di Samudra Pasifik,
     sehingga Greenland, Afrika, Eropa, Amerika, dan Indonesia utuh. */
  const MAP_LON0 = 20;
  function openMap(goal, viaSlider) {
    if (flight) return;
    if (MP.m === 0 && goal > 0) {
      if (!viaSlider && Math.abs(wrap180(v2ll(camera.position)[1] - MAP_LON0)) > 3) { flyTo(0, MAP_LON0, {dist: Math.max(2.6, camera.position.length()), done: () => openMap(goal)}); return; }
      MP.lon0 = MAP_LON0; MP.sphereDist = camera.position.length(); setBasis(); rebuildMap();
      MP.pinWas = pin.visible; if (QZ.on) endQuiz();
    }
    MP.goal = goal; MP.mapDist = mapFit(); controls.enabled = false; controls.autoRotate = false; $('spin').classList.remove('on');
    syncMapUI();
    if (goal === 1 && mission('peta')) {} // pesan muncul setelah animasi
  }
  function camForMorph() {
    const m = MP.m, t = MP.d0.clone().multiplyScalar(m), dist = MP.sphereDist + (MP.mapDist - MP.sphereDist) * m;
    controls.target.copy(t); camera.up.set(0, 1, 0); camera.position.copy(t).addScaledVector(MP.d0, dist); camera.lookAt(t);
  }
  function setSphereVisible(v) {
    mapOn = !v;
    earth.visible = atmo.visible = v; if (v) { applyLayers(); pin.visible = MP.pinWas; } else { clouds.visible = grid.visible = borders.visible = placePts.visible = false; if (volPts) volPts.visible = false; pin.visible = guessPin.visible = false; if (arc) arc.visible = false; if (plane) plane.visible = false; highlight(null); }
    if (arc && v) arc.visible = true;
    mapGroup.visible = !v;
  }
  function stepMorph(dt) {
    if (MP.m === MP.goal && !MP.slide) return;
    if (!MP.slide) { const s = dt / 1.6; MP.m = MP.goal > MP.m ? Math.min(MP.goal, MP.m + s) : Math.max(MP.goal, MP.m - s); }
    morphU.m.value = ease(MP.m);
    if (document.activeElement !== $('morph')) $('morph').value = Math.round(MP.m * 100);
    $('morphLbl').textContent = Math.round(MP.m * 100) + '%';
    setSphereVisible(MP.m === 0); camForMorph();
    if (MP.m === MP.goal && !MP.slide) {
      if (MP.m === 1) {
        Object.assign(controls, {enabled: true, enableRotate: false, enablePan: true, screenSpacePanning: true, minDistance: .4, maxDistance: MP.mapDist * 1.5});
        say(projSay());
      } else if (MP.m === 0) {
        Object.assign(controls, {enabled: true, enableRotate: true, enablePan: false, minDistance: 1.08, maxDistance: 7}); controls.target.set(0, 0, 0);
        say('🌍 Kembali ke bola. Ingat: hanya <b>bola dunia</b> yang menampilkan bentuk, luas, jarak, dan arah sekaligus dengan benar.');
      }
      syncMapUI();
    }
  }
  function projSay() {
    return [
      '🗺️ Ini peta <b>Mercator</b> (1569). Arah kompas jadi garis lurus, cocok untuk navigasi. Tapi makin jauh dari khatulistiwa, daratan makin <b>melar</b>: lihat Greenland seperti sebesar Afrika!<span style="display:block;margin-top:.3rem;color:var(--acc)">👉 Nyalakan ⭕ Lingkaran Tissot atau 📐 Ukuran Asli.</span>',
      '🗺️ <b>Ekuirektangular</b>: setiap 1° lintang dan bujur jadi kotak sama besar. Paling mudah dibuat (dipakai untuk tekstur bola ini!), tapi daerah dekat kutub tertarik melebar ke samping.',
      '🗺️ <b>Equal Earth</b> (2018) menjaga <b>luas</b>: negara dengan luas sama tampak sama besar. Imbalannya, bentuk di tepi peta agak miring. Tidak ada peta datar yang benar semuanya!'
    ][MP.proj];
  }
  function setProj(i) {
    MP.proj = i; morphU.proj.value = i; MP.mapDist = mapFit(); if (MP.m === 1) { camForMorph(); controls.maxDistance = MP.mapDist * 1.5; say(projSay()); }
    if (i === 2) mission('equal'); syncMapUI(); sizeInfo();
  }
  function syncMapUI() {
    document.querySelectorAll('[data-mv]').forEach(b => b.classList.toggle('on', (b.dataset.mv === 'peta') === (MP.goal === 1)));
    document.querySelectorAll('[data-pj]').forEach(b => b.classList.toggle('on', +b.dataset.pj === MP.proj));
    if (document.activeElement !== $('morph')) $('morph').value = Math.round(MP.m * 100);
    $('mapTools').style.display = MP.goal === 1 || MP.m > 0 ? '' : 'none';
    document.querySelectorAll('.tog[data-mt]').forEach(el => { const on = !!MP[el.dataset.mt]; el.classList.toggle('on', on); el.setAttribute('aria-checked', on); });
    $('sizeBox').style.display = MP.sizeOn ? '' : 'none';
  }
  /* UI */
  $('mapSec').innerHTML = `<div class="h">Bola vs peta datar <b>🗺️</b></div>
    <div class="chips"><button class="btn sm on" data-mv="bola" type="button">🌍 Bola</button><button class="btn sm" data-mv="peta" type="button">🗺️ Buka jadi peta</button></div>
    <div class="slide" style="margin-top:.45rem"><div class="row"><span>KUPAS KULIT BOLA</span><b id="morphLbl">0%</b></div><input type="range" id="morph" min="0" max="100" step="1" value="0"></div>
    <div id="mapTools" style="display:none">
      <div class="chips" style="margin:.4rem 0">${PROJ.map((p, i) => `<button class="chip" data-pj="${i}" type="button">${p[1]}</button>`).join('')}</div>
      <div class="tog" data-mt="tissot" role="switch" tabindex="0"><span>⭕ Lingkaran Tissot (ukuran sama di bola)</span><i></i></div>
      <div class="tog" data-mt="sizeOn" role="switch" tabindex="0"><span>📐 Ukuran Asli (seret negara)</span><i></i></div>
      <div id="sizeBox" style="display:none"><div class="chips" style="margin:.35rem 0">${SIZE_C.map(([n]) => `<button class="chip" data-sz="${n}" type="button">${G.NAME_ID[n] || n}</button>`).join('')}</div><div class="grid2" id="mapInfo"></div></div>
    </div>`;
  document.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => openMap(b.dataset.mv === 'peta' ? 1 : 0));
  document.querySelectorAll('[data-pj]').forEach(b => b.onclick = () => setProj(+b.dataset.pj));
  $('morph').oninput = () => {
    const v = +$('morph').value / 100; $('morphLbl').textContent = Math.round(v * 100) + '%';
    if (MP.m === 0 && v > 0) { openMap(v, true); }
    MP.slide = true; MP.m = MP.goal = v; controls.enabled = false;
  };
  $('morph').onchange = () => { MP.slide = false; const v = MP.m; MP.goal = v >= .5 ? 1 : 0; if (MP.goal === 1) mission("peta"); if (v === 0) MP.m = 0.0001; };
  document.querySelectorAll('.tog[data-mt]').forEach(el => {
    const flip = () => {
      const k = el.dataset.mt; MP[k] = !MP[k];
      if (k === 'tissot') { rebuildTissot(); if (MP.tissot) { say('⭕ Semua lingkaran merah muda ini <b>sama besar di bola</b> (jari-jari ±670 km). Di Mercator, lingkaran di lintang 60° jadi <b>2× lebih lebar</b>, jadi luasnya <b>4×</b>! Rumusnya: luas tampak = 1 ÷ cos²(lintang). cos 60° = ½ → 1 ÷ ¼ = 4.'); mission('tissot'); } }
      if (k === 'sizeOn') { if (MP.sizeOn && !MP.size) pickSize('Greenland'); if (MP.proj !== 0 && MP.sizeOn) setProj(0); rebuildSize(); }
      syncMapUI();
    };
    el.onclick = flip; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
  });
  document.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => pickSize(b.dataset.sz));

  /* sentuhan & kursor di peta */
  const inv = new THREE.Matrix4();
  function pickMap(cx, cy) {
    if (MP.m < 1) return null;
    const r = renderer.domElement.getBoundingClientRect(); mouse.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mouse, camera); inv.copy(mapGroup.matrixWorld).invert();
    const o = ray.ray.origin.clone().applyMatrix4(inv), d = ray.ray.direction.clone().transformDirection(inv);
    if (Math.abs(d.z) < 1e-6) return null; const t = (1.004 - o.z) / d.z; if (t < 0) return null;
    const p = o.addScaledVector(d, t); return invXY(p.x, p.y);
  }
  function mapDown(e) {
    if (!(MP.sizeOn && MP.size)) return false; const ll = pickMap(e.clientX, e.clientY); if (!ll) return false;
    const inside = movedRings().some(r => G.pip(ll[0], ll[1], r)) || G.distance(ll, MP.size.c1) < 900;
    if (!inside) return false;
    MP.drag = {dLat: ll[0] - MP.size.c1[0], dLon: wrap180(ll[1] - MP.size.c1[1])}; controls.enabled = false; return true;
  }
  function mapMove(e) {
    if (MP.drag) { const ll = pickMap(e.clientX, e.clientY); if (!ll) return; MP.size.c1 = [clamp(ll[0] - MP.drag.dLat, -78, 80), wrap180(ll[1] - MP.drag.dLon)]; rebuildSize(); sizeInfo(); return; }
    if (e.pointerType !== 'mouse') return;
    const ll = pickMap(e.clientX, e.clientY);
    $('readout').innerHTML = ll ? `<b>${G.dms(ll[0], true)}</b> · <b>${G.dms(ll[1], false)}</b>${MP.proj === 0 ? ` · skala luas Mercator <b>×${(1 / Math.cos(ll[0] * D2R) ** 2).toFixed(1).replace('.', ',')}</b>` : ''}` : 'ARAHKAN KURSOR KE PETA';
  }
  function mapUp() {
    if (!MP.drag) return; MP.drag = null; controls.enabled = true; const S = MP.size;
    if (S.name === 'Greenland' && Math.abs(S.c1[0]) < 15 && mission('greenland')) say('🧊 Greenland di khatulistiwa ternyata <b>kecil</b>! Luas aslinya 2,17 juta km², sedangkan Afrika 30,37 juta km²: Afrika <b>±14×</b> lebih luas. Mercator membuat Greenland tampak raksasa karena letaknya dekat kutub.');
    if (S.name === 'Indonesia' && S.c1[0] > 45 && mission('indo')) say('🇮🇩 Indonesia dibawa ke lintang Eropa langsung <b>membesar</b> di peta Mercator! Bentang aslinya Sabang–Merauke ±5.100 km, lebih lebar dari daratan Amerika Serikat. Di atlas, Indonesia sering tampak lebih kecil dari aslinya dibanding negara-negara utara.');
  }
  function mapLabels() {
    const show = MP.m === 1 && MP.sizeOn && MP.size;
    if (!show) { sizeLbl.style.display = 'none'; return; }
    const S = MP.size, p = morphPosJS(relLam(S.c1[1]), S.c1[0] * D2R, 1).add(new THREE.Vector3(0, 0, .01)).applyMatrix4(mapGroup.matrixWorld).project(camera);
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    sizeLbl.style.display = ''; sizeLbl.textContent = `${G.NAME_ID[S.name] || S.name} · ${(S.area / 1e6).toFixed(2).replace('.', ',')} juta km²`;
    sizeLbl.style.transform = `translate(${(p.x * .5 + .5) * w}px,${(-p.y * .5 + .5) * h}px) translate(-50%,-50%)`;
  }
  const sizeLbl = document.createElement('div'); sizeLbl.className = 'lbl sel'; sizeLbl.style.display = 'none'; $('labels').appendChild(sizeLbl);

  /* ---------- ukuran & loop ---------- */
  function resize() {
    const w = $('globe').clientWidth, h = $('globe').clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    // di layar lebar, geser bola sedikit agar tidak tertutup panel
    const wide = w > 900; camera.setViewOffset(w, h, wide ? 0 : 0, 0, w, h);
  }
  new ResizeObserver(resize).observe($('globe'));
  /* jarak kamera agar seluruh bola terlihat juga di layar tegak (HP) */
  function fitDist(d) { const hf = 2 * Math.atan(Math.tan(camera.fov * D2R / 2) * camera.aspect); return Math.max(d, 1.12 / Math.sin(Math.min(camera.fov * D2R, hf) / 2)); }
  resize(); camera.position.copy(ll2v(-2.5, 118, 1).normalize().multiplyScalar(fitDist(3.4))); camera.lookAt(0, 0, 0); controls.update();
  if (matchMedia('(hover: none)').matches) $('readout').textContent = 'KETUK BUMI UNTUK MELIHAT KOORDINAT';
  applyLayers(); renderMissions(); setSun(); resize();
  let last = performance.now(), secAcc = 0;
  function loop(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (live) { secAcc += dt; if (secAcc > .5) { secAcc = 0; simTime = new Date(); setSun(); } }
    else if (lapse) { simTime = new Date(simTime.getTime() + dt * 36e5); setSun(); checkNight(); }
    cloudU.time.value += dt; clouds.rotation.y += dt * .004;
    stepMorph(dt); stepFlight(dt);
    if (!flight) { controls.update(); controls.rotateSpeed = .18 + .5 * Math.min(1, (camera.position.length() - 1) / 2.5); idleT += dt; if (idleT > 45 && !QZ.on && !mapOn && MP.m === 0 && !controls.autoRotate) { controls.autoRotate = true; $('spin').classList.add('on'); } }
    if (pin.visible) { const s = 1 + ((now / 900) % 1) * 2.2; ring2.scale.set(s, s, s); ring2.material.opacity = 1 - (now / 900) % 1; }
    if (arc) { arcT = Math.min(1, arcT + dt / 1.6); const n = Math.floor(arcT * (arcPts.length - 1)); arc.geometry.setDrawRange(0, n + 1); if (plane) { plane.position.copy(arcPts[n]); plane.visible = arcT < 1; } }
    renderer.render(scene, camera); updateLabels();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.PILAR_ATLAS = {map: MP, mapObj: MAPOBJ, openMap, setProj, pickSize, pickMap, go, flyTo, state: ST, places: PLACES, get countries() { return COUNTRIES; }, camera, pickLL, quiz: QZ, startQuiz, quizGuess, setTime: d => { live = false; simTime = d; setSun(); checkNight(); }};
  try { window.PILAR_PULSE?.setApp?.('atlas-bumi'); } catch (_) {}
})();
