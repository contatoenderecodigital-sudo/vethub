import { z } from "zod";
import { dataCalendarioValida } from "@/lib/validacao";
import {
  FORMAS_FARMACEUTICAS,
  VIAS_ADMINISTRACAO,
  type ReceitaTipo,
} from "@/lib/types";

/**
 * Schema da receita, compartilhado entre o editor de medicamentos (client)
 * e as server actions. O servidor SEMPRE revalida com este mesmo schema,
 * nunca confia no que chega do formulário.
 */

export const MAX_MEDICAMENTOS = 30;

const TIPOS: [ReceitaTipo, ...ReceitaTipo[]] = [
  "simples",
  "controlada",
  "manipulada",
];

const listaFechada = (valores: { valor: string }[], mensagem: string) =>
  z
    .string()
    .refine((v) => v === "" || valores.some((o) => o.valor === v), mensagem);

export const medicamentoSchema = z.object({
  medicamento: z
    .string()
    .trim()
    .min(1, "Informe o nome do medicamento.")
    .max(160, "Nome do medicamento longo demais."),
  concentracao: z.string().trim().max(80, "Concentração longa demais."),
  forma_farmaceutica: listaFechada(
    FORMAS_FARMACEUTICAS,
    "Forma farmacêutica inválida."
  ),
  quantidade: z.string().trim().max(80, "Quantidade longa demais."),
  posologia: z
    .string()
    .trim()
    .min(1, "Informe a posologia.")
    .max(500, "Posologia longa demais."),
  via: listaFechada(VIAS_ADMINISTRACAO, "Via de administração inválida."),
  observacao: z.string().trim().max(300, "Observação longa demais."),
});

export const medicamentosSchema = z
  .array(medicamentoSchema)
  .min(1, "Inclua ao menos 1 medicamento com nome e posologia.")
  .max(MAX_MEDICAMENTOS, `Máximo de ${MAX_MEDICAMENTOS} medicamentos.`);

/** Data da receita: obrigatória, real e dentro de uma janela sensata. */
const schemaDataReceita = z
  .string()
  .min(1, "Informe a data da receita.")
  .refine(dataCalendarioValida, "Data inválida.")
  .refine((v) => !dataCalendarioValida(v) || v >= "2020-01-01", "Data inválida.")
  .refine(
    (v) => !dataCalendarioValida(v) || v <= `${new Date().getFullYear() + 5}-12-31`,
    "Data longe demais no futuro."
  );

const schemaRetorno = z
  .string()
  .refine((v) => v === "" || dataCalendarioValida(v), "Data de retorno inválida.");

export const receitaSchema = z
  .object({
    pet_id: z.string().min(1, "Selecione o pet."),
    veterinario_id: z.string(),
    consulta_id: z.string(),
    tipo: z.enum(TIPOS),
    data: schemaDataReceita,
    orientacoes: z.string().max(4000, "Orientações longas demais."),
    retorno_em: schemaRetorno,
    medicamentos: medicamentosSchema,
  })
  .refine((v) => v.retorno_em === "" || v.retorno_em >= v.data, {
    message: "O retorno não pode ser antes da data da receita.",
    path: ["retorno_em"],
  });

export type MedicamentoValores = z.infer<typeof medicamentoSchema>;
export type ReceitaFormValores = z.infer<typeof receitaSchema>;

/** Linha em branco do editor, usada no client e como base do parse. */
export const MEDICAMENTO_VAZIO: MedicamentoValores = {
  medicamento: "",
  concentracao: "",
  forma_farmaceutica: "",
  quantidade: "",
  posologia: "",
  via: "oral",
  observacao: "",
};
