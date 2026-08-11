import Link from "next/link";
import { formatBRL, formatDataHora } from "@/lib/format";
import { Campo, Select } from "@/components/ui/form";
import { abrirRelatorio, type OpcaoSimples } from "../dados";
import {
  LIMITE_LINHAS,
  centavos,
  descricaoPeriodo,
  fimDoDia,
  formatQuantidade,
  idDaUrl,
  inicioDoDia,
  opcaoDaUrl,
  resolverPeriodo,
} from "../definicoes";
import { FiltrosRelatorio, urlDoRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { AvisoLimite, CartoesResumo, type ItemResumo } from "../resumo";
import {
  TabelaRelatorio,
  type ColunaRelatorio,
  type SecaoRelatorio,
} from "../tabela-relatorio";

export const metadata = { title: "Relatório de insumos" };

const BASE = "/relatorios/insumos";

const MODOS = ["detalhado", "resumido"] as const;
type Modo = (typeof MODOS)[number];

const ORIGENS = ["consulta", "internacao", "venda"] as const;

const ROTULO_ORIGEM: Record<string, string> = {
  consulta: "Consulta",
  internacao: "Internação",
  venda: "Venda",
  compra: "Compra",
  inventario: "Inventário",
};

function rotuloOrigem(valor: string | null): string {
  if (!valor) return "Baixa manual";
  return ROTULO_ORIGEM[valor] ?? valor;
}

interface Movimentacao {
  id: string;
  data: string;
  quantidade: number;
  valor_unitario: number | null;
  origem: string | null;
  motivo: string | null;
  item: {
    id: string;
    nome: string;
    preco_custo: number;
    grupo: { nome: string } | null;
    unidade: { sigla: string } | null;
  } | null;
}

/** Uma linha de consumo já com o custo resolvido. */
interface Consumo {
  id: string;
  data: string;
  itemId: string;
  item: string;
  grupo: string;
  unidade: string;
  origem: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
}

interface Agrupado {
  itemId: string;
  item: string;
  grupo: string;
  unidade: string;
  lancamentos: number;
  quantidade: number;
  custoTotal: number;
}

export default async function RelatorioInsumosPage({
  searchParams,
}: {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    grupo?: string;
    item?: string;
    origem?: string;
    modo?: string;
  }>;
}) {
  const filtros = await searchParams;
  const periodo = resolverPeriodo(filtros.de, filtros.ate);
  const grupo = idDaUrl(filtros.grupo);
  const item = idDaUrl(filtros.item);
  const origem = opcaoDaUrl(filtros.origem, ORIGENS);
  const modo: Modo = opcaoDaUrl(filtros.modo, MODOS) ?? "detalhado";

  const { supabase, clinica } = await abrirRelatorio();

  const juncaoItem = grupo ? "item:item_id!inner" : "item:item_id";

  let consulta = supabase
    .from("movimentacao_estoque")
    .select(
      `id, data, quantidade, valor_unitario, origem, motivo, ` +
        `${juncaoItem} (id, nome, preco_custo, grupo:grupo_id (nome), unidade:unidade_id (sigla))`
    )
    .eq("tipo", "saida")
    .gte("data", inicioDoDia(periodo.de))
    .lte("data", fimDoDia(periodo.ate))
    .order("data")
    .limit(LIMITE_LINHAS);

  if (grupo) consulta = consulta.eq("item.grupo_id", grupo);
  if (item) consulta = consulta.eq("item_id", item);
  if (origem) consulta = consulta.eq("origem", origem);

  const [{ data }, { data: grupos }, { data: itens }] = await Promise.all([
    consulta.returns<Movimentacao[]>(),
    supabase
      .from("grupo_item")
      .select("id, nome")
      .in("tipo", ["produto", "ambos"])
      .order("nome")
      .limit(300)
      .returns<OpcaoSimples[]>(),
    supabase
      .from("item")
      .select("id, nome")
      .eq("tipo", "produto")
      .eq("ativo", true)
      .order("nome")
      .limit(500)
      .returns<OpcaoSimples[]>(),
  ]);

  const consumos: Consumo[] = (data ?? [])
    .filter((m) => m.item !== null)
    .map((m) => {
      const quantidade = Number(m.quantidade);
      // Sem valor no lançamento, vale o custo atual do cadastro do item.
      const custoUnitario = Number(m.valor_unitario ?? m.item?.preco_custo ?? 0);
      return {
        id: m.id,
        data: m.data,
        itemId: m.item!.id,
        item: m.item!.nome,
        grupo: m.item!.grupo?.nome ?? "Sem grupo",
        unidade: m.item!.unidade?.sigla ?? "un",
        origem: rotuloOrigem(m.origem),
        quantidade,
        custoUnitario,
        custoTotal: centavos(quantidade * custoUnitario),
      };
    });

  // Agrupamento por item: vale para o modo resumido e para os subtotais
  // do modo detalhado.
  const mapa = new Map<string, Agrupado & { linhas: Consumo[] }>();
  for (const consumo of consumos) {
    const atual = mapa.get(consumo.itemId) ?? {
      itemId: consumo.itemId,
      item: consumo.item,
      grupo: consumo.grupo,
      unidade: consumo.unidade,
      lancamentos: 0,
      quantidade: 0,
      custoTotal: 0,
      linhas: [] as Consumo[],
    };
    atual.lancamentos += 1;
    atual.quantidade += consumo.quantidade;
    atual.custoTotal = centavos(atual.custoTotal + consumo.custoTotal);
    atual.linhas.push(consumo);
    mapa.set(consumo.itemId, atual);
  }
  const agrupados = [...mapa.values()].sort((a, b) => a.item.localeCompare(b.item));

  const custoGeral = centavos(
    agrupados.reduce((soma, a) => soma + a.custoTotal, 0)
  );

  const cards: ItemResumo[] = [
    { rotulo: "Custo total consumido", valor: formatBRL(custoGeral) },
    { rotulo: "Itens diferentes", valor: agrupados.length },
    { rotulo: "Lançamentos", valor: consumos.length },
    {
      rotulo: "Custo médio por lançamento",
      valor: formatBRL(
        consumos.length > 0 ? centavos(custoGeral / consumos.length) : 0
      ),
    },
  ];

  const params = {
    de: periodo.de,
    ate: periodo.ate,
    grupo,
    item,
    origem,
    modo,
  };

  const colunasDetalhado: ColunaRelatorio<Consumo>[] = [
    {
      rotulo: "Data",
      className: "whitespace-nowrap",
      celula: (c) => formatDataHora(c.data),
    },
    { rotulo: "Item", celula: (c) => c.item },
    {
      rotulo: "Quantidade",
      numerica: true,
      celula: (c) => `${formatQuantidade(c.quantidade)} ${c.unidade}`,
    },
    {
      rotulo: "Custo unitário",
      numerica: true,
      celula: (c) => formatBRL(c.custoUnitario),
    },
    { rotulo: "Custo total", numerica: true, celula: (c) => formatBRL(c.custoTotal) },
    { rotulo: "Origem", celula: (c) => c.origem },
  ];

  const secoes: SecaoRelatorio<Consumo>[] = agrupados.map((a) => ({
    titulo: a.item,
    detalhe: a.grupo,
    linhas: a.linhas,
    subtotal: [
      "Subtotal do item",
      null,
      `${formatQuantidade(a.quantidade)} ${a.unidade}`,
      null,
      formatBRL(a.custoTotal),
      null,
    ],
  }));

  const colunasResumido: ColunaRelatorio<Agrupado>[] = [
    { rotulo: "Item", celula: (a) => a.item },
    { rotulo: "Grupo", celula: (a) => a.grupo },
    { rotulo: "Lançamentos", numerica: true, celula: (a) => a.lancamentos },
    {
      rotulo: "Quantidade",
      numerica: true,
      celula: (a) => `${formatQuantidade(a.quantidade)} ${a.unidade}`,
    },
    { rotulo: "Custo total", numerica: true, celula: (a) => formatBRL(a.custoTotal) },
  ];

  return (
    <FolhaRelatorio
      titulo="Relatório de insumos"
      subtitulo={`${descricaoPeriodo(periodo)} · modo ${modo}`}
      clinica={clinica}
      periodo={descricaoPeriodo(periodo)}
    >
      <FiltrosRelatorio base={BASE} periodo={periodo} params={params}>
        <input type="hidden" name="modo" value={modo} />
        <div className="min-w-40 flex-1">
          <Campo rotulo="Grupo" htmlFor="grupo">
            <Select id="grupo" name="grupo" defaultValue={grupo ?? ""}>
              <option value="">Todos</option>
              {(grupos ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Item" htmlFor="item">
            <Select id="item" name="item" defaultValue={item ?? ""}>
              <option value="">Todos</option>
              {(itens ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Origem" htmlFor="origem">
            <Select id="origem" name="origem" defaultValue={origem ?? ""}>
              <option value="">Todas</option>
              {ORIGENS.map((o) => (
                <option key={o} value={o}>
                  {ROTULO_ORIGEM[o]}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      </FiltrosRelatorio>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 print:hidden">
        <span className="mr-1 text-xs font-medium tracking-wide text-ink-muted uppercase">
          Modo
        </span>
        {MODOS.map((valor) => (
          <Link
            key={valor}
            href={urlDoRelatorio(BASE, params, { modo: valor })}
            aria-current={valor === modo ? "page" : undefined}
            // 32px no dedo era apertado para o botao que troca o formato do
            // relatorio inteiro. 44px no toque, 32 no mouse.
            className={`inline-flex h-11 items-center rounded-full px-3.5 text-sm font-medium capitalize transition-colors lg:h-8 ${
              valor === modo
                ? "bg-white text-brand-dark shadow-sm"
                : "border border-white/40 bg-white/15 text-ink-muted hover:bg-white/25 hover:text-white"
            }`}
          >
            {valor}
          </Link>
        ))}
      </div>

      <AvisoLimite quantidade={data?.length ?? 0} />

      <CartoesResumo itens={cards} />

      {modo === "detalhado" ? (
        <TabelaRelatorio
          colunas={colunasDetalhado}
          secoes={secoes}
          chave={(c) => c.id}
          legenda="Consumo de insumos por item"
          vazio="Nenhuma saída de estoque no período com esses filtros."
          total={[
            "Total geral",
            null,
            `${agrupados.length} itens`,
            null,
            formatBRL(custoGeral),
            null,
          ]}
        />
      ) : (
        <TabelaRelatorio
          colunas={colunasResumido}
          linhas={agrupados}
          chave={(a) => a.itemId}
          legenda="Consumo de insumos resumido por item"
          vazio="Nenhuma saída de estoque no período com esses filtros."
          larguraMinima="36rem"
          total={[
            "Total geral",
            null,
            consumos.length,
            null,
            formatBRL(custoGeral),
          ]}
        />
      )}

      <p className="mt-3 text-xs text-ink-muted print:hidden">
        Considera as saídas de estoque do período. Quando o lançamento não traz
        o custo, vale o preço de custo do cadastro do item.
      </p>
    </FolhaRelatorio>
  );
}
