"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirDono } from "@/lib/dono";
import { redirecionarComAviso } from "@/lib/aviso";

/**
 * Responder e mudar a situação de um chamado, do lado de quem atende.
 *
 * Escreve com `service_role` porque o dono do VetHub não é usuário de clínica
 * nenhuma: o RLS de `ticket_mensagem` exige que a linha pertença à clínica de
 * quem escreve, e ele não pertence a nenhuma. É também por isso que a coluna
 * `do_suporte` só pode ser gravada por aqui — a policy da clínica proíbe, o
 * que impede alguém forjar uma resposta do VetHub dentro do próprio chamado.
 */
export async function responderComoSuporte(ticketId: string, formData: FormData) {
  const { admin } = await exigirDono();

  const texto = String(formData.get("texto") ?? "").trim();
  const resolver = String(formData.get("resolver") ?? "") === "1";

  if (texto.length < 2) {
    return redirecionarComAviso(
      `/dono/suporte/${ticketId}?erro=${encodeURIComponent("Escreva a resposta.")}`
    );
  }

  const { error } = await admin.from("ticket_mensagem").insert({
    ticket_id: ticketId,
    autor_id: null,
    do_suporte: true,
    texto: texto.slice(0, 4000),
  });

  if (error) {
    return redirecionarComAviso(
      `/dono/suporte/${ticketId}?erro=${encodeURIComponent("Não foi possível enviar.")}`
    );
  }

  await admin
    .from("ticket")
    .update({
      status: resolver ? "resolvido" : "respondido",
      resolvido_em: resolver ? new Date().toISOString() : null,
    })
    .eq("id", ticketId);

  revalidatePath("/dono/suporte");
  revalidatePath(`/dono/suporte/${ticketId}`);
  redirect(`/dono/suporte/${ticketId}`);
}

export async function mudarSituacao(ticketId: string, status: string) {
  const { admin } = await exigirDono();

  const validos = ["aberto", "respondido", "aguardando_cliente", "resolvido"];
  if (!validos.includes(status)) {
    return redirecionarComAviso(
      `/dono/suporte/${ticketId}?erro=${encodeURIComponent("Situação inválida.")}`
    );
  }

  await admin
    .from("ticket")
    .update({
      status,
      resolvido_em: status === "resolvido" ? new Date().toISOString() : null,
    })
    .eq("id", ticketId);

  revalidatePath("/dono/suporte");
  revalidatePath(`/dono/suporte/${ticketId}`);
  redirect(`/dono/suporte/${ticketId}`);
}

/**
 * Registra um pagamento recebido.
 *
 * Enquanto a cobrança é Pix combinado, esta é a única fonte que sabe quem
 * está em dia. Guardar o PERÍODO que o pagamento cobre, e não só a data em
 * que caiu, é o que responde "até quando essa clínica está paga" sem ninguém
 * contar no dedo dois meses depois.
 */
export async function registrarPagamento(clinicaId: string, formData: FormData) {
  const { admin, email } = await exigirDono();

  const bruto = String(formData.get("valor") ?? "").replace(/\./g, "").replace(",", ".");
  const valor = Number(bruto);
  if (!Number.isFinite(valor) || valor <= 0) {
    return redirecionarComAviso(
      `/dono/cliente/${clinicaId}?erro=${encodeURIComponent("Informe o valor recebido.")}`
    );
  }

  const { error } = await admin.from("pagamento_assinatura").insert({
    clinica_id: clinicaId,
    valor,
    data: String(formData.get("data") ?? "") || undefined,
    forma: String(formData.get("forma") ?? "pix"),
    competencia_de: String(formData.get("competencia_de") ?? "") || null,
    competencia_ate: String(formData.get("competencia_ate") ?? "") || null,
    observacao: String(formData.get("observacao") ?? "").slice(0, 300) || null,
    registrado_por: email,
  });

  if (error) {
    return redirecionarComAviso(
      `/dono/cliente/${clinicaId}?erro=${encodeURIComponent("Não foi possível registrar.")}`
    );
  }

  revalidatePath(`/dono/cliente/${clinicaId}`);
  revalidatePath("/dono");
  redirect(`/dono/cliente/${clinicaId}`);
}
