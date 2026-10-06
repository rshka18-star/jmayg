const STORAGE_KEY = "jma-motor-finance-v1";
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let entryType = "income";
let balanceVisible = true;

const € = n => new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(Number(n||0));
const pad = n => String(n).padStart(2,"0");
const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const timeLocal = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseLocal = (date,time="00:00") => new Date(`${date}T${time}:00`);
const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const sum = (arr,type) => arr.filter(x=>x.type===type).reduce((s,x)=>s+Number(x.amount),0);

function startOfWeek(d){
  const x=new Date(d); x.setHours(0,0,0,0);
  const day=x.getDay() || 7; x.setDate(x.getDate()-day+1); return x; // Monday
}
function endOfWeek(d){ const x=startOfWeek(d); x.setDate(x.getDate()+6); x.setHours(23,59,59,999); return x; }
function startOfMonth(d){ return new Date(d.getFullYear(),d.getMonth(),1); }
function endOfMonth(d){ return new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999); }
function within(tx,a,b){ const d=parseLocal(tx.date,tx.time); return d>=a && d<=b; }
function rangeTransactions(a,b){ return transactions.filter(t=>within(t,a,b)); }
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(transactions)); render(); }

function closedWeekArchives(now=new Date()){
  if(!transactions.length) return [];
  const dates=transactions.map(t=>parseLocal(t.date,t.time));
  let cursor=startOfWeek(new Date(Math.min(...dates)));
  const currentStart=startOfWeek(now);
  const out=[];
  while(cursor < currentStart){
    const e=endOfWeek(cursor), list=rangeTransactions(cursor,e);
    if(list.length){
      out.push({start:new Date(cursor),end:e,income:sum(list,"income"),expense:sum(list,"expense")});
    }
    cursor=new Date(cursor); cursor.setDate(cursor.getDate()+7);
  }
  return out.reverse();
}
function closedMonthArchives(now=new Date()){
  if(!transactions.length) return [];
  const dates=transactions.map(t=>parseLocal(t.date,t.time));
  let cursor=startOfMonth(new Date(Math.min(...dates)));
  const currentStart=startOfMonth(now);
  const out=[];
  while(cursor < currentStart){
    const e=endOfMonth(cursor), list=rangeTransactions(cursor,e);
    if(list.length){
      out.push({start:new Date(cursor),end:e,income:sum(list,"income"),expense:sum(list,"expense")});
    }
    cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);
  }
  return out.reverse();
}

function render(){
  const now=new Date();
  const today=transactions.filter(t=>sameDay(parseLocal(t.date,t.time),now));
  const dayI=sum(today,"income"), dayE=sum(today,"expense");
  const allI=sum(transactions,"income"), allE=sum(transactions,"expense");

  document.querySelector("#todayIncomeTop").textContent=€(dayI);
  document.querySelector("#todayExpenseTop").textContent=€(dayE);
  document.querySelector("#currentBalance").textContent=balanceVisible?€(allI-allE):"••••••";
  document.querySelector("#dayIncome").textContent=€(dayI);
  document.querySelector("#dayExpense").textContent=€(dayE);
  document.querySelector("#dayBalance").textContent=€(dayI-dayE);
  document.querySelector("#todayDateLabel").textContent=now.toLocaleDateString("en-IE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  const txBox=document.querySelector("#todayTransactions");
  const sorted=[...today].sort((a,b)=>parseLocal(b.date,b.time)-parseLocal(a.date,a.time));
  txBox.innerHTML=sorted.length?sorted.map(t=>`
    <div class="tx ${t.type}">
      <div class="badge">${t.type==="income"?"↑":"↓"}</div>
      <div><div class="tx-title">${escapeHtml(t.note|| (t.type==="income"?"Income":"Expense"))}</div>
      <div class="tx-meta">${formatDate(t.date)} • ${t.time}</div></div>
      <div class="tx-amt">${t.type==="income"?"+":"−"}${€(t.amount)}</div>
    </div>`).join(""):`<div class="empty">No transactions today.</div>`;

  const ws=startOfWeek(now), we=endOfWeek(now);
  document.querySelector("#weekRangeLabel").textContent=`${shortDate(ws)} – ${shortDate(we)}`;
  document.querySelector("#weekLockNote").textContent="This week stays open until Sunday ends. The final weekly totals appear here after the week is closed.";
  ["weekIncome","weekExpense","weekBalance"].forEach(id=>document.querySelector("#"+id).textContent="Open");

  const ms=startOfMonth(now), me=endOfMonth(now);
  document.querySelector("#monthRangeLabel").textContent=now.toLocaleDateString("en-IE",{month:"long",year:"numeric"});
  document.querySelector("#monthLockNote").textContent=`This month stays open until ${me.toLocaleDateString("en-IE",{day:"numeric",month:"long"})}. The final monthly totals appear only after the month is closed.`;
  ["monthIncome","monthExpense","monthBalance"].forEach(id=>document.querySelector("#"+id).textContent="Open");

  const weeks=closedWeekArchives(now);
  document.querySelector("#closedWeeks").innerHTML=weeks.length?weeks.map(w=>archiveHtml(`${shortDate(w.start)} – ${shortDate(w.end)}`,w)).join(""):`<div class="empty">No closed weeks yet.</div>`;
  const months=closedMonthArchives(now);
  document.querySelector("#closedMonths").innerHTML=months.length?months.map(m=>archiveHtml(m.start.toLocaleDateString("en-IE",{month:"long",year:"numeric"}),m)).join(""):`<div class="empty">No closed months yet.</div>`;
}

function archiveHtml(label,x){
  return `<div class="archive-item"><strong>${label}</strong><small>Closed total</small>
  <div class="archive-values"><span class="income-text">Income ${€(x.income)}</span><span class="expense-text">Expenses ${€(x.expense)}</span><span>Balance ${€(x.income-x.expense)}</span></div></div>`;
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function formatDate(s){ return parseLocal(s).toLocaleDateString("en-IE",{day:"2-digit",month:"short",year:"numeric"}); }
function shortDate(d){ return d.toLocaleDateString("en-IE",{day:"2-digit",month:"short"}); }

function openEntry(type){
  entryType=type;
  const now=new Date();
  document.querySelector("#entryTitle").textContent=type==="income"?"Income":"Expense";
  document.querySelector("#entryTypeSmall").textContent="Add transaction";
  document.querySelector("#amountInput").value="";
  document.querySelector("#noteInput").value="";
  document.querySelector("#dateInput").value=isoLocal(now);
  document.querySelector("#timeInput").value=timeLocal(now);
  document.querySelector("#entryDialog").showModal();
  setTimeout(()=>document.querySelector("#amountInput").focus(),100);
}
document.querySelector("#addIncomeBtn").onclick=()=>openEntry("income");
document.querySelector("#addExpenseBtn").onclick=()=>openEntry("expense");

document.querySelector("#entryForm").addEventListener("submit",e=>{
  const amount=Number(document.querySelector("#amountInput").value);
  if(!amount || amount<=0){ e.preventDefault(); return; }
  transactions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type:entryType,
    amount,
    note:document.querySelector("#noteInput").value.trim(),
    date:document.querySelector("#dateInput").value,
    time:document.querySelector("#timeInput").value
  });
  save();
});

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  document.querySelector(`#${btn.dataset.tab}Panel`).classList.add("active");
});

document.querySelector("#toggleBalanceBtn").onclick=()=>{ balanceVisible=!balanceVisible; render(); };
document.querySelector("#resetBtn").onclick=()=>document.querySelector("#settingsDialog").showModal();
document.querySelector("#clearAllBtn").onclick=()=>{
  if(confirm("Delete all JMA finance records from this device?")){
    transactions=[]; localStorage.removeItem(STORAGE_KEY);
    document.querySelector("#settingsDialog").close(); render();
  }
};
document.querySelector("#historyJumpBtn").onclick=()=>document.querySelector("#todayTransactions").scrollIntoView({behavior:"smooth",block:"start"});

document.querySelector("#exportBtn").onclick=()=>{
  const rows=[["Type","Amount EUR","Description","Date","Time"],...transactions.map(t=>[t.type,t.amount,t.note,t.date,t.time])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="JMA-finance-transactions.csv"; a.click(); URL.revokeObjectURL(a.href);
};

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
render();
