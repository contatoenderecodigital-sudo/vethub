import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Printer, User } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import { rotuloFormaVenda, type VendaStatus } from "@/lib/types";
import { Card, CardTitulo } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cancelarVenda } from "../../pdv/actions";
import { BadgeVenda } from "../badge-venda";

export const metadata = { title: "Venda" };

interface VendaDetalhe {
  id: string;
  numero: number;
  data: string;
  subtotal: number;
  desconto: number;
  valor_total: number;
  status: VendaStatus;
  observacao: string | null;
  tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
  vendedor: { nome: string } | { nome: string }[] | null;
}

interface ItemDetalhe {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
}

interface PagamentoDetalhe {
  id: string;
  forma: string;
  valor: number;
  parcelas: number;
  autorizacao: string | null;
}

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return (Array.isArray(valor) ? valor[0] : valor) ?? null;
}

export default async function VendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data: venda } = await supabase
    .from("venda")
    .select(
      "id, numero, data, subtotal, desconto, valor_total, status, observacao, " +
        "tutor:tutor_id (id, nome), vendedor:vendedor_id (nome)"
    )
    .eq("id", id)
    .maybeSingle<VendaDetalhe>();

  if (!venda) notFound();

  const [{ data: itens }, { data: pagamentos }] = await Promise.all([
    supabase
      .from("venda_item")
      .select("id, descricao, quantidade, valor_unitario, desconto")
      .eq("venda_id", id)
      .order("id")
      .returns<ItemDetalhe[]>(),
    supabase
      .from("pagamento_venda")
      .select("id, forma, valor, parcelas, autorizacao")
      .eq("venda_id", id)
      .order("created_at")
      .returns<PagamentoDetalhe[]>(),
  ]);

  const tutor = primeiro(venda.tutor);
  const vendedor = primeiro(venda.vendedor);
  const ehAdmin = usuario.papel === "admin";

  return (
    <div>
      <Link
        href="/vendas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Voltar para as vendas
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              Venda nº {venda.numero}
            </h1>
            <BadgeVenda status={venda.status} />
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            {formatDataHora(venda.data)}
            {vendedor && <> · Vendedor: {vendedor.nome}</>}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {tutor ? (
              <Link
                href={`/tutores/${tutor.id}`}
                className="inline-flex items-center gap-1.5 font-medium link-vidro"
              >
                <User className="size-3.5" />
                {tutor.nome}
              </Link>
            ) : (
              "Venda avulsa (sem tutor)"
            )}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end [&>a]:min-h-11 [&>form>button]:min-h-11 sm:[&>a]:min-h-10 sm:[&>form>button]:min-h-10">
          <ButtonLink href={`/vendas/${venda.id}/comprovante`} variante="secondary">
            <Printer className="size-4 shrink-0" />
            Imprimir comprovante
          </ButtonLink>
          {ehAdmin && venda.status !== "cancelada" && (
            <form action={cancelarVenda.bind(null, venda.id)}>
              <ConfirmButton
                variante="danger"
                mensagem={`Cancelar a venda nº ${venda.numero}? O estoque dos produtos volta e a conta a receber é cancelada.`}
              >
                <Ban className="size-4" />
                Cancelar venda
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      {erro && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md"
        >
          {erro}
        </p>
      )}

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="w-20 px-4 py-3 text-right font-medium">Qtd</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Valor unit.</th>
              <th className="w-28 px-4 py-3 text-right font-medium">Desconto</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {(itens ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-ink">{item.descricao}</td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {Number(item.quantidade).toLocaleString("pt-BR", {
                    maximumFractionDigits: 3,
                  })}
                </td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {formatBRL(item.valor_unitario)}
                </td>
                <td className="px-4 py-3 text-right text-ink-muted tabular-nums">
                  {Number(item.desconto) > 0 ? `− ${formatBRL(item.desconto)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                  {formatBRL(
                    Number(item.quantidade) * Number(item.valor_unitario) -
                      Number(item.desconto)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-white/20">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-ink-muted">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right text-ink tabular-nums">
                {formatBRL(venda.subtotal)}
              </td>
            </tr>
            {Number(venda.desconto) > 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-ink-muted">
                  Desconto
                </td>
                <td className="px-4 py-2 text-right text-ink tabular-nums">
                  − {formatBRL(venda.desconto)}
                </td>
              </tr>
            )}
            <tr className="bg-brand-mint/10">
              <td colSpan={4} className="px-4 py-3 text-right font-bold text-ink">
                TOTAL
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-ink tabular-nums">
                {formatBRL(venda.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardTitulo>Pagamento</CardTitulo>
          {(pagamentos ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="divide-y divide-white/15 text-sm">
              {(pagamentos ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-ink">{rotuloFormaVenda(p.forma)}</span>
                    {p.parcelas > 1 && (
                      <span className="block text-xs text-ink-muted">
                        {p.parcelas}x de {formatBRL(Number(p.valor) / p.parcelas)}
                      </span>
                    )}
                    {p.autorizacao && (
                      <span className="block text-xs text-ink-muted">
                        Autorização: {p.autorizacao}
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-ink tabular-nums">
                    {formatBRL(p.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitulo>Observação</CardTitulo>
          <p className="whitespace-pre-wrap text-sm text-ink-muted">
            {venda.observacao?.trim() || "Sem observações."}
          </p>
        </Card>
      </div>
    </div>
  );
}
