/* PILAR SoundScope v4.5.1 — Acoustic Physics DSP + ranging + localization core.
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
 const sr=o.sr||48000,durMs=o.durationMs||6,f0=o.f0||2500,f1=o.f1||6000,amp=o.amp??0.8,ph0=o.phase||0;
 const N=Math.max(64,Math.round(sr*durMs/1000)),x=new Float32Array(N),T=N/sr,k=(f1-f0)/T;
 for(let n=0;n<N;n++){const t=n/sr,ph=2*Math.PI*(f0*t+.5*k*t*t),w=.5-.5*Math.cos(2*Math.PI*n/Math.max(1,N-1));x[n]=amp*w*Math.sin(ph+ph0)}
 x.meta={sr,durationMs:durMs,f0,f1,amp};return x;
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
const median=a=>{if(!a.length)return 0;const s=Array.from(a).sort((x,y)=>x-y);return s[s.length>>1]};
function chirpQuad(chirp){if(chirp._q)return chirp._q;const m=chirp.meta;return chirp._q=m?makeChirp({...m,phase:-Math.PI/2}):chirp}
/* Matched filter kuadratur (I/Q), LINEAR: keluaran = amplitudo salinan chirp. Envelope tidak berosilasi mengikuti carrier
 * (bebas jitter 1/4 siklus) dan gema yang tumpang-tindih dengan bunyi langsung tetap terpisah (superposisi, bukan normalisasi energi lokal). */
function correlationEnv(signal,tpl,tq,start=0,end=signal.length){
 const M=tpl.length,s0=Math.max(0,start),last=Math.min(signal.length-M+1,end),N=Math.max(0,last-s0),out=new Float32Array(N);
 let et=1e-12;for(let j=0;j<M;j++)et+=tpl[j]*tpl[j];
 for(let q=0;q<N;q++){const i=s0+q;let a=0,b=0;for(let j=0;j<M;j++){const v=signal[i+j];a+=v*tpl[j];b+=v*tq[j]}out[q]=Math.hypot(a,b)/et}
 return {values:out,offset:s0};
}
function refinePeak(c,p){const a=c.values,k=p.i-c.offset;if(k<=0||k>=a.length-1)return 0;const d=a[k-1]-2*a[k]+a[k+1];return Math.abs(d)>1e-9?clamp(.5*(a[k-1]-a[k+1])/d,-.5,.5):0}
function analyzeEcho(signal,chirp,o={}){
 const sr=o.sr||48000,tempC=o.tempC??27,c=speedOfSound(tempC),baselineM=Math.max(0,o.baselineM||0);
 const maxRangeM=o.maxRangeM||5,minRangeM=o.minRangeM||.45,startMs=o.searchStartMs??25,endMs=o.searchEndMs??260;
 const cor=correlationEnv(signal,chirp,chirpQuad(chirp),Math.round(sr*startMs/1000),Math.min(signal.length,Math.round(sr*endMs/1000)));
 let max=0;for(const v of cor.values)if(v>max)max=v;const floor=median(cor.values);
 const k=o.cfar??4.5,peaks=localPeaks(cor,Math.max(8,Math.round(sr*.0007)),Math.max(1e-6,floor*k));
 for(const p of peaks)p.f=refinePeak(cor,p);
 if(!peaks.length)return {ok:false,reason:'chirp langsung tidak ditemukan',correlation:cor,peaks,c,tempC,floor};
 const strong=max*.55,direct=peaks.find(p=>p.v>=strong)||peaks[0];
 if(direct.v<Math.max(1e-6,floor*(o.directCfar??8)))return {ok:false,reason:'chirp langsung belum cukup kuat',correlation:cor,peaks,c,tempC,floor};
 const minDs=Math.round(excessFromRange(minRangeM,baselineM)/c*sr),maxDs=Math.round(excessFromRange(maxRangeM,baselineM)/c*sr);
 const candidates=peaks.filter(p=>p.i>=direct.i+minDs&&p.i<=direct.i+maxDs);
 if(!candidates.length)return {ok:false,reason:'gema dalam jangkauan belum ditemukan',direct,correlation:cor,peaks,c,tempC,floor};
 // Gema valid pertama yang cukup kuat dibanding kandidat terbaik: puncak noise kecil di depan tidak menang, pantulan sekunder tidak menang.
 const best=candidates.reduce((m,p)=>p.v>m.v?p:m,candidates[0]),echo=candidates.find(p=>p.v>=.5*best.v);
 const snr=echo.v/Math.max(floor,1e-6);
 if(snr<k)return {ok:false,reason:'gema terlalu lemah / tenggelam noise (SNR '+snr.toFixed(1)+'×)',direct,echo,correlation:cor,peaks,c,tempC,floor};
 const dt=((echo.i+echo.f)-(direct.i+direct.f))/sr,excessM=c*dt,distanceM=rangeFromExcess(excessM,baselineM);
 const confidence=clamp((snr-k)/12,0,1)*clamp(direct.v/Math.max(floor,1e-9)/25,0,1);
 return {ok:true,distanceM,dt,excessM,confidence,snr,floor,direct,echo,candidates,correlation:cor,peaks,c,tempC,baselineM};
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

function goertzelPower(signal,sr,freq,start=0,end=signal.length){
 start=Math.max(0,start|0);end=Math.min(signal.length,end|0);const N=end-start;if(N<32||freq<=0||freq>=sr/2)return 0;
 const c=2*Math.cos(2*Math.PI*freq/sr);let q1=0,q2=0;
 for(let i=start;i<end;i++){const n=i-start,w=.5-.5*Math.cos(2*Math.PI*n/Math.max(1,N-1)),q=signal[i]*w+c*q1-q2;q2=q1;q1=q}
 return Math.max(0,q1*q1+q2*q2-c*q1*q2);
}
function estimateTone(signal,o={}){
 const sr=o.sr||48000,center=o.center||2000,span=o.span??35,step=o.step??1;if(!signal||signal.length<256)return {ok:false,reason:'sampel kurang'};
 const fs=[];for(let f=center-span;f<=center+span+1e-9;f+=step)fs.push(f);const p=fs.map(f=>goertzelPower(signal,sr,f));let bi=0;for(let i=1;i<p.length;i++)if(p[i]>p[bi])bi=i;
 if(bi<=0||bi>=p.length-1)return {ok:false,reason:'puncak di tepi pencarian',freq:fs[bi]};
 const a=Math.log(p[bi-1]+1e-18),b=Math.log(p[bi]+1e-18),c=Math.log(p[bi+1]+1e-18),den=a-2*b+c,frac=Math.abs(den)>1e-9?.5*(a-c)/den:0,freq=fs[bi]+Math.max(-1,Math.min(1,frac))*step;
 const sorted=p.slice().sort((x,y)=>x-y),noise=sorted[Math.floor(sorted.length*.45)]+1e-18,snrDb=10*Math.log10((p[bi]+1e-18)/noise);
 return {ok:snrDb>(o.minSnrDb??6),freq,power:p[bi],snrDb};
}
function dopplerVelocity(observedHz,baselineHz,tempC=27){const f0=Math.max(1,baselineHz),c=speedOfSound(tempC);return {velocity:c*(observedHz-f0)/f0,shiftHz:observedHz-f0,c}}
function toneEnvelope(signal,o={}){
 const sr=o.sr||48000,freq=o.freq||1000,win=Math.max(64,Math.round(sr*(o.winMs??8)/1000)),hop=Math.max(1,Math.round(sr*(o.hopMs??1)/1000)),values=[],indices=[];
 for(let s=Math.max(0,o.start||0);s+win<=Math.min(signal.length,o.end??signal.length);s+=hop){values.push(Math.sqrt(goertzelPower(signal,sr,freq,s,s+win))/win);indices.push(s+Math.floor(win/2))}
 return {values:Float32Array.from(values),indices:Int32Array.from(indices),win,hop,freq};
}
function detectToneOnset(signal,o={}){
 const e=toneEnvelope(signal,o),a=e.values;if(!a.length)return {ok:false,reason:'tidak ada window'};let peak=0;for(const v of a)if(v>peak)peak=v;
 const th=Math.max(o.minAmp??1e-5,peak*(o.ratio??.42)),need=o.consecutive??2;let run=0,at=-1;for(let i=0;i<a.length;i++){if(a[i]>=th){if(++run>=need){at=i-need+1;break}}else run=0}
 if(at<0)return {ok:false,peak,threshold:th,envelope:e,reason:'burst tidak ditemukan'};
 let exact=e.indices[at];if(at>0&&a[at]>a[at-1])exact=e.indices[at-1]+clamp((th-a[at-1])/(a[at]-a[at-1]),0,1)*(e.indices[at]-e.indices[at-1]);
 return {ok:true,index:e.indices[at],exact,peak,threshold:th,envelope:e,confidence:Math.max(0,Math.min(1,(peak-th)/(peak+1e-12)))};
}
function rangeFromRoundTrip(dtSec,turnaroundMs,tempC=27,biasM=0){const travel=Math.max(0,dtSec-Math.max(0,turnaroundMs)/1000),raw=speedOfSound(tempC)*travel/2;return {rawM:raw,distanceM:Math.max(0,raw-(biasM||0)),travelSec:travel,c:speedOfSound(tempC)}}
function trilaterate(anchors,o={}){
 const pts=(anchors||[]).filter(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(a.r)&&a.r>0);if(pts.length<3)return {ok:false,reason:'butuh minimal 3 anchor'};
 let x=pts.reduce((s,a)=>s+a.x,0)/pts.length,y=pts.reduce((s,a)=>s+a.y,0)/pts.length;
 for(let it=0;it<(o.iterations||18);it++){let A=0,B=0,Cc=0,D=0,Ev=0;for(const a of pts){const dx=x-a.x,dy=y-a.y,d=Math.max(1e-6,Math.hypot(dx,dy)),res=d-a.r,w=Math.max(.05,a.w??1),jx=dx/d,jy=dy/d;A+=w*jx*jx;B+=w*jx*jy;Cc+=w*jy*jy;D+=w*jx*res;Ev+=w*jy*res}const det=A*Cc-B*B;if(Math.abs(det)<1e-10)break;const sx=(Cc*D-B*Ev)/det,sy=(-B*D+A*Ev)/det;x-=sx;y-=sy;if(Math.hypot(sx,sy)<1e-6)break}
 const residuals=pts.map(a=>{const model=Math.hypot(x-a.x,y-a.y);return {id:a.id||'',measured:a.r,model,residual:model-a.r}}),rms=Math.sqrt(residuals.reduce((s,r)=>s+r.residual*r.residual,0)/residuals.length),spread=Math.sqrt(pts.reduce((s,a)=>s+(a.x-x)*(a.x-x)+(a.y-y)*(a.y-y),0)/pts.length);
 return {ok:true,x,y,rms,uncertainty:Math.max(.03,rms*1.8+.02/(spread+.1)),residuals,n:pts.length};
}
function synthTone(o={}){const sr=o.sr||48000,f=o.freq||2000,seconds=o.seconds||.15,amp=o.amp??.3,N=Math.round(sr*seconds),x=new Float32Array(N);let seed=987654321;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)*2-1;for(let i=0;i<N;i++)x[i]=amp*Math.sin(2*Math.PI*f*i/sr)+(o.noise??.004)*rnd();return x}

return {speedOfSound,makeChirp,chirpQuad,correlationEnv,median,correlation,localPeaks,rangeFromExcess,excessFromRange,analyzeEcho,synthEcho,goertzelPower,estimateTone,dopplerVelocity,toneEnvelope,detectToneOnset,rangeFromRoundTrip,trilaterate,synthTone};
});
