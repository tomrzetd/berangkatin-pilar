const assert=require('assert');
global.window=undefined;
require('../physics.js');
const P=globalThis.PILAR.pressurePhysics;
let n=0;const t=(name,fn)=>{fn();n++;console.log('ok  '+name)};

t('padat: P=F/A, tekanan makin besar jika luas mengecil',()=>{
  const a=P.solid.calc({obj:'balok',orient:'tidur',mass:5,surface:'pasir'});
  const b=P.solid.calc({obj:'balok',orient:'berdiri',mass:5,surface:'pasir'});
  assert(Math.abs(a.F-b.F)<1e-9);assert(Math.abs(b.P/a.P-4)<1e-9);assert(b.depth>a.depth);
});
t('padat: kedalaman monoton terhadap P dan terbatas',()=>{
  let prev=-1;for(const P_ of [1e2,1e3,1e4,1e5,1e6,1e8]){const d=P.solid.sinkDepth(P_,40e3,1);assert(d>=prev&&d<=P.solid.DMAX+1e-12);prev=d}
});
t('padat: permukaan lunak amblas lebih dalam',()=>{
  const s=P.solid.calc({obj:'sepatu',orient:'datar2',mass:45,surface:'salju'}),k=P.solid.calc({obj:'sepatu',orient:'datar2',mass:45,surface:'tanah'});
  assert(s.depth>k.depth);
});
t('padat: hak runcing vs sepatu datar ≥ 100× tekanan (bukti PILAR)',()=>{
  const f=P.solid.calc({obj:'sepatu',orient:'datar2',mass:45,surface:'pasir'}),h=P.solid.calc({obj:'sepatu',orient:'hak',mass:45,surface:'pasir'});
  assert(h.P/f.P>=100);
});
t('padat: minAreaForDepth konsisten dengan sinkDepth',()=>{
  const F=60*P.G,A=P.solid.minAreaForDepth(F,10e3,.02);
  assert(Math.abs(P.solid.sinkDepth(F/A,10e3,1)-.02)<1e-9);
  assert(A*1e4>2000&&A*1e4<3000); // jendela rekayasa sepatu salju (cm²)
});
t('cair: p=ρgh, linier terhadap h, 3× kedalaman → 3× tekanan hidrostatis',()=>{
  const f1=P.fluid.calc({fluid:'tawar',depth:1,width:8}),f3=P.fluid.calc({fluid:'tawar',depth:3,width:8});
  assert(Math.abs(f3.ph/f1.ph-3)<1e-9);assert(f3.ptot/f1.ptot<3);
});
t('cair: tidak bergantung lebar kolam',()=>{
  const a=P.fluid.calc({fluid:'laut',depth:2,width:4}),b=P.fluid.calc({fluid:'laut',depth:2,width:12});
  assert(a.ph===b.ph);assert(b.Fwall>a.Fwall);
});
t('cair: target 20 kPa dicapai pada kedalaman berbeda untuk fluida berbeda',()=>{
  const hs=['tawar','laut','minyak'].map(k=>P.fluid.depthFor(P.fluid.FLUIDS[k].rho,20e3));
  assert(hs[1]<hs[0]&&hs[2]>hs[0]);
});
t('cair: zonasi — batas aman & jendela efisien',()=>{
  const rho=1000;const z=P.fluid.zoneCheck(rho,[1.1,1.9,3.3]);assert(z.every(x=>x.ok));
  const bad=P.fluid.zoneCheck(rho,[1.5,1.9,3.3]);assert(!bad[0].safe);
});
t('pascal: F2/F1=A2/A1 dan P sama',()=>{
  const c=P.pascal.calc({F1:100,A1:2,A2:200,car:'sedan'});
  assert(Math.abs(c.F2/100-100)<1e-9);assert(Math.abs(c.P-100/2e-4)<1e-6);
});
t('pascal: katup pengaman membatasi tekanan',()=>{
  const c=P.pascal.calc({F1:500,A1:1,A2:400,car:'truk'});assert(c.relief&&c.P===P.pascal.PMAX);
});
t('pascal: konservasi energi (usaha masuk = usaha keluar)',()=>{
  const c=P.pascal.calc({F1:300,A1:5,A2:150,car:'sedan'});
  const strokes=1.0/c.rise;const Win=P.pascal.workIn(c.W/c.ratio,strokes),Wout=P.pascal.workOut(c.W,1.0);
  assert(Math.abs(Win-Wout)/Wout<1e-9);
});
t('pascal: bukti SUV 1800 kg dengan F1≤150 N butuh rasio luas ≥ ~118',()=>{
  const c=P.pascal.calc({F1:150,A1:1.5,A2:200,car:'suv'});assert(c.canLift&&c.F2>=c.W);
  const d=P.pascal.calc({F1:150,A1:2,A2:200,car:'suv'});assert(!d.canLift); // rasio 100 belum cukup
  assert(Math.abs(P.pascal.calc({F1:1,A1:1,A2:1,car:'suv'}).Fneed-17658)<1);
});
t('pascal: jendela rekayasa (sedan 1200 kg, F≤500 N, ≤150 langkah)',()=>{
  const ok=P.pascal.design(5,150,'sedan',500,1.2);assert(ok.Fneed<=500&&ok.strokes<=150&&ok.Pneed<=P.pascal.PMAX);
  const tooFew=P.pascal.design(5,50,'sedan',500,1.2);assert(tooFew.Fneed>500);
  const tooMany=P.pascal.design(1,200,'sedan',500,1.2);assert(tooMany.strokes>150);
});
t('drone: CL naik lalu stall',()=>{
  const d=P.drone;assert(d.CL(8)>d.CL(2));assert(d.CL(14)>d.CL(8));assert(d.CL(22)<d.CL(14));
});
t('drone: Bernoulli — Δp·luas konsisten dengan ½ρv²·CL',()=>{
  const d=P.drone,v=50,a=8,{top,bottom}=d.airfoilSpeeds(v,a);
  const dp=d.bernoulliDp(1.2,top,bottom);assert(Math.abs(dp-.5*1.2*v*v*d.CL(a))<1e-6);assert(top>bottom);
});
t('drone: gaya angkat ∝ RPM² (2× RPM → 4× gaya)',()=>{
  const d=P.drone;assert(Math.abs(d.thrustRotor(4000,8)/d.thrustRotor(2000,8)-4)<1e-9);
});
t('drone: hover tercapai pada throttle hitung',()=>{
  const d=P.drone,p={batt:'sedang',payload:0,alpha:8,throttle:0,tilt:0};
  const m=d.mass(p.batt,p.payload);p.throttle=d.hoverThrottle(m,p.alpha);
  const s=d.newState('sedang');s.rpm=p.throttle*d.BL.rpmMax;
  const Tr=4*d.thrustRotor(s.rpm,p.alpha);assert(Math.abs(Tr-m*P.G)<1e-6);
});
t('drone: lepas landas, melayang, dan jatuh bila motor mati',()=>{
  const d=P.drone,p={batt:'sedang',payload:0,alpha:8,throttle:.9,tilt:0},s=d.newState('sedang');
  for(let i=0;i<300;i++)d.step(s,p,1/60);assert(s.y>.5,'naik');
  p.throttle=0;for(let i=0;i<600;i++)d.step(s,p,1/60);assert(s.y===0,'mendarat');
});
t('drone: miring → bergerak horizontal',()=>{
  const d=P.drone,p={batt:'sedang',payload:0,alpha:8,throttle:.7,tilt:15},s=d.newState('sedang');
  for(let i=0;i<300;i++){p.throttle=Math.min(.7,p.throttle);d.step(s,p,1/60)}assert(s.x>.3);
});
t('drone: jendela rekayasa (payload 0,6 kg + baterai sedang/besar lolos, kecil gagal)',()=>{
  const d=P.drone;
  const med=d.design({batt:'sedang',payload:.6,alpha:8}),sm=d.design({batt:'kecil',payload:.6,alpha:8}),lg=d.design({batt:'besar',payload:.6,alpha:8});
  assert(med.minutes>=8&&med.twr>=1.8&&med.hoverThrottle<=.75);assert(sm.minutes<8);assert(lg.minutes>=8);
});
t('drone: sudut 3° terlalu kecil untuk membawa payload (T/W < 1.8)',()=>{
  assert(P.drone.design({batt:'sedang',payload:.6,alpha:3}).twr<1.8);
});
console.log('\n'+n+' tes lulus');

