/* Memastikan hasil simulasi tidak bergantung frame rate (IFP Mali-G52 bisa turun ke 20 fps). */
'use strict';
globalThis.window=globalThis;
require('../physics.js');require('../../lorentz/physics.js');
const D=globalThis.PILAR.pressurePhysics.drone,L=globalThis.PILAR.lorentzPhysics;
let fail=0;const ok=(c,m)=>{console.log((c?'ok  ':'GAGAL ')+m);if(!c)fail++};
function droneY(fps){const raw=1/fps,dt=Math.min(.1,raw),s=D.newState('sedang'),p={batt:'sedang',payload:.3,alpha:8,throttle:.62,tilt:0};let t=0;while(t<2-1e-9){D.step(s,p,dt);t+=raw}return s.y}
function lorentzPeak(fps){const raw=1/fps,dt=Math.min(.1,raw);const s={params:{V:3.7,R:2,B:.3,L:.1,mass:.01,length:.22,damping:1.45},circuit:{on:true,targetPolarity:1,actualPolarity:1,batteryRotation:0,batteryRotationTarget:0,currentActual:0,currentTarget:0},dynamics:{alpha:0,omega:0,x:0,fIdeal:0,fieldFactor:1,fEffective:0}};
  let t=0,pk=0,tp=0;while(t<1.5){L.step(s,dt);t+=raw;const a=Math.abs(s.dynamics.alpha);if(a>pk){pk=a;tp=t}}return{pk:pk*180/Math.PI,tp}}
const y60=droneY(60);
for(const f of [30,20,15])ok(Math.abs(droneY(f)-y60)<.15,`drone y(2 s) @${f}fps ≈ @60fps (${droneY(f).toFixed(2)} vs ${y60.toFixed(2)} m)`);
const l60=lorentzPeak(60);
for(const f of [30,20])ok(Math.abs(lorentzPeak(f).tp-l60.tp)<.07&&Math.abs(lorentzPeak(f).pk-l60.pk)<1.5,`lorentz puncak @${f}fps ≈ @60fps (t=${lorentzPeak(f).tp.toFixed(2)} vs ${l60.tp.toFixed(2)} s)`);
console.log(fail?`\n${fail} gagal`:'\nsemua lulus');process.exit(fail?1:0);
