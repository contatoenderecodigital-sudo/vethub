import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlarmClock,
  BedDouble,
  CalendarClock,
  Check,
  ClipboardCheck,
  HeartPulse,
  LogOut,
  NotebookPen,
  Pencil,
  Pill,
  Stethoscope,
  Thermometer,
  Trash2,
  Undo2,
  User,
  Wind,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora, formatHora, hojeISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { IconeEspecie } from "@/components/icone-especie";
import {
  desfazerAplicacao,
  encerrarInternacao,
  excluirPrescricao,
  criarPrescricao,
  marcarAplicado,
  registrarEvolucao,
} from "../actions";
import {
  estaAtrasada,
  horaCurta,
  ROTULO_STATUS_INTERNACAO,
  rotuloDiasInternado,
  type AdministracaoLinha,
  type EvolucaoLinha,
  type InternacaoDetalhe,
  type InternacaoStatus,
  type PrescricaoLinha,
} from "../tipos";
import { EvolucaoForm } from "./evolucao-form";
import { PrescricaoForm } from "./prescricao-form";

export const metadata = { title: "Paciente internado" };

const TOM_STATUS: Record<InternacaoStatus, "info" | "success" | "danger"> = {
  internado: "info",
  alta: "success",
  obito: "danger",
};

/** Item da linha de dados do cabeçalho (ícone + rótulo acessível + valor). */
function Info({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof BedDouble;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icone className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} aria-hidden />
      <span className="sr-only">{rotulo}</span>
      <span className="min-w-0 truncate text-ink">{children}</span>
    </div>
  );
}

export default async function PacienteInternadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: internacao } = await supabase
    .from("internacao")
    .select(
      "*, pet:pet_id (id, nome, especie, foto_url, tutor:tutor_id (id, nome)), veterinario:veterinario_id (id, nome)"
    )
    .eq("id", id)
    .single<InternacaoDetalhe>();

  if (!internacao) notFound();

  // Janela de "hoje" no fuso da clínica (America/Sao_Paulo, UTC-3 fixo)
  const hoje = hojeISO();

  const [{ data: prescricoes }, { data: administracoes }, { data: evolucoes }] =
    await Promise.all([
      supabase
        .from("prescricao")
        .select(
          "id, medicamento, dose, via, frequencia_horas, horarios, inicio, fim, observacao, created_at, prescritor:prescrito_por (nome)"
        )
        .eq("internacao_id", id)
        .order("created_at")
        .returns<PrescricaoLinha[]>(),
      supabase
        .from("administracao_medicamento")
        .select(
          "id, horario_previsto, horario_realizado, status, observacao, prescricao:prescricao_id!inner (id, medicamento, dose, via), responsavel:responsavel_id (nome)"
        )
        .eq("prescricao.internacao_id", id)
        .gte("horario_previsto", `${hoje}T00:00:00-03:00`)
        .lte("horario_previsto", `${hoje}T23:59:59-03:00`)
        .order("horario_previsto")
        .returns<AdministracaoLinha[]>(),
      supabase
        .from("evolucao")
        .select(
          "id, data_hora, texto, temperatura, frequencia_cardiaca, frequencia_respiratoria, responsavel:responsavel_id (nome)"
        )
        .eq("internacao_id", id)
        .order("data_hora", { ascending: false })
        .limit(50)
        .returns<EvolucaoLinha[]>(),
    ]);

  const pet = internacao.pet;
  const ativa = internacao.status === "internado";
  // Recepção acompanha o quadro, mas não prescreve nem evolui o paciente.
  const podeClinicar = usuario.papel !== "recepcao";

  const pendentes = (administracoes ?? []).filter(
    (a) => a.status !== "aplicado" && a.status !== "suspenso"
  );

  return (
    <div>
      <PageHeader
        titulo={pet?.nome ?? "Paciente"}
        subtitulo={`${pet?.especie ?? "—"}${internacao.box ? ` · ${internacao.box}` : ""} · Internado há ${rotuloDiasInternado(
          internacao.data_entrada,
          internacao.data_saida
        )}`}
        acao={
          <>
            <ButtonLink href={`/internacao/${id}/editar`} variante="secondary">
              <Pencil className="size-4" />
              Editar
            </ButtonLink>
            {ativa && (
              <>
                <form action={encerrarInternacao.bind(null, id, "obito")}>
                  <ConfirmButton
                    variante="danger"
                    mensagem="Registrar o óbito deste paciente e encerrar a internação?"
                  >
                    <Trash2 className="size-4" />
                    Óbito
                  </ConfirmButton>
                </form>
                <form action={encerrarInternacao.bind(null, id, "alta")}>
                  <ConfirmButton mensagem="Dar alta encerra a internação e suspende as medicações pendentes. Confirmar?">
                    <LogOut className="size-4" />
                    Dar alta
                  </ConfirmButton>
                </form>
              </>
            )}
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------------- Cabeçalho do paciente ---------------- */}
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {pet?.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.foto_url}
                  alt={pet.nome}
                  className="size-12 shrink-0 rounded-full bg-white/20 object-cover"
                />
              ) : (
                <IconeEspecie especie={pet?.especie} tamanho="lg" />
              )}
              <div className="min-w-0">
                {pet ? (
                  <Link
                    href={`/pets/${pet.id}`}
                    className="block truncate text-lg font-semibold text-brand-mint hover:underline"
                  >
                    {pet.nome}
                  </Link>
                ) : (
                  <p className="text-lg font-semibold text-ink">Pet removido</p>
                )}
                <p className="truncate text-xs text-ink-muted">{pet?.especie ?? "—"}</p>
              </div>
            </div>

            <div className="grid flex-1 gap-1.5 sm:grid-cols-2">
              <Info icone={BedDouble} rotulo="Box">
                {internacao.box ?? "Sem box definido"}
              </Info>
              <Info icone={User} rotulo="Tutor">
                {pet?.tutor ? (
                  <Link
                    href={`/tutores/${pet.tutor.id}`}
                    className="text-brand-mint hover:underline"
                  >
                    {pet.tutor.nome}
                  </Link>
                ) : (
                  "—"
                )}
              </Info>
              <Info icone={Stethoscope} rotulo="Veterinário">
                {internacao.veterinario?.nome ?? "Sem veterinário"}
              </Info>
              <Info icone={CalendarClock} rotulo="Entrada">
                {formatDataHora(internacao.data_entrada)}
              </Info>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tom={TOM_STATUS[internacao.status]}>
                {ROTULO_STATUS_INTERNACAO[internacao.status]}
              </Badge>
              {internacao.data_saida && (
                <span className="text-xs text-ink-muted">
                  Saída: {formatDataHora(internacao.data_saida)}
                </span>
              )}
            </div>
          </div>

          <dl className="mt-4 grid gap-3 border-t border-white/20 pt-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">Motivo</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-ink">{internacao.motivo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Diagnóstico
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-ink">
                {internacao.diagnostico?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Observações
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-ink">
                {internacao.observacoes?.trim() || "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {/* ---------------- Checklist de medicação ---------------- */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <CardTitulo className="mb-0">Checklist de medicação — hoje</CardTitulo>
            <span className="text-xs text-ink-muted tabular-nums">
              {pendentes.length} pendente{pendentes.length === 1 ? "" : "s"} de{" "}
              {(administracoes ?? []).length}
            </span>
          </div>

          {!administracoes || administracoes.length === 0 ? (
            <EmptyState
              icone={<ClipboardCheck className="size-7" strokeWidth={1.8} />}
              titulo="Nada para aplicar hoje"
              mensagem="Crie uma prescrição com horários para o checklist do dia aparecer aqui."
            />
          ) : (
            <ul className="space-y-2">
              {administracoes.map((a) => {
                const aplicado = a.status === "aplicado";
                const suspenso = a.status === "suspenso";
                // Pendente cuja hora já passou: destaque âmbar no checklist.
                const atrasado = estaAtrasada(a.horario_previsto, a.status);

                return (
                  <li
                    key={a.id}
                    className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      aplicado
                        ? "border-white/15 bg-white/5 opacity-70"
                        : atrasado
                          ? "border-amber-200/60 bg-amber-300/20"
                          : "border-white/25 bg-white/10"
                    }`}
                  >
                    <span
                      className={`w-14 shrink-0 text-lg font-bold tabular-nums ${
                        atrasado ? "text-amber-50" : "text-ink"
                      }`}
                    >
                      {formatHora(a.horario_previsto)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium text-ink ${
                          aplicado ? "line-through" : ""
                        }`}
                      >
                        {a.prescricao?.medicamento ?? "—"}
                        <span className="font-normal text-ink-muted">
                          {a.prescricao?.dose ? ` · ${a.prescricao.dose}` : ""}
                          {a.prescricao?.via ? ` · ${a.prescricao.via}` : ""}
                        </span>
                      </p>
                      {aplicado ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-50">
                          <Check className="size-3.5 shrink-0" aria-hidden />
                          Aplicado às {formatHora(a.horario_realizado)}
                          {a.responsavel?.nome ? ` por ${a.responsavel.nome}` : ""}
                        </p>
                      ) : atrasado ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-50">
                          <AlarmClock className="size-3.5 shrink-0" aria-hidden />
                          Atrasado
                        </p>
                      ) : suspenso ? (
                        <p className="mt-0.5 text-xs text-ink-muted">Suspenso</p>
                      ) : null}
                    </div>

                    {aplicado ? (
                      <form action={desfazerAplicacao.bind(null, a.id, id)}>
                        <SubmitButton
                          variante="ghost"
                          tamanho="sm"
                          carregando="…"
                          aria-label="Desfazer aplicação"
                        >
                          <Undo2 className="size-4" />
                          Desfazer
                        </SubmitButton>
                      </form>
                    ) : (
                      !suspenso && (
                        <form action={marcarAplicado.bind(null, a.id, id)}>
                          <SubmitButton tamanho="sm" carregando="Aplicando…">
                            <Check className="size-4" />
                            Aplicar
                          </SubmitButton>
                        </form>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ---------------- Prescrições ---------------- */}
        <Card className="lg:col-span-1">
          <CardTitulo>Prescrições</CardTitulo>

          {podeClinicar && ativa && (
            <PrescricaoForm action={criarPrescricao.bind(null, id)} />
          )}

          {!prescricoes || prescricoes.length === 0 ? (
            <EmptyState
              icone={<Pill className="size-7" strokeWidth={1.8} />}
              titulo="Nenhuma prescrição"
              mensagem="As medicações prescritas para esta internação aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-white/15">
              {prescricoes.map((p) => (
                <li key={p.id} className="flex items-start gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.medicamento}
                      <span className="font-normal text-ink-muted"> · {p.dose}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {[
                        p.via,
                        p.frequencia_horas ? `a cada ${p.frequencia_horas} h` : null,
                        p.horarios && p.horarios.length > 0
                          ? p.horarios.map(horaCurta).join(", ")
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sem horários definidos"}
                    </p>
                    {p.observacao && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">
                        {p.observacao}
                      </p>
                    )}
                  </div>
                  {podeClinicar && (
                    <form action={excluirPrescricao.bind(null, p.id, id)}>
                      <ConfirmButton
                        variante="ghost"
                        tamanho="sm"
                        mensagem="Excluir esta prescrição apaga também o checklist gerado por ela. Tem certeza?"
                        className="px-2"
                        aria-label="Excluir prescrição"
                      >
                        <Trash2 className="size-4" />
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---------------- Evoluções ---------------- */}
        <Card className="lg:col-span-3">
          <CardTitulo>Evoluções</CardTitulo>

          {podeClinicar && ativa && (
            <EvolucaoForm action={registrarEvolucao.bind(null, id)} />
          )}

          {!evolucoes || evolucoes.length === 0 ? (
            <EmptyState
              icone={<NotebookPen className="size-7" strokeWidth={1.8} />}
              titulo="Nenhuma evolução registrada"
              mensagem="Anote o quadro do paciente a cada avaliação para montar a linha do tempo."
            />
          ) : (
            <ol className="relative space-y-4 border-l border-white/25 pl-4">
              {evolucoes.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand-mint"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-semibold text-ink tabular-nums">
                      {formatDataHora(e.data_hora)}
                    </p>
                    {e.responsavel?.nome && (
                      <p className="text-xs text-ink-muted">{e.responsavel.nome}</p>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{e.texto}</p>
                  {(e.temperatura != null ||
                    e.frequencia_cardiaca != null ||
                    e.frequencia_respiratoria != null) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted tabular-nums">
                      {e.temperatura != null && (
                        <span className="flex items-center gap-1">
                          <Thermometer className="size-3.5" aria-hidden />T{" "}
                          {Number(e.temperatura).toLocaleString("pt-BR")} °C
                        </span>
                      )}
                      {e.frequencia_cardiaca != null && (
                        <span className="flex items-center gap-1">
                          <HeartPulse className="size-3.5" aria-hidden />
                          FC {e.frequencia_cardiaca} bpm
                        </span>
                      )}
                      {e.frequencia_respiratoria != null && (
                        <span className="flex items-center gap-1">
                          <Wind className="size-3.5" aria-hidden />
                          FR {e.frequencia_respiratoria} mpm
                        </span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
