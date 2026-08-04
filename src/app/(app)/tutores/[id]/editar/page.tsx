import { notFound } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Tutor } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { TutorForm } from "../../tutor-form";
import { atualizarTutor } from "../../actions";

export const metadata = { title: "Editar tutor" };

export default async function EditarTutorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: tutor } = await supabase
    .from("tutor")
    .select("*")
    .eq("id", id)
    .single<Tutor>();

  if (!tutor) notFound();

  const salvar = atualizarTutor.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo={`Editar ${tutor.nome}`} />
      <Card>
        <TutorForm
          action={salvar}
          tutor={tutor}
          cancelarHref={`/tutores/${id}`}
          erro={erro}
        />
      </Card>
    </div>
  );
}
