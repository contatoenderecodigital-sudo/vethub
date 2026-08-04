"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

function dadosDoForm(formData: FormData) {
  const sexo = String(formData.get("sexo") ?? "");
  const pesoTexto = String(formData.get("peso") ?? "")
    .trim()
    .replace(",", ".");
  const peso = pesoTexto ? Number(pesoTexto) : NaN;

  return {
    tutor_id: String(formData.get("tutor_id") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    especie: String(formData.get("especie") ?? "").trim(),
    raca: String(formData.get("raca") ?? "").trim() || null,
    sexo: sexo === "macho" || sexo === "femea" ? sexo : null,
    data_nascimento:
      String(formData.get("data_nascimento") ?? "").trim() || null,
    peso: Number.isFinite(peso) ? peso : null,
    castrado: formData.get("castrado") === "on",
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarPet(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const dados = dadosDoForm(formData);

  // Preserva o tutor selecionado ao voltar com erro.
  const tutorParam = dados.tutor_id ? `&tutor=${dados.tutor_id}` : "";

  if (!dados.tutor_id || !dados.nome || !dados.especie) {
    redirect(`/pets/novo?erro=Preencha tutor, nome e espécie.${tutorParam}`);
  }

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
  const dados = dadosDoForm(formData);

  if (!dados.tutor_id || !dados.nome || !dados.especie) {
    redirect(`/pets/${id}/editar?erro=Preencha tutor, nome e espécie.`);
  }

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
