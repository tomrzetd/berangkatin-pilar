/* PILAR SoundScope v4.0.2 — acoustic Morse link. Timing-safe RX with glitch rejection. */
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
const control=[
 '<div class="morse-config">',
 '<div class="morse-modes"><button class="btn on" id="mModeTx" type="button">📡 TRANSMIT</button><button class="btn" id="mModeRx" type="button">🎧 RECEIVE</button></div>',
 '<div class="morse-pane" id="mTxPane">',
 '<label>Pesan rahasia (A–Z, 0–9)<textarea id="mTxText" maxlength="72" spellcheck="false" placeholder="Ketik pesan rahasia...">PILAR HEBAT</textarea></label>',
 '<div class="morse-split"><label>Carrier TX (Hz)<select id="mTxFreq"></select></label><label>Unit Morse (T)<select id="mTxUnit"></select></label></div>',
 '<div class="morse-ctl"><button class="btn good" id="mSend">▶ Kirim pesan</button><button class="btn primary" id="mPilot">🎵 Uji carrier (1 dtk)</button><button class="btn danger" id="mStopTx">■ Hentikan</button><button class="btn" id="mBack">← Kembali Lab</button></div>',
 '<div class="morse-progress"><i id="mTxProgress"></i></div>',
 '<div class="morse-note" id="mTxStatus">TX siap · satu frekuensi carrier, dinyalakan/dimatikan menurut titik–garis. Pastikan volume speaker cukup, tidak maksimal.</div>',
 '<div class="card"><b>🔎 Kode yang dikirim</b><div class="morse-note" id="mTxCode"></div></div>',
 '</div>',
 '<div class="morse-pane" id="mRxPane" hidden>',
 '<div class="morse-split"><label>Carrier RX (Hz)<select id="mRxFreq"></select></label><label>Unit Morse (T)<select id="mRxUnit"></select></label></div>',
 '<label>Kepekaan detektor<select id="mSensitivity"><option value="2.7">Tinggi (ruang tenang)</option><option value="3.8" selected>Normal</option><option value="5.4">Rendah (ruang bising)</option></select></label>',
 '<div class="morse-ctl"><button class="btn good" id="mRxStart">🎤 Mulai dengar</button><button class="btn primary" id="mLock">🎯 Auto Lock</button><button class="btn danger" id="mRxStop">■ Stop RX</button><button class="btn" id="mClear">↺ Bersihkan teks</button></div>',
 '<div class="morse-stats"><div><small>CARRIER LOCK</small><b id="mRxLock">1000 Hz · manual</b></div><div><small>CARRIER / SNR</small><b id="mRxSnr">—</b></div><div><small>MIC RAW</small><b id="mRxRaw">—</b></div><div><small>DETECTOR</small><b id="mRxGate">menunggu</b></div></div>',
 '<div class="morse-meter-row"><span>MIC</span><div class="morse-progress"><i id="mRxRawLevel"></i></div></div>',
 '<div class="morse-meter-row"><span>CARRIER</span><div class="morse-progress"><i id="mRxLevel"></i></div></div>',
 '<div class="morse-note" id="mRxStatus">Tekan Mulai Dengar, lalu kirim bunyi dari HP lain. Saat Auto Lock, gunakan Uji Carrier dari HP.</div>',
 '<div class="card"><b>📨 Hasil decoding</b><div class="morse-big" id="mRxText" aria-live="polite">…</div><div class="morse-note" id="mRxSymbols">Simbol masuk: —</div></div>',
 '<button class="btn" id="mBackRx" type="button">← Kembali Lab</button>',
 '</div>',
 '<div class="morse-note">💡 Dua perangkat sungguhan: <b>HP sebagai speaker TX</b> dan <b>IFP/desktop sebagai mikrofon RX</b>. Media transmisinya udara—tanpa Wi-Fi atau server. Samakan frekuensi carrier <b>dan T</b>. Gunakan HTTPS untuk izin mikrofon.</div>',
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
 '<div class="morse-visual"><div class="cap"><span>🌊 Pembawa vs pembawa termodulasi</span><span id="mWaveLabel">DEMO · TANPA AUDIO</span></div><canvas id="mWaveCanvas" aria-label="Carrier tetap dan gelombang termodulasi Morse"></canvas>',
 '<div class="morse-legend"><span style="color:#60beff">━ Carrier konstan</span><span><b>━</b> On-Off Keying</span></div></div>',
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
const cfg={mode:'tx',active:false,tx:null,rx:{
  listening:false,buffer:new Float32Array(2048),
  freq:1000,unit:120,present:false,candidate:false,candidateSince:0,onAt:0,lastOff:0,lastValidOff:0,lastChange:0,
  raw:[],text:'',symbols:[],history:[],wordSpaced:false,glitches:0,
  noise:0.00008,level:0,rawLevel:0,sideLevel:0,snr:0,auto:false,autoSamples:[],lastScan:0,lastUi:0,lastStatus:0
}};
const R=cfg.rx;
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
 R.symbols=[];R.text='';R.history=[];R.raw=[];R.present=false;R.candidate=false;R.candidateSince=0;R.onAt=0;R.lastOff=0;R.lastValidOff=0;R.lastChange=0;R.wordSpaced=false;R.glitches=0;R.noise=.00008;R.level=0;R.rawLevel=0;R.sideLevel=0;R.snr=0;
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
 const onTh=Math.max(.00012,R.noise*mult);
 // OFF dibuat lebih dekat ke threshold ON agar gema 1T tidak menyambung dua pulsa.
 const offTh=Math.max(.00008,onTh*.72);
 R.snr=20*Math.log10((R.level+.000001)/(Math.max(R.sideLevel,R.noise*.45)+.000001));

 const rawGate=R.present
   ? (R.level>offTh&&R.snr>=snrMin-2.2)
   : (R.level>onTh&&R.snr>=snrMin);

 // Noise floor hanya belajar ketika tidak ada kandidat carrier kuat.
 if(!R.present&&!rawGate){
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
 if(cfg.tx){
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
 if(cfg.mode==='rx'&&R.listening){R.unit=+$('mRxUnit').value;tickRx(now);
  if(R.present){setStep(3);status('mAha','AHA: mikrofon mendeteksi carrier '+R.freq+' Hz. Durasi hadirnya bunyi diubah menjadi titik atau garis.')}
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
  status('mAha','AHA: Carrier berfrekuensi tetap; kombinasi durasi bunyi dan hening menyandikan pesan.');
 }else{
  stopTx(false);stopRx('RX dinonaktifkan karena keluar dari Morse Link.');
 }
}
function micStopped(){if(R.listening)stopRx('Mikrofon dihentikan. Tekan Mulai Dengar lagi untuk receiver.')}
$('mModeTx').onclick=()=>setMode('tx');$('mModeRx').onclick=()=>setMode('rx');
$('mTxText').oninput=()=>{previewCode();updateRail()};
$('mSend').onclick=()=>launchTx(false);
$('mPilot').onclick=()=>launchTx(true);
$('mStopTx').onclick=()=>stopTx();
$('mRxStart').onclick=startRx;
$('mRxStop').onclick=()=>stopRx();
$('mRxFreq').onchange=()=>{R.auto=false;R.autoSamples=[];tuneRx()};
$('mLock').onclick=async()=>{
 if(!R.listening)await startRx();
 if(!R.listening)return;
 R.auto=true;R.autoSamples=[];R.lastScan=0;
 status('mRxStatus','AUTO LOCK AKTIF: sekarang tekan Uji Carrier (1 dtk) di perangkat pengirim.');
 status('mRxLock','MENCARI PILOT…');
};
$('mClear').onclick=clearRx;
$('mBack').onclick=$('mBackRx').onclick=()=>document.querySelector('[data-tool="lab"]')?.click();
$('mTxUnit').onchange=previewCode;
addEventListener('pagehide',()=>{stopTx(false);stopRx('')},{once:true});
previewCode();setMode('tx');
window.SoundScopeMorse={activate,tick,micStopped,buildPlan:planText,codeMap:MORSE};
})();