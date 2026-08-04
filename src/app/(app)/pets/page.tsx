import Link from "next/link";
import { getSessao } from "@/lib/auth";
import { emojiEspecie } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/form";

const POR_PAGINA = 20;

export const metadata = { title: "Pets" };

interface PetLista {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  tutor: { nome: string } | null;
}

export default async function PetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const { supabase } = await getSessao();

  let query = supabase
    .from("pet")
    .select("id, nome, especie, raca, tutor:tutor_id (nome)", { count: "exact" })
    .order("nome")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (q?.trim()) {
    query = query.ilike("nome", `%${q.trim()}%`);
  }

  const { data, count } = await query.returns<PetLista[]>();
  const pets = data;
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  return (
    <div>
      <PageHeader
        titulo="Pets"
        subtitulo={count != null ? `${count} cadastrados` : undefined}
        acao={<ButtonLink href="/pets/novo">+ Novo pet</ButtonLink>}
      />

      <form method="get" className="mb-4">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar pelo nome do pet…"
          className="max-w-md"
        />
      </form>

      {!pets || pets.length === 0 ? (
        <EmptyState
          titulo={q ? "Nenhum pet encontrado" : "Nenhum pet ainda"}
          mensagem={
            q
              ? "Tente buscar por outro nome."
              : "Cadastre o primeiro pet para começar a atender."
          }
          acao={!q && <ButtonLink href="/pets/novo">+ Novo pet</ButtonLink>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface">
          <ul className="divide-y divide-edge">
            {pets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pets/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-mint/10"
                >
                  <span className="text-2xl">{emojiEspecie(p.especie)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{p.nome}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {p.especie}
                      {p.raca ? ` · ${p.raca}` : ""}
                      {p.tutor?.nome ? ` · Tutor: ${p.tutor.nome}` : ""}
                    </p>
                  </div>
                  <span className="text-ink-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/pets"
        params={{ q }}
      />
    </div>
  );
}
