// ── DATE ───────────────────────────────────────────
const DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES_LONGO=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const pad=n=>String(n).padStart(2,'0');
// Data local, não UTC: com toISOString, depois das 21h no Brasil já era "amanhã".
const dateKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=new Date();
const todayKey=dateKey(today);
const thisMonth=todayKey.slice(0,7);

// Meses são strings 'YYYY-MM'; comparar como texto já respeita a ordem.
const addMonths=(m,k)=>{const[y,mo]=m.split('-').map(Number);const d=new Date(y,mo-1+k,1);return d.getFullYear()+'-'+pad(d.getMonth()+1)};
const monthRange=(de,ate)=>{const r=[];for(let m=de;m<=ate;m=addMonths(m,1))r.push(m);return r};
const daysInMonth=m=>{const[y,mo]=m.split('-').map(Number);return new Date(y,mo,0).getDate()};
// 'out/2026' ou, com longo, 'outubro de 2026'
const monthLabel=(m,longo)=>{const[y,mo]=m.split('-').map(Number);return longo?MESES_LONGO[mo-1]+' de '+y:MESES[mo-1]+'/'+y};
const fmtDate=k=>k.slice(8,10)+'/'+k.slice(5,7);
const fmtDateFull=k=>k.slice(8,10)+'/'+k.slice(5,7)+'/'+k.slice(0,4);

// ── FORMAT ─────────────────────────────────────────
const fmt=v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtEixo=v=>'R$ '+Number(v).toLocaleString('pt-BR');
// Escapa texto digitado antes de ir para innerHTML (ex: uma tarefa com "<" quebrava a lista).
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Aceita "10,50" ou "10.50"; arredonda para centavos. Inválido vira 0.
const parseValor=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:0};
let _uid=0;
const uid=()=>Date.now().toString(36)+(_uid++).toString(36)+Math.random().toString(36).slice(2,6);

// ── DOM ────────────────────────────────────────────
const $=id=>document.getElementById(id);
const setText=(id,t)=>{$(id).textContent=t};
function setSaldo(id,v){const e=$(id);e.textContent=fmt(v);e.classList.toggle('pos',v>=0);e.classList.toggle('neg',v<0)}

// ── CORES ──────────────────────────────────────────
const PALETA=['#1D9E75','#EF9F27','#E24B4A','#378ADD','#D4537E','#639922','#BA7517','#534AB7'];
// Depois das 8 cores fixas, gera mais tons em vez de ficar sem cor.
const corDe=i=>i<PALETA.length?PALETA[i]:`hsl(${(i*47)%360} 55% 50%)`;
