import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import type { Clinica } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { atualizarClinica } from "./actions";
import { ClinicaForm } from "./clinica-form";

export const metadata = { title: "Clínica" };

export default async function ClinicaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const { supabase, usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  const { data: clinica } = await supabase
    .from("clinica")
    .select("*")
    .eq("id", usuario.clinica_id)
    .single<Clinica>();

  if (!clinica) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Dados da clínica"
        subtitulo="Informações usadas em documentos e comunicação"
      />

      <Card>
        <ClinicaForm action={atualizarClinica} clinica={clinica} erro={erro} ok={ok} />
      </Card>
    </div>
  );
}
