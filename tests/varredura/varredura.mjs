/**
 * Varredura do VetHub com navegador de verdade (Playwright).
 *
 * Abre cada página do sistema em tela de computador E de celular, tira print
 * e anota tudo que o navegador reclamou por baixo do pano: erro de console,
 * requisição que falhou, página que voltou 500, barra de rolagem lateral
 * indevida, elemento estourando a tela.
 *
 * Como rodar:
 *   node tests/varredura/varredura.mjs
 *
 * Variáveis de ambiente (todas opcionais):
 *   BASE_URL        endereço do site        (padrão http://localhost:3000)
 *   VETHUB_EMAIL    login para entrar       (sem ele, só as páginas públicas)
 *   VETHUB_SENHA    senha do login
 *   MAX_DETALHE     quantas páginas de detalhe visitar (padrão 12)
 *
 * A saída fica em tests/varredura/resultado:
 *   prints/computador/*.png   prints/celular/*.png   relatorio.md   bruto.json
 */

import { chromium } from "playwright";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const SAIDA = path.join(AQUI, "resultado");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";
const MAX_DETALHE = Number(process.env.MAX_DETALHE ?? 12);

const TELAS = [
  { nome: "computador", largura: 1440, altura: 900 },
  { nome: "celular", largura: 390, altura: 844 },
];

/** Rotas que não devem ser visitadas na varredura. */
const PROIBIDAS = [
  /^\/api\//,
  /\/imprimir$/, // abre diálogo de impressão e trava o navegador
  /^\/logout/,
];

// ------------------------------------------------------------------
// Descobre as rotas lendo a pasta src/app (assim a lista nunca envelhece)
// ------------------------------------------------------------------

/** Segmento que só organiza pastas, sem virar pedaço da URL: (app), (publico). */
const ehGrupo = (s) => s.startsWith("(") && s.endsWith(")");
/** Segmento dinâmico: [id], [...slug]. Precisa de um valor real para visitar. */
const ehDinamico = (s) => s.startsWith("[");

async function rotasEstaticas(dir = path.join(RAIZ, "src/app"), prefixo = "") {
  const achadas = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (!item.isDirectory()) {
      if (item.name === "page.tsx") achadas.push(prefixo || "/");
      continue;
    }
    if (ehDinamico(item.name)) continue; // fica para a fase 2
    const parte = ehGrupo(item.name) ? prefixo : `${prefixo}/${item.name}`;
    achadas.push(...(await rotasEstaticas(path.join(dir, item.name), parte)));
  }
  return achadas;
}

// ------------------------------------------------------------------
// Coleta de problemas de uma página
// ------------------------------------------------------------------

const apelido = (rota) =>
  rota === "/" ? "raiz" : rota.replace(/^\//, "").replace(/[/?=&]/g, "_");

/**
 * Mede a página por dentro: barra lateral indevida, quem está estourando,
 * imagem quebrada e o título que o usuário lê.
 */
const MEDIR = () => {
  const larguraTela = document.documentElement.clientWidth;

  /**
   * Passar da borda da tela só é defeito quando NÃO é de propósito.
   * Dentro de uma área que rola na horizontal (tabela de relatório, quadro
   * kanban) o conteúdo maior que a tela é o desenho, não um erro.
   *
   * Atenção: aqui olha só os PAIS. O próprio elemento continua valendo,
   * porque foi exatamente assim que apareceu o anel do botão do guia
   * estourando a lateral em toda página do celular.
   */
  const dentroDeAreaQueRola = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (["auto", "scroll"].includes(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };

  const estourando = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // 2px de tolerância para arredondamento de sub-pixel
    if (r.right > larguraTela + 2 || r.left < -2) {
      const estilo = getComputedStyle(el);
      if (
        estilo.visibility === "hidden" ||
        estilo.position === "fixed" ||
        dentroDeAreaQueRola(el)
      ) {
        continue;
      }
      estourando.push(
        `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${
          (el.className?.toString?.() ?? "").split(" ").slice(0, 3).join(".")
        } → ${Math.round(r.left)}..${Math.round(r.right)}px`
      );
    }
    if (estourando.length >= 5) break;
  }

  const imagensQuebradas = [...document.querySelectorAll("img")]
    .filter((i) => i.complete && i.naturalWidth === 0)
    .map((i) => i.getAttribute("src"))
    .slice(0, 5);

  const links = [...document.querySelectorAll('a[href^="/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && !h.startsWith("//"));

  return {
    rolagemLateral:
      document.documentElement.scrollWidth > larguraTela + 2
        ? `${document.documentElement.scrollWidth}px de conteúdo em ${larguraTela}px de tela`
        : null,
    estourando,
    imagensQuebradas,
    titulo: document.querySelector("h1")?.textContent?.trim() ?? null,
    // faixas vermelhas de erro que o próprio sistema mostra
    avisoDeErro:
      [...document.querySelectorAll('[role="alert"], .bg-red-400\\/25')]
        .map((e) => e.textContent?.trim())
        .filter(Boolean)
        .slice(0, 3),
    links: [...new Set(links)],
  };
};

async function visitar(pagina, rota, tela, achados, linksVistos) {
  const problemas = { console: [], rede: [], pagina: [] };

  const ouvirConsole = (msg) => {
    if (msg.type() !== "error") return;
    const texto = msg.text();
    // ruído conhecido do modo de desenvolvimento, não é problema do sistema
    if (/Download the React DevTools|Fast Refresh|hydrat/i.test(texto)) return;
    problemas.console.push(texto.slice(0, 300));
  };
  const ouvirErroDePagina = (e) => problemas.pagina.push(String(e).slice(0, 300));
  const ouvirResposta = (r) => {
    if (r.status() >= 400) {
      problemas.rede.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 160)}`);
    }
  };

  pagina.on("console", ouvirConsole);
  pagina.on("pageerror", ouvirErroDePagina);
  pagina.on("response", ouvirResposta);

  let status = null;
  let erroDeNavegacao = null;
  try {
    const resposta = await pagina.goto(`${BASE}${rota}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    status = resposta?.status() ?? null;
    await pagina.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    // deixa o guia do Bento abrir (ele espera 700ms) antes do print
    await pagina.waitForTimeout(1100);
  } catch (e) {
    erroDeNavegacao = String(e).split("\n")[0].slice(0, 200);
  }

  const urlFinal = new URL(pagina.url()).pathname;
  const medida = erroDeNavegacao ? null : await pagina.evaluate(MEDIR).catch(() => null);

  const arquivo = path.join(SAIDA, "prints", tela.nome, `${apelido(rota)}.png`);
  await pagina
    .screenshot({ path: arquivo, fullPage: true, animations: "disabled" })
    .catch(() => {});

  pagina.off("console", ouvirConsole);
  pagina.off("pageerror", ouvirErroDePagina);
  pagina.off("response", ouvirResposta);

  for (const l of medida?.links ?? []) linksVistos.add(l);

  achados.push({
    rota,
    tela: tela.nome,
    status,
    redirecionouPara: urlFinal !== rota ? urlFinal : null,
    erroDeNavegacao,
    print: path.relative(RAIZ, arquivo).replace(/\\/g, "/"),
    ...(medida
      ? {
          titulo: medida.titulo,
          rolagemLateral: medida.rolagemLateral,
          estourando: medida.estourando,
          imagensQuebradas: medida.imagensQuebradas,
          avisoDeErro: medida.avisoDeErro,
        }
      : {}),
    problemas,
  });
}

// ------------------------------------------------------------------
// Entrada no sistema
// ------------------------------------------------------------------

const botaoLiberado = () =>
  !document.querySelector("button[type=submit]")?.disabled;

async function entrar(pagina) {
  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });

  // Duas armadilhas aqui:
  // 1. se preencher antes de o React hidratar, a hidratação zera os campos
  //    e o formulário nunca fica válido;
  // 2. o botão nasce desabilitado e só acende quando a validação termina,
  //    que é assíncrona. Clicar antes disso não faz nada.
  // Por isso: preenche, espera o botão acender, e se não acender, preenche
  // de novo — é o jeito de atravessar a corrida sem chutar um sleep grande.
  let liberado = false;
  for (let tentativa = 1; tentativa <= 3 && !liberado; tentativa++) {
    await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
    await pagina.fill('input[type="password"], input[name="senha"]', SENHA);
    liberado = await pagina
      .waitForFunction(botaoLiberado, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
  }
  if (!liberado) throw new Error("o botão Entrar nunca ficou habilitado");

  await pagina.click('button[type="submit"]');

  await pagina
    .waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 25000 })
    .catch(() => {});
  await pagina.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const onde = new URL(pagina.url()).pathname;
  if (onde === "/login") {
    const aviso = await pagina
      .locator('[role="alert"], .text-red-50')
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(`login recusado${aviso ? `: ${aviso.trim()}` : ""}`);
  }
  return onde;
}

// ------------------------------------------------------------------
// Relatório
// ------------------------------------------------------------------

function montarRelatorio(achados, contexto) {
  const linhas = [];
  linhas.push("# Varredura do VetHub\n");
  linhas.push(`- Endereço: ${BASE}`);
  linhas.push(`- Autenticado: ${contexto.autenticado ? "sim" : "não (só páginas públicas)"}`);
  linhas.push(`- Páginas visitadas: ${contexto.rotas} (× ${TELAS.length} telas)`);
  linhas.push(`- Prints: \`tests/varredura/resultado/prints\`\n`);

  const grave = (a) =>
    a.erroDeNavegacao ||
    (a.status && a.status >= 400) ||
    a.problemas.pagina.length ||
    a.problemas.console.length ||
    a.problemas.rede.length ||
    a.imagensQuebradas?.length ||
    a.avisoDeErro?.length;

  const comProblema = achados.filter(grave);
  const comLayout = achados.filter((a) => a.rolagemLateral || a.estourando?.length);

  linhas.push(`## Erros de funcionamento (${comProblema.length})\n`);
  if (!comProblema.length) linhas.push("Nada. Nenhuma página quebrou.\n");
  for (const a of comProblema) {
    linhas.push(`### \`${a.rota}\` — ${a.tela}`);
    if (a.erroDeNavegacao) linhas.push(`- **não abriu:** ${a.erroDeNavegacao}`);
    if (a.status && a.status >= 400) linhas.push(`- **HTTP ${a.status}**`);
    for (const p of a.problemas.pagina) linhas.push(`- **erro de JavaScript:** ${p}`);
    for (const p of a.problemas.console) linhas.push(`- console: ${p}`);
    for (const p of a.problemas.rede) linhas.push(`- requisição falhou: ${p}`);
    for (const p of a.imagensQuebradas ?? []) linhas.push(`- imagem quebrada: ${p}`);
    for (const p of a.avisoDeErro ?? []) linhas.push(`- faixa de erro na tela: ${p}`);
    linhas.push("");
  }

  linhas.push(`## Layout estourando (${comLayout.length})\n`);
  if (!comLayout.length) linhas.push("Nada. Nenhuma página com rolagem lateral indevida.\n");
  for (const a of comLayout) {
    linhas.push(`### \`${a.rota}\` — ${a.tela}`);
    if (a.rolagemLateral) linhas.push(`- rolagem lateral: ${a.rolagemLateral}`);
    for (const e of a.estourando ?? []) linhas.push(`- estoura a tela: ${e}`);
    linhas.push("");
  }

  linhas.push("## Todas as páginas\n");
  linhas.push("| Rota | Tela | HTTP | Título | Print |");
  linhas.push("| --- | --- | --- | --- | --- |");
  for (const a of achados) {
    linhas.push(
      `| \`${a.rota}\` | ${a.tela} | ${a.status ?? "—"} | ${a.titulo ?? "—"} | ${a.print} |`
    );
  }

  return linhas.join("\n");
}

// ------------------------------------------------------------------

async function principal() {
  if (existsSync(SAIDA)) await rm(SAIDA, { recursive: true, force: true });
  for (const t of TELAS) await mkdir(path.join(SAIDA, "prints", t.nome), { recursive: true });

  const todas = (await rotasEstaticas())
    .filter((r) => !PROIBIDAS.some((p) => p.test(r)))
    .sort();

  const navegador = await chromium.launch({ headless: true });
  const achados = [];
  const linksVistos = new Set();
  let autenticado = false;

  for (const tela of TELAS) {
    const contexto = await navegador.newContext({
      viewport: { width: tela.largura, height: tela.altura },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      isMobile: tela.nome === "celular",
      hasTouch: tela.nome === "celular",
      deviceScaleFactor: 1,
    });
    const pagina = await contexto.newPage();

    if (EMAIL && SENHA) {
      try {
        const destino = await entrar(pagina);
        autenticado = true;
        console.log(`[${tela.nome}] entrou, caiu em ${destino}`);
      } catch (e) {
        console.log(`[${tela.nome}] ${e.message}`);
      }
    }

    // O guia do Bento abre sozinho e cobre a tela do print: desliga o
    // automático (a chave é a mesma que o botão "Não abrir sozinho" grava).
    await pagina
      .evaluate(() => localStorage.setItem("vethub:guia:automatico", "1"))
      .catch(() => {});

    for (const rota of todas) {
      await visitar(pagina, rota, tela, achados, linksVistos);
      process.stdout.write(".");
    }

    // Fase 2: páginas de detalhe (/tutores/<id>, /pets/<id>…) descobertas
    // nos links das listas.
    const detalhes = [...linksVistos]
      .filter((l) => !todas.includes(l) && !PROIBIDAS.some((p) => p.test(l)))
      .filter((l) => l.split("/").length > 2)
      .slice(0, MAX_DETALHE);

    for (const rota of detalhes) {
      await visitar(pagina, rota, tela, achados, new Set());
      process.stdout.write("+");
    }

    console.log(`\n[${tela.nome}] ${todas.length + detalhes.length} páginas`);
    await contexto.close();
  }

  await navegador.close();

  const rotas = new Set(achados.map((a) => a.rota)).size;
  await writeFile(path.join(SAIDA, "bruto.json"), JSON.stringify(achados, null, 2));
  await writeFile(
    path.join(SAIDA, "relatorio.md"),
    montarRelatorio(achados, { autenticado, rotas })
  );

  console.log(`\nPronto. ${achados.length} visitas, ${rotas} rotas.`);
  console.log(`Relatório: tests/varredura/resultado/relatorio.md`);
}

principal().catch((e) => {
  console.error("varredura falhou:", e);
  process.exit(1);
});
