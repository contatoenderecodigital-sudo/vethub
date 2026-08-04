import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  Plus,
  Receipt,
  Repeat,
  Search,
  TrendingUp,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO, hojeISO } from "@/lib/format";
import { STATUS_ASSINATURA, type AssinaturaStatus } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeAssinatura } from "../badges";
import { gerarCobrancasDoMes } from "../actions";
import { diasEntre, primeiro, proximaCobranca } from "../schema";

export const metadata = { title: "Assinaturas" };

/** Teto de linhas lidas — clínica normal fica bem abaixo disso. */
const LIMITE = 500;

/** Janela do card "cobranças a vencer". */
const DIAS_AVISO = 7;

interface LinhaAssinatura {
  id: string;
  valor_mensal: number;
  dia_cobranca: number;
  inicio: string;
  status: AssinaturaStatus;
  plano_item_id: string;
  tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
  pet: { id: string; nome: string } | { id: string; nome: string }[] | null;
  plano: { id: string; nome: string } | { id: string; nome: string }[] | null;
}

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    plano?: string;
    erro?: string;
    geradas?: string;
    existentes?: string;
  }>;
}) {
  const { q, status, plano, erro, geradas, existentes } = await searchParams;
  const { supabase, usuario } = await getSessao();
  const podeAssinar = usuario.papel !== "veterinario";
  const podeCobrar = usuario.papel === "admin";

  const statusFiltro = STATUS_ASSINATURA.find((s) => s.valor === status)?.valor;
  const termo = (q ?? "").trim().toLowerCase().slice(0, 60);

  const [{ data: assinaturas }, { data: planos }] = await Promise.all([
    supabase
      .from("assinatura")
      .select(
        "id, valor_mensal, dia_cobranca, inicio, status, plano_item_id, tutor:tutor_id (id, nome), pet:pet_id (id, nome), plano:plano_item_id (id, nome)"
      )
      .order("status")
      .order("inicio", { ascending: false })
      .limit(LIMITE)
      .returns<LinhaAssinatura[]>(),
    supabase
      .from("item")
      .select("id, nome")
      .eq("tipo", "plano")
      .order("nome")
      .limit(300)
      .returns<{ id: string; nome: string }[]>(),
  ]);

  const todas = assinaturas ?? [];
  const hoje = hojeISO();

  // Cards de resumo: sempre sobre TODAS as ativas, independentes dos filtros
  // da lista — o MRR da clínica não muda porque alguém buscou por um tutor.
  const ativas = todas.filter((a) => a.status === "ativa");
  const mrr = ativas.reduce((soma, a) => soma + Number(a.valor_mensal), 0);
  const vencendo = ativas.filter((a) => {
    const dias = diasEntre(hoje, proximaCobranca(a.dia_cobranca, hoje));
    return dias >= 0 && dias <= DIAS_AVISO;
  }).length;

  // Filtros da lista. A busca por tutor/pet é feita em memória: o PostgREST
  // não faz "ou" entre duas tabelas embutidas numa consulta só.
  const lista = todas.filter((a) => {
    if (statusFiltro && a.status !== statusFiltro) return false;
    if (plano && a.plano_item_id !== plano) return false;
    if (!termo) return true;
    const alvo = `${primeiro(a.tutor)?.nome ?? ""} ${primeiro(a.pet)?.nome ?? ""}`;
    return alvo.toLowerCase().includes(termo);
  });

  const temFiltro = !!(termo || statusFiltro || plano);

  const novaAssinatura = (
    <ButtonLink href="/planos/assinaturas/nova">
      <Plus className="size-4" />
      Nova assinatura
    </ButtonLink>
  );

  const cards = [
    {
      rotulo: "Assinaturas ativas",
      valor: String(ativas.length),
      icone: Repeat,
      cor: "text-ink",
      detalhe: `${todas.length} no total (todos os status)`,
    },
    {
      rotulo: "Receita recorrente (MRR)",
      valor: formatBRL(mrr),
      icone: TrendingUp,
      cor: "text-emerald-50",
      detalhe: "Soma do valor mensal das assinaturas ativas",
    },
    {
      rotulo: `Cobrando em ${DIAS_AVISO} dias`,
      valor: String(vencendo),
      icone: CalendarClock,
      cor: "text-amber-50",
      detalhe: "Assinaturas com cobrança nos próximos 7 dias",
    },
  ];

  return (
    <div>
      <PageHeader
        titulo="Assinaturas"
        subtitulo="Receita recorrente dos planos"
        acao={
          <>
            <ButtonLink href="/planos" variante="secondary">
              Planos
            </ButtonLink>
            {podeCobrar && (
              <form action={gerarCobrancasDoMes}>
                <ConfirmButton
                  variante="secondary"
                  mensagem="Gerar a conta a receber deste mês para cada assinatura ativa? Cobranças que já existem não são duplicadas."
                >
                  <Receipt className="size-4" />
                  Gerar cobranças do mês
                </ConfirmButton>
              </form>
            )}
            {podeAssinar && novaAssinatura}
          </>
        }
      />

      {erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100" role="alert">
          {erro}
        </p>
      )}

      {geradas != null && (
        <p className="mb-4 rounded-lg border border-emerald-200/40 bg-emerald-300/20 px-3 py-2 text-sm text-emerald-50">
          {Number(geradas)}{" "}
          {Number(geradas) === 1 ? "cobrança gerada" : "cobranças geradas"} ·{" "}
          {Number(existentes ?? 0)}{" "}
          {Number(existentes ?? 0) === 1 ? "já existia" : "já existiam"}.{" "}
          <Link
            href="/financeiro/receber"
            className="font-medium text-white underline"
          >
            Ver contas a receber
          </Link>
        </p>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.rotulo} className="glass rounded-2xl p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
              <c.icone className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
              {c.rotulo}
            </p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${c.cor}`}>
              {c.valor}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{c.detalhe}</p>
          </div>
        ))}
      </div>

      <form
        method="get"
        className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por tutor ou pet…"
          className="sm:max-w-xs"
        />
        <Select
          name="status"
          defaultValue={statusFiltro ?? ""}
          aria-label="Filtrar por status"
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          {STATUS_ASSINATURA.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </Select>
        <Select
          name="plano"
          defaultValue={plano ?? ""}
          aria-label="Filtrar por plano"
          className="sm:w-56"
        >
          <option value="">Todos os planos</option>
          {(planos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <Button type="submit" variante="secondary">
          <Search className="size-4" />
          Filtrar
        </Button>
      </form>

      {lista.length === 0 ? (
        <EmptyState
          icone={<Repeat className="size-7" strokeWidth={1.8} />}
          titulo={
            temFiltro ? "Nenhuma assinatura encontrada" : "Nenhuma assinatura ainda"
          }
          mensagem={
            temFiltro
              ? "Tente ajustar a busca ou os filtros."
              : "Assine um plano para um tutor e a clínica passa a ter receita recorrente todo mês."
          }
          acao={!temFiltro && podeAssinar ? novaAssinatura : undefined}
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {lista.map((a) => {
              const tutor = primeiro(a.tutor);
              const pet = primeiro(a.pet);
              const nomePlano = primeiro(a.plano)?.nome ?? "Plano removido";
              return (
                <li key={a.id}>
                  <Link
                    href={`/planos/assinaturas/${a.id}`}
                    className="mx-2 my-1 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/15"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                        <span className="truncate">
                          {tutor?.nome ?? "Tutor removido"}
                        </span>
                        <BadgeAssinatura status={a.status} />
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {[
                          pet?.nome,
                          nomePlano,
                          `Cobrança dia ${a.dia_cobranca}`,
                          `Desde ${formatDataISO(a.inicio)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <span className="shrink-0 font-semibold text-ink tabular-nums">
                      {formatBRL(a.valor_mensal)}
                      <span className="text-xs font-normal text-ink-muted"> /mês</span>
                    </span>

                    <ChevronRight className="size-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {todas.length >= LIMITE && (
        <p className="mt-3 text-xs text-ink-muted">
          Mostrando as {LIMITE} assinaturas mais recentes.
        </p>
      )}
    </div>
  );
}
