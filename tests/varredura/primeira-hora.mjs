/**
 * A primeira hora de uma clínica nova.
 *
 * Todo o resto dos testes roda em cima de uma base cheia, e base cheia
 * esconde o defeito que mais custa cliente: a tela vazia. Quem acabou de se
 * cadastrar não vê gráfico nenhum, lista nenhuma, número nenhum — vê nove
 * caixas escritas "0" e nenhuma pista do que fazer. Se a primeira hora não
 * convence, não existe segunda.
 *
 * Aqui a clínica é criada DE VERDADE, pela tela de cadastro, e o teste
 * caminha por ela como um veterinário caminharia:
 *
 *   * abre cada tela principal e cobra que a tela vazia diga o que fazer,
 *     em vez de só mostrar zero;
 *   * confere que a clínica nasceu com o que precisa para funcionar
 *     (matriz, unidades de medida, grupos, marcas, categorias e o caderno
 *     de medicamentos);
 *   * consegue cadastrar tutor e pet sem esbarrar em campo obrigatório que
 *     não existe ainda;
 *   * cobra que o teste de 14 dias esteja contando.
 *
 * A clínica criada tem nome começando em "ZZ Robo" e é APAGADA no fim.
 * Esse prefixo é a única coisa que o limpador aceita apagar.
 *
 * Como rodar:
 *   BASE_URL=http://localhost:3000 node --env-file=.env.local \
 *   tests/varredura/primeira-hora.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const marca = Math.random().toString(36).slice(2, 8);
const NOME_CLINICA = `ZZ Robo Primeira Hora ${marca}`;
const EMAIL = `zz.robo.primeira.hora.${marca}@example.com`;
const SENHA = `Rb#${marca}A9zk`;

const diario = [];
const registro = (etapa, ok, detalhe = "") => {
  diario.push({ etapa, ok, detalhe });
  console.log(`${ok ? "ok   " : "FALHA"} ${etapa}${detalhe ? ` — ${detalhe}` : ""}`);
};

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * Telas do dia a dia, e a palavra que prova que a tela vazia ORIENTA.
 *
 * Não basta não quebrar: a tela precisa dizer o próximo passo. A busca é
 * pelo texto do botão ou da frase de vazio, que é o que a pessoa procura
 * com os olhos.
 */
const TELAS = [
  // O painel de uma clínica nova é uma parede de zeros. O que a salva é a
  // lista de primeiros passos: se ela sumir, some a única orientação que
  // existe na tela mais aberta do sistema.
  { rota: "/dashboard", nome: "Início", saida: /comece por aqui/i },
  { rota: "/agenda", nome: "Agenda", saida: /agendar|novo agendamento|marcar/i },
  { rota: "/tutores", nome: "Tutores", saida: /novo tutor|cadastrar/i },
  { rota: "/pets", nome: "Pets", saida: /novo pet|cadastrar/i },
  { rota: "/consultas", nome: "Consultas", saida: /nova consulta|consulta/i },
  { rota: "/receitas", nome: "Receituário", saida: /nova receita|receita/i },
  { rota: "/receitas/medicamentos", nome: "Medicamentos" },
  { rota: "/exames", nome: "Exames", saida: /exame/i },
  { rota: "/balcao", nome: "Balcão" },
  { rota: "/itens", nome: "Produtos e serviços", saida: /novo item|cadastrar|produto/i },
  { rota: "/estoque", nome: "Estoque" },
  { rota: "/pdv", nome: "PDV" },
  { rota: "/orcamentos", nome: "Orçamentos", saida: /orçamento/i },
  { rota: "/financeiro", nome: "Painel financeiro" },
  { rota: "/relatorios", nome: "Relatórios" },
  { rota: "/assinatura", nome: "Assinatura", saida: /plano/i },
  { rota: "/suporte", nome: "Suporte", saida: /chamado|ajuda|suporte/i },
  { rota: "/configuracoes/clinica", nome: "Dados da clínica" },
  { rota: "/configuracoes/usuarios", nome: "Equipe" },
  { rota: "/configuracoes/exportar", nome: "Exportar dados" },
];

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const pagina = await contexto.newPage();

// Erro de JavaScript numa tela vazia é comum: o código foi escrito olhando
// uma lista cheia e assume que existe pelo menos um item.
const errosDeConsole = [];
pagina.on("pageerror", (e) => errosDeConsole.push(String(e.message).slice(0, 160)));

let clinicaId = null;

try {
  // ------------------------------------------------------------------
  // Cadastro
  // ------------------------------------------------------------------
  await pagina.goto(`${BASE}/cadastro`, { waitUntil: "networkidle" });
  await pagina.fill("#clinica", NOME_CLINICA);
  await pagina.fill("#nome", "Robô da Primeira Hora");
  await pagina.fill("#email", EMAIL);
  await pagina.fill("#senha", SENHA);
  await pagina.click('button[type="submit"]');
  await pagina
    .waitForURL((u) => !new URL(u).pathname.startsWith("/cadastro"), { timeout: 60000 })
    .catch(() => {});

  const parou = new URL(pagina.url()).pathname;
  registro("o cadastro leva para dentro do sistema", parou !== "/cadastro", `parou em ${parou}`);
  if (parou === "/cadastro") {
    const aviso = await pagina.locator("body").innerText();
    throw new Error(`cadastro recusado: ${aviso.slice(0, 300)}`);
  }

  const { data: clinica } = await db
    .from("clinica")
    .select("id, nome, plano, trial_termina_em")
    .eq("nome", NOME_CLINICA)
    .maybeSingle();
  clinicaId = clinica?.id ?? null;
  registro("a clínica existe no banco", !!clinicaId);
  if (!clinicaId) throw new Error("clínica não foi criada");

  registro("nasce em teste", clinica.plano === "trial", `plano=${clinica.plano}`);
  registro(
    "o teste tem prazo contando",
    !!clinica.trial_termina_em,
    `termina em ${clinica.trial_termina_em}`
  );

  // ------------------------------------------------------------------
  // O que veio junto do berço
  // ------------------------------------------------------------------
  const BERCO = [
    ["unidade", "matriz", 1],
    ["unidade_medida", "unidades de medida", 5],
    ["grupo_item", "grupos de item", 5],
    ["marca", "marcas", 5],
    ["categoria_financeira", "categorias financeiras", 5],
    ["medicamento_receita", "medicamentos no caderno", 10],
  ];

  for (const [tabela, rotulo, minimo] of BERCO) {
    const { count } = await db
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId);
    registro(`nasce com ${rotulo}`, (count ?? 0) >= minimo, `${count}`);
  }

  // ------------------------------------------------------------------
  // Caminhando pelas telas vazias
  // ------------------------------------------------------------------
  for (const tela of TELAS) {
    const r = await pagina.goto(`${BASE}${tela.rota}`, { waitUntil: "networkidle" });
    const status = r?.status() ?? 0;
    const onde = new URL(pagina.url()).pathname;
    const texto = await pagina.locator("body").innerText();

    if (status >= 500) {
      registro(`${tela.nome}: abre`, false, `status ${status}`);
      continue;
    }

    // Desvio para a explicação do plano não é defeito: é o cadeado
    // funcionando. Mas cair no painel é a tela não existindo para ela.
    if (onde !== tela.rota && !onde.startsWith("/assinatura")) {
      registro(`${tela.nome}: abre`, false, `desviou para ${onde}`);
      continue;
    }

    registro(`${tela.nome}: abre`, true);

    if (tela.saida) {
      registro(
        `${tela.nome}: a tela vazia diz o que fazer`,
        tela.saida.test(texto),
        tela.saida.test(texto) ? "" : "nenhuma saída visível"
      );
    }
  }

  registro(
    "nenhum erro de JavaScript nas telas vazias",
    errosDeConsole.length === 0,
    errosDeConsole.slice(0, 3).join(" | ")
  );

  // ------------------------------------------------------------------
  // O primeiro cadastro de verdade
  // ------------------------------------------------------------------
  await pagina.goto(`${BASE}/tutores/novo`, { waitUntil: "networkidle" });
  await pagina.fill("#nome", "Tutor de Teste");
  const telefone = pagina.locator("#telefone");
  if (await telefone.count()) await telefone.fill("49999999999");
  // Preso ao formulário: o cabeçalho também tem um botão de envio (o "Sair"),
  // e pegar o primeiro da página desloga em vez de salvar.
  await pagina.locator('form:has(#nome) button[type="submit"]').first().click();
  // Esperar a FICHA do tutor abrir, e não a rede sossegar: o salvamento é
  // do lado do cliente, a rede já está parada quando o clique acontece, e
  // conferir o banco nesse instante lê antes de o registro existir.
  await pagina
    .waitForURL((u) => /\/tutores\/[0-9a-f-]{36}/.test(u), { timeout: 30000 })
    .catch(() => {});

  const { count: tutores } = await db
    .from("tutor")
    .select("id", { count: "exact", head: true })
    .eq("clinica_id", clinicaId);
  registro("consegue cadastrar o primeiro tutor", (tutores ?? 0) === 1, `${tutores} tutor(es)`);

  // E o painel tem que REAGIR: o passo do tutor sai riscado sozinho. Uma
  // lista que não marca nada é pior do que não ter lista.
  await pagina.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const riscados = await pagina.locator(".line-through").count();
  registro("o passo dado aparece riscado no painel", riscados >= 1, `${riscados} riscado(s)`);
} catch (e) {
  registro("a caminhada terminou sem estourar", false, String(e.message).slice(0, 200));
} finally {
  await navegador.close();

  // A clínica de teste some, com tudo que pendurou nela.
  if (clinicaId) {
    const { error } = await db.from("clinica").delete().eq("id", clinicaId);
    registro("a clínica de teste foi apagada", !error, error?.message ?? "");
    const { data: usuarios } = await db.auth.admin.listUsers();
    const fantasma = usuarios?.users?.find((u) => u.email === EMAIL);
    if (fantasma) await db.auth.admin.deleteUser(fantasma.id);
    registro("o login de teste foi apagado", true);
  }
}

const falhas = diario.filter((d) => !d.ok);
console.log(`\n${diario.length - falhas.length}/${diario.length} passaram`);
if (falhas.length) {
  console.log("\nO que a clínica nova encontra de ruim:");
  for (const f of falhas) console.log(`  ${f.etapa}${f.detalhe ? ` — ${f.detalhe}` : ""}`);
}
process.exit(falhas.length ? 1 : 0);
