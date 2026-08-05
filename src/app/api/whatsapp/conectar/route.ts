import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  detalhesDoNumero,
  inscreverAppNaWaba,
  metaConfigurada,
  trocarCodePorToken,
} from "@/lib/whatsapp";

/**
 * Finaliza o Embedded Signup: recebe o code + ids da sessão do popup da
 * Meta, troca pelo business token no servidor (o token nunca toca o
 * navegador) e grava a conexão da clínica.
 * Só admin da clínica pode conectar.
 */
export async function POST(request: NextRequest) {
  if (!metaConfigurada()) {
    return NextResponse.json({ erro: "Integração não configurada." }, { status: 503 });
  }

  // 1. Autenticação + papel
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });

  const { data: usuario } = await supabase
    .from("usuario")
    .select("clinica_id, papel")
    .eq("id", user.id)
    .single();
  if (!usuario || usuario.papel !== "admin") {
    return NextResponse.json({ erro: "Apenas administradores." }, { status: 403 });
  }

  // 2. Corpo
  let corpo: { code?: string; waba_id?: string; phone_number_id?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }
  const { code, waba_id, phone_number_id } = corpo;
  if (!code || !waba_id || !phone_number_id) {
    return NextResponse.json(
      { erro: "Conexão incompleta. Tente novamente." },
      { status: 400 }
    );
  }

  // 3. Troca o code pelo token
  const token = await trocarCodePorToken(code);
  if (!token) {
    return NextResponse.json(
      { erro: "A Meta recusou o código de autorização. Tente conectar de novo." },
      { status: 502 }
    );
  }

  // 4. Inscreve o app nos webhooks da WABA e busca os dados do número
  const inscrito = await inscreverAppNaWaba(waba_id, token);
  const numero = await detalhesDoNumero(phone_number_id, token);

  // 5. Grava a conexão (service_role, tabela sem policies)
  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_conexao").upsert(
    {
      clinica_id: usuario.clinica_id,
      waba_id,
      phone_number_id,
      numero_exibicao: numero?.display_phone_number ?? null,
      nome_verificado: numero?.verified_name ?? null,
      token_acesso: token,
      status: inscrito ? "conectado" : "erro",
    },
    { onConflict: "clinica_id" }
  );
  if (error) {
    return NextResponse.json({ erro: "Erro ao salvar a conexão." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
