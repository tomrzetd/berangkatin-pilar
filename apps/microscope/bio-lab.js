/* PILAR Microscope Lab · v1.0 · Lab Mikrobiologi untuk USB microscope di IFP
   Modul tambahan yang memakai API publik window.microscope (inti v0.8 tidak diubah selain hook capture).
   Semua pemrosesan citra berjalan lokal di perangkat; tidak ada frame yang dikirim ke jaringan.

   Fitur:
   - Preset sampel (air kolam, sel tumbuhan, serangga/rambut/kain, uang/chip/layar) + atlas ukuran + tantangan
   - Pilih otomatis kamera USB microscope (label "external/usb/microscope/uvc/1600x")
   - Focus peaking (tepi tajam berwarna) + "Foto fokus terbaik" saat roda fokus diputar
   - Pelacak mikroorganisme: jejak gerak, ID, ukuran & kecepatan µm/s, tebakan jenis (atlas)
   - Fokus tumpuk (Extended Depth of Field): gabungkan banyak bidang fokus → satu foto tajam
   - Rekam klip + putar ulang gerak lambat
   - Anotasi multi-jari (warna) yang ikut tersimpan di foto bukti
   - Pembanding (sematkan gambar acuan), skala hidup µm, Mode Panggung layar penuh untuk demo */
(function(){
'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const pulse=(n,d={})=>{try{window.PILAR_PULSE?.track?.(n,d)}catch(_){}};

/* ---------- data sampel & atlas (ukuran tipikal, sumber: buku ajar biologi umum) ---------- */
const SAMPLES={
 pond:{icon:'🦠',name:'Air kolam & mikroorganisme',tools:['track','scale'],
  how:'Teteskan 1 tetes air kolam (ambil dekat lumut/tanaman air) di kaca preparat, tutup kaca penutup atau plastik bening. Nyalakan LED, dekatkan lensa, putar roda fokus pelan. Aktifkan 🐾 Pelacak untuk melihat jejak & kecepatannya.',
  note:'USB microscope paling jelas untuk organisme ≥ ±50 µm (Paramecium, Rotifera, Daphnia). Bakteri (1–5 µm) tidak terlihat — perlu mikroskop cahaya 1000× + pewarnaan. Cuci tangan setelah praktikum.',
  atlas:[['Paramecium',50,330,300,2000,'bersilia, gerak cepat berputar'],['Euglena',35,60,60,250,'berflagel, berklorofil, bentuk berubah'],['Amoeba',200,700,1,12,'kaki semu, merayap sangat lambat'],['Volvox',150,1000,80,500,'koloni bola hijau, menggelinding'],['Rotifera',100,500,50,600,'mahkota silia berputar'],['Daphnia',800,5000,1000,20000,'kutu air, melompat-lompat'],['Vorticella',30,150,0,30,'bertangkai, menempel & mengerut'],['Diatom',20,200,3,25,'cangkang silika, meluncur pelan']],
  goals:[['track3','Lacak ≥3 organisme bergerak'],['speed','Ukur kecepatan (perlu kalibrasi)'],['clip','Rekam klip & putar gerak lambat']]},
 plant:{icon:'🌿',name:'Sel bawang & daun',tools:['peak','scale'],
  how:'Kupas selaput tipis bagian dalam sisik bawang merah, letakkan datar di kaca, tetesi air (atau betadine encer agar inti sel tampak). Stomata: oles kutek bening di bawah daun, kering, kelupas pakai selotip, tempel di kaca.',
  note:'Dinding sel bawang membentuk "batu bata". Kloroplas (3–10 µm) terlalu kecil untuk USB microscope; stomata (20–60 µm) masih bisa terlihat di perbesaran tertinggi.',
  atlas:[['Sel epidermis bawang',150,400,0,0,'memanjang, seperti batu bata'],['Stomata (mulut daun)',20,60,0,0,'dua sel penjaga berbentuk ginjal'],['Inti sel',10,25,0,0,'bintik gelap bila diwarnai'],['Butir serbuk sari',15,100,0,0,'bulat, bertekstur']],
  goals:[['count10','Hitung ≥10 sel (Vision Count)'],['measure','Ukur panjang 1 sel (perlu kalibrasi)'],['photo','Simpan foto bukti']]},
 insect:{icon:'🐜',name:'Serangga · rambut · kain',tools:['peak','stack'],
  how:'Letakkan semut/sayap nyamuk/rambut/kain di atas kertas putih. Objek 3D tidak bisa tajam semua sekaligus — gunakan 🧱 Fokus Tumpuk: putar roda fokus pelan dari atas ke bawah objek.',
  note:'Bandingkan tebal rambutmu dengan rambut teman, atau serat kapas vs poliester. Ingat menyebut satuan µm (1 mm = 1000 µm).',
  atlas:[['Rambut manusia',50,120,0,0,'bersisik halus (kutikula)'],['Serat kapas',12,22,0,0,'pita terpilin'],['Serat poliester',10,30,0,0,'silinder licin'],['Benang jahit',150,400,0,0,'banyak serat terpilin'],['Ommatidium mata lalat',15,40,0,0,'heksagon mata majemuk'],['Sisik sayap kupu-kupu',50,250,0,0,'genting berwarna']],
  goals:[['stack','Buat foto Fokus Tumpuk'],['measure','Ukur tebal rambut/serat'],['compare','Sematkan pembanding & bandingkan']]},
 micro:{icon:'💵',name:'Uang · chip · layar',tools:['peak','scale'],
  how:'Arahkan mikroskop ke mikroteks uang kertas, titik cetak majalah, jalur PCB — atau ke layar IFP ini sendiri: piksel merah-hijau-biru akan terlihat!',
  note:'Layar IFP 75" 4K: 1 piksel ≈ 430 µm; layar HP ≈ 50–80 µm. Mikroteks uang dibuat sangat kecil supaya sulit dipalsukan.',
  atlas:[['Piksel layar IFP 4K 75"',380,480,0,0,'tiga subpiksel R-G-B'],['Piksel layar HP',40,90,0,0,'subpiksel sangat rapat'],['Huruf mikroteks uang',150,350,0,0,'tulisan sangat kecil'],['Titik cetak (halftone)',40,150,0,0,'titik CMYK'],['Jalur tembaga PCB',100,400,0,0,'garis logam']],
  goals:[['measure','Ukur 1 piksel/huruf (perlu kalibrasi)'],['photo','Simpan foto bukti'],['compare','Bandingkan layar IFP vs HP']]}
};
const ORDER=['pond','plant','insect','micro'];

function init(){
 const M=window.microscope;if(!M||!M.videoElement)return setTimeout(init,120);
 const V=M.videoElement,box=M.cameraViewContainer;
 const S={sample:null,tools:new Set(),done:{},annoColor:'#ff3b6b',strokes:[],tracks:[],nextId:1,bg:null,bgW:0,recording:null,pin:null,manualCam:false};
 try{const sv=JSON.parse(localStorage.getItem('pilarBioLab')||'{}');S.sample=sv.sample||null;S.done=sv.done||{}}catch(_){}
 const save=()=>{try{localStorage.setItem('pilarBioLab',JSON.stringify({sample:S.sample,done:S.done}))}catch(_){}};
 const toast=(m,k)=>M.showNotification(m,k||'success');

 /* ---------- gaya ---------- */
 const css=document.createElement('style');css.textContent=`
 .bio-panel{border:2px solid rgba(94,233,255,.35)!important;background:linear-gradient(160deg,rgba(94,233,255,.08),rgba(201,255,66,.05))}
 .bio-samples{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
 .bio-samples button{min-height:58px;border-radius:12px;border:1px solid #cbd5e1;background:rgba(255,255,255,.7);font-weight:800;font-size:.86rem;cursor:pointer;display:flex;align-items:center;gap:8px;padding:6px 10px;text-align:left;color:var(--dark)}
 .dark-mode .bio-samples button{background:#1e293b;border-color:#475569}
 .bio-samples button span{font-size:1.5rem}.bio-samples button.on{border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.25);background:rgba(34,211,238,.12)}
 .bio-info{margin-top:10px;font-size:.84rem;line-height:1.45;color:var(--dark)}.bio-info p{margin:6px 0}.bio-info .note{color:var(--gray);font-size:.78rem}
 .bio-atlas{width:100%;border-collapse:collapse;font-size:.76rem;margin-top:6px}.bio-atlas td,.bio-atlas th{padding:4px 6px;border-bottom:1px solid rgba(100,116,139,.25);text-align:left}.bio-atlas th{font-size:.68rem;color:var(--gray);text-transform:uppercase}
 .bio-atlas tr.hit td{background:rgba(34,211,238,.16);font-weight:800}
 .bio-goals{list-style:none;padding:0;margin:8px 0 0;font-size:.82rem}.bio-goals li{padding:3px 0}
 .bio-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}
 .bio-tools button{min-height:58px;border-radius:12px;border:1px solid #cbd5e1;background:rgba(255,255,255,.75);cursor:pointer;font-weight:800;font-size:.74rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--dark);touch-action:manipulation}
 .dark-mode .bio-tools button{background:#1e293b;border-color:#475569}
 .bio-tools button b{font-size:1.25rem}.bio-tools button.on{border-color:#22c55e;background:rgba(34,197,94,.16);box-shadow:0 0 0 2px rgba(34,197,94,.25)}
 .bio-tools button.rec.on{border-color:#ef4444;background:rgba(239,68,68,.16)}
 .bio-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px;font-size:.8rem}
 .bio-row .sw{width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #94a3b8;cursor:pointer}.bio-row .sw.on{box-shadow:0 0 0 3px #0ea5e9}
 .bio-usb{font-size:.78rem;padding:7px 9px;border-radius:9px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.35);margin-top:8px}
 #bioCanvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10}
 #annoCanvas{position:absolute;inset:0;width:100%;height:100%;z-index:30;pointer-events:none;touch-action:none}
 .camera-view.anno-on #annoCanvas{pointer-events:auto;cursor:crosshair}
 .bio-chip{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);z-index:43;padding:7px 13px;border-radius:999px;background:rgba(2,6,23,.78);color:#e0f2fe;font:800 .82rem system-ui;border:1px solid rgba(94,233,255,.4);pointer-events:none;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}
 .bio-chip[hidden]{display:none}
 .bio-pin{position:absolute;right:12px;top:56px;z-index:44;width:min(30%,260px);border-radius:10px;overflow:hidden;border:2px solid #facc15;background:#000;box-shadow:0 8px 24px rgba(0,0,0,.4);cursor:pointer}
 .bio-pin img{display:block;width:100%}.bio-pin small{position:absolute;left:0;right:0;bottom:0;padding:3px 6px;background:rgba(0,0,0,.65);color:#fde68a;font:700 .7rem system-ui}
 .bio-modal{position:fixed;inset:0;z-index:3000;background:rgba(2,6,23,.86);display:grid;place-items:center;padding:16px}
 .bio-modal[hidden]{display:none}
 .bio-modal .card{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:18px;padding:16px;width:min(1100px,96vw);max-height:94vh;overflow:auto;display:grid;gap:10px}
 .bio-modal img,.bio-modal video{width:100%;max-height:70vh;object-fit:contain;background:#000;border-radius:10px}
 .bio-modal .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
 .bio-modal button{min-height:46px;padding:0 16px;border-radius:12px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-weight:800;cursor:pointer}
 .bio-modal button.pri{background:#22d3ee;color:#04202a;border-color:#22d3ee}.bio-modal button.on{border-color:#facc15;color:#facc15}
 .bio-progress{height:8px;border-radius:8px;background:#1e293b;overflow:hidden}.bio-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#a3e635)}
 /* Mode Panggung */
 body.bio-stage{overflow:hidden}
 body.bio-stage .camera-section{position:fixed;inset:0;z-index:2000;border-radius:0;margin:0;display:flex;flex-direction:column;background:#000}
 body.bio-stage .camera-section>:not(.camera-view){display:none}
 body.bio-stage .camera-view{flex:1;max-height:none!important;height:auto;aspect-ratio:auto;min-height:0!important}
 .bio-stagebar{display:none}
 body.bio-stage .bio-stagebar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:2100;gap:10px;align-items:center;padding:10px 16px;background:linear-gradient(0deg,rgba(2,6,23,.96),rgba(2,6,23,.7));color:#fff}
 .bio-stagebar .ttl{flex:1;min-width:0}.bio-stagebar .ttl b{display:block;font-size:1.5rem;line-height:1.1}.bio-stagebar .ttl small{color:#a5f3fc;font-size:1rem;font-weight:700}
 .bio-stagebar button{min-height:64px;min-width:84px;border-radius:14px;border:1px solid #475569;background:#1e293b;color:#fff;font-weight:900;font-size:.85rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
 .bio-stagebar button b{font-size:1.4rem}.bio-stagebar button.on{border-color:#22c55e;background:rgba(34,197,94,.25)}.bio-stagebar button.exit{border-color:#ef4444}
 body.bio-stage .instrument-hud{top:16px}body.bio-stage .camera-view{padding-bottom:88px}
 @media(max-width:700px){.bio-tools{grid-template-columns:repeat(3,1fr)}.bio-stagebar .ttl small{display:none}.bio-stagebar button{min-width:56px;font-size:.66rem}}
 `;document.head.appendChild(css);

 /* ---------- panel ---------- */
 const panel=document.createElement('div');panel.className='controls-panel bio-panel';panel.style.marginBottom='20px';
 panel.innerHTML=`<div class="panel-section" style="margin-bottom:0">
  <div class="panel-title"><i class="fas fa-bacteria"></i> 🧫 Lab Mikrobiologi <span class="ai-chip" id="bioState">v1.0</span></div>
  <div class="bio-samples" id="bioSamples">${ORDER.map(k=>`<button data-s="${k}"><span>${SAMPLES[k].icon}</span>${SAMPLES[k].name}</button>`).join('')}</div>
  <div class="bio-usb" id="bioUsb">🔌 Colokkan USB microscope ke IFP, lalu tekan SCAN. Kamera USB dipilih otomatis.</div>
  <div class="bio-tools" id="bioTools">
   <button data-t="peak" title="Tepi yang tajam diberi warna — bantu memutar roda fokus"><b>🎯</b>Fokus Peaking</button>
   <button data-t="best" title="Putar roda fokus pelan 6 detik; foto paling tajam disimpan"><b>✨</b>Foto Fokus Terbaik</button>
   <button data-t="track" title="Lacak organisme yang bergerak: jejak, ukuran, kecepatan"><b>🐾</b>Pelacak Gerak</button>
   <button data-t="stack" title="Gabungkan banyak bidang fokus jadi satu foto tajam"><b>🧱</b>Fokus Tumpuk</button>
   <button data-t="rec" class="rec" title="Rekam klip lalu putar gerak lambat"><b>🎬</b>Rekam Klip</button>
   <button data-t="anno" title="Coret/tandai dengan jari, ikut tersimpan di foto"><b>✏️</b>Anotasi</button>
   <button data-t="pin" title="Sematkan gambar acuan untuk dibandingkan"><b>📌</b>Pembanding</button>
   <button data-t="scale" title="Tampilkan skala µm di layar (perlu kalibrasi)"><b>📏</b>Skala µm</button>
   <button data-t="stage" title="Layar penuh untuk demo di IFP"><b>🎤</b>Mode Panggung</button>
  </div>
  <div class="bio-row" id="bioAnnoRow" hidden>Warna: ${['#ff3b6b','#facc15','#22d3ee','#a3e635','#ffffff'].map(c=>`<i class="sw" data-c="${c}" style="background:${c}"></i>`).join('')}
   <button class="btn btn-outline btn-sm" id="bioUndo" style="color:var(--dark);border-color:var(--gray)">↶ Urungkan</button><button class="btn btn-danger btn-sm" id="bioClear">Hapus coretan</button></div>
  <div class="bio-info" id="bioInfo"></div>
 </div>`;
 const col=document.querySelector('.main-content>div:last-child');col.insertBefore(panel,col.firstChild);

 /* ---------- lapisan di atas video ---------- */
 const bc=document.createElement('canvas');bc.id='bioCanvas';box.appendChild(bc);const bx=bc.getContext('2d');
 const ac=document.createElement('canvas');ac.id='annoCanvas';box.appendChild(ac);const ax=ac.getContext('2d');
 const chip=document.createElement('div');chip.className='bio-chip';chip.hidden=true;box.appendChild(chip);
 const stageBar=document.createElement('div');stageBar.className='bio-stagebar';stageBar.innerHTML=`<div class="ttl"><b id="bioStageT">PILAR Microscope Lab</b><small id="bioStageS">Lab Mikrobiologi · IFP</small></div>
  <button data-st="peak"><b>🎯</b>Peaking</button><button data-st="track"><b>🐾</b>Lacak</button><button data-st="stack"><b>🧱</b>Tumpuk</button><button data-st="anno"><b>✏️</b>Coret</button><button data-st="rec"><b>🎬</b>Rekam</button><button data-st="photo"><b>📸</b>Foto</button><button data-st="exit" class="exit"><b>✕</b>Keluar</button>`;
 document.body.appendChild(stageBar);
 const modal=document.createElement('div');modal.className='bio-modal';modal.hidden=true;document.body.appendChild(modal);

 function geom(){return{left:(box.clientWidth-V.clientWidth)/2,top:(box.clientHeight-V.clientHeight)/2,w:V.clientWidth||1,h:V.clientHeight||1}}
 function sizeLayer(c){const d=Math.min(devicePixelRatio||1,2),w=box.clientWidth,h=box.clientHeight;if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d)}return d}
 const live=()=>M.isStreaming&&V.readyState>=2&&V.videoWidth>0;
 /* ambil potongan zoom yang terlihat (sama seperti inti) */
 const GC=document.createElement('canvas'),gx=GC.getContext('2d',{willReadFrequently:true});
 function grab(W,filter=true){if(!live())return null;const z=M.zoomLevel||1,vw=V.videoWidth,vh=V.videoHeight,sw=vw/z,sh=vh/z;
  GC.width=W;GC.height=Math.max(1,Math.round(W*vh/vw));gx.filter=filter?(M.getFilterString?.()||'none'):'none';gx.drawImage(V,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,GC.width,GC.height);gx.filter='none';
  try{return gx.getImageData(0,0,GC.width,GC.height)}catch(_){return null}}
 function grayOf(d){const p=d.data,g=new Uint8Array(d.width*d.height);for(let i=0,j=0;i<g.length;i++,j+=4)g[i]=(p[j]*77+p[j+1]*150+p[j+2]*29)>>8;return g}
 /* skala: µm per piksel bingkai (lebar W) / per piksel layar */
 const umPerFramePx=W=>M.pixelScale?(V.videoWidth/((M.zoomLevel||1)*W))*M.pixelScale:null;
 const umPerScreenPx=()=>{const g=geom();return M.pixelScale?M.pixelScale*V.videoWidth/(g.w*(M.zoomLevel||1)):null};
 const fmtUm=um=>um>=1000?(um/1000).toFixed(um>=10000?0:2).replace('.',',')+' mm':Math.round(um)+' µm';

 /* ---------- pilih USB microscope otomatis ---------- */
 function camScore(label){const l=(label||'').toLowerCase();let s=0;
  if(/microscope|mikroskop|1600|1000x|digital micro|endoscope|borescope/.test(l))s+=6;
  if(/external|eksternal/.test(l))s+=5;if(/usb|uvc|2\.0 camera|hd camera|web ?cam/.test(l))s+=3;
  if(/integrated|built-?in|internal|facetime|front|back|rear|ir camera|virtual|obs|droidcam|snap camera/.test(l))s-=6;return s}
 M.cameraSelect.addEventListener('change',()=>{S.manualCam=true});
 const coreScan=M.scanCameras.bind(M);
 M.scanCameras=async(quiet)=>{await coreScan(quiet);const cams=M.availableCameras||[];if(!cams.length){$('bioUsb').textContent='🔌 Belum ada kamera. Colokkan USB microscope, izinkan kamera, lalu SCAN.';return}
  let best=null,bs=-99;cams.forEach(d=>{const s=camScore(d.label);if(s>bs){bs=s;best=d}});
  if(best&&bs>0&&!S.manualCam&&M.selectedCameraId!==best.deviceId&&!M.isStreaming){M.selectedCameraId=best.deviceId;M.cameraSelect.value=best.deviceId}
  const cur=cams.find(d=>d.deviceId===M.selectedCameraId);
  $('bioUsb').innerHTML=bs>0?'✅ USB microscope terdeteksi: <b>'+(best.label||'kamera USB')+'</b>'+(cur&&cur.deviceId!==best.deviceId?' (sedang dipilih: '+(cur.label||'lain')+')':''):'ℹ️ '+cams.length+' kamera ditemukan'+(cams.some(d=>d.label)?'':' — nama tampil setelah izin kamera')+'. Pilih USB microscope di daftar kamera.'};

 /* ---------- preset sampel ---------- */
 function renderInfo(){const s=SAMPLES[S.sample];document.querySelectorAll('#bioSamples button').forEach(b=>b.classList.toggle('on',b.dataset.s===S.sample));
  if(!s){$('bioInfo').innerHTML='<p>Pilih jenis sampel untuk panduan, atlas ukuran, dan tantangan.</p>';return}
  $('bioInfo').innerHTML=`<p><b>${s.icon} Cara menyiapkan:</b> ${s.how}</p><p class="note">${s.note}</p>
   <table class="bio-atlas" id="bioAtlas"><tr><th>Atlas</th><th>Ukuran</th>${S.sample==='pond'?'<th>Kecepatan</th>':''}<th>Ciri</th></tr>${s.atlas.map((a,i)=>`<tr data-i="${i}"><td>${a[0]}</td><td>${a[1]}–${a[2]} µm</td>${S.sample==='pond'?`<td>${a[3]}–${a[4]} µm/s</td>`:''}<td>${a[5]}</td></tr>`).join('')}</table>
   <ul class="bio-goals">${s.goals.map(g=>`<li>${S.done[S.sample+':'+g[0]]?'✅':'⬜'} ${g[1]}</li>`).join('')}</ul>`;
  $('bioStageT').textContent=s.icon+' '+s.name;}
 function goal(id){if(!S.sample)return;const k=S.sample+':'+id,s=SAMPLES[S.sample];if(S.done[k]||!s.goals.some(g=>g[0]===id))return;S.done[k]=1;save();renderInfo();toast('🏆 Tantangan selesai: '+s.goals.find(g=>g[0]===id)[1])}
 document.querySelectorAll('#bioSamples button').forEach(b=>b.onclick=()=>{S.sample=b.dataset.s;save();renderInfo();
  const s=SAMPLES[S.sample];['peak','track','scale'].forEach(t=>setTool(t,s.tools.includes(t)));
  if(S.sample==='plant'){const e=$('aiCount');if(e&&!e.checked){e.checked=true;e.dispatchEvent(new Event('change'))}}
  toast(s.icon+' Preset '+s.name+' aktif');pulse('microscope_bio_sample',{sample:S.sample})});

 /* ---------- tombol alat ---------- */
 function syncButtons(){document.querySelectorAll('#bioTools [data-t]').forEach(b=>b.classList.toggle('on',S.tools.has(b.dataset.t)||(b.dataset.t==='rec'&&!!S.recording)||(b.dataset.t==='pin'&&!!S.pin)||(b.dataset.t==='stage'&&document.body.classList.contains('bio-stage'))));
  stageBar.querySelectorAll('[data-st]').forEach(b=>b.classList.toggle('on',S.tools.has(b.dataset.st)||(b.dataset.st==='rec'&&!!S.recording)));
  $('bioAnnoRow').hidden=!S.tools.has('anno');box.classList.toggle('anno-on',S.tools.has('anno'))}
 function setTool(t,on){if(on)S.tools.add(t);else S.tools.delete(t);if(t==='track'&&!on){S.tracks=[];S.bg=null}syncButtons()}
 function needLive(){if(live())return true;toast('Nyalakan kamera dulu (SCAN → START)','error');return false}
 function act(t){
  if(t==='peak'||t==='track'||t==='scale'||t==='anno'){if(t!=='anno'&&t!=='scale'&&!S.tools.has(t)&&!needLive())return;setTool(t,!S.tools.has(t));
   if(t==='scale'&&S.tools.has('scale')&&!M.pixelScale)toast('Skala butuh kalibrasi: Tools → Kalibrasi, tarik garis pada penggaris 1 mm = 1000 µm','error');
   if(t==='track'&&S.tools.has('track'))toast('🐾 Pelacak aktif — tahan mikroskop diam, organisme bergerak akan diberi jejak');return}
  if(t==='best')return bestFocus();if(t==='stack')return focusStack();if(t==='rec')return toggleRec();
  if(t==='pin')return togglePin();if(t==='stage')return toggleStage();
 }
 document.querySelectorAll('#bioTools [data-t]').forEach(b=>b.onclick=()=>act(b.dataset.t));
 stageBar.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{const t=b.dataset.st;if(t==='exit')return toggleStage(false);if(t==='photo')return M.captureImage();act(t)});

 /* ---------- Focus peaking ---------- */
 const PK=document.createElement('canvas'),pkx=PK.getContext('2d');let pkImg=null;
 function peaking(){const d=grab(480);if(!d)return;const w=d.width,h=d.height,g=grayOf(d),mag=new Uint16Array(w*h),hist=new Uint32Array(1024);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=g[i+1-w]+2*g[i+1]+g[i+1+w]-g[i-1-w]-2*g[i-1]-g[i-1+w],gy=g[i-1+w]+2*g[i+w]+g[i+1+w]-g[i-1-w]-2*g[i-w]-g[i+1-w],m=Math.min(1023,(Math.abs(gx)+Math.abs(gy))>>1);mag[i]=m;hist[m]++}
  let need=w*h*.06,thr=1023;for(;thr>0;thr--){need-=hist[thr];if(need<=0)break}thr=Math.max(thr,38);
  if(!pkImg||pkImg.width!==w||pkImg.height!==h){pkImg=new ImageData(w,h);PK.width=w;PK.height=h}
  const o=pkImg.data;for(let i=0;i<mag.length;i++){const on=mag[i]>=thr,j=i*4;o[j]=on?170:0;o[j+1]=on?255:0;o[j+2]=on?40:0;o[j+3]=on?235:0}pkx.putImageData(pkImg,0,0)}

 /* ---------- Pelacak mikroorganisme ---------- */
 const TW=320;let trackMsg='',lastTrackT=0;
 function track(now){const d=grab(TW);if(!d)return;const w=d.width,h=d.height,g=grayOf(d),n=w*h;
  if(!S.bg||S.bgW!==w||S.bg.length!==n){            // latar = median 9 bingkai → organisme yang bergerak tidak meninggalkan "hantu"
   if(!S.warm||S.warmW!==w){S.warm=[];S.warmW=w;S.warmT=0}
   if(now-S.warmT>100){S.warm.push(g);S.warmT=now}
   trackMsg='🐾 Mempelajari latar preparat… tahan diam '+S.warm.length+'/9';
   if(S.warm.length>=9){const bg=new Float32Array(n),tmp=new Uint8Array(9);for(let i=0;i<n;i++){for(let k=0;k<9;k++)tmp[k]=S.warm[k][i];tmp.sort();bg[i]=tmp[4]}S.bg=bg;S.bgW=w;S.warm=null;S.tracks=[];lastTrackT=now}
   return}
  const dt=Math.max(.016,(now-lastTrackT)/1000);lastTrackT=now;
  // derau latar adaptif: median |g-bg|
  const hist=new Uint32Array(256);for(let i=0;i<n;i+=3)hist[Math.min(255,Math.abs(g[i]-S.bg[i])|0)]++;let acc=0,half=(n/3)/2,med=0;for(;med<255;med++){acc+=hist[med];if(acc>=half)break}
  const thr=Math.max(14,med*1.48*3.2),mask=new Uint8Array(n);let fg=0;
  for(let i=0;i<n;i++){const dv=Math.abs(g[i]-S.bg[i]);if(dv>thr){mask[i]=1;fg++}}
  if(fg>n*.22){S.bg=null;S.tracks=[];trackMsg='🤚 Preparat/kamera bergeser — tahan diam sejenak';return}
  for(let i=0;i<n;i++){const a=mask[i]?.012:.05;S.bg[i]+=a*(g[i]-S.bg[i])}
  // dilasi 1 piksel agar organisme tidak pecah
  const m2=new Uint8Array(n);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i]||mask[i-1]||mask[i+1]||mask[i-w]||mask[i+w])m2[i]=1}
  const blobs=[],stack=[];const minA=Math.max(5,n*.00006),maxA=n*.2;
  for(let i=0;i<n;i++){if(m2[i]!==1)continue;let area=0,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;stack.push(i);m2[i]=2;
   while(stack.length){const p=stack.pop(),x=p%w,y=(p/w)|0;area++;sx+=x;sy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
    if(x>0&&m2[p-1]===1){m2[p-1]=2;stack.push(p-1)}if(x<w-1&&m2[p+1]===1){m2[p+1]=2;stack.push(p+1)}if(y>0&&m2[p-w]===1){m2[p-w]=2;stack.push(p-w)}if(y<h-1&&m2[p+w]===1){m2[p+w]=2;stack.push(p+w)}}
   if(area>=minA&&area<=maxA)blobs.push({x:sx/area,y:sy/area,len:Math.hypot(x1-x0+1,y1-y0+1)*.8,area})}
  // pencocokan rakus (prediksi posisi = posisi + kecepatan)
  const maxD=w*.09,pairs=[];S.tracks.forEach((t,ti)=>{const px=t.x+t.vx*dt,py=t.y+t.vy*dt;blobs.forEach((b,bi)=>{const dd=Math.hypot(b.x-px,b.y-py);if(dd<maxD)pairs.push([dd,ti,bi])})});
  pairs.sort((a,b)=>a[0]-b[0]);const usedT=new Set(),usedB=new Set();
  pairs.forEach(([dd,ti,bi])=>{if(usedT.has(ti)||usedB.has(bi))return;usedT.add(ti);usedB.add(bi);const t=S.tracks[ti],b=blobs[bi];
   const vx=(b.x-t.x)/dt,vy=(b.y-t.y)/dt;t.vx=t.vx*.6+vx*.4;t.vy=t.vy*.6+vy*.4;t.x=b.x;t.y=b.y;t.miss=0;t.age++;t.pts.push([b.x,b.y,now]);if(t.pts.length>90)t.pts.shift();t.lens.push(b.len);if(t.lens.length>30)t.lens.shift()});
  S.tracks.forEach((t,ti)=>{if(!usedT.has(ti))t.miss++});
  blobs.forEach((b,bi)=>{if(!usedB.has(bi)&&S.tracks.length<40)S.tracks.push({id:S.nextId++,x:b.x,y:b.y,vx:0,vy:0,miss:0,age:1,pts:[[b.x,b.y,now]],lens:[b.len],hue:(S.nextId*67)%360})});
  S.tracks=S.tracks.filter(t=>t.miss<12);
  // statistik
  const k=umPerFramePx(w),solid=S.tracks.filter(t=>t.age>=6);let fast=null;
  solid.forEach(t=>{const p=t.pts,a=Math.max(0,p.findIndex(q=>now-q[2]<1500));let dist=0,kept=p[a];   // titik dicuplik tiap ≥0,2 s → derau centroid tidak menggelembungkan kecepatan
   for(let i=a+1;i<p.length;i++)if(p[i][2]-kept[2]>=200){dist+=Math.hypot(p[i][0]-kept[0],p[i][1]-kept[1]);kept=p[i]}
   const span=(kept[2]-p[a][2])/1000;t.speedPx=span>.3?dist/span:0;const L=t.lens.slice().sort((x,y)=>x-y)[t.lens.length>>1];t.lenPx=L;
   t.um=k?L*k:null;t.ums=k?t.speedPx*k:null;t.guess=k?guess(t.um,t.ums):null;if(!fast||t.speedPx>fast.speedPx)fast=t});
  const moving=solid.filter(t=>t.speedPx>1.2);if(moving.length>=3)goal('track3');if(k&&solid.some(t=>t.ums>0))goal('speed');
  trackMsg='🐾 '+moving.length+' organisme bergerak'+(fast&&fast.speedPx>0?' · tercepat #'+fast.id+(k?' '+fmtUm(fast.ums)+'/s':' '+Math.round(fast.speedPx)+' px/s'):'')+(k?'':' · kalibrasi untuk µm');
  highlightAtlas(fast&&fast.guess);
 }
 function guess(um,ums){if(S.sample!=='pond'||!um)return null;let best=null,bs=1e9;
  SAMPLES.pond.atlas.forEach((a,i)=>{const ds=um<a[1]?Math.log(a[1]/um):um>a[2]?Math.log(um/a[2]):0,dv=!ums?0:ums<a[3]?Math.log((a[3]+1)/(ums+1)):ums>a[4]?Math.log((ums+1)/(a[4]+1)):0,s=ds*1.4+dv*.6;if(s<bs){bs=s;best=i}});
  return bs<1.2?best:null}
 function highlightAtlas(i){document.querySelectorAll('#bioAtlas tr[data-i]').forEach(r=>r.classList.toggle('hit',i!=null&&+r.dataset.i===i))}

 /* ---------- gambar lapisan ---------- */
 let layerDirty=true;const setText=(el,t)=>{if(el._t!==t){el._t=t;el.textContent=t}},setHidden=(el,h)=>{if(el.hidden!==h)el.hidden=h};
 function drawLayer(now){const any=S.tools.has('peak')||S.tools.has('track')||S.tools.has('scale');if(!any||!live()){if(layerDirty){bx.setTransform(1,0,0,1,0,0);bx.clearRect(0,0,bc.width,bc.height);layerDirty=false}setHidden(chip,!(busy||stackJob));return}
  layerDirty=true;const d=sizeLayer(bc);bx.setTransform(d,0,0,d,0,0);bx.clearRect(0,0,box.clientWidth,box.clientHeight);const g=geom();
  if(S.tools.has('peak')&&pkImg){bx.save();bx.globalAlpha=.9;bx.imageSmoothingEnabled=true;bx.drawImage(PK,g.left,g.top,g.w,g.h);bx.restore()}
  if(S.tools.has('track')){const sx=g.w/TW,sy=sx;bx.lineWidth=2.5;bx.font='800 13px system-ui';
   S.tracks.forEach(t=>{if(t.age<6||t.miss>3||(t.age>15&&!(t.speedPx>1.2)))return;const c='hsl('+t.hue+',95%,60%)';bx.strokeStyle=c;bx.beginPath();let first=true;t.pts.forEach(p=>{if(now-p[2]>3000)return;const x=g.left+p[0]*sx,y=g.top+p[1]*sy;first?bx.moveTo(x,y):bx.lineTo(x,y);first=false});bx.stroke();
    const x=g.left+t.x*sx,y=g.top+t.y*sy,r=Math.max(10,(t.lenPx||8)*sx*.6);bx.beginPath();bx.arc(x,y,r,0,7);bx.stroke();
    const lab='#'+t.id+(t.um?' · '+fmtUm(t.um):'')+(t.ums?' · '+fmtUm(t.ums)+'/s':t.speedPx?' · '+Math.round(t.speedPx)+' px/s':'')+(t.guess!=null?' · '+SAMPLES.pond.atlas[t.guess][0]+'?':'');
    const tw=bx.measureText(lab).width+12;bx.fillStyle='rgba(2,6,23,.75)';bx.fillRect(x+r+4,y-11,tw,22);bx.fillStyle=c;bx.fillText(lab,x+r+10,y+5)})}
  if(S.tools.has('scale')&&M.pixelScale){const k=umPerScreenPx(),target=g.w*.18*k,steps=[10,20,50,100,200,500,1000,2000,5000];let um=steps[0];steps.forEach(s=>{if(s<=target)um=s});
   const px=um/k,x=g.left+24,y=g.top+g.h-30;bx.fillStyle='rgba(2,6,23,.6)';bx.fillRect(x-10,y-34,px+20,46);bx.fillStyle='#fff';bx.fillRect(x,y-4,px,8);bx.fillStyle='#0f172a';bx.fillRect(x+px/2,y-4,px/2,8);
   bx.strokeStyle='#fff';bx.strokeRect(x,y-4,px,8);bx.font='900 16px system-ui';bx.fillStyle='#fff';bx.textAlign='left';bx.fillText(fmtUm(um),x,y-12)}
  bx.textAlign='left';
  const msg=S.tools.has('track')?trackMsg:'';if(!busy&&!stackJob){setHidden(chip,!msg);if(msg)setText(chip,msg)}
  setText($('bioStageS'),(msg||(M.pixelScale?'Terkalibrasi · '+(M.pixelScale).toFixed(3)+' µm/px':'Lab Mikrobiologi · IFP'))+(S.recording?' · ⏺ REKAM':''));
 }

 /* ---------- Anotasi multi-jari ---------- */
 const pens=new Map();
 function annoPoint(e){const r=box.getBoundingClientRect(),g=geom();return[(e.clientX-r.left-g.left)/g.w,(e.clientY-r.top-g.top)/g.h]}
 function drawAnno(){const d=sizeLayer(ac);ax.setTransform(d,0,0,d,0,0);ax.clearRect(0,0,box.clientWidth,box.clientHeight);const g=geom();ax.lineCap='round';ax.lineJoin='round';
  S.strokes.forEach(s=>{ax.strokeStyle=s.c;ax.lineWidth=s.w;ax.shadowColor='rgba(0,0,0,.6)';ax.shadowBlur=3;ax.beginPath();s.p.forEach((q,i)=>{const x=g.left+q[0]*g.w,y=g.top+q[1]*g.h;i?ax.lineTo(x,y):ax.moveTo(x,y)});ax.stroke()});ax.shadowBlur=0}
 ac.addEventListener('pointerdown',e=>{if(!S.tools.has('anno'))return;if(e.pointerType==='touch'&&Math.max(e.width||0,e.height||0)>90)return;e.preventDefault();e.stopPropagation();ac.setPointerCapture(e.pointerId);
  const s={c:S.annoColor,w:document.documentElement.dataset.ui==='ifp'?6:4,p:[annoPoint(e)]};S.strokes.push(s);pens.set(e.pointerId,s);drawAnno()});
 ac.addEventListener('pointermove',e=>{const s=pens.get(e.pointerId);if(!s)return;e.preventDefault();s.p.push(annoPoint(e));drawAnno()});
 const penUp=e=>{pens.delete(e.pointerId)};ac.addEventListener('pointerup',penUp);ac.addEventListener('pointercancel',penUp);
 document.querySelectorAll('#bioAnnoRow .sw').forEach(sw=>sw.onclick=()=>{S.annoColor=sw.dataset.c;document.querySelectorAll('#bioAnnoRow .sw').forEach(x=>x.classList.toggle('on',x===sw))});
 document.querySelector('#bioAnnoRow .sw').classList.add('on');
 $('bioUndo').onclick=()=>{S.strokes.pop();drawAnno()};$('bioClear').onclick=()=>{S.strokes=[];drawAnno()};

 /* ---------- hook capture: anotasi, jejak & label sampel ikut tersimpan ---------- */
 (M.captureOverlays=M.captureOverlays||[]).push((ctx,o)=>{const W=o.vidWidth,H=o.vidHeight,k=W/1000;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  S.strokes.forEach(s=>{ctx.strokeStyle=s.c;ctx.lineWidth=s.w*k*1.6;ctx.beginPath();s.p.forEach((q,i)=>{i?ctx.lineTo(q[0]*W,q[1]*H):ctx.moveTo(q[0]*W,q[1]*H)});ctx.stroke()});
  if(S.tools.has('track')){const sc=W/TW;ctx.lineWidth=Math.max(2,3*k);S.tracks.forEach(t=>{if(t.age<4)return;ctx.strokeStyle='hsl('+t.hue+',95%,60%)';ctx.beginPath();t.pts.forEach((p,i)=>{i?ctx.lineTo(p[0]*sc,p[1]*sc):ctx.moveTo(p[0]*sc,p[1]*sc)});ctx.stroke();
   ctx.font='800 '+Math.max(14,20*k)+'px sans-serif';ctx.fillStyle='hsl('+t.hue+',95%,70%)';ctx.fillText('#'+t.id+(t.ums?' '+fmtUm(t.ums)+'/s':''),t.x*sc+12*k,t.y*sc)})}
  if(S.sample){ctx.font='800 '+Math.max(14,20*k)+'px sans-serif';ctx.fillStyle='rgba(255,255,255,.9)';ctx.textAlign='left';ctx.fillText(SAMPLES[S.sample].icon+' '+SAMPLES[S.sample].name,30,72*Math.max(1,k*.8))}
  ctx.restore();goal('photo');if(M.measurements?.length&&M.pixelScale)goal('measure')});
 const coreUp=M.handleMouseUp.bind(M);M.handleMouseUp=e=>{coreUp(e);if(M.measurements?.length&&M.pixelScale&&!M.calibrationMode)goal('measure')};

 /* ---------- simpan kanvas ke galeri inti ---------- */
 async function saveToGallery(canvas,label){const ctx=canvas.getContext('2d'),W=canvas.width,k=W/1000;ctx.font='italic '+Math.max(14,20*k)+'px monospace';ctx.fillStyle='rgba(255,255,255,.78)';ctx.textAlign='right';ctx.fillText('PILAR Creator ID · '+(M.brandingString||''),W-30,40);
  ctx.textAlign='left';ctx.font='bold '+Math.max(14,18*k)+'px sans-serif';ctx.fillStyle='rgba(94,233,255,.9)';ctx.fillText('PILAR™ Microscope Lab · '+label,30,40);
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)return;const now=Date.now(),stamp=new Date().toLocaleString('id-ID'),obj={id:now,blob,timestamp:stamp+' · '+label,zoom:(M.zoomLevel||1).toFixed(1),calibrated:!!M.pixelScale,filename:'PILAR_Microscope_'+label.replace(/\W+/g,'_')+'_'+now+'.png'};
  try{await M.imageStore.put(obj);M.capturedImages.unshift(obj);while(M.capturedImages.length>M.MAX_GALLERY_ITEMS){const old=M.capturedImages.pop();await M.imageStore.delete(old.id)}await M.loadGallery();M.markPhase?.('buktikan',label+' tersimpan');toast('📁 '+label+' tersimpan di galeri')}
  catch(e){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=obj.filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}}
 function fullFrame(){const vw=V.videoWidth,vh=V.videoHeight,z=M.zoomLevel||1,c=document.createElement('canvas');c.width=vw;c.height=vh;const x=c.getContext('2d');x.filter=M.getFilterString?.()||'none';x.drawImage(V,(vw-vw/z)/2,(vh-vh/z)/2,vw/z,vh/z,0,0,vw,vh);x.filter='none';return c}
 function lapScore(){const d=grab(320);if(!d)return 0;const g=grayOf(d),w=d.width,h=d.height;let s=0,s2=0,n=0;
  for(let y=Math.floor(h*.2);y<h*.8;y++)for(let x=Math.floor(w*.2);x<w*.8;x++){const i=y*w+x,l=4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w];s+=l;s2+=l*l;n++}return n?s2/n-(s/n)**2:0}

 /* ---------- Foto fokus terbaik ---------- */
 let busy=false;
 async function bestFocus(){if(!needLive()||busy)return;busy=true;const btn=document.querySelector('#bioTools [data-t="best"]');btn.classList.add('on');
  let best=-1,bestC=null;const T0=performance.now(),DUR=6000;toast('✨ Putar roda fokus PELAN maju-mundur selama 6 detik…');
  while(performance.now()-T0<DUR){const s=lapScore();if(s>best){best=s;bestC=fullFrame()}chip.hidden=false;chip.textContent='✨ Mencari fokus terbaik… '+Math.ceil((DUR-(performance.now()-T0))/1000)+' dtk · skor '+Math.round(s);await new Promise(r=>setTimeout(r,110))}
  btn.classList.remove('on');busy=false;if(bestC)await saveToGallery(bestC,'Fokus terbaik');pulse('microscope_best_focus',{score:Math.round(best)})}

 /* ---------- Fokus tumpuk (Extended Depth of Field) ----------
    Untuk tiap piksel, ambil warna dari bingkai yang paling tajam di sekitar piksel itu
    (|Laplacian| dirata-rata kotak 9×9 via citra integral). Gabungan dibangun bertahap → hemat memori. */
 let stackJob=null;
 function focusStack(){if(stackJob){stackJob.stop=true;return}if(!needLive()||busy)return;busy=true;
  const W=Math.min(960,V.videoWidth||960);let n=0,res=null,best=null,w=0,h=0;stackJob={stop:false};setTool('stack',true);
  const T0=performance.now(),DUR=9000,R=4;toast('🧱 Putar roda fokus pelan dari ATAS ke BAWAH objek (±8 detik). Tekan Fokus Tumpuk lagi untuk selesai.');
  (async function loop(){while(!stackJob.stop&&performance.now()-T0<DUR){const d=grab(W);if(d){if(!res){w=d.width;h=d.height;res=new Uint8ClampedArray(d.data);best=new Float32Array(w*h).fill(-1)}
     const g=grayOf(d),I=new Float64Array((w+1)*(h+1));
     for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=y*w+x;let l=0;if(x>0&&y>0&&x<w-1&&y<h-1)l=Math.abs(4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w]);row+=l;I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+row}}
     const p=d.data;let changed=0;
     for(let y=0;y<h;y++){const y0=Math.max(0,y-R),y1=Math.min(h,y+R+1);for(let x=0;x<w;x++){const x0=Math.max(0,x-R),x1=Math.min(w,x+R+1),s=(I[y1*(w+1)+x1]-I[y0*(w+1)+x1]-I[y1*(w+1)+x0]+I[y0*(w+1)+x0])/((y1-y0)*(x1-x0)),i=y*w+x;
      if(s>best[i]){best[i]=s;const j=i*4;res[j]=p[j];res[j+1]=p[j+1];res[j+2]=p[j+2];res[j+3]=255;changed++}}}
     n++;chip.hidden=false;chip.textContent='🧱 Fokus tumpuk: '+n+' bidang · '+Math.round(changed/(w*h)*100)+'% piksel diperbarui · '+Math.ceil((DUR-(performance.now()-T0))/1000)+' dtk';}
    await new Promise(r=>setTimeout(r,90))}
   const job=stackJob;stackJob=null;busy=false;setTool('stack',false);chip.hidden=true;
   if(n<3){toast('Fokus tumpuk butuh ≥3 bidang — putar roda fokus lebih pelan','error');return}
   const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(res,w,h),0,0);
   showResult('🧱 Hasil Fokus Tumpuk · '+n+' bidang fokus digabung',c,async()=>{await saveToGallery(c,'Fokus tumpuk '+n+' bidang');goal('stack')});pulse('microscope_focus_stack',{frames:n})})()}
 function showResult(title,canvas,onSave){modal.hidden=false;modal.innerHTML='<div class="card"><b style="font-size:1.2rem">'+title+'</b><img alt="hasil"><div class="row"><button id="bioMClose">Tutup</button><button class="pri" id="bioMSave">💾 Simpan ke galeri</button></div></div>';
  modal.querySelector('img').src=canvas.toDataURL('image/jpeg',.92);$('bioMClose').onclick=()=>{modal.hidden=true};$('bioMSave').onclick=async()=>{await onSave();modal.hidden=true}}

 /* ---------- Rekam klip + gerak lambat ---------- */
 function toggleRec(){if(S.recording){S.recording.rec.stop();return}if(!needLive())return;if(!window.MediaRecorder)return toast('Perekam video tidak didukung browser ini','error');
  const types=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'],type=types.find(t=>MediaRecorder.isTypeSupported?.(t))||'';let rec;
  try{rec=new MediaRecorder(M.stream,type?{mimeType:type,videoBitsPerSecond:4e6}:undefined)}catch(e){return toast('Gagal merekam: '+e.message,'error')}
  const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  rec.onstop=()=>{clearTimeout(S.recording?.timer);S.recording=null;syncButtons();const blob=new Blob(chunks,{type:rec.mimeType||'video/webm'}),url=URL.createObjectURL(blob);
   modal.hidden=false;modal.innerHTML='<div class="card"><b style="font-size:1.2rem">🎬 Putar ulang · gerak lambat</b><video controls loop playsinline></video><div class="row"><span style="margin-right:auto;align-self:center;color:#94a3b8">Kecepatan:</span><button data-r=".25">¼×</button><button data-r=".5">½×</button><button data-r="1" class="on">1×</button><button id="bioMDl">💾 Unduh</button><button class="pri" id="bioMClose">Tutup</button></div></div>';
   const v=modal.querySelector('video');v.src=url;v.play().catch(()=>{});
   modal.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{v.playbackRate=+b.dataset.r;modal.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('on',x===b))});
   $('bioMDl').onclick=()=>{const a=document.createElement('a');a.href=url;a.download='PILAR_Microscope_klip_'+Date.now()+(blob.type.includes('mp4')?'.mp4':'.webm');a.click()};
   $('bioMClose').onclick=()=>{modal.hidden=true;v.pause();setTimeout(()=>URL.revokeObjectURL(url),500)};goal('clip')};
  rec.start(250);S.recording={rec,timer:setTimeout(()=>{try{rec.stop()}catch(_){}},20000)};syncButtons();toast('⏺ Merekam (maks 20 dtk) — tekan Rekam Klip lagi untuk berhenti');pulse('microscope_clip')}

 /* ---------- Pembanding (sematkan acuan) ---------- */
 function togglePin(){if(S.pin){S.pin.remove();S.pin=null;syncButtons();return}if(!needLive())return;const c=fullFrame(),el=document.createElement('div');el.className='bio-pin';
  el.innerHTML='<img alt="pembanding"><small>📌 '+(S.sample?SAMPLES[S.sample].icon+' ':'')+'acuan · '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+' · ketuk untuk lepas</small>';
  el.querySelector('img').src=c.toDataURL('image/jpeg',.85);el.onclick=e=>{e.stopPropagation();togglePin()};box.appendChild(el);S.pin=el;syncButtons();goal('compare');toast('📌 Acuan disematkan — ganti sampel lalu bandingkan')}

 /* ---------- Mode Panggung ---------- */
 function toggleStage(on){on=on==null?!document.body.classList.contains('bio-stage'):on;document.body.classList.toggle('bio-stage',on);
  try{if(on&&!document.fullscreenElement)document.documentElement.requestFullscreen({navigationUI:'hide'});if(!on&&document.fullscreenElement)document.exitFullscreen()}catch(_){}
  setTimeout(()=>{M.updateOverlays?.();window.dispatchEvent(new Event('resize'))},120);syncButtons();if(on){renderInfo();pulse('microscope_stage')}}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('bio-stage'))toggleStage(false)});
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('bio-stage'))toggleStage(false)});

 /* ---------- loop ---------- */
 let tPk=0,tTr=0;
 function loop(now){requestAnimationFrame(loop);if(document.hidden)return;
  if(live()&&!M.isFrozen){if(S.tools.has('peak')&&now-tPk>140){tPk=now;try{peaking()}catch(e){console.warn(e)}}
   if(S.tools.has('track')&&now-tTr>70){tTr=now;try{track(now)}catch(e){console.warn(e)}}}
  drawLayer(now);if(S.strokes.length||pens.size){drawAnno();annoDirty=true}else if(annoDirty){ax.setTransform(1,0,0,1,0,0);ax.clearRect(0,0,ac.width,ac.height);annoDirty=false}}
 let annoDirty=false;
 requestAnimationFrame(loop);
 const coreStop=M.stopCamera.bind(M);M.stopCamera=(silent)=>{if(S.recording)try{S.recording.rec.stop()}catch(_){}S.tracks=[];S.bg=null;pkImg=null;chip.hidden=true;return coreStop(silent)};

 renderInfo();syncButtons();
 window.PILAR_BIOLAB={state:S,samples:SAMPLES,act,setTool,grab,guess,camScore};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
