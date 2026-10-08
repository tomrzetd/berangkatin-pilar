(function(){
'use strict';
const D=window.BIOWEB_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const state={phase:'amati',day:1,running:false,view:'semua',selected:null,prediction:null,event:null,eventLeft:0,history:[],pop:{},story:{a:'',b:'',c:''}};
D.nodes.forEach(n=>state.pop[n.id]=100);
const phaseOrder=['amati','selidiki','pahami','terapkan','ceritakan'];
const ctx=$('#webCanvas').getContext('2d'),introCtx=$('#introNet').getContext('2d');
let dpr=1,W=0,H=0,t=0,timer=0,raf=0;

function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(toast.id);toast.id=setTimeout(()=>e.classList.remove('show'),2600)}
function resize(){
  dpr=Math.min(devicePixelRatio||1,1.5);
  const r=$('#webCanvas').getBoundingClientRect();W=r.width;H=r.height;
  $('#webCanvas').width=Math.max(1,Math.round(W*dpr));$('#webCanvas').height=Math.max(1,Math.round(H*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);
  const ir=$('#intro').getBoundingClientRect();$('#introNet').width=Math.round(ir.width*dpr);$('#introNet').height=Math.round(ir.height*dpr);introCtx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize);

function save(){try{sessionStorage.setItem('pilar.bioweb.sawahku.v01',JSON.stringify({phase:state.phase,day:state.day,prediction:state.prediction,pop:state.pop,history:state.history,story:state.story}))}catch(_){}}
function load(){try{const x=JSON.parse(sessionStorage.getItem('pilar.bioweb.sawahku.v01')||'null');if(!x)return;if(x.prediction)state.prediction=x.prediction;if(x.pop)Object.assign(state.pop,x.pop);if(Array.isArray(x.history))state.history=x.history;if(x.story)Object.assign(state.story,x.story);state.day=clamp(+x.day||1,1,30)}catch(_){}}

function introNet(){
  const c=introCtx,w=$('#introNet').clientWidth,h=$('#introNet').clientHeight;c.clearRect(0,0,w,h);
  const pts=[...D.nodes].map((n,i)=>({x:w*(.54+n.x*.42),y:h*(.13+n.y*.65),r:2+(i%3)}));
  c.globalAlpha=.35;c.lineWidth=1;
  D.links.forEach((l,i)=>{const a=pts[D.nodes.findIndex(n=>n.id===l.a)],b=pts[D.nodes.findIndex(n=>n.id===l.b)];if(!a||!b)return;c.strokeStyle=i%3===0?'#69e3e0':'#7be495';c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo((a.x+b.x)/2,h*.36,(b.x),(b.y));c.stroke()});
  pts.forEach((p,i)=>{const glow=8+Math.sin(t*.001+i)*3;c.fillStyle=i%4===0?'#ffd36c':'#8ef3a8';c.globalAlpha=.18;c.beginPath();c.arc(p.x,p.y,glow,0,7);c.fill();c.globalAlpha=.75;c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill()});c.globalAlpha=1;
}

function linkVisible(l){
  if(state.view==='makan')return l.type==='consume'||l.type==='pressure';
  if(state.view==='lingkungan')return l.a==='air'||l.a==='tanah'||l.a==='pengurai'||l.b==='tanah';
  if(state.view==='jejak'&&state.event){const trailIds=eventFocus(state.event);return trailIds.includes(l.a)||trailIds.includes(l.b)}
  return true;
}
function eventFocus(id){
  return id==='kemarau'?['air','padi','wereng','katak']:id==='pestisida'?['wereng','katak','burung','padi']:id==='predator'?['ular','tikus','padi','katak']:id==='organik'?['pengurai','tanah','padi']:[];
}
function pos(n){return{x:W*(.08+n.x*.84),y:H*(.08+n.y*.78)}}
function colorType(type){return type==='support'?'#7be495':type==='consume'?'#ff9b56':type==='cycle'?'#69e3e0':'#ff6f7d'}
function draw(){
  t=performance.now();ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0c2a22');g.addColorStop(1,'#06100c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // silhouette Ciremai
  ctx.globalAlpha=.22;ctx.fillStyle='#16392d';ctx.beginPath();ctx.moveTo(0,H*.48);ctx.lineTo(W*.18,H*.37);ctx.lineTo(W*.31,H*.34);ctx.lineTo(W*.48,H*.12);ctx.lineTo(W*.59,H*.35);ctx.lineTo(W*.75,H*.39);ctx.lineTo(W,H*.49);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();ctx.globalAlpha=1;
  // paddy contour
  ctx.globalAlpha=.12;ctx.strokeStyle='#8de39b';ctx.lineWidth=1;for(let y=.55;y<.95;y+=.08){ctx.beginPath();ctx.moveTo(0,H*y);ctx.bezierCurveTo(W*.25,H*(y-.04),W*.65,H*(y+.03),W,H*(y-.02));ctx.stroke()}ctx.globalAlpha=1;
  D.links.forEach((l,i)=>{if(!linkVisible(l))return;const a=pos(D.nodes.find(n=>n.id===l.a)),b=pos(D.nodes.find(n=>n.id===l.b));const focus=!state.selected||state.selected===l.a||state.selected===l.b;ctx.globalAlpha=focus?.68:.11;ctx.strokeStyle=colorType(l.type);ctx.lineWidth=1.2+l.strength*1.8;ctx.beginPath();ctx.moveTo(a.x,a.y);const bend=(i%2?1:-1)*20;ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2+bend,b.x,b.y);ctx.stroke();if(!reduce&&focus){const q=(Math.sin(t*.0012+i)*.5+.5);const x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q;ctx.fillStyle=colorType(l.type);ctx.beginPath();ctx.arc(x,y,2.3,0,7);ctx.fill()}});
  ctx.globalAlpha=1;
  D.nodes.forEach((n,i)=>{const p=pos(n),val=state.pop[n.id],dev=Math.abs(val-100);const selected=state.selected===n.id;const r=16+Math.min(10,dev*.12)+(selected?7:0);const pulse=reduce?0:(Math.sin(t*.002+i)*1.8);ctx.shadowColor=n.role==='abiotik'?'#69e3e0':'#7be495';ctx.shadowBlur=selected?24:10;ctx.fillStyle=n.role==='abiotik'?'#153e43':'#143423';ctx.beginPath();ctx.arc(p.x,p.y,r+pulse,0,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=selected?'#ffd36c':'#467a60';ctx.lineWidth=selected?3:1;ctx.stroke();ctx.font='20px Segoe UI Emoji,Apple Color Emoji,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.icon,p.x,p.y-1);ctx.font='700 11px Inter,Segoe UI,sans-serif';ctx.fillStyle='#eaf7ef';ctx.fillText(n.name,p.x,p.y+r+15);ctx.font='700 9px ui-monospace,monospace';ctx.fillStyle=val<65?'#ff8792':val>112?'#ffd36c':'#91baa2';ctx.fillText(Math.round(val)+'%',p.x,p.y+r+27)});
  requestAnimationFrame(draw);
}

function ecologyStep(){
  if(state.day>=30){state.running=false;updatePlay();return}
  state.day++;
  const delta={};D.nodes.forEach(n=>delta[n.id]=(100-state.pop[n.id])*.008);
  if(state.event&&state.eventLeft>0){const ev=D.events[state.event];Object.entries(ev.effects).forEach(([k,v])=>delta[k]=(delta[k]||0)+v);state.eventLeft--}
  // simple relationship response
  const dev=k=>(state.pop[k]-100)/100;
  delta.padi+=(state.pop.air-100)*.018+(state.pop.tanah-100)*.012-(Math.max(0,state.pop.wereng-100))*.014-(Math.max(0,state.pop.tikus-100))*.012;
  delta.wereng+=dev('padi')*.5-Math.max(0,dev('katak'))*.35-Math.max(0,dev('burung'))*.16;
  delta.tikus+=dev('padi')*.32-Math.max(0,dev('ular'))*.28;
  delta.katak+=dev('wereng')*.22-Math.max(0,100-state.pop.air)*.004;
  delta.ular+=dev('tikus')*.18+dev('katak')*.12;
  delta.tanah+=dev('pengurai')*.25;
  D.nodes.forEach(n=>state.pop[n.id]=clamp(state.pop[n.id]+(delta[n.id]||0),20,145));
  save();refresh();
}
function applyEvent(id){
  state.event=id;state.eventLeft=D.events[id].days;state.history.push({id,day:state.day});state.view='jejak';$$('.view-switch button').forEach(b=>b.classList.toggle('active',b.dataset.view==='jejak'));toast(D.events[id].name+' dimulai · ikuti jejak dampaknya');if(state.phase==='amati')go('selidiki');refresh();
}
function reset(){
  state.day=1;state.running=false;state.event=null;state.eventLeft=0;state.history=[];state.selected=null;D.nodes.forEach(n=>state.pop[n.id]=100);save();refresh();toast('Sawah kembali ke kondisi awal');
}
function metrics(){
  const bio=D.nodes.filter(n=>n.role!=='abiotik'),life=bio.reduce((a,n)=>a+state.pop[n.id],0)/bio.length;
  const dev=bio.reduce((a,n)=>a+Math.abs(state.pop[n.id]-100),0)/bio.length;
  return{life:clamp(life,0,130),stability:clamp(100-dev*1.4,0,100)}
}

function panel(){
  const H=$('#learningHost'),p=state.phase;
  if(p==='amati')H.innerHTML=`<section class="card"><div class="eyebrow">AMATI · SAWAH YANG HIDUP</div><h2>Apa yang membuat sawah tetap hidup?</h2><p>Lihat jejaringnya. Jangan buru-buru mencari satu jawaban. Perhatikan bahwa air, tanah, tumbuhan, hewan, pengurai, dan manusia saling terhubung.</p><div class="big-question">Kalau satu komponen harus kamu jaga lebih dulu, mana pilihanmu?</div><div class="choice-grid">${[['padi','🌾 Padi'],['katak','🐸 Katak'],['ular','🐍 Ular'],['pengurai','🍄 Pengurai'],['jaringan','🕸 Hubungannya']].map(x=>`<button data-pred="${x[0]}" class="${state.prediction===x[0]?'selected':''}">${x[1]}</button>`).join('')}</div><div class="wisdom"><b>Pengetahuan dari Sawah</b><br>Orang yang lama hidup bersama sawah belajar membaca air, tanah, cuaca, dan makhluk hidup sebelum bertindak. Di BioWeb, kamu juga mengamati dulu sebelum mengambil keputusan.</div><button class="primary" id="toInvestigate" ${state.prediction?'':'disabled'}>Selidiki tebakanku →</button></section>`;
  if(p==='selidiki')H.innerHTML=`<section class="card"><div class="eyebrow">SELIDIKI · UBAH SATU HAL</div><h2>Ikuti jejak perubahan.</h2><p>Pilih satu peristiwa. Jalankan waktu beberapa hari, lalu cari siapa yang berubah lebih dulu dan siapa yang ikut terdampak.</p><div class="event-list">${Object.entries(D.events).map(([id,e])=>`<button data-event-panel="${id}" class="${state.event===id?'active':''}">${e.icon} <b>${e.name}</b><br><small>${e.trail[0]}</small></button>`).join('')}</div><div class="soft-note">Tip: jangan hanya melihat padi. Kadang perubahan penting muncul pada organisme yang tidak paling besar atau paling terlihat.</div></section>`;
  if(p==='pahami'){const ev=state.event&&D.events[state.event];H.innerHTML=`<section class="card"><div class="eyebrow">PAHAMI · LIHAT POLANYA</div><h2>Satu perubahan bisa berjalan ke banyak arah.</h2><p>${ev?'Peristiwa <b>'+ev.name+'</b> menunjukkan bahwa dampak ekologis tidak berhenti pada satu organisme.':'Jalankan satu peristiwa dulu agar pola lebih mudah dibaca.'}</p>${ev?'<div class="mini-chain">'+ev.trail.map((x,i)=>'<span>'+(i+1)+' · '+x+'</span>').join('')+'</div>':''}<div class="big-question">Apakah pilihan awalmu masih terasa sebagai satu-satunya bagian yang penting?</div><div class="choice-grid"><button data-revise="tetap">Tetap</button><button data-revise="berubah">Pendapatku berubah</button><button data-revise="jaringan">Yang penting justru hubungannya</button></div><div class="wisdom">Keseimbangan bukan berarti semua jumlahnya sama. Yang penting adalah hubungan tetap bekerja sehingga perubahan tidak merusak seluruh sistem.</div></section>`}
  if(p==='terapkan')H.innerHTML=`<section class="card"><div class="eyebrow">TERAPKAN · SAWAH INI MILIK KITA</div><h2>Ambil keputusan yang tidak hanya cepat.</h2><p>Bayangkan kamu ikut menjaga sawah di lereng Ciremai. Hasil padi penting, tetapi air, tanah, predator, pengurai, dan kehidupan lain juga perlu tetap bekerja.</p><div class="big-question">Coba susun strategi: jalankan dua peristiwa berbeda lalu bandingkan mana yang paling sedikit mengganggu jejaring.</div><div class="event-list">${Object.entries(D.events).map(([id,e])=>`<button data-event-panel="${id}">${e.icon} Uji: ${e.name}</button>`).join('')}</div><div class="wisdom">Keberlanjutan bukan memilih alam atau manusia. Tantangannya adalah memenuhi kebutuhan hari ini tanpa membuat kehidupan esok kehilangan pilihannya.</div></section>`;
  if(p==='ceritakan')H.innerHTML=`<section class="card"><div class="eyebrow">CERITAKAN · SUARA SAWAHMU</div><h2>Apa yang kamu temukan?</h2><p>Gunakan jejak perubahan yang benar-benar kamu lihat, bukan sekadar menebak.</p><div class="story-fields"><label>Aku mengubah…<textarea data-story="a" placeholder="contoh: jumlah predator…">${state.story.a}</textarea></label><label>Yang pertama terdampak…<textarea data-story="b" placeholder="organisme / faktor yang berubah…">${state.story.b}</textarea></label><label>Keputusan yang lebih bijak menurutku… karena…<textarea data-story="c" placeholder="jelaskan dengan bukti dari jejaring…">${state.story.c}</textarea></label></div><button class="primary" id="copyStory">Salin Cerita Sawah Ku</button></section>`;
  bindPanel();
}
function bindPanel(){
  $$('[data-pred]').forEach(b=>b.onclick=()=>{state.prediction=b.dataset.pred;save();panel()});
  const ti=$('#toInvestigate');if(ti)ti.onclick=()=>go('selidiki');
  $$('[data-event-panel]').forEach(b=>b.onclick=()=>applyEvent(b.dataset.eventPanel));
  $$('[data-revise]').forEach(b=>b.onclick=()=>{toast(b.dataset.revise==='jaringan'?'Kamu mulai melihat ekosistem sebagai sistem hubungan.':'Simpan alasanmu untuk tahap Ceritakan.');go('terapkan')});
  $$('[data-story]').forEach(t=>t.oninput=e=>{state.story[e.target.dataset.story]=e.target.value;save()});
  const cp=$('#copyStory');if(cp)cp.onclick=async()=>{const txt=`SAWAH KU · BIOWEB\nAku mengubah: ${state.story.a||'-'}\nYang pertama terdampak: ${state.story.b||'-'}\nKeputusan yang lebih bijak: ${state.story.c||'-'}\n\nApa yang kita jaga hari ini menentukan apa yang tetap hidup esok.`;try{await navigator.clipboard.writeText(txt);toast('Cerita Sawah Ku disalin')}catch(_){toast('Clipboard dibatasi browser')}};
}
function canGo(ph){
  if(ph==='selidiki'&&!state.prediction)return'Buat satu tebakan dulu di Amati.';
  if(['pahami','terapkan','ceritakan'].includes(ph)&&(!state.history.length||state.day<4))return'Jalankan sedikitnya satu perubahan beberapa hari di Selidiki.';
  return null;
}
function go(ph){const why=canGo(ph);if(why)return toast(why);state.phase=ph;save();refresh()}
function refresh(){
  $('#dayNow').textContent=$('#dayBottom').textContent=state.day;$('#timeFill').style.width=((state.day-1)/29*100)+'%';$('#simStatus').textContent=state.running?'BERUBAH':'DIAMATI';$('#playBtn').textContent=state.running?'Ⅱ':'▶';
  const m=metrics();$('#mPadi').textContent=Math.round(state.pop.padi)+'%';$('#mStability').textContent=Math.round(m.stability)+'%';$('#mAir').textContent=Math.round(state.pop.air)+'%';$('#mLife').textContent=Math.round(m.life)+'%';
  $('#stageTitle').textContent=state.event?'Dampak: '+D.events[state.event].name:'Sawah dalam keadaan awal';
  $('#eventMarks').innerHTML=state.history.map(h=>`<i title="${D.events[h.id].name} · hari ${h.day}" style="left:${(h.day-1)/29*100}%"></i>`).join('');
  $$('#phaseTabs button').forEach(b=>{b.classList.toggle('active',b.dataset.phase===state.phase);b.classList.toggle('locked',!!canGo(b.dataset.phase))});
  const n=state.selected&&D.nodes.find(x=>x.id===state.selected);if(n){$('#nodeInsight').innerHTML=`<small>${n.role.toUpperCase()}</small><b>${n.icon} ${n.name} · ${Math.round(state.pop[n.id])}%</b><p>${n.info}</p>`}
  panel();
}
function updatePlay(){state.running=false;$('#playBtn').textContent='▶';$('#simStatus').textContent='DIAMATI'}
function loopTime(){clearInterval(timer);timer=setInterval(()=>{if(state.running)ecologyStep()},700)}
function clickCanvas(e){const r=$('#webCanvas').getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=null,bd=34;D.nodes.forEach(n=>{const p=pos(n),d=Math.hypot(x-p.x,y-p.y);if(d<bd){bd=d;best=n}});if(best){state.selected=best.id;refresh()}}
function start(){
  load();resize();draw();loopTime();refresh();
  $('#enterBtn').onclick=()=>{$('#intro').style.opacity='0';$('#intro').style.pointerEvents='none';setTimeout(()=>{$('#intro').remove();$('#app').hidden=false;resize();refresh()},360)};
  $('#homeBtn').onclick=()=>location.href='../../index.html';
  $('#playBtn').onclick=()=>{state.running=!state.running;refresh()};
  $('#resetBtn').onclick=reset;
  $$('#eventDeck button').forEach(b=>b.onclick=()=>applyEvent(b.dataset.event));
  $$('#phaseTabs button').forEach(b=>b.onclick=()=>go(b.dataset.phase));
  $$('.view-switch button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;$$('.view-switch button').forEach(x=>x.classList.toggle('active',x===b));refresh()});
  $('#webCanvas').addEventListener('pointerdown',clickCanvas);
  (function introFrame(){if(!document.body.contains($('#introNet')))return;introNet();requestAnimationFrame(introFrame)})();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();