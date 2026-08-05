"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";

/**
 * Menu "Mais ações", usado no cabeçalho das páginas que têm 3 ou mais
 * botões. Só a ação principal fica visível; o resto entra aqui e para de
 * brigar com o título em telas estreitas.
 *
 * Os filhos são os mesmos botões/forms que ficariam na barra: dentro do
 * painel eles viram linhas de largura cheia alinhadas à esquerda.
 */
export function MenuAcoes({
  children,
  rotulo = "Mais ações",
}: {
  children: ReactNode;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Element | null;
      // Clique dentro de uma janela de confirmação NÃO é "clique fora": a
      // janela é aberta por um filho deste menu e vive num portal, fora
      // desta árvore. Fechar aqui desmontaria o filho no meio do caminho e
      // o botão Confirmar não teria mais o que enviar.
      if (alvo?.closest('[role="dialog"], [role="alertdialog"]')) return;
      if (raiz.current && alvo && !raiz.current.contains(alvo)) {
        setAberto(false);
      }
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        title={rotulo}
        className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/15 px-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-10"
      >
        <EllipsisVertical className="size-4 shrink-0" strokeWidth={1.8} />
        <span className="sr-only sm:not-sr-only">Mais</span>
      </button>

      {aberto && (
        // Fecha ao acionar qualquer item: os filhos navegam ou enviam form,
        // então o painel não deve continuar aberto por cima do resultado.
        //
        // Exceção: itens marcados com `data-mantem-menu` (o botão que pede
        // confirmação). Eles ainda têm trabalho a fazer depois do clique —
        // abrir a janela e só então enviar o formulário — e fechar o painel
        // aqui os desmontaria antes disso. Era o que deixava o Excluir sem
        // efeito nenhum nas telas que usam este menu.
        <div
          role="menu"
          aria-label={rotulo}
          onClickCapture={(e) => {
            const alvo = e.target as Element;
            if (alvo.closest("[data-mantem-menu]")) return;
            // Atenção: no React o evento de um portal sobe pela árvore de
            // COMPONENTES, não pela do DOM. O clique no "Confirmar" da
            // janela — que mora num portal no <body> — chega aqui mesmo
            // estando fora deste <div>. Fechar nesse clique desmontava o
            // botão antes de ele enviar o formulário.
            if (alvo.closest('[role="dialog"], [role="alertdialog"]')) return;
            setAberto(false);
          }}
          // No celular abre para a direita (o botão fica encostado à
          // esquerda da barra); do sm: para cima alinha pela direita.
          className="glass-menu absolute left-0 z-40 mt-2 flex w-56 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl p-2 sm:right-0 sm:left-auto [&_a]:min-h-11 [&_a]:w-full [&_a]:justify-start [&_button]:min-h-11 [&_button]:w-full [&_button]:justify-start [&_form]:w-full"
        >
          {children}
        </div>
      )}
    </div>
  );
}
