/* Uji model Lab Baterai: node apps/baterai-lab/test-model.js */
const M=require('./model.js');let fail=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)fail++};
const mm=t=>t==null?'—':t<90?Math.round(t)+' mnt':(t/60).toFixed(1)+' jam';
console.log('Balapan cas (HP 19 Wh, 25°C, tanpa pendingin):');
const hp={};for(const P of M.DEV.hp.chargers){const r=M.charge({dev:'hp',P,Tamb:25,cool:'none'});hp[P]=r;console.log('  '+P+' W → 80% '+mm(r.t80)+' · penuh '+mm(r.t100)+' · Tmax '+r.Tmax.toFixed(1)+'°C · umur ±'+r.lifeCycles+' siklus'+(r.throttle?' · BMS memperlambat':''))}
ok(hp[10].t100>90&&hp[10].t100<200,'10 W penuh dalam 1,5–3,3 jam (realistis)');
ok(hp[65].t80<30,'65 W sampai 80% < 30 menit');
ok(hp[65].lifeCycles<hp[10].lifeCycles*.7,'cas cepat → umur lebih pendek');
ok(hp[65].t100-hp[65].t80>hp[65].t80*.5,'melambat setelah 80% (fase CV terlihat)');
const hot=M.charge({dev:'hp',P:65,Tamb:38,cool:'none'}),cold=M.charge({dev:'hp',P:65,Tamb:5,cool:'none'}),cooled=M.charge({dev:'hp',P:65,Tamb:25,cool:'liquid'});
console.log('  panas 38°C: Tmax '+hot.Tmax.toFixed(1)+' throttle '+hot.throttle+' umur '+hot.lifeCycles+' | dingin 5°C: 80% '+mm(cold.t80)+' coldLimit '+cold.coldLimit+' umur '+cold.lifeCycles+' | pendingin: Tmax '+cooled.Tmax.toFixed(1)+' umur '+cooled.lifeCycles);
ok(hot.Tmax>40&&hot.throttle,'cuaca panas → >40°C dan BMS memperlambat');
ok(cold.coldLimit&&cold.t80>hp[65].t80*2,'cuaca dingin → BMS memperlambat cas');
ok(cooled.lifeCycles>hp[65].lifeCycles,'pendingin memperpanjang umur');
console.log('Mobil listrik 60 kWh (pendingin cair, 25°C):');
const ev={};for(const P of M.DEV.ev.chargers){const r=M.charge({dev:'ev',P,Tamb:25,cool:'liquid'});ev[P]=r;console.log('  '+P/1000+' kW → 80% '+mm(r.t80)+' · penuh '+mm(r.t100)+' · Tmax '+r.Tmax.toFixed(1)+'°C · umur ±'+r.lifeCycles)}
ok(ev[7000].t100>6*60&&ev[7000].t100<10*60,'7 kW di rumah: 6–10 jam');
ok(ev[150000].t80>12&&ev[150000].t80<35,'150 kW: 10→80% dalam 12–35 menit');
console.log('Rancang baterai — cari desain yang lolos untuk tiap klien:');
for(const id of Object.keys(M.CLIENTS)){const K=M.CLIENTS[id];let wins=[],n=0;
 for(const chem of ['nmc','lfp'])for(let s=K.size.min;s<=K.size.max+1e-9;s+=K.size.step)for(const speed of ['slow','mid','fast'])for(const cool of ['none','sink','liquid'])for(const limit80 of [false,true]){n++;const r=M.design(id,{chem,size:+s.toFixed(2),speed,cool,limit80});if(r.ok)wins.push([chem,+s.toFixed(2),speed,cool,limit80])}
 const def=M.design(id,{chem:'nmc',size:K.size.def,speed:'mid',cool:'none',limit80:false});
 console.log('  '+K.name+': '+wins.length+'/'+n+' desain lolos · contoh '+JSON.stringify(wins[0])+' · desain awal lolos? '+def.ok+' ('+def.checks.filter(c=>!c.ok).map(c=>c.label).join(', ')+')');
 ok(wins.length>0&&wins.length<n*.25,K.name+': ada solusi tapi tidak terlalu mudah');
 ok(!def.ok,K.name+': desain awal belum lolos (siswa harus berpikir)');}
const chems=id=>new Set(Object.keys(M.CHEM).filter(c=>{const K=M.CLIENTS[id];for(let s=K.size.min;s<=K.size.max;s+=K.size.step)for(const sp of ['slow','mid','fast'])for(const co of ['none','sink','liquid'])for(const l of [0,1])if(M.design(id,{chem:c,size:s,speed:sp,cool:co,limit80:!!l}).ok)return true;return false}));
console.log('  kimia yang bisa menang → HP:',[...chems('hp')],'· motor:',[...chems('motor')],'· bus:',[...chems('bus')]);
ok(!chems('bus').has('nmc'),'bus sekolah: hanya LFP yang cukup aman/awet (pelajaran trade-off)');
ok(chems('hp').has('nmc'),'HP gamer: NMC (ringan) bisa menang');
console.log(fail?'\n✗ '+fail+' gagal':'\n✓ semua uji model lolos');process.exit(fail?1:0);
