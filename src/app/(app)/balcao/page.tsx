import Link from "next/link";
import {
  CalendarPlus,
  Check,
  ClipboardList,
  FileText,
  FlaskConical,
  Printer,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO, formatTelefone, hojeISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { entregarExame, entregarOrcamento, entregarReceita } from "./actions";

export const metadata = { title: "Balcão" };

/**
 * O que o veterinário deixou para a recepção resolver.
 *
 * É a ponte que faltava entre a sala e o balcão. Hoje o veterinário diz ao
 * tutor "passa na recepção que ela te entrega", e a recepção só descobre o
 * que é quando o tutor chega perguntando — aí ela procura em três telas
 * diferentes com o tutor esperando em pé na frente dela.
 *
 * Aqui está tudo numa lista: o que imprimir, o que agendar, o que cobrar.
 * A recepção clica em imprimir, entrega e dá baixa.
 *
 * A fila é DERIVADA das telas de verdade, não é uma caixa de tarefas
 * paralela: pendência copiada para outro lugar desencontra do original na
 * primeira vez que alguém edita o documento. O único estado que existe aqui
 * é "já entreguei", que é justamente o que não dá para adivinhar.
 */

/** Até quantos dias atrás a fila olha. Mais que isso é arquivo, não pendência. */
const JANELA_DIAS = 7;

interface ReceitaPendente {
  id: string;
  data: string;
  tipo: string;
  pet: { nome: string; tutor: { nome: string; telefone: string | null } | null } | null;
  veterinario: { nome: string } | null;
}

interface OrcamentoPendente {
  id: string;
  created_at: string;
  valor_total: number;
  pet: { nome: string; tutor: { nome: string; telefone: string | null } | null } | null;
}

interface ExamePendente {
  id: string;
  nome: string;
  status: string;
  solicitado_em: string;
  previsto_para: string | null;
  pet: { nome: string; tutor: { nome: string; telefone: string | null } | null } | null;
  veterinario: { nome: string } | null;
}

interface RetornoPendente {
  id: string;
  retorno_em: string;
  pet: { id: string; nome: string; tutor: { nome: string } | null } | null;
}

function Quem({
  pet,
  tutor,
  telefone,
}: {
  pet?: string | null;
  tutor?: string | null;
  telefone?: string | null;
}) {
  return (
    <p className="text-sm text-ink-muted">
      {pet ?? "-"}
      {tutor && ` · ${tutor}`}
      {telefone && ` · ${formatTelefone(telefone)}`}
    </p>
  );
}

export default async function BalcaoPage() {
  const { supabase } = await getSessao();

  const desde = new Date();
  desde.setDate(desde.getDate() - JANELA_DIAS);
  const desdeISO = desde.toISOString().slice(0, 10);

  const [{ data: receitas }, { data: orcamentos }, { data: exames }, { data: retornos }] =
    await Promise.all([
      supabase
        .from("receita")
        .select(
          "id, data, tipo, pet:pet_id (nome, tutor:tutor_id (nome, telefone)), veterinario:veterinario_id (nome)"
        )
        .is("entregue_em", null)
        .gte("data", desdeISO)
        .order("data", { ascending: false })
        .returns<ReceitaPendente[]>(),
      supabase
        .from("orcamento")
        .select(
          "id, created_at, valor_total, pet:pet_id (nome, tutor:tutor_id (nome, telefone))"
        )
        .is("entregue_em", null)
        .eq("status", "aberto")
        .gte("created_at", `${desdeISO}T00:00:00`)
        .order("created_at", { ascending: false })
        .returns<OrcamentoPendente[]>(),
      supabase
        .from("exame")
        .select(
          "id, nome, status, solicitado_em, previsto_para, pet:pet_id (nome, tutor:tutor_id (nome, telefone)), veterinario:veterinario_id (nome)"
        )
        .in("status", ["solicitado", "pronto"])
        .order("solicitado_em", { ascending: false })
        .returns<ExamePendente[]>(),
      // Retorno que o veterinário marcou na receita e ninguém agendou ainda.
      supabase
        .from("receita")
        .select("id, retorno_em, pet:pet_id (id, nome, tutor:tutor_id (nome))")
        .not("retorno_em", "is", null)
        .gte("retorno_em", hojeISO())
        .order("retorno_em")
        .limit(15)
        .returns<RetornoPendente[]>(),
    ]);

  const nReceitas = receitas?.length ?? 0;
  const nOrcamentos = orcamentos?.length ?? 0;
  const nExames = exames?.length ?? 0;
  const total = nReceitas + nOrcamentos + nExames;

  return (
    <div>
      <PageHeader
        titulo="Balcão"
        subtitulo={
          total === 0
            ? "Nada pendente. Tudo que o veterinário fez já foi entregue"
            : `${total} ${total === 1 ? "item" : "itens"} para a recepção resolver`
        }
      />

      {total === 0 && (retornos?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icone={<Check className="size-7" strokeWidth={1.8} />}
            titulo="Balcão limpo"
            mensagem="Quando o veterinário emitir uma receita, montar um orçamento ou pedir um exame, ele aparece aqui para você imprimir e entregar."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Receitas */}
          {nReceitas > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                <ClipboardList className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Receitas para imprimir ({nReceitas})
              </h2>
              <ul className="divide-y divide-edge">
                {receitas!.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        Receita de {formatDataISO(r.data)}
                        {r.tipo === "controlada" && (
                          <Badge tom="pending">Controlada · 2 vias</Badge>
                        )}
                      </p>
                      <Quem
                        pet={r.pet?.nome}
                        tutor={r.pet?.tutor?.nome}
                        telefone={r.pet?.tutor?.telefone}
                      />
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link
                        href={`/receitas/${r.id}/imprimir`}
                        className="glass flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
                      >
                        <Printer className="size-4" strokeWidth={1.8} aria-hidden />
                        Imprimir
                      </Link>
                      <form action={entregarReceita.bind(null, r.id)}>
                        <SubmitButton variante="secondary" tamanho="sm" className="min-h-11">
                          <Check className="size-4" />
                          Entreguei
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Orçamentos */}
          {nOrcamentos > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                <FileText className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Orçamentos para entregar ({nOrcamentos})
              </h2>
              <ul className="divide-y divide-edge">
                {orcamentos!.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {formatBRL(o.valor_total)}
                        <span className="text-ink-muted">
                          {" "}
                          · {formatDataISO(o.created_at.slice(0, 10))}
                        </span>
                      </p>
                      <Quem
                        pet={o.pet?.nome}
                        tutor={o.pet?.tutor?.nome}
                        telefone={o.pet?.tutor?.telefone}
                      />
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link
                        href={`/orcamentos/${o.id}/imprimir`}
                        className="glass flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
                      >
                        <Printer className="size-4" strokeWidth={1.8} aria-hidden />
                        Imprimir
                      </Link>
                      <form action={entregarOrcamento.bind(null, o.id)}>
                        <SubmitButton variante="secondary" tamanho="sm" className="min-h-11">
                          <Check className="size-4" />
                          Entreguei
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Exames */}
          {nExames > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                <FlaskConical className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Exames ({nExames})
              </h2>
              <ul className="divide-y divide-edge">
                {exames!.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        {e.nome}
                        {e.status === "pronto" ? (
                          <Badge tom="success">Resultado pronto</Badge>
                        ) : (
                          <Badge tom="info">Requisição</Badge>
                        )}
                      </p>
                      <Quem
                        pet={e.pet?.nome}
                        tutor={e.pet?.tutor?.nome}
                        telefone={e.pet?.tutor?.telefone}
                      />
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Link
                        href={`/exames/${e.id}/imprimir`}
                        className="glass flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
                      >
                        <Printer className="size-4" strokeWidth={1.8} aria-hidden />
                        Imprimir
                      </Link>
                      <form action={entregarExame.bind(null, e.id)}>
                        <SubmitButton variante="secondary" tamanho="sm" className="min-h-11">
                          <Check className="size-4" />
                          Entreguei
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Retornos a agendar */}
          {(retornos?.length ?? 0) > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                <CalendarPlus className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Retornos que o veterinário pediu
              </h2>
              <p className="mb-3 text-sm text-ink-muted">
                O veterinário marcou retorno na receita. Agende antes que o tutor
                esqueça.
              </p>
              <ul className="divide-y divide-edge">
                {retornos!.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {formatDataISO(r.retorno_em)}
                      </p>
                      <Quem pet={r.pet?.nome} tutor={r.pet?.tutor?.nome} />
                    </div>
                    <Link
                      href={`/agenda/novo?pet=${r.pet?.id ?? ""}&tipo=retorno&data=${r.retorno_em}`}
                      className="glass flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
                    >
                      <CalendarPlus className="size-4" strokeWidth={1.8} aria-hidden />
                      Agendar
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
