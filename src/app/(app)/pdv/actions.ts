"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatBRL, hojeISO } from "@/lib/format";
import { FORMAS_PARCELAVEIS, type ItemVenda } from "@/lib/types";
import { centavos, milesimos, paraNumero } from "./numeros";
import {
  aberturaCaixaSchema,
  fechamentoCaixaSchema,
  primeiroErro,
  vendaSchema,
} from "./schema";

/** Dias até o vencimento da conta a receber gerada por uma venda fiada. */
const PRAZO_FIADO_DIAS = 30;

/** Soma dias a uma data YYYY-MM-DD sem tropeçar em fuso. */
function somarDias(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function voltarComErro(rota: string, mensagem: string): never {
  redirect(`${rota}?erro=${encodeURIComponent(mensagem)}`);
}

// ==================================================================
// Caixa
// ==================================================================

export async function abrirCaixa(formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const resultado = aberturaCaixaSchema.safeParse({
    valor_abertura: paraNumero(String(formData.get("valor_abertura") ?? "0")) || 0,
    observacao: String(formData.get("observacao") ?? ""),
  });

  if (!resultado.success) {
    voltarComErro("/pdv", primeiroErro(resultado.error, "Verifique os campos."));
  }

  // O índice único do banco já garante um caixa aberto por clínica; a
  // checagem aqui é só para dar uma mensagem decente em vez de erro cru.
  const { data: aberto } = await supabase
    .from("caixa")
    .select("id")
    .eq("status", "aberto")
    .maybeSingle<{ id: string }>();

  if (aberto) {
    revalidatePath("/pdv");
    redirect("/pdv");
  }

  const { error } = await supabase.from("caixa").insert({
    clinica_id: usuario.clinica_id,
    aberto_por: usuario.id,
    valor_abertura: centavos(resultado.data.valor_abertura),
    observacao: resultado.data.observacao || null,
  });

  if (error) voltarComErro("/pdv", "Não foi possível abrir o caixa.");

  revalidatePath("/pdv");
  revalidatePath("/pdv/caixa");
  redirect("/pdv");
}

export async function fecharCaixa(caixaId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();

  const resultado = fechamentoCaixaSchema.safeParse({
    valor_fechamento:
      paraNumero(String(formData.get("valor_fechamento") ?? "0")) || 0,
    observacao: String(formData.get("observacao") ?? ""),
  });

  if (!resultado.success) {
    voltarComErro(
      "/pdv/caixa",
      primeiroErro(resultado.error, "Verifique os campos.")
    );
  }

  const { error } = await supabase
    .from("caixa")
    .update({
      status: "fechado",
      fechamento: new Date().toISOString(),
      fechado_por: usuario.id,
      valor_fechamento: centavos(resultado.data.valor_fechamento),
      observacao: resultado.data.observacao || null,
    })
    .eq("id", caixaId)
    .eq("status", "aberto");

  if (error) voltarComErro("/pdv/caixa", "Não foi possível fechar o caixa.");

  revalidatePath("/pdv");
  revalidatePath("/pdv/caixa");
  redirect("/pdv/caixa");
}

// ==================================================================
// Catálogo: o PDV nunca confia no preço que vem do navegador
// ==================================================================

const CAMPOS_ITEM = "id, nome, preco_venda, controla_estoque, estoque_atual";

/** Item do catálogo pelo id (usado ao escolher no combobox). */
export async function carregarItemPorId(id: string): Promise<ItemVenda | null> {
  const { supabase } = await getSessao();
  if (!id) return null;

  const { data } = await supabase
    .from("item")
    .select(CAMPOS_ITEM)
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle<ItemVenda>();

  return data ?? null;
}

/** Item pelo código de barras ou código interno (leitor do balcão). */
export async function carregarItemPorCodigo(
  codigo: string
): Promise<ItemVenda | null> {
  const { supabase } = await getSessao();
  // Vírgula, parêntese e ponto quebrariam a sintaxe do filtro `or` do PostgREST.
  const termo = codigo.trim().replace(/[^\w-]/g, "").slice(0, 60);
  if (!termo) return null;

  const { data } = await supabase
    .from("item")
    .select(CAMPOS_ITEM)
    .eq("ativo", true)
    .or(`codigo_barras.eq.${termo},codigo.eq.${termo}`)
    .limit(1)
    .returns<ItemVenda[]>();

  return data?.[0] ?? null;
}

// ==================================================================
// Venda
// ==================================================================

export type ResultadoVenda =
  | { erro: string }
  | { id: string; numero: number; troco: number };

/**
 * Fecha a venda: grava venda + itens + pagamentos, dá baixa no estoque e,
 * quando há fiado, lança o débito no extrato do tutor e abre a conta a
 * receber. Todos os totais são recalculados AQUI. O payload do navegador
 * serve só para dizer o que foi vendido, nunca por quanto ficou.
 */
export async function finalizarVenda(payload: string): Promise<ResultadoVenda> {
  const { supabase, usuario } = await getSessao();

  let bruto: unknown;
  try {
    bruto = JSON.parse(payload);
  } catch {
    return { erro: "Não foi possível ler os dados da venda." };
  }

  const resultado = vendaSchema.safeParse(bruto);
  if (!resultado.success) {
    return { erro: primeiroErro(resultado.error, "Verifique os itens da venda.") };
  }
  const dados = resultado.data;

  const { data: caixa } = await supabase
    .from("caixa")
    .select("id")
    .eq("status", "aberto")
    .maybeSingle<{ id: string }>();

  if (!caixa) {
    return { erro: "Nenhum caixa aberto. Abra o caixa antes de vender." };
  }

  // ---- totais (o trigger recalcula subtotal/valor_total; conferimos aqui
  // para validar os pagamentos antes de gravar qualquer coisa) ----------
  const itens = dados.itens.map((item) => ({
    ...item,
    quantidade: milesimos(item.quantidade),
    valor_unitario: centavos(item.valor_unitario),
    desconto: centavos(item.desconto),
  }));

  let subtotal = 0;
  for (const item of itens) {
    const liquido = centavos(item.quantidade * item.valor_unitario - item.desconto);
    if (liquido < 0) {
      return {
        erro: `O desconto de "${item.descricao}" é maior que o valor do item.`,
      };
    }
    subtotal = centavos(subtotal + liquido);
  }

  const descontoGeral = centavos(dados.desconto);
  if (descontoGeral > subtotal) {
    return { erro: "O desconto é maior que o subtotal da venda." };
  }

  const total = centavos(subtotal - descontoGeral);
  if (total <= 0) {
    return { erro: "O total da venda precisa ser maior que zero." };
  }

  // ---- pagamentos ----------------------------------------------------
  const pagamentos = dados.pagamentos.map((p) => ({
    forma: p.forma,
    valor: centavos(p.valor),
    parcelas: FORMAS_PARCELAVEIS.includes(p.forma) ? p.parcelas : 1,
  }));

  const pago = pagamentos.reduce((soma, p) => centavos(soma + p.valor), 0);
  if (pago < total) {
    return { erro: `Faltam ${formatBRL(centavos(total - pago))} para fechar a venda.` };
  }

  // O que passou do total é troco, e troco só sai do dinheiro. Guardamos
  // apenas o valor que FICA no caixa, senão o fechamento nunca bate.
  const troco = centavos(pago - total);
  let restaAbater = troco;
  for (let i = pagamentos.length - 1; i >= 0 && restaAbater > 0; i--) {
    if (pagamentos[i].forma !== "dinheiro") continue;
    const abate = Math.min(restaAbater, pagamentos[i].valor);
    pagamentos[i].valor = centavos(pagamentos[i].valor - abate);
    restaAbater = centavos(restaAbater - abate);
  }
  if (restaAbater > 0) {
    return {
      erro: "Os pagamentos somam mais que o total. Só o dinheiro gera troco.",
    };
  }

  const efetivos = pagamentos.filter((p) => p.valor > 0);
  if (efetivos.length === 0) {
    return { erro: "Informe ao menos uma forma de pagamento." };
  }

  const totalFiado = efetivos
    .filter((p) => p.forma === "fiado")
    .reduce((soma, p) => centavos(soma + p.valor), 0);

  if (totalFiado > 0 && !dados.tutor_id) {
    return { erro: "Escolha o tutor para lançar a venda no fiado." };
  }

  // ---- grava ---------------------------------------------------------
  const { data: venda, error: erroVenda } = await supabase
    .from("venda")
    .insert({
      clinica_id: usuario.clinica_id,
      caixa_id: caixa.id,
      tutor_id: dados.tutor_id,
      vendedor_id: usuario.id,
      desconto: descontoGeral,
      status: totalFiado > 0 ? "aberta" : "paga",
      observacao: dados.observacao || null,
    })
    .select("id, numero")
    .single<{ id: string; numero: number }>();

  if (erroVenda || !venda) return { erro: "Não foi possível registrar a venda." };

  const { error: erroItens } = await supabase.from("venda_item").insert(
    itens.map((item) => ({
      venda_id: venda.id,
      item_id: item.item_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      desconto: item.desconto,
      profissional_id: usuario.id,
    }))
  );

  if (erroItens) {
    await supabase.from("venda").delete().eq("id", venda.id);
    return { erro: "Não foi possível salvar os itens da venda." };
  }

  const { error: erroPagamentos } = await supabase.from("pagamento_venda").insert(
    efetivos.map((p) => ({
      venda_id: venda.id,
      forma: p.forma,
      valor: p.valor,
      parcelas: p.parcelas,
    }))
  );

  if (erroPagamentos) {
    await supabase.from("venda").delete().eq("id", venda.id);
    return { erro: "Não foi possível salvar os pagamentos." };
  }

  // ---- estoque: só produtos que controlam --------------------------------
  await baixarEstoque(supabase, usuario, itens, venda.numero);

  // ---- fiado: débito no extrato + conta a receber -------------------------
  if (totalFiado > 0 && dados.tutor_id) {
    const hoje = hojeISO();
    await supabase.from("lancamento_financeiro").insert({
      clinica_id: usuario.clinica_id,
      tutor_id: dados.tutor_id,
      tipo: "debito",
      valor: totalFiado,
      descricao: `Venda nº ${venda.numero} (fiado)`,
      forma_pagamento: "fiado",
      data: hoje,
      registrado_por: usuario.id,
    });

    await supabase.from("conta").insert({
      clinica_id: usuario.clinica_id,
      tipo: "receber",
      descricao: `Venda nº ${venda.numero}`,
      tutor_id: dados.tutor_id,
      venda_id: venda.id,
      valor: totalFiado,
      vencimento: somarDias(hoje, PRAZO_FIADO_DIAS),
      status: "aberta",
      registrado_por: usuario.id,
    });

    revalidatePath(`/tutores/${dados.tutor_id}`);
  }

  revalidatePath("/pdv");
  revalidatePath("/pdv/caixa");
  revalidatePath("/vendas");
  revalidatePath("/dashboard");

  return { id: venda.id, numero: venda.numero, troco };
}

type ClienteSupabase = Awaited<ReturnType<typeof getSessao>>["supabase"];
type UsuarioSessao = Awaited<ReturnType<typeof getSessao>>["usuario"];

/**
 * Saída de estoque dos produtos vendidos. O trigger do banco recalcula o
 * estoque_atual a partir das movimentações. Aqui só registramos o fato.
 * O mesmo item repetido no carrinho vira uma movimentação só.
 */
async function baixarEstoque(
  supabase: ClienteSupabase,
  usuario: UsuarioSessao,
  itens: { item_id: string | null; quantidade: number }[],
  numero: number
) {
  const ids = [...new Set(itens.map((i) => i.item_id).filter((id): id is string => !!id))];
  if (ids.length === 0) return;

  const { data: controlados } = await supabase
    .from("item")
    .select("id")
    .in("id", ids)
    .eq("controla_estoque", true)
    .returns<{ id: string }[]>();

  if (!controlados || controlados.length === 0) return;

  const porItem = new Map<string, number>();
  for (const item of itens) {
    if (!item.item_id) continue;
    if (!controlados.some((c) => c.id === item.item_id)) continue;
    porItem.set(item.item_id, milesimos((porItem.get(item.item_id) ?? 0) + item.quantidade));
  }

  if (porItem.size === 0) return;

  await supabase.from("movimentacao_estoque").insert(
    [...porItem].map(([item_id, quantidade]) => ({
      clinica_id: usuario.clinica_id,
      item_id,
      tipo: "saida",
      quantidade,
      origem: "venda",
      motivo: `Venda nº ${numero}`,
      registrado_por: usuario.id,
    }))
  );

  revalidatePath("/estoque");
  revalidatePath("/itens");
}

/**
 * Cancela a venda (só admin): devolve o estoque com movimentação de entrada,
 * cancela a conta a receber e estorna o débito do tutor quando era fiado.
 */
export async function cancelarVenda(id: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/vendas/${id}`;

  if (usuario.papel !== "admin") {
    voltarComErro(voltar, "Só o administrador pode cancelar vendas.");
  }

  const { data: venda } = await supabase
    .from("venda")
    .select("id, numero, status, tutor_id, valor_total")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      numero: number;
      status: string;
      tutor_id: string | null;
      valor_total: number;
    }>();

  if (!venda) voltarComErro("/vendas", "Venda não encontrada.");
  if (venda.status === "cancelada") {
    voltarComErro(voltar, "Esta venda já está cancelada.");
  }

  const { error } = await supabase
    .from("venda")
    .update({ status: "cancelada" })
    .eq("id", id);

  if (error) voltarComErro(voltar, "Não foi possível cancelar a venda.");

  // Estorno do estoque: entrada com a mesma quantidade que saiu.
  const { data: itens } = await supabase
    .from("venda_item")
    .select("item_id, quantidade")
    .eq("venda_id", id)
    .returns<{ item_id: string | null; quantidade: number }[]>();

  const ids = [
    ...new Set((itens ?? []).map((i) => i.item_id).filter((v): v is string => !!v)),
  ];

  if (ids.length > 0) {
    const { data: controlados } = await supabase
      .from("item")
      .select("id")
      .in("id", ids)
      .eq("controla_estoque", true)
      .returns<{ id: string }[]>();

    const porItem = new Map<string, number>();
    for (const item of itens ?? []) {
      if (!item.item_id) continue;
      if (!controlados?.some((c) => c.id === item.item_id)) continue;
      porItem.set(
        item.item_id,
        milesimos((porItem.get(item.item_id) ?? 0) + Number(item.quantidade))
      );
    }

    if (porItem.size > 0) {
      await supabase.from("movimentacao_estoque").insert(
        [...porItem].map(([item_id, quantidade]) => ({
          clinica_id: usuario.clinica_id,
          item_id,
          tipo: "entrada",
          quantidade,
          origem: "venda",
          motivo: `Cancelamento da venda nº ${venda.numero}`,
          registrado_por: usuario.id,
        }))
      );
    }
  }

  // Conta a receber aberta pela venda fiada deixa de existir.
  const { data: contas } = await supabase
    .from("conta")
    .select("id, valor")
    .eq("venda_id", id)
    .eq("tipo", "receber")
    .neq("status", "cancelada")
    .returns<{ id: string; valor: number }[]>();

  if (contas && contas.length > 0) {
    await supabase
      .from("conta")
      .update({ status: "cancelada" })
      .in(
        "id",
        contas.map((c) => c.id)
      );

    // O extrato do tutor não apaga lançamentos: entra um crédito de estorno.
    if (venda.tutor_id) {
      const totalEstorno = contas.reduce((soma, c) => centavos(soma + Number(c.valor)), 0);
      if (totalEstorno > 0) {
        await supabase.from("lancamento_financeiro").insert({
          clinica_id: usuario.clinica_id,
          tutor_id: venda.tutor_id,
          tipo: "credito",
          valor: totalEstorno,
          descricao: `Estorno da venda nº ${venda.numero} (cancelada)`,
          data: hojeISO(),
          registrado_por: usuario.id,
        });
      }
      revalidatePath(`/tutores/${venda.tutor_id}`);
    }
  }

  revalidatePath("/vendas");
  revalidatePath(voltar);
  revalidatePath("/pdv/caixa");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  redirect(voltar);
}
