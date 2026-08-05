import Link from "next/link";
import { ChevronRight, Pill, Plus, Search } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataISO } from "@/lib/format";
import { dataCalendarioValida } from "@/lib/validacao";
import type { ReceitaTipo } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/form";
import { IconeEspecie } from "@/components/icone-especie";
import { BadgeTipoReceita } from "./badge-tipo";

const POR_PAGINA = 20;

export const metadata = { title: "Receituário" };

interface ReceitaLinha {
  id: string;
  data: string;
  tipo: ReceitaTipo;
  pet: {
    nome: string;
    especie: string;
    tutor: { nome: string } | null;
  } | null;
  veterinario: { nome: string } | null;
  /** PostgREST devolve a contagem do relacionamento como [{ count }]. */
  itens: { count: number }[] | null;
}

export default async function ReceitasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; de?: string; ate?: string; pagina?: string; erro?: string }>;
}) {
  const {
    q,
    de: deParam,
    ate: ateParam,
    pagina: paginaParam,
    erro,
  } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  // Datas da URL só entram na query se forem datas reais de calendário
  const de = deParam && dataCalendarioValida(deParam) ? deParam : undefined;
  const ate = ateParam && dataCalendarioValida(ateParam) ? ateParam : undefined;
  const { supabase, usuario } = await getSessao();

  let query = supabase
    .from("receita")
    .select(
      "id, data, tipo, pet:pet_id!inner (nome, especie, tutor:tutor_id (nome)), veterinario:veterinario_id (nome), itens:receita_item (count)",
      { count: "exact" }
    )
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (q?.trim()) query = query.ilike("pet.nome", `%${q.trim()}%`);
  // `data` é coluna date — comparação direta, sem fuso
  if (de) query = query.gte("data", de);
  if (ate) query = query.lte("data", ate);

  const { data, count } = await query;
  const receitas = (data ?? []) as unknown as ReceitaLinha[];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);
  const podePrescrever = usuario.papel !== "recepcao";
  const temFiltro = Boolean(q || de || ate);

  return (
    <div>
      <PageHeader
        titulo="Receituário"
        subtitulo={count != null ? `${count} receitas emitidas` : undefined}
        acao={
          podePrescrever && (
            <ButtonLink href="/receitas/nova">
              <Plus className="size-4" />
              Nova receita
            </ButtonLink>
          )
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-ink-muted" />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar pelo nome do pet…"
            className="pl-9"
          />
        </div>
        {/* As datas têm largura mínima e crescem juntas: em telas estreitas
            caem para a linha de baixo inteiras, nunca espremidas. */}
        <label className="min-w-36 flex-1 text-xs font-medium text-white/90 drop-shadow-sm sm:max-w-40">
          De
          <Input
            type="date"
            name="de"
            min="2000-01-01"
            max="2099-12-31"
            defaultValue={de ?? ""}
            className="mt-1"
          />
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-white/90 drop-shadow-sm sm:max-w-40">
          Até
          <Input
            type="date"
            name="ate"
            min="2000-01-01"
            max="2099-12-31"
            defaultValue={ate ?? ""}
            className="mt-1"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/40 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25 sm:min-h-10"
        >
          Filtrar
        </button>
      </form>

      {receitas.length === 0 ? (
        <EmptyState
          icone={<Pill className="size-7" strokeWidth={1.8} />}
          titulo={temFiltro ? "Nenhuma receita encontrada" : "Nenhuma receita ainda"}
          mensagem={
            temFiltro
              ? "Ajuste os filtros e tente de novo."
              : "As receitas emitidas para os pacientes aparecem aqui."
          }
          acao={
            podePrescrever &&
            !temFiltro && (
              <ButtonLink href="/receitas/nova">
                <Plus className="size-4" />
                Nova receita
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {receitas.map((r) => {
              const quantidade = r.itens?.[0]?.count ?? 0;
              return (
                <li key={r.id}>
                  <Link
                    href={`/receitas/${r.id}`}
                    className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <IconeEspecie especie={r.pet?.especie} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">
                        {r.pet?.nome ?? "—"}
                        <span className="font-normal text-ink-muted">
                          {r.pet?.tutor?.nome ? ` · ${r.pet.tutor.nome}` : ""}
                        </span>
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {quantidade}{" "}
                        {quantidade === 1 ? "medicamento" : "medicamentos"}
                        {r.veterinario?.nome ? ` · ${r.veterinario.nome}` : ""}
                      </p>
                    </div>
                    <BadgeTipoReceita tipo={r.tipo} />
                    <p className="hidden shrink-0 text-sm font-medium text-ink tabular-nums sm:block">
                      {formatDataISO(r.data)}
                    </p>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/receitas"
        params={{ q, de, ate }}
      />
    </div>
  );
}
