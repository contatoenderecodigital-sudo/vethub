import Link from "next/link";
import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  PawPrint,
  Plus,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatHora, hojeISO, ROTULO_TIPO } from "@/lib/format";
import { saldoDaConta, type Agendamento, type Conta } from "@/lib/types";
import { limitesDoMes } from "../financeiro/schema";
import { BadgeAgendamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconeEspecie } from "@/components/icone-especie";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Início" };

export default async function DashboardPage() {
  const { supabase, usuario } = await getSessao();

  // Janela de "hoje" no fuso da clínica (America/Sao_Paulo, UTC-3 fixo)
  const hoje = hojeISO();
  const inicio = `${hoje}T00:00:00-03:00`;
  const fim = `${hoje}T23:59:59-03:00`;

  // Contas ainda em aberto até o fim do mês: alimentam o card do financeiro.
  const mes = limitesDoMes(hoje);

  const [
    agendaHoje,
    aguardando,
    internados,
    tutores,
    pets,
    orcamentosAbertos,
    contasAbertas,
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
      supabase
        .from("conta")
        .select("tipo, valor, valor_pago, vencimento")
        .in("status", ["aberta", "parcial"])
        .lte("vencimento", mes.fim)
        .limit(500)
        .returns<
          Pick<Conta, "tipo" | "valor" | "valor_pago" | "vencimento">[]
        >(),
    ]);

  let aReceber = 0;
  let aPagar = 0;
  let vencidas = 0;
  for (const c of contasAbertas.data ?? []) {
    const saldo = saldoDaConta(c);
    if (c.vencimento >= mes.inicio) {
      if (c.tipo === "receber") aReceber += saldo;
      else aPagar += saldo;
    }
    if (c.vencimento < hoje) vencidas += saldo;
  }

  const primeiroNome = usuario.nome.split(" ")[0];

  const tiles: {
    rotulo: string;
    valor: number;
    href: string;
    icone: LucideIcon;
  }[] = [
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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Link
            key={t.rotulo}
            href={t.href}
            className="glass group flex flex-col items-center rounded-2xl p-4 text-center transition-all hover:bg-white/20 hover:shadow-lg hover:shadow-black/10"
          >
            <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-white/20 text-white">
              <t.icone className="size-5" strokeWidth={1.8} />
            </span>
            <p className="text-2xl font-bold text-ink tabular-nums">{t.valor}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{t.rotulo}</p>
          </Link>
        ))}
      </div>

      {/* Financeiro do mês */}
      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <CardTitulo className="mb-0 flex items-center gap-2">
            <Wallet className="size-4" strokeWidth={1.8} aria-hidden />
            Financeiro do mês
          </CardTitulo>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-mint hover:underline"
          >
            Ver painel financeiro
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-edge bg-white/10 p-4">
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              A receber
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-50 tabular-nums">
              {formatBRL(aReceber)}
            </p>
          </div>
          <div className="rounded-xl border border-edge bg-white/10 p-4">
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              A pagar
            </p>
            <p className="mt-1 text-xl font-semibold text-amber-50 tabular-nums">
              {formatBRL(aPagar)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${
              vencidas > 0
                ? "border-red-200/40 bg-red-400/20"
                : "border-edge bg-white/10"
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
              <TriangleAlert className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
              Vencidas
            </p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${
                vencidas > 0 ? "text-red-50" : "text-ink"
              }`}
            >
              {formatBRL(vencidas)}
            </p>
          </div>
        </div>
      </Card>

      {/* Agenda de hoje */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitulo className="mb-0">Agenda de hoje</CardTitulo>
          <Link
            href="/agenda"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-mint hover:underline"
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
                      {a.pet?.nome ?? "—"}
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
