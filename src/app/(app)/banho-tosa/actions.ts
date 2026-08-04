"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Usuario } from "@/lib/types";
import {
  etapaSchema,
  execucaoObservacoesSchema,
  fichaParaBanco,
  fichaSchema,
  fotoExecucaoSchema,
  servicosSchema,
} from "./schema";

/**
 * Server actions do módulo Banho e tosa.
 * Todas passam por getSessao() (sessão válida + clinica_id), filtram pela
 * clínica do usuário e revalidam a entrada com zod. Todos os papéis podem
 * operar o banho e tosa — é o balcão do petshop.
 */

type Supabase = Awaited<ReturnType<typeof getSessao>>["supabase"];

/** Volta para a tela de execução com a mensagem de erro no topo. */
function erroNaExecucao(agendamentoId: string, mensagem: string): never {
  redirect(`/banho-tosa/${agendamentoId}?erro=${encodeURIComponent(mensagem)}`);
}

/** Volta para a tela de onde a ficha foi editada, com a mensagem de erro. */
function erroNoDestino(destino: string, mensagem: string): never {
  redirect(`${destino}?erro=${encodeURIComponent(mensagem)}`);
}

/**
 * Só aceita caminho interno do próprio app como destino de redirect
 * (o valor vem de um input escondido — nunca confiar nele para sair do site).
 */
function destinoSeguro(valor: string, padrao: string): string {
  return /^\/[A-Za-z0-9\-_/]*$/.test(valor) ? valor : padrao;
}

// ==================================================================
// Ficha de preferências do pet
// ==================================================================

export async function salvarFicha(
  petId: string,
  destinoBruto: string,
  formData: FormData
) {
  const { supabase, usuario } = await getSessao();
  const destino = destinoSeguro(destinoBruto, `/banho-tosa/fichas/${petId}`);

  const resultado = fichaSchema.safeParse({
    tipo_tosa: String(formData.get("tipo_tosa") ?? ""),
    altura_maquina: String(formData.get("altura_maquina") ?? ""),
    shampoo: String(formData.get("shampoo") ?? ""),
    perfume: String(formData.get("perfume") ?? ""),
    temperamento: String(formData.get("temperamento") ?? ""),
    restricoes: String(formData.get("restricoes") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });

  if (!petId) erroNoDestino(destino, "Pet não identificado.");
  if (!resultado.success) {
    erroNoDestino(
      destino,
      resultado.error.issues[0]?.message ?? "Verifique os campos da ficha."
    );
  }

  // O pet precisa ser da clínica de quem está logado.
  const { data: pet } = await supabase
    .from("pet")
    .select("id")
    .eq("id", petId)
    .eq("clinica_id", usuario.clinica_id)
    .maybeSingle<{ id: string }>();

  if (!pet) erroNoDestino(destino, "Pet não encontrado.");

  // pet_id é UNIQUE: upsert cria a ficha na primeira vez e atualiza depois.
  const { error } = await supabase.from("ficha_banho_tosa").upsert(
    {
      clinica_id: usuario.clinica_id,
      pet_id: petId,
      ...fichaParaBanco(resultado.data),
    },
    { onConflict: "pet_id" }
  );

  if (error) erroNoDestino(destino, "Não foi possível salvar a ficha.");

  revalidatePath("/banho-tosa");
  revalidatePath("/banho-tosa/fichas");
  revalidatePath(`/banho-tosa/fichas/${petId}`);
  revalidatePath(`/pets/${petId}`);
  redirect(destino);
}

// ==================================================================
// Execução do serviço
// ==================================================================

interface ExecucaoBase {
  id: string;
  inicio: string | null;
  fim: string | null;
}

/**
 * Devolve a execução do agendamento, criando a linha na primeira vez.
 * Assim os cards (serviços, fotos, tempo) sempre têm onde gravar.
 * `assinatura_id` fica de fora aqui — quem cuida dos planos recorrentes é
 * outro módulo; a coluna existe e pode ser preenchida por ele.
 */
async function garantirExecucao(
  supabase: Supabase,
  usuario: Usuario,
  agendamentoId: string
): Promise<ExecucaoBase | null> {
  const { data: existente } = await supabase
    .from("execucao_banho_tosa")
    .select("id, inicio, fim")
    .eq("agendamento_id", agendamentoId)
    .eq("clinica_id", usuario.clinica_id)
    .maybeSingle<ExecucaoBase>();

  if (existente) return existente;

  const { data: agendamento } = await supabase
    .from("agendamento")
    .select("id, pet_id")
    .eq("id", agendamentoId)
    .eq("clinica_id", usuario.clinica_id)
    .maybeSingle<{ id: string; pet_id: string }>();

  if (!agendamento) return null;

  const { data } = await supabase
    .from("execucao_banho_tosa")
    .insert({
      clinica_id: usuario.clinica_id,
      agendamento_id: agendamentoId,
      pet_id: agendamento.pet_id,
      profissional_id: usuario.id,
    })
    .select("id, inicio, fim")
    .single<ExecucaoBase>();

  return data ?? null;
}

/** Carimba o início do serviço (e guarda as observações já digitadas). */
export async function iniciarExecucao(
  agendamentoId: string,
  formData: FormData
) {
  const { supabase, usuario } = await getSessao();

  const resultado = execucaoObservacoesSchema.safeParse({
    observacoes: String(formData.get("observacoes") ?? ""),
  });
  if (!resultado.success) {
    erroNaExecucao(
      agendamentoId,
      resultado.error.issues[0]?.message ?? "Verifique as observações."
    );
  }

  const execucao = await garantirExecucao(supabase, usuario, agendamentoId);
  if (!execucao) erroNaExecucao(agendamentoId, "Atendimento não encontrado.");

  const { error } = await supabase
    .from("execucao_banho_tosa")
    .update({
      // reiniciar não apaga o carimbo original
      inicio: execucao.inicio ?? new Date().toISOString(),
      observacoes: resultado.data.observacoes || null,
      profissional_id: usuario.id,
    })
    .eq("id", execucao.id)
    .eq("clinica_id", usuario.clinica_id);

  if (error) erroNaExecucao(agendamentoId, "Não foi possível iniciar o serviço.");

  revalidatePath("/banho-tosa");
  revalidatePath(`/banho-tosa/${agendamentoId}`);
}

/**
 * Carimba o fim do serviço. Chamada de novo (com o serviço já finalizado)
 * só atualiza as observações — o horário original é preservado.
 */
export async function finalizarExecucao(
  agendamentoId: string,
  formData: FormData
) {
  const { supabase, usuario } = await getSessao();

  const resultado = execucaoObservacoesSchema.safeParse({
    observacoes: String(formData.get("observacoes") ?? ""),
  });
  if (!resultado.success) {
    erroNaExecucao(
      agendamentoId,
      resultado.error.issues[0]?.message ?? "Verifique as observações."
    );
  }

  const execucao = await garantirExecucao(supabase, usuario, agendamentoId);
  if (!execucao) erroNaExecucao(agendamentoId, "Atendimento não encontrado.");

  const agora = new Date().toISOString();

  const { error } = await supabase
    .from("execucao_banho_tosa")
    .update({
      inicio: execucao.inicio ?? agora,
      fim: execucao.fim ?? agora,
      observacoes: resultado.data.observacoes || null,
    })
    .eq("id", execucao.id)
    .eq("clinica_id", usuario.clinica_id);

  if (error) erroNaExecucao(agendamentoId, "Não foi possível finalizar o serviço.");

  revalidatePath("/banho-tosa");
  revalidatePath(`/banho-tosa/${agendamentoId}`);
}

/** Salva os serviços marcados na execução (checkboxes do card "Serviços"). */
export async function salvarServicos(agendamentoId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const resultado = servicosSchema.safeParse({
    servicos: formData.getAll("servicos").map((v) => String(v)),
  });
  if (!resultado.success) {
    erroNaExecucao(
      agendamentoId,
      resultado.error.issues[0]?.message ?? "Verifique os serviços marcados."
    );
  }

  const execucao = await garantirExecucao(supabase, usuario, agendamentoId);
  if (!execucao) erroNaExecucao(agendamentoId, "Atendimento não encontrado.");

  // sem repetidos, na ordem da lista oficial
  const servicos = [...new Set(resultado.data.servicos)];

  const { error } = await supabase
    .from("execucao_banho_tosa")
    .update({ servicos })
    .eq("id", execucao.id)
    .eq("clinica_id", usuario.clinica_id);

  if (error) erroNaExecucao(agendamentoId, "Não foi possível salvar os serviços.");

  revalidatePath("/banho-tosa");
  revalidatePath(`/banho-tosa/${agendamentoId}`);
}

/**
 * Guarda a URL da foto de antes/depois (o upload acontece no navegador,
 * direto no bucket público "fotos"). Chamada por client component, então
 * devolve { erro } em vez de redirect.
 */
export async function salvarFotoExecucao(
  agendamentoId: string,
  campo: string,
  url: string
): Promise<{ erro?: string }> {
  const { supabase, usuario } = await getSessao();

  const resultado = fotoExecucaoSchema.safeParse({ campo, url });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Foto inválida." };
  }
  if (!agendamentoId) return { erro: "Atendimento não identificado." };

  const execucao = await garantirExecucao(supabase, usuario, agendamentoId);
  if (!execucao) return { erro: "Atendimento não encontrado." };

  const coluna =
    resultado.data.campo === "antes" ? "foto_antes" : "foto_depois";

  const { error } = await supabase
    .from("execucao_banho_tosa")
    .update({ [coluna]: resultado.data.url })
    .eq("id", execucao.id)
    .eq("clinica_id", usuario.clinica_id);

  if (error) return { erro: "Não foi possível salvar a foto." };

  revalidatePath(`/banho-tosa/${agendamentoId}`);
  return {};
}

// ==================================================================
// Fluxo do dia
// ==================================================================

/**
 * Move o atendimento para a próxima etapa do fluxo (aguardando → em banho →
 * secagem/tosa → pronto → entregue). Chamada por client component, então
 * devolve { erro } e a tela chama router.refresh().
 */
export async function avancarEtapa(
  agendamentoId: string,
  novoStatus: string
): Promise<{ erro?: string }> {
  const { supabase, usuario } = await getSessao();

  const resultado = etapaSchema.safeParse({
    agendamento_id: agendamentoId,
    status: novoStatus,
  });
  if (!resultado.success) {
    return { erro: resultado.error.issues[0]?.message ?? "Etapa inválida." };
  }

  // Carimbos de chegada/saída — os mesmos da agenda geral.
  const agora = new Date().toISOString();
  const valores: Record<string, string> = { status: resultado.data.status };
  if (resultado.data.status === "check_in") valores.check_in_em = agora;
  if (resultado.data.status === "check_out") valores.check_out_em = agora;

  const { error } = await supabase
    .from("agendamento")
    .update(valores)
    .eq("id", resultado.data.agendamento_id)
    .eq("clinica_id", usuario.clinica_id)
    .eq("tipo", "banho_tosa");

  if (error) return { erro: "Não foi possível mudar a etapa." };

  revalidatePath("/banho-tosa");
  revalidatePath(`/banho-tosa/${agendamentoId}`);
  revalidatePath("/agenda");

  return {};
}
