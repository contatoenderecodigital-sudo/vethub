import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { criarPlano } from "../actions";
import { carregarItensDoCatalogo } from "../dados";
import { PlanoForm } from "../plano-form";

export const metadata = { title: "Novo plano" };

export default async function NovoPlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { usuario } = await getSessao();

  // Só o administrador monta o catálogo de planos.
  if (usuario.papel !== "admin") redirect("/planos");

  const itens = await carregarItensDoCatalogo();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Novo plano"
        subtitulo="Valor fixo por mês + franquia de serviços"
      />
      <Card>
        <PlanoForm
          action={criarPlano}
          itens={itens}
          cancelarHref="/planos"
          erro={erro}
        />
      </Card>
    </div>
  );
}
