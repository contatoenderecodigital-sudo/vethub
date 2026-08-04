import { CornerDownRight, Plus, Tags, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { TIPOS_GRUPO, type GrupoTipo } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { excluirGrupo, salvarGrupo } from "../actions";

export const metadata = { title: "Grupos e subgrupos" };

interface GrupoLinha {
  id: string;
  nome: string;
  grupo_pai_id: string | null;
  tipo: GrupoTipo;
}

const rotuloTipo = (tipo: GrupoTipo) =>
  TIPOS_GRUPO.find((t) => t.valor === tipo)?.rotulo ?? tipo;

/** Formulário de grupo — usado tanto para cadastrar quanto para editar. */
function GrupoForm({
  grupo,
  pais,
  novo = false,
}: {
  grupo?: GrupoLinha;
  pais: GrupoLinha[];
  novo?: boolean;
}) {
  const acao = salvarGrupo.bind(null, grupo?.id ?? null);
  // Um grupo não pode virar subgrupo dele mesmo.
  const opcoesPai = pais.filter((p) => p.id !== grupo?.id);

  return (
    <form action={acao} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="nome"
          defaultValue={grupo?.nome}
          required
          maxLength={60}
          placeholder="Nome do grupo (ex.: Medicamentos)"
          aria-label={grupo ? `Nome do grupo ${grupo.nome}` : "Nome do novo grupo"}
          className="sm:flex-1"
        />
        <Select
          name="grupo_pai_id"
          defaultValue={grupo?.grupo_pai_id ?? ""}
          aria-label="Grupo pai"
          className="sm:w-52"
        >
          <option value="">Grupo principal</option>
          {opcoesPai.map((p) => (
            <option key={p.id} value={p.id}>
              Subgrupo de {p.nome}
            </option>
          ))}
        </Select>
        <Select
          name="tipo"
          defaultValue={grupo?.tipo ?? "produto"}
          aria-label="Tipo do grupo"
          className="sm:w-44"
        >
          {TIPOS_GRUPO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        {novo ? (
          <SubmitButton carregando="Adicionando…">
            <Plus className="size-4" />
            Adicionar
          </SubmitButton>
        ) : (
          <>
            <SubmitButton variante="secondary" tamanho="sm">
              Salvar
            </SubmitButton>
            {grupo && (
              <ConfirmButton
                variante="ghost"
                tamanho="sm"
                formAction={excluirGrupo.bind(null, grupo.id)}
                mensagem={`Excluir "${grupo.nome}"? Os subgrupos dele também somem.`}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Excluir</span>
              </ConfirmButton>
            )}
          </>
        )}
      </div>
    </form>
  );
}

export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  const { data } = await supabase
    .from("grupo_item")
    .select("id, nome, grupo_pai_id, tipo")
    .order("nome")
    .returns<GrupoLinha[]>();

  const grupos = data ?? [];
  const principais = grupos.filter((g) => !g.grupo_pai_id);
  const subgruposDe = (paiId: string) =>
    grupos.filter((g) => g.grupo_pai_id === paiId);

  // Subgrupo cujo pai sumiu da lista: mostra junto dos principais.
  const orfaos = grupos.filter(
    (g) => g.grupo_pai_id && !grupos.some((p) => p.id === g.grupo_pai_id)
  );
  const raizes = [...principais, ...orfaos];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Grupos e subgrupos"
        subtitulo={`${grupos.length} cadastrados`}
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <Card>
        {podeEditar && (
          <div className="mb-4 border-b border-edge pb-4">
            <p className="mb-2 text-sm font-semibold text-ink">Novo grupo</p>
            <GrupoForm pais={principais} novo />
          </div>
        )}

        {grupos.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-ink-muted">
            <Tags className="size-4" strokeWidth={1.8} />
            Nenhum grupo cadastrado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/15">
            {raizes.map((pai) => {
              const filhos = subgruposDe(pai.id);
              return (
                <li key={pai.id} className="py-3">
                  {podeEditar ? (
                    <GrupoForm grupo={pai} pais={principais} />
                  ) : (
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {pai.nome}
                      <Badge tom="neutro">{rotuloTipo(pai.tipo)}</Badge>
                    </p>
                  )}

                  {filhos.length > 0 && (
                    <ul className="mt-2 space-y-3 border-l border-edge pl-3 sm:pl-4">
                      {filhos.map((filho) => (
                        <li key={filho.id}>
                          {podeEditar ? (
                            <GrupoForm grupo={filho} pais={principais} />
                          ) : (
                            <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                              <CornerDownRight
                                className="size-4 shrink-0 text-ink-muted"
                                strokeWidth={1.8}
                              />
                              {filho.nome}
                              <Badge tom="neutro">{rotuloTipo(filho.tipo)}</Badge>
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
