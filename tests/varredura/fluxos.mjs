/**
 * Os fluxos clínicos, de ponta a ponta.
 *
 * `cadastros.mjs` cobre tutor, fornecedor e produto. `dinheiro.mjs` cobre a
 * venda. Tudo que a clínica faz ENTRE uma coisa e outra — atender, prescrever,
 * internar, orçar, comprar, dar entrada no estoque — nunca teve teste, e é
 * onde mais gente encosta o dedo todo dia.
 *
 * Cada fluxo é independente: um que falhe não impede os outros de rodar, e o
 * relatório diz exatamente em que passo parou.
 *
 * Cria a própria clínica virgem, como `dinheiro.mjs`, para não depender de
 * nada que já exista nem sujar clínica de verdade.
 *
 * Como rodar:
 *   BASE_URL=https://vethub-tau.vercel.app node tests/varredura/fluxos.mjs
 */

import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "resultado-fluxos");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MARCA = `ZZ Robo ${Date.now().toString().slice(-6)}`;

const SUFIXO = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const EMAIL = `zz.robo.fluxos.${SUFIXO}@example.com`;
const SENHA = `RoboFluxos${SUFIXO.slice(-6)}1`;

const diario = [];
const registro = (fluxo, etapa, ok, detalhe = "") => {
  diario.push({ fluxo, etapa, ok, detalhe });
  console.log(`${ok ? "ok   " : "FALHA"} ${fluxo} › ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

const erros = [];

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

async function criarClinica() {
  const r = await fetch(`${BASE}/api/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinica: `${MARCA} clínica`,
      nome: `${MARCA} admin`,
      email: EMAIL,
      senha: SENHA,
    }),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok || !c?.ok) throw new Error(`cadastro recusado (${r.status}): ${c?.erro ?? "?"}`);
}

async function entrar(pagina) {
  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  for (let i = 0; i < 3; i++) {
    await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
    await pagina.fill('input[type="password"], input[name="senha"]', SENHA);
    const ok = await pagina
      .waitForFunction(() => !document.querySelector("button[type=submit]")?.disabled, {
        timeout: 8000,
      })
      .then(() => true)
      .catch(() => false);
    if (ok) break;
  }
  await pagina.click('button[type="submit"]');
  await pagina
    .waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => {});
  if (new URL(pagina.url()).pathname === "/login") throw new Error("login recusado");
}

async function enviar(pagina) {
  await pagina
    .waitForFunction(
      () => {
        const b = [...document.querySelectorAll('main button[type="submit"]')].find(
          (x) => x.offsetParent !== null
        );
        return b && !b.disabled;
      },
      { timeout: 12000 }
    )
    .catch(() => {});
  await pagina.locator('main button[type="submit"]:visible').first().click({ timeout: 15000 });
  await pagina.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await pagina.waitForTimeout(700);
}

/**
 * Por que o formulário não saiu do lugar.
 *
 * Olha a página inteira (não só <main>: o resumo de erros às vezes fica no
 * cabeçalho) e, se não houver aviso nenhum, diz se o botão está travado —
 * que é o outro motivo comum e o mais difícil de adivinhar pelo relatório.
 */
async function avisoDeErro(pagina) {
  const alertas = pagina.locator('[role="alert"]');
  const n = await alertas.count();
  const textos = [];
  for (let i = 0; i < Math.min(n, 4); i++) {
    const t = (await alertas.nth(i).innerText().catch(() => "")).trim().replace(/\s+/g, " ");
    if (t) textos.push(t);
  }
  if (textos.length) return textos.join(" · ").slice(0, 200);

  const botao = await pagina
    .evaluate(() => {
      const b = [...document.querySelectorAll('main button[type="submit"]')].find(
        (x) => x.offsetParent !== null
      );
      if (!b) return "nenhum botão de salvar visível";
      return b.disabled ? `botão "${b.textContent?.trim()}" continua desabilitado` : "";
    })
    .catch(() => "");
  return botao;
}

/** Abre o caixa se estiver fechado — o PDV não funciona sem ele. */
async function garantirCaixa(pagina) {
  await pagina.goto(`${BASE}/pdv`, { waitUntil: "networkidle" });
  const abrir = pagina.locator("main button", { hasText: /abrir caixa/i }).first();
  if ((await abrir.count()) === 0) return true;
  const valor = pagina.locator("#valor_abertura").first();
  if (await valor.count()) await valor.fill("0,00").catch(() => {});
  await abrir.click();
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(900);
  return (await pagina.locator("#pdv-busca-item").count()) > 0;
}

async function preencher(pagina, id, valor) {
  const campo = pagina.locator(`#${id}`);
  if ((await campo.count()) === 0) return false;
  const tag = await campo.evaluate((e) => e.tagName.toLowerCase());
  if (tag === "select") {
    const valores = await campo.evaluate((s) => [...s.options].map((o) => o.value).filter(Boolean));
    if (!valores.length) return false;
    await campo.selectOption(valor && valores.includes(valor) ? valor : valores[0]);
  } else {
    await campo.fill(String(valor));
  }
  return true;
}

async function combobox(pagina, id, texto) {
  const campo = pagina.locator(`#${id}`);
  if ((await campo.count()) === 0) return false;
  await campo.click();
  await campo.fill(texto);
  const opcao = pagina.locator('[role="option"]').first();
  const apareceu = await opcao
    .waitFor({ state: "visible", timeout: 12000 })
    .then(() => true)
    .catch(() => false);
  if (!apareceu) return false;
  await opcao.click();
  await pagina.waitForTimeout(350);
  return true;
}

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hojeBR = () => {
  const [a, m, d] = hojeISO().split("-");
  return `${d}${m}${a}`;
};

/** Saiu da tela de cadastro = o registro foi criado. */
const salvou = (pagina) => !/\/(novo|nova)$/.test(new URL(pagina.url()).pathname);

// ------------------------------------------------------------------
// Preparo comum: um tutor, um pet e um serviço
// ------------------------------------------------------------------

async function preparar(pagina) {
  await pagina.goto(`${BASE}/tutores/novo`, { waitUntil: "networkidle" });
  await preencher(pagina, "nome", `${MARCA} tutor`);
  await preencher(pagina, "telefone", "11999990000");
  const lgpd = pagina.locator('main input[type="checkbox"]').first();
  if (await lgpd.count()) await lgpd.check().catch(() => {});
  await enviar(pagina);
  registro("preparo", "tutor", salvou(pagina), await avisoDeErro(pagina));

  await pagina.goto(`${BASE}/pets/novo`, { waitUntil: "networkidle" });
  await combobox(pagina, "tutor_id", `${MARCA} tutor`);
  await preencher(pagina, "nome", `${MARCA} pet`);
  await preencher(pagina, "especie", "cao");
  await preencher(pagina, "data_nascimento", hojeBR());
  await enviar(pagina);
  const petOk = salvou(pagina);
  registro("preparo", "pet", petOk, await avisoDeErro(pagina));

  await pagina.goto(`${BASE}/itens/novo`, { waitUntil: "networkidle" });
  await preencher(pagina, "nome", `${MARCA} servico`);
  await preencher(pagina, "tipo", "servico");
  await preencher(pagina, "preco_venda", "80,00");
  await enviar(pagina);
  registro("preparo", "serviço de R$ 80,00", salvou(pagina), await avisoDeErro(pagina));

  return petOk;
}

// ------------------------------------------------------------------
// Os fluxos
// ------------------------------------------------------------------

async function fluxoAgenda(pagina) {
  const F = "agenda";
  await pagina.goto(`${BASE}/agenda/novo`, { waitUntil: "networkidle" });
  const achouPet = await combobox(pagina, "pet_id", `${MARCA} pet`);
  registro(F, "escolher o pet", achouPet);
  if (!achouPet) return;

  await preencher(pagina, "veterinario_id", "");
  await preencher(pagina, "data", hojeBR());
  await preencher(pagina, "hora", "14:30");
  await preencher(pagina, "tipo", "");
  await enviar(pagina);
  const criou = salvou(pagina);
  registro(F, "criar agendamento", criou, await avisoDeErro(pagina));
  if (!criou) return;

  // As três visões têm que mostrar o agendamento recém-criado.
  for (const [rota, nome] of [
    ["/agenda", "visão Dia"],
    ["/agenda/semana", "visão Semana"],
    ["/agenda/mes", "visão Mês"],
    ["/agenda/kanban", "quadro Kanban"],
  ]) {
    await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(900);
    const texto = await pagina.locator("main").innerText();
    registro(F, `aparece na ${nome}`, texto.includes(`${MARCA} pet`), rota);
  }

  // Check-in: o botão muda o status do atendimento.
  await pagina.goto(`${BASE}/agenda`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(700);
  const status = pagina.locator("main select").first();
  if (await status.count()) {
    const opcoes = await status.evaluate((s) => [...s.options].map((o) => o.value).filter(Boolean));
    const alvo = opcoes.find((o) => /check_in|checkin|atendimento/.test(o)) ?? opcoes[1];
    if (alvo) {
      await status.selectOption(alvo);
      await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await pagina.waitForTimeout(1000);
      const depois = await pagina.locator("main").innerText();
      registro(F, "mudar status (check-in)", !depois.includes("Erro"), `status → ${alvo}`);
    }
  } else {
    registro(F, "mudar status (check-in)", false, "nenhum seletor de status na lista");
  }
}

async function fluxoConsulta(pagina) {
  const F = "consulta";
  await pagina.goto(`${BASE}/consultas/nova`, { waitUntil: "networkidle" });
  const achouPet = await combobox(pagina, "pet_id", `${MARCA} pet`);
  registro(F, "escolher o pet", achouPet);
  if (!achouPet) return;

  await preencher(pagina, "veterinario_id", "");
  await preencher(pagina, "queixa", "Teste automatizado: apatia há 2 dias.");
  await preencher(pagina, "anamnese", "Sem alterações relevantes.");
  await preencher(pagina, "diagnostico", "Observação clínica.");
  await preencher(pagina, "conduta", "Retorno em 7 dias.");
  await enviar(pagina);
  const criou = salvou(pagina);
  registro(F, "registrar consulta", criou, await avisoDeErro(pagina));
  if (!criou) return;

  await pagina.goto(`${BASE}/consultas`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(700);
  const lista = await pagina.locator("main").innerText();
  registro(F, "aparece na lista", lista.includes(`${MARCA} pet`));

  // O prontuário do pet tem que mostrar a consulta: é o histórico clínico.
  await pagina.goto(`${BASE}/pets`, { waitUntil: "networkidle" });
  const link = pagina.locator('main a[href^="/pets/"]:not([href$="/novo"])').first();
  if (await link.count()) {
    await link.click();
    await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await pagina.waitForTimeout(900);
    const ficha = await pagina.locator("main").innerText();
    registro(F, "consta no histórico do pet", /consulta|prontu|atendimento/i.test(ficha));
  }
}

async function fluxoReceita(pagina) {
  const F = "receita";
  await pagina.goto(`${BASE}/receitas/nova`, { waitUntil: "networkidle" });
  const achouPet = await combobox(pagina, "pet_id", `${MARCA} pet`);
  registro(F, "escolher o pet", achouPet);
  if (!achouPet) return;

  await preencher(pagina, "veterinario_id", "");
  await preencher(pagina, "data", hojeBR());
  await preencher(pagina, "orientacoes", "Administrar após a refeição.");

  // O editor de medicamentos é uma lista de campos livres, identificados
  // pelo placeholder de exemplo (não têm id, porque a linha se repete).
  // `input, textarea`: a posologia é um textarea, e procurar só por input
  // deixava o campo obrigatório vazio — a receita nunca salvava.
  const porExemplo = async (exemplo, valor) => {
    const campo = pagina
      .locator(`main input[placeholder="${exemplo}"], main textarea[placeholder="${exemplo}"]`)
      .first();
    if ((await campo.count()) === 0) return false;
    await campo.fill(valor);
    return true;
  };
  await porExemplo("Ex.: Amoxicilina + clavulanato", "Amoxicilina teste");
  await porExemplo("Ex.: 250 mg", "250 mg");
  await porExemplo("1 comprimido a cada 12 horas por 7 dias", "1 comprimido a cada 12h por 7 dias");

  await enviar(pagina);
  const criou = salvou(pagina);
  registro(F, "emitir receita", criou, await avisoDeErro(pagina));
  if (!criou) return;

  // A via de impressão é o que o tutor leva para a farmácia.
  const url = new URL(pagina.url()).pathname;
  if (/^\/receitas\/[^/]+$/.test(url)) {
    await pagina.goto(`${BASE}${url}/imprimir`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(900);
    const impressao = await pagina.locator("body").innerText();
    registro(
      F,
      "via de impressão abre e traz o pet",
      impressao.includes(`${MARCA} pet`),
      `${url}/imprimir`
    );
  }
}

async function fluxoInternacao(pagina) {
  const F = "internação";
  await pagina.goto(`${BASE}/internacao/nova`, { waitUntil: "networkidle" });
  const achouPet = await combobox(pagina, "pet_id", `${MARCA} pet`);
  registro(F, "escolher o pet", achouPet);
  if (!achouPet) return;

  await preencher(pagina, "veterinario_id", "");
  await preencher(pagina, "data", hojeBR());
  await preencher(pagina, "hora", "09:00");
  await preencher(pagina, "motivo", "Observação de 24h (teste).");
  await enviar(pagina);
  const criou = salvou(pagina);
  registro(F, "internar", criou, await avisoDeErro(pagina));
  if (!criou) return;

  const url = new URL(pagina.url()).pathname;
  await pagina.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(900);

  // A ficha tem DOIS formulários: evolução e prescrição. Pegar "o primeiro
  // textarea" acertava o da prescrição e o teste reclamava de Medicamento e
  // Dose faltando — cada um é enviado pelo botão do seu próprio <form>.
  const enviarDoForm = async (campo) => {
    const form = campo.locator("xpath=ancestor::form[1]");
    const botao = form.locator('button[type="submit"]').first();
    if ((await botao.count()) === 0) return false;
    await botao.click().catch(() => {});
    await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await pagina.waitForTimeout(900);
    return true;
  };

  const evolucao = pagina.locator("#texto").first();
  if (await evolucao.count()) {
    await evolucao.fill("Paciente estável, se alimentando bem (teste).");
    await preencher(pagina, "temperatura", "38,5");
    await preencher(pagina, "frequencia_cardiaca", "120");
    await preencher(pagina, "frequencia_respiratoria", "24");
    await enviarDoForm(evolucao);
    const texto = await pagina.locator("main").innerText();
    registro(F, "registrar evolução", texto.includes("estável"), await avisoDeErro(pagina));
  } else {
    registro(F, "registrar evolução", false, "nenhum campo #texto de evolução na ficha");
  }

  const remedio = pagina.locator("#medicamento").first();
  if (await remedio.count()) {
    await remedio.fill("Dipirona teste");
    await preencher(pagina, "dose", "500 mg");
    await preencher(pagina, "via", "");
    await preencher(pagina, "frequencia_horas", "8");
    await preencher(pagina, "dias", "3");
    await enviarDoForm(remedio);
    const texto = await pagina.locator("main").innerText();
    registro(F, "prescrever medicação", texto.includes("Dipirona teste"), await avisoDeErro(pagina));
  } else {
    registro(F, "prescrever medicação", false, "nenhum campo #medicamento na ficha");
  }

  await pagina.goto(`${BASE}/internacao`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(700);
  const lista = await pagina.locator("main").innerText();
  registro(F, "aparece na lista de internados", lista.includes(`${MARCA} pet`));
}

async function fluxoOrcamento(pagina) {
  const F = "orçamento";
  await pagina.goto(`${BASE}/orcamentos/novo`, { waitUntil: "networkidle" });

  // O orçamento é do PET, não do tutor (o tutor vem junto pelo pet).
  const achouPet = await combobox(pagina, "pet_id", `${MARCA} pet`);
  registro(F, "escolher o pet", achouPet);

  // Aqui o editor NÃO é busca no catálogo como o do PDV: são campos livres
  // (descrição, quantidade, valor), identificados pelos aria-labels.
  const descricao = pagina.locator('main [aria-label="Descrição do item"]').first();
  if (await descricao.count()) {
    await descricao.fill(`${MARCA} servico`);
    const qtd = pagina.locator('main [aria-label="Quantidade"]').first();
    if (await qtd.count()) await qtd.fill("1").catch(() => {});
    const valor = pagina.locator('main [aria-label="Valor unitário em reais"]').first();
    if (await valor.count()) await valor.fill("80,00").catch(() => {});
    registro(F, "adicionar item ao orçamento", true, "R$ 80,00");
    await pagina.waitForTimeout(400);
  } else {
    registro(F, "adicionar item ao orçamento", false, "editor de itens não encontrado");
  }

  await enviar(pagina);
  const criou = salvou(pagina);
  registro(F, "criar orçamento", criou, await avisoDeErro(pagina));
  if (!criou) return;

  // "Cobrar no PDV" só existe depois de APROVAR: em orçamento aberto o botão
  // nem é renderizado. Aprovar primeiro é o caminho que a recepção faz.
  // O botão vive no cabeçalho da página, fora de <main>: procurar só dentro
  // de main não o encontrava. "Aprovando…" é o estado de envio, não o alvo.
  await pagina.waitForTimeout(800);
  const aprovar = pagina
    .locator("button")
    .filter({ hasText: /aprovar/i })
    .filter({ hasNotText: /aprovando/i })
    .first();
  if (await aprovar.count()) {
    await aprovar.click().catch(() => {});
    await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await pagina.waitForTimeout(1000);
    const confirmar = pagina.locator('[role="dialog"] button').filter({ hasText: /aprovar|confirmar|sim/i }).last();
    if (await confirmar.count()) {
      await confirmar.click().catch(() => {});
      await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await pagina.waitForTimeout(1000);
    }
    registro(F, "aprovar orçamento", /aprovado/i.test(await pagina.locator("main").innerText()));
  } else {
    registro(F, "aprovar orçamento", false, "botão Aprovar não encontrado");
  }

  const texto = await pagina.locator("main").innerText();
  const temBotao = /cobrar no pdv/i.test(texto);
  registro(F, "botão Cobrar no PDV existe", temBotao);
  if (temBotao) {
    // Sem caixa aberto o PDV mostra a tela de abertura no lugar do carrinho,
    // e o teste acusaria "item não veio" quando o problema é outro.
    const url = pagina.url();
    registro(F, "caixa aberto para poder cobrar", await garantirCaixa(pagina));
    await pagina.goto(url, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(600);

    await pagina.locator("main a, main button").filter({ hasText: /cobrar no pdv/i }).first().click().catch(() => {});
    await pagina.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await pagina.waitForTimeout(1200);
    const noPdv = new URL(pagina.url()).pathname.startsWith("/pdv");
    const carrinho = await pagina.locator("main").innerText();
    registro(
      F,
      "abre o PDV com o item no carrinho",
      noPdv && carrinho.includes(`${MARCA} servico`),
      noPdv ? "" : `foi para ${new URL(pagina.url()).pathname}`
    );
  }
}

async function fluxoCompraEstoque(pagina) {
  const F = "compra e estoque";

  await pagina.goto(`${BASE}/fornecedores/novo`, { waitUntil: "networkidle" });
  await preencher(pagina, "nome", `${MARCA} fornecedor`);
  await enviar(pagina);
  registro(F, "cadastrar fornecedor", salvou(pagina), await avisoDeErro(pagina));

  // Produto que controla estoque, para a entrada ter onde cair.
  await pagina.goto(`${BASE}/itens/novo`, { waitUntil: "networkidle" });
  await preencher(pagina, "nome", `${MARCA} racao`);
  await preencher(pagina, "tipo", "produto");
  await preencher(pagina, "preco_venda", "200,00");
  // Produto que controla estoque exige unidade de medida (kg, un, cx…).
  await preencher(pagina, "unidade_id", "");
  await preencher(pagina, "grupo_id", "");
  const controla = pagina.locator('main input[type="checkbox"]');
  const n = await controla.count();
  for (let i = 0; i < n; i++) {
    const rotulo = await controla.nth(i).evaluate((el) => el.closest("label")?.textContent ?? "");
    if (/estoque/i.test(rotulo)) await controla.nth(i).check().catch(() => {});
  }
  await enviar(pagina);
  registro(F, "cadastrar produto com estoque", salvou(pagina), await avisoDeErro(pagina));

  await pagina.goto(`${BASE}/compras/nova`, { waitUntil: "networkidle" });
  const temFornecedor = await combobox(pagina, "fornecedor_id", `${MARCA} fornecedor`).catch(() => false);
  if (!temFornecedor) {
    const sel = pagina.locator("#fornecedor_id");
    if (await sel.count()) await preencher(pagina, "fornecedor_id", "");
  }
  await preencher(pagina, "data", hojeBR());
  // Condição de pagamento: o schema exige as duas, e sem elas a compra é
  // recusada em silêncio (o formulário só não sai do lugar).
  await preencher(pagina, "prazo_dias", "30");
  await preencher(pagina, "parcelas", "2");

  // O item da compra tem descrição livre + quantidade + valor; o combobox
  // "Produto do catálogo" só amarra a entrada ao item já cadastrado.
  // Aqui "Produto do catálogo" é um <select> comum (a lista de itens já
  // cadastrados), não a busca do PDV: escolher pelo texto da opção.
  const doCatalogo = pagina.locator('main select[aria-label="Produto do catálogo"]').first();
  if (await doCatalogo.count()) {
    const escolheu = await doCatalogo
      .selectOption({ label: new RegExp(`${MARCA} racao`) })
      .then(() => true)
      .catch(async () => {
        const valores = await doCatalogo.evaluate((s) =>
          [...s.options].filter((o) => o.value).map((o) => ({ v: o.value, t: o.textContent ?? "" }))
        );
        const alvo = valores.find((o) => o.t.includes("racao")) ?? valores[0];
        if (!alvo) return false;
        await doCatalogo.selectOption(alvo.v);
        return true;
      });
    registro(F, "vincular item ao catálogo", escolheu);
    await pagina.waitForTimeout(600);
  }
  const desc = pagina.locator('main [aria-label="Descrição do item"]').first();
  if (await desc.count()) {
    const atual = await desc.inputValue().catch(() => "");
    if (!atual) await desc.fill(`${MARCA} racao`);
    const qtd = pagina.locator('main [aria-label="Quantidade"]').first();
    if (await qtd.count()) await qtd.fill("10").catch(() => {});
    const valor = pagina.locator('main [aria-label="Valor unitário em reais"]').first();
    if (await valor.count()) await valor.fill("200,00").catch(() => {});
    registro(F, "adicionar item à compra", true, "10 × R$ 200,00");
  } else {
    registro(F, "adicionar item à compra", false, "editor de itens não encontrado");
  }

  // Frete: precisa entrar no custo do produto, rateado.
  const frete = pagina.locator("#frete").first();
  if (await frete.count()) {
    await frete.fill("35,00").catch(() => {});
    registro(F, "campo de frete existe", true, "R$ 35,00");
  } else {
    registro(F, "campo de frete existe", false, "não achei o campo de frete");
  }

  await enviar(pagina);
  const comprou = salvou(pagina);
  registro(F, "registrar compra", comprou, await avisoDeErro(pagina));

  // A compra nasce PENDENTE: lançar a nota não é receber a mercadoria. Só o
  // "Receber mercadoria" dá entrada no estoque, atualiza o custo e gera as
  // contas a pagar. Sem este passo o teste acusaria falta de conta a pagar
  // como defeito, quando é a etapa que ainda não aconteceu.
  if (comprou) {
    const receber = pagina
      .locator("button")
      .filter({ hasText: /receber mercadoria/i })
      .first();
    if (await receber.count()) {
      await receber.click().catch(() => {});
      await pagina.waitForTimeout(600);
      const confirmar = pagina
        .locator('[role="dialog"] button')
        .filter({ hasText: /receber|confirmar|sim/i })
        .last();
      if (await confirmar.count()) await confirmar.click().catch(() => {});
      await pagina.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
      await pagina.waitForTimeout(1200);
      const texto = await pagina.locator("main").innerText();
      registro(F, "receber mercadoria", /recebida/i.test(texto), await avisoDeErro(pagina));
    } else {
      registro(F, "receber mercadoria", false, "botão Receber mercadoria não encontrado");
    }
  }

  await pagina.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(900);
  const estoque = await pagina.locator("main").innerText();
  registro(F, "produto aparece no estoque", estoque.includes(`${MARCA} racao`));

  // A compra tem que virar conta a pagar — é o outro lado do livro único.
  // A compra tem que virar conta a pagar — uma por parcela. Pedimos 2
  // parcelas, então o esperado são 2 contas de R$ 1.017,50 (2.000 + 35 de
  // frete, dividido por 2).
  await pagina.goto(`${BASE}/financeiro/pagar`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1200);
  const pagar = await pagina.locator("main").innerText();
  const valores = [...pagar.matchAll(/[\d.]+,\d{2}/g)].map((m) => m[0]);
  const vazio = /nenhuma conta|nada por aqui|sem contas/i.test(pagar);
  registro(
    F,
    "compra virou conta a pagar",
    comprou && !vazio && valores.length > 0,
    comprou
      ? `valores na tela: ${valores.slice(0, 6).join(" | ") || "nenhum"}${vazio ? " · tela diz que está vazia" : ""}`
      : "(a compra não foi criada)"
  );
}

async function fluxoRelatorios(pagina) {
  const F = "relatórios";
  const rotas = [
    "/relatorios",
    "/relatorios/atendimentos",
    "/relatorios/clientes",
    "/relatorios/estoque",
    "/relatorios/faturamento",
    "/relatorios/financeiro",
    "/relatorios/insumos",
    "/relatorios/vacinas",
  ];
  for (const rota of rotas) {
    await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(700);
    const texto = await pagina.locator("main").innerText();
    const quebrou = /application error|erro inesperado|something went wrong/i.test(texto);
    registro(F, `abre ${rota}`, !quebrou, quebrou ? "tela de erro" : "");
  }
}

// ------------------------------------------------------------------

async function principal() {
  if (existsSync(SAIDA)) await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  await criarClinica();
  // A senha vai para o relatório de propósito: a clínica é descartável e
  // existe só para ser inspecionada quando algum número não bater.
  registro("preparo", "clínica virgem", true, `${EMAIL} / ${SENHA}`);

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  await contexto.addInitScript(() => {
    try {
      localStorage.setItem("vethub:guia:automatico", "1");
    } catch {}
  });
  const pagina = await contexto.newPage();
  pagina.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 160)));
  pagina.on("response", (r) => r.status() >= 500 && erros.push(`HTTP ${r.status()} ${r.url()}`));

  try {
    await entrar(pagina);
    registro("preparo", "login", true, EMAIL);
    await preparar(pagina);

    const fluxos = [
      ["agenda", fluxoAgenda],
      ["consulta", fluxoConsulta],
      ["receita", fluxoReceita],
      ["internação", fluxoInternacao],
      ["orçamento", fluxoOrcamento],
      ["compra e estoque", fluxoCompraEstoque],
      ["relatórios", fluxoRelatorios],
    ];

    // Cada fluxo é isolado: o que quebrar não derruba os outros.
    for (const [nome, fn] of fluxos) {
      try {
        await fn(pagina);
      } catch (e) {
        registro(nome, "interrompido por exceção", false, e.message.slice(0, 140));
      }
    }
  } catch (e) {
    registro("execução", "falhou antes dos fluxos", false, e.message.slice(0, 160));
  } finally {
    await pagina
      .screenshot({ path: path.join(SAIDA, "ultima-tela.png"), fullPage: true })
      .catch(() => {});
    await navegador.close();
  }

  registro("geral", "erros de JavaScript e HTTP 5xx", erros.length === 0, erros.slice(0, 6).join(" · ") || "nenhum");

  const falhas = diario.filter((d) => !d.ok);
  const porFluxo = new Map();
  for (const d of diario) {
    if (!porFluxo.has(d.fluxo)) porFluxo.set(d.fluxo, []);
    porFluxo.get(d.fluxo).push(d);
  }

  const linhas = [
    "# Fluxos clínicos, de ponta a ponta",
    "",
    `- Endereço: ${BASE}`,
    `- Clínica de teste: \`${MARCA} clínica\` (${EMAIL})`,
    `- Passos: ${diario.length} · falhas: **${falhas.length}**`,
    "",
    "## Placar por fluxo",
    "",
    "| Fluxo | Passos | Falhas |",
    "| --- | --- | --- |",
    ...[...porFluxo.entries()].map(([f, ps]) => {
      const ruins = ps.filter((p) => !p.ok).length;
      return `| ${f} | ${ps.length} | ${ruins === 0 ? "—" : `**${ruins}**`} |`;
    }),
    "",
  ];

  if (falhas.length) {
    linhas.push("## O que falhou", "", "| Fluxo | Etapa | Detalhe |", "| --- | --- | --- |");
    for (const f of falhas) {
      linhas.push(`| ${f.fluxo} | ${f.etapa} | ${(f.detalhe || "—").replace(/\|/g, "\\|")} |`);
    }
    linhas.push("");
  }

  linhas.push("## Tudo, na ordem", "", "| Resultado | Fluxo | Etapa | Detalhe |", "| --- | --- | --- | --- |");
  for (const d of diario) {
    linhas.push(
      `| ${d.ok ? "ok" : "**FALHA**"} | ${d.fluxo} | ${d.etapa} | ${(d.detalhe || "").replace(/\|/g, "\\|")} |`
    );
  }

  await writeFile(path.join(SAIDA, "relatorio.md"), linhas.join("\n"), "utf8");
  console.log(`\n${diario.length} passos, ${falhas.length} falhas.`);
  console.log(`Relatório: ${path.relative(process.cwd(), path.join(SAIDA, "relatorio.md"))}`);
  process.exitCode = falhas.length ? 1 : 0;
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
