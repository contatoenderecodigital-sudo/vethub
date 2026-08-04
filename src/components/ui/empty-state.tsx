import type { ReactNode } from "react";

/**
 * Estado vazio com o Bento, a capivara veterinária do VetHub.
 * (Emoji como placeholder até a ilustração oficial ficar pronta.)
 */
export function EmptyState({
  titulo,
  mensagem,
  acao,
}: {
  titulo: string;
  mensagem?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-edge bg-surface px-6 py-12 text-center">
      <div
        className="mb-3 flex size-16 items-center justify-center rounded-full bg-brand-mint/30 text-4xl"
        role="img"
        aria-label="Bento, a capivara veterinária"
        title="Bento, a capivara veterinária"
      >
        🦫
      </div>
      <h3 className="text-base font-semibold text-ink">{titulo}</h3>
      {mensagem && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{mensagem}</p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
