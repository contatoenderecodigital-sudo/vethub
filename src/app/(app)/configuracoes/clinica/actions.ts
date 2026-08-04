"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { enderecoParaBanco, soDigitos } from "@/lib/validacao";
import { clinicaSchema } from "./schema";

export async function atualizarClinica(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  // Revalida no servidor com o MESMO schema zod do form (nunca confiar só no front).
  const resultado = clinicaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
  });
  if (!resultado.success) {
    redirect("/configuracoes/clinica?erro=Verifique os campos destacados.");
  }

  const dados = {
    nome: resultado.data.nome,
    cnpj: soDigitos(resultado.data.cnpj) || null,
    // Telefone da clínica: só dígitos, SEM DDI (não é alvo de WhatsApp).
    telefone: soDigitos(resultado.data.telefone) || null,
    ...enderecoParaBanco(resultado.data),
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
