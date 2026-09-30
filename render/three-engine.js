(function(global){
  const P=global.PILAR=global.PILAR||{};
  P.render3d={
    init(stage){
      if(!global.THREE)throw new Error('Three.js tidak termuat');
      const THREE=global.THREE,scene=new THREE.Scene();scene.background=new THREE.Color(0x111d2b);scene.fog=new THREE.Fog(0x111d2b,14,30);
      const cam=new THREE.PerspectiveCamera(38,1,.1,80),rd=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});rd.setPixelRatio(Math.min(devicePixelRatio,1.7));rd.shadowMap.enabled=true;rd.shadowMap.type=THREE.PCFSoftShadowMap;rd.outputEncoding=THREE.sRGBEncoding;rd.toneMapping=THREE.ACESFilmicToneMapping;rd.toneMappingExposure=1.12;stage.prepend(rd.domElement);
      const orb={az:.52,el:.25,r:10.2,taz:.52,tel:.25};P.pointer.bindOrbit(rd.domElement,orb);
      scene.add(new THREE.HemisphereLight(0xcfe5ff,0x2e231b,.85));const sun=new THREE.DirectionalLight(0xfff2dc,1.45);sun.position.set(5,9,6);sun.castShadow=true;scene.add(sun);
      const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.48,metalness:.2},o));
      const add=(g,m,x,y,z)=>{const q=new THREE.Mesh(g,m);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;scene.add(q);return q};
      function woodTex(){const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#8a613b';x.fillRect(0,0,256,256);for(let i=0;i<28;i++){x.globalAlpha=.05+Math.random()*.08;x.strokeStyle=i%2?'#f2c083':'#3c2517';x.lineWidth=.5+Math.random()*1.4;const y=Math.random()*256;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(80,y+4,170,y-4,256,y+2);x.stroke()}x.globalAlpha=1;const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);t.encoding=THREE.sRGBEncoding;return t}
      const table=add(new THREE.BoxGeometry(17,.28,9),M(0xffffff,{map:woodTex(),roughness:.72,metalness:0}),0,-2.15,.5);
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(40,18),M(0x26384b,{roughness:.98,metalness:0}));wall.position.set(0,5,-6);scene.add(wall);
      const steel=M(0xaeb8c2,{metalness:.82,roughness:.3}),oak=M(0xb88754,{metalness:0,roughness:.65}),copper=M(0xd98a48,{metalness:.86,roughness:.23});
      add(new THREE.CylinderGeometry(.085,.085,4.7,20),steel,-2.4,.15,0);add(new THREE.BoxGeometry(1.8,.12,1.7),M(0x232a31,{roughness:.72,metalness:.08}),-2.4,-1.98,0);add(new THREE.BoxGeometry(2.45,.11,.12),oak,-1.18,1.6,0);add(new THREE.BoxGeometry(.13,.11,1.55),oak,.0,1.6,0);
      const magnetGroup=new THREE.Group();scene.add(magnetGroup);const n=add(new THREE.BoxGeometry(1.45,.52,1.1),M(0xd8324b,{roughness:.38}),0,-.78,0),s=add(new THREE.BoxGeometry(1.45,.52,1.1),M(0x2f69d9,{roughness:.38}),0,.78,0);magnetGroup.add(n);magnetGroup.add(s);
      function sprite(txt,color,scale=.62){const cv=document.createElement('canvas');cv.width=160;cv.height=80;const x=cv.getContext('2d');x.fillStyle=color;x.font='700 48px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,80,42);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));sp.scale.set(scale,scale/2,1);scene.add(sp);return sp}
      const nL=sprite('N','#fff',.62);nL.position.set(0,-.78,.64);const sL=sprite('S','#fff',.62);sL.position.set(0,.78,.64);
      const rod=add(new THREE.CylinderGeometry(.06,.06,1.25,24),copper,0,0,0);rod.rotation.x=Math.PI/2;
      const threadMat=new THREE.LineBasicMaterial({color:0xdbe6f0});const t1=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,1.6,-.62),new THREE.Vector3(0,0,-.62)]),threadMat),t2=t1.clone();t2.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,1.6,.62),new THREE.Vector3(0,0,.62)]);scene.add(t1,t2);
      const holder=add(new THREE.BoxGeometry(2.1,.28,.72),M(0x161b22,{roughness:.62}),2.4,-1.72,1.45);const cell=add(new THREE.CylinderGeometry(.25,.25,1.5,32),M(0x2d72bd,{roughness:.42,metalness:.12,transparent:true,opacity:.78}),2.25,-1.48,1.45);cell.rotation.z=Math.PI/2;const plus=sprite('+','#ff9fa9',.34);plus.position.set(3.02,-1.14,1.45);const minus=sprite('−','#dbe6f0',.34);minus.position.set(1.46,-1.14,1.45);
      const swBase=add(new THREE.BoxGeometry(.75,.18,.5),M(0x161b22,{roughness:.65}),1.7,-1.72,.55);const swLever=add(new THREE.BoxGeometry(.62,.08,.12),steel,1.7,-1.52,.55);swLever.geometry.translate(-.25,0,0);swLever.rotation.z=-.65;
      const lead1=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xff6c78})),lead2=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xcfd8e6}));scene.add(lead1,lead2);
      const fieldG=new THREE.Group();scene.add(fieldG);for(const x of [-.45,0,.45])for(const z of [-.32,.32]){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-.48,z),new THREE.Vector3(x,.48,z)]),new THREE.LineBasicMaterial({color:0x69baff,transparent:true,opacity:.72}));fieldG.add(line);const ah=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(x,-.05,z),.42,0x69baff,.10,.06);fieldG.add(ah)}
      const bLabel=sprite('B','#69baff',.52);bLabel.position.set(-.92,0,.58);
      const iArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),.82,0xffd36c,.18,.1);scene.add(iArrow);const iLabel=sprite('I','#ffd36c',.48);
      const fArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.7,0x63e3a0,.2,.11);scene.add(fArrow);const fLabel=sprite('F','#63e3a0',.48);
      const arcG=new THREE.Group();scene.add(arcG);const arc=[];const L=.22*10,H=1.6;for(let a=-60;a<=60;a+=2){const r=a*Math.PI/180;arc.push(new THREE.Vector3(Math.sin(r)*L,H-Math.cos(r)*L,-.9))}arcG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc),new THREE.LineBasicMaterial({color:0x879bb5,transparent:true,opacity:.6})));
      const currG=new THREE.Group();scene.add(currG);const currPts=[];for(let i=0;i<24;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:0x8ff7ff,depthTest:false,transparent:true,opacity:.92}));p.userData.base=i/24;currG.add(p);currPts.push(p)}
      const api={scene,cam,rd,orb,rod,cell,swLever,fieldG,bLabel,iArrow,iLabel,fArrow,fLabel,arcG,currG,currPts,lead1,lead2,phase:0,
        setView(name){if(name==='front'){orb.taz=0;orb.tel=.06}else{orb.taz=.52;orb.tel=.25}},
        resize(){const w=stage.clientWidth,h=stage.clientHeight;rd.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()},
        update(state,dt){
          const d=state.dynamics,c=state.circuit;
          const x=d.x*10,y=1.6-.22*10*Math.cos(d.alpha);
          rod.position.set(x,y,0);t1.geometry.setFromPoints([new THREE.Vector3(0,1.6,-.62),new THREE.Vector3(x,y,-.62)]);t2.geometry.setFromPoints([new THREE.Vector3(0,1.6,.62),new THREE.Vector3(x,y,.62)]);
          cell.rotation.y=c.batteryRotation;swLever.rotation.z=c.on?-.08:-.65;
          const p1=[new THREE.Vector3(2.95,-1.48,1.45),new THREE.Vector3(1.7,-1.45,.55),new THREE.Vector3(.4,1.25,-.62),new THREE.Vector3(x,y,-.62)];lead1.geometry.setFromPoints(p1);const p2=[new THREE.Vector3(x,y,.62),new THREE.Vector3(.5,1.0,.9),new THREE.Vector3(1.45,-1.48,1.45)];lead2.geometry.setFromPoints(p2);
          fieldG.visible=state.reveal.field;bLabel.visible=state.reveal.field;iArrow.visible=iLabel.visible=state.reveal.current&&Math.abs(c.currentActual)>.03;fArrow.visible=fLabel.visible=state.reveal.force&&Math.abs(d.fEffective)>.002;arcG.visible=['aha','buktikan','rekayasa'].includes(state.phase);
          if(iArrow.visible){const sign=Math.sign(c.currentActual)||1;iArrow.position.set(x,y+.24,0);iArrow.setDirection(new THREE.Vector3(0,0,sign));iLabel.position.set(x,y+.24,sign*.86)}
          if(fArrow.visible){const sign=Math.sign(d.fEffective)||1;const len=.38+Math.min(.9,Math.abs(d.fEffective)*8);fArrow.position.set(x,y,0);fArrow.setDirection(new THREE.Vector3(sign,0,0));fArrow.setLength(len,.20,.11);fArrow.setColor(new THREE.Color(sign>0?0x63e3a0:0xff6d83));fLabel.material.color=new THREE.Color(sign>0?0x63e3a0:0xff6d83);fLabel.position.set(x+sign*(len+.24),y,0)}
          currG.visible=state.reveal.current&&c.on&&Math.abs(c.currentActual)>.03;
          if(currG.visible){api.phase=(api.phase+dt*.24*state.ui.speed*Math.max(.5,Math.abs(c.currentActual)))%1;const sign=Math.sign(c.currentActual)||1;const path=[...p1,...p2,new THREE.Vector3(1.45,-1.48,1.45),new THREE.Vector3(2.2,-1.48,1.45),new THREE.Vector3(2.95,-1.48,1.45)];for(const q of currPts){const u=((q.userData.base+api.phase*sign)%1+1)%1,f=u*(path.length-1),k=Math.min(path.length-2,Math.floor(f));q.position.lerpVectors(path[k],path[k+1],f-k)}}
          orb.az+=(orb.taz-orb.az)*.11;orb.el+=(orb.tel-orb.el)*.11;cam.position.set(orb.r*Math.sin(orb.az)*Math.cos(orb.el),orb.r*Math.sin(orb.el)-.1,orb.r*Math.cos(orb.az)*Math.cos(orb.el));cam.lookAt(0,-.2,0);
          rd.render(scene,cam)
        }
      };
      api.resize();global.addEventListener('resize',()=>api.resize());return api;
    }
  };
})(window);
