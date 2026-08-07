import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatHora, hojeISO, ROTULO_TIPO } from "@/lib/format";
import type { Usuario } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { NavegadorData } from "@/components/ui/navegador-data";
import { EmptyState } from "@/components/ui/empty-state";
import { AlternadorVisao } from "../alternador-visao";
import {
  agruparPorDia,
  type AgendamentoCalendario,
  capitalizar,
  CORES_STATUS,
  deslocarDia,
  deslocarMes,
  DIAS_SEMANA_CURTO,
  diaPorExtenso,
  FiltroVeterinario,
  mesDeHoje,
  mesParamOuAtual,
  SELECT_CALENDARIO,
} from "../calendario";

export const metadata = { title: "Agenda · Mês" };

/** Quantos compromissos cabem numa célula antes do "+N mais". */
const MAX_POR_CELULA = 3;


export default async function AgendaMesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vet?: string }>;
}) {
  const { mes: mesParam, vet } = await searchParams;
  // Param inválido na URL → cai no mês atual (a página nunca quebra).
  const mes = mesParamOuAtual(mesParam?.trim());
  const { supabase } = await getSessao();

  const hoje = hojeISO();
  const primeiroDia = `${mes}-01`;
  const primeiroDoProximo = `${deslocarMes(mes, 1)}-01`;
  // Dia de referência para as outras visões: hoje quando o mês na tela é o
  // corrente, senão o dia 1 do mês exibido.
  const dataReferencia = mes === mesDeHoje() ? hoje : primeiroDia;

  const mesExtenso = capitalizar(
    new Date(`${primeiroDia}T12:00:00`).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })
  );

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<Pick<Usuario, "id" | "nome">[]>();

  // Um único select cobrindo o mês inteiro (janela em America/Sao_Paulo,
  // offset fixo -03:00). O teto de 1000 linhas segura um mês cheio de uma
  // clínica grande sem risco de estourar a resposta.
  let query = supabase
    .from("agendamento")
    .select(SELECT_CALENDARIO)
    .gte("data_hora", `${primeiroDia}T00:00:00-03:00`)
    .lt("data_hora", `${primeiroDoProximo}T00:00:00-03:00`)
    .order("data_hora")
    .limit(1000);

  if (vet) query = query.eq("veterinario_id", vet);

  const { data: agendamentos } = await query.returns<AgendamentoCalendario[]>();
  const porDia = agruparPorDia(agendamentos ?? []);

  // Grade: começa no domingo da semana do dia 1 e termina no sábado da
  // semana do último dia. Os dias vizinhos entram só para fechar as
  // semanas. Como a consulta é do mês, eles aparecem sempre vazios.
  const diaDaSemanaDoPrimeiro = new Date(`${primeiroDia}T12:00:00`).getDay();
  const inicioGrade = deslocarDia(primeiroDia, -diaDaSemanaDoPrimeiro);
  const ultimoDia = deslocarDia(primeiroDoProximo, -1);
  const diaDaSemanaDoUltimo = new Date(`${ultimoDia}T12:00:00`).getDay();
  const totalCelulas =
    diaDaSemanaDoPrimeiro + Number(ultimoDia.slice(8)) + (6 - diaDaSemanaDoUltimo);

  const celulas = Array.from({ length: totalCelulas }, (_, i) => {
    const data = deslocarDia(inicioGrade, i);
    return {
      data,
      doMes: data.slice(0, 7) === mes,
      fimDeSemana: i % 7 === 0 || i % 7 === 6,
      itens: porDia.get(data) ?? [],
    };
  });

  const diasComAgenda = celulas.filter((c) => c.itens.length > 0);
  const totalAgendamentos = agendamentos?.length ?? 0;

  return (
    <div>
      <PageHeader
        titulo="Agenda"
        subtitulo={`${mesExtenso} · ${totalAgendamentos} ${
          totalAgendamentos === 1 ? "agendamento" : "agendamentos"
        }`}
        acao={
          <ButtonLink href={`/agenda/novo?data=${dataReferencia}`}>
            <Plus className="size-4" />
            Novo agendamento
          </ButtonLink>
        }
      />

      <div className="mb-4">
        <AlternadorVisao visao="mes" data={dataReferencia} vet={vet} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <NavegadorData
          data={dataReferencia}
          hoje={hoje}
          rota="/agenda/mes"
          vet={vet}
          passo="mes"
          rotulo="Escolher o mês"
        />

        <FiltroVeterinario
          campos={{ mes }}
          vet={vet}
          veterinarios={veterinarios ?? []}
        />
      </div>

      {/* ---------------- Grade do mês (sm para cima) ---------------- */}
      <div className="glass hidden rounded-2xl p-2 sm:block">
        <div className="grid grid-cols-7 gap-1">
          {DIAS_SEMANA_CURTO.map((dia) => (
            <div
              key={dia}
              className="pb-1 text-center text-[11px] font-semibold tracking-wide text-ink-muted uppercase"
            >
              {dia}
            </div>
          ))}

          {celulas.map((celula) => {
            const ehHoje = celula.data === hoje;
            const visiveis = celula.itens.slice(0, MAX_POR_CELULA);
            const restantes = celula.itens.length - visiveis.length;

            return (
              <div
                key={celula.data}
                className={`relative min-h-28 rounded-xl border border-edge p-1 transition-colors lg:min-h-32 ${
                  celula.fimDeSemana ? "bg-white/8" : "bg-white/4"
                } ${celula.doMes ? "" : "opacity-50"} hover:bg-white/15`}
              >
                {/* Camada de fundo clicável: célula vazia abre o formulário
                    do dia. Fica atrás do conteúdo para não aninhar links. */}
                <Link
                  href={`/agenda/novo?data=${celula.data}`}
                  aria-label={`Novo agendamento em ${diaPorExtenso(celula.data)}`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                />

                <div className="pointer-events-none relative flex h-full flex-col gap-1">
                  <span
                    className={`inline-flex size-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-semibold tabular-nums ${
                      ehHoje ? "ring-2 ring-white text-white" : "text-ink"
                    }`}
                  >
                    {Number(celula.data.slice(8))}
                  </span>

                  <div className="flex min-h-0 flex-col gap-0.5">
                    {visiveis.map((a) => (
                      <Link
                        key={a.id}
                        href={`/agenda?data=${celula.data}`}
                        title={`${formatHora(a.data_hora)} · ${a.pet?.nome ?? "Pet"} · ${ROTULO_TIPO[a.tipo]}`}
                        className={`pointer-events-auto truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-tight font-medium transition-opacity hover:opacity-80 ${CORES_STATUS[a.status]}`}
                      >
                        <span className="tabular-nums">
                          {formatHora(a.data_hora)}
                        </span>{" "}
                        {a.pet?.nome ?? "Pet"}
                      </Link>
                    ))}

                    {restantes > 0 && (
                      <Link
                        href={`/agenda?data=${celula.data}`}
                        className="pointer-events-auto px-1.5 text-[11px] font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                      >
                        +{restantes} mais
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------- Lista vertical (celular): a grade de 7 colunas fica
           ilegível abaixo de sm, então vira lista dos dias com agenda. -------- */}
      <div className="sm:hidden">
        {diasComAgenda.length === 0 ? (
          <EmptyState
            icone={<CalendarDays className="size-7" strokeWidth={1.8} />}
            titulo="Mês sem agendamentos"
            mensagem="Nenhum compromisso marcado neste mês."
            acao={
              <ButtonLink href={`/agenda/novo?data=${dataReferencia}`}>
                <Plus className="size-4" />
                Novo agendamento
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {diasComAgenda.map((dia) => (
              <div key={dia.data} className="glass rounded-2xl p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <Link
                    href={`/agenda?data=${dia.data}`}
                    className={`min-w-0 truncate text-sm font-semibold ${
                      dia.data === hoje ? "text-white underline" : "text-ink"
                    }`}
                  >
                    {diaPorExtenso(dia.data)}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {dia.itens.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {dia.itens.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/agenda?data=${dia.data}`}
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
