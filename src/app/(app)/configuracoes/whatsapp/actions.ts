"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Desconecta o WhatsApp da clínica (remove token e conexão). Só admin. */
export async function desconectarWhatsapp() {
  const { usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  await admin
    .from("whatsapp_conexao")
    .delete()
    .eq("clinica_id", usuario.clinica_id);

  revalidatePath("/configuracoes/whatsapp");
  redirect("/configuracoes/whatsapp");
}
