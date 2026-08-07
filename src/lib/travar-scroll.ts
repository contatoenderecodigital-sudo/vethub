"use client";

import { useEffect } from "react";

/**
 * Trava a rolagem da página enquanto algo está aberto por cima dela.
 *
 * Sem isso, arrastar o dedo sobre o menu do celular rola a PÁGINA DE TRÁS: a
 * pessoa fecha o menu e descobre que a tela mudou de lugar sozinha. O mesmo
 * vale para o guia e para o painel de pagamento do PDV.
 *
 * Dois cuidados que a versão ingênua (`overflow: hidden` e pronto) erra:
 *
 * 1. **Some a barra de rolagem** no computador, e a página inteira pula uns
 *    15 px para a direita quando o menu abre. Por isso a largura da barra é
 *    medida e devolvida como `padding-right`.
 * 2. **Dois componentes abertos ao mesmo tempo** (o guia sobre um diálogo, por
 *    exemplo): o primeiro a fechar destravaria a rolagem com o outro ainda
 *    aberto. Um contador resolve — só o último a fechar destrava.
 */
let abertos = 0;
let estiloAnterior: { overflow: string; paddingRight: string } | null = null;

export function useTravarScroll(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;

    if (abertos === 0) {
      const corpo = document.body;
      estiloAnterior = {
        overflow: corpo.style.overflow,
        paddingRight: corpo.style.paddingRight,
      };

      // A diferença entre a janela e a área útil é a barra de rolagem. Em
      // celular ela é 0 e nada muda; no computador evita o pulo lateral.
      const barra = window.innerWidth - document.documentElement.clientWidth;
      corpo.style.overflow = "hidden";
      if (barra > 0) corpo.style.paddingRight = `${barra}px`;
    }
    abertos++;

    return () => {
      abertos--;
      if (abertos === 0 && estiloAnterior) {
        document.body.style.overflow = estiloAnterior.overflow;
        document.body.style.paddingRight = estiloAnterior.paddingRight;
        estiloAnterior = null;
      }
    };
  }, [ativo]);
}
