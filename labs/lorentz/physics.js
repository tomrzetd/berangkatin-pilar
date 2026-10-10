(function(global){
  const P=global.PILAR=global.PILAR||{};
  const G=9.81;
  const phys={
    currentTarget(V,R,on,pol){return on&&R>0?pol*V/R:0},
    idealForce(I,B,L){return -B*I*L}, // B +y, I +z => F -x
    fieldFactor(x){
      const full=.10,edge=.18,a=Math.abs(x);
      if(a<=full)return 1;if(a>=edge)return 0;return 1-(a-full)/(edge-full);
    },
    dirOf(F){return Math.abs(F)<.002?'diam':F>0?'kanan':'kiri'},
    step(s,dt){
      /* Sub-langkah tetap ≤ 1/480 s: periode ayunan & sudut puncak tidak lagi bergantung fps. */
      const H=1/480;let left=Math.max(0,Math.min(dt,.25));
      while(left>1e-9){const h=Math.min(H,left);phys.stepOnce(s,h);left-=h}
    },
    stepOnce(s,dt){
      const p=s.params,c=s.circuit,d=s.dynamics;
      const rotSpeed=Math.PI/0.55;
      const diff=c.batteryRotationTarget-c.batteryRotation;
      c.batteryRotation += Math.sign(diff)*Math.min(Math.abs(diff),rotSpeed*dt);
      const actualPolarity=c.batteryRotation < Math.PI/2 ? 1 : -1;
      c.actualPolarity=actualPolarity;
      d.x=p.length*Math.sin(d.alpha);
      d.fieldFactor=phys.fieldFactor(d.x);
      /* GGL induksi balik (hukum Lenz): kawat yang bergerak di medan B membangkitkan ε = B·L·v
         yang melawan arus baterai. Di rig sekolah efeknya kecil (≈1%), tetapi membuat model konsisten
         secara energi dan siap dipakai untuk misi "generator" / rem magnetik. */
      const vx=p.length*Math.cos(d.alpha)*d.omega;
      d.emf=p.B*p.L*vx*d.fieldFactor;
      const rInt=p.rInt??0;
      c.currentTarget=c.on&&p.R>0?(actualPolarity*p.V+d.emf)/(p.R+rInt):0;
      c.currentActual += (c.currentTarget-c.currentActual)*(1-Math.exp(-dt/.10));
      d.fIdeal=phys.idealForce(c.currentActual,p.B,p.L);
      d.fEffective=d.fIdeal*d.fieldFactor;
      // redaman: viskos poros + hambatan udara kuadratik (kawat Ø~2 mm, panjang L)
      const drag=.5*1.2*1.1*(.002*p.L)*vx*Math.abs(vx);
      const acc=((d.fEffective-drag)*Math.cos(d.alpha))/(p.mass*p.length) - (G/p.length)*Math.sin(d.alpha) - p.damping*d.omega;
      d.omega+=acc*dt;          // semi-implicit Euler: ω dulu, lalu α (stabil secara energi)
      d.alpha+=d.omega*dt;
      const max=50*Math.PI/180; // batas mekanik rig: kawat tetap berada di celah magnet dan tidak menembus kutub
      if(d.alpha>max){d.alpha=max;d.omega*=-.25}if(d.alpha<-max){d.alpha=-max;d.omega*=-.25}
      d.x=p.length*Math.sin(d.alpha);
    }
  };
  console.assert(Math.abs(phys.idealForce(1,1,.1)+.1)<1e-9,'Lorentz sign check');
  console.assert(phys.dirOf(-.1)==='kiri','Direction check');
  P.lorentzPhysics=phys;
})(window);
