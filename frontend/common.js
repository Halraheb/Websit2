// Shared by every page of both sites (the per-site name and copy live in site.js):
// API calls, the top navigation bar, theme toggle, icons, loading/empty/error states, toasts and achievement cards.
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ROLES={student:"طالب",teacher:"معلم",admin:"مدير النظام"};
const LOCALE="ar-SA-u-nu-latn"; // Hijri dates with Western digits, matching the rest of the site
const fmtDate=d=>new Date(d).toLocaleString(LOCALE,{dateStyle:"medium",timeStyle:"short"});
const fmtDay=d=>new Date(d).toLocaleDateString(LOCALE,{dateStyle:"medium"});
const initials=n=>String(n||"؟").trim().charAt(0);
let ME=null;

// ---------- icons: 24px monoline, stroke follows currentColor ----------
const ICONS={
  quiz:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 12.5l2 2 4-4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  grid:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  power:'<path d="M12 3v8"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h13"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/>',
  medal:'<circle cx="12" cy="9" r="6"/><path d="M9 14.5L8 22l4-2 4 2-1-7.5"/>',
  seal:'<path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  mountain:'<path d="M3 20l6.5-11 4 6.5 2.5-4L21 20z"/>',
  orbit:'<circle cx="12" cy="12" r="3.5"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)"/>',
  cap:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  flame:'<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  inbox:'<path d="M3 13l2.5-8h13L21 13v6H3zM3 13h5l1.5 2.5h5L16 13h5"/>',
  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .5 3 2 3.5 5"/>',
  table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
  roster:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  back:'<path d="M15 6l-6 6 6 6"/>',
  play:'<path d="M7 4.5v15l12-7.5z"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>',
};
// size in px; extra classes e.g. "mirror" for direction-bearing icons (back arrows flip in RTL).
const icon=(name,size=20,cls="")=>`<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]||ICONS.star}</svg>`;

// Achievement code -> icon. Codes come from backend/achievements.js; unknown codes fall back to a star.
const ACH_ICON={first_quiz:"target",quizzes_5:"book",quizzes_20:"layers",score_80:"star",perfect:"seal",hard_80:"mountain",full_80:"orbit",
  correct_100:"check",correct_500:"medal",skill_master:"cap",unit_master:"cap",all_round:"compass",improver:"trend",streak_3:"flame",streak_7:"bolt"};

// ---------- API ----------
async function api(url,opt={}){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),30000);
  let r;
  try{r=await fetch(url,{headers:{"Content-Type":"application/json"},signal:ctl.signal,...opt});}
  catch(e){throw new Error(e.name==="AbortError"?"انتهت مهلة الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة.":"تعذّر الاتصال بالخادم. تحقّق من الإنترنت ثم أعد المحاولة.");}
  finally{clearTimeout(timer);}
  if(r.status===401){location.href="/login.html";throw new Error("401");}
  const d=r.headers.get("content-type")?.includes("json")?await r.json():{};
  if(!r.ok)throw new Error(d.error||"حدث خطأ في الخادم. أعد المحاولة بعد قليل.");
  return d;
}

// ---------- states: loading, empty, error (every data surface renders all of them) ----------
const loadingHTML=(label="جارٍ التحميل…",rows=3)=>`<div class="state loading" role="status" aria-live="polite">
  <span class="sr">${esc(label)}</span>${Array.from({length:rows},(_,i)=>`<div class="skel" style="width:${[92,76,84,60][i%4]}%"></div>`).join("")}
  <p class="slow" hidden>يستغرق التحميل وقتاً أطول من المعتاد…</p></div>`;
const emptyHTML=(title,text,action="")=>`<div class="state empty">${icon("inbox",28)}<div><h3>${esc(title)}</h3>${text?`<p>${esc(text)}</p>`:""}${action?`<div class="row">${action}</div>`:""}</div></div>`;
const errorHTML=(msg)=>`<div class="state error" role="alert">${icon("alert",28)}<div><h3>تعذّر تحميل هذا القسم</h3><p>${esc(msg)}</p>
  <div class="row"><button class="btn" type="button" data-retry>${icon("refresh",18)}<span>أعد المحاولة</span></button></div></div></div>`;

// Renders loading into `el`, runs `load()` (which fills `el`), and on failure shows an error with a retry button.
async function withStates(el,load,label){
  el.setAttribute("aria-busy","true");
  el.innerHTML=loadingHTML(label);
  const slow=setTimeout(()=>{const s=el.querySelector(".slow");if(s)s.hidden=false;},15000);
  try{await load();}
  catch(e){
    if(e.message==="401")return;
    el.innerHTML=errorHTML(e.message);
    el.querySelector("[data-retry]").onclick=()=>withStates(el,load,label);
  }finally{clearTimeout(slow);el.removeAttribute("aria-busy");}
}

// Locks a button while `fn` runs and shows `label` on it; restores it afterwards.
async function pending(btn,label,fn){
  const old=btn.innerHTML; btn.disabled=true; btn.setAttribute("aria-busy","true"); btn.innerHTML=`<span class="spin" aria-hidden="true"></span>${esc(label)}`;
  try{return await fn();}finally{btn.disabled=false;btn.removeAttribute("aria-busy");btn.innerHTML=old;}
}

// ---------- theme ----------
function setTheme(t){
  try{t?localStorage.setItem("theme",t):localStorage.removeItem("theme");}catch(e){}
  if(t)document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;
}
const isDark=()=>document.documentElement.dataset.theme?document.documentElement.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
const logoHTML=()=>`<a class="logo" href="/"><i aria-hidden="true">${esc(SITE.mark)}</i><span><b>${esc(SITE.name)}</b><small>${esc(SITE.school)}</small></span></a>`;

// Loads the signed-in user and draws the nav. page = "quiz" | "profile" | "dashboard".
async function boot(page,{staffOnly=false}={}){
  ensureToasts();
  ME=(await api("/api/me")).user;
  const staff=ME.role!=="student";
  if(staffOnly&&!staff){location.href="/profile.html";throw new Error("students");}
  const links=[["quiz","/","الاختبار","quiz"],...(staff?[["dashboard","/dashboard.html","لوحة المعلم","grid"]]:[["profile","/profile.html","ملفي وإنجازاتي","user"]])];
  $("nav").innerHTML=`<div class="nav-in">
    ${logoHTML()}
    <nav class="links" aria-label="التنقل الرئيسي">${links.map(([k,h,t,ic])=>`<a href="${h}" ${k===page?'aria-current="page"':""}>${icon(ic,18)}<span>${t}</span></a>`).join("")}</nav>
    <div class="userbox">
      <button class="icon-btn" id="themeBtn" type="button"></button>
      <span class="avatar" aria-hidden="true">${esc(initials(ME.full_name))}</span>
      <span class="uname"><bdi>${esc(ME.full_name)}</bdi><small>${ROLES[ME.role]}</small></span>
      <button class="icon-btn" id="logoutBtn" type="button" aria-label="تسجيل الخروج" title="تسجيل الخروج">${icon("power",18)}</button>
    </div></div>`;
  const paintTheme=()=>{const d=isDark();$("themeBtn").innerHTML=icon(d?"sun":"moon",18);$("themeBtn").setAttribute("aria-label",d?"الوضع الفاتح":"الوضع الداكن");$("themeBtn").title=d?"الوضع الفاتح":"الوضع الداكن";};
  paintTheme();
  $("themeBtn").onclick=()=>{setTheme(isDark()?"light":"dark");paintTheme();};
  $("logoutBtn").onclick=async()=>{await fetch("/api/logout",{method:"POST"}).catch(()=>{});location.href="/login.html";};
  return ME;
}

// ---------- toasts: one fixed position, polite live region present before any content, pause on hover/focus ----------
function ensureToasts(){
  let box=document.querySelector(".toasts");
  if(!box){box=document.createElement("div");box.className="toasts";box.setAttribute("role","status");box.setAttribute("aria-live","polite");document.body.append(box);}
  return box;
}
function toast(html,ms=6000){
  const t=document.createElement("div");t.className="toast";t.tabIndex=0;t.innerHTML=html;ensureToasts().append(t);
  let left=ms, start=Date.now(), timer=setTimeout(()=>t.remove(),left);
  const pause=()=>{clearTimeout(timer);left-=Date.now()-start;}, resume=()=>{start=Date.now();timer=setTimeout(()=>t.remove(),Math.max(left,1500));};
  t.addEventListener("mouseenter",pause);t.addEventListener("mouseleave",resume);
  t.addEventListener("focusin",pause);t.addEventListener("focusout",resume);
}
const achToast=list=>{
  const xp=list.reduce((t,a)=>t+a.xp,0);
  toast(`<span class="toast-ic tier-${list[0].tier}">${icon(ACH_ICON[list[0].code],22)}</span><div><b>${list.length>1?`${list.length} إنجازات جديدة`:"إنجاز جديد: "+esc(list[0].title)}</b><small><bdi dir="ltr">+${xp} XP</bdi></small></div>`);
};

function badgeHTML(a){
  const earned=!!a.earned_at, pct=Math.round(a.progress/a.goal*100);
  return `<div class="badge tier-${a.tier} ${earned?"earned":"locked"}">
    <span class="ico">${icon(ACH_ICON[a.code],24)}</span>
    <div class="badge-body"><b>${esc(a.title)}</b><p>${esc(a.desc)}</p>
      ${earned?"":`<div class="meter" role="progressbar" aria-label="التقدم في ${esc(a.title)}" aria-valuemin="0" aria-valuemax="${a.goal}" aria-valuenow="${a.progress}"><i style="width:${pct}%"></i></div>`}
      <span class="when"><span>${earned?`${icon("check",14)} <time datetime="${esc(a.earned_at)}">${new Date(a.earned_at).toLocaleDateString(LOCALE,{day:"numeric",month:"short"})}</time>`:`${a.progress} من ${a.goal}`}</span><bdi class="xp" dir="ltr">+${a.xp} XP</bdi></span>
    </div></div>`;
}

// When boot() fails for a reason other than "not signed in", show the error with a retry instead of a blank page.
function bootError(e){
  if(["401","students"].includes(e.message))return;
  const v=$("view"); if(!v)return;
  v.innerHTML=errorHTML(e.message);
  v.querySelector("[data-retry]").onclick=()=>location.reload();
}
