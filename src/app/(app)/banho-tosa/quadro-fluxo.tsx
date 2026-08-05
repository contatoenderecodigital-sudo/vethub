"use client";

import type { ReactNode } from "react";
import { Quadro } from "@/components/quadro";
import { avancarEtapa } from "./actions";

/**
 * Casca client do fluxo do petshop: amarra o arrasto à action que muda a
 * etapa do atendimento. Arrastar para qualquer coluna vale. O pet pode
 * voltar para "Em banho" se precisar de um retoque, não só andar para frente.
 */
export function QuadroFluxo({ children }: { children: ReactNode }) {
  return (
    <Quadro
      aoSoltar={(id, status) => avancarEtapa(id, status)}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      {children}
    </Quadro>
  );
}
