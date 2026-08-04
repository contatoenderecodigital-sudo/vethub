import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import type { CategoriaFinanceira, Conta } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { ContaForm } from "../../conta-form";
import { atualizarConta } from "../../actions";

export const metadata = { title: "Editar conta" };

type ContaEdicao = Pick<
  Conta,
  | "id"
  | "tipo"
  | "descricao"
  | "categoria_id"
  | "tutor_id"
  | "fornecedor"
  | "valor"
  | "valor_pago"
  | "vencimento"
  | "observacao"
  | "status"
> & { tutor: { id: string; nome: string } | null };

export default async function EditarContaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const [{ data: conta }, { data: categorias }] = await Promise.all([
    supabase
      .from("conta")
      .select(
        "id, tipo, descricao, categoria_id, tutor_id, fornecedor, valor, valor_pago, vencimento, observacao, status, tutor:tutor_id (id, nome)"
      )
      .eq("id", id)
      .single<ContaEdicao>(),
    supabase
      .from("categoria_financeira")
      .select("id, nome, tipo")
      .order("nome")
      .returns<Pick<CategoriaFinanceira, "id" | "nome" | "tipo">[]>(),
  ]);

  if (!conta) notFound();

  const tutorInicial: OpcaoBusca | undefined = conta.tutor
    ? { id: conta.tutor.id, rotulo: conta.tutor.nome }
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Editar conta"
        subtitulo={
          Number(conta.valor_pago) > 0
            ? `Já baixado: ${formatBRL(conta.valor_pago)}`
            : undefined
        }
      />
      <Card>
        <ContaForm
          action={atualizarConta.bind(null, conta.id)}
          categorias={categorias ?? []}
          valoresIniciais={{
            tipo: conta.tipo,
            descricao: conta.descricao,
            categoria_id: conta.categoria_id ?? "",
            // valor vem do banco como "1234.50": vira "1.234,50" na máscara
            valor: Number(conta.valor).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            vencimento: conta.vencimento,
            fornecedor: conta.fornecedor ?? "",
            observacao: conta.observacao ?? "",
          }}
          tutorInicial={tutorInicial}
          cancelarHref={`/financeiro/${conta.tipo}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
