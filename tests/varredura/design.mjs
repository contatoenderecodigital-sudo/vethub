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
   * Lê uma cor CSS já computada.
   *
   * Precisa entender DUAS escritas. O Chrome devolve `rgb()/rgba()` para as
   * cores antigas, mas serializa `color-mix()` e as modernas como
   * `color(srgb 0.43 0.90 0.71 / 0.55)` — com componentes de 0 a 1 e barra
   * antes do alfa. Um parser que só conhecia `rgb()` enxergava "sem cor"
   * justamente no degradê da marca e no cabeçalho, e por isso o texto branco
   * do cabeçalho reprovava com 1.10:1 contra um fundo imaginário branco.
   */
  const parse = (cor) => {
    if (!cor) return null;

    const moderno = cor.match(/color\(\s*srgb\s+([^)]+)\)/i);
    if (moderno) {
      const [canais, alfa] = moderno[1].split("/");
      const p = canais.trim().split(/\s+/).map(parseFloat);
      if (p.length < 3 || p.some(Number.isNaN)) return null;
      return {
        rgb: [p[0] * 255, p[1] * 255, p[2] * 255],
        a: alfa === undefined ? 1 : parseFloat(alfa),
      };
    }

    const classico = cor.match(/rgba?\(([^)]+)\)/);
    if (!classico) return null;
    const p = classico[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { rgb: [p[0], p[1], p[2]], a: p[3] === undefined ? 1 : p[3] };
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
    const solidas = cores.filter((c) => c.a > 0.15);
    if (!solidas.length) return null;
    return {
      rgb: [0, 1, 2].map((i) => solidas.reduce((s, c) => s + c.rgb[i], 0) / solidas.length),
      a: solidas.reduce((s, c) => s + c.a, 0) / solidas.length,
    };
  };

  /** A camada de fundo de um nó: cor sólida ou degradê, o que houver. */
  const camadaDe = (n, pseudo = null) => {
    const s = getComputedStyle(n, pseudo);
    const cor = parse(s.backgroundColor);
    if (cor && cor.a > 0.02) return cor;
    return doGradiente(s.backgroundImage);
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
      const amostra = texto(el).slice(0, 40);
      const chave = `${amostra}|${Math.round(r * 10)}`;
      if (jaVisto.has(chave)) continue;
      jaVisto.add(chave);
      reg(
        "contraste",
        `${r.toFixed(2)}:1 (mínimo ${minimo}) — "${amostra}" · ${Math.round(tamanho)}px`
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

      const r = el.getBoundingClientRect();
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
  const INGLES = /\b(Loading|Submit|Cancel|Delete|Edit|Save|Search|Name|Email|Password|Settings|Dashboard|Error|Success|Failed|Required|Optional|Next|Previous|Close|Back|Yes|No)\b/;
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

  for (const modo of ["escuro", "claro"]) {
    for (const tela of TELAS) {
      const contexto = await navegador.newContext({
        viewport: { width: tela.largura, height: tela.altura },
        hasTouch: tela.toque,
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
      await entrar(pagina);

      process.stdout.write(`[${modo}/${tela.nome}] `);
      for (const rota of rotas) {
        try {
          await pagina.goto(`${BASE}${rota}`, { waitUntil: "domcontentloaded", timeout: 30000 });
          await pagina.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
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
