import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PAPEIS } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Campo, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { criarUsuario } from "../actions";

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
        <form action={criarUsuario} className="space-y-4">
          {erro && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <Campo rotulo="Nome" htmlFor="nome" obrigatorio>
            <Input id="nome" name="nome" required />
          </Campo>

          <Campo rotulo="E-mail" htmlFor="email" obrigatorio>
            <Input id="email" name="email" type="email" required />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Senha inicial"
              htmlFor="senha"
              obrigatorio
              dica="8+ caracteres, com letras e números."
            >
              <Input
                id="senha"
                name="senha"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Campo>
            <Campo rotulo="Papel" htmlFor="papel" obrigatorio>
              <Select id="papel" name="papel" defaultValue="recepcao" required>
                {PAPEIS.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </Select>
            </Campo>
          </div>

          <div className="flex gap-2 pt-2">
            <SubmitButton>Criar usuário</SubmitButton>
            <ButtonLink href="/configuracoes/usuarios" variante="secondary">
              Cancelar
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
