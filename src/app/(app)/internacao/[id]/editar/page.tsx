import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { InternacaoForm } from "../../internacao-form";
import { atualizarInternacao } from "../../actions";
import { dataSPde, horaSPde, type InternacaoDetalhe } from "../../tipos";

export const metadata = { title: "Editar internação" };

export default async function EditarInternacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: internacao } = await supabase
    .from("internacao")
    .select(
      "*, pet:pet_id (id, nome, especie, foto_url, tutor:tutor_id (id, nome)), veterinario:veterinario_id (id, nome)"
    )
    .eq("id", id)
    .single<InternacaoDetalhe>();

  if (!internacao) notFound();

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<{ id: string; nome: string }[]>();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Editar internação"
        subtitulo={internacao.pet?.nome ?? undefined}
      />
      <Card>
        <InternacaoForm
          action={atualizarInternacao.bind(null, id)}
          valoresIniciais={{
            pet_id: internacao.pet_id,
            veterinario_id: internacao.veterinario_id ?? "",
            box: internacao.box ?? "",
            data: dataSPde(internacao.data_entrada),
            hora: horaSPde(internacao.data_entrada),
            motivo: internacao.motivo,
            diagnostico: internacao.diagnostico ?? "",
            observacoes: internacao.observacoes ?? "",
          }}
          veterinarios={veterinarios ?? []}
          petInicial={
            internacao.pet
              ? {
                  id: internacao.pet.id,
                  rotulo: internacao.pet.nome,
                  detalhe: internacao.pet.tutor
                    ? `Tutor: ${internacao.pet.tutor.nome}`
                    : undefined,
                }
              : undefined
          }
          edicao
          cancelarHref={`/internacao/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
