(function(){
'use strict';
const $=s=>document.querySelector(s),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const {ZC,ZN,NODES,LINKS,TC,TN,EVT}=window.BIOWEB_DATA;
const S={day:1,run:false,pop:{},ev:null,left:0,hist:[],sel:null,flt:'all',pred:null,pledge:null,auto:!matchMedia('(prefers-reduced-motion:reduce)').matches,A:null,evLog:0,q:''};
NODES.forEach(n=>S.pop[n.id]=100);
function health(){return clamp(100-NODES.reduce((a,n)=>a+Math.abs(S.pop[n.id]-100),0)/NODES.length*1.4,0,100)}
function snap(col){return{day:S.day,h:health(),col:col||0x7ee08a,pop:{...S.pop},ev:S.ev,left:S.left}}
function step(){
if(S.day>=30){S.run=false;return ui()}
const d={},dev=k=>(S.pop[k]-100)/100;NODES.forEach(n=>d[n.id]=(100-S.pop[n.id])*.03);
LINKS.forEach(l=>{if(l.t==='s'||l.t==='c')d[l.b]+=dev(l.a)*3;else if(l.t==='e'){d[l.b]+=dev(l.a)*1.6;d[l.a]-=Math.max(0,dev(l.b))*2}else d[l.b]-=Math.max(0,dev(l.a))*2.5});
S.hist=S.hist.filter(x=>x.day<=S.day);let col=0x7ee08a;
if(S.ev&&S.left>0){const e=EVT[S.ev];for(const k in e[3])d[k]+=e[3][k];S.left--;col=e[1]}
NODES.forEach(n=>S.pop[n.id]=clamp(S.pop[n.id]+d[n.id],15,150));
S.day++;S.hist.push(snap(col));ui()}
function apply(id){S.ev=id;S.left=EVT[id][2];S.evLog=(S.evLog||0)+1;toast(EVT[id][0]+' dimulai. Tekan Jalankan waktu.');ui()}
function reset(){S.day=1;S.run=false;S.ev=null;S.left=0;S.hist=[];S.pledge=null;S.evLog=0;NODES.forEach(n=>S.pop[n.id]=100);S.hist=[snap()];ui()}
function scrub(d){const s=S.hist.find(x=>x.day===d);if(!s)return toast("Hari itu belum dijalani");S.run=false;S.day=d;S.pop={...s.pop};S.ev=s.ev;S.left=s.left;toast("Kembali ke hari "+d+". Tekan Jalankan untuk mencoba jalur lain.");ui()}
function toast(m){const t=$('#ts');t.textContent=m;t.classList.add('show');clearTimeout(toast.i);toast.i=setTimeout(()=>t.classList.remove('show'),2600)}
// ---------- UI ----------
const KEY="pilar.bioweb.ciremai.v02";
function save(){try{sessionStorage.setItem(KEY,JSON.stringify({day:S.day,pop:S.pop,ev:S.ev,left:S.left,hist:S.hist,pred:S.pred,pledge:S.pledge,evLog:S.evLog,A:S.A}))}catch(_){}}
function load(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||"null");if(x){Object.assign(S,x);if(x.day>1)setTimeout(()=>toast("Dilanjutkan dari hari "+x.day),400)}}catch(_){}}
const match=n=>!S.q||(n.name+" "+ZN[n.zone]).toLowerCase().includes(S.q);
function order(){const r=[];NODES.forEach(n=>{const s=S.hist.filter(x=>x.day<=S.day).find(x=>Math.abs(x.pop[n.id]-100)>8);if(s)r.push([n,s.day,s.pop[n.id]<100])});r.sort((p,q)=>p[1]-q[1]);return r.length?r.slice(0,5).map(x=>x[0].icon+" "+x[0].name+" (hari "+x[1]+(x[2]?" ↓":" ↑")+")").join(" → "):"Belum ada yang berubah nyata."}
function cmp(){if(!S.A)return"";const e=S.ev&&EVT[S.ev],h=health();return`<div class="card"><h2>Terapkan · Bandingkan</h2><p>A: ${S.A.name}, hari ${S.A.day} → <b>${Math.round(S.A.h)}%</b><br>Sekarang: ${e?e[0]:"tanpa kejadian"}, hari ${S.day} → <b>${Math.round(h)}%</b></p><p>${Math.abs(h-S.A.h)<1?"Kedua skenario hampir sama pada indeks model ini.":h>S.A.h?"Kondisi sekarang lebih dekat ke kondisi awal model.":"Skenario A lebih dekat ke kondisi awal model."}</p></div>`}
function ui(){save();
$('#dn').textContent=S.day;$('#pl').textContent=S.run?'Ⅱ Jeda':'▶ Jalankan waktu';
$('#flt').innerHTML=Object.entries(TN).map(([k,v])=>`<button class="row ${S.flt===k?'sel':''}" data-f="${k}">${v}</button>`).join('');
$('#ent').innerHTML=Object.keys(ZN).map(z=>`<h3>${ZN[z]}</h3>`+NODES.filter(n=>n.zone===z&&match(n)).map(n=>{const v=Math.round(S.pop[n.id]);return`<button class="row ${S.sel===n.id?'sel':''}" data-n="${n.id}"><span>${n.icon} ${n.name}</span><i class="${v<70?'lo':v>115?'hi':''}">${v}%</i></button>`}).join('')).join('');
$('#evs').innerHTML=Object.entries(EVT).map(([k,e])=>`<button data-e="${k}" class="${S.ev===k?'on':''}">${e[0]}</button>`).join('');
const H=[];for(let i=0;i<30;i++){const h=S.hist.find(x=>x.day===i+1);H.push(`<button data-d="${i+1}" aria-label="Hari ${i+1}${h?', indeks kestabilan model '+Math.round(h.h)+'%':''}" class="${i+1===S.day?'now':''} ${i+1>S.day?'fut':''}" style="height:${h?h.h*.4+4:2}px;background:${h?'#'+h.col.toString(16).padStart(6,'0'):'#17302a'}"></button>`)}$('#hs').innerHTML=H.join('');
const n=NODES.find(x=>x.id===S.sel);
if(n){$('#it').textContent=n.icon+' '+n.name+' · '+Math.round(S.pop[n.id])+'%';
const rel=LINKS.filter(l=>l.a===n.id||l.b===n.id).map(l=>{const o=NODES.find(x=>x.id===(l.a===n.id?l.b:l.a));const w=l.t==='e'?(l.a===n.id?'dimakan oleh':'memakan'):l.t==='p'?(l.a===n.id?'menekan':'ditekan oleh'):(l.a===n.id?'menopang':'ditopang oleh');return w+' '+o.icon+' '+o.name});
$('#ib').innerHTML=n.info+'<br><br><b>Terhubung:</b> '+rel.join(', ')+'.'}
mission()}
function mission(){
const m=$('#ms');const low=NODES.map(n=>[n,S.pop[n.id]-100]).sort((a,b)=>a[1]-b[1]).slice(0,3).filter(x=>x[1]<-4);
if(!S.pred){m.innerHTML=`<div class="card"><h2>Misi 1 · Amati & Tebak</h2><p>Kalau hanya boleh menjaga satu hal di Ciremai, mana yang paling penting?</p><div class="opts">${[['air','💧 Mata air'],['pohon','🌳 Hutan'],['elang','🦅 Elang'],['padi','🌾 Padi'],['jaring','🕸 Hubungannya']].map(x=>`<button data-p="${x[0]}">${x[1]}</button>`).join('')}</div></div>`;return}
if(!S.evLog||S.day<8){m.innerHTML=`<div class="card"><h2>Misi 2 · Selidiki</h2><p>Pilih satu kejadian di bawah, lalu jalankan waktu sampai sekitar hari 8. Lihat cincin waktu melebar dan siapa yang berubah lebih dulu.</p><p class="model-note">Hari pada layar adalah langkah waktu model yang dipercepat, bukan ramalan populasi nyata.</p></div>`;return}
const e=S.ev&&EVT[S.ev];
let h=`<div class="card"><h2>Misi 3 · Pahami Temuanmu</h2><p>${e?e[4]:''}</p><p style="margin-top:6px"><b>Paling turun:</b><br>${low.length?low.map(x=>x[0].icon+' '+x[0].name+' ('+Math.round(x[1])+'%)').join('<br>'):'Belum ada yang turun jauh.'}</p><p style="margin-top:6px"><b>Urutan terdampak:</b><br>${order()}</p><p class="big">${Math.round(health())}%</p><p>indeks kestabilan model</p><p class="model-note">Indeks ini hanya merangkum seberapa jauh jejaring bergeser dari kondisi awal simulasi. Ia bukan ukuran kesehatan ekosistem nyata.</p></div>`;
h+=cmp();h+=`<div class="card"><h2>Ceritakan · Renungan</h2><p>${S.pred==='jaring'?'Kamu melihat gunung sebagai jaring. Itu tepat.':'Kamu tadi memilih satu bagian. Lihat betapa banyak yang ikut berubah.'} Hutan Ciremai membantu menyimpan dan mengalirkan air bagi wilayah di sekitarnya. Yang kita jaga hari ini menentukan apa yang tersisa untuk adik-adik kita.</p><div class="opts">${[['tanam','Aku akan menanam pohon'],['hemat','Aku akan hemat air & tak buang sampah'],['cerita','Aku akan ceritakan ini ke keluarga']].map(x=>`<button data-j="${x[0]}" class="${S.pledge===x[0]?'on':''}">${x[1]}</button>`).join('')}</div>${S.pledge?'<div class="opts"><button id="cp">Salin janjiku</button></div>':''}</div>`;
m.innerHTML=h}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if(d.c){cs=d.c==="x"?9:cs+1;if(cs>=3)try{localStorage.setItem("pilar.bioweb.coach","1")}catch(_){}coach();return}else if(d.f){S.flt=d.f}else if(d.n){pick(d.n)}else if(d.d){scrub(+d.d);return}else if(d.e){apply(d.e);return}else if(d.p){S.pred=d.p}else if(d.j){S.pledge=d.j}
else if(b.id==='cp'){const t={tanam:'menanam pohon',hemat:'hemat air dan tidak membuang sampah',cerita:'menceritakan ini ke keluarga'}[S.pledge];navigator.clipboard?.writeText('Janjiku untuk Gunung Ciremai: aku akan '+t+'. Yang kita jaga hari ini menentukan apa yang tetap hidup esok.').then(()=>toast('Janji disalin'),()=>toast('Browser membatasi salin'))}
else if(b.id==='sv'){S.A={name:S.ev?EVT[S.ev][0]:'Tanpa kejadian',h:health(),day:S.day};toast('Skenario A disimpan. Ulang, uji kejadian lain, lalu bandingkan.')}else if(b.id==='pl'){S.run=!S.run}else if(b.id==='rs'){reset();return}
else if(b.id==='rot'){S.auto=!S.auto;b.classList.toggle('on',S.auto)}else if(b.id==='rst'){cam.th=.6;cam.ph=1.24;cam.d=15;pick(null);gd=0}
ui()});
setInterval(()=>{if(S.run)step()},650);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ---------- 3D · diorama Gunung Ciremai ----------
// Gunung = medan low-poly padat berpita ketinggian (puncak · hutan · air & tanah · sawah).
// Setiap penghuni = lencana ikon di KETINGGIAN habitatnya, cincin di sekelilingnya = populasi.
// Warna medan ikut berubah saat ekosistem tertekan (hutan mengering, sawah menguning, sungai menipis).
const cv=$('#cv'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}),sc=new THREE.Scene(),cm=new THREE.PerspectiveCamera(46,1,.1,100);
R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.95;
sc.fog=new THREE.Fog(0x06110d,24,44);
sc.add(new THREE.HemisphereLight(0xd8ecff,0x1c2a1f,.7));
const sun=new THREE.DirectionalLight(0xfff0d6,1.35);sun.position.set(7,11,5);sc.add(sun);
const cam={th:.6,ph:1.24,d:15,vt:0,vp:0};
const goal=new THREE.Vector3(0,.6,0);let gd=0;
function pick(id){S.sel=id;if(id){goal.copy(pos[id]).multiplyScalar(.5);gd=12}else goal.set(0,.6,0)}
const T=new THREE.Vector3(0,.6,0);

/* ---- profil gunung: stratovolcano dengan kawah ---- */
const Y0=-3,HM=6.6,RM=6.0,RP=8.8,RC=.75,EXP=1.55,ALT_TOP=3078;
const prof=r=>r>=RM?0:HM*Math.pow(1-r/RM,EXP);
const RIM=prof(RC);
const noise=(x,z)=>.10*Math.sin(x*1.7+z*.9)+.07*Math.sin(x*3.1-z*2.3)+.04*Math.sin(x*6.3+z*5.1);
function surfY(r,a){const x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(r<RC)return Y0+RIM-.75*(1-(r/RC)*(r/RC));                       // kawah
  const n=r<RM?noise(x,z)*(.4+.6*Math.min(1,r/2)):(.015*Math.sin(r*9));    // dataran: pematang sawah halus
  return Y0+prof(r)+n}
const altOfY=y=>(y-Y0)/RIM*ALT_TOP;
const rOfAlt=alt=>{const h=Math.min(.985,alt/ALT_TOP)*RIM;return RM*(1-Math.pow(h/HM,1/EXP))};
function zoneOfAlt(alt){return alt>2350?'puncak':alt>1250?'hutan':alt>720?'air':'sawah'}

/* ---- medan: grid polar, warna per vertex ---- */
const NR=46,NS=110,vp=[],vz=[],vr=[];
for(let i=0;i<=NR;i++){const r=RP*Math.pow(i/NR,1.18);for(let j=0;j<NS;j++){const a=j/NS*Math.PI*2,y=surfY(r,a);vp.push(Math.cos(a)*r,y,Math.sin(a)*r);vr.push(r);
  vz.push(r<RC?'kawah':r>=RM?'dataran':zoneOfAlt(altOfY(y)))}}
const idx=[];for(let i=0;i<NR;i++)for(let j=0;j<NS;j++){const a=i*NS+j,b=i*NS+(j+1)%NS,c=(i+1)*NS+j,d=(i+1)*NS+(j+1)%NS;idx.push(a,b,c,b,d,c)}
const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));
const tcol=new Float32Array(vp.length);tg.setAttribute('color',new THREE.BufferAttribute(tcol,3));tg.setIndex(idx);tg.computeVertexNormals();
const terrain=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.92,metalness:0}));sc.add(terrain);
const TERRA={puncak:[0xc9cfd2,0x8d8a85],hutan:[0x2f7a46,0x7a5a32],air:[0x5f9a63,0x8a6a3e],sawah:[0x7fa646,0xb08f3e],dataran:[0x55762e,0x86703a],kawah:[0x4a4440,0x4a4440]};
const zoneHealth=()=>({puncak:S.pop.cantigi,hutan:(S.pop.pohon*2+S.pop.owa)/3,air:(S.pop.air+S.pop.tanah)/2,sawah:S.pop.padi,dataran:S.pop.padi,kawah:100});
const cA=new THREE.Color(),cB=new THREE.Color();let terrKey='';
function paintTerrain(){const zh=zoneHealth(),key=Object.values(zh).map(Math.round).join(',');if(key===terrKey)return;terrKey=key;
  for(let k=0;k<vz.length;k++){const z=vz[k],[g,dry]=TERRA[z],h=zh[z],stress=Math.max(0,Math.min(1,(92-h)/50));
    cA.setHex(g);cB.setHex(dry);cA.lerp(cB,stress);
    const x=vp[k*3],zz=vp[k*3+2],j=.93+.14*(.5+.5*Math.sin(x*12.9+zz*7.3));            // variasi warna alami
    let m=j;if(z==='dataran'){m*=(Math.floor(vr[k]*3.2)%2?1.06:.88);const e=Math.max(0,Math.min(1,(vr[k]-RP*.72)/(RP*.28)));m*=1-.85*e*e}  // petak sawah + tepi memudar ke gelap                       // petak sawah bertingkat
    if(z==='puncak'&&vp[k*3+1]>Y0+RIM-.35)cA.lerp(cB.setHex(0xe9eef0),.6);                // tepi kawah pucat
    cA.multiplyScalar(m).convertSRGBToLinear();tcol[k*3]=cA.r;tcol[k*3+1]=cA.g;tcol[k*3+2]=cA.b}  // warna sRGB → linear (renderer sRGB)
  tg.attributes.color.needsUpdate=true}

/* ---- sungai: dari mata air menuruni lereng ke sawah ---- */
const NODE_POS={},A0={};
NODES.forEach((n,i)=>{const r=rOfAlt(n.alt),a=i*2.39996+.4;A0[n.id]=a;const y=surfY(r,a);NODE_POS[n.id]={r,a,ground:new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r)}});
const riverPts=[];{const s=NODE_POS.air;for(let k=0;k<=40;k++){const r=s.r+(RP-.4-s.r)*k/40,a=s.a+.18*Math.sin(k*.45);riverPts.push(new THREE.Vector3(Math.cos(a)*r,surfY(r,a)+.05,Math.sin(a)*r))}}
const riverMat=new THREE.MeshStandardMaterial({color:0x4cc3e8,emissive:0x0b3a4a,roughness:.25,metalness:.1,transparent:true,opacity:.9});
const river=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts),80,.07,6,false),riverMat);sc.add(river);

/* ---- awan tipis di sekitar puncak ---- */
function glowTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
const GT=glowTex(),clouds=[];
for(let k=0;k<7;k++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:0xffffff,transparent:true,opacity:.10,depthWrite:false}));s.scale.set(4.5,1.6,1);s.userData={a:k*.9,r:2.2+k%3*.7,y:Y0+RIM-.3+(k%2)*.6};sc.add(s);clouds.push(s)}

/* ---- lencana penghuni: ikon + cincin populasi ---- */
const STATUS=v=>v>115?{c:'#ff9a4d',t:'berlebih'}:v>=85?{c:'#63e3a0',t:'sehat'}:v>=60?{c:'#ffd36c',t:'tertekan'}:{c:'#ff5d6c',t:'kritis'};
function drawBadge(cvx,n,v,sel){const x=cvx.getContext('2d'),W=cvx.width,c=W/2,st=STATUS(v),zc='#'+ZC[n.zone].toString(16).padStart(6,'0');
  x.clearRect(0,0,W,W);
  x.beginPath();x.arc(c,c,c*.84,0,7);x.fillStyle='rgba(6,14,11,.92)';x.fill();                 // piringan
  x.lineWidth=W*.035;x.strokeStyle=zc;x.globalAlpha=.85;x.beginPath();x.arc(c,c,c*.66,0,7);x.stroke();x.globalAlpha=1; // warna zona
  x.lineWidth=W*.085;x.lineCap='round';x.strokeStyle='rgba(255,255,255,.14)';x.beginPath();x.arc(c,c,c*.82,0,7);x.stroke(); // jalur cincin
  const f=Math.max(.02,Math.min(1,v/100));x.strokeStyle=st.c;x.beginPath();x.arc(c,c,c*.82,-Math.PI/2,-Math.PI/2+f*Math.PI*2);x.stroke(); // populasi
  if(v>100){x.lineWidth=W*.03;x.beginPath();x.arc(c,c,c*.95,-Math.PI/2,-Math.PI/2+Math.min(1,(v-100)/50)*Math.PI*2);x.stroke()}
  if(sel){x.lineWidth=W*.03;x.strokeStyle='#ffffff';x.beginPath();x.arc(c,c,c*.97,0,7);x.stroke()}
  x.font=`${Math.round(W*.42)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(n.icon,c,c*1.04)}
const meshes={},pos={};
NODES.forEach(n=>{const P=NODE_POS[n.id],lift=.95;
  pos[n.id]=P.ground.clone().add(new THREE.Vector3(0,lift,0));
  const cvx=document.createElement('canvas');cvx.width=cvx.height=128;const tex=new THREE.CanvasTexture(cvx);tex.encoding=THREE.sRGBEncoding;
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false}));m.position.copy(pos[n.id]);m.userData.id=n.id;m.renderOrder=5;sc.add(m);
  const stem=new THREE.Line(new THREE.BufferGeometry().setFromPoints([P.ground,pos[n.id].clone().add(new THREE.Vector3(0,-.42,0))]),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.35}));sc.add(stem);
  const dot=new THREE.Mesh(new THREE.CircleGeometry(.16,20),new THREE.MeshBasicMaterial({color:ZC[n.zone],transparent:true,opacity:.9}));dot.rotation.x=-Math.PI/2;dot.position.copy(P.ground).add(new THREE.Vector3(0,.03,0));sc.add(dot);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));m.add(halo);halo.scale.setScalar(1.9);
  meshes[n.id]={m,tex,cvx,stem,dot,halo,key:''};
  const d=document.createElement('div');d.className='nl';d.innerHTML=n.icon+' '+esc(n.name)+'<small></small>';$('#lb').appendChild(d);meshes[n.id].l=d});

/* ---- hubungan: busur melengkung di atas medan + aliran ---- */
const arcs=LINKS.map(l=>{const a=pos[l.a],b=pos[l.b],mid=a.clone().add(b).multiplyScalar(.5),dist=a.distanceTo(b);
  const side=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3(0,1,0)).normalize().multiplyScalar(l.a<l.b?.35:-.35); // pasangan dua arah tidak menumpuk
  mid.add(side).add(new THREE.Vector3(0,.6+dist*.28,0));
  const curve=new THREE.QuadraticBezierCurve3(a.clone(),mid,b.clone());
  const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),new THREE.LineBasicMaterial({color:TC[l.t],transparent:true,opacity:.45}));sc.add(ln);return{ln,curve}});
const FPL=2,fl=new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({length:LINKS.length*FPL},()=>new THREE.Vector3())),new THREE.PointsMaterial({size:.2,map:GT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true}));
fl.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(LINKS.length*FPL*3),3));sc.add(fl);

/* ---- cincin waktu: 1 cincin = 1 hari, di tepi dataran ---- */
const rings=[];for(let d=1;d<=30;d++){const pts=[],rr=RP+.35+d*.11;for(let k=0;k<=128;k++){const a=k/128*6.2832;pts.push(new THREE.Vector3(Math.cos(a)*rr,Y0+.02,Math.sin(a)*rr))}
  const r=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x7ee08a,transparent:true,opacity:.08}));sc.add(r);rings.push(r)}
const rl=[1,5,10,15,20,25,30].map(d=>{const e=document.createElement('div');e.className='rl';e.textContent='Hari '+d;$('#lb').appendChild(e);return{d,e}});
function size(){const r=cv.parentNode.getBoundingClientRect();R.setPixelRatio(Math.min(devicePixelRatio,(navigator.maxTouchPoints>=10&&/Android/.test(navigator.userAgent))?1.25:2));R.setSize(r.width,r.height,false);cm.aspect=r.width/r.height;cm.updateProjectionMatrix()}
addEventListener('resize',size);size();
{const lg=document.createElement('div');lg.className='legend3d';lg.setAttribute('aria-hidden','true');
 lg.innerHTML='<b>CINCIN = POPULASI</b>'+[['#63e3a0','sehat ≥ 85%'],['#ffd36c','tertekan 60–85%'],['#ff5d6c','kritis &lt; 60%'],['#ff9a4d','berlebih &gt; 115%']].map(x=>`<span class="ring" style="color:${x[0]}"><i></i>${x[1]}</span>`).join('')
  +'<b style="margin-top:4px">PITA GUNUNG</b>'+[['#c9cfd2','Puncak'],['#2f7a46','Hutan hujan'],['#5f9a63','Air & tanah'],['#9cc25a','Sawah & desa']].map(x=>`<span><i style="background:${x[0]}"></i>${x[1]}</span>`).join('');
 cv.parentNode.appendChild(lg)}
// kontrol seret / zoom / ketuk (telapak tangan di IFP diabaikan)
let drag=null,pts=new Map(),pinch=0;
const palm=e=>e.pointerType==='touch'&&((e.width||0)>70||(e.height||0)>70);
cv.addEventListener('pointerdown',e=>{if(palm(e)||pts.size>=2)return;cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,e);drag={x:e.clientX,y:e.clientY,m:0};cv.style.cursor='grabbing'});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)){hover(e);return}pts.set(e.pointerId,e);
if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)cam.d=clamp(cam.d*pinch/d,9,30);pinch=d;drag.m+=99;return}
const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.m+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;cam.vt=-dx*.006;cam.vp=-dy*.005;cam.th+=cam.vt;cam.ph=clamp(cam.ph+cam.vp,.35,1.5)});
const endPtr=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);pinch=0;cv.style.cursor='grab';if(e.type==='pointerup'&&drag&&drag.m<8&&!pts.size){pick(hit(e));ui()}};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('wheel',e=>{e.preventDefault();gd=0;cam.d=clamp(cam.d*(1+e.deltaY*.001),9,30)},{passive:false});
function hit(e){const r=cv.getBoundingClientRect(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),cm);const h=rc.intersectObjects(Object.values(meshes).map(x=>x.m))[0];return h?h.object.userData.id:null}
function hover(e){if(pts.size)return;const id=hit(e),tp=$('#tip');cv.style.cursor=id?'pointer':'grab';if(!id){tp.style.opacity=0;return}const n=NODES.find(x=>x.id===id),r=cv.getBoundingClientRect(),v=S.pop[id];tp.textContent=n.icon+' '+n.name+' · '+Math.round(v)+'% · '+STATUS(v).t+' · ketuk untuk detail';tp.style.left=e.clientX-r.left+14+'px';tp.style.top=e.clientY-r.top+14+'px';tp.style.opacity=1}
cv.addEventListener('pointerleave',()=>$('#tip').style.opacity=0);
const vis=l=>S.flt==='all'||l.t===S.flt||(S.flt==='s'&&l.t==='c'),tmpV=new THREE.Vector3(),tmpC=new THREE.Color();
function frame(t){requestAnimationFrame(frame);
if(!drag||!pts.size){if(S.auto)cam.th+=.0022;cam.th+=cam.vt*.92;cam.vt*=.92}
T.lerp(goal,.08);if(gd){cam.d+=(gd-cam.d)*.06;if(Math.abs(gd-cam.d)<.1)gd=0}
cm.position.set(T.x+cam.d*Math.sin(cam.ph)*Math.cos(cam.th),T.y+cam.d*Math.cos(cam.ph),T.z+cam.d*Math.sin(cam.ph)*Math.sin(cam.th));cm.lookAt(T);
paintTerrain();
const cdx=cm.position.x-T.x,cdz=cm.position.z-T.z,cdl=Math.hypot(cdx,cdz)||1;
const W=cv.clientWidth,H=cv.clientHeight,rel=S.sel?new Set(LINKS.filter(l=>l.a===S.sel||l.b===S.sel).flatMap(l=>[l.a,l.b])):null;
NODES.forEach(n=>{const o=meshes[n.id],v=S.pop[n.id],sel=S.sel===n.id,dim=rel&&!rel.has(n.id);
  const P=NODE_POS[n.id],back=!sel&&P.r>.8&&(P.ground.x*cdx+P.ground.z*cdz)/(P.r*cdl)<-.25;   // di balik gunung → tampil samar
  const key=Math.round(v)+(sel?'s':'');if(o.key!==key){o.key=key;drawBadge(o.cvx,n,v,sel);o.tex.needsUpdate=true}
  const s=(sel?1.12:.86)*(1+(sel?.05*Math.sin(t*.006):0));o.m.scale.setScalar(s);
  o.m.material.opacity=dim?.28:back?.45:1;o.stem.material.opacity=dim?.08:.35;o.dot.material.opacity=dim?.25:.9;
  const st=STATUS(v);o.halo.material.color.set(st.c);o.halo.material.opacity=dim?0:(v<60||v>115)?.35+.25*Math.sin(t*.008):sel?.3:0; // denyut hanya saat kritis/berlebih
  tmpV.copy(o.m.position).project(cm);o.l.style.left=(tmpV.x*.5+.5)*W+'px';o.l.style.top=(-tmpV.y*.5+.5)*H+26*s+'px';o.l.style.opacity=tmpV.z>1?0:dim?.22:back?.4:1;o.l.querySelector('small').textContent=(sel||(rel&&rel.has(n.id))||v<85||v>115)?Math.round(v)+'% · '+st.t:'';o.l.classList.toggle('sel',sel)});
const fp=fl.geometry.attributes.position,fc=fl.geometry.attributes.color;
LINKS.forEach((l,i)=>{const ok=vis(l),f=!S.sel||l.a===S.sel||l.b===S.sel,A=arcs[i];A.ln.material.opacity=ok?(f?(S.sel?.9:.5):.06):.02;A.ln.material.color.setHex(TC[l.t]);
  tmpC.setHex(TC[l.t]);for(let k=0;k<FPL;k++){const q=(t*.00035+i*.13+k/FPL)%1,j=i*FPL+k;if(ok&&f){A.curve.getPoint(q,tmpV);fp.setXYZ(j,tmpV.x,tmpV.y,tmpV.z)}else fp.setXYZ(j,999,999,999);fc.setXYZ(j,tmpC.r,tmpC.g,tmpC.b)}});
fp.needsUpdate=true;fc.needsUpdate=true;
riverMat.opacity=.25+.7*clamp(S.pop.air/100,0,1);
clouds.forEach((c,k)=>{const u=c.userData,a=u.a+t*.00004*(k%2?1:-1);c.position.set(Math.cos(a)*u.r,u.y,Math.sin(a)*u.r)});
rings.forEach((r,i)=>{const d=i+1,h=S.hist.find(x=>x.day===d);r.material.color.setHex(h?h.col:0x7ee08a);r.material.opacity=d<S.day?.4:d===S.day?.6+.4*Math.sin(t*.005):.06});
rl.forEach(x=>{tmpV.set(RP+.35+x.d*.11,Y0,0).project(cm);x.e.style.left=(tmpV.x*.5+.5)*W+'px';x.e.style.top=(-tmpV.y*.5+.5)*H+'px';x.e.style.opacity=tmpV.z>1?0:x.d<=S.day?1:.35});
R.render(sc,cm)}
// ---------- UX tambahan: pelatuk, pencarian, papan ketik, panduan awal ----------
const STEPS=[['Putar gunungnya','Seret dengan jari atau mouse. Gulir atau cubit untuk zoom.'],['Ketuk satu penghuni','Garis yang menyala menunjukkan siapa bergantung pada siapa.'],['Uji satu kejadian','Pilih di bawah, tekan Jalankan waktu, lalu lihat cincin melebar tiap hari. Ketuk batang di bawah untuk kembali ke hari lain.']];
let cs=0;try{if(localStorage.getItem('pilar.bioweb.coach'))cs=9}catch(_){}
function coach(){const c=$('#coach');if(cs>=3){c.hidden=true;return}c.hidden=false;c.innerHTML=`<b>${STEPS[cs][0]}</b><p>${STEPS[cs][1]}</p><div class="opts"><button data-c="n">${cs<2?'Lanjut':'Mulai'}</button><button data-c="x">Lewati</button></div>`}
$('#q').addEventListener('input',e=>{S.q=e.target.value.toLowerCase().trim();ui()});
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){const n=NODES.find(match);if(n){pick(n.id);ui()}}});
$('#homeBtn').onclick=()=>location.href='../../index.html';
const intro=$('#intro'),introEnter=$('#introEnter');if(intro&&introEnter)introEnter.onclick=()=>{intro.classList.add('leave');setTimeout(()=>intro.remove(),360)};
addEventListener('keydown',e=>{if(e.target.matches('input,textarea')){if(e.key==='Escape')e.target.blur();return}if(e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase(),ev=Object.keys(EVT);
if(k===' '){if(e.target.closest('button'))return;e.preventDefault();S.run=!S.run;ui()}else if(k==='/'){e.preventDefault();$('#q').focus()}else if(k==='r'){reset()}else if(k==='o'){$('#rot').click()}else if(k==='escape'){pick(null);ui()}else if(+k>=1&&+k<=ev.length){apply(ev[k-1])}else if(k==='arrowleft'||k==='arrowright'){scrub(clamp(S.day+(k==='arrowleft'?-1:1),1,30))}});
load();if(!S.hist.length)S.hist=[snap()];
$('#rot').classList.toggle('on',S.auto);coach();
ui();requestAnimationFrame(frame);

})();