import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Plus,
  Scale,
  Tags,
  TriangleAlert,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO, hojeISO } from "@/lib/format";
import { saldoDaConta, type ContaStatus, type ContaTipo } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeVencimento } from "./badges";
import { limitesDoMes, rotuloMes, ultimosMeses, valorCompacto } from "./schema";

export const metadata = { title: "Painel financeiro" };

/** Teto de linhas lidas por consulta — clínica normal fica bem abaixo disso. */
const LIMITE = 500;
const MESES_GRAFICO = 6;
const NO_RESUMO = 5;

interface ContaAberta {
  id: string;
  tipo: ContaTipo;
  descricao: string;
  valor: number;
  valor_pago: number;
  vencimento: string;
  status: ContaStatus;
  fornecedor: string | null;
  tutor: { nome: string } | null;
}

interface ContaPaga {
  tipo: ContaTipo;
  valor_pago: number;
  pagamento: string | null;
}

export default async function PainelFinanceiroPage() {
  const { supabase } = await getSessao();

  const hoje = hojeISO();
  const mes = limitesDoMes(hoje);
  const chavesMeses = ultimosMeses(hoje, MESES_GRAFICO);
  const inicioGrafico = `${chavesMeses[0]}-01`;

  const [{ data: abertas }, { data: pagas }] = await Promise.all([
    // Tudo que ainda não foi quitado até o fim do mês: serve para os cards do
    // mês e para as listas de vencidas/vencendo hoje (que vêm de meses atrás).
    supabase
      .from("conta")
      .select(
        "id, tipo, descricao, valor, valor_pago, vencimento, status, fornecedor, tutor:tutor_id (nome)"
      )
      .in("status", ["aberta", "parcial"])
      .lte("vencimento", mes.fim)
      .order("vencimento")
      .limit(LIMITE)
      .returns<ContaAberta[]>(),
    // Movimento realizado dos últimos 6 meses (o que de fato entrou/saiu).
    supabase
      .from("conta")
      .select("tipo, valor_pago, pagamento")
      .in("status", ["paga", "parcial"])
      .gte("pagamento", inicioGrafico)
      .limit(LIMITE * 4)
      .returns<ContaPaga[]>(),
  ]);

  const contas = abertas ?? [];

  let aReceber = 0;
  let aPagar = 0;
  let vencidoReceber = 0;
  let vencidoPagar = 0;
  const vencidas: ContaAberta[] = [];
  const vencendoHoje: ContaAberta[] = [];

  for (const c of contas) {
    const saldo = saldoDaConta(c);

    // Cards do mês: só o que vence dentro do mês corrente.
    if (c.vencimento >= mes.inicio && c.vencimento <= mes.fim) {
      if (c.tipo === "receber") aReceber += saldo;
      else aPagar += saldo;
    }

    if (c.vencimento < hoje) {
      vencidas.push(c);
      if (c.tipo === "receber") vencidoReceber += saldo;
      else vencidoPagar += saldo;
    } else if (c.vencimento === hoje) {
      vencendoHoje.push(c);
    }
  }

  const totalVencido = vencidoReceber + vencidoPagar;
  const saldoPrevisto = aReceber - aPagar;

  // Gráfico: soma o que foi pago em cada mês, separando entrada de saída.
  const porMes = new Map(
    chavesMeses.map((chave) => [chave, { receita: 0, despesa: 0 }])
  );
  for (const p of pagas ?? []) {
    if (!p.pagamento) continue;
    const alvo = porMes.get(p.pagamento.slice(0, 7));
    if (!alvo) continue;
    if (p.tipo === "receber") alvo.receita += Number(p.valor_pago);
    else alvo.despesa += Number(p.valor_pago);
  }
  const barras = chavesMeses.map((chave) => ({
    chave,
    rotulo: rotuloMes(chave),
    ...porMes.get(chave)!,
  }));
  const maiorBarra = Math.max(
    1,
    ...barras.map((b) => Math.max(b.receita, b.despesa))
  );
  /** Altura em % da coluna, com teto de 84% para o valor caber acima da barra. */
  const altura = (valor: number) =>
    valor <= 0 ? 0 : Math.max(3, (valor / maiorBarra) * 84);

  const cards = [
    {
      rotulo: "A receber no mês",
      valor: aReceber,
      href: "/financeiro/receber?status=abertas",
      icone: ArrowUpRight,
      cor: "text-emerald-50",
    },
    {
      rotulo: "A pagar no mês",
      valor: aPagar,
      href: "/financeiro/pagar?status=abertas",
      icone: ArrowDownRight,
      cor: "text-amber-50",
    },
    {
      rotulo: "Vencidas",
      valor: totalVencido,
      href: "/financeiro/receber?status=vencidas",
      icone: TriangleAlert,
      cor: "text-red-50",
      alerta: totalVencido > 0,
      detalhe: `${formatBRL(vencidoReceber)} a receber · ${formatBRL(vencidoPagar)} a pagar`,
    },
    {
      rotulo: "Saldo previsto",
      valor: saldoPrevisto,
      href: "/financeiro/receber",
      icone: Scale,
      cor: saldoPrevisto < 0 ? "text-red-50" : "text-ink",
      detalhe: "A receber menos a pagar no mês",
    },
  ];

  return (
    <div>
      <PageHeader
        titulo="Painel financeiro"
        subtitulo={`Mês de ${formatDataISO(mes.inicio)} a ${formatDataISO(mes.fim)}`}
        acao={
          <>
            <ButtonLink href="/financeiro/categorias" variante="secondary">
              <Tags className="size-4" />
              Categorias
            </ButtonLink>
            <ButtonLink href="/financeiro/nova?tipo=receber">
              <Plus className="size-4" />
              Nova conta
            </ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.rotulo}
            href={c.href}
            className={`glass rounded-2xl p-4 transition-all hover:bg-white/20 hover:shadow-lg hover:shadow-black/10 ${
              c.alerta ? "border-red-200/50 bg-red-400/20" : ""
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
              <c.icone className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
              {c.rotulo}
            </p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${c.cor}`}>
              {formatBRL(c.valor)}
            </p>
            {c.detalhe && (
              <p className="mt-1 text-xs text-ink-muted">{c.detalhe}</p>
            )}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ResumoContas
          titulo="Vencendo hoje"
          icone={<CalendarClock className="size-4" strokeWidth={1.8} aria-hidden />}
          contas={vencendoHoje}
          vazio="Nenhuma conta vence hoje."
        />
        <ResumoContas
          titulo="Vencidas"
          icone={<TriangleAlert className="size-4" strokeWidth={1.8} aria-hidden />}
          contas={vencidas}
          vazio="Nenhuma conta em atraso. Tudo em dia."
          filtro="vencidas"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitulo className="mb-0">Últimos 6 meses</CardTitulo>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-300" aria-hidden />
              Recebido
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-300" aria-hidden />
              Pago
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-[30rem] items-end gap-2 sm:min-w-0 sm:gap-4">
            {barras.map((b) => (
              <div key={b.chave} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center gap-1.5">
                  {/* barra de receita */}
                  <div className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-emerald-50 tabular-nums">
                      {b.receita > 0 ? valorCompacto(b.receita) : "—"}
                    </span>
                    <div
                      style={{ height: `${altura(b.receita)}%` }}
                      className="w-full max-w-10 rounded-t-md bg-emerald-300/80"
                      title={`Recebido em ${b.rotulo}: ${formatBRL(b.receita)}`}
                    />
                  </div>
                  {/* barra de despesa */}
                  <div className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-amber-50 tabular-nums">
                      {b.despesa > 0 ? valorCompacto(b.despesa) : "—"}
                    </span>
                    <div
                      style={{ height: `${altura(b.despesa)}%` }}
                      className="w-full max-w-10 rounded-t-md bg-amber-300/80"
                      title={`Pago em ${b.rotulo}: ${formatBRL(b.despesa)}`}
                    />
                  </div>
                </div>
                <span className="text-xs text-ink-muted">{b.rotulo}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-ink-muted">
          Valores efetivamente recebidos e pagos, pela data da baixa.
        </p>
      </Card>
    </div>
  );
}

/** Bloco "Vencendo hoje" / "Vencidas": as 5 primeiras + link para a lista. */
function ResumoContas({
  titulo,
  icone,
  contas,
  vazio,
  filtro = "abertas",
}: {
  titulo: string;
  icone: React.ReactNode;
  contas: ContaAberta[];
  vazio: string;
  filtro?: string;
}) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitulo className="mb-0 flex items-center gap-2">
          {icone}
          {titulo}
          {contas.length > 0 && (
            <span className="text-sm font-normal text-ink-muted">
              ({contas.length})
            </span>
          )}
        </CardTitulo>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/financeiro/receber?status=${filtro}`}
            className="inline-flex items-center gap-1 font-medium link-vidro"
          >
            A receber
            <ChevronRight className="size-4" />
          </Link>
          <Link
            href={`/financeiro/pagar?status=${filtro}`}
            className="inline-flex items-center gap-1 font-medium link-vidro"
          >
            A pagar
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {contas.length === 0 ? (
        <p className="rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
          {vazio}
        </p>
      ) : (
        <ul className="divide-y divide-white/15">
          {contas.slice(0, NO_RESUMO).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{c.descricao}</p>
                <p className="truncate text-xs text-ink-muted">
                  {c.tipo === "receber" ? "A receber" : "A pagar"}
                  {c.tutor?.nome ? ` · ${c.tutor.nome}` : ""}
                  {c.fornecedor ? ` · ${c.fornecedor}` : ""}
                </p>
                <div className="mt-1">
                  <BadgeVencimento vencimento={c.vencimento} status={c.status} />
                </div>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  c.tipo === "receber" ? "text-emerald-50" : "text-amber-50"
                }`}
              >
                {formatBRL(saldoDaConta(c))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {contas.length > NO_RESUMO && (
        <p className="mt-2 text-xs text-ink-muted">
          Mostrando {NO_RESUMO} de {contas.length} contas.
        </p>
      )}
    </Card>
  );
}
