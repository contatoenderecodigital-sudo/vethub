// Tipos de domínio da Fase 1 (espelham as tabelas do Supabase)

export type Papel = "admin" | "veterinario" | "recepcao";

export type AgendamentoTipo = "consulta" | "retorno" | "banho_tosa" | "cirurgia";

export type AgendamentoStatus =
  | "agendado"
  | "check_in"
  | "atendido"
  | "pronto"
  | "check_out"
  | "cancelado";

export type LancamentoTipo = "debito" | "credito";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "debito"
  | "credito"
  | "transferencia"
  | "boleto";

export type OrcamentoStatus = "aberto" | "aprovado" | "recusado";

export type AnexoTipo = "foto" | "pdf" | "exame";

export type Sexo = "macho" | "femea";

export type Porte = "mini" | "pequeno" | "medio" | "grande" | "gigante";

export type TipoProtocolo = "vacina" | "vermifugo" | "antiparasitario";

export interface Endereco {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export interface Clinica extends Endereco {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  plano: string;
  config: Record<string, unknown>;
}

export interface Usuario {
  id: string;
  clinica_id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export interface Tutor extends Endereco {
  id: string;
  clinica_id: string;
  nome: string;
  cpf: string | null;
  telefone: string;
  email: string | null;
  consentimento_lgpd: boolean;
  foto_url: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  clinica_id: string;
  tutor_id: string;
  nome: string;
  especie: string;
  raca: string | null;
  sexo: Sexo | null;
  data_nascimento: string | null;
  peso: number | null;
  castrado: boolean;
  observacoes: string | null;
  foto_url: string | null;
  microchip: string | null;
  pelagem: string | null;
  porte: Porte | null;
  falecido: boolean;
  alergias: string | null;
  etiquetas: string[];
  created_at: string;
  tutor?: Pick<Tutor, "id" | "nome" | "telefone">;
}

/** Uma pesagem do histórico. Um trigger sincroniza pet.peso com a mais recente. */
export interface Pesagem {
  id: string;
  clinica_id: string;
  pet_id: string;
  peso: number;
  data: string;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
}

/** Vacina, vermífugo ou antiparasitário aplicado, com controle de reforço. */
export interface ProtocoloSaude {
  id: string;
  clinica_id: string;
  pet_id: string;
  tipo: TipoProtocolo;
  nome: string;
  lote: string | null;
  fabricante: string | null;
  data_aplicacao: string;
  proxima_dose: string | null;
  dose: string | null;
  veterinario_id: string | null;
  observacao: string | null;
  created_at: string;
  veterinario?: Pick<Usuario, "id" | "nome"> | null;
}

export interface Agendamento {
  id: string;
  clinica_id: string;
  pet_id: string;
  veterinario_id: string | null;
  data_hora: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  observacoes: string | null;
  pet?: Pet;
  veterinario?: Pick<Usuario, "id" | "nome">;
}

export interface Consulta {
  id: string;
  clinica_id: string;
  pet_id: string;
  veterinario_id: string | null;
  agendamento_id: string | null;
  data: string;
  queixa: string | null;
  anamnese: string | null;
  exame_fisico: string | null;
  diagnostico: string | null;
  conduta: string | null;
  observacoes: string | null;
  pet?: Pet;
  veterinario?: Pick<Usuario, "id" | "nome">;
}

export interface Anexo {
  id: string;
  clinica_id: string;
  consulta_id: string;
  tipo: AnexoTipo;
  url: string;
  nome_arquivo: string | null;
  created_at: string;
}

export interface Orcamento {
  id: string;
  clinica_id: string;
  pet_id: string;
  consulta_id: string | null;
  status: OrcamentoStatus;
  valor_total: number;
  created_at: string;
  pet?: Pet;
  itens?: OrcamentoItem[];
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

/**
 * Lançamento no extrato financeiro do tutor.
 * `debito` = o tutor passou a dever; `credito` = pagamento/adiantamento.
 * O saldo é crédito menos débito (negativo = tutor deve para a clínica).
 */
export interface LancamentoFinanceiro {
  id: string;
  clinica_id: string;
  tutor_id: string;
  tipo: LancamentoTipo;
  valor: number;
  descricao: string;
  orcamento_id: string | null;
  consulta_id: string | null;
  forma_pagamento: string | null;
  data: string;
  registrado_por: string | null;
  created_at: string;
}

// Opções fixas para selects
export const ESPECIES = [
  "Cachorro",
  "Gato",
  "Ave",
  "Réptil",
  "Roedor",
  "Coelho",
  "Outro",
] as const;

export const TIPOS_AGENDAMENTO: { valor: AgendamentoTipo; rotulo: string }[] = [
  { valor: "consulta", rotulo: "Consulta" },
  { valor: "retorno", rotulo: "Retorno" },
  { valor: "banho_tosa", rotulo: "Banho e tosa" },
  { valor: "cirurgia", rotulo: "Cirurgia" },
];

export const PORTES: { valor: Porte; rotulo: string }[] = [
  { valor: "mini", rotulo: "Mini" },
  { valor: "pequeno", rotulo: "Pequeno" },
  { valor: "medio", rotulo: "Médio" },
  { valor: "grande", rotulo: "Grande" },
  { valor: "gigante", rotulo: "Gigante" },
];

/** Abas de protocolos de saúde: singular para o form, plural para os filtros. */
export const TIPOS_PROTOCOLO: {
  valor: TipoProtocolo;
  rotulo: string;
  plural: string;
}[] = [
  { valor: "vacina", rotulo: "Vacina", plural: "Vacinas" },
  { valor: "vermifugo", rotulo: "Vermífugo", plural: "Vermífugos" },
  {
    valor: "antiparasitario",
    rotulo: "Antiparasitário",
    plural: "Antiparasitários",
  },
];

export const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "admin", rotulo: "Administrador" },
  { valor: "veterinario", rotulo: "Veterinário" },
  { valor: "recepcao", rotulo: "Recepção" },
];

/** Status do agendamento na ordem do fluxo real de atendimento. */
export const STATUS_AGENDAMENTO_ORDEM: AgendamentoStatus[] = [
  "agendado",
  "check_in",
  "atendido",
  "pronto",
  "check_out",
  "cancelado",
];

export const TIPOS_LANCAMENTO: { valor: LancamentoTipo; rotulo: string }[] = [
  { valor: "debito", rotulo: "Débito (o tutor passou a dever)" },
  { valor: "credito", rotulo: "Crédito (pagamento/adiantamento)" },
];

export const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "debito", rotulo: "Cartão de débito" },
  { valor: "credito", rotulo: "Cartão de crédito" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "boleto", rotulo: "Boleto" },
];

/** Rótulo da forma de pagamento (valor livre no banco → cai no próprio texto). */
export function rotuloFormaPagamento(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return FORMAS_PAGAMENTO.find((f) => f.valor === valor)?.rotulo ?? valor;
}
