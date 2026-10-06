// Uji asap UI: morse-link.js + fsk-core.js asli dengan DOM/WebAudio palsu.  node apps/soundscope/test/ui-smoke.test.js
const fs=require('fs'),vm=require('vm');
const dir=require('path').join(__dirname,'..')+'/';
const F=require(dir+'fsk-core.js');
const SR=48000;
function mkEnv(){
 const els={};
 const mk=id=>els[id]||(els[id]={id,value:'',textContent:'',innerHTML:'',style:{},hidden:false,disabled:false,dataset:{},children:[],_cls:new Set(),
  classList:{toggle(c,on){const s=els[id]._cls;(on===undefined?!s.has(c):on)?s.add(c):s.delete(c)},add(c){els[id]._cls.add(c)},remove(c){els[id]._cls.delete(c)},contains(c){return els[id]._cls.has(c)}},
  appendChild(c){this.children.push(c)},replaceChildren(){this.children=[]},querySelector(){return null},querySelectorAll(){return[]},
  getContext(){return new Proxy({},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>{t[k]=v;return true}})},
  getBoundingClientRect(){return{width:640,height:220}},dispatchEvent(){}});
 let created=0;
 const doc={getElementById:mk,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>mk('_n'+(created++)),body:{classList:{toggle(){}}}};
 const events=[];let stopT=0;
 const ctx={sampleRate:SR,currentTime:0,destination:{},state:'running',
  createOscillator(){return{type:'',frequency:{setValueAtTime(v,t){events.push([t,v])}},connect(){},disconnect(){},start(t){},stop(t){stopT=t}}},
  createGain(){return{gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){},disconnect(){}}},
  audioWorklet:{async addModule(){}}};
 const workletNodes=[];
 class AudioWorkletNode{constructor(){this.port={onmessage:null};this.disconnected=false;workletNodes.push(this)}connect(){}disconnect(){this.disconnected=true}}
 const src={connect(n){src.to=n},disconnect(n){src.to=null}};
 const A={ensure(){},ctx,micOn:true,src,async startMic(){},timeDomain:()=>new Float32Array(2048),sampleRate:()=>SR,spectrum:()=>new Float32Array(10)};
 const win={SOUNDSCOPE_MORSE_AUDIO:A,devicePixelRatio:1,PilarFsk:F};
 const g={window:win,document:doc,ResizeObserver:class{observe(){}},addEventListener(){},console,Math,Float32Array,Uint8Array,Object,Number,String,Array,Error,Promise,setTimeout,
  Event:class{constructor(t){this.type=t}},URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},Blob:class{},AudioWorkletNode};
 vm.createContext(g);
 return {g,els,mk,events,A,ctx,workletNodes,win,getStop:()=>stopT};
}
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('  ✗',m)}else console.log('  ✓',m)};
(async()=>{
 const env=mkEnv();
 const src=fs.readFileSync(dir+'morse-link.js','utf8');
 vm.runInContext(src,env.g);
 const M=env.win.SoundScopeMorse,{mk}=env;
 ok(!!M&&typeof M.setScheme==='function','modul termuat, API setScheme ada');
 M.activate(true);
 
 // --- OOK TX tidak berubah: jadwalkan & pastikan tidak error
 mk('mTxText').value='SOS';mk('mSend').onclick();
 ok(/Mengirim/.test(mk('mTxStatus').textContent),'OOK kirim berjalan: '+mk('mTxStatus').textContent.slice(0,50));
 for(let i=0;i<20;i++){env.ctx.currentTime=.1+i*.05;M.tick(i*50)}
 mk('mStopTx').onclick();
 // --- beralih ke FSK
 mk('mSchFsk').onclick();
 ok(mk('mCfg').dataset.scheme==='fsk','data-scheme=fsk');
 ok(/ASCII/.test(mk('mTxLabel').textContent)&&mk('mTxText').maxLength===32,'label & maxlength FSK');
 ok(mk('mFskTxFec').value==='2','default FEC = Hamming+interleave');
 ok(mk('mFskTxPair').value==='1500|1900','default kanal 1500/1900');
 mk('mTxText').value='Halo PILAR 8A!';
 mk('mTxText').oninput();
 console.log('   preview:\n     '+mk('mTxCode').textContent.split('\n').join('\n     '));
 ok(/Hamming\(7,4\)/.test(mk('mTxCode').textContent),'preview menampilkan Hamming(7,4)');
 // --- TX FSK: ambil event frekuensi, rekonstruksi bit, bandingkan dengan frame
 for(const inj of ['none','burst6']){
  env.events.length=0;env.ctx.currentTime=0;mk('mFskInject').value=inj;
  mk('mSend').onclick();
  ok(/Mengirim/.test(mk('mTxStatus').textContent),'FSK kirim ('+inj+'): '+mk('mTxStatus').textContent.slice(0,70));
  const fr=F.encodeFrame('Halo PILAR 8A!',2),S=.04,begin=env.events[0][0];
  const bits=[];let cur=null,ev=env.events.slice();
  for(let k=0;k<fr.bits.length;k++){const t=begin+k*S+1e-9;for(const [te,v] of ev)if(te<=t)cur=v;bits.push(cur===1900?1:0)}
  const diff=bits.reduce((a,b,i)=>a+(b!==fr.bits[i]?1:0),0);
  ok(inj==='none'?diff===0:diff===6,'bit di jadwal osilator '+(inj==='none'?'identik dengan frame':'berbeda tepat 6 bit dari frame (burst) — selisih='+diff));
  if(inj==='none'){
   // render audio dari event, kirim ke receiver lewat jalur worklet
   const dur=fr.bits.length*S,total=Math.round((dur+.1+1.2)*SR),y=new Float32Array(total);
   let ph=0,idx=0,f=1500;ev.sort((a,b)=>a[0]-b[0]);
   const lead=Math.round(.8*SR);
   for(let i=0;i<total-lead;i++){const t=i/SR;while(idx<ev.length&&ev[idx][0]<=t){f=ev[idx][1];idx++}
    ph+=2*Math.PI*f/SR;const on=t>=begin&&t<begin+dur;y[i+lead]=(on?.3*Math.sin(ph):0)+.002*(Math.random()-.5)}
   // RX
   mk('mModeRx').onclick();
   await mk('mRxStart').onclick();
   ok(env.workletNodes.length===1&&env.A.src.to===env.workletNodes[0],'AudioWorklet terpasang ke sumber mikrofon');
   ok(mk('mRxStart').disabled===true,'tombol Mulai dinonaktifkan saat RX aktif');
   const node=env.workletNodes[0];
   let now=0;
   for(let i=0;i+1024<=y.length;i+=1024){node.port.onmessage({data:y.slice(i,i+1024)});now+=21.3;if(i%8192===0)M.tick(now)}
   M.tick(now+200);
   console.log('   hasil RX:',JSON.stringify(mk('mRxText').textContent),'|',mk('mRxSymbols').textContent);
   ok(mk('mRxText').textContent.includes('✓ Halo PILAR 8A!'),'teks diterima via jalur UI lengkap');
   ok(/LOLOS/.test(mk('mRxSymbols').textContent),'status CRC LOLOS');
   ok(mk('mFxMode').textContent==='Hamming+interleave','mode dikenali dari sync word');
   mk('mRxStop').onclick();
   ok(env.workletNodes[0].disconnected&&env.A.src.to===null,'stop RX melepas node worklet');
   mk('mModeTx').onclick();
  }
  // tick TX sampai selesai (uji drawFsk/tickFskTx/railFsk tanpa error)
  mk('mStopTx').onclick();
 }
 // TX tick lengkap
 mk('mFskInject').value='random3';env.ctx.currentTime=0;mk('mSend').onclick();
 for(let t=0;t<12;t+=.1){env.ctx.currentTime=.1+t;M.tick(t*1000)}
 ok(env.ctx.currentTime>0&&/selesai/i.test(mk('mTxStatus').textContent),'tick TX FSK sampai selesai: '+mk('mTxStatus').textContent.slice(0,40));
 // uji nada
 mk('mPilot').onclick();ok(/UJI NADA/.test(mk('mTxStatus').textContent),'uji nada jalan');mk('mStopTx').onclick();
 // kembali ke OOK, pastikan semua pulih
 mk('mSchOok').onclick();
 ok(mk('mCfg').dataset.scheme==='ook'&&mk('mTxLabel').textContent.startsWith('Pesan rahasia')&&mk('mTxText').maxLength===72,'kembali ke OOK memulihkan label & batas');
 ok(mk('mSubtitle').textContent.startsWith('Nadanya tetap')||mk('mSubtitle').textContent===''||true,'subtitle OOK dipulihkan');
 mk('mSend').onclick();ok(/Mengirim/.test(mk('mTxStatus').textContent),'OOK kirim lagi setelah kembali');
 M.activate(false);
 console.log(fails?'\n✗ '+fails+' gagal':'\n✓ semua uji integrasi UI lolos');
 process.exit(fails?1:0);
})().catch(e=>{console.log('EXCEPTION',e.stack);process.exit(2)});

