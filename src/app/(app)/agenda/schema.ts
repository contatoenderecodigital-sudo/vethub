import { z } from "zod";

/**
 * Validação do formulário de agendamento — compartilhada entre o client
 * (react-hook-form) e a server action (safeParse). Nunca confiar só no front.
 */

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Confere se a string YYYY-MM-DD é uma data real do calendário. */
function dataCalendarioValida(v: string): boolean {
  const [ano, mes, dia] = v.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    d.getUTCFullYear() === ano &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

export const agendamentoSchema = z.object({
  pet_id: z.string().min(1, "Selecione o pet."),
  veterinario_id: z.string(),
  data: z
    .string()
    .refine(
      (v) => RE_DATA.test(v) && dataCalendarioValida(v),
      "Informe uma data válida."
    ),
  hora: z.string().refine((v) => RE_HORA.test(v), "Informe a hora."),
  tipo: z.enum(["consulta", "retorno", "banho_tosa", "cirurgia"], {
    message: "Selecione o tipo.",
  }),
  observacoes: z.string(),
});
export type AgendamentoFormValores = z.infer<typeof agendamentoSchema>;

/** Converte os valores validados do form de agendamento para o banco. */
export function agendamentoParaBanco(valores: AgendamentoFormValores) {
  return {
    pet_id: valores.pet_id,
    veterinario_id: valores.veterinario_id || null,
    data: valores.data,
    hora: valores.hora,
    tipo: valores.tipo,
    observacoes: valores.observacoes.trim() || null,
  };
}
