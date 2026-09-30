(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  P.render3d={
    init(stage){
      if(!global.THREE)throw new Error('Three.js tidak termuat');
      const THREE=global.THREE;
      const scene=new THREE.Scene();
      scene.background=new THREE.Color(0x142434);
      scene.fog=new THREE.Fog(0x142434,16,34);
      P.ownership&&P.ownership.signScene(scene);

      const cam=new THREE.PerspectiveCamera(38,1,.1,80);
      const rd=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
      rd.setPixelRatio(Math.min(devicePixelRatio,1.45));
      rd.shadowMap.enabled=true;
      rd.shadowMap.type=THREE.PCFSoftShadowMap;
      rd.outputEncoding=THREE.sRGBEncoding;
      rd.toneMapping=THREE.ACESFilmicToneMapping;
      rd.toneMappingExposure=1.12;
      stage.prepend(rd.domElement);
      const orb={az:.52,el:.25,r:10.4,taz:.52,tel:.25};
      P.pointer.bindOrbit(rd.domElement,orb);

      // ---------- deterministic procedural material system ----------
      function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
      function hexToRgb(h){const c=new THREE.Color(h);return [Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255)]}
      function tex(kind,color,seed=1,rx=1,ry=1,mono=false){
        const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d'),R=rng(seed),rgb=hexToRgb(color);
        g.fillStyle=mono?'#808080':`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;g.fillRect(0,0,256,256);
        if(kind==='wood'){
          for(let i=0;i<68;i++){const y=R()*256,w=.5+R()*2.1;g.globalAlpha=.05+R()*.12;g.strokeStyle=mono?(R()>.5?'#b8b8b8':'#555'):(R()>.5?'#efc58f':'#4a2b18');g.lineWidth=w;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(70,y+R()*8-4,170,y+R()*10-5,256,y+R()*5-2);g.stroke()}
        }else if(kind==='brushed'){
          for(let i=0;i<110;i++){g.globalAlpha=.025+R()*.10;g.strokeStyle=mono?(R()>.5?'#c8c8c8':'#4f4f4f'):(R()>.5?'#f7fbff':'#303840');const x=R()*256;g.lineWidth=.4+R()*1.2;g.beginPath();g.moveTo(x,0);g.lineTo(x+R()*3-1.5,256);g.stroke()}
          for(let i=0;i<14;i++){g.globalAlpha=.08;g.strokeStyle=mono?'#222':'#ffffff';g.lineWidth=.5;const x=R()*256,y=R()*256;g.beginPath();g.moveTo(x,y);g.lineTo(x+20+R()*65,y+R()*4-2);g.stroke()}
        }else if(kind==='paint'){
          for(let i=0;i<220;i++){const x=R()*256,y=R()*256,r=.3+R()*1.7;g.globalAlpha=.04+R()*.08;g.fillStyle=mono?(R()>.5?'#bcbcbc':'#484848'):(R()>.8?'#e9e9e9':'#111820');g.fillRect(x,y,r,r)}
          for(let i=0;i<10;i++){g.globalAlpha=.18;g.strokeStyle=mono?'#d0d0d0':'#d8dde2';g.lineWidth=.5+R();const x=R()*230,y=R()*250;g.beginPath();g.moveTo(x,y);g.lineTo(x+10+R()*50,y+R()*4-2);g.stroke()}
        }else if(kind==='plastic'){
          for(let i=0;i<420;i++){const v=mono?Math.floor(95+R()*95):Math.floor(20+R()*22);g.globalAlpha=.025+R()*.06;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(R()*256,R()*256,1+R()*2,1+R()*2)}
          for(let i=0;i<8;i++){g.globalAlpha=.08;g.strokeStyle=mono?'#d0d0d0':'#ffffff';g.beginPath();const x=R()*220,y=R()*240;g.moveTo(x,y);g.lineTo(x+25+R()*60,y+R()*8-4);g.stroke()}
        }else if(kind==='rope'){
          g.globalAlpha=.22;g.strokeStyle=mono?'#bdbdbd':'#d8c7a5';g.lineWidth=2;for(let x=-256;x<512;x+=9){g.beginPath();g.moveTo(x,0);g.lineTo(x+256,256);g.stroke()}
          g.globalAlpha=.12;g.strokeStyle=mono?'#555':'#5d4a31';g.lineWidth=1;for(let x=-256;x<512;x+=13){g.beginPath();g.moveTo(x,0);g.lineTo(x+256,256);g.stroke()}
        }else if(kind==='rubber'){
          for(let i=0;i<300;i++){g.globalAlpha=.03+R()*.07;g.fillStyle=mono?(R()>.5?'#bbb':'#444'):(R()>.5?'#333b43':'#080b0e');g.fillRect(R()*256,R()*256,1+R()*2,1+R()*2)}
          for(let i=0;i<10;i++){g.globalAlpha=.12;g.strokeStyle=mono?'#ccc':'#727981';g.beginPath();const y=R()*256;g.moveTo(R()*80,y);g.lineTo(150+R()*106,y+R()*4-2);g.stroke()}
        }
        g.globalAlpha=1;
        const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,rd.capabilities.getMaxAnisotropy());return t;
      }
      function material(kind,color,opt={}){
        const map=tex(kind,color,opt.seed||1,opt.rx||1,opt.ry||1,false);
        const bump=tex(kind,0x808080,(opt.seed||1)+911,opt.rx||1,opt.ry||1,true);
        const m=new THREE.MeshStandardMaterial({color:0xffffff,map,bumpMap:bump,bumpScale:opt.bump??.025,roughness:opt.roughness??.5,metalness:opt.metalness??.1});
        m.userData.baseBump=m.bumpScale;return m;
      }
      const mats=[];const MAT=(...a)=>{const m=material(...a);mats.push(m);return m};
      const wood=MAT('wood',0x93663c,{seed:12,rx:3,ry:2,bump:.055,roughness:.72,metalness:0});
      const oak=MAT('wood',0xb48755,{seed:17,rx:2,ry:1,bump:.035,roughness:.62,metalness:0});
      const steel=MAT('brushed',0xaeb7bf,{seed:23,rx:1,ry:3,bump:.018,roughness:.30,metalness:.88});
      const darkSteel=MAT('brushed',0x3d454d,{seed:29,rx:1,ry:2,bump:.022,roughness:.36,metalness:.74});
      const copper=MAT('brushed',0xd58a4b,{seed:31,rx:1,ry:3,bump:.014,roughness:.23,metalness:.88});
      const magnetN=MAT('paint',0xc92f49,{seed:37,rx:2,ry:1,bump:.028,roughness:.39,metalness:.24});
      const magnetS=MAT('paint',0x2f67c8,{seed:41,rx:2,ry:1,bump:.028,roughness:.39,metalness:.24});
      const plastic=MAT('plastic',0x171c23,{seed:47,rx:2,ry:2,bump:.032,roughness:.66,metalness:.04});
      const rubberRed=MAT('rubber',0xb93543,{seed:53,rx:2,ry:4,bump:.035,roughness:.72,metalness:0});
      const rubberBlack=MAT('rubber',0x15191e,{seed:59,rx:2,ry:4,bump:.035,roughness:.74,metalness:0});
      const ropeMat=MAT('rope',0xb8aa8e,{seed:61,rx:1,ry:5,bump:.05,roughness:.88,metalness:0});

      const shadowables=[];
      const add=(g,m,x,y,z,parent=scene)=>{const q=new THREE.Mesh(g,m);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;parent.add(q);shadowables.push(q);return q};
      const sprite=(txt,color,scale=.62,parent=scene)=>{const cv=document.createElement('canvas');cv.width=192;cv.height=96;const x=cv.getContext('2d');x.fillStyle=color;x.font='700 52px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,96,50);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:false}));sp.scale.set(scale,scale/2,1);parent.add(sp);return sp};

      // ---------- real-time lighting ----------
      scene.add(new THREE.HemisphereLight(0xcfe5ff,0x382a20,.78));
      const sun=new THREE.DirectionalLight(0xfff1dc,1.62);sun.position.set(5.5,9,6.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:28});sun.shadow.bias=-.00035;scene.add(sun);
      const fill=new THREE.PointLight(0x86cfff,.42,18);fill.position.set(-4,3,4);scene.add(fill);
      const warm=new THREE.PointLight(0xffc58e,.28,14);warm.position.set(4,1.5,3);scene.add(warm);

      // ---------- environment ----------
      add(new THREE.BoxGeometry(17,.30,9),wood,0,-2.15,.5);
      const wall=add(new THREE.PlaneGeometry(40,18),MAT('paint',0x293b4d,{seed:71,rx:8,ry:3,bump:.006,roughness:.94,metalness:0}),0,5,-6);wall.castShadow=false;
      add(new THREE.CylinderGeometry(.085,.085,4.7,22),steel,-2.4,.15,0);
      add(new THREE.BoxGeometry(1.8,.12,1.7),darkSteel,-2.4,-1.98,0);
      add(new THREE.BoxGeometry(2.45,.11,.12),oak,-1.18,1.6,0);
      add(new THREE.BoxGeometry(.13,.11,1.55),oak,0,1.6,0);

      // ---------- U / horseshoe magnet: physically clearer for students ----------
      const magnetGroup=new THREE.Group();scene.add(magnetGroup);
      const armW=3.30,armH=.46,armD=1.00;
      const armX=-.18,legX=1.42,legW=.54,legH=2.18,legD=1.00;
      const yokeMat=MAT('brushed',0x5a6470,{seed:43,rx:1,ry:2,bump:.018,roughness:.42,metalness:.72});
      add(new THREE.BoxGeometry(armW,armH,armD),magnetN,armX,-1.15,0,magnetGroup);
      add(new THREE.BoxGeometry(armW,armH,armD),magnetS,armX,.58,0,magnetGroup);
      add(new THREE.BoxGeometry(legW,legH,legD),yokeMat,legX,-.285,0,magnetGroup);
      // Slight pole caps so the active faces feel like real pole pieces
      const poleCapW=.22,poleCapH=.50,poleCapD=1.04,poleCapX=armX-(armW/2)+(poleCapW/2)-.01;
      add(new THREE.BoxGeometry(poleCapW,poleCapH,poleCapD),magnetN,poleCapX,-1.15,0,magnetGroup);
      add(new THREE.BoxGeometry(poleCapW,poleCapH,poleCapD),magnetS,poleCapX,.58,0,magnetGroup);
      const nL=sprite('N','#fff',.64,magnetGroup);nL.position.set(-.15,-1.15,.72);
      const sL=sprite('S','#fff',.64,magnetGroup);sL.position.set(-.15,.58,.72);

      // ---------- active conductor + realistic ropes ----------
      const rod=add(new THREE.CylinderGeometry(.06,.06,1.25,28),copper,0,-.6,0);rod.rotation.x=Math.PI/2;
      const unitY=new THREE.Vector3(0,1,0);
      function dynamicSegment(radius,mat,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,1,segments),mat);m.castShadow=true;m.receiveShadow=true;scene.add(m);shadowables.push(m);return m}
      function between(mesh,a,b){const d=b.clone().sub(a),len=d.length();if(len<1e-5){mesh.visible=false;return}mesh.visible=true;mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(unitY,d.clone().normalize());mesh.scale.set(1,len,1)}
      const rope1=dynamicSegment(.014,ropeMat,10),rope2=dynamicSegment(.014,ropeMat,10);

      // ---------- reclaimed 18650 + holder ----------
      const batteryGroup=new THREE.Group();batteryGroup.position.set(2.42,-1.48,1.45);scene.add(batteryGroup);
      function batterySleeve(){
        const cv=document.createElement('canvas');cv.width=512;cv.height=256;const g=cv.getContext('2d'),R=rng(991);
        g.fillStyle='#2b72b4';g.fillRect(0,0,512,256);
        const grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'rgba(255,255,255,.10)');grad.addColorStop(.48,'rgba(0,0,0,.03)');grad.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=grad;g.fillRect(0,0,512,256);
        g.fillStyle='rgba(235,244,252,.88)';g.font='700 25px sans-serif';g.textAlign='center';g.fillText('RECLAIMED 18650 · 3.7 V',256,82);g.font='600 17px sans-serif';g.fillText('LAB CELL · educational rig',256,112);
        g.globalAlpha=.58;g.font='600 12px monospace';g.fillText((P.ownership&&P.ownership.tag())||'PILAR-LTZ',256,143);g.globalAlpha=1;
        for(let i=0;i<46;i++){g.globalAlpha=.08+R()*.18;g.strokeStyle=R()>.5?'#e8eef5':'#0d3154';g.lineWidth=.5+R()*1.4;const x=R()*500,y=R()*245;g.beginPath();g.moveTo(x,y);g.lineTo(x+8+R()*48,y+R()*7-3.5);g.stroke()}
        for(let i=0;i<18;i++){g.globalAlpha=.12;g.fillStyle='#d8e1ea';g.fillRect(R()*500,R()*245,2+R()*9,1+R()*3)}
        g.globalAlpha=1;const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,rd.capabilities.getMaxAnisotropy());return t;
      }
      const battBump=tex('paint',0x808080,997,1,1,true);
      const battSide=new THREE.MeshStandardMaterial({color:0xffffff,map:batterySleeve(),bumpMap:battBump,bumpScale:.018,roughness:.48,metalness:.08});battSide.userData.baseBump=.018;mats.push(battSide);
      const battCap=steel;
      const cell=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,1.5,36),[battSide,battCap,battCap]);cell.rotation.z=Math.PI/2;cell.castShadow=true;cell.receiveShadow=true;batteryGroup.add(cell);shadowables.push(cell);
      const nub=add(new THREE.CylinderGeometry(.09,.09,.07,24),steel,.785,0,0,batteryGroup);nub.rotation.z=Math.PI/2;
      const oldNickel=add(new THREE.BoxGeometry(.28,.018,.08),steel,.46,.27,0,batteryGroup);oldNickel.rotation.z=.05;
      const plus=sprite('+','#ffaaa9',.34,batteryGroup);plus.position.set(.82,.40,0);const minus=sprite('−','#dbe6f0',.34,batteryGroup);minus.position.set(-.78,.40,0);
      add(new THREE.BoxGeometry(2.1,.28,.72),plastic,2.42,-1.72,1.45);
      add(new THREE.BoxGeometry(.12,.46,.78),plastic,1.52,-1.52,1.45);
      add(new THREE.BoxGeometry(.12,.46,.78),plastic,3.32,-1.52,1.45);
      const swBase=add(new THREE.BoxGeometry(.78,.18,.52),plastic,1.68,-1.72,.55);
      const swLever=add(new THREE.BoxGeometry(.64,.08,.12),steel,1.68,-1.52,.55);swLever.geometry.translate(-.26,0,0);swLever.rotation.z=-.65;
      add(new THREE.CylinderGeometry(.08,.08,.14,18),steel,1.42,-1.50,.55).rotation.x=Math.PI/2;

      // ---------- cable system with real material + shadows ----------
      function cableChain(count,mat,r=.026){const a=[];for(let i=0;i<count;i++)a.push(dynamicSegment(r,mat,10));return a}
      const redCable=cableChain(3,rubberRed,.03),blackCable=cableChain(3,rubberBlack,.03);
      function updateCable(chain,points){for(let i=0;i<chain.length;i++)between(chain[i],points[i],points[i+1])}

      // ---------- field / vectors ----------
      const fieldG=new THREE.Group();scene.add(fieldG);
      for(const x of [-1.25,-.65,0,.65,1.25])for(const z of [-.32,.32]){
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-.88,z),new THREE.Vector3(x,.30,z)]),new THREE.LineBasicMaterial({color:0x69baff,transparent:true,opacity:.50}));fieldG.add(line);
        const ah=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(x,-.30,z),.45,0x69baff,.11,.06);fieldG.add(ah);
      }
      const bLabel=sprite('B','#69baff',.52);bLabel.position.set(-1.65,-.15,.73);
      const iArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),.82,0xffd36c,.18,.10);scene.add(iArrow);const iLabel=sprite('I','#ffd36c',.48);
      const fArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.7,0x63e3a0,.20,.11);scene.add(fArrow);const fLabel=sprite('F','#63e3a0',.48);

      // alpha guide is intentionally hidden until AHA/proof; alpha != theta
      const arcG=new THREE.Group();scene.add(arcG);const arc=[];const Lr=2.2,Hr=1.6;for(let a=-52;a<=52;a+=2){const r=a*Math.PI/180;arc.push(new THREE.Vector3(Math.sin(r)*Lr,Hr-Math.cos(r)*Lr,-.93))}arcG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc),new THREE.LineBasicMaterial({color:0x879bb5,transparent:true,opacity:.48})));

      // current particles: external loop, including an explicit segment through the cell
      const currG=new THREE.Group();scene.add(currG);const currPts=[];
      for(let i=0;i<16;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.052,10,8),new THREE.MeshBasicMaterial({color:0x8ff7ff,depthTest:false,transparent:true,opacity:.94}));p.userData.base=i/16;currG.add(p);currPts.push(p)}
      const currChevron=[];for(let i=0;i<5;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.065,.18,9),new THREE.MeshBasicMaterial({color:0xffd36c,depthTest:false}));c.userData.base=i/5;currG.add(c);currChevron.push(c)}

      // owner micro-mark stays in metadata and battery sleeve; remove prominent plate from workbench
      const ownerAnchor=new THREE.Object3D();
      ownerAnchor.position.set(-3.25,-2.22,.62);
      ownerAnchor.userData.ownerTag=(P.ownership&&P.ownership.tag())||'PILAR';
      scene.add(ownerAnchor);

      let quality='standard';
      function setQuality(q){
        quality=['performance','standard','realistic'].includes(q)?q:'standard';
        const cfg=quality==='performance'?{px:1,shadow:false,map:512,bump:.25}:quality==='realistic'?{px:Math.min(devicePixelRatio,1.8),shadow:true,map:2048,bump:1}:{px:Math.min(devicePixelRatio,1.45),shadow:true,map:1024,bump:.62};
        rd.setPixelRatio(cfg.px);rd.shadowMap.enabled=cfg.shadow;sun.castShadow=cfg.shadow;sun.shadow.mapSize.set(cfg.map,cfg.map);if(sun.shadow.map)sun.shadow.map.dispose();
        mats.forEach(m=>{if('bumpScale' in m&&m.userData.baseBump!=null)m.bumpScale=m.userData.baseBump*cfg.bump;m.needsUpdate=true});
        shadowables.forEach(o=>o.castShadow=cfg.shadow);api.resize();
        return quality;
      }

      function pathSample(path,u){
        const lens=[];let total=0;for(let i=0;i<path.length-1;i++){const l=path[i].distanceTo(path[i+1]);lens.push(l);total+=l}
        let d=Math.max(0,Math.min(.999999,u))*total;for(let i=0;i<lens.length;i++){if(d<=lens[i])return path[i].clone().lerp(path[i+1],lens[i]?d/lens[i]:0);d-=lens[i]}return path[path.length-1].clone();
      }
      function tangentSample(path,u,sign){const eps=.003,a=pathSample(path,Math.max(0,u-eps)),b=pathSample(path,Math.min(.999,u+eps));return b.sub(a).normalize().multiplyScalar(sign)}

      const api={scene,cam,rd,orb,rod,cell,batteryGroup,swLever,fieldG,bLabel,iArrow,iLabel,fArrow,fLabel,arcG,currG,currPts,currChevron,phase:0,quality,
        setView(name){if(name==='front'){orb.taz=0;orb.tel=.06}else{orb.taz=.52;orb.tel=.25}},
        rewindCurrent(){api.phase=0;},
        setQuality(q){api.quality=setQuality(q);return api.quality},
        resize(){const w=stage.clientWidth,h=stage.clientHeight;rd.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()},
        update(state,dt){
          const d=state.dynamics,c=state.circuit;
          // Physical rendering scale: 0.22 m pendulum -> 2.2 scene units. Physics limits alpha to safe magnet clearance.
          const x=d.x*10,y=Hr-Lr*Math.cos(d.alpha);
          rod.position.set(x,y,0);
          const an1=new THREE.Vector3(0,Hr,-.62),an2=new THREE.Vector3(0,Hr,.62),a1=new THREE.Vector3(x,y,-.62),a2=new THREE.Vector3(x,y,.62);
          between(rope1,an1,a1);between(rope2,an2,a2);

          batteryGroup.rotation.y=c.batteryRotation;
          swLever.rotation.z=c.on?-.08:-.65;

          const tPos=new THREE.Vector3(3.24,-1.50,1.45),tNeg=new THREE.Vector3(1.60,-1.50,1.45),sw=new THREE.Vector3(1.68,-1.50,.55);
          const p1=[tPos,sw,new THREE.Vector3(.75,.75,-.62),an1,a1];
          const p2=[a2,an2,new THREE.Vector3(.72,.60,.86),tNeg];
          updateCable(redCable,[tPos,sw,new THREE.Vector3(.75,.75,-.62),a1]);
          updateCable(blackCable,[a2,new THREE.Vector3(.72,.60,.86),new THREE.Vector3(1.30,-.95,1.25),tNeg]);

          fieldG.visible=state.reveal.field;bLabel.visible=state.reveal.field;
          iArrow.visible=iLabel.visible=state.reveal.current&&Math.abs(c.currentActual)>.03;
          fArrow.visible=fLabel.visible=state.reveal.force&&Math.abs(d.fEffective)>.002;
          arcG.visible=['aha','buktikan','rekayasa'].includes(state.phase);
          if(iArrow.visible){const sign=Math.sign(c.currentActual)||1;iArrow.position.set(x,y+.24,0);iArrow.setDirection(new THREE.Vector3(0,0,sign));iLabel.position.set(x,y+.24,sign*.86)}
          if(fArrow.visible){const sign=Math.sign(d.fEffective)||1,len=.38+Math.min(.9,Math.abs(d.fEffective)*8);fArrow.position.set(x,y,0);fArrow.setDirection(new THREE.Vector3(sign,0,0));fArrow.setLength(len,.20,.11);fArrow.setColor(new THREE.Color(sign>0?0x63e3a0:0xff6d83));fLabel.material.color=new THREE.Color(sign>0?0x63e3a0:0xff6d83);fLabel.position.set(x+sign*(len+.24),y,0)}

          currG.visible=state.reveal.current&&c.on&&Math.abs(c.currentActual)>.03;
          if(currG.visible){
            const flowSpeed=Math.max(.05,Number(state.ui.flowSpeed)||.55);api.phase=(api.phase+dt*.13*flowSpeed*Math.max(.42,Math.min(1.6,Math.abs(c.currentActual))))%1;const sign=Math.sign(c.currentActual)||1;
            // The closed visual path runs from holder + contact through switch -> conductor -> holder −, then through the cell back to +.
            const path=[tPos,sw,new THREE.Vector3(.75,.75,-.62),an1,a1,a2,an2,new THREE.Vector3(.72,.60,.86),tNeg,new THREE.Vector3(2.0,-1.50,1.45),new THREE.Vector3(2.42,-1.50,1.45),new THREE.Vector3(2.86,-1.50,1.45),tPos];
            const place=(q,base,arrow=false)=>{const u=((base+api.phase*sign)%1+1)%1;q.position.copy(pathSample(path,u));if(arrow){const tang=tangentSample(path,u,sign);q.quaternion.setFromUnitVectors(unitY,tang)}};
            currPts.forEach(q=>place(q,q.userData.base,false));currChevron.forEach(q=>place(q,q.userData.base,true));
          }

          orb.az+=(orb.taz-orb.az)*.11;orb.el+=(orb.tel-orb.el)*.11;cam.position.set(orb.r*Math.sin(orb.az)*Math.cos(orb.el),orb.r*Math.sin(orb.el)-.1,orb.r*Math.cos(orb.az)*Math.cos(orb.el));cam.lookAt(0,-.28,0);
          rd.render(scene,cam);
        }
      };
      api.resize();setQuality('standard');global.addEventListener('resize',()=>api.resize());return api;
    }
  };
})(window);
