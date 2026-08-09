import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeISO } from "@/lib/format";

/**
 * O que está esperando a recepção resolver.
 *
 * Mora aqui, e não dentro da tela, porque DUAS coisas precisam da mesma
 * conta: o número no menu e a própria lista. Se cada uma contasse do seu
 * jeito, o menu diria "3" e a tela mostraria 5 — e ninguém confiaria em
 * nenhum dos dois de novo.
 */

/** Até quantos dias atrás a fila olha. Mais que isso é arquivo, não pendência. */
export const JANELA_DIAS = 7;

export function desdeQuando(): string {
  const d = new Date();
  d.setDate(d.getDate() - JANELA_DIAS);
  return d.toISOString().slice(0, 10);
}

export interface ContagemBalcao {
  esperando: number;
  receitas: number;
  orcamentos: number;
  exames: number;
  cobrar: number;
  total: number;
}

/**
 * Conta sem trazer os dados: `head: true` pede só o número ao banco.
 *
 * Isto roda em TODA página do app, porque o número fica no menu. Trazer as
 * linhas para contá-las seria pagar cinco consultas completas a cada clique
 * em qualquer lugar do sistema.
 */
export async function contarBalcao(
  supabase: SupabaseClient
): Promise<ContagemBalcao> {
  const desde = desdeQuando();
  const hoje = hojeISO();

  const conta = (n: number | null) => n ?? 0;

  const [esperando, receitas, orcamentos, exames, consultas, vendas] = await Promise.all([
    // Quem o veterinário já liberou e está indo para o balcão agora.
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("status", "pronto")
      .gte("data_hora", `${hoje}T00:00:00`)
      .lte("data_hora", `${hoje}T23:59:59`),
    supabase
      .from("receita")
      .select("id", { count: "exact", head: true })
      .is("entregue_em", null)
      .gte("data", desde),
    supabase
      .from("orcamento")
      .select("id", { count: "exact", head: true })
      .is("entregue_em", null)
      .eq("status", "aberto")
      .gte("created_at", `${desde}T00:00:00`),
    supabase
      .from("exame")
      .select("id", { count: "exact", head: true })
      .in("status", ["solicitado", "pronto"]),
    // Consultas do período, para descobrir quais ainda não viraram venda.
    supabase
      .from("consulta")
      .select("id")
      .gte("data", `${desde}T00:00:00`)
      .returns<{ id: string }[]>(),
    supabase
      .from("venda")
      .select("consulta_id")
      .not("consulta_id", "is", null)
      .gte("data", `${desde}T00:00:00`)
      .returns<{ consulta_id: string }[]>(),
  ]);

  // Cobrança é a razão número 1 pela qual o tutor vai ao balcão, e era o que
  // faltava: consulta atendida que ninguém cobrou é dinheiro que a clínica
  // já entregou e vai esquecer de receber.
  const cobradas = new Set((vendas.data ?? []).map((v) => v.consulta_id));
  const cobrar = (consultas.data ?? []).filter((c) => !cobradas.has(c.id)).length;

  const numeros = {
    esperando: conta(esperando.count),
    receitas: conta(receitas.count),
    orcamentos: conta(orcamentos.count),
    exames: conta(exames.count),
    cobrar,
  };

  return {
    ...numeros,
    total:
      numeros.esperando +
      numeros.receitas +
      numeros.orcamentos +
      numeros.exames +
      numeros.cobrar,
  };
}
