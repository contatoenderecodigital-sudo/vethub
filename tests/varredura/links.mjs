/**
 * Link que não leva a lugar nenhum.
 *
 * Um `href` errado não quebra o build, não aparece no lint e não derruba
 * teste nenhum: ele só dá 404 na cara do cliente, no meio de um atendimento,
 * e a pessoa conclui que o sistema é mal feito. É o tipo de defeito que só a
 * máquina acha, porque ninguém clica em tudo.
 *
 * Este arquivo lê o CÓDIGO, não o navegador. Um robô só encontra o que
 * consegue alcançar clicando; aqui entra também o botão que aparece uma vez
 * por ano, na tela que só abre quando o estoque acaba.
 *
 * Como funciona:
 *
 *   1. monta a lista de rotas de verdade a partir dos `page.tsx` e
 *      `route.ts` em `src/app`, traduzindo `[id]` para "qualquer coisa";
 *   2. junta todo `href` que aparece no código, inclusive os montados com
 *      crase e `${}`;
 *   3. cobra que cada um case com alguma rota.
 *
 * Como rodar:
 *   node tests/varredura/links.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(RAIZ, "src/app");

async function arquivos(dir) {
  const achados = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const completo = path.join(dir, item.name);
    if (item.isDirectory()) achados.push(...(await arquivos(completo)));
    else achados.push(completo);
  }
  return achados;
}

/**
 * A pasta vira endereço.
 *
 * `(app)` e `(publico)` são grupos de rota: existem para separar layouts e
 * somem do endereço. `[id]` vira um curinga; `[...tudo]` engole o resto.
 */
function pastaViraRota(relativo) {
  const partes = relativo.split(path.sep).slice(0, -1);
  const pedacos = [];
  for (const p of partes) {
    if (p.startsWith("(") && p.endsWith(")")) continue; // grupo de rota
    if (p.startsWith("@")) return null; // slot paralelo, não é endereço
    pedacos.push(p);
  }
  return "/" + pedacos.join("/");
}

/** A rota vira uma expressão que reconhece endereços daquele formato. */
function rotaViraPadrao(rota) {
  const corpo = rota
    .split("/")
    .map((p) => {
      if (/^\[\.\.\..+\]$/.test(p)) return ".+";
      if (/^\[.+\]$/.test(p)) return "[^/]+";
      return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${corpo || "/"}$`);
}

const todos = await arquivos(APP);

const rotas = [];
for (const f of todos) {
  const nome = path.basename(f);
  if (!/^(page|route)\.(tsx|ts|js|jsx)$/.test(nome)) continue;
  const rota = pastaViraRota(path.relative(APP, f));
  if (rota !== null) rotas.push(rota === "" ? "/" : rota);
}
const padroes = rotas.map(rotaViraPadrao);

/** Endereços que não são páginas nossas e não devem ser cobrados. */
const IGNORAR = [
  /^https?:\/\//,
  /^mailto:/,
  /^tel:/,
  /^#/,
  /^\/api\//, // conferidos pelo próprio teste de cada rota
];

const fontes = (await arquivos(path.join(RAIZ, "src"))).filter((f) => /\.(tsx|ts)$/.test(f));

const quebrados = [];
const usados = new Set();

for (const f of fontes) {
  const texto = await readFile(f, "utf8");
  const linhas = texto.split("\n");

  linhas.forEach((linha, i) => {
    // href="/x", href={"/x"}, href={`/x/${id}`} e redirect("/x")
    const achados = [
      ...linha.matchAll(/href=(?:\{)?["'`]([^"'`]+)["'`]/g),
      ...linha.matchAll(/(?:redirect|push|replace)\(\s*["'`]([^"'`$]+)["'`]/g),
      ...linha.matchAll(/href=\{`([^`]+)`\}/g),
      // O menu e as abas declaram o destino como propriedade de objeto
      // (`href: "/consultas"`), não como atributo de JSX. Sem esta linha,
      // metade do sistema parecia inalcançável.
      ...linha.matchAll(/\b(?:href|para|destino|rota)\s*:\s*["'`]([^"'`]+)["'`]/g),
    ];

    for (const [, cru] of achados) {
      if (!cru.startsWith("/")) continue;
      if (IGNORAR.some((r) => r.test(cru))) continue;

      // O que fazer com `${}` depende do que a variável guarda, e o código
      // não conta: em `/pets/${id}` ela é um pedaço do caminho; em
      // `/agenda${porDia}` ela é `?data=...`. Como não dá para saber lendo,
      // as duas leituras são testadas, e o link passa se alguma delas
      // levar a uma rota que existe.
      const limpar = (s) =>
        s.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";

      const comoCaminho = limpar(cru.replace(/\$\{[^}]*\}/g, "x"));
      const comoBusca = limpar(cru.replace(/\$\{[^}]*\}/g, ""));

      const alvo = padroes.some((p) => p.test(comoCaminho)) ? comoCaminho : comoBusca;
      const casou = padroes.some((p) => p.test(alvo));

      if (casou) usados.add(alvo);
      else
        quebrados.push({
          arquivo: path.relative(RAIZ, f).replace(/\\/g, "/"),
          linha: i + 1,
          href: cru,
        });
    }
  });
}

console.log(`${rotas.length} rotas em src/app`);
console.log(`${usados.size} endereços diferentes apontados pelo código\n`);

if (quebrados.length === 0) {
  console.log("ok    nenhum link aponta para rota que não existe");
} else {
  console.log(`FALHA ${quebrados.length} link(s) sem destino:\n`);
  for (const q of quebrados) {
    console.log(`  ${q.arquivo}:${q.linha}  ->  ${q.href}`);
  }
}

/**
 * O contrário também interessa: página que existe e que nenhum menu, botão
 * ou link alcança. Não é erro — pode ser tela de impressão aberta por
 * `window.open`, ou destino de formulário — mas é a lista que vale olhar
 * antes de lançar, porque tela órfã é tela que ninguém testou.
 */
/** Rotas que chegam de fora do código, e por isso não têm link nenhum. */
const DE_FORA = new Set([
  "/nova-senha", // o destino do e-mail de recuperação, montado pelo Supabase
]);

const orfas = rotas
  .filter((r) => !r.includes("["))
  .filter((r) => !usados.has(r))
  .filter((r) => !r.startsWith("/api"))
  .filter((r) => !DE_FORA.has(r))
  .sort();

if (orfas.length) {
  console.log(`\n${orfas.length} rota(s) que nenhum link do código alcança:`);
  for (const o of orfas) console.log(`  ${o}`);
}

process.exit(quebrados.length ? 1 : 0);
