// ── AJUSTES: CATEGORIAS E ORÇAMENTOS ───────────────
function renderAjustes(){
  $('a-cats-g').innerHTML=S.categorias.length?S.categorias.map((c,i)=>`<div class="cat-row">
      <span class="dot" style="background:${corDe(i)}"></span><span class="name">${esc(c)}</span>
      <input type="number" min="0" step="0.01" inputmode="decimal" placeholder="Orçamento/mês" aria-label="Orçamento mensal de ${esc(c)}"
        value="${S.orcamentos[c]||''}" onchange="setOrcamento(${i},this.value)"/>
      <button class="btn-icon" title="Excluir" onclick="delCat('gasto',${i})"><i class="ti ti-trash"></i></button>
    </div>`).join(''):'<div class="empty">Nenhuma categoria.</div>';
  $('a-cats-r').innerHTML=S.categoriasReceita.length?S.categoriasReceita.map((c,i)=>`<div class="cat-row">
      <span class="dot" style="background:${corDe(i)}"></span><span class="name">${esc(c)}</span>
      <button class="btn-icon" title="Excluir" onclick="delCat('receita',${i})"><i class="ti ti-trash"></i></button>
    </div>`).join(''):'<div class="empty">Nenhuma categoria.</div>';
  setMes('a-ini-mes',mesInicial());
  $('a-ini-val').value=S.saldoInicial.mes||S.saldoInicial.valor?S.saldoInicial.valor:'';
  setText('a-ini-info',S.saldoInicial.mes?'':'Ainda não definido: o saldo em conta começa em R$ 0 no primeiro mês com lançamentos.');
}
// Saldo inicial: quanto havia em conta no começo de um mês. Lançamentos de antes desse mês não entram no saldo em conta.
function salvarSaldoInicial(){
  S.saldoInicial={valor:parseValor($('a-ini-val').value),mes:getMes('a-ini-mes')};
  save();renderAjustes();
  setText('a-ini-info','Salvo.');
}
function addCat(tipo){
  const inp=$(tipo==='receita'?'a-cat-r':'a-cat-g'),erro=tipo==='receita'?'a-erro-r':'a-erro-g';
  const c=inp.value.trim(),cats=categoriasDo(tipo);
  setText(erro,'');
  if(!c)return;
  if(cats.some(x=>x.toLowerCase()===c.toLowerCase()))return setText(erro,'Essa categoria já existe.');
  cats.push(c);inp.value='';
  save();renderAjustes();
}
const usosCategoria=(tipo,c)=>listaDo(tipo).filter(l=>l.cat===c).length+S.recorrentes.filter(r=>r.tipo===tipo&&r.cat===c).length;
function delCat(tipo,i){
  const cats=categoriasDo(tipo),c=cats[i],n=usosCategoria(tipo,c);
  if(n){alert(`"${c}" está em ${n} lançamento${n>1?'s':''}. Mude a categoria deles ou exclua-os antes de apagar a categoria.`);return}
  if(!confirm(`Excluir a categoria "${c}"?`))return;
  cats.splice(i,1);
  if(tipo==='gasto')delete S.orcamentos[c];
  save();renderAjustes();
}
function setOrcamento(i,v){
  const c=S.categorias[i],n=parseValor(v);
  if(n>0)S.orcamentos[c]=n;else delete S.orcamentos[c];
  save();
}

// ── BACKUP ─────────────────────────────────────────
function baixar(nome,conteudo,tipo){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([conteudo],{type:tipo}));
  a.download=nome;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportarBackup(){baixar(`vida-hub-backup-${todayKey}.json`,JSON.stringify(S,null,2),'application/json')}
function importarBackup(input){
  const f=input.files[0];input.value='';
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    let d;
    try{d=JSON.parse(r.result)}catch(e){d=null}
    if(!d||!Array.isArray(d.receitas)||!Array.isArray(d.gastos)){alert('Arquivo inválido: não é um backup do Vida Hub.');return}
    if(!confirm('Substituir todos os dados atuais pelos do backup?\nSe quiser guardar os atuais, exporte um backup antes.'))return;
    S=migrate(d);save();resetForm();render();
    alert('Backup importado.');
  };
  r.readAsText(f);
}
function exportarCSV(){
  const meses=[...S.receitas,...S.gastos].map(l=>l.data.slice(0,7)).concat(S.recorrentes.map(r=>r.inicio));
  if(!meses.length){alert('Nenhum lançamento para exportar.');return}
  const de=meses.reduce((a,b)=>a<b?a:b),ate=meses.concat(thisMonth).reduce((a,b)=>a>b?a:b);
  // Evita que o Excel interprete um texto começando com = + - @ como fórmula.
  const txt=s=>/^[=+\-@]/.test(s)?"'"+s:s;
  const linhas=[['Data','Tipo','Descrição','Categoria','Valor','Fixo']].concat(lancamentos(de,ate).reverse().map(l=>[
    fmtDateFull(l.data),l.tipo==='receita'?'Receita':'Gasto',txt(l.desc),txt(l.cat),
    (l.tipo==='receita'?l.val:-l.val).toFixed(2).replace('.',','),l.fixo?'sim':'']));
  // BOM + ";" para o Excel em português abrir com acentos e colunas certas.
  const csv='﻿'+linhas.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  baixar(`vida-hub-lancamentos-${todayKey}.csv`,csv,'text/csv;charset=utf-8');
}
