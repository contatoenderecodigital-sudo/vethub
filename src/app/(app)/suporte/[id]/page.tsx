import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Headset } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROTULO, TOM } from "../page";
import { responderChamado } from "../actions";

export const metadata = { title: "Chamado" };

interface Mensagem {
  id: string;
  texto: string;
  do_suporte: boolean;
  created_at: string;
  autor: { nome: string } | null;
}

interface TicketDetalhe {
  id: string;
  assunto: string;
  categoria: string;
  status: string;
  created_at: string;
}

export default async function ChamadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const [{ data: ticket }, { data: mensagens }] = await Promise.all([
    supabase
      .from("ticket")
      .select("id, assunto, categoria, status, created_at")
      .eq("id", id)
      .maybeSingle<TicketDetalhe>(),
    supabase
      .from("ticket_mensagem")
      .select("id, texto, do_suporte, created_at, autor:autor_id (nome)")
      .eq("ticket_id", id)
      .order("created_at")
      .returns<Mensagem[]>(),
  ]);

  // O RLS já limita ao que é da clínica: se não veio, não é dela.
  if (!ticket) notFound();

  const responder = responderChamado.bind(null, id);
  const resolvido = ticket.status === "resolvido";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo={ticket.assunto}
        subtitulo={`Aberto em ${formatDataHora(ticket.created_at)}`}
        acao={
          <Link
            href="/suporte"
            className="glass flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
          >
            <ArrowLeft className="size-4" />
            Todos os chamados
          </Link>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <div className="mb-4">
        <Badge tom={TOM[ticket.status] ?? "neutro"}>
          {ROTULO[ticket.status] ?? ticket.status}
        </Badge>
      </div>

      <div className="mb-5 space-y-3">
        {(mensagens ?? []).map((m) => (
          <div
            key={m.id}
            // A resposta do suporte fica visualmente diferente da mensagem da
            // clínica: numa conversa longa, sem essa separação a pessoa relê o
            // que ela mesma escreveu achando que é resposta.
            className={
              m.do_suporte
                ? "glass-forte rounded-2xl rounded-tl-sm p-4"
                : "glass ml-auto max-w-[92%] rounded-2xl rounded-tr-sm p-4"
            }
          >
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
              {m.do_suporte && (
                <Headset className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              )}
              {m.do_suporte ? "Suporte VetHub" : (m.autor?.nome ?? "Você")}
              <span className="font-normal"> · {formatDataHora(m.created_at)}</span>
            </p>
            <p className="text-sm whitespace-pre-line text-ink">{m.texto}</p>
          </div>
        ))}
      </div>

      <Card>
        {resolvido ? (
          <p className="text-sm text-ink-muted">
            Este chamado foi resolvido. Se o problema voltar, escreva abaixo que
            ele reabre.
          </p>
        ) : null}

        <form action={responder} className={resolvido ? "mt-3" : undefined}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              {resolvido ? "Reabrir com uma nova mensagem" : "Responder"}
            </span>
            <Textarea name="texto" rows={3} maxLength={4000} required />
          </label>
          <div className="mt-3">
            <SubmitButton>Enviar</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
