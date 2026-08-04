import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { OpcaoBusca } from "@/components/busca-combobox";
import { PetForm } from "../pet-form";
import { criarPet } from "../actions";

export const metadata = { title: "Novo pet" };

export default async function NovoPetPage({
  searchParams,
}: {
  searchParams: Promise<{ tutor?: string; erro?: string }>;
}) {
  const { tutor: tutorId, erro } = await searchParams;

  let tutorInicial: OpcaoBusca | undefined;
  if (tutorId) {
    const { supabase } = await getSessao();
    const { data: tutor } = await supabase
      .from("tutor")
      .select("id, nome")
      .eq("id", tutorId)
      .single<{ id: string; nome: string }>();
    if (tutor) tutorInicial = { id: tutor.id, rotulo: tutor.nome };
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo pet" />
      <Card>
        <PetForm
          action={criarPet}
          tutorInicial={tutorInicial}
          cancelarHref="/pets"
          erro={erro}
        />
      </Card>
    </div>
  );
}
