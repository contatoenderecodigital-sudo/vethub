import Link from "next/link";
import { ChevronRight, Plus, Search, Stethoscope } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/form";
import { IconeEspecie } from "@/components/icone-especie";

const POR_PAGINA = 20;

export const metadata = { title: "Consultas" };

interface ConsultaLinha {
  id: string;
  data: string;
  queixa: string | null;
  diagnostico: string | null;
  pet: {
    nome: string;
    especie: string;
    tutor: { nome: string } | null;
  } | null;
  veterinario: { nome: string } | null;
}

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; de?: string; ate?: string; pagina?: string }>;
}) {
  const { q, de, ate, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const { supabase, usuario } = await getSessao();

  let query = supabase
    .from("consulta")
    .select(
      "id, data, queixa, diagnostico, pet:pet_id!inner (nome, especie, tutor:tutor_id (nome)), veterinario:veterinario_id (nome)",
      { count: "exact" }
    )
    .order("data", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (q?.trim()) query = query.ilike("pet.nome", `%${q.trim()}%`);
  // Janela de datas no fuso da clínica (UTC-3 fixo)
  if (de) query = query.gte("data", `${de}T00:00:00-03:00`);
  if (ate) query = query.lte("data", `${ate}T23:59:59-03:00`);

  const { data, count } = await query;
  const consultas = (data ?? []) as unknown as ConsultaLinha[];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);
  const podeAtender = usuario.papel !== "recepcao";

  return (
    <div>
      <PageHeader
        titulo="Consultas"
        subtitulo={count != null ? `${count} atendimentos registrados` : undefined}
        acao={
          podeAtender && (
            <ButtonLink href="/consultas/nova">
              <Plus className="size-4" />
              Nova consulta
            </ButtonLink>
          )
        }
      />

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
        <label className="text-xs text-ink-muted">
          De
          <Input type="date" name="de" defaultValue={de ?? ""} className="mt-1 w-36" />
        </label>
        <label className="text-xs text-ink-muted">
          Até
          <Input type="date" name="ate" defaultValue={ate ?? ""} className="mt-1 w-36" />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      {consultas.length === 0 ? (
        <EmptyState
          icone={<Stethoscope className="size-7" strokeWidth={1.8} />}
          titulo={q || de || ate ? "Nenhuma consulta encontrada" : "Nenhuma consulta ainda"}
          mensagem={
            q || de || ate
              ? "Ajuste os filtros e tente de novo."
              : "Os atendimentos registrados aparecem aqui."
          }
          acao={
            podeAtender &&
            !q &&
            !de &&
            !ate && (
              <ButtonLink href="/consultas/nova">
                <Plus className="size-4" />
                Nova consulta
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-edge bg-surface">
          <ul className="divide-y divide-edge">
            {consultas.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/consultas/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-mint/10"
                >
                  <IconeEspecie especie={c.pet?.especie} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {c.pet?.nome ?? "—"}
                      <span className="font-normal text-ink-muted">
                        {c.pet?.tutor?.nome ? ` · ${c.pet.tutor.nome}` : ""}
                      </span>
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {c.diagnostico || c.queixa || "Sem resumo"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-medium text-ink tabular-nums">
                      {formatDataHora(c.data)}
                    </p>
                    {c.veterinario?.nome && (
                      <p className="text-xs text-ink-muted">{c.veterinario.nome}</p>
                    )}
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
        baseUrl="/consultas"
        params={{ q, de, ate }}
      />
    </div>
  );
}
