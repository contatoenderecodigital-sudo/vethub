import Link from "next/link";
import {
  Ban,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, hojeISO } from "@/lib/format";
import {
  rotuloFormaPagamento,
  saldoDaConta,
  type CategoriaFinanceira,
  type ContaStatus,
  type ContaTipo,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { BadgeStatusConta, BadgeVencimento } from "./badges";
import { BaixaForm } from "./baixa-form";
import { cancelarConta, estornarBaixa, excluirConta } from "./actions";
import { filtroData } from "./schema";

const POR_PAGINA = 20;

/** Teto do totalizador: soma o conjunto filtrado sem varrer a clínica inteira. */
const LIMITE_TOTALIZADOR = 1000;

type StatusFiltro = "todas" | "abertas" | "vencidas" | "pagas";

const ABAS: { valor: StatusFiltro; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "abertas", rotulo: "Abertas" },
  { valor: "vencidas", rotulo: "Vencidas" },
  { valor: "pagas", rotulo: "Pagas" },
];

const SELECT_LINHA =
  "id, tipo, descricao, valor, valor_pago, vencimento, pagamento, status, " +
  "fornecedor, forma_pagamento, categoria:categoria_id (id, nome), " +
  "tutor:tutor_id (id, nome)";

interface LinhaConta {
  id: string;
  tipo: ContaTipo;
  descricao: string;
  valor: number;
  valor_pago: number;
  vencimento: string;
  pagamento: string | null;
  status: ContaStatus;
  fornecedor: string | null;
  forma_pagamento: string | null;
  categoria: { id: string; nome: string } | null;
  tutor: { id: string; nome: string } | null;
}

export interface FiltrosContas {
  status?: string;
  de?: string;
  ate?: string;
  q?: string;
  categoria?: string;
  pagina?: string;
  erro?: string;
}

const TEXTO: Record<ContaTipo, { titulo: string; pessoa: string; vazio: string }> = {
  receber: {
    titulo: "Contas a receber",
    pessoa: "Tutor",
    vazio: "Cadastre o que a clínica tem para receber e acompanhe os vencimentos.",
  },
  pagar: {
    titulo: "Contas a pagar",
    pessoa: "Fornecedor",
    vazio: "Cadastre as despesas da clínica para não perder nenhum vencimento.",
  },
};

/**
 * Lista de contas parametrizada pelo tipo — a mesma tela serve
 * "a receber" e "a pagar", mudando só os rótulos e o destino dos links.
 */
export async function ListaContas({
  tipo,
  filtros,
}: {
  tipo: ContaTipo;
  filtros: FiltrosContas;
}) {
  const { supabase, usuario } = await getSessao();
  const ehAdmin = usuario.papel === "admin";
  // Veterinário consulta o financeiro, mas não mexe no caixa (o servidor confere de novo).
  const podeMexer = ehAdmin || usuario.papel === "recepcao";
  const base = `/financeiro/${tipo}`;
  const hoje = hojeISO();

  const status =
    ABAS.find((a) => a.valor === filtros.status)?.valor ?? ("todas" as StatusFiltro);
  const de = filtroData(filtros.de);
  const ate = filtroData(filtros.ate);
  const categoria = filtros.categoria?.trim() || undefined;
  const busca = filtros.q?.trim() || undefined;
  const pagina = Math.max(1, parseInt(filtros.pagina ?? "1", 10) || 1);

  const { data: categorias } = await supabase
    .from("categoria_financeira")
    .select("id, nome, tipo")
    .eq("tipo", tipo === "receber" ? "receita" : "despesa")
    .order("nome")
    .returns<Pick<CategoriaFinanceira, "id" | "nome" | "tipo">[]>();

  // A busca por tutor não cabe num .or() com tabela embutida: resolve-se
  // primeiro quais tutores batem com o termo e usa-se os ids no filtro.
  let idsTutores: string[] = [];
  if (busca && tipo === "receber") {
    const { data } = await supabase
      .from("tutor")
      .select("id")
      .ilike("nome", `%${busca}%`)
      .limit(50)
      .returns<{ id: string }[]>();
    idsTutores = (data ?? []).map((t) => t.id);
  }

  /** Monta a consulta com todos os filtros aplicados (usada 2x: lista e total). */
  const consultar = (campos: string, contar: boolean) => {
    let q = supabase
      .from("conta")
      .select(campos, contar ? { count: "exact" } : undefined)
      .eq("tipo", tipo);

    if (status === "abertas") q = q.in("status", ["aberta", "parcial"]);
    if (status === "pagas") q = q.eq("status", "paga");
    if (status === "vencidas") {
      q = q.in("status", ["aberta", "parcial"]).lt("vencimento", hoje);
    }
    if (de) q = q.gte("vencimento", de);
    if (ate) q = q.lte("vencimento", ate);
    if (categoria) q = q.eq("categoria_id", categoria);
    if (busca) {
      // vírgulas e parênteses quebram a sintaxe do filtro .or() do PostgREST
      const termo = busca.replace(/[%,()]/g, " ").trim();
      const partes = [`descricao.ilike.%${termo}%`, `fornecedor.ilike.%${termo}%`];
      if (idsTutores.length > 0) partes.push(`tutor_id.in.(${idsTutores.join(",")})`);
      q = q.or(partes.join(","));
    }
    return q;
  };

  const [{ data, count }, { data: todas }] = await Promise.all([
    consultar(SELECT_LINHA, true)
      .order("vencimento", { ascending: status === "pagas" ? false : true })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
      .returns<LinhaConta[]>(),
    consultar("valor, valor_pago, status", false)
      .limit(LIMITE_TOTALIZADOR)
      .returns<Pick<LinhaConta, "valor" | "valor_pago" | "status">[]>(),
  ]);

  const contas = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  // Totalizador do que está filtrado: canceladas não entram na conta.
  let somaValor = 0;
  let somaAberto = 0;
  for (const c of todas ?? []) {
    if (c.status === "cancelada") continue;
    somaValor += Number(c.valor);
    somaAberto += saldoDaConta(c);
  }
  const truncado = (todas?.length ?? 0) >= LIMITE_TOTALIZADOR;

  const paramsUrl = { status, de, ate, q: busca, categoria };

  /** URL atual (com filtros e página) — as ações voltam exatamente para cá. */
  const voltar = (() => {
    const sp = new URLSearchParams();
    Object.entries({ ...paramsUrl, pagina: pagina > 1 ? String(pagina) : undefined })
      .filter(([, v]) => v)
      .forEach(([k, v]) => sp.set(k, String(v)));
    const query = sp.toString();
    return query ? `${base}?${query}` : base;
  })();

  const linkAba = (valor: StatusFiltro) => {
    const sp = new URLSearchParams();
    Object.entries(paramsUrl)
      .filter(([k, v]) => v && k !== "status")
      .forEach(([k, v]) => sp.set(k, String(v)));
    sp.set("status", valor);
    return `${base}?${sp.toString()}`;
  };

  return (
    <div>
      <PageHeader
        titulo={TEXTO[tipo].titulo}
        subtitulo={count != null ? `${count} ${count === 1 ? "conta" : "contas"}` : undefined}
        acao={
          <>
            <ButtonLink href="/financeiro" variante="secondary">
              Painel
            </ButtonLink>
            {podeMexer && (
              <ButtonLink href={`/financeiro/nova?tipo=${tipo}`}>
                <Plus className="size-4" />
                Nova conta
              </ButtonLink>
            )}
          </>
        }
      />

      {filtros.erro && (
        <p className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100">
          {filtros.erro}
        </p>
      )}

      <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtro por status">
        {ABAS.map((aba) => {
          const ativa = aba.valor === status;
          return (
            <Link
              key={aba.valor}
              href={linkAba(aba.valor)}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                ativa
                  ? "bg-brand text-white shadow-sm"
                  : "border border-white/70 bg-white/50 text-ink-muted backdrop-blur-md hover:bg-white/80 hover:text-ink"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </nav>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="status" value={status} />
        <div className="min-w-56 flex-1">
          <Input
            type="search"
            name="q"
            defaultValue={busca ?? ""}
            placeholder={`Buscar por descrição${tipo === "receber" ? " ou tutor" : " ou fornecedor"}…`}
            aria-label="Buscar"
          />
        </div>
        <div className="min-w-48 flex-1">
          <Select
            name="categoria"
            defaultValue={categoria ?? ""}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex min-w-64 flex-1 flex-wrap items-center gap-2">
          <div className="min-w-32 flex-1">
            <Input
              type="date"
              name="de"
              defaultValue={de ?? ""}
              aria-label="Vencimento de"
              title="Vencimento de"
            />
          </div>
          <span className="text-sm text-ink-muted">até</span>
          <div className="min-w-32 flex-1">
            <Input
              type="date"
              name="ate"
              defaultValue={ate ?? ""}
              aria-label="Vencimento até"
              title="Vencimento até"
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="submit" variante="secondary">
            <Search className="size-4" />
            Filtrar
          </Button>
          {(busca || categoria || de || ate) && (
            <ButtonLink href={base} variante="ghost">
              Limpar
            </ButtonLink>
          )}
        </div>
      </form>

      <div className="glass mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Total filtrado
          </p>
          <p className="text-2xl font-bold text-ink tabular-nums">
            {formatBRL(somaValor)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
            Ainda em aberto
          </p>
          <p
            className={`text-xl font-semibold tabular-nums ${
              somaAberto > 0 ? "text-amber-50" : "text-emerald-50"
            }`}
          >
            {formatBRL(somaAberto)}
          </p>
        </div>
        {truncado && (
          <p className="w-full text-xs text-ink-muted">
            Somando as primeiras {LIMITE_TOTALIZADOR} contas do filtro. Refine o
            período para um total exato.
          </p>
        )}
      </div>

      {contas.length === 0 ? (
        <EmptyState
          icone={<Wallet className="size-7" strokeWidth={1.8} />}
          titulo="Nenhuma conta encontrada"
          mensagem={
            busca || categoria || de || ate || status !== "todas"
              ? "Ajuste os filtros para ver outras contas."
              : TEXTO[tipo].vazio
          }
          acao={
            podeMexer && (
              <ButtonLink href={`/financeiro/nova?tipo=${tipo}`}>
                <Plus className="size-4" />
                Nova conta
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {contas.map((c) => {
              const saldo = saldoDaConta(c);
              const pessoa =
                tipo === "receber" ? c.tutor?.nome ?? null : c.fornecedor ?? null;
              const podeBaixar =
                podeMexer && (c.status === "aberta" || c.status === "parcial");

              return (
                <li key={c.id} className="px-3 py-3 sm:px-4">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{c.descricao}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                        <span>{c.categoria?.nome ?? "Sem categoria"}</span>
                        {pessoa && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="truncate">
                              {TEXTO[tipo].pessoa}: {pessoa}
                            </span>
                          </>
                        )}
                        {c.status === "paga" && c.forma_pagamento && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{rotuloFormaPagamento(c.forma_pagamento)}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-1.5">
                        <BadgeVencimento vencimento={c.vencimento} status={c.status} />
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-ink tabular-nums">
                        {formatBRL(c.valor)}
                      </p>
                      {Number(c.valor_pago) > 0 && c.status !== "paga" && (
                        <p className="text-xs text-ink-muted tabular-nums">
                          Pago {formatBRL(c.valor_pago)} · falta {formatBRL(saldo)}
                        </p>
                      )}
                      <div className="mt-1 flex justify-end">
                        <BadgeStatusConta status={c.status} />
                      </div>
                    </div>

                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
                      {podeBaixar && (
                        <BaixaForm
                          contaId={c.id}
                          tipo={tipo}
                          saldo={saldo}
                          voltar={voltar}
                        />
                      )}

                      {podeMexer && (c.status === "paga" || c.status === "parcial") && (
                        <form action={estornarBaixa.bind(null, c.id, voltar)}>
                          <ConfirmButton
                            variante="ghost"
                            tamanho="sm"
                            className="min-h-11 sm:min-h-10"
                            mensagem="Estornar a baixa? A conta volta para 'em aberto' e o valor pago é zerado."
                            aria-label={`Estornar baixa de ${c.descricao}`}
                          >
                            <RotateCcw className="size-4" />
                            <span className="sr-only">Estornar</span>
                          </ConfirmButton>
                        </form>
                      )}

                      {podeMexer && (
                        <Link
                          href={`/financeiro/${c.id}/editar`}
                          aria-label={`Editar ${c.descricao}`}
                          className="inline-flex min-h-11 size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/15 hover:text-white sm:min-h-10"
                        >
                          <Pencil className="size-4" />
                        </Link>
                      )}

                      {ehAdmin && c.status !== "cancelada" && (
                        <form action={cancelarConta.bind(null, c.id, voltar)}>
                          <ConfirmButton
                            variante="ghost"
                            tamanho="sm"
                            className="min-h-11 sm:min-h-10"
                            mensagem="Cancelar esta conta? Ela sai dos totais, mas fica no histórico."
                            aria-label={`Cancelar ${c.descricao}`}
                          >
                            <Ban className="size-4" />
                            <span className="sr-only">Cancelar</span>
                          </ConfirmButton>
                        </form>
                      )}

                      {ehAdmin && (
                        <form action={excluirConta.bind(null, c.id, voltar)}>
                          <ConfirmButton
                            variante="ghost"
                            tamanho="sm"
                            className="min-h-11 sm:min-h-10"
                            mensagem="Excluir esta conta em definitivo?"
                            aria-label={`Excluir ${c.descricao}`}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Excluir</span>
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </div>

                  {c.status === "cancelada" && (
                    <div className="mt-2">
                      <Badge tom="danger">Conta cancelada</Badge>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl={base}
        params={paramsUrl}
      />
    </div>
  );
}
