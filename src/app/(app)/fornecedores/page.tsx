import Link from "next/link";
import { ChevronRight, Handshake, Plus, Search } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatTelefone, plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/form";
import { sanitizarBusca } from "../itens/formato";
import { soDigitos } from "@/lib/validacao";
import { formatCNPJ } from "./schema";

const POR_PAGINA = 20;

export const metadata = { title: "Fornecedores" };

type Situacao = "ativos" | "inativos" | "todos";

const ABAS: { valor: Situacao; rotulo: string }[] = [
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "inativos", rotulo: "Inativos" },
  { valor: "todos", rotulo: "Todos" },
];

interface LinhaFornecedor {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
}

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; situacao?: string; pagina?: string; erro?: string }>;
}) {
  const { q, situacao, pagina: paginaParam, erro } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const filtro = ABAS.find((a) => a.valor === situacao)?.valor ?? "ativos";

  const { supabase } = await getSessao();

  let query = supabase
    .from("fornecedor")
    .select("id, nome, razao_social, cnpj, telefone, cidade, uf, ativo", {
      count: "exact",
    })
    .order("nome")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (filtro !== "todos") query = query.eq("ativo", filtro === "ativos");

  const termo = sanitizarBusca(q ?? "");
  if (termo) {
    const partes = [`nome.ilike.%${termo}%`, `razao_social.ilike.%${termo}%`];
    // CNPJ é guardado só com dígitos. A busca também precisa ser em dígitos.
    const digitos = soDigitos(termo);
    if (digitos) partes.push(`cnpj.ilike.%${digitos}%`);
    query = query.or(partes.join(","));
  }

  const { data, count } = await query.returns<LinhaFornecedor[]>();
  const fornecedores = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);
  const temFiltro = !!termo || filtro !== "ativos";

  const novoFornecedor = (
    <ButtonLink href="/fornecedores/novo">
      <Plus className="size-4" />
      Novo fornecedor
    </ButtonLink>
  );

  const linkAba = (valor: Situacao) => {
    const sp = new URLSearchParams();
    if (termo) sp.set("q", termo);
    if (valor !== "ativos") sp.set("situacao", valor);
    const query = sp.toString();
    return query ? `/fornecedores?${query}` : "/fornecedores";
  };

  return (
    <div>
      <PageHeader
        titulo="Fornecedores"
        subtitulo={count != null ? plural(count, "fornecedor", "fornecedores") + " cadastrado" + (count === 1 ? "" : "s") : undefined}
        acao={novoFornecedor}
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtro por situação">
        {ABAS.map((aba) => {
          const ativa = aba.valor === filtro;
          return (
            <Link
              key={aba.valor}
              href={linkAba(aba.valor)}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-11 items-center rounded-full px-3.5 text-sm font-medium transition-colors lg:h-8 ${
                ativa
                  ? "bg-white text-brand-dark shadow-sm"
                  : "border border-white/40 bg-white/15 text-ink-muted backdrop-blur-md hover:bg-white/25 hover:text-ink"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </nav>

      {/* Barra de filtros: quebra linha em vez de espremer o botão. */}
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        {filtro !== "ativos" && <input type="hidden" name="situacao" value={filtro} />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome, razão social ou CNPJ…"
          className="min-w-56 flex-1 sm:max-w-md"
          aria-label="Buscar fornecedor"
        />
        <Button
          type="submit"
          variante="secondary"
          className="min-w-11 shrink-0 lg:min-w-0"
        >
          <Search className="size-4 shrink-0" />
          Buscar
        </Button>
      </form>

      {fornecedores.length === 0 ? (
        <EmptyState
          icone={<Handshake className="size-7" strokeWidth={1.8} />}
          titulo={temFiltro ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor ainda"}
          mensagem={
            temFiltro
              ? "Tente ajustar a busca ou o filtro de situação."
              : "Cadastre os fornecedores da clínica para lançar compras e contas a pagar."
          }
          acao={!temFiltro ? novoFornecedor : undefined}
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {fornecedores.map((f) => {
              const cidadeUf = [f.cidade, f.uf].filter(Boolean).join("/");
              return (
                <li key={f.id}>
                  <Link
                    href={`/fornecedores/${f.id}`}
                    className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        <span className="truncate">{f.nome}</span>
                        {!f.ativo && <Badge tom="neutro">Inativo</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {[
                          f.cnpj ? formatCNPJ(f.cnpj) : null,
                          f.telefone ? formatTelefone(f.telefone) : null,
                          cidadeUf || null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sem dados de contato"}
                      </p>
                    </div>
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
        baseUrl="/fornecedores"
        params={{
          q: termo || undefined,
          situacao: filtro !== "ativos" ? filtro : undefined,
        }}
      />
    </div>
  );
}
