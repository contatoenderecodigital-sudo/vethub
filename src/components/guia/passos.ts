/**
 * Roteiro do Bento: a capivara que explica o sistema.
 *
 * Cada rota tem uma sequência de falas. O passo pode apontar para um pedaço
 * da tela (`alvo`, um seletor CSS): esse pedaço fica aceso e o resto escurece.
 * Se o alvo não existir naquela tela (menu lateral no celular, botão que só
 * aparece para admin…), o passo continua valendo, só aparece centralizado.
 *
 * Marcadores estáveis já espalhados pelo sistema:
 *   [data-guia="titulo"] → título da página
 *   [data-guia="acoes"]  → botões de ação do cabeçalho
 *   [data-guia="menu"]   → menu lateral (desktop)
 *   [data-guia="barra"]  → barra de navegação de baixo (celular)
 *   [data-guia="tema"]   → seletor de cor do sistema
 */

/** Poses da capivara: cada uma é um arquivo em /public/capivara. */
export type Pose =
  | "acenando"
  | "apontando"
  | "joinha"
  | "prancheta"
  | "explicando"
  | "comemorando"
  | "pet";

export interface Passo {
  titulo: string;
  texto: string;
  pose?: Pose;
  /** Seletor CSS do pedaço da tela que fica aceso neste passo. */
  alvo?: string;
}

/** Passos que fecham qualquer roteiro: a mesma despedida em todo lugar. */
const DESPEDIDA: Passo = {
  titulo: "Precisou de mim, é só chamar",
  texto:
    "Quando quiser rever isto, clique na minha bolinha com o ponto de interrogação, ali no cantinho da tela. Estou em todas as páginas.",
  pose: "joinha",
};

const ROTEIROS: Record<string, Passo[]> = {
  "/dashboard": [
    {
      titulo: "Oi! Eu sou o Bento",
      texto:
        "Vou te mostrar o VetHub em poucos passos. Esta é a tela de início: o resumo do dia da clínica.",
      pose: "acenando",
    },
    {
      titulo: "Tudo mora no menu",
      texto:
        "Agenda, consultas, pets, estoque, financeiro… cada categoria abre uma listinha. A que você está usando abre sozinha.",
      pose: "apontando",
      alvo: '[data-guia="menu"]',
    },
    {
      titulo: "No celular fica aqui embaixo",
      texto:
        "Os quatro atalhos do dia a dia ficam na barra de baixo, e o botão “Mais” abre todas as seções.",
      pose: "explicando",
      alvo: '[data-guia="barra"]',
    },
    {
      titulo: "A cor é sua",
      texto:
        "Dá para trocar a cor do sistema inteiro aqui. Escolha a que combina com a sua clínica.",
      pose: "comemorando",
      alvo: '[data-guia="tema"]',
    },
    DESPEDIDA,
  ],

  "/agenda/kanban": [
    {
      titulo: "O dia em colunas",
      texto:
        "Cada coluna é uma situação do atendimento: agendado, check-in, pronto, check-out.",
      pose: "prancheta",
    },
    {
      titulo: "Arraste o cartão",
      texto:
        "Chegou o pet? Puxe o cartão para “Check-in”. No celular, puxe pela alça ⠿ no topo do cartão. Com o teclado, use as setas ← e →.",
      pose: "apontando",
    },
    DESPEDIDA,
  ],

  "/agenda": [
    {
      titulo: "A agenda da clínica",
      texto:
        "Aqui está o dia inteiro. Nos botões de cima você troca entre lista, kanban, semana e mês.",
      pose: "prancheta",
      alvo: '[data-guia="titulo"]',
    },
    {
      titulo: "Marcar um atendimento",
      texto:
        "Escolha o pet, o profissional, o dia e a hora. Se o pet ainda não estiver cadastrado, dá para cadastrar na hora.",
      pose: "apontando",
      alvo: '[data-guia="acoes"]',
    },
    DESPEDIDA,
  ],

  "/consultas": [
    {
      titulo: "As consultas",
      texto:
        "Todo atendimento clínico fica registrado aqui: queixa, exame, diagnóstico e conduta.",
      pose: "prancheta",
      alvo: '[data-guia="titulo"]',
    },
    {
      titulo: "O histórico é do pet",
      texto:
        "Tudo o que você escreve na consulta aparece depois na ficha do pet: vacinas, pesos, receitas e retornos juntos.",
      pose: "pet",
    },
    DESPEDIDA,
  ],

  "/receitas": [
    {
      titulo: "Receituário",
      texto:
        "Monte a receita, escolha os medicamentos e imprima. Fica tudo guardado no histórico do pet.",
      pose: "prancheta",
      alvo: '[data-guia="acoes"]',
    },
    DESPEDIDA,
  ],

  "/internacao": [
    {
      titulo: "Internação",
      texto:
        "O painel dos pets internados: quem está na clínica, desde quando e o que já foi aplicado.",
      pose: "pet",
      alvo: '[data-guia="titulo"]',
    },
    {
      titulo: "Prescrição e aprazamento",
      texto:
        "Dentro de cada internação você prescreve a medicação e marca cada aplicação no horário.",
      pose: "explicando",
    },
    DESPEDIDA,
  ],

  "/banho-tosa": [
    {
      titulo: "O fluxo do petshop",
      texto:
        "Cada coluna é uma etapa: aguardando, em banho, secagem/tosa, pronto e entregue.",
      pose: "prancheta",
    },
    {
      titulo: "Arraste o pet de etapa",
      texto:
        "Terminou o banho? Puxe o cartão para a próxima coluna, ou use o botão do cartão. No celular, puxe pela alça ⠿.",
      pose: "apontando",
    },
    {
      titulo: "A ficha de tosa",
      texto:
        "Cada pet tem a ficha com as preferências fixas: tipo de tosa, altura da máquina, shampoo e os avisos de temperamento.",
      pose: "pet",
      alvo: '[data-guia="acoes"]',
    },
    DESPEDIDA,
  ],

  "/tutores": [
    {
      titulo: "Os tutores",
      texto:
        "O cadastro dos donos: contato, endereço e os pets de cada um. É por aqui que você acha quase tudo.",
      pose: "explicando",
      alvo: '[data-guia="titulo"]',
    },
    {
      titulo: "A conta do tutor",
      texto:
        "Dentro do tutor tem o extrato dele: o que ficou pendente, o que já foi pago e os lançamentos avulsos.",
      pose: "prancheta",
    },
    DESPEDIDA,
  ],

  "/pets": [
    {
      titulo: "Os pets",
      texto:
        "Cada pet tem espécie, raça, porte, peso e foto. A ficha guarda todo o histórico dele.",
      pose: "pet",
      alvo: '[data-guia="titulo"]',
    },
    {
      titulo: "Peso e protocolos",
      texto:
        "Na ficha do pet dá para acompanhar a curva de peso e os protocolos de vacina e vermífugo, com aviso de vencimento.",
      pose: "explicando",
    },
    DESPEDIDA,
  ],

  "/itens": [
    {
      titulo: "Produtos e serviços",
      texto:
        "Tudo que a clínica vende ou aplica: consulta, vacina, banho, ração, medicamento. Preço e grupo ficam aqui.",
      pose: "prancheta",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],

  "/estoque": [
    {
      titulo: "Estoque por lote",
      texto:
        "O estoque anda por lote, com validade. Assim o sistema sabe avisar o que está perto de vencer.",
      pose: "prancheta",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],

  "/compras": [
    {
      titulo: "Compras",
      texto:
        "Lance a nota do fornecedor: os itens entram no estoque e a conta a pagar nasce sozinha.",
      pose: "explicando",
      alvo: '[data-guia="acoes"]',
    },
    DESPEDIDA,
  ],

  "/pdv": [
    {
      titulo: "PDV, o caixa",
      texto:
        "Escolha o tutor, jogue os itens na venda e receba. Dá para dividir em mais de uma forma de pagamento.",
      pose: "joinha",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],

  "/orcamentos": [
    {
      titulo: "Orçamentos",
      texto:
        "Monte o orçamento para o tutor aprovar. Aprovado, ele vira venda no PDV sem redigitar nada.",
      pose: "prancheta",
      alvo: '[data-guia="acoes"]',
    },
    DESPEDIDA,
  ],

  "/financeiro": [
    {
      titulo: "O financeiro",
      texto:
        "Entradas, saídas, contas a pagar e a receber. O painel mostra o que vence hoje e o que está atrasado.",
      pose: "prancheta",
      alvo: '[data-guia="titulo"]',
    },
    {
      titulo: "Baixar uma conta",
      texto:
        "Recebeu ou pagou? Dê baixa na conta informando a data e a forma de pagamento. O caixa acerta sozinho.",
      pose: "explicando",
    },
    DESPEDIDA,
  ],

  "/planos": [
    {
      titulo: "Planos e assinaturas",
      texto:
        "Monte pacotes recorrentes (banho mensal, plano de saúde) e acompanhe o que cada assinante já usou no mês.",
      pose: "comemorando",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],

  "/relatorios": [
    {
      titulo: "Relatórios",
      texto:
        "Atendimentos, faturamento, estoque, clientes e vacinas a vencer. Todos aceitam filtro por período.",
      pose: "prancheta",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],

  "/fornecedores": [
    {
      titulo: "Fornecedores",
      texto:
        "Quem te vende ração, medicamento e material. É daqui que as compras puxam os dados da nota.",
      pose: "explicando",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],

  "/configuracoes": [
    {
      titulo: "Configurações",
      texto:
        "Os dados da clínica, a equipe e a conexão do WhatsApp ficam por aqui. Só o administrador vê esta parte.",
      pose: "explicando",
      alvo: '[data-guia="titulo"]',
    },
    DESPEDIDA,
  ],
};

/** Roteiro usado em página que ainda não tem texto próprio. */
const PADRAO: Passo[] = [
  {
    titulo: "Oi! Eu sou o Bento",
    texto:
      "Esta é mais uma tela do VetHub. O título diz onde você está e os botões do canto são as ações desta página.",
    pose: "acenando",
    alvo: '[data-guia="titulo"]',
  },
  {
    titulo: "As ações da página",
    texto:
      "Cadastrar, filtrar, imprimir… o que dá para fazer aqui está sempre neste cantinho de cima.",
    pose: "apontando",
    alvo: '[data-guia="acoes"]',
  },
  DESPEDIDA,
];

/**
 * Roteiro da rota atual: vence a chave mais específica
 * (/agenda/kanban ganha de /agenda).
 */
export function roteiroDaRota(pathname: string): { chave: string; passos: Passo[] } {
  const chave = Object.keys(ROTEIROS)
    .sort((a, b) => b.length - a.length)
    .find((rota) => pathname === rota || pathname.startsWith(`${rota}/`));

  return chave
    ? { chave, passos: ROTEIROS[chave] }
    : { chave: "padrao", passos: PADRAO };
}
