/* PILAR · Lab Maya Tekanan — alur belajar 6 fase (LIHAT → TEBAK → COBA → AHA → BUKTIKAN → REKAYASA) */
(function(){
  'use strict';
  const P=window.PILAR,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',',');
  const PHASES=[['lihat','1 Lihat'],['tebak','2 Tebak'],['coba','3 Coba'],['aha','4 AHA'],['buktikan','5 Buktikan'],['rekayasa','6 Rekayasa']];
  const NATURAL_STEPS=[['amati','1 Amati'],['coba','2 Coba'],['pahami','3 Pahami'],['rancang','4 Rancang']];
  const S={labId:null,labs:{},xp:0,quality:'standard'};
  let stage=null,scene=null,spec=null,panelEls=null,dock=null,lastKey='',loopOn=false,lastT=0,lastUi=0,lastChk=0;

  const cur=()=>S.labs[S.labId];
  const naturalUX=()=>spec&&spec.studentUX==='natural-solid-v1';
  const phaseGroup=ph=>ph==='lihat'||ph==='tebak'?'amati':ph==='coba'?'coba':ph==='aha'||ph==='buktikan'?'pahami':'rancang';
  function naturalTarget(step,st){
    if(step==='amati')return st.locked?'tebak':'lihat';
    if(step==='coba')return'coba';
    if(step==='pahami')return st.formula?'buktikan':'aha';
    return'rekayasa';
  }
  function renderPhaseTabs(){
    const nav=$('#phaseTabs');if(!nav)return;
    if(naturalUX()){
      nav.classList.add('natural-flow');
      nav.innerHTML=NATURAL_STEPS.map(p=>`<button data-step="${p[0]}">${p[1]}</button>`).join('');
      $('button',nav).forEach(b=>b.onclick=()=>go(naturalTarget(b.dataset.step,cur())));
    }else{
      nav.classList.remove('natural-flow');
      nav.innerHTML=PHASES.map(p=>`<button data-phase="${p[0]}">${p[1]}</button>`).join('');
      $('button',nav).forEach(b=>b.onclick=()=>go(b.dataset.phase));
    }
  }
  function makeLab(sp){
    const missions={};sp.missions.forEach(m=>missions[m.id]=false);
    return{id:sp.id,phase:'lihat',prediction:null,locked:false,predCorrect:null,params:sp.defaults(),reveal:{},missions,aha:false,formula:false,
      evidence:[],seq:0,proofDone:false,eng:sp.engDefaults?sp.engDefaults():{},sim:sp.simInit?sp.simInit():{},need:'',constraint:'',brief:'',role:0,ledgerLen:-1,ledgerFlag:''};
  }

  /* ───────── toast / xp / misi ───────── */
  function toast(a,b=''){const el=$('#toast');el.innerHTML='<b>'+a+'</b>'+(b?'<br><small>'+b+'</small>':'');el.classList.add('show');clearTimeout(toast.id);toast.id=setTimeout(()=>el.classList.remove('show'),2800)}
  const api={
    toast,
    xp(n){S.xp+=n},
    mark(id){
      const st=cur();if(st.missions[id]!==false)return;
      st.missions[id]=true;S.xp+=5;
      const m=spec.missions.find(x=>x.id===id);toast('Misi selesai ✓',m?m.title.replace(/^\d+ · /,''):'');
      if(Object.values(st.missions).every(Boolean)&&!st.aha){st.aha=true;S.xp+=10;setTimeout(()=>toast('💡 Ada pola!',naturalUX()?'Beratnya sama, tetapi bekas di pasir berubah. Sekarang pahami penyebabnya.':'Tahap AHA terbuka. Lanjut ke tab 4.'),900)}
      refresh();
    },
    setParam(k,v){
      const st=cur(),old=st.params[k];
      if(typeof spec.defaults()[k]==='number')v=+v;
      if(old===v)return;st.params[k]=v;
      spec.onParam&&spec.onParam(k,v,old,st,api);spec.check&&spec.check(st,api);
      try{window.PILAR_PULSE?.track?.('pressure_param',{lab:spec.id,k})}catch(_){}
      refresh();
    },
    action(id){spec.action&&spec.action(id,cur());refresh()},
    refresh:()=>refresh()
  };

  /* ───────── panel fase ───────── */
  function naturalSolidPanels(sp){
    const o=sp.predict,pf=sp.proof,eg=sp.eng;
    return `
    <section class="phase-card natural-card" data-panel="lihat">
      <div class="eyebrow">AMATI · FENOMENA</div>
      <h1>${sp.look.title}</h1><p>${sp.look.text}</p>
      <div class="big-question"><span>Aku ingin tahu</span><b>${sp.look.question}</b></div>
      <button class="primary wide-cta" data-go="tebak">Aku punya tebakan →</button>
    </section>
    <section class="phase-card natural-card" data-panel="tebak" hidden>
      <div class="eyebrow">AMATI · PREDIKSI 1 TAP</div>
      <h1>${o.title}</h1><p>${o.text}</p>
      <div class="prediction-grid natural-pred" id="predGrid">${o.options.map(x=>`<button data-pred="${x.v}">${x.l}</button>`).join('')}</div>
      <div class="prompt-box soft" id="predFeedback">Pilih satu. Tidak apa-apa kalau salah.</div>
      <button class="primary wide-cta" id="lockPred">Uji tebakanku →</button>
    </section>
    <section class="phase-card natural-card" data-panel="coba" hidden>
      <div class="eyebrow">COBA · UBAH SATU HAL</div>
      <h1>Balik baloknya. Lihat pasirnya.</h1>
      <p>Berat balok tetap. Ubah hanya posisi bidang yang menyentuh pasir.</p>
      <div class="control-slot" data-slot="coba"></div>
      <div class="mission-list natural-mission" id="missionList">${sp.missions.map(m=>`<div data-mission="${m.id}"><b>${m.title}</b><span>○ ${m.desc}</span></div>`).join('')}</div>
      <div class="reveal-row natural-reveal" id="revealRow">${sp.reveals.map(r=>`<button data-reveal="${r.k}" aria-pressed="false">${r.off}</button>`).join('')}</div>
      <div class="prompt-box soft" id="experimentHint"></div>
    </section>
    <section class="phase-card natural-card" data-panel="aha" hidden>
      <div class="eyebrow">PAHAMI · AHA</div>
      <h1>Apa yang sebenarnya berubah?</h1>
      <div class="prompt-box" id="predResult"></div>
      <div class="pattern-cards natural-patterns">${sp.patterns.map(x=>`<article><span>${x.icon}</span><div><b>${x.title}</b><p>${x.text}</p></div></article>`).join('')}</div>
      <button class="primary wide-cta" id="revealFormula">Lihat hubungan angkanya</button>
      <div class="formula-panel" id="formulaPanel" hidden><div class="formula">${sp.formula.main}</div><div class="formula secondary">${sp.formula.sec}</div><p class="angle-note">${sp.formula.note}</p></div>
      <button class="wide-cta" id="toProof" data-go="buktikan">Ambil bukti dari percobaan →</button>
    </section>
    <section class="phase-card natural-card" data-panel="buktikan" hidden>
      <div class="eyebrow">PAHAMI · BUKTI</div>
      <h1>${pf.title}</h1><p>${pf.text}</p>
      <div class="target-meter natural-target"><span>${pf.target[0]}</span><b>${pf.target[1]}</b></div>
      <div class="control-slot" data-slot="buktikan"></div>
      <div class="control-grid"><button class="primary" id="recordNow">📸 Ambil bukti</button><button id="clearLedger">Ulang bukti</button></div>
      <div class="evidence-snapshots" id="evidenceSnapshots"><div class="empty-evidence">Belum ada bukti. Ambil kondisi pertama.</div></div>
      <table hidden><tbody id="ledgerBody"></tbody></table>
      <div class="prompt-box soft" id="proofHint">Bandingkan balok tidur dan berdiri dengan massa yang sama.</div>
      <div class="control-grid"><button id="copyReport">Salin data</button><button class="primary" id="toEng" data-go="rekayasa">Pakai konsepnya →</button></div>
    </section>
    <section class="phase-card natural-card" data-panel="rekayasa" hidden>
      <div class="eyebrow">RANCANG · KONSEP JADI FUNGSI</div>
      <h1>${eg.title}</h1><p>${eg.text}</p>
      <div class="eng-status"><span>STATUS RANCANGAN</span><b id="engStatus">—</b></div>
      <div id="engPanelHost">${eg.html}</div>
      <div class="reflection-box natural-reflect"><b>Kenapa desainmu bekerja?</b><p>Hubungkan <strong>luas bidang tekan</strong> dengan <strong>besar tekanan</strong> yang dihasilkan.</p></div>
      <details class="model-details"><summary>Tentang model simulasi</summary><p>${sp.model}</p></details>
    </section>`;
  }
  function panelsHTML(sp){
    if(sp.studentUX==='natural-solid-v1')return naturalSolidPanels(sp);
    const o=sp.predict,pf=sp.proof,eg=sp.eng;
    return `
    <section class="phase-card" data-panel="lihat">
      <div class="eyebrow">PEKA · OBSERVASI</div><h1>${sp.look.title}</h1><p>${sp.look.text}</p>
      <div class="prompt-box"><b>Pertanyaan awal</b><span>${sp.look.question}</span></div>
      <button class="primary" data-go="tebak">Mulai menebak</button>
    </section>
    <section class="phase-card" data-panel="tebak" hidden>
      <div class="eyebrow">INTUISI · PREDIKSI</div><h1>${o.title}</h1><p>${o.text}</p>
      <div class="prediction-grid" id="predGrid">${o.options.map(x=>`<button data-pred="${x.v}">${x.l}</button>`).join('')}</div>
      <div class="prompt-box" id="predFeedback">Belum ada tebakan yang dikunci.</div>
      <button class="primary" id="lockPred">Kunci tebakan & mulai eksperimen</button>
    </section>
    <section class="phase-card" data-panel="coba" hidden>
      <div class="eyebrow">LAB · GANGGU SISTEM</div><h1>Coba satu perubahan pada satu waktu.</h1>
      <div class="collab-strip" id="collab"><span data-role="0"><b>A</b> Pengamat</span><span data-role="1"><b>B</b> Operator</span><span data-role="2"><b>C</b> Engineer</span><button id="rotateRoles">Rotasi peran</button></div>
      <div class="mission-list" id="missionList">${sp.missions.map(m=>`<div data-mission="${m.id}"><b>${m.title}</b><span>○ ${m.desc}</span></div>`).join('')}</div>
      <div class="control-slot" data-slot="coba"></div>
      <div class="reveal-row" id="revealRow">${sp.reveals.map(r=>`<button data-reveal="${r.k}" aria-pressed="false">${r.off}</button>`).join('')}</div>
      <div class="prompt-box" id="experimentHint"></div>
    </section>
    <section class="phase-card" data-panel="aha" hidden>
      <div class="eyebrow">AHA · POLA MUNCUL</div><h1>Bukan rumus dulu. Temukan polanya.</h1>
      <div class="prompt-box" id="predResult"></div>
      <div class="pattern-cards">${sp.patterns.map(x=>`<article><span>${x.icon}</span><div><b>${x.title}</b><p>${x.text}</p></div></article>`).join('')}</div>
      <button class="primary" id="revealFormula">Rumuskan temuan</button>
      <div class="formula-panel" id="formulaPanel" hidden><div class="formula">${sp.formula.main}</div><div class="formula secondary">${sp.formula.sec}</div><p class="angle-note">${sp.formula.note}</p></div>
      <button id="toProof" data-go="buktikan">Lanjut: buktikan dengan data</button>
    </section>
    <section class="phase-card" data-panel="buktikan" hidden>
      <div class="eyebrow">BUKTI · LITERASI & NUMERASI</div><h1>${pf.title}</h1><p>${pf.text}</p>
      <div class="target-meter"><span>${pf.target[0]}</span><b>${pf.target[1]}</b></div>
      <div class="control-slot" data-slot="buktikan"></div>
      <div class="control-grid"><button class="primary" id="recordNow">Catat percobaan</button><button id="clearLedger">Hapus catatan</button></div>
      <div class="ledger-wrap"><table class="ledger"><thead><tr><th>#</th>${pf.cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody id="ledgerBody"></tbody></table></div>
      <div class="prompt-box" id="proofHint">Belum ada data yang cukup untuk membandingkan.</div>
      <div class="control-grid"><button id="copyReport">Salin laporan bukti</button><button id="toEng" data-go="rekayasa">Lanjut ke rekayasa</button></div>
    </section>
    <section class="phase-card" data-panel="rekayasa" hidden>
      <div class="eyebrow">${eg.eyebrow}</div><h1>${eg.title}</h1><p>${eg.text}</p>
      <div class="eng-status"><span>STATUS RANCANGAN</span><b id="engStatus">—</b></div>
      <div id="engPanelHost">${eg.html}</div>
      <label class="field-label">Kebutuhan masyarakat / lingkungan<textarea id="needInput" placeholder="Contoh: siswa kelas 8 perlu alat peraga…"></textarea></label>
      <label class="field-label">Batasan yang jujur<textarea id="constraintInput" placeholder="Contoh: biaya, bahan, keselamatan, ketelitian…"></textarea></label>
      <button class="primary" id="makeBrief">Buat brief rekayasa</button>
      <div class="engineering-brief" id="briefBox">Belum ada brief.</div>
      <div class="reflection-box"><b>MODEL CHECK</b><p>${sp.model}</p></div>
    </section>`;
  }

  /* ───────── kontrol dinamis (dipindah antara tab Coba & Buktikan) ───────── */
  function buildDock(){
    dock=document.createElement('div');dock.className='control-dock';
    const main=document.createElement('div'),adv=document.createElement('details');adv.className='advanced';adv.innerHTML='<summary>'+(spec.advancedLabel||'Kontrol engineering awal')+'</summary>';
    spec.controls.forEach((c,i)=>{
      const w=document.createElement('div');w.className='ctl';w.dataset.i=i;
      if(c.type==='actions'){w.innerHTML='<div class="control-grid">'+c.items.map(a=>`<button class="${a.primary?'primary':''}" data-act="${a.id}">${a.label}</button>`).join('')+'</div>';
        w.onclick=e=>{const b=e.target.closest('[data-act]');if(b)api.action(b.dataset.act)}}
      else if(c.type==='seg'){w.innerHTML=`<div class="ctl-label">${c.label}</div><div class="seg"></div>`;
        w.onclick=e=>{const b=e.target.closest('button[data-v]');if(b)api.setParam(c.k,b.dataset.v)}}
      else{w.innerHTML=`<div class="slider-row"><label>${c.label}</label><output></output><input type="range"></div>`;
        $('input',w).oninput=e=>api.setParam(c.k,e.target.value)}
      (c.adv?adv:main).appendChild(w);
    });
    dock.appendChild(main);if(adv.children.length>1)dock.appendChild(adv);
  }
  function updateDock(st){
    spec.controls.forEach((c,i)=>{
      const w=$(`.ctl[data-i="${i}"]`,dock);if(!w||c.type==='actions')return;const p=st.params;
      if(c.type==='seg'){
        const opts=c.options(p),sig=opts.map(o=>o.v).join('|'),seg=$('.seg',w);
        if(seg.dataset.sig!==sig){seg.dataset.sig=sig;seg.innerHTML=opts.map(o=>`<button data-v="${o.v}">${o.l}</button>`).join('')}
        $$('button',seg).forEach(b=>b.classList.toggle('selected',b.dataset.v===String(p[c.k])));
      }else{
        const inp=$('input',w),mn=c.min(p),mx=c.max(p),sp=c.step(p);
        if(+inp.min!==mn||+inp.max!==mx||+inp.step!==sp){inp.min=mn;inp.max=mx;inp.step=sp}
        if(Math.abs(+inp.value-p[c.k])>1e-6)inp.value=p[c.k];
        $('output',w).textContent=c.fmt?c.fmt(p[c.k]):fmt(p[c.k],c.dec(p))+' '+c.unit;
      }
    });
  }

  /* ───────── navigasi fase ───────── */
  function canGo(st,ph){
    if(ph==='coba'&&!st.locked)return'Kunci tebakan dulu di tab Tebak.';
    if(ph==='aha'&&!st.aha)return'Selesaikan tiga misi di tab Coba terlebih dahulu.';
    if(ph==='buktikan'&&!st.formula)return'Rumuskan temuan di tab AHA dulu.';
    if(ph==='rekayasa'&&!st.proofDone)return'Buktikan dulu: capai target di tab Buktikan.';
    return null;
  }
  function go(ph,force){
    const st=cur();const why=force?null:canGo(st,ph);if(why)return toast('Belum terbuka',why);
    const was=st.phase;st.phase=ph;
    if((was==='rekayasa')!==(ph==='rekayasa')&&spec.simInit)st.sim=spec.simInit();
    if(ph==='rekayasa'&&spec.eng.onEnter)spec.eng.onEnter(engCtx());
    const v=spec.phaseView&&spec.phaseView[ph];if(v&&scene&&scene.view)scene.view(v);
    try{window.PILAR_PULSE?.track?.('pressure_phase',{lab:spec.id,phase:ph})}catch(_){}
    refresh();
  }
  function nextStep(){
    const st=cur(),ph=st.phase;
    if(ph==='lihat')return go('tebak');
    if(ph==='tebak')return lockPrediction();
    if(ph==='coba')return st.aha?go('aha'):toast('Misi berikutnya',nextMissionText(st));
    if(ph==='aha')return st.formula?go('buktikan'):revealFormula();
    if(ph==='buktikan')return st.proofDone?go('rekayasa'):record();
    toast('Rekayasa','Atur rancanganmu sampai semua syarat ✓.');
  }
  const nextMissionText=st=>{const m=spec.missions.find(x=>!st.missions[x.id]);return m?m.desc:'Semua misi selesai.'};
  function lockPrediction(){
    const st=cur();if(!st.prediction)return toast('Pilih tebakan dulu');
    if(!st.locked){st.locked=true;st.predCorrect=st.prediction===spec.predict.answer;S.xp+=10}
    go('coba');toast('Tebakan terkunci','Sekarang uji dengan eksperimen.');
  }
  function revealFormula(){const st=cur();if(!st.aha)return toast('Belum terbuka','Selesaikan misi dulu.');st.formula=true;if(naturalUX())st.reveal.numbers=true;S.xp+=15;refresh()}
  function record(){
    const st=cur(),r=spec.proof.record(st);st.seq++;st.evidence.push({id:st.seq,cells:r.cells,data:r.data});
    const ev=spec.proof.evaluate(st);
    if(ev.ok&&!st.proofDone){st.proofDone=true;S.xp+=20;toast('Bukti cocok ✓',naturalUX()?'Dua kondisi menunjukkan pola yang sama. Sekarang pakai konsepnya untuk merancang.':'Tahap Rekayasa terbuka.')}else toast(naturalUX()?'Bukti tersimpan 📸':'Data dicatat',naturalUX()?'Sekarang ubah posisi balok dan ambil satu bukti lagi.':'Percobaan #'+st.seq+' masuk Evidence Ledger.');
    refresh();
  }
  function makeBrief(){
    const st=cur();if(!st.need.trim())return toast('Tulis kebutuhan dulu');
    st.brief=`BRIEF REKAYASA PILAR · ${spec.title}\nKebutuhan: ${st.need.trim()}\nBatasan: ${(st.constraint||'belum ditulis').trim()}\nHipotesis kerja: ${spec.eng.hypothesis}\nBukti minimum: ukur nilai besaran utama, bandingkan dengan syarat, dan ulangi minimal 3 kali.\nKriteria jadi: semua syarat rancangan ✓, keterbatasan model dilaporkan jujur.`;
    S.xp+=5;refresh();toast('Brief rekayasa dibuat','Sekarang buktikan idemu dengan prototipe nyata.');
  }
  async function copyReport(){
    const st=cur(),rows=st.evidence.map(r=>`#${r.id} | ${r.cells.join(' | ')}`).join('\n');
    const txt=`LAPORAN BUKTI PILAR · ${spec.title}\nPrediksi awal: ${st.prediction?spec.predict.options.find(o=>o.v===st.prediction).l:'-'} (${st.predCorrect?'benar':'perlu direvisi'})\nRumus temuan: ${spec.formula.main}\n\nEVIDENCE LEDGER\n${spec.proof.cols.join(' | ')}\n${rows||'Belum ada data'}\n\nBatas model: ${spec.model}`;
    try{await navigator.clipboard.writeText(txt);toast('Laporan bukti disalin')}catch(_){toast('Clipboard dibatasi browser','Jalankan lewat GitHub Pages/localhost.')}
  }

  /* ───────── konteks untuk panel rekayasa ───────── */
  function engCtx(){return{st:cur(),api,$:(s,r)=>$(s,r||$('#panelHost')),$$:(s,r)=>$$(s,r||$('#panelHost')),refresh,setEngStatus:t=>{const e=$('#engStatus');if(e)e.textContent=t}}}

  /* ───────── refresh UI ───────── */
  function refresh(){
    if(!spec)return;const st=cur();
    if(naturalUX()){
      $('#phaseTabs button').forEach(b=>{const target=naturalTarget(b.dataset.step,st);b.classList.toggle('active',b.dataset.step===phaseGroup(st.phase));b.classList.toggle('locked',!!canGo(st,target))});
    }else{
      $('#phaseTabs button').forEach(b=>{b.classList.toggle('active',b.dataset.phase===st.phase);const lock=canGo(st,b.dataset.phase);b.classList.toggle('locked',!!lock)});
    }
    $$('#panelHost [data-panel]').forEach(p=>p.hidden=p.dataset.panel!==st.phase);
    const slot=$(`.control-slot[data-slot="${st.phase}"]`);if(slot&&dock.parentNode!==slot)slot.appendChild(dock);
    $('#xp').textContent=S.xp;
    // tebak
    $$('#predGrid button').forEach(b=>{b.classList.toggle('selected',b.dataset.pred===st.prediction);b.disabled=st.locked&&st.phase!=='tebak'});
    $('#predFeedback').textContent=st.locked?'Tebakan terkunci: '+spec.predict.options.find(o=>o.v===st.prediction).l+'.':st.prediction?'Tebakanmu: '+spec.predict.options.find(o=>o.v===st.prediction).l+' (belum dikunci).':'Belum ada tebakan yang dikunci.';
    // coba
    spec.missions.forEach(m=>{const el=$(`#missionList [data-mission="${m.id}"]`);if(!el)return;el.classList.toggle('done',st.missions[m.id]);$('span',el).textContent=(st.missions[m.id]?'✓ ':'○ ')+m.desc});
    $$('#revealRow button').forEach(b=>{const r=spec.reveals.find(x=>x.k===b.dataset.reveal),on=!!st.reveal[r.k];b.setAttribute('aria-pressed',on);b.textContent=on?r.on:r.off});
    $$('#collab [data-role]').forEach((el,i)=>el.classList.toggle('active',i===st.role));
    $('#experimentHint').innerHTML=st.aha?'<b>💡 Pola sudah cukup kuat.</b> Tahap AHA terbuka — buka tab 4.':'<b>Misi berikutnya:</b> '+nextMissionText(st);
    // aha
    $('#predResult').innerHTML=st.locked?`<b>${st.predCorrect?'Tebakanmu tepat 🎯':'Tebakanmu perlu direvisi'}</b><span>${spec.predict.why}</span>`:'<b>Belum ada tebakan</b><span>Kembali ke tab Tebak untuk mengunci prediksi.</span>';
    $('#formulaPanel').hidden=!st.formula;$('#revealFormula').disabled=!st.aha;$('#toProof').disabled=!st.formula;
    // buktikan
    if(st.ledgerLen!==st.evidence.length||st.ledgerFlag!==String(st.proofDone)){
      st.ledgerLen=st.evidence.length;st.ledgerFlag=String(st.proofDone);
      $('#ledgerBody').innerHTML=st.evidence.slice().reverse().map(r=>`<tr><td>${r.id}</td>${r.cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
      const snaps=$('#evidenceSnapshots');
      if(snaps){
        snaps.innerHTML=st.evidence.length?st.evidence.slice(-2).map((r,i)=>`<article><span>Bukti ${i+1}</span><b>${r.data.label||r.cells[0]}</b><small>${r.data.areaLabel||''} · ${r.data.pressureLabel||''}</small></article>`).join(''):'<div class="empty-evidence">Belum ada bukti. Ambil kondisi pertama.</div>';
      }
      const ev=spec.proof.evaluate(st);$('#proofHint').innerHTML=st.evidence.length?ev.msg:'Belum ada data yang cukup untuk membandingkan.';
    }
    $('#toEng').disabled=!st.proofDone;
    // rekayasa
    if(st.phase==='rekayasa'){spec.eng.update(engCtx());const bb=$('#briefBox');if(bb)bb.textContent=st.brief||'Belum ada brief.'}
    updateDock(st);
    $('#stageBadge').textContent=spec.icon+' '+spec.title;
    const cta=$('#nextCta');
    cta.textContent=naturalUX()?{lihat:'Aku punya tebakan →',tebak:'Uji tebakanku →',coba:st.aha?'Apa polanya? →':'Balik baloknya…',aha:st.formula?'Ambil bukti →':'Lihat hubungan angka →',buktikan:st.proofDone?'Rancang sesuatu →':'Ambil bukti 📸',rekayasa:'Uji rancangan ✓'}[st.phase]
      :{lihat:'Mulai menebak →',tebak:'Kunci tebakan →',coba:st.aha?'Buka AHA →':'Selesaikan misi…',aha:st.formula?'Buktikan dengan data →':'Rumuskan temuan →',buktikan:st.proofDone?'Masuk Rekayasa →':'Catat percobaan',rekayasa:'Rancang sampai ✓'}[st.phase];
  }
  function updateHud(){
    const st=cur(),h=spec.hud(st);$$('.live-hud div').forEach((d,i)=>{$('span',d).textContent=h[i][0];$('b',d).textContent=h[i][1]});
  }

  /* ───────── lab switching ───────── */
  function openLab(id,{fromPicker}={}){
    const sp=P.pressureLabs[id];if(!sp)return;
    if(!stage){try{stage=P.pressureStage.create($('#stage'));stage.setQuality(S.quality)}catch(e){return showError(e)}}
    spec=sp;S.labId=id;if(!S.labs[id])S.labs[id]=makeLab(sp);
    const st=cur();
    document.body.classList.toggle('natural-solid',sp.studentUX==='natural-solid-v1');
    renderPhaseTabs();
    $('#panelHost').innerHTML=panelsHTML(sp);buildDock();bindPanels();
    $$('#labChips button').forEach(b=>b.classList.toggle('active',b.dataset.lab===id));
    stage.unmount();
    try{scene=sp.createScene(stage,{getState:cur,setParam:(k,v)=>api.setParam(k,v)})}catch(e){return showError(e)}
    $('#viewTools').innerHTML=(scene.views||[]).map(v=>`<button data-view="${v.id}">${v.label}</button>`).join('');
    $$('#viewTools button').forEach(b=>b.onclick=()=>scene.view(b.dataset.view));
    const pv=sp.phaseView&&sp.phaseView[st.phase];if(pv&&scene.view)scene.view(pv);
    if(st.phase==='rekayasa'&&sp.eng.onEnter)sp.eng.onEnter(engCtx());
    if(sp.eng.bind)sp.eng.bind(engCtx());
    document.documentElement.style.setProperty('--lab',sp.accent);
    $('#labName').textContent=sp.title+' · Lab Maya';
    $('#picker').classList.add('hide');$('#stageErr').hidden=true;
    refresh();updateHud();startLoop();
    try{window.PILAR_PULSE?.track?.('pressure_lab_open',{lab:id})}catch(_){}
    const u=new URL(location.href);u.searchParams.set('lab',id);history.replaceState(null,'',u);
    if(fromPicker)toast(sp.icon+' '+sp.tab,sp.tagline);
  }
  function bindPanels(){
    const H=$('#panelHost'),click=(sel,fn)=>{const el=$(sel,H);if(el)el.onclick=fn};
    $$('[data-go]',H).forEach(b=>b.onclick=()=>go(b.dataset.go));
    $$('#predGrid button',H).forEach(b=>b.onclick=()=>{const st=cur();if(st.locked)return;st.prediction=b.dataset.pred;refresh()});
    click('#lockPred',lockPrediction);
    click('#rotateRoles',()=>{const st=cur();st.role=(st.role+1)%3;refresh()});
    $$('#revealRow button',H).forEach(b=>b.onclick=()=>{const st=cur(),k=b.dataset.reveal;st.reveal[k]=!st.reveal[k];refresh()});
    click('#revealFormula',revealFormula);
    click('#recordNow',record);
    click('#clearLedger',()=>{const st=cur();st.evidence=[];st.proofDone=false;st.ledgerLen=-1;refresh()});
    click('#copyReport',copyReport);
    click('#makeBrief',makeBrief);
    const need=$('#needInput',H),constraint=$('#constraintInput',H);
    if(need){need.value=cur().need;need.oninput=e=>cur().need=e.target.value}
    if(constraint){constraint.value=cur().constraint;constraint.oninput=e=>cur().constraint=e.target.value}
  }
  function showError(e){
    console.error(e);const el=$('#stageErr');el.hidden=false;
    el.innerHTML=`<b>Panggung 3D tidak dapat dimulai</b><p>${(e&&e.message)||e}</p><button id="retryBtn" class="primary">Muat ulang</button>`;
    $('#retryBtn').onclick=()=>location.reload();$('#picker').classList.add('hide');
  }

  /* ───────── loop ───────── */
  function startLoop(){
    if(loopOn)return;loopOn=true;lastT=performance.now();
    (function frame(now){
      requestAnimationFrame(frame);
      if(!stage||!scene||document.hidden)return;
      const dt=Math.min(.033,(now-lastT)/1000);lastT=now;const st=cur();
      spec.step&&spec.step(st,dt);
      if(now-lastChk>250){lastChk=now;spec.check&&spec.check(st,api)}
      scene.update(st,dt);stage.render(dt);
      if(now-lastUi>110){lastUi=now;updateHud();if(st.phase==='rekayasa'||spec.simInit)refreshLight()}
    })(lastT);
  }
  function refreshLight(){const st=cur();if(st.phase==='rekayasa')spec.eng.update(engCtx())}

  /* ───────── boot ───────── */
  function boot(){
    // picker + chips
    $('#pickerGrid').innerHTML=P.pressureLabs.list.map(s=>`<button class="pick-card" data-lab="${s.id}" style="--c:${s.accent}"><span class="pick-ico">${s.icon}</span><b>${s.title}</b><small>${s.tagline}</small><em>MASUK LAB</em></button>`).join('');
    $$('#pickerGrid .pick-card').forEach(b=>b.onclick=()=>openLab(b.dataset.lab,{fromPicker:true}));
    $('#labChips').innerHTML=P.pressureLabs.list.map(s=>`<button data-lab="${s.id}" title="${s.title}">${s.icon} ${s.tab}</button>`).join('');
    $$('#labChips button').forEach(b=>b.onclick=()=>openLab(b.dataset.lab,{fromPicker:true}));
    $('#phaseTabs').innerHTML='';
    $('#nextCta').onclick=nextStep;
    $('#pickerBtn').onclick=()=>$('#picker').classList.remove('hide');
    $('#pickerClose').onclick=()=>{if(spec)$('#picker').classList.add('hide')};
    $('#qualitySelect').onchange=e=>{S.quality=e.target.value;stage&&stage.setQuality(S.quality)};
    document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;if(e.key==='n'||e.key==='N')spec&&nextStep()});
    $('#homeBtn').onclick=()=>{location.href='../../index.html'};
    if(P.ownership)P.ownership.stamp($('#ownershipMark'));
    const want=new URLSearchParams(location.search).get('lab');
    if(want&&P.pressureLabs[want])openLab(want);
    addEventListener('pagehide',()=>{try{stage&&stage.dispose()}catch(_){}},{once:true});
    try{window.PILAR_PULSE?.setApp?.('pressure')}catch(_){}
  }
  P.pressureApp={api,state:S,openLab,go,boot};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

