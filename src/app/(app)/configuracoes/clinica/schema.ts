import { z } from "zod";
import { schemaCNPJOpcional, schemaTelefoneOpcional } from "@/lib/validacao";

/**
 * Schema dos dados da clínica. Usado pelo form (client) e revalidado
 * na server action atualizarClinica — sempre o mesmo schema.
 * Telefone da clínica vai ao banco só com dígitos, SEM DDI 55
 * (clínica não é alvo de WhatsApp).
 */
export const clinicaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da clínica."),
  cnpj: schemaCNPJOpcional,
  telefone: schemaTelefoneOpcional,
  endereco: z.string().trim(),
});

export type ClinicaFormValores = z.infer<typeof clinicaSchema>;
