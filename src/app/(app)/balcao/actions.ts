"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { redirecionarComAviso } from "@/lib/aviso";

/**
 * Marcar como entregue é o que faz a fila do balcão esvaziar.
 *
 * Sem isso a receita de ontem continuaria pedindo para ser impressa hoje, e
 * em uma semana a tela vira um monte de coisa velha que ninguém lê — que é
 * exatamente como uma lista de pendências morre.
 *
 * Qualquer pessoa da clínica pode dar baixa, inclusive a recepção: a fila é
 * dela, e exigir permissão de veterinário para dizer "entreguei o papel"
 * seria travar justamente quem o recurso serve.
 */
async function marcar(tabela: "receita" | "orcamento", id: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase
    .from(tabela)
    .update({ entregue_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return redirecionarComAviso(
      `/balcao?erro=${encodeURIComponent("Não foi possível dar baixa.")}`
    );
  }

  revalidatePath("/balcao");
  redirect("/balcao");
}

export async function entregarReceita(id: string) {
  return marcar("receita", id);
}

export async function entregarOrcamento(id: string) {
  return marcar("orcamento", id);
}

export async function entregarExame(id: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase
    .from("exame")
    .update({ status: "entregue" })
    .eq("id", id);

  if (error) {
    return redirecionarComAviso(
      `/balcao?erro=${encodeURIComponent("Não foi possível dar baixa no exame.")}`
    );
  }

  revalidatePath("/balcao");
  revalidatePath("/exames");
  redirect("/balcao");
}
