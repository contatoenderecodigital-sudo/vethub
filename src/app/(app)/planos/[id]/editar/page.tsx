import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { atualizarPlano } from "../../actions";
import { carregarItensDoCatalogo } from "../../dados";
import { PlanoForm } from "../../plano-form";
import type { BeneficioInicial } from "../../beneficios-editor";

export const metadata = { title: "Editar plano" };

interface PlanoDoBanco {
  id: string;
  nome: string;
  descricao: string | null;
  preco_venda: number;
  ativo: boolean;
}

export default async function EditarPlanoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  if (usuario.papel !== "admin") redirect(`/planos/${id}`);

  const [{ data: plano }, { data: beneficios }, itens] = await Promise.all([
    supabase
      .from("item")
      .select("id, nome, descricao, preco_venda, ativo")
      .eq("id", id)
      .eq("tipo", "plano")
      .single<PlanoDoBanco>(),
    supabase
      .from("plano_beneficio")
      .select("item_id, descricao, quantidade_mes, desconto_percentual")
      .eq("plano_item_id", id)
      .order("created_at")
      .returns<BeneficioInicial[]>(),
    carregarItensDoCatalogo(),
  ]);

  if (!plano) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Editar plano" subtitulo={plano.nome} />
      <Card>
        <PlanoForm
          action={atualizarPlano.bind(null, id)}
          itens={itens}
          plano={plano}
          beneficios={beneficios ?? []}
          cancelarHref={`/planos/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
