/**
 * Segunda metade do semeador: o que acontece DEPOIS de a pessoa chegar.
 *
 * Separado de `semear-demo.mjs` só por tamanho — um arquivo de mil linhas
 * ninguém revisa. A ordem aqui importa: consulta antes de receita, venda
 * antes de conta, conta antes de baixa.
 *
 * Chamado por semear-demo.mjs; não roda sozinho.
 */

const QUEIXAS = [
  ["Coceira e vermelhidão na barriga", "Tutor relata coceira há 5 dias, piora à noite. Sem mudança de ração.", "Eritema em região abdominal, sem ectoparasitas visíveis. TPC 2s, mucosas normocoradas.", "Dermatite alérgica", "Anti-inflamatório por 7 dias, shampoo hipoalergênico 2×/semana. Retorno em 15 dias."],
  ["Vômito há dois dias", "Vomitou 4 vezes desde ontem, recusa ração, bebe água normalmente.", "Desidratação leve (~5%), abdome sensível à palpação. T 39,1 °C.", "Gastrite aguda", "Jejum de 12h, antiemético, dieta úmida fracionada. Retorno se persistir."],
  ["Mancando da pata traseira direita", "Começou depois de correr no parque no domingo.", "Dor à extensão do joelho direito, sem instabilidade franca. Sem edema.", "Suspeita de lesão de ligamento", "Repouso 10 dias, anti-inflamatório, raio-X solicitado."],
  ["Consulta de rotina e vacina", "Sem queixas. Tutor quer atualizar carteira de vacinação.", "Exame físico dentro da normalidade. Escore corporal 5/9.", "Animal hígido", "V10 aplicada hoje. Retorno em 21 dias para reforço."],
  ["Emagrecimento e sede excessiva", "Perdeu peso no último mês mesmo comendo bem. Bebe muita água.", "Escore corporal 3/9, desidratação leve, linfonodos normais.", "Suspeita de diabetes — aguardando exames", "Hemograma e glicemia solicitados. Retorno com resultados."],
  ["Otite — balança a cabeça", "Coça a orelha esquerda e balança a cabeça há uma semana.", "Conduto auditivo esquerdo hiperêmico, secreção marrom com odor.", "Otite externa", "Limpeza auricular e antibiótico tópico por 10 dias."],
  ["Check-up pré-operatório", "Castração agendada. Sem queixas.", "Exame físico normal, ausculta cardiopulmonar sem alterações.", "Apto para cirurgia", "Jejum de 12h. Cirurgia mantida."],
  ["Dificuldade para urinar", "Vai à caixa de areia várias vezes e sai pouca urina.", "Bexiga repleta e dolorosa à palpação. Animal apático.", "Obstrução uretral felina", "Sondagem de urgência, internação para fluidoterapia."],
];

export async function semearAtendimento(db, ctx, aux) {
  const { dia, quando, escolha, inserir } = aux;
  const {
    clinica, admin, vets, vetA, vetB, recep,
    item, precoDe, petDe, pets, tutores, tutorDoPet, planos, fornecedores,
  } = ctx;

  // ----------------------------------------------------------------
  // Consultas com prontuário de verdade
  // ----------------------------------------------------------------
  // Prontuário vazio é o que faz a demonstração parecer maquete. Cada
  // consulta leva queixa, anamnese, exame físico, diagnóstico e conduta.
  const consultasLinhas = [];
  for (let d = 1; d <= 45; d++) {
    if (d % 2 === 0) continue;
    for (const k of [0, 1]) {
      const q = QUEIXAS[(d + k) % QUEIXAS.length];
      consultasLinhas.push({
        clinica_id: clinica,
        pet_id: escolha(pets, d * 3 + k),
        veterinario_id: escolha(vets, d + k),
        data: quando(-d, 9 + k * 4, 20),
        queixa: q[0],
        anamnese: q[1],
        exame_fisico: q[2],
        diagnostico: q[3],
        conduta: q[4],
      });
    }
  }
  // As de hoje, que já foram atendidas.
  for (const [k, nome] of ["Thor", "Nina", "Bob", "Luna"].entries()) {
    const q = QUEIXAS[k];
    consultasLinhas.push({
      clinica_id: clinica,
      pet_id: petDe[nome],
      veterinario_id: escolha(vets, k),
      data: quando(0, 8 + k, 15),
      queixa: q[0],
      anamnese: q[1],
      exame_fisico: q[2],
      diagnostico: q[3],
      conduta: q[4],
    });
  }
  const consultas = await inserir("consulta", consultasLinhas);
  console.log(`Prontuário: ${consultas.length} consultas`);

  // ----------------------------------------------------------------
  // Vacinas e vermífugos
  // ----------------------------------------------------------------
  // Espalhadas de propósito: algumas VENCIDAS (para o relatório de vacinas a
  // vencer ter linha vermelha), algumas vencendo nos próximos dias, o resto
  // em dia. Sem isso a tela abre vazia e parece quebrada.
  const VACINAS = [
    ["vacina", "V10 (múltipla canina)", "Zoetis", 365],
    ["vacina", "Antirrábica", "MSD Saúde Animal", 365],
    ["vacina", "Quádrupla felina", "Ceva", 365],
    ["vermifugo", "Vermífugo oral", "Virbac", 180],
    ["antiparasitario", "Antipulgas", "MSD Saúde Animal", 90],
  ];
  const protocolos = [];
  for (const [i, p] of pets.entries()) {
    for (const [k, [tipo, nome, fab, validade]] of VACINAS.entries()) {
      if ((i + k) % 3 === 0) continue;
      // −20 dias joga o vencimento para trás; +40 empurra para a frente.
      const desloc = (i + k) % 5 === 0 ? -(validade + 20) : -(validade - 40 - ((i * 7 + k * 13) % 120));
      protocolos.push({
        clinica_id: clinica,
        pet_id: p,
        tipo,
        nome,
        lote: `V${3100 + i * 5 + k}`,
        fabricante: fab,
        data_aplicacao: dia(desloc),
        proxima_dose: dia(desloc + validade),
        dose: tipo === "vacina" ? (k === 0 ? "Reforço anual" : "Dose única") : null,
        veterinario_id: escolha(vets, i + k),
      });
    }
  }
  await inserir("protocolo_saude", protocolos);
  console.log(`Saúde preventiva: ${protocolos.length} vacinas e vermífugos`);

  // ----------------------------------------------------------------
  // Receituário
  // ----------------------------------------------------------------
  const receitas = await inserir(
    "receita",
    consultas.slice(0, 14).map((cid, i) => ({
      clinica_id: clinica,
      pet_id: consultasLinhas[i].pet_id,
      consulta_id: cid,
      veterinario_id: consultasLinhas[i].veterinario_id,
      tipo: i % 5 === 0 ? "controlada" : "simples",
      data: consultasLinhas[i].data.slice(0, 10),
      orientacoes: "Administrar com alimento. Suspender e retornar em caso de vômito ou apatia.",
      retorno_em: dia(-((i * 3) % 30) + 15),
    }))
  );
  const receitaItens = [];
  for (const [i, r] of receitas.entries()) {
    receitaItens.push({
      receita_id: r,
      item_id: item["Anti-inflamatório 20 cp"],
      medicamento: "Meloxicam",
      concentracao: "2 mg/ml",
      forma_farmaceutica: "Suspensão oral",
      quantidade: "1 frasco",
      posologia: "0,1 mg/kg a cada 24 h por 5 dias",
      via: "Oral",
      ordem: 1,
    });
    if (i % 2 === 0) {
      receitaItens.push({
        receita_id: r,
        item_id: item["Antibiótico suspensão 30 ml"],
        medicamento: "Amoxicilina + Clavulanato",
        concentracao: "50 mg/ml",
        forma_farmaceutica: "Suspensão oral",
        quantidade: "1 frasco de 30 ml",
        posologia: "12,5 mg/kg a cada 12 h por 7 dias",
        via: "Oral",
        ordem: 2,
      });
    }
  }
  await inserir("receita_item", receitaItens);
  console.log(`Receituário: ${receitas.length} receitas`);

  // ----------------------------------------------------------------
  // Internação
  // ----------------------------------------------------------------
  // Uma internada AGORA (a tela precisa de alguém dentro) e duas que já
  // tiveram alta, para o histórico não ficar vazio.
  const internacoes = await inserir("internacao", [
    { clinica_id: clinica, pet_id: petDe["Frajola"], veterinario_id: vetA, box: "Box 2", data_entrada: quando(-2, 18, 30), motivo: "Obstrução uretral felina", diagnostico: "Obstrução uretral por urólitos", status: "internado", observacoes: "Sonda uretral mantida. Fluidoterapia contínua." },
    { clinica_id: clinica, pet_id: petDe["Zeus"], veterinario_id: vetB, box: "Box 1", data_entrada: quando(-14, 10, 0), data_saida: quando(-11, 16, 0), motivo: "Gastroenterite hemorrágica", diagnostico: "Gastroenterite hemorrágica", status: "alta" },
    { clinica_id: clinica, pet_id: petDe["Pipoca"], veterinario_id: vetA, box: "Box 3", data_entrada: quando(-30, 8, 0), data_saida: quando(-28, 11, 0), motivo: "Pós-operatório de castração", status: "alta" },
  ]);

  const evolucoes = [];
  for (let h = 0; h < 10; h++) {
    evolucoes.push({
      clinica_id: clinica,
      internacao_id: internacoes[0],
      data_hora: quando(-2 + Math.floor(h / 4), 6 + (h % 4) * 4, 0),
      texto:
        h % 3 === 0
          ? "Animal alerta, responsivo. Urina drenando pela sonda, aspecto mais claro que ontem."
          : h % 3 === 1
            ? "Aceitou pequena porção de dieta úmida. Sem vômitos no período."
            : "Mantida fluidoterapia. Sem alterações no período.",
      temperatura: Number((38.2 + (h % 5) * 0.22).toFixed(1)),
      frequencia_cardiaca: 120 + (h % 6) * 7,
      frequencia_respiratoria: 24 + (h % 4) * 3,
      responsavel_id: escolha(vets, h),
    });
  }
  await inserir("evolucao", evolucoes);

  await inserir("prescricao", [
    { clinica_id: clinica, internacao_id: internacoes[0], medicamento: "Ringer com lactato", dose: "4 ml/kg/h", via: "IV", frequencia_horas: 24, horarios: ["06:00"], inicio: quando(-2, 19, 0), prescrito_por: vetA, observacao: "Bomba de infusão" },
    { clinica_id: clinica, internacao_id: internacoes[0], medicamento: "Dipirona", dose: "25 mg/kg", via: "IV", frequencia_horas: 8, horarios: ["06:00", "14:00", "22:00"], inicio: quando(-2, 20, 0), prescrito_por: vetA },
    { clinica_id: clinica, internacao_id: internacoes[0], medicamento: "Amoxicilina + Clavulanato", dose: "20 mg/kg", via: "IV", frequencia_horas: 12, horarios: ["08:00", "20:00"], inicio: quando(-2, 20, 0), prescrito_por: vetA },
  ]);
  console.log(`Internação: ${internacoes.length} (1 em andamento)`);

  // ----------------------------------------------------------------
  // Banho e tosa
  // ----------------------------------------------------------------
  const peludos = ["Mel", "Amora", "Cacau", "Lola", "Thor", "Bidu"];
  await inserir(
    "ficha_banho_tosa",
    peludos.map((nome, i) => ({
      clinica_id: clinica,
      pet_id: petDe[nome],
      tipo_tosa: escolha(["higienica", "maquina", "tesoura", "bebe"], i),
      altura_maquina: escolha(["3 mm", "6 mm", "9 mm"], i),
      shampoo: escolha(["Hipoalergênico", "Neutro", "Clorexidina"], i),
      perfume: escolha(["Baby", "Frutas vermelhas", "Sem perfume"], i),
      restricoes: i % 3 === 0 ? "Alergia a perfume forte" : null,
      temperamento: escolha(["docil", "agitado", "medroso"], i),
      observacoes: i % 2 === 0 ? "Não gosta de secador no rosto — usar toalha." : null,
    }))
  );

  const { data: agBanho } = await db
    .from("agendamento")
    .select("id, pet_id, data_hora")
    .eq("clinica_id", clinica)
    .eq("tipo", "banho_tosa")
    .lte("data_hora", new Date().toISOString())
    .limit(24);

  await inserir(
    "execucao_banho_tosa",
    (agBanho ?? []).map((a, i) => ({
      clinica_id: clinica,
      agendamento_id: a.id,
      pet_id: a.pet_id,
      profissional_id: recep,
      servicos: i % 2 === 0 ? ["Banho", "Tosa higiênica", "Corte de unhas"] : ["Banho", "Hidratação"],
      inicio: a.data_hora,
      fim: new Date(new Date(a.data_hora).getTime() + 75 * 60000).toISOString(),
      observacoes: i % 4 === 0 ? "Pet tranquilo, sem intercorrências." : null,
    }))
  );
  console.log(`Banho e tosa: ${peludos.length} fichas, ${agBanho?.length ?? 0} execuções`);

  // ----------------------------------------------------------------
  // Caixa e vendas
  // ----------------------------------------------------------------
  const caixas = await inserir("caixa", [
    { clinica_id: clinica, aberto_por: recep, abertura: quando(-1, 8, 0), fechamento: quando(-1, 18, 30), valor_abertura: 200, valor_fechamento: 1840.5, status: "fechado" },
    { clinica_id: clinica, aberto_por: recep, abertura: quando(0, 8, 0), valor_abertura: 200, status: "aberto" },
  ]);
  const caixaHoje = caixas[1];

  const CESTAS = [
    [["Consulta clínica", 1], ["Vacina V10 (múltipla canina)", 1], ["Aplicação de vacina", 1]],
    [["Banho — porte médio", 1], ["Tosa higiênica", 1]],
    [["Consulta clínica", 1], ["Hemograma completo", 1]],
    [["Ração seca cães adultos 15 kg", 1], ["Antipulgas 10–20 kg", 1]],
    [["Consulta de urgência", 1], ["Raio-X (2 posições)", 1], ["Anti-inflamatório 20 cp", 1]],
    [["Banho — porte pequeno", 1], ["Corte de unhas", 1], ["Shampoo hipoalergênico 500 ml", 1]],
    [["Castração — gato", 1], ["Diária de internação", 2]],
    [["Ração úmida sachê 85 g", 12], ["Areia sanitária 4 kg", 2]],
  ];
  const FORMAS = ["pix", "credito", "dinheiro", "debito", "fiado"];

  const vendasLinhas = [];
  const cestaDe = [];
  for (let d = 0; d <= 45; d++) {
    const quantas = d === 0 ? 5 : d % 7 === 0 ? 1 : 2;
    for (let k = 0; k < quantas; k++) {
      const petId = escolha(pets, d * 4 + k);
      cestaDe.push(escolha(CESTAS, d + k));
      vendasLinhas.push({
        clinica_id: clinica,
        caixa_id: d === 0 ? caixaHoje : caixas[0],
        tutor_id: tutorDoPet[petId],
        pet_id: petId,
        data: quando(-d, 9 + ((d + k) % 8), 25),
        status: "paga",
        vendedor_id: escolha([recep, vetA, vetB], d + k),
      });
    }
  }
  const vendas = await inserir("venda", vendasLinhas);

  // Os itens: o gatilho `trg_venda_item_recalc` refaz o total da venda, então
  // subtotal e valor_total não são escritos à mão.
  const vendaItens = [];
  const totalDaVenda = [];
  for (const [i, v] of vendas.entries()) {
    let total = 0;
    for (const [nome, qtd] of cestaDe[i]) {
      const preco = precoDe[nome];
      total += preco * qtd;
      vendaItens.push({
        venda_id: v,
        item_id: item[nome],
        descricao: nome,
        quantidade: qtd,
        valor_unitario: preco,
        profissional_id: /banho|tosa|unhas/i.test(nome) ? recep : escolha(vets, i),
      });
    }
    totalDaVenda.push(total);
  }
  await inserir("venda_item", vendaItens);

  // Pagamento: a maioria à vista, uma parte fiado — que é o que faz existir
  // conta a receber e o "quanto o tutor deve" na ficha dele.
  const pagamentos = [];
  const fiados = [];
  for (const [i, v] of vendas.entries()) {
    const forma = escolha(FORMAS, i * 3 + 1);
    if (forma === "fiado") {
      fiados.push({ venda: v, indice: i, valor: totalDaVenda[i] });
      continue;
    }
    pagamentos.push({
      venda_id: v,
      forma,
      valor: totalDaVenda[i],
      parcelas: forma === "credito" ? 1 + (i % 3) : 1,
    });
  }
  await inserir("pagamento_venda", pagamentos);
  console.log(`Vendas: ${vendas.length} (${fiados.length} fiadas)`);

  // ----------------------------------------------------------------
  // Financeiro
  // ----------------------------------------------------------------
  const { data: categorias } = await db
    .from("categoria_financeira")
    .select("id, nome, tipo")
    .eq("clinica_id", clinica);
  const catReceita = categorias?.find((c) => c.tipo === "receita")?.id ?? null;
  const catDespesa = categorias?.find((c) => c.tipo === "despesa")?.id ?? null;

  // Toda venda fiada vira conta a receber — é a regra do livro único
  // (docs/decisoes-financeiras.md). Parte já foi paga, parte vence adiante,
  // e duas estão vencidas, para o painel ter vermelho.
  const contasReceber = fiados.map((f, i) => ({
    clinica_id: clinica,
    tipo: "receber",
    descricao: `Venda #${i + 1} — pagamento combinado`,
    categoria_id: catReceita,
    tutor_id: vendasLinhas[f.indice].tutor_id,
    venda_id: f.venda,
    valor: f.valor,
    vencimento: dia(i === 0 ? 0 : i % 4 === 0 ? -(5 + i) : 3 + i * 2),
    status: "aberta",
    registrado_por: recep,
  }));
  const idsReceber = await inserir("conta", contasReceber);

  const contasPagar = [
    ["Aluguel do imóvel", 4200, -3, "paga", catDespesa],
    ["Energia elétrica", 690.4, 0, "aberta", catDespesa],
    ["Água e esgoto", 210.9, 6, "aberta", catDespesa],
    ["Internet e telefonia", 189.9, 8, "aberta", catDespesa],
    ["Distribuidora VetSul — nota 184223", 5840, -12, "paga", catDespesa],
    ["AgroPet Oeste — nota 77120", 3120, 12, "aberta", catDespesa],
    ["Contabilidade", 780, 10, "aberta", catDespesa],
    ["Coleta de resíduos de saúde", 340, -2, "aberta", catDespesa],
    ["Salários e encargos", 11800, 5, "aberta", catDespesa],
  ].map(([descricao, valor, venc, status, categoria_id]) => ({
    clinica_id: clinica,
    tipo: "pagar",
    descricao,
    categoria_id,
    fornecedor: /VetSul|AgroPet/.test(descricao) ? descricao.split(" —")[0] : null,
    valor,
    valor_pago: status === "paga" ? valor : 0,
    vencimento: dia(venc),
    pagamento: status === "paga" ? dia(venc) : null,
    forma_pagamento: status === "paga" ? "transferencia" : null,
    status,
    registrado_por: admin.id,
  }));
  await inserir("conta", contasPagar);

  // Uma das contas a receber é paga pela metade: sem isso o estado "parcial"
  // nunca aparece na tela e ninguém descobre que ele existe.
  if (idsReceber.length > 1) {
    await inserir("baixa", [
      {
        clinica_id: clinica,
        conta_id: idsReceber[1],
        valor: Number((contasReceber[1].valor / 2).toFixed(2)),
        data: dia(-1),
        forma_pagamento: "pix",
        caixa_id: caixaHoje,
        registrado_por: recep,
      },
    ]);
  }
  console.log(`Financeiro: ${idsReceber.length} a receber, ${contasPagar.length} a pagar`);

  // ----------------------------------------------------------------
  // Comissões
  // ----------------------------------------------------------------
  const comissoes = [];
  for (const [i, v] of vendas.entries()) {
    for (const [nome] of cestaDe[i]) {
      const pct = /banho|tosa|unhas/i.test(nome) ? 40 : /consulta|castraç|ultrass/i.test(nome) ? 30 : 0;
      if (!pct) continue;
      const base = precoDe[nome];
      comissoes.push({
        clinica_id: clinica,
        profissional_id: /banho|tosa|unhas/i.test(nome) ? recep : escolha(vets, i),
        venda_id: v,
        descricao: nome,
        base_calculo: base,
        percentual: pct,
        valor: Number(((base * pct) / 100).toFixed(2)),
        data: vendasLinhas[i].data.slice(0, 10),
        pago: i % 5 === 0,
        pago_em: i % 5 === 0 ? dia(-7) : null,
      });
    }
  }
  await inserir("comissao", comissoes);
  console.log(`Comissões: ${comissoes.length} lançamentos`);

  // ----------------------------------------------------------------
  // Planos de saúde vendidos ao tutor
  // ----------------------------------------------------------------
  await inserir(
    "assinatura",
    pets.slice(0, 7).map((p, i) => ({
      clinica_id: clinica,
      tutor_id: tutorDoPet[p],
      pet_id: p,
      plano_item_id: escolha(planos, i),
      valor_mensal: i % 3 === 0 ? 149.9 : 89.9,
      dia_cobranca: 5 + (i % 20),
      inicio: dia(-(30 + i * 25)),
      status: i === 6 ? "suspensa" : "ativa",
    }))
  );

  // ----------------------------------------------------------------
  // Orçamentos
  // ----------------------------------------------------------------
  const orcamentos = await inserir(
    "orcamento",
    [
      ["Zeus", "aberto"],
      ["Bob", "aprovado"],
      ["Pipoca", "aberto"],
      ["Lola", "recusado"],
    ].map(([nome, status]) => ({
      clinica_id: clinica,
      pet_id: petDe[nome],
      status,
    }))
  );
  await inserir("orcamento_item", [
    { orcamento_id: orcamentos[0], descricao: "Castração — cadela", quantidade: 1, valor_unitario: 780 },
    { orcamento_id: orcamentos[0], descricao: "Hemograma pré-operatório", quantidade: 1, valor_unitario: 95 },
    { orcamento_id: orcamentos[0], descricao: "Diária de internação", quantidade: 1, valor_unitario: 190 },
    { orcamento_id: orcamentos[1], descricao: "Ultrassonografia abdominal", quantidade: 1, valor_unitario: 240 },
    { orcamento_id: orcamentos[2], descricao: "Raio-X (2 posições)", quantidade: 1, valor_unitario: 180 },
    { orcamento_id: orcamentos[2], descricao: "Consulta de urgência", quantidade: 1, valor_unitario: 220 },
    { orcamento_id: orcamentos[3], descricao: "Tosa na máquina", quantidade: 1, valor_unitario: 90 },
  ]);
  console.log(`Orçamentos: ${orcamentos.length}`);
}
