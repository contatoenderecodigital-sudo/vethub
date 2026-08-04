import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  PawPrint,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatHora, hojeISO, ROTULO_TIPO } from "@/lib/format";
import type { Agendamento } from "@/lib/types";
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

  const [agendaHoje, aguardando, tutores, pets, orcamentosAbertos] =
    await Promise.all([
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
      supabase.from("tutor").select("id", { count: "exact", head: true }),
      supabase.from("pet").select("id", { count: "exact", head: true }),
      supabase
        .from("orcamento")
        .select("id", { count: "exact", head: true })
        .eq("status", "aberto"),
    ]);

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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link
            key={t.rotulo}
            href={t.href}
            className="glass group rounded-2xl p-4 transition-all hover:shadow-lg hover:shadow-brand/10"
          >
            <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand-dark">
              <t.icone className="size-[18px]" strokeWidth={1.8} />
            </span>
            <p className="text-2xl font-bold text-ink">{t.valor}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{t.rotulo}</p>
          </Link>
        ))}
      </div>

      {/* Agenda de hoje */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitulo className="mb-0">Agenda de hoje</CardTitulo>
          <Link
            href="/agenda"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
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
          <ul className="divide-y divide-zinc-200/60">
            {(agendaHoje.data as unknown as Agendamento[]).map((a) => (
              <li key={a.id}>
                <Link
                  href="/agenda"
                  className="flex items-center gap-3 py-2.5 transition-colors hover:bg-brand-mint/10"
                >
                  <span className="w-12 shrink-0 text-sm font-bold text-brand-dark tabular-nums">
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
