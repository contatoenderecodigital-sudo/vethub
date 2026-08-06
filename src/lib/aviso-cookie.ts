/**
 * Nome do cookie que carrega o recado de erro de uma tela para a outra.
 *
 * Mora sozinho num arquivo sem dependência nenhuma de propósito: quem usa
 * é tanto o `proxy.ts` (que roda antes da aplicação e não pode importar
 * `next/headers`) quanto as server actions.
 */
export const COOKIE_AVISO = "vethub_aviso";
