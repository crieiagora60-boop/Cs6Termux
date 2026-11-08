const $ = s => document.querySelector(s);
const notice = (msg, bad=false) => { $("#notice").textContent=msg; $("#notice").className="notice"+(bad?" error":""); };
async function api(url, opts={}) {
  const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"Falha na solicitação");
  return d;
}
async function loadMachines(){
  try{
    const rows=await api("/api/instances");
    $("#count").textContent=rows.length;
    $("#running").textContent=rows.filter(x=>x.status==="active"||x.status==="running").length;
    $("#ips").textContent=rows.filter(x=>x.main_ip && x.main_ip!=="0.0.0.0").length;
    $("#machines").innerHTML=rows.length?rows.map(x=>`<div class="machine">
      <div><b>▣ ${esc(x.label||"cloud-pc")}</b><small>${esc(x.os||"sistema não informado")}</small></div>
      <div><small>IP público</small><b>${esc(x.main_ip||"aguardando…")}</b></div>
      <div><small>estado</small><b class="status">${esc(x.status||"desconhecido")}</b></div>
      <div class="actions"><button data-action="reboot" data-id="${esc(x.id)}">reiniciar</button><button data-action="${x.status==="active"?"halt":"start"}" data-id="${esc(x.id)}">${x.status==="active"?"desligar":"ligar"}</button><button data-action="delete" data-id="${esc(x.id)}">excluir</button></div>
    </div>`).join(""):'<div class="empty">nenhum PC criado ainda. sua nuvem está bem vazia.</div>';
    notice("conectado ao painel de máquinas.");
  }catch(e){notice(e.message,true);$("#machines").innerHTML='<div class="empty">não foi possível carregar as máquinas.</div>';}
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadOptions(){
  try{
    const [os,regions]=await Promise.all([api("/api/os"),api("/api/regions")]);
    $("#os").innerHTML='<option value="">selecione</option>'+os.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
    $("#region").innerHTML='<option value="">selecione</option>'+regions.map(x=>`<option value="${esc(x.id)}">${esc(x.city)}, ${esc(x.country)} (${esc(x.id)})</option>`).join("");
  }catch(e){$("#formError").textContent=e.message;}
}
async function loadPlans(){
  const region=$("#region").value;
  $("#plan").innerHTML='<option value="">carregando…</option>';
  if(!region)return;
  try{
    const plans=await api("/api/plans?region="+encodeURIComponent(region));
    $("#plan").innerHTML='<option value="">selecione</option>'+plans.map(p=>`<option value="${esc(p.id)}">${esc(p.id)} · ${p.vcpu} vCPU · ${Math.round(p.ram/1024)} GB RAM · US$ ${p.monthly}/mês</option>`).join("");
  }catch(e){$("#plan").innerHTML='<option value="">erro ao carregar planos</option>';$("#formError").textContent=e.message;}
}
$("#newBtn").onclick=()=>{$("#createDialog").showModal();loadOptions();};
$("#close").onclick=()=>$("#createDialog").close();
$("#refresh").onclick=loadMachines;
$("#region").onchange=loadPlans;
$("#createForm").onsubmit=async e=>{
  e.preventDefault();$("#formError").textContent="";
  const data=Object.fromEntries(new FormData(e.target));
  if(!confirm("isso cria uma máquina real e pode gerar cobranças. você tem autorização do responsável pela conta?"))return;
  try{
    const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="criando…";
    await api("/api/instances",{method:"POST",body:JSON.stringify(data)});
    $("#createDialog").close();e.target.reset();await loadMachines();
  }catch(err){$("#formError").textContent=err.message;}
  finally{const btn=e.target.querySelector('button[type="submit"]');btn.disabled=false;btn.textContent="criar máquina virtual";}
};
$("#machines").onclick=async e=>{
  const b=e.target.closest("button[data-action]");if(!b)return;
  const {id,action}=b.dataset;
  if(action==="delete"&&!confirm("excluir esta máquina? a ação não pode ser desfeita."))return;
  try{
    if(action==="delete")await api("/api/instances/"+id,{method:"DELETE"});
    else await api(`/api/instances/${id}/${action}`,{method:"POST"});
    await loadMachines();
  }catch(err){notice(err.message,true);}
};
(async()=>{try{const s=await api("/api/status");if(!s.configured)notice("configure o token da Vultr no backend (.env) para conectar.",true);}catch{}await loadMachines();})();
