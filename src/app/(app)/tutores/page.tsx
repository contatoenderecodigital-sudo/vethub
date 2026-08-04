import Link from "next/link";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatTelefone } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/form";

const POR_PAGINA = 20;

export const metadata = { title: "Tutores" };

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default async function TutoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const { supabase } = await getSessao();

  let query = supabase
    .from("tutor")
    .select("id, nome, telefone, email", { count: "exact" })
    .order("nome")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (q?.trim()) {
    const termo = q.trim();
    query = query.or(
      `nome.ilike.%${termo}%,telefone.ilike.%${termo}%,cpf.ilike.%${termo}%`
    );
  }

  const { data: tutores, count } = await query;
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  return (
    <div>
      <PageHeader
        titulo="Tutores"
        subtitulo={count != null ? `${count} cadastrados` : undefined}
        acao={
          <ButtonLink href="/tutores/novo">
            <Plus className="size-4" />
            Novo tutor
          </ButtonLink>
        }
      />

      <form method="get" className="mb-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-ink-muted" />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome, telefone ou CPF…"
            className="pl-9"
          />
        </div>
      </form>

      {!tutores || tutores.length === 0 ? (
        <EmptyState
          icone={<Users className="size-7" strokeWidth={1.8} />}
          titulo={q ? "Nenhum tutor encontrado" : "Nenhum tutor ainda"}
          mensagem={
            q
              ? "Tente buscar por outro nome ou telefone."
              : "Cadastre o primeiro tutor para começar a atender."
          }
          acao={
            !q && (
              <ButtonLink href="/tutores/novo">
                <Plus className="size-4" />
                Cadastrar tutor
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface">
          <ul className="divide-y divide-edge">
            {tutores.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tutores/${t.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-mint/10"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-dark">
                    {iniciais(t.nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{t.nome}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {formatTelefone(t.telefone)}
                      {t.email ? ` · ${t.email}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/tutores"
        params={{ q }}
      />
    </div>
  );
}
