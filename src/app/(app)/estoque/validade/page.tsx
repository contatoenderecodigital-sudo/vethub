import Link from "next/link";
import { CalendarClock, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { diasAte, formatDataISO, plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatQuantidade } from "../../itens/formato";
import { excluirLote } from "../actions";
import { LoteForm } from "../lote-form";
import type { ProdutoOpcao } from "../movimentacao-form";

export const metadata = { title: "Controle de validade" };

/** Um lote entra na faixa âmbar quando falta 60 dias ou menos. */
const ALERTA_DIAS = 60;

type Periodo = "todos" | "vencidos" | "30" | "60" | "90";

const ABAS: { valor: Periodo; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "vencidos", rotulo: "Vencidos" },
  { valor: "30", rotulo: "Vencem em 30 dias" },
  { valor: "60", rotulo: "Vencem em 60 dias" },
  { valor: "90", rotulo: "Vencem em 90 dias" },
];

interface LoteLinha {
  id: string;
  codigo: string;
  validade: string | null;
  quantidade: number;
  item: ItemDoLote | ItemDoLote[] | null;
}

interface ItemDoLote {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: { sigla: string } | { sigla: string }[] | null;
}

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

interface ProdutoLista {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: { sigla: string } | { sigla: string }[] | null;
}

export default async function ValidadePage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; erro?: string }>;
}) {
  const { periodo, erro } = await searchParams;
  const periodoAtivo: Periodo =
    ABAS.find((a) => a.valor === periodo)?.valor ?? "todos";

  const { supabase, usuario } = await getSessao();
  const podeExcluir = usuario.papel !== "recepcao";

  const [{ data: lotesData }, { data: produtosData }] = await Promise.all([
    supabase
      .from("lote")
      .select(
        "id, codigo, validade, quantidade, item:item_id (id, nome, codigo, unidade:unidade_id (sigla))"
      )
      .not("validade", "is", null)
      .order("validade")
      .limit(300)
      .returns<LoteLinha[]>(),
    supabase
      .from("item")
      .select("id, nome, codigo, unidade:unidade_id (sigla)")
      .eq("tipo", "produto")
      .eq("controla_estoque", true)
      .order("nome")
      .limit(500)
      .returns<ProdutoLista[]>(),
  ]);

  const lotes = lotesData ?? [];

  const visiveis = lotes.filter((lote) => {
    const dias = diasAte(lote.validade);
    if (dias === null) return false;
    if (periodoAtivo === "vencidos") return dias < 0;
    if (periodoAtivo === "todos") return true;
    return dias >= 0 && dias <= Number(periodoAtivo);
  });

  const produtos: ProdutoOpcao[] = (produtosData ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    codigo: p.codigo,
    sigla: primeiro(p.unidade)?.sigla ?? null,
  }));

  const vencidos = lotes.filter((l) => (diasAte(l.validade) ?? 0) < 0).length;

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Controle de validade"
        subtitulo={
          vencidos > 0
            ? `${lotes.length} lotes · ${vencidos} vencido${vencidos > 1 ? "s" : ""}`
            : plural(lotes.length, "lote") + " com validade"
        }
        acao={
          <ButtonLink href="/estoque" variante="secondary">
            Voltar ao estoque
          </ButtonLink>
        }
      />

      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <Card>
        <CardTitulo>Cadastrar lote</CardTitulo>
        {produtos.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhum produto com controle de estoque ainda. Cadastre um item do
            tipo produto e marque &quot;controlar o estoque&quot;.
          </p>
        ) : (
          <LoteForm produtos={produtos} anoLimite={new Date().getFullYear() + 20} />
        )}
      </Card>

      <div>
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtro por período">
          {ABAS.map((aba) => {
            const ativa = aba.valor === periodoAtivo;
            return (
              <Link
                key={aba.valor}
                href={
                  aba.valor === "todos"
                    ? "/estoque/validade"
                    : `/estoque/validade?periodo=${aba.valor}`
                }
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
            icone={<CalendarClock className="size-7" strokeWidth={1.8} />}
            titulo={
              periodoAtivo === "todos"
                ? "Nenhum lote com validade"
                : "Nada nesse período"
            }
            mensagem={
              periodoAtivo === "todos"
                ? "Cadastre os lotes dos produtos para acompanhar o vencimento."
                : "Nenhum lote vence nesse intervalo."
            }
          />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-y divide-white/15">
              {visiveis.map((lote) => {
                const item = primeiro(lote.item);
                const sigla = primeiro(item?.unidade ?? null)?.sigla ?? null;
                const dias = diasAte(lote.validade) ?? 0;
                const vencido = dias < 0;
                const proximo = !vencido && dias <= ALERTA_DIAS;

                return (
                  <li
                    key={lote.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">
                        {item ? (
                          <Link href={`/itens/${item.id}`} className="hover:underline">
                            {item.nome}
                          </Link>
                        ) : (
                          "Produto removido"
                        )}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        Lote {lote.codigo} · Validade {formatDataISO(lote.validade)} ·{" "}
                        {formatQuantidade(lote.quantidade, sigla)}
                      </p>
                    </div>

                    {vencido ? (
                      <Badge tom="danger">Vencido</Badge>
                    ) : proximo ? (
                      <Badge tom="pending">
                        {dias === 0 ? "Vence hoje" : `Vence em ${dias} dias`}
                      </Badge>
                    ) : (
                      <Badge tom="success">Em dia</Badge>
                    )}

                    {podeExcluir && (
                      <form action={excluirLote.bind(null, lote.id)} className="shrink-0">
                        <ConfirmButton
                          variante="ghost"
                          tamanho="sm"
                          className="min-h-11 sm:min-h-10"
                          mensagem={`Excluir o lote "${lote.codigo}"?`}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Excluir lote</span>
                        </ConfirmButton>
                      </form>
                    )}
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
