import { redirect } from "next/navigation";
import {
  Boxes,
  CalendarDays,
  DollarSign,
  Syringe,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { hojeISO, formatDataISO } from "@/lib/format";
import { dataCalendarioValida } from "@/lib/validacao";
import type { Papel } from "@/lib/types";

/**
 * Catálogo dos relatórios + utilitários de período.
 *
 * Regra de ouro do módulo: nada que veio da URL entra numa consulta sem
 * passar por aqui. Data só vale se for data de calendário de verdade
 * (`dataCalendarioValida`) e dentro de uma faixa sensata; número só vale
 * dentro do intervalo declarado. Toda consulta tem teto de linhas.
 */

/** Teto de linhas lidas por consulta. Acima disso a saída avisa que truncou. */
export const LIMITE_LINHAS = 2000;

const DATA_MINIMA = "2015-01-01";

function dataMaxima(): string {
  return `${new Date().getFullYear() + 5}-12-31`;
}

// ------------------------------------------------------------------
// Catálogo
// ------------------------------------------------------------------

export type AreaRelatorio = "Atendimento" | "Financeiro" | "Estoque" | "Clientes";

export interface DefinicaoRelatorio {
  href: string;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  area: AreaRelatorio;
  /** Relatório de dinheiro: recepção não abre. */
  financeiro?: boolean;
}

export const RELATORIOS: DefinicaoRelatorio[] = [
  {
    href: "/relatorios/atendimentos",
    nome: "Atendimentos",
    descricao: "Agendamentos e consultas do período, por veterinário, tipo e status.",
    icone: CalendarDays,
    area: "Atendimento",
  },
  {
    href: "/relatorios/vacinas",
    nome: "Vacinas a vencer",
    descricao:
      "Lista de reativação de cliente: reforços vencidos e a vencer, com telefone e WhatsApp do tutor.",
    icone: Syringe,
    area: "Atendimento",
  },
  {
    href: "/relatorios/faturamento",
    nome: "Faturamento",
    descricao: "Vendas do período por forma de pagamento e vendedor, com ticket médio.",
    icone: DollarSign,
    area: "Financeiro",
    financeiro: true,
  },
  {
    href: "/relatorios/financeiro",
    nome: "Contas a pagar e receber",
    descricao: "Movimento do período agrupado por categoria, com saldo do caixa.",
    icone: Wallet,
    area: "Financeiro",
    financeiro: true,
  },
  {
    href: "/relatorios/insumos",
    nome: "Insumos",
    descricao: "Consumo de produtos por período, com custo por item e por origem.",
    icone: Syringe,
    area: "Estoque",
  },
  {
    href: "/relatorios/estoque",
    nome: "Posição de estoque",
    descricao: "Saldo atual de cada produto e quanto de dinheiro está parado na prateleira.",
    icone: Boxes,
    area: "Estoque",
  },
  {
    href: "/relatorios/clientes",
    nome: "Tutores e pets",
    descricao:
      "Cadastros novos, aniversariantes, devedores e pets sumidos há muito tempo.",
    icone: Users,
    area: "Clientes",
  },
];

export const AREAS: AreaRelatorio[] = [
  "Atendimento",
  "Financeiro",
  "Estoque",
  "Clientes",
];

/** Recepção enxerga o operacional, mas não o dinheiro da clínica. */
export function exigirAcessoFinanceiro(papel: Papel) {
  if (papel === "recepcao") redirect("/relatorios");
}

// ------------------------------------------------------------------
// Datas
// ------------------------------------------------------------------

/** Data da URL: só passa se for data de calendário real e dentro da faixa. */
export function dataDaUrl(valor: string | undefined): string | undefined {
  if (!valor || !dataCalendarioValida(valor)) return undefined;
  if (valor < DATA_MINIMA || valor > dataMaxima()) return undefined;
  return valor;
}

/** Soma (ou subtrai) dias de uma data ISO, em UTC para não escorregar no fuso. */
export function deslocarDia(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Primeiro e último dia do mês de uma data ISO. */
export function limitesDoMes(iso: string): { de: string; ate: string } {
  const [ano, mes] = iso.slice(0, 10).split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return { de: `${ano}-${p(mes)}-01`, ate: `${ano}-${p(mes)}-${p(ultimo)}` };
}

export interface Periodo {
  de: string;
  ate: string;
}

/** Período da URL saneado. Sem parâmetros: os últimos 30 dias. */
export function resolverPeriodo(de?: string, ate?: string): Periodo {
  const hoje = hojeISO();
  let inicio = dataDaUrl(de) ?? deslocarDia(hoje, -29);
  let fim = dataDaUrl(ate) ?? hoje;
  if (inicio > fim) [inicio, fim] = [fim, inicio];
  return { de: inicio, ate: fim };
}

/**
 * Bordas da janela em America/Sao_Paulo. O Brasil não tem mais horário de
 * verão, então o offset é fixo em -03:00 (mesmo padrão da agenda e do PDV).
 */
export function inicioDoDia(iso: string): string {
  return `${iso}T00:00:00-03:00`;
}

export function fimDoDia(iso: string): string {
  return `${iso}T23:59:59.999-03:00`;
}

/** "01/07/2026 a 30/07/2026", usado no cabeçalho de impressão. */
export function descricaoPeriodo(periodo: Periodo): string {
  return `${formatDataISO(periodo.de)} a ${formatDataISO(periodo.ate)}`;
}

export interface AtalhoPeriodo {
  rotulo: string;
  de: string;
  ate: string;
}

/** Atalhos da barra de filtros, sempre calculados sobre o hoje da clínica. */
export function atalhosPeriodo(): AtalhoPeriodo[] {
  const hoje = hojeISO();
  const mes = limitesDoMes(hoje);
  const mesPassado = limitesDoMes(deslocarDia(mes.de, -1));
  return [
    { rotulo: "Hoje", de: hoje, ate: hoje },
    { rotulo: "7 dias", de: deslocarDia(hoje, -6), ate: hoje },
    { rotulo: "30 dias", de: deslocarDia(hoje, -29), ate: hoje },
    { rotulo: "Este mês", ...mes },
    { rotulo: "Mês passado", ...mesPassado },
  ];
}

// ------------------------------------------------------------------
// Outros parâmetros da URL
// ------------------------------------------------------------------

/** Inteiro da URL dentro de um intervalo fechado; qualquer coisa fora vira o padrão. */
export function inteiroDaUrl(
  valor: string | undefined,
  padrao: number,
  minimo: number,
  maximo: number
): number {
  const n = Number.parseInt((valor ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < minimo || n > maximo) return padrao;
  return n;
}

/** Só devolve o valor se ele estiver na lista de opções aceitas. */
export function opcaoDaUrl<T extends string>(
  valor: string | undefined,
  opcoes: readonly T[]
): T | undefined {
  return opcoes.includes((valor ?? "") as T) ? (valor as T) : undefined;
}

const RE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id da URL: só entra na consulta se tiver cara de UUID. */
export function idDaUrl(valor: string | undefined): string | undefined {
  return valor && RE_UUID.test(valor.trim()) ? valor.trim() : undefined;
}

// ------------------------------------------------------------------
// Números
// ------------------------------------------------------------------

/** Quantidade de estoque (numeric(12,3)) no padrão pt-BR: 1.250,5 */
export function formatQuantidade(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : valor ?? 0;
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/** Arredonda para 2 casas. Evita 0,30000000000000004 nos totais. */
export function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// ------------------------------------------------------------------
// Séries dos gráficos
// ------------------------------------------------------------------

export type Agrupamento = "dia" | "mes";

/**
 * REGRA DO EIXO X: até 62 dias (dois meses) o gráfico mostra uma barra por
 * dia; acima disso passa a mostrar uma barra por mês. Um trimestre em barras
 * diárias vira um pente ilegível, ainda mais na largura de um celular.
 */
export const DIAS_ATE_AGRUPAR_POR_MES = 62;

/**
 * Teto de barras desenhadas. Por dia o próprio agrupamento já limita em 62;
 * por mês, um período de vários anos mostra só os 36 meses finais, mais que
 * isso vira um borrão de barras de 2 pixels.
 */
const MAXIMO_BARRAS: Record<Agrupamento, number> = {
  dia: DIAS_ATE_AGRUPAR_POR_MES,
  mes: 36,
};

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Quantidade de dias do período, contando as duas pontas. */
function diasNoPeriodo(periodo: Periodo): number {
  const emUTC = (iso: string) => {
    const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((emUTC(periodo.ate) - emUTC(periodo.de)) / 86_400_000) + 1;
}

export function agrupamentoDoPeriodo(periodo: Periodo): Agrupamento {
  return diasNoPeriodo(periodo) > DIAS_ATE_AGRUPAR_POR_MES ? "mes" : "dia";
}

/**
 * Dia da clínica (YYYY-MM-DD) de um instante gravado no banco. O Brasil não
 * tem mais horário de verão, mas `toLocaleDateString` com o fuso resolve
 * qualquer caso, é a mesma conta de `hojeISO()`.
 */
export function diaDaClinica(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/** "04/08" por dia, "ago/26" por mês. */
function rotuloDaChave(chave: string, agrupamento: Agrupamento): string {
  if (agrupamento === "mes") {
    const [ano, mes] = chave.split("-").map(Number);
    return `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`;
  }
  return `${chave.slice(8, 10)}/${chave.slice(5, 7)}`;
}

/** Todas as chaves do período, inclusive as sem movimento (barra zerada). */
function chavesDoPeriodo(periodo: Periodo, agrupamento: Agrupamento): string[] {
  const chaves: string[] = [];
  if (agrupamento === "dia") {
    for (let dia = periodo.de; dia <= periodo.ate; dia = deslocarDia(dia, 1)) {
      chaves.push(dia);
    }
  } else {
    const fim = periodo.ate.slice(0, 7);
    let chave = periodo.de.slice(0, 7);
    while (chave <= fim) {
      chaves.push(chave);
      const [ano, mes] = chave.split("-").map(Number);
      chave =
        mes === 12
          ? `${ano + 1}-01`
          : `${ano}-${String(mes + 1).padStart(2, "0")}`;
    }
  }
  return chaves.slice(-MAXIMO_BARRAS[agrupamento]);
}

/**
 * Soma os itens do período em uma série pronta para o gráfico de barras.
 * `quando` é o instante do lançamento (timestamptz do banco) e `valor` é o
 * que deve ser somado: 1 para contagem, o valor em reais para dinheiro.
 */
export function serieDoPeriodo(
  periodo: Periodo,
  itens: { quando: string; valor: number }[]
): { rotulo: string; valor: number }[] {
  const agrupamento = agrupamentoDoPeriodo(periodo);
  const chaves = chavesDoPeriodo(periodo, agrupamento);
  const soma = new Map(chaves.map((chave) => [chave, 0]));

  for (const item of itens) {
    const dia = diaDaClinica(item.quando);
    const chave = agrupamento === "mes" ? dia.slice(0, 7) : dia;
    const atual = soma.get(chave);
    if (atual === undefined) continue; // fora da janela desenhada
    soma.set(chave, atual + item.valor);
  }

  return chaves.map((chave) => ({
    rotulo: rotuloDaChave(chave, agrupamento),
    valor: centavos(soma.get(chave) ?? 0),
  }));
}
