"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Papel } from "@/lib/types";
import { novoUsuarioSchema } from "./schema";

const PAPEIS_VALIDOS: Papel[] = ["admin", "veterinario", "recepcao"];

/** Garante que quem chama é admin; retorna a sessão. */
async function exigirAdmin() {
  const sessao = await getSessao();
  if (sessao.usuario.papel !== "admin") redirect("/dashboard");
  return sessao;
}

export async function criarUsuario(formData: FormData) {
  const { usuario } = await exigirAdmin();

  // Revalida no servidor com o MESMO schema zod do form (nunca confiar só no front).
  const resultado = novoUsuarioSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    papel: String(formData.get("papel") ?? ""),
  });
  if (!resultado.success) {
    redirect("/configuracoes/usuarios/novo?erro=Verifique os campos destacados.");
  }

  const { nome, senha, papel } = resultado.data;
  const email = resultado.data.email.toLowerCase();

  // Criar usuário no auth exige service_role — o chamador já foi validado como admin.
  const admin = createAdminClient();
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroAuth || !criado?.user) {
    const jaExiste =
      erroAuth?.message?.toLowerCase().includes("already") ||
      erroAuth?.code === "email_exists";
    redirect(
      `/configuracoes/usuarios/novo?erro=${
        jaExiste ? "Este e-mail já está cadastrado." : "Erro ao criar o usuário."
      }`
    );
  }

  const { error: erroPerfil } = await admin.from("usuario").insert({
    id: criado.user.id,
    clinica_id: usuario.clinica_id,
    nome,
    email,
    papel,
  });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id); // rollback
    redirect("/configuracoes/usuarios/novo?erro=Erro ao criar o perfil.");
  }

  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
}

export async function alterarPapel(id: string, formData: FormData) {
  const { supabase, usuario } = await exigirAdmin();

  const papel = String(formData.get("papel") ?? "") as Papel;
  if (!PAPEIS_VALIDOS.includes(papel)) redirect("/configuracoes/usuarios");

  // Admin não rebaixa a si mesmo (evita clínica sem admin).
  if (id === usuario.id) {
    redirect("/configuracoes/usuarios?erro=Você não pode alterar o próprio papel.");
  }

  await supabase.from("usuario").update({ papel }).eq("id", id);
  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
}

export async function removerUsuario(id: string) {
  const { usuario } = await exigirAdmin();

  if (id === usuario.id) {
    redirect("/configuracoes/usuarios?erro=Você não pode remover a si mesmo.");
  }

  // Confirma que o alvo pertence à mesma clínica antes de usar o service_role.
  const admin = createAdminClient();
  const { data: alvo } = await admin
    .from("usuario")
    .select("clinica_id")
    .eq("id", id)
    .single();
  if (!alvo || alvo.clinica_id !== usuario.clinica_id) {
    redirect("/configuracoes/usuarios?erro=Usuário não encontrado.");
  }

  await admin.auth.admin.deleteUser(id); // cascade apaga o perfil
  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
}
