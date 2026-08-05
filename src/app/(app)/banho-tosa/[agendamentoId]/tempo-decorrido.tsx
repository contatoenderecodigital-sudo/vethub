"use client";

import { useCallback, useSyncExternalStore } from "react";

/** "1 h 05 min" / "45 min" a partir dos minutos corridos. */
function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas} h ${String(resto).padStart(2, "0")} min`;
}

const INTERVALO = 30_000;

/**
 * Tempo do serviço. Em andamento o relógio anda sozinho (a cada 30 s);
 * finalizado, mostra a duração fechada.
 *
 * O relógio é lido como fonte externa (useSyncExternalStore): no servidor
 * o retorno é null, por isso o "calculando…" no primeiro quadro, e no
 * navegador o instante é arredondado para blocos de 30 s, senão cada
 * leitura devolveria um valor novo e o React entraria em laço.
 */
export function TempoDecorrido({
  inicio,
  fim,
}: {
  inicio: string;
  fim: string | null;
}) {
  const assinar = useCallback(
    (aoMudar: () => void) => {
      if (fim) return () => {}; // serviço encerrado: nada para atualizar
      const t = setInterval(aoMudar, INTERVALO);
      return () => clearInterval(t);
    },
    [fim]
  );

  const blocoAtual = useSyncExternalStore(
    assinar,
    () => Math.floor(Date.now() / INTERVALO),
    () => null
  );

  const referencia = fim
    ? new Date(fim).getTime()
    : blocoAtual === null
      ? null
      : blocoAtual * INTERVALO;

  if (referencia === null) {
    return <span className="tabular-nums text-ink-muted">calculando…</span>;
  }

  const minutos = Math.max(
    0,
    Math.round((referencia - new Date(inicio).getTime()) / 60_000)
  );

  return (
    <span className="tabular-nums text-ink">{formatarDuracao(minutos)}</span>
  );
}
