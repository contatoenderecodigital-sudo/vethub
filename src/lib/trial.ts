import { hojeISO } from "@/lib/format";
import { trialExpirou } from "@/lib/plano-conta";
import type { ContaDaClinica } from "@/lib/auth";

/**
 * O que acontece no 15º dia.
 *
 * A conta NÃO é trancada: ela vira somente leitura. A clínica continua vendo
 * prontuário, imprimindo receita e exportando a base; o que para é criar
 * registro novo.
 *
 * Isso não é generosidade, é a única saída defensável. Bloquear a leitura
 * sequestraria o prontuário de animais em tratamento — e o dado é da clínica,
 * não nosso. A LGPD garante a ela o acesso à própria base independentemente
 * de estar pagando.
 *
 * E funciona melhor como venda: quem perde o acesso fica bravo e vai embora
 * contando por quê; quem vê a clínica inteira ali, parada, esperando um Pix,
 * paga.
 */

/** Quantos dias antes do fim o aviso começa a aparecer. */
export const DIAS_DE_AVISO = 5;

/** Rotas que continuam funcionando mesmo com o teste vencido. */
const SEMPRE_LIBERADAS = [
  "/assinatura", // onde se resolve o problema
  "/configuracoes/clinica", // dados da própria empresa
  "/configuracoes/senha",
  "/relatorios", // exportar e imprimir é direito da clínica
  "/dono", // o painel de quem vende não depende do teste de ninguém
];

/**
 * As rotas de LEITURA continuam abertas; as de escrita é que fecham.
 *
 * Reconhecer escrita pelo endereço em vez de manter uma lista de telas
 * bloqueadas: `/novo`, `/nova` e `/editar` são o padrão do sistema inteiro, e
 * uma tela criada amanhã já nasce coberta sem ninguém lembrar de incluí-la.
 */
export function ehTelaDeEscrita(pathname: string): boolean {
  return (
    /\/(novo|nova|editar)(\/|$)/.test(pathname) ||
    pathname === "/pdv" ||
    pathname.startsWith("/pdv/")
  );
}

export interface SituacaoDoTeste {
  /** Está em teste (não importa se vencido). */
  emTeste: boolean;
  /** Já passou do prazo. */
  vencido: boolean;
  /** Dias que faltam. Negativo quando já venceu. */
  dias: number | null;
  /** Vale mostrar o aviso da reta final? */
  avisar: boolean;
}

export function situacaoDoTeste(conta: ContaDaClinica): SituacaoDoTeste {
  const emTeste = conta.plano === "trial";
  const vencido = trialExpirou(conta.plano, conta.trial_termina_em, hojeISO());

  let dias: number | null = null;
  if (conta.trial_termina_em) {
    const fim = new Date(`${conta.trial_termina_em}T12:00:00`).getTime();
    const hoje = new Date(`${hojeISO()}T12:00:00`).getTime();
    dias = Math.round((fim - hoje) / 86400000);
  }

  return {
    emTeste,
    vencido,
    dias,
    avisar: emTeste && !vencido && dias !== null && dias <= DIAS_DE_AVISO,
  };
}

/** Esta tela pode abrir com o teste vencido? */
export function liberadaComTesteVencido(pathname: string): boolean {
  if (SEMPRE_LIBERADAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return true;
  }
  return !ehTelaDeEscrita(pathname);
}
