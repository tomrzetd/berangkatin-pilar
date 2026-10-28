/* PILAR · Lab Baterai — model sederhana (bisa diuji di Node: node apps/baterai-lab/test-model.js)
   Disederhanakan untuk SMP, tetapi arah & orde besarnya mengikuti baterai lithium-ion nyata:
   - Cas dua tahap: arus besar (CC) sampai ±80%, lalu makin pelan (CV) sampai penuh.
   - Panas sebanding kuadrat arus (I²R) dan dibuang oleh pendingin.
   - BMS (otak baterai) memperlambat cas saat terlalu panas atau dingin.
   - Penuaan lebih cepat bila arus besar, panas, atau cas cepat saat dingin (lithium plating). */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.BateraiModel=f()})(typeof self!=='undefined'?self:this,function(){
'use strict';
const COOL={none:1,sink:.55,liquid:.3};
const DEV={
 hp:{name:'HP',icon:'📱',capWh:19,Cmax:4,chargers:[5,10,25,45,65,120],unit:'W',defCool:'none',fmtP:p=>p+' W'},
 ev:{name:'Mobil listrik',icon:'🚗',capWh:60000,Cmax:2.7,chargers:[2300,7000,22000,50000,150000,350000],unit:'kW',defCool:'liquid',fmtP:p=>(p/1000).toString().replace('.',',')+' kW'}
};
/* Simulasi satu sesi cas. P = daya charger (W). Mengembalikan lintasan + ringkasan. */
function charge(o){
 const D=DEV[o.dev],cap=D.capWh,P=o.P,Tamb=o.Tamb,cool=COOL[o.cool]||1,dt=o.dt||.25;
 let soc=o.soc0==null?.1:o.soc0,T=Tamb,t=0,wear=0,gained=0,Tmax=T,throttle=false,coldLimit=false;
 const tr={t:[0],soc:[soc],T:[T],C:[0]},mark={};
 while(soc<.995&&t<36*60){
  let acc=soc<=.8?D.Cmax:Math.max(.035,D.Cmax*Math.pow((1-soc)/.2,1.3));       // CC lalu CV
  if(T>48){acc*=.2;throttle=true}else if(T>42){acc*=.5;throttle=true}            // BMS: terlalu panas
  if(T<10&&P/cap>.7){acc=Math.min(acc,.7);coldLimit=true}                         // BMS: dingin → pelan
  const C=Math.min(P/cap,acc),ds=Math.min(1-soc,C*dt/60*.95);
  soc+=ds;gained+=ds;
  T+=(.22*C*C*cool-.09*(T-Tamb))*dt;Tmax=Math.max(Tmax,T);
  wear+=ds*.008*Math.pow(Math.max(C,.2)/.5,.5)*(1+Math.max(0,T-30)*.07)*(T<10&&C>.5?3:1);
  t+=dt;
  for(const k of [.5,.8,.99])if(mark[k]==null&&soc>=k)mark[k]=t;
  if(Math.round(t/dt)%2===0){tr.t.push(t);tr.soc.push(soc);tr.T.push(T);tr.C.push(C)}
 }
 tr.t.push(t);tr.soc.push(soc);tr.T.push(T);tr.C.push(0);
 const perCycle=gained>0?wear/gained:0;
 return{tr,t50:mark[.5],t80:mark[.8],t100:mark[.99]??t,Tmax,throttle,coldLimit,lifeCycles:perCycle?Math.round(20/perCycle):0,P,Cnom:P/cap};
}

/* ---------- Rancang baterai untuk klien ---------- */
const CHEM={
 nmc:{name:'NMC',nick:'🔥 Padat energi',whkg:250,cycles:1800,safety:3,price:2.0},
 lfp:{name:'LFP',nick:'🛡️ Awet & aman',whkg:165,cycles:4000,safety:5,price:1.6}
};
const CLIENTS={
 hp:{name:'Kak Dimas',who:'🎮 HP untuk main game & bikin konten',
  story:'“Aku mau main game 7 jam tanpa ngecas. HP-nya harus tipis dan ringan. Pagi sebelum sekolah aku cuma sempat ngecas 20 menit.”',
  size:{min:3000,max:7000,step:250,def:4000,unit:'mAh',toWh:v=>v*3.85/1000,fmt:v=>v+' mAh'},
  overhead:1.05,massUnit:'g',coolMass:{none:0,sink:.004,liquid:.007},coolCost:{none:0,sink:0,liquid:0},
  fastC:2.5,chargeMin:20,useWh:2.2,useLabel:'jam main game',perDay:7*2.2,
  coolNames:{none:'Tanpa',sink:'Lembar grafit',liquid:'Ruang uap'},
  req:[['use','Main game',7,'≥','jam'],['mass','Berat baterai',95,'≤','g'],['gain','Cas 20 menit',50,'≥','%'],['temp','Suhu saat cas',42,'≤','°C'],['years','Umur baterai',2,'≥','tahun']]},
 motor:{name:'Bu Rini',who:'🛵 Ojek motor listrik',
  story:'“Aku narik 120 km sehari. Siang aku istirahat 30 menit sambil ngecas. Motorku jangan terlalu berat, dan uangku terbatas.”',
  size:{min:2,max:8,step:.25,def:4,unit:'kWh',toWh:v=>v*1000,fmt:v=>String(v).replace('.',',')+' kWh'},
  overhead:1.35,massUnit:'kg',coolMass:{none:0,sink:.8,liquid:2.5},coolCost:{none:0,sink:.3,liquid:1.2},
  fastC:2,chargeMin:30,useWh:45,useLabel:'km',perDay:120*45,
  coolNames:{none:'Tanpa',sink:'Sirip udara',liquid:'Pendingin cair'},
  req:[['use','Jarak tempuh',120,'≥','km'],['mass','Berat baterai',36,'≤','kg'],['gain','Tambahan cas 30 menit',50,'≥','km'],['years','Umur baterai',3,'≥','tahun'],['cost','Harga',14,'≤','juta']]},
 bus:{name:'Pak Budi',who:'🚌 Bus sekolah listrik',
  story:'“Bus ini membawa 40 anak, jadi harus SANGAT aman dan awet. Rutenya 180 km sehari, dicas semalaman di garasi.”',
  size:{min:100,max:400,step:10,def:200,unit:'kWh',toWh:v=>v*1000,fmt:v=>v+' kWh'},
  overhead:1.5,massUnit:'kg',coolMass:{none:0,sink:.03,liquid:.05},coolCost:{none:0,sink:5,liquid:15},
  fastC:1.5,chargeMin:60,useWh:1100,useLabel:'km',perDay:180*1100,
  coolNames:{none:'Tanpa',sink:'Sirip udara',liquid:'Pendingin cair'},
  req:[['use','Jarak tempuh',180,'≥','km'],['safety','Keamanan',4,'≥','★'],['temp','Suhu saat cas',38,'≤','°C'],['years','Umur baterai',10,'≥','tahun'],['cost','Harga',450,'≤','juta']]}
};
const SPEED={slow:.3,mid:1};
function design(clientId,d){
 const K=CLIENTS[clientId],ch=CHEM[d.chem],capWh=K.size.toWh(d.size),lim=d.limit80?.8:1;
 const usable=capWh*lim*.95;
 let C=d.speed==='fast'?K.fastC:SPEED[d.speed];
 let Tc=30+2.44*C*C*COOL[d.cool],throttled=false;
 if(Tc>43){throttled=true;C*=.6;Tc=Math.min(43,30+2.44*C*C*COOL[d.cool]+2)}
 const cellKg=capWh/ch.whkg*K.overhead;
 let mass=cellKg+(clientId==='hp'?K.coolMass[d.cool]:clientId==='bus'?cellKg*K.coolMass[d.cool]:K.coolMass[d.cool]);
 if(K.massUnit==='g')mass*=1000;
 const gainSoc=Math.min(.6,C*K.chargeMin/60*.95);
 const gain=clientId==='hp'?gainSoc*100:gainSoc*capWh/K.useWh;
 const cycles=ch.cycles*(d.limit80?1.5:1)/Math.pow(Math.max(C,.3)/.5,.35)/(1+Math.max(0,Tc-30)*.07);
 const perDay=Math.max(.5,K.perDay/usable),years=Math.min(15,cycles/(365*perDay));
 const safety=Math.max(1,Math.min(5,ch.safety-(Tc>40?1:0)-(Tc>44?1:0)+(d.cool==='liquid'?.5:0)));
 const cost=capWh/1000*ch.price+K.coolCost[d.cool];
 const val={use:usable/K.useWh,mass,gain,temp:Tc,years,safety,cost};
 const checks=K.req.map(([k,label,target,op,unit])=>({k,label,target,op,unit,val:val[k],ok:op==='≥'?val[k]>=target-1e-9:val[k]<=target+1e-9}));
 return{val,checks,ok:checks.every(c=>c.ok),throttled,capWh,C};
}
return{DEV,COOL,charge,CHEM,CLIENTS,design};
});
