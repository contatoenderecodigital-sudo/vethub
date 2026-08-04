"use client";

import { Printer } from "lucide-react";

/** Chama a impressão do navegador. Some do papel via `print:hidden`. */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-dark shadow-lg shadow-black/10 transition-colors hover:bg-white/90 print:hidden"
    >
      <Printer className="size-4" />
      Imprimir comprovante
    </button>
  );
}
