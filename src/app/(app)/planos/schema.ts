import { z } from "zod";
import { dataCalendarioValida } from "@/lib/validacao";

/**
 * Schemas e utilitários dos planos e assinaturas.
 * O formulário (client) reusa as máscaras daqui; a server action SEMPRE
 * revalida com os mesmos schemas, nunca confiar no que veio do front.
 */

export const VALOR_MAXIMO = 9_999_999.99;
export const MAX_BENEFICIOS = 20;
export const QUANTIDADE_MAXIMA = 999;

// ------------------------------------------------------------------
// Moeda e números
// ------------------------------------------------------------------

/**
 * Máscara de moeda: só dígitos → centavos → "1.234,56".
 * O sinal de menos (inclusive o "−" do teclado numérico) não entra. O zod
 * do servidor também barra qualquer valor abaixo de zero.
 */
export function mascaraMoeda(v: string): string {
  const digitos = v.replace(/[-−–—]/g, "").replace(/\D/g, "").slice(0, 9); // até 9.999.999,99
  if (!digitos) return "";
  const centavos = (Number(digitos) / 100).toFixed(2);
  const [inteiro, decimal] = centavos.split(".");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}

/** Número do banco → texto com máscara de moeda ("189,00"). */
export function moedaDoBanco(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  if (!Number.isFinite(n)) return "";
  return mascaraMoeda(Math.round(n * 100).toString());
}

/** Converte "1.234,56" (pt-BR) ou "1234.56" em número. NaN se não for número. */
export function valorParaNumero(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

/** Arredonda para 2 casas. As colunas são numeric(12,2). */
export function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Só dígitos (quantidade por mês, dia da cobrança). */
export function sanitizarInteiro(texto: string, maxChars = 3): string {
  return texto.replace(/\D/g, "").slice(0, maxChars);
}

// ------------------------------------------------------------------
// Datas da cobrança recorrente
// ------------------------------------------------------------------

const p2 = (n: number) => String(n).padStart(2, "0");

/**
 * Próxima data de cobrança (YYYY-MM-DD) de uma assinatura.
 *
 * O banco limita `dia_cobranca` de 1 a 28 justamente para o dia SEMPRE
 * existir em qualquer mês (inclusive fevereiro), por isso não há
 * tratamento de "fim de mês curto" aqui.
 *
 * Regra: se o dia ainda não passou no mês corrente, a cobrança é deste
 * mês; se já passou, cai no mês seguinte (virando o ano em dezembro).
 * O próprio dia de hoje conta como "ainda não passou". Quem gera a
 * cobrança hoje quer o vencimento de hoje, não o do mês que vem.
 */
export function proximaCobranca(diaCobranca: number, hojeIso: string): string {
  const [ano, mes, dia] = hojeIso.slice(0, 10).split("-").map(Number);

  let anoAlvo = ano;
  let mesAlvo = mes;
  if (diaCobranca < dia) {
    mesAlvo += 1;
    if (mesAlvo > 12) {
      mesAlvo = 1;
      anoAlvo += 1;
    }
  }

  return `${anoAlvo}-${p2(mesAlvo)}-${p2(diaCobranca)}`;
}

/** "2026-08-05" → "08/2026" (usado na descrição da cobrança). */
export function rotuloMesAno(iso: string): string {
  const [ano, mes] = iso.slice(0, 10).split("-");
  return `${mes}/${ano}`;
}

/** Primeiro e último dia do mês de uma data ISO. */
export function limitesDoMes(iso: string): { inicio: string; fim: string } {
  const [ano, mes] = iso.slice(0, 10).split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return {
    inicio: `${ano}-${p2(mes)}-01`,
    fim: `${ano}-${p2(mes)}-${p2(ultimoDia)}`,
  };
}

/** Dias inteiros entre duas datas puras (YYYY-MM-DD), sem passar por fuso. */
export function diasEntre(deIso: string, ateIso: string): number {
  const [a1, m1, d1] = deIso.slice(0, 10).split("-").map(Number);
  const [a2, m2, d2] = ateIso.slice(0, 10).split("-").map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000
  );
}

/** Descrição padronizada da cobrança mensal (também serve de chave anti-duplicata). */
export function descricaoCobranca(planoNome: string, vencimento: string): string {
  return `Assinatura ${planoNome} · ${rotuloMesAno(vencimento)}`;
}

// ------------------------------------------------------------------
// Formulários
// ------------------------------------------------------------------

const schemaData = z
  .string()
  .min(1, "Informe a data.")
  .refine(dataCalendarioValida, "Data inválida.")
  .refine((v) => !dataCalendarioValida(v) || v >= "2015-01-01", "Data antiga demais.")
  .refine(
    (v) => !dataCalendarioValida(v) || v <= `${new Date().getFullYear() + 5}-12-31`,
    "Data longe demais no futuro."
  );

const schemaValor = z
  .number({ message: "Informe um valor válido." })
  .refine((v) => Number.isFinite(v) && v > 0, "O valor precisa ser maior que zero.")
  .refine((v) => v <= VALOR_MAXIMO, "Valor máximo: R$ 9.999.999,99.");

/** Uma linha do editor de benefícios do plano. */
export const beneficioSchema = z.object({
  item_id: z.string().max(60, "Item inválido."),
  descricao: z
    .string()
    .trim()
    .min(2, "Descreva o benefício (ex.: Banho completo).")
    .max(200, "Use no máximo 200 caracteres."),
  quantidade_mes: z
    .number({ message: "Quantidade inválida." })
    .int("Use um número inteiro de vezes por mês.")
    .min(1, `A quantidade por mês vai de 1 a ${QUANTIDADE_MAXIMA}.`)
    .max(QUANTIDADE_MAXIMA, `A quantidade por mês vai de 1 a ${QUANTIDADE_MAXIMA}.`),
  desconto_percentual: z
    .number({ message: "Desconto inválido." })
    .min(0, "O desconto vai de 0 a 100%.")
    .max(100, "O desconto vai de 0 a 100%."),
});
export type BeneficioValores = z.infer<typeof beneficioSchema>;

export const planoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome do plano.")
    .max(120, "Nome longo demais."),
  descricao: z.string().trim().max(1000, "Descrição longa demais."),
  valor_mensal: schemaValor,
  ativo: z.boolean(),
  beneficios: z
    .array(beneficioSchema)
    .min(1, "Adicione pelo menos um benefício ao plano.")
    .max(MAX_BENEFICIOS, `Use no máximo ${MAX_BENEFICIOS} benefícios.`),
});
export type PlanoFormValores = z.infer<typeof planoSchema>;

export const assinaturaSchema = z.object({
  tutor_id: z.string().min(1, "Escolha o tutor."),
  pet_id: z.string(),
  plano_item_id: z.string().min(1, "Escolha o plano."),
  valor_mensal: schemaValor,
  dia_cobranca: z
    .number({ message: "Dia inválido." })
    .int("O dia da cobrança precisa ser um número inteiro.")
    .min(1, "O dia da cobrança vai de 1 a 28.")
    .max(28, "O dia da cobrança vai de 1 a 28 (para existir em fevereiro)."),
  inicio: schemaData,
  observacao: z.string().trim().max(500, "Use no máximo 500 caracteres."),
});

export const usoSchema = z.object({
  beneficio_id: z.string(),
  descricao: z
    .string()
    .trim()
    .min(2, "Descreva o uso (ex.: Banho do Thor).")
    .max(200, "Use no máximo 200 caracteres."),
  data: schemaData,
});

/**
 * O editor de benefícios manda um input hidden com JSON. Aqui só garantimos
 * que virou array: cada linha ainda passa pelo zod na action.
 */
export function beneficiosDoJson(bruto: string): unknown[] {
  try {
    const valor = JSON.parse(bruto || "[]");
    return Array.isArray(valor) ? valor.slice(0, MAX_BENEFICIOS + 1) : [];
  } catch {
    return [];
  }
}

/** PostgREST devolve embed como objeto ou array conforme a relação. */
export function primeiro<T>(valor: T | T[] | null | undefined): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}
