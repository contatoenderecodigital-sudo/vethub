import { formatBRL, formatDataISO } from "@/lib/format";
import {
  ROTULO_STATUS_CONTA,
  saldoDaConta,
  type ContaStatus,
  type ContaTipo,
} from "@/lib/types";
import { Campo, Select } from "@/components/ui/form";
import { abrirRelatorio } from "../dados";
import {
  LIMITE_LINHAS,
  centavos,
  descricaoPeriodo,
  exigirAcessoFinanceiro,
  idDaUrl,
  opcaoDaUrl,
  resolverPeriodo,
} from "../definicoes";
import { FiltrosRelatorio } from "../filtros-relatorio";
import { FolhaRelatorio } from "../impressao";
import { AvisoLimite, CartoesResumo, type ItemResumo } from "../resumo";
import {
  TabelaRelatorio,
  type ColunaRelatorio,
  type SecaoRelatorio,
} from "../tabela-relatorio";

export const metadata = { title: "Relatório financeiro" };

const BASE = "/relatorios/financeiro";

const TIPOS = ["receber", "pagar"] as const;
const STATUS = ["aberta", "parcial", "paga", "cancelada"] as const;

const ROTULO_TIPO_CONTA: Record<ContaTipo, string> = {
  receber: "A receber",
  pagar: "A pagar",
};

interface ContaLinha {
  id: string;
  tipo: ContaTipo;
  descricao: string;
  valor: number;
  valor_pago: number;
  vencimento: string;
  pagamento: string | null;
  status: ContaStatus;
  fornecedor: string | null;
  categoria: { nome: string } | null;
  tutor: { nome: string } | null;
}

interface CategoriaOpcao {
  id: string;
  nome: string;
  tipo: string;
}

export default async function RelatorioFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    de?: string;
    ate?: string;
    tipo?: string;
    status?: string;
    categoria?: string;
  }>;
}) {
  const filtros = await searchParams;
  const periodo = resolverPeriodo(filtros.de, filtros.ate);
  const tipo = opcaoDaUrl(filtros.tipo, TIPOS);
  const status = opcaoDaUrl(filtros.status, STATUS);
  const categoria = idDaUrl(filtros.categoria);

  const { supabase, usuario, clinica } = await abrirRelatorio();
  exigirAcessoFinanceiro(usuario.papel);

  // `vencimento` é coluna date: compara direto, sem janela de fuso.
  let consulta = supabase
    .from("conta")
    .select(
      "id, tipo, descricao, valor, valor_pago, vencimento, pagamento, status, " +
        "fornecedor, categoria:categoria_id (nome), tutor:tutor_id (nome)"
    )
    .gte("vencimento", periodo.de)
    .lte("vencimento", periodo.ate)
    .order("vencimento")
    .limit(LIMITE_LINHAS);

  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (status) consulta = consulta.eq("status", status);
  if (categoria) consulta = consulta.eq("categoria_id", categoria);

  const [{ data }, { data: categorias }] = await Promise.all([
    consulta.returns<ContaLinha[]>(),
    supabase
      .from("categoria_financeira")
      .select("id, nome, tipo")
      .order("nome")
      .limit(300)
      .returns<CategoriaOpcao[]>(),
  ]);

  const contas = data ?? [];

  let recebido = 0;
  let pago = 0;
  let aReceber = 0;
  let aPagar = 0;
  let totalValor = 0;
  let totalPago = 0;
  let totalAberto = 0;

  const porCategoria = new Map<string, ContaLinha[]>();

  for (const conta of contas) {
    const chave = conta.categoria?.nome ?? "Sem categoria";
    const lista = porCategoria.get(chave) ?? [];
    lista.push(conta);
    porCategoria.set(chave, lista);

    // Conta cancelada aparece na lista, mas nunca entra nos totais.
    if (conta.status === "cancelada") continue;

    const saldo = saldoDaConta(conta);
    totalValor += Number(conta.valor);
    totalPago += Number(conta.valor_pago);
    totalAberto += saldo;

    if (conta.tipo === "receber") {
      recebido += Number(conta.valor_pago);
      aReceber += saldo;
    } else {
      pago += Number(conta.valor_pago);
      aPagar += saldo;
    }
  }

  const saldo = centavos(recebido - pago);

  const cards: ItemResumo[] = [
    { rotulo: "Recebido", valor: formatBRL(centavos(recebido)) },
    { rotulo: "Pago", valor: formatBRL(centavos(pago)) },
    { rotulo: "A receber", valor: formatBRL(centavos(aReceber)) },
    { rotulo: "A pagar", valor: formatBRL(centavos(aPagar)) },
    {
      rotulo: "Saldo do período",
      valor: formatBRL(saldo),
      detalhe: "Recebido menos pago",
    },
  ];

  const colunas: ColunaRelatorio<ContaLinha>[] = [
    {
      rotulo: "Vencimento",
      className: "whitespace-nowrap",
      celula: (c) => formatDataISO(c.vencimento),
    },
    { rotulo: "Descrição", celula: (c) => c.descricao },
    { rotulo: "Tipo", celula: (c) => ROTULO_TIPO_CONTA[c.tipo] },
    {
      rotulo: "Tutor / fornecedor",
      celula: (c) => c.tutor?.nome ?? c.fornecedor ?? "—",
    },
    { rotulo: "Status", celula: (c) => ROTULO_STATUS_CONTA[c.status] },
    { rotulo: "Valor", numerica: true, celula: (c) => formatBRL(c.valor) },
    { rotulo: "Pago", numerica: true, celula: (c) => formatBRL(c.valor_pago) },
    {
      rotulo: "Em aberto",
      numerica: true,
      celula: (c) =>
        c.status === "cancelada" ? "—" : formatBRL(saldoDaConta(c)),
    },
  ];

  const secoes: SecaoRelatorio<ContaLinha>[] = [...porCategoria.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([nome, lista]) => {
      const validas = lista.filter((c) => c.status !== "cancelada");
      const somaValor = validas.reduce((s, c) => s + Number(c.valor), 0);
      const somaPago = validas.reduce((s, c) => s + Number(c.valor_pago), 0);
      const somaAberto = validas.reduce((s, c) => s + saldoDaConta(c), 0);
      return {
        titulo: nome,
        detalhe: `${lista.length} ${lista.length === 1 ? "conta" : "contas"}`,
        linhas: lista,
        subtotal: [
          "Subtotal",
          null,
          null,
          null,
          null,
          formatBRL(centavos(somaValor)),
          formatBRL(centavos(somaPago)),
          formatBRL(centavos(somaAberto)),
        ],
      };
    });

  const params = {
    de: periodo.de,
    ate: periodo.ate,
    tipo,
    status,
    categoria,
  };

  return (
    <FolhaRelatorio
      titulo="Relatório financeiro"
      subtitulo={`Vencimentos de ${descricaoPeriodo(periodo)}`}
      clinica={clinica}
      periodo={`Vencimentos de ${descricaoPeriodo(periodo)}`}
    >
      <FiltrosRelatorio
        base={BASE}
        periodo={periodo}
        params={params}
        rotuloDe="Vencimento de"
        rotuloAte="Vencimento até"
      >
        <Campo rotulo="Tipo" htmlFor="tipo">
          <Select id="tipo" name="tipo" defaultValue={tipo ?? ""}>
            <option value="">A pagar e a receber</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_CONTA[t]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_CONTA[s]}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Categoria" htmlFor="categoria">
          <Select id="categoria" name="categoria" defaultValue={categoria ?? ""}>
            <option value="">Todas</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.tipo === "receita" ? "receita" : "despesa"})
              </option>
            ))}
          </Select>
        </Campo>
      </FiltrosRelatorio>

      <AvisoLimite quantidade={contas.length} />

      <CartoesResumo itens={cards} colunas={3} />

      <TabelaRelatorio
        colunas={colunas}
        secoes={secoes}
        chave={(c) => c.id}
        legenda="Contas do período agrupadas por categoria"
        vazio="Nenhuma conta vencendo no período com esses filtros."
        larguraMinima="58rem"
        total={[
          "Total geral",
          null,
          null,
          null,
          null,
          formatBRL(centavos(totalValor)),
          formatBRL(centavos(totalPago)),
          formatBRL(centavos(totalAberto)),
        ]}
      />

      <p className="mt-3 text-xs text-ink-muted print:hidden">
        Filtro pela data de vencimento. Contas canceladas aparecem na lista, mas
        não entram em nenhum total.
      </p>
    </FolhaRelatorio>
  );
}
