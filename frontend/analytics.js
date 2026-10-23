// عرض تحليلات المهارات: نقاط القوة والضعف، الأسئلة الأكثر خطأً، حسب القسم والصعوبة والمرحلة.
// يعتمد على questions.js (Q, SECTIONS, LEVELS, LETTERS, CMP).
const STAGES=["أول ثانوي","ثاني ثانوي","ثالث ثانوي"];
const MIN_ANSWERS=3;            // أقل عدد إجابات للحكم على مهارة
const STRONG=75, WEAK=60;       // حدود القوة والضعف (%)
const pctOf=r=>r.answered?Math.round(r.correct/r.answered*100):0;
const band=p=>p>=STRONG?{c:"var(--right)",t:"قوي",i:"▲"}:p>=WEAK?{c:"var(--saffron)",t:"متوسط",i:"●"}:{c:"var(--wrong)",t:"ضعيف",i:"▼"};
const escA=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const qText=q=>q.s===3?`قارن: ${q.v1} ↔ ${q.v2}${q.g?` (${q.g})`:""}`:q.t;
const qAnswer=q=>(q.s===3?CMP:q.o)[q.a];

function barRow(label,r,sub){
  const p=pctOf(r), b=r.answered<MIN_ANSWERS?{c:"var(--border-strong)",t:"بيانات قليلة",i:"○"}:band(p);
  return `<div class="hrow" title="${escA(label)}: ${r.correct} صحيحة من ${r.answered} (${p}%)">
    <span class="hl">${escA(label)}${sub?`<small>${escA(sub)}</small>`:""}</span>
    <span class="hbar"><i style="width:${Math.max(p,1)}%;background:${b.c}"></i></span>
    <span class="hv"><b>${p}%</b><small>${b.i} ${b.t} · ${r.answered}</small></span></div>`;
}

function renderAnalytics(d,{scope,showKpis=true}){
  const solo=scope==="student";
  const total=d.bySkill.reduce((a,r)=>a+r.answered,0), right=d.bySkill.reduce((a,r)=>a+r.correct,0);
  if(!total) return `${showKpis?kpis(d,solo,0,0):""}<div class="tbl"><div class="empty">لا توجد إجابات مسجلة بعد في هذا النطاق. تظهر التحليلات بعد أن يُنهي الطلاب اختباراً فردياً.</div></div>`;
  const rated=d.bySkill.filter(r=>r.answered>=MIN_ANSWERS).map(r=>({...r,p:pctOf(r)}));
  const strong=rated.filter(r=>r.p>=STRONG).sort((a,b)=>b.p-a.p||b.answered-a.answered).slice(0,6);
  const weak=rated.filter(r=>r.p<WEAK).sort((a,b)=>a.p-b.p||b.answered-a.answered).slice(0,6);
  const skills=[...d.bySkill].sort((a,b)=>pctOf(a)-pctOf(b)||b.answered-a.answered);
  const who=solo?"الطالب":"الطلاب";
  return `${showKpis?kpis(d,solo,total,right):""}
  <div class="duo">
    <section class="card good"><h3>${icon("trend",20)}نقاط القوة</h3>${strong.length?`<ul>${strong.map(r=>`<li><span>${escA(r.skill)}</span><b>${r.p}%</b></li>`).join("")}</ul>`:`<p class="dim">لا توجد مهارة تجاوز فيها ${who} ${STRONG}% بعد.</p>`}</section>
    <section class="card bad"><h3>${icon("alert",20)}نقاط الضعف</h3>${weak.length?`<ul>${weak.map(r=>`<li><span>${escA(r.skill)}</span><b>${r.p}%</b></li>`).join("")}</ul>
      <p class="tip">${icon("bulb",18)}<span>يُنصح بالتركيز على: <b>${weak.slice(0,3).map(r=>escA(r.skill)).join("، ")}</b></span></p>`:`<p class="dim">لا توجد مهارة أقل من ${WEAK}% — أداء جيد.</p>`}</section>
  </div>
  <p class="dim note">يُحكم على المهارة بعد ${MIN_ANSWERS} إجابات على الأقل · قوي ≥ ${STRONG}% · ضعيف &lt; ${WEAK}%</p>

  <section class="card"><h3>الإتقان حسب المهارة <small class="dim">(الأضعف أولاً)</small></h3>
    <div class="hbars">${skills.map(r=>barRow(r.skill,r,SECTIONS[r.section])).join("")}</div></section>

  <div class="duo">
    <section class="card"><h3>حسب القسم</h3><div class="hbars">${d.bySection.map(r=>barRow(SECTIONS[r.section],r)).join("")}</div></section>
    <section class="card"><h3>حسب مستوى الصعوبة</h3><div class="hbars">${d.byLevel.map(r=>barRow(LEVELS[r.level],r)).join("")}</div></section>
  </div>

  ${d.byStage&&d.byStage.length?`<section class="card"><h3>المقارنة بين المراحل</h3><div class="hbars">${d.byStage.map(r=>barRow(r.stage||"غير محدد",r,`${r.students} طالب`)).join("")}</div></section>`:""}

  ${solo&&d.timeline.length>1?timelineHTML(d.timeline):""}

  <section class="card"><h3>الأسئلة الأكثر خطأً</h3>${questionsHTML(d.questions,solo)}</section>

  ${!solo&&d.students.length?studentsHTML(d.students):""}`;
}

function kpis(d,solo,total,right){
  const k=d.kpi||{};
  return `<div class="stats">
    ${solo?"":`<div class="stat"><span>عدد الطلاب</span><b>${k.students||0}</b></div>`}
    <div class="stat"><span>الاختبارات المنجزة</span><b>${k.attempts||0}</b></div>
    <div class="stat"><span>متوسط الدرجة</span><b>${k.avg_percent==null?"—":k.avg_percent+"%"}</b></div>
    <div class="stat"><span>الأسئلة المُجابة</span><b>${total}</b></div>
    <div class="stat"><span>نسبة الإجابات الصحيحة</span><b>${total?Math.round(right/total*100)+"%":"—"}</b></div></div>`;
}

function questionsHTML(rows,solo){
  if(!rows.length)return `<p class="dim">لا توجد أخطاء مسجلة.</p>`;
  return `<div class="tbl"><table><thead><tr><th>السؤال</th><th>المهارة</th><th>${solo?"مرات الخطأ":"نسبة الخطأ"}</th><th>الخطأ الشائع</th><th>الصحيح</th></tr></thead><tbody>
  ${rows.map(r=>{const q=Q[r.q_index]; if(!q)return "";
    const wrong=r.answered-r.correct, ep=Math.round(wrong/r.answered*100);
    const opts=q.s===3?CMP:q.o;
    return `<tr><td>${escA(qText(q))}</td><td class="dim">${escA(q.k)}</td>
      <td class="pct">${solo?`${wrong} من ${r.answered}`:`${ep}% <small class="dim">(${wrong}/${r.answered})</small>`}</td>
      <td>${r.common_wrong==null?"—":`${LETTERS[r.common_wrong]}) ${escA(opts[r.common_wrong])}`}</td>
      <td>${LETTERS[q.a]}) ${escA(qAnswer(q))}</td></tr>`;}).join("")}
  </tbody></table></div>`;
}

function studentsHTML(rows){
  return `<section class="card"><h3>الطلاب <small class="dim">(اضغط على الاسم لعرض تحليله)</small></h3><div class="tbl"><table>
  <thead><tr><th>الطالب</th><th>المرحلة</th><th>الصف</th><th>الاختبارات</th><th>متوسط الدرجة</th><th>دقة الإجابات</th><th>الحالة</th></tr></thead><tbody>
  ${rows.map(s=>{const p=s.answered?pctOf(s):null, b=s.avg_percent==null?null:band(s.avg_percent);
    return `<tr><td><button class="link" data-stu="${s.id}">${escA(s.full_name)}</button></td><td>${escA(s.stage||"—")}</td><td>${escA(s.class_name||"—")}</td>
      <td>${s.attempts}</td><td class="pct">${s.avg_percent==null?"—":s.avg_percent+"%"}</td><td>${p==null?"—":p+"%"}</td>
      <td>${b?`<span class="status"><span style="color:${b.c}" aria-hidden="true">${b.i}</span>${s.avg_percent<WEAK?"يحتاج دعماً":b.t}</span>`:'<span class="dim">لم يختبر</span>'}</td></tr>`;}).join("")}
  </tbody></table></div></section>`;
}

// Score over time: one series, so no legend — the title names it. Solid hairline grid, 2px line, 10% area wash,
// end-dots with a surface ring, the last value labelled directly, and a hover/focus tooltip on every point.
// The SVG is drawn at the container's real width (see drawChart) so text stays the same size on every screen.
function timelineHTML(rows){
  const last=rows.slice(-20), n=last.length, first=last[0].percent, end=last[n-1].percent, diff=end-first;
  const data=last.map(r=>({p:r.percent,s:r.score,t:r.total,d:r.created_at}));
  return `<section class="card"><h3>تطور الدرجات <small>${n>1?`${diff>=0?"▲ تحسّن":"▼ تراجع"} ${Math.abs(diff)} نقطة منذ أول اختبار`:""}</small></h3>
  <div class="chart" dir="ltr" data-rows="${escA(JSON.stringify(data))}" role="img" aria-label="نسبة الدرجة في آخر ${n} اختبارات، من ${first}% إلى ${end}%"></div></section>`;
}

function drawChart(ch){
  const rows=JSON.parse(ch.dataset.rows), n=rows.length;
  const w=Math.max(ch.clientWidth,280), h=Math.min(240,Math.max(170,w*.32)), padL=40, padR=24, padY=22;
  const x=i=>padL+(n===1?(w-padL-padR)/2:i*(w-padL-padR)/(n-1)), y=p=>h-padY-(p/100)*(h-2*padY);
  const pts=rows.map((r,i)=>[x(i),y(r.p)]), line=pts.map(p=>p.join(",")).join(" ");
  const day=d=>new Date(d).toLocaleDateString(LOCALE,{day:"numeric",month:"short"});
  ch.innerHTML=`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    ${[0,50,100].map(p=>`<line x1="${padL}" x2="${w-padR}" y1="${y(p)}" y2="${y(p)}" stroke="var(--border)" stroke-width="1"/><text x="${padL-8}" y="${y(p)+4}" text-anchor="end" fill="var(--muted)" font-size="12">${p}%</text>`).join("")}
    <polygon points="${x(0)},${y(0)} ${line} ${x(n-1)},${y(0)}" fill="var(--brand)" opacity=".1"/>
    <polyline points="${line}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${rows.map((r,i)=>`<g class="hit" tabindex="0" data-i="${i}" aria-label="${escA(day(r.d))}: ${r.p}%">
      <circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="16" fill="transparent"/>
      <circle class="ring" cx="${pts[i][0]}" cy="${pts[i][1]}" r="4.5" fill="var(--brand)" stroke="var(--surface)" stroke-width="2"/></g>`).join("")}
    <text x="${pts[n-1][0]}" y="${pts[n-1][1]-12}" text-anchor="${n>1?"end":"middle"}" fill="var(--text)" font-size="13" font-weight="600">${rows[n-1].p}%</text>
  </svg><div class="tip-box" dir="rtl" hidden></div>`;
  const tip=ch.querySelector(".tip-box");
  const show=g=>{const r=rows[+g.dataset.i], [cx,cy]=pts[+g.dataset.i];
    tip.textContent=`${day(r.d)} · ${r.s} من ${r.t} (${r.p}%)`; tip.hidden=false;
    const half=tip.offsetWidth/2+4; // keep the whole tooltip inside the chart
    tip.style.left=Math.min(Math.max(cx,half),w-half)+"px"; tip.style.top=cy+"px";};
  ch.querySelectorAll(".hit").forEach(g=>{
    g.addEventListener("mouseenter",()=>show(g)); g.addEventListener("focus",()=>show(g));
    g.addEventListener("mouseleave",()=>tip.hidden=true); g.addEventListener("blur",()=>tip.hidden=true);
  });
}

// Draws every .chart inside root, and redraws on resize.
function bindCharts(root){
  const charts=[...root.querySelectorAll(".chart[data-rows]")];
  charts.forEach(drawChart);
  if(charts.length&&!bindCharts.ro){
    let t; bindCharts.ro=true;
    addEventListener("resize",()=>{clearTimeout(t);t=setTimeout(()=>document.querySelectorAll(".chart[data-rows]").forEach(drawChart),150);});
  }
}
