import Link from "next/link";
import { ChevronRight, PawPrint, Plus, Search } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { ESPECIES } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input, Select } from "@/components/ui/form";
import { IconeEspecie } from "@/components/icone-especie";

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
  searchParams: Promise<{ q?: string; especie?: string; pagina?: string }>;
}) {
  const { q, especie, pagina: paginaParam } = await searchParams;
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
  if (especie?.trim()) {
    query = query.eq("especie", especie.trim());
  }

  const { data, count } = await query.returns<PetLista[]>();
  const pets = data;
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  return (
    <div>
      <PageHeader
        titulo="Pets"
        subtitulo={count != null ? `${count} cadastrados` : undefined}
        acao={
          <ButtonLink href="/pets/novo">
            <Plus className="size-4" />
            Novo pet
          </ButtonLink>
        }
      />

      {/* Barra de filtros: quebra linha em vez de espremer o botão. */}
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar pelo nome do pet…"
          className="min-w-56 flex-1 sm:max-w-md"
        />
        <Select
          name="especie"
          defaultValue={especie ?? ""}
          aria-label="Filtrar por espécie"
          className="min-w-40 flex-1 sm:max-w-44"
        >
          <option value="">Todas as espécies</option>
          {ESPECIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          variante="secondary"
          className="min-h-11 shrink-0 sm:min-h-10"
        >
          <Search className="size-4 shrink-0" />
          Filtrar
        </Button>
      </form>

      {!pets || pets.length === 0 ? (
        <EmptyState
          icone={<PawPrint className="size-7" strokeWidth={1.8} />}
          titulo={q || especie ? "Nenhum pet encontrado" : "Nenhum pet ainda"}
          mensagem={
            q || especie
              ? "Tente ajustar a busca ou o filtro de espécie."
              : "Cadastre o primeiro pet para começar a atender."
          }
          acao={
            !q &&
            !especie && (
              <ButtonLink href="/pets/novo">
                <Plus className="size-4" />
                Novo pet
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {pets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pets/${p.id}`}
                  className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                >
                  <IconeEspecie especie={p.especie} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{p.nome}</p>
                    <p className="truncate text-sm text-ink-muted 2xl:text-base">
                      {p.especie}
                      {p.raca ? ` · ${p.raca}` : ""}
                      {p.tutor?.nome ? ` · Tutor: ${p.tutor.nome}` : ""}
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
        baseUrl="/pets"
        params={{ q, especie }}
      />
    </div>
  );
}
