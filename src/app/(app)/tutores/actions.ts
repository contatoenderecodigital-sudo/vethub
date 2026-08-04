"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { tutorParaBanco, tutorSchema } from "@/lib/validacao";

/**
 * Revalida o form de tutor no servidor com o MESMO schema zod do front.
 * Retorna os dados prontos para o banco ou null se inválido.
 */
function validarForm(formData: FormData) {
  const resultado = tutorSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    email: String(formData.get("email") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    consentimento_lgpd: formData.get("consentimento_lgpd") === "on",
  });
  if (!resultado.success) return null;
  return tutorParaBanco(resultado.data); // telefone vira só dígitos com DDI 55
}

export async function criarTutor(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const dados = validarForm(formData);
  if (!dados) redirect("/tutores/novo?erro=Verifique os campos destacados.");

  const { data, error } = await supabase
    .from("tutor")
    .insert({ ...dados, clinica_id: usuario.clinica_id })
    .select("id")
    .single();

  if (error) redirect("/tutores/novo?erro=Não foi possível salvar.");

  revalidatePath("/tutores");
  redirect(`/tutores/${data.id}`);
}

export async function atualizarTutor(id: string, formData: FormData) {
  const { supabase } = await getSessao();

  const dados = validarForm(formData);
  if (!dados) redirect(`/tutores/${id}/editar?erro=Verifique os campos destacados.`);

  const { error } = await supabase.from("tutor").update(dados).eq("id", id);
  if (error) redirect(`/tutores/${id}/editar?erro=Não foi possível salvar.`);

  revalidatePath("/tutores");
  revalidatePath(`/tutores/${id}`);
  redirect(`/tutores/${id}`);
}

export async function excluirTutor(id: string) {
  const { supabase } = await getSessao();
  const { error } = await supabase.from("tutor").delete().eq("id", id);
  if (error) redirect(`/tutores/${id}?erro=Não foi possível excluir.`);

  revalidatePath("/tutores");
  redirect("/tutores");
}
