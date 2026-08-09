import Link from "next/link";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO } from "@/lib/format";
import type { CompraStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { Pagination } from "@/components/ui/pagination";
import { sanitizarBusca } from "../itens/formato";
import { BadgeCompra } from "./badge-compra";
import { filtroData } from "./schema";

const POR_PAGINA = 20;

/** Teto do totalizador: soma o conjunto filtrado sem varrer a clínica inteira. */
const LIMITE_TOTALIZADOR = 1000;

export const metadata = { title: "Compras" };

type StatusFiltro = "todas" | CompraStatus;

const ABAS: { valor: StatusFiltro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "recebida", rotulo: "Recebidas" },
  { valor: "cancelada", rotulo: "Canceladas" },
];

interface LinhaCompra {
  id: string;
  data: string;
  numero_nota: string | null;
  valor_total: number;
  status: CompraStatus;
  fornecedor: { id: string; nome: string } | { id: string; nome: string }[] | null;
}

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    de?: string;
    ate?: string;
    q?: string;
    fornecedor?: string;
    pagina?: string;
    erro?: string;
  }>;
}) {
  const filtros = await searchParams;
  const pagina = Math.max(1, parseInt(filtros.pagina ?? "1", 10) || 1);
  const status = ABAS.find((a) => a.valor === filtros.status)?.valor ?? "todas";
  const de = filtroData(filtros.de);
  const ate = filtroData(filtros.ate);
  const fornecedorId = filtros.fornecedor?.trim() || undefined;
  const termo = sanitizarBusca(filtros.q ?? "");

  const { supabase } = await getSessao();

  const { data: fornecedores } = await supabase
    .from("fornecedor")
    .select("id, nome")
    .order("nome")
    .limit(500)
    .returns<{ id: string; nome: string }[]>();

  // A busca por fornecedor não cabe num .or() com tabela embutida: resolve-se
  // primeiro quais fornecedores batem com o termo e usam-se os ids no filtro.
  let idsFornecedores: string[] = [];
  if (termo) {
    const { data } = await supabase
      .from("fornecedor")
      .select("id")
      .ilike("nome", `%${termo}%`)
      .limit(50)
      .returns<{ id: string }[]>();
    idsFornecedores = (data ?? []).map((f) => f.id);
  }

  /** Monta a consulta com todos os filtros aplicados (usada 2x: lista e total). */
  const consultar = (campos: string, contar: boolean) => {
    let q = supabase
      .from("compra")
      .select(campos, contar ? { count: "exact" } : undefined);

    if (status !== "todas") q = q.eq("status", status);
    if (de) q = q.gte("data", de);
    if (ate) q = q.lte("data", ate);
    if (fornecedorId) q = q.eq("fornecedor_id", fornecedorId);
    if (termo) {
      const partes = [`numero_nota.ilike.%${termo}%`];
      if (idsFornecedores.length > 0) {
        partes.push(`fornecedor_id.in.(${idsFornecedores.join(",")})`);
      }
      q = q.or(partes.join(","));
    }
    return q;
  };

  const [{ data, count }, { data: todas }] = await Promise.all([
    consultar(
      "id, data, numero_nota, valor_total, status, fornecedor:fornecedor_id (id, nome)",
      true
    )
      .order("data", { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
      .returns<LinhaCompra[]>(),
    consultar("valor_total, status", false)
      .limit(LIMITE_TOTALIZADOR)
      .returns<{ valor_total: number; status: CompraStatus }[]>(),
  ]);

  const compras = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  // Quantidade de itens por compra sem N+1: UMA consulta com os ids da página.
  const quantidadeItens = new Map<string, number>();
  if (compras.length > 0) {
    const { data: itens } = await supabase
      .from("compra_item")
      .select("compra_id")
      .in(
        "compra_id",
        compras.map((c) => c.id)
      )
      .returns<{ compra_id: string }[]>();
    for (const i of itens ?? []) {
      quantidadeItens.set(i.compra_id, (quantidadeItens.get(i.compra_id) ?? 0) + 1);
    }
  }

  // Canceladas não entram no total comprado.
  const somaTotal = (todas ?? [])
    .filter((c) => c.status !== "cancelada")
    .reduce((soma, c) => soma + Number(c.valor_total), 0);

  const temFiltro = !!(termo || de || ate || fornecedorId || status !== "todas");
  const paramsUrl = { status, de, ate, q: termo || undefined, fornecedor: fornecedorId };

  const novaCompra = (
    <ButtonLink href="/compras/nova">
      <Plus className="size-4" />
      Nova compra
    </ButtonLink>
  );

  const linkAba = (valor: StatusFiltro) => {
    const sp = new URLSearchParams();
    Object.entries(paramsUrl)
      .filter(([campo, v]) => v && campo !== "status")
      .forEach(([campo, v]) => sp.set(campo, String(v)));
    if (valor !== "todas") sp.set("status", valor);
    const query = sp.toString();
    return query ? `/compras?${query}` : "/compras";
  };

  return (
    <div>
      <PageHeader
        titulo="Compras"
        subtitulo={count != null ? `${count} ${count === 1 ? "nota" : "notas"}` : undefined}
        acao={novaCompra}
      />

      {filtros.erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {filtros.erro}
        </p>
      )}

      <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtro por status">
        {ABAS.map((aba) => {
          const ativa = aba.valor === status;
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

      {/* Barra de filtros: flex com quebra de linha e largura mínima por bloco.
          Assim os campos empilham quando a tela aperta em vez de um invadir o
          espaço do outro (as duas datas contam como um bloco só). */}
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        {status !== "todas" && <input type="hidden" name="status" value={status} />}
        <div className="min-w-56 flex-1">
          <Input
            type="search"
            name="q"
            defaultValue={filtros.q ?? ""}
            placeholder="Buscar por nota ou fornecedor…"
            aria-label="Buscar compra"
          />
        </div>
        <div className="min-w-48 flex-1">
          <Select
            name="fornecedor"
            defaultValue={fornecedorId ?? ""}
            aria-label="Filtrar por fornecedor"
          >
            <option value="">Todos os fornecedores</option>
            {(fornecedores ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Select>
        </div>
        {/* Mesma grade de três colunas do filtro de contas: campo · até ·
            campo, sempre na mesma linha e com a mesma largura. */}
        {/* `minmax(0,1fr)` e não `1fr`: o campo de data tem largura mínima
            própria (placeholder + botão de calendário) e a grade não
            encolhia, estourando a página no celular. */}
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:min-w-64">
          <CampoData name="de" defaultValue={de ?? ""} aria-label="Compras a partir de" />
          <span className="shrink-0 text-sm text-ink-muted">até</span>
          <CampoData name="ate" defaultValue={ate ?? ""} aria-label="Compras até" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" variante="secondary">
            <Search className="size-4" />
            Filtrar
          </Button>
          {temFiltro && (
            <ButtonLink href="/compras" variante="ghost">
              Limpar
            </ButtonLink>
          )}
        </div>
      </form>

      <div className="glass mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Total comprado no filtro
          </p>
          <p className="text-2xl font-bold text-ink tabular-nums">
            {formatBRL(somaTotal)}
          </p>
        </div>
        {(todas?.length ?? 0) >= LIMITE_TOTALIZADOR && (
          <p className="w-full text-xs text-ink-muted">
            Somando as primeiras {LIMITE_TOTALIZADOR} notas do filtro. Refine o
            período para um total exato.
          </p>
        )}
      </div>

      {compras.length === 0 ? (
        <EmptyState
          icone={<ShoppingBag className="size-7" strokeWidth={1.8} />}
          titulo={temFiltro ? "Nenhuma compra encontrada" : "Nenhuma compra lançada"}
          mensagem={
            temFiltro
              ? "Ajuste os filtros para ver outras notas."
              : "Lance a nota do fornecedor para dar entrada no estoque e gerar a conta a pagar."
          }
          acao={!temFiltro ? novaCompra : undefined}
        />
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-white/20 text-left text-xs tracking-wider text-ink-muted uppercase">
                <th className="w-28 px-4 py-3 font-medium">Data</th>
                <th className="w-32 px-4 py-3 font-medium">Nota</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="w-20 px-4 py-3 text-right font-medium">Itens</th>
                <th className="w-32 px-4 py-3 text-right font-medium">Total</th>
                <th className="w-28 px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/15">
              {compras.map((c) => {
                const fornecedor = primeiro(c.fornecedor);
                return (
                  <tr key={c.id} className="transition-colors hover:bg-white/10">
                    <td className="px-4 py-3 text-ink tabular-nums">
                      <Link href={`/compras/${c.id}`} className="hover:underline">
                        {formatDataISO(c.data)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <Link href={`/compras/${c.id}`} className="hover:underline">
                        {c.numero_nota ? `NF ${c.numero_nota}` : "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {fornecedor ? (
                        <Link
                          href={`/fornecedores/${fornecedor.id}`}
                          className="link-vidro"
                        >
                          {fornecedor.nome}
                        </Link>
                      ) : (
                        "Fornecedor removido"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-ink tabular-nums">
                      {quantidadeItens.get(c.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                      {formatBRL(c.valor_total)}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeCompra status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/compras"
        params={{
          status: status !== "todas" ? status : undefined,
          de,
          ate,
          q: termo || undefined,
          fornecedor: fornecedorId,
        }}
      />
    </div>
  );
}
