/**
 * Testes de cadastro do VetHub: criar → conferir na lista → editar → apagar.
 *
 * Exercita os formulários de verdade, pelo navegador, do jeito que um
 * atendente usaria. Também tenta salvar formulário vazio para conferir se a
 * validação segura.
 *
 * Tudo que ele cria começa com "ZZ Robo" e é apagado no fim. Se algum teste
 * falhar no meio, o registro pode sobrar — o relatório avisa quais.
 *
 * Como rodar:
 *   VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/cadastros.mjs
 */

import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const SAIDA = path.join(AQUI, "resultado-cadastros");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";
const MARCA = `ZZ Robo ${Date.now().toString().slice(-6)}`;

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok  " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

// ------------------------------------------------------------------
// Utilidades de navegação
// ------------------------------------------------------------------

/**
 * O botão de salvar da página — SEMPRE dentro do <main>.
 *
 * O cabeçalho e o menu lateral têm um formulário de "Sair" cada um, e o
 * botão deles também é type=submit. Procurar no documento inteiro pegava o
 * de sair: o robô se deslogava no meio do teste e o resultado saía errado.
 */
const botaoSalvar = (pagina) =>
  pagina.locator('main button[type="submit"]:visible').first();

/** Espera o botão de enviar acender (a validação do formulário é assíncrona). */
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
  await botaoSalvar(pagina).click({ timeout: 15000 });
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(600);
}

/** Preenche um campo pelo id, se ele existir na tela. */
async function preencher(pagina, id, valor) {
  const campo = pagina.locator(`#${id}`);
  if ((await campo.count()) === 0) return false;
  const etiqueta = await campo.evaluate((e) => e.tagName.toLowerCase());
  if (etiqueta === "select") await campo.selectOption({ index: 1 }).catch(() => {});
  else await campo.fill(String(valor));
  return true;
}

/** Escolhe a primeira opção de verdade de um select (pulando o "Selecione…"). */
async function escolherPrimeira(pagina, id) {
  const campo = pagina.locator(`#${id}`);
  if ((await campo.count()) === 0) return null;
  const valores = await campo.evaluate((s) =>
    [...s.options].map((o) => ({ v: o.value, t: o.textContent?.trim() })).filter((o) => o.v)
  );
  if (!valores.length) return null;
  await campo.selectOption(valores[0].v);
  return valores[0].t;
}

/**
 * Abre o menu "⋯" de ações, se a tela tiver um.
 *
 * Nem toda tela mostra Editar e Excluir soltos: quando são três ou mais
 * ações, o sistema junta tudo num menu suspenso (fornecedores faz isso), e
 * os itens nem existem no HTML até o menu abrir.
 */
async function abrirMenuDeAcoes(pagina) {
  const gatilho = pagina.locator('main button[aria-haspopup="menu"]').first();
  if ((await gatilho.count()) === 0) return false;
  await gatilho.click().catch(() => {});
  await pagina.waitForTimeout(350);
  return true;
}

/** Aperta o botão de apagar e confirma na janelinha do sistema. */
async function apagar(pagina) {
  await abrirMenuDeAcoes(pagina);

  const botao = pagina
    .locator("main button")
    .filter({ hasText: /excluir|apagar|remover/i })
    .first();
  if ((await botao.count()) === 0) return "botão de excluir não encontrado";
  await botao.click();

  const confirmar = pagina
    .locator('[role="dialog"] button')
    .filter({ hasText: /excluir|apagar|confirmar|sim/i })
    .last();
  if (await confirmar.count()) await confirmar.click();

  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(800);
  return null;
}

/**
 * Procura o registro na lista e devolve o endereço do detalhe dele.
 *
 * Tenta primeiro com o filtro de busca na URL; se a lista não tiver esse
 * filtro, cai para a lista inteira. Devolve o `href` em vez de clicar: com
 * o endereço na mão dá para navegar direto, sem depender de o clique não
 * ser interceptado por nada que esteja por cima.
 */
async function acharNaLista(pagina, rota, texto) {
  // As listas filtram por `q`; algumas ainda não têm busca. A lista sem
  // filtro é a última tentativa porque ela é paginada — um nome começando
  // com "ZZ" cai na última página e não seria encontrado.
  for (const url of [
    `${BASE}${rota}?q=${encodeURIComponent(texto)}`,
    `${BASE}${rota}?busca=${encodeURIComponent(texto)}`,
    `${BASE}${rota}`,
  ]) {
    await pagina.goto(url, { waitUntil: "networkidle" }).catch(() => {});
    await pagina.waitForTimeout(400);
    const achado = await pagina.evaluate((t) => {
      const alvo = [...document.querySelectorAll("main a")].find((a) =>
        (a.textContent ?? "").includes(t)
      );
      return alvo
        ? { href: alvo.getAttribute("href") }
        : (document.querySelector("main")?.innerText ?? "").includes(t)
          ? { href: null }
          : null;
    }, texto);
    if (achado) return achado;
  }
  return null;
}

/** A lista contém um item com este texto? */
const listaTem = async (pagina, rota, texto) =>
  (await acharNaLista(pagina, rota, texto)) !== null;

/** Abre a página de detalhe do registro. */
async function abrirRegistro(pagina, rota, texto) {
  const achado = await acharNaLista(pagina, rota, texto);
  if (!achado?.href) return false;
  await pagina.goto(`${BASE}${achado.href}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(400);
  return true;
}

// ------------------------------------------------------------------
// Um ciclo completo para uma entidade
// ------------------------------------------------------------------

async function cicloCompleto(pagina, entidade) {
  const { rotulo, lista, novo, campos, nomeId = "nome" } = entidade;
  const nome = `${MARCA} ${rotulo}`;
  const sobrou = [];

  // ---------- validação: enviar vazio não pode passar ----------
  await pagina.goto(`${BASE}${novo}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(800);
  const botaoVazio = botaoSalvar(pagina);
  const bloqueado =
    (await botaoVazio.count()) > 0 ? await botaoVazio.isDisabled() : false;

  if (bloqueado) {
    registro(`${rotulo}: validação`, true, "formulário vazio não envia (botão travado)");
  } else {
    await botaoVazio.click().catch(() => {});
    await pagina.waitForTimeout(1200);
    const aindaNoForm = pagina.url().includes(novo);
    const temErro = await pagina
      .locator('[role="alert"], .text-red-100, .text-red-200, [aria-invalid="true"]')
      .count();
    registro(
      `${rotulo}: validação`,
      aindaNoForm && temErro > 0,
      aindaNoForm
        ? `${temErro} campo(s) reclamaram`
        : "PASSOU DIRETO com o formulário vazio"
    );
  }

  // ---------- criar ----------
  await pagina.goto(`${BASE}${novo}`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(600);
  await preencher(pagina, nomeId, nome);
  for (const [id, valor] of Object.entries(campos ?? {})) {
    if (valor === "@primeira") await escolherPrimeira(pagina, id);
    else await preencher(pagina, id, valor);
  }
  await enviarFormulario(pagina);

  const criou = await listaTem(pagina, lista, nome);
  registro(`${rotulo}: criar`, criou, criou ? nome : "não apareceu na lista");
  if (!criou) {
    await pagina.screenshot({
      path: path.join(SAIDA, `falhou-criar-${rotulo}.png`),
      fullPage: true,
    });
    return sobrou;
  }
  sobrou.push({ rotulo, nome, lista });

  // ---------- editar ----------
  const nomeEditado = `${nome} EDITADO`;
  let editou = false;
  if (await abrirRegistro(pagina, lista, nome)) {
    await abrirMenuDeAcoes(pagina);
    const hrefEditar = await pagina.evaluate(
      () =>
        [...document.querySelectorAll("main a")]
          .find((a) => /editar/i.test(a.textContent ?? ""))
          ?.getAttribute("href") ?? null
    );
    if (hrefEditar) {
      await pagina.goto(`${BASE}${hrefEditar}`, { waitUntil: "networkidle" });
      await pagina.waitForTimeout(500);
      await preencher(pagina, nomeId, nomeEditado);
      await enviarFormulario(pagina);
      editou = await listaTem(pagina, lista, nomeEditado);
    }
  }
  registro(
    `${rotulo}: editar`,
    editou,
    editou ? "nome alterado e refletido na lista" : "não consegui editar"
  );
  const nomeFinal = editou ? nomeEditado : nome;
  sobrou[0] = { rotulo, nome: nomeFinal, lista };

  // ---------- apagar ----------
  let apagou = false;
  let motivo = "";
  if (await abrirRegistro(pagina, lista, nomeFinal)) {
    motivo = (await apagar(pagina)) ?? "";
    apagou = !(await listaTem(pagina, lista, nomeFinal));
  }
  registro(
    `${rotulo}: apagar`,
    apagou,
    apagou ? "sumiu da lista" : motivo || "continua na lista depois de apagar"
  );
  if (apagou) sobrou.length = 0;

  return sobrou;
}

// ------------------------------------------------------------------

const ENTIDADES = [
  {
    rotulo: "tutor",
    lista: "/tutores",
    novo: "/tutores/novo",
    campos: { telefone: "11987654321", email: "" },
  },
  {
    rotulo: "fornecedor",
    lista: "/fornecedores",
    novo: "/fornecedores/novo",
    campos: {},
  },
  {
    rotulo: "produto",
    lista: "/itens",
    novo: "/itens/novo",
    campos: { preco_venda: "10,00", tipo: "@primeira" },
  },
];

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

async function principal() {
  if (!EMAIL || !SENHA) throw new Error("faltou VETHUB_EMAIL / VETHUB_SENHA");
  if (existsSync(SAIDA)) await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  const navegador = await chromium.launch({ headless: true });
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const pagina = await contexto.newPage();

  const errosDeJs = [];
  pagina.on("pageerror", (e) => errosDeJs.push(String(e).slice(0, 200)));
  pagina.on("response", (r) => {
    if (r.status() >= 500) errosDeJs.push(`HTTP ${r.status()} ${r.url().replace(BASE, "")}`);
  });

  await entrar(pagina);
  registro("login", true, EMAIL);
  await pagina
    .evaluate(() => localStorage.setItem("vethub:guia:automatico", "1"))
    .catch(() => {});

  const restos = [];
  for (const entidade of ENTIDADES) {
    try {
      restos.push(...(await cicloCompleto(pagina, entidade)));
    } catch (e) {
      registro(`${entidade.rotulo}: ciclo`, false, String(e).split("\n")[0].slice(0, 180));
    }
  }

  // Faxina: apaga QUALQUER registro "ZZ Robo" que tenha sobrado, inclusive
  // de execuções anteriores que morreram no meio.
  for (const { rotulo, lista } of ENTIDADES) {
    for (let volta = 0; volta < 10; volta++) {
      const achado = await acharNaLista(pagina, lista, "ZZ Robo");
      if (!achado?.href) break;
      await pagina.goto(`${BASE}${achado.href}`, { waitUntil: "networkidle" });
      await pagina.waitForTimeout(300);
      if (await apagar(pagina)) break; // não achou botão de excluir: desiste
      registro(`faxina ${rotulo}`, true, `apagou sobra em ${achado.href}`);
    }
  }

  if (errosDeJs.length) {
    for (const e of [...new Set(errosDeJs)]) registro("erro do servidor/JS", false, e);
  } else {
    registro("erros de JavaScript e HTTP 5xx", true, "nenhum durante os testes");
  }

  await navegador.close();

  const falhas = diario.filter((d) => !d.ok);
  const texto = [
    "# Testes de cadastro",
    "",
    `- Endereço: ${BASE}`,
    `- Marca dos registros de teste: \`${MARCA}\``,
    `- Passos: ${diario.length} · falhas: ${falhas.length}`,
    "",
    "| Resultado | Etapa | Detalhe |",
    "| --- | --- | --- |",
    ...diario.map((d) => `| ${d.ok ? "ok" : "**FALHA**"} | ${d.etapa} | ${d.detalhe} |`),
    "",
    restos.length
      ? `## Sobrou no banco (apagar à mão)\n\n${restos
          .map((r) => `- ${r.nome} em \`${r.lista}\``)
          .join("\n")}`
      : "## Limpeza\n\nNada sobrou no banco.",
  ].join("\n");

  await writeFile(path.join(SAIDA, "relatorio.md"), texto);
  console.log(`\n${diario.length} passos, ${falhas.length} falhas.`);
  console.log(`Relatório: ${path.relative(RAIZ, path.join(SAIDA, "relatorio.md"))}`);
}

principal().catch((e) => {
  console.error("testes de cadastro falharam:", e);
  process.exit(1);
});
