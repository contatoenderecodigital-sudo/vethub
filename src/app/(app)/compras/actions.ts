"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { getSessao } from "@/lib/auth";
import type { CompraStatus, Papel } from "@/lib/types";
import {
  centavos,
  compraSchema,
  ERRO_ITENS,
  itensDoForm,
  rotuloDaNota,
  somarDias,
  valorOuZero,
} from "./schema";

/**
 * Server actions da entrada de mercadoria. Toda action:
 * getSessao() → papel → zod → clinica_id do usuário logado
 * (o RLS ainda confere de novo no banco).
 */

/** Receber e cancelar mexem em estoque e financeiro: só administrador. */
const PAPEIS_ADMIN: Papel[] = ["admin"];

/** Prazo padrão da conta a pagar gerada ao receber a mercadoria. */
const DIAS_PARA_VENCIMENTO = 30;

type Supabase = Awaited<ReturnType<typeof getSessao>>["supabase"];

interface LinhaItemCompra {
  id: string;
  item_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  lote: string | null;
  validade: string | null;
}

interface ItemCatalogo {
  id: string;
  nome: string;
  controla_estoque: boolean;
  estoque_atual: number;
}

async function comErro(destino: string, mensagem: string): Promise<never> {
  const separador = destino.includes("?") ? "&" : "?";
  return redirecionarComAviso(`${destino}${separador}erro=${encodeURIComponent(mensagem)}`);
}

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}

function revalidarCompras(id?: string) {
  revalidatePath("/compras");
  if (id) revalidatePath(`/compras/${id}`);
  revalidatePath("/fornecedores");
}

/** Receber/cancelar mexe em estoque e contas: revalida tudo que exibe isso. */
function revalidarEstoqueEFinanceiro() {
  revalidatePath("/estoque");
  revalidatePath("/estoque/validade");
  revalidatePath("/itens");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/pagar");
  revalidatePath("/dashboard");
}

/** Itens da compra + ficha de catálogo dos que apontam para um produto. */
async function carregarItens(supabase: Supabase, compraId: string) {
  const { data } = await supabase
    .from("compra_item")
    .select("id, item_id, descricao, quantidade, valor_unitario, lote, validade")
    .eq("compra_id", compraId)
    .order("id")
    .returns<LinhaItemCompra[]>();

  const linhas = data ?? [];
  const ids = [...new Set(linhas.map((l) => l.item_id).filter(Boolean))] as string[];

  const catalogo = new Map<string, ItemCatalogo>();
  if (ids.length > 0) {
    const { data: itens } = await supabase
      .from("item")
      .select("id, nome, controla_estoque, estoque_atual")
      .in("id", ids)
      .returns<ItemCatalogo[]>();
    for (const item of itens ?? []) catalogo.set(item.id, item);
  }

  return { linhas, catalogo };
}

// ------------------------------------------------------------------
// Lançamento da compra
// ------------------------------------------------------------------

export async function criarCompra(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const destino = "/compras/nova";

  const resultado = compraSchema.safeParse({
    fornecedor_id: String(formData.get("fornecedor_id") ?? ""),
    numero_nota: String(formData.get("numero_nota") ?? ""),
    data: String(formData.get("data") ?? ""),
    frete: valorOuZero(String(formData.get("frete") ?? "")),
    observacao: String(formData.get("observacao") ?? ""),
    prazo_dias: String(formData.get("prazo_dias") ?? "30"),
    parcelas: String(formData.get("parcelas") ?? "1"),
  });

  if (!resultado.success) {
    return comErro(destino, resultado.error.issues[0]?.message ?? "Verifique os campos.");
  }

  const itens = itensDoForm(formData);
  if (!itens) return comErro(destino, ERRO_ITENS);

  const v = resultado.data;

  // valor_total é recalculado por trigger (itens + frete), nunca escrever aqui.
  const { data: compra, error } = await supabase
    .from("compra")
    .insert({
      clinica_id: usuario.clinica_id,
      fornecedor_id: v.fornecedor_id,
      numero_nota: v.numero_nota || null,
      data: v.data,
      frete: centavos(v.frete),
      prazo_dias: v.prazo_dias,
      parcelas: v.parcelas,
      observacao: v.observacao || null,
      registrado_por: usuario.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !compra) return comErro(destino, "Não foi possível lançar a compra.");

  const { error: erroItens } = await supabase.from("compra_item").insert(
    itens.map((i) => ({
      compra_id: compra.id,
      item_id: i.item_id || null,
      descricao: i.descricao,
      quantidade: i.quantidade,
      valor_unitario: centavos(i.valor_unitario),
      lote: i.lote || null,
      validade: i.validade || null,
    }))
  );

  if (erroItens) {
    // Evita compra órfã sem itens (e com total zerado).
    await supabase.from("compra").delete().eq("id", compra.id);
    return comErro(destino, "Não foi possível salvar os itens da compra.");
  }

  revalidarCompras();
  redirect(`/compras/${compra.id}`);
}

// ------------------------------------------------------------------
// Receber mercadoria: estoque + custo + conta a pagar
// ------------------------------------------------------------------

export async function receberCompra(id: string) {
  const { supabase, usuario } = await getSessao();
  const destino = `/compras/${id}`;

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    return comErro(destino, "Só o administrador pode receber mercadoria.");
  }

  const { data: compra } = await supabase
    .from("compra")
    .select(
      "id, status, data, numero_nota, valor_total, frete, parcelas, prazo_dias, fornecedor:fornecedor_id (id, nome)"
    )
    .eq("id", id)
    .single<{
      id: string;
      status: CompraStatus;
      data: string;
      numero_nota: string | null;
      valor_total: number;
      frete: number;
      parcelas: number;
      prazo_dias: number;
      fornecedor: { id: string; nome: string } | { id: string; nome: string }[] | null;
    }>();

  if (!compra) return comErro(destino, "Compra não encontrada.");
  if (compra.status === "recebida") return comErro(destino, "Esta compra já foi recebida.");
  if (compra.status === "cancelada") {
    return comErro(destino, "Compra cancelada não pode ser recebida.");
  }

  const { linhas, catalogo } = await carregarItens(supabase, id);
  if (linhas.length === 0) return comErro(destino, "A compra não tem itens para receber.");

  const rotulo = rotuloDaNota(compra.numero_nota);

  // O FRETE faz parte do custo. Uma caixa de ração de R$ 200 com R$ 35 de
  // frete custou R$ 235 para a clínica; precificar em cima de R$ 200 come a
  // margem em silêncio, e ninguém percebe até fechar o mês no vermelho.
  //
  // O rateio é proporcional ao valor de cada linha, não por quantidade: uma
  // caixa de vacina cara e um pacote de gaze barato não carregam o mesmo
  // pedaço do frete só porque vieram na mesma nota.
  const totalItens = linhas.reduce(
    (soma, l) => soma + Number(l.quantidade) * Number(l.valor_unitario),
    0
  );
  const frete = Number(compra.frete ?? 0);

  /** Custo unitário da linha já com a parte do frete embutida. */
  function custoComFrete(linha: LinhaItemCompra): number {
    const unitario = Number(linha.valor_unitario);
    if (frete <= 0 || totalItens <= 0 || Number(linha.quantidade) <= 0) {
      return centavos(unitario);
    }
    const pesoDaLinha = (unitario * Number(linha.quantidade)) / totalItens;
    const freteDaLinha = frete * pesoDaLinha;
    return centavos(unitario + freteDaLinha / Number(linha.quantidade));
  }

  // 1) Lotes informados: reaproveita o existente ou cria com a validade da nota.
  const movimentacoes: Record<string, unknown>[] = [];

  for (const linha of linhas) {
    if (!linha.item_id) continue;
    const item = catalogo.get(linha.item_id);
    if (!item) continue;

    // Custo do catálogo passa a ser o da última entrada, frete incluído.
    await supabase
      .from("item")
      .update({ preco_custo: custoComFrete(linha) })
      .eq("id", item.id);

    if (!item.controla_estoque) continue;

    let loteId: string | null = null;
    const codigo = (linha.lote ?? "").trim();

    if (codigo) {
      const { data: existente } = await supabase
        .from("lote")
        .select("id, validade")
        .eq("item_id", item.id)
        .eq("codigo", codigo)
        .maybeSingle<{ id: string; validade: string | null }>();

      if (existente) {
        loteId = existente.id;
        // A nota trouxe validade e o lote ainda não tinha: completa o cadastro.
        if (linha.validade && !existente.validade) {
          await supabase
            .from("lote")
            .update({ validade: linha.validade })
            .eq("id", existente.id);
        }
      } else {
        const { data: novo, error: erroLote } = await supabase
          .from("lote")
          .insert({
            clinica_id: usuario.clinica_id,
            item_id: item.id,
            codigo,
            validade: linha.validade || null,
            quantidade: 0, // o trigger acerta a partir das movimentações
          })
          .select("id")
          .single<{ id: string }>();

        if (erroLote || !novo) {
          return comErro(destino, `Não foi possível criar o lote "${codigo}".`);
        }
        loteId = novo.id;
      }
    }

    movimentacoes.push({
      clinica_id: usuario.clinica_id,
      item_id: item.id,
      lote_id: loteId,
      tipo: "entrada",
      quantidade: Number(linha.quantidade),
      valor_unitario: centavos(Number(linha.valor_unitario)),
      motivo: rotulo,
      origem: "compra",
      registrado_por: usuario.id,
    });
  }

  // 2) Entradas no estoque em um único insert (o trigger soma os saldos).
  if (movimentacoes.length > 0) {
    const { error } = await supabase
      .from("movimentacao_estoque")
      .insert(movimentacoes);
    if (error) return comErro(destino, "Não foi possível dar entrada no estoque.");
  }

  // 3) Compra recebida
  const { error: erroStatus } = await supabase
    .from("compra")
    .update({ status: "recebida" })
    .eq("id", id);

  if (erroStatus) return comErro(destino, "Não foi possível atualizar a compra.");

  // 4) Contas a pagar do fornecedor — uma por parcela negociada.
  //
  // Antes era sempre UMA conta com 30 dias fixos. Fornecedor real negocia
  // 30/60/90, e quem comprava parcelado tinha que apagar a conta gerada e
  // lançar as parcelas à mão, o que anulava o ganho do módulo.
  const fornecedor = primeiro(compra.fornecedor);
  const parcelas = Math.max(1, Number(compra.parcelas ?? 1));
  const prazo = Number(compra.prazo_dias ?? DIAS_PARA_VENCIMENTO);
  const total = centavos(Number(compra.valor_total));

  // A divisão em centavos sobra: R$ 100 em 3x dá 33,33 + 33,33 + 33,34. O
  // resto vai na ÚLTIMA parcela, para a soma bater com a nota exatamente.
  const base = centavos(Math.floor((total * 100) / parcelas) / 100);
  const sobra = centavos(total - base * parcelas);

  // A despesa de compra tem categoria própria; sem ela a conta nasce como
  // "Sem categoria" e o relatório por categoria fica com um buraco.
  const { data: categoria } = await supabase
    .from("categoria_financeira")
    .select("id")
    .eq("tipo", "despesa")
    .ilike("nome", "fornecedores")
    .maybeSingle<{ id: string }>();

  const contas = Array.from({ length: parcelas }, (_, i) => ({
    clinica_id: usuario.clinica_id,
    tipo: "pagar",
    descricao: parcelas > 1 ? `${rotulo}, parcela ${i + 1}/${parcelas}` : rotulo,
    categoria_id: categoria?.id ?? null,
    fornecedor: fornecedor?.nome ?? null,
    valor: i === parcelas - 1 ? centavos(base + sobra) : base,
    competencia: compra.data,
    // Parcela 1 no prazo negociado; as seguintes de 30 em 30 dias.
    vencimento: somarDias(compra.data, prazo + i * 30),
    origem: "compra",
    observacao: "Gerada automaticamente ao receber a mercadoria.",
    registrado_por: usuario.id,
  }));

  const { error: erroConta } = await supabase.from("conta").insert(contas);

  revalidarCompras(id);
  revalidarEstoqueEFinanceiro();

  if (erroConta) {
    return comErro(
      destino,
      "Mercadoria recebida, mas a conta a pagar não foi gerada. Lance manualmente."
    );
  }

  redirect(destino);
}

// ------------------------------------------------------------------
// Cancelar compra (estorna o estoque se já tinha sido recebida)
// ------------------------------------------------------------------

export async function cancelarCompra(id: string) {
  const { supabase, usuario } = await getSessao();
  const destino = `/compras/${id}`;

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    return comErro(destino, "Só o administrador pode cancelar compras.");
  }

  const { data: compra } = await supabase
    .from("compra")
    .select("id, status, numero_nota, fornecedor:fornecedor_id (id, nome)")
    .eq("id", id)
    .single<{
      id: string;
      status: CompraStatus;
      numero_nota: string | null;
      fornecedor: { id: string; nome: string } | { id: string; nome: string }[] | null;
    }>();

  if (!compra) return comErro(destino, "Compra não encontrada.");
  if (compra.status === "cancelada") return comErro(destino, "Esta compra já está cancelada.");

  const rotulo = rotuloDaNota(compra.numero_nota);

  if (compra.status === "recebida") {
    const { linhas, catalogo } = await carregarItens(supabase, id);

    // Quanto precisa voltar por produto (a mesma linha pode aparecer 2x na nota).
    const aEstornar = new Map<string, number>();
    for (const linha of linhas) {
      if (!linha.item_id) continue;
      const item = catalogo.get(linha.item_id);
      if (!item?.controla_estoque) continue;
      aEstornar.set(
        item.id,
        (aEstornar.get(item.id) ?? 0) + Number(linha.quantidade)
      );
    }

    // Sem saldo não dá para estornar sem deixar o estoque negativo.
    for (const [itemId, quantidade] of aEstornar) {
      const item = catalogo.get(itemId);
      if (!item) continue;
      if (Number(item.estoque_atual) < quantidade) {
        return comErro(
          destino,
          `Saldo insuficiente para estornar "${item.nome}": a entrada foi de ${quantidade} e há ${Number(item.estoque_atual)} em estoque. Ajuste o estoque antes de cancelar.`
        );
      }
    }

    const saidas: Record<string, unknown>[] = [];
    for (const linha of linhas) {
      if (!linha.item_id) continue;
      const item = catalogo.get(linha.item_id);
      if (!item?.controla_estoque) continue;

      let loteId: string | null = null;
      const codigo = (linha.lote ?? "").trim();
      if (codigo) {
        const { data: lote } = await supabase
          .from("lote")
          .select("id")
          .eq("item_id", item.id)
          .eq("codigo", codigo)
          .maybeSingle<{ id: string }>();
        loteId = lote?.id ?? null;
      }

      saidas.push({
        clinica_id: usuario.clinica_id,
        item_id: item.id,
        lote_id: loteId,
        tipo: "saida",
        quantidade: Number(linha.quantidade),
        valor_unitario: centavos(Number(linha.valor_unitario)),
        motivo: `Estorno: ${rotulo} cancelada`,
        origem: "compra",
        registrado_por: usuario.id,
      });
    }

    if (saidas.length > 0) {
      const { error } = await supabase.from("movimentacao_estoque").insert(saidas);
      if (error) return comErro(destino, "Não foi possível estornar o estoque.");
    }

    // A conta a pagar gerada no recebimento também sai dos totais. Não existe
    // vínculo compra→conta no banco, então casa-se pela descrição da nota.
    const fornecedor = primeiro(compra.fornecedor);
    let contas = supabase
      .from("conta")
      .update({ status: "cancelada" })
      .eq("tipo", "pagar")
      .eq("descricao", rotulo)
      .eq("status", "aberta");
    if (fornecedor?.nome) contas = contas.eq("fornecedor", fornecedor.nome);
    await contas;
  }

  const { error } = await supabase
    .from("compra")
    .update({ status: "cancelada" })
    .eq("id", id);

  if (error) return comErro(destino, "Não foi possível cancelar a compra.");

  revalidarCompras(id);
  revalidarEstoqueEFinanceiro();
  redirect(destino);
}
