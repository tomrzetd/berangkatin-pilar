/* PILAR SoundScope v4.5.1 — capture + sample-clock anchor responder.
 * v4.5: onset BACKTRACKING. Balasan dijadwalkan dari titik 50% amplitudo plateau poll (bukan dari saat ambang terlewati),
 * sehingga turnaround tidak lagi bergantung pada kerasnya poll (jarak) — galat "walk" detektor ambang hilang. */
class PilarAcousticCaptureProcessor extends AudioWorkletProcessor{
 constructor(){super();this.block=new Float32Array(2048);this.fill=0;this.total=0;
  this.r={enabled:false,pollFreq:1000,replyFreq:1800,delayMs:120,replyMs:24,amp:.26,minAmp:.006,compMs:4.9};
  this.i1=0;this.q1=0;this.i2=0;this.q2=0;this.raw=0;this.ph=0;this.above=0;this.armed=true;this.pend=false;this.trigAt=0;this.peak=0;
  this.er=new Float32Array(4096);this.replyAt=-1;this.replyEnd=-1;this.rph=0;
  this.port.onmessage=e=>{const m=e.data||{};if(m.type==='responder'){Object.assign(this.r,m.config||{});this.r.enabled=!!m.enabled;this.armed=true;this.pend=false;this.above=0;this.replyAt=-1;this.port.postMessage({type:'responder-state',enabled:this.r.enabled})}}}
 process(inputs,outputs){const input=inputs[0]&&inputs[0][0],out=outputs[0]&&outputs[0][0];if(out)out.fill(0);
  const N=input?input.length:(out?out.length:128),alpha=Math.exp(-1/(sampleRate*.002)),k=1-alpha,r=this.r;
  for(let n=0;n<N;n++){const x=input?input[n]:0,idx=this.total+n;
   if(input){this.block[this.fill++]=x;if(this.fill===this.block.length){const d=this.block;this.port.postMessage({type:'samples',end:idx+1,data:d},[d.buffer]);this.block=new Float32Array(2048);this.fill=0}}
   if(r.enabled&&input){
    this.ph+=2*Math.PI*r.pollFreq/sampleRate;if(this.ph>6.283185307179586)this.ph-=6.283185307179586;
    const c=Math.cos(this.ph),s=Math.sin(this.ph);
    this.i1=alpha*this.i1+k*x*c;this.q1=alpha*this.q1+k*x*s;this.i2=alpha*this.i2+k*this.i1;this.q2=alpha*this.q2+k*this.q1;this.raw=alpha*this.raw+k*Math.abs(x);
    const amp=2*Math.hypot(this.i2,this.q2);this.er[idx&4095]=amp;
    if(this.armed){const th=Math.max(r.minAmp,this.raw*.8);
     if(amp>th){if(++this.above>=Math.max(16,Math.round(sampleRate*.0015))){this.armed=false;this.pend=true;this.trigAt=idx;this.peak=amp}}else this.above=Math.max(0,this.above-2)}
    else if(this.pend){if(amp>this.peak)this.peak=amp;
     if(idx>=this.trigAt+Math.round(sampleRate*.012)){this.pend=false;const tg=.5*this.peak;let onset=this.trigAt;
      for(let i=this.trigAt-Math.round(sampleRate*.012);i<=idx;i++){const e1=this.er[i&4095];if(e1>=tg){const e0=this.er[(i-1)&4095];onset=e1>e0?i-1+(tg-e0)/(e1-e0):i;break}}
      const delay=Math.round(sampleRate*r.delayMs/1000),dur=Math.round(sampleRate*r.replyMs/1000);
      this.replyAt=Math.round(onset)+delay-Math.round(sampleRate*(r.compMs||0)/1000);this.replyEnd=this.replyAt+dur;this.rph=0;
      this.port.postMessage({type:'anchor-trigger',at:idx,onset,amp:this.peak,pollFreq:r.pollFreq,replyAt:this.replyAt})}}
    else if(idx>this.replyEnd+Math.round(sampleRate*.18)){this.armed=true;this.above=0;this.port.postMessage({type:'anchor-rearmed'})}}
   if(out&&r.enabled&&idx>=this.replyAt&&idx<this.replyEnd){const j=idx-this.replyAt,len=this.replyEnd-this.replyAt,ramp=Math.max(1,Math.round(sampleRate*.003)),env=Math.max(0,Math.min(1,j/ramp,(len-j)/ramp));this.rph+=2*Math.PI*r.replyFreq/sampleRate;out[n]=r.amp*env*Math.sin(this.rph)}}
  this.total+=N;return true}
}
registerProcessor('pilar-acoustic-capture',PilarAcousticCaptureProcessor);
