"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { OrcamentoStatus } from "@/lib/types";

interface ItemEntrada {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

const ERRO_ITENS =
  "Inclua ao menos 1 item com descrição, quantidade maior que zero e valor válido.";

const STATUS_VALIDOS: OrcamentoStatus[] = ["aberto", "aprovado", "recusado"];

/**
 * Lê e valida os itens serializados em JSON no input hidden name="itens".
 * Linhas totalmente vazias (sem descrição) são descartadas; as demais precisam
 * de quantidade > 0 e valor_unitario >= 0. Retorna null se nada for válido.
 */
function itensDoForm(formData: FormData): ItemEntrada[] | null {
  let brutos: unknown;
  try {
    brutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(brutos)) return null;

  const itens: ItemEntrada[] = [];
  for (const bruto of brutos) {
    if (typeof bruto !== "object" || bruto === null) return null;
    const linha = bruto as Record<string, unknown>;
    const descricao = String(linha.descricao ?? "").trim();
    if (!descricao) continue; // linha vazia — ignora
    const quantidade = Number(linha.quantidade);
    const valor_unitario = Number(linha.valor_unitario);
    if (!Number.isFinite(quantidade) || quantidade <= 0) return null;
    if (!Number.isFinite(valor_unitario) || valor_unitario < 0) return null;
    itens.push({ descricao, quantidade, valor_unitario });
  }
  return itens.length > 0 ? itens : null;
}

export async function criarOrcamento(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const pet_id = String(formData.get("pet_id") ?? "").trim();
  const consulta_id = String(formData.get("consulta_id") ?? "").trim() || null;
  const itens = itensDoForm(formData);

  // Preserva pet/consulta na volta com erro para não perder o contexto do form.
  const urlErro = (mensagem: string) => {
    const sp = new URLSearchParams();
    if (pet_id) sp.set("pet", pet_id);
    if (consulta_id) sp.set("consulta", consulta_id);
    sp.set("erro", mensagem);
    return `/orcamentos/novo?${sp.toString()}`;
  };

  if (!pet_id) redirect(urlErro("Selecione um pet."));
  if (!itens) redirect(urlErro(ERRO_ITENS));

  // valor_total é recalculado por trigger a partir dos itens — nunca escrever aqui.
  const { data: orcamento, error } = await supabase
    .from("orcamento")
    .insert({ clinica_id: usuario.clinica_id, pet_id, consulta_id })
    .select("id")
    .single<{ id: string }>();

  if (error || !orcamento) redirect(urlErro("Não foi possível criar o orçamento."));

  const { error: erroItens } = await supabase
    .from("orcamento_item")
    .insert(itens.map((item) => ({ ...item, orcamento_id: orcamento.id })));

  if (erroItens) {
    // Evita orçamento órfão sem itens.
    await supabase.from("orcamento").delete().eq("id", orcamento.id);
    redirect(urlErro("Não foi possível salvar os itens."));
  }

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${orcamento.id}`);
}

export async function atualizarItens(id: string, formData: FormData) {
  const { supabase } = await getSessao();

  const itens = itensDoForm(formData);
  if (!itens) redirect(`/orcamentos/${id}/editar?erro=${ERRO_ITENS}`);

  const { error: erroDelete } = await supabase
    .from("orcamento_item")
    .delete()
    .eq("orcamento_id", id);
  if (erroDelete) {
    redirect(`/orcamentos/${id}/editar?erro=Não foi possível salvar os itens.`);
  }

  const { error: erroInsert } = await supabase
    .from("orcamento_item")
    .insert(itens.map((item) => ({ ...item, orcamento_id: id })));
  if (erroInsert) {
    redirect(`/orcamentos/${id}/editar?erro=Não foi possível salvar os itens.`);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  redirect(`/orcamentos/${id}`);
}

export async function atualizarStatus(id: string, status: OrcamentoStatus) {
  const { supabase } = await getSessao();

  if (!STATUS_VALIDOS.includes(status)) {
    redirect(`/orcamentos/${id}?erro=Status inválido.`);
  }

  const { error } = await supabase
    .from("orcamento")
    .update({ status })
    .eq("id", id);
  if (error) redirect(`/orcamentos/${id}?erro=Não foi possível atualizar o status.`);

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  redirect(`/orcamentos/${id}`);
}

export async function excluirOrcamento(id: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase.from("orcamento").delete().eq("id", id);
  if (error) redirect(`/orcamentos/${id}?erro=Não foi possível excluir.`);

  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}
