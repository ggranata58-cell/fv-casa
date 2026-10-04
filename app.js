const SUPABASE_FUNCTION_URL="https://bstcydrgyspgofckzybl.supabase.co/functions/v1/fv-casa-data";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_LURu7IVWMgryAlEq6upJKQ_wrTMfBJ6";

const $=id=>document.getElementById(id);

let storicoData=[];
let risparmioData=[];
let storicoPeriodo="giorno";
let settingsSyncRequested=false;
const SETTINGS_STORAGE_KEY="fv-casa-economic-parameters-v1";
const DEFAULT_ECONOMIC_PARAMETERS=[
{id:"energia_acquistata",name:"Prezzo energia acquistata",unit:"€/kWh",decimals:6,values:[{date:"2026-02-01",value:0.154852}]},
{id:"energia_immessa",name:"Prezzo energia immessa",unit:"€/kWh",decimals:6,values:[{date:"2026-02-01",value:0.06}]},
{id:"imposta_elettrica",name:"Imposta elettrica",unit:"",decimals:6,values:[{date:"2026-02-01",value:5.112696,unit:"%"},{date:"2026-03-01",value:0.001,unit:"€/kWh"},{date:"2026-05-01",value:5.112696,unit:"%"}]},
{id:"iva",name:"IVA",unit:"%",decimals:2,values:[{date:"2026-02-01",value:21},{date:"2026-03-01",value:10},{date:"2026-05-01",value:21}]},
{id:"potenza_p1",name:"Costo potenza P1",unit:"€/kW/giorno",decimals:6,values:[{date:"2026-02-01",value:0.078179}]},
{id:"potenza_p3",name:"Costo potenza P3",unit:"€/kW/giorno",decimals:6,values:[{date:"2026-02-01",value:0.002047}]},
{id:"alquiler_contador",name:"Alquiler contador",unit:"€/giorno",decimals:6,values:[{date:"2026-02-01",value:0.026786}]},
{id:"bono_social",name:"Bono Social",unit:"€/giorno",decimals:6,values:[{date:"2026-02-01",value:0.019121},{date:"2026-07-01",value:0.024688}]}
];
let economicParameters=loadEconomicParameters();
function cloneEconomicParameters(){return JSON.parse(JSON.stringify(DEFAULT_ECONOMIC_PARAMETERS));}
function loadEconomicParameters(){try{const saved=localStorage.getItem(SETTINGS_STORAGE_KEY);if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed)&&parsed.length)return parsed;}}catch(error){console.error("Parametri economici:",error);}return cloneEconomicParameters();}
function saveEconomicParameters(){localStorage.setItem(SETTINGS_STORAGE_KEY,JSON.stringify(economicParameters));}
function formatParameterValue(parameter,entry){const unit=entry.unit!==undefined?entry.unit:parameter.unit;const decimals=entry.decimals!==undefined?entry.decimals:parameter.decimals;const value=Number(entry.value);if(!Number.isFinite(value))return "—";return value.toLocaleString("it-IT",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+(unit?" "+unit:"");}
function formatParameterDate(date){if(!date)return "—";const parts=String(date).split("-");return parts.length===3?parts[2]+"/"+parts[1]+"/"+parts[0]:date;}
function sortParameterValues(parameter){parameter.values.sort((a,b)=>String(a.date).localeCompare(String(b.date)));}
function getParameterEntry(id,date=new Date()){const parameter=economicParameters.find(item=>item.id===id);if(!parameter||!Array.isArray(parameter.values))return null;const target=date instanceof Date?date.toISOString().slice(0,10):String(date);const valid=parameter.values.filter(item=>item.date&&item.date<=target).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return valid.length?valid[valid.length-1]:null;}

function renderSettings(){
  const lastUpdate=$("lastUpdate")?.textContent||"—";
  $("settingsLastUpdate").textContent=lastUpdate;
  const container=$("economicSettings");
  if(!container)return;
  container.innerHTML=economicParameters.map(function(parameter){
    sortParameterValues(parameter);
    const current=parameter.values[parameter.values.length-1];
    const count=parameter.values.length;
    const history=parameter.values.map(function(entry,index){
      return "<div class=\"settings-history-row\"><span>"+formatParameterDate(entry.date)+"</span><strong>"+formatParameterValue(parameter,entry)+"</strong><button class=\"settings-edit\" type=\"button\" data-action=\"edit\" data-index=\""+index+"\">Modifica</button></div>";
    }).join("");
    return "<div class=\"settings-parameter\" data-parameter=\""+parameter.id+"\"><div class=\"settings-current\"><span class=\"settings-current-name\">"+parameter.name+"</span><strong class=\"settings-current-value\">"+formatParameterValue(parameter,current)+"</strong><small class=\"settings-current-date\">Dal "+formatParameterDate(current.date)+"</small></div><button class=\"settings-history-toggle\" type=\"button\" data-action=\"history\">"+(count>1?"Storico ("+count+")":"Modifica valore")+"</button><div class=\"settings-history\">"+history+"<button class=\"settings-add\" type=\"button\" data-action=\"add\">+ Aggiungi variazione</button><div class=\"settings-editor\" hidden></div></div></div>";
  }).join("");
  container.querySelectorAll("[data-action=history]").forEach(function(button){
    button.addEventListener("click",function(){button.parentElement.querySelector(".settings-history").classList.toggle("open");});
  });
  container.querySelectorAll("[data-action=edit]").forEach(function(button){
    button.addEventListener("click",function(){
      const parameter=economicParameters.find(function(item){return item.id===button.closest(".settings-parameter").dataset.parameter;});
      openParameterEditor(parameter,Number(button.dataset.index),button.closest(".settings-history"));
    });
  });
  container.querySelectorAll("[data-action=add]").forEach(function(button){
    button.addEventListener("click",function(){
      const parameter=economicParameters.find(function(item){return item.id===button.closest(".settings-parameter").dataset.parameter;});
      openParameterEditor(parameter,-1,button.closest(".settings-history"));
    });
  });
}
function openParameterEditor(parameter,index,history){
  const editor=history.querySelector(".settings-editor");
  const entry=index>=0?parameter.values[index]:{date:"",value:"",unit:parameter.unit};
  editor.hidden=false;
  editor.innerHTML="<label>Decorrenza<input type=\"date\" id=\"settingsEditDate\" value=\""+(entry.date||"")+"\"></label><label>Valore<input type=\"number\" step=\"any\" id=\"settingsEditValue\" value=\""+(entry.value!==undefined?entry.value:"")+"\"></label>"+(parameter.id==="imposta_elettrica"?"<label>Unità<input type=\"text\" id=\"settingsEditUnit\" value=\""+(entry.unit||"")+"\"></label>":"<input type=\"hidden\" id=\"settingsEditUnit\" value=\""+(entry.unit||parameter.unit)+"\">")+"<div class=\"settings-editor-actions\"><button type=\"button\" class=\"settings-save\">Salva</button><button type=\"button\" class=\"settings-cancel\">Annulla</button></div>";
  editor.querySelector(".settings-save").addEventListener("click",function(){
    const date=editor.querySelector("#settingsEditDate").value;
    const value=Number(editor.querySelector("#settingsEditValue").value);
    const unit=editor.querySelector("#settingsEditUnit").value;
    if(!date||!Number.isFinite(value)){alert("Inserisci una data e un valore validi.");return;}
    const newEntry={date:date,value:value,unit:unit||parameter.unit};
    if(index>=0)parameter.values[index]=newEntry;else parameter.values.push(newEntry);
    sortParameterValues(parameter);
    saveEconomicParameters();
    renderSettings();
    renderSavingsPage();
  });
  editor.querySelector(".settings-cancel").addEventListener("click",function(){editor.hidden=true;});
}
function renderMonthly(data){}
function renderNufri(data){}
function renderSavings(data){}

function setupNavigation(){
  document.querySelectorAll(".nav-item").forEach(button=>{
    button.addEventListener("click",event=>{
      event.preventDefault();
      const page=button.getAttribute("data-page");
      if(page==="Oggi"||page==="Storico"||page==="Risparmio"||page==="Impostazioni") setPage(page);
    });
  });

  document.querySelectorAll(".period-button").forEach(button=>{
    button.addEventListener("click",()=>renderHistory(button.dataset.period));
  });
}

setTodayDate();
setupNavigation();
$("settingsSync")?.addEventListener("click",()=>loadData());
$("settingsReset")?.addEventListener("click",()=>{if(confirm("Ripristinare i parametri iniziali dello storico?")){economicParameters=cloneEconomicParameters();saveEconomicParameters();renderSettings();renderSavingsPage();}});

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

    const produzioneOggi=Number(d.produzione_fv_kwh)||0;
    const immessoOggi=Number(d.immesso_rete_kwh)||0;
    const autoconsumoOggi=Math.max(0,produzioneOggi-immessoOggi);
    const prezzoAcquisto=getParameterEntry("energia_acquistata")?.value??0.154852;
  const prezzoImmissione=getParameterEntry("energia_immessa")?.value??0.06;
  const risparmioOggi=(autoconsumoOggi*prezzoAcquisto)+(immessoOggi*prezzoImmissione);
    $("risparmioOggi").textContent=formatEuro(risparmioOggi);
    $("lastUpdate").textContent=formatTime(d.rilevazione_at);

    storicoData=
      Array.isArray(result.mensile) ? result.mensile :
      Array.isArray(result.storico) ? result.storico :
      Array.isArray(result.storico_mensile) ? result.storico_mensile :
      [];

    renderHistory(storicoPeriodo);
    renderSavingsPage();
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