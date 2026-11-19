/* PILAR · Device Profile
   Mendeteksi kelas perangkat (IFP/MPI Android, laptop iGPU, mobile, desktop) dan
   memberi anggaran render yang realistis. Dipakai oleh stage 3D & CSS.
   Tidak mengirim apa pun ke jaringan: hanya dibaca lokal. */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  const nav=global.navigator||{},ua=nav.userAgent||'';

  function gpuName(){
    // Hasil disimpan per sesi: membuat konteks WebGL di Mali-G52 butuh puluhan ms dan bisa memicu kedip layar.
    try{const c=JSON.parse(sessionStorage.getItem('pilar_gpu')||'null');if(c&&typeof c.name==='string')return c}catch(_){}
    const r=probe();try{sessionStorage.setItem('pilar_gpu',JSON.stringify(r))}catch(_){}
    return r;
  }
  function probe(){
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
  const softGPU=/SwiftShader|llvmpipe|softpipe|Software/i.test(g.name); // tanpa GPU sungguhan (emulator, VM, driver rusak)

  let tier='desktop';
  // IFP Android: layar fisik besar (>=3000 px), touch banyak titik, bukan UA ponsel.
  if(android&&!phoneUA&&(touch>=10||scrW>=3000))tier='ifp';
  else if(phoneUA||(android&&phoneUA))tier='mobile';
  else if(ios||android)tier='tablet';   // tablet Android / IFP kecil tanpa 10 titik sentuh
  else if(intelIGPU)tier='laptop';
  // Laptop yang "meminjam" layar sentuh IFP lewat HDMI + USB-touch: tetap laptop GPU, tapi layar besar & multitouch.
  const bigTouch=!android&&touch>=10;

  /* Anggaran render: total piksel drawing-buffer per frame.
     Mali-G52 pada 4K sangat dibatasi bandwidth memori → render ±1080p lalu di-upscale browser. */
  const budget={
    ifp:     {maxPixels:2560*1440, maxDpr:2,    shadow:'pcf',  shadowMap:1024, msaa:true,  env:true},
    mobile:  {maxPixels:1600*900,  maxDpr:2,    shadow:'pcf',  shadowMap:1024, msaa:true,  env:true},
    tablet:  {maxPixels:2048*1152, maxDpr:2,    shadow:'pcf',  shadowMap:1024, msaa:true,  env:true},
    laptop:  {maxPixels:2560*1440, maxDpr:2,    shadow:'soft', shadowMap:2048, msaa:true,  env:true},
    desktop: {maxPixels:3840*2160, maxDpr:2,    shadow:'soft', shadowMap:2048, msaa:true,  env:true}
  }[tier];
  if(mali&&tier!=='ifp')Object.assign(budget,{maxPixels:Math.min(budget.maxPixels,1600*900),shadow:'pcf'});

  const profile={
    tier,bigTouch,touchPoints:touch,gpu:g.name,softGPU,webgl:g.webgl,mali,intelIGPU,
    reducedMotion:!!(global.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),
    budget,
    /* Pixel ratio untuk kanvas w×h (CSS px) yang tampil dengan skala visual `scale`.
       Target = resolusi FISIK layar (dpr × skala), dibatasi anggaran total piksel per kualitas.
       Versi lama membatasi dpr ke 1,25 → di IFP (dpr 2 × skala 1,5) gambar 3D di-upscale ±2,4× = BURAM. */
    pixelRatio(w,h,quality,scale){
      const native=(global.devicePixelRatio||1)*(scale||1);
      const mult={performance:.45,standard:1,realistic:1.8}[quality||'standard']||1;
      const cap=Math.sqrt(budget.maxPixels*mult/Math.max(1,w*h));
      return Math.max(.6,Math.min(native,cap));
    }
  };
  /* Mode efek: "lite" mematikan efek mahal (blur kaca, animasi dekoratif tanpa henti) yang di
     Mali-G52 4K memicu kedip & patah-patah. auto = lite untuk IFP / GPU Mali. */
  const FX_KEY='pilar_fx';
  function fxMode(){try{return localStorage.getItem(FX_KEY)||'auto'}catch(_){return'auto'}}
  function fxEffective(m){return m==='lite'||(m==='auto'&&(tier==='ifp'||mali||softGPU))?'lite':'full'}
  profile.fxMode=fxMode();profile.fx=fxEffective(profile.fxMode);
  profile.setFx=function(m){try{localStorage.setItem(FX_KEY,m)}catch(_){}profile.fxMode=m;profile.fx=fxEffective(m);try{document.documentElement.dataset.fx=profile.fx}catch(_){}return profile.fx};
  P.device=profile;
  try{
    const de=document.documentElement;
    de.dataset.device=tier;de.dataset.fx=profile.fx;if(bigTouch)de.dataset.bigtouch='1';if(touch)de.dataset.touch='1';
  }catch(_){}
  /* Skin Hub (Kalem/Gelap/Pink) ikut ke aplikasi. Hanya aplikasi yang memasang css/pilar-skin.css
     yang berubah tampilan; sisanya tetap seperti aslinya. data-app = slug folder apps/<slug>/. */
  try{
    let s='kalem';try{s=localStorage.getItem('pilar_skin')||'kalem'}catch(_){}
    if(!/^(kalem|gelap|pink)$/.test(s))s='kalem';
    const de=document.documentElement,m=/\/apps\/([^/]+)\//.exec(location.pathname);
    if(!de.dataset.skin)de.dataset.skin=s;if(m&&!de.dataset.app)de.dataset.app=m[1];
    profile.skin=de.dataset.skin;profile.light=profile.skin!=='gelap';
  }catch(_){}
  /* ===== Penjaga sentuhan (IFP multi-siswa) =====
     Di IFP/Android, tekan lama ATAU saat satu jari diangkat sementara jari teman masih menempel,
     browser bisa menganggapnya "klik kanan" → menu konteks muncul di tengah duel.
     Aturan: menu konteks hanya diizinkan untuk mouse sungguhan dan di kolom teks
     (input/textarea/contenteditable, atau elemen ber-atribut data-allow-contextmenu). */
  try{
    const now=()=>performance.now();let lastTouch=-1e9,active=0;
    const mark=()=>{lastTouch=now()};
    const opt={capture:true,passive:true};
    addEventListener('touchstart',e=>{active=e.touches.length;mark()},opt);
    addEventListener('touchend',e=>{active=e.touches.length;mark()},opt);
    addEventListener('touchcancel',e=>{active=e.touches.length;mark()},opt);
    addEventListener('pointerdown',e=>{if(e.pointerType&&e.pointerType!=='mouse')mark()},opt);
    addEventListener('pointerup',e=>{if(e.pointerType&&e.pointerType!=='mouse')mark()},opt);
    const editable=t=>t&&t.closest&&t.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-allow-contextmenu]');
    const fromTouch=e=>(e.pointerType&&e.pointerType!=='mouse')||(e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents)||active>0||now()-lastTouch<1800;
    addEventListener('contextmenu',e=>{if(editable(e.target))return;if(fromTouch(e)){e.preventDefault();e.stopPropagation()}},{capture:true});
    /* blok seleksi teks liar saat dua jari atau lebih menempel (bukan saat membaca dengan satu jari) */
    addEventListener('selectstart',e=>{if(active>1&&!editable(e.target))e.preventDefault()},{capture:true});
    /* klik ganda dari sentuhan beruntun dua siswa → jangan diterjemahkan sebagai zoom/klik ganda */
    addEventListener('dblclick',e=>{if(fromTouch(e)&&!editable(e.target)&&!e.target.closest?.('[data-allow-dblclick]'))e.preventDefault()},{capture:true});
    const st=document.createElement('style');st.id='pilarTouchGuard';
    st.textContent='html[data-touch] body{-webkit-touch-callout:none}'
      +'html[data-touch] :is(button,a,[role=button],label,summary,canvas,svg,img,video){-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}'
      +'html[data-touch] :is(button,a,[role=button],label,summary,input[type=range]){touch-action:manipulation}';
    (document.head||document.documentElement).appendChild(st);
    profile.touchGuard=true;
  }catch(_){}
})(window);
