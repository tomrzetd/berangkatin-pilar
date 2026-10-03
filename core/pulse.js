(function(global){
'use strict';
const CFG=global.PILAR_PULSE_CONFIG;
if(!CFG||!CFG.SUPABASE_URL||!CFG.SUPABASE_PUBLISHABLE_KEY)return;
const LS='pilar_pulse_enabled',SS='pilar_pulse_session';
let db=null,user=null,sessionId=null,appId='hub',channel=null,heartbeat=null,ready=false;

const path=location.pathname.toLowerCase();
const appMap=[['/apps/microscope','microscope'],['/apps/rubik-orbit','rubik-orbit'],['/apps/mbg-duel','mbg-duel'],['/apps/soundscope','soundscope'],['/apps/pak-taro','pak-taro']];
for(const [p,id] of appMap)if(path.includes(p))appId=id;

function enabled(){try{return localStorage.getItem(LS)!=='0'}catch(_){return true}}
function setEnabled(v){try{localStorage.setItem(LS,v?'1':'0')}catch(_){}}
function browser(){
  const ua=navigator.userAgent;
  const m=ua.match(/Edg\/([\d]+)/)||ua.match(/Chrome\/([\d]+)/)||ua.match(/Firefox\/([\d]+)/)||ua.match(/Version\/([\d]+).*Safari/);
  const n=/Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'Browser';
  return n+(m?' '+m[1]:'');
}
function deviceClass(){
  const ua=navigator.userAgent;
  if(/Android|iPhone|iPod/i.test(ua))return 'Mobile';
  if(/iPad/i.test(ua))return 'Tablet';
  if((navigator.maxTouchPoints||0)>=5&&innerWidth>=1400)return 'IFP';
  if((navigator.maxTouchPoints||0)>0)return 'Touch desktop';
  return 'Desktop';
}
function hasWebGL(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(_){return false}}
function publicId(uid){return 'PILAR-'+uid.replace(/-/g,'').slice(0,8).toUpperCase()}
function meta(){return{
  user_id:user.id,public_id:publicId(user.id),last_seen:new Date().toISOString(),current_app:appId,
  device_class:deviceClass(),browser:browser(),platform:(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||'unknown',
  viewport:innerWidth+'×'+innerHeight,touch_points:navigator.maxTouchPoints||0,webgl:hasWebGL(),webgpu:!!navigator.gpu,pulse_enabled:true
}}
function injectUI(){
  if(document.getElementById('pilarPulseBtn'))return;
  const css=document.createElement('style');css.textContent=`
  #pilarPulseBtn{position:fixed;right:14px;bottom:14px;z-index:980;border:1px solid #31506d;background:#071321eF;color:#eaf7ff;border-radius:999px;padding:9px 12px;font:800 11px/1.2 Inter,system-ui;box-shadow:0 10px 32px #0007;cursor:pointer}
  #pilarPulseBtn.on{border-color:#3c7652;color:#caffdf}#pilarPulseBtn.off{opacity:.7}
  #pilarPulseDrawer{position:fixed;right:14px;bottom:58px;z-index:981;width:min(360px,calc(100vw - 28px));max-height:min(560px,72vh);display:none;grid-template-rows:auto 1fr auto;background:#07111df7;color:#edf7ff;border:1px solid #31506d;border-radius:18px;box-shadow:0 22px 70px #000b;overflow:hidden;font:13px/1.4 Inter,system-ui}
  #pilarPulseDrawer.open{display:grid}.pp-head{padding:13px 14px;border-bottom:1px solid #20394f;display:flex;justify-content:space-between;gap:10px}.pp-head b{color:#7eeeff}.pp-head small{display:block;color:#839bb2;margin-top:2px}.pp-head button{min-height:30px;padding:4px 8px;border-radius:9px}
  .pp-msgs{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:8px;min-height:170px}.pp-empty{color:#7f96aa;text-align:center;margin:auto}.pp-msg{max-width:88%;padding:8px 10px;border-radius:12px;background:#102033;white-space:pre-wrap;word-break:break-word}.pp-msg.me{align-self:flex-end;background:#173c31}.pp-msg.dev{align-self:flex-start}.pp-msg time{display:block;font-size:9px;color:#8ba0b5;margin-top:3px}
  .pp-form{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px;border-top:1px solid #20394f}.pp-form input{min-width:0;background:#081725;color:#eef8ff;border:1px solid #2d4965;border-radius:999px;padding:9px 12px}.pp-form button{border-radius:999px;min-height:38px;padding:7px 12px}
  #pilarPulseNotice{position:fixed;left:14px;bottom:14px;z-index:982;max-width:min(560px,calc(100vw - 28px));padding:10px 12px;border:1px solid #294861;border-radius:13px;background:#071321f4;color:#cfe0ee;font:11px/1.45 Inter,system-ui;box-shadow:0 12px 40px #0008}#pilarPulseNotice button{margin-left:7px;min-height:28px;padding:3px 8px;border-radius:8px}
  @media(max-width:700px){#pilarPulseBtn{bottom:72px}#pilarPulseDrawer{bottom:116px}}
  `;document.head.appendChild(css);
  const b=document.createElement('button');b.id='pilarPulseBtn';b.textContent='● PILAR Pulse';b.onclick=()=>drawer.classList.toggle('open');
  const drawer=document.createElement('section');drawer.id='pilarPulseDrawer';drawer.innerHTML='<div class="pp-head"><div><b>PILAR Developer</b><small id="ppIdentity">menyambungkan…</small></div><button id="ppOff">Pulse</button></div><div class="pp-msgs" id="ppMsgs"><div class="pp-empty">Belum ada pesan.</div></div><form class="pp-form" id="ppForm"><input id="ppInput" maxlength="1200" placeholder="Kirim pesan ke developer…" autocomplete="off"><button>Kirim</button></form>';
  document.body.append(b,drawer);
  drawer.querySelector('#ppOff').onclick=async()=>{if(!confirm('Nonaktifkan PILAR Pulse di browser ini?'))return;await disablePulse()};
  drawer.querySelector('#ppForm').onsubmit=async e=>{e.preventDefault();const i=drawer.querySelector('#ppInput'),txt=i.value.trim();if(!txt||!ready)return;i.value='';await sendMessage(txt)};
}
function notice(){
  try{if(localStorage.getItem('pilar_pulse_notice')==='1')return}catch(_){}
  const n=document.createElement('div');n.id='pilarPulseNotice';n.innerHTML='PILAR Pulse memakai <b>ID anonim + info perangkat dasar</b> untuk status koneksi, kompatibilitas, dan dukungan. Tidak memakai lokasi presisi atau fingerprint.<button>OK</button><button data-off>Nonaktifkan</button>';document.body.appendChild(n);
  n.querySelector('button').onclick=()=>{try{localStorage.setItem('pilar_pulse_notice','1')}catch(_){}n.remove()};
  n.querySelector('[data-off]').onclick=async()=>{setEnabled(false);n.remove();await disablePulse()};
}
function setButton(state,label){
  const b=document.getElementById('pilarPulseBtn');if(!b)return;b.classList.remove('on','off');b.classList.add(state);b.textContent=label;
}
async function auth(){
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  db=createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let s=(await db.auth.getSession()).data.session;
  if(!s){const r=await db.auth.signInAnonymously();if(r.error)throw r.error;s=r.data.session}
  user=s.user;
}
async function startSession(){
  try{sessionId=sessionStorage.getItem(SS)}catch(_){}
  if(!sessionId){sessionId=crypto.randomUUID();try{sessionStorage.setItem(SS,sessionId)}catch(_){}}
  const p=meta();
  let r=await db.from('pilar_profiles').upsert(p,{onConflict:'user_id'});
  if(r.error)throw r.error;
  r=await db.from('pilar_sessions').upsert({id:sessionId,user_id:user.id,last_seen:new Date().toISOString(),current_app:appId,page_path:location.pathname},{onConflict:'id'});
  if(r.error)throw r.error;
  ready=true;setButton('on','● PILAR Pulse');
  const id=document.getElementById('ppIdentity');if(id)id.textContent=publicId(user.id)+' · '+appId;
  await track('page_view',{title:document.title});
  await loadMessages();subscribe();
  heartbeat=setInterval(ping,CFG.HEARTBEAT_MS||25000);
}
async function ping(){
  if(!ready||document.hidden)return;
  const now=new Date().toISOString();
  await db.from('pilar_profiles').update({last_seen:now,current_app:appId,viewport:innerWidth+'×'+innerHeight}).eq('user_id',user.id);
  await db.from('pilar_sessions').update({last_seen:now,current_app:appId,page_path:location.pathname}).eq('id',sessionId);
}
async function track(name,details={}){
  if(!ready)return;
  await db.from('pilar_events').insert({user_id:user.id,session_id:sessionId,app_id:appId,event_name:name,details});
}
function renderMessages(rows){
  const box=document.getElementById('ppMsgs');if(!box)return;box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="pp-empty">Belum ada pesan. Bisa kirim ide, bug, atau sekadar say hi 👋</div>';return}
  for(const m of rows){const d=document.createElement('div');d.className='pp-msg '+(m.sender==='visitor'?'me':'dev');d.textContent=m.body;const t=document.createElement('time');t.textContent=new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});d.appendChild(t);box.appendChild(d)}
  box.scrollTop=box.scrollHeight;
}
async function loadMessages(){const r=await db.from('pilar_messages').select('id,sender,body,created_at').eq('visitor_id',user.id).order('created_at',{ascending:true}).limit(200);if(!r.error)renderMessages(r.data||[])}
async function sendMessage(body){const r=await db.from('pilar_messages').insert({visitor_id:user.id,sender:'visitor',body});if(!r.error){await track('developer_message_sent');await loadMessages()}}
function subscribe(){
  if(channel)db.removeChannel(channel);
  channel=db.channel('pulse-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'pilar_messages',filter:'visitor_id=eq.'+user.id},()=>loadMessages()).subscribe();
}
async function disablePulse(){
  setEnabled(false);ready=false;clearInterval(heartbeat);if(channel&&db)db.removeChannel(channel);
  if(db&&user)await db.from('pilar_profiles').update({pulse_enabled:false,last_seen:new Date().toISOString()}).eq('user_id',user.id);
  if(db)await db.auth.signOut();
  setButton('off','○ Pulse off');
  const id=document.getElementById('ppIdentity');if(id)id.textContent='Dinonaktifkan di browser ini';
}
async function setApp(id){if(!id||id===appId)return;appId=id;if(ready){await ping();await track('app_open')};const el=document.getElementById('ppIdentity');if(el&&user)el.textContent=publicId(user.id)+' · '+appId}
global.PILAR_PULSE={track,setApp,get publicId(){return user?publicId(user.id):null}};
document.addEventListener('pilar:ready',()=>setApp('lorentz'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)ping()});
global.addEventListener('pagehide',()=>{clearInterval(heartbeat)});
injectUI();
if(!enabled()){setButton('off','○ Pulse off');return}
notice();
auth().then(startSession).catch(err=>{console.warn('[PILAR Pulse]',err);setButton('off','○ Pulse setup');const id=document.getElementById('ppIdentity');if(id)id.textContent='Backend belum siap / Anonymous Auth belum aktif'});
})(window);
