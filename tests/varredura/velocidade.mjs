/**
 * Cronômetro do VetHub: quanto tempo o sistema leva para responder.
 *
 * Mede três coisas diferentes, porque elas doem em lugares diferentes:
 *
 *  1. ABRIR A PÁGINA DIRETO (digitar o endereço / recarregar) — mostra
 *     quanto tempo o servidor leva para montar a página com os dados.
 *  2. TROCAR DE ABA POR DENTRO (clicar no menu) — é o que o usuário faz o
 *     dia inteiro, e o que ele chama de "o site é rápido".
 *  3. CRIAR, EDITAR E APAGAR — do clique em Salvar até a tela seguinte.
 *
 * Cada medida roda algumas vezes e o relatório mostra a MEDIANA (o tempo
 * típico) e o PIOR caso.
 *
 * Como rodar (padrão: produção):
 *   VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/velocidade.mjs
 *   BASE_URL=http://localhost:3000 ... para comparar com a máquina local
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "resultado-velocidade");

const BASE = (process.env.BASE_URL ?? "https://vethub-tau.vercel.app").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";
const VOLTAS = Number(process.env.VOLTAS ?? 3);

/** As telas que a clínica abre o dia inteiro. */
const ROTAS = [
  "/dashboard",
  "/agenda",
  "/agenda/kanban",
  "/agenda/semana",
  "/agenda/mes",
  "/consultas",
  "/tutores",
  "/pets",
  "/banho-tosa",
  "/internacao",
  "/itens",
  "/estoque",
  "/financeiro",
  "/pdv",
  "/relatorios",
  "/relatorios/faturamento",
];

const mediana = (lista) => {
  const s = [...lista].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const ms = (n) => `${Math.round(n)} ms`;

/** Semáforo: o que é rápido, aceitável e lento para o usuário. */
function nota(valor) {
  if (valor < 500) return "excelente";
  if (valor < 1000) return "bom";
  if (valor < 2000) return "aceitável";
  if (valor < 4000) return "lento";
  return "MUITO LENTO";
}

async function entrar(pagina) {
  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  let liberado = false;
  for (let i = 0; i < 3 && !liberado; i++) {
    await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
    await pagina.fill('input[type="password"], input[name="senha"]', SENHA);
    liberado = await pagina
      .waitForFunction(() => !document.querySelector("button[type=submit]")?.disabled, {
        timeout: 10000,
      })
      .then(() => true)
      .catch(() => false);
  }
  if (!liberado) throw new Error("botão Entrar nunca habilitou");
  const inicio = Date.now();
  await pagina.click('button[type="submit"]');
  await pagina
    .waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => {});
  await pagina.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  return Date.now() - inicio;
}

/**
 * Abrir a página direto. Separa o tempo do SERVIDOR (montar o HTML com os
 * dados do banco) do tempo TOTAL até a tela ficar pronta.
 */
async function medirAbertura(pagina, rota) {
  await pagina.goto(`${BASE}${rota}`, { waitUntil: "load", timeout: 45000 });
  const t = await pagina.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    return {
      servidor: n.responseStart - n.requestStart,
      baixar: n.responseEnd - n.responseStart,
      pronta: n.domContentLoadedEventEnd,
    };
  });
  return t;
}

/**
 * Trocar de aba clicando no menu lateral: navegação por dentro, sem
 * recarregar. É o número que mais pesa na sensação de "site liso".
 */
async function medirTrocaDeAba(pagina, rota) {
  // O menu lateral guarda as rotas dentro de categorias fechadas, e ainda
  // existe a barra do celular com os mesmos endereços (invisível aqui).
  // Abrir as categorias e exigir `:visible` resolve os dois.
  const fechadas = pagina.locator('aside nav button[aria-expanded="false"]');
  for (let i = await fechadas.count(); i > 0; i--) {
    await fechadas.first().click().catch(() => {});
    await pagina.waitForTimeout(60);
  }

  const link = pagina.locator(`aside nav a[href="${rota}"]:visible`).first();
  if ((await link.count()) === 0) return null;

  const inicio = Date.now();
  await link.click();
  // Chegou quando a URL virou E a tela de espera (o "esqueleto" cinza que o
  // loading.tsx mostra) já saiu — senão mediríamos só o tempo de trocar a
  // URL, que é instantâneo e não quer dizer nada.
  await pagina
    .waitForFunction(
      (r) =>
        location.pathname === r &&
        !document.querySelector('[data-esqueleto], .animate-pulse'),
      rota,
      { timeout: 30000 }
    )
    .catch(() => {});
  return Date.now() - inicio;
}

async function principal() {
  if (!EMAIL || !SENHA) throw new Error("faltou VETHUB_EMAIL / VETHUB_SENHA");
  if (!existsSync(SAIDA)) await mkdir(SAIDA, { recursive: true });

  const navegador = await chromium.launch({ headless: true });
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const pagina = await contexto.newPage();

  const tempoLogin = await entrar(pagina);
  await pagina.evaluate(() => localStorage.setItem("vethub:guia:automatico", "1"));
  console.log(`login: ${ms(tempoLogin)}\n`);

  // ---------- abrir página direto ----------
  const aberturas = [];
  for (const rota of ROTAS) {
    const amostras = [];
    for (let v = 0; v < VOLTAS; v++) amostras.push(await medirAbertura(pagina, rota));
    const servidor = mediana(amostras.map((a) => a.servidor));
    const pronta = mediana(amostras.map((a) => a.pronta));
    aberturas.push({ rota, servidor, pronta, nota: nota(pronta) });
    console.log(
      `abrir  ${rota.padEnd(26)} servidor ${ms(servidor).padStart(8)}  pronta ${ms(pronta).padStart(8)}  ${nota(pronta)}`
    );
  }

  // ---------- trocar de aba pelo menu ----------
  console.log("");
  const trocas = [];
  await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  for (const rota of ROTAS) {
    const amostras = [];
    for (let v = 0; v < VOLTAS; v++) {
      await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
      const t = await medirTrocaDeAba(pagina, rota);
      if (t !== null) amostras.push(t);
    }
    if (!amostras.length) continue;
    const tipico = mediana(amostras);
    trocas.push({ rota, tipico, pior: Math.max(...amostras), nota: nota(tipico) });
    console.log(
      `trocar ${rota.padEnd(26)} típico ${ms(tipico).padStart(8)}  pior ${ms(Math.max(...amostras)).padStart(8)}  ${nota(tipico)}`
    );
  }

  // ---------- criar, editar, apagar ----------
  console.log("");
  const acoes = [];
  const nome = `ZZ Robo veloc ${Date.now().toString().slice(-5)}`;

  const salvar = async () => {
    await pagina.waitForFunction(
      () => {
        const b = [...document.querySelectorAll('main button[type="submit"]')].find(
          (x) => x.offsetParent !== null
        );
        return b && !b.disabled;
      },
      { timeout: 15000 }
    );
    const inicio = Date.now();
    await pagina.locator('main button[type="submit"]:visible').first().click();
    // Salvar termina quando a tela seguinte está DE PÉ. Esperar só a rede
    // sossegar dava 120ms — o tempo de despachar o pedido, não o de gravar.
    await pagina
      .waitForFunction(
        () =>
          !/\/(novo|nova|editar)$/.test(location.pathname) &&
          !document.querySelector(".animate-pulse"),
        { timeout: 30000 }
      )
      .catch(() => {});
    return Date.now() - inicio;
  };

  await pagina.goto(`${BASE}/fornecedores/novo`, { waitUntil: "networkidle" });
  await pagina.fill("#nome", nome);
  const tCriar = await salvar();
  acoes.push({ acao: "criar fornecedor", tempo: tCriar, nota: nota(tCriar) });
  console.log(`criar  fornecedor              ${ms(tCriar).padStart(8)}  ${nota(tCriar)}`);

  await pagina.goto(`${BASE}/fornecedores?q=${encodeURIComponent(nome)}`, {
    waitUntil: "networkidle",
  });
  const href = await pagina.evaluate(() =>
    [...document.querySelectorAll("main a")]
      .map((a) => a.getAttribute("href"))
      .find((h) => /^\/fornecedores\/[0-9a-f-]{8,}$/.test(h ?? ""))
  );

  if (href) {
    await pagina.goto(`${BASE}${href}/editar`, { waitUntil: "networkidle" });
    await pagina.fill("#nome", `${nome} editado`);
    const tEditar = await salvar();
    acoes.push({ acao: "editar fornecedor", tempo: tEditar, nota: nota(tEditar) });
    console.log(`editar fornecedor              ${ms(tEditar).padStart(8)}  ${nota(tEditar)}`);

    await pagina.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await pagina.click('main button[aria-haspopup="menu"]').catch(() => {});
    await pagina.waitForTimeout(400);
    await pagina.locator("main button").filter({ hasText: /excluir/i }).first().click();
    await pagina.waitForTimeout(500);
    const inicio = Date.now();
    await pagina
      .locator('[role="dialog"] button')
      .filter({ hasText: /confirmar|excluir/i })
      .last()
      .click();
    await pagina.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    const tApagar = Date.now() - inicio;
    acoes.push({ acao: "apagar fornecedor", tempo: tApagar, nota: nota(tApagar) });
    console.log(`apagar fornecedor              ${ms(tApagar).padStart(8)}  ${nota(tApagar)}`);
  }

  await navegador.close();

  const linha = (r) => `| \`${r.rota}\` | ${ms(r.servidor ?? r.tipico)} | ${ms(r.pronta ?? r.pior)} | ${r.nota} |`;
  const texto = [
    "# Velocidade do VetHub",
    "",
    `- Endereço: ${BASE}`,
    `- ${VOLTAS} medidas por item; a tabela mostra a mediana`,
    `- Entrar no sistema: ${ms(tempoLogin)}`,
    "",
    "Régua: até 500 ms excelente · até 1 s bom · até 2 s aceitável · até 4 s lento",
    "",
    "## Abrir a página direto (recarregar)",
    "",
    "| Tela | Servidor | Tela pronta | |",
    "| --- | --- | --- | --- |",
    ...aberturas.map(linha),
    "",
    "## Trocar de aba pelo menu (o dia a dia)",
    "",
    "| Tela | Típico | Pior | |",
    "| --- | --- | --- | --- |",
    ...trocas.map(linha),
    "",
    "## Criar, editar e apagar",
    "",
    "| Ação | Tempo | |",
    "| --- | --- | --- |",
    ...acoes.map((a) => `| ${a.acao} | ${ms(a.tempo)} | ${a.nota} |`),
  ].join("\n");

  await writeFile(path.join(SAIDA, "relatorio.md"), texto);
  console.log(`\nRelatório: tests/varredura/resultado-velocidade/relatorio.md`);
}

principal().catch((e) => {
  console.error("medição falhou:", e);
  process.exit(1);
});
