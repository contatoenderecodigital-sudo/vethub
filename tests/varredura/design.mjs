/**
 * Auditoria de design e acessibilidade das 76 telas.
 *
 * A `varredura.mjs` responde "a página quebrou?". Esta responde "a página
 * está usável?" — que é outra pergunta e falha por outros motivos:
 *
 *   * texto que ninguém lê (contraste abaixo do mínimo da norma)
 *   * botão que o dedo não acerta no celular (< 44 px)
 *   * campo sem etiqueta, ícone sem nome (leitor de tela fica mudo)
 *   * foco invisível (quem navega de Tab se perde)
 *   * emoji na interface (o sistema usa Lucide; emoji é escorregão)
 *   * texto em inglês vazando numa interface em português
 *   * elemento passando da borda da tela
 *
 * Roda nas três larguras que importam: celular, tablet e notebook, nos dois
 * modos (claro e escuro), porque o modo claro tem um caminho de CSS próprio
 * e já escondeu defeito antes.
 *
 * Como rodar:
 *   BASE_URL=http://localhost:3000 VETHUB_EMAIL=... VETHUB_SENHA=... \
 *   node --env-file=.env.local tests/varredura/design.mjs
 */

import { chromium } from "playwright";
import { mkdir, rm, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const SAIDA = path.join(AQUI, "resultado-design");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";

/** Mínimo da norma (WCAG AA): 4.5 para texto normal, 3.0 para texto grande. */
const AA_NORMAL = 4.5;
const AA_GRANDE = 3.0;
/** Alvo de toque: 24px é o mínimo da norma AA; 44px é o conforto AAA. */
const ALVO_AA = 24;
const ALVO_MIN = 44;

const TELAS = [
  { nome: "celular", largura: 390, altura: 844, toque: true },
  { nome: "tablet", largura: 768, altura: 1024, toque: true },
  { nome: "notebook", largura: 1440, altura: 900, toque: false },
];

const achados = [];
const anotar = (tipo, rota, tela, modo, detalhe) =>
  achados.push({ tipo, rota, tela, modo, detalhe });

// ------------------------------------------------------------------
// Descobrir as rotas lendo src/app — a lista nunca envelhece
// ------------------------------------------------------------------

async function rotasDoProjeto() {
  const base = path.join(RAIZ, "src", "app");
  const rotas = new Set();

  async function andar(dir, url) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) {
        if (/^page\.(tsx|ts|jsx|js)$/.test(item.name)) rotas.add(url || "/");
        continue;
      }
      const nome = item.name;
      if (nome.startsWith("_") || nome === "api") continue;
      // (grupos) não entram na URL; [dinamicos] precisam de id real
      if (nome.startsWith("(") && nome.endsWith(")")) {
        await andar(path.join(dir, nome), url);
      } else if (nome.startsWith("[")) {
        continue;
      } else {
        await andar(path.join(dir, nome), `${url}/${nome}`);
      }
    }
  }

  await andar(base, "");
  return [...rotas].sort();
}

// ------------------------------------------------------------------
// A auditoria roda DENTRO da página
// ------------------------------------------------------------------

/**
 * Tudo que segue roda no navegador. Devolve só os achados, já resumidos:
 * trafegar o DOM inteiro de volta seria lento e inútil.
 */
function auditarNaPagina({ AA_NORMAL, AA_GRANDE, ALVO_MIN, ALVO_AA, exigirToque }) {
  const problemas = [];
  const reg = (tipo, detalhe) => problemas.push({ tipo, detalhe });

  const texto = (el) => (el.textContent ?? "").trim();
  const visivel = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // ---------- contraste ----------
  const canal = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b]) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  /**
   * Lê uma cor CSS — QUALQUER cor CSS.
   *
   * Escrever um parser à mão foi erro caro. O Chrome devolve `rgb()` para as
   * cores antigas, `color(srgb …)` para o que veio de `color-mix()`, e o
   * Tailwind v4 usa `oklch()` na paleta inteira. Cada escritura que o parser
   * não conhecia virava "sem cor", e daí saíam milhares de reprovações
   * inventadas — o cabeçalho da marca chegou a "reprovar" com 1.10:1 contra
   * um fundo branco que não existia.
   *
   * Em vez de perseguir formatos, o trabalho é do próprio navegador: pinta-se
   * a cor num canvas de 1×1 e lê-se o pixel. O que o Chrome sabe desenhar,
   * ele sabe converter — inclusive o que for inventado depois disto aqui.
   */
  const pincel = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true,
  });
  const cacheCor = new Map();

  const parse = (cor) => {
    if (!cor || cor === "none") return null;
    if (cacheCor.has(cor)) return cacheCor.get(cor);

    let saida = null;
    try {
      // fillStyle inválido é ignorado silenciosamente pelo canvas, então a
      // tela é limpa antes: sobrar a cor anterior daria medição errada.
      pincel.clearRect(0, 0, 1, 1);
      pincel.fillStyle = "#000";
      pincel.fillStyle = cor;
      pincel.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = pincel.getImageData(0, 0, 1, 1).data;
      // `getImageData` devolve a cor NÃO pré-multiplicada: r/g/b já são a cor
      // pura e o alfa vem à parte. Dividir a cor pelo alfa (como se fosse
      // pré-multiplicada) estourava o valor — branco a 50% virava 508 — e
      // produzia contrastes impossíveis, tipo 1.91:1 para texto branco sobre
      // verde escuro.
      saida = { rgb: [r, g, b], a: a / 255 };
    } catch {
      saida = null;
    }

    cacheCor.set(cor, saida);
    return saida;
  };
  /**
   * Cor média de um gradiente CSS.
   *
   * Sem isto o medidor enxergava "transparente" onde o app pinta um degradê —
   * e o cabeçalho verde da marca era lido como fundo branco, fazendo o texto
   * branco reprovar com 1.10:1. Gradiente não é cor exata, mas a média das
   * paradas é infinitamente mais perto da verdade que ignorá-lo.
   */
  const doGradiente = (imagem) => {
    if (!imagem || imagem === "none" || !/gradient/.test(imagem)) return null;
    // As paradas do degradê vêm nas duas escritas, às vezes na mesma string.
    const cores = [...imagem.matchAll(/(?:color\(\s*srgb\s+[^)]+\)|rgba?\([^)]+\))/gi)]
      .map((m) => parse(m[0]))
      .filter(Boolean);
    // Limiar em 0.02, o mesmo do background-color. Estava em 0.15 e engolia
    // véus discretos — inclusive o escurecimento de 0.14 do vidro, que é
    // justamente o que torna o texto legível: a correção existia na tela e
    // não aparecia na medição.
    const solidas = cores.filter((c) => c.a > 0.02);
    if (!solidas.length) return null;
    return {
      rgb: [0, 1, 2].map((i) => solidas.reduce((s, c) => s + c.rgb[i], 0) / solidas.length),
      a: solidas.reduce((s, c) => s + c.a, 0) / solidas.length,
    };
  };

  /**
   * A camada de fundo de um nó.
   *
   * Cor e degradê podem existir ao MESMO tempo no mesmo elemento — é assim
   * que o vidro é feito: um véu escuro (background-image) por cima de um véu
   * branco (background-color). Devolver só a cor fazia o escurecimento sumir
   * da medição, e a correção parecia não ter efeito nenhum.
   */
  const camadaDe = (n, pseudo = null) => {
    const s = getComputedStyle(n, pseudo);
    const cor = parse(s.backgroundColor);
    const grad = doGradiente(s.backgroundImage);

    if (grad && cor && cor.a > 0.02) {
      // Composição "source-over": o degradê (s) é pintado por cima da cor de
      // fundo (b), e AMBOS são semi-transparentes — o resultado ainda deixa
      // passar o que estiver atrás.
      //   αo = αs + αb(1−αs)
      //   Co = (Cs·αs + Cb·αb·(1−αs)) / αo
      // Dividir pelo alfa resultante é o passo que faltava: sem ele, dois
      // véus de 14% davam quase-branco em vez do cinza que se vê na tela.
      const as = grad.a;
      const ab = cor.a;
      const ao = as + ab * (1 - as);
      const rgb = [0, 1, 2].map(
        (i) => (grad.rgb[i] * as + cor.rgb[i] * ab * (1 - as)) / ao
      );
      return { rgb, a: ao };
    }
    if (cor && cor.a > 0.02) return cor;
    return grad;
  };

  /** Empilha as camadas até achar fundo opaco: é o que o olho enxerga. */
  const fundoReal = (el) => {
    const camadas = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = camadaDe(n);
      if (c && c.a > 0) {
        camadas.push(c);
        if (c.a >= 0.999) break;
      }
      n = n.parentElement;
    }

    // O fundo da página inteira mora num ::before do body (o degradê da
    // marca no escuro, o papel claro no claro). `body.backgroundColor` é
    // transparente, então sem olhar o pseudo-elemento sobrava branco.
    const base =
      camadaDe(document.body, "::before") ??
      camadaDe(document.body) ??
      camadaDe(document.documentElement) ??
      (document.documentElement.getAttribute("data-modo") === "claro"
        ? { rgb: [241, 245, 249], a: 1 }
        : { rgb: [6, 78, 59], a: 1 });
    camadas.push({ rgb: base.rgb, a: 1 });

    let cor = camadas[camadas.length - 1].rgb;
    for (let i = camadas.length - 2; i >= 0; i--) {
      const { rgb, a } = camadas[i];
      cor = cor.map((f, k) => rgb[k] * a + f * (1 - a));
    }
    return cor;
  };
  const razao = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const comTexto = [...document.querySelectorAll("body *")].filter((el) => {
    if (!visivel(el)) return false;
    // só quem tem texto PRÓPRIO (não herdado dos filhos)
    const proprio = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    return proprio.length > 1;
  });

  const jaVisto = new Set();
  for (const el of comTexto.slice(0, 400)) {
    const s = getComputedStyle(el);
    const frente = parse(s.color);
    if (!frente) continue;
    const fundo = fundoReal(el);
    const cor = frente.a >= 0.999
      ? frente.rgb
      : frente.rgb.map((c, i) => c * frente.a + fundo[i] * (1 - frente.a));
    const r = razao(cor, fundo);
    const tamanho = parseFloat(s.fontSize);
    const negrito = parseInt(s.fontWeight, 10) >= 700;
    const grande = tamanho >= 24 || (tamanho >= 18.66 && negrito);
    const minimo = grande ? AA_GRANDE : AA_NORMAL;
    if (r < minimo) {
      const amostra = texto(el).slice(0, 30);
      const chave = `${amostra}|${Math.round(r * 10)}`;
      if (jaVisto.has(chave)) continue;
      jaVisto.add(chave);

      // As classes do elemento e do pai valem mais que o texto: é por elas
      // que se acha o componente no código e se corrige de uma vez, em vez
      // de caçar tela por tela.
      const classes = (el.className || "").toString().split(/\s+/).filter(Boolean);
      const suspeitas = classes
        .filter((c) => /^(text-|bg-|border-|opacity)/.test(c))
        .slice(0, 4)
        .join(" ");
      const pai = (el.parentElement?.className || "").toString().split(/\s+/)
        .filter((c) => /^(bg-|glass|border-)/.test(c))
        .slice(0, 3)
        .join(" ");

      reg(
        "contraste",
        `${r.toFixed(2)}:1 (min ${minimo}) · ${Math.round(tamanho)}px · "${amostra}" · ` +
          `[${suspeitas || el.tagName.toLowerCase()}]${pai ? ` dentro de [${pai}]` : ""}`
      );
    }
  }

  // ---------- alvos de toque ----------
  //
  // A régua da norma AA (WCAG 2.5.8) é 24×24 px — 44×44 é AAA / recomendação
  // da Apple. Medir tudo contra 44 gerava milhares de "falhas" que norma
  // nenhuma cobra, e o relatório afogava o que importa. Aqui o que reprova de
  // verdade é abaixo de 24; entre 24 e 44 fica registrado como aperto.
  //
  // Link dentro de texto corrido é isento pela própria norma (exceção
  // "inline"), então não entra.
  if (exigirToque) {
    const clicaveis = [
      ...document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea'),
    ].filter(visivel);
    const vistos = new Set();
    for (const el of clicaveis) {
      const s = getComputedStyle(el);
      if (s.display === "inline" && el.closest("p, li, span")) continue;

      // Caixa de seleção dentro de <label> tem como alvo o RÓTULO inteiro,
      // não o quadradinho: clicar no texto marca a caixa. Medir só o input
      // acusava dezenas de "alvos pequenos" que o dedo acerta sem esforço.
      const rotulo = el.closest("label");
      let caixa = rotulo && /^(checkbox|radio)$/.test(el.type) ? rotulo : el;

      // Campo de texto costuma ser um <input> baixo dentro de uma moldura
      // com borda e recuo — é a MOLDURA que a pessoa acerta com o dedo, e o
      // foco cai no input de qualquer jeito. O campo de data aparecia como
      // "20px de altura" por causa disso.
      if (caixa === el && /^(input|textarea)$/.test(el.tagName.toLowerCase())) {
        const pai = el.parentElement;
        if (pai) {
          const sp = getComputedStyle(pai);
          const temMoldura = sp.borderTopWidth !== "0px" || parseFloat(sp.paddingTop) > 0;
          const cresce = pai.getBoundingClientRect().height > el.getBoundingClientRect().height;
          if (temMoldura && cresce) caixa = pai;
        }
      }

      const r = caixa.getBoundingClientRect();
      const menor = Math.min(r.width, r.height);
      if (menor >= ALVO_MIN) continue;

      const nome =
        el.getAttribute("aria-label") || texto(el).slice(0, 30) || el.tagName.toLowerCase();
      const chave = `${nome}|${Math.round(r.width)}x${Math.round(r.height)}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      const tipo = menor < ALVO_AA ? "alvo-reprova" : "alvo-apertado";
      reg(tipo, `${Math.round(r.width)}×${Math.round(r.height)}px — "${nome}"`);
    }
  }

  // ---------- nomes acessíveis ----------
  for (const el of [...document.querySelectorAll("button, a[href]")].filter(visivel)) {
    const temTexto = texto(el).length > 0;
    const temNome =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("aria-labelledby");
    if (!temTexto && !temNome) {
      reg("sem-nome", `${el.tagName.toLowerCase()} só com ícone, sem aria-label`);
    }
  }

  for (const campo of [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].filter(visivel)) {
    const id = campo.getAttribute("id");
    const temLabel =
      (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
      campo.closest("label") ||
      campo.getAttribute("aria-label") ||
      campo.getAttribute("aria-labelledby");
    if (!temLabel) {
      reg(
        "campo-sem-etiqueta",
        `${campo.tagName.toLowerCase()}${campo.type ? `[${campo.type}]` : ""}${id ? ` #${id}` : ""}`
      );
    }
  }

  for (const img of [...document.querySelectorAll("img")].filter(visivel)) {
    if (img.getAttribute("alt") === null) reg("img-sem-alt", img.getAttribute("src") ?? "?");
  }

  // ---------- emoji na interface ----------
  // O sistema usa ícones Lucide; emoji é escorregão de quem escreveu o texto.
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  const anda = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const emojisVistos = new Set();
  let no;
  while ((no = anda.nextNode())) {
    const t = no.textContent.trim();
    if (!t || !EMOJI.test(t)) continue;
    const achado = t.match(EMOJI)[0];
    if (emojisVistos.has(achado)) continue;
    emojisVistos.add(achado);
    reg("emoji", `"${achado}" em "${t.slice(0, 40)}"`);
  }

  // ---------- inglês vazando ----------
  // Palavras que em português NÃO existem com esse sentido. Ficaram de fora:
  //   "No"   -> preposição em português ("No dia 5", "No total");
  //   "Next" -> aparecia só no botão "Open Next.js Dev Tools", que existe
  //             apenas no servidor de desenvolvimento e nunca vai ao ar;
  //   "Email"/"Error" -> usados em português corrente e em nome de campo.
  // Sem esses recortes o relatório acusava 18 "textos em inglês" que não
  // existem no sistema.
  const INGLES = /\b(Loading|Submit|Cancel|Delete|Edit|Save|Search|Password|Settings|Dashboard|Success|Failed|Required|Optional|Previous|Close|Back|Yes)\b/;
  const corpo = document.body.innerText;
  const eng = corpo.match(INGLES);
  if (eng) reg("ingles", `"${eng[0]}" aparece na tela`);

  // ---------- layout ----------
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) {
    const culpados = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > doc.clientWidth + 1 && visivel(el);
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`);
    reg(
      "rolagem-lateral",
      `página tem ${doc.scrollWidth}px em tela de ${doc.clientWidth}px · suspeitos: ${culpados.join(", ") || "?"}`
    );
  }

  return problemas;
}

// ------------------------------------------------------------------

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

/** O foco do teclado é visível? Compara o desenho antes e depois do Tab. */
async function conferirFoco(pagina) {
  const resultado = await pagina.evaluate(() => {
    const alvo = [...document.querySelectorAll('a[href], button, input, select, textarea')].find(
      (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      }
    );
    if (!alvo) return null;
    const antes = getComputedStyle(alvo);
    const marca = {
      outline: antes.outlineStyle + antes.outlineWidth,
      sombra: antes.boxShadow,
      borda: antes.borderColor,
    };
    alvo.focus();
    const depois = getComputedStyle(alvo);
    const mudou =
      depois.outlineStyle + depois.outlineWidth !== marca.outline ||
      depois.boxShadow !== marca.sombra ||
      depois.borderColor !== marca.borda;
    return { mudou, nome: alvo.tagName.toLowerCase() };
  });
  if (resultado && !resultado.mudou) {
    return `primeiro <${resultado.nome}> não mostra nada ao receber foco`;
  }
  return null;
}

async function principal() {
  if (!EMAIL || !SENHA) throw new Error("faltou VETHUB_EMAIL / VETHUB_SENHA");
  if (existsSync(SAIDA)) await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  // ROTAS=/dashboard,/tutores limita a varredura — útil para conferir uma
  // correção sem esperar as 456 visitas da rodada completa.
  // Aceita com ou sem barra inicial: no Git Bash do Windows, um valor que
  // começa com "/" vira caminho do Windows antes de chegar aqui
  // (ROTAS=/dashboard chegava como "C:/Program Files/Git/dashboard").
  const filtro = (process.env.ROTAS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const limpo = r.replace(/^.*Git[\\/]/i, "").replace(/^\/+/, "");
      return `/${limpo}`;
    });
  const rotas = filtro.length ? filtro : await rotasDoProjeto();
  console.log(`${rotas.length} rotas · ${TELAS.length} telas · 2 modos\n`);

  const navegador = await chromium.launch();

  // Entra UMA vez e reaproveita a sessão nos outros contextos.
  //
  // São 2 modos × 3 telas = 6 janelas, e logar em cada uma disparava o limite
  // de autenticações do Supabase no meio da varredura: a corrida morria com
  // "login recusado" depois de quinze minutos rodando. O cookie de sessão é o
  // mesmo para todas, então basta guardá-lo.
  const contextoLogin = await navegador.newContext();
  const paginaLogin = await contextoLogin.newPage();
  await entrar(paginaLogin);
  const sessao = await contextoLogin.storageState();
  await contextoLogin.close();

  for (const modo of ["escuro", "claro"]) {
    for (const tela of TELAS) {
      const contexto = await navegador.newContext({
        viewport: { width: tela.largura, height: tela.altura },
        hasTouch: tela.toque,
        storageState: sessao,
      });
      // O guia abre sozinho em página nunca vista e cobre a tela: mediria a
      // capivara, não a página.
      await contexto.addInitScript((m) => {
        try {
          localStorage.setItem("vethub:guia:automatico", "1");
          localStorage.setItem("vethub:modo", m);
        } catch {}
      }, modo);

      const pagina = await contexto.newPage();

      process.stdout.write(`[${modo}/${tela.nome}] `);
      for (const rota of rotas) {
        try {
          await pagina.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await pagina.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

          // Caiu no login? Então a sessão morreu no meio da corrida, e daqui
          // para a frente TODAS as rotas medem a mesma tela de entrada. Uma
          // rodada assim rendeu 183 achados do wordmark de 36px "em 61
          // rotas" — que era a tela de login contada 61 vezes. Melhor parar e
          // dizer isso do que entregar número inventado.
          if (rota !== "/login" && new URL(pagina.url()).pathname.startsWith("/login")) {
            throw new Error(
              "sessão perdida no meio da varredura (a rota caiu em /login) — " +
                "rode de novo; o Supabase limita autenticações seguidas"
            );
          }
          await pagina.evaluate((m) => document.documentElement.setAttribute("data-modo", m), modo);
          await pagina.waitForTimeout(350);

          const problemas = await pagina.evaluate(auditarNaPagina, {
            AA_NORMAL,
            AA_GRANDE,
            ALVO_MIN,
            ALVO_AA,
            exigirToque: tela.toque,
          });
          for (const p of problemas) anotar(p.tipo, rota, tela.nome, modo, p.detalhe);

          const foco = await conferirFoco(pagina);
          if (foco) anotar("foco-invisivel", rota, tela.nome, modo, foco);

          process.stdout.write(problemas.length ? "!" : ".");
        } catch (e) {
          anotar("erro-ao-auditar", rota, tela.nome, modo, e.message.slice(0, 100));
          process.stdout.write("x");
        }
      }
      process.stdout.write("\n");
      await contexto.close();
    }
  }

  await navegador.close();

  // ---------- relatório ----------
  const porTipo = new Map();
  for (const a of achados) {
    if (!porTipo.has(a.tipo)) porTipo.set(a.tipo, []);
    porTipo.get(a.tipo).push(a);
  }

  const TITULO = {
    contraste: "Contraste abaixo do mínimo (WCAG AA)",
    "alvo-reprova": `Alvo de toque abaixo do mínimo da norma (${ALVO_AA}×${ALVO_AA}px)`,
    "alvo-apertado": `Alvo apertado: entre ${ALVO_AA} e ${ALVO_MIN}px (conforto, não norma)`,
    "sem-nome": "Botão/link só com ícone, sem nome acessível",
    "campo-sem-etiqueta": "Campo de formulário sem etiqueta",
    "img-sem-alt": "Imagem sem alt",
    emoji: "Emoji na interface (o sistema usa ícones Lucide)",
    ingles: "Texto em inglês numa interface em português",
    "rolagem-lateral": "Rolagem lateral indevida",
    "foco-invisivel": "Foco do teclado invisível",
    "erro-ao-auditar": "A auditoria não conseguiu rodar",
  };

  const GRAVIDADE = [
    "rolagem-lateral",
    "contraste",
    "campo-sem-etiqueta",
    "sem-nome",
    "alvo-reprova",
    "foco-invisivel",
    "alvo-apertado",
    "emoji",
    "ingles",
    "img-sem-alt",
    "erro-ao-auditar",
  ];

  const linhas = [
    "# Auditoria de design e acessibilidade",
    "",
    `- Endereço: ${BASE}`,
    `- Rotas: ${rotas.length} · telas: ${TELAS.map((t) => `${t.nome} (${t.largura}px)`).join(", ")}`,
    "- Modos: escuro e claro",
    `- Achados: **${achados.length}**`,
    "",
    "## Resumo",
    "",
    "| Tipo | Ocorrências |",
    "| --- | --- |",
    ...GRAVIDADE.filter((t) => porTipo.has(t)).map(
      (t) => `| ${TITULO[t] ?? t} | ${porTipo.get(t).length} |`
    ),
    "",
  ];

  if (!achados.length) {
    linhas.push("Nenhum problema encontrado.", "");
  }

  for (const tipo of GRAVIDADE) {
    const lista = porTipo.get(tipo);
    if (!lista?.length) continue;
    linhas.push(`## ${TITULO[tipo] ?? tipo} (${lista.length})`, "");

    // Agrupa por detalhe: o mesmo defeito costuma repetir em muitas rotas, e
    // uma lista de 300 linhas iguais esconde o que é único.
    const porDetalhe = new Map();
    for (const a of lista) {
      const chave = a.detalhe;
      if (!porDetalhe.has(chave)) porDetalhe.set(chave, []);
      porDetalhe.get(chave).push(a);
    }
    const ordenado = [...porDetalhe.entries()].sort((a, b) => b[1].length - a[1].length);

    linhas.push("| Ocorrências | Detalhe | Onde |", "| --- | --- | --- |");
    for (const [detalhe, ocorrencias] of ordenado.slice(0, 40)) {
      const rotasUnicas = [...new Set(ocorrencias.map((o) => o.rota))];
      const modos = [...new Set(ocorrencias.map((o) => o.modo))].join("/");
      const telas = [...new Set(ocorrencias.map((o) => o.tela))].join("/");
      const onde =
        rotasUnicas.length > 3
          ? `${rotasUnicas.length} rotas (${modos} · ${telas})`
          : `${rotasUnicas.map((r) => `\`${r}\``).join(", ")} (${modos} · ${telas})`;
      linhas.push(`| ${ocorrencias.length} | ${detalhe.replace(/\|/g, "\\|")} | ${onde} |`);
    }
    if (ordenado.length > 40) {
      linhas.push(`| … | mais ${ordenado.length - 40} variações | |`);
    }
    linhas.push("");
  }

  await writeFile(path.join(SAIDA, "relatorio.md"), linhas.join("\n"), "utf8");
  await writeFile(path.join(SAIDA, "achados.json"), JSON.stringify(achados, null, 2), "utf8");

  console.log(`\n${achados.length} achados.`);
  for (const tipo of GRAVIDADE) {
    if (porTipo.has(tipo)) console.log(`  ${String(porTipo.get(tipo).length).padStart(4)} ${TITULO[tipo] ?? tipo}`);
  }
  console.log(`\nRelatório: ${path.relative(process.cwd(), path.join(SAIDA, "relatorio.md"))}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
