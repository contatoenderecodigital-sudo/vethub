import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Cake,
  CalendarDays,
  ChevronRight,
  Mars,
  Pencil,
  Stethoscope,
  Trash2,
  Venus,
  Weight,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora, idadeDoPet, ROTULO_TIPO } from "@/lib/format";
import type { AgendamentoStatus, AgendamentoTipo, Pet } from "@/lib/types";
import { Badge, BadgeAgendamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconeEspecie } from "@/components/icone-especie";
import { excluirPet } from "../actions";

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

const ROTULO_SEXO = { macho: "Macho", femea: "Fêmea" } as const;

export default async function PetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: pet } = await supabase
    .from("pet")
    .select("*, tutor:tutor_id (id, nome, telefone)")
    .eq("id", id)
    .single<Pet>();

  if (!pet) notFound();

  const [{ data: consultas }, { data: agendamentos }] = await Promise.all([
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
  ]);

  const excluirComId = excluirPet.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconeEspecie especie={pet.especie} tamanho="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{pet.nome}</h1>
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              {pet.especie}
              {pet.raca ? ` · ${pet.raca}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {erro && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="mb-4">
        <Card>
          <CardTitulo>Dados do pet</CardTitulo>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Tutor</dt>
              <dd className="font-medium text-ink">
                {pet.tutor ? (
                  <Link
                    href={`/tutores/${pet.tutor_id}`}
                    className="text-brand hover:underline"
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
              <dt className="flex items-center gap-1.5 text-ink-muted">
                {pet.sexo === "macho" && (
                  <Mars className="size-3.5" aria-hidden />
                )}
                {pet.sexo === "femea" && (
                  <Venus className="size-3.5" aria-hidden />
                )}
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
              <dd className="font-medium text-ink">
                {idadeDoPet(pet.data_nascimento)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-ink-muted">
                <Weight className="size-3.5" aria-hidden />
                Peso
              </dt>
              <dd className="font-medium text-ink">
                {pet.peso != null
                  ? `${Number(pet.peso).toLocaleString("pt-BR")} kg`
                  : "—"}
              </dd>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitulo>Consultas</CardTitulo>
          {!consultas || consultas.length === 0 ? (
            <EmptyState
              icone={<Stethoscope className="size-7" strokeWidth={1.8} />}
              titulo="Nenhuma consulta"
              mensagem="Este pet ainda não tem consultas registradas."
            />
          ) : (
            <ul className="divide-y divide-zinc-200/60">
              {consultas.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/consultas/${c.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-brand-mint/10"
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
            <ul className="divide-y divide-zinc-200/60">
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
      </div>
    </div>
  );
}
