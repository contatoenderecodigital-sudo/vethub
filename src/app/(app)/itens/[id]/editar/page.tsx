import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Item } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ItemForm } from "../../item-form";
import { carregarOpcoesCatalogo } from "../../dados";
import { atualizarItem } from "../../actions";

export const metadata = { title: "Editar item" };

export default async function EditarItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  if (usuario.papel === "recepcao") redirect(`/itens/${id}`);

  const [{ data: item }, opcoes] = await Promise.all([
    supabase.from("item").select("*").eq("id", id).single<Item>(),
    carregarOpcoesCatalogo(),
  ]);

  if (!item) notFound();

  const salvar = atualizarItem.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo={`Editar ${item.nome}`} />
      <Card>
        <ItemForm
          action={salvar}
          item={item}
          grupos={opcoes.grupos}
          marcas={opcoes.marcas}
          unidades={opcoes.unidades}
          cancelarHref={`/itens/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
