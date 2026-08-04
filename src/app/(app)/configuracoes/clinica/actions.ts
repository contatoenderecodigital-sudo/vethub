"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { soDigitos } from "@/lib/validacao";
import { clinicaSchema } from "./schema";

export async function atualizarClinica(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  // Revalida no servidor com o MESMO schema zod do form (nunca confiar só no front).
  const resultado = clinicaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
  });
  if (!resultado.success) {
    redirect("/configuracoes/clinica?erro=Verifique os campos destacados.");
  }

  const dados = {
    nome: resultado.data.nome,
    cnpj: soDigitos(resultado.data.cnpj) || null,
    // Telefone da clínica: só dígitos, SEM DDI (não é alvo de WhatsApp).
    telefone: soDigitos(resultado.data.telefone) || null,
    endereco: resultado.data.endereco || null,
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
