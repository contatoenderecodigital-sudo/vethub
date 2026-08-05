import { z } from "zod";
import { dataCalendarioValida } from "@/lib/validacao";
import { paraNumero } from "../itens/formato";

/**
 * Validação da movimentação de estoque e do cadastro de lote.
 * O mesmo schema roda no formulário e na server action.
 */

const QTD_MAX = 999_999;
const VALOR_MAX = 9_999_999.99;

/** Quantidade obrigatória, maior que zero. */
const quantidadeValida = (v: string) => {
  const n = paraNumero(v);
  return n !== null && Number.isFinite(n) && n > 0 && n <= QTD_MAX;
};

/** Valor opcional: vazio conta como "não informado". */
const valorValido = (v: string) => {
  const n = paraNumero(v);
  if (n === null) return true;
  return Number.isFinite(n) && n >= 0 && n <= VALOR_MAX;
};

/** Validade do lote: data real, de 2000 até 20 anos à frente. */
const validadeValida = (v: string) => {
  if (!dataCalendarioValida(v)) return false;
  return v >= "2000-01-01" && v <= `${new Date().getFullYear() + 20}-12-31`;
};

export const movimentacaoSchema = z.object({
  item_id: z.string().min(1, "Selecione o produto."),
  tipo: z.enum(["entrada", "saida", "ajuste", "perda"], "Selecione o tipo."),
  quantidade: z
    .string()
    .refine(quantidadeValida, "Quantidade inválida. Use um número maior que zero."),
  valor_unitario: z.string().refine(valorValido, "Valor unitário inválido."),
  lote_codigo: z.string().trim().max(40, "Código do lote longo demais."),
  motivo: z.string().trim().max(200, "Motivo longo demais."),
});
export type MovimentacaoFormValores = z.infer<typeof movimentacaoSchema>;

export const loteSchema = z.object({
  item_id: z.string().min(1, "Selecione o produto."),
  codigo: z.string().trim().min(1, "Informe o código do lote.").max(40, "Código longo demais."),
  validade: z.string().refine(validadeValida, "Validade inválida."),
  quantidade: z
    .string()
    .refine(quantidadeValida, "Quantidade inválida. Use um número maior que zero."),
});
export type LoteFormValores = z.infer<typeof loteSchema>;

/** Quantidade validada → número (o zod já garantiu que dá certo). */
export function quantidadeParaNumero(v: string): number {
  const n = paraNumero(v);
  return n === null || !Number.isFinite(n) ? 0 : n;
}

/** Valor unitário opcional → número ou null. */
export function valorParaNumeroOuNull(v: string): number | null {
  const n = paraNumero(v);
  return n === null || !Number.isFinite(n) ? null : n;
}
