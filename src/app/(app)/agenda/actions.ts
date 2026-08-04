"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { dataCalendarioValida } from "@/lib/validacao";
import type { AgendamentoStatus } from "@/lib/types";
import { agendamentoParaBanco, agendamentoSchema } from "./schema";

export async function criarAgendamento(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  // Revalida no servidor com o MESMO schema zod do front.
  const resultado = agendamentoSchema.safeParse({
    pet_id: String(formData.get("pet_id") ?? "").trim(),
    veterinario_id: String(formData.get("veterinario_id") ?? "").trim(),
    data: String(formData.get("data") ?? "").trim(),
    hora: String(formData.get("hora") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? "").trim(),
    observacoes: String(formData.get("observacoes") ?? ""),
  });

  if (!resultado.success) {
    const dataParam = String(formData.get("data") ?? "").trim();
    redirect(`/agenda/novo?data=${dataParam}&erro=Verifique os campos.`);
  }

  const { pet_id, veterinario_id, data, hora, tipo, observacoes } =
    agendamentoParaBanco(resultado.data);

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
  "pronto",
  "check_out",
  "cancelado",
];

/**
 * Carimbos de chegada/saída do atendimento. Ficam junto do status para que
 * qualquer caminho (botão rápido, seletor da lista, kanban) grave igual.
 */
function valoresDeStatus(novoStatus: string): Record<string, string> {
  const agora = new Date().toISOString();
  const valores: Record<string, string> = { status: novoStatus };
  if (novoStatus === "check_in") valores.check_in_em = agora;
  if (novoStatus === "check_out") valores.check_out_em = agora;
  return valores;
}

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
    .update(valoresDeStatus(novoStatus))
    .eq("id", id);

  if (error) {
    redirect(`/agenda?data=${dataAtual}&erro=Não foi possível atualizar o status.`);
  }

  revalidatePath("/agenda");
  redirect(`/agenda?data=${dataAtual}`);
}

/**
 * Todos os status aceitos pelo banco (CHECK da migração 20260804000007).
 * Ordem = fluxo real do atendimento, usada no menu do seletor da lista.
 */
// (não exportado: num arquivo "use server" só podem sair funções async)
const STATUS_AGENDAMENTO = [
  "agendado",
  "check_in",
  "atendido",
  "pronto",
  "check_out",
  "cancelado",
] as const;

/**
 * Troca o status direto na linha da lista (o dropdown colorido da Peti9).
 * Chamada por client component, então NUNCA usa redirect: devolve { erro }
 * e o componente mostra a mensagem / chama router.refresh().
 */
export async function mudarStatus(
  id: string,
  novoStatus: string
): Promise<{ erro?: string }> {
  const { supabase } = await getSessao();

  if (!id) return { erro: "Agendamento não identificado." };
  if (!(STATUS_AGENDAMENTO as readonly string[]).includes(novoStatus)) {
    return { erro: "Status inválido." };
  }

  const { error } = await supabase
    .from("agendamento")
    .update(valoresDeStatus(novoStatus))
    .eq("id", id);

  if (error) return { erro: "Não foi possível atualizar o status." };

  revalidatePath("/agenda");

  return {};
}

/**
 * Status aceitos pelo quadro kanban (espelha o CHECK da migração
 * 20260804000007). Inclui 'pronto', que a visão em lista ainda não usa.
 */
const STATUS_KANBAN = [
  "agendado",
  "check_in",
  "atendido",
  "pronto",
  "check_out",
  "cancelado",
] as const;

/**
 * Move um agendamento entre colunas do kanban. Chamada por client component
 * (arrastar e soltar), então NUNCA usa redirect: devolve { erro } e a coluna
 * mostra a mensagem / chama router.refresh().
 */
export async function moverAgendamento(
  id: string,
  novoStatus: string,
  dataAtual: string
): Promise<{ erro?: string }> {
  const { supabase } = await getSessao();

  if (!(STATUS_KANBAN as readonly string[]).includes(novoStatus)) {
    return { erro: "Status inválido." };
  }
  if (!id) return { erro: "Agendamento não identificado." };
  if (!dataCalendarioValida(dataAtual)) return { erro: "Dia inválido." };

  const agora = new Date().toISOString();
  const valores: Record<string, string> = { status: novoStatus };
  // Carimbos de chegada/saída — o que alimenta o tempo de permanência.
  if (novoStatus === "check_in") valores.check_in_em = agora;
  if (novoStatus === "check_out") valores.check_out_em = agora;

  const { error } = await supabase
    .from("agendamento")
    .update(valores)
    .eq("id", id);

  if (error) return { erro: "Não foi possível mover o atendimento." };

  revalidatePath("/agenda");
  revalidatePath("/agenda/kanban");

  return {};
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
