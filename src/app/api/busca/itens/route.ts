import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { formatQuantidade, sanitizarBusca } from "@/app/(app)/itens/formato";

interface ItemBusca {
  id: string;
  nome: string;
  codigo: string | null;
  preco_venda: number;
  controla_estoque: boolean;
  estoque_atual: number;
  unidade: { sigla: string } | { sigla: string }[] | null;
}

/**
 * Busca de itens do catálogo para o combobox. RLS já limita à clínica.
 * Parâmetros: q (nome ou código), tipo (produto/servico) e estoque=1
 * para trazer só produtos com controle de estoque.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const termo = sanitizarBusca(params.get("q") ?? "");
  if (!termo) return NextResponse.json([]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  let query = supabase
    .from("item")
    .select(
      "id, nome, codigo, preco_venda, controla_estoque, estoque_atual, unidade:unidade_id (sigla)"
    )
    .eq("ativo", true)
    .or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%`)
    .order("nome")
    .limit(10);

  const tipo = params.get("tipo");
  if (tipo === "produto" || tipo === "servico" || tipo === "plano") {
    query = query.eq("tipo", tipo);
  }
  if (params.get("estoque") === "1") {
    query = query.eq("controla_estoque", true);
  }

  const { data } = await query.returns<ItemBusca[]>();

  return NextResponse.json(
    (data ?? []).map((item) => {
      const unidade = Array.isArray(item.unidade) ? item.unidade[0] : item.unidade;
      const detalhe = [
        item.codigo,
        formatBRL(item.preco_venda),
        item.controla_estoque
          ? `estoque ${formatQuantidade(item.estoque_atual, unidade?.sigla)}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return { id: item.id, rotulo: item.nome, detalhe };
    })
  );
}
