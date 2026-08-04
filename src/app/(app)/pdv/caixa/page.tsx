import Link from "next/link";
import { ShoppingCart, Wallet } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import { rotuloFormaVenda } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardTitulo } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FecharCaixaForm } from "./fechar-caixa-form";

export const metadata = { title: "Caixa" };

interface CaixaLinha {
  id: string;
  abertura: string;
  fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  observacao: string | null;
  abriu: { nome: string } | { nome: string }[] | null;
  fechou: { nome: string } | { nome: string }[] | null;
}

interface VendaDoCaixa {
  id: string;
  caixa_id: string | null;
  status: string;
  valor_total: number;
}

interface PagamentoDoCaixa {
  venda_id: string;
  forma: string;
  valor: number;
}

function nomeDe(
  relacao: { nome: string } | { nome: string }[] | null | undefined
): string | null {
  const registro = Array.isArray(relacao) ? relacao[0] : relacao;
  return registro?.nome ?? null;
}

const CAMPOS_CAIXA =
  "id, abertura, fechamento, valor_abertura, valor_fechamento, observacao, " +
  "abriu:aberto_por (nome), fechou:fechado_por (nome)";

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: caixa } = await supabase
    .from("caixa")
    .select(CAMPOS_CAIXA)
    .eq("status", "aberto")
    .maybeSingle<CaixaLinha>();

  const { data: fechados } = await supabase
    .from("caixa")
    .select(CAMPOS_CAIXA)
    .eq("status", "fechado")
    .order("fechamento", { ascending: false })
    .limit(10)
    .returns<CaixaLinha[]>();

  // Vendas de todos os caixas em tela (o aberto + os 10 do histórico), para
  // montar os totais por forma sem uma consulta por caixa.
  const idsCaixas = [caixa?.id, ...(fechados ?? []).map((c) => c.id)].filter(
    (id): id is string => !!id
  );

  let vendas: VendaDoCaixa[] = [];
  let pagamentos: PagamentoDoCaixa[] = [];

  if (idsCaixas.length > 0) {
    const { data } = await supabase
      .from("venda")
      .select("id, caixa_id, status, valor_total")
      .in("caixa_id", idsCaixas)
      .returns<VendaDoCaixa[]>();
    vendas = (data ?? []).filter((v) => v.status !== "cancelada");

    if (vendas.length > 0) {
      const { data: pgs } = await supabase
        .from("pagamento_venda")
        .select("venda_id, forma, valor")
        .in(
          "venda_id",
          vendas.map((v) => v.id)
        )
        .returns<PagamentoDoCaixa[]>();
      pagamentos = pgs ?? [];
    }
  }

  const caixaDaVenda = new Map(vendas.map((v) => [v.id, v.caixa_id]));

  /** Total por forma de pagamento de um caixa. */
  function totaisPorForma(caixaId: string) {
    const mapa = new Map<string, number>();
    for (const p of pagamentos) {
      if (caixaDaVenda.get(p.venda_id) !== caixaId) continue;
      const soma = (mapa.get(p.forma) ?? 0) + Number(p.valor);
      mapa.set(p.forma, Math.round(soma * 100) / 100);
    }
    return [...mapa].sort((a, b) => b[1] - a[1]);
  }

  function totalEmDinheiro(caixaId: string) {
    return pagamentos
      .filter((p) => p.forma === "dinheiro" && caixaDaVenda.get(p.venda_id) === caixaId)
      .reduce((soma, p) => soma + Number(p.valor), 0);
  }

  const alerta = erro && (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md"
    >
      {erro}
    </p>
  );

  const vendasDoAberto = caixa
    ? vendas.filter((v) => v.caixa_id === caixa.id)
    : [];
  const formasDoAberto = caixa ? totaisPorForma(caixa.id) : [];
  const dinheiroEsperado = caixa
    ? Math.round((Number(caixa.valor_abertura) + totalEmDinheiro(caixa.id)) * 100) / 100
    : 0;
  const totalVendido = vendasDoAberto.reduce(
    (soma, v) => soma + Number(v.valor_total),
    0
  );

  return (
    <div>
      <PageHeader
        titulo="Caixa"
        subtitulo={caixa ? "Conferência e fechamento do turno" : "Nenhum caixa aberto"}
        acao={
          <ButtonLink href="/pdv" variante="secondary">
            <ShoppingCart className="size-4" />
            Ir para o PDV
          </ButtonLink>
        }
      />
      {alerta}

      {!caixa ? (
        <EmptyState
          titulo="Nenhum caixa aberto"
          mensagem="Abra o caixa no PDV para começar a vender e depois volte aqui para fechar o turno."
          icone={<Wallet className="size-7" strokeWidth={1.8} />}
          acao={
            <ButtonLink href="/pdv">
              <Wallet className="size-4" />
              Abrir caixa
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardTitulo>Movimento do turno</CardTitulo>

            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Aberto em</dt>
                <dd className="text-right font-medium text-ink">
                  {formatDataHora(caixa.abertura)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Aberto por</dt>
                <dd className="text-right font-medium text-ink">
                  {nomeDe(caixa.abriu) ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Valor de abertura</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {formatBRL(caixa.valor_abertura)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Vendas do turno</dt>
                <dd className="font-medium text-ink tabular-nums">
                  {vendasDoAberto.length}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-white/20 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Recebido por forma
              </p>
              {formasDoAberto.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Nenhum pagamento registrado neste caixa ainda.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {formasDoAberto.map(([forma, valor]) => (
                    <li key={forma} className="flex items-center justify-between gap-3">
                      <span className="text-ink">{rotuloFormaVenda(forma)}</span>
                      <span className="font-medium text-ink tabular-nums">
                        {formatBRL(valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-white/20 pt-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">Total vendido</span>
                <span className="font-medium text-ink tabular-nums">
                  {formatBRL(totalVendido)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-ink">Dinheiro esperado</span>
                <span className="text-xl font-bold text-ink tabular-nums">
                  {formatBRL(dinheiroEsperado)}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Abertura + vendas em dinheiro. Pix, cartões e fiado não passam
                pela gaveta.
              </p>
            </div>
          </Card>

          <Card>
            <CardTitulo>Fechar caixa</CardTitulo>
            <FecharCaixaForm caixaId={caixa.id} dinheiroEsperado={dinheiroEsperado} />
          </Card>
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-ink">
          Últimos caixas fechados
        </h2>

        {(fechados ?? []).length === 0 ? (
          <p className="glass rounded-2xl px-4 py-6 text-center text-sm text-ink-muted">
            Nenhum caixa fechado até agora.
          </p>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-white/20 text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Responsáveis</th>
                  <th className="px-4 py-3 text-right font-medium">Abertura</th>
                  <th className="px-4 py-3 text-right font-medium">Contado</th>
                  <th className="px-4 py-3 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {(fechados ?? []).map((c) => {
                  const esperado =
                    Math.round(
                      (Number(c.valor_abertura) + totalEmDinheiro(c.id)) * 100
                    ) / 100;
                  const contado =
                    c.valor_fechamento == null ? null : Number(c.valor_fechamento);
                  const diferenca =
                    contado == null
                      ? null
                      : Math.round((contado - esperado) * 100) / 100;

                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-ink">
                        {formatDataHora(c.abertura)}
                        <span className="block text-xs text-ink-muted">
                          até {formatDataHora(c.fechamento)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        Abriu: {nomeDe(c.abriu) ?? "—"}
                        <span className="block">
                          Fechou: {nomeDe(c.fechou) ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-ink tabular-nums">
                        {formatBRL(c.valor_abertura)}
                      </td>
                      <td className="px-4 py-3 text-right text-ink tabular-nums">
                        {contado == null ? "—" : formatBRL(contado)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium tabular-nums ${
                          diferenca == null || diferenca === 0
                            ? "text-ink"
                            : diferenca > 0
                              ? "text-emerald-50"
                              : "text-red-50"
                        }`}
                      >
                        {diferenca == null
                          ? "—"
                          : diferenca === 0
                            ? "Bateu"
                            : `${diferenca > 0 ? "+" : "−"}${formatBRL(
                                Math.abs(diferenca)
                              )}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-4 text-center">
        <Link
          href="/vendas"
          className="text-sm font-medium text-brand-mint hover:underline"
        >
          Ver histórico de vendas
        </Link>
      </p>
    </div>
  );
}
