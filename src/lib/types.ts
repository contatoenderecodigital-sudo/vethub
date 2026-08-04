// Tipos de domínio da Fase 1 (espelham as tabelas do Supabase)

export type Papel = "admin" | "veterinario" | "recepcao";

export type AgendamentoTipo = "consulta" | "retorno" | "banho_tosa" | "cirurgia";

export type AgendamentoStatus =
  | "agendado"
  | "check_in"
  | "atendido"
  | "check_out"
  | "cancelado";

export type OrcamentoStatus = "aberto" | "aprovado" | "recusado";

export type AnexoTipo = "foto" | "pdf" | "exame";

export type Sexo = "macho" | "femea";

export interface Clinica {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
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

export interface Tutor {
  id: string;
  clinica_id: string;
  nome: string;
  cpf: string | null;
  telefone: string;
  email: string | null;
  endereco: string | null;
  consentimento_lgpd: boolean;
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
  created_at: string;
  tutor?: Pick<Tutor, "id" | "nome" | "telefone">;
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

export const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "admin", rotulo: "Administrador" },
  { valor: "veterinario", rotulo: "Veterinário" },
  { valor: "recepcao", rotulo: "Recepção" },
];
