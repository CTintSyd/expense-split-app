import cfg, * as cfgAll from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,collection,setDoc,deleteDoc,getDoc,onSnapshot,query,orderBy,limit} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rid=(n=10)=>{const a='abcdefghijklmnopqrstuvwxyz0123456789',b=crypto.getRandomValues(new Uint8Array(n));return Array.from(b,x=>a[x%36]).join('')};
const CURS=['AUD','NZD','USD','EUR','GBP','JPY','CNY','HKD','SGD','THB','IDR','KRW','VND','MYR','PHP','INR','CAD','CHF','FJD'];
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.\-]/g,''));return isFinite(n)?n:0};
const money=(a,cur,narrow)=>{try{return new Intl.NumberFormat('en-AU',{style:'currency',currency:cur,currencyDisplay:narrow?'narrowSymbol':'symbol'}).format(a)}catch(e){return cur+' '+Number(a).toFixed(2)}};
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const tripUrl=id=>location.origin+location.pathname+'?trip='+id;

const S={fs:null,setup:false,tid:null,trip:null,tripRaw:null,tripMissing:false,exp:[],pay:[],me:store.get('rts-me',{}),recent:store.get('rts-trips',{}),tab:'exp',stale:false,pending:{}};
let unsubs=[],F=null,delArm=false;
const SCENE=`<svg class="scene" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient></defs>
<rect width="400" height="220" fill="url(#skyg)"/>
<g style="fill:var(--star)"><circle cx="40" cy="30" r="1.2"/><circle cx="90" cy="62" r=".9"/><circle cx="150" cy="24" r="1.1"/><circle cx="210" cy="50" r=".8"/><circle cx="250" cy="20" r="1.3"/><circle cx="350" cy="40" r="1"/><circle cx="380" cy="80" r=".8"/><circle cx="20" cy="90" r=".8"/><circle cx="120" cy="96" r=".7"/><circle cx="330" cy="100" r=".7"/></g>
<circle cx="300" cy="128" r="40" style="fill:var(--sun);opacity:.35"/><circle cx="300" cy="128" r="28" style="fill:var(--sun)"/>
<path d="M0 150 L36 138 L66 144 L108 126 L150 140 L190 132 L232 142 L272 128 L322 140 L362 124 L400 134 L400 220 L0 220Z" style="fill:var(--hill3)"/>
<path d="M0 170 L26 170 L34 146 L44 143 L88 143 L96 147 L104 170 L246 170 L254 152 L262 150 L292 150 L300 154 L306 170 L400 166 L400 220 L0 220Z" style="fill:var(--hill2)"/>
<path d="M0 182 Q200 166 400 182 L400 220 L0 220Z" style="fill:var(--hill1)"/>
<path d="M194 172 L206 172 L290 220 L110 220Z" style="fill:var(--road)"/>
<path d="M199.4 176 L200.6 176 L201 180 L199 180Z M198.8 185 L201.2 185 L201.8 192 L198.2 192Z M197.8 199 L202.2 199 L203.4 212 L196.6 212Z" style="fill:var(--dash)"/></svg>`;
const PAL=['#2f6fdb','#16a085','#7b5cd6','#e07a2f','#d6456b','#2f9bd0','#8a9a2b','#b05cc0','#4a5fc1','#c4932a'];
const av=(id,sz)=>{const i=Math.max(0,members().findIndex(m=>m.id===id)),n=mname(id);return `<span class="av${sz?' '+sz:''}" style="--c:${PAL[i%PAL.length]}" aria-hidden="true">${esc((n.trim()[0]||'?').toUpperCase())}</span>`};
const members=()=>S.trip?.members||[];
const mname=id=>members().find(m=>m.id===id)?.name||'Someone';
const home=()=>S.trip?.home||'AUD';
const fc=c=>money(c/100,home(),true);
const homePic={get(){try{return localStorage.getItem('es-homepic')||''}catch(e){return ''}},set(v){try{if(v)localStorage.setItem('es-homepic',v);else localStorage.removeItem('es-homepic');return true}catch(e){return false}}};
function paintHome(el){setAccent(null);const pic=homePic.get();el.className='top home'+(pic?' hasimg':'');el.style.removeProperty('--tc');
  el.innerHTML=(pic?`<img class="covimg" src="${pic}" alt="">`:SCENE)+`<div class="topin"><h1>EZ Expenses</h1><p class="sub">Expenses made easy</p><ul class="hfeat"><li><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 8h6M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span><b>Split a restaurant bill by dish.</b> Tick who had what and everyone pays for their own order. Any extra charges like weekend fees? Allocated automatically.</span></li><li><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v10M7.5 9.5L12 14l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span><b>Add dozens of expenses at once.</b> Upload a bank CSV or screenshots of your transactions, tick the shared ones and add them all in one go.</span></li><li><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span><b>Split by nights.</b> Booked 10 nights but someone only stays 4? They pay for 4.</span></li></ul></div><div class="hpics"><label class="hpic"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>${pic?'Change photo':'Use my photo'}<input type="file" accept="image/*" id="hpic-file"></label>${pic?'<button type="button" class="hpic" data-act="hpic-reset">Back to the road</button>':''}</div>`}
document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-act="hpic-reset"]');if(!b)return;homePic.set('');renderTop()});
document.addEventListener('change',async ev=>{const t=ev.target;if(t.id!=='hpic-file'||!t.files?.[0])return;const f=t.files[0];t.value='';
  try{let d=await toData(await shrink(f,1400,.72));if(d.length>1500000)d=await toData(await shrink(f,1000,.6));if(!homePic.set(d))throw new Error("this browser won't save it");renderTop();toast('Header photo updated')}
  catch(e){toast("Couldn't use that photo: "+(e?.message||'try another'))}});
// ---- Drawn landscape covers ----
const SCN={
road:['Night road',`<defs><linearGradient id="sg-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#131d40"/><stop offset="1" stop-color="#5f7fc4"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-road)"/><g fill="#fff" opacity=".8"><circle cx="40" cy="30" r="1.2"/><circle cx="120" cy="18" r="1"/><circle cx="210" cy="40" r="1.3"/><circle cx="260" cy="14" r="1"/><circle cx="370" cy="32" r="1.2"/><circle cx="90" cy="60" r=".9"/></g><circle cx="318" cy="78" r="26" fill="#e9efff"/><path d="M0 150 L60 118 L120 140 L190 104 L260 136 L330 112 L400 132 V220 H0Z" fill="#33508f"/><path d="M0 170 Q100 150 200 162 T400 158 V220 H0Z" fill="#1b2d5c"/><path d="M188 162 H212 L262 220 H138Z" fill="#0d1630"/><path d="M199 170 h2 v10 h-2z M198.4 188 h3.2 v14 h-3.2z" fill="#f4f6ff"/>`],
city:['City',`<defs><linearGradient id="sg-city" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2f6e"/><stop offset=".6" stop-color="#c8668a"/><stop offset="1" stop-color="#f7a36a"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-city)"/><circle cx="300" cy="120" r="30" fill="#ffd9a0" opacity=".9"/><g fill="#3a2f63"><rect x="10" y="120" width="34" height="100"/><rect x="50" y="96" width="28" height="124"/><rect x="84" y="130" width="40" height="90"/><rect x="132" y="70" width="26" height="150"/><path d="M145 40 L150 70 H140Z"/><rect x="166" y="110" width="44" height="110"/><rect x="218" y="86" width="30" height="134"/><rect x="256" y="124" width="38" height="96"/><rect x="300" y="100" width="28" height="120"/><rect x="336" y="134" width="56" height="86"/></g><g fill="#ffd27a" opacity=".85"><rect x="56" y="106" width="4" height="5"/><rect x="66" y="120" width="4" height="5"/><rect x="138" y="84" width="4" height="5"/><rect x="146" y="104" width="4" height="5"/><rect x="138" y="130" width="4" height="5"/><rect x="176" y="122" width="5" height="5"/><rect x="192" y="140" width="5" height="5"/><rect x="226" y="98" width="4" height="5"/><rect x="236" y="124" width="4" height="5"/><rect x="306" y="112" width="4" height="5"/><rect x="316" y="140" width="4" height="5"/><rect x="20" y="134" width="4" height="5"/><rect x="346" y="146" width="5" height="5"/></g><path d="M0 178 H400 V220 H0Z" fill="#1d1840"/><g fill="#2a2257"><rect x="0" y="160" width="60" height="22"/><rect x="70" y="150" width="50" height="32"/><rect x="190" y="156" width="70" height="26"/><rect x="300" y="164" width="100" height="18"/></g>`],
beach:['Beach',`<defs><linearGradient id="sg-beach" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb8ec"/><stop offset="1" stop-color="#d9f2fc"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-beach)"/><circle cx="318" cy="56" r="22" fill="#fff6cf"/><path d="M0 124 H400 V170 H0Z" fill="#1f8fc9"/><path d="M0 134 H400 V140 H0Z" fill="#4fb3e3" opacity=".7"/><path d="M0 160 Q100 150 200 158 T400 152 V170 H0Z" fill="#8fd3ee"/><path d="M0 168 Q110 152 220 162 T400 156 V220 H0Z" fill="#f2d9a2"/><path d="M0 190 Q140 176 260 188 T400 184 V220 H0Z" fill="#e8c98a"/><path d="M74 196 Q70 150 92 104" fill="none" stroke="#6e4b2a" stroke-width="6" stroke-linecap="round"/><g fill="#2f9a57"><path d="M92 104 Q66 92 46 108 Q70 100 92 106Z"/><path d="M92 104 Q118 90 138 104 Q114 98 92 106Z"/><path d="M92 104 Q80 78 60 74 Q78 88 90 106Z"/><path d="M92 104 Q106 78 126 76 Q106 90 94 106Z"/><path d="M92 104 Q92 82 98 66 Q96 86 94 106Z"/></g>`],
snow:['Snow',`<defs><linearGradient id="sg-snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb6e6"/><stop offset="1" stop-color="#e9f2fc"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-snow)"/><path d="M0 140 L70 70 L130 120 L200 50 L270 112 L330 64 L400 118 V220 H0Z" fill="#a9bedb"/><path d="M200 50 L222 72 L210 70 L200 80 L190 68 L180 72Z M70 70 L86 86 L76 84 L68 92 L60 84Z M330 64 L348 82 L338 80 L328 88 L318 80Z" fill="#fff"/><path d="M0 170 L90 104 L170 158 L250 96 L340 150 L400 120 V220 H0Z" fill="#7189b0"/><path d="M90 104 L112 120 L100 118 L90 128 L80 118 L70 120Z M250 96 L274 114 L262 112 L250 122 L238 112 L226 116Z" fill="#fff"/><path d="M0 178 Q120 160 240 176 T400 168 V220 H0Z" fill="#f6f9fd"/><g fill="#2e5a48"><path d="M40 184 L52 150 L64 184Z"/><path d="M58 186 L68 160 L78 186Z"/><path d="M300 178 L313 140 L326 178Z"/><path d="M322 182 L332 154 L342 182Z"/><path d="M350 176 L358 156 L366 176Z"/></g><g fill="#fff" opacity=".9"><circle cx="30" cy="40" r="2"/><circle cx="120" cy="30" r="1.6"/><circle cx="160" cy="80" r="1.8"/><circle cx="290" cy="36" r="2"/><circle cx="370" cy="60" r="1.6"/><circle cx="240" cy="20" r="1.4"/></g>`],
lake:['Lake',`<defs><linearGradient id="sg-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd2ef"/><stop offset="1" stop-color="#eef8fb"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-lake)"/><path d="M0 118 L80 66 L150 104 L230 58 L310 100 L400 70 V140 H0Z" fill="#8aaec4"/><g fill="#2f6b52"><path d="M0 140 L10 110 L20 140Z"/><path d="M16 140 L28 100 L40 140Z"/><path d="M36 140 L46 114 L56 140Z"/><path d="M290 140 L302 106 L314 140Z"/><path d="M310 140 L322 96 L334 140Z"/><path d="M330 140 L341 112 L352 140Z"/><path d="M348 140 L360 102 L372 140Z"/><path d="M368 140 L380 116 L392 140Z"/><path d="M384 140 L394 108 L404 140Z"/></g><path d="M0 140 H400 V220 H0Z" fill="#3f88b3"/><g stroke="#8cc4e0" stroke-width="2" stroke-linecap="round" opacity=".8"><path d="M40 160 h60"/><path d="M150 176 h90"/><path d="M280 162 h50"/><path d="M90 196 h70"/><path d="M260 200 h80"/></g><path d="M0 206 Q100 196 180 208 T400 204 V220 H0Z" fill="#4f8f48"/>`],
desert:['Desert',`<defs><linearGradient id="sg-desert" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4a95c"/><stop offset="1" stop-color="#fde6c2"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-desert)"/><circle cx="110" cy="70" r="30" fill="#fff3d8"/><path d="M230 134 Q236 108 262 104 H330 Q352 106 358 134Z" fill="#b5502c"/><path d="M0 150 Q90 120 180 146 T400 138 V220 H0Z" fill="#e3a05a"/><path d="M0 176 Q120 146 250 172 T400 166 V220 H0Z" fill="#d4843f"/><path d="M0 200 Q140 178 280 198 T400 194 V220 H0Z" fill="#c06c2d"/><g fill="#4f7a3a"><path d="M66 186 v-34 a5 5 0 0 1 10 0 v34Z"/><path d="M66 172 h-8 v-12 a4 4 0 0 1 8 0Z"/><path d="M76 166 h8 v-10 a4 4 0 0 0 -8 0Z"/></g>`],
country:['Countryside',`<defs><linearGradient id="sg-country" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fcdf2"/><stop offset="1" stop-color="#e7f6ff"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-country)"/><g fill="#fff" opacity=".9"><ellipse cx="90" cy="46" rx="30" ry="10"/><ellipse cx="110" cy="40" rx="20" ry="10"/><ellipse cx="290" cy="60" rx="34" ry="10"/></g><path d="M0 130 Q100 90 200 124 T400 110 V220 H0Z" fill="#9ccc72"/><path d="M0 160 Q120 120 250 156 T400 146 V220 H0Z" fill="#6fae4e"/><g stroke="#5c9a3f" stroke-width="3" opacity=".6"><path d="M150 168 Q220 158 300 172"/><path d="M140 182 Q220 172 310 186"/><path d="M130 196 Q220 186 320 200"/></g><path d="M0 196 Q140 176 260 196 T400 190 V220 H0Z" fill="#4c8b39"/><g><rect x="318" y="118" width="4" height="16" fill="#6e4b2a"/><circle cx="320" cy="112" r="12" fill="#3d7d33"/><rect x="58" y="138" width="4" height="14" fill="#6e4b2a"/><circle cx="60" cy="132" r="10" fill="#3d7d33"/></g><path d="M212 116 h22 v14 h-22Z" fill="#f3efe6"/><path d="M208 117 L223 106 L238 117Z" fill="#b5502c"/>`],
tropic:['Tropical sunset',`<defs><linearGradient id="sg-tropic" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4ea3"/><stop offset=".55" stop-color="#ff8a66"/><stop offset="1" stop-color="#ffd08a"/></linearGradient></defs><rect width="400" height="220" fill="url(#sg-tropic)"/><circle cx="200" cy="140" r="38" fill="#ffe3a3"/><path d="M0 140 H400 V220 H0Z" fill="#2d5b8e"/><g stroke="#ffcf8f" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M170 152 h60"/><path d="M180 166 h40"/><path d="M190 180 h20"/></g><path d="M250 146 Q300 120 360 140 Q340 150 250 146Z" fill="#3a2440"/><path d="M318 140 Q314 112 326 86" fill="none" stroke="#3a2440" stroke-width="4" stroke-linecap="round"/><g fill="#3a2440"><path d="M326 86 Q306 78 290 90 Q308 84 326 88Z"/><path d="M326 86 Q346 76 362 88 Q344 82 326 88Z"/><path d="M326 86 Q318 66 302 62 Q316 74 324 88Z"/><path d="M326 86 Q336 66 352 64 Q338 76 328 88Z"/></g>`]};
const scnSvg=(k,cls)=>SCN[k]?`<svg class="${cls||'covsvg'}" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${SCN[k][1]}</svg>`:'';
// ---- Last active date in the trip list ----
var LAST=(()=>{try{return JSON.parse(localStorage.getItem('es-last')||'{}')||{}}catch(e){return {}}})(),LASTQ={};
const saveLast=()=>{try{localStorage.setItem('es-last',JSON.stringify(LAST))}catch(e){}};
function lastLabel(ms){if(!ms)return '';const d=new Date(ms),n=new Date(),day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((day(n)-day(d))/864e5);
  if(diff<=0)return 'Active today';if(diff===1)return 'Active yesterday';if(diff<7)return `Active ${diff} days ago`;
  return 'Active '+d.toLocaleDateString('en-AU',{day:'numeric',month:'short',...(d.getFullYear()!==n.getFullYear()?{year:'numeric'}:{})})}
function lastFor(id,fb){if(!LASTQ[id]){LASTQ[id]=1;lastFetch(id).then(ms=>{if(ms>(LAST[id]||0)){LAST[id]=ms;saveLast();if(!S.tid)render()}}).catch(()=>{})}return Math.max(LAST[id]||0,num(fb))}
const lastHtml=(id,fb)=>{const l=lastLabel(lastFor(id,fb));return l?`<small class="last">${esc(l)}</small>`:''};
function noteLast(){if(!S.tid)return;const m=Math.max(0,...S.exp.map(e=>Math.max(num(e.createdAt),num(e.updatedAt))),...(S.log||[]).map(l=>num(l.t)));if(m>(LAST[S.tid]||0)){LAST[S.tid]=m;saveLast()}}
function latestIn(path,field){return new Promise(res=>{let best=0,done=false,un=null;const fin=()=>{if(done)return;done=true;res(best);setTimeout(()=>un&&un(),0)};
  try{un=onSnapshot(query(collection(S.fs,path),orderBy(field,'desc'),limit(1)),{includeMetadataChanges:true},s=>{const d=s.docs[0]?.data();if(d)best=Math.max(best,num(d[field]),num(d.updatedAt));if(!s.metadata.fromCache)fin()},()=>fin())}catch(e){fin()}setTimeout(fin,6000)})}
async function lastFetch(id){const [a,b]=await Promise.all([latestIn(`trips/${id}/log`,'t'),latestIn(`trips/${id}/expenses`,'createdAt')]);return Math.max(a,b)}
// ---- Quick delete: swipe a row left, or select several ----
var SEL=null,SWX=null;
function delExps(ids){const tid=S.tid,gone=S.exp.filter(e=>ids.includes(e.id));if(!gone.length)return;
  for(const e of gone)ddoc(`trips/${tid}/expenses/${e.id}`);
  const tot=gone.reduce((s,e)=>s+eCents(e),0),one=gone.length===1;
  logAct(one?`deleted ${gone[0].desc||'an expense'} (${fc(tot)})`:`deleted ${gone.length} expenses (${fc(tot)})`);
  let undone=false;undoToast(one?'Expense deleted':`${gone.length} expenses deleted`,()=>{undone=true;for(const e of gone){const {id,...body}=e;wdoc(`trips/${tid}/expenses/${id}`,body)}logAct(one?`restored ${gone[0].desc||'an expense'}`:`restored ${gone.length} expenses`)});
  setTimeout(()=>{if(!undone)for(const e of gone)dropRc(tid,e.id,e.receipt)},7600)}
const selBar=()=>SEL?`<div class="selbar"><button type="button" class="btn danger" data-act="sel-del"${SEL.size?'':' disabled'}>${SEL.size?`Delete ${SEL.size} expense${SEL.size>1?'s':''}`:'Tick expenses to delete'}</button></div>`:'';
const selTop=()=>SEL?`<span class="selc">${SEL.size} selected</span><button type="button" class="btn small" data-act="sel-all">${SEL.size===S.exp.length?'Clear':'Select all'}</button><button type="button" class="btn small" data-act="sel-off">Done</button>`:`<button type="button" class="btn small chipb" data-act="sel-on"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.6 2.6L16 9.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Select</button>`;
function closeSwipes(except){document.querySelectorAll('.swl.open').forEach(li=>{if(li!==except){li.classList.remove('open');const b=li.querySelector('.exp');if(b)b.style.transform=''}})}
document.addEventListener('click',ev=>{if(ev.target.closest?.('.back')&&SEL){SEL=null;document.body.classList.remove('selmode')}const b=ev.target.closest?.('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='tab'&&SEL){SEL=null;document.body.classList.remove('selmode')}
  if(a==='sel-on'){SEL=new Set();document.body.classList.add('selmode');render()}
  else if(a==='sel-off'){SEL=null;document.body.classList.remove('selmode');render()}
  else if(a==='sel-all'&&SEL){SEL=SEL.size===S.exp.length?new Set():new Set(S.exp.map(e=>e.id));render()}
  else if(a==='sel-del'&&SEL?.size){const ids=[...SEL];SEL=null;document.body.classList.remove('selmode');delExps(ids);render()}
  else if(a==='sw-del'){ev.stopImmediatePropagation();delExps([b.dataset.id])}
  else if(a==='edit'){if(SWX?.moved){ev.stopImmediatePropagation();ev.preventDefault();return}
    const li=b.closest('.swl');if(li?.classList.contains('open')){ev.stopImmediatePropagation();closeSwipes();return}
    if(SEL){ev.stopImmediatePropagation();const id=b.dataset.id;SEL.has(id)?SEL.delete(id):SEL.add(id);render()}}},true);
document.addEventListener('pointerdown',ev=>{const b=ev.target.closest?.('.swl .exp');if(!b||SEL||ev.button>0){if(!ev.target.closest?.('.swl'))closeSwipes();return}
  const li=b.closest('.swl');closeSwipes(li);SWX={b,li,x0:ev.clientX,y0:ev.clientY,base:li.classList.contains('open')?-88:0,dx:0,moved:false,lock:null}});
document.addEventListener('pointermove',ev=>{if(!SWX)return;const dx=ev.clientX-SWX.x0,dy=ev.clientY-SWX.y0;
  if(!SWX.lock){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;SWX.lock=Math.abs(dx)>Math.abs(dy)?'x':'y'}
  if(SWX.lock!=='x')return;SWX.moved=true;SWX.dx=Math.max(-120,Math.min(0,SWX.base+dx));SWX.b.style.transition='none';SWX.b.style.transform=`translateX(${SWX.dx}px)`});
const swEnd=()=>{if(!SWX)return;const s=SWX;s.b.style.transition='';if(s.moved){const open=s.dx<-44;s.li.classList.toggle('open',open);s.b.style.transform=open?'translateX(-88px)':''}
  setTimeout(()=>{if(SWX===s)SWX=null},0)};
document.addEventListener('pointerup',swEnd);document.addEventListener('pointercancel',swEnd);
// ---- Several payers on one expense ----
const paidOf=(e,c)=>{const p=e.payers;if(p&&typeof p==='object'){const w={};for(const k in p){const v=num(p[k]);if(v>0)w[k]=v}if(Object.keys(w).length)return alloc(c,w)}return {[e.paidBy]:c}};
const nameList=a=>a.length<=1?(a[0]||''):a.length>3?`${a.length} people`:a.slice(0,-1).join(', ')+' and '+a[a.length-1];
function payLabel(e,me){const ids=e.payers?Object.keys(e.payers).filter(k=>num(e.payers[k])>0):[];if(ids.length<2)return e.paidBy===me?'You':mname(e.paidBy);
  return nameList(ids.sort((a,b)=>(a===me?-1:b===me?1:0)).map(k=>k===me?'You':mname(k)))}
function payersBlock(){if(!F.multi)return '';return `<div class="payers"><span class="imlbl">How much each person paid</span>${members().map(m=>`<label class="prow payrow"><span>${esc(m.name)}</span><input class="payin" data-id="${esc(m.id)}" inputmode="decimal" value="${esc(F.payers?.[m.id]??'')}" placeholder="0"><em>${esc(F.cur)}</em></label>`).join('')}<p class="hint" id="f-payleft"></p></div>`}
function payHint(){const el=$('#f-payleft');if(!el||!F?.multi)return;const a=F.mode==='items'?itemMath().total:num(F.amount),sum=members().reduce((s,m)=>s+Math.max(0,num(F.payers?.[m.id])),0),d=Math.round((a-sum)*100)/100;
  el.innerHTML=!(a>0)?'Enter the amount first':Math.abs(d)<0.005?'<b>All paid for</b>':d>0?`<b>${esc(money(d,F.cur))}</b> still to assign`:`<b>${esc(money(-d,F.cur))}</b> too much`}
function payersCheck(amount){if(!F.multi)return {};const w={};for(const m of members()){const v=num(F.payers?.[m.id]);if(v>0)w[m.id]=Math.round(v*100)/100}
  const ids=Object.keys(w);if(!ids.length)return {err:'Enter how much each person paid.'};const sum=Object.values(w).reduce((s,v)=>s+v,0);
  if(Math.abs(sum-amount)>0.005)return {err:`The payments add up to ${money(sum,F.cur)}, not ${money(amount,F.cur)}.`};
  const top=ids.reduce((a,b)=>w[b]>w[a]?b:a,ids[0]);return ids.length>1?{payers:w,top}:{top}}
// ---- Live exchange rates (European Central Bank via Frankfurter, with a fallback) ----
const FXC={};
function fxRate(cur,date){const h=home();if(!cur||cur===h)return Promise.resolve(null);const d=/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&date<today()?date:'latest',k=`${cur}>${h}@${d}`;if(FXC[k])return FXC[k];
  const p=(async()=>{try{const r=await fetch(`https://api.frankfurter.dev/v1/${d}?base=${cur}&symbols=${h}`);if(r.ok){const j=await r.json(),v=num(j?.rates?.[h]);if(v>0)return {rate:+v.toPrecision(5),date:j.date||today()}}}catch(e){}
    try{const r=await fetch(`https://open.er-api.com/v6/latest/${cur}`);if(r.ok){const j=await r.json(),v=num(j?.rates?.[h]);if(v>0)return {rate:+v.toPrecision(5),date:today()}}}catch(e){}return null})();
  FXC[k]=p;p.then(v=>{if(!v)delete FXC[k]});return p}
async function fxFill(){if(!F||F.cur===home())return;const mine=F,cur=F.cur,date=F.date;const el=$('#f-fx');if(el&&!el.textContent)el.textContent='Checking the live rate…';
  const r=await fxRate(cur,date);if(F!==mine||F.cur!==cur||F.date!==date)return;const box=$('#f-fx');if(!box)return;if(!r){box.textContent='';return}
  if(F.rateAuto||!num(F.rate)){F.rate=String(r.rate);F.rateAuto=true;const i=$('#f-rate');if(i)i.value=F.rate;hints()}
  const lab=!(date<today())?(r.date===today()?'Live rate today':`Latest live rate (${fmtDate(r.date)})`):`Live rate for ${fmtDate(r.date)}`;
  box.innerHTML=Math.abs(num(F.rate)-r.rate)<1e-9?esc(lab):`${esc(lab)}: ${r.rate} <button type="button" class="btn small" data-act="fx-use" data-r="${r.rate}">Use it</button>`}
// ---- Settle-up summary for the group chat ----
function settleText(){const {net}=calc(),plan=settle(net),lines=[`${S.trip.name}: who pays whom`];
  if(!plan.length)lines.push('Everyone is square. Nothing to pay.');
  for(const p of plan)lines.push(`• ${mname(p.from)} pays ${mname(p.to)} ${fc(p.c)}`);
  const tos=[...new Set(plan.map(p=>p.to))].filter(id=>payOf(id));if(tos.length){lines.push('');for(const id of tos)lines.push(`${mname(id)}'s details: ${payOf(id)}`)}
  const spent=S.exp.reduce((s,e)=>s+Math.max(0,eCents(e)),0);lines.push('',`Total spent ${fc(spent)} across ${S.exp.length} expense${S.exp.length===1?'':'s'}.`);
  if(typeof tripUrl==='function')lines.push(`Details: ${tripUrl(S.tid)}`);return lines.join('\n')}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(e2){return false}}}
document.addEventListener('click',async ev=>{const b=ev.target.closest?.('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='copysum'){const ok=await copyText(settleText());toast(ok?'Copied. Paste it in your group chat':"Couldn't copy on this device")}
  else if(a==='sharesum'){try{await navigator.share({text:settleText()})}catch(e){}}
  else if(a==='fx-use'&&F){F.rate=b.dataset.r;F.rateAuto=true;const i=$('#f-rate');if(i)i.value=F.rate;hints();fxFill()}});
// ---- Named extras on an itemised bill ----
function syncX(){const t=Math.round((F?.xs||[]).reduce((s,x)=>s+num(x.a),0)*100)/100;if(F)F.extra=t?String(t):''}
document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-act]');if(!b||!F)return;const a=b.dataset.act;
  if(a==='xadd'){F.xs=F.xs||[];F.xs.push({n:'',a:''});renderForm();const ns=document.querySelectorAll('.xname');ns[ns.length-1]?.focus()}
  else if(a==='xdel'){F.xs.splice(+b.dataset.j,1);syncX();renderForm()}});
// ---- Edit history for each expense ----
const MODEN={equal:'equally',items:'by items',exact:'by amounts',nights:'by nights',percent:'by %',shares:'by shares'};
const whenTxt=ms=>{try{return new Date(ms).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return ''}};
const payTxt=e=>{const p=e?.payers&&Object.keys(e.payers).filter(k=>num(e.payers[k])>0);return p&&p.length>1?p.map(k=>`${mname(k)} ${money(num(e.payers[k]),e.cur)}`).join(', '):mname(e?.paidBy)};
function histDiff(o,n){const ch=[];if(!o)return ch;
  if((o.desc||'')!==(n.desc||''))ch.push(`Description “${o.desc||''}” → “${n.desc||''}”`);
  if(num(o.amount)!==num(n.amount)||o.cur!==n.cur)ch.push(`Amount ${money(num(o.amount),o.cur)} → ${money(num(n.amount),n.cur)}`);
  else if(o.cur!==home()&&num(o.rate)!==num(n.rate))ch.push(`Exchange rate ${num(o.rate)} → ${num(n.rate)}`);
  if(payTxt(o)!==payTxt(n))ch.push(`Paid by ${payTxt(o)} → ${payTxt(n)}`);
  if((o.date||'')!==(n.date||''))ch.push(`Date ${fmtDate(o.date)} → ${fmtDate(n.date)}`);
  const om=o.split?.mode||'equal',nm=n.split?.mode||'equal';
  if(om!==nm)ch.push(`Split ${MODEN[om]||om} → ${MODEN[nm]||nm}`);
  else if(nm==='items'){if(JSON.stringify(o.split?.items||[])!==JSON.stringify(n.split?.items||[]))ch.push('Items or who had them changed');if(JSON.stringify(o.split?.extras||[])!==JSON.stringify(n.split?.extras||[]))ch.push('Extra charges changed')}
  else{const a=Object.keys(weights(o)),b=Object.keys(weights(n)),add=b.filter(x=>!a.includes(x)),rem=a.filter(x=>!b.includes(x));
    if(add.length)ch.push(`Added ${add.map(mname).join(', ')} to the split`);if(rem.length)ch.push(`Took ${rem.map(mname).join(', ')} out of the split`);
    if(!add.length&&!rem.length&&nm!=='equal'&&JSON.stringify(o.split?.parts||{})!==JSON.stringify(n.split?.parts||{}))ch.push(nm==='nights'?'Nights changed':nm==='percent'?'Percentages changed':'Amounts changed')}
  if((o.note||'')!==(n.note||''))ch.push(!o.note?'Note added':!n.note?'Note removed':'Note changed');
  if(!!o.receipt!==!!n.receipt)ch.push(n.receipt?'Receipt added':'Receipt removed');
  return ch}
function withHist(body){if(!F?.id)return body;const old=S.exp.find(x=>x.id===F.id),prev=Array.isArray(old?.hist)?old.hist:[],ch=histDiff(old,body);
  body.hist=ch.length?[...prev,{t:Date.now(),by:S.me[S.tid]||null,ch}].slice(-30):prev;return body}
function histBlock(){if(!F?.id)return '';const e=S.exp.find(x=>x.id===F.id);if(!e)return '';const hs=Array.isArray(e.hist)?[...e.hist].reverse():[];
  const li=[];for(const h of hs)li.push(`<li><b>${esc(mname(h.by)||'Someone')}</b> <span class="hw">${esc(whenTxt(h.t))}</span><ul>${(h.ch||[]).map(c=>`<li>${esc(c)}</li>`).join('')}</ul></li>`);
  if(!hs.length&&num(e.updatedAt)>num(e.createdAt)+2000)li.push(`<li><b>${esc(mname(e.updatedBy)||'Someone')}</b> <span class="hw">${esc(whenTxt(e.updatedAt))}</span><ul><li>Edited (details weren't recorded before history was added)</li></ul></li>`);
  li.push(`<li><b>${esc(mname(e.createdBy)||'Someone')}</b> <span class="hw">${esc(whenTxt(e.createdAt))}</span><ul><li>Added this expense</li></ul></li>`);
  const n=hs.length;return `<details class="hist"><summary>History${n?` (${n} change${n===1?'':'s'})`:''}</summary><ul class="hl">${li.join('')}</ul></details>`}
// ---- Export all expenses as a CSV file ----
function csvCell(v){v=v==null?'':String(v);return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}
function exportCSV(){const ms=members(),h=home(),c2=c=>(c/100).toFixed(2),rows=[];
  rows.push(['Date','Description','Note','Paid by','Amount','Currency','Exchange rate',`Amount (${h})`,'Split',...ms.map(m=>`${m.name} share (${h})`)]);
  const tp={},ts={};const exps=[...S.exp].sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||0)-(b.createdAt||0));
  for(const e of exps){const c=eCents(e);if(!(c>0))continue;const sh=alloc(c,weights(e)),pd=paidOf(e,c);for(const k in pd)tp[k]=(tp[k]||0)+pd[k];for(const k in sh)ts[k]=(ts[k]||0)+sh[k];
    rows.push([e.date||'',e.desc||'',e.note||'',payTxt(e),num(e.amount).toFixed(curDp(e.cur||h)),e.cur||h,e.cur&&e.cur!==h?num(e.rate):'',c2(c),MODEN[e.split?.mode||'equal']||'',...ms.map(m=>sh[m.id]?c2(sh[m.id]):'')])}
  const pays=[...S.pay].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(pays.length){rows.push([]);rows.push(['Payments made']);for(const p of pays)rows.push([p.date||'',`${mname(p.from)} paid ${mname(p.to)}`,'','','','','',c2(num(p.cents))])}
  const {net}=calc();rows.push([]);
  rows.push(['','Total paid','','','','','','','',...ms.map(m=>c2(tp[m.id]||0))]);
  rows.push(['','Total share','','','','','','','',...ms.map(m=>c2(ts[m.id]||0))]);
  rows.push(['','Balance after payments (+ is owed, − owes)','','','','','','','',...ms.map(m=>c2(net[m.id]||0))]);
  const csv='﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),name=(S.trip.name||'trip').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')+'-expenses.csv';
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  try{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Spreadsheet downloaded')}
  catch(e){toast("Couldn't download on this device")}}
const exportView=()=>`<div class="sec"><h2>Export</h2><p class="hint" style="margin:-6px 0 10px">Download every expense as a CSV file that opens in Excel, Numbers or Google Sheets. It includes each person's share and the totals.</p><button type="button" class="btn" data-act="csv">Download spreadsheet (CSV)</button></div>`;
document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-act="csv"]');if(b&&S.trip)exportCSV()});
// ---- Trip accent colour across the trip's screens ----
const SCN_COL={road:'#2f4a8f',city:'#6a3d8f',beach:'#1f7fb8',snow:'#3f6fae',lake:'#2f7fa8',desert:'#b8612a',country:'#3f8f3a',tropic:'#c4503f'};
const hexRgb=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const rgbHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const lum=a=>{const c=a.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
function fitColour(hex,bg,dir){let a=hexRgb(hex);const b=hexRgb(bg);for(let i=0;i<20&&contrast(a,b)<4.5;i++)a=a.map(v=>dir<0?v*.9:v+(255-v)*.15);return rgbHex(a)}
function tripAccent(t,id){return /^#[0-9a-f]{6}$/i.test(t?.color||'')?t.color:SCN_COL[t?.scene]||tColor(t,id)}
function setAccent(hex){const r=document.documentElement.style;if(!hex){['--ochre','--teal','--acc-soft'].forEach(k=>r.removeProperty(k));return}
  const btn=fitColour(hex,'#ffffff',-1),dk=fitColour(hex,'#1c1c1e',1);r.setProperty('--ochre',btn);r.setProperty('--teal',`light-dark(${btn},${dk})`);r.setProperty('--acc-soft',`color-mix(in srgb,${btn} 12%,transparent)`)}
// ---- Expense type icons ----
const ECAT={
  food:['Food','#e0673a','<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V3M17 21V3c-2 1-3 4-3 8h3"/>'],
  drinks:['Drinks','#2f6fde','<path d="M5 8h11v5a5.5 5.5 0 0 1-11 0z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2"/>'],
  groceries:['Groceries','#2e9d6a','<path d="M3 4h2l2.5 11h10l2-8H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>'],
  transport:['Transport','#14919f','<path d="M5 16h14v-4l-2-5H7l-2 5zM5 12h14"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>'],
  stay:['Accommodation','#8a5cd1','<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>'],
  fun:['Activities','#d4477a','<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 8v1.5M14 11.5v1M14 14.5V16"/>'],
  shop:['Shopping','#c48a1c','<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>'],
  other:['Other','#5d6984','<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>']};
const ECAT_RE=[
  ['stay',/airbnb|hotel|motel|hostel|booking\.com|stayz|lodge|chalet|resort|accommodation|apartment|ryokan|\brent\b|cabin|nights?\b/],
  ['transport',/uber|didi|ola\b|taxi|cab\b|fuel|petrol|diesel|shell|caltex|ampol|\bbp\b|7-eleven fuel|train|metro|subway|bus\b|ferry|flight|airline|qantas|jetstar|virgin|rex\b|parking|toll|linkt|e-?toll|van\b|car hire|rental car|hertz|avis|budget|europcar|shinkansen|jr\b|suica|opal|myki|go card|transfer/],
  ['groceries',/woolworths|coles|aldi|\biga\b|harris farm|costco|supermarket|grocer|lawson|familymart|family mart|seven ?eleven|7-eleven|7 eleven|ministop|daily yamazaki|don quijote|aeon|market/],
  ['drinks',/\bbar\b|pub\b|brew|beer|wine|cellar|bottle|liquor|bws|dan murphy|cocktail|tavern|hotel bar|coffee|caf[eé]|espresso|latte|tea\b|juice|smoothie|kombucha|izakaya/],
  ['fun',/ticket|lift|ski|snowboard|lesson|tour|museum|gallery|entry|admission|park\b|onsen|spa\b|massage|cinema|movie|concert|festival|show\b|zoo|aquarium|surf|dive|kayak|golf|bowling|karaoke/],
  ['shop',/uniqlo|kmart|target|big w|myer|david jones|jb hi|apple|amazon|daiso|muji|shop|store|souvenir|clothing|pharmacy|chemist/],
  ['food',/dinner|lunch|breakfast|brunch|restaurant|cafe|bistro|kitchen|grill|pizza|burger|sushi|ramen|noodle|thai|indian|kebab|bakery|eat|food|takeaway|mcdonald|kfc|hungry jack|subway sandwich|menulog|deliveroo|doordash|uber ?eats|bayleaf|ducks|tacos/]];
function catOf(e){if(e.split?.mode==='items'&&Array.isArray(e.split.items)&&e.split.items.length){let f=0,d=0;for(const it of e.split.items){if((it.c||'food')==='drink')d+=num(it.p);else if((it.c||'food')==='food')f+=num(it.p)}if(f||d)return d>f?'drinks':'food'}
  const t=String(e.desc||'').toLowerCase()+' '+String(e.note||'').toLowerCase();if(/uber ?eats|menulog|deliveroo|doordash/.test(t))return 'food';for(const [k,re] of ECAT_RE)if(re.test(t))return k;return e.split?.mode==='nights'?'stay':'other'}
function catIcon(e){const k=catOf(e),[lab,col,path]=ECAT[k];return `<span class="eic" style="--ec:${col}" title="${lab}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>${av(e.paidBy,'xs')}</span>`}
// ---- Shrink long item names so the whole name fits ----
const fitCtx=document.createElement('canvas').getContext('2d');
function fitName(el){if(el.tagName==='TEXTAREA')return fitArea(el);el.style.fontSize='';const cs=getComputedStyle(el),fs=parseFloat(cs.fontSize)||16,txt=el.value||el.placeholder||'';
  fitCtx.font=`${cs.fontWeight} ${fs}px ${cs.fontFamily}`;const w=fitCtx.measureText(txt).width,avail=el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-2;
  if(w>avail&&avail>0)el.style.fontSize=(fs*Math.max(.8,avail/w)).toFixed(2)+'px';el.title=el.value||''}
// Item names are text boxes that wrap onto a second line (slightly smaller) when the name is long.
function fitArea(el){if(/\n/.test(el.value)){el.value=el.value.replace(/\s*\n+\s*/g,' ');el.dispatchEvent(new Event('input',{bubbles:true}))}
  el.style.fontSize='';el.style.lineHeight='';el.style.height='';el.style.marginBlock='';el.title=el.value||'';
  if(el.scrollHeight<=el.clientHeight+1)return;
  const cs=getComputedStyle(el);el.style.lineHeight='1.25';el.style.height='auto';
  const h=Math.max(parseFloat(cs.minHeight)||0,el.scrollHeight+2);el.style.height=h+'px';
  const m=/matrix\(([-\d.]+)/.exec(cs.transform||''),sc=m?parseFloat(m[1]):1;if(sc<1)el.style.marginBlock=(-(h*(1-sc))/2).toFixed(2)+'px'}
document.addEventListener('keydown',ev=>{const t=ev.target;if(ev.key==='Enter'&&t.tagName==='TEXTAREA'&&t.classList.contains('iname')){ev.preventDefault();t.closest('.icell')?.querySelector('.iprice')?.focus()}});
function fitNames(){document.querySelectorAll('.igrid .iname').forEach(fitName)}
document.addEventListener('input',ev=>{if(ev.target.classList?.contains('iname'))fitName(ev.target)});
window.addEventListener('resize',()=>{if(document.querySelector('.igrid'))fitNames()});
// ---- Trip tab: every section folds away, with a one-line summary showing when closed ----
var TOPEN=new Set();
const TDESC={'Activity':'Everything added, edited, deleted or paid back on this trip, newest first.','Getting friends in':'How to invite friends to this trip on claude.ai.','Invite friends':'Share the trip link so everyone can add their own expenses.'};
function collapseTrip(){if(S.tab!=='trip')return;document.querySelectorAll('#app .band > .sec:not(details)').forEach(sec=>{const h=sec.querySelector(':scope > h2');if(!h)return;
  const title=h.textContent.trim(),hint=h.nextElementSibling?.classList.contains('hint')?h.nextElementSibling:null,d=document.createElement('details'),sm=document.createElement('summary'),p=document.createElement('p'),body=document.createElement('div');
  d.className='sec tsec';d.open=TOPEN.has(title);p.className='tsum';if(hint){p.innerHTML=hint.innerHTML;hint.remove()}else p.textContent=TDESC[title]||'';
  sm.append(h,p);body.className='tbody';while(sec.firstChild)body.append(sec.firstChild);d.append(sm,body);
  d.addEventListener('toggle',()=>{d.open?TOPEN.add(title):TOPEN.delete(title)});sec.replaceWith(d)})}
const TABIC={exp:'<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  settle:'<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 4l4 4-4 4"/><path d="M20 16H6M10 12l-4 4 4 4"/></svg>',
  trip:'<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>'};
// ---- Trip colour and cover photo ----
const TCOL=[['#2f6fde','Blue'],['#e0673a','Orange'],['#2e9d6a','Green'],['#8a5cd1','Purple'],['#d4477a','Pink'],['#14919f','Teal'],['#c48a1c','Gold'],['#47546e','Slate']];
const tColor=(t,id)=>{if(/^#[0-9a-f]{6}$/i.test(t?.color||''))return t.color;let h=0;for(const c of String(id||''))h=(h*31+c.charCodeAt(0))>>>0;return TCOL[h%TCOL.length][0]};
var COV={};
function coverFor(tid,t){if(!t?.cover)return '';const c=COV[tid];if(c&&c.at===t.cover)return c.data;
  if(!c||!c.loading||c.want!==t.cover){const want=t.cover;COV[tid]={at:c?.at,data:c?.data||'',loading:true,want};
    covGet(tid).then(d=>{COV[tid]={at:want,data:d||''};if(S.tid===tid){renderTop();if(S.tab==='trip')render()}}).catch(()=>{COV[tid]={at:want,data:''}})}
  return COV[tid].data}
const tileFor=(id,t)=>`<span class="tico" style="--tc:${tColor(t,id)}" aria-hidden="true">${t?.thumb?`<img src="${esc(t.thumb)}" alt="">`:SCN[t?.scene]?scnSvg(t.scene,'tsvg'):esc((String(t?.name||'?').trim()[0]||'?').toUpperCase())}</span>`;
function paintTop(el,back){noteLast();setAccent(tripAccent(S.trip,S.tid));const c=tColor(S.trip,S.tid),cv=coverFor(S.tid,S.trip),sc=!cv&&SCN[S.trip.scene]?S.trip.scene:'';el.className='top tm'+(cv||sc?' hasimg':'');el.style.setProperty('--tc',c);
  el.innerHTML=`${cv?`<img class="covimg" src="${cv}" alt="">`:sc?scnSvg(sc):''}<div class="topin"><a class="back" href="${back}">All trips</a><h1>${esc(S.trip.name)}</h1></div>`}
var LOOKOPEN=false;document.addEventListener('toggle',e=>{if(e.target?.classList?.contains('looksec'))LOOKOPEN=e.target.open},true);
function lookView(){const t=S.trip,c=tColor(t,S.tid),cv=coverFor(S.tid,t),w=S.canWrite!==false,sc=!cv&&SCN[t.scene]?t.scene:'';
  return `<details class="sec looksec"${LOOKOPEN?' open':''}><summary><h2>Name, cover and colour</h2><p class="tsum">Rename the trip and choose its cover photo, landscape or colour. Now: ${esc(cv?'your photo':sc?SCN[sc][0]:'colour only')}.</p></summary><div class="card look">${w?`<form class="tnrow" id="tn-form"><input id="tn-name" value="${esc(t.name)}" maxlength="60" aria-label="Trip or group name" required><button class="btn small">Save name</button></form>`:''}<div class="lkprev${cv||sc?' pic':''}" style="--tc:${c}">${cv?`<img src="${cv}" alt="Cover photo">`:sc?scnSvg(sc,'lksvg'):''}<b>${esc(t.name)}</b></div>
    ${w?`<div class="lkrow"><label class="btn small file" id="cov-btn">${t.cover?'Change photo':'Add a cover photo'}<input type="file" accept="image/*" id="cov-file"></label>${t.cover?'<button type="button" class="btn small danger" data-act="cov-rm">Remove photo</button>':''}</div>
    <div class="scnpick" role="radiogroup" aria-label="Landscape"><span class="imlbl">Or pick a landscape</span><div class="scngrid">${Object.entries(SCN).map(([k,[n]])=>`<button type="button" class="scnb${!cv&&t.scene===k?' on':''}" data-act="cov-scn" data-k="${k}" role="radio" aria-checked="${!cv&&t.scene===k}">${scnSvg(k,'mini')}<span>${n}</span></button>`).join('')}<button type="button" class="scnb none${!cv&&!sc?' on':''}" data-act="cov-scn" data-k="" role="radio" aria-checked="${!cv&&!sc}"><i style="background:${c}"></i><span>Just colour</span></button></div></div>
    <div class="swatches" role="radiogroup" aria-label="Trip colour">${TCOL.map(([h,n])=>`<button type="button" class="sw${h===c?' on':''}" style="--sw:${h}" data-act="cov-col" data-c="${h}" role="radio" aria-checked="${h===c}" aria-label="${n}"></button>`).join('')}</div>
    <p class="hint">The colour is used for the trip's tile, and behind the name when there's no photo or landscape.</p>`:''}</div></details>`}
document.addEventListener('click',async ev=>{const b=ev.target.closest?.('[data-act]');if(!b||!S.trip)return;const a=b.dataset.act;
  if(a==='cov-col'){await tripSave({color:b.dataset.c});render()}
  else if(a==='cov-scn'){const k=b.dataset.k||'',tid=S.tid;if(S.trip.cover){try{await covDel(tid)}catch(e){}COV[tid]={at:0,data:''}}await tripSave({scene:k,cover:0,thumb:''});render()}
  else if(a==='cov-rm'){const tid=S.tid;try{await covDel(tid)}catch(e){}COV[tid]={at:0,data:''};await tripSave({cover:0,thumb:''});toast('Cover photo removed');render()}});
document.addEventListener('submit',async ev=>{if(ev.target.id!=='tn-form')return;ev.preventDefault();ev.stopImmediatePropagation();const v=($('#tn-name')?.value||'').trim();if(!v)return toast('Enter a name');if(v===S.trip.name)return toast('Name saved');await tripSave({name:v});logAct(`renamed the trip to ${v}`);toast('Name saved');render()},true);
document.addEventListener('change',async ev=>{const t=ev.target;if(t.id!=='cov-file'||!t.files?.[0]||!S.trip)return;const f=t.files[0],tid=S.tid,lb=$('#cov-btn');t.value='';
  if(lb)lb.firstChild.textContent='Adding photo…';
  try{let b=await shrink(f,1600,.75);if(b.size>520000)b=await shrink(f,1200,.65);if(b.size>520000)b=await shrink(f,900,.55);const data=await toData(b),thumb=await toData(await shrink(f,160,.7));
    if(data.length>900000)throw new Error('the photo is too large');await covSet(tid,data);const at=Date.now();COV[tid]={at,data};await tripSave({cover:at,thumb,scene:''});toast('Cover photo added');render()}
  catch(e){console.error(e);toast("Couldn't use that photo: "+(e?.message||'try another'));render()}});
const covGet=async tid=>{const s=await getDoc(doc(S.fs,`trips/${tid}/receipts/cover`));return s.exists()?s.data().data:''};
const covSet=async(tid,data)=>{put(`trips/${tid}/receipts/cover`,{data})};
const covDel=async tid=>{del(`trips/${tid}/receipts/cover`)};
const eCents=e=>Math.round(num(e.amount)*(e.cur===home()?1:num(e.rate))*100);
const weights=e=>{const p=e.split?.parts||{},w={};for(const k in p){const v=num(p[k]);if(v>0)w[k]=v}return w};
function alloc(total,w){const ids=Object.keys(w).filter(k=>w[k]>0),sum=ids.reduce((a,k)=>a+w[k],0),out={};if(!sum||total<=0)return out;let used=0;const rem=[];
  for(const k of ids){const x=total*w[k]/sum,f=Math.floor(x);out[k]=f;used+=f;rem.push([x-f,k])}
  rem.sort((a,b)=>b[0]-a[0]);for(let i=0;i<total-used;i++)out[rem[i%rem.length][1]]++;return out}
function calc(){const net={},share={};let spent=0;members().forEach(m=>{net[m.id]=0;share[m.id]=0});
  for(const e of S.exp){const c=eCents(e);if(!(c>0))continue;spent+=c;{const pd=paidOf(e,c);for(const k in pd)net[k]=(net[k]||0)+pd[k]}const o=alloc(c,weights(e));for(const k in o){net[k]=(net[k]||0)-o[k];share[k]=(share[k]||0)+o[k]}}
  for(const p of S.pay){const c=Math.round(num(p.cents));net[p.from]=(net[p.from]||0)+c;net[p.to]=(net[p.to]||0)-c}
  return{net,share,spent}}
function settle(net){const cr=[],dr=[];for(const k in net){if(net[k]>0)cr.push([k,net[k]]);else if(net[k]<0)dr.push([k,-net[k]])}
  cr.sort((a,b)=>b[1]-a[1]);dr.sort((a,b)=>b[1]-a[1]);const out=[];let i=0,j=0;
  while(i<dr.length&&j<cr.length){const x=Math.min(dr[i][1],cr[j][1]);if(x>0)out.push({from:dr[i][0],to:cr[j][0],c:x});dr[i][1]-=x;cr[j][1]-=x;if(!dr[i][1])i++;if(!cr[j][1])j++}
  return out}
const nDiff=(f,t)=>f&&t?Math.round((Date.parse(t+'T00:00Z')-Date.parse(f+'T00:00Z'))/864e5):NaN,dShort=d=>{try{return new Date(d+'T00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short'})}catch(e){return d}};
const nWarn=(f,t)=>f===t?'Pick a later end date: that\'s 0 nights':`${dShort(t)} is before ${dShort(f)}. Check the month.`;
const fmtDate=d=>{try{return new Date(d+'T00:00').toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'})}catch(e){return d}};
function toast(t){const el=$('#toast');el.textContent=t;el.classList.remove('act');el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2800)}

// Writes are not awaited: with no signal Firebase keeps them on the phone and sends them later.
const failed=e=>{console.warn(e);toast(e?.code==='permission-denied'?"Couldn't save: access denied.":"Couldn't save. Try again.")};
const put=(path,data)=>setDoc(doc(S.fs,path),data).catch(failed);
const del=path=>deleteDoc(doc(S.fs,path)).catch(failed);
// Only mention syncing when it's actually held up (no signal, or a write waiting more than a few seconds).
let syncT=null;
function syncBadge(){const p=Object.values(S.pending).some(Boolean),b=$('#sync'),off=!navigator.onLine;
  const show=()=>{b.hidden=false;b.textContent=p?'Saved on this phone. Will sync when you have signal.':'No signal. Showing saved data.'};
  if(!p&&!off){clearTimeout(syncT);syncT=null;b.hidden=true;return}
  if(off)return show();if(b.hidden&&!syncT)syncT=setTimeout(()=>{syncT=null;if(Object.values(S.pending).some(Boolean))show()},4000)}

function renderTop(){const t=$('#top');
  if(S.tid&&S.trip){const me=S.me[S.tid],{net,share,spent}=calc(),n=me?net[me]||0:0;
    const lab=!me?'Trip total':n>0?"You're owed":n<0?'You owe':"You're all square";
    paintTop(t,'./');
    $('#hcard').innerHTML=`<p class="bal1"><span>${lab}</span><b class="big ${me&&n>0?'pos':me&&n<0?'neg':''}">${fc(me?Math.abs(n):spent)}</b></p><p class="bal2">${me?`Your share is ${fc(share[me]||0)} of ${fc(spent)} spent`:`${fc(spent)} spent`} across ${S.exp.length} expense${S.exp.length===1?'':'s'}.</p>`;$('#hcard').hidden=false;
  }else{paintHome(t);$('#hcard').hidden=true}}

function render(){renderTop();syncBadge();const a=$('#app'),fab=$('#fab');fab.hidden=true;
  if(S.setup){a.innerHTML=`<section class="band"><div class="empty"><h2>Almost ready</h2><p class="muted">Paste your Firebase config into <b>firebase-config.js</b>, then upload the folder again.</p></div></section>`;return}
  if(!S.tid){a.innerHTML=homeView();return}
  if(!S.trip){a.innerHTML=`<section class="band"><p class="muted">${S.tripMissing?"This trip link doesn't work. Check you have the whole link.":S.stale?"Can't reach this trip yet. Check your signal.":'Loading trip…'}</p><a class="btn" href="./">All trips</a></section>`;return}
  const me=S.me[S.tid];
  if(!me||!members().some(m=>m.id===me)){a.innerHTML=`<section class="band who"><h2>Who are you?</h2><p class="muted">Pick your name so new expenses default to you. You can change it later.</p><div class="chips">${members().map(m=>`<button type="button" class="chip" data-act="iam" data-id="${esc(m.id)}">${av(m.id)}${esc(m.name)}</button>`).join('')}</div></section>`;return}
  const tabs=[['exp','Expenses'],['settle','Settle up'],['trip','Settings']];
  a.innerHTML=`<nav class="tabs">${tabs.map(([k,l])=>`<button type="button" data-act="tab" data-tab="${k}" aria-current="${S.tab===k}">${TABIC[k]||''}<span>${l}</span></button>`).join('')}</nav>`+
    (S.tab==='exp'?expView():S.tab==='settle'?settleView():tripView());
  fab.hidden=S.tab==='trip';collapseTrip()}

const pRow=first=>`<li><input name="members" maxlength="30" placeholder="${first?'Your name':'Name'}" autocomplete="off" aria-label="${first?'Your name':'Person'}"><button type="button" class="x" data-act="prm" aria-label="Remove">×</button></li>`;
function addPerson(after){const ul=$('#plist');if(!ul)return;const t=document.createElement('template');t.innerHTML=pRow(false);const li=t.content.firstChild;after?after.after(li):ul.append(li);li.querySelector('input').focus()}
function homeView(){const list=Object.entries(S.recent).sort((a,b)=>(b[1].at||0)-(a[1].at||0)).map(([id,t])=>`<a class="trip" href="?trip=${esc(id)}">${tileFor(id,t)}<b>${esc(t.name||'Trip')}</b><span>${esc(t.people||'')}</span><span class="cur">${esc(t.home||'')}${lastHtml(id,t.created)}</span></a>`).join('');
  return `<section class="band"><h2>Your trips, groups and expenses</h2>${list||'<p class="muted">Trips, groups and expenses you open on this phone show up here.</p>'}
    <form id="join" class="inline" style="margin-top:12px"><input name="code" placeholder="Paste a trip link" aria-label="Trip link" autocomplete="off"><button class="btn">Open</button></form></section>
  <section class="band"><h2>Start a trip, group or expense</h2><form id="newtrip" class="stackf">
    <label><span class="lt"><span class="lic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg></span>Name</span><input name="name" required maxlength="60" placeholder="Japan snow trip, share house"></label>
    <label><span class="lt"><span class="lic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/></svg></span>Home currency</span><small>Everything is settled in this</small><select name="home">${CURS.map(c=>`<option${c==='AUD'?' selected':''}>${c}</option>`).join('')}</select></label>
    <fieldset class="ppl"><legend><span class="lic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21 19"/></svg></span>Who's coming? <small>Your name first, then everyone else.</small></legend><ul class="plist" id="plist">${[0,1,2].map(i=>pRow(i===0)).join('')}</ul><button type="button" class="btn small" data-act="padd">+ Add person</button></fieldset>
    <button class="btn primary">Create trip, group or expense</button></form></section>`}

function splitLabel(e){const w=weights(e),n=Object.keys(w).length,m=e.split?.mode;
  if(m==='items'){const k=(e.split.items||[]).length;return `${k} item${k===1?'':'s'}`}
  if(m==='exact')return 'exact amounts';if(m==='percent')return 'by %';if(m==='shares')return 'by shares';if(m==='nights')return 'by nights';
  return n===members().length?'split by all':`split ${n} way${n===1?'':'s'}`}
function expView(){if(!S.exp.length)return `<section class="band"><div class="empty"><h2>No expenses yet</h2><p class="muted">Tap <b>Add expense</b> when someone pays for something shared, like food, transport, a room or bills.</p><button type="button" class="btn" data-act="imx-open" style="margin-top:14px">Import from a screenshot or bank file</button></div></section>`;
  const me=S.me[S.tid],rows=[...S.exp].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0)),days=[];
  for(const e of rows){const d=e.date||'';if(!days.length||days[days.length-1].d!==d)days.push({d,items:[]});days[days.length-1].items.push(e)}
  return `<section class="band"><div class="imbar">${selTop()}${SEL?'':'<button type="button" class="btn small chipb" data-act="imx-open"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 4v10M7.5 9.5L12 14l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Import</button>'}</div>${days.map(g=>`<h3 class="day"><span>${esc(fmtDate(g.d))}</span><span>${fc(g.items.reduce((s,e)=>s+eCents(e),0))}</span></h3><ul class="list">${g.items.map(e=>{const c=eCents(e),mine=alloc(c,weights(e))[me]||0;
    return `<li class="swl${SEL?.has(e.id)?' picked':''}"><button type="button" class="xdel" data-act="sw-del" data-id="${esc(e.id)}" tabindex="-1">Delete</button><button type="button" class="exp${SEL?' sel':''}" data-act="edit" data-id="${esc(e.id)}">${SEL?`<span class="selck${SEL.has(e.id)?' on':''}" aria-hidden="true"></span>`:''}${catIcon(e)}<span class="ed"><b>${esc(e.desc)}</b><small>${esc(payLabel(e,me))} paid, ${esc(splitLabel(e))}${e.receipt?', with receipt':''}</small>${e.note?`<small class="enote"><b>Note:</b> ${esc(e.note)}</small>`:''}</span><span class="amt">${fc(c)}${e.cur!==home()?`<small>${esc(money(num(e.amount),e.cur))}</small>`:''}${mine?`<small class="mine">yours ${fc(mine)}</small>`:''}</span></button></li>`}).join('')}</ul>`).join('')}${selBar()}</section>`}

function settleView(){const {net}=calc(),me=S.me[S.tid],max=Math.max(1,...Object.values(net).map(Math.abs)),plan=settle(net);
  const who=id=>id===me?'You':mname(id);
  const bals=members().map(m=>{const n=net[m.id]||0;return `<button type="button" class="bal" data-act="who" data-id="${esc(m.id)}" aria-label="See ${esc(m.name)}'s breakdown"><span class="whois">${av(m.id,'sm')}${esc(m.name)}</span><div class="bar"><i class="${n>=0?'pos':'neg'}" style="width:${(Math.abs(n)/max*50).toFixed(1)}%"></i></div><span class="amt ${n>0?'pos':n<0?'neg':''}">${n>0?'+':n<0?'−':''}${fc(Math.abs(n))}</span></button>`}).join('');
  const pays=[...S.pay].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return `<section class="band"><div class="sec"><h2>Balances</h2><p class="hint" style="margin:-8px 0 8px">Green means they're owed money. Red means they owe. Tap someone to see why.</p><div class="card">${bals}</div></div>
  ${typeView()}<div class="sec"><div class="sech"><h2>Payments to settle</h2>${plan.length?`<span class="sumacts">${navigator.share?'<button type="button" class="btn small chipb" data-act="sharesum">Share</button>':''}<button type="button" class="btn small chipb cpy" data-act="copysum">Copy for group chat</button></span>`:''}</div>${plan.length?`<div class="card">${plan.map(p=>`<div class="pay"><span class="flow">${av(p.from,'sm')}<span class="arr">→</span>${av(p.to,'sm')}<span class="txt"><b>${esc(who(p.from))}</b> ${p.from===me?'pay':'pays'} <b>${esc(who(p.to))}</b></span></span><span class="amt">${fc(p.c)}</span>${payBox(p.to)}<button type="button" class="btn small teal" data-act="paid" data-from="${esc(p.from)}" data-to="${esc(p.to)}" data-c="${p.c}">Mark paid</button></div>`).join('')}</div><p class="hint" style="margin-top:8px">This is the fewest transfers that clears everyone.</p>`:`<div class="empty"><b>Everyone's square.</b></div>`}</div>
  ${pays.length?`<div class="sec"><h2>Payments made</h2><div class="card">${pays.map(p=>`<div class="pay"><span>${esc(who(p.from))} paid ${esc(who(p.to))}<small class="hint" style="display:block">${esc(fmtDate(p.date))}</small></span><span class="amt">${fc(num(p.cents))}</span><button type="button" class="btn small" data-act="unpay" data-id="${esc(p.id)}">Undo</button></div>`).join('')}</div></div>`:''}</section>`}

function usedBy(id){return S.exp.some(e=>e.paidBy===id||num(e.payers?.[id])>0||weights(e)[id])||S.pay.some(p=>p.from===id||p.to===id)}
function tripView(){const t=S.trip,rates=t.rates||{};
  return `<section class="band">${lookView()}<div class="sec"><h2>Invite friends</h2><p class="hint" style="margin:-6px 0 0">Anyone with this link can see and add to the trip. No account needed, so only share it with the group.</p>
    <div class="linkbox"><input id="tlink" readonly value="${esc(tripUrl(S.tid))}" aria-label="Trip link"><button type="button" class="btn teal" data-act="share">${navigator.share?'Share':'Copy'}</button></div>
    <div class="note" style="margin-top:12px"><b>Use it like an app:</b> open the link, then on iPhone tap Share → Add to Home Screen. On Android tap ⋮ → Add to Home screen.</div></div>
  <div class="sec"><h2>People</h2><p class="hint" style="margin:-6px 0 10px">Add PayID or bank details so they show in Settle up. Everyone on the trip can see them.</p><div class="card">${members().map(m=>`<div class="mrow">${av(m.id,'sm')}<input id="mn-${esc(m.id)}" value="${esc(m.name)}" maxlength="30" aria-label="Name"><button type="button" class="btn small" data-act="ren" data-id="${esc(m.id)}">Save</button>${usedBy(m.id)?'<span></span>':`<button type="button" class="btn small danger" data-act="rmm" data-id="${esc(m.id)}">Remove</button>`}</div>${S.canWrite!==false?`<div class="ppay"><input id="pp-${esc(m.id)}" value="${esc(m.pay||'')}" maxlength="80" placeholder="PayID or BSB + account (optional)" aria-label="${esc(m.name)} payment details"><button type="button" class="btn small" data-act="savepay" data-id="${esc(m.id)}">Save</button></div>`:(m.pay?`<p class="hint ppay">${esc(m.pay)}</p>`:'')}`).join('')}</div>
    <form id="addmem" class="inline" style="margin-top:10px"><input name="n" maxlength="30" placeholder="Add someone" required aria-label="New person"><button class="btn">Add</button></form>
    <p class="hint" style="margin-top:10px">You're <b>${esc(mname(S.me[S.tid]))}</b>. <button type="button" class="btn small" data-act="notme">Not you?</button></p></div>
  ${activityView()}<div class="sec"><h2>Currencies</h2><p class="hint" style="margin:-6px 0 10px">Everything settles in <b>${esc(home())}</b>. Rates are saved on each expense, so changing a rate here only affects new expenses.</p>
    ${Object.keys(rates).length?`<div class="card">${Object.keys(rates).map(c=>`<div class="rrow"><b>1 ${esc(c)} =</b><input id="rt-${esc(c)}" inputmode="decimal" value="${esc(rates[c])}" aria-label="${esc(c)} rate"><button type="button" class="btn small" data-act="saverate" data-c="${esc(c)}">Save</button>${S.exp.some(e=>e.cur===c)?'<span></span>':`<button type="button" class="btn small danger" data-act="rmrate" data-c="${esc(c)}">Remove</button>`}</div>`).join('')}</div>`:'<p class="muted">No foreign currencies yet. Pick one when adding an expense, or add it here.</p>'}
    <form id="addrate" class="inline3" style="margin-top:10px"><select name="c" aria-label="Currency">${CURS.filter(c=>c!==home()&&!rates[c]).map(c=>`<option>${c}</option>`).join('')}</select><input name="r" inputmode="decimal" placeholder="${esc(home())} per 1 unit" required aria-label="Rate"><button class="btn">Add</button></form></div>${exportView()}</section>`}

function curOptions(){const r=Object.keys(S.trip.rates||{});return [home(),...r.filter(c=>c!==home()),...CURS.filter(c=>c!==home()&&!r.includes(c))]}
function openForm(e){delArm=false;const me=S.me[S.tid];
  if(e)F={id:e.id,desc:e.desc||'',note:e.note||'',amount:String(e.amount??''),cur:e.cur||home(),rate:e.cur!==home()?String(e.rate??''):'',paidBy:e.paidBy,multi:!!(e.payers&&Object.keys(e.payers).length>1),payers:e.payers?Object.fromEntries(Object.entries(e.payers).map(([k,v])=>[k,String(v)])):null,date:e.date||today(),mode:e.split?.mode||'equal',parts:{...(e.split?.parts||{})},items:(e.split?.items||[]).map(it=>({n:it.n||'',p:String(it.p??''),who:[...(it.who||[])],c:it.c||'food',...(Number.isInteger(it.of)?{of:it.of}:{})})),receipt:e.receipt||null,file:null,drop:false,createdBy:e.createdBy,createdAt:e.createdAt,nb:{...(e.split?.book||{})},pd:JSON.parse(JSON.stringify(e.split?.dates||{}))};
  else{const last=[...S.exp].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0],cur=last?.cur||home();
    F={desc:'',note:'',amount:'',rateAuto:true,cur,rate:cur!==home()?String(S.trip.rates?.[cur]??''):'',paidBy:me,date:today(),mode:'equal',parts:Object.fromEntries(members().map(m=>[m.id,1])),items:[],receipt:null,file:null,drop:false,nb:{},pd:{}}}
  if(F.mode==='items'&&F.items.length){const x=Math.round((num(F.amount)-F.items.reduce((t,it)=>t+num(it.p),0))*100)/100;F.extra=x?String(x):'';F.xs=Array.isArray(e?.split?.extras)&&e.split.extras.length?e.split.extras.map(z=>({n:z.n||'',a:String(z.a??'')})):x?[{n:'Extras',a:String(x)}]:[]}else{F.extra='';F.xs=[]}
  $('#sheet').hidden=false;renderForm();if(!e)setTimeout(()=>$('#f-amount')?.focus(),50)}
function closeSheet(){IM=null;$('#sheet').hidden=true;$('#panel').innerHTML='';if(F?.preview)URL.revokeObjectURL(F.preview);F=null}
// Items: each item is split equally between the people who had it. Anything on the bill beyond the
// items (surcharge, tip, tax) is shared in proportion to what each person's items cost.
function itemMath(){const ids=new Set(members().map(m=>m.id)),per={};let isum=0,asum=0,bad=0;
  for(const it of F.items){const pr=num(it.p),who=it.who.filter(x=>ids.has(x));if(pr>0)isum+=pr;if(!(pr>0)||!who.length){if(pr>0||it.n.trim()||who.length)bad++;continue}
    asum+=pr;who.forEach(x=>per[x]=(per[x]||0)+pr/who.length)}
  const extra=Math.round(num(F.extra)*100)/100,total=Math.round((isum+extra)*100)/100;
  if(asum>0&&extra)for(const k in per)per[k]+=per[k]/asum*extra;
  return {per,isum,total,extra,bad}}
const curDp=c=>{try{return new Intl.NumberFormat('en-AU',{style:'currency',currency:c}).resolvedOptions().maximumFractionDigits}catch(e){return 2}};
const curSym=c=>{try{return new Intl.NumberFormat('en-AU',{style:'currency',currency:c,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(x=>x.type==='currency').value}catch(e){return c}};
const fmtP=v=>{const t=String(v??'').trim();if(t===''||!isFinite(parseFloat(t)))return t;return num(t).toFixed(curDp(F.cur))};
const roman=n=>{let r='';for(const [v,t] of [[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']])while(n>=v){r+=t;n-=v}return r};
// Main items count 1, 2, 3…; add-ons are numbered i, ii, iii under their own item.
const itemLabels=()=>{let n=0;const sub={};return F.items.map(it=>it.of!=null?roman(sub[it.of]=(sub[it.of]||0)+1):String(++n))};
// Keep the item grid's header (people's names) pinned while scrolling the expense form.
function fitGrid(){const P=$('#panel'),ph=P&&P.querySelector('.ph');if(ph)P.style.setProperty('--phh',ph.offsetHeight+'px');
  const g=P&&P.querySelector('.igrid');if(g){g.classList.remove('wide');g.classList.toggle('wide',g.querySelector('table').scrollWidth>g.clientWidth+1)}}
window.addEventListener('resize',()=>{if(F)fitGrid()});
const CATS=[['food','Food','F'],['drink','Drink','D'],['other','Other','O']];
const catBtn=(it,i)=>{const c=CATS.find(x=>x[0]===it.c)||CATS[0];return `<button type="button" class="ct ct-${c[0]}" data-act="icat" data-i="${i}" aria-label="${c[1]}. Tap to change"><span class="ctl">${c[1]}</span><span class="cts">${c[2]}</span></button>`};
const wlog=(p,d)=>setDoc(doc(S.fs,p),d).catch(()=>{});
const wdoc=put,ddoc=del;
const dropRc=(tid,id,rc)=>{if(rc)deleteDoc(doc(S.fs,`trips/${tid}/receipts/${id}`)).catch(()=>{})};
// ---------- Undo, activity log, duplicate check, spending by type ----------
function undoToast(msg,fn){const el=$('#toast');el.innerHTML='';const t=document.createElement('span');t.textContent=msg;const u=document.createElement('button');u.type='button';u.className='undo';u.textContent='Undo';el.append(t,u);el.classList.add('show','act');clearTimeout(toast.t);let done=false;u.onclick=()=>{if(done)return;done=true;el.classList.remove('show','act');fn()};toast.t=setTimeout(()=>{done=true;el.classList.remove('show','act')},7000)}
const logAct=t=>{if(!S.tid)return;wlog(`trips/${S.tid}/log/${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,{t:Date.now(),by:S.me[S.tid]||null,text:String(t).slice(0,140)})};
const agoFmt=t=>{try{return new Date(t).toLocaleString('en-AU',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return ''}};
const dupOf=()=>{if(!F||F.id)return null;const amt=F.mode==='items'?itemMath().total:num(F.amount),cents=Math.round(amt*100),dt=F.date||today(),ds=(F.desc||'').trim().toLowerCase();if(!(cents>0))return null;
  return S.exp.find(e=>e.cur===F.cur&&Math.round(num(e.amount)*100)===cents&&(e.date===dt||(ds&&(e.desc||'').trim().toLowerCase()===ds)))||null};
function catTotals(){const res={},tot={};const add=(m,k,c)=>{if(!c)return;res[m]=res[m]||{};res[m][k]=(res[m][k]||0)+c;tot[k]=(tot[k]||0)+c};
  for(const e of S.exp){const c=eCents(e);if(!(c>0))continue;const o=alloc(c,weights(e));
    if(e.split?.mode==='items'&&Array.isArray(e.split.items)){for(const m in o){const per={};let s=0;e.split.items.forEach(x=>{const w=x.who||[];if(w.includes(m)){const v=num(x.p)/w.length,k=x.c||'food';per[k]=(per[k]||0)+v;s+=v}});
        if(!s){add(m,'none',o[m]);continue}let left=o[m];const ks=Object.keys(per);ks.forEach((k,i)=>{const v=i===ks.length-1?left:Math.round(o[m]*per[k]/s);left-=v;add(m,k,v)})}}
    else for(const m in o)add(m,'none',o[m])}
  return {res,tot}}
function typeView(){const {res,tot}=catTotals(),cols=[...CATS.map(c=>[c[0],c[1]]),['none','Not itemised']].filter(c=>tot[c[0]]);if(!cols.length)return '';
  const all=Object.values(tot).reduce((a,b)=>a+b,0);
  return `<div class="sec"><h2>Spending by type</h2><div class="tchips">${cols.map(c=>`<span class="tchip tc-${c[0]}"><b>${c[1]}</b> ${fc(tot[c[0]])} <small>${Math.round(tot[c[0]]/all*100)}%</small></span>`).join('')}</div>
  <div class="card tcard"><table class="ttab"><thead><tr><th></th>${cols.map(c=>`<th class="tc-${c[0]}">${c[1]}</th>`).join('')}</tr></thead><tbody>${members().filter(m=>res[m.id]).map(m=>`<tr><th>${av(m.id,'xs')}${esc(m.name)}</th>${cols.map(c=>`<td>${res[m.id][c[0]]?fc(res[m.id][c[0]]):'–'}</td>`).join('')}</tr>`).join('')}</tbody>
  <tfoot><tr><th>Total</th>${cols.map(c=>`<td>${fc(tot[c[0]])}</td>`).join('')}</tr></tfoot></table></div>
  <p class="hint" style="margin-top:8px">Includes each person's share of surcharges. Expenses split without items count as Not itemised.</p></div>`}
function activityView(){const L=S.log||[];return `<div class="sec"><h2>Activity</h2>${L.length?`<div class="card actv">${L.slice(0,30).map(l=>`<div class="lgr">${l.by&&members().some(m=>m.id===l.by)?av(l.by,'xs'):''}<span><b>${esc(l.by?mname(l.by):'Someone')}</b> ${esc(l.text)}<small>${esc(agoFmt(l.t))}</small></span></div>`).join('')}</div>`:'<p class="muted">Changes people make will show here.</p>'}</div>`}
function itemsEditor(){const ms=members(),lab=itemLabels();
  const qw=F.qtWho&&ms.some(m=>m.id===F.qtWho)?F.qtWho:(S.me[S.tid]||ms[0]?.id);
  return `<div class="isum" id="isum"></div><div class="qt"><span>Tick all for</span><select id="qt-who" aria-label="Person to tick">${ms.map(m=>`<option value="${esc(m.id)}"${m.id===qw?' selected':''}>${esc(m.name)}</option>`).join('')}</select>${CATS.map(c=>`<button type="button" class="qtb ct-${c[0]}" data-act="qtick" data-c="${c[0]}" aria-label="Tick all ${c[0]==='drink'?'drinks':c[0]} for this person">${c[0]==='drink'?'Drinks':c[0][0].toUpperCase()+c[0].slice(1)}</button>`).join('')}</div><div class="igrid"><table><thead><tr><th class="nc">#</th><th class="ic">Item and price<div class="leg" aria-hidden="true">${CATS.map(c=>`<span class="legi"><span class="ct ct-${c[0]}"><span class="cts">${c[2]}</span></span>${c[1]}</span>`).join('')}<span class="legt">tap to change</span></div></th>${ms.map(m=>`<th class="mc" title="Tick ${esc(m.name)} for every item"><button type="button" class="hb" data-act="icol" data-id="${esc(m.id)}" aria-label="Tick or untick ${esc(m.name)} for every item">${av(m.id,'xs')}<span class="mn">${esc(m.name)}</span></button></th>`).join('')}<th class="mc"><span class="mn">All</span></th></tr></thead>
  <tbody>${F.items.map((it,i)=>`<tr${it.of!=null?' class="addon"':''}><td class="nc"><button type="button" class="nb" data-act="ilink" data-i="${i}" title="${it.of!=null?'Unlink from the item above':'Make this an add-on to the item above'}">${lab[i]}</button></td><td class="ic"><div class="icell">${it.of!=null?`<span class="lk" title="Add-on to ${esc(F.items[it.of]?.n||'the item above')}" aria-label="Add-on to ${esc(F.items[it.of]?.n||'the item above')}">↳</span>`:''}<textarea class="iname" data-i="${i}" rows="1" placeholder="Item ${i+1}" maxlength="60" aria-label="Item ${i+1} name">${esc(it.n)}</textarea><span class="ip">${catBtn(it,i)}<span class="psym" aria-hidden="true">${esc(curSym(F.cur))}</span><input class="iprice" data-i="${i}" inputmode="decimal" value="${esc(fmtP(it.p))}" placeholder="0.00" aria-label="Item ${i+1} price"><button type="button" class="x" data-act="idel" data-i="${i}" aria-label="Remove item ${i+1}">×</button></span></div><small class="ieach" id="ie-${i}"></small></td>
    ${ms.map(m=>`<td class="mc"><button type="button" class="cell${it.who.includes(m.id)?' on':''}" data-act="itog" data-i="${i}" data-id="${esc(m.id)}" aria-pressed="${it.who.includes(m.id)}" aria-label="${esc(m.name)} had item ${i+1}"></button></td>`).join('')}
    <td class="mc"><button type="button" class="cell all${it.who.length===ms.length?' on':''}" data-act="iall" data-i="${i}" aria-label="Everyone had item ${i+1}">All</button></td></tr>`).join('')}${(F.xs||[]).map((x,j)=>`<tr class="xrow"><td class="nc"></td><td class="ic"><div class="icell"><input class="iname xname" data-j="${j}" value="${esc(x.n)}" placeholder="Surcharge, fee…" maxlength="40" aria-label="Extra ${j+1} name"><span class="ip"><span class="ctsp"></span><span class="psym" aria-hidden="true">${esc(curSym(F.cur))}</span><input class="iextra xamt" data-j="${j}" inputmode="decimal" value="${esc(fmtP(x.a||''))}" placeholder="0.00" aria-label="Extra ${j+1} amount"><button type="button" class="x" data-act="xdel" data-j="${j}" aria-label="Remove extra ${j+1}">×</button></span></div></td><td colspan="${ms.length+1}" class="xnote">${j===0?'Shared in proportion to each person\'s items':''}</td></tr>`).join('')}<tr class="xrow xadd"><td class="nc"></td><td class="ic" colspan="${ms.length+2}"><button type="button" class="xaddb" data-act="xadd">+ Add a surcharge, fee, tip or discount</button>${(F.xs||[]).length?'':'<small class="xhint">Extras are shared in proportion to what each person had. Use a minus for a discount.</small>'}</td></tr></tbody>
  <tfoot><tr><td class="nc"></td><th class="ic">Each pays</th>${ms.map(m=>`<td class="mc tot" id="it-${esc(m.id)}"></td>`).join('')}<td class="mc"></td></tr></tfoot></table></div>
  <button type="button" class="btn" data-act="iadd">+ Add item</button>`}
// Under each item: what each ticked person pays for it (before any extras).
function itemEach(){const cv=v=>F.cur===home()?fc(Math.round(v*100)):money(v,F.cur);
  F.items.forEach((it,i)=>{const el=document.getElementById('ie-'+i);if(!el)return;const n=it.who.filter(x=>members().some(m=>m.id===x)).length,pr=num(it.p);
    el.textContent=n&&pr>0?(n===1?`${cv(pr)} · 1 person`:`${cv(pr/n)} each · ${n} people`):''})}
// "Who had what" summary above the item grid; refreshed whenever ticks or prices change.
function itemSummary(r){const el=document.getElementById('isum');if(!el)return;const cv=v=>F.cur===home()?fc(Math.round(v*100)):money(v,F.cur);
  const lab=itemLabels(),rows=members().filter(m=>r.per[m.id]).map(m=>{const itsArr=F.items.map((it,i)=>({it,i})).filter(({it})=>num(it.p)>0&&it.who.includes(m.id)).map(({it,i})=>{const n=it.who.length;const cc=CATS.find(x=>x[0]===(it.c||'food'))||CATS[0];return {c:cc[0],h:`<span class="si si-${cc[0]}${it.of!=null?' sa':''}"><span class="ct ct-${cc[0]} sct" title="${cc[1]}"><span class="cts">${cc[2]}</span></span>${it.of!=null?'+ ':''}${esc(it.n.trim()||'Item')}${n>1?` <em>${fracLabel(n)}</em>`:''} <i>${esc(cv(num(it.p)/n))}</i></span>`}});const its=CATS.map(c=>{const g=itsArr.filter(x=>x.c===c[0]);return g.length?`<div class="sitl">${g.map(x=>x.h).join('')}</div>`:''}).join('');
    const sub={};F.items.forEach(it=>{if(num(it.p)>0&&it.who.includes(m.id)){const k=it.c||'food';sub[k]=(sub[k]||0)+num(it.p)/it.who.length}});const subl=CATS.filter(c=>sub[c[0]]).map(c=>`<span class="scl scl-${c[0]}">${c[1]} ${esc(cv(sub[c[0]]))}</span>`).join('');
    const cnt=F.items.filter(it=>num(it.p)>0&&it.who.includes(m.id)).length,op=!!F.sumOpen?.[m.id];
    return `<div class="srow${op?' open':''}" data-act="sumtog" data-id="${esc(m.id)}" role="button" tabindex="0" aria-expanded="${op}">${av(m.id,'sm')}<div class="sname"><b>${esc(m.name)}</b> <small class="scount">${cnt} item${cnt===1?'':'s'}</small>${subl?`<div class="scat">${subl}</div>`:''}<div class="sits">${its}</div></div><span class="stot">${cv(r.per[m.id])}</span></div>`}).join('');
  const un=F.items.map((it,i)=>({it,i})).filter(({it})=>num(it.p)>0&&!it.who.length);
  const allOpen=members().filter(m=>r.per[m.id]).every(m=>F.sumOpen?.[m.id]);
  el.innerHTML=`<div class="sh"><span>Who had what <button type="button" class="sall" data-act="sumall">${allOpen?'Collapse all':'Expand all'}</button></span><span class="skey">${CATS.map(c=>`<span class="legi"><span class="ct ct-${c[0]} sct"><span class="cts">${c[2]}</span></span>${c[1]}</span>`).join('')}</span>${r.extra?`<small>incl. ${r.extra>0?'extras':'discount'} share</small>`:''}</div>${rows||'<p class="hint">Tick who had each item below.</p>'}${un.length?`<p class="sun">Not assigned yet: ${un.map(({it})=>esc(it.n.trim()||'Item')).join(', ')}</p>`:''}`}
function itemTotals(r){const narrow=matchMedia('(max-width:600px)').matches,cv=v=>curSym(F.cur)+v.toFixed(curDp(F.cur));for(const m of members()){const el=document.getElementById('it-'+m.id);if(el)el.textContent=r.per[m.id]?cv(r.per[m.id]):'–'}}
function splitEditor(){const ms=members();
  if(F.mode==='items')return itemsEditor();
  if(F.mode==='equal')return `<div class="chips">${ms.map(m=>`<button type="button" class="chip${num(F.parts[m.id])>0?' on':''}" data-act="tog" data-id="${esc(m.id)}" aria-pressed="${num(F.parts[m.id])>0}">${av(m.id,'xs')}${esc(m.name)}</button>`).join('')}</div><div class="quick"><button type="button" class="btn small" data-act="all">Everyone</button><button type="button" class="btn small" data-act="none">Clear</button></div>`;
  if(F.mode==='nights'){F.nb=F.nb||{};F.pd=F.pd||{};const bn=nDiff(F.nb.f,F.nb.t);
    return `<div class="nbook"><span class="nbl">Booking dates <small>optional</small></span><div class="ndr"><input type="date" id="f-nfrom" value="${esc(F.nb.f||'')}" aria-label="Booking starts"><span aria-hidden="true">→</span><input type="date" id="f-nto" value="${esc(F.nb.t||'')}" min="${esc(F.nb.f||'')}" aria-label="Booking ends"></div><p class="hint${bn>0||!(F.nb.f&&F.nb.t)?"":" nbadt"}" id="f-nbh">${bn>0?`${bn} night${bn===1?'':'s'}`:bn<=0?nWarn(F.nb.f,F.nb.t):''}</p></div>
    <div class="nfill"><label for="f-nall">Booking length</label><input id="f-nall" inputmode="numeric" placeholder="e.g. 14" value="${bn>0?bn:''}" aria-label="Nights in the booking"><button type="button" class="btn small" data-act="nfill">Fill everyone</button></div>`+ms.map(m=>{const d=F.pd[m.id],open=!!d,pn=d?nDiff(d.f,d.t):NaN;
      return `<div class="nper${open?' open':''}"><div class="prow nrow"><span>${esc(m.name)}${d&&pn>0?`<small class="nds">${esc(dShort(d.f))} – ${esc(dShort(d.t))}</small>`:''}</span><b class="ncost" id="nc-${esc(m.id)}"></b><span class="step"><button type="button" data-act="nstep" data-id="${esc(m.id)}" data-d="-1" aria-label="One less night for ${esc(m.name)}">−</button><input class="pin" data-id="${esc(m.id)}" inputmode="decimal" value="${esc(F.parts[m.id]??'')}" placeholder="0" aria-label="Nights for ${esc(m.name)}"><button type="button" data-act="nstep" data-id="${esc(m.id)}" data-d="1" aria-label="One more night for ${esc(m.name)}">+</button></span><button type="button" class="ncal${open?' on':''}" data-act="ndates" data-id="${esc(m.id)}" aria-pressed="${open}" aria-label="${open?'Stop using dates':'Use dates'} for ${esc(m.name)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>${open?`<div class="ndr pdr"><input type="date" class="pdf" data-id="${esc(m.id)}" value="${esc(d.f||'')}" aria-label="${esc(m.name)} from"><span aria-hidden="true">→</span><input type="date" class="pdt" data-id="${esc(m.id)}" value="${esc(d.t||'')}" min="${esc(d.f||'')}" aria-label="${esc(m.name)} to"></div>${d.f&&d.t&&!(pn>0)?`<p class="hint nbad">${esc(nWarn(d.f,d.t))}</p>`:''}`:''}</div>`}).join('')}
  const unit=F.mode==='exact'?F.cur:F.mode==='shares'?'shares':'%';
  return ms.map(m=>`<label class="prow"><span>${esc(m.name)}</span><input class="pin" data-id="${esc(m.id)}" inputmode="decimal" value="${esc(F.parts[m.id]??'')}" placeholder="0"><em>${esc(unit)}</em></label>`).join('')}
function receiptBlock(){
  if(F.file)return `<div class="rprev"><img src="${esc(F.preview)}" alt="Receipt preview"><span class="scan ${F.scan==='busy'?'busy':''}">${F.scan==='busy'?'Reading the receipt…':F.scan==='done'?esc(F.scanMsg):F.scan==='fail'?esc(F.scanMsg)+` <button type="button" class="btn small" data-act="rescan">Try again</button>`:'Photo ready to save'}</span><button type="button" class="btn small danger" data-act="rmrc">Remove</button></div>`;
  if(F.receipt&&!F.drop)return `<div class="rprev"><span>Receipt attached</span><button type="button" class="btn small" data-act="receipt" data-id="${esc(F.id)}">View</button><button type="button" class="btn small danger" data-act="rmrc">Remove</button></div>`;
  return `<label class="btn file">Add receipt photo<input type="file" id="f-file" accept="image/*"></label>`}
const SPLITHELP={equal:['Equal','Split evenly between the people you tick.',s=>`${s}90 fuel, 3 people → ${s}30 each`],items:['Items','Tick who had each item on the bill. Tips and surcharges are shared in proportion.',s=>`Your ${s}25 eggs + ${s}5 bacon → you pay ${s}30`],exact:['Amounts','Type exactly what each person owes.',s=>`Tickets: Kim ${s}120, Phil ${s}80`],nights:['Nights','Split by how many nights each person was there. Use dates or type the number.',s=>`${s}1,000 van: 10 nights → ${s}625, 6 nights → ${s}375`],percent:['%','Give each person a percentage. It must add up to 100.',s=>`Couple 50%, Kim 25%, Phil 25%`],shares:['Shares','Give each person a number of shares. Someone with 2 pays double.',s=>`${s}90: Kim 2 shares, Phil 1 → ${s}60 and ${s}30`]};
function splitGuide(modes){const s=curSym(home());return `<div class="sguide" id="sguide"><div class="sgh"><b>How splitting works</b><button type="button" class="x" data-act="shelp" aria-label="Close the guide">×</button></div>${modes.map(([k])=>{const h=SPLITHELP[k];return `<div class="sgr${k===F.mode?' on':''}"><b>${esc(h[0])}</b> · ${esc(h[1])}<small>${esc(h[2](s))}</small></div>`}).join('')}</div>`}
function renderForm(){const foreign=F.cur!==home(),modes=[['equal','Equal'],['items','Items'],['exact','Amounts'],...(F.mode==='shares'?[['shares','Shares']]:[]),['nights','Nights'],['percent','%']];
  $('#panel').innerHTML=`<div class="ph"><h2>${F.id?'Edit expense':'Add expense'}</h2><button type="button" class="x" data-act="close" aria-label="Close">×</button></div>
  <form id="ef" class="stackf" novalidate>
    <div class="amtrow"><label>Amount${F.mode==='items'?' <small>adds up the items</small>':''}<span class="amtw"><span class="asym" aria-hidden="true">${esc(curSym(F.cur))}</span><input id="f-amount" inputmode="decimal" value="${esc(F.amount)}" placeholder="0.00" autocomplete="off"${F.mode==='items'?' readonly class="ro" tabindex="-1"':''}></span></label>
      <label>Currency<select id="f-cur">${curOptions().map(c=>`<option${c===F.cur?' selected':''}>${esc(c)}</option>`).join('')}</select></label></div>
    ${foreign?`<label>Exchange rate <small>1 ${esc(F.cur)} = how many ${esc(home())}?</small><input id="f-rate" inputmode="decimal" value="${esc(F.rate)}" placeholder="e.g. 0.21"></label>`:''}
    ${foreign?'<p class="hint fxh" id="f-fx"></p>':''}<p class="hint" id="f-conv"></p>
    <label>What for?<input id="f-desc" maxlength="80" value="${esc(F.desc)}" placeholder="Dinner, fuel, Airbnb, groceries…"></label>
    <div class="two"><label>Paid by<select id="f-paid">${members().map(m=>`<option value="${esc(m.id)}"${!F.multi&&m.id===F.paidBy?' selected':''}>${esc(m.name)}</option>`).join('')}<option value="__multi"${F.multi?' selected':''}>Several people…</option></select></label>
      <label>Date<input id="f-date" type="date" value="${esc(F.date)}"></label></div>
    ${payersBlock()}
    <fieldset><legend class="slg">Split<button type="button" class="qb${F.help?' on':''}" data-act="shelp" aria-label="How splitting works" aria-expanded="${!!F.help}">?</button></legend>${F.help?splitGuide(modes):''}<div class="seg">${modes.map(([k,l])=>`<button type="button" data-act="mode" data-mode="${k}" aria-pressed="${F.mode===k}">${l}</button>`).join('')}</div><p class="mhint">${esc(SPLITHELP[F.mode]?.[1]||'')}</p>${splitEditor()}<p class="hint" id="f-left"></p></fieldset>
    <label>Notes <small>optional</small><textarea id="f-note" rows="2" maxlength="500" placeholder="e.g. Includes Jason's birthday drinks">${esc(F.note||'')}</textarea></label>
    ${receiptBlock()}
    ${histBlock()}
    <p class="err" id="f-err"></p>
    <div class="acts">${F.id?`<button type="button" class="btn danger" data-act="del">Delete</button>`:''}<button class="btn primary" id="f-save">${F.id?'Save changes':'Add expense'}</button></div>
  </form>`;hints();fitGrid();fxFill();requestAnimationFrame(fitNames)}
function formTotal(){const a=num(F.amount),r=F.cur===home()?1:num(F.rate);return Math.round(a*r*100)}
function hints(){payHint();const conv=$('#f-conv'),left=$('#f-left');if(!conv)return;const a=num(F.amount),tot=formTotal(),foreign=F.cur!==home();
  conv.innerHTML=foreign&&a>0&&num(F.rate)>0?`That's <b>${fc(tot)}</b>`:'';conv.hidden=!conv.innerHTML;
  const vals=members().map(m=>num(F.parts[m.id])),sum=vals.reduce((s,v)=>s+Math.max(0,v),0),cnt=vals.filter(v=>v>0).length;let t='';
  if(F.mode==='items'){const r=itemMath();itemTotals(r);itemEach();itemSummary(r);const cv=v=>F.cur===home()?fc(Math.round(v*100)):esc(money(v,F.cur));
    F.amount=r.isum||r.extra?String(r.total):'';const fa=$('#f-amount');if(fa)fa.value=fmtP(F.amount);
    if(!r.isum)t='Add each item, then tap who had it';
    else{t=r.extra?`Items ${cv(r.isum)} ${r.extra>0?'+':'−'} ${cv(Math.abs(r.extra))} extras = <b>${cv(r.total)}</b>`:`Items add up to <b>${cv(r.total)}</b>`;if(r.bad)t+=`<br>${r.bad} item${r.bad>1?'s need':' needs'} a price and at least one person`}}
  else if(F.mode==='equal')t=cnt?`${cnt} ${cnt===1?'person':'people'}${tot>0?` · <b>${fc(Math.floor(tot/cnt))}</b> each`:''}`:'Pick who shares this';
  else if(F.mode==='exact'){const d=Math.round((a-sum)*100)/100;t=Math.abs(d)<0.005?'<b>All assigned</b>':d>0?`<b>${esc(money(d,F.cur))}</b> left to assign`:`<b>${esc(money(-d,F.cur))}</b> too much`}
  else if(F.mode==='percent'){const d=Math.round((100-sum)*100)/100;t=Math.abs(d)<0.005?'<b>Adds up to 100%</b>':d>0?`<b>${d}%</b> left`:`<b>${-d}%</b> over`}
  else if(F.mode==='nights'){if(sum>0&&tot>0){const o=alloc(tot,Object.fromEntries(members().map(m=>[m.id,Math.max(0,num(F.parts[m.id]))])));for(const m of members()){const el=document.getElementById('nc-'+m.id);if(el)el.textContent=o[m.id]?fc(o[m.id]):''}t=`${fc(Math.round(tot/sum))} per person per night · ${Math.round(sum*100)/100} nights across everyone`}else{for(const m of members()){const el=document.getElementById('nc-'+m.id);if(el)el.textContent=''}t='Enter how many nights each person used it (0 leaves them out)'}}
  else if(sum>0&&tot>0){const o=alloc(tot,Object.fromEntries(members().map(m=>[m.id,Math.max(0,num(F.parts[m.id]))])));t=members().filter(m=>o[m.id]).map(m=>`${esc(m.name)} ${fc(o[m.id])}`).join(' · ')}
  else t='Give each person a number of shares (0 leaves them out)';
  left.innerHTML=t}
function nightsMeta(parts){const o={},dates={};for(const id in parts){const d=F.pd?.[id];if(d&&nDiff(d.f,d.t)>0)dates[id]={f:d.f,t:d.t}}if(Object.keys(dates).length)o.dates=dates;if(F.nb?.f&&F.nb?.t&&nDiff(F.nb.f,F.nb.t)>0)o.book={f:F.nb.f,t:F.nb.t};return o}
function ferr(m){const e=$('#f-err');if(e)e.textContent=m;const b=$('#f-save');if(b){b.disabled=false;b.textContent=F?.id?'Save changes':'Add expense'}}
async function shrink(file,max,q){const url=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("that file isn't an image"));i.src=url});
  const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*s));c.height=Math.max(1,Math.round(img.naturalHeight*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('could not compress it')),'image/jpeg',q))}finally{URL.revokeObjectURL(url)}}
const toData=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('could not read it'));r.readAsDataURL(b)});
// Receipts are stored as compressed photos inside the database, so no paid Firebase Storage is needed.
async function receiptData(file){let b=await shrink(file,1400,.72);if(b.size>480000)b=await shrink(file,1000,.6);if(b.size>480000)b=await shrink(file,800,.5);
  const data=await toData(b);if(data.length>900000)throw new Error('the photo is too large');return data}
async function saveExpense(){if(!F)return;const amount=F.mode==='items'?itemMath().total:num(F.amount),foreign=F.cur!==home(),rate=foreign?num(F.rate):1;
  if(!(amount>0))return ferr('Enter an amount.');if(foreign&&!(rate>0))return ferr(`Enter the ${F.cur} to ${home()} rate.`);
  const PC=payersCheck(amount);if(PC.err)return ferr(PC.err);if(PC.top)F.paidBy=PC.top;
  if(!members().some(m=>m.id===F.paidBy))return ferr('Choose who paid.');
  let items=null;
  if(F.mode==='items'){const r=itemMath();if(r.bad)return ferr('Each item needs a price and at least one person.');if(!r.isum)return ferr('Add at least one item with a price and a person.');
    F.parts=Object.fromEntries(Object.entries(r.per).map(([k,v])=>[k,Math.round(v*1e6)/1e6]));
    const keep=[],remap={};F.items.forEach((it,i)=>{if(num(it.p)>0){remap[i]=keep.length;keep.push(it)}});
    items=keep.map(it=>({n:it.n.trim()||'Item',p:num(it.p),c:it.c||'food',who:it.who.filter(x=>members().some(m=>m.id===x)),...(Number.isInteger(it.of)&&remap[it.of]!=null?{of:remap[it.of]}:{})}))}
  const parts={};for(const m of members()){const v=num(F.parts[m.id]);if(v>0)parts[m.id]=F.mode==='equal'?1:v}
  if(!Object.keys(parts).length)return ferr('Choose who this is split between.');
  const sum=Object.values(parts).reduce((s,v)=>s+v,0);
  if(F.mode==='exact'&&Math.abs(sum-amount)>0.005)return ferr(`The amounts add up to ${money(sum,F.cur)}, not ${money(amount,F.cur)}.`);
  if(F.mode==='nights'){for(const m of members()){const d=F.pd?.[m.id];if(d&&!(nDiff(d.f,d.t)>0))return ferr(`Check ${m.name}'s dates: the second date needs to be after the first.`)}}
  if(F.mode==='percent'&&Math.abs(sum-100)>0.01)return ferr(`The percentages add up to ${Math.round(sum*100)/100}%, not 100%.`);
  if(!F.dupOk){const dd=dupOf();if(dd){F.dupOk=true;return ferr(`This looks like a duplicate of “${dd.desc}” on ${fmtDate(dd.date)} (${money(num(dd.amount),dd.cur)}), added by ${mname(dd.createdBy)}. Tap ${F.id?'Save changes':'Add expense'} again to add it anyway.`)}}
  const b=$('#f-save');if(b){b.disabled=true;b.textContent='Saving…'}
  const id=F.id||rid(12);let receipt=F.drop?null:F.receipt,photo=null;
  if(F.file){try{photo=await receiptData(F.file);receipt={d:1}}catch(e){return ferr("Couldn't use that photo: "+(e.message||'try another')+'.')}}
  const me=S.me[S.tid];
  if(photo)put(`trips/${S.tid}/receipts/${id}`,{data:photo});
  else if(F.drop&&F.receipt)del(`trips/${S.tid}/receipts/${id}`);
  put(`trips/${S.tid}/expenses/${id}`,withHist({desc:F.desc.trim()||'Expense',note:String(F.note||'').trim().slice(0,500),amount,cur:F.cur,rate,paidBy:F.paidBy,payers:PC.payers||null,date:F.date||today(),split:items?{mode:'items',parts,items,...(F.xs?.some(x=>num(x.a))?{extras:F.xs.filter(x=>num(x.a)).map(x=>({n:(x.n||'').trim()||'Extra',a:Math.round(num(x.a)*100)/100}))}:{})}:{mode:F.mode,parts,...(F.mode==='nights'?nightsMeta(parts):{})},receipt:receipt||null,createdBy:F.createdBy||me,createdAt:F.createdAt||Date.now(),updatedAt:Date.now(),updatedBy:me}));
  if(foreign&&num(S.trip.rates?.[F.cur])!==rate)tripSave({rates:{...(S.trip.rates||{}),[F.cur]:rate}});
  logAct(`${F.id?'edited':'added'} ${F.desc.trim()||'Expense'} (${money(amount,F.cur)})`);const wasEdit=!!F.id;closeSheet();toast(wasEdit?'Expense updated':'Expense added')}
function tripSave(patch){return put('trips/'+S.tid,{...S.tripRaw,...patch})}
// Receipt reading: Gemini (through Firebase AI Logic) turns the photo into line items.
// Fast model first; if it times out or finds nothing, try the bigger one.
const AI_MODELS=[cfgAll.aiModel||'gemini-3.5-flash-lite',cfgAll.aiModelBackup||'gemini-3.8-flash'].filter((v,i,a)=>v&&a.indexOf(v)===i);const aiModels={};
const AI_GEN=name=>/lite/.test(name)?{}:{thinkingConfig:{thinkingLevel:'low'}};
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
async function aiTry(run,ok){let last=null;for(const [i,name] of AI_MODELS.entries()){try{const r=await withTimeout(run(name),i?75000:35000);if(ok(r))return r;last=last||new Error('nothing found')}catch(e){console.warn(name,e);last=e}}throw last||new Error('failed')}
async function getModel(name){if(aiModels[name])return aiModels[name];
  const {getAI,getGenerativeModel,GoogleAIBackend,Schema}=await import('https://www.gstatic.com/firebasejs/13.4.0/firebase-ai.js');
  const schema=Schema.object({properties:{
    merchant:Schema.string({description:'Shop or venue name'}),
    date:Schema.string({description:'Purchase date as YYYY-MM-DD, or empty if not shown'}),
    currency:Schema.string({description:'ISO 4217 code such as AUD, JPY, CNY. Guess from symbols and country if not printed'}),
    items:Schema.array({items:Schema.object({properties:{name:Schema.string(),quantity:Schema.number({description:'Units bought, 1 if not shown'}),price:Schema.number({description:'Line total for all units, as printed'}),type:Schema.string({description:'food, drink or other'}),addonTo:Schema.integer({description:'If this line is an add-on or modifier of another line (oat milk or an extra shot for a latte, extra bacon for a breakfast), the 0-based index of that main item in this items list'})},optionalProperties:['addonTo','type']})}),
    extras:Schema.array({description:'Charges added on top of the items (surcharge, service charge, tip, delivery) as positive amounts, and discounts as negative amounts. Not tax that is already included in item prices.',items:Schema.object({properties:{name:Schema.string(),amount:Schema.number()}})}),
    total:Schema.number({description:'Final amount paid'})},optionalProperties:['date','extras']});
  aiModels[name]=getGenerativeModel(getAI(S.app,{backend:new GoogleAIBackend()}),{model:name,generationConfig:{responseMimeType:'application/json',responseSchema:schema,...AI_GEN(name)}});return aiModels[name]}
async function readReceipt(file){const b=await shrink(file,2000,.85),data=(await toData(b)).split(',')[1];
  const prompt='Read this receipt. List every purchased line item with its printed line total. Skip subtotal, total, GST/tax lines that are already included, payment, change and card lines. Put surcharges, service charges, tips and discounts in extras. If a line shows a quantity (like 3 x Beer), give the quantity and the line total. Receipts often print add-ons (milk swaps, extra shots, syrups, extra sides) indented or just under the item they belong to: list them as their own items with addonTo set to that item\'s index.';
  return aiTry(async name=>{const res=await (await getModel(name)).generateContent([prompt,{inlineData:{data,mimeType:'image/jpeg'}}]);return JSON.parse(res.response.text())},r=>Array.isArray(r?.items)&&r.items.some(x=>num(x?.price)>0))}
function applyScan(r){
  const src=(Array.isArray(r?.items)?r.items:[]).map((it,k)=>({k,name:String(it.name||'Item').trim().slice(0,60),pr:num(it.price),q:num(it.quantity),c:['food','drink','other'].includes(String(it.type||'').toLowerCase())?String(it.type).toLowerCase():'food',of:Number.isInteger(it.addonTo)&&it.addonTo!==k?it.addonTo:null})).filter(x=>x.pr>0);
  const ks=new Map(src.map(x=>[x.k,x]));for(const x of src)if(x.of!=null&&(!ks.has(x.of)||ks.get(x.of).of!=null))x.of=null;
  const expand=x=>{const q=Math.round(x.q),n=(q>1&&q<=10&&Math.abs(q-x.q)<1e-9)?q:1,each=Math.round(x.pr/n*100)/100;
    return Array.from({length:n},(_,c)=>({n:(n===1&&x.q>1?`${x.q} × `:'')+x.name,p:String(c===n-1?Math.round((x.pr-each*(n-1))*100)/100:each),who:[],c:x.c}))};
  const items=[];
  for(const x of src){if(x.of!=null)continue;const pc=expand(x),adds=src.filter(y=>y.of===x.k).map(expand);
    pc.forEach((p,c)=>{const pi=items.length;items.push(p);adds.forEach(ac=>{if(ac.length===pc.length)items.push({...ac[c],of:pi});else if(c===0)ac.forEach(a=>items.push({...a,of:pi}))})})}
  if(!items.length)return false;
  const isum=items.reduce((s,x)=>s+num(x.p),0),total=num(r.total)>0?num(r.total):isum;
  F.mode='items';F.items=items;F.amount=String(Math.round(total*100)/100);const xx=Math.round((total-isum)*100)/100;F.extra=xx?String(xx):'';{const ex0=(Array.isArray(r.extras)?r.extras:[]).filter(x=>num(x.amount)).map(x=>({n:String(x.name||'Extra').trim().slice(0,40),a:String(Math.round(num(x.amount)*100)/100)})),es=ex0.reduce((t,x)=>t+num(x.a),0),rest=Math.round((xx-es)*100)/100;F.xs=Math.abs(rest)<0.02?ex0:[...ex0,{n:ex0.length?'Other':'Extras',a:String(rest)}];if(!xx&&!ex0.length)F.xs=[]}
  if(!F.desc.trim()&&r.merchant)F.desc=String(r.merchant).slice(0,80);
  if(/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')&&!F.id)F.date=r.date;
  const c=String(r.currency||'').toUpperCase();if(/^[A-Z]{3}$/.test(c)&&c!==F.cur&&curOptions().includes(c)){F.cur=c;F.rate=c!==home()?String(S.trip.rates?.[c]??''):''}
  const ex=(r.extras||[]).filter(x=>num(x.amount));
  const na=items.filter(x=>x.of!=null).length;F.scanMsg=`Found ${items.length} item${items.length===1?'':'s'}${na?` (${na} add-on${na>1?'s':''} joined to their item)`:''}${ex.length?' plus '+ex.map(x=>x.name).join(', '):''}. Check them, then tap who had each.`;return true}
async function scanReceipt(){if(!F?.file)return;const mine=F;F.scan='busy';renderForm();
  try{if(!navigator.onLine)throw new Error('offline');const r=await readReceipt(mine.file);if(F!==mine)return;
    if(applyScan(r)){F.scan='done';const dd=dupOf();if(dd)F.scanMsg+=` Heads up: this may already be added as “${dd.desc}” (${fmtDate(dd.date)}).`}else{F.scan='fail';F.scanMsg="Couldn't find any items on this photo."}}
  catch(e){console.warn(e);if(F!==mine)return;F.scan='fail';F.scanMsg=e.message==='offline'?"No signal, so the receipt can't be read yet.":e.message==='timeout'?"Reading the receipt took too long.":e.message==='nothing found'?"Couldn't find any items on this photo.":"Couldn't read the receipt."}
  renderForm()}
// Person breakdown: what someone paid, what they owe, and why.
const fracLabel=n=>({2:'½',3:'⅓',4:'¼',5:'⅕',6:'⅙',8:'⅛'}[n]||`1/${n}`);
const payOf=id=>String(members().find(m=>m.id===id)?.pay||'').trim();
const payBox=id=>{const t=payOf(id);return t?`<span class="payid"><span><small>${esc(mname(id))}'s details</small><code>${esc(t)}</code></span><button type="button" class="btn small" data-act="copy" data-t="${esc(t)}">Copy</button></span>`:''};
function showPerson(id){const me=S.me[S.tid],who=x=>x===me?'You':mname(x),cv=(v,c)=>c===home()?fc(Math.round(v*100)):money(v,c),{net}=calc();
  let paid=0,share=0;const rows=[];
  const exps=[...S.exp].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0));
  for(const e of exps){const c=eCents(e);if(!(c>0))continue;const mine=alloc(c,weights(e))[id]||0,pm=paidOf(e,c)[id]||0,payer=pm>0;if(payer)paid+=pm;share+=mine;if(!mine&&!payer)continue;
    let detail='';
    if(mine&&e.split?.mode==='items'&&Array.isArray(e.split.items)){const its=e.split.items,isum=its.reduce((t,x)=>t+num(x.p),0),extra=Math.round((num(e.amount)-isum)*100)/100,asum=its.filter(x=>(x.who||[]).length).reduce((t,x)=>t+num(x.p),0);let myItems=0;const lines=[];
      its.forEach(x=>{const w=x.who||[];if(w.includes(id)){const part=num(x.p)/w.length;myItems+=part;lines.push(`<li${x.of!=null?' class="ao"':''}><span>${x.of!=null?'↳ ':''}${esc(x.n)}${w.length>1?` <small>${fracLabel(w.length)} of ${esc(cv(num(x.p),e.cur))}</small>`:''}</span><span>${esc(cv(part,e.cur))}</span></li>`)}});
      if(extra&&asum>0&&myItems>0){const xl=Array.isArray(e.split.extras)&&e.split.extras.length&&Math.abs(e.split.extras.reduce((t,x)=>t+num(x.a),0)-extra)<0.02?e.split.extras:[{n:extra>0?'Share of extras':'Share of discount',a:extra}];for(const x of xl){const v=myItems/asum*num(x.a);lines.push(`<li class="ex"><span>${esc(xl.length>1||Array.isArray(e.split.extras)?x.n:x.n)}</span><span>${v<0?'−':''}${esc(cv(Math.abs(v),e.cur))}</span></li>`)}}
      detail=lines.length?`<ul class="pitems">${lines.join('')}</ul>`:''}
    else if(mine){const n=Object.keys(weights(e)).length,m=e.split?.mode;detail=`<p class="hint pnote">${m==='exact'?'Exact amounts':m==='shares'?'Split by shares':m==='nights'?(()=>{const w=weights(e),t=Object.values(w).reduce((a,v)=>a+v,0);const dd=e.split?.dates?.[id];return `By nights · ${w[id]} night${w[id]===1?'':'s'}${dd?` (${esc(dShort(dd.f))} – ${esc(dShort(dd.t))})`:''} of ${Math.round(t*100)/100} across everyone`})():m==='percent'?'Split by %':n===members().length?`Split equally with everyone (${n})`:`Split equally ${n} ways`}</p>`}
    rows.push(`<div class="pe"><div class="pe-h"><span><b>${esc(e.desc)}</b><small>${esc(fmtDate(e.date))}${payer?` · ${esc(who(id))} paid ${fc(pm)}`:''}${e.cur!==home()?` · ${esc(money(num(e.amount),e.cur))}`:''}</small></span><span class="amt">${mine?fc(mine):'<small>not in it</small>'}</span></div>${detail}</div>`)}
  let sent=0,recv=0;for(const p of S.pay){if(p.from===id)sent+=num(p.cents);if(p.to===id)recv+=num(p.cents)}
  const n=net[id]||0,plan=settle(net).filter(p=>p.from===id||p.to===id);
  $('#sheet').hidden=false;const P=$('#panel');
  P.innerHTML=`<div class="ph"><h2 class="pname">${av(id)}${esc(mname(id))}</h2><button type="button" class="x" data-act="close" aria-label="Close">×</button></div>
  <div class="pb"><div class="psum"><div><span class="lab">${n>0?'Is owed':n<0?'Owes':'All square'}</span><span class="big ${n>0?'pos':n<0?'neg':''}">${fc(Math.abs(n))}</span></div>
    <dl class="mini"><div><dt>Paid</dt><dd>${fc(paid)}</dd></div><div><dt>Their share</dt><dd>${fc(share)}</dd></div>${sent?`<div><dt>Paid back</dt><dd>${fc(sent)}</dd></div>`:''}${recv?`<div><dt>Received</dt><dd>${fc(recv)}</dd></div>`:''}</dl></div>
    ${plan.length?`<h3 class="psec">To settle</h3><div class="card">${plan.map(p=>`<div class="pay"><span class="flow">${av(p.from,'sm')}<span class="arr">→</span>${av(p.to,'sm')}<span class="txt"><b>${esc(who(p.from))}</b> ${p.from===me?'pay':'pays'} <b>${esc(who(p.to))}</b></span></span><span class="amt">${fc(p.c)}</span>${payBox(p.to)}</div>`).join('')}</div>`:''}
    <h3 class="psec">Expenses</h3>${rows.length?`<div class="card">${rows.join('')}</div>`:'<p class="muted">Nothing yet.</p>'}
    <p class="hint" style="margin-top:10px">How it adds up: ${fc(paid)} paid − ${fc(share)} share${sent?` + ${fc(sent)} paid back`:''}${recv?` − ${fc(recv)} received`:''} = ${n<0?'−':''}${fc(Math.abs(n))}.</p></div>`;
  P.scrollTop=0}
async function showReceipt(id){const e=S.exp.find(x=>x.id===id);if(!e?.receipt)return;const wasForm=!!F;
  $('#sheet').hidden=false;$('#panel').innerHTML=`<div class="ph"><h2>${esc(e.desc)}</h2><button type="button" class="x" data-act="${wasForm?'backform':'close'}" aria-label="Close">×</button></div><div class="viewer"><p class="muted" id="rv-msg">Loading receipt…</p><img id="rv" alt="Receipt photo" hidden></div>`;
  const img=$('#rv'),msg=$('#rv-msg');img.onload=()=>{img.hidden=false;msg.hidden=true};img.onerror=()=>{msg.textContent="This receipt can't be shown."};
  try{const s=await getDoc(doc(S.fs,`trips/${S.tid}/receipts/${id}`)),d=s.exists()?s.data().data:'';if(typeof d==='string'&&d.startsWith('data:image/'))img.src=d;else msg.textContent='Receipt not found yet. It may still be uploading from another phone.'}catch(x){msg.textContent="Couldn't load the receipt. Check your signal."}}
async function shareLink(){const url=tripUrl(S.tid);
  if(navigator.share){try{await navigator.share({title:S.trip.name,text:`Add your expenses for ${S.trip.name}`,url});return}catch(e){if(e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(e){const i=$('#tlink');i.select();toast('Copy the selected link')}}

document.addEventListener('click',async ev=>{
  if(ev.target.id==='sheet'){closeSheet();return}
  const b=ev.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  if(a==='padd')return addPerson();
  if(a==='prm'){const ul=$('#plist'),li=b.closest('li');if(ul&&li){if(ul.children.length>1)li.remove();else li.querySelector('input').value=''}return}
  if(a==='add')openForm();
  else if(a==='edit'){const e=S.exp.find(x=>x.id===id);if(e)openForm(e)}
  else if(a==='close')closeSheet();
  else if(a==='backform')renderForm();
  else if(a==='tab'){S.tab=b.dataset.tab;render();window.scrollTo({top:0})}
  else if(a==='iam'){S.me[S.tid]=id;store.set('rts-me',S.me);render()}
  else if(a==='notme'){delete S.me[S.tid];store.set('rts-me',S.me);render()}
  else if(a==='share')shareLink();
  else if(a==='shelp'){F.help=!F.help;renderForm();if(F.help)$('#sguide')?.scrollIntoView({block:'nearest',behavior:'smooth'})}
  else if(a==='mode'){const m=b.dataset.mode;if(m===F.mode)return;F.mp=F.mp||{};if(F.mode!=='items')F.mp[F.mode]={...F.parts};F.mode=m;if(m==='items'){if(!F.items.length)F.items=[{n:'',p:num(F.amount)>0?String(num(F.amount)):'',who:[]}];F.extra='';F.xs=[];renderForm();return}if(F.mp[m]){F.parts={...F.mp[m]};renderForm();return}const ms=members(),inc=ms.filter(x=>num(F.parts[x.id])>0),base=inc.length?inc:ms;
    F.parts=m==='exact'||m==='nights'?{}:m==='percent'?Object.fromEntries(base.map(x=>[x.id,String(Math.round(10000/base.length)/100)])):Object.fromEntries(base.map(x=>[x.id,1]));renderForm()}
  else if(a==='ndates'){if(F.pd[id])delete F.pd[id];else{F.pd[id]={f:F.nb.f||'',t:F.nb.t||''};const n=nDiff(F.pd[id].f,F.pd[id].t);if(n>0)F.parts[id]=String(n)}renderForm()}
  else if(a==='nstep'){if(F.pd[id])delete F.pd[id];const v=Math.max(0,Math.round(num(F.parts[id]))+(+b.dataset.d));F.parts[id]=v?String(v):'';if(b.closest('.nper.open')){renderForm();return}const inp=b.parentNode.querySelector('.pin');if(inp)inp.value=F.parts[id];hints()}
  else if(a==='nfill'){const v=num($('#f-nall')?.value);if(!(v>0))return toast('Enter how many nights the booking is');for(const m of members()){F.parts[m.id]=String(v);if(F.pd[m.id]){if(F.nb.f&&F.nb.t&&nDiff(F.nb.f,F.nb.t)===v)F.pd[m.id]={f:F.nb.f,t:F.nb.t};else delete F.pd[m.id]}}renderForm()}
  else if(a==='tog'){F.parts[id]=num(F.parts[id])>0?0:1;b.classList.toggle('on');b.setAttribute('aria-pressed',num(F.parts[id])>0);hints()}
  else if(a==='itog'){const i0=+b.dataset.i,it=F.items[i0];if(!it)return;const k=it.who.indexOf(id),on=k<0;on?it.who.push(id):it.who.splice(k,1);
    const paint=(j)=>{const x=F.items[j],btn=document.querySelector(`.cell[data-act="itog"][data-i="${j}"][data-id="${CSS.escape(id)}"]`);if(btn){btn.classList.toggle('on',x.who.includes(id));btn.setAttribute('aria-pressed',x.who.includes(id))}btn?.closest('tr')?.querySelector('.cell.all')?.classList.toggle('on',x.who.length===members().length)};
    paint(i0);if(it.of==null)F.items.forEach((x,j)=>{if(x.of===i0){const h=x.who.indexOf(id);if(on&&h<0)x.who.push(id);if(!on&&h>=0)x.who.splice(h,1);paint(j)}});hints()}
  else if(a==='iall'){const i0=+b.dataset.i,it=F.items[i0];if(!it)return;const all=members().map(m=>m.id);it.who=it.who.length===all.length?[]:all;if(it.of==null)F.items.forEach(x=>{if(x.of===i0)x.who=[...it.who]});renderForm()}
  else if(a==='sumtog'){F.sumOpen=F.sumOpen||{};F.sumOpen[id]=!F.sumOpen[id];b.classList.toggle('open',F.sumOpen[id]);b.setAttribute('aria-expanded',F.sumOpen[id]);const r=itemMath(),sa=$('.sall');if(sa)sa.textContent=members().filter(m=>r.per[m.id]).every(m=>F.sumOpen[m.id])?'Collapse all':'Expand all'}
  else if(a==='sumall'){const r=itemMath(),ids=members().filter(m=>r.per[m.id]).map(m=>m.id),allOpen=ids.every(x=>F.sumOpen?.[x]);F.sumOpen={};if(!allOpen)ids.forEach(x=>F.sumOpen[x]=true);itemSummary(r)}
  else if(a==='qtick'){const who=$('#qt-who')?.value,c=b.dataset.c;if(!who)return;F.qtWho=who;const its=F.items.filter(it=>num(it.p)>0&&(it.c||'food')===c);if(!its.length)return toast(`No ${c==='drink'?'drinks':c} items`);const all=its.every(it=>it.who.includes(who));its.forEach(it=>{const k=it.who.indexOf(who);if(all&&k>=0)it.who.splice(k,1);if(!all&&k<0)it.who.push(who)});const st=$('#panel').scrollTop;renderForm();$('#panel').scrollTop=st;toast(`${mname(who)} ${all?'unticked from':'ticked for'} all ${c==='drink'?'drinks':c}`)}
  else if(a==='icat'){const it=F.items[+b.dataset.i];if(!it)return;const k=(CATS.findIndex(x=>x[0]===(it.c||'food'))+1)%CATS.length;it.c=CATS[k][0];b.className=`ct ct-${CATS[k][0]}`;b.setAttribute('aria-label',`${CATS[k][1]}. Tap to change`);b.querySelector('.ctl').textContent=CATS[k][1];b.querySelector('.cts').textContent=CATS[k][2]}
  else if(a==='icol'){const all=F.items.length>0&&F.items.every(it=>it.who.includes(id));F.items.forEach(it=>{const k=it.who.indexOf(id);if(all&&k>=0)it.who.splice(k,1);if(!all&&k<0)it.who.push(id)});const st=$('#panel').scrollTop;renderForm();$('#panel').scrollTop=st;toast(all?`${mname(id)} unticked for every item`:`${mname(id)} ticked for every item`)}
  else if(a==='ilink'){const i0=+b.dataset.i,it=F.items[i0];if(!it)return;if(it.of!=null)delete it.of;else{let j=i0-1;while(j>=0&&F.items[j].of!=null)j--;if(j<0)return toast('The first item can’t be an add-on');it.of=j;it.who=[...F.items[j].who]}renderForm()}
  else if(a==='iadd'){F.items.push({n:'',p:'',who:[],c:'food'});renderForm();const ns=document.querySelectorAll('.iname:not(.xname)');ns[ns.length-1]?.focus()}
  else if(a==='idel'){const d=+b.dataset.i,snap=JSON.parse(JSON.stringify(F.items)),mine=F,nm=(F.items[d]?.n||'').trim()||'item';F.items.splice(d,1);F.items.forEach(x=>{if(x.of===d)delete x.of;else if(x.of>d)x.of--});if(!F.items.length)F.items.push({n:'',p:'',who:[],c:'food'});const st=$('#panel').scrollTop;renderForm();$('#panel').scrollTop=st;undoToast(`Removed ${nm}`,()=>{if(F!==mine)return;F.items=snap;const st2=$('#panel').scrollTop;renderForm();$('#panel').scrollTop=st2})}
  else if(a==='all'){members().forEach(m=>F.parts[m.id]=1);renderForm()}
  else if(a==='none'){F.parts={};renderForm()}
  else if(a==='rmrc'){if(F.file){URL.revokeObjectURL(F.preview);F.file=null;F.preview=null}else F.drop=true;renderForm()}
  else if(a==='receipt')showReceipt(id);
  else if(a==='who')showPerson(id);
  else if(a==='copy'){const t=b.dataset.t||'';try{await navigator.clipboard.writeText(t);toast('Copied')}catch(x){toast(t)}}
  else if(a==='savepay'){const v=($('#pp-'+CSS.escape(id))?.value||'').trim().slice(0,80);tripSave({members:members().map(m=>m.id===id?{...m,pay:v}:m)});toast(v?'Payment details saved':'Payment details removed')}
  else if(a==='rescan')scanReceipt();
  else if(a==='del'){if(!delArm){delArm=true;b.textContent='Tap again to delete';return}const e=S.exp.find(x=>x.id===F.id);if(!e)return closeSheet();const {id:eid,...body}=e,tid=S.tid;ddoc(`trips/${tid}/expenses/${eid}`);logAct(`deleted ${body.desc||'an expense'} (${fc(eCents(e))})`);closeSheet();let undone=false;undoToast('Expense deleted',()=>{undone=true;wdoc(`trips/${tid}/expenses/${eid}`,body);logAct(`restored ${body.desc||'an expense'}`)});setTimeout(()=>{if(!undone)dropRc(tid,eid,e.receipt)},7600)}
  else if(a==='paid'){b.disabled=true;put(`trips/${S.tid}/payments/${rid(12)}`,{from:b.dataset.from,to:b.dataset.to,cents:num(b.dataset.c),date:today(),createdAt:Date.now(),by:S.me[S.tid]||null});logAct(`marked ${mname(b.dataset.from)} → ${mname(b.dataset.to)} as paid (${fc(num(b.dataset.c))})`);toast('Payment recorded')}
  else if(a==='unpay'){const p=S.pay.find(x=>x.id===id);if(!p)return;const {id:pid,...body}=p,tid=S.tid;b.disabled=true;ddoc(`trips/${tid}/payments/${pid}`);logAct(`removed the payment ${mname(body.from)} → ${mname(body.to)} (${fc(num(body.cents))})`);undoToast('Payment removed',()=>{wdoc(`trips/${tid}/payments/${pid}`,body);logAct(`restored the payment ${mname(body.from)} → ${mname(body.to)}`)})}
  else if(a==='ren'){const v=$('#mn-'+CSS.escape(id))?.value.trim();if(!v)return;if(members().some(m=>m.id!==id&&m.name.toLowerCase()===v.toLowerCase()))return toast('Someone already has that name');tripSave({members:members().map(m=>m.id===id?{...m,name:v}:m)});logAct(`renamed someone to ${v}`);toast('Saved')}
  else if(a==='rmm'){if(usedBy(id))return toast('They have expenses, so they stay');tripSave({members:members().filter(m=>m.id!==id)})}
  else if(a==='saverate'){const c=b.dataset.c,r=num($('#rt-'+CSS.escape(c))?.value);if(!(r>0))return toast('Enter a rate above 0');tripSave({rates:{...S.trip.rates,[c]:r}});toast('Rate saved')}
  else if(a==='rmrate'){const c=b.dataset.c,r={...S.trip.rates};delete r[c];tripSave({rates:r})}
});
document.addEventListener('input',ev=>{if(!F)return;const t=ev.target;
  if(t.id==='f-amount')F.amount=t.value;else if(t.id==='f-rate'){F.rate=t.value;F.rateAuto=false}else if(t.id==='f-desc')F.desc=t.value;else if(t.id==='f-note')F.note=t.value;else if(t.id==='f-date'){F.date=t.value;fxFill()}
  else if(t.classList.contains('payin')){F.payers=F.payers||{};F.payers[t.dataset.id]=t.value}
  else if(t.classList.contains('pin')){F.parts[t.dataset.id]=t.value;if(F.pd?.[t.dataset.id]){delete F.pd[t.dataset.id];const r=t.closest('.nper');r?.classList.remove('open');r?.querySelector('.pdr')?.remove();r?.querySelector('.nbad')?.remove();r?.querySelector('.nds')?.remove();const c=r?.querySelector('.ncal');if(c){c.classList.remove('on');c.setAttribute('aria-pressed','false')}}}
  else if(t.id==='f-nfrom'||t.id==='f-nto'){F.nb[t.id==='f-nfrom'?'f':'t']=t.value;const n=nDiff(F.nb.f,F.nb.t),h=$('#f-nbh');if(h)h.textContent=n>0?`${n} night${n===1?'':'s'}`:F.nb.f&&F.nb.t?nWarn(F.nb.f,F.nb.t):'';h.classList.toggle('nbadt',!(n>0));if(t.id==='f-nfrom'){const e=$('#f-nto');if(e)e.min=t.value}if(n>0){const l=$('#f-nall');if(l)l.value=n}}
  else if(t.classList.contains('pdf')||t.classList.contains('pdt')){const id=t.dataset.id,d=F.pd[id]||(F.pd[id]={f:'',t:''});d[t.classList.contains('pdf')?'f':'t']=t.value;if(t.classList.contains('pdf')){const e=t.closest('.nper')?.querySelector('.pdt');if(e)e.min=t.value}const n=nDiff(d.f,d.t),r=t.closest('.nper');r?.querySelector('.nbad')?.remove();
    if(n>0){F.parts[id]=String(n);const p=r?.querySelector('.pin');if(p)p.value=n;let sm=r?.querySelector('.nds');if(!sm){sm=document.createElement('small');sm.className='nds';r?.querySelector('.nrow>span')?.append(sm)}sm.textContent=`${dShort(d.f)} – ${dShort(d.t)}`}
    else{r?.querySelector('.nds')?.remove();if(d.f&&d.t)r?.querySelector('.pdr')?.insertAdjacentHTML('afterend',`<p class="hint nbad">${esc(nWarn(d.f,d.t))}</p>`)}}
  else if(t.classList.contains('xname')){if(F.xs?.[+t.dataset.j])F.xs[+t.dataset.j].n=t.value;return}
  else if(t.classList.contains('iname'))F.items[+t.dataset.i].n=t.value;else if(t.classList.contains('iprice'))F.items[+t.dataset.i].p=t.value;else if(t.classList.contains('xamt')){if(F.xs?.[+t.dataset.j])F.xs[+t.dataset.j].a=t.value;syncX()}else return;hints()});
document.addEventListener('change',ev=>{const t=ev.target;if(!F)return;
  if(t.id==='f-cur'){F.cur=t.value;F.rate=F.cur!==home()?String(S.trip.rates?.[F.cur]??''):'';F.rateAuto=true;renderForm()}
  else if(t.id==='f-paid'){if(t.value==='__multi'){F.multi=true;if(!F.payers||!Object.keys(F.payers).length)F.payers={[F.paidBy]:F.amount||''}}else{F.multi=false;F.paidBy=t.value}renderForm()}
  else if(t.classList.contains('iprice')){const v=fmtP(t.value);t.value=v;F.items[+t.dataset.i].p=v}
  else if(t.classList.contains('xamt')){const v=fmtP(t.value);t.value=v;if(F.xs?.[+t.dataset.j])F.xs[+t.dataset.j].a=v;syncX()}
  else if(t.id==='f-file'&&t.files?.[0]){F.file=t.files[0];F.preview=URL.createObjectURL(F.file);scanReceipt()}});
document.addEventListener('submit',ev=>{ev.preventDefault();const f=ev.target,fd=new FormData(f);
  if(f.id==='ef')return saveExpense();
  if(f.id==='join'){const v=String(fd.get('code')||'').trim(),m=/trip=([a-z0-9]{20,})/.exec(v)||/^([a-z0-9]{20,})$/.exec(v);if(!m)return toast("That doesn't look like a trip link");location.search='?trip='+m[1];return}
  if(f.id==='newtrip'){const name=String(fd.get('name')||'').trim(),seen=new Set();
    const ms=fd.getAll('members').join('\n').split(/[\n,]+/).map(s=>s.trim().slice(0,30)).filter(s=>s&&!seen.has(s.toLowerCase())&&seen.add(s.toLowerCase())).slice(0,30).map(n=>({id:rid(8),name:n}));
    if(!name||!ms.length)return toast('Add a trip name and at least one person');
    const tid=rid(22),hc=String(fd.get('home')||'AUD');
    put('trips/'+tid,{name:name.slice(0,60),home:hc,members:ms,rates:{},createdAt:Date.now()});
    S.me[tid]=ms[0].id;store.set('rts-me',S.me);S.recent[tid]={name,home:hc,people:ms.map(m=>m.name).join(', '),created:Date.now(),at:Date.now()};store.set('rts-trips',S.recent);
    history.pushState(null,'','?trip='+tid);route();S.tab='trip';render();return}
  if(f.id==='addmem'){const n=String(fd.get('n')||'').trim().slice(0,30);if(!n)return;if(members().some(m=>m.name.toLowerCase()===n.toLowerCase()))return toast('Already on the trip');tripSave({members:[...members(),{id:rid(8),name:n}]});logAct(`added ${n} to the trip`);toast(n+' added')}
  if(f.id==='addrate'){const c=String(fd.get('c')||''),r=num(fd.get('r'));if(!c||!(r>0))return toast('Enter a rate above 0');tripSave({rates:{...(S.trip.rates||{}),[c]:r}});toast(c+' added')}
});
document.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.closest?.('#plist')){ev.preventDefault();addPerson(ev.target.closest('li'));return}if(ev.key==='Escape'&&!$('#sheet').hidden)closeSheet()});
window.addEventListener('online',syncBadge);window.addEventListener('offline',syncBadge);

function subLog(tid){if(S.tid!==tid)return;listen('log',query(collection(S.fs,`trips/${tid}/log`),orderBy('t','desc'),limit(40)),s=>{S.log=s.docs.map(d=>({...d.data(),id:d.id})).sort((x,y)=>(y.t||0)-(x.t||0));if(S.tab==='trip')render()})}
function closeTrip(){unsubs.forEach(u=>{try{u()}catch(e){}});unsubs=[];S.tid=null;S.trip=null;S.exp=[];S.pay=[];S.pending={}}
function listen(key,ref,cb){unsubs.push(onSnapshot(ref,{includeMetadataChanges:true},s=>{S.pending[key]=s.metadata.hasPendingWrites;cb(s)},e=>{console.warn(e);S.stale=true;render()}))}
function openTrip(tid){if(S.tid===tid)return;closeTrip();closeSheet();S.tid=tid;S.tripMissing=false;S.stale=false;S.tab='exp';S.log=[];render();setTimeout(()=>subLog(tid),0);
  const t0=setTimeout(()=>{if(!S.trip){S.stale=true;render()}},10000);
  listen('trip',doc(S.fs,'trips/'+tid),s=>{if(!s.exists()){if(!s.metadata.fromCache){clearTimeout(t0);S.tripMissing=true}S.trip=null}
    else{clearTimeout(t0);S.stale=false;S.tripRaw=s.data();S.trip=S.tripRaw;S.recent[tid]={name:S.trip.name,home:S.trip.home,people:members().map(m=>m.name).join(', '),color:S.trip.color||'',thumb:S.trip.thumb||'',scene:S.trip.scene||'',created:S.trip.createdAt||0,at:Date.now()};store.set('rts-trips',S.recent)}
    render();if(F)hints()});
  listen('exp',collection(S.fs,`trips/${tid}/expenses`),s=>{S.exp=s.docs.map(d=>({...d.data(),id:d.id}));render()});
  listen('pay',collection(S.fs,`trips/${tid}/payments`),s=>{S.pay=s.docs.map(d=>({...d.data(),id:d.id}));render()})}
function route(){const t=new URLSearchParams(location.search).get('trip');if(t&&/^[a-z0-9]{20,}$/.test(t))openTrip(t);else{if(S.tid){closeTrip();closeSheet()}render()}}
window.addEventListener('popstate',()=>{if(S.fs)route()});

if(!cfg?.projectId||String(cfg.apiKey).startsWith('PASTE')){S.setup=true;render()}
else{const app=initializeApp(cfg);S.app=app;
  try{S.fs=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}catch(e){S.fs=initializeFirestore(app,{})}
  route()}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

document.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.id==='f-nall'){ev.preventDefault();document.querySelector('[data-act=nfill]')?.click()}});

// ---- Import many expenses at once: a bank CSV/Excel export, or photos/screenshots of a transaction list ----
var IM=null;
const IM_MAX=300;
function imOpen(){const me=S.me[S.tid];IM={step:'pick',rows:[],cur:home(),rate:'',paidBy:me,who:Object.fromEntries(members().map(m=>[m.id,1])),busy:'',err:'',srcs:[]};$('#sheet').hidden=false;imRender()}
const imTitle=s=>{s=String(s||'').replace(/\s+/g,' ').trim();if(s&&s===s.toUpperCase()&&/[A-Z]{3}/.test(s))s=s.toLowerCase().replace(/(^|[\s\-\/&(.'])([a-z])/g,(m,a,b)=>a+b.toUpperCase());return s};
const imClean=s=>imTitle(String(s||'').replace(/\b(card|crd)\s*x{2,}\d+/ig,'').replace(/value date:?\s*\S+/ig,'').replace(/\s+(aus|au)\s*$/i,'').replace(/\s+(nsw|ns|vic|vi|qld|ql|wa|sa|tas|ta|nt|act|ac)\s*$/i,'').replace(/\s{2,}/g,' ').trim()).slice(0,80)||'Expense';
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function imDate(v,mdFirst){if(v==null)return '';if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
  let s=String(v).trim();if(!s)return '';let m,y,mo,d;const fy=y=>y<100?2000+y:y;
  if(m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)){y=+m[1];mo=+m[2];d=+m[3]}
  else if(m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/)){y=fy(+m[3]);if(mdFirst||+m[2]>12){mo=+m[1];d=+m[2]}else{d=+m[1];mo=+m[2]}}
  else if(m=s.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3,9})\.?[\s\-,]+(\d{2,4})\b/)){d=+m[1];mo=MON[m[2].toLowerCase().slice(0,4)]||MON[m[2].toLowerCase().slice(0,3)];y=fy(+m[3])}
  else if(m=s.match(/^(?:[A-Za-z]{3,9},?\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/)){mo=MON[m[1].toLowerCase().slice(0,4)]||MON[m[1].toLowerCase().slice(0,3)];d=+m[2];y=+m[3]}
  else return '';
  if(!(y>1990&&y<2100&&mo>=1&&mo<=12&&d>=1&&d<=31))return '';return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function imNum(v){if(typeof v==='number')return isFinite(v)?v:NaN;let s=String(v??'').trim();if(!s)return NaN;let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1)}if(/\bDR\b/i.test(s))neg=true;s=s.replace(/\b(CR|DR)\b/ig,'');
  s=s.replace(/[^\d.,\-+]/g,'');if(/^-|-$/.test(s)){neg=!neg;s=s.replace(/-/g,'')}s=s.replace(/^\+/,'');
  if(/,\d{1,2}$/.test(s)&&!/\.\d/.test(s))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');
  if(!/^\d*\.?\d+$/.test(s))return NaN;const n=parseFloat(s);return neg?-n:n}
function imCSV(text){text=text.replace(/^﻿/,'');const first=text.split(/\r?\n/).find(l=>l.trim())||'';const dl=[',',';','\t','|'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch}
    else if(ch==='"')q=true;else if(ch===dl){row.push(cell);cell=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=ch}
  if(cell||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(c=>String(c).trim()))}
function imCurFrom(s){s=String(s||'');const c=s.toUpperCase().match(/\b([A-Z]{3})\b/g)?.find(x=>CURS.includes(x));if(c)return c;
  if(/円/.test(s))return 'JPY';if(/元|RMB/i.test(s))return 'CNY';if(/¥/.test(s))return S.trip.rates?.CNY&&!S.trip.rates?.JPY?'CNY':'JPY';if(/€/.test(s))return 'EUR';if(/£/.test(s))return 'GBP';if(/₩/.test(s))return 'KRW';if(/฿/.test(s))return 'THB';return ''}
// Works out which columns hold the date, description and amount, with or without a header row.
function imTable(rows){rows=rows.map(r=>r.map(c=>c instanceof Date?c:String(c??'').trim()));const n=Math.max(...rows.map(r=>r.length));if(!rows.length||n<2)throw new Error("couldn't find any rows");
  const col=c=>rows.map(r=>r[c]??'');let dc=-1,best=0;
  for(let c=0;c<n;c++){const v=col(c).filter(x=>x!=='');const f=v.length?v.filter(x=>imDate(x)).length/rows.length:0;if(f>best){best=f;dc=c}}
  if(dc<0||best<0.3)throw new Error("couldn't find a date column");
  const md=col(dc).some(x=>{const m=String(x).match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.]/);return m&&+m[2]>12});
  const di=rows.findIndex(r=>imDate(r[dc],md));let hdr=[];if(di>0&&!imDate(rows[di-1][dc],md))hdr=rows[di-1].map(x=>String(x).toLowerCase());
  const data=rows.slice(di).filter(r=>imDate(r[dc],md));
  const numeric=c=>{const v=data.map(r=>r[c]??'').filter(x=>String(x).trim()!=='');return v.length>=data.length*0.3&&v.filter(x=>!isNaN(imNum(x))).length>=v.length*0.8};
  const H=(re,ex)=>hdr.findIndex((h,c)=>c!==dc&&re.test(h)&&!(ex&&ex.test(h)));
  const bal=H(/balance/);let deb=H(/debit|withdraw|money out|paid out|outflow|spent/),cre=H(/credit|deposit|money in|paid in|inflow/,/card/);
  if(deb>=0&&!numeric(deb))deb=-1;if(cre>=0&&!numeric(cre))cre=-1;
  let ac=-1;if(deb<0){ac=H(/amount|value|total|price|^aud|^jpy|^cny|^usd/,/balance/);if(ac>=0&&!numeric(ac))ac=-1;
    if(ac<0){const nc=[];for(let c=0;c<n;c++)if(c!==dc&&c!==bal&&numeric(c))nc.push(c);if(!nc.length)throw new Error("couldn't find an amount column");
      const negs=c=>data.filter(r=>imNum(r[c])<0).length;ac=nc.reduce((a,c)=>negs(c)>negs(a)?c:a,nc[0])}}
  const used=new Set([dc,deb,cre,ac,bal]);let tc=H(/desc|detail|narrat|merchant|payee|particular|transaction|memo|name|reference|item/,/date|amount|type|category/);
  if(tc<0||used.has(tc)){let bl=-1;tc=-1;for(let c=0;c<n;c++){if(used.has(c))continue;const avg=data.reduce((s,r)=>s+String(r[c]??'').length,0)/data.length;if(avg>bl&&data.some(r=>isNaN(imNum(r[c]))&&String(r[c]??'').trim())){bl=avg;tc=c}}}
  let neg=0,pos=0;if(ac>=0)for(const r of data){const v=imNum(r[ac]);if(v<0)neg++;else if(v>0)pos++}const outNeg=neg>=pos;
  const cur=imCurFrom(hdr.join(' '))||imCurFrom(data.slice(0,20).map(r=>r[ac>=0?ac:deb]).join(' '));
  const out=[];for(const r of data){let amt,dir;
    if(deb>=0){const a=imNum(r[deb]),b=cre>=0?imNum(r[cre]):NaN;if(!isNaN(a)&&a!==0){amt=Math.abs(a);dir='out'}else if(!isNaN(b)&&b!==0){amt=Math.abs(b);dir='in'}else continue}
    else{const v=imNum(r[ac]);if(isNaN(v)||v===0)continue;amt=Math.abs(v);dir=(v<0)===outNeg?'out':'in'}
    out.push({date:imDate(r[dc],md),desc:tc>=0?r[tc]:'',amount:amt,dir})}
  if(!out.length)throw new Error("couldn't find any transactions");return {cur,tx:out}}
async function imSheetRows(file){const buf=await file.arrayBuffer();let X;
  for(const u of['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm','https://esm.sh/xlsx@0.18.5']){try{X=await import(u);break}catch(e){}}
  if(!X)throw new Error("couldn't open Excel files here. Save it as CSV and try again");
  const wb=X.read(buf,{type:'array',cellDates:true});let rows=[];for(const nm of wb.SheetNames){rows=X.utils.sheet_to_json(wb.Sheets[nm],{header:1,raw:true,defval:''});if(rows.length>1)break}
  return rows.map(r=>r.map(c=>typeof c==='number'?String(c):c))}
function imAdd(tx,cur,src){const dp=c=>curDp(c||IM.cur);if(!IM.rows.length&&cur&&curOptions().includes(cur)){IM.cur=cur;IM.rate=cur!==home()?String(S.trip.rates?.[cur]??''):''}
  const key=t=>`${t.date}|${String(t.desc).toLowerCase().replace(/\W/g,'')}|${Math.round(t.amount*100)}`,seen=new Set(IM.rows.map(key));let added=0,skipped=0;
  for(const t of tx){if(IM.rows.length>=IM_MAX)break;const r={id:rid(6),date:t.date||'',desc:imClean(t.desc),amount:(Math.round(num(t.amount)*10**dp())/10**dp()).toFixed(dp()),dir:t.dir==='in'?'in':'out',src};
    if(!(num(r.amount)>0))continue;if(seen.has(key(r))){skipped++;continue}seen.add(key(r));
    r.dup=S.exp.some(e=>e.date===r.date&&e.cur===IM.cur&&Math.abs(num(e.amount)-num(r.amount))<0.005);r.on=r.dir==='out'&&!r.dup;IM.rows.push(r);added++}
  IM.rows.sort((a,b)=>(a.date||'9').localeCompare(b.date||'9'));return {added,skipped}}
async function imFiles(files){files=[...files];if(!files.length)return;IM.err='';
  for(const [k,f] of files.entries()){if(!IM)return;const img=/^image\//.test(f.type)||/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name),tag=files.length>1?` (${k+1} of ${files.length})`:'';
    IM.busy=img?`Reading the photo${tag}…`:`Reading ${f.name}…`;imRender();
    try{let r;if(img)r=await imReadPhoto(f);else{const rows=/\.(xlsx|xlsm|xls|ods)$/i.test(f.name)?await imSheetRows(f):imCSV(await f.text());r=imTable(rows)}
      if(!IM)return;const {added,skipped}=imAdd(r.tx,r.cur,f.name);IM.srcs.push(f.name);if(!added&&!skipped)IM.err=`Nothing found in ${f.name}.`;else if(skipped)toast(`${skipped} repeated row${skipped>1?'s':''} skipped`)}
    catch(e){console.error(e);if(!IM)return;IM.err=`Couldn't read ${f.name}: ${e?.message||'try another file'}.`}}
  if(!IM)return;IM.busy='';IM.step=IM.rows.length?'review':'pick';imRender()}
function imPhotoNorm(r){const cur=String(r?.currency||'').toUpperCase();return {cur:/^[A-Z]{3}$/.test(cur)?cur:'',tx:(Array.isArray(r?.transactions)?r.transactions:[]).map(t=>({date:/^\d{4}-\d{2}-\d{2}$/.test(t?.date||'')?t.date:'',desc:String(t?.description||''),amount:Math.abs(num(t?.amount)),dir:String(t?.direction||'out').toLowerCase()==='in'?'in':'out'})).filter(t=>t.amount>0)}}
const IM_PROMPT=()=>`This image shows a list of bank or card transactions (a phone screenshot, a statement, or a photo of one). Today is ${today()}. List every transaction shown, top to bottom. `+
  `date: YYYY-MM-DD. If the year isn't shown, use the most recent such date that isn't after today. If transactions are grouped under a day heading (like "Today", "Yesterday" or "Fri 27 Nov"), use that day. Empty only if no date is shown anywhere. `+
  `description: the merchant or payee as shown, with tidy capitalisation, without card numbers or reference codes. amount: a positive number. `+
  `direction: "out" for purchases, payments and withdrawals, "in" for refunds, deposits and money received. Skip running balances, totals and headings. `+
  `currency: the ISO 4217 code of the amounts, guessed from symbols and the bank's country if not printed.`;
function imMoney(v){return IM.cur===home()?fc(Math.round(v*100)):money(v,IM.cur)}
function imSel(){return IM.rows.filter(r=>r.on&&num(r.amount)>0)}
function imRender(){if(!IM)return;const p=$('#panel');if(!p)return;const ms=members(),fx=IM.cur!==home();
  if(fx&&!IM.rate){const c=IM.cur;fxRate(c,today()).then(r=>{if(r&&IM&&IM.cur===c&&!IM.rate){IM.rate=String(r.rate);imRender()}})}
  const head=`<div class="ph"><h2>Import expenses</h2><button type="button" class="x" data-act="close" aria-label="Close">×</button></div>`;
  const pick=`<div class="imdrop"><p>Add a <b>screenshot or photo</b> of a transaction list, or a <b>CSV or Excel file</b> exported from your bank. You choose which ones to add before anything is saved.</p>
    <label class="btn primary file">Photo or screenshot<input type="file" class="imfile" accept="image/*" multiple></label>
    <label class="btn file">CSV or Excel file<input type="file" class="imfile" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,text/csv"></label>
    <p class="hint">Several screenshots of one long list are fine. Rows that repeat across them are only added once.</p></div>`;
  const status=IM.busy?`<p class="imbusy"><span class="spin" aria-hidden="true"></span>${esc(IM.busy)}</p>`:IM.err?`<p class="err">${esc(IM.err)}</p>`:'';
  if(IM.step==='pick'){p.innerHTML=head+`<div class="stackf">${status}${IM.busy?'':pick}</div>`;return}
  const n=IM.rows.filter(r=>r.on).length,ins=IM.rows.filter(r=>r.dir==='in').length,dups=IM.rows.filter(r=>r.dup).length;
  p.innerHTML=head+`<div class="stackf">
    <div class="imtop"><span>${IM.rows.length} found${ins?` · ${ins} money in`:''}${dups?` · ${dups} already added?`:''}</span><span><button type="button" class="btn small" data-act="imx-all">All</button><button type="button" class="btn small" data-act="imx-none">None</button></span></div>
    <p class="hint" style="margin:-4px 0 0">Untick anything that isn't shared. Money in and likely duplicates start unticked.</p>
    <ul class="imlist">${IM.rows.map((r,i)=>`<li class="imrow${r.on?' on':''}"><label class="imck"><input type="checkbox" data-i="${i}" class="imon"${r.on?' checked':''} aria-label="Add ${esc(r.desc)}"></label>
      <span class="imm"><input class="imdesc" data-i="${i}" value="${esc(r.desc)}" maxlength="80" aria-label="Description"><span class="imsub"><input type="date" class="imdate" data-i="${i}" value="${esc(r.date)}" aria-label="Date">${r.dir==='in'?'<em class="tag in">money in</em>':''}${r.dup?'<em class="tag dup">already added?</em>':''}</span></span>
      <span class="ima"><span class="psym" aria-hidden="true">${esc(curSym(IM.cur))}</span><input class="imamt" data-i="${i}" inputmode="decimal" value="${esc(r.amount)}" aria-label="Amount"></span></li>`).join('')}</ul>
    <label class="btn small file imaddmore">+ Add another screenshot or file<input type="file" class="imfile" accept="image/*,.csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods" multiple></label>${status}
    <fieldset class="imset"><legend>For all ticked expenses</legend>
      <div class="two"><label>Currency<select id="im-cur">${curOptions().map(c=>`<option${c===IM.cur?' selected':''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Paid by<select id="im-paid">${ms.map(m=>`<option value="${esc(m.id)}"${m.id===IM.paidBy?' selected':''}>${esc(m.name)}</option>`).join('')}</select></label></div>
      ${fx?`<label>Exchange rate <small>1 ${esc(IM.cur)} = how many ${esc(home())}?</small><input id="im-rate" inputmode="decimal" value="${esc(IM.rate)}" placeholder="e.g. 0.0103"></label>`:''}
      <div><span class="imlbl">Split equally between</span><div class="chips">${ms.map(m=>`<button type="button" class="chip${IM.who[m.id]?' on':''}" data-act="imx-who" data-id="${esc(m.id)}" aria-pressed="${!!IM.who[m.id]}">${av(m.id,'xs')}${esc(m.name)}</button>`).join('')}</div>
      <p class="hint" style="margin-top:6px">You can change the split on any of them afterwards, e.g. to Items or Nights.</p></div></fieldset>
    <p class="err" id="im-err"></p>
    <div class="acts"><button type="button" class="btn primary" id="im-save" data-act="imx-save">${imBtn()}</button></div></div>`}
function imBtn(){const s=imSel(),t=s.reduce((a,r)=>a+num(r.amount),0);return s.length?`Add ${s.length} expense${s.length>1?'s':''} · ${imMoney(t)}`:'Tick the ones to add'}
function imFoot(){const b=$('#im-save');if(b)b.textContent=imBtn()}
async function imSave(){const sel=imSel(),err=m=>{const e=$('#im-err');if(e)e.textContent=m};if(!sel.length)return err('Tick at least one expense.');
  const parts={};for(const m of members())if(IM.who[m.id])parts[m.id]=1;if(!Object.keys(parts).length)return err('Choose who these are split between.');
  const fx=IM.cur!==home(),rate=fx?num(IM.rate):1;if(!(rate>0))return err(`Enter the exchange rate for ${IM.cur}.`);
  const b=$('#im-save');if(b){b.disabled=true;b.textContent='Adding…'}const me=S.me[S.tid],now=Date.now();let tot=0;
  try{for(const [k,r] of sel.entries()){const amount=num(r.amount);tot+=amount;
    await imPut(`trips/${S.tid}/expenses/${rid(12)}`,{desc:r.desc.trim()||'Expense',amount,cur:IM.cur,rate,paidBy:IM.paidBy,date:r.date||today(),split:{mode:'equal',parts},receipt:null,createdBy:me,createdAt:now+k,updatedAt:now+k,updatedBy:me})}}
  catch(e){if(b){b.disabled=false;b.textContent=imBtn()}return err(e?.message||"Couldn't save. Check your signal and try again.")}
  if(fx&&num(S.trip.rates?.[IM.cur])!==rate)tripSave({rates:{...(S.trip.rates||{}),[IM.cur]:rate}});
  logAct(`imported ${sel.length} expense${sel.length>1?'s':''} (${money(tot,IM.cur)})`);IM=null;closeSheet();toast(`${sel.length} expense${sel.length>1?'s':''} added`)}
document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='imx-open'){ev.stopPropagation();imOpen();return}if(!IM||!a.startsWith('imx-'))return;
  if(a==='imx-all'){IM.rows.forEach(r=>r.on=true);imRender()}else if(a==='imx-none'){IM.rows.forEach(r=>r.on=false);imRender()}
  else if(a==='imx-who'){const id=b.dataset.id;IM.who[id]=IM.who[id]?0:1;b.classList.toggle('on',!!IM.who[id]);b.setAttribute('aria-pressed',!!IM.who[id])}
  else if(a==='imx-save')imSave()});
document.addEventListener('change',ev=>{if(!IM)return;const t=ev.target;
  if(t.classList.contains('imfile')){const fs=[...(t.files||[])];t.value='';imFiles(fs)}
  else if(t.classList.contains('imon')){const r=IM.rows[+t.dataset.i];if(r){r.on=t.checked;t.closest('.imrow')?.classList.toggle('on',r.on);imFoot()}}
  else if(t.id==='im-cur'){IM.cur=t.value;IM.rate=IM.cur!==home()?String(S.trip.rates?.[IM.cur]??''):'';imRender()}
  else if(t.id==='im-paid')IM.paidBy=t.value;
  else if(t.classList.contains('imdate')){const r=IM.rows[+t.dataset.i];if(r)r.date=t.value}});
document.addEventListener('input',ev=>{if(!IM)return;const t=ev.target,r=IM.rows[+t.dataset?.i];
  if(t.classList.contains('imdesc')&&r)r.desc=t.value;else if(t.classList.contains('imamt')&&r){r.amount=t.value;imFoot()}else if(t.id==='im-rate')IM.rate=t.value});

const imPut=async(path,body)=>{put(path,body)};
const txModels={};
async function txModelFor(name){if(!txModels[name]){const {getAI,getGenerativeModel,GoogleAIBackend,Schema}=await import('https://www.gstatic.com/firebasejs/13.4.0/firebase-ai.js');
    const schema=Schema.object({properties:{currency:Schema.string({description:'ISO 4217 code such as AUD, JPY, CNY'}),transactions:Schema.array({items:Schema.object({properties:{date:Schema.string({description:'YYYY-MM-DD or empty'}),description:Schema.string(),amount:Schema.number({description:'Positive amount'}),direction:Schema.string({description:'out or in'})}})})}});
    txModels[name]=getGenerativeModel(getAI(S.app,{backend:new GoogleAIBackend()}),{model:name,generationConfig:{responseMimeType:'application/json',responseSchema:schema,...AI_GEN(name)}})}return txModels[name]}
async function imReadPhoto(file){const b=await shrink(file,2400,.85),data=(await toData(b)).split(',')[1];
  return aiTry(async name=>{const res=await (await txModelFor(name)).generateContent([IM_PROMPT(),{inlineData:{data,mimeType:'image/jpeg'}}]);return imPhotoNorm(JSON.parse(res.response.text()))},r=>r.tx.length>0)}

