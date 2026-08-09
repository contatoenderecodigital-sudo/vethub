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
  //
  // O WhatsApp também: lembrete de vacina e confirmação de horário saindo
  // sozinhos é a razão pela qual a clínica pequena troca de sistema, e
  // mensagem dentro da janela de 24 h não custa nada pela Meta. Trancar isso
  // no plano de R$ 699 seria esconder o melhor argumento de venda de quem
  // mais precisa dele. A IA fica no Completo, onde o custo é real e por
  // consulta.
  profissional: {
    nome: "Profissional",
    resumo: "Para a clínica que interna, emite nota e fala no WhatsApp.",
    usuarios: 8,
    recursos: [
      "internacao",
      "comissoes",
      "planos_de_saude",
      "relatorios_avancados",
      "fiscal",
      "whatsapp",
    ],
    preco: { mensal: 419, semestral: 379, anual: 329 },
  },

  // Guarda o que é diferença real de porte — usuários sem teto e várias
  // unidades — e a IA, cujo custo é por consulta gravada. O WhatsApp aparece
  // aqui com cota maior, não como exclusividade.
  completo: {
    nome: "Completo",
    resumo: "Tudo, com várias unidades, inteligência artificial e cotas maiores.",
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

// ==================================================================
// CONSUMO: cota inclusa, excedente e o que nunca pode parar
// ==================================================================
//
// Nota fiscal, WhatsApp e IA são os únicos recursos com custo por USO: cada
// nota, cada mensagem e cada consulta gravada saem dinheiro para nós. Os
// outros são software puro — depois de escritos, o milésimo cliente custa o
// mesmo que o primeiro.
//
// A regra que vale para os três: **vem incluso no plano, com cota**. O
// excedente é exceção, não é o modelo de cobrança. Fatura surpresa é o tema
// número 1 de reclamação do setor (ver docs/concorrentes/mercado.md), e um
// sistema mais barato que assusta na fatura é cancelado no segundo mês.
//
// E a unidade cobrada é sempre a coisa que a pessoa FEZ — nota, mensagem,
// consulta. Nunca token, nunca minuto de áudio, nunca requisição: token é
// como nós pagamos a OpenAI, não é como a clínica paga a gente. Converter é
// trabalho nosso.

export interface Cota {
  /** Quantas unidades já vêm no plano, por mês. */
  incluso: number;
  /** Palavra que a clínica lê na conta. Nunca um termo técnico. */
  unidade: string;
  /** Preço de cada unidade acima da cota, em reais. */
  excedente: number;
  /**
   * Pode ser interrompido quando estoura o teto?
   *
   * `false` para a nota fiscal, e isso não é generosidade: sem emitir nota a
   * clínica não vende legalmente. Ela não culparia o próprio descuido, ela
   * culparia o VetHub — com razão, porque o custo de uma nota é de centavos e
   * travar a operação inteira por causa disso seria desproporcional.
   */
  podeParar: boolean;
}

/**
 * Custo real por unidade, para não precificar no escuro (reais, 04/08/2026).
 *
 *   nota      R$ 0,10   Focus NFe, em pacote de volume (docs/fiscal.md)
 *   mensagem  R$ 0,0350 utility, tabela oficial da Meta em BRL
 *             R$ 0,3217 marketing — 9× mais cara, é ela que explode
 *   consulta  R$ 0,26 a R$ 1,30, dominado pela transcrição, não pelo texto
 *
 * O excedente cobrado abaixo fica acima disso de propósito: ele paga também
 * o suporte, que no fiscal é o campeão de chamado do setor.
 */
export const COTAS: Partial<Record<Recurso, Partial<Record<PlanoConta, Cota>>>> = {
  fiscal: {
    profissional: { incluso: 200, unidade: "notas", excedente: 0.25, podeParar: false },
    completo: { incluso: 800, unidade: "notas", excedente: 0.25, podeParar: false },
  },
  whatsapp: {
    profissional: { incluso: 500, unidade: "mensagens", excedente: 0.12, podeParar: true },
    completo: { incluso: 2000, unidade: "mensagens", excedente: 0.12, podeParar: true },
  },
  ia: {
    completo: { incluso: 150, unidade: "consultas gravadas", excedente: 1.9, podeParar: true },
  },
};

/**
 * Quanto de excedente uma conta pode acumular antes de precisar autorizar.
 *
 * 30% do valor do plano. Abaixo disso o consumo entra na fatura e nada é
 * interrompido; acima, a clínica confirma de novo ou deposita saldo.
 *
 * Existe para tampar o buraco do "gastou e não pagou" sem criar o problema
 * pior, que é o sistema parar no meio do mês. O cartão da assinatura já está
 * em arquivo: cobrar R$ 18 de excedente nele tem o mesmo risco de calote que
 * cobrar a mensalidade, não é um risco novo. O que precisa de tampa é o
 * gasto GRANDE e repentino, e é esse o que o teto pega.
 */
export function tetoDeExcedente(plano: PlanoConta, ciclo: Ciclo = "mensal"): number {
  const preco = DEFINICAO[plano].preco;
  if (!preco) return 0;
  return Math.round(preco[ciclo] * 0.3);
}

/**
 * Disparo em massa é a única coisa que exige saldo depositado antes.
 *
 * Uma campanha de marketing para 5.000 tutores custa R$ 1.608 em um clique —
 * cinco vezes a mensalidade do Profissional. Nenhum teto mensal protege
 * disso, porque o gasto acontece de uma vez. Aqui o pré-pago é o desenho
 * certo: sem saldo, sem campanha, e o risco fica com quem decidiu disparar.
 *
 * Fora daí, saldo é ruim: crédito que expira é contestável no CDC, e crédito
 * depositado é passivo no caixa, não receita. Só se usa onde ganha.
 */
export const EXIGE_SALDO_PREPAGO = ["whatsapp_marketing"] as const;

/** A cota deste recurso neste plano, se houver. */
export function cotaDe(plano: string | null | undefined, recurso: Recurso): Cota | null {
  return COTAS[recurso]?.[(plano ?? "trial") as PlanoConta] ?? null;
}

/**
 * Implantação: migrar a base do sistema antigo e treinar a equipe.
 *
 * É trabalho de gente, não de servidor — 3 h numa base limpa, 15 h numa base
 * bagunçada. O custo em si é pequeno (R$ 45 a R$ 226 de hora trabalhada);
 * cobrar não é para cobrir esse custo, é por dois outros motivos:
 *
 *   * CAIXA na hora que mais falta. Com 50 clientes a implantação soma 36% à
 *     sobra do mês, e 50 clientes é exatamente o vale onde a equipe já custa
 *     e a receita ainda não chegou (ver scripts/simulacao-precos.mjs).
 *   * FILTRO. Quem entra no mês a mês pode sair no segundo mês, e a migração
 *     já foi feita. Cobrar dele é cobrar de quem carrega o risco.
 *
 * Por isso é grátis em 6 e 12 meses: quem se compromete já pagou adiantado, e
 * a isenção vira mais um empurrão para o ciclo que interessa. A promessa de
 * "sem taxa de implantação" continua verdadeira onde ela vende.
 */
export const IMPLANTACAO = {
  valor: 497,
  gratisEm: ["semestral", "anual"] as Ciclo[],
};

/** Quanto custa entrar, neste ciclo. Zero quando é cortesia do compromisso. */
export function custoDeImplantacao(ciclo: Ciclo): number {
  return IMPLANTACAO.gratisEm.includes(ciclo) ? 0 : IMPLANTACAO.valor;
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
