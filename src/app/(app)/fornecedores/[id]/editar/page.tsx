import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Fornecedor } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FornecedorForm } from "../../fornecedor-form";
import { atualizarFornecedor } from "../../actions";

export const metadata = { title: "Editar fornecedor" };

export default async function EditarFornecedorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: fornecedor } = await supabase
    .from("fornecedor")
    .select("*")
    .eq("id", id)
    .single<Fornecedor>();

  if (!fornecedor) notFound();

  const atualizarComId = atualizarFornecedor.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Editar fornecedor" subtitulo={fornecedor.nome} />
      <Card>
        <FornecedorForm
          action={atualizarComId}
          fornecedor={fornecedor}
          cancelarHref={`/fornecedores/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
