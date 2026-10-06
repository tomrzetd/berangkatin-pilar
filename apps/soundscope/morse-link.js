/* PILAR SoundScope v4.2.0 — acoustic link. Skema 1: OOK Morse (v4.0.3, timing-safe RX). Skema 2: BFSK + Hamming(7,4) + CRC-8 (fsk-core.js). */
(function(){
'use strict';
const A=window.SOUNDSCOPE_MORSE_AUDIO;
const $=id=>document.getElementById(id);
if(!A||!$('morseControlMount')||!$('morseStage'))return;
const FC=window.PilarFsk||null; // fsk-core.js; tanpa file ini hanya skema OOK yang aktif
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
const control=[
 '<div class="morse-config" id="mCfg" data-scheme="ook">',
'<div class="morse-modes"><button class="btn on" id="mSchOok" type="button">〰️ OOK · Morse</button><button class="btn" id="mSchFsk" type="button">🎼 BFSK · Hamming</button></div>',
'<div class="morse-note" id="mSchemeNote">OOK Morse: satu nada dinyalakan/dimatikan. Sederhana dan mudah dilihat, tetapi keputusan ON/OFF bergantung pada ambang volume dan ketepatan waktu.</div>',
 '<div class="morse-modes"><button class="btn on" id="mModeTx" type="button">📡 TRANSMIT</button><button class="btn" id="mModeRx" type="button">🎧 RECEIVE</button></div>',
 '<div class="morse-pane" id="mTxPane">',
 '<label><span id="mTxLabel">Pesan rahasia (A–Z, 0–9)</span><textarea id="mTxText" maxlength="72" spellcheck="false" placeholder="Ketik pesan rahasia...">PILAR HEBAT</textarea></label>',
 '<div class="morse-split only-ook"><label>Carrier TX (Hz)<select id="mTxFreq"></select></label><label>Unit Morse (T)<select id="mTxUnit"></select></label></div>',
'<div class="morse-split only-fsk"><label>Kanal nada (f0 / f1)<select id="mFskTxPair"></select></label><label>Laju simbol<select id="mFskTxSym"></select></label></div>',
'<div class="morse-split only-fsk"><label>Koreksi error<select id="mFskTxFec"></select></label><label>Simulasi gangguan<select id="mFskInject"></select></label></div>',
 '<div class="morse-ctl"><button class="btn good" id="mSend">▶ Kirim pesan</button><button class="btn primary" id="mPilot">🎵 Uji carrier (1 dtk)</button><button class="btn danger" id="mStopTx">■ Hentikan</button><button class="btn" id="mBack">← Kembali Lab</button></div>',
 '<div class="morse-progress"><i id="mTxProgress"></i></div>',
 '<div class="morse-note" id="mTxStatus">TX siap · satu frekuensi carrier, dinyalakan/dimatikan menurut titik–garis. Pastikan volume speaker cukup, tidak maksimal.</div>',
 '<div class="card"><b id="mTxCodeTitle">🔎 Kode yang dikirim</b><div class="morse-note" id="mTxCode"></div></div>',
 '</div>',
 '<div class="morse-pane" id="mRxPane" hidden>',
 '<div class="morse-split only-ook"><label>Carrier RX (Hz)<select id="mRxFreq"></select></label><label>Unit Morse (T)<select id="mRxUnit"></select></label></div>',
'<div class="morse-split only-fsk"><label>Kanal nada (f0 / f1)<select id="mFskRxPair"></select></label><label>Laju simbol<select id="mFskRxSym"></select></label></div>',
 '<label class="only-ook">Kepekaan detektor<select id="mSensitivity"><option value="2.7">Tinggi (ruang tenang)</option><option value="3.8" selected>Normal</option><option value="5.4">Rendah (ruang bising)</option></select></label>',
 '<div class="morse-ctl"><button class="btn good" id="mRxStart">🎤 Mulai dengar</button><button class="btn primary only-ook" id="mLock">🎯 Auto Lock</button><button class="btn danger" id="mRxStop">■ Stop RX</button><button class="btn" id="mClear">↺ Bersihkan teks</button></div>',
 '<div class="morse-stats only-ook"><div><small>CARRIER LOCK</small><b id="mRxLock">1000 Hz · manual</b></div><div><small>CARRIER / SNR</small><b id="mRxSnr">—</b></div><div><small>MIC RAW</small><b id="mRxRaw">—</b></div><div><small>DETECTOR</small><b id="mRxGate">menunggu</b></div></div>',
 '<div class="morse-meter-row only-ook"><span>MIC</span><div class="morse-progress"><i id="mRxRawLevel"></i></div></div>',
 '<div class="morse-meter-row only-ook"><span>CARRIER</span><div class="morse-progress"><i id="mRxLevel"></i></div></div>',
'<div class="morse-stats only-fsk"><div><small>STATUS</small><b id="mFxState">menunggu preamble</b></div><div><small>MODE (dari sync)</small><b id="mFxMode">—</b></div><div><small>KEYAKINAN BIT</small><b id="mFxConf">—</b></div><div><small>BIT DIKOREKSI</small><b id="mFxFix">—</b></div></div>',
'<div class="morse-meter-row only-fsk"><span>NADA 0</span><div class="morse-progress fx0"><i id="mFx0Level"></i></div></div>',
'<div class="morse-meter-row only-fsk"><span>NADA 1</span><div class="morse-progress fx1"><i id="mFx1Level"></i></div></div>',
'<div class="morse-meter-row only-fsk"><span>PAKET</span><div class="morse-progress"><i id="mFxProgress"></i></div></div>',
 '<div class="morse-note" id="mRxStatus">Tekan Mulai Dengar, lalu kirim bunyi dari HP lain. Saat Auto Lock, gunakan Uji Carrier dari HP.</div>',
 '<div class="card"><b>📨 Hasil decoding</b><div class="morse-big" id="mRxText" aria-live="polite">…</div><div class="morse-note" id="mRxSymbols">Simbol masuk: —</div></div>',
 '<button class="btn" id="mBackRx" type="button">← Kembali Lab</button>',
 '</div>',
 '<div class="morse-note" id="mHelpNote">💡 Dua perangkat sungguhan: <b>HP sebagai speaker TX</b> dan <b>IFP/desktop sebagai mikrofon RX</b>. Media transmisinya udara—tanpa Wi-Fi atau server. Samakan frekuensi carrier <b>dan T</b>. Gunakan HTTPS untuk izin mikrofon.</div>',
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
 '<div class="morse-visual"><div class="cap"><span id="mWaveTitle">🌊 Pembawa vs pembawa termodulasi</span><span id="mWaveLabel">DEMO · TANPA AUDIO</span></div><canvas id="mWaveCanvas" aria-label="Carrier tetap dan gelombang termodulasi Morse"></canvas>',
 '<div class="morse-legend" id="mLegend"><span style="color:#60beff">━ Carrier konstan</span><span><b>━</b> On-Off Keying</span></div></div>',
 '<div class="morse-bottom"><div class="morse-strip" id="mRail" aria-live="off"><span class="morse-caption">· singkat = 1T &nbsp; — panjang = 3T &nbsp; jeda huruf = 3T</span></div><div class="morse-caption" id="mAha">AHA: Karakter tidak mengubah tinggi nada. Kode terletak pada durasi nyala–padam carrier yang merambat melalui udara.</div></div>'
].join('');
function options(id,items,defaultValue,render){
 const el=$(id);
 for(const v of items){const o=document.createElement('option');o.value=String(v);o.textContent=render(v);el.appendChild(o)}
 el.value=String(defaultValue);
}
options('mTxFreq',CHOICES,1000,v=>v+' Hz');
options('mRxFreq',CHOICES,1000,v=>v+' Hz');
options('mTxUnit',[80,100,120,160,220],120,v=>v+' ms · '+Math.round(1200/v)+' WPM kira-kira');
options('mRxUnit',[80,100,120,160,220],120,v=>v+' ms');
const cfg={mode:'tx',scheme:'ook',active:false,tx:null,rx:{
  listening:false,buffer:new Float32Array(2048),
  freq:1000,unit:120,present:false,candidate:false,candidateSince:0,onAt:0,lastOff:0,lastValidOff:0,lastChange:0,
  raw:[],text:'',symbols:[],history:[],wordSpaced:false,glitches:0,
  noise:0.00008,level:0,rawLevel:0,sideLevel:0,snr:0,auto:false,autoSamples:[],lastScan:0,lastUi:0,lastStatus:0
}};
const R=cfg.rx;
const FX={listening:false,rx:null,node:null,sink:null,srcNode:null,moduleCtx:null,messages:[],hist:[],lastMode:null,lastUi:0,lastRail:0,sawTone:false};
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
function setMode(m){
 cfg.mode=m;
 $('mTxPane').hidden=m!=='tx';$('mRxPane').hidden=m!=='rx';
 $('mModeTx').classList.toggle('on',m==='tx');$('mModeRx').classList.toggle('on',m==='rx');
 if(m==='tx')setStep(2);else setStep(4);
 updateRail();
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
function previewCode(){
 if(cfg.scheme==='fsk'){previewFsk();return}
 const text=normalized($('mTxText').value).slice(0,72);
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
 const msg=normalized($('mTxText').value).slice(0,72);
 if(!msg&&!test){status('mTxStatus','Isi pesan dahulu. Karakter didukung: A–Z, 0–9, titik, koma, ?, /.');return}
 if(!test&&msg!==$('mTxText').value.toUpperCase().replace(/\s+/g,' ').trim())status('mTxStatus','Karakter tak dikenal diabaikan.');
 const f=+$('mTxFreq').value,u=+$('mTxUnit').value;
 const p=test?[{start:0,end:1500,mark:'—'}]:planText(msg,u).pulses;
 const duration=test?1650:planText(msg,u).duration;
 try{
  const a=scheduleAudio(p,duration,f);
  cfg.tx={...a,pulses:p,duration,started:false,test,unit:u,freq:f,message:msg};
  status('mTxStatus',test?'UJI CARRIER: nada kontinu 1 detik. Tekan Auto Lock di receiver sebelum tes.':'Mengirim "'+msg+'" lewat speaker · '+f+' Hz · T='+u+' ms.');
  status('mWaveLabel',f+' Hz · '+(test?'PILOT 1.5 s':'OOK LIVE'));
  status('mSubtitle','Tinggi nada tetap '+f+' Hz; durasi nyala dan padam menyandi titik dan garis. Dengarkan dari perangkat lain.');
  $('mLive').classList.add('on');status('mLiveText',test?'UJI FREKUENSI':'ACOUSTIC TX');
  setStep(2);
 }catch(e){status('mTxStatus','Audio tidak tersedia: '+(e.message||String(e)))}
}
function tuneRx(){
 const f=+$('mRxFreq').value;
 R.freq=f;
 if(R.filter&&A.ctx){
  R.filter.frequency.setTargetAtTime(f,A.ctx.currentTime,.018);
  R.filter.Q.setTargetAtTime(clamp(f/85,5,24),A.ctx.currentTime,.018);
 }
 status('mRxLock',f+' Hz · '+(R.auto?'mencari':'manual'));
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
 status('mRxText','…');status('mRxSymbols','Simbol masuk: —');updateRail();
}
async function startRx(){
 if(R.listening)return;
 try{
  if(!A.micOn)await A.startMic();
  if(!A.micOn)throw Error('Izin mikrofon gagal');
  A.ensure();R.freq=+$('mRxFreq').value;R.unit=+$('mRxUnit').value;
  if(!connectRx())throw Error('Input mikrofon tidak tersedia');
  clearRx();R.listening=true;
  $('mRxStart').disabled=true;
  status('mRxStatus','RX aktif pada '+R.freq+' Hz. Meter MIC = semua suara; CARRIER = nada target. Decoder kini menolak glitch <½T dan menjaga gap 1T/3T.');
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

 // FIX v4.0.3: ambang ON/OFF RELATIF terhadap puncak carrier (bukan hanya terhadap noise floor).
 // Ruangan memantulkan nada (gema 0,2–0,8 dtk), sehingga di jeda 1T level carrier hanya turun 6–20 dB.
 // Ambang absolut (±25–55 dB di bawah puncak) tidak pernah tercapai -> semua titik/garis menyatu jadi satu pulsa panjang.
 // Puncak naik cepat saat carrier sungguhan hadir, turun pelan (τ≈3,5 dtk) agar volume yang berubah tetap terikuti.
 R.peak=(R.peak||0)*Math.exp(-dtMs/3500);
 if(R.present&&R.snr>=snrMin-2.2&&R.level>R.peak)R.peak+=(R.level-R.peak)*.4;
 const onTh=Math.max(onAbs,R.peak*.60);
 const offTh=Math.max(onAbs*.72,R.peak*.45);

 const rawGate=R.present
   ? (R.level>offTh&&R.snr>=snrMin-2.2)
   : (R.level>onTh&&R.snr>=snrMin);

 // FIX v4.0.3: noise floor hanya belajar saat benar-benar sepi (ekor gema sudah lewat),
 // bukan dari ekor gema carrier yang membuat noise floor 'naik' dan ambang ikut naik.
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
  // Gunakan waktu saat kandidat pertama muncul, bukan waktu sesudah debounce,
  // agar panjang dot/dash dan gap tetap mendekati timing akustik aslinya.
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
      // Pola Morse valid maksimum 6 elemen; >7 hampir pasti noise.
      R.symbols=[];R.glitches++;
      status('mRxSymbols','Noise burst dibuang · '+R.glitches+' glitch');
    }else{
      status('mRxSymbols','Pulsa '+Math.round(ms)+' ms → '+mark+' · pola: '+R.symbols.join(' ').replaceAll('.','·').replaceAll('-','—'));
    }
    updateRail();
   }else{
    // Pulsa terlalu pendek diabaikan DAN tidak mengubah lastValidOff.
    R.glitches++;
    status('mRxSymbols','Glitch '+Math.round(ms)+' ms diabaikan · total '+R.glitches);
   }
  }
 }

 // Selesaikan huruf berdasarkan gap sejak PULSA VALID terakhir.
 // Glitch pendek tidak mereset jam ini.
 if(R.symbols.length&&R.lastValidOff){
  const gap=now-R.lastValidOff;
  if(gap>=R.unit*2.55 && (!R.present || now-R.onAt<R.unit*.45))finishLetter();
 }

 // Spasi kata hanya saat benar-benar OFF; jangan muncul di tengah dash panjang.
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
function updateRail(){
 if(cfg.scheme==='fsk'){railFsk(-1);return}
 const r=$('mRail');r.replaceChildren();
 let items;
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
function draw(now){
 const {w,h,dpr}=size;if(w<10||h<10)return;
 if(cfg.scheme==='fsk'){drawFsk(now);return}
 cx.setTransform(dpr,0,0,dpr,0,0);
 cx.clearRect(0,0,w,h);
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
 if(cfg.tx&&cfg.tx.kind==='fsk')tickFskTx();
 else if(cfg.tx){
  const t=(A.ctx.currentTime-cfg.tx.begin)*1000,tx=cfg.tx;
  $('mTxProgress').style.width=clamp(t/tx.duration*100,0,100)+'%';
  const i=tx.pulses.findIndex(p=>t>=p.start&&t<p.end);
  markRail(i);
  if(i>=0){setStep(2);status('mAha','AHA: '+(tx.pulses[i].mark==='.'?'TITIK = carrier ON selama 1T.':'GARIS = carrier ON selama 3T.')+' Frekuensi dasar tidak berubah.');}
  else if(t>0&&t<tx.duration){setStep(3);status('mAha','JEDA = carrier OFF. Gelombang tidak dipancarkan, tetapi waktu diam tetap membawa informasi.')}
  if(t>=tx.duration+.12*1000){
   cfg.tx=null;$('mTxProgress').style.width='100%';
   status('mTxStatus',tx.test?'Tes carrier selesai. Receiver kini bisa mengunci frekuensi.':'Pengiriman selesai. Lihat teks hasil decode di perangkat receiver.');
   $('mLive').classList.remove('on');status('mLiveText','TX SELESAI');setStep(3);
  }
 }
 if(cfg.mode==='rx'&&FX.listening)tickFskRx(now);
 if(cfg.mode==='rx'&&R.listening){R.unit=+$('mRxUnit').value;tickRx(now);
  if(R.present){setStep(3);status('mAha','AHA: mikrofon mendeteksi carrier '+R.freq+' Hz. Durasi hadirnya bunyi diubah menjadi titik atau garis.')}
 }
 if(now-lastPaint>35){lastPaint=now;draw(now)}
}
/* ===================== SKEMA BFSK + HAMMING + CRC (inti DSP: fsk-core.js) =====================
 * TX: bit → nada f0 / f1 (OscillatorNode, fase kontinu).  RX: AudioWorklet mengambil SEMUA sampel mikrofon
 * (tidak bergantung frame-rate layar) → Receiver.push() → preamble+sync → bit → Hamming → CRC. */
const FSK_PAIRS=[[800,1200,'A'],[1500,1900,'B'],[2200,2600,'C'],[2900,3300,'D']];
const FSK_SYMS=[30,40,60];
const FSK_INJECT={none:['Tidak ada (kanal apa adanya)'],random3:['3 bit rusak acak','random',3],random8:['8 bit rusak acak','random',8],burst6:['Burst: 6 bit rusak berurutan','burst',6]};
const OOK_CHAIN=[['Pesan','karakter'],['Kode Morse','durasi pulsa'],['Modulasi','carrier ON/OFF'],['Media udara','speaker → mic'],['Decode','pulsa → teks']];
const FSK_CHAIN=[['Pesan','karakter ASCII'],['Bit + ECC','CRC · Hamming'],['Modulasi','FSK f0 / f1'],['Media udara','speaker → mic'],['Decode','sync → bit → teks']];
const OOK_SUB=$('mSubtitle').textContent,OOK_AHA=$('mAha').textContent,OOK_LEG=$('mLegend').innerHTML,OOK_HELP=$('mHelpNote').innerHTML;
const DEMO=FC?FC.encodeFrame('PILAR',2).bits.slice(0,40):[1,0,1,0,1,0,1,0];
const fskPairOf=id=>{const [a,b]=$(id).value.split('|').map(Number);return {f0:a,f1:b}};
const pairLabel=v=>{const [a,b]=v.split('|').map(Number),p=FSK_PAIRS.find(x=>x[0]===a);return 'Kanal '+(p?p[2]:'?')+' · '+a+' / '+b+' Hz'};
const symLabel=v=>v+' ms · '+Math.round(1000/v)+' baud'+(v===30?' · cepat':v===60?' · tahan gema':'');
for(const id of ['mFskTxPair','mFskRxPair'])options(id,FSK_PAIRS.map(p=>p[0]+'|'+p[1]),'1500|1900',pairLabel);
for(const id of ['mFskTxSym','mFskRxSym'])options(id,FSK_SYMS,40,symLabel);
options('mFskTxFec',[2,1,0],2,v=>FC?FC.MODES[v].name:String(v));
options('mFskInject',Object.keys(FSK_INJECT),'none',v=>FSK_INJECT[v][0]);

function setChain(arr){
 document.querySelectorAll('#mChain [data-step]').forEach(e=>{const i=+e.dataset.step,b=e.querySelector('b'),s=e.querySelector('small');if(b)b.textContent=arr[i][0];if(s)s.textContent=arr[i][1]});
}
function setScheme(s){
 if(s==='fsk'&&!FC){status('mSchemeNote','fsk-core.js tidak termuat — hanya skema OOK yang tersedia.');return}
 if(s!==cfg.scheme){stopTx(false);stopRx('');stopFskRx('',true);cfg.scheme=s}
 applyScheme();
}
function applyScheme(){
 const f=cfg.scheme==='fsk';
 $('mCfg').dataset.scheme=cfg.scheme;
 $('mSchOok').classList.toggle('on',!f);$('mSchFsk').classList.toggle('on',f);
 status('mSchemeNote',f
  ?'BFSK: dua nada — f0 = bit 0, f1 = bit 1. Penerima membandingkan energi kedua nada, jadi tidak bergantung pada kerasnya suara. Paket = preamble + sync + panjang + data + CRC-8; Hamming(7,4) memperbaiki bit yang salah.'
  :'OOK Morse: satu nada dinyalakan/dimatikan. Sederhana dan mudah dilihat, tetapi keputusan ON/OFF bergantung pada ambang volume dan ketepatan waktu.');
 $('mTxLabel').textContent=f?'Pesan (ASCII, maks. '+(FC?FC.MAXLEN:32)+' karakter)':'Pesan rahasia (A–Z, 0–9)';
 $('mTxText').maxLength=f?(FC?FC.MAXLEN:32):72;
 $('mPilot').textContent=f?'🎵 Uji nada (2 dtk)':'🎵 Uji carrier (1 dtk)';
 $('mTxCodeTitle').textContent=f?'🔎 Struktur paket yang dikirim':'🔎 Kode yang dikirim';
 $('mTxCode').style.whiteSpace=f?'pre-wrap':'';$('mRxText').style.whiteSpace=f?'pre-wrap':'';
 $('mHelpNote').innerHTML=f?'💡 Dua perangkat sungguhan: <b>HP sebagai speaker TX</b>, <b>IFP/desktop sebagai mikrofon RX</b>. Samakan <b>kanal nada</b> dan <b>laju simbol</b>; mode koreksi error dikenali otomatis dari sync word. Mulai RX lebih dulu agar penerima sempat mengukur derau latar. Gunakan HTTPS untuk izin mikrofon.':OOK_HELP;
 status('mSubtitle',f?'Dua nada bergantian menyandikan bit 0 dan 1 (Frequency-Shift Keying). Pesan diberi preamble, sync, CRC, dan paritas Hamming — sehingga penerima tahu kapan paket mulai, dan bisa memperbaiki atau menolak data yang rusak.':OOK_SUB);
 status('mAha',f?'AHA: yang berubah adalah FREKUENSI, bukan hadir/hilangnya bunyi. Penerima hanya bertanya “nada mana yang lebih kuat?” — jawaban ini tetap benar saat suara mengecil atau membesar.':OOK_AHA);
 $('mLegend').innerHTML=f?'<span style="color:#60beff">━ Nada f0 = bit 0</span><span><b>━</b> Nada f1 = bit 1</span>':OOK_LEG;
 status('mWaveTitle',f?'🌊 Bit digital → gelombang FSK (skala diperlambat agar terlihat)':'🌊 Pembawa vs pembawa termodulasi');
 status('mWaveLabel',f?'DEMO · TANPA AUDIO':'DEMO · TANPA AUDIO');
 status('mTxStatus',f?'TX siap · pilih mode koreksi error lalu kirim. Coba “Simulasi gangguan” untuk melihat Hamming bekerja.':'TX siap · satu frekuensi carrier, dinyalakan/dimatikan menurut titik–garis. Pastikan volume speaker cukup, tidak maksimal.');
 status('mRxStatus',f?'Tekan Mulai Dengar. Penerima menunggu preamble 1-0-1-0… lalu sync word. Samakan kanal nada dan laju simbol dengan pengirim.':'Tekan Mulai Dengar, lalu kirim bunyi dari HP lain. Saat Auto Lock, gunakan Uji Carrier dari HP.');
 status('mRxText','…');status('mRxSymbols','Simbol masuk: —');
 setChain(f?FSK_CHAIN:OOK_CHAIN);
 previewCode();updateRail();
}
function currentFskFrame(){return FC.encodeFrame($('mTxText').value,+$('mFskTxFec').value)}
function previewFsk(){
 const fr=currentFskFrame();
 if(!fr){status('mTxCode','Ketik pesan (maks. '+FC.MAXLEN+' karakter, ASCII).');return}
 const symMs=+$('mFskTxSym').value,code=fr.text.charCodeAt(0),hi=code>>4,lo=code&15;
 const nib=n=>n.toString(2).padStart(4,'0');
 const cw=n=>{const c=FC.hamEnc(n);return '('+c[0]+')('+c[1]+')'+c[2]+'('+c[3]+')'+c[4]+c[5]+c[6]};
 const L=fr.layout,lines=['Karakter pertama “'+fr.text[0]+'” = ASCII '+code+' = '+nib(hi)+' '+nib(lo)];
 if(fr.mode)lines.push('Hamming(7,4): '+nib(hi)+' → '+cw(hi)+'    '+nib(lo)+' → '+cw(lo)+'    ((x) = bit paritas)');
 lines.push('Paket: preamble '+FC.PREAMBLE_LEN+' · sync '+FC.SYNC_LEN+' · header '+(L.head[1]-L.head[0])+' · data '+(L.body[1]-L.body[0])+' bit  =  '+fr.bits.length+' simbol ≈ '+(fr.bits.length*symMs/1000).toFixed(1)+' dtk');
 lines.push('CRC-8 pesan = 0x'+fr.crc.toString(16).toUpperCase().padStart(2,'0')+' · sync word = 0x'+FC.SYNC[fr.mode].toString(16).toUpperCase().padStart(4,'0')+' ('+FC.MODES[fr.mode].short+')');
 status('mTxCode',lines.join('\n'));
}
function scheduleFsk(bits,S,f0,f1){
 A.ensure();
 const ctx=A.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type='sine';gain.gain.value=0;osc.connect(gain);gain.connect(ctx.destination);
 const begin=ctx.currentTime+.10,end=begin+bits.length*S;
 osc.frequency.setValueAtTime(bits[0]?f1:f0,begin);
 for(let k=1;k<bits.length;k++)if(bits[k]!==bits[k-1])osc.frequency.setValueAtTime(bits[k]?f1:f0,begin+k*S);   // fase osilator kontinu
 gain.gain.setValueAtTime(0,begin);
 gain.gain.linearRampToValueAtTime(.32,begin+.012);
 gain.gain.setValueAtTime(.32,Math.max(begin+.012,end-.012));
 gain.gain.linearRampToValueAtTime(0,end);
 osc.start(begin);osc.stop(end+.12);
 return {osc,gain,begin};
}
function launchFsk(test=false){
 if(!FC){status('mTxStatus','fsk-core.js tidak termuat.');return}
 if(cfg.tx)stopTx(false);
 if(cfg.mode!=='tx')setMode('tx');
 const {f0,f1}=fskPairOf('mFskTxPair'),symMs=+$('mFskTxSym').value,mode=+$('mFskTxFec').value;
 let bits,frame=null,flipped=[];
 if(test)bits=Array.from({length:Math.max(8,Math.round(2000/symMs))},(_,i)=>(i+1)&1);
 else{
  frame=FC.encodeFrame($('mTxText').value,mode);
  if(!frame){status('mTxStatus','Isi pesan dahulu (ASCII, maks. '+FC.MAXLEN+' karakter).');return}
  bits=frame.bits;
  const inj=FSK_INJECT[$('mFskInject').value];
  if(inj&&inj[1]){const r=FC.corruptBits(frame,inj[1],inj[2]);bits=r.bits;flipped=r.flipped}
 }
 try{
  const a=scheduleFsk(bits,symMs/1000,f0,f1);
  cfg.tx={...a,kind:'fsk',bits,frame,flipped,test,symMs,f0,f1,duration:bits.length*symMs,lastK:-1};
  status('mTxStatus',test?'UJI NADA: f1 dan f0 bergantian selama 2 detik. Di receiver, meter NADA 0 dan NADA 1 harus bergantian naik.'
   :'Mengirim “'+frame.text+'” · '+FC.MODES[mode].short+' · '+f0+'/'+f1+' Hz · '+symMs+' ms/simbol · ≈ '+(bits.length*symMs/1000).toFixed(1)+' dtk'+(flipped.length?' · '+flipped.length+' bit sengaja dirusak':'')+'.');
  status('mWaveLabel',f0+' / '+f1+' Hz · '+(test?'UJI NADA':'FSK LIVE'));
  status('mSubtitle','Bit 0 = '+f0+' Hz, bit 1 = '+f1+' Hz; satu simbol = '+symMs+' ms. Penerima membandingkan energi kedua nada pada setiap simbol.');
  $('mLive').classList.add('on');status('mLiveText',test?'UJI NADA':'ACOUSTIC TX · FSK');
  setStep(2);railFsk(-1);
 }catch(e){status('mTxStatus','Audio tidak tersedia: '+(e.message||String(e)))}
}
function tickFskTx(){
 const tx=cfg.tx,t=(A.ctx.currentTime-tx.begin)*1000;
 $('mTxProgress').style.width=clamp(t/tx.duration*100,0,100)+'%';
 const k=Math.floor(t/tx.symMs);
 if(t>=0&&k<tx.bits.length&&k!==tx.lastK){
  tx.lastK=k;railFsk(k);setStep(2);
  let msg;
  if(tx.test)msg='UJI NADA: bit '+tx.bits[k]+' → nada '+(tx.bits[k]?tx.f1:tx.f0)+' Hz.';
  else{
   const L=tx.frame.layout,bit='bit '+tx.bits[k]+' → '+(tx.bits[k]?tx.f1:tx.f0)+' Hz. ';
   if(tx.flipped.includes(k))msg='GANGGUAN BUATAN: bit ini sengaja dibalik (0↔1) untuk meniru derau. '+bit+'Apakah penerima bisa memperbaikinya?';
   else if(k<L.pre[1])msg='PREAMBLE 1-0-1-0…: pola berselang-seling agar penerima mengunci waktu mulai tiap simbol. '+bit;
   else if(k<L.sync[1])msg='SYNC WORD 16 bit: tanda “paket mulai” sekaligus pengenal mode koreksi ('+FC.MODES[tx.frame.mode].short+'). '+bit;
   else if(k<L.head[1])msg='HEADER: panjang pesan'+(tx.frame.mode?', dilindungi Hamming':'')+'. '+bit;
   else msg='DATA: '+(tx.frame.mode?'tiap 4 bit data ditambah 3 bit paritas Hamming'+(tx.frame.mode===2?', lalu bit diacak (interleaving) agar burst tersebar. ':'. '):'karakter dikirim apa adanya + CRC-8. ')+bit;
  }
  status('mAha','AHA: '+msg);
 }
 if(t>=tx.duration+120){
  cfg.tx=null;$('mTxProgress').style.width='100%';
  status('mTxStatus',tx.test?'Uji nada selesai.':'Pengiriman selesai. Lihat hasil decode di perangkat receiver.');
  $('mLive').classList.remove('on');status('mLiveText','TX SELESAI');setStep(3);railFsk(-1);
 }
}
function railFsk(k=-1){
 const r=$('mRail');r.replaceChildren();
 let bits=null,layout=null,flipped=[],from=0,cur=-1;
 if(cfg.mode==='tx'&&FC){
  const tx=cfg.tx&&cfg.tx.kind==='fsk'?cfg.tx:null,fr=tx?tx.frame:currentFskFrame();
  if(tx){bits=tx.bits;flipped=tx.flipped}else if(fr)bits=fr.bits;
  if(fr&&!(tx&&tx.test))layout=fr.layout;
  if(tx&&k>=0){from=clamp(k-12,0,Math.max(0,bits.length-36));cur=k}
 }else if(cfg.mode==='rx'&&FX.rx){bits=FX.rx.bits;from=Math.max(0,bits.length-36)}
 if(!bits||!bits.length){const s=document.createElement('span');s.className='morse-caption';s.textContent=cfg.mode==='rx'?'Bit hasil keputusan penerima akan muncul di sini setelah sync terkunci.':'Ketik pesan untuk melihat bit paketnya.';r.appendChild(s);return}
 const to=Math.min(bits.length,from+36);
 if(from>0){const s=document.createElement('span');s.className='morse-caption';s.textContent='…';r.appendChild(s)}
 for(let i=from;i<to;i++){
  const el=document.createElement('span');
  let cls='morse-token fsk-bit';
  if(layout)cls+=i<layout.pre[1]?' b-pre':i<layout.sync[1]?' b-sync':i<layout.head[1]?' b-head':' b-body';
  if(flipped.includes(i))cls+=' b-err';
  if(i===cur)cls+=' current';
  el.className=cls;el.textContent=bits[i];el.title='simbol #'+i;r.appendChild(el);
 }
 if(to<bits.length){const s=document.createElement('span');s.className='morse-caption';s.textContent='… +'+(bits.length-to)+' bit';r.appendChild(s)}
 if(layout){
  for(const [c,t] of [['b-pre','preamble'],['b-sync','sync'],['b-head','header'],['b-body','data'],...(flipped.length?[['b-err','dirusak']]:[])]){
   const el=document.createElement('span');el.className='morse-token fsk-lg '+c;el.textContent=t;r.appendChild(el);
  }
 }
}

/* ---- RX ---- */
const WORKLET_SRC='class T extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.n=0}process(i){const x=i[0]&&i[0][0];if(x){for(let k=0;k<x.length;k++){this.b[this.n++]=x[k];if(this.n===1024){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor("pilar-fsk-tap",T)';
async function attachFskTap(){
 const ctx=A.ctx;let node=null;
 if(ctx.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
  try{
   if(FX.moduleCtx!==ctx){
    const url=URL.createObjectURL(new Blob([WORKLET_SRC],{type:'application/javascript'}));
    try{await ctx.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}
    FX.moduleCtx=ctx;
   }
   node=new AudioWorkletNode(ctx,'pilar-fsk-tap',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
   node.port.onmessage=e=>feedFsk(e.data);
  }catch(_){node=null}
 }
 if(!node){   // cadangan untuk browser lama tanpa AudioWorklet
  node=ctx.createScriptProcessor(2048,1,1);
  node.onaudioprocess=e=>feedFsk(new Float32Array(e.inputBuffer.getChannelData(0)));
 }
 const sink=ctx.createGain();sink.gain.value=0;node.connect(sink);sink.connect(ctx.destination);
 A.src.connect(node);
 FX.node=node;FX.sink=sink;FX.srcNode=A.src;
}
function feedFsk(chunk){
 if(!FX.listening||!FX.rx)return;
 for(const e of FX.rx.push(chunk))handleFskEvent(e);
}
async function startFskRx(){
 if(FX.listening)return;
 try{
  if(!FC)throw Error('fsk-core.js tidak termuat');
  if(!A.micOn)await A.startMic();
  if(!A.micOn)throw Error('Izin mikrofon gagal');
  A.ensure();
  if(!A.src)throw Error('Sumber mikrofon tidak tersedia');
  const {f0,f1}=fskPairOf('mFskRxPair'),symMs=+$('mFskRxSym').value;
  FX.rx=new FC.Receiver({sr:A.sampleRate(),f0,f1,symMs});
  await attachFskTap();
  clearFsk();FX.listening=true;
  $('mRxStart').disabled=true;
  status('mRxStatus','RX aktif · '+f0+' / '+f1+' Hz · '+symMs+' ms/simbol. Menunggu preamble 1-0-1-0… dari pengirim.');
  status('mWaveLabel','RX · '+f0+' / '+f1+' Hz');
  status('mLiveText','MIKROFON MENDENGAR');$('mLive').classList.add('on');setStep(3);
 }catch(e){stopFskRx('Gagal memulai receiver: '+(e.message||String(e)))}
}
function stopFskRx(message='RX berhenti. Mikrofon dapat dimatikan dari kontrol utama.',quiet=false){
 FX.listening=false;
 try{
  if(FX.node){
   if(FX.node.port)FX.node.port.onmessage=null;
   FX.node.onaudioprocess=null;
   try{if(FX.srcNode)FX.srcNode.disconnect(FX.node)}catch(_){}
   FX.node.disconnect();
  }
  if(FX.sink)FX.sink.disconnect();
 }catch(_){}
 FX.node=null;FX.sink=null;FX.srcNode=null;
 $('mRxStart').disabled=false;
 if(quiet)return;
 status('mRxStatus',message);
 $('mFx0Level').style.width='0%';$('mFx1Level').style.width='0%';$('mFxProgress').style.width='0%';
 status('mFxState','menunggu preamble');
 $('mLive').classList.remove('on');status('mLiveText','RECEIVER BERHENTI');
}
function clearFsk(){
 FX.messages=[];FX.hist=[];FX.lastMode=null;
 if(FX.rx)FX.rx.reset();
 status('mRxText','…');status('mRxSymbols','Simbol masuk: —');
 status('mFxState','menunggu preamble');status('mFxMode','—');status('mFxConf','—');status('mFxFix','—');
 $('mFxProgress').style.width='0%';
 updateRail();
}
function handleFskEvent(e){
 const M=FC.MODES;
 if(e.type==='lock'){
  FX.lastMode=e.mode;status('mFxMode',M[e.mode].short);setStep(3);
  status('mLiveText','SYNC TERKUNCI · '+M[e.mode].short);
  status('mRxStatus','Preamble + sync terdeteksi. Mode koreksi (dari sync word): '+M[e.mode].name+'. Membaca header dan data…');
  status('mAha','AHA: preamble 1-0-1-0 memberi tahu penerima kapan tiap simbol mulai; sync word 16 bit memastikan ini paket PILAR dan menyebutkan mode koreksi error.');
 }else if(e.type==='header'){
  status('mRxStatus','Header terbaca: pesan '+e.len+' karakter. Membaca data…');
 }else if(e.type==='abort'){
  status('mRxStatus','Paket dibatalkan: '+e.reason+'. Menunggu paket berikutnya.');status('mLiveText','MIKROFON MENDENGAR');
 }else if(e.type==='packet'){
  const pc=Math.round(e.conf*100);
  FX.messages.push({ok:e.ok,text:e.text});if(FX.messages.length>5)FX.messages.shift();
  status('mRxText',FX.messages.map(m=>(m.ok?'✓ ':'✗ ')+(m.ok?m.text:'(rusak — ditolak)')).join('\n'));
  status('mRxSymbols',(e.ok?'CRC-8 LOLOS':'CRC-8 GAGAL → paket ditolak')+' · '+M[e.mode].short+' · '+e.fixed+' bit dikoreksi · keyakinan bit '+pc+'% · '+e.bits+' simbol'+(e.ok?'':' · isi mentah (tidak dipercaya): “'+e.text+'”'));
  status('mFxFix',e.fixed+' bit');status('mFxConf',pc+'%');
  status('mRxStatus',e.ok?(e.fixed?'Pesan benar setelah Hamming memperbaiki '+e.fixed+' bit.':'Pesan diterima tanpa error.')
   :'CRC gagal: ada bit salah yang tidak terkoreksi. Paket ditolak daripada salah dibaca — minta kirim ulang, atau gunakan Hamming + interleaving.');
  status('mAha',e.ok?'AHA: CRC-8 dihitung ulang di penerima dan cocok — pesan dipercaya.'+(e.fixed?' Paritas Hamming menemukan dan membalik '+e.fixed+' bit yang salah.':'')
   :'AHA: CRC tidak cocok, jadi penerima tahu pesan rusak. Morse biasa tidak punya pemeriksaan ini sehingga akan salah baca tanpa peringatan.');
  setStep(4);status('mLiveText',e.ok?'PESAN DITERIMA ✓':'PAKET RUSAK ✗');
  $('mFxProgress').style.width='100%';
  railFsk(-1);
 }
}
function fxBitAt(t){
 const h=FX.hist;
 for(let i=h.length-1;i>=0;i--)if(h[i].t<=t)return h[i].b;
 return -1;
}
function tickFskRx(now){
 const rx=FX.rx;if(!rx)return;
 const s=rx.snapshot(),L=s.live,on=(L.e0+L.e1)>=rx.floor*FC.GATE;
 FX.hist.push({t:now,b:on?(L.d>0?1:0):-1});
 while(FX.hist.length&&now-FX.hist[0].t>3500)FX.hist.shift();
 if(now-FX.lastUi<100)return;
 FX.lastUi=now;
 const db=v=>10*Math.log10(v+1e-12);
 $('mFx0Level').style.width=clamp((db(L.e0)+90)/60*100,0,100)+'%';
 $('mFx1Level').style.width=clamp((db(L.e1)+90)/60*100,0,100)+'%';
 if(s.state==='lock'){
  const pct=s.total?Math.round(100*s.nbits/s.total):0;
  status('mFxState','terkunci · '+(s.phase==='head'?'header':'data '+pct+'%'));
  status('mFxConf',Math.round(s.conf*100)+'%');
  $('mFxProgress').style.width=pct+'%';
  if(now-FX.lastRail>250){FX.lastRail=now;railFsk(-1)}
 }else{
  status('mFxState',on?'ada nada · mencari sync':'menunggu preamble');
 }
 if(on&&!FX.sawTone){FX.sawTone=true;status('mAha','AHA: mikrofon menangkap nada f'+(L.d>0?'1':'0')+'. Bandingkan dua meter NADA 0 dan NADA 1: yang lebih tinggi menentukan bit.')}
 if(!on)FX.sawTone=false;
}
function drawFsk(now){
 const {w,h,dpr}=size;if(w<10||h<10)return;
 cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,w,h);
 const x0=14,x1=w-14,dx=x1-x0,amp=Math.min(30,Math.max(12,h*.105)),yD=h*.33,yW=h*.76,nVis=12;
 cx.strokeStyle='rgba(134,197,247,.12)';cx.lineWidth=1;
 for(let j=0;j<5;j++){const y=17+j*(h-33)/4;cx.beginPath();cx.moveTo(x0,y);cx.lineTo(x1,y);cx.stroke()}
 const txf=cfg.tx&&cfg.tx.kind==='fsk'?cfg.tx:null;
 let clock,bitAt,symMs,f0,f1,known=true;
 if(cfg.mode==='tx'&&txf){symMs=txf.symMs;f0=txf.f0;f1=txf.f1;clock=(A.ctx.currentTime-txf.begin)*1000;bitAt=t=>(t<0||t>=txf.duration)?-1:txf.bits[Math.floor(t/symMs)]}
 else if(cfg.mode==='rx'&&FX.listening){symMs=+$('mFskRxSym').value;({f0,f1}=fskPairOf('mFskRxPair'));clock=now;bitAt=fxBitAt;known=false}
 else{symMs=150;({f0,f1}=fskPairOf(cfg.mode==='tx'?'mFskTxPair':'mFskRxPair'));clock=now;const n=DEMO.length;bitAt=t=>DEMO[((Math.floor(t/symMs)%n)+n)%n]}
 const visible=nVis*symMs,pxSym=dx/nVis;
 cx.font='700 '+Math.max(10,Math.min(12,w/44))+'px system-ui';
 cx.fillStyle='#ffd042';cx.fillText('BIT DIGITAL · 1 = '+f1+' Hz, 0 = '+f0+' Hz',x0,Math.max(16,yD-amp-12));
 cx.fillStyle='#a1d5bb';cx.fillText('GELOMBANG FSK · nada 1 lebih rapat dari nada 0',x0,Math.max(yD+amp+22,yW-amp-14));
 cx.setLineDash([3,6]);cx.strokeStyle='rgba(255,255,255,.18)';
 for(const cy of [yD,yW]){cx.beginPath();cx.moveTo(x0,cy);cx.lineTo(x1,cy);cx.stroke()}cx.setLineDash([]);
 if(known){   // batas simbol + angka bit
  cx.strokeStyle='rgba(255,255,255,.07)';cx.fillStyle='rgba(255,255,255,.55)';cx.textAlign='center';
  for(let k=Math.ceil((clock-visible)/symMs);k*symMs<=clock;k++){
   const xb=x0+dx*(1-(clock-k*symMs)/visible);
   cx.beginPath();cx.moveTo(xb,yD-amp-6);cx.lineTo(xb,yW+amp+6);cx.stroke();
   const b=bitAt(k*symMs+symMs/2);if(b>=0&&xb+pxSym/2<x1)cx.fillText(String(b),xb+pxSym/2,yD+amp+6);
  }
  cx.textAlign='left';
 }
 cx.beginPath();cx.lineWidth=2.4;cx.strokeStyle='#ffd042';
 for(let i=0;i<=Math.floor(dx);i+=2){
  const t=clock-visible*(1-i/dx),b=bitAt(t),y=b<0?yD:(b?yD-amp*.8:yD+amp*.8);
  if(i===0)cx.moveTo(x0+i,y);else cx.lineTo(x0+i,y);
 }
 cx.stroke();
 cx.beginPath();cx.lineWidth=2.6;cx.strokeStyle='#38e699';cx.shadowBlur=9;cx.shadowColor='rgba(56,230,153,.42)';
 let ph=0;
 for(let i=0;i<=Math.floor(dx);i+=2){
  const t=clock-visible*(1-i/dx),b=bitAt(t);
  ph+=2*Math.PI*(b?3.3:2.2)/pxSym*2;
  const y=yW-Math.sin(ph)*amp*(b<0?0:1);
  if(i===0)cx.moveTo(x0+i,y);else cx.lineTo(x0+i,y);
 }
 cx.stroke();cx.shadowBlur=0;
 if(cfg.mode==='tx'&&txf||cfg.mode==='rx'&&FX.listening){
  cx.strokeStyle='rgba(255,208,66,.45)';cx.lineWidth=1.4;
  cx.beginPath();cx.moveTo(x1,yD-amp-5);cx.lineTo(x1,yW+amp+5);cx.stroke();
 }
}
function activate(on){
 cfg.active=!!on;
 document.body.classList.toggle('morse-mode',cfg.active);
 $('morseStage').hidden=!cfg.active;
 if(on){
  setMode(cfg.mode);rez();previewCode();
  $('selWave').value='off';$('selWave').dispatchEvent(new Event('change'));
  status('mAha','AHA: Carrier berfrekuensi tetap; kombinasi durasi bunyi dan hening menyandikan pesan.');
 }else{
  stopTx(false);stopRx('RX dinonaktifkan karena keluar dari Morse Link.');stopFskRx('',true);
 }
}
function micStopped(){
 if(R.listening)stopRx('Mikrofon dihentikan. Tekan Mulai Dengar lagi untuk receiver.');
 if(FX.listening)stopFskRx('Mikrofon dihentikan. Tekan Mulai Dengar lagi untuk receiver.');
}
$('mModeTx').onclick=()=>setMode('tx');$('mModeRx').onclick=()=>setMode('rx');
$('mTxText').oninput=()=>{previewCode();updateRail()};
$('mSend').onclick=()=>cfg.scheme==='fsk'?launchFsk(false):launchTx(false);
$('mPilot').onclick=()=>cfg.scheme==='fsk'?launchFsk(true):launchTx(true);
$('mStopTx').onclick=()=>stopTx();
$('mRxStart').onclick=()=>cfg.scheme==='fsk'?startFskRx():startRx();
$('mRxStop').onclick=()=>cfg.scheme==='fsk'?stopFskRx():stopRx();
$('mRxFreq').onchange=()=>{R.auto=false;R.autoSamples=[];tuneRx()};
$('mLock').onclick=async()=>{
 if(!R.listening)await startRx();
 if(!R.listening)return;
 R.auto=true;R.autoSamples=[];R.lastScan=0;
 status('mRxStatus','AUTO LOCK AKTIF: sekarang tekan Uji Carrier (1 dtk) di perangkat pengirim.');
 status('mRxLock','MENCARI PILOT…');
};
$('mClear').onclick=()=>cfg.scheme==='fsk'?clearFsk():clearRx();
$('mBack').onclick=$('mBackRx').onclick=()=>document.querySelector('[data-tool="lab"]')?.click();
$('mTxUnit').onchange=previewCode;
$('mSchOok').onclick=()=>setScheme('ook');$('mSchFsk').onclick=()=>setScheme('fsk');
if(!FC){$('mSchFsk').disabled=true;$('mSchFsk').title='fsk-core.js tidak termuat'}
for(const id of ['mFskTxPair','mFskTxSym','mFskTxFec'])$(id).onchange=previewCode;
for(const id of ['mFskRxPair','mFskRxSym'])$(id).onchange=()=>{
 if(!FX.rx)return;
 const {f0,f1}=fskPairOf('mFskRxPair');FX.rx.configure({f0,f1,symMs:+$('mFskRxSym').value});
 status('mRxStatus','Penerima disetel ulang: '+f0+' / '+f1+' Hz · '+$('mFskRxSym').value+' ms/simbol.');
};
addEventListener('pagehide',()=>{stopTx(false);stopRx('');stopFskRx('',true)},{once:true});
previewCode();setMode('tx');
window.SoundScopeMorse={activate,tick,micStopped,buildPlan:planText,codeMap:MORSE,setScheme,feedFsk};
})();
