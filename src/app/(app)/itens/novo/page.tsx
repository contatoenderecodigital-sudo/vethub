import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ItemForm } from "../item-form";
import { carregarOpcoesCatalogo } from "../dados";
import { criarItem } from "../actions";

export const metadata = { title: "Novo item" };

export default async function NovoItemPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { usuario } = await getSessao();

  // Recepção consulta o catálogo, mas não cadastra.
  if (usuario.papel === "recepcao") redirect("/itens");

  const { grupos, marcas, unidades } = await carregarOpcoesCatalogo();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Novo item" subtitulo="Produto ou serviço do catálogo" />
      <Card>
        <ItemForm
          action={criarItem}
          grupos={grupos}
          marcas={marcas}
          unidades={unidades}
          cancelarHref="/itens"
          erro={erro}
        />
      </Card>
    </div>
  );
}
