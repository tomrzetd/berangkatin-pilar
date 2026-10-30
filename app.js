(function(){
  'use strict';

  const P=window.PILAR=window.PILAR||{};
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  let selectedAppId='lorentz';

  function webglReady(){
    if(P.device)return P.device.webgl>0;
    try{
      const c=document.createElement('canvas');
      const gl=c.getContext('webgl2')||c.getContext('webgl');
      if(gl)gl.getExtension('WEBGL_lose_context')?.loseContext();
      return !!gl;
    }catch(_){return false}
  }

  const checks={
    WebGL:webglReady,
    Touch:()=>('ontouchstart' in window)||navigator.maxTouchPoints>0,
    Pointer:()=>('PointerEvent' in window),
    WASM:()=>typeof WebAssembly==='object',
    Kamera:()=>!!navigator.mediaDevices?.getUserMedia
  };

  function syncBootRuntime(){
    const el=$('#bootRuntime');
    if(!el)return;
    el.textContent=(checks.WebGL()?'WebGL siap':'WebGL tidak tersedia')+' · '+(navigator.onLine?'online':'offline');
  }

  function drawBootCaps(){
    const box=$('#bootCaps');
    if(!box)return;
    box.replaceChildren();
    Object.entries(checks).forEach(([name,fn])=>{
      const ok=!!fn();
      const el=document.createElement('span');
      el.className='boot-cap '+(ok?'ok':'warn');
      el.textContent=(ok?'● ':'○ ')+name;
      box.appendChild(el);
    });
    syncBootRuntime();
  }

  const inspectorNotes={
    lorentz:'Simulasi Lorentz mendukung mouse, touch, multitouch IFP, dan Vision Challenge sebagai pintu masuk opsional.',
    microscope:'Microscope Lab meminta izin kamera hanya saat fitur kamera dipakai. Vision Challenge di Hub hanya menjadi pintu masuk ceria.',
    'rubik-orbit':'Rubik Orbit punya 3D, solver, dan Vision AI internal. Vision Challenge di Hub menjadi gerbang pembuka yang terpisah.',
    'mbg-duel':'MBG Duel mendukung touch, multitouch IFP, dan Vision AI. Dua pintu masuk tetap tersedia dari Hub.',
    soundscope:'SoundScope baru meminta mikrofon/kamera saat fitur terkait dipakai. Vision Challenge tidak menyalakan audio.',
    'pak-taro':'Pak Taro punya eksperimen, pola, dan Vision AI internal. Gerbang Vision di Hub tetap opsional.',
    'air-writing':'Air Writing memakai kamera untuk gesture/air writing saat fitur terkait dipilih.',
    puzzlesnap:'PuzzleSnap mengubah foto atau gambar menjadi puzzle 3×3–5×5, mendukung touch/multitouch IFP dan pinch gesture.',
    pressure:'Empat simulasi 3D: tekanan zat padat, hidrostatis, lift hidrolik (Pascal), dan gaya angkat drone. Mouse, touch, multitouch/IFP; tanpa kamera.',
    'frost-breakout':'Arcade pemecah es dengan mode debug dan rekayasa versi sendiri; tidak membutuhkan kamera untuk masuk.',
    bioweb:'Jejaring hidup Gunung Ciremai 3D dengan skenario dan cincin waktu.',
    'hunter-ball':'Duel gerak parabola untuk dua tim dengan kontrol sentuh.',
    'frost-snake':'Duel numerasi dua tim berbasis touch/multitouch.',
    'baterai-lab':'Petualangan baterai lithium-ion dengan tema Ceria dan eksperimen interaktif.',
    'jejak-kata':'Literasi: baca buku cerita, temukan kata kunci, lalu hubungkan ke topik besar dengan kabel node. Ada topik jebakan dan mode tanding 2 tim.'
  };

  function apps(){return Array.isArray(window.PILAR_APP_REGISTRY)?window.PILAR_APP_REGISTRY:[]}

  function selectedApp(){
    const list=apps();
    return list.find(x=>x.id===selectedAppId)||list[0]||null;
  }

  function renderInspector(item){
    if(!item)return;
    $('#selectedAppIcon').textContent=item.icon||'✦';
    $('#selectedAppCategory').textContent=(item.category||'PILAR APP').toUpperCase();
    $('#selectedAppTitle').textContent=item.title||'PILAR App';
    $('#selectedAppSubtitle').textContent=item.subtitle||'';
    $('#selectedAppVersion').textContent='v'+(item.version||'—');
    $('#selectedAppStatus').textContent=item.status==='ready'?'SIAP':'SEGERA';

    const ready=item.status==='ready';
    const visionEligible=item.visionGate!==false;
    $('#launchPrompt').textContent=ready?(visionEligible?'Pilih cara masuk':'Buka aplikasi'):'Dalam pengembangan';
    $('#bootQuickTitle').textContent=item.id==='lorentz'?'Masuk Cepat':'Buka '+item.title;
    $('#bootQuickDesc').textContent=item.id==='lorentz'
      ?'Mission 00 · touch/multitouch IFP. Masuk tanpa kamera; Vision AI tetap opsional di dalam Lab Maya.'
      :(item.category||'PILAR App')+' · v'+item.version+' · langsung masuk tanpa challenge kamera.';
    $('#bootVisionDesc').textContent=item.id==='lorentz'
      ?'Masuk langsung ke Mission 00 dengan hand pose + face wireframe opsional.'
      :'Selesaikan tantangan kamera singkat sebelum aplikasi terbuka.';
    $('#selectedAppNote').textContent=inspectorNotes[item.id]||'Dua pintu tersedia: langsung masuk atau selesaikan Vision Challenge.';
    $('#bootVision').hidden=!visionEligible;
    $('#bootQuick').disabled=!ready;
    $('#bootVision').disabled=!ready||!visionEligible;
  }

  function selectApp(id,{track=true,focus=false}={}){
    const list=apps();
    const item=list.find(x=>x.id===id)||list[0];
    if(!item)return;
    selectedAppId=item.id;

    $$('#pilarLibrary .pilar-app-card').forEach(card=>{
      const selected=card.dataset.appId===item.id;
      card.classList.toggle('current',selected);
      card.setAttribute('aria-pressed',selected?'true':'false');
      const badge=card.querySelector('em');
      const app=list.find(x=>x.id===card.dataset.appId);
      if(badge&&app)badge.textContent=selected?'DIPILIH':(app.status==='ready'?'BUKA':'SEGERA');
    });

    renderInspector(item);
    if(track){try{window.PILAR_PULSE?.track?.('hub_app_select',{app_id:item.id})}catch(_){}}
    if(focus)$('#bootQuick')?.focus();
  }

  function make(tag,className,text){
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=text;
    return el;
  }

  function renderLibrary(){
    const box=$('#pilarLibrary');
    if(!box)return;
    box.replaceChildren();

    apps().forEach(item=>{
      const b=make('button','pilar-app-card '+(item.status!=='ready'?'coming':''));
      b.type='button';
      b.dataset.appId=item.id;
      b.setAttribute('aria-pressed','false');

      const icon=make('span','pilar-app-icon',item.icon||'✦');
      const copy=make('span');
      copy.append(
        make('strong','',item.title||'PILAR App'),
        make('small','app-subtitle',item.subtitle||''),
        make('small','',(item.category||'PILAR App')+' · v'+(item.version||'—'))
      );
      const badge=make('em','',item.status==='ready'?'BUKA':'SEGERA');
      b.append(icon,copy,badge);
      b.addEventListener('click',()=>selectApp(item.id,{track:true,focus:true}));
      box.appendChild(b);
    });

    selectApp(selectedAppId,{track:false,focus:false});
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-dynamic="'+src+'"]');
      if(old)return resolve();
      const s=document.createElement('script');
      s.src=src;
      s.dataset.dynamic=src;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Gagal memuat '+src));
      document.body.appendChild(s);
    });
  }

  async function requestVision(item=selectedApp()){
    if(!checks.Kamera())throw new Error('Kamera tidak tersedia pada browser/perangkat ini.');
    await loadScript('input/vision-adapter.js');
    if(!P.vision||typeof P.vision.launchGate!=='function')throw new Error('Adapter Vision gagal dimuat.');
    const result=await P.vision.launchGate({
      challenge:'auto',
      appId:item?.id||'pilar',
      appTitle:item?.title||'PILAR'
    });
    if(P.vision)P.vision.setEnabled(!!result.enabled);
    return result;
  }

  const HUB_BASE=new URL('./',location.href);

  function closeFullscreenAppHost(){
    const host=document.getElementById('pilarFullscreenAppHost');
    if(!host)return;
    const frame=host.querySelector('iframe');
    if(frame)frame.src='about:blank';
    host.remove();
    document.body.classList.remove('pilar-app-host-open');
    try{window.PILAR_PULSE?.setApp?.('hub')}catch(_){}
  }

  function openInFullscreenHost(url,item){
    if(!document.fullscreenElement)return false;

    closeFullscreenAppHost();
    const host=document.createElement('section');
    host.id='pilarFullscreenAppHost';
    host.className='pilar-fullscreen-app-host';
    host.setAttribute('aria-label',(item?.title||'PILAR App')+' · fullscreen');

    const frame=document.createElement('iframe');
    frame.className='pilar-fullscreen-app-frame';
    frame.title=item?.title||'PILAR App';
    frame.allow='camera; microphone; fullscreen; autoplay; clipboard-read; clipboard-write';
    frame.allowFullscreen=true;

    host.appendChild(frame);
    document.body.appendChild(host);
    document.body.classList.add('pilar-app-host-open');

    frame.addEventListener('load',()=>{
      try{
        const p=frame.contentWindow.location.pathname;
        if(p===HUB_BASE.pathname||p===HUB_BASE.pathname+'index.html')closeFullscreenAppHost();
      }catch(_){}
    });

    frame.src=new URL(url,HUB_BASE).href;
    return true;
  }

  function openAppUrl(url,item){
    if(openInFullscreenHost(url,item))return;
    location.href=url;
  }

  async function launchSelected(mode){
    const item=selectedApp();
    if(!item||item.status!=='ready')return;
    if(item.visionGate===false)mode='standard';

    if(mode==='standard'){
      try{await window.PILAR_PULSE?.track?.('hub_app_launch',{app_id:item.id,entry:'quick'})}catch(_){}
      const url=item.id==='lorentz'
        ?item.url+(item.url.includes('?')?'&':'?')+'pilarEntry=quick'
        :item.url;
      openAppUrl(url,item);
      return;
    }

    const quick=$('#bootQuick');
    const vision=$('#bootVision');
    quick.disabled=true;
    vision.disabled=true;
    $('#selectedAppNote').textContent='Vision Challenge sedang disiapkan… kamera hanya dipakai untuk challenge ini.';

    try{
      const vr=await requestVision(item);
      if(vr&&vr.enabled){
        try{
          await window.PILAR_PULSE?.track?.('hub_app_launch',{
            app_id:item.id,
            entry:'vision',
            challenge:vr.challenge||vr.via
          });
        }catch(_){}
        const sep=item.url.includes('?')?'&':'?';
        openAppUrl(item.url+sep+'pilarEntry=vision',item);
        return;
      }
      $('#selectedAppNote').textContent='Challenge belum diselesaikan. Pilih Vision Challenge lagi atau gunakan Masuk Cepat.';
    }catch(e){
      console.error(e);
      $('#selectedAppNote').textContent=(e?.message||'Vision Challenge gagal dimuat')+' Gunakan Masuk Cepat bila perlu.';
    }

    quick.disabled=false;
    vision.disabled=false;
  }

  const fullscreenBtn=$('#bootFullscreenBtn');

  async function toggleFullscreen(){
    if(!fullscreenBtn)return;
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch(e){console.warn('Fullscreen tidak tersedia',e)}
  }

  function syncFullscreen(){
    if(!fullscreenBtn)return;
    fullscreenBtn.hidden=!document.fullscreenEnabled;
    const on=!!document.fullscreenElement;
    document.documentElement.dataset.pilarFullscreen=on?'on':'off';
    fullscreenBtn.textContent=on?'⤢':'⛶';
    fullscreenBtn.setAttribute('aria-pressed',on?'true':'false');
    fullscreenBtn.title=on?'Keluar layar penuh':'Layar penuh';
    fullscreenBtn.setAttribute('aria-label',fullscreenBtn.title);
  }

  const fxBtn=$('#bootFxBtn');

  function syncFx(){
    if(!fxBtn||!P.device)return;
    const mode=P.device.fxMode;
    const label={auto:'Auto',lite:'Ringan',full:'Penuh'}[mode]||'Auto';
    fxBtn.textContent='⚡ '+label;
    fxBtn.title='Mode efek: '+label+(mode==='auto'?' (sekarang '+(P.device.fx==='lite'?'ringan':'penuh')+')':'')+' · ketuk untuk ganti';
    fxBtn.setAttribute('aria-label',fxBtn.title);
  }

  drawBootCaps();
  renderLibrary();

  if(fullscreenBtn){
    fullscreenBtn.addEventListener('click',toggleFullscreen);
    document.addEventListener('fullscreenchange',syncFullscreen);
    syncFullscreen();
  }

  if(fxBtn){
    if(!P.device)fxBtn.hidden=true;
    else{
      fxBtn.addEventListener('click',()=>{
        const order=['auto','lite','full'];
        const next=order[(order.indexOf(P.device.fxMode)+1)%order.length];
        P.device.setFx(next);
        syncFx();
      });
      syncFx();
    }
  }

  $('#bootQuick')?.addEventListener('click',()=>launchSelected('standard'));
  $('#bootVision')?.addEventListener('click',()=>launchSelected('vision'));
  window.addEventListener('online',syncBootRuntime);
  window.addEventListener('offline',syncBootRuntime);

  try{window.PILAR_PULSE?.setApp?.('hub')}catch(_){}

  if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
    navigator.serviceWorker.register('service-worker.js').catch(err=>console.warn('Service worker gagal didaftarkan',err));
  }
})();
