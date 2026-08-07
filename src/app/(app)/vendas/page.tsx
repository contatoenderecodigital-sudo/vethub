import Link from "next/link";
import { ChevronRight, Receipt, Search, ShoppingCart, Ban } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatDataHora } from "@/lib/format";
import type { VendaStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/form";
import { CampoData } from "@/components/ui/campo-data";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cancelarVenda } from "../pdv/actions";
import { BadgeVenda } from "./badge-venda";

export const metadata = { title: "Vendas" };

const POR_PAGINA = 20;

const STATUS: { valor: VendaStatus; rotulo: string }[] = [
  { valor: "paga", rotulo: "Paga" },
  { valor: "aberta", rotulo: "Em aberto" },
  { valor: "cancelada", rotulo: "Cancelada" },
];

interface LinhaVenda {
  id: string;
  numero: number;
  data: string;
  valor_total: number;
  status: VendaStatus;
  tutor: { id: string; nome: string } | { id: string; nome: string }[] | null;
}

function tutorDe(venda: LinhaVenda) {
  return Array.isArray(venda.tutor) ? venda.tutor[0] : venda.tutor;
}

/** "2026-08-04" válido? (os inputs de data já limitam, mas a URL é livre) */
function dataValida(valor: string | undefined): string | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  return valor;
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    de?: string;
    ate?: string;
    pagina?: string;
    erro?: string;
  }>;
}) {
  const filtros = await searchParams;
  const pagina = Math.max(1, parseInt(filtros.pagina ?? "1", 10) || 1);
  const busca = (filtros.q ?? "").trim();
  const status = STATUS.find((s) => s.valor === filtros.status)?.valor;
  const de = dataValida(filtros.de);
  const ate = dataValida(filtros.ate);

  const { supabase, usuario } = await getSessao();
  const ehAdmin = usuario.papel === "admin";

  let query = supabase
    .from("venda")
    .select("id, numero, data, valor_total, status, tutor:tutor_id (id, nome)", {
      count: "exact",
    })
    .order("data", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (status) query = query.eq("status", status);
  // A clínica opera em America/Sao_Paulo (UTC-3 fixo, sem horário de verão).
  if (de) query = query.gte("data", `${de}T00:00:00-03:00`);
  if (ate) query = query.lte("data", `${ate}T23:59:59-03:00`);

  if (busca) {
    const numero = /^\d+$/.test(busca) ? Number(busca) : null;
    if (numero !== null) {
      query = query.eq("numero", numero);
    } else {
      // Busca por tutor: acha os ids primeiro (a venda guarda só a chave).
      const { data: tutores } = await supabase
        .from("tutor")
        .select("id")
        .ilike("nome", `%${busca}%`)
        .limit(50)
        .returns<{ id: string }[]>();
      const ids = (tutores ?? []).map((t) => t.id);
      // Sem tutor correspondente, a lista tem que sair vazia.
      query = query.in("tutor_id", ids.length > 0 ? ids : [
        "00000000-0000-0000-0000-000000000000",
      ]);
    }
  }

  const { data, count } = await query.returns<LinhaVenda[]>();
  const vendas = data ?? [];
  const totalPaginas = Math.ceil((count ?? 0) / POR_PAGINA);

  // Quantidade de itens de cada venda da página (uma consulta só).
  const contagem = new Map<string, number>();
  if (vendas.length > 0) {
    const { data: itens } = await supabase
      .from("venda_item")
      .select("venda_id")
      .in(
        "venda_id",
        vendas.map((v) => v.id)
      )
      .returns<{ venda_id: string }[]>();
    for (const item of itens ?? []) {
      contagem.set(item.venda_id, (contagem.get(item.venda_id) ?? 0) + 1);
    }
  }

  const temFiltro = !!(busca || status || de || ate);

  return (
    <div>
      <PageHeader
        titulo="Vendas"
        subtitulo={count != null ? `${count} no total` : undefined}
        acao={
          <ButtonLink href="/pdv">
            <ShoppingCart className="size-4" />
            Ir para o PDV
          </ButtonLink>
        }
      />

      {filtros.erro && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-300/40 bg-red-400/25 px-3 py-2 text-sm font-medium text-red-50 backdrop-blur-md"
        >
          {filtros.erro}
        </p>
      )}

      <form
        method="get"
        action="/vendas"
        className="glass mb-4 grid gap-3 rounded-2xl p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[1fr_10rem_10rem_9rem_auto] lg:items-end"
      >
        <Campo rotulo="Buscar" htmlFor="q">
          <Input
            id="q"
            name="q"
            defaultValue={busca}
            placeholder="Número da venda ou nome do tutor"
            autoComplete="off"
          />
        </Campo>
        <Campo rotulo="De" htmlFor="de">
          <CampoData id="de" name="de" defaultValue={de ?? ""} />
        </Campo>
        <Campo rotulo="Até" htmlFor="ate">
          <CampoData id="ate" name="ate" defaultValue={ate ?? ""} />
        </Campo>
        <Campo rotulo="Situação" htmlFor="status">
          <Select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">Todas</option>
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition-colors hover:bg-white/90"
          >
            <Search className="size-4" />
            Filtrar
          </button>
          {temFiltro && (
            <Link
              href="/vendas"
              className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-white/15 hover:text-white"
            >
              Limpar
            </Link>
          )}
        </div>
      </form>

      {vendas.length === 0 ? (
        <EmptyState
          titulo={temFiltro ? "Nenhuma venda com esses filtros" : "Nenhuma venda ainda"}
          mensagem={
            temFiltro
              ? "Ajuste o período, a situação ou a busca."
              : "As vendas feitas no PDV aparecem aqui."
          }
          icone={<Receipt className="size-7" strokeWidth={1.8} />}
          acao={
            <ButtonLink href="/pdv">
              <ShoppingCart className="size-4" />
              Ir para o PDV
            </ButtonLink>
          }
        />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <ul className="divide-y divide-white/15">
            {vendas.map((v) => {
              const tutor = tutorDe(v);
              const itens = contagem.get(v.id) ?? 0;

              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors hover:bg-white/10"
                >
                  <Link
                    href={`/vendas/${v.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white tabular-nums">
                      {v.numero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">
                        {tutor ? tutor.nome : "Venda avulsa"}
                      </span>
                      <span className="block truncate text-sm text-ink-muted">
                        {formatDataHora(v.data)} · {itens}{" "}
                        {itens === 1 ? "item" : "itens"}
                      </span>
                    </span>
                  </Link>

                  <BadgeVenda status={v.status} />
                  <span className="w-24 text-right font-semibold text-ink tabular-nums">
                    {formatBRL(v.valor_total)}
                  </span>

                  {ehAdmin && v.status !== "cancelada" && (
                    <form action={cancelarVenda.bind(null, v.id)} className="shrink-0">
                      <ConfirmButton
                        variante="ghost"
                        tamanho="sm"
                        className="min-h-11 sm:min-h-10"
                        mensagem={`Cancelar a venda nº ${v.numero}? O estoque dos produtos volta e a conta a receber é cancelada.`}
                      >
                        <Ban className="size-4" />
                        <span className="sr-only sm:not-sr-only">Cancelar</span>
                      </ConfirmButton>
                    </form>
                  )}

                  {/* A seta tem 16px; o alvo clicável precisa ter 24 (mínimo
                      da norma) e ganha 44 no toque. O ícone continua do mesmo
                      tamanho — o que cresce é a área ao redor dele. */}
                  <Link
                    href={`/vendas/${v.id}`}
                    aria-label={`Abrir venda nº ${v.numero}`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white/15 hover:text-white sm:size-8"
                  >
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        baseUrl="/vendas"
        params={{
          q: busca || undefined,
          status: status ?? undefined,
          de: de ?? undefined,
          ate: ate ?? undefined,
        }}
      />
    </div>
  );
}
