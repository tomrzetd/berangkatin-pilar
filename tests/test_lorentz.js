const fs=require('fs');
const html=fs.readFileSync(process.argv[2]+'/apps/lorentz-lab/index.html','utf8');
const a=html.indexOf('/*LEARN-PURE-START*/'),b=html.indexOf('function updateUI(s){\n    updateLearnUI(s);');
if(a<0||b<0){console.log('blok tidak ditemukan');process.exit(1)}
const block=html.slice(html.lastIndexOf('\n',a),b);
let pass=0,fail=0;const ok=(n,x)=>{x?pass++:(fail++,console.log('GAGAL:',n))};
const els={};const mkEl=sel=>els[sel]||(els[sel]={sel,dataset:{},style:{},classList:{toggle(){},add(){},remove(){}},hidden:false,textContent:'',innerHTML:'',value:'',clientWidth:320,setAttribute(k,v){this['a_'+k]=v},getContext:()=>ctx,remove(){},click(){this.clicked=true},appendChild(){}});
const arcs=[];const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:k==='measureText'?s=>({width:String(s).length*8}):k==='createLinearGradient'?()=>({addColorStop(){}}):(...a)=>{if(k==='arc')arcs.push(a)},set:(t,k,v)=>{t[k]=v;return true}});
const xp=[];const toasts=[];
const P={joy:{addXP:(k,n)=>xp.push(k)},state:{get:()=>S,patch:fn=>fn(S)}};
const doc={createElement:t=>({...mkEl('new:'+t),getContext:()=>ctx,toDataURL:()=>'data:image/png;base64,AA',click(){doc.lastDownload=this.download},style:{}}),body:{appendChild(){}}};
const S={learn:{reason:null,revision:null,factors:[],a:'',b:'',c:''},prediction:null,evidence:[],aha:{unlocked:false},reveal:{formula:false},phase:'tebak'};
const factory=new Function('P','$','$$','toast','go','document','window','navigator','render','startTour','startVision','showMissionGate','fmt','confirm','location',
 block+'\nreturn{updateLearnUI,drawProofGraph,dirBind,bindLearnUI,storyText,makeCard,DIR,enterLab,outcome,proofPair,factorReport,dirQuestion,dirCross,dirName};');
const buttons={'#factorRow button':['B','V','R','warna','sakelar'].map(k=>({dataset:{factor:k},setAttribute(a,v){this['a_'+a]=v},disabled:false})),'#reasonRow button':['alami','logika'].map(k=>({dataset:{reason:k},setAttribute(a,v){this['a_'+a]=v},disabled:false})),'#reviseRow button':['tepat','ubah'].map(k=>({dataset:{rev:k},setAttribute(a,v){this['a_'+a]=v}}))};
const L=factory(P,mkEl,sel=>buttons[sel]||[],(a,b)=>toasts.push(a),()=>{},doc,{devicePixelRatio:1},{clipboard:{writeText:async()=>{}}},{setView(){}},()=>{},()=>{},()=>{},(x,d)=>Number(x).toFixed(d).replace('.',','),()=>true,{reload(){}});

// outcome
const ev=(id,pol,dir,on=true,extra={})=>Object.assign({id,polarity:pol,direction:dir,on,B:.3,V:3.7,R:2,current:pol*1.85,fIdeal:pol*.0555,fEffective:pol*.05},extra);
S.prediction='balik';S.evidence=[ev(1,1,'kanan')];ok('outcome null sebelum balik baterai',L.outcome(S)===null);
S.evidence=[ev(1,1,'kanan'),ev(2,-1,'kiri')];ok('balik: tebakan balik tepat',L.outcome(S).ok===true&&L.outcome(S).actual==='balik');
S.prediction='sama';ok('balik: tebakan sama salah',L.outcome(S).ok===false);
S.prediction='hilang';ok('hilang salah bila kawat bergerak',L.outcome(S).ok===false);
S.prediction='kiri';ok('tebakan lama (kiri) aman -> null',L.outcome(S)===null);
S.prediction='balik';S.evidence=[ev(1,1,'kanan'),ev(2,-1,'diam')];ok('e2 diam tidak dihakimi',L.outcome(S)===null);
S.evidence=[ev(1,1,'kanan'),ev(2,1,'kanan')];ok('tanpa membalik polaritas -> null',L.outcome(S)===null);
// proofPair
S.evidence=[ev(1,1,'kanan',true,{B:.2,fIdeal:.037,current:1.85}),ev(2,1,'kanan',true,{B:.4,fIdeal:.074,current:1.85})];
ok('pola B x2 -> F x2',/B dikali 2,0.*F ikut dikali 2,0/.test(L.proofPair(S)||''));
S.evidence=[ev(1,1,'kanan',true,{V:2,fIdeal:.03,current:1}),ev(2,1,'kanan',true,{V:4,fIdeal:.06,current:2})];ok('pola V',/V dikali 2,0/.test(L.proofPair(S)||''));
S.evidence=[ev(1,1,'kanan',true,{R:1,fIdeal:.12,current:3.7}),ev(2,1,'kanan',true,{R:2,fIdeal:.06,current:1.85})];ok('pola R (kebalikan)',/R dikali 2,0.*lebih kecil/.test(L.proofPair(S)||''));
S.evidence=[ev(1,1,'kanan',true,{B:.2,fIdeal:.037}),ev(2,1,'kanan',true,{B:.4,fIdeal:.05})];ok('data tak proporsional -> tidak ada klaim palsu',L.proofPair(S)===null);
S.evidence=[ev(1,1,'kanan',true,{B:.2,V:3,fIdeal:.03}),ev(2,1,'kanan',true,{B:.4,V:5,fIdeal:.06})];ok('dua variabel berubah -> tidak ada klaim',L.proofPair(S)===null);
// factorReport
S.learn.factors=['B','warna'];const fr=L.factorReport(S);ok('faktor: tepat/belum/tidak',/Tepat.*Magnet/.test(fr)&&/Belum kamu duga.*Baterai.*Hambatan/.test(fr)&&/tidak memengaruhi.*warna/.test(fr));
S.learn.factors=[];ok('faktor kosong aman',/belum memilih/.test(L.factorReport(S)));
// arah: cocokkan dengan aturan tangan kanan (I=ibu jari, B=empat jari, F=telapak)
const rh={'1,0,0|0,0,1':'bawah','1,0,0|0,0,-1':'atas','-1,0,0|0,0,1':'atas','0,1,0|0,0,1':'kanan','0,1,0|0,0,-1':'kiri','0,-1,0|0,0,1':'kiri','0,-1,0|0,0,-1':'kanan','-1,0,0|0,0,-1':'bawah'};
for(const k in rh){const [i,bb]=k.split('|').map(x=>x.split(',').map(Number));ok('arah '+k,L.dirName(L.dirCross(i,bb))===rh[k])}
let seq=0;const r=()=>{seq=(seq*9301+49297)%233280;return seq/233280};
let seen=new Set(),rep=0,prev=null;for(let i=0;i<300;i++){const q=L.dirQuestion(prev,r);seen.add(q.I+'|'+q.B);if(prev&&q.I.join()===prev.I.join()&&q.B.join()===prev.B.join())rep++;prev=q}
ok('semua 8 kombinasi soal muncul',seen.size===8);ok('tak ada soal berulang berurutan',rep===0);
// UI
S.phase='tebak';S.prediction='balik';S.evidence=[ev(1,1,'kanan'),ev(2,-1,'kiri')];S.aha.unlocked=true;S.reveal.formula=true;S.learn.factors=['B'];S.learn.revision='tepat';
L.updateLearnUI(S);
ok('chip faktor B ditandai, V tidak',buttons['#factorRow button'][0]['a_aria-pressed']===true&&buttons['#factorRow button'][1]['a_aria-pressed']===false);
ok('predResult memuat hasil',/tepat/.test(els['#predResult'].innerHTML));
ok('kartu arah muncul setelah rumus',els['#dirCard'].hidden===false);
ok('chip dikunci di luar fase tebak setelah pindah',(S.phase='coba',L.updateLearnUI(S),buttons['#factorRow button'][0].disabled===true));
// latihan arah penuh
L.bindLearnUI();const box=els['#dirQ'];
for(let i=0;i<3;i++){const ans=L.DIR.q.ans;box.onclick({target:{closest:s=>s==='[data-ans]'?{dataset:{ans}}:null}});box.onclick({target:{closest:s=>s==='[data-dir]'?{dataset:{dir:'next'}}:null}})}
ok('latihan arah selesai 3 soal',L.DIR.done&&L.DIR.ok===3);ok('XP arah diberikan sekali',xp.filter(x=>x==='dir').length===1);
// ledger toggle, refleksi, kartu
els['#learnA'].oninput({target:{value:'kalau baterai dibalik, kawat berbalik arah dan gayanya sama besar'}});
ok('refleksi tersimpan di state',S.learn.a.startsWith('kalau baterai'));ok('XP refleksi',xp.includes('reflect'));
ok('cerita memuat refleksi & alasan',/kalau baterai/.test(L.storyText(S))&&/Magnet lebih kuat/.test(L.storyText(S)));
L.makeCard();ok('kartu temuan diunduh (PNG)',doc.lastDownload==='kartu-temuan-lorentz.png');
S.learn.a='';toasts.length=0;L.makeCard();ok('kartu tanpa cerita ditolak dengan pesan',toasts.some(t=>/Tulis dulu/.test(t)));
// grafik
S.phase='buktikan';S.evidence=[ev(1,1,'kanan',true,{B:.2,fIdeal:.037}),ev(2,1,'kanan',true,{B:.4,fIdeal:.074}),ev(3,1,'kanan',true,{B:.3,fIdeal:.055,current:3.7})];
arcs.length=0;L.drawProofGraph(S);ok('grafik bukti menggambar 3 titik',arcs.length===3);
arcs.length=0;L.drawProofGraph(S);ok('grafik tidak digambar ulang bila data sama',arcs.length===0);
// enterLab tidak memaksa fase bila siswa sudah di tengah
let went=0;const L2=new Function('P','$','$$','toast','go','document','window','navigator','render','startTour','startVision','showMissionGate','fmt','confirm','location',block+'\nreturn{enterLab};')(P,mkEl,()=>[],()=>{},()=>went++,doc,{},{},{setView(){}},()=>{},()=>{},()=>{},()=>'',()=>true,{});
S.phase='coba';L2.enterLab();ok('enterLab tidak mereset fase saat sesi dipulihkan',went===0);S.phase='lihat';L2.enterLab();ok('enterLab masuk ke lihat pada sesi baru',went===1);
console.log(`Lulus ${pass}, gagal ${fail}`);process.exit(fail?1:0);