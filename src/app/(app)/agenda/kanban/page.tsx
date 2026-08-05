import {
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { dataParamOuHoje } from "@/lib/validacao";
import type { Usuario } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { AlternadorVisao } from "../alternador-visao";
import { CartaoAgendamento, type CartaoDados } from "./cartao-agendamento";
import { Coluna } from "./coluna";

export const metadata = { title: "Agenda — Kanban" };

/** Linha do dia com os joins usados pelo kanban. */
interface AgendamentoDoDia extends CartaoDados {
  pet_id: string;
  status: string;
}

/**
 * Colunas do quadro. 'atendido' (status legado da visão em lista) cai na
 * coluna "Pronto" para nenhum agendamento sumir do quadro.
 */
const COLUNAS: {
  status: string;
  titulo: string;
  corBorda: string;
  corPonto: string;
  aceita: string[];
}[] = [
  {
    status: "agendado",
    titulo: "Agendado",
    corBorda: "border-t-cyan-300",
    corPonto: "bg-cyan-300",
    aceita: ["agendado"],
  },
  {
    status: "check_in",
    titulo: "Check-in",
    corBorda: "border-t-amber-300",
    corPonto: "bg-amber-300",
    aceita: ["check_in"],
  },
  {
    status: "pronto",
    titulo: "Pronto",
    corBorda: "border-t-brand-light",
    corPonto: "bg-brand-light",
    aceita: ["pronto", "atendido"],
  },
  {
    status: "check_out",
    titulo: "Check-out",
    corBorda: "border-t-emerald-400",
    corPonto: "bg-emerald-400",
    aceita: ["check_out"],
  },
  {
    status: "cancelado",
    titulo: "Cancelado",
    corBorda: "border-t-red-400",
    corPonto: "bg-red-400",
    aceita: ["cancelado"],
  },
];

/**
 * Soma dias a uma data YYYY-MM-DD. Constrói o Date com T12:00:00 (meio-dia
 * local) para que o fuso do servidor nunca faça a data "virar".
 */
function deslocarDia(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

function linkDia(data: string, vet?: string): string {
  return `/agenda/kanban?data=${data}${vet ? `&vet=${vet}` : ""}`;
}

export default async function AgendaKanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; vet?: string; erro?: string }>;
}) {
  const { data: dataParam, vet, erro } = await searchParams;
  const data = dataParamOuHoje(dataParam?.trim());
  const { supabase } = await getSessao();

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

  // Mesma janela do dia da visão em lista: offset fixo -03:00 (São Paulo).
  let query = supabase
    .from("agendamento")
    .select(
      "id, pet_id, data_hora, status, etiquetas, " +
        "pet:pet_id (nome, especie, raca, foto_url, tutor:tutor_id (nome)), " +
        "veterinario:veterinario_id (nome)"
    )
    .gte("data_hora", `${data}T00:00:00-03:00`)
    .lt("data_hora", `${deslocarDia(data, 1)}T00:00:00-03:00`)
    .order("data_hora");

  if (vet) query = query.eq("veterinario_id", vet);

  const { data: agendamentos } = await query.returns<AgendamentoDoDia[]>();
  const lista = agendamentos ?? [];

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
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="mb-4">
        <AlternadorVisao visao="kanban" data={data} vet={vet} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ButtonLink
            href={linkDia(deslocarDia(data, -1), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-11 max-sm:min-w-11"
          >
            <ChevronLeft className="size-4" />
            <span className="max-sm:sr-only">Anterior</span>
          </ButtonLink>
          <ButtonLink
            href={linkDia(hojeISO(), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-11"
          >
            Hoje
          </ButtonLink>
          <ButtonLink
            href={linkDia(deslocarDia(data, 1), vet)}
            variante="secondary"
            tamanho="sm"
            className="max-sm:min-h-11 max-sm:min-w-11"
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
            className="h-8 w-auto min-w-0 max-w-56 text-sm max-sm:min-h-11"
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
            className="max-sm:min-h-11"
          >
            <SlidersHorizontal className="size-4" />
            Filtrar
          </Button>
        </form>
      </div>

      <p className="mb-3 text-xs text-ink-muted">
        Arraste os cartões entre as colunas para mudar a situação do atendimento.
      </p>

      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {COLUNAS.map((coluna) => {
          const daColuna = lista.filter((a) => coluna.aceita.includes(a.status));
          return (
            <Coluna
              key={coluna.status}
              status={coluna.status}
              titulo={coluna.titulo}
              corBorda={coluna.corBorda}
              corPonto={coluna.corPonto}
              contador={daColuna.length}
              data={data}
            >
              {daColuna.map((a) => (
                <CartaoAgendamento key={a.id} agendamento={a} />
              ))}
            </Coluna>
          );
        })}
      </div>
    </div>
  );
}
