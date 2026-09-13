
const STORAGE_KEY = "splittrip_v1_data";

const seed = {
  mainUser: "Hassan Mohamed",
  currencies: ["EGP","SAR","USD","INR"],
  trips: [
    {
      id:"trip-dubai",
      name:"Dubai Trip",
      destination:"Dubai",
      startDate:"2026-09-12",
      endDate:"2026-09-16",
      currency:"SAR",
      status:"Active",
      members:["Hassan Mohamed","Ahmed","Mohamed","Ali"],
      expenses:[
        {
          id:"exp-dinner",
          name:"Restaurant Dinner",
          merchant:"Marina Grill",
          date:"2026-09-12",
          time:"20:30",
          category:"Food",
          currency:"SAR",
          items:[
            {name:"Burger",price:100,consumers:["Ahmed"]},
            {name:"Pizza",price:200,consumers:["Hassan Mohamed","Mohamed"]},
            {name:"Shared Appetizer",price:200,consumers:["Hassan Mohamed","Ahmed","Mohamed","Ali"]},
            {name:"Dessert",price:100,consumers:["Ali"]}
          ],
          taxAmount:0,
          serviceFee:0,
          otherFee:0,
          payers:[
            {name:"Hassan Mohamed",amount:400},
            {name:"Ahmed",amount:200}
          ],
          createdAt:"2026-09-12T20:35:00"
        }
      ],
      settlements:[]
    },
    {
      id:"trip-cairo",
      name:"Cairo Weekend",
      destination:"Cairo",
      startDate:"2026-08-01",
      endDate:"2026-08-03",
      currency:"EGP",
      status:"Settled",
      members:["Hassan Mohamed","Ahmed","Mohamed"],
      expenses:[
        {
          id:"exp-cairo-1",
          name:"Dinner",
          merchant:"Downtown Bistro",
          date:"2026-08-01",
          time:"21:00",
          category:"Food",
          currency:"EGP",
          items:[
            {name:"Meal A",price:600,consumers:["Hassan Mohamed"]},
            {name:"Meal B",price:600,consumers:["Ahmed"]},
            {name:"Meal C",price:600,consumers:["Mohamed"]}
          ],
          taxAmount:0,serviceFee:0,otherFee:0,
          payers:[{name:"Hassan Mohamed",amount:1800}],
          createdAt:"2026-08-01T21:10:00"
        }
      ],
      settlements:[
        {id:"set-c1",from:"Ahmed",to:"Hassan Mohamed",amount:600,date:"2026-08-02",time:"10:00",status:"Confirmed",note:"Dinner"},
        {id:"set-c2",from:"Mohamed",to:"Hassan Mohamed",amount:600,date:"2026-08-02",time:"10:05",status:"Confirmed",note:"Dinner"}
      ]
    }
  ]
};

let state = loadState();
let currentTripId = null;
let currentTripTab = "overview";

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : clone(seed);
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function resetState(){
  localStorage.removeItem(STORAGE_KEY);
  state = clone(seed);
  renderAll();
}

function uid(prefix="id"){
  return prefix + "-" + Math.random().toString(36).slice(2,9);
}

function money(n,c){
  const v = Number(n||0);
  return `${v.toFixed(2)} ${c}`;
}

function tripById(id){ return state.trips.find(t=>t.id===id); }

function getExpenseTotal(exp){
  const subtotal = exp.items.reduce((s,i)=>s+Number(i.price||0),0);
  return subtotal + Number(exp.taxAmount||0) + Number(exp.serviceFee||0) + Number(exp.otherFee||0);
}

function consumptionForExpense(trip, exp){
  const result = Object.fromEntries(trip.members.map(m=>[m,0]));
  const subtotalByMember = Object.fromEntries(trip.members.map(m=>[m,0]));

  exp.items.forEach(item=>{
    const consumers = item.consumers || [];
    if(!consumers.length) return;
    const share = Number(item.price||0) / consumers.length;
    consumers.forEach(m=>{
      if(subtotalByMember[m] == null) subtotalByMember[m]=0;
      subtotalByMember[m] += share;
    });
  });

  const subtotal = Object.values(subtotalByMember).reduce((a,b)=>a+b,0);
  const fees = Number(exp.taxAmount||0)+Number(exp.serviceFee||0)+Number(exp.otherFee||0);
  trip.members.forEach(m=>{
    const base = subtotalByMember[m] || 0;
    const feeShare = subtotal > 0 ? fees * (base/subtotal) : 0;
    result[m] = base + feeShare;
  });

  return result;
}

function paidForExpense(trip, exp){
  const result = Object.fromEntries(trip.members.map(m=>[m,0]));
  exp.payers.forEach(p=>{
    if(result[p.name] == null) result[p.name]=0;
    result[p.name] += Number(p.amount||0);
  });
  return result;
}

function tripLedger(trip){
  const paid = Object.fromEntries(trip.members.map(m=>[m,0]));
  const consumed = Object.fromEntries(trip.members.map(m=>[m,0]));

  trip.expenses.forEach(exp=>{
    const p = paidForExpense(trip,exp);
    const c = consumptionForExpense(trip,exp);
    trip.members.forEach(m=>{
      paid[m]+=p[m]||0;
      consumed[m]+=c[m]||0;
    });
  });

  // Confirmed settlements reduce outstanding positions by moving value between members.
  (trip.settlements||[]).filter(s=>s.status==="Confirmed").forEach(s=>{
    const amt=Number(s.amount||0);
    // Treat settlement as additional payment by debtor and reduction of creditor exposure.
    paid[s.from]=(paid[s.from]||0)+amt;
    paid[s.to]=(paid[s.to]||0)-amt;
  });

  const rows = trip.members.map(m=>({
    member:m,
    paid:paid[m]||0,
    consumed:consumed[m]||0,
    balance:(paid[m]||0)-(consumed[m]||0)
  }));
  return rows;
}

function settlementSuggestions(trip){
  const ledger = tripLedger(trip);
  const debtors = ledger.filter(x=>x.balance<-0.005).map(x=>({name:x.member,amount:-x.balance}));
  const creditors = ledger.filter(x=>x.balance>0.005).map(x=>({name:x.member,amount:x.balance}));
  const result=[];
  let i=0,j=0;
  while(i<debtors.length && j<creditors.length){
    const amt=Math.min(debtors[i].amount,creditors[j].amount);
    result.push({from:debtors[i].name,to:creditors[j].name,amount:amt});
    debtors[i].amount-=amt;
    creditors[j].amount-=amt;
    if(debtors[i].amount<0.005)i++;
    if(creditors[j].amount<0.005)j++;
  }
  return result;
}

function tripTotal(trip){
  return trip.expenses.reduce((s,e)=>s+getExpenseTotal(e),0);
}

function myNetAcrossTrips(){
  let owe=0,owed=0;
  state.trips.forEach(t=>{
    const row=tripLedger(t).find(r=>r.member===state.mainUser);
    if(!row)return;
    if(row.balance>0) owed+=row.balance;
    if(row.balance<0) owe+=-row.balance;
  });
  return {owe,owed};
}

function setView(view,title,subtitle){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(view).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(n=>n.classList.toggle("active", n.dataset.view===view.replace("View","")));
  document.getElementById("pageTitle").textContent=title;
  document.getElementById("pageSubtitle").textContent=subtitle||"";
}

function renderAll(){
  renderHome();
  renderTrips();
  renderBalances();
  renderHistory();
  if(currentTripId) renderTripDetail(currentTripId,currentTripTab);
}

function renderHome(){
  const el=document.getElementById("homeView");
  const active=state.trips.filter(t=>t.status!=="Closed").length;
  const {owe,owed}=myNetAcrossTrips();
  const pending=state.trips.flatMap(t=>t.settlements||[]).filter(s=>s.status==="Pending Confirmation").length;

  const recent=state.trips.slice().sort((a,b)=>b.startDate.localeCompare(a.startDate)).slice(0,3);

  el.innerHTML=`
    <div class="grid kpi-grid">
      ${kpi("Active Trips",active,"Trips currently visible")}
      ${kpi("You Owe",money(owe,"mixed"),"Across all trips")}
      ${kpi("Owed to You",money(owed,"mixed"),"Across all trips")}
      ${kpi("Pending Confirmations",pending,"Settlement confirmations")}
    </div>
    <div class="section-head">
      <h2>Recent Trips</h2>
      <button class="btn soft" onclick="goTrips()">View all</button>
    </div>
    <div class="grid trip-grid">
      ${recent.map(tripCard).join("") || `<div class="empty">No trips yet.</div>`}
    </div>
    <div class="card" style="margin-top:18px">
      <div class="section-head"><h2>Product Rule</h2></div>
      <div class="notice">Payment and consumption are separate. A person can pay without consuming, and consume without paying.</div>
    </div>
  `;
}

function kpi(label,value,foot){
  return `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;
}

function tripCard(t){
  const me=tripLedger(t).find(r=>r.member===state.mainUser) || {balance:0};
  return `
    <div class="card trip-card" onclick="openTrip('${t.id}')">
      <div class="section-head">
        <div>
          <h3 style="margin-bottom:4px">${t.name}</h3>
          <div class="meta">${t.destination} · ${t.currency}</div>
        </div>
        <span class="badge ${badgeClass(t.status)}">${t.status}</span>
      </div>
      <div class="meta">${t.startDate} → ${t.endDate}</div>
      <hr class="sep">
      <div class="inline" style="justify-content:space-between">
        <span class="muted">Trip spend</span>
        <strong>${money(tripTotal(t),t.currency)}</strong>
      </div>
      <div class="inline" style="justify-content:space-between;margin-top:8px">
        <span class="muted">Your balance</span>
        <span class="${me.balance>0?'positive':me.balance<0?'negative':'neutral'}">${money(me.balance,t.currency)}</span>
      </div>
    </div>
  `;
}

function badgeClass(status){
  return status==="Active"?"active":status==="Settled"?"settled":status==="Closed"?"closed":"partial";
}

function renderTrips(){
  const el=document.getElementById("tripsView");
  el.innerHTML=`
    <div class="section-head">
      <h2>All Trips</h2>
      <button class="btn primary" onclick="openTripModal()">+ New Trip</button>
    </div>
    <div class="grid trip-grid">
      ${state.trips.map(tripCard).join("") || `<div class="empty">No trips yet.</div>`}
    </div>
  `;
}

function renderBalances(){
  const el=document.getElementById("balancesView");
  const cards=state.trips.map(t=>{
    const sugg=settlementSuggestions(t);
    return `
      <div class="card" style="margin-bottom:14px">
        <div class="section-head">
          <div><h3 style="margin-bottom:3px">${t.name}</h3><div class="meta">${t.currency}</div></div>
          <button class="btn small soft" onclick="openTrip('${t.id}','balances')">Open balances</button>
        </div>
        ${sugg.length?sugg.map(s=>`
          <div class="list-item">
            <div><strong>${s.from}</strong> → <strong>${s.to}</strong></div>
            <div class="negative">${money(s.amount,t.currency)}</div>
          </div>`).join(""):`<div class="empty">Everyone is settled.</div>`}
      </div>
    `;
  }).join("");
  el.innerHTML=cards || `<div class="empty">No balance data yet.</div>`;
}

function renderHistory(){
  const el=document.getElementById("historyView");
  const rows=[];
  state.trips.forEach(t=>{
    t.expenses.forEach(e=>rows.push({
      trip:t.name,tripId:t.id,date:e.date,time:e.time,name:e.name,total:getExpenseTotal(e),currency:t.currency,type:"Expense"
    }));
    (t.settlements||[]).forEach(s=>rows.push({
      trip:t.name,tripId:t.id,date:s.date,time:s.time,name:`${s.from} → ${s.to}`,total:s.amount,currency:t.currency,type:`Settlement · ${s.status}`
    }));
  });
  rows.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  el.innerHTML=`
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Trip</th><th>Type</th><th>Details</th><th>Amount</th></tr></thead>
        <tbody>
          ${rows.map(r=>`<tr class="clickable" onclick="openTrip('${r.tripId}')">
            <td>${r.date} ${r.time||""}</td><td>${r.trip}</td><td>${r.type}</td><td>${r.name}</td><td>${money(r.total,r.currency)}</td>
          </tr>`).join("") || `<tr><td colspan="5">No history.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function goHome(){setView("homeView","Home","Track what everyone paid, consumed, and still owes.");}
function goTrips(){setView("tripsView","Trips","Create trips and manage shared expenses.");}
function goBalances(){setView("balancesView","Balances","See who owes whom across your trips.");}
function goHistory(){setView("historyView","History","Expense and settlement activity.");}

document.querySelectorAll(".nav-link").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const v=btn.dataset.view;
    if(v==="home")goHome();
    if(v==="trips")goTrips();
    if(v==="balances")goBalances();
    if(v==="history")goHistory();
  });
});
document.getElementById("newTripBtn").addEventListener("click",openTripModal);

function openTrip(id,tab="overview"){
  currentTripId=id;
  currentTripTab=tab;
  renderTripDetail(id,tab);
}

function renderTripDetail(id,tab="overview"){
  const t=tripById(id);
  if(!t)return;
  currentTripTab=tab;
  setView("tripDetailView",t.name,`${t.destination} · ${t.startDate} → ${t.endDate} · ${t.currency}`);
  const el=document.getElementById("tripDetailView");
  const tabs=["overview","expenses","members","balances","settlements","history"];
  el.innerHTML=`
    <div class="section-head">
      <div class="inline">
        <button class="btn small" onclick="goTrips()">← Trips</button>
        <span class="badge ${badgeClass(t.status)}">${t.status}</span>
      </div>
      <div class="inline">
        <button class="btn soft" onclick="openMemberModal('${t.id}')">+ Member</button>
        <button class="btn primary" onclick="openExpenseModal('${t.id}')">+ Add Expense</button>
      </div>
    </div>
    <div class="tabs">
      ${tabs.map(x=>`<button class="tab ${tab===x?'active':''}" onclick="renderTripDetail('${t.id}','${x}')">${cap(x)}</button>`).join("")}
    </div>
    <div id="tripTabBody">${tripTabHtml(t,tab)}</div>
  `;
}

function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}

function tripTabHtml(t,tab){
  const ledger=tripLedger(t);
  if(tab==="overview"){
    const pending=(t.settlements||[]).filter(s=>s.status==="Pending Confirmation").length;
    return `
      <div class="grid kpi-grid">
        ${kpi("Trip Spend",money(tripTotal(t),t.currency),"All expenses")}
        ${kpi("Members",t.members.length,"Trip participants")}
        ${kpi("Expenses",t.expenses.length,"Recorded bills")}
        ${kpi("Pending",pending,"Settlement confirmations")}
      </div>
      <div class="split">
        <div class="card">
          <div class="section-head"><h2>Member Summary</h2></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Paid</th><th>Consumed</th><th>Balance</th></tr></thead>
              <tbody>${ledger.map(r=>`
                <tr class="clickable" onclick="openMemberDetail('${t.id}','${esc(r.member)}')">
                  <td>${r.member}</td><td>${money(r.paid,t.currency)}</td><td>${money(r.consumed,t.currency)}</td>
                  <td class="${r.balance>0?'positive':r.balance<0?'negative':'neutral'}">${money(r.balance,t.currency)}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="section-head"><h2>Recent Expenses</h2></div>
          <div class="list">
            ${t.expenses.slice().reverse().slice(0,5).map(e=>expenseListItem(t,e)).join("") || `<div class="empty">No expenses yet.</div>`}
          </div>
        </div>
      </div>`;
  }
  if(tab==="expenses"){
    return `
      <div class="section-head"><h2>Expenses</h2><button class="btn primary" onclick="openExpenseModal('${t.id}')">+ Add Expense</button></div>
      <div class="list">
        ${t.expenses.slice().reverse().map(e=>expenseListItem(t,e)).join("") || `<div class="empty">No expenses yet.</div>`}
      </div>`;
  }
  if(tab==="members"){
    return `
      <div class="section-head"><h2>Members</h2><button class="btn soft" onclick="openMemberModal('${t.id}')">+ Add Member</button></div>
      <div class="grid trip-grid">
        ${ledger.map(r=>`
          <div class="card clickable" onclick="openMemberDetail('${t.id}','${esc(r.member)}')">
            <h3>${r.member}</h3>
            <div class="meta">Paid</div><div class="big-number">${money(r.paid,t.currency)}</div>
            <div class="meta" style="margin-top:10px">Consumed</div><div><strong>${money(r.consumed,t.currency)}</strong></div>
            <div class="meta" style="margin-top:10px">Balance</div>
            <div class="${r.balance>0?'positive':r.balance<0?'negative':'neutral'}">${money(r.balance,t.currency)}</div>
          </div>`).join("")}
      </div>`;
  }
  if(tab==="balances"){
    const sugg=settlementSuggestions(t);
    return `
      <div class="split">
        <div class="card">
          <h2>Who Owes Whom</h2>
          <div class="list">${sugg.map(s=>`
            <div class="list-item">
              <div><strong>${s.from}</strong> → <strong>${s.to}</strong></div>
              <div class="inline">
                <span class="negative">${money(s.amount,t.currency)}</span>
                <button class="btn small primary" onclick="openSettlementModal('${t.id}','${esc(s.from)}','${esc(s.to)}',${s.amount})">Record payment</button>
              </div>
            </div>`).join("") || `<div class="empty">Everyone is settled.</div>`}
          </div>
        </div>
        <div class="card">
          <h2>Member Balances</h2>
          <div class="list">${ledger.map(r=>`
            <div class="list-item clickable" onclick="openMemberDetail('${t.id}','${esc(r.member)}')">
              <div><strong>${r.member}</strong><div class="meta">Paid ${money(r.paid,t.currency)} · Consumed ${money(r.consumed,t.currency)}</div></div>
              <div class="${r.balance>0?'positive':r.balance<0?'negative':'neutral'}">${money(r.balance,t.currency)}</div>
            </div>`).join("")}
          </div>
        </div>
      </div>`;
  }
  if(tab==="settlements"){
    return `
      <div class="section-head"><h2>Settlements</h2><button class="btn primary" onclick="openSettlementModal('${t.id}')">+ Record Settlement</button></div>
      <div class="list">
        ${(t.settlements||[]).slice().reverse().map(s=>`
          <div class="list-item">
            <div>
              <strong>${s.from} → ${s.to}</strong>
              <div class="meta">${s.date} ${s.time||""} · ${s.note||"No note"}</div>
            </div>
            <div class="inline">
              <span class="badge ${s.status==="Confirmed"?"settled":"partial"}">${s.status}</span>
              <strong>${money(s.amount,t.currency)}</strong>
              ${s.status==="Pending Confirmation"?`<button class="btn small success" onclick="confirmSettlement('${t.id}','${s.id}')">Confirm</button>`:""}
            </div>
          </div>`).join("") || `<div class="empty">No settlements yet.</div>`}
      </div>`;
  }
  if(tab==="history"){
    const rows=[];
    t.expenses.forEach(e=>rows.push({date:e.date,time:e.time,type:"Expense",name:e.name,amount:getExpenseTotal(e)}));
    (t.settlements||[]).forEach(s=>rows.push({date:s.date,time:s.time,type:`Settlement · ${s.status}`,name:`${s.from} → ${s.to}`,amount:s.amount}));
    rows.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.date} ${r.time||""}</td><td>${r.type}</td><td>${r.name}</td><td>${money(r.amount,t.currency)}</td></tr>`).join("")}</tbody>
    </table></div>`;
  }
  return "";
}

function expenseListItem(t,e){
  return `<div class="list-item clickable" onclick="showExpenseDetail('${t.id}','${e.id}')">
    <div><strong>${e.name}</strong><div class="meta">${e.date} ${e.time} · ${e.category} · ${e.merchant||"—"}</div></div>
    <div class="right"><strong>${money(getExpenseTotal(e),t.currency)}</strong><div class="meta">${e.payers.map(p=>p.name).join(", ")}</div></div>
  </div>`;
}

function openMemberDetail(tripId, memberName){
  const t=tripById(tripId);
  const ledger=tripLedger(t).find(r=>r.member===memberName);
  setView("memberDetailView",memberName,`${t.name} · member details`);
  const paymentRows=[];
  const consumptionRows=[];

  t.expenses.forEach(e=>{
    const p=paidForExpense(t,e)[memberName]||0;
    if(p>0) paymentRows.push({expense:e.name,date:e.date,time:e.time,amount:p});
    const c=consumptionForExpense(t,e)[memberName]||0;
    if(c>0){
      const itemBits=[];
      e.items.forEach(item=>{
        if((item.consumers||[]).includes(memberName)){
          itemBits.push(`${item.name}: ${money(Number(item.price)/item.consumers.length,t.currency)}`);
        }
      });
      consumptionRows.push({expense:e.name,date:e.date,time:e.time,amount:c,items:itemBits});
    }
  });

  document.getElementById("memberDetailView").innerHTML=`
    <div class="section-head">
      <button class="btn small" onclick="openTrip('${t.id}','members')">← ${t.name}</button>
    </div>
    <div class="member-hero">
      ${kpi("Total Paid",money(ledger.paid,t.currency),"Actual money paid")}
      ${kpi("Total Consumed",money(ledger.consumed,t.currency),"Assigned items + proportional fees")}
      ${kpi("Current Balance",money(ledger.balance,t.currency),ledger.balance>0?"Should receive":ledger.balance<0?"Owes money":"Settled")}
    </div>
    <div class="split">
      <div class="card">
        <h2>Payment History</h2>
        <div class="list">${paymentRows.map(r=>`
          <div class="list-item">
            <div><strong>${r.expense}</strong><div class="meta">${r.date} ${r.time}</div></div>
            <strong>${money(r.amount,t.currency)}</strong>
          </div>`).join("") || `<div class="empty">No payments recorded.</div>`}
        </div>
      </div>
      <div class="card">
        <h2>Consumption History</h2>
        <div class="list">${consumptionRows.map(r=>`
          <div class="list-item" style="align-items:flex-start">
            <div><strong>${r.expense}</strong><div class="meta">${r.date} ${r.time}</div>
              <div class="meta" style="margin-top:7px">${r.items.join(" · ")}</div>
            </div>
            <strong>${money(r.amount,t.currency)}</strong>
          </div>`).join("") || `<div class="empty">No consumption recorded.</div>`}
        </div>
      </div>
    </div>
  `;
}

function openTripModal(){
  modal(`
    <div class="modal-head"><h2>Create Trip</h2><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Trip Name</label><input id="tripName" placeholder="Dubai Trip"></div>
        <div class="form-group"><label>Destination</label><input id="tripDestination" placeholder="Dubai"></div>
        <div class="form-group"><label>Start Date</label><input id="tripStart" type="date"></div>
        <div class="form-group"><label>End Date</label><input id="tripEnd" type="date"></div>
        <div class="form-group"><label>Base Currency</label>
          <select id="tripCurrency">${state.currencies.map(c=>`<option>${c}</option>`).join("")}</select>
        </div>
        <div class="form-group full">
          <label>Members</label>
          <div class="notice">Hassan Mohamed is automatically included. Add other friends separated by commas.</div>
          <input id="tripMembers" placeholder="Ahmed, Mohamed, Ali">
        </div>
      </div>
      <div id="tripError"></div>
    </div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="createTrip()">Create Trip</button>
    </div>
  `);
}

function createTrip(){
  const name=document.getElementById("tripName").value.trim();
  const dest=document.getElementById("tripDestination").value.trim();
  const start=document.getElementById("tripStart").value;
  const end=document.getElementById("tripEnd").value;
  const currency=document.getElementById("tripCurrency").value;
  const extras=document.getElementById("tripMembers").value.split(",").map(x=>x.trim()).filter(Boolean);
  if(!name || !dest || !start || !end){
    document.getElementById("tripError").innerHTML=`<div class="error">Please complete all required trip fields.</div>`;
    return;
  }
  const t={
    id:uid("trip"),name,destination:dest,startDate:start,endDate:end,currency,status:"Active",
    members:[...new Set([state.mainUser,...extras])],expenses:[],settlements:[]
  };
  state.trips.unshift(t);
  saveState();closeModal();renderAll();openTrip(t.id);
}

function openMemberModal(tripId){
  modal(`
    <div class="modal-head"><h2>Add Member</h2><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Member Name</label><input id="memberName" placeholder="e.g. Karim"></div>
      <div id="memberError"></div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="addMember('${tripId}')">Add</button></div>
  `);
}
function addMember(tripId){
  const t=tripById(tripId);
  const n=document.getElementById("memberName").value.trim();
  if(!n){document.getElementById("memberError").innerHTML=`<div class="error">Enter a name.</div>`;return;}
  if(t.members.includes(n)){document.getElementById("memberError").innerHTML=`<div class="error">This member already exists.</div>`;return;}
  t.members.push(n);saveState();closeModal();renderTripDetail(tripId,"members");renderAll();
}

function openExpenseModal(tripId){
  const t=tripById(tripId);
  const now=new Date();
  modal(`
    <div class="modal-head"><h2>Add Expense</h2><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="notice">Nothing is divided automatically. Add items, assign the actual consumers, then separately record who paid.</div>
      <div class="form-grid" style="margin-top:14px">
        <div class="form-group"><label>Expense Name</label><input id="expName" placeholder="Restaurant Dinner"></div>
        <div class="form-group"><label>Merchant</label><input id="expMerchant" placeholder="Restaurant name"></div>
        <div class="form-group"><label>Date</label><input id="expDate" type="date" value="${now.toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Time</label><input id="expTime" type="time" value="${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}"></div>
        <div class="form-group"><label>Category</label>
          <select id="expCategory">${["Food","Transportation","Hotel","Activities","Shopping","Other"].map(x=>`<option>${x}</option>`).join("")}</select>
        </div>
        <div class="form-group"><label>Currency</label><input value="${t.currency}" disabled></div>
      </div>

      <hr class="sep">
      <div class="section-head"><h3>Items / Meals</h3><button class="btn small soft" onclick="addItemRow('${tripId}')">+ Add Item</button></div>
      <div id="itemsArea"></div>

      <hr class="sep">
      <div class="section-head"><h3>Who Paid?</h3><button class="btn small soft" onclick="addPayerRow('${tripId}')">+ Add Payer</button></div>
      <div id="payersArea"></div>

      <hr class="sep">
      <div class="form-grid">
        <div class="form-group"><label>Tax Amount</label><input id="taxAmount" type="number" min="0" value="0" step="0.01"></div>
        <div class="form-group"><label>Service Fee</label><input id="serviceFee" type="number" min="0" value="0" step="0.01"></div>
        <div class="form-group"><label>Other Fee</label><input id="otherFee" type="number" min="0" value="0" step="0.01"></div>
      </div>
      <div id="expError"></div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveExpense('${tripId}')">Review & Save</button></div>
  `);
  addItemRow(tripId);
  addPayerRow(tripId);
}

function addItemRow(tripId){
  const t=tripById(tripId);
  const row=document.createElement("div");
  row.className="item-row";
  row.innerHTML=`
    <div class="form-group"><label>Item</label><input class="item-name" placeholder="Pizza"></div>
    <div class="form-group"><label>Price</label><input class="item-price" type="number" min="0" step="0.01" placeholder="0"></div>
    <div class="form-group"><label>Consumers</label>
      <div class="consumer-box">${t.members.map(m=>`<label class="pill-check"><input type="checkbox" class="item-consumer" value="${escAttr(m)}"> ${m}</label>`).join("")}</div>
    </div>
    <button class="btn small danger" onclick="this.parentElement.remove()">Remove</button>
  `;
  document.getElementById("itemsArea").appendChild(row);
}

function addPayerRow(tripId){
  const t=tripById(tripId);
  const row=document.createElement("div");
  row.className="payer-row";
  row.innerHTML=`
    <div class="form-group"><label>Payer</label><select class="payer-name">${t.members.map(m=>`<option>${m}</option>`).join("")}</select></div>
    <div class="form-group"><label>Amount Paid</label><input class="payer-amount" type="number" min="0" step="0.01" placeholder="0"></div>
    <button class="btn small danger" onclick="this.parentElement.remove()">Remove</button>
  `;
  document.getElementById("payersArea").appendChild(row);
}

function saveExpense(tripId){
  const t=tripById(tripId);
  const name=document.getElementById("expName").value.trim();
  const merchant=document.getElementById("expMerchant").value.trim();
  const date=document.getElementById("expDate").value;
  const time=document.getElementById("expTime").value;
  const category=document.getElementById("expCategory").value;
  const tax=Number(document.getElementById("taxAmount").value||0);
  const service=Number(document.getElementById("serviceFee").value||0);
  const other=Number(document.getElementById("otherFee").value||0);

  const items=[...document.querySelectorAll(".item-row")].map(r=>({
    name:r.querySelector(".item-name").value.trim(),
    price:Number(r.querySelector(".item-price").value||0),
    consumers:[...r.querySelectorAll(".item-consumer:checked")].map(c=>c.value)
  })).filter(i=>i.name || i.price);

  const payers=[...document.querySelectorAll(".payer-row")].map(r=>({
    name:r.querySelector(".payer-name").value,
    amount:Number(r.querySelector(".payer-amount").value||0)
  })).filter(p=>p.amount>0);

  const err=document.getElementById("expError");
  if(!name || !date || !time){err.innerHTML=`<div class="error">Enter expense name, date and time.</div>`;return;}
  if(!items.length){err.innerHTML=`<div class="error">Add at least one item.</div>`;return;}
  if(items.some(i=>!i.name || i.price<=0)){err.innerHTML=`<div class="error">Every item needs a name and positive price.</div>`;return;}
  if(items.some(i=>!i.consumers.length)){err.innerHTML=`<div class="error">Every item must have at least one explicitly selected consumer.</div>`;return;}

  const subtotal=items.reduce((s,i)=>s+i.price,0);
  const finalTotal=subtotal+tax+service+other;
  const paidTotal=payers.reduce((s,p)=>s+p.amount,0);

  if(Math.abs(finalTotal-paidTotal)>0.01){
    err.innerHTML=`<div class="error">Payer contributions must equal the final bill total. Bill: ${money(finalTotal,t.currency)} · Recorded: ${money(paidTotal,t.currency)} · Remaining: ${money(finalTotal-paidTotal,t.currency)}</div>`;
    return;
  }

  const exp={id:uid("exp"),name,merchant,date,time,category,currency:t.currency,items,taxAmount:tax,serviceFee:service,otherFee:other,payers,createdAt:new Date().toISOString()};
  showExpenseReview(t,exp);
}

function showExpenseReview(t,exp){
  const paid=paidForExpense(t,exp);
  const consumed=consumptionForExpense(t,exp);
  const rows=t.members.map(m=>({m,paid:paid[m]||0,consumed:consumed[m]||0,balance:(paid[m]||0)-(consumed[m]||0)}));
  modal(`
    <div class="modal-head"><h2>Review Expense</h2><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="summary-grid">
        <div class="summary-box"><div class="meta">Bill Total</div><div class="big-number">${money(getExpenseTotal(exp),t.currency)}</div></div>
        <div class="summary-box"><div class="meta">Items</div><div class="big-number">${exp.items.length}</div></div>
        <div class="summary-box"><div class="meta">Payers</div><div class="big-number">${exp.payers.length}</div></div>
      </div>
      <hr class="sep">
      <h3>Payment vs Consumption</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Member</th><th>Paid</th><th>Consumed</th><th>Net Position</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td>${r.m}</td><td>${money(r.paid,t.currency)}</td><td>${money(r.consumed,t.currency)}</td><td class="${r.balance>0?'positive':r.balance<0?'negative':'neutral'}">${money(r.balance,t.currency)}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="notice" style="margin-top:14px">Positive means the member should receive money. Negative means the member owes money.</div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="openTrip('${t.id}','expenses');closeModal()">Cancel</button><button class="btn primary" onclick='commitExpense(${JSON.stringify(JSON.stringify(exp))},"${t.id}")'>Confirm & Save</button></div>
  `);
}

function commitExpense(expJson,tripId){
  const exp=JSON.parse(expJson);
  const t=tripById(tripId);
  t.expenses.push(exp);
  t.status="Active";
  saveState();closeModal();renderAll();openTrip(tripId,"overview");
}

function showExpenseDetail(tripId,expId){
  const t=tripById(tripId);
  const e=t.expenses.find(x=>x.id===expId);
  const paid=paidForExpense(t,e),cons=consumptionForExpense(t,e);
  modal(`
    <div class="modal-head"><div><h2>${e.name}</h2><div class="meta">${e.date} ${e.time} · ${e.category}</div></div><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="summary-grid">
        <div class="summary-box"><div class="meta">Total</div><div class="big-number">${money(getExpenseTotal(e),t.currency)}</div></div>
        <div class="summary-box"><div class="meta">Tax + Fees</div><div class="big-number">${money(Number(e.taxAmount||0)+Number(e.serviceFee||0)+Number(e.otherFee||0),t.currency)}</div></div>
        <div class="summary-box"><div class="meta">Merchant</div><div class="big-number" style="font-size:18px">${e.merchant||"—"}</div></div>
      </div>
      <hr class="sep">
      <h3>Items & Consumers</h3>
      <div class="list">${e.items.map(i=>`<div class="list-item"><div><strong>${i.name}</strong><div class="meta">${i.consumers.join(", ")}</div></div><strong>${money(i.price,t.currency)}</strong></div>`).join("")}</div>
      <hr class="sep">
      <h3>Payment vs Consumption</h3>
      <div class="table-wrap"><table><thead><tr><th>Member</th><th>Paid</th><th>Consumed</th></tr></thead><tbody>
        ${t.members.map(m=>`<tr><td>${m}</td><td>${money(paid[m]||0,t.currency)}</td><td>${money(cons[m]||0,t.currency)}</td></tr>`).join("")}
      </tbody></table></div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Close</button></div>
  `);
}

function openSettlementModal(tripId,from="",to="",suggested=""){
  const t=tripById(tripId);
  modal(`
    <div class="modal-head"><h2>Record Settlement</h2><button class="icon-btn" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>From</label><select id="setFrom">${t.members.map(m=>`<option ${m===from?'selected':''}>${m}</option>`).join("")}</select></div>
        <div class="form-group"><label>To</label><select id="setTo">${t.members.map(m=>`<option ${m===to?'selected':''}>${m}</option>`).join("")}</select></div>
        <div class="form-group"><label>Amount</label><input id="setAmount" type="number" min="0" step="0.01" value="${suggested?Number(suggested).toFixed(2):""}"></div>
        <div class="form-group"><label>Date</label><input id="setDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Time</label><input id="setTime" type="time"></div>
        <div class="form-group full"><label>Note</label><input id="setNote" placeholder="Optional note"></div>
      </div>
      <div id="setError"></div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveSettlement('${tripId}')">Record</button></div>
  `);
}
function saveSettlement(tripId){
  const t=tripById(tripId);
  const from=document.getElementById("setFrom").value;
  const to=document.getElementById("setTo").value;
  const amount=Number(document.getElementById("setAmount").value||0);
  const date=document.getElementById("setDate").value;
  const time=document.getElementById("setTime").value;
  const note=document.getElementById("setNote").value.trim();
  if(from===to || amount<=0 || !date){
    document.getElementById("setError").innerHTML=`<div class="error">Choose different members, a positive amount, and a date.</div>`;return;
  }
  t.settlements=t.settlements||[];
  t.settlements.push({id:uid("set"),from,to,amount,date,time,status:"Pending Confirmation",note});
  saveState();closeModal();renderAll();openTrip(tripId,"settlements");
}
function confirmSettlement(tripId,setId){
  const t=tripById(tripId);
  const s=t.settlements.find(x=>x.id===setId);
  if(s)s.status="Confirmed";
  saveState();renderAll();openTrip(tripId,"settlements");
}

function modal(content){
  document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${content}</div></div>`;
}
function closeModal(){document.getElementById("modalRoot").innerHTML="";}

function esc(s){return String(s).replaceAll("\\","\\\\").replaceAll("'","\\'")}
function escAttr(s){return String(s).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}

renderAll();
goHome();

window.addEventListener("keydown",e=>{
  if(e.key==="Escape")closeModal();
});
