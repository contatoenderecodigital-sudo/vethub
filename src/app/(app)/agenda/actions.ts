"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { AgendamentoStatus } from "@/lib/types";

export async function criarAgendamento(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const pet_id = String(formData.get("pet_id") ?? "").trim();
  const veterinario_id =
    String(formData.get("veterinario_id") ?? "").trim() || null;
  const data = String(formData.get("data") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!pet_id || !data || !hora || !tipo) {
    redirect(
      `/agenda/novo?data=${data}&erro=Preencha pet, data, hora e tipo.`
    );
  }

  // A clínica opera em America/Sao_Paulo (UTC-3, sem horário de verão),
  // então o offset é fixo: montamos o timestamp com "-03:00" para que o
  // instante salvo no banco corresponda exatamente ao horário local escolhido,
  // independente do fuso do servidor.
  const data_hora = `${data}T${hora}:00-03:00`;

  const { error } = await supabase.from("agendamento").insert({
    clinica_id: usuario.clinica_id,
    pet_id,
    veterinario_id,
    data_hora,
    tipo,
    observacoes,
  });

  if (error) {
    redirect(
      `/agenda/novo?pet=${pet_id}&data=${data}&erro=Não foi possível agendar.`
    );
  }

  revalidatePath("/agenda");
  redirect(`/agenda?data=${data}`);
}

const STATUS_PERMITIDOS: AgendamentoStatus[] = [
  "check_in",
  "atendido",
  "check_out",
  "cancelado",
];

export async function atualizarStatus(
  id: string,
  novoStatus: AgendamentoStatus,
  dataAtual: string
) {
  const { supabase } = await getSessao();

  if (!STATUS_PERMITIDOS.includes(novoStatus)) {
    redirect(`/agenda?data=${dataAtual}&erro=Status inválido.`);
  }

  const { error } = await supabase
    .from("agendamento")
    .update({ status: novoStatus })
    .eq("id", id);

  if (error) {
    redirect(`/agenda?data=${dataAtual}&erro=Não foi possível atualizar o status.`);
  }

  revalidatePath("/agenda");
  redirect(`/agenda?data=${dataAtual}`);
}

export async function excluirAgendamento(id: string, dataAtual: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase.from("agendamento").delete().eq("id", id);
  if (error) {
    redirect(`/agenda?data=${dataAtual}&erro=Não foi possível excluir.`);
  }

  revalidatePath("/agenda");
  redirect(`/agenda?data=${dataAtual}`);
}
