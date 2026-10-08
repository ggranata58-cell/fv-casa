const SUPABASE_FUNCTION_URL="https://bstcydrgyspgofckzybl.supabase.co/functions/v1/fv-casa-data";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_LURu7IVWMgryAlEq6upJKQ_wrTMfBJ6";

const $=id=>document.getElementById(id);

let storicoData=[];
let risparmioData=[];
let andamentoOggi=[];
let storicoPeriodo="mese";
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
  const risparmio=page==="Risparmio";
  const impostazioni=page==="Impostazioni";
  $("pageOggi").hidden=!oggi;
  $("pageStorico").hidden=!storico;
  $("pageRisparmio").hidden=!risparmio;
  $("pageImpostazioni").hidden=!impostazioni;
  document.querySelectorAll(".nav-item").forEach(button=>{
    button.classList.toggle("active",button.dataset.page===page);
  });
  if(storico) renderHistory(storicoPeriodo);
  if(risparmio) renderSavingsPage();
  if(impostazioni) renderSettings();
}

function createChart(containerId,rows,series,titleSuffix,formatter=formatNumber){
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
        <strong class="chart-value">${formatter(value)}</strong>
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

  createChart("productionChart",rows.map(row=>({label:row.label,value:row.produzione})),"chart-production","Produzione",formatKwh);

  const energyContainer=$("energyChart");

  if(rows.length){
    const max=Math.max(...rows.map(item=>Math.max(item.consumo,item.immesso,item.prelevato)),0);

    const makeBar=(value,className)=>`
      <div class="energy-chart-item">
        <span class="energy-chart-name">${className==="consumo"?"Consumo":className==="immesso"?"Immissione":"Prelievo"}</span>
        <div class="chart-track"><div class="chart-bar ${className}" style="width:${max>0?Math.max(3,(value/max)*100):3}%"></div></div>
        <strong>${formatKwh(value)}</strong>
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

function renderTodayChart(rows){
  const container=$("todayChart");
  if(!container)return;

  const valid=(Array.isArray(rows)?rows:[]).filter(row=>
    row &&
    row.rilevazione_at &&
    Number.isFinite(Number(row.produzione_fv_kw)) &&
    Number.isFinite(Number(row.consumo_casa_kw)) &&
    Number.isFinite(Number(row.prelevio_rete_kw||row.prelevato_rete_kw||row.prelievo_rete_kw))
  );

  if(!valid.length){
    container.innerHTML='<div class="chart-empty">Nessun dato disponibile per oggi</div>';
    return;
  }

  const width=760;
  const height=300;
  const left=48;
  const right=16;
  const top=24;
  const bottom=42;
  const chartWidth=width-left-right;
  const chartHeight=height-top-bottom;

  const getImport=row=>Number(row.prelevio_rete_kw||row.prelevato_rete_kw||row.prelievo_rete_kw)||0;
  const values=[];
  valid.forEach(row=>{
    values.push(Number(row.produzione_fv_kw)||0,Number(row.consumo_casa_kw)||0,getImport(row));
  });

  const maxValue=Math.max(...values,0);
  const yMax=maxValue>0?Math.ceil(maxValue*1.1*10)/10:1;

  const x=index=>valid.length===1
    ? left+chartWidth/2
    : left+(index/(valid.length-1))*chartWidth;

  const y=value=>top+chartHeight-(Math.max(0,Number(value))/yMax)*chartHeight;

  const pathFor=key=>valid.map((row,index)=>{
    const value=key==="prelievo_rete_kw"?getImport(row):Number(row[key])||0;
    return (index===0?"M":"L")+x(index).toFixed(2)+" "+y(value).toFixed(2);
  }).join(" ");

  const grid=[];
  for(let n=0;n<=4;n++){
    const value=(yMax/4)*n;
    const yy=y(value);
    grid.push('<line x1="'+left+'" y1="'+yy+'" x2="'+(width-right)+'" y2="'+yy+'" class="today-chart-grid"></line>');
    grid.push('<text x="'+(left-8)+'" y="'+(yy+4)+'" text-anchor="end" class="today-chart-axis">'+formatNumber(value,1)+'</text>');
  }

  const labels=[];
  const labelCount=Math.min(6,valid.length);
  for(let n=0;n<labelCount;n++){
    const index=labelCount===1?0:Math.round((n/(labelCount-1))*(valid.length-1));
    labels.push('<text x="'+x(index)+'" y="'+(height-14)+'" text-anchor="middle" class="today-chart-axis">'+formatTime(valid[index].rilevazione_at).slice(0,5)+'</text>');
  }

  container.innerHTML=
    '<div class="today-chart-legend">'+
      '<span><i class="legend-production"></i>Produzione</span>'+
      '<span><i class="legend-consumption"></i>Consumo</span>'+
      '<span><i class="legend-import"></i>Prelievo</span>'+
    '</div>'+
    '<div class="today-chart-wrap">'+
      '<svg class="today-chart-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Andamento di oggi">'+
        grid.join("")+
        labels.join("")+
        '<path d="'+pathFor("produzione_fv_kw")+'" class="today-line production"></path>'+
        '<path d="'+pathFor("consumo_casa_kw")+'" class="today-line consumption"></path>'+
        '<path d="'+pathFor("prelievo_rete_kw")+'" class="today-line import"></path>'+
      '</svg>'+
    '</div>';
}

function renderSavingsPage(){
  const produzioneOggi=Number($("produzioneKwh").textContent.replace(",", "."))||0;
  const immessoOggi=Number($("immessoKwh").textContent.replace(",", "."))||0;
  const autoconsumoOggi=Math.max(0,produzioneOggi-immessoOggi);
  const prezzoAcquisto=getParameterEntry("energia_acquistata")?.value??0.154852;
    const prezzoImmissione=getParameterEntry("energia_immessa")?.value??0.06;
    const risparmioOggi=(autoconsumoOggi*prezzoAcquisto)+(immessoOggi*prezzoImmissione);

  $("pageRisparmioOggi").textContent=formatEuro(risparmioOggi);

  const corrente=risparmioData.length?risparmioData[0]:null;
  if(corrente){
    const meseDisponibile=formatMonth(corrente.mese);
    $("pageRisparmioMese").previousElementSibling.textContent="Ultimo mese disponibile: "+meseDisponibile;
    $("pageRisparmioMese").textContent=formatEuro(corrente.risparmio_fv);
    const risparmioFvCumulato=risparmioData.reduce((totale,row)=>totale+(Number(row.risparmio_fv)||0),0);
    const risultatoNetto=Number(corrente.risparmio_netto_cumulato)||0;
    const rateFinanziamento=risparmioFvCumulato-risultatoNetto;
    $("pageRisparmioCumulato").textContent=formatEuro(risparmioFvCumulato);
    $("pageRisparmioRate").textContent=formatEuro(rateFinanziamento);
    $("pageRisparmioNetto").textContent=formatEuro(risultatoNetto);
  }

  const trend=[...risparmioData].sort((a,b)=>new Date(a.mese+"T00:00:00")-new Date(b.mese+"T00:00:00"));
  const trendContainer=$("savingsTrend");
  if(trend.length){
    const max=Math.max(...trend.map(row=>Number(row.risparmio_fv)||0),0);
    trendContainer.innerHTML=trend.map(row=>{
      const value=Number(row.risparmio_fv)||0;
      const width=max>0?Math.max(3,(value/max)*100):3;
      return '<div class="chart-row"><span class="chart-label">'+formatMonth(row.mese)+'</span><div class="chart-track"><div class="chart-bar savings" style="width:'+width+'%"></div></div><strong class="chart-value">'+formatEuro(value)+'</strong></div>';
    }).join("");
  }

  const energyMonth=storicoData.find(row=>corrente&&String(row.mese)===String(corrente.mese));
  const breakdown=$("savingsBreakdown");
  if(corrente){
    const meseRisparmio=formatMonth(corrente.mese);
    const costoSenza=Number(corrente.costo_senza_fv)||0;
    const costoCon=Number(corrente.costo_con_fv)||0;
    const risparmio=Number(corrente.risparmio_fv)||0;
    const produzione=energyMonth?Number(energyMonth.produzione_fv_kwh)||0:0;
    const immesso=energyMonth?Number(energyMonth.immesso_rete_kwh)||0:0;

    breakdown.innerHTML=
      '<div class="breakdown-month">'+meseRisparmio+' — ultimo mese disponibile</div>'+
      '<div class="breakdown-row"><span>Costo senza impianto FV</span><strong></strong><em>'+formatEuro(costoSenza)+'</em></div>'+
      '<div class="breakdown-row"><span>Costo effettivo con impianto FV</span><strong></strong><em>'+formatEuro(costoCon)+'</em></div>'+
      '<div class="breakdown-total"><span>Risparmio FV</span><strong></strong><strong>'+formatEuro(risparmio)+'</strong></div>';
  }
}


function renderSettings(){
  const lastUpdate=$("lastUpdate")?.textContent||"—";
  $("settingsLastUpdate").textContent=lastUpdate;
  const container=$("economicSettings"); if(!container)return;
  container.innerHTML=economicParameters.map(function(parameter){
    sortParameterValues(parameter); const current=parameter.values[parameter.values.length-1]; const count=parameter.values.length;
    const history=parameter.values.map(function(entry,index){
      return '<div class="settings-history-row"><span>'+formatParameterDate(entry.date)+'</span><strong>'+formatParameterValue(parameter,entry)+'</strong><button class="settings-edit" type="button" data-action="edit" data-index="'+index+'">Modifica</button>'+(count>1?'<button class="settings-delete" type="button" data-action="delete" data-index="'+index+'">Elimina</button>':'')+'</div>';
    }).join("");
    return '<div class="settings-parameter" data-parameter="'+parameter.id+'"><div class="settings-current"><span class="settings-current-name">'+parameter.name+'</span><strong class="settings-current-value">'+formatParameterValue(parameter,current)+'</strong><small class="settings-current-date">Dal '+formatParameterDate(current.date)+'</small></div><button class="settings-history-toggle" type="button" data-action="history">'+(count>1?"Storico ("+count+")":"Modifica valore")+'</button><div class="settings-history">'+history+'<button class="settings-add" type="button" data-action="add">+ Aggiungi variazione</button><div class="settings-editor" hidden></div></div></div>';
  }).join("");
  container.querySelectorAll("[data-action=history]").forEach(function(button){button.addEventListener("click",function(){button.parentElement.querySelector(".settings-history").classList.toggle("open");});});
  container.querySelectorAll("[data-action=edit]").forEach(function(button){button.addEventListener("click",function(){const parameter=economicParameters.find(function(item){return item.id===button.closest(".settings-parameter").dataset.parameter;});openParameterEditor(parameter,Number(button.dataset.index),button.closest(".settings-history"));});});
  container.querySelectorAll("[data-action=add]").forEach(function(button){button.addEventListener("click",function(){const parameter=economicParameters.find(function(item){return item.id===button.closest(".settings-parameter").dataset.parameter;});openParameterEditor(parameter,-1,button.closest(".settings-history"));});});
  container.querySelectorAll("[data-action=delete]").forEach(function(button){button.addEventListener("click",function(){const parameter=economicParameters.find(function(item){return item.id===button.closest(".settings-parameter").dataset.parameter;});const index=Number(button.dataset.index);if(!parameter||parameter.values.length<=1)return;if(!confirm("Eliminare questa variazione dello storico?"))return;parameter.values.splice(index,1);sortParameterValues(parameter);saveEconomicParameters();renderSettings();renderSavingsPage();});});
}
function openParameterEditor(parameter,index,history){
  const editor=history.querySelector(".settings-editor"); const entry=index>=0?parameter.values[index]:{date:"",value:"",unit:parameter.unit}; editor.hidden=false;
  editor.innerHTML='<label>Decorrenza<input type="date" id="settingsEditDate" value="'+(entry.date||"")+'"></label><label>Valore<input type="number" step="any" id="settingsEditValue" value="'+(entry.value!==undefined?entry.value:"")+'"></label>'+(parameter.id==="imposta_elettrica"?'<label>Unità<input type="text" id="settingsEditUnit" value="'+(entry.unit||"")+'"></label>':'<input type="hidden" id="settingsEditUnit" value="'+(entry.unit||parameter.unit)+'">')+'<div class="settings-editor-actions"><button type="button" class="settings-save">Salva</button><button type="button" class="settings-cancel">Annulla</button></div>';
  editor.querySelector(".settings-save").addEventListener("click",function(){
    const date=editor.querySelector("#settingsEditDate").value; const value=Number(editor.querySelector("#settingsEditValue").value); const unit=editor.querySelector("#settingsEditUnit").value;
    if(!date||!Number.isFinite(value)){alert("Inserisci una data e un valore validi.");return;}
    const newEntry={date:date,value:value,unit:unit||parameter.unit}; if(index>=0)parameter.values[index]=newEntry;else parameter.values.push(newEntry);
    sortParameterValues(parameter);saveEconomicParameters();renderSettings();renderSavingsPage();
  });
  editor.querySelector(".settings-cancel").addEventListener("click",function(){editor.hidden=true;history.classList.remove("open");});
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

    andamentoOggi=Array.isArray(result.andamento_oggi)?result.andamento_oggi:[];
    renderTodayChart(andamentoOggi);

    const produzioneOggi=Number(d.produzione_fv_kwh)||0;
    const immessoOggi=Number(d.immesso_rete_kwh)||0;
    const autoconsumoOggi=Math.max(0,produzioneOggi-immessoOggi);
    const prezzoAcquisto=getParameterEntry("energia_acquistata")?.value??0.154852;
    const prezzoImmissione=getParameterEntry("energia_immessa")?.value??0.06;
    const risparmioOggi=(autoconsumoOggi*prezzoAcquisto)+(immessoOggi*prezzoImmissione);
    $("lastUpdate").textContent=formatTime(d.rilevazione_at);

    storicoData=
      Array.isArray(result.mensile) ? result.mensile :
      Array.isArray(result.storico) ? result.storico :
      Array.isArray(result.storico_mensile) ? result.storico_mensile :
      [];

    risparmioData=
      Array.isArray(result.risparmio_mensile) ? result.risparmio_mensile :
      Array.isArray(result.risparmio) ? result.risparmio :
      Array.isArray(result.risparmioData) ? result.risparmioData :
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