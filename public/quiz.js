const cur=()=>Q[S.order[S.idx]], N=()=>S.order.length;
const TEAM_COLORS=["var(--t1)","var(--t2)","var(--t3)","var(--t4)"];
const DEFAULT_NAMES=["الفريق الأول","الفريق الثاني","الفريق الثالث","الفريق الرابع"];

let S={screen:"setup",mode:"solo",player:"",teamCount:2,count:30,order:[],names:DEFAULT_NAMES.slice(),secs:60,teams:[],idx:0,picked:{},revealed:{},awarded:{},left:60,paused:false};
let tick=null, audio=null;
const view=document.getElementById("view"), meta=document.getElementById("meta");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ar=n=>String(n);

function beep(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=520;g.gain.value=.15;o.connect(g);g.connect(audio.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.6);o.stop(audio.currentTime+.6);}catch(e){}}

function startTimer(){stopTimer();S.left=S.secs;S.paused=false;tick=setInterval(()=>{if(S.paused||S.revealed[S.idx])return;S.left--;if(S.left<=0){S.left=0;stopTimer();beep();if(S.mode==="solo"){S.revealed[S.idx]=true;render();return;}}updateClock();},1000);}
function answerSolo(i){if(S.revealed[S.idx])return;S.picked[S.idx]=i;S.revealed[S.idx]=true;stopTimer();
  if(i===cur().a){S.teams[0].score++;S.awarded[S.idx]=[0];}render();}
function stopTimer(){if(tick){clearInterval(tick);tick=null;}}
function updateClock(){const c=document.getElementById("clock"),b=document.getElementById("bar");if(!c)return;const low=S.left<=10;c.textContent=ar(S.left);c.classList.toggle("low",low);b.classList.toggle("low",low);b.firstElementChild.style.width=(S.left/S.secs*100)+"%";const p=document.getElementById("pause");if(p)p.textContent=S.paused?"استئناف":"إيقاف مؤقت";}

function renderMeta(){
  if(S.screen==="setup"){meta.innerHTML=`<span class="chip">بنك ${QT} سؤالاً</span>`+userBar();bindUserBar();return;}
  const cq=Q[S.order[Math.min(S.idx,N()-1)]];
  meta.innerHTML=`<span class="chip" style="color:${LEVEL_COLORS[cq.d]};border-color:${LEVEL_COLORS[cq.d]}">${LEVELS[cq.d]}</span><span class="chip">${SECTIONS[cq.s]}</span><button class="ghost" id="restart" type="button">إعادة الإعداد</button>`+userBar();
  document.getElementById("restart").onclick=()=>{stopTimer();S.screen="setup";render();};bindUserBar();
}

function renderSetup(){
  view.className="setup";
  const n=S.teamCount;
  view.innerHTML=`
  <section class="intro">
    <h2>من يحسم سؤال القدرات أولاً؟</h2>
    <p>بنك من ${QT} سؤالاً في ثلاثة أقسام: الحساب والجبر، والهندسة والإحصاء، والمقارنة. في الوضع الفردي يجيب الطالب بنفسه، فتظهر النتيجة فوراً وتُحسب درجته تلقائياً. وفي وضع الفرق يدير المعلم الأسئلة ويمنح النقاط.</p>
    <dl class="credits">
      <dt>مدير المدرسة</dt><dd>رمضان حيدر الرمضان</dd>
      <dt>إعداد</dt><dd>الأستاذ حسن الراهب</dd>
    </dl>
  </section>
  <form class="panel" id="setupForm">
    <h3>الإعداد</h3>
    <div class="field"><label>وضع اللعب</label>
      <div class="seg" role="group" aria-label="وضع اللعب"><button type="button" data-m="solo" aria-pressed="${S.mode==="solo"}">فردي</button><button type="button" data-m="teams" aria-pressed="${S.mode==="teams"}">فرق</button></div></div>
    ${S.mode==="solo"?`
    <div class="field"><label for="player">اسم الطالب</label><input id="player" placeholder="اكتب اسمك" value="${esc(S.player)}"></div>`:`
    <div class="field"><label>عدد الفرق</label>
      <div class="seg" role="group" aria-label="عدد الفرق">${[2,3,4].map(k=>`<button type="button" data-n="${k}" aria-pressed="${k===n}">${ar(k)}</button>`).join("")}</div></div>
    <div class="teamInputs">${Array.from({length:n},(_,i)=>`<div class="ti"><span class="dot" style="background:${TEAM_COLORS[i]}"></span><input id="team${i}" aria-label="اسم الفريق ${i+1}" value="${esc(S.names[i])}"></div>`).join("")}</div>`}
    <div class="field"><label>عدد الأسئلة (تُسحب عشوائياً)</label>
      <div class="seg" role="group" aria-label="عدد الأسئلة">${[[30,"30"],[60,"60"],[0,"الكل "+poolSize(S.level||0)]].map(([k,l])=>`<button type="button" data-c="${k}" aria-pressed="${k===S.count}" ${k&&k>poolSize(S.level||0)?"disabled":""}>${l}</button>`).join("")}</div></div>
    <div class="field"><label>المستوى</label>
      <div class="seg" role="group" aria-label="المستوى" style="flex-wrap:wrap">${[1,2,3,0].map(k=>`<button type="button" data-l="${k}" aria-pressed="${k===(S.level||0)}">${k?LEVELS[k]:"الكل"} <small style="opacity:.7">(${poolSize(k)})</small></button>`).join("")}</div></div>
    <button class="primary" type="submit">ابدأ</button>
  </form>`;
  const saveNames=()=>{const p=document.getElementById("player");if(p)S.player=p.value.trim();
    for(let i=0;i<S.teamCount;i++){const el=document.getElementById("team"+i);if(el)S.names[i]=el.value.trim()||DEFAULT_NAMES[i];}};
  view.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{saveNames();S.count=+b.dataset.c;render();});
  view.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{saveNames();S.level=+b.dataset.l;if(S.count>poolSize(S.level))S.count=0;render();});
  view.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{saveNames();S.mode=b.dataset.m;if(S.mode==="teams"&&S.teamCount<2)S.teamCount=2;render();});
  view.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{saveNames();S.teamCount=+b.dataset.n;render();});
  view.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{saveNames();S.secs=+b.dataset.s;render();});
  document.getElementById("setupForm").onsubmit=e=>{e.preventDefault();saveNames();
    S.teams=S.mode==="solo"?[{name:S.player||"الطالب",score:0}]:Array.from({length:S.teamCount},(_,i)=>({name:S.names[i],score:0}));
    const all=Q.map((_,i)=>i).filter(i=>!S.level||Q[i].d===S.level);for(let i=all.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
    S.order=all.slice(0,S.count||all.length);
    S.secs=60;S.idx=0;S.picked={};S.revealed={};S.awarded={};S.saved=false;S.screen="quiz";render();startTimer();updateClock();};
}

function scoresHTML(){
  if(S.mode==="solo"){const done=Object.keys(S.revealed).length;const t=S.teams[0];
    return `<section class="scores" aria-label="الدرجة"><div class="team" style="border-inline-start:6px solid var(--t1)"><span class="nm">${esc(t.name)}</span><span class="sc">${ar(t.score)}</span><span class="chip">صحيح من ${ar(done)} مُجاب</span></div>
      <div class="team"><span class="nm">خطأ</span><span class="sc" style="color:var(--wrong)">${ar(done-t.score)}</span></div>
      <div class="team"><span class="nm">متبقٍ</span><span class="sc" style="color:var(--chalk-dim)">${ar(N()-done)}</span></div></section>`;}
  return `<section class="scores" aria-label="النقاط">${S.teams.map((t,i)=>`
    <div class="team ${S.awarded[S.idx]&&S.awarded[S.idx].includes(i)?"got":""}" style="border-inline-start:6px solid ${TEAM_COLORS[i]}">
      <span class="nm">${esc(t.name)}</span><span class="sc">${ar(t.score)}</span>
      <span class="pm"><button type="button" data-plus="${i}" aria-label="زيادة نقطة">+</button><button type="button" data-minus="${i}" aria-label="إنقاص نقطة">−</button></span>
    </div>`).join("")}</section>`;
}

function renderQuiz(){
  view.className="stage";
  const q=cur(), rev=!!S.revealed[S.idx], pick=S.picked[S.idx];
  const opts=q.s===3?CMP:q.o;
  const body=q.s===3
   ?`<div class="qtext">قارن بين القيمتين:</div>${q.g?`<div class="given">المعطيات: ${esc(q.g)}</div>`:""}
     <div class="cmp"><div><span>القيمة الأولى</span><strong>${esc(q.v1)}</strong></div><div><span>القيمة الثانية</span><strong>${esc(q.v2)}</strong></div></div>`
   :`<div class="qtext">${esc(q.t)}</div>`;
  const aw=S.awarded[S.idx]||[];
  view.innerHTML=`
  <div class="qhead">
    <div class="qnum">السؤال <b>${ar(S.idx+1)}</b> من ${ar(N())}</div>
    <div class="timer"><button class="ghost" id="pause" type="button">إيقاف مؤقت</button><button class="ghost" id="reset" type="button">إعادة الوقت</button><span class="clock" id="clock" aria-live="off">${ar(S.left)}</span></div>
  </div>
  <div class="bar" id="bar"><i style="width:${S.left/S.secs*100}%"></i></div>
  ${body}
  <div class="opts">${opts.map((o,i)=>{let c="";if(rev&&i===q.a)c="right";else if(rev&&i===pick)c="wrong";else if(i===pick)c="picked";
    return `<button type="button" class="opt ${c}" data-o="${i}" ${rev?"disabled":""}><span class="k">${LETTERS[i]}</span><span>${esc(o)}</span></button>`}).join("")}</div>
  ${rev?`<div class="sol">${S.mode==="solo"?(pick===q.a?`<b>إجابة صحيحة!</b> `:(pick===undefined?`<b style="color:var(--wrong)">انتهى الوقت.</b> `:`<b style="color:var(--wrong)">إجابة خاطئة.</b> `)):""}<b>الإجابة الصحيحة: ${LETTERS[q.a]}</b> — ${esc(q.sol)}</div>
    ${S.mode==="solo"?"":`<div class="award"><span>امنح نقطة لـ:</span>${S.teams.map((t,i)=>`<button type="button" data-aw="${i}" style="color:${TEAM_COLORS[i]}" aria-pressed="${aw.includes(i)}"><em>${esc(t.name)}</em></button>`).join("")}</div>`}`:""}
  <div class="controls">
    <div class="grp">
      <button class="btn" id="prev" type="button" ${S.idx===0?"disabled":""}>→ السابق</button>
      ${rev||S.mode==="solo"?"":`<button class="btn go" id="reveal" type="button">إظهار الإجابة</button>`}
      <button class="btn ${rev?"go":""}" id="next" type="button">${S.idx===N()-1?"النتيجة النهائية":"التالي ←"}</button>
    </div>
    <span class="keys">${S.mode==="solo"?"":"<kbd>مسافة</kbd> إظهار الإجابة · "}<kbd>←</kbd><kbd>→</kbd> التنقل · <kbd>1</kbd>–<kbd>4</kbd> اختيار</span>
  </div>
  ${scoresHTML()}`;
  view.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{if(S.mode==="solo")answerSolo(+b.dataset.o);else{S.picked[S.idx]=+b.dataset.o;render();}});
  const r=document.getElementById("reveal"); if(r) r.onclick=reveal;
  document.getElementById("prev").onclick=()=>go(-1);
  document.getElementById("next").onclick=()=>go(1);
  document.getElementById("pause").onclick=()=>{S.paused=!S.paused;updateClock();};
  document.getElementById("reset").onclick=()=>{startTimer();updateClock();};
  view.querySelectorAll("[data-aw]").forEach(b=>b.onclick=()=>{const i=+b.dataset.aw;const a=S.awarded[S.idx]=S.awarded[S.idx]||[];
    const k=a.indexOf(i); if(k>=0){a.splice(k,1);S.teams[i].score--;} else {a.push(i);S.teams[i].score++;} render();});
  bindScores();
  updateClock();
}
function bindScores(){
  view.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{S.teams[+b.dataset.plus].score++;render();});
  view.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{S.teams[+b.dataset.minus].score--;render();});
}
function reveal(){if(S.screen!=="quiz")return;S.revealed[S.idx]=true;render();}
function go(d){
  if(S.screen!=="quiz")return;
  if(d>0&&S.idx===N()-1){stopTimer();S.screen="end";render();return;}
  const n=S.idx+d; if(n<0||n>=N())return;
  S.idx=n; if(S.revealed[n]){stopTimer();S.left=0;} else startTimer();
  render();
}

function renderEnd(){
  view.className="end";
  const ranked=S.teams.map((t,i)=>({...t,i})).sort((a,b)=>b.score-a.score);
  const top=ranked[0].score, winners=ranked.filter(t=>t.score===top);
  const title=S.teams.length===1?`${ar(top)} من ${ar(N())}`:(winners.length>1?"تعادل!":`فاز ${esc(winners[0].name)}`);
  if(S.mode==="solo"){
    const pct=Math.round(top/N()*100);
    const grade=pct>=90?"ممتاز":pct>=75?"جيد جداً":pct>=60?"جيد":"تحتاج إلى مزيد من التدريب";
    saveResult(top,pct);
    const miss=S.order.map((qi,i)=>({q:Q[qi],i})).filter(x=>S.picked[x.i]!==x.q.a);
    view.innerHTML=`
    <div class="crown">أحسنت يا ${esc(S.teams[0].name)}، انتهت الأسئلة</div>
    <h2>${ar(top)} من ${ar(N())}</h2>
    <div class="chip" style="font-size:1.1rem">${ar(pct)}% · ${grade}</div>
    <div class="keys" id="saveMsg" style="display:block">${S.saved?"تم حفظ الدرجة في سجلك ✓":"جارٍ حفظ الدرجة…"}</div>
    ${miss.length?`<div class="rank"><div style="color:var(--chalk-dim);font-size:1rem">الأسئلة التي تحتاج مراجعة (${ar(miss.length)})</div>${miss.map(x=>`<div style="font-size:1rem"><span>السؤال ${ar(x.i+1)}: ${x.q.s===3?esc(x.q.v1+" ↔ "+x.q.v2):esc(x.q.t)}</span><b style="color:var(--right);white-space:nowrap;margin-inline-start:10px">${LETTERS[x.q.a]}</b></div>`).join("")}</div>`:""}
    <div class="row"><button class="btn" id="back" type="button">→ الرجوع للأسئلة</button><button class="btn go" id="again" type="button">جولة جديدة</button></div>`;
  } else view.innerHTML=`
    <div class="crown">انتهت الأسئلة</div>
    <h2>${title}</h2>
    <div class="rank">${ranked.map((t,k)=>`<div><span><span class="dot" style="display:inline-block;background:${TEAM_COLORS[t.i]};margin-inline-end:8px"></span>${ar(k+1)}. ${esc(t.name)}</span><b>${ar(t.score)} نقطة</b></div>`).join("")}</div>
    <div class="row"><button class="btn" id="back" type="button">→ الرجوع للأسئلة</button><button class="btn go" id="again" type="button">جولة جديدة</button></div>`;
  document.getElementById("back").onclick=()=>{S.screen="quiz";S.left=0;render();};
  document.getElementById("again").onclick=()=>{S.screen="setup";render();};
}

function render(){renderMeta();if(S.screen==="setup")renderSetup();else if(S.screen==="quiz")renderQuiz();else renderEnd();}

document.addEventListener("keydown",e=>{
  if(S.screen!=="quiz"||e.target.tagName==="INPUT")return;
  if(e.key===" "){e.preventDefault();if(S.mode!=="solo")reveal();}
  else if(e.key==="ArrowLeft")go(1);
  else if(e.key==="ArrowRight")go(-1);
  else if(["1","2","3","4"].includes(e.key)&&!S.revealed[S.idx]){if(S.mode==="solo")answerSolo(+e.key-1);else{S.picked[S.idx]=+e.key-1;render();}}
});

// ---- ربط الموقع بقاعدة البيانات: المستخدم الحالي وحفظ الدرجات ----
let ME=null;
function userBar(){
  if(!ME)return "";
  const staff=ME.role!=="student";
  return `<span class="chip">${esc(ME.full_name)}</span><a class="ghost" href="/dashboard.html">${staff?"لوحة المعلم":"درجاتي"}</a><button class="ghost" id="logout" type="button">خروج</button>`;
}
function bindUserBar(){const b=document.getElementById("logout");if(b)b.onclick=async()=>{stopTimer();await fetch("/api/logout",{method:"POST"});location.href="/login.html";};}
async function saveResult(score){
  if(S.saved||S.saving)return; S.saving=true;
  try{
    const r=await fetch("/api/results",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({score,total:N(),level:S.level||0,
        answers:S.order.map((qi,i)=>({q:qi,s:Q[qi].s,d:Q[qi].d,k:Q[qi].k,p:S.picked[i]??null,ok:S.picked[i]===Q[qi].a}))})});
    S.saved=r.ok;
  }catch(e){S.saved=false;}
  S.saving=false;
  const m=document.getElementById("saveMsg");
  if(m)m.textContent=S.saved?"تم حفظ الدرجة في سجلك ✓":"تعذّر حفظ الدرجة، تحقق من الاتصال.";
}
(async()=>{
  try{const r=await fetch("/api/me");if(!r.ok){location.href="/login.html";return;}ME=(await r.json()).user;}
  catch(e){location.href="/login.html";return;}
  if(!S.player)S.player=ME.full_name;
  render();
})();
