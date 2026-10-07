/* PILAR · Lab Tekanan #2 — Zat Cair: p = ρ · g · h (menyelam di kolam renang) */
(function(global){
  'use strict';
  const P=global.PILAR=global.PILAR||{};
  P.pressureLabs=P.pressureLabs||{list:[],register(s){this.list.push(s);this[s.id]=s}};
  const PH=()=>P.pressurePhysics,fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',','),POOL_H=4.5,POOL_L=4;
  const kp=v=>fmt(v/1e3,1)+' kPa';

  const spec={
    id:'cair',icon:'🏊',tab:'Cair',title:'Tekanan Cair · Menyelam',tagline:'Semakin dalam, apa yang sebenarnya berubah?',accent:'#69baff',
    studentUX:'natural-fluid-v1',
    natural:{tryTitle:'Seret perenang turun. Rasakan polanya.',tryText:'Ubah kedalaman saja. Perhatikan perubahan di sekitar telinga dan penggaris.',ahaTitle:'Mengapa tekanan bertambah saat makin dalam?',ahaToast:'Perenang makin dalam dan tekanan ikut membesar. Sekarang cari hubungan kedalamannya.',proofHint:'Ambil satu bukti dekat 1 m dan satu lagi dekat 3 m pada cairan yang sama.',recordAgain:'Pindahkan perenang jauh lebih dalam lalu ambil bukti kedua.',proofDone:'Kedalaman dan tekanan berubah dengan perbandingan yang sama. Sekarang gunakan pola itu untuk merancang.',reflection:'Hubungkan <strong>kedalaman</strong>, <strong>massa jenis cairan</strong>, dan <strong>tekanan hidrostatis</strong>.'},
    advancedLabel:'Eksperimen lanjut · jenis cairan dan lebar wadah',
    defaults:()=>({depth:.5,fluid:'tawar',width:8}),
    engDefaults:()=>({depths:[1.0,1.6,3.0]}),
    look:{title:'Perenang yang sama. Air yang sama.',text:'Mulai dari yang terlihat: perenang dapat diseret naik–turun. Jangan cari rumus dulu.',question:'Jika telinga berpindah dari sekitar 1 m ke 3 m, apakah tekanan air menjadi tetap, 3×, atau 9×?'},
    predict:{title:'Dari 1 m ke 3 m, menurutmu?',text:'Airnya sama. Yang berubah hanya kedalaman telinga dari permukaan.',
      options:[{v:'sama',l:'Tetap sama'},{v:'3',l:'Menjadi 3×'},{v:'9',l:'Menjadi 9×'}],answer:'3',
      why:'Tekanan hidrostatis p = ρ·g·h berbanding lurus dengan kedalaman h, sehingga 3× lebih dalam → 3× lebih besar (bukan 9×).'},
    controls:[
{k:'depth',type:'range',label:'Seret / atur kedalaman',unit:'m',min:()=>0,max:()=>4.2,step:()=>.05,dec:()=>2},
{k:'fluid',type:'seg',label:'Jenis cairan',adv:true,options:()=>Object.values(PH().fluid.FLUIDS).map(f=>({v:f.id,l:f.name}))},
{k:'width',type:'range',label:'Lebar wadah',unit:'m',adv:true,min:()=>4,max:()=>12,step:()=>1,dec:()=>0}],
reveals:[{k:'arrows',on:'🙈 Sembunyikan panah',off:'👁 Lihat arah tekanan'},{k:'wall',on:'🙈 Sembunyikan profil',off:'👁 Lihat profil tekanan'}],
missions:[{id:'dive',title:'Bandingkan dua kedalaman',desc:'Bawa telinga perenang hingga kedalaman ≥ 2,5 m.'}],
onParam(k,v,old,st,api){if(k==='depth'&&+v>=2.5)api.mark('dive')},check(){},
    patterns:[{icon:'⬇',title:'Lebih dalam → tekanan lebih besar',text:'Pada cairan yang sama, tekanan bertambah sebanding dengan kedalaman.'},{icon:'↔',title:'Tekanan bekerja ke segala arah',text:'Di satu titik dalam cairan diam, dorongan tidak hanya ke bawah.'},{icon:'💧',title:'Jenis cairan juga berpengaruh',text:'Pada kedalaman sama, cairan yang lebih rapat memberi tekanan lebih besar.'}],
    formula:{main:'p = ρ · g · h',sec:'p total = p₀ + ρ · g · h',note:'ρ = massa jenis cairan (kg/m³), g = 9,81 m/s², h = kedalaman dari permukaan. p₀ ≈ 101.325 Pa (tekanan udara). Gaya pada permukaan: F = p · A.'},
    hud:(st)=>{const c=PH().fluid.calc(Object.assign({},st.params)),h=st.params.depth;if(!st.formula)return[['Kedalaman',fmt(h,2)+' m'],['Tekanan air',h<1?'kecil':h<2.5?'makin besar':'besar'],['Arah tekanan','ke segala arah'],['Angka','buka di Pahami']];return[['Kedalaman h',fmt(h,2)+' m'],['p hidrostatis',kp(c.ph)],['ρ cairan',fmt(c.rho,0)+' kg/m³'],['p total',kp(c.ptot)]]},
proof:{title:'Dua kedalaman sudah cukup.',text:'Gunakan <b>cairan yang sama</b>. Ambil satu bukti sekitar <b>1 m</b> dan satu lagi sekitar <b>3 m</b>.',target:['Target','dua kedalaman · cairan sama · rasio p mengikuti rasio h'],cols:['Cairan','h (m)','p air (kPa)','Rasio'],
record:(st)=>{const c=PH().fluid.calc(st.params),f=PH().fluid.FLUIDS[st.params.fluid];return{cells:[f.name,fmt(st.params.depth,2),fmt(c.ph/1e3,1),'—'],data:{fluid:f.id,ph:c.ph,h:st.params.depth,label:fmt(st.params.depth,1)+' m · '+f.name,summary:'p = '+fmt(c.ph/1e3,1)+' kPa'}}},
evaluate(st){let best=null;for(const a of st.evidence)for(const b of st.evidence){if(a===b||a.data.fluid!==b.data.fluid||Math.min(a.data.h,b.data.h)<.5)continue;const hr=Math.max(a.data.h,b.data.h)/Math.min(a.data.h,b.data.h),pr=Math.max(a.data.ph,b.data.ph)/Math.max(1,Math.min(a.data.ph,b.data.ph));if(hr>=2.4&&Math.abs(pr/hr-1)<.05)best={hr,pr}}return best?{ok:true,msg:`<b>Bukti cocok.</b> Kedalaman berubah ${fmt(best.hr,1)}× dan tekanan juga sekitar ${fmt(best.pr,1)}×.`}:{ok:false,msg:'Ambil dua kondisi pada cairan yang sama dengan kedalaman yang cukup berbeda, misalnya 1 m dan 3 m.'}}},
    eng:{eyebrow:'RANCANG · PROFIL KEDALAMAN',title:'Rancang kolam demonstrasi tiga zona.',
      text:'Atur tiga kedalaman agar masing-masing mendekati <b>batas tekanan desain model</b> tanpa melewatinya. Ini latihan rekayasa, <b>bukan standar keselamatan manusia</b>.',
      hypothesis:'tekanan hidrostatis p = ρ·g·h menentukan tekanan desain pada tiap kedalaman.',
      html:`<div id="zoneRows"></div><div class="eng-checks" id="zoneChecks"></div><div class="eng-need" id="wallNote"></div>`,
      bind(c){
        const rows=c.$('#zoneRows');
        rows.innerHTML=PH().fluid.ZONES.map((z,i)=>`<div class="slider-row"><label for="zone${i}">Zona ${z.name} <small>batas ${fmt(z.limit/1e3,0)} kPa</small></label><output id="zone${i}Out"></output><input id="zone${i}" type="range" min="0.5" max="4.5" step="0.05"></div>`).join('');
        PH().fluid.ZONES.forEach((z,i)=>{c.$('#zone'+i).oninput=e=>{c.st.eng.depths[i]=+e.target.value;c.refresh()}});
      },
      update(c){
        const rho=PH().fluid.FLUIDS[c.st.params.fluid].rho,res=PH().fluid.zoneCheck(rho,c.st.eng.depths);
        res.forEach((r,i)=>{const inp=c.$('#zone'+i);if(+inp.value!==c.st.eng.depths[i])inp.value=c.st.eng.depths[i];c.$('#zone'+i+'Out').textContent=fmt(r.h,2)+' m'});
        c.$('#zoneChecks').innerHTML=res.map(r=>`<span class="${r.ok?'ok':'bad'}">${r.ok?'✓':'✗'} ${r.name}: p = ${kp(r.ph)} · ${r.safe?(r.efficient?'sesuai target':'masih di bawah target (target h ≥ '+fmt(.85*r.hmax,2)+' m)'):'melewati batas model, maks h = '+fmt(r.hmax,2)+' m'}</span>`).join('');
        const H=Math.max(...c.st.eng.depths),F=PH().fluid.wallForce(rho,H,c.st.params.width);
        c.$('#wallNote').innerHTML=`Gaya air pada dinding kolam terdalam (${fmt(H,2)} m, lebar ${c.st.params.width} m): <b>${fmt(F/1e3,0)} kN</b> ≈ berat ${fmt(F/9810,0)} ton. Dinding bawah perlu lebih tebal.`;
        const ok=res.every(r=>r.ok);if(ok&&!c.st.eng.done){c.st.eng.done=true;c.api.xp(25);c.api.toast('Profil kedalaman lolos','Ketiga zona memenuhi batas tekanan desain model.')}
        c.setEngStatus(ok?'Rancangan lolos':res.filter(r=>r.ok).length+'/3 zona sesuai');
      }},
    model:'Cairan dianggap tidak termampatkan dan massa jenis seragam. Batas zona pada tahap Rancang hanyalah target desain edukatif, bukan standar keselamatan manusia. Tekanan total memasukkan tekanan udara p₀.',
    report:()=>'Tekanan hidrostatis p = ρ·g·h.',
    createScene
  };

  function createScene(stage,ctx){
    const T=stage.THREE,root=new T.Group(),std=stage.std,L=POOL_L,H=POOL_H;
    stage.mount(root,{bg:0x0e2233,fog:[28,60],minR:6,maxR:26,view:{az:.5,el:.22,r:15.5,t:[0,-1.9,0]}});
    stage.sun.position.set(5,12,9);

    // ----- kolam -----
    const tile=stage.canvasTex(256,256,(g,w,h)=>{g.fillStyle='#bfe3ee';g.fillRect(0,0,w,h);g.strokeStyle='#8fc3d4';g.lineWidth=3;for(let i=0;i<=8;i++){g.beginPath();g.moveTo(i*w/8,0);g.lineTo(i*w/8,h);g.stroke();g.beginPath();g.moveTo(0,i*h/8);g.lineTo(w,i*h/8);g.stroke()}},[6,4]);
    const tileM=std(0xffffff,{map:tile,roughness:.45});
    const wallL=stage.mesh(new T.BoxGeometry(.3,H+.8,L+.6),tileM,0,-H/2+.15,0,root),wallR=stage.mesh(new T.BoxGeometry(.3,H+.8,L+.6),tileM,0,-H/2+.15,0,root);
    const wallB=stage.mesh(new T.BoxGeometry(1,H+.8,.3),tileM,0,-H/2+.15,-L/2-.15,root),floor=stage.mesh(new T.BoxGeometry(1,.3,L+.6),tileM,0,-H-.15,0,root);
    const ground=stage.mesh(new T.PlaneGeometry(80,80),std(0x20384a,{roughness:1}),0,-H-.31,0,root,false);ground.rotation.x=-Math.PI/2;
    // air
    const waterM=new T.MeshStandardMaterial({color:0x3aa7e8,transparent:true,opacity:.32,roughness:.08,metalness:.1,depthWrite:false});
    const water=stage.mesh(new T.BoxGeometry(1,H,L),waterM,0,-H/2,0,root,false);
    const surfG=new T.PlaneGeometry(1,L,40,16);surfG.rotateX(-Math.PI/2);
    const surfM=new T.MeshStandardMaterial({color:0x7fd0ff,transparent:true,opacity:.5,roughness:.05,metalness:.2,side:T.DoubleSide,depthWrite:false});
    const surf=stage.mesh(surfG,surfM,0,0,0,root,false);const sp0=surfG.attributes.position.array.slice();
    // lintasan & tali
    const rope=[];for(let i=0;i<24;i++){const b=stage.mesh(new T.SphereGeometry(.07,10,8),std(i%2?0xff5468:0xffffff),0,.02,L/2-.8,root,false);rope.push(b)}

    // ----- penggaris kedalaman -----
    const ruler=new T.Group();root.add(ruler);const rl=[];
    for(let i=0;i<=9;i++){
      const h=i*.5;stage.mesh(new T.BoxGeometry(.5,.035,.05),std(0xffd36c,{emissive:0x553300}),0,-h,0,ruler,false);
      const s=stage.sprite('',{w:300,h:70,size:34,bg:'rgba(6,17,30,.7)',scale:.55,depthTest:false});s.position.set(.6,-h,0);ruler.add(s);rl.push(s);
    }
    stage.mesh(new T.BoxGeometry(.04,H,.04),std(0xffd36c),0,-H/2,0,ruler,false);

    // ----- profil tekanan pada dinding -----
    const wallArrows=[];
    for(let i=0;i<9;i++){const a=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(0,-(i+.5)*.5,0),1,0xffd36c,.18,.12);root.add(a);wallArrows.push(a)}

    // ----- perenang -----
    const sw=new T.Group();root.add(sw);
    const skin=std(0xe3ad86,{roughness:.7}),suit=std(0x2b6fd6,{roughness:.55}),cap=std(0xff8a3d,{roughness:.4});
    stage.mesh(new T.SphereGeometry(.12,20,16),skin,0,0,0,sw);
    const capM=stage.mesh(new T.SphereGeometry(.13,20,12,0,Math.PI*2,0,Math.PI/1.9),cap,0,.01,0,sw);capM.rotation.z=-Math.PI/2.4;
    stage.mesh(new T.BoxGeometry(.05,.05,.2),std(0x111820),.1,.02,0,sw);
    const torso=stage.mesh(new T.CylinderGeometry(.14,.12,.62,16),suit,-.45,0,0,sw);torso.rotation.z=Math.PI/2;
    stage.mesh(new T.SphereGeometry(.125,14,12),suit,-.76,0,0,sw);
    const legs=[-1,1].map(s=>{const p=new T.Group();p.position.set(-.8,0,s*.06);sw.add(p);const m=stage.mesh(new T.CylinderGeometry(.065,.045,.85,12),skin,-.42,0,0,p);m.rotation.z=Math.PI/2;return p});
    const arms=[-1,1].map(s=>{const p=new T.Group();p.position.set(-.22,0,s*.17);sw.add(p);const m=stage.mesh(new T.CylinderGeometry(.045,.04,.78,12),skin,.38,0,0,p);m.rotation.z=Math.PI/2;return p});
    sw.position.set(.8,-.5,0);
    // panah tekanan sekeliling telinga
    const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(d=>new T.Vector3(...d));
    const earArrows=dirs.map(d=>{const a=new T.ArrowHelper(d.clone().negate(),d.clone().multiplyScalar(.9),.7,0x7eeeff,.22,.14);sw.add(a);return a});
    const earLabel=stage.sprite('',{w:360,h:84,size:36,bg:'rgba(6,17,30,.85)',scale:1.05,depthTest:false});earLabel.position.set(.1,.75,0);earLabel.renderOrder=9;sw.add(earLabel);
    // gelembung
    const BN=36,bpos=new Float32Array(BN*3),bg=new T.BufferGeometry();
    for(let i=0;i<BN;i++){bpos[i*3]=Math.random()*.3;bpos[i*3+1]=Math.random()*3;bpos[i*3+2]=(Math.random()-.5)*.2}
    bg.setAttribute('position',new T.BufferAttribute(bpos,3));
    const bubbles=new T.Points(bg,new T.PointsMaterial({color:0xffffff,size:.07,transparent:true,opacity:.7,depthWrite:false}));root.add(bubbles);

    // ----- zona rekayasa -----
    const zoneBlocks=[],zoneLabels=[],zoneCols=[0x63e3a0,0xffd36c,0xff6d83];
    for(let i=0;i<3;i++){
      zoneBlocks.push(stage.mesh(new T.BoxGeometry(1,1,L),std(zoneCols[i],{roughness:.6,transparent:true,opacity:.92}),0,-H,0,root));
      const s=stage.sprite('',{w:360,h:96,size:36,bg:'rgba(6,17,30,.85)',scale:1.05,depthTest:false});s.renderOrder=9;root.add(s);zoneLabels.push(s);
    }

    // ----- interaksi: seret perenang -----
    const plane=new T.Plane(new T.Vector3(0,0,1),0),hit=new T.Vector3();
    stage.grabbables=[sw];stage.onHover=true;
    stage.onGrab=()=>({move(e,ray){if(ray.ray.intersectPlane(plane,hit)){ctx.setParam('depth',Math.round(Math.max(0,Math.min(4.2,-hit.y))*20)/20)}}});

    let lastW=-1,lastFluid='',depthVis=.5;
    return{
      update(st,dt){
        const p=st.params,W=p.width,t=stage.time,fl=PH().fluid.FLUIDS[p.fluid],c=PH().fluid.calc(p),eng=st.phase==='rekayasa';
        if(W!==lastW){lastW=W;
          wallL.position.x=-W/2-.15;wallR.position.x=W/2+.15;wallB.scale.x=W+.6;floor.scale.x=W+.6;water.scale.x=W;surf.scale.x=W;
          ruler.position.set(-W/2+.45,0,L/2-.2);
          rope.forEach((b,i)=>b.position.x=-W/2+.3+i*(W-.6)/23);
          wallArrows.forEach(a=>a.position.x=W/2);
          zoneBlocks.forEach((b,i)=>b.scale.x=W/3);
        }
        if(p.fluid!==lastFluid){lastFluid=p.fluid;waterM.color.setHex(fl.color);surfM.color.setHex(fl.color).lerp(new T.Color(0xffffff),.35)}
        // permukaan beriak
        const sp=surfG.attributes.position;for(let i=0;i<sp.count;i++){const x=sp0[i*3],z=sp0[i*3+2];sp.setY(i,.035*Math.sin(x*5+t*1.7)*Math.cos(z*3+t*1.2)+.02*Math.sin(x*11-t*2.3))}sp.needsUpdate=true;
        // perenang
        depthVis+=(p.depth-depthVis)*(1-Math.exp(-dt*12));
        sw.visible=!eng;sw.position.set(W/2-2.6+Math.sin(t*.5)*.0,-depthVis+Math.sin(t*1.6)*.015,0);
        legs.forEach((l,i)=>l.rotation.z=Math.sin(t*5+i*Math.PI)*.22);arms.forEach((a,i)=>a.rotation.z=Math.sin(t*2.2+i*Math.PI)*.25+.05);
        // panah tekanan di telinga
        const len=.28+c.ph*3.0e-5;
        earArrows.forEach((a,i)=>{const d=dirs[i];a.visible=!!st.reveal.arrows&&!eng;a.position.copy(d).multiplyScalar(.22+len);a.setDirection(d.clone().negate());a.setLength(len,.2,.13)});
        stage.setSpriteText(earLabel,st.formula?'p = '+kp(c.ph):(p.depth<1?'tekanan kecil':p.depth<2.5?'tekanan naik':'tekanan besar'));earLabel.visible=!eng;
        // gelembung
        const bp=bg.attributes.position;for(let i=0;i<BN;i++){let y=bp.getY(i)+dt*(.5+(i%5)*.12);if(y>depthVis)y=0;bp.setY(i,y)}bp.needsUpdate=true;
        bubbles.position.set(sw.position.x+.12,sw.position.y,0);bubbles.visible=!eng&&depthVis>.15;
        // penggaris
        rl.forEach((s,i)=>stage.setSpriteText(s,st.formula?`${fmt(i*.5,1)} m · ${fmt(fl.rho*PH().G*i*.5/1e3,1)} kPa`:`${fmt(i*.5,1)} m`));
        // profil dinding
        wallArrows.forEach((a,i)=>{const h=(i+.5)*.5,len=.06+fl.rho*PH().G*h*4.4e-5;a.visible=!!st.reveal.wall;a.position.set(W/2-len,-h,0);a.setLength(len,.2,.13)});
        // zona
        zoneBlocks.forEach((b,i)=>{b.visible=eng;const d=st.eng.depths[i],hh=Math.max(.05,H-d);b.scale.y=hh;b.position.set(-W/3+i*W/3,-H+hh/2,0);
          const s=zoneLabels[i];s.visible=eng;const z=PH().fluid.ZONES[i],hmax=z.limit/(fl.rho*PH().G);s.position.set(b.position.x,1.1,0);
          stage.setSpriteText(s,`${z.name.toUpperCase()} · ${fmt(d,2)} m (maks ${fmt(hmax,2)})`,(d<=hmax+1e-9?(d>=.85*hmax?'#63e3a0':'#ffd36c'):'#ff6d83'))});
      },
      view(n){stage.setView(n==='depan'?{az:0,el:.08,r:14.5,t:[0,-2.2,0]}:{az:.5,el:.22,r:15.5,t:[0,-1.9,0]})},
      views:[{id:'serong',label:'Serong'},{id:'depan',label:'Tampak depan'}]
    };
  }
  P.pressureLabs.register(spec);
})(window);

