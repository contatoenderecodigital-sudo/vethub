import type { ReactNode } from "react";

/**
 * Cabeçalho de página — vive DIRETO sobre o degradê da marca,
 * por isso o texto é branco (com sombra sutil para leitura).
 */
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
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-white drop-shadow-sm sm:text-2xl">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="mt-0.5 text-sm text-white/85 drop-shadow-sm">{subtitulo}</p>
        )}
      </div>
      {acao && <div className="flex flex-wrap items-center gap-2">{acao}</div>}
    </div>
  );
}
