import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FornecedorForm } from "../fornecedor-form";
import { criarFornecedor } from "../actions";

export const metadata = { title: "Novo fornecedor" };

export default async function NovoFornecedorPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo fornecedor" />
      <Card>
        <FornecedorForm
          action={criarFornecedor}
          cancelarHref="/fornecedores"
          erro={erro}
        />
      </Card>
    </div>
  );
}
