import { notFound } from "next/navigation";
import {
  ArrowLeftRight,
  Boxes,
  Package,
  Pencil,
  Stethoscope,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import {
  ROTULO_MOVIMENTACAO,
  ROTULO_TIPO_ITEM,
  type Item,
  type MovimentacaoTipo,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { abaixoDoMinimo, formatPercentual, formatQuantidade } from "../formato";
import { excluirItem } from "../actions";

export const metadata = { title: "Item" };

interface MovimentacaoLinha {
  id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  valor_unitario: number | null;
  motivo: string | null;
  origem: string | null;
  data: string;
  lote: { codigo: string } | { codigo: string }[] | null;
  responsavel: { nome: string } | { nome: string }[] | null;
}

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}

const TOM_MOVIMENTACAO: Record<MovimentacaoTipo, "success" | "info" | "danger" | "pending"> =
  {
    entrada: "success",
    saida: "info",
    perda: "danger",
    ajuste: "pending",
  };

/** Uma linha "rótulo: valor" da ficha. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-ink-muted">{rotulo}</dt>
      <dd className="text-sm font-medium text-ink">{valor}</dd>
    </div>
  );
}

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  const { data: item } = await supabase
    .from("item")
    .select(
      "*, grupo:grupo_id (id, nome), marca:marca_id (id, nome), unidade:unidade_id (id, nome, sigla)"
    )
    .eq("id", id)
    .single<Item>();

  if (!item) notFound();

  const grupo = primeiro(item.grupo);
  const marca = primeiro(item.marca);
  const unidade = primeiro(item.unidade);
  const controla = item.tipo === "produto" && item.controla_estoque;
  const critico = abaixoDoMinimo(item);

  const { data: movimentacoes } = controla
    ? await supabase
        .from("movimentacao_estoque")
        .select(
          "id, tipo, quantidade, valor_unitario, motivo, origem, data, lote:lote_id (codigo), responsavel:registrado_por (nome)"
        )
        .eq("item_id", id)
        .order("data", { ascending: false })
        .limit(10)
        .returns<MovimentacaoLinha[]>()
    : { data: null };

  const excluirComId = excluirItem.bind(null, id);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={item.nome}
        subtitulo={[
          ROTULO_TIPO_ITEM[item.tipo],
          item.codigo,
          grupo?.nome,
        ]
          .filter(Boolean)
          .join(" · ")}
        acao={
          podeEditar ? (
            <>
              {controla && (
                <ButtonLink href={`/estoque?item=${item.id}`} variante="secondary">
                  <ArrowLeftRight className="size-4" />
                  Movimentar
                </ButtonLink>
              )}
              <ButtonLink href={`/itens/${item.id}/editar`} variante="secondary">
                <Pencil className="size-4" />
                Editar
              </ButtonLink>
            </>
          ) : undefined
        }
      />

      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CardTitulo className="mb-0">Dados do item</CardTitulo>
          {!item.ativo && <Badge tom="neutro">Inativo</Badge>}
          {item.medicamento && <Badge tom="info">Medicamento</Badge>}
          {item.requer_receita && <Badge tom="pending">Exige receita</Badge>}
          {item.vacina && <Badge tom="brand">Vacina</Badge>}
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Dado rotulo="Preço de venda" valor={formatBRL(item.preco_venda)} />
          <Dado rotulo="Preço de custo" valor={formatBRL(item.preco_custo)} />
          <Dado
            rotulo="Comissão"
            valor={formatPercentual(item.comissao_percentual ?? 0)}
          />
          <Dado rotulo="Código" valor={item.codigo} />
          <Dado rotulo="Código de barras" valor={item.codigo_barras} />
          <Dado rotulo="Grupo" valor={grupo?.nome ?? null} />
          <Dado rotulo="Marca" valor={marca?.nome ?? null} />
          <Dado
            rotulo="Unidade"
            valor={unidade ? `${unidade.nome} (${unidade.sigla})` : null}
          />
          <Dado
            rotulo="Duração"
            valor={item.duracao_minutos ? `${item.duracao_minutos} min` : null}
          />
          <Dado rotulo="Princípio ativo" valor={item.principio_ativo} />
        </dl>

        {item.descricao && (
          <p className="mt-4 whitespace-pre-wrap border-t border-edge pt-3 text-sm text-ink-muted">
            {item.descricao}
          </p>
        )}
      </Card>

      {controla && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <CardTitulo className="mb-0">Estoque</CardTitulo>
            {podeEditar && (
              <ButtonLink
                href={`/estoque?item=${item.id}`}
                variante="secondary"
                tamanho="sm"
              >
                <ArrowLeftRight className="size-4" />
                Movimentar
              </ButtonLink>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-edge bg-white/10 px-4 py-3">
              <Boxes className="size-6 shrink-0 text-ink-muted" strokeWidth={1.8} />
              <div>
                <p className="text-xs text-ink-muted">Saldo atual</p>
                <p className="text-xl font-bold text-ink tabular-nums">
                  {formatQuantidade(item.estoque_atual, unidade?.sigla)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Estoque mínimo</p>
              <p className="text-sm font-medium text-ink tabular-nums">
                {formatQuantidade(item.estoque_minimo, unidade?.sigla)}
              </p>
            </div>
            {critico && (
              <Badge tom="danger" className="gap-1">
                <TriangleAlert className="size-3.5" />
                Abaixo do mínimo
              </Badge>
            )}
          </div>

          <p className="mt-4 mb-2 text-sm font-semibold text-ink">
            Últimas movimentações
          </p>
          {!movimentacoes || movimentacoes.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhuma movimentação registrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-white/15">
              {movimentacoes.map((m) => {
                const lote = primeiro(m.lote)?.codigo ?? null;
                const responsavel = primeiro(m.responsavel)?.nome ?? null;
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                  >
                    <Badge tom={TOM_MOVIMENTACAO[m.tipo]}>
                      {ROTULO_MOVIMENTACAO[m.tipo]}
                    </Badge>
                    <span className="font-medium text-ink tabular-nums">
                      {m.tipo === "entrada" ? "+" : "−"}
                      {formatQuantidade(m.quantidade, unidade?.sigla)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                      {[m.motivo, m.origem, lote ? `Lote ${lote}` : null, responsavel]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {formatDataHora(m.data)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {item.tipo === "servico" && (
        <Card>
          <CardTitulo>Serviço</CardTitulo>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Stethoscope className="size-4" strokeWidth={1.8} />
            {item.duracao_minutos
              ? `Duração média de ${item.duracao_minutos} minutos.`
              : "Duração média não informada."}
          </p>
        </Card>
      )}

      {item.tipo === "produto" && !item.controla_estoque && (
        <Card>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Package className="size-4" strokeWidth={1.8} />
            Este produto não tem controle de estoque. Ative em Editar para
            acompanhar entradas e saídas.
          </p>
        </Card>
      )}

      {podeEditar && (
        <form action={excluirComId}>
          <ConfirmButton
            variante="danger"
            tamanho="sm"
            mensagem={`Excluir "${item.nome}" do catálogo? Essa ação não pode ser desfeita.`}
          >
            <Trash2 className="size-4" />
            Excluir item
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
