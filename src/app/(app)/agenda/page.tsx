import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Plus,
  SlidersHorizontal,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatHora, formatTelefone, hojeISO, ROTULO_TIPO } from "@/lib/format";
import { dataParamOuHoje } from "@/lib/validacao";
import type {
  AgendamentoStatus,
  AgendamentoTipo,
  Usuario,
} from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, BadgeAgendamento } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/form";
import { IconeEspecie } from "@/components/icone-especie";
import { atualizarStatus } from "./actions";

export const metadata = { title: "Agenda" };

/** Linha do dia com os joins usados pela listagem. */
interface AgendamentoDoDia {
  id: string;
  pet_id: string;
  data_hora: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  observacoes: string | null;
  pet: {
    nome: string;
    especie: string;
    tutor: { nome: string; telefone: string } | null;
  } | null;
  veterinario: { nome: string } | null;
}

/**
 * Soma dias a uma data YYYY-MM-DD. Constrói o Date com T12:00:00 (meio-dia
 * local) para que o fuso do servidor nunca faça a data "virar" para o dia
 * anterior/seguinte.
 */
function deslocarDia(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

function linkDia(data: string, vet?: string): string {
  return `/agenda?data=${data}${vet ? `&vet=${vet}` : ""}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; vet?: string; erro?: string }>;
}) {
  const { data: dataParam, vet, erro } = await searchParams;
  // Param de data inválido na URL → cai para hoje (nunca quebra a página)
  const data = dataParamOuHoje(dataParam?.trim());
  const { supabase } = await getSessao();

  // Data por extenso — T12:00:00 evita bug de fuso na virada do dia.
  const dataExtenso = new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<Pick<Usuario, "id" | "nome">[]>();

  // Janela do dia em America/Sao_Paulo — offset fixo -03:00 (sem horário
  // de verão), para a comparação de timestamps bater com o dia local.
  let query = supabase
    .from("agendamento")
    .select(
      "id, pet_id, data_hora, tipo, status, observacoes, " +
        "pet:pet_id (nome, especie, tutor:tutor_id (nome, telefone)), " +
        "veterinario:veterinario_id (nome)"
    )
    .gte("data_hora", `${data}T00:00:00-03:00`)
    .lt("data_hora", `${deslocarDia(data, 1)}T00:00:00-03:00`)
    .order("data_hora");

  if (vet) query = query.eq("veterinario_id", vet);

  const { data: agendamentos } = await query.returns<AgendamentoDoDia[]>();

  return (
    <div>
      <PageHeader
        titulo="Agenda"
        subtitulo={dataExtenso}
        acao={
          <ButtonLink href={`/agenda/novo?data=${data}`}>
            <Plus className="size-4" />
            Novo agendamento
          </ButtonLink>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-danger/25 bg-white/80 px-3 py-2 text-sm font-medium text-danger backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ButtonLink
            href={linkDia(deslocarDia(data, -1), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-10 max-sm:min-w-10"
          >
            <ChevronLeft className="size-4" />
            <span className="max-sm:sr-only">Anterior</span>
          </ButtonLink>
          <ButtonLink
            href={linkDia(hojeISO(), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-10"
          >
            Hoje
          </ButtonLink>
          <ButtonLink
            href={linkDia(deslocarDia(data, 1), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-10 max-sm:min-w-10"
          >
            <span className="max-sm:sr-only">Próximo</span>
            <ChevronRight className="size-4" />
          </ButtonLink>
        </div>

        <form method="get" className="flex min-w-0 flex-wrap items-center gap-2">
          <input type="hidden" name="data" value={data} />
          <Select
            name="vet"
            defaultValue={vet ?? ""}
            aria-label="Filtrar por veterinário"
            className="h-8 w-auto min-w-0 max-w-56 text-sm max-sm:min-h-10"
          >
            <option value="">Todos os veterinários</option>
            {(veterinarios ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </Select>
          <Button
            type="submit"
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-10"
          >
            <SlidersHorizontal className="size-4" />
            Filtrar
          </Button>
        </form>
      </div>

      {!agendamentos || agendamentos.length === 0 ? (
        <EmptyState
          icone={<CalendarDays className="size-7" strokeWidth={1.8} />}
          titulo="Dia livre"
          mensagem="Nenhum agendamento para este dia. Que tal aproveitar para colocar a agenda em dia?"
          acao={
            <ButtonLink href={`/agenda/novo?data=${data}`}>
              <Plus className="size-4" />
              Novo agendamento
            </ButtonLink>
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-zinc-200/60">
            {agendamentos.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-brand-mint/10"
              >
                <span className="w-14 shrink-0 text-lg font-bold tabular-nums text-brand-dark">
                  {formatHora(a.data_hora)}
                </span>

                <IconeEspecie especie={a.pet?.especie} tamanho="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {a.pet?.nome ?? "Pet"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <User className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                      <span className="truncate">
                        {a.pet?.tutor
                          ? `${a.pet.tutor.nome} · ${formatTelefone(a.pet.tutor.telefone)}`
                          : "—"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                      {a.veterinario?.nome ?? "Sem veterinário"}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{ROTULO_TIPO[a.tipo]}</Badge>
                  <BadgeAgendamento status={a.status} />
                </div>

                {a.status === "agendado" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={atualizarStatus.bind(null, a.id, "check_in", data)}>
                      <Button tamanho="sm" className="max-sm:min-h-10">
                        <LogIn className="size-4" />
                        Check-in
                      </Button>
                    </form>
                    <form action={atualizarStatus.bind(null, a.id, "cancelado", data)}>
                      <ConfirmButton
                        variante="ghost"
                        tamanho="sm"
                        mensagem="Cancelar este agendamento?"
                        className="max-sm:min-h-10"
                      >
                        <X className="size-4" />
                        Cancelar
                      </ConfirmButton>
                    </form>
                  </div>
                )}

                {a.status === "check_in" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <ButtonLink
                      href={`/consultas/nova?agendamento=${a.id}&pet=${a.pet_id}`}
                      tamanho="sm"
                      className="max-sm:min-h-10"
                    >
                      <Stethoscope className="size-4" />
                      Iniciar atendimento
                    </ButtonLink>
                    <form action={atualizarStatus.bind(null, a.id, "atendido", data)}>
                      <Button variante="secondary" tamanho="sm" className="max-sm:min-h-10">
                        <Check className="size-4" />
                        Marcar atendido
                      </Button>
                    </form>
                  </div>
                )}

                {a.status === "atendido" && (
                  <form action={atualizarStatus.bind(null, a.id, "check_out", data)}>
                    <Button tamanho="sm" className="max-sm:min-h-10">
                      <LogOut className="size-4" />
                      Check-out
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
