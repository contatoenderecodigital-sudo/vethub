import { notFound, redirect } from "next/navigation";
import { Save } from "lucide-react";
import { getSessao } from "@/lib/auth";
import type { OrcamentoStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ItensEditor } from "../../itens-editor";
import { atualizarItens } from "../../actions";

export const metadata = { title: "Editar orçamento" };

interface OrcamentoParaEditar {
  id: string;
  status: OrcamentoStatus;
  pet: { nome: string; especie: string } | null;
}

interface ItemParaEditar {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export default async function EditarOrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: orcamento } = await supabase
    .from("orcamento")
    .select("id, status, pet:pet_id (nome, especie)")
    .eq("id", id)
    .single<OrcamentoParaEditar>();

  if (!orcamento) notFound();

  // Só orçamentos abertos podem ser editados.
  if (orcamento.status !== "aberto") redirect(`/orcamentos/${id}`);

  const { data: itens } = await supabase
    .from("orcamento_item")
    .select("descricao, quantidade, valor_unitario")
    .eq("orcamento_id", id)
    .order("id")
    .returns<ItemParaEditar[]>();

  const itensIniciais = (itens ?? []).map((item) => ({
    descricao: item.descricao,
    quantidade: Number(item.quantidade),
    valor_unitario: Number(item.valor_unitario),
  }));

  const salvar = atualizarItens.bind(null, id);
  const pet = orcamento.pet;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Editar itens do orçamento"
        subtitulo={pet ? pet.nome : undefined}
      />
      <Card>
        <form action={salvar} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <ItensEditor
            itensIniciais={itensIniciais.length > 0 ? itensIniciais : undefined}
          />

          <div className="flex gap-2 pt-2">
            <SubmitButton>
            <Save className="size-4" />
            Salvar itens
          </SubmitButton>
            <ButtonLink href={`/orcamentos/${id}`} variante="secondary">
              Cancelar
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
