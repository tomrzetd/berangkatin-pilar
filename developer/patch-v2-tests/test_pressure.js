const fs=require('fs'),vm=require('vm'),path=require('path');
const root=process.argv[2];const D=path.join(root,'apps/pressure/');
const mk=()=>new Proxy(function(){},{get:(t,k)=>{if(k==='querySelectorAll')return()=>[];if(k==='length')return 0;if(k==='classList')return{add(){},remove(){},toggle(){},contains:()=>false};if(k==='style'||k==='dataset')return t[k]||(t[k]={setProperty(){}});if(k==='clientWidth')return 320;if(k==='getContext')return()=>ctx;if(k===Symbol.toPrimitive)return()=>'';if(k in t)return t[k];return mk()},set:(t,k,v)=>{t[k]=v;return true},apply:()=>mk()});
const calls=[];const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='measureText'?(s)=>({width:String(s).length*8}):(...a)=>{calls.push(k)}),set:(t,k,v)=>{t[k]=v;return true}});
const store={};
const doc={readyState:'complete',createElement:()=>mk(),querySelector:()=>mk(),querySelectorAll:()=>[],addEventListener(){},body:mk(),documentElement:{style:{setProperty(){}}},hidden:false};
const win={document:doc,sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v)},location:{href:'http://x/apps/pressure/index.html',search:''},history:{replaceState(){}},addEventListener(){},requestAnimationFrame(){},navigator:{vibrate(){}},confirm:()=>true,devicePixelRatio:1,performance,URL,URLSearchParams,setTimeout,clearTimeout,console,PILAR:{}};
win.window=win;win.self=win;
const c=vm.createContext(Object.assign(win,{}));
const run=f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
run(path.join(root,'labs/pressure/physics.js'));
run(D+'stage.js');
// stage palsu
win.PILAR.pressureStage={create:()=>({renderer:{domElement:mk()},setQuality(){},unmount(){},render(){},dispose(){}})};
['lab-solid.js','lab-fluid.js','lab-pascal.js','lab-drone.js'].forEach(f=>run(D+f));
win.PILAR.pressureLabs.list.forEach(s=>s.createScene=()=>({update(){},view(){},views:[]}));
run(D+'app.js');
const A=win.PILAR.pressureApp,S=A.state;let pass=0,fail=0;
const ok=(n,x)=>{x?pass++:(fail++,console.log('GAGAL:',n))};
A.boot();
for(const id of ['padat','cair','pascal','bernoulli']){
  const sp=win.PILAR.pressureLabs[id];
  A.openLab(id);const st=S.labs[id];
  ok(id+' mulai di lihat',st.phase==='lihat');
  A.go('coba');ok(id+' kunci keras: coba tanpa tebakan ditolak',st.phase==='lihat');
  A.go('aha');ok(id+' kunci keras: aha tanpa selesai ditolak',st.phase==='lihat');
  st.prediction=sp.predict.options[0].v;A.go('tebak');A.nextStep();
  ok(id+' tebakan terkunci & pindah coba',st.locked&&st.phase==='coba');
  A.go('rekayasa');ok(id+' kunci keras: Terapkan belum boleh sebelum Selidiki tuntas',st.phase==='coba');
  // sesudah pola muncul, langkah berikutnya menjadi saran lunak, bukan blokir
  sp.missions.forEach(m=>A.api.mark(m.id));ok(id+' aha terbuka setelah misi',st.aha);
  A.go('rekayasa');ok(id+' setelah Selidiki, Terapkan boleh dibuka',st.phase==='rekayasa');
  ok(id+' saran lunak tersedia',!!A.softHint(st,'rekayasa')&&A.canGo(st,'rekayasa')===null);
  // bukti dua kondisi
  A.go('coba');
  A.go('aha');ok(id+' aha bisa dibuka',st.phase==='aha');
  A.api.xp(0);st.formula=true;A.go('buktikan');
  // catat 2 bukti beda (ubah param)
  const rec=()=>{const r=sp.proof.record(st);st.seq++;st.evidence.push({id:st.seq,cells:r.cells,data:r.data})};
  rec();
  if(id==='padat'){const os=win.PILAR.pressurePhysics.solid.OBJECTS[st.params.obj].orients;A.api.setParam('orient',os.find(o=>o.id!==st.params.orient).id)}
  if(id==='cair'){A.api.setParam('depth',2)}
  if(id==='pascal'){A.api.setParam('A2',st.params.A2*2)}
  if(id==='bernoulli'){A.api.setParam('throttle',Math.min(1,st.params.throttle+.2))}
  rec();
  calls.length=0;A.drawGraph(st);ok(id+' grafik menggambar titik (arc dipanggil)',calls.filter(x=>x==='arc').length>=2);
  st.reflection={a:'tekanan naik',b:'bukti 1 dan 2',c:'karena luas kecil'};st.revision='ubah';st.reason='logika';
  const tx=A.storyText(st);ok(id+' cerita memuat refleksi',/tekanan naik/.test(tx)&&/Perlu kuubah/.test(tx)&&/logikaku/.test(tx));
  A.saveNow();
}
const raw=store['pilar.pressure.v2'];ok('progres tersimpan',!!raw);
const d=JSON.parse(raw);ok('semua lab tersimpan',Object.keys(d.labs).length===4);
ok('refleksi tersimpan',d.labs.padat.reflection.a==='tekanan naik'&&d.labs.padat.evidence.length===2);
// muat ulang: state baru
delete S.labs.padat;S.saved={};A.loadState();
ok('loadState memulihkan saved',!!S.saved.padat);
A.openLab('padat');const st2=S.labs.padat;
ok('pulih: tebakan terkunci',st2.locked===true&&st2.prediction);
ok('pulih: bukti & refleksi',st2.evidence.length===2&&st2.reflection.c==='karena luas kecil'&&st2.revision==='ubah'&&st2.reason==='logika');
ok('pulih: params lengkap',Object.keys(st2.params).length>=Object.keys(win.PILAR.pressureLabs.padat.defaults()).length);
// data rusak tidak membuat crash
store['pilar.pressure.v2']='{rusak';delete S.labs.cair;S.saved={};A.loadState();A.openLab('cair');ok('data rusak aman',S.labs.cair.phase==='lihat');
console.log(`Lulus ${pass}, gagal ${fail}`);process.exit(fail?1:0);