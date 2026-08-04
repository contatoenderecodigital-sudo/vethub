import { z } from "zod";
import { hojeISO } from "@/lib/format";
import { schemaNome } from "@/lib/validacao";

/**
 * Validação do formulário de pet — compartilhada entre o client
 * (react-hook-form) e a server action (safeParse). Nunca confiar só no front.
 */

/** Mantém apenas dígitos, vírgula e ponto no peso (aplicada no onChange). */
export function sanitizarPeso(v: string): string {
  return v.replace(/[^\d.,]/g, "").slice(0, 6);
}

/** "4,5" → 4.5; vazio/ilegível → null. */
export function pesoParaNumero(v: string): number | null {
  const texto = v.trim().replace(",", ".");
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

const pesoValido = (v: string) => {
  if (!v.trim()) return true; // opcional
  const n = pesoParaNumero(v);
  return n !== null && n >= 0.05 && n <= 500;
};

export const petSchema = z.object({
  tutor_id: z.string().min(1, "Selecione o tutor."),
  nome: schemaNome,
  especie: z.string().min(1, "Selecione a espécie."),
  raca: z.string(),
  sexo: z.enum(["", "macho", "femea"]),
  data_nascimento: z
    .string()
    .refine((v) => v === "" || v <= hojeISO(), "Data no futuro?"),
  peso: z.string().refine(pesoValido, "Peso inválido."),
  castrado: z.boolean(),
  observacoes: z.string(),
});
export type PetFormValores = z.infer<typeof petSchema>;

/** Converte os valores validados do form de pet para o formato do banco. */
export function petParaBanco(valores: PetFormValores) {
  return {
    tutor_id: valores.tutor_id,
    nome: valores.nome.trim(),
    especie: valores.especie,
    raca: valores.raca.trim() || null,
    sexo: valores.sexo === "" ? null : valores.sexo,
    data_nascimento: valores.data_nascimento || null,
    peso: pesoParaNumero(valores.peso),
    castrado: valores.castrado,
    observacoes: valores.observacoes.trim() || null,
  };
}
