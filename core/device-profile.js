/* PILAR · Device Profile
   Mendeteksi kelas perangkat (IFP/MPI Android, laptop iGPU, mobile, desktop) dan
   memberi anggaran render yang realistis. Dipakai oleh stage 3D & CSS.
   Tidak mengirim apa pun ke jaringan: hanya dibaca lokal. */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  const nav=global.navigator||{},ua=nav.userAgent||'';

  function gpuName(){
    try{
      const c=document.createElement('canvas');
      const gl=c.getContext('webgl2')||c.getContext('webgl');
      if(!gl)return {webgl:0,name:''};
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      const name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
      const v=(typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext)?2:1;
      const lose=gl.getExtension('WEBGL_lose_context');lose&&lose.loseContext();
      return {webgl:v,name:String(name||'')};
    }catch(_){return {webgl:0,name:''}}
  }

  const g=gpuName();
  const touch=nav.maxTouchPoints||0;
  const android=/Android/i.test(ua),ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/.test(ua)&&touch>1);
  const phoneUA=/Mobi|iPhone|iPod/i.test(ua);
  const scrW=Math.max(screen.width||0,screen.height||0)*(global.devicePixelRatio||1);
  const mali=/Mali|PowerVR|Adreno \(TM\) [1-6]\d\d\b/i.test(g.name); // GPU mobile kelas menengah-bawah
  const intelIGPU=/Intel/i.test(g.name);

  let tier='desktop';
  // IFP Android: layar fisik besar (>=3000 px), touch banyak titik, bukan UA ponsel.
  if(android&&!phoneUA&&(touch>=10||scrW>=3000))tier='ifp';
  else if(phoneUA||(android&&phoneUA))tier='mobile';
  else if(ios)tier='tablet';
  else if(intelIGPU)tier='laptop';
  // Laptop yang "meminjam" layar sentuh IFP lewat HDMI + USB-touch: tetap laptop GPU, tapi layar besar & multitouch.
  const bigTouch=!android&&touch>=10;

  /* Anggaran render: total piksel drawing-buffer per frame.
     Mali-G52 pada 4K sangat dibatasi bandwidth memori → render ±1080p lalu di-upscale browser. */
  const budget={
    ifp:     {maxPixels:1920*1080, maxDpr:1.25, shadow:'pcf',  shadowMap:1024, msaa:true,  env:true},
    mobile:  {maxPixels:1600*900,  maxDpr:2,    shadow:'pcf',  shadowMap:1024, msaa:true,  env:true},
    tablet:  {maxPixels:2048*1152, maxDpr:2,    shadow:'pcf',  shadowMap:1024, msaa:true,  env:true},
    laptop:  {maxPixels:2560*1440, maxDpr:2,    shadow:'soft', shadowMap:2048, msaa:true,  env:true},
    desktop: {maxPixels:3840*2160, maxDpr:2,    shadow:'soft', shadowMap:2048, msaa:true,  env:true}
  }[tier];
  if(mali&&tier!=='ifp')Object.assign(budget,{maxPixels:Math.min(budget.maxPixels,1600*900),shadow:'pcf'});

  const profile={
    tier,bigTouch,touchPoints:touch,gpu:g.name,webgl:g.webgl,mali,intelIGPU,
    reducedMotion:!!(global.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),
    budget,
    /* Pixel ratio optimal untuk host berukuran w×h CSS px yang ditampilkan dengan skala visual `scale`. */
    pixelRatio(w,h,quality,scale){
      const dpr=(global.devicePixelRatio||1)*(scale||1);
      const want={performance:Math.min(dpr,1),standard:Math.min(dpr,budget.maxDpr),realistic:Math.min(dpr,2)}[quality||'standard']||1;
      const capByPixels=Math.sqrt(budget.maxPixels/Math.max(1,w*h));
      return Math.max(.5,Math.min(want,capByPixels*(quality==='realistic'?1.25:1)));
    }
  };
  P.device=profile;
  try{
    const de=document.documentElement;
    de.dataset.device=tier;if(bigTouch)de.dataset.bigtouch='1';if(touch)de.dataset.touch='1';
  }catch(_){}
})(window);
