import { redirect } from "next/navigation";
import { Check, Save } from "lucide-react";
import { getSessao } from "@/lib/auth";
import type { Clinica } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Campo, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { atualizarClinica } from "./actions";

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
        <form action={atualizarClinica} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}
          {ok && (
            <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <Check className="size-4" />
              Dados salvos.
            </p>
          )}

          <Campo rotulo="Nome da clínica" htmlFor="nome" obrigatorio>
            <Input id="nome" name="nome" defaultValue={clinica.nome} required />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="CNPJ" htmlFor="cnpj">
              <Input id="cnpj" name="cnpj" defaultValue={clinica.cnpj ?? ""} />
            </Campo>
            <Campo rotulo="Telefone" htmlFor="telefone">
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                placeholder="(11) 3333-4444"
                defaultValue={clinica.telefone ?? ""}
              />
            </Campo>
          </div>

          <Campo rotulo="Endereço" htmlFor="endereco">
            <Input
              id="endereco"
              name="endereco"
              defaultValue={clinica.endereco ?? ""}
            />
          </Campo>

          <div className="pt-2">
            <SubmitButton>
              <Save className="size-4" />
              Salvar
            </SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
