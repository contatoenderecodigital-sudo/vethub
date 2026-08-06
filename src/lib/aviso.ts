import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_AVISO } from "./aviso-cookie";

/**
 * Recado de erro para a próxima tela.
 *
 * Antes isso viajava na URL (`?erro=texto`) e a tela renderizava o texto
 * cru. Três problemas:
 *
 * 1. SEGURANÇA. Qualquer um montava um link com o texto que quisesse e o
 *    sistema exibia aquilo no banner vermelho oficial, dentro da sessão
 *    logada, com o nome da clínica no cabeçalho. Prato feito para golpe
 *    ("sua sessão expirou, ligue para 0800-... e informe sua senha").
 * 2. O erro voltava a cada F5, porque continuava na URL.
 * 3. Copiar o endereço e mandar para um colega levava o erro junto.
 *
 * Agora a mensagem vai num cookie de vida curta. O `proxy.ts` tira qualquer
 * `erro` que venha na URL de fora e injeta o do cookie na rota interna, sem
 * mexer na barra de endereço. As telas continuam lendo `searchParams.erro`
 * como sempre — nenhuma precisou mudar.
 */

export { COOKIE_AVISO } from "./aviso-cookie";

/** Mensagem longa demais é mensagem quebrada; e cookie tem limite. */
const LIMITE = 300;

/**
 * Guarda o recado para a próxima tela.
 *
 * Só funciona dentro de server action ou route handler — que é justamente
 * de onde todos os erros do sistema saem.
 */
export async function definirAviso(mensagem: string): Promise<void> {
  const armazem = await cookies();
  armazem.set(COOKIE_AVISO, mensagem.slice(0, LIMITE), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Vida curtíssima: é para ser lido na tela seguinte e morrer.
    //
    // O `proxy.ts` apaga o cookie assim que injeta a mensagem, mas o ciclo
    // de server action do Next re-renderiza o destino antes disso, então a
    // remoção chega uma requisição atrasada. Estes poucos segundos são a
    // janela em que um F5 imediato ainda repetiria o aviso; passou disso,
    // o cookie já morreu sozinho.
    maxAge: 5,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Redireciona tirando o `erro` de dentro da URL e mandando pelo cookie.
 *
 * Existe para a migração ser barata: o código que monta o destino continua
 * exatamente como estava (`/rota?data=X&erro=Deu ruim`), só troca
 * `redirect(...)` por `await redirecionarComAviso(...)`. A mensagem sai da
 * barra de endereço, o resto dos filtros permanece.
 */
export async function redirecionarComAviso(destino: string): Promise<never> {
  // Base fictícia só para poder usar o parser de URL em caminho relativo.
  const url = new URL(destino, "http://interno");
  const mensagem = url.searchParams.get("erro");

  if (mensagem) {
    await definirAviso(mensagem);
    url.searchParams.delete("erro");
  }

  const consulta = url.searchParams.toString();
  redirect(`${url.pathname}${consulta ? `?${consulta}` : ""}${url.hash}`);
}
