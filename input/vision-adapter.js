(function(global){
  'use strict';
  const P = global.PILAR = global.PILAR || {};
  const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models';

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  const V = {
    enabled:false,
    stream:null,
    overlay:null,
    video:null,
    canvas:null,
    ctx:null,
    statusEl:null,
    substatusEl:null,
    progressEl:null,
    scoreEl:null,
    frameEl:null,
    startBtn:null,
    retryBtn:null,
    skipBtn:null,
    closeBtn:null,
    raf:0,
    active:false,
    smileHold:0,
    lastVideoTime:-1,
    fileset:null,
    pkg:null,
    faceLandmarker:null,
    loadPromise:null,
    capabilities:{handPose:false,faceReaction:true},

    async ensureTasks(){
      if(this.loadPromise) return this.loadPromise;
      this.loadPromise = (async()=>{
        const pkg = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
        this.pkg = pkg;
        this.fileset = await pkg.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
        return pkg;
      })();
      return this.loadPromise;
    },

    async ensureFaceLandmarker(){
      if(this.faceLandmarker) return this.faceLandmarker;
      const pkg = await this.ensureTasks();
      this.faceLandmarker = await pkg.FaceLandmarker.createFromOptions(this.fileset, {
        baseOptions:{ modelAssetPath: MODEL_BASE + '/face_landmarker/face_landmarker/float16/1/face_landmarker.task' },
        runningMode:'VIDEO',
        numFaces:1,
        outputFaceBlendshapes:false
      });
      return this.faceLandmarker;
    },

    setEnabled(v){ this.enabled = !!v; },

    ensureUI(){
      if(this.overlay) return;
      const wrap = document.createElement('section');
      wrap.className = 'vision-gate';
      wrap.innerHTML = `
        <div class="vision-gate-card" role="dialog" aria-modal="true" aria-label="Pintu masuk Vision AI">
          <div class="vision-head">
            <div>
              <div class="vision-kicker">PINTU MASUK VISION AI</div>
              <h2>Masuk dengan <span>Smile Recognition</span></h2>
              <p>Tampilkan wajah di tengah bingkai, lalu tersenyum sampai indikator penuh.</p>
            </div>
            <button class="vision-x" type="button" aria-label="Tutup">✕</button>
          </div>

          <div class="vision-layout">
            <div class="vision-camera-wrap">
              <video class="vision-video" playsinline muted autoplay></video>
              <canvas class="vision-canvas"></canvas>
              <div class="vision-frame-hint">Wireframe wajah & penanda fitur aktif</div>
            </div>

            <aside class="vision-side">
              <div class="vision-mode-badge">Vision AI · Face Smile Recognition</div>
              <div class="vision-status-box">
                <b class="vision-status">Menunggu kamera…</b>
                <span class="vision-substatus">Belum mendeteksi wajah.</span>
              </div>

              <div class="vision-meter">
                <div class="vision-meter-top"><span>Smile hold</span><b class="vision-score">0%</b></div>
                <div class="vision-meter-bar"><i></i></div>
              </div>

              <div class="vision-guide-list">
                <div><b>1</b><span>Posisikan wajah di tengah bingkai.</span></div>
                <div><b>2</b><span>Lihat ke kamera dan jaga kepala stabil.</span></div>
                <div><b>3</b><span>Tersenyum sampai progress penuh.</span></div>
              </div>

              <div class="vision-actions">
                <button class="primary" type="button" data-act="start">Aktifkan kamera</button>
                <button type="button" data-act="retry">Ulangi</button>
                <button type="button" data-act="skip">Masuk tanpa Vision</button>
              </div>
            </aside>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      this.overlay = wrap;
      this.video = wrap.querySelector('.vision-video');
      this.canvas = wrap.querySelector('.vision-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.statusEl = wrap.querySelector('.vision-status');
      this.substatusEl = wrap.querySelector('.vision-substatus');
      this.progressEl = wrap.querySelector('.vision-meter-bar i');
      this.scoreEl = wrap.querySelector('.vision-score');
      this.frameEl = wrap.querySelector('.vision-frame-hint');
      this.startBtn = wrap.querySelector('[data-act="start"]');
      this.retryBtn = wrap.querySelector('[data-act="retry"]');
      this.skipBtn = wrap.querySelector('[data-act="skip"]');
      this.closeBtn = wrap.querySelector('.vision-x');
    },

    async launchGate(){
      this.ensureUI();
      this.overlay.hidden = false;
      this.overlay.classList.add('show');
      this.smileHold = 0;
      this.lastVideoTime = -1;
      this.enabled = false;
      this.setMeter(0);
      this.status('Mode Vision siap', 'Klik Aktifkan kamera untuk memulai smile recognition.');

      return new Promise((resolve)=>{
        const finish = async(result)=>{
          this.active = false;
          cancelAnimationFrame(this.raf);
          await this.stopStream();
          this.overlay.classList.remove('show');
          await sleep(180);
          this.overlay.hidden = true;
          resolve(result);
        };
        const start = async()=>{
          this.startBtn.disabled = true;
          this.retryBtn.disabled = true;
          this.skipBtn.disabled = true;
          try{
            await this.startCamera();
            await this.ensureFaceLandmarker();
            this.status('Kamera aktif', 'Arahkan wajah ke tengah. Landmark dan smile meter sedang berjalan.');
            this.active = true;
            this.loop(finish);
          }catch(err){
            console.error(err);
            this.status('Vision AI belum aktif', err && err.message ? err.message : 'Kamera atau model gagal dimuat.');
            this.startBtn.disabled = false;
            this.retryBtn.disabled = false;
            this.skipBtn.disabled = false;
          }
        };
        this.startBtn.onclick = start;
        this.retryBtn.onclick = async()=>{
          cancelAnimationFrame(this.raf);
          await this.stopStream();
          this.smileHold = 0;
          this.setMeter(0);
          this.status('Diulang', 'Klik Aktifkan kamera untuk mencoba lagi.');
          this.startBtn.disabled = false;
          this.retryBtn.disabled = false;
          this.skipBtn.disabled = false;
        };
        this.skipBtn.onclick = ()=>finish({ enabled:false, via:'skip' });
        this.closeBtn.onclick = ()=>finish({ enabled:false, via:'close' });
      });
    },

    async startCamera(){
      await this.stopStream();
      this.stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:'user', width:{ ideal:960 }, height:{ ideal:540 } },
        audio:false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      await new Promise(r=>{
        if(this.video.readyState >= 2) return r();
        this.video.onloadeddata = ()=>r();
      });
      this.resizeCanvas();
      global.addEventListener('resize', this._onResize || (this._onResize = ()=>this.resizeCanvas()));
    },

    async stopStream(){
      if(this.stream){ this.stream.getTracks().forEach(t=>t.stop()); }
      this.stream = null;
      if(this.video) this.video.srcObject = null;
      if(this.ctx && this.canvas) this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    },

    resizeCanvas(){
      if(!this.video || !this.canvas) return;
      const rect = this.video.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.setTransform(1,0,0,1,0,0);
      this.ctx.scale(dpr,dpr);
    },

    status(title, subtitle){
      if(this.statusEl) this.statusEl.textContent = title;
      if(this.substatusEl) this.substatusEl.textContent = subtitle;
    },

    setMeter(t){
      const pct = Math.round(clamp(t,0,1) * 100);
      if(this.progressEl) this.progressEl.style.width = pct + '%';
      if(this.scoreEl) this.scoreEl.textContent = pct + '%';
    },

    smileProgress(lm){
      const faceWidth = dist(lm[234], lm[454]);
      const mouthWidth = dist(lm[61], lm[291]);
      const mouthOpen = dist(lm[13], lm[14]);
      const smileRatio = mouthWidth / Math.max(faceWidth, 1e-4);
      const openRatio = mouthOpen / Math.max(faceWidth, 1e-4);
      const smileScore = clamp((smileRatio - 0.33) / 0.09, 0, 1);
      const openScore = clamp((openRatio - 0.012) / 0.028, 0, 1);
      return {
        ratio: smileRatio,
        openness: openRatio,
        progress: clamp(smileScore * 0.78 + openScore * 0.22, 0, 1)
      };
    },

    drawGuides(face){
      const ctx = this.ctx;
      const w = this.canvas.width / (Math.min(global.devicePixelRatio || 1,2));
      const h = this.canvas.height / (Math.min(global.devicePixelRatio || 1,2));
      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(94,233,255,.95)';
      ctx.fillStyle = 'rgba(201,255,66,.85)';

      // Static guide oval
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.setLineDash([10,8]);
      ctx.beginPath();
      ctx.ellipse(w*0.5, h*0.44, w*0.18, h*0.28, 0, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(94,233,255,.95)';

      if(!face) {
        ctx.restore();
        return;
      }

      const groups = [
        [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],
        [33,160,158,133,153,144,33],
        [362,385,387,263,373,380,362],
        [70,63,105,66,107],
        [336,296,334,293,300],
        [168,6,197,195,5,4,1,19,94,2,164],
        [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146,61]
      ];
      groups.forEach(group=>{
        ctx.beginPath();
        group.forEach((idx,i)=>{
          const p=face[idx]; if(!p) return;
          const x = p.x * w, y = p.y * h;
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.stroke();
      });

      const features = { leftEye:159, rightEye:386, nose:1, mouth:13, leftCorner:61, rightCorner:291 };
      Object.values(features).forEach(idx=>{
        const p = face[idx]; if(!p) return;
        const x = p.x * w, y = p.y * h;
        ctx.beginPath();
        ctx.arc(x,y,3.5,0,Math.PI*2);
        ctx.fill();
      });
      ctx.restore();
    },

    loop(finish){
      if(!this.active) return;
      this.raf = requestAnimationFrame(()=>this.loop(finish));
      if(!this.video || this.video.readyState < 2) return;
      if(this.video.currentTime === this.lastVideoTime) return;
      this.lastVideoTime = this.video.currentTime;
      const faceLandmarker = this.faceLandmarker;
      if(!faceLandmarker) return;
      const result = faceLandmarker.detectForVideo(this.video, performance.now());
      const face = result.faceLandmarks && result.faceLandmarks[0];
      this.drawGuides(face);
      if(!face){
        this.smileHold = Math.max(0, this.smileHold - 0.03);
        this.setMeter(this.smileHold);
        this.status('Mencari wajah…', 'Posisikan wajah di tengah bingkai dan beri pencahayaan yang cukup.');
        return;
      }
      const score = this.smileProgress(face);
      const strongSmile = score.progress > 0.68;
      if(strongSmile) this.smileHold = clamp(this.smileHold + 0.05 + score.progress * 0.03, 0, 1);
      else this.smileHold = Math.max(0, this.smileHold - 0.02);
      this.setMeter(this.smileHold);
      const pct = Math.round(score.progress * 100);
      this.status('Wajah terdeteksi', strongSmile ? 'Bagus, senyumnya tertangkap. Tahan sebentar lagi…' : 'Tersenyum sedikit lebih lebar agar progress naik.');
      this.frameEl.textContent = `Landmark aktif · smile score ${pct}%`;
      if(this.smileHold >= 0.999){
        this.setMeter(1);
        this.status('Akses diterima', 'Smile recognition berhasil. Membuka simulasi PILAR…');
        this.enabled = true;
        this.active = false;
        setTimeout(()=>finish({ enabled:true, via:'smile' }), 650);
      }
    }
  };

  P.vision = V;
})(window);
