import { z } from "zod";
import { FORMAS_PAGAMENTO } from "@/lib/types";
import { dataCalendarioValida } from "@/lib/validacao";

/**
 * Schemas e utilitários do módulo Financeiro (contas a pagar/receber).
 * Ficam fora do actions.ts porque o formulário (client) reusa as máscaras;
 * o servidor SEMPRE revalida com estes mesmos schemas.
 */

const FORMAS_VALIDAS = FORMAS_PAGAMENTO.map((f) => f.valor) as string[];

/** numeric(12,2) aguenta bem mais, mas acima disso é quase sempre erro de digitação. */
export const VALOR_MAXIMO = 9_999_999.99;

// ------------------------------------------------------------------
// Moeda
// ------------------------------------------------------------------

/**
 * Máscara de moeda: só dígitos → centavos → "1.234,56".
 * O sinal de menos (inclusive o "−" do teclado numérico) não entra — o valor
 * da conta é sempre positivo, e o tipo (receber/pagar) é que dá o sentido.
 */
export function mascaraMoeda(v: string): string {
  const digitos = v.replace(/[-−–—]/g, "").replace(/\D/g, "").slice(0, 9); // até 9.999.999,99
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  const [inteiro, decimal] = centavos.split(".");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

/** Converte "1.234,56" (pt-BR) ou "1234.56" em número. NaN se não for número. */
export function valorParaNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Arredonda para 2 casas — o banco é numeric(12,2), nunca mandar 3 casas. */
export function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Número em reais já formatado para caber no rótulo do gráfico: "12,4 mil". */
export function valorCompacto(valor: number): string {
  if (valor >= 1000) {
    return `${(valor / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mil`;
  }
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// ------------------------------------------------------------------
// Datas
// ------------------------------------------------------------------

/**
 * Soma `meses` a uma data ISO (YYYY-MM-DD) RESPEITANDO O FIM DE MÊS.
 *
 * O `Date` nativo estoura o mês: 31/01 + 1 mês vira 03/03 (ou 02/03), porque
 * 31/02 não existe e ele "transborda" para março. Numa conta mensal isso é
 * errado — o vencimento de fevereiro tem que ser 28/02 (ou 29/02 em ano
 * bissexto). Então: calcula ano/mês alvo na mão e trava o dia no último dia
 * daquele mês (dia 0 do mês seguinte = último dia do mês alvo, em UTC para
 * não escorregar com fuso/horário de verão).
 */
export function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);

  const totalMeses = mes - 1 + meses; // índice 0-based acumulado
  const anoAlvo = ano + Math.floor(totalMeses / 12);
  const mesAlvo = ((totalMeses % 12) + 12) % 12; // 0-11, sempre positivo

  const ultimoDiaDoMes = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate();
  const diaAlvo = Math.min(dia, ultimoDiaDoMes);

  const p = (n: number) => String(n).padStart(2, "0");
  return `${anoAlvo}-${p(mesAlvo + 1)}-${p(diaAlvo)}`;
}

/** Primeiro e último dia do mês de uma data ISO (para filtros do painel). */
export function limitesDoMes(iso: string): { inicio: string; fim: string } {
  const [ano, mes] = iso.slice(0, 10).split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    inicio: `${ano}-${p(mes)}-01`,
    fim: `${ano}-${p(mes)}-${p(ultimoDia)}`,
  };
}

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Rótulo curto do mês de uma chave "YYYY-MM" → "ago/26". */
export function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  return `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`;
}

/** Chaves "YYYY-MM" dos últimos `quantidade` meses, do mais antigo ao atual. */
export function ultimosMeses(iso: string, quantidade: number): string[] {
  const chaves: string[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    chaves.push(somarMeses(`${iso.slice(0, 8)}01`, -i).slice(0, 7));
  }
  return chaves;
}

const schemaData = z
  .string()
  .min(1, "Informe a data.")
  .refine(dataCalendarioValida, "Data inválida.")
  .refine((v) => !dataCalendarioValida(v) || v >= "2015-01-01", "Data antiga demais.")
  .refine(
    (v) => !dataCalendarioValida(v) || v <= `${new Date().getFullYear() + 10}-12-31`,
    "Data longe demais no futuro."
  );

/** Data vinda de filtro na URL: só passa se for data de calendário de verdade. */
export function filtroData(v: string | undefined): string | undefined {
  return v && dataCalendarioValida(v) ? v : undefined;
}

// ------------------------------------------------------------------
// Formulários
// ------------------------------------------------------------------

export const contaSchema = z.object({
  tipo: z.enum(["receber", "pagar"], { message: "Escolha o tipo da conta." }),
  descricao: z
    .string()
    .trim()
    .min(2, "Descreva a conta.")
    .max(200, "Use no máximo 200 caracteres."),
  categoria_id: z.string(),
  valor: z
    .number({ message: "Informe um valor válido." })
    .refine((v) => Number.isFinite(v) && v > 0, "O valor precisa ser maior que zero.")
    .refine((v) => v <= VALOR_MAXIMO, "Valor máximo: R$ 9.999.999,99."),
  vencimento: schemaData,
  tutor_id: z.string(),
  fornecedor: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  observacao: z.string().trim().max(500, "Use no máximo 500 caracteres."),
  repetir: z.boolean(),
  meses: z
    .number()
    .int()
    .min(1, "Repita por 1 a 24 meses.")
    .max(24, "Repita por 1 a 24 meses."),
});
export type ContaFormValores = z.infer<typeof contaSchema>;

export const baixaSchema = z.object({
  valor_pago: z
    .number({ message: "Informe um valor válido." })
    .refine((v) => Number.isFinite(v) && v > 0, "O valor precisa ser maior que zero.")
    .refine((v) => v <= VALOR_MAXIMO, "Valor máximo: R$ 9.999.999,99."),
  pagamento: schemaData,
  forma_pagamento: z
    .string()
    .refine(
      (v) => v === "" || FORMAS_VALIDAS.includes(v),
      "Forma de pagamento inválida."
    ),
});

export const categoriaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome da categoria.")
    .max(40, "Use no máximo 40 caracteres."),
  tipo: z.enum(["receita", "despesa"], { message: "Tipo de categoria inválido." }),
});
