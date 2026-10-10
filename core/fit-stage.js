/* PILAR · Fit Stage — "kanvas logis" agar tata letak SAMA di IFP 65", laptop, dan HP.
   Seluruh <body> dirender pada ukuran logis (≥ 1280 × 640 px) lalu diskalakan ke layar.
   - IFP 4K / 1080p  → skala 1,5–3× (teks otomatis besar, terbaca dari belakang kelas)
   - Laptop 14" FHD  → skala ±1,2×
   - HP landscape    → skala ±0,6× (tata letak identik, tampilan lebih kecil)
   - HP portrait     → layar "putar perangkat" + tombol layar penuh/landscape.
   Raycast 3D tetap akurat karena stage.js memakai getBoundingClientRect(). */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  const W0=1280,H0=640;
  const de=document.documentElement;
  const fit={scale:1,w:W0,h:H0,enabled:true,listeners:[]};

  function vp(){
    const v=global.visualViewport;
    return {w:Math.round(v?v.width:innerWidth),h:Math.round(v?v.height:innerHeight)};
  }
  function apply(){
    const {w,h}=vp();
    const portrait=h>w*1.05;
    de.classList.toggle('pilar-portrait',portrait&&fit.enabled);
    if(!fit.enabled){de.removeAttribute('data-fit');fit.scale=1;return}
    // Portrait: hitung seolah landscape (layar putar menutupi), agar tata letak tidak melompat saat diputar balik.
    const lw=portrait?h:w,lh=portrait?w:h,s=Math.min(lw/W0,lh/H0);
    fit.scale=s;fit.w=lw/s;fit.h=lh/s;
    de.setAttribute('data-fit','');
    de.style.setProperty('--fit-s',s.toFixed(5));
    de.style.setProperty('--fit-w',fit.w.toFixed(2)+'px');
    de.style.setProperty('--fit-h',fit.h.toFixed(2)+'px');
    de.style.setProperty('--lvw',(fit.w/100).toFixed(3)+'px');
    de.style.setProperty('--lvh',(fit.h/100).toFixed(3)+'px');
    fit.listeners.forEach(fn=>{try{fn(fit)}catch(_){}});
  }
  fit.onChange=fn=>{fit.listeners.push(fn)};
  fit.refresh=apply;

  function rotateOverlay(){
    if(document.getElementById('pilarRotate'))return;
    const o=document.createElement('div');o.id='pilarRotate';o.setAttribute('role','dialog');o.setAttribute('aria-label','Putar perangkat');
    o.innerHTML='<div class="pr-card"><div class="pr-ico" aria-hidden="true">📱↻</div><b>Putar HP ke posisi mendatar</b><p>Lab Maya PILAR dirancang untuk layar lebar seperti papan interaktif kelas.</p><button type="button" id="pilarRotateBtn">Layar penuh &amp; mendatar</button></div>';
    document.body.appendChild(o);
    o.querySelector('#pilarRotateBtn').onclick=async()=>{
      try{await de.requestFullscreen?.({navigationUI:'hide'})}catch(_){}
      try{await screen.orientation?.lock?.('landscape')}catch(_){}
      apply();
    };
  }
  addEventListener('resize',apply);
  global.visualViewport&&visualViewport.addEventListener('resize',apply);
  addEventListener('orientationchange',()=>setTimeout(apply,120));
  document.addEventListener('fullscreenchange',()=>setTimeout(apply,60));
  apply();
  if(document.body)rotateOverlay();else document.addEventListener('DOMContentLoaded',rotateOverlay);
  P.fit=fit;
})(window);
