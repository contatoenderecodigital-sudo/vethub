import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Exportação da base da clínica em CSV.
 *
 * Existe por três motivos, e todos importam:
 *
 *   * a LGPD garante à clínica o acesso à própria base, pagando ou não;
 *   * a tela do teste vencido PROMETE que dá para exportar tudo — promessa
 *     escrita antes de existir o recurso, o que a tornava mentira;
 *   * poder ir embora é o que faz alguém topar entrar. Sistema que prende
 *     dado assusta quem já foi preso por um.
 *
 * O RLS faz o isolamento: cada linha devolvida já é da clínica de quem
 * pediu, sem nenhum filtro escrito aqui. Uma consulta que "esqueceu" o
 * `clinica_id` volta vazia em vez de vazar a base do vizinho.
 */

/** Ponto e vírgula, não vírgula: é o que o Excel em português espera. */
const SEPARADOR = ";";

/**
 * O que dá para exportar e como cada coisa vira planilha.
 *
 * `select` usa o formato do PostgREST para trazer o nome do tutor junto do
 * pet, por exemplo — uma planilha com `tutor_id` em UUID não serve para
 * ninguém abrir no Excel.
 */
const TABELAS: Record<
  string,
  { tabela: string; select: string; ordem: string; colunas: Record<string, string> }
> = {
  tutores: {
    tabela: "tutor",
    select: "nome, cpf, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf, created_at",
    ordem: "nome",
    colunas: {
      nome: "Nome", cpf: "CPF", telefone: "Telefone", email: "E-mail",
      cep: "CEP", logradouro: "Logradouro", numero: "Número",
      complemento: "Complemento", bairro: "Bairro", cidade: "Cidade",
      uf: "UF", created_at: "Cadastrado em",
    },
  },
  pets: {
    tabela: "pet",
    select: "nome, especie, raca, sexo, porte, data_nascimento, peso, castrado, microchip, alergias, observacoes, tutor:tutor_id (nome, telefone)",
    ordem: "nome",
    colunas: {
      nome: "Nome", especie: "Espécie", raca: "Raça", sexo: "Sexo",
      porte: "Porte", data_nascimento: "Nascimento", peso: "Peso (kg)",
      castrado: "Castrado", microchip: "Microchip", alergias: "Alergias",
      observacoes: "Observações", "tutor.nome": "Tutor", "tutor.telefone": "Telefone do tutor",
    },
  },
  consultas: {
    tabela: "consulta",
    select: "data, queixa, anamnese, exame_fisico, diagnostico, conduta, pet:pet_id (nome), veterinario:veterinario_id (nome)",
    ordem: "data",
    colunas: {
      data: "Data", "pet.nome": "Pet", "veterinario.nome": "Veterinário",
      queixa: "Queixa", anamnese: "Anamnese", exame_fisico: "Exame físico",
      diagnostico: "Diagnóstico", conduta: "Conduta",
    },
  },
  agendamentos: {
    tabela: "agendamento",
    select: "data_hora, tipo, status, observacoes, pet:pet_id (nome), veterinario:veterinario_id (nome)",
    ordem: "data_hora",
    colunas: {
      data_hora: "Data e hora", "pet.nome": "Pet", tipo: "Tipo",
      status: "Situação", "veterinario.nome": "Profissional", observacoes: "Observações",
    },
  },
  vacinas: {
    tabela: "protocolo_saude",
    select: "data_aplicacao, tipo, nome, lote, fabricante, proxima_dose, pet:pet_id (nome)",
    ordem: "data_aplicacao",
    colunas: {
      data_aplicacao: "Aplicado em", "pet.nome": "Pet", tipo: "Tipo",
      nome: "Nome", lote: "Lote", fabricante: "Fabricante", proxima_dose: "Próxima dose",
    },
  },
  itens: {
    tabela: "item",
    select: "nome, tipo, codigo, preco_venda, preco_custo, estoque_atual, estoque_minimo, ativo",
    ordem: "nome",
    colunas: {
      nome: "Nome", tipo: "Tipo", codigo: "Código",
      preco_venda: "Preço de venda", preco_custo: "Custo",
      estoque_atual: "Estoque", estoque_minimo: "Estoque mínimo", ativo: "Ativo",
    },
  },
  vendas: {
    tabela: "venda",
    select: "numero, data, subtotal, desconto, valor_total, status, tutor:tutor_id (nome), pet:pet_id (nome)",
    ordem: "data",
    colunas: {
      numero: "Número", data: "Data", "tutor.nome": "Tutor", "pet.nome": "Pet",
      subtotal: "Subtotal", desconto: "Desconto", valor_total: "Total", status: "Situação",
    },
  },
  financeiro: {
    tabela: "conta",
    select: "tipo, descricao, valor, valor_pago, vencimento, pagamento, status, forma_pagamento, fornecedor",
    ordem: "vencimento",
    colunas: {
      tipo: "Tipo", descricao: "Descrição", valor: "Valor", valor_pago: "Pago",
      vencimento: "Vencimento", pagamento: "Pagamento", status: "Situação",
      forma_pagamento: "Forma", fornecedor: "Fornecedor",
    },
  },
  exames: {
    tabela: "exame",
    select: "solicitado_em, nome, tipo, status, indicacao, resultado, pet:pet_id (nome)",
    ordem: "solicitado_em",
    colunas: {
      solicitado_em: "Pedido em", "pet.nome": "Pet", nome: "Exame",
      tipo: "Tipo", status: "Situação", indicacao: "Indicação", resultado: "Resultado",
    },
  },
};

/** Valor de uma coluna, seguindo caminho com ponto ("tutor.nome"). */
function pegar(linha: Record<string, unknown>, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((atual, parte) => {
    if (atual === null || atual === undefined) return null;
    // O PostgREST devolve o vínculo como objeto ou como lista de um item,
    // conforme a cardinalidade que ele inferiu. Os dois precisam funcionar.
    const alvo = Array.isArray(atual) ? atual[0] : atual;
    return (alvo as Record<string, unknown>)?.[parte] ?? null;
  }, linha);
}

/**
 * Uma célula de CSV.
 *
 * Aspas duplicadas e o campo inteiro entre aspas: sem isso, uma observação
 * com ponto e vírgula (ou com quebra de linha, que prontuário tem de monte)
 * empurra o resto da linha para colunas erradas e a planilha inteira
 * desalinha sem ninguém perceber.
 */
function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = typeof valor === "boolean" ? (valor ? "Sim" : "Não") : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params;
  const config = TABELAS[tipo];
  if (!config) return NextResponse.json({ erro: "Não sei exportar isso." }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Faça login." }, { status: 401 });

  // Só o admin da clínica leva a base embora. O RLS já impede pegar dados de
  // outra clínica, mas não impediria a recepção de baixar a lista inteira de
  // tutores com CPF e telefone na véspera de pedir demissão.
  const { data: usuario } = await supabase
    .from("usuario")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle<{ papel: string }>();

  if (usuario?.papel !== "admin") {
    return NextResponse.json({ erro: "Só o administrador exporta." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from(config.tabela)
    .select(config.select)
    .order(config.ordem)
    .limit(50000)
    .returns<Record<string, unknown>[]>();

  if (error) {
    return NextResponse.json({ erro: "Não foi possível exportar." }, { status: 500 });
  }

  const chaves = Object.keys(config.colunas);
  const linhas = [
    chaves.map((c) => celula(config.colunas[c])).join(SEPARADOR),
    ...(data ?? []).map((l) => chaves.map((c) => celula(pegar(l, c))).join(SEPARADOR)),
  ];

  // O "﻿" na frente é o que faz o Excel entender que o arquivo é UTF-8.
  // Sem ele, "Anamnese" e todo acento viram caracteres quebrados, e a
  // planilha parece corrompida para quem só sabe abrir clicando duas vezes.
  const csv = `﻿${linhas.join("\r\n")}`;
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vethub-${tipo}-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
