"use client";

import type { ReactNode } from "react";
import { Quadro } from "@/components/quadro";
import { moverAgendamento } from "../actions";

/**
 * Casca client do quadro da agenda: só amarra o arrasto à server action que
 * troca o status do agendamento. As colunas e os cartões continuam vindo
 * renderizados do servidor.
 */
export function QuadroAgenda({
  data,
  children,
}: {
  /** Dia mostrado no quadro (a action revalida a agenda desse dia). */
  data: string;
  children: ReactNode;
}) {
  return (
    <Quadro
      aoSoltar={(id, status) => moverAgendamento(id, status, data)}
      className="flex snap-x gap-3 overflow-x-auto pb-2"
    >
      {children}
    </Quadro>
  );
}
