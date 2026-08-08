/**
 * A trava de plano segura mesmo quem digita o endereço na mão?
 *
 * O cadeado no menu é enfeite de vitrine: ele existe para VENDER. A pergunta
 * que este teste faz é a outra — se a pessoa souber o endereço de cor, ou
 * copiar de um vídeo, ela entra? Um "não" aqui é a diferença entre cobrar por
 * internação e distribuir internação de graça.
 *
 * O roteiro:
 *
 *   1. cria uma clínica virgem pelo cadastro público (nasce em trial);
 *   2. o service_role rebaixa ela para 'essencial' — o mesmo caminho que a
 *      cobrança vai usar de verdade;
 *   3. confere que as 8 telas de recurso desviam para a explicação;
 *   4. confere que as telas do dia a dia continuam abrindo (uma trava que
 *      pega demais é tão ruim quanto uma que não pega);
 *   5. confere que o menu mostra cadeado nesses itens;
 *   6. sobe a clínica para 'completo' e confere que TUDO destrava;
 *   7. confere que os nove preços (3 planos × 3 ciclos) aparecem na tela;
 *   8. volta para 'essencial' (3 usuários) e tenta criar o quarto usuário
 *      pelo formulário — tem que ser recusado no servidor.
 *
 * O passo 8 é o que separa este teste de uma inspeção visual: ele posta o
 * formulário de verdade e depois pergunta ao BANCO quantos usuários existem.
 *
 * Como rodar:
 *   BASE_URL=https://vethub-tau.vercel.app \
 *   node --env-file=.env.local tests/varredura/planos-da-conta.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, "resultado-planos");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SB || !CHAVE_SERVICO) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Rode com: node --env-file=.env.local tests/varredura/planos-da-conta.mjs"
  );
  process.exit(1);
}

const banco = createClient(URL_SB, CHAVE_SERVICO, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SUFIXO = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const MARCA = `ZZ Robo planos ${SUFIXO.slice(-4)}`;
const EMAIL = `zz.robo.planos.${SUFIXO}@example.com`;
const SENHA = `RoboPlanos${SUFIXO.slice(-6)}1`;

/**
 * O que cada tela exige. Vem casado com src/lib/plano-conta.ts de propósito:
 * se alguém mudar a política lá e esquecer da trava, este teste acusa.
 */
const TRANCADAS = [
  { rota: "/internacao", recurso: "internacao" },
  { rota: "/internacao/nova", recurso: "internacao" },
  { rota: "/financeiro/comissoes", recurso: "comissoes" },
  { rota: "/planos", recurso: "planos_de_saude" },
  { rota: "/planos/novo", recurso: "planos_de_saude" },
  { rota: "/planos/assinaturas", recurso: "planos_de_saude" },
  { rota: "/relatorios/faturamento", recurso: "relatorios_avancados" },
  { rota: "/relatorios/clientes", recurso: "relatorios_avancados" },
  { rota: "/relatorios/insumos", recurso: "relatorios_avancados" },
  { rota: "/relatorios/vacinas", recurso: "relatorios_avancados" },
  { rota: "/configuracoes/unidades", recurso: "multi_unidade" },
];

/**
 * O texto da tela, com o espaço "duro" virando espaço comum.
 *
 * `Intl.NumberFormat` separa o "R$" do número com um espaço não-separável
 * (U+00A0), invisível a olho nu. Sem esta troca, procurar "R$ 189" no texto
 * nunca acha nada e o teste acusa um defeito que não existe.
 */
const semEspacoDuro = (texto) => String(texto).replace(/ /g, " ");

/** Cada plano cobra três preços; nenhum pode faltar nem sair da ordem. */
const PRECOS = {
  essencial: { mensal: 189, semestral: 169, anual: 149 },
  profissional: { mensal: 419, semestral: 379, anual: 329 },
  completo: { mensal: 879, semestral: 789, anual: 699 },
};

/** O dia a dia. Nenhuma delas pode ser afetada por plano nenhum. */
const LIVRES = [
  "/dashboard",
  "/agenda",
  "/consultas",
  "/receitas",
  "/banho-tosa",
  "/tutores",
  "/pets",
  "/itens",
  "/estoque",
  "/compras",
  "/pdv",
  "/orcamentos",
  "/financeiro",
  "/financeiro/receber",
  "/financeiro/pagar",
  "/relatorios",
  "/relatorios/atendimentos",
  "/relatorios/estoque",
  "/relatorios/financeiro",
  "/configuracoes/clinica",
  "/configuracoes/usuarios",
  "/assinatura",
];

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok   " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

async function criarClinica() {
  const resposta = await fetch(`${BASE}/api/cadastro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinica: `${MARCA} clínica`,
      nome: `${MARCA} admin`,
      email: EMAIL,
      senha: SENHA,
    }),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !corpo?.ok) {
    throw new Error(`cadastro recusado (${resposta.status}): ${corpo?.erro ?? "sem detalhe"}`);
  }
}

/** Acha a clínica recém-criada pelo e-mail do admin. */
async function acharClinica() {
  const { data } = await banco
    .from("usuario")
    .select("clinica_id")
    .eq("email", EMAIL)
    .single();
  if (!data) throw new Error("clínica de teste não encontrada no banco");
  return data.clinica_id;
}

/**
 * Troca o plano pelo service_role — que é exatamente o caminho que a cobrança
 * vai usar. Se o trigger da migração estiver errado, quebra aqui.
 */
async function definirPlano(clinicaId, plano) {
  const { error } = await banco
    .from("clinica")
    .update({ plano, trial_termina_em: null })
    .eq("id", clinicaId);
  if (error) throw new Error(`não deu para gravar plano=${plano}: ${error.message}`);
}

async function entrar(pagina) {
  for (let i = 0; i < 3; i++) {
    await pagina.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });

    // Já entrou: /login manda quem tem sessão para o painel. Sem esta saída
    // a rodada anterior contava como fracasso justamente por ter dado certo.
    if (!pagina.url().includes("/login")) return;

    // Esperar o campo APARECER, em vez de mandar digitar direto: em servidor
    // de desenvolvimento a primeira visita ainda está compilando a página, e
    // um `fill` impaciente falha por um motivo que não é o do teste.
    const campoEmail = pagina.locator('input[type="email"], input[name="email"]');
    const apareceu = await campoEmail
      .waitFor({ state: "visible", timeout: 60000 })
      .then(() => true)
      .catch(() => false);

    if (!apareceu) {
      await pagina.screenshot({ path: path.join(SAIDA, `login-sem-campo-${i}.png`) });
      const texto = await pagina.locator("body").innerText().catch(() => "(sem corpo)");
      console.log(`  tentativa ${i + 1}: ${pagina.url()} — ${texto.slice(0, 200)}`);
      continue;
    }

    await campoEmail.fill(EMAIL);
    await pagina.fill('input[type="password"], input[name="senha"]', SENHA);
    await pagina.locator('button[type="submit"]').first().click();
    await pagina.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    if (!pagina.url().includes("/login")) return;
    await pagina.waitForTimeout(2000);
  }
  throw new Error("não consegui entrar com a conta de teste");
}

/** Abre a rota e devolve onde a pessoa foi parar. */
async function irPara(pagina, rota) {
  await pagina.goto(`${BASE}${rota}`, { waitUntil: "networkidle", timeout: 45000 });
  await pagina.waitForTimeout(200);
  return new URL(pagina.url()).pathname;
}

async function main() {
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  await criarClinica();
  const clinicaId = await acharClinica();
  registro("clínica de teste criada", true, clinicaId);

  // A conta nasce em teste, e no teste tudo tem que estar liberado — senão
  // ninguém decide comprar porque nunca viu o que está comprando.
  const { data: nova } = await banco
    .from("clinica")
    .select("plano, trial_termina_em")
    .eq("id", clinicaId)
    .single();
  registro(
    "conta nova nasce em trial com prazo",
    nova?.plano === "trial" && !!nova?.trial_termina_em,
    `plano=${nova?.plano} termina=${nova?.trial_termina_em}`
  );

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const pagina = await contexto.newPage();

  try {
    await definirPlano(clinicaId, "essencial");
    await entrar(pagina);
    registro("entrou na conta rebaixada para Essencial", true);

    // ---------------------------------------------------------------
    // 1. As telas de recurso desviam para a explicação
    // ---------------------------------------------------------------
    for (const { rota, recurso } of TRANCADAS) {
      const parou = await irPara(pagina, rota);
      const esperado = `/assinatura/recurso/${recurso}`;
      registro(
        `Essencial não entra em ${rota}`,
        parou === esperado,
        parou === esperado ? "" : `parou em ${parou}`
      );
    }

    // A tela de venda tem que EXPLICAR o recurso, não só barrar.
    await irPara(pagina, "/assinatura/recurso/internacao");
    const textoVenda = await pagina.locator("main").innerText();
    registro(
      "a tela de upgrade explica o recurso",
      /Internação/i.test(textoVenda) &&
        /Profissional/i.test(textoVenda) &&
        textoVenda.length > 200 &&
        !/acesso negado|não autorizado|erro/i.test(textoVenda),
      `${textoVenda.length} caracteres`
    );

    // ---------------------------------------------------------------
    // 2. O dia a dia continua aberto
    // ---------------------------------------------------------------
    for (const rota of LIVRES) {
      const parou = await irPara(pagina, rota);
      registro(
        `Essencial abre ${rota}`,
        parou === rota,
        parou === rota ? "" : `desviou para ${parou}`
      );
    }

    // ---------------------------------------------------------------
    // 3. O menu mostra cadeado
    // ---------------------------------------------------------------
    await irPara(pagina, "/dashboard");
    const cadeados = await pagina.evaluate(() => {
      const nav = document.querySelector("nav");
      if (!nav) return { erro: "sem nav" };
      // Abre todas as categorias para enxergar os itens de dentro.
      nav.querySelectorAll("button[aria-expanded=false]").forEach((b) => b.click());
      return null;
    });
    if (cadeados?.erro) registro("menu lateral encontrado", false, cadeados.erro);
    await pagina.waitForTimeout(400);

    const trancadosNoMenu = await pagina.evaluate(() =>
      [...document.querySelectorAll("nav a")]
        .filter((a) => a.querySelector('[aria-label="Disponível em outro plano"]'))
        .map((a) => new URL(a.href).pathname)
    );
    const esperadosNoMenu = [
      "/assinatura/recurso/internacao",
      "/assinatura/recurso/comissoes",
      "/assinatura/recurso/planos_de_saude",
      "/assinatura/recurso/relatorios_avancados",
      "/assinatura/recurso/multi_unidade",
      "/assinatura/recurso/whatsapp",
    ];
    const faltando = esperadosNoMenu.filter((e) => !trancadosNoMenu.includes(e));
    registro(
      "menu mostra cadeado nos itens fora do plano",
      faltando.length === 0 && trancadosNoMenu.length >= 6,
      faltando.length ? `sem cadeado: ${faltando.join(", ")}` : `${trancadosNoMenu.length} itens`
    );

    // ---------------------------------------------------------------
    // 4. O Completo destrava tudo
    // ---------------------------------------------------------------
    await definirPlano(clinicaId, "completo");
    let destravou = 0;
    for (const { rota } of TRANCADAS) {
      const parou = await irPara(pagina, rota);
      if (parou === rota) destravou++;
      else registro(`Completo abre ${rota}`, false, `desviou para ${parou}`);
    }
    registro(
      "Completo abre todas as telas travadas",
      destravou === TRANCADAS.length,
      `${destravou}/${TRANCADAS.length}`
    );

    // ---------------------------------------------------------------
    // 5. Os nove preços aparecem, e o desconto bate
    // ---------------------------------------------------------------
    // Preço errado na tela é o defeito mais caro que existe neste app: ou a
    // clínica paga menos do que devia, ou desiste da compra achando caro.
    for (const ciclo of ["mensal", "semestral", "anual"]) {
      await irPara(pagina, `/assinatura?ciclo=${ciclo}`);
      const texto = semEspacoDuro(await pagina.locator("main").innerText());
      const ausentes = Object.entries(PRECOS)
        .map(([plano, precos]) => ({ plano, valor: precos[ciclo] }))
        .filter(({ valor }) => !texto.includes(`R$ ${valor}`))
        .map(({ plano, valor }) => `${plano}=${valor}`);
      registro(
        `ciclo ${ciclo}: os 3 preços na tela`,
        ausentes.length === 0,
        ausentes.length ? `não achei ${ausentes.join(", ")}` : ""
      );
    }

    // A economia anunciada tem que ser a conta de verdade, não um número
    // bonito: (mensal − anual) × 12.
    await irPara(pagina, "/assinatura?ciclo=anual");
    const textoAnual = semEspacoDuro(await pagina.locator("main").innerText());
    const economias = Object.entries(PRECOS).map(
      ([plano, p]) => ({ plano, esperada: (p.mensal - p.anual) * 12 })
    );
    const errada = economias.filter(
      ({ esperada }) =>
        !textoAnual.includes(`R$ ${esperada.toLocaleString("pt-BR")}`) &&
        !textoAnual.includes(`R$ ${esperada}`)
    );
    registro(
      "economia anual anunciada bate com a conta",
      errada.length === 0,
      errada.length
        ? `errado em ${errada.map((e) => `${e.plano}=${e.esperada}`).join(", ")}`
        : economias.map((e) => `${e.plano}=${e.esperada}`).join(" · ")
    );

    // ---------------------------------------------------------------
    // 6. O teto de usuários
    // ---------------------------------------------------------------
    // O Essencial permite 3. A clínica nasce com 1 (o admin), então o
    // segundo e o terceiro entram e o quarto tem que ser recusado.
    await definirPlano(clinicaId, "essencial");

    async function tentarCriarUsuario(nome, email) {
      await pagina.goto(`${BASE}/configuracoes/usuarios/novo`, { waitUntil: "networkidle" });
      if (!pagina.url().includes("/usuarios/novo")) return "bloqueado antes do formulário";
      await pagina.fill('input[name="nome"]', nome);
      await pagina.fill('input[name="email"]', email);
      await pagina.fill('input[name="senha"]', `Senha${SUFIXO.slice(-5)}9`);
      await pagina.locator('main button[type="submit"]').first().click();
      await pagina.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await pagina.waitForTimeout(600);
      return pagina.url();
    }

    async function quantosUsuarios() {
      const { count } = await banco
        .from("usuario")
        .select("id", { count: "exact", head: true })
        .eq("clinica_id", clinicaId);
      return count;
    }

    await tentarCriarUsuario(`${MARCA} dois`, `zz.robo.planos.${SUFIXO}.b@example.com`);
    await tentarCriarUsuario(`${MARCA} tres`, `zz.robo.planos.${SUFIXO}.c@example.com`);
    const dentroDoTeto = await quantosUsuarios();
    registro(
      "os 3 usuários do Essencial cabem",
      dentroDoTeto === 3,
      `${dentroDoTeto} usuários`
    );

    const ondeParou = await tentarCriarUsuario(
      `${MARCA} quatro`,
      `zz.robo.planos.${SUFIXO}.d@example.com`
    );
    const depoisDoQuarto = await quantosUsuarios();
    registro(
      "quarto usuário é recusado pelo servidor",
      depoisDoQuarto === 3,
      `${depoisDoQuarto} usuários — parou em ${ondeParou}`
    );

    // ---------------------------------------------------------------
    // 7. O plano não muda pela aplicação
    // ---------------------------------------------------------------
    // Um admin que conseguisse gravar plano='completo' teria o sistema
    // inteiro de graça. O trigger da migração é quem impede.
    const comoAdmin = createClient(URL_SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { error: erroLogin } = await comoAdmin.auth.signInWithPassword({
      email: EMAIL,
      password: SENHA,
    });
    if (erroLogin) {
      registro("login direto no banco para o teste do trigger", false, erroLogin.message);
    } else {
      const { error: erroUpdate } = await comoAdmin
        .from("clinica")
        .update({ plano: "completo" })
        .eq("id", clinicaId);
      const { data: depois } = await banco
        .from("clinica")
        .select("plano")
        .eq("id", clinicaId)
        .single();
      registro(
        "admin da clínica não consegue se dar o plano Completo",
        depois?.plano === "essencial",
        `plano ficou ${depois?.plano}${erroUpdate ? ` (recusado: ${erroUpdate.message})` : ""}`
      );
    }
  } finally {
    await navegador.close();
  }

  const falhas = diario.filter((d) => !d.ok);
  await writeFile(
    path.join(SAIDA, "resultado.json"),
    JSON.stringify({ base: BASE, clinica: MARCA, diario }, null, 2),
    "utf8"
  );

  console.log(
    `\n${diario.length - falhas.length}/${diario.length} verificações passaram.` +
      `\nA clínica ${MARCA} ficou no banco; tests/varredura/limpar-testes.mjs remove.`
  );
  if (falhas.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
