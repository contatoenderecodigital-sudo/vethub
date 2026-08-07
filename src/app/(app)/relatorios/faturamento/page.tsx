import { DollarSign, Percent, Receipt, Scale } from "lucide-react";
import { formatBRL, formatDataHora } from "@/lib/format";
import {
  FORMAS_PAGAMENTO_VENDA,
  rotuloFormaVenda,
  type VendaStatus,
} from "@/lib/types";
import { Card, CardTitulo } from "@/components/ui/card";
import {
  Estatistica,
  GradeEstatisticas,
  type EstatisticaProps,
} from "@/components/ui/estatistica";
import { GraficoBarras, GraficoRosca } from "@/components/ui/grafico";
import { Campo, Select } from "@/components/ui/form";
import { abrirRelatorio, type OpcaoSimples } from "../dados";
import {
  LIMITE_LINHAS,
  agrupamentoDoPeriodo,
  centavos,
  descricaoPeriodo,
  exigirAcessoFinanceiro,
  fimDoDia,
  idDaUrl,
  inicioDoDia,
  opcaoDaUrl,
  resolverPeriodo,
  serieDoPeriodo,
} from "../definicoes";
import { FiltrosRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { AvisoLimite, CartoesResumo, type ItemResumo } from "../resumo";
import { TabelaRelatorio, type ColunaRelatorio } from "../tabela-relatorio";

export const metadata = { title: "Relatório de faturamento" };

const BASE = "/relatorios/faturamento";

const FORMAS = FORMAS_PAGAMENTO_VENDA.map((f) => f.valor);

interface VendaLinha {
  id: string;
  numero: number;
  data: string;
  valor_total: number;
  desconto: number;
  status: VendaStatus;
  tutor: { nome: string } | null;
  vendedor: { id: string; nome: string } | null;
  itens: { id: string }[] | null;
  pagamentos: { forma: string; valor: number }[] | null;
}

export default async function RelatorioFaturamentoPage({
  searchParams,
}: {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    forma?: string;
    vendedor?: string;
  }>;
}) {
  const filtros = await searchParams;
  const periodo = resolverPeriodo(filtros.de, filtros.ate);
  const forma = opcaoDaUrl(filtros.forma, FORMAS);
  const vendedor = idDaUrl(filtros.vendedor);

  const { supabase, usuario, clinica } = await abrirRelatorio();
  exigirAcessoFinanceiro(usuario.papel);

  let consulta = supabase
    .from("venda")
    .select(
      "id, numero, data, valor_total, desconto, status, tutor:tutor_id (nome), " +
        "vendedor:vendedor_id (id, nome), itens:venda_item (id), " +
        "pagamentos:pagamento_venda (forma, valor)"
    )
    .neq("status", "cancelada")
    .gte("data", inicioDoDia(periodo.de))
    .lte("data", fimDoDia(periodo.ate))
    .order("data")
    .limit(LIMITE_LINHAS);

  if (vendedor) consulta = consulta.eq("vendedor_id", vendedor);

  const [{ data }, { data: equipe }] = await Promise.all([
    consulta.returns<VendaLinha[]>(),
    supabase
      .from("usuario")
      .select("id, nome")
      .order("nome")
      .returns<OpcaoSimples[]>(),
  ]);

  const todas = data ?? [];

  // A forma de pagamento fica na tabela filha: filtrar aqui (e não no
  // PostgREST) preserva o rateio correto das outras formas da mesma venda.
  const vendas = forma
    ? todas.filter((v) => (v.pagamentos ?? []).some((p) => p.forma === forma))
    : todas;

  let totalGeral = 0;
  let totalDesconto = 0;
  const porForma = new Map<string, { valor: number; quantidade: number }>();
  const porVendedor = new Map<string, { valor: number; quantidade: number }>();

  for (const venda of vendas) {
    totalGeral += Number(venda.valor_total);
    totalDesconto += Number(venda.desconto);

    const pagamentos = venda.pagamentos ?? [];
    if (pagamentos.length === 0) {
      const atual = porForma.get("Sem pagamento lançado") ?? {
        valor: 0,
        quantidade: 0,
      };
      porForma.set("Sem pagamento lançado", {
        valor: atual.valor + Number(venda.valor_total),
        quantidade: atual.quantidade + 1,
      });
    } else {
      for (const pagamento of pagamentos) {
        const rotulo = rotuloFormaVenda(pagamento.forma);
        const atual = porForma.get(rotulo) ?? { valor: 0, quantidade: 0 };
        porForma.set(rotulo, {
          valor: atual.valor + Number(pagamento.valor),
          quantidade: atual.quantidade + 1,
        });
      }
    }

    const nomeVendedor = venda.vendedor?.nome ?? "Sem vendedor";
    const atual = porVendedor.get(nomeVendedor) ?? { valor: 0, quantidade: 0 };
    porVendedor.set(nomeVendedor, {
      valor: atual.valor + Number(venda.valor_total),
      quantidade: atual.quantidade + 1,
    });
  }

  const ticketMedio = vendas.length > 0 ? totalGeral / vendas.length : 0;

  const cardsPrincipais: EstatisticaProps[] = [
    {
      rotulo: "Faturamento",
      valor: formatBRL(centavos(totalGeral)),
      icone: DollarSign,
      tom: "positivo",
    },
    { rotulo: "Vendas", valor: vendas.length, icone: Receipt },
    {
      rotulo: "Ticket médio",
      valor: formatBRL(centavos(ticketMedio)),
      icone: Scale,
    },
    {
      rotulo: "Descontos",
      valor: formatBRL(centavos(totalDesconto)),
      icone: Percent,
      tom: totalDesconto > 0 ? "atencao" : "neutro",
    },
  ];

  const ordenarPorValor = (mapa: Map<string, { valor: number; quantidade: number }>) =>
    [...mapa.entries()].sort((a, b) => b[1].valor - a[1].valor);

  const cardsForma: ItemResumo[] = ordenarPorValor(porForma).map(([rotulo, t]) => ({
    rotulo,
    valor: formatBRL(centavos(t.valor)),
    detalhe: `${t.quantidade} ${t.quantidade === 1 ? "pagamento" : "pagamentos"}`,
  }));

  // Rosca: participação de cada forma de pagamento no que entrou.
  const fatiasForma = ordenarPorValor(porForma).map(([forma, t]) => ({
    forma,
    valor: centavos(t.valor),
  }));

  // Barras do faturamento ao longo do período. O agrupamento é por dia até
  // 62 dias e por mês acima disso (ver `agrupamentoDoPeriodo`): num trimestre
  // inteiro as barras diárias viram um pente ilegível, ainda mais no celular.
  const agrupamento = agrupamentoDoPeriodo(periodo);
  const serieFaturamento = serieDoPeriodo(
    periodo,
    vendas.map((v) => ({ quando: v.data, valor: Number(v.valor_total) }))
  );
  const temFaturamento = serieFaturamento.some((p) => p.valor > 0);

  const cardsVendedor: ItemResumo[] = ordenarPorValor(porVendedor).map(
    ([rotulo, t]) => ({
      rotulo,
      valor: formatBRL(centavos(t.valor)),
      detalhe: `${t.quantidade} ${t.quantidade === 1 ? "venda" : "vendas"}`,
    })
  );

  const colunas: ColunaRelatorio<VendaLinha>[] = [
    {
      rotulo: "Data",
      className: "whitespace-nowrap",
      celula: (v) => formatDataHora(v.data),
    },
    { rotulo: "Nº", numerica: true, celula: (v) => v.numero },
    { rotulo: "Tutor", celula: (v) => v.tutor?.nome ?? "Venda avulsa" },
    { rotulo: "Vendedor", celula: (v) => v.vendedor?.nome ?? "-" },
    {
      rotulo: "Itens",
      numerica: true,
      celula: (v) => (v.itens ?? []).length,
    },
    {
      rotulo: "Pagamento",
      celula: (v) =>
        (v.pagamentos ?? []).length === 0
          ? "Em aberto"
          : (v.pagamentos ?? [])
              .map((p) => rotuloFormaVenda(p.forma))
              .join(" · "),
    },
    {
      rotulo: "Valor",
      numerica: true,
      celula: (v) => formatBRL(v.valor_total),
    },
  ];

  const params = {
    de: periodo.de,
    ate: periodo.ate,
    forma,
    vendedor,
  };

  return (
    <FolhaRelatorio
      titulo="Relatório de faturamento"
      subtitulo={descricaoPeriodo(periodo)}
      clinica={clinica}
      periodo={descricaoPeriodo(periodo)}
    >
      <FiltrosRelatorio base={BASE} periodo={periodo} params={params}>
        <div className="min-w-48 flex-1">
          <Campo rotulo="Forma de pagamento" htmlFor="forma">
            <Select id="forma" name="forma" defaultValue={forma ?? ""}>
              <option value="">Todas</option>
              {FORMAS_PAGAMENTO_VENDA.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
        <div className="min-w-40 flex-1">
          <Campo rotulo="Vendedor" htmlFor="vendedor">
            <Select id="vendedor" name="vendedor" defaultValue={vendedor ?? ""}>
              <option value="">Todos</option>
              {(equipe ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>
      </FiltrosRelatorio>

      <AvisoLimite quantidade={todas.length} />

      <GradeEstatisticas colunas={4} className="mb-4">
        {cardsPrincipais.map((c) => (
          <Estatistica key={c.rotulo} {...c} />
        ))}
      </GradeEstatisticas>

      {/* Gráficos só na tela: o ResponsiveContainer mede a largura do
          navegador e no papel sairia cortado. A impressão fica com os
          cartões e a tabela, que já têm os mesmos números. */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2 print:hidden">
        <Card>
          <CardTitulo>
            Faturamento por {agrupamento === "mes" ? "mês" : "dia"}
          </CardTitulo>
          {temFaturamento ? (
            <GraficoBarras
              dados={serieFaturamento}
              eixoX="rotulo"
              formato="moeda"
              altura={240}
              series={[{ chave: "valor", rotulo: "Faturamento" }]}
            />
          ) : (
            <p className="text-xs text-ink-muted">Sem dados no período.</p>
          )}
        </Card>

        <Card>
          <CardTitulo>Participação por forma de pagamento</CardTitulo>
          {fatiasForma.length > 0 ? (
            <GraficoRosca
              dados={fatiasForma}
              chaveRotulo="forma"
              chaveValor="valor"
              formato="moeda"
              altura={240}
            />
          ) : (
            <p className="text-xs text-ink-muted">Sem dados no período.</p>
          )}
        </Card>
      </div>

      {cardsForma.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Por forma de pagamento
          </p>
          <CartoesResumo itens={cardsForma} />
        </>
      )}

      {cardsVendedor.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Por vendedor
          </p>
          <CartoesResumo itens={cardsVendedor} />
        </>
      )}

      <TabelaRelatorio
        colunas={colunas}
        linhas={vendas}
        chave={(v) => v.id}
        legenda="Vendas do período"
        vazio="Nenhuma venda no período com esses filtros."
        total={[
          "Total",
          null,
          `${vendas.length} ${vendas.length === 1 ? "venda" : "vendas"}`,
          null,
          null,
          `Ticket médio ${formatBRL(centavos(ticketMedio))}`,
          formatBRL(centavos(totalGeral)),
        ]}
      />

      <p className="mt-3 text-xs text-ink-muted print:hidden">
        Vendas canceladas não entram no relatório. Quando há mais de uma forma
        de pagamento na mesma venda, cada forma soma o próprio valor.
      </p>
    </FolhaRelatorio>
  );
}
