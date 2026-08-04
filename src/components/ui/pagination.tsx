import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Paginação por links (server-side). Preserva os demais parâmetros da URL.
 */
export function Pagination({
  pagina,
  totalPaginas,
  baseUrl,
  params = {},
}: {
  pagina: number;
  totalPaginas: number;
  baseUrl: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPaginas <= 1) return null;

  const linkPara = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    sp.set("pagina", String(p));
    return `${baseUrl}?${sp.toString()}`;
  };

  const classe =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-white/60 bg-white/60 px-3 text-sm font-medium text-ink backdrop-blur-md hover:bg-white/85";

  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label="Paginação">
      {pagina > 1 ? (
        <Link href={linkPara(pagina - 1)} className={classe}>
          <ChevronLeft className="size-4" />
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-white/85 drop-shadow-sm">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link href={linkPara(pagina + 1)} className={classe}>
          Próxima
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
