"use client";

import { Printer } from "lucide-react";

/** Dispara a impressão do navegador. Some no papel (`print:hidden`). */
export function BotaoImprimir({ rotulo = "Imprimir" }: { rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 print:hidden"
    >
      <Printer className="size-4" />
      {rotulo}
    </button>
  );
}
