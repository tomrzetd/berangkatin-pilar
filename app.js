(function(){
  'use strict';
  const P=window.PILAR,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const state=P.state.get();let render=null,last=performance.now(),lastHud=0;
  const fmt=(x,d=2)=>Number(x).toFixed(d).replace('.',',');
  function toast(a,b=''){const el=$('#toast');el.innerHTML='<b>'+a+'</b>'+(b?'<br><small>'+b+'</small>':'');el.classList.add('show');clearTimeout(toast.id);toast.id=setTimeout(()=>el.classList.remove('show'),2600)}
  function go(phase){P.state.patch(s=>{s.phase=phase});}
  P.intent.on('GO_PHASE',go);
  P.intent.on('PREDICT',p=>P.state.patch(s=>{s.prediction=p}));
  P.intent.on('TOGGLE_SWITCH',()=>{
    P.state.patch(s=>{s.circuit.on=!s.circuit.on;if(s.circuit.on)s.missions.close=true});
    if(P.state.get().circuit.on){P.evidence.schedule('switch_on',1000);toast('Rangkaian tertutup','Amati arah pertama sebelum membuka semua vektor.')}else{P.evidence.schedule('switch_off',350);toast('Rangkaian terbuka','Arus menuju nol, gaya ikut hilang.')}
    P.score.sync();
  });
  P.intent.on('FLIP_BATTERY',()=>{
    P.state.patch(s=>{s.circuit.targetPolarity*=-1;s.circuit.batteryRotationTarget=s.circuit.targetPolarity>0?0:Math.PI;s.missions.flip=true});P.evidence.schedule('battery_flip',1200);toast('Baterai dibalik','Arah arus aktual berubah setelah baterai melewati setengah putaran.');P.score.sync();
  });
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
  $$('#phaseTabs button').forEach(b=>b.onclick=()=>{const target=b.dataset.phase,s=P.state.get();if(['aha','buktikan','rekayasa'].includes(target)&&!s.aha.unlocked)return toast('Belum terbuka','Selesaikan pola reversal dan pengaruh B terlebih dahulu.');if(['buktikan','rekayasa'].includes(target)&&!s.reveal.formula)return toast('Belum terbuka','Masuk AHA dan rumuskan temuan terlebih dahulu.');if(target==='rekayasa'&&!P.lorentzMissions.proofSuccess())return toast('Belum terbuka','Buktikan dulu: capai target α 35°–45° dan catat hasil.');go(target)});

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
    if(Math.abs(+$('#flowSpeed').value-s.ui.flowSpeed)>.001)$('#flowSpeed').value=s.ui.flowSpeed;
    $('#flowSpeedOut').textContent=fmt(s.ui.flowSpeed,2)+'×';
    const body=$('#ledgerBody');body.innerHTML=s.evidence.slice().reverse().map(r=>`<tr><td>${r.id}</td><td>${fmt(r.B,2)}</td><td>${fmt(Math.abs(r.current),2)}</td><td>${fmt(Math.abs(r.fIdeal),3)}</td><td>${fmt(Math.abs(r.fEffective),3)}</td><td>${fmt(r.alpha,0)}°</td><td>${r.reason.replaceAll('_',' ')}</td></tr>`).join('');
    const proof=s.evidence.find(x=>x.alpha>=35&&x.alpha<=45);$('#proofHint').innerHTML=proof?'<b>Target tercapai.</b> Percobaan #'+proof.id+' berada pada rentang 35°–45°. Coba ulang untuk melihat apakah hasil konsisten.':'Cari kombinasi V, R, dan B yang membawa α ke rentang target.';
    $$('#engineeringModes button').forEach(b=>b.classList.toggle('selected',b.dataset.motion===s.engineering.motion));$('#engineeringBrief').textContent=s.engineering.brief||'Belum ada brief.';
    $$('#collabStrip [data-role]').forEach((el,i)=>el.classList.toggle('active',i===s.collab.round));
    if(s.aha.unlocked&&!['aha','buktikan','rekayasa'].includes(s.phase))$('#engineStatus').textContent='AHA siap dibuka';else $('#engineStatus').textContent='Physics state tunggal · WebGL aktif';
  }
  P.state.subscribe(updateUI);

  try{render=P.render3d.init($('#stage'));$('#stageBadge').textContent='3D siap · drag untuk memutar';}catch(e){console.error(e);$('#stageBadge').textContent='3D gagal: '+e.message;$('#engineStatus').textContent='Fallback UI aktif'}
  function loop(now){requestAnimationFrame(loop);const dt=Math.min(.03,(now-last)/1000);last=now;const s=P.state.get();P.lorentzPhysics.step(s,dt);P.evidence.tick(now);if(render)render.update(s,dt);if(now-lastHud>90){lastHud=now;updateUI(s)}}
  requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();
