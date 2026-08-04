import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { criarUsuario } from "../actions";
import { NovoUsuarioForm } from "../novo-usuario-form";

export const metadata = { title: "Novo usuário" };

export default async function NovoUsuarioPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { usuario } = await getSessao();
  if (usuario.papel !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Novo usuário"
        subtitulo="Crie o acesso de um membro da equipe"
      />
      <Card>
        <NovoUsuarioForm action={criarUsuario} erro={erro} />
      </Card>
    </div>
  );
}
