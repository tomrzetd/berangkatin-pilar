/* Uji asap UI Acoustic Physics (DOM/Canvas palsu): semua mode & fungsi gambar tanpa error. */
'use strict';const fs=require('fs'),vm=require('vm'),dir=require('path').join(__dirname,'..')+'/';
const uiSrc=fs.readFileSync(dir+'acoustic-physics.js','utf8');const els={};const cx=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='createRadialGradient'||k==='createLinearGradient'||k==='createConicGradient'?()=>({addColorStop(){}}):()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
const mk=id=>els[id]||(els[id]={id,value:'',textContent:'',innerHTML:'',style:{},hidden:false,dataset:{},classList:{toggle(){},add(){}},width:600,height:300,_d:1,getContext:cx,getBoundingClientRect:()=>({width:600,height:300}),querySelectorAll:()=>[],dispatchEvent(){}});
const A={ensure(){},micOn:true,src:{},ctx:{sampleRate:48000}},win={SOUNDSCOPE_MORSE_AUDIO:A,devicePixelRatio:1,PilarAcousticCore:require(dir+'acoustic-core.js'),PilarAcousticEngine:{sr:48000,on(){},stopTone(){},stopResponder(){}}};
const g={window:win,document:{getElementById:mk,querySelectorAll:()=>[],body:{classList:{toggle(){}}}},localStorage:{getItem:()=>null,setItem(){}},performance,requestAnimationFrame:f=>f(),setTimeout,Math,Float32Array,Object,Number,String,Array,JSON,Error,Promise,Event:class{},devicePixelRatio:1};
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('  ✗',m)}else console.log('  ✓',m)};ok(uiSrc.includes('id="apLiveBtn"'),'tombol Live ada di markup');ok(uiSrc.includes('acoustic-dsp-worker.js?v=4.5.1'),'DSP Worker terpasang');
try{vm.createContext(g);vm.runInContext(fs.readFileSync(dir+'acoustic-physics.js','utf8'),g);const P=win.SoundScopeAcoustic;
 mk('selWave');P.activate(true);
 for(const m of ['sonar','doppler','ranging','position']){P.setMode(m);mk('apMain');mk('apAux');mk('apRange').value='5';for(let i=0;i<3;i++)P.tick(1000+i*40)}
 P.setMode('sonar');els.apDemo.onclick();for(let i=0;i<4;i++)P.tick(performance.now()+i*300);ok(P.state.sonar?.ok&&Math.abs(P.state.sonar.distanceM-2)<.03,'demo sonar 2,00 m terbaca '+P.state.sonar?.distanceM?.toFixed(3));
 P.setMode('position');els.psDemo.onclick();P.tick(2000);ok(P.state.pos?.ok&&P.state.pos.rms<.05,'demo posisi RMS '+P.state.pos?.rms?.toFixed(3)+' m');
 P.setMode('ranging');P.state.range.last={id:'A',dt:.1,rawM:1.5,distance:1.5};P.tick(3000);ok(true,'timeline ranging tergambar');
 P.setMode('doppler');P.state.dop.vel=1.2;P.state.dop.history=[{f:2000,v:0},{f:2004,v:1}];P.tick(4000);ok(true,'gauge Doppler tergambar')}
catch(e){console.log(e.stack);fails++}
console.log(fails?'✗ '+fails+' gagal':'✓ UI Acoustic lolos');process.exit(fails?1:0);

