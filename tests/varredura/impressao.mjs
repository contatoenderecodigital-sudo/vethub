/**
 * O que sai na impressora.
 *
 * Nenhuma bateria olhava isto, e o buraco era grande: o comprovante de venda
 * e a receita são os dois papéis que o cliente leva na mão. Saíam com o
 * degradê escuro do app pintado na folha inteira — gastando tinta e deixando
 * o texto ilegível — e com o botão "?" do guia impresso no canto.
 *
 * O teste emula `media: print`, gera o PDF e mede a folha:
 *
 *   * quanto da página é ESCURO (fundo do app vazando para o papel);
 *   * se sobrou navegação, botão ou o guia na folha;
 *   * se o conteúdo que importa está lá (número da venda, total, itens).
 *
 * Como rodar:
 *   BASE_URL=http://localhost:3000 node --env-file=.env.local \
 *   tests/varredura/impressao.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "resultado-impressao");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok   " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

/**
 * Garante que existe uma receita para levar à impressora.
 *
 * A receita é um dos dois papéis que o cliente leva na mão, e mesmo assim
 * este teste passou dias anunciando "nenhuma receita no banco" e seguindo
 * em frente: a clínica de teste simplesmente não tinha nenhuma, e a folha
 * que mais importa nunca foi olhada. Um teste que depende de o banco estar
 * do jeito certo não é um teste, é sorte.
 *
 * Então ele monta a sua: tutor, pet e receita com dois medicamentos, todos
 * marcados "ZZ Robo" e apagados no fim.
 */
async function garantirReceita(clinicaId) {
  const banco = criarBanco();
  if (!banco) return null;

  const { data: existente } = await banco
    .from("receita")
    .select("id")
    .eq("clinica_id", clinicaId)
    .limit(1)
    .maybeSingle();
  if (existente) return { id: existente.id, criada: false };

  const { data: tutor } = await banco
    .from("tutor")
    .insert({ clinica_id: clinicaId, nome: "ZZ Robo Tutor Impressao", telefone: "49999990000" })
    .select("id")
    .single();

  const { data: pet } = await banco
    .from("pet")
    .insert({ clinica_id: clinicaId, tutor_id: tutor.id, nome: "ZZ Robo Pet", especie: "cao" })
    .select("id")
    .single();

  const { data: receita } = await banco
    .from("receita")
    .insert({ clinica_id: clinicaId, pet_id: pet.id, tipo: "simples" })
    .select("id")
    .single();

  await banco.from("receita_item").insert([
    {
      receita_id: receita.id,
      medicamento: "Amoxicilina + Clavulanato",
      concentracao: "250 mg",
      forma_farmaceutica: "Comprimido",
      quantidade: "1 caixa",
      posologia: "Dar 1 comprimido a cada 12 horas, por 7 dias.",
      via: "Oral",
      ordem: 0,
    },
    {
      receita_id: receita.id,
      medicamento: "Meloxicam",
      concentracao: "2 mg",
      forma_farmaceutica: "Comprimido",
      quantidade: "1 caixa",
      posologia: "Dar 1 comprimido a cada 24 horas, por 3 dias.",
      via: "Oral",
      ordem: 1,
    },
  ]);

  return { id: receita.id, criada: true, tutorId: tutor.id };
}

/** Apaga o que `garantirReceita` inventou. O tutor leva o resto em cascata. */
async function limparReceita(feita) {
  if (!feita?.criada) return;
  const banco = criarBanco();
  if (banco) await banco.from("tutor").delete().eq("id", feita.tutorId);
}

function criarBanco() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false } });
}

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

/**
 * Mede a folha com `media: print` aplicado.
 *
 * O que interessa não é o PDF em si — é o que ele mostraria. Com o modo de
 * impressão ligado, lê-se a cor de fundo real do corpo e procura-se o que
 * não deveria ter sobrado.
 */
async function medirFolha(pagina) {
  await pagina.emulateMedia({ media: "print" });
  await pagina.waitForTimeout(500);

  const medida = await pagina.evaluate(() => {
    const px = document.createElement("canvas").getContext("2d", {
      willReadFrequently: true,
    });
    // Pinta BRANCO primeiro e a cor por cima: um fundo transparente devolvia
    // [0,0,0] e o teste acusava "folha preta" onde a folha é branca. O que
    // vale é o que aparece no papel, e atrás de tudo o papel é branco.
    const cor = (c) => {
      px.clearRect(0, 0, 1, 1);
      px.fillStyle = "#ffffff";
      px.fillRect(0, 0, 1, 1);
      px.fillStyle = c;
      px.fillRect(0, 0, 1, 1);
      const [r, g, b] = px.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };
    const claro = ([r, g, b]) => (r + g + b) / 3 > 200;

    const visivel = (el) => {
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0;
    };

    // O fundo do app é um pseudo-elemento fixo em tela cheia.
    const fundoPagina = cor(getComputedStyle(document.body).backgroundColor);
    const antesDoCorpo = getComputedStyle(document.body, "::before");
    const veuAtivo = antesDoCorpo.display !== "none";

    // Blocos grandes que continuam escuros no papel.
    const escurosGrandes = [...document.querySelectorAll("body *")]
      .filter((el) => {
        if (!visivel(el)) return false;
        const b = el.getBoundingClientRect();
        if (b.width * b.height < 40000) return false;
        const c = cor(getComputedStyle(el).backgroundColor);
        const s = getComputedStyle(el);
        const opaco = !/rgba\(.*,\s*0\)/.test(s.backgroundColor);
        return opaco && !claro(c) && (r => r)(true);
      })
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`);

    const sobrou = [];
    for (const [nome, sel] of [
      ["cabeçalho", "header"],
      ["menu lateral", "aside"],
      ["navegação", "nav"],
      ["guia do Bento", '[aria-label="Abrir o guia desta página"]'],
    ]) {
      const el = document.querySelector(sel);
      if (el && visivel(el)) sobrou.push(nome);
    }

    return {
      fundoClaro: claro(fundoPagina),
      fundoPagina: fundoPagina.join(","),
      veuAtivo,
      escurosGrandes,
      sobrou,
      texto: document.body.innerText.replace(/\s+/g, " ").slice(0, 300),
    };
  });

  await pagina.emulateMedia({ media: "screen" });
  return medida;
}

async function conferir(pagina, nome, url, esperados) {
  await pagina.goto(url, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(900);

  const f = await medirFolha(pagina);

  registro(`${nome}: folha branca`, f.fundoClaro, `fundo rgb(${f.fundoPagina})`);
  registro(`${nome}: degradê do app desligado`, !f.veuAtivo);
  registro(
    `${nome}: nada de blocos escuros grandes`,
    f.escurosGrandes.length === 0,
    f.escurosGrandes.join(", ")
  );
  registro(
    `${nome}: sem navegação nem guia no papel`,
    f.sobrou.length === 0,
    f.sobrou.length ? `sobrou: ${f.sobrou.join(", ")}` : ""
  );

  const faltando = esperados.filter((t) => !f.texto.includes(t));
  registro(
    `${nome}: conteúdo presente`,
    faltando.length === 0,
    faltando.length ? `não achei: ${faltando.join(", ")}` : esperados.join(" · ")
  );

  // O PDF fica salvo para conferência humana.
  await pagina
    .pdf({ path: path.join(SAIDA, `${nome.replace(/\W+/g, "-")}.pdf`), format: "A4" })
    .catch(() => {});
}

async function principal() {
  if (!EMAIL || !SENHA) throw new Error("faltou VETHUB_EMAIL / VETHUB_SENHA");
  if (existsSync(SAIDA)) await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  await contexto.addInitScript(() => {
    try {
      localStorage.setItem("vethub:guia:automatico", "1");
    } catch {}
  });
  const pagina = await contexto.newPage();

  /** A receita usada no teste, para saber se foi inventada e precisa sumir. */
  let feita = null;

  try {
    await entrar(pagina);
    registro("login", true, EMAIL);

    // Acha uma venda e uma receita de verdade para imprimir.
    await pagina.goto(`${BASE}/vendas`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(700);
    // `/vendas/<uuid>` e nada mais: a lista também tem links de filtro e de
    // paginação que começam com /vendas.
    const venda = await pagina
      .evaluate(() => {
        const bom = [...document.querySelectorAll('main a[href^="/vendas/"]')]
          .map((a) => a.getAttribute("href"))
          .find((h) => /^\/vendas\/[0-9a-f-]{36}$/i.test(h ?? ""));
        return bom ?? null;
      })
      .catch(() => null);

    if (venda) {
      await conferir(pagina, "comprovante", `${BASE}${venda}/comprovante`, [
        "COMPROVANTE",
        "TOTAL",
      ]);
    } else {
      registro("comprovante", false, "nenhuma venda no banco para imprimir");
    }

    const banco = criarBanco();
    const { data: eu } = banco
      ? await banco.from("usuario").select("clinica_id").eq("email", EMAIL).maybeSingle()
      : { data: null };

    if (eu?.clinica_id) {
      feita = await garantirReceita(eu.clinica_id);
    }

    if (feita?.id) {
      await conferir(pagina, "receita", `${BASE}/receitas/${feita.id}/imprimir`, ["RECEITU"]);
    } else {
      registro("receita", false, "não consegui uma receita para imprimir");
    }

    await conferir(pagina, "relatorio", `${BASE}/relatorios/faturamento`, ["Faturamento"]);
  } catch (e) {
    registro("execução", false, e.message.slice(0, 140));
  } finally {
    await navegador.close();
    await limparReceita(feita);
  }

  const falhas = diario.filter((d) => !d.ok);
  const linhas = [
    "# O que sai na impressora",
    "",
    `- Endereço: ${BASE}`,
    `- Passos: ${diario.length} · falhas: **${falhas.length}**`,
    "- Os PDFs gerados ficam nesta pasta, para conferência a olho.",
    "",
    "| Resultado | Etapa | Detalhe |",
    "| --- | --- | --- |",
    ...diario.map(
      (d) => `| ${d.ok ? "ok" : "**FALHA**"} | ${d.etapa} | ${d.detalhe.replace(/\|/g, "\\|")} |`
    ),
  ];
  await writeFile(path.join(SAIDA, "relatorio.md"), linhas.join("\n"), "utf8");

  console.log(`\n${diario.length} passos, ${falhas.length} falhas.`);
  console.log(`Relatório: ${path.relative(process.cwd(), path.join(SAIDA, "relatorio.md"))}`);
  process.exitCode = falhas.length ? 1 : 0;
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
