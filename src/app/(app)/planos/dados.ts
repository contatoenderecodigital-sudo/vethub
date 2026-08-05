import "server-only";
import { getSessao } from "@/lib/auth";
import type { OpcaoItemBeneficio } from "./beneficios-editor";

/** Teto do select de itens: clínica normal fica bem abaixo disso. */
const LIMITE_ITENS = 300;

/**
 * Serviços e produtos ativos para o select do editor de benefícios.
 * Planos ficam de fora: um plano não é benefício de outro plano.
 */
export async function carregarItensDoCatalogo(): Promise<OpcaoItemBeneficio[]> {
  const { supabase } = await getSessao();

  const { data } = await supabase
    .from("item")
    .select("id, nome, tipo")
    .in("tipo", ["servico", "produto"])
    .eq("ativo", true)
    .order("nome")
    .limit(LIMITE_ITENS)
    .returns<OpcaoItemBeneficio[]>();

  return data ?? [];
}

/** Planos ativos (itens tipo='plano') para o select da nova assinatura. */
export async function carregarPlanosAtivos(): Promise<
  { id: string; nome: string; preco_venda: number }[]
> {
  const { supabase } = await getSessao();

  const { data } = await supabase
    .from("item")
    .select("id, nome, preco_venda")
    .eq("tipo", "plano")
    .eq("ativo", true)
    .order("nome")
    .limit(LIMITE_ITENS)
    .returns<{ id: string; nome: string; preco_venda: number }[]>();

  return data ?? [];
}
