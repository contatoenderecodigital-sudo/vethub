"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  evolucaoParaBanco,
  evolucaoSchema,
  internacaoParaBanco,
  internacaoSchema,
  parseHorarios,
  prescricaoSchema,
} from "./schema";
import { dataSPde, somarDias, type InternacaoStatus } from "./tipos";

/** Erro que volta para a própria tela do paciente internado. */
function erroNoPaciente(id: string, mensagem: string): never {
  redirect(`/internacao/${id}?erro=${encodeURIComponent(mensagem)}`);
}

// ==================================================================
// Internação
// ==================================================================

export async function internarPet(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  // Revalida no servidor com o MESMO schema zod do formulário.
  const resultado = internacaoSchema.safeParse({
    pet_id: String(formData.get("pet_id") ?? "").trim(),
    veterinario_id: String(formData.get("veterinario_id") ?? ""),
    box: String(formData.get("box") ?? ""),
    data: String(formData.get("data") ?? "").trim(),
    hora: String(formData.get("hora") ?? "").trim(),
    motivo: String(formData.get("motivo") ?? ""),
    diagnostico: String(formData.get("diagnostico") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });

  if (!resultado.success) {
    const mensagem =
      resultado.error.issues[0]?.message ?? "Verifique os campos destacados.";
    redirect(`/internacao/nova?erro=${encodeURIComponent(mensagem)}`);
  }

  const { data, error } = await supabase
    .from("internacao")
    .insert({
      clinica_id: usuario.clinica_id,
      ...internacaoParaBanco(resultado.data),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    redirect("/internacao/nova?erro=N%C3%A3o%20foi%20poss%C3%ADvel%20internar.");
  }

  revalidatePath("/internacao");
  revalidatePath("/dashboard");
  redirect(`/internacao/${data.id}`);
}

export async function atualizarInternacao(id: string, formData: FormData) {
  const { supabase } = await getSessao();

  const resultado = internacaoSchema.safeParse({
    pet_id: String(formData.get("pet_id") ?? "").trim(),
    veterinario_id: String(formData.get("veterinario_id") ?? ""),
    box: String(formData.get("box") ?? ""),
    data: String(formData.get("data") ?? "").trim(),
    hora: String(formData.get("hora") ?? "").trim(),
    motivo: String(formData.get("motivo") ?? ""),
    diagnostico: String(formData.get("diagnostico") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });

  if (!resultado.success) {
    const mensagem =
      resultado.error.issues[0]?.message ?? "Verifique os campos destacados.";
    redirect(`/internacao/${id}/editar?erro=${encodeURIComponent(mensagem)}`);
  }

  // O pet da internação não muda na edição, só os demais campos.
  const campos = internacaoParaBanco(resultado.data);
  delete (campos as Partial<typeof campos>).pet_id;

  const { error } = await supabase.from("internacao").update(campos).eq("id", id);
  if (error) {
    redirect(
      `/internacao/${id}/editar?erro=N%C3%A3o%20foi%20poss%C3%ADvel%20salvar.`
    );
  }

  revalidatePath("/internacao");
  redirect(`/internacao/${id}`);
}

const STATUS_ENCERRAMENTO: InternacaoStatus[] = ["alta", "obito"];

/** Encerra a internação (alta ou óbito), carimbando a data de saída. */
export async function encerrarInternacao(id: string, status: InternacaoStatus) {
  const { supabase } = await getSessao();

  if (!STATUS_ENCERRAMENTO.includes(status)) {
    erroNoPaciente(id, "Status inválido.");
  }

  const { error } = await supabase
    .from("internacao")
    .update({ status, data_saida: new Date().toISOString() })
    .eq("id", id);

  if (error) erroNoPaciente(id, "Não foi possível encerrar a internação.");

  // Medicações ainda pendentes deixam de fazer sentido depois da saída.
  const { data: prescricoes } = await supabase
    .from("prescricao")
    .select("id")
    .eq("internacao_id", id)
    .returns<{ id: string }[]>();

  if (prescricoes && prescricoes.length > 0) {
    await supabase
      .from("administracao_medicamento")
      .update({ status: "suspenso" })
      .in(
        "prescricao_id",
        prescricoes.map((p) => p.id)
      )
      .eq("status", "pendente");
  }

  revalidatePath("/internacao");
  revalidatePath("/dashboard");
  redirect(`/internacao/${id}`);
}

export async function excluirInternacao(id: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase.from("internacao").delete().eq("id", id);
  if (error) erroNoPaciente(id, "Não foi possível excluir a internação.");

  revalidatePath("/internacao");
  revalidatePath("/dashboard");
  redirect("/internacao");
}

// ==================================================================
// Prescrições e geração automática das administrações
// ==================================================================

const JANELA_MS = 48 * 60 * 60 * 1000; // 48 horas

/**
 * Gera os horários previstos das próximas 48 h para uma prescrição.
 *
 * Regras:
 *  - para cada horário do array `horarios` (ex.: 08:00, 16:00, 00:00) montamos
 *    um timestamp com o offset FIXO -03:00 (America/Sao_Paulo, sem horário de
 *    verão), igual ao resto do projeto, para que o instante gravado seja
 *    exatamente o horário local da clínica, independente do fuso do servidor;
 *  - varremos o dia de início e os 2 dias seguintes: isso cobre toda a janela
 *    de 48 h, mesmo quando a prescrição começa no fim da tarde;
 *  - descartamos o que ficou antes do `inicio` (não se aplica medicação no
 *    passado) e o que passa do `fim` da prescrição, quando houver.
 *
 * O checklist do dia seguinte é gerado de novo a cada nova prescrição; para as
 * antigas, o painel mostra o que já existe na janela criada aqui.
 */
function gerarHorariosPrevistos(
  horarios: string[],
  inicio: Date,
  fim: Date | null
): string[] {
  const limite = Math.min(
    inicio.getTime() + JANELA_MS,
    fim ? fim.getTime() : Number.POSITIVE_INFINITY
  );
  const diaBase = dataSPde(inicio.toISOString());
  const previstos: string[] = [];

  for (let d = 0; d <= 2; d++) {
    const dia = somarDias(diaBase, d);
    for (const hora of horarios) {
      const iso = `${dia}T${hora}:00-03:00`;
      const instante = new Date(iso).getTime();
      if (instante >= inicio.getTime() && instante <= limite) {
        previstos.push(iso);
      }
    }
  }

  return previstos.sort();
}

export async function criarPrescricao(internacaoId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();

  // Recepção não prescreve.
  if (usuario.papel === "recepcao") {
    erroNoPaciente(internacaoId, "Seu perfil não pode criar prescrições.");
  }

  const resultado = prescricaoSchema.safeParse({
    medicamento: String(formData.get("medicamento") ?? ""),
    dose: String(formData.get("dose") ?? ""),
    via: String(formData.get("via") ?? ""),
    frequencia_horas: String(formData.get("frequencia_horas") ?? "").trim(),
    horarios: String(formData.get("horarios") ?? ""),
    dias: String(formData.get("dias") ?? "").trim(),
    observacao: String(formData.get("observacao") ?? ""),
  });

  if (!resultado.success) {
    erroNoPaciente(
      internacaoId,
      resultado.error.issues[0]?.message ?? "Verifique os campos da prescrição."
    );
  }

  const valores = resultado.data;
  const horarios = parseHorarios(valores.horarios) ?? [];

  const inicio = new Date();
  // Duração opcional em dias → data de fim da prescrição.
  const fim = valores.dias
    ? new Date(inicio.getTime() + Number(valores.dias) * 24 * 60 * 60 * 1000)
    : null;

  const { data: prescricao, error } = await supabase
    .from("prescricao")
    .insert({
      clinica_id: usuario.clinica_id,
      internacao_id: internacaoId,
      medicamento: valores.medicamento.trim(),
      dose: valores.dose.trim(),
      via: valores.via.trim() || null,
      frequencia_horas: valores.frequencia_horas
        ? Number(valores.frequencia_horas)
        : null,
      horarios,
      inicio: inicio.toISOString(),
      fim: fim ? fim.toISOString() : null,
      observacao: valores.observacao.trim() || null,
      prescrito_por: usuario.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !prescricao) {
    erroNoPaciente(internacaoId, "Não foi possível salvar a prescrição.");
  }

  // Com horários definidos, o checklist das próximas 48 h já nasce pronto.
  const previstos = gerarHorariosPrevistos(horarios, inicio, fim);
  if (previstos.length > 0) {
    await supabase.from("administracao_medicamento").insert(
      previstos.map((horario_previsto) => ({
        clinica_id: usuario.clinica_id,
        prescricao_id: prescricao.id,
        horario_previsto,
        status: "pendente",
      }))
    );
  }

  revalidatePath(`/internacao/${internacaoId}`);
}

export async function excluirPrescricao(id: string, internacaoId: string) {
  const { supabase, usuario } = await getSessao();

  if (usuario.papel === "recepcao") {
    erroNoPaciente(internacaoId, "Seu perfil não pode excluir prescrições.");
  }

  // As administrações caem junto (on delete cascade).
  const { error } = await supabase.from("prescricao").delete().eq("id", id);
  if (error) erroNoPaciente(internacaoId, "Não foi possível excluir a prescrição.");

  revalidatePath(`/internacao/${internacaoId}`);
}

// ==================================================================
// Checklist de medicação
// ==================================================================

/** Marca a medicação como aplicada agora, por quem está logado. */
export async function marcarAplicado(id: string, internacaoId: string) {
  const { supabase, usuario } = await getSessao();

  const { error } = await supabase
    .from("administracao_medicamento")
    .update({
      status: "aplicado",
      horario_realizado: new Date().toISOString(),
      responsavel_id: usuario.id,
    })
    .eq("id", id);

  if (error) erroNoPaciente(internacaoId, "Não foi possível registrar a aplicação.");

  revalidatePath(`/internacao/${internacaoId}`);
}

/** Desfaz o registro (clique errado) e devolve a linha para pendente. */
export async function desfazerAplicacao(id: string, internacaoId: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase
    .from("administracao_medicamento")
    .update({ status: "pendente", horario_realizado: null, responsavel_id: null })
    .eq("id", id);

  if (error) erroNoPaciente(internacaoId, "Não foi possível desfazer o registro.");

  revalidatePath(`/internacao/${internacaoId}`);
}

// ==================================================================
// Evolução
// ==================================================================

export async function registrarEvolucao(
  internacaoId: string,
  formData: FormData
) {
  const { supabase, usuario } = await getSessao();

  // Recepção não registra evolução clínica.
  if (usuario.papel === "recepcao") {
    erroNoPaciente(internacaoId, "Seu perfil não pode registrar evoluções.");
  }

  const resultado = evolucaoSchema.safeParse({
    texto: String(formData.get("texto") ?? ""),
    temperatura: String(formData.get("temperatura") ?? ""),
    frequencia_cardiaca: String(formData.get("frequencia_cardiaca") ?? ""),
    frequencia_respiratoria: String(formData.get("frequencia_respiratoria") ?? ""),
  });

  if (!resultado.success) {
    erroNoPaciente(
      internacaoId,
      resultado.error.issues[0]?.message ?? "Verifique os campos da evolução."
    );
  }

  const { error } = await supabase.from("evolucao").insert({
    clinica_id: usuario.clinica_id,
    internacao_id: internacaoId,
    ...evolucaoParaBanco(resultado.data),
    responsavel_id: usuario.id,
  });

  if (error) erroNoPaciente(internacaoId, "Não foi possível salvar a evolução.");

  revalidatePath(`/internacao/${internacaoId}`);
}
