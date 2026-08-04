import { PawPrint } from "lucide-react";
import type { ReactNode } from "react";

/** Estado vazio padrão do VetHub. */
export function EmptyState({
  titulo,
  mensagem,
  acao,
  icone,
}: {
  titulo: string;
  mensagem?: string;
  acao?: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-edge bg-surface px-6 py-12 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-brand-mint/30 text-brand-dark">
        {icone ?? <PawPrint className="size-7" strokeWidth={1.8} />}
      </div>
      <h3 className="text-base font-semibold text-ink">{titulo}</h3>
      {mensagem && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{mensagem}</p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
