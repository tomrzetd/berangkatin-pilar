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

  let stage_env=null;
  function create(host){
    const THREE=global.THREE;
    if(!THREE)throw new Error('Three.js tidak termuat. Periksa koneksi internet lalu muat ulang.');
    const REDUCE=!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x10202f);
    const camera=new THREE.PerspectiveCamera(40,1,.05,200);
    const DEV=P.device||{tier:'desktop',budget:{shadow:'soft',shadowMap:2048,msaa:true,env:true},pixelRatio:(w,h,q)=>Math.min(devicePixelRatio||1,q==='realistic'?2:1.5)};
    const renderer=new THREE.WebGLRenderer({antialias:DEV.budget.msaa!==false,powerPreference:'high-performance',stencil:false});
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    // Mali-G52 (IFP) & HP: PCF biasa jauh lebih murah dari PCFSoft; kualitas visual nyaris sama untuk bayangan kontak.
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=DEV.budget.shadow==='soft'?THREE.PCFSoftShadowMap:THREE.PCFShadowMap;
    renderer.physicallyCorrectLights=false;
    host.prepend(renderer.domElement);
    renderer.domElement.style.cursor='grab';

    // pencahayaan dasar (scene boleh menambah/mengubah)
    const hemi=new THREE.HemisphereLight(0xd6e8ff,0x3a2c22,DEV.budget.env!==false?.55:.85);scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xfff1dc,1.5);sun.position.set(6,11,8);sun.castShadow=true;
    sun.shadow.mapSize.set(Math.min(1024,DEV.budget.shadowMap||1024),Math.min(1024,DEV.budget.shadowMap||1024));sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;

    /* Lingkungan pantul (IBL) prosedural — tanpa file HDR, ±20 ms sekali di awal.
       Tanpa ini, material logam (metalness>.5) tampak hitam/datar karena tidak ada yang dipantulkan. */
    if(DEV.budget.env!==false&&THREE.PMREMGenerator){
      try{
        // Panorama ruang kelas sederhana (equirect 256×128): langit-langit terang, jendela, lantai gelap.
        const cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');
        const sky=g.createLinearGradient(0,0,0,128);sky.addColorStop(0,'#c9d6e2');sky.addColorStop(.48,'#7d8c9b');sky.addColorStop(.52,'#3a3f45');sky.addColorStop(1,'#1d2329');
        g.fillStyle=sky;g.fillRect(0,0,256,128);
        g.fillStyle='#fff6e6';g.fillRect(96,4,64,10);                 // lampu
        g.fillStyle='#e6f2ff';g.fillRect(20,34,40,26);g.fillRect(190,34,40,26); // jendela
        const eq=new THREE.CanvasTexture(cv);eq.mapping=THREE.EquirectangularReflectionMapping;eq.encoding=THREE.sRGBEncoding;
        const pm=new THREE.PMREMGenerator(renderer);
        const rt=pm.fromEquirectangular(eq);scene.environment=rt.texture;pm.dispose();eq.dispose();
        stage_env=rt;
      }catch(e){console.warn('[PILAR] IBL tidak tersedia',e)}
    }
    function sunDefault(){sun.position.set(6,11,8);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});sun.shadow.camera.updateProjectionMatrix()}
    sunDefault();
    scene.add(sun);scene.add(sun.target);

    const orb={az:.6,el:.35,r:10,tx:0,ty:0,tz:0,taz:.6,tel:.35,tr:10,ttx:0,tty:0,ttz:0,minR:3,maxR:30,minEl:.03,maxEl:1.5};
    const stage={THREE,scene,camera,renderer,orb,sun,hemi,host,grabbables:[],onGrab:null,root:null,time:0,disposed:false,device:DEV};

    function applyCamera(dt){
      const k=REDUCE?1:1-Math.exp(-dt*9);
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
    // Telapak tangan / lengan bersandar di IFP: area kontak besar → abaikan. Maks 2 jari dipakai untuk navigasi.
    const isPalm=e=>e.pointerType==='touch'&&((e.width||0)>70||(e.height||0)>70);
    let lastMid=null;
    dom.addEventListener('pointerdown',e=>{
      if(isPalm(e)||(ptrs.size>=2&&!ptrs.has(e.pointerId)))return;
      dom.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(ptrs.size===1&&stage.onGrab&&stage.grabbables.length){
        const hits=setRay(e).intersectObjects(stage.grabbables,true);
        if(hits.length){grab=stage.onGrab(hits[0],e)||null;if(grab){dom.style.cursor='ns-resize';return}}
      }
      if(ptrs.size===2){const [a,b]=[...ptrs.values()];lastPinch=Math.hypot(a.x-b.x,a.y-b.y);lastMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(grab){grab.end&&grab.end();grab=null}}
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
      if(ptrs.size===2){const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);orb.tr=Math.max(orb.minR,Math.min(orb.maxR,orb.tr*(lastPinch/(d||1))));lastPinch=d;
        // geser dua jari = pan target kamera (dibatasi agar objek tidak "hilang")
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(lastMid){const r=dom.getBoundingClientRect(),k=orb.r/Math.max(200,r.height)*1.1,mx=(mid.x-lastMid.x)*k,my=(mid.y-lastMid.y)*k;
          orb.ttx=Math.max(-6,Math.min(6,orb.ttx-mx*Math.cos(orb.az)));orb.ttz=Math.max(-6,Math.min(6,orb.ttz+mx*Math.sin(orb.az)));orb.tty=Math.max(-5,Math.min(6,orb.tty+my))}
        lastMid=mid;return}
      orb.taz-=dx*.006;orb.tel=Math.max(orb.minEl,Math.min(orb.maxEl,orb.tel+dy*.005));
    });
    const up=e=>{ptrs.delete(e.pointerId);try{dom.releasePointerCapture(e.pointerId)}catch(_){}
      if(grab&&ptrs.size===0){grab.end&&grab.end();grab=null}
      dom.style.cursor='grab';lastPinch=0;lastMid=null};
    dom.addEventListener('pointerup',up);dom.addEventListener('pointercancel',up);
    dom.addEventListener('wheel',e=>{e.preventDefault();orb.tr=Math.max(orb.minR,Math.min(orb.maxR,orb.tr+e.deltaY*.012*orb.tr/10))},{passive:false});
    dom.style.touchAction='none';

    /* ---------- ukuran & kualitas ---------- */
    let quality='standard',resScale=1,lastPR=0;
    function resize(){
      const w=Math.max(2,host.clientWidth),h=Math.max(2,host.clientHeight);
      const fitS=(P.fit&&P.fit.scale)||1;               // body diskalakan oleh fit-stage → resolusi fisik = w·fitS
      const pr=Math.max(.35,DEV.pixelRatio(w,h,quality,fitS)*resScale);
      if(Math.abs(pr-lastPR)>.01){renderer.setPixelRatio(pr);lastPR=pr}
      renderer.setSize(w,h,false);dom.style.width='100%';dom.style.height='100%';
      camera.aspect=w/h;camera.updateProjectionMatrix();
      stage.pixelRatio=pr;
    }
    P.fit&&P.fit.onChange&&P.fit.onChange(()=>resize());
    /* Resolusi dinamis: jaga 50–60 fps di Mali-G52 dengan menurunkan resolusi dulu (hampir tak terlihat di layar 65"),
       baru turun kualitas (bayangan) bila masih berat. Dipanggil tiap frame dengan durasi frame (detik). */
    let ema=1/60,nextAdapt=0;
    stage.adapt=(frameSec,now)=>{
      if(frameSec>.25)return;ema=ema*.93+frameSec*.07;
      if(now<nextAdapt)return;nextAdapt=now+1500;
      const old=resScale;
      if(ema>1/45&&resScale>.6)resScale=Math.max(.6,resScale-.1);
      else if(ema<1/58&&resScale<1)resScale=Math.min(1,resScale+.05);
      if(old!==resScale)resize();
      return ema;
    };
    stage.fpsEstimate=()=>1/ema;
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
    stage.dispose=()=>{stage.disposed=true;ro&&ro.disconnect();removeEventListener('resize',resize);stage.unmount();if(stage_env){stage_env.dispose();stage_env=null}renderer.dispose();dom.remove()};

    /* ---------- utilitas ---------- */
    stage.sprite=(text,o={})=>{
      const cv=document.createElement('canvas');cv.width=o.w||256;cv.height=o.h||96;
      const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
      tex.anisotropy=Math.min(DEV.tier==='ifp'||DEV.tier==='mobile'?4:8,renderer.capabilities.getMaxAnisotropy?renderer.capabilities.getMaxAnisotropy():1);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:o.depthTest!==false,depthWrite:!!o.depthWrite,opacity:o.opacity??1}));
      sp.userData.cv=cv;sp.userData.opt=o;stage.setSpriteText(sp,text);
      const s=o.scale||1;sp.scale.set(s*cv.width/96,s*cv.height/96,1);return sp;
    };
    stage.setSpriteText=(sp,text,color)=>{
      const cv=sp.userData.cv,o=sp.userData.opt,g=cv.getContext('2d');
      const key=String(text??'')+'|'+(color||'');if(sp.userData.last===key)return;sp.userData.last=key;
      const padX=o.padX??18,padY=o.padY??12,maxW=cv.width-padX*2,maxH=cv.height-padY*2;
      const align=o.align||'center',size0=o.size||44,minSize=o.minSize||Math.max(16,Math.round(size0*.58)),maxLines=o.maxLines||4;
      const font=s=>`${o.weight||700} ${s}px Inter,Segoe UI,sans-serif`;
      const wrap=(raw,size)=>{
        g.font=font(size);
        const out=[];
        String(raw??'').split(/\n/).forEach(block=>{
          const words=block.trim()?block.trim().split(/\s+/):[''];
          let line=words.shift()||'';
          if(!words.length){out.push(line);return}
          words.forEach(w=>{
            const test=line?line+' '+w:w;
            if(line&&g.measureText(test).width>maxW){out.push(line);line=w}else line=test;
          });
          out.push(line);
        });
        return out;
      };
      let size=size0,lines=wrap(text,size),lineH=Math.round(size*1.15);
      while(size>minSize&&(lines.length>maxLines||lines.length*lineH>maxH)){size-=2;lines=wrap(text,size);lineH=Math.round(size*1.15)}
      if(lines.length>maxLines){
        lines=lines.slice(0,maxLines);
        let last=lines[maxLines-1];
        while(last.length>1&&g.measureText(last+'…').width>maxW)last=last.slice(0,-1);
        lines[maxLines-1]=last+'…';
      }
      g.clearRect(0,0,cv.width,cv.height);
      if(o.bg){const bgPad=o.bgPad??4,r=o.radius??14;g.fillStyle=o.bg;g.beginPath();g.moveTo(r,bgPad+2);g.arcTo(cv.width-bgPad,bgPad+2,cv.width-bgPad,cv.height-bgPad,r);g.arcTo(cv.width-bgPad,cv.height-bgPad,bgPad,cv.height-bgPad,r);g.arcTo(bgPad,cv.height-bgPad,bgPad,bgPad+2,r);g.arcTo(bgPad,bgPad+2,cv.width-bgPad,bgPad+2,r);g.fill()}
      g.fillStyle=color||o.color||'#eaf6ff';g.font=font(size);g.textAlign=align;g.textBaseline='middle';
      g.lineJoin='round';g.lineWidth=Math.max(2,Math.round(size*.12));g.strokeStyle=o.stroke||'rgba(5,10,16,.45)';
      g.shadowColor='rgba(0,0,0,.18)';g.shadowBlur=4;
      const x=align==='left'?padX:align==='right'?cv.width-padX:cv.width/2;
      const y0=(cv.height-(lines.length-1)*lineH)/2+(o.yOffset||1);
      lines.forEach((line,i)=>{const y=y0+i*lineH;g.strokeText(line,x,y);g.fillText(line,x,y)});
      sp.material.map.needsUpdate=true;
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

