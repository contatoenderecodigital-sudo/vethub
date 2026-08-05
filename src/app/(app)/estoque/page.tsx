import Link from "next/link";
import {
  Boxes,
  ChevronRight,
  CircleSlash,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatQuantidade } from "../itens/formato";
import { MovimentacaoForm, type ProdutoOpcao } from "./movimentacao-form";

export const metadata = { title: "Estoque" };

type Filtro = "todos" | "baixo" | "zerado";

const ABAS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "baixo", rotulo: "Abaixo do mínimo" },
  { valor: "zerado", rotulo: "Zerados" },
];

interface ProdutoEstoque {
  id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  unidade: { sigla: string } | { sigla: string }[] | null;
}

function siglaDe(unidade: ProdutoEstoque["unidade"]): string | null {
  const registro = Array.isArray(unidade) ? unidade[0] : unidade;
  return registro?.sigla ?? null;
}

/** 0 = zerado, 1 = abaixo do mínimo, 2 = em dia. Ordena a lista. */
function criticidade(p: ProdutoEstoque): number {
  if (Number(p.estoque_atual) <= 0) return 0;
  if (Number(p.estoque_atual) <= Number(p.estoque_minimo)) return 1;
  return 2;
}

function Resumo({
  rotulo,
  valor,
  icone: Icone,
  destaque,
}: {
  rotulo: string;
  valor: string;
  icone: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-4">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          destaque ? "bg-red-400/30 text-red-50" : "bg-white/20 text-white"
        }`}
      >
        <Icone className="size-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-muted">{rotulo}</p>
        <p className="text-lg font-bold text-ink tabular-nums">{valor}</p>
      </div>
    </div>
  );
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; item?: string; erro?: string }>;
}) {
  const { filtro, item, erro } = await searchParams;
  const filtroAtivo: Filtro =
    ABAS.find((a) => a.valor === filtro)?.valor ?? "todos";

  const { supabase } = await getSessao();

  const { data } = await supabase
    .from("item")
    .select(
      "id, nome, codigo, ativo, estoque_atual, estoque_minimo, preco_custo, unidade:unidade_id (sigla)"
    )
    .eq("tipo", "produto")
    .eq("controla_estoque", true)
    .order("nome")
    .limit(500)
    .returns<ProdutoEstoque[]>();

  const produtos = data ?? [];

  const abaixoDoMinimo = produtos.filter((p) => criticidade(p) <= 1);
  const valorTotal = produtos.reduce(
    (soma, p) => soma + Number(p.estoque_atual) * Number(p.preco_custo),
    0
  );

  const visiveis = produtos
    .filter((p) => {
      if (filtroAtivo === "baixo") return criticidade(p) <= 1;
      if (filtroAtivo === "zerado") return criticidade(p) === 0;
      return true;
    })
    .sort(
      (a, b) => criticidade(a) - criticidade(b) || a.nome.localeCompare(b.nome, "pt-BR")
    );

  const opcoes: ProdutoOpcao[] = produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    codigo: p.codigo,
    sigla: siglaDe(p.unidade),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Estoque"
        subtitulo="Saldo dos produtos e registro de movimentações"
        acao={
          <ButtonLink href="/estoque/validade" variante="secondary">
            <TriangleAlert className="size-4" />
            Controle de validade
          </ButtonLink>
        }
      />

      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Resumo
          rotulo="Produtos com estoque"
          valor={String(produtos.length)}
          icone={Boxes}
        />
        <Resumo
          rotulo="Abaixo do mínimo"
          valor={String(abaixoDoMinimo.length)}
          icone={TriangleAlert}
          destaque={abaixoDoMinimo.length > 0}
        />
        <Resumo
          rotulo="Valor do estoque (custo)"
          valor={formatBRL(valorTotal)}
          icone={Wallet}
        />
      </div>

      <Card>
        <CardTitulo>Registrar movimentação</CardTitulo>
        {produtos.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhum produto com controle de estoque ainda. Cadastre um item do
            tipo produto e marque &quot;controlar o estoque&quot;.
          </p>
        ) : (
          <MovimentacaoForm produtos={opcoes} itemInicial={item} />
        )}
      </Card>

      <div>
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtro de estoque">
          {ABAS.map((aba) => {
            const ativa = aba.valor === filtroAtivo;
            return (
              <Link
                key={aba.valor}
                href={aba.valor === "todos" ? "/estoque" : `/estoque?filtro=${aba.valor}`}
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

        {visiveis.length === 0 ? (
          <EmptyState
            icone={<CircleSlash className="size-7" strokeWidth={1.8} />}
            titulo={
              filtroAtivo === "todos"
                ? "Nenhum produto com estoque"
                : "Nada por aqui"
            }
            mensagem={
              filtroAtivo === "todos"
                ? "Ative o controle de estoque nos produtos do catálogo."
                : "Nenhum produto nessa situação. Estoque em dia."
            }
          />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-y divide-white/15">
              {visiveis.map((p) => {
                const nivel = criticidade(p);
                const sigla = siglaDe(p.unidade);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/itens/${p.id}`}
                      className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                          <span className="truncate">{p.nome}</span>
                          {!p.ativo && <Badge tom="neutro">Inativo</Badge>}
                        </p>
                        <p className="truncate text-sm text-ink-muted">
                          {[
                            p.codigo,
                            `Mínimo ${formatQuantidade(p.estoque_minimo, sigla)}`,
                            `Custo ${formatBRL(p.preco_custo)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold text-ink tabular-nums">
                          {formatQuantidade(p.estoque_atual, sigla)}
                        </span>
                        {nivel === 0 ? (
                          <Badge tom="danger">Zerado</Badge>
                        ) : nivel === 1 ? (
                          <Badge tom="danger">Abaixo do mínimo</Badge>
                        ) : (
                          <Badge tom="success">Em dia</Badge>
                        )}
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
