"use server";

import { redirecionarComAviso } from "@/lib/aviso";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import type { Papel } from "@/lib/types";
import {
  LIMITE_APURACAO,
  baseDoItem,
  dataLocalSP,
  fimDoDia,
  idSchema,
  inicioDoDia,
  periodoSchema,
  valorDaComissao,
} from "./schema";

/**
 * Server actions das comissões. Toda action: getSessao() → papel → zod →
 * clinica_id do usuário logado (o RLS ainda barra de novo no banco).
 */

const ROTA = "/financeiro/comissoes";

/** Apurar e quitar comissão mexe no que a clínica deve à equipe: só admin. */
const PAPEIS_ADMIN: Papel[] = ["admin"];

// ------------------------------------------------------------------
// Auxiliares
// ------------------------------------------------------------------

/** Anexa ?erro= (ou &erro=) preservando os filtros que já estavam na URL. */
function comErro(url: string, mensagem: string): string {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}erro=${encodeURIComponent(mensagem)}`;
}

/**
 * O caminho de retorno vem do formulário (para voltar com os filtros da
 * lista). Só aceitamos a própria rota de comissões, nunca redirecionar
 * para um endereço que o cliente escolheu.
 */
function destinoSeguro(voltar: string | null | undefined): string {
  const v = (voltar ?? "").trim();
  return v.startsWith(ROTA) && !v.startsWith("//") ? v : ROTA;
}

function revalidarComissoes(): void {
  revalidatePath(ROTA);
  revalidatePath("/financeiro");
}

// ------------------------------------------------------------------
// Apuração
// ------------------------------------------------------------------

interface VendaPaga {
  id: string;
  numero: number | null;
  data: string;
}

interface ItemVendido {
  id: string;
  venda_id: string;
  item_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  profissional_id: string | null;
}

/**
 * Gera as comissões das vendas pagas do período.
 *
 * Só entra item de venda com profissional definido e cujo produto/serviço
 * tenha `comissao_percentual` maior que zero. Item que já gerou comissão é
 * pulado (a checagem é pelo `venda_item_id`), então rodar duas vezes no
 * mesmo período não duplica nada.
 */
export async function apurarComissoes(de: string, ate: string) {
  const { supabase, usuario } = await getSessao();

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    return redirecionarComAviso(comErro(ROTA, "Só o administrador pode apurar comissões."));
  }

  const periodo = periodoSchema.safeParse({ de, ate });
  if (!periodo.success) {
    return redirecionarComAviso(comErro(ROTA, periodo.error.issues[0]?.message ?? "Período inválido."));
  }

  const janela = periodo.data;
  // Volta para o mesmo período, com as datas já validadas, nunca as cruas.
  const voltar = `${ROTA}?de=${janela.de}&ate=${janela.ate}`;

  // 1. Vendas efetivamente pagas dentro da janela (venda.data é timestamptz).
  const { data: vendas } = await supabase
    .from("venda")
    .select("id, numero, data")
    .eq("status", "paga")
    .gte("data", inicioDoDia(janela.de))
    .lte("data", fimDoDia(janela.ate))
    .order("data")
    .limit(LIMITE_APURACAO)
    .returns<VendaPaga[]>();

  const idsVendas = (vendas ?? []).map((v) => v.id);
  if (idsVendas.length === 0) {
    redirect(`${voltar}&geradas=0&puladas=0`);
  }

  const porVenda = new Map((vendas ?? []).map((v) => [v.id, v]));

  // 2. Itens dessas vendas que têm profissional apontado.
  const { data: itensVendidos } = await supabase
    .from("venda_item")
    .select(
      "id, venda_id, item_id, descricao, quantidade, valor_unitario, desconto, profissional_id"
    )
    .in("venda_id", idsVendas)
    .not("profissional_id", "is", null)
    .limit(LIMITE_APURACAO)
    .returns<ItemVendido[]>();

  const linhas = itensVendidos ?? [];
  if (linhas.length === 0) {
    redirect(`${voltar}&geradas=0&puladas=0`);
  }

  // 3. Percentual de comissão de cada produto/serviço do catálogo.
  const idsItens = [...new Set(linhas.map((l) => l.item_id).filter(Boolean))] as string[];
  const percentuais = new Map<string, number>();
  if (idsItens.length > 0) {
    const { data: itens } = await supabase
      .from("item")
      .select("id, comissao_percentual")
      .in("id", idsItens)
      .limit(LIMITE_APURACAO)
      .returns<{ id: string; comissao_percentual: number | null }[]>();
    for (const item of itens ?? []) {
      percentuais.set(item.id, Number(item.comissao_percentual ?? 0));
    }
  }

  // 4. O que já virou comissão antes não entra de novo.
  const { data: existentes } = await supabase
    .from("comissao")
    .select("venda_item_id")
    .in("venda_item_id", linhas.map((l) => l.id))
    .limit(LIMITE_APURACAO)
    .returns<{ venda_item_id: string | null }[]>();

  const jaApurados = new Set(
    (existentes ?? []).map((c) => c.venda_item_id).filter(Boolean) as string[]
  );

  interface NovaComissao {
    clinica_id: string;
    profissional_id: string;
    venda_id: string;
    venda_item_id: string;
    descricao: string;
    base_calculo: number;
    percentual: number;
    valor: number;
    data: string;
  }

  let puladas = 0;
  const novas: NovaComissao[] = [];

  for (const linha of linhas) {
    // O filtro do PostgREST já removeu os sem profissional; isto é só para o TS.
    if (!linha.profissional_id) continue;

    if (jaApurados.has(linha.id)) {
      puladas += 1;
      continue;
    }

    const percentual = linha.item_id ? percentuais.get(linha.item_id) ?? 0 : 0;
    if (!(percentual > 0)) continue;

    const base = baseDoItem(linha);
    if (base <= 0) continue;

    const venda = porVenda.get(linha.venda_id);
    const numero = venda?.numero;

    novas.push({
      clinica_id: usuario.clinica_id,
      profissional_id: linha.profissional_id,
      venda_id: linha.venda_id,
      venda_item_id: linha.id,
      descricao: `${linha.descricao}${numero ? ` · Venda ${numero}` : ""}`.slice(0, 200),
      base_calculo: base,
      percentual,
      valor: valorDaComissao(base, percentual),
      data: venda ? dataLocalSP(venda.data) : hojeISO(),
    });
  }

  if (novas.length > 0) {
    const { error } = await supabase.from("comissao").insert(novas);
    if (error) return redirecionarComAviso(comErro(voltar, "Não foi possível gerar as comissões."));
  }

  revalidarComissoes();
  redirect(`${voltar}&geradas=${novas.length}&puladas=${puladas}`);
}

// ------------------------------------------------------------------
// Pagamento
// ------------------------------------------------------------------

export async function marcarComissaoPaga(id: string, voltarBruto: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    return redirecionarComAviso(comErro(voltar, "Só o administrador pode pagar comissões."));
  }

  if (!idSchema.safeParse(id).success) {
    return redirecionarComAviso(comErro(voltar, "Comissão inválida."));
  }

  const { error } = await supabase
    .from("comissao")
    .update({ pago: true, pago_em: hojeISO() })
    .eq("id", id)
    .eq("pago", false);

  if (error) return redirecionarComAviso(comErro(voltar, "Não foi possível marcar a comissão como paga."));

  revalidarComissoes();
  redirect(voltar);
}

export async function estornarComissao(id: string, voltarBruto: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    return redirecionarComAviso(comErro(voltar, "Só o administrador pode estornar comissões."));
  }

  if (!idSchema.safeParse(id).success) {
    return redirecionarComAviso(comErro(voltar, "Comissão inválida."));
  }

  const { error } = await supabase
    .from("comissao")
    .update({ pago: false, pago_em: null })
    .eq("id", id);

  if (error) return redirecionarComAviso(comErro(voltar, "Não foi possível estornar o pagamento."));

  revalidarComissoes();
  redirect(voltar);
}

/** Quita de uma vez tudo que está em aberto para o profissional no período. */
export async function pagarComissoesDoProfissional(
  profissionalId: string,
  de: string,
  ate: string,
  voltarBruto: string
) {
  const { supabase, usuario } = await getSessao();
  const voltar = destinoSeguro(voltarBruto);

  if (!PAPEIS_ADMIN.includes(usuario.papel)) {
    return redirecionarComAviso(comErro(voltar, "Só o administrador pode pagar comissões."));
  }

  if (!idSchema.safeParse(profissionalId).success) {
    return redirecionarComAviso(comErro(voltar, "Profissional inválido."));
  }

  const periodo = periodoSchema.safeParse({ de, ate });
  if (!periodo.success) {
    return redirecionarComAviso(comErro(voltar, periodo.error.issues[0]?.message ?? "Período inválido."));
  }

  const { error } = await supabase
    .from("comissao")
    .update({ pago: true, pago_em: hojeISO() })
    .eq("profissional_id", profissionalId)
    .eq("pago", false)
    .gte("data", periodo.data.de)
    .lte("data", periodo.data.ate);

  if (error) return redirecionarComAviso(comErro(voltar, "Não foi possível pagar as comissões."));

  revalidarComissoes();
  redirect(voltar);
}
