import { z } from "zod";

/**
 * Validação e máscaras dos formulários do VetHub.
 * Regra de ouro: o front bloqueia/avisa cedo, MAS o servidor revalida
 * tudo com os mesmos schemas, nunca confiar só no front.
 */

export const soDigitos = (v: string | null | undefined) =>
  (v ?? "").replace(/\D/g, "");

// ------------------------------------------------------------------
// Máscaras (aplicadas no onChange, já cortam no limite de dígitos,
// bloqueando a digitação além do permitido)
// ------------------------------------------------------------------

/** 000.000.000-00 (máx. 11 dígitos) */
export function mascaraCPF(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  let r = d.slice(0, 3);
  if (d.length > 3) r += "." + d.slice(3, 6);
  if (d.length > 6) r += "." + d.slice(6, 9);
  if (d.length > 9) r += "-" + d.slice(9);
  return r;
}

/** (00) 00000-0000 celular / (00) 0000-0000 fixo (máx. 11 dígitos) */
export function mascaraTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length === 0) return "";
  let r = "(" + d.slice(0, 2);
  if (d.length > 2) r += ") ";
  const resto = d.slice(2);
  if (resto.length <= 4) r += resto;
  else if (resto.length <= 8) r += resto.slice(0, 4) + "-" + resto.slice(4);
  else r += resto.slice(0, 5) + "-" + resto.slice(5); // 9 dígitos = celular
  return r;
}

/** 00000-000 (máx. 8 dígitos) */
export function mascaraCEP(v: string): string {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** 00.000.000/0000-00 (máx. 14 dígitos) */
export function mascaraCNPJ(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  let r = d.slice(0, 2);
  if (d.length > 2) r += "." + d.slice(2, 5);
  if (d.length > 5) r += "." + d.slice(5, 8);
  if (d.length > 8) r += "/" + d.slice(8, 12);
  if (d.length > 12) r += "-" + d.slice(12);
  return r;
}

// ------------------------------------------------------------------
// Validadores
// ------------------------------------------------------------------

/** Valida CPF: 11 dígitos, dígitos verificadores e rejeita sequências repetidas. */
export function validarCPF(cpf: string): boolean {
  const d = soDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // 000…, 111…, etc.

  const dv = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Valida CNPJ: 14 dígitos, dígitos verificadores e rejeita sequências repetidas. */
export function validarCNPJ(cnpj: string): boolean {
  const d = soDigitos(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const dv = (tamanho: number) => {
    const pesos =
      tamanho === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailValido = (v: string) => RE_EMAIL.test(v);

// ------------------------------------------------------------------
// Datas: o input nativo deixa digitar ano absurdo (ex.: 20100).
// Validação central: formato YYYY-MM-DD, data real de calendário e
// intervalo sensato. Comparações sempre depois do regex (comparação
// de texto com ano de 5 dígitos engana).
// ------------------------------------------------------------------

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Data real de calendário no formato YYYY-MM-DD (rejeita 2026-02-31). */
export function dataCalendarioValida(v: string): boolean {
  if (!RE_DATA.test(v)) return false;
  const [ano, mes, dia] = v.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    d.getUTCFullYear() === ano &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

/** Hoje (America/Sao_Paulo) em YYYY-MM-DD, para limites de inputs. */
export function hojeISOValidacao(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Nascimento (pet/pessoa): opcional; se preenchido, data real entre 1980 e hoje. */
export const schemaDataNascimentoOpcional = z
  .string()
  .refine((v) => v === "" || dataCalendarioValida(v), "Data inválida.")
  .refine(
    (v) => v === "" || (dataCalendarioValida(v) && v >= "1980-01-01"),
    "Data antiga demais."
  )
  .refine(
    (v) => v === "" || (dataCalendarioValida(v) && v <= hojeISOValidacao()),
    "A data não pode estar no futuro."
  );

/** Data de agendamento/filtros: obrigatória, real, entre 2020 e daqui a 5 anos. */
export function schemaDataAgendamento() {
  const limite = `${new Date().getFullYear() + 5}-12-31`;
  return z
    .string()
    .min(1, "Informe a data.")
    .refine(dataCalendarioValida, "Data inválida.")
    .refine((v) => !dataCalendarioValida(v) || v >= "2020-01-01", "Data inválida.")
    .refine(
      (v) => !dataCalendarioValida(v) || v <= limite,
      "Data longe demais no futuro."
    );
}

/** Sanitiza um parâmetro de data vindo da URL: inválido → fallback. */
export function dataParamOuHoje(v: string | undefined): string {
  return v && dataCalendarioValida(v) ? v : hojeISOValidacao();
}

// ------------------------------------------------------------------
// Telefone no banco: só dígitos, com DDI 55 (pronto para WhatsApp)
// ------------------------------------------------------------------

/** "(11) 99999-0000" → "5511999990000" */
export function telefoneParaBanco(v: string): string {
  const d = soDigitos(v);
  if (!d) return "";
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

/** "5511999990000" → "11999990000" (para exibir/editar) */
export function telefoneDoBanco(v: string | null | undefined): string {
  const d = soDigitos(v);
  return (d.length === 12 || d.length === 13) && d.startsWith("55")
    ? d.slice(2)
    : d;
}

// ------------------------------------------------------------------
// Blocos reutilizáveis de schema
// ------------------------------------------------------------------

/**
 * Nome de pessoa: sempre sem espaços nas pontas (o `.trim()` vale também no
 * servidor, o banco nunca recebe " Ana ") e com teto de tamanho, para não
 * gravar um texto colado sem querer.
 */
export const schemaNome = z
  .string()
  .trim()
  .min(2, "Informe o nome completo.")
  .max(120, "Nome longo demais.");

export const schemaTelefoneObrigatorio = z
  .string()
  .refine(
    (v) => [10, 11].includes(soDigitos(v).length),
    "Telefone incompleto. Informe DDD e número."
  );

export const schemaTelefoneOpcional = z
  .string()
  .refine(
    (v) => soDigitos(v).length === 0 || [10, 11].includes(soDigitos(v).length),
    "Telefone incompleto. Informe DDD e número."
  );

export const schemaCPFOpcional = z
  .string()
  .refine((v) => soDigitos(v).length === 0 || validarCPF(v), "CPF inválido.");

export const schemaCNPJOpcional = z
  .string()
  .refine((v) => soDigitos(v).length === 0 || validarCNPJ(v), "CNPJ inválido.");

export const schemaEmailObrigatorio = z
  .string()
  .trim()
  .max(150, "E-mail longo demais.")
  .refine((v) => emailValido(v), "E-mail inválido.");

export const schemaEmailOpcional = z
  .string()
  .trim()
  .max(150, "E-mail longo demais.")
  .refine((v) => v === "" || emailValido(v), "E-mail inválido.");

export const schemaSenhaForte = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres.")
  .refine((v) => /[a-zA-Z]/.test(v), "A senha precisa conter letras.")
  .refine((v) => /[0-9]/.test(v), "A senha precisa conter números.");

// ------------------------------------------------------------------
// Endereço estruturado (CEP, rua, número…), compartilhado por
// tutor e clínica. Todos os campos são opcionais, mas CEP/UF
// preenchidos precisam ser válidos.
// ------------------------------------------------------------------

export const schemaCEPOpcional = z
  .string()
  .refine(
    (v) => soDigitos(v).length === 0 || soDigitos(v).length === 8,
    "CEP incompleto."
  );

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT",
  "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
  "RR", "SC", "SP", "SE", "TO",
] as const;

export const camposEndereco = {
  cep: schemaCEPOpcional,
  logradouro: z.string().trim().max(120, "Endereço longo demais."),
  numero: z.string().trim().max(20, "Número longo demais."),
  complemento: z.string().trim().max(60, "Complemento longo demais."),
  bairro: z.string().trim().max(60, "Bairro longo demais."),
  cidade: z.string().trim().max(60, "Cidade longa demais."),
  uf: z
    .string()
    .refine((v) => v === "" || (UFS as readonly string[]).includes(v), "UF inválida."),
};

export interface EnderecoValores {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Campos de endereço prontos para o banco ('' → null, CEP só dígitos). */
export function enderecoParaBanco(valores: EnderecoValores) {
  return {
    cep: soDigitos(valores.cep) || null,
    logradouro: valores.logradouro.trim() || null,
    numero: valores.numero.trim() || null,
    complemento: valores.complemento.trim() || null,
    bairro: valores.bairro.trim() || null,
    cidade: valores.cidade.trim() || null,
    uf: valores.uf || null,
  };
}

/** defaultValues de endereço a partir de um registro do banco. */
export function enderecoDoBanco(registro: {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}): EnderecoValores {
  return {
    cep: mascaraCEP(registro.cep ?? ""),
    logradouro: registro.logradouro ?? "",
    numero: registro.numero ?? "",
    complemento: registro.complemento ?? "",
    bairro: registro.bairro ?? "",
    cidade: registro.cidade ?? "",
    uf: registro.uf ?? "",
  };
}

// ------------------------------------------------------------------
// Schemas por formulário
// ------------------------------------------------------------------

export const tutorSchema = z.object({
  nome: schemaNome,
  telefone: schemaTelefoneObrigatorio,
  cpf: schemaCPFOpcional,
  email: schemaEmailOpcional,
  ...camposEndereco,
  consentimento_lgpd: z.boolean(),
});
export type TutorFormValores = z.infer<typeof tutorSchema>;

/** Converte os valores validados do form de tutor para o formato do banco. */
export function tutorParaBanco(valores: TutorFormValores) {
  return {
    nome: valores.nome.trim(),
    telefone: telefoneParaBanco(valores.telefone),
    cpf: soDigitos(valores.cpf) || null,
    email: valores.email.trim().toLowerCase() || null,
    ...enderecoParaBanco(valores),
    consentimento_lgpd: valores.consentimento_lgpd,
  };
}
