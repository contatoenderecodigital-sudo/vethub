import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatHora, hojeISO, ROTULO_TIPO } from "@/lib/format";
import { dataParamOuHoje } from "@/lib/validacao";
import type { Usuario } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AlternadorVisao } from "../alternador-visao";
import {
  agruparPorDia,
  type AgendamentoCalendario,
  capitalizar,
  CORES_STATUS,
  deslocarDia,
  DIAS_SEMANA_CURTO,
  diaPorExtenso,
  FiltroVeterinario,
  minutosDoDia,
  SELECT_CALENDARIO,
} from "../calendario";

export const metadata = { title: "Agenda — Semana" };

/** Faixa de horário desenhada na grade (ajuste aqui se a clínica mudar). */
const HORA_INICIO = 7;
const HORA_FIM = 20;
/** Altura de 1 hora, em rem. É a régua de todo o posicionamento. */
const ALTURA_HORA = 4;
/** Duração visual de um compromisso (a tabela não guarda duração). */
const DURACAO_MIN = 30;

const HORAS = Array.from(
  { length: HORA_FIM - HORA_INICIO + 1 },
  (_, i) => HORA_INICIO + i
);
const MINUTOS_NA_GRADE = HORAS.length * 60;

function linkSemana(data: string, vet?: string): string {
  return `/agenda/semana?data=${data}${vet ? `&vet=${vet}` : ""}`;
}

/** "4 a 10 de agosto de 2026" — encurta quando o mês/ano se repete. */
function intervaloPorExtenso(inicio: string, fim: string): string {
  const d1 = new Date(`${inicio}T12:00:00`);
  const d2 = new Date(`${fim}T12:00:00`);
  const mes1 = d1.toLocaleDateString("pt-BR", { month: "long" });
  const mes2 = d2.toLocaleDateString("pt-BR", { month: "long" });
  if (inicio.slice(0, 7) === fim.slice(0, 7)) {
    return `${d1.getDate()} a ${d2.getDate()} de ${mes1} de ${d2.getFullYear()}`;
  }
  if (inicio.slice(0, 4) === fim.slice(0, 4)) {
    return `${d1.getDate()} de ${mes1} a ${d2.getDate()} de ${mes2} de ${d2.getFullYear()}`;
  }
  return `${d1.getDate()} de ${mes1} de ${d1.getFullYear()} a ${d2.getDate()} de ${mes2} de ${d2.getFullYear()}`;
}

/** Hora atual de São Paulo em minutos desde a meia-noite. */
function minutosAgora(): number {
  const hhmm = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default async function AgendaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; vet?: string }>;
}) {
  const { data: dataParam, vet } = await searchParams;
  const data = dataParamOuHoje(dataParam?.trim());
  const { supabase } = await getSessao();

  const hoje = hojeISO();
  // Semana de domingo a sábado, como no Google Agenda.
  const inicio = deslocarDia(data, -new Date(`${data}T12:00:00`).getDay());
  const fim = deslocarDia(inicio, 6);
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => deslocarDia(inicio, i));

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<Pick<Usuario, "id" | "nome">[]>();

  // Um único select da semana inteira — janela em America/Sao_Paulo
  // (offset fixo -03:00), do domingo 00h ao domingo seguinte 00h.
  let query = supabase
    .from("agendamento")
    .select(SELECT_CALENDARIO)
    .gte("data_hora", `${inicio}T00:00:00-03:00`)
    .lt("data_hora", `${deslocarDia(fim, 1)}T00:00:00-03:00`)
    .order("data_hora")
    .limit(1000);

  if (vet) query = query.eq("veterinario_id", vet);

  const { data: agendamentos } = await query.returns<AgendamentoCalendario[]>();
  const lista = agendamentos ?? [];
  const porDia = agruparPorDia(lista);

  const semanaTemHoje = hoje >= inicio && hoje <= fim;
  const agora = minutosAgora();
  const marcadorVisivel =
    semanaTemHoje &&
    agora >= HORA_INICIO * 60 &&
    agora <= (HORA_FIM + 1) * 60;

  /**
   * Posiciona um agendamento na coluna do dia. A régua é fixa
   * (1 hora = ALTURA_HORA rem), então basta converter minutos em rem —
   * mais simples e previsível que porcentagem sobre altura automática.
   * Compromissos fora da faixa desenhada são grudados na borda.
   */
  function posicao(iso: string) {
    const bruto = minutosDoDia(iso) - HORA_INICIO * 60;
    const minutos = Math.min(Math.max(bruto, 0), MINUTOS_NA_GRADE - DURACAO_MIN);
    return {
      top: `${(minutos / 60) * ALTURA_HORA}rem`,
      height: `${(DURACAO_MIN / 60) * ALTURA_HORA}rem`,
    };
  }

  /**
   * Compromissos que caem na MESMA faixa de 30 min dividem a largura da
   * coluna, lado a lado, para nenhum ficar escondido atrás do outro.
   */
  function comFaixas(doDia: AgendamentoCalendario[]) {
    const porFaixa = new Map<number, AgendamentoCalendario[]>();
    for (const a of doDia) {
      const faixa = Math.floor(minutosDoDia(a.data_hora) / DURACAO_MIN);
      const atual = porFaixa.get(faixa);
      if (atual) atual.push(a);
      else porFaixa.set(faixa, [a]);
    }
    return doDia.map((a) => {
      const faixa = Math.floor(minutosDoDia(a.data_hora) / DURACAO_MIN);
      const irmaos = porFaixa.get(faixa) ?? [a];
      return {
        agendamento: a,
        indice: irmaos.indexOf(a),
        total: irmaos.length,
      };
    });
  }

  const diasComAgenda = diasDaSemana
    .map((dia) => ({ dia, itens: porDia.get(dia) ?? [] }))
    .filter((d) => d.itens.length > 0);

  return (
    <div>
      <PageHeader
        titulo="Agenda"
        subtitulo={`${capitalizar(intervaloPorExtenso(inicio, fim))} · ${
          lista.length
        } ${lista.length === 1 ? "agendamento" : "agendamentos"}`}
        acao={
          <ButtonLink
            href={`/agenda/novo?data=${semanaTemHoje ? hoje : inicio}`}
          >
            <Plus className="size-4" />
            Novo agendamento
          </ButtonLink>
        }
      />

      <div className="mb-4">
        <AlternadorVisao
          visao="semana"
          data={semanaTemHoje ? hoje : inicio}
          vet={vet}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ButtonLink
            href={linkSemana(deslocarDia(inicio, -7), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-11 max-sm:min-w-11"
          >
            <ChevronLeft className="size-4" />
            <span className="max-sm:sr-only">Semana anterior</span>
          </ButtonLink>
          <ButtonLink
            href={linkSemana(hoje, vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-11"
          >
            Esta semana
          </ButtonLink>
          <ButtonLink
            href={linkSemana(deslocarDia(inicio, 7), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-11 max-sm:min-w-11"
          >
            <span className="max-sm:sr-only">Próxima semana</span>
            <ChevronRight className="size-4" />
          </ButtonLink>
        </div>

        <FiltroVeterinario
          campos={{ data: inicio }}
          vet={vet}
          veterinarios={veterinarios ?? []}
        />
      </div>

      {/* ---------------- Grade da semana (sm para cima) ---------------- */}
      <div className="glass hidden overflow-hidden rounded-2xl sm:block">
        {/* A grade rola DENTRO do card (nunca empurra a página para os lados) */}
        <div className="overflow-x-auto">
          <div className="min-w-[44rem]">
            {/* Cabeçalho dos dias — fica fora da área que rola na vertical */}
            <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b border-edge">
              <div aria-hidden />
              {diasDaSemana.map((dia, i) => {
                const ehHoje = dia === hoje;
                return (
                  <Link
                    key={dia}
                    href={`/agenda?data=${dia}${vet ? `&vet=${vet}` : ""}`}
                    className="flex flex-col items-center gap-0.5 border-l border-edge py-2 transition-colors hover:bg-white/15"
                  >
                    <span className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                      {DIAS_SEMANA_CURTO[i]}
                    </span>
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                        ehHoje ? "bg-white text-brand-dark" : "text-ink"
                      }`}
                    >
                      {Number(dia.slice(8))}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="max-h-[68vh] overflow-y-auto">
              <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
                {/* Coluna das horas */}
                <div>
                  {HORAS.map((h) => (
                    <div
                      key={h}
                      style={{ height: `${ALTURA_HORA}rem` }}
                      className="relative"
                    >
                      <span className="absolute -top-2 right-1.5 text-[11px] tabular-nums text-ink-muted">
                        {String(h).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Uma coluna por dia, com os blocos posicionados por hora */}
                {diasDaSemana.map((dia) => {
                  const ehHoje = dia === hoje;
                  const doDia = porDia.get(dia) ?? [];
                  return (
                    <div
                      key={dia}
                      className={`relative border-l border-edge ${
                        ehHoje ? "bg-white/10" : ""
                      }`}
                    >
                      {HORAS.map((h) => (
                        <div
                          key={h}
                          style={{ height: `${ALTURA_HORA}rem` }}
                          className="border-b border-white/10"
                        />
                      ))}

                      {ehHoje && marcadorVisivel && (
                        <div
                          aria-hidden
                          style={{
                            top: `${((agora - HORA_INICIO * 60) / 60) * ALTURA_HORA}rem`,
                          }}
                          className="pointer-events-none absolute inset-x-0 z-10 h-px bg-red-400"
                        >
                          <span className="absolute -top-1 -left-1 size-2 rounded-full bg-red-400" />
                        </div>
                      )}

                      {comFaixas(doDia).map(({ agendamento: a, indice, total }) => {
                        const { top, height } = posicao(a.data_hora);
                        return (
                          <Link
                            key={a.id}
                            href={`/agenda?data=${dia}${vet ? `&vet=${vet}` : ""}`}
                            title={`${formatHora(a.data_hora)} · ${a.pet?.nome ?? "Pet"} · ${ROTULO_TIPO[a.tipo]}`}
                            style={{
                              top,
                              height,
                              left: `calc(${(indice / total) * 100}% + 2px)`,
                              width: `calc(${100 / total}% - 4px)`,
                            }}
                            className={`absolute overflow-hidden rounded-md border px-1 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-80 ${CORES_STATUS[a.status]}`}
                          >
                            <span className="block truncate font-semibold">
                              <span className="tabular-nums">
                                {formatHora(a.data_hora)}
                              </span>{" "}
                              {a.pet?.nome ?? "Pet"}
                            </span>
                            <span className="block truncate text-[10px] opacity-90">
                              {ROTULO_TIPO[a.tipo]}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -------- Lista vertical (celular): a grade de 7 colunas não cabe,
           então cada dia com agenda vira um cartão com seus horários. -------- */}
      <div className="sm:hidden">
        {diasComAgenda.length === 0 ? (
          <EmptyState
            icone={<CalendarRange className="size-7" strokeWidth={1.8} />}
            titulo="Semana livre"
            mensagem="Nenhum compromisso marcado nesta semana."
            acao={
              <ButtonLink
                href={`/agenda/novo?data=${semanaTemHoje ? hoje : inicio}`}
              >
                <Plus className="size-4" />
                Novo agendamento
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {diasComAgenda.map(({ dia, itens }) => (
              <div key={dia} className="glass rounded-2xl p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <Link
                    href={`/agenda?data=${dia}`}
                    className={`min-w-0 truncate text-sm font-semibold ${
                      dia === hoje ? "text-white underline" : "text-ink"
                    }`}
                  >
                    {diaPorExtenso(dia)}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {itens.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {itens.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/agenda?data=${dia}`}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium ${CORES_STATUS[a.status]}`}
                      >
                        <span className="shrink-0 tabular-nums">
                          {formatHora(a.data_hora)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {a.pet?.nome ?? "Pet"}
                        </span>
                        <span className="shrink-0 opacity-90">
                          {ROTULO_TIPO[a.tipo]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
