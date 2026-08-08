"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirecionarComAviso } from "@/lib/aviso";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { tetoDeUsuarios } from "@/lib/plano-conta";
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
  const { supabase, usuario, conta } = await exigirAdmin();

  // O teto de usuários é metade do que separa um plano do outro, então ele
  // é conferido AQUI, no servidor, e não só escondendo o botão: o formulário
  // é uma requisição como outra qualquer e quem souber o endereço a repete.
  //
  // A contagem passa pelo supabase da sessão, sujeito ao RLS — conta só a
  // equipe desta clínica, nunca a do vizinho.
  const teto = tetoDeUsuarios(conta.plano, conta.limite_usuarios);
  if (teto != null) {
    const { count } = await supabase
      .from("usuario")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) >= teto) {
      return redirecionarComAviso(
        `/configuracoes/usuarios/novo?erro=Seu plano permite ${teto} ${
          teto === 1 ? "usuário" : "usuários"
        }. Para adicionar mais, veja os planos em Assinatura.`
      );
    }
  }

  // Revalida no servidor com o MESMO schema zod do form (nunca confiar só no front).
  const resultado = novoUsuarioSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    papel: String(formData.get("papel") ?? ""),
  });
  if (!resultado.success) {
    return redirecionarComAviso("/configuracoes/usuarios/novo?erro=Verifique os campos destacados.");
  }

  const { nome, senha, papel } = resultado.data;
  const email = resultado.data.email.toLowerCase();

  // Criar usuário no auth exige service_role. O chamador já foi validado como admin.
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
    return redirecionarComAviso("/configuracoes/usuarios/novo?erro=Erro ao criar o perfil.");
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
    return redirecionarComAviso("/configuracoes/usuarios?erro=Você não pode alterar o próprio papel.");
  }

  await supabase.from("usuario").update({ papel }).eq("id", id);
  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
}

export async function removerUsuario(id: string) {
  const { usuario } = await exigirAdmin();

  if (id === usuario.id) {
    return redirecionarComAviso("/configuracoes/usuarios?erro=Você não pode remover a si mesmo.");
  }

  // Confirma que o alvo pertence à mesma clínica antes de usar o service_role.
  const admin = createAdminClient();
  const { data: alvo } = await admin
    .from("usuario")
    .select("clinica_id")
    .eq("id", id)
    .single();
  if (!alvo || alvo.clinica_id !== usuario.clinica_id) {
    return redirecionarComAviso("/configuracoes/usuarios?erro=Usuário não encontrado.");
  }

  await admin.auth.admin.deleteUser(id); // cascade apaga o perfil
  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
}
