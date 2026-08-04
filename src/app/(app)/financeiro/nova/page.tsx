import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import type { CategoriaFinanceira, ContaTipo } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ContaForm } from "../conta-form";
import { criarConta } from "../actions";

export const metadata = { title: "Nova conta" };

export default async function NovaContaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; erro?: string }>;
}) {
  const { tipo: tipoParam, erro } = await searchParams;
  const tipo: ContaTipo = tipoParam === "pagar" ? "pagar" : "receber";

  const { supabase } = await getSessao();
  const { data: categorias } = await supabase
    .from("categoria_financeira")
    .select("id, nome, tipo")
    .order("nome")
    .returns<Pick<CategoriaFinanceira, "id" | "nome" | "tipo">[]>();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo={tipo === "receber" ? "Nova conta a receber" : "Nova conta a pagar"}
        subtitulo="Lançamento no contas a pagar e receber"
      />
      <Card>
        <ContaForm
          action={criarConta}
          categorias={categorias ?? []}
          permitirRepetir
          valoresIniciais={{
            tipo,
            descricao: "",
            categoria_id: "",
            valor: "",
            vencimento: hojeISO(),
            fornecedor: "",
            observacao: "",
          }}
          cancelarHref={`/financeiro/${tipo}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
