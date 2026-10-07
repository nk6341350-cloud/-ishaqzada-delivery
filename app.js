const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const provinces=['کندهار','کابل','هرات','بلخ','ننګرهار','هلمند','غزني','فراه','نیمروز','زابل','ارزګان','پکتیا','پکتیکا','خوست','کندز','تخار','بدخشان','بغلان','سمنګان','سرپل','جوزجان','فاریاب','بادغیس','غور','دایکندي','بامیان','پروان','کاپیسا','پنجشېر','لغمان','کونړ','نورستان','لوګر','میدان وردګ'];
const roleNames={admin:'اډمین',agent:'شاګرد',dispatcher:'د لېږلو مسؤل'};
const branchNames={kandahar:'کندهار',kabul:'کابل'};
const branchCity=o=>branchNames[o.dispatch_branch||'kandahar']||'کندهار';
const localDeliveryLabel=()=>profile?.role==='dispatcher'?branchCity(profile):profile?.role==='admin'&&adminBranch!=='all'?branchNames[adminBranch]:'خپل ښار';
const userRoleLabel=u=>u.role==='dispatcher'?'د '+branchCity(u)+' لېږدونکی':roleNames[u.role];
const statusNames={registered:'ثبت شوی',sent:'ولېږل شو',delivered:'تسلیم شو'};
let profile=null,currentOrders=[],ordersOffset=0,hasMoreOrders=false;
const ORDER_PAGE_SIZE=20;
let adminBranch='all',ordersRequest=0,statsRequest=0,reportRequest=0;
const adminBranchQuery=()=>profile?.role==='admin'?'admin_branch='+adminBranch:'';
function setupAdminBranchFilters(){
  adminBranch='all';
  $$('.admin-branch-filter').forEach(el=>el.classList.toggle('hidden',profile.role!=='admin'));
  $$('[data-admin-branch]').forEach(el=>{el.value=adminBranch;el.onchange=()=>{
    adminBranch=el.value;
    $$('[data-admin-branch]').forEach(other=>other.value=adminBranch);
    $('#localDeliveryTitle').textContent='نن '+localDeliveryLabel()+' کې';
    $('#ordersTitle').textContent=adminBranch==='all'?'ټول وروستي آرډرونه':'د '+branchNames[adminBranch]+' لېږدونکي آرډرونه';
    ['otherProvinceCount','otherProvinceMoney','kandaharCount','kandaharMoney'].forEach(id=>$('#'+id).textContent='—');
    $('#reportSummary').innerHTML='';$('#reportUsers').innerHTML='';
    loadOrders(true);loadReport();
  }});
}


function show(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id))}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2800)}
function busy(form,on){const b=form.querySelector('button[type=submit]');if(b)b.disabled=on}
function digits(v){return String(v??'').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\s+/g,'')}
function phone(v){let p=digits(v).replace(/\D/g,'');if(p.startsWith('0093'))p='0'+p.slice(4);else if(p.startsWith('93'))p='0'+p.slice(2);if(p.length===9&&!p.startsWith('0'))p='0'+p;return p}
function number(v){return Number(v||0).toLocaleString('en-US')}
function kabulParts(value){return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kabul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(value)).map(p=>[p.type,p.value]))}
function orderDateTime(v){const p=kabulParts(v);return `${p.year}/${p.month}/${p.day} — ${p.hour}:${p.minute}`}
function businessDayKey(value=new Date()){const shifted=new Date(new Date(value).getTime()+(270-360)*60000);return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth()+1).padStart(2,'0')}-${String(shifted.getUTCDate()).padStart(2,'0')}`}
function businessDayLabel(key){const [y,m,d]=key.split('-');return `${y}/${m}/${d}`}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
async function api(path,opts={}){
  const config=window.DELIVERY_CONFIG||{};
  if(!/^https:\/\/[^/]+\.supabase\.co$/.test(config.url||'')||!config.publishableKey||config.publishableKey.startsWith('PASTE_'))throw new Error('د Supabase پته او Publishable key په config.js کې ولیکئ');
  const method=opts.method||'GET',parts=path.split('?'),route=parts[0],query=new URLSearchParams(parts[1]||'');
  let action,payload={};
  if(route==='/setup')action=method==='POST'?'create_admin':'setup';
  else if(route==='/register')action='register';
  else if(route==='/login')action='login';
  else if(route==='/logout')action='logout';
  else if(route==='/me')action='me';
  else if(route==='/me/pin')action='change_pin';
  else if(route==='/orders')action=method==='POST'?'save_order':'orders';
  else if(route==='/stats')action='stats';
  else if(route==='/report')action='report';
  else if(route==='/users')action='users';
  else {let m=route.match(/^\/orders\/([^/]+)(\/advance)?$/);if(m){action=m[2]?'advance':'delete_order';payload.id=m[1]}else{m=route.match(/^\/users\/([^/]+)(\/pin)?$/);if(m){action=m[2]?'reset_pin':'user_action';payload.id=m[1]}}}
  if(!action)throw new Error('عمل ونه موندل شو');
  if(query.has('offset'))payload.offset=Number(query.get('offset'));
  if(query.has('limit'))payload.limit=Number(query.get('limit'));
  if(query.has('admin_branch'))payload.admin_branch=query.get('admin_branch');
  if(opts.body instanceof FormData)Object.assign(payload,Object.fromEntries(opts.body.entries()));
  else if(opts.body)Object.assign(payload,JSON.parse(opts.body));
  const key=config.publishableKey,token=localStorage.getItem('ishaqzada_token')||'';
  const response=await fetch(config.url+'/rest/v1/rpc/delivery_api',{method:'POST',headers:{'Content-Type':'application/json','apikey':key},body:JSON.stringify({p_action:action,p_payload:payload,p_token:token})});
  let data;try{data=await response.json()}catch(_){throw new Error('له ډیټابېس سره اړیکه نشته')}
  if(!response.ok||data?.error)throw new Error(data?.message||data?.error||'د ډیټابېس ستونزه');
  return data;
}
function errorText(e){return e?.message||'ستونزه رامنځته شوه'}

function compressImage(file,maxSide=900,quality=.68){return new Promise(resolve=>{if(!file||!file.size)return resolve(file);if(file.size<180000&&/image\/jpe?g/i.test(file.type||''))return resolve(file);const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,s=Math.min(1,maxSide/Math.max(w,h));w=Math.max(1,Math.round(w*s));h=Math.max(1,Math.round(h*s));const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);c.toBlob(b=>{URL.revokeObjectURL(url);resolve(b||file)},'image/jpeg',quality)}catch(_){URL.revokeObjectURL(url);resolve(file)}};img.onerror=()=>{URL.revokeObjectURL(url);resolve(file)};img.src=url})}

$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('#authView .form').forEach(f=>f.classList.toggle('active',f.id===b.dataset.auth))});
$$('.nav').forEach(b=>b.onclick=()=>{show(b.dataset.view);if(b.dataset.view==='adminView')loadUsers();if(b.dataset.view==='reportView')loadReport()});
provinces.forEach(p=>$('#orderForm select[name=province]').add(new Option(p,p)));

$('#setupForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),p=phone(f.get('phone')),pin=digits(f.get('pin'));if(!String(f.get('name')||'').trim()||!/^07\d{8}$/.test(p)||!/^\d{4}$/.test(pin))return toast('نوم، موبایل او PIN سم ولیکئ');busy(form,true);try{await api('/setup',{method:'POST',body:JSON.stringify({name:String(f.get('name')).trim(),phone:p,pin,code:String(f.get('code')||'')})});form.reset();toast('اډمین جوړ شو؛ اوس ننوځئ');show('authView')}catch(err){toast(errorText(err))}finally{busy(form,false)}};

$('#registerForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,p=phone(form.phone.value),pin=digits(form.pin.value),name=String(form.name.value||'').trim();if(!name)return toast('بشپړ نوم ولیکئ');if(!/^07\d{8}$/.test(p))return toast('د موبایل شمېره سمه ولیکئ');if(!/^\d{4}$/.test(pin))return toast('څلور عددي PIN ولیکئ');busy(form,true);try{await api('/register',{method:'POST',body:JSON.stringify({name,phone:p,pin})});form.reset();toast('ثبت شو؛ د اډمین تایید ته انتظار وکړئ');$$('.tab')[0].click()}catch(err){toast(errorText(err))}finally{busy(form,false)}};

$('#loginForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,p=phone(form.phone.value),pin=digits(form.pin.value);form.phone.value=p;form.pin.value=pin;if(!/^07\d{8}$/.test(p))return toast('د موبایل شمېره سمه ولیکئ');if(!/^\d{4}$/.test(pin))return toast('څلور عددي PIN ولیکئ');busy(form,true);try{const d=await api('/login',{method:'POST',body:JSON.stringify({phone:p,pin})});localStorage.setItem('ishaqzada_token',d.token);await boot()}catch(err){toast(errorText(err))}finally{busy(form,false)}};
$('#logoutBtn').onclick=$('#pendingLogout').onclick=async()=>{try{await api('/logout',{method:'POST',body:'{}'})}catch(_){}localStorage.removeItem('ishaqzada_token');profile=null;currentOrders=[];$('#bottomNav').classList.add('hidden');$('#logoutBtn').classList.add('hidden');show('authView')};

async function boot(){try{const d=await api('/me');profile=d.profile;route()}catch(_){show('authView')}}
function route(){if(!profile)return show('authView');$('#serviceNotice').classList.add('hidden');$('#logoutBtn').classList.remove('hidden');if(profile.status!=='approved'){show('pendingView');return}$('#bottomNav').classList.remove('hidden');$('#adminNav').classList.toggle('hidden',profile.role!=='admin');$('#newOrderBtn').classList.toggle('hidden',profile.role!=='agent');setupAdminBranchFilters();$('#userName').textContent=profile.full_name;$('#avatarFallback').textContent=profile.full_name?.[0]||'ا';$('#avatar').classList.remove('has-photo');$('#roleBadge').textContent=userRoleLabel(profile);$('#localDeliveryTitle').textContent='نن '+localDeliveryLabel()+' کې';$('#ordersTitle').textContent=profile.role==='agent'?'زما وروستي آرډرونه':'ټول وروستي آرډرونه';show('homeView');loadOrders(true)}

async function loadOrders(reset=true){const request=++ordersRequest;if(reset){ordersOffset=0;currentOrders=[];hasMoreOrders=false;renderOrders();loadStats()}try{const d=await api(`/orders?offset=${ordersOffset}&limit=${ORDER_PAGE_SIZE}&${adminBranchQuery()}`);if(request!==ordersRequest)return;hasMoreOrders=d.hasMore;currentOrders=reset?d.orders:currentOrders.concat(d.orders);ordersOffset=currentOrders.length;renderOrders()}catch(e){if(request===ordersRequest)toast(errorText(e))}}

function renderOrders(){const box=$('#ordersList');box.innerHTML='';$('#ordersEmpty').style.display=currentOrders.length?'none':'block';box.innerHTML=currentOrders.map(o=>{const canEdit=profile.role==='agent'&&o.created_by===profile.id&&o.status==='registered',canMove=profile.role==='dispatcher'&&o.status==='registered'&&(o.dispatch_branch||'kandahar')===(profile.dispatch_branch||'kandahar'),action=o.province===branchCity(o)?'تسلیم شو':'ولېږل شو';return `<article class="order-card"><div class="order-main"><div class="order-top"><h4>${escapeHtml(o.product_name)}</h4><span class="badge ${o.status}">${statusNames[o.status]}</span></div><div class="order-meta"><span>📍 ${escapeHtml(o.province)}</span><span>🚚 د ${branchCity(o)} لېږدونکی</span><span>📦 ${number(o.quantity)}</span><span>☎ ${escapeHtml(o.customer_phone)}</span>${profile.role!=='agent'?`<span>👤 ${escapeHtml(o.creator_name||'نوم نه دی موندل شوی')}</span>`:''}</div><div class="order-meta"><span>📅 ثبت: ${orderDateTime(o.created_at)}</span></div><div class="order-meta"><span>📌 ادرس: ${escapeHtml(o.address)}</span></div><div class="order-foot"><strong>${number(o.price)} ؋</strong><div class="order-actions">${canEdit?`<button class="small-btn" data-edit="${o.id}">اصلاح</button>`:''}${canMove?`<button class="small-btn action" data-move="${o.id}">${action}</button>`:''}</div></div></div></article>`}).join('');$$('[data-edit]').forEach(b=>b.onclick=()=>openOrder(b.dataset.edit));$$('[data-move]').forEach(b=>b.onclick=()=>advance(b.dataset.move));$('#moreOrdersBtn').classList.toggle('hidden',!hasMoreOrders)}
$('#moreOrdersBtn').onclick=()=>loadOrders(false);
async function loadStats(){const request=++statsRequest;try{const d=await api('/stats?'+adminBranchQuery());if(request!==statsRequest)return;$('#otherProvinceCount').textContent=number(d.otherCount);$('#otherProvinceMoney').textContent=number(d.otherMoney);$('#kandaharCount').textContent=number(d.kandaharCount);$('#kandaharMoney').textContent=number(d.kandaharMoney)}catch(_){}}

$('#newOrderBtn').onclick=()=>openOrder();$('#closeOrder').onclick=()=>$('#orderDialog').close();
function openOrder(id){const f=$('#orderForm');f.reset();f.id.value='';$('#orderKicker').textContent='نوی آرډر';$('#deleteOrderBtn').classList.add('hidden');if(id){const o=currentOrders.find(x=>String(x.id)===String(id));if(!o)return;f.id.value=o.id;['product_name','customer_phone','province','quantity','address','price'].forEach(k=>f.elements[k].value=o[k]);f.elements.dispatch_branch.value=o.dispatch_branch||'kandahar';$('#orderKicker').textContent='آرډر اصلاح کړئ';if(profile.role==='agent'&&o.created_by===profile.id&&o.status==='registered'){$('#deleteOrderBtn').classList.remove('hidden');$('#deleteOrderBtn').dataset.id=o.id}}$('#orderDialog').showModal()}
$('#orderForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),id=f.get('id');busy(form,true);try{const fd=new FormData();for(const k of ['id','product_name','customer_phone','province','quantity','address','price','dispatch_branch'])fd.set(k,f.get(k));await api('/orders',{method:'POST',body:fd});$('#orderDialog').close();toast(id?'آرډر اصلاح شو':'آرډر ثبت شو');loadOrders(true)}catch(err){toast(errorText(err))}finally{busy(form,false)}};
$('#deleteOrderBtn').onclick=async()=>{const id=$('#deleteOrderBtn').dataset.id;if(!id||!confirm('ایا ډاډه یاست چې دا جنس مکمل ډیلیټ کړئ؟'))return;try{await api('/orders/'+id,{method:'DELETE',body:'{}'});$('#orderDialog').close();toast('جنس مکمل ډیلیټ شو');loadOrders(true)}catch(e){toast(errorText(e))}};
async function advance(id){try{const d=await api('/orders/'+id+'/advance',{method:'POST',body:'{}'});toast(statusNames[d.status]);loadOrders(true)}catch(e){toast(errorText(e))}}

async function loadUsers(){try{const d=await api('/users');const pending=d.users.filter(u=>u.status==='pending'),approved=d.users.filter(u=>u.status==='approved'&&u.role!=='admin');$('#pendingCount').textContent=number(pending.length);$('#usersEmpty').style.display=pending.length?'none':'block';$('#pendingUsers').innerHTML=pending.map(u=>userCard(u,true)).join('');$('#approvedUsers').innerHTML=approved.map(u=>userCard(u,false)).join('');$$('[data-user-action]').forEach(b=>b.onclick=()=>userAction(b.dataset.uid,b.dataset.userAction));$$('[data-reset-pin]').forEach(b=>b.onclick=()=>openResetPin(b.dataset.resetPin,b.dataset.name))}catch(e){toast(errorText(e))}}
function userCard(u,pending){return `<article class="user-card"><div class="user-top"><div class="user-identity"><div><h4>${escapeHtml(u.full_name)}</h4><p>☎ ${escapeHtml(u.phone)} • ${userRoleLabel(u)}</p></div></div><span class="badge">${pending?'انتظار':'تایید'}</span></div><div class="user-actions">${pending?`<button class="approve" data-uid="${u.id}" data-user-action="agent">د شاګرد په توګه تایید</button><button class="dispatch" data-uid="${u.id}" data-user-action="dispatcher_kandahar">د کندهار لېږدونکی</button><button class="dispatch" data-uid="${u.id}" data-user-action="dispatcher_kabul">د کابل لېږدونکی</button><button class="reject" data-uid="${u.id}" data-user-action="reject">رد</button>`:`<button class="approve" data-uid="${u.id}" data-user-action="agent">شاګرد</button><button class="dispatch" data-uid="${u.id}" data-user-action="dispatcher_kandahar">د کندهار لېږدونکی</button><button class="dispatch" data-uid="${u.id}" data-user-action="dispatcher_kabul">د کابل لېږدونکی</button><button class="reset-pin" data-reset-pin="${u.id}" data-name="${escapeHtml(u.full_name)}">PIN بدلول</button><button class="reject" data-uid="${u.id}" data-user-action="reject">بندول</button>`}</div></article>`}
async function userAction(uid,action){try{await api('/users/'+uid,{method:'PATCH',body:JSON.stringify({action})});toast('حساب تازه شو');loadUsers()}catch(e){toast(errorText(e))}}
function openResetPin(uid,name){const f=$('#resetPinForm');f.reset();f.uid.value=uid;$('#resetPinUser').textContent=`د ${name} لپاره نوی PIN وټاکئ.`;$('#resetPinDialog').showModal()}
$('#closeResetPin').onclick=()=>$('#resetPinDialog').close();
$('#resetPinForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),pin=digits(f.get('pin'));if(!/^\d{4}$/.test(pin))return toast('څلور عددي PIN ولیکئ');busy(e.currentTarget,true);try{await api('/users/'+f.get('uid')+'/pin',{method:'PATCH',body:JSON.stringify({pin})});$('#resetPinDialog').close();toast('نوی PIN ثبت شو')}catch(err){toast(errorText(err))}finally{busy(e.currentTarget,false)}};

$('#changeOwnPin').onclick=()=>$('#ownPinDialog').showModal();
$('#closeOwnPin').onclick=()=>$('#ownPinDialog').close();
$('#ownPinForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),oldPin=digits(f.get('oldPin')),newPin=digits(f.get('newPin'));if(!/^\d{4}$/.test(oldPin)||!/^\d{4}$/.test(newPin))return toast('څلور عددي PIN ولیکئ');busy(form,true);try{await api('/me/pin',{method:'PATCH',body:JSON.stringify({oldPin,newPin})});form.reset();$('#ownPinDialog').close();localStorage.removeItem('ishaqzada_token');profile=null;$('#bottomNav').classList.add('hidden');$('#logoutBtn').classList.add('hidden');show('authView');toast('PIN بدل شو؛ بیا ننوځئ')}catch(err){toast(errorText(err))}finally{busy(form,false)}};

$('#refreshBtn').onclick=loadReport;
async function loadReport(){const request=++reportRequest;try{const d=await api('/report?'+adminBranchQuery());if(request!==reportRequest)return;const rows=d.days,today=rows.find(x=>x.key===businessDayKey())||{otherCount:0,otherMoney:0,kandaharCount:0,kandaharMoney:0};$('#reportSummary').innerHTML=`<article><strong>${number(today.otherCount)} جنس</strong><span>نن نورو ولایتونو ته</span><b>${number(today.otherMoney)} ؋</b></article><article><strong>${number(today.kandaharCount)} جنس</strong><span>نن ${localDeliveryLabel()} کې</span><b>${number(today.kandaharMoney)} ؋</b></article><article><strong>${number(today.otherCount+today.kandaharCount)}</strong><span>نن ټول</span></article>`;$('#reportUsers').innerHTML=rows.map((x,i)=>`<article class="weekly-card"><div class="weekly-title"><div><small>${i===0&&x.key===businessDayKey()?'نن':'ورځ'}</small><h3>${businessDayLabel(x.key)}</h3></div><strong>${number(x.otherCount+x.kandaharCount)} جنس</strong></div><div class="weekly-grid"><span>نور ولایتونه<b>${number(x.otherCount)} • ${number(x.otherMoney)} ؋</b></span><span>${localDeliveryLabel()}<b>${number(x.kandaharCount)} • ${number(x.kandaharMoney)} ؋</b></span></div></article>`).join('')}catch(e){toast(errorText(e))}}

$('#forgotPinBtn').onclick=()=>$('#forgotPinDialog').showModal();$('#closeForgotPin').onclick=$('#forgotPinOk').onclick=()=>$('#forgotPinDialog').close();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
async function start(){try{const d=await api('/setup');if(!d.ready){show('setupView');return}}catch(e){toast(errorText(e));show('authView');return}boot()}
start();

