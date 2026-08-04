import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { PAPEIS, type Usuario } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select } from "@/components/ui/form";
import { alterarPapel, removerUsuario } from "./actions";

export const metadata = { title: "Equipe" };

const ROTULO_PAPEL: Record<string, string> = {
  admin: "Administrador",
  veterinario: "Veterinário",
  recepcao: "Recepção",
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  if (usuario.papel !== "admin") redirect("/dashboard");

  const { data: membros } = await supabase
    .from("usuario")
    .select("id, nome, email, papel")
    .order("nome")
    .returns<Usuario[]>();

  return (
    <div>
      <PageHeader
        titulo="Equipe"
        subtitulo="Usuários da clínica e seus papéis"
        acao={<ButtonLink href="/configuracoes/usuarios/novo">+ Novo usuário</ButtonLink>}
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-edge bg-surface">
        <ul className="divide-y divide-edge">
          {(membros ?? []).map((m) => {
            const alterarComId = alterarPapel.bind(null, m.id);
            const removerComId = removerUsuario.bind(null, m.id);
            const ehVoce = m.id === usuario.id;
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {m.nome}{" "}
                    {ehVoce && (
                      <Badge tom="brand" className="ml-1">
                        você
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-sm text-ink-muted">{m.email}</p>
                </div>

                {ehVoce ? (
                  <Badge tom="neutro">{ROTULO_PAPEL[m.papel]}</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <form action={alterarComId} className="flex items-center gap-2">
                      <Select
                        name="papel"
                        defaultValue={m.papel}
                        className="h-9 w-40 text-sm"
                      >
                        {PAPEIS.map((p) => (
                          <option key={p.valor} value={p.valor}>
                            {p.rotulo}
                          </option>
                        ))}
                      </Select>
                      <SubmitButton variante="secondary" tamanho="sm">
                        Salvar
                      </SubmitButton>
                    </form>
                    <form action={removerComId}>
                      <ConfirmButton
                        variante="ghost"
                        tamanho="sm"
                        mensagem={`Remover ${m.nome} da clínica? O acesso será revogado.`}
                        className="text-danger"
                      >
                        Remover
                      </ConfirmButton>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
