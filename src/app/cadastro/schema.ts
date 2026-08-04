import { z } from "zod";
import {
  schemaEmailObrigatorio,
  schemaNome,
  schemaSenhaForte,
} from "@/lib/validacao";

/**
 * Schema do cadastro de clínica + admin. Usado pelo form (client) e
 * revalidado em /api/cadastro (servidor) — sempre o mesmo schema.
 */
export const cadastroSchema = z.object({
  clinica: z.string().trim().min(2, "Informe o nome da clínica."),
  nome: schemaNome,
  email: schemaEmailObrigatorio,
  senha: schemaSenhaForte,
});

export type CadastroValores = z.infer<typeof cadastroSchema>;
