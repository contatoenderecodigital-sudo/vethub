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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 bg-white/10 px-6 py-12 text-center backdrop-blur-lg">
      <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-white/20 text-white">
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
