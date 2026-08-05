import { z } from "zod";
import { paraNumero } from "./formato";

/**
 * Validação dos formulários de itens e do catálogo auxiliar
 * (marcas, unidades, grupos). O mesmo schema roda no client
 * (react-hook-form) e na server action (safeParse).
 */

const VALOR_MAX = 9_999_999.99;
const QTD_MAX = 999_999;

/** Campo numérico opcional: vazio conta como zero. */
function numeroNoIntervalo(min: number, max: number) {
  return (v: string) => {
    const n = paraNumero(v);
    if (n === null) return true; // vazio = 0
    return Number.isFinite(n) && n >= min && n <= max;
  };
}

/**
 * Valor negativo tem mensagem própria: a máscara descarta o "-" na digitação,
 * então quem manda número negativo veio por fora do formulário, e precisa
 * ler o motivo exato da recusa, não um "intervalo inválido" genérico.
 */
function naoNegativo(v: string) {
  const n = paraNumero(v);
  return n === null || !Number.isFinite(n) || n >= 0;
}

/** "1.234,56" → 1234.56; vazio → 0. Usado depois do zod aprovar. */
export function valorParaNumero(v: string): number {
  const n = paraNumero(v);
  return n === null || !Number.isFinite(n) ? 0 : n;
}

/** Inteiro positivo opcional (duração do serviço). */
export function inteiroOuNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ------------------------------------------------------------------
// Item (produto / serviço)
// ------------------------------------------------------------------

export const itemSchema = z
  .object({
    // 'plano' é aceito para não travar a edição de itens legados
    tipo: z.enum(["produto", "servico", "plano"], "Selecione o tipo do item."),
    nome: z.string().trim().min(2, "Informe o nome do item."),
    codigo: z.string().trim().max(40, "Código longo demais."),
    codigo_barras: z.string().trim().max(60, "Código de barras longo demais."),
    descricao: z.string().max(1000, "Descrição longa demais."),
    grupo_id: z.string(),
    marca_id: z.string(),
    unidade_id: z.string(),
    preco_venda: z
      .string()
      .refine(naoNegativo, "O preço de venda não pode ser negativo.")
      .refine(numeroNoIntervalo(0, VALOR_MAX), "Preço inválido. Use de 0 a 9.999.999,99."),
    preco_custo: z
      .string()
      .refine(naoNegativo, "O preço de custo não pode ser negativo.")
      .refine(numeroNoIntervalo(0, VALOR_MAX), "Preço inválido. Use de 0 a 9.999.999,99."),
    comissao_percentual: z
      .string()
      .refine(naoNegativo, "A comissão não pode ser negativa.")
      .refine(numeroNoIntervalo(0, 100), "A comissão vai de 0 a 100%."),
    controla_estoque: z.boolean(),
    estoque_minimo: z
      .string()
      .refine(naoNegativo, "O estoque mínimo não pode ser negativo.")
      .refine(numeroNoIntervalo(0, QTD_MAX), "Quantidade inválida."),
    medicamento: z.boolean(),
    principio_ativo: z.string().max(200, "Texto longo demais."),
    requer_receita: z.boolean(),
    vacina: z.boolean(),
    duracao_minutos: z.string().refine((v) => {
      if (!v.trim()) return true;
      const n = Number(v.trim());
      return Number.isInteger(n) && n > 0 && n <= 1440;
    }, "Duração inválida. Use de 1 a 1440 minutos."),
    ativo: z.boolean(),
  })
  .refine(
    (v) => v.tipo !== "produto" || !v.controla_estoque || v.unidade_id !== "",
    {
      message: "Escolha a unidade de medida para controlar o estoque.",
      path: ["unidade_id"],
    }
  );

export type ItemFormValores = z.infer<typeof itemSchema>;

/**
 * Converte os valores validados para o formato do banco.
 * NUNCA devolve `estoque_atual`. Quem mexe nesse campo é o trigger
 * de movimentação.
 */
export function itemParaBanco(v: ItemFormValores) {
  const produto = v.tipo === "produto";
  const servico = v.tipo === "servico";
  const controla = produto && v.controla_estoque;

  return {
    tipo: v.tipo,
    nome: v.nome.trim(),
    codigo: v.codigo.trim() || null,
    codigo_barras: v.codigo_barras.trim() || null,
    descricao: v.descricao.trim() || null,
    grupo_id: v.grupo_id || null,
    marca_id: v.marca_id || null,
    unidade_id: v.unidade_id || null,
    preco_venda: valorParaNumero(v.preco_venda),
    preco_custo: valorParaNumero(v.preco_custo),
    comissao_percentual: valorParaNumero(v.comissao_percentual),
    controla_estoque: controla,
    estoque_minimo: controla ? valorParaNumero(v.estoque_minimo) : 0,
    medicamento: produto ? v.medicamento : false,
    principio_ativo: produto ? v.principio_ativo.trim() || null : null,
    requer_receita: produto ? v.requer_receita : false,
    vacina: produto ? v.vacina : false,
    duracao_minutos: servico ? inteiroOuNull(v.duracao_minutos) : null,
    ativo: v.ativo,
  };
}

/** Lê o formulário de item de um FormData (client e server usam o mesmo mapa). */
export function itemDoFormData(formData: FormData) {
  return {
    tipo: String(formData.get("tipo") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    codigo: String(formData.get("codigo") ?? ""),
    codigo_barras: String(formData.get("codigo_barras") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    grupo_id: String(formData.get("grupo_id") ?? ""),
    marca_id: String(formData.get("marca_id") ?? ""),
    unidade_id: String(formData.get("unidade_id") ?? ""),
    preco_venda: String(formData.get("preco_venda") ?? ""),
    preco_custo: String(formData.get("preco_custo") ?? ""),
    comissao_percentual: String(formData.get("comissao_percentual") ?? ""),
    controla_estoque: formData.get("controla_estoque") === "on",
    estoque_minimo: String(formData.get("estoque_minimo") ?? ""),
    medicamento: formData.get("medicamento") === "on",
    principio_ativo: String(formData.get("principio_ativo") ?? ""),
    requer_receita: formData.get("requer_receita") === "on",
    vacina: formData.get("vacina") === "on",
    duracao_minutos: String(formData.get("duracao_minutos") ?? ""),
    ativo: formData.get("ativo") === "on",
  };
}

// ------------------------------------------------------------------
// Catálogo auxiliar: marca, unidade de medida e grupo
// ------------------------------------------------------------------

export const marcaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da marca.").max(60, "Nome longo demais."),
});

export const unidadeSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da unidade.").max(40, "Nome longo demais."),
  sigla: z.string().trim().min(1, "Informe a sigla.").max(10, "Sigla longa demais."),
  fracionavel: z.boolean(),
});

export const grupoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do grupo.").max(60, "Nome longo demais."),
  grupo_pai_id: z.string(),
  tipo: z.enum(["produto", "servico", "ambos"], "Selecione o tipo do grupo."),
});
