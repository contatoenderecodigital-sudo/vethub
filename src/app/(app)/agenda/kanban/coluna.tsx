"use client";

import { useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { moverAgendamento } from "../actions";

/**
 * Coluna do kanban: recebe o drop de um cartão e move o agendamento
 * para o status desta coluna via server action.
 */
export function Coluna({
  status,
  titulo,
  corBorda,
  corPonto,
  contador,
  data,
  children,
}: {
  status: string;
  titulo: string;
  /** Classe da borda superior colorida (ex.: "border-t-cyan-300"). */
  corBorda: string;
  /** Classe do ponto colorido ao lado do título (ex.: "bg-cyan-300"). */
  corPonto: string;
  contador: number;
  data: string;
  children: ReactNode;
}) {
  const [sobre, setSobre] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  function aoArrastarSobre(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!sobre) setSobre(true);
  }

  function aoSair(e: DragEvent<HTMLElement>) {
    // Só apaga o destaque quando o ponteiro sai da coluna de verdade
    // (entrar num cartão filho também dispara dragleave).
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setSobre(false);
  }

  function aoSoltar(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setSobre(false);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    iniciar(async () => {
      const resultado = await moverAgendamento(id, status, data);
      if (resultado?.erro) {
        setErro(resultado.erro);
        return;
      }
      setErro(null);
      router.refresh();
    });
  }

  return (
    <section
      onDragOver={aoArrastarSobre}
      onDragEnter={aoArrastarSobre}
      onDragLeave={aoSair}
      onDrop={aoSoltar}
      aria-label={`${titulo} (${contador})`}
      className={`flex min-w-[80vw] snap-start flex-col rounded-2xl border-t-4 ${corBorda} bg-white/10 backdrop-blur-md transition-shadow sm:min-w-72 sm:flex-1 ${
        sobre ? "ring-2 ring-white/50" : ""
      } ${pendente ? "opacity-70" : ""}`}
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

      {erro && (
        <p className="mx-3 mb-2 rounded-lg border border-red-300/40 bg-red-400/25 px-2.5 py-1.5 text-xs font-medium text-red-50">
          {erro}
        </p>
      )}

      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-3 pb-3 sm:max-h-[calc(100vh-19rem)]">
        {contador === 0 ? (
          <p className="rounded-xl border border-dashed border-white/30 px-3 py-6 text-center text-xs text-ink-muted">
            Arraste um cartão para cá
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
