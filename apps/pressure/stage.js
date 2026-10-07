/* PILAR · Lab Maya Tekanan — Stage 3D bersama (Three.js r128).
   Satu WebGL context dipakai bergantian oleh keempat simulasi. */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};

  function disposeTree(o){
    o.traverse(n=>{
      if(n.geometry)n.geometry.dispose();
      const m=n.material;if(!m)return;
      (Array.isArray(m)?m:[m]).forEach(mm=>{['map','bumpMap','emissiveMap'].forEach(k=>{if(mm[k])mm[k].dispose()});mm.dispose()});
    });
  }

  function create(host){
    const THREE=global.THREE;
    if(!THREE)throw new Error('Three.js tidak termuat. Periksa koneksi internet lalu muat ulang.');
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x10202f);
    const camera=new THREE.PerspectiveCamera(40,1,.05,200);
    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.prepend(renderer.domElement);
    renderer.domElement.style.cursor='grab';

    // pencahayaan dasar (scene boleh menambah/mengubah)
    const hemi=new THREE.HemisphereLight(0xd6e8ff,0x3a2c22,.85);scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xfff1dc,1.5);sun.position.set(6,11,8);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0004;
    function sunDefault(){sun.position.set(6,11,8);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});sun.shadow.camera.updateProjectionMatrix()}
    sunDefault();
    scene.add(sun);scene.add(sun.target);

    const orb={az:.6,el:.35,r:10,tx:0,ty:0,tz:0,taz:.6,tel:.35,tr:10,ttx:0,tty:0,ttz:0,minR:3,maxR:30,minEl:.03,maxEl:1.5};
    const stage={THREE,scene,camera,renderer,orb,sun,hemi,host,grabbables:[],onGrab:null,root:null,time:0,disposed:false};

    function applyCamera(dt){
      const k=1-Math.exp(-dt*9);
      orb.az+=(orb.taz-orb.az)*k;orb.el+=(orb.tel-orb.el)*k;orb.r+=(orb.tr-orb.r)*k;
      orb.tx+=(orb.ttx-orb.tx)*k;orb.ty+=(orb.tty-orb.ty)*k;orb.tz+=(orb.ttz-orb.tz)*k;
      const ce=Math.cos(orb.el);
      camera.position.set(orb.tx+orb.r*ce*Math.sin(orb.az),orb.ty+orb.r*Math.sin(orb.el),orb.tz+orb.r*ce*Math.cos(orb.az));
      camera.lookAt(orb.tx,orb.ty,orb.tz);
    }

    /* ---------- input: orbit, pinch-zoom, grab ---------- */
    const dom=renderer.domElement,ptrs=new Map(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
    let grab=null,lastPinch=0;
    function setRay(ev){const r=dom.getBoundingClientRect();ndc.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);return ray}
    stage.rayFromEvent=setRay;
    dom.addEventListener('pointerdown',e=>{
      dom.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(ptrs.size===1&&stage.onGrab&&stage.grabbables.length){
        const hits=setRay(e).intersectObjects(stage.grabbables,true);
        if(hits.length){grab=stage.onGrab(hits[0],e)||null;if(grab){dom.style.cursor='ns-resize';return}}
      }
      if(ptrs.size===2){const [a,b]=[...ptrs.values()];lastPinch=Math.hypot(a.x-b.x,a.y-b.y);if(grab){grab.end&&grab.end();grab=null}}
      dom.style.cursor='grabbing';
    });
    dom.addEventListener('pointermove',e=>{
      const p=ptrs.get(e.pointerId);
      if(!p){
        if(stage.onHover&&!grab){const hits=stage.grabbables.length?setRay(e).intersectObjects(stage.grabbables,true):[];dom.style.cursor=hits.length?'pointer':'grab'}
        return;
      }
      const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
      if(grab){grab.move&&grab.move(e,setRay(e),dx,dy);return}
      if(ptrs.size===2){const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);orb.tr=Math.max(orb.minR,Math.min(orb.maxR,orb.tr*(lastPinch/(d||1))));lastPinch=d;return}
      orb.taz-=dx*.006;orb.tel=Math.max(orb.minEl,Math.min(orb.maxEl,orb.tel+dy*.005));
    });
    const up=e=>{ptrs.delete(e.pointerId);try{dom.releasePointerCapture(e.pointerId)}catch(_){}
      if(grab&&ptrs.size===0){grab.end&&grab.end();grab=null}
      dom.style.cursor='grab';lastPinch=0};
    dom.addEventListener('pointerup',up);dom.addEventListener('pointercancel',up);
    dom.addEventListener('wheel',e=>{e.preventDefault();orb.tr=Math.max(orb.minR,Math.min(orb.maxR,orb.tr+e.deltaY*.012*orb.tr/10))},{passive:false});
    dom.style.touchAction='none';

    /* ---------- ukuran & kualitas ---------- */
    let quality='standard';
    function resize(){
      const w=Math.max(2,host.clientWidth),h=Math.max(2,host.clientHeight);
      const pr={performance:1,standard:Math.min(devicePixelRatio||1,1.5),realistic:Math.min(devicePixelRatio||1,2)}[quality];
      renderer.setPixelRatio(pr);renderer.setSize(w,h,false);dom.style.width='100%';dom.style.height='100%';
      camera.aspect=w/h;camera.updateProjectionMatrix();
    }
    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;ro&&ro.observe(host);
    addEventListener('resize',resize);resize();

    /* ---------- API ---------- */
    stage.setQuality=q=>{quality=q;sun.shadow.mapSize.set(q==='realistic'?2048:1024,q==='realistic'?2048:1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}resize()};
    stage.setView=v=>{ // v:{az,el,r,t:[x,y,z]}
      if(v.az!=null)orb.taz=v.az;if(v.el!=null)orb.tel=v.el;if(v.r!=null)orb.tr=v.r;
      if(v.t){orb.ttx=v.t[0];orb.tty=v.t[1];orb.ttz=v.t[2]}
    };
    stage.snapView=v=>{stage.setView(v);orb.az=orb.taz;orb.el=orb.tel;orb.r=orb.tr;orb.tx=orb.ttx;orb.ty=orb.tty;orb.tz=orb.ttz};
    stage.mount=(root,cfg={})=>{
      stage.unmount();sunDefault();stage.root=root;scene.add(root);stage.grabbables=[];stage.onGrab=null;stage.onHover=false;
      scene.background=new THREE.Color(cfg.bg??0x10202f);
      scene.fog=cfg.fog?new THREE.Fog(cfg.bg??0x10202f,cfg.fog[0],cfg.fog[1]):null;
      Object.assign(orb,{minR:cfg.minR??3,maxR:cfg.maxR??30,minEl:cfg.minEl??.03,maxEl:cfg.maxEl??1.5});
      if(cfg.view)stage.snapView(cfg.view);
    };
    stage.unmount=()=>{if(stage.root){scene.remove(stage.root);disposeTree(stage.root);stage.root=null}stage.grabbables=[];stage.onGrab=null;grab=null};
    stage.render=(dt)=>{stage.time+=dt;applyCamera(dt);renderer.render(scene,camera)};
    stage.dispose=()=>{stage.disposed=true;ro&&ro.disconnect();removeEventListener('resize',resize);stage.unmount();renderer.dispose();dom.remove()};

    /* ---------- utilitas ---------- */
    stage.sprite=(text,o={})=>{
      const cv=document.createElement('canvas');cv.width=o.w||256;cv.height=o.h||96;
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthTest:o.depthTest!==false}));
      sp.userData.cv=cv;sp.userData.opt=o;stage.setSpriteText(sp,text);
      const s=o.scale||1;sp.scale.set(s*cv.width/96,s*cv.height/96,1);return sp;
    };
    stage.setSpriteText=(sp,text,color)=>{
      const cv=sp.userData.cv,o=sp.userData.opt,g=cv.getContext('2d');
      if(sp.userData.last===text+(color||''))return;sp.userData.last=text+(color||'');
      g.clearRect(0,0,cv.width,cv.height);
      if(o.bg){g.fillStyle=o.bg;const r=14;g.beginPath();g.moveTo(r,6);g.arcTo(cv.width-4,6,cv.width-4,cv.height-6,r);g.arcTo(cv.width-4,cv.height-6,4,cv.height-6,r);g.arcTo(4,cv.height-6,4,6,r);g.arcTo(4,6,cv.width-4,6,r);g.fill()}
      g.fillStyle=color||o.color||'#eaf6ff';g.font=`${o.weight||700} ${o.size||44}px Inter,Segoe UI,sans-serif`;g.textAlign='center';g.textBaseline='middle';
      g.fillText(text,cv.width/2,cv.height/2+2);sp.material.map.needsUpdate=true;
    };
    stage.canvasTex=(w,h,draw,repeat)=>{
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);
      const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
      if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1])}return t;
    };
    stage.mesh=(geo,mat,x=0,y=0,z=0,parent,shadow=true)=>{
      const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;(parent||stage.root).add(m);return m;
    };
    stage.std=(color,o={})=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:.6,metalness:.05},o));
    return stage;
  }
  P.pressureStage={create,disposeTree};
})(window);

