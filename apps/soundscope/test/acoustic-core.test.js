/* Uji DSP akustik: node apps/soundscope/test/acoustic-core.test.js  (opsional: WORKLET=/path/worklet.js untuk membandingkan versi) */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const C=require('../acoustic-core.js');const SR=48000;let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('  ✗',m)}else console.log('  ✓',m)};
let seed=7;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)*2-1;
/* 1. Sonar: sapuan jarak x noise */
const chirp=C.makeChirp({sr:SR,durationMs:10,f0:2200,f1:7000,amp:.9});let worst=0,n=0;
for(const noise of [.004,.02,.05])for(let d=.6;d<=5;d+=.37){
 const sim=C.synthEcho({sr:SR,chirp,distanceM:d,tempC:27,noise,echoAmp:.12,baselineM:.25,reflections:2});
 const r=C.analyzeEcho(sim.samples,chirp,{sr:SR,tempC:27,baselineM:.25,maxRangeM:6,minRangeM:.5,searchStartMs:20,searchEndMs:330});
 n++;if(!r.ok){console.log('   miss d=',d.toFixed(2),'noise',noise,r.reason);worst=9;continue}worst=Math.max(worst,Math.abs(r.distanceM-d))}
ok(worst<.02,'Echo Sonar: galat maks '+(worst*100).toFixed(1)+' cm pada '+n+' kasus (0,6–5 m, noise 0,4–5%)');
/* 2. Worklet anchor: bias vs kerasnya poll (walk error) */
function runWorklet(file,pollAmp,dist){
 const src=fs.readFileSync(file,'utf8');let Proc=null;
 const g={sampleRate:SR,AudioWorkletProcessor:class{constructor(){this.port={postMessage(){},onmessage:null}}},registerProcessor:(_,c)=>{Proc=c},Float32Array,Math,Object};
 vm.runInNewContext(src+';',g);const p=new Proc();p.port.postMessage=()=>{};
 p.port.onmessage({data:{type:'responder',enabled:true,config:{pollFreq:1400,replyFreq:2200,delayMs:120,replyMs:24,amp:.26,minAmp:.003}}});
 const T=Math.round(SR*.5/128)*128,inp=new Float32Array(T),out=new Float32Array(T),lead=Math.round(SR*.05),tau=Math.round(SR*dist/343);
 for(let i=0;i<Math.round(SR*.024);i++){const env=Math.min(1,i/144,(1152-i)/144);inp[lead+tau+i]=pollAmp*env*Math.sin(2*Math.PI*1400*i/SR)+.0005*rnd()}
 for(let b=0;b<T;b+=128){const o=new Float32Array(128);p.process([[inp.subarray(b,b+128)]],[[o]]);out.set(o,b)}
 // poller mendengar: poll langsung (t=lead) + balasan setelah perjalanan pulang-pergi
 const rec=new Float32Array(T+Math.round(SR*.2));for(let i=0;i<Math.round(SR*.024);i++){const env=Math.min(1,i/144,(1152-i)/144);rec[lead+i]+=.5*env*Math.sin(2*Math.PI*1400*i/SR)}
 for(let i=0;i<T;i++)if(out[i]!==0&&i+tau<rec.length)rec[i+tau]+=out[i];
 const a=C.detectToneOnset(rec,{sr:SR,freq:1400,winMs:6,hopMs:.5,ratio:.5,consecutive:2}),b=C.detectToneOnset(rec,{sr:SR,freq:2200,winMs:6,hopMs:.5,ratio:.5,consecutive:2});
 if(!a.ok||!b.ok)return NaN;return 343*((b.exact-a.exact)/SR-.12)/2;
}
const files={baru:path.join(__dirname,'..','acoustic-capture-worklet.js')};if(process.env.WORKLET)files.pembanding=process.env.WORKLET;
for(const [name,f] of Object.entries(files)){
 const vals=[.5,.2,.08,.03,.012].map(a=>runWorklet(f,a,1.5));console.log('   worklet '+name+': jarak terukur pada volume poll 0,5→0,012 =',vals.map(v=>v.toFixed(3)).join(', '),'(benar 1,500 + bias tetap)');
 const spread=Math.max(...vals)-Math.min(...vals);ok(name!=='baru'||(spread<.03&&Math.abs(vals[0]-1.5)<.06),'worklet '+name+': sebaran bias antar-volume '+(spread*100).toFixed(1)+' cm'+(name==='baru'?' (<3 cm, bias nominal <6 cm)':''))}
console.log(fails?'\n✗ '+fails+' gagal':'\n✓ semua uji akustik lolos');process.exit(fails?1:0);

