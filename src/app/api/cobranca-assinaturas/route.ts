import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Faturamento das assinaturas.
 *
 * Antes, o módulo de planos era decorativo: criava a assinatura com "próxima
 * cobrança 05/09" e nunca gerava nada. Vendedor mostrava a tela, o cliente
 * assinava, e no dia da cobrança não existia conta nenhuma para receber.
 *
 * Esta rota roda uma vez por dia (agendada na Vercel) e, para cada assinatura
 * ativa que vence hoje ou já venceu, cria a conta a receber. A conta é igual a
 * qualquer outra: aparece no extrato do tutor, nas contas a receber e no
 * painel financeiro.
 *
 * Ela é segura para rodar de novo no mesmo dia: o índice único
 * (assinatura_id, vencimento) faz o banco recusar a segunda tentativa. Isso é
 * proposital — idempotência garantida pelo banco vale mais do que um `if`
 * antes do insert, que perde a corrida quando dois processos rodam juntos.
 */

/** Roda no servidor, sob demanda: nunca cachear. */
export const dynamic = "force-dynamic";

/** Quantos meses para trás vale gerar (assinatura esquecida não fica sem). */
const MESES_ATRASADOS = 3;

/** A data de cobrança do mês, respeitando o dia escolhido na assinatura. */
function vencimentoDoMes(ano: number, mes: number, dia: number): string {
  // `dia_cobranca` é limitado a 28 no banco justamente para não existir
  // "31 de fevereiro" — então aqui não há mês curto para tratar.
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

async function executar(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = request.headers.get("authorization");

  // A Vercel manda `Authorization: Bearer <CRON_SECRET>` nas rotas agendadas.
  // Sem segredo configurado a rota fica fechada, e não aberta: gerar cobrança
  // é escrita em dinheiro, o padrão inseguro aqui seria imperdoável.
  if (!segredo || autorizacao !== `Bearer ${segredo}`) {
    // A resposta diferencia "o servidor não tem segredo" de "o segredo veio
    // errado". Sem isso, quem configura a variável na Vercel e esquece de
    // fazer o redeploy vê o mesmo 401 dos dois casos e não tem como saber
    // qual é — a rotina simplesmente não cobra ninguém, em silêncio.
    // Dizer se a variável existe não expõe o valor dela.
    return NextResponse.json(
      {
        erro: "não autorizado",
        segredoConfiguradoNoServidor: Boolean(segredo),
        dica: segredo
          ? "O servidor tem o segredo; o cabeçalho Authorization é que não bate."
          : "Falta a variável CRON_SECRET nesta implantação. Configure na Vercel e refaça o deploy.",
      },
      { status: 401 }
    );
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const { data: assinaturas, error } = await db
    .from("assinatura")
    .select(
      "id, clinica_id, tutor_id, valor_mensal, dia_cobranca, inicio, fim, plano:plano_item_id (nome)"
    )
    .eq("status", "ativa");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const geradas: string[] = [];
  const jaExistiam: string[] = [];
  const falhas: { assinatura: string; motivo: string }[] = [];

  const [anoHoje, mesHoje] = hoje.split("-").map(Number);

  for (const a of assinaturas ?? []) {
    const plano = Array.isArray(a.plano) ? a.plano[0] : a.plano;
    const nome = plano?.nome ?? "Plano";

    // Do mês corrente para trás: quem assinou em maio e nunca foi cobrado
    // recebe as competências que faltam, cada uma com o próprio vencimento.
    for (let atras = MESES_ATRASADOS; atras >= 0; atras--) {
      const alvo = new Date(Date.UTC(anoHoje, mesHoje - 1 - atras, 1));
      const vencimento = vencimentoDoMes(
        alvo.getUTCFullYear(),
        alvo.getUTCMonth(),
        a.dia_cobranca
      );

      if (vencimento > hoje) continue; // ainda não chegou o dia
      if (vencimento < a.inicio) continue; // antes de a assinatura existir
      if (a.fim && vencimento > a.fim) continue; // depois de encerrada

      const { error: erroInsert } = await db.from("conta").insert({
        clinica_id: a.clinica_id,
        tipo: "receber",
        descricao: `${nome}, mensalidade ${vencimento.slice(0, 7)}`,
        tutor_id: a.tutor_id,
        assinatura_id: a.id,
        valor: a.valor_mensal,
        competencia: vencimento,
        vencimento,
        origem: "assinatura",
      });

      if (!erroInsert) {
        geradas.push(`${a.id} ${vencimento}`);
      } else if (erroInsert.code === "23505") {
        // Violação do índice único: essa competência já foi cobrada. É o
        // caminho normal quando a rotina roda mais de uma vez no dia.
        jaExistiam.push(`${a.id} ${vencimento}`);
      } else {
        falhas.push({ assinatura: a.id, motivo: erroInsert.message });
      }
    }
  }

  return NextResponse.json({
    data: hoje,
    assinaturasAtivas: assinaturas?.length ?? 0,
    cobrancasGeradas: geradas.length,
    jaExistiam: jaExistiam.length,
    falhas,
  });
}

/**
 * A Vercel chama rota agendada por GET. O POST fica disponível para
 * disparar a rotina à mão sem esperar o horário.
 */
export const GET = executar;
export const POST = executar;
