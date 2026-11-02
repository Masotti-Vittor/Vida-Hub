// ── LANÇAMENTOS ────────────────────────────────────
// Avulsos ficam em S.receitas / S.gastos / S.investimentos. Fixos ficam em
// S.recorrentes e aparecem em todo mês entre inicio e fim (fim null = sem data para acabar).
// Investir não é gastar: não conta em Gastos, mas o dinheiro sai da conta.
let mesAtual=thisMonth;
let tipoForm='gasto';
let editando=null; // {tipo,id,fixo}

const CHAVE_LISTA={receita:'receitas',gasto:'gastos',investimento:'investimentos'};
const listaDo=tipo=>S[CHAVE_LISTA[tipo]];
const categoriasDo=tipo=>tipo==='receita'?S.categoriasReceita:tipo==='investimento'?S.categoriasInvestimento:S.categorias;
const sinalDo=tipo=>({receita:'+',gasto:'−',investimento:'↗'}[tipo]);
const classeDo=tipo=>({receita:'pos',gasto:'neg',investimento:'inv'}[tipo]);
const recorrenteAtivo=(r,m)=>r.inicio<=m&&(!r.fim||m<=r.fim);

// Todos os lançamentos entre dois meses (inclusive), do mais novo para o mais antigo.
function lancamentos(de,ate){
  const out=[];
  Object.keys(CHAVE_LISTA).forEach(tipo=>listaDo(tipo).forEach(l=>{const m=l.data.slice(0,7);if(m>=de&&m<=ate)out.push({...l,tipo})}));
  const meses=monthRange(de,ate);
  S.recorrentes.forEach(r=>meses.forEach(m=>{
    if(recorrenteAtivo(r,m))out.push({id:r.id,tipo:r.tipo,desc:r.desc,val:r.val,cat:r.cat,data:m+'-'+pad(Math.min(r.dia,daysInMonth(m))),fixo:true});
  }));
  return out.sort((a,b)=>b.data.localeCompare(a.data));
}
function totais(list){
  let rec=0,gas=0,inv=0;
  list.forEach(l=>{if(l.tipo==='receita')rec+=l.val;else if(l.tipo==='investimento')inv+=l.val;else gas+=l.val});
  rec=Math.round(rec*100)/100;gas=Math.round(gas*100)/100;inv=Math.round(inv*100)/100;
  return{rec,gas,inv,saldo:Math.round((rec-gas)*100)/100};
}
// [{cat,val}] do maior para o menor
function porCategoria(list,tipo='gasto'){
  const m={};
  list.forEach(l=>{if(l.tipo===tipo)m[l.cat]=(m[l.cat]||0)+l.val});
  return Object.entries(m).map(([cat,val])=>({cat,val:Math.round(val*100)/100})).sort((a,b)=>b.val-a.val);
}
// [{m,rec,gas,inv,saldo}] um por mês, inclusive meses sem lançamento
function porMes(list,meses){return meses.map(m=>({m,...totais(list.filter(l=>l.data.startsWith(m)))}))}
// ── SALDO EM CONTA ─────────────────────────────────
// Resultado do mês = receitas − gastos daquele mês (o que você ganhou/perdeu).
// Saldo em conta = saldo inicial + resultados − investimentos de todos os meses desde o saldo inicial.
function primeiroMes(){
  const ms=[...S.receitas,...S.gastos,...S.investimentos].map(l=>l.data.slice(0,7)).concat(S.recorrentes.map(r=>r.inicio));
  return ms.length?ms.reduce((a,b)=>a<b?a:b):thisMonth;
}
function mesInicial(){return S.saldoInicial.mes||primeiroMes()}
// Dinheiro em conta no fim do mês m (null antes do saldo inicial).
function saldoEmConta(m){
  const ini=mesInicial();
  if(m<ini)return null;
  const t=totais(lancamentos(ini,m));
  return Math.round((S.saldoInicial.valor+t.saldo-t.inv)*100)/100;
}
// Tudo o que já foi investido até o fim do mês m. Não depende do saldo inicial.
const investidoAte=m=>totais(lancamentos(primeiroMes(),m)).inv;
// O que sobrou do mês anterior e entrou no mês m.
function sobraDoMes(m){
  const ini=mesInicial();
  if(m<ini)return null;
  return m===ini?S.saldoInicial.valor:saldoEmConta(addMonths(m,-1));
}
function corCategoria(cat,tipo='gasto'){
  const i=categoriasDo(tipo).indexOf(cat);
  if(i<0)return'#999';
  return corDe(tipo==='investimento'?i+3:i); // a primeira de investimento fica azul, como os valores
}

// ── MÊS ────────────────────────────────────────────
function mudarMes(k){mesAtual=addMonths(mesAtual,k);if(!editando)$('lf-data').value=dataPadrao();render()}
function irHoje(){mesAtual=thisMonth;if(!editando)$('lf-data').value=dataPadrao();render()}
const dataPadrao=()=>mesAtual===thisMonth?todayKey:mesAtual+'-01';

// ── FORMULÁRIO ─────────────────────────────────────
function fillCatSelect(sel,cats,primeira){
  const cur=sel.value;
  sel.innerHTML=(primeira?`<option value="">${primeira}</option>`:'')+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if([...sel.options].some(o=>o.value===cur))sel.value=cur;
}
function setTipo(t){
  tipoForm=t;
  $('lf-tipo-gasto').classList.toggle('active',t==='gasto');
  $('lf-tipo-receita').classList.toggle('active',t==='receita');
  $('lf-tipo-investimento').classList.toggle('active',t==='investimento');
  $('lf-desc').placeholder={gasto:'Ex: Mercado do mês',receita:'Ex: Salário',investimento:'Ex: Tesouro Selic'}[t];
  fillCatSelect($('lf-cat'),categoriasDo(t));
}
function resetForm(){
  editando=null;
  $('lf-desc').value='';$('lf-val').value='';
  $('lf-data').value=dataPadrao();
  $('lf-fixo').checked=false;
  $('lf-fixo-wrap').style.display='';
  setText('lf-nota','');setText('lf-erro','');
  setText('lf-title','Novo lançamento');
  setText('lf-submit','+ Adicionar');
  $('lf-cancel').style.display='none';
  document.querySelectorAll('#lanc-form .seg-btn').forEach(b=>b.disabled=false);
  fillCatSelect($('lf-cat'),categoriasDo(tipoForm));
}
function salvarLanc(){
  const desc=$('lf-desc').value.trim(),val=parseValor($('lf-val').value),cat=$('lf-cat').value,data=$('lf-data').value;
  const erro=t=>setText('lf-erro',t);
  if(!desc)return erro('Informe a descrição.');
  if(!(val>0))return erro('Informe um valor maior que zero.');
  if(!cat)return erro('Escolha uma categoria (crie uma em Ajustes).');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data))return erro('Informe a data.');
  const fixoEditado=editando&&editando.fixo;
  if(editando){
    if(editando.fixo){const r=S.recorrentes.find(r=>r.id===editando.id);if(r)Object.assign(r,{desc,val,cat,dia:+data.slice(8)})}
    else{const l=listaDo(editando.tipo).find(l=>l.id===editando.id);if(l)Object.assign(l,{desc,val,cat,data})}
  }else if($('lf-fixo').checked){
    S.recorrentes.push({id:uid(),tipo:tipoForm,desc,val,cat,dia:+data.slice(8),inicio:data.slice(0,7),fim:null});
  }else{
    listaDo(tipoForm).push({id:uid(),desc,val,cat,data});
  }
  // Mostra o mês do lançamento, para ele não "sumir" quando a data é de outro mês.
  if(!fixoEditado)mesAtual=data.slice(0,7);
  save();resetForm();render();
  $('lf-desc').focus();
}
function editarLanc(tipo,id,fixo){
  const l=fixo?S.recorrentes.find(r=>r.id===id):listaDo(tipo).find(l=>l.id===id);
  if(!l)return;
  setTipo(tipo);
  editando={tipo,id,fixo};
  $('lf-desc').value=l.desc;
  $('lf-val').value=l.val;
  const sel=$('lf-cat');
  if(![...sel.options].some(o=>o.value===l.cat))sel.insertAdjacentHTML('beforeend',`<option value="${esc(l.cat)}">${esc(l.cat)}</option>`);
  sel.value=l.cat;
  $('lf-data').value=fixo?mesAtual+'-'+pad(Math.min(l.dia,daysInMonth(mesAtual))):l.data;
  $('lf-fixo-wrap').style.display='none';
  setText('lf-nota',fixo?'Lançamento fixo: a alteração vale para todos os meses.':'');
  setText('lf-erro','');
  setText('lf-title','Editar lançamento');
  setText('lf-submit','Salvar');
  $('lf-cancel').style.display='';
  document.querySelectorAll('#lanc-form .seg-btn').forEach(b=>b.disabled=true);
  $('lanc-form').scrollIntoView({behavior:'smooth',block:'start'});
  $('lf-desc').focus();
}
function excluirLanc(tipo,id,fixo,data){
  if(fixo){
    const r=S.recorrentes.find(r=>r.id===id);if(!r)return;
    const m=data.slice(0,7);
    if(!confirm(`"${r.desc}" é um lançamento fixo.\nEncerrar a partir de ${monthLabel(m,true)}? Os meses anteriores continuam.`))return;
    const fim=addMonths(m,-1);
    if(fim<r.inicio)S.recorrentes=S.recorrentes.filter(x=>x!==r);else r.fim=fim;
  }else{
    if(!confirm('Excluir este lançamento?'))return;
    S[CHAVE_LISTA[tipo]]=listaDo(tipo).filter(l=>l.id!==id);
  }
  if(editando&&editando.id===id)resetForm();
  save();render();
}

// ── LISTA ──────────────────────────────────────────
function txRow(acoes){
  return l=>`<div class="tx">
    <span class="tx-date">${fmtDate(l.data)}</span>
    <div class="tx-main">
      <div class="tx-desc">${esc(l.desc)}${l.fixo?'<span class="tag"><i class="ti ti-repeat"></i> fixo</span>':''}</div>
      <div class="tx-cat"><span class="dot" style="background:${corCategoria(l.cat,l.tipo)}"></span>${esc(l.cat)}</div>
    </div>
    <span class="tx-val ${classeDo(l.tipo)}">${sinalDo(l.tipo)} ${fmt(l.val)}</span>
    ${acoes?`<span class="tx-actions">
      <button class="btn-icon" title="Editar" onclick="editarLanc('${l.tipo}','${l.id}',${!!l.fixo})"><i class="ti ti-pencil"></i></button>
      <button class="btn-icon" title="Excluir" onclick="excluirLanc('${l.tipo}','${l.id}',${!!l.fixo},'${l.data}')"><i class="ti ti-trash"></i></button>
    </span>`:''}
  </div>`;
}
function renderLanc(){
  const list=lancamentos(mesAtual,mesAtual),t=totais(list);
  setText('l-rec',fmt(t.rec));setText('l-gas',fmt(t.gas));setText('l-inv',fmt(t.inv));setSaldo('l-sal',t.saldo);
  fillCatSelect($('lf-cat'),categoriasDo(tipoForm));
  const selCat=$('l-f-cat');
  fillCatSelect(selCat,[...new Set([...S.categorias,...S.categoriasReceita,...S.categoriasInvestimento])],'Todas as categorias');
  const ft=$('l-f-tipo').value,fc=selCat.value,fb=$('l-f-busca').value.trim().toLowerCase();
  const vis=list.filter(l=>(ft==='todos'||l.tipo===ft)&&(!fc||l.cat===fc)&&(!fb||l.desc.toLowerCase().includes(fb)));
  const el=$('lanc-list');
  if(!list.length){el.innerHTML=`<div class="empty">Nenhum lançamento em ${monthLabel(mesAtual,true)}.</div>`;return}
  if(!vis.length){el.innerHTML='<div class="empty">Nenhum lançamento com esses filtros.</div>';return}
  const tv=totais(vis);
  el.innerHTML=vis.map(txRow(true)).join('')+
    `<div class="tx-foot">${vis.length} lançamento${vis.length>1?'s':''} · receitas ${fmt(tv.rec)} · gastos ${fmt(tv.gas)}${tv.inv?' · investido '+fmt(tv.inv):''}</div>`;
}
