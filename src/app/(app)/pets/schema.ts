import { z } from "zod";
import {
  dataCalendarioValida,
  hojeISOValidacao,
  schemaDataNascimentoOpcional,
  schemaNome,
} from "@/lib/validacao";

/**
 * Validação do formulário de pet, compartilhada entre o client
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

const pesoNoIntervalo = (v: string) => {
  const n = pesoParaNumero(v);
  return n !== null && n >= 0.05 && n <= 500;
};

const pesoValido = (v: string) => !v.trim() || pesoNoIntervalo(v); // opcional

export const petSchema = z.object({
  tutor_id: z.string().min(1, "Selecione o tutor."),
  nome: schemaNome,
  especie: z.string().min(1, "Selecione a espécie."),
  raca: z.string(),
  sexo: z.enum(["", "macho", "femea"]),
  porte: z.enum(["", "mini", "pequeno", "medio", "grande", "gigante"]),
  pelagem: z.string().max(60, "Pelagem longa demais."),
  microchip: z.string().max(30, "Microchip longo demais."),
  data_nascimento: schemaDataNascimentoOpcional,
  peso: z.string().refine(pesoValido, "Peso inválido."),
  castrado: z.boolean(),
  falecido: z.boolean(),
  alergias: z.string().max(500, "Texto longo demais."),
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
    porte: valores.porte === "" ? null : valores.porte,
    pelagem: valores.pelagem.trim() || null,
    microchip: valores.microchip.trim() || null,
    data_nascimento: valores.data_nascimento || null,
    peso: pesoParaNumero(valores.peso),
    castrado: valores.castrado,
    falecido: valores.falecido,
    alergias: valores.alergias.trim() || null,
    observacoes: valores.observacoes.trim() || null,
  };
}

// ------------------------------------------------------------------
// Pesagem e protocolos de saúde (registrados na ficha do pet)
// ------------------------------------------------------------------

/** Data de um fato já ocorrido: obrigatória, real e nunca no futuro. */
const schemaDataPassada = z
  .string()
  .min(1, "Informe a data.")
  .refine(dataCalendarioValida, "Data inválida.")
  .refine((v) => !dataCalendarioValida(v) || v >= "1980-01-01", "Data antiga demais.")
  .refine(
    (v) => !dataCalendarioValida(v) || v <= hojeISOValidacao(),
    "A data não pode estar no futuro."
  );

/** Data futura opcional (reforço/próxima dose): até 10 anos à frente. */
const schemaDataFuturaOpcional = z
  .string()
  .refine((v) => v === "" || dataCalendarioValida(v), "Data inválida.")
  .refine((v) => {
    if (v === "" || !dataCalendarioValida(v)) return true;
    return v <= `${new Date().getFullYear() + 10}-12-31`;
  }, "Data longe demais no futuro.");

export const pesagemSchema = z.object({
  peso: z
    .string()
    .min(1, "Informe o peso.")
    .refine(pesoNoIntervalo, "Peso inválido. Use de 0,05 a 500 kg."),
  data: schemaDataPassada,
  observacao: z.string().max(200, "Observação longa demais."),
});
export type PesagemFormValores = z.infer<typeof pesagemSchema>;

export const protocoloSchema = z
  .object({
    tipo: z.enum(["vacina", "vermifugo", "antiparasitario"], {
      message: "Selecione o tipo.",
    }),
    nome: z.string().trim().min(2, "Informe o nome do produto."),
    dose: z.string().max(40, "Dose longa demais."),
    lote: z.string().max(40, "Lote longo demais."),
    fabricante: z.string().max(60, "Fabricante longo demais."),
    data_aplicacao: schemaDataPassada,
    proxima_dose: schemaDataFuturaOpcional,
    observacao: z.string().max(500, "Observação longa demais."),
  })
  .refine(
    (v) =>
      v.proxima_dose === "" ||
      !dataCalendarioValida(v.proxima_dose) ||
      !dataCalendarioValida(v.data_aplicacao) ||
      v.proxima_dose >= v.data_aplicacao,
    {
      message: "A próxima dose não pode ser antes da aplicação.",
      path: ["proxima_dose"],
    }
  );
export type ProtocoloFormValores = z.infer<typeof protocoloSchema>;
