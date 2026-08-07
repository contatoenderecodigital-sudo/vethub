import Link from "next/link";
import { ChevronRight, Package, Plus, Search } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { ROTULO_TIPO_ITEM, TIPOS_ITEM, type ItemTipo } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Input, Select } from "@/components/ui/form";
import { abaixoDoMinimo, formatQuantidade, sanitizarBusca } from "./formato";
import { nomeDoPai } from "./dados";

const POR_PAGINA = 20;

export const metadata = { title: "Produtos e serviços" };

const ABAS: { valor?: ItemTipo; rotulo: string }[] = [
  { rotulo: "Todos" },
  ...TIPOS_ITEM.map((t) => ({ valor: t.valor, rotulo: t.plural })),
];

interface LinhaItem {
  id: string;
  tipo: ItemTipo;
  nome: string;
  codigo: string | null;
  preco_venda: number;
  controla_estoque: boolean;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  grupo: { nome: string } | { nome: string }[] | null;
  unidade: { sigla: string } | { sigla: string }[] | null;
}

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export default async function ItensPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    grupo?: string;
    pagina?: string;
  }>;
}) {
  const { q, tipo, grupo, pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, parseInt(paginaParam ?? "1", 10) || 1);
  const tipoAtivo = ABAS.find((a) => a.valor && a.valor === tipo)?.valor;

  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  const { data: gruposFiltro } = await supabase
    .from("grupo_item")
    .select("id, nome, pai:grupo_pai_id (nome)")
    .order("nome")
    .returns<{ id: string; nome: string; pai: { nome: string } | { nome: string }[] | null }[]>();

  let query = supabase
    .from("item")
    .select(
      "id, tipo, nome, codigo, preco_venda, controla_estoque, estoque_atual, estoque_minimo, ativo, grupo:grupo_id (nome), unidade:unidade_id (sigla)",
      { count: "exact" }
    )
    .order("nome")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  const termo = sanitizarBusca(q ?? "");
  if (termo) query = query.or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%`);
  if (tipoAtivo) query = query.eq("tipo", tipoAtivo);
  if (grupo?.trim()) query = query.eq("grupo_id", grupo.trim());

  const { data, count } = await query.returns<LinhaItem[]>();
  const itens = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);
  const temFiltro = !!(termo || tipoAtivo || grupo);

  const novoItem = (
    <ButtonLink href="/itens/novo">
      <Plus className="size-4" />
      Novo item
    </ButtonLink>
  );

  return (
    <div>
      <PageHeader
        titulo="Produtos e serviços"
        subtitulo={count != null ? `${count} no catálogo` : undefined}
        acao={podeEditar ? novoItem : undefined}
      />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtro por tipo">
        {ABAS.map((aba) => {
          const ativa = aba.valor === tipoAtivo;
          const sp = new URLSearchParams();
          if (aba.valor) sp.set("tipo", aba.valor);
          if (termo) sp.set("q", termo);
          if (grupo) sp.set("grupo", grupo);
          const href = sp.toString() ? `/itens?${sp}` : "/itens";
          return (
            <Link
              key={aba.rotulo}
              href={href}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
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
        {tipoAtivo && <input type="hidden" name="tipo" value={tipoAtivo} />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou código…"
            aria-label="Buscar produto ou serviço"
          className="min-w-56 flex-1 sm:max-w-md"
        />
        <Select
          name="grupo"
          defaultValue={grupo ?? ""}
          aria-label="Filtrar por grupo"
          className="min-w-48 flex-1 sm:max-w-56"
        >
          <option value="">Todos os grupos</option>
          {(gruposFiltro ?? []).map((g) => {
            const pai = nomeDoPai(g.pai);
            return (
              <option key={g.id} value={g.id}>
                {pai ? `${pai} › ${g.nome}` : g.nome}
              </option>
            );
          })}
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

      {itens.length === 0 ? (
        <EmptyState
          icone={<Package className="size-7" strokeWidth={1.8} />}
          titulo={temFiltro ? "Nenhum item encontrado" : "Nenhum item ainda"}
          mensagem={
            temFiltro
              ? "Tente ajustar a busca ou os filtros."
              : "Cadastre produtos e serviços para usar em orçamentos, consultas e estoque."
          }
          acao={!temFiltro && podeEditar ? novoItem : undefined}
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {itens.map((item) => {
              const critico = abaixoDoMinimo(item);
              const grupoNome = primeiro(item.grupo)?.nome ?? null;
              const sigla = primeiro(item.unidade)?.sigla ?? null;
              return (
                <li key={item.id}>
                  <Link
                    href={`/itens/${item.id}`}
                    className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        <span className="truncate">{item.nome}</span>
                        {!item.ativo && <Badge tom="neutro">Inativo</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {[
                          ROTULO_TIPO_ITEM[item.tipo],
                          item.codigo,
                          grupoNome,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold text-ink tabular-nums">
                        {formatBRL(item.preco_venda)}
                      </span>
                      {item.controla_estoque &&
                        (critico ? (
                          <Badge tom="danger">
                            {formatQuantidade(item.estoque_atual, sigla)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-ink-muted tabular-nums">
                            {formatQuantidade(item.estoque_atual, sigla)} em estoque
                          </span>
                        ))}
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
        baseUrl="/itens"
        params={{ q: termo || undefined, tipo: tipoAtivo, grupo }}
      />
    </div>
  );
}
