import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Headset } from "lucide-react";
import { exigirDono } from "@/lib/dono";
import { formatDataHora } from "@/lib/format";
import { DEFINICAO, type PlanoConta } from "@/lib/plano-conta";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { mudarSituacao, responderComoSuporte } from "../actions";

export const metadata = { title: "Chamado · painel do dono" };

const TOM: Record<string, "info" | "success" | "pending" | "neutro"> = {
  aberto: "info",
  respondido: "success",
  aguardando_cliente: "pending",
  resolvido: "neutro",
};

const ROTULO: Record<string, string> = {
  aberto: "Esperando você",
  respondido: "Respondido",
  aguardando_cliente: "Esperando o cliente",
  resolvido: "Resolvido",
};

const CATEGORIA: Record<string, string> = {
  duvida: "Dúvida",
  problema: "Problema",
  sugestao: "Sugestão",
  cobranca: "Cobrança",
};

interface Mensagem {
  id: string;
  texto: string;
  do_suporte: boolean;
  created_at: string;
  autor: { nome: string } | null;
}

interface Detalhe {
  id: string;
  assunto: string;
  categoria: string;
  status: string;
  created_at: string;
  clinica: { id: string; nome: string; plano: string } | null;
}

export default async function ChamadoDonoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { admin } = await exigirDono();

  const [{ data: ticket }, { data: mensagens }] = await Promise.all([
    admin
      .from("ticket")
      .select("id, assunto, categoria, status, created_at, clinica:clinica_id (id, nome, plano)")
      .eq("id", id)
      .maybeSingle<Detalhe>(),
    admin
      .from("ticket_mensagem")
      .select("id, texto, do_suporte, created_at, autor:autor_id (nome)")
      .eq("ticket_id", id)
      .order("created_at")
      .returns<Mensagem[]>(),
  ]);

  if (!ticket) notFound();

  const responder = responderComoSuporte.bind(null, id);
  const plano = ticket.clinica?.plano as PlanoConta | undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo={ticket.assunto}
        subtitulo={`Aberto em ${formatDataHora(ticket.created_at)}`}
        acao={
          <Link
            href="/dono/suporte"
            className="glass flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
          >
            <ArrowLeft className="size-4" />
            Caixa de entrada
          </Link>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      {/* A situação atual, que faltava: sem ela o atendente responde sem saber
          se o chamado já estava resolvido, e reabre conversa encerrada. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tom={TOM[ticket.status] ?? "neutro"}>
          {ROTULO[ticket.status] ?? ticket.status}
        </Badge>
        <Badge tom="neutro">{CATEGORIA[ticket.categoria] ?? ticket.categoria}</Badge>
      </div>

      {/* Quem está do outro lado. Responder sem saber se é uma clínica em
          teste ou uma que paga há seis meses é responder no escuro. */}
      {ticket.clinica && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                <Building2 className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} aria-hidden />
                {ticket.clinica.nome}
                <Badge tom={plano === "trial" ? "info" : "success"}>
                  {plano ? (DEFINICAO[plano]?.nome ?? plano) : "?"}
                </Badge>
              </p>
            </div>
            <Link
              href={`/dono/cliente/${ticket.clinica.id}`}
              className="glass flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-ink"
            >
              Ver ficha completa
            </Link>
          </div>
        </Card>
      )}

      <div className="mb-5 space-y-3">
        {(mensagens ?? []).map((m) => (
          <div
            key={m.id}
            className={
              m.do_suporte
                ? "glass ml-auto max-w-[92%] rounded-2xl rounded-tr-sm p-4"
                : "glass-forte rounded-2xl rounded-tl-sm p-4"
            }
          >
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              {m.do_suporte && (
                <Headset className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              )}
              {m.do_suporte ? "Você (suporte)" : (m.autor?.nome ?? "Cliente")}
              <span className="font-normal"> · {formatDataHora(m.created_at)}</span>
            </p>
            <p className="text-sm whitespace-pre-line text-ink">{m.texto}</p>
          </div>
        ))}
      </div>

      <Card>
        <form action={responder}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Responder</span>
            <Textarea name="texto" rows={4} maxLength={4000} required />
          </label>

          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="resolver"
              value="1"
              className="size-4 rounded border-edge"
            />
            Marcar como resolvido ao enviar
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <SubmitButton>Enviar resposta</SubmitButton>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-edge pt-4">
          {[
            { valor: "aguardando_cliente", rotulo: "Esperando o cliente" },
            { valor: "resolvido", rotulo: "Resolver sem responder" },
            { valor: "aberto", rotulo: "Reabrir" },
          ].map((a) => (
            <form key={a.valor} action={mudarSituacao.bind(null, id, a.valor)}>
              <SubmitButton variante="ghost" tamanho="sm" className="min-h-11">
                {a.rotulo}
              </SubmitButton>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
