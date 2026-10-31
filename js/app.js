// ── NAV ────────────────────────────────────────────
let currentPage='dash';
const RENDER={dash:()=>renderDash(),lanc:()=>renderLanc(),rel:()=>renderRel(),aju:()=>renderAjustes()};
function go(page){
  currentPage=page;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='p-'+page));
  // sync both navs
  document.querySelectorAll('.nav-item,.mob-btn').forEach(b=>b.classList.toggle('active',b.getAttribute('onclick').includes("go('"+page+"')")));
  window.scrollTo(0,0);
  render();
}
// Só desenha a página visível: gráfico em elemento escondido sai com tamanho errado.
function render(){
  document.querySelectorAll('[data-mes]').forEach(e=>e.textContent=monthLabel(mesAtual,true));
  RENDER[currentPage]();
}

// ── INIT ───────────────────────────────────────────
Chart.defaults.font.family='system-ui,-apple-system,sans-serif';
if(matchMedia('(prefers-color-scheme: dark)').matches){Chart.defaults.color='#aaa';Chart.defaults.borderColor='rgba(255,255,255,0.1)'}
setText('today-date',today.getDate()+' '+MESES[today.getMonth()]+' '+today.getFullYear());
setText('today-day',DIAS[today.getDay()]);
setTipo('gasto');resetForm();
['lf-desc','lf-val','lf-data'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.key==='Enter')salvarLanc()}));
initMonthPicker('r-de');initMonthPicker('r-ate');
setMes('r-de',addMonths(thisMonth,-5));setMes('r-ate',thisMonth);
initMonthPicker('a-ini-mes','');
render();
