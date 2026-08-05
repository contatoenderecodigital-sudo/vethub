import { z } from "zod";
import {
  schemaEmailObrigatorio,
  schemaNome,
  schemaSenhaForte,
} from "@/lib/validacao";

/**
 * Schema do novo usuário da equipe. Usado pelo form (client) e
 * revalidado na server action criarUsuario, sempre o mesmo schema.
 */
export const novoUsuarioSchema = z.object({
  nome: schemaNome,
  email: schemaEmailObrigatorio,
  senha: schemaSenhaForte,
  papel: z.enum(["admin", "veterinario", "recepcao"], "Escolha um papel válido."),
});

export type NovoUsuarioValores = z.infer<typeof novoUsuarioSchema>;
