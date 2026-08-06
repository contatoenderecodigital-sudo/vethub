"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { getSessao } from "@/lib/auth";
import type { AnexoTipo } from "@/lib/types";
import { consultaSchema, type ConsultaFormValores } from "./consulta-schema";

/** Valores validados prontos para o banco ('' → null). */
function consultaParaBanco(valores: ConsultaFormValores) {
  const texto = (v: string) => v.trim() || null;
  return {
    pet_id: valores.pet_id,
    veterinario_id: valores.veterinario_id.trim() || null,
    queixa: texto(valores.queixa),
    anamnese: texto(valores.anamnese),
    exame_fisico: texto(valores.exame_fisico),
    diagnostico: texto(valores.diagnostico),
    conduta: texto(valores.conduta),
    observacoes: texto(valores.observacoes),
  };
}

/**
 * Revalida o form de consulta no servidor com o MESMO schema zod do front.
 * Retorna { dados } prontos para o banco ou { erro } com a primeira mensagem.
 */
function validarForm(
  formData: FormData
): { dados: ReturnType<typeof consultaParaBanco> } | { erro: string } {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  const resultado = consultaSchema.safeParse({
    pet_id: texto("pet_id").trim(),
    veterinario_id: texto("veterinario_id"),
    queixa: texto("queixa"),
    anamnese: texto("anamnese"),
    exame_fisico: texto("exame_fisico"),
    diagnostico: texto("diagnostico"),
    conduta: texto("conduta"),
    observacoes: texto("observacoes"),
  });
  if (!resultado.success) {
    return {
      erro:
        resultado.error.issues[0]?.message ?? "Verifique os campos destacados.",
    };
  }
  return { dados: consultaParaBanco(resultado.data) };
}

function urlNovaComErro(
  erro: string,
  petId: string | null,
  agendamentoId: string | null
) {
  const params = new URLSearchParams({ erro });
  if (petId) params.set("pet", petId);
  if (agendamentoId) params.set("agendamento", agendamentoId);
  return `/consultas/nova?${params.toString()}`;
}

export async function criarConsulta(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const agendamento_id =
    String(formData.get("agendamento_id") ?? "").trim() || null;

  const validado = validarForm(formData);
  if ("erro" in validado) {
    const pet_id = String(formData.get("pet_id") ?? "").trim() || null;
    redirect(urlNovaComErro(validado.erro, pet_id, agendamento_id));
  }
  const { pet_id, ...campos } = validado.dados;

  const { data, error } = await supabase
    .from("consulta")
    .insert({
      clinica_id: usuario.clinica_id,
      pet_id,
      agendamento_id,
      ...campos,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(urlNovaComErro("Não foi possível salvar.", pet_id, agendamento_id));
  }

  // Consulta veio de um agendamento → marca o agendamento como atendido.
  if (agendamento_id) {
    await supabase
      .from("agendamento")
      .update({ status: "atendido" })
      .eq("id", agendamento_id);
    revalidatePath("/agenda");
  }

  revalidatePath(`/pets/${pet_id}`);
  redirect(`/consultas/${data.id}`);
}

export async function atualizarConsulta(id: string, formData: FormData) {
  const { supabase } = await getSessao();

  const validado = validarForm(formData);
  if ("erro" in validado) {
    return redirecionarComAviso(`/consultas/${id}/editar?erro=${validado.erro}`);
  }
  // O pet da consulta não muda na edição, só os demais campos.
  const campos = { ...validado.dados };
  delete (campos as Partial<typeof campos>).pet_id;

  const { error } = await supabase.from("consulta").update(campos).eq("id", id);

  if (error) return redirecionarComAviso(`/consultas/${id}/editar?erro=Não foi possível salvar.`);

  revalidatePath(`/consultas/${id}`);
  redirect(`/consultas/${id}`);
}

export async function excluirConsulta(id: string, petId: string) {
  const { supabase } = await getSessao();

  // Guarda os caminhos dos anexos para limpar o storage após o delete.
  const { data: anexos } = await supabase
    .from("anexo")
    .select("url")
    .eq("consulta_id", id);

  const { error } = await supabase.from("consulta").delete().eq("id", id);
  if (error) return redirecionarComAviso(`/consultas/${id}?erro=Não foi possível excluir.`);

  if (anexos && anexos.length > 0) {
    await supabase.storage
      .from("anexos")
      .remove(anexos.map((a: { url: string }) => a.url));
  }

  revalidatePath(`/pets/${petId}`);
  redirect(`/pets/${petId}`);
}

/**
 * Registra a linha do anexo após o upload feito no navegador.
 * Retorna { erro } em vez de redirect porque é chamada de um client component.
 */
export async function registrarAnexo(
  consultaId: string,
  tipo: AnexoTipo,
  caminho: string,
  nomeArquivo: string
): Promise<{ erro?: string }> {
  const { supabase, usuario } = await getSessao();

  const { error } = await supabase.from("anexo").insert({
    clinica_id: usuario.clinica_id,
    consulta_id: consultaId,
    tipo,
    url: caminho,
    nome_arquivo: nomeArquivo,
  });

  if (error) return { erro: "Não foi possível registrar o anexo." };

  revalidatePath(`/consultas/${consultaId}`);
  return {};
}

export async function excluirAnexo(
  id: string,
  consultaId: string,
  caminho: string
) {
  const { supabase } = await getSessao();

  await supabase.storage.from("anexos").remove([caminho]);

  const { error } = await supabase.from("anexo").delete().eq("id", id);
  if (error) {
    return redirecionarComAviso(`/consultas/${consultaId}?erro=Não foi possível excluir o anexo.`);
  }

  revalidatePath(`/consultas/${consultaId}`);
}
