"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import type { AssinaturaStatus, Papel } from "@/lib/types";
import {
  assinaturaSchema,
  beneficiosDoJson,
  centavos,
  descricaoCobranca,
  planoSchema,
  primeiro,
  proximaCobranca,
  usoSchema,
  valorParaNumero,
} from "./schema";

/**
 * Server actions de planos e assinaturas. Toda action: getSessao() → papel
 * → zod → clinica_id do usuário logado (o RLS ainda barra de novo no banco).
 */

/** Catálogo de planos e geração de cobranças mexem em receita: só admin. */
const PAPEIS_PLANO: Papel[] = ["admin"];

/** Assinar/suspender/cancelar é rotina de balcão. */
const PAPEIS_ASSINATURA: Papel[] = ["admin", "recepcao"];

/** Registrar o uso do benefício acontece no atendimento. */
const PAPEIS_USO: Papel[] = ["admin", "recepcao", "veterinario"];

/** Teto de linhas lidas por consulta: clínica normal fica bem abaixo disso. */
const LIMITE = 500;

const ROTA_PLANOS = "/planos";
const ROTA_ASSINATURAS = "/planos/assinaturas";

// ------------------------------------------------------------------
// Auxiliares
// ------------------------------------------------------------------

/** Anexa ?erro= (ou &erro=) preservando o que já estava na URL. */
function comErro(url: string, mensagem: string): string {
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}erro=${encodeURIComponent(mensagem)}`;
}

function revalidarPlanos(): void {
  revalidatePath(ROTA_PLANOS);
  revalidatePath(ROTA_ASSINATURAS);
}

/** Linhas de plano_beneficio prontas para o insert. */
function beneficiosParaBanco(
  beneficios: {
    item_id: string;
    descricao: string;
    quantidade_mes: number;
    desconto_percentual: number;
  }[],
  clinicaId: string,
  planoItemId: string
) {
  return beneficios.map((b) => ({
    clinica_id: clinicaId,
    plano_item_id: planoItemId,
    item_id: b.item_id || null,
    descricao: b.descricao,
    quantidade_mes: b.quantidade_mes,
    desconto_percentual: b.desconto_percentual,
  }));
}

/** Lê e valida o formulário do plano (dados do item + linhas de benefício). */
function lerFormPlano(formData: FormData) {
  const brutos = beneficiosDoJson(String(formData.get("beneficios") ?? "[]"));

  return planoSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    valor_mensal: valorParaNumero(String(formData.get("valor_mensal") ?? "")),
    ativo: formData.get("ativo") === "on",
    beneficios: brutos.map((b) => {
      const linha = (b ?? {}) as Record<string, unknown>;
      return {
        item_id: String(linha.item_id ?? ""),
        descricao: String(linha.descricao ?? ""),
        quantidade_mes: Number(linha.quantidade_mes),
        desconto_percentual: Number(linha.desconto_percentual ?? 0),
      };
    }),
  });
}

// ------------------------------------------------------------------
// Planos (item com tipo='plano' + benefícios)
// ------------------------------------------------------------------

export async function criarPlano(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = "/planos/novo";

  if (!PAPEIS_PLANO.includes(usuario.papel)) {
    redirect(comErro(voltar, "Só o administrador pode criar planos."));
  }

  const resultado = lerFormPlano(formData);
  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }
  const dados = resultado.data;

  const { data: plano, error: erroItem } = await supabase
    .from("item")
    .insert({
      clinica_id: usuario.clinica_id,
      tipo: "plano",
      nome: dados.nome,
      descricao: dados.descricao || null,
      preco_venda: centavos(dados.valor_mensal),
      ativo: dados.ativo,
    })
    .select("id")
    .single<{ id: string }>();

  if (erroItem || !plano) {
    redirect(comErro(voltar, "Não foi possível salvar o plano."));
  }

  const { error: erroBeneficios } = await supabase
    .from("plano_beneficio")
    .insert(beneficiosParaBanco(dados.beneficios, usuario.clinica_id, plano.id));

  // Sem transação no PostgREST: se os benefícios falharem, desfazemos o item
  // na mão para não deixar um plano vazio no catálogo.
  if (erroBeneficios) {
    await supabase.from("item").delete().eq("id", plano.id);
    redirect(comErro(voltar, "Não foi possível salvar os benefícios do plano."));
  }

  revalidarPlanos();
  revalidatePath("/itens");
  redirect(`/planos/${plano.id}`);
}

export async function atualizarPlano(id: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/planos/${id}/editar`;

  if (!PAPEIS_PLANO.includes(usuario.papel)) {
    redirect(comErro(voltar, "Só o administrador pode editar planos."));
  }

  const resultado = lerFormPlano(formData);
  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }
  const dados = resultado.data;

  const { error: erroItem } = await supabase
    .from("item")
    .update({
      nome: dados.nome,
      descricao: dados.descricao || null,
      preco_venda: centavos(dados.valor_mensal),
      ativo: dados.ativo,
    })
    .eq("id", id)
    .eq("tipo", "plano");

  if (erroItem) redirect(comErro(voltar, "Não foi possível salvar o plano."));

  // Os benefícios são substituídos por inteiro. Guardamos os antigos antes
  // de apagar para conseguir devolvê-los se o insert novo falhar.
  const { data: anteriores } = await supabase
    .from("plano_beneficio")
    .select("item_id, descricao, quantidade_mes, desconto_percentual")
    .eq("plano_item_id", id)
    .returns<
      {
        item_id: string | null;
        descricao: string;
        quantidade_mes: number;
        desconto_percentual: number | null;
      }[]
    >();

  await supabase.from("plano_beneficio").delete().eq("plano_item_id", id);

  const { error: erroBeneficios } = await supabase
    .from("plano_beneficio")
    .insert(beneficiosParaBanco(dados.beneficios, usuario.clinica_id, id));

  if (erroBeneficios) {
    // Rollback manual: recoloca os benefícios que existiam antes.
    if (anteriores && anteriores.length > 0) {
      await supabase.from("plano_beneficio").insert(
        anteriores.map((b) => ({
          clinica_id: usuario.clinica_id,
          plano_item_id: id,
          item_id: b.item_id,
          descricao: b.descricao,
          quantidade_mes: b.quantidade_mes,
          desconto_percentual: b.desconto_percentual ?? 0,
        }))
      );
    }
    redirect(comErro(voltar, "Não foi possível salvar os benefícios do plano."));
  }

  revalidarPlanos();
  revalidatePath(`/planos/${id}`);
  revalidatePath("/itens");
  redirect(`/planos/${id}`);
}

export async function excluirPlano(id: string) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/planos/${id}`;

  if (!PAPEIS_PLANO.includes(usuario.papel)) {
    redirect(comErro(voltar, "Só o administrador pode excluir planos."));
  }

  // assinatura.plano_item_id é "on delete restrict": um plano com assinantes
  // (mesmo cancelados) não some do sistema.
  const { count } = await supabase
    .from("assinatura")
    .select("id", { count: "exact", head: true })
    .eq("plano_item_id", id);

  if ((count ?? 0) > 0) {
    redirect(
      comErro(voltar, "Este plano já tem assinaturas. Desative-o em vez de excluir.")
    );
  }

  const { error } = await supabase.from("item").delete().eq("id", id).eq("tipo", "plano");
  if (error) redirect(comErro(voltar, "Não foi possível excluir o plano."));

  revalidarPlanos();
  revalidatePath("/itens");
  redirect(ROTA_PLANOS);
}

// ------------------------------------------------------------------
// Assinaturas
// ------------------------------------------------------------------

export async function criarAssinatura(formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = "/planos/assinaturas/nova";

  if (!PAPEIS_ASSINATURA.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode criar assinaturas."));
  }

  const resultado = assinaturaSchema.safeParse({
    tutor_id: String(formData.get("tutor_id") ?? ""),
    pet_id: String(formData.get("pet_id") ?? ""),
    plano_item_id: String(formData.get("plano_item_id") ?? ""),
    valor_mensal: valorParaNumero(String(formData.get("valor_mensal") ?? "")),
    dia_cobranca: Number(formData.get("dia_cobranca") ?? NaN),
    inicio: String(formData.get("inicio") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  });

  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }
  const dados = resultado.data;

  // O plano precisa existir na clínica (o RLS limita a busca) e ser um plano.
  const { data: plano } = await supabase
    .from("item")
    .select("id")
    .eq("id", dados.plano_item_id)
    .eq("tipo", "plano")
    .single<{ id: string }>();

  if (!plano) redirect(comErro(voltar, "Plano inválido."));

  const { data: assinatura, error } = await supabase
    .from("assinatura")
    .insert({
      clinica_id: usuario.clinica_id,
      tutor_id: dados.tutor_id,
      pet_id: dados.pet_id || null,
      plano_item_id: dados.plano_item_id,
      valor_mensal: centavos(dados.valor_mensal),
      dia_cobranca: dados.dia_cobranca,
      inicio: dados.inicio,
      observacao: dados.observacao || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !assinatura) {
    redirect(comErro(voltar, "Não foi possível salvar a assinatura."));
  }

  revalidarPlanos();
  revalidatePath(`/tutores/${dados.tutor_id}`);
  redirect(`/planos/assinaturas/${assinatura.id}`);
}

/** Suspender, reativar e cancelar caem todos aqui. */
export async function alterarStatusAssinatura(id: string, status: AssinaturaStatus) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/planos/assinaturas/${id}`;

  if (!PAPEIS_ASSINATURA.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode alterar assinaturas."));
  }

  if (!["ativa", "suspensa", "cancelada"].includes(status)) {
    redirect(comErro(voltar, "Status inválido."));
  }

  // Cancelar encerra de verdade: grava a data do fim. Reativar limpa o fim.
  const { error } = await supabase
    .from("assinatura")
    .update({
      status,
      fim: status === "cancelada" ? hojeISO() : null,
    })
    .eq("id", id);

  if (error) redirect(comErro(voltar, "Não foi possível alterar a assinatura."));

  revalidarPlanos();
  revalidatePath(voltar);
  redirect(voltar);
}

export async function registrarUso(assinaturaId: string, formData: FormData) {
  const { supabase, usuario } = await getSessao();
  const voltar = `/planos/assinaturas/${assinaturaId}`;

  if (!PAPEIS_USO.includes(usuario.papel)) {
    redirect(comErro(voltar, "Seu perfil não pode registrar uso de benefício."));
  }

  const resultado = usoSchema.safeParse({
    beneficio_id: String(formData.get("beneficio_id") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    data: String(formData.get("data") ?? ""),
  });

  if (!resultado.success) {
    redirect(comErro(voltar, resultado.error.issues[0]?.message ?? "Verifique os campos."));
  }
  const dados = resultado.data;

  const { data: assinatura } = await supabase
    .from("assinatura")
    .select("id, status")
    .eq("id", assinaturaId)
    .single<{ id: string; status: AssinaturaStatus }>();

  if (!assinatura) redirect(comErro(voltar, "Assinatura não encontrada."));
  if (assinatura.status !== "ativa") {
    redirect(comErro(voltar, "Só assinatura ativa consome benefício."));
  }

  const { error } = await supabase.from("uso_beneficio").insert({
    clinica_id: usuario.clinica_id,
    assinatura_id: assinaturaId,
    beneficio_id: dados.beneficio_id || null,
    descricao: dados.descricao,
    data: dados.data,
  });

  if (error) redirect(comErro(voltar, "Não foi possível registrar o uso."));

  revalidatePath(voltar);
  redirect(voltar);
}

// ------------------------------------------------------------------
// Cobrança mensal
// ------------------------------------------------------------------

interface AssinaturaCobranca {
  id: string;
  tutor_id: string;
  valor_mensal: number;
  dia_cobranca: number;
  inicio: string;
  fim: string | null;
  plano: { nome: string } | { nome: string }[] | null;
}

/**
 * Gera a conta a receber do mês para cada assinatura ativa.
 *
 * Lógica de data (comentada porque é o coração do módulo):
 *  - `dia_cobranca` vai de 1 a 28, então o dia sempre existe no mês.
 *  - Se o dia ainda não passou neste mês, o vencimento é neste mês;
 *    se já passou, a cobrança vai para o mês seguinte (proximaCobranca).
 *  - Assinatura que começa depois desse vencimento ainda não cobra;
 *    assinatura já encerrada (fim < vencimento) também não.
 *
 * Anti-duplicata: a descrição carrega o mês/ano ("Assinatura Banho Mensal
 * · 08/2026"). Antes de inserir, lemos as contas a receber daquele intervalo
 * de vencimento e comparamos por tutor + descrição.
 */
export async function gerarCobrancasDoMes() {
  const { supabase, usuario } = await getSessao();

  if (!PAPEIS_PLANO.includes(usuario.papel)) {
    redirect(comErro(ROTA_ASSINATURAS, "Só o administrador pode gerar cobranças."));
  }

  const hoje = hojeISO();

  const { data: assinaturas } = await supabase
    .from("assinatura")
    .select(
      "id, tutor_id, valor_mensal, dia_cobranca, inicio, fim, plano:plano_item_id (nome)"
    )
    .eq("status", "ativa")
    .limit(LIMITE)
    .returns<AssinaturaCobranca[]>();

  const candidatas = (assinaturas ?? [])
    .map((a) => {
      const vencimento = proximaCobranca(a.dia_cobranca, hoje);
      return {
        vencimento,
        tutor_id: a.tutor_id,
        valor: Number(a.valor_mensal),
        inicio: a.inicio,
        fim: a.fim,
        descricao: descricaoCobranca(
          primeiro(a.plano)?.nome ?? "plano",
          vencimento
        ),
      };
    })
    .filter((c) => c.inicio <= c.vencimento && (!c.fim || c.fim >= c.vencimento));

  if (candidatas.length === 0) {
    redirect(`${ROTA_ASSINATURAS}?geradas=0&existentes=0`);
  }

  // Janela de vencimentos possível (mês corrente e/ou o seguinte).
  const vencimentos = candidatas.map((c) => c.vencimento).sort();
  const tutores = [...new Set(candidatas.map((c) => c.tutor_id))];

  const { data: existentes } = await supabase
    .from("conta")
    .select("tutor_id, descricao")
    .eq("tipo", "receber")
    .in("tutor_id", tutores)
    .gte("vencimento", vencimentos[0])
    .lte("vencimento", vencimentos[vencimentos.length - 1])
    .limit(LIMITE * 4)
    .returns<{ tutor_id: string | null; descricao: string }[]>();

  const chave = (tutorId: string, descricao: string) => `${tutorId}|${descricao}`;
  const jaExistem = new Set(
    (existentes ?? []).map((c) => chave(c.tutor_id ?? "", c.descricao))
  );

  const novas = candidatas.filter(
    (c) => !jaExistem.has(chave(c.tutor_id, c.descricao))
  );
  const repetidas = candidatas.length - novas.length;

  if (novas.length > 0) {
    const { error } = await supabase.from("conta").insert(
      novas.map((c) => ({
        clinica_id: usuario.clinica_id,
        tipo: "receber",
        descricao: c.descricao,
        tutor_id: c.tutor_id,
        valor: centavos(c.valor),
        vencimento: c.vencimento,
        registrado_por: usuario.id,
      }))
    );

    if (error) {
      redirect(comErro(ROTA_ASSINATURAS, "Não foi possível gerar as cobranças."));
    }
  }

  revalidatePath("/financeiro");
  revalidatePath("/financeiro/receber");
  revalidatePath("/dashboard");
  revalidarPlanos();
  redirect(`${ROTA_ASSINATURAS}?geradas=${novas.length}&existentes=${repetidas}`);
}
