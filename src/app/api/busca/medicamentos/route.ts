import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizarBusca } from "@/app/(app)/itens/formato";
import { rotuloFormaFarmaceutica, rotuloVia } from "@/lib/types";

interface MedicamentoBusca {
  id: string;
  nome: string;
  concentracao: string | null;
  forma_farmaceutica: string | null;
  via: string | null;
  quantidade_padrao: string | null;
  posologia_padrao: string | null;
  observacao: string | null;
  vezes_usado: number;
}

/**
 * Busca no caderno de medicamentos da clínica, para o combobox da receita.
 *
 * Devolve os CAMPOS INTEIROS, e não só id e rótulo como as outras buscas: o
 * ponto do recurso é preencher a linha da receita de uma vez, e uma segunda
 * ida ao servidor a cada escolha deixaria o formulário lento justo onde ele
 * precisa ser rápido.
 *
 * A ordem é por mais receitado, e só depois alfabética. O veterinário
 * prescreve os mesmos vinte a vida inteira: alfabético faria ele rolar a
 * lista até achar o de sempre.
 *
 * Sem termo de busca, devolve os mais usados — assim clicar no campo já
 * mostra o que interessa, sem digitar nada.
 */
export async function GET(request: NextRequest) {
  const termo = sanitizarBusca(request.nextUrl.searchParams.get("q") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  let query = supabase
    .from("medicamento_receita")
    .select(
      "id, nome, concentracao, forma_farmaceutica, via, quantidade_padrao, posologia_padrao, observacao, vezes_usado"
    )
    .eq("ativo", true)
    .order("vezes_usado", { ascending: false })
    .order("nome")
    .limit(10);

  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,concentracao.ilike.%${termo}%`);
  }

  const { data } = await query.returns<MedicamentoBusca[]>();

  return NextResponse.json(
    (data ?? []).map((m) => ({
      id: m.id,
      rotulo: [m.nome, m.concentracao].filter(Boolean).join(" · "),
      detalhe:
        [rotuloFormaFarmaceutica(m.forma_farmaceutica), rotuloVia(m.via)]
          .filter(Boolean)
          .join(" · ") || undefined,
      // O que preenche a linha da receita.
      valores: {
        medicamento: m.nome,
        concentracao: m.concentracao ?? "",
        forma_farmaceutica: m.forma_farmaceutica ?? "",
        quantidade: m.quantidade_padrao ?? "",
        posologia: m.posologia_padrao ?? "",
        via: m.via ?? "",
        observacao: m.observacao ?? "",
      },
    }))
  );
}
