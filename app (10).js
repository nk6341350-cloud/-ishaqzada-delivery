const SUPABASE_URL='https://ejsittccdckyiphiazwr.supabase.co';
const SUPABASE_KEY='sb_publishable_OMeUCfZRbVA3lzdRty2wuw_t1Q5_xEc';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const provinces=['کندهار','کابل','هرات','بلخ','ننګرهار','هلمند','غزني','فراه','نیمروز','زابل','ارزګان','پکتیا','پکتیکا','خوست','کندز','تخار','بدخشان','بغلان','سمنګان','سرپل','جوزجان','فاریاب','بادغیس','غور','دایکندي','بامیان','پروان','کاپیسا','پنجشېر','لغمان','کونړ','نورستان','لوګر','میدان وردګ'];
const roleNames={admin:'اډمین',agent:'شاګرد',dispatcher:'د لېږلو مسؤل'};
const statusNames={registered:'ثبت شوی',sent:'ولېږل شو',delivered:'تسلیم شو'};
// Compatibility polyfills for older Android browsers.
if(!Object.fromEntries){Object.fromEntries=function(entries){var o={};for(var i=0;i<entries.length;i++)o[entries[i][0]]=entries[i][1];return o}}
if(!window.crypto)window.crypto={};
if(!window.crypto.randomUUID){window.crypto.randomUUID=function(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}}

let session=null,profile=null,currentOrders=[],editingPhoto=null;

function show(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id))}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2800)}
function busy(form,on){const b=form.querySelector('button[type=submit]');if(b)b.disabled=on}
function phone(v){let p=(v||'').replace(/\D/g,'');if(p.startsWith('0093'))p='0'+p.slice(4);else if(p.startsWith('93'))p='0'+p.slice(2);if(p.length===9&&!p.startsWith('0'))p='0'+p;return p}
function emailFor(p){return `${p}@ishaqzada.delivery`}
function passwordFor(p,pin){return `IFC!${pin}${p.slice(-2)}`}

/* Login compatibility fix for old/new Android + iPhone.
   No orders, reports, admin, registration, database schema, or PIN values are changed. */
function loginDigits(v){
  return String(v == null ? '' : v)
    .replace(/[۰-۹]/g,function(c){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)})
    .replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c)})
    .replace(/\s+/g,'');
}
function loginPhone(v){ return phone(loginDigits(v)); }

function authLoginXHR(email,password){
  return new Promise(function(resolve,reject){
    try{
      var x=new XMLHttpRequest();
      x.open('POST',SUPABASE_URL+'/auth/v1/token?grant_type=password',true);
      x.setRequestHeader('Content-Type','application/json;charset=UTF-8');
      x.setRequestHeader('apikey',SUPABASE_KEY);
      x.timeout=15000;
      x.onreadystatechange=function(){
        if(x.readyState!==4)return;
        var body={};
        try{body=JSON.parse(x.responseText||'{}')}catch(_){}
        if(x.status>=200&&x.status<300)return resolve(body);
        reject(new Error(body.msg||body.message||body.error_description||body.error||('HTTP '+x.status)));
      };
      x.onerror=function(){reject(new Error('Network request failed'))};
      x.ontimeout=function(){reject(new Error('Network timeout'))};
      x.send(JSON.stringify({email:email,password:password}));
    }catch(err){reject(err)}
  });
}
async function compatibleLogin(p,pin){
  var email=emailFor(p), password=passwordFor(p,pin);
  try{
    var result=await Promise.race([
      db.auth.signInWithPassword({email:email,password:password}),
      new Promise(function(_,reject){setTimeout(function(){reject(new Error('Network timeout'))},12000)})
    ]);
    if(result && !result.error && result.data && result.data.session)return result.data;
    if(result && result.error && !/network|fetch|timeout/i.test(result.error.message||''))throw result.error;
  }catch(err){
    if(!/network|fetch|timeout|load/i.test(err.message||String(err)))throw err;
  }
  var raw=await authLoginXHR(email,password);
  if(!raw.access_token || !raw.refresh_token)throw new Error('Login session not returned');
  var set=await db.auth.setSession({access_token:raw.access_token,refresh_token:raw.refresh_token});
  if(set.error)throw set.error;
  return set.data;
}

function ext(file){return (file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')}
function weekDate(value=new Date()){const d=new Date(value);const day=(d.getDay()+1)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d}
function weekStart(){return weekDate().toISOString()}
function number(v){return Number(v||0).toLocaleString('en-US')}
function kabulParts(value){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kabul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(value));return Object.fromEntries(parts.map(p=>[p.type,p.value]))}
function orderDateTime(value){const p=kabulParts(value);return `${p.year}/${p.month}/${p.day} — ${p.hour}:${p.minute}`}
function businessDayKey(value=new Date()){const shifted=new Date(new Date(value).getTime()+(270-360)*60000);return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth()+1).padStart(2,'0')}-${String(shifted.getUTCDate()).padStart(2,'0')}`}
function businessDayLabel(key){const [y,m,d]=key.split('-');return `${y}/${m}/${d}`}

$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('#authView .form').forEach(f=>f.classList.toggle('active',f.id===b.dataset.auth))});
$$('.nav').forEach(b=>b.onclick=()=>{show(b.dataset.view);if(b.dataset.view==='adminView')loadUsers();if(b.dataset.view==='reportView')loadReport()});
provinces.forEach(p=>$('#orderForm select').add(new Option(p,p)));

$('#registerForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),p=phone(f.get('phone')),pin=f.get('pin');if(!/^07\d{8}$/.test(p))return toast('د موبایل شمېره سمه ولیکئ');busy(form,true);try{const {data,error}=await db.auth.signUp({email:emailFor(p),password:passwordFor(p,pin),options:{data:{full_name:f.get('name').trim(),phone:p}}});if(error)throw error;if(!data.session)throw new Error('د Email confirmation بندول پکار دي');session=data.session;const uid=data.user.id,photo=f.get('profilePhoto'),photoPath=`${uid}/profile.${ext(photo)}`;const up=await db.storage.from('identity-docs').upload(photoPath,photo,{upsert:true});if(up.error)throw up.error;const {error:rpcError}=await db.rpc('set_my_identity_paths',{p_tazkira_path:null,p_selfie_path:photoPath});if(rpcError)throw rpcError;profile=await getProfile();route()}catch(err){toast(errorText(err))}finally{busy(form,false)}};

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const phoneInput=form.elements['phone'], pinInput=form.elements['pin'];
  const p=loginPhone(phoneInput.value), pin=loginDigits(pinInput.value);
  phoneInput.value=p; pinInput.value=pin;
  if(!/^07\d{8}$/.test(p))return toast('د موبایل شمېره سمه ولیکئ');
  if(!/^\d{4}$/.test(pin))return toast('څلور عددي PIN ولیکئ');
  busy(form,true);
  try{
    const data=await compatibleLogin(p,pin);
    session=data.session;
    profile=await getProfile();
    route();
  }catch(err){toast(loginErrorText(err))}
  finally{busy(form,false)}
};
$('#logoutBtn').onclick=$('#pendingLogout').onclick=async()=>{await db.auth.signOut();session=null;profile=null;$('#bottomNav').classList.add('hidden');$('#logoutBtn').classList.add('hidden');show('authView')};

async function getProfile(){const uid=session&&session.user?session.user.id:null;if(!uid)throw new Error('حساب ونه موندل شو');const {data,error}=await db.from('profiles').select('*').eq('id',uid).single();if(error)throw error;return data}
async function boot(){const {data}=await db.auth.getSession();session=data.session;if(session){try{profile=await getProfile();route()}catch{await db.auth.signOut();show('authView')}}else show('authView')}
function route(){if(!profile)return show('authView');if(profile.status!=='approved'){show('pendingView');$('#logoutBtn').classList.remove('hidden');return}$('#bottomNav').classList.remove('hidden');$('#logoutBtn').classList.remove('hidden');$('#adminNav').classList.toggle('hidden',profile.role!=='admin');$('#newOrderBtn').classList.toggle('hidden',profile.role!=='agent');$('#userName').textContent=profile.full_name;$('#avatarFallback').textContent=(profile.full_name&&profile.full_name[0])||'ا';$('#avatar').classList.remove('has-photo');if(profile.selfie_path)signed('identity-docs',profile.selfie_path).then(url=>{if(url){$('#avatarImg').src=url;$('#avatar').classList.add('has-photo')}});$('#roleBadge').textContent=roleNames[profile.role];$('#ordersTitle').textContent=profile.role==='agent'?'زما وروستي آرډرونه':'ټول وروستي آرډرونه';show('homeView');loadOrders()}

async function loadOrders(){let q=db.from('orders').select('*,profiles!orders_created_by_fkey(full_name,phone)').order('created_at',{ascending:false});if(profile.role==='agent')q=q.eq('created_by',profile.id);const {data,error}=await q;if(error)return toast(error.message);currentOrders=data||[];renderOrders();renderStats()}
async function signed(bucket,path){if(!path)return '';const {data}=await db.storage.from(bucket).createSignedUrl(path,900);return (data&&data.signedUrl)||''}
async function renderOrders(){const box=$('#ordersList');box.innerHTML='';$('#ordersEmpty').style.display=currentOrders.length?'none':'block';const cards=await Promise.all(currentOrders.map(async o=>{const url=await signed('order-photos',o.photo_path);const canEdit=profile.role==='agent'&&o.created_by===profile.id;const canMove=profile.role==='dispatcher'&&o.status==='registered';const action=o.province==='کندهار'?'تسلیم شو':'ولېږل شو';const creator=Array.isArray(o.profiles)?o.profiles[0]:o.profiles;return `<article class="order-card"><img src="${url}" alt="${escapeHtml(o.product_name)}"><div class="order-main"><div class="order-top"><h4>${escapeHtml(o.product_name)}</h4><span class="badge ${o.status}">${statusNames[o.status]}</span></div><div class="order-meta"><span>📍 ${o.province}</span><span>📦 ${number(o.quantity)}</span><span>☎ ${escapeHtml(o.customer_phone)}</span>${profile.role!=='agent'?`<span>👤 ${escapeHtml((creator&&creator.full_name)||'نوم نه دی موندل شوی')}</span>`:''}</div><div class="order-meta"><span>📅 ثبت: ${orderDateTime(o.created_at)}</span></div><div class="order-meta"><span>📌 ادرس: ${escapeHtml(o.address)}</span></div><div class="order-foot"><strong>${number(o.price)} ؋</strong><div class="order-actions">${canEdit?`<button class="small-btn" data-edit="${o.id}">اصلاح</button>`:''}${canMove?`<button class="small-btn action" data-move="${o.id}">${action}</button>`:''}</div></div></div></article>`}));box.innerHTML=cards.join('');$$('[data-edit]').forEach(b=>b.onclick=()=>openOrder(b.dataset.edit));$$('[data-move]').forEach(b=>b.onclick=()=>advance(b.dataset.move))}
function renderStats(){const today=businessDayKey(),done=currentOrders.filter(o=>o.processed_at&&businessDayKey(o.processed_at)===today),kandahar=done.filter(o=>o.province==='کندهار'&&o.status==='delivered'),other=done.filter(o=>o.province!=='کندهار'&&o.status==='sent');$('#otherProvinceCount').textContent=number(other.length);$('#otherProvinceMoney').textContent=number(other.reduce((s,o)=>s+Number(o.price),0));$('#kandaharCount').textContent=number(kandahar.length);$('#kandaharMoney').textContent=number(kandahar.reduce((s,o)=>s+Number(o.price),0))}

$('#newOrderBtn').onclick=()=>openOrder();$('#closeOrder').onclick=()=>$('#orderDialog').close();
function openOrder(id){const f=$('#orderForm');f.reset();f.id.value='';editingPhoto=null;$('#photoPreview').style.display='none';$('.product-photo span').style.display='block';$('#orderKicker').textContent='نوی آرډر';const deleteBtn=$('#deleteOrderBtn');if(deleteBtn){deleteBtn.classList.add('hidden');deleteBtn.dataset.id=''}if(id){const o=currentOrders.find(x=>x.id===id);for(const k of ['id','product_name','customer_phone','province','quantity','address','price'])f.elements[k].value=o[k];editingPhoto=o.photo_path;$('#orderKicker').textContent='آرډر اصلاح کړئ';if(deleteBtn&&profile.role==='agent'&&o.created_by===profile.id&&o.status==='registered'){deleteBtn.classList.remove('hidden');deleteBtn.dataset.id=o.id}signed('order-photos',o.photo_path).then(url=>{if(url){$('#photoPreview').src=url;$('#photoPreview').style.display='block';$('.product-photo span').style.display='none'}})}$('#orderDialog').showModal()}
$('#deleteOrderBtn').onclick=async()=>{const id=$('#deleteOrderBtn').dataset.id;if(!id)return;const o=currentOrders.find(x=>String(x.id)===String(id));if(!o)return toast('جنس ونه موندل شو');if(profile.role!=='agent'||o.created_by!==profile.id)return toast('د دې جنس د حذف اجازه نشته');if(o.status!=='registered')return toast('لېږل شوی یا تسلیم شوی جنس نه شي ډیلیټ کېدای');if(!confirm('ایا ډاډه یاست چې دا جنس مکمل ډیلیټ کړئ؟'))return;const btn=$('#deleteOrderBtn');btn.disabled=true;try{const {error}=await db.from('orders').delete().eq('id',id).eq('created_by',profile.id).eq('status','registered');if(error)throw error;if(o.photo_path)await db.storage.from('order-photos').remove([o.photo_path]);$('#orderDialog').close();toast('جنس مکمل ډیلیټ شو');await loadOrders()}catch(err){toast(errorText(err))}finally{btn.disabled=false}};
$('#orderForm [name=photo]').onchange=e=>{const file=e.target.files[0];if(!file)return;const url=URL.createObjectURL(file);$('#photoPreview').src=url;$('#photoPreview').style.display='block';$('.product-photo span').style.display='none'};
$('#orderForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),id=f.get('id'),file=f.get('photo');if(!id&&(!file||!file.size))return toast('د جنس عکس واخلئ');busy(form,true);try{let photoPath=editingPhoto;if(file&&file.size){photoPath=`${profile.id}/${crypto.randomUUID()}.${ext(file)}`;const {error}=await db.storage.from('order-photos').upload(photoPath,file,{upsert:false});if(error)throw error}const payload={product_name:f.get('product_name').trim(),customer_phone:f.get('customer_phone').trim(),province:f.get('province'),quantity:Number(f.get('quantity')),address:f.get('address').trim(),price:Number(f.get('price')),photo_path:photoPath};const result=id?await db.from('orders').update(payload).eq('id',id):await db.from('orders').insert(payload);if(result.error)throw result.error;$('#orderDialog').close();toast(id?'آرډر اصلاح شو':'آرډر ثبت شو');loadOrders()}catch(err){toast(errorText(err))}finally{busy(form,false)}};
async function advance(id){const o=currentOrders.find(x=>x.id===id),next=o.province==='کندهار'?'delivered':'sent';const {error}=await db.rpc('advance_order',{p_order_id:id,p_new_status:next});if(error)return toast(errorText(error));toast(statusNames[next]);loadOrders()}

async function loadUsers(){const {data,error}=await db.from('profiles').select('*').order('created_at',{ascending:false});if(error)return toast(error.message);const pending=data.filter(u=>u.status==='pending'),approved=data.filter(u=>u.status==='approved'&&u.role!=='admin');$('#pendingCount').textContent=number(pending.length);$('#usersEmpty').style.display=pending.length?'none':'block';$('#pendingUsers').innerHTML='';for(const u of pending)$('#pendingUsers').insertAdjacentHTML('beforeend',await userCard(u,true));$('#approvedUsers').innerHTML='';for(const u of approved)$('#approvedUsers').insertAdjacentHTML('beforeend',await userCard(u,false));$$('[data-user-action]').forEach(b=>b.onclick=()=>userAction(b.dataset.uid,b.dataset.userAction));$$('[data-reset-pin]').forEach(b=>b.onclick=()=>openResetPin(b.dataset.resetPin,b.dataset.name))}
async function userCard(u,isPending){const photoUrl=await signed('identity-docs',u.selfie_path);return `<article class="user-card"><div class="user-top"><div class="user-identity">${photoUrl?`<img class="user-photo" src="${photoUrl}" alt="${escapeHtml(u.full_name)}">`:''}<div><h4>${escapeHtml(u.full_name)}</h4><p>☎ ${u.phone} • ${roleNames[u.role]}</p></div></div><span class="badge">${isPending?'انتظار':'تایید'}</span></div><div class="user-actions">${isPending?`<button class="approve" data-uid="${u.id}" data-user-action="agent">د شاګرد په توګه تایید</button><button class="dispatch" data-uid="${u.id}" data-user-action="dispatcher">د لېږونکي په توګه تایید</button><button class="reject" data-uid="${u.id}" data-user-action="reject">رد</button>`:`<button class="approve" data-uid="${u.id}" data-user-action="agent">شاګرد</button><button class="dispatch" data-uid="${u.id}" data-user-action="dispatcher">لېږونکی</button><button class="reset-pin" data-reset-pin="${u.id}" data-name="${escapeHtml(u.full_name)}">PIN بدلول</button><button class="reject" data-uid="${u.id}" data-user-action="reject">بندول</button>`}</div></article>`}
async function userAction(uid,action){const args={p_user_id:uid,p_status:action==='reject'?'rejected':'approved',p_role:action==='reject'?'agent':action};const {error}=await db.rpc('admin_set_user',{...args});if(error)return toast(errorText(error));toast('حساب تازه شو');loadUsers()}
function openResetPin(uid,name){const f=$('#resetPinForm');f.reset();f.uid.value=uid;$('#resetPinUser').textContent=`د ${name} لپاره نوی PIN وټاکئ.`;$('#resetPinDialog').showModal()}
$('#closeResetPin').onclick=()=>$('#resetPinDialog').close();
$('#resetPinForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);busy(form,true);try{const {error}=await db.rpc('admin_reset_pin',{p_user_id:f.get('uid'),p_new_pin:f.get('pin')});if(error)throw error;$('#resetPinDialog').close();toast('نوی PIN ثبت شو')}catch(err){toast(errorText(err))}finally{busy(form,false)}};

$('#refreshBtn').onclick=loadReport;
async function loadReport(){if(!currentOrders.length)await loadOrders();const days=new Map();for(const o of currentOrders){if(!o.processed_at)continue;const key=businessDayKey(o.processed_at);if(!days.has(key))days.set(key,{key,otherCount:0,otherMoney:0,kandaharCount:0,kandaharMoney:0});const d=days.get(key);if(o.province==='کندهار'&&o.status==='delivered'){d.kandaharCount++;d.kandaharMoney+=Number(o.price)}else if(o.province!=='کندهار'&&o.status==='sent'){d.otherCount++;d.otherMoney+=Number(o.price)}}const rows=[...days.values()].sort((a,b)=>b.key.localeCompare(a.key)),today=days.get(businessDayKey())||{otherCount:0,otherMoney:0,kandaharCount:0,kandaharMoney:0};$('#reportSummary').innerHTML=`<article><strong>${number(today.otherCount)} جنس</strong><span>نن نورو ولایتونو ته</span><b>${number(today.otherMoney)} ؋</b></article><article><strong>${number(today.kandaharCount)} جنس</strong><span>نن کندهار کې</span><b>${number(today.kandaharMoney)} ؋</b></article><article><strong>${number(today.otherCount+today.kandaharCount)}</strong><span>نن ټول</span></article>`;$('#reportUsers').innerHTML=rows.map((d,i)=>`<article class="weekly-card"><div class="weekly-title"><div><small>${i===0&&d.key===businessDayKey()?'نن':'پخوانۍ ورځ'}</small><b>${businessDayLabel(d.key)} • 06:00 — بل سهار 06:00</b></div><span>${number(d.otherCount)} نور • ${number(d.kandaharCount)} کندهار</span></div><div class="weekly-numbers split-weekly"><div><small>نورو ولایتونو ته لېږل شوي</small><strong>${number(d.otherCount)} جنس</strong><b>${number(d.otherMoney)} ؋</b></div><div class="kandahar-week"><small>کندهار کې تسلیم شوي</small><strong>${number(d.kandaharCount)} جنس</strong><b>${number(d.kandaharMoney)} ؋</b></div></div></article>`).join('')||'<div class="empty">راپور نشته</div>'}
function escapeHtml(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function errorText(e){const m=(e&&e.message)||String(e);if(m.includes('already registered'))return 'دا موبایل شمېره مخکې ثبت شوې';if(m.includes('row-level security'))return 'اجازه نشته؛ د اډمین سره اړیکه ونیسئ';return m}
function loginErrorText(e){const m=(e&&e.message)||String(e);if(/rate limit|too many/i.test(m))return 'ډېرې هڅې وشوې؛ لږ انتظار وکړئ او بیا هڅه وکړئ';if(/email not confirmed/i.test(m))return 'حساب لا تایید شوی نه دی: '+m;return 'د ننوتلو اصلي خطا: '+m}
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  installPrompt=e;
});
window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  $('#installBtn').classList.add('hidden');
});
$('#installBtn').onclick=async()=>{
  if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){
    $('#installBtn').classList.add('hidden');
    return;
  }
  if(installPrompt){
    const promptEvent=installPrompt;
    installPrompt=null;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    return;
  }
  const isiPhone=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(isiPhone)$('#installDialog').showModal();
  else toast('د نصب کړکۍ لا چمتو نه ده؛ پاڼه یو ځل تازه کړئ او بیا نصب ووهئ');
};
$('#closeInstall').onclick=$('#installOk').onclick=()=>$('#installDialog').close();
$('#forgotPinBtn').onclick=()=>$('#forgotPinDialog').showModal();
$('#closeForgotPin').onclick=$('#forgotPinOk').onclick=()=>$('#forgotPinDialog').close();
if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone)$('#installBtn').classList.add('hidden');
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
boot();
