import { z } from "zod";
import {
  camposEndereco,
  enderecoDoBanco,
  enderecoParaBanco,
  mascaraCNPJ,
  mascaraTelefone,
  schemaCNPJOpcional,
  schemaEmailOpcional,
  schemaTelefoneOpcional,
  soDigitos,
  telefoneDoBanco,
  telefoneParaBanco,
} from "@/lib/validacao";
import type { Fornecedor } from "@/lib/types";

/**
 * Validação do cadastro de fornecedor. O MESMO schema roda no formulário
 * (react-hook-form) e na server action. O servidor nunca confia no front.
 */
export const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor."),
  razao_social: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  cnpj: schemaCNPJOpcional,
  telefone: schemaTelefoneOpcional,
  email: schemaEmailOpcional,
  contato: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  ...camposEndereco,
  observacao: z.string().trim().max(500, "Use no máximo 500 caracteres."),
  ativo: z.boolean(),
});

export type FornecedorFormValores = z.infer<typeof fornecedorSchema>;

/** Valores validados → formato do banco ('' vira null, telefone com DDI 55). */
export function fornecedorParaBanco(v: FornecedorFormValores) {
  return {
    nome: v.nome.trim(),
    razao_social: v.razao_social.trim() || null,
    cnpj: soDigitos(v.cnpj) || null,
    telefone: telefoneParaBanco(v.telefone) || null,
    email: v.email.trim().toLowerCase() || null,
    contato: v.contato.trim() || null,
    ...enderecoParaBanco(v),
    observacao: v.observacao.trim() || null,
    ativo: v.ativo,
  };
}

/** Lê o formulário de um FormData (client e server usam o mesmo mapa). */
export function fornecedorDoFormData(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    razao_social: String(formData.get("razao_social") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    email: String(formData.get("email") ?? ""),
    contato: String(formData.get("contato") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
    ativo: formData.get("ativo") === "on",
  };
}

/** defaultValues do formulário a partir de um registro do banco. */
export function fornecedorParaForm(
  fornecedor?: Fornecedor | null
): FornecedorFormValores {
  return {
    nome: fornecedor?.nome ?? "",
    razao_social: fornecedor?.razao_social ?? "",
    cnpj: mascaraCNPJ(fornecedor?.cnpj ?? ""),
    telefone: mascaraTelefone(telefoneDoBanco(fornecedor?.telefone)),
    email: fornecedor?.email ?? "",
    contato: fornecedor?.contato ?? "",
    ...enderecoDoBanco(fornecedor ?? {}),
    observacao: fornecedor?.observacao ?? "",
    ativo: fornecedor?.ativo ?? true,
  };
}

/** CNPJ do banco (só dígitos) já formatado para exibir. */
export function formatCNPJ(cnpj: string | null | undefined): string {
  const d = soDigitos(cnpj);
  return d.length === 14 ? mascaraCNPJ(d) : d || "—";
}
