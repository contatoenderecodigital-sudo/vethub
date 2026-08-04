import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Pet } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PetForm } from "../../pet-form";
import { atualizarPet } from "../../actions";

export const metadata = { title: "Editar pet" };

export default async function EditarPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: pet } = await supabase
    .from("pet")
    .select("*, tutor:tutor_id (id, nome, telefone)")
    .eq("id", id)
    .single<Pet>();

  if (!pet) notFound();

  const salvar = atualizarPet.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo={`Editar ${pet.nome}`} />
      <Card>
        <PetForm
          action={salvar}
          pet={pet}
          tutorInicial={
            pet.tutor ? { id: pet.tutor.id, rotulo: pet.tutor.nome } : undefined
          }
          cancelarHref={`/pets/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
