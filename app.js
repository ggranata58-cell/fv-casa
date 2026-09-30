const SUPABASE_FUNCTION_URL="https://bstcydrgyspgofckzybl.supabase.co/functions/v1/fv-casa-data";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_LURu7IVWMgryAlEq6upJKQ_wrTMfBJ6";

const $=id=>document.getElementById(id);

function formatNumber(value,decimals=3){
  const n=Number(value);
  if(!Number.isFinite(n))return"—";
  return n.toLocaleString("it-IT",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}

function formatKwh(value){
  return Number.isFinite(Number(value))?formatNumber(value,1)+" kWh":"—";
}

function formatTime(iso){
  if(!iso)return"—";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return iso;
  return d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

async function loadData(){
  const status=$("status");
  status.textContent="Aggiornamento…";

  try{
    const headers={};

    if(SUPABASE_PUBLISHABLE_KEY&&!SUPABASE_PUBLISHABLE_KEY.startsWith("INSERIRE_")){
      headers.apikey=SUPABASE_PUBLISHABLE_KEY;
      headers.Authorization="Bearer "+SUPABASE_PUBLISHABLE_KEY;
    }

    const response=await fetch(SUPABASE_FUNCTION_URL,{
      method:"GET",
      headers,
      cache:"no-store"
    });

    const result=await response.json();

    if(!response.ok||!result.ok||!result.dati){
      throw new Error(result.error||"HTTP "+response.status);
    }

    const d=result.dati;

    $("produzioneKw").textContent=formatNumber(d.produzione_fv_kw);
    $("consumoKw").textContent=formatNumber(d.consumo_casa_kw);
    $("immissioneKw").textContent=formatNumber(d.immissione_rete_kw);
    $("prelievoKw").textContent=formatNumber(d.prelievo_rete_kw);

    $("produzioneKwh").textContent=formatKwh(d.produzione_fv_kwh);
    $("consumoKwh").textContent=formatKwh(d.consumo_casa_kwh);
    $("immessoKwh").textContent=formatKwh(d.immesso_rete_kwh);
    $("prelevatoKwh").textContent=formatKwh(d.prelevato_rete_kwh);

    $("lastUpdate").textContent=formatTime(d.rilevazione_at);
    status.textContent="Dati aggiornati";
  }catch(error){
    console.error(error);
    status.textContent="Impossibile aggiornare i dati";
  }
}

$("refreshButton").addEventListener("click",loadData);

loadData();

setInterval(loadData,5*60*1000);

if("serviceWorker"in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("sw.js").catch(console.error);
  });
}
