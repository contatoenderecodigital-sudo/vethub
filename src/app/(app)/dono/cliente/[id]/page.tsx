import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, Users, Wallet } from "lucide-react";
import { exigirDono } from "@/lib/dono";
import { formatBRL, formatDataISO, formatDataHora, hojeISO } from "@/lib/format";
import { DEFINICAO, SOBRE_CICLO, tetoDeUsuarios, type Ciclo, type PlanoConta } from "@/lib/plano-conta";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Estatistica } from "@/components/ui/estatistica";
import { Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { CampoData } from "@/components/ui/campo-data";
import { registrarPagamento } from "../../suporte/actions";

export const metadata = { title: "Cliente · painel do dono" };

/**
 * Tudo sobre uma clínica, num lugar.
 *
 * O número que mais importa aqui não é quanto ela paga: é se ela está USANDO.
 * Clínica que parou de lançar consulta cancela no mês seguinte, e é o único
 * aviso que chega antes do pedido de cancelamento. Faturamento diz o passado;
 * uso diz o futuro.
 */

interface ClinicaDetalhe {
  id: string;
  nome: string;
  plano: string;
  ciclo: string;
  trial_termina_em: string | null;
  renova_em: string | null;
  limite_usuarios: number | null;
  origem_ref: string | null;
  created_at: string;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  parceiro: { nome: string; comissao_percentual: number } | null;
}

const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const { admin } = await exigirDono();

  const desde30 = `${diasAtras(30)}T00:00:00`;
  const desde7 = `${diasAtras(7)}T00:00:00`;

  const [
    { data: clinica },
    { count: usuarios },
    { count: consultas30 },
    { count: consultas7 },
    { count: agendamentos30 },
    { count: vendas30 },
    { data: pagamentos },
    { data: tickets },
    { data: ultimaConsulta },
  ] = await Promise.all([
    admin
      .from("clinica")
      .select(
        "id, nome, plano, ciclo, trial_termina_em, renova_em, limite_usuarios, origem_ref, created_at, telefone, cidade, uf, parceiro:parceiro_id (nome, comissao_percentual)"
      )
      .eq("id", id)
      .maybeSingle<ClinicaDetalhe>(),
    admin.from("usuario").select("id", { count: "exact", head: true }).eq("clinica_id", id),
    admin.from("consulta").select("id", { count: "exact", head: true }).eq("clinica_id", id).gte("data", desde30),
    admin.from("consulta").select("id", { count: "exact", head: true }).eq("clinica_id", id).gte("data", desde7),
    admin.from("agendamento").select("id", { count: "exact", head: true }).eq("clinica_id", id).gte("data_hora", desde30),
    admin.from("venda").select("id", { count: "exact", head: true }).eq("clinica_id", id).gte("data", desde30),
    admin
      .from("pagamento_assinatura")
      .select("id, valor, data, forma, competencia_de, competencia_ate, observacao")
      .eq("clinica_id", id)
      .order("data", { ascending: false })
      .returns<{
        id: string; valor: number; data: string; forma: string;
        competencia_de: string | null; competencia_ate: string | null; observacao: string | null;
      }[]>(),
    admin
      .from("ticket")
      .select("id, assunto, status, created_at")
      .eq("clinica_id", id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; assunto: string; status: string; created_at: string }[]>(),
    admin
      .from("consulta")
      .select("data")
      .eq("clinica_id", id)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle<{ data: string }>(),
  ]);

  if (!clinica) notFound();

  const plano = clinica.plano as PlanoConta;
  const teto = tetoDeUsuarios(clinica.plano, clinica.limite_usuarios);
  const pago = (pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);

  // Até quando está paga: a maior competência já registrada.
  const cobertaAte = (pagamentos ?? [])
    .map((p) => p.competencia_ate)
    .filter(Boolean)
    .sort()
    .pop();
  const emDia = !!cobertaAte && cobertaAte >= hojeISO();

  // O sinal de abandono: parou de atender.
  // Conta pela DATA de hoje, não pelo instante: `Date.now()` num componente
  // de servidor é chamada impura, e o dia é a unidade que interessa aqui —
  // "parou há 14 dias" não muda de resposta às três da tarde.
  const diasSemUso = ultimaConsulta?.data
    ? Math.round(
        (new Date(`${hojeISO()}T12:00:00`).getTime() -
          new Date(`${ultimaConsulta.data.slice(0, 10)}T12:00:00`).getTime()) /
          86400000
      )
    : null;
  const sumiu = diasSemUso !== null && diasSemUso > 14;

  const registrar = registrarPagamento.bind(null, id);

  return (
    <div>
      <PageHeader
        titulo={clinica.nome}
        subtitulo={[
          `Cliente desde ${formatDataISO(clinica.created_at.slice(0, 10))}`,
          [clinica.cidade, clinica.uf].filter(Boolean).join("/"),
          clinica.telefone,
        ]
          .filter(Boolean)
          .join(" · ")}
        acao={
          <Link
            href="/dono"
            className="glass flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink"
          >
            <ArrowLeft className="size-4" />
            Todos os clientes
          </Link>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">{erro}</p>
      )}

      {sumiu && (
        <div className="mb-4 rounded-xl bg-red-400/25 px-4 py-3">
          <p className="text-sm font-medium text-ink">
            Esta clínica não registra consulta há {diasSemUso} dias. Quem para de
            usar cancela no mês seguinte: vale uma ligação antes disso.
          </p>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Estatistica
          rotulo="Plano"
          valor={DEFINICAO[plano]?.nome ?? clinica.plano}
          icone={Wallet}
        />
        <Estatistica rotulo="Usuários" valor={`${usuarios ?? 0} de ${teto ?? "∞"}`} icone={Users} />
        <Estatistica rotulo="Consultas em 30 dias" valor={String(consultas30 ?? 0)} icone={Activity} />
        <Estatistica rotulo="Já pagou" valor={formatBRL(pago)} icone={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Uso */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-ink">Está usando?</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Consultas nos últimos 7 dias", consultas7 ?? 0],
              ["Consultas nos últimos 30 dias", consultas30 ?? 0],
              ["Agendamentos em 30 dias", agendamentos30 ?? 0],
              ["Vendas em 30 dias", vendas30 ?? 0],
            ].map(([rotulo, valor]) => (
              <div key={String(rotulo)} className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">{rotulo}</dt>
                <dd className="font-semibold text-ink tabular-nums">{valor}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-edge pt-2">
              <dt className="text-ink-muted">Última consulta</dt>
              <dd className="font-semibold text-ink">
                {ultimaConsulta?.data
                  ? `${formatDataISO(ultimaConsulta.data.slice(0, 10))} (${diasSemUso}d)`
                  : "nunca"}
              </dd>
            </div>
          </dl>

          {clinica.parceiro && (
            <p className="mt-4 border-t border-edge pt-3 text-sm text-ink">
              Indicada por <strong>{clinica.parceiro.nome}</strong> ·{" "}
              {clinica.parceiro.comissao_percentual}% de comissão
            </p>
          )}
        </Card>

        {/* Pagamentos */}
        <Card>
          <h2 className="mb-1 flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
            Pagamentos
            {cobertaAte && (
              <Badge tom={emDia ? "success" : "danger"}>
                {emDia ? `Pago até ${formatDataISO(cobertaAte)}` : `Vencido em ${formatDataISO(cobertaAte)}`}
              </Badge>
            )}
          </h2>

          {(pagamentos ?? []).length === 0 ? (
            <p className="mb-3 text-sm text-ink-muted">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="mb-4 divide-y divide-edge">
              {pagamentos!.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{formatBRL(p.valor)}</p>
                    <p className="text-sm text-ink-muted">
                      {formatDataISO(p.data)} · {p.forma}
                      {p.competencia_de && p.competencia_ate && (
                        <>
                          {" "}
                          · cobre {formatDataISO(p.competencia_de)} a{" "}
                          {formatDataISO(p.competencia_ate)}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <details className="rounded-xl border border-edge p-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-ink">
              Registrar um pagamento recebido
            </summary>
            <form action={registrar} className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Valor</span>
                <Input name="valor" inputMode="decimal" placeholder="329,00" required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Recebido em</span>
                <CampoData name="data" defaultValue={hojeISO()} aria-label="Data do pagamento" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Forma</span>
                <Select name="forma" defaultValue="pix">
                  <option value="pix">Pix</option>
                  <option value="transferencia">Transferência</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao">Cartão</option>
                  <option value="dinheiro">Dinheiro</option>
                </Select>
              </label>
              <div />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Cobre de</span>
                <CampoData name="competencia_de" aria-label="Início do período pago" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Cobre até</span>
                <CampoData name="competencia_ate" aria-label="Fim do período pago" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-ink-muted">Observação</span>
                <Textarea name="observacao" rows={2} maxLength={300} />
              </label>
              <div className="sm:col-span-2">
                <SubmitButton variante="secondary" className="min-h-11">
                  Registrar
                </SubmitButton>
              </div>
            </form>
          </details>
        </Card>

        {/* Chamados */}
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-ink">Chamados de suporte</h2>
          {(tickets ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nunca abriu um chamado.</p>
          ) : (
            <ul className="divide-y divide-edge">
              {tickets!.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/dono/suporte/${t.id}`}
                    className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-white/15"
                  >
                    <span className="min-w-0 font-medium text-ink">{t.assunto}</span>
                    <span className="shrink-0 text-sm text-ink-muted">
                      {formatDataHora(t.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        Plano, ciclo e limite de usuários se mudam na{" "}
        <Link href="/dono" className="link-vidro font-medium">
          lista de clientes
        </Link>
        . Hoje: {DEFINICAO[plano]?.nome ?? clinica.plano} ·{" "}
        {SOBRE_CICLO[(clinica.ciclo as Ciclo) ?? "mensal"]?.nome}
        {clinica.renova_em && ` · renova em ${formatDataISO(clinica.renova_em)}`}
        {clinica.trial_termina_em && ` · teste até ${formatDataISO(clinica.trial_termina_em)}`}
      </p>
    </div>
  );
}
