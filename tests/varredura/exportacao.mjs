/**
 * A exportação da base.
 *
 * A tela do teste vencido promete, em letras grandes, que a clínica consegue
 * "exportar tudo". Uma promessa dessas só existe se alguém apertar o botão e
 * receber um arquivo que abre no Excel — por isso este teste baixa os nove
 * arquivos de verdade e olha dentro de cada um.
 *
 * O que ele cobra:
 *
 *   * cada tipo responde 200 e vem como CSV, com nome de arquivo;
 *   * o arquivo começa com o BOM de UTF-8 (sem ele o Excel em português
 *     transforma "Observações" em lixo e a planilha parece corrompida);
 *   * a primeira linha é o cabeçalho em português, não nome de coluna do
 *     banco;
 *   * o separador é ponto e vírgula, senão o Excel joga tudo numa coluna só;
 *   * um tipo inventado devolve 404 em vez de vazar outra tabela;
 *   * quem não está logado leva 401.
 *
 * Como rodar:
 *   BASE_URL=http://localhost:3000 node --env-file=.env.local \
 *   tests/varredura/exportacao.mjs
 */

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";

const TIPOS = [
  ["tutores", "Nome"],
  ["pets", "Espécie"],
  ["consultas", "Diagnóstico"],
  ["agendamentos", "Data e hora"],
  ["vacinas", "Aplicado em"],
  ["exames", "Pedido em"],
  ["itens", "Preço de venda"],
  ["vendas", "Número"],
  ["financeiro", "Vencimento"],
];

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok   " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

async function entrar(pagina) {
  await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await pagina.fill('input[type="email"], input[name="email"]', EMAIL);
  await pagina.fill('input[type="password"], input[name="senha"]', SENHA);
  await pagina
    .waitForFunction(() => !document.querySelector("button[type=submit]")?.disabled, {
      timeout: 10000,
    })
    .catch(() => {});
  await pagina.click('button[type="submit"]');
  await pagina
    .waitForURL((u) => !new URL(u).pathname.startsWith("/login"), { timeout: 30000 })
    .catch(() => {});
  if (new URL(pagina.url()).pathname === "/login") throw new Error("login recusado");
}

const navegador = await chromium.launch();

try {
  // Sem sessão nenhuma: tem que barrar antes de tocar no banco.
  const anonimo = await navegador.newContext();
  const semLogin = await anonimo.request.get(`${BASE}/api/exportar/tutores`);
  registro(
    "sem login o download é recusado",
    semLogin.status() === 401,
    `status ${semLogin.status()}`
  );
  await anonimo.close();

  const contexto = await navegador.newContext();
  const pagina = await contexto.newPage();
  await entrar(pagina);
  registro("entrou no sistema", true);

  // A tela existe e lista os botões.
  const resposta = await pagina.goto(`${BASE}/configuracoes/exportar`, {
    waitUntil: "networkidle",
  });
  registro("a tela de exportar abre", resposta?.status() === 200, `status ${resposta?.status()}`);

  const botoes = await pagina.locator('a[href^="/api/exportar/"]').count();
  registro(
    "um botão de baixar para cada tipo",
    botoes === TIPOS.length,
    `${botoes} de ${TIPOS.length}`
  );

  for (const [tipo, colunaEsperada] of TIPOS) {
    const r = await pagina.request.get(`${BASE}/api/exportar/${tipo}`);
    if (r.status() !== 200) {
      registro(`${tipo}: baixa`, false, `status ${r.status()}`);
      continue;
    }

    const tipoConteudo = r.headers()["content-type"] ?? "";
    const anexo = r.headers()["content-disposition"] ?? "";
    const texto = await r.text();
    const primeira = texto.split("\r\n")[0] ?? "";
    const linhas = texto.trim().split("\r\n").length;

    const ok =
      tipoConteudo.includes("text/csv") &&
      anexo.includes(`vethub-${tipo}-`) &&
      texto.startsWith("﻿") &&
      primeira.includes(";") &&
      primeira.includes(colunaEsperada);

    registro(
      `${tipo}: baixa e abre no Excel`,
      ok,
      ok
        ? `${linhas - 1} linhas`
        : `bom=${texto.startsWith("﻿")} cabeçalho="${primeira.slice(0, 60)}"`
    );

    // Uma célula com ponto e vírgula dentro não pode desalinhar a planilha:
    // toda célula preenchida sai entre aspas.
    const segunda = texto.split("\r\n")[1];
    if (segunda) {
      const camposCrus = segunda
        .split(";")
        .filter((c) => c !== "" && !c.startsWith('"'));
      registro(
        `${tipo}: célula sem aspas não quebra a linha`,
        camposCrus.length === 0,
        camposCrus.length ? camposCrus.slice(0, 2).join(" | ") : ""
      );
    }
  }

  // Tipo que não existe não pode virar uma consulta a uma tabela qualquer.
  const inventado = await pagina.request.get(`${BASE}/api/exportar/usuario`);
  registro(
    "tipo inventado devolve 404",
    inventado.status() === 404,
    `status ${inventado.status()}`
  );

  // A trava de admin, testada de verdade: rebaixa o próprio usuário do teste,
  // tenta baixar, e devolve o papel no `finally` aconteça o que acontecer.
  // Afirmar "só admin exporta" sem exercitar o caminho é confiar no código
  // que eu mesmo escrevi — que é justamente o que este arquivo existe para
  // não fazer.
  const servico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const urlBanco = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (servico && urlBanco) {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(urlBanco, servico, { auth: { persistSession: false } });
    const { data: eu } = await db
      .from("usuario")
      .select("id, papel")
      .eq("email", EMAIL)
      .maybeSingle();

    if (eu) {
      try {
        await db.from("usuario").update({ papel: "recepcao" }).eq("id", eu.id);
        const barrado = await pagina.request.get(`${BASE}/api/exportar/tutores`);
        registro(
          "recepção não baixa a base",
          barrado.status() === 403,
          `status ${barrado.status()}`
        );

        // Navegar de verdade, e não olhar o status: com `loading.tsx` no
        // caminho, o Next responde 200 e manda o esqueleto antes de decidir
        // o desvio. Quem diz se a pessoa entrou é onde ela parou.
        await pagina.goto(`${BASE}/configuracoes/exportar`, { waitUntil: "networkidle" });
        const parou = new URL(pagina.url()).pathname;
        registro("recepção não abre a tela de exportar", parou === "/dashboard", `parou em ${parou}`);
      } finally {
        await db.from("usuario").update({ papel: eu.papel }).eq("id", eu.id);
        const devolvido = await db
          .from("usuario")
          .select("papel")
          .eq("id", eu.id)
          .maybeSingle();
        registro(
          "o papel do usuário do teste voltou ao que era",
          devolvido.data?.papel === eu.papel,
          `papel=${devolvido.data?.papel}`
        );
      }
    }
  } else {
    registro("trava de admin não foi testada (falta a chave de serviço)", false);
  }

  await contexto.close();
} finally {
  await navegador.close();
}

const falhas = diario.filter((d) => !d.ok);
console.log(`\n${diario.length - falhas.length}/${diario.length} passaram`);
if (falhas.length) {
  console.log("\nO que falhou:");
  for (const f of falhas) console.log(`  ${f.etapa}${f.detalhe ? ` — ${f.detalhe}` : ""}`);
}
process.exit(falhas.length ? 1 : 0);
