const SUPABASE_FUNCTION_URL="https://bstcydrgyspgofckzybl.supabase.co/functions/v1/fv-casa-data";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_LURu7IVWMgryAlEq6upJKQ_wrTMfBJ6";

const $=id=>document.getElementById(id);

let storicoData=[];
let risparmioData=[];
let storicoPeriodo="giorno";

function formatNumber(value,decimals=3){
  const n=Number(value);
  if(!Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}

function formatKwh(value){
  return Number.isFinite(Number(value)) ? formatNumber(value,1)+" kWh" : "—";
}

function formatEuro(value){
  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2})+" €"
    : "—";
}

function formatMonth(value){
  if(!value) return "—";
  const d=new Date(value+"T00:00:00");
  if(Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("it-IT",{month:"long",year:"numeric"});
}

function formatTime(iso){
  if(!iso) return "—";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function setTodayDate(){
  const today=new Date();
  const text=today.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  $("todayDate").textContent=text.charAt(0).toUpperCase()+text.slice(1);
}

function setPage(page){
  const oggi=page==="Oggi";
  const storico=page==="Storico";
  $("pageOggi").hidden=!oggi;
  $("pageStorico").hidden=!storico;
  document.querySelectorAll(".nav-item").forEach(button=>{
    button.classList.toggle("active",button.dataset.page===page);
  });
  if(storico) renderHistory(storicoPeriodo);
}

function createChart(containerId,rows,series,titleSuffix){
  const container=$(containerId);
  if(!Array.isArray(rows)||rows.length===0){
    container.innerHTML='<div class="chart-empty">Nessun dato storico disponibile</div>';
    return;
  }
  const valid=rows.filter(row=>Number.isFinite(Number(row.value)));
  if(!valid.length){
    container.innerHTML='<div class="chart-empty">Nessun dato storico disponibile</div>';
    return;
  }
  const max=Math.max(...valid.map(row=>Number(row.value)),0);
  container.innerHTML=valid.map(row=>{
    const value=Number(row.value);
    const width=max>0 ? Math.max(3,(value/max)*100) : 3;
    return `
      <div class="chart-row">
        <span class="chart-label">${row.label}</span>
        <div class="chart-track"><div class="chart-bar ${series}" style="width:${width}%"></div></div>
        <strong class="chart-value">${formatNumber(value,1)}</strong>
      </div>
    `;
  }).join("");
  container.dataset.title=titleSuffix;
}

function getHistoryRows(){
  if(storicoPeriodo==="giorno") return [];
  if(!Array.isArray(storicoData)) return [];

  if(storicoPeriodo==="anno"){
    const grouped={};

    storicoData.forEach(row=>{
      if(!row.mese) return;
      const year=String(row.mese).slice(0,4);
      if(!/^\d{4}$/.test(year)) return;

      if(!grouped[year]){
        grouped[year]={produzione:0,consumo:0,immesso:0,prelevato:0};
      }

      grouped[year].produzione+=Number(row.produzione_fv_kwh)||0;
      grouped[year].consumo+=Number(row.consumo_casa_kwh)||0;
      grouped[year].immesso+=Number(row.immesso_rete_kwh)||0;
      grouped[year].prelevato+=Number(row.prelevato_rete_kwh)||0;
    });

    return Object.entries(grouped)
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([label,v])=>({label,...v}));
  }

  return [...storicoData]
    .sort((a,b)=>new Date(a.mese+"T00:00:00")-new Date(b.mese+"T00:00:00"))
    .map(row=>({
      label:formatMonth(row.mese),
      produzione:Number(row.produzione_fv_kwh)||0,
      consumo:Number(row.consumo_casa_kwh)||0,
      immesso:Number(row.immesso_rete_kwh)||0,
      prelevato:Number(row.prelevato_rete_kwh)||0
    }));
}

function getSavingsRows(){
  if(storicoPeriodo==="giorno") return [];
  if(!Array.isArray(risparmioData)) return [];

  if(storicoPeriodo==="anno"){
    const grouped={};

    risparmioData.forEach(row=>{
      if(!row.mese) return;
      const year=String(row.mese).slice(0,4);
      if(!/^\d{4}$/.test(year)) return;

      if(!grouped[year]){
        grouped[year]={
          risparmio_fv:0,
          risparmio_netto:0,
          risparmio_netto_cumulato:0,
          ultimo_mese:""
        };
      }

      grouped[year].risparmio_fv+=Number(row.risparmio_fv)||0;
      grouped[year].risparmio_netto+=Number(row.risparmio_netto)||0;

      if(!grouped[year].ultimo_mese || String(row.mese)>grouped[year].ultimo_mese){
        grouped[year].ultimo_mese=String(row.mese);
        grouped[year].risparmio_netto_cumulato=Number(row.risparmio_netto_cumulato)||0;
      }
    });

    return Object.entries(grouped)
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([label,v])=>({label,...v}));
  }

  return [...risparmioData]
    .sort((a,b)=>new Date(a.mese+"T00:00:00")-new Date(b.mese+"T00:00:00"))
    .map(row=>({
      label:formatMonth(row.mese),
      risparmio_fv:Number(row.risparmio_fv)||0,
      risparmio_netto:Number(row.risparmio_netto)||0,
      risparmio_netto_cumulato:Number(row.risparmio_netto_cumulato)||0
    }));
}

function renderHistory(period=storicoPeriodo){
  storicoPeriodo=period;
  document.querySelectorAll(".period-button").forEach(button=>{
    button.classList.toggle("active",button.dataset.period===period);
  });

  const noDailyMessage='<div class="chart-empty">Storico giornaliero non disponibile</div>';

  if(period==="giorno"){
    $("productionChart").innerHTML=noDailyMessage;
    $("energyChart").innerHTML=noDailyMessage;
    $("savingsChart").innerHTML=noDailyMessage;
    return;
  }

  const rows=getHistoryRows();

  createChart("productionChart",rows.map(row=>({label:row.label,value:row.produzione})),"chart-production","Produzione");

  const energyContainer=$("energyChart");

  if(rows.length){
    const max=Math.max(...rows.map(item=>Math.max(item.consumo,item.immesso,item.prelevato)),0);

    const makeBar=(value,className)=>`
      <div class="energy-chart-item">
        <span class="energy-chart-name">${className==="consumo"?"Consumo":className==="immesso"?"Immissione":"Prelievo"}</span>
        <div class="chart-track"><div class="chart-bar ${className}" style="width:${max>0?Math.max(3,(value/max)*100):3}%"></div></div>
        <strong>${formatNumber(value,1)}</strong>
      </div>`;

    energyContainer.innerHTML=rows.map(row=>`
      <div class="chart-group">
        <div class="chart-label chart-group-label">${row.label}</div>
        ${makeBar(row.consumo,"consumo")}
        ${makeBar(row.immesso,"immesso")}
        ${makeBar(row.prelevato,"prelevato")}
      </div>
    `).join("");
  }else{
    energyContainer.innerHTML='<div class="chart-empty">Nessun dato storico disponibile</div>';
  }

  const savingsRows=getSavingsRows();

  if(savingsRows.length){
    const values=savingsRows.map(row=>Number(row.risparmio_fv)||0);
    const max=Math.max(...values,0);

    $("savingsChart").innerHTML=savingsRows.map(row=>{
      const value=Number(row.risparmio_fv)||0;
      const width=max>0 ? Math.max(3,(value/max)*100) : 3;

      return `
        <div class="chart-row">
          <span class="chart-label">${row.label}</span>
          <div class="chart-track"><div class="chart-bar savings" style="width:${width}%"></div></div>
          <strong class="chart-value">${formatEuro(value)}</strong>
        </div>
      `;
    }).join("");
  }else{
    $("savingsChart").innerHTML='<div class="chart-empty">Nessun dato storico disponibile</div>';
  }
}

function renderMonthly(data){}
function renderNufri(data){}
function renderSavings(data){}

function setupNavigation(){
  document.querySelectorAll(".nav-item").forEach(button=>{
    button.addEventListener("click",event=>{
      event.preventDefault();
      const page=button.getAttribute("data-page");
      if(page==="Oggi"||page==="Storico") setPage(page);
    });
  });

  document.querySelectorAll(".period-button").forEach(button=>{
    button.addEventListener("click",()=>renderHistory(button.dataset.period));
  });
}

setTodayDate();
setupNavigation();

async function loadData(){
  const status=$("status");
  status.textContent="Aggiornamento…";

  try{
    const headers={};

    if(SUPABASE_PUBLISHABLE_KEY&&!SUPABASE_PUBLISHABLE_KEY.startsWith("INSERIRE_")){
      headers.apikey=SUPABASE_PUBLISHABLE_KEY;
      headers.Authorization="Bearer "+SUPABASE_PUBLISHABLE_KEY;
    }

    const response=await fetch(SUPABASE_FUNCTION_URL,{method:"GET",headers,cache:"no-store"});
    const result=await response.json();

    if(!response.ok||!result.ok||!result.dati) throw new Error(result.error||"HTTP "+response.status);

    const d=result.dati;

    $("produzioneKwh").textContent=formatKwh(d.produzione_fv_kwh).replace(" kWh","");
    $("consumoKwh").textContent=formatKwh(d.consumo_casa_kwh);
    $("immessoKwh").textContent=formatKwh(d.immesso_rete_kwh);
    $("prelevatoKwh").textContent=formatKwh(d.prelevato_rete_kwh);

    risparmioData=Array.isArray(result.risparmio)?result.risparmio:[];
    const corrente=risparmioData.length?risparmioData[0]:null;

    if(corrente){
      $("risparmioMese").textContent=formatEuro(corrente.risparmio_fv);
      $("risparmioCumulato").textContent=formatEuro(corrente.risparmio_netto_cumulato);
    }

    $("risparmioOggi").textContent="—";
    $("lastUpdate").textContent=formatTime(d.rilevazione_at);

    storicoData=
      Array.isArray(result.mensile) ? result.mensile :
      Array.isArray(result.storico) ? result.storico :
      Array.isArray(result.storico_mensile) ? result.storico_mensile :
      [];

    renderHistory(storicoPeriodo);
    status.textContent="Dati aggiornati";
  }catch(error){
    console.error(error);
    status.textContent="Impossibile aggiornare i dati";
  }
}

loadData();
setInterval(loadData,300000);

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(error=>console.error("Service Worker:",error));
}