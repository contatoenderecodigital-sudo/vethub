import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emojiEspecie } from "@/lib/format";

/** Busca de pets para o combobox. RLS já limita à clínica do usuário. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { data } = await supabase
    .from("pet")
    .select("id, nome, especie, tutor:tutor_id (nome)")
    .ilike("nome", `%${q}%`)
    .order("nome")
    .limit(10);

  return NextResponse.json(
    (data ?? []).map((p) => {
      const tutor = Array.isArray(p.tutor) ? p.tutor[0] : p.tutor;
      return {
        id: p.id,
        rotulo: `${emojiEspecie(p.especie)} ${p.nome}`,
        detalhe: tutor ? `Tutor: ${(tutor as { nome: string }).nome}` : undefined,
      };
    })
  );
}
