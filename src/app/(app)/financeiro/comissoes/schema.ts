import { z } from "zod";
import { hojeISO } from "@/lib/format";
import { dataCalendarioValida } from "@/lib/validacao";
import { limitesDoMes } from "../schema";

/**
 * Schemas e utilitários das comissões dos profissionais.
 *
 * Regra do módulo: nada que veio da URL entra numa consulta sem passar por
 * aqui — data só vale se for data de calendário de verdade, id só vale se
 * tiver cara de UUID, e toda leitura tem teto de linhas.
 */

/** Linhas por página da lista. */
export const POR_PAGINA = 20;

/** Teto do resumo (totais e quebra por profissional) do período filtrado. */
export const LIMITE_RESUMO = 2000;

/** Teto das leituras da apuração (vendas, itens e comissões já existentes). */
export const LIMITE_APURACAO = 2000;

const DATA_MINIMA = "2015-01-01";

/** Janela máxima da apuração — evita varrer anos de venda numa tacada só. */
export const DIAS_MAXIMO_APURACAO = 366;

function dataMaxima(): string {
  return `${new Date().getFullYear() + 5}-12-31`;
}

// ------------------------------------------------------------------
// Abas
// ------------------------------------------------------------------

export type StatusComissao = "apagar" | "pagas" | "todas";

export const ABAS: { valor: StatusComissao; rotulo: string }[] = [
  { valor: "apagar", rotulo: "A pagar" },
  { valor: "pagas", rotulo: "Pagas" },
  { valor: "todas", rotulo: "Todas" },
];

export function statusDaUrl(valor: string | undefined): StatusComissao {
  return ABAS.find((a) => a.valor === valor)?.valor ?? "apagar";
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

export interface Periodo {
  de: string;
  ate: string;
}

/** Período da URL saneado. Sem parâmetros: o mês corrente. */
export function resolverPeriodo(de?: string, ate?: string): Periodo {
  const mes = limitesDoMes(hojeISO());
  let inicio = dataDaUrl(de) ?? mes.inicio;
  let fim = dataDaUrl(ate) ?? mes.fim;
  if (inicio > fim) [inicio, fim] = [fim, inicio];
  return { de: inicio, ate: fim };
}

/**
 * Bordas da janela em America/Sao_Paulo. O Brasil não tem mais horário de
 * verão, então o offset é fixo em -03:00 (mesmo padrão da agenda e do PDV).
 * `venda.data` é timestamptz — sem isso a venda das 22h cairia no dia errado.
 */
export function inicioDoDia(iso: string): string {
  return `${iso}T00:00:00-03:00`;
}

export function fimDoDia(iso: string): string {
  return `${iso}T23:59:59.999-03:00`;
}

/** timestamptz → data do calendário da clínica (YYYY-MM-DD em São Paulo). */
export function dataLocalSP(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return hojeISO();
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Dias inteiros entre duas datas ISO (b - a), em UTC para não escorregar. */
export function diasEntreISO(a: string, b: string): number {
  const [a1, a2, a3] = a.slice(0, 10).split("-").map(Number);
  const [b1, b2, b3] = b.slice(0, 10).split("-").map(Number);
  return Math.round(
    (Date.UTC(b1, b2 - 1, b3) - Date.UTC(a1, a2 - 1, a3)) / 86_400_000
  );
}

// ------------------------------------------------------------------
// Ids
// ------------------------------------------------------------------

const RE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id da URL: só entra na consulta se tiver cara de UUID. */
export function idDaUrl(valor: string | undefined): string | undefined {
  return valor && RE_UUID.test(valor.trim()) ? valor.trim() : undefined;
}

// ------------------------------------------------------------------
// Schemas (o servidor SEMPRE revalida, mesmo com o filtro já saneado)
// ------------------------------------------------------------------

const schemaData = z
  .string()
  .min(1, "Informe a data.")
  .refine(dataCalendarioValida, "Data inválida.")
  .refine((v) => !dataCalendarioValida(v) || v >= DATA_MINIMA, "Data antiga demais.")
  .refine(
    (v) => !dataCalendarioValida(v) || v <= dataMaxima(),
    "Data longe demais no futuro."
  );

export const periodoSchema = z
  .object({ de: schemaData, ate: schemaData })
  .refine((p) => p.de <= p.ate, {
    message: "A data inicial precisa vir antes da final.",
    path: ["ate"],
  })
  .refine((p) => diasEntreISO(p.de, p.ate) <= DIAS_MAXIMO_APURACAO, {
    message: "Apure no máximo 12 meses por vez.",
    path: ["ate"],
  });

export const idSchema = z
  .string()
  .refine((v) => RE_UUID.test(v.trim()), "Registro inválido.");

// ------------------------------------------------------------------
// Números
// ------------------------------------------------------------------

/** Arredonda para 2 casas — o banco é numeric(12,2), nunca mandar 3 casas. */
export function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Percentual no padrão pt-BR: "12,5%". */
export function formatPercentual(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? Number(valor) : valor ?? 0;
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/**
 * Base de cálculo de um item vendido: quantidade × unitário − desconto.
 * Nunca negativa (desconto maior que o item viraria comissão negativa).
 */
export function baseDoItem(item: {
  quantidade: number | string;
  valor_unitario: number | string;
  desconto: number | string;
}): number {
  const bruto =
    Number(item.quantidade) * Number(item.valor_unitario) - Number(item.desconto);
  return centavos(Math.max(0, bruto));
}

/** Valor da comissão a partir da base e do percentual do item. */
export function valorDaComissao(base: number, percentual: number): number {
  return centavos((base * percentual) / 100);
}
