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
import {
  Estatistica,
  GradeEstatisticas,
  type EstatisticaProps,
} from "@/components/ui/estatistica";
import { GraficoBarras } from "@/components/ui/grafico";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeVencimento } from "./badges";
import { limitesDoMes, rotuloMes, ultimosMeses } from "./schema";

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
    mes: rotuloMes(chave),
    recebido: porMes.get(chave)!.receita,
    pago: porMes.get(chave)!.despesa,
  }));
  const temMovimento = barras.some((b) => b.recebido > 0 || b.pago > 0);

  const cards: EstatisticaProps[] = [
    {
      rotulo: "A receber no mês",
      valor: formatBRL(aReceber),
      href: "/financeiro/receber?status=abertas",
      icone: ArrowUpRight,
      tom: "positivo",
    },
    {
      rotulo: "A pagar no mês",
      valor: formatBRL(aPagar),
      href: "/financeiro/pagar?status=abertas",
      icone: ArrowDownRight,
      tom: "atencao",
    },
    {
      rotulo: "Vencidas",
      valor: formatBRL(totalVencido),
      href: "/financeiro/receber?status=vencidas",
      icone: TriangleAlert,
      tom: totalVencido > 0 ? "critico" : "neutro",
      detalhe: `${formatBRL(vencidoReceber)} a receber · ${formatBRL(vencidoPagar)} a pagar`,
    },
    {
      rotulo: "Saldo previsto",
      valor: formatBRL(saldoPrevisto),
      href: "/financeiro/receber",
      icone: Scale,
      tom: saldoPrevisto < 0 ? "critico" : "neutro",
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

      <GradeEstatisticas colunas={4} className="mb-6">
        {cards.map((c) => (
          <Estatistica key={c.rotulo} {...c} />
        ))}
      </GradeEstatisticas>

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
        <CardTitulo>Últimos {MESES_GRAFICO} meses</CardTitulo>

        {temMovimento ? (
          <GraficoBarras
            dados={barras}
            eixoX="mes"
            formato="moeda"
            altura={260}
            empilhado={false}
            series={[
              { chave: "recebido", rotulo: "Recebido", cor: "#6ee7b7" },
              { chave: "pago", rotulo: "Pago", cor: "#fcd34d" },
            ]}
          />
        ) : (
          <p className="text-xs text-ink-muted">Sem dados no período.</p>
        )}

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
