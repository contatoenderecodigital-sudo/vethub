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
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
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
        <div
          role="menu"
          aria-label={rotulo}
          onClickCapture={() => setAberto(false)}
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
