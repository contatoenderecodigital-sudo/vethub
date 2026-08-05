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

export type ReceitaTipo = "simples" | "controlada" | "manipulada";

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

// ------------------------------------------------------------------
// Financeiro: contas a pagar / a receber e categorias
// ------------------------------------------------------------------

/** Conta a `receber` (entra dinheiro) ou a `pagar` (sai dinheiro). */
export type ContaTipo = "receber" | "pagar";

/** `parcial` = recebeu/pagou parte; `cancelada` some dos totais. */
export type ContaStatus = "aberta" | "paga" | "parcial" | "cancelada";

/** Categoria de `receita` casa com conta a receber; `despesa`, com a pagar. */
export type CategoriaTipo = "receita" | "despesa";

export interface CategoriaFinanceira {
  id: string;
  clinica_id: string;
  nome: string;
  tipo: CategoriaTipo;
  created_at: string;
}

export interface Conta {
  id: string;
  clinica_id: string;
  tipo: ContaTipo;
  descricao: string;
  categoria_id: string | null;
  tutor_id: string | null;
  venda_id: string | null;
  fornecedor: string | null;
  valor: number;
  valor_pago: number;
  vencimento: string;
  pagamento: string | null;
  forma_pagamento: string | null;
  status: ContaStatus;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  categoria?: Pick<CategoriaFinanceira, "id" | "nome" | "tipo"> | null;
  tutor?: Pick<Tutor, "id" | "nome"> | null;
}

export const ROTULO_STATUS_CONTA: Record<ContaStatus, string> = {
  aberta: "Em aberto",
  parcial: "Parcial",
  paga: "Paga",
  cancelada: "Cancelada",
};

export const TIPOS_CONTA: { valor: ContaTipo; rotulo: string }[] = [
  { valor: "receber", rotulo: "A receber (entrada)" },
  { valor: "pagar", rotulo: "A pagar (saída)" },
];

/** Qual família de categoria vale para cada tipo de conta. */
export const CATEGORIA_DO_TIPO: Record<ContaTipo, CategoriaTipo> = {
  receber: "receita",
  pagar: "despesa",
};

/** Saldo ainda em aberto de uma conta (nunca negativo). */
export function saldoDaConta(conta: {
  valor: number | string;
  valor_pago: number | string;
}): number {
  const saldo = Number(conta.valor) - Number(conta.valor_pago);
  return saldo > 0 ? Math.round(saldo * 100) / 100 : 0;
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

// ==================================================================
// PDV / vendas + caixa
// ==================================================================

export type CaixaStatus = "aberto" | "fechado";

export type VendaStatus = "aberta" | "paga" | "cancelada";

/**
 * No PDV existe uma forma a mais que no extrato: "fiado" (venda em aberto).
 * Ela vira débito no extrato do tutor + conta a receber, nunca dinheiro no caixa.
 */
export type FormaPagamentoVenda = FormaPagamento | "fiado";

export interface Caixa {
  id: string;
  clinica_id: string;
  aberto_por: string | null;
  fechado_por: string | null;
  abertura: string;
  fechamento: string | null;
  valor_abertura: number;
  valor_fechamento: number | null;
  observacao: string | null;
  status: CaixaStatus;
}

export interface Venda {
  id: string;
  clinica_id: string;
  caixa_id: string | null;
  tutor_id: string | null;
  pet_id: string | null;
  consulta_id: string | null;
  orcamento_id: string | null;
  numero: number;
  data: string;
  subtotal: number;
  desconto: number;
  valor_total: number;
  status: VendaStatus;
  vendedor_id: string | null;
  observacao: string | null;
  itens?: VendaItem[];
  pagamentos?: PagamentoVenda[];
}

export interface VendaItem {
  id: string;
  venda_id: string;
  item_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  profissional_id: string | null;
}

export interface PagamentoVenda {
  id: string;
  venda_id: string;
  forma: string;
  valor: number;
  parcelas: number;
  autorizacao: string | null;
}

/** Item do catálogo, na forma reduzida que o PDV usa para montar o carrinho. */
export interface ItemVenda {
  id: string;
  nome: string;
  preco_venda: number;
  controla_estoque: boolean;
  estoque_atual: number;
}

export const FORMAS_PAGAMENTO_VENDA: {
  valor: FormaPagamentoVenda;
  rotulo: string;
}[] = [
  ...FORMAS_PAGAMENTO,
  { valor: "fiado", rotulo: "Fiado (a receber)" },
];

/** Só o crédito é parcelado no PDV. */
export const FORMAS_PARCELAVEIS: FormaPagamentoVenda[] = ["credito"];

export const ROTULO_STATUS_VENDA: Record<VendaStatus, string> = {
  aberta: "Em aberto",
  paga: "Paga",
  cancelada: "Cancelada",
};

/** Rótulo da forma no PDV (inclui "fiado"; valor desconhecido cai no texto). */
export function rotuloFormaVenda(valor: string | null | undefined): string {
  if (!valor) return "—";
  return FORMAS_PAGAMENTO_VENDA.find((f) => f.valor === valor)?.rotulo ?? valor;
}

// ------------------------------------------------------------------
// Itens (catálogo) e estoque
// ------------------------------------------------------------------

/** Um item do catálogo é produto, serviço ou plano (mesma tabela, tipada). */
export type ItemTipo = "produto" | "servico" | "plano";

/** Um grupo/subgrupo pode servir a produtos, serviços ou aos dois. */
export type GrupoTipo = "produto" | "servico" | "ambos";

/** Entrada soma no estoque; saída, perda e ajuste subtraem. */
export type MovimentacaoTipo = "entrada" | "saida" | "ajuste" | "perda";

export interface Marca {
  id: string;
  clinica_id: string;
  nome: string;
  created_at: string;
}

export interface UnidadeMedida {
  id: string;
  clinica_id: string;
  nome: string;
  sigla: string;
  fracionavel: boolean;
  created_at: string;
}

/** Categoria do catálogo. Pai nulo = grupo; pai preenchido = subgrupo. */
export interface GrupoItem {
  id: string;
  clinica_id: string;
  nome: string;
  grupo_pai_id: string | null;
  tipo: GrupoTipo;
  created_at: string;
}

export interface Item {
  id: string;
  clinica_id: string;
  tipo: ItemTipo;
  nome: string;
  codigo: string | null;
  codigo_barras: string | null;
  descricao: string | null;
  grupo_id: string | null;
  marca_id: string | null;
  unidade_id: string | null;
  preco_venda: number;
  preco_custo: number;
  comissao_percentual: number | null;
  controla_estoque: boolean;
  /** Somente leitura: um trigger recalcula a cada movimentação. */
  estoque_atual: number;
  estoque_minimo: number;
  medicamento: boolean;
  principio_ativo: string | null;
  requer_receita: boolean;
  vacina: boolean;
  duracao_minutos: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  grupo?: Pick<GrupoItem, "id" | "nome"> | null;
  marca?: Pick<Marca, "id" | "nome"> | null;
  unidade?: Pick<UnidadeMedida, "id" | "nome" | "sigla"> | null;
}

/** Lote de um produto, com validade. A quantidade também vem do trigger. */
export interface Lote {
  id: string;
  clinica_id: string;
  item_id: string;
  codigo: string;
  validade: string | null;
  quantidade: number;
  created_at: string;
  item?: Pick<Item, "id" | "nome" | "codigo"> | null;
}

export interface MovimentacaoEstoque {
  id: string;
  clinica_id: string;
  item_id: string;
  lote_id: string | null;
  tipo: MovimentacaoTipo;
  quantidade: number;
  valor_unitario: number | null;
  motivo: string | null;
  origem: string | null;
  consulta_id: string | null;
  internacao_id: string | null;
  registrado_por: string | null;
  data: string;
  created_at: string;
}

/** Tipos oferecidos no cadastro (plano ganha tela própria mais adiante). */
export const TIPOS_ITEM: { valor: ItemTipo; rotulo: string; plural: string }[] = [
  { valor: "produto", rotulo: "Produto", plural: "Produtos" },
  { valor: "servico", rotulo: "Serviço", plural: "Serviços" },
];

export const ROTULO_TIPO_ITEM: Record<ItemTipo, string> = {
  produto: "Produto",
  servico: "Serviço",
  plano: "Plano",
};

export const TIPOS_GRUPO: { valor: GrupoTipo; rotulo: string }[] = [
  { valor: "produto", rotulo: "Produtos" },
  { valor: "servico", rotulo: "Serviços" },
  { valor: "ambos", rotulo: "Produtos e serviços" },
];

export const TIPOS_MOVIMENTACAO: {
  valor: MovimentacaoTipo;
  rotulo: string;
  dica: string;
}[] = [
  { valor: "entrada", rotulo: "Entrada", dica: "Compra, devolução, inventário para cima" },
  { valor: "saida", rotulo: "Saída", dica: "Uso no atendimento, venda" },
  { valor: "perda", rotulo: "Perda", dica: "Quebra, vencimento, extravio" },
  { valor: "ajuste", rotulo: "Ajuste", dica: "Correção do saldo para baixo" },
];

export const ROTULO_MOVIMENTACAO: Record<MovimentacaoTipo, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  perda: "Perda",
};

// ------------------------------------------------------------------
// Receituário
// ------------------------------------------------------------------

/** Cabeçalho da receita veterinária (tabela `receita`). */
export interface Receita {
  id: string;
  clinica_id: string;
  pet_id: string;
  consulta_id: string | null;
  veterinario_id: string | null;
  tipo: ReceitaTipo;
  /** Coluna `date`: sempre YYYY-MM-DD (formatar com formatDataISO). */
  data: string;
  orientacoes: string | null;
  retorno_em: string | null;
  created_at: string;
  pet?: Pet;
  veterinario?: Pick<Usuario, "id" | "nome">;
  itens?: ReceitaItem[];
}

/** Um medicamento prescrito dentro da receita (tabela `receita_item`). */
export interface ReceitaItem {
  id: string;
  receita_id: string;
  item_id: string | null;
  medicamento: string;
  concentracao: string | null;
  forma_farmaceutica: string | null;
  quantidade: string | null;
  posologia: string;
  via: string | null;
  observacao: string | null;
  ordem: number;
}

export const TIPOS_RECEITA: {
  valor: ReceitaTipo;
  rotulo: string;
  dica: string;
}[] = [
  { valor: "simples", rotulo: "Simples", dica: "Receita comum, via única" },
  {
    valor: "controlada",
    rotulo: "Controlada",
    dica: "Controle especial, impressa em duas vias",
  },
  { valor: "manipulada", rotulo: "Manipulada", dica: "Fórmula manipulada" },
];

export const ROTULO_TIPO_RECEITA: Record<ReceitaTipo, string> = {
  simples: "Simples",
  controlada: "Controlada",
  manipulada: "Manipulada",
};

/** Formas farmacêuticas oferecidas no editor de medicamentos. */
export const FORMAS_FARMACEUTICAS: { valor: string; rotulo: string }[] = [
  { valor: "comprimido", rotulo: "Comprimido" },
  { valor: "capsula", rotulo: "Cápsula" },
  { valor: "suspensao", rotulo: "Suspensão" },
  { valor: "solucao", rotulo: "Solução" },
  { valor: "pomada", rotulo: "Pomada" },
  { valor: "injetavel", rotulo: "Injetável" },
  { valor: "sache", rotulo: "Sachê" },
  { valor: "outro", rotulo: "Outro" },
];

/**
 * Vias de administração. `uso` é o cabeçalho clássico da receita impressa
 * ("Uso oral"), que agrupa os medicamentos da mesma via.
 */
export const VIAS_ADMINISTRACAO: {
  valor: string;
  rotulo: string;
  uso: string;
}[] = [
  { valor: "oral", rotulo: "Oral", uso: "Uso oral" },
  { valor: "topica", rotulo: "Tópica", uso: "Uso tópico" },
  { valor: "otologica", rotulo: "Otológica", uso: "Uso otológico" },
  { valor: "oftalmica", rotulo: "Oftálmica", uso: "Uso oftálmico" },
  { valor: "im", rotulo: "Intramuscular (IM)", uso: "Uso intramuscular" },
  { valor: "sc", rotulo: "Subcutânea (SC)", uso: "Uso subcutâneo" },
  { valor: "iv", rotulo: "Intravenosa (IV)", uso: "Uso intravenoso" },
  { valor: "retal", rotulo: "Retal", uso: "Uso retal" },
];

/** Rótulo da forma farmacêutica (valor livre no banco → cai no próprio texto). */
export function rotuloFormaFarmaceutica(
  valor: string | null | undefined
): string | null {
  if (!valor) return null;
  return FORMAS_FARMACEUTICAS.find((f) => f.valor === valor)?.rotulo ?? valor;
}

/** Rótulo curto da via ("Intramuscular (IM)"). */
export function rotuloVia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return VIAS_ADMINISTRACAO.find((v) => v.valor === valor)?.rotulo ?? valor;
}

/** Cabeçalho de uso da receita impressa ("Uso oral"). */
export function usoDaVia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return VIAS_ADMINISTRACAO.find((v) => v.valor === valor)?.uso ?? null;
}

// ------------------------------------------------------------------
// Fornecedores e compras (entrada de mercadoria)
// ------------------------------------------------------------------

export interface Fornecedor extends Endereco {
  id: string;
  clinica_id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  contato: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * `pendente` = nota lançada, mercadoria ainda não conferida.
 * `recebida` = deu entrada no estoque e gerou a conta a pagar.
 * `cancelada` = sai dos totais (se já recebida, o estoque é estornado).
 */
export type CompraStatus = "pendente" | "recebida" | "cancelada";

export interface Compra {
  id: string;
  clinica_id: string;
  fornecedor_id: string | null;
  numero_nota: string | null;
  /** Coluna `date`: sempre YYYY-MM-DD (formatar com formatDataISO). */
  data: string;
  /** Somente leitura: um trigger recalcula a partir dos itens + frete. */
  valor_total: number;
  frete: number;
  status: CompraStatus;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  fornecedor?: Pick<Fornecedor, "id" | "nome"> | null;
  itens?: CompraItem[];
}

export interface CompraItem {
  id: string;
  compra_id: string;
  item_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  lote: string | null;
  validade: string | null;
}

export const ROTULO_STATUS_COMPRA: Record<CompraStatus, string> = {
  pendente: "Pendente",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

// ------------------------------------------------------------------
// Comissões dos profissionais
// ------------------------------------------------------------------

export interface Comissao {
  id: string;
  clinica_id: string;
  profissional_id: string;
  venda_id: string | null;
  venda_item_id: string | null;
  consulta_id: string | null;
  descricao: string;
  base_calculo: number;
  percentual: number;
  valor: number;
  /** Coluna `date`: sempre YYYY-MM-DD. */
  data: string;
  pago: boolean;
  pago_em: string | null;
  created_at: string;
  profissional?: Pick<Usuario, "id" | "nome"> | null;
}

// ------------------------------------------------------------------
// Planos e assinaturas (receita recorrente)
// ------------------------------------------------------------------

/** `suspensa` pausa a cobrança sem perder o histórico; `cancelada` encerra. */
export type AssinaturaStatus = "ativa" | "suspensa" | "cancelada";

/**
 * Um benefício incluído no plano. `item_id` aponta para o serviço/produto
 * do catálogo (opcional: o benefício pode ser só texto livre).
 * `desconto_percentual` vale para o que passar da franquia do mês.
 */
export interface PlanoBeneficio {
  id: string;
  clinica_id: string;
  /** O item com tipo='plano' ao qual este benefício pertence. */
  plano_item_id: string;
  item_id: string | null;
  descricao: string;
  quantidade_mes: number;
  desconto_percentual: number | null;
  created_at: string;
  item?: Pick<Item, "id" | "nome" | "tipo"> | null;
}

/** A assinatura de um tutor (opcionalmente amarrada a um pet). */
export interface Assinatura {
  id: string;
  clinica_id: string;
  tutor_id: string;
  pet_id: string | null;
  plano_item_id: string;
  valor_mensal: number;
  /** Dia do mês da cobrança. O banco limita de 1 a 28. */
  dia_cobranca: number;
  inicio: string;
  fim: string | null;
  status: AssinaturaStatus;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  tutor?: Pick<Tutor, "id" | "nome"> | null;
  pet?: Pick<Pet, "id" | "nome"> | null;
  plano?: Pick<Item, "id" | "nome" | "preco_venda"> | null;
}

/** Um consumo de benefício ("Banho do Thor") dentro da assinatura. */
export interface UsoBeneficio {
  id: string;
  clinica_id: string;
  assinatura_id: string;
  beneficio_id: string | null;
  agendamento_id: string | null;
  descricao: string;
  data: string;
  created_at: string;
}

export const ROTULO_STATUS_ASSINATURA: Record<AssinaturaStatus, string> = {
  ativa: "Ativa",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

export const STATUS_ASSINATURA: {
  valor: AssinaturaStatus;
  rotulo: string;
}[] = [
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "suspensa", rotulo: "Suspensa" },
  { valor: "cancelada", rotulo: "Cancelada" },
];
