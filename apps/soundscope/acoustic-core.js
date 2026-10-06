/* PILAR SoundScope v4.3.0 — Acoustic Physics pure DSP core.
 * Browser + Node compatible. Stage 1: Echo Sonar.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.PilarAcousticCore=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function speedOfSound(tempC){return 331+0.6*clamp(Number(tempC)||20,-10,60)}
function makeChirp(o={}){
 const sr=o.sr||48000,durMs=o.durationMs||14,f0=o.f0||2500,f1=o.f1||6000,amp=o.amp??0.8;
 const N=Math.max(64,Math.round(sr*durMs/1000)),x=new Float32Array(N),T=N/sr,k=(f1-f0)/T;
 for(let n=0;n<N;n++){const t=n/sr,ph=2*Math.PI*(f0*t+.5*k*t*t),w=.5-.5*Math.cos(2*Math.PI*n/Math.max(1,N-1));x[n]=amp*w*Math.sin(ph)}
 return x;
}
function correlation(signal,tpl,start=0,end=signal.length){
 const M=tpl.length,s0=Math.max(0,start),last=Math.min(signal.length-M+1,end),N=Math.max(0,last-s0),out=new Float32Array(N);
 let et=0;for(let j=0;j<M;j++)et+=tpl[j]*tpl[j];et=Math.max(et,1e-12);
 for(let q=0;q<N;q++){const i=s0+q;let dot=0,es=0;for(let j=0;j<M;j++){const v=signal[i+j];dot+=v*tpl[j];es+=v*v}out[q]=Math.abs(dot)/Math.sqrt(et*Math.max(es,1e-12))}
 return {values:out,offset:s0};
}
function localPeaks(c,minSep=24,threshold=.15){
 const a=c.values,p=[];for(let i=1;i<a.length-1;i++)if(a[i]>=threshold&&a[i]>=a[i-1]&&a[i]>a[i+1])p.push({i:c.offset+i,v:a[i]});
 p.sort((x,y)=>y.v-x.v);const keep=[];for(const q of p)if(keep.every(k=>Math.abs(k.i-q.i)>=minSep))keep.push(q);
 return keep.sort((x,y)=>x.i-y.i);
}
function rangeFromExcess(excessM,baselineM=0){const L=Math.max(0,excessM),b=Math.max(0,baselineM);return .5*Math.sqrt(Math.max(0,(L+b)*(L+b)-b*b))}
function excessFromRange(rangeM,baselineM=0){const d=Math.max(0,rangeM),b=Math.max(0,baselineM);return Math.sqrt(b*b+4*d*d)-b}
function analyzeEcho(signal,chirp,o={}){
 const sr=o.sr||48000,tempC=o.tempC??27,c=speedOfSound(tempC),baselineM=Math.max(0,o.baselineM||0);
 const maxRangeM=o.maxRangeM||5,minRangeM=o.minRangeM||.45,startMs=o.searchStartMs??25,endMs=o.searchEndMs??260;
 const cor=correlation(signal,chirp,Math.round(sr*startMs/1000),Math.min(signal.length,Math.round(sr*endMs/1000)));
 let max=0;for(const v of cor.values)if(v>max)max=v;
 const peaks=localPeaks(cor,Math.max(8,Math.round(sr*.0007)),Math.max(o.threshold??.16,max*.42));
 if(!peaks.length)return {ok:false,reason:'chirp langsung tidak ditemukan',correlation:cor,peaks,c,tempC};
 const strong=Math.max(.18,max*.55),direct=peaks.find(p=>p.v>=strong)||peaks[0];
 const minDs=Math.round(excessFromRange(minRangeM,baselineM)/c*sr),maxDs=Math.round(excessFromRange(maxRangeM,baselineM)/c*sr);
 const candidates=peaks.filter(p=>p.i>=direct.i+minDs&&p.i<=direct.i+maxDs);
 if(!candidates.length)return {ok:false,reason:'gema dalam jangkauan belum ditemukan',direct,correlation:cor,peaks,c,tempC};
 // Sonar v1 reports the nearest valid reflector. Normalized correlation intentionally ignores amplitude,
 // so choosing the strongest later peak can jump to a cleaner secondary reflection.
 const echo=candidates[0];
 if(echo.v<Math.max(.105,direct.v*.10))return {ok:false,reason:'gema terlalu lemah',direct,echo,correlation:cor,peaks,c,tempC};
 const dt=(echo.i-direct.i)/sr,excessM=c*dt,distanceM=rangeFromExcess(excessM,baselineM);
 const confidence=clamp((echo.v-.10)/.55,0,1)*clamp(direct.v/.65,0,1);
 return {ok:true,distanceM,dt,excessM,confidence,direct,echo,correlation:cor,peaks,c,tempC,baselineM};
}
function synthEcho(o={}){
 const sr=o.sr||48000,tempC=o.tempC??27,c=speedOfSound(tempC),baselineM=Math.max(0,o.baselineM||0),chirp=o.chirp||makeChirp({sr});
 const direct=Math.round(sr*(o.directDelayMs??70)/1000),extra=Math.round(sr*excessFromRange(o.distanceM??2,baselineM)/c);
 const tail=Math.round(sr*((o.tailMs??90)/1000)),N=direct+extra+chirp.length+tail,y=new Float32Array(N),da=o.directAmp??.7,ea=o.echoAmp??.30;
 for(let i=0;i<chirp.length;i++){y[direct+i]+=chirp[i]*da;y[direct+extra+i]+=chirp[i]*ea}
 const refl=o.reflections??2;for(let r=1;r<=refl;r++){const off=direct+extra+Math.round(sr*(.004+.006*r)),a=ea*Math.pow(.36,r);for(let i=0;i<chirp.length&&off+i<N;i++)y[off+i]+=chirp[i]*a}
 let seed=123456789;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)*2-1,noise=o.noise??.004;
 for(let i=0;i<N;i++)y[i]+=noise*rnd();
 return {samples:y,chirp,directIndex:direct,echoIndex:direct+extra,c,tempC,distanceM:o.distanceM??2,baselineM};
}
return {speedOfSound,makeChirp,correlation,localPeaks,rangeFromExcess,excessFromRange,analyzeEcho,synthEcho};
});
