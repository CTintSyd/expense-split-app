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
const eCents=e=>Math.round(num(e.amount)*(e.cur===home()?1:num(e.rate))*100);
const weights=e=>{const p=e.split?.parts||{},w={};for(const k in p){const v=num(p[k]);if(v>0)w[k]=v}return w};
function alloc(total,w){const ids=Object.keys(w).filter(k=>w[k]>0),sum=ids.reduce((a,k)=>a+w[k],0),out={};if(!sum||total<=0)return out;let used=0;const rem=[];
  for(const k of ids){const x=total*w[k]/sum,f=Math.floor(x);out[k]=f;used+=f;rem.push([x-f,k])}
  rem.sort((a,b)=>b[0]-a[0]);for(let i=0;i<total-used;i++)out[rem[i%rem.length][1]]++;return out}
function calc(){const net={},share={};let spent=0;members().forEach(m=>{net[m.id]=0;share[m.id]=0});
  for(const e of S.exp){const c=eCents(e);if(!(c>0))continue;spent+=c;net[e.paidBy]=(net[e.paidBy]||0)+c;const o=alloc(c,weights(e));for(const k in o){net[k]=(net[k]||0)-o[k];share[k]=(share[k]||0)+o[k]}}
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
    t.className='top tm';t.innerHTML=SCENE+`<div class="topin"><a class="back" href="./">All trips</a><h1>${esc(S.trip.name)}</h1></div>`;
    $('#hcard').innerHTML=`<div><div><div class="lab">${lab}</div><div class="big ${me&&n>0?'pos':me&&n<0?'neg':''}">${fc(me?Math.abs(n):spent)}</div></div>
      <dl class="mini"><div><dt>Trip total</dt><dd>${fc(spent)}</dd></div>${me?`<div><dt>Your share</dt><dd>${fc(share[me]||0)}</dd></div>`:''}<div><dt>Expenses</dt><dd>${S.exp.length}</dd></div></dl></div>`;$('#hcard').hidden=false;
  }else{t.className='top';t.innerHTML=SCENE+`<div class="topin"><h1>Road Trip Split</h1><p class="sub">Everyone adds what they paid. The app works out who owes whom.</p></div>`;$('#hcard').hidden=true}}

function render(){renderTop();syncBadge();const a=$('#app'),fab=$('#fab');fab.hidden=true;
  if(S.setup){a.innerHTML=`<section class="band"><div class="empty"><h2>Almost ready</h2><p class="muted">Paste your Firebase config into <b>firebase-config.js</b>, then upload the folder again.</p></div></section>`;return}
  if(!S.tid){a.innerHTML=homeView();return}
  if(!S.trip){a.innerHTML=`<section class="band"><p class="muted">${S.tripMissing?"This trip link doesn't work. Check you have the whole link.":S.stale?"Can't reach this trip yet. Check your signal.":'Loading trip…'}</p><a class="btn" href="./">All trips</a></section>`;return}
  const me=S.me[S.tid];
  if(!me||!members().some(m=>m.id===me)){a.innerHTML=`<section class="band who"><h2>Who are you?</h2><p class="muted">Pick your name so new expenses default to you. You can change it later.</p><div class="chips">${members().map(m=>`<button type="button" class="chip" data-act="iam" data-id="${esc(m.id)}">${av(m.id)}${esc(m.name)}</button>`).join('')}</div></section>`;return}
  const tabs=[['exp','Expenses'],['settle','Settle up'],['trip','Trip']];
  a.innerHTML=`<nav class="tabs">${tabs.map(([k,l])=>`<button type="button" data-act="tab" data-tab="${k}" aria-current="${S.tab===k}">${l}</button>`).join('')}</nav>`+
    (S.tab==='exp'?expView():S.tab==='settle'?settleView():tripView());
  fab.hidden=S.tab==='trip'}

const pRow=first=>`<li><input name="members" maxlength="30" placeholder="${first?'Your name':'Name'}" autocomplete="off" aria-label="${first?'Your name':'Person'}"><button type="button" class="x" data-act="prm" aria-label="Remove">×</button></li>`;
function addPerson(after){const ul=$('#plist');if(!ul)return;const t=document.createElement('template');t.innerHTML=pRow(false);const li=t.content.firstChild;after?after.after(li):ul.append(li);li.querySelector('input').focus()}
function homeView(){const list=Object.entries(S.recent).sort((a,b)=>(b[1].at||0)-(a[1].at||0)).map(([id,t])=>`<a class="trip" href="?trip=${esc(id)}"><span class="tico" aria-hidden="true"></span><b>${esc(t.name||'Trip')}</b><span>${esc(t.people||'')}</span><span class="cur">${esc(t.home||'')}</span></a>`).join('');
  return `<section class="band"><h2>Your trips</h2>${list||'<p class="muted">Trips you open on this phone show up here.</p>'}
    <form id="join" class="inline" style="margin-top:12px"><input name="code" placeholder="Paste a trip link" aria-label="Trip link" autocomplete="off"><button class="btn">Open</button></form></section>
  <section class="band"><h2>Start a trip</h2><form id="newtrip" class="stackf">
    <label>Trip name<input name="name" required maxlength="60" placeholder="Great Ocean Road"></label>
    <label>Home currency <small>Everything is settled in this</small><select name="home">${CURS.map(c=>`<option${c==='AUD'?' selected':''}>${c}</option>`).join('')}</select></label>
    <fieldset class="ppl"><legend>Who's coming? <small>Your name first, then everyone else.</small></legend><ul class="plist" id="plist">${[0,1,2].map(i=>pRow(i===0)).join('')}</ul><button type="button" class="btn small" data-act="padd">+ Add person</button></fieldset>
    <button class="btn primary">Create trip</button></form></section>`}

function splitLabel(e){const w=weights(e),n=Object.keys(w).length,m=e.split?.mode;
  if(m==='items'){const k=(e.split.items||[]).length;return `${k} item${k===1?'':'s'}`}
  if(m==='exact')return 'exact amounts';if(m==='percent')return 'by %';if(m==='shares')return 'by shares';if(m==='nights')return 'by nights';
  return n===members().length?'split with everyone':`split ${n} way${n===1?'':'s'}`}
function expView(){if(!S.exp.length)return `<section class="band"><div class="empty"><h2>No expenses yet</h2><p class="muted">Tap <b>Add expense</b> when someone pays for fuel, food or a room.</p></div></section>`;
  const me=S.me[S.tid],rows=[...S.exp].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0)),days=[];
  for(const e of rows){const d=e.date||'';if(!days.length||days[days.length-1].d!==d)days.push({d,items:[]});days[days.length-1].items.push(e)}
  return `<section class="band">${days.map(g=>`<h3 class="day"><span>${esc(fmtDate(g.d))}</span><span>${fc(g.items.reduce((s,e)=>s+eCents(e),0))}</span></h3><ul class="list">${g.items.map(e=>{const c=eCents(e),mine=alloc(c,weights(e))[me]||0;
    return `<li><button type="button" class="exp" data-act="edit" data-id="${esc(e.id)}">${av(e.paidBy)}<span class="ed"><b>${esc(e.desc)}</b><small>${esc(e.paidBy===me?'You':mname(e.paidBy))} paid · ${esc(splitLabel(e))}${mine?` · your part ${fc(mine)}`:''}${e.receipt?' · receipt':''}</small></span><span class="amt">${fc(c)}${e.cur!==home()?`<small>${esc(money(num(e.amount),e.cur))}</small>`:''}</span></button></li>`}).join('')}</ul>`).join('')}</section>`}

function settleView(){const {net}=calc(),me=S.me[S.tid],max=Math.max(1,...Object.values(net).map(Math.abs)),plan=settle(net);
  const who=id=>id===me?'You':mname(id);
  const bals=members().map(m=>{const n=net[m.id]||0;return `<button type="button" class="bal" data-act="who" data-id="${esc(m.id)}" aria-label="See ${esc(m.name)}'s breakdown"><span class="whois">${av(m.id,'sm')}${esc(m.name)}</span><div class="bar"><i class="${n>=0?'pos':'neg'}" style="width:${(Math.abs(n)/max*50).toFixed(1)}%"></i></div><span class="amt ${n>0?'pos':n<0?'neg':''}">${n>0?'+':n<0?'−':''}${fc(Math.abs(n))}</span></button>`}).join('');
  const pays=[...S.pay].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return `<section class="band"><div class="sec"><h2>Balances</h2><p class="hint" style="margin:-8px 0 8px">Blue means they're owed money. Red means they owe. Tap someone to see why.</p><div class="card">${bals}</div></div>
  ${typeView()}<div class="sec"><h2>Payments to settle</h2>${plan.length?`<div class="card">${plan.map(p=>`<div class="pay"><span class="flow">${av(p.from,'sm')}<span class="arr">→</span>${av(p.to,'sm')}<span class="txt"><b>${esc(who(p.from))}</b> ${p.from===me?'pay':'pays'} <b>${esc(who(p.to))}</b></span></span><span class="amt">${fc(p.c)}</span>${payBox(p.to)}<button type="button" class="btn small teal" data-act="paid" data-from="${esc(p.from)}" data-to="${esc(p.to)}" data-c="${p.c}">Mark paid</button></div>`).join('')}</div><p class="hint" style="margin-top:8px">This is the fewest transfers that clears everyone.</p>`:`<div class="empty"><b>Everyone's square.</b></div>`}</div>
  ${pays.length?`<div class="sec"><h2>Payments made</h2><div class="card">${pays.map(p=>`<div class="pay"><span>${esc(who(p.from))} paid ${esc(who(p.to))}<small class="hint" style="display:block">${esc(fmtDate(p.date))}</small></span><span class="amt">${fc(num(p.cents))}</span><button type="button" class="btn small" data-act="unpay" data-id="${esc(p.id)}">Undo</button></div>`).join('')}</div></div>`:''}</section>`}

function usedBy(id){return S.exp.some(e=>e.paidBy===id||weights(e)[id])||S.pay.some(p=>p.from===id||p.to===id)}
function tripView(){const t=S.trip,rates=t.rates||{};
  return `<section class="band"><div class="sec"><h2>Invite friends</h2><p class="hint" style="margin:-6px 0 0">Anyone with this link can see and add to the trip. No account needed, so only share it with the group.</p>
    <div class="linkbox"><input id="tlink" readonly value="${esc(tripUrl(S.tid))}" aria-label="Trip link"><button type="button" class="btn teal" data-act="share">${navigator.share?'Share':'Copy'}</button></div>
    <div class="note" style="margin-top:12px"><b>Use it like an app:</b> open the link, then on iPhone tap Share → Add to Home Screen. On Android tap ⋮ → Add to Home screen.</div></div>
  <div class="sec"><h2>People</h2><p class="hint" style="margin:-6px 0 10px">Add PayID or bank details so they show in Settle up. Everyone on the trip can see them.</p><div class="card">${members().map(m=>`<div class="mrow">${av(m.id,'sm')}<input id="mn-${esc(m.id)}" value="${esc(m.name)}" maxlength="30" aria-label="Name"><button type="button" class="btn small" data-act="ren" data-id="${esc(m.id)}">Save</button>${usedBy(m.id)?'<span></span>':`<button type="button" class="btn small danger" data-act="rmm" data-id="${esc(m.id)}">Remove</button>`}</div>${S.canWrite!==false?`<div class="ppay"><input id="pp-${esc(m.id)}" value="${esc(m.pay||'')}" maxlength="80" placeholder="PayID or BSB + account (optional)" aria-label="${esc(m.name)} payment details"><button type="button" class="btn small" data-act="savepay" data-id="${esc(m.id)}">Save</button></div>`:(m.pay?`<p class="hint ppay">${esc(m.pay)}</p>`:'')}`).join('')}</div>
    <form id="addmem" class="inline" style="margin-top:10px"><input name="n" maxlength="30" placeholder="Add someone" required aria-label="New person"><button class="btn">Add</button></form>
    <p class="hint" style="margin-top:10px">You're <b>${esc(mname(S.me[S.tid]))}</b>. <button type="button" class="btn small" data-act="notme">Not you?</button></p></div>
  ${activityView()}<div class="sec"><h2>Currencies</h2><p class="hint" style="margin:-6px 0 10px">Everything settles in <b>${esc(home())}</b>. Rates are saved on each expense, so changing a rate here only affects new expenses.</p>
    ${Object.keys(rates).length?`<div class="card">${Object.keys(rates).map(c=>`<div class="rrow"><b>1 ${esc(c)} =</b><input id="rt-${esc(c)}" inputmode="decimal" value="${esc(rates[c])}" aria-label="${esc(c)} rate"><button type="button" class="btn small" data-act="saverate" data-c="${esc(c)}">Save</button>${S.exp.some(e=>e.cur===c)?'<span></span>':`<button type="button" class="btn small danger" data-act="rmrate" data-c="${esc(c)}">Remove</button>`}</div>`).join('')}</div>`:'<p class="muted">No foreign currencies yet. Pick one when adding an expense, or add it here.</p>'}
    <form id="addrate" class="inline3" style="margin-top:10px"><select name="c" aria-label="Currency">${CURS.filter(c=>c!==home()&&!rates[c]).map(c=>`<option>${c}</option>`).join('')}</select><input name="r" inputmode="decimal" placeholder="${esc(home())} per 1 unit" required aria-label="Rate"><button class="btn">Add</button></form></div></section>`}

function curOptions(){const r=Object.keys(S.trip.rates||{});return [home(),...r.filter(c=>c!==home()),...CURS.filter(c=>c!==home()&&!r.includes(c))]}
function openForm(e){delArm=false;const me=S.me[S.tid];
  if(e)F={id:e.id,desc:e.desc||'',amount:String(e.amount??''),cur:e.cur||home(),rate:e.cur!==home()?String(e.rate??''):'',paidBy:e.paidBy,date:e.date||today(),mode:e.split?.mode||'equal',parts:{...(e.split?.parts||{})},items:(e.split?.items||[]).map(it=>({n:it.n||'',p:String(it.p??''),who:[...(it.who||[])],c:it.c||'food',...(Number.isInteger(it.of)?{of:it.of}:{})})),receipt:e.receipt||null,file:null,drop:false,createdBy:e.createdBy,createdAt:e.createdAt,nb:{...(e.split?.book||{})},pd:JSON.parse(JSON.stringify(e.split?.dates||{}))};
  else{const last=[...S.exp].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0],cur=last?.cur||home();
    F={desc:'',amount:'',cur,rate:cur!==home()?String(S.trip.rates?.[cur]??''):'',paidBy:me,date:today(),mode:'equal',parts:Object.fromEntries(members().map(m=>[m.id,1])),items:[],receipt:null,file:null,drop:false,nb:{},pd:{}}}
  if(F.mode==='items'&&F.items.length){const x=Math.round((num(F.amount)-F.items.reduce((t,it)=>t+num(it.p),0))*100)/100;F.extra=x?String(x):''}else F.extra='';
  $('#sheet').hidden=false;renderForm();if(!e)setTimeout(()=>$('#f-amount')?.focus(),50)}
function closeSheet(){$('#sheet').hidden=true;$('#panel').innerHTML='';if(F?.preview)URL.revokeObjectURL(F.preview);F=null}
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
  return `<div class="isum" id="isum"></div><div class="qt"><span>Quick tick</span><select id="qt-who" aria-label="Person to tick">${ms.map(m=>`<option value="${esc(m.id)}"${m.id===qw?' selected':''}>${esc(m.name)}</option>`).join('')}</select>${CATS.map(c=>`<button type="button" class="qtb ct-${c[0]}" data-act="qtick" data-c="${c[0]}">All ${c[0]==='drink'?'drinks':c[0]}</button>`).join('')}</div><div class="igrid"><table><thead><tr><th class="nc">#</th><th class="ic">Item and price<div class="leg" aria-hidden="true">${CATS.map(c=>`<span class="legi"><span class="ct ct-${c[0]}"><span class="cts">${c[2]}</span></span>${c[1]}</span>`).join('')}<span class="legt">tap to change</span></div></th>${ms.map(m=>`<th class="mc" title="Tick ${esc(m.name)} for every item"><button type="button" class="hb" data-act="icol" data-id="${esc(m.id)}" aria-label="Tick or untick ${esc(m.name)} for every item">${av(m.id,'xs')}<span class="mn">${esc(m.name)}</span></button></th>`).join('')}<th class="mc"><span class="mn">All</span></th></tr></thead>
  <tbody>${F.items.map((it,i)=>`<tr${it.of!=null?' class="addon"':''}><td class="nc"><button type="button" class="nb" data-act="ilink" data-i="${i}" title="${it.of!=null?'Unlink from the item above':'Make this an add-on to the item above'}">${lab[i]}</button></td><td class="ic"><div class="icell">${it.of!=null?`<span class="lk" title="Add-on to ${esc(F.items[it.of]?.n||'the item above')}" aria-label="Add-on to ${esc(F.items[it.of]?.n||'the item above')}">↳</span>`:''}<input class="iname" data-i="${i}" value="${esc(it.n)}" placeholder="Item ${i+1}" maxlength="60" aria-label="Item ${i+1} name"><span class="ip">${catBtn(it,i)}<span class="psym" aria-hidden="true">${esc(curSym(F.cur))}</span><input class="iprice" data-i="${i}" inputmode="decimal" value="${esc(fmtP(it.p))}" placeholder="0.00" aria-label="Item ${i+1} price"><button type="button" class="x" data-act="idel" data-i="${i}" aria-label="Remove item ${i+1}">×</button></span></div><small class="ieach" id="ie-${i}"></small></td>
    ${ms.map(m=>`<td class="mc"><button type="button" class="cell${it.who.includes(m.id)?' on':''}" data-act="itog" data-i="${i}" data-id="${esc(m.id)}" aria-pressed="${it.who.includes(m.id)}" aria-label="${esc(m.name)} had item ${i+1}"></button></td>`).join('')}
    <td class="mc"><button type="button" class="cell all${it.who.length===ms.length?' on':''}" data-act="iall" data-i="${i}" aria-label="Everyone had item ${i+1}">All</button></td></tr>`).join('')}<tr class="xrow"><td class="nc"></td><td class="ic"><div class="icell"><span class="xl">Extras<small>Surcharge, tip, or a discount as minus</small></span><span class="ip"><span class="ctsp"></span><span class="psym" aria-hidden="true">${esc(curSym(F.cur))}</span><input class="iextra" inputmode="decimal" value="${esc(fmtP(F.extra||''))}" placeholder="0.00" aria-label="Extras"><span class="xsp"></span></span></div></td><td colspan="${ms.length+1}" class="xnote">Shared in proportion to each person's items</td></tr></tbody>
  <tfoot><tr><td class="nc"></td><th class="ic">Each pays</th>${ms.map(m=>`<td class="mc tot" id="it-${esc(m.id)}"></td>`).join('')}<td class="mc"></td></tr></tfoot></table></div>
  <button type="button" class="btn" data-act="iadd">+ Add item</button>`}
// Under each item: what each ticked person pays for it (before any extras).
function itemEach(){const cv=v=>F.cur===home()?fc(Math.round(v*100)):money(v,F.cur);
  F.items.forEach((it,i)=>{const el=document.getElementById('ie-'+i);if(!el)return;const n=it.who.filter(x=>members().some(m=>m.id===x)).length,pr=num(it.p);
    el.textContent=n&&pr>0?(n===1?`${cv(pr)} · 1 person`:`${cv(pr/n)} each · ${n} people`):''})}
// "Who had what" summary above the item grid; refreshed whenever ticks or prices change.
function itemSummary(r){const el=document.getElementById('isum');if(!el)return;const cv=v=>F.cur===home()?fc(Math.round(v*100)):money(v,F.cur);
  const lab=itemLabels(),rows=members().filter(m=>r.per[m.id]).map(m=>{const its=F.items.map((it,i)=>({it,i})).filter(({it})=>num(it.p)>0&&it.who.includes(m.id)).map(({it,i})=>{const n=it.who.length;const cc=CATS.find(x=>x[0]===(it.c||'food'))||CATS[0];return `<span class="si si-${cc[0]}${it.of!=null?' sa':''}"><span class="ct ct-${cc[0]} sct" title="${cc[1]}"><span class="cts">${cc[2]}</span></span>${it.of!=null?'+ ':''}${esc(it.n.trim()||'Item')}${n>1?` <em>${fracLabel(n)}</em>`:''} <i>${esc(cv(num(it.p)/n))}</i></span>`}).join('');
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
function renderForm(){const foreign=F.cur!==home(),modes=[['equal','Equal'],['items','Items'],['exact','Amounts'],...(F.mode==='shares'?[['shares','Shares']]:[]),['nights','Nights'],['percent','%']];
  $('#panel').innerHTML=`<div class="ph"><h2>${F.id?'Edit expense':'Add expense'}</h2><button type="button" class="x" data-act="close" aria-label="Close">×</button></div>
  <form id="ef" class="stackf" novalidate>
    <div class="amtrow"><label>Amount${F.mode==='items'?' <small>adds up the items</small>':''}<span class="amtw"><span class="asym" aria-hidden="true">${esc(curSym(F.cur))}</span><input id="f-amount" inputmode="decimal" value="${esc(F.amount)}" placeholder="0.00" autocomplete="off"${F.mode==='items'?' readonly class="ro" tabindex="-1"':''}></span></label>
      <label>Currency<select id="f-cur">${curOptions().map(c=>`<option${c===F.cur?' selected':''}>${esc(c)}</option>`).join('')}</select></label></div>
    ${foreign?`<label>Exchange rate <small>1 ${esc(F.cur)} = how many ${esc(home())}?</small><input id="f-rate" inputmode="decimal" value="${esc(F.rate)}" placeholder="e.g. 0.21"></label>`:''}
    <p class="hint" id="f-conv"></p>
    <label>What for?<input id="f-desc" maxlength="80" value="${esc(F.desc)}" placeholder="Fuel, dinner, Airbnb…"></label>
    <div class="two"><label>Paid by<select id="f-paid">${members().map(m=>`<option value="${esc(m.id)}"${m.id===F.paidBy?' selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
      <label>Date<input id="f-date" type="date" value="${esc(F.date)}"></label></div>
    <fieldset><legend>Split</legend><div class="seg">${modes.map(([k,l])=>`<button type="button" data-act="mode" data-mode="${k}" aria-pressed="${F.mode===k}">${l}</button>`).join('')}</div>${splitEditor()}<p class="hint" id="f-left"></p></fieldset>
    ${receiptBlock()}
    <p class="err" id="f-err"></p>
    <div class="acts">${F.id?`<button type="button" class="btn danger" data-act="del">Delete</button>`:''}<button class="btn primary" id="f-save">${F.id?'Save changes':'Add expense'}</button></div>
  </form>`;hints();fitGrid()}
function formTotal(){const a=num(F.amount),r=F.cur===home()?1:num(F.rate);return Math.round(a*r*100)}
function hints(){const conv=$('#f-conv'),left=$('#f-left');if(!conv)return;const a=num(F.amount),tot=formTotal(),foreign=F.cur!==home();
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
  put(`trips/${S.tid}/expenses/${id}`,{desc:F.desc.trim()||'Expense',amount,cur:F.cur,rate,paidBy:F.paidBy,date:F.date||today(),split:items?{mode:'items',parts,items}:{mode:F.mode,parts,...(F.mode==='nights'?nightsMeta(parts):{})},receipt:receipt||null,createdBy:F.createdBy||me,createdAt:F.createdAt||Date.now(),updatedAt:Date.now(),updatedBy:me});
  if(foreign&&num(S.trip.rates?.[F.cur])!==rate)tripSave({rates:{...(S.trip.rates||{}),[F.cur]:rate}});
  logAct(`${F.id?'edited':'added'} ${F.desc.trim()||'Expense'} (${money(amount,F.cur)})`);const wasEdit=!!F.id;closeSheet();toast(wasEdit?'Expense updated':'Expense added')}
function tripSave(patch){return put('trips/'+S.tid,{...S.tripRaw,...patch})}
// Receipt reading: Gemini (through Firebase AI Logic) turns the photo into line items.
const AI_MODEL=cfgAll.aiModel||'gemini-3.8-flash';let aiModel=null;
async function getModel(){if(aiModel)return aiModel;
  const {getAI,getGenerativeModel,GoogleAIBackend,Schema}=await import('https://www.gstatic.com/firebasejs/13.4.0/firebase-ai.js');
  const schema=Schema.object({properties:{
    merchant:Schema.string({description:'Shop or venue name'}),
    date:Schema.string({description:'Purchase date as YYYY-MM-DD, or empty if not shown'}),
    currency:Schema.string({description:'ISO 4217 code such as AUD, JPY, CNY. Guess from symbols and country if not printed'}),
    items:Schema.array({items:Schema.object({properties:{name:Schema.string(),quantity:Schema.number({description:'Units bought, 1 if not shown'}),price:Schema.number({description:'Line total for all units, as printed'}),type:Schema.string({description:'food, drink or other'}),addonTo:Schema.integer({description:'If this line is an add-on or modifier of another line (oat milk or an extra shot for a latte, extra bacon for a breakfast), the 0-based index of that main item in this items list'})},optionalProperties:['addonTo','type']})}),
    extras:Schema.array({description:'Charges added on top of the items (surcharge, service charge, tip, delivery) as positive amounts, and discounts as negative amounts. Not tax that is already included in item prices.',items:Schema.object({properties:{name:Schema.string(),amount:Schema.number()}})}),
    total:Schema.number({description:'Final amount paid'})},optionalProperties:['date','extras']});
  aiModel=getGenerativeModel(getAI(S.app,{backend:new GoogleAIBackend()}),{model:AI_MODEL,generationConfig:{responseMimeType:'application/json',responseSchema:schema}});return aiModel}
async function readReceipt(file){const model=await getModel(),b=await shrink(file,2000,.85),data=(await toData(b)).split(',')[1];
  const prompt='Read this receipt. List every purchased line item with its printed line total. Skip subtotal, total, GST/tax lines that are already included, payment, change and card lines. Put surcharges, service charges, tips and discounts in extras. If a line shows a quantity (like 3 x Beer), give the quantity and the line total. Receipts often print add-ons (milk swaps, extra shots, syrups, extra sides) indented or just under the item they belong to: list them as their own items with addonTo set to that item\'s index.';
  const res=await model.generateContent([prompt,{inlineData:{data,mimeType:'image/jpeg'}}]);return JSON.parse(res.response.text())}
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
  F.mode='items';F.items=items;F.amount=String(Math.round(total*100)/100);const xx=Math.round((total-isum)*100)/100;F.extra=xx?String(xx):'';
  if(!F.desc.trim()&&r.merchant)F.desc=String(r.merchant).slice(0,80);
  if(/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')&&!F.id)F.date=r.date;
  const c=String(r.currency||'').toUpperCase();if(/^[A-Z]{3}$/.test(c)&&c!==F.cur&&curOptions().includes(c)){F.cur=c;F.rate=c!==home()?String(S.trip.rates?.[c]??''):''}
  const ex=(r.extras||[]).filter(x=>num(x.amount));
  const na=items.filter(x=>x.of!=null).length;F.scanMsg=`Found ${items.length} item${items.length===1?'':'s'}${na?` (${na} add-on${na>1?'s':''} joined to their item)`:''}${ex.length?' plus '+ex.map(x=>x.name).join(', '):''}. Check them, then tap who had each.`;return true}
async function scanReceipt(){if(!F?.file)return;const mine=F;F.scan='busy';renderForm();
  try{if(!navigator.onLine)throw new Error('offline');const r=await readReceipt(mine.file);if(F!==mine)return;
    if(applyScan(r)){F.scan='done';const dd=dupOf();if(dd)F.scanMsg+=` Heads up: this may already be added as “${dd.desc}” (${fmtDate(dd.date)}).`}else{F.scan='fail';F.scanMsg="Couldn't find any items on this photo."}}
  catch(e){console.warn(e);if(F!==mine)return;F.scan='fail';F.scanMsg=e.message==='offline'?"No signal, so the receipt can't be read yet.":"Couldn't read the receipt."}
  renderForm()}
// Person breakdown: what someone paid, what they owe, and why.
const fracLabel=n=>({2:'½',3:'⅓',4:'¼',5:'⅕',6:'⅙',8:'⅛'}[n]||`1/${n}`);
const payOf=id=>String(members().find(m=>m.id===id)?.pay||'').trim();
const payBox=id=>{const t=payOf(id);return t?`<span class="payid"><span><small>${esc(mname(id))}'s details</small><code>${esc(t)}</code></span><button type="button" class="btn small" data-act="copy" data-t="${esc(t)}">Copy</button></span>`:''};
function showPerson(id){const me=S.me[S.tid],who=x=>x===me?'You':mname(x),cv=(v,c)=>c===home()?fc(Math.round(v*100)):money(v,c),{net}=calc();
  let paid=0,share=0;const rows=[];
  const exps=[...S.exp].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0));
  for(const e of exps){const c=eCents(e);if(!(c>0))continue;const mine=alloc(c,weights(e))[id]||0,payer=e.paidBy===id;if(payer)paid+=c;share+=mine;if(!mine&&!payer)continue;
    let detail='';
    if(mine&&e.split?.mode==='items'&&Array.isArray(e.split.items)){const its=e.split.items,isum=its.reduce((t,x)=>t+num(x.p),0),extra=Math.round((num(e.amount)-isum)*100)/100,asum=its.filter(x=>(x.who||[]).length).reduce((t,x)=>t+num(x.p),0);let myItems=0;const lines=[];
      its.forEach(x=>{const w=x.who||[];if(w.includes(id)){const part=num(x.p)/w.length;myItems+=part;lines.push(`<li${x.of!=null?' class="ao"':''}><span>${x.of!=null?'↳ ':''}${esc(x.n)}${w.length>1?` <small>${fracLabel(w.length)} of ${esc(cv(num(x.p),e.cur))}</small>`:''}</span><span>${esc(cv(part,e.cur))}</span></li>`)}});
      if(extra&&asum>0&&myItems>0)lines.push(`<li class="ex"><span>${extra>0?'Share of extras (surcharge, tip)':'Share of discount'}</span><span>${extra<0?'−':''}${esc(cv(Math.abs(myItems/asum*extra),e.cur))}</span></li>`);
      detail=lines.length?`<ul class="pitems">${lines.join('')}</ul>`:''}
    else if(mine){const n=Object.keys(weights(e)).length,m=e.split?.mode;detail=`<p class="hint pnote">${m==='exact'?'Exact amounts':m==='shares'?'Split by shares':m==='nights'?(()=>{const w=weights(e),t=Object.values(w).reduce((a,v)=>a+v,0);const dd=e.split?.dates?.[id];return `By nights · ${w[id]} night${w[id]===1?'':'s'}${dd?` (${esc(dShort(dd.f))} – ${esc(dShort(dd.t))})`:''} of ${Math.round(t*100)/100} across everyone`})():m==='percent'?'Split by %':n===members().length?`Split equally with everyone (${n})`:`Split equally ${n} ways`}</p>`}
    rows.push(`<div class="pe"><div class="pe-h"><span><b>${esc(e.desc)}</b><small>${esc(fmtDate(e.date))}${payer?` · ${esc(who(id))} paid ${fc(c)}`:''}${e.cur!==home()?` · ${esc(money(num(e.amount),e.cur))}`:''}</small></span><span class="amt">${mine?fc(mine):'<small>not in it</small>'}</span></div>${detail}</div>`)}
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
  else if(a==='mode'){const m=b.dataset.mode;if(m===F.mode)return;F.mode=m;if(m==='items'){if(!F.items.length)F.items=[{n:'',p:num(F.amount)>0?String(num(F.amount)):'',who:[]}];F.extra='';renderForm();return}const ms=members(),inc=ms.filter(x=>num(F.parts[x.id])>0),base=inc.length?inc:ms;
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
  else if(a==='iadd'){F.items.push({n:'',p:'',who:[],c:'food'});renderForm();const ns=document.querySelectorAll('.iname');ns[ns.length-1]?.focus()}
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
  if(t.id==='f-amount')F.amount=t.value;else if(t.id==='f-rate')F.rate=t.value;else if(t.id==='f-desc')F.desc=t.value;else if(t.id==='f-date')F.date=t.value;
  else if(t.classList.contains('pin')){F.parts[t.dataset.id]=t.value;if(F.pd?.[t.dataset.id]){delete F.pd[t.dataset.id];const r=t.closest('.nper');r?.classList.remove('open');r?.querySelector('.pdr')?.remove();r?.querySelector('.nbad')?.remove();r?.querySelector('.nds')?.remove();const c=r?.querySelector('.ncal');if(c){c.classList.remove('on');c.setAttribute('aria-pressed','false')}}}
  else if(t.id==='f-nfrom'||t.id==='f-nto'){F.nb[t.id==='f-nfrom'?'f':'t']=t.value;const n=nDiff(F.nb.f,F.nb.t),h=$('#f-nbh');if(h)h.textContent=n>0?`${n} night${n===1?'':'s'}`:F.nb.f&&F.nb.t?nWarn(F.nb.f,F.nb.t):'';h.classList.toggle('nbadt',!(n>0));if(t.id==='f-nfrom'){const e=$('#f-nto');if(e)e.min=t.value}if(n>0){const l=$('#f-nall');if(l)l.value=n}}
  else if(t.classList.contains('pdf')||t.classList.contains('pdt')){const id=t.dataset.id,d=F.pd[id]||(F.pd[id]={f:'',t:''});d[t.classList.contains('pdf')?'f':'t']=t.value;if(t.classList.contains('pdf')){const e=t.closest('.nper')?.querySelector('.pdt');if(e)e.min=t.value}const n=nDiff(d.f,d.t),r=t.closest('.nper');r?.querySelector('.nbad')?.remove();
    if(n>0){F.parts[id]=String(n);const p=r?.querySelector('.pin');if(p)p.value=n;let sm=r?.querySelector('.nds');if(!sm){sm=document.createElement('small');sm.className='nds';r?.querySelector('.nrow>span')?.append(sm)}sm.textContent=`${dShort(d.f)} – ${dShort(d.t)}`}
    else{r?.querySelector('.nds')?.remove();if(d.f&&d.t)r?.querySelector('.pdr')?.insertAdjacentHTML('afterend',`<p class="hint nbad">${esc(nWarn(d.f,d.t))}</p>`)}}
  else if(t.classList.contains('iname'))F.items[+t.dataset.i].n=t.value;else if(t.classList.contains('iprice'))F.items[+t.dataset.i].p=t.value;else if(t.classList.contains('iextra'))F.extra=t.value;else return;hints()});
document.addEventListener('change',ev=>{const t=ev.target;if(!F)return;
  if(t.id==='f-cur'){F.cur=t.value;F.rate=F.cur!==home()?String(S.trip.rates?.[F.cur]??''):'';renderForm()}
  else if(t.id==='f-paid')F.paidBy=t.value;
  else if(t.classList.contains('iprice')){const v=fmtP(t.value);t.value=v;F.items[+t.dataset.i].p=v}
  else if(t.classList.contains('iextra')){const v=fmtP(t.value);t.value=v;F.extra=v}
  else if(t.id==='f-file'&&t.files?.[0]){F.file=t.files[0];F.preview=URL.createObjectURL(F.file);scanReceipt()}});
document.addEventListener('submit',ev=>{ev.preventDefault();const f=ev.target,fd=new FormData(f);
  if(f.id==='ef')return saveExpense();
  if(f.id==='join'){const v=String(fd.get('code')||'').trim(),m=/trip=([a-z0-9]{20,})/.exec(v)||/^([a-z0-9]{20,})$/.exec(v);if(!m)return toast("That doesn't look like a trip link");location.search='?trip='+m[1];return}
  if(f.id==='newtrip'){const name=String(fd.get('name')||'').trim(),seen=new Set();
    const ms=fd.getAll('members').join('\n').split(/[\n,]+/).map(s=>s.trim().slice(0,30)).filter(s=>s&&!seen.has(s.toLowerCase())&&seen.add(s.toLowerCase())).slice(0,30).map(n=>({id:rid(8),name:n}));
    if(!name||!ms.length)return toast('Add a trip name and at least one person');
    const tid=rid(22),hc=String(fd.get('home')||'AUD');
    put('trips/'+tid,{name:name.slice(0,60),home:hc,members:ms,rates:{},createdAt:Date.now()});
    S.me[tid]=ms[0].id;store.set('rts-me',S.me);S.recent[tid]={name,home:hc,people:ms.map(m=>m.name).join(', '),at:Date.now()};store.set('rts-trips',S.recent);
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
    else{clearTimeout(t0);S.stale=false;S.tripRaw=s.data();S.trip=S.tripRaw;S.recent[tid]={name:S.trip.name,home:S.trip.home,people:members().map(m=>m.name).join(', '),at:Date.now()};store.set('rts-trips',S.recent)}
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
