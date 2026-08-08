/**
 * O plano que a CLÍNICA paga ao VetHub.
 *
 * ATENÇÃO AO NOME. O sistema tem dois "planos" e eles não têm nada a ver um
 * com o outro:
 *
 *   * `/planos` e a tabela `plano`  → plano de SAÚDE que a clínica VENDE ao
 *                                      tutor (tem tutor_id, pet_id, cota de
 *                                      consultas);
 *   * este arquivo                  → o que a clínica PAGA para usar o
 *                                      VetHub. Sempre chamado de "plano da
 *                                      conta".
 *
 * ------------------------------------------------------------------
 * ESTE É O ÚNICO LUGAR onde se decide o que cada plano inclui.
 * ------------------------------------------------------------------
 *
 * Nenhuma tela deve perguntar "o plano é completo?". Ela pergunta "esta
 * conta tem o recurso `internacao`?" — assim, mudar a política comercial é
 * mexer numa linha daqui, e não caçar condição espalhada por 76 telas.
 */

export const PLANOS = ["trial", "essencial", "profissional", "completo"] as const;
export type PlanoConta = (typeof PLANOS)[number];

/**
 * Cada recurso que um plano pode ou não liberar.
 *
 * A lista é curta de propósito: só entra aqui o que REALMENTE separa um
 * plano do outro. Agenda, prontuário, tutores, estoque, PDV e financeiro não
 * estão na lista porque existem em todos os planos — um sistema de gestão
 * sem eles não é um sistema de gestão, é uma demonstração.
 */
export type Recurso =
  | "internacao"
  | "comissoes"
  | "planos_de_saude"
  | "relatorios_avancados"
  | "multi_unidade"
  | "whatsapp"
  | "ia"
  | "fiscal";

/**
 * De quanto em quanto tempo a clínica paga.
 *
 * O desconto não sai do nosso bolso: o preço de 12 meses é o que ganha a
 * comparação com SimplesVet, Vetsoft e Vetus, então ELE é o preço de
 * verdade. Os ciclos curtos é que custam mais caro — quem não quer se
 * comprometer paga pela flexibilidade.
 */
export const CICLOS = ["mensal", "semestral", "anual"] as const;
export type Ciclo = (typeof CICLOS)[number];

export const SOBRE_CICLO: Record<
  Ciclo,
  { nome: string; meses: number; descontoRotulo: string }
> = {
  mensal: { nome: "1 mês", meses: 1, descontoRotulo: "" },
  semestral: { nome: "6 meses", meses: 6, descontoRotulo: "10% de desconto" },
  anual: { nome: "12 meses", meses: 12, descontoRotulo: "20% de desconto" },
};

interface Definicao {
  nome: string;
  /** Frase curta para a tela de planos e para o cadeado. */
  resumo: string;
  /** Teto de usuários. `null` = sem teto. */
  usuarios: number | null;
  recursos: Recurso[];
  /**
   * Quanto custa POR MÊS em cada ciclo, em reais.
   *
   * Os degraus são parelhos de propósito — 10 pontos do mensal para o
   * semestral, 10 do semestral para o anual. Um degrau que encolhe (10 e
   * depois 5) pune quem se compromete mais, e o plano do meio deixa de ter
   * razão de existir.
   *
   * `null` = plano que não se vende (o teste gratuito).
   */
  preco: Record<Ciclo, number> | null;
}

/**
 * O que cada plano inclui.
 *
 * A divisão segue o que o mercado já cobra à parte (ver
 * docs/concorrentes/mercado.md): internação, nota fiscal, WhatsApp, IA e
 * multi-unidade são vendidos como adicional por SimplesVet, Vetsoft, Vetus e
 * Vetwork. Ou seja, são os separadores que o veterinário já reconhece como
 * "coisa de plano melhor" — não foi preciso inventar nenhum.
 *
 * WhatsApp, IA e fiscal ainda não existem no sistema. Estão aqui porque a
 * ESTRUTURA precisa saber deles desde já; quando cada um ficar pronto, ele
 * já nasce no plano certo sem mexer em mais nada.
 */
export const DEFINICAO: Record<PlanoConta, Definicao> = {
  // O teste é generoso de propósito: quem está avaliando precisa ver tudo
  // funcionando, senão decide sem conhecer o que está comprando.
  trial: {
    nome: "Teste gratuito",
    resumo: "14 dias com tudo liberado, para conhecer o sistema inteiro.",
    usuarios: 3,
    recursos: [
      "internacao",
      "comissoes",
      "planos_de_saude",
      "relatorios_avancados",
      "multi_unidade",
      "whatsapp",
      "ia",
      "fiscal",
    ],
    preco: null,
  },

  // Três usuários, e não dois: dois é exatamente onde o Vetus (R$ 229,89)
  // machuca o cliente dele. Copiar a fraqueza do concorrente e ainda cobrar
  // por ela seria o pior dos dois mundos. A R$ 149 por 3, o custo por
  // usuário fica em R$ 49,67 contra R$ 114,95 do Vetus e R$ 87 do Vetsoft —
  // e é esse número, não o preço cheio, que ganha a comparação.
  essencial: {
    nome: "Essencial",
    resumo: "O dia a dia da clínica: agenda, prontuário, estoque e caixa.",
    usuarios: 3,
    recursos: [],
    preco: { mensal: 189, semestral: 169, anual: 149 },
  },

  // O plano que precisa vender. A nota fiscal está AQUI, e não só no
  // Completo, porque fatiar internação e fiscal é justamente a pegadinha
  // que criticamos nos outros — e é o que sustenta a comparação que ganha a
  // venda: a mesma clínica paga R$ 648 na SimplesVet, R$ 509 no Vetsoft e
  // R$ 449,80 na Vetwork somando os módulos.
  profissional: {
    nome: "Profissional",
    resumo: "Para a clínica que interna, emite nota e paga comissão.",
    usuarios: 8,
    recursos: [
      "internacao",
      "comissoes",
      "planos_de_saude",
      "relatorios_avancados",
      "fiscal",
    ],
    preco: { mensal: 419, semestral: 379, anual: 329 },
  },

  // Guarda o que é diferença real de porte (várias unidades) e o que tem
  // custo variável de verdade (IA e WhatsApp saem em dólar, por consulta e
  // por mensagem).
  completo: {
    nome: "Completo",
    resumo: "Tudo, com várias unidades, WhatsApp e inteligência artificial.",
    usuarios: null,
    recursos: [
      "internacao",
      "comissoes",
      "planos_de_saude",
      "relatorios_avancados",
      "multi_unidade",
      "whatsapp",
      "ia",
      "fiscal",
    ],
    preco: { mensal: 879, semestral: 789, anual: 699 },
  },
};

/**
 * O texto que a pessoa lê quando esbarra num recurso bloqueado.
 *
 * Vende o recurso em vez de anunciar a falta dele: quem chegou ali estava
 * procurando aquilo, então é o melhor momento que existe para explicar o que
 * ele faz.
 */
export const SOBRE_RECURSO: Record<Recurso, { nome: string; explicacao: string }> = {
  internacao: {
    nome: "Internação",
    explicacao:
      "Acompanhe o pet internado com evolução, sinais vitais e prescrição, e cobre a diária na alta sem redigitar nada.",
  },
  comissoes: {
    nome: "Comissões",
    explicacao:
      "Apure quanto cada veterinário e cada tosador têm a receber, direto das vendas, sem planilha paralela.",
  },
  planos_de_saude: {
    nome: "Planos e assinaturas",
    explicacao:
      "Venda plano mensal para os tutores e receba sozinho todo mês: a cobrança nasce na data certa e entra no financeiro.",
  },
  relatorios_avancados: {
    nome: "Relatórios completos",
    explicacao:
      "Faturamento, clientes, insumos e vacinas a vencer — para saber o que dá lucro e quem parou de aparecer.",
  },
  multi_unidade: {
    nome: "Várias unidades",
    explicacao:
      "Mais de um endereço na mesma conta, cada um com seu estoque, seu caixa e sua agenda, e a visão do conjunto.",
  },
  whatsapp: {
    nome: "WhatsApp",
    explicacao:
      "Confirmação de horário e lembrete de vacina saindo sozinhos, no WhatsApp oficial, sem ninguém digitar mensagem.",
  },
  ia: {
    nome: "Inteligência artificial",
    explicacao:
      "Grave a consulta e receba o prontuário escrito, com resumo do histórico do pet antes do atendimento.",
  },
  fiscal: {
    nome: "Nota fiscal",
    explicacao: "Emita NFS-e e NFC-e direto da venda, sem passar por outro sistema.",
  },
};

/** A conta tem este recurso? */
export function temRecurso(plano: string | null | undefined, recurso: Recurso): boolean {
  const def = DEFINICAO[(plano ?? "trial") as PlanoConta] ?? DEFINICAO.trial;
  return def.recursos.includes(recurso);
}

/** Quantos usuários esta conta pode ter. `limite` negociado ganha do plano. */
export function tetoDeUsuarios(
  plano: string | null | undefined,
  limiteNegociado?: number | null
): number | null {
  if (limiteNegociado != null) return limiteNegociado;
  const def = DEFINICAO[(plano ?? "trial") as PlanoConta] ?? DEFINICAO.trial;
  return def.usuarios;
}

/** "R$ 1.234" — preço sem centavos, que é como todos os planos são cotados. */
export function reais(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Quanto a clínica deixa de gastar no ano ao escolher este ciclo.
 *
 * É o número que vai grande no site: "economize R$ 1.080 por ano" convence
 * mais que "20% de desconto", porque 20% de um valor que a pessoa ainda não
 * decorou não quer dizer nada.
 */
export function economiaAnual(plano: PlanoConta, ciclo: Ciclo): number {
  const preco = DEFINICAO[plano].preco;
  if (!preco) return 0;
  return (preco.mensal - preco[ciclo]) * 12;
}

/** O primeiro plano que inclui o recurso — é o que a tela de upgrade oferece. */
export function planoQueInclui(recurso: Recurso): PlanoConta {
  const ordem: PlanoConta[] = ["essencial", "profissional", "completo"];
  return ordem.find((p) => DEFINICAO[p].recursos.includes(recurso)) ?? "completo";
}

/**
 * O teste acabou?
 *
 * Sem data marcada, o teste continua valendo: é o caso de uma clínica criada
 * antes desta regra existir, e travar o sistema dela por causa de um campo
 * vazio seria o pior jeito possível de introduzir cobrança.
 */
export function trialExpirou(
  plano: string | null | undefined,
  termina: string | null | undefined,
  hoje: string
): boolean {
  return plano === "trial" && !!termina && termina < hoje;
}
