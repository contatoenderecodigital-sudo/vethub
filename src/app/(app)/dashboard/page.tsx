import Link from "next/link";
import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  PawPrint,
  Plus,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatHora, hojeISO, ROTULO_TIPO } from "@/lib/format";
import { saldoDaConta, type Agendamento, type Conta } from "@/lib/types";
import { BadgeAgendamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Estatistica,
  GradeEstatisticas,
  type EstatisticaProps,
} from "@/components/ui/estatistica";
import { GraficoArea } from "@/components/ui/grafico";
import { IconeEspecie } from "@/components/icone-especie";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Início" };

/** Dias no gráfico de atendimentos. */
const DIAS_GRAFICO = 7;

/** Soma dias a uma data ISO em UTC, não escorrega no fuso. */
function deslocarDia(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const { supabase, usuario } = await getSessao();

  // Janela de "hoje" no fuso da clínica (America/Sao_Paulo, UTC-3 fixo)
  const hoje = hojeISO();
  const inicio = `${hoje}T00:00:00-03:00`;
  const fim = `${hoje}T23:59:59-03:00`;

  // Janela do gráfico: os 7 dias que terminam hoje, mesmo fuso.
  const inicioSemana = deslocarDia(hoje, -(DIAS_GRAFICO - 1));

  const [
    agendaHoje,
    aguardando,
    internados,
    tutores,
    pets,
    orcamentosAbertos,
    contasAbertas,
    agendaSemana,
  ] = await Promise.all([
      supabase
        .from("agendamento")
        .select(
          "id, data_hora, tipo, status, pet:pet_id (nome, especie, tutor:tutor_id (nome)), veterinario:veterinario_id (nome)",
          { count: "exact" }
        )
        .gte("data_hora", inicio)
        .lte("data_hora", fim)
        .neq("status", "cancelado")
        .order("data_hora")
        .limit(8),
      supabase
        .from("agendamento")
        .select("id", { count: "exact", head: true })
        .gte("data_hora", inicio)
        .lte("data_hora", fim)
        .eq("status", "check_in"),
      supabase
        .from("internacao")
        .select("id", { count: "exact", head: true })
        .eq("status", "internado"),
      supabase.from("tutor").select("id", { count: "exact", head: true }),
      supabase.from("pet").select("id", { count: "exact", head: true }),
      supabase
        .from("orcamento")
        .select("id", { count: "exact", head: true })
        .eq("status", "aberto"),
      // Sem recorte por vencimento: os cards abaixo se chamam "A receber" e
      // "A pagar", e é isso que precisam mostrar. Parando no fim do mês, a
      // venda fiada de hoje (que vence em 30 dias) ficava de fora e o painel
      // dizia R$ 0,00 num dia de R$ 300 vendidos.
      supabase
        .from("conta")
        .select("tipo, valor, valor_pago, vencimento")
        .in("status", ["aberta", "parcial"])
        .limit(500)
        .returns<
          Pick<Conta, "tipo" | "valor" | "valor_pago" | "vencimento">[]
        >(),
      // Só a data/hora dos agendamentos da semana. O resto vem dos contadores.
      // Teto alto de propósito: 7 dias de agenda cabem folgado nele.
      supabase
        .from("agendamento")
        .select("data_hora")
        .gte("data_hora", `${inicioSemana}T00:00:00-03:00`)
        .lte("data_hora", fim)
        .neq("status", "cancelado")
        .limit(1000)
        .returns<{ data_hora: string }[]>(),
    ]);

  let aReceber = 0;
  let aPagar = 0;
  let vencidas = 0;
  for (const c of contasAbertas.data ?? []) {
    const saldo = saldoDaConta(c);
    if (c.tipo === "receber") aReceber += saldo;
    else aPagar += saldo;
    if (c.vencimento < hoje) vencidas += saldo;
  }

  // Série do gráfico: um ponto por dia, mesmo nos dias sem agendamento.
  const diasSemana = Array.from({ length: DIAS_GRAFICO }, (_, i) =>
    deslocarDia(inicioSemana, i)
  );
  const porDia = new Map(diasSemana.map((d) => [d, 0]));
  for (const a of agendaSemana.data ?? []) {
    // O instante vem do banco em UTC: o dia é o da clínica.
    const dia = new Date(a.data_hora).toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    const atual = porDia.get(dia);
    if (atual !== undefined) porDia.set(dia, atual + 1);
  }
  const serieSemana = diasSemana.map((d) => ({
    dia: `${d.slice(8, 10)}/${d.slice(5, 7)}`,
    atendimentos: porDia.get(d) ?? 0,
  }));
  const temSerieSemana = serieSemana.some((p) => p.atendimentos > 0);

  const primeiroNome = usuario.nome.split(" ")[0];

  const tiles: EstatisticaProps[] = [
    {
      rotulo: "Agendamentos hoje",
      valor: agendaHoje.count ?? 0,
      href: "/agenda",
      icone: CalendarDays,
    },
    {
      rotulo: "Aguardando atendimento",
      valor: aguardando.count ?? 0,
      href: "/agenda",
      icone: Clock,
      tom: "atencao",
    },
    {
      rotulo: "Internados",
      valor: internados.count ?? 0,
      href: "/internacao",
      icone: BedDouble,
    },
    { rotulo: "Tutores", valor: tutores.count ?? 0, href: "/tutores", icone: Users },
    { rotulo: "Pets", valor: pets.count ?? 0, href: "/pets", icone: PawPrint },
    {
      rotulo: "Orçamentos abertos",
      valor: orcamentosAbertos.count ?? 0,
      href: "/orcamentos?status=aberto",
      icone: FileText,
    },
  ];

  const financeiro: EstatisticaProps[] = [
    {
      rotulo: "A receber",
      valor: formatBRL(aReceber),
      icone: TrendingUp,
      tom: "positivo",
      href: "/financeiro/receber?status=abertas",
    },
    {
      rotulo: "A pagar",
      valor: formatBRL(aPagar),
      icone: TrendingDown,
      tom: "atencao",
      href: "/financeiro/pagar?status=abertas",
    },
    {
      rotulo: "Vencidas",
      valor: formatBRL(vencidas),
      icone: TriangleAlert,
      tom: vencidas > 0 ? "critico" : "neutro",
      href: "/financeiro/receber?status=vencidas",
    },
  ];

  return (
    <div>
      <PageHeader
        titulo={`Olá, ${primeiroNome}!`}
        subtitulo="Aqui está o dia da clínica."
        acao={
          <>
            <ButtonLink href="/agenda/novo" variante="secondary">
              <Plus className="size-4" />
              Agendamento
            </ButtonLink>
            <ButtonLink href="/tutores/novo">
              <Plus className="size-4" />
              Tutor
            </ButtonLink>
          </>
        }
      />

      {/* Indicadores */}
      <GradeEstatisticas colunas={6} className="mb-6">
        {tiles.map((t) => (
          <Estatistica key={t.rotulo} {...t} />
        ))}
      </GradeEstatisticas>

      {/* Financeiro: o que está em aberto, não o que vence neste mês -
          senão o fiado de hoje, que vence em 30 dias, não aparece. */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Wallet className="size-4" strokeWidth={1.8} aria-hidden />
            Financeiro em aberto
          </h2>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm font-medium link-vidro"
          >
            Ver painel financeiro
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <GradeEstatisticas colunas={3}>
          {financeiro.map((c) => (
            <Estatistica key={c.rotulo} {...c} />
          ))}
        </GradeEstatisticas>
      </div>

      {/* Movimento da semana */}
      <Card className="mb-6">
        <CardTitulo>Atendimentos dos últimos {DIAS_GRAFICO} dias</CardTitulo>
        {temSerieSemana ? (
          <GraficoArea
            dados={serieSemana}
            eixoX="dia"
            altura={220}
            series={[{ chave: "atendimentos", rotulo: "Atendimentos" }]}
          />
        ) : (
          <p className="text-xs text-ink-muted">Sem dados no período.</p>
        )}
      </Card>

      {/* Agenda de hoje */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitulo className="mb-0">Agenda de hoje</CardTitulo>
          <Link
            href="/agenda"
            className="inline-flex items-center gap-1 text-sm font-medium link-vidro"
          >
            Ver agenda completa
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {!agendaHoje.data || agendaHoje.data.length === 0 ? (
          <EmptyState
            icone={<CalendarDays className="size-7" strokeWidth={1.8} />}
            titulo="Dia livre por enquanto"
            mensagem="Nenhum agendamento para hoje. Que tal aproveitar para colocar os cadastros em dia?"
            acao={
              <ButtonLink href="/agenda/novo">
                <Plus className="size-4" />
                Novo agendamento
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-white/15">
            {(agendaHoje.data as unknown as Agendamento[]).map((a) => (
              <li key={a.id}>
                <Link
                  href="/agenda"
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/15"
                >
                  <span className="w-12 shrink-0 text-sm font-bold text-white tabular-nums">
                    {formatHora(a.data_hora)}
                  </span>
                  <IconeEspecie especie={a.pet?.especie} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {a.pet?.nome ?? "-"}
                      <span className="font-normal text-ink-muted">
                        {" "}
                        · {ROTULO_TIPO[a.tipo]}
                      </span>
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {a.pet?.tutor?.nome ?? ""}
                      {a.veterinario?.nome ? ` · ${a.veterinario.nome}` : ""}
                    </p>
                  </div>
                  <BadgeAgendamento status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
