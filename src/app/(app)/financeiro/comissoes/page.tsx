import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Calculator,
  Percent,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataISO } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Estatistica,
  GradeEstatisticas,
  type EstatisticaProps,
} from "@/components/ui/estatistica";
import { Campo, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import {
  apurarComissoes,
  estornarComissao,
  marcarComissaoPaga,
  pagarComissoesDoProfissional,
} from "./actions";
import {
  ABAS,
  LIMITE_RESUMO,
  POR_PAGINA,
  centavos,
  formatPercentual,
  idDaUrl,
  resolverPeriodo,
  statusDaUrl,
  type StatusComissao,
} from "./schema";

export const metadata = { title: "Comissões" };

const BASE = "/financeiro/comissoes";

const SELECT_LINHA =
  "id, descricao, base_calculo, percentual, valor, data, pago, pago_em, " +
  "profissional:profissional_id (id, nome)";

interface LinhaComissao {
  id: string;
  descricao: string;
  base_calculo: number;
  percentual: number;
  valor: number;
  data: string;
  pago: boolean;
  pago_em: string | null;
  profissional: { id: string; nome: string } | null;
}

interface LinhaResumo {
  valor: number;
  pago: boolean;
  profissional: { id: string; nome: string } | null;
}

interface PorProfissional {
  id: string;
  nome: string;
  aPagar: number;
  pago: number;
  quantidade: number;
}

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    prof?: string;
    status?: string;
    pagina?: string;
    erro?: string;
    geradas?: string;
    puladas?: string;
  }>;
}) {
  const filtros = await searchParams;
  const { supabase, usuario } = await getSessao();

  // Recepção não enxerga o que a clínica paga à equipe.
  if (usuario.papel === "recepcao") redirect("/dashboard");

  const ehAdmin = usuario.papel === "admin";
  const ehVeterinario = usuario.papel === "veterinario";

  const periodo = resolverPeriodo(filtros.de, filtros.ate);
  const status = statusDaUrl(filtros.status);
  // Veterinário só vê as próprias comissões. O filtro nem aparece para ele.
  const profissional = ehVeterinario ? usuario.id : idDaUrl(filtros.prof);
  const pagina = Math.max(1, parseInt(filtros.pagina ?? "1", 10) || 1);

  /** Consulta com os filtros de período e profissional já aplicados. */
  const consultar = (campos: string, contar: boolean) => {
    let q = supabase
      .from("comissao")
      .select(campos, contar ? { count: "exact" } : undefined)
      .gte("data", periodo.de)
      .lte("data", periodo.ate);
    if (profissional) q = q.eq("profissional_id", profissional);
    return q;
  };

  const consultaLista = (() => {
    let q = consultar(SELECT_LINHA, true);
    if (status === "apagar") q = q.eq("pago", false);
    if (status === "pagas") q = q.eq("pago", true);
    return q
      .order("data", { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
      .returns<LinhaComissao[]>();
  })();

  const [{ data, count }, { data: todas }, { data: equipe }] = await Promise.all([
    consultaLista,
    consultar("valor, pago, profissional:profissional_id (id, nome)", false)
      .limit(LIMITE_RESUMO)
      .returns<LinhaResumo[]>(),
    ehVeterinario
      ? Promise.resolve({ data: [] as { id: string; nome: string }[] })
      : supabase
          .from("usuario")
          .select("id, nome")
          .in("papel", ["admin", "veterinario", "recepcao"])
          .order("nome")
          .limit(300)
          .returns<{ id: string; nome: string }[]>(),
  ]);

  const comissoes = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  // Resumo do período (independe da aba: mostra os dois lados sempre).
  let totalAPagar = 0;
  let totalPago = 0;
  const mapaProfissionais = new Map<string, PorProfissional>();

  for (const linha of todas ?? []) {
    const valor = Number(linha.valor);
    if (linha.pago) totalPago += valor;
    else totalAPagar += valor;

    const prof = linha.profissional;
    const chave = prof?.id ?? "sem";
    const atual = mapaProfissionais.get(chave) ?? {
      id: prof?.id ?? "",
      nome: prof?.nome ?? "Sem profissional",
      aPagar: 0,
      pago: 0,
      quantidade: 0,
    };
    atual.quantidade += 1;
    if (linha.pago) atual.pago = centavos(atual.pago + valor);
    else atual.aPagar = centavos(atual.aPagar + valor);
    mapaProfissionais.set(chave, atual);
  }

  totalAPagar = centavos(totalAPagar);
  totalPago = centavos(totalPago);

  const porProfissional = [...mapaProfissionais.values()].sort(
    (a, b) => b.aPagar + b.pago - (a.aPagar + a.pago)
  );

  const truncado = (todas?.length ?? 0) >= LIMITE_RESUMO;

  const paramsUrl = {
    status,
    de: periodo.de,
    ate: periodo.ate,
    prof: ehVeterinario ? undefined : profissional,
  };

  /** URL atual (com filtros e página). As ações voltam exatamente para cá. */
  const voltar = (() => {
    const sp = new URLSearchParams();
    Object.entries({
      ...paramsUrl,
      pagina: pagina > 1 ? String(pagina) : undefined,
    })
      .filter(([, v]) => v)
      .forEach(([k, v]) => sp.set(k, String(v)));
    const query = sp.toString();
    return query ? `${BASE}?${query}` : BASE;
  })();

  const linkAba = (valor: StatusComissao) => {
    const sp = new URLSearchParams();
    Object.entries(paramsUrl)
      .filter(([k, v]) => v && k !== "status")
      .forEach(([k, v]) => sp.set(k, String(v)));
    sp.set("status", valor);
    return `${BASE}?${sp.toString()}`;
  };

  const geradas = filtros.geradas != null ? Number(filtros.geradas) : null;
  const puladas = Number(filtros.puladas ?? 0);

  const cards: EstatisticaProps[] = [
    {
      rotulo: "A pagar no período",
      valor: formatBRL(totalAPagar),
      icone: Wallet,
      tom: totalAPagar > 0 ? "atencao" : "neutro",
      detalhe: "Comissões apuradas e ainda não quitadas",
    },
    {
      rotulo: "Pago no período",
      valor: formatBRL(totalPago),
      icone: BadgeCheck,
      tom: "positivo",
      detalhe: "Comissões já quitadas com a equipe",
    },
    {
      rotulo: "Total apurado",
      valor: formatBRL(centavos(totalAPagar + totalPago)),
      icone: Percent,
      detalhe: `${todas?.length ?? 0} ${
        (todas?.length ?? 0) === 1 ? "lançamento" : "lançamentos"
      } no período`,
    },
  ];

  return (
    <div>
      <PageHeader
        titulo="Comissões"
        subtitulo={`De ${formatDataISO(periodo.de)} a ${formatDataISO(periodo.ate)}`}
        acao={
          <>
            <ButtonLink href="/financeiro" variante="secondary">
              Painel
            </ButtonLink>
            {ehAdmin && (
              <form action={apurarComissoes.bind(null, periodo.de, periodo.ate)}>
                <ConfirmButton mensagem="Gerar as comissões das vendas pagas deste período? Itens que já geraram comissão não são duplicados.">
                  <Calculator className="size-4" />
                  Apurar comissões do período
                </ConfirmButton>
              </form>
            )}
          </>
        }
      />

      {filtros.erro && (
        <p
          className="mb-4 rounded-lg bg-red-400/25 px-3 py-2 text-sm text-red-100"
          role="alert"
        >
          {filtros.erro}
        </p>
      )}

      {geradas != null && Number.isFinite(geradas) && (
        <p className="mb-4 rounded-lg border border-emerald-200/40 bg-emerald-300/20 px-3 py-2 text-sm text-emerald-50">
          {geradas} {geradas === 1 ? "comissão gerada" : "comissões geradas"}
          {puladas > 0 && (
            <>
              {" "}
              · {puladas}{" "}
              {puladas === 1 ? "item já tinha comissão" : "itens já tinham comissão"}
            </>
          )}
          .
        </p>
      )}

      <nav className="mb-3 flex flex-wrap gap-2" aria-label="Filtro por situação">
        {ABAS.map((aba) => {
          const ativa = aba.valor === status;
          return (
            <Link
              key={aba.valor}
              href={linkAba(aba.valor)}
              aria-current={ativa ? "page" : undefined}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                ativa
                  ? "bg-white text-brand-dark font-semibold shadow-sm"
                  : "border border-white/40 bg-white/15 text-ink backdrop-blur-md hover:bg-white/25"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </nav>

      <form
        method="get"
        className="glass mb-4 flex flex-wrap items-end gap-2 rounded-2xl p-3 sm:p-4"
      >
        <input type="hidden" name="status" value={status} />
        <div className="min-w-32 flex-1">
          <Campo rotulo="De" htmlFor="de">
            <CampoData
              id="de"
              name="de"
              min="2015-01-01"
              max="2099-12-31"
              defaultValue={periodo.de}
            />
          </Campo>
        </div>
        <div className="min-w-32 flex-1">
          <Campo rotulo="Até" htmlFor="ate">
            <CampoData
              id="ate"
              name="ate"
              min="2015-01-01"
              max="2099-12-31"
              defaultValue={periodo.ate}
            />
          </Campo>
        </div>
        {!ehVeterinario && (
          <div className="min-w-48 flex-1">
            <Campo rotulo="Profissional" htmlFor="prof">
              <Select id="prof" name="prof" defaultValue={profissional ?? ""}>
                <option value="">Todos</option>
                {(equipe ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </Campo>
          </div>
        )}
        <div className="flex shrink-0 gap-2">
          <Button type="submit" variante="secondary">
            <Search className="size-4" />
            Filtrar
          </Button>
          <ButtonLink href={BASE} variante="ghost">
            Limpar
          </ButtonLink>
        </div>
      </form>

      <GradeEstatisticas colunas={3} className="mb-4">
        {cards.map((c) => (
          <Estatistica key={c.rotulo} {...c} />
        ))}
      </GradeEstatisticas>

      {truncado && (
        <p className="mb-4 text-xs text-ink-muted">
          Somando os primeiros {LIMITE_RESUMO} lançamentos do filtro. Reduza o
          período para um total exato.
        </p>
      )}

      {porProfissional.length > 0 && (
        <div className="glass mb-4 rounded-2xl px-3 py-3 sm:px-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
            Por profissional
          </p>
          <ul className="divide-y divide-white/15">
            {porProfissional.map((p) => (
              <li
                key={p.id || p.nome}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {p.nome}
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    {p.quantidade}{" "}
                    {p.quantidade === 1 ? "lançamento" : "lançamentos"}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-amber-50">
                  A pagar {formatBRL(p.aPagar)}
                </span>
                <span className="text-sm tabular-nums text-emerald-50">
                  Pago {formatBRL(p.pago)}
                </span>
                {ehAdmin && p.id && p.aPagar > 0 && (
                  <form
                    action={pagarComissoesDoProfissional.bind(
                      null,
                      p.id,
                      periodo.de,
                      periodo.ate,
                      voltar
                    )}
                  >
                    <ConfirmButton
                      variante="secondary"
                      tamanho="sm"
                      mensagem={`Marcar como pagas todas as comissões em aberto de ${p.nome} no período?`}
                    >
                      <BadgeCheck className="size-4" />
                      Pagar todas
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {comissoes.length === 0 ? (
        <EmptyState
          icone={<Percent className="size-7" strokeWidth={1.8} />}
          titulo="Nenhuma comissão encontrada"
          mensagem={
            ehAdmin
              ? "Ajuste o período ou use “Apurar comissões do período” para gerar as comissões das vendas já pagas."
              : "Ajuste o período para ver outras comissões."
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "56rem" }}>
              <caption className="sr-only">Comissões do período</caption>
              <thead>
                <tr className="border-b border-white/25">
                  <th scope="col" className={CABECALHO}>
                    Data
                  </th>
                  <th scope="col" className={CABECALHO}>
                    Profissional
                  </th>
                  <th scope="col" className={CABECALHO}>
                    Descrição
                  </th>
                  <th scope="col" className={`${CABECALHO} text-right hidden xl:table-cell`}>
                    Base de cálculo
                  </th>
                  <th scope="col" className={`${CABECALHO} text-right hidden xl:table-cell`}>
                    Percentual
                  </th>
                  <th scope="col" className={`${CABECALHO} text-right`}>
                    Valor
                  </th>
                  <th scope="col" className={CABECALHO}>
                    Status
                  </th>
                  {ehAdmin && (
                    <th scope="col" className={`${CABECALHO} text-right`}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {comissoes.map((c) => (
                  <tr key={c.id}>
                    <td className={`${CELULA} whitespace-nowrap`}>
                      {formatDataISO(c.data)}
                    </td>
                    <td className={CELULA}>
                      {c.profissional?.nome ?? "Sem profissional"}
                    </td>
                    <td className={CELULA}>{c.descricao}</td>
                    <td className={`${CELULA} text-right tabular-nums hidden xl:table-cell`}>
                      {formatBRL(c.base_calculo)}
                    </td>
                    <td className={`${CELULA} text-right tabular-nums hidden xl:table-cell`}>
                      {formatPercentual(c.percentual)}
                    </td>
                    <td className={`${CELULA} text-right font-semibold tabular-nums`}>
                      {formatBRL(c.valor)}
                    </td>
                    <td className={CELULA}>
                      {c.pago ? (
                        <Badge tom="success">
                          Paga
                          {c.pago_em ? ` em ${formatDataISO(c.pago_em)}` : ""}
                        </Badge>
                      ) : (
                        <Badge tom="pending">A pagar</Badge>
                      )}
                    </td>
                    {ehAdmin && (
                      <td className={`${CELULA} text-right whitespace-nowrap`}>
                        <div className="flex justify-end gap-1.5">
                          {c.pago ? (
                            <form action={estornarComissao.bind(null, c.id, voltar)}>
                              <ConfirmButton
                                variante="ghost"
                                tamanho="sm"
                                mensagem="Estornar o pagamento desta comissão? Ela volta para 'a pagar'."
                                aria-label={`Estornar pagamento de ${c.descricao}`}
                              >
                                <RotateCcw className="size-4" />
                                <span className="sr-only">Estornar</span>
                              </ConfirmButton>
                            </form>
                          ) : (
                            <form action={marcarComissaoPaga.bind(null, c.id, voltar)}>
                              <Button
                                type="submit"
                                variante="secondary"
                                tamanho="sm"
                                aria-label={`Marcar como paga a comissão de ${c.descricao}`}
                              >
                                <BadgeCheck className="size-4" />
                                Marcar como paga
                              </Button>
                            </form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl={BASE}
        params={paramsUrl}
      />

      <p className="mt-4 text-xs text-ink-muted">
        A apuração lê os itens das vendas com status “paga” no período que tenham
        profissional definido e usa o percentual de comissão cadastrado no
        produto ou serviço. Item que já gerou comissão nunca é apurado duas
        vezes.
        {ehVeterinario && " Você enxerga apenas as suas próprias comissões."}
      </p>
    </div>
  );
}

const CABECALHO =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase";

const CELULA = "px-3 py-2 align-top text-ink";
