import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cadastroSchema } from "@/app/cadastro/schema";

/**
 * Cadastro de clínica nova + usuário admin.
 * Roda no servidor com service_role porque precisa criar o usuário no auth
 * e a clínica antes de existir qualquer sessão (RLS bloquearia).
 * O corpo é revalidado com o MESMO schema zod do front.
 */
export async function POST(request: NextRequest) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const resultado = cadastroSchema.safeParse(corpo);
  if (!resultado.success) {
    return NextResponse.json(
      { erro: resultado.error.issues[0]?.message ?? "Preencha todos os campos." },
      { status: 400 }
    );
  }

  const { clinica, nome, senha } = resultado.data;
  const email = resultado.data.email.toLowerCase();

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
