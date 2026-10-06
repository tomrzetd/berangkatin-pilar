/* Uji fsk-core.js:  node apps/soundscope/test/fsk-core.test.js [--quick]
 * Kanal akustik disimulasikan: derau putih, "babble" kelas, gema (RT60), fading volume,
 * nada pengganggu, klik/impuls, selisih clock sound card (ppm), awal rekaman acak. */
'use strict';
const F=require('../fsk-core.js');
const quick=process.argv.includes('--quick');
let seed=20260610;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const gauss=()=>{let u=0;while(!u)u=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd())};
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('  ✗ GAGAL:',m)}};

/* ---------- 1. unit test: CRC & Hamming ---------- */
ok(F.crc8([...'123456789'].map(c=>c.charCodeAt(0)))===0xF4,'CRC-8 check value');
let hamOk=true;
for(let n=0;n<16;n++){
 const cw=F.hamEnc(n);
 if(F.hamDec(cw).n!==n||F.hamDec(cw).fixed)hamOk=false;
 for(let e=0;e<7;e++){const c=cw.slice();c[e]^=1;const r=F.hamDec(c);if(r.n!==n||r.fixed!==1)hamOk=false}
}
ok(hamOk,'Hamming(7,4) mengoreksi semua error 1-bit');
// 2 error dalam satu codeword TIDAK dapat dikoreksi (batas teori)
{const cw=F.hamEnc(9);cw[0]^=1;cw[3]^=1;ok(F.hamDec(cw).n!==9,'2 error dalam 1 codeword tidak bisa dikoreksi (harus salah)')}
console.log('✓ unit: CRC-8, Hamming(7,4) 16 nibble × 7 posisi error');

/* ---------- kanal ---------- */
function resample(x,ratio){const n=Math.floor(x.length/ratio),y=new Float32Array(n);
 for(let i=0;i<n;i++){const p=i*ratio,j=Math.floor(p),f=p-j;y[i]=(x[j]||0)*(1-f)+(x[j+1]||0)*f}return y}
function channel(x,sr,o={}){
 const pre=Math.round(sr*(o.pre??(.6+rnd()*1.4))),post=Math.round(sr*.8);
 let y=new Float32Array(pre+x.length+post);
 const taps=[{d:0,g:o.gain??1}];
 if(o.rt60)for(let k=0;k<24;k++){const d=Math.round((.004+rnd()*Math.min(1.2,o.rt60*1.3))*sr);
  taps.push({d,g:(o.gain??1)*Math.pow(10,-3*d/sr/o.rt60)*(rnd()<.5?-1:1)*.45*(rnd()+.3)})}
 for(const t of taps)for(let i=0;i<x.length;i++){const v=x[i];if(v!==0&&pre+i+t.d<y.length)y[pre+i+t.d]+=v*t.g}
 let s2=0,c=0;for(let i=0;i<x.length;i++)if(x[i]!==0){s2+=y[pre+i]*y[pre+i];c++}
 const rms=Math.sqrt(s2/Math.max(1,c));
 const nz=o.snrDb!=null?rms/Math.pow(10,o.snrDb/20):1e-5;
 const ph=rnd()*6.28;
 // babble: 14 "suara" = sinus dengan modulasi amplitudo lambat, 150–3500 Hz
 const bab=[];if(o.babbleDb!=null){for(let k=0;k<14;k++)bab.push({f:150+rnd()*3350,p:rnd()*6.28,m:.5+rnd()*5,mp:rnd()*6.28})}
 const bg=o.babbleDb!=null?rms*Math.pow(10,o.babbleDb/20)/Math.sqrt(bab.length/2):0;
 for(let i=0;i<y.length;i++){
  const t=i/sr;let v=y[i]*(o.fade?(1+o.fade*Math.sin(2*Math.PI*.7*t+ph)):1)+nz*gauss();
  for(const b of bab)v+=bg*(.5+.5*Math.sin(2*Math.PI*b.m*t+b.mp))*Math.sin(2*Math.PI*b.f*t+b.p);
  if(o.interf)for(const q of o.interf)v+=q.a*rms*Math.sin(2*Math.PI*q.f*t);
  y[i]=v;
 }
 if(o.clicksPerSec){const n=Math.round(o.clicksPerSec*y.length/sr);for(let k=0;k<n;k++){const c0=Math.floor(rnd()*y.length),len=Math.round(sr*(.01+rnd()*.05));
  for(let i=0;i<len&&c0+i<y.length;i++)y[c0+i]+=o.clickAmp*rms*Math.sin(Math.PI*i/len)*gauss()}}
 if(o.ppm)y=resample(y,1+o.ppm*1e-6);
 return y;
}
function receive(y,sr,cfg,chunk=1024){
 const rx=new F.Receiver({sr,...cfg}),evs=[];
 for(let i=0;i<y.length;i+=chunk){for(const e of rx.push(y.subarray(i,Math.min(y.length,i+chunk))))evs.push(e)}
 return {evs,rx};
}
const BASE={sr:48000,f0:1500,f1:1900,symMs:40};
function trial(text,mode,chan,cfg={},inject=null){
 const c={...BASE,...cfg};
 const fr=F.encodeFrame(text,mode);
 let bits=fr.bits,flipped=[];
 if(inject){const r=F.corruptBits(fr,inject.kind,inject.n,rnd);bits=r.bits;flipped=r.flipped}
 const x=F.modulate(bits,{sr:c.sr,f0:c.f0,f1:c.f1,symMs:c.symMs});
 const y=channel(x,c.sr,chan);
 const {evs}=receive(y,c.sr,c);
 const pk=evs.filter(e=>e.type==='packet');
 return {pk,evs,fr,flipped,dur:bits.length*c.symMs/1000};
}
function stat(label,text,mode,chan,N,cfg,inject){
 let good=0,rejected=0,wrongAccepted=0,none=0,fixed=0;
 for(let k=0;k<N;k++){
  const r=trial(text,mode,chan,cfg,inject);
  const p=r.pk[0];
  if(!p)none++;
  else{fixed+=p.fixed;if(p.ok&&p.text===text)good++;else if(p.ok)wrongAccepted++;else rejected++}
 }
 console.log(('  '+label).padEnd(52),('mode '+mode).padEnd(7),`benar ${good}/${N}`.padEnd(12),`ditolak CRC ${rejected}`.padEnd(15),`tak terdeteksi ${none}`.padEnd(18),wrongAccepted?`!! SALAH LOLOS ${wrongAccepted}`:'',mode?`koreksi ${fixed} bit`:'');
 return {good,rejected,wrongAccepted,none,N};
}

const MSG='PILAR HEBAT 2026';
const N=quick?3:8;
console.log('\n── Roundtrip tanpa kanal (3 mode × 3 laju simbol)');
for(const sym of [30,40,60])for(const m of [0,1,2]){const r=stat('bersih '+sym+' ms/simbol',MSG,m,{snrDb:60,pre:1},2,{symMs:sym});ok(r.good===2,'roundtrip bersih mode '+m+' sym '+sym)}

console.log('\n── Derau & gangguan (mode 2: Hamming+interleave)');
let r;
r=stat('derau putih SNR −10 dB (full-band)',MSG,2,{snrDb:-10},N);ok(r.good===N,'derau −10');
r=stat('derau putih SNR −17 dB',MSG,2,{snrDb:-17},N);
r=stat('babble kelas, 0 dB terhadap sinyal',MSG,2,{snrDb:20,babbleDb:0},N);ok(r.good>=N-1,'babble 0 dB');
r=stat('babble kelas, +6 dB (lebih keras dari sinyal)',MSG,2,{snrDb:20,babbleDb:6},N);
r=stat('fading volume ±40% @0,7 Hz',MSG,2,{snrDb:30,fade:.4},N);ok(r.good===N,'fading 40');
r=stat('fading volume ±70% @0,7 Hz',MSG,2,{snrDb:30,fade:.7},N);ok(r.good>=N-1,'fading 70');
r=stat('gema RT60 0,7 s',MSG,2,{snrDb:30,rt60:.7},N);ok(r.good===N,'rt60 .7');
r=stat('gema RT60 1,5 s',MSG,2,{snrDb:30,rt60:1.5},N);
r=stat('gema RT60 1,5 s, 60 ms/simbol',MSG,2,{snrDb:30,rt60:1.5},N,{symMs:60});
r=stat('selisih clock +400 ppm',MSG,2,{snrDb:30,ppm:400},N);ok(r.good===N,'ppm 400');
r=stat('selisih clock −1500 ppm',MSG,2,{snrDb:30,ppm:-1500},N);
r=stat('nada pengganggu 1000 Hz, 1,5× lebih kuat',MSG,2,{snrDb:30,interf:[{f:1000,a:1.5}]},N);ok(r.good===N,'interf 1000');
r=stat('nada pengganggu di 1900 Hz (=nada-1) 0,3×',MSG,2,{snrDb:30,interf:[{f:1900,a:.3}]},N);
r=stat('klik/impuls 3/dtk, 4× lebih keras',MSG,2,{snrDb:30,clicksPerSec:3,clickAmp:4},N);ok(r.good>=N-1,'klik');
r=stat('sampling RX 44,1 kHz (TX 48 k → resample)',MSG,2,{snrDb:30,ppm:0},N,{sr:44100});ok(r.good===N,'sr 44100');

console.log('\n── Efek koreksi error: gangguan bit buatan (sama persis dengan fitur demo di aplikasi)');
for(const [lab,inj] of [['3 bit acak',{kind:'random',n:3}],['8 bit acak',{kind:'random',n:8}],['burst 6 bit berurutan',{kind:'burst',n:6}],['burst 20 bit berurutan',{kind:'burst',n:20}]]){
 const res=[0,1,2].map(m=>stat(lab,MSG,m,{snrDb:40},N,{},inj));
 if(lab==='3 bit acak'||lab==='burst 6 bit berurutan'){
  ok(res[2].good>=N-1,lab+' harus pulih di mode 2');
  ok(res[0].good===0,lab+' harus gagal CRC di mode 0');
 }
 ok(res.every(x=>x.wrongAccepted===0),lab+': tidak boleh ada paket salah lolos CRC');
}

console.log('\n── Alarm palsu: 3 menit derau murni + babble + nada tunggal (tidak boleh ada paket)');
{
 const sr=48000,len=sr*(quick?30:180),y=new Float32Array(len);
 const bab=[];for(let k=0;k<14;k++)bab.push({f:150+rnd()*3350,p:rnd()*6.28,m:.5+rnd()*5,mp:rnd()*6.28});
 for(let i=0;i<len;i++){const t=i/sr;let v=.003*gauss();for(const b of bab)v+=.01*(.5+.5*Math.sin(2*Math.PI*b.m*t+b.mp))*Math.sin(2*Math.PI*b.f*t+b.p);
  if(i>sr*5)v+=.05*Math.sin(2*Math.PI*1500*t)*(t%3<1.2?1:0)+.05*Math.sin(2*Math.PI*1900*t)*(t%3.7<1?1:0);y[i]=v}
 const {evs,rx}=receive(y,sr,BASE);
 const locks=evs.filter(e=>e.type==='lock').length;
 console.log('  lock palsu:',locks,' paket:',evs.filter(e=>e.type==='packet').length);
 ok(evs.filter(e=>e.type==='packet').length===0,'tidak boleh ada paket dari derau');
 ok(locks<=1,'lock palsu maksimal 1');
}

console.log('\n── Dua paket beruntun + pesan 32 karakter + karakter khusus');
{
 const sr=48000,t1='Halo, Kelas 8A!',t2='ABCDEFGHIJKLMNOPQRSTUVWXYZ012345',gap=new Float32Array(sr*1.5);
 const mk=(t,m)=>F.modulate(F.encodeFrame(t,m).bits,{sr,f0:1500,f1:1900,symMs:40});
 const a=mk(t1,2),b=mk(t2,1);const x=new Float32Array(a.length+gap.length+b.length);x.set(a);x.set(gap,a.length);x.set(b,a.length+gap.length);
 const y=channel(x,sr,{snrDb:25,rt60:.4});
 const {evs}=receive(y,sr,BASE);const pk=evs.filter(e=>e.type==='packet');
 console.log('  paket:',pk.map(p=>p.text+(p.ok?' ✓':' ✗')).join(' | '));
 ok(pk.length===2&&pk[0].ok&&pk[0].text===t1&&pk[1].ok&&pk[1].text===t2,'dua paket beruntun');
}
console.log(fails?`\n✗ ${fails} pemeriksaan gagal`:'\n✓ semua pemeriksaan lolos');
process.exit(fails?1:0);

