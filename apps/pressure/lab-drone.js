/* PILAR · Lab Tekanan #4 — Bernoulli & gaya angkat baling-baling → prinsip kerja drone */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  P.pressureLabs=P.pressureLabs||{list:[],register(s){this.list.push(s);this[s.id]=s}};
  const PH=()=>P.pressurePhysics,fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',','),DS=3,AIR_X=16;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ENG={payload:.6,minutes:8,twr:1.8,thr:.75,alphaMax:12};

  function newSim(batt){return Object.assign(PH().drone.newState(batt||'sedang'),{batt:batt||'sedang',test:false,thr:0})}
  // parameter efektif (rancangan siswa dipakai pada fase rekayasa)
  function effP(st){
    const s=st.sim;
    if(st.phase!=='rekayasa')return st.params;
    const e=st.eng,d=PH().drone.design({batt:e.batt,payload:e.payload,alpha:e.alpha});
    const thr=s.test?clamp(d.hoverThrottle+.35*(2-s.y)-.25*s.vy,0,1):0;
    return{throttle:thr,alpha:e.alpha,tilt:0,payload:e.payload,batt:e.batt};
  }

  const spec={
    id:'bernoulli',icon:'🚁',tab:'Drone+',title:'Drone · Bonus Rekayasa Udara',tagline:'Naikkan throttle, lalu cari tahu mengapa ia terangkat.',accent:'#7eeeff',
studentUX:'natural-drone-v1',natural:{tryTitle:'Naikkan throttle sampai drone lepas landas.',tryText:'Untuk awal, abaikan sudut bilah dan baterai. Fokus pada satu hal: kecepatan putaran rotor.',ahaTitle:'Mengapa sedikit tambahan putaran terasa sangat kuat?',ahaToast:'Drone sudah lepas landas. Sekarang hubungkan putaran rotor dengan gaya angkat.',proofHint:'Ambil dua bukti dengan throttle kira-kira 30% dan 60%. Pertahankan sudut bilah yang sama.',recordAgain:'Naikkan throttle mendekati dua kali kondisi pertama, tunggu RPM stabil, lalu ambil bukti kedua.',proofDone:'Saat RPM kira-kira 2×, gaya angkat mendekati 4×. Sekarang gunakan konsepnya untuk merancang drone.',reflection:'Hubungkan <strong>RPM</strong>, <strong>gaya angkat</strong>, <strong>muatan</strong>, dan batas sudut bilah sebelum stall.'},advancedLabel:'Eksperimen lanjut · sudut bilah, kemiringan, muatan, baterai',
defaults:()=>({throttle:0,alpha:8,tilt:0,payload:0,batt:'sedang'}),
    engDefaults:()=>({batt:'sedang',payload:.6,alpha:8,done:false}),
    simInit:()=>newSim('sedang'),
    phaseView:{lihat:'drone',tebak:'drone',coba:'drone',aha:'bilah',buktikan:'drone',rekayasa:'drone'},
    look:{title:'Drone diam di landasan.',text:'Mulai dari satu kontrol saja: throttle. Lihat apa yang terjadi ketika rotor berputar makin cepat.',question:'Jika RPM dibuat sekitar 2×, apakah gaya angkat menjadi 2×, 4×, atau tetap?'},
    predict:{title:'RPM 2×. Gaya angkat jadi berapa?',text:'Sudut bilah tetap. Yang berubah hanya kecepatan putaran rotor.',
      options:[{v:'2',l:'Sekitar 2×'},{v:'4',l:'Sekitar 4×'},{v:'sama',l:'Tetap sama'}],answer:'4',
      why:'Gaya angkat ∝ ½ρv²: kecepatan udara pada bilah 2× → gaya 4×. Itulah mengapa sedikit tambahan RPM terasa sangat besar.'},
controls:[
{k:'throttle',type:'range',label:'Throttle · kecepatan rotor',unit:'%',min:()=>0,max:()=>1,step:()=>.01,dec:()=>0,fmt:v=>Math.round(v*100)+' % · '+Math.round(v*PH().drone.BL.rpmMax)+' RPM'},{k:'alpha',type:'range',label:'Sudut pitch bilah α',unit:'°',adv:true,min:()=>0,max:()=>20,step:()=>.5,dec:()=>1},{k:'tilt',type:'range',label:'Kemiringan maju / mundur',unit:'°',adv:true,min:()=>-25,max:()=>25,step:()=>1,dec:()=>0},{k:'payload',type:'range',label:'Muatan',unit:'kg',adv:true,min:()=>0,max:()=>1.5,step:()=>.1,dec:()=>1},{k:'batt',type:'seg',label:'Baterai',adv:true,options:()=>Object.values(PH().drone.BATT).map(b=>({v:b.id,l:b.name}))},{type:'actions',items:[{id:'reset',label:'↺ Ulang / isi baterai'}]}],
reveals:[{k:'forces',on:'🙈 Sembunyikan gaya',off:'👁 Lihat gaya T & W'},{k:'wash',on:'🙈 Sembunyikan aliran',off:'👁 Lihat aliran turun'},{k:'cp',on:'🙈 Sembunyikan tekanan',off:'👁 Lihat tekanan bilah'}],
missions:[{id:'liftoff',title:'Lepas landas',desc:'Naikkan throttle sampai drone terbang ≥ 1 m.'}],onParam(k,v,old,st,api){if(k==='batt'&&v!==old)st.sim=newSim(v)},check(st,api){if(st.phase!=='rekayasa'&&st.sim.y>=1)api.mark('liftoff')},
    patterns:[{icon:'⚡',title:'RPM 2× → gaya angkat sekitar 4×',text:'Pada model ini, gaya angkat mengikuti kuadrat kecepatan aliran di bilah.'},{icon:'💨',title:'Bilah mempercepat dan membelokkan udara',text:'Beda tekanan membantu menjelaskan gaya angkat; downwash juga menunjukkan udara didorong ke bawah.'},{icon:'📐',title:'Sudut bilah ada batasnya',text:'Menambah sudut membantu sampai mendekati stall. Terlalu besar justru menurunkan kemampuan angkat.'}],
    formula:{main:'p + ½ρv² = konstan',sec:'L = ½ · ρ · v² · S · C_L      Hover: ΣT = m · g',note:'Bernoulli: di sepanjang aliran, kecepatan besar ↔ tekanan kecil. Dari sudut pandang Newton, bilah juga mendorong udara ke bawah (downwash) sehingga udara mendorong drone ke atas — kedua penjelasan saling melengkapi. (Mitos: “udara atas dan bawah harus tiba bersamaan di ujung” itu tidak benar.)'},
hud:(st)=>{const s=st.sim,d=PH().drone,Wn=s.m*PH().G||d.mass(st.params.batt,st.params.payload)*PH().G,pct=100*s.battWh/d.BATT[s.batt].Wh;if(!st.formula)return[['Tinggi',fmt(s.y,2)+' m'],['Rotor',s.rpm<1200?'pelan':s.rpm<3200?'makin cepat':'cepat'],['Gaya angkat',s.T<Wn*.9?'belum cukup':s.T<Wn*1.1?'hampir seimbang':'lebih besar dari berat'],['Baterai',fmt(pct,0)+'%']];return[['Tinggi',fmt(s.y,2)+' m'],['RPM motor',fmt(s.rpm,0)],['Gaya angkat ⁄ berat',fmt(s.T,1)+' N ⁄ '+fmt(Wn,1)+' N'],['Baterai',fmt(pct,0)+'% · '+fmt(s.P,0)+' W']]},
proof:{title:'Uji hubungan RPM dan gaya.',text:'Ambil dua kondisi dengan <b>sudut bilah, muatan, dan baterai sama</b>. Buat RPM kondisi kedua kira-kira 2× kondisi pertama.',target:['Target','RPM ≈ 2× · gaya angkat ≈ 4×'],cols:['RPM','Throttle','α','Gaya T','Tinggi'],record:(st)=>{const s=st.sim,p=st.params;return{cells:[fmt(s.rpm,0),fmt(p.throttle*100,0)+'%',fmt(p.alpha,1)+'°',fmt(s.T,1)+' N',fmt(s.y,2)+' m'],data:{rpm:s.rpm,T:s.T,alpha:p.alpha,payload:p.payload,batt:p.batt,label:fmt(s.rpm,0)+' RPM',summary:'T = '+fmt(s.T,1)+' N'}}},evaluate(st){let best=null;for(const a of st.evidence)for(const b of st.evidence){if(a===b||a.data.batt!==b.data.batt||Math.abs(a.data.alpha-b.data.alpha)>.01||Math.abs(a.data.payload-b.data.payload)>.01||Math.min(a.data.rpm,b.data.rpm)<500)continue;const rr=Math.max(a.data.rpm,b.data.rpm)/Math.min(a.data.rpm,b.data.rpm),tr=Math.max(a.data.T,b.data.T)/Math.max(.01,Math.min(a.data.T,b.data.T));if(rr>=1.75&&rr<=2.25&&tr>=3&&tr<=5.2)best={rr,tr}}return best?{ok:true,msg:`<b>Bukti cocok.</b> RPM berubah ${fmt(best.rr,2)}× dan gaya angkat berubah sekitar ${fmt(best.tr,2)}×.`}:{ok:false,msg:'Ambil dua kondisi stabil dengan RPM kedua kira-kira dua kali RPM pertama. Pertahankan α, muatan, dan baterai.'}}},
    eng:{eyebrow:'RANCANG · DRONE BANTUAN',title:'Bawa muatan tanpa membuat drone “ngos-ngosan”.',
      text:'Atur muatan, baterai, dan sudut bilah. Targetnya sederhana: <b>bawa 0,6 kg</b>, <b>terbang ≥ 8 menit</b>, dan tetap punya <b>cadangan gaya angkat yang nyaman</b>.' ,
      hypothesis:'gaya angkat ∝ v² · C_L(α); massa total (baterai + muatan) menentukan throttle hover dan daya, sehingga durasi terbang.',
      html:`<div class="slider-row"><label for="engPay">Muatan</label><output id="engPayOut"></output><input id="engPay" type="range" min="0" max="1.5" step="0.1"></div>
        <div class="slider-row"><label for="engAlpha">Sudut pitch bilah α</label><output id="engAlphaOut"></output><input id="engAlpha" type="range" min="3" max="16" step="0.5"></div>
        <div class="field-label">Baterai<div class="eng-seg" id="engBatt"></div></div>
        <div class="eng-checks" id="droneChecks"></div>
        <div class="control-grid"><button class="primary" data-act="test">🚁 Uji terbang</button><button data-act="reset">↺ Ulang</button></div>`,
      bind(c){
        c.$('#engPay').oninput=e=>{c.st.eng.payload=+e.target.value;c.refresh()};c.$('#engAlpha').oninput=e=>{c.st.eng.alpha=+e.target.value;c.refresh()};
        const seg=c.$('#engBatt');seg.innerHTML=Object.values(PH().drone.BATT).map(b=>`<button data-b="${b.id}">${b.name.replace('Baterai ','')}</button>`).join('');
        seg.onclick=e=>{const b=e.target.closest('button');if(b){c.st.eng.batt=b.dataset.b;c.refresh()}};
        c.$$('[data-act]',c.$('#engPanelHost')).forEach(b=>b.onclick=()=>c.api.action(b.dataset.act));
      },
      update(c){
        const e=c.st.eng,d=PH().drone.design({batt:e.batt,payload:e.payload,alpha:e.alpha});
        if(c.st.sim.batt!==e.batt)c.st.sim=newSim(e.batt);
        [['Pay',e.payload,1,' kg'],['Alpha',e.alpha,1,'°']].forEach(([k,v,dec,u])=>{const i=c.$('#eng'+k);if(+i.value!==v)i.value=v;c.$('#eng'+k+'Out').textContent=fmt(v,dec)+u});
        c.$$('#engBatt button').forEach(b=>b.classList.toggle('selected',b.dataset.b===e.batt));
        const checks=[[e.payload>=ENG.payload,`Muatan ${fmt(e.payload,1)} kg (target ≥ 0,6 kg)`],[d.minutes>=ENG.minutes,`Waktu hover ${fmt(d.minutes,1)} menit (target ≥ 8)`],[d.twr>=ENG.twr&&d.hoverThrottle<=ENG.thr&&e.alpha<=ENG.alphaMax,`Cadangan: T/W ${fmt(d.twr,2)} · hover ${fmt(d.hoverThrottle*100,0)}% · α ${fmt(e.alpha,1)}°`]];
        c.$('#droneChecks').innerHTML=checks.map(x=>`<span class="${x[0]?'ok':'bad'}">${x[0]?'✓':'✗'} ${x[1]}</span>`).join('')+`<span class="info">Massa total ${fmt(d.m,2)} kg · berat ${fmt(d.W,1)} N · daya hover ${fmt(d.Phover,0)} W</span>`;
        const ok=checks.every(x=>x[0]);if(ok&&!e.done){e.done=true;c.api.xp(25);c.api.toast('Desain drone lolos','Semua kriteria terpenuhi. Coba “Uji terbang”.')}
        c.setEngStatus(ok?'Desain lolos':checks.filter(x=>x[0]).length+'/3 syarat');
      },
      onEnter(c){c.st.sim=newSim(c.st.eng.batt)}},
    model:'Model memakai gaya angkat bilah ½ρv²·S·C_L dengan C_L = C_L0 + 2π·α (sampai stall ±14°), satu kecepatan efektif di 70% panjang bilah, dan daya hover dari teori momentum dengan efisiensi tetap. Waktu baterai dipercepat 60× (1 detik layar = 1 menit). Drone digambar diperbesar ±3×. Stabilitas, kontrol sikap, dan angin tidak dimodelkan.',
    report:()=>'Gaya angkat L = ½ρv²·S·C_L.',
    step(st,dt){
      const s=st.sim,p=effP(st);
      if(s.batt!==p.batt)Object.assign(s,newSim(p.batt));
      PH().drone.step(s,p,dt);
    },
    action(id,st){
      if(id==='reset'){st.sim=newSim(st.phase==='rekayasa'?st.eng.batt:st.params.batt)}
      else if(id==='test'){st.sim=newSim(st.eng.batt);st.sim.test=true}
    },
    createScene
  };

  /* ───────────────────── airfoil NACA 4-digit ───────────────────── */
  function naca(m,p,t,n){
    const up=[],lo=[],cam=[];
    for(let i=0;i<=n;i++){
      const x=.5*(1-Math.cos(Math.PI*i/n));
      const yt=5*t*(.2969*Math.sqrt(x)-.126*x-.3516*x*x+.2843*x*x*x-.1036*x*x*x*x);
      const yc=x<p?m/(p*p)*(2*p*x-x*x):m/((1-p)*(1-p))*((1-2*p)+2*p*x-x*x);
      cam.push([x,yc]);up.push([x,yc+yt]);lo.push([x,yc-yt]);
    }
    return{up,lo,cam};
  }

  function createScene(stage,ctx){
    const T=stage.THREE,root=new T.Group(),std=stage.std;
    stage.mount(root,{bg:0x0f1d2c,fog:[40,90],minR:3,maxR:34,view:{az:.45,el:.2,r:15,t:[0,3,0]}});
    stage.sun.position.set(-6,14,8);stage.sun.shadow.camera.left=-18;stage.sun.shadow.camera.right=18;stage.sun.shadow.camera.updateProjectionMatrix();

    // ----- hanggar -----
    const gridTex=stage.canvasTex(256,256,(g,w,h)=>{g.fillStyle='#26384a';g.fillRect(0,0,w,h);g.strokeStyle='#3b536b';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*w/4,0);g.lineTo(i*w/4,h);g.stroke();g.beginPath();g.moveTo(0,i*h/4);g.lineTo(w,i*h/4);g.stroke()}},[10,6]);
    const floor=stage.mesh(new T.BoxGeometry(20,.2,12),std(0xffffff,{map:gridTex,roughness:.8}),0,-.1,0,root,false);floor.receiveShadow=true;
    stage.mesh(new T.BoxGeometry(20,9,.2),std(0x1e3146,{roughness:.9}),0,4.5,-6,root,false);
    const pad=stage.canvasTex(128,128,(g,w,h)=>{g.fillStyle='rgba(255,211,108,.0)';g.clearRect(0,0,w,h);g.strokeStyle='#ffd36c';g.lineWidth=8;g.beginPath();g.arc(64,64,54,0,7);g.stroke();g.fillStyle='#ffd36c';g.font='900 64px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('H',64,68)});
    const padM=new T.Mesh(new T.CircleGeometry(1.2,40),new T.MeshBasicMaterial({map:pad,transparent:true}));padM.rotation.x=-Math.PI/2;padM.position.y=.005;root.add(padM);
    // tiang ketinggian
    for(let i=0;i<=7;i++){stage.mesh(new T.BoxGeometry(.5,.04,.04),std(0xffd36c,{emissive:0x442800}),-7.5,i,-2,root,false);
      const sp=stage.sprite(i+' m',{w:160,h:64,size:34,scale:.5});sp.position.set(-6.8,i,-2);root.add(sp)}
    stage.mesh(new T.BoxGeometry(.05,7,.05),std(0xffd36c),-7.5,3.5,-2,root,false);

    // ----- drone -----
    const drone=new T.Group();drone.scale.setScalar(DS);root.add(drone);
    const body=std(0x252d38,{metalness:.5,roughness:.4}),acc=std(0xff7a3d,{roughness:.5});
    stage.mesh(new T.BoxGeometry(.17,.045,.17),body,0,.02,0,drone);stage.mesh(new T.BoxGeometry(.11,.02,.11),acc,0,.055,0,drone);
    const battM=stage.mesh(new T.BoxGeometry(1,1,1),std(0x3a77c4,{roughness:.5}),0,-.04,0,drone);
    const crate=stage.mesh(new T.BoxGeometry(1,1,1),std(0xc99b5b,{roughness:.8}),0,-.12,0,drone);
    const rotors=[],discs=[];
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sz],i)=>{
      const mx=sx*.19,mz=sz*.19,arm=stage.mesh(new T.CylinderGeometry(.012,.012,.27,10),body,mx/2,.025,mz/2,drone);arm.rotation.z=Math.PI/2;arm.rotation.y=-Math.atan2(mz,mx);
      stage.mesh(new T.CylinderGeometry(.03,.03,.04,16),acc,mx,.045,mz,drone);
      stage.mesh(new T.SphereGeometry(.008,8,6),std(sz>0?0xff4040:0xffffff,{emissive:sz>0?0xff0000:0xffffff,emissiveIntensity:1}),mx*1.12,.03,mz*1.12,drone,false);
      const rot=new T.Group();rot.position.set(mx,.075,mz);drone.add(rot);rotors.push(rot);rot.userData.dir=(i===0||i===3)?1:-1;
      const bl=[0,1].map(b=>{const g=new T.Group();g.rotation.y=b*Math.PI;rot.add(g);stage.mesh(new T.BoxGeometry(.12,.004,.032),std(0xeceff2,{roughness:.4}),.07,0,0,g);return g});
      rot.userData.blades=bl;
      const disc=new T.Mesh(new T.CircleGeometry(.125,40),new T.MeshBasicMaterial({color:0xcfe9ff,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(mx,.08,mz);drone.add(disc);discs.push(disc);
      stage.mesh(new T.CylinderGeometry(.006,.006,.1,8),body,mx*.5,-.03,mz*.5,drone);
    });
    // aliran turun (downwash)
    const WN=28,wpos=new Float32Array(4*WN*3),wg=new T.BufferGeometry();wg.setAttribute('position',new T.BufferAttribute(wpos,3));
    const wash=new T.Points(wg,new T.PointsMaterial({color:0x9fdcff,size:.016,transparent:true,opacity:.75,depthWrite:false}));drone.add(wash);
    const wseed=[];for(let i=0;i<4*WN;i++)wseed.push([Math.random(),(Math.random()-.5)*.14,(Math.random()-.5)*.14]);
    const shadow=new T.Mesh(new T.CircleGeometry(.5,24),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.01;root.add(shadow);
    const aT=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),1,0x63e3a0,.25,.18),aW=new T.ArrowHelper(new T.Vector3(0,-1,0),new T.Vector3(),1,0xff5468,.25,.18);root.add(aT);root.add(aW);
    const tag=stage.sprite('',{w:520,h:84,size:34,bg:'rgba(6,17,30,.85)',scale:1.05,depthTest:false});tag.renderOrder=9;root.add(tag);
    const warn=stage.sprite('',{w:560,h:84,size:34,bg:'rgba(70,10,20,.9)',scale:1.05,depthTest:false});warn.renderOrder=9;root.add(warn);

    // ----- laboratorium penampang bilah (x = AIR_X) -----
    const lab=new T.Group();lab.position.set(AIR_X,2,0);root.add(lab);
    const panelTex=stage.canvasTex(256,256,(g,w,h)=>{g.fillStyle='#14283b';g.fillRect(0,0,w,h);g.strokeStyle='#24455f';g.lineWidth=1.5;for(let i=0;i<=16;i++){g.beginPath();g.moveTo(i*w/16,0);g.lineTo(i*w/16,h);g.stroke();g.beginPath();g.moveTo(0,i*h/16);g.lineTo(w,i*h/16);g.stroke()}},[5,3]);
    stage.mesh(new T.PlaneGeometry(10,6),std(0xffffff,{map:panelTex,roughness:.9}),0,0,-1.3,lab,false);
    [2.2,-2.2].forEach(y=>stage.mesh(new T.BoxGeometry(10,.06,2),std(0x7eeeff,{transparent:true,opacity:.22,roughness:.1}),0,y,0,lab,false));
    const labTitle=stage.sprite('PENAMPANG BILAH (diperbesar) · angin dari kiri →',{w:700,h:80,size:34,bg:'rgba(6,17,30,.85)',scale:1.1,depthTest:false});labTitle.position.set(0,2.75,0);labTitle.renderOrder=9;lab.add(labTitle);
    const C=3,prof=naca(.04,.4,.12,48);
    const toXY=a=>a.map(([x,y])=>new T.Vector2((x-.5)*C,y*C));
    const camXY=toXY(prof.cam),upXY=toXY(prof.up),loXY=toXY(prof.lo);
    function region(a,b){const sh=new T.Shape();sh.moveTo(a[0].x,a[0].y);a.forEach(p=>sh.lineTo(p.x,p.y));for(let i=b.length-1;i>=0;i--)sh.lineTo(b[i].x,b[i].y);const g=new T.ExtrudeGeometry(sh,{depth:.8,bevelEnabled:false});g.translate(0,0,-.4);return g}
    const pitch=new T.Group();lab.add(pitch);
    const upM=new T.MeshStandardMaterial({color:0xcfd8e2,roughness:.4,metalness:.3,emissive:0x000000}),loM=new T.MeshStandardMaterial({color:0xcfd8e2,roughness:.4,metalness:.3,emissive:0x000000});
    pitch.add(new T.Mesh(region(camXY,upXY),upM));pitch.add(new T.Mesh(region(camXY,loXY),loM));
    const stations=[.15,.3,.45,.6,.75];
    const sIdx=stations.map(f=>Math.round(f*(camXY.length-1)));
    const topArrows=sIdx.map(()=>{const a=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),.5,0x6aa7ff,.12,.1);pitch.add(a);return a});
    const botArrows=sIdx.map(()=>{const a=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),.5,0xff7a8a,.12,.1);pitch.add(a);return a});
    const aL=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),1,0x63e3a0,.3,.2);lab.add(aL);
    const labInfo=stage.sprite('',{w:760,h:120,size:32,bg:'rgba(6,17,30,.88)',scale:1.2,depthTest:false});labInfo.position.set(0,-2.85,0);labInfo.renderOrder=9;lab.add(labInfo);
    // garis arus + partikel dalam kerangka angin
    const NL=6,LP=70,UL=-4.4,UR=4.4,lines=[],y0s=[];
    for(let i=0;i<NL;i++)y0s.push(.4+i*.26);for(let i=0;i<NL;i++)y0s.push(-.4-i*.26);
    const lineMat=new T.LineBasicMaterial({color:0x7eeeff,transparent:true,opacity:.45});
    y0s.forEach(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(LP*3),3));const l=new T.Line(g,lineMat);lab.add(l);lines.push(l)});
    const PPL=9,pp=new Float32Array(y0s.length*PPL*3),pc=new Float32Array(y0s.length*PPL*3),pg=new T.BufferGeometry();
    pg.setAttribute('position',new T.BufferAttribute(pp,3));pg.setAttribute('color',new T.BufferAttribute(pc,3));
    const parts=new T.Points(pg,new T.PointsMaterial({size:.085,vertexColors:true,transparent:true,opacity:.95,depthWrite:false}));lab.add(parts);
    const pu=[];y0s.forEach((_,i)=>{for(let j=0;j<PPL;j++)pu.push(UL+(UR-UL)*((j+((i*.37)%1))/PPL))});
    // permukaan terrotasi (kerangka angin) untuk garis arus
    let surfUp=[],surfLo=[],lastKey='',curAlpha=8,curKc=.3;
    function buildSurf(aRad){const c=Math.cos(aRad),s=Math.sin(aRad);const r=p=>({u:p.x*c+p.y*s,w:-p.x*s+p.y*c});surfUp=upXY.map(r).sort((a,b)=>a.u-b.u);surfLo=loXY.map(r).sort((a,b)=>a.u-b.u)}
    function surfAt(arr,u){if(u<arr[0].u||u>arr[arr.length-1].u)return null;let lo=0,hi=arr.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(arr[m].u>u)hi=m;else lo=m}const t=(u-arr[lo].u)/Math.max(1e-6,arr[hi].u-arr[lo].u);return arr[lo].w*(1-t)+arr[hi].w*t}
    const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
    function yAt(u,y0,aRad){
      let d=0;const top=y0>0,sf=surfAt(top?surfUp:surfLo,u);
      if(sf!=null)d+=sf*Math.exp(-Math.abs(y0)/.9);
      d-=Math.tan(aRad)*.55*sm(1.2,3.2,u)*Math.exp(-Math.abs(y0)/1.6); // downwash di belakang bilah
      d+=Math.tan(aRad)*.3*(1-sm(-3.2,-1.0,u))*Math.exp(-Math.abs(y0)/1.6)*.5; // upwash di depan
      return y0+d;
    }
    function rebuildLines(aRad){
      buildSurf(aRad);
      lines.forEach((l,i)=>{const p=l.geometry.attributes.position;for(let k=0;k<LP;k++){const u=UL+(UR-UL)*k/(LP-1);p.setXYZ(k,u,yAt(u,y0s[i],aRad),0)}p.needsUpdate=true});
    }
    const colSlow=new T.Color(0x3a7bff),colFast=new T.Color(0xffa23a),tc=new T.Color();

    // ----- interaksi: tidak ada grab (hanya orbit) -----
    stage.grabbables=[];

    return{
      update(st,dt){
        const s=st.sim,p=effP(st),d=PH().drone,eng=st.phase==='rekayasa',t=stage.time;
        // ===== drone =====
        drone.position.set(s.x,s.y+.075*DS,0);drone.rotation.z=-s.tilt;
        const omega=s.rpm*2*Math.PI/60,vis=Math.min(omega,60);
        rotors.forEach(r=>{r.rotation.y+=r.userData.dir*vis*dt;r.userData.blades.forEach(b=>b.rotation.x=r.userData.dir*p.alpha*Math.PI/180)});
        discs.forEach(ds=>ds.material.opacity=Math.min(.34,s.rpm/d.BL.rpmMax*.45)*(s.rpm>300?1:0));
        const bw=[.06,.09,.13][['kecil','sedang','besar'].indexOf(p.batt)];battM.scale.set(bw*1.6,.04,bw*1.1);
        const cs=p.payload>0?.05+.045*Math.cbrt(p.payload):.0001;crate.visible=p.payload>0;crate.scale.set(cs*2,cs*1.4,cs*2);crate.position.y=-.11-cs*.5;
                shadow.position.set(s.x,.01,0);shadow.scale.setScalar(.5+s.y*.05+.4);shadow.material.opacity=clamp(.4-s.y*.04,.08,.4);
        // downwash
        wash.visible=!!st.reveal.wash&&s.rpm>200;
        if(wash.visible){const vi=d.downwash(Math.max(s.T,.1))*.045,wp=wg.attributes.position;
          for(let i=0;i<4*WN;i++){const rIdx=Math.floor(i/WN),r=rotors[rIdx],sd=wseed[i];let f=(sd[0]+t*vi*.9+(i%WN)/WN)%1;
            wp.setXYZ(i,r.position.x+sd[1],r.position.y-.02-f*.55,r.position.z+sd[2])}wp.needsUpdate=true}
        // panah T / W
        const Wn=s.m*PH().G,Lt=.4+1.3*(s.T/Math.max(Wn,.1))*.8,Lw=.4+1.3*.8;
        aT.visible=aW.visible=!!st.reveal.forces;
        aT.position.set(s.x,s.y+.075*DS+.2,0);aT.setLength(Math.max(.3,Lt),.28,.2);
        aW.position.set(s.x,s.y+.075*DS-.1,0);aW.setLength(Lw,.28,.2);
        tag.position.set(s.x,s.y+1.45,0);
        stage.setSpriteText(tag,st.reveal.forces?`T = ${fmt(s.T,1)} N   |   W = ${fmt(Wn,1)} N`:(s.y<.05&&s.T<Wn?'Naikkan throttle ↑':`y = ${fmt(s.y,2)} m`),s.T>Wn*1.01?'#63e3a0':'#eaf6ff');
        warn.visible=!!(s.crash||s.battWh<=0);warn.position.set(0,5.4,0);
        stage.setSpriteText(warn,s.battWh<=0?'Baterai habis — motor mati':'Mendarat keras! Tekan “Ulang”');
        // ===== penampang bilah =====
        const demo=s.rpm<400&&!eng,rpm=demo?2500:s.rpm,v=Math.max(d.bladeSpeed(rpm),0.01),a=p.alpha;
        const sp=d.airfoilSpeeds(v,a),dp=d.bernoulliDp(PH().RHO_AIR,sp.top,sp.bottom),CL=d.CL(a);
        const aRad=a*Math.PI/180,key=a+'|'+(+sp.k).toFixed(3);
        pitch.rotation.z=-aRad;
        if(key!==lastKey){lastKey=key;rebuildLines(aRad);curAlpha=a;curKc=sp.k}
        const flow=v>.5?1:0,vScale=.045;
        for(let i=0;i<y0s.length;i++){const y0=y0s[i],up=y0>0;
          for(let j=0;j<PPL;j++){const idx=i*PPL+j;let u=pu[idx];
            const prof=Math.exp(-(u*u)/(2*1.4*1.4)),f=1+(up?1:-1)*curKc*prof*Math.exp(-Math.abs(y0)/1.1);
            u+=flow*v*vScale*f*dt;if(u>UR)u-=(UR-UL);pu[idx]=u;
            const y=yAt(u,y0,aRad);pp[idx*3]=u;pp[idx*3+1]=y;pp[idx*3+2]=0;
            tc.copy(colSlow).lerp(colFast,clamp((f-.6)/.8,0,1));pc[idx*3]=tc.r;pc[idx*3+1]=tc.g;pc[idx*3+2]=tc.b}}
        pg.attributes.position.needsUpdate=true;pg.attributes.color.needsUpdate=true;
        // tekanan pada bilah
        const q0=.5*PH().RHO_AIR*v*v,topP=.5*PH().RHO_AIR*(sp.top*sp.top-v*v),botP=.5*PH().RHO_AIR*(v*v-sp.bottom*sp.bottom),k=clamp(sp.k/.45,0,1);
        const showCp=!!st.reveal.cp;
        upM.emissive.setRGB(0,.12*k*3,.6*k);loM.emissive.setRGB(.7*k,.05*k,.1*k);
        const sc=1.2/Math.max(q0*.6,1);
        topArrows.forEach((ar,i)=>{const pt=upXY[sIdx[i]],len=clamp(topP*sc,.12,1.3);ar.visible=showCp;ar.setDirection(new T.Vector3(0,1,0));ar.position.set(pt.x,pt.y,0);ar.setLength(len,.14,.1)});
        botArrows.forEach((ar,i)=>{const pt=loXY[sIdx[i]],len=clamp(botP*sc,.1,1.3);ar.visible=showCp;ar.setDirection(new T.Vector3(0,1,0));ar.position.set(pt.x,pt.y-len,0);ar.setLength(len,.14,.1)});
        aL.visible=showCp;aL.position.set(0,.4,0);aL.setLength(clamp(.5+CL*1.1,.4,2.4),.3,.2);
        stage.setSpriteText(labInfo,`v atas ${fmt(sp.top,1)} m/s  >  v bawah ${fmt(sp.bottom,1)} m/s   ·   Δp = ${fmt(dp,0)} Pa`+(demo?'   (RPM demo 2.500)':''));
      },
      view(n){stage.setView(n==='bilah'?{az:0,el:.04,r:8.5,t:[AIR_X,2,0]}:n==='atas'?{az:.9,el:.6,r:15,t:[0,3,0]}:{az:.45,el:.2,r:15,t:[0,3,0]})},
      views:[{id:'drone',label:'Drone'},{id:'bilah',label:'Bilah'}]
    };
  }
  P.pressureLabs.register(spec);
})(window);

