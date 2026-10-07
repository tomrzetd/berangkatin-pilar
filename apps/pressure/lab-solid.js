/* PILAR · Lab Tekanan #1 — Zat Padat: P = F / A */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  P.pressureLabs=P.pressureLabs||{list:[],register(s){this.list.push(s);this[s.id]=s}};
  const PH=()=>P.pressurePhysics,fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',',');
  const kPa=v=>v>=1e6?fmt(v/1e6,2)+' MPa':v>=1e4?fmt(v/1e3,0)+' kPa':fmt(v/1e3,2)+' kPa';

  const TASKS={
    salju:{id:'salju',name:'❄ Jangan tenggelam',F:60*9.81,surface:'salju',need:'Siswa 60 kg harus berjalan di salju lembut tanpa amblas lebih dari 2 cm.',min:200,max:4000,step:50,def:600,unit:'cm²',
      goal:'amblas ≤ 2 cm dan luas ≤ 3.000 cm² (masih bisa dipakai berjalan)'},
    tajam:{id:'tajam',name:'📌 Harus menembus',F:40,surface:'tanah',need:'Dorongan tangan 40 N harus bisa menembus bahan keras (butuh tekanan ≥ 1 MPa).',min:.02,max:2,step:.01,def:1.2,unit:'cm²',
      goal:'tekanan ≥ 1 MPa dan luas ujung ≥ 0,05 cm² (supaya tidak patah)'}
  };
  function view(st){ // nilai turunan yang dipakai HUD + scene
    const p=st.params,Ph=PH();
    if(st.phase==='rekayasa'){
      const t=TASKS[st.eng.task],A=st.eng.area*1e-4,s=Ph.solid.SURFACES[t.surface],Pr=t.F/A;
      return{eng:true,task:t,F:t.F,A,P:Pr,depth:Ph.solid.sinkDepth(Pr,s.P0,.2),surface:t.surface,h:.2,obj:'desain',orient:t.id};
    }
    const c=Ph.solid.calc(p);return Object.assign(c,{obj:p.obj,orient:p.orient,surface:p.surface});
  }

  const spec={
    id:'padat',icon:'🧱',tab:'Padat',title:'Tekanan pada Zat Padat',tagline:'Balok yang sama, bekas di pasir bisa berbeda.',accent:'#ffd36c',
    studentUX:'natural-solid-v1',
    natural:{tryTitle:'Balik baloknya. Lihat pasirnya.',tryText:'Berat balok tetap. Ubah hanya posisi bidang yang menyentuh pasir.',ahaTitle:'Mengapa bekas pasir berubah padahal baloknya sama?',ahaToast:'Beratnya sama, tetapi bekas di pasir berubah. Sekarang cari penyebabnya.',proofHint:'Ambil bukti balok TIDUR dan BERDIRI dengan massa yang sama.',recordAgain:'Sekarang balik posisi balok dan ambil bukti kedua.',proofDone:'Dua posisi menunjukkan pola yang sama. Sekarang pakai konsepnya untuk merancang.',reflection:'Hubungkan <strong>luas bidang tekan</strong> dengan <strong>besar tekanan</strong> yang dihasilkan.',ctaTry:'Balik baloknya…'},
    advancedLabel:'Eksperimen lanjut · benda, massa, dan permukaan',
    defaults:()=>({obj:'balok',orient:'tidur',mass:5,surface:'pasir'}),
    engDefaults:()=>({task:'salju',area:600,done:{}}),
    view,
    look:{title:'Balok yang sama. Pasir yang sama.',
      text:'Kita tidak akan mulai dari rumus. Perhatikan saja bekas balok pada pasir ketika posisinya diubah.',
      question:'Kalau balok 5 kg dibalik dari tidur menjadi berdiri, mana yang membuat pasir lebih dalam?'},
    predict:{title:'Menurutmu, mana yang lebih dalam?',text:'Massanya tetap 5 kg. Yang berubah hanya bidang balok yang menyentuh pasir.',
      options:[{v:'tidur',l:'▰ Tidur lebih dalam'},{v:'sama',l:'═ Sama saja'},{v:'berdiri',l:'▮ Berdiri lebih dalam'}],answer:'berdiri',
      why:'Beratnya tetap. Saat berdiri, bidang yang menyentuh pasir lebih kecil sehingga gaya yang sama terkonsentrasi pada area lebih sempit.'},
    controls:[
      {k:'obj',type:'seg',label:'Benda',adv:true,options:()=>Object.values(PH().solid.OBJECTS).map(o=>({v:o.id,l:o.icon+' '+o.name}))},
      {k:'orient',type:'seg',label:'Balik posisi balok',options:p=>PH().solid.OBJECTS[p.obj].orients.map(o=>({v:o.id,l:o.label.replace(/\s*\([^)]*\)/,'')}))},
      {k:'mass',type:'range',label:'Massa benda',unit:'kg',adv:true,min:p=>PH().solid.OBJECTS[p.obj].mass[0],max:p=>PH().solid.OBJECTS[p.obj].mass[1],step:p=>PH().solid.OBJECTS[p.obj].mass[1]>10?1:.1,dec:p=>PH().solid.OBJECTS[p.obj].mass[1]>10?0:1},
      {k:'surface',type:'seg',label:'Permukaan',adv:true,options:()=>Object.values(PH().solid.SURFACES).map(s=>({v:s.id,l:s.name}))}
    ],
    reveals:[{k:'numbers',label:'Angka',on:'🙈 Sembunyikan angka',off:'👁 Lihat angkanya'}],
    missions:[{id:'flip',title:'Bandingkan dua posisi',desc:'Pindahkan balok dari TIDUR ke BERDIRI dan lihat perubahan bekasnya.'}],
    onParam(k,v,old,st,api){
      if(k==='orient'&&v!==old)api.mark('flip');
      if(k==='obj'){const o=PH().solid.OBJECTS[v];st.params.orient=o.orients[0].id;st.params.mass=o.mass[2]}
    },
    check(){},
    patterns:[
      {icon:'⚖️',title:'Yang sama: berat balok',text:'Balok tetap 5 kg. Gaya tekan ke pasir tidak berubah.'},
      {icon:'↔️',title:'Yang berubah: luas sentuh',text:'Saat berdiri, bidang sentuh lebih kecil. Gaya yang sama terkumpul pada area yang lebih sempit.'},
      {icon:'💡',title:'Akibatnya',text:'Bidang lebih kecil → tekanan lebih besar → pasir melesak lebih dalam.'}],
    formula:{main:'P = F / A',sec:'gaya yang sama ÷ luas lebih kecil = tekanan lebih besar',note:'P adalah tekanan, F gaya tekan, dan A luas bidang yang benar-benar menyentuh permukaan. Angka dipakai setelah polanya terlihat.'},
    hud:(st)=>{const v=view(st),p=st.params,o=PH().solid.OBJECTS[p.obj]?.orients.find(x=>x.id===p.orient),A=v.A*1e4;
      if(!st.formula||['lihat','tebak','coba'].includes(st.phase))return[['Yang tetap','massa '+fmt(p.mass,0)+' kg'],['Bidang sentuh',A>=150?'lebih lebar':A>=20?'lebih sempit':'sangat kecil'],['Tekanan','cari polanya'],['Bekas di pasir',fmt(v.depth*100,1)+' cm']];
      return[['Gaya F',fmt(v.F,0)+' N'],['Luas A',A>=1?fmt(A,0)+' cm²':fmt(A,2)+' cm²'],['Tekanan P',kPa(v.P)],['Amblas',fmt(v.depth*100,1)+' cm']]},
    proof:{title:'Ambil dua bukti. Jangan banyak-banyak.',
      text:'Ambil satu bukti saat balok <b>TIDUR</b>, lalu satu lagi saat <b>BERDIRI</b>. Massanya harus tetap sama.',
      target:['Target','2 kondisi · massa sama · tekanan berubah ≥ 3,5×'],
      cols:['Posisi','A (cm²)','P (kPa)','Amblas'],
      record:(st)=>{const v=view(st),p=st.params,o=PH().solid.OBJECTS[p.obj].orients.find(x=>x.id===p.orient),A=v.A*1e4;
        const label=o.label.replace(/\s*\([^)]*\)/,'');
        return{cells:[label,fmt(A,A<1?2:0),fmt(v.P/1e3,1),fmt(v.depth*100,1)+' cm'],data:{obj:p.obj,mass:p.mass,orient:p.orient,A:v.A,P:v.P,label,areaLabel:'A '+fmt(A,A<1?2:0)+' cm²',pressureLabel:'P '+fmt(v.P/1e3,1)+' kPa'}}},
      evaluate(st){
        const e=st.evidence;let best=0,pair=null;
        for(const a of e)for(const b of e){if(a===b||a.data.obj!==b.data.obj)continue;if(Math.abs(a.data.mass-b.data.mass)/Math.max(a.data.mass,b.data.mass,.001)>.01)continue;
          const r=Math.max(a.data.P,b.data.P)/Math.max(1,Math.min(a.data.P,b.data.P));if(r>best){best=r;pair=[a,b]}}
        return best>=3.5?{ok:true,msg:`<b>Bukti cocok.</b> Dengan massa yang sama, tekanan berubah ${fmt(best,1)}× hanya karena luas bidang sentuh berubah.`}
          :{ok:false,msg:e.length<2?'Ambil kondisi pertama, ubah posisi balok, lalu ambil kondisi kedua.':'Gunakan balok yang sama dan massa yang sama. Bandingkan TIDUR dengan BERDIRI.'}
      }},
    eng:{eyebrow:'RANCANG · PAKAI KONSEPNYA',title:'Sekarang tekanan harus berguna.',
      text:'Pilih satu masalah nyata. Atur <b>luas bidang tekan</b> sampai benda melakukan fungsi yang kita inginkan.',
      hypothesis:'tekanan P = F/A dikendalikan dengan mengubah luas bidang tekan A pada gaya F tertentu.',
      html:`<div class="eng-seg" id="solidTask"></div>
        <div class="eng-need" id="solidNeed"></div>
        <div class="slider-row"><label for="solidArea">Luas bidang tekan rancanganmu <b>A</b></label><output id="solidAreaOut"></output><input id="solidArea" type="range"></div>
        <div class="eng-checks" id="solidChecks"></div>`,
      bind(c){
        const seg=c.$('#solidTask');
        seg.innerHTML=Object.values(TASKS).map(t=>`<button data-t="${t.id}">${t.name}</button>`).join('');
        seg.onclick=e=>{const b=e.target.closest('button');if(!b)return;const t=TASKS[b.dataset.t];c.st.eng.task=t.id;c.st.eng.area=t.def;c.refresh()};
        c.$('#solidArea').oninput=e=>{c.st.eng.area=+e.target.value;c.refresh()};
      },
      update(c){
        const e=c.st.eng,t=TASKS[e.task],v=view(c.st),inp=c.$('#solidArea');
        c.$$('#solidTask button').forEach(b=>b.classList.toggle('selected',b.dataset.t===e.task));
        c.$('#solidNeed').innerHTML=`<b>Kebutuhan:</b> ${t.need}<br><b>Kriteria jadi:</b> ${t.goal}.`;
        if(+inp.min!==t.min){inp.min=t.min;inp.max=t.max;inp.step=t.step}if(+inp.value!==e.area)inp.value=e.area;
        c.$('#solidAreaOut').textContent=fmt(e.area,t.step<1?2:0)+' cm²';
        const checks=t.id==='salju'?[[v.depth<=.02,`Amblas ${fmt(v.depth*100,1)} cm (≤ 2 cm)`],[e.area<=3000,`Luas ${fmt(e.area,0)} cm² (≤ 3.000 cm²)`]]
          :[[v.P>=1e6,`Tekanan ${kPa(v.P)} (≥ 1 MPa)`],[e.area>=.05,`Luas ujung ${fmt(e.area,2)} cm² (≥ 0,05 cm²)`]];
        c.$('#solidChecks').innerHTML=checks.map(x=>`<span class="${x[0]?'ok':'bad'}">${x[0]?'✓':'✗'} ${x[1]}</span>`).join('');
        if(checks.every(x=>x[0])&&!e.done[t.id]){e.done[t.id]=true;c.api.xp(25);c.api.toast('Rancangan berhasil','“'+t.name.replace(/^\S+\s/,'')+'” memenuhi kriteria.')}
        c.setEngStatus(Object.keys(e.done).length+'/2 rancangan berhasil');
      }},
    model:'Model amblas disederhanakan: kedalaman mengikuti P/P₀ (P₀ = kekerasan permukaan) dan dibatasi 10 cm. Tanah nyata punya lapisan, kadar air, dan gesekan yang diabaikan di sini. Benda kecil (paku, hak) digambar lebih besar daripada ukuran sebenarnya.',
    report:(st)=>`Gaya berat F = m·g; tekanan P = F/A.`,
    createScene
  };

  /* ───────────────────────── SCENE 3D ───────────────────────── */
  function createScene(stage){
    const T=stage.THREE,root=new T.Group(),S=7,SEG=84;
    stage.mount(root,{bg:0x15283a,fog:[22,48],minR:5,maxR:20,view:{az:.7,el:.5,r:11.5,t:[0,.5,0]}});
    const std=stage.std;

    // lantai + bingkai kotak pasir
    stage.mesh(new T.PlaneGeometry(60,60),std(0x1c2c3a,{roughness:.95}),0,-.62,0,root,false).rotation.x=-Math.PI/2;
    const wood=stage.canvasTex(256,256,(g,w,h)=>{g.fillStyle='#9a6c3e';g.fillRect(0,0,w,h);for(let i=0;i<60;i++){g.globalAlpha=.07+Math.random()*.1;g.strokeStyle=Math.random()>.5?'#f0c892':'#4c2c16';g.lineWidth=.6+Math.random()*2;const y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(70,y+3,170,y-3,w,y+2);g.stroke()}},[2,1]);
    const woodM=std(0xffffff,{map:wood,roughness:.7});
    const fw=.35;
    [[0,S/2+fw/2,S+fw*2,fw],[0,-S/2-fw/2,S+fw*2,fw],[S/2+fw/2,0,fw,S],[-S/2-fw/2,0,fw,S]].forEach(([x,z,w,d])=>stage.mesh(new T.BoxGeometry(w,1.1,d),woodM,x,-.07,z,root));
    stage.mesh(new T.BoxGeometry(S,.9,S),std(0x6f5a3a,{roughness:1}),0,-.62+.45-.0,0,root,false);

    // pasir (heightfield)
    const geo=new T.PlaneGeometry(S,S,SEG,SEG);geo.rotateX(-Math.PI/2);
    const n=geo.attributes.position.count,noise=new Float32Array(n),base=new Float32Array(n*3);
    for(let i=0;i<n;i++){const x=geo.attributes.position.getX(i),z=geo.attributes.position.getZ(i);noise[i]=.018*Math.sin(x*3.1+z*1.7)+.012*Math.sin(x*7.3-z*5.9)+.006*Math.sin(x*17+z*13)}
    geo.setAttribute('color',new T.BufferAttribute(base,3));
    const sand=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0}));sand.receiveShadow=true;root.add(sand);
    const sandColor=new T.Color(0xd9b779),tmpC=new T.Color();
    let curD=0,curKey='',curSurface='',dirty=true,lastHx=-1,lastHz=-1;

    function deform(depthU,hx,hz){
      const pos=geo.attributes.position,col=geo.attributes.color,soft=.10+.38*depthU;
      for(let i=0;i<n;i++){
        const x=pos.getX(i),z=pos.getZ(i),dx=Math.max(Math.abs(x)-hx,0),dz=Math.max(Math.abs(z)-hz,0),dist=Math.sqrt(dx*dx+dz*dz);
        const core=dist<=0?1:Math.exp(-(dist/soft)*(dist/soft)),ridge=.30*depthU*Math.exp(-Math.pow((dist-.22-.25*depthU)/.3,2));
        pos.setY(i,noise[i]-depthU*core+ridge*(1-.6*core));
        const shade=1-.16*core+.7*ridge+noise[i]*2.2;
        tmpC.copy(sandColor).multiplyScalar(Math.max(.55,Math.min(1.2,shade)));col.setXYZ(i,tmpC.r,tmpC.g,tmpC.b);
      }
      pos.needsUpdate=true;col.needsUpdate=true;geo.computeVertexNormals();
    }

    // objek
    const metal=std(0xb9c4cf,{metalness:.85,roughness:.28}),dark=std(0x303842,{metalness:.7,roughness:.4}),skin=std(0xe0a982,{roughness:.7}),leather=std(0x6b2a2a,{roughness:.55}),sole=std(0x1d2128,{roughness:.8});
    let obj=null,objInfo={hx:1,hz:.5,H:.5},plate=null;
    const B=(w,h,d,m,x,y,z,par)=>stage.mesh(new T.BoxGeometry(w,h,d),m,x,y,z,par);
    const C=(rt,rb,h,m,x,y,z,par,seg=24)=>stage.mesh(new T.CylinderGeometry(rt,rb,h,seg),m,x,y,z,par);
    function shoe(par,x,high){
      const g=new T.Group();g.position.x=x;par.add(g);
      if(!high){B(.9,.12,2.6,sole,0,.06,0,g);B(.84,.45,1.4,leather,0,.4,-.55,g);B(.7,.8,.9,leather,0,.55,.5,g);C(.27,.3,2.3,skin,0,1.75,.5,g)}
      else{C(.065,.1,.9,metal,0,.45,.82,g,16);B(.7,.1,1.9,leather,0,.93,-.05,g);B(.62,.4,1,leather,0,1.18,-.4,g);C(.25,.27,2.2,skin,0,2.2,.5,g)}
      return g;
    }
    function build(o,or,key){
      if(obj){root.remove(obj);obj.traverse(m=>{if(m.geometry)m.geometry.dispose()})}
      obj=new T.Group();root.add(obj);plate=null;
      if(o==='balok'){const d={tidur:[2,.5,1],samping:[2,1,.5],berdiri:[1,2,.5]}[or];B(d[0],d[1],d[2],woodM,0,d[1]/2,0,obj);objInfo={hx:d[0]/2,hz:d[2]/2,H:d[1]}}
      else if(o==='kerucut'){const m=stage.mesh(new T.ConeGeometry(.5,1.2,48),metal,0,.6,0,obj);if(or==='ujung')m.rotation.x=Math.PI;objInfo={hx:or==='alas'?.45:.03,hz:or==='alas'?.45:.03,H:1.2}}
      else if(o==='paku'){
        const up=or==='kepala';
        C(.2,.2,.06,metal,0,up?.03:1.57,0,obj);C(.035,.035,1.3,metal,0,up?.71:.9,0,obj);
        const tip=stage.mesh(new T.ConeGeometry(.035,.25,16),metal,0,up?1.485:.125,0,obj);if(!up)tip.rotation.x=Math.PI;
        objInfo={hx:up?.2:.03,hz:up?.2:.03,H:1.62};
      }
      else if(o==='sepatu'){
        if(or==='datar2'){shoe(obj,-.7);shoe(obj,.7);objInfo={hx:1.15,hz:1.3,H:2.9}}
        else if(or==='datar1'){shoe(obj,0);objInfo={hx:.45,hz:1.3,H:2.9}}
        else{shoe(obj,0,true);objInfo={hx:.07,hz:.07,H:3.3};obj.children[0].position.z=-.82}
      }
      curKey=key;
      obj.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
    }
    function buildPlate(task){
      if(obj){root.remove(obj);obj.traverse(m=>{if(m.geometry)m.geometry.dispose()})}
      obj=new T.Group();root.add(obj);
      if(task==='salju'){
        const pl=B(1,.12,1,std(0x2f6fa8,{roughness:.5}),0,.06,0,obj);
        const body=C(.28,.32,1.9,std(0xe0a982),0,1.1,0,obj);const hd=stage.mesh(new T.SphereGeometry(.3,20,16),skin,0,2.25,0,obj);
        const cap=stage.mesh(new T.SphereGeometry(.31,20,12,0,Math.PI*2,0,Math.PI/2),std(0xd94f5c),0,2.3,0,obj);
        plate={plate:pl,fixed:[body,hd,cap]};
      }else{
        const tip=stage.mesh(new T.ConeGeometry(.12,.6,24),metal,0,.3,0,obj);tip.rotation.x=Math.PI;
        C(.12,.12,1.6,dark,0,1.4,0,obj);C(.2,.2,.5,std(0xe0a982),0,2.4,0,obj);
        plate={tip,fixed:[]};
      }
      curKey='plate:'+task;
    }

    // panah gaya + papan info + menara tekanan
    const arrow=new T.ArrowHelper(new T.Vector3(0,-1,0),new T.Vector3(0,3,0),1.4,0xff5468,.38,.24);root.add(arrow);
    const info=stage.sprite('',{w:420,h:96,size:40,bg:'rgba(6,17,30,.82)',scale:1.6,depthTest:false});info.renderOrder=9;root.add(info);
    const areaBox=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1,.02,1)),new T.LineBasicMaterial({color:0x7eeeff}));root.add(areaBox);
    const tower=new T.Group();tower.position.set(-S/2-1.1,-.62,-S/2+.2);root.add(tower);
    stage.mesh(new T.BoxGeometry(.42,3.8,.42),std(0x0b1624,{transparent:true,opacity:.55}),0,1.9,0,tower,false);
    const bar=stage.mesh(new T.BoxGeometry(.3,1,.3),std(0x63e3a0,{emissive:0x113322,roughness:.4}),0,.5,0,tower,false);
    const tlabel=stage.sprite('P',{w:300,h:90,size:40,bg:'rgba(6,17,30,.85)',scale:1.2,depthTest:false});tlabel.position.set(0,4.35,0);tower.add(tlabel);
    for(let i=0;i<=5;i++){const s=stage.sprite(['100 Pa','1 kPa','10 kPa','100 kPa','1 MPa','10 MPa'][i],{w:200,h:70,size:34,scale:.62});s.position.set(.85,.2+i*.72,0);tower.add(s)}

    return{
      update(st,dt){
        const v=view(st),eng=v.eng;
        const key=eng?'plate:'+v.task.id:v.obj+':'+v.orient;
        if(key!==curKey){eng?buildPlate(v.task.id):build(v.obj,v.orient,key);curD=0;dirty=true}
        if(curSurface!==v.surface){curSurface=v.surface;sandColor.set(PH().solid.SURFACES[v.surface].color);dirty=true}
        // geometri rancangan
        let hx=objInfo.hx,hz=objInfo.hz,H=objInfo.H;
        if(eng&&plate){
          if(plate.plate){const s=Math.sqrt(st.eng.area)/10;plate.plate.scale.set(s,1,s);hx=hz=s/2;H=2.55;plate.fixed.forEach(m=>m.visible=true)}
          else{hx=hz=.03;H=2.65}
        }
        const targetD=v.depth*10,k=1-Math.exp(-dt*6);
        const prev=curD;curD+=(targetD-curD)*k;
        if(Math.abs(curD-prev)>2e-5||dirty||lastHx!==hx||lastHz!==hz){deform(curD,hx,hz);lastHx=hx;lastHz=hz;dirty=false}
        obj.position.y=-curD;
        // indikator: fenomena dulu, angka setelah siswa meminta / memahami polanya
        const top=H-curD,early=['lihat','tebak','coba'].includes(st.phase),showNumbers=!!st.reveal.numbers||(!early&&st.formula);
        arrow.visible=showNumbers;arrow.position.set(0,top+.4+Math.min(2.6,.5+v.F/400),0);
        arrow.setLength(.5+Math.min(2.6,v.F/400),.38,.24);
        info.visible=showNumbers;info.position.set(0,top+.4+Math.min(2.6,.5+v.F/400)+.9,0);
        const Acm=v.A*1e4;
        stage.setSpriteText(info,`F ${fmt(v.F,0)} N ÷ A ${Acm>=1?fmt(Acm,0):fmt(Acm,2)} cm²`);
        areaBox.visible=showNumbers;areaBox.scale.set(Math.max(.06,hx*2),1,Math.max(.06,hz*2));areaBox.position.set(0,.05,0);
        // menara tekanan (log)
        const t=Math.max(0,Math.min(1,(Math.log10(Math.max(v.P,1))-2)/5)),hgt=Math.max(.05,t*3.6);
        bar.scale.y=hgt;bar.position.y=hgt/2;bar.material.color.setHSL(.36-.36*t,.75,.55);bar.material.emissive.setHSL(.36-.36*t,.7,.14);
        tower.visible=showNumbers;
        stage.setSpriteText(tlabel,'P = '+kPa(v.P));
      },
      view(name){stage.setView(name==='samping'?{az:.0,el:.1,r:9,t:[0,.7,0]}:{az:.7,el:.5,r:11.5,t:[0,.5,0]})},
      views:[{id:'serong',label:'Serong'},{id:'samping',label:'Samping'}]
    };
  }
  P.pressureLabs.register(spec);
})(window);

