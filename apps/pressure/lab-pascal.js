/* PILAR · Lab Tekanan #3 — Hukum Pascal: lift hidrolik pencucian mobil */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  P.pressureLabs=P.pressureLabs||{list:[],register(s){this.list.push(s);this[s.id]=s}};
  const PH=()=>P.pressurePhysics,fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',',');
  const pr=v=>v>=1e6?fmt(v/1e6,2)+' MPa':fmt(v/1e3,0)+' kPa';
  const kn=v=>fmt(v/1e3,1)+' kN';
  const ENG={F1:500,H:1.2,car:'sedan',maxStrokes:150};

  // parameter efektif: pada fase rekayasa memakai rancangan siswa
  function eff(st){
    if(st.phase==='rekayasa')return{F1:ENG.F1,A1:st.eng.A1,A2:st.eng.A2,car:ENG.car,ts:st.params.ts};
    return st.params;
  }
  const calc=st=>PH().pascal.calc(eff(st));

  const spec={
    id:'pascal',icon:'🚗',tab:'Pascal',title:'Lift Hidrolik · Pencucian Mobil',tagline:'Bagaimana tangan bisa mengangkat mobil satu ton?',accent:'#ff9d5c',
    defaults:()=>({F1:100,A1:2,A2:150,car:'sedan',ts:20}),
    engDefaults:()=>({A1:5,A2:100,done:false}),
    simInit:()=>({h:0,pump:0,auto:false,lower:false,grabbed:false,manualDelta:0,strokes:0,phase:0}),
    look:{title:'Lihat sistemnya. Ikuti jalur cairannya.',
      text:'Di bawah lantai pencucian ada dua silinder berisi oli yang dihubungkan pipa: silinder kecil (pompa) dan silinder besar (penopang mobil). Lantai dibuat transparan agar kamu bisa melihatnya.',
      question:'Kalau kamu hanya menekan pompa kecil, mengapa mobil di atas silinder besar bisa terangkat?'},
    predict:{title:'Tebak dulu. Salah justru berguna.',text:'Sedan 1.200 kg (berat ≈ 11,8 kN) harus diangkat dengan dorongan tangan sekitar <b>100–500 N</b> saja pada pompa kecil. Mungkinkah?',
      options:[{v:'mustahil',l:'Mustahil: gaya dorong harus ≥ berat mobil'},{v:'luas',l:'Bisa, jika piston besar jauh lebih luas'},{v:'cepat',l:'Bisa, asal dipompa lebih cepat'}],answer:'luas',
      why:'Tekanan di dalam cairan tertutup diteruskan sama besar ke segala arah. Gaya pada piston besar = tekanan × luasnya, jadi luas yang besar “menggandakan” gaya.'},
    controls:[
      {k:'car',type:'seg',label:'Kendaraan',options:()=>Object.values(PH().pascal.CARS).map(c=>({v:c.id,l:c.name+' · '+c.mass+' kg'}))},
      {k:'F1',type:'range',label:'Gaya dorong pada pompa (F₁)',unit:'N',min:()=>10,max:()=>500,step:()=>10,dec:()=>0},
      {k:'A1',type:'range',label:'Luas piston kecil (A₁)',unit:'cm²',min:()=>1,max:()=>20,step:()=>.5,dec:()=>1},
      {k:'A2',type:'range',label:'Luas piston besar (A₂)',unit:'cm²',min:()=>50,max:()=>400,step:()=>10,dec:()=>0},
      {k:'ts',type:'seg',label:'Percepat waktu',options:()=>[{v:1,l:'1×'},{v:5,l:'5×'},{v:20,l:'20×'}]},
      {type:'actions',items:[{id:'pump',label:'▶ Pompa / Berhenti',primary:true},{id:'lower',label:'▼ Turunkan (buka katup)'},{id:'reset',label:'↺ Ulang'}]}
    ],
    reveals:[{k:'pressure',label:'P',on:'Sembunyikan P',off:'Lihat tekanan P'},{k:'force',label:'F',on:'Sembunyikan F',off:'Lihat gaya F₁, F₂, W'},{k:'work',label:'Usaha',on:'Sembunyikan usaha',off:'Lihat usaha'}],
    missions:[
      {id:'lift',title:'01 · Angkat Mobilnya',desc:'Atur F₁, A₁, A₂ hingga mobil terangkat ≥ 0,5 m. Petunjuk: F₂ harus ≥ W.'},
      {id:'area',title:'02 · Ubah Luas Piston',desc:'Ubah A₁ atau A₂ dan lihat perubahan gaya yang dibutuhkan.'},
      {id:'heavy',title:'03 · Angkat yang Lebih Berat',desc:'Pilih SUV atau truk, lalu angkat ≥ 0,3 m.'}],
    onParam(k,v,old,st,api){
      if((k==='A1'||k==='A2')&&+v!==+old)api.mark('area');
    },
    check(st,api){if(st.phase==='rekayasa')return;const m=PH().pascal.CARS[st.params.car].mass;if(st.sim.h>=.5)api.mark('lift');if(m>=1800&&st.sim.h>=.3)api.mark('heavy')},
    patterns:[
      {icon:'🔗',title:'Tekanan di mana-mana sama',text:'F₁ ÷ A₁ selalu sama dengan F₂ ÷ A₂ — cairan meneruskan tekanan ke segala arah.'},
      {icon:'💪',title:'Gaya diperbesar sebanyak rasio luas',text:'A₂ = 100 × A₁ → gaya angkat 100× gaya dorong.'},
      {icon:'🐢',title:'Tidak ada yang gratis',text:'Piston besar naik sedikit sekali setiap langkah. Usaha masuk F₁·d₁ sama dengan usaha keluar F₂·d₂.'}],
    formula:{main:'F₁ / A₁ = F₂ / A₂',sec:'F₂ = F₁ · (A₂ / A₁)',note:'Volume cairan berpindah sama: A₁·d₁ = A₂·d₂ → d₂ = d₁·(A₁/A₂). Maka F₁·d₁ = F₂·d₂ (usaha ideal, tanpa gesekan). Keuntungan mekanik KM = A₂/A₁.'},
    hud:(st)=>{const c=calc(st);return[['Tekanan P',pr(c.P)+(c.relief?' ⚠':'')],['F₂ ⁄ berat W',kn(c.F2)+' ⁄ '+kn(c.W)],['Tinggi naik h',fmt(st.sim.h,2)+' m'],['Langkah pompa',fmt(st.sim.strokes,0)]]},
    proof:{title:'Bisakah hasilmu diulang?',
      text:'Tantangan: angkat kendaraan <b>≥ 1.400 kg</b> (SUV/truk) dengan gaya dorong <b>F₁ ≤ 150 N</b>. Tentukan A₁ dan A₂, lalu catat saat F₂ ≥ W.',
      target:['Target','m ≥ 1.400 kg · F₁ ≤ 150 N'],
      cols:['Kendaraan','F₁ (N)','A₁','A₂','P','F₂ / W','Hasil'],
      record:(st)=>{const c=calc(st),car=PH().pascal.CARS[st.params.car],ok=c.canLift&&car.mass>=1400&&st.params.F1<=150;
        return{cells:[car.name,fmt(st.params.F1,0),fmt(st.params.A1,1),fmt(st.params.A2,0),pr(c.P),fmt(c.F2/c.W,2)+'×',c.canLift?'terangkat':'gagal'],data:{ok,lift:c.canLift}}},
      evaluate(st){
        const ok=st.evidence.some(r=>r.data.ok);
        if(ok)return{ok:true,msg:'<b>Target tercapai.</b> Rasio luas yang besar membuat gaya kecil cukup untuk mobil berat.'};
        return{ok:false,msg:'Butuh rasio A₂/A₁ ≥ W / F₁. Untuk SUV (≈17,7 kN) dengan F₁ = 150 N, rasio harus ≥ 118. Coba A₁ = 1,5 cm² dan A₂ = 200 cm².'};
      }},
    eng:{eyebrow:'AKSI REKAYASA · PRODUK',title:'Rancang lift hidrolik bengkel.',
      text:'Kendaraan: <b>sedan 1.200 kg</b>, pekerja mampu mendorong <b>≤ 500 N</b>, naik <b>1,2 m</b>, selesai dalam <b>≤ 150 langkah</b> pompa (≈ 75 detik), dan tekanan sistem <b>≤ 2,5 MPa</b>. Tentukan A₁ dan A₂, lalu uji dengan tombol Pompa.',
      hypothesis:'rasio luas piston A₂/A₁ menguatkan gaya (Pascal) tetapi menambah jumlah langkah karena jarak piston besar mengecil.',
      html:`<div class="slider-row"><label for="engA1">Luas piston kecil <b>A₁</b></label><output id="engA1Out"></output><input id="engA1" type="range" min="1" max="20" step="0.5"></div>
        <div class="slider-row"><label for="engA2">Luas piston besar <b>A₂</b></label><output id="engA2Out"></output><input id="engA2" type="range" min="50" max="400" step="10"></div>
        <div class="eng-checks" id="pascalChecks"></div>
        <div class="control-grid"><button class="primary" data-act="pump">▶ Uji angkat</button><button data-act="lower">▼ Turunkan</button><button data-act="reset">↺ Ulang</button></div>`,
      bind(c){
        c.$('#engA1').oninput=e=>{c.st.eng.A1=+e.target.value;c.refresh()};c.$('#engA2').oninput=e=>{c.st.eng.A2=+e.target.value;c.refresh()};
        c.$$('[data-act]',c.$('#engPanelHost')).forEach(b=>b.onclick=()=>c.api.action(b.dataset.act));
      },
      update(c){
        const e=c.st.eng,d=PH().pascal.design(e.A1,e.A2,ENG.car,ENG.F1,ENG.H);
        [['A1',e.A1,1],['A2',e.A2,0]].forEach(([k,v,dec])=>{const i=c.$('#eng'+k);if(+i.value!==v)i.value=v;c.$('#eng'+k+'Out').textContent=fmt(v,dec)+' cm²'});
        const checks=[[d.Fneed<=ENG.F1,`Gaya dibutuhkan ${fmt(d.Fneed,0)} N (≤ ${ENG.F1} N)`],[d.strokes<=ENG.maxStrokes,`Langkah ${fmt(d.strokes,0)} (≤ ${ENG.maxStrokes}) ≈ ${fmt(d.time,0)} s`],[d.Pneed<=PH().pascal.PMAX,`Tekanan ${pr(d.Pneed)} (≤ 2,5 MPa)`]];
        c.$('#pascalChecks').innerHTML=checks.map(x=>`<span class="${x[0]?'ok':'bad'}">${x[0]?'✓':'✗'} ${x[1]}</span>`).join('')+`<span class="info">Rasio luas A₂/A₁ = ${fmt(d.ratio,1)}×</span>`;
        const ok=checks.every(x=>x[0]);if(ok&&!e.done){e.done=true;c.api.xp(25);c.api.toast('Rancangan lolos','Gaya, jumlah langkah, dan tekanan memenuhi syarat.')}
        c.setEngStatus(ok?'Rancangan lolos':checks.filter(x=>x[0]).length+'/3 syarat');
      },
      onEnter(c){c.st.sim=spec.simInit()}},
    model:'Cairan dianggap tak termampatkan; gesekan, kebocoran, dan massa piston diabaikan. Langkah pompa memakai katup satu arah ideal. Gambar silinder diperbesar sekitar 8× tetapi perbandingan luasnya benar. Lift sungguhan memakai pompa motor dan banyak pengaman.',
    report:()=>'F₁/A₁ = F₂/A₂.',
    step(st,dt){
      const s=st.sim,c=calc(st),ts=eff(st).ts;
      let dpump=0;
      if(s.auto&&s.h<PH().pascal.HMAX-1e-4){
        s.phase+=dt*2*Math.PI*PH().pascal.STROKE_HZ;
        const np=.5-.5*Math.cos(s.phase);dpump=np-s.pump;s.pump=np;
        if(!c.canLift)s.pump=Math.min(s.pump,.1);
      }else if(s.auto){s.auto=false}
      if(!s.auto&&s.manualDelta){dpump=s.manualDelta;s.manualDelta=0}
      if(dpump>0&&c.canLift){const m=s.auto?ts:1;s.h=Math.min(PH().pascal.HMAX,s.h+dpump*c.rise*m);s.strokes+=dpump*m}
      if(s.lower){s.h=Math.max(0,s.h-.28*dt);if(s.h<=0){s.lower=false}}
      if(!s.auto&&!s.grabbed)s.pump+=(0-s.pump)*(1-Math.exp(-dt*3));
    },
    action(id,st){
      const s=st.sim;
      if(id==='pump'){s.auto=!s.auto;s.lower=false}
      else if(id==='lower'){s.lower=!s.lower;s.auto=false}
      else if(id==='reset'){Object.assign(s,spec.simInit())}
    },
    createScene
  };

  function createScene(stage,ctx){
    const T=stage.THREE,root=new T.Group(),std=stage.std;
    stage.mount(root,{bg:0x14202c,fog:[28,60],minR:6,maxR:28,view:{az:.5,el:.28,r:15,t:[-1.4,.4,0]}});
    stage.sun.position.set(-4,12,9);
    const oilM=new T.MeshStandardMaterial({color:0xd89a2b,transparent:true,opacity:.78,roughness:.25,emissive:0x2a1500});
    const glassM=new T.MeshStandardMaterial({color:0xbfe6ff,transparent:true,opacity:.2,roughness:.05,side:T.DoubleSide,depthWrite:false});
    const steel=std(0xb5c0cb,{metalness:.85,roughness:.3}),dark=std(0x252c34,{metalness:.6,roughness:.5});

    // lantai transparan + dinding
    const tileTex=stage.canvasTex(256,256,(g,w,h)=>{g.fillStyle='#9aa7b2';g.fillRect(0,0,w,h);g.strokeStyle='#7c8995';g.lineWidth=3;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*w/4,0);g.lineTo(i*w/4,h);g.stroke();g.beginPath();g.moveTo(0,i*h/4);g.lineTo(w,i*h/4);g.stroke()}},[9,4]);
    const floor=stage.mesh(new T.BoxGeometry(18,.1,7),std(0xffffff,{map:tileTex,transparent:true,opacity:.42,roughness:.5}),-1.5,-.05,0,root,false);floor.receiveShadow=true;
    stage.mesh(new T.BoxGeometry(18,2.2,7),std(0x3b4b59,{transparent:true,opacity:.2,roughness:.8,depthWrite:false}),-1.5,-1.15,0,root,false);
    stage.mesh(new T.BoxGeometry(18,.25,7),std(0x1a232c),-1.5,-2.35,0,root);
    const wall=stage.canvasTex(512,256,(g,w,h)=>{g.fillStyle='#244f7a';g.fillRect(0,0,w,h);g.strokeStyle='#1b3d5f';g.lineWidth=2;for(let i=0;i<=16;i++){g.beginPath();g.moveTo(i*w/16,0);g.lineTo(i*w/16,h);g.stroke()}for(let j=0;j<=8;j++){g.beginPath();g.moveTo(0,j*h/8);g.lineTo(w,j*h/8);g.stroke()}},[2,1]);
    stage.mesh(new T.BoxGeometry(18,6,.2),std(0xffffff,{map:wall,roughness:.55}),-1.5,3,-3.5,root);
    const sign=stage.sprite('CUCI MOBIL · PILAR',{w:640,h:120,size:56,bg:'rgba(255,211,108,.95)',color:'#1b2736',scale:2.4});sign.position.set(-1.5,5.2,-3.3);root.add(sign);

    // ----- silinder besar (penopang) -----
    const bigG=new T.Group();root.add(bigG);bigG.position.set(0,0,0);
    const smallG=new T.Group();root.add(smallG);smallG.position.set(-5.2,0,0);
    let bigCyl,bigOil,bigPiston,bigRod,smCyl,smOil,smPlunger,smRod,lastR=[0,0];
    function buildCyl(g,r,top,bot){
      const cyl=stage.mesh(new T.CylinderGeometry(r,r,top-bot,40,1,true),glassM,0,(top+bot)/2,0,g,false);
      const oil=stage.mesh(new T.CylinderGeometry(r*.96,r*.96,1,32),oilM,0,0,0,g,false);
      return[cyl,oil];
    }
    function rebuild(r1,r2){
      [bigG,smallG].forEach(g=>{while(g.children.length){const c=g.children.pop();c.geometry&&c.geometry.dispose()}});
      [bigCyl,bigOil]=buildCyl(bigG,r2,.05,-2);
      bigPiston=stage.mesh(new T.CylinderGeometry(r2*.96,r2*.96,.22,40),steel,0,0,0,bigG);
      bigRod=stage.mesh(new T.CylinderGeometry(Math.max(.09,r2*.32),Math.max(.09,r2*.32),1,24),steel,0,0,0,bigG);
      [smCyl,smOil]=buildCyl(smallG,r1,.2,-2);
      smPlunger=stage.mesh(new T.CylinderGeometry(r1*.96,r1*.96,.2,32),steel,0,0,0,smallG);
      smRod=stage.mesh(new T.CylinderGeometry(Math.max(.025,r1*.3),Math.max(.025,r1*.3),1,12),steel,0,0,0,smallG);
    }
    // pipa + katup + manometer
    const pipe=stage.mesh(new T.CylinderGeometry(.09,.09,5.2,20),oilM,-2.6,-1.88,0,root,false);pipe.rotation.z=Math.PI/2;
    stage.mesh(new T.BoxGeometry(.5,.5,.5),std(0xd94f5c),-2.6,-1.55,0,root);
    const kv=stage.sprite('katup pengaman · 2,5 MPa',{w:400,h:70,size:30,scale:.72});kv.position.set(-2.6,-1.05,0);root.add(kv);
    const gaugeCv=document.createElement('canvas');gaugeCv.width=gaugeCv.height=256;const gtex=new T.CanvasTexture(gaugeCv);
    stage.mesh(new T.CylinderGeometry(.54,.54,.1,40),std(0x222a33),-3.6,1.3,.14,root).rotation.x=Math.PI/2;
    const gauge=new T.Mesh(new T.CircleGeometry(.5,48),new T.MeshBasicMaterial({map:gtex}));gauge.position.set(-3.6,1.3,.2);root.add(gauge);
    stage.mesh(new T.CylinderGeometry(.05,.05,1.6,10),steel,-3.6,.5,.2,root);
    let lastG=-1;
    function drawGauge(f,relief){
      const g=gaugeCv.getContext('2d');g.clearRect(0,0,256,256);g.fillStyle='#f4f7fa';g.beginPath();g.arc(128,128,122,0,7);g.fill();
      g.lineWidth=8;for(let i=0;i<3;i++){g.strokeStyle=['#63e3a0','#ffd36c','#ff6d83'][i];g.beginPath();g.arc(128,128,100,Math.PI*.75+i*Math.PI*1.5/3,Math.PI*.75+(i+1)*Math.PI*1.5/3);g.stroke()}
      g.strokeStyle='#1b2736';g.lineWidth=6;g.beginPath();const a=Math.PI*.75+f*Math.PI*1.5;g.moveTo(128,128);g.lineTo(128+Math.cos(a)*88,128+Math.sin(a)*88);g.stroke();
      g.fillStyle='#1b2736';g.beginPath();g.arc(128,128,10,0,7);g.fill();g.font='700 26px sans-serif';g.textAlign='center';g.fillText('P',128,196);if(relief){g.fillStyle='#d62f4a';g.fillText('MAKS',128,226)}
      gtex.needsUpdate=true;
    }

    // ----- platform + mobil -----
    const platform=new T.Group();root.add(platform);
    stage.mesh(new T.BoxGeometry(5.6,.2,2.3),std(0x58636f,{metalness:.6,roughness:.45}),0,.1,0,platform);
    [-.85,.85].forEach(z=>stage.mesh(new T.BoxGeometry(5.4,.08,.55),std(0xffd36c,{roughness:.5}),0,.24,z,platform));
    const carG=new T.Group();platform.add(carG);let carKey='';
    function buildCar(id){
      while(carG.children.length){const c=carG.children.pop();c.traverse&&c.traverse(m=>m.geometry&&m.geometry.dispose())}
      const c=PH().pascal.CARS[id],L=c.len,W=c.wid;
      const body=std(c.color,{metalness:.5,roughness:.3}),glass=std(0x1d2a3a,{metalness:.2,roughness:.1}),tyre=std(0x14171b,{roughness:.9});
      const base=.28;
      if(id==='truk'){
        stage.mesh(new T.BoxGeometry(L*.6,1.0,W),std(0xdfe7ee,{roughness:.5}),-L*.2,base+.85,0,carG);
        stage.mesh(new T.BoxGeometry(L*.32,1.1,W*.96),body,L*.34,base+.9,0,carG);stage.mesh(new T.BoxGeometry(L*.2,.5,W*.9),glass,L*.4,base+1.25,0,carG);
      }else{
        stage.mesh(new T.BoxGeometry(L,.55,W),body,0,base+.5,0,carG);
        stage.mesh(new T.BoxGeometry(L*.5,c.cab*.5,W*.9),glass,-L*.04,base+.77+c.cab*.25,0,carG);
        stage.mesh(new T.BoxGeometry(L*.42,.06,W*.88),body,-L*.04,base+.8+c.cab*.5,0,carG);
      }
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sz])=>{const w=stage.mesh(new T.CylinderGeometry(.34,.34,.26,24),tyre,sx*L*.32,.34,sz*(W/2-.05),carG);w.rotation.x=Math.PI/2;
        const hub=stage.mesh(new T.CylinderGeometry(.18,.18,.28,16),steel,sx*L*.32,.34,sz*(W/2-.05),carG);hub.rotation.x=Math.PI/2});
      [-1,1].forEach(sz=>stage.mesh(new T.BoxGeometry(.06,.16,.34),std(0xfff3b0,{emissive:0xffe27a,emissiveIntensity:.8}),L/2,base+.56,sz*W*.34,carG));
      carKey=id;
    }

    // ----- pompa: pegangan -----
    const handle=new T.Group();root.add(handle);
    stage.mesh(new T.BoxGeometry(1.5,.14,.2),std(0xd94f5c,{roughness:.45}),0,0,0,handle);
    [-.75,.75].forEach(x=>stage.mesh(new T.SphereGeometry(.13,14,12),dark,x,0,0,handle));
    const pumpTag=stage.sprite('TARIK–DORONG ↓ seret pegangan',{w:480,h:80,size:32,bg:'rgba(6,17,30,.8)',scale:.85,depthTest:false});pumpTag.renderOrder=9;root.add(pumpTag);

    // ----- panah gaya, info, panah tekanan -----
    const aF1=new T.ArrowHelper(new T.Vector3(0,-1,0),new T.Vector3(),1,0xff5468,.25,.16),aF2=new T.ArrowHelper(new T.Vector3(0,1,0),new T.Vector3(),1,0x63e3a0,.3,.2),aW=new T.ArrowHelper(new T.Vector3(0,-1,0),new T.Vector3(),1,0xffd36c,.3,.2);
    [aF1,aF2,aW].forEach(a=>root.add(a));
    const infoP=stage.sprite('',{w:520,h:96,size:36,bg:'rgba(6,17,30,.85)',scale:1.2,depthTest:false}),infoL=stage.sprite('',{w:560,h:96,size:36,bg:'rgba(6,17,30,.85)',scale:1.2,depthTest:false}),infoW=stage.sprite('',{w:660,h:96,size:34,bg:'rgba(6,17,30,.88)',scale:1.25,depthTest:false});
    [infoP,infoL,infoW].forEach(s=>{s.renderOrder=9;root.add(s)});
    const presArrows=[];for(let i=0;i<10;i++){const a=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(),.5,0x7eeeff,.14,.1);root.add(a);presArrows.push(a)}

    // ----- interaksi: seret pegangan -----
    stage.grabbables=[handle];stage.onHover=true;
    stage.onGrab=()=>{const s0=ctx.getState().sim;if(s0.auto)return null;s0.grabbed=true;return{move(e,ray,dx,dy){
      const st=ctx.getState(),s=st.sim;if(s.auto)return;
      const c=calc(st),max=c.canLift?1:.1,np=Math.max(0,Math.min(max,s.pump+dy/110)),d=np-s.pump;s.pump=np;if(d>0)s.manualDelta=(s.manualDelta||0)+d;
    },end(){ctx.getState().sim.grabbed=false}}};

    const STR=PH().pascal.STROKE;let rKey='';
    return{
      update(st,dt){
        const e=eff(st),c=calc(st),s=st.sim;
        const r1=.045*Math.sqrt(e.A1),r2=.045*Math.sqrt(e.A2);
        if(rKey!==r1+'|'+r2){rKey=r1+'|'+r2;rebuild(r1,r2)}
        if(carKey!==e.car)buildCar(e.car);
        // tekanan → warna oli
        const t=Math.min(1,c.P/PH().pascal.PMAX);oilM.color.setHSL(.11-.11*t,.8,.5-.06*t);oilM.emissive.setHSL(.06,.9,.05+.12*t);
        // piston besar
        const pb=-1.9+s.h,ROD=1.98;bigPiston.position.y=pb+.11;bigRod.scale.y=ROD;bigRod.position.y=pb+.22+ROD/2;
        bigOil.scale.y=Math.max(.02,pb+2);bigOil.position.y=-2+bigOil.scale.y/2;
        platform.position.y=pb+.22+ROD;
        // plunger kecil
        const py=.02-s.pump*STR;smPlunger.position.y=py;smRod.scale.y=1.45-py;smRod.position.y=py+.1+smRod.scale.y/2;
        smOil.scale.y=Math.max(.02,py+2);smOil.position.y=-2+smOil.scale.y/2;
        const hy=py+.1+smRod.scale.y;handle.position.set(-5.2,hy,0);
        pumpTag.position.set(-5.2,hy+.55,0);pumpTag.visible=!s.auto&&s.h<.02;
        // panah
        const L1=.35+.3*Math.log10(1+e.F1/15),L2=.35+.3*Math.log10(1+c.F2/15),LW=.35+.3*Math.log10(1+c.W/15);
        aF1.visible=!!st.reveal.force;aF1.position.set(-5.2,hy+.35+L1,0);aF1.setLength(L1,.25,.16);
        aF2.visible=!!st.reveal.force;aF2.position.set(0,pb-.1,0);aF2.setLength(L2,.3,.2);
        aW.visible=!!st.reveal.force;aW.position.set(0,platform.position.y+2.1+LW,0);aW.setLength(LW,.3,.2);
        // info
        infoP.visible=!!(st.reveal.force||st.reveal.pressure);infoP.position.set(-5.2,2.9,0);
        stage.setSpriteText(infoP,`P = F₁/A₁ = ${pr(c.Pin)}`);
        infoL.visible=!!st.reveal.force;infoL.position.set(0,platform.position.y+4.1,0);
        stage.setSpriteText(infoL,`F₂ = P·A₂ = ${kn(c.F2)}  ${c.canLift?'≥':'<'}  W = ${kn(c.W)}`,c.canLift?'#63e3a0':'#ff8a9b');
        infoW.visible=!!st.reveal.work;infoW.position.set(-2.6,-.5,1.3);
        const win=c.Fneed*STR*s.strokes,wout=c.W*s.h;
        stage.setSpriteText(infoW,`Usaha masuk ≈ ${fmt(win,0)} J   |   usaha keluar W·h = ${fmt(wout,0)} J`);
        // panah tekanan di dalam oli (sama panjang)
        const pl=.18+.8*t,pts=[[0,-1.2,'r',r2],[0,-.8,'l',r2],[-5.2,-1.2,'r',r1],[-5.2,-.8,'l',r1],[-1.2,-1.88,'u',.09],[-3.4,-1.88,'u',.09],[-2.6,-1.88,'d',.09],[0,-1.7,'r',r2],[-5.2,-1.7,'l',r1],[-4,-1.88,'d',.09]];
        presArrows.forEach((a,i)=>{const p=pts[i],dir=p[2]==='r'?new T.Vector3(1,0,0):p[2]==='l'?new T.Vector3(-1,0,0):p[2]==='u'?new T.Vector3(0,1,0):new T.Vector3(0,-1,0);
          a.visible=!!st.reveal.pressure;a.setDirection(dir);a.position.set(p[0]+dir.x*(p[3]*.9-pl),p[1]+dir.y*(p[3]*.9-pl),0);a.setLength(pl,.12,.09)});
        // manometer
        const f=Math.round(t*60)/60;if(f!==lastG){lastG=f;drawGauge(f,c.relief)}
        // katup bocor
        stage.setSpriteText(kv,c.relief?'KATUP TERBUKA ⚠ P > 2,5 MPa':'katup pengaman · 2,5 MPa',c.relief?'#ff6d83':'#eaf6ff');
      },
      view(n){stage.setView(n==='pompa'?{az:-.35,el:.2,r:8,t:[-4.6,.2,0]}:n==='mobil'?{az:.55,el:.2,r:10,t:[0,1.2,0]}:{az:.5,el:.28,r:15,t:[-1.4,.4,0]})},
      views:[{id:'semua',label:'Semua'},{id:'pompa',label:'Pompa'},{id:'mobil',label:'Mobil'}]
    };
  }
  P.pressureLabs.register(spec);
})(window);

