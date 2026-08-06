import Link from "next/link";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatTelefone } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
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

  // Saldo devedor sem N+1: UMA consulta com os ids desta página e a soma
  // feita em memória (crédito - débito). Negativo = o tutor deve.
  const saldos = new Map<string, number>();
  const idsDaPagina = (tutores ?? []).map((t) => t.id);
  if (idsDaPagina.length > 0) {
    const { data: contas } = await supabase
      .from("conta")
      .select("tutor_id, tipo, valor, valor_pago")
      .in("tutor_id", idsDaPagina)
      .neq("status", "cancelada")
      .returns<
        {
          tutor_id: string;
          tipo: "receber" | "pagar";
          valor: number;
          valor_pago: number;
        }[]
      >();

    // Conta a receber ainda aberta = o tutor deve (sinal negativo).
    // Conta a pagar para o tutor = crédito dele (sinal positivo).
    for (const c of contas ?? []) {
      const aberto = Number(c.valor) - Number(c.valor_pago);
      if (aberto <= 0) continue;
      const sinal = c.tipo === "pagar" ? 1 : -1;
      saldos.set(c.tutor_id, (saldos.get(c.tutor_id) ?? 0) + sinal * aberto);
    }
  }

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
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {tutores.map((t) => {
              const saldo = saldos.get(t.id) ?? 0;
              return (
                <li key={t.id}>
                  <Link
                    href={`/tutores/${t.id}`}
                    className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                      {iniciais(t.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{t.nome}</p>
                      <p className="truncate text-sm text-ink-muted 2xl:text-base">
                        {formatTelefone(t.telefone)}
                        {t.email ? ` · ${t.email}` : ""}
                      </p>
                    </div>
                    {saldo < -0.005 && (
                      <Badge tom="danger" className="shrink-0">
                        Deve {formatBRL(Math.abs(saldo))}
                      </Badge>
                    )}
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
        baseUrl="/tutores"
        params={{ q }}
      />
    </div>
  );
}
