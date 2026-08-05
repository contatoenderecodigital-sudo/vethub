import { z } from "zod";
import { FORMAS_PAGAMENTO_VENDA, type FormaPagamentoVenda } from "@/lib/types";

/**
 * Schemas do PDV. O servidor SEMPRE revalida com estes schemas. O payload
 * chega do navegador em JSON e nada dele é confiável.
 */

const FORMAS = FORMAS_PAGAMENTO_VENDA.map((f) => f.valor) as [
  FormaPagamentoVenda,
  ...FormaPagamentoVenda[],
];

export const VALOR_MAX = 999999;
export const QTD_MAX = 9999;
export const PARCELAS_MAX = 24;

export const itemVendaSchema = z.object({
  item_id: z.uuid("Item inválido.").nullable(),
  descricao: z
    .string()
    .trim()
    .min(1, "Todo item precisa de descrição.")
    .max(200, "Descrição muito longa."),
  quantidade: z
    .number("Quantidade inválida.")
    .gt(0, "A quantidade precisa ser maior que zero.")
    .max(QTD_MAX, `Quantidade máxima: ${QTD_MAX}.`),
  valor_unitario: z
    .number("Valor unitário inválido.")
    .min(0, "O valor unitário não pode ser negativo.")
    .max(VALOR_MAX, "Valor unitário máximo: R$ 999.999,00."),
  desconto: z
    .number("Desconto inválido.")
    .min(0, "O desconto não pode ser negativo.")
    .max(VALOR_MAX, "Desconto máximo: R$ 999.999,00."),
});

export const pagamentoVendaSchema = z.object({
  forma: z.enum(FORMAS, "Forma de pagamento inválida."),
  valor: z
    .number("Valor do pagamento inválido.")
    .gt(0, "Todo pagamento precisa de um valor maior que zero.")
    .max(VALOR_MAX, "Valor máximo por pagamento: R$ 999.999,00."),
  parcelas: z
    .number("Número de parcelas inválido.")
    .int("Número de parcelas inválido.")
    .min(1, "Mínimo de 1 parcela.")
    .max(PARCELAS_MAX, `Máximo de ${PARCELAS_MAX} parcelas.`),
});

export const vendaSchema = z.object({
  tutor_id: z.uuid("Tutor inválido.").nullable(),
  desconto: z
    .number("Desconto inválido.")
    .min(0, "O desconto não pode ser negativo.")
    .max(VALOR_MAX, "Desconto máximo: R$ 999.999,00."),
  observacao: z.string().trim().max(500, "Observação muito longa."),
  itens: z.array(itemVendaSchema).min(1, "Adicione ao menos um item à venda."),
  pagamentos: z
    .array(pagamentoVendaSchema)
    .min(1, "Informe ao menos uma forma de pagamento."),
});

export type ItemVendaEntrada = z.infer<typeof itemVendaSchema>;
export type PagamentoVendaEntrada = z.infer<typeof pagamentoVendaSchema>;
export type VendaEntrada = z.infer<typeof vendaSchema>;

export const aberturaCaixaSchema = z.object({
  valor_abertura: z
    .number("Informe um valor de abertura válido.")
    .min(0, "O valor de abertura não pode ser negativo.")
    .max(VALOR_MAX, "Valor de abertura máximo: R$ 999.999,00."),
  observacao: z.string().trim().max(300, "Observação muito longa."),
});

export const fechamentoCaixaSchema = z.object({
  valor_fechamento: z
    .number("Informe o valor contado.")
    .min(0, "O valor contado não pode ser negativo.")
    .max(VALOR_MAX, "Valor contado máximo: R$ 999.999,00."),
  observacao: z.string().trim().max(300, "Observação muito longa."),
});

/** Primeira mensagem de erro do zod, pronta para a tela. */
export function primeiroErro(erro: z.ZodError, padrao: string): string {
  return erro.issues[0]?.message ?? padrao;
}
