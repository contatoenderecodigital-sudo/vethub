import Link from "next/link";
import { Headset, MessageSquare } from "lucide-react";
import { exigirDono } from "@/lib/dono";
import { formatDataHora } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Suporte · painel do dono" };

/**
 * A caixa de entrada de quem atende.
 *
 * Ordenada pelo que está esperando resposta há mais tempo, e não pelo mais
 * recente: numa fila de suporte, o pedido antigo sem resposta é o que vira
 * cancelamento. O mais novo pode esperar dez minutos; o de anteontem, não.
 */
interface Linha {
  id: string;
  assunto: string;
  categoria: string;
  status: string;
  prioridade: string;
  created_at: string;
  updated_at: string;
  clinica: { id: string; nome: string; plano: string } | null;
  mensagens: { count: number }[];
}

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

export default async function SuporteDonoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { admin } = await exigirDono();

  let query = admin
    .from("ticket")
    .select(
      "id, assunto, categoria, status, prioridade, created_at, updated_at, clinica:clinica_id (id, nome, plano), mensagens:ticket_mensagem (count)"
    )
    // Mais antigo primeiro: é o que vira cancelamento se ficar sem resposta.
    .order("updated_at", { ascending: true })
    .limit(200);

  if (!status) query = query.neq("status", "resolvido");
  else if (status !== "todos") query = query.eq("status", status);

  const { data } = await query.returns<Linha[]>();
  const chamados = data ?? [];

  const FILTROS = [
    { valor: "", rotulo: "Em aberto" },
    { valor: "aberto", rotulo: "Esperando você" },
    { valor: "resolvido", rotulo: "Resolvidos" },
    { valor: "todos", rotulo: "Todos" },
  ];

  return (
    <div>
      <PageHeader
        titulo="Suporte"
        subtitulo={
          chamados.length === 0
            ? "Nada esperando resposta"
            : `${chamados.length} chamado${chamados.length === 1 ? "" : "s"}, do mais antigo para o mais novo`
        }
        acao={
          <Link
            href="/dono"
            className="glass flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink"
          >
            Painel do dono
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = (status ?? "") === f.valor;
          return (
            <Link
              key={f.valor || "aberto"}
              href={f.valor ? `/dono/suporte?status=${f.valor}` : "/dono/suporte"}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-4 text-sm transition-colors ${
                ativo
                  ? "bg-white font-semibold text-brand-dark"
                  : "glass font-medium text-ink-muted hover:text-ink"
              }`}
            >
              {f.rotulo}
            </Link>
          );
        })}
      </div>

      <Card>
        {chamados.length === 0 ? (
          <EmptyState
            icone={<Headset className="size-7" strokeWidth={1.8} />}
            titulo="Caixa vazia"
            mensagem="Quando uma clínica abrir um chamado, ele aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-edge">
            {chamados.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dono/suporte/${c.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/15"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {c.assunto}
                      <Badge tom={TOM[c.status] ?? "neutro"}>
                        {ROTULO[c.status] ?? c.status}
                      </Badge>
                      {c.prioridade === "alta" && <Badge tom="danger">Urgente</Badge>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {c.clinica?.nome ?? "Clínica removida"} ·{" "}
                      {CATEGORIA[c.categoria] ?? c.categoria} · última mexida{" "}
                      {formatDataHora(c.updated_at)}
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
