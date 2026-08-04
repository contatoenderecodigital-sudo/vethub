import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cadastro de clínica nova + usuário admin.
 * Roda no servidor com service_role porque precisa criar o usuário no auth
 * e a clínica antes de existir qualquer sessão (RLS bloquearia).
 */
export async function POST(request: NextRequest) {
  let corpo: { clinica?: string; nome?: string; email?: string; senha?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const clinica = corpo.clinica?.trim();
  const nome = corpo.nome?.trim();
  const email = corpo.email?.trim().toLowerCase();
  const senha = corpo.senha ?? "";

  if (!clinica || !nome || !email) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  // Senha forte obrigatória (mesma regra do front)
  if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return NextResponse.json(
      { erro: "A senha precisa ter no mínimo 8 caracteres, com letras e números." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. usuário no auth
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroAuth || !criado?.user) {
    const jaExiste =
      erroAuth?.message?.toLowerCase().includes("already") ||
      erroAuth?.code === "email_exists";
    return NextResponse.json(
      { erro: jaExiste ? "Este e-mail já está cadastrado." : "Erro ao criar o usuário." },
      { status: jaExiste ? 409 : 500 }
    );
  }
  const userId = criado.user.id;

  // 2. clínica
  const { data: novaClinica, error: erroClinica } = await admin
    .from("clinica")
    .insert({ nome: clinica })
    .select("id")
    .single();
  if (erroClinica || !novaClinica) {
    await admin.auth.admin.deleteUser(userId); // rollback
    return NextResponse.json({ erro: "Erro ao criar a clínica." }, { status: 500 });
  }

  // 3. perfil admin
  const { error: erroUsuario } = await admin.from("usuario").insert({
    id: userId,
    clinica_id: novaClinica.id,
    nome,
    email,
    papel: "admin",
  });
  if (erroUsuario) {
    // rollback dos dois anteriores
    await admin.from("clinica").delete().eq("id", novaClinica.id);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ erro: "Erro ao criar o perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
