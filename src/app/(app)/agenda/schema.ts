import { z } from "zod";
import { schemaDataAgendamento } from "@/lib/validacao";

/**
 * Validação do formulário de agendamento, compartilhada entre o client
 * (react-hook-form) e a server action (safeParse). Nunca confiar só no front.
 */

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const agendamentoSchema = z.object({
  pet_id: z.string().min(1, "Selecione o pet."),
  veterinario_id: z.string(),
  data: schemaDataAgendamento(),
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
