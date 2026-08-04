import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-ink-muted">{subtitulo}</p>}
      </div>
      {acao && <div className="flex items-center gap-2">{acao}</div>}
    </div>
  );
}
