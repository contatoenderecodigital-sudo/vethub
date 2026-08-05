"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessao } from "@/lib/auth";
import {
  pesagemSchema,
  petParaBanco,
  petSchema,
  pesoParaNumero,
  protocoloSchema,
} from "./schema";

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
    porte: String(formData.get("porte") ?? ""),
    pelagem: String(formData.get("pelagem") ?? ""),
    microchip: String(formData.get("microchip") ?? ""),
    data_nascimento: String(formData.get("data_nascimento") ?? ""),
    peso: String(formData.get("peso") ?? ""),
    castrado: formData.get("castrado") === "on",
    falecido: formData.get("falecido") === "on",
    alergias: String(formData.get("alergias") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  });
  if (!resultado.success) return null;
  return petParaBanco(resultado.data); // peso com vírgula vira número aqui
}

/** Volta para a ficha do pet com a mensagem de erro na barra do topo. */
function voltarComErro(petId: string, erro: string): never {
  redirect(`/pets/${petId}?erro=${encodeURIComponent(erro)}`);
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

// ------------------------------------------------------------------
// Foto do pet: o upload acontece no navegador (bucket público
// "fotos"); aqui só guardamos a URL já pronta.
// ------------------------------------------------------------------

const urlFotoSchema = z
  .string()
  .trim()
  .min(1, "URL vazia.")
  .max(500, "URL longa demais.")
  .refine((v) => v.startsWith("https://"), "URL inválida.");

/**
 * Salva a URL da foto do pet. Retorna { erro } em vez de redirect porque
 * é chamada de um client component (o componente de upload).
 */
export async function atualizarFoto(
  petId: string,
  url: string
): Promise<{ erro?: string }> {
  const { supabase, usuario } = await getSessao();

  const validada = urlFotoSchema.safeParse(url);
  if (!validada.success) return { erro: "Foto inválida." };

  const { error } = await supabase
    .from("pet")
    .update({ foto_url: validada.data })
    .eq("id", petId)
    .eq("clinica_id", usuario.clinica_id);

  if (error) return { erro: "Não foi possível salvar a foto." };

  revalidatePath("/pets");
  revalidatePath(`/pets/${petId}`);
  return {};
}

// ------------------------------------------------------------------
// Histórico de peso: um trigger no banco mantém pet.peso igual à
// pesagem mais recente, então aqui só inserimos/removemos.
// ------------------------------------------------------------------

export async function registrarPesagem(petId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const resultado = pesagemSchema.safeParse({
    peso: String(formData.get("peso") ?? ""),
    data: String(formData.get("data") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  });

  if (!resultado.success) {
    voltarComErro(
      petId,
      resultado.error.issues[0]?.message ?? "Verifique os campos da pesagem."
    );
  }

  const { error } = await supabase.from("pesagem").insert({
    clinica_id: usuario.clinica_id,
    pet_id: petId,
    peso: pesoParaNumero(resultado.data.peso),
    data: resultado.data.data,
    observacao: resultado.data.observacao.trim() || null,
    registrado_por: usuario.id,
  });

  if (error) voltarComErro(petId, "Não foi possível registrar a pesagem.");

  revalidatePath("/pets");
  revalidatePath(`/pets/${petId}`);
}

export async function excluirPesagem(id: string, petId: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase.from("pesagem").delete().eq("id", id);
  if (error) voltarComErro(petId, "Não foi possível excluir a pesagem.");

  revalidatePath("/pets");
  revalidatePath(`/pets/${petId}`);
}

// ------------------------------------------------------------------
// Protocolos de saúde: vacinas, vermífugos e antiparasitários
// ------------------------------------------------------------------

export async function registrarProtocolo(petId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const resultado = protocoloSchema.safeParse({
    tipo: String(formData.get("tipo") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    dose: String(formData.get("dose") ?? ""),
    lote: String(formData.get("lote") ?? ""),
    fabricante: String(formData.get("fabricante") ?? ""),
    data_aplicacao: String(formData.get("data_aplicacao") ?? ""),
    proxima_dose: String(formData.get("proxima_dose") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  });

  if (!resultado.success) {
    voltarComErro(
      petId,
      resultado.error.issues[0]?.message ?? "Verifique os campos do protocolo."
    );
  }

  const v = resultado.data;
  const { error } = await supabase.from("protocolo_saude").insert({
    clinica_id: usuario.clinica_id,
    pet_id: petId,
    tipo: v.tipo,
    nome: v.nome.trim(),
    dose: v.dose.trim() || null,
    lote: v.lote.trim() || null,
    fabricante: v.fabricante.trim() || null,
    data_aplicacao: v.data_aplicacao,
    proxima_dose: v.proxima_dose || null,
    observacao: v.observacao.trim() || null,
    // quem aplica costuma ser o veterinário logado; recepção fica em branco
    veterinario_id: usuario.papel === "veterinario" ? usuario.id : null,
  });

  if (error) voltarComErro(petId, "Não foi possível registrar o protocolo.");

  revalidatePath(`/pets/${petId}`);
}

export async function excluirProtocolo(id: string, petId: string) {
  const { supabase } = await getSessao();

  const { error } = await supabase.from("protocolo_saude").delete().eq("id", id);
  if (error) voltarComErro(petId, "Não foi possível excluir o protocolo.");

  revalidatePath(`/pets/${petId}`);
}
