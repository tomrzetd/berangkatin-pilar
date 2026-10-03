(function(global){
  'use strict';
  const P = global.PILAR = global.PILAR || {};
  const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models';

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function dist(a,b){ const dx=a.x-b.x,dy=a.y-b.y; return Math.hypot(dx,dy); }
  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  const HAND_CONNECTIONS=[
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
  ];

  const V={
    enabled:false,stream:null,overlay:null,video:null,canvas:null,ctx:null,
    statusEl:null,substatusEl:null,progressEl:null,scoreEl:null,frameEl:null,
    titleEl:null,introEl:null,badgeEl:null,meterLabelEl:null,guideEl:null,
    startBtn:null,retryBtn:null,skipBtn:null,closeBtn:null,
    raf:0,active:false,lastVideoTime:-1,fileset:null,pkg:null,
    faceLandmarker:null,handLandmarker:null,loadPromise:null,
    challengeType:'face-sequence',appTitle:'PILAR',
    faceStage:0,seriousHold:0,smileHold:0,
    handTargetIndex:0,handTargets:null,pinchPrev:false,
    capabilities:{handPose:true,faceReaction:true},

    async ensureTasks(){
      if(this.loadPromise)return this.loadPromise;
      this.loadPromise=(async()=>{
        const pkg=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
        this.pkg=pkg;
        this.fileset=await pkg.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        return pkg;
      })();
      return this.loadPromise;
    },

    async ensureFaceLandmarker(){
      if(this.faceLandmarker)return this.faceLandmarker;
      const pkg=await this.ensureTasks();
      this.faceLandmarker=await pkg.FaceLandmarker.createFromOptions(this.fileset,{
        baseOptions:{modelAssetPath:MODEL_BASE+'/face_landmarker/face_landmarker/float16/1/face_landmarker.task'},
        runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:false
      });
      return this.faceLandmarker;
    },

    async ensureHandLandmarker(){
      if(this.handLandmarker)return this.handLandmarker;
      const pkg=await this.ensureTasks();
      this.handLandmarker=await pkg.HandLandmarker.createFromOptions(this.fileset,{
        baseOptions:{modelAssetPath:MODEL_BASE+'/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'},
        runningMode:'VIDEO',numHands:1
      });
      return this.handLandmarker;
    },

    setEnabled(v){this.enabled=!!v;},

    chooseChallenge(appId,requested='auto'){
      if(requested&&requested!=='auto')return requested;
      const key='pilar-vision-last-'+(appId||'pilar');
      let last='';
      try{last=sessionStorage.getItem(key)||''}catch(_){}
      let next;
      if(last==='face-sequence')next='hand-puzzle';
      else if(last==='hand-puzzle')next='face-sequence';
      else{
        const sum=[...(appId||'pilar')].reduce((a,ch)=>a+ch.charCodeAt(0),0);
        next=sum%2?'face-sequence':'hand-puzzle';
      }
      try{sessionStorage.setItem(key,next)}catch(_){}
      return next;
    },

    ensureUI(){
      if(this.overlay)return;
      const wrap=document.createElement('section');
      wrap.className='vision-gate';
      wrap.innerHTML=`
        <div class="vision-gate-card" role="dialog" aria-modal="true" aria-label="PILAR Vision Challenge">
          <div class="vision-head">
            <div>
              <div class="vision-kicker">PILAR VISION CHALLENGE</div>
              <h2>Masuk lewat <span class="vision-challenge-title">Vision AI</span></h2>
              <p class="vision-challenge-intro">Selesaikan challenge ringan untuk membuka app.</p>
            </div>
            <button class="vision-x" type="button" aria-label="Tutup">✕</button>
          </div>

          <div class="vision-layout">
            <div class="vision-camera-wrap">
              <video class="vision-video" playsinline muted autoplay></video>
              <canvas class="vision-canvas"></canvas>
              <div class="vision-frame-hint">Kamera belum aktif</div>
            </div>

            <aside class="vision-side">
              <div class="vision-mode-badge">Vision AI</div>
              <div class="vision-status-box">
                <b class="vision-status">Menunggu kamera…</b>
                <span class="vision-substatus">Klik Aktifkan kamera untuk mulai.</span>
              </div>

              <div class="vision-meter">
                <div class="vision-meter-top"><span class="vision-meter-label">Progress</span><b class="vision-score">0%</b></div>
                <div class="vision-meter-bar"><i></i></div>
              </div>

              <div class="vision-guide-list"></div>

              <div class="vision-actions">
                <button class="primary" type="button" data-act="start">Aktifkan kamera</button>
                <button type="button" data-act="retry">Ulangi</button>
                <button type="button" data-act="skip">Kembali / Masuk Cepat</button>
              </div>
            </aside>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      this.overlay=wrap;
      this.video=wrap.querySelector('.vision-video');
      this.canvas=wrap.querySelector('.vision-canvas');
      this.ctx=this.canvas.getContext('2d');
      this.statusEl=wrap.querySelector('.vision-status');
      this.substatusEl=wrap.querySelector('.vision-substatus');
      this.progressEl=wrap.querySelector('.vision-meter-bar i');
      this.scoreEl=wrap.querySelector('.vision-score');
      this.frameEl=wrap.querySelector('.vision-frame-hint');
      this.titleEl=wrap.querySelector('.vision-challenge-title');
      this.introEl=wrap.querySelector('.vision-challenge-intro');
      this.badgeEl=wrap.querySelector('.vision-mode-badge');
      this.meterLabelEl=wrap.querySelector('.vision-meter-label');
      this.guideEl=wrap.querySelector('.vision-guide-list');
      this.startBtn=wrap.querySelector('[data-act="start"]');
      this.retryBtn=wrap.querySelector('[data-act="retry"]');
      this.skipBtn=wrap.querySelector('[data-act="skip"]');
      this.closeBtn=wrap.querySelector('.vision-x');
    },

    configureChallenge(type,appTitle){
      this.challengeType=type;
      this.appTitle=appTitle||'PILAR';
      this.faceStage=0;this.seriousHold=0;this.smileHold=0;
      this.handTargetIndex=0;this.pinchPrev=false;
      this.handTargets=[
        {x:.26,y:.30,label:'1'},
        {x:.70,y:.42,label:'2'},
        {x:.46,y:.72,label:'3'}
      ];
      this.setMeter(0);

      if(type==='hand-puzzle'){
        this.titleEl.textContent='Hand Puzzle';
        this.introEl.textContent='Gunakan telunjuk dan ibu jari untuk mencubit tiga target secara berurutan sebelum '+this.appTitle+' terbuka.';
        this.badgeEl.textContent='Vision AI · Hand Landmark';
        this.meterLabelEl.textContent='Target selesai';
        this.guideEl.innerHTML='<div><b>1</b><span>Tunjukkan satu tangan ke kamera.</span></div><div><b>2</b><span>Arahkan ujung telunjuk ke target bercahaya.</span></div><div><b>3</b><span>Satukan telunjuk + ibu jari (pinch) untuk mengambil target.</span></div>';
        this.frameEl.textContent='Hand wireframe + pinch cursor aktif setelah kamera dimulai';
      }else{
        this.titleEl.textContent='Serius → Senyum';
        this.introEl.textContent='Mainkan dua pose: tahan wajah serius sebentar, lalu ubah menjadi senyum sampai meter penuh.';
        this.badgeEl.textContent='Vision AI · Face Landmark';
        this.meterLabelEl.textContent='Drama challenge';
        this.guideEl.innerHTML='<div><b>1</b><span>Posisikan wajah di tengah bingkai.</span></div><div><b>2</b><span>Tahan pose serius / tanpa senyum sebentar.</span></div><div><b>3</b><span>Lalu tersenyum lebar sampai akses terbuka.</span></div>';
        this.frameEl.textContent='Landmark wajah lokal · bukan penilaian emosi';
      }
    },

    async launchGate(options={}){
      this.ensureUI();
      const type=this.chooseChallenge(options.appId||'pilar',options.challenge||'auto');
      this.configureChallenge(type,options.appTitle||'PILAR');
      this.overlay.hidden=false;
      this.overlay.classList.add('show');
      this.lastVideoTime=-1;
      this.enabled=false;
      this.status('Challenge siap','Klik Aktifkan kamera. Video diproses lokal di perangkat dan tidak diunggah.');

      return new Promise(resolve=>{
        let finished=false;
        const finish=async(result)=>{
          if(finished)return;finished=true;
          this.active=false;
          cancelAnimationFrame(this.raf);
          await this.stopStream();
          this.overlay.classList.remove('show');
          await sleep(180);
          this.overlay.hidden=true;
          resolve({...result,challenge:type});
        };
        const start=async()=>{
          this.startBtn.disabled=true;this.retryBtn.disabled=true;this.skipBtn.disabled=true;
          try{
            await this.startCamera();
            if(type==='hand-puzzle')await this.ensureHandLandmarker();
            else await this.ensureFaceLandmarker();
            this.status('Kamera aktif',type==='hand-puzzle'?'Cari target pertama lalu pinch.':'Mulai dengan pose serius / tanpa senyum.');
            this.active=true;
            this.loop(finish);
          }catch(err){
            console.error(err);
            this.status('Vision Challenge belum aktif',err?.message||'Kamera atau model gagal dimuat.');
            this.startBtn.disabled=false;this.retryBtn.disabled=false;this.skipBtn.disabled=false;
          }
        };
        this.startBtn.onclick=start;
        this.retryBtn.onclick=async()=>{
          cancelAnimationFrame(this.raf);this.active=false;
          await this.stopStream();
          this.configureChallenge(type,options.appTitle||'PILAR');
          this.status('Challenge diulang','Klik Aktifkan kamera untuk mencoba lagi.');
          this.startBtn.disabled=false;this.retryBtn.disabled=false;this.skipBtn.disabled=false;
        };
        this.skipBtn.onclick=()=>finish({enabled:false,via:'back'});
        this.closeBtn.onclick=()=>finish({enabled:false,via:'close'});
      });
    },

    async startCamera(){
      await this.stopStream();
      this.stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:'user',width:{ideal:960},height:{ideal:540}},audio:false
      });
      this.video.srcObject=this.stream;
      await this.video.play();
      await new Promise(r=>{
        if(this.video.readyState>=2)return r();
        this.video.onloadeddata=()=>r();
      });
      this.resizeCanvas();
      global.addEventListener('resize',this._onResize||(this._onResize=()=>this.resizeCanvas()));
    },

    async stopStream(){
      if(this.stream)this.stream.getTracks().forEach(t=>t.stop());
      this.stream=null;
      if(this.video)this.video.srcObject=null;
      if(this.ctx&&this.canvas){
        const dpr=Math.min(global.devicePixelRatio||1,2);
        this.ctx.clearRect(0,0,this.canvas.width/dpr,this.canvas.height/dpr);
      }
    },

    resizeCanvas(){
      if(!this.video||!this.canvas)return;
      const rect=this.video.getBoundingClientRect();
      const dpr=Math.min(global.devicePixelRatio||1,2);
      this.canvas.width=Math.max(1,Math.round(rect.width*dpr));
      this.canvas.height=Math.max(1,Math.round(rect.height*dpr));
      this.canvas.style.width=rect.width+'px';
      this.canvas.style.height=rect.height+'px';
      this.ctx.setTransform(1,0,0,1,0,0);
      this.ctx.scale(dpr,dpr);
    },

    status(title,subtitle){
      if(this.statusEl)this.statusEl.textContent=title;
      if(this.substatusEl)this.substatusEl.textContent=subtitle;
    },

    setMeter(t){
      const pct=Math.round(clamp(t,0,1)*100);
      if(this.progressEl)this.progressEl.style.width=pct+'%';
      if(this.scoreEl)this.scoreEl.textContent=pct+'%';
    },

    smileProgress(lm){
      const faceWidth=dist(lm[234],lm[454]);
      const mouthWidth=dist(lm[61],lm[291]);
      const mouthOpen=dist(lm[13],lm[14]);
      const smileRatio=mouthWidth/Math.max(faceWidth,1e-4);
      const openRatio=mouthOpen/Math.max(faceWidth,1e-4);
      const smileScore=clamp((smileRatio-.33)/.09,0,1);
      const openScore=clamp((openRatio-.012)/.028,0,1);
      return clamp(smileScore*.78+openScore*.22,0,1);
    },

    canvasSize(){
      const dpr=Math.min(global.devicePixelRatio||1,2);
      return {w:this.canvas.width/dpr,h:this.canvas.height/dpr};
    },

    drawFace(face){
      const ctx=this.ctx,{w,h}=this.canvasSize();
      ctx.clearRect(0,0,w,h);ctx.save();
      ctx.lineWidth=1.5;ctx.strokeStyle='rgba(94,233,255,.95)';ctx.fillStyle='rgba(201,255,66,.9)';
      ctx.setLineDash([10,8]);ctx.strokeStyle='rgba(255,255,255,.25)';
      ctx.beginPath();ctx.ellipse(w*.5,h*.44,w*.18,h*.28,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      if(face){
        ctx.strokeStyle='rgba(94,233,255,.95)';
        const groups=[
          [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],
          [33,160,158,133,153,144,33],[362,385,387,263,373,380,362],
          [168,6,197,195,5,4,1,19,94,2,164],
          [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146,61]
        ];
        groups.forEach(group=>{
          ctx.beginPath();
          group.forEach((idx,i)=>{
            const p=face[idx];if(!p)return;
            const x=p.x*w,y=p.y*h;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          });ctx.stroke();
        });
        [159,386,1,13,61,291].forEach(idx=>{
          const p=face[idx];if(!p)return;
          ctx.beginPath();ctx.arc(p.x*w,p.y*h,3.5,0,Math.PI*2);ctx.fill();
        });
      }
      ctx.restore();
    },

    drawHand(hand){
      const ctx=this.ctx,{w,h}=this.canvasSize();
      ctx.clearRect(0,0,w,h);ctx.save();
      this.handTargets.forEach((t,i)=>{
        const active=i===this.handTargetIndex,done=i<this.handTargetIndex;
        ctx.beginPath();ctx.arc(t.x*w,t.y*h,active?25:18,0,Math.PI*2);
        ctx.fillStyle=done?'rgba(99,227,160,.55)':active?'rgba(201,255,66,.24)':'rgba(126,238,255,.10)';
        ctx.fill();
        ctx.lineWidth=active?4:2;
        ctx.strokeStyle=done?'#63e3a0':active?'#c9ff42':'rgba(126,238,255,.5)';
        ctx.stroke();
        ctx.fillStyle=active?'#c9ff42':'#c7d9e8';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(done?'✓':t.label,t.x*w,t.y*h);
      });
      if(hand){
        ctx.strokeStyle='rgba(94,233,255,.9)';ctx.lineWidth=2;
        HAND_CONNECTIONS.forEach(([a,b])=>{
          const p=hand[a],q=hand[b];if(!p||!q)return;
          ctx.beginPath();ctx.moveTo(p.x*w,p.y*h);ctx.lineTo(q.x*w,q.y*h);ctx.stroke();
        });
        hand.forEach((p,i)=>{
          ctx.beginPath();ctx.arc(p.x*w,p.y*h,i===8||i===4?5:2.5,0,Math.PI*2);
          ctx.fillStyle=i===8?'#c9ff42':i===4?'#ff8bd1':'rgba(255,255,255,.75)';ctx.fill();
        });
      }
      ctx.restore();
    },

    loop(finish){
      if(!this.active)return;
      this.raf=requestAnimationFrame(()=>this.loop(finish));
      if(!this.video||this.video.readyState<2)return;
      if(this.video.currentTime===this.lastVideoTime)return;
      this.lastVideoTime=this.video.currentTime;

      if(this.challengeType==='hand-puzzle')this.handLoop(finish);
      else this.faceLoop(finish);
    },

    faceLoop(finish){
      if(!this.faceLandmarker)return;
      const result=this.faceLandmarker.detectForVideo(this.video,performance.now());
      const face=result.faceLandmarks&&result.faceLandmarks[0];
      this.drawFace(face);
      if(!face){
        this.status('Mencari wajah…','Posisikan wajah di tengah dan beri pencahayaan yang cukup.');
        return;
      }
      const smile=this.smileProgress(face);
      if(this.faceStage===0){
        const serious=smile<.28;
        this.seriousHold=serious?clamp(this.seriousHold+.055,0,1):Math.max(0,this.seriousHold-.035);
        this.setMeter(this.seriousHold*.5);
        this.frameEl.textContent='Stage 1/2 · no-smile score '+Math.round((1-smile)*100)+'%';
        this.status('Stage 1 · Pose serius',serious?'Bagus, tahan sedikit lagi…':'Kurangi senyum sebentar untuk menyelesaikan pose pertama.');
        if(this.seriousHold>=.999){
          this.faceStage=1;this.smileHold=0;
          this.status('Stage 2 · Sekarang senyum!','Ubah pose menjadi senyum dan tahan sampai penuh.');
        }
        return;
      }
      const strong=smile>.68;
      this.smileHold=strong?clamp(this.smileHold+.055+smile*.025,0,1):Math.max(0,this.smileHold-.025);
      this.setMeter(.5+this.smileHold*.5);
      this.frameEl.textContent='Stage 2/2 · smile geometry '+Math.round(smile*100)+'%';
      this.status('Stage 2 · Senyum',strong?'Mantap! Tahan sebentar lagi…':'Lebarkan senyum sedikit lagi.');
      if(this.smileHold>=.999){
        this.enabled=true;this.active=false;this.setMeter(1);
        this.status('Challenge selesai 🎉',this.appTitle+' siap dibuka.');
        setTimeout(()=>finish({enabled:true,via:'face-sequence'}),650);
      }
    },

    handLoop(finish){
      if(!this.handLandmarker)return;
      const result=this.handLandmarker.detectForVideo(this.video,performance.now());
      const hand=result.landmarks&&result.landmarks[0];
      this.drawHand(hand);
      if(!hand){
        this.pinchPrev=false;
        this.status('Mencari tangan…','Tunjukkan satu tangan penuh ke kamera.');
        return;
      }
      const palm=Math.max(dist(hand[5],hand[17]),1e-4);
      const pinch=dist(hand[4],hand[8])/palm<.42;
      const idx=hand[8],target=this.handTargets[this.handTargetIndex];
      const near=target&&Math.hypot(idx.x-target.x,idx.y-target.y)<.11;
      this.frameEl.textContent='Hand landmark aktif · '+(pinch?'PINCH':'open')+' · target '+Math.min(this.handTargetIndex+1,3)+'/3';
      this.status('Hand Puzzle',near?(pinch?'Target tertangkap!':'Pinch sekarang ✨'):'Arahkan telunjuk ke target bercahaya.');
      if(pinch&&!this.pinchPrev&&near){
        this.handTargetIndex++;
        this.setMeter(this.handTargetIndex/this.handTargets.length);
        if(this.handTargetIndex>=this.handTargets.length){
          this.enabled=true;this.active=false;
          this.status('Puzzle selesai 🎉',this.appTitle+' siap dibuka.');
          setTimeout(()=>finish({enabled:true,via:'hand-puzzle'}),650);
          return;
        }
      }
      this.pinchPrev=pinch;
    }
  };

  P.vision=V;
})(window);
