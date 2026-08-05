"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import {
  grupoSchema,
  itemDoFormData,
  itemParaBanco,
  itemSchema,
  marcaSchema,
  unidadeSchema,
} from "./schema";

/**
 * Sessão para operações de catálogo. Recepção pode consultar, mas não
 * cadastrar nem alterar. O botão some na tela e a action barra aqui.
 */
async function sessaoCatalogo(destino: string) {
  const sessao = await getSessao();
  if (sessao.usuario.papel === "recepcao") {
    redirect(`${destino}?erro=${encodeURIComponent("Seu perfil não pode editar o catálogo.")}`);
  }
  return sessao;
}

function comErro(destino: string, mensagem: string): never {
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}erro=${encodeURIComponent(mensagem)}`);
}

// ------------------------------------------------------------------
// Item (produto / serviço)
// ------------------------------------------------------------------

export async function criarItem(formData: FormData) {
  const { supabase, usuario } = await sessaoCatalogo("/itens");

  const resultado = itemSchema.safeParse(itemDoFormData(formData));
  if (!resultado.success) {
    comErro(
      "/itens/novo",
      resultado.error.issues[0]?.message ?? "Verifique os campos."
    );
  }

  const { data, error } = await supabase
    .from("item")
    .insert({ ...itemParaBanco(resultado.data), clinica_id: usuario.clinica_id })
    .select("id")
    .single();

  if (error) comErro("/itens/novo", "Não foi possível salvar o item.");

  revalidatePath("/itens");
  revalidatePath("/estoque");
  redirect(`/itens/${data.id}`);
}

export async function atualizarItem(id: string, formData: FormData) {
  const { supabase } = await sessaoCatalogo(`/itens/${id}`);

  const resultado = itemSchema.safeParse(itemDoFormData(formData));
  if (!resultado.success) {
    comErro(
      `/itens/${id}/editar`,
      resultado.error.issues[0]?.message ?? "Verifique os campos."
    );
  }

  const { error } = await supabase
    .from("item")
    .update(itemParaBanco(resultado.data))
    .eq("id", id);

  if (error) comErro(`/itens/${id}/editar`, "Não foi possível salvar o item.");

  revalidatePath("/itens");
  revalidatePath(`/itens/${id}`);
  revalidatePath("/estoque");
  redirect(`/itens/${id}`);
}

export async function excluirItem(id: string) {
  const { supabase } = await sessaoCatalogo(`/itens/${id}`);

  const { error } = await supabase.from("item").delete().eq("id", id);
  if (error) {
    comErro(
      `/itens/${id}`,
      "Não foi possível excluir. O item já tem movimentação registrada."
    );
  }

  revalidatePath("/itens");
  revalidatePath("/estoque");
  redirect("/itens");
}

// ------------------------------------------------------------------
// Marcas
// ------------------------------------------------------------------

export async function salvarMarca(id: string | null, formData: FormData) {
  const { supabase, usuario } = await sessaoCatalogo("/itens/marcas");

  const resultado = marcaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
  });
  if (!resultado.success) {
    comErro("/itens/marcas", resultado.error.issues[0]?.message ?? "Verifique os campos.");
  }

  const nome = resultado.data.nome;
  const { error } = id
    ? await supabase.from("marca").update({ nome }).eq("id", id)
    : await supabase.from("marca").insert({ nome, clinica_id: usuario.clinica_id });

  if (error) comErro("/itens/marcas", "Já existe uma marca com esse nome.");

  revalidatePath("/itens/marcas");
  revalidatePath("/itens");
  redirect("/itens/marcas");
}

export async function excluirMarca(id: string) {
  const { supabase } = await sessaoCatalogo("/itens/marcas");

  const { error } = await supabase.from("marca").delete().eq("id", id);
  if (error) comErro("/itens/marcas", "Não foi possível excluir a marca.");

  revalidatePath("/itens/marcas");
  revalidatePath("/itens");
  redirect("/itens/marcas");
}

// ------------------------------------------------------------------
// Unidades de medida
// ------------------------------------------------------------------

export async function salvarUnidade(id: string | null, formData: FormData) {
  const { supabase, usuario } = await sessaoCatalogo("/itens/unidades");

  const resultado = unidadeSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    sigla: String(formData.get("sigla") ?? ""),
    fracionavel: formData.get("fracionavel") === "on",
  });
  if (!resultado.success) {
    comErro(
      "/itens/unidades",
      resultado.error.issues[0]?.message ?? "Verifique os campos."
    );
  }

  const dados = {
    nome: resultado.data.nome,
    sigla: resultado.data.sigla.toLowerCase(),
    fracionavel: resultado.data.fracionavel,
  };

  const { error } = id
    ? await supabase.from("unidade_medida").update(dados).eq("id", id)
    : await supabase
        .from("unidade_medida")
        .insert({ ...dados, clinica_id: usuario.clinica_id });

  if (error) comErro("/itens/unidades", "Já existe uma unidade com essa sigla.");

  revalidatePath("/itens/unidades");
  revalidatePath("/itens");
  redirect("/itens/unidades");
}

export async function excluirUnidade(id: string) {
  const { supabase } = await sessaoCatalogo("/itens/unidades");

  const { error } = await supabase.from("unidade_medida").delete().eq("id", id);
  if (error) comErro("/itens/unidades", "Não foi possível excluir a unidade.");

  revalidatePath("/itens/unidades");
  revalidatePath("/itens");
  redirect("/itens/unidades");
}

// ------------------------------------------------------------------
// Grupos e subgrupos
// ------------------------------------------------------------------

export async function salvarGrupo(id: string | null, formData: FormData) {
  const { supabase, usuario } = await sessaoCatalogo("/itens/grupos");

  const resultado = grupoSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    grupo_pai_id: String(formData.get("grupo_pai_id") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
  });
  if (!resultado.success) {
    comErro("/itens/grupos", resultado.error.issues[0]?.message ?? "Verifique os campos.");
  }

  // Um grupo nunca pode ser pai de si mesmo (viraria hierarquia circular).
  const paiId = resultado.data.grupo_pai_id || null;
  if (id && paiId === id) {
    comErro("/itens/grupos", "Um grupo não pode ser subgrupo dele mesmo.");
  }

  const dados = {
    nome: resultado.data.nome,
    grupo_pai_id: paiId,
    tipo: resultado.data.tipo,
  };

  const { error } = id
    ? await supabase.from("grupo_item").update(dados).eq("id", id)
    : await supabase
        .from("grupo_item")
        .insert({ ...dados, clinica_id: usuario.clinica_id });

  if (error) comErro("/itens/grupos", "Não foi possível salvar o grupo.");

  revalidatePath("/itens/grupos");
  revalidatePath("/itens");
  redirect("/itens/grupos");
}

export async function excluirGrupo(id: string) {
  const { supabase } = await sessaoCatalogo("/itens/grupos");

  const { error } = await supabase.from("grupo_item").delete().eq("id", id);
  if (error) comErro("/itens/grupos", "Não foi possível excluir o grupo.");

  revalidatePath("/itens/grupos");
  revalidatePath("/itens");
  redirect("/itens/grupos");
}
