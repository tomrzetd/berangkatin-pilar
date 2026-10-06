/* PILAR SoundScope v4.3.0 — microphone sample capture worklet */
class PilarAcousticCaptureProcessor extends AudioWorkletProcessor{
 constructor(){super();this.block=new Float32Array(2048);this.fill=0;this.total=0}
 process(inputs,outputs){
  const input=inputs[0]&&inputs[0][0],out=outputs[0]&&outputs[0][0];if(out)out.fill(0);if(!input)return true;
  let p=0;while(p<input.length){const n=Math.min(this.block.length-this.fill,input.length-p);this.block.set(input.subarray(p,p+n),this.fill);this.fill+=n;p+=n;this.total+=n;
   if(this.fill===this.block.length){const data=this.block;this.port.postMessage({type:'samples',end:this.total,data},[data.buffer]);this.block=new Float32Array(2048);this.fill=0}}
  return true;
 }
}
registerProcessor('pilar-acoustic-capture',PilarAcousticCaptureProcessor);
