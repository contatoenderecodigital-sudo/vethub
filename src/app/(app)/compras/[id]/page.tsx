import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, PackageCheck, Truck } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO } from "@/lib/format";
import type { CompraStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { formatQuantidade } from "../../itens/formato";
import { BadgeCompra } from "../badge-compra";
import { cancelarCompra, receberCompra } from "../actions";

export const metadata = { title: "Compra" };

interface CompraDetalhe {
  id: string;
  data: string;
  numero_nota: string | null;
  valor_total: number;
  frete: number;
  status: CompraStatus;
  observacao: string | null;
  created_at: string;
  fornecedor: { id: string; nome: string } | { id: string; nome: string }[] | null;
  responsavel: { nome: string } | { nome: string }[] | null;
}

interface ItemDetalhe {
  id: string;
  item_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  lote: string | null;
  validade: string | null;
}

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}

export default async function CompraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: compra } = await supabase
    .from("compra")
    .select(
      "id, data, numero_nota, valor_total, frete, status, observacao, created_at, " +
        "fornecedor:fornecedor_id (id, nome), responsavel:registrado_por (nome)"
    )
    .eq("id", id)
    .single<CompraDetalhe>();

  if (!compra) notFound();

  const { data: itens } = await supabase
    .from("compra_item")
    .select("id, item_id, descricao, quantidade, valor_unitario, lote, validade")
    .eq("compra_id", id)
    .order("id")
    .returns<ItemDetalhe[]>();

  const linhas = itens ?? [];
  const fornecedor = primeiro(compra.fornecedor);
  const responsavel = primeiro(compra.responsavel);
  const ehAdmin = usuario.papel === "admin";

  const somaItens = linhas.reduce(
    (soma, i) => soma + Number(i.quantidade) * Number(i.valor_unitario),
    0
  );

  const receber = receberCompra.bind(null, id);
  const cancelar = cancelarCompra.bind(null, id);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={compra.numero_nota ? `Compra NF ${compra.numero_nota}` : "Compra sem nota"}
        subtitulo={[
          formatDataISO(compra.data),
          fornecedor?.nome,
          responsavel ? `Lançada por ${responsavel.nome}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        acao={
          <>
            <BadgeCompra status={compra.status} />
            {ehAdmin && compra.status === "pendente" && (
              <form action={receber}>
                <ConfirmButton
                  mensagem="Receber a mercadoria? Isso dá entrada no estoque, atualiza o custo dos produtos e gera a conta a pagar do fornecedor."
                >
                  <PackageCheck className="size-4" />
                  Receber mercadoria
                </ConfirmButton>
              </form>
            )}
            {ehAdmin && compra.status !== "cancelada" && (
              <form action={cancelar}>
                <ConfirmButton
                  variante="danger"
                  mensagem={
                    compra.status === "recebida"
                      ? "Cancelar esta compra? O estoque será estornado com saídas e a conta a pagar em aberto será cancelada."
                      : "Cancelar esta compra? Ela sai dos totais, mas fica no histórico."
                  }
                >
                  <Ban className="size-4" />
                  Cancelar compra
                </ConfirmButton>
              </form>
            )}
            <ButtonLink href="/compras" variante="secondary">
              Voltar
            </ButtonLink>
          </>
        }
      />

      {erro && (
        <p className="rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      {compra.status === "pendente" && (
        <p className="glass flex items-start gap-2 rounded-2xl px-4 py-3 text-sm text-ink-muted">
          <Truck className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          <span>
            Nota lançada, mercadoria ainda não recebida. Ao confirmar o
            recebimento, os itens vinculados a produtos entram no estoque, o
            custo do catálogo é atualizado e uma conta a pagar vence em 30 dias.
          </span>
        </p>
      )}

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left text-xs tracking-wider text-ink-muted uppercase">
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="w-28 px-4 py-3 font-medium">Lote</th>
              <th className="w-28 px-4 py-3 font-medium">Validade</th>
              <th className="w-24 px-4 py-3 text-right font-medium">Qtd</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Custo unit.</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {linhas.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3 text-ink">
                  {i.item_id ? (
                    <Link
                      href={`/itens/${i.item_id}`}
                      className="link-vidro"
                    >
                      {i.descricao}
                    </Link>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      {i.descricao}
                      <Badge tom="neutro">Sem estoque</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{i.lote ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted tabular-nums">
                  {i.validade ? formatDataISO(i.validade) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {formatQuantidade(i.quantidade)}
                </td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {formatBRL(i.valor_unitario)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                  {formatBRL(Number(i.quantidade) * Number(i.valor_unitario))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/20">
              <td colSpan={5} className="px-4 py-2 text-right text-ink-muted">
                Itens
              </td>
              <td className="px-4 py-2 text-right text-ink tabular-nums">
                {formatBRL(somaItens)}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-ink-muted">
                Frete
              </td>
              <td className="px-4 py-2 text-right text-ink tabular-nums">
                {formatBRL(compra.frete)}
              </td>
            </tr>
            <tr className="border-t-2 border-white/20 bg-brand-mint/10">
              <td colSpan={5} className="px-4 py-3 text-right font-bold text-ink">
                TOTAL DA NOTA
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-ink tabular-nums">
                {formatBRL(compra.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {compra.observacao && (
        <Card>
          <CardTitulo>Observação</CardTitulo>
          <p className="whitespace-pre-wrap text-sm text-ink-muted">
            {compra.observacao}
          </p>
        </Card>
      )}
    </div>
  );
}
