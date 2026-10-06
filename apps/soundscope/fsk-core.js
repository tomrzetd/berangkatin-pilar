/* PILAR SoundScope — fsk-core.js
 * Inti DSP + pengkodean untuk skema BFSK (Binary Frequency-Shift Keying) dengan koreksi error.
 * Tidak menyentuh DOM / WebAudio, sehingga dapat diuji di Node:  node apps/soundscope/test/fsk-core.test.js
 *
 * Lapisan (dari atas ke bawah):
 *   teks  →  byte [len, data…, CRC-8]  →  (Hamming 7,4 ± interleaving)  →  bit
 *   bit   →  [preamble 8][sync 16][header][body]  →  nada f0 (bit 0) / f1 (bit 1)  →  udara
 *   udara →  energi Goertzel pada f0 & f1 → d=(E1−E0)/(E1+E0) → korelasi preamble+sync
 *         →  keputusan bit pada pusat simbol → Hamming decode → CRC-8 → teks
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.PilarFsk=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';

const MAXLEN=32;                       // karakter per paket
const MODES=[                          // mode koreksi error (juga dipakai sebagai "sync word" pembeda)
 {id:0,name:'Tanpa koreksi (CRC saja)',short:'CRC saja'},
 {id:1,name:'Hamming(7,4)',short:'Hamming'},
 {id:2,name:'Hamming(7,4) + interleaving',short:'Hamming+interleave'}
];
const PREAMBLE_LEN=8,SYNC_LEN=16,KNOWN_LEN=PREAMBLE_LEN+SYNC_LEN;
// Tiga kata sinkron 16-bit (dicari dengan brute-force: korelasi-silang & sidelobe ≤ 0.375 terhadap preamble 1010…)
const SYNC=[0x406c,0x4c03,0x7090];
const HOP_MS=5;                        // resolusi waktu demodulator
const THR=0.70;                        // ambang korelasi sinkronisasi (0..1)
const GATE=6;                          // energi preamble harus ≥ GATE × noise-floor (≈ 8 dB)

/* ---------- utilitas bit ---------- */
const bitsOf=(v,n)=>{const a=new Array(n);for(let i=0;i<n;i++)a[i]=(v>>(n-1-i))&1;return a};
const byteOf=(b,o)=>{let v=0;for(let i=0;i<8;i++)v=(v<<1)|b[o+i];return v};
function crc8(bytes){let c=0;for(const x of bytes){c^=x&255;for(let i=0;i<8;i++)c=(c&0x80)?(((c<<1)^0x07)&255):((c<<1)&255)}return c}

/* ---------- Hamming(7,4): urutan [p1 p2 d1 p3 d2 d3 d4] ---------- */
function hamEnc(n){
 const d1=(n>>3)&1,d2=(n>>2)&1,d3=(n>>1)&1,d4=n&1;
 return [d1^d2^d4,d1^d3^d4,d1,d2^d3^d4,d2,d3,d4];
}
function hamDec(c){                    // c: 7 bit (boleh ada 1 bit salah) → {n, fixed}
 const s=(c[0]^c[2]^c[4]^c[6])|((c[1]^c[2]^c[5]^c[6])<<1)|((c[3]^c[4]^c[5]^c[6])<<2);
 const x=c.slice();if(s)x[s-1]^=1;
 return {n:(x[2]<<3)|(x[4]<<2)|(x[5]<<1)|x[6],fixed:s?1:0,syndrome:s};
}

/* ---------- pembentukan frame ---------- */
function sanitize(text){
 let t='';for(const ch of String(text||'')){const c=ch.charCodeAt(0);t+=(c>=32&&c<=126)?ch:'?'}
 return t.slice(0,MAXLEN);
}
function encodeFrame(text,mode=2){
 const t=sanitize(text);
 if(!t.length)return null;
 const payload=[...t].map(c=>c.charCodeAt(0));
 const len=payload.length,crc=crc8([len,...payload]);
 const body=[...payload,crc];
 const pre=Array.from({length:PREAMBLE_LEN},(_,i)=>(i+1)&1);
 const sync=bitsOf(SYNC[mode],SYNC_LEN);
 let head,bodyBits,codewords=null;
 if(mode===0){
  head=bitsOf(len,8);
  bodyBits=body.flatMap(b=>bitsOf(b,8));
 }else{
  head=[...hamEnc(len>>4),...hamEnc(len&15)];
  codewords=body.flatMap(b=>[hamEnc(b>>4),hamEnc(b&15)]);
  if(mode===1)bodyBits=codewords.flat();
  else{bodyBits=[];for(let j=0;j<7;j++)for(const w of codewords)bodyBits.push(w[j])}   // kirim kolom demi kolom
 }
 const bits=[...pre,...sync,...head,...bodyBits];
 return {bits,mode,text:t,len,crc,
  layout:{pre:[0,PREAMBLE_LEN],sync:[PREAMBLE_LEN,KNOWN_LEN],head:[KNOWN_LEN,KNOWN_LEN+head.length],body:[KNOWN_LEN+head.length,bits.length]},
  ncw:codewords?codewords.length:0};
}
// Simulasi gangguan: balik bit pada bagian body (preamble/sync/header tidak diganggu agar demo fokus ke koreksi error).
function corruptBits(frame,kind,n,rnd=Math.random){
 const bits=frame.bits.slice(),[a,b]=frame.layout.body,flipped=[];
 if(kind==='random'){
  const pool=[];for(let i=a;i<b;i++)pool.push(i);
  for(let k=0;k<n&&pool.length;k++){const j=Math.floor(rnd()*pool.length);flipped.push(pool.splice(j,1)[0])}
 }else if(kind==='burst'){
  const s=a+Math.floor((b-a-n)*(.25+.5*rnd()));
  for(let i=0;i<n;i++)flipped.push(s+i);
 }
 for(const i of flipped)bits[i]^=1;
 return {bits,flipped};
}
// Sintesis offline (untuk uji): fase kontinu, amplitudo naik/turun halus
function modulate(bits,o){
 const sr=o.sr,S=Math.round(sr*o.symMs/1000),amp=o.amp||.3,lead=Math.round(sr*(o.lead??.3)),tail=Math.round(sr*(o.tail??.4));
 const x=new Float32Array(lead+bits.length*S+tail);let ph=0;
 const ramp=Math.round(sr*.012);
 for(let k=0;k<bits.length;k++){
  const w=2*Math.PI*(bits[k]?o.f1:o.f0)/sr,a=lead+k*S;
  for(let i=0;i<S;i++){
   ph+=w;let g=amp;
   const t=k*S+i,T=bits.length*S;
   if(t<ramp)g*=t/ramp;if(T-t<ramp)g*=(T-t)/ramp;
   x[a+i]=g*Math.sin(ph);
  }
 }
 return x;
}

/* ---------- penerima streaming ---------- */
class Receiver{
 constructor(o){this.o={sr:48000,f0:1500,f1:1900,symMs:40,...o};this.reset()}
 configure(o){Object.assign(this.o,o);this.reset()}
 reset(){
  const {sr,f0,f1,symMs}=this.o;
  this.hopF=sr*HOP_MS/1000;                          // pecahan sampel (44,1 kHz → 220,5) agar tidak drift
  this.sps=Math.max(2,Math.round(symMs/HOP_MS));
  this.N=Math.max(64,Math.round(sr*(symMs-2*HOP_MS)/1000));
  this.hann=new Float32Array(this.N);
  for(let i=0;i<this.N;i++)this.hann[i]=.5-.5*Math.cos(2*Math.PI*i/(this.N-1));
  this.c0=2*Math.cos(2*Math.PI*f0/sr);this.c1=2*Math.cos(2*Math.PI*f1/sr);
  this.ring=new Float32Array(1<<16);this.RM=this.ring.length-1;
  this.total=0;this.h=0;
  this.HM=(1<<14)-1;
  this.D=new Float32Array(this.HM+1);this.E=new Float32Array(this.HM+1);
  this.SC=new Float32Array(this.HM+1);this.VAR=new Uint8Array(this.HM+1);this.OK=new Uint8Array(this.HM+1);
  this.known=SYNC.map(w=>[...Array.from({length:PREAMBLE_LEN},(_,i)=>(i+1)&1),...bitsOf(w,SYNC_LEN)].map(b=>b?1:-1));
  this.floor=0;this.floorInit=false;
  this.state='idle';this.pending=null;this.cool=0;
  this.bits=[];this.live={d:0,e0:0,e1:0,floor:0};
  this.packets=0;this.locks=0;this.lastPacket=null;
 }
 push(x){
  const ev=[];
  for(let o=0;o<x.length;o+=4096){
   const end=Math.min(x.length,o+4096);let t=this.total;
   for(let i=o;i<end;i++){this.ring[t&this.RM]=x[i];t++}
   this.total=t;
   while(Math.floor(this.h*this.hopF)+this.N<=this.total){this._hop(ev);this.h++}
  }
  return ev;
 }
 _hop(ev){
  const {N,hann,ring,RM,c0,c1}=this,s0=Math.floor(this.h*this.hopF);
  let a1=0,a2=0,b1=0,b2=0;
  for(let i=0;i<N;i++){
   const v=ring[(s0+i)&RM]*hann[i];
   let q=v+c0*a1-a2;a2=a1;a1=q;
   q=v+c1*b1-b2;b2=b1;b1=q;
  }
  const p0=Math.max(0,a1*a1+a2*a2-c0*a1*a2),p1=Math.max(0,b1*b1+b2*b2-c1*b1*b2);
  const k=4/N,e0=p0*k*k,e1=p1*k*k,et=e0+e1,d=(e1-e0)/(et+1e-18),hi=this.h&this.HM;
  this.D[hi]=d;this.E[hi]=et;
  // noise-floor: turun cepat, naik lambat, tidak ikut naik saat ada sinyal kuat
  if(!this.floorInit){this.floor=Math.max(et,1e-14);this.floorInit=true}
  else if(this.state==='idle'){
   if(et<this.floor)this.floor+=(et-this.floor)*.1;
   else if(et<this.floor*GATE)this.floor+=(et-this.floor)*.003;
   else this.floor+=(et-this.floor)*.0002;
   if(this.floor<1e-14)this.floor=1e-14;
  }
  const L=this.live;L.d=L.d*.6+d*.4;L.e0=L.e0*.6+e0*.4;L.e1=L.e1*.6+e1*.4;L.floor=this.floor;
  if(this.state==='idle')this._detect(ev);else this._lock(ev);
 }
 _detect(ev){
  const h=this.h,sps=this.sps,HM=this.HM;
  if(h<(KNOWN_LEN-1)*sps+2||h<this.cool)return;
  let gE=0,best=-9,bv=0;
  const s=[0,0,0];
  for(let j=0;j<KNOWN_LEN;j++){
   const idx=(h-(KNOWN_LEN-1-j)*sps)&HM,d=this.D[idx];gE+=this.E[idx];
   for(let v=0;v<3;v++)s[v]+=this.known[v][j]*d;
  }
  gE/=KNOWN_LEN;
  for(let v=0;v<3;v++){const x=s[v]/KNOWN_LEN;if(x>best){best=x;bv=v}}
  const hi=h&HM;
  this.SC[hi]=best;this.VAR[hi]=bv;this.OK[hi]=gE>=this.floor*GATE?1:0;
  if(!this.pending){
   if(best>=THR&&this.OK[hi])this.pending=h;
  }else if(h>=this.pending+3*sps){
   // sidelobe preamble berkala → cari puncak di ±3 simbol di sekitar titik picu
   let bh=-1,bs=-9;
   for(let k=this.pending-3*sps;k<=h;k++){const i=k&HM;if(this.OK[i]&&this.SC[i]>bs){bs=this.SC[i];bh=k}}
   this.pending=null;
   if(bh>=0&&bs>=THR){
    this.base=bh-(KNOWN_LEN-1)*sps;this.mode=this.VAR[bh&HM];this.nextSym=KNOWN_LEN;
    this.bits=[];this.confSum=0;this.phase='head';this.lost=0;this.fixed=0;this.len=0;
    this.bodyStart=0;this.bodyBits=0;this.state='lock';this.locks++;this.lockScore=bs;
    ev.push({type:'lock',mode:this.mode,score:bs});
    this._lock(ev);
   }
  }
 }
 _lock(ev){
  const h=this.h,HM=this.HM,sps=this.sps;
  while(this.base+this.nextSym*sps<=h){
   const d=this.D[(this.base+this.nextSym*sps)&HM];
   this.bits.push(d>0?1:0);this.confSum+=Math.min(1,Math.abs(d));this.nextSym++;
   this._parse(ev);if(this.state!=='lock')return;
  }
  if(this.E[h&HM]<this.floor*3){if(++this.lost>10*sps)this._abort(ev,'sinyal hilang')}else this.lost=0;
 }
 _abort(ev,reason){this.state='idle';this.cool=this.h+Math.round(300/HOP_MS);this.pending=null;ev.push({type:'abort',reason})}
 _parse(ev){
  const b=this.bits,m=this.mode;
  if(this.phase==='head'){
   const need=m===0?8:14;if(b.length<need)return;
   let len;
   if(m===0)len=byteOf(b,0);
   else{const a=hamDec(b.slice(0,7)),c=hamDec(b.slice(7,14));len=(a.n<<4)|c.n;this.fixed+=a.fixed+c.fixed}
   if(len<1||len>MAXLEN){this._abort(ev,'header rusak (panjang='+len+')');return}
   this.len=len;this.bodyStart=need;this.bodyBits=(m===0?8:14)*(len+1);this.phase='body';
   ev.push({type:'header',len,mode:m});
  }
  if(this.phase==='body'&&b.length>=this.bodyStart+this.bodyBits){
   const body=b.slice(this.bodyStart,this.bodyStart+this.bodyBits),len=this.len;let bytes=[],fixed=this.fixed,errPos=[];
   if(m===0){for(let i=0;i<=len;i++)bytes.push(byteOf(body,i*8))}
   else{
    const ncw=2*(len+1),nib=[];
    for(let i=0;i<ncw;i++){
     const w=m===1?body.slice(i*7,i*7+7):Array.from({length:7},(_,j)=>body[j*ncw+i]);
     const r=hamDec(w);nib.push(r.n);fixed+=r.fixed;if(r.fixed)errPos.push(i);
    }
    for(let i=0;i<=len;i++)bytes.push((nib[2*i]<<4)|nib[2*i+1]);
   }
   const payload=bytes.slice(0,len),ok=crc8([len,...payload])===bytes[len];
   const text=payload.map(c=>(c>=32&&c<=126)?String.fromCharCode(c):'□').join('');
   const pk={type:'packet',ok,text,len,mode:m,fixed,codewordsFixed:errPos,
    conf:this.confSum/b.length,bits:b.length+KNOWN_LEN,score:this.lockScore};
   this.packets++;this.lastPacket=pk;
   this.state='idle';this.cool=this.h+Math.round(400/HOP_MS);this.pending=null;
   ev.push(pk);
  }
 }
 snapshot(){
  const total=this.state==='lock'&&this.phase==='body'?this.bodyStart+this.bodyBits:0;
  return {state:this.state,mode:this.mode,phase:this.phase,nbits:this.bits.length,total,
   conf:this.bits.length?this.confSum/this.bits.length:0,fixed:this.fixed||0,live:this.live,
   snrDb:10*Math.log10((this.live.e0+this.live.e1+1e-18)/(this.floor+1e-18)),locks:this.locks,packets:this.packets};
 }
}

return {MAXLEN,MODES,SYNC,PREAMBLE_LEN,SYNC_LEN,KNOWN_LEN,HOP_MS,THR,GATE,
 crc8,hamEnc,hamDec,sanitize,encodeFrame,corruptBits,modulate,Receiver};
});

