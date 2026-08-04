import Link from "next/link";
import { getSessao } from "@/lib/auth";
import { emojiEspecie, formatBRL, formatDataHora } from "@/lib/format";
import type { OrcamentoStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeOrcamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

const POR_PAGINA = 20;

const ABAS: { valor?: OrcamentoStatus; rotulo: string }[] = [
  { rotulo: "Todos" },
  { valor: "aberto", rotulo: "Aberto" },
  { valor: "aprovado", rotulo: "Aprovado" },
  { valor: "recusado", rotulo: "Recusado" },
];

interface LinhaOrcamento {
  id: string;
  status: OrcamentoStatus;
  valor_total: number;
  created_at: string;
  pet: {
    nome: string;
    especie: string;
    tutor: { nome: string } | { nome: string }[] | null;
  } | null;
}

function nomeDoTutor(pet: LinhaOrcamento["pet"]): string | null {
  const tutor = Array.isArray(pet?.tutor) ? pet?.tutor[0] : pet?.tutor;
  return tutor?.nome ?? null;
}

export const metadata = { title: "Orçamentos" };

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string }>;
}) {
  const { status, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const statusFiltro = ABAS.find((a) => a.valor && a.valor === status)?.valor;
  const { supabase } = await getSessao();

  let query = supabase
    .from("orcamento")
    .select(
      "id, status, valor_total, created_at, pet:pet_id (nome, especie, tutor:tutor_id (nome))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (statusFiltro) query = query.eq("status", statusFiltro);

  const { data, count } = await query.returns<LinhaOrcamento[]>();
  const orcamentos = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  return (
    <div>
      <PageHeader
        titulo="Orçamentos"
        subtitulo={count != null ? `${count} no total` : undefined}
        acao={<ButtonLink href="/orcamentos/novo">+ Novo orçamento</ButtonLink>}
      />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtro por status">
        {ABAS.map((aba) => {
          const ativa = aba.valor === statusFiltro;
          return (
            <Link
              key={aba.rotulo}
              href={aba.valor ? `/orcamentos?status=${aba.valor}` : "/orcamentos"}
              className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition-colors ${
                ativa
                  ? "bg-brand text-white"
                  : "border border-edge bg-surface text-ink-muted hover:bg-zinc-50 hover:text-ink"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </nav>

      {orcamentos.length === 0 ? (
        <EmptyState
          titulo={
            statusFiltro
              ? "Nenhum orçamento com este status"
              : "Nenhum orçamento ainda"
          }
          mensagem={
            statusFiltro
              ? "Tente outro filtro ou crie um novo orçamento."
              : "Crie o primeiro orçamento para apresentar ao tutor."
          }
          acao={<ButtonLink href="/orcamentos/novo">+ Novo orçamento</ButtonLink>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface">
          <ul className="divide-y divide-edge">
            {orcamentos.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orcamentos/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-mint/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {emojiEspecie(o.pet?.especie)} {o.pet?.nome ?? "Pet removido"}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {nomeDoTutor(o.pet) ?? "—"} · {formatDataHora(o.created_at)}
                    </p>
                  </div>
                  <BadgeOrcamento status={o.status} />
                  <span className="w-24 text-right font-medium text-ink tabular-nums">
                    {formatBRL(o.valor_total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/orcamentos"
        params={{ status: statusFiltro }}
      />
    </div>
  );
}
