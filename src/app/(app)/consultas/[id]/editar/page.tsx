import { notFound, redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { formatDataHora } from "@/lib/format";
import type { Consulta } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { ConsultaForm } from "../../consulta-form";
import { atualizarConsulta } from "../../actions";

export const metadata = { title: "Editar consulta" };

type ConsultaEdicao = Omit<Consulta, "pet" | "veterinario"> & {
  pet: {
    id: string;
    nome: string;
    especie: string;
    tutor: { nome: string } | { nome: string }[] | null;
  } | null;
};

export default async function EditarConsultaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  if (usuario.papel === "recepcao") redirect(`/consultas/${id}`);

  const { data: consulta } = await supabase
    .from("consulta")
    .select("*, pet:pet_id (id, nome, especie, tutor:tutor_id (nome))")
    .eq("id", id)
    .single<ConsultaEdicao>();

  if (!consulta) notFound();

  let petInicial: OpcaoBusca | undefined;
  if (consulta.pet) {
    const tutor = Array.isArray(consulta.pet.tutor)
      ? consulta.pet.tutor[0]
      : consulta.pet.tutor;
    petInicial = {
      id: consulta.pet.id,
      rotulo: consulta.pet.nome,
      detalhe: tutor ? `Tutor: ${tutor.nome}` : undefined,
    };
  }

  const { data: veterinarios } = await supabase
    .from("usuario")
    .select("id, nome")
    .in("papel", ["veterinario", "admin"])
    .order("nome")
    .returns<{ id: string; nome: string }[]>();

  const salvar = atualizarConsulta.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Editar consulta"
        subtitulo={`${consulta.pet?.nome ?? "Pet"} · ${formatDataHora(
          consulta.data
        )}`}
      />
      <Card>
        <ConsultaForm
          action={salvar}
          consulta={consulta}
          veterinarios={veterinarios ?? []}
          petInicial={petInicial}
          cancelarHref={`/consultas/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
