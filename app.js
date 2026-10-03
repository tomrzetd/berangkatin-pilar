(function(){
  'use strict';
  const P=window.PILAR,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let render=null,last=performance.now(),lastHud=0,loopStarted=false,uiBound=false;
  let selectedAppId='lorentz';
  const fmt=(x,d=2)=>Number(x).toFixed(d).replace('.',',');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function webglReady(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(_){return false}}
  const checks={WebGL:webglReady,Touch:()=>('ontouchstart' in window)||navigator.maxTouchPoints>0,Pointer:()=>('PointerEvent' in window),WASM:()=>typeof WebAssembly==='object',Kamera:()=>!!navigator.mediaDevices?.getUserMedia};
  function drawBootCaps(){
    const box=$('#bootCaps'); if(!box)return;
    box.innerHTML='';
    Object.entries(checks).forEach(([name,fn])=>{const ok=!!fn();const el=document.createElement('span');el.className='boot-cap '+(ok?'ok':'warn');el.textContent=(ok?'● ':'○ ')+name;box.appendChild(el)});
    $('#bootRuntime').textContent=(checks.WebGL()?'WebGL siap':'WebGL tidak tersedia')+' · '+(navigator.onLine?'online':'offline');
  }
  const inspectorNotes={
    lorentz:'Masuk Cepat tidak meminta kamera. Vision AI hanya dimuat setelah dipilih.',
    microscope:'Kamera hanya diminta setelah START dipilih di dalam Microscope Lab.',
    'rubik-orbit':'3D, solver, dan Vision AI tersedia di dalam app. Pilih mode interaksi setelah app dibuka.',
    'mbg-duel':'Touch, multitouch IFP, dan Vision AI dipilih di dalam MBG Delivery Duel.',
    soundscope:'Mikrofon atau kamera hanya diminta ketika tool terkait diaktifkan di dalam SoundScope.',
    'pak-taro':'Eksperimen, pola, dan Vision AI tersedia di dalam app. Kamera tetap berdasarkan izin pengguna.',
    pressure:'Sedang disiapkan. Kartu dapat dipilih untuk melihat status, tetapi belum dapat diluncurkan.'
  };
  function renderInspector(item){
    if(!item)return;
    $('#selectedAppIcon').textContent=item.icon||'✦';
    $('#selectedAppCategory').textContent=(item.category||'PILAR APP').toUpperCase();
    $('#selectedAppTitle').textContent=item.title||'PILAR App';
    $('#selectedAppSubtitle').textContent=item.subtitle||'';
    $('#selectedAppVersion').textContent='v'+(item.version||'—');
    $('#selectedAppStatus').textContent=item.status==='ready'?'SIAP':'SEGERA';
    $('#selectedAppNote').textContent=inspectorNotes[item.id]||'Pilih app, lalu gunakan tombol peluncur yang tersedia.';
    const isLorentz=item.id==='lorentz';
    $('#lorentzLaunchModes').hidden=!isLorentz;
    const open=$('#bootOpenApp');
    open.hidden=isLorentz;
    $('#launchPrompt').textContent=isLorentz?'Pilih cara masuk':item.status==='ready'?'Siap diluncurkan':'Dalam pengembangan';
    if(!isLorentz){
      $('#bootOpenIcon').textContent=item.icon||'✦';
      $('#bootOpenTitle').textContent=item.status==='ready'?'Buka '+item.title:'Segera hadir';
      $('#bootOpenDesc').textContent=item.status==='ready'
        ? (item.category||'PILAR App')+' · v'+item.version
        : 'App ini belum tersedia pada build PILAR saat ini.';
      $('#bootOpenBadge').textContent=item.status==='ready'?'BUKA':'SEGERA';
      open.disabled=item.status!=='ready';
      open.onclick=async()=>{
        if(item.status!=='ready')return;
        try{await window.PILAR_PULSE?.track?.('hub_app_launch',{app_id:item.id})}catch(_){}
        location.href=item.url;
      };
    }
    if(!isLorentz)$('#bootProgress').hidden=true;
  }
  function selectApp(id,{track=true,focus=false}={}){
    const apps=window.PILAR_APP_REGISTRY||[];
    const item=apps.find(x=>x.id===id)||apps[0];
    if(!item)return;
    selectedAppId=item.id;
    $('#pilarLibrary .pilar-app-card').forEach(card=>{
      const selected=card.dataset.appId===item.id;
      card.classList.toggle('current',selected);
      card.setAttribute('aria-pressed',selected?'true':'false');
      const badge=card.querySelector('em');
      const app=apps.find(x=>x.id===card.dataset.appId);
      if(badge&&app)badge.textContent=selected?'DIPILIH':(app.status==='ready'?'BUKA':'SEGERA');
    });
    renderInspector(item);
    if(track){try{window.PILAR_PULSE?.track?.('hub_app_select',{app_id:item.id})}catch(_){}}
    if(focus){
      const target=item.id==='lorentz'?$('#bootQuick'):$('#bootOpenApp');
      target?.focus();
    }
  }
  function renderLibrary(){
    const box=$('#pilarLibrary'); if(!box)return;
    const apps=window.PILAR_APP_REGISTRY||[];
    box.innerHTML='';
    apps.forEach(item=>{
      const b=document.createElement('button');
      b.className='pilar-app-card '+(item.status!=='ready'?'coming':'');
      b.type='button';
      b.dataset.appId=item.id;
      b.setAttribute('aria-pressed','false');
      b.innerHTML=`<span class="pilar-app-icon">${item.icon||'✦'}</span><span><strong>${item.title}</strong><small class="app-subtitle">${item.subtitle||''}</small><small>${item.category} · v${item.version}</small></span><em>${item.status==='ready'?'BUKA':'SEGERA'}</em>`;
      b.onclick=()=>selectApp(item.id,{track:true,focus:true});
      box.appendChild(b);
    });
    selectApp(selectedAppId,{track:false,focus:false});
  }
  function resetBootUI(){
    $('#bootProgress').hidden=true;
    $('#bootQuick').disabled=false;$('#bootVision').disabled=false;
    $('#bootBar').style.width='0%';$('#bootPercent').textContent='0%';
    $('#bootStepTitle').textContent='MENYIAPKAN PILAR';$('#bootMessage').textContent='Pilih mode untuk masuk ke Gaya Lorentz.';
    $('#bootStepList').innerHTML='';
    $$('#bootPhilosophy span').forEach(el=>el.className='');
  }
  function showHome(){
    const bootEl=$('#pilarBoot');
    resetBootUI();
    bootEl.classList.remove('is-leaving');
    bootEl.removeAttribute('aria-hidden');
    $('#appShell').setAttribute('aria-hidden','true');
    document.body.classList.add('boot-lock');
    selectApp('lorentz',{track:false,focus:false});
  }
  function loadScript(src){return new Promise((resolve,reject)=>{const old=document.querySelector(`script[data-dynamic="${src}"]`);if(old)return resolve();const s=document.createElement('script');s.src=src;s.dataset.dynamic=src;s.onload=resolve;s.onerror=()=>reject(new Error('Gagal memuat '+src));document.body.appendChild(s)})}
  function setBootStep(i,total,title,msg){
    const pct=Math.round((i/total)*100);$('#bootBar').style.width=pct+'%';$('#bootPercent').textContent=pct+'%';$('#bootStepTitle').textContent=title;$('#bootMessage').textContent=msg;
    [...$('#bootStepList').children].forEach((el,n)=>el.className=n<i?'done':n===i?'on':'');
    const philosophy=$$('#bootPhilosophy span');philosophy.forEach((el,n)=>el.className=n<i?'done':n===i?'on':'');
  }
  async function requestVision(){
    if(!checks.Kamera())throw new Error('Kamera tidak tersedia pada browser/perangkat ini.');
    await loadScript('input/vision-adapter.js');
    if(!P.vision||typeof P.vision.launchGate!=='function')throw new Error('Adapter Vision gagal dimuat.');
    const result=await P.vision.launchGate();
    if(P.vision)P.vision.setEnabled(!!result.enabled);
    return result;
  }

  function toast(a,b=''){const el=$('#toast');el.innerHTML='<b>'+a+'</b>'+(b?'<br><small>'+b+'</small>':'');el.classList.add('show');clearTimeout(toast.id);toast.id=setTimeout(()=>el.classList.remove('show'),2600)}
  function go(phase){P.state.patch(s=>{s.phase=phase});}

  function bindAppUI(){
    if(uiBound)return;uiBound=true;
    P.intent.on('GO_PHASE',go);
    P.intent.on('PREDICT',p=>P.state.patch(s=>{s.prediction=p}));
    P.intent.on('TOGGLE_SWITCH',()=>{
      P.state.patch(s=>{s.circuit.on=!s.circuit.on;if(s.circuit.on)s.missions.close=true});
      if(P.state.get().circuit.on){P.evidence.schedule('switch_on',1000);toast('Rangkaian tertutup','Amati arah pertama sebelum membuka semua vektor.')}else{P.evidence.schedule('switch_off',350);toast('Rangkaian terbuka','Arus menuju nol, gaya ikut hilang.')}
      P.score.sync();
    });
    P.intent.on('FLIP_BATTERY',()=>{P.state.patch(s=>{s.circuit.targetPolarity*=-1;s.circuit.batteryRotationTarget=s.circuit.targetPolarity>0?0:Math.PI;s.missions.flip=true});P.evidence.schedule('battery_flip',1200);toast('Baterai dibalik','Arah arus aktual berubah setelah baterai melewati setengah putaran.');P.score.sync();});
    P.intent.on('SET_PARAM',({k,v})=>{P.state.patch(s=>{s.params[k]=+v;if(k==='B'&&s.circuit.on)s.missions.bchange=true});if(P.state.get().circuit.on)P.evidence.schedule('param_'+k,850);P.score.sync()});
    P.intent.on('TOGGLE_REVEAL',key=>P.state.patch(s=>{s.reveal[key]=!s.reveal[key]}));
    P.intent.on('LOCK_PREDICTION',()=>{if(!P.state.get().prediction)return toast('Pilih tebakan dulu');go('coba');P.score.sync()});
    P.intent.on('RESET_EXPERIMENT',()=>{P.state.resetExperiment();toast('Eksperimen diulang','Tebakan tetap tersimpan agar bisa dibandingkan.');});

    $('#toPredict').onclick=()=>go('tebak');
    $$('#predictionGrid button').forEach(b=>b.onclick=()=>P.intent.dispatch('PREDICT',b.dataset.pred));
    $('#lockPrediction').onclick=()=>P.intent.dispatch('LOCK_PREDICTION');
    $('#switchBtn').onclick=()=>P.intent.dispatch('TOGGLE_SWITCH');$('#flipBtn').onclick=()=>P.intent.dispatch('FLIP_BATTERY');$('#resetBtn').onclick=()=>P.intent.dispatch('RESET_EXPERIMENT');
    $('#fieldBtn').onclick=()=>P.intent.dispatch('TOGGLE_REVEAL','field');$('#currentBtn').onclick=()=>P.intent.dispatch('TOGGLE_REVEAL','current');$('#forceBtn').onclick=()=>P.intent.dispatch('TOGGLE_REVEAL','force');
    for(const [id,k] of [['Bslider','B'],['Vslider','V'],['Rslider','R'],['proofV','V'],['proofR','R'],['proofB','B']])$('#'+id).oninput=e=>P.intent.dispatch('SET_PARAM',{k,v:e.target.value});
    $('#revealFormula').onclick=()=>{P.state.patch(s=>{s.reveal.formula=true});P.score.sync()};$('#toProof').onclick=()=>{if(!P.state.get().reveal.formula)return toast('Rumuskan temuan dulu');go('buktikan')};$('#toEngineering').onclick=()=>{if(!P.lorentzMissions.proofSuccess())return toast('Belum cukup bukti','Capai target α 35°–45° dan catat percobaan.');go('rekayasa')};
    $('#proofSwitch').onclick=()=>P.intent.dispatch('TOGGLE_SWITCH');$('#recordNow').onclick=()=>{const r=P.evidence.record('manual_proof');toast('Data dicatat','Percobaan #'+r.id+' masuk Evidence Ledger.')};
    $$('#engineeringModes button').forEach(b=>b.onclick=()=>P.state.patch(s=>{s.engineering.motion=b.dataset.motion}));
    $('#makeBrief').onclick=()=>{const motion=P.state.get().engineering.motion,need=$('#needInput').value,constraint=$('#constraintInput').value;if(!motion)return toast('Pilih jenis gerak dulu');const brief=P.engineering.makeBrief(motion,need,constraint);P.state.patch(s=>{s.engineering.need=need;s.engineering.constraint=constraint;s.engineering.brief=brief});P.score.sync();toast('Brief rekayasa dibuat','Sekarang buktikan ide itu dengan prototipe nyata.')};
    $('#rotateRoles').onclick=()=>P.state.patch(s=>{s.collab.round=(s.collab.round+1)%3});
    $('#copyReport').onclick=async()=>{const s=P.state.get();const rows=s.evidence.map(r=>`#${r.id} | B=${fmt(r.B,2)} T | I=${fmt(Math.abs(r.current),2)} A | Fideal=${fmt(Math.abs(r.fIdeal),3)} N | Fef=${fmt(Math.abs(r.fEffective),3)} N | α=${fmt(r.alpha,0)}° | ${r.reason}`).join('\n');const report=`LAPORAN BUKTI PILAR LORENTZ\nPrediksi awal: ${s.prediction||'-'}\nAHA reversal: ${s.aha.reversal?'terbukti':'belum'}\nAHA pengaruh B: ${s.aha.bEffect?'terbukti':'belum'}\n\nEVIDENCE LEDGER\n${rows||'Belum ada data'}\n\nBatas model: medan, hambatan kontak, panas kawat, sag baterai, hambatan udara, dan fleksibilitas tali disederhanakan.`;try{await navigator.clipboard.writeText(report);toast('Laporan bukti disalin')}catch(_){toast('Clipboard dibatasi browser','Jalankan lewat GitHub Pages/localhost untuk fitur salin.')}};
    $('#frontView').onclick=()=>render&&render.setView('front');$('#obliqueView').onclick=()=>render&&render.setView('oblique');
    $('#flowSpeed').oninput=e=>P.state.patch(s=>{s.ui.flowSpeed=+e.target.value});
    $('#rewindBtn').onclick=()=>{if(render&&render.rewindCurrent)render.rewindCurrent();toast('Animasi arus diulang','Fisika dan posisi kawat tidak di-reset.');};
    $('#qualitySelect').onchange=e=>P.state.patch(s=>{s.ui.quality=e.target.value});
    $$('#phaseTabs button').forEach(b=>b.onclick=()=>{const target=b.dataset.phase,s=P.state.get();if(['aha','buktikan','rekayasa'].includes(target)&&!s.aha.unlocked)return toast('Belum terbuka','Selesaikan pola reversal dan pengaruh B terlebih dahulu.');if(['buktikan','rekayasa'].includes(target)&&!s.reveal.formula)return toast('Belum terbuka','Masuk AHA dan rumuskan temuan terlebih dahulu.');if(target==='rekayasa'&&!P.lorentzMissions.proofSuccess())return toast('Belum terbuka','Buktikan dulu: capai target α 35°–45° dan catat hasil.');go(target)});

    $('#homeBtn').onclick=showHome;
    P.state.subscribe(updateUI);
    if(P.ownership)P.ownership.stamp($('#ownershipMark'));
    updateUI(P.state.get());
  }

  function updateUI(s){
    $$('#phaseTabs button').forEach(b=>b.classList.toggle('active',b.dataset.phase===s.phase));$$('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==s.phase);
    $('#xp').textContent=s.xp;
    $$('#predictionGrid button').forEach(b=>b.classList.toggle('selected',b.dataset.pred===s.prediction));$('#predictionFeedback').textContent=s.prediction?'Tebakan terkunci sementara: '+s.prediction.toUpperCase()+'.':'Belum ada tebakan yang dikunci.';
    for(const [k,id,d,u] of [['B','Bout',2,'T'],['V','Vout',1,'V'],['R','Rout',1,'Ω'],['V','proofVout',1,'V'],['R','proofRout',1,'Ω'],['B','proofBout',2,'T']])$('#'+id).textContent=fmt(s.params[k],d)+' '+u;
    for(const [id,k] of [['Bslider','B'],['Vslider','V'],['Rslider','R'],['proofV','V'],['proofR','R'],['proofB','B']])if(Math.abs(+$('#'+id).value-s.params[k])>.0001)$('#'+id).value=s.params[k];
    $('#switchBtn').textContent=s.circuit.on?'Buka sakelar':'Tutup sakelar';$('#proofSwitch').textContent=s.circuit.on?'Hentikan':'Jalankan';
    for(const [id,k] of [['fieldBtn','field'],['currentBtn','current'],['forceBtn','force']])$('#'+id).setAttribute('aria-pressed',s.reveal[k]);
    $('#fieldBtn').textContent=s.reveal.field?'Sembunyikan B':'Lihat medan B';$('#currentBtn').textContent=s.reveal.current?'Sembunyikan I':'Lihat arus I';$('#forceBtn').textContent=s.reveal.force?'Sembunyikan F':'Lihat gaya F';
    $('#formulaPanel').hidden=!s.reveal.formula;$('#revealFormula').disabled=!s.aha.unlocked;$('#toProof').disabled=!s.reveal.formula;
    $('#missionList [data-mission="close"]').classList.toggle('done',s.missions.close);$('#missionList [data-mission="flip"]').classList.toggle('done',s.missions.flip);$('#missionList [data-mission="bchange"]').classList.toggle('done',s.missions.bchange);
    if(s.aha.unlocked&&s.phase==='coba')$('#experimentHint').innerHTML='<b>💡 Pola sudah cukup kuat.</b> Tahap AHA terbuka. Masuk ke tab AHA.';else if(!s.missions.close)$('#experimentHint').textContent='Mulai dengan menutup sakelar.';else if(!s.missions.flip)$('#experimentHint').textContent='Sekarang balik baterai. Bandingkan arah gaya.';else if(!s.missions.bchange)$('#experimentHint').textContent='Ubah B cukup jauh dan lihat perubahan besar gaya.';else $('#experimentHint').textContent='Data sedang dibandingkan…';
    $('#alphaHud').textContent=fmt(Math.abs(s.dynamics.alpha*180/Math.PI),0)+'°';$('#currentHud').textContent=fmt(Math.abs(s.circuit.currentActual),2)+' A';$('#fIdealHud').textContent=fmt(Math.abs(s.dynamics.fIdeal),3)+' N';$('#fEffHud').textContent=fmt(Math.abs(s.dynamics.fEffective),3)+' N';
    $('#vectorLegend').hidden=!(s.reveal.field||s.reveal.current||s.reveal.force);
    if(Math.abs(+$('#flowSpeed').value-s.ui.flowSpeed)>.001)$('#flowSpeed').value=s.ui.flowSpeed;$('#flowSpeedOut').textContent=fmt(s.ui.flowSpeed,2)+'×';
    if($('#qualitySelect').value!==s.ui.quality)$('#qualitySelect').value=s.ui.quality;if(render&&render.quality!==s.ui.quality)render.setQuality(s.ui.quality);
    const body=$('#ledgerBody');body.innerHTML=s.evidence.slice().reverse().map(r=>`<tr><td>${r.id}</td><td>${fmt(r.B,2)}</td><td>${fmt(Math.abs(r.current),2)}</td><td>${fmt(Math.abs(r.fIdeal),3)}</td><td>${fmt(Math.abs(r.fEffective),3)}</td><td>${fmt(r.alpha,0)}°</td><td>${r.reason.replaceAll('_',' ')}</td></tr>`).join('');
    const proof=s.evidence.find(x=>x.alpha>=35&&x.alpha<=45);$('#proofHint').innerHTML=proof?'<b>Target tercapai.</b> Percobaan #'+proof.id+' berada pada rentang 35°–45°. Coba ulang untuk melihat apakah hasil konsisten.':'Cari kombinasi V, R, dan B yang membawa α ke rentang target.';
    $$('#engineeringModes button').forEach(b=>b.classList.toggle('selected',b.dataset.motion===s.engineering.motion));$('#engineeringBrief').textContent=s.engineering.brief||'Belum ada brief.';
    $$('#collabStrip [data-role]').forEach((el,i)=>el.classList.toggle('active',i===s.collab.round));
    if(s.aha.unlocked&&!['aha','buktikan','rekayasa'].includes(s.phase))$('#engineStatus').textContent='AHA siap dibuka';else $('#engineStatus').textContent='Physics state tunggal · WebGL aktif';
  }

  function startLoop(){if(loopStarted)return;loopStarted=true;last=performance.now();function loop(now){requestAnimationFrame(loop);const dt=Math.min(.03,(now-last)/1000);last=now;const s=P.state.get();P.lorentzPhysics.step(s,dt);P.evidence.tick(now);if(render)render.update(s,dt);if(now-lastHud>90){lastHud=now;updateUI(s)}}requestAnimationFrame(loop)}

  async function boot(mode){
    const quick=$('#bootQuick'),vision=$('#bootVision');quick.disabled=vision.disabled=true;$('#bootProgress').hidden=false;
    const steps=mode==='vision'?[
      ['CORE PILAR','Menghubungkan state, evidence engine, misi, dan UI…'],
      ['RENDERER','Menyiapkan WebGL dan rig Lorentz 3D…'],
      ['ASSET','Membangun material, magnet, kabel, sakelar, dan dudukan…'],
      ['INPUT','Mengaktifkan pointer, touch, dan multitouch…'],
      ['VISION AI','Memuat adapter Vision dan memeriksa izin kamera…'],
      ['READY','Semua subsistem siap.']
    ]:[
      ['CORE PILAR','Menghubungkan state, evidence engine, misi, dan UI…'],
      ['RENDERER','Menyiapkan WebGL dan rig Lorentz 3D…'],
      ['ASSET','Membangun material, magnet, kabel, sakelar, dan dudukan…'],
      ['INPUT','Mengaktifkan pointer, touch, dan multitouch…'],
      ['LITE MODE','Vision AI tidak dimuat — startup tetap ringan.'],
      ['READY','Semua subsistem siap.']
    ];
    $('#bootStepList').innerHTML=steps.map(()=>'<i></i>').join('');
    try{
      setBootStep(0,steps.length,steps[0][0],steps[0][1]);bindAppUI();await sleep(130);
      setBootStep(1,steps.length,steps[1][0],steps[1][1]);if(!checks.WebGL())throw new Error('WebGL tidak tersedia. Coba browser/perangkat lain.');if(!render)render=P.render3d.init($('#stage'));$('#stageBadge').textContent='3D siap · drag untuk memutar';await sleep(160);
      setBootStep(2,steps.length,steps[2][0],steps[2][1]);await sleep(160);
      setBootStep(3,steps.length,steps[3][0],steps[3][1]);await sleep(120);
      setBootStep(4,steps.length,steps[4][0],steps[4][1]);
      if(mode==='vision'){
        try{
          const vr=await requestVision();
          if(vr&&vr.enabled){
            $('#bootMessage').textContent='Smile recognition berhasil. Vision gate terbuka dan simulasi siap dimasuki.';
            $('#engineStatus').textContent='Masuk via Vision AI';
          }else{
            mode='standard';
            $('#bootMessage').textContent='Vision gate dilewati. Simulasi dilanjutkan dengan mouse/touch.';
            if(P.vision)P.vision.setEnabled(false);
          }
        }
        catch(e){$('#bootMessage').textContent=(e&&e.message?e.message:'Vision AI tidak aktif')+' Melanjutkan otomatis tanpa Vision AI.';mode='standard';if(P.vision)P.vision.setEnabled(false);await sleep(700)}
      }else await sleep(100);
      setBootStep(5,steps.length,steps[5][0],steps[5][1]);await sleep(160);setBootStep(steps.length,steps.length,'READY',mode==='vision'?'Vision AI siap. Memasuki simulasi…':'Mode cepat siap. Memasuki simulasi…');
      sessionStorage.setItem('pilar-input-mode',mode);$('#appShell').setAttribute('aria-hidden','false');startLoop();await sleep(230);$('#pilarBoot').classList.add('is-leaving');$('#pilarBoot').setAttribute('aria-hidden','true');document.body.classList.remove('boot-lock');
    }catch(e){console.error(e);$('#bootStepTitle').textContent='BOOT TERTAHAN';$('#bootMessage').textContent=e.message||'Terjadi kesalahan saat menyiapkan PILAR.';quick.disabled=vision.disabled=false;$('#engineStatus').textContent='Boot membutuhkan perhatian';}
  }

  drawBootCaps();
  renderLibrary();
  $('#bootQuick').onclick=()=>boot('standard');
  $('#bootVision').onclick=()=>boot('vision');
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();
