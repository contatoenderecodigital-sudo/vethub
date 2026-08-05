import Link from "next/link";
import { ChevronRight, ClipboardList, Plus, Repeat, Users } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Planos" };

/** Teto de linhas lidas por consulta. */
const LIMITE = 300;

interface LinhaPlano {
  id: string;
  nome: string;
  descricao: string | null;
  preco_venda: number;
  ativo: boolean;
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel === "admin";

  const [{ data: planos }, { data: beneficios }, { data: assinaturas }] =
    await Promise.all([
      supabase
        .from("item")
        .select("id, nome, descricao, preco_venda, ativo")
        .eq("tipo", "plano")
        .order("nome")
        .limit(LIMITE)
        .returns<LinhaPlano[]>(),
      supabase
        .from("plano_beneficio")
        .select("plano_item_id")
        .limit(LIMITE * 10)
        .returns<{ plano_item_id: string }[]>(),
      supabase
        .from("assinatura")
        .select("plano_item_id")
        .eq("status", "ativa")
        .limit(LIMITE * 10)
        .returns<{ plano_item_id: string }[]>(),
    ]);

  // Contagens em memória: duas consultas leves em vez de N por plano.
  const contar = (linhas: { plano_item_id: string }[] | null) => {
    const mapa = new Map<string, number>();
    for (const l of linhas ?? []) {
      mapa.set(l.plano_item_id, (mapa.get(l.plano_item_id) ?? 0) + 1);
    }
    return mapa;
  };

  const porPlanoBeneficios = contar(beneficios);
  const porPlanoAssinantes = contar(assinaturas);
  const lista = planos ?? [];

  const novoPlano = (
    <ButtonLink href="/planos/novo">
      <Plus className="size-4" />
      Novo plano
    </ButtonLink>
  );

  return (
    <div>
      <PageHeader
        titulo="Planos"
        subtitulo={
          lista.length > 0
            ? `${lista.length} ${lista.length === 1 ? "plano oferecido" : "planos oferecidos"}`
            : "Receita recorrente da clínica"
        }
        acao={
          <>
            <ButtonLink href="/planos/assinaturas" variante="secondary">
              <Repeat className="size-4" />
              Assinaturas
            </ButtonLink>
            {podeEditar && novoPlano}
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icone={<ClipboardList className="size-7" strokeWidth={1.8} />}
          titulo="Nenhum plano cadastrado"
          mensagem="Um plano é o 'plano de saúde pet' da clínica: o tutor paga um valor fixo todo mês e ganha uma franquia de serviços. Ex.: Plano Banho Mensal: 4 banhos + 1 tosa higiênica por R$ 189/mês."
          acao={podeEditar ? novoPlano : undefined}
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {lista.map((plano) => {
              const qtdBeneficios = porPlanoBeneficios.get(plano.id) ?? 0;
              const qtdAssinantes = porPlanoAssinantes.get(plano.id) ?? 0;
              return (
                <li key={plano.id}>
                  <Link
                    href={`/planos/${plano.id}`}
                    className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        <span className="truncate">{plano.nome}</span>
                        {!plano.ativo && <Badge tom="neutro">Inativo</Badge>}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {qtdBeneficios}{" "}
                        {qtdBeneficios === 1 ? "benefício" : "benefícios"}
                        {plano.descricao ? ` · ${plano.descricao}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold text-ink tabular-nums">
                        {formatBRL(plano.preco_venda)}
                        <span className="text-xs font-normal text-ink-muted">
                          {" "}
                          /mês
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink-muted tabular-nums">
                        <Users className="size-3.5" strokeWidth={1.8} aria-hidden />
                        {qtdAssinantes}{" "}
                        {qtdAssinantes === 1 ? "assinante" : "assinantes"}
                      </span>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
