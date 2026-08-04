import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  ClipboardList,
  Pencil,
  Percent,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitulo } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { excluirPlano } from "../actions";
import { primeiro } from "../schema";

export const metadata = { title: "Plano" };

const LIMITE_ASSINANTES = 200;

interface PlanoDoBanco {
  id: string;
  nome: string;
  descricao: string | null;
  preco_venda: number;
  ativo: boolean;
}

interface BeneficioLinha {
  id: string;
  descricao: string;
  quantidade_mes: number;
  desconto_percentual: number | null;
  item: { nome: string } | { nome: string }[] | null;
}

interface AssinanteLinha {
  id: string;
  valor_mensal: number;
  dia_cobranca: number;
  inicio: string;
  tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
  pet: { id: string; nome: string } | { id: string; nome: string }[] | null;
}

export default async function PlanoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeEditar = usuario.papel === "admin";

  const [{ data: plano }, { data: beneficios }, { data: assinantes }] =
    await Promise.all([
      supabase
        .from("item")
        .select("id, nome, descricao, preco_venda, ativo")
        .eq("id", id)
        .eq("tipo", "plano")
        .single<PlanoDoBanco>(),
      supabase
        .from("plano_beneficio")
        .select(
          "id, descricao, quantidade_mes, desconto_percentual, item:item_id (nome)"
        )
        .eq("plano_item_id", id)
        .order("created_at")
        .returns<BeneficioLinha[]>(),
      supabase
        .from("assinatura")
        .select(
          "id, valor_mensal, dia_cobranca, inicio, tutor:tutor_id (id, nome), pet:pet_id (id, nome)"
        )
        .eq("plano_item_id", id)
        .eq("status", "ativa")
        .order("inicio", { ascending: false })
        .limit(LIMITE_ASSINANTES)
        .returns<AssinanteLinha[]>(),
    ]);

  if (!plano) notFound();

  const listaBeneficios = beneficios ?? [];
  const listaAssinantes = assinantes ?? [];
  const mrr = listaAssinantes.reduce((s, a) => s + Number(a.valor_mensal), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={plano.nome}
        subtitulo={`${formatBRL(plano.preco_venda)} por mês`}
        acao={
          <>
            <ButtonLink
              href={`/planos/assinaturas/nova?plano=${plano.id}`}
              variante="secondary"
            >
              <Plus className="size-4" />
              Nova assinatura
            </ButtonLink>
            {podeEditar && (
              <ButtonLink href={`/planos/${plano.id}/editar`} variante="secondary">
                <Pencil className="size-4" />
                Editar
              </ButtonLink>
            )}
          </>
        }
      />

      {erro && (
        <p className="rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CardTitulo className="mb-0">Benefícios do plano</CardTitulo>
            {!plano.ativo && <Badge tom="neutro">Inativo</Badge>}
          </div>

          {listaBeneficios.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
              <ClipboardList className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
              Este plano ainda não tem benefícios cadastrados.
            </p>
          ) : (
            <ul className="divide-y divide-white/15">
              {listaBeneficios.map((b) => {
                const item = primeiro(b.item)?.nome ?? null;
                const desconto = Number(b.desconto_percentual ?? 0);
                return (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{b.descricao}</p>
                      {item && item !== b.descricao && (
                        <p className="truncate text-xs text-ink-muted">{item}</p>
                      )}
                    </div>
                    <Badge tom="brand">
                      {b.quantidade_mes}x por mês
                    </Badge>
                    {desconto > 0 && (
                      <Badge tom="info" className="gap-1">
                        <Percent className="size-3" aria-hidden />
                        {desconto.toLocaleString("pt-BR", {
                          maximumFractionDigits: 2,
                        })}
                        % no excedente
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {plano.descricao && (
            <p className="mt-4 whitespace-pre-wrap border-t border-edge pt-3 text-sm text-ink-muted">
              {plano.descricao}
            </p>
          )}
        </Card>

        <Card>
          <CardTitulo>Resumo</CardTitulo>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Valor mensal</dt>
              <dd className="text-lg font-bold text-ink tabular-nums">
                {formatBRL(plano.preco_venda)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Benefícios</dt>
              <dd className="font-medium text-ink tabular-nums">
                {listaBeneficios.length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Assinantes ativos</dt>
              <dd className="font-medium text-ink tabular-nums">
                {listaAssinantes.length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-white/20 pt-3">
              <dt className="text-ink-muted">Receita deste plano</dt>
              <dd className="font-semibold text-emerald-50 tabular-nums">
                {formatBRL(mrr)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitulo className="mb-0 flex items-center gap-2">
            <Users className="size-4" strokeWidth={1.8} aria-hidden />
            Assinantes ativos
            {listaAssinantes.length > 0 && (
              <span className="text-sm font-normal text-ink-muted">
                ({listaAssinantes.length})
              </span>
            )}
          </CardTitulo>
          <Link
            href={`/planos/assinaturas?plano=${plano.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-mint hover:underline"
          >
            Ver todas as assinaturas
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {listaAssinantes.length === 0 ? (
          <p className="rounded-xl border border-edge bg-white/10 px-3 py-4 text-sm text-ink-muted">
            Nenhum tutor assinando este plano ainda.
          </p>
        ) : (
          <ul className="divide-y divide-white/15">
            {listaAssinantes.map((a) => {
              const tutor = primeiro(a.tutor);
              const pet = primeiro(a.pet);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {tutor ? (
                        <Link
                          href={`/tutores/${tutor.id}`}
                          className="text-brand-mint hover:underline"
                        >
                          {tutor.nome}
                        </Link>
                      ) : (
                        "Tutor removido"
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {[
                        pet ? pet.nome : null,
                        `Cobrança dia ${a.dia_cobranca}`,
                        `Desde ${formatDataISO(a.inicio)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                    {formatBRL(a.valor_mensal)}
                  </span>
                  <Link
                    href={`/planos/assinaturas/${a.id}`}
                    aria-label={`Abrir assinatura de ${tutor?.nome ?? "tutor"}`}
                    className="shrink-0 text-ink-muted hover:text-white"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {podeEditar && (
        <form action={excluirPlano.bind(null, plano.id)}>
          <ConfirmButton
            variante="danger"
            tamanho="sm"
            mensagem={`Excluir o plano "${plano.nome}"? Só é possível enquanto ele não tiver assinaturas.`}
          >
            <Trash2 className="size-4" />
            Excluir plano
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
