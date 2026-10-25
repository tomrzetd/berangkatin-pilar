/* PILAR SoundScope · v5.0 · Sound Lab Pro
   🎛️ Generator Pro : 2 kanal (A/B), pelayangan, interval musik (rasio), stereo, derau putih/merah muda,
                       sapuan tes pendengaran 8→20 kHz, sapuan bass 20→200 Hz, Lissajous XY, keypad + dekoder DTMF.
   💾 Transcoder    : teks / file WAV / rekaman mic  →  dekode BFSK (otomatis 4 kanal × 3 laju)
                       →  kode ulang ke BFSK (kanal/laju/koreksi lain) atau Morse  →  ▶ putar / 💾 unduh WAV.
   Memakai fsk-core.js (encodeFrame, modulate, Receiver) — format paket sama dengan Acoustic Communication.
   Audio diproses lokal; tidak ada suara yang direkam ke server. */
(function(){
'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const A=()=>window.SOUNDSCOPE_MORSE_AUDIO,FC=()=>window.PilarFsk;
const toast=(m,k)=>{try{A().toast(m,k)}catch(_){}};
const pulse=(n,d={})=>{try{window.PILAR_PULSE?.track?.(n,d)}catch(_){}};
const NN=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName=f=>{const m=Math.round(69+12*Math.log2(f/440));return NN[(m%12+12)%12]+(Math.floor(m/12)-1)};
const fmtHz=f=>f>=1000?(f/1000).toFixed(f>=10000?1:2).replace('.',',')+' kHz':Math.round(f)+' Hz';
const logF=v=>20*Math.pow(1000,v/1000),logV=f=>Math.round(1000*Math.log(f/20)/Math.log(1000));
const CH={A:[800,1200],B:[1500,1900],C:[2200,2600],D:[2900,3300]};

/* ---------- gaya ---------- */
const css=document.createElement('style');css.textContent=`
.pro-ch{display:grid;grid-template-columns:auto 1fr auto;gap:.4rem .6rem;align-items:center;margin:.35rem 0}
.pro-ch b.tag{width:2rem;height:2rem;border-radius:.6rem;display:grid;place-items:center;font-weight:950;color:#04121a}
.pro-ch input[type=range]{width:100%}.pro-ch output{font-weight:900;font-variant-numeric:tabular-nums;min-width:5.6rem;text-align:right}
.pro-ctl{grid-column:1/-1;display:grid;grid-template-columns:minmax(6rem,1fr) 3.2rem 3.2rem 5rem;gap:.35rem;align-items:center}.pro-ctl .btn{flex:none;min-width:0;width:100%;min-height:2.6rem;height:2.6rem;padding:0 .2rem}.pro-ctl select{min-height:2.6rem;width:100%;min-width:0}
.pro-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}
.pro-grid .btn{min-height:2.9rem;font-size:.82rem;padding:0 .4rem}
.pro-big{font-size:clamp(2rem,5vw,3.4rem);font-weight:950;text-align:center;line-height:1.05;font-variant-numeric:tabular-nums}
.pro-liss{width:100%;aspect-ratio:1/1;max-width:20rem;display:block;margin:.4rem auto 0;border:1px solid var(--line);border-radius:1rem;background:rgba(0,0,0,.25)}
.pro-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-top:.4rem}
.pro-pad button{min-height:3.4rem;border-radius:.9rem;border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--text);font-size:1.35rem;font-weight:900;touch-action:manipulation}
.pro-pad button.hit{background:rgba(58,160,255,.35);border-color:#3aa0ff}
.pro-digits{min-height:2.6rem;padding:.4rem .7rem;border-radius:.8rem;border:1px dashed var(--line);font:900 1.6rem ui-monospace,monospace;letter-spacing:.12em;word-break:break-all;margin-top:.45rem}
.pro-tabs{display:flex;gap:.35rem;flex-wrap:wrap;margin:.3rem 0 .5rem}.pro-tabs .btn{flex:1;min-height:2.7rem;font-size:.8rem}
.pro-flow{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;font-size:.74rem;margin:.4rem 0}.pro-flow span{padding:.25rem .55rem;border-radius:999px;border:1px solid var(--line);background:rgba(0,0,0,.2)}.pro-flow span.on{border-color:var(--good);color:var(--good)}
.pro-text{width:100%;min-height:4.6rem;border-radius:.8rem;border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--text);font:700 1rem ui-monospace,monospace;padding:.5rem}
.pro-out{padding:.55rem .7rem;border-radius:.8rem;background:rgba(0,0,0,.25);border:1px solid var(--line);font-size:.86rem;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.pro-out b.ok{color:var(--good)}.pro-out b.bad{color:var(--bad)}
.pro-sel{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}.pro-sel label{font-size:.76rem}
.pro-sel select,.pro-ch select{width:100%}
.pro-age{width:100%;border-collapse:collapse;font-size:.78rem;margin-top:.4rem}.pro-age td{padding:.25rem .4rem;border-bottom:1px solid var(--line)}.pro-age tr.hit td{background:rgba(56,230,153,.16);font-weight:900}
`;document.head.appendChild(css);

/* ======================= GENERATOR PRO ======================= */
const G={out:null,chans:{},noise:null,noiseKind:null,sweep:null,active:false,ratio:'free',dtmf:new Map()};
function ctx(){A().ensure();return A().ctx}
function master(){const c=ctx();if(!G.out){G.out=c.createGain();G.out.gain.value=.9;G.out.connect(c.destination);try{G.out.connect(A().mix)}catch(_){}}return G.out}
function chan(k){if(G.chans[k])return G.chans[k];const c=ctx(),o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner?c.createStereoPanner():c.createGain();
 g.gain.value=0;o.connect(g);g.connect(p);p.connect(master());o.start();return G.chans[k]={o,g,p,on:false,f:k==='A'?440:443,wave:'sine',lvl:.22}}
function applyChan(k){const ch=chan(k),c=ctx(),t=c.currentTime;ch.o.type=ch.wave;ch.o.frequency.cancelScheduledValues(t);ch.o.frequency.setTargetAtTime(ch.f,t,.012);
 ch.g.gain.setTargetAtTime(ch.on?ch.lvl:0,t,.03);if(ch.p.pan)ch.p.pan.setTargetAtTime($('gStereo')?.checked?(k==='A'?-1:1):0,t,.05)}
const RATIOS={free:null,'1:1':1,'2:1':2,'3:2':1.5,'4:3':4/3,'5:4':1.25,'beat3':'+3','beat1':'+1'};
function lockB(){const r=RATIOS[G.ratio];if(r==null)return;const a=chan('A').f;chan('B').f=typeof r==='string'?a+(+r):a*r;syncGenUI();applyChan('B')}
function noiseBuffer(kind){const c=ctx(),n=c.sampleRate*2,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
 for(let i=0;i<n;i++){const w=Math.random()*2-1;if(kind==='white')d[i]=w*.5;else{b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}}return b}
function setNoise(kind){if(G.noise){try{G.noise.src.stop()}catch(_){}G.noise=null}G.noiseKind=kind;if(!kind)return syncGenUI();
 const c=ctx(),src=c.createBufferSource(),g=c.createGain();src.buffer=noiseBuffer(kind);src.loop=true;g.gain.value=.35;src.connect(g);g.connect(master());src.start();G.noise={src,g};syncGenUI()}
function allOff(){['A','B'].forEach(k=>{if(G.chans[k]){G.chans[k].on=false;applyChan(k)}});setNoise(null);stopSweep(true);syncGenUI()}

/* ---- sapuan / tes pendengaran ---- */
const AGES=[[17000,'≥ 17 kHz','biasanya usia < 25 tahun'],[15000,'15–17 kHz','biasanya 25–40 tahun'],[12000,'12–15 kHz','biasanya 40–50 tahun'],[0,'< 12 kHz','> 50 tahun · atau batas speaker']];
function startSweep(f0,f1,T,kind){stopSweep(true);const ch=chan('A'),c=ctx(),t=c.currentTime;['B'].forEach(k=>{if(G.chans[k]){G.chans[k].on=false;applyChan(k)}});setNoise(null);
 ch.wave='sine';ch.o.type='sine';ch.on=true;ch.lvl=kind==='hear'?.16:.3;ch.o.frequency.cancelScheduledValues(t);ch.o.frequency.setValueAtTime(f0,t);ch.o.frequency.exponentialRampToValueAtTime(f1,t+T);
 ch.g.gain.cancelScheduledValues(t);ch.g.gain.setTargetAtTime(ch.lvl,t,.05);G.sweep={f0,f1,T,t0:t,kind,result:null};$('gSweepBox').hidden=false;
 $('gSweepAsk').textContent=kind==='hear'?'🙋 Saya sudah TIDAK dengar':'✋ Berhenti';$('gAge').innerHTML=kind==='hear'?AGES.map(a=>`<tr data-f="${a[0]}"><td>${a[1]}</td><td>${a[2]}</td></tr>`).join(''):'';
 $('gSweepNote').textContent=kind==='hear'?'Nada naik dari 8 kHz. Angkat tangan / tekan tombol saat suara HILANG. Speaker IFP bisa melemah di atas ±15 kHz — pakai headphone agar adil.':'Nada turun-naik di daerah bass. Taruh tangan di dekat speaker: rasakan getarannya!';pulse('soundscope_sweep',{kind})}
function sweepNow(){const s=G.sweep;if(!s)return 0;const c=ctx(),u=clamp((c.currentTime-s.t0)/s.T,0,1);return s.f0*Math.pow(s.f1/s.f0,u)}
function stopSweep(silent){const s=G.sweep;if(!s)return;const f=sweepNow(),ch=G.chans.A;G.sweep=null;if(ch){ch.on=false;ch.f=Math.round(f);const t=ctx().currentTime;ch.o.frequency.cancelScheduledValues(t);ch.o.frequency.setValueAtTime(ch.f,t);applyChan('A')}
 if(silent){$('gSweepBox')&&($('gSweepBox').hidden=true);return}
 if(s.kind==='hear'){$('gSweepF').textContent='≈ '+fmtHz(f);$('gSweepNote').textContent='Batas pendengaranmu ≈ '+fmtHz(f)+'. Telinga (sel rambut koklea) paling cepat kehilangan nada tinggi — lindungi dari suara keras!';
  const row=AGES.find(a=>f>=a[0]);$('gAge').querySelectorAll('tr').forEach(r=>r.classList.toggle('hit',+r.dataset.f===row[0]));toast('👂 Batas dengar ≈ '+fmtHz(f),'good')}
 else $('gSweepBox').hidden=true;syncGenUI()}

/* ---- DTMF ---- */
const ROWS=[697,770,852,941],COLS=[1209,1336,1477,1633],KEYS=['1','2','3','A','4','5','6','B','7','8','9','C','*','0','#','D'];
function dtmfOn(key,id){const i=KEYS.indexOf(key),c=ctx(),g=c.createGain(),o1=c.createOscillator(),o2=c.createOscillator();o1.frequency.value=ROWS[i>>2];o2.frequency.value=COLS[i&3];
 g.gain.value=0;o1.connect(g);o2.connect(g);g.connect(master());o1.start();o2.start();g.gain.setTargetAtTime(.18,c.currentTime,.004);G.dtmf.set(id,{g,o1,o2})}
function dtmfOff(id){const v=G.dtmf.get(id);if(!v)return;const t=ctx().currentTime;v.g.gain.setTargetAtTime(0,t,.006);v.o1.stop(t+.06);v.o2.stop(t+.06);G.dtmf.delete(id)}
const DEC={on:false,last:'',stable:0,gap:9,text:''};
function goertzel(x,start,n,f,sr){const w=2*Math.PI*f/sr,c=2*Math.cos(w);let s1=0,s2=0;for(let i=start;i<start+n;i++){const s=x[i]+c*s1-s2;s2=s1;s1=s}return s1*s1+s2*s2-c*s1*s2}
function dtmfDetect(){const td=A().timeDomain?.(),sr=A().sampleRate?.()||48000;if(!td)return null;const n=Math.min(2048,td.length),st=td.length-n;let e=0;for(let i=st;i<td.length;i++)e+=td[i]*td[i];if(e/n<1e-6)return null;
 const r=ROWS.map(f=>goertzel(td,st,n,f,sr)),c=COLS.map(f=>goertzel(td,st,n,f,sr)),ri=r.indexOf(Math.max(...r)),ci=c.indexOf(Math.max(...c));
 const r2=Math.max(...r.filter((_,i)=>i!==ri)),c2=Math.max(...c.filter((_,i)=>i!==ci)),tot=e*n/2;
 if(r[ri]<r2*4||c[ci]<c2*4||(r[ri]+c[ci])<tot*.2)return null;
 if(Math.min(r[ri],c[ci])<Math.max(r[ri],c[ci])*.1)return null;   /* twist ≤10 dB: DTMF selalu dua nada, nada tunggal ditolak */
/* toleran derau kelas: dominan 4× & ≥20% energi */return KEYS[ri*4+ci]}

/* ---- Lissajous XY ---- */
const WAVE={sine:p=>Math.sin(p),square:p=>Math.sin(p)>=0?1:-1,triangle:p=>2/Math.PI*Math.asin(Math.sin(p)),sawtooth:p=>{const u=p/(2*Math.PI);return 2*(u-Math.floor(u+.5))}};
function drawLiss(){const cv=$('gLiss');if(!cv)return;const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),W=Math.round(r.width*d);if(cv.width!==W){cv.width=W;cv.height=W}const x=cv.getContext('2d');x.clearRect(0,0,W,W);
 x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=1;x.beginPath();x.moveTo(W/2,0);x.lineTo(W/2,W);x.moveTo(0,W/2);x.lineTo(W,W/2);x.stroke();
 const a=G.chans.A,b=G.chans.B;if(!a||!b||!a.on||!b.on){x.fillStyle='rgba(255,255,255,.6)';x.font=`700 ${13*d}px system-ui`;x.textAlign='center';x.fillText('Nyalakan kanal A dan B',W/2,W/2-8*d);return}
 const t0=ctx().currentTime,T=8/Math.min(a.f,b.f),N=900,fa=WAVE[a.wave]||WAVE.sine,fb=WAVE[b.wave]||WAVE.sine,R=W*.42;
 const g=x.createLinearGradient(0,0,W,W);g.addColorStop(0,'#3aa0ff');g.addColorStop(1,'#38e699');x.strokeStyle=g;x.lineWidth=2.2*d;x.beginPath();
 for(let i=0;i<=N;i++){const t=t0+T*i/N,px=W/2+R*fa(2*Math.PI*a.f*t),py=W/2-R*fb(2*Math.PI*b.f*t);i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke();
 const rr=b.f/a.f;let lab='rasio B:A = '+rr.toFixed(3);[[1,'1:1'],[2,'2:1 oktaf'],[1.5,'3:2 kuint'],[4/3,'4:3 kuart'],[1.25,'5:4 terts']].forEach(q=>{if(Math.abs(rr-q[0])<.002)lab='rasio '+q[1]+' · pola diam'});
 x.fillStyle='rgba(255,255,255,.8)';x.font=`800 ${12*d}px system-ui`;x.textAlign='left';x.fillText(lab,8*d,16*d)}

function genHTML(){return `
<div class="card"><b>🎛️ Generator 2 Kanal</b><div class="hint">Keluar ke speaker IFP <i>dan</i> ke spektrum/waveform di tengah — siswa melihat bunyi yang mereka dengar.</div>
 ${['A','B'].map(k=>`<div class="pro-ch"><b class="tag" style="background:${k==='A'?'#3aa0ff':'#38e699'}">${k}</b>
  <input type="range" id="g${k}f" min="0" max="1000" step="1" aria-label="Frekuensi kanal ${k}"><output id="g${k}fo"></output>
  <div class="pro-ctl"><select id="g${k}w" aria-label="Gelombang ${k}"><option value="sine">Sinus</option><option value="square">Persegi</option><option value="triangle">Segitiga</option><option value="sawtooth">Gergaji</option></select>
  <button class="btn" id="g${k}m">−</button><button class="btn" id="g${k}p">+</button><button class="btn good" id="g${k}on">▶ ${k}</button></div></div>`).join('')}
 <div class="pro-sel"><label>Kunci kanal B<select id="gRatio"><option value="free">Bebas</option><option value="beat3">A + 3 Hz (pelayangan)</option><option value="beat1">A + 1 Hz (pelayangan pelan)</option><option value="1:1">1 : 1 (unison)</option><option value="2:1">2 : 1 (oktaf)</option><option value="3:2">3 : 2 (kuint)</option><option value="4:3">4 : 3 (kuart)</option><option value="5:4">5 : 4 (terts mayor)</option></select></label>
  <label style="display:flex;align-items:end;gap:.4rem"><input type="checkbox" id="gStereo"> A kiri · B kanan (stereo)</label></div>
 <div class="hint" id="gBeat" style="margin-top:.4rem"></div>
 <div class="row" style="margin-top:.4rem"><button class="btn danger" id="gOff">■ Matikan semua</button></div>
</div>
<div class="card"><b>✨ Demo 1 sentuhan</b><div class="pro-grid" style="margin-top:.4rem">
 <button class="btn primary" data-demo="beat">〰️ Pelayangan 440/443</button><button class="btn primary" data-demo="fifth">🎵 Kuint 3:2 + Lissajous</button>
 <button class="btn primary" data-demo="octave">🎶 Oktaf 2:1</button><button class="btn good" data-demo="hear">👂 Tes pendengaran</button>
 <button class="btn primary" data-demo="bass">🔊 Sapuan bass 20–200 Hz</button><button class="btn primary" data-demo="square">⬛ Persegi = harmonik ganjil</button>
 <button class="btn" data-demo="white">⚪ Derau putih</button><button class="btn" data-demo="pink">🌸 Derau merah muda</button></div>
 <div id="gSweepBox" hidden style="margin-top:.6rem"><div class="pro-big" id="gSweepF">—</div><div class="hint" id="gSweepNote"></div>
  <div class="row" style="margin-top:.4rem"><button class="btn warn" id="gSweepAsk">🙋 Saya sudah TIDAK dengar</button></div><table class="pro-age" id="gAge"></table></div></div>
<div class="card"><b>〰️ Lissajous XY (A ↔ B)</b><div class="hint">Sumbu X = kanal A, sumbu Y = kanal B. Rasio sederhana → pola diam; selisih kecil → pola berputar (pelayangan).</div><canvas class="pro-liss" id="gLiss"></canvas></div>
<div class="card"><b>📞 DTMF · nada tombol telepon</b><div class="hint">Setiap tombol = 2 nada sekaligus (baris + kolom). Tekan di bawah, atau tekan tombol dial HP di dekat mikrofon IFP.</div>
 <div class="pro-pad" id="gPad">${KEYS.map(k=>`<button data-k="${k}">${k}</button>`).join('')}</div>
 <div class="row" style="margin-top:.5rem"><button class="btn good" id="gDec">🎧 Dekode DTMF dari mic</button><button class="btn" id="gDecClr">↺ Hapus</button></div>
 <div class="pro-digits" id="gDigits" aria-live="polite"></div></div>`}
function syncGenUI(){if(!$('gAf'))return;['A','B'].forEach(k=>{const ch=G.chans[k]||{f:k==='A'?440:443,wave:'sine',on:false};$('g'+k+'f').value=logV(ch.f);$('g'+k+'fo').textContent=fmtHz(ch.f)+' · '+noteName(ch.f);$('g'+k+'w').value=ch.wave;
  const b=$('g'+k+'on');b.textContent=ch.on?'■ '+k:'▶ '+k;b.className='btn '+(ch.on?'danger':'good')});
 const a=G.chans.A,b=G.chans.B;$('gBeat').innerHTML=a&&b&&a.on&&b.on?'Selisih |f<sub>A</sub> − f<sub>B</sub>| = <b>'+Math.abs(a.f-b.f).toFixed(1)+' Hz</b> → '+(Math.abs(a.f-b.f)<15?'terdengar pelayangan <b>'+Math.abs(a.f-b.f).toFixed(1)+'×/detik</b> (keras-lemah berulang)':'terdengar dua nada / interval'):G.noiseKind?'Derau '+(G.noiseKind==='white'?'putih: energi sama tiap Hz (desis tajam)':'merah muda: energi sama tiap oktaf (seperti hujan)'):''}
function bindGen(){['A','B'].forEach(k=>{
  $('g'+k+'f').oninput=e=>{const ch=chan(k);ch.f=Math.round(logF(+e.target.value)*10)/10;if(k==='A')lockB();if(k==='B')G.ratio='free',$('gRatio').value='free';applyChan(k);syncGenUI()};
  $('g'+k+'w').onchange=e=>{chan(k).wave=e.target.value;applyChan(k)};
  $('g'+k+'m').onclick=()=>{const ch=chan(k);ch.f=Math.max(20,Math.round(ch.f-(ch.f>=1000?10:1)));if(k==='A')lockB();applyChan(k);syncGenUI()};
  $('g'+k+'p').onclick=()=>{const ch=chan(k);ch.f=Math.min(20000,Math.round(ch.f+(ch.f>=1000?10:1)));if(k==='A')lockB();applyChan(k);syncGenUI()};
  $('g'+k+'on').onclick=()=>{stopSweep(true);const ch=chan(k);ch.on=!ch.on;if(k==='B'&&ch.on)lockB();applyChan(k);syncGenUI()}});
 $('gRatio').onchange=e=>{G.ratio=e.target.value;lockB()};$('gStereo').onchange=()=>{['A','B'].forEach(k=>G.chans[k]&&applyChan(k))};
 $('gOff').onclick=allOff;
 const demo={beat:()=>set2(440,443,'sine','beat3'),fifth:()=>set2(440,660,'sine','3:2'),octave:()=>set2(220,440,'sine','2:1'),
  square:()=>{allOff();const a=chan('A');a.f=220;a.wave='square';a.on=true;applyChan('A');syncGenUI();toast('Lihat spektrum: puncak di 220, 660, 1100 Hz… (kelipatan ganjil)','good')},
  hear:()=>startSweep(8000,20000,26,'hear'),bass:()=>startSweep(20,200,14,'bass'),white:()=>{allOff();setNoise('white')},pink:()=>{allOff();setNoise('pink')}};
 function set2(fa,fb,w,ratio){allOff();const a=chan('A'),b=chan('B');a.f=fa;b.f=fb;a.wave=b.wave=w;a.on=b.on=true;G.ratio=ratio;$('gRatio').value=ratio;applyChan('A');applyChan('B');syncGenUI()}
 document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>{demo[b.dataset.demo]();pulse('soundscope_gen_demo',{demo:b.dataset.demo})});
 $('gSweepAsk').onclick=()=>stopSweep(false);
 $('gPad').querySelectorAll('button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);b.classList.add('hit');dtmfOn(b.dataset.k,e.pointerId)});
  const up=e=>{b.classList.remove('hit');dtmfOff(e.pointerId)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)});
 $('gDec').onclick=async()=>{DEC.on=!DEC.on;if(DEC.on&&!A().micOn){try{await A().startMic()}catch(_){}}$('gDec').textContent=DEC.on?'■ Stop dekoder':'🎧 Dekode DTMF dari mic';$('gDec').className='btn '+(DEC.on?'danger':'good')};
 $('gDecClr').onclick=()=>{DEC.text='';$('gDigits').textContent=''};
 syncGenUI()}

/* ======================= TRANSCODER ======================= */
const X={src:'text',decoded:'',samples:null,rec:null};
const MORSE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.','.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','-':'-....-','@':'.--.-.'};
const SR=48000;
function chunks(t){const s=FC().sanitize?String(t||'').replace(/[^\x20-\x7e]/g,'?'):t,out=[];for(let i=0;i<s.length;i+=FC().MAXLEN)out.push(s.slice(i,i+FC().MAXLEN));return out.filter(x=>x.trim().length)}
function encBfsk(text,chName,symMs,mode){const [f0,f1]=CH[chName],parts=chunks(text),bufs=[];let bits=0;
 parts.forEach(p=>{const fr=FC().encodeFrame(p,mode);if(!fr)return;bits+=fr.bits.length;bufs.push(FC().modulate(fr.bits,{sr:SR,f0,f1,symMs,amp:.32,lead:.25,tail:.35}))});
 return{x:concat(bufs,.35),packets:parts.length,bits,desc:'BFSK kanal '+chName+' ('+f0+'/'+f1+' Hz) · '+symMs+' ms/simbol · '+FC().MODES[mode].short}}
function encMorse(text,wpm,hz){const u=1.2/wpm,seq=[];String(text).toUpperCase().split('').forEach(ch=>{if(ch===' '){seq.push([0,4*u]);return}const c=MORSE[ch];if(!c)return;
  c.split('').forEach((s,i)=>{seq.push([1,s==='.'?u:3*u]);seq.push([0,u])});seq.push([0,2*u])});
 const total=seq.reduce((a,s)=>a+s[1],0)+.6,x=new Float32Array(Math.ceil(total*SR));let t=.3*SR,ph=0;const w=2*Math.PI*hz/SR,ramp=Math.round(.005*SR);
 seq.forEach(([on,d])=>{const n=Math.round(d*SR);if(on)for(let i=0;i<n;i++){ph+=w;let g=.35;if(i<ramp)g*=i/ramp;if(n-i<ramp)g*=(n-i)/ramp;x[t+i]=g*Math.sin(ph)}t+=n});
 return{x,packets:1,bits:seq.length,desc:'Morse '+wpm+' wpm · '+hz+' Hz'}}
function concat(list,gap){const g=Math.round(gap*SR),n=list.reduce((a,b)=>a+b.length+g,0),x=new Float32Array(n);let o=0;list.forEach(b=>{x.set(b,o);o+=b.length+g});return x}
function wav(x,sr){const n=x.length,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)v.setInt16(44+i*2,clamp(x[i],-1,1)*32767,true);return new Blob([buf],{type:'audio/wav'})}
/* dekode BFSK: jalankan 12 penerima paralel (4 kanal × 3 laju) bila "otomatis" */
function decodeBfsk(x,sr,want){const combos=[];Object.keys(CH).forEach(c=>[30,40,60].forEach(s=>{if(want==='auto'||want===c+s)combos.push([c,s])}));
 const res=combos.map(([c,s])=>{const R=new (FC().Receiver)({sr,f0:CH[c][0],f1:CH[c][1],symMs:s}),pk=[];for(let o=0;o<x.length;o+=4096){R.push(x.subarray(o,Math.min(x.length,o+4096))).forEach(e=>{if(e.type==='packet')pk.push(e)})}return{c,s,pk}});
 res.sort((a,b)=>b.pk.filter(p=>p.ok).length-a.pk.filter(p=>p.ok).length||b.pk.length-a.pk.length);return res[0]&&res[0].pk.length?res[0]:null}
function codecHTML(){return `
<div class="card"><b>🔁 Transcoder sinyal</b><div class="hint">Teks ⇄ suara. Dekode BFSK dari file/mikrofon, lalu kode ulang ke kanal, laju, koreksi error, atau Morse yang berbeda — seperti modem sungguhan.</div>
 <div class="pro-flow" id="xFlow"><span data-s="in">1 Masukan</span>→<span data-s="dec">2 Bit & teks</span>→<span data-s="enc">3 Modulasi ulang</span>→<span data-s="out">4 Suara / WAV</span></div></div>
<div class="card"><b>1️⃣ Masukan</b><div class="pro-tabs"><button class="btn on" data-x="text">✍️ Teks</button><button class="btn" data-x="file">📂 File WAV</button><button class="btn" data-x="mic">🎤 Rekam mic</button></div>
 <div data-xp="text"><textarea class="pro-text" id="xText" maxlength="96" placeholder="Tulis pesan (maks 96 karakter ASCII = 3 paket)">HALO DARI PILAR IFP</textarea></div>
 <div data-xp="file" hidden><input type="file" id="xFile" accept="audio/*,.wav"><div class="hint">File WAV dari tombol 💾 di bawah, atau rekaman sinyal BFSK dari HP.</div></div>
 <div data-xp="mic" hidden><div class="row"><button class="btn good" id="xRec">⏺ Rekam 12 detik</button></div><div class="hint">Putar sinyal BFSK dari HP/laptop lain di dekat mikrofon IFP.</div></div>
 <div class="pro-sel" style="margin-top:.45rem" id="xInSel" hidden><label>Kanal masukan<select id="xInCh"><option value="auto">🔎 Otomatis (4 kanal × 3 laju)</option>${Object.keys(CH).flatMap(c=>[30,40,60].map(s=>`<option value="${c}${s}">${c} · ${CH[c][0]}/${CH[c][1]} Hz · ${s} ms</option>`)).join('')}</select></label><span></span></div>
 <div class="pro-out" id="xDec" style="margin-top:.45rem">Teks siap dikodekan.</div></div>
<div class="card"><b>2️⃣ Keluaran</b>
 <div class="pro-sel"><label>Format<select id="xFmt"><option value="bfsk">BFSK (Hamming)</option><option value="morse">Morse OOK</option></select></label>
  <label>Kanal / nada<select id="xCh">${Object.keys(CH).map(c=>`<option value="${c}">${c} · ${CH[c][0]}/${CH[c][1]} Hz</option>`).join('')}<option value="m700">Morse 700 Hz</option></select></label>
  <label>Laju<select id="xSym"><option value="30">30 ms/simbol (cepat)</option><option value="40" selected>40 ms</option><option value="60">60 ms (tahan bising)</option><option value="w12">Morse 12 wpm</option><option value="w20">Morse 20 wpm</option></select></label>
  <label>Koreksi error<select id="xFec"><option value="0">CRC saja</option><option value="1">Hamming(7,4)</option><option value="2" selected>Hamming + interleaving</option></select></label></div>
 <div class="row" style="margin-top:.5rem"><button class="btn good" id="xPlay">▶ Putar</button><button class="btn primary" id="xWav">💾 Unduh WAV</button><button class="btn" id="xSelf">🔁 Uji: dekode hasil sendiri</button></div>
 <div class="pro-out" id="xInfo" style="margin-top:.45rem">—</div></div>`}
function xFlow(st){document.querySelectorAll('#xFlow span').forEach(s=>s.classList.toggle('on',st.includes(s.dataset.s)))}
function currentText(){return X.src==='text'?$('xText').value:X.decoded}
function buildOut(){const t=currentText();if(!t||!t.trim()){toast('Belum ada teks/pesan untuk dikodekan.','warn');return null}
 const fmt=$('xFmt').value;let r;if(fmt==='morse'){const w=$('xSym').value.startsWith('w')?+$('xSym').value.slice(1):15;r=encMorse(t,w,700)}else r=encBfsk(t,/^[A-D]$/.test($('xCh').value)?$('xCh').value:'B',+$('xSym').value||40,+$('xFec').value);
 X.samples=r.x;$('xInfo').innerHTML='<b>'+r.desc+'</b>\n'+r.packets+' paket'+(fmt==='bfsk'?' · '+r.bits+' simbol (bit)':'')+' · durasi '+(r.x.length/SR).toFixed(1).replace('.',',')+' dtk';xFlow(['in','dec','enc','out']);return r}
let playUntil=0;function play(x){const c=ctx(),b=c.createBuffer(1,x.length,SR);b.copyToChannel(x,0);const s=c.createBufferSource();s.buffer=b;s.connect(master());s.start();playUntil=performance.now()+x.length/SR*1000;toast('▶ Memutar '+(x.length/SR).toFixed(1)+' dtk — lihat spektrumnya!','good');return s}
async function decodeBuffer(x,sr){const want=$('xInCh').value,r=decodeBfsk(x,sr,want);
 if(!r){$('xDec').innerHTML='<b class="bad">✗ Tidak ada paket BFSK ditemukan.</b> Pastikan kanal & laju cocok, atau pilih Otomatis.';X.decoded='';xFlow(['in']);return}
 const ok=r.pk.filter(p=>p.ok);X.decoded=ok.map(p=>p.text).join('');
 $('xDec').innerHTML=(ok.length?'<b class="ok">✓ '+ok.length+'/'+r.pk.length+' paket lolos CRC</b>':'<b class="bad">✗ paket rusak (CRC gagal)</b>')+' · kanal '+r.c+' ('+CH[r.c].join('/')+' Hz) · '+r.s+' ms'+(r.pk.some(p=>p.fixed)?' · '+r.pk.reduce((a,p)=>a+(p.fixed||0),0)+' bit diperbaiki Hamming':'')+'\n“'+(ok.map(p=>p.text).join('')||r.pk.map(p=>p.text).join(''))+'”';
 xFlow(['in','dec']);pulse('soundscope_transcode_decode',{ok:ok.length,ch:r.c,sym:r.s})}
function bindCodec(){document.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{X.src=b.dataset.x;document.querySelectorAll('[data-x]').forEach(q=>q.classList.toggle('on',q===b));
  document.querySelectorAll('[data-xp]').forEach(p=>p.hidden=p.dataset.xp!==X.src);$('xInSel').hidden=X.src==='text';$('xDec').textContent=X.src==='text'?'Teks siap dikodekan.':'Belum ada sinyal didekode.';xFlow(['in'])});
 $('xFmt').onchange=e=>{const m=e.target.value==='morse';$('xCh').value=m?'m700':'B';$('xSym').value=m?'w20':'40';$('xFec').disabled=m};
 $('xFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const ab=await f.arrayBuffer(),b=await ctx().decodeAudioData(ab);$('xDec').textContent='Mendekode '+f.name+' ('+b.duration.toFixed(1)+' dtk)…';await new Promise(r=>setTimeout(r,20));await decodeBuffer(b.getChannelData(0),b.sampleRate)}catch(err){$('xDec').textContent='Gagal membaca file: '+err.message}};
 $('xRec').onclick=async()=>{if(X.rec)return;if(!A().micOn){try{await A().startMic()}catch(_){}}const src=A().src;if(!src){toast('Mikrofon belum aktif.','bad');return}
  const c=ctx(),sp=c.createScriptProcessor(4096,1,1),mute=c.createGain(),parts=[];mute.gain.value=0;sp.onaudioprocess=e=>parts.push(new Float32Array(e.inputBuffer.getChannelData(0)));src.connect(sp);sp.connect(mute);mute.connect(c.destination);
  X.rec=true;let left=12;$('xRec').textContent='⏺ Merekam… 12';const iv=setInterval(()=>{left--;$('xRec').textContent='⏺ Merekam… '+left;if(left<=0){clearInterval(iv);try{src.disconnect(sp);sp.disconnect()}catch(_){}X.rec=false;$('xRec').textContent='⏺ Rekam 12 detik';
   const n=parts.reduce((a,p)=>a+p.length,0),x=new Float32Array(n);let o=0;parts.forEach(p=>{x.set(p,o);o+=p.length});$('xDec').textContent='Mendekode rekaman…';setTimeout(()=>decodeBuffer(x,c.sampleRate),20)}},1000)};
 $('xPlay').onclick=()=>{const r=buildOut();if(r)play(r.x)};
 $('xWav').onclick=()=>{const r=buildOut();if(!r)return;const a=document.createElement('a'),u=URL.createObjectURL(wav(r.x,SR));a.href=u;a.download='PILAR_'+($('xFmt').value==='morse'?'Morse':'BFSK_'+$('xCh').value+'_'+$('xSym').value+'ms')+'_'+Date.now()+'.wav';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);pulse('soundscope_transcode_wav')};
 $('xSelf').onclick=()=>{const r=buildOut();if(!r)return;if($('xFmt').value==='morse'){toast('Uji dekode sendiri tersedia untuk BFSK.','warn');return}const prev=$('xInCh').value;$('xInCh').value='auto';decodeBuffer(r.x,SR).then(()=>{$('xInCh').value=prev})};
 xFlow(['in'])}

/* ======================= aktivasi & loop ======================= */
let mounted=false,tool='';
function mount(){if(mounted)return;if(!$('genMount')||!$('codecMount'))return;$('genMount').innerHTML=genHTML();$('codecMount').innerHTML=codecHTML();bindGen();bindCodec();mounted=true}
function activate(t){mount();tool=t;if(t!=='gen'){allOffSoft()}}
function allOffSoft(){if(!G.out)return;['A','B'].forEach(k=>{if(G.chans[k]&&G.chans[k].on){G.chans[k].on=false;applyChan(k)}});if(G.noise)setNoise(null);stopSweep(true);syncGenUI()}
let lastDec=0;
function loop(now){requestAnimationFrame(loop);if(!mounted||document.hidden)return;
 if(tool==='gen'){drawLiss();if(G.sweep){const f=sweepNow();$('gSweepF').textContent=fmtHz(f);if(ctx().currentTime-G.sweep.t0>G.sweep.T+.3)stopSweep(G.sweep.kind!=='hear')}
  /* berbasis waktu (tidak tergantung fps): tombol diterima bila terdeteksi ≥40 ms; tombol berbeda / jeda = tombol baru */
  if(DEC.on&&now-lastDec>30){lastDec=now;const k=dtmfDetect()||'';
   if(k!==DEC.last){DEC.last=k;DEC.since=now;DEC.emitted=false}
   else if(k&&!DEC.emitted&&now-DEC.since>=40){DEC.emitted=true;DEC.text=(DEC.text+k).slice(-40);$('gDigits').textContent=DEC.text;pulse('soundscope_dtmf_digit')}}}}
requestAnimationFrame(loop);
const sounding=()=>!!(['A','B'].some(k=>G.chans[k]&&G.chans[k].on)||G.noise||G.sweep||G.dtmf.size||performance.now()<playUntil);
window.SoundScopePro={activate,sounding,encBfsk,encMorse,decodeBfsk,wav,dtmfDetect,goertzel,KEYS,ROWS,COLS,state:{G,X,DEC}};
if(document.readyState!=='loading')mount();else document.addEventListener('DOMContentLoaded',mount);
})();
