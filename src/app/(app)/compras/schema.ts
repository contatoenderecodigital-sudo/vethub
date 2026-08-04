import { z } from "zod";
import { dataCalendarioValida } from "@/lib/validacao";
import { paraNumero } from "../itens/formato";

/**
 * Validação da entrada de mercadoria (cabeçalho da nota + itens).
 * O editor de itens serializa tudo num JSON e o servidor revalida
 * linha a linha com estes mesmos schemas.
 */

export const VALOR_MAX = 9_999_999.99;
export const QTD_MAX = 999_999;

export const ERRO_ITENS =
  "Inclua ao menos 1 item com descrição, quantidade maior que zero e valor válido.";

const schemaData = z
  .string()
  .min(1, "Informe a data da compra.")
  .refine(dataCalendarioValida, "Data inválida.")
  .refine((v) => !dataCalendarioValida(v) || v >= "2015-01-01", "Data antiga demais.")
  .refine(
    (v) => !dataCalendarioValida(v) || v <= `${new Date().getFullYear() + 1}-12-31`,
    "Data longe demais no futuro."
  );

/** Validade do lote: vazia ou data real até 20 anos à frente. */
const validadeValida = (v: string) => {
  if (v === "") return true;
  if (!dataCalendarioValida(v)) return false;
  return v >= "2000-01-01" && v <= `${new Date().getFullYear() + 20}-12-31`;
};

export const compraSchema = z.object({
  fornecedor_id: z.string().min(1, "Selecione o fornecedor."),
  numero_nota: z.string().trim().max(40, "Número da nota longo demais."),
  data: schemaData,
  frete: z
    .number({ message: "Frete inválido." })
    .refine((v) => Number.isFinite(v) && v >= 0, "O frete não pode ser negativo.")
    .refine((v) => v <= VALOR_MAX, "Frete máximo: R$ 9.999.999,99."),
  observacao: z.string().trim().max(500, "Use no máximo 500 caracteres."),
});
export type CompraFormValores = z.infer<typeof compraSchema>;

export const compraItemSchema = z.object({
  item_id: z.string(),
  descricao: z
    .string()
    .trim()
    .min(1, "Informe a descrição do item.")
    .max(200, "Descrição longa demais."),
  quantidade: z.number().gt(0).max(QTD_MAX),
  valor_unitario: z.number().min(0).max(VALOR_MAX),
  lote: z.string().trim().max(40),
  validade: z.string().refine(validadeValida, "Validade inválida."),
});
export type CompraItemEntrada = z.infer<typeof compraItemSchema>;

export const compraItensSchema = z.array(compraItemSchema).min(1).max(200);

// ------------------------------------------------------------------
// Conversões
// ------------------------------------------------------------------

/** "1.234,56" ou "1234.56" → número. Vazio conta como zero (frete). */
export function valorOuZero(texto: string): number {
  const n = paraNumero(texto);
  return n === null || !Number.isFinite(n) ? 0 : n;
}

/** Arredonda para 2 casas — as colunas são numeric(12,2). */
export function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Soma dias a uma data ISO (YYYY-MM-DD) em UTC, sem escorregar com fuso. */
export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1, dia + dias));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${alvo.getUTCFullYear()}-${p(alvo.getUTCMonth() + 1)}-${p(alvo.getUTCDate())}`;
}

/** Data vinda de filtro na URL: só passa se for data de calendário de verdade. */
export function filtroData(v: string | undefined): string | undefined {
  return v && dataCalendarioValida(v) ? v : undefined;
}

/** Descrição padrão da compra (usada na conta a pagar e nas movimentações). */
export function rotuloDaNota(numeroNota: string | null | undefined): string {
  const n = (numeroNota ?? "").trim();
  return n ? `Compra NF ${n}` : "Compra sem nota fiscal";
}

/**
 * Lê e valida os itens serializados no input hidden name="itens".
 * Linhas sem descrição são descartadas ANTES do parse; o resto passa
 * pelo zod. Retorna null se nada sobrar válido.
 */
export function itensDoForm(formData: FormData): CompraItemEntrada[] | null {
  let brutos: unknown;
  try {
    brutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(brutos)) return null;

  const candidatos = brutos
    .map((bruto) => {
      const linha = (
        typeof bruto === "object" && bruto !== null ? bruto : {}
      ) as Record<string, unknown>;
      return {
        item_id: String(linha.item_id ?? ""),
        descricao: String(linha.descricao ?? "").trim(),
        quantidade: Number(linha.quantidade),
        valor_unitario: Number(linha.valor_unitario),
        lote: String(linha.lote ?? "").trim(),
        validade: String(linha.validade ?? "").trim(),
      };
    })
    .filter((c) => c.descricao !== "");

  const resultado = compraItensSchema.safeParse(candidatos);
  return resultado.success ? resultado.data : null;
}
