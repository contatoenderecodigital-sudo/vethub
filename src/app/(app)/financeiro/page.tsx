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

/** Teto de linhas lidas por consulta: clínica normal fica bem abaixo disso. */
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

/** Uma entrada/saída de dinheiro de verdade, com a data em que aconteceu. */
interface BaixaDoGrafico {
  valor: number;
  data: string;
  conta: { tipo: ContaTipo } | { tipo: ContaTipo }[] | null;
}

/** Uma dívida nascida no período, paga ou não. */
interface ContaDeCompetencia {
  tipo: ContaTipo;
  valor: number;
  competencia: string;
}

/**
 * Os dois jeitos legítimos de olhar o mesmo dinheiro:
 *
 * - CAIXA: pela data em que o dinheiro entrou ou saiu. Responde "quanto eu
 *   tenho". É o padrão porque é o que a clínica pequena pergunta.
 * - COMPETÊNCIA: pela data em que a dívida nasceu. Responde "quanto eu
 *   vendi". Sem ele, um mês de muita venda fiada parece um mês fraco.
 *
 * Na venda à vista as duas datas são a mesma e os números batem. A diferença
 * aparece no fiado e no parcelado.
 */
type Regime = "caixa" | "competencia";

export default async function PainelFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ regime?: string }>;
}) {
  const { regime: regimeParam } = await searchParams;
  const regime: Regime = regimeParam === "competencia" ? "competencia" : "caixa";
  const { supabase } = await getSessao();

  const hoje = hojeISO();
  const mes = limitesDoMes(hoje);
  const chavesMeses = ultimosMeses(hoje, MESES_GRAFICO);
  const inicioGrafico = `${chavesMeses[0]}-01`;

  const [{ data: abertas }, { data: pagas }] = await Promise.all([
    // TUDO que ainda não foi quitado, sem recortar por vencimento.
    //
    // Antes esta consulta parava no fim do mês corrente, e como todo fiado
    // nasce vencendo em 30 dias, a venda fiada de hoje caía no mês seguinte e
    // sumia do painel: a clínica vendia o dia inteiro e via R$ 0,00. O recorte
    // por data agora é feito depois, por card, e não na origem.
    supabase
      .from("conta")
      .select(
        "id, tipo, descricao, valor, valor_pago, vencimento, status, fornecedor, tutor:tutor_id (nome)"
      )
      .in("status", ["aberta", "parcial"])
      .order("vencimento")
      .limit(LIMITE)
      .returns<ContaAberta[]>(),
    // Movimento dos últimos 6 meses, na leitura escolhida.
    //
    // No regime de caixa a fonte são as BAIXAS, não a conta: quem pagou R$ 40
    // em agosto e R$ 60 em setembro tem duas entradas em meses diferentes, e
    // ler só `conta.pagamento` (a última data) jogaria tudo em setembro.
    regime === "caixa"
      ? supabase
          .from("baixa")
          .select("valor, data, conta:conta_id (tipo)")
          .gte("data", inicioGrafico)
          .limit(LIMITE * 4)
          .returns<BaixaDoGrafico[]>()
      : supabase
          .from("conta")
          .select("tipo, valor, competencia")
          .neq("status", "cancelada")
          .gte("competencia", inicioGrafico)
          .limit(LIMITE * 4)
          .returns<ContaDeCompetencia[]>(),
  ]);

  const contas = abertas ?? [];

  let emAbertoReceber = 0;
  let emAbertoPagar = 0;
  let vencidoReceber = 0;
  let vencidoPagar = 0;
  const vencidas: ContaAberta[] = [];
  const vencendoHoje: ContaAberta[] = [];

  for (const c of contas) {
    const saldo = saldoDaConta(c);

    // O que ainda não entrou/saiu, vença quando vencer. É a resposta para
    // "quanto me devem" — a pergunta que o dono faz olhando o painel.
    if (c.tipo === "receber") emAbertoReceber += saldo;
    else emAbertoPagar += saldo;

    if (c.vencimento < hoje) {
      vencidas.push(c);
      if (c.tipo === "receber") vencidoReceber += saldo;
      else vencidoPagar += saldo;
    } else if (c.vencimento === hoje) {
      vencendoHoje.push(c);
    }
  }

  const totalVencido = vencidoReceber + vencidoPagar;

  // Gráfico: soma o que foi pago em cada mês, separando entrada de saída.
  const porMes = new Map(
    chavesMeses.map((chave) => [chave, { receita: 0, despesa: 0 }])
  );
  for (const linha of pagas ?? []) {
    // A relação vem como objeto ou lista de um item, dependendo do join.
    const relacao = "conta" in linha ? linha.conta : null;
    const tipo =
      "tipo" in linha
        ? linha.tipo
        : (Array.isArray(relacao) ? relacao[0] : relacao)?.tipo;
    const quando = "data" in linha ? linha.data : linha.competencia;
    if (!tipo || !quando) continue;

    const alvo = porMes.get(quando.slice(0, 7));
    if (!alvo) continue;
    const valor = Number(linha.valor);
    if (tipo === "receber") alvo.receita += valor;
    else alvo.despesa += valor;
  }
  const barras = chavesMeses.map((chave) => ({
    mes: rotuloMes(chave),
    recebido: porMes.get(chave)!.receita,
    pago: porMes.get(chave)!.despesa,
  }));
  const temMovimento = barras.some((b) => b.recebido > 0 || b.pago > 0);

  // O movimento do mês corrente sai do mesmo agrupamento do gráfico — no
  // regime que o usuário escolheu —, então os cards e as barras nunca contam
  // histórias diferentes, e não custa nenhuma consulta a mais.
  const doMes = porMes.get(hoje.slice(0, 7)) ?? { receita: 0, despesa: 0 };
  const saldoDoMes = doMes.receita - doMes.despesa;
  const caixa = regime === "caixa";

  const cards: EstatisticaProps[] = [
    {
      rotulo: caixa ? "Recebido no mês" : "Vendido no mês",
      valor: formatBRL(doMes.receita),
      href: "/financeiro/receber",
      icone: ArrowUpRight,
      tom: "positivo",
      detalhe: caixa ? "Pela data da baixa" : "Pela data da venda",
    },
    {
      rotulo: caixa ? "Pago no mês" : "Comprado no mês",
      valor: formatBRL(doMes.despesa),
      href: "/financeiro/pagar",
      icone: ArrowDownRight,
      tom: "atencao",
      detalhe: caixa ? "Pela data da baixa" : "Pela data da despesa",
    },
    {
      rotulo: caixa ? "Saldo do mês" : "Resultado do mês",
      valor: formatBRL(saldoDoMes),
      href: "/financeiro/receber",
      icone: Scale,
      tom: saldoDoMes < 0 ? "critico" : "neutro",
      detalhe: caixa ? "Entrou menos saiu" : "Vendido menos comprado",
    },
    {
      rotulo: "A receber em aberto",
      valor: formatBRL(emAbertoReceber),
      href: "/financeiro/receber?status=abertas",
      icone: TriangleAlert,
      tom: totalVencido > 0 ? "critico" : "neutro",
      detalhe:
        totalVencido > 0
          ? `${formatBRL(vencidoReceber)} já vencido · ${formatBRL(emAbertoPagar)} a pagar`
          : `Nada vencido · ${formatBRL(emAbertoPagar)} a pagar`,
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

      {/* O alternador fica ACIMA dos cards porque agora é ele que decide o
          que eles contam. Escondido lá embaixo no gráfico, o dono trocava de
          regime sem perceber que os números de cima mudavam junto. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AlternadorRegime regime={regime} />
        <p className="text-xs text-ink-muted">
          {regime === "caixa"
            ? "Caixa: o dinheiro que entrou e saiu de verdade, pela data do pagamento."
            : "Competência: o que foi vendido e comprado, pela data do fato, tenha sido pago ou não."}
        </p>
      </div>

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitulo className="mb-0">Últimos {MESES_GRAFICO} meses</CardTitulo>
        </div>

        {temMovimento ? (
          <GraficoBarras
            dados={barras}
            eixoX="mes"
            formato="moeda"
            altura={260}
            empilhado={false}
            series={[
              { chave: "recebido", rotulo: "Recebido", cor: "#10b981" },
              { chave: "pago", rotulo: "Pago", cor: "#f59e0b" },
            ]}
          />
        ) : (
          <p className="text-xs text-ink-muted">Sem dados no período.</p>
        )}

        <p className="mt-3 text-xs text-ink-muted">
          {regime === "caixa"
            ? "Valores efetivamente recebidos e pagos, pela data da baixa."
            : "Valores pela data em que a venda ou a despesa aconteceu, tenha sido paga ou não."}
        </p>
      </Card>
    </div>
  );
}

/**
 * Caixa ou Competência. A mesma pergunta tem duas respostas certas: "quanto
 * entrou" e "quanto vendi" só coincidem quando não há fiado nem parcelado.
 */
function AlternadorRegime({ regime }: { regime: Regime }) {
  return (
    <div
      role="group"
      aria-label="Como contar o movimento"
      className="flex shrink-0 rounded-lg border border-white/30 bg-white/10 p-0.5 text-xs"
    >
      {(
        [
          ["caixa", "Caixa", "pela data em que o dinheiro entrou ou saiu"],
          ["competencia", "Competência", "pela data em que a venda aconteceu"],
        ] as const
      ).map(([valor, rotulo, dica]) => (
        <Link
          key={valor}
          href={valor === "caixa" ? "/financeiro" : `/financeiro?regime=${valor}`}
          title={dica}
          aria-current={regime === valor ? "true" : undefined}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            regime === valor
              ? "bg-white text-brand-dark"
              : "text-ink-muted hover:bg-white/15 hover:text-ink"
          }`}
        >
          {rotulo}
        </Link>
      ))}
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
