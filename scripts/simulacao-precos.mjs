/**
 * Quanto o VetHub fatura, e quanto sobra.
 *
 * Rode com `node scripts/simulacao-precos.mjs` e mexa nas premissas do topo
 * para responder "e se..." — e se metade cair no Essencial, e se ninguém
 * pegar o anual, e se todo mundo consumir a cota cheia.
 *
 * De onde vem cada número:
 *   preços   src/lib/plano-conta.ts (a fonte, não copie à mão)
 *   nota     docs/fiscal.md — Focus NFe, plano de volume
 *   mensagem docs/custos-whatsapp.md — tabela oficial da Meta em BRL
 *   IA       docs/concorrentes/mercado.md, seção 6.4
 *
 * O QUE NÃO ESTÁ AQUI, e muda tudo quando existir: seu pró-labore, equipe,
 * marketing, custo de aquisição e cancelamento. Isto é margem de produto,
 * não lucro de empresa.
 *
 * O imposto assume Simples Nacional Anexo III, que exige fator R (folha ≥
 * 28% da receita). Sem folha, cai no Anexo V, que COMEÇA em 15,5% — a
 * diferença é enorme. Confirme com contador antes de decidir qualquer coisa
 * em cima desta linha.
 */

const PLANOS = {
  essencial:    { preco: { mensal: 189, semestral: 169, anual: 149 }, cotas: {} },
  profissional: { preco: { mensal: 419, semestral: 379, anual: 329 },
                  cotas: { nota: 200, msg: 500, ia: 0 } },
  completo:     { preco: { mensal: 879, semestral: 789, anual: 699 },
                  cotas: { nota: 800, msg: 2000, ia: 150 } },
};

// Custo real por unidade, em reais.
const CUSTO = {
  nota: 0.137,   // Focus NFe plano Growth: R$ 548 / 4.000 notas
  msg: 0.035,    // utility, tabela oficial da Meta em BRL
  ia: 0.78,      // meio da faixa R$ 0,26–1,30; a transcrição domina
};

// Preço do excedente cobrado ao cliente.
const EXCEDENTE = { nota: 0.25, msg: 0.12, ia: 1.9 };

// Infra por cliente/mês, acima da base fixa da plataforma.
const INFRA = { essencial: 3, profissional: 6, completo: 12 };

// Base fixa da plataforma: Vercel Pro + Supabase Pro (~USD 45 a R$ 5,20).
const FIXO_PLATAFORMA = 235;

// --- Premissas de mercado -------------------------------------------
const MIX_PLANO = { essencial: 0.45, profissional: 0.45, completo: 0.10 };
const MIX_CICLO = { mensal: 0.5, semestral: 0.2, anual: 0.3 };

// Quanto da cota o cliente médio consome. A pesquisa usa 40%.
const USO = 0.4;

// Fatia que estoura a cota, e quanto estoura além dela.
const FATIA_QUE_ESTOURA = 0.15;
const QUANTO_ESTOURA = 0.3;

const real = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const real2 = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

/** Preço médio de um plano, pesando os três ciclos. */
function precoMedio(plano) {
  const p = PLANOS[plano].preco;
  return Object.entries(MIX_CICLO).reduce((s, [c, peso]) => s + p[c] * peso, 0);
}

/** Custo variável de um cliente deste plano, no uso médio. */
function custoVariavel(plano, uso = USO) {
  const { cotas } = PLANOS[plano];
  let c = INFRA[plano];
  for (const k of ["nota", "msg", "ia"]) {
    c += (cotas[k] ?? 0) * uso * CUSTO[k];
  }
  return c;
}

/** Receita e custo do que passa da cota, por cliente do plano. */
function excedente(plano) {
  const { cotas } = PLANOS[plano];
  let receita = 0, custo = 0;
  for (const k of ["nota", "msg", "ia"]) {
    const extra = (cotas[k] ?? 0) * QUANTO_ESTOURA;
    receita += extra * EXCEDENTE[k];
    custo += extra * CUSTO[k];
  }
  return { receita: receita * FATIA_QUE_ESTOURA, custo: custo * FATIA_QUE_ESTOURA };
}

console.log("=".repeat(74));
console.log("1. PREÇO POR CLIENTE, E O QUE SOBRA DELE");
console.log("=".repeat(74));
console.log("plano          médio    cheio   uso 40%   uso 100%   margem 40%  100%");
for (const plano of Object.keys(PLANOS)) {
  const pm = precoMedio(plano);
  const c40 = custoVariavel(plano, 0.4);
  const c100 = custoVariavel(plano, 1.0);
  console.log(
    plano.padEnd(13),
    real(pm).padStart(8),
    real(PLANOS[plano].preco.mensal).padStart(8),
    real2(c40).padStart(9),
    real2(c100).padStart(10),
    `${((1 - c40 / pm) * 100).toFixed(0)}%`.padStart(11),
    `${((1 - c100 / pm) * 100).toFixed(0)}%`.padStart(5)
  );
}

const ARPU = Object.entries(MIX_PLANO).reduce((s, [p, w]) => s + precoMedio(p) * w, 0);
const EXC = Object.entries(MIX_PLANO).reduce((s, [p, w]) => s + excedente(p).receita * w, 0);
const CUSTO_CLI = Object.entries(MIX_PLANO).reduce(
  (s, [p, w]) => s + (custoVariavel(p) + excedente(p).custo) * w, 0
);

console.log(`\nMix usado: Essencial 45% · Profissional 45% · Completo 10%`);
console.log(`Ciclos:    1 mês 50% · 6 meses 20% · 12 meses 30%`);
console.log(`\nARPU (mensalidade média por cliente): ${real2(ARPU)}`);
console.log(`Excedente médio por cliente:          ${real2(EXC)}`);
console.log(`Custo variável médio por cliente:     ${real2(CUSTO_CLI)}`);
console.log(`Margem bruta por cliente:             ${real2(ARPU + EXC - CUSTO_CLI)}  (${(((ARPU + EXC - CUSTO_CLI) / (ARPU + EXC)) * 100).toFixed(0)}%)`);

console.log("\n" + "=".repeat(74));
console.log("2. SIMULAÇÃO POR TAMANHO DA BASE");
console.log("=".repeat(74));
console.log("clientes      MRR   excedente   custo var.   fixo   margem bruta    ano");
for (const n of [10, 25, 50, 100, 250, 500, 1000]) {
  const mrr = ARPU * n;
  const exc = EXC * n;
  const cv = CUSTO_CLI * n;
  const margem = mrr + exc - cv - FIXO_PLATAFORMA;
  console.log(
    String(n).padStart(8),
    real(mrr).padStart(9),
    real(exc).padStart(11),
    real(cv).padStart(12),
    real(FIXO_PLATAFORMA).padStart(7),
    real(margem).padStart(14),
    real(margem * 12).padStart(12)
  );
}

console.log("\n" + "=".repeat(74));
console.log("3. QUANTOS CLIENTES PARA CADA MARCO");
console.log("=".repeat(74));
const porCliente = ARPU + EXC - CUSTO_CLI;
for (const [rotulo, alvo] of [
  ["pagar a plataforma (empate)", 0],
  ["R$ 5.000/mês", 5000],
  ["R$ 10.000/mês", 10000],
  ["R$ 30.000/mês", 30000],
  ["R$ 50.000/mês", 50000],
]) {
  const n = Math.ceil((alvo + FIXO_PLATAFORMA) / porCliente);
  console.log(`${rotulo.padEnd(30)} ${String(n).padStart(5)} clientes`);
}

console.log("\n" + "=".repeat(74));
console.log("4. CENÁRIO RUIM: TODO MUNDO NO MENSAL, CONSUMINDO A COTA CHEIA");
console.log("=".repeat(74));
const ARPU_RUIM = Object.entries(MIX_PLANO).reduce(
  (s, [p, w]) => s + PLANOS[p].preco.mensal * w, 0
);
const CUSTO_RUIM = Object.entries(MIX_PLANO).reduce(
  (s, [p, w]) => s + custoVariavel(p, 1.0) * w, 0
);
console.log(`ARPU:            ${real2(ARPU_RUIM)}`);
console.log(`Custo variável:  ${real2(CUSTO_RUIM)}`);
console.log(`Margem bruta:    ${real2(ARPU_RUIM - CUSTO_RUIM)}  (${(((ARPU_RUIM - CUSTO_RUIM) / ARPU_RUIM) * 100).toFixed(0)}%)`);
console.log(`\n100 clientes → ${real(( ARPU_RUIM - CUSTO_RUIM) * 100 - FIXO_PLATAFORMA)}/mês`);

console.log("\n" + "=".repeat(74));
console.log("5. O CAIXA DO ANUAL (o que entra à vista)");
console.log("=".repeat(74));
for (const plano of Object.keys(PLANOS)) {
  const a = PLANOS[plano].preco.anual;
  console.log(
    `${plano.padEnd(13)} 12× de ${real(a).padStart(7)} = ${real(a * 12).padStart(9)} por cliente/ano`
  );
}
const anuais = Math.round(100 * MIX_CICLO.anual);
console.log(`\nCom 100 clientes, ${anuais} no plano de 12 meses adiantam`);
console.log(`aproximadamente ${real(anuais * ARPU * 12 * 0.9)} de caixa no ano.`);

console.log("\n" + "=".repeat(74));
console.log("6. O QUE AINDA SAI DAÍ: TAXA DE CARTÃO E IMPOSTO");
console.log("=".repeat(74));

// Maquininha/gateway de assinatura no Brasil: 3,5% é o meio da faixa
// (cartão fica entre 3,2% e 4,2%; Pix sai por ~1%).
const TAXA_GATEWAY = 0.035;

// Simples Nacional, Anexo III (software COM fator R ≥ 28% da receita em
// folha). Sem fator R cai no Anexo V, que começa em 15,5% — a diferença
// entre os dois é enorme e depende da folha. CONFIRMAR COM CONTADOR.
const FAIXAS_III = [
  [180000, 0.06, 0],
  [360000, 0.112, 9360],
  [720000, 0.135, 17640],
  [1800000, 0.16, 35640],
  [3600000, 0.21, 125640],
  [4800000, 0.33, 648000],
];
function aliquotaEfetiva(receitaAno) {
  for (const [teto, nominal, deducao] of FAIXAS_III) {
    if (receitaAno <= teto) {
      return (receitaAno * nominal - deducao) / receitaAno;
    }
  }
  // Acima de R$ 4,8 mi por ano a empresa SAI do Simples e vai para o Lucro
  // Presumido, que é outra conta inteira. Marcado para não passar batido.
  return 0.155;
}

console.log("clientes    receita/mês   cartão   imposto   custo var.   SOBRA/mês     ano");
for (const n of [10, 25, 50, 100, 250, 500, 1000]) {
  const receita = (ARPU + EXC) * n;
  const ano = receita * 12;
  const cartao = receita * TAXA_GATEWAY;
  const aliq = aliquotaEfetiva(ano);
  const imposto = receita * aliq;
  const cv = CUSTO_CLI * n + FIXO_PLATAFORMA;
  const sobra = receita - cartao - imposto - cv;
  console.log(
    String(n).padStart(8),
    real(receita).padStart(13),
    real(cartao).padStart(9),
    `${real(imposto)} (${(aliq * 100).toFixed(1)}%)`.padStart(17),
    real(cv).padStart(11),
    real(sobra).padStart(12),
    real(sobra * 12).padStart(13)
  );
}

console.log("\nMargem líquida (antes de salário, marketing e aluguel):");
for (const n of [50, 100, 500]) {
  const receita = (ARPU + EXC) * n;
  const sobra =
    receita - receita * TAXA_GATEWAY - receita * aliquotaEfetiva(receita * 12) -
    (CUSTO_CLI * n + FIXO_PLATAFORMA);
  console.log(`  ${String(n).padStart(4)} clientes → ${((sobra / receita) * 100).toFixed(0)}%`);
}

console.log("\n" + "=".repeat(74));
console.log("7. E SE O MIX PENDER PARA O ESSENCIAL?");
console.log("=".repeat(74));

// O suporte é o custo que não aparece na margem por unidade e é quase igual
// para todo cliente: a dúvida de quem paga R$ 149 é a mesma de quem paga
// R$ 699. É ele que derruba a margem REAL do plano de entrada.
//
// De onde sai o número, para não ser chute:
//
//   salário de suporte técnico          R$ 1.700
//   + FGTS, 13º, férias, multa, VT/VR   R$   947
//   = custo real do atendente           R$ 2.647   (1,56× o salário)
//
// Não é 2× o salário, que é a regra de bolso do Lucro Presumido: numa
// empresa do SIMPLES a CPP de 20% já está dentro do DAS e não sai por fora.
//
// Dividido por ~100 clientes que um atendente dá conta, dá R$ 26. Usamos
// R$ 30 para deixar folga de férias e pico de fim de mês.
const SUPORTE_POR_CLIENTE = 30;

const CENARIOS = {
  "pessimista  70/25/05": { essencial: 0.7, profissional: 0.25, completo: 0.05 },
  "base        45/45/10": { essencial: 0.45, profissional: 0.45, completo: 0.10 },
  "otimista    25/55/20": { essencial: 0.25, profissional: 0.55, completo: 0.20 },
};

function conta(mix, n) {
  const arpu = Object.entries(mix).reduce((s, [p, w]) => s + precoMedio(p) * w, 0);
  const exc = Object.entries(mix).reduce((s, [p, w]) => s + excedente(p).receita * w, 0);
  const cv = Object.entries(mix).reduce(
    (s, [p, w]) => s + (custoVariavel(p) + excedente(p).custo) * w, 0
  );
  const receita = (arpu + exc) * n;
  const suporte = SUPORTE_POR_CLIENTE * n;
  const cartao = receita * TAXA_GATEWAY;
  const imposto = receita * aliquotaEfetiva(receita * 12);
  const sobra = receita - cartao - imposto - cv * n - suporte - FIXO_PLATAFORMA;
  return { arpu, receita, sobra, porCliente: arpu + exc - cv - SUPORTE_POR_CLIENTE };
}

console.log(`Com 100 clientes, já descontando R$ ${SUPORTE_POR_CLIENTE}/cliente de suporte:
`);
console.log("cenário                  ARPU   receita/mês    SOBRA/mês   p/ R$30k precisa de");
for (const [nome, mix] of Object.entries(CENARIOS)) {
  const r = conta(mix, 100);
  // Quantos clientes deste mix para a sobra chegar a R$ 30 mil.
  let n = 1;
  while (conta(mix, n).sobra < 30000 && n < 5000) n++;
  console.log(
    nome.padEnd(22),
    real(r.arpu).padStart(7),
    real(r.receita).padStart(12),
    real(r.sobra).padStart(13),
    `${n} clientes`.padStart(20)
  );
}

console.log("\nA mesma base de 100 clientes, do pior ao melhor mix:");
const pior = conta(CENARIOS["pessimista  70/25/05"], 100).sobra;
const melhor = conta(CENARIOS["otimista    25/55/20"], 100).sobra;
console.log(`  diferença de ${real(melhor - pior)} por mês, ${real((melhor - pior) * 12)} no ano`);
console.log(`  ou seja: o MIX vale ${((melhor / pior - 1) * 100).toFixed(0)}% a mais, com o mesmo`);
console.log(`  número de clientes e o mesmo trabalho de vender.`);

console.log("\n" + "=".repeat(74));
console.log("8. E SE O SUPORTE CUSTAR MAIS DO QUE EU ACHO?");
console.log("=".repeat(74));
console.log("É o número mais incerto da conta inteira, e o único que ninguém");
console.log("sabe antes de ter cliente. Vale saber onde ele começa a doer.\n");
console.log("R$/cliente   Essencial   Profissional   Completo   sobra c/ 100 (mix base)");
console.log("(R$ 26 = um atendente para 100 clientes · R$ 53 = para 50 · R$ 15 = para 175)");
for (const s of [15, 26, 30, 53, 90]) {
  const m = (p) => `${(((precoMedio(p) - custoVariavel(p) - s) / precoMedio(p)) * 100).toFixed(0)}%`;
  const mixBase = { essencial: 0.45, profissional: 0.45, completo: 0.1 };
  const arpu = Object.entries(mixBase).reduce((a, [p, w]) => a + precoMedio(p) * w, 0);
  const exc = Object.entries(mixBase).reduce((a, [p, w]) => a + excedente(p).receita * w, 0);
  const cv = Object.entries(mixBase).reduce(
    (a, [p, w]) => a + (custoVariavel(p) + excedente(p).custo) * w, 0);
  const receita = (arpu + exc) * 100;
  const sobra = receita - receita * TAXA_GATEWAY -
    receita * aliquotaEfetiva(receita * 12) - cv * 100 - s * 100 - FIXO_PLATAFORMA;
  console.log(
    `R$ ${String(s).padStart(3)}`.padEnd(13),
    m("essencial").padStart(9), m("profissional").padStart(14),
    m("completo").padStart(11), real(sobra).padStart(23)
  );
}
console.log("\nRepare: o Essencial é sempre o mais sensível. Quanto menor o ticket,");
console.log("mais cedo o atendimento come o plano — a R$ 90 por cliente ele cai");
console.log("para 46% enquanto o Completo mal sente, em 73%.");

console.log("\n" + "=".repeat(74));
console.log("9. VALE BAIXAR O PREÇO DO PROFISSIONAL?");
console.log("=".repeat(74));

const SUP = SUPORTE_POR_CLIENTE;
function sobraCom(precoProf, share, n = 100) {
  const orig = { ...PLANOS.profissional.preco };
  const fator = precoProf / orig.anual;
  PLANOS.profissional.preco = {
    mensal: orig.mensal * fator, semestral: orig.semestral * fator, anual: precoProf,
  };
  const mix = { essencial: 0.9 - share, profissional: share, completo: 0.1 };
  const arpu = Object.entries(mix).reduce((a, [p, w]) => a + precoMedio(p) * w, 0);
  const exc = Object.entries(mix).reduce((a, [p, w]) => a + excedente(p).receita * w, 0);
  const cv = Object.entries(mix).reduce(
    (a, [p, w]) => a + (custoVariavel(p) + excedente(p).custo) * w, 0);
  const receita = (arpu + exc) * n;
  const s = receita - receita * TAXA_GATEWAY - receita * aliquotaEfetiva(receita * 12)
    - cv * n - SUP * n - FIXO_PLATAFORMA;
  PLANOS.profissional.preco = orig;
  return s;
}

const ALVO = sobraCom(329, 0.45);
console.log(`Referência: R$ 329 com 45% da base no Profissional = ${real(ALVO)}/mês\n`);
console.log("preço anual   sobra no mesmo mix   share necessário para empatar");
for (const preco of [279, 299, 329, 359, 399]) {
  const mesmo = sobraCom(preco, 0.45);
  let share = 0.05;
  while (sobraCom(preco, share) < ALVO && share < 0.9) share += 0.005;
  const txt = share >= 0.895 ? "não empata nem com 90%" : `${(share * 100).toFixed(0)}% da base`;
  console.log(
    `R$ ${preco}`.padEnd(13), real(mesmo).padStart(19),
    (preco === 329 ? "— referência —" : txt).padStart(33)
  );
}

console.log("\n" + "=".repeat(74));
console.log("10. CANCELAMENTO: QUANTOS CLIENTES SÓ PARA NÃO ENCOLHER");
console.log("=".repeat(74));
console.log("base    churn 1%/mês   churn 3%/mês   churn 5%/mês   (novos por mês)");
for (const base of [50, 100, 250, 500]) {
  console.log(
    String(base).padStart(5),
    ...[0.01, 0.03, 0.05].map((c) => `${Math.ceil(base * c)} clientes`.padStart(15))
  );
}
console.log("\nCom 3%/mês, metade da base troca em menos de 2 anos. É por isso que");
console.log("o plano de 12 meses vale mais do que o desconto custa: quem pagou o");
console.log("ano não cancela em março.");
