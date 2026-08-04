import { Plus, Ruler, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { excluirUnidade, salvarUnidade } from "../actions";

export const metadata = { title: "Unidades de medida" };

interface UnidadeLinha {
  id: string;
  nome: string;
  sigla: string;
  fracionavel: boolean;
}

/** Caixa de "aceita fração" usada nas linhas e no formulário de cadastro. */
function CaixaFracionavel({ marcada }: { marcada?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <input
        type="checkbox"
        name="fracionavel"
        defaultChecked={marcada}
        className="size-4 accent-[#34D399]"
      />
      Aceita fração
    </label>
  );
}

export default async function UnidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  const { data } = await supabase
    .from("unidade_medida")
    .select("id, nome, sigla, fracionavel")
    .order("nome")
    .returns<UnidadeLinha[]>();

  const unidades = data ?? [];
  const criar = salvarUnidade.bind(null, null);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Unidades de medida"
        subtitulo={`${unidades.length} cadastradas`}
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <Card>
        {podeEditar && (
          <form action={criar} className="mb-4 space-y-2 border-b border-edge pb-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                name="nome"
                required
                maxLength={40}
                placeholder="Nome (ex.: Comprimido)"
                aria-label="Nome da nova unidade"
                className="sm:flex-1"
              />
              <Input
                name="sigla"
                required
                maxLength={10}
                placeholder="Sigla (ex.: cp)"
                aria-label="Sigla da nova unidade"
                className="sm:w-32"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CaixaFracionavel />
              <SubmitButton carregando="Adicionando…">
                <Plus className="size-4" />
                Adicionar
              </SubmitButton>
            </div>
          </form>
        )}

        {unidades.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-ink-muted">
            <Ruler className="size-4" strokeWidth={1.8} />
            Nenhuma unidade cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/15">
            {unidades.map((u) => (
              <li key={u.id} className="py-2.5">
                {podeEditar ? (
                  <form action={salvarUnidade.bind(null, u.id)} className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        name="nome"
                        defaultValue={u.nome}
                        required
                        maxLength={40}
                        aria-label={`Nome da unidade ${u.nome}`}
                        className="sm:flex-1"
                      />
                      <Input
                        name="sigla"
                        defaultValue={u.sigla}
                        required
                        maxLength={10}
                        aria-label={`Sigla da unidade ${u.nome}`}
                        className="sm:w-32"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CaixaFracionavel marcada={u.fracionavel} />
                      <div className="flex gap-2">
                        <SubmitButton variante="secondary" tamanho="sm">
                          Salvar
                        </SubmitButton>
                        <ConfirmButton
                          variante="ghost"
                          tamanho="sm"
                          formAction={excluirUnidade.bind(null, u.id)}
                          mensagem={`Excluir a unidade "${u.nome}"?`}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Excluir</span>
                        </ConfirmButton>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {u.nome}
                    <Badge tom="neutro">{u.sigla}</Badge>
                    {u.fracionavel && <Badge tom="info">Aceita fração</Badge>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
