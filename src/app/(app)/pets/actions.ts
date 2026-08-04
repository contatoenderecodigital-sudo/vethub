"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { petParaBanco, petSchema } from "./schema";

/**
 * Revalida o form de pet no servidor com o MESMO schema zod do front.
 * Retorna os dados prontos para o banco ou null se inválido.
 */
function validarForm(formData: FormData) {
  const resultado = petSchema.safeParse({
    tutor_id: String(formData.get("tutor_id") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    especie: String(formData.get("especie") ?? ""),
    raca: String(formData.get("raca") ?? ""),
    sexo: String(formData.get("sexo") ?? ""),
    data_nascimento: String(formData.get("data_nascimento") ?? ""),
    peso: String(formData.get("peso") ?? ""),
    castrado: formData.get("castrado") === "on",
    observacoes: String(formData.get("observacoes") ?? ""),
  });
  if (!resultado.success) return null;
  return petParaBanco(resultado.data); // peso com vírgula vira número aqui
}

export async function criarPet(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const dados = validarForm(formData);

  // Preserva o tutor selecionado ao voltar com erro.
  const tutorId = String(formData.get("tutor_id") ?? "").trim();
  const tutorParam = tutorId ? `&tutor=${tutorId}` : "";

  if (!dados) redirect(`/pets/novo?erro=Verifique os campos.${tutorParam}`);

  const { data, error } = await supabase
    .from("pet")
    .insert({ ...dados, clinica_id: usuario.clinica_id })
    .select("id")
    .single();

  if (error) redirect(`/pets/novo?erro=Não foi possível salvar.${tutorParam}`);

  revalidatePath("/pets");
  redirect(`/pets/${data.id}`);
}

export async function atualizarPet(id: string, formData: FormData) {
  const { supabase } = await getSessao();
  const dados = validarForm(formData);

  if (!dados) redirect(`/pets/${id}/editar?erro=Verifique os campos.`);

  const { error } = await supabase.from("pet").update(dados).eq("id", id);
  if (error) redirect(`/pets/${id}/editar?erro=Não foi possível salvar.`);

  revalidatePath("/pets");
  revalidatePath(`/pets/${id}`);
  redirect(`/pets/${id}`);
}

export async function excluirPet(id: string) {
  const { supabase } = await getSessao();
  const { error } = await supabase.from("pet").delete().eq("id", id);
  if (error) redirect(`/pets/${id}?erro=Não foi possível excluir.`);

  revalidatePath("/pets");
  redirect("/pets");
}
