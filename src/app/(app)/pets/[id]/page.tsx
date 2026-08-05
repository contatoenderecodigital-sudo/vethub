import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Cake,
  CalendarDays,
  ChevronRight,
  Mars,
  Pencil,
  Pill,
  ScanLine,
  Stethoscope,
  Trash2,
  TriangleAlert,
  Venus,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import {
  formatDataHora,
  formatDataISO,
  idadeDetalhada,
  ROTULO_TIPO,
} from "@/lib/format";
import {
  PORTES,
  ROTULO_TIPO_RECEITA,
  TIPOS_PROTOCOLO,
  type AgendamentoStatus,
  type AgendamentoTipo,
  type Pet,
  type ReceitaTipo,
  type TipoProtocolo,
} from "@/lib/types";
import { Badge, BadgeAgendamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { excluirPet } from "../actions";
import { FotoUpload } from "../foto-upload";
import { PesoHistorico } from "./peso-historico";
import { Protocolos } from "./protocolos";

export const metadata = { title: "Pet" };

interface ConsultaResumo {
  id: string;
  data: string;
  queixa: string | null;
  diagnostico: string | null;
}

interface AgendamentoResumo {
  id: string;
  data_hora: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
}

interface ReceitaResumo {
  id: string;
  data: string;
  tipo: ReceitaTipo;
  /** PostgREST devolve a contagem do relacionamento como [{ count }]. */
  itens: { count: number }[] | null;
}

const ROTULO_SEXO = { macho: "Macho", femea: "Fêmea" } as const;

const rotuloPorte = (valor: string | null) =>
  PORTES.find((p) => p.valor === valor)?.rotulo ?? null;

export default async function PetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; tipo?: string }>;
}) {
  const { id } = await params;
  const { erro, tipo } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: pet } = await supabase
    .from("pet")
    .select("*, tutor:tutor_id (id, nome, telefone)")
    .eq("id", id)
    .single<Pet>();

  if (!pet) notFound();

  const [{ data: consultas }, { data: agendamentos }, { data: receitas }] =
    await Promise.all([
      supabase
        .from("consulta")
        .select("id, data, queixa, diagnostico")
        .eq("pet_id", id)
        .order("data", { ascending: false })
        .limit(10)
        .returns<ConsultaResumo[]>(),
      supabase
        .from("agendamento")
        .select("id, data_hora, tipo, status")
        .eq("pet_id", id)
        .order("data_hora", { ascending: false })
        .limit(10)
        .returns<AgendamentoResumo[]>(),
      supabase
        .from("receita")
        .select("id, data, tipo, itens:receita_item (count)")
        .eq("pet_id", id)
        .order("data", { ascending: false })
        .limit(5)
        .returns<ReceitaResumo[]>(),
    ]);

  const excluirComId = excluirPet.bind(null, id);
  const porte = rotuloPorte(pet.porte);
  const etiquetas = pet.etiquetas ?? [];
  // filtro das abas de protocolo — só aceita valor conhecido
  const tipoAtivo = (TIPOS_PROTOCOLO.some((t) => t.valor === tipo)
    ? tipo
    : "") as TipoProtocolo | "";

  return (
    <div>
      <div className="glass mb-4 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <FotoUpload
            petId={pet.id}
            clinicaId={usuario.clinica_id}
            especie={pet.especie}
            fotoUrl={pet.foto_url}
            nome={pet.nome}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">
                {pet.nome}
              </h1>
              {pet.falecido && <Badge tom="neutro">Falecido</Badge>}
              {pet.castrado && <Badge tom="success">Castrado</Badge>}
            </div>

            <p className="mt-1 text-sm text-ink-muted">
              {pet.especie}
              {pet.raca ? ` · ${pet.raca}` : ""}
              {porte ? ` · Porte ${porte.toLowerCase()}` : ""}
              {pet.sexo ? ` · ${ROTULO_SEXO[pet.sexo]}` : ""}
            </p>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
              <Cake className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              {idadeDetalhada(pet.data_nascimento)}
            </p>

            {pet.microchip && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                <ScanLine className="size-3.5 shrink-0" aria-hidden />
                Microchip {pet.microchip}
              </p>
            )}

            {etiquetas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {etiquetas.map((etiqueta) => (
                  <Badge key={etiqueta} tom="brand">
                    {etiqueta}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ButtonLink href={`/agenda/novo?pet=${id}`} variante="secondary">
                <CalendarDays className="size-4" />
                Agendamento
              </ButtonLink>
              <ButtonLink href={`/consultas/nova?pet=${id}`}>
                <Stethoscope className="size-4" />
                Consulta
              </ButtonLink>
              <ButtonLink href={`/pets/${id}/editar`} variante="secondary">
                <Pencil className="size-4" />
                Editar
              </ButtonLink>
              <form action={excluirComId}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Excluir este pet apaga também todo o histórico dele (consultas e agendamentos). Tem certeza?"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </ConfirmButton>
              </form>
            </div>
          </div>
        </div>
      </div>

      {pet.alergias && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-2xl border border-red-300/50 bg-red-500/30 px-4 py-3 backdrop-blur-md"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-red-50" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-red-50">
              Alergias
            </p>
            <p className="mt-0.5 whitespace-pre-line text-sm font-medium text-red-50">
              {pet.alergias}
            </p>
          </div>
        </div>
      )}

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitulo>Dados do pet</CardTitulo>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Tutor</dt>
              <dd className="font-medium text-ink">
                {pet.tutor ? (
                  <Link
                    href={`/tutores/${pet.tutor_id}`}
                    className="link-vidro"
                  >
                    {pet.tutor.nome}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Espécie</dt>
              <dd className="font-medium text-ink">{pet.especie}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Raça</dt>
              <dd className="font-medium text-ink">{pet.raca ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Porte</dt>
              <dd className="font-medium text-ink">{porte ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Pelagem</dt>
              <dd className="font-medium text-ink">{pet.pelagem ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-ink-muted">
                {pet.sexo === "macho" && <Mars className="size-3.5" aria-hidden />}
                {pet.sexo === "femea" && <Venus className="size-3.5" aria-hidden />}
                Sexo
              </dt>
              <dd className="font-medium text-ink">
                {pet.sexo ? ROTULO_SEXO[pet.sexo] : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-ink-muted">
                <Cake className="size-3.5" aria-hidden />
                Idade
              </dt>
              <dd className="text-right font-medium text-ink">
                {idadeDetalhada(pet.data_nascimento)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-ink-muted">
                <ScanLine className="size-3.5" aria-hidden />
                Microchip
              </dt>
              <dd className="font-medium text-ink">{pet.microchip ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Castrado</dt>
              <dd>
                {pet.castrado ? (
                  <Badge tom="success">Sim</Badge>
                ) : (
                  <Badge tom="neutro">Não</Badge>
                )}
              </dd>
            </div>
            {pet.observacoes && (
              <div className="pt-1">
                <dt className="text-ink-muted">Observações</dt>
                <dd className="mt-1 whitespace-pre-line font-medium text-ink">
                  {pet.observacoes}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <PesoHistorico petId={pet.id} pesoAtual={pet.peso} />

        <div className="lg:col-span-2">
          <Protocolos petId={pet.id} tipoAtivo={tipoAtivo} />
        </div>

        <Card>
          <CardTitulo>Consultas</CardTitulo>
          {!consultas || consultas.length === 0 ? (
            <EmptyState
              icone={<Stethoscope className="size-7" strokeWidth={1.8} />}
              titulo="Nenhuma consulta"
              mensagem="Este pet ainda não tem consultas registradas."
            />
          ) : (
            <ul className="divide-y divide-white/15">
              {consultas.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/consultas/${c.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {formatDataHora(c.data)}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {c.diagnostico ?? c.queixa ?? "Sem registro de diagnóstico"}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitulo>Agendamentos</CardTitulo>
          {!agendamentos || agendamentos.length === 0 ? (
            <EmptyState
              icone={<CalendarDays className="size-7" strokeWidth={1.8} />}
              titulo="Nenhum agendamento"
              mensagem="Este pet ainda não tem agendamentos."
            />
          ) : (
            <ul className="divide-y divide-white/15">
              {agendamentos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {formatDataHora(a.data_hora)}
                    </p>
                    <p className="text-xs text-ink-muted">{ROTULO_TIPO[a.tipo]}</p>
                  </div>
                  <BadgeAgendamento status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitulo>Receitas</CardTitulo>
          {!receitas || receitas.length === 0 ? (
            <EmptyState
              icone={<Pill className="size-7" strokeWidth={1.8} />}
              titulo="Nenhuma receita"
              mensagem="As receitas emitidas para este pet aparecem aqui."
              acao={
                usuario.papel !== "recepcao" && (
                  <ButtonLink href={`/receitas/nova?pet=${id}`} variante="secondary">
                    <Pill className="size-4" />
                    Nova receita
                  </ButtonLink>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-white/15">
              {receitas.map((r) => {
                const quantidade = r.itens?.[0]?.count ?? 0;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/receitas/${r.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/15"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {formatDataISO(r.data)}
                          <span className="font-normal text-ink-muted">
                            {` · ${ROTULO_TIPO_RECEITA[r.tipo]}`}
                          </span>
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {quantidade}{" "}
                          {quantidade === 1 ? "medicamento" : "medicamentos"}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
