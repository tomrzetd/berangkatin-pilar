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
else if(b.id==='rot'){S.auto=!S.auto;b.classList.toggle('on',S.auto)}else if(b.id==='rst'){cam.th=.6;cam.ph=1.25;cam.d=19;pick(null);gd=0}
ui()});
setInterval(()=>{if(S.run)step()},650);
// ---------- 3D ----------
const cv=$('#cv'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}),sc=new THREE.Scene(),cm=new THREE.PerspectiveCamera(50,1,.1,100);
const cam={th:.6,ph:1.25,d:19,vt:0,vp:0};
const goal=new THREE.Vector3(0,.4,0);let gd=0;
function pick(id){S.sel=id;if(id){goal.copy(pos[id]).multiplyScalar(.5);gd=12}else goal.set(0,.4,0)}
const T=new THREE.Vector3(0,.4,0);
// gunung Ciremai (kerangka kerucut)
const cone=new THREE.Mesh(new THREE.ConeGeometry(4.6,7.6,36,8,true),new THREE.MeshBasicMaterial({color:0x1b4a38,wireframe:true,transparent:true,opacity:.22}));cone.position.y=.8;sc.add(cone);
function glowTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
const GT=glowTex(),meshes={},pos={};
NODES.forEach((n,i)=>{const y=n.alt/3078*7.4-2.9,rc=4.6*(1-(y+3)/7.6),a=i*2.4,r=Math.max(rc,.3)+1.5;
pos[n.id]=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:ZC[n.zone]}));m.position.copy(pos[n.id]);m.userData.id=n.id;
const g=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:ZC[n.zone],transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.add(g);g.scale.setScalar(5);
sc.add(m);meshes[n.id]={m,g};
const d=document.createElement('div');d.className='nl';d.innerHTML=n.icon+' '+n.name+'<small></small>';$('#lb').appendChild(d);meshes[n.id].l=d});
const lines=LINKS.map(l=>{const geo=new THREE.BufferGeometry().setFromPoints([pos[l.a],pos[l.b]]);const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:TC[l.t],transparent:true,opacity:.4}));sc.add(ln);return ln});
const fl=new THREE.Points(new THREE.BufferGeometry().setFromPoints(LINKS.map(()=>new THREE.Vector3())),new THREE.PointsMaterial({size:.16,color:0xffffff,transparent:true,opacity:.9}));sc.add(fl);
// cincin waktu: 1 cincin = 1 hari
const rings=[];for(let d=1;d<=30;d++){const pts=[];for(let k=0;k<=96;k++){const a=k/96*6.2832;pts.push(new THREE.Vector3(Math.cos(a)*(6.4+d*.14),-3.1,Math.sin(a)*(6.4+d*.14)))}
const r=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x7ee08a,transparent:true,opacity:.08}));sc.add(r);rings.push(r)}
const rl=[1,5,10,15,20,25,30].map(d=>{const e=document.createElement('div');e.className='rl';e.textContent='Hari '+d;$('#lb').appendChild(e);return{d,e}});
function size(){const r=cv.parentNode.getBoundingClientRect();R.setPixelRatio(Math.min(devicePixelRatio,2));R.setSize(r.width,r.height,false);cm.aspect=r.width/r.height;cm.updateProjectionMatrix()}
addEventListener('resize',size);size();
// kontrol seret / zoom / ketuk
let drag=null,pts=new Map(),pinch=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,e);drag={x:e.clientX,y:e.clientY,m:0};cv.style.cursor='grabbing'});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)){hover(e);return}pts.set(e.pointerId,e);
if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)cam.d=clamp(cam.d*pinch/d,9,30);pinch=d;return}
const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.m+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;cam.vt=-dx*.006;cam.vp=-dy*.005;cam.th+=cam.vt;cam.ph=clamp(cam.ph+cam.vp,.35,1.85)});
cv.addEventListener('pointerup',e=>{pts.delete(e.pointerId);pinch=0;cv.style.cursor='grab';if(drag&&drag.m<6&&!pts.size){pick(hit(e));ui()}});
cv.addEventListener('wheel',e=>{e.preventDefault();gd=0;cam.d=clamp(cam.d*(1+e.deltaY*.001),9,30)},{passive:false});
function hit(e){const r=cv.getBoundingClientRect(),rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),cm);const h=rc.intersectObjects(Object.values(meshes).map(x=>x.m))[0];return h?h.object.userData.id:null}
function hover(e){if(pts.size)return;const id=hit(e),tp=$('#tip');cv.style.cursor=id?'pointer':'grab';if(!id){tp.style.opacity=0;return}const n=NODES.find(x=>x.id===id),r=cv.getBoundingClientRect();tp.textContent=n.icon+' '+n.name+' · '+Math.round(S.pop[id])+'% · ketuk untuk detail';tp.style.left=e.clientX-r.left+14+'px';tp.style.top=e.clientY-r.top+14+'px';tp.style.opacity=1}
cv.addEventListener('pointerleave',()=>$('#tip').style.opacity=0);
const C0=new THREE.Color(),vis=l=>S.flt==='all'||l.t===S.flt||(S.flt==='s'&&l.t==='c');
function frame(t){requestAnimationFrame(frame);
if(!drag||!pts.size){if(S.auto)cam.th+=.0025;cam.th+=cam.vt*.92;cam.vt*=.92}
T.lerp(goal,.08);if(gd){cam.d+=(gd-cam.d)*.06;if(Math.abs(gd-cam.d)<.1)gd=0}
cm.position.set(T.x+cam.d*Math.sin(cam.ph)*Math.cos(cam.th),T.y+cam.d*Math.cos(cam.ph),T.z+cam.d*Math.sin(cam.ph)*Math.sin(cam.th));cm.lookAt(T);
const W=cv.clientWidth,H=cv.clientHeight,rel=S.sel?new Set(LINKS.filter(l=>l.a===S.sel||l.b===S.sel).flatMap(l=>[l.a,l.b])):null;
NODES.forEach(n=>{const o=meshes[n.id],v=S.pop[n.id],s=.22+.24*clamp(v/100,.15,1.4)+(S.sel===n.id?.1:0);o.m.scale.setScalar(s);
const base=new THREE.Color(ZC[n.zone]);C0.copy(base);if(v<70)C0.lerp(new THREE.Color(0xff5d6c),clamp((70-v)/40,0,1));else if(v>115)C0.lerp(new THREE.Color(0xff8a3d),.6);
o.m.material.color.copy(C0);o.g.material.color.copy(C0);const dim=rel&&!rel.has(n.id);o.g.material.opacity=dim?.15:.8;o.m.material.opacity=1;
const p=o.m.position.clone().project(cm);o.l.style.left=(p.x*.5+.5)*W+'px';o.l.style.top=(-p.y*.5+.5)*H+s*18+'px';o.l.style.opacity=p.z>1?0:dim?.25:1;o.l.querySelector('small').textContent=Math.round(v)+'%'});
const fp=fl.geometry.attributes.position;
LINKS.forEach((l,i)=>{const ok=vis(l),f=!S.sel||l.a===S.sel||l.b===S.sel;lines[i].material.opacity=ok?(f?.75:.07):.03;lines[i].material.color.setHex(TC[l.t]);
const q=(t*.0004+i*.13)%1,a=pos[l.a],b=pos[l.b];fp.setXYZ(i,ok&&f?a.x+(b.x-a.x)*q:999,a.y+(b.y-a.y)*q,a.z+(b.z-a.z)*q)});fp.needsUpdate=true;
rings.forEach((r,i)=>{const d=i+1,h=S.hist.find(x=>x.day===d);r.material.color.setHex(h?h.col:0x7ee08a);r.material.opacity=d<S.day?.45:d===S.day?.6+.4*Math.sin(t*.005):.07});
rl.forEach(x=>{const p=new THREE.Vector3(6.4+x.d*.14,-3.1,0).project(cm);x.e.style.left=(p.x*.5+.5)*W+'px';x.e.style.top=(-p.y*.5+.5)*H+'px';x.e.style.opacity=x.d<=S.day?1:.35});
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