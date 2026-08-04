import { z } from "zod";
import { schemaDataAgendamento } from "@/lib/validacao";

/**
 * Schemas do módulo de Internação — compartilhados entre os formulários
 * (react-hook-form no client) e as server actions (safeParse no servidor).
 * O servidor SEMPRE revalida com estes mesmos schemas: nunca confiar no front.
 */

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// ------------------------------------------------------------------
// Internação
// ------------------------------------------------------------------

export const internacaoSchema = z.object({
  pet_id: z.string().min(1, "Selecione o pet."),
  veterinario_id: z.string(),
  box: z.string().trim().max(20, "Use no máximo 20 caracteres."),
  data: schemaDataAgendamento(),
  hora: z.string().refine((v) => RE_HORA.test(v), "Informe a hora."),
  motivo: z.string().trim().min(3, "Descreva o motivo da internação."),
  diagnostico: z.string(),
  observacoes: z.string(),
});
export type InternacaoFormValores = z.infer<typeof internacaoSchema>;

/** Valores validados prontos para o banco ('' → null, data/hora → timestamptz). */
export function internacaoParaBanco(valores: InternacaoFormValores) {
  return {
    pet_id: valores.pet_id,
    veterinario_id: valores.veterinario_id.trim() || null,
    box: valores.box.trim() || null,
    // Offset fixo -03:00: o instante salvo corresponde ao horário local da
    // clínica, independente do fuso do servidor.
    data_entrada: `${valores.data}T${valores.hora}:00-03:00`,
    motivo: valores.motivo.trim(),
    diagnostico: valores.diagnostico.trim() || null,
    observacoes: valores.observacoes.trim() || null,
  };
}

// ------------------------------------------------------------------
// Prescrição
// ------------------------------------------------------------------

/**
 * "08:00, 16:00 00:00" → ["08:00","16:00","00:00"] (ordenados, sem repetir).
 * Retorna null se algum pedaço não for uma hora válida.
 */
export function parseHorarios(texto: string): string[] | null {
  const partes = texto
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) return [];
  if (partes.some((p) => !RE_HORA.test(p))) return null;
  return [...new Set(partes)].sort();
}

export const prescricaoSchema = z.object({
  medicamento: z.string().trim().min(2, "Informe o medicamento."),
  dose: z.string().trim().min(1, "Informe a dose (ex.: 2 mL, 1 comprimido)."),
  via: z.string(),
  frequencia_horas: z
    .string()
    .refine(
      (v) => v === "" || (/^\d{1,2}$/.test(v) && +v >= 1 && +v <= 24),
      "Frequência entre 1 e 24 horas."
    ),
  horarios: z
    .string()
    .refine(
      (v) => parseHorarios(v) !== null,
      "Use horários no formato 08:00, separados por vírgula."
    ),
  dias: z
    .string()
    .refine(
      (v) => v === "" || (/^\d{1,2}$/.test(v) && +v >= 1 && +v <= 30),
      "Duração entre 1 e 30 dias."
    ),
  observacao: z.string(),
});
export type PrescricaoFormValores = z.infer<typeof prescricaoSchema>;

// ------------------------------------------------------------------
// Evolução
// ------------------------------------------------------------------

/** Número decimal opcional dentro de uma faixa (aceita vírgula do pt-BR). */
function numeroOpcional(min: number, max: number, mensagem: string) {
  return z.string().refine((v) => {
    if (v.trim() === "") return true;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= min && n <= max;
  }, mensagem);
}

/** Inteiro opcional dentro de uma faixa. */
function inteiroOpcional(min: number, max: number, mensagem: string) {
  return z.string().refine((v) => {
    if (v.trim() === "") return true;
    return /^\d{1,3}$/.test(v.trim()) && +v >= min && +v <= max;
  }, mensagem);
}

export const evolucaoSchema = z.object({
  texto: z.string().trim().min(3, "Descreva a evolução do paciente."),
  temperatura: numeroOpcional(25, 45, "Temperatura entre 25 e 45 °C."),
  frequencia_cardiaca: inteiroOpcional(10, 400, "FC entre 10 e 400 bpm."),
  frequencia_respiratoria: inteiroOpcional(1, 200, "FR entre 1 e 200 mpm."),
});
export type EvolucaoFormValores = z.infer<typeof evolucaoSchema>;

/** Valores validados da evolução prontos para o banco ('' → null). */
export function evolucaoParaBanco(valores: EvolucaoFormValores) {
  const num = (v: string) =>
    v.trim() === "" ? null : Number(v.replace(",", "."));
  return {
    texto: valores.texto.trim(),
    temperatura: num(valores.temperatura),
    frequencia_cardiaca: num(valores.frequencia_cardiaca),
    frequencia_respiratoria: num(valores.frequencia_respiratoria),
  };
}
