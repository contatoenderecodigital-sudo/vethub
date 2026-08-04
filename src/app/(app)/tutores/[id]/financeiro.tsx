import { ArrowDownRight, ArrowUpRight, Receipt, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO } from "@/lib/format";
import {
  rotuloFormaPagamento,
  type LancamentoFinanceiro,
  type Papel,
} from "@/lib/types";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { excluirLancamento } from "../actions";
import { LancamentoForm } from "./lancamento-form";

/** Quem pode lançar/excluir valores (o servidor confere de novo na action). */
const PAPEIS_FINANCEIRO: Papel[] = ["admin", "recepcao"];

const ULTIMOS = 10;

type LinhaExtrato = Pick<
  LancamentoFinanceiro,
  "id" | "tipo" | "valor" | "descricao" | "forma_pagamento" | "data"
>;

/**
 * Painel financeiro do tutor (o "saldo do cliente" da Peti9): saldo em
 * destaque, totais de débito e crédito e o extrato dos últimos lançamentos.
 * Saldo negativo = o tutor deve para a clínica.
 */
export async function CardFinanceiro({ tutorId }: { tutorId: string }) {
  const { supabase, usuario } = await getSessao();
  const podeLancar = PAPEIS_FINANCEIRO.includes(usuario.papel);

  const [{ data: saldoRpc }, { data: totais }, { data: ultimos }] =
    await Promise.all([
      // saldo autoritativo: crédito - débito, calculado no banco
      supabase.rpc("saldo_do_tutor", { p_tutor_id: tutorId }),
      supabase
        .from("lancamento_financeiro")
        .select("tipo, valor")
        .eq("tutor_id", tutorId)
        .returns<Pick<LancamentoFinanceiro, "tipo" | "valor">[]>(),
      supabase
        .from("lancamento_financeiro")
        .select("id, tipo, valor, descricao, forma_pagamento, data")
        .eq("tutor_id", tutorId)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(ULTIMOS)
        .returns<LinhaExtrato[]>(),
    ]);

  let totalDebito = 0;
  let totalCredito = 0;
  for (const l of totais ?? []) {
    if (l.tipo === "credito") totalCredito += Number(l.valor);
    else totalDebito += Number(l.valor);
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
            const credito = l.tipo === "credito";
            const forma = rotuloFormaPagamento(l.forma_pagamento);
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
              >
                <span className="w-20 shrink-0 text-xs tabular-nums text-ink-muted">
                  {formatDataISO(l.data)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {l.descricao}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {credito ? "Crédito" : "Débito"}
                    {forma ? ` · ${forma}` : ""}
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
                  <form action={excluirLancamento.bind(null, l.id, tutorId)}>
                    <ConfirmButton
                      variante="ghost"
                      tamanho="sm"
                      mensagem="Excluir este lançamento? O saldo do tutor será recalculado."
                      aria-label={`Excluir lançamento: ${l.descricao}`}
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
