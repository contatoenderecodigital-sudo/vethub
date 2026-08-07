/**
 * O teste do dinheiro: as três telas contam a mesma história?
 *
 * A regra do sistema (docs/decisoes-financeiras.md) é que toda venda vira uma
 * conta a receber e todo pagamento vira uma baixa. Se isso valer, três lugares
 * têm que fechar no mesmo centavo:
 *
 *   * a ficha do tutor          -> o que ele deve
 *   * /financeiro/receber       -> as contas em aberto
 *   * /financeiro (Caixa)       -> o que entrou
 *   * /financeiro (Competência) -> o que foi vendido
 *
 * O roteiro vende três vezes para o MESMO tutor, com um produto de R$ 100:
 *
 *   venda A  R$ 100  à vista (dinheiro)  -> entra no caixa hoje, não fica devendo
 *   venda B  R$ 100  fiado               -> não entra no caixa, fica devendo
 *   venda C  R$ 100  misto: 40 dinheiro + 60 fiado
 *
 * Portanto, se o livro for único:
 *
 *   vendido (competência) = 300,00
 *   entrou  (caixa)       = 140,00   (100 + 40)
 *   em aberto (o tutor deve) = 160,00   (100 + 60)
 *
 * O número que importa é o **em aberto**: era exatamente ele que aparecia
 * diferente na ficha do tutor e no relatório antes do livro único.
 *
 * Como rodar:
 *   BASE_URL=https://vethub-tau.vercel.app \
 *   VETHUB_EMAIL=... VETHUB_SENHA=... node --env-file=.env.local \
 *   tests/varredura/dinheiro.mjs
 */

import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "resultado-dinheiro");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MARCA = `ZZ Robo ${Date.now().toString().slice(-6)}`;

/**
 * O teste compara totais ABSOLUTOS ("a clínica vendeu 300"), então precisa de
 * uma clínica virgem: rodando duas vezes na mesma, as contas da primeira
 * rodada entrariam na conta da segunda e o resultado seria sempre falso.
 * Por isso cada execução cria a própria clínica pelo cadastro público, do
 * mesmo jeito que um cliente novo faria.
 */
const SUFIXO = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const EMAIL = `zz.robo.dinheiro.${SUFIXO}@example.com`;
const SENHA = `RoboDinheiro${SUFIXO.slice(-6)}1`;

async function criarClinica() {
  const resposta = await fetch(`${BASE}/api/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinica: `${MARCA} clínica`,
      nome: `${MARCA} admin`,
      email: EMAIL,
      senha: SENHA,
    }),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !corpo?.ok) {
    throw new Error(`cadastro recusado (${resposta.status}): ${corpo?.erro ?? "sem detalhe"}`);
  }
}

/** O produto vale R$ 100 e cada venda leva um: as contas ficam de cabeça. */
const ESPERADO = { vendido: 300, entrou: 140, aberto: 160 };

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok   " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

/** "R$ 1.234,56" -> 1234.56. Devolve null se não houver número. */
function moeda(texto) {
  if (!texto) return null;
  const m = String(texto).match(/-?[\d.]+,\d{2}/);
  if (!m) return null;
  return Number(m[0].replace(/\./g, "").replace(",", "."));
}

/** Todos os valores em reais que aparecem num pedaço de texto. */
function todasMoedas(texto) {
  return [...String(texto ?? "").matchAll(/-?[\d.]+,\d{2}/g)].map((m) =>
    Number(m[0].replace(/\./g, "").replace(",", "."))
  );
}

const perto = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.005;

async function enviarFormulario(pagina) {
  await pagina
    .waitForFunction(
      () => {
        const b = [...document.querySelectorAll('main button[type="submit"]')].find(
          (x) => x.offsetParent !== null
        );
        return b && !b.disabled;
      },
      { timeout: 10000 }
    )
    .catch(() => {});
  await pagina.locator('main button[type="submit"]:visible').first().click({ timeout: 15000 });
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(700);
}

/** Digita num combobox de busca e escolhe a primeira sugestão. */
async function escolherNoCombobox(pagina, id, texto) {
  const campo = pagina.locator(`#${id}`);
  await campo.click();
  await campo.fill(texto);
  const opcao = pagina.locator('[role="option"]').first();
  await opcao.waitFor({ state: "visible", timeout: 15000 });
  await opcao.click();
  await pagina.waitForTimeout(400);
}

async function entrar(pagina) {
  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  let liberado = false;
  for (let i = 0; i < 3 && !liberado; i++) {
    await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
    await pagina.fill('input[type="password"], input[name="senha"]', SENHA);
    liberado = await pagina
      .waitForFunction(() => !document.querySelector("button[type=submit]")?.disabled, {
        timeout: 8000,
      })
      .then(() => true)
      .catch(() => false);
  }
  if (!liberado) throw new Error("botão Entrar nunca habilitou");
  await pagina.click('button[type="submit"]');
  await pagina
    .waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 25000 })
    .catch(() => {});
  if (new URL(pagina.url()).pathname === "/login") throw new Error("login recusado");
}

// ------------------------------------------------------------------
// Preparo: produto, tutor e caixa aberto
// ------------------------------------------------------------------

async function criarProduto(pagina) {
  await pagina.goto(`${BASE}/itens/novo`, { waitUntil: "networkidle" });
  await pagina.fill("#nome", `${MARCA} produto`);
  const tipo = pagina.locator("#tipo");
  if (await tipo.count()) await tipo.selectOption("produto").catch(() => {});
  await pagina.fill("#preco_venda", "100,00").catch(() => {});
  await enviarFormulario(pagina);
  const deuCerto = !new URL(pagina.url()).pathname.endsWith("/novo");
  registro("preparo: produto de R$ 100,00", deuCerto, `${MARCA} produto`);
  return deuCerto;
}

async function criarTutor(pagina) {
  await pagina.goto(`${BASE}/tutores/novo`, { waitUntil: "networkidle" });
  await pagina.fill("#nome", `${MARCA} tutor`);
  await pagina.fill("#telefone", "11999990000").catch(() => {});
  const lgpd = pagina.locator('main input[type="checkbox"]').first();
  if (await lgpd.count()) await lgpd.check().catch(() => {});
  await enviarFormulario(pagina);
  const deuCerto = !new URL(pagina.url()).pathname.endsWith("/novo");
  registro("preparo: tutor", deuCerto, `${MARCA} tutor`);
  return deuCerto;
}

async function garantirCaixaAberto(pagina) {
  await pagina.goto(`${BASE}/pdv`, { waitUntil: "networkidle" });
  const abrir = pagina.locator("main button", { hasText: /abrir caixa/i }).first();
  if ((await abrir.count()) === 0) {
    registro("preparo: caixa", true, "já estava aberto");
    return true;
  }
  const valor = pagina.locator('#valor_abertura, [name="valor_abertura"]').first();
  if (await valor.count()) await valor.fill("0,00").catch(() => {});
  await abrir.click();
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(800);
  const ok = (await pagina.locator("#pdv-busca-item").count()) > 0;
  registro("preparo: abrir caixa", ok, ok ? "caixa aberto" : "não abriu");
  return ok;
}

// ------------------------------------------------------------------
// As três vendas
// ------------------------------------------------------------------

/**
 * Faz uma venda. `pagamentos` é uma lista de { forma, valor }.
 * Toda venda leva o tutor, porque fiado exige tutor e queremos que as três
 * caiam na mesma ficha.
 */
async function vender(pagina, rotulo, pagamentos) {
  await pagina.goto(`${BASE}/pdv`, { waitUntil: "networkidle" });

  await escolherNoCombobox(pagina, "pdv-busca-item", `${MARCA} produto`);
  await escolherNoCombobox(pagina, "pdv-tutor", `${MARCA} tutor`);

  const total = moeda(
    await pagina.locator("main").filter({ hasText: "Total" }).last().innerText()
  );

  await pagina.locator("main button", { hasText: /finalizar venda/i }).first().click();
  const painel = pagina.locator('[role="dialog"][aria-label="Pagamento da venda"]');
  await painel.waitFor({ state: "visible", timeout: 15000 });

  for (let i = 0; i < pagamentos.length; i++) {
    if (i > 0) {
      await painel.locator("button", { hasText: /outra forma/i }).click();
      await pagina.waitForTimeout(300);
    }
    await painel.locator('[aria-label="Forma de pagamento"]').nth(i).selectOption(pagamentos[i].forma);
    await painel.locator('[aria-label="Valor do pagamento"]').nth(i).fill(pagamentos[i].valor);
    await pagina.waitForTimeout(250);
  }

  const falta = moeda(await painel.innerText());
  await painel.locator("button", { hasText: /concluir venda/i }).click();

  // Concluir grava e sai do painel — às vezes navegando para o comprovante,
  // às vezes voltando ao terminal limpo. Esperar o painel SUMIR cobre os dois
  // casos; olhar a visibilidade logo depois do clique dava falso negativo,
  // porque a venda já estava gravada e só a animação ainda rodava.
  const saiu = await painel
    .waitFor({ state: "detached", timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(600);
  registro(
    `venda ${rotulo}`,
    saiu,
    saiu
      ? `total ${total ?? "?"} · ${pagamentos.map((p) => `${p.forma} ${p.valor}`).join(" + ")}`
      : `painel não fechou (falta/troco lido: ${falta})`
  );
  return saiu;
}

// ------------------------------------------------------------------
// A conferência
// ------------------------------------------------------------------

/** O que a ficha do tutor diz que ele deve. */
async function lerFichaDoTutor(pagina) {
  await pagina.goto(`${BASE}/tutores?q=${encodeURIComponent(MARCA)}`, {
    waitUntil: "networkidle",
  });
  // `:not([href$="/novo"])` porque o botão "Novo tutor" também é um link que
  // começa com /tutores/ — e vem antes na página, então sem isso o robô
  // abre o formulário em branco achando que é a ficha.
  const link = pagina.locator('main a[href^="/tutores/"]:not([href$="/novo"])').first();
  if ((await link.count()) === 0) return { valor: null, texto: "tutor não achado na lista" };
  await link.click();
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(700);

  // O bloco Financeiro da ficha traz "EM ABERTO" e, na linha seguinte, o
  // valor. É esse o número que o balconista lê para saber o que cobrar.
  const linhas = (await pagina.locator("main").innerText()).split("\n").map((l) => l.trim());
  const rotulo = linhas.findIndex((l) => /^em aberto$/i.test(l));
  let valor = null;
  if (rotulo >= 0) {
    for (let j = rotulo + 1; j < Math.min(rotulo + 3, linhas.length); j++) {
      valor = moeda(linhas[j]);
      if (valor !== null) break;
    }
  }
  const debitos = linhas.findIndex((l) => /^d[ée]bitos$/i.test(l));
  return {
    valor,
    debitos: debitos >= 0 ? moeda(linhas[debitos + 1]) : null,
    creditos: null,
    url: pagina.url(),
    texto: rotulo >= 0 ? `EM ABERTO ${linhas[rotulo + 1] ?? ""}` : "rótulo não encontrado",
  };
}

/**
 * Contas a receber. A tela traz dois totais prontos no topo — "TOTAL
 * FILTRADO" e "AINDA EM ABERTO" —, então não é preciso somar linha a linha:
 * lê-se o número que o usuário lê.
 */
async function lerContasAReceber(pagina) {
  await pagina.goto(`${BASE}/financeiro/receber`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(800);
  const linhas = (await pagina.locator("main").innerText()).split("\n").map((l) => l.trim());

  /** Valor da linha seguinte a um rótulo. */
  const depoisDe = (regex) => {
    const i = linhas.findIndex((l) => regex.test(l));
    if (i < 0) return null;
    for (let j = i; j < Math.min(i + 3, linhas.length); j++) {
      const v = moeda(linhas[j]);
      if (v !== null) return v;
    }
    return null;
  };

  return {
    total: depoisDe(/^total filtrado$/i),
    aberto: depoisDe(/^ainda em aberto$/i),
    contas: Number((linhas.find((l) => /^\d+ contas?$/i.test(l)) ?? "").match(/\d+/)?.[0] ?? 0),
  };
}

/** Painel financeiro nos dois regimes. */
async function lerPainel(pagina, regime) {
  await pagina.goto(`${BASE}/financeiro`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(400);
  const botao = pagina
    .locator("main a, main button")
    .filter({ hasText: new RegExp(`^\\s*${regime}\\s*$`, "i") })
    .first();
  if (await botao.count()) {
    await botao.click().catch(() => {});
    await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await pagina.waitForTimeout(700);
  }
  const texto = await pagina.locator("main").innerText();
  return { texto, valores: todasMoedas(texto), url: pagina.url() };
}

// ------------------------------------------------------------------

async function principal() {
  if (existsSync(SAIDA)) await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  await criarClinica();
  registro("preparo: clínica virgem criada", true, EMAIL);

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });

  // Desliga a abertura automática do guia do Bento ANTES de qualquer script
  // da página rodar. Sem isso, 700 ms depois de cada rota nova o guia abre e
  // seu fundo (`fixed inset-0 z-[60]`) engole o clique seguinte — o robô
  // fica clicando em Salvar e só fechando a capivara.
  await contexto.addInitScript(() => {
    try {
      localStorage.setItem("vethub:guia:automatico", "1");
    } catch {}
  });

  const pagina = await contexto.newPage();

  const erros = [];
  pagina.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 200)));
  pagina.on("response", (r) => r.status() >= 500 && erros.push(`HTTP ${r.status()} ${r.url()}`));

  const conferencia = {};

  try {
    await entrar(pagina);
    registro("login", true, EMAIL);

    if (!(await criarProduto(pagina))) throw new Error("sem produto não dá para vender");
    if (!(await criarTutor(pagina))) throw new Error("sem tutor não dá para fiar");
    if (!(await garantirCaixaAberto(pagina))) throw new Error("sem caixa aberto o PDV não vende");

    await vender(pagina, "A — à vista R$ 100", [{ forma: "dinheiro", valor: "100,00" }]);
    await vender(pagina, "B — fiado R$ 100", [{ forma: "fiado", valor: "100,00" }]);
    await vender(pagina, "C — misto 40 + 60", [
      { forma: "dinheiro", valor: "40,00" },
      { forma: "fiado", valor: "60,00" },
    ]);

    // ---------- conferência ----------
    conferencia.ficha = await lerFichaDoTutor(pagina);
    registro(
      "ficha do tutor: quanto ele deve",
      perto(conferencia.ficha.valor, ESPERADO.aberto),
      `esperado ${ESPERADO.aberto.toFixed(2)} · lido ${conferencia.ficha.valor ?? "não achei"} · "${conferencia.ficha.texto}"`
    );

    conferencia.receber = await lerContasAReceber(pagina);
    registro(
      "contas a receber: total vendido",
      perto(conferencia.receber.total, ESPERADO.vendido),
      `esperado ${ESPERADO.vendido.toFixed(2)} · lido ${conferencia.receber.total ?? "não achei"} em ${conferencia.receber.contas} conta(s)`
    );
    registro(
      "contas a receber: ainda em aberto",
      perto(conferencia.receber.aberto, ESPERADO.aberto),
      `esperado ${ESPERADO.aberto.toFixed(2)} · lido ${conferencia.receber.aberto ?? "não achei"}`
    );

    conferencia.caixa = await lerPainel(pagina, "Caixa");
    registro(
      "painel (Caixa): 140,00 aparece?",
      conferencia.caixa.valores.some((v) => perto(v, ESPERADO.entrou)),
      `esperado ${ESPERADO.entrou.toFixed(2)} · valores na tela: ${conferencia.caixa.valores.slice(0, 12).join(" | ")}`
    );

    conferencia.competencia = await lerPainel(pagina, "Competência");
    registro(
      "painel (Competência): 300,00 aparece?",
      conferencia.competencia.valores.some((v) => perto(v, ESPERADO.vendido)),
      `esperado ${ESPERADO.vendido.toFixed(2)} · valores na tela: ${conferencia.competencia.valores.slice(0, 12).join(" | ")}`
    );

    // A pergunta que originou tudo: ficha e contas a receber concordam?
    registro(
      "ficha do tutor == contas a receber",
      perto(conferencia.ficha.valor, conferencia.receber.aberto),
      `ficha ${conferencia.ficha.valor ?? "?"} · receber ${conferencia.receber.aberto ?? "?"}`
    );

    // O cartão de topo do painel conta por VENCIMENTO. Todo fiado nasce
    // vencendo em 30 dias, então uma venda fiada de hoje não aparece no
    // "a receber no mês" deste mês. O teste registra o que ele mostra para
    // a diferença ficar visível em vez de virar susto.
    conferencia.aReceberNoMes = conferencia.caixa.texto
      .split("\n")
      .map((l) => l.trim())
      .find((l, i, arr) => /a receber no m[eê]s/i.test(arr[i + 1] ?? ""));
    registro(
      "painel: cartão 'A receber no mês' (informativo)",
      true,
      `mostra ${conferencia.aReceberNoMes ?? "?"} — conta por vencimento, e o fiado de hoje vence em 30 dias`
    );

    registro(
      "erros de JavaScript e HTTP 5xx",
      erros.length === 0,
      erros.length ? erros.slice(0, 5).join(" · ") : "nenhum"
    );
  } catch (e) {
    registro("execução", false, e.message);
  } finally {
    await pagina.screenshot({ path: path.join(SAIDA, "ultima-tela.png"), fullPage: true }).catch(() => {});
    await navegador.close();
  }

  const falhas = diario.filter((d) => !d.ok).length;
  const linhas = [
    "# O teste do dinheiro",
    "",
    `- Endereço: ${BASE}`,
    `- Marca dos registros: \`${MARCA}\``,
    `- Passos: ${diario.length} · falhas: ${falhas}`,
    "",
    "## Roteiro",
    "",
    "| Venda | Valor | Pagamento |",
    "| --- | --- | --- |",
    "| A | R$ 100,00 | dinheiro (à vista) |",
    "| B | R$ 100,00 | fiado |",
    "| C | R$ 100,00 | R$ 40,00 dinheiro + R$ 60,00 fiado |",
    "",
    "Se o livro for único, tem que dar:",
    "",
    `- vendido (competência): **R$ ${ESPERADO.vendido.toFixed(2)}**`,
    `- entrou (caixa): **R$ ${ESPERADO.entrou.toFixed(2)}**`,
    `- o tutor deve: **R$ ${ESPERADO.aberto.toFixed(2)}**`,
    "",
    "## Resultado",
    "",
    "| Resultado | Etapa | Detalhe |",
    "| --- | --- | --- |",
    ...diario.map(
      (d) => `| ${d.ok ? "ok" : "**FALHA**"} | ${d.etapa} | ${d.detalhe.replace(/\|/g, "\\|")} |`
    ),
    "",
    "## O que cada tela mostrou",
    "",
    "```json",
    JSON.stringify(conferencia, null, 2).slice(0, 6000),
    "```",
    "",
    `> Os registros \`${MARCA}\` continuam no banco de propósito: se algum número`,
    "> não bateu, é neles que se olha. Apague depois pela interface.",
  ];
  await writeFile(path.join(SAIDA, "relatorio.md"), linhas.join("\n"), "utf8");

  console.log(`\n${diario.length} passos, ${falhas} falhas.`);
  console.log(`Relatório: ${path.relative(process.cwd(), path.join(SAIDA, "relatorio.md"))}`);
  process.exitCode = falhas ? 1 : 0;
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
