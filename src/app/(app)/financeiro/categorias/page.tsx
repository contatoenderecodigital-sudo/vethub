import { Plus } from "lucide-react";
import { getSessao } from "@/lib/auth";
import type { CategoriaFinanceira, CategoriaTipo, Papel } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { CategoriaItem } from "../categoria-item";
import { criarCategoria } from "../actions";

export const metadata = { title: "Categorias financeiras" };

const PAPEIS_CAIXA: Papel[] = ["admin", "recepcao"];

type CategoriaLinha = Pick<CategoriaFinanceira, "id" | "nome" | "tipo">;

const COLUNAS: {
  tipo: CategoriaTipo;
  titulo: string;
  ajuda: string;
  exemplo: string;
}[] = [
  {
    tipo: "receita",
    titulo: "Receitas",
    ajuda: "Usadas nas contas a receber.",
    exemplo: "Ex.: Consultas, Vacinas",
  },
  {
    tipo: "despesa",
    titulo: "Despesas",
    ajuda: "Usadas nas contas a pagar.",
    exemplo: "Ex.: Aluguel, Fornecedores",
  },
];

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();

  const { data } = await supabase
    .from("categoria_financeira")
    .select("id, nome, tipo")
    .order("nome")
    .returns<CategoriaLinha[]>();

  const categorias = data ?? [];
  const podeEditar = PAPEIS_CAIXA.includes(usuario.papel);
  const ehAdmin = usuario.papel === "admin";

  return (
    <div>
      <PageHeader
        titulo="Categorias financeiras"
        subtitulo="Organizam as contas nos relatórios e nos filtros"
        acao={
          <ButtonLink href="/financeiro" variante="secondary">
            Painel financeiro
          </ButtonLink>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {COLUNAS.map((coluna) => {
          const daColuna = categorias.filter((c) => c.tipo === coluna.tipo);
          return (
            <Card key={coluna.tipo}>
              <CardTitulo className="mb-1">{coluna.titulo}</CardTitulo>
              <p className="mb-3 text-sm text-ink-muted">{coluna.ajuda}</p>

              {podeEditar && (
                <form action={criarCategoria} className="mb-3 flex items-center gap-2">
                  <input type="hidden" name="tipo" value={coluna.tipo} />
                  <Input
                    name="nome"
                    required
                    maxLength={40}
                    placeholder={coluna.exemplo}
                    aria-label={`Nova categoria de ${coluna.titulo.toLowerCase()}`}
                  />
                  <SubmitButton tamanho="sm" carregando="…">
                    <Plus className="size-4" />
                    Adicionar
                  </SubmitButton>
                </form>
              )}

              {daColuna.length === 0 ? (
                <p className="rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
                  Nenhuma categoria cadastrada.
                </p>
              ) : (
                <ul className="divide-y divide-white/15">
                  {daColuna.map((c) => (
                    <CategoriaItem
                      key={c.id}
                      id={c.id}
                      nome={c.nome}
                      tipo={c.tipo}
                      podeEditar={podeEditar}
                      ehAdmin={ehAdmin}
                    />
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
