import { ArrowDownRight, ArrowUpRight, Receipt, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO } from "@/lib/format";
import { rotuloFormaPagamento, type Papel } from "@/lib/types";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { excluirLancamento } from "../actions";
import { LancamentoForm } from "./lancamento-form";

/** Quem pode lançar/excluir valores (o servidor confere de novo na action). */
const PAPEIS_FINANCEIRO: Papel[] = ["admin", "recepcao"];

const ULTIMOS = 10;

/**
 * Uma linha do extrato é uma CONTA do tutor — o mesmo registro que aparece
 * em Contas a receber. Antes o extrato vinha de uma tabela própria, e a
 * mesma dívida acabava com dois valores diferentes nas duas telas.
 */
interface LinhaExtrato {
  id: string;
  tipo: "receber" | "pagar";
  valor: number;
  valor_pago: number;
  descricao: string;
  forma_pagamento: string | null;
  competencia: string;
  status: string;
}

/**
 * Painel financeiro do tutor (o "saldo do cliente" da Peti9): saldo em
 * destaque, totais de débito e crédito e o extrato dos últimos lançamentos.
 * Saldo negativo = o tutor deve para a clínica.
 */
export async function CardFinanceiro({ tutorId }: { tutorId: string }) {
  const { supabase, usuario } = await getSessao();
  const podeLancar = PAPEIS_FINANCEIRO.includes(usuario.papel);

  const CAMPOS =
    "id, tipo, valor, valor_pago, descricao, forma_pagamento, competencia, status";

  const [{ data: saldoRpc }, { data: todas }, { data: ultimos }] =
    await Promise.all([
      // saldo autoritativo: calculado no banco a partir das contas
      supabase.rpc("saldo_do_tutor", { p_tutor_id: tutorId }),
      supabase
        .from("conta")
        .select("tipo, valor, valor_pago, status")
        .eq("tutor_id", tutorId)
        .neq("status", "cancelada")
        .returns<Pick<LinhaExtrato, "tipo" | "valor" | "valor_pago" | "status">[]>(),
      supabase
        .from("conta")
        .select(CAMPOS)
        .eq("tutor_id", tutorId)
        .order("competencia", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(ULTIMOS)
        .returns<LinhaExtrato[]>(),
    ]);

  // "Débito" é o que o tutor ainda deve; "crédito", o que a clínica deve a
  // ele (troco guardado, adiantamento). Só o que está EM ABERTO conta: uma
  // venda já paga não é dívida de ninguém.
  let totalDebito = 0;
  let totalCredito = 0;
  for (const c of todas ?? []) {
    const aberto = Number(c.valor) - Number(c.valor_pago);
    if (aberto <= 0) continue;
    if (c.tipo === "pagar") totalCredito += aberto;
    else totalDebito += aberto;
  }

  // rpc é a fonte da verdade; se ela falhar, cai na soma em memória
  const saldo =
    saldoRpc != null && Number.isFinite(Number(saldoRpc))
      ? Number(saldoRpc)
      : totalCredito - totalDebito;

  const devendo = saldo < 0;
  const zerado = Math.abs(saldo) < 0.005;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CardTitulo className="mb-0">Financeiro</CardTitulo>
        {podeLancar && <LancamentoForm tutorId={tutorId} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Saldo em destaque */}
        <div
          className={`rounded-xl border p-4 sm:col-span-1 ${
            zerado
              ? "border-edge bg-white/10"
              : devendo
                ? "border-red-200/40 bg-red-400/20"
                : "border-emerald-200/40 bg-emerald-300/20"
          }`}
        >
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            {zerado ? "Saldo" : devendo ? "Em aberto" : "Crédito disponível"}
          </p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${
              zerado ? "text-ink" : devendo ? "text-red-50" : "text-emerald-50"
            }`}
          >
            {formatBRL(Math.abs(saldo))}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {zerado
              ? "Nada a receber nem a devolver."
              : devendo
                ? "O tutor deve este valor para a clínica."
                : "Valor a favor do tutor (adiantamento)."}
          </p>
        </div>

        {/* Mini-blocos: total de débitos e de créditos */}
        <div className="rounded-xl border border-edge bg-white/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
            <ArrowDownRight className="size-3.5 shrink-0" aria-hidden />
            Débitos
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-red-50">
            {formatBRL(totalDebito)}
          </p>
        </div>

        <div className="rounded-xl border border-edge bg-white/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
            <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
            Créditos
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-50">
            {formatBRL(totalCredito)}
          </p>
        </div>
      </div>

      <h3 className="mt-5 mb-2 text-sm font-semibold text-ink">
        Últimos lançamentos
      </h3>

      {!ultimos || ultimos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
          <Receipt className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          Nenhum lançamento registrado para este tutor.
        </p>
      ) : (
        <ul className="divide-y divide-white/15">
          {ultimos.map((l) => {
            const credito = l.tipo === "pagar";
            const forma = rotuloFormaPagamento(l.forma_pagamento);
            const emAberto = Number(l.valor) - Number(l.valor_pago);
            const situacao =
              l.status === "cancelada"
                ? "Cancelado"
                : emAberto <= 0
                  ? "Quitado"
                  : emAberto < Number(l.valor)
                    ? `Em aberto ${formatBRL(emAberto)}`
                    : null;
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
              >
                <span className="w-20 shrink-0 text-xs tabular-nums text-ink-muted">
                  {formatDataISO(l.competencia)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {l.descricao}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {credito ? "Crédito" : "Débito"}
                    {forma ? ` · ${forma}` : ""}
                    {situacao ? ` · ${situacao}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    credito ? "text-emerald-50" : "text-red-50"
                  }`}
                >
                  {credito ? "+" : "-"} {formatBRL(Number(l.valor))}
                </span>
                {podeLancar && (
                  <form
                    action={excluirLancamento.bind(null, l.id, tutorId)}
                    className="shrink-0"
                  >
                    <ConfirmButton
                      variante="ghost"
                      tamanho="sm"
                      mensagem="Excluir este lançamento? O saldo do tutor será recalculado."
                      aria-label={`Excluir lançamento: ${l.descricao}`}
                      className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-0"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Excluir</span>
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
