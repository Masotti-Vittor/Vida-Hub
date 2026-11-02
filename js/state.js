// ── STATE ──────────────────────────────────────────
// Salvo no localStorage com a chave 'vidahub'. Não renomeie a chave nem os
// campos: isso apagaria os dados já salvos no navegador.
// Metas, Tarefas e Saúde saíram da tela, mas metas/metaHistory/tasks/saude
// continuam guardados como estavam.
const STATE_VERSION=3;
const defaultState=()=>({
  receitas:[],gastos:[],investimentos:[],      // {id,desc,val,cat,data:'YYYY-MM-DD'}
  categorias:['Mercado','Lazer','Alimentação'], // categorias de gasto
  categoriasReceita:['Salário','Freelance','Outros'],
  categoriasInvestimento:['Investimentos'],
  orcamentos:{},                               // {categoria de gasto: valor mensal}
  metasInvestimento:{},                        // {categoria de investimento: meta mensal}
  recorrentes:[],                              // {id,tipo,desc,val,cat,dia,inicio:'YYYY-MM',fim}
  saldoInicial:{valor:0,mes:null},             // dinheiro em conta no início de 'mes' (null = primeiro mês com lançamentos)
  patrimonio:0,
  versao:STATE_VERSION
});
let S=defaultState();
function save(){try{localStorage.setItem('vidahub',JSON.stringify(S))}catch(e){}}
function load(){
  try{
    const d=localStorage.getItem('vidahub');
    if(!d)return;
    const saved=JSON.parse(d);
    // Guarda uma cópia antes de mover os investimentos: estes dados só existem neste navegador.
    if(!(saved.versao>=3))try{localStorage.setItem('vidahub-pre-v3',d)}catch(e){}
    S=migrate(saved);
    // Salva logo a migração para a data dada aos lançamentos antigos não mudar a cada dia.
    if(saved.versao!==STATE_VERSION)save();
  }catch(e){}
}

// Normaliza dados salvos por versões antigas ou vindos de um backup importado.
function migrate(saved){
  const def=defaultState(),s={...def,...saved};
  const arr=v=>Array.isArray(v)?v:[];
  const okId=id=>typeof id==='string'&&/^[a-z0-9]+$/i.test(id);
  const okMes=m=>typeof m==='string'&&/^\d{4}-\d{2}$/.test(m);
  const nomes=v=>arr(v).filter(c=>typeof c==='string'&&c.trim());
  const valor=v=>Math.round((Number(v)||0)*100)/100;
  const cat=c=>typeof c==='string'&&c.trim()?c:'Outros';
  const lanc=l=>({id:okId(l.id)?l.id:uid(),desc:String(l.desc??''),val:valor(l.val),cat:cat(l.cat),
    data:typeof l.data==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(l.data)?l.data:todayKey});
  const obj=l=>l&&typeof l==='object';
  const valores=o=>obj(o)?Object.fromEntries(Object.entries(o).filter(([,v])=>Number(v)>0).map(([k,v])=>[k,valor(v)])):{};

  s.categorias=nomes(s.categorias);
  s.categoriasReceita=Array.isArray(saved.categoriasReceita)?nomes(saved.categoriasReceita):def.categoriasReceita;
  s.categoriasInvestimento=Array.isArray(saved.categoriasInvestimento)?nomes(saved.categoriasInvestimento):def.categoriasInvestimento;
  s.receitas=arr(s.receitas).filter(obj).map(lanc);
  s.gastos=arr(s.gastos).filter(obj).map(lanc);
  s.investimentos=arr(s.investimentos).filter(obj).map(lanc);
  s.recorrentes=arr(s.recorrentes).filter(r=>obj(r)&&okMes(r.inicio)).map(r=>({
    id:okId(r.id)?r.id:uid(),tipo:r.tipo==='receita'||r.tipo==='investimento'?r.tipo:'gasto',desc:String(r.desc??''),
    val:valor(r.val),cat:cat(r.cat),dia:Math.min(31,Math.max(1,parseInt(r.dia)||1)),
    inicio:r.inicio,fim:okMes(r.fim)?r.fim:null}));
  s.orcamentos=valores(s.orcamentos);
  s.metasInvestimento=valores(s.metasInvestimento);
  // Até a versão 2, investir era um gasto de categoria "Investimentos". Só converte
  // dados antigos: depois disso, quem criar um gasto com esse nome continua com um gasto.
  if(!(saved.versao>=3)){
    const eInvest=c=>/^investimentos?$/i.test(c.trim());
    s.investimentos.push(...s.gastos.filter(l=>eInvest(l.cat)));
    s.gastos=s.gastos.filter(l=>!eInvest(l.cat));
    s.recorrentes.forEach(r=>{if(r.tipo==='gasto'&&eInvest(r.cat))r.tipo='investimento'});
    const antigas=s.categorias.filter(eInvest);
    if(antigas.length)s.categoriasInvestimento=antigas;
    s.categorias=s.categorias.filter(c=>!eInvest(c));
    Object.keys(s.orcamentos).filter(eInvest).forEach(c=>{s.metasInvestimento[c]=s.orcamentos[c];delete s.orcamentos[c]});
  }
  // Toda categoria usada precisa existir; antes, um gasto de categoria desconhecida sumia da tela.
  const garante=(lista,cats)=>lista.forEach(l=>{if(!cats.includes(l.cat))cats.push(l.cat)});
  garante(s.gastos,s.categorias);garante(s.recorrentes.filter(r=>r.tipo==='gasto'),s.categorias);
  garante(s.receitas,s.categoriasReceita);garante(s.recorrentes.filter(r=>r.tipo==='receita'),s.categoriasReceita);
  garante(s.investimentos,s.categoriasInvestimento);garante(s.recorrentes.filter(r=>r.tipo==='investimento'),s.categoriasInvestimento);
  s.saldoInicial=obj(s.saldoInicial)?{valor:valor(s.saldoInicial.valor),mes:okMes(s.saldoInicial.mes)?s.saldoInicial.mes:null}:def.saldoInicial;
  s.patrimonio=valor(s.patrimonio);
  s.versao=STATE_VERSION;
  return s;
}
load();
