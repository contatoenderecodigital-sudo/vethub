import { z } from "zod";
import type { AgendamentoStatus } from "@/lib/types";

/**
 * Listas fixas, tipos e schemas do módulo de Banho e tosa.
 * Compartilhados entre as telas e as server actions. O servidor SEMPRE
 * revalida com estes mesmos schemas, nunca confiar no front.
 */

// ------------------------------------------------------------------
// Linhas do banco
// ------------------------------------------------------------------

/** Preferências fixas do pet (tabela `ficha_banho_tosa`, uma por pet). */
export interface FichaBanhoTosa {
  id: string;
  pet_id: string;
  tipo_tosa: string | null;
  altura_maquina: string | null;
  shampoo: string | null;
  perfume: string | null;
  observacoes: string | null;
  restricoes: string | null;
  temperamento: string | null;
  updated_at: string;
}

/** Execução do serviço num agendamento (tabela `execucao_banho_tosa`). */
export interface ExecucaoBanhoTosa {
  id: string;
  agendamento_id: string;
  pet_id: string;
  servicos: string[] | null;
  inicio: string | null;
  fim: string | null;
  observacoes: string | null;
  foto_antes: string | null;
  foto_depois: string | null;
}

// ------------------------------------------------------------------
// Listas fixas
// ------------------------------------------------------------------

/** Serviços do petshop, gravados em `execucao_banho_tosa.servicos` (text[]). */
export const SERVICOS_BANHO_TOSA = [
  "Banho",
  "Tosa higiênica",
  "Tosa completa",
  "Hidratação",
  "Corte de unhas",
  "Limpeza de ouvido",
  "Escovação de dentes",
  "Desembolo",
  "Perfume",
] as const;

export const TIPOS_TOSA: { valor: string; rotulo: string }[] = [
  { valor: "higienica", rotulo: "Higiênica" },
  { valor: "maquina", rotulo: "Na máquina" },
  { valor: "tesoura", rotulo: "Na tesoura" },
  { valor: "bebe", rotulo: "Bebê" },
  { valor: "leao", rotulo: "Leão" },
  { valor: "verao", rotulo: "Verão" },
  { valor: "sem_tosa", rotulo: "Só banho (sem tosa)" },
];

/**
 * Temperamento do pet. `alerta` marca o que precisa de cuidado extra:
 * vira badge âmbar no cartão do fluxo para o profissional ver antes de pegar
 * o animal.
 */
export const TEMPERAMENTOS: { valor: string; rotulo: string; alerta: boolean }[] =
  [
    { valor: "docil", rotulo: "Dócil", alerta: false },
    { valor: "agitado", rotulo: "Agitado", alerta: true },
    { valor: "medroso", rotulo: "Medroso", alerta: true },
    { valor: "arisco", rotulo: "Arisco", alerta: true },
    { valor: "morde", rotulo: "Morde", alerta: true },
  ];

export function rotuloTipoTosa(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return TIPOS_TOSA.find((t) => t.valor === valor)?.rotulo ?? valor;
}

/** Rótulo + se merece destaque âmbar. Valor desconhecido vira alerta. */
export function temperamentoInfo(
  valor: string | null | undefined
): { rotulo: string; alerta: boolean } | null {
  if (!valor) return null;
  const conhecido = TEMPERAMENTOS.find((t) => t.valor === valor);
  return conhecido
    ? { rotulo: conhecido.rotulo, alerta: conhecido.alerta }
    : { rotulo: valor, alerta: true };
}

// ------------------------------------------------------------------
// Fluxo do dia (colunas do painel)
// ------------------------------------------------------------------

export interface EtapaFluxo {
  status: AgendamentoStatus;
  titulo: string;
  /** Próximo status do fluxo (null = fim da linha). */
  proximo: AgendamentoStatus | null;
  /** Texto do botão que leva para a próxima etapa. */
  acao: string | null;
  corBorda: string;
  corPonto: string;
}

/**
 * O petshop trabalha por fluxo, não por horário: o pet entra, toma banho,
 * seca/tosa, fica pronto e é entregue. Cada etapa é um status do agendamento.
 */
export const ETAPAS_BANHO_TOSA: EtapaFluxo[] = [
  {
    status: "agendado",
    titulo: "Aguardando",
    proximo: "check_in",
    acao: "Iniciar banho",
    corBorda: "border-t-cyan-300",
    corPonto: "bg-cyan-300",
  },
  {
    status: "check_in",
    titulo: "Em banho",
    proximo: "atendido",
    acao: "Secagem e tosa",
    corBorda: "border-t-sky-300",
    corPonto: "bg-sky-300",
  },
  {
    status: "atendido",
    titulo: "Secagem/Tosa",
    proximo: "pronto",
    acao: "Marcar pronto",
    corBorda: "border-t-amber-300",
    corPonto: "bg-amber-300",
  },
  {
    status: "pronto",
    titulo: "Pronto para retirada",
    proximo: "check_out",
    acao: "Entregar ao tutor",
    corBorda: "border-t-brand-light",
    corPonto: "bg-brand-light",
  },
  {
    status: "check_out",
    titulo: "Entregue",
    proximo: null,
    acao: null,
    corBorda: "border-t-emerald-400",
    corPonto: "bg-emerald-400",
  },
];

/** Etapa a partir do status atual (cancelado fica fora do fluxo). */
export function etapaDoStatus(status: string): EtapaFluxo | undefined {
  return ETAPAS_BANHO_TOSA.find((e) => e.status === status);
}

// ------------------------------------------------------------------
// Schemas
// ------------------------------------------------------------------

const TEXTO_CURTO = 60;
const TEXTO_LONGO = 500;

export const fichaSchema = z.object({
  tipo_tosa: z
    .string()
    .refine(
      (v) => v === "" || TIPOS_TOSA.some((t) => t.valor === v),
      "Tipo de tosa inválido."
    ),
  altura_maquina: z
    .string()
    .trim()
    .max(20, "Use no máximo 20 caracteres na altura da máquina."),
  shampoo: z.string().trim().max(TEXTO_CURTO, "Nome do shampoo longo demais."),
  perfume: z.string().trim().max(TEXTO_CURTO, "Nome do perfume longo demais."),
  temperamento: z
    .string()
    .refine(
      (v) => v === "" || TEMPERAMENTOS.some((t) => t.valor === v),
      "Temperamento inválido."
    ),
  restricoes: z
    .string()
    .trim()
    .max(TEXTO_LONGO, "Use no máximo 500 caracteres nas restrições."),
  observacoes: z
    .string()
    .trim()
    .max(TEXTO_LONGO, "Use no máximo 500 caracteres nas observações."),
});
export type FichaFormValores = z.infer<typeof fichaSchema>;

/** Valores validados da ficha prontos para o banco ('' → null). */
export function fichaParaBanco(valores: FichaFormValores) {
  const texto = (v: string) => v.trim() || null;
  return {
    tipo_tosa: texto(valores.tipo_tosa),
    altura_maquina: texto(valores.altura_maquina),
    shampoo: texto(valores.shampoo),
    perfume: texto(valores.perfume),
    temperamento: texto(valores.temperamento),
    restricoes: texto(valores.restricoes),
    observacoes: texto(valores.observacoes),
  };
}

export const servicosSchema = z.object({
  servicos: z
    .array(z.string())
    .max(SERVICOS_BANHO_TOSA.length, "Serviços demais.")
    .refine(
      (lista) =>
        lista.every((s) => (SERVICOS_BANHO_TOSA as readonly string[]).includes(s)),
      "Serviço desconhecido."
    ),
});

export const execucaoObservacoesSchema = z.object({
  observacoes: z
    .string()
    .trim()
    .max(1000, "Use no máximo 1000 caracteres nas observações."),
});

/** Foto já enviada ao bucket público "fotos". Aqui só guardamos a URL. */
export const fotoExecucaoSchema = z.object({
  campo: z.enum(["antes", "depois"], "Campo de foto inválido."),
  url: z
    .string()
    .trim()
    .min(1, "URL vazia.")
    .max(500, "URL longa demais.")
    .refine((v) => v.startsWith("https://"), "URL inválida."),
});

/** Status aceitos pelo fluxo de banho e tosa (espelha o CHECK do banco). */
export const etapaSchema = z.object({
  agendamento_id: z.string().min(1, "Agendamento não identificado."),
  status: z.enum(
    ["agendado", "check_in", "atendido", "pronto", "check_out", "cancelado"],
    "Etapa inválida."
  ),
});
