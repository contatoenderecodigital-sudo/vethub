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

  // min-h-11 no toque: alvo de 44px no celular, altura normal no desktop.
  const classe =
    "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/40 bg-white/15 px-3 text-sm font-medium text-white backdrop-blur-md hover:bg-white/25 sm:min-h-9";

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-2"
      aria-label="Paginação"
    >
      {pagina > 1 ? (
        <Link href={linkPara(pagina - 1)} className={classe}>
          <ChevronLeft className="size-4" />
          Anterior
        </Link>
      ) : (
        <span />
      )}
      {/* Branco cheio, não 85%: a 14px o "Página 1 de 2" media 4.43:1, e o
          mínimo da norma é 4.5:1. Faltava por sete centésimos, e mesmo assim
          é a linha que diz à pessoa onde ela está na lista. */}
      <span className="order-last w-full text-center text-sm text-white drop-shadow-sm sm:order-none sm:w-auto">
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
