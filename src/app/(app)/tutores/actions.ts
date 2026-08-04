"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

function dadosDoForm(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    cpf: String(formData.get("cpf") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").replace(/\D/g, ""),
    email: String(formData.get("email") ?? "").trim() || null,
    endereco: String(formData.get("endereco") ?? "").trim() || null,
    consentimento_lgpd: formData.get("consentimento_lgpd") === "on",
  };
}

export async function criarTutor(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const dados = dadosDoForm(formData);

  if (!dados.nome || !dados.telefone) {
    redirect("/tutores/novo?erro=Preencha nome e telefone.");
  }

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
  const dados = dadosDoForm(formData);

  if (!dados.nome || !dados.telefone) {
    redirect(`/tutores/${id}/editar?erro=Preencha nome e telefone.`);
  }

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
