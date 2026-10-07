/* PILAR · Lab Maya Tekanan — fisika murni (tanpa DOM/THREE), bisa diuji di Node.
   Semua satuan SI. Model bersifat edukatif dan disederhanakan (lihat "Model check" di tiap lab). */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  const G=9.81, PATM=101325, RHO_AIR=1.2;

  /* ───────── 1. ZAT PADAT: P = F / A ───────── */
  const SURFACES={
    salju:{id:'salju',name:'Salju lembut',P0:10e3,color:0xe8f3ff},
    pasir:{id:'pasir',name:'Pasir',P0:40e3,color:0xd9b779},
    tanah:{id:'tanah',name:'Tanah liat padat',P0:150e3,color:0x9a6b47}
  };
  const DMAX=0.10; // kedalaman amblas maksimum model (m)
  const OBJECTS={
    balok:{id:'balok',name:'Balok kayu',icon:'🧱',mass:[1,40,5],orients:[
      {id:'tidur',label:'Tidur (20×10 cm)',A:200e-4,h:.05},
      {id:'samping',label:'Samping (20×5 cm)',A:100e-4,h:.10},
      {id:'berdiri',label:'Berdiri (10×5 cm)',A:50e-4,h:.20}]},
    kerucut:{id:'kerucut',name:'Kerucut logam',icon:'🔺',mass:[.5,20,2],orients:[
      {id:'alas',label:'Alas di bawah',A:Math.PI*.05*.05,h:.12},
      {id:'ujung',label:'Ujung di bawah',A:.2e-4,h:.12}]},
    paku:{id:'paku',name:'Paku baja',icon:'📍',mass:[.1,2,.5],orients:[
      {id:'kepala',label:'Kepala di bawah',A:1.0e-4,h:.10},
      {id:'ujung',label:'Ujung di bawah',A:.02e-4,h:.10}]},
    sepatu:{id:'sepatu',name:'Sepatu (beban siswa)',icon:'👟',mass:[30,80,45],orients:[
      {id:'datar2',label:'Sepatu datar · 2 kaki',A:300e-4,h:.12},
      {id:'datar1',label:'Sepatu datar · 1 kaki',A:150e-4,h:.12},
      {id:'hak',label:'Hak runcing · 1 kaki',A:1.5e-4,h:.12}]}
  };
  const solid={
    SURFACES,OBJECTS,DMAX,
    weight:(m)=>m*G,
    pressure:(F,A)=>F/A,
    sinkDepth(P,P0,hObj){const d=DMAX*(1-Math.exp(-P/P0));return Math.min(d,.85*(hObj||DMAX))},
    // luas minimum agar amblas <= dTarget (m)
    minAreaForDepth(F,P0,dTarget){const r=Math.min(dTarget/DMAX,.999);return F/(-P0*Math.log(1-r))},
    orient(objId,oId){const o=OBJECTS[objId];return o.orients.find(x=>x.id===oId)||o.orients[0]},
    calc(p){
      const o=solid.orient(p.obj,p.orient),s=SURFACES[p.surface];
      const F=solid.weight(p.mass),A=o.A,Pr=F/A;
      return{F,A,P:Pr,depth:solid.sinkDepth(Pr,s.P0,o.h),h:o.h};
    }
  };

  /* ───────── 2. ZAT CAIR: p = ρ g h ───────── */
  const FLUIDS={
    tawar:{id:'tawar',name:'Air tawar',rho:1000,color:0x3aa7e8},
    laut:{id:'laut',name:'Air laut',rho:1025,color:0x1f78c8},
    minyak:{id:'minyak',name:'Minyak goreng',rho:920,color:0xe2b53a}
  };
  const EAR_AREA=0.6e-4; // luas gendang telinga ≈ 0,6 cm²
  const fluid={
    FLUIDS,EAR_AREA,PATM,
    ph:(rho,h)=>rho*G*h,
    total:(rho,h)=>PATM+rho*G*h,
    depthFor:(rho,ph)=>ph/(rho*G),
    wallForce:(rho,H,w)=>.5*rho*G*H*H*w,   // gaya total pada dinding lebar w, tinggi air H
    calc(p){
      const rho=FLUIDS[p.fluid].rho,ph=rho*G*p.depth;
      return{rho,ph,ptot:PATM+ph,atm:(PATM+ph)/PATM,Fear:ph*EAR_AREA,Fwall:.5*rho*G*p.depth*p.depth*p.width};
    },
    ZONES:[{id:'A',name:'Zona A',limit:12e3},{id:'B',name:'Zona B',limit:20e3},{id:'C',name:'Zona C',limit:35e3}],
    zoneCheck(rho,depths){
      return fluid.ZONES.map((z,i)=>{
        const hmax=z.limit/(rho*G),h=depths[i];
        return{zone:z.id,name:z.name,hmax,h,ph:rho*G*h,safe:h<=hmax+1e-9,efficient:h>=.85*hmax,ok:h<=hmax+1e-9&&h>=.85*hmax};
      });
    }
  };

  /* ───────── 3. HUKUM PASCAL: lift hidrolik ───────── */
  const CARS={
    kota:{id:'kota',name:'Mobil kota',mass:800,color:0xd94f5c,len:3.6,wid:1.6,cab:.9},
    sedan:{id:'sedan',name:'Sedan',mass:1200,color:0x3f7be0,len:4.3,wid:1.75,cab:1.0},
    suv:{id:'suv',name:'SUV',mass:1800,color:0x2f9e6e,len:4.7,wid:1.9,cab:1.15},
    truk:{id:'truk',name:'Truk kecil',mass:3000,color:0xe8d9b0,len:5.2,wid:2.0,cab:1.2}
  };
  const PMAX=2.5e6, STROKE=.25, STROKE_HZ=2, HMAX=1.5;
  const pascal={
    CARS,PMAX,STROKE,STROKE_HZ,HMAX,
    calc(p){
      const A1=p.A1*1e-4,A2=p.A2*1e-4,W=CARS[p.car].mass*G;
      const Pin=p.F1/A1,Peff=Math.min(Pin,PMAX),F2=Peff*A2;
      return{A1,A2,W,Pin,P:Peff,F2,ratio:A2/A1,relief:Pin>PMAX,canLift:F2>=W,Fneed:W*A1/A2,
        rise:A1*STROKE/A2,strokes:HMAX*A2/(A1*STROKE)};
    },
    // laju naik (m/s) saat memompa dengan percepatan waktu ts
    riseRate(c,ts){return c.canLift?STROKE_HZ*ts*c.rise:0},
    // usaha: masukan F1·d1 vs keluaran W·h (ideal, tanpa gesekan)
    workIn:(F,strokes)=>F*STROKE*strokes,
    workOut:(W,h)=>W*h,
    design(A1cm,A2cm,carId,F1max,H){
      const c=pascal.calc({A1:A1cm,A2:A2cm,F1:F1max,car:carId});
      const Fneed=c.Fneed,strokes=H*c.A2/(c.A1*STROKE);
      return{Fneed,Pneed:c.W/c.A2,strokes,time:strokes/STROKE_HZ,ratio:c.ratio};
    }
  };

  /* ───────── 4. BERNOULLI: gaya angkat baling-baling & drone ───────── */
  const BL={R:.12,chord:.02,rEff:.7,eta:.8,nB:2,rpmMax:6000,CL0:.25,aStall:14};
  const BATT={
    kecil:{id:'kecil',name:'Baterai kecil · 20 Wh',Wh:20,m:.12},
    sedang:{id:'sedang',name:'Baterai sedang · 40 Wh',Wh:40,m:.22},
    besar:{id:'besar',name:'Baterai besar · 80 Wh',Wh:80,m:.42}
  };
  const FRAME_M=.45,AVIONICS_W=8,FM=.5,EFF_MOTOR=.75,USABLE=.85,BATT_TIMESCALE=60; // 1 detik simulasi = 1 menit baterai
  const drone={
    BL,BATT,FRAME_M,BATT_TIMESCALE,
    CL(aDeg){
      const a=Math.max(0,aDeg),as=BL.aStall,peak=BL.CL0+2*Math.PI*as*Math.PI/180;
      if(a<=as)return BL.CL0+2*Math.PI*a*Math.PI/180;
      return peak*(1-.55*Math.min(1,(a-as)/12)); // stall: CL turun
    },
    kc(aDeg){return Math.min(.45,drone.CL(aDeg)/4)},               // CL = 4·kc dari model Bernoulli sederhana
    airfoilSpeeds(v,aDeg){const k=drone.kc(aDeg);return{top:v*(1+k),bottom:v*(1-k),k}},
    bernoulliDp:(rho,vt,vb)=>.5*rho*(vt*vt-vb*vb),
    bladeSpeed:(rpm)=>rpm*2*Math.PI/60*BL.R*BL.rEff,
    thrustRotor(rpm,aDeg,rho=RHO_AIR){
      const v=drone.bladeSpeed(rpm),S=BL.chord*BL.R;
      return BL.nB*BL.eta*.5*rho*v*v*S*drone.CL(aDeg);
    },
    mass:(battId,payload)=>FRAME_M+BATT[battId].m+payload,
    hoverThrottle(m,aDeg){
      const Tmax=4*drone.thrustRotor(BL.rpmMax,aDeg);
      return Math.sqrt(m*G/Tmax);
    },
    power(T){ // daya listrik (W) untuk gaya angkat total T, 4 rotor
      const Adisc=4*Math.PI*BL.R*BL.R;
      return Math.pow(T,1.5)/Math.sqrt(2*RHO_AIR*Adisc)/(FM*EFF_MOTOR)+AVIONICS_W;
    },
    downwash:(T)=>Math.sqrt(T/(2*RHO_AIR*4*Math.PI*BL.R*BL.R)),
    design(p){ // p:{batt,payload,alpha}
      const m=drone.mass(p.batt,p.payload),W=m*G;
      const Tmax=4*drone.thrustRotor(BL.rpmMax,p.alpha),twr=Tmax/W;
      const thr=W>=Tmax?1:Math.sqrt(W/Tmax);
      const Phover=drone.power(W),minutes=BATT[p.batt].Wh*USABLE/Phover*60;
      return{m,W,Tmax,twr,hoverThrottle:thr,Phover,minutes,stallRisk:p.alpha>BL.aStall};
    },
    // satu langkah dinamika (vertikal + horizontal) — state s: {y,vy,x,vx,rpm,batt}
    step(s,p,dt){
      const m=drone.mass(p.batt,p.payload);
      const alive=s.battWh>0;
      const target=alive?p.throttle*BL.rpmMax:0;
      s.rpm+=(target-s.rpm)*(1-Math.exp(-dt/.12));
      s.tilt+=(p.tilt*Math.PI/180-s.tilt)*(1-Math.exp(-dt/.18));
      const Tr=drone.thrustRotor(s.rpm,p.alpha);s.T=4*Tr;
      const grounded=s.y<=0&&s.vy<=0;
      const ay=(s.T*Math.cos(s.tilt)-m*G)/m-(.35*s.vy*Math.abs(s.vy))/m*3;
      let ax=(s.T*Math.sin(s.tilt))/m-.5*s.vx/m*3;
      if(grounded){ if(s.T*Math.cos(s.tilt)<=m*G){s.vy=0;s.y=0;ax=-s.vx*6}else s.vy+=ay*dt }
      else s.vy+=ay*dt;
      s.y+=s.vy*dt;s.vx+=ax*dt;s.x+=s.vx*dt;
      if(s.y<0){s.y=0;if(s.vy<-2.5)s.crash=true;s.vy=0}
      if(s.y>7.5){s.y=7.5;s.vy=Math.min(0,s.vy)}
      if(s.x>9){s.x=9;s.vx=0}if(s.x<-9){s.x=-9;s.vx=0}
      s.P=s.rpm>50?drone.power(Math.max(s.T,m*G*.15)):AVIONICS_W*.2;
      s.battWh=Math.max(0,s.battWh-s.P*dt*BATT_TIMESCALE/3600);
      s.m=m;return s;
    },
    newState(battId){return{y:0,vy:0,x:0,vx:0,rpm:0,tilt:0,T:0,P:0,battWh:BATT[battId||'sedang'].Wh,m:0,crash:false}}
  };

  P.pressurePhysics={G,PATM,RHO_AIR,solid,fluid,pascal,drone};
  const A=P.pressurePhysics;
  console.assert(Math.abs(A.solid.pressure(100,.01)-1e4)<1e-9,'P=F/A');
  console.assert(Math.abs(A.fluid.ph(1000,2)-19620)<1e-6,'p=rho g h');
})(typeof window!=='undefined'?window:globalThis);

