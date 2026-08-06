import { Plus, Tag, Trash2 } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { excluirMarca, salvarMarca } from "../actions";
import { plural } from "@/lib/format";

export const metadata = { title: "Marcas" };

interface MarcaLinha {
  id: string;
  nome: string;
}

export default async function MarcasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel !== "recepcao";

  const { data } = await supabase
    .from("marca")
    .select("id, nome")
    .order("nome")
    .returns<MarcaLinha[]>();

  const marcas = data ?? [];
  const criar = salvarMarca.bind(null, null);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        titulo="Marcas"
        subtitulo={plural(marcas.length, "marca") + " cadastrada" + (marcas.length === 1 ? "" : "s")}
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <Card>
        {podeEditar && (
          <form
            action={criar}
            className="mb-4 flex flex-col gap-2 border-b border-edge pb-4 sm:flex-row"
          >
            <Input
              name="nome"
              required
              maxLength={60}
              placeholder="Nome da marca (ex.: Zoetis, Royal Canin…)"
              aria-label="Nome da nova marca"
              className="sm:flex-1"
            />
            <SubmitButton carregando="Adicionando…">
              <Plus className="size-4" />
              Adicionar
            </SubmitButton>
          </form>
        )}

        {marcas.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-ink-muted">
            <Tag className="size-4" strokeWidth={1.8} />
            Nenhuma marca cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/15">
            {marcas.map((marca) => (
              <li key={marca.id} className="py-2.5">
                {podeEditar ? (
                  <form
                    action={salvarMarca.bind(null, marca.id)}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      name="nome"
                      defaultValue={marca.nome}
                      required
                      maxLength={60}
                      aria-label={`Nome da marca ${marca.nome}`}
                      className="sm:flex-1"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <SubmitButton variante="secondary" tamanho="sm" className="min-h-11 sm:min-h-10">
                        Salvar
                      </SubmitButton>
                      <ConfirmButton
                        variante="ghost"
                        tamanho="sm"
                        className="min-h-11 sm:min-h-10"
                        formAction={excluirMarca.bind(null, marca.id)}
                        mensagem={`Excluir a marca "${marca.nome}"?`}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Excluir</span>
                      </ConfirmButton>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm font-medium text-ink">{marca.nome}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
