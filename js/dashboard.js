// ── PATRIMÔNIO ─────────────────────────────────────
function togglePatEdit(){
  const ed=$('pat-edit');
  ed.classList.toggle('open');
  if(ed.classList.contains('open'))$('pat-input').value=S.patrimonio||'';
}
function savePat(){
  S.patrimonio=parseValor($('pat-input').value);
  save();$('pat-edit').classList.remove('open');renderDash();
}

// ── VISÃO GERAL ────────────────────────────────────
let dashPie=null,dashEvo=null;
function comparar(v,ant){
  if(!ant)return 'sem dados no mês anterior';
  const p=Math.round((v-ant)/ant*100);
  return(p>0?'▲ ':p<0?'▼ ':'')+Math.abs(p)+'% vs mês anterior';
}
function renderDash(){
  const list=lancamentos(mesAtual,mesAtual),t=totais(list);
  const mAnt=addMonths(mesAtual,-1),ant=totais(lancamentos(mAnt,mAnt));
  setText('d-rec',fmt(t.rec));setText('d-rec-sub',comparar(t.rec,ant.rec));
  setText('d-gas',fmt(t.gas));setText('d-gas-sub',comparar(t.gas,ant.gas));
  setSaldo('d-sal',t.saldo);
  setText('d-sal-label','Resultado de '+MESES_LONGO[+mesAtual.slice(5)-1]);
  setText('d-inv-label','Investido em '+MESES_LONGO[+mesAtual.slice(5)-1]);
  setText('d-inv',fmt(t.inv));
  const taxa=t.rec&&t.inv?Math.round(t.inv/t.rec*100)+'% das receitas · ':'';
  setText('d-inv-sub',taxa+fmt(investidoAte(mesAtual))+' no total');
  // Separa o que sobrou do mês passado do que foi ganho neste mês.
  const sobra=sobraDoMes(mesAtual);
  setText('d-ant-label',mesAtual===mesInicial()?'Saldo inicial':'Sobrou de '+MESES_LONGO[+mAnt.slice(5)-1]);
  if(sobra===null){
    setText('d-ant','—');setText('d-conta','—');
    $('d-ant').classList.remove('pos','neg');$('d-conta').classList.remove('pos','neg');
    setText('d-conta-sub','antes do saldo inicial (veja Ajustes)');
  }else{
    setSaldo('d-ant',sobra);setSaldo('d-conta',saldoEmConta(mesAtual));
    setText('d-conta-sub',mesAtual===thisMonth?'previsto para o fim do mês':'no fim de '+monthLabel(mesAtual,true));
  }
  setText('d-pat',fmt(S.patrimonio||0));
  renderDashPie(list,t.gas);
  renderOrcamentos(list);
  renderMetas(list);
  renderDashEvo();
  $('d-ultimos').innerHTML=list.length?list.slice(0,5).map(txRow(false)).join(''):`<div class="empty">Nenhum lançamento em ${monthLabel(mesAtual,true)}.</div>`;
}
function renderDashPie(list,totalGas){
  const cats=porCategoria(list);
  if(dashPie){dashPie.destroy();dashPie=null}
  $('d-pie-box').style.display=cats.length?'':'none';
  if(!cats.length){$('d-pie-legend').innerHTML='<div class="empty">Nenhum gasto neste mês.</div>';return}
  dashPie=new Chart($('d-pie'),{type:'doughnut',
    data:{labels:cats.map(c=>c.cat),datasets:[{data:cats.map(c=>c.val),backgroundColor:cats.map(c=>corCategoria(c.cat)),borderWidth:0}]},
    options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.label+': '+fmt(c.raw)}}}}});
  $('d-pie-legend').innerHTML=cats.map(c=>`<div class="legend-row"><span class="dot" style="background:${corCategoria(c.cat)}"></span>${esc(c.cat)}
    <span class="hint">${Math.round(c.val/totalGas*100)}%</span><span class="val">${fmt(c.val)}</span></div>`).join('');
}
function renderOrcamentos(list){
  const gasto={};porCategoria(list).forEach(c=>gasto[c.cat]=c.val);
  const cats=S.categorias.filter(c=>S.orcamentos[c]>0);
  $('d-orc').innerHTML=cats.length?cats.map(c=>{
    const g=gasto[c]||0,o=S.orcamentos[c],p=g/o*100;
    return`<div class="orc">
      <div class="orc-head"><span><span class="dot" style="background:${corCategoria(c)}"></span> ${esc(c)}</span><span>${fmt(g)} <span class="hint">de ${fmt(o)}</span></span></div>
      <div class="prog-bar"><div class="prog-fill ${p>100?'rd':p>=80?'am':''}" style="width:${Math.min(p,100)}%"></div></div>
      <div class="orc-sub ${p>100?'neg':''}">${p>100?'Passou '+fmt(g-o):'Resta '+fmt(o-g)}</div>
    </div>`}).join('')
    :`<div class="empty">Nenhum orçamento definido. <a href="#" onclick="go('aju');return false">Definir em Ajustes</a></div>`;
}
// Ao contrário do orçamento, aqui chegar a 100% é o objetivo.
function renderMetas(list){
  const feito={};porCategoria(list,'investimento').forEach(c=>feito[c.cat]=c.val);
  const cats=S.categoriasInvestimento.filter(c=>S.metasInvestimento[c]>0);
  $('d-metas').innerHTML=cats.length?`<hr class="divider"><div class="card-title">Metas de investimento</div>`+cats.map(c=>{
    const v=feito[c]||0,o=S.metasInvestimento[c];
    return`<div class="orc">
      <div class="orc-head"><span><span class="dot" style="background:${corCategoria(c,'investimento')}"></span> ${esc(c)}</span><span>${fmt(v)} <span class="hint">de ${fmt(o)}</span></span></div>
      <div class="prog-bar"><div class="prog-fill inv" style="width:${Math.min(v/o*100,100)}%"></div></div>
      <div class="orc-sub">${v>=o?'Meta atingida':'Faltam '+fmt(o-v)}</div>
    </div>`}).join(''):'';
}
function renderDashEvo(){
  const meses=monthRange(addMonths(mesAtual,-5),mesAtual);
  const mensal=porMes(lancamentos(meses[0],mesAtual),meses);
  if(dashEvo)dashEvo.destroy();
  dashEvo=new Chart($('d-evo'),cfgMensal(mensal));
}
