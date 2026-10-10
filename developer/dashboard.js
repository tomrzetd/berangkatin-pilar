(async function(){
'use strict';
const CFG=window.PILAR_PULSE_CONFIG,$=s=>document.querySelector(s);
const loginView=$('#loginView'),consoleView=$('#consoleView'),status=$('#loginStatus');
let db=null,current=null,profiles=[],messages=[],chP=null,chM=null;
const ADMIN=(CFG.ADMIN_EMAIL||'').toLowerCase(),ONLINE=CFG.ONLINE_WINDOW_MS||70000;

function isOnline(p){return Date.now()-new Date(p.last_seen).getTime()<ONLINE&&p.pulse_enabled!==false}
function esc(s){return String(s??'')}
function time(v){return new Date(v).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
function dateTime(v){return new Date(v).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}

const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
db=createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'pilar-pulse-admin-auth'}});

async function session(){
  const s=(await db.auth.getSession()).data.session;
  const u=s?.user;
  if(!u){loginView.hidden=false;consoleView.hidden=true;return}
  if((u.email||'').toLowerCase()!==ADMIN){status.textContent='Akun ini bukan developer PILAR.';await db.auth.signOut();loginView.hidden=false;consoleView.hidden=true;return}
  loginView.hidden=true;consoleView.hidden=false;await refresh();subscribe();
}
function setLoginStatus(msg,type=''){
  status.textContent=msg;status.className='status'+(type?' '+type:'');
}
function cleanAuthError(){
  const q=new URLSearchParams(location.search);
  const err=q.get('error_description')||q.get('error');
  if(err){
    const code=q.get('error_code')||'';
    const message=code==='otp_expired'
      ? 'Magic link sudah kedaluwarsa / pernah dipakai. Gunakan password atau minta link baru.'
      : decodeURIComponent(String(err).replace(/\+/g,' '));
    setLoginStatus(message,'error');
    history.replaceState({},document.title,location.pathname);
  }
}
async function passwordLogin(){
  const email=$('#emailInput').value.trim(),password=$('#passwordInput').value;
  if(!password){setLoginStatus('Masukkan password developer.','error');return}
  setLoginStatus('Memeriksa akun…');
  const r=await db.auth.signInWithPassword({email,password});
  if(r.error){setLoginStatus('Login gagal: '+r.error.message,'error');return}
  setLoginStatus('Login berhasil.','ok');
  await session();
}
$('#passwordBtn').onclick=passwordLogin;
$('#passwordInput').addEventListener('keydown',e=>{if(e.key==='Enter')passwordLogin()});
$('#loginBtn').onclick=async()=>{
  const email=$('#emailInput').value.trim();
  const cleanRedirect=location.origin+location.pathname;
  setLoginStatus('Mengirim magic link…');
  const r=await db.auth.signInWithOtp({email,options:{emailRedirectTo:cleanRedirect,shouldCreateUser:false}});
  setLoginStatus(r.error?('Gagal: '+r.error.message):'Magic link baru terkirim. Pakai email yang PALING BARU dan buka sekali saja.',r.error?'error':'ok');
};
$('#logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};
$('#refreshBtn').onclick=refresh;
$('#searchInput').oninput=renderList;

async function refresh(){
  const [p,m]=await Promise.all([
    db.from('pilar_profiles').select('*').order('last_seen',{ascending:false}).limit(500),
    db.from('pilar_messages').select('*').order('created_at',{ascending:true}).limit(2000)
  ]);
  if(p.error){console.warn(p.error);return}
  profiles=p.data||[];messages=m.data||[];renderMetrics();renderList();if(current)selectVisitor(current.user_id,false);
}
function renderMetrics(){
  $('#mTotal').textContent=profiles.length;
  $('#mOnline').textContent=profiles.filter(isOnline).length;
  $('#mUnread').textContent=messages.filter(m=>m.sender==='visitor'&&!m.read_at).length;
  $('#mApps').textContent=new Set(profiles.filter(isOnline).map(p=>p.current_app)).size;
}
function unreadFor(id){return messages.filter(m=>m.visitor_id===id&&m.sender==='visitor'&&!m.read_at).length}
function renderList(){
  const q=$('#searchInput').value.trim().toLowerCase();
  const list=profiles.filter(p=>!q||[p.public_id,p.current_app,p.device_class,p.browser,p.platform].join(' ').toLowerCase().includes(q));
  const box=$('#visitorList');box.innerHTML='';
  if(!list.length){box.innerHTML='<div class="empty-list">Belum ada visitor.</div>';return}
  for(const p of list){
    const b=document.createElement('button');b.className='visitor'+(current?.user_id===p.user_id?' active':'');
    const dot=document.createElement('span');dot.className='dot '+(isOnline(p)?'on':'');
    const mid=document.createElement('span');const st=document.createElement('strong');st.textContent=p.public_id;const sm=document.createElement('small');sm.textContent=(p.current_app||'hub')+' · '+(p.device_class||'device')+' · '+time(p.last_seen);mid.append(st,sm);
    const u=unreadFor(p.user_id),badge=document.createElement('span');badge.className='badge';badge.textContent=u?u+' baru':(isOnline(p)?'online':'offline');
    b.append(dot,mid,badge);b.onclick=()=>selectVisitor(p.user_id,true);box.appendChild(b);
  }
}
async function selectVisitor(id,mark=true){
  current=profiles.find(p=>p.user_id===id)||current;if(!current)return;
  $('#emptyState').hidden=true;$('#chatShell').hidden=false;$('#visitorName').textContent=current.public_id;
  $('#visitorMeta').textContent='Last seen '+dateTime(current.last_seen)+' · '+(current.current_app||'hub');
  $('#visitorOnline').textContent=isOnline(current)?'online':'offline';$('#visitorOnline').className='state '+(isOnline(current)?'on':'');
  const facts=[current.device_class,current.browser,current.platform,current.viewport,'touch '+current.touch_points,current.webgl?'WebGL':'no WebGL',current.webgpu?'WebGPU':'no WebGPU'].filter(Boolean);
  const fb=$('#visitorFacts');fb.innerHTML='';facts.forEach(x=>{const s=document.createElement('span');s.textContent=x;fb.appendChild(s)});
  renderMessages();
  if(mark){await db.from('pilar_messages').update({read_at:new Date().toISOString()}).eq('visitor_id',id).eq('sender','visitor').is('read_at',null);await refresh()}
  else renderList();
}
function renderMessages(){
  if(!current)return;const rows=messages.filter(m=>m.visitor_id===current.user_id),box=$('#messages');box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="empty-list">Belum ada chat.</div>';return}
  for(const m of rows){const d=document.createElement('div');d.className='msg '+m.sender;d.textContent=m.body;const t=document.createElement('time');t.textContent=time(m.created_at);d.appendChild(t);box.appendChild(d)}box.scrollTop=box.scrollHeight;
}
$('#composer').onsubmit=async e=>{e.preventDefault();if(!current)return;const i=$('#messageInput'),body=i.value.trim();if(!body)return;i.value='';const r=await db.from('pilar_messages').insert({visitor_id:current.user_id,sender:'developer',body});if(r.error)alert(r.error.message)};
function subscribe(){
  chP=db.channel('pulse-admin-profiles').on('postgres_changes',{event:'*',schema:'public',table:'pilar_profiles'},refresh).subscribe();
  chM=db.channel('pulse-admin-messages').on('postgres_changes',{event:'*',schema:'public',table:'pilar_messages'},refresh).subscribe();
}
cleanAuthError();
db.auth.onAuthStateChange(()=>setTimeout(session,0));
session();
})();