import { z } from "zod";

/**
 * Schema da consulta, compartilhado entre o formulário (client) e as
 * server actions do módulo. O servidor SEMPRE revalida com este mesmo
 * schema (nunca confiar só no front).
 */

export const CAMPOS_CLINICOS = [
  "queixa",
  "anamnese",
  "exame_fisico",
  "diagnostico",
  "conduta",
  "observacoes",
] as const;

export const consultaSchema = z
  .object({
    pet_id: z.string().min(1, "Selecione o pet."),
    veterinario_id: z.string(),
    queixa: z.string(),
    anamnese: z.string(),
    exame_fisico: z.string(),
    diagnostico: z.string(),
    conduta: z.string(),
    observacoes: z.string(),
  })
  .refine(
    (valores) =>
      CAMPOS_CLINICOS.some((campo) => valores[campo].trim().length > 0),
    {
      message: "Preencha ao menos um campo do atendimento.",
      path: ["root"],
    }
  );

export type ConsultaFormValores = z.infer<typeof consultaSchema>;
