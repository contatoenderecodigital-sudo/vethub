import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Handshake, Plus } from "lucide-react";
import { CompraForm, type FornecedorOpcao } from "../compra-form";
import type { ProdutoOpcao } from "../itens-editor";
import { criarCompra } from "../actions";

export const metadata = { title: "Nova compra" };

/** Teto dos selects: a clínica não tem catálogo maior que isso na prática. */
const LIMITE_OPCOES = 500;

export default async function NovaCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ fornecedor?: string; erro?: string }>;
}) {
  const { fornecedor, erro } = await searchParams;
  const { supabase } = await getSessao();

  const [{ data: fornecedores }, { data: produtos }] = await Promise.all([
    supabase
      .from("fornecedor")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
      .limit(LIMITE_OPCOES)
      .returns<FornecedorOpcao[]>(),
    supabase
      .from("item")
      .select("id, nome, codigo, preco_custo, controla_estoque")
      .eq("tipo", "produto")
      .eq("ativo", true)
      .order("nome")
      .limit(LIMITE_OPCOES)
      .returns<ProdutoOpcao[]>(),
  ]);

  const listaFornecedores = fornecedores ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader titulo="Nova compra" subtitulo="Entrada de mercadoria" />

      {listaFornecedores.length === 0 ? (
        <EmptyState
          icone={<Handshake className="size-7" strokeWidth={1.8} />}
          titulo="Nenhum fornecedor ativo"
          mensagem="Cadastre um fornecedor antes de lançar a nota de compra."
          acao={
            <ButtonLink href="/fornecedores/novo">
              <Plus className="size-4" />
              Cadastrar fornecedor
            </ButtonLink>
          }
        />
      ) : (
        <Card>
          <CompraForm
            action={criarCompra}
            fornecedores={listaFornecedores}
            produtos={produtos ?? []}
            dataInicial={hojeISO()}
            fornecedorInicial={fornecedor}
            erro={erro}
          />
        </Card>
      )}
    </div>
  );
}
