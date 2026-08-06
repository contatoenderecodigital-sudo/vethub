"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { getSessao } from "@/lib/auth";
import {
  loteSchema,
  movimentacaoSchema,
  quantidadeParaNumero,
  valorParaNumeroOuNull,
} from "./schema";

/** Volta para a tela com a mensagem na barra de erro. */
async function comErro(destino: string, mensagem: string): Promise<never> {
  const separador = destino.includes("?") ? "&" : "?";
  return redirecionarComAviso(`${destino}${separador}erro=${encodeURIComponent(mensagem)}`);
}

interface ItemEstoque {
  id: string;
  nome: string;
  controla_estoque: boolean;
  estoque_atual: number;
}

/** Só produto com controle de estoque aceita movimentação. */
async function carregarItemComEstoque(
  supabase: Awaited<ReturnType<typeof getSessao>>["supabase"],
  itemId: string,
  destino: string
): Promise<ItemEstoque> {
  const { data: item } = await supabase
    .from("item")
    .select("id, nome, controla_estoque, estoque_atual")
    .eq("id", itemId)
    .single<ItemEstoque>();

  if (!item) return comErro(destino, "Produto não encontrado.");
  if (!item.controla_estoque) {
    return comErro(destino, `"${item.nome}" não tem controle de estoque ativado.`);
  }
  return item;
}

function revalidarEstoque(itemId: string) {
  revalidatePath("/estoque");
  revalidatePath("/estoque/validade");
  revalidatePath("/itens");
  revalidatePath(`/itens/${itemId}`);
}

// ------------------------------------------------------------------
// Movimentação (entrada, saída, perda, ajuste)
// ------------------------------------------------------------------

export async function registrarMovimentacao(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const destino = "/estoque";

  const resultado = movimentacaoSchema.safeParse({
    item_id: String(formData.get("item_id") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    quantidade: String(formData.get("quantidade") ?? ""),
    valor_unitario: String(formData.get("valor_unitario") ?? ""),
    lote_codigo: String(formData.get("lote_codigo") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  });

  if (!resultado.success) {
    return comErro(destino, resultado.error.issues[0]?.message ?? "Verifique os campos.");
  }

  const v = resultado.data;
  const item = await carregarItemComEstoque(supabase, v.item_id, destino);
  const quantidade = quantidadeParaNumero(v.quantidade);

  // Saída, perda e ajuste nunca podem deixar o saldo negativo.
  if (v.tipo !== "entrada" && Number(item.estoque_atual) < quantidade) {
    return comErro(
      destino,
      `Saldo insuficiente: "${item.nome}" tem ${Number(item.estoque_atual)} em estoque.`
    );
  }

  // Lote informado: reaproveita o existente; na entrada, cria se não houver.
  let loteId: string | null = null;
  if (v.lote_codigo) {
    const { data: lote } = await supabase
      .from("lote")
      .select("id")
      .eq("item_id", item.id)
      .eq("codigo", v.lote_codigo)
      .maybeSingle<{ id: string }>();

    if (lote) {
      loteId = lote.id;
    } else if (v.tipo === "entrada") {
      const { data: novo, error } = await supabase
        .from("lote")
        .insert({
          clinica_id: usuario.clinica_id,
          item_id: item.id,
          codigo: v.lote_codigo,
          quantidade: 0,
        })
        .select("id")
        .single();
      if (error || !novo) return comErro(destino, "Não foi possível criar o lote.");
      loteId = novo.id;
    } else {
      return comErro(destino, `Lote "${v.lote_codigo}" não existe para esse produto.`);
    }
  }

  const { error } = await supabase.from("movimentacao_estoque").insert({
    clinica_id: usuario.clinica_id,
    item_id: item.id,
    lote_id: loteId,
    tipo: v.tipo,
    quantidade,
    valor_unitario: valorParaNumeroOuNull(v.valor_unitario),
    motivo: v.motivo || null,
    origem: "manual",
    registrado_por: usuario.id,
  });

  if (error) return comErro(destino, "Não foi possível registrar a movimentação.");

  revalidarEstoque(item.id);
  redirect("/estoque");
}

// ------------------------------------------------------------------
// Lote com validade: o saldo inicial entra como movimentação
// ------------------------------------------------------------------

export async function cadastrarLote(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const destino = "/estoque/validade";

  const resultado = loteSchema.safeParse({
    item_id: String(formData.get("item_id") ?? ""),
    codigo: String(formData.get("codigo") ?? ""),
    validade: String(formData.get("validade") ?? ""),
    quantidade: String(formData.get("quantidade") ?? ""),
  });

  if (!resultado.success) {
    return comErro(destino, resultado.error.issues[0]?.message ?? "Verifique os campos.");
  }

  const v = resultado.data;
  const item = await carregarItemComEstoque(supabase, v.item_id, destino);

  const { data: existente } = await supabase
    .from("lote")
    .select("id")
    .eq("item_id", item.id)
    .eq("codigo", v.codigo)
    .maybeSingle<{ id: string }>();

  if (existente) {
    return comErro(destino, `O lote "${v.codigo}" já está cadastrado para esse produto.`);
  }

  const { data: lote, error: erroLote } = await supabase
    .from("lote")
    .insert({
      clinica_id: usuario.clinica_id,
      item_id: item.id,
      codigo: v.codigo,
      validade: v.validade,
      quantidade: 0, // o trigger acerta a partir das movimentações
    })
    .select("id")
    .single();

  if (erroLote || !lote) return comErro(destino, "Não foi possível cadastrar o lote.");

  const { error: erroMov } = await supabase.from("movimentacao_estoque").insert({
    clinica_id: usuario.clinica_id,
    item_id: item.id,
    lote_id: lote.id,
    tipo: "entrada",
    quantidade: quantidadeParaNumero(v.quantidade),
    motivo: `Entrada do lote ${v.codigo}`,
    origem: "compra",
    registrado_por: usuario.id,
  });

  if (erroMov) {
    // Sem a entrada o lote ficaria zerado e confuso. Desfaz o cadastro.
    await supabase.from("lote").delete().eq("id", lote.id);
    return comErro(destino, "Não foi possível registrar a entrada do lote.");
  }

  revalidarEstoque(item.id);
  redirect("/estoque/validade");
}

export async function excluirLote(id: string) {
  const { supabase } = await getSessao();
  const destino = "/estoque/validade";

  const { data: lote } = await supabase
    .from("lote")
    .select("id, item_id, quantidade")
    .eq("id", id)
    .single<{ id: string; item_id: string; quantidade: number }>();

  if (!lote) return comErro(destino, "Lote não encontrado.");
  if (Number(lote.quantidade) > 0) {
    return comErro(destino, "Dê baixa no saldo do lote antes de excluí-lo.");
  }

  const { error } = await supabase.from("lote").delete().eq("id", id);
  if (error) return comErro(destino, "Não foi possível excluir o lote.");

  revalidarEstoque(lote.item_id);
  redirect("/estoque/validade");
}
