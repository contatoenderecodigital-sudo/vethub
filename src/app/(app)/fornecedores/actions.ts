"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Papel } from "@/lib/types";
import {
  fornecedorDoFormData,
  fornecedorParaBanco,
  fornecedorSchema,
} from "./schema";

/** Excluir apaga histórico de compra, só o administrador. */
const PAPEIS_ADMIN: Papel[] = ["admin"];

function comErro(destino: string, mensagem: string): never {
  const separador = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${separador}erro=${encodeURIComponent(mensagem)}`);
}

/** Revalida o form no servidor com o MESMO schema zod do front. */
function validarForm(formData: FormData) {
  const resultado = fornecedorSchema.safeParse(fornecedorDoFormData(formData));
  if (!resultado.success) {
    return { dados: null, mensagem: resultado.error.issues[0]?.message ?? "Verifique os campos destacados." };
  }
  return { dados: fornecedorParaBanco(resultado.data), mensagem: null };
}

function revalidarFornecedores(id?: string) {
  revalidatePath("/fornecedores");
  if (id) revalidatePath(`/fornecedores/${id}`);
  revalidatePath("/compras");
}

export async function criarFornecedor(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const destino = "/fornecedores/novo";

  const { dados, mensagem } = validarForm(formData);
  if (!dados) comErro(destino, mensagem);

  const { data, error } = await supabase
    .from("fornecedor")
    .insert({ ...dados, clinica_id: usuario.clinica_id })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) comErro(destino, "Não foi possível salvar o fornecedor.");

  revalidarFornecedores();
  redirect(`/fornecedores/${data.id}`);
}

export async function atualizarFornecedor(id: string, formData: FormData) {
  const { supabase } = await getSessao();
  const destino = `/fornecedores/${id}/editar`;

  const { dados, mensagem } = validarForm(formData);
  if (!dados) comErro(destino, mensagem);

  const { error } = await supabase.from("fornecedor").update(dados).eq("id", id);
  if (error) comErro(destino, "Não foi possível salvar o fornecedor.");

  revalidarFornecedores(id);
  redirect(`/fornecedores/${id}`);
}

export async function excluirFornecedor(id: string) {
  const { supabase, usuario } = await getSessao();
  const destino = `/fornecedores/${id}`;

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    comErro(destino, "Só o administrador pode excluir fornecedores.");
  }

  // As compras do fornecedor continuam no histórico (on delete set null).
  const { error } = await supabase.from("fornecedor").delete().eq("id", id);
  if (error) comErro(destino, "Não foi possível excluir o fornecedor.");

  revalidarFornecedores(id);
  redirect("/fornecedores");
}
