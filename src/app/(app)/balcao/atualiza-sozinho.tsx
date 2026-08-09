"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantém o balcão vivo sem ninguém apertar F5.
 *
 * A recepcionista deixa esta tela aberta o dia inteiro. Sem isto, a receita
 * que o veterinário acabou de emitir só apareceria quando ela lembrasse de
 * recarregar — e o recurso inteiro depende de ela NÃO precisar lembrar de
 * nada.
 *
 * Três cuidados para não virar peso:
 *
 *   * só recarrega com a aba VISÍVEL. Aba de fundo esquecida a tarde toda
 *     não fica consultando o banco de minuto em minuto à toa;
 *   * `router.refresh()` refaz só os dados do servidor, mantendo o que a
 *     pessoa digitou e a posição da rolagem — recarregar a página inteira
 *     jogaria ela para o topo no meio de um atendimento;
 *   * volta a atualizar assim que a aba reaparece, que é justamente quando
 *     ela voltou do balcão e quer ver o que chegou.
 */
const INTERVALO_MS = 60_000;

export function AtualizaSozinho() {
  const router = useRouter();

  useEffect(() => {
    const relogio = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, INTERVALO_MS);

    const aoVoltar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [router]);

  return null;
}
