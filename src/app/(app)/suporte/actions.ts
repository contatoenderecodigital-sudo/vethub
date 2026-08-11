"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessao } from "@/lib/auth";
import { redirecionarComAviso } from "@/lib/aviso";

const ROTA = "/suporte";

const erro = (mensagem: string) =>
  redirecionarComAviso(`${ROTA}?erro=${encodeURIComponent(mensagem)}`);

const abrirSchema = z.object({
  assunto: z
    .string()
    .trim()
    .min(5, "Descreva o assunto em poucas palavras.")
    .max(120, "Assunto longo demais."),
  categoria: z.enum(["duvida", "problema", "sugestao", "cobranca"]),
  texto: z
    .string()
    .trim()
    .min(10, "Conte o que aconteceu, com o máximo de detalhe que puder.")
    .max(4000, "Mensagem longa demais."),
});

export async function abrirChamado(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const r = abrirSchema.safeParse({
    assunto: String(formData.get("assunto") ?? ""),
    categoria: String(formData.get("categoria") ?? "duvida"),
    texto: String(formData.get("texto") ?? ""),
  });
  if (!r.success) return erro(r.error.issues[0]?.message ?? "Verifique os campos.");

  const { data: ticket, error } = await supabase
    .from("ticket")
    .insert({
      clinica_id: usuario.clinica_id,
      aberto_por: usuario.id,
      assunto: r.data.assunto,
      categoria: r.data.categoria,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !ticket) return erro("Não foi possível abrir o chamado.");

  const { error: erroMensagem } = await supabase.from("ticket_mensagem").insert({
    ticket_id: ticket.id,
    autor_id: usuario.id,
    do_suporte: false,
    texto: r.data.texto,
  });

  if (erroMensagem) {
    // Chamado sem a primeira mensagem é um título sem pergunta: o suporte
    // abriria e não saberia o que responder. Desfaz.
    await supabase.from("ticket").delete().eq("id", ticket.id);
    return erro("Não foi possível enviar sua mensagem.");
  }

  revalidatePath(ROTA);
  redirect(`${ROTA}/${ticket.id}`);
}

export async function responderChamado(ticketId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const texto = String(formData.get("texto") ?? "").trim();
  if (texto.length < 2) {
    return redirecionarComAviso(
      `${ROTA}/${ticketId}?erro=${encodeURIComponent("Escreva sua mensagem.")}`
    );
  }

  const { error } = await supabase.from("ticket_mensagem").insert({
    ticket_id: ticketId,
    autor_id: usuario.id,
    do_suporte: false,
    texto: texto.slice(0, 4000),
  });

  if (error) {
    return redirecionarComAviso(
      `${ROTA}/${ticketId}?erro=${encodeURIComponent("Não foi possível enviar.")}`
    );
  }

  revalidatePath(`${ROTA}/${ticketId}`);
  redirect(`${ROTA}/${ticketId}`);
}
