const SUPABASE_FUNCTION_URL="https://bstcydrgyspgofckzybl.supabase.co/functions/v1/fv-casa-data";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_LURu7IVWMgryAlEq6upJKQ_wrTMfBJ6";

const $=id=>document.getElementById(id);


function formatNumber(value,decimals=3){

  const n=Number(value);

  if(!Number.isFinite(n)){
    return"—";
  }

  return n.toLocaleString("it-IT",{
    minimumFractionDigits:decimals,
    maximumFractionDigits:decimals
  });
}


function formatKwh(value){

  return Number.isFinite(Number(value))
    ? formatNumber(value,1)+" kWh"
    :"—";
}


function formatEuro(value){

  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString("it-IT",{
        minimumFractionDigits:2,
        maximumFractionDigits:2
      })+" €"
    :"—";
}


function formatMonth(value){

  if(!value){
    return"—";
  }

  const d=new Date(value+"T00:00:00");

  if(Number.isNaN(d.getTime())){
    return value;
  }

  return d.toLocaleDateString("it-IT",{
    month:"long",
    year:"numeric"
  });
}


function formatTime(iso){

  if(!iso){
    return"—";
  }

  const d=new Date(iso);

  if(Number.isNaN(d.getTime())){
    return iso;
  }

  return d.toLocaleTimeString("it-IT",{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });
}


function renderMonthly(data){

  const container=$("monthlyData");

  if(!Array.isArray(data)||data.length===0){

    container.innerHTML=
      '<div class="monthly-empty">Nessun dato mensile disponibile</div>';

    return;
  }

  let html=`
    <div class="monthly-header">
      <span>Mese</span>
      <span>FV</span>
      <span>Casa</span>
      <span>Immesso</span>
      <span>Prelevato</span>
    </div>
  `;

  const monthlyData=[...data].sort((a,b)=>
    new Date(a.mese+"T00:00:00")-
    new Date(b.mese+"T00:00:00")
  );

  monthlyData.forEach((row,index)=>{

    const current=index===monthlyData.length-1;

    html+=`
      <div class="monthly-row${current?" monthly-current":""}">
        <span>${formatMonth(row.mese)}</span>
        <span class="monthly-value">${formatKwh(row.produzione_fv_kwh)}</span>
        <span class="monthly-value">${formatKwh(row.consumo_casa_kwh)}</span>
        <span class="monthly-value">${formatKwh(row.immesso_rete_kwh)}</span>
        <span class="monthly-value">${formatKwh(row.prelevato_rete_kwh)}</span>
      </div>
    `;
  });

  container.innerHTML=html;
}


function renderNufri(data){

  const container=$("nufriData");
  const toggle=$("nufriToggle");

  if(!Array.isArray(data)||data.length===0){

    container.innerHTML=
      '<div class="nufri-empty">Nessun dato Nufri disponibile</div>';

    toggle.hidden=true;

    return;
  }

  let html="";

  data.forEach((row,index)=>{

    const hidden=index>0;

    html+=`
      <article class="nufri-card${hidden?" nufri-hidden":""}">

        <div class="nufri-month">
          ${formatMonth(row.mese)}
        </div>

        <div class="nufri-row">
          <span>Consumo</span>
          <strong>${formatKwh(row.consumo_nufri_kwh)}</strong>
        </div>

        <div class="nufri-row">
          <span>Energia fatturata</span>
          <strong>${formatKwh(row.energia_fatturata_kwh)}</strong>
        </div>

        <div class="nufri-row">
          <span>Eccedenze</span>
          <strong>${formatKwh(row.eccedenze_kwh)}</strong>
        </div>

        <div class="nufri-row nufri-total">
          <span>Fattura IVA inclusa</span>
          <strong>${formatEuro(row.importo_iva_inclusa)}</strong>
        </div>

      </article>
    `;
  });

  container.innerHTML=html;

  if(data.length>1){

    toggle.hidden=false;
    toggle.textContent="Mostra mesi precedenti";
    toggle.dataset.expanded="false";

  }else{

    toggle.hidden=true;
  }
}


function toggleNufri(){

  const cards=document.querySelectorAll(".nufri-hidden");
  const toggle=$("nufriToggle");

  if(!cards.length){
    return;
  }

  const expanded=toggle.dataset.expanded==="true";

  cards.forEach(card=>{
    card.classList.toggle("nufri-visible",!expanded);
  });

  toggle.dataset.expanded=String(!expanded);

  toggle.textContent=
    expanded
      ?"Mostra mesi precedenti"
      :"Nascondi mesi precedenti";
}


function renderSavings(data){

  const container=$("savingsData");
  const toggle=$("savingsToggle");

  if(!Array.isArray(data)||data.length===0){

    container.innerHTML=
      '<div class="savings-empty">Nessun dato economico disponibile</div>';

    toggle.hidden=true;

    return;
  }

  let html="";

  data.forEach((row,index)=>{

    const hidden=index>0;

    html+=`
      <article class="savings-card${hidden?" savings-hidden":""}">

        <div class="savings-month">
          ${formatMonth(row.mese)}
        </div>

        <div class="savings-row">
          <span>Costo senza FV</span>
          <strong>${formatEuro(row.costo_senza_fv)}</strong>
        </div>

        <div class="savings-row">
          <span>Costo con FV</span>
          <strong>${formatEuro(row.costo_con_fv)}</strong>
        </div>

        <div class="savings-row">
          <span>Risparmio FV</span>
          <strong>${formatEuro(row.risparmio_fv)}</strong>
        </div>

        <div class="savings-row">
          <span>Rata finanziamento</span>
          <strong>${formatEuro(row.rata_finanziamento)}</strong>
        </div>

        <div class="savings-row savings-net">

          <span>
            Risparmio netto
          </span>

          <strong class="${Number(row.risparmio_netto)>=0?"positive":"negative"}">
            ${formatEuro(row.risparmio_netto)}
          </strong>

        </div>

        <div class="savings-row savings-cumulative">

          <span>
            Risparmio netto cumulato
          </span>

          <strong class="${Number(row.risparmio_netto_cumulato)>=0?"positive":"negative"}">
            ${formatEuro(row.risparmio_netto_cumulato)}
          </strong>

        </div>

      </article>
    `;
  });

  container.innerHTML=html;

  if(data.length>1){

    toggle.hidden=false;
    toggle.textContent="Mostra mesi precedenti";
    toggle.dataset.expanded="false";

  }else{

    toggle.hidden=true;
  }
}


function toggleSavings(){

  const cards=document.querySelectorAll(".savings-hidden");
  const toggle=$("savingsToggle");

  if(!cards.length){
    return;
  }

  const expanded=toggle.dataset.expanded==="true";

  cards.forEach(card=>{
    card.classList.toggle("savings-visible",!expanded);
  });

  toggle.dataset.expanded=String(!expanded);

  toggle.textContent=
    expanded
      ?"Mostra mesi precedenti"
      :"Nascondi mesi precedenti";
}


function setTodayDate(){

  const today=new Date();

  const text=today.toLocaleDateString("it-IT",{
    weekday:"long",
    day:"numeric",
    month:"long",
    year:"numeric"
  });

  $("todayDate").textContent=
    text.charAt(0).toUpperCase()+text.slice(1);
}


setTodayDate();


async function loadData(){

  const status=$("status");

  status.textContent="Aggiornamento…";

  try{

    const headers={};

    if(
      SUPABASE_PUBLISHABLE_KEY &&
      !SUPABASE_PUBLISHABLE_KEY.startsWith("INSERIRE_")
    ){

      headers.apikey=SUPABASE_PUBLISHABLE_KEY;
      headers.Authorization="Bearer "+SUPABASE_PUBLISHABLE_KEY;
    }

    const response=await fetch(
      SUPABASE_FUNCTION_URL,
      {
        method:"GET",
        headers,
        cache:"no-store"
      }
    );

    const result=await response.json();

    if(
      !response.ok ||
      !result.ok ||
      !result.dati
    ){

      throw new Error(
        result.error ||
        "HTTP "+response.status
      );
    }

    const d=result.dati;

    $("produzioneKwh").textContent=
      formatKwh(d.produzione_fv_kwh).replace(" kWh","");

    $("consumoKwh").textContent=
      formatKwh(d.consumo_casa_kwh);

    $("immessoKwh").textContent=
      formatKwh(d.immesso_rete_kwh);

    $("prelevatoKwh").textContent=
      formatKwh(d.prelevato_rete_kwh);

    const risparmio=Array.isArray(result.risparmio)
      ? result.risparmio
      : [];

    const corrente=risparmio.length
      ? risparmio[0]
      : null;

    if(corrente){

      $("risparmioMese").textContent=
        formatEuro(corrente.risparmio_fv);

      $("risparmioCumulato").textContent=
        formatEuro(corrente.risparmio_netto_cumulato);

    }

    $("risparmioOggi").textContent="—";

    $("lastUpdate").textContent=
      formatTime(d.rilevazione_at);

    status.textContent="Dati aggiornati";

  }catch(error){

    console.error(error);

    status.textContent=
      "Impossibile aggiornare i dati";
  }
}
