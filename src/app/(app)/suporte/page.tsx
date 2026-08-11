import Link from "next/link";
import { LifeBuoy, MessageSquare, Plus } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { abrirChamado } from "./actions";

export const metadata = { title: "Suporte" };

/**
 * O canal de suporte dentro do sistema.
 *
 * Antes disso o único caminho era o WhatsApp do dono, que funciona com três
 * clínicas e desmonta com trinta: a conversa se perde no meio de mensagem
 * pessoal, ninguém sabe o que ficou sem resposta, e o histórico do problema
 * some quando o celular troca.
 *
 * Aqui cada assunto vira um chamado com histórico próprio, e a clínica
 * enxerga o que já perguntou — o que reduz a pergunta repetida, que é a
 * maior parte do volume de qualquer suporte.
 */
export const TOM: Record<string, "info" | "success" | "pending" | "neutro"> = {
  aberto: "info",
  respondido: "success",
  aguardando_cliente: "pending",
  resolvido: "neutro",
};

export const ROTULO: Record<string, string> = {
  aberto: "Aguardando resposta",
  respondido: "Respondido",
  aguardando_cliente: "Esperando você",
  resolvido: "Resolvido",
};

export const CATEGORIAS = [
  { valor: "duvida", rotulo: "Dúvida de como usar" },
  { valor: "problema", rotulo: "Algo não está funcionando" },
  { valor: "sugestao", rotulo: "Sugestão de melhoria" },
  { valor: "cobranca", rotulo: "Assinatura e pagamento" },
];

interface TicketLinha {
  id: string;
  assunto: string;
  categoria: string;
  status: string;
  created_at: string;
  updated_at: string;
  mensagens: { count: number }[];
}

export default async function SuportePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { supabase } = await getSessao();

  const { data } = await supabase
    .from("ticket")
    .select("id, assunto, categoria, status, created_at, updated_at, mensagens:ticket_mensagem (count)")
    .order("updated_at", { ascending: false })
    .returns<TicketLinha[]>();

  const chamados = data ?? [];
  const abertos = chamados.filter((c) => c.status !== "resolvido");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Suporte"
        subtitulo="Fale com quem faz o VetHub. Respondemos em horário comercial."
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      <Card className="mb-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
          <Plus className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
          Abrir um chamado
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          Quanto mais detalhe, mais rápido a resposta. Diga em que tela estava e
          o que esperava que acontecesse.
        </p>

        <form action={abrirChamado} className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Assunto <span className="text-red-100">*</span>
            </span>
            <Input
              name="assunto"
              required
              maxLength={120}
              placeholder="Ex.: não consigo lançar venda no PDV"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Tipo</span>
            <Select name="categoria" defaultValue="duvida">
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              O que aconteceu <span className="text-red-100">*</span>
            </span>
            <Textarea
              name="texto"
              rows={4}
              required
              maxLength={4000}
              placeholder="Descreva o passo a passo do que você fez e o que apareceu na tela."
            />
          </label>

          <div>
            <SubmitButton>Enviar chamado</SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-ink">
          {chamados.length === 0
            ? "Seus chamados"
            : `Seus chamados (${abertos.length} em aberto)`}
        </h2>

        {chamados.length === 0 ? (
          <EmptyState
            icone={<LifeBuoy className="size-7" strokeWidth={1.8} />}
            titulo="Nenhum chamado ainda"
            mensagem="Quando você abrir um, ele fica aqui com todo o histórico da conversa."
          />
        ) : (
          <ul className="divide-y divide-edge">
            {chamados.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/suporte/${c.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/15"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {c.assunto}
                      <Badge tom={TOM[c.status] ?? "neutro"}>
                        {ROTULO[c.status] ?? c.status}
                      </Badge>
                    </p>
                    <p className="text-sm text-ink-muted">
                      Aberto em {formatDataHora(c.created_at)}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted">
                    <MessageSquare className="size-4" strokeWidth={1.8} aria-hidden />
                    {c.mensagens?.[0]?.count ?? 0}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
