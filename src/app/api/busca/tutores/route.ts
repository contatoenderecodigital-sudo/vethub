import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatTelefone } from "@/lib/format";

/** Busca de tutores para o combobox. RLS já limita à clínica do usuário. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data } = await supabase
    .from("tutor")
    .select("id, nome, telefone")
    .or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,cpf.ilike.%${q}%`)
    .order("nome")
    .limit(10);

  return NextResponse.json(
    (data ?? []).map((t) => ({
      id: t.id,
      rotulo: t.nome,
      detalhe: formatTelefone(t.telefone),
    }))
  );
}
