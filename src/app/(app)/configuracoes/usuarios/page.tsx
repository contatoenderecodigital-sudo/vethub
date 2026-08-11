import { redirect } from "next/navigation";
import { Check, Lock, Plus, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { tetoDeUsuarios } from "@/lib/plano-conta";
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
  const { supabase, usuario, conta } = await getSessao();

  if (usuario.papel !== "admin") redirect("/dashboard");

  const { data: membros } = await supabase
    .from("usuario")
    .select("id, nome, email, papel")
    .order("nome")
    .returns<Usuario[]>();

  // Mostrar o teto ANTES é o que evita a pior versão disto: preencher nome,
  // e-mail e senha para só então descobrir que não cabe mais ninguém.
  const teto = tetoDeUsuarios(conta.plano, conta.limite_usuarios);
  const lotado = teto != null && (membros?.length ?? 0) >= teto;

  return (
    <div>
      <PageHeader
        titulo="Equipe"
        subtitulo={
          teto == null
            ? "Usuários da clínica e seus papéis"
            : `${membros?.length ?? 0} de ${teto} usuários do seu plano`
        }
        acao={
          lotado ? (
            <ButtonLink href="/assinatura">
              <Lock className="size-4" />
              Aumentar limite
            </ButtonLink>
          ) : (
            <ButtonLink href="/configuracoes/usuarios/novo">
              <Plus className="size-4" />
              Novo usuário
            </ButtonLink>
          )
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md">
          {erro}
        </p>
      )}

      <div className="glass overflow-hidden rounded-2xl">
        <ul className="divide-y divide-white/15">
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
                  <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
                    <form action={alterarComId} className="flex flex-wrap items-center gap-2">
                      <Select
                        name="papel"
                        defaultValue={m.papel}
                        className="h-11 w-36 text-sm lg:h-10"
                      >
                        {PAPEIS.map((p) => (
                          <option key={p.valor} value={p.valor}>
                            {p.rotulo}
                          </option>
                        ))}
                      </Select>
                      <SubmitButton variante="secondary" className="min-w-11 lg:min-w-0">
                        <Check className="size-4" />
                        Salvar
                      </SubmitButton>
                    </form>
                    <form action={removerComId}>
                      <ConfirmButton
                        variante="ghost"
                        mensagem={`Remover ${m.nome} da clínica? O acesso será revogado.`}
                        className="min-w-11 text-red-100 lg:min-w-0"
                      >
                        <Trash2 className="size-4" />
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
