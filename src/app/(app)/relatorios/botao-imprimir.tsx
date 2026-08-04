"use client";

import { Printer } from "lucide-react";

/** Chama a impressão do navegador na própria página. Some do papel. */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25 print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      Imprimir
    </button>
  );
}
