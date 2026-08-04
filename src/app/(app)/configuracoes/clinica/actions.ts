"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

export async function atualizarClinica(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) redirect("/configuracoes/clinica?erro=O nome da clínica é obrigatório.");

  const dados = {
    nome,
    cnpj: String(formData.get("cnpj") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").replace(/\D/g, "") || null,
    endereco: String(formData.get("endereco") ?? "").trim() || null,
  };

  const { error } = await supabase
    .from("clinica")
    .update(dados)
    .eq("id", usuario.clinica_id);

  if (error) redirect("/configuracoes/clinica?erro=Não foi possível salvar.");

  revalidatePath("/configuracoes/clinica");
  revalidatePath("/", "layout"); // nome da clínica aparece no cabeçalho
  redirect("/configuracoes/clinica?ok=1");
}
