import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { TutorForm } from "../tutor-form";
import { criarTutor } from "../actions";

export const metadata = { title: "Novo tutor" };

export default async function NovoTutorPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titulo="Novo tutor" />
      <Card>
        <TutorForm action={criarTutor} cancelarHref="/tutores" erro={erro} />
      </Card>
    </div>
  );
}
