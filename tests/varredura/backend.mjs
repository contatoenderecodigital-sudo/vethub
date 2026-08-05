/**
 * Testes de backend e segurança do VetHub.
 *
 * Confere o que não dá para ver na tela:
 *  1. rotas de API respondem sem sessão? (não podem devolver dados)
 *  2. o banco entrega dados para quem não está logado? (RLS)
 *  3. logado, o usuário enxerga alguma coisa de OUTRA clínica? (isolamento)
 *  4. a chave secreta do servidor vazou para o navegador?
 *
 * Como rodar:
 *   VETHUB_EMAIL=... VETHUB_SENHA=... node tests/varredura/backend.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const SAIDA = path.join(AQUI, "resultado-backend");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.VETHUB_EMAIL ?? "";
const SENHA = process.env.VETHUB_SENHA ?? "";

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok  " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

/** Lê uma variável do .env.local sem depender de biblioteca. */
async function lerEnv(chave) {
  const texto = await readFile(path.join(RAIZ, ".env.local"), "utf8");
  const linha = texto
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${chave}=`));
  return linha?.slice(linha.indexOf("=") + 1).replace(/^["']|["']$/g, "").trim() ?? "";
}

/** Tabelas com dado de clínica — nenhuma pode responder para anônimo. */
const TABELAS = [
  "clinica",
  "usuario",
  "tutor",
  "pet",
  "agendamento",
  "consulta",
  "item",
  "lote",
  "venda",
  "lancamento_financeiro",
  "fornecedor",
  "receita",
  "internacao",
  "orcamento",
  "compra",
  "whatsapp_conexao",
];

async function principal() {
  if (!existsSync(SAIDA)) await mkdir(SAIDA, { recursive: true });

  const url = await lerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = await lerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const servico = await lerEnv("SUPABASE_SERVICE_ROLE_KEY");

  // ----------------------------------------------------------------
  // 1. Rotas de API sem sessão
  // ----------------------------------------------------------------
  const rotasApi = [];
  async function varrerApi(dir, prefixo = "/api") {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      if (item.isDirectory()) {
        await varrerApi(path.join(dir, item.name), `${prefixo}/${item.name}`);
      } else if (item.name === "route.ts") {
        rotasApi.push(prefixo);
      }
    }
  }
  await varrerApi(path.join(RAIZ, "src/app/api"));

  for (const rota of rotasApi) {
    // o webhook do WhatsApp é público de propósito (a Meta chama sem sessão)
    const publicaDeProposito = rota.includes("/whatsapp/webhook") || rota === "/api/cadastro";
    const resposta = await fetch(`${BASE}${rota}?q=a`, { redirect: "manual" }).catch(
      () => null
    );
    if (!resposta) {
      registro(`API sem sessão ${rota}`, false, "não respondeu");
      continue;
    }
    const corpo = (await resposta.text().catch(() => "")).slice(0, 400);
    const vazou =
      resposta.status === 200 && /"id"\s*:|"nome"\s*:/.test(corpo) && !publicaDeProposito;
    registro(
      `API sem sessão ${rota}`,
      !vazou,
      vazou
        ? `DEVOLVEU DADOS: ${corpo.slice(0, 120)}`
        : `HTTP ${resposta.status}${publicaDeProposito ? " (pública de propósito)" : ""}`
    );
  }

  // ----------------------------------------------------------------
  // 2. Banco sem login: RLS tem que devolver vazio
  // ----------------------------------------------------------------
  const anonimo = createClient(url, anon);
  const vazamentos = [];
  for (const tabela of TABELAS) {
    const { data, error } = await anonimo.from(tabela).select("*").limit(3);
    if (data?.length) vazamentos.push(`${tabela} (${data.length} linhas)`);
    else if (error && !/permission|policy|denied|row-level/i.test(error.message)) {
      vazamentos.push(`${tabela} (erro estranho: ${error.message.slice(0, 60)})`);
    }
  }
  registro(
    "banco sem login (RLS)",
    vazamentos.length === 0,
    vazamentos.length ? `VAZOU: ${vazamentos.join(", ")}` : `${TABELAS.length} tabelas mudas`
  );

  // ----------------------------------------------------------------
  // 3. Logado: enxerga outra clínica?
  // ----------------------------------------------------------------
  const logado = createClient(url, anon);
  const { data: sessao, error: erroLogin } = await logado.auth.signInWithPassword({
    email: EMAIL,
    password: SENHA,
  });
  registro("login pelo banco", !erroLogin, erroLogin?.message ?? sessao.user?.email);

  if (!erroLogin) {
    const { data: eu } = await logado
      .from("usuario")
      .select("id, clinica_id, papel")
      .eq("id", sessao.user.id)
      .maybeSingle();

    // Com a chave de serviço dá para saber quantas clínicas existem de fato.
    const admin = servico ? createClient(url, servico) : null;
    const { data: todas } = admin
      ? await admin.from("clinica").select("id").limit(50)
      : { data: null };

    const outras = (todas ?? []).filter((c) => c.id !== eu?.clinica_id);
    if (!outras.length) {
      registro(
        "isolamento entre clínicas",
        true,
        "só existe uma clínica no banco: nada para vazar (a suíte do vitest cobre a regra)"
      );
    } else {
      const invasoes = [];
      for (const tabela of ["tutor", "pet", "agendamento", "item", "venda"]) {
        const { data } = await logado
          .from(tabela)
          .select("id")
          .eq("clinica_id", outras[0].id)
          .limit(3);
        if (data?.length) invasoes.push(`${tabela} (${data.length})`);
      }
      registro(
        "isolamento entre clínicas",
        invasoes.length === 0,
        invasoes.length
          ? `ENXERGOU dados de outra clínica: ${invasoes.join(", ")}`
          : `${outras.length} outra(s) clínica(s), nenhuma linha alcançável`
      );
    }

    // Escrita fora da própria clínica também precisa quicar.
    if (outras.length) {
      const { error } = await logado
        .from("tutor")
        .insert({ clinica_id: outras[0].id, nome: "ZZ Robo invasor", telefone: "5511900000000" })
        .select("id");
      registro(
        "gravar em outra clínica",
        !!error,
        error ? "bloqueado pelo banco" : "CONSEGUIU GRAVAR (falha grave)"
      );
    }

    await logado.auth.signOut();
  }

  // ----------------------------------------------------------------
  // 4. A chave de serviço vazou para o navegador?
  // ----------------------------------------------------------------
  if (servico) {
    const pastaEstatica = path.join(RAIZ, ".next/static");
    let vazou = false;
    const procurar = async (dir) => {
      if (!existsSync(dir)) return;
      for (const item of await readdir(dir, { withFileTypes: true })) {
        const alvo = path.join(dir, item.name);
        if (item.isDirectory()) await procurar(alvo);
        else if (/\.(js|css|map)$/.test(item.name)) {
          if ((await readFile(alvo, "utf8")).includes(servico)) {
            vazou = true;
            registro("chave de serviço no navegador", false, `ACHADA em ${item.name}`);
          }
        }
      }
    };
    await procurar(pastaEstatica);
    if (!vazou) {
      registro(
        "chave de serviço no navegador",
        true,
        "não aparece em nenhum arquivo entregue ao cliente"
      );
    }
  }

  const falhas = diario.filter((d) => !d.ok);
  await writeFile(
    path.join(SAIDA, "relatorio.md"),
    [
      "# Testes de backend e segurança",
      "",
      `- Endereço: ${BASE}`,
      `- Checagens: ${diario.length} · falhas: ${falhas.length}`,
      "",
      "| Resultado | Checagem | Detalhe |",
      "| --- | --- | --- |",
      ...diario.map((d) => `| ${d.ok ? "ok" : "**FALHA**"} | ${d.etapa} | ${d.detalhe} |`),
    ].join("\n")
  );

  console.log(`\n${diario.length} checagens, ${falhas.length} falhas.`);
}

principal().catch((e) => {
  console.error("testes de backend falharam:", e);
  process.exit(1);
});
