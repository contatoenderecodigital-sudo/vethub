import Link from "next/link";
import { BedDouble, CalendarClock, Plus, Stethoscope, User } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconeEspecie } from "@/components/icone-especie";
import {
  ROTULO_STATUS_INTERNACAO,
  rotuloDiasInternado,
  type InternacaoLinha,
  type InternacaoStatus,
} from "./tipos";

export const metadata = { title: "Internação" };

const ABAS: { valor: "internado" | "alta" | "todos"; rotulo: string }[] = [
  { valor: "internado", rotulo: "Internados" },
  { valor: "alta", rotulo: "Com alta" },
  { valor: "todos", rotulo: "Todos" },
];

const TOM_STATUS: Record<InternacaoStatus, "info" | "success" | "danger"> = {
  internado: "info",
  alta: "success",
  obito: "danger",
};

const SELECT_LINHA =
  "id, box, data_entrada, data_saida, motivo, status, " +
  "pet:pet_id (id, nome, especie, foto_url, tutor:tutor_id (id, nome)), " +
  "veterinario:veterinario_id (id, nome)";

export default async function InternacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  // Painel de internados: sem filtro na URL, mostra quem está internado.
  const filtro = ABAS.find((a) => a.valor === status)?.valor ?? "internado";
  const { supabase } = await getSessao();

  let query = supabase
    .from("internacao")
    .select(SELECT_LINHA, { count: "exact" })
    .order("data_entrada", { ascending: false })
    .limit(60);

  if (filtro !== "todos") query = query.eq("status", filtro);

  const { data, count } = await query.returns<InternacaoLinha[]>();
  const internacoes = data ?? [];

  return (
    <div>
      <PageHeader
        titulo="Internação"
        subtitulo={
          filtro === "internado"
            ? `${count ?? 0} ${count === 1 ? "paciente internado" : "pacientes internados"}`
            : `${count ?? 0} no total`
        }
        acao={
          <ButtonLink href="/internacao/nova">
            <Plus className="size-4" />
            Nova internação
          </ButtonLink>
        }
      />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtro por status">
        {ABAS.map((aba) => {
          const ativa = aba.valor === filtro;
          return (
            <Link
              key={aba.valor}
              href={`/internacao?status=${aba.valor}`}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                ativa
                  ? "bg-white text-brand-dark font-semibold shadow-sm"
                  : "border border-white/40 bg-white/15 text-ink backdrop-blur-md hover:bg-white/25"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </nav>

      {internacoes.length === 0 ? (
        <EmptyState
          icone={<BedDouble className="size-7" strokeWidth={1.8} />}
          titulo={
            filtro === "internado"
              ? "Nenhum paciente internado"
              : "Nenhuma internação encontrada"
          }
          mensagem={
            filtro === "internado"
              ? "Quando um pet for internado, o painel dele aparece aqui com o checklist de medicação."
              : "Ajuste o filtro para ver outros períodos."
          }
          acao={
            <ButtonLink href="/internacao/nova">
              <Plus className="size-4" />
              Nova internação
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {internacoes.map((i) => (
            <li key={i.id}>
              <Link
                href={`/internacao/${i.id}`}
                className="glass flex h-full flex-col rounded-2xl p-4 transition-all hover:bg-white/20 hover:shadow-lg hover:shadow-black/10"
              >
                <div className="flex items-start gap-3">
                  {i.pet?.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.pet.foto_url}
                      alt={i.pet.nome}
                      className="size-10 shrink-0 rounded-full bg-white/20 object-cover"
                    />
                  ) : (
                    <IconeEspecie especie={i.pet?.especie} tamanho="md" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">
                      {i.pet?.nome ?? "Pet removido"}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {i.pet?.especie ?? "-"}
                      {i.box ? ` · ${i.box}` : ""}
                    </p>
                  </div>
                  <Badge tom={TOM_STATUS[i.status]}>
                    {ROTULO_STATUS_INTERNACAO[i.status]}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-ink">{i.motivo}</p>

                <dl className="mt-3 space-y-1.5 border-t border-white/20 pt-3 text-xs text-ink-muted">
                  <div className="flex items-center gap-2">
                    <dt className="flex items-center">
                      <User className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                      <span className="sr-only">Tutor</span>
                    </dt>
                    <dd className="min-w-0 flex-1 truncate">
                      {i.pet?.tutor?.nome ?? "-"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="flex items-center">
                      <Stethoscope
                        className="size-3.5 shrink-0"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                      <span className="sr-only">Veterinário</span>
                    </dt>
                    <dd className="min-w-0 flex-1 truncate">
                      {i.veterinario?.nome ?? "Sem veterinário"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="flex items-center">
                      <CalendarClock
                        className="size-3.5 shrink-0"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                      <span className="sr-only">Entrada</span>
                    </dt>
                    <dd className="min-w-0 flex-1 truncate">
                      {formatDataHora(i.data_entrada)}
                    </dd>
                    <dd className="shrink-0 font-semibold text-ink tabular-nums">
                      {rotuloDiasInternado(i.data_entrada, i.data_saida)}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
