/* PILAR SoundScope v4.5.1 — Sonar DSP Worker */
'use strict';
importScripts('./acoustic-core.js?v=4.5.1');
const C=self.PilarAcousticCore;
function decimate2(x){if(x.length<8)return x;const y=new Float32Array(Math.floor((x.length-4)/2));for(let j=0,i=2;j<y.length;j++,i+=2)y[j]=(x[i-2]+4*x[i-1]+6*x[i]+4*x[i+1]+x[i+2])/16;return y}
self.onmessage=e=>{const m=e.data||{};if(m.type!=='sonar')return;try{let x=m.samples instanceof Float32Array?m.samples:new Float32Array(m.samples),sr=m.sr||48000;if(m.targetRate===24000&&sr>=47000){x=decimate2(x);sr/=2}const ch=m.chirp||{},chirp=C.makeChirp({sr,durationMs:ch.durationMs||10,f0:ch.f0||2200,f1:ch.f1||7000,amp:ch.amp??.9}),r=C.analyzeEcho(x,chirp,{...(m.opt||{}),sr});if(r.correlation){r.correlation.sr=sr;self.postMessage({id:m.id,ok:true,result:r},[r.correlation.values.buffer])}else self.postMessage({id:m.id,ok:true,result:r})}catch(err){self.postMessage({id:m.id,ok:false,error:err?.message||String(err)})}};