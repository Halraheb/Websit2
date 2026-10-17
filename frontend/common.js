// Shared by every page: API calls, the top navigation bar, theme toggle, toasts and achievement cards.
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ROLES={student:"طالب",teacher:"معلم",admin:"مدير النظام"};
const LOCALE="ar-SA-u-nu-latn"; // Hijri dates with Western digits, matching the rest of the site
const fmtDate=d=>new Date(d).toLocaleString(LOCALE,{dateStyle:"medium",timeStyle:"short"});
const fmtDay=d=>new Date(d).toLocaleDateString(LOCALE,{dateStyle:"medium"});
const initials=n=>String(n||"؟").trim().charAt(0);
let ME=null;

async function api(url,opt={}){
  const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});
  if(r.status===401){location.href="/login.html";throw new Error("401");}
  const d=r.headers.get("content-type")?.includes("json")?await r.json():{};
  if(!r.ok)throw new Error(d.error||"حدث خطأ");
  return d;
}

function setTheme(t){
  try{t?localStorage.setItem("theme",t):localStorage.removeItem("theme");}catch(e){}
  if(t)document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;
}
const isDark=()=>document.documentElement.dataset.theme?document.documentElement.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;

// Loads the signed-in user and draws the nav. page = "quiz" | "profile" | "dashboard".
async function boot(page,{staffOnly=false}={}){
  ME=(await api("/api/me")).user;
  const staff=ME.role!=="student";
  if(staffOnly&&!staff){location.href="/profile.html";throw new Error("students");}
  const links=[["quiz","/","الاختبار"],...(staff?[["dashboard","/dashboard.html","لوحة المعلم"]]:[["profile","/profile.html","ملفي وإنجازاتي"]])];
  $("nav").innerHTML=`<div class="nav-in">
    <a class="logo" href="/"><i>خ</i><span><b>قدرات الخويلدية</b><small>مدرسة الخويلدية الثانوية</small></span></a>
    <nav class="links" aria-label="التنقل">${links.map(([k,h,t])=>`<a href="${h}" ${k===page?'aria-current="page"':""}>${t}</a>`).join("")}</nav>
    <div class="userbox">
      <button class="icon-btn" id="themeBtn" type="button" aria-label="تبديل الوضع الليلي">${isDark()?"☀":"☾"}</button>
      <span class="avatar" aria-hidden="true">${esc(initials(ME.full_name))}</span>
      <span class="uname">${esc(ME.full_name)}<br><small class="dim">${ROLES[ME.role]}</small></span>
      <button class="ghost" id="logoutBtn" type="button">خروج</button>
    </div></div>`;
  $("themeBtn").onclick=()=>{setTheme(isDark()?"light":"dark");$("themeBtn").textContent=isDark()?"☀":"☾";};
  $("logoutBtn").onclick=async()=>{await fetch("/api/logout",{method:"POST"});location.href="/login.html";};
  return ME;
}

function toast(html,ms=5000){
  let box=document.querySelector(".toasts");
  if(!box){box=document.createElement("div");box.className="toasts";box.setAttribute("role","status");document.body.append(box);}
  const t=document.createElement("div");t.className="toast";t.innerHTML=html;box.append(t);
  setTimeout(()=>t.remove(),ms);
}

function badgeHTML(a){
  const earned=!!a.earned_at;
  return `<div class="badge tier-${a.tier} ${earned?"earned":"locked"}">
    <span class="ico" aria-hidden="true">${a.icon}</span>
    <div style="min-width:0;flex:1"><b>${esc(a.title)}</b><p>${esc(a.desc)}</p>
      ${earned?"":`<div class="bar" title="${a.progress} من ${a.goal}"><i style="width:${Math.round(a.progress/a.goal*100)}%;background:var(--tier)"></i></div>`}
      <span class="when"><span>${earned?`✓ ${fmtDay(a.earned_at)}`:`${a.progress} / ${a.goal}`}</span><span class="xp" dir="ltr">+${a.xp} XP</span></span>
    </div></div>`;
}
