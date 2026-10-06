/* PILAR SoundScope v4.1.1 — acoustic link. Dua modulasi:
   OOK  = On-Off Keying (kode Morse; ambang relatif terhadap puncak carrier)
   FSK  = Frequency-Shift Keying 2 nada + frame (preamble, sinkron Barker-13, panjang, data 6-bit, CRC-8) */
(function(){
'use strict';
const A=window.SOUNDSCOPE_MORSE_AUDIO;
const $=id=>document.getElementById(id);
if(!A||!$('morseControlMount')||!$('morseStage'))return;
const MORSE={
 A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
 K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
 U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
 0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',
 6:'-....',7:'--...',8:'---..',9:'----.',
 '.':'.-.-.-',',':'--..--','?':'..--..','/':'-..-.'
};
const DECODE=Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const CHOICES=[600,800,1000,1200,1500,1800];
const UNITS=[80,100,120,160,220];

/* ---------- Parameter protokol FSK ---------- */
const FSK_DEV=200;                       // bit 0 = carrier-200 Hz, bit 1 = carrier+200 Hz
const FSK_MAXCHARS=63;                   // panjang pesan 6 bit
const FSK_PRE='10101010';                // 8 bit bergantian: pemanasan speaker + pengenalan dua nada
const FSK_BARKER='1111100110101';        // Barker-13: kata sinkron dengan korelasi sangat tajam
const FSK_WARM=4;                        // 4 bit preamble pertama hanya 'pemanasan' (boleh hilang)
const FSK_HDR=FSK_PRE.length+FSK_BARKER.length;       // 21 bit header
const FSK_PAT=(FSK_PRE.slice(FSK_WARM)+FSK_BARKER).split('').map(Number); // 17 bit yang dikorelasikan
const FSK_CHARS='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ .,?/';              // tiap karakter = indeks 6 bit
const PRES=10;                           // tenaga nada harus > PRES × noise floor

const control=[
 '<div class="morse-config">',
 '<div class="morse-modes"><button class="btn on" id="mModeTx" type="button">📡 TRANSMIT</button><button class="btn" id="mModeRx" type="button">🎧 RECEIVE</button></div>',
 '<label>Modulasi<select id="mMod"><option value="ook">OOK · On-Off Keying (kode Morse)</option><option value="fsk">FSK · 2 nada + CRC (lebih tahan gangguan)</option></select></label>',
 '<div class="morse-pane" id="mTxPane">',
 '<label>Pesan rahasia (A–Z, 0–9)<textarea id="mTxText" maxlength="72" spellcheck="false" placeholder="Ketik pesan rahasia...">PILAR HEBAT</textarea></label>',
 '<div class="morse-split"><label>Carrier TX (Hz)<select id="mTxFreq"></select></label><label id="mTxUnitLabel">Unit Morse (T)<select id="mTxUnit"></select></label></div>',
 '<div class="morse-ctl"><button class="btn good" id="mSend">▶ Kirim pesan</button><button class="btn primary" id="mPilot">🎵 Uji carrier (1 dtk)</button><button class="btn danger" id="mStopTx">■ Hentikan</button><button class="btn" id="mBack">← Kembali Lab</button></div>',
 '<div class="morse-progress"><i id="mTxProgress"></i></div>',
 '<div class="morse-note" id="mTxStatus">TX siap · satu frekuensi carrier, dinyalakan/dimatikan menurut titik–garis. Pastikan volume speaker cukup, tidak maksimal.</div>',
 '<div class="card"><b>🔎 Kode yang dikirim</b><div class="morse-note" id="mTxCode"></div></div>',
 '</div>',
 '<div class="morse-pane" id="mRxPane" hidden>',
 '<div class="morse-split"><label>Carrier RX (Hz)<select id="mRxFreq"></select></label><label id="mRxUnitLabel">Unit Morse (T)<select id="mRxUnit"></select></label></div>',
 '<label id="mSensLabel">Kepekaan detektor<select id="mSensitivity"><option value="2.7">Tinggi (ruang tenang)</option><option value="3.8" selected>Normal</option><option value="5.4">Rendah (ruang bising)</option></select></label>',
 '<div class="morse-ctl"><button class="btn good" id="mRxStart">🎤 Mulai dengar</button><button class="btn primary" id="mLock">🎯 Auto Lock</button><button class="btn danger" id="mRxStop">■ Stop RX</button><button class="btn" id="mClear">↺ Bersihkan teks</button></div>',
 '<div class="morse-stats"><div><small id="mLblLock">CARRIER LOCK</small><b id="mRxLock">1000 Hz · manual</b></div><div><small id="mLblSnr">CARRIER / SNR</small><b id="mRxSnr">—</b></div><div><small>MIC RAW</small><b id="mRxRaw">—</b></div><div><small id="mLblGate">DETECTOR</small><b id="mRxGate">menunggu</b></div></div>',
 '<div class="morse-meter-row"><span>MIC</span><div class="morse-progress"><i id="mRxRawLevel"></i></div></div>',
 '<div class="morse-meter-row"><span>CARRIER</span><div class="morse-progress"><i id="mRxLevel"></i></div></div>',
 '<div class="morse-note" id="mRxStatus">Tekan Mulai Dengar, lalu kirim bunyi dari HP lain. Saat Auto Lock, gunakan Uji Carrier dari HP.</div>',
 '<div class="card"><b>📨 Hasil decoding</b><div class="morse-big" id="mRxText" aria-live="polite">…</div><div class="morse-note" id="mRxSymbols">Simbol masuk: —</div></div>',
 '<button class="btn" id="mBackRx" type="button">← Kembali Lab</button>',
 '</div>',
 '<div class="morse-note" id="mHelp">💡 Dua perangkat sungguhan: <b>HP sebagai speaker TX</b> dan <b>IFP/desktop sebagai mikrofon RX</b>. Media transmisinya udara—tanpa Wi-Fi atau server. Samakan frekuensi carrier <b>dan T</b>. Gunakan HTTPS untuk izin mikrofon.</div>',
 '</div>'
].join('');
$('morseControlMount').innerHTML=control;
$('morseStage').innerHTML=[
 '<div class="morse-topline"><span class="morse-kicker">PILAR · ACOUSTIC COMMUNICATION LAB</span><span class="morse-live" id="mLive"><i></i><span id="mLiveText">PRATINJAU MODULASI</span></span></div>',
 '<div><h2 class="morse-title">Pesan tersembunyi di dalam <span style="color:var(--good)">gelombang.</span></h2>',
 '<div class="morse-sub" id="mSubtitle">Nadanya tetap. Yang berubah adalah kapan gelombang hadir (ON) atau hilang (OFF). Ini modulasi amplitudo On-Off Keying.</div></div>',
 '<div class="morse-chain" id="mChain">',
 '<div class="morse-step" data-step="0"><span class="i">📝</span><b>Pesan</b><small>karakter</small></div>',
 '<div class="morse-step" data-step="1"><span class="i">·—</span><b>Kode Morse</b><small>durasi pulsa</small></div>',
 '<div class="morse-step" data-step="2"><span class="i">〰️</span><b>Modulasi</b><small>carrier ON/OFF</small></div>',
 '<div class="morse-step" data-step="3"><span class="i">🌬️</span><b>Media udara</b><small>speaker → mic</small></div>',
 '<div class="morse-step" data-step="4"><span class="i">📬</span><b>Decode</b><small>pulsa → teks</small></div>',
 '</div>',
 '<div class="morse-visual"><div class="cap"><span id="mCapTitle">🌊 Pembawa vs pembawa termodulasi</span><span id="mWaveLabel">DEMO · TANPA AUDIO</span></div><canvas id="mWaveCanvas" aria-label="Carrier tetap dan gelombang termodulasi Morse"></canvas>',
 '<div class="morse-legend"><span style="color:#60beff" id="mLegA">━ Carrier konstan</span><span id="mLegB"><b>━</b> On-Off Keying</span></div></div>',
 '<div class="morse-bottom"><div class="morse-strip" id="mRail" aria-live="off"><span class="morse-caption">· singkat = 1T &nbsp; — panjang = 3T &nbsp; jeda huruf = 3T</span></div><div class="morse-caption" id="mAha">AHA: Karakter tidak mengubah tinggi nada. Kode terletak pada durasi nyala–padam carrier yang merambat melalui udara.</div></div>'
].join('');

/* ---------- Pilihan dropdown (bergantung modulasi) ---------- */
function options(id,items,value,render,autoLabel){
 const el=$(id);
 el.replaceChildren();
 const add=(v,t)=>{const o=document.createElement('option');o.value=String(v);o.textContent=t;el.appendChild(o)};
 if(autoLabel)add('auto',autoLabel);
 for(const v of items)add(v,render(v));
 el.value=String(value);
}
function fillSelects(keepTx){
 const fsk=cfg.mod==='fsk';
 const txF=keepTx&&+$('mTxFreq').value||(fsk?1200:1000);
 const freqLabel=v=>fsk?v+' Hz ('+(v-FSK_DEV)+'/'+(v+FSK_DEV)+')':v+' Hz';
 options('mTxFreq',CHOICES,CHOICES.includes(txF)?txF:1000,freqLabel);
 options('mRxFreq',CHOICES,fsk?'auto':1000,freqLabel,fsk?'Otomatis (cari sendiri)':null);
 options('mTxUnit',UNITS,fsk?100:120,v=>fsk?v+' ms · '+Math.round(1000/v)+' bit/dtk':v+' ms · '+Math.round(1200/v)+' WPM kira-kira');
 options('mRxUnit',UNITS,fsk?'auto':120,v=>fsk?v+' ms/bit':v+' ms',fsk?'Otomatis (cari sendiri)':null);
}
const cfg={mode:'tx',mod:'ook',active:false,tx:null,rx:{
  listening:false,buffer:new Float32Array(2048),
  freq:1000,unit:120,present:false,candidate:false,candidateSince:0,onAt:0,lastOff:0,lastValidOff:0,lastChange:0,
  raw:[],text:'',symbols:[],history:[],wordSpaced:false,glitches:0,
  noise:0.00008,level:0,rawLevel:0,sideLevel:0,snr:0,auto:false,autoSamples:[],lastScan:0,lastUi:0,lastStatus:0,
  peak:0,lastTick:0
}};
const R=cfg.rx;
const rxFreqVal=()=>{const v=$('mRxFreq').value;return v==='auto'||!v?1000:+v};
const rxUnitVal=()=>{const v=$('mRxUnit').value;return v==='auto'||!v?120:+v};
fillSelects(false);
const canvas=$('mWaveCanvas'),cx=canvas.getContext('2d');
let size={w:1,h:1,dpr:1},lastPaint=0,lastVisual=0;
const rez=()=>{
 const rect=canvas.getBoundingClientRect();
 const dpr=Math.min(1.7,window.devicePixelRatio||1);
 size={w:Math.max(1,rect.width),h:Math.max(1,rect.height),dpr};
 canvas.width=Math.max(1,Math.round(size.w*dpr));canvas.height=Math.max(1,Math.round(size.h*dpr));
};
new ResizeObserver(rez).observe(canvas);
function status(id,str){$(id).textContent=str}
function setStep(n){
 document.querySelectorAll('#mChain [data-step]').forEach(e=>e.classList.toggle('current',+e.dataset.step===n));
}
function setStepText(i,title,small){
 const el=$('mChain').querySelector?.('[data-step="'+i+'"]');if(!el)return;
 el.querySelector('b').textContent=title;el.querySelector('small').textContent=small;
}
function setMode(m){
 cfg.mode=m;
 $('mTxPane').hidden=m!=='tx';$('mRxPane').hidden=m!=='rx';
 $('mModeTx').classList.toggle('on',m==='tx');$('mModeRx').classList.toggle('on',m==='rx');
 if(m==='tx')setStep(2);else setStep(4);
 updateRail();
}
function setMod(m,keepTx=true){
 const fsk=m==='fsk';
 if(cfg.tx)stopTx(false);
 if(R.listening)stopRx('Modulasi diganti. Tekan Mulai Dengar lagi.');
 cfg.mod=m;$('mMod').value=m;
 fillSelects(keepTx);
 $('mSensLabel').hidden=fsk;$('mLock').hidden=fsk;
 $('mTxUnitLabel').firstChild&&($('mTxUnitLabel').firstChild.textContent=fsk?'Durasi 1 bit (Tb)':'Unit Morse (T)');
 $('mRxUnitLabel').firstChild&&($('mRxUnitLabel').firstChild.textContent=fsk?'Durasi 1 bit (Tb)':'Unit Morse (T)');
 $('mPilot').textContent=fsk?'🎵 Uji nada f0/f1 (1,6 dtk)':'🎵 Uji carrier (1 dtk)';
 $('mLblLock').textContent=fsk?'MODE / CARRIER':'CARRIER LOCK';
 $('mLblSnr').textContent=fsk?'NADA TERKUAT':'CARRIER / SNR';
 $('mLblGate').textContent=fsk?'FRAME':'DETECTOR';
 $('mHelp').innerHTML=fsk
  ?'💡 <b>FSK</b>: bit 0 = nada <i>f0</i> (carrier−200 Hz), bit 1 = nada <i>f1</i> (carrier+200 Hz). Pesan dibungkus <b>frame</b>: preamble → sinkron → panjang → data → <b>CRC</b>. Receiver mencari carrier &amp; Tb sendiri dan memberi tahu bila pesan rusak. Dua perangkat, media udara.'
  :'💡 Dua perangkat sungguhan: <b>HP sebagai speaker TX</b> dan <b>IFP/desktop sebagai mikrofon RX</b>. Media transmisinya udara—tanpa Wi-Fi atau server. Samakan frekuensi carrier <b>dan T</b>. Gunakan HTTPS untuk izin mikrofon.';
 setStepText(1,fsk?'Kode Biner':'Kode Morse',fsk?'huruf → 6 bit + CRC':'durasi pulsa');
 setStepText(2,'Modulasi',fsk?'nada f0 / f1':'carrier ON/OFF');
 setStepText(4,'Decode',fsk?'bit → teks':'pulsa → teks');
 $('mCapTitle').textContent=fsk?'🌊 Bit digital vs gelombang FSK (gerak lambat)':'🌊 Pembawa vs pembawa termodulasi';
 $('mLegA').textContent=fsk?'━ Bit digital (1 = tinggi)':'━ Carrier konstan';
 $('mLegB').innerHTML=fsk?'<b>━</b> Nada f0 rendah / f1 tinggi':'<b>━</b> On-Off Keying';
 status('mSubtitle',fsk
  ?'Amplitudo tetap. Yang berubah adalah tinggi nada: f0 (rendah) = bit 0, f1 (tinggi) = bit 1. Ini modulasi frekuensi Frequency-Shift Keying.'
  :'Nadanya tetap. Yang berubah adalah kapan gelombang hadir (ON) atau hilang (OFF). Ini modulasi amplitudo On-Off Keying.');
 status('mAha',fsk
  ?'AHA: Informasi dibawa oleh perbedaan frekuensi f0/f1. FSK lebih tahan terhadap perubahan amplitudo dan gema, tetapi tetap membutuhkan sinyal yang cukup jelas.'
  :'AHA: Carrier berfrekuensi tetap; kombinasi durasi bunyi dan hening menyandikan pesan.');
 status('mWaveLabel','DEMO · TANPA AUDIO');
 status('mTxStatus',fsk
  ?'TX FSK siap · bit 0/1 = dua nada berbeda. Pastikan volume speaker cukup, tidak maksimal.'
  :'TX siap · satu frekuensi carrier, dinyalakan/dimatikan menurut titik–garis. Pastikan volume speaker cukup, tidak maksimal.');
 status('mRxStatus',fsk
  ?'Tekan Mulai Dengar. Receiver otomatis mencari carrier, Tb, dan sinkron frame dari pesan yang masuk.'
  :'Tekan Mulai Dengar, lalu kirim bunyi dari HP lain. Saat Auto Lock, gunakan Uji Carrier dari HP.');
 status('mRxLock',fsk?'FSK · menunggu':'1000 Hz · manual');
 status('mRxSnr','—');status('mRxGate',fsk?'menunggu preamble':'menunggu');
 clearRx();previewCode();updateRail();
}
function normalized(s){
 return s.toUpperCase().replace(/\s+/g,' ').split('').filter(c=>c===' '||MORSE[c]).join('').trim();
}
function planText(s,unit){
 const words=s.split(' '),pulses=[],tokens=[];
 let pos=0;
 words.forEach((word,wi)=>{
  [...word].forEach((ch,ci)=>{
   const seq=MORSE[ch];
   for(let j=0;j<seq.length;j++){
    const dur=(seq[j]==='.'?1:3)*unit;
    pulses.push({start:pos,end:pos+dur,mark:seq[j],ch,ci,wi});
    tokens.push({sym:seq[j],start:pos,end:pos+dur});
    pos+=dur;
    if(j<seq.length-1)pos+=unit;
   }
   if(ci<word.length-1)pos+=3*unit;
  });
  if(wi<words.length-1){pos+=7*unit;tokens.push({sym:'/',start:pos,end:pos})}
 });
 return {pulses,tokens,duration:pos+unit};
}

/* ---------- Encoder FSK: teks → frame bit ---------- */
const toBits=(v,n)=>{let s='';for(let i=n-1;i>=0;i--)s+=(v>>i)&1;return s};
const bitsVal=(b,s,n)=>{let v=0;for(let i=0;i<n;i++)v=(v<<1)|b[s+i];return v};
function crc8(bytes){let c=0;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c&0x80)?((c<<1)^0x07)&0xff:(c<<1)&0xff}return c}
function fskFrame(msg){
 const text=[...msg.toUpperCase()].filter(c=>FSK_CHARS.includes(c)).join('').slice(0,FSK_MAXCHARS);
 const codes=[...text].map(c=>FSK_CHARS.indexOf(c));
 const crc=crc8([codes.length,...codes]);
 const parts={pre:FSK_PRE,sync:FSK_BARKER,len:toBits(codes.length,6),data:codes.map(c=>toBits(c,6)),crc:toBits(crc,8)};
 const bits=(parts.pre+parts.sync+parts.len+parts.data.join('')+parts.crc).split('').map(Number);
 return {text,codes,parts,bits,crc};
}
function planFsk(bits,tb){
 return {pulses:bits.map((b,k)=>({start:k*tb,end:(k+1)*tb,mark:b,bit:b,k})),duration:bits.length*tb+tb};
}
function segLabel(k,n){
 if(k<FSK_PRE.length)return 'PREAMBLE';
 if(k<FSK_HDR)return 'SINKRON Barker-13';
 if(k<FSK_HDR+6)return 'PANJANG pesan';
 if(k<FSK_HDR+6+6*n)return 'DATA huruf ke-'+(Math.floor((k-FSK_HDR-6)/6)+1);
 return 'CRC-8';
}
function previewCode(){
 const text=normalized($('mTxText').value).slice(0,cfg.mod==='fsk'?FSK_MAXCHARS:72);
 if(cfg.mod==='fsk'){
  if(!text){status('mTxCode','Ketik pesan A–Z atau 0–9');return}
  const f=fskFrame(text),tb=+$('mTxUnit').value||100;
  status('mTxCode','PRE '+f.parts.pre+' · SYNC '+f.parts.sync+' · LEN '+f.parts.len+' · '+[...f.text].map((c,i)=>(c===' '?'␣':c)+'='+f.parts.data[i]).join(' ')+' · CRC '+f.parts.crc+'  →  '+f.bits.length+' bit × '+tb+' ms ≈ '+(f.bits.length*tb/1000).toFixed(1)+' dtk');
  return;
 }
 const preview=[...text].map(c=>c===' '?' / ':MORSE[c]).join(' ');
 status('mTxCode',preview||'Ketik pesan A–Z atau 0–9');
}
function scheduleAudio(pulses,total,freq,start){
 A.ensure();
 const ctx=A.ctx;
 const osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type='sine';osc.frequency.value=freq;gain.gain.value=0;
 osc.connect(gain);gain.connect(ctx.destination);
 const begin=ctx.currentTime+.10;
 gain.gain.setValueAtTime(0,begin);
 for(const p of pulses){
  const a=begin+p.start/1000,b=begin+p.end/1000;
  gain.gain.setValueAtTime(0,a);
  gain.gain.linearRampToValueAtTime(.32,a+.006);
  gain.gain.setValueAtTime(.32,Math.max(a+.006,b-.009));
  gain.gain.linearRampToValueAtTime(0,b);
 }
 osc.start(begin);
 osc.stop(begin+total/1000+.12);
 return {osc,gain,begin};
}
// FSK fase-kontinu: satu osilator, frekuensinya digeser mulus 6 ms di tiap perpindahan bit (tanpa 'klik').
function scheduleFsk(bits,tb,fc){
 A.ensure();
 const ctx=A.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();
 const fr=b=>b?fc+FSK_DEV:fc-FSK_DEV;
 osc.type='sine';osc.frequency.value=fr(bits[0]);gain.gain.value=0;
 osc.connect(gain);gain.connect(ctx.destination);
 const begin=ctx.currentTime+.10,total=bits.length*tb/1000,g=gain.gain;
 g.setValueAtTime(0,begin);g.linearRampToValueAtTime(.32,begin+.012);
 g.setValueAtTime(.32,begin+total-.015);g.linearRampToValueAtTime(0,begin+total);
 osc.frequency.setValueAtTime(fr(bits[0]),begin);
 for(let k=1;k<bits.length;k++)if(bits[k]!==bits[k-1]){
  const t=begin+k*tb/1000;
  osc.frequency.setValueAtTime(fr(bits[k-1]),t-.003);
  osc.frequency.linearRampToValueAtTime(fr(bits[k]),t+.003);
 }
 osc.start(begin);osc.stop(begin+total+.12);
 return {osc,gain,begin};
}
function stopTx(show=true){
 const t=cfg.tx;
 if(t&&A.ctx){
  const now=A.ctx.currentTime;
  try{t.gain.gain.cancelScheduledValues(now);t.gain.gain.setTargetAtTime(0,now,.009);t.osc.stop(now+.08)}catch(_){}
  cfg.tx=null;
 }
 if(show)status('mTxStatus','TX dihentikan. Carrier sekarang OFF.');
 $('mTxProgress').style.width='0%';
}
function launchTx(test=false){
 if(cfg.tx)stopTx(false);
 if(cfg.mode!=='tx')setMode('tx');
 const fsk=cfg.mod==='fsk';
 const msg=normalized($('mTxText').value).slice(0,fsk?FSK_MAXCHARS:72);
 if(!msg&&!test){status('mTxStatus','Isi pesan dahulu. Karakter didukung: A–Z, 0–9, titik, koma, ?, /.');return}
 if(!test&&msg!==$('mTxText').value.toUpperCase().replace(/\s+/g,' ').trim())status('mTxStatus','Karakter tak dikenal diabaikan'+(fsk?' / pesan dipotong 63 huruf.':'.'));
 const f=+$('mTxFreq').value,u=+$('mTxUnit').value;
 try{
  if(fsk){
   const bits=test?[1,0,1,0,1,0,1,0]:fskFrame(msg).bits,tb=test?200:u,plan=planFsk(bits,tb);
   const a=scheduleFsk(bits,tb,f);
   cfg.tx={...a,pulses:plan.pulses,duration:plan.duration,started:false,test,unit:tb,tb,freq:f,message:msg,mod:'fsk',bits,nchars:msg.length};
   status('mTxStatus',test?'UJI FSK: nada f0='+(f-FSK_DEV)+' Hz dan f1='+(f+FSK_DEV)+' Hz bergantian 1,6 detik.':'Mengirim FSK "'+msg+'" · f0='+(f-FSK_DEV)+' / f1='+(f+FSK_DEV)+' Hz · '+bits.length+' bit × '+tb+' ms.');
   status('mWaveLabel',f+' Hz ±'+FSK_DEV+' · '+(test?'UJI NADA':'FSK LIVE'));
   status('mSubtitle','Volume tetap; bit 0 = '+(f-FSK_DEV)+' Hz, bit 1 = '+(f+FSK_DEV)+' Hz. Dengarkan dari perangkat lain.');
   $('mLive').classList.add('on');status('mLiveText',test?'UJI NADA':'ACOUSTIC TX · FSK');
   setStep(2);updateRail(0);
   return;
  }
  const p=test?[{start:0,end:1500,mark:'—'}]:planText(msg,u).pulses;
  const duration=test?1650:planText(msg,u).duration;
  const a=scheduleAudio(p,duration,f);
  cfg.tx={...a,pulses:p,duration,started:false,test,unit:u,freq:f,message:msg,mod:'ook'};
  status('mTxStatus',test?'UJI CARRIER: nada kontinu 1 detik. Tekan Auto Lock di receiver sebelum tes.':'Mengirim "'+msg+'" lewat speaker · '+f+' Hz · T='+u+' ms.');
  status('mWaveLabel',f+' Hz · '+(test?'PILOT 1.5 s':'OOK LIVE'));
  status('mSubtitle','Tinggi nada tetap '+f+' Hz; durasi nyala dan padam menyandi titik dan garis. Dengarkan dari perangkat lain.');
  $('mLive').classList.add('on');status('mLiveText',test?'UJI FREKUENSI':'ACOUSTIC TX');
  setStep(2);
 }catch(e){status('mTxStatus','Audio tidak tersedia: '+(e.message||String(e)))}
}
function tuneRx(){
 const f=rxFreqVal();
 R.freq=f;
 if(R.filter&&A.ctx){
  R.filter.frequency.setTargetAtTime(f,A.ctx.currentTime,.018);
  R.filter.Q.setTargetAtTime(clamp(f/85,5,24),A.ctx.currentTime,.018);
 }
 status('mRxLock',cfg.mod==='fsk'?($('mRxFreq').value==='auto'?'FSK · carrier otomatis':'FSK · '+f+' Hz'):f+' Hz · '+(R.auto?'mencari':'manual'));
}
function connectRx(){
 if(!A.ctx||!A.micOn||typeof A.timeDomain!=='function')return false;
 const src=A.timeDomain();
 if(!src?.length)return false;
 R.buffer=new Float32Array(Math.min(2048,src.length));
 return true;
}
function stopRx(message='RX berhenti. Mikrofon dapat dimatikan dari kontrol utama.'){
 R.listening=false;R.present=false;R.auto=false;R.autoSamples=[];
 status('mRxStatus',message);
 $('mRxStart').disabled=false;
 $('mRxLevel').style.width='0%';
 $('mRxRawLevel').style.width='0%';
 status('mRxRaw','—');status('mRxGate','menunggu');
 $('mLive').classList.remove('on');
 status('mLiveText','RECEIVER BERHENTI');
}
function clearRx(){
 R.symbols=[];R.text='';R.history=[];R.raw=[];R.present=false;R.candidate=false;R.candidateSince=0;R.onAt=0;R.lastOff=0;R.lastValidOff=0;R.lastChange=0;R.wordSpaced=false;R.glitches=0;R.noise=.00008;R.level=0;R.rawLevel=0;R.sideLevel=0;R.snr=0;R.peak=0;R.lastTick=0;
 status('mRxText','…');status('mRxSymbols','Simbol masuk: —');
 fskReset();updateRail();
}
async function startRx(){
 if(R.listening)return;
 try{
  if(!A.micOn)await A.startMic();
  if(!A.micOn)throw Error('Izin mikrofon gagal');
  A.ensure();R.freq=rxFreqVal();R.unit=rxUnitVal();
  if(!connectRx())throw Error('Input mikrofon tidak tersedia');
  clearRx();R.listening=true;
  $('mRxStart').disabled=true;
  status('mRxStatus',cfg.mod==='fsk'
   ?'RX FSK aktif. Mencari preamble di '+($('mRxFreq').value==='auto'?'semua carrier':R.freq+' Hz')+'. Kirim pesan dari HP; frame yang CRC-nya cocok akan ditampilkan.'
   :'RX aktif pada '+R.freq+' Hz. Meter MIC = semua suara; CARRIER = nada target. Decoder kini menolak glitch <½T dan menjaga gap 1T/3T.');
  status('mLiveText','MIKROFON MENDENGAR');$('mLive').classList.add('on');setStep(3);
 }catch(e){stopRx('Gagal memulai receiver: '+(e.message||String(e)))}
}
function goertzel(signal,f,sr,start=0,end=signal.length){
 const N=end-start;if(N<32||f<=0||f>=sr/2)return 0;
 const w=2*Math.PI*f/sr,c=2*Math.cos(w);
 let q1=0,q2=0;
 for(let i=start;i<end;i++){
  const n=i-start,win=.5-.5*Math.cos(2*Math.PI*n/Math.max(1,N-1));
  const q=signal[i]*win+c*q1-q2;q2=q1;q1=q;
 }
 const v=Math.max(0,q1*q1+q2*q2-c*q1*q2);
 return 4*Math.sqrt(v)/N;
}
function windowRms(signal,start,end){
 let sum=0,N=Math.max(1,end-start);
 for(let i=start;i<end;i++){const v=signal[i];sum+=v*v}
 return Math.sqrt(sum/N);
}
function sampleCarrier(){
 const src=A.timeDomain?.();if(!src?.length||!A.ctx)return null;
 const sr=A.sampleRate?.()||A.ctx.sampleRate||48000;
 const N=Math.min(src.length,Math.max(768,Math.round(sr*.024)));
 const start=src.length-N,end=src.length;
 const carrier=goertzel(src,R.freq,sr,start,end);
 const delta=Math.max(110,R.freq*.11);
 const f1=Math.max(80,R.freq-delta),f2=Math.min(sr/2-100,R.freq+delta);
 const s1=goertzel(src,f1,sr,start,end),s2=goertzel(src,f2,sr,start,end);
 return {carrier,side:(s1+s2)/2,raw:windowRms(src,start,end),sr,N};
}
function finishLetter(){
 if(!R.symbols.length)return;
 const seq=R.symbols.join(''),ch=DECODE[seq]||'□';
 R.text+=ch;R.raw.push({seq,ch});R.symbols=[];
 if(R.text.length>200)R.text=R.text.slice(-200);
 status('mRxText',R.text.trimEnd());
 status('mRxSymbols',seq.replaceAll('.','·').replaceAll('-','—')+' → '+ch+(ch==='□'?' · pola tak dikenal':' · huruf valid'));
 setStep(4);updateRail();
}

/* ---------- RX · OOK (Morse) ---------- */
function tickRx(now){
 if(!R.listening||!A.micOn)return;
 const s=sampleCarrier();if(!s)return;

 R.level=R.level?R.level*.48+s.carrier*.52:s.carrier;
 R.sideLevel=R.sideLevel?R.sideLevel*.66+s.side*.34:s.side;
 R.rawLevel=R.rawLevel?R.rawLevel*.72+s.raw*.28:s.raw;

 const mult=+$('mSensitivity').value;
 const snrMin=mult<=3?3.5:mult<=4?5.5:7.0;
 const dtMs=clamp(R.lastTick?now-R.lastTick:16,1,100);R.lastTick=now;
 const onAbs=Math.max(.00012,R.noise*mult);
 R.snr=20*Math.log10((R.level+.000001)/(Math.max(R.sideLevel,R.noise*.45)+.000001));

 // Ambang ON/OFF RELATIF terhadap puncak carrier (bukan hanya terhadap noise floor).
 // Ruangan memantulkan nada (gema 0,2–0,8 dtk), sehingga di jeda 1T level carrier hanya turun 6–20 dB.
 // Puncak naik cepat saat carrier sungguhan hadir, turun pelan (τ≈3,5 dtk) agar volume yang berubah tetap terikuti.
 R.peak=(R.peak||0)*Math.exp(-dtMs/3500);
 if(R.present&&R.snr>=snrMin-2.2&&R.level>R.peak)R.peak+=(R.level-R.peak)*.4;
 const onTh=Math.max(onAbs,R.peak*.60);
 const offTh=Math.max(onAbs*.72,R.peak*.45);

 const rawGate=R.present
   ? (R.level>offTh&&R.snr>=snrMin-2.2)
   : (R.level>onTh&&R.snr>=snrMin);

 // Noise floor hanya belajar saat benar-benar sepi (ekor gema sudah lewat).
 if(!R.present&&!rawGate&&now-R.lastChange>700&&(!R.peak||R.level<R.peak*.12)){
  const candidateNoise=Math.max(.00002,Math.min(R.level,.02));
  R.noise=clamp(R.noise*.982+candidateNoise*.018,.00002,.025);
 }

 // Candidate edge: perubahan harus bertahan beberapa puluh ms sebelum dianggap nyata.
 if(rawGate!==R.candidate){
  R.candidate=rawGate;
  R.candidateSince=now;
 }

 const onDebounce=Math.max(18,R.unit*.14);
 const offDebounce=Math.max(28,R.unit*.24);
 const debounce=R.candidate?onDebounce:offDebounce;

 if(R.candidate!==R.present && now-R.candidateSince>=debounce){
  const edge=R.candidateSince;
  R.present=R.candidate;
  R.lastChange=now;

  if(R.present){
   R.onAt=edge;
   R.wordSpaced=false;
   setStep(3);
   status('mLiveText','CARRIER '+Math.round(R.freq)+' Hz TERDETEKSI');
  }else{
   const ms=edge-R.onAt;
   const minPulse=R.unit*.52;
   if(ms>=minPulse){
    const mark=ms>=R.unit*1.85?'—':'·';
    R.symbols.push(mark==='—'?'-':'.');
    R.raw.push({mark,duration:Math.round(ms)});
    R.lastOff=edge;
    R.lastValidOff=edge;
    if(R.symbols.length>7){
      R.symbols=[];R.glitches++;
      status('mRxSymbols','Noise burst dibuang · '+R.glitches+' glitch');
    }else{
      status('mRxSymbols','Pulsa '+Math.round(ms)+' ms → '+mark+' · pola: '+R.symbols.join(' ').replaceAll('.','·').replaceAll('-','—'));
    }
    updateRail();
   }else{
    R.glitches++;
    status('mRxSymbols','Glitch '+Math.round(ms)+' ms diabaikan · total '+R.glitches);
   }
  }
 }

 if(R.symbols.length&&R.lastValidOff){
  const gap=now-R.lastValidOff;
  if(gap>=R.unit*2.55 && (!R.present || now-R.onAt<R.unit*.45))finishLetter();
 }

 if(!R.present&&R.lastValidOff&&R.text.length){
  const gap=now-R.lastValidOff;
  if(!R.wordSpaced&&gap>=R.unit*6.25){
   R.text+=' ';R.wordSpaced=true;status('mRxText',R.text.trimEnd());
  }
 }

 R.history.push({t:now,on:R.present});
 while(R.history.length&&now-R.history[0].t>2500)R.history.shift();

 if(R.auto&&now-R.lastScan>75)scanCarrier(now);

 if(now-R.lastUi>110){
  R.lastUi=now;
  const rawDb=20*Math.log10(R.rawLevel+.000001),carDb=20*Math.log10(R.level+.000001);
  status('mRxSnr',Math.round(R.snr)+' dB · '+(R.present?'● ON':'○ OFF'));
  status('mRxRaw',Math.round(rawDb)+' dBFS');
  status('mRxGate',Math.round(carDb)+' dBFS · th '+Math.round(20*Math.log10(onTh+.000001)));
  $('mRxRawLevel').style.width=clamp((rawDb+72)/60*100,0,100)+'%';
  $('mRxLevel').style.width=clamp(R.level/Math.max(onTh,.00012)*55,0,100)+'%';
  if(!R.auto)status('mRxLock',R.freq+' Hz · '+(R.present?'✓ signal':'manual'));
 }

 if(!R.auto&&now-R.lastStatus>500){
  R.lastStatus=now;
  const rawDb=20*Math.log10(R.rawLevel+.000001);
  if(R.present)status('mRxStatus','✓ Carrier stabil. Decoder menjaga jeda 1T dan membuang glitch pendek.');
  else if(rawDb>-42&&R.snr<snrMin)status('mRxStatus','Mic mendengar suara, tetapi carrier '+R.freq+' Hz belum cukup dominan. Dekatkan speaker atau Auto Lock.');
  else if(rawDb<-58)status('mRxStatus','Mic hampir sunyi. Dekatkan speaker HP (±20–60 cm), volume media 60–80%.');
  else status('mRxStatus','Mic aktif. Menunggu carrier '+R.freq+' Hz…');
 }
}
function scanCarrier(now){
 R.lastScan=now;
 const fdata=A.spectrum();
 if(!fdata?.length||!A.ctx)return;
 const bin=A.ctx.sampleRate/8192;
 let mx=-140,best=0,noise=[];
 for(let i=Math.ceil(550/bin);i<Math.min(fdata.length,Math.floor(1950/bin));i++){
  const db=fdata[i];
  if(Number.isFinite(db)){
   noise.push(db);
   if(db>mx){mx=db;best=i*bin}
  }
 }
 if(!best||noise.length<15)return;
 noise.sort((a,b)=>a-b);
 const floor=noise[Math.floor(noise.length*.5)];
 if(mx<-92||mx-floor<9)return;
 const recent=R.autoSamples.filter(x=>now-x.t<1150&&Math.abs(x.f-best)<27);
 recent.push({f:best,t:now});R.autoSamples=recent;
 status('mRxStatus','Auto Lock: mendengar pilot '+Math.round(best)+' Hz ('+recent.length+'/4 stabil)…');
 if(recent.length>=4){
  const freq=recent.reduce((a,b)=>a+b.f,0)/recent.length;
  const matched=CHOICES.find(v=>Math.abs(freq-v)<35);
  const picked=matched||Math.round(freq/5)*5;
  if(!CHOICES.includes(picked)){
   const opt=document.createElement('option');opt.value=String(picked);opt.textContent=picked+' Hz · auto';$('mRxFreq').appendChild(opt);
  }
  $('mRxFreq').value=String(picked);R.auto=false;R.autoSamples=[];tuneRx();
  status('mRxLock',picked+' Hz · ✓ AUTO LOCK');
  status('mRxStatus','Carrier terkunci pada '+picked+' Hz. Sekarang minta pengirim menekan Kirim Pesan.');
 }
}

/* ---------- RX · FSK ----------
   1) Tiap ±5 ms (grid sampel absolut) hitung tenaga Goertzel untuk semua nada kandidat (jendela Hann 30 ms).
   2) Pencari sinkron: untuk tiap kandidat (carrier × Tb) cocokkan 17 bit header (bergantian + Barker-13)
      dengan tenaga dua nada; penguatan tiap nada diestimasi dari header itu sendiri (kebal respons speaker/mic).
   3) Setelah terkunci: tiap bit diputuskan dari tenaga f1 vs f0 di bagian tengah-akhir bit
      (awal bit dilewati agar ekor gema bit sebelumnya tidak ikut), lalu validasi CRC-8.        */
const F={e:null};
function fskReset(){
 const sr=A.sampleRate?.()||48000;
 F.sr=sr;F.H=Math.max(64,Math.round(sr*.0053));F.NW=Math.round(sr*.03);
 F.win=new Float32Array(F.NW);let ws=0;
 for(let i=0;i<F.NW;i++){const w=.5-.5*Math.cos(2*Math.PI*i/(F.NW-1));F.win[i]=w;ws+=w}
 F.wsum=ws;F.CAP=24000;
 const fv=$('mRxFreq').value,uv=$('mRxUnit').value;
 const fcs=(fv==='auto'||!fv)?CHOICES:[+fv],tbs=(uv==='auto'||!uv)?UNITS:[+uv];
 F.tones=[...new Set(fcs.flatMap(fc=>[fc-FSK_DEV,fc+FSK_DEV]))].filter(f=>f>80&&f<sr/2-150).sort((a,b)=>a-b);
 F.NT=F.tones.length;F.coef=F.tones.map(f=>2*Math.cos(2*Math.PI*f/sr));
 F.cands=[];
 for(const fc of fcs)for(const tb of tbs){
  const i0=F.tones.indexOf(fc-FSK_DEV),i1=F.tones.indexOf(fc+FSK_DEV);
  if(i0>=0&&i1>=0)F.cands.push({fc,tb,i0,i1});
 }
 F.e=new Float32Array(F.CAP*Math.max(1,F.NT));
 F.n=0;F.started=false;F.baseInit=false;F.base=1e-10;F.lastCT=-1;
 F.state='search';F.pend=null;F.bits=[];F.confs=[];F.len=null;F.total=0;F.k=0;F.lowRun=0;
 F.sel=fv+'|'+uv;F.lastUi=0;F.hist=[];F.lastRail=-1;F.ok=0;F.bad=0;
}
function fskEnergy(src,off,k){
 let q1=0,q2=0;const c=F.coef[k],N=F.NW,w=F.win;
 for(let i=0;i<N;i++){const q=src[off+i]*w[i]+c*q1-q2;q2=q1;q1=q}
 const v=Math.max(0,q1*q1+q2*q2-c*q1*q2),a=2*Math.sqrt(v)/F.wsum;
 return a*a;
}
const hopMs=()=>F.H/F.sr*1000;
const tcMs=n=>(n*F.H-F.NW/2)/F.sr*1000;                      // waktu pusat jendela grid n
const nOfMs=t=>Math.round((t*F.sr/1000+F.NW/2)/F.H);
const LO_SET=[.28,.42,.55];                                 // awal jendela baca bit (pecahan Tb); dipilih otomatis per ruangan
function bitWin(a,tb,lof=.28){                               // indeks grid yang dipakai untuk satu bit (mulai a ms)
 const m=F.NW/2/F.sr*1000,hi=Math.min(.85*tb,tb-m),lo=Math.min(Math.max(lof*tb,m),hi-hopMs());
 return [nOfMs(a+lo),nOfMs(a+hi),hi];
}
function integ(n0,n1,i0,i1){
 let s0=0,s1=0,c=0;
 for(let n=n0;n<=n1;n++){const o=(n%F.CAP)*F.NT;s0+=F.e[o+i0];s1+=F.e[o+i1];c++}
 return [s0/c,s1/c];
}
function scoreHeader(c,tEnd,lof){
 const tb=c.tb,L=FSK_PAT.length,v=[];let g0=0,g1=0,c0=0,c1=0;
 for(let j=0;j<L;j++){
  const [n0,n1]=bitWin(tEnd-(L-j)*tb,tb,lof);
  if(n1>F.n||n0<F.n-F.CAP+4)return null;
  const [m0,m1]=integ(n0,n1,c.i0,c.i1);v.push([m0,m1]);
  if(FSK_PAT[j]){g1+=m1;c1++}else{g0+=m0;c0++}
 }
 g0/=c0;g1/=c1;
 if(!(g0>1e-13&&g1>1e-13))return null;
 let sum=0,good=0,pres=0;
 for(let j=0;j<L;j++){
  const u0=v[j][0]/g0,u1=v[j][1]/g1,D=(u1-u0)/(u1+u0+1e-9),s=FSK_PAT[j]?1:-1;
  sum+=s*D;if(s*D>.15)good++;
  if(v[j][0]+v[j][1]>PRES*F.base)pres++;
 }
 return {score:sum/L,good,pres,g0,g1,lo:lof};
}
// Cegah 'sinkron palsu' dari bocoran spektrum nada kuat ke nada tetangga: nada pesan harus dominan di antara SEMUA nada.
function domOK(c,tEnd,lof){
 const tb=c.tb,L=FSK_PAT.length;let ok=0;
 for(let j=0;j<L;j++){
  const [n0,n1]=bitWin(tEnd-(L-j)*tb,tb,lof),cnt=n1-n0+1,want=FSK_PAT[j]?c.i1:c.i0;
  let mx=0,on=0;
  for(let k=0;k<F.NT;k++){
   let sum=0;for(let n=n0;n<=n1;n++)sum+=F.e[(n%F.CAP)*F.NT+k];sum/=cnt;
   if(sum>mx)mx=sum;if(k===want)on=sum;
  }
  if(on>=.3*mx)ok++;
 }
 return ok>=L-2;
}
function fskSearch(){
 const L=FSK_PAT.length,n=F.n;
 let pk=0;
 for(let q=Math.max(0,n-24);q<=n;q++){const o=(q%F.CAP)*F.NT;for(let k=0;k<F.NT;k++)if(F.e[o+k]>pk)pk=F.e[o+k]}
 if(pk<PRES*F.base)return;                                   // sunyi: lewati perhitungan korelasi
 let best=null;
 for(const c of F.cands){
  const m=F.NW/2/F.sr*1000,hi=Math.min(.85*c.tb,c.tb-m);
  const tEnd=tcMs(n)-hi+c.tb;                                // akhir header paling akhir yang datanya sudah lengkap
  for(const lof of LO_SET){
   const r=scoreHeader(c,tEnd,lof);
   if(r&&r.good>=L-2&&r.pres>=L-2&&r.score>=.5&&(!best||r.score>best.r.score)&&domOK(c,tEnd,lof))best={c,r,tEnd};
  }
 }
 if(best){
  const key=best.c.fc+'|'+best.c.tb+'|'+best.r.lo;
  const same=F.pend&&F.pend.key===key&&(n-(F.pend.lastSeen??n))<=2;
  if(!same){
   // Kandidat baru harus membangun stabilitasnya sendiri; jangan mewarisi timer kandidat sebelumnya.
   F.pend={...best,key,since:n,lastSeen:n};
  }else{
   const since=F.pend.since;
   if(best.r.score>=F.pend.r.score)F.pend={...best,key,since,lastSeen:n};
   else F.pend.lastSeen=n;
  }
 }else if(F.pend&&n-(F.pend.lastSeen??n)>2){
  // Kandidat yang hilang beberapa hop dianggap putus agar false-lock tidak menumpuk.
  F.pend=null;
 }
 if(F.pend&&(n-(F.pend.lastSeen??n))<=2&&n-F.pend.since>=.7*F.pend.c.tb/hopMs())fskLock(F.pend);
}
function fskLock(p){
 F.state='frame';F.c=p.c;F.tb=p.c.tb;F.lo=p.r.lo;F.T0=p.tEnd-FSK_HDR*F.tb;F.g0=p.r.g0;F.g1=p.r.g1;
 F.k=FSK_HDR;F.bits=[];F.confs=[];F.len=null;F.total=0;F.lowRun=0;F.baseFrozen=F.base;F.pend=null;
 status('mLiveText','SINKRON FSK · '+p.c.fc+' Hz · '+p.c.tb+' ms/bit');
 status('mRxStatus','✓ Preamble & sinkron Barker-13 cocok (korelasi '+Math.round(p.r.score*100)+'%). Membaca bit…');
 setStep(3);
}
function fskText(codes){return codes.map(c=>FSK_CHARS[c]||'□').join('')}
function fskAbort(msg){
 F.state='search';F.pend=null;F.bits=[];F.len=null;
 status('mRxSymbols',msg);status('mLiveText','MENCARI PREAMBLE');
}
function fskParse(){
 const b=F.bits,nb=b.length;
 if(F.len==null&&nb>=6){
  F.len=bitsVal(b,0,6);
  if(F.len<1||F.len>FSK_MAXCHARS){fskAbort('Sinkron palsu (panjang '+F.len+' tak valid) · dibuang, mencari lagi');return false}
  F.total=6+6*F.len+8;
 }
 if(F.len!=null){
  const nch=Math.min(F.len,Math.floor((nb-6)/6)),codes=[];
  for(let i=0;i<nch;i++)codes.push(bitsVal(b,6+6*i,6));
  if(codes.filter(c=>c>=FSK_CHARS.length).length>=2){fskAbort('Dua karakter tak valid berturut-turut · sinkron palsu / terlalu banyak bit salah, dibuang');return false}
  if(nb<F.total){
   status('mRxText',fskText(codes)+'▯');
   status('mRxSymbols','Bit '+nb+'/'+F.total+' · huruf '+nch+'/'+F.len+' (menunggu CRC)');
  }
 }
 if(F.total&&nb>=F.total){
  const codes=[];for(let i=0;i<F.len;i++)codes.push(bitsVal(b,6+6*i,6));
  const rx=bitsVal(b,6+6*F.len,8),calc=crc8([F.len,...codes]),ok=rx===calc;
  const text=fskText(codes),conf=Math.round(100*F.confs.reduce((a,x)=>a+x,0)/Math.max(1,F.confs.length));
  if(ok){F.ok++;status('mRxText',text);status('mRxSymbols','✓ CRC cocok ('+toBits(rx,8)+') · '+F.len+' huruf · keyakinan bit '+conf+'% · pesan utuh')}
  else{F.bad++;status('mRxText',text);status('mRxSymbols','✗ CRC TIDAK cocok (terima '+toBits(rx,8)+', hitung '+toBits(calc,8)+') · ada bit salah, pesan tidak dapat dipercaya')}
  R.text=text;
  status('mLiveText',ok?'PESAN UTUH ✓':'CRC GAGAL ✗');
  setStep(4);F.state='search';F.pend=null;F.lastRail=-1;
  return false;
 }
 return true;
}
function fskDecode(){
 for(let guard=0;guard<600;guard++){
  const k=F.k,a=F.T0+k*F.tb,[n0,n1]=bitWin(a,F.tb,F.lo);
  if(n1>F.n)break;
  const [m0,m1]=integ(n0,n1,F.c.i0,F.c.i1);
  const u0=m0/F.g0,u1=m1/F.g1,z=u1-u0,conf=Math.abs(z)/(u1+u0+1e-9),bit=z>0?1:0;
  if(conf>.5){if(bit)F.g1=.8*F.g1+.2*m1;else F.g0=.8*F.g0+.2*m0}   // jejaki perubahan volume
  F.bits.push(bit);F.confs.push(conf);F.k++;F.lastRail=-1;
  const nc=F.confs.length;
  if(nc>=10&&F.confs.slice(-8).reduce((a,x)=>a+x,0)/8<.12){fskAbort('Keyakinan bit terlalu rendah (bising / sinyal hilang) · '+nc+' bit diterima');break}
  if(!fskParse())break;
 }
}
function fskPump(now){
 const ctx=A.ctx,src=A.timeDomain?.();
 if(!ctx||!src?.length)return;
 const sr=A.sampleRate?.()||ctx.sampleRate||48000;
 const sel=$('mRxFreq').value+'|'+$('mRxUnit').value;
 if(!F.e||F.sr!==sr||F.sel!==sel)fskReset();
 if(ctx.currentTime===F.lastCT)return;F.lastCT=ctx.currentTime;
 const endIdx=Math.round(ctx.currentTime*sr),bufStart=endIdx-src.length,nEnd=Math.floor(endIdx/F.H);
 if(!F.started){F.n=nEnd-1;F.started=true}
 let n=F.n+1;
 const minN=Math.ceil((bufStart+F.NW)/F.H);
 if(n<minN){for(;n<minN;n++){const o=(n%F.CAP)*F.NT;for(let k=0;k<F.NT;k++)F.e[o+k]=0;F.n=n}}
 for(;n<=nEnd;n++){
  const o=(n%F.CAP)*F.NT,off=n*F.H-F.NW-bufStart;
  let m=0,e0=0,e1=0;
  for(let k=0;k<F.NT;k++){const e=fskEnergy(src,off,k);F.e[o+k]=e;m+=e}
  F.n=n;m/=Math.max(1,F.NT);
  if(F.state==='search'){
   if(!F.baseInit){F.base=Math.max(m,1e-11);F.baseInit=true}
   else if(m<F.base)F.base=Math.max(1e-11,F.base+(m-F.base)*.05);                 // turun cepat
   else if(m<3*F.base)F.base+=(m-F.base)*.002;                                      // naik pelan hanya bila masih 'noise-like'
   // m>3×base = ada sinyal: noise floor dibekukan (tidak ikut naik)
   fskSearch();
  }else{
   e0=F.e[o+F.c.i0];e1=F.e[o+F.c.i1];
   F.lowRun=(e0+e1<Math.max(3*F.baseFrozen,.003*(F.g0+F.g1)/2))?F.lowRun+1:0;
   if(F.lowRun*hopMs()>3*F.tb){fskAbort('Sinyal hilang sebelum frame lengkap ('+F.bits.length+' bit diterima)');continue}
  }
 }
 if(F.state==='frame')fskDecode();
 // riwayat untuk gambar gelombang RX
 let v=-1;
 if(F.state==='frame'){const o=(F.n%F.CAP)*F.NT,a=F.e[o+F.c.i0]/F.g0,b=F.e[o+F.c.i1]/F.g1;if(a+b>.3)v=b>a?1:0}
 else{let pk=0;const o=(F.n%F.CAP)*F.NT;for(let k=0;k<F.NT;k++)if(F.e[o+k]>pk)pk=F.e[o+k];if(pk>PRES*F.base)v=2}
 F.hist.push({t:now,v});while(F.hist.length&&now-F.hist[0].t>2500)F.hist.shift();
}
function tickFsk(now){
 if(!R.listening||!A.micOn)return;
 fskPump(now);
 if(F.lastRail!==F.bits.length){F.lastRail=F.bits.length;updateRail()}
 if(now-F.lastUi>110&&F.e){
  F.lastUi=now;
  const src=A.timeDomain(),N=Math.min(src.length,Math.round(F.sr*.024));
  const rawDb=20*Math.log10(windowRms(src,src.length-N,src.length)+1e-6);
  let bi=0,bv=0;
  for(let k=0;k<F.NT;k++){let s=0;for(let q=0;q<12;q++)s+=F.e[(((F.n-q)%F.CAP+F.CAP)%F.CAP)*F.NT+k];s/=12;if(s>bv){bv=s;bi=k}}
  const snr=10*Math.log10((bv+1e-12)/(F.base+1e-12));
  status('mRxRaw',Math.round(rawDb)+' dBFS');
  status('mRxSnr',bv>PRES*F.base?F.tones[bi]+' Hz · '+Math.round(snr)+' dB':'sunyi · '+Math.round(snr)+' dB');
  $('mRxRawLevel').style.width=clamp((rawDb+72)/60*100,0,100)+'%';
  $('mRxLevel').style.width=clamp(snr/45*100,0,100)+'%';
  if(F.state==='frame'){
   status('mRxLock',F.c.fc+' Hz · Tb '+F.tb+' ms · ✓ SINKRON');
   status('mRxGate',F.total?'bit '+F.bits.length+'/'+F.total:'bit '+F.bits.length+' (panjang?)');
  }else{
   status('mRxLock',$('mRxFreq').value==='auto'?'FSK · mencari carrier & Tb':'FSK · '+R.freq+' Hz');
   status('mRxGate','mencari preamble'+(F.ok||F.bad?' · ✓'+F.ok+' ✗'+F.bad:''));
  }
  if(F.state==='search'&&now-R.lastStatus>600){
   R.lastStatus=now;
   if(rawDb<-58)status('mRxStatus','Mic hampir sunyi. Dekatkan speaker HP (±20–60 cm), volume media 60–80%.');
   else if(bv>PRES*F.base)status('mRxStatus','Ada nada '+F.tones[bi]+' Hz. Menunggu preamble + sinkron frame…');
   else status('mRxStatus','Mic aktif. Menunggu preamble FSK…');
  }
 }
}

/* ---------- Rail & kanvas ---------- */
function railBits(r,bits,cur,n){
 const W=36;
 let s=cur<0?Math.max(0,bits.length-W):Math.max(0,Math.min(bits.length-W,cur-8));
 const e=Math.min(bits.length,s+W);
 for(let k=s;k<e;k++){
  const el=document.createElement('span');
  el.className='morse-token'+(k===cur?' current':'');
  el.textContent=String(bits[k]);el.title=(n>=0?segLabel(k,n)+' · ':'')+'bit '+(k+1);
  r.appendChild(el);
 }
 const cap=document.createElement('span');cap.className='morse-caption';
 cap.textContent='bit '+(s+1)+'–'+e+' dari '+bits.length;r.appendChild(cap);
}
function updateRail(cur=-1){
 const r=$('mRail');r.replaceChildren();
 let items;
 if(cfg.mod==='fsk'){
  if(cfg.mode==='tx'){
   const t=cfg.tx,msg=normalized($('mTxText').value).slice(0,FSK_MAXCHARS);
   const bits=t&&t.bits?t.bits:(msg?fskFrame(msg).bits:[]);
   if(!bits.length){const span=document.createElement('span');span.className='morse-caption';span.textContent='Ketik pesan untuk melihat bit frame FSK.';r.appendChild(span);return}
   railBits(r,bits,t?cur:-1,t?t.nchars:msg.length);return;
  }
  if(F.bits&&F.bits.length){railBits(r,F.bits,-1,-1);return}
  const span=document.createElement('span');span.className='morse-caption';span.textContent='Bit data yang diterima muncul di sini (0 = nada rendah f0, 1 = nada tinggi f1).';r.appendChild(span);return;
 }
 if(cfg.mode==='tx'){
  const msg=normalized($('mTxText').value);
  items=msg?[...msg].flatMap(ch=>ch===' '?[{sym:'/',label:'spasi'}]:[...MORSE[ch]].map(sym=>({sym,label:ch}))):[];
 }else{
  items=R.raw.slice(-26).filter(x=>x.mark).map(x=>({sym:x.mark,label:x.duration+' ms'}));
 }
 if(!items.length){const span=document.createElement('span');span.className='morse-caption';span.textContent='· = 1T   — = 3T   jarak huruf = 3T   jarak kata = 7T';r.appendChild(span);return}
 items.slice(-35).forEach((x,i)=>{
  const el=document.createElement('span');el.className='morse-token'+(x.sym==='/'?' sp':'');
  el.textContent=x.sym==='.'?'·':x.sym==='-'?'—':' / ';
  el.title=x.label||'';
  r.appendChild(el);
 });
}
function markRail(index){
 const spans=$('mRail').querySelectorAll('.morse-token');spans.forEach((e,i)=>e.classList.toggle('current',i===index&&index>=0));
}
function envTx(t){
 if(!cfg.tx)return false;
 const pulses=cfg.tx.pulses;
 for(let i=0;i<pulses.length;i++)if(pulses[i].start<=t&&t<pulses[i].end)return true;
 return false;
}
function envRx(t){
 const h=R.history;if(!h.length)return false;
 for(let i=h.length-1;i>=0;i--)if(h[i].t<=t)return h[i].on;
 return false;
}
function drawFsk(now){
 const {w,h,dpr}=size;
 const topY=h*.36,botY=h*.77,x0=14,x1=w-14,dx=x1-x0;
 cx.strokeStyle='rgba(134,197,247,.12)';cx.lineWidth=1;
 for(let j=0;j<5;j++){const y=17+j*(h-33)/4;cx.beginPath();cx.moveTo(x0,y);cx.lineTo(x1,y);cx.stroke()}
 cx.font='700 '+Math.max(10,Math.min(12,w/44))+'px system-ui';
 cx.fillStyle='#8db8d9';cx.fillText('BIT DIGITAL · naik = 1, turun = 0',x0,Math.max(42,topY-37));
 cx.fillStyle='#a1d5bb';cx.fillText('GELOMBANG FSK · lambat = f0 (bit 0), rapat = f1 (bit 1)',x0,Math.max(topY+27,botY-38));
 cx.setLineDash([3,6]);cx.strokeStyle='rgba(255,255,255,.18)';
 for(const cy of [topY,botY]){cx.beginPath();cx.moveTo(x0,cy);cx.lineTo(x1,cy);cx.stroke()}cx.setLineDash([]);
 let clock,bitAt,live=false;
 const tx=cfg.tx;
 if(cfg.mode==='tx'&&tx&&tx.bits){
  clock=(A.ctx.currentTime-tx.begin)*1000;live=true;
  bitAt=t=>t<0||t>=tx.bits.length*tx.tb?-1:tx.bits[Math.floor(t/tx.tb)];
 }else if(cfg.mode==='rx'&&R.listening){
  clock=now;live=true;
  bitAt=t=>{const hh=F.hist;for(let i=hh.length-1;i>=0;i--)if(hh[i].t<=t)return hh[i].v;return -1};
 }else{
  clock=now;
  const pat=[1,0,1,0,1,1,0,0,1,0,1,1,0,1,0,0];
  bitAt=t=>pat[Math.floor((((t%4800)+4800)%4800)/300)];
 }
 const visible=1800,amp=Math.min(33,Math.max(13,h*.115)),cyc=[7,19],neutral=13;
 cx.beginPath();cx.lineWidth=2.4;cx.strokeStyle='#55b7ff';
 for(let i=0;i<=Math.floor(dx);i+=2){
  const t=clock-visible*(1-i/dx),b=bitAt(t);
  const y=topY-(b===1?amp:b===0?-amp:0)*(b===2?0:1);
  if(i===0)cx.moveTo(x0,y);else cx.lineTo(x0+i,y);
 }
 cx.stroke();
 cx.beginPath();cx.lineWidth=2.7;cx.strokeStyle='#38e699';cx.shadowBlur=9;cx.shadowColor='rgba(56,230,153,.42)';
 let ph=now*.008;
 for(let i=0;i<=Math.floor(dx);i+=2){
  const t=clock-visible*(1-i/dx),b=bitAt(t);
  const c=b===1?cyc[1]:b===0?cyc[0]:neutral;
  ph+=2*Math.PI*c*2/dx;
  const v=botY-Math.sin(ph)*amp*(b===-1?0:1);
  if(i===0)cx.moveTo(x0,v);else cx.lineTo(x0+i,v);
 }
 cx.stroke();cx.shadowBlur=0;
 if(live){
  cx.strokeStyle='rgba(255,208,66,.45)';cx.lineWidth=1.4;
  cx.beginPath();cx.moveTo(x1,topY-amp-5);cx.lineTo(x1,botY+amp+5);cx.stroke();
 }
}
function draw(now){
 const {w,h,dpr}=size;if(w<10||h<10)return;
 cx.setTransform(dpr,0,0,dpr,0,0);
 cx.clearRect(0,0,w,h);
 if(cfg.mod==='fsk'){drawFsk(now);return}
 const topY=h*.36,botY=h*.77,x0=14,x1=w-14,dx=x1-x0;
 cx.strokeStyle='rgba(134,197,247,.12)';cx.lineWidth=1;
 for(let j=0;j<5;j++){const y=17+j*(h-33)/4;cx.beginPath();cx.moveTo(x0,y);cx.lineTo(x1,y);cx.stroke()}
 cx.font='700 '+Math.max(10,Math.min(12,w/44))+'px system-ui';
 cx.fillStyle='#8db8d9';cx.fillText('CARRIER · nada dasar tetap',x0,Math.max(42,topY-37));
 cx.fillStyle='#a1d5bb';cx.fillText('MODULASI OOK · ON = bunyi / OFF = diam',x0,Math.max(topY+27,botY-38));
 cx.setLineDash([3,6]);cx.strokeStyle='rgba(255,255,255,.18)';
 for(const cy of [topY,botY]){cx.beginPath();cx.moveTo(x0,cy);cx.lineTo(x1,cy);cx.stroke()}cx.setLineDash([]);
 let clock,activeAt;
 if(cfg.mode==='tx'&&cfg.tx){clock=(A.ctx.currentTime-cfg.tx.begin)*1000;activeAt=t=>envTx(t)}
 else if(cfg.mode==='rx'&&R.listening){clock=now;activeAt=t=>envRx(t)}
 else{clock=now;activeAt=t=>{const m=((t%1850)+1850)%1850;return (m>=150&&m<360)||(m>=600&&m<1200)||(m>=1420&&m<1630)}}
 const visible=1800,amp=Math.min(33,Math.max(13,h*.115)),cycles=15;
 for(const kind of [0,1]){
  cx.beginPath();cx.lineWidth=kind===0?2.3:2.7;cx.strokeStyle=kind===0?'#55b7ff':'#38e699';
  if(kind===1){cx.shadowBlur=9;cx.shadowColor='rgba(56,230,153,.42)'}
  for(let i=0;i<=Math.floor(dx);i+=2){
   const frac=i/dx,t=clock-visible*(1-frac);
   const carrier=Math.sin(frac*Math.PI*2*cycles+now*.008);
   const env=kind===0?1:(activeAt(t)?1:0);
   const v=(kind===0?topY:botY)-carrier*amp*env;
   if(i===0)cx.moveTo(x0+i,v);else cx.lineTo(x0+i,v);
  }
  cx.stroke();cx.shadowBlur=0;
 }
 if(cfg.mode==='tx'&&cfg.tx||cfg.mode==='rx'&&R.listening){
  cx.strokeStyle='rgba(255,208,66,.45)';cx.lineWidth=1.4;
  cx.beginPath();cx.moveTo(x1,topY-amp-5);cx.lineTo(x1,botY+amp+5);cx.stroke();
 }
}
function tick(now){
 if(!cfg.active)return;
 if(cfg.tx){
  const t=(A.ctx.currentTime-cfg.tx.begin)*1000,tx=cfg.tx;
  $('mTxProgress').style.width=clamp(t/tx.duration*100,0,100)+'%';
  if(tx.mod==='fsk'){
   const i=t>=0&&t<tx.bits.length*tx.tb?Math.floor(t/tx.tb):-1;
   if(i!==tx.lastBit){tx.lastBit=i;if(i>=0)updateRail(i)}
   if(i>=0){
    setStep(2);
    const b=tx.bits[i],f=tx.freq+(b?FSK_DEV:-FSK_DEV);
    status('mAha','BIT '+b+' → nada '+f+' Hz ('+(tx.test?'uji nada':segLabel(i,tx.nchars))+'). Volume tetap; hanya tinggi nada yang berubah.');
   }
  }else{
   const i=tx.pulses.findIndex(p=>t>=p.start&&t<p.end);
   markRail(i);
   if(i>=0){setStep(2);status('mAha','AHA: '+(tx.pulses[i].mark==='.'?'TITIK = carrier ON selama 1T.':'GARIS = carrier ON selama 3T.')+' Frekuensi dasar tidak berubah.');}
   else if(t>0&&t<tx.duration){setStep(3);status('mAha','JEDA = carrier OFF. Gelombang tidak dipancarkan, tetapi waktu diam tetap membawa informasi.')}
  }
  if(t>=tx.duration+.12*1000){
   cfg.tx=null;$('mTxProgress').style.width='100%';
   status('mTxStatus',tx.test?'Tes selesai.'+(tx.mod==='fsk'?' Receiver FSK mencari sendiri carrier-nya.':' Receiver kini bisa mengunci frekuensi.'):'Pengiriman selesai. Lihat teks hasil decode di perangkat receiver.');
   $('mLive').classList.remove('on');status('mLiveText','TX SELESAI');setStep(3);
   if(tx.mod==='fsk')updateRail();
  }
 }
 if(cfg.mode==='rx'&&R.listening){R.unit=rxUnitVal();
  if(cfg.mod==='fsk')tickFsk(now);
  else{
   tickRx(now);
   if(R.present){setStep(3);status('mAha','AHA: mikrofon mendeteksi carrier '+R.freq+' Hz. Durasi hadirnya bunyi diubah menjadi titik atau garis.')}
  }
 }
 if(now-lastPaint>35){lastPaint=now;draw(now)}
}
function activate(on){
 cfg.active=!!on;
 document.body.classList.toggle('morse-mode',cfg.active);
 $('morseStage').hidden=!cfg.active;
 if(on){
  setMode(cfg.mode);rez();previewCode();
  $('selWave').value='off';$('selWave').dispatchEvent(new Event('change'));
  status('mAha',cfg.mod==='fsk'
   ?'AHA: Informasi dibawa oleh perbedaan frekuensi f0/f1. FSK lebih tahan terhadap perubahan amplitudo dan gema, tetapi tetap membutuhkan sinyal yang cukup jelas.'
   :'AHA: Carrier berfrekuensi tetap; kombinasi durasi bunyi dan hening menyandikan pesan.');
 }else{
  stopTx(false);stopRx('RX dinonaktifkan karena keluar dari Morse Link.');
 }
}
function micStopped(){if(R.listening)stopRx('Mikrofon dihentikan. Tekan Mulai Dengar lagi untuk receiver.')}
$('mModeTx').onclick=()=>setMode('tx');$('mModeRx').onclick=()=>setMode('rx');
$('mMod').onchange=()=>setMod($('mMod').value);
$('mTxText').oninput=()=>{previewCode();updateRail()};
$('mSend').onclick=()=>launchTx(false);
$('mPilot').onclick=()=>launchTx(true);
$('mStopTx').onclick=()=>stopTx();
$('mRxStart').onclick=startRx;
$('mRxStop').onclick=()=>stopRx();
$('mRxFreq').onchange=()=>{R.auto=false;R.autoSamples=[];tuneRx();if(cfg.mod==='fsk')fskReset()};
$('mRxUnit').onchange=()=>{if(cfg.mod==='fsk')fskReset()};
$('mLock').onclick=async()=>{
 if(!R.listening)await startRx();
 if(!R.listening)return;
 R.auto=true;R.autoSamples=[];R.lastScan=0;
 status('mRxStatus','AUTO LOCK AKTIF: sekarang tekan Uji Carrier (1 dtk) di perangkat pengirim.');
 status('mRxLock','MENCARI PILOT…');
};
$('mClear').onclick=clearRx;
$('mBack').onclick=$('mBackRx').onclick=()=>document.querySelector('[data-tool="lab"]')?.click();
$('mTxUnit').onchange=()=>{previewCode()};
addEventListener('pagehide',()=>{stopTx(false);stopRx('')},{once:true});
previewCode();setMode('tx');
window.SoundScopeMorse={activate,tick,micStopped,buildPlan:planText,codeMap:MORSE,
 setMod,buildFsk:fskFrame,fsk:{DEV:FSK_DEV,CHARS:FSK_CHARS,HDR:FSK_HDR,UNITS,CHOICES}};
})();