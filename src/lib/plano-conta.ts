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

interface Definicao {
  nome: string;
  /** Frase curta para a tela de planos e para o cadeado. */
  resumo: string;
  /** Teto de usuários. `null` = sem teto. */
  usuarios: number | null;
  recursos: Recurso[];
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
  },

  essencial: {
    nome: "Essencial",
    resumo: "O dia a dia da clínica: agenda, prontuário, estoque e caixa.",
    usuarios: 2,
    recursos: [],
  },

  profissional: {
    nome: "Profissional",
    resumo: "Para a clínica que interna, paga comissão e vende planos.",
    usuarios: 5,
    recursos: ["internacao", "comissoes", "planos_de_saude", "relatorios_avancados"],
  },

  completo: {
    nome: "Completo",
    resumo: "Tudo, com WhatsApp, inteligência artificial e nota fiscal.",
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
