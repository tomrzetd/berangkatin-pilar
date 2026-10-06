/* PILAR SoundScope v4.3.0 — shared microphone sample engine for Acoustic Physics */
(function(){
'use strict';
const A=window.SOUNDSCOPE_MORSE_AUDIO;if(!A)return;
class AcousticEngine{
 constructor(){this.ctx=null;this.node=null;this.sink=null;this.source=null;this.ready=false;this.loading=null;this.sr=48000;this.ring=new Float32Array(1<<18);this.mask=this.ring.length-1;this.last=0;this.first=0}
 async ensure(){
  A.ensure();this.ctx=A.ctx;this.sr=this.ctx.sampleRate||48000;if(!A.micOn)await A.startMic();if(!A.micOn||!A.src)throw Error('Mikrofon belum aktif');
  if(this.ready&&this.source===A.src)return this;await this.detach();
  if(!this.loading)this.loading=this.ctx.audioWorklet.addModule('./acoustic-capture-worklet.js?v=4.3.0');await this.loading;
  this.node=new AudioWorkletNode(this.ctx,'pilar-acoustic-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
  this.sink=this.ctx.createGain();this.sink.gain.value=0;this.node.connect(this.sink);this.sink.connect(this.ctx.destination);A.src.connect(this.node);this.source=A.src;
  this.last=0;this.first=0;this.ring.fill(0);
  this.node.port.onmessage=e=>{const m=e.data;if(!m||m.type!=='samples'||!m.data)return;const x=m.data,end=m.end,start=end-x.length;for(let i=0;i<x.length;i++)this.ring[(start+i)&this.mask]=x[i];this.last=end;this.first=Math.max(0,this.last-this.ring.length)};
  this.ready=true;return this;
 }
 mark(){return this.last}
 slice(a,b){a=Math.max(this.first,Math.floor(a));b=Math.min(this.last,Math.floor(b));if(b<=a)return new Float32Array(0);const out=new Float32Array(b-a);for(let i=0;i<out.length;i++)out[i]=this.ring[(a+i)&this.mask];return out}
 async play(samples,amp=.28,leadMs=70){await this.ensure();const buf=this.ctx.createBuffer(1,samples.length,this.sr);buf.copyToChannel(samples,0);const src=this.ctx.createBufferSource(),g=this.ctx.createGain();g.gain.value=amp;src.buffer=buf;src.connect(g);g.connect(this.ctx.destination);const when=this.ctx.currentTime+leadMs/1000;src.start(when);return {source:src,when,leadMs}}
 async detach(){if(this.source&&this.node){try{this.source.disconnect(this.node)}catch(_){}}if(this.node){try{this.node.disconnect()}catch(_){}}if(this.sink){try{this.sink.disconnect()}catch(_){}}this.node=null;this.sink=null;this.source=null;this.ready=false}
}
window.PilarAcousticEngine=new AcousticEngine();
})();
