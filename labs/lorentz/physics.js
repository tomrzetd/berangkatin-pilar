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
      const p=s.params,c=s.circuit,d=s.dynamics;
      const rotSpeed=Math.PI/0.55;
      const diff=c.batteryRotationTarget-c.batteryRotation;
      c.batteryRotation += Math.sign(diff)*Math.min(Math.abs(diff),rotSpeed*dt);
      const actualPolarity=c.batteryRotation < Math.PI/2 ? 1 : -1;
      c.actualPolarity=actualPolarity;
      c.currentTarget=phys.currentTarget(p.V,p.R,c.on,actualPolarity);
      c.currentActual += (c.currentTarget-c.currentActual)*(1-Math.exp(-dt/.10));
      d.x=p.length*Math.sin(d.alpha);
      d.fieldFactor=phys.fieldFactor(d.x);
      d.fIdeal=phys.idealForce(c.currentActual,p.B,p.L);
      d.fEffective=d.fIdeal*d.fieldFactor;
      const acc=(d.fEffective*Math.cos(d.alpha))/(p.mass*p.length) - (G/p.length)*Math.sin(d.alpha) - p.damping*d.omega;
      d.omega+=acc*dt;
      d.alpha+=d.omega*dt;
      const max=72*Math.PI/180;
      if(d.alpha>max){d.alpha=max;d.omega*=.25}if(d.alpha<-max){d.alpha=-max;d.omega*=.25}
      d.x=p.length*Math.sin(d.alpha);
    }
  };
  console.assert(Math.abs(phys.idealForce(1,1,.1)+.1)<1e-9,'Lorentz sign check');
  console.assert(phys.dirOf(-.1)==='kiri','Direction check');
  P.lorentzPhysics=phys;
})(window);
