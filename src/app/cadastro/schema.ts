import { z } from "zod";
import {
  schemaEmailObrigatorio,
  schemaNome,
  schemaSenhaForte,
} from "@/lib/validacao";

/**
 * Schema do cadastro de clínica + admin. Usado pelo form (client) e
 * revalidado em /api/cadastro (servidor), sempre o mesmo schema.
 */
export const cadastroSchema = z.object({
  clinica: z.string().trim().min(2, "Informe o nome da clínica."),
  nome: schemaNome,
  email: schemaEmailObrigatorio,
  senha: schemaSenhaForte,
  /**
   * Código do parceiro que indicou, vindo de `/cadastro?ref=CODIGO`.
   *
   * Opcional e nunca digitado por ninguém: chega pela URL. Um código que não
   * existe não impede o cadastro — a clínica entra sem indicação, porque
   * perder um cliente por causa de um link errado seria o pior desfecho
   * possível.
   */
  ref: z.string().trim().max(40).optional(),
});

export type CadastroValores = z.infer<typeof cadastroSchema>;
