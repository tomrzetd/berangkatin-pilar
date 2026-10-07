/* PILAR · Lab Maya Tekanan — alur: Amati → Selidiki → Pahami → Terapkan → Ceritakan
   (v2: tebakan beralasan, kunci lunak, grafik bukti hidup, refleksi 3 kalimat, kartu temuan, simpan progres) */
(function(){
  'use strict';
  const P=window.PILAR,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',',');
  const PHASES=[['lihat','1 Lihat'],['tebak','2 Tebak'],['coba','3 Coba'],['aha','4 AHA'],['buktikan','5 Buktikan'],['rekayasa','6 Rekayasa']];
  const NATURAL_STEPS=[['amati','1 Amati'],['coba','2 Selidiki'],['pahami','3 Pahami'],['rancang','4 Terapkan']];
  const REASONS=[['alami','Pernah mengalaminya'],['belajar','Dari pelajaran'],['logika','Dari logikaku sendiri'],['tebak','Menebak saja']];
  const REVISIONS=[['tepat','Sudah tepat'],['ubah','Perlu kuubah'],['ragu','Belum yakin']];
  const REVISE_NOTE={tepat:'Bagus. Coba jelaskan alasannya di langkah Terapkan.',ubah:'Mengubah pendapat setelah melihat bukti adalah cara kerja ilmuwan.',ragu:'Tidak apa-apa. Baca pola di bawah, lalu ambil bukti sendiri.'};
  const S={labId:null,labs:{},saved:{},xp:0,quality:'standard'};
  const perf={ema:.016,next:0,userQ:false};

  /* ───────── simpan progres (sessionStorage, aman bila diblokir) ───────── */
  const STORE='pilar.pressure.v2';
  const SAVE_KEYS=['phase','prediction','locked','predCorrect','params','reveal','missions','aha','formula','evidence','seq','proofDone','eng','need','constraint','reason','revision','reflection','reflectXp'];
  let saveT=0;
  function saveNow(){try{const out={xp:S.xp,labs:Object.assign({},S.saved)};for(const id in S.labs){const o={};SAVE_KEYS.forEach(k=>o[k]=S.labs[id][k]);out.labs[id]=o}sessionStorage.setItem(STORE,JSON.stringify(out))}catch(_){}}
  function saveState(){clearTimeout(saveT);saveT=setTimeout(saveNow,350)}
  function loadState(){try{const raw=sessionStorage.getItem(STORE);if(!raw)return;const d=JSON.parse(raw);S.xp=+d.xp||0;S.saved=d.labs||{}}catch(_){S.saved={}}}
  function copyText(txt){
    return(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).catch(()=>{
      const t=document.createElement('textarea');t.value=txt;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();
      const ok=document.execCommand&&document.execCommand('copy');t.remove();if(!ok)throw new Error('copy');
    });
  }
  const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(_){}};
  let stage=null,scene=null,spec=null,panelEls=null,dock=null,lastKey='',loopOn=false,lastT=0,lastUi=0,lastChk=0;

  const cur=()=>S.labs[S.labId];
  const naturalUX=()=>spec&&String(spec.studentUX||'').startsWith('natural-');
  const phaseGroup=ph=>ph==='lihat'||ph==='tebak'?'amati':ph==='coba'?'coba':ph==='aha'||ph==='buktikan'?'pahami':'rancang';
  function naturalTarget(step,st){
    if(step==='amati')return'lihat';
    if(step==='coba')return'coba';
    if(step==='pahami')return st.formula?'buktikan':'aha';
    return'rekayasa';
  }
  function renderPhaseTabs(){
    const nav=$('#phaseTabs');if(!nav)return;
    if(naturalUX()){
      nav.classList.add('natural-flow');
      nav.innerHTML=NATURAL_STEPS.map(p=>`<button data-step="${p[0]}">${p[1]}</button>`).join('');
      $$('button',nav).forEach(b=>b.onclick=()=>go(naturalTarget(b.dataset.step,cur())));
    }else{
      nav.classList.remove('natural-flow');
      nav.innerHTML=PHASES.map(p=>`<button data-phase="${p[0]}">${p[1]}</button>`).join('');
      $$('button',nav).forEach(b=>b.onclick=()=>go(b.dataset.phase));
    }
  }
  function makeLab(sp){
    const missions={};sp.missions.forEach(m=>missions[m.id]=false);
    const base={id:sp.id,phase:'lihat',prediction:null,locked:false,predCorrect:null,params:sp.defaults(),reveal:{},missions,aha:false,formula:false,
      evidence:[],seq:0,proofDone:false,eng:sp.engDefaults?sp.engDefaults():{},sim:sp.simInit?sp.simInit():{},need:'',constraint:'',brief:'',role:0,ledgerLen:-1,ledgerFlag:'',
      reason:null,revision:null,reflection:{a:'',b:'',c:''},reflectXp:false};
    const sv=S.saved&&S.saved[sp.id];
    if(sv){
      SAVE_KEYS.forEach(k=>{if(sv[k]!==undefined&&sv[k]!==null)base[k]=sv[k]});
      base.params=Object.assign(sp.defaults(),sv.params||{});base.missions=Object.assign(missions,sv.missions||{});
      base.eng=Object.assign(base.eng,sv.eng||{});base.reflection=Object.assign({a:'',b:'',c:''},sv.reflection||{});
      if(!['lihat','tebak','coba','aha','buktikan','rekayasa'].includes(base.phase)||(base.phase==='coba'&&!base.locked))base.phase='lihat';
      base.ledgerLen=-1;
    }
    return base;
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
      if(Object.values(st.missions).every(Boolean)&&!st.aha){st.aha=true;S.xp+=10;setTimeout(()=>toast('💡 Ada pola!',naturalUX()?(spec.natural?.ahaToast||'Fenomenanya sudah terlihat. Sekarang pahami penyebabnya.'):'Tahap AHA terbuka. Lanjut ke tab 4.'),900)}
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
    const o=sp.predict,pf=sp.proof,eg=sp.eng,n=sp.natural||{};
    return `
    <section class="phase-card natural-card" data-panel="lihat">
      <div class="eyebrow">AMATI · FENOMENA</div>
      <h1>${sp.look.title}</h1><p>${sp.look.text}</p>
      <div class="big-question"><span>Aku ingin tahu</span><b>${sp.look.question}</b></div>
      <button class="primary wide-cta" data-go="tebak">Aku punya tebakan →</button>
    </section>
    <section class="phase-card natural-card" data-panel="tebak" hidden>
      <div class="eyebrow">AMATI · TEBAK DAN ALASANNYA</div>
      <h1>${o.title}</h1><p>${o.text}</p>
      <div class="prediction-grid natural-pred" id="predGrid">${o.options.map(x=>`<button data-pred="${x.v}">${x.l}</button>`).join('')}</div>
      <div class="reason-box"><b>Dari mana tebakanmu?</b><div class="chip-row" id="reasonRow">${REASONS.map(r=>`<button type="button" data-reason="${r[0]}" aria-pressed="false">${r[1]}</button>`).join('')}</div></div>
      <div class="prompt-box soft" id="predFeedback">Pilih satu. Tidak apa-apa kalau salah.</div>
      <button class="primary wide-cta" id="lockPred">Uji tebakanku →</button>
    </section>
    <section class="phase-card natural-card" data-panel="coba" hidden>
      <div class="eyebrow">SELIDIKI · UBAH SATU HAL</div>
      <h1>${n.tryTitle||'Ubah satu hal. Amati akibatnya.'}</h1>
      <p>${n.tryText||'Jangan ubah semuanya sekaligus. Cari satu hubungan sebab–akibat.'}</p>
      <div class="control-slot" data-slot="coba"></div>
      <div class="mission-list natural-mission" id="missionList">${sp.missions.map(m=>`<div data-mission="${m.id}"><b>${m.title}</b><span>○ ${m.desc}</span></div>`).join('')}</div>
      <div class="reveal-row natural-reveal" id="revealRow">${sp.reveals.map(r=>`<button data-reveal="${r.k}" aria-pressed="false">${r.off}</button>`).join('')}</div>
      <div class="prompt-box soft" id="experimentHint"></div>
    </section>
    <section class="phase-card natural-card" data-panel="aha" hidden>
      <div class="eyebrow">PAHAMI · APA POLANYA?</div>
      <h1>${n.ahaTitle||'Apa yang sebenarnya berubah?'}</h1>
      <div class="prompt-box" id="predResult"></div>
      <div class="reason-box"><b>Setelah mencoba, tebakanku…</b><div class="chip-row" id="reviseRow">${REVISIONS.map(r=>`<button type="button" data-rev="${r[0]}" aria-pressed="false">${r[1]}</button>`).join('')}</div><p id="reviseNote" class="mini-note"></p></div>
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
      <div class="ev-graph-wrap"><canvas id="evGraph" width="640" height="260" role="img" aria-label="Grafik dari bukti yang kamu ambil"></canvas><small id="evGraphCap">Titik-titik ini adalah buktimu. Polanya muncul saat bukti bertambah.</small></div>
      <table hidden><tbody id="ledgerBody"></tbody></table>
      <div class="prompt-box soft" id="proofHint">${n.proofHint||'Ambil dua bukti yang hanya berbeda pada satu variabel.'}</div>
      <div class="control-grid"><button id="copyReport">Salin data</button><button class="primary" id="toEng" data-go="rekayasa">Terapkan konsepnya →</button></div>
    </section>
    <section class="phase-card natural-card" data-panel="rekayasa" hidden>
      <div class="eyebrow">TERAPKAN · KONSEP JADI FUNGSI</div>
      <h1>${eg.title}</h1><p>${eg.text}</p>
      <div class="eng-status"><span>STATUS RANCANGAN</span><b id="engStatus">—</b></div>
      <div id="engPanelHost">${eg.html}</div>
      <div class="tell-card" id="tellCard">
        <b>Ceritakan temuanmu</b>
        <p class="mini-note">Tiga kalimat cukup. Pakai kata-katamu sendiri.</p>
        <label>Aku menemukan bahwa…<textarea id="refA" rows="2" maxlength="220" placeholder="Contoh: kalau satu hal berubah, hal lain ikut berubah."></textarea></label>
        <label>Buktinya…<textarea id="refB" rows="2" maxlength="220" placeholder="Contoh: pada percobaan 1 dan 2, ..."></textarea></label>
        <label>Rancanganku berhasil / belum karena…<textarea id="refC" rows="2" maxlength="220" placeholder="${(n.reflection||'Jelaskan sebab–akibat yang membuat rancanganmu berhasil.').replace(/"/g,'&quot;')}"></textarea></label>
        <div class="control-grid"><button type="button" id="copyStory">Salin ceritaku</button><button type="button" class="primary" id="makeCard">Unduh kartu temuan</button></div>
        <button type="button" id="resetLab" class="ghost wide-cta">Mulai lab ini dari awal</button>
      </div>
      <details class="model-details"><summary>Tentang model simulasi</summary><p>${sp.model}</p></details>
    </section>`;
  }
  function panelsHTML(sp){
    if(String(sp.studentUX||'').startsWith('natural-'))return naturalSolidPanels(sp);
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
  /* Kunci keras hanya untuk dua hal: harus ada tebakan (agar bisa dibandingkan) dan pola tidak boleh bocor sebelum diselidiki. */
  function canGo(st,ph){
    if(ph==='coba'&&!st.locked)return'Tulis tebakanmu dulu di langkah Amati.';
    if(['aha','buktikan','rekayasa'].includes(ph)&&!st.aha)return naturalUX()?'Selesaikan tantangan utama di langkah Selidiki dulu.':'Selesaikan tiga misi di tab Coba terlebih dahulu.';
    return null;
  }
  /* Saran lunak: boleh dilewati, tetapi siswa diberi tahu kenapa urutan itu membantu. */
  function softHint(st,ph){
    if((ph==='buktikan'||ph==='rekayasa')&&!st.formula)return'Disarankan: lihat dulu hubungan angkanya di langkah Pahami.';
    if(ph==='rekayasa'&&!st.proofDone)return'Disarankan: ambil dua bukti dulu supaya rancanganmu punya dasar.';
    return null;
  }
  function go(ph,force){
    const st=cur();const why=force?null:canGo(st,ph);if(why)return toast('Belum terbuka',why);
    const soft=force?null:softHint(st,ph);if(soft&&!st['hint_'+ph]){st['hint_'+ph]=true;toast('Saran',soft)}
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
    if(!st.locked){st.locked=true;st.predCorrect=st.prediction===spec.predict.answer;S.xp+=10;buzz(15)}
    go('coba');toast('Tebakan terkunci','Sekarang selidiki dengan percobaan.');
  }
  function revealFormula(){const st=cur();if(!st.aha)return toast('Belum terbuka','Selesaikan tantangan dulu.');st.formula=true;S.xp+=15;refresh()}
  function record(){
    const st=cur(),r=spec.proof.record(st);st.seq++;st.evidence.push({id:st.seq,cells:r.cells,data:r.data});
    const ev=spec.proof.evaluate(st);
    if(ev.ok&&!st.proofDone){st.proofDone=true;S.xp+=20;buzz([20,40,20]);toast('Bukti cocok ✓',naturalUX()?(spec.natural?.proofDone||'Dua kondisi menunjukkan pola yang sama. Sekarang pakai konsepnya untuk merancang.'):'Tahap Rekayasa terbuka.')}else toast(naturalUX()?'Bukti tersimpan 📸':'Data dicatat',naturalUX()?(spec.natural?.recordAgain||'Ubah satu variabel lalu ambil bukti berikutnya.'):'Percobaan #'+st.seq+' masuk Evidence Ledger.');
    refresh();
  }
  function makeBrief(){
    const st=cur();if(!st.need.trim())return toast('Tulis kebutuhan dulu');
    st.brief=`BRIEF REKAYASA PILAR · ${spec.title}\nKebutuhan: ${st.need.trim()}\nBatasan: ${(st.constraint||'belum ditulis').trim()}\nHipotesis kerja: ${spec.eng.hypothesis}\nBukti minimum: ukur nilai besaran utama, bandingkan dengan syarat, dan ulangi minimal 3 kali.\nKriteria jadi: semua syarat rancangan ✓, keterbatasan model dilaporkan jujur.`;
    S.xp+=5;refresh();toast('Brief rekayasa dibuat','Sekarang buktikan idemu dengan prototipe nyata.');
  }
  const plain=h=>{const d=document.createElement('div');d.innerHTML=h||'';return d.textContent.trim()};
  const lab=(arr,v)=>{const x=arr.find(r=>r[0]===v);return x?x[1]:'-'};
  const predLabel=st=>st.prediction?spec.predict.options.find(o=>o.v===st.prediction).l:'-';
  function storyText(st){
    const r=st.reflection||{};
    return `CERITA TEMUAN · ${spec.title}\nTebakan awal: ${predLabel(st)} (${st.locked?(st.predCorrect?'tepat':'perlu direvisi'):'belum dikunci'}); alasan: ${lab(REASONS,st.reason)}\nSetelah mencoba, tebakanku: ${lab(REVISIONS,st.revision)}\n\nAku menemukan bahwa ${r.a||'…'}\nBuktinya ${r.b||'…'}\nRancanganku berhasil/belum karena ${r.c||'…'}`;
  }
  async function copyReport(){
    const st=cur(),rows=st.evidence.map(r=>`#${r.id} | ${r.cells.join(' | ')}`).join('\n');
    const txt=`LAPORAN BUKTI PILAR · ${spec.title}\nPrediksi awal: ${predLabel(st)} (${st.predCorrect?'benar':'perlu direvisi'}); alasan: ${lab(REASONS,st.reason)}\nSetelah mencoba: ${lab(REVISIONS,st.revision)}\nRumus temuan: ${plain(spec.formula.main)}\n\nEVIDENCE LEDGER\n${spec.proof.cols.join(' | ')}\n${rows||'Belum ada data'}\n\n${storyText(st)}\n\nBatas model: ${spec.model}`;
    try{await copyText(txt);toast('Laporan bukti disalin')}catch(_){toast('Salin gagal','Browser memblokir clipboard. Coba lewat localhost atau HTTPS.')}
  }
  async function copyStory(){
    const st=cur();if(!(st.reflection.a||'').trim())return toast('Tulis dulu satu kalimat','Mulai dari: Aku menemukan bahwa…');
    try{await copyText(storyText(st));toast('Ceritamu disalin')}catch(_){toast('Salin gagal','Browser memblokir clipboard.')}
  }
  function wrapLines(ctx,text,maxW){
    const out=[];String(text||'').split(/\n/).forEach(par=>{let line='';par.split(/\s+/).filter(Boolean).forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});out.push(line)});
    return out;
  }
  function makeCard(){
    const st=cur();if(!(st.reflection.a||'').trim())return toast('Tulis dulu satu kalimat','Kartu temuan berisi ceritamu sendiri.');
    const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#07101b');g.addColorStop(1,'#10243a');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.fillStyle=spec.accent;c.fillRect(0,0,W,14);
    const FF='Inter,Segoe UI,system-ui,sans-serif';let y=110;const X=80,MW=W-160;
    c.fillStyle='#7eeeff';c.font='700 28px '+FF;c.fillText('PILAR · LAB MAYA · KARTU TEMUAN',X,y);y+=80;
    c.fillStyle='#eef7ff';c.font='800 58px '+FF;wrapLines(c,spec.icon+' '+spec.title,MW).forEach(l=>{c.fillText(l,X,y);y+=68});y+=14;
    c.font='600 30px '+FF;c.fillStyle='#9db2ca';
    wrapLines(c,'Tebakan awal: '+predLabel(st)+(st.locked?(st.predCorrect?'  ✓ tepat':'  → direvisi'):''),MW).forEach(l=>{c.fillText(l,X,y);y+=42});y+=24;
    const blocks=[['Aku menemukan bahwa',st.reflection.a],['Buktinya',st.reflection.b],['Rancanganku berhasil/belum karena',st.reflection.c]];
    blocks.forEach(b=>{
      if(!(b[1]||'').trim())return;
      c.fillStyle=spec.accent;c.font='800 30px '+FF;c.fillText(b[0],X,y);y+=44;
      c.fillStyle='#eef7ff';c.font='500 36px '+FF;const ls=wrapLines(c,b[1],MW).slice(0,5);ls.forEach(l=>{c.fillText(l,X,y);y+=50});y+=34;
    });
    const f=plain(spec.formula.main);
    if(f&&y<H-260){c.fillStyle='#0d1a2b';c.fillRect(X-20,y,MW+40,120);c.fillStyle='#ffd36c';c.font='800 40px '+FF;c.fillText(f.slice(0,48),X,y+72)}
    c.fillStyle='#6f88a2';c.font='500 24px '+FF;c.fillText('Dibuat di PILAR · '+new Date().toLocaleDateString('id-ID'),X,H-60);
    const link=document.createElement('a');link.download='kartu-temuan-'+spec.id+'.png';link.href=cv.toDataURL('image/png');document.body.appendChild(link);link.click();link.remove();
    toast('Kartu temuan diunduh 🎉','Bagikan ke teman atau gurumu.');
  }
  function resetLab(){
    if(!confirm('Mulai lab ini dari awal? Tebakan, bukti, dan ceritamu di lab ini akan dihapus.'))return;
    const id=S.labId;delete S.labs[id];delete S.saved[id];saveNow();openLab(id);
  }

  /* ───────── grafik bukti hidup ───────── */
  const GRAPHS={
    padat:{x:d=>d.A*1e4,y:d=>d.P/1e3,xl:'Luas bidang sentuh (cm²)',yl:'Tekanan (kPa)',g:d=>d.obj+'|'+d.mass,cap:'Bidang makin sempit → tekanan makin besar. Perhatikan: gayanya tetap.'},
    cair:{x:d=>d.h,y:d=>d.ph/1e3,xl:'Kedalaman (m)',yl:'Tekanan akibat air (kPa)',g:d=>d.fluid,cap:'Titik-titik naik lurus: kedalaman 2× → tekanan 2×.'},
    pascal:{x:d=>d.A2,y:d=>d.F2,xl:'Luas piston besar (cm²)',yl:'Gaya angkat (N)',g:d=>d.car+'|'+d.F1+'|'+d.A1,cap:'Luas piston besar 2× → gaya angkat 2× (dorongan tangan tetap).'},
    bernoulli:{x:d=>d.rpm,y:d=>d.T,xl:'Putaran baling-baling (RPM)',yl:'Gaya angkat (N)',g:d=>d.batt+'|'+d.alpha+'|'+d.payload,cap:'Putaran 2× → gaya angkat sekitar 4×: kurvanya melengkung naik.'}
  };
  const GCOL=['#ffd36c','#7eeeff','#63e3a0','#ff9d5c','#d49bff'];
  function drawGraph(st){
    const cv=$('#evGraph');if(!cv||!spec)return;const G=GRAPHS[spec.id];if(!G)return;
    const w=cv.clientWidth||320,h=Math.round(w*.45),dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.height=h+'px';
    const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const pts=st.evidence.map(e=>({x:+G.x(e.data),y:+G.y(e.data),g:G.g(e.data),id:e.id})).filter(p=>isFinite(p.x)&&isFinite(p.y));
    const L=46,Rr=12,T=12,B=36,pw=w-L-Rr,ph=h-T-B;
    c.font='12px Inter,Segoe UI,system-ui,sans-serif';c.fillStyle='#9db2ca';c.strokeStyle='#28415f';c.lineWidth=1;
    c.beginPath();c.moveTo(L,T);c.lineTo(L,T+ph);c.lineTo(L+pw,T+ph);c.stroke();
    c.textAlign='center';c.fillText(G.xl,L+pw/2,h-8);
    c.save();c.translate(12,T+ph/2);c.rotate(-Math.PI/2);c.fillText(G.yl,0,0);c.restore();
    if(!pts.length){c.fillStyle='#6f88a2';c.textAlign='center';c.fillText('Ambil bukti pertama untuk mulai menggambar grafik',L+pw/2,T+ph/2);return}
    const mx=Math.max(...pts.map(p=>p.x))*1.15||1,my=Math.max(...pts.map(p=>p.y))*1.15||1;
    const px=v=>L+(v/mx)*pw,py=v=>T+ph-(v/my)*ph;
    c.textAlign='right';c.fillStyle='#9db2ca';[0,.5,1].forEach(f=>{c.fillText(String(+(my*f).toPrecision(3)),L-6,py(my*f)+4);c.strokeStyle='#1c3048';c.beginPath();c.moveTo(L,py(my*f));c.lineTo(L+pw,py(my*f));c.stroke()});
    c.textAlign='center';[0,.5,1].forEach(f=>c.fillText(String(+(mx*f).toPrecision(3)),px(mx*f),T+ph+16));
    const groups=[...new Set(pts.map(p=>p.g))];
    groups.forEach((gk,gi)=>{
      const col=GCOL[gi%GCOL.length],gp=pts.filter(p=>p.g===gk).sort((a,b)=>a.x-b.x);
      if(gp.length>1){c.strokeStyle=col;c.globalAlpha=.55;c.setLineDash([5,4]);c.beginPath();gp.forEach((p,i)=>i?c.lineTo(px(p.x),py(p.y)):c.moveTo(px(p.x),py(p.y)));c.stroke();c.setLineDash([]);c.globalAlpha=1}
      gp.forEach(p=>{c.fillStyle=col;c.beginPath();c.arc(px(p.x),py(p.y),9,0,7);c.fill();c.fillStyle='#07101b';c.font='700 11px Inter,system-ui,sans-serif';c.textAlign='center';c.fillText(String(p.id),px(p.x),py(p.y)+4)});
    });
    const cap=$('#evGraphCap');if(cap)cap.textContent=pts.length>1?G.cap:'Satu titik belum cukup. Ubah satu variabel lalu ambil bukti kedua.';
  }

  /* ───────── konteks untuk panel rekayasa ───────── */
  function engCtx(){return{st:cur(),api,$:(s,r)=>$(s,r||$('#panelHost')),$$:(s,r)=>$$(s,r||$('#panelHost')),refresh,setEngStatus:t=>{const e=$('#engStatus');if(e)e.textContent=t}}}

  /* ───────── refresh UI ───────── */
  function refresh(){
    if(!spec)return;const st=cur();
    if(naturalUX()){
      $$('#phaseTabs button').forEach(b=>{const target=naturalTarget(b.dataset.step,st);b.classList.toggle('active',b.dataset.step===phaseGroup(st.phase));b.classList.toggle('locked',!!canGo(st,target));b.classList.toggle('suggest',!canGo(st,target)&&!!softHint(st,target))});
    }else{
      $$('#phaseTabs button').forEach(b=>{b.classList.toggle('active',b.dataset.phase===st.phase);const lock=canGo(st,b.dataset.phase);b.classList.toggle('locked',!!lock)});
    }
    $$('#panelHost [data-panel]').forEach(p=>p.hidden=p.dataset.panel!==st.phase);
    const slot=$(`.control-slot[data-slot="${st.phase}"]`);if(slot&&dock.parentNode!==slot)slot.appendChild(dock);
    $('#xp').textContent=S.xp;
    // tebak
    $$('#predGrid button').forEach(b=>{b.classList.toggle('selected',b.dataset.pred===st.prediction);b.disabled=!!st.locked});const lockBtn=$('#lockPred');if(lockBtn)lockBtn.textContent=st.locked?'Lanjut ke Coba →':'Uji tebakanku →';
    $('#predFeedback').textContent=st.locked?'Tebakan terkunci: '+spec.predict.options.find(o=>o.v===st.prediction).l+'.':st.prediction?'Tebakanmu: '+spec.predict.options.find(o=>o.v===st.prediction).l+' (belum dikunci).':'Belum ada tebakan yang dikunci.';
    $$('#reasonRow button').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.reason===st.reason);b.disabled=!!st.locked});
    // coba
    spec.missions.forEach(m=>{const el=$(`#missionList [data-mission="${m.id}"]`);if(!el)return;el.classList.toggle('done',st.missions[m.id]);$('span',el).textContent=(st.missions[m.id]?'✓ ':'○ ')+m.desc});
    $$('#revealRow button').forEach(b=>{const r=spec.reveals.find(x=>x.k===b.dataset.reveal),on=!!st.reveal[r.k];b.setAttribute('aria-pressed',on);b.textContent=on?r.on:r.off});
    $$('#collab [data-role]').forEach((el,i)=>el.classList.toggle('active',i===st.role));
    $('#experimentHint').innerHTML=st.aha?'<b>💡 Pola sudah cukup kuat.</b> Tahap AHA terbuka — buka tab 4.':'<b>Misi berikutnya:</b> '+nextMissionText(st);
    // aha
    $('#predResult').innerHTML=st.locked?`<b>${st.predCorrect?'Tebakanmu tepat 🎯':'Tebakanmu perlu direvisi'}</b><span>${spec.predict.why}</span>`:'<b>Belum ada tebakan</b><span>Kembali ke tab Tebak untuk mengunci prediksi.</span>';
    $('#formulaPanel').hidden=!st.formula;$('#revealFormula').disabled=!st.aha;
    $$('#reviseRow button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rev===st.revision));($('#reviseNote')||{}).textContent=st.revision?(st.revision==='tepat'&&st.locked&&!st.predCorrect?'Cek lagi: buktimu mengarah ke hal lain. Baca pola di bawah.':REVISE_NOTE[st.revision]):'';
    // buktikan
    if(st.ledgerLen!==st.evidence.length||st.ledgerFlag!==String(st.proofDone)){
      st.ledgerLen=st.evidence.length;st.ledgerFlag=String(st.proofDone);
      $('#ledgerBody').innerHTML=st.evidence.slice().reverse().map(r=>`<tr><td>${r.id}</td>${r.cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
      const snaps=$('#evidenceSnapshots');
      if(snaps){
        snaps.innerHTML=st.evidence.length?st.evidence.slice(-2).map((r,i)=>`<article><span>Bukti ${i+1}</span><b>${r.data.label||r.cells[0]}</b><small>${r.data.summary||[r.data.areaLabel,r.data.pressureLabel,r.cells[1],r.cells[2]].filter(Boolean).slice(0,2).join(' · ')}</small></article>`).join(''):'<div class="empty-evidence">Belum ada bukti. Ambil kondisi pertama.</div>';
      }
      const ev=spec.proof.evaluate(st);$('#proofHint').innerHTML=st.evidence.length?ev.msg:'Belum ada data yang cukup untuk membandingkan.';
    }
    if(st.phase==='buktikan')drawGraph(st);
    // rekayasa
    if(st.phase==='rekayasa'){spec.eng.update(engCtx());const bb=$('#briefBox');if(bb)bb.textContent=st.brief||'Belum ada brief.'}
    updateDock(st);saveState();
    $('#stageBadge').textContent=spec.icon+' '+spec.title;
    const cta=$('#nextCta');
    cta.textContent=naturalUX()?{lihat:'Aku punya tebakan →',tebak:st.locked?'Lanjut ke Coba →':'Uji tebakanku →',coba:st.aha?'Apa polanya? →':(spec.natural?.ctaTry||'Coba sampai polanya terlihat…'),aha:st.formula?'Ambil bukti →':'Lihat hubungan angka →',buktikan:st.proofDone?'Rancang sesuatu →':'Ambil bukti 📸',rekayasa:'Uji rancangan ✓'}[st.phase]
      :{lihat:'Mulai menebak →',tebak:'Kunci tebakan →',coba:st.aha?'Buka AHA →':'Selesaikan misi…',aha:st.formula?'Buktikan dengan data →':'Rumuskan temuan →',buktikan:st.proofDone?'Masuk Rekayasa →':'Catat percobaan',rekayasa:'Rancang sampai ✓'}[st.phase];
  }
  function updateHud(){
    const st=cur(),h=spec.hud(st);$$('.live-hud div').forEach((d,i)=>{$('span',d).textContent=h[i][0];$('b',d).textContent=h[i][1]});
  }

  /* ───────── lab switching ───────── */
  function openLab(id,{fromPicker}={}){
    const sp=P.pressureLabs[id];if(!sp)return;
    if(!stage){try{stage=P.pressureStage.create($('#stage'));stage.setQuality(S.quality);
      const dom=stage.renderer&&stage.renderer.domElement;
      if(dom){dom.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('Grafik 3D terhenti','GPU perangkat kehabisan memori. Tunggu sebentar, atau pilih render Hemat.')});
        dom.addEventListener('webglcontextrestored',()=>toast('Grafik 3D pulih ✓'))}
    }catch(e){return showError(e)}}
    spec=sp;S.labId=id;if(!S.labs[id])S.labs[id]=makeLab(sp);
    const st=cur();
    document.body.classList.toggle('natural-pressure',String(sp.studentUX||'').startsWith('natural-'));document.body.dataset.pressureLab=sp.id;
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
    $$('#reasonRow button',H).forEach(b=>b.onclick=()=>{const st=cur();if(st.locked)return;st.reason=b.dataset.reason;refresh()});
    $$('#reviseRow button',H).forEach(b=>b.onclick=()=>{const st=cur();if(!st.revision)S.xp+=10;st.revision=b.dataset.rev;refresh()});
    click('#copyStory',copyStory);click('#makeCard',makeCard);click('#resetLab',resetLab);
    ['A','B','C'].forEach(k=>{const el=$('#ref'+k,H);if(!el)return;const st=cur(),key=k.toLowerCase();el.value=st.reflection[key]||'';
      el.oninput=e=>{const s=cur();s.reflection[key]=e.target.value;
        const n=(s.reflection.a+s.reflection.b+s.reflection.c).trim().length;if(!s.reflectXp&&n>=30){s.reflectXp=true;S.xp+=10;toast('Ceritamu tersimpan ✓','+10 XP untuk refleksimu.');$('#xp').textContent=S.xp}
        saveState()}});
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
      const raw=(now-lastT)/1000,dt=Math.min(.033,raw);lastT=now;const st=cur();
      if(raw<.25)perf.ema=perf.ema*.96+raw*.04;
      if(!perf.next)perf.next=now+4000;
      if(now>perf.next&&perf.ema>.036&&S.quality!=='performance'&&!perf.userQ){S.quality=S.quality==='realistic'?'standard':'performance';stage.setQuality(S.quality);$('#qualitySelect').value=S.quality;perf.ema=.016;perf.next=now+6000;toast('Grafik dihemat otomatis','Supaya simulasi tetap lancar di perangkat ini.')}
      spec.step&&spec.step(st,dt);
      if(now-lastChk>250){lastChk=now;spec.check&&spec.check(st,api)}
      scene.update(st,dt);stage.render(dt);
      if(now-lastUi>110){lastUi=now;updateHud();if(st.phase==='rekayasa'||spec.simInit)refreshLight()}
    })(lastT);
  }
  function refreshLight(){const st=cur();if(st.phase==='rekayasa')spec.eng.update(engCtx())}

  /* ───────── boot ───────── */
  function boot(){
    loadState();$('#xp').textContent=S.xp;
    // picker + chips
    $('#pickerGrid').innerHTML=P.pressureLabs.list.map(s=>`<button class="pick-card" data-lab="${s.id}" style="--c:${s.accent}"><span class="pick-ico">${s.icon}</span><b>${s.title}</b><small>${s.tagline}</small><em>MASUK LAB</em></button>`).join('');
    $$('#pickerGrid .pick-card').forEach(b=>b.onclick=()=>openLab(b.dataset.lab,{fromPicker:true}));
    $('#labChips').innerHTML=P.pressureLabs.list.map(s=>`<button data-lab="${s.id}" title="${s.title}">${s.icon} ${s.tab}</button>`).join('');
    $$('#labChips button').forEach(b=>b.onclick=()=>openLab(b.dataset.lab,{fromPicker:true}));
    $('#phaseTabs').innerHTML='';
    $('#nextCta').onclick=nextStep;
    $('#pickerBtn').onclick=()=>$('#picker').classList.remove('hide');
    $('#pickerClose').onclick=()=>{if(spec)$('#picker').classList.add('hide')};
    $('#qualitySelect').onchange=e=>{S.quality=e.target.value;perf.userQ=true;stage&&stage.setQuality(S.quality)};
    document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;if(e.key==='n'||e.key==='N')spec&&nextStep()});
    $('#homeBtn').onclick=()=>{location.href='../../index.html'};
    if(P.ownership)P.ownership.stamp($('#ownershipMark'));
    const want=new URLSearchParams(location.search).get('lab');
    if(want&&P.pressureLabs[want])openLab(want);
    addEventListener('pagehide',()=>{saveNow();try{stage&&stage.dispose()}catch(_){}},{once:true});
    try{window.PILAR_PULSE?.setApp?.('pressure')}catch(_){}
  }
  P.pressureApp={api,state:S,openLab,go,boot,nextStep,storyText,drawGraph,saveNow,loadState,softHint,canGo};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

