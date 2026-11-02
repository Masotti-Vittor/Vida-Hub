// ── RELATÓRIOS ─────────────────────────────────────
// O PDF usa o "Salvar como PDF" do navegador: monta #report, troca os gráficos
// por imagens (imprimem nítidas) e chama window.print(). Sem biblioteca, sem servidor.
let relCat=null,relMes=null;

// Seletor de mês com dois <select> (o input type="month" não funciona em todo navegador).
function initMonthPicker(id,onchange='renderRel()'){
  const anos=[S.receitas,S.gastos,S.investimentos].flat().map(l=>+l.data.slice(0,4)).concat(S.recorrentes.map(r=>+r.inicio.slice(0,4)));
  const ano=today.getFullYear(),min=Math.min(ano-5,...anos),max=ano+1;
  const anoOpts=[];for(let y=max;y>=min;y--)anoOpts.push(`<option value="${y}">${y}</option>`);
  $(id).innerHTML=`<select data-part="m" onchange="${onchange}" aria-label="Mês">${MESES_LONGO.map((n,i)=>`<option value="${pad(i+1)}">${n}</option>`).join('')}</select>
    <select data-part="y" onchange="${onchange}" aria-label="Ano">${anoOpts.join('')}</select>`;
}
const getMes=id=>$(id).querySelector('[data-part=y]').value+'-'+$(id).querySelector('[data-part=m]').value;
function setMes(id,m){$(id).querySelector('[data-part=y]').value=m.slice(0,4);$(id).querySelector('[data-part=m]').value=m.slice(5)}

function atalhoPeriodo(tipo){
  const de={mes:thisMonth,'3m':addMonths(thisMonth,-2),'6m':addMonths(thisMonth,-5),ano:thisMonth.slice(0,4)+'-01'}[tipo];
  setMes('r-de',de);setMes('r-ate',thisMonth);renderRel();
}
function periodoRel(){
  const de=getMes('r-de'),ate=getMes('r-ate');
  if(de>ate){setText('r-erro','O mês inicial é depois do mês final.');return null}
  setText('r-erro','');
  return{de,ate,meses:monthRange(de,ate)};
}
function dadosRel(p){
  const list=lancamentos(p.de,p.ate),t=totais(list);
  return{list,t,cats:porCategoria(list),recCats:porCategoria(list,'receita'),invCats:porCategoria(list,'investimento'),mensal:porMes(list,p.meses),media:t.gas/p.meses.length};
}

// ── GRÁFICOS (tela e PDF usam a mesma configuração) ─
function cfgCategorias(cats,tipo='gasto'){
  return{type:'bar',
    data:{labels:cats.map(c=>c.cat),datasets:[{data:cats.map(c=>c.val),backgroundColor:cats.map(c=>corCategoria(c.cat,tipo)),borderRadius:4}]},
    options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fmt(c.raw)}}},
      scales:{x:{beginAtZero:true,ticks:{callback:fmtEixo}}}}};
}
function cfgMensal(mensal){
  return{type:'bar',
    data:{labels:mensal.map(x=>monthLabel(x.m)),datasets:[
      {label:'Receitas',data:mensal.map(x=>x.rec),backgroundColor:'#1D9E75',borderRadius:4},
      {label:'Gastos',data:mensal.map(x=>x.gas),backgroundColor:'#E24B4A',borderRadius:4},
      ...(mensal.some(x=>x.inv>0)?[{label:'Investimentos',data:mensal.map(x=>x.inv),backgroundColor:'#378ADD',borderRadius:4}]:[])]},
    options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10}},tooltip:{callbacks:{label:c=>' '+c.dataset.label+': '+fmt(c.raw)}}},
      scales:{y:{beginAtZero:true,ticks:{callback:fmtEixo}}}}};
}
const alturaCategorias=n=>Math.max(160,34*n+50);
// Desenha o gráfico fora da tela, em cores claras, e devolve um PNG.
function graficoImagem(cfg,w,h){
  const c=document.createElement('canvas');
  c.width=w;c.height=h;c.style.cssText=`position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px`;
  document.body.appendChild(c);
  const cor=Chart.defaults.color,borda=Chart.defaults.borderColor;
  Chart.defaults.color='#333';Chart.defaults.borderColor='#e5e5e5';
  const ch=new Chart(c,{...cfg,options:{...cfg.options,responsive:false,animation:false,devicePixelRatio:2}});
  const url=ch.toBase64Image();
  ch.destroy();c.remove();
  Chart.defaults.color=cor;Chart.defaults.borderColor=borda;
  return url;
}

// ── TABELAS (tela e PDF) ───────────────────────────
function tabelaCategorias(cats,total,nMeses,tipo='gasto'){
  return`<table class="tbl"><thead><tr><th>Categoria</th><th class="num">Total</th><th class="num">%</th><th class="num">Média/mês</th></tr></thead><tbody>
    ${cats.map(c=>`<tr><td><span class="dot" style="background:${corCategoria(c.cat,tipo)}"></span> ${esc(c.cat)}</td><td class="num">${fmt(c.val)}</td>
      <td class="num">${(c.val/total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</td><td class="num">${fmt(c.val/nMeses)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td>Total</td><td class="num">${fmt(total)}</td><td class="num">100%</td><td class="num">${fmt(total/nMeses)}</td></tr></tfoot></table>`;
}
// Resultado = receitas − gastos do mês; Em conta = dinheiro acumulado no fim do mês, já sem o que foi investido.
function tabelaMensal(mensal){
  const t=mensal.reduce((a,x)=>({rec:a.rec+x.rec,gas:a.gas+x.gas,inv:a.inv+x.inv}),{rec:0,gas:0,inv:0});
  const temInv=t.inv>0;
  const linha=(rec,gas,inv)=>{const s=rec-gas;return`<td class="num pos">${fmt(rec)}</td><td class="num neg">${fmt(gas)}</td><td class="num ${s>=0?'pos':'neg'}">${fmt(s)}</td>${temInv?`<td class="num inv">${fmt(inv)}</td>`:''}`};
  const conta=m=>{const c=saldoEmConta(m);return c===null?'<td class="num">—</td>':`<td class="num ${c>=0?'pos':'neg'}">${fmt(c)}</td>`};
  const ultimo=mensal[mensal.length-1].m;
  return`<table class="tbl"><thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Gastos</th><th class="num">Resultado</th>${temInv?'<th class="num">Investido</th>':''}<th class="num">Em conta (fim do mês)</th></tr></thead><tbody>
    ${mensal.map(x=>`<tr><td>${monthLabel(x.m)}</td>${linha(x.rec,x.gas,x.inv)}${conta(x.m)}</tr>`).join('')}
    </tbody><tfoot><tr><td>Total</td>${linha(t.rec,t.gas,t.inv)}${conta(ultimo)}</tr></tfoot></table>`;
}
function tabelaLancamentos(list){
  return`<table class="tbl"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th></tr></thead><tbody>
    ${list.slice().reverse().map(l=>`<tr><td>${fmtDateFull(l.data)}</td><td>${esc(l.desc)}${l.fixo?' <span class="hint">(fixo)</span>':''}</td><td>${esc(l.cat)}</td>
      <td class="num ${classeDo(l.tipo)}">${sinalDo(l.tipo)} ${fmt(l.val)}</td></tr>`).join('')}</tbody></table>`;
}

// ── TELA ───────────────────────────────────────────
function renderRel(){
  if(relCat){relCat.destroy();relCat=null}
  if(relMes){relMes.destroy();relMes=null}
  const p=periodoRel();
  $('r-conteudo').style.display=p?'':'none';
  if(!p)return;
  const d=dadosRel(p),n=p.meses.length;
  setText('r-rec',fmt(d.t.rec));setText('r-gas',fmt(d.t.gas));setText('r-inv',fmt(d.t.inv));setSaldo('r-sal',d.t.saldo);setText('r-med',fmt(d.media));
  setText('r-periodo',(n===1?'1 mês':n+' meses')+' · '+d.list.length+' lançamento'+(d.list.length===1?'':'s'));
  $('r-cat-box').style.display=d.cats.length?'':'none';
  if(d.cats.length){
    $('r-cat-box').style.height=alturaCategorias(d.cats.length)+'px';
    relCat=new Chart($('r-cat'),cfgCategorias(d.cats));
    $('r-cat-tabela').innerHTML=tabelaCategorias(d.cats,d.t.gas,n);
  }else $('r-cat-tabela').innerHTML='<div class="empty">Nenhum gasto no período.</div>';
  $('r-inv-card').style.display=d.invCats.length?'':'none';
  $('r-inv-tabela').innerHTML=d.invCats.length?tabelaCategorias(d.invCats,d.t.inv,n,'investimento'):'';
  relMes=new Chart($('r-mes'),cfgMensal(d.mensal));
  $('r-mes-tabela').innerHTML=tabelaMensal(d.mensal);
}

// ── PDF ────────────────────────────────────────────
async function gerarPDF(){
  const p=periodoRel();if(!p)return;
  const d=dadosRel(p),n=p.meses.length;
  if(!d.list.length){setText('r-erro','Não há lançamentos nesse período.');return}
  const periodo=p.de===p.ate?monthLabel(p.de,true):monthLabel(p.de,true)+' a '+monthLabel(p.ate,true);
  const box=(l,v,cls='')=>`<div class="rep-box"><div class="l">${l}</div><div class="v ${cls}">${v}</div></div>`;
  const imgCat=d.cats.length?graficoImagem(cfgCategorias(d.cats),900,alturaCategorias(d.cats.length)):'';
  const imgMes=graficoImagem(cfgMensal(d.mensal),900,320);
  const rep=$('report');
  rep.innerHTML=`
    <h1>Relatório financeiro</h1>
    <div class="rep-meta">${periodo} · gerado em ${fmtDateFull(todayKey)} · Vida Hub</div>
    <div class="rep-sum">${box('Receitas',fmt(d.t.rec),'pos')}${box('Gastos',fmt(d.t.gas),'neg')}${d.t.inv?box('Investido',fmt(d.t.inv),'inv'):''}${box('Resultado (receitas − gastos)',fmt(d.t.saldo),d.t.saldo>=0?'pos':'neg')}${box('Média de gastos/mês',fmt(d.media))}</div>
    ${d.cats.length?`<div class="rep-sec"><h2>Gastos por categoria</h2><img src="${imgCat}" alt="Gráfico de gastos por categoria"></div>${tabelaCategorias(d.cats,d.t.gas,n)}`:''}
    <div class="rep-sec"><h2>Mês a mês</h2><img src="${imgMes}" alt="Gráfico de receitas e gastos por mês"></div>${tabelaMensal(d.mensal)}
    ${d.recCats.length?`<h2>Receitas por categoria</h2>${tabelaCategorias(d.recCats,d.t.rec,n,'receita')}`:''}
    ${d.invCats.length?`<h2>Investimentos por categoria</h2>${tabelaCategorias(d.invCats,d.t.inv,n,'investimento')}`:''}
    ${$('r-lista').checked?`<h2>Lançamentos</h2>${tabelaLancamentos(d.list)}`:''}`;
  await Promise.all([...rep.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
  // O título vira o nome sugerido do arquivo PDF.
  document.title=`Relatorio financeiro ${p.de} a ${p.ate}`;
  document.body.classList.add('printing');
  window.print();
}
window.addEventListener('afterprint',()=>{document.body.classList.remove('printing');document.title='Vida Hub'});
