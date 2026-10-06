/* PILAR SoundScope v4.0 — acoustic Morse link. No backend: speaker -> air -> microphone. */
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
 '<div class="morse-stats"><div><small>CARRIER LOCK</small><b id="mRxLock">1000 Hz · manual</b></div><div><small>SINYAL / SNR</small><b id="mRxSnr">—</b></div></div>',
 '<div class="morse-progress"><i id="mRxLevel"></i></div>',
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
  listening:false,filter:null,an:null,silent:null,buffer:new Float32Array(1024),
  freq:1000,unit:120,present:false,onAt:0,lastOff:0,lastChange:0,
  raw:[],text:'',symbols:[],history:[],wordSpaced:false,
  noise:0.001,level:0,snr:0,auto:false,autoSamples:[],lastScan:0,lastUi:0
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
  gain.gain.linearRampToValueAtTime(.22,a+.006);
  gain.gain.setValueAtTime(.22,Math.max(a+.006,b-.009));
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
 const p=test?[{start:0,end:1000,mark:'—'}]:planText(msg,u).pulses;
 const duration=test?1150:planText(msg,u).duration;
 try{
  const a=scheduleAudio(p,duration,f);
  cfg.tx={...a,pulses:p,duration,started:false,test,unit:u,freq:f,message:msg};
  status('mTxStatus',test?'UJI CARRIER: nada kontinu 1 detik. Tekan Auto Lock di receiver sebelum tes.':'Mengirim "'+msg+'" lewat speaker · '+f+' Hz · T='+u+' ms.');
  status('mWaveLabel',f+' Hz · '+(test?'PILOT':'OOK LIVE'));
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
 if(!A.src||!A.ctx)return false;
 if(R.filter){try{R.filter.disconnect();R.an.disconnect();R.silent.disconnect()}catch(_){}}
 R.filter=A.ctx.createBiquadFilter();R.filter.type='bandpass';R.filter.frequency.value=R.freq;R.filter.Q.value=clamp(R.freq/85,5,24);
 R.an=A.ctx.createAnalyser();R.an.fftSize=1024;R.an.smoothingTimeConstant=0;
 R.silent=A.ctx.createGain();R.silent.gain.value=0;
 A.src.connect(R.filter);R.filter.connect(R.an);R.an.connect(R.silent);R.silent.connect(A.ctx.destination);
 R.buffer=new Float32Array(R.an.fftSize);return true;
}
function stopRx(message='RX berhenti. Mikrofon dapat dimatikan dari kontrol utama.'){
 R.listening=false;R.present=false;R.auto=false;R.autoSamples=[];
 try{R.filter?.disconnect();R.an?.disconnect();R.silent?.disconnect()}catch(_){}
 R.filter=null;R.an=null;R.silent=null;
 status('mRxStatus',message);
 $('mRxStart').disabled=false;
 $('mRxLevel').style.width='0%';
 $('mLive').classList.remove('on');
 status('mLiveText','RECEIVER BERHENTI');
}
function clearRx(){
 R.symbols=[];R.text='';R.history=[];R.raw=[];R.present=false;R.onAt=0;R.lastOff=0;R.lastChange=0;R.wordSpaced=false;R.noise=.001;R.level=0;
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
  status('mRxStatus','RX mendengar pada '+R.freq+' Hz. Kirim pesan dari speaker HP lain; pastikan T TX dan RX sama.');
  status('mLiveText','MIKROFON MENDENGAR');$('mLive').classList.add('on');setStep(3);
 }catch(e){stopRx('Gagal memulai receiver: '+(e.message||String(e)))}
}
function goertzel(signal,f,sr){
 const w=2*Math.PI*f/sr,c=2*Math.cos(w);
 let q1=0,q2=0;
 for(let i=0;i<signal.length;i++){const q=signal[i]+c*q1-q2;q2=q1;q1=q}
 const v=Math.max(0,q1*q1+q2*q2-c*q1*q2);
 return 2*Math.sqrt(v)/signal.length;
}
function finishLetter(){
 if(!R.symbols.length)return;
 const seq=R.symbols.join(''),ch=DECODE[seq]||'□';
 R.text+=ch;R.raw.push({seq,ch});R.symbols=[];
 if(R.text.length>200)R.text=R.text.slice(-200);
 status('mRxText',R.text.trimEnd());
 status('mRxSymbols',seq+' → '+ch+(ch==='□'?' (tak dikenal)':''));
 setStep(4);updateRail();
}
function tickRx(now){
 if(!R.listening||!R.an||!A.micOn)return;
 R.an.getFloatTimeDomainData(R.buffer);
 const amp=goertzel(R.buffer,R.freq,A.ctx.sampleRate);
 R.level=R.level?R.level*.65+amp*.35:amp;
 const onTh=Math.max(.0025,R.noise*(+$('mSensitivity').value));
 const offTh=Math.max(.0015,R.noise*2.0);
 const heard=R.present?R.level>offTh:R.level>onTh;
 if(!R.present&&R.level<onTh*.7)R.noise=clamp(R.noise*.985+R.level*.015,.00025,.03);
 R.snr=20*Math.log10((R.level+.00001)/(R.noise+.00001));
 // Stabilkan status ON/OFF; bunyi lebih pendek dari 35% T dibuang sebagai glitch.
 if(heard!==R.present&&now-R.lastChange>25){
  R.lastChange=now;R.present=heard;
  if(heard){
   if(R.symbols.length&&R.lastOff&&now-R.lastOff>R.unit*2.25)finishLetter();
   R.onAt=now;R.wordSpaced=false;setStep(3);
  }else{
   const ms=now-R.onAt;
   if(ms>=R.unit*.35){
    const mark=ms>=R.unit*2?'—':'·';
    R.symbols.push(mark==='—'?'-':'.');
    R.raw.push({mark,duration:Math.round(ms)});
    if(R.symbols.length>8)R.symbols=[]; // potong noise yang bukan karakter Morse
    status('mRxSymbols','Sedang dibaca: '+R.symbols.join(' ').replaceAll('.','·').replaceAll('-','—'));
    updateRail();
   }
   R.lastOff=now;
  }
 }
 if(!R.present&&R.lastOff){
  const gap=now-R.lastOff;
  if(R.symbols.length&&gap>=R.unit*2.4)finishLetter();
  if(!R.wordSpaced&&R.text.length&&gap>=R.unit*5.9){
   R.text+=' ';R.wordSpaced=true;status('mRxText',R.text.trimEnd());
  }
 }
 R.history.push({t:now,on:R.present});
 while(R.history.length&&now-R.history[0].t>2500)R.history.shift();
 if(R.auto&&now-R.lastScan>75)scanCarrier(now);
 if(now-R.lastUi>125){
  R.lastUi=now;
  status('mRxSnr',Math.round(R.snr)+' dB · '+(R.present?'● ON':'○ OFF'));
  $('mRxLevel').style.width=clamp(R.level/Math.max(onTh,.008)*60,0,100)+'%';
  if(!R.auto)status('mRxLock',R.freq+' Hz · '+(R.present?'signal':'manual'));
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
 if(mx<-75||mx-floor<15)return;
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