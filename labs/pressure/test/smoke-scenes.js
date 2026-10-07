/* Smoke test tanpa browser: THREE & DOM di-mock (Proxy). Memastikan semua scene/spec berjalan tanpa
   ReferenceError/TypeError di seluruh fase. TIDAK menguji tampilan WebGL sebenarnya. */
const path=require('path'),assert=require('assert');
function mk(){const f=function(){return mk()},cache={};return new Proxy(f,{
  get(t,p){if(p===Symbol.toPrimitive)return()=>0;if(p==='count'||p==='length')return 0;if(p==='then')return undefined;if(!(p in cache))cache[p]=mk();return cache[p]},
  set(t,p,v){cache[p]=v;return true},construct(){return mk()},apply(){return mk()}})}
global.window=global;global.THREE=mk();global.document={createElement:()=>mk(),hidden:false,readyState:'complete',addEventListener(){}};
global.devicePixelRatio=1;global.addEventListener=()=>{};global.removeEventListener=()=>{};
global.window.PILAR=undefined;
const root=path.join(__dirname,'../../../apps/pressure/');
require('../physics.js');require(root+'stage.js');
['lab-solid','lab-fluid','lab-pascal','lab-drone'].forEach(f=>require(root+f+'.js'));
const P=global.PILAR,labs=P.pressureLabs.list;assert.strictEqual(labs.length,4);
const stage=P.pressureStage.create(mk());
const errs=[];const api={toast(){},xp(){},mark(){},action(id){},setParam(){},refresh(){}};
let n=0;
for(const sp of labs){
  // spesifikasi lengkap
  ['id','tab','title','defaults','look','predict','controls','reveals','missions','patterns','formula','hud','proof','eng','model','createScene'].forEach(k=>assert(sp[k]!==undefined,sp.id+' tanpa '+k));
  assert(sp.predict.options.some(o=>o.v===sp.predict.answer),sp.id+': jawaban tebak tidak ada di opsi');
  if(String(sp.studentUX||'').startsWith('natural-'))assert(sp.missions.length>=1&&sp.missions.length<=2);else assert(sp.missions.length===3);
  for(const phase of ['lihat','tebak','coba','aha','buktikan','rekayasa']){
    for(const rev of [false,true]){
      const st={phase,params:sp.defaults(),reveal:{},missions:{},eng:sp.engDefaults?sp.engDefaults():{},sim:sp.simInit?sp.simInit():{},evidence:[]};
      sp.reveals.forEach(r=>st.reveal[r.k]=rev);
      const scene=sp.createScene(stage,{getState:()=>st,setParam(){}});
      if(sp.eng.onEnter&&phase==='rekayasa')sp.eng.onEnter({st,api});
      const c={st,api,$:()=>mk(),$$:()=>[mk(),mk()],refresh(){},setEngStatus(){}};
      if(sp.eng.bind)sp.eng.bind(c);
      // jalankan parameter ekstrem
      const variants=[{}];
      for(const ct of sp.controls){
        if(ct.type==='range'){variants.push({[ct.k]:ct.min(st.params)},{[ct.k]:ct.max(st.params)})}
        else if(ct.type==='seg'){ct.options(st.params).forEach(o=>variants.push({[ct.k]:typeof st.params[ct.k]==='number'?+o.v:o.v}))}
      }
      for(const v of variants){
        const base=sp.defaults();Object.assign(st.params,base,v);
        if(sp.onParam){for(const k in v)sp.onParam(k,v[k],base[k],st,api)}
        for(let i=0;i<40;i++){sp.step&&sp.step(st,1/60);sp.check&&sp.check(st,api);scene.update(st,1/60);stage.render&&0;n++}
        const h=sp.hud(st);assert.strictEqual(h.length,4);h.forEach(x=>{assert(!/NaN|undefined|Infinity/.test(x[1]),sp.id+' HUD '+x[0]+'='+x[1]+' '+JSON.stringify(v))});
        if(phase==='rekayasa')sp.eng.update(c);
        const r=sp.proof.record(st);assert(Array.isArray(r.cells)&&r.cells.length===sp.proof.cols.length,sp.id+' kolom ledger');
        r.cells.forEach(x=>assert(!/NaN|undefined/.test(x),sp.id+' sel ledger '+x));
        st.evidence=[{id:1,cells:r.cells,data:r.data}];sp.proof.evaluate(st);
      }
      scene.view&&scene.views.forEach(v=>scene.view(v.id));
      stage.unmount();
    }
  }
  console.log('ok  scene+spec '+sp.id);
}
// aksi pascal & drone
const pp=P.pressureLabs.pascal,st=Object.assign({phase:'coba',params:pp.defaults(),reveal:{},eng:pp.engDefaults(),sim:pp.simInit(),missions:{}});
st.params.F1=500;st.params.A1=1.5;st.params.A2=300;pp.action('pump',st);for(let i=0;i<900;i++)pp.step(st,1/60);assert(st.sim.h>.5,'pascal harus terangkat, h='+st.sim.h);
pp.action('pump',st);pp.action('lower',st);for(let i=0;i<1200;i++)pp.step(st,1/60);assert(st.sim.h===0,'pascal harus turun');
const bp=P.pressureLabs.bernoulli,sb={phase:'rekayasa',params:bp.defaults(),reveal:{},eng:bp.engDefaults(),sim:bp.simInit(),missions:{}};
bp.action('test',sb);let maxY=0;for(let i=0;i<60*20;i++){bp.step(sb,1/60);maxY=Math.max(maxY,sb.sim.y)}
assert(maxY>1.5&&maxY<3.5,'uji terbang desain lolos harus mencapai ±2 m, maxY='+maxY);
console.log('ok  aksi pascal & uji terbang drone (maxY='+maxY.toFixed(2)+' m)');
console.log('\nsmoke selesai, '+n+' frame diperbarui tanpa error');

