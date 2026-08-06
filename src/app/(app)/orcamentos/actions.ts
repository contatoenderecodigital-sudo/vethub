"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { z } from "zod";
import { getSessao } from "@/lib/auth";
import type { OrcamentoStatus } from "@/lib/types";

const ERRO_ITENS =
  "Inclua ao menos 1 item com descrição, quantidade maior que zero e valor válido.";

const STATUS_VALIDOS: OrcamentoStatus[] = ["aberto", "aprovado", "recusado"];

// Schemas locais do módulo. O servidor SEMPRE revalida, nunca confia no front.
const petIdSchema = z.string().min(1);

const itemOrcamentoSchema = z.object({
  descricao: z.string().min(1),
  quantidade: z.number().gt(0).max(9999),
  valor_unitario: z.number().min(0).max(999999),
});

const itensOrcamentoSchema = z.array(itemOrcamentoSchema).min(1);

type ItemEntrada = z.infer<typeof itemOrcamentoSchema>;

/**
 * Lê e valida os itens serializados em JSON no input hidden name="itens".
 * Linhas totalmente vazias (sem descrição) são descartadas ANTES do parse;
 * as demais passam pelo schema zod (quantidade > 0 e <= 9999,
 * valor_unitario >= 0 e <= 999999). Retorna null se nada for válido.
 */
function itensDoForm(formData: FormData): ItemEntrada[] | null {
  let brutos: unknown;
  try {
    brutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(brutos)) return null;

  const candidatos = brutos
    .map((bruto) => {
      const linha = (
        typeof bruto === "object" && bruto !== null ? bruto : {}
      ) as Record<string, unknown>;
      return {
        descricao: String(linha.descricao ?? "").trim(),
        quantidade: Number(linha.quantidade),
        valor_unitario: Number(linha.valor_unitario),
      };
    })
    .filter((candidato) => candidato.descricao !== ""); // linha vazia: ignora

  const resultado = itensOrcamentoSchema.safeParse(candidatos);
  return resultado.success ? resultado.data : null;
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

  if (!petIdSchema.safeParse(pet_id).success) {
    redirect(urlErro("Selecione um pet."));
  }
  if (!itens) redirect(urlErro(ERRO_ITENS));

  // valor_total é recalculado por trigger a partir dos itens, nunca escrever aqui.
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
  if (!itens) return redirecionarComAviso(`/orcamentos/${id}/editar?erro=${ERRO_ITENS}`);

  const { error: erroDelete } = await supabase
    .from("orcamento_item")
    .delete()
    .eq("orcamento_id", id);
  if (erroDelete) {
    return redirecionarComAviso(`/orcamentos/${id}/editar?erro=Não foi possível salvar os itens.`);
  }

  const { error: erroInsert } = await supabase
    .from("orcamento_item")
    .insert(itens.map((item) => ({ ...item, orcamento_id: id })));
  if (erroInsert) {
    return redirecionarComAviso(`/orcamentos/${id}/editar?erro=Não foi possível salvar os itens.`);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  redirect(`/orcamentos/${id}`);
}

export async function atualizarStatus(id: string, status: OrcamentoStatus) {
  const { supabase } = await getSessao();

  if (!STATUS_VALIDOS.includes(status)) {
    return redirecionarComAviso(`/orcamentos/${id}?erro=Status inválido.`);
  }

  const { error } = await supabase
    .from("orcamento")
    .update({ status })
    .eq("id", id);
  if (error) return redirecionarComAviso(`/orcamentos/${id}?erro=Não foi possível atualizar o status.`);

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  redirect(`/orcamentos/${id}`);
}

export async function excluirOrcamento(id: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase.from("orcamento").delete().eq("id", id);
  if (error) return redirecionarComAviso(`/orcamentos/${id}?erro=Não foi possível excluir.`);

  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}
