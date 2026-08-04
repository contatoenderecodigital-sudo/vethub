import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CircleCheck,
  CircleX,
  Pencil,
  RotateCcw,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import type { OrcamentoStatus } from "@/lib/types";
import { BadgeOrcamento } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { IconeEspecie } from "@/components/icone-especie";
import { atualizarStatus, excluirOrcamento } from "../actions";

export const metadata = { title: "Orçamento" };

interface OrcamentoDetalhe {
  id: string;
  status: OrcamentoStatus;
  valor_total: number;
  consulta_id: string | null;
  created_at: string;
  pet: {
    id: string;
    nome: string;
    especie: string;
    tutor: { nome: string } | { nome: string }[] | null;
  } | null;
}

interface ItemDetalhe {
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export default async function OrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data: orcamento } = await supabase
    .from("orcamento")
    .select(
      "id, status, valor_total, consulta_id, created_at, pet:pet_id (id, nome, especie, tutor:tutor_id (nome))"
    )
    .eq("id", id)
    .single<OrcamentoDetalhe>();

  if (!orcamento) notFound();

  const { data: itens } = await supabase
    .from("orcamento_item")
    .select("id, descricao, quantidade, valor_unitario")
    .eq("orcamento_id", id)
    .order("id")
    .returns<ItemDetalhe[]>();

  const pet = orcamento.pet;
  const tutor = Array.isArray(pet?.tutor) ? pet?.tutor[0] : pet?.tutor;

  const aprovar = atualizarStatus.bind(null, id, "aprovado");
  const recusar = atualizarStatus.bind(null, id, "recusado");
  const reabrir = atualizarStatus.bind(null, id, "aberto");
  const excluir = excluirOrcamento.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconeEspecie especie={pet?.especie} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink sm:text-2xl">Orçamento</h1>
              <BadgeOrcamento status={orcamento.status} />
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              {pet ? (
                <Link
                  href={`/pets/${pet.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {pet.nome}
                </Link>
              ) : (
                "Pet removido"
              )}
              {tutor && <> · Tutor: {tutor.nome}</>}
              {" · "}
              {formatDataHora(orcamento.created_at)}
              {orcamento.consulta_id && (
                <>
                  {" · "}
                  <Link
                    href={`/consultas/${orcamento.consulta_id}`}
                    className="inline-flex items-center gap-1 align-bottom text-brand hover:underline"
                  >
                    <Stethoscope className="size-3.5" />
                    Ver consulta
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {orcamento.status === "aberto" ? (
            <>
              <form action={aprovar}>
                <SubmitButton carregando="Aprovando…">
                  <CircleCheck className="size-4" />
                  Aprovar
                </SubmitButton>
              </form>
              <form action={recusar}>
                <SubmitButton variante="secondary" carregando="Recusando…">
                  <CircleX className="size-4" />
                  Recusar
                </SubmitButton>
              </form>
              <ButtonLink href={`/orcamentos/${id}/editar`} variante="secondary">
                <Pencil className="size-4" />
                Editar itens
              </ButtonLink>
              <form action={excluir}>
                <ConfirmButton
                  variante="danger"
                  mensagem="Excluir este orçamento apaga também os itens dele. Tem certeza?"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </ConfirmButton>
              </form>
            </>
          ) : (
            <form action={reabrir}>
              <SubmitButton variante="secondary" carregando="Reabrindo…">
                <RotateCcw className="size-4" />
                Reabrir
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-zinc-200/60 text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="w-20 px-4 py-3 text-right font-medium">Qtd</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Valor unit.</th>
              <th className="w-32 px-4 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60">
            {(itens ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-ink">{item.descricao}</td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {Number(item.quantidade).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right text-ink tabular-nums">
                  {formatBRL(item.valor_unitario)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                  {formatBRL(Number(item.quantidade) * Number(item.valor_unitario))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200/60 bg-brand-mint/10">
              <td colSpan={3} className="px-4 py-3 text-right font-bold text-ink">
                TOTAL
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-ink tabular-nums">
                {formatBRL(orcamento.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
