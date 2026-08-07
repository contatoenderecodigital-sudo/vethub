import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessao } from "@/lib/auth";
import {
  formatBRL,
  formatDataHora,
  formatEndereco,
  formatTelefone,
} from "@/lib/format";
import { mascaraCNPJ } from "@/lib/validacao";
import { rotuloFormaVenda, type Clinica, type VendaStatus } from "@/lib/types";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata = { title: "Comprovante" };

interface VendaComprovante {
  id: string;
  numero: number;
  data: string;
  subtotal: number;
  desconto: number;
  valor_total: number;
  status: VendaStatus;
  observacao: string | null;
  tutor: { nome: string } | { nome: string }[] | null;
  vendedor: { nome: string } | { nome: string }[] | null;
}

interface ItemComprovante {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
}

interface PagamentoComprovante {
  id: string;
  forma: string;
  valor: number;
  parcelas: number;
}

function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return (Array.isArray(valor) ? valor[0] : valor) ?? null;
}

/**
 * Regras de impressão: o cupom é a ÚNICA coisa no papel. O cabeçalho, a
 * navegação lateral e a barra inferior do app somem, e o fundo colorido do
 * body (::before) também: bobina térmica é preto sobre branco.
 */
const CSS_IMPRESSAO = `
@page { size: 80mm auto; margin: 4mm; }
@media print {
  body::before { display: none !important; }
  header, aside, nav { display: none !important; }
  main { padding: 0 !important; }
  .cupom-area { padding: 0 !important; }
  .cupom {
    max-width: none !important;
    width: auto !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
}
`;

export default async function ComprovantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, usuario } = await getSessao();

  const { data: venda } = await supabase
    .from("venda")
    .select(
      "id, numero, data, subtotal, desconto, valor_total, status, observacao, " +
        "tutor:tutor_id (nome), vendedor:vendedor_id (nome)"
    )
    .eq("id", id)
    .maybeSingle<VendaComprovante>();

  if (!venda) notFound();

  const [{ data: itens }, { data: pagamentos }, { data: clinica }] =
    await Promise.all([
      supabase
        .from("venda_item")
        .select("id, descricao, quantidade, valor_unitario, desconto")
        .eq("venda_id", id)
        .order("id")
        .returns<ItemComprovante[]>(),
      supabase
        .from("pagamento_venda")
        .select("id, forma, valor, parcelas")
        .eq("venda_id", id)
        .order("created_at")
        .returns<PagamentoComprovante[]>(),
      supabase
        .from("clinica")
        .select(
          "id, nome, cnpj, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf"
        )
        .eq("id", usuario.clinica_id)
        .maybeSingle<Clinica>(),
    ]);

  const tutor = primeiro(venda.tutor);
  const vendedor = primeiro(venda.vendedor);
  const endereco = clinica ? formatEndereco(clinica) : "-";

  return (
    <div className="cupom-area">
      <style>{CSS_IMPRESSAO}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/vendas/${venda.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Voltar para a venda
        </Link>
        <BotaoImprimir />
      </div>

      {/* Cupom: fundo branco, texto preto, igual sai na bobina */}
      <div className="cupom mx-auto max-w-[80mm] rounded-lg bg-white p-4 font-mono text-[11px] leading-snug text-black shadow-xl">
        <header className="text-center">
          <h1 className="text-sm font-bold uppercase">{clinica?.nome ?? "Clínica"}</h1>
          {clinica?.cnpj && <p>CNPJ {mascaraCNPJ(clinica.cnpj)}</p>}
          {endereco !== "-" && <p>{endereco}</p>}
          {clinica?.telefone && <p>Tel. {formatTelefone(clinica.telefone)}</p>}
        </header>

        <p className="my-2 border-y border-dashed border-black py-1 text-center font-bold uppercase">
          Comprovante não fiscal
        </p>

        <div className="space-y-0.5">
          <p>
            <span className="font-bold">Venda nº:</span> {venda.numero}
          </p>
          <p>
            <span className="font-bold">Data:</span> {formatDataHora(venda.data)}
          </p>
          <p>
            <span className="font-bold">Cliente:</span>{" "}
            {tutor ? tutor.nome : "Consumidor não identificado"}
          </p>
          {vendedor && (
            <p>
              <span className="font-bold">Atendente:</span> {vendedor.nome}
            </p>
          )}
          {venda.status === "cancelada" && (
            <p className="mt-1 border border-black px-1 py-0.5 text-center font-bold uppercase">
              Venda cancelada
            </p>
          )}
        </div>

        <table className="mt-2 w-full border-t border-dashed border-black pt-1">
          <thead>
            <tr className="border-b border-dashed border-black text-left">
              <th className="py-1 font-bold">Item</th>
              <th className="py-1 pl-2 text-right font-bold">Qtd</th>
              <th className="py-1 pl-2 text-right font-bold">Unit.</th>
              <th className="py-1 pl-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {(itens ?? []).map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-0.5 pr-1">{item.descricao}</td>
                <td className="py-0.5 pl-2 text-right tabular-nums">
                  {Number(item.quantidade).toLocaleString("pt-BR", {
                    maximumFractionDigits: 3,
                  })}
                </td>
                <td className="py-0.5 pl-2 text-right tabular-nums">
                  {formatBRL(item.valor_unitario)}
                </td>
                <td className="py-0.5 pl-2 text-right tabular-nums">
                  {formatBRL(
                    Number(item.quantidade) * Number(item.valor_unitario) -
                      Number(item.desconto)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-0.5 border-t border-dashed border-black pt-1">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatBRL(venda.subtotal)}</span>
          </p>
          {Number(venda.desconto) > 0 && (
            <p className="flex justify-between">
              <span>Desconto</span>
              <span className="tabular-nums">− {formatBRL(venda.desconto)}</span>
            </p>
          )}
          <p className="flex justify-between border-t border-black pt-1 text-sm font-bold">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatBRL(venda.valor_total)}</span>
          </p>
        </div>

        <div className="mt-2 space-y-0.5 border-t border-dashed border-black pt-1">
          <p className="font-bold uppercase">Pagamento</p>
          {(pagamentos ?? []).length === 0 ? (
            <p>Sem pagamentos registrados.</p>
          ) : (
            (pagamentos ?? []).map((p) => (
              <p key={p.id} className="flex justify-between">
                <span>
                  {rotuloFormaVenda(p.forma)}
                  {p.parcelas > 1 ? ` (${p.parcelas}x)` : ""}
                </span>
                <span className="tabular-nums">{formatBRL(p.valor)}</span>
              </p>
            ))
          )}
        </div>

        {venda.observacao?.trim() && (
          <p className="mt-2 border-t border-dashed border-black pt-1">
            Obs.: {venda.observacao}
          </p>
        )}

        <p className="mt-3 border-t border-dashed border-black pt-2 text-center font-bold uppercase">
          Obrigado pela preferência
        </p>
        <p className="text-center">Volte sempre. A saúde do seu pet agradece.</p>
      </div>
    </div>
  );
}
