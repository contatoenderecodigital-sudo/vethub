import "server-only";
import { getSessao } from "@/lib/auth";
import type { GrupoTipo } from "@/lib/types";
import type { OpcaoSimples } from "./item-form";

/** Linha crua de grupo com o nome do pai (o join volta objeto ou array). */
interface GrupoComPai {
  id: string;
  nome: string;
  grupo_pai_id: string | null;
  tipo: GrupoTipo;
  pai: { nome: string } | { nome: string }[] | null;
}

export function nomeDoPai(pai: GrupoComPai["pai"]): string | null {
  const registro = Array.isArray(pai) ? pai[0] : pai;
  return registro?.nome ?? null;
}

/**
 * Listas do catálogo auxiliar para os selects do formulário de item.
 * Uma consulta por tabela, em paralelo.
 */
export async function carregarOpcoesCatalogo(): Promise<{
  grupos: OpcaoSimples[];
  marcas: OpcaoSimples[];
  unidades: OpcaoSimples[];
}> {
  const { supabase } = await getSessao();

  const [grupos, marcas, unidades] = await Promise.all([
    supabase
      .from("grupo_item")
      .select("id, nome, grupo_pai_id, tipo, pai:grupo_pai_id (nome)")
      .order("nome")
      .returns<GrupoComPai[]>(),
    supabase
      .from("marca")
      .select("id, nome")
      .order("nome")
      .returns<{ id: string; nome: string }[]>(),
    supabase
      .from("unidade_medida")
      .select("id, nome, sigla")
      .order("nome")
      .returns<{ id: string; nome: string; sigla: string }[]>(),
  ]);

  return {
    grupos: (grupos.data ?? []).map((g) => ({
      id: g.id,
      nome: g.nome,
      detalhe: nomeDoPai(g.pai),
    })),
    marcas: (marcas.data ?? []).map((m) => ({ id: m.id, nome: m.nome })),
    unidades: (unidades.data ?? []).map((u) => ({
      id: u.id,
      nome: u.nome,
      detalhe: u.sigla,
    })),
  };
}
