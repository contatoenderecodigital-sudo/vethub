/**
 * Enche a clínica de demonstração com uma clínica de verdade dentro.
 *
 * Sistema vazio não se vende e não se filma: toda tela mostra "nenhum
 * registro", o painel fica com R$ 0,00 e o kanban da agenda aparece sem
 * cartão nenhum. Este script deixa a Vida Animal parecendo uma clínica em
 * funcionamento há meses, para gravar demonstração e para você mesmo ver o
 * sistema como o cliente vai ver.
 *
 * É IDEMPOTENTE: apaga o que semeou antes e semeia de novo. Rodar duas vezes
 * não duplica nada.
 *
 * As datas são relativas a HOJE — a agenda de hoje sempre tem movimento, as
 * vacinas sempre têm alguma vencendo, o caixa sempre está aberto. Não
 * envelhece.
 *
 *   node --env-file=.env.local scripts/semear-demo.mjs
 *   node --env-file=.env.local scripts/semear-demo.mjs --limpar   (só apaga)
 *
 * O alvo é escolhido por e-mail do admin, para nunca cair na clínica errada:
 *   DEMO_EMAIL=outro@exemplo.com node --env-file=.env.local scripts/semear-demo.mjs
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_ALVO = process.env.DEMO_EMAIL ?? "yungsandro23@gmail.com";
const SO_LIMPAR = process.argv.includes("--limpar");

/** Senha das contas de demonstração. Elas só existem nesta clínica. */
const SENHA_DEMO = process.env.DEMO_SENHA ?? "VidaAnimal2026!";

if (!URL || !CHAVE) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Rode com: node --env-file=.env.local scripts/semear-demo.mjs"
  );
  process.exit(1);
}

const db = createClient(URL, CHAVE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ------------------------------------------------------------------
// Datas: tudo pendurado em HOJE, para a demonstração nunca envelhecer
// ------------------------------------------------------------------
const HOJE = new Date();
HOJE.setHours(12, 0, 0, 0);

/** Data ISO (só o dia) deslocada em `dias` a partir de hoje. */
function dia(dias = 0) {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Instante ISO: `dias` a partir de hoje, na hora cheia pedida. */
function quando(dias, hora, minuto = 0) {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

const escolha = (lista, i) => lista[i % lista.length];

/**
 * Insere em lote SEM deixar o default da coluna escapar.
 *
 * O PostgREST exige que todas as linhas de um mesmo insert tenham as mesmas
 * chaves, e preenche com NULL as que faltam numa linha e existem noutra. Numa
 * coluna `not null default false` isso vira erro — foi assim que `fracionavel`
 * quebrou. Agrupar por assinatura de chaves resolve de uma vez: cada grupo vai
 * num insert próprio e quem não citou a coluna fica com o default do banco.
 */
async function inserir(tabela, linhas) {
  if (!linhas.length) return [];

  const grupos = new Map();
  for (const [i, linha] of linhas.entries()) {
    const assinatura = Object.keys(linha).sort().join("|");
    if (!grupos.has(assinatura)) grupos.set(assinatura, []);
    grupos.get(assinatura).push({ i, linha });
  }

  // A ordem de saída precisa bater com a de entrada: quem chama guarda os ids
  // por índice (`escolha(marcas, i)`), e embaralhar aqui trocaria os vínculos.
  const ids = new Array(linhas.length);
  for (const grupo of grupos.values()) {
    const { data, error } = await db
      .from(tabela)
      .insert(grupo.map((g) => g.linha))
      .select("id");
    if (error) throw new Error(`${tabela}: ${error.message}`);
    grupo.forEach((g, k) => { ids[g.i] = data[k].id; });
  }
  return ids;
}

// ------------------------------------------------------------------
// Os dados
// ------------------------------------------------------------------
const TUTORES = [
  ["Ana Paula Ribeiro", "49 99811-2233", "ana.ribeiro@example.com", "Rua das Acácias", "240", "Centro"],
  ["Carlos Eduardo Lima", "49 99822-4455", "carlos.lima@example.com", "Av. Getúlio Vargas", "1180", "Centro"],
  ["Mariana Costa", "49 99833-6677", "mari.costa@example.com", "Rua João Pessoa", "87", "São Cristóvão"],
  ["Roberto Nunes", "49 99844-8899", "roberto.nunes@example.com", "Rua Sete de Setembro", "512", "Centro"],
  ["Juliana Menezes", "49 99855-1122", "ju.menezes@example.com", "Rua dos Ipês", "33", "Jardim América"],
  ["Fernando Tavares", "49 99866-3344", "fernando.t@example.com", "Av. Brasil", "2040", "Efapi"],
  ["Patrícia Almeida", "49 99877-5566", "patricia.a@example.com", "Rua Marechal Deodoro", "715", "Centro"],
  ["Diego Fontana", "49 99888-7788", "diego.fontana@example.com", "Rua Uruguai", "129", "Passo dos Fortes"],
  ["Luciana Prado", "49 99899-9900", "lu.prado@example.com", "Rua Anita Garibaldi", "456", "Centro"],
  ["Marcos Vinícius Rosa", "49 99900-1212", "marcos.rosa@example.com", "Rua Nereu Ramos", "980", "Presidente Médici"],
  ["Camila Berto", "49 99911-3434", "camila.berto@example.com", "Rua Florianópolis", "61", "Palmital"],
  ["Rogério Schmitt", "49 99922-5656", "rogerio.s@example.com", "Linha Sede Trentin", "s/n", "Interior"],
];

/** [nome, especie, raca, sexo, idadeAnos, peso, castrado] */
const PETS = [
  ["Thor", "cachorro", "Golden Retriever", "macho", 4, 32.4, true],
  ["Mel", "cachorro", "Poodle", "femea", 7, 6.2, true],
  ["Nina", "gato", "Siamês", "femea", 3, 4.1, true],
  ["Bob", "cachorro", "Labrador", "macho", 6, 29.8, false],
  ["Luna", "gato", "Persa", "femea", 2, 3.7, true],
  ["Simba", "gato", "SRD", "macho", 5, 5.3, true],
  ["Amora", "cachorro", "Shih Tzu", "femea", 3, 5.9, true],
  ["Zeus", "cachorro", "Pastor Alemão", "macho", 8, 38.2, false],
  ["Pipoca", "cachorro", "SRD", "femea", 1, 11.4, false],
  ["Frajola", "gato", "SRD", "macho", 9, 4.8, true],
  ["Bidu", "cachorro", "Beagle", "macho", 2, 13.1, true],
  ["Cacau", "cachorro", "Yorkshire", "femea", 5, 3.2, true],
  ["Tico", "ave", "Calopsita", "macho", 2, 0.09, false],
  ["Nick", "cachorro", "Border Collie", "macho", 3, 18.6, true],
  ["Jujuba", "coelho", "Mini Lop", "femea", 1, 1.6, false],
  ["Maia", "gato", "Ragdoll", "femea", 4, 4.6, true],
  ["Bento", "cachorro", "Bulldog Francês", "macho", 2, 12.3, false],
  ["Lola", "cachorro", "Dachshund", "femea", 6, 7.8, true],
];

/** [tipo, nome, preco, custo, controlaEstoque, extras] */
const CATALOGO = [
  ["servico", "Consulta clínica", 130, 0, false, { duracao_minutos: 30, comissao_percentual: 30 }],
  ["servico", "Consulta de retorno", 0, 0, false, { duracao_minutos: 20 }],
  ["servico", "Consulta de urgência", 220, 0, false, { duracao_minutos: 40, comissao_percentual: 30 }],
  ["servico", "Aplicação de vacina", 45, 0, false, { duracao_minutos: 15 }],
  ["servico", "Banho — porte pequeno", 55, 0, false, { duracao_minutos: 60, comissao_percentual: 40 }],
  ["servico", "Banho — porte médio", 75, 0, false, { duracao_minutos: 75, comissao_percentual: 40 }],
  ["servico", "Banho — porte grande", 95, 0, false, { duracao_minutos: 90, comissao_percentual: 40 }],
  ["servico", "Tosa higiênica", 60, 0, false, { duracao_minutos: 45, comissao_percentual: 40 }],
  ["servico", "Tosa na máquina", 90, 0, false, { duracao_minutos: 75, comissao_percentual: 40 }],
  ["servico", "Corte de unhas", 25, 0, false, { duracao_minutos: 15 }],
  ["servico", "Castração — cadela", 780, 0, false, { duracao_minutos: 120, comissao_percentual: 25 }],
  ["servico", "Castração — gato", 420, 0, false, { duracao_minutos: 90, comissao_percentual: 25 }],
  ["servico", "Diária de internação", 190, 0, false, {}],
  ["servico", "Hemograma completo", 95, 40, false, {}],
  ["servico", "Raio-X (2 posições)", 180, 0, false, {}],
  ["servico", "Ultrassonografia abdominal", 240, 0, false, { comissao_percentual: 20 }],
  ["produto", "Vacina V10 (múltipla canina)", 120, 62, true, { vacina: true, estoque_minimo: 10 }],
  ["produto", "Vacina antirrábica", 85, 34, true, { vacina: true, estoque_minimo: 10 }],
  ["produto", "Vacina quádrupla felina", 130, 68, true, { vacina: true, estoque_minimo: 6 }],
  ["produto", "Vermífugo comprimido 10 kg", 38, 16, true, { medicamento: true, principio_ativo: "Praziquantel + Pirantel" }],
  ["produto", "Antipulgas 10–20 kg", 95, 52, true, { medicamento: true, principio_ativo: "Fluralaner" }],
  ["produto", "Anti-inflamatório 20 cp", 78, 39, true, { medicamento: true, requer_receita: true, principio_ativo: "Meloxicam" }],
  ["produto", "Antibiótico suspensão 30 ml", 64, 31, true, { medicamento: true, requer_receita: true, principio_ativo: "Amoxicilina + Clavulanato" }],
  ["produto", "Ração seca cães adultos 15 kg", 289, 198, true, { estoque_minimo: 5 }],
  ["produto", "Ração seca gatos castrados 10 kg", 264, 181, true, { estoque_minimo: 5 }],
  ["produto", "Ração úmida sachê 85 g", 9.5, 5.4, true, { estoque_minimo: 40 }],
  ["produto", "Shampoo hipoalergênico 500 ml", 68, 34, true, {}],
  ["produto", "Coleira antipulgas", 89, 47, true, {}],
  ["produto", "Areia sanitária 4 kg", 32, 19, true, { estoque_minimo: 12 }],
  ["produto", "Brinquedo mordedor", 45, 21, true, {}],
];

async function limpar(clinicaId) {
  // Ordem inversa das dependências. `on delete cascade` resolve a maior
  // parte, mas apagar explicitamente evita depender de como cada chave foi
  // declarada — e deixa claro o que este script considera "seu".
  const ordem = [
    "comissao", "baixa", "pagamento_venda", "venda_item", "venda",
    "movimentacao_estoque", "lote", "compra_item", "compra",
    "orcamento_item", "orcamento", "conta", "caixa",
    "assinatura", "plano_beneficio",
    "receita_item", "receita", "prescricao", "evolucao", "internacao",
    "execucao_banho_tosa", "ficha_banho_tosa",
    "protocolo_saude", "pesagem", "anexo", "consulta", "agendamento",
    "pet", "tutor", "item", "grupo_item", "marca", "unidade_medida", "fornecedor",
  ];
  for (const t of ordem) {
    // Tabelas-filhas não têm clinica_id; apaga pelo pai, que já caiu.
    const semClinica = ["venda_item", "pagamento_venda", "compra_item", "orcamento_item", "receita_item"];
    if (semClinica.includes(t)) continue;
    const { error } = await db.from(t).delete().eq("clinica_id", clinicaId);
    if (error && !/does not exist/.test(error.message)) {
      console.warn(`  aviso ao limpar ${t}: ${error.message}`);
    }
  }
}

async function main() {
  // ----------------------------------------------------------------
  // Alvo
  // ----------------------------------------------------------------
  const { data: admin } = await db
    .from("usuario")
    .select("id, nome, clinica_id")
    .eq("email", EMAIL_ALVO)
    .single();

  if (!admin) throw new Error(`Não achei usuário com e-mail ${EMAIL_ALVO}`);

  const clinica = admin.clinica_id;
  const { data: c } = await db.from("clinica").select("nome").eq("id", clinica).single();
  console.log(`Clínica: ${c.nome}  [${clinica}]`);
  console.log(`Admin:   ${admin.nome} <${EMAIL_ALVO}>\n`);

  console.log("Limpando o que havia…");
  await limpar(clinica);
  if (SO_LIMPAR) return console.log("Pronto: só limpei.");

  const { data: unidades } = await db.from("unidade").select("id").eq("clinica_id", clinica).limit(1);
  if (!unidades?.length) throw new Error("clínica sem unidade — algo errado no cadastro");

  // ----------------------------------------------------------------
  // Equipe
  // ----------------------------------------------------------------
  // Uma clínica com um usuário só não mostra escala, comissão nem "quem
  // atendeu". Estes dois entram pelo mesmo caminho do app (auth + perfil).
  const equipe = [
    { nome: "Dra. Ana Beatriz Souza", email: "ana.vet@vidaanimal.demo", papel: "veterinario" },
    { nome: "Dr. Rafael Moretti", email: "rafael.vet@vidaanimal.demo", papel: "veterinario" },
    { nome: "Bianca Andrade", email: "bianca.recepcao@vidaanimal.demo", papel: "recepcao" },
    // Login para gravar demonstração: ninguém quer o próprio e-mail pessoal
    // aparecendo no canto da tela num vídeo que vai para o site.
    { nome: "Vida Animal", email: "demo@vidaanimal.demo", papel: "admin" },
  ];

  const ids = { admin: admin.id };
  for (const p of equipe) {
    const { data: ja } = await db.from("usuario").select("id").eq("email", p.email).maybeSingle();
    if (ja) {
      ids[p.email] = ja.id;
      continue;
    }
    const { data: criado, error } = await db.auth.admin.createUser({
      email: p.email,
      password: SENHA_DEMO,
      email_confirm: true,
    });
    if (error) throw new Error(`auth ${p.email}: ${error.message}`);
    await inserir("usuario", [
      { id: criado.user.id, clinica_id: clinica, nome: p.nome, email: p.email, papel: p.papel },
    ]);
    ids[p.email] = criado.user.id;
  }
  const vetA = ids["ana.vet@vidaanimal.demo"];
  const vetB = ids["rafael.vet@vidaanimal.demo"];
  const recep = ids["bianca.recepcao@vidaanimal.demo"];
  const vets = [vetA, vetB];
  console.log(`Equipe: ${equipe.length + 1} pessoas`);

  // Se as contas já existiam de uma rodada anterior, a senha é reposta —
  // senão a segunda execução deixa um login que ninguém sabe abrir.
  for (const p of equipe) {
    await db.auth.admin.updateUserById(ids[p.email], { password: SENHA_DEMO });
  }

  // ----------------------------------------------------------------
  // Apoio do catálogo
  // ----------------------------------------------------------------
  const [un, cx, ml, kg] = await inserir("unidade_medida", [
    { clinica_id: clinica, nome: "Unidade", sigla: "un" },
    { clinica_id: clinica, nome: "Caixa", sigla: "cx" },
    { clinica_id: clinica, nome: "Mililitro", sigla: "ml", fracionavel: true },
    { clinica_id: clinica, nome: "Quilograma", sigla: "kg", fracionavel: true },
  ]);

  const marcas = await inserir(
    "marca",
    ["Zoetis", "MSD Saúde Animal", "Ceva", "Royal Canin", "Premier Pet", "Virbac"].map((nome) => ({
      clinica_id: clinica,
      nome,
    }))
  );

  const [gServ, gVac, gMed, gRac, gAces] = await inserir("grupo_item", [
    { clinica_id: clinica, nome: "Serviços clínicos", tipo: "servico" },
    { clinica_id: clinica, nome: "Vacinas", tipo: "produto" },
    { clinica_id: clinica, nome: "Medicamentos", tipo: "produto" },
    { clinica_id: clinica, nome: "Rações", tipo: "produto" },
    { clinica_id: clinica, nome: "Acessórios e higiene", tipo: "produto" },
  ]);

  const fornecedores = await inserir("fornecedor", [
    { clinica_id: clinica, nome: "Distribuidora VetSul", razao_social: "VetSul Distribuidora de Produtos Veterinários Ltda", cnpj: "12.345.678/0001-90", telefone: "49 3322-1100", email: "vendas@vetsul.example.com", contato: "Sandra" },
    { clinica_id: clinica, nome: "AgroPet Oeste", razao_social: "AgroPet Oeste Comércio Ltda", cnpj: "98.765.432/0001-10", telefone: "49 3344-2200", email: "comercial@agropet.example.com", contato: "Ivan" },
    { clinica_id: clinica, nome: "Farmácia Veterinária Central", cnpj: "45.678.912/0001-33", telefone: "49 3355-7788", contato: "Dr. Elias" },
  ]);

  // ----------------------------------------------------------------
  // Catálogo
  // ----------------------------------------------------------------
  const grupoDe = (nome) =>
    /vacina/i.test(nome) ? gVac
      : /ração|sachê/i.test(nome) ? gRac
      : /vermífugo|antipulgas|anti-inflamatório|antibiótico/i.test(nome) ? gMed
      : /shampoo|coleira|areia|brinquedo/i.test(nome) ? gAces
      : gServ;

  const itensLinhas = CATALOGO.map(([tipo, nome, preco, custo, estoque, extras], i) => ({
    clinica_id: clinica,
    tipo,
    nome,
    grupo_id: grupoDe(nome),
    marca_id: tipo === "produto" ? escolha(marcas, i) : null,
    unidade_id: /ml$/i.test(nome) ? ml : /kg\b/i.test(nome) ? kg : un,
    preco_venda: preco,
    preco_custo: custo,
    controla_estoque: estoque,
    estoque_atual: 0,
    ...extras,
  }));
  const itens = await inserir("item", itensLinhas);
  const item = Object.fromEntries(CATALOGO.map(([, nome], i) => [nome, itens[i]]));
  const precoDe = Object.fromEntries(CATALOGO.map(([, nome, p]) => [nome, p]));
  console.log(`Catálogo: ${itens.length} itens`);

  // Planos de saúde que a clínica VENDE ao tutor (item com tipo 'plano').
  const planos = await inserir("item", [
    { clinica_id: clinica, tipo: "plano", nome: "Plano Amigo — cães e gatos", preco_venda: 89.9, descricao: "Consultas ilimitadas, vacinas anuais e 15% em banho e tosa." },
    { clinica_id: clinica, tipo: "plano", nome: "Plano Amigo Plus", preco_venda: 149.9, descricao: "Tudo do Amigo, mais exames de rotina e uma castração." },
  ]);
  await inserir("plano_beneficio", [
    { clinica_id: clinica, plano_item_id: planos[0], item_id: item["Consulta clínica"], descricao: "Consulta clínica", quantidade_mes: 2 },
    { clinica_id: clinica, plano_item_id: planos[0], item_id: item["Aplicação de vacina"], descricao: "Aplicação de vacina", quantidade_mes: 1 },
    { clinica_id: clinica, plano_item_id: planos[0], item_id: item["Banho — porte médio"], descricao: "Banho com 15% de desconto", desconto_percentual: 15 },
    { clinica_id: clinica, plano_item_id: planos[1], item_id: item["Consulta clínica"], descricao: "Consulta clínica", quantidade_mes: 4 },
    { clinica_id: clinica, plano_item_id: planos[1], item_id: item["Hemograma completo"], descricao: "Hemograma completo", quantidade_mes: 1 },
    { clinica_id: clinica, plano_item_id: planos[1], item_id: item["Ultrassonografia abdominal"], descricao: "Ultrassom com 30% de desconto", desconto_percentual: 30 },
  ]);

  // ----------------------------------------------------------------
  // Tutores e pets
  // ----------------------------------------------------------------
  const tutores = await inserir(
    "tutor",
    TUTORES.map(([nome, telefone, email, logradouro, numero, bairro], i) => ({
      clinica_id: clinica,
      nome,
      telefone,
      email,
      cep: `89${800 + i}-${100 + i * 7}`.slice(0, 9),
      logradouro,
      numero,
      bairro,
      cidade: "Chapecó",
      uf: "SC",
      consentimento_lgpd: true,
    }))
  );

  const petsLinhas = PETS.map(([nome, especie, raca, sexo, idade, peso, castrado], i) => {
    const nasc = new Date(HOJE);
    nasc.setFullYear(nasc.getFullYear() - idade);
    nasc.setDate(nasc.getDate() - i * 11);
    const porte =
      peso < 5 ? "mini" : peso < 12 ? "pequeno" : peso < 25 ? "medio" : peso < 45 ? "grande" : "gigante";
    return {
      clinica_id: clinica,
      tutor_id: escolha(tutores, i),
      nome,
      especie,
      raca,
      sexo,
      data_nascimento: nasc.toISOString().slice(0, 10),
      peso,
      castrado,
      porte,
      microchip: i % 3 === 0 ? `9820000${100000 + i * 137}` : null,
      pelagem: escolha(["Curta", "Longa", "Dupla", "Encaracolada"], i),
      alergias: i % 5 === 0 ? "Frango e corantes artificiais" : null,
      observacoes: i % 4 === 0 ? "Fica agitado no consultório — atender com calma." : null,
    };
  });
  const pets = await inserir("pet", petsLinhas);
  const petDe = Object.fromEntries(PETS.map(([nome], i) => [nome, pets[i]]));
  const tutorDoPet = Object.fromEntries(pets.map((p, i) => [p, escolha(tutores, i)]));
  console.log(`Cadastros: ${tutores.length} tutores, ${pets.length} pets`);

  // Histórico de peso: é o gráfico da ficha do pet.
  const pesagens = [];
  for (const [i, p] of pets.entries()) {
    const base = PETS[i][5];
    for (const [k, atras] of [180, 120, 60, 15].entries()) {
      pesagens.push({
        clinica_id: clinica,
        pet_id: p,
        peso: Number((base * (0.9 + k * 0.033)).toFixed(2)),
        data: dia(-atras),
        registrado_por: escolha(vets, i),
      });
    }
  }
  await inserir("pesagem", pesagens);

  // ----------------------------------------------------------------
  // Estoque: compras recebidas e a entrada que elas geram
  // ----------------------------------------------------------------
  const compraveis = CATALOGO.filter(([t, , , , e]) => t === "produto" && e);
  const compras = await inserir("compra", [
    { clinica_id: clinica, fornecedor_id: fornecedores[0], numero_nota: "184223", data: dia(-38), frete: 120, status: "recebida", registrado_por: admin.id },
    { clinica_id: clinica, fornecedor_id: fornecedores[1], numero_nota: "77120", data: dia(-12), frete: 85, status: "recebida", registrado_por: admin.id },
    { clinica_id: clinica, fornecedor_id: fornecedores[2], numero_nota: "5518", data: dia(-2), frete: 0, status: "pendente", registrado_por: admin.id },
  ]);

  const compraItens = [];
  const lotes = [];
  const movimentos = [];
  for (const [i, [, nome, , custo]] of compraveis.entries()) {
    const qtd = /ração/i.test(nome) ? 20 : /sachê|areia/i.test(nome) ? 60 : 30;
    const compraId = compras[i % 2];
    compraItens.push({
      compra_id: compraId,
      item_id: item[nome],
      descricao: nome,
      quantidade: qtd,
      valor_unitario: custo,
      lote: `L${2600 + i}`,
      validade: dia(i < 3 ? 45 : 240 + i * 9),
    });
    lotes.push({
      clinica_id: clinica,
      item_id: item[nome],
      codigo: `L${2600 + i}`,
      // Os três primeiros vencem em 45 dias de propósito: sem nada perto do
      // vencimento, a tela de controle de validade abre vazia.
      validade: dia(i < 3 ? 45 : 240 + i * 9),
      quantidade: qtd,
    });
    movimentos.push({
      clinica_id: clinica,
      item_id: item[nome],
      tipo: "entrada",
      quantidade: qtd,
      valor_unitario: custo,
      motivo: "Compra recebida",
      origem: "compra",
      registrado_por: admin.id,
      data: quando(i % 2 ? -12 : -38, 9),
    });
  }
  await inserir("compra_item", compraItens);
  const lotesIds = await inserir("lote", lotes);
  await inserir("movimentacao_estoque", movimentos);

  // Saídas: sem elas o estoque fica intacto e o relatório de consumo é uma
  // tela de zeros. Uma delas derruba a ração abaixo do mínimo, para o alerta
  // de estoque baixo aparecer.
  const saidas = compraveis.slice(0, 10).map(([, nome], i) => ({
    clinica_id: clinica,
    item_id: item[nome],
    lote_id: lotesIds[i],
    tipo: "saida",
    quantidade: /ração seca cães/i.test(nome) ? 17 : 4 + (i % 5),
    valor_unitario: precoDe[nome],
    motivo: "Uso em atendimento",
    origem: "consulta",
    registrado_por: escolha(vets, i),
    data: quando(-(3 + i), 14),
  }));
  await inserir("movimentacao_estoque", saidas);
  console.log(`Estoque: ${compras.length} compras, ${lotes.length} lotes`);

  // ----------------------------------------------------------------
  // Agenda
  // ----------------------------------------------------------------
  // O dia de HOJE precisa ter cartão em cada coluna do kanban, senão a tela
  // principal do sistema aparece vazia na demonstração.
  const TIPOS = ["consulta", "retorno", "banho_tosa", "cirurgia"];
  const hojeAgenda = [
    [8, 0, "consulta", "check_out", "Thor"],
    [8, 30, "banho_tosa", "check_out", "Mel"],
    [9, 0, "consulta", "pronto", "Nina"],
    [9, 30, "retorno", "atendido", "Bob"],
    [10, 0, "consulta", "atendido", "Luna"],
    [10, 30, "banho_tosa", "check_in", "Amora"],
    [11, 0, "cirurgia", "check_in", "Pipoca"],
    [13, 30, "consulta", "agendado", "Simba"],
    [14, 0, "consulta", "agendado", "Zeus"],
    [14, 30, "banho_tosa", "agendado", "Cacau"],
    [15, 0, "retorno", "agendado", "Bidu"],
    [16, 0, "consulta", "agendado", "Maia"],
    [16, 30, "consulta", "cancelado", "Frajola"],
  ];

  const agLinhas = hojeAgenda.map(([h, m, tipo, status, pet], i) => ({
    clinica_id: clinica,
    pet_id: petDe[pet],
    veterinario_id: tipo === "banho_tosa" ? recep : escolha(vets, i),
    data_hora: quando(0, h, m),
    tipo,
    status,
    observacoes: status === "cancelado" ? "Tutor remarcou por telefone" : null,
    check_in_em: ["check_in", "atendido", "pronto", "check_out"].includes(status)
      ? quando(0, h, m + 5)
      : null,
    check_out_em: status === "check_out" ? quando(0, h + 1, m) : null,
  }));

  // Próximos dias, para a agenda não acabar em hoje.
  for (let d = 1; d <= 12; d++) {
    for (const [k, h] of [8, 9, 10, 14, 15, 16].entries()) {
      if ((d + k) % 3 === 0) continue;
      agLinhas.push({
        clinica_id: clinica,
        pet_id: escolha(pets, d * 7 + k),
        veterinario_id: escolha(vets, d + k),
        data_hora: quando(d, h, (k % 2) * 30),
        tipo: escolha(TIPOS, d + k),
        status: "agendado",
      });
    }
  }
  // Passado: é o que alimenta o gráfico do painel e o relatório de
  // atendimentos. Precisa ser DENSO — semeado ralo, o gráfico dos últimos 7
  // dias vira uma linha rente ao chão com um pico no dia de hoje, e a
  // clínica parece ter aberto ontem.
  //
  // Domingo fecha e sábado é meio expediente, como clínica de verdade. Sem
  // isso o relatório mostra movimento igual nos sete dias da semana, que é o
  // tipo de detalhe que denuncia dado inventado.
  for (let d = 1; d <= 90; d++) {
    const diaSemana = new Date(quando(-d, 12)).getDay();
    if (diaSemana === 0) continue;
    const quantos = diaSemana === 6 ? 4 : 7 + ((d * 3) % 5);
    for (let k = 0; k < quantos; k++) {
      const hora = 8 + Math.floor((k * 10) / quantos);
      agLinhas.push({
        clinica_id: clinica,
        pet_id: escolha(pets, d * 5 + k * 3),
        veterinario_id: escolha(vets, d + k),
        data_hora: quando(-d, hora, (k % 2) * 30),
        tipo: escolha(TIPOS, d + k * 2),
        status: (d + k) % 17 === 0 ? "cancelado" : "check_out",
      });
    }
  }
  const agendamentos = await inserir("agendamento", agLinhas);
  console.log(`Agenda: ${agendamentos.length} agendamentos (${hojeAgenda.length} hoje)`);

  return { clinica, admin, vets, vetA, vetB, recep, item, precoDe, petDe, pets, tutores, tutorDoPet, planos, agendamentos, agLinhas, fornecedores };
}

main()
  .then(async (ctx) => {
    if (!ctx) return;
    const { semearAtendimento } = await import("./semear-demo-parte2.mjs");
    await semearAtendimento(db, ctx, { dia, quando, escolha, inserir, HOJE });
    console.log("\nPronto. A clínica está cheia.\n");
    console.log("Para gravar a demonstração, entre com:");
    console.log("  demo@vidaanimal.demo             administrador");
    console.log("  ana.vet@vidaanimal.demo          veterinária");
    console.log("  bianca.recepcao@vidaanimal.demo  recepção (não vê o dinheiro)");
    console.log(`  senha: ${SENHA_DEMO}`);
  })
  .catch((e) => {
    console.error("\nFALHOU:", e.message);
    process.exit(1);
  });
