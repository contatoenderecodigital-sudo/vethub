"use client";

import type { ReactNode } from "react";
import { Zona } from "@/components/quadro";

/**
 * Coluna do kanban. O arrasto em si (mouse, caneta e dedo) mora no
 * `<Quadro>`; aqui é só a aparência da coluna e o realce quando o cartão
 * está pairando em cima dela.
 */
export function Coluna({
  status,
  titulo,
  corBorda,
  corPonto,
  contador,
  children,
}: {
  status: string;
  titulo: string;
  /** Classe da borda superior colorida (ex.: "border-t-cyan-300"). */
  corBorda: string;
  /** Classe do ponto colorido ao lado do título (ex.: "bg-cyan-300"). */
  corPonto: string;
  contador: number;
  children: ReactNode;
}) {
  return (
    <Zona
      id={status}
      rotulo={`${titulo} (${contador})`}
      className={`flex min-w-[80vw] snap-start flex-col rounded-2xl border-t-4 ${corBorda} bg-white/10 backdrop-blur-md sm:min-w-72 sm:flex-1`}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
          <span className={`size-2 shrink-0 rounded-full ${corPonto}`} aria-hidden />
          <span className="truncate">{titulo}</span>
        </h2>
        <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
          {contador}
        </span>
      </header>

      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-3 pb-3 sm:max-h-[calc(100vh-19rem)]">
        {contador === 0 ? (
          <p className="rounded-xl border border-dashed border-white/30 px-3 py-6 text-center text-xs text-ink-muted">
            Arraste um cartão para cá
          </p>
        ) : (
          children
        )}
      </div>
    </Zona>
  );
}
